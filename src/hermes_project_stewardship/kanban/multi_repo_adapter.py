"""Candidate shared-board oversight adapter; NOT activated by importing it.

A single governance project scopes a shared multi-repository board without
claiming board ownership or changing default workspace inheritance. Canonical
project IDs remain attached to their original tasks. The adapter's project_id
in the upstream work contract denotes the oversight scope, while
source_project_id retains actual ownership. All other projects keep upstream
semantics. Only an explicitly configured scope is special-cased.
"""
from __future__ import annotations

from typing import Any

from hermes_project_stewardship.kanban.host_adapter import (
    KanbanAdapterError,
    ProjectKanbanHostAdapter,
)


class _PreserveWorkspaceHost:
    """Do not stamp the oversight project onto newly generated work."""

    def __init__(self, host: Any, project_id: str, board: str):
        self._host = host
        self._project_id = project_id
        self._board = board

    def __getattr__(self, name: str) -> Any:
        return getattr(self._host, name)

    def create_task(self, **kwargs: Any) -> dict[str, Any]:
        if kwargs.get('board') == self._board and kwargs.get('project_id') == self._project_id:
            # Empty string explicitly opts out of project inheritance in Hermes.
            # The board is required to remain unbound by ensure_board().
            kwargs['project_id'] = ''
        return self._host.create_task(**kwargs)


class MultiRepoAdapter(ProjectKanbanHostAdapter):
    def __init__(self, host: Any, *, oversight_project_id: str, shared_board: str = 'default'):
        if not oversight_project_id or not shared_board:
            raise ValueError('explicit oversight project and board are required')
        self.oversight_project_id = oversight_project_id
        self.shared_board = shared_board
        super().__init__(_PreserveWorkspaceHost(host, oversight_project_id, shared_board))

    def ensure_board(self, project_id: str, slug: str) -> str:
        if project_id != self.oversight_project_id:
            return super().ensure_board(project_id, slug)
        try:
            project = self.host.get_project(project_id)
            board = self.host.get_board(slug)
            if (slug != self.shared_board or project.get('id') != project_id
                    or project.get('board_slug') != slug or project.get('archived')
                    or project.get('primary_path') or board.get('slug') != slug
                    or board.get('project_id')):
                raise KanbanAdapterError('project_board_mismatch',
                    'shared oversight requires the unbound board and a project without a primary repository')
        except KanbanAdapterError:
            raise
        except Exception as exc:
            raise self._mapped_error(exc) from None
        self._board_projects[slug] = project_id
        return slug

    @staticmethod
    def _work_record(raw: Any, *, project_id: str, kind: str) -> dict[str, Any]:
        record = ProjectKanbanHostAdapter._work_record(raw, project_id=project_id, kind=kind)
        record['source_project_id'] = raw.get('project_id') or None
        return record

    def list_work(self, project_id: str) -> list[dict[str, Any]]:
        if project_id != self.oversight_project_id:
            return super().list_work(project_id)
        board = self.project_board(project_id)
        try:
            def pages(method: Any) -> list[dict[str, Any]]:
                rows: list[dict[str, Any]] = []
                offset = 0
                while True:
                    page = method(board=board, limit=500, offset=offset)
                    rows.extend(page.get('items') or ())
                    if not page.get('has_more'):
                        return rows
                    next_offset = page.get('next_offset')
                    if next_offset is None or int(next_offset) <= offset:
                        raise KanbanAdapterError('host_unavailable', 'canonical pagination was incomplete')
                    offset = int(next_offset)
            return ([self._work_record(row, project_id=project_id, kind='task') for row in pages(self.host.list_tasks)]
                    + [self._work_record(row, project_id=project_id, kind='epic') for row in pages(self.host.list_epics)])
        except KanbanAdapterError:
            raise
        except Exception as exc:
            raise self._mapped_error(exc) from None

    def get_work(self, project_id: str, kind: str, item_id: str) -> dict[str, Any]:
        if project_id != self.oversight_project_id:
            return super().get_work(project_id, kind, item_id)
        board = self.project_board(project_id)
        try:
            if kind == 'epic':
                raw = self.host.get_epic(item_id, board=board)
            else:
                envelope = self.host.get_task(item_id, board=board)
                raw = envelope.get('task', envelope)
            return self._work_record(raw, project_id=project_id, kind=kind)
        except KanbanAdapterError:
            raise
        except Exception as exc:
            raise self._mapped_error(exc) from None
