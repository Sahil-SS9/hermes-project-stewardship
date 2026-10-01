"""Batch W canvas rebuild: a run's step history, so the canvas can replay it.

Each observed change to a step (its canonical kanban status or its workflow
orchestration state) is recorded once, in order, as a ``workflow.node_state``
domain event. Nothing is simulated: every entry is a real observed transition.
"""
from fastapi.testclient import TestClient

from hermes_project_stewardship.api.server import create_app
from hermes_project_stewardship.kanban import ReferenceKanbanAdapter

DEFINITION = {
    "name": "timeline-release",
    "nodes": [
        {"id": "build", "title": "Build release"},
        {"id": "approve", "title": "Human approval", "human_gate": True,
         "depends_on": ["build"]},
        {"id": "ship", "title": "Ship release", "depends_on": ["approve"]},
    ],
}
BASE = "/stewardship/v1/projects/{p}/workflows/timeline-release"


def _setup(store, enabled):
    adapter = ReferenceKanbanAdapter(store)
    client = TestClient(create_app(store, kanban_adapter=adapter))
    assert client.post(f"/stewardship/v1/projects/{enabled}/workflows",
                       json=DEFINITION).status_code == 200
    started = client.post(BASE.format(p=enabled) + "/start", json={"run_key": "r1"})
    assert started.status_code == 200, started.text
    return adapter, client, started.json()["tasks"]


def _timeline(client, enabled):
    response = client.get(BASE.format(p=enabled) + "/runs/r1/timeline")
    assert response.status_code == 200, response.text
    return response.json()


def test_start_records_initial_state_of_every_step(store, enabled):
    _adapter, client, tasks = _setup(store, enabled)
    body = _timeline(client, enabled)
    assert body["run_key"] == "r1"
    first = {e["node_id"]: e for e in body["events"]}
    assert set(first) == {"build", "approve", "ship"}
    assert all(e["from_status"] is None for e in body["events"])
    assert first["build"]["to_status"] == "backlog"
    assert first["build"]["task_ref"] == tasks["build"]
    assert first["approve"]["kind"] == "gate"
    assert [e["seq"] for e in body["events"]] == sorted(e["seq"] for e in body["events"])


def test_transitions_are_recorded_once_in_order(store, enabled):
    adapter, client, tasks = _setup(store, enabled)
    before = len(_timeline(client, enabled)["events"])
    adapter.transition_work(enabled, "task", tasks["build"], "in_progress")
    adapter.transition_work(enabled, "task", tasks["build"], "done")
    # advance observes canonical state; a later read must not duplicate it.
    assert client.post(BASE.format(p=enabled) + "/runs/r1/advance").status_code == 200
    events = _timeline(client, enabled)["events"]
    again = _timeline(client, enabled)["events"]
    assert again == events, "reading the timeline must not invent new entries"
    build = [e for e in events[before:] if e["node_id"] == "build"]
    assert [(e["from_status"], e["to_status"]) for e in build] == [("backlog", "done")]
    assert build[0]["ts"] >= events[0]["ts"]


def test_each_observed_change_is_recorded_between_polls(store, enabled):
    adapter, client, tasks = _setup(store, enabled)
    _timeline(client, enabled)
    adapter.transition_work(enabled, "task", tasks["build"], "in_progress")
    _timeline(client, enabled)  # the canvas polls and observes in_progress
    adapter.transition_work(enabled, "task", tasks["build"], "done")
    events = [e for e in _timeline(client, enabled)["events"] if e["node_id"] == "build"]
    assert [(e["from_status"], e["to_status"]) for e in events] == [
        (None, "backlog"), ("backlog", "in_progress"), ("in_progress", "done")]


def test_timeline_is_scoped_to_one_run_and_unknown_run_is_404(store, enabled):
    _adapter, client, _tasks = _setup(store, enabled)
    assert client.post(BASE.format(p=enabled) + "/start",
                       json={"run_key": "r2"}).status_code == 200
    r1 = _timeline(client, enabled)["events"]
    assert {e["run_key"] for e in r1} == {"r1"}
    missing = client.get(BASE.format(p=enabled) + "/runs/nope/timeline")
    assert missing.status_code == 404
