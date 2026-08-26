from __future__ import annotations

from fastapi.testclient import TestClient

from hermes_project_stewardship.api.server import create_app
from hermes_project_stewardship.kanban import ReferenceKanbanAdapter


class CanonicalBridgeAdapter(ReferenceKanbanAdapter):
    def __init__(self, store):
        super().__init__(store)
        self.projects: dict[str, str] = {}

    def ensure_board(self, project_id: str, slug: str) -> str:
        self.projects[slug] = project_id
        return slug

    def add_card(self, board_id, card) -> str:
        project_id = self.projects[board_id]
        created = self.create_work(
            project_id,
            kind="task",
            title=card.title,
            body=card.description,
            assignee=None,
            created_by="dockyard",
            idempotency_key=(
                f"bridge:{board_id}:{card.metadata.get('initiative_ref')}:"
                f"{card.metadata.get('step')}"
            ),
        )
        target = {
            "todo": "backlog",
            "doing": "in_progress",
            "review": "in_review",
            "done": "done",
        }[card.column]
        if target != created["status"]:
            created = self.transition_work(
                project_id, "task", created["id"], target)
        return created["id"]


def _proposal(client: TestClient, project: str) -> str:
    response = client.post(
        f"/stewardship/v1/projects/{project}/initiatives",
        json={
            "title": "Deliver observed change",
            "rationale": "objective: prove the complete product loop",
            "expected_outcome": "delivery remains healthy",
            "risk": "low",
            "validation_contract": {
                "steps": ["Implement change", "Verify change"],
                "tests": "project suite",
            },
        },
    )
    assert response.status_code == 200, response.text
    return response.json()["ref"]


def test_approval_to_canonical_execution_and_observation_flow(store, enabled):
    adapter = CanonicalBridgeAdapter(store)
    client = TestClient(create_app(store, kanban_adapter=adapter))
    ref = _proposal(client, enabled)

    approved = client.post(
        f"/stewardship/v1/initiatives/{ref}/approve",
        json={"actor": "sahil", "interface": "dockyard:human"},
    )
    assert approved.status_code == 200, approved.text
    assert approved.json()["status"] == "executing"
    work_refs = approved.json()["work_item_refs"]
    assert len(work_refs) == 2
    assert store._conn.execute(
        "SELECT COUNT(*) AS n FROM dockyard_work_items"
    ).fetchone()["n"] == 0
    work = client.get(
        f"/stewardship/v1/projects/{enabled}/work-items"
    ).json()["work_items"]
    assert {item["ref"] for item in work} == set(work_refs)
    assert all(item["initiative_ref"] == ref for item in work)
    queued = client.post(
        f"/stewardship/v1/projects/{enabled}/backlog",
        json={
            "ref": work_refs[0],
            "rank": 1,
            "reason": "highest verified outcome impact",
            "initiative_ref": ref,
            "actor_id": "sahil",
            "actor_kind": "human",
        },
    )
    assert queued.status_code == 200, queued.text
    backlog = client.get(
        f"/stewardship/v1/projects/{enabled}/backlog"
    ).json()["backlog"]
    assert backlog[0]["item_ref"] == work_refs[0]
    assert backlog[0]["initiative_ref"] == ref

    replay = client.post(
        f"/stewardship/v1/initiatives/{ref}/approve",
        json={"actor": "sahil", "interface": "dockyard:human"},
    )
    assert replay.status_code == 200
    assert replay.json()["work_item_refs"] == work_refs
    assert len(adapter.list_work(enabled)) == 2

    completed = client.post(
        f"/stewardship/v1/initiatives/{ref}/complete",
        json={"outcome": {"verified": True}, "regressed": False},
    )
    assert completed.status_code == 200, completed.text
    assert completed.json()["engine_status"] == "completed"
    assert completed.json()["observation_status"] == "pending"
    work = client.get(
        f"/stewardship/v1/projects/{enabled}/work-items"
    ).json()["work_items"]
    assert all(item["status"] == "done" for item in work)

    observations = client.get(
        f"/stewardship/v1/projects/{enabled}/observations"
    )
    assert observations.status_code == 200
    pending = observations.json()["observations"]
    assert len(pending) == 1
    assert pending[0]["initiative_ref"] == ref
    assert pending[0]["status"] == "pending"

    run = client.post(
        f"/stewardship/v1/observations/{ref}/run"
    )
    assert run.status_code == 200, run.text
    assert run.json()["status"] == "completed"
    assert isinstance(run.json()["cycle_id"], int)
    replay_run = client.post(
        f"/stewardship/v1/observations/{ref}/run"
    )
    assert replay_run.status_code == 200
    assert replay_run.json()["cycle_id"] == run.json()["cycle_id"]
    cycles = store._conn.execute(
        "SELECT COUNT(*) AS n FROM project_cycles WHERE trigger_ref=?",
        (ref,),
    ).fetchone()["n"]
    assert cycles == 1


def test_regression_blocks_canonical_work_and_schedules_one_observation(store, enabled):
    adapter = CanonicalBridgeAdapter(store)
    client = TestClient(create_app(store, kanban_adapter=adapter))
    ref = _proposal(client, enabled)
    client.post(
        f"/stewardship/v1/initiatives/{ref}/approve",
        json={"actor": "sahil", "interface": "dockyard:human"},
    )
    first = client.post(
        f"/stewardship/v1/initiatives/{ref}/complete",
        json={"outcome": {"verified": False}, "regressed": True},
    )
    replay = client.post(
        f"/stewardship/v1/initiatives/{ref}/complete",
        json={"outcome": {"verified": False}, "regressed": True},
    )
    assert first.status_code == 200
    assert replay.status_code == 200
    work = adapter.list_work(enabled)
    assert all(item["status"] == "blocked" for item in work)
    rows = store._conn.execute(
        "SELECT COUNT(*) AS n FROM dockyard_observation_triggers WHERE initiative_ref=?",
        (ref,),
    ).fetchone()["n"]
    assert rows == 1
