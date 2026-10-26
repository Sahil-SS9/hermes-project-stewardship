"""Trusted-principal and capability propagation through the real plugin proxy.

The small host double enforces the outer authentication boundary. The proxy
uses its own process-local backend credential, not a browser credential.
Principal attribution, permission denials and cross-project isolation still
exercise the production backend and a real disposable database.
"""
from __future__ import annotations

import importlib.util
from pathlib import Path

import pytest
from .dashboard_host import authenticated_host
from fastapi.testclient import TestClient

from hermes_project_stewardship.persistence.service import StewardshipService

PLUGIN_PATH = (
    Path(__file__).parents[1]
    / "hermes_dockyard_plugin" / "dashboard" / "plugin_api.py"
)


def _load_proxy(monkeypatch, tmp_path, *, rpc_token, session_token, principal_kind,
                capabilities="project_archive"):
    """Configure host and RPC credentials independently to catch accidental coupling.

    This is a host double, not the actual Hermes authentication middleware.
    Native-host verification separately exercises the real gate and provider.
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
    app = authenticated_host(module.router, session_token=session_token)
    return module, app


@pytest.fixture()
def demo(tmp_path):
    def make(module):
        service = StewardshipService(module._store)
        service.enable("demo", mission="review", lead_profile="lead")
        service.enable("other", mission="other project", lead_profile="lead")
    return make


def test_token_present_wrong_session_token_is_401_not_open(tmp_path, monkeypatch, demo):
    """A wrong session token must fail at the host before a backend mutation."""
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
    """The gated host rejects an invalid bearer even with a legacy session header.

    Successful host authentication does not require the browser bearer to
    equal the private credential used by the embedded backend.
    """
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


def test_missing_host_credentials_cannot_borrow_backend_credential(
    tmp_path, monkeypatch, demo,
):
    """A private backend credential never authorises an unauthenticated host caller."""
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


@pytest.mark.parametrize("credential_mode", ["loopback", "cookie", "native"])
@pytest.mark.parametrize("principal_kind,capabilities,expected", [
    ("human", "project_archive", 200),
    # An agent-kind principal is not granted the human lifecycle capability:
    # the verified-but-underprivileged path must return 403, not 401.
    ("agent", "", 403),
])
def test_capability_grant_decides_authority_through_proxy(
    tmp_path, monkeypatch, demo, principal_kind, capabilities, expected, credential_mode,
):
    module, app = _load_proxy(
        monkeypatch, tmp_path,
        rpc_token="host-session-token", session_token="host-session-token",
        principal_kind=principal_kind, capabilities=capabilities,
    )
    demo(module)
    with TestClient(app) as client:
        headers = {"x-hermes-session-token": "host-session-token"}
        if credential_mode == "cookie":
            client.cookies.set("hermes_session_at", "accepted-cookie")
            headers = {}
        elif credential_mode == "native":
            headers = {"authorization": "Bearer accepted-native"}
        response = client.post(
            "/projects/demo/archive", headers=headers, json={"actor": "bot"},
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
