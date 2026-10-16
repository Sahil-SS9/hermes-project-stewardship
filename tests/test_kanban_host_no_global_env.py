"""The Kanban host never writes process-global environment (catalog review, PR #136752).

`os.environ` is shared by every thread in the Hermes process. While the plugin
scoped a Kanban call it used to set HERMES_KANBAN_HOME, so core's own Kanban
reads/writes (and the delegation fence) followed the plugin's value. The host
now scopes only through the context-local `set_hermes_home_override`, and when
no Kanban home is pinned it lets core resolve the shared board root.
"""
from pathlib import Path
import os
import threading

import pytest

from hermes_project_stewardship.kanban.vanilla_host import ProjectKanbanHost


def _isolated_home(tmp_path: Path, monkeypatch) -> None:
    # Core treats any HERMES_HOME under ~/.hermes as the user's real root, and
    # pytest's tmp dir can live there. Give every test its own fake home.
    monkeypatch.setenv("HOME", str(tmp_path / "fake-user-home"))


def _native():
    try:
        from hermes_cli import kanban_db
    except ImportError:
        if os.environ.get("STEWARD_REQUIRE_NATIVE_HOST") == "1":
            pytest.fail("Native host lane requires a real pinned Hermes runtime")
        pytest.skip("optional native Hermes runtime not installed")
    return kanban_db


def test_scope_leaves_the_process_environment_untouched(tmp_path: Path, monkeypatch):
    _native()
    _isolated_home(tmp_path, monkeypatch)
    monkeypatch.delenv("HERMES_KANBAN_HOME", raising=False)
    monkeypatch.setenv("HERMES_HOME", str(tmp_path / "root"))
    host = ProjectKanbanHost(hermes_home=tmp_path / "root")
    before = dict(os.environ)
    with host._scope():
        inside = dict(os.environ)
    assert inside == before, "the host changed os.environ while scoping a Kanban call"
    assert dict(os.environ) == before
    assert "HERMES_KANBAN_HOME" not in os.environ


def test_a_profile_process_uses_cores_shared_board_root_not_the_profile(tmp_path: Path, monkeypatch):
    kanban_db = _native()
    _isolated_home(tmp_path, monkeypatch)
    root = tmp_path / "data"
    profile = root / "profiles" / "coder"
    profile.mkdir(parents=True)
    monkeypatch.delenv("HERMES_KANBAN_HOME", raising=False)
    monkeypatch.setenv("HERMES_HOME", str(profile))
    host = ProjectKanbanHost(hermes_home=profile)
    assert host.kanban_home == kanban_db.kanban_home() == root
    with host._scope():
        assert kanban_db.kanban_home() == root
        assert kanban_db.kanban_db_path("default") == root / "kanban.db"
    assert host._work_parents.path == root / "dockyard" / "work-parents.db"


def test_a_pinned_kanban_home_in_the_test_environment_still_wins(tmp_path: Path, monkeypatch):
    kanban_db = _native()
    pinned = tmp_path / "pinned"
    monkeypatch.setenv("HERMES_KANBAN_HOME", str(pinned))
    host = ProjectKanbanHost(hermes_home=tmp_path / "hermes")
    assert host.kanban_home == kanban_db.kanban_home() == pinned


def test_another_thread_never_sees_the_plugins_scope(tmp_path: Path, monkeypatch):
    kanban_db = _native()
    _isolated_home(tmp_path, monkeypatch)
    monkeypatch.delenv("HERMES_KANBAN_HOME", raising=False)
    monkeypatch.setenv("HERMES_HOME", str(tmp_path / "root"))
    host = ProjectKanbanHost(hermes_home=tmp_path / "elsewhere")
    seen: list = []
    entered, release = threading.Event(), threading.Event()

    def plugin_call():
        with host._scope():
            entered.set()
            release.wait(5)

    worker = threading.Thread(target=plugin_call)
    worker.start()
    try:
        assert entered.wait(5)
        seen.append(os.environ.get("HERMES_KANBAN_HOME"))
        seen.append(kanban_db.kanban_home())
    finally:
        release.set()
        worker.join(5)
    assert seen == [None, tmp_path / "root"]


def test_cli_hermes_home_is_scoped_to_the_command_and_restored(tmp_path: Path, monkeypatch):
    from hermes_project_stewardship.cli import app

    monkeypatch.setenv("HERMES_HOME", "/original/home")
    seen = {}

    def fake_dispatch(args, svc, engine, store):
        seen["home"] = os.environ.get("HERMES_HOME")
        return 0

    monkeypatch.setattr(app, "_dispatch", fake_dispatch)
    db = tmp_path / "s.db"
    assert app.main(["--db", str(db), "workflows", "tick", "--hermes-home", str(tmp_path / "h")]) == 0
    assert seen["home"] == str(tmp_path / "h")
    assert os.environ["HERMES_HOME"] == "/original/home"


def test_conftest_pops_the_dispatcher_worker_env_before_any_host_is_built():
    """Regression (testboards cleanup, 15/10/2026): the dispatcher hands every
    worker a board handoff in the environment (HERMES_KANBAN_DB pins the live
    board DB, honoured FIRST by kanban_db_path; HERMES_KANBAN_TASK pins the
    live write-guard). A worker running pytest inherits them, so tests/conftest
    must pop the whole injection family BEFORE any host is constructed."""
    for name in ("HERMES_KANBAN_BOARD", "HERMES_KANBAN_DB", "HERMES_KANBAN_TASK",
                 "HERMES_KANBAN_WORKSPACES_ROOT", "HERMES_TENANT"):
        assert name not in os.environ, (
            f"{name} leaked from the launching shell into the pytest process; "
            "tests/conftest.py must pop the dispatcher injection family at import"
        )
