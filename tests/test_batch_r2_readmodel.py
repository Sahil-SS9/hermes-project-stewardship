"""Batch R2 read model: honest roll-ups, explicit unlinked groups, no inference."""
from __future__ import annotations

import pytest

from hermes_project_stewardship.kanban import ReferenceKanbanAdapter
from hermes_project_stewardship.persistence.roadmap_service import RoadmapNotFound
from hermes_project_stewardship.persistence.service import FeatureDisabledError
from tests.r2_helpers import HUMAN, World, find


@pytest.fixture()
def world(store, clock):
    w = World(store, clock)
    w.project("alpha")
    return w


def _delivery_keys(delivery):
    return {k: v for k, v in delivery.items() if k not in ("state", "reason")}


def test_empty_project_has_a_complete_but_empty_outline(world):
    p = world.outline("alpha")
    assert p["id"] == "alpha" and p["label"] == "alpha" and p["mission"] == "alpha mission"
    assert p["enabled"] is True
    assert p["features"] == {"initiatives": True, "milestones": True}
    assert p["initiatives"] == [] and p["goals"] == []
    assert p["unlinked"] == {"milestones": [], "objectives": []}
    assert p["work_host"] == "ok" and p["attention"] is False


def test_full_chain_counts_buckets_and_keeps_blocked_separate(world):
    ini = world.initiative("alpha", "Simplify setup")
    mid = world.milestone("alpha", "Pilot")
    world.link_milestone("alpha", ini, mid)
    world.item("alpha", "planned", milestone="Pilot")
    world.item("alpha", "building", status="in_progress", milestone="Pilot")
    world.item("alpha", "review", status="in_review", milestone="Pilot")
    world.item("alpha", "complete", status="done", milestone="Pilot")
    world.item("alpha", "stuck", status="blocked", milestone="Pilot")
    row = world.outline("alpha")["initiatives"][0]
    assert row["ref"] == ini and row["title"] == "Simplify setup"
    assert row["governance"] == "approved"
    expected = {"state": "ok", "planned": 1, "building": 1, "ready_for_review": 1,
                "complete": 1, "blocked": 1, "unknown": 0, "total": 5}
    assert row["delivery"] == expected
    ms = find(row["milestones"], id=mid)
    assert ms["name"] == "Pilot" and ms["relationship"] == "delivers"
    assert ms["delivery"] == expected
    # blocked items carry no stage and never inflate another bucket
    assert sum(ms["delivery"][k] for k in
               ("planned", "building", "ready_for_review", "complete", "blocked", "unknown")) == 5


def test_there_is_never_a_blended_score_or_percentage(world):
    ini = world.initiative("alpha", "Ship")
    mid = world.milestone("alpha", "Pilot")
    world.link_milestone("alpha", ini, mid)
    world.item("alpha", "done", status="done", milestone="Pilot")
    oid = world.objective("alpha", "Obj", state="passed")
    world.link_objective("alpha", oid, ini)
    world.goal("alpha", "Goal", [oid])
    blob = repr(world.roadmap.roadmap("alpha")).lower()
    for banned in ("percent", "progress", "score", "health", "pct"):
        assert banned not in blob, banned


def test_no_linked_work_has_no_counts_and_no_percentage(world):
    ini = world.initiative("alpha", "Empty")
    mid = world.milestone("alpha", "Nothing attached")
    world.link_milestone("alpha", ini, mid)
    row = world.outline("alpha")["initiatives"][0]
    assert row["delivery"] == {"state": "no_linked_work"}
    assert find(row["milestones"], id=mid)["delivery"] == {"state": "no_linked_work"}
    assert row["unmilestoned_work"] == {"state": "ok", "count": 0, "items": []}


