"""Policy engine: restriction-only invariant + level gates."""

from __future__ import annotations

import pytest

from hermes_project_stewardship.domain.policy import (
    LEVEL_CAPABILITIES,
    AutonomyLevel,
    AutonomyPolicy,
    KNOWN_CAPABILITIES,
)

BASE = frozenset(KNOWN_CAPABILITIES)


def test_levels_are_monotonic_supersets():
    for lvl in range(1, 6):
        assert LEVEL_CAPABILITIES[lvl - 1] < LEVEL_CAPABILITIES[lvl]


def test_levels_0_2_never_mutate():
    for lvl in range(0, 3):
        caps = LEVEL_CAPABILITIES[lvl]
        assert not (caps & {"write_code", "merge_low_risk", "merge_any", "release_publish"})


def test_policy_can_only_restrict_not_widen():
    pol = AutonomyPolicy(level=0)
    # even with a maximal runtime base, level 0 cannot write code
    assert not pol.permits("write_code", BASE).allowed
    # intersection semantics: base missing capability stays denied
    tiny_base = frozenset({"observe"})
    pol5 = AutonomyPolicy(level=5)
    assert not pol5.permits("write_code", tiny_base).allowed


def test_denied_capability_beats_level():
    pol = AutonomyPolicy(level=3, denied_capabilities=frozenset({"write_code"}))
    decision = pol.permits("write_code", BASE)
    assert not decision.allowed
    assert "project autonomy policy" in decision.reason


def test_unknown_capability_rejected():
    pol = AutonomyPolicy(level=1)
    d = pol.permits("launch_missiles", BASE)
    assert not d.allowed and "unknown capability" in d.reason


def test_invalid_policy_inputs():
    with pytest.raises(ValueError):
        AutonomyPolicy(level=9)
    with pytest.raises(ValueError):
        AutonomyPolicy(level=1, denied_capabilities=frozenset({"not_a_cap"}))


def test_merge_requires_human_approval_by_default():
    pol = AutonomyPolicy(level=4)
    assert not pol.merge_allowed("low", BASE).allowed
    pol_open = AutonomyPolicy(
        level=4, release_policy={"require_human_merge_approval": False}
    )
    assert pol_open.merge_allowed("low", BASE).allowed
    assert not pol_open.merge_allowed("high", BASE).allowed  # needs merge_any (L5)


def test_builder_gate_blocks_until_double_acknowledged():
    pol = AutonomyPolicy(level=3)
    assert not pol.builder_gate_open(BASE).allowed
    half = AutonomyPolicy(
        level=3, verification_policy={"untrusted_content_ack": True}
    )
    assert not half.builder_gate_open(BASE).allowed
    full = AutonomyPolicy(
        level=3,
        verification_policy={
            "untrusted_content_ack": True,
            "runtime_allowlist_confirmed": True,
        },
    )
    assert full.builder_gate_open(BASE).allowed
    # below level 3 the gate is not applicable
    low = AutonomyPolicy(level=2)
    assert low.builder_gate_open(BASE).allowed
