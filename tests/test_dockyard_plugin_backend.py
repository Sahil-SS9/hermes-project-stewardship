"""Backend contract tests for the Dockyard dashboard plugin.

Verifies the REAL host contract: plugin_api router shape, proxy paths,
and end-to-end behaviour through the plugin's own endpoints.
"""
from __future__ import annotations

import os
import sqlite3
import sys
import time
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


def test_rich_dashboard_reads_are_exposed_through_plugin_router(client):
    project_id = "rich-ui"
    created = client.post("/api/plugins/hermes-dockyard/onboard", json={
        "project_id": project_id, "repo_path": "/srv/rich-ui",
        "mission": "prove the richer desktop UI", "lead_profile": "octacon"})
    assert created.status_code == 200, created.text

    expected = {
        f"/projects/{project_id}/settings": "project_id",
        f"/projects/{project_id}/work-items": "work_items",
        f"/projects/{project_id}/initiatives": "initiatives",
        "/bots": "bots",
        "/workload": "busy",
    }
    for path, key in expected.items():
        response = client.get(f"/api/plugins/hermes-dockyard{path}")
        assert response.status_code == 200, (path, response.text)
        assert key in response.json(), (path, response.json())


def test_plugin_approve_and_reject_use_real_upstream_contract(client):
    from hermes_project_stewardship.persistence.service import StewardshipService

    project_id = "decision-ui"
    created = client.post("/api/plugins/hermes-dockyard/onboard", json={
        "project_id": project_id, "repo_path": "/srv/decision-ui",
        "mission": "verify owner decisions", "lead_profile": "octacon"})
    assert created.status_code == 200, created.text

    service = StewardshipService(plugin_api._store)
    approved = service.propose_initiative(
        project_id, title="Approve me", rationale="verified value")
    rejected = service.propose_initiative(
        project_id, title="Reject me", rationale="insufficient value")

    approve_response = client.post(
        f"/api/plugins/hermes-dockyard/initiatives/{approved['ref']}/approve")
    assert approve_response.status_code == 200, approve_response.text
    assert approve_response.json()["status"] == "approved"

    reject_response = client.post(
        f"/api/plugins/hermes-dockyard/initiatives/{rejected['ref']}/reject")
    assert reject_response.status_code == 200, reject_response.text
    assert reject_response.json()["status"] == "rejected"


def test_project_management_and_visualisation_routes(client):
    project_id = "project-ui"
    created = client.post("/api/plugins/hermes-dockyard/onboard", json={
        "project_id": project_id, "repo_path": "/srv/project-ui",
        "mission": "exercise project dashboard operations",
        "lead_profile": "octacon"})
    assert created.status_code == 200, created.text

    with TestClient(plugin_api._app) as upstream:
        work = upstream.post(
            f"/stewardship/v1/projects/{project_id}/work-items", json={
                "type": "task", "title": "Prioritise this",
                "actor_id": "sahil", "actor_kind": "human"})
        assert work.status_code == 200, work.text
        ref = work.json()["ref"]

    transition = client.post(
        f"/api/plugins/hermes-dockyard/projects/{project_id}/work-items/{ref}/transition",
        json={"status": "in_progress"})
    assert transition.status_code == 200, transition.text
    assert transition.json()["status"] == "in_progress"

    added = client.post(
        f"/api/plugins/hermes-dockyard/projects/{project_id}/backlog", json={
            "ref": ref, "rank": 1, "reason": "highest verified impact"})
    assert added.status_code == 200, added.text

    reranked = client.post(
        f"/api/plugins/hermes-dockyard/projects/{project_id}/backlog/{ref}/rerank",
        json={"new_rank": 2, "reason": "dependency now leads"})
    assert reranked.status_code == 200, reranked.text

    backlog = client.get(
        f"/api/plugins/hermes-dockyard/projects/{project_id}/backlog")
    assert backlog.status_code == 200
    assert backlog.json()["backlog"][0]["item_ref"] == ref

    saved = client.put(
        f"/api/plugins/hermes-dockyard/projects/{project_id}/views", json={
            "name": "Owner focus", "layout": "board",
            "filters": {"status": "in_progress"}, "shared": False})
    assert saved.status_code == 200, saved.text
    views = client.get(
        f"/api/plugins/hermes-dockyard/projects/{project_id}/views")
    assert views.status_code == 200
    assert any(view["name"] == "Owner focus" for view in views.json()["views"])

    frozen = client.post(
        f"/api/plugins/hermes-dockyard/projects/{project_id}/freeze")
    assert frozen.status_code == 200, frozen.text
    resumed = client.post(
        f"/api/plugins/hermes-dockyard/projects/{project_id}/resume")
    assert resumed.status_code == 200, resumed.text


def test_bot_group_read_routes(client):
    with TestClient(plugin_api._app) as upstream:
        created = upstream.post("/stewardship/v1/bot-groups", json={
            "name": "ui-crew", "purpose": "test group dashboard",
            "member_ids": [], "actor_id": "sahil"})
        assert created.status_code == 200, created.text

    groups = client.get("/api/plugins/hermes-dockyard/bot-groups")
    assert groups.status_code == 200
    assert any(group["name"] == "ui-crew" for group in groups.json()["groups"])

    messages = client.get(
        "/api/plugins/hermes-dockyard/bot-groups/ui-crew/messages")
    assert messages.status_code == 200
    assert "messages" in messages.json()