def test_not_linked_groups_list_orphans_and_hide_archived(world):
    ini = world.initiative("alpha", "Linked")
    linked_ms = world.milestone("alpha", "Linked ms")
    world.link_milestone("alpha", ini, linked_ms)
    orphan_ms = world.milestone("alpha", "Orphan ms")
    archived_ms = world.milestone("alpha", "Archived orphan")
    world.dy.milestone_archive("alpha", "Archived orphan", actor=HUMAN)
    linked_obj = world.objective("alpha", "Linked obj")
    world.link_objective("alpha", linked_obj, ini)
    orphan_obj = world.objective("alpha", "Orphan obj")
    archived_obj = world.objective("alpha", "Archived orphan obj")
    world.svc.archive_objective("alpha", archived_obj, actor="owner", interface="test")
    p = world.outline("alpha")
    assert [m["id"] for m in p["unlinked"]["milestones"]] == [orphan_ms]
    assert [o["id"] for o in p["unlinked"]["objectives"]] == [orphan_obj]
    assert archived_ms not in [m["id"] for m in p["unlinked"]["milestones"]]
    assert p["unlinked"]["milestones"][0]["relationship"] is None
    assert p["unlinked"]["objectives"][0]["relationship"] is None
    assert p["unlinked"]["milestones"][0]["delivery"] == {"state": "no_linked_work"}


def test_nothing_is_ever_inferred_from_titles_or_shared_work(world):
    ini = world.initiative("alpha", "Pilot release")
    world.milestone("alpha", "Pilot release")          # same title as the initiative
    world.objective("alpha", "Pilot release")           # and the objective
    ref = world.item("alpha", "shared", initiative=ini, milestone="Pilot release")
    p = world.outline("alpha")
    row = p["initiatives"][0]
    assert row["milestones"] == [] and row["objectives"] == []
    assert len(p["unlinked"]["milestones"]) == 1 and len(p["unlinked"]["objectives"]) == 1
    assert "no_milestone_link" in row["attention_reasons"]
    assert "no_objective_link" in row["attention_reasons"]
    # the shared item is still the initiative's work, just not under any milestone
    assert row["unmilestoned_work"]["items"][0]["ref"] == ref


def test_work_bound_to_an_initiative_but_in_no_milestone_gets_its_own_group(world):
    ini = world.initiative("alpha", "Ship")
    mid = world.milestone("alpha", "Pilot")
    world.link_milestone("alpha", ini, mid)
    in_ms = world.item("alpha", "in milestone", milestone="Pilot", initiative=ini)
    loose = world.item("alpha", "loose", status="in_progress", initiative=ini)
    via_ms_only = world.item("alpha", "ms only", status="done", milestone="Pilot")
    row = world.outline("alpha")["initiatives"][0]
    assert row["unmilestoned_work"]["count"] == 1
    assert [i["ref"] for i in row["unmilestoned_work"]["items"]] == [loose]
    assert row["unmilestoned_work"]["items"][0]["bucket"] == "building"
    # initiative totals are the de-duplicated union of both routes to a work item
    assert row["delivery"]["total"] == 3
    assert {in_ms, loose, via_ms_only}


def test_host_failure_gives_unavailable_never_zeros(store, clock):
    class FlakyHost(ReferenceKanbanAdapter):
        def list_work(self, project_id):
            if project_id == "alpha":
                raise RuntimeError("canonical host did not respond")
            return super().list_work(project_id)

    w = World(store, clock, adapter=FlakyHost(store))
    w.project("alpha")
    w.project("beta")
    ini = w.initiative("alpha", "Ship")
    mid = w.milestone("alpha", "Pilot")
    w.link_milestone("alpha", ini, mid)
    beta_ini = w.initiative("beta", "Fine")
    projects = {p["id"]: p for p in w.roadmap.roadmap()["projects"]}
    a = projects["alpha"]
    assert a["work_host"] == "unavailable"
    row = a["initiatives"][0]
    assert row["delivery"] == {"state": "unavailable", "reason": "host_unavailable"}
    assert find(row["milestones"], id=mid)["delivery"] == {"state": "unavailable", "reason": "host_unavailable"}
    assert row["unmilestoned_work"] == {"state": "unavailable", "count": None, "items": []}
    assert "blocked_items" not in row["attention_reasons"]
    # one failing project must not take the others down
    assert projects["beta"]["work_host"] == "ok"
    assert projects["beta"]["initiatives"][0]["ref"] == beta_ini
    assert projects["beta"]["initiatives"][0]["delivery"] == {"state": "no_linked_work"}


