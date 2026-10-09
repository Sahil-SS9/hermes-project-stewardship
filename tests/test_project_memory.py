"""Project memory (Sahil 08/10, pick 1b = A: "Dockyard keeps each project's own memory
(facts, decisions, rules) and gives it to a bot whenever it works on that project").

Design and the facts it rests on: HPS-Audit-2026-09-24/BUILD-CHECKS-R1.md. Pinned here:
- migration v38 reuses the never-wired ``project_knowledge`` table: kinds fact/decision/rule,
  1-500 characters, archive instead of delete, history through ``supersedes_id``;
  any old rows come through (decision stays decision, finding/incident become facts);
- the service: add; edit = a new entry that replaces the old one (history kept, one
  successor only); archive/restore never delete and refuse the wrong state (409);
- what a bot gets: rules, then decisions, then facts, newest first, capped, with a header
  naming the project; nothing when the project has no memory;
- finished work can be offered as a starting point, never added by itself;
- API: reads are open; every write needs the project-owner capability and a payload can
  never name its own actor; the Desktop proxy carries every route.
"""
from __future__ import annotations

import sqlite3

import pytest

from hermes_project_stewardship.persistence import migrations, store as store_module
from hermes_project_stewardship.persistence.memory_service import (
    CONTEXT_CAP,
    MAX_TEXT,
    MemoryConflict,
    MemoryInvalid,
    MemoryNotFound,
    ProjectMemoryService,
)
from hermes_project_stewardship.persistence.service import StewardshipService
from hermes_project_stewardship.persistence.store import Store


@pytest.fixture()
def memory(store, clock):
    StewardshipService(store, clock=clock).enable(
        "alpha", mission="ship the alpha app", lead_profile="lead",
        member_profiles=["coder"], autonomy_level=2)
    StewardshipService(store, clock=clock).enable(
        "beta", mission="beta mission", lead_profile="lead", autonomy_level=2)
    return ProjectMemoryService(store, clock=clock)


def _add(memory, text, kind="fact", project="alpha", **kw):
    return memory.add(project, kind=kind, text=text, actor="sahil", interface="rpc", **kw)


# ---- migration v38 ------------------------------------------------------------

def test_v38_rebuilds_project_knowledge_and_keeps_old_rows(tmp_path, monkeypatch):
    path = tmp_path / "v37.db"
    with monkeypatch.context() as context:
        context.setattr(store_module, "MIGRATIONS", [m for m in migrations.MIGRATIONS if m.version <= 37])
        old = Store(path)
        assert old.schema_version == 37
        StewardshipService(old).enable("p1", mission="m", lead_profile="l", autonomy_level=2)
        with old.tx() as cx:
            for row in ((1, "decision", "use sqlite", None), (2, "finding", "ci is slow", None),
                        (3, "incident", "outage on 01/10", None), (4, "decision", "use sqlite 3.45", 1)):
                cx.execute(
                    "INSERT INTO project_knowledge(id, project_id, type, statement, source,"
                    " confidence, supersedes_id, created_at) VALUES(?,?,?,?,?,?,?,?)",
                    (row[0], "p1", row[1], row[2], "cycle", 0.5, row[3], "2026-10-01T00:00:00+00:00"))
        old.close()
    upgraded = Store(path)
    try:
        assert upgraded.schema_version == migrations.SCHEMA_VERSION >= 38  # through v38 to the latest
        columns = [r[1] for r in upgraded._conn.execute("PRAGMA table_info(project_knowledge)")]
        assert columns == ["id", "project_id", "kind", "text", "source", "supersedes_id",
                           "created_by", "created_at", "archived_at", "archived_by"]
        rows = [tuple(r) for r in upgraded._conn.execute(
            "SELECT id, kind, text, source, supersedes_id, created_by FROM project_knowledge ORDER BY id")]
        assert rows == [(1, "decision", "use sqlite", "cycle", None, "cycle"),
                        (2, "fact", "ci is slow", "cycle", None, "cycle"),
                        (3, "fact", "outage on 01/10", "cycle", None, "cycle"),
                        (4, "decision", "use sqlite 3.45", "cycle", 1, "cycle")]
        # The kinds are a closed list and the text has the same limit as the service.
        for kind, text in (("finding", "x"), ("fact", ""), ("fact", "x" * (MAX_TEXT + 1))):
            with pytest.raises(sqlite3.IntegrityError):
                with upgraded.tx() as cx:
                    cx.execute(
                        "INSERT INTO project_knowledge(project_id, kind, text, source, created_by,"
                        " created_at) VALUES('p1', ?, ?, 'human', 'sahil', 'now')", (kind, text))
        # One successor only: an entry cannot be replaced twice.
        with pytest.raises(sqlite3.IntegrityError):
            with upgraded.tx() as cx:
                cx.execute(
                    "INSERT INTO project_knowledge(project_id, kind, text, source, supersedes_id,"
                    " created_by, created_at) VALUES('p1', 'decision', 'fork', 'human', 1, 'sahil', 'now')")
    finally:
        upgraded.close()


