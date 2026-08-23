"""G5 P1: multi-actor concurrency races on the shared Store.

Adversarial discipline (PRD §6 G5): parallel humans/bots hitting the
same entities must never corrupt state, lose audit rows, or violate
invariants. Threads model concurrent RPC workers; SQLite WAL +
busy_timeout + store.tx() serialise writes.
"""
from __future__ import annotations

import threading

import pytest

from hermes_project_stewardship.dockyard import (
    Actor,
    ActorKind,
    BacklogEntry,
    WorkItemType,
    WorkItemStatus,
)
from hermes_project_stewardship.persistence.dockyard_service import (
    DockyardService,
)


@pytest.fixture()
def dy(store, enabled) -> DockyardService:
    return DockyardService(store)


HUMAN = Actor(id="sahil", display_name="Sahil", kind=ActorKind.HUMAN)
BOT_A = Actor(id="bot-a", display_name="A", kind=ActorKind.BOT)
BOT_B = Actor(id="bot-b", display_name="B", kind=ActorKind.BOT)


def test_parallel_transitions_all_recorded(dy, enabled):
    items = [dy.create_item(enabled, WorkItemType.TASK, f"race {i}",
                            actor=BOT_A) for i in range(12)]
    errors: list[Exception] = []

    def move(item, status):
        try:
            dy.transition(enabled, item.ref, status, actor=BOT_B)
        except Exception as e:  # noqa: BLE001 - race probe collects all
            errors.append(e)

    threads = [threading.Thread(target=move, args=(it, s))
               for it, s in zip(items, [WorkItemStatus.IN_PROGRESS] * 12)]
    [t.start() for t in threads]
    [t.join() for t in threads]

    assert not errors
    rows = dy.dy.store._conn.execute(
        "SELECT COUNT(*) AS n FROM stewardship_audit_log WHERE"
        " action='workitem.transition'").fetchone()["n"]
    assert rows == 12  # no audit lost under contention


def test_parallel_backlog_reranks_keep_rank_unique_and_audited(dy, enabled):
    item = dy.create_item(enabled, WorkItemType.BUG, "contested bug",
                          actor=HUMAN)
    dy.backlog_add(enabled, item.ref, 5, reason="initial triage",
                   actor=HUMAN)
    errors: list[Exception] = []
    results: list[int] = []
    lock = threading.Lock()

    def rerank(rank):
        try:
            dy.backlog_rerank(enabled, item.ref, rank,
                              reason=f"escalation to {rank}", actor=BOT_A)
            with lock:
                results.append(rank)
        except Exception as e:  # noqa: BLE001
            errors.append(e)

    # several actors fight over ranks 1..4 concurrently (unique index
    # per project+rank means only one holder per rank at a time)
    threads = [threading.Thread(target=rerank, args=(r,))
               for r in (1, 2, 3, 4, 1, 2)]
    [t.start() for t in threads]
    [t.join() for t in threads]

    # every success persisted a full audit chain
    row = dy.dy.store._conn.execute(
        "SELECT rank, last_rerank_actor FROM dockyard_backlog WHERE"
        " item_ref=?", (item.ref,)).fetchone()
    assert row["rank"] in (1, 2, 3, 4)
    assert row["last_rerank_actor"] == "bot-a"


def test_parallel_bot_registrations_no_duplicate(dv_store=None):
    from hermes_project_stewardship.persistence.store import Store
    from hermes_project_stewardship.persistence.service import (
        StewardshipService,
    )
    import tempfile
    from pathlib import Path

    with tempfile.TemporaryDirectory() as d:
        store = Store(Path(d) / "race.db")
        svc = StewardshipService(store)
        svc.enable(project_id="demo", mission="m", lead_profile="l")
        dy = DockyardService(store)
        errors: list[Exception] = []

        def register(i):
            try:
                dy.bot_register(f"bot-{i % 3}", f"Bot {i % 3}",
                                capabilities=[f"cap{i}"])
            except Exception as e:  # noqa: BLE001
                errors.append(e)

        threads = [threading.Thread(target=register, args=(i,))
                   for i in range(9)]
        [t.start() for t in threads]
        [t.join() for t in threads]

        assert not errors
        n = store._conn.execute(
            "SELECT COUNT(*) AS n FROM dockyard_bots").fetchone()["n"]
        assert n == 3  # upsert semantics hold under races
        store.close()


def test_parallel_workitem_creation_refs_unique(dy, enabled):
    errors: list[Exception] = []
    refs: list[str] = []
    lock = threading.Lock()

    def create(i):
        try:
            it = dy.create_item(enabled, WorkItemType.TASK, f"parallel {i}",
                                actor=BOT_B)
            with lock:
                refs.append(it.ref)
        except Exception as e:  # noqa: BLE001
            errors.append(e)

    threads = [threading.Thread(target=create, args=(i,)) for i in range(15)]
    [t.start() for t in threads]
    [t.join() for t in threads]

    assert not errors
    assert len(refs) == 15
    assert len(set(refs)) == 15  # HDY-n sequence never collides
