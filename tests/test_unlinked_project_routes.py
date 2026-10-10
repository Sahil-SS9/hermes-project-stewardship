"""A project Hermes does not know gets a clean answer from every route.

Found 10/10/2026 on Sahil's real data: two stewardship projects have no Hermes
project behind them (they are "unlinked"). f2a07d1 kept the fleet pages up, but
picking one of them on its own still failed. A route-by-route probe against the
real Hermes host found three wrong answers for an unlinked project:

- GET  /projects/{id}/milestones raised a server error (500);
- POST /projects/{id}/reports raised a server error (500);
- GET  /projects/{id}/team said Hermes was unavailable (503), as did the
  member and transfer-preview writes for any Hermes error at all.

The rule now: a missing link is a 404 carrying the host's code and readable
message, on every route, including routes that forget to catch a Hermes
error; only a genuinely unavailable host is a 503 (fail closed).
"""
from __future__ import annotations

import enum
import typing
from collections.abc import Iterator

import pytest
from fastapi.routing import APIRoute
from fastapi.testclient import TestClient
from pydantic import BaseModel

from hermes_project_stewardship.api.server import create_app
from hermes_project_stewardship.kanban.host_adapter import UnavailableKanbanAdapter

from .r2_helpers import World
from .unlinked_host import MISSING, NoHermesProjectAdapter

GHOST = "payments-relaunch"  # enabled in stewardship, unknown to Hermes
TOKEN = "unlinked-routes-token"
AUTH = {"authorization": f"Bearer {TOKEN}"}
# The reads that need Hermes (found by the probe; every other per-project read
# answers 200 for an unlinked project).
HOST_READS = ("work-items", "milestones", "team", "work-dependencies", "memory/suggestions")


def _app(store, adapter):
    return create_app(store, kanban_adapter=adapter, auth_token=TOKEN,
                      auth_principal="owner", auth_principal_is_human=True,
                      rate_limit_rpm=10_000_000)


@pytest.fixture()
def unlinked(store, clock):
    """(client, world): GHOST and a linked project; Hermes knows only the linked one."""
    adapter = NoHermesProjectAdapter(store)
    world = World(store, clock, adapter=adapter)
    world.project("linked")
    world.project(GHOST)
    adapter.missing.add(GHOST)
    return TestClient(_app(store, adapter), raise_server_exceptions=False), world


# ---- a generic caller for every route ---------------------------------------

def _dummy(annotation, depth: int = 0):
    origin, args = typing.get_origin(annotation), typing.get_args(annotation)
    if origin is typing.Union or (origin is not None and str(origin).endswith("UnionType")):
        non_none = [a for a in args if a is not type(None)]
        return _dummy(non_none[0], depth) if non_none else None
    if origin is typing.Literal:
        return args[0]
    if origin in (list, tuple, set, frozenset):
        return []
    if origin is dict:
        return {}
    if isinstance(annotation, type):
        if issubclass(annotation, enum.Enum):
            return next(iter(annotation)).value
        if issubclass(annotation, BaseModel):
            return _body(annotation, depth + 1) if depth < 4 else {}
        for kind, value in ((bool, False), (int, 1), (float, 1.0)):
            if annotation is kind:
                return value
    return "probe"


def _body(model, depth: int = 0) -> dict:
    return {field.alias or name: _dummy(field.annotation, depth)
            for name, field in model.model_fields.items() if field.is_required()}


def _routes(routes, prefix: str = "") -> Iterator[tuple[str, APIRoute]]:
    for route in routes:
        if isinstance(route, APIRoute):
            yield (route.path if route.path.startswith(prefix) else prefix + route.path), route
        elif hasattr(route, "original_router"):
            inner = route.original_router
            yield from _routes(inner.routes, prefix + (getattr(inner, "prefix", "") or ""))


