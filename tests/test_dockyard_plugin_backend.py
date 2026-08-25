"""Backend contract tests for the Dockyard dashboard plugin.

Verifies the REAL host contract: plugin_api router shape, proxy paths,
and end-to-end behaviour through the plugin's own endpoints.
"""
from __future__ import annotations

import atexit
import base64
import os
import shutil
import sqlite3
import stat
import sys
import tempfile
import time
from pathlib import Path

import pytest

fastapi = pytest.importorskip("fastapi")

PLUGIN_DIR = Path(__file__).resolve().parents[1] / "hermes_dockyard_plugin" / "dashboard"
sys.path.insert(0, str(PLUGIN_DIR))

# Fresh OS-temporary DB per test process (env must be set BEFORE importing plugin_api).
_tmp_root = Path(tempfile.mkdtemp(prefix="dockyard-plugin-tests-"))
atexit.register(shutil.rmtree, _tmp_root, ignore_errors=True)
_tmp_db = _tmp_root / "dockyard.db"
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


def test_default_plugin_database_is_durable_and_private(tmp_path, monkeypatch):
    hermes_home = tmp_path / "hermes-home"
    monkeypatch.setenv("HERMES_HOME", str(hermes_home))
    monkeypatch.delenv("DOCKYARD_PLUGIN_DB", raising=False)

    default_path = plugin_api._default_db_path()

    assert default_path == (
        hermes_home / "plugin-data" / "hermes-dockyard" / "dockyard.db"
    )
    assert stat.S_IMODE(default_path.parent.stat().st_mode) == 0o700
    assert stat.S_IMODE(plugin_api._DB.stat().st_mode) == 0o600


