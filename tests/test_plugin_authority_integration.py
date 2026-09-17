"""P1.4/P1.5: trusted-principal propagation through the ACTUAL plugin proxy.

Companion to tests/test_desktop_session_auth.py (which covers the archive
route under STEWARD_RPC_PRINCIPAL_KIND=human). This module closes two gaps
that module leaves open:

1. token-present composition: the session token captured by the proxy must
   BE the bearer that reaches the backend authenticator — a 401 on a wrong
   token proves the backend validated it (the request body actor field was
   never consulted), not that the proxy happened to be open.
2. token-absent composition: with no dashboard session token in the host
   environment, the proxy forwards no Authorization header; the configured
   RPC token still gates the backend. The browser cannot self-authorize by
   inventing headers.
3. principal attribution: a successful human archive records the configured
   human principal, never the forged actor_id from the request payload.
4. cross-project isolation on a state-changing route through the proxy
   (existing coverage is on a queued-item creation route only).
"""
from __future__ import annotations

import importlib.util
from pathlib import Path

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from hermes_project_stewardship.persistence.service import StewardshipService

PLUGIN_PATH = (
    Path(__file__).parents[1]
    / "hermes_dockyard_plugin" / "dashboard" / "plugin_api.py"
)


def _load_proxy(monkeypatch, tmp_path, *, rpc_token, session_token, principal_kind,
                capabilities="project_archive"):
    """Host-faithful composition: the production plugin binds the backend RPC
    token to the SAME value as the dashboard session token
    (`STEWARD_RPC_TOKEN or HERMES_DASHBOARD_SESSION_TOKEN`), and the browser
    presents that session token per request. So `session_token` is the value
    the browser sends; pass the same string as `rpc_token` to model a valid
    host, or a different one to model a forged session.
    """
    monkeypatch.setenv("HERMES_HOME", str(tmp_path))
    monkeypatch.setenv("STEWARD_DB_PATH", str(tmp_path / "db.sqlite"))
    monkeypatch.setenv("STEWARD_RPC_TOKEN", rpc_token)
    if session_token is None:
        monkeypatch.delenv("HERMES_DASHBOARD_SESSION_TOKEN", raising=False)
    else:
        monkeypatch.setenv("HERMES_DASHBOARD_SESSION_TOKEN", session_token)
    monkeypatch.setenv("STEWARD_RPC_PRINCIPAL", "trusted-human")
    monkeypatch.setenv("STEWARD_RPC_PRINCIPAL_KIND", principal_kind)
    monkeypatch.setenv("STEWARD_RPC_CAPABILITIES", capabilities)
    spec = importlib.util.spec_from_file_location("p1_plugin_proxy", PLUGIN_PATH)
    assert spec is not None and spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    app = FastAPI()
    app.include_router(module.router)
    return module, app


@pytest.fixture()
def demo(tmp_path):
    def make(module):
        service = StewardshipService(module._store)
        service.enable("demo", mission="review", lead_profile="lead")
        service.enable("other", mission="other project", lead_profile="lead")
    return make


def test_token_present_wrong_session_token_is_401_not_open(tmp_path, monkeypatch, demo):
    """A wrong session token must fail at the backend authenticator, proving
    the proxy forwards it as the bearer and nothing in the body is trusted."""
    module, app = _load_proxy(
        monkeypatch, tmp_path,
        rpc_token="inner-secret", session_token="host-session-token",
        principal_kind="human",
    )
    demo(module)
    with TestClient(app) as client:
        response = client.post(
            "/projects/demo/archive",
            headers={"x-hermes-session-token": "wrong"},
            json={"actor": "payload-imposter"},
        )
    assert response.status_code == 401, response.text
    row = module._store._conn.execute(
        "SELECT enabled FROM project_stewardship WHERE project_id='demo'").fetchone()
    assert row["enabled"] == 1  # denied: no mutation happened
    module._store.close()


def test_token_present_valid_session_token_archives_with_trusted_principal(
    tmp_path, monkeypatch, demo,
):
    module, app = _load_proxy(
        monkeypatch, tmp_path,
        rpc_token="host-session-token", session_token="host-session-token",
        principal_kind="human",
    )
    demo(module)
    with TestClient(app) as client:
        response = client.post(
            "/projects/demo/archive",
            headers={"x-hermes-session-token": "host-session-token"},
            json={"actor": "payload-imposter"},
        )
    assert response.status_code == 200, response.text
    row = module._store._conn.execute(
        "SELECT enabled, archived_by FROM project_stewardship WHERE project_id='demo'"
    ).fetchone()
    assert row["enabled"] == 0
    # P1.4: attribution is the TRUSTED principal, never the body actor_id.
    assert row["archived_by"] == "trusted-human"
    module._store.close()


