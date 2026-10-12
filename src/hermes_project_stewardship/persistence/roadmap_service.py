"""Read model for the strict delivery ladder.

The Roadmap reads only the v42 chain:
Task -> Goal -> Objective -> Milestone -> Initiative. Old v0.4 link tables are
preserved for downgrade history but are never read or written here.
"""
from __future__ import annotations

from datetime import date, datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

from ..kanban.host_adapter import MISSING_LINK_CODES, KanbanAdapterError
from .ladder_state import goal_state, initiative_ready, milestone_state, objective_state
from .service import ServiceError, StewardshipService
from .store import Store, iso


class RoadmapNotFound(ServiceError):
    """An id or ref does not exist (HTTP 404)."""


class RoadmapConflict(ServiceError):
    """The write would break a ladder rule (HTTP 409)."""


class RoadmapInvalid(ServiceError):
    """The request is malformed (HTTP 409 via ServiceError)."""


CONTRACT_STATUSES = ("active", "paused", "done", "cleared")
CONTRACT_TEXT_FIELDS = ("verification", "constraints", "boundaries", "stop_when")
CONTRACT_FIELDS = ("outcome",) + CONTRACT_TEXT_FIELDS + (
    "status", "max_turns", "paused_reason")
MAX_TEXT = 2000
BUCKETS = ("planned", "building", "ready_for_review", "complete", "blocked", "unknown")
_STATUS_BUCKET = {
    "backlog": "planned",
    "in_progress": "building",
    "in_review": "ready_for_review",
    "done": "complete",
    "blocked": "blocked",
}


def bucket_for(status: Any) -> str:
    return _STATUS_BUCKET.get(str(status), "unknown")


def _trim(value: Any, limit: int = 200) -> Any:
    if isinstance(value, str) and len(value) > limit:
        return value[:limit] + "…"
    return value


def _parse_time(value: Any) -> Optional[datetime]:
    if not value:
        return None
    try:
        parsed = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
    except ValueError:
        return None
    return parsed if parsed.utcoffset() is not None else None


