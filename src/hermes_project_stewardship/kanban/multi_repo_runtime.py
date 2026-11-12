"""HCC API and workflow tick using the multi-repository adapter.

Activation is controlled externally by user services. An explicit scope ID and
Hermes home are required; this module never creates or binds a board/project.
The upstream tick is GLOBAL: it can advance eligible runs for all projects in
the same Stewardship database, not just the named oversight scope.
"""
from __future__ import annotations

import argparse
import json
import os
from pathlib import Path

from hermes_project_stewardship.api.server import create_app as upstream_create_app
from hermes_project_stewardship.kanban.host_adapter import create_project_kanban_adapter
from hermes_project_stewardship.persistence.workflow_service import WorkflowService
from hermes_project_stewardship.runtime import open_store

from hermes_project_stewardship.kanban.multi_repo_adapter import MultiRepoAdapter


def make_adapter(*, hermes_home: str, scope_id: str, board: str = 'default'):
    if not scope_id or not hermes_home or not board:
        raise ValueError('explicit Hermes home, oversight scope and board required')
    upstream = create_project_kanban_adapter(hermes_home=hermes_home, board=board)
    adapter = MultiRepoAdapter(upstream.host, oversight_project_id=scope_id, shared_board=board)
    # Refuse startup/tick before any mutation if the binding isn't safe.
    adapter.ensure_board(scope_id, board)
    return adapter


def create_app():
    adapter = make_adapter(hermes_home=os.environ.get('HERMES_HOME', ''),
                           scope_id=os.environ.get('HCC_STEWARDSHIP_SCOPE_ID', ''),
                           board=os.environ.get('HCC_STEWARDSHIP_BOARD', 'default'))
    return upstream_create_app(kanban_adapter=adapter)


def tick(*, hermes_home: str, scope_id: str, db_path: Path, board: str = 'default'):
    """Run the upstream global tick, which can advance other project runs too."""
    # A tick can advance work. Do not create a missing database by accident.
    if not db_path.is_file():
        raise ValueError('existing Stewardship database required')
    adapter = make_adapter(hermes_home=hermes_home, scope_id=scope_id, board=board)
    store = open_store(db_path)
    try:
        row = store._conn.execute('SELECT enabled FROM project_stewardship WHERE project_id=? AND archived_at IS NULL',
                                  (scope_id,)).fetchone()
        if row is None or not row['enabled']:
            raise ValueError('enabled oversight scope required')
        result = WorkflowService(store, adapter).tick(interface='hcc-shared-board-timer')
        return {'busy': bool(result['busy']), 'runs': len(result['runs']),
                'skipped': len(result['skipped']), 'failed': len(result['failed'])}
    finally:
        store.close()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--hermes-home', required=True)
    parser.add_argument('--scope-id', required=True)
    parser.add_argument('--db', type=Path, required=True)
    parser.add_argument('--board', default='default')
    args = parser.parse_args()
    try:
        result = tick(hermes_home=args.hermes_home, scope_id=args.scope_id, db_path=args.db, board=args.board)
    except Exception as exc:
        # Avoid publishing task content, environment, or upstream exception text.
        print(json.dumps({'ok': False, 'error': type(exc).__name__}))
        return 1
    print(json.dumps({'ok': not result['failed'] and not result['busy'], **result}))
    return 0 if not result['failed'] and not result['busy'] else 1


if __name__ == '__main__':
    raise SystemExit(main())
