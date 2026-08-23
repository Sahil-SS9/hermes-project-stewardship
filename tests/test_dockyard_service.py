"""Dockyard service tests: business rules + audit integration (TE-01)."""
from __future__ import annotations

import pytest

from hermes_project_stewardship.dockyard import (
    Actor,
    ActorKind,
    RankChangeError,
    WorkItemType,
    WorkItemStatus,
)
from hermes_project_stewardship.persistence.dockyard_service import DockyardService


@pytest.fixture()
def human() -> Actor:
    return Actor(id="sahil", display_name="Sahil", kind=ActorKind.HUMAN)


@pytest.fixture()
def bot() -> Actor:
    return Actor(id="coder-bot", display_name="coder-bot", kind=ActorKind.BOT)


@pytest.fixture()
def dsvc(store, enabled) -> DockyardService:
    return DockyardService(store)


def test_create_assigns_sequential_refs(dsvc, enabled, human, bot):
    a = dsvc.create_item(enabled, WorkItemType.TASK, "First task", actor=human)
    b = dsvc.create_item(enabled, WorkItemType.TASK, "Second task", actor=bot)
    assert a.ref != b.ref
    assert a.ref.startswith("HDY-") and b.ref.startswith("HDY-")
    # attribution recorded per D4
    assert a.created_by.kind is ActorKind.HUMAN
    assert b.created_by.kind is ActorKind.BOT


def test_title_validation(dsvc, enabled, human):
    with pytest.raises(ValueError):
        dsvc.create_item(enabled, WorkItemType.TASK, "ab", actor=human)


def test_transition_writes_shared_audit_log(dsvc, enabled, store, bot):
    wi = dsvc.create_item(enabled, WorkItemType.TASK, "Transition me", actor=bot)
    dsvc.transition(enabled, wi.ref, WorkItemStatus.IN_REVIEW, actor=bot)
    rows = store._conn.execute(
        "SELECT * FROM stewardship_audit_log WHERE action='workitem.transition'"
    ).fetchall()
    assert len(rows) == 1
    assert rows[0]["actor"] == "coder-bot"
    assert rows[0]["interface"] == "dockyard:bot"


def test_parent_rule_violation_refused_at_service(dsvc, enabled, human):
    task = dsvc.create_item(enabled, WorkItemType.TASK, "A task", actor=human)
    with pytest.raises(ValueError):
        dsvc.attach_parent(enabled, "HDY-999", task.ref, actor=human)


def test_backlog_add_requires_reason_and_real_item(dsvc, enabled, human):
    wi = dsvc.create_item(enabled, WorkItemType.TASK, "Queued work", actor=human)
    with pytest.raises(RankChangeError):
        dsvc.backlog_add(enabled, wi.ref, 1, reason="", actor=human)
    # phantom refs refused (C4): item must exist
    with pytest.raises(Exception):
        dsvc.backlog_add(enabled, "HDY-9999", 1,
                         reason="ghost reference", actor=human)
    entry = dsvc.backlog_add(enabled, wi.ref, 1,
                             reason="objective breach", actor=human)
    assert entry.rank == 1
    listed = dsvc.backlog_list(enabled)
    assert listed[0].item_ref == wi.ref


def test_rerank_flow_records_reason_chain(dsvc, enabled, bot, human):
    wi = dsvc.create_item(enabled, WorkItemType.BUG, "Broken thing", actor=bot)
    dsvc.backlog_add(enabled, wi.ref, 3, reason="new bug report",
                     actor=bot)
    audit = dsvc.backlog_rerank(enabled, wi.ref, 1,
                                reason="customer impact escalates priority",
                                actor=human)
    assert audit["from_rank"] == 3 and audit["to_rank"] == 1
    entries = dsvc.backlog_list(enabled)
    assert entries[0].rank == 1
