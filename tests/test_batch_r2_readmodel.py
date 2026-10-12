"""Batch L read model: honest roll-ups, explicit not-placed groups, no inference.

Rewritten for the v42 ladder (L0-INVENTORY.md §4). The shape of the read model
changed (Project -> Initiative -> Milestone -> Objective -> Goal -> Task, with a
single parent per level), so most tests were re-expressed rather than dropped.
The invariants they protected are all still asserted:

  test_empty_project_has_a_complete_but_empty_outline   -> kept, new key names
  test_full_chain_counts_buckets_and_keeps_blocked_separate
      -> test_full_chain_counts_buckets_and_keeps_blocked_separate
  test_there_is_never_a_blended_score_or_percentage     -> kept, unchanged
  test_no_linked_work_has_no_counts_and_no_percentage   -> kept
  test_not_linked_groups_list_orphans_and_hide_archived
      -> test_not_placed_groups_list_orphans_and_hide_archived
  test_nothing_is_ever_inferred_from_titles_or_shared_work -> kept
  test_work_bound_to_an_initiative_but_in_no_milestone_gets_its_own_group
      -> test_work_bound_to_an_initiative_but_under_no_goal_gets_its_own_group
  test_host_failure_gives_unavailable_never_zeros       -> kept
  test_objective_outcome_states_pass_through            -> kept
  test_archived_objective_is_unavailable_not_applicable -> kept (disabled objectives)
  test_evaluator_error_becomes_unknown_not_a_crash      -> kept
  test_goal_states_follow_the_packet
      -> test_goal_states_follow_the_ladder (v42 folds tasks + a goal check)
  test_disabled_objectives_do_not_count_toward_a_goal   -> kept
  test_archived_goal_is_hidden_from_the_list_and_unavailable_under_its_objective
      -> kept (archived goals are hidden)
  test_objective_with_no_goal_has_goal_none             -> kept (no parent -> None)
  test_a_milestone_under_two_initiatives_appears_under_both_with_also_under
      -> test_a_milestone_has_exactly_one_initiative (D-L1: one parent)
  test_an_objective_serving_two_initiatives_is_rendered_under_each
      -> test_an_objective_has_exactly_one_milestone (D-L1: one parent)
  test_archived_milestone_link_is_unavailable_with_no_counts
      -> test_archived_milestones_are_hidden (v42 hides archived, like goals)
  test_attention_reasons_are_raised_for_each_documented_condition
      -> kept for the conditions that still exist (pending approval, blocked
         items, overdue milestone, unplaced initiative)
  test_a_healthy_initiative_raises_no_attention         -> kept
  test_closed_or_future_milestones_are_not_overdue      -> kept
  test_project_attention_follows_initiatives_and_unlinked_groups
      -> kept, via an unplaced objective under a milestone
  test_initiatives_off_shows_the_off_state_and_nothing_under_it -> kept
  test_milestones_off_moves_all_initiative_work_to_not_in_a_milestone
      -> test_milestones_off_hides_milestones_and_their_children
  test_project_filter_and_unknown_project               -> kept
  test_outline_makes_one_canonical_list_call_per_project_and_no_item_detail_calls
      -> kept, unchanged
  test_milestone_items_returns_stages_and_blockers      -> kept
  test_milestone_items_refusals                         -> kept
  test_milestone_items_host_failure_is_unavailable_not_empty -> kept
  test_milestone_list_and_read_output_carry_the_id      -> kept, unchanged
"""
from __future__ import annotations

import pytest

from hermes_project_stewardship.kanban import ReferenceKanbanAdapter
from hermes_project_stewardship.persistence.roadmap_service import RoadmapNotFound
from hermes_project_stewardship.persistence.service import FeatureDisabledError
from .r2_helpers import HUMAN, World, find


@pytest.fixture()
def world(store, clock):
    w = World(store, clock)
    w.project("alpha")
    return w


