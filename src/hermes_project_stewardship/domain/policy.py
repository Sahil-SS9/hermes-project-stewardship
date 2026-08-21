"""Autonomy levels and the restriction-only policy engine.

Core invariant (tested): project policy may only *restrict* what the runtime
base capability set allows. ``merged = base ∩ level ∩ ¬denied``. There is no
code path in this module that widens a permission.
"""

from __future__ import annotations

from dataclasses import dataclass
from enum import IntEnum
from typing import Any, Dict, FrozenSet, Optional


class AutonomyLevel(IntEnum):
    ASSISTANT = 0     # inspect and answer only
    INVESTIGATOR = 1  # observe, research, non-mutating diagnostics
    PLANNER = 2       # + create initiatives/plans; no source changes
    BUILDER = 3       # + branches/worktrees/code/tests/PRs
    MAINTAINER = 4    # + low-risk merges when policy gates pass
    STEWARD = 5       # broad lifecycle within release/budget policy


# Capabilities a project policy may reference.
KNOWN_CAPABILITIES: FrozenSet[str] = frozenset(
    {
        "observe",
        "research",
        "diagnostics",
        "create_initiative",
        "write_code",           # branches, worktrees, edits, PRs
        "merge_low_risk",
        "merge_any",
        "release_publish",
        "run_command_evaluator",
        "notify_gateway",
        "spawn_subagents",
    }
)


def _build_level_capabilities() -> Dict[int, FrozenSet[str]]:
    """Each level is a superset of the previous; levels 0-2 never mutate."""
    levels: Dict[int, FrozenSet[str]] = {
        0: frozenset({"observe"}),
        1: frozenset({"observe", "research", "diagnostics"}),
        2: frozenset({"observe", "research", "diagnostics", "create_initiative"}),
    }
    levels[3] = levels[2] | {"write_code", "run_command_evaluator"}
    levels[4] = levels[3] | {"merge_low_risk"}
    levels[5] = levels[4] | {
        "merge_any",
        "release_publish",
        "notify_gateway",
        "spawn_subagents",
    }
    return levels


LEVEL_CAPABILITIES: Dict[int, FrozenSet[str]] = _build_level_capabilities()


@dataclass(frozen=True)
class PolicyDecision:
    allowed: bool
    reason: str
    capability: str


class AutonomyPolicy:
    """Restriction-only autonomy policy for one stewardship project."""

    def __init__(
        self,
        level: int,
        denied_capabilities: Optional[FrozenSet[str]] = None,
        release_policy: Optional[Dict[str, Any]] = None,
        verification_policy: Optional[Dict[str, Any]] = None,
    ) -> None:
        if not isinstance(level, int) or not (0 <= int(level) <= 5):
            raise ValueError("autonomy level must be an integer 0..5")
        self.level = int(level)
        unknown = set(denied_capabilities or ()) - KNOWN_CAPABILITIES
        if unknown:
            raise ValueError(f"unknown capabilities in policy: {sorted(unknown)}")
        self.denied_capabilities: FrozenSet[str] = frozenset(denied_capabilities or ())
        self.release_policy: Dict[str, Any] = dict(release_policy or {})
        self.verification_policy: Dict[str, Any] = dict(verification_policy or {})

    # ------------------------------------------------------------------ #
    # Core gate                                                          #
    # ------------------------------------------------------------------ #

    def merged_capabilities(self, runtime_base: FrozenSet[str]) -> FrozenSet[str]:
        """The only sanctioned combination of base and policy.

        Intersection semantics guarantee restriction-only behaviour even if a
        caller passes a wider base than the level implies.
        """
        return (runtime_base & LEVEL_CAPABILITIES[self.level]) - self.denied_capabilities

    def permits(self, capability: str, runtime_base: FrozenSet[str]) -> PolicyDecision:
        if capability not in KNOWN_CAPABILITIES:
            return PolicyDecision(False, f"unknown capability '{capability}'", capability)
        effective = self.merged_capabilities(runtime_base)
        if capability in effective:
            return PolicyDecision(True, "allowed by level+policy intersected with runtime", capability)
        if capability in self.denied_capabilities:
            reason = "denied by project autonomy policy"
        elif capability not in LEVEL_CAPABILITIES[self.level]:
            reason = f"beyond autonomy level {self.level} ({AutonomyLevel(self.level).name})"
        else:
            reason = "not granted by runtime base capabilities"
        return PolicyDecision(False, reason, capability)

    # ------------------------------------------------------------------ #
    # Hard gates independent of level                                    #
    # ------------------------------------------------------------------ #

    def merge_allowed(self, risk: str, runtime_base: FrozenSet[str]) -> PolicyDecision:
        cap = "merge_low_risk" if risk == "low" else "merge_any"
        decision = self.permits(cap, runtime_base)
        human_gate = bool(self.release_policy.get("require_human_merge_approval", True))
        if decision.allowed and human_gate:
            return PolicyDecision(
                False, "release_policy requires human merge approval", cap
            )
        return decision

    def builder_gate_open(self, runtime_base: FrozenSet[str]) -> PolicyDecision:
        """Levels >= 3 additionally require the security allowlist gate.

        See docs/threat-model.md §6: Builder autonomy on repositories that
        accept untrusted content requires BOTH an explicit acknowledgement
        that untrusted content may reach the agent AND confirmation that the
        runtime tool allowlist has been reviewed. Deliberately separate from
        the level model so it can never be granted implicitly by a level bump.
        """
        if self.level < 3:
            return PolicyDecision(True, "builder gate not applicable below level 3", "write_code")
        ack = bool(self.verification_policy.get("untrusted_content_ack", False))
        allowlist = bool(self.verification_policy.get("runtime_allowlist_confirmed", False))
        if not (ack and allowlist):
            return PolicyDecision(
                False,
                "level>=3 requires untrusted_content_ack AND "
                "runtime_allowlist_confirmed in verification policy "
                "(docs/threat-model.md §6)",
                "write_code",
            )
        return self.permits("write_code", runtime_base)

    def can_create_initiative(self, runtime_base: FrozenSet[str]) -> bool:
        return self.permits("create_initiative", runtime_base).allowed

    def describe(self) -> Dict[str, Any]:
        return {
            "level": self.level,
            "name": AutonomyLevel(self.level).name,
            "denied_capabilities": sorted(self.denied_capabilities),
            "release_policy": dict(self.release_policy),
            "verification_policy_gates": {
                "untrusted_content_ack": bool(
                    self.verification_policy.get("untrusted_content_ack", False)
                ),
                "runtime_allowlist_confirmed": bool(
                    self.verification_policy.get("runtime_allowlist_confirmed", False)
                ),
            },
        }
