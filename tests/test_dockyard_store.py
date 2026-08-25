"""Dockyard persistence tests: WorkItem + Backlog CRUD on the shared Store."""
from __future__ import annotations

import sqlite3
import threading

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
from hermes_project_stewardship.persistence import dockyard_store as _dy_mod
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


# ---------------------------------------------------------------------------
# Slice 3: collision-free unique rank ordering + initiative column
# ---------------------------------------------------------------------------


def _mk_work_item(dy, proj, title="T", **kw):
    return dy.create_item(WorkItem(project_id=proj, type=WorkItemType.TASK,
                                   title=title, **kw))


def test_upsert_backlog_shifts_when_rank_occupied(dy, proj):
    """Inserting at an occupied rank must shift, not IntegrityError."""
    first = _mk_work_item(dy, proj, "first").ref
    second = _mk_work_item(dy, proj, "second").ref
    dy.upsert_backlog(proj, BacklogEntry(item_ref=first, rank=1))
    # the second item lands at rank 1 too: existing entry must shift to 2
    dy.upsert_backlog(proj, BacklogEntry(item_ref=second, rank=1))
    entries = {e.item_ref: e.rank for e in dy.list_backlog(proj)}
    assert entries[first] == 2
    assert entries[second] == 1


def test_upsert_backlog_shift_avoids_sparse_rank_collision(dy, proj):
    """Temporary rank moves must not collide with valid sparse live ranks."""
    first = _mk_work_item(dy, proj, "first").ref
    far = _mk_work_item(dy, proj, "far").ref
    inserted = _mk_work_item(dy, proj, "inserted").ref
    dy.upsert_backlog(proj, BacklogEntry(item_ref=first, rank=1))
    dy.upsert_backlog(proj, BacklogEntry(item_ref=far, rank=1_000_001))

    dy.upsert_backlog(proj, BacklogEntry(item_ref=inserted, rank=1))

    entries = {e.item_ref: e.rank for e in dy.list_backlog(proj)}
    assert entries == {inserted: 1, first: 2, far: 1_000_002}


def test_rerank_shifts_other_rows_when_target_occupied(dy, proj, bot):
    """Reranking into an occupied rank must shift instead of IntegrityError."""
    a = _mk_work_item(dy, proj, "alpha").ref
    b = _mk_work_item(dy, proj, "beta").ref
    c = _mk_work_item(dy, proj, "gamma").ref
    dy.upsert_backlog(proj, BacklogEntry(item_ref=a, rank=1))
    dy.upsert_backlog(proj, BacklogEntry(item_ref=b, rank=2))
    dy.upsert_backlog(proj, BacklogEntry(item_ref=c, rank=3))
    # Move a from rank 1 to rank 2: b closes the gap at rank 1.
    audit = dy.rerank(proj, a, 2, "customer escalation", actor=bot)
    assert audit["from_rank"] == 1 and audit["to_rank"] == 2
    rows = {e.item_ref: e.rank for e in dy.list_backlog(proj)}
    assert rows[a] == 2 and rows[b] == 1 and rows[c] == 3


def test_rerank_shifts_when_moving_down(dy, proj, bot):
    a = _mk_work_item(dy, proj, "alpha").ref
    b = _mk_work_item(dy, proj, "beta").ref
    c = _mk_work_item(dy, proj, "gamma").ref
    dy.upsert_backlog(proj, BacklogEntry(item_ref=a, rank=1))
    dy.upsert_backlog(proj, BacklogEntry(item_ref=b, rank=2))
    dy.upsert_backlog(proj, BacklogEntry(item_ref=c, rank=3))
    audit = dy.rerank(proj, c, 1, "priority reset", actor=bot)
    assert audit["from_rank"] == 3 and audit["to_rank"] == 1
    rows = {e.item_ref: e.rank for e in dy.list_backlog(proj)}
    assert rows[c] == 1 and rows[a] == 2 and rows[b] == 3


def test_rerank_temporary_rank_cannot_collide_with_live_rank(dy, proj, bot):
    first = _mk_work_item(dy, proj, "first").ref
    target = _mk_work_item(dy, proj, "target").ref
    dy.upsert_backlog(proj, BacklogEntry(item_ref=first, rank=1))
    dy.upsert_backlog(proj, BacklogEntry(item_ref=target, rank=2_000_000))

    dy.rerank(proj, first, 2_000_000, "move after target", actor=bot)

    rows = {e.item_ref: e.rank for e in dy.list_backlog(proj)}
    assert rows[first] == 2_000_000
    assert rows[target] == 1_999_999


