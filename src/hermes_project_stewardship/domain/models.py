"""Domain models: dataclasses shared across services and surfaces.

These are the canonical in-memory shapes. Persistence rows map onto them;
JSON payloads (API/gateway) serialise them via `asdict()`.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional

from .constants import (
    ApprovalState,
    CycleState,
    HealthState,
    InitiativeStatus,
    ObjectiveEvaluatorType,
    ProjectPhase,
    RiskLevel,
)


@dataclass
class StewardshipSettings:
    """Per-project stewardship configuration (row: project_stewardship)."""

    project_id: str
    enabled: bool = False
    mission: str = ""
    owner_lead_profile: Optional[str] = None
    member_profiles: List[str] = field(default_factory=list)
    owner_team_id: Optional[str] = None  # forward-compatible; schema only in V1
    autonomy_level: int = 0
    autonomy_policy_json: Dict[str, Any] = field(default_factory=dict)
    verification_policy_json: Dict[str, Any] = field(default_factory=dict)
    release_policy_json: Dict[str, Any] = field(default_factory=dict)
    notification_policy_json: Dict[str, Any] = field(default_factory=dict)
    phase: str = ProjectPhase.ACTIVE.value
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    paused_at: Optional[str] = None


@dataclass
class Objective:
    id: Optional[int]
    project_id: str
    name: str
    description: str
    evaluator_type: str  # ObjectiveEvaluatorType value
    target: str
    severity: str
    enabled: bool = True
    command: Optional[List[str]] = None   # for evaluator_type=command
    integration: Optional[str] = None     # reserved for evaluator_type=integration
    window: str = "30d"


@dataclass
class ObjectiveResult:
    objective_id: int
    name: str
    passed: bool
    measured: Optional[float]
    target_met: bool
    detail: str


@dataclass
class Evidence:
    kind: str            # EvidenceKind value
    source: str          # collector id, e.g. "git:/path", "cmd:pytest"
    summary: str         # one-line human-readable digest
    payload_json: Dict[str, Any] = field(default_factory=dict)
    authoritative: bool = True  # advisory evidence is never authoritative


@dataclass
class Contradiction:
    severity: str       # Severity value
    subject: str
    detail: str
    evidence_refs: List[str] = field(default_factory=list)


@dataclass
class VerificationVerdict:
    ok: bool
    state_basis: HealthState = HealthState.UNKNOWN
    contradictions: List[Contradiction] = field(default_factory=list)
    evidence: List[Evidence] = field(default_factory=list)

    @property
    def high_severity_unresolved(self) -> bool:
        return any(c.severity == "high" for c in self.contradictions)


@dataclass
class Initiative:
    id: Optional[int]
    ref: str
    project_id: str
    title: str
    rationale: str
    expected_outcome: str
    risk: str                 # RiskLevel value
    status: str               # InitiativeStatus value
    approval_state: str       # ApprovalState value
    priority: int = 0
    dedupe_key: Optional[str] = None
    source_cycle_id: Optional[int] = None
    board_slug: Optional[str] = None
    validation_contract: Dict[str, Any] = field(default_factory=dict)
    outcome: Dict[str, Any] = field(default_factory=dict)
    created_at: Optional[str] = None
    completed_at: Optional[str] = None

    def requires_approval(self) -> bool:
        return self.approval_state == ApprovalState.PENDING.value