def test_v38_downgrade_then_upgrade_round_trips(tmp_path):
    store = Store(tmp_path / "roundtrip.db")
    v38 = next(m for m in migrations.MIGRATIONS if m.version == 38)
    try:
        StewardshipService(store).enable("p1", mission="m", lead_profile="l", autonomy_level=2)
        with store.tx() as cx:
            cx.execute("INSERT INTO project_knowledge(project_id, kind, text, source, created_by,"
                       " created_at) VALUES('p1', 'rule', 'never push to main', 'human', 'sahil', 'now')")
        store._conn.executescript(v38.downgrade_sql)
        columns = [r[1] for r in store._conn.execute("PRAGMA table_info(project_knowledge)")]
        assert columns == ["id", "project_id", "type", "statement", "source", "confidence",
                           "supersedes_id", "created_at"]
        assert tuple(store._conn.execute("SELECT type, statement FROM project_knowledge").fetchone()) == (
            "decision", "never push to main")
        store._conn.executescript(v38.upgrade_sql)
        assert tuple(store._conn.execute("SELECT kind, text FROM project_knowledge").fetchone()) == (
            "decision", "never push to main")
    finally:
        store.close()


# ---- service ------------------------------------------------------------------

def test_add_lists_newest_first_and_audits(memory, store):
    first = _add(memory, "The app ships to the Play Store only", kind="fact")
    second = _add(memory, "  Never push straight to main  ", kind="rule")
    assert second["text"] == "Never push straight to main"  # trimmed
    assert second["source"] == "human" and second["created_by"] == "sahil"
    assert [e["id"] for e in memory.entries("alpha")] == [second["id"], first["id"]]
    assert memory.entries("beta") == []
    actions = [r["action"] for r in store.audit_tail(20)]
    assert actions.count("project.memory.added") == 2


@pytest.mark.parametrize("kind,text,message", [
    ("finding", "x", "kind"),
    ("fact", "   ", "text"),
    ("fact", "x" * (MAX_TEXT + 1), "500"),
])
def test_add_refuses_bad_input(memory, kind, text, message):
    with pytest.raises(MemoryInvalid, match=message):
        _add(memory, text, kind=kind)


def test_add_needs_a_known_project_and_a_valid_source(memory):
    with pytest.raises(MemoryNotFound):
        memory.add("ghost", kind="fact", text="x", actor="sahil", interface="rpc")
    with pytest.raises(MemoryInvalid, match="source"):
        _add(memory, "x", source="bot")
    entry = _add(memory, "CI takes 9 minutes", source="work:t_abc123")
    assert entry["source"] == "work:t_abc123"


