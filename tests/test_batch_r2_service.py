"""Batch R2 service rules: links, same-project, audit, goal contracts, toggles."""
from __future__ import annotations

import sqlite3

import pytest

from hermes_project_stewardship.persistence.roadmap_service import (
    RoadmapConflict,
    RoadmapInvalid,
    RoadmapNotFound,
)
from hermes_project_stewardship.persistence.service import (
    FeatureDisabledError,
    ServiceError,
)
from tests.r2_helpers import HUMAN, World


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


# ---- initiative <-> milestone ------------------------------------------------

def test_link_milestone_roundtrip_and_returns_the_link(world, store):
    ini = world.initiative("alpha", "Ship")
    mid = world.milestone("alpha", "Pilot")
    link = world.link_milestone("alpha", ini, mid, "depends_on")
    assert link["initiative_ref"] == ini and link["milestone_id"] == mid
    assert link["relationship"] == "depends_on" and link["created_by"] == "owner"
    assert link["created_at"]
    assert _count(store, "initiative_milestones") == 1
    removed = world.roadmap.unlink_initiative_milestone(
        "alpha", ini, mid, actor="owner")
    assert removed["milestone_id"] == mid
    assert _count(store, "initiative_milestones") == 0


def test_milestone_link_cross_project_is_refused(world, store):
    ini_alpha = world.initiative("alpha", "Ship")
    mid_beta = world.milestone("beta", "Elsewhere")
    with pytest.raises(RoadmapConflict, match="cross-project link refused"):
        world.link_milestone("alpha", ini_alpha, mid_beta)
    ini_beta = world.initiative("beta", "Other")
    mid_alpha = world.milestone("alpha", "Here")
    with pytest.raises(RoadmapConflict, match="cross-project link refused"):
        world.link_milestone("alpha", ini_beta, mid_alpha)
    assert _count(store, "initiative_milestones") == 0
    assert _audit(store, "roadmap.link.created") == []


def test_milestone_link_duplicate_is_conflict_even_with_other_relationship(world, store):
    ini = world.initiative("alpha", "Ship")
    mid = world.milestone("alpha", "Pilot")
    world.link_milestone("alpha", ini, mid)
    with pytest.raises(RoadmapConflict, match="already linked"):
        world.link_milestone("alpha", ini, mid, "depends_on")
    assert _count(store, "initiative_milestones") == 1
    assert len(_audit(store, "roadmap.link.created")) == 1


def test_milestone_link_unknown_ids_are_not_found(world):
    ini = world.initiative("alpha", "Ship")
    mid = world.milestone("alpha", "Pilot")
    with pytest.raises(RoadmapNotFound):
        world.link_milestone("alpha", "INIT-NOPE-0001", mid)
    with pytest.raises(RoadmapNotFound):
        world.link_milestone("alpha", ini, 9999)
    with pytest.raises(RoadmapNotFound):
        world.link_milestone("ghost", ini, mid)
    with pytest.raises(RoadmapNotFound):
        world.roadmap.unlink_initiative_milestone("alpha", ini, mid, actor="owner")


def test_milestone_link_to_archived_target_is_refused_and_later_archive_is_unavailable(world, store):
    ini = world.initiative("alpha", "Ship")
    archived = world.milestone("alpha", "Old")
    world.dy.milestone_archive("alpha", "Old", actor=HUMAN)
    with pytest.raises(RoadmapConflict, match="archived"):
        world.link_milestone("alpha", ini, archived)
    live = world.milestone("alpha", "Live")
    world.link_milestone("alpha", ini, live)
    world.dy.milestone_archive("alpha", "Live", actor=HUMAN)
    row = next(m for m in world.outline("alpha")["initiatives"][0]["milestones"] if m["id"] == live)
    assert row["archived"] is True and row["unavailable"] == "archived"
    # existing links are kept, never silently dropped
    assert _count(store, "initiative_milestones") == 1
    # and an archived link can still be removed
    world.roadmap.unlink_initiative_milestone("alpha", ini, live, actor="owner")


def test_invalid_relationship_is_rejected_before_any_write(world, store):
    ini = world.initiative("alpha", "Ship")
    mid = world.milestone("alpha", "Pilot")
    with pytest.raises(RoadmapInvalid):
        world.link_milestone("alpha", ini, mid, "owns")
    assert _count(store, "initiative_milestones") == 0


def test_a_milestone_can_sit_under_two_initiatives(world, store):
    one = world.initiative("alpha", "One")
    two = world.initiative("alpha", "Two")
    mid = world.milestone("alpha", "Shared")
    world.link_milestone("alpha", one, mid)
    world.link_milestone("alpha", two, mid)
    assert _count(store, "initiative_milestones") == 2


# ---- objective <-> initiative -------------------------------------------------

