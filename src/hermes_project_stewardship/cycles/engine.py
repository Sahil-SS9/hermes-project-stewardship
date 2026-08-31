"""Stewardship cycle engine: WAKE → VERIFY → SNAPSHOT → ASSESS → GATE.

Guarantees enforced here (each covered by a regression test):
- cross-process mutex: only one cycle per project at a time;
- idempotency: duplicate trigger keys run zero extra cycles;
- fail-closed: Unknown/contradictory state blocks mutating proposals;
- budget: max cycles/day and max initiatives/cycle are hard limits;
- pause/freeze honoured mid-cycle: no new mutating step after observation;
- advisory evidence can never authorise mutations.
"""

from __future__ import annotations

import uuid
from datetime import timedelta
from typing import Any, Dict, List, Optional

from ..domain.constants import (
    CycleState,
    HealthState,
    ProjectPhase,
    TriggerType,
)
from ..domain.health import DEFAULT_HEALTH_MACHINE
from ..events.bus import (
    CYCLE_STARTED,
    HEALTH_CHANGED,
    INITIATIVE_PROPOSED,
    PROJECT_CRITICAL,
    VERIFICATION_FAILED,
    EventBus,
)
from ..objectives.evaluators import DEFAULT_EVALUATOR, EvaluationContext
from ..persistence.service import ServiceError, StewardshipService
from ..verification.engine import VerificationEngine


class CycleRefused(Exception):
    """Cycle did not run (mutex/budget/pause). Not an engine failure."""


