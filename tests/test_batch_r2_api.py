"""Batch L API: the delivery-ladder routes on the backend app and through the
plugin proxy, plus 410 Gone on the retired 0.4.0 link endpoints.

This file replaces the R2 link-endpoint tests (L0-INVENTORY.md §4). The
coverage is preserved and extended, not dropped:

  test_link_and_unlink_milestone_roundtrip_and_status_codes
      -> test_place_and_unplace_a_milestone_roundtrip_and_status_codes
  test_milestone_link_refusals
      -> test_placement_refusals_cross_project_unknown_and_archived
  test_objective_link_roundtrip_and_refusals
      -> test_place_and_unplace_an_objective_roundtrip_and_status_codes
  test_feature_off_refuses_link_routes_with_the_existing_error
      -> test_feature_off_refuses_placement_routes_with_the_existing_error
  test_a_payload_actor_is_never_accepted_or_trusted
      -> same name, ladder route
  test_writes_are_refused_like_the_goal_routes
      -> same name, ladder routes replace the link routes
  test_reads_do_not_need_a_capability / test_outline_can_write_matches_the_write_check
      -> same names; can_write now reflects a ladder write
  test_goal_contract_get_put_and_refusals -> same name, unchanged behaviour
  test_every_new_route_works_through_the_proxy
      -> test_every_ladder_route_works_through_the_proxy
  test_proxy_forwards_refusals_unchanged_and_blocks_cross_project
      -> same name, ladder routes
  test_proxy_never_lets_the_caller_name_the_actor -> same name, ladder route
  test_roadmap_lists_every_enabled_project_and_filters / test_milestone_items_route
      -> kept, unchanged
  NEW: the four retired endpoints answer 410 and name the replacement.
"""
from __future__ import annotations

import importlib.util
from pathlib import Path

import pytest

pytest.importorskip("fastapi")
from fastapi import FastAPI  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from hermes_project_stewardship.api.server import create_app  # noqa: E402
from hermes_project_stewardship.kanban import ReferenceKanbanAdapter  # noqa: E402
from .r2_helpers import HUMAN, World  # noqa: E402

V1 = "/stewardship/v1"
BEARER = {"Authorization": "Bearer t0k"}
SESSION = {"x-hermes-session-token": "synthetic-desktop-token"}

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


def _app(store, adapter, *, human=True, token="t0k", principal="sahil", capabilities=None):
    return create_app(
        store, kanban_adapter=adapter, auth_token=token, auth_principal=principal,
        auth_principal_is_human=human, capabilities=capabilities)


@pytest.fixture()
def env(store, clock):
    adapter = ReferenceKanbanAdapter(store)
    world = World(store, clock, adapter=adapter)
    world.project("alpha")
    world.project("beta")
    client = TestClient(_app(store, adapter), headers=BEARER)
    yield client, world, store


def _audit(store, action):
    return [r for r in store.audit_tail(200) if r["action"] == action]


def _seed(world, *, initiative_status=None):
    return (world.initiative("alpha", "Ship", status=initiative_status),
            world.milestone("alpha", "Pilot"),
            world.objective("alpha", "Completion"),
            world.goal("alpha", "Goal one"))


def _call(client, method, path):
    """Call the way the 0.4.0 client would.

    The retired POSTs took a JSON body; the retired DELETEs took none (and
    TestClient.delete accepts no json kwarg), so each is sent its own shape and
    both must reach the 410 rather than a transport error.
    """
    if method == "delete":
        return client.delete(f"{V1}{path}")
    return client.post(f"{V1}{path}", json={"milestone_id": 1, "relationship": "delivers"})


# ---- read routes ---------------------------------------------------------------

def test_roadmap_lists_every_enabled_project_and_filters(env):
    c, _, _ = env
    both = c.get(f"{V1}/roadmap")
    assert both.status_code == 200
    assert [p["id"] for p in both.json()["projects"]] == ["alpha", "beta"]
    one = c.get(f"{V1}/roadmap", params={"project_id": "beta"})
    assert [p["id"] for p in one.json()["projects"]] == ["beta"]
    missing = c.get(f"{V1}/roadmap", params={"project_id": "ghost"})
    assert missing.status_code == 404 and missing.json()["error"]["code"]


