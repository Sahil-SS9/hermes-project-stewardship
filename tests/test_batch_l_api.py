"""Batch L API: the delivery-ladder routes, and 410 Gone on the retired 0.4.0
link endpoints.

Replaces the R2 link-endpoint API tests (see L0-INVENTORY.md §4). Assertion
counts are recorded against the tests they replace so the gate can prove
nothing was weakened.
"""
from __future__ import annotations

import pytest

pytest.importorskip("fastapi")
from fastapi.testclient import TestClient  # noqa: E402

from hermes_project_stewardship.api.server import create_app  # noqa: E402
from hermes_project_stewardship.kanban import ReferenceKanbanAdapter  # noqa: E402
from .r2_helpers import World  # noqa: E402

V1 = "/stewardship/v1"
BEARER = {"Authorization": "Bearer t0k"}

# Each retired 0.4.0 endpoint and the ladder route that replaced it.
RETIRED = [
    ("post", "/projects/alpha/initiatives/INI-1/milestones",
     "PUT /projects/{project_id}/milestones/{milestone_id}/initiative"),
    ("delete", "/projects/alpha/initiatives/INI-1/milestones/1",
     "PUT /projects/{project_id}/milestones/{milestone_id}/initiative"),
    ("post", "/projects/alpha/objectives/1/initiatives",
     "PUT /projects/{project_id}/objectives/{objective_id}/milestone"),
    ("delete", "/projects/alpha/objectives/1/initiatives/INI-1",
     "PUT /projects/{project_id}/objectives/{objective_id}/milestone"),
]


@pytest.fixture()
def env(store, clock):
    adapter = ReferenceKanbanAdapter(store)
    world = World(store, clock, adapter=adapter)
    world.project("alpha")
    world.project("beta")
    client = TestClient(create_app(
        store, kanban_adapter=adapter, auth_token="t0k", auth_principal="sahil",
        auth_principal_is_human=True), headers=BEARER)
    yield client, world, store


def _seed(world, *, initiative_status=None):
    return (world.initiative("alpha", "Ship", status=initiative_status),
            world.milestone("alpha", "Pilot"),
            world.objective("alpha", "Completion"),
            world.goal("alpha", "Goal one"))


# ---- retired 0.4.0 link endpoints: 410 Gone ---------------------------------- //

@pytest.mark.parametrize("method,path,replacement", RETIRED)
def test_retired_link_endpoints_answer_410_and_name_the_replacement(
        env, method, path, replacement):
    """A 0.4.0 client must be told the endpoint is gone AND where it went."""
    c, _, _ = env
    r = _call(c, method, path)
    assert r.status_code == 410
    assert "0.5.0" in r.json()["error"]["message"]
    assert replacement in r.json()["error"]["message"]


def _call(client, method, path):
    """Call the path the way the 0.4.0 client would.

    The retired POSTs took a JSON body; the retired DELETEs took none. Both must
    reach the 410 rather than a transport error, so each is sent its own shape.
    """
    if method == "delete":
        return client.delete(f"{V1}{path}")
    return client.post(f"{V1}{path}", json={"milestone_id": 1, "relationship": "delivers"})


@pytest.mark.parametrize("method,path,replacement", RETIRED)
def test_retired_endpoints_do_not_validate_the_old_body_first(env, method, path, replacement):
    """The old payload shape must not produce a confusing 422."""
    c, _, _ = env
    assert _call(c, method, path).status_code == 410


def test_a_retired_endpoint_writes_nothing(env, store):
    """410 is an answer, not a write: the old link tables stay empty."""
    c, _, _ = env
    c.post(f"{V1}/projects/alpha/initiatives/INI-1/milestones",
           json={"milestone_id": 1})
    for table in ("initiative_milestones", "project_objective_deliveries",
                  "project_objective_goals"):
        assert store._conn.execute(f"SELECT COUNT(*) FROM {table}").fetchone()[0] == 0


# ---- the ladder read routes --------------------------------------------------- //

def test_roadmap_lists_every_enabled_project_and_filters(env):
    c, _, _ = env
    assert [p["id"] for p in c.get(f"{V1}/roadmap").json()["projects"]] == ["alpha", "beta"]
    one = c.get(f"{V1}/roadmap", params={"project_id": "beta"}).json()["projects"]
    assert [p["id"] for p in one] == ["beta"]
    assert c.get(f"{V1}/roadmap", params={"project_id": "ghost"}).status_code == 404


def test_the_outline_reports_the_ladder_and_not_placed_groups(env):
    c, world, _ = env
    ini, mid, oid, gid = _seed(world)
    project = c.get(f"{V1}/roadmap", params={"project_id": "alpha"}).json()["projects"][0]
    assert [i["ref"] for i in project["initiatives"]] == [ini]
    assert [g["id"] for g in project["not_placed"]["goals"]] == [gid]
    assert [o["id"] for o in project["not_placed"]["objectives"]] == [oid]
    assert [m["id"] for m in project["not_placed"]["milestones"]] == [mid]


