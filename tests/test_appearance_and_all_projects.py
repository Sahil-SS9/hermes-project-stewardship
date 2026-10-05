"""The app's appearance (theme, typeface) and the "All projects" choice.

Sahil's demo feedback (04/10, points d and h; design round 05/10):
- h: the colour themes designed in September (backgrounds, fonts) become a
  real choice in App settings. Like every display choice it is kept in the
  backend (dockyard_app_settings, key "appearance"), never in browser storage
  (26/08 locked rule). It is separate from the Dashboard fold setting.
- d: the global switcher offers "All projects". The app reopens on the last
  choice, so "All projects" is remembered too, as "*" (never a project id).

Rules pinned here:
- GET /settings/appearance returns the defaults until something is chosen.
- PUT changes the theme and/or font (each on its own), is audited with the
  trusted actor, and re-saving the same choice writes no second audit row.
- Malformed choices are refused (422) and change nothing.
- Appearance and the Dashboard fold setting never touch each other.
- "*" round-trips through /settings/last-project; unknown projects are still
  refused; null still forgets.
- Through the real plugin proxy the caller can never name the actor.
"""
from __future__ import annotations

import importlib.util
import json
from pathlib import Path

import pytest

fastapi = pytest.importorskip("fastapi")
from fastapi import FastAPI  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from hermes_project_stewardship.api.server import create_app  # noqa: E402
from hermes_project_stewardship.kanban import ReferenceKanbanAdapter  # noqa: E402
from hermes_project_stewardship.persistence.service import StewardshipService  # noqa: E402
from hermes_project_stewardship.persistence.store import Store  # noqa: E402

V = "/stewardship/v1"
ROOT = Path(__file__).parents[1]
PROXY = ROOT / "hermes_dockyard_plugin/dashboard/plugin_api.py"
TOKEN = "synthetic-desktop-token"
HEADERS = {"x-hermes-session-token": TOKEN}
BASE = "/api/plugins/hermes-dockyard"
DEFAULTS = {"theme": "auto", "font": "system"}


def _enable(store, *pids):
    svc = StewardshipService(store)
    for pid in pids:
        svc.enable(pid, mission="m", lead_profile="lead", member_profiles=["worker"], autonomy_level=2)


@pytest.fixture()
def env(tmp_path):
    store = Store(tmp_path / "appearance.db")
    _enable(store, "p1")
    client = TestClient(create_app(store, kanban_adapter=ReferenceKanbanAdapter(store)))
    yield client, store
    store.close()


def _audit(store, action):
    return [
        (row["actor"], json.loads(row["detail_json"]))
        for row in store._conn.execute(
            "SELECT actor, detail_json FROM stewardship_audit_log WHERE action=? ORDER BY id", (action,))
    ]


# --- appearance --------------------------------------------------------------

def test_defaults_until_something_is_chosen(env):
    client, _store = env
    response = client.get(f"{V}/settings/appearance")
    assert response.status_code == 200, response.text
    assert response.json() == DEFAULTS


def test_theme_and_font_change_on_their_own_and_are_audited(env):
    client, store = env
    themed = client.put(f"{V}/settings/appearance", json={"theme": "cobalt", "actor_id": "sahil"})
    assert themed.status_code == 200, themed.text
    assert themed.json() == {"theme": "cobalt", "font": "system"}
    fonted = client.put(f"{V}/settings/appearance", json={"font": "space-grotesk", "actor_id": "sahil"})
    assert fonted.json() == {"theme": "cobalt", "font": "space-grotesk"}, "changing the font keeps the theme"
    assert client.get(f"{V}/settings/appearance").json() == {"theme": "cobalt", "font": "space-grotesk"}
    assert _audit(store, "appearance.updated") == [
        ("sahil", {"theme": "cobalt", "font": "system"}),
        ("sahil", {"theme": "cobalt", "font": "space-grotesk"}),
    ]


def test_saving_the_same_choice_again_changes_nothing(env):
    client, store = env
    client.put(f"{V}/settings/appearance", json={"theme": "ember", "actor_id": "sahil"})
    again = client.put(f"{V}/settings/appearance", json={"theme": "ember", "font": "system", "actor_id": "sahil"})
    assert again.status_code == 200, again.text
    assert again.json() == {"theme": "ember", "font": "system"}
    assert len(_audit(store, "appearance.updated")) == 1, "re-saving the current choice writes no second audit row"


@pytest.mark.parametrize("bad", [
    {},
    {"palette": "neon"},
    {"theme": "Neon"},
    {"theme": "../neon"},
    {"theme": ""},
    {"theme": 7},
    {"font": "x" * 33},
    {"theme": "neon", "collapsed": []},
], ids=["empty", "unknown-key", "capitals", "path", "blank", "not-a-string", "too-long", "fold-key"])
def test_malformed_choices_are_refused_and_change_nothing(env, bad):
    client, store = env
    client.put(f"{V}/settings/appearance", json={"theme": "violet", "actor_id": "sahil"})
    refused = client.put(f"{V}/settings/appearance", json={**bad, "actor_id": "sahil"})
    assert refused.status_code == 422, refused.text
    assert client.get(f"{V}/settings/appearance").json() == {"theme": "violet", "font": "system"}
    assert len(_audit(store, "appearance.updated")) == 1