def test_roadmap_reflects_placements_made_through_the_api(env):
    """Was test_roadmap_reflects_links_made_through_the_api: the outline follows
    the placements the API makes, and a milestone's items are its chain's tasks."""
    c, world, _ = env
    ini, mid, oid, _gid = _seed(world)
    assert c.put(f"{V1}/projects/alpha/milestones/{mid}/initiative",
                 json={"parent_id": ini}).status_code == 200
    assert c.put(f"{V1}/projects/alpha/objectives/{oid}/milestone",
                 json={"parent_id": mid}).status_code == 200
    row = c.get(f"{V1}/roadmap", params={"project_id": "alpha"}).json()["projects"][0]
    assert [m["id"] for m in row["initiatives"][0]["milestones"]] == [mid]
    assert [o["id"] for o in row["initiatives"][0]["milestones"][0]["objectives"]] == [oid]


def test_milestone_items_route(env):
    c, world, _ = env
    ini, mid, oid, gid = _seed(world)
    world.place_milestone("alpha", mid, ini)
    world.place_objective("alpha", oid, mid)
    world.place_goal("alpha", gid, oid)
    task = world.item("alpha", "pilot task", status="in_progress")
    c.put(f"{V1}/projects/alpha/tasks/{task}/goal", json={"parent_id": gid})
    ok = c.get(f"{V1}/roadmap/projects/alpha/milestones/{mid}/items")
    assert ok.status_code == 200
    body = ok.json()
    assert body["state"] == "ok" and body["milestone"]["id"] == mid
    assert [i["bucket"] for i in body["items"]] == ["building"]
    assert c.get(f"{V1}/roadmap/projects/alpha/milestones/9999/items").status_code == 404
    assert c.get(f"{V1}/roadmap/projects/beta/milestones/{mid}/items").status_code == 404
    world.svc.update_features("alpha", {"milestones": False}, actor="o", interface="t")
    off = c.get(f"{V1}/roadmap/projects/alpha/milestones/{mid}/items")
    assert off.status_code == 409 and off.json()["error"]["code"] == "feature_disabled"


def test_milestone_list_and_read_carry_the_id(env):
    c, world, _ = env
    mid = world.milestone("alpha", "Pilot")
    listed = c.get(f"{V1}/projects/alpha/milestones").json()
    rows = listed["milestones"] if "milestones" in listed else listed
    assert [m["id"] for m in rows] == [mid]
    detail = c.get(f"{V1}/projects/alpha/milestones/Pilot")
    assert detail.status_code == 200 and detail.json()["id"] == mid


# ---- retired 0.4.0 link endpoints: 410 Gone ---------------------------------- //

@pytest.mark.parametrize("method,path,replacement", RETIRED)
def test_retired_link_endpoints_answer_410_and_name_the_replacement(
        env, method, path, replacement):
    """A 0.4.0 client must be told the endpoint is gone AND where it went."""
    c, _, _ = env
    r = _call(c, method, path)
    assert r.status_code == 410
    message = r.json()["error"]["message"]
    assert "0.5.0" in message and replacement in message


@pytest.mark.parametrize("method,path,replacement", RETIRED)
def test_retired_endpoints_do_not_validate_the_old_body_first(env, method, path, replacement):
    """The old payload shape must not produce a confusing 422."""
    c, _, _ = env
    assert _call(c, method, path).status_code == 410


def test_a_retired_endpoint_writes_nothing(env, store):
    """410 is an answer, not a write: the old link tables stay empty."""
    c, _, _ = env
    c.post(f"{V1}/projects/alpha/initiatives/INI-1/milestones", json={"milestone_id": 1})
    for table in ("initiative_milestones", "project_objective_deliveries",
                  "project_objective_goals"):
        assert store._conn.execute(f"SELECT COUNT(*) FROM {table}").fetchone()[0] == 0


# ---- placement writes --------------------------------------------------------- //

