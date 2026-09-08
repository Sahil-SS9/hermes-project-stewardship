"""P2.1/P2.2: objective evidence semantics and persisted manual assessments.

Covers: unsupported integrations, stale evidence, severity semantics,
persisted manual assessments (result, evidence, verified actor, timestamp,
expiry), reopen preservation, export/restore, and trusted-actor authority
(fail closed — payload actors are never authority).
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from pathlib import Path

import pytest

from hermes_project_stewardship.cycles.engine import CycleEngine
from hermes_project_stewardship.domain.health import DEFAULT_HEALTH_MACHINE
from hermes_project_stewardship.domain.models import Objective
from hermes_project_stewardship.objectives.evaluators import (
    DEFAULT_EVALUATOR,
    EvaluationContext,
)
from hermes_project_stewardship.persistence.backup import export_store, restore_store
from hermes_project_stewardship.persistence.service import ServiceError, StewardshipService
from hermes_project_stewardship.persistence.store import Store

from tests.conftest import enable_project

# Frozen clock in conftest: 2026-08-21 12:00 UTC.
_NOT_EXPIRED = "2027-01-01T00:00:00+00:00"
_EXPIRED = "2026-08-20T00:00:00+00:00"


def _manual(**status):
    objective = Objective(id=7, project_id='p', name='manual', description='',
                          evaluator_type='manual', target='>=1', severity='high',
                          command=None)
    objective._manual_status = status
    return objective


# ------------------------------------------------------------------ #
# Evidence semantics (P2.1)                                           #
# ------------------------------------------------------------------ #

def test_unsupported_integration_is_not_a_false_pass():
    objective = Objective(id=8, project_id='p', name='ci', description='',
                          evaluator_type='integration', target='>=1',
                          severity='high', command=None, integration='github')
    result = DEFAULT_EVALUATOR.evaluate(objective, EvaluationContext())
    assert result.passed is False
    assert 'unavailable' in result.detail


def test_stale_and_failed_are_distinct_states():
    """Stale evidence is 'cannot judge', never a failed target comparison."""
    stale = DEFAULT_EVALUATOR.evaluate(
        _manual(passed=True, evidence=['ticket:1'], expires_at=_EXPIRED),
        EvaluationContext())
    failed = DEFAULT_EVALUATOR.evaluate(_manual(passed=False, evidence=['ticket:2']),
                                        EvaluationContext())
    assert stale.detail.startswith('stale:')
    assert not failed.detail.startswith('stale:')
    assert failed.passed is False and failed.measured == 0.0


def test_severity_drives_health_not_result_value():
    """High-severity failure degrades; low-severity failure only watches."""
    derive = DEFAULT_HEALTH_MACHINE.derive
    high = derive(verification_ok=True, critical_signals=[],
                  failed_objectives=[{"severity": "high"}], watch_signals=[])
    low = derive(verification_ok=True, critical_signals=[],
                 failed_objectives=[{"severity": "low"}], watch_signals=[])
    assert high.value == "degraded"
    assert low.value == "watch"


# ------------------------------------------------------------------ #
# Persisted manual assessments (P2.2)                                 #
# ------------------------------------------------------------------ #

def _add_manual_objective(svc, pid):
    return svc.add_objective(pid, name="manual-check", evaluator_type="manual",
                             target=">=1", severity="high")


def test_recorded_assessment_persists_across_reopen(tmp_path):
    store = Store(tmp_path / "p.db")
    svc = StewardshipService(store)
    pid = enable_project(svc, "demo")
    obj = _add_manual_objective(svc, pid)

    record = svc.record_assessment(
        pid, obj["id"], passed=True,
        evidence=["ticket:OPS-1"], detail="verified by hand",
        expires_at=(datetime.now(timezone.utc) + timedelta(days=7)).isoformat(),
        actor="payload-said-this", interface="dockyard:human",
        trusted_principal="sahil",
    )
    assert record["verified_actor"] == "sahil"  # payload actor is never authority
    assert record["evidence"] == ["ticket:OPS-1"]
    assert record["recorded_at"]
    store.close()

    reopened = Store(tmp_path / "p.db")
    svc2 = StewardshipService(reopened)
    latest = svc2.latest_assessment(pid, obj["id"])
    assert latest is not None
    assert latest["passed"] is True
    assert latest["verified_actor"] == "sahil"
    assert latest["evidence"] == ["ticket:OPS-1"]
    assert latest["expires_at"]
    reopened.close()


def test_assessment_requires_trusted_principal_fail_closed(svc, enabled):
    """No trusted authority available -> refuse, never trust the payload."""
    obj = _add_manual_objective(svc, enabled)
    with pytest.raises(ServiceError, match="trusted"):
        svc.record_assessment(
            enabled, obj["id"], passed=True, evidence=["x"],
            actor="attacker", interface="rpc",
        )


def test_assessment_rejects_bot_interface(svc, enabled):
    """A trusted principal cannot launder a bot/agent attribution."""
    obj = _add_manual_objective(svc, enabled)
    with pytest.raises(ServiceError, match="human"):
        svc.record_assessment(
            enabled, obj["id"], passed=True, evidence=["x"],
            actor="sahil", interface="bot",
            trusted_principal="sahil",
        )


def test_trusted_principal_overrides_payload_actor(svc, enabled):
    obj = _add_manual_objective(svc, enabled)
    svc.record_assessment(
        enabled, obj["id"], passed=True, evidence=["ticket:1"],
        actor="payload-actor", interface="dockyard:human",
        trusted_principal="sahil",
    )
    latest = svc.latest_assessment(enabled, obj["id"])
    assert latest["verified_actor"] == "sahil"


def test_assessment_requires_evidence(svc, enabled):
    obj = _add_manual_objective(svc, enabled)
    with pytest.raises(ServiceError, match="evidence"):
        svc.record_assessment(enabled, obj["id"], passed=True, evidence=[],
                              actor="sahil", interface="dockyard:human",
                              trusted_principal="sahil")


def test_assessment_rejects_unsupported_expires_at(svc, enabled):
    obj = _add_manual_objective(svc, enabled)
    with pytest.raises(ServiceError, match="expires_at"):
        svc.record_assessment(enabled, obj["id"], passed=True, evidence=["e"],
                              actor="sahil", interface="dockyard:human",
                              trusted_principal="sahil", expires_at="not-a-date")


def test_assessment_evaluator_reads_persisted_state(svc, enabled, clock):
    """The cycle engine's evaluator sees the persisted assessment."""
    obj = _add_manual_objective(svc, enabled)
    svc.record_assessment(enabled, obj["id"], passed=True, evidence=["ticket:OPS-9"],
                          actor="payload", interface="dockyard:human",
                          trusted_principal="sahil", expires_at=_NOT_EXPIRED)
    r = CycleEngine(svc, clock=clock).run_cycle(enabled)
    manual = [o for o in r["objectives"] if o["objective_id"] == obj["id"]]
    assert len(manual) == 1 and manual[0]["passed"] is True


