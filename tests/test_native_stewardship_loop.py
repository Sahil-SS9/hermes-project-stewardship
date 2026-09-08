"""Phase 3: real-host boundary (pinned vanilla) — P3.1 and the native loop.

Every test here uses the REAL vanilla host modules exactly like P1's native
lane (require_native(); STEWARD_REQUIRE_NATIVE_HOST=1 makes missing hosts
fail rather than skip). No fixtures substitute for live proof.

The observer is exercised against the REAL ProjectKanbanHost — the same host
object ProjectKanbanHostAdapter wraps in production (adapter.host) — reading
real task records, real lifecycle events from vanilla's task_events, and real
run rows from task_runs.

The approved real-worker scenario (P3.8) extends this file only after
Sahil's explicit approval; until then the lane proves the host boundary
with real native transitions driven directly through the host API.
"""
from __future__ import annotations

import os

import pytest

from hermes_project_stewardship.kanban.vanilla_host import ProjectKanbanHost


def _require_native():
    try:
        import hermes_constants  # noqa: F401
        from hermes_cli import kanban_db  # noqa: F401
    except ImportError:
        if os.environ.get("STEWARD_REQUIRE_NATIVE_HOST") == "1":
            pytest.fail("Native host lane requires a real pinned Hermes runtime")
        pytest.skip("optional native Hermes runtime not installed")


def _observe(host, task_id):
    from hermes_project_stewardship.observation.native_events import (
        NativeEventObserver,
    )

    return NativeEventObserver(store=None, host=host).observe_task(task_id)


def test_real_host_external_transition_visible_to_dockyard(tmp_path, monkeypatch):
    """P3.1: an external native completion is visible to Dockyard's observer.

    Drives the real vanilla host: provision → create → external claim +
    complete through native kanban_db, then observes through the same host
    read surface production uses.
    """
    _require_native()
    monkeypatch.delenv("HERMES_DELEGATED_CHILD_CONTEXT", raising=False)
    monkeypatch.setenv("HERMES_KANBAN_HOME", str(tmp_path / "native-root"))
    repo = tmp_path / "repo"
    repo.mkdir()

    host = ProjectKanbanHost(hermes_home=tmp_path / "hermes", board="demo")
    prov = host.provision_project(
        name="Demo", slug="demo", description="mission", repo_path=str(repo),
        lead_profile="default", idempotency_key="p31",
    )
    task = host.create_task(title="Loop proof", project_id=prov["project"]["id"],
                            task_kind="task", initial_status="backlog",
                            board="demo")

    # External native transition exactly like a real worker: claim + complete.
    host.assign_task(task["id"], "default")
    host.transition_task(task["id"], "ready")
    with host._kanban("demo") as (kb, conn, _):
        kb.claim_task(conn, task["id"], claimer="real-worker")
        run_row = conn.execute(
            "SELECT id FROM task_runs WHERE task_id=? ORDER BY id DESC LIMIT 1",
            (task["id"],),
        ).fetchone()
        assert run_row is not None
        kb.complete_task(conn, task["id"], summary="external work done",
                         expected_run_id=run_row["id"])

    record = _observe(host, task["id"])
    assert record["task_id"] == task["id"]
    assert record["task_status"] == "done"
    assert record["completed_event_run_id"] is not None
    assert record["runs"], "run identity must come from the real host"
    assert record["last_run_outcome"] == "completed"


def test_real_host_blocked_transition_observed(tmp_path, monkeypatch):
    """P3.4: an external native block is observed with outcome 'blocked'."""
    _require_native()
    monkeypatch.delenv("HERMES_DELEGATED_CHILD_CONTEXT", raising=False)
    monkeypatch.setenv("HERMES_KANBAN_HOME", str(tmp_path / "native-root2"))
    repo = tmp_path / "repo"
    repo.mkdir()

    host = ProjectKanbanHost(hermes_home=tmp_path / "hermes", board="demo")
    prov = host.provision_project(
        name="Demo", slug="demo", description="mission", repo_path=str(repo),
        lead_profile="default", idempotency_key="p34",
    )
    task = host.create_task(title="Blocked proof", project_id=prov["project"]["id"],
                            task_kind="task", initial_status="ready",
                            board="demo")
    host.transition_task(task["id"], "blocked", reason="upstream failure")

    record = _observe(host, task["id"])
    assert record["task_status"] == "blocked"
    assert record["last_run_outcome"] == "blocked"


def test_real_host_runs_exposed_via_adapter_host(tmp_path, monkeypatch):
    """The adapter's wrapped host is the observation surface: the run identity
    read through it matches vanilla's own task_runs rows."""
    _require_native()
    monkeypatch.delenv("HERMES_DELEGATED_CHILD_CONTEXT", raising=False)
    monkeypatch.setenv("HERMES_KANBAN_HOME", str(tmp_path / "native-root3"))
    repo = tmp_path / "repo"
    repo.mkdir()

    from hermes_project_stewardship.kanban import ProjectKanbanHostAdapter

    host = ProjectKanbanHost(hermes_home=tmp_path / "hermes", board="demo")
    prov = host.provision_project(
        name="Demo", slug="demo", description="mission", repo_path=str(repo),
        lead_profile="default", idempotency_key="p3runs",
    )
    task = host.create_task(title="Run identity", project_id=prov["project"]["id"],
                            task_kind="task", initial_status="ready",
                            board="demo")
    host.assign_task(task["id"], "default")
    host.transition_task(task["id"], "ready")
    with host._kanban("demo") as (kb, conn, _):
        kb.claim_task(conn, task["id"], claimer="identity-worker")
        run_row = conn.execute(
            "SELECT id FROM task_runs WHERE task_id=? ORDER BY id DESC LIMIT 1",
            (task["id"],),
        ).fetchone()
        native_run_id = run_row["id"]

    adapter = ProjectKanbanHostAdapter(host)
    record = _observe(adapter.host, task["id"])
    assert record["runs"], "adapter's wrapped host must expose run identity"
    assert record["runs"][-1]["id"] == native_run_id
    assert record["completed_event_run_id"] is None  # not completed yet
