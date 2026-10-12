"""Batch L service rules: one-parent placement, same-project, audit, goal
contracts, feature toggles.

The link sections were rewritten for the v42 ladder (L0-INVENTORY.md §4). Every
behaviour they covered is preserved; the ledger is at the top of each section.
The goal-contract sections are unchanged and still apply as written.
"""
from __future__ import annotations

import sqlite3

import pytest

from hermes_project_stewardship.persistence.ladder_service import LadderService
from hermes_project_stewardship.persistence.roadmap_service import (
    RoadmapConflict,
    RoadmapInvalid,
    RoadmapNotFound,
)
from hermes_project_stewardship.persistence.service import (
    FeatureDisabledError,
    ServiceError,
)
from .r2_helpers import HUMAN, World


@pytest.fixture()
def world(store, clock):
    w = World(store, clock)
    w.project("alpha")
    w.project("beta")
    return w


def _count(store, table):
    return store._conn.execute(f"SELECT COUNT(*) FROM {table}").fetchone()[0]


def _audit(store, action):
    return [r for r in store.audit_tail(200) if r["action"] == action]


def _parent(store, table, column, key, value):
    return store._conn.execute(
        f"SELECT {column} FROM {table} WHERE {key}=?", (value,)).fetchone()[0]


# ---- milestone -> initiative (one parent) ------------------------------------ //
# test_link_milestone_roundtrip_and_returns_the_link
#   -> test_place_milestone_roundtrip_and_returns_the_placement
#      old: a relationship row in initiative_milestones (delivers|depends_on).
#      new: dockyard_milestones.initiative_ref, the single parent.

def test_place_milestone_roundtrip_and_returns_the_placement(world, store):
    ini = world.initiative("alpha", "Ship")
    mid = world.milestone("alpha", "Pilot")
    placed = world.place_milestone("alpha", mid, ini)
    assert placed["kind"] == "milestone" and placed["item_id"] == str(mid)
    assert placed["parent_id"] == ini
    assert _parent(store, "dockyard_milestones", "initiative_ref", "id", mid) == ini
    # The old 0.4.0 link table is never written by a v42 placement.
    assert _count(store, "initiative_milestones") == 0
    # Unplacing is a placement of null: the milestone becomes "Not placed yet".
    removed = world.place_milestone("alpha", mid, None)
    assert removed["parent_id"] is None
    assert _parent(store, "dockyard_milestones", "initiative_ref", "id", mid) is None
    # Re-placing is idempotent in effect: one parent, audited each time.
    world.place_milestone("alpha", mid, ini)
    assert len(_audit(store, "roadmap.parent.set")) == 3


def test_milestone_placement_cross_project_is_refused(world, store):
    """Was test_milestone_link_cross_project_is_refused."""
    ini_alpha = world.initiative("alpha", "Ship")
    mid_beta = world.milestone("beta", "Elsewhere")
    # The milestone belongs to beta, so alpha may not parent it at all.
    with pytest.raises(RoadmapConflict, match="cross-project child refused"):
        world.place_milestone("alpha", mid_beta, ini_alpha)
    ini_beta = world.initiative("beta", "Other")
    mid_alpha = world.milestone("alpha", "Here")
    with pytest.raises(RoadmapConflict, match="cross-project parent refused"):
        world.place_milestone("alpha", mid_alpha, ini_beta)
    assert _parent(store, "dockyard_milestones", "initiative_ref", "id", mid_alpha) is None
    assert _audit(store, "roadmap.parent.set") == []


def test_a_milestone_has_exactly_one_initiative(world, store):
    """Was test_a_milestone_can_sit_under_two_initiatives.

    The 0.4.0 model let a milestone sit under two initiatives; v42 is a strict
    one-parent ladder, so re-pointing moves the milestone instead of adding a
    second parent. That is the owner's decision (D-L1), not a weakening.
    """
    one = world.initiative("alpha", "One")
    two = world.initiative("alpha", "Two")
    mid = world.milestone("alpha", "Shared")
    world.place_milestone("alpha", mid, one)
    world.place_milestone("alpha", mid, two)
    assert _parent(store, "dockyard_milestones", "initiative_ref", "id", mid) == two


