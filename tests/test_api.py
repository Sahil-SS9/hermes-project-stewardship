"""API suite: every route, auth negatives, rate limit, error envelope (T17)."""

from __future__ import annotations

import hashlib
import hmac
import json

import pytest

fastapi = pytest.importorskip("fastapi")
from fastapi.testclient import TestClient  # noqa: E402

from hermes_project_stewardship.api.server import create_app  # noqa: E402
from hermes_project_stewardship.persistence.store import Store  # noqa: E402


@pytest.fixture()
def env(tmp_path):
    store = Store(tmp_path / "api.db")
    app = create_app(store)
    c = TestClient(app)
    yield c, store
    store.close()


@pytest.fixture()
def authed_env(tmp_path):
    store = Store(tmp_path / "apiauth.db")
    app = create_app(store, auth_token="sekrit", rate_limit_rpm=1000)
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
    assert r.json()["status"] == "approved"
    r = c.post(f"/stewardship/v1/initiatives/{ref}/bind-board", json={})
    assert r.status_code == 200 and r.json()["board_slug"] == "p1-ops"
    r = c.post(f"/stewardship/v1/initiatives/{ref}/complete",
               json={"outcome": {"ok": True}})
    assert r.json()["status"] == "completed"


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


def test_rate_limit_429(tmp_path):
    store = Store(tmp_path / "rl.db")
    app = create_app(store, rate_limit_rpm=3)  # tiny bucket
    c = TestClient(app)
    codes = []
    for _ in range(6):
        codes.append(
            c.post("/stewardship/v1/projects/x/enable",
                   json={"project_id": "x"}).status_code
        )
    assert 429 in codes
    store.close()


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