def test_place_and_unplace_a_milestone_roundtrip_and_status_codes(env):
    """Was test_link_and_unlink_milestone_roundtrip_and_status_codes."""
    c, world, store = env
    ini, mid, _oid, _gid = _seed(world)
    url = f"{V1}/projects/alpha/milestones/{mid}/initiative"
    placed = c.put(url, json={"parent_id": ini})
    assert placed.status_code == 200
    assert placed.json()["parent_id"] == ini
    assert _audit(store, "roadmap.parent.set")
    assert c.put(url, json={"parent_id": 9999}).status_code == 404
    # Unplacing leaves the milestone "Not placed yet", and is not an error.
    gone = c.put(url, json={"parent_id": None})
    assert gone.status_code == 200 and gone.json()["parent_id"] is None
    row = c.get(f"{V1}/roadmap", params={"project_id": "alpha"}).json()["projects"][0]
    assert [m["id"] for m in row["not_placed"]["milestones"]] == [mid]
    # A closed initiative is refused as a parent (choose an active one).
    dead = world.initiative("alpha", "Dead", status="rejected")
    assert c.put(url, json={"parent_id": dead}).status_code == 409
    # Re-placing under the live initiative works and is audited under the caller.
    assert c.put(url, json={"parent_id": ini}).json()["parent_id"] == ini
    placed_rows = _audit(store, "roadmap.parent.set")
    assert placed_rows and placed_rows[0]["actor"] == "sahil"


def test_place_and_unplace_an_objective_roundtrip_and_status_codes(env):
    """Was test_objective_link_roundtrip_and_refusals."""
    c, world, store = env
    _ini, mid, oid, _gid = _seed(world)
    url = f"{V1}/projects/alpha/objectives/{oid}/milestone"
    assert c.put(url, json={"parent_id": mid}).json()["parent_id"] == mid
    assert c.put(url, json={"parent_id": 9999}).status_code == 404
    assert c.delete(url).status_code == 405      # unplacing is a PUT with null
    assert c.put(url, json={"parent_id": None}).json()["parent_id"] is None
    # A cross-project milestone parent is refused; an unknown objective is 404.
    beta_ms = world.milestone("beta", "Elsewhere")
    assert c.put(url, json={"parent_id": beta_ms}).status_code in (404, 409)
    assert c.put(f"{V1}/projects/alpha/objectives/9999/milestone",
                 json={"parent_id": mid}).status_code == 404
    # After the roundtrip the stored parent is null and one audit trail exists.
    assert store._conn.execute(
        "SELECT milestone_id FROM project_objectives WHERE id=?", (oid,)
    ).fetchone()[0] is None
    assert store.audit_tail(200)


def test_placement_refusals_cross_project_unknown_and_archived(env):
    """Was test_milestone_link_refusals."""
    c, world, store = env
    ini, _mid, _oid, _gid = _seed(world)
    beta_ini = world.initiative("beta", "Theirs")
    cross = c.put(f"{V1}/projects/alpha/milestones/1/initiative", json={"parent_id": beta_ini})
    assert cross.status_code in (404, 409)
    assert c.put(f"{V1}/projects/alpha/milestones/1/initiative",
                 json={"parent_id": "INIT-NOPE-0001"}).status_code == 404
    assert c.put(f"{V1}/projects/ghost/milestones/1/initiative",
                 json={"parent_id": ini}).status_code == 404
    # An archived parent is refused, exactly as the 0.4.0 archived-milestone rule.
    mid = world.milestone("alpha", "Old")
    world.dy.milestone_archive("alpha", "Old", actor=HUMAN)
    oid = world.objective("alpha", "Second")
    assert c.put(f"{V1}/projects/alpha/objectives/{oid}/milestone",
                 json={"parent_id": mid}).status_code == 409
    assert store._conn.execute(
        "SELECT milestone_id FROM project_objectives WHERE id=?", (oid,)
    ).fetchone()[0] is None


def test_feature_off_refuses_placement_routes_with_the_existing_error(env):
    """Was test_feature_off_refuses_link_routes_with_the_existing_error."""
    c, world, store = env
    ini, mid, oid, _gid = _seed(world)
    world.svc.update_features("alpha", {"milestones": False}, actor="o", interface="t")
    r = c.put(f"{V1}/projects/alpha/milestones/{mid}/initiative", json={"parent_id": ini})
    assert r.status_code == 409 and r.json()["error"]["code"] == "feature_disabled"
    assert r.json()["error"]["fields"] == {"project_id": "alpha", "feature": "milestones"}
    # Placing an objective touches milestones only, so it is refused too; the
    # goal placement below touches neither and still succeeds.
    assert c.put(f"{V1}/projects/alpha/objectives/{oid}/milestone",
                 json={"parent_id": mid}).status_code == 409
    gid = world.goal("alpha", "Another")
    assert c.put(f"{V1}/projects/alpha/goals/{gid}/objective",
                 json={"parent_id": oid}).status_code == 200
    # Turning initiatives off refuses the goal placement too (it touches
    # initiatives), and the milestone route is still refused.
    world.svc.update_features("alpha", {"initiatives": False}, actor="o", interface="t")
    assert c.put(f"{V1}/projects/alpha/goals/{gid}/objective",
                 json={"parent_id": None}).json()["error"]["fields"]["feature"] == "initiatives"
    # Nothing was placed while a feature was off.
    assert store._conn.execute(
        "SELECT initiative_ref FROM dockyard_milestones WHERE id=?", (mid,)
    ).fetchone()[0] is None


