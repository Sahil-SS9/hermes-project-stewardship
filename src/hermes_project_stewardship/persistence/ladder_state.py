"""Pure derived-state folds for the delivery ladder.

No state in this module is persisted. Callers pass the current child states and
check evidence, and the result is derived at read time.
"""
from __future__ import annotations

from typing import Iterable, Optional

CHECK_RISK = frozenset({"failed"})
CHECK_UNKNOWN = frozenset({"unknown", "stale", "unavailable"})


def goal_state(task_buckets: Optional[Iterable[str]], check_state: Optional[str]) -> str:
    """Fold task buckets and an optional check into a goal state.

    ``task_buckets=None`` means the task host is unavailable. ``check_state`` is
    ``None`` when the goal has no check.
    """
    tasks = None if task_buckets is None else tuple(task_buckets)
    if check_state in CHECK_RISK:
        return "at_risk"
    if check_state in CHECK_UNKNOWN:
        return "unknown"
    if tasks is None:
        return "unknown"
    if not tasks and check_state is None:
        return "not_started"
    if all(bucket == "complete" for bucket in tasks) and check_state in (None, "passed"):
        return "met"
    return "in_progress"


def objective_state(goal_states: Iterable[str], check_state: Optional[str]) -> str:
    """Fold child-goal states and an optional objective check."""
    children = tuple(goal_states)
    if check_state in CHECK_RISK or "at_risk" in children:
        return "at_risk"
    if check_state in CHECK_UNKNOWN or "unknown" in children:
        return "unknown"
    if not children and check_state is None:
        return "not_started"
    if all(state == "met" for state in children) and check_state == "passed":
        return "met"
    if children and all(state == "met" for state in children) and check_state is None:
        return "met"
    return "in_progress"


def milestone_state(objective_states: Iterable[str]) -> str:
    """A non-empty milestone is reached only when every objective is met."""
    children = tuple(objective_states)
    return "reached" if children and all(state == "met" for state in children) else "not_reached"


def initiative_ready(governance: str, milestone_states: Iterable[str]) -> bool:
    """Only an executing, non-empty initiative can be ready for confirmation."""
    children = tuple(milestone_states)
    return governance == "executing" and bool(children) and all(
        state == "reached" for state in children
    )
