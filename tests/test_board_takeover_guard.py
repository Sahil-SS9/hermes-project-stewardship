"""Provisioning must never take a board that already belongs to another project (F4).

A board "belongs" to a project when its board.json names a project, or when any
project row names that board slug. Provisioning a NEW project onto such a board
used to rewrite the board's project binding without asking.
"""

from __future__ import annotations

from pathlib import Path

import pytest

hermes_constants = pytest.importorskip("hermes_constants")
kanban_db = pytest.importorskip("hermes_cli.kanban_db")
projects_db = pytest.importorskip("hermes_cli.projects_db")
set_home = hermes_constants.set_hermes_home_override
reset_home = hermes_constants.reset_hermes_home_override

from hermes_project_stewardship.kanban.vanilla_host import (  # noqa: E402
    HostError,
    ProjectKanbanHost,
)


def _home(tmp_path: Path) -> Path:
    home = tmp_path / "home"
    (home / "profiles" / "octacon").mkdir(parents=True)
    (home / "profiles" / "octacon" / "config.yaml").write_text("model:\n  default: test\n")
    return home


def _provision(host, repo: Path, slug: str, board: str, key: str = "k1"):
    repo = repo / slug  # one folder per project: Hermes refuses a shared folder
    repo.mkdir(exist_ok=True)
    return host.provision_project(
        idempotency_key=key, name=slug.title(), slug=slug, description="d",
        repo_path=str(repo), board_slug=board, lead_profile="octacon",
    )


@pytest.fixture()
def env(tmp_path, monkeypatch):
    repo = tmp_path / "repo"
    repo.mkdir()
    monkeypatch.setenv("HERMES_KANBAN_HOME", str(tmp_path / "kanban"))
    return _home(tmp_path), repo


def test_a_new_project_cannot_take_a_board_bound_to_another_project(env):
    home, repo = env
    kanban_db.create_board("shared", name="Shared", project_id="p_somebody_else")
    host = ProjectKanbanHost(hermes_home=home)
    with pytest.raises(HostError) as err:
        _provision(host, repo, "newcomer", "shared")
    assert err.value.code == "board_already_claimed"
    assert kanban_db.read_board_metadata("shared")["project_id"] == "p_somebody_else"
    with projects_db.connect_closing() as conn:  # nothing half-created
        assert projects_db.get_project(conn, "newcomer") is None


def test_a_new_project_cannot_take_a_board_another_project_row_names(env):
    home, repo = env
    token = set_home(home)
    try:
        with projects_db.connect_closing() as conn:
            projects_db.create_project(
                conn, name="Owner", slug="owner", description=None,
                primary_path=str(repo), board_slug="shared",
            )
    finally:
        reset_home(token)
    host = ProjectKanbanHost(hermes_home=home)
    with pytest.raises(HostError) as err:
        _provision(host, repo, "newcomer", "shared")
    assert err.value.code == "board_already_claimed"


def test_an_unclaimed_board_and_a_fresh_board_still_provision(env):
    home, repo = env
    kanban_db.create_board("loose", name="Loose")  # made by hand, unbound
    host = ProjectKanbanHost(hermes_home=home)
    assert _provision(host, repo, "one", "loose", "k1")["status"] == "complete"
    assert _provision(host, repo, "two", "brand-new", "k2")["status"] == "complete"


def test_replaying_your_own_provisioning_is_not_a_takeover(env):
    home, repo = env
    host = ProjectKanbanHost(hermes_home=home)
    first = _provision(host, repo, "mine", "mine-board")
    again = _provision(host, repo, "mine", "mine-board")
    assert again["replayed"] is True
    assert again["board"]["project_id"] == first["project"]["id"]


def test_an_archived_project_still_owns_its_board(env):
    home, repo = env
    host = ProjectKanbanHost(hermes_home=home)
    first = _provision(host, repo, "gone", "kept-board")
    token = set_home(home)
    try:
        with projects_db.connect_closing() as conn:
            projects_db.archive_project(conn, first["project"]["id"])
    finally:
        reset_home(token)
    with pytest.raises(HostError) as err:
        _provision(host, repo, "newcomer", "kept-board", "k2")
    assert err.value.code == "board_already_claimed"


def test_the_preflight_refuses_a_claimed_board_before_the_last_step(env):
    home, repo = env
    kanban_db.create_board("shared", name="Shared", project_id="p_somebody_else")
    host = ProjectKanbanHost(hermes_home=home)
    (repo / "newcomer").mkdir()
    with pytest.raises(HostError) as err:
        host.validate_project(
            name="Newcomer", slug="newcomer", description="d",
            repo_path=str(repo / "newcomer"), board_slug="shared", lead_profile="octacon",
        )
    assert err.value.code == "validation_error"
    assert "board_slug" in err.value.fields
    # a free board and an existing project's own board still pass the preflight
    host.validate_project(
        name="Newcomer", slug="newcomer", description="d",
        repo_path=str(repo / "newcomer"), board_slug="free-board", lead_profile="octacon",
    )


def test_two_projects_provisioned_at_once_cannot_both_take_one_board(env):
    import threading

    home, repo = env
    host = ProjectKanbanHost(hermes_home=home)
    for trial in range(8):
        barrier = threading.Barrier(2)
        results: list[str] = []

        def go(slug: str, trial=trial, barrier=barrier, results=results) -> None:
            barrier.wait()
            try:
                _provision(host, repo, slug, f"race-{trial}", f"key-{slug}")
                results.append("ok")
            except HostError as exc:
                results.append(exc.code)

        threads = [threading.Thread(target=go, args=(f"a{trial}",)),
                   threading.Thread(target=go, args=(f"b{trial}",))]
        for t in threads:
            t.start()
        for t in threads:
            t.join()
        assert sorted(results) == ["board_already_claimed", "ok"], (trial, results)
