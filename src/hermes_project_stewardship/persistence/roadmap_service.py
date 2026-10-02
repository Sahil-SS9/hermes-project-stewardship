"""Roadmap data contract (Batch R2).

Explicit links between initiatives, milestones and objectives, goal contracts,
and the read model behind the Roadmap tab.

Rules that shape everything here:

* No inferred links. A missing link is shown as "not linked", never guessed
  from titles or shared work.
* Outcome and delivery stay separate. There is no blended score or percentage.
* Unavailable data is "unavailable"/"unknown", never zero.
* The same-project rule cannot be a foreign key, so it is enforced here.
* Every write is audited in the same transaction as the write itself.
"""

from __future__ import annotations

from datetime import date
from typing import Any, Dict, List, Optional

from .service import ServiceError, StewardshipService
from .store import Store, iso

# Levers deliberately NOT built (YAGNI, Sahil's review point): no project
# label column (project_id is shown as-is), no confidence summary, no
# progress percentage. The read model reports what is stored.


class RoadmapNotFound(ServiceError):
    """An id, ref or link does not exist (HTTP 404)."""


class RoadmapConflict(ServiceError):
    """The write would break a link rule (HTTP 409)."""


class RoadmapInvalid(ServiceError):
    """The request itself is malformed (HTTP 409 via ServiceError)."""


MILESTONE_RELATIONSHIPS = ("delivers", "depends_on")
OBJECTIVE_RELATIONSHIPS = ("supports", "measures", "unblocks")
CONTRACT_STATUSES = ("active", "paused", "done", "cleared")
CONTRACT_TEXT_FIELDS = ("verification", "constraints", "boundaries", "stop_when")
CONTRACT_FIELDS = ("outcome",) + CONTRACT_TEXT_FIELDS + (
    "status", "max_turns", "paused_reason")
MAX_TEXT = 2000

# Canonical (already normalised by CanonicalWorkService) status -> bucket.
# Blocked is its own count: the stage before blocking is not stored, so a
# blocked item is never placed in a stage.
BUCKETS = ("planned", "building", "ready_for_review", "complete", "blocked", "unknown")
_STATUS_BUCKET = {
    "backlog": "planned",
    "in_progress": "building",
    "in_review": "ready_for_review",
    "done": "complete",
    "blocked": "blocked",
}

HOST_UNAVAILABLE = {"state": "unavailable", "reason": "host_unavailable"}
ARCHIVED_UNAVAILABLE = {"state": "unavailable", "reason": "archived"}


def bucket_for(status: Any) -> str:
    return _STATUS_BUCKET.get(str(status), "unknown")


def _trim(value: Any, limit: int = 200) -> Any:
    if isinstance(value, str) and len(value) > limit:
        return value[:limit] + "…"
    return value


