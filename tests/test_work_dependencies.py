"""Work dependencies for the Kanban board: one read-only map per project.

``GET /projects/{id}/work-dependencies`` answers "which items does each item
wait on, and which wait on it", with enough of the other item (ref, title,
type, status) to draw a reference chip. A host ``parent`` link means a blocker:
the board never reads it as a work item's parent.
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
from hermes_project_stewardship.kanban.host_adapter import KanbanAdapterError  # noqa: E402
from .r2_helpers import HUMAN, World  # noqa: E402

V1 = "/stewardship/v1"
BEARER = {"Authorization": "Bearer t0k"}
SESSION = {"x-hermes-session-token": "synthetic-desktop-token"}


def _card(world, pid, ref):
    item = world.work.get(pid, ref)
    return {"ref": ref, "title": item["title"], "type": item["type"], "status": item["status"]}


@pytest.fixture()
def world(store, clock):
    w = World(store, clock, adapter=ReferenceKanbanAdapter(store))
    w.project("alpha")
    w.project("beta")
    return w


# ---- the map ------------------------------------------------------------------


def test_each_item_lists_what_blocks_it_and_what_it_blocks(world):
    blocker = world.item("alpha", "Blocker")
    middle = world.item("alpha", "Middle")
    last = world.item("alpha", "Last")
    free = world.item("alpha", "Free")
    world.work.add_dependency("alpha", middle, blocker, actor=HUMAN)
    world.work.add_dependency("alpha", last, middle, actor=HUMAN)

    deps = world.work.dependency_map("alpha")

    assert deps == {
        blocker: {"blocked_by": [], "blocks": [_card(world, "alpha", middle)]},
        middle: {
            "blocked_by": [_card(world, "alpha", blocker)],
            "blocks": [_card(world, "alpha", last)],
        },
        last: {"blocked_by": [_card(world, "alpha", middle)], "blocks": []},
    }
    assert free not in deps  # items without links are omitted, not empty rows


def test_a_card_carries_ref_title_type_and_status_of_the_other_item(world):
    blocker = world.item("alpha", "Fix login", status="in_progress")
    blocked = world.item("alpha", "Ship it")
    world.work.add_dependency("alpha", blocked, blocker, actor=HUMAN)

    card = world.work.dependency_map("alpha")[blocked]["blocked_by"][0]
    assert card == {"ref": blocker, "title": "Fix login", "type": "task", "status": "in_progress"}


def test_a_card_names_the_type_of_the_linked_item_whatever_it_is(world):
    # Blockers are made only with an explicit blocking link (add_dependency),
    # never by giving an item a parent.
    bug = world.work.create_item("alpha", "bug", "Login crash", actor=HUMAN)["ref"]
    spike = world.work.create_item("alpha", "spike", "Try the new API", actor=HUMAN)["ref"]
    task = world.item("alpha", "Ship the release")
    world.work.add_dependency("alpha", task, bug, actor=HUMAN)
    world.work.add_dependency("alpha", task, spike, actor=HUMAN)

    deps = world.work.dependency_map("alpha")
    assert sorted((c["ref"], c["type"]) for c in deps[task]["blocked_by"]) == sorted(
        [(bug, "bug"), (spike, "spike")]
    )
    assert [c["ref"] for c in deps[bug]["blocks"]] == [task]
    assert [c["ref"] for c in deps[spike]["blocks"]] == [task]


def test_the_map_is_scoped_to_its_own_project(world):
    a1, a2 = world.item("alpha", "Alpha one"), world.item("alpha", "Alpha two")
    b1, b2 = world.item("beta", "Beta one"), world.item("beta", "Beta two")
    world.work.add_dependency("alpha", a2, a1, actor=HUMAN)
    world.work.add_dependency("beta", b2, b1, actor=HUMAN)

    assert set(world.work.dependency_map("alpha")) == {a1, a2}
    assert set(world.work.dependency_map("beta")) == {b1, b2}


def test_an_unknown_project_is_refused_like_the_work_list(world):
    with pytest.raises(Exception) as listed:
        world.work.list("ghost")
    with pytest.raises(type(listed.value)):
        world.work.dependency_map("ghost")


def test_it_makes_one_list_call_and_one_link_call_per_item_and_the_work_list_makes_none(store, clock):
    calls = {"list_work": 0, "get_work": 0, "list_work_links": 0}

    class Counting(ReferenceKanbanAdapter):
        def list_work(self, project_id):
            calls["list_work"] += 1
            return super().list_work(project_id)

        def get_work(self, *a, **k):
            calls["get_work"] += 1
            return super().get_work(*a, **k)

        def list_work_links(self, *a, **k):
            calls["list_work_links"] += 1
            return super().list_work_links(*a, **k)

    w = World(store, clock, adapter=Counting(store))
    w.project("alpha")
    refs = [w.item("alpha", f"item {n}") for n in range(5)]
    w.work.add_dependency("alpha", refs[1], refs[0], actor=HUMAN)

    calls.update(list_work=0, get_work=0, list_work_links=0)
    w.work.list("alpha")
    assert calls == {"list_work": 1, "get_work": 0, "list_work_links": 0}  # the board's list is untouched

    calls.update(list_work=0, get_work=0, list_work_links=0)
    w.work.dependency_map("alpha")
    assert calls == {"list_work": 1, "get_work": 0, "list_work_links": 5}


def test_a_failing_link_read_fails_the_whole_map_instead_of_dropping_items(store, clock):
    class Broken(ReferenceKanbanAdapter):
        def list_work_links(self, *a, **k):
            raise KanbanAdapterError("host_link_shape_invalid", "unrecognised")

    w = World(store, clock, adapter=Broken(store))
    w.project("alpha")
    w.item("alpha", "one")
    with pytest.raises(KanbanAdapterError):
        w.work.dependency_map("alpha")


# ---- the route ------------------------------------------------------------------


@pytest.fixture()
def api(store, world):
    return TestClient(
        create_app(store, kanban_adapter=world.adapter, auth_token="t0k", auth_principal="sahil",
                   auth_principal_is_human=True),
        headers=BEARER,
    )


def test_route_returns_the_map_and_is_read_only(api, world):
    blocker, blocked = world.item("alpha", "Blocker"), world.item("alpha", "Blocked")
    world.work.add_dependency("alpha", blocked, blocker, actor=HUMAN)

    r = api.get(f"{V1}/projects/alpha/work-dependencies")
    assert r.status_code == 200
    assert r.json() == {"dependencies": world.work.dependency_map("alpha")}
    assert [c["ref"] for c in r.json()["dependencies"][blocked]["blocked_by"]] == [blocker]
    for write in (api.post, api.put, api.patch, api.delete):
        assert write(f"{V1}/projects/alpha/work-dependencies").status_code == 405


def test_route_unknown_project_matches_the_work_list_status(api):
    listed = api.get(f"{V1}/projects/ghost/work-items")
    r = api.get(f"{V1}/projects/ghost/work-dependencies")
    assert r.status_code == listed.status_code != 200


def test_route_needs_the_same_authentication_as_the_work_list(api):
    open_api = TestClient(api.app)  # no bearer token
    assert open_api.get(f"{V1}/projects/alpha/work-items").status_code in (401, 403)
    assert open_api.get(f"{V1}/projects/alpha/work-dependencies").status_code in (401, 403)


def test_route_shows_a_failing_host_as_a_visible_error_not_an_empty_map(store):
    class Broken(ReferenceKanbanAdapter):
        def list_work_links(self, *a, **k):
            raise KanbanAdapterError("host_link_shape_invalid", "unrecognised")

    w = World(store, None, adapter=Broken(store))
    w.project("alpha")
    w.item("alpha", "one")
    c = TestClient(create_app(store, kanban_adapter=w.adapter, auth_token="t0k", auth_principal="sahil",
                              auth_principal_is_human=True), headers=BEARER)
    r = c.get(f"{V1}/projects/alpha/work-dependencies")
    assert r.status_code == 503
    assert r.json()["error"]["code"] == "host_link_shape_invalid"


# ---- the plugin proxy -----------------------------------------------------------


@pytest.fixture()
def proxy(tmp_path, monkeypatch):
    monkeypatch.setenv("HERMES_HOME", str(tmp_path))
    monkeypatch.setenv("HERMES_KANBAN_HOME", str(tmp_path))
    monkeypatch.setenv("STEWARD_DB_PATH", str(tmp_path / "db.sqlite"))
    monkeypatch.setenv("DOCKYARD_ACTOR_ID", "trusted-desktop")
    monkeypatch.delenv("STEWARD_RPC_TOKEN", raising=False)
    monkeypatch.setenv("HERMES_DASHBOARD_SESSION_TOKEN", SESSION["x-hermes-session-token"])
    path = Path(__file__).parents[1] / "hermes_dockyard_plugin/dashboard/plugin_api.py"
    spec = importlib.util.spec_from_file_location("work_dependencies_isolated_proxy", path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    store = module._store
    adapter = ReferenceKanbanAdapter(store)
    from .conftest import FrozenClock
    w = World(store, FrozenClock(), adapter=adapter)
    w.project("alpha")
    module._app = create_app(
        store, kanban_adapter=adapter, auth_token=module._rpc_token,
        auth_principal="owner", auth_principal_is_human=True)
    module._client = module.httpx.AsyncClient(
        transport=module.httpx.ASGITransport(app=module._app), base_url="http://dockyard.test")
    host = FastAPI()
    host.include_router(module.plugin_api, prefix="/api")
    yield TestClient(host, headers=SESSION), w
    store.close()


def test_the_proxy_forwards_the_map_and_the_refusals(proxy):
    c, w = proxy
    blocker, blocked = w.item("alpha", "Blocker"), w.item("alpha", "Blocked")
    w.work.add_dependency("alpha", blocked, blocker, actor=HUMAN)

    r = c.get("/api/projects/alpha/work-dependencies")
    assert r.status_code == 200
    assert [x["ref"] for x in r.json()["dependencies"][blocked]["blocked_by"]] == [blocker]
    assert c.get("/api/projects/ghost/work-dependencies").status_code == c.get(
        "/api/projects/ghost/work-items").status_code != 200
    # the path segment is quoted, never able to reach another upstream route
    assert c.get("/api/projects/alpha%2Fwork-items/work-dependencies").status_code in (404, 422)
    assert c.post("/api/projects/alpha/work-dependencies", json={}).status_code == 405
