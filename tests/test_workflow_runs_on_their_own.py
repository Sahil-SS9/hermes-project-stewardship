"""Workflows run on their own (08/10 engine round, WORKFLOWS-R1.md).

Real-host lane: the pinned vanilla Hermes board, every byte under tmp_path.
The tests act out the two parts Dockyard does not do itself, with the board's
own code:

- Hermes's dispatcher: ``recompute_ready`` makes a ``todo`` card ``ready``
  only when every card linked before it is ``done``;
- the bots: ``claim_task`` (only a ``ready`` card can be claimed), then
  ``complete_task`` or ``block_task``.

"A step goes to its bot" therefore means: after the dispatcher's pass the
board lets its bot claim the card. No model, no timer, no live home.
"""
from __future__ import annotations

import importlib
import json
from contextlib import contextmanager

import pytest

from hermes_project_stewardship.persistence.workflow_library import WorkflowLibrary
from hermes_project_stewardship.persistence.workflow_service import (
    CANONICAL_STATUSES,
    WorkflowService,
)

BOT = "worker-a"


def step(node_id, after=(), *, bot=BOT, gate=False, when=None, rounds=None,
         ask_first=None, body=None, title=None):
    node = {"id": node_id, "title": title or node_id.capitalize(),
            "depends_on": list(after), "human_gate": gate, "body": body}
    if bot:
        node["phase_team"] = bot
    if when:
        node["when"] = {"node": when[0], "status": when[1]}
    if rounds:
        node["loop"] = {"max_iterations": rounds, "until": {"status": "done"}}
    if ask_first is not None:
        node["ask_first"] = ask_first
    return node


class Lane:
    def __init__(self, world, project_id):
        self.kb = importlib.import_module("hermes_cli.kanban_db")
        self.world = world
        self.pid = project_id
        self.board = world.adapter.project_board(project_id)
        self.service = WorkflowService(world.store, world.adapter)
        self.name = "flow"
        self.key = None

    # ---- the workflow ----------------------------------------------------
    def run(self, *nodes, name="flow"):
        self.service.define(self.pid, name, {"nodes": list(nodes)})
        self.name, self.key = name, f"{name}-run-{len(self.service.runs(self.pid, name)) + 1}"
        self.service.start(self.pid, name, self.key)
        return self.key

    def stored(self):
        row = self.service._run_row(self.pid, self.name, self.key)
        return json.loads(row["result_json"]), row["status"]

    def card(self, node_id):
        return self.stored()[0]["tasks"].get(node_id)

    def state(self, node_id):
        return (self.stored()[0].get("node_states") or {}).get(node_id)

    def run_status(self):
        return self.stored()[1]

    def tick(self, **kwargs):
        kwargs.setdefault("interface", "timer")
        return self.service.tick(**kwargs)

    # ---- the board -------------------------------------------------------
    @contextmanager
    def conn(self):
        conn = self.kb.connect(board=self.board)
        try:
            yield conn
        finally:
            conn.close()

    def status(self, card):
        with self.conn() as conn:
            return self.kb.get_task(conn, card).status

    def body(self, card):
        with self.conn() as conn:
            return self.kb.get_task(conn, card).body or ""

    def parents(self, card):
        with self.conn() as conn:
            return set(self.kb.parent_ids(conn, card))

    def dispatcher(self):
        with self.conn() as conn:
            self.kb.recompute_ready(conn)

    def goes_to_its_bot(self, card):
        """The board would hand this card to its bot now."""
        self.dispatcher()
        return self.status(card) == "ready"

    def bot_claims(self, card):
        self.dispatcher()
        with self.conn() as conn:
            claimed = self.kb.claim_task(conn, card, claimer="test-bot")
        assert claimed is not None, f"the board would not hand {card} to its bot (status {self.status(card)})"

    def bot_finishes(self, card):
        self.bot_claims(card)
        with self.conn() as conn:
            assert self.kb.complete_task(conn, card, summary="finished by the test bot")

    def bot_gets_stuck(self, card, reason="the tests still fail"):
        self.bot_claims(card)
        with self.conn() as conn:
            assert self.kb.block_task(conn, card, reason=reason)
        assert self.status(card) == "blocked"

    def person_unblocks_and_bot_finishes(self, card):
        with self.conn() as conn:
            assert self.kb.unblock_task(conn, card)
        self.bot_finishes(card)

    def person_signs_off(self, card):
        self.world.adapter.transition_work(self.pid, "gate", card, "done")

    def switch_off(self, name):
        WorkflowLibrary(self.service).toggle(self.pid, name, "project", enabled=False,
                                             actor="test")