def test_expired_assessment_evaluates_stale_not_pass(svc, enabled, clock):
    obj = _add_manual_objective(svc, enabled)
    svc.record_assessment(enabled, obj["id"], passed=True, evidence=["ticket:1"],
                          actor="payload", interface="dockyard:human",
                          trusted_principal="sahil", expires_at=_EXPIRED)
    r = CycleEngine(svc, clock=clock).run_cycle(enabled)
    manual = [o for o in r["objectives"] if o["objective_id"] == obj["id"]]
    assert manual[0]["passed"] is False
    assert manual[0]["detail"].startswith("stale:")


def test_assessment_export_restore_roundtrip(tmp_path):
    store = Store(tmp_path / "src.db")
    svc = StewardshipService(store)
    pid = enable_project(svc, "demo")
    obj = _add_manual_objective(svc, pid)
    svc.record_assessment(pid, obj["id"], passed=True, evidence=["e1"],
                          actor="payload", interface="dockyard:human",
                          trusted_principal="sahil")
    archive = Path(tmp_path) / "archive"
    export_store(store, archive)
    store.close()

    restored_db = Path(tmp_path) / "restored.db"
    restore_store(archive, restored_db)
    r2 = Store(restored_db)
    svc2 = StewardshipService(r2)
    latest = svc2.latest_assessment(pid, obj["id"])
    assert latest is not None and latest["verified_actor"] == "sahil"
    r2.close()