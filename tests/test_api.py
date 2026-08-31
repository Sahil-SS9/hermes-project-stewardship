"""API suite: every route, auth negatives, rate limit, error envelope (T17)."""

from __future__ import annotations

import hashlib
import hmac
import json

import pytest

fastapi = pytest.importorskip("fastapi")
from fastapi.testclient import TestClient  # noqa: E402

from hermes_project_stewardship.api.server import create_app  # noqa: E402
from hermes_project_stewardship.kanban import ReferenceKanbanAdapter  # noqa: E402
from hermes_project_stewardship.persistence.store import Store  # noqa: E402
from hermes_project_stewardship.api.middleware import RateLimitMiddleware  # noqa: E402


@pytest.fixture()
def env(tmp_path):
    store = Store(tmp_path / "api.db")
    app = create_app(store, kanban_adapter=ReferenceKanbanAdapter(store))
    c = TestClient(app)
    yield c, store
    store.close()


@pytest.fixture()
def authed_env(tmp_path):
    store = Store(tmp_path / "apiauth.db")
    app = create_app(
        store,
        auth_token="sekrit",
        rate_limit_rpm=1000,
        kanban_adapter=ReferenceKanbanAdapter(store),
    )
    c = TestClient(app)
    c.headers.update({"Authorization": "Bearer sekrit"})
    yield c, store
    store.close()


def enable(c, pid="p1"):
    r = c.post(f"/stewardship/v1/projects/{pid}/enable", json={
        "project_id": pid, "mission": "m", "lead_profile": "l", "autonomy_level": 2,
    })
    assert r.status_code == 200
    return r


def test_healthz_open(env):
    c, _ = env
    r = c.get("/healthz")
    assert r.status_code == 200 and r.json()["ok"] is True


def test_full_lifecycle_over_rpc(env):
    c, _ = env
    enable(c)
    r = c.post("/stewardship/v1/projects/p1/objectives", json={
        "name": "cov", "evaluator_type": "manual", "target": ">=1", "severity": "high",
    })
    assert r.status_code == 200
    r = c.post("/stewardship/v1/projects/p1/cycle", json={})
    assert r.status_code == 200 and r.json()["health"]["state"] in {
        "healthy", "watch", "degraded"}
    r = c.post("/stewardship/v1/projects/p1/initiatives", json={
        "title": "T", "rationale": "R"})
    ref = r.json()["ref"]
    r = c.post(f"/stewardship/v1/initiatives/{ref}/approve",
               json={"actor": "h", "interface": "rpc"})
    assert r.json()["status"] == "executing"
    assert r.json()["board_slug"] == "p1-ops"
    r = c.post(f"/stewardship/v1/initiatives/{ref}/complete",
               json={"outcome": {"ok": True}})
    assert r.json()["engine_status"] == "completed"
    assert r.json()["observation_status"] == "pending"


def test_error_envelope_shape(env):
    c, _ = env
    enable(c)
    r = c.get("/stewardship/v1/projects/ghost/settings")
    assert r.status_code == 404
    body = r.json()
    assert body["error"]["code"] == "not_found"
    assert "message" in body["error"]
    c.post("/stewardship/v1/projects/p1/pause")
    r = c.post("/stewardship/v1/projects/p1/cycle", json={"trigger_type": "cron"})
    assert r.status_code == 409
    assert r.json()["error"]["code"] == "conflict"


def test_auth_required_when_configured(authed_env):
    c, store = authed_env
    enable(c)
    anon = TestClient(c.app)
    r = anon.get("/stewardship/v1/projects/p1/settings")
    assert r.status_code == 401
    assert r.json()["error"]["code"] == "unauthorized"
    assert anon.get("/healthz").status_code == 200  # healthz stays open
    bad = TestClient(c.app)
    bad.headers.update({"Authorization": "Bearer wrong"})
    assert bad.get("/stewardship/v1/projects/p1/settings").status_code == 401


def test_standalone_app_fails_closed_without_token(tmp_path):
    app = create_app(db_path=tmp_path / "standalone.db")
    client = TestClient(app)
    assert client.get("/healthz").status_code == 200
    response = client.get("/stewardship/v1/projects")
    assert response.status_code == 503
    assert response.json()["error"]["code"] == "auth_not_configured"


def test_settings_redact_webhook_secret(env):
    client, _ = env
    enable(client, "secret-project")
    client.patch(
        "/stewardship/v1/projects/secret-project/settings",
        json={"verification_policy": {"webhook_secret": "never-return-me"}},
    )
    response = client.get("/stewardship/v1/projects/secret-project/settings")
    assert response.status_code == 200
    assert "never-return-me" not in response.text
    assert response.json()["policies"]["verification"]["webhook_secret"] == "***"


