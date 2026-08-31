"""Objective evaluators: manual and command types (deterministic).

Targets use a small, strict comparison grammar:
    ">=0.99", "<=5", ">90", "<10", "==1", "!=0"
The measured value is:
- command evaluator: exit code 0 => 1.0 else 0.0 (unless the command's stdout
  ends with a single float on the last line — then that float is the measure);
- manual evaluator: the recorded status passed with evidence.

Command evaluators ALWAYS run through security.allowlist.run_allowlisted.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from pathlib import Path
from typing import FrozenSet, Optional

from ..domain.models import Objective, ObjectiveResult
from ..security.allowlist import CommandNotPermitted, run_allowlisted

_TARGET_RE = re.compile(r"^(>=|<=|>|<|==|!=)\s*(-?\d+(?:\.\d+)?)$")


@dataclass
class EvaluationContext:
    project_path: Optional[Path] = None
    allowlist: FrozenSet[str] = frozenset()
    timeout_seconds: int = 60


def parse_target(target: str):
    m = _TARGET_RE.match(target.strip())
    if not m:
        raise ValueError(
            f"invalid target '{target}'; expected one of >= <= > < == != followed by a number"
        )
    op, num = m.group(1), float(m.group(2))
    return op, num


def _compare(measured: float, target: str) -> bool:
    op, num = parse_target(target)
    return {
        ">=": measured >= num,
        "<=": measured <= num,
        ">": measured > num,
        "<": measured < num,
        "==": measured == num,
        "!=": measured != num,
    }[op]


class ObjectiveEvaluator:
    def evaluate(self, objective: Objective, ctx: EvaluationContext) -> ObjectiveResult:
        if objective.evaluator_type == "command":
            return self._eval_command(objective, ctx)
        if objective.evaluator_type == "manual":
            return self._eval_manual(objective, ctx)
        raise ValueError(
            f"evaluator_type '{objective.evaluator_type}' not implemented in 0.1.x"
        )

    def _eval_manual(self, objective: Objective, ctx: EvaluationContext) -> ObjectiveResult:
        # Manual objectives are updated by humans/agents WITH evidence via
        # record_manual_status; absence of a recorded status = unknown pass.
        status = getattr(objective, "_manual_status", None)
        if status is None:
            return ObjectiveResult(
                objective_id=objective.id or -1,
                name=objective.name,
                passed=False,
                measured=None,
                target_met=False,
                detail="no manual status recorded",
            )
        measured = 1.0 if status["passed"] else 0.0
        try:
            met = _compare(measured, objective.target)
        except ValueError:
            met = bool(status["passed"])
        return ObjectiveResult(
            objective_id=objective.id or -1,
            name=objective.name,
            passed=bool(status["passed"]),
            measured=measured,
            target_met=met,
            detail=str(status.get("detail", "")),
        )

    def _eval_command(self, objective: Objective, ctx: EvaluationContext) -> ObjectiveResult:
        assert objective.command, "command objective requires argv"
        if not ctx.project_path or not Path(ctx.project_path).exists():
            return ObjectiveResult(
                objective_id=objective.id or -1,
                name=objective.name,
                passed=False,
                measured=None,
                target_met=False,
                detail=f"project path missing: {ctx.project_path}",
            )
        try:
            result = run_allowlisted(
                [str(c) for c in objective.command],
                cwd=Path(ctx.project_path),
                allowlist=ctx.allowlist,
                timeout_seconds=ctx.timeout_seconds,
            )
        except CommandNotPermitted as e:
            return ObjectiveResult(
                objective_id=objective.id or -1,
                name=objective.name,
                passed=False,
                measured=None,
                target_met=False,
                detail=f"blocked: {e}",
            )
        measured = self._measure(result)
        target_met = _compare(measured, objective.target) if measured is not None else False
        passed = result.ok and (target_met if measured is not None else True)
        detail = (
            f"exit={result.exit_code}"
            + (" timed_out" if result.timed_out else "")
            + (f" stderr_head={result.stderr[:200]}" if result.stderr and not result.ok else "")
        )
        return ObjectiveResult(
            objective_id=objective.id or -1,
            name=objective.name,
            passed=passed,
            measured=measured,
            target_met=target_met,
            detail=detail,
        )

    @staticmethod
    def _measure(result) -> Optional[float]:
        """Exit-code-first semantics with optional numeric stdout override."""
        if result.timed_out:
            return None
        lines = [line.strip() for line in (result.stdout or "").splitlines() if line.strip()]
        if lines:
            m = re.fullmatch(r"-?\d+(?:\.\d+)?", lines[-1])
            if m:
                return float(m.group(0))
        return 1.0 if result.ok else 0.0


DEFAULT_EVALUATOR = ObjectiveEvaluator()
