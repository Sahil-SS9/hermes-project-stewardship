from hermes_project_stewardship.objectives.github import collect_checks


def test_required_check_must_match_sha_and_finish():
    def fetch(path):
        return {'total_count': 1, 'check_runs': [{'name': 'tests', 'head_sha': 'a'*40, 'status': 'completed', 'conclusion': 'success'}]}
    assert collect_checks('owner/repo', 'a'*40, ['tests'], fetch)['state'] == 'passed'
    assert collect_checks('owner/repo', 'b'*40, ['tests'], fetch)['state'] == 'unknown'


def test_missing_pending_failed_and_truncated_never_pass():
    for status, conclusion, total, expected in [
        ('in_progress', None, 1, 'unknown'),
        ('completed', 'failure', 1, 'failed'),
        ('completed', 'success', 101, 'unknown'),
    ]:
        def fetch(path):
            return {'total_count': total, 'check_runs': [{'name': 'tests', 'head_sha': 'a'*40, 'status': status, 'conclusion': conclusion}]}
        assert collect_checks('owner/repo', 'a'*40, ['tests'], fetch)['state'] == expected
    assert collect_checks('owner/repo', 'a'*40, ['tests'], lambda _: {'total_count': 0, 'check_runs': []})['state'] == 'unknown'


def test_transport_errors_do_not_leak_secrets():
    def fetch(path):
        raise RuntimeError('token=SECRET')
    result = collect_checks('owner/repo', 'a'*40, ['tests'], fetch)
    assert result['state'] == 'unknown'
    assert 'SECRET' not in str(result)
