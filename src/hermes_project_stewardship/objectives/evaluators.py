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
from datetime import datetime, timedelta, timezone
from dataclasses import dataclass
from pathlib import Path
from typing import Callable, FrozenSet, Optional

from ..domain.models import Objective, ObjectiveResult
from ..security.allowlist import CommandNotPermitted, run_allowlisted

_TARGET_RE = re.compile(r"^(>=|<=|>|<|==|!=)\s*(-?\d+(?:\.\d+)?)$")


@dataclass
class EvaluationContext:
    project_path: Optional[Path] = None
    allowlist: FrozenSet[str] = frozenset()
    timeout_seconds: int = 60
    github_evidence: Optional[dict] = None
    clock: Callable[[], datetime] = lambda: datetime.now(timezone.utc)


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
        if not objective.enabled:
            return ObjectiveResult(objective.id or -1, objective.name, False, None, False,
                                   "not_applicable: objective archived")
        if objective.evaluator_type == "command":
            return self._eval_command(objective, ctx)
        if objective.evaluator_type == "manual":
            return self._eval_manual(objective, ctx)
        if objective.evaluator_type == "integration":
            if objective.integration == "github" and ctx.github_evidence is not None:
                evidence = ctx.github_evidence
                state = evidence.get("state", "unknown")
                measured = (1.0 if state == "passed" else 0.0) if state in {"passed", "failed"} else None
                met = measured is not None and _compare(measured, objective.target)
                return ObjectiveResult(
                    objective_id=objective.id or -1, name=objective.name,
                    passed=state == "passed" and met, measured=measured,
                    target_met=met, detail=str(evidence.get("detail", "unknown: GitHub evidence unavailable")),
                )
            return ObjectiveResult(
                objective_id=objective.id or -1,
                name=objective.name,
                passed=False,
                measured=None,
                target_met=False,
                detail="unavailable: integration collector is not configured",
            )
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
                detail="unknown: no manual status recorded",
            )
        if not status.get("evidence"):
            return ObjectiveResult(
                objective_id=objective.id or -1,
                name=objective.name,
                passed=False,
                measured=None,
                target_met=False,
                detail="unknown: manual result has no evidence",
            )
        recorded_at = status.get("recorded_at")
        if recorded_at:
            try:
                stamp = datetime.fromisoformat(str(recorded_at).replace("Z", "+00:00"))
                window = re.fullmatch(r"([1-9][0-9]{0,3})d", objective.window)
                if stamp.utcoffset() is None or not window or stamp > ctx.clock():
                    raise ValueError("invalid sample time/window")
                if stamp < ctx.clock() - timedelta(days=int(window.group(1))):
                    return ObjectiveResult(objective.id or -1, objective.name, False, None, False,
                                           "stale: manual evidence outside objective window")
            except ValueError:
                return ObjectiveResult(objective.id or -1, objective.name, False, None, False,
                                       "unknown: invalid sample time/window")
        expires_at = status.get("expires_at")
        if expires_at:
            try:
                expiry = datetime.fromisoformat(str(expires_at).replace("Z", "+00:00"))
                if expiry.utcoffset() is None:
                    raise ValueError("evidence expiry requires a timezone")
                if expiry <= ctx.clock():
                    return ObjectiveResult(
                        objective_id=objective.id or -1,
                        name=objective.name,
                        passed=False,
                        measured=None,
                        target_met=False,
                        detail="stale: manual evidence has expired",
                    )
            except ValueError:
                return ObjectiveResult(
                    objective_id=objective.id or -1,
                    name=objective.name,
                    passed=False,
                    measured=None,
                    target_met=False,
                    detail="unknown: invalid manual evidence expiry",
                )
        measured = 1.0 if status["passed"] else 0.0
        met = _compare(measured, objective.target)
        return ObjectiveResult(
            objective_id=objective.id or -1,
            name=objective.name,
            passed=bool(status["passed"]) and met,
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