@pytest.mark.parametrize("state,expected", [
    ("passed", "passed"), ("failed", "failed"), ("stale", "stale"), (None, "unknown"),
])
def test_objective_outcome_states_pass_through(world, state, expected):
    ini = world.initiative("alpha", "Ship")
    oid = world.objective("alpha", "Obj", state=state)
    world.link_objective("alpha", oid, ini)
    obj = world.outline("alpha")["initiatives"][0]["objectives"][0]
    assert obj["id"] == oid and obj["relationship"] == "supports"
    assert obj["outcome"]["state"] == expected
    assert obj["outcome"]["window"] == "30d"
    if state is None:
        assert obj["outcome"]["evaluated_at"] is None
    else:
        assert obj["outcome"]["evaluated_at"].startswith("2026-08-21")


def test_archived_objective_is_unavailable_not_applicable(world):
    ini = world.initiative("alpha", "Ship")
    oid = world.objective("alpha", "Obj", state="passed")
    world.link_objective("alpha", oid, ini)
    world.svc.archive_objective("alpha", oid, actor="owner", interface="test")
    obj = world.outline("alpha")["initiatives"][0]["objectives"][0]
    assert obj["unavailable"] == "archived" and obj["enabled"] is False
    assert obj["outcome"]["state"] == "not_applicable"


def test_evaluator_error_becomes_unknown_not_a_crash(world, monkeypatch):
    ini = world.initiative("alpha", "Ship")
    oid = world.objective("alpha", "Obj", state="passed")
    world.link_objective("alpha", oid, ini)

    def boom(*_a, **_k):
        raise RuntimeError("evaluator exploded")

    monkeypatch.setattr(world.svc, "objective_evidence", boom)
    obj = world.outline("alpha")["initiatives"][0]["objectives"][0]
    assert obj["outcome"]["state"] == "unknown"
    assert obj["outcome"]["evaluated_at"] is None


def test_goal_states_follow_the_packet(world):
    ini = world.initiative("alpha", "Ship")
    # An objective belongs to at most one goal, so each goal gets its own.
    passed = world.objective("alpha", "p", state="passed")
    risk_ok = world.objective("alpha", "risk-ok", state="passed")
    failed = world.objective("alpha", "f", state="failed")
    unk_ok = world.objective("alpha", "unk-ok", state="passed")
    stale = world.objective("alpha", "s", state="stale")
    nothing = world.objective("alpha", "n")
    g_none = world.goal("alpha", "No objectives")
    g_met = world.goal("alpha", "All passed", [passed])
    g_risk = world.goal("alpha", "One failed", [risk_ok, failed])
    g_unknown = world.goal("alpha", "Stale evidence", [unk_ok, stale])
    g_unknown2 = world.goal("alpha", "No evidence", [nothing])
    world.link_objective("alpha", passed, ini)
    goals = {g["id"]: g for g in world.outline("alpha")["goals"]}
    assert goals[g_none]["state"] == "unproven" and goals[g_none]["objectives_linked"] == 0
    assert goals[g_met]["state"] == "met" and goals[g_met]["objectives_passed"] == 1
    assert goals[g_risk]["state"] == "at_risk"
    assert goals[g_unknown]["state"] == "unknown"
    assert goals[g_unknown2]["state"] == "unknown"
    # a count is only given when every linked objective has a known evaluation
    assert goals[g_unknown]["objectives_passed"] is None
    assert goals[g_unknown2]["objectives_passed"] is None
    assert goals[g_risk]["objectives_linked"] == 2
    # the same goal shows up as context under the initiative's objective
    shown = world.outline("alpha")["initiatives"][0]["objectives"][0]["goal"]
    assert shown["id"] == g_met and shown["title"] == "All passed" and shown["state"] == "met"


