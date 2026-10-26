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
def test_desktop_pending_transfer_auth(tmp_path, monkeypatch, header, grant, expected):
    monkeypatch.setenv('HERMES_HOME', str(tmp_path))
    monkeypatch.setenv('STEWARD_DB_PATH', str(tmp_path / 'db.sqlite'))
    monkeypatch.delenv('STEWARD_RPC_TOKEN', raising=False)
    monkeypatch.setenv('HERMES_DASHBOARD_SESSION_TOKEN', 'synthetic-desktop-token')
    monkeypatch.setenv('STEWARD_RPC_PRINCIPAL', 'review-human')
    monkeypatch.setenv('STEWARD_RPC_PRINCIPAL_KIND', 'human')
    monkeypatch.setenv('STEWARD_RPC_CAPABILITIES', 'bulk_reassignment' if grant else '')
    path = Path(__file__).parents[1] / 'hermes_dockyard_plugin/dashboard/plugin_api.py'
    spec = importlib.util.spec_from_file_location('isolated_desktop_proxy', path)
    assert spec is not None and spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    StewardshipService(module._store).enable('demo', mission='review', lead_profile='lead')
    app = authenticated_host(module.router, session_token="synthetic-desktop-token")
    headers = {} if header == 'missing' else {'x-hermes-session-token': 'wrong' if header == 'wrong' else 'synthetic-desktop-token'}
    if header == 'bad-bearer':
        headers['authorization'] = 'Bearer deliberately-invalid'
    with TestClient(app) as client:
        response = client.get('/projects/demo/transfers/pending', headers=headers)
    assert response.status_code == expected, response.text
    if expected == 200:
        assert response.json() == {'operations': []}
    module._store.close()
