"""Batch L waivers: "no longer required" (v43).

The behaviour under test, in the owner's words: a person must be able to take
an item out of a requirement — removal, reassignment or deletion of a child
must never deadlock the chain — without faking a completion and without losing
the item's history. A waived child stops blocking its parent, which counts it
as satisfied; a reason is required and every act is audited; clearing the
waiver puts the branch back exactly as it was.

The deadlock this closes, reproduced end to end:
    the only objective of the only milestone is no longer required
    -> before: the milestone could never be reached, so the initiative could
       never be confirmed (archiving the objective left the level empty);
    -> after: the objective is waived with a reason and the milestone is
       reached, so the initiative becomes ready and can be confirmed.
"""
from __future__ import annotations

import importlib.util
from pathlib import Path

import pytest

from hermes_project_stewardship.persistence.roadmap_service import (
    RoadmapConflict,
    RoadmapNotFound,
)
from .r2_helpers import HUMAN, World


@pytest.fixture()
def world(store, clock):
    w = World(store, clock)
    w.project("proj")
    return w


def _chain(world: World) -> dict:
    """One executing initiative with one milestone/objective/goal/task whose
    only requirement is a single child at each level."""
    ref = world.initiative("proj", "Deliver the branch", status="executing")
    mid = world.milestone("proj", "The milestone")
    world.place_milestone("proj", mid, ref)
    oid = world.objective("proj", "The objective")
    world.place_objective("proj", oid, mid)
    gid = world.goal("proj", "The goal", objective_ids=[oid])
    world.place_goal("proj", gid, oid)
    task = world.item("proj", "The task")
    world.place_task("proj", task, gid)
    return {"project": "proj", "ref": ref, "milestone": mid, "objective": oid,
            "goal": gid, "task": task}


def _state(world: World, ref: str) -> dict:
    return world.roadmap.initiative_state("proj", ref)


def _waive(world: World, kind: str, item_id, reason: str):
    return world.ladder.waive("proj", kind, str(item_id), reason, actor=HUMAN.id)


def _clear(world: World, kind: str, item_id):
    return world.ladder.clear_waiver("proj", kind, str(item_id), actor=HUMAN.id)


def _audit(store, action):
    return [r for r in store.audit_tail(200) if r["action"] == action]


# ---- the deadlock, closed --------------------------------------------------- //

def test_a_waived_objective_stops_blocking_and_the_initiative_can_be_confirmed(world):
    """The exact scenario from the probe: the only objective is no longer
    required, so it is WAIVED instead of archived, and the milestone is reached
    without pretending the work was done."""
    c = _chain(world)
    with pytest.raises(RoadmapConflict) as refused:
        world.confirm("proj", c["ref"])
    assert "not ready to confirm" in str(refused.value)
    assert _state(world, c["ref"])["ready_to_confirm"] is False

    _waive(world, "objective", c["objective"],
           "delivered under the old plan; not required for this initiative")
    state = _state(world, c["ref"])
    assert state["ready_to_confirm"] is True
    [ms] = state["milestones"]
    assert ms["state"] == "reached"
    [obj] = ms["objectives"]
    assert obj["state"] == "waived"
    assert obj["waived"]["reason"].startswith("delivered under the old plan")
    assert obj["waived"]["by"] == HUMAN.id

    confirmed = world.confirm("proj", c["ref"])
    assert confirmed["status"] == "completed"


def test_a_waived_task_does_not_hold_its_goal_back(world):
    c = _chain(world)
    _waive(world, "task", c["task"], "the fix shipped in another repo")
    [goal] = world.roadmap.roadmap("proj")["projects"][0]["goals"]
    assert goal["state"] == "met"
    assert goal["tasks"][0]["waived"]["reason"] == "the fix shipped in another repo"


def test_a_waived_milestone_satisfies_its_initiative(world):
    c = _chain(world)
    _waive(world, "milestone", c["milestone"], "folded into the next release")
    state = _state(world, c["ref"])
    assert state["ready_to_confirm"] is True
    assert state["milestones"][0]["state"] == "waived"


def test_a_waived_goal_satisfies_its_objective(world):
    """The objective keeps its own check; with that settled it is met by the
    waived goal alone, without any task work."""
    c = _chain(world)
    world.svc.record_assessment(
        "proj", c["objective"], passed=True, evidence=["ticket:1"],
        actor="owner", interface="dockyard:human", trusted_principal="owner")
    _waive(world, "goal", c["goal"], "replaced by the new onboarding goal")
    [ms] = _state(world, c["ref"])["milestones"]
    assert ms["objectives"][0]["state"] == "met"
    assert ms["state"] == "reached"


