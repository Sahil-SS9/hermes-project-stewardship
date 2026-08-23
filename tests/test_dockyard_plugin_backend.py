"""Backend contract tests for the Dockyard dashboard plugin.

Verifies the REAL host contract: plugin_api router shape, proxy paths,
and end-to-end behaviour through the plugin's own endpoints.
"""
from __future__ import annotations

import os
import sys
from pathlib import Path

import pytest

fastapi = pytest.importorskip("fastapi")

PLUGIN_DIR = Path(__file__).resolve().parents[1] / "hermes_dockyard_plugin" / "dashboard"
sys.path.insert(0, str(PLUGIN_DIR))

# Fresh tmp DB per test session (env must be set BEFORE importing plugin_api)
_tmp_db = Path(__file__).resolve().parents[1] / ".tmp-dockyard-plugin" / "dockyard.db"
_tmp_db.parent.mkdir(parents=True, exist_ok=True)
if _tmp_db.exists():
    _tmp_db.unlink()
os.environ["DOCKYARD_PLUGIN_DB"] = str(_tmp_db)

from fastapi import FastAPI  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

import plugin_api  # noqa: E402


@pytest.fixture()
def client():
    app = FastAPI()
    app.include_router(plugin_api.plugin_api, prefix="/api/plugins/hermes-dockyard")
    with TestClient(app) as c:
        yield c


def test_host_contract_router_and_health(client):
    r = client.get("/api/plugins/hermes-dockyard/health")
    assert r.status_code == 200
    assert r.json()["ok"] is True
    assert r.json()["service"] == "hermes-dockyard"


def test_onboard_then_dashboard_flow(client):
    r = client.post("/api/plugins/hermes-dockyard/onboard", json={
        "project_id": "alpha", "repo_path": "/srv/a",
        "mission": "test mission", "lead_profile": "octacon"})
    assert r.status_code == 200, r.text

    dash = client.get("/api/plugins/hermes-dockyard/dashboard")
    assert dash.status_code == 200
    projects = dash.json().get("projects", [])
    assert any(p["id"] == "alpha" for p in projects)

    inbox = client.get("/api/plugins/hermes-dockyard/inbox")
    assert inbox.status_code == 200
    assert "items" in inbox.json()

    notes = client.get("/api/plugins/hermes-dockyard/notifications")
    assert notes.status_code == 200
    assert "notifications" in notes.json()


def test_duplicate_onboarding_refused(client):
    r = client.post("/api/plugins/hermes-dockyard/onboard", json={
        "project_id": "alpha", "repo_path": "/srv/a",
        "mission": "again", "lead_profile": "octacon"})
    # C-series council fix: re-onboarding cleanly refused (409), never silent 500
    assert r.status_code in (409, 422)


def test_manifest_declares_required_fields():
    import json
    manifest = json.loads((PLUGIN_DIR / "manifest.json").read_text())
    assert manifest["name"] == "hermes-dockyard"
    assert manifest["entry"].startswith("dist/")
    assert manifest["css"].startswith("dist/")


def test_built_dist_present():
    for f in ("index.js", "style.css"):
        p = PLUGIN_DIR / "dist" / f
        assert p.exists(), f"missing built asset {p}"
        assert p.stat().st_size > 0
