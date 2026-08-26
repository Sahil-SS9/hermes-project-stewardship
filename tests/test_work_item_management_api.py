from __future__ import annotations

from fastapi.testclient import TestClient

from hermes_project_stewardship.api.server import create_app
from hermes_project_stewardship.kanban import ReferenceKanbanAdapter


def _create(client: TestClient, project: str, title: str, actor: str) -> str:
    response = client.post(
        f"/stewardship/v1/projects/{project}/work-items",
        json={
            "type": "task",
            "title": title,
            "actor_id": actor,
            "actor_kind": "human" if actor == "sahil" else "bot",
        },
    )
    assert response.status_code == 200, response.text
    return response.json()["ref"]


def test_work_item_edit_assignment_and_dependency_flow(store, enabled):
    adapter = ReferenceKanbanAdapter(store)
    client = TestClient(create_app(store, kanban_adapter=adapter))
    dependency = _create(client, enabled, "Dependency task", "sahil")
    task = _create(client, enabled, "Editable task", "sahil")

    edited = client.patch(
        f"/stewardship/v1/projects/{enabled}/work-items/{task}",
        json={
            "title": "Edited task",
            "type": "bug",
            "body": "Investigate and repair",
            "labels": ["customer", "urgent"],
            "evidence_refs": ["EV-1"],
            "estimate_days": 2.5,
            "due": "2026-09-05",
            "actor_id": "sahil",
            "actor_kind": "human",
        },
    )
    assert edited.status_code == 200, edited.text
    assert edited.json()["title"] == "Edited task"
    assert edited.json()["type"] == "bug"
    assert edited.json()["labels"] == ["customer", "urgent"]
    assert edited.json()["evidence_refs"] == ["EV-1"]
    assert edited.json()["estimate_days"] == 2.5
    assert edited.json()["due"] == "2026-09-05"

    human_to_bot = client.post(
        f"/stewardship/v1/projects/{enabled}/work-items/{task}/assign",
        json={"assignee_id": "octacon", "actor_id": "sahil", "actor_kind": "human"},
    )
    assert human_to_bot.status_code == 200
    assert human_to_bot.json()["assignee"] == "octacon"
    bot_to_human = client.post(
        f"/stewardship/v1/projects/{enabled}/work-items/{task}/assign",
        json={"assignee_id": "sahil", "actor_id": "octacon", "actor_kind": "bot"},
    )
    assert bot_to_human.status_code == 200
    assert bot_to_human.json()["assignee"] == "sahil"

    linked = client.post(
        f"/stewardship/v1/projects/{enabled}/work-items/{task}/dependencies",
        json={"dependency_ref": dependency, "actor_id": "sahil", "actor_kind": "human"},
    )
    assert linked.status_code == 200, linked.text
    detail = client.get(
        f"/stewardship/v1/projects/{enabled}/work-items/{task}"
    ).json()
    assert [item["ref"] for item in detail["dependencies"]] == [dependency]

    removed = client.post(
        f"/stewardship/v1/projects/{enabled}/work-items/{task}/dependencies/{dependency}/remove",
        json={"actor_id": "sahil", "actor_kind": "human"},
    )
    assert removed.status_code == 200
    detail = client.get(
        f"/stewardship/v1/projects/{enabled}/work-items/{task}"
    ).json()
    assert detail["dependencies"] == []

    actions = [
        row["action"]
        for row in store._conn.execute(
            "SELECT action FROM stewardship_audit_log ORDER BY id"
        ).fetchall()
    ]
    assert "workitem.updated" in actions
    assert actions.count("workitem.assigned") == 2
    assert "workitem.dependency_added" in actions
    assert "workitem.dependency_removed" in actions


def test_cross_project_dependency_fails_closed(store):
    from hermes_project_stewardship.persistence.service import StewardshipService

    svc = StewardshipService(store)
    for project in ("alpha", "beta"):
        svc.enable(project_id=project, mission=project, lead_profile="octacon", autonomy_level=1)
    adapter = ReferenceKanbanAdapter(store)
    client = TestClient(create_app(store, kanban_adapter=adapter))
    alpha_task = _create(client, "alpha", "Alpha task", "sahil")
    beta_task = _create(client, "beta", "Beta task", "sahil")
    response = client.post(
        f"/stewardship/v1/projects/alpha/work-items/{alpha_task}/dependencies",
        json={"dependency_ref": beta_task, "actor_id": "sahil", "actor_kind": "human"},
    )
    assert response.status_code in {404, 422}
    assert adapter._canonical_links == set()
