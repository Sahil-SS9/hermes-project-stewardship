"""Behavioural witnesses for #27 and the adjacent proxy/API scan findings."""
from __future__ import annotations

import asyncio
import importlib.util
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from hermes_project_stewardship.api.server import create_app
from hermes_project_stewardship.kanban import ReferenceKanbanAdapter
from hermes_project_stewardship.persistence.service import StewardshipService

from .dashboard_host import authenticated_host

PROXY = Path(__file__).parents[1] / "hermes_dockyard_plugin/dashboard/plugin_api.py"
V = "/stewardship/v1"


@pytest.fixture(params=[True, False], ids=["configured-rpc", "process-local-rpc"])
def proxy(tmp_path, monkeypatch, request):
    monkeypatch.setenv("HERMES_HOME", str(tmp_path))
    monkeypatch.setenv("STEWARD_DB_PATH", str(tmp_path / "proxy.sqlite"))
    monkeypatch.delenv("HERMES_DASHBOARD_SESSION_TOKEN", raising=False)
    if request.param:
        monkeypatch.setenv("STEWARD_RPC_TOKEN", "backend-only-token")
    else:
        monkeypatch.delenv("STEWARD_RPC_TOKEN", raising=False)
    monkeypatch.setenv("STEWARD_RPC_PRINCIPAL", "trusted-human")
    monkeypatch.setenv("STEWARD_RPC_PRINCIPAL_KIND", "human")
    monkeypatch.setenv("STEWARD_RPC_CAPABILITIES", "project_archive")
    monkeypatch.setenv("DOCKYARD_ACTOR_ID", "dashboard-user")
    spec = importlib.util.spec_from_file_location("regression_proxy", PROXY)
    assert spec and spec.loader
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    service = StewardshipService(module._store)
    for pid in ("A", "B"):
        service.enable(pid, mission="regression", lead_profile="lead")
    host = authenticated_host(module.router, session_token="host-only-token",
                              native_token=module._rpc_token)
    # Other regression cases exercise an already-authenticated host request.
    backend_header = {"Authorization": f"Bearer {module._rpc_token}"} if module._rpc_token else {}
    with TestClient(host, headers=backend_header, cookies={"hermes_session_at": "accepted-cookie"},
                    raise_server_exceptions=False) as client:
        yield module, client
    asyncio.run(module._client.aclose())
    module._store.close()


@pytest.mark.parametrize("mode", ["cookie", "native", "loopback"])
def test_host_accepted_credentials_reach_backend_without_reauth(proxy, mode):
    module, client = proxy
    client.headers.pop("authorization", None)
    headers = {}
    if mode != "cookie":
        client.cookies.clear()
        headers = ({"Authorization": "Bearer accepted-native"} if mode == "native"
                   else {"x-hermes-session-token": "host-only-token"})
    response = client.get("/notifications", headers=headers)
    assert response.status_code == 200, response.text
    archive = client.post("/projects/A/archive", headers=headers,
                          json={"actor": "payload-imposter"})
    assert archive.status_code == 200, archive.text
    row = module._store._conn.execute(
        "SELECT archived_by FROM project_stewardship WHERE project_id='A'").fetchone()
    assert row["archived_by"] == "trusted-human"


def test_embedded_backend_still_requires_its_own_credential(proxy):
    module, _ = proxy
    with TestClient(module._app, raise_server_exceptions=False) as direct:
        for headers in ({}, {"Authorization": "Bearer accepted-native"},
                        {"x-hermes-session-token": "host-only-token"}):
            response = direct.get(V + "/notifications", headers=headers)
            assert response.status_code == 401, response.text
            assert response.headers["www-authenticate"] == "Bearer"


@pytest.mark.parametrize("query", [
    {"limit": 1}, {"state": "seen"}, {"project_id": "A"}, {"before_id": 3},
    {"severity": "high"}, {"kind": "approval_required"}, {"limit": 0},
])
def test_notification_query_and_validation_match_backend(proxy, query):
    module, client = proxy
    engine = module._app.state.notification_engine
    engine.create("A", severity="high", kind="alert", title="Alert")
    seen = engine.create("A", severity="medium", kind="approval_required", title="Approval")
    engine.create("B", severity="low", kind="alert", title="Other")
    engine.ack(seen, actor="fixture")
    with TestClient(module._app, headers={"Authorization": f"Bearer {module._rpc_token}"}) as direct:
        expected = direct.get(V + "/notifications", params=query)
    actual = client.get("/notifications", params=query)
    assert actual.status_code == expected.status_code, actual.text
    if actual.status_code == 200:
        assert actual.json() == expected.json()


