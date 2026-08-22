"""Dockyard platform — G1 groundwork.

Domain model for the work-management core (PRD v0.3 §3.1, §4.1).
Pure domain: no IO, no engine imports. The stewardship trust engine is
consumed at the service layer, not here.
"""
from __future__ import annotations

import enum
import re
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Optional


class WorkItemType(str, enum.Enum):
    EPIC = "epic"
    TASK = "task"
    SUBTASK = "subtask"
    BUG = "bug"
    SPIKE = "spike"
    INITIATIVE = "initiative"


class WorkItemStatus(str, enum.Enum):
    BACKLOG = "backlog"
    IN_PROGRESS = "in_progress"
    IN_REVIEW = "in_review"
    DONE = "done"
    BLOCKED = "blocked"


class ActorKind(str, enum.Enum):
    HUMAN = "human"
    BOT = "bot"


# PRD PM-03: rank changes require a reason; empty reasons are refused.
class RankChangeError(ValueError):
    pass


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


@dataclass(frozen=True)
class Actor:
    """A human or bot that can own work (PRD D4: peers in one model)."""
    id: str
    display_name: str
    kind: ActorKind

    def __post_init__(self) -> None:
        if not self.id or not self.display_name:
            raise ValueError("actor id and display_name are required")


@dataclass
class WorkItem:
    """Universal unit of trackable work (PRD §3.1)."""
    project_id: str
    type: WorkItemType
    title: str
    id: Optional[int] = None
    ref: str = ""                       # human-readable key, e.g. HDY-31
    parent_id: Optional[int] = None     # hierarchy (PM-01)
    status: WorkItemStatus = WorkItemStatus.BACKLOG
    assignee: Optional[Actor] = None
    created_by: Optional[Actor] = None  # source attribution (PM-02)
    priority_rank: Optional[int] = None # backlog position (PM-03)
    labels: list[str] = field(default_factory=list)
    blocked_by: list[int] = field(default_factory=list)  # relation graph (PM-08)
    estimate_days: Optional[float] = None
    due: Optional[datetime] = None
    evidence_refs: list[str] = field(default_factory=list)
    created_at: datetime = field(default_factory=utcnow)
    updated_at: datetime = field(default_factory=utcnow)

    ALLOWED_CHILDREN = {
        WorkItemType.EPIC: {WorkItemType.TASK, WorkItemType.SUBTASK,
                            WorkItemType.BUG, WorkItemType.SPIKE,
                            WorkItemType.INITIATIVE},
        WorkItemType.TASK: {WorkItemType.SUBTASK},
        WorkItemType.BUG: {WorkItemType.SUBTASK},
        WorkItemType.SPIKE: set(),
        WorkItemType.SUBTASK: set(),
        WorkItemType.INITIATIVE: {WorkItemType.SUBTASK},
    }

    def __post_init__(self) -> None:
        if not self.project_id:
            raise ValueError("project_id is required")
        if not self.title or len(self.title.strip()) < 3:
            raise ValueError("title must be at least 3 characters")
        if isinstance(self.type, str):
            self.type = WorkItemType(self.type)
        if isinstance(self.status, str):
            self.status = WorkItemStatus(self.status)

    def set_parent(self, parent: "WorkItem") -> None:
        allowed = self.ALLOWED_CHILDREN.get(parent.type, set())
        if self.type not in allowed:
            raise ValueError(
                f"{parent.type.value} cannot parent {self.type.value}"
            )
        if parent.id is None:
            raise ValueError("parent must be persisted before linkage")
        if parent.project_id != self.project_id:
            raise ValueError("cross-project parenting is not allowed")
        if parent.id == self.id:
            raise ValueError("item cannot parent itself")
        self.parent_id = parent.id
        self.touch()

    def touch(self) -> None:
        self.updated_at = utcnow()


@dataclass
class BacklogEntry:
    """Prioritised queue position (PRD PM-03).

    Invariant: every rank change carries a reason; the reason travels with
    the entry for audit.
    """
    item_ref: str
    rank: int
    priority_reason: str = ""
    aged_since: datetime = field(default_factory=utcnow)

    def __post_init__(self) -> None:
        if self.rank < 1:
            raise ValueError("rank starts at 1")

    def rerank(self, new_rank: int, reason: str, *, actor: Actor) -> dict:
        """Apply the rerank and return its audit record; refuse empty reasons."""
        if not reason or len(reason.strip()) < 4:
            raise RankChangeError(
                "rank changes require a reason of at least 4 characters"
            )
        old = self.rank
        self.rank = new_rank
        return _rank_audit(item_ref=self.item_ref, actor=actor,
                           old=old, new=new_rank, reason=reason)


def _rank_audit(*, item_ref: str, actor: Actor, old: int, new: int,
                reason: str) -> dict:
    return {
        "action": "backlog.rerank",
        "actor": actor.id,
        "actor_kind": actor.kind.value,
        "item_ref": item_ref,
        "from_rank": old,
        "to_rank": new,
        "reason": reason,
    }


_REF_RE = re.compile(r"^[A-Z]{2,10}-\d{1,6}$")


def make_ref(prefix: str, seq: int) -> str:
    """Human-readable key like HDY-31."""
    if not prefix.isalpha() or not prefix.isupper():
        raise ValueError("ref prefix must be uppercase letters")
    ref = f"{prefix}-{seq}"
    if not _REF_RE.match(ref):
        raise ValueError(f"invalid ref generated: {ref}")
    return ref
