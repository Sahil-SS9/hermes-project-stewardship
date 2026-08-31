"""Saved-view query schema (DY-P1-03): validated, versioned, role-aware.

A view's ``filters`` payload is a QuerySchema:

    {
        "version": 1,
        "status": ["done", "in_progress"],      # optional, subset of statuses
        "assignee": "sahil",                    # optional exact match
        "labels": ["urgent"],                   # optional, any-of
        "milestone": "v0.2",                    # optional
        "shared_with": ["qa-bot", "reviews"],   # optional users/groups
    }

Validation is strict: unknown keys, wrong types or bad statuses are refused
(fail-closed), so a saved view can never silently match nothing.
"""

from __future__ import annotations

from typing import Any, Dict, List

QUERY_VERSION = 1

ALLOWED_STATUSES = {
    "backlog", "in_progress", "in_review", "blocked", "done",
    "archived", "pending",
}

FILTER_KEYS = ("status", "assignee", "labels", "milestone", "shared_with")


LEGACY_KEY_MAP = {
    # Pre-schema views stored a single label string; treat it as one label.
    "label": "labels",
}


class QuerySchemaError(ValueError):
    """The saved-view query payload is invalid (fail closed)."""


def validate_query(filters: Any) -> Dict[str, Any]:
    """Validate and normalise a saved-view query payload."""
    if filters is None:
        filters = {}
    if not isinstance(filters, dict):
        raise QuerySchemaError("filters must be an object")
    normalised: Dict[str, Any] = {}
    for key, value in filters.items():
        mapped = LEGACY_KEY_MAP.get(key, key)
        if mapped in normalised and key != mapped:
            continue  # explicit modern key wins over its legacy alias
        normalised[mapped] = value
    filters = normalised
    unknown = sorted(set(filters) - set(FILTER_KEYS) - {"version"})
    if unknown:
        raise QuerySchemaError(f"unknown filter keys: {', '.join(unknown)}")

    version = filters.get("version", QUERY_VERSION)
    if version != QUERY_VERSION:
        raise QuerySchemaError(
            f"unsupported query version {version!r} (expected {QUERY_VERSION})")

    out: Dict[str, Any] = {"version": QUERY_VERSION}

    status = filters.get("status")
    if status is not None:
        if isinstance(status, str):  # legacy single-status form
            status = [status]
        if not isinstance(status, list) or not status or not all(
                isinstance(s, str) for s in status):
            raise QuerySchemaError("status must be a non-empty list of strings")
        bad = [s for s in status if s not in ALLOWED_STATUSES]
        if bad:
            raise QuerySchemaError(f"unknown statuses: {', '.join(bad)}")
        out["status"] = list(status)

    assignee = filters.get("assignee")
    if assignee is not None:
        if not isinstance(assignee, str) or not assignee.strip():
            raise QuerySchemaError("assignee must be a non-empty string")
        out["assignee"] = assignee.strip()

    labels = filters.get("labels")
    if labels is not None:
        if isinstance(labels, str):  # legacy single-label form
            labels = [labels]
        if not isinstance(labels, list) or not all(
                isinstance(x, str) and x.strip() for x in labels):
            raise QuerySchemaError("labels must be a list of non-empty strings")
        out["labels"] = [x.strip() for x in labels]

    milestone = filters.get("milestone")
    if milestone is not None:
        if not isinstance(milestone, str) or not milestone.strip():
            raise QuerySchemaError("milestone must be a non-empty string")
        out["milestone"] = milestone.strip()

    shared = filters.get("shared_with")
    if shared is not None:
        if not isinstance(shared, list) or not all(
                isinstance(x, str) and x.strip() for x in shared):
            raise QuerySchemaError("shared_with must be a list of profile names")
        if len(shared) > 32:
            raise QuerySchemaError("shared_with supports at most 32 names")
        out["shared_with"] = [x.strip() for x in shared]

    return out


def apply_query(items: List[Dict[str, Any]], query: Dict[str, Any],
                milestone_items: Dict[str, str] | None = None) -> List[Dict]:
    """Apply a validated query to work items (presentation-only filter).

    ``milestone_items`` maps item_ref -> milestone name, used for the
    optional milestone filter.
    """
    out = items
    if query.get("status"):
        wanted = set(query["status"])
        out = [i for i in out if i.get("status") in wanted]
    if query.get("assignee"):
        out = [i for i in out if (i.get("assignee") or "") == query["assignee"]]
    if query.get("labels"):
        wanted = set(query["labels"])
        out = [i for i in out
               if wanted.intersection(i.get("labels") or [])]
    if query.get("milestone") and milestone_items is not None:
        ms = query["milestone"]
        out = [i for i in out if milestone_items.get(i.get("ref")) == ms]
    return out