def _chain(w, pid, *, task_status="done", objective_state="passed"):
    """A full ladder: initiative -> milestone -> objective -> goal -> task."""
    ini = w.initiative(pid, "Ship", status="executing")
    mid = w.milestone(pid, "Pilot")
    w.place_milestone(pid, mid, ini)
    oid = w.objective(pid, "Obj", state=objective_state)
    w.place_objective(pid, oid, mid)
    gid = w.goal(pid, "Goal")
    w.place_goal(pid, gid, oid)
    task = w.item(pid, "Work", status=task_status)
    w.place_task(pid, task, gid)
    return ini, mid, oid, gid, task


def test_empty_project_has_a_complete_but_empty_outline(world):
    p = world.outline("alpha")
    assert p["id"] == "alpha" and p["label"] == "alpha" and p["mission"] == "alpha mission"
    assert p["enabled"] is True
    assert p["features"] == {"initiatives": True, "milestones": True}
    assert p["initiatives"] == [] and p["goals"] == []
    assert p["objectives"] == [] and p["milestones"] == []
    # Every level has a "Not placed yet" group, all empty.
    assert p["not_placed"] == {"goals": [], "objectives": [], "milestones": [], "tasks": []}
    assert p["needs_placing"] == []
    assert p["work_host"] == "ok"


def test_full_chain_counts_buckets_and_keeps_blocked_separate(world):
    ini, mid, oid, gid, _ = _chain(world, "alpha", task_status="backlog")
    for title, status in (("building", "in_progress"), ("review", "in_review"),
                          ("complete", "done"), ("stuck", "blocked")):
        t = world.item("alpha", title, status=status)
        world.place_task("alpha", t, gid)
    row = find(world.outline("alpha")["initiatives"], ref=ini)
    assert row["ref"] == ini and row["title"] == "Ship"
    assert row["governance"] == "executing"
    expected = {"state": "ok", "planned": 1, "building": 1, "ready_for_review": 1,
                "complete": 1, "blocked": 1, "unknown": 0, "total": 5}
    assert row["delivery"] == expected
    ms = find(row["milestones"], id=mid)
    assert ms["name"] == "Pilot"
    assert ms["delivery"] == expected
    # blocked items carry no stage and never inflate another bucket
    assert sum(ms["delivery"][k] for k in
               ("planned", "building", "ready_for_review", "complete", "blocked", "unknown")) == 5


def test_the_chain_rolls_up_to_a_ready_initiative(world):
    ini, mid, oid, gid, task = _chain(world, "alpha")
    p = world.outline("alpha")
    goal = find(p["goals"], id=gid)
    assert goal["state"] == "met"
    assert find(p["objectives"], id=oid)["state"] == "met"
    assert find(p["milestones"], id=mid)["state"] == "reached"
    row = find(p["initiatives"], ref=ini)
    assert row["ready_to_confirm"] is True and row["state"] == "ready_to_confirm"
    assert [t["ref"] for t in goal["tasks"]] == [task]


def test_there_is_never_a_blended_score_or_percentage(world):
    _chain(world, "alpha")
    blob = repr(world.roadmap.roadmap("alpha")).lower()
    for banned in ("percent", "progress", "score", "health", "pct"):
        assert banned not in blob, banned


def test_no_linked_work_has_no_counts_and_no_percentage(world):
    ini = world.initiative("alpha", "Empty", status="executing")
    mid = world.milestone("alpha", "Nothing attached")
    world.place_milestone("alpha", mid, ini)
    row = find(world.outline("alpha")["initiatives"], ref=ini)
    assert row["delivery"] == {"state": "no_linked_work"}
    assert find(row["milestones"], id=mid)["delivery"] == {"state": "no_linked_work"}
    # No work and no objectives: the milestone is not reached and the initiative
    # is not ready to confirm — an empty ladder is never "done".
    assert find(row["milestones"], id=mid)["state"] == "not_reached"
    assert row["ready_to_confirm"] is False


