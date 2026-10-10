"""Test support: a reference Hermes host that does not know some projects.

The real host answers every per-project call for a project Hermes has no
project for with ``project_not_found`` ("canonical project was not found").
This adapter does the same for the ids in ``missing``, so the default pytest
lane and the browser suite's practice backend see what Sahil's live app saw on
10/10/2026. tests/test_unlinked_project_routes.py proves the default lane and
the real host give the same answers.

Loaded by file path from hermes_dockyard_plugin/desktop/disposable-backend.py,
so it must not use relative imports.
"""
from __future__ import annotations

import inspect

from hermes_project_stewardship.kanban import KanbanAdapterError, ReferenceKanbanAdapter

MISSING = {"code": "project_not_found", "message": "canonical project was not found"}


class NoHermesProjectAdapter(ReferenceKanbanAdapter):
    """Reference host where Hermes has no project for the ids in ``missing``."""

    def __init__(self, store, *args, **kwargs) -> None:
        super().__init__(store, *args, **kwargs)
        self.missing: set[str] = set()


def _refusing(name: str):
    original = getattr(ReferenceKanbanAdapter, name)

    def method(self, project_id, *args, **kwargs):
        if project_id in self.missing:
            raise KanbanAdapterError(MISSING["code"], MISSING["message"])
        return original(self, project_id, *args, **kwargs)

    method.__name__ = name
    method.__doc__ = original.__doc__
    return method


# Every public per-project method (first parameter after self is project_id).
PER_PROJECT_METHODS = tuple(
    name for name, fn in inspect.getmembers(ReferenceKanbanAdapter, inspect.isfunction)
    if not name.startswith("_")
    and list(inspect.signature(fn).parameters)[1:2] == ["project_id"]
)
for _name in PER_PROJECT_METHODS:
    setattr(NoHermesProjectAdapter, _name, _refusing(_name))
