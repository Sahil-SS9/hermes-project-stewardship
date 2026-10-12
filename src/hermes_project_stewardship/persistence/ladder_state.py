"""Pure derived-state folds for the delivery ladder.

No state in this module is persisted. Callers pass the current child states and
check evidence, and the result is derived at read time.
"""
from __future__ import annotations

from typing import Iterable, Optional

CHECK_RISK = frozenset({"failed"})
CHECK_UNKNOWN = frozenset({"unknown", "stale", "unavailable"})

#: A child marked "no longer required" neither blocks nor counts as work done,
#: but it DOES satisfy its parent: a person has explicitly removed it from the
#: requirement. A parent with no children at all is still never satisfied.
#: "met" is a goal/objective state and "reached" a milestone state, so one set
#: covers every parent's fold.
WAIVED = "waived"
SATISFIED = frozenset({"met", "reached", "waived"})


def goal_state(
    task_buckets: Optional[Iterable[str]], check_state: Optional[str], *, waived: bool = False
) -> str:
    """Fold task buckets and an optional check into a goal state.

    ``task_buckets=None`` means the task host is unavailable. ``check_state`` is
    ``None`` when the goal has no check. A waived goal is ``waived`` regardless
    of its children: a person has said it is no longer required.
    """
    if waived:
        return WAIVED
    tasks = None if task_buckets is None else tuple(task_buckets)
    if check_state in CHECK_RISK:
        return "at_risk"
    if check_state in CHECK_UNKNOWN:
        return "unknown"
    if tasks is None:
        return "unknown"
    if not tasks and check_state is None:
        return "not_started"
    # A task marked WAIVED satisfies the goal just as a complete one does: a
    # person took it out of the requirement. The goal still needs at least one
    # task on it, so an empty goal is never called met.
    if all(bucket in ("complete", WAIVED) for bucket in tasks) and check_state in (None, "passed"):
        return "met"
    return "in_progress"


def objective_state(
    goal_states: Iterable[str], check_state: Optional[str], *, waived: bool = False
) -> str:
    """Fold child-goal states and an optional objective check.

    Every child must be met or waived, and a present check must have passed;
    the fold is still never satisfied for an empty objective.
    """
    if waived:
        return WAIVED
    children = tuple(goal_states)
    if check_state in CHECK_RISK or "at_risk" in children:
        return "at_risk"
    if check_state in CHECK_UNKNOWN or "unknown" in children:
        return "unknown"
    if not children and check_state is None:
        return "not_started"
    # The old fold's exact semantics, with waived children treated as met:
    # a passed check can carry an objective on its own (all([]) is true), and
    # a check-less objective is met by satisfied children alone.
    if check_state == "passed" and all(state in SATISFIED for state in children):
        return "met"
    if children and check_state is None and all(state in SATISFIED for state in children):
        return "met"
    return "in_progress"


def milestone_state(objective_states: Iterable[str], *, waived: bool = False) -> str:
    """A non-empty milestone is reached when every objective is met or waived."""
    if waived:
        return WAIVED
    children = tuple(objective_states)
    return (
        "reached"
        if children and all(state in SATISFIED for state in children)
        else "not_reached"
    )


def initiative_ready(governance: str, milestone_states: Iterable[str]) -> bool:
    """Only an executing, non-empty initiative can be ready for confirmation.

    Milestones that are met or waived count; an initiative with no milestones
    is never ready, waived or not.
    """
    children = tuple(milestone_states)
    return (
        governance == "executing"
        and bool(children)
        and all(state in SATISFIED for state in children)
    )
