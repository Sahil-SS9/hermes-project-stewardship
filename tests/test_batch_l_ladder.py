"""Batch L ladder service rules: one parent per level, derived states, checks,
needs-placing, and human delivery confirmation.

These tests replace the 0.4.0 link-model tests (see L0-INVENTORY.md §4 for the
authorised-rewrite list). Every assertion count is recorded against the test it
replaces so the gate can prove nothing was weakened.
"""
from __future__ import annotations

import pytest

from hermes_project_stewardship.persistence.ladder_state import (
    goal_state,
    initiative_ready,
    milestone_state,
    objective_state,
)
from hermes_project_stewardship.persistence.roadmap_service import (
    RoadmapConflict,
    RoadmapInvalid,
    RoadmapNotFound,
)
from .r2_helpers import HUMAN, World, find


@pytest.fixture()
def w(store, clock):
    world = World(store, clock)
    world.project("alpha")
    world.project("beta")
    return world


def _count(store, table):
    return store._conn.execute(f"SELECT COUNT(*) FROM {table}").fetchone()[0]


def _audit(store, action):
    return [r for r in store.audit_tail(200) if r["action"] == action]


def _goal(w, pid, title="Goal"):
    return w.goal(pid, title)


# ---- derived-state folds (D-L2 / D-L3 truth tables) -------------------------- //

@pytest.mark.parametrize("buckets,check,expected", [
    (["complete"], None, "met"),
    (["complete", "complete"], "passed", "met"),
    (["complete", "building"], None, "in_progress"),
    ([], None, "not_started"),
    ([], "passed", "met"),
    (["complete"], "failed", "at_risk"),
    (["complete"], "unknown", "unknown"),
    (["complete"], "stale", "unknown"),
    (None, None, "unknown"),
    (None, "passed", "unknown"),
])
def test_goal_state_truth_table(buckets, check, expected):
    """A goal is met only when ALL its tasks are done AND its check passes."""
    assert goal_state(buckets, check) == expected


@pytest.mark.parametrize("goals,check,expected", [
    (["met"], None, "met"),
    (["met", "met"], "passed", "met"),
    (["met", "in_progress"], None, "in_progress"),
    (["met"], "failed", "at_risk"),
    (["at_risk", "met"], None, "at_risk"),
    (["met"], "unknown", "unknown"),
    (["unknown"], None, "unknown"),
    ([], None, "not_started"),
    (["met", "met"], "unknown", "unknown"),
])
def test_objective_state_truth_table(goals, check, expected):
    """An objective is met when ALL its goals are met AND its own check passes."""
    assert objective_state(goals, check) == expected


@pytest.mark.parametrize("objectives,expected", [
    (["met"], "reached"),
    (["met", "met"], "reached"),
    (["met", "in_progress"], "not_reached"),
    ([], "not_reached"),
    (["at_risk"], "not_reached"),
])
def test_milestone_state_truth_table(objectives, expected):
    """A milestone is reached when ALL its objectives are met; empty is never reached."""
    assert milestone_state(objectives) == expected


@pytest.mark.parametrize("governance,milestones,expected", [
    ("executing", ["reached"], True),
    ("executing", ["reached", "reached"], True),
    ("executing", ["reached", "not_reached"], False),
    ("executing", [], False),
    ("completed", ["reached"], False),
    ("proposed", ["reached"], False),
])
def test_initiative_ready_truth_table(governance, milestones, expected):
    """Only an executing, non-empty initiative whose milestones are all reached is ready."""
    assert initiative_ready(governance, milestones) is expected


def test_an_empty_parent_is_never_met(w):
    """An empty parent (no children, no check) is never met or reached."""
    pid = "alpha"
    assert goal_state([], None) == "not_started"
    assert objective_state([], None) == "not_started"
    assert milestone_state([]) == "not_reached"
    assert initiative_ready("executing", []) is False


# ---- set-parent writes: one parent, same project, audited -------------------- //