def test_milestone_items_route(env):
    c, world, _ = env
    ini, mid, oid, gid = _seed(world)
    world.place_milestone("alpha", mid, ini)
    world.place_objective("alpha", oid, mid)
    world.place_goal("alpha", gid, oid)
    task = world.item("alpha", "Work")
    world.place_task("alpha", task, gid)
    body = c.get(f"{V1}/roadmap/projects/alpha/milestones/{mid}/items").json()
    assert [i["ref"] for i in body["items"]] == [task]
    assert c.get(f"{V1}/roadmap/projects/alpha/milestones/9999/items").status_code == 404
    assert c.get(f"{V1}/roadmap/projects/beta/milestones/{mid}/items").status_code == 404


# ---- the ladder write routes -------------------------------------------------- //

def test_place_a_goal_under_an_objective(env):
    c, world, _ = env
    _, _, oid, gid = _seed(world)
    r = c.put(f"{V1}/projects/alpha/goals/{gid}/objective", json={"parent_id": oid})
    assert r.status_code == 200
    assert r.json()["parent_id"] == oid
    project = c.get(f"{V1}/roadmap", params={"project_id": "alpha"}).json()["projects"][0]
    assert project["not_placed"]["goals"] == []


def test_place_a_task_under_a_goal(env):
    c, world, _ = env
    gid = _seed(world)[3]
    task = world.item("alpha", "Work")
    r = c.put(f"{V1}/projects/alpha/tasks/{task}/goal", json={"parent_id": gid})
    assert r.status_code == 200
    assert r.json()["item_id"] == task


def test_place_an_objective_under_a_milestone(env):
    c, world, _ = env
    ini, mid, oid, gid = _seed(world)
    r = c.put(f"{V1}/projects/alpha/objectives/{oid}/milestone", json={"parent_id": mid})
    assert r.status_code == 200
    assert r.json()["parent_id"] == mid


def test_place_a_milestone_under_an_initiative(env):
    c, world, _ = env
    ini, mid, oid, gid = _seed(world)
    r = c.put(f"{V1}/projects/alpha/milestones/{mid}/initiative",
              json={"parent_id": ini})
    assert r.status_code == 200
    assert r.json()["parent_id"] == ini


def test_a_null_parent_unplaces_the_item(env, store):
    c, world, _ = env
    _, _, oid, gid = _seed(world)
    c.put(f"{V1}/projects/alpha/goals/{gid}/objective", json={"parent_id": oid})
    r = c.put(f"{V1}/projects/alpha/goals/{gid}/objective", json={"parent_id": None})
    assert r.status_code == 200
    assert r.json()["parent_id"] is None
    assert store._conn.execute(
        "SELECT objective_id FROM project_goals WHERE goal_id=?", (gid,)
    ).fetchone()[0] is None


def test_a_cross_project_placement_is_refused(env):
    c, world, _ = env
    _, _, _, gid = _seed(world)
    foreign = world.objective("beta", "Beta obj")
    r = c.put(f"{V1}/projects/alpha/goals/{gid}/objective", json={"parent_id": foreign})
    assert r.status_code == 409


def test_an_unknown_parent_is_not_found(env):
    c, world, _ = env
    gid = _seed(world)[3]
    assert c.put(f"{V1}/projects/alpha/goals/{gid}/objective",
                 json={"parent_id": 999999}).status_code == 404


def test_a_placement_write_is_audited_with_actor_and_both_ends(env, store):
    c, world, _ = env
    _, _, oid, gid = _seed(world)
    c.put(f"{V1}/projects/alpha/goals/{gid}/objective", json={"parent_id": oid})
    rows = [r for r in store.audit_tail(200) if r["action"] == "roadmap.parent.set"]
    assert len(rows) == 1
    detail = rows[0]["detail"]
    assert detail["item_id"] == gid
    assert detail["parent_id"] == oid
    assert rows[0]["actor"] == "sahil"


def test_a_payload_cannot_name_its_own_actor(env):
    c, world, _ = env
    _, _, oid, gid = _seed(world)
    r = c.put(f"{V1}/projects/alpha/goals/{gid}/objective",
              json={"parent_id": oid, "actor": "someone-else"})
    assert r.status_code == 422


def test_a_write_without_the_capability_is_refused(store, clock):
    adapter = ReferenceKanbanAdapter(store)
    world = World(store, clock, adapter=adapter)
    world.project("alpha")
    oid = world.objective("alpha", "Obj")
    gid = world.goal("alpha", "Goal")
    # A verified human with no capabilities gets 403, never a write.
    client = TestClient(create_app(
        store, kanban_adapter=adapter, auth_token="t0k", auth_principal="guest",
        auth_principal_is_human=True, capabilities=[]), headers=BEARER)
    assert client.put(f"{V1}/projects/alpha/goals/{gid}/objective",
                      json={"parent_id": oid}).status_code == 403