def test_a_payload_actor_is_never_accepted_or_trusted(env):
    c, world, store = env
    ini, mid, _oid, _gid = _seed(world)
    r = c.put(f"{V1}/projects/alpha/milestones/{mid}/initiative",
              json={"parent_id": ini, "actor": "evil", "created_by": "evil"})
    assert r.status_code == 422                       # unknown fields are refused outright
    assert store._conn.execute(
        "SELECT initiative_ref FROM dockyard_milestones WHERE id=?", (mid,)
    ).fetchone()[0] is None


# ---- authority: refused exactly the way the goal routes refuse -------------------------

WRITES = [
    ("put", "/projects/alpha/milestones/{mid}/initiative", {"parent_id": "{ini}"}),
    ("put", "/projects/alpha/objectives/{oid}/milestone", {"parent_id": "{mid}"}),
    ("put", "/projects/alpha/goals/{gid}/objective", {"parent_id": "{oid}"}),
    ("post", "/projects/alpha/initiatives/{ini}/confirm-delivered", {}),
    ("put", "/projects/alpha/goals/{gid}/contract", {"verification": "x"}),
]


def _fill(value, ids):
    if isinstance(value, str):
        return value.format(**ids)
    if isinstance(value, dict):
        return {k: (ids[v[1:-1]] if isinstance(v, str) and v.startswith("{") else v)
                for k, v in value.items()}
    return value


@pytest.mark.parametrize("kind", ["non_human", "no_capability", "unauthenticated"])
def test_writes_are_refused_like_the_goal_routes(store, clock, kind):
    adapter = ReferenceKanbanAdapter(store)
    world = World(store, clock, adapter=adapter)
    world.project("alpha")
    ini, mid, oid, gid = _seed(world)
    ids = {"ini": ini, "mid": mid, "oid": oid, "gid": gid}
    options = {
        "non_human": dict(human=False),
        "no_capability": dict(human=True, capabilities=[]),
        "unauthenticated": dict(human=True),
    }[kind]
    client = TestClient(_app(store, adapter, **options))
    headers = {} if kind == "unauthenticated" else BEARER
    reference = client.post(f"{V1}/projects/alpha/goals/{gid}/archive", headers=headers)
    assert reference.status_code in (401, 403, 503)
    for method, path, body in WRITES:
        r = getattr(client, method)(f"{V1}{_fill(path, ids)}", headers=headers,
                                    json=_fill(body, ids))
        assert r.status_code == reference.status_code, (kind, method, path, r.text)
    assert store._conn.execute(
        "SELECT initiative_ref FROM dockyard_milestones WHERE id=?", (mid,)
    ).fetchone()[0] is None
    assert store._conn.execute(
        "SELECT verification FROM project_goal_contracts WHERE goal_id=?", (gid,)
    ).fetchone()[0] == ""
    # Not one of the refused writes left a placement behind, at any level.
    assert store._conn.execute(
        "SELECT milestone_id FROM project_objectives WHERE id=?", (oid,)
    ).fetchone()[0] is None
    assert store._conn.execute(
        "SELECT objective_id FROM project_goals WHERE goal_id=?", (gid,)
    ).fetchone()[0] is None
    assert store._conn.execute("SELECT COUNT(*) FROM goal_tasks").fetchone()[0] == 0


def test_reads_do_not_need_a_capability(store, clock):
    adapter = ReferenceKanbanAdapter(store)
    world = World(store, clock, adapter=adapter)
    world.project("alpha")
    _ini, mid, _oid, gid = _seed(world)
    client = TestClient(_app(store, adapter, human=False), headers=BEARER)
    assert client.get(f"{V1}/roadmap").status_code == 200
    assert client.get(f"{V1}/projects/alpha/goals/{gid}/contract").status_code == 200
    assert client.get(f"{V1}/roadmap/projects/alpha/milestones/{mid}/items").status_code == 200


