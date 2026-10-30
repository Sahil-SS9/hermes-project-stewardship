"""Connecting a project to a board that already exists must bind the board.

``hermes kanban boards create <slug>`` writes ``board.json`` with
``project_id: null``. Provisioning a project onto that board reported
``status: complete`` while leaving it unbound, so every later adapter call
failed ``ensure_board``'s project check with 503 ``project_board_mismatch``
("project is not bound to the requested canonical board"): the Team tab, work
listing and every card write. Provisioning now adopts an unbound board for the
project it is connecting; a board bound to another project is left alone.
"""

from __future__ import annotations

from pathlib import Path

from hermes_cli import kanban_db, projects_db
from hermes_constants import reset_hermes_home_override, set_hermes_home_override

from hermes_project_stewardship.kanban.vanilla_host import ProjectKanbanHost

PROJECT = "accountability-app"
NAME = "Accountability__App"


def _seed_project(home: Path, repo: Path) -> str:
    (home / "profiles" / "octacon").mkdir(parents=True, exist_ok=True)
    (home / "profiles" / "octacon" / "config.yaml").write_text("model:\n  default: test\n")
    token = set_hermes_home_override(home)
    try:
        with projects_db.connect_closing() as conn:
            project = projects_db.create_project(
                conn,
                name=NAME,
                slug=PROJECT,
                description=None,
                primary_path=str(repo),
                board_slug=PROJECT,
            )
        return str(project)
    finally:
        reset_hermes_home_override(token)


def test_connect_existing_binds_a_board_created_outside_provisioning(tmp_path, monkeypatch):
    home = tmp_path / "home"
    repo = tmp_path / "repo"
    repo.mkdir(parents=True)
    monkeypatch.setenv("HERMES_KANBAN_HOME", str(tmp_path / "kanban"))
    project_id = _seed_project(home, repo)

    # The operator made the board by hand before onboarding: no binding yet.
    kanban_db.create_board(PROJECT, name=NAME)
    assert not str(kanban_db.read_board_metadata(PROJECT).get("project_id") or "").strip()

    host = ProjectKanbanHost(hermes_home=home)
    result = host.provision_project(
        idempotency_key="k1",
        name=NAME,
        slug=PROJECT,
        description="Bind an existing board to its project",
        repo_path=str(repo),
        board_slug=PROJECT,
        lead_profile="octacon",
    )

    assert result["status"] == "complete"
    assert result["replayed"] is True
    assert kanban_db.read_board_metadata(PROJECT)["project_id"] == project_id


def test_a_board_bound_to_another_project_is_never_stolen(tmp_path, monkeypatch):
    home = tmp_path / "home"
    repo = tmp_path / "repo"
    repo.mkdir(parents=True)
    monkeypatch.setenv("HERMES_KANBAN_HOME", str(tmp_path / "kanban"))
    _seed_project(home, repo)

    kanban_db.create_board(PROJECT, name=NAME, project_id="p_somebody_else")

    host = ProjectKanbanHost(hermes_home=home)
    host.provision_project(
        idempotency_key="k1",
        name=NAME,
        slug=PROJECT,
        description="Bind an existing board to its project",
        repo_path=str(repo),
        board_slug=PROJECT,
        lead_profile="octacon",
    )

    assert kanban_db.read_board_metadata(PROJECT)["project_id"] == "p_somebody_else"