def test_disabled_objectives_do_not_count_toward_a_goal(world):
    passed = world.objective("alpha", "p", state="passed")
    gone = world.objective("alpha", "gone", state="failed")
    gid = world.goal("alpha", "G", [passed, gone])
    world.svc.archive_objective("alpha", gone, actor="owner", interface="test")
    goal = find(world.outline("alpha")["goals"], id=gid)
    assert goal["state"] == "met" and goal["objectives_linked"] == 1


def test_archived_goal_is_hidden_from_the_list_and_unavailable_under_its_objective(world):
    ini = world.initiative("alpha", "Ship")
    oid = world.objective("alpha", "Obj", state="passed")
    gid = world.goal("alpha", "Old goal", [oid])
    world.link_objective("alpha", oid, ini)
    world.svc.archive_goal("alpha", gid, actor="owner", interface="test")
    p = world.outline("alpha")
    assert p["goals"] == []
    goal = p["initiatives"][0]["objectives"][0]["goal"]
    assert goal["id"] == gid and goal["unavailable"] == "archived" and goal["state"] == "unknown"


def test_objective_with_no_goal_has_goal_none(world):
    ini = world.initiative("alpha", "Ship")
    oid = world.objective("alpha", "Obj")
    world.link_objective("alpha", oid, ini)
    assert world.outline("alpha")["initiatives"][0]["objectives"][0]["goal"] is None


def test_a_milestone_under_two_initiatives_appears_under_both_with_also_under(world):
    one = world.initiative("alpha", "One")
    two = world.initiative("alpha", "Two")
    mid = world.milestone("alpha", "Shared")
    world.item("alpha", "shared item", milestone="Shared")
    world.link_milestone("alpha", one, mid)
    world.link_milestone("alpha", two, mid, "depends_on")
    rows = {r["ref"]: r for r in world.outline("alpha")["initiatives"]}
    a, b = rows[one]["milestones"][0], rows[two]["milestones"][0]
    assert a["id"] == b["id"] == mid
    assert a["relationship"] == "delivers" and b["relationship"] == "depends_on"
    assert [x["ref"] for x in a["also_under"]] == [two]
    assert [x["ref"] for x in b["also_under"]] == [one]
    assert a["also_under"][0]["title"] == "Two"
    assert rows[one]["delivery"]["total"] == rows[two]["delivery"]["total"] == 1
    assert world.outline("alpha")["unlinked"]["milestones"] == []


def test_an_objective_serving_two_initiatives_is_rendered_under_each(world):
    one = world.initiative("alpha", "One")
    two = world.initiative("alpha", "Two")
    oid = world.objective("alpha", "Shared obj", state="passed")
    world.link_objective("alpha", oid, one)
    world.link_objective("alpha", oid, two, "measures")
    rows = {r["ref"]: r for r in world.outline("alpha")["initiatives"]}
    assert rows[one]["objectives"][0]["relationship"] == "supports"
    assert rows[two]["objectives"][0]["relationship"] == "measures"
    assert world.outline("alpha")["unlinked"]["objectives"] == []


def test_archived_milestone_link_is_unavailable_with_no_counts(world):
    ini = world.initiative("alpha", "Ship")
    mid = world.milestone("alpha", "Old")
    world.item("alpha", "old item", milestone="Old")
    world.link_milestone("alpha", ini, mid)
    world.dy.milestone_archive("alpha", "Old", actor=HUMAN)
    row = world.outline("alpha")["initiatives"][0]["milestones"][0]
    assert row["archived"] is True and row["unavailable"] == "archived"
    assert row["delivery"] == {"state": "unavailable", "reason": "archived"}
    # its items do not leak into the initiative's own counts
    assert world.outline("alpha")["initiatives"][0]["delivery"] == {"state": "no_linked_work"}


# ---- attention ------------------------------------------------------------------

def _reasons(world, ref):
    return find(world.outline("alpha")["initiatives"], ref=ref)["attention_reasons"]


