from pathlib import Path

import pytest

from hermes_project_stewardship.kanban.vanilla_host import ProjectKanbanHost


@pytest.mark.usefixtures("tmp_path")
def test_vanilla_host_provisions_project_board_and_task(tmp_path: Path, monkeypatch):
    pytest.importorskip("hermes_cli.kanban_db")
    monkeypatch.delenv("HERMES_DELEGATED_CHILD_CONTEXT", raising=False)
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
    assert task["status"] == "backlog"
    assert host.get_task(task["id"], board="demo")["task"]["id"] == task["id"]
