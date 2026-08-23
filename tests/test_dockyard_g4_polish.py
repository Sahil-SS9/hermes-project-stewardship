"""G4 P1-P4 tests: inbox, dashboard, notifications, onboarding."""
from __future__ import annotations

import pytest

fastapi = pytest.importorskip("fastapi")
from fastapi.testclient import TestClient  # noqa: E402

from hermes_project_stewardship.api.server import create_app  # noqa: E402
from hermes_project_stewardship.persistence.dockyard_service import (
    DockyardService,  # noqa: E402
)
from hermes_project_stewardship.persistence.service import (
    StewardshipService,  # noqa: E402
)
from hermes_project_stewardship.persistence.store import Store  # noqa: E402


@pytest.fixture()
def env(tmp_path):
    store = Store(tmp_path / "g4.db")
    c = TestClient(create_app(store))
    yield c, store
    store.close()


def _enable(c, pid="demo"):
    assert c.post(f"/stewardship/v1/projects/{pid}/enable", json={
        "project_id": pid, "mission": "m", "lead_profile": "l",
        "autonomy_level": 2}).status_code == 200


def test_inbox_aggregates_across_projects(env):
    c, store = env
    for pid in ("alpha", "beta"):
        _enable(c, pid)
        svc = StewardshipService(store)
        svc.propose_initiative(pid, title=f"Work in {pid}",
                               rationale="objective: inbox aggregation check")
    r = c.get("/stewardship/v1/inbox").json()
    refs = {i["ref"] for i in r["items"] if i["kind"] == "initiative_approval"}
    projects = {i["project"] for i in r["items"]
                if i["kind"] == "initiative_approval"}
    assert {"alpha", "beta"} <= projects
    assert all(i["deep_link"].startswith("s6:") for i in r["items"]
               if i["kind"] == "initiative_approval")


def test_dashboard_rollup_counts_work_and_decisions(env):
    c, store = env
    _enable(c)
    dy = DockyardService(store)
    human = None  # routes carry actor ids as strings
    c.post("/stewardship/v1/projects/demo/work-items", json={
        "type": "task", "title": "Active item", "actor_id": "sahil"})
    items = c.get("/stewardship/v1/projects/demo/work-items").json()
    ref = [w for w in items["work_items"]
           if w["title"] == "Active item"][0]["ref"]
    c.post(f"/stewardship/v1/projects/demo/work-items/{ref}/transition",
           json={"status": "in_progress", "actor_id": "sahil"})
    # a pending initiative => owed decision
    StewardshipService(store).propose_initiative(
        "demo", title="Pending decision",
        rationale="objective: dashboard counts it")

    d = c.get("/stewardship/v1/dashboard").json()
    proj = [p for p in d["projects"] if p["id"] == "demo"][0]
    assert proj["work"]["active"] == 1
    assert d["owed_decisions"] >= 1
    assert d["totals"]["active_work"] >= 1


def test_fleet_notifications_deep_link_and_ack(env):
    c, store = env
    _enable(c)
    # seed one notification directly (engine normally writes these)
    from datetime import datetime, timezone

    with store.tx() as cx:
        cx.execute(
            "INSERT INTO notifications(project_id, severity, kind, title,"
            " body, created_at) VALUES (?,?,?,?,?,?)",
            ("demo", "high", "approval_required", "Approve needed",
             "Initiative HDY-1 awaits you",
             datetime.now(timezone.utc).isoformat()))
    feed = c.get("/stewardship/v1/notifications").json()["notifications"]
    n = [x for x in feed if x["title"] == "Approve needed"][0]
    assert n["deep_link"] == "s4:approval-inbox"
    assert n["acked"] is False

    r = c.post(f"/stewardship/v1/notifications/{n['id']}/ack")
    assert r.status_code == 200
    feed2 = c.get("/stewardship/v1/notifications").json()["notifications"]
    assert [x for x in feed2 if x["id"] == n["id"]][0]["acked"] is True


def test_onboarding_zero_setup(env):
    c, store = env
    r = c.post("/stewardship/v1/onboard", json={
        "project_id": "newco", "repo_path": "/srv/newco",
        "mission": "keep newco healthy", "lead_profile": "octacon",
        "autonomy_level": 2})
    assert r.status_code == 200
    body = r.json()
    assert body["screen"] == "s2"
    assert body["group"] == "newco-ops"

    # project usable immediately: work-item create works
    r = c.post("/stewardship/v1/projects/newco/work-items", json={
        "type": "task", "title": "First task post-onboarding",
        "actor_id": "sahil"})
    assert r.status_code == 200

    # default view saved
    views = c.get(
        "/stewardship/v1/projects/newco/views?actor_id=sahil").json()
    assert any(v["name"] == "Default board" for v in views["views"])

    # duplicate onboarding -> clean 409, not a crash
    r = c.post("/stewardship/v1/onboard", json={
        "project_id": "newco", "repo_path": "/srv/newco",
        "mission": "again", "lead_profile": "octacon"})
    assert r.status_code == 409