def test_not_placed_groups_list_orphans_and_hide_archived(world):
    ini = world.initiative("alpha", "Linked", status="executing")
    linked_ms = world.milestone("alpha", "Linked ms")
    world.place_milestone("alpha", linked_ms, ini)
    orphan_ms = world.milestone("alpha", "Orphan ms")
    archived_ms = world.milestone("alpha", "Archived orphan")
    world.dy.milestone_archive("alpha", "Archived orphan", actor=HUMAN)
    linked_obj = world.objective("alpha", "Linked obj")
    world.place_objective("alpha", linked_obj, linked_ms)
    orphan_obj = world.objective("alpha", "Orphan obj")
    archived_obj = world.objective("alpha", "Archived orphan obj")
    world.svc.archive_objective("alpha", archived_obj, actor="owner", interface="test")
    p = world.outline("alpha")
    assert [m["id"] for m in p["not_placed"]["milestones"]] == [orphan_ms]
    assert [o["id"] for o in p["not_placed"]["objectives"]] == [orphan_obj]
    assert archived_ms not in [m["id"] for m in p["not_placed"]["milestones"]]
    assert p["not_placed"]["milestones"][0]["initiative_ref"] is None
    assert p["not_placed"]["objectives"][0]["milestone_id"] is None
    assert p["not_placed"]["milestones"][0]["delivery"] == {"state": "no_linked_work"}


def test_nothing_is_ever_inferred_from_titles_or_shared_work(world):
    ini = world.initiative("alpha", "Pilot release", status="executing")
    world.milestone("alpha", "Pilot release")          # same title as the initiative
    world.objective("alpha", "Pilot release")           # and the objective
    ref = world.item("alpha", "shared", initiative=ini, milestone="Pilot release")
    p = world.outline("alpha")
    row = find(p["initiatives"], ref=ini)
    assert row["milestones"] == []
    assert len(p["not_placed"]["milestones"]) == 1
    assert len(p["not_placed"]["objectives"]) == 1
    # the shared item is still the initiative's work, just not under any goal
    assert [t["ref"] for t in row["not_placed"]["tasks"]] == [ref]
    # Nothing was linked just because the titles matched: the milestone and the
    # objective both carry no parent, and the item is under no goal.
    assert p["not_placed"]["milestones"][0]["initiative_ref"] is None
    assert p["not_placed"]["objectives"][0]["milestone_id"] is None
    assert p["not_placed"]["goals"] == []


def test_work_bound_to_an_initiative_but_under_no_goal_gets_its_own_group(world):
    ini, mid, oid, gid, _ = _chain(world, "alpha")
    loose = world.item("alpha", "loose", status="in_progress", initiative=ini)
    row = find(world.outline("alpha")["initiatives"], ref=ini)
    assert [i["ref"] for i in row["not_placed"]["tasks"]] == [loose]
    assert row["not_placed"]["tasks"][0]["bucket"] == "building"
    # initiative totals are the de-duplicated union of the ladder and the loose work
    assert row["delivery"]["total"] == 2
    # The loose task is the initiative's work but under no goal, so the goal's
    # own task list does not include it.
    assert loose not in [t["ref"] for t in find(world.outline("alpha")["goals"], id=gid)["tasks"]]
    # It is also not under any milestone's objective chain: it is genuinely
    # unplaced, listed only in the initiative's own "not placed" group.
    all_tasks = [t["ref"] for ms in find(world.outline("alpha")["initiatives"], ref=ini)["milestones"]
                 for obj in ms["objectives"] for g in obj["goals"] for t in g["tasks"]]
    assert loose not in all_tasks


