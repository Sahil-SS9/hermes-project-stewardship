"""Emit actual API objective payloads for both renderer contract tests."""
import json
import os
import sys
import tempfile
from datetime import datetime, timedelta, timezone
from pathlib import Path

import importlib
sys.modules['httpx'] = importlib.import_module('httpx2')


def payload():
    with tempfile.TemporaryDirectory(prefix='phase2-ui-') as directory:
        os.environ['HERMES_HOME'] = directory
        os.environ['HERMES_KANBAN_HOME'] = directory
        os.environ.pop('DOCKYARD_PLUGIN_DB', None)
        os.environ['STEWARD_DB_PATH'] = str(Path(directory) / 'state.db')
        from fastapi.testclient import TestClient
        from hermes_project_stewardship.api.server import create_app
        from hermes_project_stewardship.kanban import ReferenceKanbanAdapter
        from hermes_project_stewardship.persistence.service import StewardshipService
        from hermes_project_stewardship.persistence.store import Store
        store = Store(Path(directory) / 'state.db')
        try:
            service = StewardshipService(store)
            service.enable('payments-relaunch', lead_profile='fixture')
            for state in ['passed', 'failed', 'stale', 'unknown']:
                obj = service.add_objective('payments-relaunch', name=state, evaluator_type='manual', target='>=1')
                if state != 'unknown':
                    service.record_assessment('payments-relaunch', obj['id'], passed=state != 'failed', evidence=['ticket:1'], detail='<script>unsafe</script>', trusted_principal='human', expires_at=(datetime.now(timezone.utc)-timedelta(days=1)).isoformat() if state == 'stale' else None)
            with TestClient(create_app(store, kanban_adapter=ReferenceKanbanAdapter(store))) as client:
                response = client.get('/stewardship/v1/projects/payments-relaunch/objectives')
                response.raise_for_status()
                return response.json()
        finally:
            store.close()


if __name__ == '__main__':
    print(json.dumps(payload()))