def test_milestone_placement_unknown_ids_are_not_found(world):
    """Was test_milestone_link_unknown_ids_are_not_found."""
    ini = world.initiative("alpha", "Ship")
    mid = world.milestone("alpha", "Pilot")
    with pytest.raises(RoadmapNotFound):
        world.place_milestone("alpha", mid, "INIT-NOPE-0001")
    with pytest.raises(RoadmapNotFound):
        world.place_milestone("alpha", 9999, ini)
    with pytest.raises(RoadmapNotFound):
        world.place_milestone("ghost", mid, ini)


def test_milestone_placement_to_archived_target_is_refused(world, store):
    """Was test_milestone_link_to_archived_target_is_refused_and_later_archive_is_unavailable."""
    archived = world.milestone("alpha", "Old")
    world.dy.milestone_archive("alpha", "Old", actor=HUMAN)
    oid = world.objective("alpha", "Obj")
    with pytest.raises(RoadmapConflict, match="archived"):
        world.place_objective("alpha", oid, archived)
    assert _parent(store, "project_objectives", "milestone_id", "id", oid) is None
    # An archived goal is likewise refused as a task's parent.
    gid = world.goal("alpha", "Archived goal")
    world.svc.archive_goal("alpha", gid, actor="owner", interface="test")
    task = world.item("alpha", "Work")
    with pytest.raises(RoadmapConflict, match="archived"):
        world.place_task("alpha", task, gid)
    assert _count(store, "goal_tasks") == 0


def test_a_closed_initiative_is_refused_as_a_parent(world, store):
    ini = world.initiative("alpha", "Ship", status="rejected")
    mid = world.milestone("alpha", "Pilot")
    with pytest.raises(RoadmapConflict, match="closed"):
        world.place_milestone("alpha", mid, ini)
    assert _parent(store, "dockyard_milestones", "initiative_ref", "id", mid) is None


# ---- objective -> milestone (one parent) ------------------------------------- //
# test_link_objective_roundtrip_defaults_and_duplicate
#   -> test_place_objective_roundtrip (no relationship: v42 has one parent)
# test_objective_link_relationship_validated
#   -> removed: there is no relationship to validate any more. The refusal it
#      covered (an invalid relationship) cannot occur, and every other
#      validation path is covered by the check tests in test_batch_l_ladder.py.

def test_place_objective_roundtrip(world, store):
    mid = world.milestone("alpha", "Pilot")
    oid = world.objective("alpha", "Completion")
    placed = world.place_objective("alpha", oid, mid)
    assert placed["parent_id"] == mid
    assert _parent(store, "project_objectives", "milestone_id", "id", oid) == mid
    removed = world.place_objective("alpha", oid, None)
    assert removed["parent_id"] is None
    assert _parent(store, "project_objectives", "milestone_id", "id", oid) is None


def test_objective_placement_cross_project_unknown_and_archived(world, store):
    """Was test_objective_link_cross_project_unknown_and_archived."""
    mid = world.milestone("alpha", "Pilot")
    beta_obj = world.objective("beta", "Theirs")
    with pytest.raises(RoadmapConflict, match="cross-project child refused"):
        world.place_objective("alpha", beta_obj, mid)
    with pytest.raises(RoadmapNotFound):
        world.place_objective("alpha", 9999, mid)
    oid = world.objective("alpha", "Mine")
    with pytest.raises(RoadmapNotFound):
        world.place_objective("alpha", oid, 9999)
    world.svc.archive_objective("alpha", oid, actor="owner", interface="test")
    with pytest.raises(RoadmapConflict):
        world.place_goal("alpha", world.goal("alpha", "G"), oid)
    # None of the refusals wrote a parent or an audit entry.
    assert _parent(store, "project_objectives", "milestone_id", "id", beta_obj) is None
    assert _audit(store, "roadmap.parent.set") == []


def test_a_task_has_exactly_one_goal(world, store):
    """The strict ladder at the task level: re-pointing moves the task."""
    g1 = world.goal("alpha", "One")
    g2 = world.goal("alpha", "Two")
    task = world.item("alpha", "Work")
    world.place_task("alpha", task, g1)
    world.place_task("alpha", task, g2)
    assert _count(store, "goal_tasks") == 1
    assert _parent(store, "goal_tasks", "goal_id", "item_ref", task) == g2


# ---- audit ------------------------------------------------------------------- //
# test_every_link_write_is_audited_with_actor_and_both_ends
#   -> test_every_placement_write_is_audited_with_actor_and_both_ends
#      old action roadmap.link.created/removed -> roadmap.parent.set, and the
#      detail keys change from (initiative_ref, milestone_id, relationship) to
#      (kind, item_id, parent_id).

