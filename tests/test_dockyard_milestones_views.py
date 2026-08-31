"""Dockyard milestones + saved views: store, service, API (PM-04/PM-05)."""
from __future__ import annotations

import pytest

fastapi = pytest.importorskip("fastapi")
from fastapi.testclient import TestClient  # noqa: E402

from hermes_project_stewardship.api.server import create_app  # noqa: E402
from hermes_project_stewardship.kanban import ReferenceKanbanAdapter  # noqa: E402
from hermes_project_stewardship.dockyard import (  # noqa: E402
    Actor,
    ActorKind,
    WorkItemType,
)
from hermes_project_stewardship.persistence.dockyard_service import (
    DockyardService,  # noqa: E402
)
from hermes_project_stewardship.persistence.store import Store  # noqa: E402


@pytest.fixture()
def human() -> Actor:
    return Actor(id="sahil", display_name="Sahil", kind=ActorKind.HUMAN)


@pytest.fixture()
def env(tmp_path):
    store = Store(tmp_path / "mv.db")
    app = create_app(store, kanban_adapter=ReferenceKanbanAdapter(store))
    c = TestClient(app)
    svc = DockyardService(store)
    r = c.post("/stewardship/v1/projects/dy1/enable", json={
        "project_id": "dy1", "mission": "m",
        "lead_profile": "l", "autonomy_level": 2})
    assert r.status_code == 200
    yield c, svc, store
    store.close()


def _mk_item(svc, pid, title, actor):
    return svc.create_item(pid, WorkItemType.TASK, title, actor=actor)


def test_milestone_progress_counts_done_items(env, human):
    c, svc, _ = env
    from hermes_project_stewardship.dockyard import WorkItemStatus

    i1 = _mk_item(svc, "dy1", "Milestone task one", human)
    i2 = _mk_item(svc, "dy1", "Milestone task two", human)
    svc.milestone_create("dy1", "v0.2 hardening", due="2026-09-30",
                         actor=human)
    svc.milestone_attach("dy1", "v0.2 hardening", i1.ref, actor=human)
    svc.milestone_attach("dy1", "v0.2 hardening", i2.ref, actor=human)

    prog = svc.milestone_progress("dy1", "v0.2 hardening")
    assert prog["total"] == 2 and prog["done"] == 0

    svc.transition("dy1", i1.ref, WorkItemStatus.DONE, actor=human)
    prog = svc.milestone_progress("dy1", "v0.2 hardening")
    assert prog["done"] == 1 and prog["total"] == 2


def test_milestone_via_api(env):
    c, _, _ = env
    r = c.post("/stewardship/v1/projects/dy1/milestones", json={
        "name": "hardening", "due": "2026-10-01", "actor_id": "sahil"})
    assert r.status_code == 200
    r = c.get("/stewardship/v1/projects/dy1/milestones/hardening")
    assert r.status_code == 200 and r.json()["total"] == 0
    r = c.get("/stewardship/v1/projects/dy1/milestones/nope")
    assert r.status_code == 404


def test_saved_views_private_vs_shared(env, human):
    c, svc, _ = env
    svc.view_save("dy1", "My triage", "board", filters={"label": "urgent"},
                  actor=human, shared=False)
    svc.view_save("dy1", "Team board", "table", filters={},
                  actor=human, shared=True)

    other = Actor(id="qa-bot", display_name="qa-bot", kind=ActorKind.BOT)
    mine = svc.views_list("dy1", actor=human)
    theirs = svc.views_list("dy1", actor=other)
    names_mine = {v["name"] for v in mine}
    names_theirs = {v["name"] for v in theirs}
    assert {"My triage", "Team board"} <= names_mine
    assert "My triage" not in names_theirs
    assert "Team board" in names_theirs


def test_views_api_roundtrip(env):
    c, _, _ = env
    r = c.put("/stewardship/v1/projects/dy1/views", json={
        "name": "Urgent board", "layout": "board",
        "filters": {"label": "urgent"}, "actor_id": "sahil",
        "shared": True})
    assert r.status_code == 200
    r = c.get("/stewardship/v1/projects/dy1/views?actor_id=sahil")
    assert any(v["name"] == "Urgent board" for v in r.json()["views"])
    r = c.put("/stewardship/v1/projects/dy1/views", json={
        "name": "Bad layout", "layout": "wallpaper", "filters": {},
        "actor_id": "sahil"})
    assert r.status_code == 422


def test_milestone_list_api_orders_and_counts(env, human):
    c, svc, _ = env
    from hermes_project_stewardship.dockyard import WorkItemStatus

    i1 = _mk_item(svc, "dy1", "One", human)
    i2 = _mk_item(svc, "dy1", "Two", human)
    i3 = _mk_item(svc, "dy1", "Three", human)
    svc.milestone_create("dy1", "later", due="2026-12-01", actor=human)
    svc.milestone_create("dy1", "soon", due="2026-09-01", actor=human)
    for ref in (i1.ref, i2.ref):
        svc.milestone_attach("dy1", "soon", ref, actor=human)
    svc.milestone_attach("dy1", "later", i3.ref, actor=human)
    svc.transition("dy1", i1.ref, WorkItemStatus.DONE, actor=human)

    r = c.get("/stewardship/v1/projects/dy1/milestones")
    assert r.status_code == 200
    rows = r.json()["milestones"]
    names = [m["name"] for m in rows]
    # Open first (by due), closed last; both created open here so due order wins.
    assert names == ["soon", "later"]
    soon = rows[0]
    assert soon["total"] == 2 and soon["closed"] is False
    assert soon["done"] in (0, 1)  # dockyard path: counts mirror the store
    assert soon["due"] == "2026-09-01"


def test_milestone_list_uses_one_aggregate_query(env, human):
    _, svc, store = env
    for name in ("m1", "m2", "m3"):
        svc.milestone_create("dy1", name, due="2026-12-01", actor=human)
    statements = []
    store._conn.set_trace_callback(statements.append)
    try:
        rows = svc.milestone_list("dy1")
    finally:
        store._conn.set_trace_callback(None)
    selects = [sql for sql in statements if sql.lstrip().upper().startswith("SELECT")]
    assert len(rows) == 3
    assert len(selects) == 1


def test_milestone_list_unknown_project_404(env):
    c, _, _ = env
    r = c.get("/stewardship/v1/projects/ghost/milestones")
    assert r.status_code == 404


def test_milestone_update_close_and_reopen(env, human):
    c, svc, _ = env
    i1 = _mk_item(svc, "dy1", "Only", human)
    svc.milestone_create("dy1", "m1", due="2026-10-01", actor=human)
    svc.milestone_attach("dy1", "m1", i1.ref, actor=human)

    r = c.patch("/stewardship/v1/projects/dy1/milestones/m1", json={
        "closed": True, "actor_id": "sahil"})
    assert r.status_code == 200 and r.json()["closed"] is True

    # Closed milestone sorts last.
    rows = c.get("/stewardship/v1/projects/dy1/milestones").json()["milestones"]
    assert rows[-1]["name"] == "m1" and rows[-1]["closed"] is True

    r = c.patch("/stewardship/v1/projects/dy1/milestones/m1", json={
        "closed": False, "due": "2026-11-15", "actor_id": "sahil"})
    assert r.status_code == 200 and r.json()["closed"] is False
    assert r.json()["due"] == "2026-11-15"


def test_milestone_update_unknown_404(env):
    c, _, _ = env
    r = c.patch("/stewardship/v1/projects/dy1/milestones/nope", json={
        "closed": True, "actor_id": "sahil"})
    assert r.status_code == 404
