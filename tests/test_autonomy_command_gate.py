"""Command evaluators must be gated on the run_command_evaluator capability.

``run_command_evaluator`` existed in the capability vocabulary and was granted
at level 3, but nothing ever consulted it: ``AutonomyPolicy`` was never
constructed anywhere in ``src/``. A project at level 0 therefore executed
subprocesses, because the security allowlist constrains *which* executable may
run and never *whether* running is permitted at all.

The strongest test here is the side-effect pair: a command objective whose
command creates a sentinel file. Asserting the objective "failed" would not
distinguish a refused command from one that ran and exited non-zero, so these
tests assert on whether the subprocess actually happened.
"""

from __future__ import annotations

from pathlib import Path

import pytest

from hermes_project_stewardship.cycles.engine import CycleEngine
from hermes_project_stewardship.domain.policy import (
    AutonomyLevel,
    AutonomyPolicy,
    DEFAULT_RUNTIME_BASE,
)
from hermes_project_stewardship.security.allowlist import (
    CommandNotPermitted,
    run_allowlisted,
)

from tests.conftest import make_repo
from tests.test_cycles import wire_repo

COMMAND_LEVEL = int(AutonomyLevel.BUILDER)  # 3


def settings_at(level, denied=(), command_allowlist=None):
    """A minimal ``svc.settings()``-shaped mapping."""
    verification = {}
    if command_allowlist is not None:
        verification["command_allowlist"] = list(command_allowlist)
    return {
        "autonomy_level": level,
        "policies": {
            "autonomy": {"denied_capabilities": list(denied)},
            "verification": verification,
        },
    }


# --------------------------------------------------------------------- #
# The gate itself                                                       #
# --------------------------------------------------------------------- #


@pytest.mark.parametrize("level", [0, 1, 2])
def test_levels_below_builder_get_no_allowlist(level):
    assert CycleEngine._allowlist_from(settings_at(level)) == frozenset()


@pytest.mark.parametrize("level", [3, 4, 5])
def test_builder_and_above_get_the_default_allowlist(level):
    assert CycleEngine._allowlist_from(settings_at(level))


def test_denied_capability_overrides_a_sufficient_level():
    """Policy is restriction-only, so denying beats the level grant."""
    allowed = CycleEngine._allowlist_from(settings_at(5))
    denied = CycleEngine._allowlist_from(
        settings_at(5, denied=["run_command_evaluator"])
    )
    assert allowed and denied == frozenset()


def test_configured_allowlist_is_honoured_when_permitted():
    assert CycleEngine._allowlist_from(
        settings_at(COMMAND_LEVEL, command_allowlist=["pytest"])
    ) == frozenset({"pytest"})


def test_configured_allowlist_is_still_refused_when_not_permitted():
    """A project cannot buy back the capability by naming commands."""
    assert CycleEngine._allowlist_from(
        settings_at(2, command_allowlist=["pytest"])
    ) == frozenset()


def test_policy_decision_names_the_capability_and_level():
    decision = AutonomyPolicy.from_settings(settings_at(2)).command_evaluator_allowed()
    assert not decision.allowed
    assert decision.capability == "run_command_evaluator"
    assert "level 2" in decision.reason


def test_from_settings_reads_level_and_denied_capabilities():
    policy = AutonomyPolicy.from_settings(
        settings_at(4, denied=["merge_low_risk"])
    )
    assert policy.level == 4
    assert policy.denied_capabilities == frozenset({"merge_low_risk"})


def test_from_settings_survives_an_unknown_denied_capability():
    """Rows written under an older vocabulary must still load."""
    policy = AutonomyPolicy.from_settings(settings_at(3, denied=["not_a_capability"]))
    assert policy.denied_capabilities == frozenset()
    assert policy.command_evaluator_allowed().allowed


def test_from_settings_defaults_to_level_zero_on_empty_input():
    policy = AutonomyPolicy.from_settings({})
    assert policy.level == 0
    assert not policy.command_evaluator_allowed().allowed


def test_runtime_base_can_narrow_but_not_widen():
    """A host that does not grant the capability still refuses at level 5."""
    policy = AutonomyPolicy.from_settings(settings_at(5))
    narrow = DEFAULT_RUNTIME_BASE - {"run_command_evaluator"}
    assert policy.command_evaluator_allowed().allowed
    assert not policy.command_evaluator_allowed(narrow).allowed


# --------------------------------------------------------------------- #
# The executor refuses an empty allowlist with a pointed message        #
# --------------------------------------------------------------------- #


def test_empty_allowlist_refusal_points_at_autonomy(tmp_path):
    with pytest.raises(CommandNotPermitted) as excinfo:
        run_allowlisted(["echo", "hi"], cwd=tmp_path, allowlist=frozenset())
    assert "run_command_evaluator" in str(excinfo.value)


def test_non_empty_allowlist_still_reports_the_missing_entry(tmp_path):
    with pytest.raises(CommandNotPermitted) as excinfo:
        run_allowlisted(["echo", "hi"], cwd=tmp_path, allowlist=frozenset({"git"}))
    message = str(excinfo.value)
    assert "not on this project's allowlist" in message
    assert "run_command_evaluator" not in message


# --------------------------------------------------------------------- #
# End to end: did a subprocess actually run?                            #
# --------------------------------------------------------------------- #


def _add_sentinel_objective(svc, pid: str, sentinel: Path) -> None:
    svc.add_objective(
        pid,
        name="sentinel",
        evaluator_type="command",
        target=">=1",
        severity="high",
        command=["python3", "-c", f"open({str(sentinel)!r}, 'w').write('ran')"],
    )


def test_cycle_below_builder_does_not_execute_the_command(svc, engine, tmp_path):
    """The real regression: a PLANNER-level project must not spawn processes."""
    pid = "gated"
    svc.enable(pid, mission="m", lead_profile="lead", autonomy_level=2)
    wire_repo(svc, pid, make_repo(tmp_path / "repo"))
    sentinel = tmp_path / "ran.txt"
    _add_sentinel_objective(svc, pid, sentinel)

    result = engine.run_cycle(pid)

    assert not sentinel.exists(), "command evaluator ran despite autonomy level 2"
    detail = result["objectives"][0]["detail"]
    assert "run_command_evaluator" in detail


def test_cycle_at_builder_level_does_execute_the_command(svc, engine, tmp_path):
    """The gate must not break the permitted path."""
    pid = "permitted"
    svc.enable(pid, mission="m", lead_profile="lead", autonomy_level=COMMAND_LEVEL)
    wire_repo(svc, pid, make_repo(tmp_path / "repo"))
    sentinel = tmp_path / "ran.txt"
    _add_sentinel_objective(svc, pid, sentinel)

    engine.run_cycle(pid)

    assert sentinel.exists(), "command evaluator was blocked at its granted level"
