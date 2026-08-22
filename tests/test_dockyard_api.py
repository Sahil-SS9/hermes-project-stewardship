"""Dockyard RPC routes: work-items + backlog over /stewardship/v1."""
from __future__ import annotations

import pytest

fastapi = pytest.importorskip("fastapi")
from fastapi.testclient import TestClient  # noqa: E402

from hermes_project_stewardship.api.server import create_app  # noqa: E402
from hermes_project_stewardship.persistence.store import Store  # noqa: E402


@pytest.fixture()
def env(tmp_path):
    store = Store(tmp_path / "dy.db")
    app = create_app(store)
    c = TestClient(app)
    yield c, store
    store.close()


def _enable(c, pid="dy1"):
    r = c.post(f"/stewardship/v1/projects/{pid}/enable", json={
        "project_id": pid, "mission": "m",
        "lead_profile": "l", "autonomy_level": 2})
    assert r.status_code == 200


def test_workitem_create_list_transition(env):
    c, _ = env
    _enable(c)
    r = c.post("/stewardship/v1/projects/dy1/work-items", json={
        "type": "task", "title": "Split CI matrix by OS",
        "actor_id": "sahil", "actor_kind": "human"})
    assert r.status_code == 200
    ref = r.json()["ref"]
    assert ref.startswith("HDY-")

    r = c.get("/stewardship/v1/projects/dy1/work-items")
    assert r.status_code == 200
    items = r.json()["work_items"]
    assert len(items) == 1 and items[0]["created_by"] == "sahil"

    r = c.post(f"/stewardship/v1/projects/dy1/work-items/{ref}/transition",
               json={"status": "in_progress", "actor_id": "coder-bot"})
    assert r.status_code == 200
    assert r.json()["status"] == "in_progress"


def test_workitem_validation_errors(env):
    c, _ = env
    _enable(c)
    r = c.post("/stewardship/v1/projects/dy1/work-items", json={
        "type": "task", "title": "ab", "actor_id": "x"})
    assert r.status_code == 422
    r = c.post("/stewardship/v1/projects/dy1/work-items", json={
        "type": "task", "title": "Valid enough", "actor_id": "x",
        "parent_ref": "HDY-999"})
    assert r.status_code == 422


def test_backlog_add_rerank_reason_mandatory(env):
    c, _ = env
    _enable(c)
    r = c.post("/stewardship/v1/projects/dy1/work-items", json={
        "type": "bug", "title": "Webhook duplicates events",
        "actor_id": "qa-bot"})
    ref = r.json()["ref"]

    r = c.post("/stewardship/v1/projects/dy1/backlog", json={
        "ref": ref, "rank": 2, "reason": "x", "actor_id": "qa-bot"})
    assert r.status_code == 400  # reason too short

    r = c.post("/stewardship/v1/projects/dy1/backlog", json={
        "ref": ref, "rank": 2, "reason": "customer-reported regression",
        "actor_id": "qa-bot"})
    assert r.status_code == 200

    r = c.post(f"/stewardship/v1/projects/dy1/backlog/{ref}/rerank", json={
        "new_rank": 1, "reason": "security impact escalates priority",
        "actor_id": "sahil", "actor_kind": "human"})
    assert r.status_code == 200
    body = r.json()
    assert body["from_rank"] == 2 and body["to_rank"] == 1

    r = c.get("/stewardship/v1/projects/dy1/backlog")
    entries = r.json()["backlog"]
    assert entries[0]["item_ref"] == ref and entries[0]["rank"] == 1


def test_unknown_project_404_shape(env):
    c, _ = env
    r = c.post("/stewardship/v1/projects/ghost/work-items", json={
        "type": "task", "title": "Orphan item", "actor_id": "x"})
    # FK violation surfaces as error envelope (500-class or 404 per handler);
    # must NOT be a bare traceback.
    assert r.status_code >= 400
    assert "detail" in r.json() or "error" in r.json()
