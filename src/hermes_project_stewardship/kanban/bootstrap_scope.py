"""Prepare a repo-free Hermes oversight project without binding the board.

Candidate only; dry-run by default. --apply backs up each existing SQLite DB
before mutation. It never creates, edits, transitions or deletes board tasks.
If interrupted between the two stores, rerun with the same inputs; existing
Stewardship settings are never reset. No service or scheduler is changed here.
"""
from __future__ import annotations

import argparse
import os
from pathlib import Path
import sqlite3

from hermes_cli import projects_db
from hermes_project_stewardship.kanban.vanilla_host import ProjectKanbanHost
from hermes_project_stewardship.persistence.service import StewardshipService
from hermes_project_stewardship.persistence.store import Store

SLUG = 'hcc-shared-oversight'
NAME = 'HCC shared multi-repository oversight'
MISSION = 'Oversee shared work across repositories without changing task ownership or default workspaces.'


def ro(path: Path):
    if not path.is_file():
        raise ValueError(f'existing database required: {path}')
    return sqlite3.connect(path.resolve().as_uri() + '?mode=ro', uri=True, timeout=5)


def backup(path: Path) -> Path:
    original = path.with_name(path.name + '.bak.orig')
    second = path.with_name(path.name + '.bak')
    prefix = path.name + '.bak.'
    numbers = [int(p.name[len(prefix):]) for p in path.parent.glob(prefix + '*') if p.name[len(prefix):].isdigit()]
    dest = original if not original.exists() else second if not second.exists() else path.with_name(prefix + str(max(numbers, default=0) + 1))
    fd = os.open(dest, os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o600)
    os.close(fd)
    src, dst = ro(path), sqlite3.connect(dest)
    try:
        src.backup(dst)
        if dst.execute('PRAGMA quick_check').fetchone()[0] != 'ok':
            raise RuntimeError('backup integrity check failed')
    finally:
        dst.close()
        src.close()
    return dest


def bootstrap(*, home: Path, stewardship_db: Path, apply: bool = False):
    home, stewardship_db = home.resolve(), stewardship_db.resolve()
    if Path(os.environ.get('HERMES_HOME', '')).resolve() != home:
        raise ValueError('HERMES_HOME must match the explicit target home')
    project_db = projects_db.projects_db_path().resolve()
    if project_db != home / 'projects.db':
        raise ValueError('unexpected canonical project database path')
    board = ProjectKanbanHost(hermes_home=home, board='default').get_board('default')
    if board.get('slug') != 'default' or board.get('project_id'):
        raise ValueError('shared default board must exist and remain unbound')
    with ro(project_db) as conn:
        existing = conn.execute('SELECT id,name,board_slug,primary_path,archived FROM projects WHERE slug=?', (SLUG,)).fetchone()
    if existing and (existing[1] != NAME or existing[2] != 'default' or existing[3] or existing[4]):
        raise ValueError('existing oversight project has incompatible settings')
    with ro(stewardship_db) as conn:
        local = conn.execute('SELECT enabled,archived_at FROM project_stewardship WHERE project_id=?',
                             (existing[0],)).fetchone() if existing else None
    if local and (not local[0] or local[1]):
        raise ValueError('existing stewardship scope is disabled or archived; no settings changed')
    if not apply:
        return {'apply': False, 'project_exists': bool(existing), 'stewardship_exists': bool(local),
                'project_id': existing[0] if existing else None, 'board_unbound': True}
    if not existing:
        backup(project_db)
        with projects_db.connect_closing() as conn:
            project_id = projects_db.create_project(conn, name=NAME, slug=SLUG, board_slug='default')
            created = projects_db.get_project(conn, project_id)
            if created.slug != SLUG or created.primary_path or created.board_slug != 'default':
                raise RuntimeError('scope created with unexpected attributes; investigate before retry')
    else:
        project_id = existing[0]
    if not local:
        backup(stewardship_db)
        store = Store(stewardship_db)
        try:
            StewardshipService(store).enable(project_id, mission=MISSION, lead_profile='default',
                member_profiles=['default'], autonomy_level=0, actor='hcc-integration', interface='bootstrap')
        finally:
            store.close()
    board_after = ProjectKanbanHost(hermes_home=home, board='default').get_board('default')
    if board_after.get('project_id'):
        raise RuntimeError('shared board ownership changed during bootstrap')
    return {'apply': True, 'project_id': project_id, 'board_unbound': True,
            'new_project': not bool(existing), 'new_stewardship': not bool(local)}


def main():
    import json
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--home', type=Path, required=True)
    parser.add_argument('--db', type=Path, required=True)
    parser.add_argument('--apply', action='store_true')
    args = parser.parse_args()
    print(json.dumps(bootstrap(home=args.home, stewardship_db=args.db, apply=args.apply), sort_keys=True))


if __name__ == '__main__':
    main()