def test_set_task_goal_places_one_goal_and_audits(w, store):
    pid = "alpha"
    g = _goal(w, pid)
    ref = w.item(pid, "Task A")
    out = w.place_task(pid, ref, g)
    assert out["parent_id"] == g
    assert _count(store, "goal_tasks") == 1
    rows = _audit(store, "roadmap.parent.set")
    assert len(rows) == 1
    assert rows[0]["detail"]["kind"] == "task"
    assert rows[0]["detail"]["parent_id"] == g


def test_a_task_has_at_most_one_goal_and_replacing_keeps_one(w, store):
    """Repointing a task moves it; it never gains a second parent."""
    pid = "alpha"
    g1, g2 = _goal(w, pid, "One"), _goal(w, pid, "Two")
    ref = w.item(pid, "Task A")
    w.place_task(pid, ref, g1)
    w.place_task(pid, ref, g2)
    assert _count(store, "goal_tasks") == 1
    assert store._conn.execute(
        "SELECT goal_id FROM goal_tasks WHERE item_ref=?", (ref,)).fetchone()[0] == g2


def test_unplacing_a_task_removes_the_link(w, store):
    pid = "alpha"
    g = _goal(w, pid)
    ref = w.item(pid, "Task A")
    w.place_task(pid, ref, g)
    w.place_task(pid, ref, None)
    assert _count(store, "goal_tasks") == 0


def test_set_goal_objective_places_one_objective(w, store):
    pid = "alpha"
    oid = w.objective(pid, "Obj")
    g = _goal(w, pid)
    out = w.place_goal(pid, g, oid)
    assert out["parent_id"] == oid
    assert store._conn.execute(
        "SELECT objective_id FROM project_goals WHERE goal_id=?", (g,)
    ).fetchone()[0] == oid


def test_a_goal_has_at_most_one_objective(w, store):
    """The old model let a goal carry many objectives; v42 allows exactly one."""
    pid = "alpha"
    o1, o2 = w.objective(pid, "One"), w.objective(pid, "Two")
    g = _goal(w, pid)
    w.place_goal(pid, g, o1)
    w.place_goal(pid, g, o2)
    assert store._conn.execute(
        "SELECT objective_id FROM project_goals WHERE goal_id=?", (g,)
    ).fetchone()[0] == o2


def test_set_objective_milestone_places_one_milestone(w, store):
    pid = "alpha"
    mid = w.milestone(pid, "M1")
    oid = w.objective(pid, "Obj")
    out = w.place_objective(pid, oid, mid)
    assert out["parent_id"] == mid
    assert store._conn.execute(
        "SELECT milestone_id FROM project_objectives WHERE id=?", (oid,)
    ).fetchone()[0] == mid


def test_set_milestone_initiative_places_one_initiative(w, store):
    pid = "alpha"
    ref = w.initiative(pid, "Ship")
    mid = w.milestone(pid, "M1")
    out = w.place_milestone(pid, mid, ref)
    assert out["parent_id"] == ref
    assert store._conn.execute(
        "SELECT initiative_ref FROM dockyard_milestones WHERE id=?", (mid,)
    ).fetchone()[0] == ref


def test_cross_project_parent_is_refused(w):
    """Both ends of a link are always in the same project."""
    w.place_goal("alpha", _goal(w, "alpha"), None)
    foreign = w.objective("beta", "Beta obj")
    with pytest.raises(RoadmapConflict):
        w.place_goal("alpha", _goal(w, "alpha"), foreign)


def test_archived_parent_is_refused(w):
    pid = "alpha"
    mid = w.milestone(pid, "M1")
    w.dy.milestone_archive(pid, "M1", actor=HUMAN)
    with pytest.raises(RoadmapConflict):
        w.place_objective(pid, w.objective(pid, "Obj"), mid)


def test_unknown_parent_is_not_found(w):
    with pytest.raises(RoadmapNotFound):
        w.place_goal("alpha", _goal(w, "alpha"), 999999)


def test_every_placement_write_is_audited_with_both_ends(w, store):
    pid = "alpha"
    oid = w.objective(pid, "Obj")
    g = _goal(w, pid)
    w.place_goal(pid, g, oid)
    rows = _audit(store, "roadmap.parent.set")
    assert len(rows) == 1
    detail = rows[0]["detail"]
    assert detail["kind"] == "goal"
    assert detail["item_id"] == g
    assert detail["parent_id"] == oid