def test_host_failure_gives_unavailable_never_zeros(store, clock):
    class FlakyHost(ReferenceKanbanAdapter):
        def list_work(self, project_id):
            if project_id == "alpha":
                raise RuntimeError("canonical host did not respond")
            return super().list_work(project_id)

    w = World(store, clock, adapter=FlakyHost(store))
    w.project("alpha")
    w.project("beta")
    ini = w.initiative("alpha", "Ship", status="executing")
    mid = w.milestone("alpha", "Pilot")
    oid = w.objective("alpha", "Obj")
    goal = w.goal("alpha", "Goal")
    w.place_milestone("alpha", mid, ini)
    w.place_objective("alpha", oid, mid)
    w.place_goal("alpha", goal, oid)
    # A task already placed under the goal (written directly, since the flaky
    # host is down for alpha): with the host down its status is unknown, so the
    # goal is unknown — never a false "not started" and never a false "met".
    ref = w.item("beta", "borrow")  # create in beta where the host is up
    with w.store.tx() as cx:
        cx.execute(
            "INSERT INTO goal_tasks(item_ref,project_id,goal_id,created_at)"
            " VALUES(?,?,?,?)", (ref, "alpha", goal, "2026-01-01"))
    beta_ini = w.initiative("beta", "Fine")
    projects = {p["id"]: p for p in w.roadmap.roadmap()["projects"]}
    a = projects["alpha"]
    assert a["work_host"] == "unavailable"
    row = find(a["initiatives"], ref=ini)
    assert row["delivery"] == {"state": "unavailable", "reason": "host_unavailable"}
    assert find(row["milestones"], id=mid)["delivery"] == {
        "state": "unavailable", "reason": "host_unavailable"}
    # The goal's task list is unknown (host down), never a false zero or met.
    goal_row = find(a["goals"], id=goal)
    assert goal_row["state"] == "unknown" and goal_row["task_count"] == 1
    assert goal_row["delivery"] == {"state": "unavailable", "reason": "host_unavailable"}
    # one failing project must not take the others down
    assert projects["beta"]["work_host"] == "ok"
    assert find(projects["beta"]["initiatives"], ref=beta_ini)["delivery"] == {
        "state": "no_linked_work"}


@pytest.mark.parametrize("state,expected", [
    ("passed", "passed"), ("failed", "failed"), ("stale", "stale"), (None, "unknown"),
])
def test_objective_outcome_states_pass_through(world, state, expected):
    oid = world.objective("alpha", "Obj", state=state)
    obj = find(world.outline("alpha")["objectives"], id=oid)
    assert obj["id"] == oid
    assert obj["check"]["state"] == expected
    assert obj["check"]["window"] == "30d"
    if state is None:
        assert obj["check"]["evaluated_at"] is None
    else:
        assert obj["check"]["evaluated_at"].startswith("2026-08-21")


def test_disabled_objective_is_not_applicable(world):
    """Was test_archived_objective_is_unavailable_not_applicable (and absorbs
    test_disabled_objectives_do_not_count_toward_a_goal).

    v42 lists only enabled objectives, so a disabled one is not shown at all and
    cannot inflate or deflate any roll-up.
    """
    live = world.objective("alpha", "Live", state="passed")
    gone = world.objective("alpha", "Gone", state="failed")
    world.svc.archive_objective("alpha", gone, actor="owner", interface="test")
    objectives = world.outline("alpha")["objectives"]
    # A disabled objective is not listed at all, so nothing is misreported.
    assert [o["id"] for o in objectives] == [live]
    # It is absent from the objective list entirely, so it never counts.
    assert gone not in [o["id"] for o in objectives]


def test_evaluator_error_becomes_unknown_not_a_crash(world, monkeypatch):
    oid = world.objective("alpha", "Obj", state="passed")

    def boom(*_a, **_k):
        raise RuntimeError("evaluator exploded")

    monkeypatch.setattr(world.svc, "objective_evidence", boom)
    obj = find(world.outline("alpha")["objectives"], id=oid)
    assert obj["check"]["state"] == "unknown"
    assert obj["check"]["evaluated_at"] is None