# ---- restoring -------------------------------------------------------------- //

def test_clearing_the_waiver_puts_the_branch_back_exactly_as_it_was(world):
    c = _chain(world)
    before = _state(world, c["ref"])
    _waive(world, "objective", c["objective"], "temporarily out of scope")
    assert _state(world, c["ref"])["ready_to_confirm"] is True
    _clear(world, "objective", c["objective"])
    after = _state(world, c["ref"])
    assert after["ready_to_confirm"] is False
    [ms_before] = before["milestones"]
    [ms_after] = after["milestones"]
    assert ms_after["state"] == ms_before["state"] == "not_reached"
    assert ms_after["objectives"][0]["state"] == ms_before["objectives"][0]["state"]
    assert ms_after["objectives"][0]["waived"] is None


def test_clearing_an_item_that_is_not_waived_is_refused(world):
    c = _chain(world)
    with pytest.raises(RoadmapNotFound):
        _clear(world, "objective", c["objective"])


# ---- honesty rules ---------------------------------------------------------- //

def test_a_reason_is_required_and_nothing_is_written_without_one(world, store):
    c = _chain(world)
    for bad in ("", "   ", "no"):
        with pytest.raises(RoadmapConflict) as refused:
            _waive(world, "objective", c["objective"], bad)
        assert "reason is required" in str(refused.value)
    assert store._conn.execute(
        "SELECT COUNT(*) AS n FROM ladder_waivers").fetchone()["n"] == 0
    assert _audit(store, "ladder.waived") == []


def test_an_unknown_or_cross_project_item_is_refused_with_nothing_written(world, store):
    c = _chain(world)
    world.project("other")
    other_goal = world.goal("other", "Elsewhere")
    with pytest.raises(RoadmapNotFound):
        world.ladder.waive("proj", "objective", "9999", "gone", actor=HUMAN.id)
    with pytest.raises(RoadmapConflict) as refused:
        world.ladder.waive("proj", "goal", other_goal, "elsewhere", actor=HUMAN.id)
    assert "cross-project" in str(refused.value)
    with pytest.raises(RoadmapConflict) as refused:
        world.ladder.waive("proj", "initiative", c["ref"], "nope", actor=HUMAN.id)
    assert "cannot be marked" in str(refused.value)
    assert store._conn.execute(
        "SELECT COUNT(*) AS n FROM ladder_waivers").fetchone()["n"] == 0


def test_waiving_twice_keeps_one_live_waiver_with_the_latest_reason(world, store):
    c = _chain(world)
    _waive(world, "objective", c["objective"], "first reason")
    world.ladder.waive("proj", "objective", str(c["objective"]),
                       "a better reason", actor="someone-else")
    rows = store._conn.execute(
        "SELECT reason,waived_by,cleared_at FROM ladder_waivers").fetchall()
    assert len(rows) == 1 and rows[0]["cleared_at"] is None
    assert rows[0]["reason"] == "a better reason"
    assert rows[0]["waived_by"] == "someone-else"
    [ms] = _state(world, c["ref"])["milestones"]
    assert ms["objectives"][0]["waived"]["reason"] == "a better reason"
    # Two waive acts, two audit rows: the history is not rewritten.
    assert len(_audit(store, "ladder.waived")) == 2


def test_every_waiver_and_restore_is_audited_with_its_reason(world, store):
    c = _chain(world)
    _waive(world, "objective", c["objective"],
           "not required after the reprioritisation")
    _clear(world, "objective", c["objective"])
    [waived] = _audit(store, "ladder.waived")
    assert waived["subject"] == str(c["objective"])
    assert waived["detail"]["reason"] == "not required after the reprioritisation"
    [cleared] = _audit(store, "ladder.waiver.cleared")
    assert cleared["subject"] == str(c["objective"])
    # The roadmap no longer shows a waiver, and the chain is blocking again.
    assert _state(world, c["ref"])["ready_to_confirm"] is False


def test_a_waived_item_stays_visible_rather_than_disappearing(world):
    """A waiver is not a deletion: the item and its children remain readable."""
    c = _chain(world)
    _waive(world, "objective", c["objective"], "superseded")
    [ms] = _state(world, c["ref"])["milestones"]
    [obj] = ms["objectives"]
    assert obj["id"] == c["objective"]
    assert obj["goals"], "children stay for the record"
    assert obj["check"] is not None


