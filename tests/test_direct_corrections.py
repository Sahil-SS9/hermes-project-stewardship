"""Regression tests for the direct correction lane."""
from __future__ import annotations

from fastapi.testclient import TestClient

from hermes_project_stewardship.api.server import create_app
from hermes_project_stewardship.domain.constants import Capability
from hermes_project_stewardship.persistence.service import StewardshipService
from hermes_project_stewardship.persistence.store import Store


def _client(tmp_path, *, human=False, capabilities=None):
    store = Store(tmp_path / "dockyard.db")
    service = StewardshipService(store)
    service.enable("demo", mission="original")
    app = create_app(
        store,
        auth_token="secret",
        auth_principal="sahil" if human else "agent",
        auth_principal_is_human=human,
        capabilities=capabilities,
    )
    return store, service, TestClient(app)


def test_lifecycle_mutations_deny_zero_capability_principal_without_write(tmp_path):
    store, service, client = _client(tmp_path, human=False, capabilities=set())
    try:
        headers = {"Authorization": "Bearer secret"}
        disabled = client.post("/stewardship/v1/projects/demo/disable", headers=headers)
        assert disabled.status_code == 403
        enabled = store._conn.execute(
            "SELECT enabled, mission FROM project_stewardship WHERE project_id='demo'"
        ).fetchone()
        assert (enabled["enabled"], enabled["mission"]) == (1, "original")
    finally:
        store.close()


def test_lifecycle_mutations_allow_explicit_capability_and_verified_audit_actor(tmp_path):
    store, service, client = _client(
        tmp_path, human=True, capabilities={Capability.PROJECT_ARCHIVE.value}
    )
    try:
        headers = {"Authorization": "Bearer secret"}
        response = client.post("/stewardship/v1/projects/demo/disable", headers=headers)
        assert response.status_code == 200, response.text
        row = store._conn.execute(
            "SELECT enabled FROM project_stewardship WHERE project_id='demo'"
        ).fetchone()
        assert row["enabled"] == 0
        audit = store._conn.execute(
            "SELECT actor FROM stewardship_audit_log WHERE action='stewardship.disabled' ORDER BY id DESC LIMIT 1"
        ).fetchone()
        assert audit["actor"] == "sahil"
    finally:
        store.close()


def test_enable_requires_lifecycle_capability(tmp_path):
    store, service, client = _client(tmp_path, human=True, capabilities=set())
    try:
        response = client.post(
            "/stewardship/v1/projects/demo/enable",
            headers={"Authorization": "Bearer secret"},
            json={"mission": "spoofed"},
        )
        assert response.status_code == 403
        row = store._conn.execute(
            "SELECT enabled, mission FROM project_stewardship WHERE project_id='demo'"
        ).fetchone()
        assert (row["enabled"], row["mission"]) == (1, "original")
    finally:
        store.close()


def test_env_token_and_default_shared_principal_cannot_mutate(tmp_path, monkeypatch):
    store = Store(tmp_path / "env.db")
    StewardshipService(store).enable("demo", mission="original")
    monkeypatch.setenv("STEWARD_RPC_TOKEN", "secret")
    app = create_app(
        store,
        auth_token=None,
        auth_principal="shared-agent",
        auth_principal_is_human=False,
        capabilities=None,
    )
    try:
        response = TestClient(app).post(
            "/stewardship/v1/projects/demo/disable",
            headers={"Authorization": "Bearer secret"},
        )
        assert response.status_code == 403
        assert store._conn.execute(
            "SELECT enabled FROM project_stewardship WHERE project_id='demo'"
        ).fetchone()["enabled"] == 1
    finally:
        store.close()


def test_plugin_proxy_forwards_authorization_to_backend(tmp_path, monkeypatch):
    import asyncio
    import sys
    from pathlib import Path
    from fastapi import FastAPI
    from fastapi.testclient import TestClient
    plugin_dir = str(Path(__file__).parents[1] / "hermes_dockyard_plugin/dashboard")
    sys.path.insert(0, plugin_dir)
    monkeypatch.setenv("STEWARD_DB_PATH", str(tmp_path / "plugin.db"))
    monkeypatch.setenv("STEWARD_RPC_TOKEN", "inner-secret")
    import plugin_api
    from hermes_project_stewardship.persistence.service import StewardshipService
    backend_store = Store(tmp_path / "plugin.db")
    StewardshipService(backend_store).enable("demo", mission="original")
    monkeypatch.setattr(plugin_api, "_app", create_app(backend_store, auth_token="inner-secret", auth_principal="human", auth_principal_is_human=True, capabilities={"project_archive"}))
    previous = plugin_api._client
    plugin_api._client = plugin_api.httpx.AsyncClient(transport=plugin_api.httpx.ASGITransport(app=plugin_api._app), base_url="http://test")
    host = FastAPI()
    host.include_router(plugin_api.plugin_api, prefix="/plugin")
    try:
        with TestClient(host) as client:
            response = client.post("/plugin/projects/demo/disable", headers={"Authorization": "Bearer inner-secret"})
            assert response.status_code == 200, response.text
            assert response.json()["enabled"] is False
            denied = client.post("/plugin/projects/demo/re-enable")
            assert denied.status_code == 401
    finally:
        asyncio.run(plugin_api._client.aclose())
        plugin_api._client = previous
