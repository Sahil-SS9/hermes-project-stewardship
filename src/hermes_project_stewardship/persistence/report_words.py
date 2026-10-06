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
