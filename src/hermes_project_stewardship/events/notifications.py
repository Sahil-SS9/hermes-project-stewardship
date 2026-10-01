"""Notification engine: severity routing, quiet hours, dedupe, resolution.

Consumes domain events and produces notification records per effective
policy = deep-merge(built-in default, app-wide setting, project override).

```json
{"dedupe_window_minutes": 60,
 "quiet_hours": null,
 "bypass_quiet_hours": ["approval_required"],
 "channels": {
   "in_app":  {"min_severity": "low"},
   "desktop": {"enabled": true, "min_severity": "high", "quiet_hours_apply": true}}}
```

Legacy shapes are normalised on write and read:
- a top-level ``min_severity`` becomes ``channels.in_app.min_severity``;
- ``channels`` as a list: ``["desktop"]`` turns pop-ups on, a list without
  it turns pop-ups off; ``"discord"`` is kept but unused until the Discord
  batch;
- unknown keys are rejected (ServiceError → 422 at the API).

Auto-resolve (matching on dedupe_key/subject within the project):
- ``approval_required`` for X resolves when a decision event for X arrives
  (INITIATIVE_APPROVED / INITIATIVE_REJECTED / INITIATIVE_CHANGES_REQUESTED);
- ``health_change`` / ``alert`` for P resolve when HEALTH_CHANGED with
  ``to='healthy'`` arrives for P.

State (derived): resolved_at → resolved; else acked_at → seen; else new.
The badge counts *new* only. Pop-ups: enabled, severity >= desktop.min_severity,
still new, under 24 hours old, not already shown; quiet hours hold them
unless the kind bypasses; evaluated at read time — no scheduler.
"""
from __future__ import annotations

import re
from datetime import datetime, time, timedelta
from typing import Any, Dict, List, Optional, Tuple

from ..events.bus import (
    APPROVAL_REQUIRED,
    EventBus,
    HEALTH_CHANGED,
    INITIATIVE_APPROVED,
    INITIATIVE_REJECTED,
    PROJECT_CRITICAL,
    VERIFICATION_FAILED,
)
from ..persistence.service import ServiceError, StewardshipService
from ..persistence.store import Store, iso

SEVERITY_ORDER = {"info": 0, "low": 1, "medium": 2, "high": 3, "critical": 4}
SEVERITIES = tuple(SEVERITY_ORDER)

# Event type → (kind, severity, dedupe key builder)
_EVENT_MAP = {
    PROJECT_CRITICAL: ("alert", "critical"),
    VERIFICATION_FAILED: ("alert", "high"),
    HEALTH_CHANGED: ("health_change", None),  # severity derived from target state
    APPROVAL_REQUIRED: ("approval_required", "high"),
}

_AUTO_RESOLVE_EVENTS = (INITIATIVE_APPROVED, INITIATIVE_REJECTED)
INITIATIVE_CHANGES_REQUESTED = "initiative.changes_requested"
AUTO_RESOLVE_NOTE = {
    INITIATIVE_APPROVED: "initiative approved: {ref}",
    INITIATIVE_REJECTED: "initiative rejected: {ref}",
    INITIATIVE_CHANGES_REQUESTED: "changes requested: {ref}",
}

DEFAULT_EFFECTIVE_POLICY: Dict[str, Any] = {
    "dedupe_window_minutes": 60,
    "quiet_hours": None,
    "bypass_quiet_hours": ["approval_required"],
    "channels": {
        "in_app": {"min_severity": "low"},
        "desktop": {"enabled": True, "min_severity": "high",
                    "quiet_hours_apply": True},
    },
}

_CHANNEL_SETTINGS: Dict[str, Tuple[str, ...]] = {
    "in_app": ("min_severity",),
    "desktop": ("enabled", "min_severity", "quiet_hours_apply"),
}

_KNOWN_POLICY_KEYS = ("dedupe_window_minutes", "quiet_hours",
                      "bypass_quiet_hours", "channels")
_WINDOW_KEY_RE = re.compile(r"^approval_required:(.+)$")


# --------------------------------------------------------------------- #
# Policy normalisation                                                    #
# --------------------------------------------------------------------- #

