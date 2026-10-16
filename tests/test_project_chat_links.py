"""Chat with a project's bots (Sahil 08/10, pick 1a = A), carrying the project's memory.

Project Stewardship's Chat button opens a fresh Desktop chat with one of the project's bots. A
plugin cannot learn the new chat's id: Desktop saves a chat on its first message and
``host.newChat`` returns nothing. So Project Stewardship records a one-time link first (bot,
project, ten minutes), and the first message of a new Desktop chat with that bot claims
it; from then on that chat gets the project's memory. Pinned here:
- migration v39: ``project_chat_links``, one chat per link;
- a link needs a bot on the project's team (not departed), lasts ten minutes, is audited;
- the hook claims only on a first turn, on the Desktop chat panel (``platform="desktop"``),
  not in a Kanban worker or a sub-agent, in the bot's own profile, oldest link first, once;
- every later turn of that chat gets the memory, also after a restart;
- the API needs the owner capability and a strict body; the Desktop proxy carries it.
"""
from __future__ import annotations

import sqlite3
from datetime import timedelta
from pathlib import Path

import pytest

from hermes_project_stewardship import bot_context
from hermes_project_stewardship.persistence import migrations
from hermes_project_stewardship.persistence.chat_links import (
    LINK_MINUTES,
    ChatLinkInvalid,
    ChatLinkNotFound,
    ChatLinkService,
)
from hermes_project_stewardship.persistence.membership import MembershipService
from hermes_project_stewardship.persistence.memory_service import ProjectMemoryService
from hermes_project_stewardship.persistence.service import StewardshipService
from hermes_project_stewardship.persistence.store import Store, utcnow

DOCKYARD = ("plugin-data", "hermes-dockyard", "dockyard.db")


def _seed(store: Store, project: str, *, memory: str) -> None:
    StewardshipService(store).enable(project, mission=f"{project} mission", lead_profile="lead",
                                     member_profiles=["coder"], autonomy_level=2)
    ProjectMemoryService(store).add(project, kind="rule", text=memory, actor="sahil", interface="rpc")


@pytest.fixture()
def fleet(tmp_path, monkeypatch):
    """Project Stewardship in the root profile with two projects; the bot 'coder' in its own profile."""
    root = tmp_path / "hermes"
    bot = root / "profiles" / "coder"
    bot.mkdir(parents=True)
    for key in ("STEWARD_DB_PATH", "DOCKYARD_PLUGIN_DB", "HERMES_KANBAN_TASK", "HERMES_KANBAN_BOARD"):
        monkeypatch.delenv(key, raising=False)
    monkeypatch.setenv("HERMES_HOME", str(bot))
    db = root.joinpath(*DOCKYARD)
    db.parent.mkdir(parents=True)
    store = Store(db)
    _seed(store, "alpha", memory="Alpha rule")
    _seed(store, "beta", memory="Beta rule")
    bot_context.reset_cache()
    yield store, ChatLinkService(store, MembershipService(store, StewardshipService(store)))
    bot_context.reset_cache()
    store.close()


def _turn(session, *, first=True, platform="desktop", parent=""):
    return bot_context.project_memory_hook(
        session_id=session, task_id="x", turn_id="1", user_message="hi", conversation_history=[],
        is_first_turn=first, model="m", platform=platform, parent_session_id=parent, sender_id="")


def _context(out):
    return out["context"] if out else None


# ---- migration v39 -------------------------------------------------------------

def test_v39_adds_chat_links_with_one_chat_per_link(store):
    assert store.schema_version >= 39
    columns = [r[1] for r in store._conn.execute("PRAGMA table_info(project_chat_links)")]
    assert columns == ["id", "project_id", "profile", "created_by", "created_at", "expires_at",
                       "session_id", "claimed_at"]
    StewardshipService(store).enable("p1", mission="m", lead_profile="lead", autonomy_level=2)
    with store.tx() as cx:
        for _ in range(2):
            cx.execute("INSERT INTO project_chat_links(project_id, profile, created_by, created_at,"
                       " expires_at) VALUES('p1', 'lead', 'sahil', 'a', 'b')")
        cx.execute("UPDATE project_chat_links SET session_id='s1' WHERE id=1")
    with pytest.raises(sqlite3.IntegrityError):
        with store.tx() as cx:
            cx.execute("UPDATE project_chat_links SET session_id='s1' WHERE id=2")
    v39 = next(m for m in migrations.MIGRATIONS if m.version == 39)
    store._conn.executescript(v39.downgrade_sql)
    assert store._conn.execute("SELECT name FROM sqlite_master WHERE name='project_chat_links'").fetchone() is None
    store._conn.executescript(v39.upgrade_sql)


# ---- opening a link ----------------------------------------------------------------

def test_open_needs_a_bot_on_the_team(fleet):
    store, links = fleet
    lead = links.open("alpha", profile="lead", actor="sahil", interface="rpc")
    member = links.open("alpha", profile="coder", actor="sahil", interface="rpc")
    assert lead["profile"] == "lead" and member["profile"] == "coder"
    with pytest.raises(ChatLinkInvalid, match="team"):
        links.open("alpha", profile="stranger", actor="sahil", interface="rpc")
    with pytest.raises(ChatLinkNotFound):
        links.open("ghost", profile="lead", actor="sahil", interface="rpc")
    row = store._conn.execute("SELECT created_at, expires_at FROM project_chat_links WHERE id=?",
                              (lead["id"],)).fetchone()
    assert row["expires_at"] > row["created_at"]
    assert "project.chat.opened" in [r["action"] for r in store.audit_tail(20)]
    assert LINK_MINUTES == 10