def test_attention_reasons_are_raised_for_each_documented_condition(world):
    pending = world.initiative("alpha", "Pending", status="pending_approval")
    assert "pending_approval" in _reasons(world, pending)

    blocked = world.initiative("alpha", "Blocked")
    world.item("alpha", "stuck", status="blocked", initiative=blocked)
    assert "blocked_items" in _reasons(world, blocked)

    overdue = world.initiative("alpha", "Overdue")
    mid = world.milestone("alpha", "Late", due="2026-08-01")
    world.link_milestone("alpha", overdue, mid)
    assert "milestone_overdue" in _reasons(world, overdue)

    for state, code in (("failed", "objective_failed"), ("stale", "objective_stale"), (None, "objective_unknown")):
        ini = world.initiative("alpha", f"Obj {state}")
        world.link_objective("alpha", world.objective("alpha", f"o-{state}", state=state), ini)
        assert code in _reasons(world, ini)

    bare = world.initiative("alpha", "Bare")
    assert {"no_milestone_link", "no_objective_link"} <= set(_reasons(world, bare))


def test_a_healthy_initiative_raises_no_attention(world):
    ini = world.initiative("alpha", "Fine")
    mid = world.milestone("alpha", "On time", due="2027-01-01")
    world.link_milestone("alpha", ini, mid)
    world.item("alpha", "done", status="done", milestone="On time")
    world.link_objective("alpha", world.objective("alpha", "ok", state="passed"), ini)
    row = world.outline("alpha")["initiatives"][0]
    assert row["attention_reasons"] == [] and row["attention"] is False
    assert world.outline("alpha")["attention"] is False


def test_closed_or_future_milestones_are_not_overdue(world):
    ini = world.initiative("alpha", "Ship")
    closed = world.milestone("alpha", "Closed late", due="2026-08-01")
    world.dy.milestone_update("alpha", "Closed late", due=None, closed=True, actor=HUMAN)
    future = world.milestone("alpha", "Future", due="2026-12-31")
    world.link_milestone("alpha", ini, closed)
    world.link_milestone("alpha", ini, future)
    rows = {m["id"]: m for m in world.outline("alpha")["initiatives"][0]["milestones"]}
    assert rows[closed]["overdue"] is False and rows[closed]["closed"] is True
    assert rows[future]["overdue"] is False
    assert "milestone_overdue" not in _reasons(world, ini)


def test_project_attention_follows_initiatives_and_unlinked_groups(world):
    ini = world.initiative("alpha", "Fine")
    mid = world.milestone("alpha", "On time", due="2027-01-01")
    world.link_milestone("alpha", ini, mid)
    world.link_objective("alpha", world.objective("alpha", "ok", state="passed"), ini)
    assert world.outline("alpha")["attention"] is False
    world.objective("alpha", "needs evidence")           # unlinked + unknown
    p = world.outline("alpha")
    # The plan names no special code: an unlinked objective with no evidence
    # raises the same "objective is unknown" reason as a linked one.
    assert p["attention"] is True and "objective_unknown" in p["attention_reasons"]


# ---- feature toggles -------------------------------------------------------------

def test_initiatives_off_shows_the_off_state_and_nothing_under_it(world):
    ini = world.initiative("alpha", "Ship")
    mid = world.milestone("alpha", "Pilot")
    world.link_milestone("alpha", ini, mid)
    world.milestone("alpha", "Orphan")
    world.svc.update_features("alpha", {"initiatives": False}, actor="owner", interface="test")
    p = world.outline("alpha")
    assert p["features"]["initiatives"] is False
    assert p["initiatives"] == []
    assert p["unlinked"] == {"milestones": [], "objectives": []}
    # toggling hid data, never deleted it
    world.svc.update_features("alpha", {"initiatives": True}, actor="owner", interface="test")
    assert world.outline("alpha")["initiatives"][0]["milestones"][0]["id"] == mid


