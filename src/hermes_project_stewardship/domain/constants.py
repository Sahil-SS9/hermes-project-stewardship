"""Domain enumerations for Project Stewardship.

All state machines live here so surfaces, services and tests share one
vocabulary. Values are the wire format (persisted verbatim in SQLite).
"""

from __future__ import annotations

from enum import Enum


class HealthState(str, Enum):
    UNKNOWN = "unknown"
    HEALTHY = "healthy"
    WATCH = "watch"
    DEGRADED = "degraded"
    CRITICAL = "critical"


class InitiativeStatus(str, Enum):
    PROPOSED = "proposed"
    PENDING_APPROVAL = "pending_approval"
    APPROVED = "approved"
    EXECUTING = "executing"
    COMPLETED = "completed"
    REGRESSED = "regressed"
    REJECTED = "rejected"
    CANCELLED = "cancelled"


class ApprovalState(str, Enum):
    NOT_REQUIRED = "not_required"
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"


class RiskLevel(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class CycleState(str, Enum):
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"


class TriggerType(str, Enum):
    MANUAL = "manual"
    CRON = "cron"
    WEBHOOK = "webhook"
    GATEWAY = "gateway"
    INTERNAL = "internal"


class EvidenceKind(str, Enum):
    GIT_STATUS = "git_status"
    GIT_LOG = "git_log"
    DECLARED_FILE = "declared_file"
    COMMAND_PROBE = "command_probe"
    CI_INTEGRATION = "ci_integration"
    ADVISORY_MEMORY = "advisory_memory"  # never authoritative
    ADVISORY_LLM = "advisory_llm"        # never authoritative


class ObjectiveEvaluatorType(str, Enum):
    MANUAL = "manual"
    COMMAND = "command"
    INTEGRATION = "integration"  # reserved; not implemented in 0.1.x


class KnowledgeType(str, Enum):
    DECISION = "decision"
    FINDING = "finding"
    INCIDENT = "incident"


class ProjectPhase(str, Enum):
    ACTIVE = "active"
    PAUSED = "paused"
    FROZEN = "frozen"


# Alias kept for API symmetry with Risk/Severity vocabularies.
Severity = str


def AutonomyLevelNames() -> dict:
    """Human-readable names per level, for surfaces."""
    return {
        0: "Assistant",
        1: "Investigator",
        2: "Planner",
        3: "Builder",
        4: "Maintainer",
        5: "Steward",
    }
