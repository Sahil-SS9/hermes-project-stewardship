import pytest

from hermes_project_stewardship.objectives import github


@pytest.mark.parametrize('mismatch', ['ref', 'release', 'draft', 'missing'])
def test_revision_binding_never_passes_wrong_or_unpublished_release(mismatch):
    def fetch(path):
        if '/check-runs?' in path:
            return {'total_count': 1, 'check_runs': [{'name': 'tests', 'head_sha': 'a'*40, 'status': 'completed', 'conclusion': 'success'}]}
        if '/releases/tags/' in path:
            if mismatch == 'missing':
                raise RuntimeError('404 token=PRIVATE')
            return {'tag_name': 'v1', 'draft': mismatch == 'draft', 'published_at': '2026-09-08T00:00:00Z'}
        wrong = (mismatch == 'ref' and path.endswith('/main')) or (mismatch == 'release' and path.endswith('/v1'))
        return {'sha': ('b' if wrong else 'a')*40}
    collector = getattr(github, 'collect_github_evidence', github.collect_checks)
    result = collector('owner/repo', 'a'*40, ['tests'], fetch=fetch, ref='main', release_tag='v1')
    assert result['state'] == 'unknown'
    assert 'PRIVATE' not in str(result)


def test_published_release_and_ref_bound_to_exact_commit():
    calls = []
    def fetch(path):
        calls.append(path)
        if '/check-runs?' in path:
            return {'total_count': 1, 'check_runs': [{'name': 'tests', 'head_sha': 'a'*40, 'status': 'completed', 'conclusion': 'success'}]}
        if '/releases/tags/' in path:
            return {'tag_name': 'v1', 'draft': False, 'published_at': '2026-09-08T00:00:00Z', 'body': 'SECRET'}
        return {'sha': 'a'*40}
    collector = getattr(github, 'collect_github_evidence', github.collect_checks)
    result = collector('owner/repo', 'a'*40, ['tests'], fetch=fetch, ref='feature/test', release_tag='v1')
    assert result['state'] == 'passed'
    assert result['release']['tag'] == 'v1'
    assert result['ref'] == 'feature/test'
    assert 'SECRET' not in str(result)
    assert any('feature%2Ftest' in path for path in calls)
