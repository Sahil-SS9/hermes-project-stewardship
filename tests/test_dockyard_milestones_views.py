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
