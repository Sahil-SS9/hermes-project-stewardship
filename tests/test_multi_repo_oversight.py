"""Regression tests: multi-repo oversight must not bind the shared board.

Run only with HOME/HERMES_HOME/HERMES_KANBAN_HOME set to a new scratch root.
All boards, projects, and tasks created here are isolated test fixtures.
"""
import os
from pathlib import Path

import pytest

from hermes_cli import kanban_db as kb, kanban_db_connect as kbc, projects_db as pdb
from hermes_project_stewardship.kanban.host_adapter import KanbanAdapterError
from hermes_project_stewardship.kanban.vanilla_host import ProjectKanbanHost
from hermes_project_stewardship.api.server import create_app
from hermes_project_stewardship.persistence.service import StewardshipService
from hermes_project_stewardship.persistence.store import Store
from hermes_project_stewardship.persistence.workflow_service import WorkflowService
from fastapi.testclient import TestClient
from hermes_project_stewardship.kanban.multi_repo_adapter import MultiRepoAdapter
import multi_repo_runtime
from hermes_project_stewardship.kanban import bootstrap_scope


@pytest.fixture
def world(tmp_path, monkeypatch):
    assert str(Path(os.environ['HERMES_HOME']).resolve()).startswith('/home/quick/.hermes/cache/scratch/')
    home = tmp_path / 'isolated-home'
    home.mkdir()
    for key in ('HOME', 'HERMES_HOME', 'HERMES_KANBAN_HOME'):
        monkeypatch.setenv(key, str(home))
    for key in ('HERMES_KANBAN_DB', 'HERMES_KANBAN_BOARD', 'HERMES_KANBAN_TASK'):
        monkeypatch.delenv(key, raising=False)
    repo_a, repo_b = tmp_path / 'repo-a', tmp_path / 'repo-b'
    repo_a.mkdir(); repo_b.mkdir()
    with pdb.connect_closing() as conn:
        group = pdb.create_project(conn, name='Shared oversight', slug='shared-oversight', board_slug='default')
        first = pdb.create_project(conn, name='First repo', primary_path=str(repo_a))
        second = pdb.create_project(conn, name='Second repo', primary_path=str(repo_b))
    with kbc.connect_closing(board='default') as conn:
        old = kb.create_task(conn, title='Unscoped fixture', board='default')
        a = kb.create_task(conn, title='Repo A fixture', board='default', project_id=first)
        b = kb.create_task(conn, title='Repo B fixture', board='default', project_id=second)
    before = dict(kb.read_board_metadata('default'))
    host = ProjectKanbanHost(hermes_home=home, board='default')
    adapter = MultiRepoAdapter(host, oversight_project_id=group, shared_board='default')
    return adapter, (group, first, second), (old, a, b), before


def test_shared_scope_preserves_original_owners_and_workspace_defaults(world):
    adapter, (group, first, second), (old, a, b), before = world
    items = {item['id']: item for item in adapter.list_work(group)}
    assert {old, a, b} <= set(items)
    assert items[old]['source_project_id'] is None
    assert items[a]['source_project_id'] == first
    assert items[b]['source_project_id'] == second
    assert adapter.get_work(group, 'task', a)['source_project_id'] == first
    assert adapter.get_work(group, 'task', b)['source_project_id'] == second
    with kbc.connect_closing(board='default') as conn:
        fresh = kb.get_task(conn, kb.create_task(conn, title='Normal future fixture', board='default'))
        assert fresh.project_id is None and fresh.workspace_kind == 'scratch'
    assert dict(kb.read_board_metadata('default')) == before


def test_stewardship_created_work_uses_original_scratch_default(world):
    adapter, (group, _, _), _, before = world
    item = adapter.create_work(group, kind='task', title='Stewardship fixture', body='fixture', assignee=None, created_by='test')
    with kbc.connect_closing(board='default') as conn:
        task = kb.get_task(conn, item['id'])
        assert task.project_id is None and task.workspace_kind == 'scratch'
    assert dict(kb.read_board_metadata('default')) == before


def test_scope_fails_closed_if_board_or_project_changes(world):
    adapter, (group, first, _), _, _ = world
    with pytest.raises(KanbanAdapterError):
        adapter.ensure_board(first, 'default')
    with pytest.raises(KanbanAdapterError):
        adapter.ensure_board(group, 'not-default')
    kb.write_board_metadata('default', project_id=first)
    with pytest.raises(KanbanAdapterError):
        adapter.ensure_board(group, 'default')