def _project_routes(app) -> list[tuple[str, str, APIRoute]]:
    calls = []
    for path, route in _routes(app.routes):
        per_project = "{project_id}" in path or any(
            p.name == "project_id" for p in route.dependant.query_params)
        if per_project:
            calls += [(method, path, route) for method in sorted(route.methods)
                      if method in {"GET", "POST", "PUT", "PATCH", "DELETE"}]
    # Reads first, then writes, deletes last: one world serves the whole sweep.
    order = {"GET": 0, "POST": 1, "PUT": 2, "PATCH": 3, "DELETE": 4}
    return sorted(calls, key=lambda call: (order[call[0]], call[1]))


def _call(client, method: str, path: str, route: APIRoute, project_id: str):
    for param in route.dependant.path_params:
        value = project_id if param.name == "project_id" else "zz-missing"
        path = path.replace("{%s:path}" % param.name, value).replace("{%s}" % param.name, value)
    params = {}
    for param in route.dependant.query_params:
        if param.name == "project_id":
            params["project_id"] = project_id
        elif param.field_info.is_required():
            params[param.name] = _dummy(param.field_info.annotation)
    kwargs = {"headers": AUTH, "params": params}
    if method in {"POST", "PUT", "PATCH"} and route.body_field is not None:
        annotation = route.body_field.field_info.annotation
        is_model = isinstance(annotation, type) and issubclass(annotation, BaseModel)
        kwargs["json"] = _body(annotation) if is_model else _dummy(annotation)
    return client.request(method, path, **kwargs)


def _server_errors(client, project_id: str) -> list[str]:
    failures = []
    for method, path, route in _project_routes(client.app):
        response = _call(client, method, path, route, project_id)
        if response.status_code >= 500:
            failures.append(f"{method} {path} -> {response.status_code} {response.text[:120]}")
    return failures


def _error(response) -> dict:
    body = response.json()
    return {key: body["error"].get(key) for key in ("code", "message")}


# ---- default lane: reference host without GHOST -----------------------------

def test_every_project_route_answers_an_unlinked_project_without_a_server_error(unlinked):
    client, _world = unlinked
    assert len(_project_routes(client.app)) > 140  # the sweep really covers the API
    assert _server_errors(client, GHOST) == []


@pytest.mark.parametrize("read", HOST_READS)
def test_reads_that_need_hermes_say_the_project_is_not_linked(unlinked, read):
    client, _world = unlinked
    response = client.get(f"/stewardship/v1/projects/{GHOST}/{read}", headers=AUTH)
    assert response.status_code == 404, response.text
    assert _error(response) == MISSING


@pytest.mark.parametrize("read", HOST_READS)
def test_a_linked_project_still_reads_normally(unlinked, read):
    client, _world = unlinked
    response = client.get(f"/stewardship/v1/projects/linked/{read}", headers=AUTH)
    assert response.status_code == 200, response.text


def test_a_report_for_an_unlinked_project_is_a_clean_not_found(unlinked):
    client, _world = unlinked
    response = client.post(f"/stewardship/v1/projects/{GHOST}/reports", headers=AUTH,
                           json={"report_type": "executive", "include_activity": True})
    assert response.status_code == 404, response.text
    assert _error(response) == MISSING
    linked = client.post("/stewardship/v1/projects/linked/reports", headers=AUTH,
                         json={"report_type": "executive", "include_activity": True})
    assert linked.status_code == 200, linked.text


@pytest.mark.parametrize("read", HOST_READS)
def test_an_unavailable_host_still_fails_closed(store, clock, read):
    world = World(store, clock)
    world.project("linked")
    client = TestClient(_app(store, UnavailableKanbanAdapter()), raise_server_exceptions=False)
    response = client.get(f"/stewardship/v1/projects/linked/{read}", headers=AUTH)
    assert response.status_code == 503, response.text
    assert _error(response)["code"] == "host_unavailable"


# ---- native lane: the real Hermes host --------------------------------------

