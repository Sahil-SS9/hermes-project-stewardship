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
    DISABLED = "disabled"
    ARCHIVED = "archived"


class ProjectLifecycle:
    """PM-0107 (fix 7): explicit transition matrix with side effects.

    Allowed transitions (from -> {to}):
      active    -> paused, frozen, disabled, archived
      paused    -> active, disabled, archived
      frozen    -> active, disabled, archived
      disabled  -> active (re-enable; restores prior phase side effects)
      archived  -> active (restore)
    Any transition not listed is refused. Side effects record the phase
    timestamps the service writes with the UPDATE (paused_at on pause/
    freeze; cleared on resume; updated_at always).
    """

    TRANSITIONS: dict[str, frozenset] = {
        ProjectPhase.ACTIVE.value: frozenset({
            ProjectPhase.PAUSED.value, ProjectPhase.FROZEN.value,
            ProjectPhase.DISABLED.value, ProjectPhase.ARCHIVED.value,
        }),
        ProjectPhase.PAUSED.value: frozenset({
            ProjectPhase.ACTIVE.value, ProjectPhase.DISABLED.value,
            ProjectPhase.ARCHIVED.value,
        }),
        ProjectPhase.FROZEN.value: frozenset({
            ProjectPhase.ACTIVE.value, ProjectPhase.DISABLED.value,
            ProjectPhase.ARCHIVED.value,
        }),
        ProjectPhase.DISABLED.value: frozenset({ProjectPhase.ACTIVE.value}),
        ProjectPhase.ARCHIVED.value: frozenset({ProjectPhase.ACTIVE.value}),
    }

    @classmethod
    def can_transition(cls, current: str, target: str) -> bool:
        return target in cls.TRANSITIONS.get(str(current), frozenset())

    @classmethod
    def require_transition(cls, current: str, target: str) -> None:
        if not cls.can_transition(current, target):
            raise ValueError(
                f"project lifecycle transition '{current}' -> '{target}' is not allowed"
            )

    @classmethod
    def side_effects(cls, target: str) -> dict:
        """Phase side effects applied with every transition (PM-0107)."""
        paused = target in {ProjectPhase.PAUSED.value, ProjectPhase.FROZEN.value}
        return {"paused_at": "now" if paused else None, "phase": target}


class MembershipState(str, Enum):
    """PM-0104: membership lifecycle states."""

    ACTIVE = "active"
    DEPARTURE_PENDING = "departure_pending"
    DEPARTED = "departed"
    UNAVAILABLE = "unavailable"  # display status for a profile that vanished


class TransferEligibility:
    """PM-0108: work-transfer eligibility by canonical status/kind.

    Claimed/running work is non-transferable in this release (Phase 0
    decision); epics are grouping records and never assignable.
    """

    ELIGIBLE_STATUSES = frozenset({"backlog", "triage", "todo", "ready", "blocked", "review"})
    NON_TRANSFERABLE_STATUSES = frozenset({"claimed", "running", "done", "archived", "scheduled"})

    @classmethod
    def is_eligible(cls, status_or_kind: str) -> bool:
        value = str(status_or_kind or "").strip().lower()
        if value == "epic":
            return False
        if value in cls.NON_TRANSFERABLE_STATUSES:
            return False
        return value in cls.ELIGIBLE_STATUSES


class Capability(str, Enum):
    """PM-0111: explicit capabilities required for privileged operations."""

    MEMBERSHIP_ADMIN = "membership_admin"
    LEAD_TRANSFER = "lead_transfer"
    BULK_REASSIGNMENT = "bulk_reassignment"
    PROJECT_ARCHIVE = "project_archive"
    MANAGED_FILE_REMOVAL = "managed_file_removal"


class OperationState(str, Enum):
    """PM-0110: durable saga states."""

    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    COMPENSATED = "compensated"


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
