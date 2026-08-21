"""Service layer: all stewardship operations against the canonical store.

This is the single write path every surface (CLI, RPC, gateway, desktop)
shares. Surfaces never touch SQL directly.

Fail-closed rules enforced here:
- mutating operations on a paused/frozen project are refused;
- approvals require an eligible actor with permission binding;
- initiative execution requires approval when policy says so.
"""

from __future__ import annotations

import json
import sqlite3
from datetime import timedelta
from typing import Any, Dict, List, Optional, Sequence

from ..domain.constants import (
    ApprovalState,
    InitiativeStatus,
    KnowledgeType,
    ProjectPhase,
    TriggerType,
)
from ..domain.models import Initiative, Objective
from .store import Store, iso


class ServiceError(RuntimeError):
    """Refusal surfaced to users (bad state, bad policy, not found)."""


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
                    owner_lead_profile=excluded.owner_lead_profile,
                    member_profiles_json=excluded.member_profiles_json,
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
                    lead_profile,
                    json.dumps(list(member_profiles or [])),
                    int(autonomy_level),
                    self.store._j(verification_policy or {}),
                    self.store._j(release_policy or {}),
                    self.store._j(notification_policy or {}),
                    ProjectPhase.ACTIVE.value,
                    now,
                    now,
                ),
            )
        self.store.audit(
            actor=lead_profile or "system",
            interface="service",
            action="stewardship.enabled",
            subject=project_id,
            detail={"autonomy_level": autonomy_level},
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
            "phase": r["phase"],
            "created_at": r["created_at"],
            "updated_at": r["updated_at"],
            "paused_at": r["paused_at"],
        }

    def settings(self, project_id: str) -> Dict[str, Any]:
        r = self._require(project_id)
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
            "phase": r["phase"],
            "created_at": r["created_at"],
            "updated_at": r["updated_at"],
            "paused_at": r["paused_at"],
        }

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
    # Objectives                                                         #
    # ------------------------------------------------------------------ #

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
    ) -> Dict[str, Any]:
        self._require(project_id)
        if evaluator_type not in ("manual", "command", "integration"):
            raise ServiceError(f"unsupported evaluator_type '{evaluator_type}'")
        if evaluator_type == "command":
            if not command:
                raise ServiceError("command objective requires a command argv list")
            if isinstance(command, str):
                raise ServiceError("command must be an argv list (no shell strings)")
        with self.store.tx() as cx:
            cx.execute(
                """
                INSERT INTO project_objectives(
                    project_id, name, description, evaluator_type, target,
                    severity, enabled, command_json, integration, window)
                VALUES(?,?,?,?,?,?,?,?,?,?)
                ON CONFLICT(project_id, name) DO UPDATE SET
                    description=excluded.description,
                    evaluator_type=excluded.evaluator_type,
                    target=excluded.target,
                    severity=excluded.severity,
                    enabled=excluded.enabled,
                    command_json=excluded.command_json,
                    integration=excluded.integration,
                    window=excluded.window
                """,
                (
                    project_id,
                    name,
                    description,
                    evaluator_type,
                    target,
                    severity,
                    1,
                    self.store._j(list(command)) if command else None,
                    integration,
                    window,
                ),
            )
        self.store.audit(actor="system", interface="service", action="objective.added", subject=f"{project_id}:{name}")
        return {"project_id": project_id, "name": name}

    def objectives(self, project_id: str, *, include_disabled: bool = False) -> List[Objective]:
        self._require(project_id)
        sql = "SELECT * FROM project_objectives WHERE project_id=?"
        if not include_disabled:
            sql += " AND enabled=1"
        sql += " ORDER BY id"
        rows = self.store._conn.execute(sql, (project_id,)).fetchall()
        out: List[Objective] = []
        for r in rows:
            out.append(
                Objective(
                    id=r["id"],
                    project_id=r["project_id"],
                    name=r["name"],
                    description=r["description"],
                    evaluator_type=r["evaluator_type"],
                    target=r["target"],
                    severity=r["severity"],
                    enabled=bool(r["enabled"]),
                    command=self.store._uj(r["command_json"], None),
                    integration=r["integration"],
                    window=r["window"],
                )
            )
        return out

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
        row = self._require(project_id)
        if not rationale.strip():
            raise ServiceError("initiative requires a rationale (anti-busywork rule)")

        settings = self.settings(project_id)
        auto_approve_below_risk = settings["policies"]["release"].get(
            "auto_approve_below_risk"
        )
        if requires_approval is None:
            requires_approval = True  # V1 default: everything needs approval

        dk = dedupe_key or f"{title.strip().lower()[:80]}"

        # Suppression check
        suppressed = self.store._conn.execute(
            "SELECT suppressed_until, reason FROM initiative_suppression"
            " WHERE project_id=? AND dedupe_key=?",
            (project_id, dk),
        ).fetchone()
        if suppressed and suppressed["suppressed_until"] > iso(self._clock()):
            raise ServiceError(
                f"initiative '{dk}' is suppressed until"
                f" {suppressed['suppressed_until']} ({suppressed['reason']})"
            )

        # Dedupe against open initiatives
        open_states = (
            InitiativeStatus.PROPOSED.value,
            InitiativeStatus.PENDING_APPROVAL.value,
            InitiativeStatus.APPROVED.value,
            InitiativeStatus.EXECUTING.value,
        )
        dup = self.store._conn.execute(
            f"SELECT ref FROM project_initiatives WHERE project_id=? AND dedupe_key=?"
            f" AND status IN ({','.join('?' * len(open_states))})",
            (project_id, dk, *open_states),
        ).fetchone()
        if dup:
            raise ServiceError(f"duplicate of open initiative {dup['ref']}")

        # Concurrency cap
        cap = int(settings["policies"].get("notification", {}).get("max_open_initiatives", 5))
        cap = int(settings["policies"]["verification"].get("max_open_initiatives", cap))
        open_count = self.store._conn.execute(
            f"SELECT COUNT(*) AS n FROM project_initiatives WHERE project_id=?"
            f" AND status IN ({','.join('?' * len(open_states))})",
            (project_id, *open_states),
        ).fetchone()["n"]
        if open_count >= cap:
            raise ServiceError(
                f"open-initiative cap reached ({cap}); resolve existing work first"
            )

        approval_state = (
            ApprovalState.PENDING.value if requires_approval else ApprovalState.NOT_REQUIRED.value
        )
        status = (
            InitiativeStatus.PENDING_APPROVAL.value
            if requires_approval
            else InitiativeStatus.APPROVED.value
        )
        ref = self._next_ref(project_id)

        with self.store.tx() as cx:
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
        self._require(project_id)
        sql = "SELECT * FROM project_initiatives WHERE project_id=?"
        args: List[Any] = [project_id]
        if status:
            sql += " AND status=?"
            args.append(status)
        sql += " ORDER BY priority DESC, id ASC"
        rows = self.store._conn.execute(sql, tuple(args)).fetchall()
        return [self._initiative_row(r) for r in rows]

    def approve_initiative(self, ref: str, *, actor: str, interface: str) -> Dict[str, Any]:
        ini = self.initiative_by_ref(ref)
        if ini["status"] != InitiativeStatus.PENDING_APPROVAL.value:
            raise ServiceError(
                f"initiative {ref} is not pending approval (status={ini['status']})"
            )
        with self.store.tx() as cx:
            res = cx.execute(
                "UPDATE project_initiatives SET status='approved',"
                " approval_state='approved' WHERE ref=? AND status='pending_approval'",
                (ref,),
            )
            if res.rowcount != 1:
                raise ServiceError(f"initiative {ref} changed state concurrently")
        self.store.audit(
            actor=actor,
            interface=interface,
            action="initiative.approved",
            subject=ref,
        )
        return self.initiative_by_ref(ref)

    def reject_initiative(
        self,
        ref: str,
        *,
        actor: str,
        interface: str,
        suppress_days: Optional[int] = None,
    ) -> Dict[str, Any]:
        ini = self.initiative_by_ref(ref)
        if ini["status"] not in (InitiativeStatus.PENDING_APPROVAL.value, InitiativeStatus.PROPOSED.value):
            raise ServiceError(f"initiative {ref} cannot be rejected from status={ini['status']}")
        days = suppress_days if suppress_days is not None else self.default_suppression_days
        with self.store.tx() as cx:
            cx.execute(
                "UPDATE project_initiatives SET status='rejected',"
                " approval_state='rejected' WHERE ref=?",
                (ref,),
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
                    ini["dedupe_key"],
                    iso(self._clock() + timedelta(days=days)),
                    "rejected",
                ),
            )
        self.store.audit(
            actor=actor, interface=interface, action="initiative.rejected", subject=ref,
            detail={"suppression_days": days},
        )
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


__all__ = ["StewardshipService", "ServiceError"]
