"""Owner decision 03/10/2026, Q2 (Rule 5 / Batch D decision C): only a trusted
caller decides.

When the backend has no trusted principal (STEWARD_RPC_TOKEN and
HERMES_DASHBOARD_SESSION_TOKEN unset, e.g. a dashboard started from the CLI,
which keeps its session token in memory), approve, reject and request-changes
("Return to proposer") must not accept an actor named in the request body.

Hard requirement: the Desktop app's decision buttons keep working with AND
without the env token. Hermes only lets an authenticated dashboard user reach
the plugin's routes, so the in-process Desktop proxy vouches for that user with
a per-process key. Nothing a caller sends can do that.
"""
from __future__ import annotations

import asyncio
import importlib.util
from pathlib import Path

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from hermes_project_stewardship.api.server import create_app
from hermes_project_stewardship.kanban import ReferenceKanbanAdapter
from hermes_project_stewardship.persistence.service import StewardshipService
from hermes_project_stewardship.persistence.store import Store

ROOT = Path(__file__).parents[1]
PROXY = ROOT / "hermes_dockyard_plugin/dashboard/plugin_api.py"
BASE = "/api/plugins/hermes-project-stewardship"
V = "/stewardship/v1"
TOKEN = "synthetic-q2-session-token"
# The proxy's identity headers (the contract this decision defines).
PROXY_KEY_HEADER = "x-dockyard-desktop-proxy"
PROXY_ACTOR_HEADER = "x-dockyard-desktop-actor"

# The exact bodies work-item/approvals.js sends, minus the fingerprint.
DECISIONS = [
    ("approve", {}, "approved"),
    ("reject", {"reason": "Not this quarter"}, "rejected"),
    ("request-changes", {"feedback": "Split it into two bets"}, "changes_requested"),
]
ROUTE_IDS = [route for route, _, _ in DECISIONS]


def _pending(svc: StewardshipService, project: str = "demo", title: str = "Decide this") -> str:
    initiative = svc.propose_initiative(project, title=title, rationale="objective: Q2 rule test")
    assert initiative["status"] == "pending_approval"
    return initiative["ref"]


# --- 1. a direct call with no trusted principal is refused -------------------

@pytest.fixture()
def open_backend(tmp_path):
    """Embedded backend with no token, so no trusted principal binds."""
    store = Store(tmp_path / "q2.db")
    svc = StewardshipService(store)
    svc.enable("demo", mission="m", lead_profile="lead", member_profiles=["worker"], autonomy_level=2)
    app = create_app(store, kanban_adapter=ReferenceKanbanAdapter(store))
    try:
        with TestClient(app) as client:
            yield client, svc
    finally:
        store.close()


def _assert_refused_and_untouched(client, ref, response):
    assert response.status_code == 403, response.text
    assert response.json()["error"]["code"] == "trusted_principal_required", response.text
    assert client.get(f"{V}/initiatives/{ref}/decision/receipts").json()["receipts"] == [], \
        "a refused decision must not leave a receipt"
    rows = client.get(f"{V}/projects/demo/initiatives").json()["initiatives"]
    assert next(row["status"] for row in rows if row["ref"] == ref) == "pending_approval"


@pytest.mark.parametrize("route,extra,_outcome", DECISIONS, ids=ROUTE_IDS)
@pytest.mark.parametrize("actor", ["sahil", None], ids=["body_names_actor", "no_actor"])
def test_direct_decision_without_a_trusted_principal_is_refused(open_backend, route, extra, _outcome, actor):
    client, svc = open_backend
    ref = _pending(svc)
    body = {"expected_fingerprint": client.get(f"{V}/initiatives/{ref}/decision").json()["fingerprint"], **extra}
    if actor:
        body["actor"] = actor
    _assert_refused_and_untouched(client, ref, client.post(f"{V}/initiatives/{ref}/{route}", json=body))


@pytest.mark.parametrize("key", ["guessed-key", "", "0" * 43], ids=["guessed", "empty", "same_length"])
def test_a_caller_cannot_forge_the_desktop_proxy_identity(open_backend, key):
    client, svc = open_backend
    ref = _pending(svc)
    fingerprint = client.get(f"{V}/initiatives/{ref}/decision").json()["fingerprint"]
    response = client.post(
        f"{V}/initiatives/{ref}/approve", json={"expected_fingerprint": fingerprint},
        headers={PROXY_KEY_HEADER: key, PROXY_ACTOR_HEADER: "sahil"})
    _assert_refused_and_untouched(client, ref, response)


# --- 2. the production composition: the plugin module exactly as Hermes loads it

