"""Domain layer for Project Stewardship.

Exposes the shared vocabulary (constants, models), the restriction-only
autonomy policy engine, and the hysteresis-guarded health state machine.
"""

from .constants import (  # noqa: F401
    ApprovalState,
    AutonomyLevelNames,
    CycleState,
    EvidenceKind,
    HealthState,
    InitiativeStatus,
    KnowledgeType,
    ObjectiveEvaluatorType,
    ProjectPhase,
    RiskLevel,
    Severity,
    TriggerType,
)
from .health import DEFAULT_HEALTH_MACHINE, HealthStateMachine  # noqa: F401
from .models import (  # noqa: F401
    Contradiction,
    Evidence,
    Initiative,
    Objective,
    ObjectiveResult,
    StewardshipSettings,
    VerificationVerdict,
)
from .policy import (  # noqa: F401
    AutonomyLevel,
    AutonomyPolicy,
    KNOWN_CAPABILITIES,
    LEVEL_CAPABILITIES,
    PolicyDecision,
)