@pytest.mark.parametrize("cursor", [2**63, -(2**63) - 1])
def test_notification_cursor_overflow_is_422(proxy, cursor):
    _, client = proxy
    response = client.get("/notifications", params={"before_id": cursor})
    assert response.status_code == 422, response.text


@pytest.mark.parametrize("notification_id", [2**63, -(2**63) - 1])
@pytest.mark.parametrize("action", ["ack", "resolve"])
def test_notification_path_id_overflow_is_422(proxy, notification_id, action):
    _, client = proxy
    response = client.post(f"/notifications/{notification_id}/{action}", json={})
    assert response.status_code == 422, response.text


def test_no_duplicate_proxy_routes(proxy):
    module, _ = proxy
    routes = [(method, route.path) for route in module.router.routes for method in route.methods]
    assert len(routes) == len(set(routes)), "duplicate routes shadow query/validation handlers"


@pytest.mark.parametrize("ids", [
    [1.5], ["bad-id"], ["1"], [True], [None], [{}], [[1]], [0], [-1],
    [2**63], [1, "bad-id"], None, "not-a-list",
])
def test_invalid_popup_ids_are_atomic_422_without_wrong_record_updates(proxy, ids):
    module, client = proxy
    engine = module._app.state.notification_engine
    nid = engine.create("A", severity="high", kind="alert", title="Popup")
    response = client.post("/notifications/popups/shown", json={"ids": ids})
    assert response.status_code == 422, response.text
    row = module._store._conn.execute(
        "SELECT popup_shown_at FROM notifications WHERE id=?", (nid,)).fetchone()
    assert row["popup_shown_at"] is None


def test_valid_popup_ids_remain_idempotent(proxy):
    module, client = proxy
    nid = module._app.state.notification_engine.create(
        "A", severity="high", kind="alert", title="Popup")
    assert client.post("/notifications/popups/shown", json={"ids": [nid, nid]}).json() == {"marked": 1}
    assert client.post("/notifications/popups/shown", json={"ids": [nid]}).json() == {"marked": 0}
    assert client.post("/notifications/popups/shown", json={"ids": []}).json() == {"marked": 0}
    assert client.post("/notifications/popups/shown", json={"ids": [2**63 - 1]}).json() == {"marked": 0}


@pytest.mark.parametrize("value", ["Bearer café", "Bearer 你好", "Bearer 🔐"])
def test_non_ascii_backend_bearer_is_401_not_500(proxy, value):
    module, _ = proxy
    with TestClient(module._app, raise_server_exceptions=False) as direct:
        response = direct.get(V + "/notifications",
                              headers=[(b"authorization", value.encode("utf-8"))])
        assert response.status_code == 401, response.text
        assert response.headers["www-authenticate"] == "Bearer"
        valid = direct.get(V + "/notifications",
                           headers={"Authorization": f"Bearer {module._rpc_token}"})
        assert valid.status_code == 200, valid.text


def test_upstream_auth_challenge_is_preserved_without_private_headers(proxy):
    module, client = proxy
    asyncio.run(module._client.aclose())
    backend_reply = module.httpx.Response(
        401, headers={"WWW-Authenticate": 'Bearer realm="stewardship"',
                      "X-Backend-Secret": "not-for-the-client", "Set-Cookie": "private=value"},
        json={"error": {"code": "unauthorized", "message": "missing bearer"}})
    module._client = module.httpx.AsyncClient(
        transport=module.httpx.MockTransport(lambda _: backend_reply), base_url="http://local.test")
    response = client.get("/bots")
    assert response.status_code == 401
    assert response.headers["www-authenticate"] == 'Bearer realm="stewardship"'
    assert response.headers["x-dockyard-error-code"] == "unauthorized"
    assert "x-backend-secret" not in response.headers
    assert "set-cookie" not in response.headers


def test_rate_limit_keeps_retry_after_through_real_proxy(proxy):
    module, client = proxy
    asyncio.run(module._client.aclose())
    module._app = create_app(module._store, auth_token=module._rpc_token,
                             kanban_adapter=ReferenceKanbanAdapter(module._store),
                             rate_limit_rpm=1)
    module._client = module.httpx.AsyncClient(
        transport=module.httpx.ASGITransport(app=module._app), base_url="http://local.test")
    assert client.post("/notifications/popups/shown", json={"ids": []}).status_code == 200
    response = client.post("/notifications/popups/shown", json={"ids": []})
    assert response.status_code == 429, response.text
    assert int(response.headers["retry-after"]) >= 1
    assert response.headers["x-dockyard-error-code"] == "rate_limited"
