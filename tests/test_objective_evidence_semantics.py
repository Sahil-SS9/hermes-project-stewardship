from datetime import datetime, timezone, timedelta

from hermes_project_stewardship.domain.models import Objective
from hermes_project_stewardship.objectives.evaluators import DEFAULT_EVALUATOR, EvaluationContext


def _manual(**status):
    objective = Objective(id=7, project_id='p', name='manual', description='', evaluator_type='manual', target='>=1', severity='high', command=None)
    objective._manual_status = status
    return objective


def test_manual_assessment_without_evidence_is_unknown():
    result = DEFAULT_EVALUATOR.evaluate(_manual(passed=True), EvaluationContext())
    assert result.passed is False
    assert result.detail.startswith('unknown:')


def test_manual_assessment_expires_to_stale():
    result = DEFAULT_EVALUATOR.evaluate(_manual(passed=True, evidence=['ticket:1'], expires_at=(datetime.now(timezone.utc) - timedelta(days=1)).isoformat()), EvaluationContext())
    assert result.passed is False
    assert result.detail.startswith('stale:')


def test_manual_expiry_uses_injected_clock():
    now = datetime(2030, 1, 1, tzinfo=timezone.utc)
    objective = _manual(passed=True, evidence=['ticket:1'], expires_at=now.isoformat())
    result = DEFAULT_EVALUATOR.evaluate(objective, EvaluationContext(clock=lambda: now))
    assert result.detail.startswith('stale:')


def test_timezone_free_expiry_is_unknown_not_a_crash():
    objective = _manual(passed=True, evidence=['ticket:1'], expires_at='2030-01-01T00:00:00')
    result = DEFAULT_EVALUATOR.evaluate(objective, EvaluationContext())
    assert not result.passed
    assert result.detail.startswith('unknown:')


def test_unsupported_integration_is_not_a_false_pass():
    objective = Objective(id=8, project_id='p', name='ci', description='', evaluator_type='integration', target='>=1', severity='high', command=None, integration='github')
    result = DEFAULT_EVALUATOR.evaluate(objective, EvaluationContext())
    assert result.passed is False
    assert 'unavailable' in result.detail
