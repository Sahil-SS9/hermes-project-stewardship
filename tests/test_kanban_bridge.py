"""Kanban bridge: approved initiative → board/cards → outcome (FR-09/I7)."""

from __future__ import annotations

import pytest

from hermes_project_stewardship.kanban import (
    BoardCard,
    KanbanAdapter,
    KanbanBridge,
    ReferenceKanbanAdapter,
)
from hermes_project_stewardship.persistence.service import ServiceError


class FakeHostAdapter(KanbanAdapter):
    """Minimal fake of an upstream host's board API."""

    def __init__(self) -> None:
        self.boards: dict = {}
        self.cards: list = []
        self._next_board = 1
        self._next_card = 1

    def ensure_board(self, project_id: str, slug: str) -> str:
        key = (project_id, slug)
        if key not in self.boards:
            self.boards[key] = f"board-{self._next_board}"
            self._next_board += 1
        return self.boards[key]

    def add_card(self, board_id: str, card: BoardCard) -> str:
        cid = f"card-{self._next_card}"
        self._next_card += 1
        self.cards.append({"board": board_id, "id": cid,
                           "title": card.title, "column": card.column,
                           "meta": card.metadata})
        return cid

    def move_card(self, board_id: str, card_id: str, column: str) -> None:
        for c in self.cards:
            if c["board"] == board_id and c["id"] == card_id:
                c["column"] = column


@pytest.fixture()
def approved(svc, enabled):
    ini = svc.propose_initiative(
        enabled, title="Fix flaky CI", rationale="3 flakes in 30d window",
        expected_outcome="CI pass rate >= 0.99",
        validation_contract={"steps": ["Patch test timeout", "Re-run suite twice"],
                             "tests": "pytest -q"},
    )
    svc.approve_initiative(ini["ref"], actor="human", interface="cli")
    return svc.initiative_by_ref(ini["ref"])


def test_reference_adapter_roundtrip(store):
    adapter = ReferenceKanbanAdapter(store)
    b1 = adapter.ensure_board("p", "p-ops")
    b2 = adapter.ensure_board("p", "p-ops")  # idempotent
    assert b1 == b2
    cid = adapter.add_card(b1, BoardCard(title="t", description="d"))
    adapter.move_card(b1, cid, "doing")
    cards = adapter.cards(b1)
    assert len(cards) == 1 and cards[0]["column"] == "doing"


def test_bind_requires_approved(svc, enabled, store):
    ini = svc.propose_initiative(enabled, title="T", rationale="R")
    bridge = KanbanBridge(svc, ReferenceKanbanAdapter(store))
    with pytest.raises(ServiceError, match="not approved"):
        bridge.bind(ini["ref"])


def test_bind_creates_board_cards_and_starts_execution(
    svc, enabled, store, approved
):
    bridge = KanbanBridge(svc, ReferenceKanbanAdapter(store))
    out = bridge.bind(approved["ref"])
    assert out["board_slug"] == "demo-ops"
    assert len(out["card_ids"]) == 2  # from validation_contract steps
    ini = svc.initiative_by_ref(approved["ref"])
    assert ini["status"] == "executing"
    assert ini["board_slug"] == "demo-ops"
    cards = ReferenceKanbanAdapter(store).cards(out["board_id"])
    assert all(c["metadata"]["initiative_ref"] == approved["ref"] for c in cards)


def test_bind_with_fake_host_adapter(svc, enabled, approved):
    fake = FakeHostAdapter()
    bridge = KanbanBridge(svc, fake)
    out = bridge.bind(approved["ref"], board_slug="custom-board")
    assert out["board_id"].startswith("board-")
    assert len(fake.cards) == 2


def test_complete_from_board_moves_cards_and_records_outcome(
    svc, enabled, store, approved
):
    adapter = ReferenceKanbanAdapter(store)
    bridge = KanbanBridge(svc, adapter)
    out = bridge.bind(approved["ref"])
    final = bridge.complete_from_board(
        approved["ref"], outcome={"ci_pass_rate": 0.995}, regressed=False
    )
    assert final["status"] == "completed"
    cards = adapter.cards(out["board_id"])
    assert all(c["column"] == "done" for c in cards)


def test_regressed_completion_via_bridge(svc, enabled, store, approved):
    bridge = KanbanBridge(svc, ReferenceKanbanAdapter(store))
    bridge.bind(approved["ref"])
    final = bridge.complete_from_board(
        approved["ref"], outcome={"ci_pass_rate": 0.91}, regressed=True
    )
    assert final["status"] == "regressed"
