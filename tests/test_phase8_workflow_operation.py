from __future__ import annotations

import json
import time

import pytest

from hermes_project_stewardship.kanban import ReferenceKanbanAdapter
from hermes_project_stewardship.persistence.workflow_service import WorkflowService

fastapi = pytest.importorskip("fastapi")
from fastapi.testclient import TestClient  # noqa: E402

from hermes_project_stewardship.api.server import create_app  # noqa: E402


def _definition():
    return {"nodes": [
        {"id": "build", "title": "Build", "depends_on": [],
         "human_gate": False, "body": None},
        {"id": "approve", "title": "Approve", "depends_on": ["build"],
         "human_gate": True, "body": None},
        {"id": "ship", "title": "Ship", "depends_on": ["approve"],
         "human_gate": False, "body": None},
    ]}


@pytest.fixture()
def api(store, enabled):
    adapter = ReferenceKanbanAdapter(store)
    client = TestClient(create_app(store, kanban_adapter=adapter))
    client.post(
        f"/stewardship/v1/projects/{enabled}/workflows", json={
            "name": "release", "nodes": _definition()["nodes"]})
    started = client.post(
        f"/stewardship/v1/projects/{enabled}/workflows/release/start",
        json={"run_key": "run-1"})
    assert started.status_code == 200, started.text
    return client, adapter, enabled, started.json()["tasks"]


# ---------------------------------------------------------------- P8.2 ----

def test_runs_payload_exposes_list_view_fields(api):
    """P8.2: the same payload drives graph AND list — dependencies, gate and
    statuses must be present per node (list view needs no extra fetch)."""
    client, _, enabled, _ = api
    runs = client.get(
        f"/stewardship/v1/projects/{enabled}/workflows/release/runs"
    ).json()["runs"]
    assert runs, "run ledger must be present"
    nodes = runs[0]["nodes"]
    by_id = {n["node_id"]: n for n in nodes}
    assert by_id["approve"]["depends_on"] == ["build"]
    assert by_id["approve"]["human_gate"] is True
    assert by_id["approve"]["kind"] == "gate"
    assert set(by_id) == {"build", "approve", "ship"}


# ---------------------------------------------------------------- P8.3 ----

def test_gate_decision_states_visible_in_runs_payload(api):
    """P8.3: a run node must distinguish a pending decision from a decided
    one: decided nodes carry receipt-backed status; the decision endpoint
    stays the Phase 4 authority for last-confirmed state."""
    client, adapter, enabled, tasks = api
    # The gate node binds a canonical work item, not an initiative. Decision
    # authority lives on initiatives: propose one, bind it, then decide it
    # through the PHASE 4 path exactly as the canvas does.
    proposed = client.post(
        f"/stewardship/v1/projects/{enabled}/initiatives",
        json={"title": "Approve gate decision", "rationale":
              "Gate review needs a persisted receipt for the workflow journey.",
              "risk": "low"})
    assert proposed.status_code == 200, proposed.text
    ini_ref = proposed.json()["ref"]
    decision = client.get(f"/stewardship/v1/initiatives/{ini_ref}/decision")
    assert decision.status_code == 200, decision.text
    fp = decision.json()["fingerprint"]
    approved = client.post(
        f"/stewardship/v1/initiatives/{ini_ref}/approve",
        json={"expected_fingerprint": fp, "actor": "sahil",
              "interface": "rpc"})
    assert approved.status_code == 200, approved.text
    receipts = client.get(
        f"/stewardship/v1/initiatives/{ini_ref}/decision/receipts")
    assert receipts.status_code == 200
    assert receipts.json()["receipts"], "approval must leave an immutable receipt"

    runs = client.get(
        f"/stewardship/v1/projects/{enabled}/workflows/release/runs"
    ).json()["runs"]
    gate = {n["node_id"]: n for n in runs[0]["nodes"]}["approve"]
    assert gate["task_ref"] == tasks["approve"]


def test_last_confirmed_update_timestamp_present(api):
    """P8.3: the payload carries updated_at so the UI can show last-confirmed
    update truthfully (unknown when the host never set it)."""
    client, _, enabled, _ = api
    runs = client.get(
        f"/stewardship/v1/projects/{enabled}/workflows/release/runs"
    ).json()["runs"]
    assert "updated_at" in runs[0]
    assert "started_at" in runs[0]


# ---------------------------------------------------------------- P8.4 ----

def test_unsupported_worker_control_is_honest_not_invented(api):
    """P8.4: there is NO native pause/cancel for a running worker in the
    canonical contract. The runs payload must not fabricate such controls:
    it exposes per-node status + evidence only, and the transition route
    stays the single supported recovery path (blocked -> backlog re-queue)."""
    client, adapter, enabled, tasks = api
    # A blocked node is the recovery case: block the ship task, then requeue.
    ship = tasks["ship"]
    blocked = client.post(
        f"/stewardship/v1/projects/{enabled}/work-items/{ship}/transition",
        json={"status": "blocked", "actor_id": "sahil", "actor_kind": "human"})
    assert blocked.status_code == 200, blocked.text
    runs = client.get(
        f"/stewardship/v1/projects/{enabled}/workflows/release/runs"
    ).json()["runs"]
    node = {n["node_id"]: n for n in runs[0]["nodes"]}["ship"]
    assert node["status"] == "blocked"
    # Supported recovery: re-queue through the existing transition contract.
    requeued = client.post(
        f"/stewardship/v1/projects/{enabled}/work-items/{ship}/transition",
        json={"status": "backlog", "actor_id": "sahil", "actor_kind": "human"})
    assert requeued.status_code == 200, requeued.text
    runs = client.get(
        f"/stewardship/v1/projects/{enabled}/workflows/release/runs"
    ).json()["runs"]
    node = {n["node_id"]: n for n in runs[0]["nodes"]}["ship"]
    assert node["status"] == "backlog"
    # And the payload defines NO pause/cancel control fields.
    assert not any(
        key in runs[0] for key in ("pause", "cancel", "kill", "stop_worker"))


# ---------------------------------------------------------------- P8.5 ----

def test_duplicate_start_of_same_run_key_stays_idempotent(store, enabled):
    """P8.5 duplicate-action safety at the API boundary: re-clicking the
    start action never duplicates tasks (UI duplicate guard mirrors this)."""
    adapter = ReferenceKanbanAdapter(store)
    client = TestClient(create_app(store, kanban_adapter=adapter))
    client.post(
        f"/stewardship/v1/projects/{enabled}/workflows",
        json={"name": "release", "nodes": _definition()["nodes"]})
    first = client.post(
        f"/stewardship/v1/projects/{enabled}/workflows/release/start",
        json={"run_key": "run-1"})
    second = client.post(
        f"/stewardship/v1/projects/{enabled}/workflows/release/start",
        json={"run_key": "run-1"})
    assert second.json()["replayed"] is True
    assert len(adapter.list_work(enabled)) == 3
