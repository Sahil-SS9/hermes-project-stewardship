"""Project memory reaches bots (Sahil 08/10, pick 1b = A).

A bot works on a Dockyard project when a Kanban worker runs one of the project's tasks.
Workers run in the bot's own profile (``HERMES_HOME=<root>/profiles/<bot>``) with
``HERMES_KANBAN_TASK`` and ``HERMES_KANBAN_BOARD`` set; Dockyard itself normally runs
in the root profile. Pinned here:
- the bot finds Dockyard's data: an explicit path, else its own profile's copy if it
  has projects, else the root profile's copy if it has projects; an empty stray copy
  never wins;
- the ``pre_llm_call`` hook gives a worker its project's memory: board -> project
  through the owner's Hermes projects list, exactly, never guessed;
- it gives nothing (and writes nothing) when there is no database, the schema is
  older than v38, the board is not bound, the project is off, or there is no memory;
- it never raises;
- Dockyard's existing bot tools use the same lookup, so enabling Dockyard in a bot's
  profile no longer creates an empty copy there.
"""
from __future__ import annotations

import hashlib
import sqlite3
from pathlib import Path

import pytest

from hermes_project_stewardship import bot_context, plugin
from hermes_project_stewardship.persistence import migrations, store as store_module
from hermes_project_stewardship.persistence.memory_service import ProjectMemoryService
from hermes_project_stewardship.persistence.service import StewardshipService
from hermes_project_stewardship.persistence.store import Store
from hermes_project_stewardship.runtime import locate_shared_db

DOCKYARD = ("plugin-data", "hermes-dockyard", "dockyard.db")


def _dockyard(home: Path, *, project: str | None = "alpha", memory: str | None = "Never push to main",
              version: int | None = None) -> Path:
    path = home.joinpath(*DOCKYARD)
    path.parent.mkdir(parents=True, exist_ok=True)
    with pytest.MonkeyPatch.context() as context:
        if version is not None:  # a database stopped at an older schema
            context.setattr(store_module, "MIGRATIONS",
                            [m for m in migrations.MIGRATIONS if m.version <= version])
        store = Store(path)
        try:
            if project:
                StewardshipService(store).enable(project, mission=f"{project} mission", lead_profile="lead",
                                                 autonomy_level=2)
                if memory and version is None:
                    ProjectMemoryService(store).add(project, kind="rule", text=memory, actor="sahil",
                                                    interface="rpc")
        finally:
            store.close()
    return path


def _projects(home: Path, rows: list[tuple[str, str, str | None]]) -> Path:
    """The owner's Hermes projects list, with the columns Hermes itself defines."""
    path = home / "projects.db"
    try:
        from hermes_cli import projects_db
    except ImportError:
        projects_db = None
    if projects_db is not None:
        with projects_db.connect_closing(db_path=path) as conn:
            for pid, slug, board in rows:
                made = projects_db.create_project(conn, name=slug.title(), slug=slug, board_slug=board)
                conn.execute("UPDATE projects SET id=? WHERE id=?", (pid, made))
                conn.commit()
        return path
    conn = sqlite3.connect(path)
    conn.execute("CREATE TABLE projects (id TEXT PRIMARY KEY, slug TEXT NOT NULL UNIQUE, name TEXT NOT NULL,"
                 " description TEXT, icon TEXT, color TEXT, board_slug TEXT, primary_path TEXT,"
                 " created_at INTEGER NOT NULL, archived INTEGER NOT NULL DEFAULT 0)")
    conn.executemany("INSERT INTO projects(id, slug, name, board_slug, created_at) VALUES(?,?,?,?,0)",
                     [(pid, slug, slug.title(), board) for pid, slug, board in rows])
    conn.commit()
    conn.close()
    return path


@pytest.fixture()
def fleet(tmp_path, monkeypatch):
    """A root profile running Dockyard and a bot profile the worker runs in."""
    root = tmp_path / "hermes"
    bot = root / "profiles" / "coder"
    bot.mkdir(parents=True)
    for key in ("STEWARD_DB_PATH", "DOCKYARD_PLUGIN_DB", "HERMES_KANBAN_TASK", "HERMES_KANBAN_BOARD"):
        monkeypatch.delenv(key, raising=False)
    monkeypatch.setenv("HERMES_HOME", str(bot))
    bot_context.reset_cache()
    yield root, bot
    bot_context.reset_cache()


def _worker(monkeypatch, board="alpha-board", task="t_1"):
    monkeypatch.setenv("HERMES_KANBAN_TASK", task)
    monkeypatch.setenv("HERMES_KANBAN_BOARD", board)


def _turn(**overrides):
    kwargs = dict(session_id="s1", task_id="x", turn_id="1", user_message="go", conversation_history=[],
                  is_first_turn=True, model="m", platform="cli", parent_session_id="", sender_id="")
    kwargs.update(overrides)
    return bot_context.project_memory_hook(**kwargs)