@pytest.fixture()
def lane(real_host):
    world, project_id = real_host
    return Lane(world, project_id)


def test_run_hands_the_first_step_to_its_bot_and_later_steps_wait_their_turn(lane):
    lane.run(step("plan"), step("build", ["plan"]), step("ship", ["build"]))
    plan, build, ship = lane.card("plan"), lane.card("build"), lane.card("ship")
    assert lane.goes_to_its_bot(plan)
    assert lane.status(build) == "triage" and lane.status(ship) == "triage"

    lane.bot_finishes(plan)
    lane.tick()
    assert lane.goes_to_its_bot(build)
    assert lane.status(ship) == "triage"

    lane.bot_finishes(build)
    lane.tick()
    lane.bot_finishes(ship)
    lane.tick()
    assert lane.run_status() == "complete"


def test_a_stuck_round_gets_a_new_round_that_starts_and_hears_why(lane):
    lane.run(step("reproduce"), step("fix", ["reproduce"], rounds=3, body="Make the test pass."))
    lane.bot_finishes(lane.card("reproduce"))
    lane.tick()
    first = lane.card("fix")
    lane.bot_gets_stuck(first, reason="the flaky test still fails on CI")
    lane.tick()

    second = lane.card("fix")
    assert second != first
    assert lane.state("fix") == "repeating"
    assert lane.stored()[0]["iterations"]["fix"] == 2
    assert first not in lane.parents(second)          # bug 6: never gated on the stuck round
    assert lane.goes_to_its_bot(second)
    assert "Make the test pass." in lane.body(second)
    assert "the flaky test still fails on CI" in lane.body(second)


def test_if_stuck_waits_for_the_loop_and_is_not_needed_when_a_later_round_works(lane):
    lane.run(step("reproduce"), step("fix", ["reproduce"], rounds=3),
             step("tell-me", ["fix"], when=("fix", "blocked")))
    lane.bot_finishes(lane.card("reproduce"))
    lane.tick()
    lane.bot_gets_stuck(lane.card("fix"))
    lane.tick()
    assert lane.state("tell-me") == "waiting"          # bug 1: not on the first stuck round
    assert lane.card("tell-me") is None

    lane.bot_finishes(lane.card("fix"))
    lane.tick()
    assert lane.state("fix") == "done"
    assert lane.state("tell-me") == "skipped"
    assert lane.card("tell-me") is None
    assert lane.run_status() == "complete"


def test_steps_after_a_loop_follow_the_latest_round(lane):
    lane.run(step("reproduce"), step("fix", ["reproduce"], rounds=3), step("review", ["fix"]))
    lane.bot_finishes(lane.card("reproduce"))
    lane.tick()
    first = lane.card("fix")
    review = lane.card("review")
    assert lane.parents(review) == {first}
    lane.bot_gets_stuck(first)
    lane.tick()
    second = lane.card("fix")
    assert lane.parents(review) == {second}            # bug 2: moved to the latest round
    assert lane.status(review) == "triage"

    lane.bot_finishes(second)
    lane.tick()
    assert lane.goes_to_its_bot(review)


