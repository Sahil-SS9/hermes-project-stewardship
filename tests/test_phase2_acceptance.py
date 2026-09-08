import socket
import threading
import time

import httpx2
import pytest
import uvicorn

from hermes_project_stewardship.api.server import create_app
from hermes_project_stewardship.kanban import ReferenceKanbanAdapter
from hermes_project_stewardship.persistence import store as store_module
from hermes_project_stewardship.persistence.service import StewardshipService
from hermes_project_stewardship.persistence.store import Store


def test_upgrade_from_pre_assessments_preserves_objective_and_settings(tmp_path, monkeypatch):
    migrations = store_module.MIGRATIONS
    with monkeypatch.context() as context:
        context.setattr(store_module, 'MIGRATIONS', [m for m in migrations if m.version < 18])
        old = Store(tmp_path / 'old.db')
        svc = StewardshipService(old)
        svc.enable('old', lead_profile='human')
        objective = svc.add_objective('old', name='preserved', evaluator_type='manual', target='>=1')
        old.close()
    new = Store(tmp_path / 'old.db')
    svc = StewardshipService(new)
    assert svc.objectives('old')[0].id == objective['id']
    assert svc.objective_evidence('old', objective['id'])['state'] == 'unknown'
    svc.record_assessment('old', objective['id'], passed=True, evidence=['upgrade:receipt'], trusted_principal='human')
    new.close()
    repeated = Store(tmp_path / 'old.db')
    assert len(StewardshipService(repeated).assessments('old')) == 1
    repeated.close()


def test_real_http_boot_assessment_and_readback(tmp_path):
    store = Store(tmp_path / 'http.db')
    svc = StewardshipService(store)
    svc.enable('http', lead_profile='human')
    obj = svc.add_objective('http', name='runtime', evaluator_type='manual', target='>=1')
    app = create_app(store, auth_token='test-only', auth_principal='test-human', auth_principal_is_human=True, kanban_adapter=ReferenceKanbanAdapter(store))
    sock = socket.socket()
    sock.bind(('127.0.0.1', 0))
    address = f'http://127.0.0.1:{sock.getsockname()[1]}'
    server = uvicorn.Server(uvicorn.Config(app, log_level='error'))
    thread = threading.Thread(target=server.run, kwargs={'sockets': [sock]}, daemon=True)
    thread.start()
    try:
        deadline = time.monotonic() + 10
        while not server.started and thread.is_alive() and time.monotonic() < deadline:
            time.sleep(0.01)
        assert server.started, 'real API failed to boot'
        with httpx2.Client(base_url=address, headers={'Authorization': 'Bearer test-only'}, timeout=5) as client:
            assert client.get('/healthz').status_code == 200
            base = f'/stewardship/v1/projects/http/objectives/{obj["id"]}'
            denied = client.post(base+'/assessment', headers={'Authorization':'Bearer wrong'}, json={'passed':True,'evidence':['test:1']})
            assert denied.status_code == 401
            response = client.post(base+'/assessment', json={'passed':True,'evidence':['test:1']})
            assert response.status_code == 200, response.text
            rows = client.get('/stewardship/v1/projects/http/objectives').json()['objectives']
            assert rows[0]['can_record_assessment'] is True
            assert rows[0]['evidence']['state'] == 'passed'
            assert rows[0]['evidence']['history'][0]['verified_actor'] == 'test-human'
    finally:
        server.should_exit = True
        thread.join(10)
        sock.close()
        store.close()
    assert not thread.is_alive()


@pytest.mark.parametrize('status', [401, 403, 429, 500])
def test_github_transport_failures_are_unknown_without_credentials(status):
    import subprocess
    from hermes_project_stewardship.objectives.github import collect_github_evidence
    def fetch(path):
        raise subprocess.CalledProcessError(status, ['gh', 'api'], stderr='token=PRIVATE')
    result = collect_github_evidence('owner/repo', 'a'*40, ['tests'], fetch, ref='main')
    assert result['state'] == 'unknown'
    assert 'PRIVATE' not in str(result)
