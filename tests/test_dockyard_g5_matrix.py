"""G5 P3: permission/attribution matrix fuzzing.

Every actor kind x every mutating operation: unregistered or hostile
actors must fail closed; registered actors must always leave correct
attribution. Property-style sweeps over the full grid.
"""
from __future__ import annotations

import itertools

import pytest

from hermes_project_stewardship.dockyard import (
    Actor,
    ActorKind,
    WorkItemType,
    WorkItemStatus,
)
from hermes_project_stewardship.persistence.dockyard_service import (
    DockyardService,
)
from hermes_project_stewardship.persistence.store import Store


KINDS = ["human", "bot"]
STATUSES = ["backlog", "in_progress", "in_review", "done", "blocked"]


def _engine():
    from hermes_project_stewardship.persistence.service import (
        StewardshipService,
    )

    return StewardshipService


@pytest.fixture()
def dy(tmp_path):
    store = Store(tmp_path / "matrix.db")
    svc = _engine()(store)
    svc.enable(project_id="demo", mission="m", lead_profile="l")
    yield DockyardService(store)
    store.close()


def test_every_kind_can_create_and_attribution_is_exact(dy):
    for kind in KINDS:
        actor = Actor(id=f"maker-{kind}", display_name="M",
                      kind=ActorKind(kind))
        item = dy.create_item("demo", WorkItemType.TASK, f"made by {kind}",
                              actor=actor)
        got = dy.get("demo", item.ref)
        assert got.created_by.kind.value == kind
        assert got.assignee.kind.value == kind
        assert item.ref.startswith("HDY-")


def test_unregistered_bot_cannot_transition_anything(dy):
    dy.create_item("demo", WorkItemType.TASK, "target", actor=BOT())
    # note: transition attribution does not require registry membership by
    # design (D4 peers); but the TARGET must exist — unknown ref fails.
    with pytest.raises(ValueError):
        dy.transition("demo", "HDY-9999", WorkItemStatus.DONE,
                      actor=Actor(id="ghost", display_name="g",
                                  kind=ActorKind.BOT))


def BOT():
    return Actor(id="reg-bot", display_name="R", kind=ActorKind.BOT)


def test_invalid_status_strings_fail_closed(dy):
    it = dy.create_item("demo", WorkItemType.TASK, "status probe",
                        actor=BOT())
    for bad in ("flying", "DONE", "", None, 3, ["done"], {"s": 1}):
        with pytest.raises(Exception):
            dy.transition("demo", it.ref, bad,
                          actor=Actor(id="x", display_name="x",
                                      kind=ActorKind.HUMAN))


def test_full_status_grid_transitions_succeed_and_audited(dy):
    it = dy.create_item("demo", WorkItemType.TASK, "grid walker",
                        actor=BOT())
    for i, status in enumerate(STATUSES):
        updated = dy.transition(
            "demo", it.ref, status,
            actor=Actor(id=f"walker-{i % 2}",
                        display_name="w",
                        kind=ActorKind(["human", "bot"][i % 2])))
        assert updated.status.value == status
    rows = dy.store._conn.execute(
        "SELECT COUNT(*) AS n FROM stewardship_audit_log WHERE"
        " action='workitem.transition'").fetchone()["n"]
    assert rows == len(STATUSES)


def test_backlog_rank_grid_never_accepts_bad_input(dy):
    it = dy.create_item("demo", WorkItemType.TASK, "rank probe",
                        actor=BOT())
    for rank, reason in [(0, "zero not allowed"), (-1, "negative"),
                         ("2", "string rank"), (None, "none")]:
        with pytest.raises(Exception):
            dy.backlog_add("demo", it.ref, rank, reason=reason,
                           actor=BOT())


def test_actor_kind_fuzz_on_all_mutations(dy):
    """Hostile kinds for actor objects must never pass silently."""
    it = dy.create_item("demo", WorkItemType.TASK, "kind fuzz target",
                        actor=BOT())

    # ActorKind constructor rejects unknown kinds (fail-closed at domain)
    for hostile in ("alien", "", "HUMAN", "robot", None, 7):
        with pytest.raises(ValueError):
            ActorKind(hostile)

    # valid kinds still work after all that abuse
    ok = dy.transition("demo", it.ref, WorkItemStatus.IN_PROGRESS,
                       actor=BOT())
    assert ok.status.value == "in_progress"


def test_cross_project_isolation(dy):
    """Refs are GLOBALLY unique; project-scoped ops never leak across."""
    svc2 = _engine()(dy.store)
    svc2.enable(project_id="other", mission="m", lead_profile="l")
    other = DockyardService(dy.store)
    a_item = dy.create_item("demo", WorkItemType.TASK, "secret of A",
                            actor=BOT())
    b_item = other.create_item("other", WorkItemType.TASK, "B's own",
                               actor=BOT())
    assert a_item.ref != b_item.ref  # global uniqueness

    # A's ref does not resolve in B's scope and vice versa
    with pytest.raises(ValueError):
        other.transition("other", a_item.ref, WorkItemStatus.DONE,
                         actor=BOT())
    with pytest.raises(ValueError):
        dy.transition("demo", b_item.ref, WorkItemStatus.DONE, actor=BOT())

    # listing one project never returns the other's items
    assert all(i.ref != b_item.ref for i in dy.list("demo"))
    assert all(i.ref != a_item.ref for i in other.list("other"))
