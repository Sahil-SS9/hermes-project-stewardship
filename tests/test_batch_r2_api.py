"""Batch R2 API: Roadmap routes on the backend app and through the plugin proxy."""
from __future__ import annotations

import importlib.util
from pathlib import Path

import pytest

pytest.importorskip("fastapi")
from fastapi import FastAPI  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from hermes_project_stewardship.api.server import create_app  # noqa: E402
from hermes_project_stewardship.kanban import ReferenceKanbanAdapter  # noqa: E402
from tests.r2_helpers import World  # noqa: E402

V1 = "/stewardship/v1"
BEARER = {"Authorization": "Bearer t0k"}
SESSION = {"x-hermes-session-token": "synthetic-desktop-token"}


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


def _seed(world):
    ini = world.initiative("alpha", "Ship")
    mid = world.milestone("alpha", "Pilot")
    oid = world.objective("alpha", "Completion")
    gid = world.goal("alpha", "Goal one", [oid])
    return ini, mid, oid, gid


# ---- read routes ---------------------------------------------------------------

def test_roadmap_lists_every_enabled_project_and_filters(env):
    c, world, _ = env
    both = c.get(f"{V1}/roadmap")
    assert both.status_code == 200
    assert [p["id"] for p in both.json()["projects"]] == ["alpha", "beta"]
    one = c.get(f"{V1}/roadmap", params={"project_id": "beta"})
    assert [p["id"] for p in one.json()["projects"]] == ["beta"]
    missing = c.get(f"{V1}/roadmap", params={"project_id": "ghost"})
    assert missing.status_code == 404 and missing.json()["error"]["code"]


def test_roadmap_reflects_links_made_through_the_api(env):
    c, world, _ = env
    ini, mid, oid, _gid = _seed(world)
    assert c.post(f"{V1}/projects/alpha/initiatives/{ini}/milestones",
                  json={"milestone_id": mid}).status_code == 200
    assert c.post(f"{V1}/projects/alpha/objectives/{oid}/initiatives",
                  json={"initiative_ref": ini, "relationship": "measures"}).status_code == 200
    row = c.get(f"{V1}/roadmap", params={"project_id": "alpha"}).json()["projects"][0]["initiatives"][0]
    assert [m["id"] for m in row["milestones"]] == [mid]
    assert row["objectives"][0]["id"] == oid and row["objectives"][0]["relationship"] == "measures"


def test_milestone_items_route(env):
    c, world, _ = env
    ini, mid, _oid, _gid = _seed(world)
    world.item("alpha", "pilot task", status="in_progress", milestone="Pilot")
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
    assert [m["id"] for m in listed["milestones"]] == [mid] if "milestones" in listed else \
        [m["id"] for m in listed] == [mid]
    detail = c.get(f"{V1}/projects/alpha/milestones/Pilot")
    assert detail.status_code == 200 and detail.json()["id"] == mid


# ---- link writes -----------------------------------------------------------------

def test_link_and_unlink_milestone_roundtrip_and_status_codes(env):
    c, world, store = env
    ini, mid, _oid, _gid = _seed(world)
    url = f"{V1}/projects/alpha/initiatives/{ini}/milestones"
    created = c.post(url, json={"milestone_id": mid, "relationship": "depends_on"})
    assert created.status_code == 200
    assert created.json()["created_by"] == "sahil"          # the trusted principal
    assert created.json()["relationship"] == "depends_on"
    assert c.post(url, json={"milestone_id": mid}).status_code == 409           # duplicate
    assert c.post(url, json={"milestone_id": 9999}).status_code == 404          # unknown
    gone = c.delete(f"{url}/{mid}")
    assert gone.status_code == 200 and gone.json()["milestone_id"] == mid
    assert c.delete(f"{url}/{mid}").status_code == 404                           # already gone
    actions = [r["action"] for r in store.audit_tail(10)]
    assert "roadmap.link.removed" in actions and "roadmap.link.created" in actions


