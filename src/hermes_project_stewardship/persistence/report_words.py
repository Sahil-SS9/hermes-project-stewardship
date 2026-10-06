"""Plain words for generated project reports (C7 Reports, 06/10/2026).

A report is a saved Markdown snapshot that people read, copy and download,
so it uses words rather than code names: dates such as "6 Oct 2026, 11:58
UTC", work status "In progress", policies as "Require tests: yes", and the
Activity tab's names for events. Saved reports keep the words they were
generated with; only new reports change.

EVENT_WORDS mirrors the fixed labels in
hermes_dockyard_plugin/desktop/src/lib/event-vocab.js (the Activity tab).
hermes_dockyard_plugin/desktop/report-words.test.mjs fails if they differ,
so the two cannot drift.
"""
from __future__ import annotations

import re
from datetime import datetime, timezone
from typing import Any, Mapping, Optional

# The Activity tab's label for each event type whose label does not depend on
# the event's details. Every other type reads through sentence(), the same
# fallback rule the tab uses.
EVENT_WORDS = {
    "initiative.proposed": "Initiative proposed",
    "initiative.approval_required": "Approval requested",
    "initiative.approved": "Initiative approved",
    "initiative.rejected": "Initiative rejected",
    "initiative.changes_requested": "Changes requested",
    "initiative.withdrawn": "Initiative withdrawn",
    "initiative.started": "Initiative started",
    "initiative.completed": "Initiative completed",
    "initiative.regressed": "Initiative regressed",
    "project.health.changed": "Health changed",
    "project.critical": "Project critical",
    "stewardship.verification.failed": "Verification failed",
    "stewardship.reasoning.failed": "Proposal step failed",
    "stewardship.cycle.started": "Stewardship check",
    "cycle.mutations_blocked": "Changes blocked",
    "work.assigned": "Work assigned",
    "work.unassigned": "Work unassigned",
}
# initiative.approval_required for a proposal sent back in after changes.
RESUBMITTED_WORDS = "Resubmitted for approval"
_INITIATIVE_TYPES = frozenset(code for code in EVENT_WORDS if code.startswith("initiative."))
# The Activity tab's words for a health state and for what started a check.
HEALTH_WORDS = {"healthy": "Healthy", "watch": "Watch", "degraded": "Degraded",
                "critical": "Critical", "unknown": "Not verified"}
TRIGGER_WORDS = {"manual": "Run on request", "gateway": "Run from a chat command",
                 "webhook": "Run by a webhook", "internal": "Run by Dockyard",
                 "schedule": "Run on schedule", "scheduled": "Run on schedule"}

WORK_STATUS_WORDS = {
    "backlog": "Backlog",
    "in_progress": "In progress",
    "in_review": "In review",
    "done": "Done",
    "blocked": "Blocked",
}

# Fixed English month names: strftime("%b") follows the process locale.
_MONTHS = ("Jan", "Feb", "Mar", "Apr", "May", "Jun",
           "Jul", "Aug", "Sep", "Oct", "Nov", "Dec")


def sentence(value: Any) -> str:
    """A code name as words, the Desktop rule: "milestone.created" -> "Milestone created"."""
    words = " ".join(re.sub(r"[._]+", " ", str(value or "")).split())
    return words[:1].upper() + words[1:]


def when(value: Any) -> str:
    """An ISO timestamp as "6 Oct 2026, 11:58 UTC". Anything else comes back as it was."""
    text = str(value or "").strip()
    if not text:
        return ""
    try:
        moment = datetime.fromisoformat(text.replace("Z", "+00:00"))
    except ValueError:
        return text
    if moment.tzinfo is None:
        moment = moment.replace(tzinfo=timezone.utc)
    moment = moment.astimezone(timezone.utc)
    return f"{moment.day} {_MONTHS[moment.month - 1]} {moment.year}, {moment:%H:%M} UTC"


def work_status(value: Any) -> str:
    """A work item's status as words: "in_progress" -> "In progress"."""
    code = str(getattr(value, "value", value) or "")
    return WORK_STATUS_WORDS.get(code) or sentence(code) or "Not set"


def _value_words(value: Any) -> str:
    if isinstance(value, bool):
        return "yes" if value else "no"
    if value is None or value == "":
        return "not set"
    if isinstance(value, Mapping):
        return f"({policy(value)})"
    if isinstance(value, (list, tuple)):
        return ", ".join(_value_words(item) for item in value) or "none"
    return str(value)


def policy(values: Optional[Mapping]) -> str:
    """A policy as words, keys in a fixed order:
    {"require_tests": True, "max_open_initiatives": 3} ->
    "Max open initiatives: 3; Require tests: yes". Empty means the defaults apply."""
    if not values:
        return "Default settings"
    return "; ".join(f"{sentence(key)}: {_value_words(values[key])}" for key in sorted(values))


def _text(value: Any) -> str:
    return value.strip() if isinstance(value, str) else ""


def _named(ref: str, name: str) -> str:
    return f"{ref} · {name}" if ref and name else (ref or name)


def detail(event_type: Any, subject: Any, payload: Optional[Mapping] = None, *,
           initiatives: Optional[Mapping] = None, work: Optional[Mapping] = None) -> str:
    """What an event is about, as the Activity tab words it (its title).
    `initiatives` and `work` map a ref to its title, for events that carry
    only the ref. The cases in report-event-cases.json pin both sides."""
    code = str(event_type or "")
    payload = payload or {}
    ref = "" if subject is None else str(subject)
    if code in _INITIATIVE_TYPES:
        return _named(ref, _text(payload.get("title")) or _text((initiatives or {}).get(ref)))
    if code in ("work.assigned", "work.unassigned"):
        return _named(ref, _text(payload.get("title")) or _text((work or {}).get(ref)))
    if code == "project.health.changed":
        before, after = _text(payload.get("from")), _text(payload.get("to"))
        if not after:
            return ""
        health = lambda state: HEALTH_WORDS.get(state) or sentence(state)  # noqa: E731
        return f"{health(before)} → {health(after)}" if before else health(after)
    if code == "project.critical":
        return "Health is critical"
    if code == "stewardship.verification.failed":
        found = payload.get("contradictions")
        count = len(found) if isinstance(found, list) else 0
        return f"{count} contradiction{'' if count == 1 else 's'} found" if count else "The evidence did not check out"
    if code == "stewardship.reasoning.failed":
        return "The proposal step stopped with an error"
    if code == "stewardship.cycle.started":
        trigger = _text(payload.get("trigger_type"))
        return TRIGGER_WORDS.get(trigger) or (f"Run: {sentence(trigger).lower()}" if trigger else "Run")
    if code == "cycle.mutations_blocked":
        return _text(payload.get("reason"))
    return ref


def actor(emitted_by: Any, payload: Optional[Mapping] = None) -> str:
    """Who an event is by, as the Activity tab says it: the person named in
    the event's details, else who sent it, and "System" for the system."""
    named = str((payload or {}).get("actor") or "").strip()
    sender = str(emitted_by or "").strip()
    return named or (sender if sender and sender != "system" else "System")


def event(event_type: Any, payload: Optional[Mapping] = None) -> str:
    """An event's name as the Activity tab shows it."""
    code = str(event_type or "")
    if code == "initiative.approval_required" and (payload or {}).get("resubmitted") is True:
        return RESUBMITTED_WORDS
    return EVENT_WORDS.get(code) or sentence(code) or "Project event"
