"""Dockyard persistence tests: WorkItem + Backlog CRUD on the shared Store."""
from __future__ import annotations

import pytest

from hermes_project_stewardship.dockyard import (
    Actor,
    ActorKind,
    BacklogEntry,
    WorkItem,
    WorkItemType,
    WorkItemStatus,
    make_ref,
)
from hermes_project_stewardship.persistence.dockyard_store import DockyardStore


@pytest.fixture()
def human() -> Actor:
    return Actor(id="sahil", display_name="Sahil", kind=ActorKind.HUMAN)


@pytest.fixture()
def bot() -> Actor:
    return Actor(id="coder-bot", display_name="coder-bot", kind=ActorKind.BOT)


@pytest.fixture()
def dy(store):
    return DockyardStore(store)


@pytest.fixture()
def proj(svc, enabled) -> str:
    return enabled  # 'demo' project from conftest fixture


def _item(proj, title="T", typ=WorkItemType.TASK, **kw):
    return WorkItem(project_id=proj, type=typ, title=title, **kw)


def test_create_and_get_roundtrip(dy, proj, human, bot):
    wi = _item(proj, "Split CI matrix by OS", assignee=bot, created_by=human)
    wi.ref = make_ref("HDY", 31)
    created = dy.create_item(wi)
    assert created.id is not None
    got = dy.get_item(proj, created.id)
    assert got is not None
    assert got.title == "Split CI matrix by OS"
    assert got.assignee.kind is ActorKind.BOT
    assert got.created_by.kind is ActorKind.HUMAN
    assert got.status is WorkItemStatus.BACKLOG


def test_list_orders_by_rank_then_id(dy, proj, bot):
    for i, rank in enumerate([None, 2, 1]):
        wi = _item(proj, f"item {i}", priority_rank=rank)
        wi.ref = make_ref("HDY", 100 + i)
        dy.create_item(wi)
    items = dy.list_items(proj)
    ranks = [i.priority_rank for i in items]
    assert ranks == [1, 2, None]


def test_status_transition_persists(dy, proj):
    wi = dy.create_item(_item(proj, "Move me"))
    updated = dy.update_status(proj, wi.id, WorkItemStatus.IN_REVIEW)
    assert updated.status is WorkItemStatus.IN_REVIEW


def test_parentage_via_store_enforces_rules(dy, proj):
    epic = dy.create_item(_item(proj, "Epic", typ=WorkItemType.EPIC))
    task = dy.create_item(_item(proj, "Task child"))
    dy.set_parent(proj, task.id, epic.id)
    assert dy.get_item(proj, task.id).parent_id == epic.id


def _mk_item(dy, proj, title):
    it = dy.create_item(WorkItem(project_id=proj, type=WorkItemType.TASK,
                                 title=title))
    return it.ref


def test_backlog_upsert_and_order(dy, proj):
    r31 = _mk_item(dy, proj, "b31")
    r24 = _mk_item(dy, proj, "b24")
    dy.upsert_backlog(proj, BacklogEntry(item_ref=r31, rank=2))
    dy.upsert_backlog(proj, BacklogEntry(item_ref=r24, rank=1))
    entries = dy.list_backlog(proj)
    assert [e.item_ref for e in entries] == [r24, r31]


def test_rerank_requires_reason_and_persists_audit(dy, proj, bot):
    ref = _mk_item(dy, proj, "rerank target")
    dy.upsert_backlog(proj, BacklogEntry(item_ref=ref, rank=2))
    with pytest.raises(Exception):
        dy.rerank(proj, ref, 1, "", actor=bot)
    audit = dy.rerank(proj, ref, 1,
                      "objective breach outranks chores", actor=bot)
    assert audit["to_rank"] == 1
    rows = dy.store._conn.execute(
        "SELECT * FROM dockyard_backlog WHERE item_ref=?", (ref,)).fetchall()
    assert rows[0]["last_rerank_reason"] == "objective breach outranks chores"
    assert rows[0]["last_rerank_kind"] == "bot"


def test_cascade_delete_with_project(dy, svc, store, enabled):
    proj = enabled
    wi = dy.create_item(_item(proj, "Doomed"))
    assert dy.get_item(proj, wi.id) is not None
    svc.disable(proj)
    store._conn.execute(
        "DELETE FROM project_stewardship WHERE project_id=?", (proj,))
    store._conn.commit() if hasattr(store._conn, "commit") else None
    assert dy.get_item(proj, wi.id) is None


def test_stats(dy, proj):
    it = dy.create_item(_item(proj, "one"))
    dy.upsert_backlog(proj, BacklogEntry(item_ref=it.ref, rank=1))
    s = dy.stats()
    assert s["work_items"] >= 1 and s["backlog_entries"] >= 1
