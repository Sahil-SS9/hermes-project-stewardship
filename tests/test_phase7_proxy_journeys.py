"""Lane B Phase 7 — backend ASGI integration journeys (PM-0702).

Real TestClient -> create_app (ReferenceKanbanAdapter) -> SQLite readback
with exact payloads. Labels evidence as REAL BACKEND ASGI (not mocked UI,
not vanilla host, not installed Desktop). Verifies the real contract uses
run_key (never invented run_id) and that every frontend shape under test
has a matching backend route (static parity against route-matrix.json).
"""
from __future__ import annotations

import json
from pathlib import Path

import pytest

fastapi = pytest.importorskip("fastapi")
from .lane_b_phase7_fixtures import make_service_client  # noqa: E402


@pytest.fixture()
def env(tmp_path):
    store, service, adapter, app, client, headers = make_service_client(tmp_path)
    yield store, service, adapter, app, client, headers
    store.close()


def test_onboarding_preflight_onboard_settings_readback_exact_payloads(env):
    """PM-0702: onboard preflight -> onboard -> settings persisted readback."""
    store, service, adapter, app, client, headers = env
    payload = {
        "project_id": "lane-b-journey",
        "repo_path": "/srv/lane-b-journey",
        "mission": "lane-b integration journey",
        "lead_profile": "octacon",
        "member_profiles": ["quan", "wesker"],
    }
    preflight = client.post("/stewardship/v1/onboard/preflight", json=payload, headers=headers)
    assert preflight.status_code == 200, preflight.text
    body = preflight.json()
    assert body["mode"] in ("create_new", "connect_existing")
    assert "preflight" in body and "token" in body["preflight"]
    contract = body["preflight"]
    created = client.post(
        "/stewardship/v1/onboard",
        headers=headers,
        json={
            **payload,
            "idempotency_key": "lane-b-journey-key",
            "expected_membership_revision": contract["membership_revision"],
            "preflight_token": contract["token"],
        },
    )
    assert created.status_code == 200, created.text
    settings = client.get(
        "/stewardship/v1/projects/lane-b-journey/settings", headers=headers
    )
    # settings is an open read in this build; accept 200 with owner block.
    assert settings.status_code == 200, settings.text
    owner = settings.json()["owner"]
    assert owner["lead_profile"] == "octacon"
    assert owner["member_profiles"] == ["quan", "wesker"]
    # Persisted readback from authoritative SQLite (not fixture echo).
    row = store._conn.execute(
        "SELECT project_id, mission FROM project_stewardship WHERE project_id=?",
        ("lane-b-journey",),
    ).fetchone()
    assert row is not None and row["mission"] == "lane-b integration journey"
    members = store._conn.execute(
        "SELECT profile_slug FROM project_members WHERE project_id=? ORDER BY profile_slug",
        ("lane-b-journey",),
    ).fetchall()
    assert sorted(r["profile_slug"] for r in members) == ["octacon", "quan", "wesker"]


def test_milestone_roundtrip_is_not_false_empty(env):
    """PM-0702: milestone create -> list -> detail proves no false-empty."""
    store, service, adapter, app, client, headers = env
    pid = "lane-b-milestones"
    service.enable(pid, mission="m", lead_profile="lead")
    created = client.post(
        f"/stewardship/v1/projects/{pid}/milestones",
        headers=headers,
        json={"name": "Release", "due": "2026-12-01", "actor_id": "sahil", "actor_kind": "human"},
    )
    assert created.status_code == 200, created.text
    listed = client.get(
        f"/stewardship/v1/projects/{pid}/milestones", headers=headers
    )
    assert listed.status_code == 200, listed.text
    assert [m["name"] for m in listed.json()["milestones"]] == ["Release"]
    # SQLite readback: milestone row exists with exact due.
    row = store._conn.execute(
        "SELECT name, due FROM dockyard_milestones WHERE project_id=? AND name=?",
        (pid, "Release"),
    ).fetchone()
    assert row is not None and row["due"] == "2026-12-01"


