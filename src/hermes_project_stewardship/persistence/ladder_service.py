"""Mutation and lifecycle policy for the v42 delivery ladder."""
from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any, Dict, Optional, Sequence

from ..domain.models import Objective
from ..domain.policy import AutonomyPolicy
from ..objectives.evaluators import DEFAULT_EVALUATOR, EvaluationContext, parse_target
from ..security.allowlist import DEFAULT_ALLOWLIST
from .roadmap_service import RoadmapConflict, RoadmapInvalid, RoadmapNotFound, RoadmapService
from .service import StewardshipService
from .store import Store, iso


class LadderService:
    """One-parent writes, checks, placement queue and human delivery confirmation."""

    def __init__(self, store: Store, stewardship: StewardshipService,
                 canonical_work, roadmap: RoadmapService, *, clock=None) -> None:
        self.store = store
        self.svc = stewardship
        self.work = canonical_work
        self.roadmap = roadmap
        self._clock = clock or store._clock

    def _known_project(self, project_id: str) -> None:
        row = self.store._conn.execute(
            "SELECT archived_at FROM project_stewardship WHERE project_id=?", (project_id,)
        ).fetchone()
        if row is None:
            raise RoadmapNotFound(f"no such project '{project_id}'")
        if row["archived_at"] is not None:
            raise RoadmapConflict("project is archived; restore it before editing the ladder")

    def _require_features(self, project_id: str, *names: str) -> None:
        """A placement is refused while a feature it touches is switched off.

        The 0.4.0 link routes carried the same gates, so a project with
        milestones off could not be wired into an initiative through the old
        endpoint either. The gate stays: turning a feature off must keep the
        ladder consistent with the rest of the product.
        """
        for name in names:
            self.svc.require_feature(project_id, name)

    def _audit(self, cx, *, actor: str, interface: str, action: str,
               subject: str, detail: Dict[str, Any]) -> None:
        cx.execute(
            "INSERT INTO stewardship_audit_log(ts,actor,interface,action,subject,detail_json)"
            " VALUES(?,?,?,?,?,?)",
            (iso(self._clock()), actor, interface, action, subject, self.store._j(detail)),
        )

    @staticmethod
    def _resolve(cx, project_id: str, kind: str, item_id: str,
                 actor: str, now: str) -> None:
        cx.execute(
            "UPDATE roadmap_unplaced SET resolved_at=?,resolved_by=?"
            " WHERE project_id=? AND kind=? AND item_id=? AND resolved_at IS NULL",
            (now, actor, project_id, kind, str(item_id)),
        )

    def set_task_goal(self, project_id: str, item_ref: str,
                      parent_id: Optional[str], *, actor: str,
                      interface: str = "service") -> Dict[str, Any]:
        self._known_project(project_id)
        try:
            item = self.work.get(project_id, item_ref)
        except Exception as exc:  # host failure cannot authorise a structural write
            raise RoadmapConflict("task host is unavailable; placement refused") from exc
        if item is None:
            raise RoadmapNotFound(f"no such task '{item_ref}' in project '{project_id}'")
        if parent_id is not None:
            parent = self.store._conn.execute(
                "SELECT project_id,archived_at FROM project_goals WHERE goal_id=?", (parent_id,)
            ).fetchone()
            if parent is None:
                raise RoadmapNotFound(f"no such goal '{parent_id}'")
            if parent["project_id"] != project_id:
                raise RoadmapConflict("cross-project parent refused")
            if parent["archived_at"] is not None:
                raise RoadmapConflict("goal is archived; restore it before placing tasks")
        now = iso(self._clock())
        with self.store.tx() as cx:
            previous = cx.execute(
                "SELECT goal_id FROM goal_tasks WHERE item_ref=?", (item_ref,)
            ).fetchone()
            cx.execute("DELETE FROM goal_tasks WHERE item_ref=?", (item_ref,))
            if parent_id is not None:
                cx.execute(
                    "INSERT INTO goal_tasks(item_ref,project_id,goal_id,created_at) VALUES(?,?,?,?)",
                    (item_ref, project_id, parent_id, now),
                )
                self._resolve(cx, project_id, "task", item_ref, actor, now)
            self._audit(
                cx, actor=actor, interface=interface, action="roadmap.parent.set",
                subject=item_ref,
                detail={"project_id": project_id, "kind": "task", "item_id": item_ref,
                        "previous_parent_id": previous["goal_id"] if previous else None,
                        "parent_id": parent_id},
            )
        return {"project_id": project_id, "kind": "task", "item_id": item_ref,
                "parent_id": parent_id}

    # -- waivers: a person takes an item out of the requirement -------------
    #
    # A waiver is not a deletion and not a completion: the item keeps its
    # history, stays on the roadmap marked "no longer required", and stops
    # blocking its parent, which counts it as satisfied. Clearing it puts the
    # item back exactly as it was.

    WAIVABLE = ("task", "goal", "objective", "milestone")

    def _waiver_target(self, project_id: str, kind: str, item_id: str) -> None:
        """The item must exist, in this project, at that level."""
        if kind not in self.WAIVABLE:
            raise RoadmapConflict(f"'{kind}' cannot be marked no longer required")
        cx = self.store._conn
        if kind == "task":
            try:
                item = self.work.get(project_id, item_id)
            except Exception as exc:  # a host failure cannot authorise a write
                raise RoadmapConflict("task host is unavailable; waiver refused") from exc
            if item is None:
                raise RoadmapNotFound(f"no such task '{item_id}' in project '{project_id}'")
            return
        table, column = {
            "goal": ("project_goals", "goal_id"),
            "objective": ("project_objectives", "id"),
            "milestone": ("dockyard_milestones", "id"),
        }[kind]
        value = item_id
        if kind != "goal":
            try:
                value = int(item_id)
            except (TypeError, ValueError):
                raise RoadmapNotFound(f"no such {kind} '{item_id}'") from None
        row = cx.execute(
            f"SELECT project_id FROM {table} WHERE {column}=?", (value,)
        ).fetchone()
        if row is None:
            raise RoadmapNotFound(f"no such {kind} '{item_id}'")
        if row["project_id"] != project_id:
            raise RoadmapConflict("cross-project waiver refused")

    def waive(self, project_id: str, kind: str, item_id: str, reason: str, *,
              actor: str, interface: str = "service") -> Dict[str, Any]:
        self._known_project(project_id)
        self._waiver_target(project_id, kind, item_id)
        text = (reason or "").strip()
        if len(text) < 4:
            raise RoadmapConflict("a reason is required to mark an item no longer required")
        now = iso(self._clock())
        with self.store.tx() as cx:
            cx.execute(
                "INSERT INTO ladder_waivers(project_id,kind,item_id,reason,waived_by,"
                "waived_at,cleared_by,cleared_at) VALUES(?,?,?,?,?,?,NULL,NULL)"
                " ON CONFLICT(project_id,kind,item_id) DO UPDATE SET"
                " reason=excluded.reason, waived_by=excluded.waived_by,"
                " waived_at=excluded.waived_at, cleared_by=NULL, cleared_at=NULL",
                (project_id, kind, str(item_id), text, actor, now),
            )
            self._audit(
                cx, actor=actor, interface=interface, action="ladder.waived",
                subject=str(item_id),
                detail={"project_id": project_id, "kind": kind,
                        "item_id": str(item_id), "reason": text},
            )
        return {"project_id": project_id, "kind": kind, "item_id": str(item_id),
                "waived": True, "reason": text}

    def clear_waiver(self, project_id: str, kind: str, item_id: str, *,
                     actor: str, interface: str = "service") -> Dict[str, Any]:
        self._known_project(project_id)
        now = iso(self._clock())
        with self.store.tx() as cx:
            removed = cx.execute(
                "UPDATE ladder_waivers SET cleared_by=?,cleared_at=?"
                " WHERE project_id=? AND kind=? AND item_id=? AND cleared_at IS NULL",
                (actor, now, project_id, kind, str(item_id)),
            ).rowcount
            if not removed:
                raise RoadmapNotFound("that item is not marked no longer required")
            self._audit(
                cx, actor=actor, interface=interface, action="ladder.waiver.cleared",
                subject=str(item_id),
                detail={"project_id": project_id, "kind": kind, "item_id": str(item_id)},
            )
        return {"project_id": project_id, "kind": kind, "item_id": str(item_id),
                "waived": False}

    def set_goal_objective(self, project_id: str, goal_id: str,
                           parent_id: Optional[int], *, actor: str,
                           interface: str = "service") -> Dict[str, Any]:
        self._known_project(project_id)
        self._require_features(project_id, "initiatives")
        child = self.store._conn.execute(
            "SELECT project_id,archived_at,objective_id FROM project_goals WHERE goal_id=?",
            (goal_id,),
        ).fetchone()
        if child is None:
            raise RoadmapNotFound(f"no such goal '{goal_id}'")
        if child["project_id"] != project_id:
            raise RoadmapConflict("cross-project child refused")
        if parent_id is not None:
            parent = self.store._conn.execute(
                "SELECT project_id,enabled FROM project_objectives WHERE id=?", (parent_id,)
            ).fetchone()
            if parent is None:
                raise RoadmapNotFound(f"no such objective '{parent_id}'")
            if parent["project_id"] != project_id:
                raise RoadmapConflict("cross-project parent refused")
            if not parent["enabled"]:
                raise RoadmapConflict("objective is archived; restore it before linking")
        return self._set_column(
            project_id, "goal", goal_id, "project_goals", "goal_id", "objective_id",
            parent_id, child["objective_id"], actor=actor, interface=interface)

    def set_objective_milestone(self, project_id: str, objective_id: int,
                                parent_id: Optional[int], *, actor: str,
                                interface: str = "service") -> Dict[str, Any]:
        self._known_project(project_id)
        self._require_features(project_id, "milestones")
        child = self.store._conn.execute(
            "SELECT project_id,enabled,milestone_id FROM project_objectives WHERE id=?",
            (objective_id,),
        ).fetchone()
        if child is None:
            raise RoadmapNotFound(f"no such objective '{objective_id}'")
        if child["project_id"] != project_id:
            raise RoadmapConflict("cross-project child refused")
        if parent_id is not None:
            parent = self.store._conn.execute(
                "SELECT project_id,archived_at FROM dockyard_milestones WHERE id=?", (parent_id,)
            ).fetchone()
            if parent is None:
                raise RoadmapNotFound(f"no such milestone '{parent_id}'")
            if parent["project_id"] != project_id:
                raise RoadmapConflict("cross-project parent refused")
            if parent["archived_at"] is not None:
                raise RoadmapConflict("milestone is archived; restore it before linking")
        return self._set_column(
            project_id, "objective", str(objective_id), "project_objectives", "id",
            "milestone_id", parent_id, child["milestone_id"],
            actor=actor, interface=interface)

    def set_milestone_initiative(self, project_id: str, milestone_id: int,
                                 parent_id: Optional[str], *, actor: str,
                                 interface: str = "service") -> Dict[str, Any]:
        self._known_project(project_id)
        self._require_features(project_id, "initiatives", "milestones")
        child = self.store._conn.execute(
            "SELECT project_id,archived_at,initiative_ref FROM dockyard_milestones WHERE id=?",
            (milestone_id,),
        ).fetchone()
        if child is None:
            raise RoadmapNotFound(f"no such milestone '{milestone_id}'")
        if child["project_id"] != project_id:
            raise RoadmapConflict("cross-project child refused")
        if parent_id is not None:
            parent = self.store._conn.execute(
                "SELECT project_id,status FROM project_initiatives WHERE ref=?", (parent_id,)
            ).fetchone()
            if parent is None:
                raise RoadmapNotFound(f"no such initiative '{parent_id}'")
            if parent["project_id"] != project_id:
                raise RoadmapConflict("cross-project parent refused")
            if parent["status"] in {"rejected", "cancelled"}:
                raise RoadmapConflict("initiative is closed; choose an active parent")
        return self._set_column(
            project_id, "milestone", str(milestone_id), "dockyard_milestones", "id",
            "initiative_ref", parent_id, child["initiative_ref"],
            actor=actor, interface=interface)

    def _set_column(self, project_id: str, kind: str, item_id: str,
                    table: str, key_column: str, parent_column: str,
                    parent_id: Any, previous: Any, *, actor: str,
                    interface: str) -> Dict[str, Any]:
        now = iso(self._clock())
        with self.store.tx() as cx:
            changed = cx.execute(
                f"UPDATE {table} SET {parent_column}=? WHERE {key_column}=?",
                (parent_id, item_id),
            )
            if changed.rowcount != 1:
                raise RoadmapNotFound(f"no such {kind} '{item_id}'")
            if parent_id is not None:
                self._resolve(cx, project_id, kind, item_id, actor, now)
            self._audit(
                cx, actor=actor, interface=interface, action="roadmap.parent.set",
                subject=item_id,
                detail={"project_id": project_id, "kind": kind, "item_id": item_id,
                        "previous_parent_id": previous, "parent_id": parent_id},
            )
        return {"project_id": project_id, "kind": kind, "item_id": item_id,
                "parent_id": parent_id}

    def set_goal_check(self, project_id: str, goal_id: str,
                       check: Optional[Dict[str, Any]], *, actor: str,
                       interface: str = "service") -> Dict[str, Any]:
        self._known_project(project_id)
        goal = self.store._conn.execute(
            "SELECT project_id,archived_at FROM project_goals WHERE goal_id=?", (goal_id,)
        ).fetchone()
        if goal is None:
            raise RoadmapNotFound(f"no such goal '{goal_id}'")
        if goal["project_id"] != project_id:
            raise RoadmapConflict("cross-project goal refused")
        if goal["archived_at"] is not None:
            raise RoadmapConflict("goal is archived")
        now = iso(self._clock())
        with self.store.tx() as cx:
            if check is None:
                cx.execute("DELETE FROM goal_checks WHERE goal_id=?", (goal_id,))
            else:
                clean = self._validate_check(check)
                cx.execute(
                    "INSERT INTO goal_checks(goal_id,evaluator_type,target,command_json,"
                    " integration,window,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?)"
                    " ON CONFLICT(goal_id) DO UPDATE SET evaluator_type=excluded.evaluator_type,"
                    " target=excluded.target,command_json=excluded.command_json,"
                    " integration=excluded.integration,window=excluded.window,updated_at=excluded.updated_at",
                    (goal_id, clean["evaluator_type"], clean["target"],
                     self.store._j(clean["command"]) if clean["command"] else None,
                     clean["integration"], clean["window"], now, now),
                )
            self._audit(cx, actor=actor, interface=interface, action="goal.check.updated",
                        subject=goal_id, detail={"project_id": project_id,
                                                "removed": check is None})
        return self.goal_check(project_id, goal_id)

    @staticmethod
    def _validate_check(check: Dict[str, Any]) -> Dict[str, Any]:
        if not isinstance(check, dict):
            raise RoadmapInvalid("goal check must be an object or null")
        allowed = {"evaluator_type", "target", "command", "integration", "window"}
        unknown = set(check) - allowed
        if unknown:
            raise RoadmapInvalid(f"unknown goal check fields: {', '.join(sorted(unknown))}")
        evaluator = check.get("evaluator_type")
        target = str(check.get("target") or "").strip()
        window = str(check.get("window") or "30d").strip()
        if evaluator not in {"manual", "command", "integration"}:
            raise RoadmapInvalid("unsupported goal check evaluator")
        try:
            parse_target(target)
        except ValueError as exc:
            raise RoadmapInvalid(str(exc)) from exc
        if not re.fullmatch(r"[1-9][0-9]{0,3}d", window):
            raise RoadmapInvalid("goal check window must be 1d to 9999d")
        command = check.get("command")
        integration = check.get("integration")
        if evaluator == "command":
            if isinstance(command, str) or not isinstance(command, Sequence) or not command:
                raise RoadmapInvalid("command goal check requires an argv list")
            command = list(command)
            if not all(isinstance(part, str) and part for part in command):
                raise RoadmapInvalid("command must be an argv list")
        else:
            command = None
        if evaluator == "integration" and not isinstance(integration, str):
            raise RoadmapInvalid("integration goal check requires an integration id")
        if evaluator != "integration":
            integration = None
        return {"evaluator_type": evaluator, "target": target, "window": window,
                "command": command, "integration": integration}

    def goal_check(self, project_id: str, goal_id: str) -> Dict[str, Any]:
        self._known_project(project_id)
        row = self.store._conn.execute(
            "SELECT c.* FROM goal_checks c JOIN project_goals g ON g.goal_id=c.goal_id"
            " WHERE c.goal_id=? AND g.project_id=?", (goal_id, project_id)
        ).fetchone()
        if row is None:
            return {"goal_id": goal_id, "check": None,
                    "evidence": self.roadmap._goal_check(goal_id)}
        check = {"evaluator_type": row["evaluator_type"], "target": row["target"],
                 "command": self.store._uj(row["command_json"], None),
                 "integration": row["integration"], "window": row["window"]}
        return {"goal_id": goal_id, "check": check,
                "evidence": self.roadmap._goal_check(goal_id)}

    def record_goal_assessment(self, project_id: str, goal_id: str, *, passed: bool,
                               evidence: list[str], detail: str = "",
                               expires_at: Optional[str] = None,
                               trusted_principal: Optional[str],
                               interface: str = "desktop") -> Dict[str, Any]:
        if not trusted_principal or not str(trusted_principal).strip():
            raise RoadmapConflict("manual goal checks require an authenticated human")
        if "bot" in interface.lower() or "agent" in interface.lower():
            raise RoadmapConflict("manual goal checks require a human interface")
        if not evidence or not all(isinstance(value, str) and value.strip() for value in evidence):
            raise RoadmapInvalid("assessment requires at least one evidence reference")
        row = self.store._conn.execute(
            "SELECT c.* FROM goal_checks c JOIN project_goals g ON g.goal_id=c.goal_id"
            " WHERE c.goal_id=? AND g.project_id=?", (goal_id, project_id)
        ).fetchone()
        if row is None or row["evaluator_type"] != "manual":
            raise RoadmapConflict("assessment requires an active manual goal check")
        now = iso(self._clock())
        with self.store.tx() as cx:
            cx.execute(
                "INSERT INTO goal_check_evaluations(project_id,goal_id,passed,measured,"
                " target_met,state,detail,evidence_json,source,actor,interface,recorded_at,expires_at)"
                " VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)",
                (project_id, goal_id, int(bool(passed)), 1.0 if passed else 0.0,
                 int(bool(passed)), "passed" if passed else "failed", detail,
                 self.store._j(evidence), "manual", str(trusted_principal),
                 interface, now, expires_at),
            )
            self._audit(cx, actor=str(trusted_principal), interface=interface,
                        action="goal.check.assessed", subject=goal_id,
                        detail={"project_id": project_id, "passed": bool(passed),
                                "evidence_count": len(evidence)})
        return self.goal_check(project_id, goal_id)

    def evaluate_goal_check(self, project_id: str, goal_id: str, *, actor: str,
                            interface: str = "desktop") -> Dict[str, Any]:
        payload = self.goal_check(project_id, goal_id)
        check = payload["check"]
        if check is None:
            raise RoadmapNotFound(f"goal '{goal_id}' has no check")
        if check["evaluator_type"] == "manual":
            return payload
        settings = self.svc.settings(project_id)
        policy = AutonomyPolicy.from_settings(settings)
        if check["evaluator_type"] == "command":
            decision = policy.command_evaluator_allowed()
            if not decision.allowed:
                raise RoadmapConflict(f"command goal check refused: {decision.reason}")
        verification = (settings.get("policies", {}) or {}).get("verification", {}) or {}
        configured = verification.get("command_allowlist")
        ctx = EvaluationContext(
            project_path=Path(verification["repo_path"]) if verification.get("repo_path") else None,
            allowlist=DEFAULT_ALLOWLIST if configured is None else frozenset(configured),
            clock=self._clock,
        )
        objective = Objective(
            id=-1, project_id=project_id, name=f"Goal check {goal_id}",
            description="", evaluator_type=check["evaluator_type"],
            target=check["target"], severity="medium", enabled=True,
            command=check["command"], integration=check["integration"],
            window=check["window"],
        )
        result = DEFAULT_EVALUATOR.evaluate(objective, ctx)
        now = iso(self._clock())
        with self.store.tx() as cx:
            cx.execute(
                "INSERT INTO goal_check_evaluations(project_id,goal_id,passed,measured,"
                " target_met,state,detail,evidence_json,source,actor,interface,recorded_at)"
                " VALUES(?,?,?,?,?,?,?,?,?,?,?,?)",
                (project_id, goal_id, int(result.passed), result.measured,
                 int(result.target_met), result.state, result.detail, "{}",
                 "evaluate-now", actor, interface, now),
            )
            self._audit(cx, actor=actor, interface=interface, action="goal.check.evaluated",
                        subject=goal_id, detail={"project_id": project_id,
                                                "state": result.state})
        return self.goal_check(project_id, goal_id)

    def list_unplaced(self, project_id: str) -> list[Dict[str, Any]]:
        self._known_project(project_id)
        rows = self.store._conn.execute(
            "SELECT * FROM roadmap_unplaced WHERE project_id=? AND resolved_at IS NULL"
            " ORDER BY created_at,id", (project_id,)
        ).fetchall()
        result = []
        for row in rows:
            item = dict(row)
            item["old_links"] = self.store._uj(item.pop("old_links_json"), [])
            result.append(item)
        return result

    def dismiss_unplaced(self, project_id: str, row_id: int, *, actor: str,
                         interface: str = "service") -> Dict[str, Any]:
        self._known_project(project_id)
        now = iso(self._clock())
        with self.store.tx() as cx:
            row = cx.execute(
                "SELECT * FROM roadmap_unplaced WHERE id=? AND project_id=?",
                (row_id, project_id),
            ).fetchone()
            if row is None:
                raise RoadmapNotFound(f"no such Needs placing item '{row_id}'")
            cx.execute(
                "UPDATE roadmap_unplaced SET resolved_at=COALESCE(resolved_at,?),"
                " resolved_by=COALESCE(resolved_by,?) WHERE id=?", (now, actor, row_id))
            self._audit(cx, actor=actor, interface=interface,
                        action="roadmap.unplaced.dismissed", subject=str(row_id),
                        detail={"project_id": project_id, "kind": row["kind"],
                                "item_id": row["item_id"]})
        return {"id": row_id, "dismissed": True}

    def confirm_delivered(self, project_id: str, ref: str, *, actor: str,
                          interface: str = "service",
                          after_confirm=None) -> Dict[str, Any]:
        self._known_project(project_id)
        self._require_features(project_id, "initiatives")
        initiative = self.roadmap.initiative_state(project_id, ref)
        # Already confirmed: repeating is harmless, the recorded result stands.
        if initiative["governance"] == "completed":
            return self.svc.initiative_by_ref(ref)
        if not initiative["ready_to_confirm"]:
            raise RoadmapConflict(
                "initiative is not ready to confirm; every milestone must be reached")
        now = iso(self._clock())
        outcome = {"confirmed_by": actor, "confirmed_at": now,
                   "milestone_ids": [row["id"] for row in initiative["milestones"]]}
        with self.store.tx() as cx:
            changed = cx.execute(
                "UPDATE project_initiatives SET status='completed',outcome_json=?,completed_at=?"
                " WHERE ref=? AND project_id=? AND status='executing'",
                (self.store._j(outcome), now, ref, project_id),
            )
            if changed.rowcount != 1:
                raise RoadmapConflict("initiative state changed before confirmation")
            self._audit(cx, actor=actor, interface=interface,
                        action="initiative.completed", subject=ref, detail=outcome)
        # Notify: the "ready to confirm" prompt and any "regressed" notice for
        # this initiative resolve when it is confirmed (handled by the
        # notification runner on the completed event).
        bus = getattr(self.svc, "events", None)
        if bus is not None:
            bus.emit("initiative.completed", project_id=project_id, subject=ref,
                     payload={"confirmed_by": actor})
        # A confirmed initiative is still observed (the outcome is measured
        # after delivery). The caller supplies the integration hook; the ladder
        # itself stays free of host/integration wiring.
        if after_confirm is not None:
            after_confirm(ref)
        return self.svc.initiative_by_ref(ref)

    def regress_completed_if_failed(self, project_id: str, ref: str, *,
                                    actor: str = "system",
                                    interface: str = "observation") -> bool:
        initiative = self.roadmap.initiative_state(project_id, ref)
        if initiative["governance"] != "completed":
            return False
        failed = any(
            goal["state"] == "at_risk" or objective["state"] == "at_risk"
            for milestone in initiative["milestones"]
            for objective in milestone["objectives"]
            for goal in (objective["goals"] or [
                {"state": objective["state"]}
            ])
        )
        if not failed:
            return False
        with self.store.tx() as cx:
            changed = cx.execute(
                "UPDATE project_initiatives SET status='regressed'"
                " WHERE ref=? AND project_id=? AND status='completed'", (ref, project_id))
            if changed.rowcount:
                self._audit(cx, actor=actor, interface=interface,
                            action="initiative.regressed", subject=ref,
                            detail={"project_id": project_id,
                                    "reason": "ladder check failed after confirmation"})
        if changed.rowcount:
            bus = getattr(self.svc, "events", None)
            if bus is not None:
                bus.emit("initiative.regressed", project_id=project_id, subject=ref,
                         payload={"reason": "ladder check failed after confirmation"})
        return bool(changed.rowcount)