def _load_plugin(tmp_path, monkeypatch, *, env_token: bool):
    """Import plugin_api as Hermes does, with its own create_app composition.

    Only the kanban adapter factory is swapped for the reference adapter (the
    gate venv has no Hermes host); every auth-related piece is production.
    """
    db_path = tmp_path / "db.sqlite"
    monkeypatch.setenv("HERMES_HOME", str(tmp_path))
    monkeypatch.setenv("HERMES_KANBAN_HOME", str(tmp_path))
    monkeypatch.setenv("STEWARD_DB_PATH", str(db_path))
    monkeypatch.setenv("DOCKYARD_ACTOR_ID", "desk-owner")
    for name in ("STEWARD_RPC_TOKEN", "STEWARD_RPC_PRINCIPAL", "STEWARD_RPC_PRINCIPAL_KIND",
                 "STEWARD_RPC_CAPABILITIES", "DOCKYARD_PLUGIN_URL"):
        monkeypatch.delenv(name, raising=False)
    if env_token:
        monkeypatch.setenv("HERMES_DASHBOARD_SESSION_TOKEN", TOKEN)
    else:
        monkeypatch.delenv("HERMES_DASHBOARD_SESSION_TOKEN", raising=False)
    import hermes_project_stewardship.api.server as server_module
    monkeypatch.setattr(server_module, "create_project_kanban_adapter",
                        lambda *a, **k: ReferenceKanbanAdapter(Store(db_path)))
    spec = importlib.util.spec_from_file_location(f"q2_plugin_api_{env_token}", PROXY)
    assert spec is not None and spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    assert module._startup_error is None, module._startup_error
    svc = StewardshipService(module._store)
    svc.enable("p1", mission="m", lead_profile="lead", member_profiles=["worker"], autonomy_level=2)
    host = FastAPI()
    host.include_router(module.plugin_api, prefix=BASE)
    return module, svc, TestClient(host)


@pytest.mark.parametrize("route,extra,outcome", DECISIONS, ids=ROUTE_IDS)
@pytest.mark.parametrize("env_token", [False, True], ids=["cli_started_dashboard", "desktop_env_token"])
def test_desktop_decision_buttons_work_in_the_production_composition(tmp_path, monkeypatch, env_token, route, extra, outcome):
    module, svc, client = _load_plugin(tmp_path, monkeypatch, env_token=env_token)
    headers = {"x-hermes-session-token": TOKEN} if env_token else {}
    ref = _pending(svc, project="p1")
    fingerprint = client.get(f"{BASE}/initiatives/{ref}/decision", headers=headers).json()["fingerprint"]

    response = client.post(f"{BASE}/initiatives/{ref}/{route}", headers=headers,
                           json={"expected_fingerprint": fingerprint, **extra})
    assert response.status_code == 200, response.text
    receipts = client.get(f"{BASE}/initiatives/{ref}/decision/receipts", headers=headers).json()["receipts"]
    # With the env token the backend's bearer principal decides; without it,
    # the proxy's own trusted actor (DOCKYARD_ACTOR_ID) does.
    assert [(row["decision"], row["actor"]) for row in receipts] == [
        (outcome, "dashboard-user" if env_token else "desk-owner")]
    module._store.close()


def test_production_backend_refuses_a_direct_call_that_bypasses_the_proxy(tmp_path, monkeypatch):
    module, svc, _client = _load_plugin(tmp_path, monkeypatch, env_token=False)
    ref = _pending(svc, project="p1")

    async def direct():
        transport = module.httpx.ASGITransport(app=module._app)
        async with module.httpx.AsyncClient(transport=transport, base_url="http://direct.test") as raw:
            fingerprint = (await raw.get(f"{V}/initiatives/{ref}/decision")).json()["fingerprint"]
            refused = await raw.post(f"{V}/initiatives/{ref}/approve",
                                     json={"expected_fingerprint": fingerprint, "actor": "sahil"})
            receipts = (await raw.get(f"{V}/initiatives/{ref}/decision/receipts")).json()["receipts"]
            return refused, receipts

    refused, receipts = asyncio.run(direct())
    assert refused.status_code == 403, refused.text
    assert refused.json()["error"]["code"] == "trusted_principal_required"
    assert receipts == []
    module._store.close()


# --- 3. the planning canvas's proposal decision (Sahil, 04/10/2026) ----------
# Approving or dismissing a planning-canvas proposal is a decision too, so the
# same rule applies: trusted callers only, and the body never names the decider.

CANVAS_OBJECTS = [
    {"id": "e1", "kind": "evidence", "content": {"text": "Users stall at import"}, "x": 80, "y": 80},
    {"id": "c1", "kind": "claim", "content": {"text": "Import feels unsafe"}, "x": 400, "y": 80},
    {"id": "p1", "kind": "plan_block", "content": {"text": "Preview before commit"}, "x": 400, "y": 300},
]
# (body actor, extra headers) for callers that must be refused.
UNTRUSTED_CANVAS_CALLERS = [
    ("sahil", {}),
    (None, {}),
    ("sahil", {PROXY_KEY_HEADER: "guessed-key", PROXY_ACTOR_HEADER: "sahil"}),
]
UNTRUSTED_CANVAS_IDS = ["body_names_actor", "no_actor", "forged_proxy_key"]


