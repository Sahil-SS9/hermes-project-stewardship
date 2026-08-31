"""DY-P1-03: real saved views — validated query schema, applied filters,
role-aware sharing, view-run endpoint."""
from __future__ import annotations

import pytest

from hermes_project_stewardship.persistence.view_query import (
    QuerySchemaError,
    apply_query,
    validate_query,
)

fastapi = pytest.importorskip("fastapi")
from fastapi.testclient import TestClient  # noqa: E402

from hermes_project_stewardship.api.server import create_app  # noqa: E402
from hermes_project_stewardship.kanban import ReferenceKanbanAdapter  # noqa: E402
from hermes_project_stewardship.persistence.store import Store  # noqa: E402
from hermes_project_stewardship.persistence.dockyard_service import (  # noqa: E402
    DockyardService,
)
from hermes_project_stewardship.dockyard import (  # noqa: E402
    Actor,
    ActorKind,
    WorkItemType,
    WorkItemStatus,
)


# ---- pure schema tests --------------------------------------------------- #

def test_validate_query_accepts_andNormalises():
    q = validate_query({"status": ["done"], "assignee": " sahil ",
                        "labels": ["urgent"], "version": 1})
    assert q == {"version": 1, "status": ["done"], "assignee": "sahil",
                 "labels": ["urgent"]}


def test_validate_query_rejects_unknown_keys_and_statuses():
    with pytest.raises(QuerySchemaError, match="unknown filter keys"):
        validate_query({"banana": True})
    with pytest.raises(QuerySchemaError, match="unknown statuses"):
        validate_query({"status": ["done", "swimming"]})
    with pytest.raises(QuerySchemaError, match="version"):
        validate_query({"version": 99})
    # Legacy single-status strings are normalised to a list (back-compat);
    # truly invalid shapes still fail.
    assert validate_query({"status": "done"})["status"] == ["done"]
    with pytest.raises(QuerySchemaError):
        validate_query({"status": 42})


def test_apply_query_filters_everything():
    items = [
        {"ref": "a", "status": "done", "assignee": "sahil", "labels": ["urgent"]},
        {"ref": "b", "status": "backlog", "assignee": "quan", "labels": []},
        {"ref": "c", "status": "done", "assignee": "quan", "labels": ["infra"]},
    ]
    q = validate_query({"status": ["done"], "labels": ["urgent"]})
    assert [i["ref"] for i in apply_query(items, q)] == ["a"]
    q2 = validate_query({"assignee": "quan"})
    assert len(apply_query(items, q2)) == 2
    ms_map = {"a": "m1", "b": "m1"}
    q3 = validate_query({"milestone": "m1"})
    assert sorted(i["ref"] for i in apply_query(items, q3, ms_map)) == ["a", "b"]


# ---- service/API behaviour ---------------------------------------------- #

@pytest.fixture()
def env(tmp_path):
    store = Store(tmp_path / "vq.db")
    app = create_app(store, kanban_adapter=ReferenceKanbanAdapter(store))
    c = TestClient(app)
    from hermes_project_stewardship.persistence.service import StewardshipService
    StewardshipService(store).enable("dy1", mission="m", lead_profile="l",
                                     autonomy_level=2)
    yield c, store
    store.close()


def _enable(store):
    from hermes_project_stewardship.persistence.service import StewardshipService
    StewardshipService(store).enable("dy1", mission="m", lead_profile="l",
                                     autonomy_level=2)


def test_invalid_query_fails_closed_on_save(env):
    c, store = env
    r = c.put("/stewardship/v1/projects/dy1/views", json={
        "name": "bad", "layout": "board",
        "filters": {"status": ["nonsense"]},
        "actor_id": "sahil"})
    assert r.status_code == 409
    assert "query invalid" in r.json()["error"]["message"]
    # Nothing stored.
    assert store._conn.execute(
        "SELECT COUNT(*) AS n FROM dockyard_saved_views").fetchone()["n"] == 0


def test_unknown_filter_key_fails_closed(env):
    c, _ = env
    r = c.put("/stewardship/v1/projects/dy1/views", json={
        "name": "bad2", "layout": "table", "filters": {"hacker": "x"},
        "actor_id": "sahil"})
    assert r.status_code == 409


def test_view_run_milestone_with_no_items_filters_to_empty(env):
    """cor-001 regression: an empty milestone must filter to nothing,
    not be silently skipped."""
    c, store = env
    r = c.post("/stewardship/v1/projects/dy1/work-items", json={
        "type": "task", "title": "Some task", "actor_id": "sahil"})
    assert r.status_code == 200
    # Milestone exists but has no attached items.
    r = c.post("/stewardship/v1/projects/dy1/milestones", json={
        "name": "empty-ms", "actor_id": "sahil"})
    assert r.status_code == 200
    r = c.put("/stewardship/v1/projects/dy1/views", json={
        "name": "on-empty-ms", "layout": "board",
        "filters": {"version": 1, "milestone": "empty-ms"},
        "actor_id": "sahil"})
    assert r.status_code == 200
    r = c.get("/stewardship/v1/projects/dy1/views/on-empty-ms/items",
              params={"actor_id": "sahil"})
    assert r.status_code == 200
    assert r.json()["items"] == []


