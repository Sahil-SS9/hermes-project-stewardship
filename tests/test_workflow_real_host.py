"""Real-host workflow lane (pinned vanilla).

Runs WorkflowService against the plugin's vanilla ProjectKanbanHost bound to
the pinned vanilla tree (hermes_constants + hermes_cli.kanban_db +
hermes_cli.projects_db). Isolation contract: the board database resolves via
HERMES_KANBAN_HOME — the test sets it to a temp dir and FAILS if it cannot,
so this lane can never silently run against the real home.
"""
from __future__ import annotations

import os
from pathlib import Path

import pytest

from hermes_project_stewardship.kanban.host_adapter import ProjectKanbanHostAdapter
from hermes_project_stewardship.kanban.vanilla_host import ProjectKanbanHost
from hermes_project_stewardship.persistence.store import Store
from hermes_project_stewardship.persistence.workflow_service import WorkflowService


def test_real_host_workflow_creates_gate_and_dependency(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    hermes_constants = pytest.importorskip("hermes_constants")
    kb = pytest.importorskip("hermes_cli.kanban_db")
    pdb = pytest.importorskip("hermes_cli.projects_db")

    # Isolation contract: board DBs resolve from HERMES_KANBAN_HOME. The
    # hermes_constants override alone does NOT isolate kanban DBs (verified
    # 2026-09-09: connect_closing() opened the real home board). Fail loudly
    # rather than ever touching the real home.
    monkeypatch.setenv("HERMES_KANBAN_HOME", str(tmp_path / "kanban-home"))
    if os.environ.get("HERMES_KANBAN_HOME") != str(tmp_path / "kanban-home"):
        pytest.fail("HERMES_KANBAN_HOME isolation could not be established")
    monkeypatch.delenv("HERMES_DELEGATED_CHILD_CONTEXT", raising=False)

    home = tmp_path / "hermes"
    home.mkdir()
    token = hermes_constants.set_hermes_home_override(home)
    try:
        with pdb.connect_closing() as conn:
            project_id = pdb.create_project(
                conn, name="Demo", slug="demo", board_slug="demo")
        kb.create_board("demo", name="Demo", project_id=project_id)
    finally:
        hermes_constants.reset_hermes_home_override(token)

    host = ProjectKanbanHost(hermes_home=home, board="demo")
    adapter = ProjectKanbanHostAdapter(host)
    service = WorkflowService(Store(tmp_path / "dockyard.db"), adapter)
    service.define("demo", "release", {"nodes": [
        {"id": "build", "title": "Build", "depends_on": [],
         "human_gate": False, "body": None},
        {"id": "approve", "title": "Approve", "depends_on": ["build"],
         "human_gate": True, "body": None},
    ]})
    result = service.start("demo", "release", "run-1")
    replay = service.start("demo", "release", "run-1")
    assert result["tasks"] == replay["tasks"]
    assert len(host.list_tasks(board="demo")["items"]) == 2
    approve = host.get_task(result["tasks"]["approve"], board="demo")["task"]
    assert approve["task_kind"] == "gate"