def test_real_dashboard_api_reads_shared_scope_without_changing_tasks(world, tmp_path):
    adapter, (group, _, _), _, before = world
    with kbc.connect_closing(board='default') as conn:
        previous = [tuple(row) for row in conn.execute('SELECT id,status,project_id,workspace_kind,workspace_path FROM tasks ORDER BY id')]
    store = Store(tmp_path / 'stewardship.db')
    try:
        StewardshipService(store).enable(group, mission='Oversee a shared multi-repo board without claiming its projects',
                                         lead_profile='default', member_profiles=['default'], autonomy_level=0)
        client = TestClient(create_app(store, kanban_adapter=adapter, auth_token='fixture-token'))
        assert client.get('/stewardship/v1/dashboard').status_code == 401
        response = client.get('/stewardship/v1/dashboard', headers={'Authorization': 'Bearer fixture-token'})
        assert response.status_code == 200, response.text
        scope = next(p for p in response.json()['projects'] if p['id'] == group)
        assert scope['linked'] is True
        assert sum(scope['work'].values()) == 3
    finally:
        store.close()
    with kbc.connect_closing(board='default') as conn:
        after = [tuple(row) for row in conn.execute('SELECT id,status,project_id,workspace_kind,workspace_path FROM tasks ORDER BY id')]
    assert after == previous
    assert dict(kb.read_board_metadata('default')) == before


def test_real_workflow_runs_with_scratch_without_rebinding_board(world, tmp_path):
    adapter, (group, _, _), existing, before = world
    store = Store(tmp_path / 'workflow.db')
    try:
        StewardshipService(store).enable(group, mission='Oversight', lead_profile='default',
                                         member_profiles=['default'], autonomy_level=2)
        service = WorkflowService(store, adapter)
        service.define(group, 'fixture-flow', {'nodes': [
            {'id': 'first', 'title': 'First fixture step', 'depends_on': [], 'human_gate': False, 'phase_team': 'default'},
            {'id': 'second', 'title': 'Second fixture step', 'depends_on': ['first'], 'human_gate': False, 'phase_team': 'default'},
        ]})
        service.start(group, 'fixture-flow', 'fixture-run')
        result = __import__('json').loads(service._run_row(group, 'fixture-flow', 'fixture-run')['result_json'])
        first, second = result['tasks']['first'], result['tasks']['second']
        with kbc.connect_closing(board='default') as conn:
            for item_id in (first, second):
                task = kb.get_task(conn, item_id)
                assert task.project_id is None and task.workspace_kind == 'scratch'
            kb.recompute_ready(conn)
            assert kb.claim_task(conn, first, claimer='fixture-worker') is not None
            assert kb.complete_task(conn, first, summary='fixture step completed')
        tick = multi_repo_runtime.tick(hermes_home=os.environ['HERMES_HOME'], scope_id=group, db_path=tmp_path / 'workflow.db')
        assert not tick['failed'] and tick['runs'] == 1
        with kbc.connect_closing(board='default') as conn:
            kb.recompute_ready(conn)
            assert kb.claim_task(conn, second, claimer='fixture-worker') is not None
            assert kb.complete_task(conn, second, summary='fixture step completed')
        tick = multi_repo_runtime.tick(hermes_home=os.environ['HERMES_HOME'], scope_id=group, db_path=tmp_path / 'workflow.db')
        assert not tick['failed']
        assert service._run_row(group, 'fixture-flow', 'fixture-run')['status'] == 'complete'
        assert dict(kb.read_board_metadata('default')) == before
        with kbc.connect_closing(board='default') as conn:
            assert all(kb.get_task(conn, item_id) is not None for item_id in existing)
    finally:
        store.close()


def test_paginated_shared_scope_never_drops_other_projects(world):
    adapter, (group, first, second), _, _ = world
    original = adapter.host._host
    class PagedHost:
        def __getattr__(self, name):
            return getattr(original, name)
        def list_tasks(self, *, board, limit, offset):
            assert board == 'default' and limit == 500
            rows = [{'id': f'fixture-{i}', 'project_id': first if i % 2 else second, 'status': 'ready'}
                    for i in range(offset, min(offset + limit, 601))]
            return {'items': rows, 'has_more': offset + limit < 601, 'next_offset': offset + limit}
        def list_epics(self, **kwargs):
            return {'items': [], 'has_more': False}
    paged = MultiRepoAdapter(PagedHost(), oversight_project_id=group, shared_board='default')
    rows = paged.list_work(group)
    assert len(rows) == 601 and len({row['id'] for row in rows}) == 601
    assert {row['source_project_id'] for row in rows} == {first, second}


