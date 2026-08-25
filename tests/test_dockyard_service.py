"""Dockyard service tests: business rules + audit integration (TE-01)."""
from __future__ import annotations

import sqlite3

import pytest

from hermes_project_stewardship.dockyard import (
    Actor,
    ActorKind,
    RankChangeError,
    WorkItemType,
    WorkItemStatus,
)
from hermes_project_stewardship.persistence import dockyard_store as _dy_mod
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


# ---------------------------------------------------------------------------
# Slice 3: atomic create+queue with distinct assignee, first-class initiative
# linkage, and reason-mandatory validation (Dockyard slice on top of G5).
# ---------------------------------------------------------------------------


def test_create_queued_item_atomic_with_creator_and_distinct_assignee(
    dsvc, enabled, human, bot,
):
    item, entry = dsvc.create_queued_item(
        enabled,
        title="Audit payment retries",
        item_type=WorkItemType.TASK,
        creator=human,
        assignee=bot,
        rank=1,
        reason="customer-reported regression",
    )
    assert item.ref.startswith("HDY-")
    assert item.created_by.id == human.id
    assert item.assignee is not None and item.assignee.id == bot.id
    assert entry.item_ref == item.ref
    assert entry.rank == 1
    assert dsvc.get(enabled, item.ref).ref == item.ref
    backlog = dsvc.backlog_list(enabled)
    assert backlog[0].item_ref == item.ref and backlog[0].rank == 1


def test_create_queued_item_rejects_short_reason(dsvc, enabled, human, bot):
    with pytest.raises(RankChangeError):
        dsvc.create_queued_item(
            enabled,
            title="Valid title length",
            item_type=WorkItemType.TASK,
            creator=human,
            assignee=bot,
            rank=1,
            reason="no",
        )


def test_create_queued_item_rejects_assignee_same_as_creator(
    dsvc, enabled, human,
):
    with pytest.raises(ValueError):
        dsvc.create_queued_item(
            enabled,
            title="Self-assigned attempt",
            item_type=WorkItemType.TASK,
            creator=human,
            assignee=human,
            rank=1,
            reason="reasonable reason supplied",
        )


def test_create_queued_item_links_initiative_first_class(
    dsvc, enabled, human, bot, svc,
):
    ini = svc.propose_initiative(
        enabled, title="Fix double charge", rationale="customer impact",
    )
    item, _entry = dsvc.create_queued_item(
        enabled,
        title="Implement idempotency keys",
        item_type=WorkItemType.TASK,
        creator=human,
        assignee=bot,
        rank=1,
        reason="directly unblocks the approved initiative",
        initiative_ref=ini["ref"],
    )
    assert item.initiative_ref == ini["ref"]
    reloaded = dsvc.get(enabled, item.ref)
    assert reloaded.initiative_ref == ini["ref"]
    # list view exposes the relation too (used by Desktop readback)
    listed = dsvc.list(enabled)
    matched = [it for it in listed if it.ref == item.ref]
    assert matched and matched[0].initiative_ref == ini["ref"]


def test_create_queued_item_rejects_unknown_initiative(dsvc, enabled, human, bot):
    with pytest.raises(ValueError):
        dsvc.create_queued_item(
            enabled,
            title="Implement something",
            item_type=WorkItemType.TASK,
            creator=human,
            assignee=bot,
            rank=1,
            reason="reasonable reason supplied",
            initiative_ref="INIT-FAKE-9999",
        )


def test_create_queued_item_rejects_cross_project_initiative(
    dsvc, enabled, human, bot, svc,
):
    ini = svc.propose_initiative(
        enabled, title="Only valid here", rationale="n/a",
    )
    svc.enable("other-proj", mission="m", lead_profile="x", autonomy_level=1)
    with pytest.raises(ValueError):
        dsvc.create_queued_item(
            "other-proj",
            title="Implement other",
            item_type=WorkItemType.TASK,
            creator=human,
            assignee=bot,
            rank=1,
            reason="reasonable reason supplied",
            initiative_ref=ini["ref"],
        )
    # the other project must not have gained an item either
    assert dsvc.list("other-proj") == []


def test_create_queued_item_atomic_no_orphan_when_backlog_fails(
    dsvc, enabled, human, bot, monkeypatch,
):
    """Forcing the backlog insert to raise must roll the work item back."""

    def _boom(self, cx, project_id, entry, *, actor):
        raise sqlite3.IntegrityError("simulated backlog insert failure")

    monkeypatch.setattr(_dy_mod.DockyardStore, "_insert_backlog_row", _boom)
    with pytest.raises(Exception):
        dsvc.create_queued_item(
            enabled,
            title="Orphan candidate",
            item_type=WorkItemType.TASK,
            creator=human,
            assignee=bot,
            rank=1,
            reason="reasonable reason supplied",
        )
    assert dsvc.list(enabled) == []
    assert dsvc.backlog_list(enabled) == []


def test_create_queued_item_shifts_existing_ranks_at_occupied_rank(
    dsvc, enabled, human, bot,
):
    """Inserting at an occupied rank must shift, not IntegrityError."""
    a, _ = dsvc.create_queued_item(
        enabled,
        title="First",
        item_type=WorkItemType.TASK,
        creator=human,
        assignee=bot,
        rank=1,
        reason="first item reason",
    )
    b, _ = dsvc.create_queued_item(
        enabled,
        title="Second",
        item_type=WorkItemType.TASK,
        creator=human,
        assignee=bot,
        rank=1,
        reason="second item reason",
    )
    c, _ = dsvc.create_queued_item(
        enabled,
        title="Third",
        item_type=WorkItemType.TASK,
        creator=human,
        assignee=bot,
        rank=2,
        reason="third item reason",
    )
    entries = {e.item_ref: e.rank for e in dsvc.backlog_list(enabled)}
    # Inserting at rank 1 twice must have made room each time
    assert entries[a.ref] == 3
    assert entries[b.ref] == 1
    assert entries[c.ref] == 2
    # priority_rank on the work items mirrors backlog rank (canonical source)
    by_ref = {it.ref: it.priority_rank for it in dsvc.list(enabled)}
    assert by_ref[a.ref] == entries[a.ref]
    assert by_ref[b.ref] == entries[b.ref]
    assert by_ref[c.ref] == entries[c.ref]