def test_appearance_and_the_dashboard_fold_never_touch_each_other(env):
    client, _store = env
    client.put(f"{V}/settings/ui", json={"collapsed": ["needs-you-now"], "actor_id": "sahil"})
    client.put(f"{V}/settings/appearance", json={"theme": "grove", "actor_id": "sahil"})
    assert client.get(f"{V}/settings/ui").json() == {"collapsed": ["needs-you-now"]}
    client.put(f"{V}/settings/ui", json={"collapsed": [], "actor_id": "sahil"})
    assert client.get(f"{V}/settings/appearance").json() == {"theme": "grove", "font": "system"}


def test_a_stored_value_that_is_not_an_id_reads_as_the_default(env):
    _client, store = env
    with store.tx() as cx:
        cx.execute(
            "INSERT INTO dockyard_app_settings(key, value_json, updated_at, updated_by) VALUES(?,?,?,?)",
            ("appearance", json.dumps({"theme": "<script>", "font": "jetbrains-mono"}), "2026-10-05T00:00:00Z", "x"))
    assert StewardshipService(store).appearance() == {"theme": "auto", "font": "jetbrains-mono"}


# --- "All projects" ----------------------------------------------------------

def test_all_projects_is_remembered_and_audited(env):
    client, store = env
    saved = client.put(f"{V}/settings/last-project", json={"project_id": "*", "actor_id": "sahil"})
    assert saved.status_code == 200, saved.text
    assert saved.json() == {"project_id": "*"}
    assert client.get(f"{V}/settings/last-project").json() == {"project_id": "*"}
    client.put(f"{V}/settings/last-project", json={"project_id": "p1", "actor_id": "sahil"})
    assert client.get(f"{V}/settings/last-project").json() == {"project_id": "p1"}
    client.put(f"{V}/settings/last-project", json={"project_id": "*", "actor_id": "sahil"})
    assert [detail for _actor, detail in _audit(store, "last_project.updated")] == [
        {"project_id": "*"}, {"project_id": "p1"}, {"project_id": "*"}]


def test_unknown_projects_are_still_refused_and_null_still_forgets(env):
    client, _store = env
    client.put(f"{V}/settings/last-project", json={"project_id": "*", "actor_id": "sahil"})
    for bad in ("nope", "all", "**", ""):
        refused = client.put(f"{V}/settings/last-project", json={"project_id": bad, "actor_id": "sahil"})
        assert refused.status_code == 422, (bad, refused.text)
    assert client.get(f"{V}/settings/last-project").json() == {"project_id": "*"}
    client.put(f"{V}/settings/last-project", json={"project_id": None, "actor_id": "sahil"})
    assert client.get(f"{V}/settings/last-project").json() == {"project_id": None}


# --- through the real plugin proxy -------------------------------------------

def _proxy_client(tmp_path, monkeypatch):
    monkeypatch.setenv("HERMES_HOME", str(tmp_path))
    monkeypatch.setenv("HERMES_KANBAN_HOME", str(tmp_path))
    monkeypatch.setenv("STEWARD_DB_PATH", str(tmp_path / "db.sqlite"))
    monkeypatch.setenv("DOCKYARD_ACTOR_ID", "trusted-desktop")
    monkeypatch.delenv("STEWARD_RPC_TOKEN", raising=False)
    monkeypatch.setenv("HERMES_DASHBOARD_SESSION_TOKEN", TOKEN)
    spec = importlib.util.spec_from_file_location("appearance_isolated_proxy", PROXY)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    store = module._store
    _enable(store, "p1")
    module._app = create_app(store, kanban_adapter=ReferenceKanbanAdapter(store))
    module._client = module.httpx.AsyncClient(
        transport=module.httpx.ASGITransport(app=module._app), base_url="http://dockyard.test")
    host = FastAPI()
    host.include_router(module.plugin_api, prefix=BASE)
    return module, TestClient(host)


def test_proxy_round_trip_uses_the_trusted_actor(tmp_path, monkeypatch):
    module, client = _proxy_client(tmp_path, monkeypatch)
    url = f"{BASE}/settings/appearance"
    assert client.get(url, headers=HEADERS).json() == DEFAULTS

    forged = client.put(url, headers=HEADERS, json={"theme": "neon", "actor_id": "forged"})
    assert forged.status_code == 422, "the caller must never name the actor"
    assert client.get(url, headers=HEADERS).json() == DEFAULTS

    # The exact bodies the Desktop app sends: one choice at a time.
    assert client.put(url, headers=HEADERS, json={"theme": "neon"}).status_code == 200
    assert client.put(url, headers=HEADERS, json={"font": "space-mono"}).json() == {"theme": "neon", "font": "space-mono"}
    assert [actor for actor, _detail in _audit(module._store, "appearance.updated")] == ["trusted-desktop", "trusted-desktop"]

    assert client.put(url, headers=HEADERS, json={"theme": "Neon!"}).status_code == 422
    assert client.put(url, headers=HEADERS, json={}).status_code == 422, "a choice is required"
    assert client.get(url, headers=HEADERS).json() == {"theme": "neon", "font": "space-mono"}

    remembered = client.put(f"{BASE}/settings/last-project", headers=HEADERS, json={"project_id": "*"})
    assert remembered.status_code == 200, remembered.text
    assert client.get(f"{BASE}/settings/last-project", headers=HEADERS).json() == {"project_id": "*"}
