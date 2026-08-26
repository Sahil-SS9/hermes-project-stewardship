from __future__ import annotations

from fastapi.testclient import TestClient

from hermes_project_stewardship.api.server import create_app
from hermes_project_stewardship.kanban import ReferenceKanbanAdapter


def test_canonical_work_detail_exposes_real_hierarchy_and_state(store, enabled):
    adapter = ReferenceKanbanAdapter(store)
    parent = adapter.create_work(
        enabled,
        kind="task",
        title="Parent task",
        body="Canonical body",
        assignee="octacon",
        created_by="sahil",
    )
    parent["status"] = "blocked"
    parent["blocked_reason"] = "Waiting for approval"
    parent["history"] = [{"event": "blocked", "actor": "sahil"}]
    adapter._canonical_items[(enabled, "task", parent["id"])] = parent
    child = adapter.create_work(
        enabled,
        kind="subtask",
        title="Child task",
        body=None,
        assignee="quan",
        created_by="sahil",
        parent_id=parent["id"],
    )

    response = TestClient(create_app(store, kanban_adapter=adapter)).get(
        f"/stewardship/v1/projects/{enabled}/work-items/{parent['id']}"
    )

    assert response.status_code == 200, response.text
    detail = response.json()
    assert detail["work_item"]["body"] == "Canonical body"
    assert detail["work_item"]["assignee"] == "octacon"
    assert detail["work_item"]["status"] == "blocked"
    assert detail["work_item"]["blocked_reason"] == "Waiting for approval"
    assert detail["parent"] is None
    assert [item["ref"] for item in detail["children"]] == [child["id"]]
    assert detail["history"] == [{"event": "blocked", "actor": "sahil"}]
