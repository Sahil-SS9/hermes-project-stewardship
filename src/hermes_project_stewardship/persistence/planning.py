"""P9.4 — pure milestone forecast read-model.

A deliberately simple, count-based scenario rule (see implementation plan,
Phase 9): divide remaining milestone item count by mean weekly completions
over the previous four complete project-calendar weeks, with a scenario
range from the slowest/fastest observed week. This is a planning aid, not a
delivery promise: no scheduler, no persistence, no statistical model.

Frozen-clock friendly: `today` is an explicit parameter, so tests can pin
week boundaries. All arithmetic is on ISO dates (YYYY-MM-DD) in UTC.
"""
from __future__ import annotations

from datetime import date, datetime, timedelta
from typing import Any, Iterable

MIN_SAMPLE = 8
WINDOW_WEEKS = 4

ASSUMPTIONS = {
    "min_sample": MIN_SAMPLE,
    "window_weeks": WINDOW_WEEKS,
    "basis": "completed item counts per project week (updated_at of done items)",
    "note": (
        "count-based scenario, not a delivery promise; dependencies and "
        "owner workload are shown separately"
    ),
}


def _as_date(value: Any) -> date | None:
    """Parse an ISO timestamp/date to a UTC date; None when unusable."""
    if value is None:
        return None
    try:
        return datetime.fromisoformat(str(value).replace("Z", "+00:00")).date()
    except ValueError:
        return None


def _completed_week_buckets(
    done_items: Iterable[dict[str, Any]],
    today: date,
) -> list[int]:
    """Completions per each of the previous WINDOW_WEEKS complete weeks.

    Week boundaries are ISO weeks (Monday) in UTC. The current, unfinished
    week is excluded — only complete project-calendar weeks count. Returns
    exactly WINDOW_WEEKS counts, oldest first.
    """
    this_monday = today - timedelta(days=today.weekday())
    start = this_monday - timedelta(weeks=WINDOW_WEEKS)
    buckets = [0] * WINDOW_WEEKS
    for item in done_items:
        day = _as_date(item.get("completed_at") or item.get("updated_at"))
        if day is None or day >= this_monday or day < start:
            continue
        index = (day - start).days // 7
        if 0 <= index < WINDOW_WEEKS:
            buckets[index] += 1
    return buckets


def forecast_milestone(
    *,
    remaining: int,
    done_items: list[dict[str, Any]],
    comparable: bool = True,
    today: date | None = None,
) -> dict[str, Any]:
    """Compute the milestone forecast payload (pure; no I/O).

    remaining   — milestone items not yet done (0 ⇒ complete).
    done_items  — project-wide done work records carrying completion
                  timestamps (updated_at); used for the throughput window.
    comparable  — False when the project's work items are judged incomparable
                  (e.g. wildly mixed item types) by the caller.
    today       — frozen clock anchor (defaults to the real today).
    """
    anchor = today or date.today()
    if remaining <= 0:
        return {"state": "complete", "assumptions": ASSUMPTIONS}
    weeks = _completed_week_buckets(done_items, anchor)
    completions = sum(weeks)
    if not comparable:
        return {
            "state": "not_comparable",
            "sample_size": completions,
            "assumptions": ASSUMPTIONS,
        }
    if completions < MIN_SAMPLE:
        return {
            "state": "insufficient_history",
            "sample_size": completions,
            "assumptions": ASSUMPTIONS,
        }
    mean_weekly = completions / WINDOW_WEEKS
    slowest = min(weeks)
    fastest = max(weeks)

    def _duration(rate: float) -> float | None:
        if rate <= 0:
            return None
        return remaining / rate

    central = _duration(mean_weekly)
    lower = _duration(fastest)
    upper_open = slowest <= 0
    upper = None if upper_open else _duration(slowest)
    return {
        "state": "forecast",
        "remaining_items": remaining,
        "sample_size": completions,
        "weekly_throughput": {
            "weeks": weeks,
            "mean": round(mean_weekly, 2),
            "slowest": slowest,
            "fastest": fastest,
        },
        "central_weeks": round(central, 2) if central is not None else None,
        "range_weeks": {
            "lower": round(lower, 2) if lower is not None else None,
            "upper": round(upper, 2) if upper is not None else None,
            "upper_open_ended": upper_open,
        },
        "assumptions": ASSUMPTIONS,
    }
