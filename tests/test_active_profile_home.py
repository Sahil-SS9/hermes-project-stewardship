"""Issue #36: Stewardship follows Hermes' active profile, not the launch profile.

A multiplexed Hermes Desktop/TUI process serves several profiles. Hermes binds each
session's profile with a context-local override (``hermes_constants
.set_hermes_home_override``) and deliberately leaves ``os.environ["HERMES_HOME"]`` at
the launch profile, because every profile in the process shares the environment.
Stewardship read the raw environment, so in a named profile's Desktop chat the
project-memory hook looked for the *launch* profile's chat link, left the named
profile's link unclaimed and delivered no memory; the profile-local store was
looked up in the wrong home too.

Pinned here, without and with a real Hermes host:
- the hook and the store paths follow Hermes' active home (override > HERMES_HOME >
  platform default) and never write the environment;
- concurrent profile scopes each claim only their own profile's link;
- a profile never claims another profile's link or sees its memory;
- the profile-local-before-root rule and an explicit database path still apply;
- without Hermes (standalone) the environment rule is unchanged;
- a failing Hermes resolver gives no memory and claims nothing, rather than
  falling back to the launch profile;
- a store left at the old ``~/.hermes`` fallback (Windows, where Hermes uses
  %LOCALAPPDATA%) needs an explicit selection instead of being silently replaced.
"""
from __future__ import annotations

import contextvars
import os
import sqlite3
import sys
import threading
import types
from pathlib import Path

import pytest

from hermes_project_stewardship import bot_context, runtime
from hermes_project_stewardship.persistence.chat_links import ChatLinkService
from hermes_project_stewardship.persistence.membership import MembershipService
from hermes_project_stewardship.persistence.memory_service import ProjectMemoryService
from hermes_project_stewardship.persistence.service import StewardshipService
from hermes_project_stewardship.persistence.store import Store

DOCKYARD = ("plugin-data", "hermes-dockyard", "dockyard.db")


def _fake_hermes(monkeypatch, *, platform_default: Path, fail: bool = False) -> types.ModuleType:
    """A stand-in for ``hermes_constants`` with Hermes' documented resolution order."""
    module = types.ModuleType("hermes_constants")
    override: contextvars.ContextVar = contextvars.ContextVar("hermes_home_override", default=None)

    def set_hermes_home_override(path):
        return override.set(None if path is None else str(path))

    def reset_hermes_home_override(token):
        override.reset(token)

    def get_hermes_home() -> Path:
        if fail:
            raise RuntimeError("profile resolver failed")
        value = override.get()
        if value:
            return Path(value)
        env = os.environ.get("HERMES_HOME", "").strip()
        return Path(env) if env else platform_default

    module.set_hermes_home_override = set_hermes_home_override
    module.reset_hermes_home_override = reset_hermes_home_override
    module.get_hermes_home = get_hermes_home
    monkeypatch.setitem(sys.modules, "hermes_constants", module)
    return module


def _seed(store: Store, project: str, *, memory: str, members: list[str]) -> None:
    StewardshipService(store).enable(project, mission=f"{project} mission", lead_profile="lead",
                                     member_profiles=members, autonomy_level=2)
    ProjectMemoryService(store).add(project, kind="rule", text=memory, actor="sahil", interface="rpc")


def _links(store: Store) -> ChatLinkService:
    return ChatLinkService(store, MembershipService(store, StewardshipService(store)))


def _turn(session: str):
    return bot_context.project_memory_hook(
        session_id=session, task_id="x", turn_id="1", user_message="hi", conversation_history=[],
        is_first_turn=True, model="m", platform="desktop", parent_session_id="", sender_id="")


def _context(out):
    return out["context"] if out else None


def _claims(db: Path) -> dict[int, tuple[str, str | None]]:
    with sqlite3.connect(db) as conn:
        return {row[0]: (row[1], row[2]) for row in
                conn.execute("SELECT id, profile, session_id FROM project_chat_links ORDER BY id")}