def test_the_outline_reports_can_write(env):
    c, _, _ = env
    assert c.get(f"{V1}/roadmap").json()["can_write"] is True


# ---- needs-placing routes ----------------------------------------------------- //

def test_unplaced_route_lists_the_queue(env, store):
    c, world, _ = env
    world.project("alpha")
    store._conn.execute(
        "INSERT INTO roadmap_unplaced(project_id,kind,item_id,reason,old_links_json,created_at)"
        " VALUES('alpha','goal','G-x','goal had multiple objectives','[1,2]','2026-01-01')")
    store._conn.commit()
    rows = c.get(f"{V1}/projects/alpha/roadmap/unplaced").json()["unplaced"]
    assert len(rows) == 1
    assert rows[0]["old_links"] == [1, 2]


def test_dismiss_route_resolves_a_queue_row(env, store):
    c, world, _ = env
    world.project("alpha")
    cur = store._conn.execute(
        "INSERT INTO roadmap_unplaced(project_id,kind,item_id,reason,old_links_json,created_at)"
        " VALUES('alpha','task','t-1','did not map','[]','2026-01-01')")
    store._conn.commit()
    row_id = cur.lastrowid
    r = c.post(f"{V1}/projects/alpha/roadmap/unplaced/{row_id}/dismiss", json={})
    assert r.status_code == 200
    assert c.get(f"{V1}/projects/alpha/roadmap/unplaced").json()["unplaced"] == []


# ---- goal checks and confirmation -------------------------------------------- //

def test_goal_check_route_roundtrip(env):
    c, world, _ = env
    gid = _seed(world)[3]
    r = c.put(f"{V1}/projects/alpha/goals/{gid}/check",
              json={"evaluator_type": "manual", "target": ">=1"})
    assert r.status_code == 200
    assert r.json()["check"]["evaluator_type"] == "manual"
    assert c.get(f"{V1}/projects/alpha/goals/{gid}/check").json()["check"]["target"] == ">=1"


def test_assessment_route_binds_the_verified_principal(env, store):
    """The body cannot name its own actor: the server supplies the principal."""
    c, world, _ = env
    gid = _seed(world)[3]
    c.put(f"{V1}/projects/alpha/goals/{gid}/check",
          json={"evaluator_type": "manual", "target": ">=1"})
    r = c.post(f"{V1}/projects/alpha/goals/{gid}/assessment",
               json={"passed": True, "evidence": ["ticket:1"]})
    assert r.status_code == 200
    assert r.json()["evidence"]["state"] == "passed"


def test_confirm_route_refuses_until_every_milestone_is_reached(env):
    c, world, _ = env
    ini, mid, oid, gid = _seed(world)
    world.place_milestone("alpha", mid, ini)
    r = c.post(f"{V1}/projects/alpha/initiatives/{ini}/confirm-delivered", json={})
    assert r.status_code == 409


def test_confirm_route_completes_a_fully_reached_initiative(env, store):
    c, world, _ = env
    # The objective is assessed as passed up front, so the chain can actually
    # reach the milestone: an unassessed manual objective is honestly unknown.
    # Only an executing initiative can be confirmed, so seed it as executing.
    ini, mid, oid, gid = _seed(world, initiative_status="executing")
    world.place_milestone("alpha", mid, ini)
    world.place_objective("alpha", oid, mid)
    world.place_goal("alpha", gid, oid)
    world.place_task("alpha", world.item("alpha", "Work", status="done"), gid)
    from hermes_project_stewardship.persistence.service import StewardshipService
    StewardshipService(store).record_assessment(
        "alpha", oid, passed=True, evidence=["ticket:1"], actor="sahil",
        interface="dockyard:human", trusted_principal="sahil")
    r = c.post(f"{V1}/projects/alpha/initiatives/{ini}/confirm-delivered", json={})
    assert r.status_code == 200
    assert r.json()["status"] == "completed"


# ---- an unlinked project never 5xx ------------------------------------------- //

def test_every_new_route_answers_an_unlinked_project_without_a_server_error(store, clock):
    from hermes_project_stewardship.kanban.host_adapter import UnavailableKanbanAdapter

    adapter = ReferenceKanbanAdapter(store)
    world = World(store, clock, adapter=adapter)
    world.project("alpha")
    client = TestClient(create_app(
        store, kanban_adapter=UnavailableKanbanAdapter(Exception("no host")),
        auth_token="t0k", auth_principal="sahil",
        auth_principal_is_human=True), headers=BEARER)
    for path in (f"{V1}/roadmap", f"{V1}/projects/alpha/roadmap/unplaced",
                 f"{V1}/projects/alpha/goals/X/check"):
        assert client.get(path).status_code < 500
