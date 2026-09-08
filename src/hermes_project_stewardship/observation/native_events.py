"""Native event observation: trace native task events to Dockyard work.

Observer-only contract (plan P3.1): this module READS the native host's task
records, lifecycle events and run history, and writes observations to the
stewardship store's durable event log. It never mutates native state and
never executes work — callbacks stay short and side-effect free.

The native read surface is three host methods — ``get_task``,
``get_task_events``, ``get_task_runs`` — exposed by ProjectKanbanHost and
passed through ProjectKanbanHostAdapter, so the same code path serves the
pinned vanilla host and test fakes. Task→initiative tracing uses the existing
``dockyard_canonical_work_bindings`` table (the mapping already written during
approval/binding) — never a second metadata store (P3.2).
"""
from __future__ import annotations

import json
from typing import Any, Dict, List, Optional

COMPLETED_EVENT = "completed"


class NativeEventObserver:
    """Read-only observer over native task lifecycle events.

    ``store`` may be None when observing purely against a host (real-host
    lane); tracing then still resolves through the host-side binding lookup
    but nothing is persisted. When a Store is provided, observations are
    recorded into ``domain_events`` (same durability path the event bus uses)
    and claims are taken through ``Store.claim_event`` so replayed events
    never double-execute.
    """

    def __init__(self, store: Any, host: Any, *, clock=None) -> None:
        self._store = store
        self._host = host
        self._clock = clock

    # ------------------------------------------------------------------ #
    # Native read surface (host methods, never SQL shortcuts)            #
    # ------------------------------------------------------------------ #

    def _read_task(self, task_id: str) -> Dict[str, Any]:
        """Read the native task through the host contract.

        Accepts any of: the vanilla host (``get_task`` envelope), the
        adapter (``get_work`` needs project/kind, so host passthrough is
        preferred), or a direct host-side ``get_task`` returning a record.
        """
        host = self._host
        get_task = getattr(host, "get_task", None)
        if callable(get_task):
            raw = get_task(task_id)
            if isinstance(raw, dict) and isinstance(raw.get("task"), dict):
                return dict(raw["task"])
            return dict(raw)
        raise LookupError(
            f"observation host does not expose get_task (task {task_id})"
        )

    def _read_events(self, task_id: str) -> List[Dict[str, Any]]:
        """Read lifecycle events through the host contract.

        ProjectKanbanHost exposes the real ``list_events`` from vanilla; the
        adapter and fake hosts may expose ``get_task_events``.
        """
        host = self._host
        reader = getattr(host, "get_task_events", None) or getattr(
            host, "list_events", None
        )
        if not callable(reader):
            return []
        events = reader(task_id) or []
        if events and not isinstance(events[0], dict):
            return [
                {
                    "kind": str(getattr(e, "kind", "")),
                    "payload": getattr(e, "payload", None),
                    "created_at": getattr(e, "created_at", None),
                    "run_id": getattr(e, "run_id", None),
                }
                for e in events
            ]
        return [dict(e) for e in events]

    def _read_runs(self, task_id: str) -> List[Dict[str, Any]]:
        """Read run history through the host contract."""
        host = self._host
        reader = getattr(host, "get_task_runs", None)
        if not callable(reader):
            return []
        runs = reader(task_id) or []
        if runs and not isinstance(runs[0], dict):
            return [dict(r) for r in runs]
        return [dict(r) for r in runs]

    def _binding_for(self, task_id: str) -> Optional[Dict[str, Any]]:
        if self._store is None:
            return None
        row = self._store._conn.execute(
            "SELECT project_id, initiative_ref FROM dockyard_canonical_work_bindings"
            " WHERE item_kind != 'epic' AND item_id=?",
            (task_id,),
        ).fetchone()
        if row is None:
            return None
        return {"project_id": row["project_id"],
                "initiative_ref": row["initiative_ref"]}

    # ------------------------------------------------------------------ #
    # Observation                                                        #
    # ------------------------------------------------------------------ #

    def probe_task(self, task_id: str) -> Dict[str, Any]:
        """Read the task's current identity WITHOUT claiming.

        Cheap, claim-free state read used to derive a state-keyed claim:
        reconciliation needs dedup that distinguishes a NEW task outcome
        (state changed → re-observe) from a replay of the SAME observation
        (state unchanged → suppressed). Never mutates anything.
        """
        task = self._read_task(task_id)
        return {"task_id": task_id,
                "task_status": str(task.get("status", ""))}

    def observe_task(self, task_id: str, *, claim_key: Optional[str] = None) -> Dict[str, Any]:
        """Observe one native task: identity, outcome evidence, tracing.

        Returns one record (never a list): task identity, host outcome
        evidence (completed-event run id, run history, last run outcome) and
        the initiative binding. With ``claim_key`` set against a Store, a
        lost claim returns ``{}`` — replay suppression at the observation
        boundary. Callers dedupe on a STATE-KEYED claim (see
        ``probe_task``): a new task outcome must re-observe, only an
        identical same-state replay is suppressed.
        """
        if claim_key is not None:
            if self._store is None:
                raise ValueError("claim_key requires a store to claim against")
            if not self._store.claim_event(claim_key, holder="native-observer"):
                return {}
            claim = "won"
        else:
            claim = "unclaimed"

        try:
            task = self._read_task(task_id)
            events = self._read_events(task_id)
            runs = self._read_runs(task_id)
        except Exception:
            # Release the claim on read failure: a transient host error must
            # not permanently suppress this observation (review defect 3).
            if claim == "won":
                self._store.release_event_claim(
                    claim_key, holder="native-observer"
                )
            raise

        completed_event = next(
            (e for e in reversed(events) if e.get("kind") == COMPLETED_EVENT),
            None,
        )
        last_run = runs[-1] if runs else None
        binding = self._binding_for(task_id)

        record: Dict[str, Any] = {
            "task_id": task_id,
            "task_status": str(task.get("status", "")),
            "completed_event_run_id": (
                completed_event.get("run_id") if completed_event else None
            ),
            "last_run_outcome": last_run.get("outcome") if last_run else None,
            "runs": [
                {"id": r.get("id"), "outcome": r.get("outcome"),
                 "status": r.get("status")}
                for r in runs
            ],
            "project_id": binding.get("project_id") if binding else None,
            "initiative_ref": binding.get("initiative_ref") if binding else None,
            "claim": claim,
        }
        self._persist(record)
        return record

    def _persist(self, record: Dict[str, Any]) -> None:
        if self._store is None:
            return
        payload = {
            "task_id": record["task_id"],
            "task_status": record["task_status"],
            "completed_event_run_id": record["completed_event_run_id"],
            "last_run_outcome": record["last_run_outcome"],
            "initiative_ref": record["initiative_ref"],
        }
        with self._store.tx() as cx:
            cx.execute(
                "INSERT INTO domain_events(ts, event_type, project_id, subject,"
                " payload_json, emitted_by) VALUES(?,?,?,?,?,?)",
                (
                    self._iso_now(),
                    "stewardship.native.task_observed",
                    record["project_id"],
                    record["task_id"],
                    json.dumps(payload, sort_keys=True),
                    "native-observer",
                ),
            )

    def _iso_now(self) -> str:
        from datetime import datetime, timezone

        if self._clock is not None:
            return self._clock().isoformat()
        return datetime.now(timezone.utc).isoformat()
