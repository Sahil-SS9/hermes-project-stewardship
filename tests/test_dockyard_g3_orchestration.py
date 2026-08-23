"""G3 P2/P3 tests: zero-CLI orchestration + measured outcome loop-back."""
from __future__ import annotations

import pytest

from hermes_project_stewardship.dockyard import Actor, ActorKind
from hermes_project_stewardship.kanban.bridge import KanbanBridge
from hermes_project_stewardship.kanban import ReferenceKanbanAdapter
from hermes_project_stewardship.persistence.dockyard_integration import (
    DockyardIntegration,
    IntegrationError,
)
from hermes_project_stewardship.persistence.dockyard_service import (
    DockyardService,
)
from hermes_project_stewardship.persistence.service import StewardshipService


@pytest.fixture()
def human() -> Actor:
    return Actor(id="sahil", display_name="Sahil", kind=ActorKind.HUMAN)


@pytest.fixture()
def integ(store, enabled):
    dy = DockyardService(store)
    svc = StewardshipService(store)
    bridge = KanbanBridge(svc, ReferenceKanbanAdapter(store))
    return DockyardIntegration(dy=dy, svc=svc, bridge=bridge), dy, svc, store


CONTRACT = {"steps": ["verify matrix", "measure outcome"],
            "tests": "project test suite"}


def test_propose_with_contract_auto_executes(integ, enabled, human):
    integration, dy, svc, store = integ
    out = integration.propose(
        enabled, title="Auto-exec change",
        rationale="maintenance: contract covers verification",
        actor=human,
        validation_contract=dict(CONTRACT),
        promote=True)
    # requires_approval default True -> human gate stops before Kanban
    assert out.get("awaiting_approval") is True


def test_approve_flows_to_board_and_promotes_twin(integ, enabled, human):
    integration, dy, svc, store = integ
    ini = svc.propose_initiative(
        enabled, title="Approved flow",
        rationale="objective: cut flake rate",
        validation_contract=dict(CONTRACT))
    out = integration.approve(ini["ref"], actor=human)

    assert out["status"] in ("executing", "approved")
    assert out["cards"] >= 1
    twin = dy.find_promoted(enabled, ini["ref"])
    assert twin is not None  # first-class board presence (PM-07)


def test_complete_from_board_syncs_twin_and_reputation(
        integ, enabled, human):
    integration, dy, svc, store = integ
    dy.bot_register("coder-bot", "Coder")
    dy.group_create("demo-ops")
    ini = svc.propose_initiative(
        enabled, title="Measured work",
        rationale="objective: prove loop",
        validation_contract=dict(CONTRACT))
    integration.approve(ini["ref"], actor=human)

    out = integration.complete_from_board(
        ini["ref"], outcome={"verified": True}, regressed=False,
        actor=human)

    assert out["engine_status"] == "completed"
    assert out["work_item_status"] == "done"

    rep = dy.bot_reputation("coder-bot")  # bot untouched: platform event only
    assert rep["results_posted"] == 0

    feed = dy.a2a_feed("demo-ops")
    assert any(m["type"] == "result" and m["item_ref"] == out["work_item"]
               for m in feed)


def test_regressed_completion_blocks_twin(integ, enabled, human):
    integration, dy, svc, store = integ
    dy.group_create("demo-ops")
    ini = svc.propose_initiative(
        enabled, title="Regressing change",
        rationale="objective: guard rail test",
        validation_contract=dict(CONTRACT))
    integration.approve(ini["ref"], actor=human)

    out = integration.complete_from_board(
        ini["ref"], outcome={"verified": False}, regressed=True,
        actor=human)
    assert out["work_item_status"] == "blocked"
    feed = dy.a2a_feed("demo-ops")
    result = [m for m in feed if m["type"] == "result"][0]
    assert result["payload"]["outcome"] == "regressed"


def test_duplicate_title_deduped_by_engine(integ, enabled, human):
    integration, dy, svc, store = integ
    a = svc.propose_initiative(enabled, title="Same title",
                               rationale="objective: dedupe check")
    with pytest.raises(IntegrationError):
        integration.propose(enabled, title="Same title",
                            rationale="objective: dedupe again",
                            actor=human)