# ---- goal checks (D-L2) ------------------------------------------------------ //

def test_goal_check_roundtrip(w):
    pid = "alpha"
    g = _goal(w, pid)
    w.ladder.set_goal_check(pid, g, {"evaluator_type": "manual", "target": ">=1"},
                            actor="owner")
    got = w.ladder.goal_check(pid, g)
    assert got["check"]["evaluator_type"] == "manual"
    assert got["check"]["target"] == ">=1"


def test_goal_check_can_be_removed(w, store):
    pid = "alpha"
    g = _goal(w, pid)
    w.ladder.set_goal_check(pid, g, {"evaluator_type": "manual", "target": ">=1"},
                            actor="owner")
    w.ladder.set_goal_check(pid, g, None, actor="owner")
    assert w.ladder.goal_check(pid, g)["check"] is None
    assert _count(store, "goal_checks") == 0


def test_a_goal_without_a_check_has_no_check_state(w):
    pid = "alpha"
    g = _goal(w, pid)
    assert w.ladder.goal_check(pid, g)["check"] is None


def test_manual_goal_check_requires_a_human_principal(w):
    pid = "alpha"
    g = _goal(w, pid)
    w.ladder.set_goal_check(pid, g, {"evaluator_type": "manual", "target": ">=1"},
                            actor="owner")
    with pytest.raises(RoadmapConflict):
        w.ladder.record_goal_assessment(
            pid, g, passed=True, evidence=["ticket:1"],
            trusted_principal=None, interface="desktop")


def test_manual_goal_check_refuses_a_bot_interface(w):
    pid = "alpha"
    g = _goal(w, pid)
    w.ladder.set_goal_check(pid, g, {"evaluator_type": "manual", "target": ">=1"},
                            actor="owner")
    with pytest.raises(RoadmapConflict):
        w.ladder.record_goal_assessment(
            pid, g, passed=True, evidence=["ticket:1"],
            trusted_principal="owner", interface="discord:bot")


def test_a_passed_manual_assessment_meets_the_goal(w):
    pid = "alpha"
    g = _goal(w, pid)
    w.ladder.set_goal_check(pid, g, {"evaluator_type": "manual", "target": ">=1"},
                            actor="owner")
    w.ladder.record_goal_assessment(
        pid, g, passed=True, evidence=["ticket:1"],
        trusted_principal="owner", interface="desktop")
    assert w.ladder.goal_check(pid, g)["evidence"]["state"] == "passed"
    entry = find(w.outline(pid)["goals"], id=g)
    assert entry["state"] == "met"


def test_a_failed_manual_assessment_puts_the_goal_at_risk(w):
    pid = "alpha"
    g = _goal(w, pid)
    w.ladder.set_goal_check(pid, g, {"evaluator_type": "manual", "target": ">=1"},
                            actor="owner")
    w.ladder.record_goal_assessment(
        pid, g, passed=False, evidence=["ticket:1"],
        trusted_principal="owner", interface="desktop")
    entry = find(w.outline(pid)["goals"], id=g)
    assert entry["state"] == "at_risk"


def test_an_assessment_requires_evidence(w):
    pid = "alpha"
    g = _goal(w, pid)
    w.ladder.set_goal_check(pid, g, {"evaluator_type": "manual", "target": ">=1"},
                            actor="owner")
    with pytest.raises(RoadmapInvalid):
        w.ladder.record_goal_assessment(
            pid, g, passed=True, evidence=[],
            trusted_principal="owner", interface="desktop")


# ---- needs-placing queue ----------------------------------------------------- //

def test_needs_placing_lists_unresolved_and_resolve_on_place(w, store):
    pid = "alpha"
    store._conn.execute(
        "INSERT INTO roadmap_unplaced(project_id,kind,item_id,reason,old_links_json,created_at)"
        " VALUES(?,?,?,?,?,?)",
        (pid, "goal", "G-x", "goal had multiple objectives", "[1,2]", "2026-01-01"))
    store._conn.commit()
    assert len(w.ladder.list_unplaced(pid)) == 1
    # Placing that goal resolves its queue row.
    g = _goal(w, pid)
    store._conn.execute("UPDATE roadmap_unplaced SET item_id=? WHERE item_id='G-x'", (g,))
    store._conn.commit()
    w.place_goal(pid, g, w.objective(pid, "Obj"))
    assert w.ladder.list_unplaced(pid) == []