@pytest.mark.parametrize("kind,expected", [
    ("human_owner", True), ("non_human", False), ("no_capability", False),
])
def test_outline_can_write_matches_the_write_check(store, clock, kind, expected):
    """can_write is the Desktop's cue to show a placement action; it must agree
    with the real write check, so a hidden action is never one the server would
    allow and a shown action is never one it would refuse."""
    adapter = ReferenceKanbanAdapter(store)
    world = World(store, clock, adapter=adapter)
    world.project("alpha")
    ini, mid, _oid, _gid = _seed(world)
    options = {"human_owner": {}, "non_human": dict(human=False),
               "no_capability": dict(capabilities=[])}[kind]
    client = TestClient(_app(store, adapter, **options), headers=BEARER)
    outline = client.get(f"{V1}/roadmap", params={"project_id": "alpha"})
    assert outline.status_code == 200 and outline.json()["can_write"] is expected
    write = client.put(f"{V1}/projects/alpha/milestones/{mid}/initiative",
                       json={"parent_id": ini})
    assert (write.status_code == 200) is expected, write.text
    assert outline.json()["projects"][0]["id"] == "alpha"  # the read itself is unchanged


# ---- goal contract ------------------------------------------------------------------------ //

def test_goal_contract_get_put_and_refusals(env):
    c, world, store = env
    _ini, _mid, _oid, gid = _seed(world)
    url = f"{V1}/projects/alpha/goals/{gid}/contract"
    got = c.get(url).json()
    assert got["goal_id"] == gid and got["outcome"] == "Goal one" and got["status"] == "active"
    put = c.put(url, json={"verification": "suite green", "max_turns": 9,
                           "status": "paused", "paused_reason": "waiting"})
    assert put.status_code == 200 and put.json()["max_turns"] == 9
    assert put.json()["paused_reason"] == "waiting"
    rows = _audit(store, "goal.contract.updated")
    assert len(rows) == 1 and rows[0]["actor"] == "sahil"
    for bad in ({}, {"status": "bogus"}, {"max_turns": 0}, {"max_turns": "7"}, {"outcome": " "}):
        assert c.put(url, json=bad).status_code == 409, bad
    assert c.put(url, json={"nope": 1}).status_code == 422
    assert c.get(f"{V1}/projects/beta/goals/{gid}/contract").status_code == 404
    assert c.get(f"{V1}/projects/alpha/goals/GOAL-NOPE/contract").status_code == 404
    assert len(_audit(store, "goal.contract.updated")) == 1          # refusals wrote nothing


# ---- the same routes, through the dashboard proxy ------------------------------------------