@pytest.fixture()
def fleet(tmp_path, monkeypatch):
    """Stewardship in the root profile; Desktop launched in the root (default) profile."""
    root = tmp_path / "hermes"
    for name in ("coder", "lead"):
        (root / "profiles" / name).mkdir(parents=True)
    for key in ("STEWARD_DB_PATH", "DOCKYARD_PLUGIN_DB", "HERMES_KANBAN_TASK", "HERMES_KANBAN_BOARD"):
        monkeypatch.delenv(key, raising=False)
    monkeypatch.setenv("HERMES_HOME", str(root))
    db = root.joinpath(*DOCKYARD)
    db.parent.mkdir(parents=True)
    store = Store(db)
    _seed(store, "alpha", memory="Alpha rule", members=["coder"])
    _seed(store, "beta", memory="Beta rule", members=["coder"])
    bot_context.reset_cache()
    yield root, db, store
    bot_context.reset_cache()
    store.close()


# ---- the reporter's identity reproduction -------------------------------------

def test_own_profile_follows_the_context_local_profile(fleet, monkeypatch):
    root, _, _ = fleet
    hermes = _fake_hermes(monkeypatch, platform_default=root)
    token = hermes.set_hermes_home_override(root / "profiles" / "coder")
    try:
        assert bot_context._own_profile() == "coder"
        assert runtime.active_hermes_home() == (root / "profiles" / "coder").resolve()
        assert runtime._profile_db_path() == (root / "profiles" / "coder").resolve().joinpath(*DOCKYARD)
        assert runtime._root_db_path() == root.resolve().joinpath(*DOCKYARD)
    finally:
        hermes.reset_hermes_home_override(token)
    assert bot_context._own_profile() == "default"
    assert os.environ["HERMES_HOME"] == str(root), "the environment is never written"


# ---- the hook in a multiplexed process ----------------------------------------

def test_hook_claims_the_active_profiles_link_in_a_multiplexed_process(fleet, monkeypatch):
    root, db, store = fleet
    hermes = _fake_hermes(monkeypatch, platform_default=root)
    link = _links(store).open("alpha", profile="coder", actor="sahil", interface="rpc")
    token = hermes.set_hermes_home_override(root / "profiles" / "coder")
    try:
        assert "Alpha rule" in _context(_turn("desktop-chat-1"))
    finally:
        hermes.reset_hermes_home_override(token)
    assert _claims(db)[link["id"]] == ("coder", "desktop-chat-1")
    assert os.environ["HERMES_HOME"] == str(root)


def test_the_launch_profile_does_not_take_a_named_profiles_link(fleet, monkeypatch):
    root, db, store = fleet
    _fake_hermes(monkeypatch, platform_default=root)
    link = _links(store).open("alpha", profile="coder", actor="sahil", interface="rpc")
    assert _turn("default-chat-1") is None  # a chat in the launch (default) profile
    assert _claims(db)[link["id"]] == ("coder", None)


def test_concurrent_profile_scopes_claim_only_their_own_links(fleet, monkeypatch):
    root, db, store = fleet
    hermes = _fake_hermes(monkeypatch, platform_default=root)
    _seed(store, "gamma", memory="Gamma rule", members=["lead"])  # lead leads every project
    links = _links(store)
    coder_link = links.open("alpha", profile="coder", actor="sahil", interface="rpc")
    lead_link = links.open("gamma", profile="lead", actor="sahil", interface="rpc")
    barrier = threading.Barrier(2)
    results: dict[str, object] = {}

    def chat(profile: str, session: str) -> None:
        def scoped() -> None:
            token = hermes.set_hermes_home_override(root / "profiles" / profile)
            try:
                barrier.wait(timeout=5)  # both scopes are bound before either turn runs
                results[profile] = _context(_turn(session))
                barrier.wait(timeout=5)
                results[f"{profile}-after"] = bot_context._own_profile()
            finally:
                hermes.reset_hermes_home_override(token)
        contextvars.copy_context().run(scoped)

    threads = [threading.Thread(target=chat, args=("coder", "chat-coder")),
               threading.Thread(target=chat, args=("lead", "chat-lead"))]
    for thread in threads:
        thread.start()
    for thread in threads:
        thread.join(timeout=10)
    assert "Alpha rule" in results["coder"] and "Gamma rule" not in results["coder"]
    assert "Gamma rule" in results["lead"] and "Alpha rule" not in results["lead"]
    assert results["coder-after"] == "coder" and results["lead-after"] == "lead"
    claims = _claims(db)
    assert claims[coder_link["id"]] == ("coder", "chat-coder")
    assert claims[lead_link["id"]] == ("lead", "chat-lead")
    assert os.environ["HERMES_HOME"] == str(root)