def _sha(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


# ---- finding Dockyard's data ----------------------------------------------------

def test_lookup_prefers_explicit_then_own_then_root(fleet, monkeypatch, tmp_path):
    root, bot = fleet
    assert locate_shared_db() is None
    root_db = _dockyard(root)
    assert locate_shared_db() == root_db
    stray = _dockyard(bot, project=None)  # an empty copy, like the 08/09 leftovers
    assert locate_shared_db() == root_db
    stray.unlink()
    own = _dockyard(bot, project="beta")
    assert locate_shared_db() == own
    monkeypatch.setenv("STEWARD_DB_PATH", str(tmp_path / "chosen.db"))
    assert locate_shared_db() == (tmp_path / "chosen.db").resolve()


def test_lookup_in_the_root_profile_is_its_own_copy(fleet, monkeypatch):
    root, _ = fleet
    monkeypatch.setenv("HERMES_HOME", str(root))
    db = _dockyard(root)
    assert locate_shared_db() == db


# ---- the hook ----------------------------------------------------------------

def test_worker_gets_its_projects_memory(fleet, monkeypatch):
    root, _ = fleet
    _dockyard(root)
    _projects(root, [("p_abc", "alpha", "alpha-board")])
    _worker(monkeypatch)
    out = _turn()
    assert out and out["context"].startswith("Dockyard project memory for project alpha")
    assert "Never push to main" in out["context"]
    # Later turns of the same worker get it too: the context is per turn.
    assert _turn(is_first_turn=False, session_id="s1")["context"] == out["context"]


def test_dockyard_project_can_be_the_hermes_project_id(fleet, monkeypatch):
    root, _ = fleet
    _dockyard(root, project="p_abc")
    _projects(root, [("p_abc", "alpha", "alpha-board")])
    _worker(monkeypatch)
    assert "project p_abc" in _turn()["context"]


@pytest.mark.parametrize("case", ["not_a_worker", "unbound_board", "project_off", "no_memory",
                                  "two_projects_one_board"])
def test_hook_gives_nothing_without_an_exact_project(fleet, monkeypatch, case):
    root, _ = fleet
    db = _dockyard(root, memory=None if case == "no_memory" else "Never push to main")
    rows = [("p_abc", "alpha", "alpha-board")]
    if case == "two_projects_one_board":
        rows.append(("p_def", "alpha2", "alpha-board"))
    _projects(root, rows)
    if case == "project_off":
        store = Store(db)
        StewardshipService(store).disable("alpha", actor="sahil")
        store.close()
    if case != "not_a_worker":
        _worker(monkeypatch, board="other-board" if case == "unbound_board" else "alpha-board")
    assert _turn() is None


def test_hook_never_creates_or_migrates_a_database(fleet, monkeypatch):
    root, bot = fleet
    _projects(root, [("p_abc", "alpha", "alpha-board")])
    _worker(monkeypatch)
    assert _turn() is None
    assert not root.joinpath(*DOCKYARD).exists() and not bot.joinpath(*DOCKYARD).exists()
    old = _dockyard(root, version=37)
    before = _sha(old)
    assert _turn() is None  # older schema: skipped, not upgraded
    assert _sha(old) == before
    conn = sqlite3.connect(old)  # the schema ledger still says 37
    assert conn.execute("SELECT max(version) FROM schema_migrations").fetchone()[0] == 37
    conn.close()


def test_hook_never_raises(fleet, monkeypatch):
    root, _ = fleet
    broken = root.joinpath(*DOCKYARD)
    broken.parent.mkdir(parents=True)
    broken.write_bytes(b"not a database at all")
    _worker(monkeypatch)
    assert _turn() is None
    monkeypatch.setattr(bot_context, "_project_for_turn", lambda *a, **k: 1 / 0)
    assert _turn() is None


def test_register_adds_the_hook(monkeypatch):
    monkeypatch.setattr("hermes_project_stewardship.runtime._HOST_REGISTERED", False)
    hooks = {}

    class Runtime:
        def register_hook(self, name, callback):
            hooks[name] = callback

    summary = plugin.register(Runtime())
    assert summary["hooks"] == ["pre_llm_call"]
    assert hooks["pre_llm_call"] is bot_context.project_memory_hook


# ---- the existing bot tools ------------------------------------------------------

def test_bot_tools_read_dockyard_in_the_root_profile(fleet, monkeypatch):
    root, bot = fleet
    _dockyard(root)
    monkeypatch.setattr("hermes_project_stewardship.runtime._HOST_REGISTERED", True)
    plugin.PluginState.reset()
    plugin.PluginState.db_path = None
    try:
        status = plugin.tool_steward_status("alpha")
    finally:
        plugin.PluginState.reset()
    assert status["settings"]["project_id"] == "alpha"
    assert not bot.joinpath("plugin-data").exists(), "no stray copy in the bot's profile"
