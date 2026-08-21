"""Notification policy engine: severity routing, quiet hours, dedupe, acks.

Consumes domain events and produces notification records per project policy:

```json
{
  "min_severity": "low",
  "quiet_hours": {"start": "22:00", "end": "07:00"},
  "dedupe_window_minutes": 60,
  "bypass_quiet_hours": ["approval_required"],
  "channels": ["discord", "desktop"]
}
```

Rules:
- events below min_severity are dropped entirely;
- during quiet hours, notifications are QUEUED (delivered_at NULL) unless
  their kind is in bypass_quiet_hours (approvals are actionable — default on);
- identical (project, kind, dedupe_key) inside the dedupe window collapse to
  one record — the notification-storm defence at the message layer;
- every record persists with ack state for alert-fatigue metrics.
"""

from __future__ import annotations

from datetime import datetime, time
from typing import Any, Dict, List, Optional

from ..events.bus import (
    APPROVAL_REQUIRED,
    EventBus,
    HEALTH_CHANGED,
    PROJECT_CRITICAL,
    VERIFICATION_FAILED,
)
from ..persistence.service import ServiceError, StewardshipService
from ..persistence.store import Store, iso

SEVERITY_ORDER = {"info": 0, "low": 1, "medium": 2, "high": 3, "critical": 4}

# Event type → (kind, severity, dedupe key builder)
_EVENT_MAP = {
    PROJECT_CRITICAL: ("alert", "critical"),
    VERIFICATION_FAILED: ("alert", "high"),
    HEALTH_CHANGED: ("health_change", None),  # severity derived from target state
    APPROVAL_REQUIRED: ("approval_required", "high"),
}

DEFAULT_POLICY: Dict[str, Any] = {
    "min_severity": "low",
    "quiet_hours": None,
    "dedupe_window_minutes": 60,
    "bypass_quiet_hours": ["approval_required"],
    "channels": ["desktop"],
}


def _severity_for_health_change(payload: Dict[str, Any]) -> str:
    target = (payload or {}).get("to") or ""
    return {
        "critical": "critical",
        "unknown": "high",
        "degraded": "medium",
        "watch": "low",
        "healthy": "info",
    }.get(target, "low")


def _parse_hhmm(value: str) -> time:
    hh, mm = value.split(":")
    return time(int(hh), int(mm))


def in_quiet_hours(policy: Dict[str, Any], now: datetime) -> bool:
    qh = policy.get("quiet_hours") or None
    if not qh:
        return False
    start = _parse_hhmm(qh["start"])
    end = _parse_hhmm(qh["end"])
    t = now.time()
    if start <= end:
        return start <= t < end
    # overnight window (e.g. 22:00→07:00)
    return t >= start or t < end