def test_view_run_applies_filters(env):
    c, store = env
    # Create items through the API so they are canonical-visible (the app's
    # view runner reads the canonical projection).
    r = c.post("/stewardship/v1/projects/dy1/work-items", json={
        "title": "Done task", "type": "task", "actor_id": "sahil"})
    done_ref = r.json()["ref"]
    r = c.post("/stewardship/v1/projects/dy1/work-items", json={
        "title": "Backlog task", "type": "task", "actor_id": "sahil"})
    backlog_ref = r.json()["ref"]
    r = c.post(
        f"/stewardship/v1/projects/dy1/work-items/{done_ref}/transition",
        json={"status": "done", "actor_id": "sahil"})
    assert r.status_code == 200

    r = c.put("/stewardship/v1/projects/dy1/views", json={
        "name": "only-done", "layout": "table",
        "filters": {"status": ["done"]},
        "actor_id": "sahil"})
    assert r.status_code == 200

    r = c.get(
        "/stewardship/v1/projects/dy1/views/only-done/items"
        "?actor_id=sahil")
    assert r.status_code == 200
    refs = [i["ref"] for i in r.json()["items"]]
    assert done_ref in refs and backlog_ref not in refs


def test_view_run_milestone_filter(env):
    c, store = env
    # Items via API (canonical-visible); milestones via the store service —
    # the view runner joins canonical items to the milestone map by ref.
    r = c.post("/stewardship/v1/projects/dy1/work-items", json={
        "title": "Milestone item", "type": "task", "actor_id": "sahil"})
    i1_ref = r.json()["ref"]
    r = c.post("/stewardship/v1/projects/dy1/work-items", json={
        "title": "Other item", "type": "task", "actor_id": "sahil"})
    i2_ref = r.json()["ref"]

    from hermes_project_stewardship.persistence.dockyard_service import (
        DockyardService)
    from hermes_project_stewardship.dockyard import ActorKind
    svc = DockyardService(store)
    h = Actor(id="sahil", display_name="Sahil", kind=ActorKind.HUMAN)
    svc.milestone_create("dy1", "m1", due="2026-12-01", actor=h)
    svc.milestone_create("dy1", "m2", due="2026-12-02", actor=h)
    # Attach via the API: the app-level service validates against the
    # canonical projection where the API-created items live.
    for ref, ms in ((i1_ref, "m1"), (i2_ref, "m2")):
        r = c.post(f"/stewardship/v1/projects/dy1/milestones/{ms}/attach",
                   json={"ref": ref, "actor_id": "sahil",
                         "actor_kind": "human"})
        assert r.status_code == 200, (ref, r.json())

    r = c.put("/stewardship/v1/projects/dy1/views", json={
        "name": "m1-only", "layout": "table",
        "filters": {"milestone": "m1"},
        "actor_id": "sahil"})
    assert r.status_code == 200
    r = c.get("/stewardship/v1/projects/dy1/views/m1-only/items?actor_id=sahil")
    assert r.status_code == 200
    refs = {i["ref"] for i in r.json()["items"]}
    assert i1_ref in refs and i2_ref not in refs


def test_role_aware_sharing_named_users(env):
    c, store = env
    from hermes_project_stewardship.persistence.dockyard_service import (
        DockyardService)
    from hermes_project_stewardship.dockyard import ActorKind

    # Owner saves a PRIVATE view shared with qa-bot only.
    svc = DockyardService(store)
    h = Actor(id="sahil", display_name="Sahil", kind=ActorKind.HUMAN)
    svc.view_save("dy1", "secret-triboard", "board",
                  filters={"shared_with": ["qa-bot"]}, actor=h, shared=False)

    other = Actor(id="qa-bot", display_name="r", kind=ActorKind.BOT)
    mine = svc.views_list("dy1", actor=h)
    theirs = svc.views_list("dy1", actor=other)
    stranger = Actor(id="who", display_name="w", kind=ActorKind.BOT)
    invis = svc.views_list("dy1", actor=stranger)
    assert "secret-triboard" in {v["name"] for v in mine}
    assert "secret-triboard" in {v["name"] for v in theirs}  # named in shared_with
    assert "secret-triboard" not in {v["name"] for v in invis}


def test_view_run_unknown_view_404(env):
    c, _ = env
    r = c.get("/stewardship/v1/projects/dy1/views/ghost/items?actor_id=sahil")
    assert r.status_code == 404