def test_concurrent_reranks_report_a_serial_audit_chain(
    dy, proj, bot, monkeypatch,
):
    """Each audit must start from the rank committed by its predecessor."""
    target = _mk_work_item(dy, proj, "target").ref
    blocker = _mk_work_item(dy, proj, "blocker").ref
    tail = _mk_work_item(dy, proj, "tail").ref
    dy.upsert_backlog(proj, BacklogEntry(item_ref=target, rank=1))
    dy.upsert_backlog(proj, BacklogEntry(item_ref=blocker, rank=2))
    dy.upsert_backlog(proj, BacklogEntry(item_ref=tail, rank=3))

    entered = threading.Event()
    release = threading.Event()
    completed = []
    failures = []
    result_lock = threading.Lock()
    original_rerank = BacklogEntry.rerank

    def delayed_rerank(entry, new_rank, reason, *, actor):
        if threading.current_thread().name == "slow-rerank":
            entered.set()
            if not release.wait(timeout=2):
                raise TimeoutError("slow rerank was not released")
        return original_rerank(entry, new_rank, reason, actor=actor)

    monkeypatch.setattr(BacklogEntry, "rerank", delayed_rerank)

    def move(new_rank, reason):
        try:
            result = dy.rerank(proj, target, new_rank, reason, actor=bot)
            with result_lock:
                completed.append(result)
        except BaseException as exc:  # surfaced in the controller thread below
            with result_lock:
                failures.append(exc)

    slow = threading.Thread(
        target=move,
        args=(3, "slow move to the tail"),
        name="slow-rerank",
    )
    fast = threading.Thread(
        target=move,
        args=(2, "fast move to the middle"),
        name="fast-rerank",
    )
    slow.start()
    assert entered.wait(timeout=2), "slow rerank never reached the controlled seam"
    fast.start()
    fast.join(timeout=0.2)
    release.set()
    slow.join(timeout=2)
    fast.join(timeout=2)

    assert not slow.is_alive() and not fast.is_alive()
    assert failures == []
    assert len(completed) == 2
    assert completed[1]["from_rank"] == completed[0]["to_rank"]


def test_priority_rank_mirrors_backlog_after_insert_and_rerank(dy, proj, bot):
    a = _mk_work_item(dy, proj, "alpha").ref
    b = _mk_work_item(dy, proj, "beta").ref
    dy.upsert_backlog(proj, BacklogEntry(item_ref=a, rank=1))
    dy.upsert_backlog(proj, BacklogEntry(item_ref=b, rank=1))
    after = {it.ref: it.priority_rank for it in dy.list_items(proj)}
    assert after[a] == 2 and after[b] == 1
    dy.rerank(proj, b, 2, "swap", actor=bot)
    after2 = {it.ref: it.priority_rank for it in dy.list_items(proj)}
    assert after2[b] == 2 and after2[a] == 1


def test_create_queued_item_rechecks_project_state_in_transaction(
    dy, proj, svc, human, bot,
):
    svc.pause(proj)
    item = WorkItem(
        project_id=proj,
        type=WorkItemType.TASK,
        title="Must not queue while paused",
        created_by=human,
        assignee=bot,
    )
    entry = BacklogEntry(
        item_ref="",
        rank=1,
        priority_reason="project is paused",
    )

    with pytest.raises(ValueError, match="paused"):
        dy.create_queued_item(item, entry, actor=human)

    assert dy.list_items(proj) == []
    assert dy.list_backlog(proj) == []


def test_create_queued_item_rechecks_initiative_project_in_transaction(
    dy, proj, svc, human, bot,
):
    initiative = svc.propose_initiative(
        proj,
        title="Belongs to the first project",
        rationale="transactional relation guard",
    )
    other = "other-project"
    svc.enable(other, mission="Other mission", lead_profile="lead")
    item = WorkItem(
        project_id=other,
        type=WorkItemType.TASK,
        title="Cross-project relation",
        created_by=human,
        assignee=bot,
        initiative_ref=initiative["ref"],
    )
    entry = BacklogEntry(
        item_ref="",
        rank=1,
        priority_reason="invalid project relation",
    )

    with pytest.raises(ValueError, match="belongs to project"):
        dy.create_queued_item(item, entry, actor=human)

    assert dy.list_items(other) == []
    assert dy.list_backlog(other) == []


def test_create_queued_item_atomic_no_orphan_when_backlog_raises(
    dy, proj, monkeypatch,
):
    def _boom(self, cx, project_id, entry, *, actor):
        raise sqlite3.IntegrityError("synthetic backlog failure")

    monkeypatch.setattr(_dy_mod.DockyardStore, "_insert_backlog_row", _boom)
    item = WorkItem(project_id=proj, type=WorkItemType.TASK,
                    title="Orphan candidate")
    entry = BacklogEntry(item_ref="HDY-NA", rank=1, priority_reason="ok")
    with pytest.raises(sqlite3.IntegrityError):
        dy.create_queued_item(item, entry, actor=None)
    # work item must not be persisted on rollback
    rows = dy.store._conn.execute(
        "SELECT COUNT(*) AS n FROM dockyard_work_items WHERE project_id=?",
        (proj,),
    ).fetchone()["n"]
    assert rows == 0