def test_project_settings_patch_and_report_history(client):
    project_id = "reports-ui"
    created = client.post("/api/plugins/hermes-dockyard/onboard", json={
        "project_id": project_id,
        "repo_path": "/srv/reports-ui",
        "mission": "Make delivery evidence readable",
        "lead_profile": "octacon",
    })
    assert created.status_code == 200, created.text

    updated = client.patch(
        f"/api/plugins/hermes-dockyard/projects/{project_id}/settings",
        json={
            "mission": "Make delivery evidence readable and exportable",
            "lead_profile": "octacon",
            "member_profiles": ["quan", "wesker"],
            "autonomy_level": 2,
            "verification_policy": {
                "require_tests": True,
                "max_open_initiatives": 3,
            },
            "release_policy": {"require_rollback": True, "soak_hours": 24},
            "notification_policy": {
                "severity_threshold": "medium",
                "digest": "daily",
            },
        },
    )
    assert updated.status_code == 200, updated.text
    assert updated.json()["autonomy_level"] == 2
    assert updated.json()["policies"]["release"]["soak_hours"] == 24

    generated = client.post(
        f"/api/plugins/hermes-dockyard/projects/{project_id}/reports",
        json={"report_type": "executive", "include_activity": True},
    )
    assert generated.status_code == 200, generated.text
    report = generated.json()
    assert report["project_id"] == project_id
    assert report["report_type"] == "executive"
    assert report["report_id"].startswith("RPT-")
    assert "# reports-ui executive report" in report["content"]
    assert "## Configuration" in report["content"]
    assert "## Delivery" in report["content"]
    assert "## Risks and decisions" in report["content"]

    history = client.get(
        f"/api/plugins/hermes-dockyard/projects/{project_id}/reports")
    assert history.status_code == 200, history.text
    assert history.json()["reports"][0]["report_id"] == report["report_id"]

    fetched = client.get(
        f"/api/plugins/hermes-dockyard/projects/{project_id}/reports/{report['report_id']}")
    assert fetched.status_code == 200, fetched.text
    assert fetched.json()["content"] == report["content"]


def test_bot_session_transcripts_are_profile_scoped(client, tmp_path, monkeypatch):
    project_id = "sessions-ui"
    created = client.post("/api/plugins/hermes-dockyard/onboard", json={
        "project_id": project_id,
        "repo_path": "/srv/sessions-ui",
        "mission": "Inspect bot execution evidence",
        "lead_profile": "octacon",
    })
    assert created.status_code == 200, created.text

    with TestClient(plugin_api._app) as upstream:
        registered = upstream.post(
            f"/stewardship/v1/projects/{project_id}/bots",
            json={
                "bot_id": "transcript-bot",
                "display_name": "Transcript Bot",
                "capabilities": ["build", "test"],
                "profile": "octacon",
            },
        )
        assert registered.status_code == 200, registered.text

    session_root = tmp_path / "hermes-home"
    profile_home = session_root / "profiles" / "octacon"
    profile_home.mkdir(parents=True)
    state_db = profile_home / "state.db"
    now = time.time()
    with sqlite3.connect(state_db) as con:
        con.executescript(
            """
            CREATE TABLE sessions (
                id TEXT PRIMARY KEY, source TEXT NOT NULL, model TEXT,
                title TEXT, started_at REAL NOT NULL, ended_at REAL,
                message_count INTEGER DEFAULT 0, tool_call_count INTEGER DEFAULT 0,
                last_activity_at REAL, hidden INTEGER DEFAULT 0
            );
            CREATE TABLE messages (
                id INTEGER PRIMARY KEY, session_id TEXT NOT NULL,
                role TEXT NOT NULL, content TEXT, tool_name TEXT,
                timestamp REAL NOT NULL, active INTEGER DEFAULT 1,
                display_kind TEXT
            );
            """
        )
        con.execute(
            "INSERT INTO sessions VALUES(?,?,?,?,?,?,?,?,?,?)",
            ("sess-octacon-1", "discord", "gpt-test", "Fix release gate", now - 30,
             None, 4, 1, now, 0),
        )
        con.executemany(
            "INSERT INTO messages(session_id,role,content,tool_name,timestamp,active,display_kind)"
            " VALUES(?,?,?,?,?,?,?)",
            [
                ("sess-octacon-1", "system", "private system prompt", None, now - 30, 1, None),
                ("sess-octacon-1", "user", "Run the release checks", None, now - 20, 1, None),
                ("sess-octacon-1", "assistant", "Running the focused suite.", None, now - 10, 1, None),
                ("sess-octacon-1", "tool", "12 tests passed", "terminal", now - 5, 1, "tool"),
            ],
        )
    monkeypatch.setenv("DOCKYARD_SESSION_ROOT", str(session_root))

    sessions = client.get(
        "/api/plugins/hermes-dockyard/bots/transcript-bot/sessions")
    assert sessions.status_code == 200, sessions.text
    payload = sessions.json()
    assert payload["profile"] == "octacon"
    assert payload["sessions"][0]["session_id"] == "sess-octacon-1"
    assert payload["sessions"][0]["status"] == "active"

    transcript = client.get(
        "/api/plugins/hermes-dockyard/bots/transcript-bot/sessions/sess-octacon-1")
    assert transcript.status_code == 200, transcript.text
    roles = [message["role"] for message in transcript.json()["messages"]]
    assert roles == ["user", "assistant", "tool"]
    assert "private system prompt" not in transcript.text
    assert transcript.json()["scope_note"] == "System prompts and private reasoning are excluded."


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