@pytest.fixture()
def proxy(tmp_path, monkeypatch):
    monkeypatch.setenv("HERMES_HOME", str(tmp_path))
    monkeypatch.setenv("HERMES_KANBAN_HOME", str(tmp_path))
    monkeypatch.setenv("STEWARD_DB_PATH", str(tmp_path / "db.sqlite"))
    monkeypatch.setenv("DOCKYARD_ACTOR_ID", "trusted-desktop")
    monkeypatch.delenv("STEWARD_RPC_TOKEN", raising=False)
    monkeypatch.setenv("HERMES_DASHBOARD_SESSION_TOKEN", SESSION["x-hermes-session-token"])
    path = Path(__file__).parents[1] / "hermes_dockyard_plugin/dashboard/plugin_api.py"
    spec = importlib.util.spec_from_file_location("batch_l_isolated_proxy", path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    store = module._store
    adapter = ReferenceKanbanAdapter(store)
    from .conftest import FrozenClock
    world = World(store, FrozenClock(), adapter=adapter)
    world.project("alpha")
    world.project("beta")
    module._app = create_app(
        store, kanban_adapter=adapter, auth_token=SESSION["x-hermes-session-token"],
        auth_principal="owner", auth_principal_is_human=True)
    module._client = module.httpx.AsyncClient(
        transport=module.httpx.ASGITransport(app=module._app), base_url="http://dockyard.test")
    host = FastAPI()
    host.include_router(module.plugin_api, prefix="/api")
    yield TestClient(host, headers=SESSION), world, store
    store.close()


def test_every_ladder_route_works_through_the_proxy(proxy):
    """Was test_every_new_route_works_through_the_proxy."""
    c, world, store = proxy
    ini, mid, oid, gid = _seed(world)
    # The roadmap counts ladder-placed tasks only: a 0.4.0 milestone attach is
    # history and contributes nothing, which is the whole point of the change.
    # Wire the whole chain first, so the milestone's delivery has somewhere to
    # count from.
    assert c.put(f"/api/projects/alpha/objectives/{oid}/milestone",
                 json={"parent_id": mid}).status_code == 200
    assert c.put(f"/api/projects/alpha/goals/{gid}/objective",
                 json={"parent_id": oid}).status_code == 200
    world.item("alpha", "legacy attach", milestone="Pilot")
    task = world.item("alpha", "pilot task")
    world.place_task("alpha", task, gid)
    assert [p["id"] for p in c.get("/api/roadmap").json()["projects"]] == ["alpha", "beta"]
    assert c.get("/api/roadmap").json()["can_write"] is True  # human owner, every capability
    assert [p["id"] for p in c.get("/api/roadmap", params={"project_id": "alpha"}).json()["projects"]] == ["alpha"]
    assert c.get("/api/roadmap", params={"project_id": "ghost"}).status_code == 404

    placed = c.put(f"/api/projects/alpha/milestones/{mid}/initiative", json={"parent_id": ini})
    assert placed.status_code == 200
    assert c.put(f"/api/projects/alpha/milestones/{mid}/initiative",
                 json={"parent_id": 9999}).status_code == 404
    items = c.get(f"/api/roadmap/projects/alpha/milestones/{mid}/items")
    assert items.status_code == 200 and items.json()["delivery"]["total"] == 1

    contract = f"/api/projects/alpha/goals/{gid}/contract"
    assert c.get(contract).json()["goal_id"] == gid
    assert c.put(contract, json={"stop_when": "two failed turns"}).json()["stop_when"] == "two failed turns"

    assert c.put(f"/api/projects/alpha/goals/{gid}/objective",
                 json={"parent_id": None}).status_code == 200
    assert c.put(f"/api/projects/alpha/milestones/{mid}/initiative",
                 json={"parent_id": None}).status_code == 200
    # The unplaced list is reachable through the proxy and starts empty.
    unplaced = c.get(f"/api/projects/alpha/roadmap/unplaced")
    assert unplaced.status_code == 200 and unplaced.json()["unplaced"] == []
    # A goal check round-trips through the proxy, and the assessment binds the
    # server's principal (never a caller-supplied actor).
    assert c.put(f"/api/projects/alpha/goals/{gid}/check",
                 json={"evaluator_type": "manual", "target": ">=1"}).status_code == 200
    assessed = c.post(f"/api/projects/alpha/goals/{gid}/assessment",
                       json={"passed": True, "evidence": ["ticket:1"]})
    assert assessed.status_code == 200 and assessed.json()["evidence"]["state"] == "passed"


def test_proxy_forwards_refusals_unchanged_and_blocks_cross_project(proxy):
    c, world, store = proxy
    ini, mid, _oid, gid = _seed(world)
    beta_ini = world.initiative("beta", "Theirs")
    r = c.put(f"/api/projects/alpha/milestones/{mid}/initiative", json={"parent_id": beta_ini})
    assert r.status_code in (404, 409)
    assert c.put(f"/api/projects/alpha/goals/{gid}/contract", json={"status": "bogus"}).status_code in (409, 422)
    assert c.put(f"/api/projects/alpha/goals/{gid}/contract", json={"nope": 1}).status_code in (409, 422)
    world.svc.update_features("alpha", {"milestones": False}, actor="o", interface="t")
    off = c.put(f"/api/projects/alpha/milestones/{mid}/initiative", json={"parent_id": ini})
    assert off.status_code == 409
    # The cross-project / feature-off placements wrote nothing.
    assert store._conn.execute(
        "SELECT initiative_ref FROM dockyard_milestones WHERE id=?", (mid,)
    ).fetchone()[0] is None


def test_proxy_never_lets_the_caller_name_the_actor(proxy):
    c, world, store = proxy
    ini, mid, _oid, _gid = _seed(world)
    r = c.put(f"/api/projects/alpha/milestones/{mid}/initiative",
              json={"parent_id": ini, "created_by": "evil"})
    assert r.status_code in (409, 422)
    ok = c.put(f"/api/projects/alpha/milestones/{mid}/initiative", json={"parent_id": ini})
    assert ok.status_code == 200
    assert _audit(store, "roadmap.parent.set")[0]["actor"] == "owner"