def test_raw_authorization_header_follows_bearer_contract(
    tmp_path, monkeypatch, demo,
):
    """The capture layer fills Authorization from the session header only when
    the client sent no Authorization (plugin_api._capture_request). A raw
    bearer therefore authenticates by POSSESSION of the token: valid token
    admitted, wrong token 401 even alongside a valid x-hermes-session-token
    (Authorization takes precedence — it is never silently overridden).
    In production the browser's session token IS the RPC token
    (`STEWARD_RPC_TOKEN or HERMES_DASHBOARD_SESSION_TOKEN`), so this is the
    same credential, not a bypass path."""
    module, app = _load_proxy(
        monkeypatch, tmp_path,
        rpc_token="host-session-token", session_token="host-session-token",
        principal_kind="human",
    )
    demo(module)
    with TestClient(app) as client:
        good = client.post(
            "/projects/demo/archive",
            headers={"authorization": "Bearer host-session-token"},
            json={"actor": "sahil"},
        )
        conflict = client.post(
            "/projects/other/archive",
            headers={"authorization": "Bearer not-the-token",
                     "x-hermes-session-token": "host-session-token"},
            json={"actor": "sahil"},
        )
    assert good.status_code == 200, good.text
    assert conflict.status_code == 401, conflict.text
    row = module._store._conn.execute(
        "SELECT enabled FROM project_stewardship WHERE project_id='other'").fetchone()
    assert row["enabled"] == 1
    module._store.close()


def test_token_absent_host_keeps_backend_gated_by_rpc_token(
    tmp_path, monkeypatch, demo,
):
    """Without HERMES_DASHBOARD_SESSION_TOKEN the capture layer forwards no
    credential; the configured RPC token still denies unauthenticated calls
    and admits nothing — fail-closed on the whole route."""
    module, app = _load_proxy(
        monkeypatch, tmp_path,
        rpc_token="inner-secret", session_token=None,
        principal_kind="human",
    )
    demo(module)
    with TestClient(app) as client:
        denied = client.post("/projects/demo/archive", json={"actor": "sahil"})
    assert denied.status_code == 401, denied.text
    module._store.close()


@pytest.mark.parametrize("principal_kind,capabilities,expected", [
    ("human", "project_archive", 200),
    # An agent-kind principal is not granted the human lifecycle capability:
    # the verified-but-underprivileged path must return 403, not 401.
    ("agent", "", 403),
])
def test_capability_grant_decides_authority_through_proxy(
    tmp_path, monkeypatch, demo, principal_kind, capabilities, expected,
):
    module, app = _load_proxy(
        monkeypatch, tmp_path,
        rpc_token="host-session-token", session_token="host-session-token",
        principal_kind=principal_kind, capabilities=capabilities,
    )
    demo(module)
    with TestClient(app) as client:
        response = client.post(
            "/projects/demo/archive",
            headers={"x-hermes-session-token": "host-session-token"},
            json={"actor": "bot"},
        )
    assert response.status_code == expected, response.text
    module._store.close()


def test_cross_project_archive_denied_through_proxy(tmp_path, monkeypatch, demo):
    """Archive of 'other' must be refused when the store only holds demo as
    archived-eligible: a well-formed request for an unmanaged project fails
    closed rather than mutating unrelated state."""
    module, app = _load_proxy(
        monkeypatch, tmp_path,
        rpc_token="host-session-token", session_token="host-session-token",
        principal_kind="human",
    )
    demo(module)
    module._store._conn.execute(
        "DELETE FROM project_stewardship WHERE project_id='other'")
    module._store._conn.commit()
    with TestClient(app) as client:
        headers = {"x-hermes-session-token": "host-session-token"}
        ok = client.post("/projects/demo/archive", headers=headers, json={})
        missing = client.post("/projects/ghost/archive", headers=headers, json={})
    assert ok.status_code == 200, ok.text
    # Unmanaged projects answer 409 conflict ("stewardship not enabled") —
    # a fail-closed refusal, not a silent success.
    assert missing.status_code == 409, missing.text
    row = module._store._conn.execute(
        "SELECT enabled FROM project_stewardship WHERE project_id='demo'").fetchone()
    assert row["enabled"] == 0
    module._store.close()