def test_edit_replaces_and_keeps_history(memory, store):
    old = _add(memory, "Release on Fridays", kind="decision")
    new = memory.edit("alpha", old["id"], text="Release on Thursdays", actor="sahil", interface="rpc")
    assert new["supersedes_id"] == old["id"] and new["kind"] == "decision"
    assert [e["text"] for e in memory.entries("alpha")] == ["Release on Thursdays"]
    assert [e["text"] for e in memory.history("alpha", new["id"])] == [
        "Release on Fridays", "Release on Thursdays"]
    kind_only = memory.edit("alpha", new["id"], kind="rule", actor="sahil", interface="rpc")
    assert kind_only["text"] == "Release on Thursdays" and kind_only["kind"] == "rule"
    # Only the current entry can be edited; an old one is history.
    with pytest.raises(MemoryConflict):
        memory.edit("alpha", old["id"], text="again", actor="sahil", interface="rpc")
    with pytest.raises(MemoryInvalid):
        memory.edit("alpha", kind_only["id"], actor="sahil", interface="rpc")  # nothing to change
    assert "project.memory.edited" in [r["action"] for r in store.audit_tail(20)]


def test_archive_and_restore_never_delete(memory):
    entry = _add(memory, "Staging is at staging.example", kind="fact")
    archived = memory.archive("alpha", entry["id"], actor="sahil", interface="rpc")
    assert archived["archived_at"] and archived["archived_by"] == "sahil"
    assert memory.entries("alpha") == []
    assert [e["id"] for e in memory.entries("alpha", include_archived=True)] == [entry["id"]]
    with pytest.raises(MemoryConflict):
        memory.archive("alpha", entry["id"], actor="sahil", interface="rpc")
    with pytest.raises(MemoryConflict):
        memory.edit("alpha", entry["id"], text="y", actor="sahil", interface="rpc")
    restored = memory.restore("alpha", entry["id"], actor="sahil", interface="rpc")
    assert restored["archived_at"] is None and restored["text"] == entry["text"]
    with pytest.raises(MemoryConflict):
        memory.restore("alpha", entry["id"], actor="sahil", interface="rpc")


def test_entries_belong_to_their_project(memory):
    entry = _add(memory, "alpha only")
    with pytest.raises(MemoryNotFound):
        memory.archive("beta", entry["id"], actor="sahil", interface="rpc")
    with pytest.raises(MemoryNotFound):
        memory.edit("beta", entry["id"], text="x", actor="sahil", interface="rpc")


# ---- what a bot gets ----------------------------------------------------------

def test_bot_context_orders_rules_decisions_facts(memory):
    assert memory.bot_context("alpha") == ""
    _add(memory, "Old fact", kind="fact")
    _add(memory, "Decided to use Expo", kind="decision")
    _add(memory, "New fact", kind="fact")
    _add(memory, "Never push to main", kind="rule")
    archived = _add(memory, "Archived rule", kind="rule")
    memory.archive("alpha", archived["id"], actor="sahil", interface="rpc")
    text = memory.bot_context("alpha")
    assert text.startswith("Dockyard project memory for project alpha (mission: ship the alpha app)")
    assert "Archived rule" not in text
    order = [text.index(s) for s in ("Never push to main", "Decided to use Expo", "New fact", "Old fact")]
    assert order == sorted(order)
    assert "Rules:" in text and "Decisions:" in text and "Facts:" in text
    assert memory.bot_context("beta") == ""


def test_bot_context_is_capped_and_says_what_was_left_out(memory):
    for i in range(30):
        _add(memory, f"fact {i:02d} " + "x" * 200, kind="fact")
    text = memory.bot_context("alpha")
    assert len(text) <= CONTEXT_CAP
    assert "fact 29" in text  # newest first
    assert "more in Dockyard" in text
    left_out = int(text.rsplit("...and ", 1)[1].split(" ", 1)[0])
    shown = text.count("\n- ")
    assert shown + left_out == 30


# ---- starting points from finished work ---------------------------------------

