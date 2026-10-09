"""A folded Dashboard list stays folded, and the choice lives in the backend.

Sahil's demo feedback (04/10, point a): the "Needs you now" list on the
Dashboard folds open and closed, and stays the way he left it. Like the last
project (test_remember_last_project.py), the choice is kept in the backend
(dockyard_app_settings, key "ui"), never in browser storage (26/08 locked rule).

Rules pinned here:
- GET /settings/ui returns {"collapsed": []} until something is folded.
- PUT stores the folded sections and is audited with the trusted actor.
- Saving the same value again writes no second audit row.
- Unknown sections and malformed bodies are refused (422) and change nothing.
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
BASE = "/api/plugins/hermes-project-stewardship"
FOLDED = {"collapsed": ["needs-you-now"]}
OPEN = {"collapsed": []}


def _enable(store, *pids):
    svc = StewardshipService(store)
    for pid in pids:
        svc.enable(pid, mission="m", lead_profile="lead", member_profiles=["worker"], autonomy_level=2)


@pytest.fixture()
def env(tmp_path):
    store = Store(tmp_path / "folds.db")
    _enable(store, "p1")
    client = TestClient(create_app(store, kanban_adapter=ReferenceKanbanAdapter(store)))
    yield client, store
    store.close()


def _audit(store):
    return [
        (row["actor"], json.loads(row["detail_json"]))
        for row in store._conn.execute(
            "SELECT actor, detail_json FROM stewardship_audit_log"
            " WHERE action='ui_settings.updated' ORDER BY id")
    ]


def test_nothing_folded_until_someone_folds_a_list(env):
    client, _store = env
    response = client.get(f"{V}/settings/ui")
    assert response.status_code == 200, response.text
    assert response.json() == OPEN


def test_folding_round_trips_and_is_audited(env):
    client, store = env
    saved = client.put(f"{V}/settings/ui", json={**FOLDED, "actor_id": "sahil"})
    assert saved.status_code == 200, saved.text
    assert saved.json() == FOLDED
    assert client.get(f"{V}/settings/ui").json() == FOLDED
    opened = client.put(f"{V}/settings/ui", json={**OPEN, "actor_id": "sahil"})
    assert opened.json() == OPEN
    assert client.get(f"{V}/settings/ui").json() == OPEN
    assert _audit(store) == [("sahil", FOLDED), ("sahil", OPEN)]


def test_saving_the_same_choice_again_changes_nothing(env):
    client, store = env
    client.put(f"{V}/settings/ui", json={**FOLDED, "actor_id": "sahil"})
    again = client.put(f"{V}/settings/ui", json={"collapsed": ["needs-you-now", "needs-you-now"], "actor_id": "sahil"})
    assert again.status_code == 200, again.text
    assert again.json() == FOLDED
    assert len(_audit(store)) == 1, "re-saving the current choice writes no second audit row"


@pytest.mark.parametrize("bad", [
    {"collapsed": ["project-health"]},
    {"collapsed": "needs-you-now"},
    {"collapsed": [7]},
    {},
    {"collapsed": [], "theme": "neon"},
], ids=["unknown-section", "not-a-list", "not-strings", "missing", "unknown-key"])
def test_unknown_or_malformed_choices_are_refused_and_change_nothing(env, bad):
    client, store = env
    client.put(f"{V}/settings/ui", json={**FOLDED, "actor_id": "sahil"})
    refused = client.put(f"{V}/settings/ui", json={**bad, "actor_id": "sahil"})
    assert refused.status_code == 422, refused.text
    assert client.get(f"{V}/settings/ui").json() == FOLDED
    assert len(_audit(store)) == 1


# --- through the real plugin proxy ------------------------------------------

def _proxy_client(tmp_path, monkeypatch):
    monkeypatch.setenv("HERMES_HOME", str(tmp_path))
    monkeypatch.setenv("HERMES_KANBAN_HOME", str(tmp_path))
    monkeypatch.setenv("STEWARD_DB_PATH", str(tmp_path / "db.sqlite"))
    monkeypatch.setenv("DOCKYARD_ACTOR_ID", "trusted-desktop")
    monkeypatch.delenv("STEWARD_RPC_TOKEN", raising=False)
    monkeypatch.setenv("HERMES_DASHBOARD_SESSION_TOKEN", TOKEN)
    spec = importlib.util.spec_from_file_location("dashboard_folds_isolated_proxy", PROXY)
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
    url = f"{BASE}/settings/ui"
    assert client.get(url, headers=HEADERS).json() == OPEN

    forged = client.put(url, headers=HEADERS, json={**FOLDED, "actor_id": "forged"})
    assert forged.status_code == 422, "the caller must never name the actor"
    assert client.get(url, headers=HEADERS).json() == OPEN

    # The exact body the Desktop dashboard sends.
    saved = client.put(url, headers=HEADERS, json=FOLDED)
    assert saved.status_code == 200, saved.text
    assert client.get(url, headers=HEADERS).json() == FOLDED
    assert [actor for actor, _detail in _audit(module._store)] == ["trusted-desktop"]

    unknown = client.put(url, headers=HEADERS, json={"collapsed": ["nope"]})
    assert unknown.status_code == 422
    assert client.get(url, headers=HEADERS).json() == FOLDED
    assert client.put(url, headers=HEADERS, json={}).status_code == 422, "collapsed is required"