def test_a_profile_never_claims_another_profiles_link(fleet, monkeypatch):
    root, db, store = fleet
    hermes = _fake_hermes(monkeypatch, platform_default=root)
    monkeypatch.setenv("HERMES_HOME", str(root / "profiles" / "coder"))  # launched as coder
    link = _links(store).open("alpha", profile="coder", actor="sahil", interface="rpc")
    token = hermes.set_hermes_home_override(root / "profiles" / "lead")  # this chat is lead's
    try:
        assert _turn("lead-chat") is None
    finally:
        hermes.reset_hermes_home_override(token)
    assert _claims(db)[link["id"]] == ("coder", None)


# ---- store selection ------------------------------------------------------------

def test_profile_local_store_still_wins_under_the_override(fleet, monkeypatch):
    root, _, _ = fleet
    hermes = _fake_hermes(monkeypatch, platform_default=root)
    local = (root / "profiles" / "coder").joinpath(*DOCKYARD)
    local.parent.mkdir(parents=True)
    local_store = Store(local)
    _seed(local_store, "local-only", memory="Local rule", members=["coder"])
    local_store.close()
    token = hermes.set_hermes_home_override(root / "profiles" / "coder")
    try:
        assert runtime.locate_shared_db() == local.resolve()
        assert runtime.bot_db_path() is None  # the profile's own store: no redirect
    finally:
        hermes.reset_hermes_home_override(token)
    token = hermes.set_hermes_home_override(root / "profiles" / "lead")
    try:
        assert runtime.locate_shared_db() == root.resolve().joinpath(*DOCKYARD)
        assert runtime.bot_db_path() == root.resolve().joinpath(*DOCKYARD)
        explicit = root / "explicit.db"
        monkeypatch.setenv("STEWARD_DB_PATH", str(explicit))
        assert runtime.locate_shared_db() == explicit.resolve()
        assert runtime.bot_db_path() is None
    finally:
        hermes.reset_hermes_home_override(token)


def test_without_hermes_the_environment_rule_is_unchanged(tmp_path, monkeypatch):
    monkeypatch.setitem(sys.modules, "hermes_constants", None)  # standalone: Hermes absent
    home = tmp_path / "hermes" / "profiles" / "coder"
    monkeypatch.setenv("HERMES_HOME", str(home))
    assert runtime.active_hermes_home() == home.resolve()
    assert bot_context._own_profile() == "coder"
    assert runtime._root_db_path() == (tmp_path / "hermes").resolve().joinpath(*DOCKYARD)
    monkeypatch.delenv("HERMES_HOME")
    monkeypatch.setenv("HOME", str(tmp_path / "os-home"))
    monkeypatch.setenv("USERPROFILE", str(tmp_path / "os-home"))
    assert runtime.active_hermes_home() == (tmp_path / "os-home" / ".hermes").resolve()
    assert bot_context._own_profile() == "default"


def test_a_failing_hermes_resolver_is_never_replaced_by_the_launch_profile(fleet, monkeypatch):
    root, db, store = fleet
    monkeypatch.setenv("HERMES_HOME", str(root / "profiles" / "coder"))  # launched as coder
    link = _links(store).open("alpha", profile="coder", actor="sahil", interface="rpc")
    _fake_hermes(monkeypatch, platform_default=root, fail=True)
    with pytest.raises(RuntimeError, match="profile resolver failed"):
        runtime.active_hermes_home()
    assert _turn("chat-1") is None  # no memory for the turn, and nothing claimed
    assert _claims(db)[link["id"]] == ("coder", None)


