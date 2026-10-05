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
  (INITIATIVE_APPROVED / INITIATIVE_REJECTED / INITIATIVE_CHANGES_REQUESTED),
  or when the proposer withdraws X before approval (INITIATIVE_WITHDRAWN);
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
    INITIATIVE_WITHDRAWN,
    PROJECT_CRITICAL,
    VERIFICATION_FAILED,
    WORK_ASSIGNED,
    WORK_UNASSIGNED,
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
    # A gentle note (medium: in the app, never a desktop pop-up by default).
    WORK_UNASSIGNED: ("unassigned_work", "medium"),
}

_AUTO_RESOLVE_EVENTS = (INITIATIVE_APPROVED, INITIATIVE_REJECTED, INITIATIVE_WITHDRAWN)
INITIATIVE_CHANGES_REQUESTED = "initiative.changes_requested"
AUTO_RESOLVE_NOTE = {
    INITIATIVE_APPROVED: "initiative approved: {ref}",
    INITIATIVE_REJECTED: "initiative rejected: {ref}",
    INITIATIVE_CHANGES_REQUESTED: "changes requested: {ref}",
    INITIATIVE_WITHDRAWN: "initiative withdrawn: {ref}",
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
# Legacy/alias keys accepted on READ and SAVE (review bug 1):
# - min_severity / severity_threshold: the list's recording threshold;
# - minimum_severity: the real-DB spelling of min_severity;
# - digest, max_open_initiatives: carried keys used elsewhere
#   (propose_initiative reads max_open_initiatives).
_ALIAS_MIN_SEVERITY = ("min_severity", "severity_threshold")
# minimum_severity is deliberately NOT an alias: the review's acceptance wants
# it surfaced under `ignored` (on read) so the old spelling is visible, and
# rejected with 422 on save. Legacy severity vocabulary still present in stored
# settings ("warning" in the real DB) maps onto the current scale's "low".
_LEGACY_SEVERITY_ALIASES = {"warning": "low", "error": "high", "fatal": "critical"}
_CARRIED_POLICY_KEYS = ("digest", "max_open_initiatives")
_WINDOW_KEY_RE = re.compile(r"^approval_required:(.+)$")


# --------------------------------------------------------------------- #
# Policy normalisation                                                    #
# --------------------------------------------------------------------- #

def normalize_policy_strict(raw: Any) -> Dict[str, Any]:
    """Strict validation for SAVING a policy (app-wide PUT, project PATCH).

    Accepts every legacy/alias shape (min_severity, severity_threshold,
    minimum_severity, channels-as-list) plus the carried keys digest and
    max_open_initiatives. Unknown keys or bad values raise ServiceError
    (the API maps this to 422).
    """
    return normalize_policy(raw, strict=True)


def normalize_policy(raw: Any, *, strict: bool = False) -> Dict[str, Any]:
    """Normalise a stored/user policy into the canonical effective shape.

    Accepts every legacy shape. Two modes:

    - **strict=True (saving)**: unknown keys or bad values raise
      ServiceError (→ 422 at the API). Carried keys ``digest`` and
      ``max_open_initiatives`` are accepted and preserved.
    - **strict=False (reading, the default)**: a settings problem must
      never stop a notification. Unknown keys are ignored and reported
      under ``ignored``; invalid values fall back to the default; alias
      keys map onto their new equivalents (a new key wins when both are
      present).
    """
    ignored: List[str] = []
    if raw is None:
        raw = {}
    if not isinstance(raw, dict):
        if strict:
            raise ServiceError("notification policy must be an object")
        return {**normalize_policy({}, strict=False), "ignored": ["<non-object>"]}
    unknown = sorted(
        set(raw) - set(_KNOWN_POLICY_KEYS + _CARRIED_POLICY_KEYS
                       + _ALIAS_MIN_SEVERITY))
    if unknown:
        if strict:
            raise ServiceError(
                f"unknown notification policy keys: {', '.join(unknown)}")
        ignored.extend(unknown)
        raw = {k: v for k, v in raw.items() if k not in unknown}

    # Alias min-severity keys → the list's recording threshold. The new
    # shape (channels.in_app.min_severity) wins when both are present.
    alias_sev = None
    for key in _ALIAS_MIN_SEVERITY:
        if key in raw:
            sev = raw[key]
            sev = _LEGACY_SEVERITY_ALIASES.get(sev, sev)
            if sev in SEVERITIES:
                alias_sev = sev
            elif strict:
                raise ServiceError(f"invalid {key}: {sev!r}")
            else:
                ignored.append(key)
    if alias_sev is not None:
        raw = {k: v for k, v in raw.items() if k not in _ALIAS_MIN_SEVERITY}
        if isinstance(raw.get("channels"), dict):
            raw["channels"] = {**raw["channels"]}
            raw["channels"].setdefault(
                "in_app", {"min_severity": alias_sev})
        elif isinstance(raw.get("channels"), list):
            raw["channels"] = {"in_app": {"min_severity": alias_sev}}
        else:
            raw["channels"] = {"in_app": {"min_severity": alias_sev}}

    policy: Dict[str, Any] = {}

    qh = raw.get("quiet_hours")
    if qh is not None:
        if (not isinstance(qh, dict) or set(qh) != {"start", "end"}
                or not _is_hhmm(qh.get("start")) or not _is_hhmm(qh.get("end"))):
            if strict:
                raise ServiceError(
                    'quiet_hours must be {"start": "HH:MM", "end": "HH:MM"}')
            ignored.append("quiet_hours")
            qh = None
    policy["quiet_hours"] = qh

    window = raw.get("dedupe_window_minutes",
                     DEFAULT_EFFECTIVE_POLICY["dedupe_window_minutes"])
    if not isinstance(window, int) or isinstance(window, bool) or window < 1:
        if strict:
            raise ServiceError("dedupe_window_minutes must be a positive integer")
        ignored.append("dedupe_window_minutes")
        window = DEFAULT_EFFECTIVE_POLICY["dedupe_window_minutes"]
    policy["dedupe_window_minutes"] = window

    bypass = raw.get("bypass_quiet_hours",
                     DEFAULT_EFFECTIVE_POLICY["bypass_quiet_hours"])
    if (not isinstance(bypass, list)
            or not all(k in ("approval_required", "alert", "health_change")
                       for k in bypass)):
        if strict:
            raise ServiceError(
                "bypass_quiet_hours must be a list of notification kinds")
        ignored.append("bypass_quiet_hours")
        bypass = DEFAULT_EFFECTIVE_POLICY["bypass_quiet_hours"]
    policy["bypass_quiet_hours"] = list(bypass)

    channels_raw = raw.get("channels", None)
    if isinstance(channels_raw, list):
        # Legacy: a delivery list. "desktop" present → pop-ups on.
        names_ok = all(n in ("desktop", "discord", "in_app") for n in channels_raw)
        if not names_ok:
            if strict:
                bad = [n for n in channels_raw
                       if n not in ("desktop", "discord", "in_app")]
                raise ServiceError(
                    f"unknown channel(s): {', '.join(map(str, bad))}")
            ignored.append("channels")
            channels_raw = None
    elif channels_raw is not None and not isinstance(channels_raw, dict):
        if strict:
            raise ServiceError("channels must be a list (legacy) or an object")
        ignored.append("channels")
        channels_raw = None
    if channels_raw is not None:
        try:
            policy["channels"] = _normalize_channels(channels_raw, strict=strict)
        except ServiceError:
            if strict:
                raise
            ignored.append("channels")
            policy["channels"] = _normalize_channels(None)
    else:
        policy["channels"] = _normalize_channels(None)

    # Carried keys ride along unchanged (digest, max_open_initiatives).
    for key in _CARRIED_POLICY_KEYS:
        if key in raw:
            policy[key] = raw[key]

    if ignored:
        policy["ignored"] = sorted(set(ignored))
    return policy


def _is_hhmm(value: Any) -> bool:
    return (isinstance(value, str) and len(value) == 5 and value[2] == ":"
            and value[:2].isdigit() and value[3:].isdigit()
            and 0 <= int(value[:2]) <= 23 and 0 <= int(value[3:]) <= 59)


def _normalize_channels(channels_raw: Any, *, strict: bool = False) -> Dict[str, Any]:
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
                if strict:
                    raise ServiceError(f"unknown channel '{name}'")
                continue
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
                    if strict:
                        raise ServiceError("channels.discord must be an object")
                    continue
                channels["discord"] = dict(patch)
                continue
            if name not in channels:
                if strict:
                    raise ServiceError(f"unknown channel '{name}'")
                continue
            if not isinstance(patch, dict):
                if strict:
                    raise ServiceError(f"channels.{name} must be an object")
                continue
            unknown = sorted(set(patch) - set(_CHANNEL_SETTINGS[name]))
            if unknown:
                if strict:
                    raise ServiceError(
                        f"unknown channels.{name} keys: {', '.join(unknown)}")
                patch = {k: v for k, v in patch.items() if k in _CHANNEL_SETTINGS[name]}
                if not patch:
                    continue
            if "min_severity" in patch:
                if patch["min_severity"] not in SEVERITIES:
                    if strict:
                        raise ServiceError(
                            f"invalid min_severity: {patch['min_severity']!r}")
                    patch = {k: v for k, v in patch.items()
                             if k != "min_severity"}
                    if not patch:
                        continue
            if name == "desktop" and "enabled" in patch:
                if not isinstance(patch["enabled"], bool):
                    if strict:
                        raise ServiceError(
                            "channels.desktop.enabled must be a boolean")
                    patch = {k: v for k, v in patch.items() if k != "enabled"}
                    if not patch:
                        continue
            if name == "desktop" and "quiet_hours_apply" in patch:
                if not isinstance(patch["quiet_hours_apply"], bool):
                    if strict:
                        raise ServiceError(
                            "channels.desktop.quiet_hours_apply must be a boolean")
                    patch = {k: v for k, v in patch.items()
                             if k != "quiet_hours_apply"}
                    if not patch:
                        continue
            channels[name].update(patch)
        return channels
    if strict:
        raise ServiceError("channels must be a list (legacy) or an object")
    return channels


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
    """deep-merge(built-in default, app-wide, project override) — sparsely.

    Each layer keeps only what the user actually set, so a project that
    overrides one key does not reset the rest of the stack to defaults
    (review bug 3). The merge fills the defaults in at the end.
    """
    def sparse(layer: Optional[Dict[str, Any]]) -> Dict[str, Any]:
        """Normalise a layer but keep ONLY what the user actually set.

        normalize_policy fills defaults; here every top-level key (and
        channel sub-key) the layer did not specify is removed again, so a
        partial override cannot reset other layers' values (review bug 3).
        """
        if not layer:
            return {}
        norm = normalize_policy(layer)
        norm.pop("ignored", None)
        # A legacy alias (min_severity / severity_threshold /
        # minimum_severity) explicitly sets the in-app threshold even though
        # the raw layer has no "channels" key — the alias mapping IS the
        # user's setting, so treat channels as provided via the alias.
        alias_present = any(k in layer for k in _ALIAS_MIN_SEVERITY)
        keep: Dict[str, Any] = {}
        for key, value in norm.items():
            if key == "channels":
                raw_channels = layer.get("channels") or {}
                provided = (raw_channels if isinstance(raw_channels, dict)
                            else {name: {} for name in raw_channels})
                if alias_present and not provided:
                    # The threshold arrived via a legacy alias: keep the
                    # mapped in_app sub-policy whole (it IS the user's set).
                    provided = {"in_app": None}
                kept_channels: Dict[str, Any] = {}
                for name, sub in value.items():
                    if name not in provided:
                        continue
                    raw_sub = provided.get(name)
                    if raw_sub is None:
                        kept_channels[name] = sub  # alias-provided: keep whole
                    elif isinstance(sub, dict):
                        allowed = (set(raw_sub) if isinstance(raw_sub, dict)
                                   else set())
                        kept_channels[name] = {
                            k: v for k, v in sub.items() if k in allowed}
                    else:
                        kept_channels[name] = sub
                if kept_channels:
                    keep["channels"] = kept_channels
                continue
            if key in layer:
                keep[key] = value
        return keep

    merged: Dict[str, Any] = {}
    for layer in (sparse(app_wide), sparse(project_override)):
        merged = deep_merge(merged, layer)
    policy = deep_merge(DEFAULT_EFFECTIVE_POLICY, merged)
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


def _machine_zone() -> str:
    """The machine's IANA zone name; 'UTC' only when nothing else is known."""
    try:
        import os
        from pathlib import Path

        link = Path("/etc/localtime")
        if link.is_symlink():
            target = os.readlink(link)
            bits = target.split("zoneinfo/")
            if len(bits) > 1 and bits[-1]:
                return bits[-1]
    except Exception:
        pass
    import time as _time

    name = getattr(_time, "tzname", (None, None))
    return name[0] if name and name[0] else "UTC"


def in_quiet_hours(policy: Dict[str, Any], now: datetime) -> bool:
    """Quiet-hours check in LOCAL wall time (review bug 6).

    ``now`` must already be an aware datetime in the zone the caller wants
    evaluated: the engine converts its store clock (UTC) into the configured
    zone before calling. Comparing UTC wall time would put UK quiet hours an
    hour off during summer time.
    """
    qh = policy.get("quiet_hours") or None
    if not qh:
        return False
    start = _parse_hhmm(qh["start"])
    end = _parse_hhmm(qh["end"])
    if now.tzinfo is None:
        from datetime import timezone as _tz

        now = now.replace(tzinfo=_tz.utc)
    t = now.timetz().replace(tzinfo=None)
    if start <= end:
        return start <= t < end
    # overnight window (e.g. 22:00→07:00)
    return t >= start or t < end


def wire_notification_stack(store: Store, svc: StewardshipService,
                            *, zone: Optional[str] = None):
    """One shared wiring function (review bug 2).

    Every host that builds a StewardshipService capable of proposing or
    deciding initiatives MUST construct its bus, notification engine and
    decision hook through this function, so agent-proposed initiatives
    raise approval notifications on every interface. Read-only
    constructions (report/settings readers) are exempt.
    """
    from ..events.bus import EventBus

    bus = EventBus(store)
    engine = NotificationEngine(store, svc, zone=zone)
    engine.attach(bus)
    svc.attach_event_bus(bus)
    svc.on_decision(
        lambda etype, ref, pid: engine.on_decision_event(etype, ref, pid))
    return bus, engine


class NotificationEngine:
    def __init__(self, store: Store, service: StewardshipService,
                 *, zone: Optional[str] = None) -> None:
        self.store = store
        self.svc = service
        # Review bug 6: quiet hours are UK local wall time, not UTC. The zone
        # is injectable (hosts/tests pin it); default = the machine's zone.
        self.zone_name = zone or _machine_zone()

    def _zone(self):
        from zoneinfo import ZoneInfo

        return ZoneInfo(self.zone_name)

    def _local_now(self) -> datetime:
        """Store clock (UTC) converted into the engine's configured zone."""
        return self.store._clock().astimezone(self._zone())

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

        # E1.4: a project with the notifications feature off records none.
        # Checked independently of the policy: a settings problem must never
        # stop a notification from being recorded (review bug 1), but the
        # feature gate still must.
        try:
            features = self.svc._features_row(project_id)
            if not features.get("notifications", True):
                return None
        except Exception:
            features = {}
        try:
            policy = self.effective(project_id)
        except Exception:
            # A settings problem must never stop a notification from being
            # recorded (review bug 1): fall back to the built-in default.
            policy = dict(DEFAULT_EFFECTIVE_POLICY)

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
        if kind in ("approval_required", "unassigned_work"):
            # One open notification per item, whichever cycle or screen raised it.
            dedupe_key = f"{kind}:{subject or ''}"
        else:
            dedupe_key = f"{event['event_type']}:{payload.get('to') or ''}"

        quiet = in_quiet_hours(policy, self._local_now())
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
            ref=subject if kind in ("approval_required", "unassigned_work") else None,
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
        if etype == WORK_UNASSIGNED:
            title = payload.get("title")
            return f"{event.get('subject')}{f' {title}' if title else ''} is unassigned"
        return etype

    @staticmethod
    def _body(event: Dict[str, Any], kind: str, payload: Dict[str, Any]) -> str:
        if event.get("event_type") == WORK_UNASSIGNED:
            return "No bot will pick it up until it is assigned."
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
        if etype == WORK_ASSIGNED:
            if ref and project_id:
                self._auto_resolve_state(
                    project_id, kinds=("unassigned_work",),
                    dedupe_key=f"unassigned_work:{ref}", note=None,
                    note_template="assigned: {ref}", note_ref=ref)
            return
        if etype == HEALTH_CHANGED:
            if (event.get("payload") or {}).get("to") == "healthy":
                # Plan rule: ALL health_change and alert notifications for the
                # project resolve — match on kind, not dedupe-key prefix, so
                # verification-failed alerts (stewardship.verification.failed:*)
                # close too (review bug 4).
                self._auto_resolve_state(
                    project_id, kinds=("health_change", "alert"),
                    note="health back to healthy")
            return
        if ref and project_id and (etype in _AUTO_RESOLVE_EVENTS
                                   or etype == INITIATIVE_CHANGES_REQUESTED):
            self._auto_resolve_state(
                project_id, kinds=("approval_required",),
                dedupe_key=f"approval_required:{ref}", note=None,
                note_template=AUTO_RESOLVE_NOTE.get(etype),
                note_ref=ref)

    def _auto_resolve_state(
        self,
        project_id: Optional[str],
        *,
        kinds: Tuple[str, ...] = (),
        dedupe_key: Optional[str] = None,
        note: Optional[str] = None,
        note_template: Optional[str] = None,
        note_ref: Optional[str] = None,
    ) -> None:
        now = iso(self.store._clock())
        with self.store.tx() as cx:
            clauses = ["project_id=?", "resolved_at IS NULL"]
            args: List[Any] = [project_id]
            if kinds:
                clauses.append(
                    f"kind IN ({','.join('?' * len(kinds))})")
                args.extend(kinds)
            if dedupe_key is not None:
                clauses.append("dedupe_key=?")
                args.append(dedupe_key)
            rows = cx.execute(
                f"SELECT id FROM notifications WHERE {' AND '.join(clauses)}",
                tuple(args),
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
        """Normalise, store and audit the app-wide notification policy.

        Saving validates strictly (review bug 1): unknown keys raise
        ServiceError → 422; legacy/alias and carried keys are accepted.
        """
        normalised = normalize_policy_strict(policy)
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
        severity: Optional[str] = None,
        actor: str = "system",
    ) -> int:
        """"Mark all as seen": ack every notification still NEW that matches
        the filter (review bug 5). Only rows actually changed are counted and
        audited; already-seen rows are untouched, so a second run returns 0
        and writes no audit rows."""
        now = iso(self.store._clock())
        clauses = ["resolved_at IS NULL", "acked_at IS NULL"]
        args: List[Any] = []
        if project_id:
            clauses.append("project_id=?")
            args.append(project_id)
        if kind:
            clauses.append("kind=?")
            args.append(kind)
        if severity:
            clauses.append("severity=?")
            args.append(severity)
        changed = 0
        with self.store.tx() as cx:
            rows = cx.execute(
                f"SELECT id FROM notifications WHERE {' AND '.join(clauses)}"
                " ORDER BY id LIMIT 500",
                tuple(args),
            ).fetchall()
            for row in rows:
                cur = cx.execute(
                    "UPDATE notifications SET acked_at=?, acked_by=?"
                    " WHERE id=? AND resolved_at IS NULL AND acked_at IS NULL",
                    (now, actor, row["id"]),
                )
                if cur.rowcount:
                    changed += 1
                    cx.execute(
                        "INSERT INTO stewardship_audit_log(ts, actor, interface,"
                        " action, subject, detail_json) VALUES(?,?,?,?,?,?)",
                        (now, actor, "service", "notification.acked",
                         str(row["id"]),
                         self.svc.store._j({"bulk": True})),
                    )
        return changed

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
        extra_due = 0
        held_extra = 0
        local_now = now.astimezone(self._zone())
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
                continue  # pop-ups off: never pops, never counted (bug 8)
            if SEVERITY_ORDER.get(row["severity"], 0) < SEVERITY_ORDER[
                    desktop.get("min_severity", "high")]:
                continue  # below threshold: never pops, never counted (bug 8)
            quiet = in_quiet_hours(policy, local_now)
            bypass = row["kind"] in (policy.get("bypass_quiet_hours") or [])
            applies = desktop.get("quiet_hours_apply", True)
            if quiet and applies and not bypass:
                held_extra += 1
                continue  # held during quiet hours; due when they end
            if len(due) >= cap:
                extra_due += 1  # passes every rule but beyond the cap
                continue
            due.append(self._public_row(row))
        # "And N more" counts only rows that pass EVERY pop-up rule: the
        # due list beyond the cap, plus rows held by quiet hours (bug 8).
        return {"popups": due, "more": max(0, extra_due + held_extra)}

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
        if kind == "unassigned_work" and ref:
            return f"s2:work/{ref}"
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