def test_milestones_off_moves_all_initiative_work_to_not_in_a_milestone(world):
    ini = world.initiative("alpha", "Ship")
    mid = world.milestone("alpha", "Pilot")
    world.link_milestone("alpha", ini, mid)
    world.milestone("alpha", "Orphan")
    ref = world.item("alpha", "bound", initiative=ini, milestone="Pilot")
    world.svc.update_features("alpha", {"milestones": False}, actor="owner", interface="test")
    p = world.outline("alpha")
    row = p["initiatives"][0]
    assert p["features"] == {"initiatives": True, "milestones": False}
    assert row["milestones"] == [] and p["unlinked"]["milestones"] == []
    assert [i["ref"] for i in row["unmilestoned_work"]["items"]] == [ref]
    assert "no_milestone_link" not in row["attention_reasons"]
    assert "milestone_overdue" not in row["attention_reasons"]


# ---- project selection / errors ----------------------------------------------------

def test_project_filter_and_unknown_project(world):
    world.project("beta")
    assert [p["id"] for p in world.roadmap.roadmap()["projects"]] == ["alpha", "beta"]
    assert [p["id"] for p in world.roadmap.roadmap("beta")["projects"]] == ["beta"]
    with pytest.raises(RoadmapNotFound):
        world.roadmap.roadmap("ghost")


# ---- performance budget -------------------------------------------------------------

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
        ini = w.initiative(pid, "Ship")
        mid = w.milestone(pid, "Pilot")
        w.link_milestone(pid, ini, mid)
        for n in range(6):
            w.item(pid, f"item {n}", status="blocked" if n % 2 else "backlog", milestone="Pilot", initiative=ini)
    calls.update(list_work=0, get_work=0, list_work_links=0)
    w.roadmap.roadmap()
    assert calls == {"list_work": 2, "get_work": 0, "list_work_links": 0}


# ---- milestone items (loaded on open) -------------------------------------------------

def test_milestone_items_returns_stages_and_blockers(world):
    ini = world.initiative("alpha", "Ship")
    mid = world.milestone("alpha", "Pilot")
    world.link_milestone("alpha", ini, mid)
    base = world.item("alpha", "base", status="in_progress", milestone="Pilot")
    waiting = world.item("alpha", "waiting", milestone="Pilot")
    world.adapter.link_work("alpha", base, waiting)           # waiting depends on base
    world.item("alpha", "finished", status="done", milestone="Pilot")
    out = world.roadmap.milestone_items("alpha", mid)
    assert out["state"] == "ok"
    assert out["milestone"]["id"] == mid and out["milestone"]["name"] == "Pilot"
    by_ref = {i["ref"]: i for i in out["items"]}
    assert by_ref[waiting]["bucket"] == "planned" and by_ref[waiting]["blockers"] == [base]
    assert by_ref[base]["bucket"] == "building" and by_ref[base]["blockers"] == []
    done = next(i for i in out["items"] if i["bucket"] == "complete")
    assert done["blockers"] == []
    assert out["delivery"]["total"] == 3


def test_milestone_items_refusals(world):
    world.project("beta")
    ini = world.initiative("alpha", "Ship")
    mid = world.milestone("alpha", "Pilot")
    with pytest.raises(RoadmapNotFound):
        world.roadmap.milestone_items("alpha", 9999)
    with pytest.raises(RoadmapNotFound):
        world.roadmap.milestone_items("beta", mid)           # exists, but not in beta
    with pytest.raises(RoadmapNotFound):
        world.roadmap.milestone_items("ghost", mid)
    world.svc.update_features("alpha", {"milestones": False}, actor="owner", interface="test")
    with pytest.raises(FeatureDisabledError):
        world.roadmap.milestone_items("alpha", mid)
    assert ini


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
    w.item("alpha", "pilot item", milestone="Pilot")
    adapter.down = True
    out = w.roadmap.milestone_items("alpha", mid)
    assert out["state"] == "unavailable" and out["items"] == []
    assert out["delivery"] == {"state": "unavailable", "reason": "host_unavailable"}


# ---- milestone ids are exposed (additive) ------------------------------------------------

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