def test_every_placement_write_is_audited_with_actor_and_both_ends(world, store):
    ini = world.initiative("alpha", "Ship")
    mid = world.milestone("alpha", "Pilot")
    oid = world.objective("alpha", "Completion")
    world.place_milestone("alpha", mid, ini)
    world.place_objective("alpha", oid, mid)
    created = _audit(store, "roadmap.parent.set")
    assert len(created) == 2
    by_kind = {r["detail"]["kind"]: r for r in created}
    m = by_kind["milestone"]
    assert m["actor"] == "owner" and m["interface"] == "service"
    assert m["detail"] == {"project_id": "alpha", "kind": "milestone",
                           "item_id": str(mid), "previous_parent_id": None,
                           "parent_id": ini}
    o = by_kind["objective"]
    assert o["detail"] == {"project_id": "alpha", "kind": "objective",
                           "item_id": str(oid), "previous_parent_id": None,
                           "parent_id": mid}
    # A later re-point records what the parent was before.
    # audit_tail is newest-first, so [0] is the most recent write.
    two = world.initiative("alpha", "Two")
    world.place_milestone("alpha", mid, two)
    moved = _audit(store, "roadmap.parent.set")[0]
    assert moved["detail"]["previous_parent_id"] == ini
    assert moved["detail"]["parent_id"] == two


def test_placement_and_audit_commit_in_one_transaction(world, store, monkeypatch):
    """Was test_link_and_audit_commit_in_one_transaction: if the audit insert
    fails, the placement rolls back with it."""
    ini = world.initiative("alpha", "Ship")
    mid = world.milestone("alpha", "Pilot")
    real_j = store._j

    def boom(value):
        if isinstance(value, dict) and value.get("kind") == "milestone":
            raise RuntimeError("audit failed")
        return real_j(value)

    monkeypatch.setattr(store, "_j", boom)
    with pytest.raises(RuntimeError):
        world.place_milestone("alpha", mid, ini)
    monkeypatch.undo()
    assert _parent(store, "dockyard_milestones", "initiative_ref", "id", mid) is None


# ---- feature toggles --------------------------------------------------------- //
# test_links_refuse_when_a_touched_feature_is_off_and_data_survives
#   -> test_placements_refuse_when_a_touched_feature_is_off_and_data_survives

def test_placements_refuse_when_a_touched_feature_is_off_and_data_survives(world, store):
    ini = world.initiative("alpha", "Ship")
    mid = world.milestone("alpha", "Pilot")
    oid = world.objective("alpha", "Completion")
    world.place_milestone("alpha", mid, ini)
    world.place_objective("alpha", oid, mid)
    world.svc.update_features("alpha", {"milestones": False}, actor="owner", interface="test")
    with pytest.raises(FeatureDisabledError) as err:
        world.place_milestone("alpha", world.milestone("alpha", "Another"), ini)
    assert err.value.feature == "milestones"
    with pytest.raises(FeatureDisabledError):
        world.place_milestone("alpha", mid, None)
    # A goal placement touches neither feature: still allowed.
    other = world.objective("alpha", "Second")
    world.place_goal("alpha", world.goal("alpha", "G"), other)
    world.svc.update_features("alpha", {"initiatives": False}, actor="owner", interface="test")
    with pytest.raises(FeatureDisabledError) as err:
        world.place_goal("alpha", world.goal("alpha", "H"), other)
    assert err.value.feature == "initiatives"
    # nothing was moved by toggling
    assert _parent(store, "dockyard_milestones", "initiative_ref", "id", mid) == ini
    assert _parent(store, "project_objectives", "milestone_id", "id", oid) == mid


# ---- goal contracts ------------------------------------------------------------

def test_create_goal_creates_its_contract_in_the_same_transaction(world, store):
    gid = world.goal("alpha", "Ship recovery")
    row = store._conn.execute("SELECT * FROM project_goal_contracts WHERE goal_id=?", (gid,)).fetchone()
    assert row["outcome"] == "Ship recovery" and row["status"] == "active"
    assert row["max_turns"] == 20 and row["verification"] == ""


