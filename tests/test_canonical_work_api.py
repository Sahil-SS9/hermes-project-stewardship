"""Production API routing tests for canonical Hermes work."""
from __future__ import annotations

from typing import Any

from fastapi.testclient import TestClient

from hermes_project_stewardship.api.server import create_app
from hermes_project_stewardship import kanban
from hermes_project_stewardship.kanban.bridge import KanbanAdapter


class FakeCanonicalAdapter(KanbanAdapter):
    def __init__(self) -> None:
        self.items: dict[tuple[str, str, str], dict[str, Any]] = {}
        self.by_key: dict[str, tuple[str, str, str]] = {}
        self.sequence = 0

    def ensure_board(self, project_id: str, slug: str) -> str:
        return slug

    def add_card(self, board_id, card) -> str:
        created = self.create_work(
            "demo",
            kind="task",
            title=card.title,
            body=card.description,
            assignee=None,
            created_by="dockyard",
        )
        return created["id"]

    def move_card(self, board_id: str, card_id: str, column: str) -> None:
        return None

    def create_work(
        self,
        project_id: str,
        *,
        kind: str,
        title: str,
        body: str | None,
        assignee: str | None,
        created_by: str,
        parent_id: str | None = None,
        idempotency_key: str | None = None,
    ) -> dict[str, Any]:
        if idempotency_key and idempotency_key in self.by_key:
            return dict(self.items[self.by_key[idempotency_key]])
        self.sequence += 1
        item_id = f"e_{self.sequence}" if kind == "epic" else f"t_{self.sequence}"
        item = {
            "id": item_id,
            "ref": item_id,
            "kind": kind,
            "type": kind,
            "project_id": project_id,
            "title": title,
            "body": body,
            "status": "active" if kind == "epic" else "backlog",
            "assignee": assignee,
            "created_by": created_by,
            "parent_task_id": parent_id,
        }
        key = (project_id, kind, item_id)
        self.items[key] = item
        if idempotency_key:
            self.by_key[idempotency_key] = key
        return dict(item)

    def list_work(self, project_id: str) -> list[dict[str, Any]]:
        return [
            dict(item)
            for (owner, _kind, _item_id), item in self.items.items()
            if owner == project_id
        ]

    def get_work(self, project_id: str, kind: str, item_id: str):
        for (owner, stored_kind, stored_id), item in self.items.items():
            if owner == project_id and stored_id == item_id:
                return dict(item)
        raise ValueError("canonical work was not found")

    def transition_work(
        self,
        project_id: str,
        kind: str,
        item_id: str,
        status: str,
    ) -> dict[str, Any]:
        for key, item in self.items.items():
            if key[0] == project_id and key[2] == item_id:
                item["status"] = status
                return dict(item)
        raise ValueError("canonical work was not found")


def test_unavailable_canonical_host_fails_closed_without_legacy_write(store, enabled):
    unavailable_type = getattr(kanban, "UnavailableKanbanAdapter", None)
    assert unavailable_type is not None, "fail-closed adapter is not implemented"
    app = create_app(store, kanban_adapter=unavailable_type())
    response = TestClient(app).post(
        f"/stewardship/v1/projects/{enabled}/work-items",
        json={
            "type": "task",
            "title": "Must not fall back",
            "actor_id": "sahil",
            "actor_kind": "human",
        },
    )

    assert response.status_code == 503
    assert "canonical project and Kanban host is unavailable" in response.text
    assert store._conn.execute(
        "SELECT COUNT(*) AS n FROM dockyard_work_items"
    ).fetchone()["n"] == 0


def test_api_work_and_backlog_routes_use_canonical_service_only(store, enabled):
    adapter = FakeCanonicalAdapter()
    app = create_app(store, kanban_adapter=adapter)
    client = TestClient(app)

    created = client.post(
        f"/stewardship/v1/projects/{enabled}/work-items",
        json={
            "type": "task",
            "title": "Canonical API task",
            "actor_id": "sahil",
            "actor_kind": "human",
            "idempotency_key": "api:create:1",
        },
    )
    assert created.status_code == 200, created.text
    task_id = created.json()["ref"]
    assert task_id == "t_1"

    listed = client.get(
        f"/stewardship/v1/projects/{enabled}/work-items"
    )
    assert listed.status_code == 200
    assert [item["ref"] for item in listed.json()["work_items"]] == [task_id]

    moved = client.post(
        f"/stewardship/v1/projects/{enabled}/work-items/{task_id}/transition",
        json={
            "status": "done",
            "actor_id": "sahil",
            "actor_kind": "human",
        },
    )
    assert moved.status_code == 200, moved.text
    assert moved.json() == {"ref": task_id, "status": "done"}

    queued = client.post(
        f"/stewardship/v1/projects/{enabled}/backlog/items",
        json={
            "type": "bug",
            "title": "Canonical queued bug",
            "creator_id": "sahil",
            "creator_kind": "human",
            "assignee_id": "coder-bot",
            "assignee_kind": "bot",
            "rank": 1,
            "reason": "highest customer impact",
            "idempotency_key": "api:queue:1",
        },
    )
    assert queued.status_code == 200, queued.text
    assert queued.json()["ref"] == "t_2"

    backlog = client.get(f"/stewardship/v1/projects/{enabled}/backlog")
    assert backlog.status_code == 200
    assert backlog.json()["backlog"] == [
        {
            "item_ref": "t_2",
            "item_kind": "bug",
            "rank": 1,
            "priority_reason": "highest customer impact",
        }
    ]
    assert store._conn.execute(
        "SELECT COUNT(*) AS n FROM dockyard_work_items"
    ).fetchone()["n"] == 0
    assert len(adapter.items) == 2
    assert app.state.canonical_work_service.port is adapter

    dashboard = client.get("/stewardship/v1/dashboard")
    assert dashboard.status_code == 200
    project = next(
        row for row in dashboard.json()["projects"] if row["id"] == enabled
    )
    assert project["work"] == {
        "backlog": 1,
        "active": 0,
        "done": 1,
        "blocked": 0,
    }

    report = client.post(
        f"/stewardship/v1/projects/{enabled}/reports",
        json={
            "report_type": "delivery",
            "actor_id": "sahil",
            "actor_kind": "human",
        },
    )
    assert report.status_code == 200, report.text
    assert task_id in report.json()["content"]
    assert "t_2" in report.json()["content"]

    milestone = client.post(
        f"/stewardship/v1/projects/{enabled}/milestones",
        json={
            "name": "Canonical release",
            "actor_id": "sahil",
            "actor_kind": "human",
        },
    )
    assert milestone.status_code == 200
    attached = client.post(
        f"/stewardship/v1/projects/{enabled}/milestones/Canonical release/attach",
        json={
            "ref": "t_2",
            "actor_id": "sahil",
            "actor_kind": "human",
        },
    )
    assert attached.status_code == 200, attached.text
    progress = client.get(
        f"/stewardship/v1/projects/{enabled}/milestones/Canonical release"
    )
    assert progress.status_code == 200
    assert progress.json()["total"] == 1
    assert progress.json()["done"] == 0
