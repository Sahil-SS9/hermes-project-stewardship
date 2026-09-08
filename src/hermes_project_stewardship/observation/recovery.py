"""Observation recovery and bounded reconciliation (Phase 3).

Responsibilities (plan P3.4–P3.6):
- host-identity-verified completion: a native completion reconciles an
  initiative ONLY with real host run identity + validation contract; a bare
  ``verified=true`` field proves nothing;
- run-once observation with honest classification (improved/regressed/
  unknown) persisted with evidence;
- crash/restart recovery: stale ``running`` observation rows return to
  ``pending`` — recorded honestly, never silently re-run;
- one bounded reconciliation command for manual/native-cron use, gated by
  the per-project ``reconciliation`` feature (default OFF). The trigger type
  passes through untouched: scheduled reconciliation cannot bypass a paused
  project's manual-only gate — that refusal comes from CycleEngine.
"""
from __future__ import annotations

import json
from typing import Any, Dict, List, Optional

from ..persistence.dockyard_integration import IntegrationError

RESULT_STATES = ("improved", "regressed", "unknown")


class ReconcileService:
    """One object wiring the stewardship store, the native host and the
    cycle engine behind the bounded reconciliation boundary.

    ``store`` is the canonical persistence Store (its tx/claim/migration
    machinery is reused, never reimplemented); ``host`` is the observation
    read surface (get_task / get_task_events / get_task_runs); ``engine``
    is the CycleEngine; ``service`` is the StewardshipService for the
    feature gate.
    """

    def __init__(self, store: Any, host: Any, *, engine: Any = None,
                 service: Any = None, clock=None) -> None:
        self._store = store
        self._host = host
        self._engine = engine
        self._service = service
        self._clock = clock

    @property
    def _conn(self):
        return self._store._conn

    def _binding_for(self, task_id: str) -> Optional[Dict[str, Any]]:
        """Ownership proof: the canonical binding for a native task."""
        row = self._conn.execute(
            "SELECT project_id, initiative_ref FROM dockyard_canonical_work_bindings"
            " WHERE item_kind != 'epic' AND item_id=?",
            (task_id,),
        ).fetchone()
        if row is None:
            return None
        return {"project_id": row["project_id"],
                "initiative_ref": row["initiative_ref"]}

    def _host_runs(self, task_id: str) -> List[Dict[str, Any]]:
        runs = self._host.get_task_runs(task_id) or []
        if runs and not isinstance(runs[0], dict):
            return [dict(r) for r in runs]
        return [dict(r) for r in runs]

    # ------------------------------------------------------------------ #
    # P3.4 — host-identity-verified completion                           #
    # ------------------------------------------------------------------ #

    def complete_from_native(
        self,
        *,
        ref: str,
        outcome: Dict[str, Any],
        run_id: Optional[int] = None,
        task_id: Optional[str] = None,
        regressed: bool = False,
    ) -> Dict[str, Any]:
        """Reconcile an initiative from a native completion.

        Host result identity is REQUIRED and must EVIDENCE the delivery:
        - the native task must be BOUND to this initiative (via the existing
          canonical work bindings);
        - the named run must exist on the host with a terminal COMPLETED
          outcome (a running/unknown run proves nothing);
        - a bare ``verified=true`` in the outcome payload is never accepted
          as proof.
        """
        if run_id is None or task_id is None:
            raise IntegrationError(
                "refused: host result identity required (task_id and the"
                " native run_id of the completing run); a verified flag in"
                " the outcome payload does not prove delivery"
            )

        # 1. The task must BELONG to this initiative. The binding written
        #    during approval/binding is the ownership proof.
        binding = self._binding_for(task_id)
        if binding is None or binding.get("initiative_ref") != ref:
            raise IntegrationError(
                f"refused: native task {task_id} is not bound to initiative"
                f" {ref}; a run from unrelated work cannot complete it"
            )

        # 2. The run must exist on the host AND have completed.
        runs = self._host_runs(task_id)
        matching = [r for r in runs if r.get("id") == run_id]
        if not matching:
            raise IntegrationError(
                f"refused: run identity {run_id} not found on native task"
                f" {task_id}; cannot reconcile without host evidence"
            )
        run = matching[0]
        host_outcome = str(run.get("outcome") or "")
        if regressed is False:
            if host_outcome != "completed":
                raise IntegrationError(
                    f"refused: host run {run_id} outcome is"
                    f" '{host_outcome or 'unknown'}', not 'completed'; an"
                    " unfinished run does not prove delivery"
                )
        elif host_outcome not in ("blocked", "completed"):
            raise IntegrationError(
                f"refused: host run {run_id} outcome is"
                f" '{host_outcome or 'unknown'}'; blocking requires a"
                " terminal host outcome"
            )

        # The validation contract gates acceptance: an initiative without
        # recorded steps/tests is never auto-completed by reconciliation.
        row = self._conn.execute(
            "SELECT status FROM project_initiatives WHERE ref=?",
            (ref,),
        ).fetchone()
        if row is None:
            raise IntegrationError(f"initiative {ref} was not found")
        contract = self._validation_contract(ref)
        if not contract.get("steps") and not contract.get("tests"):
            raise IntegrationError(
                f"initiative {ref} has no validation contract; refusing to"
                " mark native completion as verified delivery"
            )

        # Unrelated work is untouched by construction: the update is scoped
        # to this exact ref and only from a live executing state.
        with self._store.tx() as cx:
            changed = cx.execute(
                "UPDATE project_initiatives SET status=?, outcome_json=?,"
                " completed_at=? WHERE ref=? AND status='executing'",
                (
                    "regressed" if regressed else "completed",
                    json.dumps(outcome, sort_keys=True),
                    self._iso_now(),
                    ref,
                ),
            ).rowcount
        if changed != 1:
            raise IntegrationError(
                f"initiative {ref} was not in executing state; no completion"
                " recorded (host run identity preserved for audit)"
            )
        return {
            "initiative_ref": ref,
            "initiative_status": "regressed" if regressed else "completed",
            "task_id": task_id,
            "run_id": run_id,
            "host_outcome": host_outcome,
        }

    def _validation_contract(self, ref: str) -> Dict[str, Any]:
        row = self._conn.execute(
            "SELECT validation_contract_json FROM project_initiatives WHERE ref=?",
            (ref,),
        ).fetchone()
        if row is None:
            return {}
        try:
            contract = json.loads(row["validation_contract_json"] or "null")
        except json.JSONDecodeError:
            return {}
        return contract if isinstance(contract, dict) else {}

    # ------------------------------------------------------------------ #
    # P3.5 — run-once observation, classification, crash recovery         #
    # ------------------------------------------------------------------ #

    def run_observation(
        self,
        ref: str,
        *,
        trigger_type: str = "internal",
        retry_failed: bool = False,
    ) -> Dict[str, Any]:
        """Run the pending observation exactly once for this outcome.

        ``trigger_type`` is forwarded to the engine unchanged — the caller's
        trigger (manual/cron) is what the engine sees, so the paused
        project's manual-only gate applies to the real trigger. With
        ``retry_failed`` a previously-failed row returns to pending first
        (a transient failure must not permanently lose the observation).
        """
        current = self.observation(ref)
        if current["status"] == "completed":
            return current
        if current["status"] == "running":
            raise IntegrationError("observation trigger is already running")
        if current["status"] == "failed":
            if not retry_failed:
                raise IntegrationError(
                    "observation trigger failed and requires an explicit retry"
                )
            with self._store.tx() as cx:
                cx.execute(
                    "UPDATE dockyard_observation_triggers SET status='pending',"
                    " updated_at=? WHERE initiative_ref=? AND status='failed'",
                    (self._iso_now(), ref),
                )
            current = self.observation(ref)
        if self._engine is None:
            raise IntegrationError("no cycle engine wired for observation")

        with self._store.tx() as cx:
            changed = cx.execute(
                "UPDATE dockyard_observation_triggers SET status='running',"
                " updated_at=? WHERE initiative_ref=? AND status='pending'",
                (self._iso_now(), ref),
            ).rowcount
        if changed != 1:
            raise IntegrationError("observation trigger state changed concurrently")

        try:
            result = self._engine.run_cycle(
                current["project_id"],
                trigger_type=trigger_type,
                trigger_ref=ref,
                idempotency_key=current["trigger_key"],
            )
        except Exception:
            with self._store.tx() as cx:
                cx.execute(
                    "UPDATE dockyard_observation_triggers SET status='failed',"
                    " updated_at=? WHERE initiative_ref=?",
                    (self._iso_now(), ref),
                )
            raise

        health_state = str((result.get("health") or {}).get("state") or "")
        result_state = classify_outcome(
            regressed=bool(current["regressed"]), health_state=health_state
        )
        evidence = {
            "cycle_id": result.get("cycle_id"),
            "health_state": health_state,
            "host_outcome": current["outcome"],
        }
        with self._store.tx() as cx:
            cx.execute(
                "UPDATE dockyard_observation_triggers SET status='completed',"
                " cycle_id=?, result_state=?, result_evidence_json=?,"
                " updated_at=? WHERE initiative_ref=? AND status='running'",
                (
                    result.get("cycle_id"),
                    result_state,
                    json.dumps(evidence, sort_keys=True),
                    self._iso_now(),
                    ref,
                ),
            )
        return self.observation(ref)

    def observation(self, ref: str) -> Dict[str, Any]:
        row = self._conn.execute(
            "SELECT * FROM dockyard_observation_triggers WHERE initiative_ref=?",
            (ref,),
        ).fetchone()
        if row is None:
            raise IntegrationError("observation trigger was not found")
        record = dict(row)
        record["outcome"] = json.loads(record["outcome_json"])
        return record

    def observations(self, project_id: str) -> List[Dict[str, Any]]:
        rows = self._conn.execute(
            "SELECT * FROM dockyard_observation_triggers WHERE project_id=?"
            " ORDER BY created_at, initiative_ref",
            (project_id,),
        ).fetchall()
        out = []
        for row in rows:
            record = dict(row)
            record["outcome"] = json.loads(record["outcome_json"])
            out.append(record)
        return out

    def recover_stale_observations(
        self, project_id: Optional[str] = None, *, stale_after_seconds: int = 900,
    ) -> List[str]:
        """Return STALE 'running' rows to 'pending' after a crash/restart.

        Scope and evidence rules (review fixes):
        - Only rows of ``project_id`` are considered when given — reconciling
          project A must never touch project B's observations.
        - A running row is stale only when its updated_at is older than
          ``stale_after_seconds`` (a recently-claimed row may be genuinely
          ACTIVE work — resetting it would hijack a live worker).
        - Honest recovery: the observation did not complete, so the row goes
          back to pending and is reported — never marked complete, never
          re-run silently inside recovery.
        """
        cutoff = self._iso_minus(seconds=stale_after_seconds)
        sql = (
            "SELECT initiative_ref FROM dockyard_observation_triggers"
            " WHERE status='running' AND updated_at < ?"
        )
        params: List[Any] = [cutoff]
        if project_id is not None:
            sql += " AND project_id=?"
            params.append(project_id)
        rows = self._conn.execute(sql, tuple(params)).fetchall()
        stale = [row["initiative_ref"] for row in rows]
        if not stale:
            return []
        placeholders = ",".join("?" for _ in stale)
        with self._store.tx() as cx:
            cx.execute(
                f"UPDATE dockyard_observation_triggers SET status='pending',"
                f" updated_at=? WHERE initiative_ref IN ({placeholders})",
                tuple([self._iso_now(), *stale]),
            )
        return stale

    # ------------------------------------------------------------------ #
    # P3.6 — bounded reconciliation command                              #
    # ------------------------------------------------------------------ #

    def reconcile(
        self,
        project_id: str,
        *,
        actor: str,
        interface: str,
        trigger_type: str = "manual",
    ) -> Dict[str, Any]:
        """One bounded observation-to-outcome pass for a project.

        The connected loop (review defect 4):
        1. recover STALE observation rows of THIS project (crash evidence
           required; other projects untouched);
        2. observe every bound native task through the host read surface
           (read-only, claim-guarded);
        3. reconcile native completions into initiative state with full host
           identity verification (binding + terminal completed run);
        4. run pending post-delivery observations once, forwarding
           ``trigger_type`` to the engine UNCHANGED — the report's
           trigger_type is the trigger the engine actually received.

        Gated by the per-project ``reconciliation`` feature (default OFF).
        """
        if self._service is not None:
            self._service.require_feature(project_id, "reconciliation")
        if self._host is None:
            raise IntegrationError(
                "native host unavailable: reconciliation requires the host"
                " read surface to verify run identity; nothing was changed"
            )
        recovered = self.recover_stale_observations(project_id)

        completed: List[str] = []
        observed_tasks = 0
        # Every bound native task of this project is observed read-only;
        # completions reconcile ONLY with host-proven identity.
        for binding in self._project_bindings(project_id):
            task_id = binding["item_id"]
            ref = binding["initiative_ref"]
            if not ref:
                continue
            # Dedup keys on the OBSERVED STATE, not the bare task id: a new
            # task outcome (state changed since the last pass) must be
            # re-observed, while a replay of the same observation dedupes.
            # Repeated reconciliation is the normal operation of this
            # feature, not an edge case.
            try:
                state = self._probe(task_id)
            except LookupError:
                self._record_reconcile_refusal(
                    ref, task_id, reason="task_not_found"
                )
                continue
            claim_key = (
                f"reconcile:{project_id}:{task_id}:{state['task_status']}"
            )
            try:
                record = self._observe(task_id, claim_key=claim_key)
            except LookupError:
                # Task vanished between probe and observe: stale binding.
                self._record_reconcile_refusal(
                    ref, task_id, reason="task_not_found"
                )
                continue
            if not record:
                # Same state already observed by an earlier pass: honest
                # dedup skip. Nothing new to reconcile for this task.
                continue
            observed_tasks += 1
            if record.get("task_status") == "done":
                completed_run = self._terminal_completed_run(record)
                if completed_run is not None:
                    try:
                        result = self.complete_from_native(
                            ref=ref,
                            outcome={
                                "summary": record.get("last_run_summary") or "",
                                "source": "native-reconcile",
                            },
                            run_id=completed_run,
                            task_id=task_id,
                        )
                        completed.append(result["initiative_ref"])
                        # Close the loop: a proven outcome (re)arms the
                        # post-delivery observation for this initiative.
                        self._schedule_observation(
                            ref, project_id,
                            regressed=result["initiative_status"] == "regressed",
                        )
                    except IntegrationError:
                        # Identity/contract refusal: recorded as an event,
                        # never silently swallowed, never fabricated.
                        self._record_reconcile_refusal(ref, task_id)

        run = 0
        if self._engine is not None:
            for obs in self.observations(project_id):
                if obs["status"] != "pending":
                    continue
                result = self.run_observation(
                    obs["initiative_ref"], trigger_type=trigger_type,
                )
                if result["status"] == "completed":
                    run += 1
        return {
            "project_id": project_id,
            "trigger_type": trigger_type,
            "actor": actor,
            "interface": interface,
            "recovered": recovered,
            "observed_tasks": observed_tasks,
            "completed": completed,
            "observations_run": run,
        }

    def _project_bindings(self, project_id: str) -> List[Dict[str, Any]]:
        rows = self._conn.execute(
            "SELECT b.item_id, b.initiative_ref FROM dockyard_canonical_work_bindings b"
            " WHERE b.project_id=? AND b.item_kind != 'epic'"
            " AND b.initiative_ref IS NOT NULL"
            " ORDER BY b.item_id",
            (project_id,),
        ).fetchall()
        return [dict(r) for r in rows]

    def _observe(self, task_id: str, *, claim_key: str) -> Dict[str, Any]:
        """Observe one task via NativeEventObserver (read-only, claimed)."""
        from .native_events import NativeEventObserver

        return NativeEventObserver(self._store, self._host).observe_task(
            task_id, claim_key=claim_key,
        )

    def _probe(self, task_id: str) -> Dict[str, Any]:
        """Claim-free state read for state-keyed dedup (see reconcile)."""
        from .native_events import NativeEventObserver

        return NativeEventObserver(self._store, self._host).probe_task(task_id)

    def _terminal_completed_run(self, record: Dict[str, Any]) -> Optional[int]:
        """The completed-event run id when the host proves terminal success."""
        if record.get("last_run_outcome") != "completed":
            return None
        return record.get("completed_event_run_id")

    def _record_reconcile_refusal(self, ref: str, task_id: str,
                                  reason: str = "identity_or_contract") -> None:
        with self._store.tx() as cx:
            cx.execute(
                "INSERT INTO domain_events(ts, event_type, project_id, subject,"
                " payload_json, emitted_by) VALUES(?,?,?,?,?,?)",
                (
                    self._iso_now(),
                    "stewardship.reconcile.refused",
                    self._project_of(ref) or "",
                    ref,
                    json.dumps({"task_id": task_id, "reason": reason},
                               sort_keys=True),
                    "reconcile",
                ),
            )

    def _project_of(self, ref: str) -> Optional[str]:
        row = self._conn.execute(
            "SELECT project_id FROM project_initiatives WHERE ref=?", (ref,)
        ).fetchone()
        return row["project_id"] if row else None

    def _schedule_observation(
        self, ref: str, project_id: str, *, regressed: bool,
    ) -> None:
        """Arm (or re-arm) the post-delivery observation for an outcome.

        Reuses the DockyardIntegration trigger-key contract
        (``dockyard-observation:<ref>``) so the same durable row is shared,
        never a second queue.
        """
        trigger_key = f"dockyard-observation:{ref}"
        now = self._iso_now()
        with self._store.tx() as cx:
            cx.execute(
                """
                INSERT INTO dockyard_observation_triggers(
                    initiative_ref,project_id,trigger_key,status,outcome_json,
                    regressed,cycle_id,created_at,updated_at)
                VALUES(?,?,?,?,?,?,NULL,?,?)
                ON CONFLICT(initiative_ref) DO UPDATE SET
                    outcome_json=excluded.outcome_json,
                    regressed=excluded.regressed,
                    updated_at=excluded.updated_at
                """,
                (
                    ref, project_id, trigger_key, "pending",
                    json.dumps(
                        {"source": "native-reconcile"}, sort_keys=True
                    ),
                    1 if regressed else 0,
                    now, now,
                ),
            )

    def _iso_now(self) -> str:
        from datetime import datetime, timezone

        if self._clock is not None:
            return self._clock().isoformat()
        return datetime.now(timezone.utc).isoformat()

    def _iso_minus(self, *, seconds: int) -> str:
        from datetime import datetime, timedelta, timezone

        now = self._clock() if self._clock is not None else datetime.now(timezone.utc)
        return (now - timedelta(seconds=seconds)).isoformat()


def classify_outcome(*, regressed: bool, health_state: str) -> str:
    """P3.5 result classification: improved / regressed / unknown."""
    if health_state in ("", None, "unknown"):
        return "unknown"
    if regressed or health_state in ("degraded", "critical"):
        return "regressed"
    if health_state in ("healthy", "watch"):
        return "improved"
    return "unknown"


__all__ = ["ReconcileService", "classify_outcome", "RESULT_STATES"]
