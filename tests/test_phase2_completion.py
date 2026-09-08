from datetime import timedelta

import pytest

from hermes_project_stewardship.domain.models import Objective
from hermes_project_stewardship.objectives.evaluators import DEFAULT_EVALUATOR, EvaluationContext
from hermes_project_stewardship.persistence.service import ServiceError


def test_manual_target_is_authoritative():
    obj = Objective(1, 'p', 'target', '', 'manual', '>=2', 'high')
    obj._manual_status = {'passed': True, 'evidence': ['test:receipt']}
    result = DEFAULT_EVALUATOR.evaluate(obj, EvaluationContext())
    assert not result.passed
    assert result.state == 'failed'


def test_archived_objective_not_applicable():
    obj = Objective(1, 'p', 'archived', '', 'manual', '>=1', 'high', enabled=False)
    assert DEFAULT_EVALUATOR.evaluate(obj, EvaluationContext()).state == 'not_applicable'


@pytest.mark.parametrize('options', [dict(integration='unsupported', evaluator_type='integration'), dict(window='whenever'), dict(target='looks good')])
def test_unsupported_configuration_is_rejected(svc, enabled, options):
    with pytest.raises(ServiceError):
        svc.add_objective(enabled, **{'name': 'invalid', 'target': '>=1', 'evaluator_type': 'manual', **options})


def test_cycle_applies_high_severity(engine, svc, enabled):
    obj = svc.add_objective(enabled, name='failure', evaluator_type='manual', target='>=1', severity='high')
    svc.record_assessment(enabled, obj['id'], passed=False, evidence=['test:failure'], trusted_principal='human')
    result = engine.run_cycle(enabled)
    assert result['health']['state'] == 'degraded'


def test_manual_window_expires_cycle_evidence(engine, svc, enabled):
    now = svc._clock()
    obj = svc.add_objective(enabled, name='old', evaluator_type='manual', target='>=1', window='7d')
    svc._clock = lambda: now - timedelta(days=8)
    svc.record_assessment(enabled, obj['id'], passed=True, evidence=['test:old'], trusted_principal='human')
    svc._clock = lambda: now
    result = engine.run_cycle(enabled)
    assert result['health']['state'] == 'unknown'
    assert result['objectives'][0]['state'] == 'stale'
