from fastapi.testclient import TestClient

from hermes_project_stewardship.api.server import create_app
from hermes_project_stewardship.kanban import ReferenceKanbanAdapter


def test_versioned_manual_workflow_materialises_idempotent_canonical_graph(store, enabled):
    adapter = ReferenceKanbanAdapter(store)
    client = TestClient(create_app(store, kanban_adapter=adapter))
    definition = {
        "name": "release",
        "nodes": [
            {"id": "build", "title": "Build release"},
            {"id": "approve", "title": "Human approval", "human_gate": True,
             "depends_on": ["build"]},
            {"id": "ship", "title": "Ship release", "depends_on": ["approve"]},
        ],
    }
    first_version = client.post(
        f"/stewardship/v1/projects/{enabled}/workflows", json=definition)
    second_version = client.post(
        f"/stewardship/v1/projects/{enabled}/workflows", json=definition)
    assert first_version.status_code == 200
    assert first_version.json()["version"] == 1
    assert second_version.json()["version"] == 2

    first = client.post(
        f"/stewardship/v1/projects/{enabled}/workflows/release/start",
        json={"run_key": "release-001", "version": 2},
    )
    replay = client.post(
        f"/stewardship/v1/projects/{enabled}/workflows/release/start",
        json={"run_key": "release-001", "version": 2},
    )
    assert first.status_code == 200, first.text
    assert replay.status_code == 200
    assert replay.json()["tasks"] == first.json()["tasks"]
    assert replay.json()["replayed"] is True
    tasks = {item["title"]: item for item in adapter.list_work(enabled)}
    assert tasks["Human approval"]["kind"] == "gate"
    assert len(adapter._canonical_links) == 2


def test_workflow_rejects_cycles_before_creating_tasks(store, enabled):
    adapter = ReferenceKanbanAdapter(store)
    client = TestClient(create_app(store, kanban_adapter=adapter))
    response = client.post(
        f"/stewardship/v1/projects/{enabled}/workflows",
        json={"name": "cycle", "nodes": [
            {"id": "a", "title": "A", "depends_on": ["b"]},
            {"id": "b", "title": "B", "depends_on": ["a"]},
        ]},
    )
    assert response.status_code == 422
    assert adapter.list_work(enabled) == []
