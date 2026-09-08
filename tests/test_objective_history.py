from datetime import datetime, timedelta, timezone


def test_window_excludes_old_and_future_assessments(svc, enabled):
    now = datetime(2026, 9, 8, tzinfo=timezone.utc)
    obj = svc.add_objective(enabled, name='history', evaluator_type='manual', target='>=1', window='7d')
    for age, passed in [(9, True), (2, False), (1, True), (-1, True)]:
        svc._clock = lambda age=age: now - timedelta(days=age)
        svc.record_assessment(enabled, obj['id'], passed=passed, evidence=['test:receipt'], trusted_principal='human')
    svc._clock = lambda: now
    result = svc.objective_evidence(enabled, obj['id'])
    assert result['sample_count'] == 2
    assert result['pass_rate'] == 0.5
    assert result['state'] == 'passed'
    assert result['evidence_age_seconds'] == 86400


def test_empty_window_has_no_invented_pass_rate(svc, enabled):
    obj = svc.add_objective(enabled, name='empty', evaluator_type='manual', target='>=1')
    result = svc.objective_evidence(enabled, obj['id'])
    assert result['sample_count'] == 0
    assert result['pass_rate'] is None
    assert result['state'] == 'unknown'


def test_expired_latest_assessment_is_stale(svc, enabled):
    now = datetime(2026, 9, 8, tzinfo=timezone.utc)
    svc._clock = lambda: now
    obj = svc.add_objective(enabled, name='expired', evaluator_type='manual', target='>=1')
    svc.record_assessment(enabled, obj['id'], passed=True, evidence=['test:receipt'], trusted_principal='human', expires_at=(now-timedelta(seconds=1)).isoformat())
    assert svc.objective_evidence(enabled, obj['id'])['state'] == 'stale'