def test_restore_goal_creates_a_missing_contract_and_keeps_an_existing_one(world, store):
    gid = world.goal("alpha", "Ship recovery")
    world.roadmap.update_goal_contract("alpha", gid, {"verification": "run suite"}, actor="owner")
    world.svc.archive_goal("alpha", gid, actor="owner", interface="test")
    world.svc.restore_goal("alpha", gid, actor="owner", interface="test")
    assert world.roadmap.goal_contract("alpha", gid)["verification"] == "run suite"
    # an archived-at-upgrade goal has no contract: restore backfills it
    with store.tx() as cx:
        cx.execute("DELETE FROM project_goal_contracts WHERE goal_id=?", (gid,))
    with pytest.raises(RoadmapNotFound):
        world.roadmap.goal_contract("alpha", gid)
    world.svc.archive_goal("alpha", gid, actor="owner", interface="test")
    world.svc.restore_goal("alpha", gid, actor="owner", interface="test")
    assert world.roadmap.goal_contract("alpha", gid)["outcome"] == "Ship recovery"


def test_goal_contract_read_shape_and_project_scoping(world):
    gid = world.goal("alpha", "Ship recovery")
    contract = world.roadmap.goal_contract("alpha", gid)
    assert set(contract) >= {"goal_id", "project_id", "outcome", "verification", "constraints",
                             "boundaries", "stop_when", "status", "max_turns",
                             "paused_reason", "updated_at"}
    with pytest.raises(RoadmapNotFound):
        world.roadmap.goal_contract("beta", gid)
    with pytest.raises(RoadmapNotFound):
        world.roadmap.goal_contract("alpha", "GOAL-NOPE")


def test_goal_contract_update_validates_audits_and_stamps(world, store, clock):
    gid = world.goal("alpha", "Ship recovery")
    clock.advance(hours=1)
    updated = world.roadmap.update_goal_contract(
        "alpha", gid,
        {"verification": "all tests green", "constraints": "no downtime",
         "boundaries": "api only", "stop_when": "blocked twice",
         "status": "paused", "paused_reason": "waiting on review", "max_turns": 7},
        actor="owner")
    assert updated["verification"] == "all tests green" and updated["max_turns"] == 7
    assert updated["status"] == "paused" and updated["paused_reason"] == "waiting on review"
    assert updated["updated_at"].startswith("2026-08-21T13:00")
    rows = _audit(store, "goal.contract.updated")
    assert len(rows) == 1 and rows[0]["actor"] == "owner" and rows[0]["subject"] == gid
    assert rows[0]["detail"]["project_id"] == "alpha"
    assert rows[0]["detail"]["changes"]["max_turns"] == [20, 7]
    # resuming clears the pause reason
    resumed = world.roadmap.update_goal_contract("alpha", gid, {"status": "active"}, actor="owner")
    assert resumed["status"] == "active" and resumed["paused_reason"] is None


@pytest.mark.parametrize("bad", [
    {}, {"nope": 1}, {"outcome": "  "}, {"outcome": "x" * 2001},
    {"verification": "x" * 2001}, {"status": "bogus"}, {"max_turns": 0},
    {"max_turns": True}, {"max_turns": "7"}, {"status": "active", "paused_reason": "why"},
    {"paused_reason": 5},
])
def test_goal_contract_update_refusals_write_nothing(world, store, bad):
    gid = world.goal("alpha", "Ship recovery")
    before = dict(store._conn.execute("SELECT * FROM project_goal_contracts WHERE goal_id=?", (gid,)).fetchone())
    with pytest.raises(ServiceError):
        world.roadmap.update_goal_contract("alpha", gid, bad, actor="owner")
    after = dict(store._conn.execute("SELECT * FROM project_goal_contracts WHERE goal_id=?", (gid,)).fetchone())
    assert before == after and _audit(store, "goal.contract.updated") == []


def test_unchanged_contract_update_writes_and_audits_nothing(world, store):
    gid = world.goal("alpha", "Ship recovery")
    world.roadmap.update_goal_contract("alpha", gid, {"status": "active", "max_turns": 20}, actor="owner")
    assert _audit(store, "goal.contract.updated") == []


def test_service_errors_are_service_errors():
    """Callers that only know ServiceError still see the new refusals."""
    assert issubclass(RoadmapConflict, ServiceError)
    assert issubclass(RoadmapNotFound, ServiceError)
    assert issubclass(RoadmapInvalid, ServiceError)
    assert issubclass(FeatureDisabledError, ServiceError)
    assert not issubclass(sqlite3.IntegrityError, ServiceError)
