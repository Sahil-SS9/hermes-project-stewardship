"""G2 P4 tests: workload board (BM-05) + reputation summary (BM-06)."""
from __future__ import annotations

import pytest

from hermes_project_stewardship.dockyard import Actor, ActorKind, WorkItemType
from hermes_project_stewardship.persistence.dockyard_service import (
    DockyardService,
)


@pytest.fixture()
def dsvc(store, enabled) -> DockyardService:
    s = DockyardService(store)
    s.bot_register("coder-bot", "Coder")
    s.bot_register("qa-bot", "QA")
    s.bot_register("writer-bot", "Writer")
    s.group_create("checkout-ops", member_ids=["coder-bot", "qa-bot"],
                   lead_id="qa-bot")
    return s


def test_workload_board_buckets_by_status(dsvc):
    dsvc.bot_set_status("coder-bot", "busy", current_item="HDY-41")
    dsvc.bot_set_status("writer-bot", "offline")
    board = dsvc.workload_board()
    assert {"bot": "coder-bot", "item": "HDY-41"} in board["busy"]
    assert {"bot": "writer-bot", "item": None} in board["offline"]
    assert any(e["bot"] == "qa-bot" for e in board["idle"])


def test_workload_surfaces_stuck(dsvc):
    dsvc.bot_set_status("qa-bot", "stuck")
    board = dsvc.workload_board()
    assert [e["bot"] for e in board["stuck"]] == ["qa-bot"]


def test_reputation_counts_completed_and_regressed(dsvc):
    dsvc.a2a_send("result", from_actor="qa-bot", to_group="checkout-ops",
                  payload={"item_ref": "HDY-1", "outcome": "verified"},
                  item_ref="HDY-1")
    dsvc.a2a_send("result", from_actor="qa-bot", to_group="checkout-ops",
                  payload={"item_ref": "HDY-2", "outcome": "verified"},
                  item_ref="HDY-2")
    dsvc.a2a_send("result", from_actor="qa-bot", to_group="checkout-ops",
                  payload={"item_ref": "HDY-3", "outcome": "regressed"},
                  item_ref="HDY-3")
    rep = dsvc.bot_reputation("qa-bot")
    assert rep["completed"] == 2
    assert rep["regressed"] == 1
    assert rep["results_posted"] == 3
    assert rep["advisory"] is True


def test_reputation_includes_transition_activity(dsvc, human_actor):
    wi = dsvc.create_item("demo", WorkItemType.TASK, "Transition source",
                          actor=human_actor)
    dsvc.transition("demo", wi.ref, "in_progress",
                    actor=human_actor.__class__(
                        id="qa-bot", display_name="QA",
                        kind=human_actor.kind))
    rep = dsvc.bot_reputation("qa-bot")
    assert rep["transitions"] == 1


def test_unknown_bot_reputation_refused(dsvc):
    with pytest.raises(ValueError):
        dsvc.bot_reputation("ghost")


@pytest.fixture()
def human_actor():
    return Actor(id="sahil", display_name="Sahil", kind=ActorKind.HUMAN)