# ---- the old ~/.hermes fallback (Windows) ----------------------------------------

def _windows_like(tmp_path, monkeypatch) -> tuple[Path, Path]:
    """Hermes' default home is not ~/.hermes (as on Windows) and HERMES_HOME is unset."""
    user_home = tmp_path / "user"
    platform_default = tmp_path / "LocalAppData" / "hermes"
    monkeypatch.setenv("HOME", str(user_home))
    monkeypatch.setenv("USERPROFILE", str(user_home))
    for key in ("HERMES_HOME", "STEWARD_DB_PATH", "DOCKYARD_PLUGIN_DB"):
        monkeypatch.delenv(key, raising=False)
    monkeypatch.chdir(tmp_path)
    monkeypatch.setattr(runtime, "_HOST_REGISTERED", True)
    _fake_hermes(monkeypatch, platform_default=platform_default)
    return user_home, platform_default


def test_the_default_store_moves_to_hermes_own_home(tmp_path, monkeypatch):
    _, platform_default = _windows_like(tmp_path, monkeypatch)
    assert runtime.resolve_db_path() == platform_default.resolve().joinpath(*DOCKYARD)


def test_a_store_at_the_old_fallback_needs_an_explicit_selection(tmp_path, monkeypatch):
    user_home, _ = _windows_like(tmp_path, monkeypatch)
    old = (user_home / ".hermes").joinpath(*DOCKYARD)
    old.parent.mkdir(parents=True)
    old_store = Store(old)
    _seed(old_store, "alpha", memory="Alpha rule", members=["coder"])
    old_store.close()
    with pytest.raises(runtime.StateSelectionError, match="No data was moved") as raised:
        runtime.resolve_db_path()
    assert str(old.resolve()) in str(raised.value)
    monkeypatch.setenv("STEWARD_DB_PATH", str(old))
    assert runtime.resolve_db_path() == old.resolve()


def test_the_old_fallback_is_the_canonical_home_where_hermes_uses_it(tmp_path, monkeypatch):
    user_home = tmp_path / "user"
    monkeypatch.setenv("HOME", str(user_home))
    monkeypatch.setenv("USERPROFILE", str(user_home))
    for key in ("HERMES_HOME", "STEWARD_DB_PATH", "DOCKYARD_PLUGIN_DB"):
        monkeypatch.delenv(key, raising=False)
    monkeypatch.chdir(tmp_path)
    monkeypatch.setattr(runtime, "_HOST_REGISTERED", True)
    _fake_hermes(monkeypatch, platform_default=user_home / ".hermes")  # Linux and macOS
    populated = (user_home / ".hermes").joinpath(*DOCKYARD)
    populated.parent.mkdir(parents=True)
    store = Store(populated)
    _seed(store, "alpha", memory="Alpha rule", members=["coder"])
    store.close()
    assert runtime.resolve_db_path() == populated.resolve()


# ---- a real Hermes host -------------------------------------------------------------

def test_real_hermes_context_override_reaches_the_hook(fleet):
    hermes_constants = pytest.importorskip("hermes_constants")
    if not hasattr(hermes_constants, "set_hermes_home_override"):
        pytest.skip("this Hermes has no context-local home override")
    root, db, store = fleet
    link = _links(store).open("alpha", profile="coder", actor="sahil", interface="rpc")
    token = hermes_constants.set_hermes_home_override(root / "profiles" / "coder")
    try:
        assert Path(hermes_constants.get_hermes_home()).name == "coder"
        assert bot_context._own_profile() == "coder"
        assert "Alpha rule" in _context(_turn("desktop-chat-1"))
    finally:
        hermes_constants.reset_hermes_home_override(token)
    assert _claims(db)[link["id"]] == ("coder", "desktop-chat-1")
    assert bot_context._own_profile() == "default"
    assert os.environ["HERMES_HOME"] == str(root)