def test_suggestions_offer_finished_work_not_yet_used(memory):
    finished = [
        {"id": "t_1", "title": "Set up CI", "status": "done", "result": "CI runs on every push; 9 min",
         "completed_at": 200},
        {"id": "t_2", "title": "Pick a DB", "status": "done", "result": "", "completed_at": 300},
        {"id": "t_3", "title": "Fix login", "status": "done", "result": "Login uses magic links",
         "completed_at": 400},
        {"id": "t_4", "title": "Not done", "status": "in_progress", "result": "half", "completed_at": None},
        {"id": "t_5", "title": "Long", "status": "done", "result": "y" * 900, "completed_at": 100},
    ]
    _add(memory, "Login uses magic links", source="work:t_3")
    got = memory.suggestions("alpha", finished)
    assert [s["work_id"] for s in got] == ["t_1", "t_5"]  # newest first; empty, unfinished, used: skipped
    assert got[0] == {"work_id": "t_1", "title": "Set up CI", "text": "CI runs on every push; 9 min",
                      "completed_at": 200}
    assert len(got[1]["text"]) == MAX_TEXT


# ---- API ----------------------------------------------------------------------

fastapi = pytest.importorskip("fastapi")
from fastapi.testclient import TestClient  # noqa: E402

import importlib.util  # noqa: E402
from pathlib import Path  # noqa: E402

from fastapi import FastAPI  # noqa: E402

from hermes_project_stewardship.api.server import create_app  # noqa: E402
from hermes_project_stewardship.kanban import ReferenceKanbanAdapter  # noqa: E402
from .r2_helpers import World  # noqa: E402

V1 = "/stewardship/v1"
BEARER = {"Authorization": "Bearer t0k"}


def _client(store, *, capabilities=None, human=True):
    adapter = ReferenceKanbanAdapter(store)
    return TestClient(create_app(
        store, kanban_adapter=adapter, auth_token="t0k", auth_principal="sahil",
        auth_principal_is_human=human, capabilities=capabilities), headers=BEARER)


@pytest.fixture()
def api(store, clock):
    World(store, clock).project("alpha")
    return _client(store)


def test_api_round_trip(api, store):
    base = f"{V1}/projects/alpha/memory"
    assert api.get(base).json() == {"entries": [], "context": "", "cap": CONTEXT_CAP, "can_write": True}
    made = api.post(base, json={"kind": "rule", "text": "Never push to main"})
    assert made.status_code == 200, made.text
    entry = made.json()
    assert entry["created_by"] == "sahil"
    edited = api.patch(f"{base}/{entry['id']}", json={"text": "Never push to main or release"})
    assert edited.status_code == 200 and edited.json()["supersedes_id"] == entry["id"]
    new_id = edited.json()["id"]
    listing = api.get(base).json()
    assert [e["id"] for e in listing["entries"]] == [new_id]
    assert "Never push to main or release" in listing["context"]
    assert [e["text"] for e in api.get(f"{base}/{new_id}/history").json()["history"]] == [
        "Never push to main", "Never push to main or release"]
    assert api.post(f"{base}/{new_id}/archive").status_code == 200
    assert api.post(f"{base}/{new_id}/archive").status_code == 409
    assert api.get(base).json()["entries"] == []
    assert len(api.get(base, params={"include_archived": True}).json()["entries"]) == 1
    assert api.post(f"{base}/{new_id}/restore").status_code == 200
    assert api.get(f"{V1}/projects/ghost/memory").status_code == 404
    assert api.post(base, json={"kind": "rule", "text": ""}).status_code == 422
    assert api.patch(f"{base}/{entry['id']}", json={"text": "old one"}).status_code == 409


def test_api_payload_cannot_name_its_actor(api):
    response = api.post(f"{V1}/projects/alpha/memory",
                        json={"kind": "fact", "text": "x", "actor": "someone-else"})
    assert response.status_code == 422


