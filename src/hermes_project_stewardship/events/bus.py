"""Domain event bus: structured events with durable persistence.

Emits the PRD §13 vocabulary. Every event is written to `domain_events`
(durability, late-subscriber replay) and dispatched to registered callbacks.
Subscriber exceptions are contained — a broken consumer never breaks the
emitter (the cycle engine).
"""

from __future__ import annotations

import threading
from typing import Any, Callable, Dict, List, Optional

from ..persistence.store import Store, iso

Subscriber = Callable[[Dict[str, Any]], None]

# Canonical event vocabulary (PRD §13 + lifecycle additions).
CYCLE_STARTED = "stewardship.cycle.started"
VERIFICATION_FAILED = "stewardship.verification.failed"
HEALTH_CHANGED = "project.health.changed"
INITIATIVE_PROPOSED = "initiative.proposed"
APPROVAL_REQUIRED = "initiative.approval_required"
INITIATIVE_APPROVED = "initiative.approved"
INITIATIVE_REJECTED = "initiative.rejected"
INITIATIVE_STARTED = "initiative.started"
INITIATIVE_COMPLETED = "initiative.completed"
INITIATIVE_REGRESSED = "initiative.regressed"
PROJECT_CRITICAL = "project.critical"
MUTATIONS_BLOCKED = "cycle.mutations_blocked"


class EventBus:
    def __init__(self, store: Store) -> None:
        self._store = store
        self._subs: Dict[str, List[Subscriber]] = {}
        self._lock = threading.Lock()
        self._wildcards: List[Subscriber] = []

    # ------------------------------------------------------------------ #

    def subscribe(self, event_type: str, fn: Subscriber) -> None:
        """Subscribe to one event type or '*' for all."""
        with self._lock:
            if event_type == "*":
                self._wildcards.append(fn)
            else:
                self._subs.setdefault(event_type, []).append(fn)

    def emit(
        self,
        event_type: str,
        *,
        project_id: Optional[str] = None,
        subject: Optional[str] = None,
        payload: Optional[Dict[str, Any]] = None,
        emitted_by: str = "system",
    ) -> int:
        record = {
            "ts": iso(self._store._clock()),
            "event_type": event_type,
            "project_id": project_id,
            "subject": subject,
            "payload": payload or {},
            "emitted_by": emitted_by,
        }
        with self._store.tx() as cx:
            cur = cx.execute(
                "INSERT INTO domain_events(ts, event_type, project_id, subject,"
                " payload_json, emitted_by) VALUES(?,?,?,?,?,?)",
                (
                    record["ts"],
                    event_type,
                    project_id,
                    subject,
                    self._store._j(payload or {}),
                    emitted_by,
                ),
            )
        event_id = int(cur.lastrowid or 0)
        record["id"] = event_id

        with self._lock:
            subs = list(self._subs.get(event_type, [])) + list(self._wildcards)
        for fn in subs:
            try:
                fn(record)
            except Exception:
                # Consumer isolation: never propagate into the emitter.
                pass
        return event_id

    def recent(self, project_id: Optional[str] = None, limit: int = 50,
               event_type: Optional[str] = None) -> List[Dict[str, Any]]:
        sql = "SELECT * FROM domain_events"
        clauses, args = [], []
        if project_id:
            clauses.append("project_id=?")
            args.append(project_id)
        if event_type:
            clauses.append("event_type=?")
            args.append(event_type)
        if clauses:
            sql += " WHERE " + " AND ".join(clauses)
        sql += " ORDER BY id DESC LIMIT ?"
        args.append(limit)
        rows = self._store._conn.execute(sql, tuple(args)).fetchall()
        return [
            {
                "id": r["id"],
                "ts": r["ts"],
                "event_type": r["event_type"],
                "project_id": r["project_id"],
                "subject": r["subject"],
                "payload": self._store._uj(r["payload_json"], {}),
                "emitted_by": r["emitted_by"],
            }
            for r in rows
        ]
