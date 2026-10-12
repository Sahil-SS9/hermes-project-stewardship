"""Objective evaluators: target grammar, allowlisted commands, manual."""

from __future__ import annotations

import sys
from pathlib import Path

import pytest

from hermes_project_stewardship.domain.models import Objective
from hermes_project_stewardship.objectives.evaluators import (
    DEFAULT_EVALUATOR,
    EvaluationContext,
    parse_target,
)

PY = "python3" if sys.platform != "win32" else "python"


def obj(**kw) -> Objective:
    defaults = dict(
        id=1, project_id="p", name="t", description="", evaluator_type="command",
        target=">=1", severity="medium", command=[PY, "-c", "print(1)"],
    )
    defaults.update(kw)
    return Objective(**defaults)


def test_target_grammar():
    assert parse_target(">=0.99") == (">=", 0.99)
    assert parse_target("<=5") == ("<=", 5.0)
    with pytest.raises(ValueError):
        parse_target("about 5")


def test_command_pass_and_numeric_stdout(tmp_path: Path):
    ctx = EvaluationContext(project_path=tmp_path, allowlist={PY})
    r = DEFAULT_EVALUATOR.evaluate(obj(command=[PY, "-c", "print(0.997)"], target=">=0.99"), ctx)
    assert r.passed and r.measured == 0.997


def test_command_failure_blocks(tmp_path: Path):
    ctx = EvaluationContext(project_path=tmp_path, allowlist={PY})
    r = DEFAULT_EVALUATOR.evaluate(
        obj(command=[PY, "-c", "raise SystemExit(2)"]), ctx
    )
    assert not r.passed and r.measured == 0.0


def test_non_allowlisted_objective_blocked_not_crashed(tmp_path: Path):
    ctx = EvaluationContext(project_path=tmp_path, allowlist={"git"})
    r = DEFAULT_EVALUATOR.evaluate(obj(), ctx)
    assert not r.passed and "blocked" in r.detail


def test_missing_project_path_fails_closed(tmp_path: Path):
    ctx = EvaluationContext(project_path=tmp_path / "ghost", allowlist={PY})
    r = DEFAULT_EVALUATOR.evaluate(obj(), ctx)
    assert not r.passed


def test_manual_without_status_is_unknown_fail():
    m = obj(evaluator_type="manual", command=None)
    r = DEFAULT_EVALUATOR.evaluate(m, EvaluationContext())
    assert not r.passed and "no manual status" in r.detail


def test_failed_count_without_a_measure_is_unknown_not_zero(tmp_path: Path):
    """A count objective whose command crashes before printing a number must
    not read as "0 found" and meet a "<=0" target."""
    ctx = EvaluationContext(project_path=tmp_path, allowlist={PY})
    r = DEFAULT_EVALUATOR.evaluate(
        obj(command=[PY, "-c", "raise SystemExit('source unreachable')"], target="<=0"), ctx
    )
    assert r.measured is None
    assert r.state == "unknown"
    assert not r.passed and not r.target_met
    assert "no_measure" in r.detail and "source unreachable" in r.detail


def test_failed_count_with_a_measure_keeps_it(tmp_path: Path):
    ctx = EvaluationContext(project_path=tmp_path, allowlist={PY})
    r = DEFAULT_EVALUATOR.evaluate(
        obj(command=[PY, "-c", "print(3); raise SystemExit(1)"], target="<=0"), ctx
    )
    assert r.measured == 3.0 and r.state == "failed" and "no_measure" not in r.detail