def test_a_loop_that_gives_up_starts_its_if_stuck_step_and_flags_the_run(lane):
    lane.run(step("reproduce"), step("fix", ["reproduce"], rounds=2),
             step("tell-me", ["fix"], when=("fix", "blocked")), step("review", ["fix"]))
    lane.bot_finishes(lane.card("reproduce"))
    lane.tick()
    lane.bot_gets_stuck(lane.card("fix"))
    lane.tick()
    last = lane.card("fix")
    lane.bot_gets_stuck(last)
    lane.tick()

    assert lane.state("fix") == "escalated"
    assert lane.run_status() == "escalated"
    tell_me = lane.card("tell-me")
    assert tell_me is not None and lane.state("tell-me") == "taken"
    assert last not in lane.parents(tell_me)           # bug 7: never gated on the stuck card
    assert lane.goes_to_its_bot(tell_me)
    assert lane.status(lane.card("review")) == "triage"
    escalations = lane.stored()[0]["escalations"]
    assert [e["node_id"] for e in escalations] == ["fix"]
    lane.tick()
    assert len(lane.stored()[0]["escalations"]) == 1   # recorded once


def test_a_person_fixing_a_given_up_loop_lets_the_run_carry_on(lane):
    lane.run(step("reproduce"), step("fix", ["reproduce"], rounds=1), step("review", ["fix"]))
    lane.bot_finishes(lane.card("reproduce"))
    lane.tick()
    only = lane.card("fix")
    lane.bot_gets_stuck(only)
    lane.tick()
    assert lane.run_status() == "escalated"

    lane.person_unblocks_and_bot_finishes(only)
    lane.tick()
    assert lane.state("fix") == "done"                 # bug 5: recovers
    assert lane.run_status() == "pending"
    assert lane.goes_to_its_bot(lane.card("review"))


def test_steps_after_a_branch_wait_for_it_and_are_skipped_with_it(lane):
    nodes = (step("check"), step("alert", ["check"], when=("check", "blocked")),
             step("follow-up", ["alert"]), step("report", ["check"]))
    lane.run(*nodes)
    assert lane.card("follow-up") is None              # bug 3: not made before its branch
    lane.bot_finishes(lane.card("check"))
    lane.tick()
    assert lane.state("alert") == "skipped"
    assert lane.state("follow-up") == "skipped"
    assert lane.card("follow-up") is None
    lane.bot_finishes(lane.card("report"))
    lane.tick()
    assert lane.run_status() == "complete"

    lane.run(*nodes)                                   # second run: this time check gets stuck
    lane.bot_gets_stuck(lane.card("check"))
    lane.tick()
    alert, follow_up = lane.card("alert"), lane.card("follow-up")
    assert alert and follow_up
    assert lane.parents(follow_up) == {alert}
    assert lane.goes_to_its_bot(alert)
    assert lane.status(follow_up) == "triage"
    lane.bot_finishes(alert)
    lane.tick()
    assert lane.goes_to_its_bot(follow_up)


def test_a_when_done_branch_waits_while_its_step_is_stuck(lane):
    lane.run(step("build"), step("ship", ["build"], when=("build", "done")))
    build = lane.card("build")
    lane.bot_gets_stuck(build)
    lane.tick()
    assert lane.state("ship") == "waiting"             # bug 4: not skipped while stuck
    lane.person_unblocks_and_bot_finishes(build)
    lane.tick()
    assert lane.state("ship") == "taken"
    assert lane.goes_to_its_bot(lane.card("ship"))


def test_sign_offs_ask_me_first_and_unassigned_steps_wait_for_a_person(lane):
    lane.run(step("draft"), step("sign-off", ["draft"], gate=True, bot=None),
             step("publish", ["sign-off"], ask_first=True), step("tidy", ["draft"], bot=None))
    lane.bot_finishes(lane.card("draft"))
    lane.tick()
    lane.tick()
    assert lane.status(lane.card("sign-off")) == "triage"
    assert lane.status(lane.card("tidy")) == "triage"
    lane.person_signs_off(lane.card("sign-off"))
    lane.tick()
    publish = lane.card("publish")
    assert lane.status(publish) == "triage"            # bug 9: asks first, even on its turn
    seen = {n["node_id"]: n["ask_first"] for n in lane.service.runs(lane.pid, lane.name)[0]["nodes"]}
    assert seen == {"draft": False, "sign-off": False, "publish": True, "tidy": False}
    lane.world.adapter.transition_work(lane.pid, "task", publish, "in_progress")
    assert lane.goes_to_its_bot(publish)