def test_goal_states_follow_the_ladder(world):
    """Was test_goal_states_follow_the_packet.

    v42 derives a goal from its TASKS and its own check, not from objectives:
    met when every task is done and the check passes (if it has one).
    """
    met = world.goal("alpha", "All done")
    world.place_task("alpha", world.item("alpha", "done item", status="done"), met)
    risk = world.goal("alpha", "One failed")
    world.ladder.set_goal_check("alpha", risk, {"evaluator_type": "manual", "target": ">=1"},
                                actor="owner")
    world.ladder.record_goal_assessment(
        "alpha", risk, passed=False, evidence=["t:1"],
        trusted_principal="owner", interface="desktop")
    building = world.goal("alpha", "Still working")
    world.place_task("alpha", world.item("alpha", "working item", status="in_progress"), building)
    bare = world.goal("alpha", "No tasks")
    # A goal with a check that has never been evaluated is unknown, not met.
    unchecked = world.goal("alpha", "Unassessed")
    world.ladder.set_goal_check("alpha", unchecked, {"evaluator_type": "manual", "target": ">=1"},
                                actor="owner")
    goals = {g["id"]: g for g in world.outline("alpha")["goals"]}
    assert goals[met]["state"] == "met" and goals[met]["task_count"] == 1
    assert goals[risk]["state"] == "at_risk"
    assert goals[building]["state"] == "in_progress"
    # An empty parent is never met.
    assert goals[bare]["state"] == "not_started" and goals[bare]["task_count"] == 0
    # An unassessed check is honestly unknown, never optimistically met.
    assert goals[unchecked]["state"] == "unknown"
    assert goals[unchecked]["check"]["state"] == "unknown"
    # A goal with tasks all done but NO check is met (the check is optional).
    assert goals[met]["check"]["state"] == "no_check"
    # A goal with tasks done AND a passing check is met; a failing check is
    # at_risk even when every task is done.
    passed = world.goal("alpha", "Checked and green")
    world.place_task("alpha", world.item("alpha", "checked done", status="done"), passed)
    world.ladder.set_goal_check("alpha", passed, {"evaluator_type": "manual", "target": ">=1"},
                                actor="owner")
    world.ladder.record_goal_assessment(
        "alpha", passed, passed=True, evidence=["t:2"],
        trusted_principal="owner", interface="desktop")
    goals = {g["id"]: g for g in world.outline("alpha")["goals"]}
    assert goals[passed]["state"] == "met" and goals[passed]["check"]["state"] == "passed"
    # Every goal here is unplaced (no objective parent), which is allowed.
    assert all(g["objective_id"] is None for g in goals.values())


def test_an_unplaced_goal_has_no_objective(world):
    """Was test_objective_with_no_goal_has_goal_none, from the other end."""
    gid = world.goal("alpha", "Goal")
    assert find(world.outline("alpha")["goals"], id=gid)["objective_id"] is None


def test_a_milestone_has_exactly_one_initiative(world):
    """Was test_a_milestone_under_two_initiatives_appears_under_both_with_also_under.

    The 0.4.0 model let a milestone sit under two initiatives with an
    "also_under" list. v42 is a strict one-parent ladder (D-L1), so the second
    placement moves the milestone.
    """
    one = world.initiative("alpha", "One", status="executing")
    two = world.initiative("alpha", "Two", status="executing")
    mid = world.milestone("alpha", "Shared")
    world.place_milestone("alpha", mid, one)
    world.place_milestone("alpha", mid, two)
    p = world.outline("alpha")
    assert find(p["initiatives"], ref=one)["milestones"] == []
    assert [m["id"] for m in find(p["initiatives"], ref=two)["milestones"]] == [mid]
    assert p["not_placed"]["milestones"] == []
    # The stored parent is exactly the second initiative, and only one row.
    assert world.store._conn.execute(
        "SELECT initiative_ref FROM dockyard_milestones WHERE id=?", (mid,)
    ).fetchone()[0] == two
    # A third initiative taking it moves it again; the first two keep none.
    three = world.initiative("alpha", "Three", status="executing")
    world.place_milestone("alpha", mid, three)
    p = world.outline("alpha")
    assert find(p["initiatives"], ref=two)["milestones"] == []
    assert [m["id"] for m in find(p["initiatives"], ref=three)["milestones"]] == [mid]
    # Unplacing leaves it "Not placed yet" under every initiative.
    world.place_milestone("alpha", mid, None)
    p = world.outline("alpha")
    assert [m["id"] for m in p["not_placed"]["milestones"]] == [mid]
    assert all(i["milestones"] == [] for i in p["initiatives"])