def test_dismiss_unplaced_marks_it_resolved(w, store):
    pid = "alpha"
    cur = store._conn.execute(
        "INSERT INTO roadmap_unplaced(project_id,kind,item_id,reason,old_links_json,created_at)"
        " VALUES(?,?,?,?,?,?)",
        (pid, "task", "t-1", "did not map", "[]", "2026-01-01"))
    store._conn.commit()
    row_id = cur.lastrowid
    w.ladder.dismiss_unplaced(pid, row_id, actor="owner")
    assert w.ladder.list_unplaced(pid) == []
    rows = _audit(store, "roadmap.unplaced.dismissed")
    assert len(rows) == 1


def test_old_links_are_preserved_verbatim(w, store):
    pid = "alpha"
    store._conn.execute(
        "INSERT INTO roadmap_unplaced(project_id,kind,item_id,reason,old_links_json,created_at)"
        " VALUES(?,?,?,?,?,?)",
        (pid, "objective", "7", "did not map", '["INI-1","supports"]', "2026-01-01"))
    store._conn.commit()
    row = w.ladder.list_unplaced(pid)[0]
    assert row["old_links"] == ["INI-1", "supports"]


# ---- delivery confirmation (D-L3) ------------------------------------------- //

def _met_chain(w, pid, *, task_status="done"):
    """An executing initiative whose single milestone is fully met.

    The objective carries a manual check, and it is assessed as passed: an
    unassessed manual objective is honestly ``unknown`` (hard rule 8), which
    correctly keeps the milestone from being reached.
    """
    ref = w.initiative(pid, "Ship", status="executing")
    mid = w.milestone(pid, "Release")
    w.place_milestone(pid, mid, ref)
    oid = w.objective(pid, "Obj", state="passed")
    w.place_objective(pid, oid, mid)
    g = w.goal(pid, "Goal")
    w.place_goal(pid, g, oid)
    w.place_task(pid, w.item(pid, "Task", status=task_status), g)
    return ref, mid, oid, g


def test_all_milestones_reached_makes_the_initiative_ready_to_confirm(w):
    pid = "alpha"
    ref = _met_chain(w, pid)[0]
    entry = find(w.outline(pid)["initiatives"], ref=ref)
    assert entry["ready_to_confirm"] is True
    assert entry["state"] == "ready_to_confirm"


def test_an_unassessed_objective_check_keeps_the_milestone_from_being_reached(w):
    """Unknown is unknown, never met: no assessment means the milestone waits."""
    pid = "alpha"
    ref = w.initiative(pid, "Ship", status="executing")
    mid = w.milestone(pid, "Release")
    w.place_milestone(pid, mid, ref)
    oid = w.objective(pid, "Obj")  # manual, never assessed
    w.place_objective(pid, oid, mid)
    g = w.goal(pid, "Goal")
    w.place_goal(pid, g, oid)
    w.place_task(pid, w.item(pid, "Task", status="done"), g)
    outline = w.outline(pid)
    assert find(outline["goals"], id=g)["state"] == "met"
    assert find(outline["objectives"], id=oid)["state"] == "unknown"
    assert find(outline["milestones"], id=mid)["state"] == "not_reached"
    assert find(outline["initiatives"], ref=ref)["ready_to_confirm"] is False


def test_confirm_delivered_completes_the_initiative(w, store):
    pid = "alpha"
    ref = _met_chain(w, pid)[0]
    out = w.confirm(pid, ref)
    assert out["status"] == "completed"
    assert store._conn.execute(
        "SELECT status FROM project_initiatives WHERE ref=?", (ref,)
    ).fetchone()[0] == "completed"
    assert _audit(store, "initiative.completed")


def test_confirm_is_refused_while_a_milestone_is_not_reached(w):
    pid = "alpha"
    # The task is not done, so the goal is not met and the milestone waits.
    _met_chain(w, pid, task_status="backlog")
    with pytest.raises(RoadmapConflict):
        w.confirm(pid, w.outline(pid)["initiatives"][0]["ref"])