def test_ask_first_is_saved_with_the_workflow_and_checked(lane):
    lane.service.define(lane.pid, "asks", {"nodes": [step("a"), step("b", ["a"], ask_first=True)]})
    saved = [row for row in lane.service.list(lane.pid) if row["name"] == "asks"][-1]
    # Saved only when on, so workflows that never use it are unchanged.
    assert [n.get("ask_first") for n in saved["definition"]["nodes"]] == [None, True]
    with pytest.raises(ValueError, match="ask_first"):
        lane.service.define(lane.pid, "asks", {"nodes": [step("a", ask_first="yes")]})
    assert len([row for row in lane.service.list(lane.pid) if row["name"] == "asks"]) == 1


def test_the_timer_leaves_paused_and_switched_off_work_alone_but_move_on_now_still_works(lane):
    lane.run(step("plan"), step("build", ["plan"]))
    lane.bot_finishes(lane.card("plan"))
    lane.world.svc.pause(lane.pid)
    summary = lane.tick()
    assert any("paused" in s["reason"] for s in summary["skipped"])
    assert lane.status(lane.card("build")) == "triage"
    lane.service.advance(lane.pid, lane.name, lane.key)          # Move on now (a person)
    assert lane.goes_to_its_bot(lane.card("build"))

    lane.world.svc.resume(lane.pid)
    lane.run(step("plan"), step("build", ["plan"]), name="other")
    lane.bot_finishes(lane.card("plan"))
    lane.switch_off("other")
    summary = lane.tick()
    assert any("disabled" in s["reason"] for s in summary["skipped"])
    assert lane.status(lane.card("build")) == "triage"
    with pytest.raises(ValueError, match="disabled"):
        lane.service.advance(lane.pid, "other", lane.key)


def test_the_timer_also_leaves_frozen_projects_and_switched_off_workflows_alone(lane):
    lane.run(step("plan"), step("build", ["plan"]))
    lane.bot_finishes(lane.card("plan"))
    lane.world.svc.update_features(lane.pid, {"workflow_canvas": False},
                                   actor="test", interface="test")
    assert any("workflows are switched off" in s["reason"] for s in lane.tick()["skipped"])
    lane.world.svc.update_features(lane.pid, {"workflow_canvas": True},
                                   actor="test", interface="test")
    lane.world.svc.freeze(lane.pid)
    assert any("frozen" in s["reason"] for s in lane.tick()["skipped"])
    assert lane.status(lane.card("build")) == "triage"


def test_the_timer_does_not_drive_runs_started_before_this_change(lane):
    lane.run(step("plan"), step("build", ["plan"]))
    stored, _ = lane.stored()
    stored.pop("auto", None)
    with lane.world.store.tx() as cx:
        cx.execute("UPDATE dockyard_workflow_runs SET result_json=? WHERE run_key=?",
                   (json.dumps(stored), lane.key))
    lane.bot_finishes(lane.card("plan"))
    summary = lane.tick()
    assert any("before" in s["reason"] for s in summary["skipped"])
    assert lane.status(lane.card("build")) == "triage"
    lane.service.advance(lane.pid, lane.name, lane.key)
    assert lane.goes_to_its_bot(lane.card("build"))


def test_ticks_are_safe_to_repeat_and_do_not_overlap(lane):
    lane.run(step("plan"), step("build", ["plan"]))
    lane.bot_finishes(lane.card("plan"))
    first = lane.tick()
    assert sum(len(r["changes"]) for r in first["runs"]) >= 1
    again = lane.tick()
    assert sum(len(r["changes"]) for r in again["runs"]) == 0
    assert lane.service._take_tick_lease("someone-else")
    try:
        assert lane.tick()["busy"] is True
    finally:
        lane.service._drop_tick_lease("someone-else")
    assert lane.tick()["busy"] is False
    status = lane.service.tick_status()
    assert status["by"] == "timer" and status["at"] and status["moving"] is True