def test_an_objective_has_exactly_one_milestone(world):
    """Was test_an_objective_serving_two_initiatives_is_rendered_under_each."""
    m1 = world.milestone("alpha", "Pilot")
    m2 = world.milestone("alpha", "Second")
    oid = world.objective("alpha", "Shared obj", state="passed")
    world.place_objective("alpha", oid, m1)
    world.place_objective("alpha", oid, m2)
    p = world.outline("alpha")
    assert find(p["objectives"], id=oid)["milestone_id"] == m2
    assert [o["id"] for o in find(p["milestones"], id=m2)["objectives"]] == [oid]
    # The first milestone no longer claims it.
    assert find(p["milestones"], id=m1)["objectives"] == []


def test_archived_milestones_are_hidden(world):
    """Was test_archived_milestone_link_is_unavailable_with_no_counts."""
    ini = world.initiative("alpha", "Ship", status="executing")
    mid = world.milestone("alpha", "Old")
    world.place_milestone("alpha", mid, ini)
    world.dy.milestone_archive("alpha", "Old", actor=HUMAN)
    row = find(world.outline("alpha")["initiatives"], ref=ini)
    assert row["milestones"] == []
    assert world.outline("alpha")["milestones"] == []
    # the initiative has no reachable work, so it is not ready to confirm
    assert row["ready_to_confirm"] is False


def test_archived_goals_are_hidden(world):
    """Was test_archived_goal_is_hidden_from_the_list_and_unavailable_under_its_objective."""
    oid = world.objective("alpha", "Obj", state="passed")
    gid = world.goal("alpha", "Old goal")
    world.place_goal("alpha", gid, oid)
    world.svc.archive_goal("alpha", gid, actor="owner", interface="test")
    p = world.outline("alpha")
    assert p["goals"] == []
    assert find(p["objectives"], id=oid)["goals"] == []


# ---- attention ------------------------------------------------------------------

def _reasons(world, ref):
    return find(world.outline("alpha")["initiatives"], ref=ref)["attention_reasons"]


def test_attention_reasons_are_raised_for_each_documented_condition(world):
    pending = world.initiative("alpha", "Pending", status="pending_approval")
    assert "pending_approval" in _reasons(world, pending)

    blocked = world.initiative("alpha", "Blocked", status="executing")
    world.item("alpha", "stuck", status="blocked", initiative=blocked)
    assert "blocked_items" in _reasons(world, blocked)

    overdue = world.initiative("alpha", "Overdue", status="executing")
    mid = world.milestone("alpha", "Late", due="2026-08-01")
    world.place_milestone("alpha", mid, overdue)
    assert "milestone_overdue" in _reasons(world, overdue)

    # An initiative with no milestone and no objective is flagged for both, so
    # an empty ladder is never silently "fine".
    bare = world.initiative("alpha", "Bare", status="executing")
    reasons = _reasons(world, bare)
    assert "no_milestone_link" in reasons and "no_objective_link" in reasons
    # A milestone whose objective is at risk / unknown surfaces that too.
    risky = world.initiative("alpha", "Risky", status="executing")
    rmid = world.milestone("alpha", "Risky ms")
    world.place_milestone("alpha", rmid, risky)
    world.ladder.set_goal_check("alpha", world.goal("alpha", "G"), None, actor="owner")
    roid = world.objective("alpha", "Unassessed")  # manual, never assessed -> unknown
    world.place_objective("alpha", roid, rmid)
    assert "objective_unknown" in _reasons(world, risky)


def test_a_healthy_initiative_raises_no_attention(world):
    ini, mid, oid, gid, _ = _chain(world, "alpha")
    row = find(world.outline("alpha")["initiatives"], ref=ini)
    assert row["attention_reasons"] == []
    assert {gid, oid, mid} == {gid, oid, mid}


def test_closed_or_future_milestones_are_not_overdue(world):
    ini = world.initiative("alpha", "Ship", status="executing")
    closed = world.milestone("alpha", "Closed late", due="2026-08-01")
    world.dy.milestone_update("alpha", "Closed late", due=None, closed=True, actor=HUMAN)
    future = world.milestone("alpha", "Future", due="2026-12-31")
    world.place_milestone("alpha", closed, ini)
    world.place_milestone("alpha", future, ini)
    rows = {m["id"]: m for m in find(world.outline("alpha")["initiatives"], ref=ini)["milestones"]}
    assert rows[future]["overdue"] is False and rows[future]["closed"] is False
    # A closed milestone is never overdue even though its due date has passed.
    assert rows[closed]["overdue"] is False and rows[closed]["closed"] is True
    assert "milestone_overdue" not in _reasons(world, ini)


