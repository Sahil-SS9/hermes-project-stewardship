"""Portfolio rollup (release-cut feature): cross-project cockpit.

Covers: status derivation (at_risk / stalled / idle / on_track),
attention totals, mix totals, next-milestone rollup, API route.
"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone

import pytest

fastapi = pytest.importorskip("fastapi")
from fastapi.testclient import TestClient  # noqa: E402

from hermes_project_stewardship.api.server import create_app  # noqa: E402
from hermes_project_stewardship.kanban import ReferenceKanbanAdapter  # noqa: E402
from hermes_project_stewardship.dockyard import Actor, ActorKind  # noqa: E402
from hermes_project_stewardship.persistence.dockyard_service import (  # noqa: E402
    DockyardService,
)
from hermes_project_stewardship.persistence.store import Store  # noqa: E402


def _iso(dt: datetime) -> str:
    return dt.isoformat()


@pytest.fixture()
def store(tmp_path):
    s = Store(tmp_path / "pf.db")
    yield s
    s.close()


def _enable(store, pid):
    store._conn.execute(
        "INSERT INTO project_stewardship (project_id, enabled,"
        " mission, owner_lead_profile, autonomy_level, created_at,"
        " updated_at)"
        " VALUES(?, 1, 'm', 'l', 2, ?, ?)",
        (pid, _iso(datetime.now(timezone.utc)),
         _iso(datetime.now(timezone.utc))))
    store._conn.commit()


def _item(store, pid, status, *, due=None, created_days_ago=0):
    now = datetime.now(timezone.utc)
    created = _iso(now - timedelta(days=created_days_ago))
    store._conn.execute(
        "INSERT INTO dockyard_work_items (project_id, ref, type, title,"
        " status, due, created_at, updated_at)"
        " VALUES(?, ?, 'task', ?, ?, ?, ?, ?)",
        (pid, f"it-{pid}-{store._conn.total_changes}", "T",
         status, due, created, created))
    store._conn.commit()


def _milestone(store, pid, name, due=None, closed=0):
    closed_at = _iso(datetime.now(timezone.utc)) if closed else None
    store._conn.execute(
        "INSERT INTO dockyard_milestones (project_id, name, due,"
        " created_at, closed_at) VALUES(?, ?, ?, ?, ?)",
        (pid, name, due, _iso(datetime.now(timezone.utc)), closed_at))
    store._conn.commit()


def test_on_track_with_open_work(store):
    _enable(store, "p1")
    _item(store, "p1", "in_progress")
    svc = DockyardService(store)
    out = svc.portfolio()
    p = out["projects"][0]
    assert p["status"] == "on_track"
    assert p["items"] == {"done": 0, "total": 1, "blocked": 0,
                          "overdue": 0}
    assert out["attention"] == {"overdue_items": 0, "blocked_items": 0,
                                "overdue_milestones": 0}


def test_at_risk_overdue_item(store):
    _enable(store, "p1")
    _item(store, "p1", "in_progress",
          due=_iso(datetime.now(timezone.utc) - timedelta(days=3)))
    svc = DockyardService(store)
    out = svc.portfolio()
    p = out["projects"][0]
    assert p["status"] == "at_risk"
    assert p["items"]["overdue"] == 1
    assert out["attention"]["overdue_items"] == 1


def test_at_risk_blocked_item(store):
    _enable(store, "p1")
    _item(store, "p1", "blocked")
    out = DockyardService(store).portfolio()
    p = out["projects"][0]
    assert p["status"] == "at_risk"
    assert out["attention"]["blocked_items"] == 1


def test_stalled_no_recent_activity(store):
    _enable(store, "p1")
    _item(store, "p1", "in_progress", created_days_ago=30)
    out = DockyardService(store).portfolio()
    assert out["projects"][0]["status"] == "stalled"


def test_idle_nothing_in_flight(store):
    _enable(store, "p1")
    _item(store, "p1", "done")
    out = DockyardService(store).portfolio()
    assert out["projects"][0]["status"] == "idle"


def test_at_risk_overdue_milestone(store):
    _enable(store, "p1")
    _item(store, "p1", "in_progress")
    _milestone(store, "p1", "v1",
               due=_iso(datetime.now(timezone.utc) - timedelta(days=1)))
    out = DockyardService(store).portfolio()
    p = out["projects"][0]
    assert p["status"] == "at_risk"
    assert p["next_milestone"]["name"] == "v1"
    assert p["next_milestone"]["overdue"] is True
    assert out["attention"]["overdue_milestones"] == 1


def test_closed_milestone_ignored(store):
    _enable(store, "p1")
    _item(store, "p1", "in_progress")
    _milestone(store, "p1", "done-v1",
               due=_iso(datetime.now(timezone.utc) - timedelta(days=5)),
               closed=1)
    out = DockyardService(store).portfolio()
    p = out["projects"][0]
    assert p["status"] == "on_track"
    assert p["next_milestone"] is None


def test_at_risk_date_only_due(store):
    """Date-only due strings (API-accepted shape) must not crash the rollup.
    Regression: naive vs aware datetime comparison raised TypeError."""
    _enable(store, "p1")
    _item(store, "p1", "in_progress", due="2026-08-01")
    _milestone(store, "p1", "v1", due="2026-08-01")
    out = DockyardService(store).portfolio()
    p = out["projects"][0]
    assert p["status"] == "at_risk"
    assert p["next_milestone"]["overdue"] is True
    assert out["attention"]["overdue_items"] == 1


def test_mix_and_multi_project(store):
    _enable(store, "p1")
    _enable(store, "p2")
    _item(store, "p1", "backlog")
    _item(store, "p1", "in_progress")
    _item(store, "p1", "done")
    _item(store, "p2", "blocked")
    out = DockyardService(store).portfolio()
    assert len(out["projects"]) == 2
    assert out["mix"] == {"todo": 1, "in_progress": 1, "blocked": 1,
                          "done": 1}
    assert [p["project_id"] for p in out["projects"]] == ["p1", "p2"]


def test_api_route_live(tmp_path):
    store = Store(tmp_path / "pf-api.db")
    try:
        app = create_app(store, kanban_adapter=ReferenceKanbanAdapter(store))
        c = TestClient(app)
        r = c.post("/stewardship/v1/projects/p1/enable", json={
            "project_id": "p1", "mission": "m", "lead_profile": "l",
            "autonomy_level": 2})
        assert r.status_code == 200
        r = c.get("/stewardship/v1/portfolio")
        assert r.status_code == 200
        body = r.json()
        assert set(body) == {"projects", "mix", "attention"}
        assert body["projects"][0]["project_id"] == "p1"
        assert body["projects"][0]["status"] in (
            "at_risk", "stalled", "idle", "on_track")
    finally:
        store.close()