def normalize_policy(raw: Any) -> Dict[str, Any]:
    """Normalise a stored/user policy into the canonical effective shape.

    Accepts every legacy shape. Raises ServiceError on unknown keys, bad
    severities or malformed structures (the API maps this to 422).
    """
    if raw is None:
        raw = {}
    if not isinstance(raw, dict):
        raise ServiceError("notification policy must be an object")
    unknown = sorted(set(raw) - set(_KNOWN_POLICY_KEYS + ("min_severity",)))
    if unknown:
        raise ServiceError(f"unknown notification policy keys: {', '.join(unknown)}")
    if "min_severity" in raw:
        # Legacy flat shape: the list's recording threshold.
        sev = raw["min_severity"]
        if sev not in SEVERITIES:
            raise ServiceError(f"invalid min_severity: {sev!r}")
        raw = {k: v for k, v in raw.items() if k != "min_severity"}
        if isinstance(raw.get("channels"), dict):
            # modern shape coexisting with legacy key: keep both sensibly
            raw["channels"] = {"in_app": {"min_severity": sev}, **raw["channels"]}
        elif isinstance(raw.get("channels"), list):
            raw["channels"] = {"in_app": {"min_severity": sev}}
        else:
            raw["channels"] = {"in_app": {"min_severity": sev}}

    policy: Dict[str, Any] = {}

    qh = raw.get("quiet_hours")
    if qh is not None:
        if (not isinstance(qh, dict) or set(qh) != {"start", "end"}
                or not _is_hhmm(qh.get("start")) or not _is_hhmm(qh.get("end"))):
            raise ServiceError(
                'quiet_hours must be {"start": "HH:MM", "end": "HH:MM"}')
    policy["quiet_hours"] = qh

    window = raw.get("dedupe_window_minutes", DEFAULT_EFFECTIVE_POLICY["dedupe_window_minutes"])
    if not isinstance(window, int) or isinstance(window, bool) or window < 1:
        raise ServiceError("dedupe_window_minutes must be a positive integer")
    policy["dedupe_window_minutes"] = window

    bypass = raw.get("bypass_quiet_hours",
                     DEFAULT_EFFECTIVE_POLICY["bypass_quiet_hours"])
    if (not isinstance(bypass, list)
            or not all(k in ("approval_required", "alert", "health_change")
                       for k in bypass)):
        raise ServiceError(
            "bypass_quiet_hours must be a list of notification kinds")
    policy["bypass_quiet_hours"] = list(bypass)

    channels_raw = raw.get("channels", None)
    policy["channels"] = _normalize_channels(channels_raw)
    return policy


def _is_hhmm(value: Any) -> bool:
    return (isinstance(value, str) and len(value) == 5 and value[2] == ":"
            and value[:2].isdigit() and value[3:].isdigit()
            and 0 <= int(value[:2]) <= 23 and 0 <= int(value[3:]) <= 59)


def _normalize_channels(channels_raw: Any) -> Dict[str, Any]:
    channels: Dict[str, Any] = {
        "in_app": dict(DEFAULT_EFFECTIVE_POLICY["channels"]["in_app"]),
        "desktop": dict(DEFAULT_EFFECTIVE_POLICY["channels"]["desktop"]),
    }
    if channels_raw is None:
        return channels
    if isinstance(channels_raw, list):
        # Legacy: a delivery list. "desktop" present → pop-ups on.
        for name in channels_raw:
            if name not in ("desktop", "discord", "in_app"):
                raise ServiceError(f"unknown channel '{name}'")
        channels["desktop"]["enabled"] = "desktop" in channels_raw
        if "discord" in channels_raw:
            # Kept but unused until the Discord batch (Q2 = A).
            channels["discord"] = {"enabled": True}
        return channels
    if isinstance(channels_raw, dict):
        for name, patch in channels_raw.items():
            if name == "discord":
                # Carried but unused until the Discord batch (Q2 = A).
                if not isinstance(patch, dict):
                    raise ServiceError("channels.discord must be an object")
                channels["discord"] = dict(patch)
                continue
            if name not in channels:
                raise ServiceError(f"unknown channel '{name}'")
            if not isinstance(patch, dict):
                raise ServiceError(f"channels.{name} must be an object")
            unknown = sorted(set(patch) - set(_CHANNEL_SETTINGS[name]))
            if unknown:
                raise ServiceError(
                    f"unknown channels.{name} keys: {', '.join(unknown)}")
            if "min_severity" in patch:
                if patch["min_severity"] not in SEVERITIES:
                    raise ServiceError(
                        f"invalid min_severity: {patch['min_severity']!r}")
            if name == "desktop" and "enabled" in patch:
                if not isinstance(patch["enabled"], bool):
                    raise ServiceError("channels.desktop.enabled must be a boolean")
            if name == "desktop" and "quiet_hours_apply" in patch:
                if not isinstance(patch["quiet_hours_apply"], bool):
                    raise ServiceError(
                        "channels.desktop.quiet_hours_apply must be a boolean")
            channels[name].update(patch)
        return channels
    raise ServiceError("channels must be a list (legacy) or an object")