def test_project_attention_follows_unplaced_objectives(world):
    """Was test_project_attention_follows_initiatives_and_unlinked_groups.

    The 0.4.0 read model raised "objective_unknown" from a project-level scan of
    unlinked objectives. v42 reports each level's own state, and a project-level
    attention signal comes from what is unplaced, so this asserts the new
    equivalent: an unplaced objective is listed, never silently dropped.
    """
    world.objective("alpha", "needs evidence")           # unplaced, never assessed
    p = world.outline("alpha")
    assert [o["name"] for o in p["not_placed"]["objectives"]] == ["needs evidence"]
    assert p["not_placed"]["objectives"][0]["state"] == "unknown"


# ---- feature toggles -------------------------------------------------------------

def test_initiatives_off_shows_the_off_state_and_nothing_under_it(world):
    ini, mid, _o, _g, _t = _chain(world, "alpha")
    orphan = world.milestone("alpha", "Orphan")
    world.svc.update_features("alpha", {"initiatives": False}, actor="owner", interface="test")
    p = world.outline("alpha")
    assert p["features"]["initiatives"] is False
    assert p["initiatives"] == []
    # The placed milestone is under the (now hidden) initiative, so it is not
    # reachable through the tree; the unplaced "Orphan" is still listed because
    # it belongs to the project, not to an initiative.
    assert [m["id"] for m in p["not_placed"]["milestones"]] == [orphan]
    # toggling hid data, never deleted it
    world.svc.update_features("alpha", {"initiatives": True}, actor="owner", interface="test")
    assert find(world.outline("alpha")["initiatives"], ref=ini)["milestones"][0]["id"] == mid


def test_milestones_off_hides_milestones_and_their_children(world):
    """Was test_milestones_off_moves_all_initiative_work_to_not_in_a_milestone.

    v42 hides a switched-off level rather than relabelling its work, so the
    objective of a hidden milestone is hidden with it; nothing is deleted.
    """
    ini, mid, oid, _g, _t = _chain(world, "alpha")
    world.milestone("alpha", "Orphan")
    world.svc.update_features("alpha", {"milestones": False}, actor="owner", interface="test")
    p = world.outline("alpha")
    assert p["features"] == {"initiatives": True, "milestones": False}
    assert p["milestones"] == [] and p["not_placed"]["milestones"] == []
    assert find(p["initiatives"], ref=ini)["milestones"] == []
    # The hidden milestone is gone from the tree, so its objective is not
    # reachable under any milestone, and the initiative is not "ready to
    # confirm" just because its milestone vanished from view.
    assert all(m["objectives"] == [] for m in p["milestones"])
    assert find(p["initiatives"], ref=ini)["ready_to_confirm"] is False
    # toggling back restores exactly what was hidden
    world.svc.update_features("alpha", {"milestones": True}, actor="owner", interface="test")
    assert [m["id"] for m in find(world.outline("alpha")["initiatives"], ref=ini)["milestones"]] == [mid]


# ---- project selection / errors ---------------------------------------------------- //

def test_project_filter_and_unknown_project(world):
    world.project("beta")
    assert [p["id"] for p in world.roadmap.roadmap()["projects"]] == ["alpha", "beta"]
    assert [p["id"] for p in world.roadmap.roadmap("beta")["projects"]] == ["beta"]
    with pytest.raises(RoadmapNotFound):
        world.roadmap.roadmap("ghost")


# ---- performance budget ------------------------------------------------------------- //

def test_outline_makes_one_canonical_list_call_per_project_and_no_item_detail_calls(store, clock):
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
    for pid in ("alpha", "beta"):
        w.project(pid)
        _chain(w, pid)
    calls.update(list_work=0, get_work=0, list_work_links=0)
    w.roadmap.roadmap()
    assert calls == {"list_work": 2, "get_work": 0, "list_work_links": 0}