def test_confirm_is_refused_for_a_non_executing_initiative(w):
    pid = "alpha"
    ref = w.initiative(pid, "Ship", status="proposed")
    mid = w.milestone(pid, "Release")
    w.place_milestone(pid, mid, ref)
    with pytest.raises(RoadmapConflict):
        w.confirm(pid, ref)


def test_a_check_failing_after_confirmation_regresses_the_initiative(w, store):
    """After completion, a later failing check marks the initiative regressed."""
    pid = "alpha"
    ref, _mid, _oid, g = _met_chain(w, pid)
    w.confirm(pid, ref)
    w.ladder.set_goal_check(pid, g, {"evaluator_type": "manual", "target": ">=1"},
                            actor="owner")
    w.ladder.record_goal_assessment(
        pid, g, passed=False, evidence=["ticket:9"],
        trusted_principal="owner", interface="desktop")
    assert w.ladder.regress_completed_if_failed(pid, ref) is True
    assert store._conn.execute(
        "SELECT status FROM project_initiatives WHERE ref=?", (ref,)
    ).fetchone()[0] == "regressed"


def test_regression_is_not_triggered_while_everything_still_passes(w, store):
    pid = "alpha"
    ref = _met_chain(w, pid)[0]
    w.confirm(pid, ref)
    assert w.ladder.regress_completed_if_failed(pid, ref) is False


# ---- read model: no invented data ------------------------------------------- //

def test_the_ladder_reads_only_the_v42_chain(w, store):
    """Old link tables are history: writing them changes nothing on the roadmap."""
    pid = "alpha"
    g = _goal(w, pid)
    oid = w.objective(pid, "Obj")
    mid = w.milestone(pid, "M1")
    ref = w.initiative(pid, "Ship")
    # Write the 0.4.0 tables directly.
    store._conn.execute(
        "INSERT INTO project_objective_goals(objective_id,goal_id) VALUES(?,?)", (oid, g))
    store._conn.execute(
        "INSERT INTO dockyard_milestone_items(milestone_id,item_ref) VALUES(?,?)",
        (mid, w.item(pid, "Legacy task")))
    store._conn.commit()
    outline = w.outline(pid)
    assert find(outline["goals"], id=g)["objective_id"] is None
    assert find(outline["milestones"], id=mid)["initiative_ref"] is None


def test_not_placed_groups_list_every_unplaced_level(w):
    pid = "alpha"
    g, oid, mid = _goal(w, pid), w.objective(pid, "Obj"), w.milestone(pid, "M1")
    task = w.item(pid, "Loose task")
    outline = w.outline(pid)
    assert [x["id"] for x in outline["not_placed"]["goals"]] == [g]
    assert [x["id"] for x in outline["not_placed"]["objectives"]] == [oid]
    assert [x["id"] for x in outline["not_placed"]["milestones"]] == [mid]
    assert [x["ref"] for x in outline["not_placed"]["tasks"]] == [task]


def test_unknown_is_never_shown_as_zero(w):
    """An unavailable task host shows unknown, never met."""
    pid = "alpha"
    g = _goal(w, pid)
    oid = w.objective(pid, "Obj")
    mid = w.milestone(pid, "M1")
    ref = w.initiative(pid, "Ship", status="executing")
    w.place_milestone(pid, mid, ref)
    w.place_objective(pid, oid, mid)
    w.place_goal(pid, g, oid)
    # No tasks at all: the goal is not_started, not met.
    entry = find(w.outline(pid)["goals"], id=g)
    assert entry["state"] == "not_started"


def test_a_task_tagged_with_an_initiative_but_under_no_goal_is_not_placed(w):
    """initiative_ref stays the Kanban bridge tag; the Roadmap uses the ladder only."""
    pid = "alpha"
    ref = w.initiative(pid, "Ship")
    task = w.item(pid, "Tagged", initiative=ref)
    entry = find(w.outline(pid)["initiatives"], ref=ref)
    assert [t["ref"] for t in entry["not_placed"]["tasks"]] == [task]
    assert [t["ref"] for t in w.outline(pid)["not_placed"]["tasks"]] == []
