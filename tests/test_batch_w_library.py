"""W1 scoped workflow contract: defaults, name collision, deletion safety and audit."""

import pytest
from fastapi.testclient import TestClient

from hermes_project_stewardship.api.server import create_app
from hermes_project_stewardship.kanban import ReferenceKanbanAdapter
from hermes_project_stewardship.persistence.workflow_service import WorkflowService
from hermes_project_stewardship.persistence.workflow_library import WorkflowLibrary


def enable_project(svc, pid):
    svc.enable(pid, mission="test", lead_profile="lead",
               member_profiles=["coder"], autonomy_level=2)
    return pid


DEFINITION = {"nodes": [{"id": "one", "title": "One"}]}


def test_global_is_off_for_existing_and_new_projects_and_name_clash(store, svc, enabled):
    port = ReferenceKanbanAdapter(store)
    service = WorkflowService(store, port)
    library = WorkflowLibrary(service)
    service.define(enabled, "clash", DEFINITION)
    library.define("clash", "global", DEFINITION, actor="owner")
    later = enable_project(svc, "later")
    for project in (enabled, later):
        rows = [item for item in library.available(project) if item["name"] == "clash"]
        assert {(item["scope"], item["enabled"]) for item in rows} == (
            {("project", True), ("global", False)} if project == enabled else {("global", False)})
        with pytest.raises(ValueError, match="disabled"):
            library.start(project, "clash", "global", "run-1")
    assert library.start(enabled, "clash", "project", "dedicated-run")["name"] == "clash"
    library.toggle(enabled, "clash", "global", enabled=True, actor="owner")
    started = library.start(enabled, "clash", "global", "global-run")
    assert started["scope"] == "global"
    assert started["name"] == "clash"
    assert started["tasks"]
    assert library.start(enabled, "clash", "project", "dedicated-run")["replayed"]
    assert any(item["action"] == "workflow.enablement_updated" and item["actor"] == "owner"
               for item in store._conn.execute("SELECT action,actor FROM stewardship_audit_log"))


def test_disabling_prevents_new_runs_without_erasing_history_and_delete_is_guarded(store, svc, enabled):
    service = WorkflowService(store, ReferenceKanbanAdapter(store))
    library = WorkflowLibrary(service)
    library.define("shared", "global", DEFINITION, actor="owner")
    library.toggle(enabled, "shared", "global", enabled=True, actor="owner")
    started = library.start(enabled, "shared", "global", "run-1")
    library.toggle(enabled, "shared", "global", enabled=False, actor="owner")
    assert library.runs(enabled, "shared", "global")[0]["run_key"] == "run-1"
    with pytest.raises(ValueError, match="disabled"):
        library.start(enabled, "shared", "global", "run-2")
    with pytest.raises(ValueError, match="active run"):
        library.delete("shared", "global", actor="owner")
    assert started["run_key"] == "run-1"


def test_dedicated_is_private_and_can_be_disabled(store, svc, enabled):
    later = enable_project(svc, "later")
    service = WorkflowService(store, ReferenceKanbanAdapter(store))
    library = WorkflowLibrary(service)
    service.define(enabled, "private", DEFINITION)
    assert all(item["name"] != "private" for item in library.available(later))
    library.toggle(enabled, "private", "project", enabled=False, actor="owner")
    with pytest.raises(ValueError, match="disabled"):
        library.start(enabled, "private", "project", "run-1")
    assert all(item["name"] != "private" for item in library.available(later))
    # The pre-v31 route must not bypass the persisted disablement gate.
    response = TestClient(create_app(store, kanban_adapter=ReferenceKanbanAdapter(store))).post(
        f"/stewardship/v1/projects/{enabled}/workflows/private/start",
        json={"run_key": "run-1"},
    )
    assert response.status_code == 409, response.text
