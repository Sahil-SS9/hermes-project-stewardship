"""F8 (v0.5.5 independent review): a failed first assessment must not wedge.

``project_cycles.idempotency_key`` is UNIQUE and ``processed_triggers`` is
marked only on success. When a cycle under the per-project first-assessment
key fails, the row stays behind with its key burned: every later press hit the
UNIQUE constraint and the endpoint answered a raw sqlite 503 forever. A
trigger key whose cycle completed (row > 30 days old, trigger row pruned)
wedged the same way. The engine must answer an occupied key with its recorded
cycle — replay for a completed one, a fresh retry cycle for a failed one —
never with the raw constraint error.
"""

from __future__ import annotations

from datetime import timedelta

import pytest

from hermes_project_stewardship.cycles.engine import DuplicateTrigger
from hermes_project_stewardship.persistence.store import iso

KEY = "dockyard-first-assessment:demo"
FAILED_INSERT = (
    "INSERT INTO project_cycles(project_id, trigger_type, trigger_ref,"
    " idempotency_key, state, started_at)"
    " VALUES(?, 'manual', NULL, ?, 'failed', ?)"
)


def _record_failed_cycle(store, project_id: str, key: str, clock) -> None:
    recent = iso(clock() - timedelta(days=10))
    with store.tx() as cx:
        cx.execute(FAILED_INSERT, (project_id, key, recent))


def _cycle_rows(store) -> list[dict]:
    rows = store._conn.execute(
        "SELECT idempotency_key, state FROM project_cycles ORDER BY id"
    ).fetchall()
    return [dict(r) for r in rows]


@pytest.fixture()
def project(engine, enabled):
    return enabled


def test_a_failed_first_assessment_can_be_pressed_again(
    engine, project, store, clock,
):
    """The burned key of a failed cycle runs a fresh retry, not a 503."""
    _record_failed_cycle(store, project, KEY, clock)
    result = engine.run_cycle(project, idempotency_key=KEY)
    assert result["cycle_id"]
    # The failed record survives; the retry is a new cycle under a derived key.
    assert _cycle_rows(store) == [
        {"idempotency_key": KEY, "state": "failed"},
        {"idempotency_key": f"{KEY}#retry-1", "state": "completed"},
    ]


def test_every_failed_attempt_gets_its_own_retry_key(
    engine, project, store, clock,
):
    """A retry that itself fails must never collide: keys stay derived and free."""
    _record_failed_cycle(store, project, KEY, clock)
    _record_failed_cycle(store, project, f"{KEY}#retry-1", clock)

    result = engine.run_cycle(project, idempotency_key=KEY)
    assert result["cycle_id"]
    assert _cycle_rows(store) == [
        {"idempotency_key": KEY, "state": "failed"},
        {"idempotency_key": f"{KEY}#retry-1", "state": "failed"},
        {"idempotency_key": f"{KEY}#retry-2", "state": "completed"},
    ]


def test_a_successful_retry_replays_afterwards(engine, project, store, clock):
    """One retry runs per press; a successful press replays from then on."""
    _record_failed_cycle(store, project, KEY, clock)
    engine.run_cycle(project, idempotency_key=KEY)
    with pytest.raises(DuplicateTrigger):
        engine.run_cycle(project, idempotency_key=KEY)
    assert len(_cycle_rows(store)) == 2


def test_completed_cycle_replays_after_the_trigger_row_is_pruned(
    engine, project, store,
):
    """A press > 30 days after a successful run answers with the old cycle."""
    result = engine.run_cycle(project, idempotency_key=KEY)
    cycle_id = result["cycle_id"]

    # Simulate the 30-day prune of processed_triggers.
    with store.tx() as cx:
        cx.execute("DELETE FROM processed_triggers")

    with pytest.raises(DuplicateTrigger):
        engine.run_cycle(project, idempotency_key=KEY)
    rows = store._conn.execute("SELECT COUNT(*) AS n FROM project_cycles").fetchone()
    assert int(rows["n"]) == 1  # no second cycle ran
    assert cycle_id