def test_real_host_every_project_route_answers_an_unlinked_project_cleanly(real_host):
    world, pid = real_host
    world.project(GHOST)
    client = TestClient(_app(world.store, world.adapter), raise_server_exceptions=False)
    assert _server_errors(client, GHOST) == []
    for read in HOST_READS:
        response = client.get(f"/stewardship/v1/projects/{GHOST}/{read}", headers=AUTH)
        assert response.status_code == 404, f"{read}: {response.text}"
        assert _error(response) == MISSING, read
        linked = client.get(f"/stewardship/v1/projects/{pid}/{read}", headers=AUTH)
        assert linked.status_code == 200, f"{read} (linked): {linked.text}"


# ---- stewardship records that Hermes only annotates --------------------------
# Found by the real-data dry run (10/10/2026), past the dummy-input sweep: any
# workflow of an unlinked project failed to open (its run ledger read Hermes for
# live task status), and the Roadmap said the work host "did not respond" when
# Hermes had answered: it has no such project. Set up while linked, then
# unlinked, the way Sahil's projects lost their link.

RELEASE = {"name": "release", "nodes": [
    {"id": "build", "title": "Build"},
    {"id": "ship", "title": "Ship", "depends_on": ["build"]},
]}


def _history_then_unlinked(store, clock):
    adapter = NoHermesProjectAdapter(store)
    world = World(store, clock, adapter=adapter)
    world.project(GHOST)
    client = TestClient(create_app(store, kanban_adapter=adapter), raise_server_exceptions=False)
    created = client.post(f"/stewardship/v1/projects/{GHOST}/workflows", json=RELEASE)
    assert created.status_code == 200, created.text
    started = client.post(f"/stewardship/v1/projects/{GHOST}/workflows/release/start", json={"run_key": "r1"})
    assert started.status_code == 200, started.text
    initiative = world.initiative(GHOST, "Ship")
    milestone = world.milestone(GHOST, "Pilot")
    world.link_milestone(GHOST, initiative, milestone)
    world.item(GHOST, "pilot item", milestone="Pilot")
    adapter.missing.add(GHOST)
    return world, client, milestone


def test_an_unlinked_projects_workflow_still_shows_its_run_history(store, clock):
    _world, client, _milestone = _history_then_unlinked(store, clock)
    response = client.get(f"/stewardship/v1/projects/{GHOST}/workflows/release/runs")
    assert response.status_code == 200, response.text
    runs = response.json()["runs"]
    assert [run["run_key"] for run in runs] == ["r1"]
    nodes = {node["node_id"]: node for node in runs[0]["nodes"]}
    assert set(nodes) == {"build", "ship"}
    assert all(node["task_ref"] for node in nodes.values()), "the ledger still names its tasks"
    assert all(node["status"] is None for node in nodes.values()), "no live status without Hermes"


def test_a_run_timeline_needs_hermes_and_records_nothing_without_it(store, clock):
    _world, client, _milestone = _history_then_unlinked(store, clock)

    def recorded() -> int:
        return store._conn.execute(
            "SELECT COUNT(*) FROM domain_events WHERE event_type='workflow.node_state'").fetchone()[0]

    before = recorded()
    response = client.get(f"/stewardship/v1/projects/{GHOST}/workflows/release/runs/r1/timeline")
    assert response.status_code == 404, response.text
    assert _error(response) == MISSING
    assert recorded() == before, "a timeline read without Hermes must not invent step changes"


def test_the_roadmap_says_not_linked_never_host_unavailable(store, clock):
    world, _client, milestone = _history_then_unlinked(store, clock)
    project = {row["id"]: row for row in world.roadmap.roadmap()["projects"]}[GHOST]
    assert project["work_host"] == "unlinked"
    initiative = project["initiatives"][0]
    assert initiative["delivery"] == {"state": "unavailable", "reason": "unlinked"}
    pilot = next(row for row in initiative["milestones"] if row["id"] == milestone)
    assert pilot["delivery"] == {"state": "unavailable", "reason": "unlinked"}
    items = world.roadmap.milestone_items(GHOST, milestone)
    assert (items["state"], items.get("reason"), items["items"]) == ("unavailable", "unlinked", [])
    assert items["delivery"] == {"state": "unavailable", "reason": "unlinked"}