def test_a_step_the_board_refuses_does_not_stop_the_others(lane):
    lane.run(step("plan"), step("build", ["plan"]), step("docs", ["plan"]))
    lane.bot_finishes(lane.card("plan"))
    build = lane.card("build")

    class RefusesBuild:
        def __init__(self, port):
            self._port = port

        def transition_work(self, project_id, kind, ref, status):
            if ref == build:
                raise RuntimeError("the board refused")
            return self._port.transition_work(project_id, kind, ref, status)

        def __getattr__(self, name):
            return getattr(self._port, name)

    lane.service.port = RefusesBuild(lane.world.adapter)
    first = lane.tick()
    second = lane.tick()
    lane.service.port = lane.world.adapter
    assert [f["error"] for f in first["failed"]] == ["the board refused"]
    assert first["new_failures"] and not second["new_failures"]   # said once, not every minute
    assert lane.goes_to_its_bot(lane.card("docs"))                # the other step still went
    assert lane.stored()[0]["handed"].get("docs") == lane.card("docs")   # and the pass was saved
    assert lane.status(build) == "triage"
    lane.tick()
    assert lane.goes_to_its_bot(build)


def test_a_failed_live_read_falls_back_to_the_board_listing(lane):
    lane.run(step("plan"), step("build", ["plan"]))

    class FlakyReads:
        def __init__(self, port):
            self._port = port

        def get_work(self, *args, **kwargs):
            raise RuntimeError("the live read failed")

        def __getattr__(self, name):
            return getattr(self._port, name)

    lane.bot_finishes(lane.card("plan"))
    lane.service.port = FlakyReads(lane.world.adapter)
    lane.tick()
    lane.service.port = lane.world.adapter
    assert lane.goes_to_its_bot(lane.card("build"))


def test_the_run_view_only_ever_sees_dockyard_words(lane):
    lane.run(step("plan"), step("build", ["plan"]))
    lane.bot_claims(lane.card("plan"))                 # the board says "running"
    seen = {node["node_id"]: node["status"] for node in lane.service.runs(lane.pid, lane.name)[0]["nodes"]}
    assert seen == {"plan": "in_progress", "build": "backlog"}   # bug 10: not running/triage
    timeline = lane.service.timeline(lane.pid, lane.name, lane.key)
    words = {event["to_status"] for event in timeline["events"]}
    assert words <= CANONICAL_STATUSES | {"waiting"}, words


def test_retry_on_a_stuck_step_gives_it_back_to_its_bot(lane):
    lane.run(step("plan"))
    plan = lane.card("plan")
    lane.bot_gets_stuck(plan)
    # The old Retry moved the card to To do, which the board refuses for a
    # stuck card (bug 12); Retry now moves it to Doing, which unblocks it.
    with pytest.raises(Exception):
        lane.world.adapter.transition_work(lane.pid, "task", plan, "backlog")
    lane.world.adapter.transition_work(lane.pid, "task", plan, "in_progress")
    assert lane.goes_to_its_bot(plan)


def test_stewardctl_workflows_tick_moves_runs_and_records_a_heartbeat(lane, tmp_path, capsys):
    from hermes_project_stewardship.cli.app import main

    lane.run(step("plan"), step("build", ["plan"]))
    lane.bot_finishes(lane.card("plan"))
    db = lane.world.store.db_path
    home = tmp_path / "hermes-home"
    assert main(["--db", str(db), "workflows", "tick"]) == 2       # no host: refuses
    assert "--hermes-home" in capsys.readouterr().err
    assert main(["--db", str(db), "workflows", "tick", "--hermes-home", str(home)]) == 0
    out = capsys.readouterr().out
    assert "Build" in out
    assert lane.goes_to_its_bot(lane.card("build"))
    assert main(["--db", str(db), "workflows", "tick", "--hermes-home", str(home)]) == 0
    assert capsys.readouterr().out == ""                            # nothing moved: silent
    assert lane.service.tick_status()["by"] == "timer"