def test_link_objective_roundtrip_defaults_and_duplicate(world, store):
    ini = world.initiative("alpha", "Ship")
    oid = world.objective("alpha", "Completion")
    link = world.link_objective("alpha", oid, ini)
    assert link["relationship"] == "supports" and link["created_by"] == "owner"
    with pytest.raises(RoadmapConflict, match="already linked"):
        world.link_objective("alpha", oid, ini, "measures")
    removed = world.roadmap.unlink_objective_initiative("alpha", oid, ini, actor="owner")
    assert removed["objective_id"] == oid
    assert _count(store, "project_objective_deliveries") == 0


def test_objective_link_cross_project_unknown_and_archived(world, store):
    ini = world.initiative("alpha", "Ship")
    beta_obj = world.objective("beta", "Theirs")
    with pytest.raises(RoadmapConflict, match="cross-project link refused"):
        world.link_objective("alpha", beta_obj, ini)
    with pytest.raises(RoadmapNotFound):
        world.link_objective("alpha", 9999, ini)
    oid = world.objective("alpha", "Mine")
    with pytest.raises(RoadmapNotFound):
        world.link_objective("alpha", oid, "INIT-NOPE-0001")
    world.svc.archive_objective("alpha", oid, actor="owner", interface="test")
    with pytest.raises(RoadmapConflict, match="archived"):
        world.link_objective("alpha", oid, ini)
    assert _count(store, "project_objective_deliveries") == 0


def test_objective_link_relationship_validated(world, store):
    ini = world.initiative("alpha", "Ship")
    oid = world.objective("alpha", "Mine")
    for rel in ("measures", "unblocks"):
        other = world.objective("alpha", f"obj-{rel}")
        assert world.link_objective("alpha", other, ini, rel)["relationship"] == rel
    with pytest.raises(RoadmapInvalid):
        world.link_objective("alpha", oid, ini, "delivers")


# ---- audit -------------------------------------------------------------------

def test_every_link_write_is_audited_with_actor_and_both_ends(world, store):
    ini = world.initiative("alpha", "Ship")
    mid = world.milestone("alpha", "Pilot")
    oid = world.objective("alpha", "Completion")
    world.link_milestone("alpha", ini, mid, "depends_on")
    world.link_objective("alpha", oid, ini, "measures")
    created = _audit(store, "roadmap.link.created")
    assert len(created) == 2
    by_kind = {("milestone_id" in r["detail"]): r for r in created}
    m = by_kind[True]
    assert m["actor"] == "owner" and m["interface"] == "service"
    assert m["detail"] == {"project_id": "alpha", "initiative_ref": ini,
                           "milestone_id": mid, "relationship": "depends_on"}
    o = by_kind[False]
    assert o["detail"] == {"project_id": "alpha", "objective_id": oid,
                           "initiative_ref": ini, "relationship": "measures"}
    world.roadmap.unlink_initiative_milestone("alpha", ini, mid, actor="owner2")
    world.roadmap.unlink_objective_initiative("alpha", oid, ini, actor="owner3")
    removed = _audit(store, "roadmap.link.removed")
    assert {r["actor"] for r in removed} == {"owner2", "owner3"}
    assert all(r["detail"]["project_id"] == "alpha" for r in removed)


def test_link_and_audit_commit_in_one_transaction(world, store, monkeypatch):
    """If the audit insert fails the link must roll back with it."""
    ini = world.initiative("alpha", "Ship")
    mid = world.milestone("alpha", "Pilot")
    real_j = store._j

    def boom(value):
        if isinstance(value, dict) and value.get("milestone_id") == mid:
            raise RuntimeError("audit failed")
        return real_j(value)

    monkeypatch.setattr(store, "_j", boom)
    with pytest.raises(RuntimeError):
        world.link_milestone("alpha", ini, mid)
    monkeypatch.undo()
    assert _count(store, "initiative_milestones") == 0


# ---- feature toggles ---------------------------------------------------------

def test_links_refuse_when_a_touched_feature_is_off_and_data_survives(world, store):
    ini = world.initiative("alpha", "Ship")
    mid = world.milestone("alpha", "Pilot")
    oid = world.objective("alpha", "Completion")
    world.link_milestone("alpha", ini, mid)
    world.link_objective("alpha", oid, ini)
    world.svc.update_features("alpha", {"milestones": False}, actor="owner", interface="test")
    with pytest.raises(FeatureDisabledError) as err:
        world.link_milestone("alpha", ini, world.milestone("alpha", "Another"))
    assert err.value.feature == "milestones"
    with pytest.raises(FeatureDisabledError):
        world.roadmap.unlink_initiative_milestone("alpha", ini, mid, actor="owner")
    # objectives link only touches initiatives: still allowed
    other = world.objective("alpha", "Second")
    world.link_objective("alpha", other, ini)
    world.svc.update_features("alpha", {"initiatives": False}, actor="owner", interface="test")
    with pytest.raises(FeatureDisabledError) as err:
        world.link_objective("alpha", oid, ini)
    assert err.value.feature == "initiatives"
    # nothing was deleted by toggling
    assert _count(store, "initiative_milestones") == 1
    assert _count(store, "project_objective_deliveries") == 2


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
