import importlib.util
from pathlib import Path

import pytest
from .dashboard_host import authenticated_host
from fastapi.testclient import TestClient
from hermes_project_stewardship.persistence.service import StewardshipService

@pytest.mark.parametrize('header,grant,expected', [
    ('valid', True, 200), ('wrong', True, 401), ('missing', True, 401),
    ('valid', False, 403), ('bad-bearer', True, 401),
])
def test_desktop_session_auth(tmp_path, monkeypatch, header, grant, expected):
    monkeypatch.setenv('HERMES_HOME', str(tmp_path))
    monkeypatch.setenv('STEWARD_DB_PATH', str(tmp_path / 'db.sqlite'))
    monkeypatch.delenv('STEWARD_RPC_TOKEN', raising=False)
    monkeypatch.setenv('HERMES_DASHBOARD_SESSION_TOKEN', 'synthetic-desktop-token')
    monkeypatch.setenv('STEWARD_RPC_PRINCIPAL', 'review-human')
    monkeypatch.setenv('STEWARD_RPC_PRINCIPAL_KIND', 'human')
    monkeypatch.setenv('STEWARD_RPC_CAPABILITIES', 'project_archive' if grant else '')
    path = Path(__file__).parents[1] / 'hermes_dockyard_plugin/dashboard/plugin_api.py'
    spec = importlib.util.spec_from_file_location('isolated_desktop_proxy', path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    StewardshipService(module._store).enable('demo', mission='review', lead_profile='lead')
    app = authenticated_host(module.router, session_token="synthetic-desktop-token")
    headers = {} if header == 'missing' else {'x-hermes-session-token': 'wrong' if header == 'wrong' else 'synthetic-desktop-token'}
    if header == 'bad-bearer':
        headers['authorization'] = 'Bearer deliberately-invalid'
    with TestClient(app) as client:
        response = client.post('/projects/demo/archive', headers=headers, json={'actor': 'payload-imposter'})
    assert response.status_code == expected, response.text
    row = module._store._conn.execute('SELECT enabled, archived_by FROM project_stewardship WHERE project_id=?', ('demo',)).fetchone()
    assert row['enabled'] == (0 if expected == 200 else 1)
    if expected == 200:
        assert row['archived_by'] == 'review-human'
    module._store.close()