class CycleEngine:
    def __init__(
        self,
        service: StewardshipService,
        *,
        verifier: Optional[VerificationEngine] = None,
        clock=None,
        max_initiatives_per_cycle: int = 3,
        max_cycles_per_day: int = 6,
        proposal_fn=None,
    ) -> None:
        self.svc = service
        self.store = service.store
        self.verifier = verifier or VerificationEngine()
        self._clock = clock or service.store._clock
        self.max_initiatives_per_cycle = max_initiatives_per_cycle
        self.max_cycles_per_day = max_cycles_per_day
        # Optional event bus; when present, lifecycle transitions emit the
        # PRD §13 vocabulary (durable + subscribed consumers).
        self.events: Optional[EventBus] = None
        # proposal_fn(project_id, verdict, objective_results, cycle_id) ->
        # list[dict(title=..., rationale=..., risk=..., dedupe_key=...)]
        # In production this is the steward skill's LLM reasoning step; it is
        # ADVISORY input — every proposal is still subject to policy gates,
        # caps, dedupe and approval here.
        self.proposal_fn = proposal_fn

    def attach_events(self, bus: EventBus) -> None:
        self.events = bus

    # ------------------------------------------------------------------ #
    # Public entry                                                       #
    # ------------------------------------------------------------------ #

    def run_cycle(
        self,
        project_id: str,
        *,
        trigger_type: str = TriggerType.MANUAL.value,
        trigger_ref: Optional[str] = None,
        idempotency_key: Optional[str] = None,
        collector_specs=None,
    ) -> Dict[str, Any]:
        key = idempotency_key or f"{project_id}:{trigger_type}:{uuid.uuid4().hex}"
        if self.store.trigger_seen(key):
            raise CycleRefused(f"duplicate trigger {key}: already processed")

        settings = self.svc.settings(project_id)  # raises if disabled
        phase = settings["phase"]
        if phase == ProjectPhase.FROZEN.value:
            raise CycleRefused("project is frozen")
        if phase == ProjectPhase.PAUSED.value and trigger_type != TriggerType.MANUAL.value:
            raise CycleRefused("project is paused (only manual cycles allowed)")

        # Budget guard
        window_start = (self._clock() - timedelta(days=1)).isoformat()
        recent = self.svc.cycles_since(project_id, window_start)
        if recent >= self.max_cycles_per_day:
            raise CycleRefused(
                f"daily cycle budget exhausted ({recent}/{self.max_cycles_per_day})"
            )

        holder = f"cycle:{key}"
        if not self.store.mutex_acquire(project_id, holder):
            current = self.store.mutex_holder(project_id)
            raise CycleRefused(f"another cycle holds the mutex ({current})")

        cycle_id = -1
        try:
            cycle_id = self.svc.cycle_start(
                project_id,
                trigger_type=trigger_type,
                trigger_ref=trigger_ref,
                idempotency_key=key,
            )
            if self.events is not None:
                self.events.emit(
                    CYCLE_STARTED,
                    project_id=project_id,
                    subject=f"cycle:{cycle_id}",
                    payload={"trigger_type": trigger_type, "trigger_ref": trigger_ref},
                )
            result = self._execute(project_id, cycle_id, collector_specs)
            summary = f"health={result['health']['state']}; initiatives={len(result['initiatives'])}"
            self.svc.cycle_finish(cycle_id, state=CycleState.COMPLETED.value, summary=summary)
            result["cycle_id"] = cycle_id
            self.store.trigger_mark(key)
            self.store.prune()
            return result
        except CycleRefused:
            raise
        except Exception as e:
            if cycle_id >= 0:
                self.svc.cycle_finish(
                    cycle_id, state=CycleState.FAILED.value, summary=str(e)[:500]
                )
            raise
        finally:
            self.store.mutex_release(project_id, holder)

    # ------------------------------------------------------------------ #
    # Internals                                                          #
    # ------------------------------------------------------------------ #

    def _execute(self, project_id: str, cycle_id: int, collector_specs) -> Dict[str, Any]:
        settings = self.svc.settings(project_id)
        policies = settings["policies"]

        # 1. VERIFY REALITY (deterministic collectors first).
        specs = collector_specs if collector_specs is not None else self._specs_from_policy(policies)
        verdict = self.verifier.collect(specs)

        # 2. ASSESS OBJECTIVES (only when canonical state is established).
        objective_results: List[Dict[str, Any]] = []
        failed_objectives: List[Dict[str, Any]] = []
        watch_signals: List[str] = []
        critical_signals: List[str] = []

        if verdict.ok:
            ctx = EvaluationContext(
                project_path=self._project_path(specs),
                allowlist=self._allowlist_from(policies),
            )
            for obj in self.svc.objectives(project_id):
                try:
                    res = DEFAULT_EVALUATOR.evaluate(obj, ctx)
                except ValueError as e:
                    res_dict = {
                        "objective_id": obj.id, "name": obj.name, "passed": False,
                        "measured": None, "target_met": False, "detail": f"evaluator error: {e}",
                    }
                else:
                    res_dict = {
                        "objective_id": res.objective_id,
                        "name": res.name,
                        "passed": res.passed,
                        "measured": res.measured,
                        "target_met": res.target_met,
                        "detail": res.detail,
                    }
                objective_results.append(res_dict)
                if not res_dict["passed"]:
                    if obj.severity == "high":
                        failed_objectives.append(res_dict)
                    elif obj.severity == "critical_signal":
                        pass
                    else:
                        failed_objectives.append(res_dict)

        # Critical contradictions force CRITICAL regardless of objectives.
        # Distinguish two fail-closed modes:
        # - injection/attack signals (high severity + untrusted origin) are an
        #   ACTIVE threat → CRITICAL (freezable);
        # - missing/unresolvable state without an attack signal stays UNKNOWN
        #   (cannot judge).
        high_contras = [c for c in verdict.contradictions if c.severity == "high"]
        attack_signal = any(
            "injection" in (c.detail or "").lower()
            or "prompt-injection" in " ".join(c.evidence_refs).lower()
            for c in high_contras
        )
        if not verdict.ok:
            state = HealthState.CRITICAL if attack_signal else HealthState.UNKNOWN
        elif high_contras:  # defensive: should not happen when ok
            state = HealthState.CRITICAL
        else:
            state = DEFAULT_HEALTH_MACHINE.derive(
                verification_ok=True,
                critical_signals=critical_signals,
                failed_objectives=failed_objectives,
                watch_signals=watch_signals,
            )

        # Hysteresis-gated notification decision.
        prev = self.svc.latest_health(project_id)
        from ..domain.constants import HealthState as HS

        previous_state = HS(prev["status"]) if prev else None
        notify = DEFAULT_HEALTH_MACHINE.material_change(previous_state, state)

        score = self._score(objective_results)
        snapshot_id = self.svc.record_health_snapshot(
            project_id,
            status=state.value,
            score=score,
            evidence=[e.__dict__ for e in verdict.evidence],
            contradictions=[c.__dict__ for c in verdict.contradictions],
        )
        self.store.audit(
            actor="system",
            interface="cycle",
            action="health.snapshot_recorded",
            subject=f"{project_id}:{snapshot_id}",
            detail={"state": state.value, "notify": notify},
        )

        # Domain events: verification failure, health change, critical.
        if self.events is not None:
            if not verdict.ok:
                self.events.emit(
                    VERIFICATION_FAILED,
                    project_id=project_id,
                    subject=f"cycle:{cycle_id}",
                    payload={"contradictions": [c.__dict__ for c in verdict.contradictions]},
                )
            if previous_state != state and notify:
                self.events.emit(
                    HEALTH_CHANGED,
                    project_id=project_id,
                    subject=f"{previous_state.value if previous_state else 'none'}"
                            f"->{state.value}",
                    payload={"from": previous_state.value if previous_state else None,
                             "to": state.value, "score": score,
                             "snapshot_id": snapshot_id},
                )
            if state == HealthState.CRITICAL:
                self.events.emit(
                    PROJECT_CRITICAL,
                    project_id=project_id,
                    subject=f"snapshot:{snapshot_id}",
                    payload={
                        "contradictions": [c.__dict__ for c in verdict.contradictions],
                        "auto_freeze": bool(policies.get("release", {}).get("auto_freeze_on_critical", False)),
                    },
                )
                if policies.get("release", {}).get("auto_freeze_on_critical", False):
                    self.svc.freeze(project_id)

        # 3. PROPOSE INITIATIVES (gated; never on unknown/critical).
        # Re-observe phase immediately before any mutating step: a pause/freeze
        # that lands mid-cycle must stop new work from being proposed.
        current_phase = self.svc.settings(project_id)["phase"]
        created: List[Dict[str, Any]] = []
        mutation_blocked_reason = None
        if current_phase != ProjectPhase.ACTIVE.value:
            mutation_blocked_reason = f"project {current_phase} mid-cycle: no new mutations"
            self.store.audit(
                actor="system",
                interface="cycle",
                action="cycle.mutations_blocked",
                subject=f"{project_id}:{cycle_id}",
                detail={"reason": mutation_blocked_reason},
            )
            return self._result(project_id, state, score, snapshot_id, notify,
                                verdict, objective_results, created,
                                mutation_blocked_reason)
        if state in (HealthState.UNKNOWN, HealthState.CRITICAL):
            mutation_blocked_reason = f"fail-closed: health={state.value}"
        elif not verdict.ok:
            mutation_blocked_reason = "fail-closed: verification failed"
        elif self.proposal_fn is not None and failed_objectives:
            remaining = self.max_initiatives_per_cycle
            for prop in self.proposal_fn(project_id, verdict, objective_results, cycle_id):
                # Re-observe phase per item: pause/freeze may land inside the
                # proposer callback (long-running LLM reasoning). The moment a
                # non-active phase is observed, no further mutation happens.
                if self.svc.settings(project_id)["phase"] != ProjectPhase.ACTIVE.value:
                    mutation_blocked_reason = (
                        f"project {self.svc.settings(project_id)['phase']}"
                        " mid-cycle: remaining proposals dropped"
                    )
                    break
                if remaining <= 0:
                    break
                try:
                    ini = self.svc.propose_initiative(
                        project_id,
                        title=str(prop.get("title", ""))[:200],
                        rationale=str(prop.get("rationale", "")),
                        expected_outcome=str(prop.get("expected_outcome", "")),
                        risk=str(prop.get("risk", "medium")),
                        dedupe_key=prop.get("dedupe_key"),
                        source_cycle_id=cycle_id,
                        validation_contract=prop.get("validation_contract"),
                    )
                    created.append(ini)
                    remaining -= 1
                    if self.events is not None:
                        self.events.emit(
                            INITIATIVE_PROPOSED,
                            project_id=project_id,
                            subject=ini["ref"],
                            payload={"title": ini["title"], "risk": ini["risk"],
                                     "source_cycle_id": cycle_id},
                        )
                except ServiceError as e:
                    # Dedupe/cap/suppression refusals are normal outcomes.
                    created.append({"refused": True, "reason": str(e)})
                    continue

        return self._result(project_id, state, score, snapshot_id, notify,
                            verdict, objective_results, created,
                            mutation_blocked_reason)

    @staticmethod
    def _result(project_id, state, score, snapshot_id, notify, verdict,
                objective_results, initiatives, mutation_blocked_reason):
        from ..domain.constants import HealthState as _HS

        return {
            "project_id": project_id,
            "health": {"state": state.value if isinstance(state, _HS) else state,
                       "score": score, "notify": notify,
                       "snapshot_id": snapshot_id},
            "verification_ok": verdict.ok,
            "contradictions": [c.__dict__ for c in verdict.contradictions],
            "objectives": objective_results,
            "initiatives": initiatives,
            "mutation_blocked_reason": mutation_blocked_reason,
        }

    def _specs_from_policy(self, policies: Dict[str, Any]):
        from ..verification.engine import CollectorSpec
        from pathlib import Path

        vp = policies.get("verification", {}) or {}
        specs: List[Any] = []
        repo = vp.get("repo_path")
        if repo:
            specs.append(CollectorSpec(kind="git_status", path=Path(repo)))
            specs.append(CollectorSpec(kind="git_log", path=Path(repo)))
            # Auto-declare canonical repo-surface files: README/AGENTS are the
            # classic injection vector into an agent's context, so they are
            # always scanned when a repo is configured (unless the operator
            # already declared them explicitly).
            declared = {Path(f).name for f in (vp.get("declared_files") or [])}
            for name in ("README.md", "AGENTS.md"):
                if name not in declared:
                    candidate = Path(repo) / name
                    if candidate.exists():
                        specs.append(CollectorSpec(kind="declared_file", path=candidate))
        for f in vp.get("declared_files", []) or []:
            specs.append(CollectorSpec(kind="declared_file", path=Path(f)))
        return specs

    def _project_path(self, specs):

        for s in specs or []:
            if getattr(s, "kind", "") in ("git_status", "git_log") and s.path:
                return s.path
        return None

    @staticmethod
    def _allowlist_from(policies: Dict[str, Any]) -> frozenset:
        from ..security.allowlist import DEFAULT_ALLOWLIST

        configured = (policies.get("verification", {}) or {}).get("command_allowlist")
        if configured is None:
            return DEFAULT_ALLOWLIST
        return frozenset(configured)

    @staticmethod
    def _score(results: List[Dict[str, Any]]) -> float:
        if not results:
            return 1.0
        return round(sum(1 for r in results if r["passed"]) / len(results), 4)