# ---- claiming a link -------------------------------------------------------------

def test_first_desktop_message_claims_the_link_and_keeps_it(fleet):
    _, links = fleet
    links.open("alpha", profile="coder", actor="sahil", interface="rpc")
    assert "Alpha rule" in _context(_turn("chat-1"))
    # Every later turn of that chat keeps the memory, also after a restart (the cache is gone).
    assert "Alpha rule" in _context(_turn("chat-1", first=False))
    bot_context.reset_cache()
    assert "Alpha rule" in _context(_turn("chat-1", first=False))
    # The link was used once: the next new chat gets nothing.
    assert _turn("chat-2") is None


def test_oldest_link_first_and_each_link_once(fleet):
    _, links = fleet
    links.open("alpha", profile="coder", actor="sahil", interface="rpc")
    links.open("beta", profile="coder", actor="sahil", interface="rpc")
    assert "Alpha rule" in _context(_turn("chat-1"))
    assert "Beta rule" in _context(_turn("chat-2"))
    assert _turn("chat-3") is None


@pytest.mark.parametrize("case", ["not_first_turn", "terminal_ui", "cli", "sub_agent", "worker",
                                  "other_bot", "expired"])
def test_only_a_new_desktop_chat_with_that_bot_claims(fleet, monkeypatch, case):
    _, links = fleet
    links.open("alpha", profile="lead" if case == "other_bot" else "coder", actor="sahil", interface="rpc")
    if case == "worker":
        monkeypatch.setenv("HERMES_KANBAN_TASK", "t_1")
        monkeypatch.setenv("HERMES_KANBAN_BOARD", "unbound-board")
    if case == "expired":
        later = utcnow() + timedelta(minutes=LINK_MINUTES + 1)
        monkeypatch.setattr(bot_context, "_now", lambda: later)
    kwargs = {"not_first_turn": dict(first=False), "terminal_ui": dict(platform="tui"),
              "cli": dict(platform="cli"), "sub_agent": dict(parent="parent-chat")}.get(case, {})
    assert _turn("chat-1", **kwargs) is None
    # Nothing was used up: the right chat still claims it (unless it expired or is another bot's).
    monkeypatch.delenv("HERMES_KANBAN_TASK", raising=False)
    monkeypatch.delenv("HERMES_KANBAN_BOARD", raising=False)
    bot_context.reset_cache()
    later = _context(_turn("chat-9"))
    if case in ("other_bot", "expired"):
        assert later is None
    else:
        assert later is not None and "Alpha rule" in later


def test_claiming_never_creates_a_database(tmp_path, monkeypatch):
    bot = tmp_path / "hermes" / "profiles" / "coder"
    bot.mkdir(parents=True)
    monkeypatch.setenv("HERMES_HOME", str(bot))
    monkeypatch.delenv("STEWARD_DB_PATH", raising=False)
    bot_context.reset_cache()
    assert _turn("chat-1") is None
    assert not (tmp_path / "hermes").joinpath(*DOCKYARD).exists()
    assert not bot.joinpath(*DOCKYARD).exists()


# ---- API ----------------------------------------------------------------------

fastapi = pytest.importorskip("fastapi")
from fastapi.testclient import TestClient  # noqa: E402

from hermes_project_stewardship.api.server import create_app  # noqa: E402
from hermes_project_stewardship.kanban import ReferenceKanbanAdapter  # noqa: E402

V1 = "/stewardship/v1"


def _client(store, **kw):
    return TestClient(create_app(store, kanban_adapter=ReferenceKanbanAdapter(store), auth_token="t0k",
                                 auth_principal="sahil", auth_principal_is_human=kw.get("human", True),
                                 capabilities=kw.get("capabilities")),
                      headers={"Authorization": "Bearer t0k"})


def test_api_opens_a_link(store):
    StewardshipService(store).enable("alpha", mission="m", lead_profile="lead", member_profiles=["coder"],
                                     autonomy_level=2)
    client = _client(store)
    made = client.post(f"{V1}/projects/alpha/chat-links", json={"profile": "coder"})
    assert made.status_code == 200, made.text
    assert made.json()["profile"] == "coder" and made.json()["expires_at"]
    assert client.post(f"{V1}/projects/alpha/chat-links", json={"profile": "stranger"}).status_code == 422
    assert client.post(f"{V1}/projects/ghost/chat-links", json={"profile": "coder"}).status_code == 404
    assert client.post(f"{V1}/projects/alpha/chat-links",
                       json={"profile": "coder", "actor": "forged"}).status_code == 422
    refused = _client(store, capabilities=[]).post(f"{V1}/projects/alpha/chat-links", json={"profile": "coder"})
    assert refused.status_code in (403, 503)


def test_proxy_carries_chat_links():
    text = (Path(__file__).parents[1] / "hermes_dockyard_plugin/dashboard/plugin_api.py").read_text(encoding="utf-8")
    assert '@plugin_api.post("/projects/{project_id}/chat-links")' in text