def test_workflow_run_key_contract_no_invented_run_id(env):
    """PM-0702: workflow define/start/runs uses real run_key, never run_id."""
    store, service, adapter, app, client, headers = env
    pid = "lane-b-workflow"
    service.enable(pid, mission="m", lead_profile="lead")
    # workflow_canvas is on by default; ensure explicitly.
    defined = client.post(
        f"/stewardship/v1/projects/{pid}/workflows",
        headers=headers,
        json={"name": "release", "nodes": [
            {"id": "verify", "title": "Verify release", "depends_on": [], "human_gate": False}
        ]},
    )
    assert defined.status_code == 200, defined.text
    started = client.post(
        f"/stewardship/v1/projects/{pid}/workflows/release/start",
        headers=headers,
        json={"run_key": "lane-b-run-1"},
    )
    assert started.status_code == 200, started.text
    payload = started.json()
    assert payload["run_key"] == "lane-b-run-1", payload
    assert "run_id" not in payload, f"contract forbids invented run_id: {payload}"
    runs = client.get(
        f"/stewardship/v1/projects/{pid}/workflows/release/runs", headers=headers
    )
    assert runs.status_code == 200, runs.text
    assert runs.json()["runs"][0]["run_key"] == "lane-b-run-1"
    assert "run_id" not in runs.json()["runs"][0]
    # Persisted ledger row uses run_key primary key.
    row = store._conn.execute(
        "SELECT run_key, status FROM dockyard_workflow_runs WHERE project_id=? AND name=?",
        (pid, "release"),
    ).fetchone()
    assert row is not None and row["run_key"] == "lane-b-run-1"
    # Replay with same run_key is idempotent, not a duplicate.
    replayed = client.post(
        f"/stewardship/v1/projects/{pid}/workflows/release/start",
        headers=headers,
        json={"run_key": "lane-b-run-1"},
    )
    assert replayed.status_code == 200, replayed.text
    assert replayed.json()["run_key"] == "lane-b-run-1"
    count = store._conn.execute(
        "SELECT COUNT(*) c FROM dockyard_workflow_runs WHERE project_id=? AND name=? AND run_key=?",
        (pid, "release", "lane-b-run-1"),
    ).fetchone()["c"]
    assert count == 1


def test_route_parity_static_frontend_shapes_have_backend_routes():
    """PM-0702 static parity: critical Desktop shapes exist in backend server.py.

    This is a reusable static gate (not a live browser run). Full
    frontend-build -> plugin-proxy -> backend proof requires the dashboard
    build + desktop harness under the heavy-gate lock; see lane report.
    """
    wt = Path(__file__).resolve().parents[1]
    server = (wt / "src/hermes_project_stewardship/api/server.py").read_text()
    matrix_path = wt / "docs/plans/evidence/project-management-route-matrix.json"
    matrix = json.loads(matrix_path.read_text())
    # Critical user journeys must have backend routes (exact, not false-empty).
    required = [
        "/onboard/discover", "/onboard/preflight", "/onboard",
        "/projects/{project_id}/team", "/projects/{project_id}/transfers/preview",
        "/projects/{project_id}/transfers/execute", "/operations/{op_id}",
        "/projects/{project_id}/goals", "/projects/{project_id}/milestones",
        "/projects/{project_id}/workflows", "/projects/{project_id}/workflows/{name}/start",
        "/projects/{project_id}/workflows/{name}/runs",
        "/projects/{project_id}/archive", "/projects/{project_id}/restore",
    ]
    missing = [p for p in required if p not in server]
    assert not missing, f"backend server.py missing critical shapes: {missing}"
    assert matrix["summary"]["unresolved_count"] == 0, matrix["summary"]
    assert matrix["summary"]["exact_count"] >= 70, matrix["summary"]