@pytest.mark.parametrize("kind", ["non_human", "no_capability"])
def test_api_writes_need_the_owner_capability(store, clock, kind):
    World(store, clock).project("alpha")
    client = _client(store, **{"non_human": dict(human=False),
                               "no_capability": dict(capabilities=[])}[kind])
    base = f"{V1}/projects/alpha/memory"
    assert client.post(base, json={"kind": "fact", "text": "x"}).status_code in (403, 503)
    listing = client.get(base)
    assert listing.status_code == 200 and listing.json()["can_write"] is False


def test_api_suggestions_come_from_finished_work(store, clock, monkeypatch):
    world = World(store, clock)
    world.project("alpha")
    client = _client(store)
    assert client.get(f"{V1}/projects/alpha/memory/suggestions").json() == {"suggestions": []}
    done = {"id": "t_9", "ref": "t_9", "title": "Ship v1", "status": "done",
            "result": "Shipped to TestFlight", "completed_at": 50}
    monkeypatch.setattr(ReferenceKanbanAdapter, "list_work", lambda self, project_id: [done])
    got = client.get(f"{V1}/projects/alpha/memory/suggestions").json()["suggestions"]
    assert [s["work_id"] for s in got] == ["t_9"]


SESSION = {"x-hermes-session-token": "synthetic-desktop-token"}


@pytest.fixture()
def proxy(tmp_path, monkeypatch):
    """The real Desktop proxy in front of the real backend app."""
    monkeypatch.setenv("HERMES_HOME", str(tmp_path))
    monkeypatch.setenv("HERMES_KANBAN_HOME", str(tmp_path))
    monkeypatch.setenv("STEWARD_DB_PATH", str(tmp_path / "proxy.db"))
    monkeypatch.setenv("HERMES_DASHBOARD_SESSION_TOKEN", SESSION["x-hermes-session-token"])
    monkeypatch.delenv("STEWARD_RPC_TOKEN", raising=False)
    path = Path(__file__).parents[1] / "hermes_dockyard_plugin/dashboard/plugin_api.py"
    spec = importlib.util.spec_from_file_location("project_memory_isolated_proxy", path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    store = module._store
    adapter = ReferenceKanbanAdapter(store)
    from .conftest import FrozenClock
    World(store, FrozenClock(), adapter=adapter).project("alpha")
    module._app = create_app(
        store, kanban_adapter=adapter, auth_token=SESSION["x-hermes-session-token"],
        auth_principal="owner", auth_principal_is_human=True)
    module._client = module.httpx.AsyncClient(
        transport=module.httpx.ASGITransport(app=module._app), base_url="http://dockyard.test")
    host = FastAPI()
    host.include_router(module.plugin_api, prefix="/api")
    yield TestClient(host, headers=SESSION)
    store.close()


def test_memory_routes_work_through_the_desktop_proxy(proxy):
    base = "/api/projects/alpha/memory"
    assert proxy.get(base).json()["can_write"] is True
    forged = proxy.post(base, json={"kind": "fact", "text": "x", "actor": "forged"})
    assert forged.status_code == 422, "the caller must never name the actor"
    made = proxy.post(base, json={"kind": "rule", "text": "Never push to main"})
    assert made.status_code == 200, made.text
    entry = made.json()
    assert entry["created_by"] == "owner"
    edited = proxy.patch(f"{base}/{entry['id']}", json={"text": "Never push to main or release"})
    assert edited.status_code == 200, edited.text
    new_id = edited.json()["id"]
    assert len(proxy.get(f"{base}/{new_id}/history").json()["history"]) == 2
    assert proxy.post(f"{base}/{new_id}/archive").status_code == 200
    assert proxy.get(base).json()["entries"] == []
    assert len(proxy.get(base, params={"include_archived": True}).json()["entries"]) == 1
    assert proxy.post(f"{base}/{new_id}/restore").status_code == 200
    assert "Never push to main or release" in proxy.get(base).json()["context"]
    assert proxy.get(f"{base}/suggestions").json() == {"suggestions": []}
    from_work = proxy.post(base, json={"kind": "fact", "text": "CI is 9 minutes", "source": "work:t_1"})
    assert from_work.json()["source"] == "work:t_1"