def test_gateway_sender_is_bound_to_authenticated_principal(tmp_path):
    store = Store(tmp_path / "principal.db")
    app = create_app(
        store,
        auth_token="sekrit",
        auth_principal="trusted-user",
        kanban_adapter=ReferenceKanbanAdapter(store),
    )
    client = TestClient(app, headers={"Authorization": "Bearer sekrit"})
    enable(client, "principal-project")
    from hermes_project_stewardship.persistence.service import StewardshipService
    StewardshipService(store).set_gateway_permission(
        "principal-project", platform="discord", sender_id="privileged-user",
        can_approve=True, can_trigger=True,
    )
    response = client.post("/stewardship/v1/gateway/command", json={
        "platform": "discord", "sender_id": "privileged-user",
        "command": "run", "project_id": "principal-project", "args": {},
    })
    assert response.status_code == 200
    assert response.json()["ok"] is False
    assert "not permitted" in response.json()["text"]

def test_authenticated_principal_overrides_body_actor(tmp_path):
    store = Store(tmp_path / "actor.db")
    app = create_app(
        store,
        auth_token="sekrit",
        auth_principal="trusted-user",
        kanban_adapter=ReferenceKanbanAdapter(store),
    )
    client = TestClient(app, headers={"Authorization": "Bearer sekrit"})
    enable(client, "actor-project")
    response = client.patch(
        "/stewardship/v1/projects/actor-project/settings",
        json={"mission": "updated", "actor": "forged-admin"},
    )
    assert response.status_code == 200
    latest = store.audit_tail(1)[0]
    assert latest["actor"] == "trusted-user"


def test_rate_limit_429(tmp_path):
    store = Store(tmp_path / "rl.db")
    app = create_app(
        store,
        rate_limit_rpm=3,
        kanban_adapter=ReferenceKanbanAdapter(store),
    )  # tiny bucket
    c = TestClient(app)
    codes = []
    for _ in range(6):
        codes.append(
            c.post("/stewardship/v1/projects/x/enable",
                   json={"project_id": "x"}).status_code
        )
    assert 429 in codes
    store.close()


def test_rate_limit_bucket_cache_is_bounded():
    middleware = RateLimitMiddleware(object(), max_buckets=3)
    for key in ("a", "b", "c", "d", "e"):
        middleware._bucket(key)
    assert len(middleware._buckets) <= 3


@pytest.mark.parametrize("path", [
    "/stewardship/v1/projects/p1/events?limit=501",
    "/stewardship/v1/projects/p1/reports?limit=501",
    "/stewardship/v1/bot-groups/team/messages?limit=501",
])
def test_list_limits_are_bounded(env, path):
    client, _ = env
    enable(client)
    assert client.get(path).status_code == 422


def test_webhook_endpoint_happy_and_bad_sig(env):
    c, _ = env
    secret = "whsec_rpc"
    enable(c, "wh")
    c.post("/stewardship/v1/projects/wh/enable", json={
        "project_id": "wh",
        "verification_policy": {"webhook_secret": secret},
    })
    body = json.dumps({"event": "push"}).encode()
    sig = "sha256=" + hmac.new(secret.encode(), body, hashlib.sha256).hexdigest()
    r = c.post("/stewardship/v1/webhooks/wh", content=body,
               headers={"x-hub-signature-256": sig,
                        "x-github-delivery": "d-1"})
    assert r.status_code == 200 and r.json()["accepted"] is True
    r = c.post("/stewardship/v1/webhooks/wh", content=body,
               headers={"x-hub-signature-256": "sha256=bad",
                        "x-github-delivery": "d-2"})
    assert r.status_code == 401
    assert r.json()["error"]["code"] == "unauthorized"


def test_events_endpoint(env):
    c, _ = env
    enable(c, "ev")
    c.post("/stewardship/v1/projects/ev/cycle", json={})
    r = c.get("/stewardship/v1/projects/ev/events")
    types = [e["event_type"] for e in r.json()["events"]]
    assert "stewardship.cycle.started" in types


def test_gateway_command_via_rpc(env):
    c, _ = env
    enable(c, "gw")
    r = c.post("/stewardship/v1/gateway/command", json={
        "platform": "discord", "sender_id": "U1", "command": "status",
        "project_id": "gw", "args": {},
    })
    body = r.json()
    assert body["ok"] is True and "gw:" in body["text"]
