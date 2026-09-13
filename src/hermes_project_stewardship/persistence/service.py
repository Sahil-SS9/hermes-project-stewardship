"""Service layer: all stewardship operations against the canonical store.

This is the single write path every surface (CLI, RPC, gateway, desktop)
shares. Surfaces never touch SQL directly.

Fail-closed rules enforced here:
- mutating operations on a paused/frozen project are refused;
- approvals require an eligible actor with permission binding;
- initiative execution requires approval when policy says so.
"""

from __future__ import annotations

import hashlib
import json
import os
import sqlite3
import stat
import tempfile
import uuid
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any, Dict, List, Optional, Sequence

from ..domain.constants import (
    ApprovalState,
    InitiativeStatus,
    ProjectPhase,
)
from ..domain.models import Objective
from .store import Store, iso


class ServiceError(RuntimeError):
    """Refusal surfaced to users (bad state, bad policy, not found)."""


class FeatureDisabledError(ServiceError):
    def __init__(self, project_id: str, feature: str) -> None:
        super().__init__(f"feature '{feature}' is disabled for project '{project_id}'")
        self.project_id = project_id
        self.feature = feature


_CONTENT_TYPES = {
    "text/plain": ".txt",
    "text/markdown": ".md",
    "application/pdf": ".pdf",
    "image/png": ".png",
    "image/jpeg": ".jpg",
    "image/webp": ".webp",
}
_MAX_CONTENT_BYTES = 5 * 1024 * 1024
_TEXT_PREVIEW_BYTES = 100_000


