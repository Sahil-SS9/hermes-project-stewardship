"""The app remembers the last project the person chose, in the backend.

Sahil decided 02/10: Dockyard should reopen on the last project chosen, and
the choice must live in the backend (dockyard_app_settings, schema v36), never
in the browser (26/08 locked rule: no localStorage, sessionStorage or cookies).

Rules pinned here:
- GET /settings/last-project returns {"project_id": None} until one is saved.
- PUT stores a known project and is audited with the trusted actor.
- An unknown project is refused (422) and changes nothing.
- A project that was saved but is later unknown reads back as None, so the
  app never opens on a project that no longer exists.
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


def _enable(store, *pids):
    svc = StewardshipService(store)
    for pid in pids:
        svc.enable(pid, mission="m", lead_profile="lead", member_profiles=["worker"], autonomy_level=2)


@pytest.fixture()
def env(tmp_path):
    store = Store(tmp_path / "remember.db")
    _enable(store, "p1", "p2")
    client = TestClient(create_app(store, kanban_adapter=ReferenceKanbanAdapter(store)))
    yield client, store
    store.close()


def _audit(store):
    return [
        (row["actor"], row["action"], json.loads(row["detail_json"]))
        for row in store._conn.execute(
            "SELECT actor, action, detail_json FROM stewardship_audit_log"
            " WHERE action='last_project.updated' ORDER BY id")
    ]


def test_nothing_saved_reads_as_none(env):
    client, _store = env
    response = client.get(f"{V}/settings/last-project")
    assert response.status_code == 200, response.text
    assert response.json() == {"project_id": None}


def test_saving_a_known_project_round_trips_and_is_audited(env):
    client, store = env
    saved = client.put(f"{V}/settings/last-project", json={"project_id": "p2", "actor_id": "sahil"})
    assert saved.status_code == 200, saved.text
    assert saved.json() == {"project_id": "p2"}
    assert client.get(f"{V}/settings/last-project").json() == {"project_id": "p2"}
    assert _audit(store) == [("sahil", "last_project.updated", {"project_id": "p2"})]


def test_saving_the_same_project_again_changes_nothing(env):
    client, store = env
    client.put(f"{V}/settings/last-project", json={"project_id": "p1", "actor_id": "sahil"})
    again = client.put(f"{V}/settings/last-project", json={"project_id": "p1", "actor_id": "sahil"})
    assert again.status_code == 200, again.text
    assert len(_audit(store)) == 1, "re-saving the current project writes no second audit row"


@pytest.mark.parametrize("bad", ["nope", "", 7, ["p1"]])
def test_unknown_or_malformed_project_is_refused_and_changes_nothing(env, bad):
    client, store = env
    client.put(f"{V}/settings/last-project", json={"project_id": "p1", "actor_id": "sahil"})
    refused = client.put(f"{V}/settings/last-project", json={"project_id": bad, "actor_id": "sahil"})
    assert refused.status_code == 422, refused.text
    assert client.get(f"{V}/settings/last-project").json() == {"project_id": "p1"}
    assert len(_audit(store)) == 1


def test_a_missing_project_id_is_refused(env):
    client, store = env
    client.put(f"{V}/settings/last-project", json={"project_id": "p1", "actor_id": "sahil"})
    refused = client.put(f"{V}/settings/last-project", json={"actor_id": "sahil"})
    assert refused.status_code == 422, refused.text
    assert client.get(f"{V}/settings/last-project").json() == {"project_id": "p1"}


def test_null_forgets_the_project_and_is_audited_once(env):
    client, store = env
    client.put(f"{V}/settings/last-project", json={"project_id": "p1", "actor_id": "sahil"})
    cleared = client.put(f"{V}/settings/last-project", json={"project_id": None, "actor_id": "sahil"})
    assert cleared.status_code == 200, cleared.text
    assert cleared.json() == {"project_id": None}
    assert client.get(f"{V}/settings/last-project").json() == {"project_id": None}
    again = client.put(f"{V}/settings/last-project", json={"project_id": None, "actor_id": "sahil"})
    assert again.status_code == 200
    assert _audit(store) == [
        ("sahil", "last_project.updated", {"project_id": "p1"}),
        ("sahil", "last_project.updated", {"project_id": None}),
    ], "forgetting is audited; forgetting again changes nothing"
    rows = store._conn.execute("SELECT COUNT(*) FROM dockyard_app_settings WHERE key='last_project'").fetchone()[0]
    assert rows == 0


def test_a_saved_project_that_no_longer_exists_reads_as_none(env):
    client, store = env
    client.put(f"{V}/settings/last-project", json={"project_id": "p2", "actor_id": "sahil"})
    with store.tx() as cx:
        cx.execute("DELETE FROM project_stewardship WHERE project_id='p2'")
    assert client.get(f"{V}/settings/last-project").json() == {"project_id": None}


# --- through the real plugin proxy ------------------------------------------

def _proxy_client(tmp_path, monkeypatch):
    monkeypatch.setenv("HERMES_HOME", str(tmp_path))
    monkeypatch.setenv("HERMES_KANBAN_HOME", str(tmp_path))
    monkeypatch.setenv("STEWARD_DB_PATH", str(tmp_path / "db.sqlite"))
    monkeypatch.setenv("DOCKYARD_ACTOR_ID", "trusted-desktop")
    monkeypatch.delenv("STEWARD_RPC_TOKEN", raising=False)
    monkeypatch.setenv("HERMES_DASHBOARD_SESSION_TOKEN", TOKEN)
    spec = importlib.util.spec_from_file_location("remember_project_isolated_proxy", PROXY)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    store = module._store
    _enable(store, "p1", "p2")
    module._app = create_app(store, kanban_adapter=ReferenceKanbanAdapter(store))
    module._client = module.httpx.AsyncClient(
        transport=module.httpx.ASGITransport(app=module._app), base_url="http://dockyard.test")
    host = FastAPI()
    host.include_router(module.plugin_api, prefix=BASE)
    return module, TestClient(host)


def test_proxy_round_trip_uses_the_trusted_actor(tmp_path, monkeypatch):
    module, client = _proxy_client(tmp_path, monkeypatch)
    url = f"{BASE}/settings/last-project"
    assert client.get(url, headers=HEADERS).json() == {"project_id": None}

    forged = client.put(url, headers=HEADERS, json={"project_id": "p1", "actor_id": "forged"})
    assert forged.status_code == 422, "the caller must never name the actor"
    assert client.get(url, headers=HEADERS).json() == {"project_id": None}

    # The exact body the Desktop shell sends.
    saved = client.put(url, headers=HEADERS, json={"project_id": "p2"})
    assert saved.status_code == 200, saved.text
    assert client.get(url, headers=HEADERS).json() == {"project_id": "p2"}
    assert [actor for actor, _action, _detail in _audit(module._store)] == ["trusted-desktop"]

    unknown = client.put(url, headers=HEADERS, json={"project_id": "nope"})
    assert unknown.status_code == 422
    assert client.get(url, headers=HEADERS).json() == {"project_id": "p2"}

    assert client.put(url, headers=HEADERS, json={}).status_code == 422, "project_id is required"
    cleared = client.put(url, headers=HEADERS, json={"project_id": None})
    assert cleared.status_code == 200, cleared.text
    assert client.get(url, headers=HEADERS).json() == {"project_id": None}
    assert [actor for actor, _action, _detail in _audit(module._store)] == ["trusted-desktop", "trusted-desktop"]