class NotificationEngine:
    def __init__(self, store: Store, service: StewardshipService) -> None:
        self.store = store
        self.svc = service

    # ------------------------------------------------------------------ #
    # Bus wiring                                                         #
    # ------------------------------------------------------------------ #

    def attach(self, bus: EventBus) -> None:
        bus.subscribe("*", self.on_event)

    def on_event(self, event: Dict[str, Any]) -> None:
        self.process_event(event)

    def process_event(self, event: Dict[str, Any]) -> Optional[int]:
        mapping = _EVENT_MAP.get(str(event.get("event_type")))
        if mapping is None:
            return None
        kind, fixed_sev = mapping
        payload = event.get("payload") or {}
        severity = fixed_sev or _severity_for_health_change(payload)
        project_id = event.get("project_id")
        if not project_id:
            return None

        try:
            settings = self.svc.settings(project_id)
        except ServiceError:
            return None
        policy = dict(DEFAULT_POLICY)
        policy.update(settings["policies"].get("notification") or {})

        if SEVERITY_ORDER[severity] < SEVERITY_ORDER[policy["min_severity"]]:
            return None

        title = self._title(event, kind, payload)
        body = self._body(event, kind, payload)
        # Dedupe on WHAT happened, not which cycle saw it: subject is
        # deliberately excluded so repeat signals collapse inside the window.
        dedupe_key = f"{event['event_type']}:{payload.get('to') or ''}"

        quiet = in_quiet_hours(policy, self.store._clock())
        bypass = kind in (policy.get("bypass_quiet_hours") or [])
        delivered = iso(self.store._clock()) if (not quiet or bypass) else None

        window = int(policy.get("dedupe_window_minutes", 60))
        if self._duplicate_recently(project_id, kind, dedupe_key, window):
            return None

        return self.create(
            project_id,
            severity=severity,
            kind=kind,
            title=title,
            body=body,
            dedupe_key=dedupe_key,
            channels=policy.get("channels") or ["desktop"],
            delivered_at=delivered,
        )

    # ------------------------------------------------------------------ #

    @staticmethod
    def _title(event: Dict[str, Any], kind: str, payload: Dict[str, Any]) -> str:
        etype = event.get("event_type", "")
        if etype == PROJECT_CRITICAL:
            return f"CRITICAL: {event.get('project_id')}"
        if etype == VERIFICATION_FAILED:
            return f"Verification failed: {event.get('project_id')}"
        if etype == HEALTH_CHANGED:
            return f"{event.get('project_id')}: health {payload.get('from') or 'none'} → {payload.get('to')}"
        if etype == APPROVAL_REQUIRED:
            return f"Approval needed: {event.get('subject')}"
        return etype

    @staticmethod
    def _body(event: Dict[str, Any], kind: str, payload: Dict[str, Any]) -> str:
        parts = []
        if payload.get("score") is not None:
            parts.append(f"score={payload['score']}")
        contras = payload.get("contradictions") or []
        if contras:
            parts.append(f"{len(contras)} contradiction(s)")
        subject = event.get("subject")
        if subject:
            parts.append(f"ref={subject}")
        return "; ".join(parts)

    def _duplicate_recently(self, project_id: str, kind: str,
                            dedupe_key: str, window_minutes: int) -> bool:
        cutoff = iso(self._minutes_ago(window_minutes))
        row = self.store._conn.execute(
            "SELECT 1 FROM notifications WHERE project_id=? AND kind=?"
            " AND COALESCE(dedupe_key,'')=? AND created_at >= ? LIMIT 1",
            (project_id, kind, dedupe_key, cutoff),
        ).fetchone()
        return row is not None

    def _minutes_ago(self, minutes: int) -> datetime:
        from datetime import timedelta

        return self.store._clock() - timedelta(minutes=minutes)

    # ------------------------------------------------------------------ #
    # CRUD                                                               #
    # ------------------------------------------------------------------ #

    def create(
        self,
        project_id: str,
        *,
        severity: str,
        kind: str,
        title: str,
        body: str = "",
        dedupe_key: Optional[str] = None,
        channels: Optional[List[str]] = None,
        delivered_at: Optional[str] = None,
    ) -> int:
        with self.store.tx() as cx:
            cur = cx.execute(
                """
                INSERT INTO notifications(project_id, severity, kind, title, body,
                                          dedupe_key, channel, delivered_at, created_at)
                VALUES(?,?,?,?,?,?,?,?,?)
                """,
                (
                    project_id, severity, kind, title, body, dedupe_key,
                    ",".join(channels or []), delivered_at, iso(self.store._clock()),
                ),
            )
        return int(cur.lastrowid or 0)

    def mark_delivered(self, notification_id: int, channel: str) -> bool:
        with self.store.tx() as cx:
            cur = cx.execute(
                "UPDATE notifications SET delivered_at=?, channel=? WHERE id=?",
                (iso(self.store._clock()), channel, notification_id),
            )
        return cur.rowcount > 0

    def ack(self, notification_id: int) -> bool:
        with self.store.tx() as cx:
            cur = cx.execute(
                "UPDATE notifications SET acked_at=? WHERE id=? AND acked_at IS NULL",
                (iso(self.store._clock()), notification_id),
            )
        return cur.rowcount > 0

    def pending_delivery(self, project_id: Optional[str] = None) -> List[Dict[str, Any]]:
        """Queued (undelivered) records — adapters drain these post-quiet-hours."""
        sql = "SELECT * FROM notifications WHERE delivered_at IS NULL"
        args: List[Any] = []
        if project_id:
            sql += " AND project_id=?"
            args.append(project_id)
        sql += " ORDER BY id ASC LIMIT 200"
        rows = self.store._conn.execute(sql, tuple(args)).fetchall()
        return [dict(r) for r in rows]

    def unacked(self, project_id: str, limit: int = 50) -> List[Dict[str, Any]]:
        rows = self.store._conn.execute(
            "SELECT * FROM notifications WHERE project_id=? AND acked_at IS NULL"
            " ORDER BY id DESC LIMIT ?",
            (project_id, limit),
        ).fetchall()
        return [dict(r) for r in rows]

    def flush_queued(self, project_id: Optional[str] = None) -> int:
        """Deliver everything queued (call when quiet hours end)."""
        queued = self.pending_delivery(project_id)
        n = 0
        for rec in queued:
            if self.mark_delivered(rec["id"], "flush"):
                n += 1
        return n