# ---- the routes ------------------------------------------------------------- //

def test_waiver_routes_roundtrip_status_codes(world, store):
    pytest.importorskip("fastapi")
    from fastapi.testclient import TestClient
    from hermes_project_stewardship.api.server import create_app
    from hermes_project_stewardship.kanban import ReferenceKanbanAdapter

    c = _chain(world)
    adapter = ReferenceKanbanAdapter(store)
    app = create_app(store, kanban_adapter=adapter, auth_token="t0k",
                     auth_principal="owner", auth_principal_is_human=True)
    client = TestClient(app, headers={"Authorization": "Bearer t0k"})
    v1 = "/stewardship/v1"

    r = client.put(f"{v1}/projects/proj/waivers/objective/{c['objective']}",
                   json={"reason": "no longer required this quarter"})
    assert r.status_code == 200, r.text
    assert r.json()["waived"] is True

    roadmap = client.get(f"{v1}/roadmap?projects=proj")
    [ms] = [i for i in roadmap.json()["projects"][0]["initiatives"]
            if i["ref"] == c["ref"]][0]["milestones"]
    assert ms["objectives"][0]["state"] == "waived"
    assert ms["state"] == "reached"

    # A reason is required (409), an unknown item is a 404, a bad kind is 409.
    assert client.put(f"{v1}/projects/proj/waivers/objective/{c['objective']}",
                      json={"reason": "x"}).status_code == 409
    assert client.put(f"{v1}/projects/proj/waivers/objective/9999",
                      json={"reason": "gone now"}).status_code == 404
    assert client.put(f"{v1}/projects/proj/waivers/initiative/{c['ref']}",
                      json={"reason": "nope nope"}).status_code == 409

    r = client.delete(f"{v1}/projects/proj/waivers/objective/{c['objective']}")
    assert r.status_code == 200 and r.json()["waived"] is False
    assert client.delete(
        f"{v1}/projects/proj/waivers/objective/{c['objective']}").status_code == 404


def test_waiver_routes_work_through_the_dashboard_proxy(tmp_path, monkeypatch):
    pytest.importorskip("fastapi")
    from fastapi import FastAPI
    from fastapi.testclient import TestClient

    monkeypatch.setenv("HERMES_HOME", str(tmp_path))
    monkeypatch.setenv("HERMES_KANBAN_HOME", str(tmp_path))
    monkeypatch.setenv("STEWARD_DB_PATH", str(tmp_path / "db.sqlite"))
    monkeypatch.setenv("DOCKYARD_ACTOR_ID", "trusted-desktop")
    monkeypatch.delenv("STEWARD_RPC_TOKEN", raising=False)
    monkeypatch.setenv("HERMES_DASHBOARD_SESSION_TOKEN", "synthetic-desktop-token")
    path = (Path(__file__).parents[1] / "hermes_dockyard_plugin" / "dashboard"
            / "plugin_api.py")
    spec = importlib.util.spec_from_file_location("batch_l_proxy_waivers", path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    from hermes_project_stewardship.api.server import create_app

    store = module._store
    from hermes_project_stewardship.kanban import ReferenceKanbanAdapter
    adapter = ReferenceKanbanAdapter(store)
    from .conftest import FrozenClock
    world = World(store, FrozenClock(), adapter=adapter)
    world.project("proj")
    c = _chain(world)
    module._app = create_app(
        store, kanban_adapter=adapter, auth_token="synthetic-desktop-token",
        auth_principal="owner", auth_principal_is_human=True)
    module._client = module.httpx.AsyncClient(
        transport=module.httpx.ASGITransport(app=module._app),
        base_url="http://dockyard.test")
    host = FastAPI()
    host.include_router(module.plugin_api, prefix="/api")
    client = TestClient(host, headers={"x-hermes-session-token": "synthetic-desktop-token"})
    try:
        r = client.put(f"/api/projects/proj/waivers/goal/{c['goal']}",
                       json={"reason": "the goal moved to another objective"})
        assert r.status_code == 200, r.text
        # The write landed on the backend, not just in the proxy.
        assert store._conn.execute(
            "SELECT COUNT(*) AS n FROM ladder_waivers WHERE kind='goal'"
        ).fetchone()["n"] == 1
        r = client.delete(f"/api/projects/proj/waivers/goal/{c['goal']}")
        assert r.status_code == 200, r.text
        assert store._conn.execute(
            "SELECT cleared_at FROM ladder_waivers WHERE kind='goal'"
        ).fetchone()["cleared_at"] is not None
    finally:
        store.close()
