from pathlib import Path
import os

import pytest

from hermes_project_stewardship.kanban.vanilla_host import HostError, ProjectKanbanHost


def require_native():
    try:
        from hermes_cli import kanban_db
    except ImportError:
        if os.environ.get("STEWARD_REQUIRE_NATIVE_HOST") == "1":
            pytest.fail("Native host lane requires a real pinned Hermes runtime")
        pytest.skip("optional native Hermes runtime not installed")
    return kanban_db


@pytest.mark.usefixtures("tmp_path")
def test_vanilla_host_provisions_project_board_and_task(tmp_path: Path, monkeypatch):
    require_native()
    monkeypatch.delenv("HERMES_DELEGATED_CHILD_CONTEXT", raising=False)
    monkeypatch.setenv("HERMES_KANBAN_HOME", str(tmp_path / "native-root"))
    repo = tmp_path / "repo"
    repo.mkdir()
    host = ProjectKanbanHost(hermes_home=tmp_path / "hermes")

    result = host.provision_project(
        name="Demo",
        slug="demo",
        description="mission",
        repo_path=str(repo),
        lead_profile="default",
        idempotency_key="demo-1",
    )
    project = host.get_project(result["project"]["id"])
    task = host.create_task(
        title="Task",
        project_id=project["id"],
        task_kind="task",
        initial_status="backlog",
        board="demo",
    )

    assert result["status"] == "complete"
    assert project["board_slug"] == "demo"
    assert task["status"] == "triage"
    assert host.get_task(task["id"], board="demo")["task"]["id"] == task["id"]


@pytest.fixture()
def native_host(tmp_path, monkeypatch):
    require_native()
    monkeypatch.delenv("HERMES_DELEGATED_CHILD_CONTEXT", raising=False)
    monkeypatch.setenv("HERMES_KANBAN_HOME", str(tmp_path / "native-root"))
    repo = tmp_path / "repo"
    repo.mkdir()
    host = ProjectKanbanHost(hermes_home=tmp_path / "hermes", board="demo")
    host.provision_project(name="Demo", slug="demo", description="mission",
                           repo_path=str(repo), lead_profile="default",
                           idempotency_key="demo")
    return host


def test_backlog_is_native_triage_and_cannot_be_claimed(native_host):
    task = native_host.create_task(title="Parked", assignee="default")
    with native_host._kanban() as (kb, conn, _):
        row = kb.get_task(conn, task["id"])
        assert row.status in kb.VALID_STATUSES
        assert row.status == "triage"
        assert kb.claim_task(conn, row.id, claimer="proof") is None


def test_claim_review_complete_preserves_native_events_and_run_history(native_host):
    task = native_host.create_task(title="Lifecycle", initial_status="backlog")
    native_host.assign_task(task["id"], "default")
    assert native_host.transition_task(task["id"], "ready")["status"] == "ready"
    with native_host._kanban() as (kb, conn, _):
        claimed = kb.claim_task(conn, task["id"], claimer="proof")
        assert claimed is not None
        run_id = claimed.current_run_id
    reviewed = native_host.transition_task(task["id"], "review", expected_run_id=run_id,
                                           summary="actual review handoff")
    assert reviewed["status"] == "review"
    with native_host._kanban() as (kb, conn, _):
        ended = kb.get_run(conn, run_id)
        assert ended.ended_at is not None
        assert ended.outcome == "review_requested"
    native_host.transition_task(task["id"], "done", summary="accepted")
    with native_host._kanban() as (kb, conn, _):
        row = kb.get_task(conn, task["id"])
        assert row.status == "done"
        assert row.current_run_id is None
        assert row.claim_lock is None
        kinds = {event.kind for event in kb.list_events(conn, task["id"])}
        assert {"created", "assigned", "claimed", "review_requested", "completed"} <= kinds


def test_idempotent_create_never_rewinds_completed_work(native_host):
    task = native_host.create_task(title="Replay", initial_status="ready",
                                   idempotency_key="replay")
    native_host.transition_task(task["id"], "done", summary="finished once")
    with native_host._kanban() as (kb, conn, _):
        before = len(kb.list_events(conn, task["id"]))
    replay = native_host.create_task(title="Replay", initial_status="ready",
                                     idempotency_key="replay")
    assert replay["id"] == task["id"]
    assert replay["status"] == "done"
    with native_host._kanban() as (kb, conn, _):
        assert len(kb.list_events(conn, task["id"])) == before


def test_dependencies_gate_ready_and_completion(native_host):
    parent = native_host.create_task(title="Parent", initial_status="ready")
    child = native_host.create_task(title="Child", initial_status="ready",
                                     parent_task_id=parent["id"])
    with native_host._kanban() as (kb, conn, _):
        assert kb.get_task(conn, child["id"]).status == "ready"
    with pytest.raises(HostError):
        native_host.transition_task(child["id"], "done")
    native_host.transition_task(parent["id"], "done", summary="parent finished")
    with native_host._kanban() as (kb, conn, _):
        kb.recompute_ready(conn)
        assert kb.get_task(conn, child["id"]).status == "ready"
    native_host.transition_task(child["id"], "done", summary="child finished")


def test_block_closes_run_and_retains_reason(native_host):
    task = native_host.create_task(title="Block", assignee="default", initial_status="ready")
    with native_host._kanban() as (kb, conn, _):
        claimed = kb.claim_task(conn, task["id"], claimer="proof")
        run_id = claimed.current_run_id
    native_host.block_task(task["id"], reason="Waiting for sandbox dependency",
                            expected_run_id=run_id)
    with native_host._kanban() as (kb, conn, _):
        assert kb.get_run(conn, run_id).ended_at is not None
        row = kb.get_task(conn, task["id"])
        assert row.current_run_id is None
        assert "Waiting for sandbox dependency" in str(kb.list_events(conn, task["id"]))
    assert native_host.transition_task(task["id"], "ready")["status"] == "ready"


@pytest.mark.parametrize("bad", [{"initial_status": "not-a-status"},
                                 {"parent_task_id": "t_000000000000"}])
def test_invalid_create_does_not_leave_an_orphan(native_host, bad):
    with native_host._kanban() as (kb, conn, _):
        before = len(kb.list_tasks(conn))
    with pytest.raises((HostError, ValueError)):
        native_host.create_task(title="Must not remain", **bad)
    with native_host._kanban() as (kb, conn, _):
        assert len(kb.list_tasks(conn)) == before