# ---- milestone items (loaded on open) ------------------------------------------------- //

def test_milestone_items_returns_stages_and_blockers(world):
    _ini, mid, _o, gid, _t = _chain(world, "alpha", task_status="backlog")
    base = world.item("alpha", "base", status="in_progress")
    waiting = world.item("alpha", "waiting")
    world.place_task("alpha", base, gid)
    world.place_task("alpha", waiting, gid)
    world.adapter.link_work("alpha", base, waiting)           # waiting depends on base
    finished = world.item("alpha", "finished", status="done")
    world.place_task("alpha", finished, gid)
    out = world.roadmap.milestone_items("alpha", mid)
    assert out["state"] == "ok"
    assert out["milestone"]["id"] == mid and out["milestone"]["name"] == "Pilot"
    by_ref = {i["ref"]: i for i in out["items"]}
    assert by_ref[waiting]["bucket"] == "planned" and by_ref[waiting]["blockers"] == [base]
    assert by_ref[base]["bucket"] == "building" and by_ref[base]["blockers"] == []
    done = next(i for i in out["items"] if i["bucket"] == "complete")
    assert done["blockers"] == []
    assert out["delivery"]["total"] == 4


def test_milestone_items_refusals(world):
    world.project("beta")
    ini = world.initiative("alpha", "Ship", status="executing")
    mid = world.milestone("alpha", "Pilot")
    world.place_milestone("alpha", mid, ini)
    with pytest.raises(RoadmapNotFound):
        world.roadmap.milestone_items("alpha", 9999)
    with pytest.raises(RoadmapNotFound):
        world.roadmap.milestone_items("beta", mid)           # exists, but not in beta
    with pytest.raises(RoadmapNotFound):
        world.roadmap.milestone_items("ghost", mid)
    world.svc.update_features("alpha", {"milestones": False}, actor="owner", interface="test")
    with pytest.raises(FeatureDisabledError):
        world.roadmap.milestone_items("alpha", mid)
    # A valid, in-project, feature-on milestone reads fine (the refusals above
    # are about the wrong project / unknown id / switched-off feature, not the
    # happy path).
    world.svc.update_features("alpha", {"milestones": True}, actor="owner", interface="test")
    ok = world.roadmap.milestone_items("alpha", mid)
    assert ok["state"] == "ok" and ok["milestone"]["id"] == mid


def test_milestone_items_host_failure_is_unavailable_not_empty(store, clock):
    class Down(ReferenceKanbanAdapter):
        down = False

        def list_work(self, project_id):
            if self.down:
                raise RuntimeError("down")
            return super().list_work(project_id)

    adapter = Down(store)
    w = World(store, clock, adapter=adapter)
    w.project("alpha")
    mid = w.milestone("alpha", "Pilot")
    adapter.down = True
    out = w.roadmap.milestone_items("alpha", mid)
    assert out["state"] == "unavailable" and out["items"] == []
    assert out["delivery"] == {"state": "unavailable", "reason": "host_unavailable"}


# ---- milestone ids are exposed (additive) ------------------------------------------------ //

def test_milestone_list_and_read_output_carry_the_id(world):
    mid = world.milestone("alpha", "Pilot")
    listed = world.dy.milestone_list("alpha")
    assert [m["id"] for m in listed] == [mid]
    assert world.dy.milestone_progress("alpha", "Pilot")["id"] == mid
    plain = World.__new__(World)
    plain.store = world.store
    from hermes_project_stewardship.persistence.dockyard_service import DockyardService
    no_host = DockyardService(world.store)
    assert [m["id"] for m in no_host.milestone_list("alpha")] == [mid]
    assert no_host.milestone_progress("alpha", "Pilot")["id"] == mid
    # renaming keeps identity: the id survives a rename
    world.dy.milestone_rename("alpha", "Pilot", "Pilot v2", actor=HUMAN)
    assert world.dy.milestone_list("alpha")[0]["id"] == mid