def test_bad_pagination_is_error_not_partial_success(world):
    adapter, (group, _, _), _, _ = world
    original = adapter.host._host
    class BrokenPageHost:
        def __getattr__(self, name):
            return getattr(original, name)
        def list_tasks(self, **kwargs):
            return {'items': [], 'has_more': True, 'next_offset': 0}
    broken = MultiRepoAdapter(BrokenPageHost(), oversight_project_id=group, shared_board='default')
    with pytest.raises(KanbanAdapterError):
        broken.list_work(group)


def test_candidate_runtime_api_and_timer_share_the_scope(world, tmp_path, monkeypatch):
    _, (group, _, _), _, before = world
    db_path = tmp_path / 'runtime.db'
    store = Store(db_path)
    try:
        StewardshipService(store).enable(group, mission='Shared oversight', lead_profile='default',
                                         member_profiles=['default'], autonomy_level=0)
    finally:
        store.close()
    monkeypatch.setenv('STEWARD_DB_PATH', str(db_path))
    monkeypatch.setenv('STEWARD_RPC_TOKEN', 'fixture-token')
    monkeypatch.setenv('HCC_STEWARDSHIP_SCOPE_ID', group)
    app = multi_repo_runtime.create_app()
    try:
        client = TestClient(app)
        headers = {'Authorization': 'Bearer fixture-token'}
        assert client.get('/stewardship/v1/dashboard', headers=headers).json()['projects'][0]['linked'] is True
        result = multi_repo_runtime.tick(hermes_home=os.environ['HERMES_HOME'], scope_id=group, db_path=db_path)
        assert result == {'busy': False, 'runs': 0, 'skipped': 0, 'failed': 0}
        assert client.get('/stewardship/v1/workflows/timer', headers=headers).json()['moving'] is True
        assert dict(kb.read_board_metadata('default')) == before
    finally:
        app.state.svc.store.close()


def test_candidate_runtime_refuses_missing_db_and_binding(world, tmp_path):
    _, (group, _, _), _, before = world
    missing = tmp_path / 'must-not-create.db'
    with pytest.raises(ValueError):
        multi_repo_runtime.tick(hermes_home=os.environ['HERMES_HOME'], scope_id=group, db_path=missing)
    assert not missing.exists()
    with pytest.raises(KanbanAdapterError):
        multi_repo_runtime.make_adapter(hermes_home=os.environ['HERMES_HOME'], scope_id='not-a-project')
    assert dict(kb.read_board_metadata('default')) == before


def test_bootstrap_is_idempotent_and_preserves_board_and_tasks(world, tmp_path):
    _, _, _, before = world
    home = Path(os.environ['HERMES_HOME'])
    db = tmp_path / 'bootstrap-stewardship.db'
    store = Store(db)
    store.close()
    with kbc.connect_closing(board='default') as conn:
        tasks_before = [tuple(row) for row in conn.execute('SELECT id,status,project_id,workspace_kind,workspace_path FROM tasks ORDER BY id')]
    assert bootstrap_scope.bootstrap(home=home, stewardship_db=db)['project_exists'] is False
    first = bootstrap_scope.bootstrap(home=home, stewardship_db=db, apply=True)
    second = bootstrap_scope.bootstrap(home=home, stewardship_db=db, apply=True)
    assert first['new_project'] and first['new_stewardship']
    assert not second['new_project'] and not second['new_stewardship']
    assert first['project_id'] == second['project_id']
    assert (home / 'projects.db.bak.orig').is_file()
    assert db.with_name(db.name + '.bak.orig').is_file()
    adapter = multi_repo_runtime.make_adapter(hermes_home=str(home), scope_id=first['project_id'])
    assert len(adapter.list_work(first['project_id'])) == len(tasks_before)
    with kbc.connect_closing(board='default') as conn:
        after = [tuple(row) for row in conn.execute('SELECT id,status,project_id,workspace_kind,workspace_path FROM tasks ORDER BY id')]
    assert after == tasks_before and dict(kb.read_board_metadata('default')) == before
