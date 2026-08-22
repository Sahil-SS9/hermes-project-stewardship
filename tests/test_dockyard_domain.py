"""G1 groundwork tests: WorkItem domain model (PRD v0.3 §3.1, §4.1)."""
from __future__ import annotations

import pytest

from hermes_project_stewardship.dockyard import (
    Actor,
    ActorKind,
    BacklogEntry,
    RankChangeError,
    WorkItem,
    WorkItemType,
    WorkItemStatus,
    make_ref,
)


@pytest.fixture()
def human() -> Actor:
    return Actor(id="sahil", display_name="Sahil", kind=ActorKind.HUMAN)


@pytest.fixture()
def bot() -> Actor:
    return Actor(id="coder-bot", display_name="coder-bot", kind=ActorKind.BOT)


def test_work_item_requires_project_and_title():
    with pytest.raises(ValueError):
        WorkItem(project_id="", type=WorkItemType.TASK, title="Valid title")
    with pytest.raises(ValueError):
        WorkItem(project_id="p", type=WorkItemType.TASK, title="ab")


def test_string_type_and_status_coerce():
    wi = WorkItem(project_id="p", type="task", title="Coerce me")
    assert wi.type is WorkItemType.TASK
    assert wi.status is WorkItemStatus.BACKLOG


def test_epic_can_parent_task_task_cannot_parent_epic(human):
    epic = WorkItem(project_id="p", type=WorkItemType.EPIC, title="Epic one", id=1)
    task = WorkItem(project_id="p", type=WorkItemType.TASK, title="Child task")
    task.set_parent(epic)
    assert task.parent_id == 1
    with pytest.raises(ValueError):
        epic.set_parent(task)


def test_cross_project_parenting_refused(human):
    epic = WorkItem(project_id="a", type=WorkItemType.EPIC, title="A epic", id=5)
    child = WorkItem(project_id="b", type=WorkItemType.TASK, title="B task")
    with pytest.raises(ValueError):
        child.set_parent(epic)


def test_unpersisted_parent_refused():
    epic = WorkItem(project_id="p", type=WorkItemType.EPIC, title="No id yet")
    child = WorkItem(project_id="p", type=WorkItemType.TASK, title="Child")
    with pytest.raises(ValueError):
        child.set_parent(epic)


def test_actor_kinds_are_peers(human, bot):
    """D4: humans and bots construct identically; kind is attribution only."""
    assert human.kind is ActorKind.HUMAN and bot.kind is ActorKind.BOT
    for a in (human, bot):
        wi = WorkItem(project_id="p", type=WorkItemType.TASK, title=f"By {a.id}",
                      created_by=a)
        assert wi.created_by.kind == a.kind


def test_backlog_rerank_requires_reason(bot):
    entry = BacklogEntry(item_ref="HDY-31", rank=2)
    with pytest.raises(RankChangeError):
        entry.rerank(1, "", actor=bot)
    with pytest.raises(RankChangeError):
        entry.rerank(1, "no", actor=bot)
    audit = entry.rerank(1, "objective breach outranks chores", actor=bot)
    assert audit["from_rank"] == 2 and audit["to_rank"] == 1
    assert audit["reason"] == "objective breach outranks chores"
    assert audit["actor_kind"] == "bot"


def test_backlog_rank_starts_at_one():
    with pytest.raises(ValueError):
        BacklogEntry(item_ref="HDY-31", rank=0)


def test_make_ref_shape():
    assert make_ref("HDY", 31) == "HDY-31"
    with pytest.raises(ValueError):
        make_ref("hdy", 31)
    with pytest.raises(ValueError):
        make_ref("HDY1", 31)


def test_touch_updates_timestamp(human):
    wi = WorkItem(project_id="p", type=WorkItemType.TASK, title="Stamp me",
                  created_by=human)
    before = wi.updated_at
    wi.touch()
    assert wi.updated_at >= before