class RoadmapService:
    def __init__(self, store: Store, stewardship: StewardshipService,
                 canonical_work, *, clock=None) -> None:
        self.store = store
        self.svc = stewardship
        self.work = canonical_work
        self._clock = clock or store._clock

    # ------------------------------------------------------------------ #
    # Shared lookups                                                     #
    # ------------------------------------------------------------------ #

    def _known_project(self, project_id: str) -> None:
        row = self.store._conn.execute(
            "SELECT 1 FROM project_stewardship WHERE project_id=?", (project_id,)
        ).fetchone()
        if row is None:
            raise RoadmapNotFound(f"no such project '{project_id}'")

    def _initiative(self, cx, project_id: str, ref: str):
        row = cx.execute(
            "SELECT ref, project_id, title FROM project_initiatives WHERE ref=?",
            (ref,),
        ).fetchone()
        if row is None:
            raise RoadmapNotFound(f"no such initiative '{ref}'")
        if row["project_id"] != project_id:
            raise RoadmapConflict("cross-project link refused")
        return row

    def _audit_in_tx(self, cx, *, actor: str, interface: str, action: str,
                     subject: str, detail: Dict[str, Any]) -> None:
        cx.execute(
            "INSERT INTO stewardship_audit_log(ts, actor, interface, action,"
            " subject, detail_json) VALUES(?,?,?,?,?,?)",
            (iso(self._clock()), actor, interface, action, subject,
             self.store._j(detail)),
        )

    @staticmethod
    def _check_relationship(value: Any, allowed) -> str:
        if value not in allowed:
            raise RoadmapInvalid(
                f"relationship must be one of {', '.join(allowed)}")
        return value

    # ------------------------------------------------------------------ #
    # Initiative <-> milestone                                           #
    # ------------------------------------------------------------------ #

    def link_initiative_milestone(
        self, project_id: str, ref: str, milestone_id: int,
        relationship: str = "delivers", *, actor: str,
        interface: str = "service",
    ) -> Dict[str, Any]:
        self._known_project(project_id)
        self.svc.require_feature(project_id, "initiatives")
        self.svc.require_feature(project_id, "milestones")
        relationship = self._check_relationship(relationship, MILESTONE_RELATIONSHIPS)
        with self.store.tx() as cx:
            self._initiative(cx, project_id, ref)
            milestone = cx.execute(
                "SELECT id, project_id, archived_at FROM dockyard_milestones WHERE id=?",
                (milestone_id,),
            ).fetchone()
            if milestone is None:
                raise RoadmapNotFound(f"no such milestone '{milestone_id}'")
            if milestone["project_id"] != project_id:
                raise RoadmapConflict("cross-project link refused")
            if milestone["archived_at"] is not None:
                raise RoadmapConflict("milestone is archived; restore it before linking")
            if cx.execute(
                "SELECT 1 FROM initiative_milestones WHERE initiative_ref=? AND milestone_id=?",
                (ref, milestone_id),
            ).fetchone():
                raise RoadmapConflict("initiative and milestone are already linked")
            now = iso(self._clock())
            cx.execute(
                "INSERT INTO initiative_milestones(initiative_ref, milestone_id,"
                " relationship, created_by, created_at) VALUES(?,?,?,?,?)",
                (ref, milestone_id, relationship, actor, now),
            )
            self._audit_in_tx(
                cx, actor=actor, interface=interface, action="roadmap.link.created",
                subject=ref,
                detail={"project_id": project_id, "initiative_ref": ref,
                        "milestone_id": milestone_id, "relationship": relationship})
        return {"initiative_ref": ref, "milestone_id": milestone_id,
                "relationship": relationship, "created_by": actor, "created_at": now}

    def unlink_initiative_milestone(
        self, project_id: str, ref: str, milestone_id: int, *, actor: str,
        interface: str = "service",
    ) -> Dict[str, Any]:
        self._known_project(project_id)
        self.svc.require_feature(project_id, "initiatives")
        self.svc.require_feature(project_id, "milestones")
        with self.store.tx() as cx:
            owner = cx.execute(
                "SELECT project_id FROM project_initiatives WHERE ref=?", (ref,)
            ).fetchone()
            link = cx.execute(
                "SELECT * FROM initiative_milestones WHERE initiative_ref=? AND milestone_id=?",
                (ref, milestone_id),
            ).fetchone()
            if owner is None or owner["project_id"] != project_id or link is None:
                raise RoadmapNotFound("no such link")
            cx.execute(
                "DELETE FROM initiative_milestones WHERE initiative_ref=? AND milestone_id=?",
                (ref, milestone_id),
            )
            self._audit_in_tx(
                cx, actor=actor, interface=interface, action="roadmap.link.removed",
                subject=ref,
                detail={"project_id": project_id, "initiative_ref": ref,
                        "milestone_id": milestone_id,
                        "relationship": link["relationship"]})
        return {"initiative_ref": ref, "milestone_id": milestone_id,
                "relationship": link["relationship"]}

    # ------------------------------------------------------------------ #
    # Objective <-> initiative                                           #
    # ------------------------------------------------------------------ #

    def link_objective_initiative(
        self, project_id: str, objective_id: int, ref: str,
        relationship: str = "supports", *, actor: str,
        interface: str = "service",
    ) -> Dict[str, Any]:
        self._known_project(project_id)
        self.svc.require_feature(project_id, "initiatives")
        relationship = self._check_relationship(relationship, OBJECTIVE_RELATIONSHIPS)
        with self.store.tx() as cx:
            objective = cx.execute(
                "SELECT id, project_id, enabled FROM project_objectives WHERE id=?",
                (objective_id,),
            ).fetchone()
            if objective is None:
                raise RoadmapNotFound(f"no such objective '{objective_id}'")
            if objective["project_id"] != project_id:
                raise RoadmapConflict("cross-project link refused")
            self._initiative(cx, project_id, ref)
            if not objective["enabled"]:
                raise RoadmapConflict("objective is archived; restore it before linking")
            if cx.execute(
                "SELECT 1 FROM project_objective_deliveries"
                " WHERE objective_id=? AND initiative_ref=?",
                (objective_id, ref),
            ).fetchone():
                raise RoadmapConflict("objective and initiative are already linked")
            now = iso(self._clock())
            cx.execute(
                "INSERT INTO project_objective_deliveries(objective_id, initiative_ref,"
                " relationship, created_by, created_at) VALUES(?,?,?,?,?)",
                (objective_id, ref, relationship, actor, now),
            )
            self._audit_in_tx(
                cx, actor=actor, interface=interface, action="roadmap.link.created",
                subject=ref,
                detail={"project_id": project_id, "objective_id": objective_id,
                        "initiative_ref": ref, "relationship": relationship})
        return {"objective_id": objective_id, "initiative_ref": ref,
                "relationship": relationship, "created_by": actor, "created_at": now}

    def unlink_objective_initiative(
        self, project_id: str, objective_id: int, ref: str, *, actor: str,
        interface: str = "service",
    ) -> Dict[str, Any]:
        self._known_project(project_id)
        self.svc.require_feature(project_id, "initiatives")
        with self.store.tx() as cx:
            owner = cx.execute(
                "SELECT project_id FROM project_objectives WHERE id=?", (objective_id,)
            ).fetchone()
            link = cx.execute(
                "SELECT * FROM project_objective_deliveries"
                " WHERE objective_id=? AND initiative_ref=?",
                (objective_id, ref),
            ).fetchone()
            if owner is None or owner["project_id"] != project_id or link is None:
                raise RoadmapNotFound("no such link")
            cx.execute(
                "DELETE FROM project_objective_deliveries"
                " WHERE objective_id=? AND initiative_ref=?",
                (objective_id, ref),
            )
            self._audit_in_tx(
                cx, actor=actor, interface=interface, action="roadmap.link.removed",
                subject=ref,
                detail={"project_id": project_id, "objective_id": objective_id,
                        "initiative_ref": ref, "relationship": link["relationship"]})
        return {"objective_id": objective_id, "initiative_ref": ref,
                "relationship": link["relationship"]}

    # ------------------------------------------------------------------ #
    # Goal contracts                                                     #
    # ------------------------------------------------------------------ #

    @staticmethod
    def _contract_dict(row) -> Dict[str, Any]:
        return {
            "goal_id": row["goal_id"], "project_id": row["project_id"],
            "outcome": row["outcome"], "verification": row["verification"],
            "constraints": row["constraints"], "boundaries": row["boundaries"],
            "stop_when": row["stop_when"], "status": row["status"],
            "max_turns": row["max_turns"], "paused_reason": row["paused_reason"],
            "updated_at": row["updated_at"],
        }

    def _contract_row(self, cx, project_id: str, goal_id: str):
        row = cx.execute(
            "SELECT c.*, g.project_id AS project_id FROM project_goal_contracts c"
            " JOIN project_goals g ON g.goal_id = c.goal_id"
            " WHERE c.goal_id=? AND g.project_id=?",
            (goal_id, project_id),
        ).fetchone()
        if row is None:
            raise RoadmapNotFound(f"no such goal contract '{goal_id}'")
        return row

    def goal_contract(self, project_id: str, goal_id: str) -> Dict[str, Any]:
        self._known_project(project_id)
        return self._contract_dict(self._contract_row(self.store._conn, project_id, goal_id))

    def update_goal_contract(
        self, project_id: str, goal_id: str, fields: Dict[str, Any], *,
        actor: str, interface: str = "service",
    ) -> Dict[str, Any]:
        self._known_project(project_id)
        if not isinstance(fields, dict) or not fields:
            raise RoadmapInvalid("contract update must be a non-empty object")
        unknown = sorted(set(fields) - set(CONTRACT_FIELDS))
        if unknown:
            raise RoadmapInvalid(f"unknown contract fields: {', '.join(unknown)}")
        with self.store.tx() as cx:
            current = self._contract_row(cx, project_id, goal_id)
            merged = {name: current[name] for name in CONTRACT_FIELDS}
            for name, value in fields.items():
                if name == "outcome":
                    if not isinstance(value, str) or not value.strip():
                        raise RoadmapInvalid("outcome must be non-empty text")
                    value = value.strip()
                if name in CONTRACT_TEXT_FIELDS or name == "outcome":
                    if not isinstance(value, str):
                        raise RoadmapInvalid(f"{name} must be text")
                    if len(value) > MAX_TEXT:
                        raise RoadmapInvalid(f"{name} must be at most {MAX_TEXT} characters")
                elif name == "status":
                    if value not in CONTRACT_STATUSES:
                        raise RoadmapInvalid(
                            f"status must be one of {', '.join(CONTRACT_STATUSES)}")
                elif name == "max_turns":
                    if isinstance(value, bool) or not isinstance(value, int) or value < 1:
                        raise RoadmapInvalid("max_turns must be a whole number of at least 1")
                elif name == "paused_reason":
                    if value is not None and not isinstance(value, str):
                        raise RoadmapInvalid("paused_reason must be text or null")
                    if isinstance(value, str) and len(value) > MAX_TEXT:
                        raise RoadmapInvalid(
                            f"paused_reason must be at most {MAX_TEXT} characters")
                    value = (value.strip() or None) if isinstance(value, str) else None
                merged[name] = value
            if merged["status"] != "paused":
                if fields.get("paused_reason"):
                    raise RoadmapInvalid("paused_reason is only valid while status is 'paused'")
                merged["paused_reason"] = None
            changes = {name: [_trim(current[name]), _trim(merged[name])]
                       for name in CONTRACT_FIELDS if merged[name] != current[name]}
            if not changes:
                return self._contract_dict(current)
            now = iso(self._clock())
            cx.execute(
                "UPDATE project_goal_contracts SET outcome=?, verification=?,"
                " constraints=?, boundaries=?, stop_when=?, status=?, max_turns=?,"
                " paused_reason=?, updated_at=? WHERE goal_id=?",
                (merged["outcome"], merged["verification"], merged["constraints"],
                 merged["boundaries"], merged["stop_when"], merged["status"],
                 merged["max_turns"], merged["paused_reason"], now, goal_id),
            )
            self._audit_in_tx(
                cx, actor=actor, interface=interface, action="goal.contract.updated",
                subject=goal_id,
                detail={"project_id": project_id, "changes": changes})
            return self._contract_dict(self._contract_row(cx, project_id, goal_id))

    # ------------------------------------------------------------------ #
    # Read model                                                         #
    # ------------------------------------------------------------------ #

    def roadmap(self, project_id: Optional[str] = None) -> Dict[str, Any]:
        if project_id is not None:
            self._known_project(project_id)
            ids = [project_id]
        else:
            ids = [r["project_id"] for r in self.store._conn.execute(
                "SELECT project_id FROM project_stewardship"
                " WHERE enabled=1 AND archived_at IS NULL ORDER BY project_id")]
        return {"projects": [self._project(pid) for pid in ids]}

    def _load_work(self, project_id: str):
        """One canonical list call per project. ``None`` means the host failed."""
        try:
            items = self.work.list(project_id)
        except Exception:  # noqa: BLE001 - any host failure is "unavailable"
            return None
        return {str(item["ref"]): item for item in items}

    @staticmethod
    def _delivery(refs, work, *, archived: bool = False) -> Dict[str, Any]:
        if archived:
            return dict(ARCHIVED_UNAVAILABLE)
        if work is None:
            return dict(HOST_UNAVAILABLE)
        refs = list(dict.fromkeys(refs))
        if not refs:
            return {"state": "no_linked_work"}
        counts = {name: 0 for name in BUCKETS}
        for ref in refs:
            item = work.get(ref)
            counts[bucket_for(item["status"]) if item is not None else "unknown"] += 1
        return {"state": "ok", **counts, "total": len(refs)}

    def _objective_outcome(self, project_id: str, objective: Dict[str, Any],
                           cache: Dict[int, Dict[str, Any]]) -> Dict[str, Any]:
        oid = objective["id"]
        if oid in cache:
            return cache[oid]
        if not objective["enabled"]:
            out = {"state": "not_applicable", "evaluated_at": None,
                   "window": objective["window"]}
        else:
            try:
                evidence = self.svc.objective_evidence(project_id, oid)
                history = evidence.get("history") or []
                out = {"state": evidence.get("state", "unknown"),
                       "evaluated_at": history[0].get("recorded_at") if history else None,
                       "window": evidence.get("window", objective["window"])}
            except Exception:  # noqa: BLE001 - evaluator error is "unknown"
                out = {"state": "unknown", "evaluated_at": None,
                       "window": objective["window"]}
        cache[oid] = out
        return out

    @staticmethod
    def _goal_state(states: List[str]) -> Dict[str, Any]:
        if not states:
            return {"state": "unproven", "objectives_linked": 0, "objectives_passed": None}
        known = all(s in ("passed", "failed") for s in states)
        passed = sum(1 for s in states if s == "passed")
        if "failed" in states:
            state = "at_risk"
        elif not known:
            state = "unknown"
        else:
            state = "met"
        return {"state": state, "objectives_linked": len(states),
                "objectives_passed": passed if known else None}

    def _project(self, project_id: str) -> Dict[str, Any]:
        cx = self.store._conn
        now = self._clock().date()
        settings = self.svc.settings(project_id, include_disabled=True)
        features = settings["features"]
        want_initiatives = bool(features.get("initiatives", True))
        want_milestones = bool(features.get("milestones", True))
        work = self._load_work(project_id)

        objectives = {int(r["id"]): dict(r) for r in cx.execute(
            "SELECT id, name, enabled, window FROM project_objectives"
            " WHERE project_id=? ORDER BY id", (project_id,))}
        for obj in objectives.values():
            obj["enabled"] = bool(obj["enabled"])
        outcome_cache: Dict[int, Dict[str, Any]] = {}

        # ---- goals ----------------------------------------------------
        goal_rows = {r["goal_id"]: dict(r) for r in cx.execute(
            "SELECT goal_id, title, archived_at FROM project_goals WHERE project_id=?"
            " ORDER BY position, created_at, goal_id", (project_id,))}
        goal_objectives: Dict[str, List[int]] = {}
        objective_goal: Dict[int, str] = {}
        for r in cx.execute(
            "SELECT og.objective_id, og.goal_id FROM project_objective_goals og"
            " JOIN project_goals g ON g.goal_id=og.goal_id WHERE g.project_id=?"
            " ORDER BY og.objective_id", (project_id,)):
            goal_objectives.setdefault(r["goal_id"], []).append(int(r["objective_id"]))
            objective_goal[int(r["objective_id"])] = r["goal_id"]

        def goal_summary(goal_id: str) -> Dict[str, Any]:
            states = [self._objective_outcome(project_id, objectives[o], outcome_cache)["state"]
                      for o in goal_objectives.get(goal_id, [])
                      if o in objectives and objectives[o]["enabled"]]
            return self._goal_state(states)

        goals = [{"id": gid, "title": g["title"], **goal_summary(gid)}
                 for gid, g in goal_rows.items() if g["archived_at"] is None]

        def objective_goal_context(oid: int) -> Optional[Dict[str, Any]]:
            gid = objective_goal.get(oid)
            if gid is None:
                return None
            goal = goal_rows[gid]
            if goal["archived_at"] is not None:
                return {"id": gid, "title": goal["title"], "state": "unknown",
                        "unavailable": "archived"}
            return {"id": gid, "title": goal["title"], "state": goal_summary(gid)["state"]}

        def objective_entry(oid: int, relationship: Optional[str]) -> Dict[str, Any]:
            obj = objectives[oid]
            return {
                "id": oid, "name": obj["name"], "relationship": relationship,
                "enabled": obj["enabled"],
                "unavailable": None if obj["enabled"] else "archived",
                "outcome": self._objective_outcome(project_id, obj, outcome_cache),
                "goal": objective_goal_context(oid),
            }

        # ---- milestones ------------------------------------------------
        milestones = {int(r["id"]): dict(r) for r in cx.execute(
            "SELECT id, name, due, closed_at, archived_at FROM dockyard_milestones"
            " WHERE project_id=? ORDER BY id", (project_id,))}
        milestone_refs: Dict[int, List[str]] = {}
        for r in cx.execute(
            "SELECT mi.milestone_id, mi.item_ref FROM dockyard_milestone_items mi"
            " JOIN dockyard_milestones m ON m.id=mi.milestone_id"
            " WHERE m.project_id=? ORDER BY mi.item_ref", (project_id,)):
            milestone_refs.setdefault(int(r["milestone_id"]), []).append(str(r["item_ref"]))

        def overdue(ms: Dict[str, Any]) -> bool:
            if not ms["due"] or ms["closed_at"] or ms["archived_at"]:
                return False
            try:
                return date.fromisoformat(str(ms["due"])[:10]) < now
            except ValueError:
                return False

        # ---- initiatives, edges ---------------------------------------
        initiatives = self.svc.initiatives(project_id) if want_initiatives else []
        ini_title = {i["ref"]: i["title"] for i in initiatives}
        ms_edges: Dict[str, List[Dict[str, Any]]] = {}
        under: Dict[int, List[str]] = {}
        for r in cx.execute(
            "SELECT im.* FROM initiative_milestones im JOIN project_initiatives i"
            " ON i.ref=im.initiative_ref WHERE i.project_id=?"
            " ORDER BY im.created_at, im.milestone_id", (project_id,)):
            ms_edges.setdefault(r["initiative_ref"], []).append(dict(r))
            under.setdefault(int(r["milestone_id"]), []).append(r["initiative_ref"])
        obj_edges: Dict[str, List[Dict[str, Any]]] = {}
        linked_objectives = set()
        for r in cx.execute(
            "SELECT d.* FROM project_objective_deliveries d JOIN project_initiatives i"
            " ON i.ref=d.initiative_ref WHERE i.project_id=?"
            " ORDER BY d.objective_id", (project_id,)):
            obj_edges.setdefault(r["initiative_ref"], []).append(dict(r))
            linked_objectives.add(int(r["objective_id"]))
        bound: Dict[str, List[str]] = {}
        if work is not None:
            for ref, item in work.items():
                if item.get("initiative_ref"):
                    bound.setdefault(item["initiative_ref"], []).append(ref)

        def milestone_entry(mid: int, relationship: Optional[str],
                            current_ref: Optional[str]) -> Dict[str, Any]:
            ms = milestones[mid]
            archived = ms["archived_at"] is not None
            return {
                "id": mid, "name": ms["name"], "relationship": relationship,
                "due": ms["due"], "closed": bool(ms["closed_at"]),
                "archived": archived, "overdue": overdue(ms),
                "unavailable": "archived" if archived else None,
                "delivery": self._delivery(milestone_refs.get(mid, []), work, archived=archived),
                "also_under": [{"ref": other, "title": ini_title.get(other, other)}
                               for other in under.get(mid, []) if other != current_ref],
            }

        initiative_rows: List[Dict[str, Any]] = []
        project_reasons: set = set()
        for ini in initiatives:
            ref = ini["ref"]
            reasons: List[str] = []
            if ini["status"] == "pending_approval":
                reasons.append("pending_approval")

            ms_rows = []
            visible_refs: List[str] = []
            if want_milestones:
                for edge in ms_edges.get(ref, []):
                    mid = int(edge["milestone_id"])
                    if mid not in milestones:
                        continue
                    row = milestone_entry(mid, edge["relationship"], ref)
                    ms_rows.append(row)
                    if not row["archived"]:
                        visible_refs.extend(milestone_refs.get(mid, []))
                    if row["overdue"]:
                        reasons.append("milestone_overdue")
                if not ms_edges.get(ref):
                    reasons.append("no_milestone_link")

            union = list(dict.fromkeys([*bound.get(ref, []), *visible_refs]))
            delivery = self._delivery(union, work)
            visible = set(visible_refs)
            loose = [r for r in dict.fromkeys(bound.get(ref, [])) if r not in visible]
            if work is None:
                unmilestoned = {"state": "unavailable", "count": None, "items": []}
            else:
                unmilestoned = {"state": "ok", "count": len(loose), "items": [
                    {"ref": r, "title": work[r].get("title") or r,
                     "status": work[r]["status"], "bucket": bucket_for(work[r]["status"])}
                    for r in loose]}
            if delivery.get("state") == "ok" and delivery["blocked"] > 0:
                reasons.append("blocked_items")

            obj_rows = []
            for edge in obj_edges.get(ref, []):
                oid = int(edge["objective_id"])
                if oid not in objectives:
                    continue
                row = objective_entry(oid, edge["relationship"])
                obj_rows.append(row)
                if row["enabled"]:
                    code = {"failed": "objective_failed", "stale": "objective_stale",
                            "unknown": "objective_unknown"}.get(row["outcome"]["state"])
                    if code:
                        reasons.append(code)
            if not obj_edges.get(ref):
                reasons.append("no_objective_link")

            reasons = list(dict.fromkeys(reasons))
            project_reasons.update(reasons)
            initiative_rows.append({
                "ref": ref, "title": ini["title"], "governance": ini["status"],
                "approval_state": ini.get("approval_state"),
                "attention": bool(reasons), "attention_reasons": reasons,
                "delivery": delivery, "milestones": ms_rows,
                "unmilestoned_work": unmilestoned, "objectives": obj_rows,
            })

        # ---- explicit "not linked" groups -----------------------------
        unlinked = {"milestones": [], "objectives": []}
        if want_initiatives:
            if want_milestones:
                linked_ms = {int(r["milestone_id"]) for rows in ms_edges.values() for r in rows}
                for mid, ms in milestones.items():
                    if mid in linked_ms or ms["archived_at"] is not None:
                        continue
                    row = milestone_entry(mid, None, None)
                    unlinked["milestones"].append(row)
                    if row["overdue"]:
                        project_reasons.add("milestone_overdue")
            for oid, obj in objectives.items():
                if oid in linked_objectives or not obj["enabled"]:
                    continue
                row = objective_entry(oid, None)
                unlinked["objectives"].append(row)
                code = {"failed": "objective_failed", "stale": "objective_stale",
                        "unknown": "objective_unknown"}.get(row["outcome"]["state"])
                if code:
                    project_reasons.add(code)

        reasons_out = sorted(project_reasons)
        return {
            "id": project_id, "label": project_id, "mission": settings["mission"],
            "enabled": settings["enabled"],
            "features": {"initiatives": want_initiatives, "milestones": want_milestones},
            "work_host": "ok" if work is not None else "unavailable",
            "initiatives": initiative_rows, "goals": goals, "unlinked": unlinked,
            "attention": bool(reasons_out), "attention_reasons": reasons_out,
        }

    # ------------------------------------------------------------------ #
    # Milestone items (loaded when a milestone is opened)                #
    # ------------------------------------------------------------------ #

    def milestone_items(self, project_id: str, milestone_id: int) -> Dict[str, Any]:
        self._known_project(project_id)
        self.svc.require_feature(project_id, "milestones")
        cx = self.store._conn
        ms = cx.execute(
            "SELECT id, name, due, closed_at, archived_at FROM dockyard_milestones"
            " WHERE id=? AND project_id=?", (milestone_id, project_id)).fetchone()
        if ms is None:
            raise RoadmapNotFound(f"no such milestone '{milestone_id}'")
        refs = [str(r["item_ref"]) for r in cx.execute(
            "SELECT item_ref FROM dockyard_milestone_items WHERE milestone_id=?"
            " ORDER BY item_ref", (milestone_id,))]
        head = {"id": ms["id"], "name": ms["name"], "due": ms["due"],
                "closed": bool(ms["closed_at"]), "archived": ms["archived_at"] is not None}
        work = self._load_work(project_id)
        if work is None:
            return {"state": "unavailable", "milestone": head, "items": [],
                    "delivery": dict(HOST_UNAVAILABLE)}
        items = []
        for ref in refs:
            item = work.get(ref)
            if item is None:
                items.append({"ref": ref, "title": ref, "status": None,
                              "bucket": "unknown", "blockers": []})
                continue
            blockers: Optional[List[str]] = []
            if bucket_for(item["status"]) != "complete":
                try:
                    links = self.work.port.list_work_links(project_id, ref)
                    blockers = [
                        link["task_id"] for link in links
                        if link.get("direction") == "parent"
                        and (work.get(link["task_id"]) or {}).get("status") != "done"]
                except Exception:  # noqa: BLE001 - blocker detail is best effort
                    blockers = None
            items.append({"ref": ref, "title": item.get("title") or ref,
                          "status": item["status"], "bucket": bucket_for(item["status"]),
                          "blockers": blockers})
        return {"state": "ok", "milestone": head, "items": items,
                "delivery": self._delivery(refs, work, archived=head["archived"])}
