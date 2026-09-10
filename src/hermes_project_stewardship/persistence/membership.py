"""PM-0102/0103/0105: normalised project membership service.

`project_members` is the sole writable representation. Legacy
`project_stewardship.owner_lead_profile`/`member_profiles_json` fields
become read-only compatibility projections written by this service in
the SAME transaction as the normalised write.

PM-0103 (fix 3): an active lead can never be removed, set to
departure_pending/unavailable/departed or relinked away unless a
replacement active lead is established first — every route that could
leave zero active leads is refused.

PM-0104 (fix 4): a durable monotonic per-project membership revision is
incremented inside every membership write transaction.
"""
from __future__ import annotations

from typing import List

from ..domain.constants import MembershipState
from ..domain.models import ProjectMember
from .service import ServiceError, StewardshipService
from .store import Store, iso

_VALID_ROLES = ("lead", "member")
_LEAD_BLOCKING_STATES = ("departure_pending", "unavailable", "departed")


def _member(row) -> ProjectMember:
    return ProjectMember(
        project_id=row["project_id"],
        profile_slug=row["profile_slug"],
        role=row["role"],
        state=row["state"],
        joined_at=row["joined_at"],
        left_at=row["left_at"],
    )


class MembershipService:
    """Owns every membership write; keeps the legacy projection in sync."""

    def __init__(self, store: Store, stewardship: StewardshipService, *, clock=None) -> None:
        self.store = store
        self.svc = stewardship
        self._clock = clock or store._clock

    # ------------------------------------------------------------------ #
    # Reads                                                              #
    # ------------------------------------------------------------------ #

    def list_members(self, project_id: str, *, include_departed: bool = False) -> List[ProjectMember]:
        self._require(project_id)
        sql = "SELECT * FROM project_members WHERE project_id=?"
        if not include_departed:
            sql += " AND state != 'departed'"
        sql += " ORDER BY CASE role WHEN 'lead' THEN 0 ELSE 1 END, profile_slug"
        return [_member(r) for r in self.store._conn.execute(sql, (project_id,)).fetchall()]

    def membership_revision(self, project_id: str) -> int:
        """PM-0104 (fix 4): durable monotonic revision token."""
        self._require(project_id)
        row = self.store._conn.execute(
            "SELECT revision FROM membership_revisions WHERE project_id=?",
            (project_id,),
        ).fetchone()
        if row is None:
            with self.store.tx() as cx:
                cx.execute(
                    "INSERT OR IGNORE INTO membership_revisions(project_id, revision) VALUES(?,0)",
                    (project_id,),
                )
            return 0
        return int(row["revision"])

    def active_lead(self, project_id: str) -> ProjectMember | None:
        self._require(project_id)
        row = self.store._conn.execute(
            "SELECT * FROM project_members WHERE project_id=? AND role='lead' AND state='active'",
            (project_id,),
        ).fetchone()
        return _member(row) if row else None

    # ------------------------------------------------------------------ #
    # Writes                                                             #
    # ------------------------------------------------------------------ #

    def seed_members(
        self,
        project_id: str,
        *,
        lead_profile: str | None,
        member_profiles: List[str] | None,
    ) -> None:
        """Initial seeding (own transaction). Degrades to a no-op when the
        normalised tables are absent (legacy schema)."""
        row = self.store._conn.execute(
            "SELECT name FROM sqlite_master WHERE type='table' AND name='project_members'"
        ).fetchone()
        if row is None:
            return
        with self.store.tx() as cx:
            self.seed_members_in_tx(
                cx, project_id,
                lead_profile=lead_profile,
                member_profiles=member_profiles,
            )

    def seed_members_in_tx(self, cx, project_id: str, *, lead_profile, member_profiles) -> None:
        """Transactional seeding core (fix 1): runs inside the caller's
        transaction; derives the legacy projection in the same tx."""
        table = cx.execute(
            "SELECT name FROM sqlite_master WHERE type='table' AND name='project_members'"
        ).fetchone()
        if table is None:
            return  # legacy schema (pre-21): normalised tables absent
        now = iso(self._clock())
        lead = (lead_profile or "").strip()
        members_list: List[str] = []
        seen: set[str] = set()
        for slug in member_profiles or []:
            cleaned = str(slug).strip()
            if cleaned and cleaned != lead and cleaned not in seen:
                members_list.append(cleaned)
                seen.add(cleaned)
        existing = {
            r["profile_slug"]
            for r in cx.execute(
                "SELECT profile_slug FROM project_members WHERE project_id=?",
                (project_id,),
            ).fetchall()
        }
        if lead:
            cx.execute(
                "INSERT INTO project_members(project_id, profile_slug, role, state, joined_at)"
                " VALUES(?,?, 'lead', ?, ?)"
                " ON CONFLICT(project_id, profile_slug) DO UPDATE SET role='lead', state='active', left_at=NULL",
                (project_id, lead, MembershipState.ACTIVE.value, now),
            )
        for slug in members_list:
            cx.execute(
                "INSERT INTO project_members(project_id, profile_slug, role, state, joined_at)"
                " VALUES(?,?, 'member', ?, ?)"
                " ON CONFLICT(project_id, profile_slug) DO UPDATE SET"
                " role=CASE WHEN project_members.state='departed' THEN 'member' ELSE project_members.role END,"
                " state=CASE WHEN project_members.state='departed' THEN 'active' ELSE project_members.state END,"
                " left_at=CASE WHEN project_members.state='departed' THEN NULL ELSE project_members.left_at END",
                (project_id, slug, MembershipState.ACTIVE.value, now),
            )
            existing.discard(slug)
        self._bump_revision(cx, project_id)
        self._sync_projection_in_tx(cx, project_id, now)

    def reconcile_in_tx(
        self,
        cx,
        project_id: str,
        *,
        lead_profile: str | None,
        member_profiles: List[str] | None,
    ) -> None:
        """Fix 2 (atomic settings): reconcile the FULL roster to the
        requested lead + member list inside the caller's transaction,
        deriving projections in the same tx. Refuses when a requested
        transition is illegal (the caller's tx rolls back everything)."""
        now = iso(self._clock())
        lead = (lead_profile or "").strip()
        wanted_members: List[str] = []
        seen: set[str] = set()
        for slug in member_profiles or []:
            cleaned = str(slug).strip()
            if cleaned and cleaned != lead and cleaned not in seen:
                wanted_members.append(cleaned)
                seen.add(cleaned)
        # Lead: transfer when different; otherwise seed/insert.
        lead_row = cx.execute(
            "SELECT profile_slug FROM project_members"
            " WHERE project_id=? AND role='lead' AND state='active'",
            (project_id,),
        ).fetchone()
        current_lead = lead_row["profile_slug"] if lead_row else None
        if lead and lead != current_lead:
            target = cx.execute(
                "SELECT state FROM project_members WHERE project_id=? AND profile_slug=?",
                (project_id, lead),
            ).fetchone()
            cx.execute(
                "UPDATE project_members SET role='member' WHERE project_id=? AND role='lead' AND state='active'",
                (project_id,),
            )
            if target is not None and target["state"] == "active":
                cx.execute(
                    "UPDATE project_members SET role='lead' WHERE project_id=? AND profile_slug=?",
                    (project_id, lead),
                )
            elif target is not None and target["state"] == "departed":
                cx.execute(
                    "UPDATE project_members SET state='active', role='lead', left_at=NULL, joined_at=?"
                    " WHERE project_id=? AND profile_slug=?",
                    (now, project_id, lead),
                )
            else:
                cx.execute(
                    "INSERT INTO project_members(project_id, profile_slug, role, state, joined_at)"
                    " VALUES(?,?, 'lead', ?, ?)",
                    (project_id, lead, MembershipState.ACTIVE.value, now),
                )
            cx.execute(
                "UPDATE project_stewardship SET owner_lead_profile=? WHERE project_id=?",
                (lead, project_id),
            )
        # Members: add missing, remove surplus (never the lead).
        present = {
            r["profile_slug"]
            for r in cx.execute(
                "SELECT profile_slug FROM project_members WHERE project_id=?"
                " AND role='member' AND state IN ('active','departure_pending')",
                (project_id,),
            ).fetchall()
        }
        for slug in wanted_members:
            if slug in present:
                continue
            row = cx.execute(
                "SELECT state FROM project_members WHERE project_id=? AND profile_slug=?",
                (project_id, slug),
            ).fetchone()
            if row is not None and row["state"] == "departed":
                cx.execute(
                    "UPDATE project_members SET state='active', left_at=NULL, joined_at=?"
                    " WHERE project_id=? AND profile_slug=?",
                    (now, project_id, slug),
                )
            else:
                cx.execute(
                    "INSERT INTO project_members(project_id, profile_slug, role, state, joined_at)"
                    " VALUES(?,?, 'member', ?, ?)",
                    (project_id, slug, MembershipState.ACTIVE.value, now),
                )
        for slug in present - set(wanted_members):
            cx.execute(
                "UPDATE project_members SET state='departed', left_at=?"
                " WHERE project_id=? AND profile_slug=?",
                (now, project_id, slug),
            )
        self._bump_revision(cx, project_id)
        self._sync_projection_in_tx(cx, project_id, now)

    def add_member(
        self, project_id: str, profile_slug: str, *, role: str = "member", actor: str = "system"
    ) -> ProjectMember:
        self._require(project_id)
        slug = self._clean_slug(profile_slug)
        if role not in _VALID_ROLES:
            raise ServiceError("membership role must be 'lead' or 'member'")
        now = iso(self._clock())
        with self.store.tx() as cx:
            existing = cx.execute(
                "SELECT state FROM project_members WHERE project_id=? AND profile_slug=?",
                (project_id, slug),
            ).fetchone()
            if existing and existing["state"] != "departed":
                raise ServiceError(f"profile '{slug}' is already a member")
            if role == "lead":
                cx.execute(
                    "UPDATE project_members SET role='member' WHERE project_id=? AND role='lead' AND state='active'",
                    (project_id,),
                )
            try:
                if existing:
                    cx.execute(
                        "UPDATE project_members SET state='active', role=?, left_at=NULL, joined_at=?"
                        " WHERE project_id=? AND profile_slug=?",
                        (role, now, project_id, slug),
                    )
                else:
                    cx.execute(
                        "INSERT INTO project_members(project_id, profile_slug, role, state, joined_at)"
                        " VALUES(?,?,?,?,?)",
                        (project_id, slug, role, MembershipState.ACTIVE.value, now),
                    )
            except Exception as error:
                raise self._integrity(error) from None
            self._bump_revision(cx, project_id)
            self._sync_projection_in_tx(cx, project_id, now)
        self.store.audit(actor=actor or "system", interface="membership", action="member.added", subject=f"{project_id}:{slug}")
        return self._row(project_id, slug)

    def remove_member(
        self, project_id: str, profile_slug: str, *, depart: bool = True, actor: str = "system"
    ) -> ProjectMember:
        self._require(project_id)
        slug = self._clean_slug(profile_slug)
        row = self._row(project_id, slug)
        now = iso(self._clock())
        with self.store.tx() as cx:
            if row.role == "lead" and row.state == "active":
                replacement = cx.execute(
                    "SELECT profile_slug FROM project_members WHERE project_id=?"
                    " AND role='lead' AND state='active' AND profile_slug != ?",
                    (project_id, slug),
                ).fetchone()
                if replacement is None:
                    raise ServiceError(
                        "transfer the lead role to another active member before removing the lead"
                    )
            cx.execute(
                "UPDATE project_members SET state=?, left_at=? WHERE project_id=? AND profile_slug=?",
                (MembershipState.DEPARTED.value if depart else MembershipState.UNAVAILABLE.value,
                 now, project_id, slug),
            )
            self._bump_revision(cx, project_id)
            self._sync_projection_in_tx(cx, project_id, now)
        self.store.audit(actor=actor or "system", interface="membership", action="member.removed", subject=f"{project_id}:{slug}")
        return self._row(project_id, slug)

    def transfer_lead(self, project_id: str, profile_slug: str, *, actor: str = "system") -> ProjectMember:
        """PM-0103: exactly one active lead; demote then promote in one tx."""
        self._require(project_id)
        slug = self._clean_slug(profile_slug)
        now = iso(self._clock())
        with self.store.tx() as cx:
            target = cx.execute(
                "SELECT role, state FROM project_members WHERE project_id=? AND profile_slug=?",
                (project_id, slug),
            ).fetchone()
            if target is None:
                raise ServiceError(f"profile '{slug}' is not a member of project '{project_id}'")
            if target["state"] != MembershipState.ACTIVE.value:
                raise ServiceError("only an active member can become the lead")
            cx.execute(
                "UPDATE project_members SET role='member' WHERE project_id=? AND role='lead' AND state='active'",
                (project_id,),
            )
            try:
                cx.execute(
                    "UPDATE project_members SET role='lead' WHERE project_id=? AND profile_slug=?",
                    (project_id, slug),
                )
            except Exception as error:
                raise self._integrity(error) from None
            cx.execute(
                "UPDATE project_stewardship SET owner_lead_profile=?, updated_at=? WHERE project_id=?",
                (slug, now, project_id),
            )
            self._bump_revision(cx, project_id)
            self._sync_projection_in_tx(cx, project_id, now)
        self.store.audit(actor=actor or "system", interface="membership", action="membership.lead_transferred", subject=f"{project_id}:{slug}")
        return self._row(project_id, slug)

    def set_state_in_tx(self, cx, project_id: str, profile_slug: str, state: str) -> None:
        """Apply a validated state transition within the caller's transaction."""
        row = cx.execute(
            "SELECT role, state FROM project_members WHERE project_id=? AND profile_slug=?",
            (project_id, profile_slug),
        ).fetchone()
        if row is None:
            raise ServiceError(f"no membership for profile '{profile_slug}'")
        if row["role"] == "lead" and row["state"] == "active" and state in _LEAD_BLOCKING_STATES:
            replacement = cx.execute(
                "SELECT profile_slug FROM project_members WHERE project_id=? AND role='lead' AND state='active' AND profile_slug != ?",
                (project_id, profile_slug),
            ).fetchone()
            if replacement is None:
                raise ServiceError("the project's only active lead cannot leave; establish a replacement lead first")
        cx.execute("UPDATE project_members SET state=? WHERE project_id=? AND profile_slug=?", (state, project_id, profile_slug))
        self._bump_revision(cx, project_id)
        self._sync_projection_in_tx(cx, project_id, iso(self._clock()))

    def set_state(self, project_id: str, profile_slug: str, state: str, *, actor: str = "system") -> ProjectMember:
        """PM-0104 (fix 3): explicit transitions; the last active lead cannot leave."""
        allowed = {s.value for s in MembershipState}
        if state not in allowed:
            raise ServiceError(f"unknown membership state '{state}'")
        self._require(project_id)
        slug = self._clean_slug(profile_slug)
        now = iso(self._clock())
        with self.store.tx() as cx:
            row = cx.execute(
                "SELECT role, state FROM project_members WHERE project_id=? AND profile_slug=?",
                (project_id, slug),
            ).fetchone()
            if row is None:
                raise ServiceError(f"no membership for profile '{slug}'")
            if row["role"] == "lead" and row["state"] == "active" and state in _LEAD_BLOCKING_STATES:
                replacement = cx.execute(
                    "SELECT profile_slug FROM project_members WHERE project_id=?"
                    " AND role='lead' AND state='active' AND profile_slug != ?",
                    (project_id, slug),
                ).fetchone()
                if replacement is None:
                    raise ServiceError(
                        "the project's only active lead cannot move to"
                        f" '{state}'; establish a replacement lead first"
                    )
            cx.execute(
                "UPDATE project_members SET state=? WHERE project_id=? AND profile_slug=?",
                (state, project_id, slug),
            )
            self._bump_revision(cx, project_id)
            self._sync_projection_in_tx(cx, project_id, now)
        self.store.audit(actor=actor or "system", interface="membership", action="member.state_changed", subject=f"{project_id}:{slug}")
        return self._row(project_id, slug)

    def relink_profile(
        self, project_id: str, old_slug: str, new_slug: str, *, actor: str = "system"
    ) -> ProjectMember:
        """PM-0105: explicit relink after rename or disappearance."""
        self._require(project_id)
        old = self._clean_slug(old_slug)
        new = self._clean_slug(new_slug)
        if old == new:
            return self._row(project_id, old)
        now = iso(self._clock())
        with self.store.tx() as cx:
            row = cx.execute(
                "SELECT role, state FROM project_members WHERE project_id=? AND profile_slug=?",
                (project_id, old),
            ).fetchone()
            if row is None:
                raise ServiceError(f"no membership for profile '{old}'")
            if row["role"] == "lead" and row["state"] == "active":
                replacement = cx.execute(
                    "SELECT profile_slug FROM project_members WHERE project_id=?"
                    " AND role='lead' AND state='active' AND profile_slug != ?",
                    (project_id, old),
                ).fetchone()
                if replacement is None:
                    raise ServiceError(
                        "the project's only active lead cannot be relinked;"
                        " establish a replacement lead first"
                    )
            clash = cx.execute(
                "SELECT 1 FROM project_members WHERE project_id=? AND profile_slug=?",
                (project_id, new),
            ).fetchone()
            if clash:
                raise ServiceError(f"profile '{new}' already has a membership")
            cx.execute(
                "UPDATE project_members SET profile_slug=? WHERE project_id=? AND profile_slug=?",
                (new, project_id, old),
            )
            if row["role"] == "lead" and row["state"] == "active":
                cx.execute(
                    "UPDATE project_stewardship SET owner_lead_profile=? WHERE project_id=?",
                    (new, project_id),
                )
            self._bump_revision(cx, project_id)
            self._sync_projection_in_tx(cx, project_id, now)
        self.store.audit(actor=actor or "system", interface="membership", action="member.relinked", subject=f"{project_id}:{old}->{new}")
        return self._row(project_id, new)

    # ------------------------------------------------------------------ #
    # Internals                                                          #
    # ------------------------------------------------------------------ #

    def _require(self, project_id: str) -> None:
        self.svc.settings(project_id, include_disabled=True)

    def _bump_revision(self, cx, project_id: str) -> None:
        cx.execute(
            "INSERT INTO membership_revisions(project_id, revision) VALUES(?,1)"
            " ON CONFLICT(project_id) DO UPDATE SET revision=revision+1",
            (project_id,),
        )

    def _row(self, project_id: str, slug: str) -> ProjectMember:
        r = self.store._conn.execute(
            "SELECT * FROM project_members WHERE project_id=? AND profile_slug=?",
            (project_id, slug),
        ).fetchone()
        if r is None:
            raise ServiceError(f"no membership for profile '{slug}'")
        return _member(r)

    def _clean_slug(self, profile_slug: str) -> str:
        slug = str(profile_slug or "").strip()
        if not slug or len(slug) > 100:
            raise ServiceError("profile slug must be 1-100 characters")
        return slug

    @staticmethod
    def _sync_projection_in_tx(cx, project_id: str, now: str) -> None:
        """Legacy fields become a read-only projection, same transaction."""
        rows = cx.execute(
            "SELECT profile_slug, role FROM project_members"
            " WHERE project_id=? AND state IN ('active','departure_pending')",
            (project_id,),
        ).fetchall()
        lead = next((r["profile_slug"] for r in rows if r["role"] == "lead"), None)
        members = [r["profile_slug"] for r in rows if r["role"] != "lead"]
        cx.execute(
            "UPDATE project_stewardship SET owner_lead_profile=?,"
            " member_profiles_json=?, updated_at=? WHERE project_id=?",
            (lead, _json_list(members), now, project_id),
        )

    @staticmethod
    def _integrity(error: Exception) -> ServiceError:
        message = str(error)
        if "idx_project_members_one_lead" in message:
            return ServiceError("project already has an active lead")
        return ServiceError("membership constraint violated")


def _json_list(values: List[str]) -> str:
    import json
    return json.dumps(values)