def test_milestone_link_refusals(env):
    c, world, store = env
    ini, _mid, _oid, _gid = _seed(world)
    beta_ms = world.milestone("beta", "Elsewhere")
    cross = c.post(f"{V1}/projects/alpha/initiatives/{ini}/milestones", json={"milestone_id": beta_ms})
    assert cross.status_code == 409 and "cross-project" in cross.json()["error"]["message"]
    assert c.post(f"{V1}/projects/alpha/initiatives/INIT-NOPE-0001/milestones",
                  json={"milestone_id": beta_ms}).status_code == 404
    assert c.post(f"{V1}/projects/ghost/initiatives/{ini}/milestones",
                  json={"milestone_id": beta_ms}).status_code == 404
    bad = c.post(f"{V1}/projects/alpha/initiatives/{ini}/milestones",
                 json={"milestone_id": beta_ms, "relationship": "owns"})
    assert bad.status_code in (409, 422)
    assert _audit(store, "roadmap.link.created") == []


def test_objective_link_roundtrip_and_refusals(env):
    c, world, _ = env
    ini, _mid, oid, _gid = _seed(world)
    url = f"{V1}/projects/alpha/objectives/{oid}/initiatives"
    assert c.post(url, json={"initiative_ref": ini}).json()["relationship"] == "supports"
    assert c.post(url, json={"initiative_ref": ini}).status_code == 409
    assert c.post(url, json={"initiative_ref": "INIT-NOPE-0001"}).status_code == 404
    other = world.objective("beta", "Theirs")
    assert c.post(f"{V1}/projects/alpha/objectives/{other}/initiatives",
                  json={"initiative_ref": ini}).status_code == 409
    assert c.delete(f"{url}/{ini}").status_code == 200
    assert c.delete(f"{url}/{ini}").status_code == 404


def test_feature_off_refuses_link_routes_with_the_existing_error(env):
    c, world, store = env
    ini, mid, oid, _gid = _seed(world)
    world.svc.update_features("alpha", {"milestones": False}, actor="o", interface="t")
    r = c.post(f"{V1}/projects/alpha/initiatives/{ini}/milestones", json={"milestone_id": mid})
    assert r.status_code == 409 and r.json()["error"]["code"] == "feature_disabled"
    assert r.json()["error"]["fields"] == {"project_id": "alpha", "feature": "milestones"}
    assert c.post(f"{V1}/projects/alpha/objectives/{oid}/initiatives",
                  json={"initiative_ref": ini}).status_code == 200      # touches initiatives only
    world.svc.update_features("alpha", {"initiatives": False}, actor="o", interface="t")
    r = c.post(f"{V1}/projects/alpha/objectives/{oid}/initiatives", json={"initiative_ref": ini})
    assert r.status_code == 409 and r.json()["error"]["fields"]["feature"] == "initiatives"
    assert store._conn.execute("SELECT COUNT(*) FROM project_objective_deliveries").fetchone()[0] == 1


def test_a_payload_actor_is_never_accepted_or_trusted(env):
    c, world, store = env
    ini, mid, _oid, _gid = _seed(world)
    r = c.post(f"{V1}/projects/alpha/initiatives/{ini}/milestones",
               json={"milestone_id": mid, "created_by": "evil", "actor": "evil"})
    assert r.status_code == 422                       # unknown fields are refused outright
    assert store._conn.execute("SELECT COUNT(*) FROM initiative_milestones").fetchone()[0] == 0


# ---- authority: refused exactly the way the goal routes refuse -------------------------

WRITES = [
    ("post", "/projects/alpha/initiatives/{ini}/milestones", {"milestone_id": "{mid}"}),
    ("delete", "/projects/alpha/initiatives/{ini}/milestones/{mid}", None),
    ("post", "/projects/alpha/objectives/{oid}/initiatives", {"initiative_ref": "{ini}"}),
    ("delete", "/projects/alpha/objectives/{oid}/initiatives/{ini}", None),
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
                                    **({"json": _fill(body, ids)} if body is not None else {}))
        assert r.status_code == reference.status_code, (kind, method, path, r.text)
    assert store._conn.execute("SELECT COUNT(*) FROM initiative_milestones").fetchone()[0] == 0
    assert store._conn.execute("SELECT COUNT(*) FROM project_objective_deliveries").fetchone()[0] == 0
    assert store._conn.execute(
        "SELECT verification FROM project_goal_contracts WHERE goal_id=?", (gid,)).fetchone()[0] == ""


