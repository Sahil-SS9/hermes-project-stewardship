"""Dockyard bot layer domain: registry entries, groups, A2A messages.

PRD v0.3 §4.2 (BM-01..BM-06). Pure domain rules; persistence in
dockyard_store.py, orchestration in dockyard_service.py.
"""
from __future__ import annotations

import re
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
from typing import ClassVar, Dict, List, Optional, Tuple


class BotStatus(str, Enum):
    IDLE = "idle"
    BUSY = "busy"
    STUCK = "stuck"
    OFFLINE = "offline"


class GroupRole(str, Enum):
    LEAD = "lead"
    MEMBER = "member"


class A2AMessageType(str, Enum):
    HANDOFF = "handoff"
    STATUS_QUERY = "status_query"
    CAPABILITY_REQUEST = "capability_request"
    RESULT = "result"


class A2AError(Exception):
    """Raised when an A2A message violates the structured-event contract."""


def _now() -> datetime:
    return datetime.now(timezone.utc)


def new_message_id() -> str:
    return "a2a-" + uuid.uuid4().hex[:12]


@dataclass
class Bot:
    """Registry entry for one fleet profile (BM-01)."""
    id: str
    display_name: str
    capabilities: List[str] = field(default_factory=list)
    profile: Optional[str] = None
    status: BotStatus = BotStatus.IDLE
    current_item: Optional[str] = None
    registered_at: Optional[datetime] = None
    last_seen_at: Optional[datetime] = None

    def __post_init__(self) -> None:
        if not re.fullmatch(r"[a-z0-9][a-z0-9-]{1,40}", self.id):
            raise ValueError(
                "bot id must be lowercase kebab (2-41 chars), got "
                f"{self.id!r}")
        self.capabilities = [c.strip().lower() for c in self.capabilities
                             if c.strip()]

    def has_capability(self, capability: str) -> bool:
        return capability.strip().lower() in self.capabilities

    def mark_stuck(self) -> None:
        if self.status is BotStatus.OFFLINE:
            raise ValueError("offline bots cannot be marked stuck")
        self.status = BotStatus.STUCK
        self.last_seen_at = _now()

    def set_status(self, status: BotStatus,
                   current_item: Optional[str] = None) -> None:
        if (status is BotStatus.STUCK
                and self.status is BotStatus.OFFLINE):
            raise ValueError("offline bots cannot be marked stuck")  # M1
        self.status = status
        if status is not BotStatus.BUSY and current_item is not None:
            raise ValueError("current_item only valid while busy")
        if status is BotStatus.BUSY:
            self.current_item = current_item
        else:
            self.current_item = None
        self.last_seen_at = _now()


@dataclass
class BotGroup:
    """A2A coordination target: assignment targets a group; lead routes
    internally (BM-02). Mirrors upstream durable group rooms (D3)."""
    name: str
    purpose: str = ""
    channel_ref: Optional[str] = None
    id: Optional[int] = None
    members: Dict[str, GroupRole] = field(default_factory=dict)
    created_at: Optional[datetime] = None

    def __post_init__(self) -> None:
        if not re.fullmatch(r"[a-z0-9][a-z0-9-]{1,40}", self.name):
            raise ValueError(f"group name must be kebab-case, got {self.name!r}")

    def add_member(self, bot_id: str, role: GroupRole = GroupRole.MEMBER) -> None:
        self.members[bot_id] = role

    def remove_member(self, bot_id: str) -> None:
        self.members.pop(bot_id, None)

    def lead_id(self) -> Optional[str]:
        for bot_id, role in self.members.items():
            if role is GroupRole.LEAD:
                return bot_id
        return None

    def route_target(self) -> str:
        """BM-02: assignments target a group; the lead routes internally."""
        lead = self.lead_id()
        if lead:
            return lead
        if self.members:
            return sorted(self.members.keys())[0]
        raise A2AError(f"group {self.name} has no members to route to")


@dataclass
class A2AMessage:
    """Structured, audited A2A event — never chat noise (BM-03)."""
    msg_type: A2AMessageType
    from_actor: str
    to_group: str
    payload: Dict = field(default_factory=dict)
    item_ref: Optional[str] = None
    id: str = field(default_factory=new_message_id)
    created_at: Optional[datetime] = None

    REQUIRED_PAYLOAD: ClassVar[Dict[A2AMessageType, Tuple[str, ...]]] = {
        A2AMessageType.HANDOFF: ("item_ref", "summary", "context_refs"),
        A2AMessageType.STATUS_QUERY: ("about",),
        A2AMessageType.CAPABILITY_REQUEST: ("capability",),
        A2AMessageType.RESULT: ("item_ref", "outcome"),
    }

    def validate_payload(self) -> None:
        required = self.REQUIRED_PAYLOAD[self.msg_type]
        missing = [k for k in required if k not in self.payload or
                   self.payload[k] in (None, "", [])]
        if missing:
            raise A2AError(
                f"{self.msg_type.value} message missing fields: {missing}")
        # handoffs must carry an item ref at top level too
        if self.msg_type is A2AMessageType.HANDOFF:
            ref = self.payload.get("item_ref")
            if self.item_ref and ref and self.item_ref != ref:
                raise A2AError("handoff item_ref mismatch between envelope"
                               " and payload")

    def summary_line(self) -> str:
        """One-line rendering used for channel posts (BM-04)."""
        who = self.from_actor
        what = (self.payload.get("summary")
                or self.payload.get("outcome")
                or self.msg_type.value)
        ref = self.item_ref or self.payload.get("item_ref")
        ref_part = f" [{ref}]" if ref else ""
        return f"{who} → #{self.to_group}{ref_part}: {what}"

