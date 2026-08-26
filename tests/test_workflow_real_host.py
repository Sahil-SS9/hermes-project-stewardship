from pathlib import Path

import pytest

from hermes_project_stewardship.kanban import ProjectKanbanHostAdapter
from hermes_project_stewardship.persistence.store import Store
from hermes_project_stewardship.persistence.workflow_service import WorkflowService


def test_real_host_workflow_creates_gate_and_dependency(tmp_path: Path, monkeypatch):
    hermes_constants = pytest.importorskip("hermes_constants")
    kb = pytest.importorskip("hermes_cli.kanban_db")
    pdb = pytest.importorskip("hermes_cli.projects_db")
    host_module = pytest.importorskip("hermes_cli.project_kanban_host")
    monkeypatch.delenv("HERMES_DELEGATED_CHILD_CONTEXT", raising=False)
    home = tmp_path / "hermes"
    home.mkdir()
    token = hermes_constants.set_hermes_home_override(home)
    try:
        with pdb.connect_closing() as conn:
            project_id = pdb.create_project(
                conn, name="Demo", slug="demo", board_slug="demo")
        with kb.scoped_kanban_home(home):
            kb.create_board("demo", name="Demo", project_id=project_id)
    finally:
        hermes_constants.reset_hermes_home_override(token)
    adapter = ProjectKanbanHostAdapter(
        host_module.ProjectKanbanHost(hermes_home=home, board="demo"))
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
    host = adapter.host
    assert len(host.list_tasks(board="demo")["items"]) == 2
    approve = host.get_task(result["tasks"]["approve"], board="demo")["task"]
    assert approve["task_kind"] == "gate"
