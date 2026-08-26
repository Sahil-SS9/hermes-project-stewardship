from __future__ import annotations

import threading

import pytest

from hermes_project_stewardship.kanban import ReferenceKanbanAdapter
from hermes_project_stewardship.persistence.workflow_service import WorkflowService


def _definition():
    return {"nodes": [
        {"id": "build", "title": "Build", "depends_on": [],
         "human_gate": False, "body": None},
        {"id": "approve", "title": "Approve", "depends_on": ["build"],
         "human_gate": True, "body": None},
    ]}


def test_concurrent_workflow_definitions_allocate_distinct_versions(store, enabled):
    service = WorkflowService(store, ReferenceKanbanAdapter(store))
    versions: list[int] = []
    errors: list[Exception] = []
    barrier = threading.Barrier(2)

    def define() -> None:
        try:
            barrier.wait()
            versions.append(service.define(enabled, "release", _definition())["version"])
        except Exception as exc:  # pragma: no cover - assertion captures it
            errors.append(exc)

    threads = [threading.Thread(target=define) for _ in range(2)]
    for thread in threads:
        thread.start()
    for thread in threads:
        thread.join()
    assert errors == []
    assert sorted(versions) == [1, 2]


def test_workflow_retry_recovers_pending_run_without_duplicate_tasks(store, enabled):
    class FlakyAdapter(ReferenceKanbanAdapter):
        def __init__(self, target_store):
            super().__init__(target_store)
            self.fail_once = True

        def link_work(self, project_id: str, parent_id: str, child_id: str):
            if self.fail_once:
                self.fail_once = False
                raise RuntimeError("simulated link interruption")
            return super().link_work(project_id, parent_id, child_id)

    adapter = FlakyAdapter(store)
    service = WorkflowService(store, adapter)
    service.define(enabled, "release", _definition())
    with pytest.raises(RuntimeError, match="simulated link interruption"):
        service.start(enabled, "release", "run-1")
    pending = store._conn.execute(
        "SELECT status,result_json FROM dockyard_workflow_runs WHERE run_key='run-1'"
    ).fetchone()
    assert pending["status"] == "pending"
    assert len(adapter.list_work(enabled)) == 2

    completed = service.start(enabled, "release", "run-1")
    assert completed["replayed"] is False
    assert len(adapter.list_work(enabled)) == 2
    row = store._conn.execute(
        "SELECT status FROM dockyard_workflow_runs WHERE run_key='run-1'"
    ).fetchone()
    assert row["status"] == "complete"