class StewardshipService:
    def __init__(
        self,
        store: Store,
        *,
        clock=None,
        default_suppression_days: int = 14,
    ) -> None:
        self.store = store
        self._clock = clock or store._clock
        self.default_suppression_days = default_suppression_days

    # ------------------------------------------------------------------ #
    # Enable / lifecycle                                                 #
    # ------------------------------------------------------------------ #

    def enable(
        self,
        project_id: str,
        *,
        mission: str = "",
        lead_profile: Optional[str] = None,
        member_profiles: Optional[Sequence[str]] = None,
        autonomy_level: int = 0,
        verification_policy: Optional[Dict[str, Any]] = None,
        release_policy: Optional[Dict[str, Any]] = None,
        notification_policy: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        now = iso(self._clock())
        # PM-0102 (fix 1, atomic seeding): the project row is inserted with
        # EMPTY projection fields; normalised membership is seeded and the
        # projections derived in the SAME transaction, so a seeding failure
        # can never leave user-supplied ownership in legacy columns.
        with self.store.tx() as cx:
            cx.execute(
                """
                INSERT INTO project_stewardship(
                    project_id, enabled, mission, owner_lead_profile,
                    member_profiles_json, autonomy_level,
                    verification_policy_json, release_policy_json,
                    notification_policy_json, phase, created_at, updated_at)
                VALUES(?,?,?,?,?,?,?,?,?,?,?,?)
                ON CONFLICT(project_id) DO UPDATE SET
                    enabled=1,
                    mission=excluded.mission,
                    owner_lead_profile=NULL,
                    member_profiles_json='[]',
                    autonomy_level=excluded.autonomy_level,
                    verification_policy_json=excluded.verification_policy_json,
                    release_policy_json=excluded.release_policy_json,
                    notification_policy_json=excluded.notification_policy_json,
                    updated_at=excluded.updated_at,
                    phase='active', paused_at=NULL
                """,
                (
                    project_id,
                    1,
                    mission,
                    None,
                    json.dumps([]),
                    int(autonomy_level),
                    self.store._j(verification_policy or {}),
                    self.store._j(release_policy or {}),
                    self.store._j(notification_policy or {}),
                    ProjectPhase.ACTIVE.value,
                    now,
                    now,
                ),
            )
            self._membership().seed_members_in_tx(
                cx, project_id,
                lead_profile=lead_profile,
                member_profiles=list(member_profiles or []),
            )
        self.store.audit(
            actor=lead_profile or "system",
            interface="service",
            action="stewardship.enabled",
            subject=project_id,
            detail={"autonomy_level": autonomy_level},
        )
        return self.settings(project_id)

    def accept_onboarding_membership(
        self, project_id: str, *, idempotency_key: str,
        expected_revision: int, mission: str, lead_profile: str,
        member_profiles: Sequence[str], autonomy_level: int,
    ) -> Dict[str, Any]:
        """Conditionally persist the reviewed roster or recognise our own write."""
        now = iso(self._clock())
        lead = lead_profile.strip()
        wanted_members = sorted(
            {str(value).strip() for value in member_profiles if str(value).strip()}
            - {lead}
        )
        with self.store.tx() as cx:
            operation = cx.execute(
                "SELECT local_applied_revision FROM onboarding_operations"
                " WHERE idempotency_key=? AND project_id=?",
                (idempotency_key, project_id),
            ).fetchone()
            if operation is None:
                raise ServiceError("onboarding operation binding is missing")
            revision_row = cx.execute(
                "SELECT revision FROM membership_revisions WHERE project_id=?",
                (project_id,),
            ).fetchone()
            current_revision = int(revision_row["revision"]) if revision_row else 0
            applied_revision = operation["local_applied_revision"]
            if applied_revision is not None:
                rows = cx.execute(
                    "SELECT profile_slug, role, state FROM project_members"
                    " WHERE project_id=? AND state != 'departed'",
                    (project_id,),
                ).fetchall()
                current_leads = [
                    r["profile_slug"] for r in rows
                    if r["role"] == "lead" and r["state"] == "active"
                ]
                current_members = sorted(
                    r["profile_slug"] for r in rows
                    if r["role"] == "member" and r["state"] == "active"
                )
                if (
                    current_revision != int(applied_revision)
                    or current_leads != [lead]
                    or current_members != wanted_members
                ):
                    raise ServiceError(
                        "onboarding membership changed after this operation was applied"
                    )
                row = cx.execute(
                    "SELECT * FROM project_stewardship WHERE project_id=?",
                    (project_id,),
                ).fetchone()
                return self._row_settings(row)
            if current_revision != int(expected_revision):
                raise ServiceError("onboarding membership changed after preflight")

            cx.execute(
                """
                INSERT INTO project_stewardship(
                    project_id, enabled, mission, owner_lead_profile,
                    member_profiles_json, autonomy_level,
                    verification_policy_json, release_policy_json,
                    notification_policy_json, phase, created_at, updated_at)
                VALUES(?,?,?,?,?,?,?,?,?,?,?,?)
                ON CONFLICT(project_id) DO UPDATE SET
                    enabled=1, mission=excluded.mission,
                    owner_lead_profile=NULL, member_profiles_json='[]',
                    autonomy_level=excluded.autonomy_level,
                    updated_at=excluded.updated_at, phase='active', paused_at=NULL
                """,
                (project_id, 1, mission, None, "[]", int(autonomy_level),
                 "{}", "{}", "{}", ProjectPhase.ACTIVE.value, now, now),
            )
            self._membership().seed_members_in_tx(
                cx, project_id, lead_profile=lead,
                member_profiles=list(member_profiles),
            )
            applied = cx.execute(
                "SELECT revision FROM membership_revisions WHERE project_id=?",
                (project_id,),
            ).fetchone()
            cx.execute(
                "UPDATE onboarding_operations SET local_applied_revision=?,"
                " updated_at=? WHERE idempotency_key=?",
                (int(applied["revision"]), now, idempotency_key),
            )
        return self.settings(project_id)

    def disable(self, project_id: str) -> Dict[str, Any]:
        self._require(project_id)
        with self.store.tx() as cx:
            cx.execute(
                "UPDATE project_stewardship SET enabled=0, updated_at=? WHERE project_id=?",
                (iso(self._clock()), project_id),
            )
        self.store.audit(actor="system", interface="service", action="stewardship.disabled", subject=project_id)
        r = self.store._conn.execute(
            "SELECT * FROM project_stewardship WHERE project_id=?", (project_id,)
        ).fetchone()
        return self._row_settings(r)

    def re_enable(self, project_id: str) -> Dict[str, Any]:
        """Re-enable an existing project without replacing its configuration."""
        row = self.store._conn.execute(
            "SELECT * FROM project_stewardship WHERE project_id=?", (project_id,)
        ).fetchone()
        if row is None:
            raise ServiceError(f"stewardship not enabled for project '{project_id}'")
        if "archived_at" in row.keys() and row["archived_at"] is not None:
            raise ServiceError(
                f"project '{project_id}' is archived; use the explicit restore operation"
            )
        if row["enabled"]:
            return self._row_settings(row)
        with self.store.tx() as cx:
            cx.execute(
                "UPDATE project_stewardship SET enabled=1, phase='active',"
                " paused_at=NULL, updated_at=? WHERE project_id=?",
                (iso(self._clock()), project_id),
            )
        self.store.audit(
            actor="system",
            interface="service",
            action="stewardship.re_enabled",
            subject=project_id,
        )
        return self.settings(project_id)

    def pause(self, project_id: str) -> Dict[str, Any]:
        return self._set_phase(project_id, ProjectPhase.PAUSED)

    def resume(self, project_id: str) -> Dict[str, Any]:
        return self._set_phase(project_id, ProjectPhase.ACTIVE)

    def freeze(self, project_id: str) -> Dict[str, Any]:
        """Emergency freeze: no cycles, no mutations until explicit resume."""
        return self._set_phase(project_id, ProjectPhase.FROZEN)

    def _set_phase(self, project_id: str, phase: ProjectPhase) -> Dict[str, Any]:
        self._require(project_id)
        paused_at = iso(self._clock()) if phase in (ProjectPhase.PAUSED, ProjectPhase.FROZEN) else None
        with self.store.tx() as cx:
            cx.execute(
                "UPDATE project_stewardship SET phase=?, paused_at=?, updated_at=?"
                " WHERE project_id=?",
                (phase.value, paused_at, iso(self._clock()), project_id),
            )
        self.store.audit(actor="system", interface="service", action=f"stewardship.{phase.value}", subject=project_id)
        return self.settings(project_id)

    # ------------------------------------------------------------------ #
    # Reads                                                              #
    # ------------------------------------------------------------------ #

    def _require(self, project_id: str) -> sqlite3.Row:
        row = self.store._conn.execute(
            "SELECT * FROM project_stewardship WHERE project_id=?", (project_id,)
        ).fetchone()
        if row is None:
            raise ServiceError(f"stewardship not enabled for project '{project_id}'")
        if not row["enabled"]:
            raise ServiceError(f"stewardship is disabled for project '{project_id}'")
        return row

    def _require_known(self, project_id: str) -> sqlite3.Row:
        """Require a configured project without requiring it to be enabled."""
        row = self.store._conn.execute(
            "SELECT * FROM project_stewardship WHERE project_id=?", (project_id,)
        ).fetchone()
        if row is None:
            raise ServiceError(f"stewardship not enabled for project '{project_id}'")
        return row

    def _membership(self):
        """Normalised membership layer (Phase 1): sole writable representation."""
        from .membership import MembershipService

        return MembershipService(self.store, self, clock=self._clock)

    def _row_settings(self, r: sqlite3.Row) -> Dict[str, Any]:
        """Serialise a raw stewardship row regardless of enabled flag."""
        return {
            "project_id": r["project_id"],
            "enabled": bool(r["enabled"]),
            "mission": r["mission"],
            "owner": {
                "lead_profile": r["owner_lead_profile"],
                "member_profiles": self.store._uj(r["member_profiles_json"], []),
                "owner_team_id": r["owner_team_id"],
            },
            "autonomy_level": r["autonomy_level"],
            "policies": {
                "autonomy": self.store._uj(r["autonomy_policy_json"], {}),
                "verification": self.store._uj(r["verification_policy_json"], {}),
                "release": self.store._uj(r["release_policy_json"], {}),
                "notification": self.store._uj(r["notification_policy_json"], {}),
            },
            "features": self._resolve_features(r),
            "phase": r["phase"],
            "created_at": r["created_at"],
            "updated_at": r["updated_at"],
            "paused_at": r["paused_at"],
            "archived_at": r["archived_at"] if "archived_at" in r.keys() else None,
            "archived_by": r["archived_by"] if "archived_by" in r.keys() else None,
        }

    def archive_project(self, project_id: str, *, actor: str, interface: str = "service") -> Dict[str, Any]:
        row = self._require_known(project_id)
        if row["archived_at"] is not None:
            raise ServiceError(f"project '{project_id}' is already archived")
        stamp = iso(self._clock())
        with self.store.tx() as cx:
            cx.execute(
                "UPDATE project_stewardship SET enabled=0, archived_at=?, archived_by=?, updated_at=? WHERE project_id=?",
                (stamp, actor, stamp, project_id),
            )
        untouched = ["project", "board", "tasks", "repository"]
        self.store.audit(actor=actor, interface=interface, action="project.archived", subject=project_id, detail={"canonical_untouched": untouched})
        return {**self._row_settings(self._require_known(project_id)), "canonical_untouched": untouched}

    def restore_project(self, project_id: str, *, actor: str, interface: str = "service") -> Dict[str, Any]:
        row = self._require_known(project_id)
        if row["archived_at"] is None:
            raise ServiceError(f"project '{project_id}' is not archived")
        stamp = iso(self._clock())
        with self.store.tx() as cx:
            cx.execute(
                "UPDATE project_stewardship SET enabled=1, phase='active', paused_at=NULL,"
                " archived_at=NULL, archived_by=NULL, updated_at=? WHERE project_id=?",
                (stamp, project_id),
            )
        untouched = ["project", "board", "tasks", "repository"]
        self.store.audit(actor=actor, interface=interface, action="project.restored", subject=project_id, detail={"canonical_untouched": untouched})
        return {**self._row_settings(self._require_known(project_id)), "canonical_untouched": untouched}

    # ------------------------------------------------------------------ #
    # Feature toggles (DY-FT-01): hide, never delete; re-enable restores. #
    # ------------------------------------------------------------------ #

    TOGGLABLE_FEATURES = (
        "workflow_canvas",
        "milestones",
        "initiatives",
        "inbox",
        "notifications",
        "saved_views",
        "reconciliation",
    )
    # Features defaulting to OFF until explicitly enabled. Automation stays
    # inactive by default (plan Phase 3); enabling is a deliberate act.
    DEFAULT_OFF_FEATURES = ("reconciliation",)
    # Core surfaces: the mechanism that makes toggling safe. Never togglable.
    CORE_FEATURES = (
        "projects",
        "settings",
        "audit",
        "health",
        "work_items",
        "events",
    )

    def _features_row(self, project_id: str) -> Dict[str, bool]:
        row = self.store._conn.execute(
            "SELECT features_json FROM project_stewardship WHERE project_id=?",
            (project_id,),
        ).fetchone()
        if row is None:
            raise ServiceError(f"stewardship not enabled for project '{project_id}'")
        return self._resolve_features(row)

    def _resolve_features(self, r: sqlite3.Row) -> Dict[str, bool]:
        stored = self.store._uj(r["features_json"], {}) if r["features_json"] else {}
        return {
            name: bool(stored.get(name, name not in self.DEFAULT_OFF_FEATURES))
            for name in self.TOGGLABLE_FEATURES
        }

    def features(self, project_id: str) -> Dict[str, bool]:
        """Resolved feature-toggle map for a project."""
        return self._features_row(project_id)

    def require_feature(self, project_id: str, name: str) -> None:
        """Fail closed when a togglable feature is disabled for the project."""
        if name in self.CORE_FEATURES:
            return
        if name not in self.TOGGLABLE_FEATURES:
            raise ServiceError(f"unknown feature '{name}'")
        features = self._features_row(project_id)
        if not features.get(name, True):
            raise FeatureDisabledError(project_id, name)

    def update_features(
        self,
        project_id: str,
        changes: Dict[str, bool],
        *,
        actor: str,
        interface: str,
    ) -> Dict[str, bool]:
        """Enable/disable togglable features. Never touches stored data."""
        if not isinstance(changes, dict) or not changes:
            raise ServiceError("features must be a non-empty object of booleans")
        for name, value in changes.items():
            if name in self.CORE_FEATURES:
                raise ServiceError(
                    f"feature '{name}' is core and cannot be toggled off")
            if name not in self.TOGGLABLE_FEATURES:
                raise ServiceError(f"unknown feature '{name}'")
            if not isinstance(value, bool):
                raise ServiceError(f"feature '{name}' must be true or false")
        # Read-modify-write inside the transaction (cor-004): resolving the
        # current map outside it would lose updates under concurrent PATCHes.
        with self.store.tx() as cx:
            row = cx.execute(
                "SELECT features_json FROM project_stewardship"
                " WHERE project_id=?",
                (project_id,),
            ).fetchone()
            if row is None:
                raise ServiceError(
                    f"stewardship not enabled for project '{project_id}'")
            stored = self.store._uj(row["features_json"], {}) \
                if row["features_json"] else {}
            current = {name: bool(stored.get(name, True))
                       for name in self.TOGGLABLE_FEATURES}
            next_features = dict(current)
            next_features.update(changes)
            cx.execute(
                "UPDATE project_stewardship SET features_json=?, updated_at=?"
                " WHERE project_id=?",
                (self.store._j(next_features), iso(self._clock()), project_id),
            )
        for name, value in sorted(changes.items()):
            self.store.audit(
                actor=actor,
                interface=interface,
                action="feature.enabled" if value else "feature.disabled",
                subject=f"{project_id}:{name}",
            )
        return next_features

    def settings(self, project_id: str, *,
                 include_disabled: bool = False) -> Dict[str, Any]:
        r = self.store._conn.execute(
            "SELECT * FROM project_stewardship WHERE project_id=?", (project_id,)
        ).fetchone()
        if r is None:
            raise ServiceError(f"stewardship not enabled for project '{project_id}'")
        if not r["enabled"] and not include_disabled:
            raise ServiceError(f"stewardship is disabled for project '{project_id}'")
        return self._row_settings(r)

    def update_settings(
        self,
        project_id: str,
        *,
        mission: Optional[str] = None,
        lead_profile: Optional[str] = None,
        member_profiles: Optional[Sequence[str]] = None,
        autonomy_level: Optional[int] = None,
        autonomy_policy: Optional[Dict[str, Any]] = None,
        verification_policy: Optional[Dict[str, Any]] = None,
        release_policy: Optional[Dict[str, Any]] = None,
        notification_policy: Optional[Dict[str, Any]] = None,
        actor: str = "system",
        interface: str = "service",
    ) -> Dict[str, Any]:
        """Patch project configuration without discarding unknown policy keys."""
        current = self.settings(project_id)
        changed: List[str] = []

        if mission is not None:
            if not isinstance(mission, str) or len(mission.strip()) > 2000:
                raise ServiceError("mission must be text of at most 2000 characters")
            current["mission"] = mission.strip()
            changed.append("mission")
        membership_changes: Dict[str, Any] = {}
        if lead_profile is not None:
            if not isinstance(lead_profile, str) or len(lead_profile.strip()) > 100:
                raise ServiceError("lead_profile must be text of at most 100 characters")
            membership_changes["lead_profile"] = lead_profile.strip() or None
            changed.append("lead_profile")
        if member_profiles is not None:
            members = list(member_profiles)
            if len(members) > 32 or any(
                not isinstance(profile, str) or not profile.strip() or len(profile.strip()) > 100
                for profile in members
            ):
                raise ServiceError("member_profiles must contain at most 32 valid profile names")
            membership_changes["member_profiles"] = [p.strip() for p in members if p.strip()]
            changed.append("member_profiles")
        if autonomy_level is not None:
            if isinstance(autonomy_level, bool) or not isinstance(autonomy_level, int) or not 0 <= autonomy_level <= 5:
                raise ServiceError("autonomy_level must be an integer from 0 to 5")
            current["autonomy_level"] = autonomy_level
            changed.append("autonomy_level")

        def merge_policy(name: str, patch: Optional[Dict[str, Any]]) -> None:
            if patch is None:
                return
            if not isinstance(patch, dict):
                raise ServiceError(f"{name}_policy must be an object")

            def deep_merge(base: Dict[str, Any], incoming: Dict[str, Any]) -> Dict[str, Any]:
                merged = dict(base)
                for key, value in incoming.items():
                    if isinstance(value, dict) and isinstance(merged.get(key), dict):
                        merged[key] = deep_merge(merged[key], value)
                    else:
                        merged[key] = value
                return merged

            current["policies"][name] = deep_merge(current["policies"][name], patch)
            changed.append(f"{name}_policy")

        merge_policy("autonomy", autonomy_policy)
        merge_policy("verification", verification_policy)
        merge_policy("release", release_policy)
        merge_policy("notification", notification_policy)

        if not changed:
            return current

        now = iso(self._clock())
        # Fix 2 (atomic reconciliation): validation happened above; mission,
        # policies, full roster reconciliation and the legacy projections
        # commit in ONE transaction — a membership failure rolls back
        # mission/policy changes too.
        with self.store.tx() as cx:
            cx.execute(
                """
                UPDATE project_stewardship SET
                    mission=?,
                    autonomy_level=?, autonomy_policy_json=?,
                    verification_policy_json=?, release_policy_json=?,
                    notification_policy_json=?, updated_at=?
                WHERE project_id=?
                """,
                (
                    current["mission"],
                    current["autonomy_level"],
                    self.store._j(current["policies"]["autonomy"]),
                    self.store._j(current["policies"]["verification"]),
                    self.store._j(current["policies"]["release"]),
                    self.store._j(current["policies"]["notification"]),
                    now,
                    project_id,
                ),
            )
            if membership_changes:
                self._membership().reconcile_in_tx(
                    cx, project_id,
                    lead_profile=membership_changes.get(
                        "lead_profile", current["owner"]["lead_profile"]
                    ),
                    member_profiles=membership_changes.get(
                        "member_profiles", current["owner"]["member_profiles"]
                    ),
                )
        self.store.audit(
            actor=actor,
            interface=interface,
            action="project.settings_updated",
            subject=project_id,
            detail={"fields": changed},
        )
        return self.settings(project_id)

    def archive_mission(
        self,
        project_id: str,
        *,
        actor: str = "system",
        interface: str = "service",
    ) -> Dict[str, Any]:
        """Preserve the active mission in history, then clear it atomically."""
        current = self.settings(project_id)
        mission = str(current.get("mission") or "").strip()
        if not mission:
            raise ServiceError("project has no active mission to archive")
        archived_at = iso(self._clock())
        archive_id = f"MISSION-{uuid.uuid4().hex[:12].upper()}"
        with self.store.tx() as cx:
            cx.execute(
                "INSERT INTO project_mission_archive(archive_id, project_id, mission,"
                " archived_by, archived_at) VALUES(?,?,?,?,?)",
                (archive_id, project_id, mission, actor, archived_at),
            )
            cx.execute(
                "UPDATE project_stewardship SET mission='', updated_at=?"
                " WHERE project_id=?",
                (archived_at, project_id),
            )
        self.store.audit(
            actor=actor,
            interface=interface,
            action="mission.archived",
            subject=project_id,
            detail={"archive_id": archive_id},
        )
        return {
            "archive_id": archive_id,
            "project_id": project_id,
            "mission": mission,
            "archived_by": actor,
            "archived_at": archived_at,
        }

    def archived_missions(self, project_id: str) -> List[Dict[str, Any]]:
        self._require_known(project_id)
        rows = self.store._conn.execute(
            "SELECT archive_id, project_id, mission, archived_by, archived_at"
            " FROM project_mission_archive WHERE project_id=?"
            " ORDER BY archived_at DESC, archive_id DESC",
            (project_id,),
        ).fetchall()
        return [dict(row) for row in rows]

    def remove_mission(
        self,
        project_id: str,
        *,
        actor: str = "system",
        interface: str = "service",
    ) -> Dict[str, Any]:
        """Clear the active mission without retaining its text in mission history."""
        current = self.settings(project_id)
        if not str(current.get("mission") or "").strip():
            raise ServiceError("project has no active mission to remove")
        with self.store.tx() as cx:
            cx.execute(
                "UPDATE project_stewardship SET mission='', updated_at=?"
                " WHERE project_id=?",
                (iso(self._clock()), project_id),
            )
        self.store.audit(
            actor=actor,
            interface=interface,
            action="mission.removed",
            subject=project_id,
        )
        return {"project_id": project_id, "removed": True}

    def is_active(self, project_id: str) -> bool:
        try:
            s = self.settings(project_id)
        except ServiceError:
            return False
        return s["enabled"] and s["phase"] == ProjectPhase.ACTIVE.value

    def list_projects(self) -> List[Dict[str, Any]]:
        rows = self.store._conn.execute(
            "SELECT project_id, enabled, phase, autonomy_level FROM project_stewardship"
            " ORDER BY project_id"
        ).fetchall()
        return [dict(r) for r in rows]

    # ------------------------------------------------------------------ #
    # Goals                                                              #
    # ------------------------------------------------------------------ #

    def _goal_row(self, project_id: str, goal_id: str) -> sqlite3.Row:
        self._require_known(project_id)
        row = self.store._conn.execute(
            "SELECT * FROM project_goals WHERE project_id=? AND goal_id=?",
            (project_id, goal_id),
        ).fetchone()
        if row is None:
            raise ServiceError(f"unknown goal '{goal_id}' for project '{project_id}'")
        return row

    def _goal_dict(self, row: sqlite3.Row) -> Dict[str, Any]:
        objective_ids = [
            int(link["objective_id"])
            for link in self.store._conn.execute(
                "SELECT objective_id FROM project_objective_goals WHERE goal_id=?"
                " ORDER BY objective_id",
                (row["goal_id"],),
            ).fetchall()
        ]
        return {
            "goal_id": row["goal_id"],
            "project_id": row["project_id"],
            "title": row["title"],
            "description": row["description"],
            "position": row["position"],
            "created_at": row["created_at"],
            "updated_at": row["updated_at"],
            "archived_at": row["archived_at"],
            "objective_ids": objective_ids,
        }

    @staticmethod
    def _validate_goal_values(title: str, description: str, position: int) -> tuple[str, str, int]:
        clean_title = title.strip() if isinstance(title, str) else ""
        clean_description = description.strip() if isinstance(description, str) else ""
        if not clean_title or len(clean_title) > 200:
            raise ServiceError("goal title must be 1 to 200 characters")
        if len(clean_description) > 2000:
            raise ServiceError("goal description must be at most 2000 characters")
        if isinstance(position, bool) or int(position) < 0:
            raise ServiceError("goal position must be a non-negative integer")
        return clean_title, clean_description, int(position)

    @staticmethod
    def _replace_goal_links_in_tx(
        cx: sqlite3.Connection,
        project_id: str,
        goal_id: str,
        objective_ids: Sequence[int],
    ) -> None:
        requested = list(dict.fromkeys(int(value) for value in objective_ids))
        if requested:
            placeholders = ",".join("?" for _ in requested)
            rows = cx.execute(
                f"SELECT id FROM project_objectives WHERE project_id=? AND id IN ({placeholders})",
                (project_id, *requested),
            ).fetchall()
            found = {int(row["id"]) for row in rows}
            missing = sorted(set(requested) - found)
            if missing:
                raise ServiceError(f"unknown project objective ids: {missing}")
            conflicts = cx.execute(
                f"SELECT objective_id, goal_id FROM project_objective_goals "
                f"WHERE objective_id IN ({placeholders}) AND goal_id != ?",
                (*requested, goal_id),
            ).fetchall()
            if conflicts:
                raise ServiceError(
                    f"objective {conflicts[0]['objective_id']} is linked to another goal"
                )
        cx.execute("DELETE FROM project_objective_goals WHERE goal_id=?", (goal_id,))
        for objective_id in requested:
            cx.execute(
                "INSERT INTO project_objective_goals(objective_id, goal_id) VALUES(?,?)",
                (objective_id, goal_id),
            )

    def create_goal(
        self,
        project_id: str,
        *,
        title: str,
        description: str = "",
        position: Optional[int] = None,
        objective_ids: Sequence[int] = (),
        actor: str = "system",
        interface: str = "service",
    ) -> Dict[str, Any]:
        self._require(project_id)
        if position is None:
            row = self.store._conn.execute(
                "SELECT COALESCE(MAX(position), -1) + 1 AS position FROM project_goals"
                " WHERE project_id=? AND archived_at IS NULL",
                (project_id,),
            ).fetchone()
            position = int(row["position"])
        clean_title, clean_description, clean_position = self._validate_goal_values(
            title, description, position
        )
        now = iso(self._clock())
        goal_id = f"GOAL-{uuid.uuid4().hex[:16].upper()}"
        with self.store.tx() as cx:
            cx.execute(
                "INSERT INTO project_goals(goal_id, project_id, title, description,"
                " position, created_at, updated_at) VALUES(?,?,?,?,?,?,?)",
                (goal_id, project_id, clean_title, clean_description, clean_position, now, now),
            )
            self._replace_goal_links_in_tx(cx, project_id, goal_id, objective_ids)
        self.store.audit(
            actor=actor, interface=interface, action="goal.created", subject=goal_id,
            detail={"project_id": project_id, "objective_ids": list(objective_ids)},
        )
        return self._goal_dict(self._goal_row(project_id, goal_id))

    def update_goal(
        self,
        project_id: str,
        goal_id: str,
        *,
        title: Optional[str] = None,
        description: Optional[str] = None,
        position: Optional[int] = None,
        objective_ids: Optional[Sequence[int]] = None,
        actor: str = "system",
        interface: str = "service",
    ) -> Dict[str, Any]:
        existing = self._goal_row(project_id, goal_id)
        clean_title, clean_description, clean_position = self._validate_goal_values(
            existing["title"] if title is None else title,
            existing["description"] if description is None else description,
            existing["position"] if position is None else position,
        )
        with self.store.tx() as cx:
            cx.execute(
                "UPDATE project_goals SET title=?, description=?, position=?, updated_at=?"
                " WHERE project_id=? AND goal_id=?",
                (clean_title, clean_description, clean_position, iso(self._clock()), project_id, goal_id),
            )
            if objective_ids is not None:
                self._replace_goal_links_in_tx(cx, project_id, goal_id, objective_ids)
        self.store.audit(
            actor=actor, interface=interface, action="goal.updated", subject=goal_id,
        )
        return self._goal_dict(self._goal_row(project_id, goal_id))

    def goals(self, project_id: str, *, include_archived: bool = False) -> List[Dict[str, Any]]:
        self._require_known(project_id)
        sql = "SELECT * FROM project_goals WHERE project_id=?"
        if not include_archived:
            sql += " AND archived_at IS NULL"
        sql += " ORDER BY position, created_at, goal_id"
        return [self._goal_dict(row) for row in self.store._conn.execute(sql, (project_id,)).fetchall()]

    def reorder_goals(
        self,
        project_id: str,
        goal_ids: Sequence[str],
        *,
        actor: str = "system",
        interface: str = "service",
    ) -> List[Dict[str, Any]]:
        self._require(project_id)
        requested = list(dict.fromkeys(str(value) for value in goal_ids))
        active = [row["goal_id"] for row in self.store._conn.execute(
            "SELECT goal_id FROM project_goals WHERE project_id=? AND archived_at IS NULL",
            (project_id,),
        ).fetchall()]
        if len(requested) != len(goal_ids) or set(requested) != set(active):
            raise ServiceError("goal order must contain every active goal exactly once")
        with self.store.tx() as cx:
            for position, goal_id in enumerate(requested):
                cx.execute(
                    "UPDATE project_goals SET position=?, updated_at=?"
                    " WHERE project_id=? AND goal_id=? AND archived_at IS NULL",
                    (position, iso(self._clock()), project_id, goal_id),
                )
        self.store.audit(
            actor=actor, interface=interface, action="goal.reordered", subject=project_id,
            detail={"goal_ids": requested},
        )
        return self.goals(project_id)

    def archive_goal(
        self, project_id: str, goal_id: str, *, actor: str, interface: str
    ) -> Dict[str, Any]:
        self._require(project_id)
        self._goal_row(project_id, goal_id)
        with self.store.tx() as cx:
            cx.execute(
                "UPDATE project_goals SET archived_at=COALESCE(archived_at,?), updated_at=?"
                " WHERE project_id=? AND goal_id=?",
                (iso(self._clock()), iso(self._clock()), project_id, goal_id),
            )
        self.store.audit(
            actor=actor, interface=interface, action="goal.archived", subject=goal_id,
        )
        return self._goal_dict(self._goal_row(project_id, goal_id))

    def restore_goal(
        self, project_id: str, goal_id: str, *, actor: str, interface: str
    ) -> Dict[str, Any]:
        self._require(project_id)
        self._goal_row(project_id, goal_id)
        with self.store.tx() as cx:
            cx.execute(
                "UPDATE project_goals SET archived_at=NULL, updated_at=?"
                " WHERE project_id=? AND goal_id=?",
                (iso(self._clock()), project_id, goal_id),
            )
        self.store.audit(
            actor=actor, interface=interface, action="goal.restored", subject=goal_id,
        )
        return self._goal_dict(self._goal_row(project_id, goal_id))

    # ------------------------------------------------------------------ #
    # Objectives                                                         #
    # ------------------------------------------------------------------ #

    def _objective_dict(self, row: sqlite3.Row) -> Dict[str, Any]:
        return {
            "id": row["id"],
            "project_id": row["project_id"],
            "name": row["name"],
            "description": row["description"],
            "evaluator_type": row["evaluator_type"],
            "target": row["target"],
            "severity": row["severity"],
            "enabled": bool(row["enabled"]),
            "command": self.store._uj(row["command_json"], None),
            "integration": row["integration"],
            "window": row["window"],
        }

    def _validate_objective(
        self,
        *,
        name: str,
        evaluator_type: str,
        target: str,
        severity: str,
        description: str,
        command: Optional[Sequence[str]],
        integration: Optional[str],
        window: str,
    ) -> Dict[str, Any]:
        clean_name = name.strip() if isinstance(name, str) else ""
        clean_target = target.strip() if isinstance(target, str) else ""
        clean_description = description.strip() if isinstance(description, str) else ""
        clean_window = window.strip() if isinstance(window, str) else ""
        if not clean_name or len(clean_name) > 200:
            raise ServiceError("objective name must be 1 to 200 characters")
        if not clean_target or len(clean_target) > 500:
            raise ServiceError("objective target must be 1 to 500 characters")
        if len(clean_description) > 2000:
            raise ServiceError("objective description must be at most 2000 characters")
        if not clean_window or len(clean_window) > 50:
            raise ServiceError("objective window must be 1 to 50 characters")
        import re
        from ..objectives.evaluators import parse_target
        if not re.fullmatch(r"([1-9][0-9]{0,3})d", clean_window):
            raise ServiceError("objective window must be 1d to 9999d")
        try:
            parse_target(clean_target)
        except ValueError as error:
            raise ServiceError(str(error)) from error
        if evaluator_type not in ("manual", "command", "integration"):
            raise ServiceError(f"unsupported evaluator_type '{evaluator_type}'")
        if severity not in ("info", "low", "medium", "high"):
            raise ServiceError(f"unsupported objective severity '{severity}'")
        clean_command = list(command) if command is not None else None
        if evaluator_type == "command":
            if not clean_command:
                raise ServiceError("command objective requires a command argv list")
            if isinstance(command, str) or any(
                not isinstance(part, str) or not part for part in clean_command
            ):
                raise ServiceError("command must be an argv list (no shell strings)")
        clean_integration = integration.strip() if isinstance(integration, str) else None
        if evaluator_type == "integration" and not clean_integration:
            raise ServiceError("integration objective requires an integration name")
        if evaluator_type == "integration" and clean_integration != "github":
            raise ServiceError("unsupported integration; only github is supported")
        return {
            "name": clean_name,
            "evaluator_type": evaluator_type,
            "target": clean_target,
            "severity": severity,
            "description": clean_description,
            "command": clean_command,
            "integration": clean_integration,
            "window": clean_window,
        }

    def add_objective(
        self,
        project_id: str,
        *,
        name: str,
        evaluator_type: str,
        target: str,
        severity: str = "medium",
        description: str = "",
        command: Optional[Sequence[str]] = None,
        integration: Optional[str] = None,
        window: str = "30d",
        actor: str = "system",
        interface: str = "service",
    ) -> Dict[str, Any]:
        self._require(project_id)
        values = self._validate_objective(
            name=name,
            evaluator_type=evaluator_type,
            target=target,
            severity=severity,
            description=description,
            command=command,
            integration=integration,
            window=window,
        )
        try:
            with self.store.tx() as cx:
                cx.execute(
                    """
                    INSERT INTO project_objectives(
                        project_id, name, description, evaluator_type, target,
                        severity, enabled, command_json, integration, window)
                    VALUES(?,?,?,?,?,?,?,?,?,?)
                    """,
                    (
                        project_id,
                        values["name"],
                        values["description"],
                        values["evaluator_type"],
                        values["target"],
                        values["severity"],
                        1,
                        self.store._j(values["command"]) if values["command"] else None,
                        values["integration"],
                        values["window"],
                    ),
                )
        except sqlite3.IntegrityError as error:
            message = str(error)
            if (
                "UNIQUE constraint failed" in message
                and "project_objectives.project_id" in message
                and "project_objectives.name" in message
            ):
                raise ServiceError(
                    "an objective with that name already exists"
                ) from None
            raise
        row = self.store._conn.execute(
            "SELECT * FROM project_objectives WHERE project_id=? AND name=?",
            (project_id, values["name"]),
        ).fetchone()
        self.store.audit(
            actor=actor,
            interface=interface,
            action="objective.added",
            subject=f"{project_id}:{values['name']}",
        )
        return self._objective_dict(row)

    def _objective_row(self, project_id: str, objective_id: int) -> sqlite3.Row:
        self._require(project_id)
        row = self.store._conn.execute(
            "SELECT * FROM project_objectives WHERE project_id=? AND id=?",
            (project_id, objective_id),
        ).fetchone()
        if row is None:
            raise ServiceError(f"unknown objective {objective_id} for project '{project_id}'")
        return row

    def update_objective(
        self,
        project_id: str,
        objective_id: int,
        *,
        name: Optional[str] = None,
        evaluator_type: Optional[str] = None,
        target: Optional[str] = None,
        severity: Optional[str] = None,
        description: Optional[str] = None,
        command: Optional[Sequence[str]] = None,
        integration: Optional[str] = None,
        window: Optional[str] = None,
        actor: str = "system",
        interface: str = "service",
    ) -> Dict[str, Any]:
        row = self._objective_row(project_id, objective_id)
        existing = self._objective_dict(row)
        selected_type = evaluator_type or existing["evaluator_type"]
        selected_command = command
        if command is None and selected_type == existing["evaluator_type"]:
            selected_command = existing["command"]
        selected_integration = integration
        if integration is None and selected_type == existing["evaluator_type"]:
            selected_integration = existing["integration"]
        values = self._validate_objective(
            name=existing["name"] if name is None else name,
            evaluator_type=selected_type,
            target=existing["target"] if target is None else target,
            severity=existing["severity"] if severity is None else severity,
            description=existing["description"] if description is None else description,
            command=selected_command,
            integration=selected_integration,
            window=existing["window"] if window is None else window,
        )
        try:
            with self.store.tx() as cx:
                cx.execute(
                    """UPDATE project_objectives SET name=?, description=?,
                    evaluator_type=?, target=?, severity=?, command_json=?,
                    integration=?, window=? WHERE project_id=? AND id=?""",
                    (
                        values["name"],
                        values["description"],
                        values["evaluator_type"],
                        values["target"],
                        values["severity"],
                        self.store._j(values["command"]) if values["command"] else None,
                        values["integration"],
                        values["window"],
                        project_id,
                        objective_id,
                    ),
                )
        except sqlite3.IntegrityError as error:
            raise ServiceError("an objective with that name already exists") from error
        updated = self._objective_row(project_id, objective_id)
        self.store.audit(
            actor=actor,
            interface=interface,
            action="objective.updated",
            subject=f"{project_id}:{objective_id}",
        )
        return self._objective_dict(updated)

    def archive_objective(
        self,
        project_id: str,
        objective_id: int,
        *,
        actor: str = "system",
        interface: str = "service",
    ) -> Dict[str, Any]:
        self._objective_row(project_id, objective_id)
        with self.store.tx() as cx:
            cx.execute(
                "UPDATE project_objectives SET enabled=0 WHERE project_id=? AND id=?",
                (project_id, objective_id),
            )
        archived = self._objective_row(project_id, objective_id)
        self.store.audit(
            actor=actor,
            interface=interface,
            action="objective.archived",
            subject=f"{project_id}:{objective_id}",
        )
        return self._objective_dict(archived)

    def remove_objective(
        self,
        project_id: str,
        objective_id: int,
        *,
        actor: str = "system",
        interface: str = "service",
    ) -> Dict[str, Any]:
        self._objective_row(project_id, objective_id)
        with self.store.tx() as cx:
            cx.execute(
                "DELETE FROM project_objectives WHERE project_id=? AND id=?",
                (project_id, objective_id),
            )
        self.store.audit(
            actor=actor,
            interface=interface,
            action="objective.removed",
            subject=f"{project_id}:{objective_id}",
        )
        return {"id": objective_id, "removed": True}

    def objectives(self, project_id: str, *, include_disabled: bool = False) -> List[Objective]:
        self._require_known(project_id)
        sql = "SELECT * FROM project_objectives WHERE project_id=?"
        if not include_disabled:
            sql += " AND enabled=1"
        sql += " ORDER BY id"
        rows = self.store._conn.execute(sql, (project_id,)).fetchall()
        return [Objective(**self._objective_dict(row)) for row in rows]

    # ------------------------------------------------------------------ #
    # Persisted manual assessments (P2.2)                                #
    # ------------------------------------------------------------------ #

    def record_assessment(
        self,
        project_id: str,
        objective_id: int,
        *,
        passed: bool,
        evidence: List[str],
        actor: str = "system",
        interface: str = "service",
        detail: str = "",
        expires_at: Optional[str] = None,
        trusted_principal: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Record a human manual assessment for an objective.

        Authority boundary (fail closed): the verified actor is ALWAYS the
        trusted principal bound by the auth middleware. If no trusted
        principal is available (no auth configured / caller not
        authenticated) the write is refused rather than trusting the
        payload actor — unauthorised agents cannot impersonate humans.
        """
        # 1. Trusted authority must exist. There is no "payload actor" path:
        # without a trusted principal this operation cannot be attributed.
        if trusted_principal is None or not str(trusted_principal).strip():
            raise ServiceError(
                "refused: no trusted authority available to verify a manual"
                " assessment; assessments require an authenticated human"
                " principal and the payload actor is never authority"
            )
        verified_actor = str(trusted_principal).strip()
        # 2. The assessment must be a human sign-off, never agent-attributed.
        if str(interface or "").strip().lower() not in (
            "dockyard:human", "rpc", "desktop", "api", "service",
        ) or "bot" in str(interface).lower() or "agent" in str(interface).lower():
            raise ServiceError(
                "refused: manual assessments must be recorded via a human"
                " interface, not an agent/bot interface"
            )
        if not evidence or not all(isinstance(e, str) and e.strip() for e in evidence):
            raise ServiceError("assessment requires at least one evidence reference")
        if len(evidence) > 32 or any(len(e) > 500 for e in evidence):
            raise ServiceError("evidence must be at most 500-char strings, max 32 entries")
        if not isinstance(detail, str) or len(detail) > 2000:
            raise ServiceError("detail must be text of at most 2000 characters")
        if expires_at is not None:
            try:
                expiry = datetime.fromisoformat(str(expires_at).replace("Z", "+00:00"))
                if expiry.utcoffset() is None:
                    raise ValueError("expiry requires a timezone")
            except ValueError:
                raise ServiceError(
                    f"expires_at must be an ISO-8601 timestamp, got '{expires_at}'"
                ) from None
        objective = self._objective_row(project_id, objective_id)
        if objective["evaluator_type"] != "manual" or not objective["enabled"]:
            raise ServiceError("assessment requires an active manual objective")
        recorded_at = iso(self._clock())
        with self.store.tx() as cx:
            cur = cx.execute(
                """
                INSERT INTO project_objective_assessments(
                    project_id, objective_id, passed, evidence_json, detail,
                    verified_actor, interface, recorded_at, expires_at)
                VALUES(?,?,?,?,?,?,?,?,?)
                """,
                (
                    project_id, objective_id, int(bool(passed)),
                    self.store._j(list(evidence)), detail,
                    verified_actor, interface, recorded_at, expires_at,
                ),
            )
        self.store.audit(
            actor=verified_actor,
            interface=interface,
            action="objective.assessment_recorded",
            subject=f"{project_id}:{objective_id}",
            detail={"passed": bool(passed), "evidence_count": len(evidence)},
        )
        row = self.store._conn.execute(
            "SELECT * FROM project_objective_assessments WHERE id=?",
            (int(cur.lastrowid or 0),),
        ).fetchone()
        return self._assessment_dict(row)

    @staticmethod
    def _assessment_dict(row: sqlite3.Row) -> Dict[str, Any]:
        return {
            "id": row["id"],
            "project_id": row["project_id"],
            "objective_id": row["objective_id"],
            "passed": bool(row["passed"]),
            "evidence": json.loads(row["evidence_json"]),
            "detail": row["detail"],
            "verified_actor": row["verified_actor"],
            "interface": row["interface"],
            "recorded_at": row["recorded_at"],
            "expires_at": row["expires_at"],
        }

    def objective_evidence(self, project_id: str, objective_id: int) -> Dict[str, Any]:
        """Read recorded samples only; never execute commands or fetch providers on GET."""
        import re
        from datetime import timedelta

        self._require_known(project_id)
        row = self.store._conn.execute(
            "SELECT * FROM project_objectives WHERE project_id=? AND id=?",
            (project_id, objective_id),
        ).fetchone()
        if row is None:
            raise ServiceError("objective not found")
        obj = self._objective_dict(row)
        now = self._clock()
        match = re.fullmatch(r"([1-9][0-9]{0,3})d", obj["window"])
        result: Dict[str, Any] = {
            "objective_id": objective_id, "state": "unknown", "window": obj["window"],
            "sample_count": 0, "pass_rate": None, "history": [],
            "evidence_age_seconds": None, "detail": "insufficient data in evidence window",
        }
        if not match:
            result["detail"] = "unsupported evidence window; expected 1d to 9999d"
            return result
        cutoff = now - timedelta(days=int(match.group(1)))
        samples = []
        if obj["evaluator_type"] == "manual":
            samples = self.assessments(project_id, objective_id)
        else:
            rows = self.store._conn.execute(
                "SELECT evidence_json, created_at FROM project_health_snapshots WHERE project_id=? ORDER BY id DESC",
                (project_id,),
            )
            for row in rows:
                for item in self.store._uj(row["evidence_json"], []):
                    payload = item.get("payload_json", {})
                    if item.get("kind") == "objective" and payload.get("objective_id") == objective_id:
                        samples.append({**payload, "recorded_at": row["created_at"]})
        from ..objectives.evaluators import DEFAULT_EVALUATOR, EvaluationContext
        history = []
        for sample in samples:
            try:
                timestamp = datetime.fromisoformat(sample["recorded_at"].replace("Z", "+00:00"))
                if timestamp.utcoffset() is None or not cutoff <= timestamp <= now:
                    continue
                state = "passed" if sample["passed"] else "failed"
                if obj["evaluator_type"] == "manual":
                    manual = Objective(**obj)
                    manual._manual_status = sample
                    state = DEFAULT_EVALUATOR.evaluate(manual, EvaluationContext(clock=self._clock)).state
                if obj["evaluator_type"] != "manual" and sample.get("measured") is None:
                    state = "unknown"
                expiry = sample.get("expires_at")
                if expiry:
                    expires = datetime.fromisoformat(expiry.replace("Z", "+00:00"))
                    state = "unknown" if expires.utcoffset() is None else ("stale" if expires <= now else state)
                history.append({**sample, "state": state, "evidence_age_seconds": (now-timestamp).total_seconds()})
            except (ValueError, TypeError, KeyError):
                continue
        history.sort(key=lambda sample: sample["evidence_age_seconds"])
        known = [sample for sample in history if sample["state"] in {"passed", "failed"}]
        result.update(sample_count=len(known), history=history[:100])
        if known:
            result["pass_rate"] = sum(sample["state"] == "passed" for sample in known) / len(known)
        if not obj["enabled"]:
            result.update(state="not_applicable", detail="objective archived; evidence preserved")
            return result
        if not history and samples:
            result.update(state="stale", detail="no recorded evidence inside objective window")
        if history:
            latest = history[0]
            result.update(state=latest["state"], evidence_age_seconds=latest["evidence_age_seconds"],
                          detail=latest.get("detail") or f"latest recorded evidence is {latest['state']}")
        return result

    def latest_assessment(
        self, project_id: str, objective_id: int
    ) -> Optional[Dict[str, Any]]:
        row = self.store._conn.execute(
            "SELECT * FROM project_objective_assessments"
            " WHERE project_id=? AND objective_id=?"
            " ORDER BY id DESC LIMIT 1",
            (project_id, objective_id),
        ).fetchone()
        return self._assessment_dict(row) if row is not None else None

    def assessments(
        self, project_id: str, objective_id: Optional[int] = None
    ) -> List[Dict[str, Any]]:
        self._require_known(project_id)
        sql = ("SELECT * FROM project_objective_assessments WHERE project_id=?")
        params: List[Any] = [project_id]
        if objective_id is not None:
            sql += " AND objective_id=?"
            params.append(objective_id)
        sql += " ORDER BY id DESC LIMIT 200"
        return [
            self._assessment_dict(row)
            for row in self.store._conn.execute(sql, params).fetchall()
        ]

    # ------------------------------------------------------------------ #
    # Project supporting content                                         #
    # ------------------------------------------------------------------ #

    def _content_root(self) -> Path:
        raw_root = self.store.db_path.parent / "project-content"
        try:
            if raw_root.exists() or raw_root.is_symlink():
                root_info = os.lstat(raw_root)
                if stat.S_ISLNK(root_info.st_mode):
                    raise ServiceError("project content root cannot be a symlink")
                if not stat.S_ISDIR(root_info.st_mode):
                    raise ServiceError("project content root is not a directory")
            else:
                raw_root.mkdir(parents=True, exist_ok=False, mode=0o700)
            root = raw_root.resolve(strict=True)
        except OSError as exc:
            raise ServiceError("project content root is unavailable") from exc
        return root

    def _content_metadata(self, row: sqlite3.Row) -> Dict[str, Any]:
        return {
            "content_id": row["content_id"],
            "project_id": row["project_id"],
            "filename": row["filename"],
            "media_type": row["media_type"],
            "size_bytes": row["size_bytes"],
            "sha256": row["sha256"],
            "uploaded_by": row["uploaded_by"],
            "uploaded_at": row["uploaded_at"],
            "archived_at": row["archived_at"],
            "archived_by": row["archived_by"],
            "removal_state": row["removal_state"],
            "removed_at": row["removed_at"],
            "removed_by": row["removed_by"],
        }

    def _validate_content_bytes(self, media_type: str, content: bytes) -> None:
        if media_type in ("text/plain", "text/markdown"):
            try:
                content.decode("utf-8")
            except UnicodeDecodeError as error:
                raise ServiceError("text project content must be valid UTF-8") from error
            if b"\x00" in content:
                raise ServiceError("text project content cannot contain null bytes")
            return
        signatures = {
            "application/pdf": content.startswith(b"%PDF-"),
            "image/png": content.startswith(b"\x89PNG\r\n\x1a\n"),
            "image/jpeg": content.startswith(b"\xff\xd8\xff"),
            "image/webp": len(content) >= 12
            and content.startswith(b"RIFF")
            and content[8:12] == b"WEBP",
        }
        if not signatures.get(media_type, False):
            raise ServiceError("project content does not match its declared media type")

    def upload_project_content(
        self,
        project_id: str,
        *,
        filename: str,
        media_type: str,
        content: bytes,
        actor: str = "system",
        interface: str = "service",
    ) -> Dict[str, Any]:
        self._require(project_id)
        clean_filename = filename.strip() if isinstance(filename, str) else ""
        if (
            not clean_filename
            or len(clean_filename) > 180
            or Path(clean_filename).name != clean_filename
            or "/" in clean_filename
            or "\\" in clean_filename
            or clean_filename in (".", "..")
        ):
            raise ServiceError("filename must be a safe single filename")
        clean_media_type = media_type.split(";", 1)[0].strip().lower()
        extension = _CONTENT_TYPES.get(clean_media_type)
        if extension is None:
            raise ServiceError("supported project content types are text, Markdown, PDF and images")
        if not isinstance(content, bytes):
            raise ServiceError("project content must be bytes")
        if not content:
            raise ServiceError("project content cannot be empty")
        if len(content) > _MAX_CONTENT_BYTES:
            raise ServiceError("project content cannot exceed 5 MB")
        self._validate_content_bytes(clean_media_type, content)

        content_id = f"CONTENT-{uuid.uuid4().hex[:16].upper()}"
        project_dir_name = hashlib.sha256(project_id.encode("utf-8")).hexdigest()[:20]
        root = self._content_root()
        project_dir = root / project_dir_name
        project_dir.mkdir(parents=True, exist_ok=True, mode=0o700)
        final_path = (project_dir / f"{content_id}{extension}").resolve()
        if root not in final_path.parents:
            raise ServiceError("project content path escaped its storage root")
        fd, temporary_name = tempfile.mkstemp(prefix=".upload-", dir=project_dir)
        temporary_path = Path(temporary_name)
        try:
            with os.fdopen(fd, "wb") as handle:
                if os.name == "posix":
                    os.fchmod(handle.fileno(), 0o600)
                handle.write(content)
                handle.flush()
                if os.name == "posix":
                    os.fsync(handle.fileno())
            os.replace(temporary_path, final_path)
            stored_path = str(final_path.relative_to(root))
            uploaded_at = iso(self._clock())
            digest = hashlib.sha256(content).hexdigest()
            identity = os.stat(final_path, follow_symlinks=False)
            try:
                with self.store.tx() as cx:
                    cx.execute(
                        """INSERT INTO project_content(
                        content_id, project_id, filename, stored_path, media_type,
                        size_bytes, sha256, uploaded_by, uploaded_at, file_dev, file_ino)
                        VALUES(?,?,?,?,?,?,?,?,?,?,?)""",
                        (
                            content_id,
                            project_id,
                            clean_filename,
                            stored_path,
                            clean_media_type,
                            len(content),
                            digest,
                            actor,
                            uploaded_at,
                            int(identity.st_dev),
                            int(identity.st_ino),
                        ),
                    )
            except BaseException:
                final_path.unlink(missing_ok=True)
                raise
        finally:
            temporary_path.unlink(missing_ok=True)
        row = self.store._conn.execute(
            "SELECT * FROM project_content WHERE project_id=? AND content_id=?",
            (project_id, content_id),
        ).fetchone()
        self.store.audit(
            actor=actor,
            interface=interface,
            action="project.content_uploaded",
            subject=f"{project_id}:{content_id}",
            detail={"filename": clean_filename, "size_bytes": len(content)},
        )
        return self._content_metadata(row)

    def project_content(
        self, project_id: str, *, include_archived: bool = False,
        include_removed: bool = False,
    ) -> List[Dict[str, Any]]:
        self._require_known(project_id)
        sql = "SELECT * FROM project_content WHERE project_id=?"
        if not include_archived:
            sql += " AND archived_at IS NULL"
        if not include_removed:
            sql += " AND removal_state != 'file_removed'"
        sql += " ORDER BY uploaded_at DESC, content_id DESC"
        rows = self.store._conn.execute(sql, (project_id,)).fetchall()
        return [self._content_metadata(row) for row in rows]

    def _project_content_row(self, project_id: str, content_id: str) -> sqlite3.Row:
        self._require_known(project_id)
        row = self.store._conn.execute(
            "SELECT * FROM project_content WHERE project_id=? AND content_id=?",
            (project_id, content_id),
        ).fetchone()
        if row is None:
            raise ServiceError(f"unknown project content '{content_id}'")
        return row

    @staticmethod
    def _json_contains(value: Any, target: str) -> bool:
        if isinstance(value, dict):
            return any(StewardshipService._json_contains(item, target) for item in value.values())
        if isinstance(value, list):
            return any(StewardshipService._json_contains(item, target) for item in value)
        return value == target

    def project_content_dependencies(
        self, project_id: str, content_id: str
    ) -> List[Dict[str, str]]:
        self._project_content_row(project_id, content_id)
        dependencies: List[Dict[str, str]] = []
        sources = (
            ("objective_assessment", "project_objective_assessments", "id", ("evidence_json",)),
            ("canonical_work", "dockyard_canonical_work_details", "item_id", ("evidence_refs_json",)),
            ("legacy_work", "dockyard_work_items", "ref", ("evidence_refs_json",)),
            ("initiative", "project_initiatives", "ref", ("validation_contract_json", "outcome_json")),
        )
        for kind, table, id_column, json_columns in sources:
            selected = ",".join((id_column, *json_columns))
            rows = self.store._conn.execute(
                f"SELECT {selected} FROM {table} WHERE project_id=?", (project_id,)
            ).fetchall()
            for row in rows:
                for column in json_columns:
                    try:
                        payload = json.loads(row[column])
                    except (TypeError, json.JSONDecodeError):
                        continue
                    if self._json_contains(payload, content_id):
                        dependencies.append({"kind": kind, "ref": str(row[id_column])})
                        break
        return sorted(dependencies, key=lambda item: (item["kind"], item["ref"]))

    def archive_project_content(
        self, project_id: str, content_id: str, *, actor: str,
        interface: str = "service",
    ) -> Dict[str, Any]:
        self._require(project_id)
        row = self._project_content_row(project_id, content_id)
        if row["removal_state"] == "file_removed":
            raise ServiceError("removed project content cannot be archived")
        with self.store.tx() as cx:
            cx.execute(
                "UPDATE project_content SET archived_at=COALESCE(archived_at,?),"
                " archived_by=COALESCE(archived_by,?) WHERE project_id=? AND content_id=?",
                (iso(self._clock()), actor, project_id, content_id),
            )
        self.store.audit(
            actor=actor, interface=interface, action="project.content_archived",
            subject=f"{project_id}:{content_id}",
        )
        return self._content_metadata(self._project_content_row(project_id, content_id))

    def restore_project_content(
        self, project_id: str, content_id: str, *, actor: str,
        interface: str = "service",
    ) -> Dict[str, Any]:
        self._require(project_id)
        row = self._project_content_row(project_id, content_id)
        if row["removal_state"] == "file_removed":
            raise ServiceError("removed project content cannot be restored")
        with self.store.tx() as cx:
            cx.execute(
                "UPDATE project_content SET archived_at=NULL, archived_by=NULL"
                " WHERE project_id=? AND content_id=?",
                (project_id, content_id),
            )
        self.store.audit(
            actor=actor, interface=interface, action="project.content_restored",
            subject=f"{project_id}:{content_id}",
        )
        return self._content_metadata(self._project_content_row(project_id, content_id))

    def _managed_content_candidate(
        self, row: sqlite3.Row, *, allow_missing: bool = False
    ) -> tuple[Path, os.stat_result | None]:
        root = self._content_root()
        stored = str(row["stored_path"] or "")
        relative = Path(stored)
        if (
            not stored or relative.is_absolute()
            or any(part in {"", ".", ".."} for part in relative.parts)
        ):
            raise ServiceError("project content does not have a managed relative path")
        raw_candidate = root
        info: os.stat_result | None = None
        for index, part in enumerate(relative.parts):
            raw_candidate = raw_candidate / part
            try:
                info = os.lstat(raw_candidate)
            except FileNotFoundError as exc:
                if allow_missing and index == len(relative.parts) - 1:
                    info = None
                    break
                raise ServiceError("project content file is unavailable") from exc
            if stat.S_ISLNK(info.st_mode):
                raise ServiceError("project content path contains a symlink")
        try:
            candidate = (root / relative).resolve(strict=info is not None)
            candidate.relative_to(root)
        except (OSError, RuntimeError, ValueError) as exc:
            raise ServiceError("project content path escaped its managed root") from exc
        if info is not None and not stat.S_ISREG(info.st_mode):
            raise ServiceError("project content path is not a managed regular file")
        return candidate, info

    def _verify_managed_content_identity(
        self, row: sqlite3.Row, candidate: Path, info: os.stat_result
    ) -> None:
        if row["file_dev"] is None or row["file_ino"] is None:
            raise ServiceError("project content file identity is unavailable; removal refused")
        expected_identity = (int(row["file_dev"]), int(row["file_ino"]))
        if (int(info.st_dev), int(info.st_ino)) != expected_identity:
            raise ServiceError("project content file identity changed; removal refused")
        if int(info.st_size) != int(row["size_bytes"]):
            raise ServiceError("project content file identity changed; removal refused")
        flags = os.O_RDONLY | getattr(os, "O_NOFOLLOW", 0)
        try:
            descriptor = os.open(candidate, flags)
        except OSError as exc:
            raise ServiceError("project content file could not be opened safely") from exc
        try:
            opened = os.fstat(descriptor)
            if (int(opened.st_dev), int(opened.st_ino)) != expected_identity:
                raise ServiceError("project content file identity changed during verification")
            with os.fdopen(descriptor, "rb", closefd=False) as handle:
                raw = handle.read(_MAX_CONTENT_BYTES + 1)
        finally:
            os.close(descriptor)
        if len(raw) != int(row["size_bytes"]) or hashlib.sha256(raw).hexdigest() != row["sha256"]:
            raise ServiceError("project content failed its integrity check; removal refused")

    def _open_managed_content_parent(self, row: sqlite3.Row) -> tuple[int, str]:
        """Open the managed parent without following mutable pathnames."""
        root = self._content_root()
        relative = Path(str(row["stored_path"] or ""))
        if (
            not relative.parts or relative.is_absolute()
            or any(part in {"", ".", ".."} for part in relative.parts)
        ):
            raise ServiceError("project content does not have a managed relative path")
        directory_flags = (
            os.O_RDONLY | getattr(os, "O_DIRECTORY", 0) | getattr(os, "O_NOFOLLOW", 0)
        )
        directory_fd = os.open(root, directory_flags)
        try:
            for part in relative.parts[:-1]:
                next_fd = os.open(part, directory_flags, dir_fd=directory_fd)
                os.close(directory_fd)
                directory_fd = next_fd
            return directory_fd, relative.name
        except BaseException:
            os.close(directory_fd)
            raise

    def _verify_open_content_file(self, row: sqlite3.Row, file_fd: int) -> None:
        opened = os.fstat(file_fd)
        if not stat.S_ISREG(opened.st_mode):
            raise ServiceError("project content path is not a managed regular file")
        expected = (int(row["file_dev"]), int(row["file_ino"]))
        if (int(opened.st_dev), int(opened.st_ino)) != expected:
            raise ServiceError("project content file identity changed before removal")
        with os.fdopen(file_fd, "rb", closefd=False) as handle:
            raw = handle.read(_MAX_CONTENT_BYTES + 1)
        if len(raw) != int(row["size_bytes"]) or hashlib.sha256(raw).hexdigest() != row["sha256"]:
            raise ServiceError("project content failed its integrity check; removal refused")

    def _open_managed_content_file(self, row: sqlite3.Row) -> tuple[int, str, int]:
        """Open the managed parent and file without following mutable pathnames."""
        directory_fd, filename = self._open_managed_content_parent(row)
        file_fd: int | None = None
        try:
            file_flags = os.O_RDONLY | getattr(os, "O_NOFOLLOW", 0)
            file_fd = os.open(filename, file_flags, dir_fd=directory_fd)
            self._verify_open_content_file(row, file_fd)
            return directory_fd, filename, file_fd
        except BaseException:
            if file_fd is not None:
                os.close(file_fd)
            os.close(directory_fd)
            raise

    def _insert_content_removal_audit(
        self, cx: sqlite3.Connection, *, project_id: str, content_id: str,
        actor: str, interface: str, stored_path: str,
    ) -> None:
        existing = cx.execute(
            "SELECT 1 FROM stewardship_audit_log WHERE action='project.content_file_removed' AND subject=? LIMIT 1",
            (f"{project_id}:{content_id}",),
        ).fetchone()
        if existing is None:
            cx.execute(
                "INSERT INTO stewardship_audit_log(ts, actor, interface, action, subject, detail_json) VALUES(?,?,?,?,?,?)",
                (
                    iso(self._clock()), actor, interface, "project.content_file_removed",
                    f"{project_id}:{content_id}", self.store._j({"stored_path": stored_path}),
                ),
            )

    def remove_project_content(
        self, project_id: str, content_id: str, *, actor: str,
        interface: str = "service",
    ) -> Dict[str, Any]:
        self._require(project_id)
        row = self._project_content_row(project_id, content_id)
        if row["removal_state"] == "file_removed":
            return self._content_metadata(row)
        dependencies = self.project_content_dependencies(project_id, content_id)
        if dependencies:
            refs = ", ".join(f"{item['kind']}:{item['ref']}" for item in dependencies)
            raise ServiceError(f"project content removal blocked by dependencies: {refs}")
        candidate, info = self._managed_content_candidate(
            row, allow_missing=row["removal_state"] in {"pending", "quarantined"}
        )
        tombstone = f".{content_id}.removing"
        if info is None:
            parent_fd, _ = self._open_managed_content_parent(row)
            tombstone_fd: int | None = None
            final_fd: int | None = None
            try:
                try:
                    tombstone_fd = os.open(
                        tombstone,
                        os.O_RDONLY | getattr(os, "O_NOFOLLOW", 0),
                        dir_fd=parent_fd,
                    )
                except FileNotFoundError:
                    tombstone_fd = None
                if tombstone_fd is None:
                    raise ServiceError(
                        "managed quarantine marker is unavailable; removal refused"
                    )
                tombstone_info = os.fstat(tombstone_fd)
                expected_identity = (int(row["file_dev"]), int(row["file_ino"]))
                actual_identity = (
                    int(tombstone_info.st_dev), int(tombstone_info.st_ino)
                )
                if (
                    row["removal_state"] == "quarantined"
                    and actual_identity == expected_identity
                    and tombstone_info.st_size == 0
                ):
                    with self.store.tx() as cx:
                        dependencies = self.project_content_dependencies(project_id, content_id)
                        if dependencies:
                            refs = ", ".join(
                                f"{item['kind']}:{item['ref']}" for item in dependencies
                            )
                            raise ServiceError(
                                f"project content removal blocked by dependencies: {refs}"
                            )
                        cx.execute(
                            "UPDATE project_content SET removal_state='file_removed', removed_at=?,"
                            " removed_by=? WHERE project_id=? AND content_id=?"
                            " AND removal_state='quarantined'",
                            (iso(self._clock()), actor, project_id, content_id),
                        )
                        self._insert_content_removal_audit(
                            cx, project_id=project_id, content_id=content_id, actor=actor,
                            interface=interface, stored_path=str(row["stored_path"]),
                        )
                    return self._content_metadata(
                        self._project_content_row(project_id, content_id)
                    )
                self._verify_open_content_file(row, tombstone_fd)
                with self.store.tx() as cx:
                    dependencies = self.project_content_dependencies(project_id, content_id)
                    if dependencies:
                        refs = ", ".join(
                            f"{item['kind']}:{item['ref']}" for item in dependencies
                        )
                        raise ServiceError(
                            f"project content removal blocked by dependencies: {refs}"
                        )
                    if row["removal_state"] == "pending":
                        cx.execute(
                            "UPDATE project_content SET removal_state='quarantined'"
                            " WHERE project_id=? AND content_id=? AND removal_state='pending'",
                            (project_id, content_id),
                        )
                # Persist recovery intent before the irreversible filesystem effect.
                # A failed erase must not roll this transition back to pending.
                with self.store.tx() as cx:
                    dependencies = self.project_content_dependencies(project_id, content_id)
                    if dependencies:
                        refs = ", ".join(
                            f"{item['kind']}:{item['ref']}" for item in dependencies
                        )
                        raise ServiceError(
                            f"project content removal blocked by dependencies: {refs}"
                        )
                    current = os.stat(
                        tombstone, dir_fd=parent_fd, follow_symlinks=False
                    )
                    opened = os.fstat(tombstone_fd)
                    if (
                        stat.S_ISLNK(current.st_mode)
                        or int(current.st_dev) != int(opened.st_dev)
                        or int(current.st_ino) != int(opened.st_ino)
                    ):
                        raise ServiceError(
                            "quarantined content identity changed; removal refused"
                        )
                    final_fd = os.open(
                        tombstone,
                        os.O_RDWR | getattr(os, "O_NOFOLLOW", 0),
                        dir_fd=parent_fd,
                    )
                    self._verify_open_content_file(row, final_fd)
                    try:
                        os.ftruncate(final_fd, 0)
                        os.fsync(final_fd)
                        if os.fstat(final_fd).st_size != 0:
                            raise ServiceError(
                                "verified managed content could not be erased; removal refused"
                            )
                    except ServiceError:
                        raise
                    except OSError as exc:
                        raise ServiceError(
                            "managed file removal is quarantined after a filesystem failure; retry is safe"
                        ) from exc
                    cx.execute(
                        "UPDATE project_content SET removal_state='file_removed', removed_at=?,"
                        " removed_by=? WHERE project_id=? AND content_id=?"
                        " AND removal_state='quarantined'",
                        (iso(self._clock()), actor, project_id, content_id),
                    )
                    self._insert_content_removal_audit(
                        cx, project_id=project_id, content_id=content_id, actor=actor,
                        interface=interface, stored_path=str(row["stored_path"]),
                    )
            except ServiceError:
                raise
            except OSError as exc:
                raise ServiceError(
                    "managed file removal is quarantined after a filesystem failure; retry is safe"
                ) from exc
            finally:
                if final_fd is not None:
                    os.close(final_fd)
                if tombstone_fd is not None:
                    os.close(tombstone_fd)
                os.close(parent_fd)
            return self._content_metadata(self._project_content_row(project_id, content_id))

        self._verify_managed_content_identity(row, candidate, info)
        with self.store.tx() as cx:
            dependencies = self.project_content_dependencies(project_id, content_id)
            if dependencies:
                refs = ", ".join(f"{item['kind']}:{item['ref']}" for item in dependencies)
                raise ServiceError(f"project content removal blocked by dependencies: {refs}")
            cx.execute(
                "UPDATE project_content SET removal_state='pending', removed_by=?"
                " WHERE project_id=? AND content_id=? AND removal_state IN ('active','pending')",
                (actor, project_id, content_id),
            )
        parent_fd, filename, file_fd = self._open_managed_content_file(row)
        try:
            with self.store.tx() as cx:
                dependencies = self.project_content_dependencies(project_id, content_id)
                if dependencies:
                    refs = ", ".join(f"{item['kind']}:{item['ref']}" for item in dependencies)
                    raise ServiceError(f"project content removal blocked by dependencies: {refs}")
                try:
                    current = os.stat(filename, dir_fd=parent_fd, follow_symlinks=False)
                    opened = os.fstat(file_fd)
                    if (
                        stat.S_ISLNK(current.st_mode)
                        or int(current.st_dev) != int(opened.st_dev)
                        or int(current.st_ino) != int(opened.st_ino)
                    ):
                        raise ServiceError("project content file identity changed before removal")
                    os.rename(
                        filename,
                        tombstone,
                        src_dir_fd=parent_fd,
                        dst_dir_fd=parent_fd,
                    )
                    quarantined = os.stat(
                        tombstone, dir_fd=parent_fd, follow_symlinks=False
                    )
                    if (
                        stat.S_ISLNK(quarantined.st_mode)
                        or int(quarantined.st_dev) != int(opened.st_dev)
                        or int(quarantined.st_ino) != int(opened.st_ino)
                    ):
                        try:
                            os.stat(filename, dir_fd=parent_fd, follow_symlinks=False)
                        except FileNotFoundError:
                            os.rename(
                                tombstone,
                                filename,
                                src_dir_fd=parent_fd,
                                dst_dir_fd=parent_fd,
                            )
                        raise ServiceError(
                            "project content file identity changed during quarantine; removal refused"
                        )
                except ServiceError:
                    raise
                except OSError as exc:
                    raise ServiceError(
                        "managed file removal is pending after a filesystem failure; retry is safe"
                    ) from exc
                cx.execute(
                    "UPDATE project_content SET removal_state='quarantined'"
                    " WHERE project_id=? AND content_id=? AND removal_state='pending'",
                    (project_id, content_id),
                )
            tombstone_fd = os.open(
                tombstone,
                os.O_RDONLY | getattr(os, "O_NOFOLLOW", 0),
                dir_fd=parent_fd,
            )
            final_fd: int | None = None
            try:
                self._verify_open_content_file(row, tombstone_fd)
                with self.store.tx() as cx:
                    dependencies = self.project_content_dependencies(project_id, content_id)
                    if dependencies:
                        refs = ", ".join(
                            f"{item['kind']}:{item['ref']}" for item in dependencies
                        )
                        raise ServiceError(
                            f"project content removal blocked by dependencies: {refs}"
                        )
                    current = os.stat(
                        tombstone, dir_fd=parent_fd, follow_symlinks=False
                    )
                    opened = os.fstat(tombstone_fd)
                    if (
                        stat.S_ISLNK(current.st_mode)
                        or int(current.st_dev) != int(opened.st_dev)
                        or int(current.st_ino) != int(opened.st_ino)
                    ):
                        raise ServiceError(
                            "quarantined content identity changed; removal refused"
                        )
                    final_fd = os.open(
                        tombstone,
                        os.O_RDWR | getattr(os, "O_NOFOLLOW", 0),
                        dir_fd=parent_fd,
                    )
                    self._verify_open_content_file(row, final_fd)
                    try:
                        os.ftruncate(final_fd, 0)
                        os.fsync(final_fd)
                        if os.fstat(final_fd).st_size != 0:
                            raise ServiceError(
                                "verified managed content could not be erased; removal refused"
                            )
                    except ServiceError:
                        raise
                    except OSError as exc:
                        raise ServiceError(
                            "managed file removal is quarantined after a filesystem failure; retry is safe"
                        ) from exc
                    cx.execute(
                        "UPDATE project_content SET removal_state='file_removed', removed_at=?,"
                        " removed_by=? WHERE project_id=? AND content_id=?"
                        " AND removal_state='quarantined'",
                        (iso(self._clock()), actor, project_id, content_id),
                    )
                    self._insert_content_removal_audit(
                        cx, project_id=project_id, content_id=content_id, actor=actor,
                        interface=interface, stored_path=str(row["stored_path"]),
                    )
            finally:
                if final_fd is not None:
                    os.close(final_fd)
                os.close(tombstone_fd)
        finally:
            os.close(file_fd)
            os.close(parent_fd)
        return self._content_metadata(self._project_content_row(project_id, content_id))

    def project_content_preview(
        self, project_id: str, content_id: str
    ) -> Dict[str, Any]:
        self._require_known(project_id)
        row = self.store._conn.execute(
            "SELECT * FROM project_content WHERE project_id=? AND content_id=?",
            (project_id, content_id),
        ).fetchone()
        if row is None:
            raise ServiceError(f"unknown project content '{content_id}'")
        root = self._content_root()
        try:
            path = (root / row["stored_path"]).resolve(strict=True)
            if root not in path.parents or not path.is_file():
                raise FileNotFoundError("content path is outside its storage root")
            raw = path.read_bytes()
        except (OSError, RuntimeError) as error:
            raise ServiceError("project content file is unavailable") from error
        if (
            len(raw) != row["size_bytes"]
            or hashlib.sha256(raw).hexdigest() != row["sha256"]
        ):
            raise ServiceError("project content failed its integrity check")
        metadata = self._content_metadata(row)
        if row["media_type"] in ("text/plain", "text/markdown"):
            preview = raw[:_TEXT_PREVIEW_BYTES].decode("utf-8", errors="ignore")
            return {
                **metadata,
                "preview_kind": "text",
                "text": preview,
                "truncated": len(raw) > _TEXT_PREVIEW_BYTES,
            }
        return {**metadata, "preview_kind": "metadata", "text": None, "truncated": False}

    # ------------------------------------------------------------------ #
    # Health snapshots                                                   #
    # ------------------------------------------------------------------ #

    def record_health_snapshot(
        self,
        project_id: str,
        *,
        status: str,
        score: Optional[float],
        evidence: List[Dict[str, Any]],
        contradictions: List[Dict[str, Any]],
    ) -> int:
        self._require(project_id)
        with self.store.tx() as cx:
            cur = cx.execute(
                """
                INSERT INTO project_health_snapshots(
                    project_id, status, score, evidence_json, contradictions_json, created_at)
                VALUES(?,?,?,?,?,?)
                """,
                (
                    project_id,
                    status,
                    score,
                    self.store._j(evidence),
                    self.store._j(contradictions),
                    iso(self._clock()),
                ),
            )
        return int(cur.lastrowid)

    def latest_health(self, project_id: str) -> Optional[Dict[str, Any]]:
        row = self.store._conn.execute(
            "SELECT * FROM project_health_snapshots WHERE project_id=?"
            " ORDER BY id DESC LIMIT 1",
            (project_id,),
        ).fetchone()
        if row is None:
            return None
        return {
            "id": row["id"],
            "project_id": row["project_id"],
            "status": row["status"],
            "score": row["score"],
            "evidence": self.store._uj(row["evidence_json"], []),
            "contradictions": self.store._uj(row["contradictions_json"], []),
            "created_at": row["created_at"],
        }

    # ------------------------------------------------------------------ #
    # Cycles                                                             #
    # ------------------------------------------------------------------ #

    def cycle_start(
        self,
        project_id: str,
        *,
        trigger_type: str,
        trigger_ref: Optional[str],
        idempotency_key: Optional[str],
    ) -> int:
        with self.store.tx() as cx:
            cur = cx.execute(
                """
                INSERT INTO project_cycles(project_id, trigger_type, trigger_ref,
                                           idempotency_key, state, started_at)
                VALUES(?,?,?,?, 'running', ?)
                """,
                (project_id, trigger_type, trigger_ref, idempotency_key, iso(self._clock())),
            )
        return int(cur.lastrowid)

    def cycle_finish(
        self,
        cycle_id: int,
        *,
        state: str,
        summary: str,
    ) -> None:
        with self.store.tx() as cx:
            cx.execute(
                "UPDATE project_cycles SET state=?, summary=?, completed_at=? WHERE id=?",
                (state, summary, iso(self._clock()), cycle_id),
            )

    def recent_cycles(self, project_id: str, limit: int = 10) -> List[Dict[str, Any]]:
        rows = self.store._conn.execute(
            "SELECT * FROM project_cycles WHERE project_id=? ORDER BY id DESC LIMIT ?",
            (project_id, limit),
        ).fetchall()
        return [
            {
                "id": r["id"],
                "trigger_type": r["trigger_type"],
                "state": r["state"],
                "started_at": r["started_at"],
                "completed_at": r["completed_at"],
                "summary": r["summary"],
            }
            for r in rows
        ]

    def cycles_since(self, project_id: str, since: str) -> int:
        row = self.store._conn.execute(
            "SELECT COUNT(*) AS n FROM project_cycles WHERE project_id=? AND started_at >= ?",
            (project_id, since),
        ).fetchone()
        return int(row["n"])

    # ------------------------------------------------------------------ #
    # Initiatives                                                        #
    # ------------------------------------------------------------------ #

    def propose_initiative(
        self,
        project_id: str,
        *,
        title: str,
        rationale: str,
        expected_outcome: str = "",
        risk: str = "low",
        dedupe_key: Optional[str] = None,
        source_cycle_id: Optional[int] = None,
        validation_contract: Optional[Dict[str, Any]] = None,
        requires_approval: Optional[bool] = None,
        priority: int = 0,
    ) -> Dict[str, Any]:
        """Create a bounded change proposal.

        Enforces anti-busywork controls:
        - evidence-bearing rationale required;
        - dedupe against active/recent initiatives by exact key;
        - suppression windows after rejection;
        - per-project concurrency cap on open initiatives.
        """
        self._require(project_id)
        if not rationale.strip():
            raise ServiceError("initiative requires a rationale (anti-busywork rule)")

        settings = self.settings(project_id)
        if requires_approval is None:
            requires_approval = True  # V1 default: everything needs approval

        dk = dedupe_key or f"{title.strip().lower()[:80]}"

        open_states = (
            InitiativeStatus.PROPOSED.value,
            InitiativeStatus.PENDING_APPROVAL.value,
            InitiativeStatus.APPROVED.value,
            InitiativeStatus.EXECUTING.value,
        )
        approval_state = (
            ApprovalState.PENDING.value if requires_approval else ApprovalState.NOT_REQUIRED.value
        )
        status = (
            InitiativeStatus.PENDING_APPROVAL.value
            if requires_approval
            else InitiativeStatus.APPROVED.value
        )

        # ALL anti-busywork checks + insert run inside ONE BEGIN IMMEDIATE tx:
        # writers are serialised, so dedupe/cap decisions cannot race.
        with self.store.tx() as cx:
            suppressed = cx.execute(
                "SELECT suppressed_until, reason FROM initiative_suppression"
                " WHERE project_id=? AND dedupe_key=?",
                (project_id, dk),
            ).fetchone()
            if suppressed and suppressed["suppressed_until"] > iso(self._clock()):
                raise ServiceError(
                    f"initiative '{dk}' is suppressed until"
                    f" {suppressed['suppressed_until']} ({suppressed['reason']})"
                )
            dup = cx.execute(
                f"SELECT ref FROM project_initiatives WHERE project_id=? AND dedupe_key=?"
                f" AND status IN ({','.join('?' * len(open_states))})",
                (project_id, dk, *open_states),
            ).fetchone()
            if dup:
                raise ServiceError(f"duplicate of open initiative {dup['ref']}")
            cap = int(settings["policies"].get("notification", {}).get("max_open_initiatives", 5))
            cap = int(settings["policies"]["verification"].get("max_open_initiatives", cap))
            open_count = cx.execute(
                f"SELECT COUNT(*) AS n FROM project_initiatives WHERE project_id=?"
                f" AND status IN ({','.join('?' * len(open_states))})",
                (project_id, *open_states),
            ).fetchone()["n"]
            if open_count >= cap:
                raise ServiceError(
                    f"open-initiative cap reached ({cap}); resolve existing work first"
                )
            slug = "".join(ch for ch in project_id.upper() if ch.isalnum())[:8] or "PROJ"
            n = int(cx.execute(
                "SELECT COUNT(*) AS n FROM project_initiatives WHERE project_id=?",
                (project_id,),
            ).fetchone()["n"]) + 1
            while True:
                ref = f"INIT-{slug}-{n:04d}"
                try:
                    cx.execute(
                        """
                        INSERT INTO project_initiatives(
                            ref, project_id, title, rationale, expected_outcome, risk,
                            status, approval_state, priority, dedupe_key, source_cycle_id,
                            validation_contract_json, created_at)
                        VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)
                        """,
                        (
                            ref,
                            project_id,
                            title,
                            rationale,
                            expected_outcome,
                            risk,
                            status,
                            approval_state,
                            priority,
                            dk,
                            source_cycle_id,
                            self.store._j(validation_contract or {}),
                            iso(self._clock()),
                        ),
                    )
                    break
                except sqlite3.IntegrityError:
                    n += 1  # concurrent writer took this number; bump and retry
        self.store.audit(
            actor="system",
            interface="cycle",
            action="initiative.proposed",
            subject=ref,
            detail={"title": title, "risk": risk, "dedupe_key": dk},
        )
        return self.initiative_by_ref(ref)

    def _next_ref(self, project_id: str) -> str:
        slug = "".join(ch for ch in project_id.upper() if ch.isalnum())[:8] or "PROJ"
        row = self.store._conn.execute(
            "SELECT COUNT(*) AS n FROM project_initiatives WHERE project_id=?",
            (project_id,),
        ).fetchone()
        n = int(row["n"]) + 1
        while True:
            ref = f"INIT-{slug}-{n:04d}"
            exists = self.store._conn.execute(
                "SELECT 1 FROM project_initiatives WHERE ref=?", (ref,)
            ).fetchone()
            if not exists:
                return ref
            n += 1

    def initiative_by_ref(self, ref: str) -> Dict[str, Any]:
        r = self.store._conn.execute(
            "SELECT * FROM project_initiatives WHERE ref=?", (ref,)
        ).fetchone()
        if r is None:
            raise ServiceError(f"no such initiative '{ref}'")
        return self._initiative_row(r)

    def _initiative_row(self, r: sqlite3.Row) -> Dict[str, Any]:
        return {
            "id": r["id"],
            "ref": r["ref"],
            "project_id": r["project_id"],
            "title": r["title"],
            "rationale": r["rationale"],
            "expected_outcome": r["expected_outcome"],
            "risk": r["risk"],
            "status": r["status"],
            "approval_state": r["approval_state"],
            "priority": r["priority"],
            "dedupe_key": r["dedupe_key"],
            "source_cycle_id": r["source_cycle_id"],
            "board_slug": r["board_slug"],
            "validation_contract": self.store._uj(r["validation_contract_json"], {}),
            "outcome": self.store._uj(r["outcome_json"], {}),
            "created_at": r["created_at"],
            "completed_at": r["completed_at"],
        }

    def initiatives(self, project_id: str, status: Optional[str] = None) -> List[Dict[str, Any]]:
        self._require_known(project_id)
        sql = "SELECT * FROM project_initiatives WHERE project_id=?"
        args: List[Any] = [project_id]
        if status:
            sql += " AND status=?"
            args.append(status)
        sql += " ORDER BY priority DESC, id ASC"
        rows = self.store._conn.execute(sql, tuple(args)).fetchall()
        return [self._initiative_row(r) for r in rows]

    def decision(self, ref: str, *, project_id: Optional[str] = None) -> Dict[str, Any]:
        """Return one canonical, fingerprinted decision payload."""
        ini = self.initiative_by_ref(ref)
        if project_id is not None and ini["project_id"] != project_id:
            raise ServiceError("initiative does not belong to the requested project")
        evidence = {
            "contract": ini["validation_contract"],
            "links": [],
            "age": ini["created_at"],
        }
        payload = {
            "action": "approve",
            "project_id": ini["project_id"],
            "initiative_ref": ref,
            "title": ini["title"],
            "proposer": ini.get("source_cycle_id") or "stewardship",
            "risk": ini["risk"],
            "reason": ini["rationale"],
            "expected_outcome": ini["expected_outcome"],
            "validation": evidence,
            "authority": {"granted": "approve_and_start_execution",
                          "scope": ["initiative", ref]},
            "revision": self._decision_revision(ref),
        }
        canonical = json.dumps(payload, sort_keys=True, separators=(",", ":"))
        payload["fingerprint"] = hashlib.sha256(canonical.encode()).hexdigest()
        return payload

    def _decision_revision(self, ref: str) -> int:
        row = self.store._conn.execute(
            "SELECT decision_revision FROM project_initiatives WHERE ref=?", (ref,)
        ).fetchone()
        if row is None:
            raise ServiceError(f"no such initiative '{ref}'")
        return int(row["decision_revision"])

    def decision_receipts(self, ref: str) -> List[Dict[str, Any]]:
        self.initiative_by_ref(ref)
        rows = self.store._conn.execute(
            "SELECT * FROM stewardship_decision_receipts WHERE initiative_ref=?"
            " ORDER BY revision ASC", (ref,)
        ).fetchall()
        return [dict(r) for r in rows]

    def _check_decision_fingerprint(self, ref: str, expected: Optional[str]) -> Dict[str, Any]:
        decision = self.decision(ref)
        if expected and expected != decision["fingerprint"]:
            raise ServiceError("stale decision evidence; refresh before deciding")
        return decision

    def _decision_receipt(self, *, ref: str, decision: str, actor: str,
                         interface: str, fingerprint: str, revision: int,
                         reason: str = "", note: str = "") -> None:
        now = iso(self._clock())
        with self.store.tx() as cx:
            cx.execute(
                "INSERT INTO stewardship_decision_receipts(initiative_ref,decision,"
                "actor,interface,reason,note,fingerprint,revision,decided_at)"
                " VALUES(?,?,?,?,?,?,?,?,?)",
                (ref, decision, actor, interface, reason, note, fingerprint,
                 revision, now),
            )
        self.store.audit(actor=actor, interface=interface,
                         action="initiative.decision", subject=ref,
                         detail={"decision": decision, "reason": reason,
                                 "note": note, "fingerprint": fingerprint,
                                 "revision": revision})

    def approve_initiative(self, ref: str, *, actor: str, interface: str,
                           expected_fingerprint: Optional[str] = None,
                           note: str = "") -> Dict[str, Any]:
        ini = self.initiative_by_ref(ref)
        if ini["status"] == InitiativeStatus.APPROVED.value:
            return ini
        decision = self._check_decision_fingerprint(ref, expected_fingerprint)
        if ini["status"] != InitiativeStatus.PENDING_APPROVAL.value:
            raise ServiceError(
                f"initiative {ref} is not pending approval (status={ini['status']})"
            )
        # Status change and receipt commit together (round-2 review issue 2):
        # a receipt write failure rolls back the status change, and the guarded
        # update serialises concurrent decisions inside one immediate tx.
        now = iso(self._clock())
        revision = decision["revision"] + 1
        with self.store.tx() as cx:
            res = cx.execute(
                "UPDATE project_initiatives SET status='approved',"
                " approval_state='approved', decision_revision=decision_revision+1"
                " WHERE ref=? AND status='pending_approval'",
                (ref,),
            )
            if res.rowcount != 1:
                raise ServiceError(f"initiative {ref} changed state concurrently")
            cx.execute(
                "INSERT INTO stewardship_decision_receipts(initiative_ref,decision,"
                "actor,interface,reason,note,fingerprint,revision,decided_at)"
                " VALUES(?,?,?,?,?,?,?,?,?)",
                (ref, "approved", actor, interface, "", note,
                 decision["fingerprint"], revision, now),
            )
        self.store.audit(actor=actor, interface=interface,
                         action="initiative.approved", subject=ref)
        self.store.audit(actor=actor, interface=interface,
                         action="initiative.decision", subject=ref,
                         detail={"decision": "approved", "reason": "",
                                 "note": note, "fingerprint": decision["fingerprint"],
                                 "revision": revision})
        return self.initiative_by_ref(ref)

    def reject_initiative(
        self,
        ref: str,
        *,
        actor: str,
        interface: str,
        suppress_days: Optional[int] = None,
        expected_fingerprint: Optional[str] = None,
        reason: str = "",
        note: str = "",
    ) -> Dict[str, Any]:
        ini = self.initiative_by_ref(ref)
        # Sequential idempotent replay (round-3 R3): repeating the SAME
        # recorded rejection — terminal status already rejected and the
        # submitted fingerprint matches its saved receipt — returns the
        # recorded result without a new receipt or side effect. Changed or
        # conflicting decisions still fall through to the normal guards.
        if ini["status"] == InitiativeStatus.REJECTED.value and expected_fingerprint:
            existing = self.store._conn.execute(
                "SELECT * FROM stewardship_decision_receipts"
                " WHERE initiative_ref=? AND decision='rejected'"
                " AND fingerprint=? ORDER BY revision DESC LIMIT 1",
                (ref, expected_fingerprint),
            ).fetchone()
            if existing is not None:
                return self.initiative_by_ref(ref)
        decision = self._check_decision_fingerprint(ref, expected_fingerprint)
        if not reason.strip():
            if suppress_days is not None:
                reason = "rejected with suppression window"
            else:
                raise ServiceError("rejection reason is required")
        if ini["status"] not in (InitiativeStatus.PENDING_APPROVAL.value, InitiativeStatus.PROPOSED.value):
            raise ServiceError(f"initiative {ref} cannot be rejected from status={ini['status']}")
        days = suppress_days if suppress_days is not None else self.default_suppression_days
        # Legacy/demo imports created before dedupe enforcement may have NULL
        # keys. Reconstruct the same fallback propose_initiative uses so a
        # rejection remains atomic and still suppresses the repeated proposal.
        dedupe_key = ini["dedupe_key"] or ini["title"].strip().lower()[:80] or ref.lower()
        reason_text = reason.strip()
        now = iso(self._clock())
        revision = decision["revision"] + 1
        # Status, revision, receipt (and suppression) commit together; the
        # status guard makes concurrent approve/reject serialise on the first
        # writer, so no contradictory status/receipt pair can survive.
        with self.store.tx() as cx:
            res = cx.execute(
                "UPDATE project_initiatives SET status='rejected',"
                " approval_state='rejected', dedupe_key=?,"
                " decision_revision=decision_revision+1"
                " WHERE ref=? AND status IN ('pending_approval','proposed')",
                (dedupe_key, ref),
            )
            if res.rowcount != 1:
                current = cx.execute(
                    "SELECT status FROM project_initiatives WHERE ref=?", (ref,)
                ).fetchone()
                current_status = current["status"] if current is not None else "missing"
                if current_status == "rejected":
                    return self.initiative_by_ref(ref)
                raise ServiceError(f"initiative {ref} changed state concurrently")
            cx.execute(
                """INSERT INTO stewardship_decision_receipts(initiative_ref,decision,
                actor,interface,reason,note,fingerprint,revision,decided_at)
                VALUES(?,?,?,?,?,?,?,?,?)""",
                (ref, "rejected", actor, interface, reason_text, note,
                 decision["fingerprint"], revision, now),
            )
            cx.execute(
                """
                INSERT INTO initiative_suppression(project_id, dedupe_key,
                    suppressed_until, reason)
                VALUES(?,?,?,?)
                ON CONFLICT(project_id, dedupe_key) DO UPDATE SET
                    suppressed_until=excluded.suppressed_until,
                    reason=excluded.reason
                """,
                (
                    ini["project_id"],
                    dedupe_key,
                    iso(self._clock() + timedelta(days=days)),
                    "rejected",
                ),
            )
        self.store.audit(
            actor=actor, interface=interface, action="initiative.rejected", subject=ref,
            detail={"suppression_days": days},
        )
        self.store.audit(actor=actor, interface=interface,
                         action="initiative.decision", subject=ref,
                         detail={"decision": "rejected", "reason": reason_text,
                                 "note": note, "fingerprint": decision["fingerprint"],
                                 "revision": revision})
        return self.initiative_by_ref(ref)

    def start_execution(self, ref: str) -> Dict[str, Any]:
        ini = self.initiative_by_ref(ref)
        if ini["status"] != InitiativeStatus.APPROVED.value:
            raise ServiceError(f"initiative {ref} is not approved (status={ini['status']})")
        with self.store.tx() as cx:
            cx.execute(
                "UPDATE project_initiatives SET status='executing' WHERE ref=?", (ref,)
            )
        self.store.audit(actor="system", interface="kanban_bridge", action="initiative.execution_started", subject=ref)
        return self.initiative_by_ref(ref)

    def complete_initiative(
        self,
        ref: str,
        *,
        outcome: Dict[str, Any],
        regressed: bool = False,
    ) -> Dict[str, Any]:
        new_status = InitiativeStatus.REGRESSED.value if regressed else InitiativeStatus.COMPLETED.value
        with self.store.tx() as cx:
            cx.execute(
                "UPDATE project_initiatives SET status=?, outcome_json=?, completed_at=?"
                " WHERE ref=?",
                (new_status, self.store._j(outcome), iso(self._clock()), ref),
            )
        self.store.audit(
            actor="system",
            interface="outcome_evaluator",
            action="initiative.completed" if not regressed else "initiative.regressed",
            subject=ref,
            detail=outcome,
        )
        return self.initiative_by_ref(ref)

    def bind_board(self, ref: str, board_slug: str) -> Dict[str, Any]:
        with self.store.tx() as cx:
            cx.execute(
                "UPDATE project_initiatives SET board_slug=? WHERE ref=?", (board_slug, ref)
            )
        return self.initiative_by_ref(ref)

    # ------------------------------------------------------------------ #
    # Knowledge                                                          #
    # ------------------------------------------------------------------ #

    def add_knowledge(
        self,
        project_id: str,
        *,
        type: str,
        statement: str,
        source: str,
        confidence: float = 0.5,
        supersedes_id: Optional[int] = None,
    ) -> int:
        self._require(project_id)
        if type not in ("decision", "finding", "incident"):
            raise ServiceError(f"invalid knowledge type '{type}'")
        with self.store.tx() as cx:
            cur = cx.execute(
                """
                INSERT INTO project_knowledge(project_id, type, statement, source,
                                              confidence, supersedes_id, created_at)
                VALUES(?,?,?,?,?,?,?)
                """,
                (project_id, type, statement, source, confidence, supersedes_id, iso(self._clock())),
            )
        return int(cur.lastrowid)

    def knowledge(self, project_id: str, limit: int = 50) -> List[Dict[str, Any]]:
        rows = self.store._conn.execute(
            "SELECT * FROM project_knowledge WHERE project_id=? ORDER BY id DESC LIMIT ?",
            (project_id, limit),
        ).fetchall()
        return [dict(r) for r in rows]

    # ------------------------------------------------------------------ #
    # Gateway permissions                                                #
    # ------------------------------------------------------------------ #

    def set_gateway_permission(
        self,
        project_id: str,
        *,
        platform: str,
        sender_id: str,
        can_approve: bool = False,
        can_trigger: bool = False,
    ) -> Dict[str, Any]:
        self._require(project_id)
        with self.store.tx() as cx:
            cx.execute(
                """
                INSERT INTO gateway_permissions(project_id, platform, sender_id,
                                                can_approve, can_trigger)
                VALUES(?,?,?,?,?)
                ON CONFLICT(project_id, platform, sender_id) DO UPDATE SET
                    can_approve=excluded.can_approve,
                    can_trigger=excluded.can_trigger
                """,
                (project_id, platform, sender_id, int(can_approve), int(can_trigger)),
            )
        self.store.audit(
            actor="admin",
            interface="gateway",
            action="gateway.permission_set",
            subject=f"{project_id}:{platform}:{sender_id}",
            detail={"can_approve": can_approve, "can_trigger": can_trigger},
        )
        return {"project_id": project_id, "platform": platform, "sender_id": sender_id,
                "can_approve": can_approve, "can_trigger": can_trigger}

    def gateway_permission(
        self, project_id: str, *, platform: str, sender_id: str
    ) -> Dict[str, bool]:
        row = self.store._conn.execute(
            "SELECT can_approve, can_trigger FROM gateway_permissions"
            " WHERE project_id=? AND platform=? AND sender_id=?",
            (project_id, platform, sender_id),
        ).fetchone()
        if row is None:
            return {"can_approve": False, "can_trigger": False}
        return {"can_approve": bool(row["can_approve"]), "can_trigger": bool(row["can_trigger"])}


__all__ = ["StewardshipService", "ServiceError", "FeatureDisabledError"]