class RoadmapService:
    def __init__(self, store: Store, stewardship: StewardshipService,
                 canonical_work, *, clock=None) -> None:
        self.store = store
        self.svc = stewardship
        self.work = canonical_work
        self._clock = clock or store._clock

    def _known_project(self, project_id: str, *, visible: bool = False) -> None:
        sql = "SELECT archived_at FROM project_stewardship WHERE project_id=?"
        row = self.store._conn.execute(sql, (project_id,)).fetchone()
        if row is None or (visible and row["archived_at"] is not None):
            raise RoadmapNotFound(f"no such project '{project_id}'")

    def _load_work(self, project_id: str):
        try:
            items = self.work.list(project_id)
        except KanbanAdapterError as exc:
            return None, ("unlinked" if exc.code in MISSING_LINK_CODES else "host_unavailable")
        except Exception:  # noqa: BLE001 - any host failure is represented, never zeroed
            return None, "host_unavailable"
        return {str(item["ref"]): item for item in items}, None

    @staticmethod
    def _delivery(refs, work, *, unreadable: Optional[str] = None) -> Dict[str, Any]:
        if work is None:
            return {"state": "unavailable", "reason": unreadable or "host_unavailable"}
        refs = list(dict.fromkeys(refs))
        if not refs:
            return {"state": "no_linked_work"}
        counts = {name: 0 for name in BUCKETS}
        for ref in refs:
            item = work.get(ref)
            counts[bucket_for(item["status"]) if item is not None else "unknown"] += 1
        return {"state": "ok", **counts, "total": len(refs)}

    # Goal contracts remain part of the Roadmap editing surface.
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
            " JOIN project_goals g ON g.goal_id=c.goal_id"
            " WHERE c.goal_id=? AND g.project_id=?",
            (goal_id, project_id),
        ).fetchone()
        if row is None:
            raise RoadmapNotFound(f"no such goal contract '{goal_id}'")
        return row

    def goal_contract(self, project_id: str, goal_id: str) -> Dict[str, Any]:
        self._known_project(project_id)
        return self._contract_dict(self._contract_row(self.store._conn, project_id, goal_id))

    def update_goal_contract(self, project_id: str, goal_id: str,
                             fields: Dict[str, Any], *, actor: str,
                             interface: str = "service") -> Dict[str, Any]:
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
                    if not isinstance(value, str) or len(value) > MAX_TEXT:
                        raise RoadmapInvalid(f"{name} must be text of at most {MAX_TEXT} characters")
                elif name == "status":
                    if value not in CONTRACT_STATUSES:
                        raise RoadmapInvalid(f"status must be one of {', '.join(CONTRACT_STATUSES)}")
                elif name == "max_turns":
                    if isinstance(value, bool) or not isinstance(value, int) or value < 1:
                        raise RoadmapInvalid("max_turns must be a whole number of at least 1")
                elif name == "paused_reason":
                    if value is not None and not isinstance(value, str):
                        raise RoadmapInvalid("paused_reason must be text or null")
                    if isinstance(value, str) and len(value) > MAX_TEXT:
                        raise RoadmapInvalid(f"paused_reason must be at most {MAX_TEXT} characters")
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
                "UPDATE project_goal_contracts SET outcome=?,verification=?,constraints=?,"
                " boundaries=?,stop_when=?,status=?,max_turns=?,paused_reason=?,updated_at=?"
                " WHERE goal_id=?",
                (merged["outcome"], merged["verification"], merged["constraints"],
                 merged["boundaries"], merged["stop_when"], merged["status"],
                 merged["max_turns"], merged["paused_reason"], now, goal_id),
            )
            cx.execute(
                "INSERT INTO stewardship_audit_log(ts,actor,interface,action,subject,detail_json)"
                " VALUES(?,?,?,?,?,?)",
                (now, actor, interface, "goal.contract.updated", goal_id,
                 self.store._j({"project_id": project_id, "changes": changes})),
            )
            return self._contract_dict(self._contract_row(cx, project_id, goal_id))

    def _objective_check(self, project_id: str, objective: Dict[str, Any]) -> Dict[str, Any]:
        if not objective["enabled"]:
            return {"state": "not_applicable", "evaluated_at": None,
                    "window": objective["window"]}
        try:
            evidence = self.svc.objective_evidence(project_id, int(objective["id"]))
        except Exception:  # noqa: BLE001 - evaluator/read errors are unknown
            return {"state": "unknown", "evaluated_at": None,
                    "window": objective["window"]}
        history = evidence.get("history") or []
        return {"state": evidence.get("state", "unknown"),
                "evaluated_at": history[0].get("recorded_at") if history else None,
                "window": evidence.get("window", objective["window"])}

    def _goal_check(self, goal_id: str) -> Dict[str, Any]:
        check = self.store._conn.execute(
            "SELECT * FROM goal_checks WHERE goal_id=?", (goal_id,)).fetchone()
        if check is None:
            return {"state": "no_check", "evaluated_at": None, "window": None}
        sample = self.store._conn.execute(
            "SELECT * FROM goal_check_evaluations WHERE goal_id=?"
            " ORDER BY recorded_at DESC,id DESC LIMIT 1", (goal_id,)).fetchone()
        if sample is None:
            return {"state": "unknown", "evaluated_at": None, "window": check["window"]}
        now = self._clock()
        recorded = _parse_time(sample["recorded_at"])
        expiry = _parse_time(sample["expires_at"])
        try:
            days = int(str(check["window"])[:-1])
        except (TypeError, ValueError):
            days = 0
        if recorded is None or days < 1:
            state = "unknown"
        elif expiry is not None and expiry <= now:
            state = "stale"
        elif recorded < now - timedelta(days=days):
            state = "stale"
        else:
            state = str(sample["state"] or ("passed" if sample["passed"] else "failed"))
        return {"state": state, "evaluated_at": sample["recorded_at"],
                "window": check["window"], "type": check["evaluator_type"]}

    def roadmap(self, project_id: Optional[str] = None) -> Dict[str, Any]:
        cx = self.store._conn
        if project_id is not None:
            self._known_project(project_id, visible=True)
            ids = [project_id]
        else:
            ids = [r["project_id"] for r in cx.execute(
                "SELECT project_id FROM project_stewardship"
                " WHERE enabled=1 AND archived_at IS NULL ORDER BY project_id")]
        return {"projects": [self._project(pid) for pid in ids]}

    def _project(self, project_id: str) -> Dict[str, Any]:
        cx = self.store._conn
        settings = self.svc.settings(project_id, include_disabled=True)
        work, unreadable = self._load_work(project_id)
        work = work if work is None else dict(work)
        # A switched-off level is hidden everywhere, never deleted: the data
        # comes back exactly when the feature is switched on again.
        want_initiatives = bool(settings["features"].get("initiatives", True))
        want_milestones = bool(settings["features"].get("milestones", True))

        task_links: Dict[str, List[str]] = {}
        linked_refs = set()
        for row in cx.execute(
            "SELECT gt.goal_id,gt.item_ref FROM goal_tasks gt"
            " JOIN project_goals g ON g.goal_id=gt.goal_id"
            " WHERE gt.project_id=? AND g.archived_at IS NULL ORDER BY gt.created_at,gt.item_ref",
            (project_id,),
        ):
            task_links.setdefault(row["goal_id"], []).append(str(row["item_ref"]))
            linked_refs.add(str(row["item_ref"]))

        goals_by_objective: Dict[int, List[Dict[str, Any]]] = {}
        flat_goals: List[Dict[str, Any]] = []
        for row in cx.execute(
            "SELECT * FROM project_goals WHERE project_id=? AND archived_at IS NULL"
            " ORDER BY position,created_at,goal_id", (project_id,)):
            gid = row["goal_id"]
            refs = task_links.get(gid, [])
            tasks = []
            buckets: Optional[List[str]] = None if work is None and refs else []
            if work is not None:
                assert buckets is not None
                for ref in refs:
                    item = work.get(ref)
                    bucket = bucket_for(item["status"]) if item is not None else "unknown"
                    buckets.append(bucket)
                    tasks.append({"ref": ref, "title": (item or {}).get("title") or ref,
                                  "status": (item or {}).get("status"), "bucket": bucket})
            check = self._goal_check(gid)
            state = goal_state(buckets, None if check["state"] == "no_check" else check["state"])
            entry = {"id": gid, "title": row["title"], "description": row["description"],
                     "state": state, "check": check, "tasks": tasks,
                     "task_count": len(refs), "objective_id": row["objective_id"],
                     "delivery": self._delivery(refs, work, unreadable=unreadable)}
            flat_goals.append(entry)
            if row["objective_id"] is not None:
                goals_by_objective.setdefault(int(row["objective_id"]), []).append(entry)

        objectives_by_milestone: Dict[int, List[Dict[str, Any]]] = {}
        flat_objectives: List[Dict[str, Any]] = []
        for row in cx.execute(
            "SELECT * FROM project_objectives WHERE project_id=? AND enabled=1 ORDER BY id",
            (project_id,),
        ):
            raw = dict(row)
            children = goals_by_objective.get(int(row["id"]), [])
            check = self._objective_check(project_id, raw)
            state = objective_state(
                [child["state"] for child in children],
                None if check["state"] == "not_applicable" else check["state"],
            )
            entry = {"id": int(row["id"]), "name": row["name"], "state": state,
                     "check": check, "goals": children, "milestone_id": row["milestone_id"]}
            flat_objectives.append(entry)
            if row["milestone_id"] is not None:
                objectives_by_milestone.setdefault(int(row["milestone_id"]), []).append(entry)

        milestones_by_initiative: Dict[str, List[Dict[str, Any]]] = {}
        flat_milestones: List[Dict[str, Any]] = []
        today = self._clock().date()
        milestone_rows = cx.execute(
            "SELECT * FROM dockyard_milestones WHERE project_id=? AND archived_at IS NULL ORDER BY id",
            (project_id,)).fetchall() if want_milestones else []
        for row in milestone_rows:
            children = objectives_by_milestone.get(int(row["id"]), [])
            state = milestone_state([child["state"] for child in children])
            try:
                overdue = bool(row["due"] and not row["closed_at"]
                               and date.fromisoformat(str(row["due"])[:10]) < today)
            except ValueError:
                overdue = False
            refs = [task["ref"] for obj in children for goal in obj["goals"]
                    for task in goal["tasks"]]
            entry = {"id": int(row["id"]), "name": row["name"], "state": state,
                     "due": row["due"], "overdue": overdue, "closed": bool(row["closed_at"]),
                     "initiative_ref": row["initiative_ref"], "objectives": children,
                     "delivery": self._delivery(refs, work, unreadable=unreadable)}
            flat_milestones.append(entry)
            if row["initiative_ref"]:
                milestones_by_initiative.setdefault(row["initiative_ref"], []).append(entry)

        initiatives_by_ref = {}
        if want_initiatives:
            initiatives_by_ref = {i["ref"]: i for i in self.svc.initiatives(project_id)}

        initiative_rows = []
        project_reasons: set = set()
        initiative_refs: set = set()
        for ini in initiatives_by_ref.values():
            ref = ini["ref"]
            initiative_refs.add(ref)
            children = milestones_by_initiative.get(ref, [])
            ready = initiative_ready(ini["status"], [child["state"] for child in children])
            loose = []
            if work is not None:
                loose = [
                    {"ref": item_ref, "title": item.get("title") or item_ref,
                     "status": item.get("status"), "bucket": bucket_for(item.get("status"))}
                    for item_ref, item in work.items()
                    if item.get("initiative_ref") == ref and item_ref not in linked_refs
                ]
            refs = [task["ref"] for ms in children for obj in ms["objectives"]
                    for goal in obj["goals"] for task in goal["tasks"]]
            refs.extend(item["ref"] for item in loose)
            delivery = self._delivery(refs, work, unreadable=unreadable)

            # Attention: the 0.4.0 read model raised these codes per initiative
            # and the project roll-up used them; L4's notifications read them.
            # Re-expressed for the ladder, and nothing is invented.
            reasons: List[str] = []
            if ini["status"] == "pending_approval":
                reasons.append("pending_approval")
            if not children:
                reasons.append("no_milestone_link")
            for child in children:
                if child["overdue"]:
                    reasons.append("milestone_overdue")
            if delivery.get("state") == "ok" and delivery.get("blocked", 0) > 0:
                reasons.append("blocked_items")
            objective_states = [obj["state"] for ms in children for obj in ms["objectives"]]
            if not objective_states:
                reasons.append("no_objective_link")
            for code, state in (("objective_at_risk", "at_risk"),
                                ("objective_unknown", "unknown")):
                if state in objective_states:
                    reasons.append(code)
            reasons = list(dict.fromkeys(reasons))
            project_reasons.update(reasons)

            initiative_rows.append({
                "ref": ref, "title": ini["title"], "governance": ini["status"],
                "approval_state": ini.get("approval_state"),
                "state": "ready_to_confirm" if ready else ini["status"],
                "ready_to_confirm": ready, "milestones": children,
                "attention": bool(reasons), "attention_reasons": reasons,
                "delivery": delivery,
                "not_placed": {"tasks": loose},
            })

        unplaced_tasks = []
        if work is not None:
            unplaced_tasks = [
                {"ref": ref, "title": item.get("title") or ref,
                 "status": item.get("status"), "bucket": bucket_for(item.get("status"))}
                for ref, item in work.items()
                if ref not in linked_refs and item.get("initiative_ref") not in initiative_refs
            ]
        needs_rows = [dict(row) for row in cx.execute(
            "SELECT * FROM roadmap_unplaced WHERE project_id=? AND resolved_at IS NULL"
            " ORDER BY created_at,id", (project_id,))]
        for item in needs_rows:
            item["old_links"] = self.store._uj(item.pop("old_links_json"), [])

        return {
            "id": project_id, "label": project_id, "mission": settings["mission"],
            "enabled": settings["enabled"],
            "features": {"initiatives": bool(settings["features"].get("initiatives", True)),
                         "milestones": bool(settings["features"].get("milestones", True))},
            "work_host": "ok" if work is not None else (
                "unlinked" if unreadable == "unlinked" else "unavailable"),
            "initiatives": initiative_rows, "goals": flat_goals,
            "objectives": flat_objectives, "milestones": flat_milestones,
            "not_placed": {
                "milestones": [m for m in flat_milestones if m["initiative_ref"] is None],
                "objectives": [o for o in flat_objectives if o["milestone_id"] is None],
                "goals": [g for g in flat_goals if g["objective_id"] is None],
                "tasks": unplaced_tasks,
            },
            "needs_placing": needs_rows,
            "attention": bool(project_reasons),
            "attention_reasons": sorted(project_reasons),
        }

    def initiative_state(self, project_id: str, ref: str) -> Dict[str, Any]:
        project = self._project(project_id)
        for initiative in project["initiatives"]:
            if initiative["ref"] == ref:
                return initiative
        raise RoadmapNotFound(f"no such initiative '{ref}'")

    def milestone_items(self, project_id: str, milestone_id: int) -> Dict[str, Any]:
        # The read is gated exactly as the 0.4.0 route was: a project with
        # milestones switched off does not expose milestone detail at all.
        self._known_project(project_id)
        self.svc.require_feature(project_id, "milestones")
        project = self._project(project_id)
        milestone = next((m for m in project["milestones"] if m["id"] == milestone_id), None)
        if milestone is None:
            raise RoadmapNotFound(f"no such milestone '{milestone_id}'")
        items = [task for objective in milestone["objectives"]
                 for goal in objective["goals"] for task in goal["tasks"]]
        # Blockers are best effort and never invented: an unreadable dependency
        # list leaves the field null rather than reading as "nothing blocks this".
        if project["work_host"] == "ok":
            for task in items:
                blockers: Optional[List[str]] = []
                try:
                    detail = self.work.detail(project_id, task["ref"]) or {}
                    blockers = [dep["ref"] for dep in (detail.get("dependencies") or [])
                                if dep.get("status") != "done"]
                except Exception:  # noqa: BLE001 - blocker detail is best effort
                    blockers = None
                task["blockers"] = blockers
        delivery = milestone["delivery"]
        unavailable = project["work_host"] != "ok"
        return {"state": "ok" if not unavailable else "unavailable",
                # The reason must travel: "unlinked" (Hermes has no such project)
                # and "unavailable" (the host did not answer) are different
                # answers, and the Roadmap must never claim one for the other.
                "reason": delivery.get("reason") if unavailable else None,
                "milestone": {k: milestone[k] for k in
                              ("id", "name", "due", "closed", "state")},
                "items": items, "delivery": delivery}