def test_proxy_rejects_invalid_success_payload(client, monkeypatch):
    class InvalidJsonResponse:
        status_code = 200
        text = "not-json"

        @staticmethod
        def json():
            raise ValueError("invalid JSON")

    class InvalidJsonClient:
        @staticmethod
        async def request(*_args, **_kwargs):
            return InvalidJsonResponse()

    monkeypatch.setattr(plugin_api, "_client", InvalidJsonClient())
    response = client.get("/api/plugins/hermes-dockyard/dashboard")
    assert response.status_code == 502
    assert response.json()["detail"] == "Dockyard returned an invalid response"


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

    with TestClient(plugin_api._app) as upstream:
        work = upstream.post(
            f"/stewardship/v1/projects/{project_id}/work-items",
            json={
                "type": "task",
                "title": "Publish release evidence",
                "actor_id": "octacon",
                "actor_kind": "bot",
            },
        )
        assert work.status_code == 200, work.text

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
    assert "| Ref | Work item | Status | Assignee |" not in report["content"]

    delivery = client.post(
        f"/api/plugins/hermes-dockyard/projects/{project_id}/reports",
        json={"report_type": "delivery", "include_activity": False},
    )
    assert delivery.status_code == 200, delivery.text
    assert "## Delivery" in delivery.json()["content"]
    assert "| Ref | Work item | Status | Assignee |" in delivery.json()["content"]
    assert "## Recent activity" not in delivery.json()["content"]

    risk = client.post(
        f"/api/plugins/hermes-dockyard/projects/{project_id}/reports",
        json={"report_type": "risk", "include_activity": True},
    )
    assert risk.status_code == 200, risk.text
    assert "## Risks and decisions" in risk.json()["content"]
    assert "## Delivery" not in risk.json()["content"]
    assert "## Recent activity" not in risk.json()["content"]

    full = client.post(
        f"/api/plugins/hermes-dockyard/projects/{project_id}/reports",
        json={"report_type": "full", "include_activity": True},
    )
    assert full.status_code == 200, full.text
    assert "| Ref | Work item | Status | Assignee |" in full.json()["content"]
    assert "## Recent activity" in full.json()["content"]

    history = client.get(
        f"/api/plugins/hermes-dockyard/projects/{project_id}/reports")
    assert history.status_code == 200, history.text
    assert any(item["report_id"] == report["report_id"] for item in history.json()["reports"])

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
             None, 7, 1, now, 0),
        )
        con.execute(
            "INSERT INTO sessions VALUES(?,?,?,?,?,?,?,?,?,?)",
            ("hidden-session", "internal", "gpt-test", "Private session", now - 60,
             None, 1, 0, now - 55, 1),
        )
        con.executemany(
            "INSERT INTO messages(session_id,role,content,tool_name,timestamp,active,display_kind)"
            " VALUES(?,?,?,?,?,?,?)",
            [
                ("sess-octacon-1", "system", "private system prompt", None, now - 30, 1, None),
                ("sess-octacon-1", "user", "Run the release checks", None, now - 20, 1, None),
                ("sess-octacon-1", "assistant", "private chain of thought", None, now - 15, 1, "reasoning"),
                ("sess-octacon-1", "assistant", "private compressed context", None, now - 14, 1, "hidden"),
                ("sess-octacon-1", "user", "private internal notification", None, now - 13, 1, "internal_notification"),
                ("sess-octacon-1", "assistant", "Running the focused suite.", None, now - 10, 1, None),
                ("sess-octacon-1", "tool", "12 tests passed", "terminal", now - 5, 1, "tool"),
                ("hidden-session", "user", "private hidden request", None, now - 55, 1, None),
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
    assert "private chain of thought" not in transcript.text
    assert "private compressed context" not in transcript.text
    assert "private internal notification" not in transcript.text
    assert transcript.json()["scope_note"] == "System prompts and private reasoning are excluded."

    hidden = client.get(
        "/api/plugins/hermes-dockyard/bots/transcript-bot/sessions/hidden-session")
    assert hidden.status_code == 404
    assert "private hidden request" not in hidden.text


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


# ---------------------------------------------------------------------------
# Slice 3 - atomic create+queue proxy + enable/disable/pause proxy routes
# + disabled readback through the plugin contract.
# ---------------------------------------------------------------------------


def test_plugin_create_queued_item_proxy(client):
    project_id = "queued-ui"
    client.post("/api/plugins/hermes-dockyard/onboard", json={
        "project_id": project_id, "repo_path": "/srv/queued",
        "mission": "exercise the queued item proxy",
        "lead_profile": "octacon",
    })
    r = client.post(
        f"/api/plugins/hermes-dockyard/projects/{project_id}/backlog/items",
        json={
            "type": "task", "title": "Investigate customer checkout",
            "assignee_id": "octacon-bot", "assignee_kind": "bot",
            "rank": 1, "reason": "customer-reported checkout regression",
        },
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["ref"].startswith("HDY-") and body["rank"] == 1

    work = client.get(
        f"/api/plugins/hermes-dockyard/projects/{project_id}/work-items"
    ).json()["work_items"]
    assert any(w["ref"] == body["ref"] and w["assignee"] == "octacon-bot"
               and w["created_by"] == "sahil" for w in work)
    entries = client.get(
        f"/api/plugins/hermes-dockyard/projects/{project_id}/backlog"
    ).json()["backlog"]
    assert entries[0]["item_ref"] == body["ref"]


def test_plugin_create_queued_item_rejects_same_creator_assignee(client):
    project_id = "queued-self"
    client.post("/api/plugins/hermes-dockyard/onboard", json={
        "project_id": project_id, "repo_path": "/srv/queued-self",
        "mission": "exercise the queued item proxy self-assign",
        "lead_profile": "octacon",
    })
    r = client.post(
        f"/api/plugins/hermes-dockyard/projects/{project_id}/backlog/items",
        json={
            "type": "task", "title": "Self assigned",
            "assignee_id": "sahil", "assignee_kind": "human",
            "rank": 1, "reason": "reasonable reason supplied",
        },
    )
    assert r.status_code == 422, r.text


def test_plugin_create_queued_item_rejects_cross_project_initiative(client):
    client.post("/api/plugins/hermes-dockyard/onboard", json={
        "project_id": "a-proj", "repo_path": "/srv/a",
        "mission": "exercise cross-project initiative guard",
        "lead_profile": "octacon",
    })
    b = client.post("/api/plugins/hermes-dockyard/onboard", json={
        "project_id": "b-proj", "repo_path": "/srv/b",
        "mission": "exercise cross-project initiative guard too",
        "lead_profile": "octacon",
    })
    assert b.status_code == 200, b.text
    with TestClient(plugin_api._app) as upstream:
        ini = upstream.post(
            "/stewardship/v1/projects/a-proj/initiatives",
            json={"title": "Only in a", "rationale": "r"},
        ).json()
    r = client.post(
        "/api/plugins/hermes-dockyard/projects/b-proj/backlog/items",
        json={
            "type": "task", "title": "Cross project",
            "assignee_id": "octacon-bot", "assignee_kind": "bot",
            "initiative_ref": ini["ref"],
            "rank": 1, "reason": "reasonable reason supplied",
        },
    )
    assert r.status_code == 422, r.text


def test_plugin_project_lifecycle_proxy_routes(client):
    project_id = "lifecycle-ui"
    client.post("/api/plugins/hermes-dockyard/onboard", json={
        "project_id": project_id, "repo_path": "/srv/lifecycle",
        "mission": "exercise enable/disable/pause/resume/freeze",
        "lead_profile": "octacon",
    })

    disable = client.post(
        f"/api/plugins/hermes-dockyard/projects/{project_id}/disable")
    assert disable.status_code == 200, disable.text
    settings = client.get(
        f"/api/plugins/hermes-dockyard/projects/{project_id}/settings").json()
    assert settings["enabled"] is False

    re_enable = client.post(
        f"/api/plugins/hermes-dockyard/projects/{project_id}/re-enable")
    assert re_enable.status_code == 200, re_enable.text
    assert re_enable.json()["enabled"] is True

    pause = client.post(
        f"/api/plugins/hermes-dockyard/projects/{project_id}/pause")
    assert pause.status_code == 200, pause.text
    freeze = client.post(
        f"/api/plugins/hermes-dockyard/projects/{project_id}/freeze")
    assert freeze.status_code == 200, freeze.text
    resume = client.post(
        f"/api/plugins/hermes-dockyard/projects/{project_id}/resume")
    assert resume.status_code == 200, resume.text


def test_plugin_mission_objective_and_content_management_routes(client):
    project_id = "management-ui"
    created = client.post("/api/plugins/hermes-dockyard/onboard", json={
        "project_id": project_id,
        "repo_path": "/srv/management-ui",
        "mission": "Manage project outcomes and supporting evidence",
        "lead_profile": "octacon",
    })
    assert created.status_code == 200, created.text
    base = f"/api/plugins/hermes-dockyard/projects/{project_id}"

    objective = client.post(f"{base}/objectives", json={
        "name": "Release confidence",
        "description": "Protect the release gate",
        "target": ">=1",
        "severity": "high",
    })
    assert objective.status_code == 200, objective.text
    objective_id = objective.json()["id"]
    listed = client.get(f"{base}/objectives")
    assert listed.status_code == 200
    assert listed.json()["objectives"][0]["name"] == "Release confidence"

    edited = client.patch(f"{base}/objectives/{objective_id}", json={
        "description": "Protect every release gate",
    })
    assert edited.status_code == 200, edited.text
    archived = client.post(f"{base}/objectives/{objective_id}/archive")
    assert archived.status_code == 200, archived.text
    removed = client.delete(f"{base}/objectives/{objective_id}")
    assert removed.status_code == 200, removed.text

    mission = client.post(f"{base}/mission/archive")
    assert mission.status_code == 200, mission.text
    history = client.get(f"{base}/missions/archive")
    assert history.status_code == 200
    assert history.json()["missions"][0]["mission"].startswith("Manage project")

    raw = b"# Support\n\nProject context.\n"
    uploaded = client.post(f"{base}/content", json={
        "filename": "support.md",
        "media_type": "text/markdown",
        "content_base64": base64.b64encode(raw).decode("ascii"),
    })
    assert uploaded.status_code == 200, uploaded.text
    content_id = uploaded.json()["content_id"]
    content = client.get(f"{base}/content")
    assert content.status_code == 200
    assert content.json()["content"][0]["filename"] == "support.md"
    preview = client.get(f"{base}/content/{content_id}/preview")
    assert preview.status_code == 200
    assert preview.json()["text"] == raw.decode("utf-8")