def test_reads_do_not_need_a_capability(store, clock):
    adapter = ReferenceKanbanAdapter(store)
    world = World(store, clock, adapter=adapter)
    world.project("alpha")
    _ini, mid, _oid, gid = _seed(world)
    client = TestClient(_app(store, adapter, human=False), headers=BEARER)
    assert client.get(f"{V1}/roadmap").status_code == 200
    assert client.get(f"{V1}/projects/alpha/goals/{gid}/contract").status_code == 200
    assert client.get(f"{V1}/roadmap/projects/alpha/milestones/{mid}/items").status_code == 200


# ---- goal contract ------------------------------------------------------------------------

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
    spec = importlib.util.spec_from_file_location("batch_r2_isolated_proxy", path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    store = module._store
    adapter = ReferenceKanbanAdapter(store)
    from tests.conftest import FrozenClock
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


def test_every_new_route_works_through_the_proxy(proxy):
    c, world, store = proxy
    ini, mid, oid, gid = _seed(world)
    world.item("alpha", "pilot task", milestone="Pilot")
    assert [p["id"] for p in c.get("/api/roadmap").json()["projects"]] == ["alpha", "beta"]
    assert [p["id"] for p in c.get("/api/roadmap", params={"project_id": "alpha"}).json()["projects"]] == ["alpha"]
    assert c.get("/api/roadmap", params={"project_id": "ghost"}).status_code == 404

    link = c.post(f"/api/projects/alpha/initiatives/{ini}/milestones",
                  json={"milestone_id": mid, "relationship": "depends_on"})
    assert link.status_code == 200 and link.json()["created_by"] == "owner"
    assert c.post(f"/api/projects/alpha/initiatives/{ini}/milestones",
                  json={"milestone_id": mid}).status_code == 409
    items = c.get(f"/api/roadmap/projects/alpha/milestones/{mid}/items")
    assert items.status_code == 200 and items.json()["delivery"]["total"] == 1

    olink = c.post(f"/api/projects/alpha/objectives/{oid}/initiatives",
                   json={"initiative_ref": ini, "relationship": "unblocks"})
    assert olink.status_code == 200 and olink.json()["relationship"] == "unblocks"

    contract = f"/api/projects/alpha/goals/{gid}/contract"
    assert c.get(contract).json()["goal_id"] == gid
    assert c.put(contract, json={"stop_when": "two failed turns"}).json()["stop_when"] == "two failed turns"

    assert c.delete(f"/api/projects/alpha/objectives/{oid}/initiatives/{ini}").status_code == 200
    assert c.delete(f"/api/projects/alpha/initiatives/{ini}/milestones/{mid}").status_code == 200
    assert c.delete(f"/api/projects/alpha/initiatives/{ini}/milestones/{mid}").status_code == 404
    assert store._conn.execute("SELECT COUNT(*) FROM initiative_milestones").fetchone()[0] == 0


def test_proxy_forwards_refusals_unchanged_and_blocks_cross_project(proxy):
    c, world, store = proxy
    ini, _mid, _oid, gid = _seed(world)
    beta_ms = world.milestone("beta", "Elsewhere")
    r = c.post(f"/api/projects/alpha/initiatives/{ini}/milestones", json={"milestone_id": beta_ms})
    assert r.status_code == 409
    assert c.put(f"/api/projects/alpha/goals/{gid}/contract", json={"status": "bogus"}).status_code in (409, 422)
    assert c.put(f"/api/projects/alpha/goals/{gid}/contract", json={"nope": 1}).status_code in (409, 422)
    world.svc.update_features("alpha", {"milestones": False}, actor="o", interface="t")
    off = c.post(f"/api/projects/alpha/initiatives/{ini}/milestones", json={"milestone_id": beta_ms})
    assert off.status_code == 409
    assert store._conn.execute("SELECT COUNT(*) FROM initiative_milestones").fetchone()[0] == 0


def test_proxy_never_lets_the_caller_name_the_actor(proxy):
    c, world, store = proxy
    ini, mid, _oid, _gid = _seed(world)
    r = c.post(f"/api/projects/alpha/initiatives/{ini}/milestones",
               json={"milestone_id": mid, "created_by": "evil"})
    assert r.status_code in (409, 422)
    ok = c.post(f"/api/projects/alpha/initiatives/{ini}/milestones", json={"milestone_id": mid})
    assert ok.json()["created_by"] == "owner"
    assert _audit(store, "roadmap.link.created")[0]["actor"] == "owner"