def _canvas_proposal(client, base: str, project: str, headers: dict | None = None) -> str:
    """A real pending proposal, made through the routes the canvas screen uses."""
    headers = headers or {}
    canvas_id = client.post(f"{base}/projects/{project}/canvases", json={"name": "Q2 board"},
                            headers=headers).json()["canvas_id"]
    revision = client.get(f"{base}/projects/{project}/canvases/{canvas_id}", headers=headers).json()["revision"]
    saved = client.put(f"{base}/projects/{project}/canvases/{canvas_id}", headers=headers,
                       json={"expected_revision": revision, "objects": CANVAS_OBJECTS, "connectors": []})
    assert saved.status_code == 200, saved.text
    session = client.post(f"{base}/projects/{project}/canvases/{canvas_id}/sessions", json={}, headers=headers)
    assert session.status_code == 200, session.text
    proposal = session.json()["proposals"][0]
    assert proposal["status"] == "pending"
    return proposal["proposal_id"]


def _proposal_row(store: Store, proposal_id: str) -> tuple:
    row = store._conn.execute(
        "SELECT status, decided_by FROM canvas_proposals WHERE proposal_id=?", (proposal_id,)).fetchone()
    return tuple(row)


@pytest.fixture()
def local_canvas_contract(monkeypatch):
    """Canvas sessions here use the provider-neutral local contract.

    The suite never calls a real model (server._canvas_provider): the default
    provider is the real Hermes one, which loads the host's model config.
    """
    monkeypatch.setenv("HPS_CANVAS_PROVIDER", "none")


@pytest.mark.usefixtures("local_canvas_contract")
@pytest.mark.parametrize("approve", [True, False], ids=["approve", "dismiss"])
@pytest.mark.parametrize("actor,headers", UNTRUSTED_CANVAS_CALLERS, ids=UNTRUSTED_CANVAS_IDS)
def test_direct_canvas_decision_without_a_trusted_principal_is_refused(open_backend, approve, actor, headers):
    client, svc = open_backend
    proposal_id = _canvas_proposal(client, V, "demo")
    body = {"approve": approve, "project_id": "demo"}
    if actor:
        body["actor"] = actor
    response = client.post(f"{V}/canvas/proposals/{proposal_id}/decision", json=body, headers=headers)
    assert response.status_code == 403, response.text
    assert response.json()["error"]["code"] == "trusted_principal_required", response.text
    assert _proposal_row(svc.store, proposal_id) == ("pending", None), "a refused decision must record nothing"


@pytest.mark.usefixtures("local_canvas_contract")
def test_canvas_decider_is_the_trusted_principal_never_the_body(tmp_path):
    store = Store(tmp_path / "q2-canvas.db")
    StewardshipService(store).enable("demo", mission="m", lead_profile="lead", member_profiles=["worker"],
                                     autonomy_level=2)
    app = create_app(store, auth_token="test-token", auth_principal="test-user", auth_principal_is_human=True,
                     kanban_adapter=ReferenceKanbanAdapter(store))
    try:
        with TestClient(app, headers={"Authorization": "Bearer test-token"}) as client:
            proposal_id = _canvas_proposal(client, V, "demo")
            response = client.post(f"{V}/canvas/proposals/{proposal_id}/decision",
                                   json={"approve": True, "project_id": "demo", "actor": "mallory"})
            assert response.status_code == 200, response.text
            assert _proposal_row(store, proposal_id) == ("approved", "test-user")
    finally:
        store.close()


@pytest.mark.usefixtures("local_canvas_contract")
@pytest.mark.parametrize("approve,status", [(True, "approved"), (False, "rejected")], ids=["approve", "dismiss"])
@pytest.mark.parametrize("env_token", [False, True], ids=["cli_started_dashboard", "desktop_env_token"])
def test_desktop_canvas_buttons_work_in_the_production_composition(tmp_path, monkeypatch, env_token, approve, status):
    module, _svc, client = _load_plugin(tmp_path, monkeypatch, env_token=env_token)
    headers = {"x-hermes-session-token": TOKEN} if env_token else {}
    proposal_id = _canvas_proposal(client, BASE, "p1", headers)
    # The exact body desktop/src/project/canvas.js sends.
    response = client.post(f"{BASE}/canvas/proposals/{proposal_id}/decision", headers=headers,
                           json={"approve": approve, "project_id": "p1"})
    assert response.status_code == 200, response.text
    assert response.json()["status"] == status
    assert _proposal_row(module._store, proposal_id) == (status, "dashboard-user" if env_token else "desk-owner")
    module._store.close()