def normalize_or_legacy(raw: Any) -> Tuple[Dict[str, Any], bool]:
    """Normalise policy; True when the input was already in the new shape."""
    if isinstance(raw, dict) and any(k in raw for k in ("channels",)) \
            and isinstance(raw.get("channels"), dict):
        return normalize_policy(raw), True
    return normalize_policy(raw), False


def deep_merge(base: Dict[str, Any], override: Dict[str, Any]) -> Dict[str, Any]:
    """Policy-level deep merge: dicts merge, everything else replaces."""
    merged = dict(base)
    for key, value in (override or {}).items():
        if isinstance(value, dict) and isinstance(merged.get(key), dict):
            merged[key] = deep_merge(merged[key], value)
        else:
            merged[key] = value
    return merged


def effective_policy(app_wide: Optional[Dict[str, Any]],
                     project_override: Optional[Dict[str, Any]]) -> Dict[str, Any]:
    """deep-merge(built-in default, app-wide, project override)."""
    policy = dict(DEFAULT_EFFECTIVE_POLICY)
    for layer in (app_wide, project_override):
        if not layer:
            continue
        norm, _already = normalize_or_legacy(layer)
        policy = deep_merge(policy, norm)
    return policy


# --------------------------------------------------------------------- #
# Event → notification mapping                                            #
# --------------------------------------------------------------------- #

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

    def on_decision_event(self, event_type: str, ref: str,
                          project_id: str) -> None:
        """Host-agnostic decision hook (Batch E2 auto-resolve seam)."""
        self._auto_resolve({
            "event_type": event_type, "subject": ref,
            "project_id": project_id, "payload": {},
        })

    def on_event(self, event: Dict[str, Any]) -> None:
        self.process_event(event)
        self._auto_resolve(event)

    def process_event_and_resolve(self, event: Dict[str, Any]) -> Optional[int]:
        """Record + auto-resolve in one entry (used by direct callers)."""
        nid = self.process_event(event)
        self._auto_resolve(event)
        return nid

    # ------------------------------------------------------------------ #
    # Recording                                                          #
    # ------------------------------------------------------------------ #

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
            policy = self.effective(project_id)
            # E1.4: a project with the notifications feature off records none.
            features = self.svc._features_row(project_id)
            if not features.get("notifications", True):
                return None
        except ServiceError:
            return None

        # Recording threshold (in-app channel decides what is recorded at all).
        in_app = (policy.get("channels") or {}).get("in_app") or {}
        min_sev = in_app.get("min_severity") or DEFAULT_EFFECTIVE_POLICY[
            "channels"]["in_app"]["min_severity"]
        if SEVERITY_ORDER[severity] < SEVERITY_ORDER[min_sev]:
            return None

        title = self._title(event, kind, payload)
        body = self._body(event, kind, payload)
        subject = event.get("subject")
        # Dedupe on WHAT happened, not which cycle saw it: subject is
        # deliberately excluded so repeat signals collapse inside the window.
        if kind == "approval_required":
            dedupe_key = f"approval_required:{subject or ''}"
        else:
            dedupe_key = f"{event['event_type']}:{payload.get('to') or ''}"

        quiet = in_quiet_hours(policy, self.store._clock())
        bypass = kind in (policy.get("bypass_quiet_hours") or [])
        delivered = iso(self.store._clock()) if (not quiet or bypass) else None

        window = int(policy.get("dedupe_window_minutes", 60))
        if self._duplicate_unresolved(project_id, kind, dedupe_key, window):
            return None

        return self.create(
            project_id,
            severity=severity,
            kind=kind,
            title=title,
            body=body,
            dedupe_key=dedupe_key,
            ref=subject if kind == "approval_required" else None,
            delivered_at=delivered,
        )

    def _duplicate_unresolved(self, project_id: str, kind: str,
                              dedupe_key: str, window_minutes: int) -> bool:
        """Dedupe only against UNRESOLVED rows inside the window: a
        recurrence after resolution creates a new notification (E1.5)."""
        cutoff = iso(self._minutes_ago(window_minutes))
        row = self.store._conn.execute(
            "SELECT 1 FROM notifications WHERE project_id=? AND kind=?"
            " AND COALESCE(dedupe_key,'')=? AND created_at >= ?"
            " AND resolved_at IS NULL LIMIT 1",
            (project_id, kind, dedupe_key, cutoff),
        ).fetchone()
        return row is not None

    def _minutes_ago(self, minutes: int) -> datetime:
        from datetime import timedelta

        return self.store._clock() - timedelta(minutes=minutes)

    def effective(self, project_id: str) -> Dict[str, Any]:
        """Effective policy for a project: default + app-wide + override."""
        try:
            row = self.store._conn.execute(
                "SELECT value_json FROM dockyard_app_settings WHERE key=?",
                ("notification_policy",),
            ).fetchone()
        except Exception:
            row = None  # pre-v32 database: app-wide layer simply absent
        app_wide = self.svc.store._uj(row["value_json"], {}) if row is not None else None
        try:
            settings = self.svc.settings(project_id)
        except ServiceError:
            raise
        override = (settings.get("policies") or {}).get("notification") or {}
        return effective_policy(app_wide, override)

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

    # ------------------------------------------------------------------ #
    # Auto-resolve                                                       #
    # ------------------------------------------------------------------ #

    def _auto_resolve(self, event: Dict[str, Any]) -> None:
        etype = str(event.get("event_type"))
        ref = event.get("subject")
        project_id = event.get("project_id")
        if etype == HEALTH_CHANGED:
            if (event.get("payload") or {}).get("to") == "healthy":
                self._auto_resolve_state(
                    project_id, prefixes=("project.health.changed:", "project.critical:"),
                    note="health back to healthy")
            return
        if ref and project_id and (etype in _AUTO_RESOLVE_EVENTS
                                   or etype == INITIATIVE_CHANGES_REQUESTED):
            self._auto_resolve_state(
                project_id, prefixes=(f"approval_required:{ref}",), note=None,
                note_template=AUTO_RESOLVE_NOTE.get(etype),
                note_ref=ref)

    def _auto_resolve_state(
        self,
        project_id: Optional[str],
        *,
        prefixes: Tuple[str, ...],
        note: Optional[str] = None,
        note_template: Optional[str] = None,
        note_ref: Optional[str] = None,
    ) -> None:
        now = iso(self.store._clock())
        with self.store.tx() as cx:
            for prefix in prefixes:
                rows = cx.execute(
                    "SELECT id FROM notifications"
                    " WHERE project_id=? AND dedupe_key LIKE ?"
                    "   AND resolved_at IS NULL",
                    (project_id, prefix + "%"),
                ).fetchall()
                for row in rows:
                    resolved_note = (note_template or note or "").format(
                        ref=note_ref or "") if note_template else (note or "")
                    resolved = cx.execute(
                        "UPDATE notifications SET resolved_at=?, resolved_by='system',"
                        " resolution='auto', resolution_note=?,"
                        " acked_at=COALESCE(acked_at, ?), acked_by=COALESCE(acked_by, 'system')"
                        " WHERE id=? AND resolved_at IS NULL",
                        (now, resolved_note, now, row["id"]),
                    )
                    if resolved.rowcount:
                        cx.execute(
                            "INSERT INTO stewardship_audit_log(ts, actor, interface,"
                            " action, subject, detail_json) VALUES(?,?,?,?,?,?)",
                            (now, "system", "system", "notification.resolved",
                             str(row["id"]),
                             self.svc.store._j({"resolution": "auto",
                                                "note": (note_template or note or "")})),
                        )

    # ------------------------------------------------------------------ #
    # Ack / resolve — one code path (service-side)                        #
    # ------------------------------------------------------------------ #

    def ack(self, notification_id: int, actor: str = "system") -> bool:
        with self.store.tx() as cx:
            row = cx.execute(
                "SELECT resolved_at, acked_at FROM notifications WHERE id=?",
                (notification_id,)).fetchone()
            if row is None:
                raise LookupError(f"notification {notification_id} not found")
            if row["resolved_at"] is not None or row["acked_at"] is not None:
                return False  # idempotent no-op
            cx.execute(
                "UPDATE notifications SET acked_at=?, acked_by=? WHERE id=?",
                (iso(self.store._clock()), actor, notification_id))
            cx.execute(
                "INSERT INTO stewardship_audit_log(ts, actor, interface,"
                " action, subject, detail_json) VALUES(?,?,?,?,?,?)",
                (iso(self.store._clock()), actor, "service",
                 "notification.acked", str(notification_id), "{}"),
            )
        return True

    def resolve(
        self,
        notification_id: int,
        *,
        actor: str = "system",
        resolution: str = "manual",
        note: str = "",
    ) -> bool:
        now = iso(self.store._clock())
        with self.store.tx() as cx:
            row = cx.execute(
                "SELECT resolved_at FROM notifications WHERE id=?",
                (notification_id,)).fetchone()
            if row is None:
                raise LookupError(f"notification {notification_id} not found")
            if row["resolved_at"] is not None:
                return False  # second resolve does nothing
            cx.execute(
                "UPDATE notifications SET resolved_at=?, resolved_by=?,"
                " resolution=?, resolution_note=?,"
                " acked_at=COALESCE(acked_at, ?), acked_by=COALESCE(acked_by, ?)"
                " WHERE id=?",
                (now, actor, resolution, note, now, actor, notification_id))
            cx.execute(
                "INSERT INTO stewardship_audit_log(ts, actor, interface,"
                " action, subject, detail_json) VALUES(?,?,?,?,?,?)",
                (now, actor, "service", "notification.resolved",
                 str(notification_id),
                 self.svc.store._j({"resolution": resolution, "note": note})),
            )
        return True

    # ------------------------------------------------------------------ #
    # App-wide policy storage (dockyard_app_settings, migration v32)      #
    # ------------------------------------------------------------------ #

    def app_policy(self) -> Dict[str, Any]:
        """Stored app-wide notification policy ({} when never set)."""
        try:
            row = self.store._conn.execute(
                "SELECT value_json FROM dockyard_app_settings WHERE key=?",
                ("notification_policy",),
            ).fetchone()
        except Exception:
            return {}
        return self.svc.store._uj(row["value_json"], {}) if row is not None else {}

    def set_app_policy(self, policy: Any, *, actor: str = "system") -> Dict[str, Any]:
        """Normalise, store and audit the app-wide notification policy."""
        normalised = normalize_policy(policy)
        now = iso(self.store._clock())
        with self.store.tx() as cx:
            cx.execute(
                "INSERT INTO dockyard_app_settings(key, value_json, updated_at, updated_by)"
                " VALUES('notification_policy', ?, ?, ?)"
                " ON CONFLICT(key) DO UPDATE SET value_json=excluded.value_json,"
                " updated_at=excluded.updated_at, updated_by=excluded.updated_by",
                (self.svc.store._j(normalised), now, actor),
            )
            cx.execute(
                "INSERT INTO stewardship_audit_log(ts, actor, interface,"
                " action, subject, detail_json) VALUES(?,?,?,?,?,?)",
                (now, actor, "service", "notification_policy.updated",
                 "app", self.svc.store._j({"policy": normalised})),
            )
        return normalised

    def ack_matching(
        self,
        *,
        project_id: Optional[str] = None,
        kind: Optional[str] = None,
        resolve: bool = False,
        actor: str = "system",
    ) -> int:
        """\"Mark all as seen\": ack (or resolve) every notification matching
        the current filter. Resolved rows are never touched."""
        now = iso(self.store._clock())
        clauses, args = ["resolved_at IS NULL"], []
        if project_id:
            clauses.append("project_id=?")
            args.append(project_id)
        if kind:
            clauses.append("kind=?")
            args.append(kind)
        if resolve:
            sets = ("resolved_at=?, resolved_by=?, resolution='manual',"
                    " resolution_note='', acked_at=COALESCE(acked_at, ?),"
                    " acked_by=COALESCE(acked_by, ?)")
            vals = [now, actor, now, actor]
            action = "notification.resolved"
        else:
            sets = ("acked_at=COALESCE(acked_at, ?), acked_by=COALESCE(acked_by, ?)")
            vals = [now, actor]
            action = "notification.acked"
        with self.store.tx() as cx:
            rows = cx.execute(
                f"SELECT id FROM notifications WHERE {' AND '.join(clauses)}"
                " ORDER BY id LIMIT 500",
                tuple(args),
            ).fetchall()
            for row in rows:
                cx.execute(
                    f"UPDATE notifications SET {sets} WHERE id=?"
                    " AND (resolved_at IS NULL"
                    + ("" if resolve else " AND acked_at IS NULL") + ")",
                    (*vals, row["id"]),
                )
                cx.execute(
                    "INSERT INTO stewardship_audit_log(ts, actor, interface,"
                    " action, subject, detail_json) VALUES(?,?,?,?,?,?)",
                    (now, actor, "service", action, str(row["id"]),
                     self.svc.store._j({"bulk": True})),
                )
        return len(rows)

    # ------------------------------------------------------------------ #
    # Reads                                                              #
    # ------------------------------------------------------------------ #

    @staticmethod
    def _state(row: Any) -> str:
        if row["resolved_at"] is not None:
            return "resolved"
        if row["acked_at"] is not None:
            return "seen"
        return "new"

    def list_notifications(
        self,
        *,
        project_id: Optional[str] = None,
        state: Optional[str] = None,
        kind: Optional[str] = None,
        severity: Optional[str] = None,
        before_id: Optional[int] = None,
        limit: int = 100,
    ) -> List[Dict[str, Any]]:
        clauses, args = [], []
        if project_id:
            clauses.append("n.project_id=?")
            args.append(project_id)
        if kind:
            clauses.append("n.kind=?")
            args.append(kind)
        if severity:
            clauses.append("n.severity=?")
            args.append(severity)
        if state == "new":
            clauses.append("n.acked_at IS NULL AND n.resolved_at IS NULL")
        elif state == "seen":
            clauses.append("n.acked_at IS NOT NULL AND n.resolved_at IS NULL")
        elif state == "resolved":
            clauses.append("n.resolved_at IS NOT NULL")
        if before_id is not None:
            clauses.append("n.id < ?")
            args.append(before_id)
        where = f" WHERE {' AND '.join(clauses)}" if clauses else ""
        sql = (
            "SELECT n.* FROM notifications n" + where
            + " ORDER BY n.created_at DESC, n.id DESC LIMIT ?"
        )
        args.append(limit)
        rows = self.store._conn.execute(sql, tuple(args)).fetchall()
        return [self._public_row(r) for r in rows]

    def counts(self, *, project_id: Optional[str] = None) -> Dict[str, Any]:
        clauses, args = [], []
        if project_id:
            clauses.append("project_id=?")
            args.append(project_id)
        where = f" WHERE {' AND '.join(clauses)}" if clauses else ""
        base_sql = "SELECT n.* FROM notifications n" + where
        rows = self.store._conn.execute(base_sql, tuple(args)).fetchall()
        by_state = {"new": 0, "seen": 0, "resolved": 0}
        by_kind: Dict[str, int] = {}
        by_project: Dict[str, int] = {}
        by_sev: Dict[str, int] = {}
        for r in rows:
            by_state[self._state(r)] = by_state.get(self._state(r), 0) + 1
            by_kind[r["kind"]] = by_kind.get(r["kind"], 0) + 1
            by_project[r["project_id"]] = by_project.get(r["project_id"], 0) + 1
            by_sev[r["severity"]] = by_sev.get(r["severity"], 0) + 1
        return {"state": by_state, "kind": by_kind,
                "project": by_project, "severity": by_sev}

    def popups(
        self,
        *,
        clock_now: Optional[datetime] = None,
        cap: int = 3,
    ) -> Dict[str, Any]:
        """Pop-ups due now: NEW + <24h + not shown + desktop settings allow.

        Quiet hours are evaluated at READ time: items held during quiet
        hours appear here once quiet hours end (or for bypassing kinds).
        """
        now = clock_now or self.store._clock()
        rows = self.store._conn.execute(
            "SELECT * FROM notifications"
            " WHERE resolved_at IS NULL AND acked_at IS NULL"
            "   AND popup_shown_at IS NULL"
            " ORDER BY created_at DESC, id DESC LIMIT 200",
        ).fetchall()
        due: List[Dict[str, Any]] = []
        held_extra = 0
        cutoff = now - timedelta(hours=24)
        for row in rows:
            try:
                created = datetime.fromisoformat(str(row["created_at"]))
            except (TypeError, ValueError):
                continue
            if created.tzinfo is None:
                from datetime import timezone
                created = created.replace(tzinfo=timezone.utc)
            if created < cutoff:
                continue  # older than 24h never pops
            project_id = row["project_id"]
            try:
                policy = self.effective(project_id)
            except ServiceError:
                policy = dict(DEFAULT_EFFECTIVE_POLICY)
            desktop = (policy.get("channels") or {}).get("desktop") or {}
            if not desktop.get("enabled", True):
                continue
            if SEVERITY_ORDER.get(row["severity"], 0) < SEVERITY_ORDER[
                    desktop.get("min_severity", "high")]:
                continue
            quiet = in_quiet_hours(policy, now)
            bypass = row["kind"] in (policy.get("bypass_quiet_hours") or [])
            applies = desktop.get("quiet_hours_apply", True)
            if quiet and applies and not bypass:
                if row["kind"] == "approval_required":
                    pass  # approvals bypass quiet hours by default
                else:
                    held_extra += 1
                    continue
            due.append(self._public_row(row))
            if len(due) >= cap:
                break
        return {"popups": due, "more": max(0, len(rows) - len(due) - held_extra)}

    def mark_popups_shown(self, ids: List[int]) -> int:
        """Set popup_shown_at; idempotent — reprocessing changes nothing."""
        now = iso(self.store._clock())
        marked = 0
        with self.store.tx() as cx:
            for nid in ids:
                cur = cx.execute(
                    "UPDATE notifications SET popup_shown_at=?"
                    " WHERE id=? AND popup_shown_at IS NULL",
                    (now, int(nid)),
                )
                marked += cur.rowcount
        return marked

    # ------------------------------------------------------------------ #
    # Legacy compat                                                      #
    # ------------------------------------------------------------------ #

    def _public_row(self, row: Any) -> Dict[str, Any]:
        out = {
            "id": row["id"],
            "project": row["project_id"],
            "severity": row["severity"],
            "kind": row["kind"],
            "title": row["title"],
            "body": row["body"],
            "created_at": row["created_at"],
            "acked": row["acked_at"] is not None,
            "deep_link": self._deep_link(row),
            "state": self._state(row),
        }
        out["resolved_at"] = row["resolved_at"]
        out["resolved_by"] = row["resolved_by"]
        out["acked_by"] = row["acked_by"] if "acked_by" in row.keys() else None
        out["resolution"] = row["resolution"]
        out["resolution_note"] = row["resolution_note"]
        if "ref" in row.keys():
            out["ref"] = row["ref"]
        return out

    @staticmethod
    def _deep_link(row: Any) -> str:
        kind = row["kind"]
        project_id = row["project_id"]
        body = row["body"] or ""
        ref = row["ref"] if "ref" in row.keys() and row["ref"] else None
        if not ref and kind.startswith("approval"):
            for part in body.split(";"):
                part = part.strip()
                if part.startswith("ref="):
                    ref = part[4:].strip()
                    break
        if kind.startswith("approval"):
            if ref:
                return f"s6:initiative/{ref}"
            if project_id:
                return f"s4:project/{project_id}"
            return "s4:approval-inbox"
        if "health" in kind or "regression" in kind:
            if project_id:
                return f"s1:project/{project_id}"
            return "s1:dashboard"
        if "handoff" in kind or "a2a" in kind:
            return "s5:bot-teams"
        if project_id:
            return f"s2:project/{project_id}"
        return "s2:project-board"

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
        ref: Optional[str] = None,
    ) -> int:
        with self.store.tx() as cx:
            cur = cx.execute(
                """
                INSERT INTO notifications(project_id, severity, kind, title, body,
                                          dedupe_key, channel, delivered_at,
                                          created_at, ref)
                VALUES(?,?,?,?,?,?,?,?,?,?)
                """,
                (
                    project_id, severity, kind, title, body, dedupe_key,
                    ",".join(channels or ["in_app"]), delivered_at,
                    iso(self.store._clock()), ref,
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

    def unacked(self, project_id: str, limit: int = 50) -> List[Dict[str, Any]]:
        rows = self.store._conn.execute(
            "SELECT * FROM notifications WHERE project_id=? AND acked_at IS NULL"
            " ORDER BY id DESC LIMIT ?",
            (project_id, limit),
        ).fetchall()
        return [self._public_row(r) for r in rows]

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

    def flush_queued(self, project_id: Optional[str] = None) -> int:
        """Deliver everything queued (call when quiet hours end)."""
        queued = self.pending_delivery(project_id)
        n = 0
        for rec in queued:
            if self.mark_delivered(rec["id"], "flush"):
                n += 1
        return n