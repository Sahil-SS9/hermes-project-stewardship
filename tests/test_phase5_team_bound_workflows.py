"""HPS Phase 5 — team-bound workflows.

Covers the Phase 5 acceptance surface:
- P5.1 templates vs project instances (independent copies, provenance)
- P5.2 team binding + per-phase overrides, validated against discovered host
  profiles and project/group membership at binding time and at start
- P5.3 effective-definition snapshots per run (later template/team edits
  never alter a running or historical instance; template origin recorded)
- P5.4 bounded conditional branches + loops, iteration identity, exit
  conditions, human escalation, malformed-reference rejection and strict
  JSON booleans (a string ``"false"`` is refused, not coerced)
- P5.11 bounded agent-driven revisions: in-policy applied + recorded,
  out-of-policy held for human approval, dependent work not materialised
  until approved, pending never applied by restart, decided/once-only
- P5.8 versioned JSON export/import: preview + apply, round-trip fidelity
  for loops/conditionals/positions, byte limits, schema tolerance
- duplicate-start + interruption recovery, project isolation, reload

All runs use disposable stores under tmp_path; no live services.
"""
from __future__ import annotations

import json

import pytest

fastapi = pytest.importorskip("fastapi")
from fastapi.testclient import TestClient  # noqa: E402

from hermes_project_stewardship.api.server import create_app  # noqa: E402
from hermes_project_stewardship.kanban import ReferenceKanbanAdapter  # noqa: E402
from hermes_project_stewardship.persistence.dockyard_service import (  # noqa: E402
    DockyardService,
)
from hermes_project_stewardship.persistence.service import (  # noqa: E402
    StewardshipService,
)
from hermes_project_stewardship.persistence.workflow_service import (  # noqa: E402
    IMPORT_MAX_BYTES,
    WorkflowService,
)

from .conftest import enable_project  # noqa: E402

BASE = "/stewardship/v1"


def _env(store):
    adapter = ReferenceKanbanAdapter(store)
    client = TestClient(create_app(
        store,
        kanban_adapter=adapter,
        auth_principal="sahil",
        auth_principal_is_human=True,
        capabilities={"workflow_revision_approval"},
    ))
    return adapter, client, DockyardService(store), WorkflowService(store, adapter)


def _team_group(store, *, profile="default", bot_id="bot-default", group="team-a"):
    dy = DockyardService(store)
    dy.bot_register(bot_id, "Default worker", profile=profile)
    group_obj = dy.group_create(group)
    dy.group_add_member(group, bot_id)
    return group_obj.id


def _by_id(items):
    return {item["id"]: item for item in items}


def _tasks_of(adapter, pid):
    return {item["title"]: item for item in adapter.list_work(pid)}


# ---------------------------------------------------------------- P5.1


def test_templates_instantiate_copies_and_independence(store, enabled):
    _adapter, client, _dy, workflows = _env(store)
    template_nodes = [
        {"id": "build", "title": "Build", "canvas_position": {"x": 10, "y": 20}},
        {"id": "approve", "title": "Approve", "human_gate": True,
         "depends_on": ["build"]},
    ]
    r = client.post(f"{BASE}/workflow-templates",
                    json={"name": "std-release", "nodes": template_nodes})
    assert r.status_code == 200, r.text
    assert r.json()["version"] == 1

    # Edited template v2: instances already created keep v1 (ownership boundary).
    r = client.post(f"{BASE}/workflow-templates", json={
        "name": "std-release",
        "nodes": [{"id": "build", "title": "Build v2"},
                  {"id": "approve", "title": "Approve v2",
                   "human_gate": True, "depends_on": ["build"]}]})
    assert r.json()["version"] == 2

    r = client.post(f"{BASE}/projects/{enabled}/workflows/from-template",
                    json={"template": "std-release", "version": 1,
                          "name": "release"})
    assert r.status_code == 200, r.text
    payload = r.json()
    assert payload["version"] == 1
    assert payload["template"] == {"name": "std-release", "version": 1}
    assert [node["title"] for node in payload["definition"]["nodes"]] == \
        ["Build", "Approve"]

    listing = client.get(f"{BASE}/projects/{enabled}/workflows").json()["workflows"]
    release = next(row for row in listing if row["name"] == "release")
    assert release["definition"]["template"] == {"name": "std-release", "version": 1}
    assert release["definition"]["nodes"][0]["title"] == "Build"

    # Latest-version listing reflects v2 without touching the instance.
    templates = client.get(f"{BASE}/workflow-templates").json()["templates"]
    assert [t["version"] for t in templates] == [2]

    # Unrelated instances stay independent copies.
    r = client.post(f"{BASE}/projects/{enabled}/workflows",
                    json={"name": "release", "nodes": [{"id": "x", "title": "X"}]})
    assert r.json()["version"] == 2  # same-name versions on the project instance
    r = client.post(f"{BASE}/projects/{enabled}/workflows/from-template",
                    json={"template": "std-release", "version": 1,
                          "name": "hotfix"})
    assert r.status_code == 200
    listing = client.get(f"{BASE}/projects/{enabled}/workflows").json()["workflows"]
    hotfix = next(row for row in listing if row["name"] == "hotfix")
    assert hotfix["definition"]["nodes"][0]["title"] == "Build"


# ---------------------------------------------------------------- P5.2


def test_binding_validation_and_override_precedence(store, enabled):
    _adapter, client, _dy, workflows = _env(store)
    r = client.post(f"{BASE}/projects/{enabled}/workflows", json={
        "name": "release",
        "nodes": [
            {"id": "build", "title": "Build", "phase_team": "default"},
            {"id": "ship", "title": "Ship", "depends_on": ["build"]},
        ]})
    assert r.status_code == 200, r.text

    # Override naming an undiscovered profile is refused (observed universe is
    # {default}; lead/member profiles exist but are not discoverable here).
    r = client.put(f"{BASE}/projects/{enabled}/workflows/release/binding",
                   json={"group_id": None, "overrides": {"build": "ghost"}})
    assert r.status_code == 422
    assert "undiscovered" in r.text

    # A discovered profile that is not a project or team member is refused.
    r = client.put(f"{BASE}/projects/{enabled}/workflows/release/binding",
                   json={"group_id": None, "overrides": {"ship": "default"}})
    assert r.status_code == 422
    assert "not a member" in r.text

    # Override on an unknown node is refused.
    group_id = _team_group(store)
    r = client.put(f"{BASE}/projects/{enabled}/workflows/release/binding",
                   json={"group_id": group_id, "overrides": {"nope": "default"}})
    assert r.status_code == 422
    assert "unknown node" in r.text

    # Bound team makes the assignment valid; replay-safe upsert returns state.
    r = client.put(f"{BASE}/projects/{enabled}/workflows/release/binding",
                   json={"group_id": group_id, "overrides": {"ship": "default"}})
    assert r.status_code == 200, r.text
    assert r.json()["group_id"] == group_id
    assert r.json()["overrides"] == {"ship": "default"}

    # Precedence: explicit override wins over the node's own phase_team.
    resolved = workflows.effective_assignments(enabled, "release")
    assert resolved["ship"] == {"assignee": "default", "team": "team-a",
                                "source": "override"}
    assert resolved["build"] == {"assignee": "default", "team": "team-a",
                                 "source": "node"}

    r = client.get(f"{BASE}/projects/{enabled}/workflows/release/binding")
    assert r.status_code == 200
    assert r.json()["updated_by"] == "stewardship-api"


def test_start_validates_assignments_against_membership(store, enabled):
    adapter, client, _dy, _workflows = _env(store)
    # Node phase_team names a discovered profile that is NOT yet a project or
    # team member: the run must be refused before any canonical write.
    r = client.post(f"{BASE}/projects/{enabled}/workflows", json={
        "name": "release",
        "nodes": [{"id": "build", "title": "Build", "phase_team": "default"}]})
    assert r.status_code == 200
    r = client.post(f"{BASE}/projects/{enabled}/workflows/release/start",
                    json={"run_key": "run-1"})
    assert r.status_code == 422
    assert "assignments failed validation" in r.text
    assert adapter.list_work(enabled) == []

    # With the bot in the bound team the same run starts and carries assignees.
    group_id = _team_group(store)
    r = client.put(f"{BASE}/projects/{enabled}/workflows/release/binding",
                   json={"group_id": group_id, "overrides": {}})
    assert r.status_code == 200, r.text
    r = client.post(f"{BASE}/projects/{enabled}/workflows/release/start",
                    json={"run_key": "run-1"})
    assert r.status_code == 200, r.text
    work = _by_id(adapter.list_work(enabled))
    build = work[r.json()["tasks"]["build"]]
    assert build["assignee"] == "default"

    # The run snapshot carries the resolved assignment + team label.
    runs = client.get(
        f"{BASE}/projects/{enabled}/workflows/release/runs").json()["runs"]
    node = runs[0]["nodes"][0]
    assert node["assignee"] == "default"
    assert node["team"] == "team-a"


# ---------------------------------------------------------------- P5.3


def test_run_snapshot_immutable_under_template_edits(store, enabled):
    _adapter, client, _dy, _workflows = _env(store)
    client.post(f"{BASE}/workflow-templates", json={
        "name": "release", "nodes": [{"id": "build", "title": "Build v1"}]})
    r = client.post(f"{BASE}/projects/{enabled}/workflows/from-template",
                    json={"template": "release", "version": 1})
    assert r.status_code == 200
    r = client.post(f"{BASE}/projects/{enabled}/workflows/release/start",
                    json={"run_key": "run-1"})
    assert r.status_code == 200, r.text
    assert r.json()["tasks"].keys() == {"build"}

    # Template v2 + project instance v2: the existing run keeps v1's snapshot.
    client.post(f"{BASE}/workflow-templates", json={
        "name": "release", "nodes": [{"id": "other", "title": "Other v2"}]})
    r = client.post(f"{BASE}/projects/{enabled}/workflows/release/versions",
                    json={"nodes": [{"id": "other", "title": "Other v2"}]})
    assert r.status_code == 200
    runs = client.get(
        f"{BASE}/projects/{enabled}/workflows/release/runs").json()["runs"]
    run = next(item for item in runs if item["run_key"] == "run-1")
    assert [node["title"] for node in run["nodes"]] == ["Build v1"]
    assert run["template_origin"] == {"name": "release", "version": 1}
    assert run["version"] == 1


# ---------------------------------------------------------------- P5.4


def test_conditional_branches_validate_take_and_skip(store, enabled):
    adapter, client, _dy, _workflows = _env(store)
    # Malformed conditionals are rejected before any version is written.
    for bad in (
        {"id": "rollout", "title": "R", "when": {"node": "ghost",
                                                  "status": "done"}},
        {"id": "rollout", "title": "R", "depends_on": ["build"],
         "when": {"node": "build", "status": "maybe"}},
        {"id": "rollout", "title": "R", "when": {"node": "rollout",
                                                  "status": "done"}},
    ):
        r = client.post(f"{BASE}/projects/{enabled}/workflows", json={
            "name": "rollout", "nodes": [{"id": "build", "title": "Build"}, bad]})
        assert r.status_code == 422, r.text

    # String boolean is refused, not coerced (P5.4 strictness rule).
    r = client.post(f"{BASE}/projects/{enabled}/workflows", json={
        "name": "rollout",
        "nodes": [{"id": "gate", "title": "G", "human_gate": "false"}]})
    assert r.status_code == 422
    assert "boolean" in r.text

    r = client.post(f"{BASE}/projects/{enabled}/workflows", json={
        "name": "rollout",
        "nodes": [
            {"id": "build", "title": "Build"},
            {"id": "rollout", "title": "Roll out", "depends_on": ["build"],
             "when": {"node": "build", "status": "done"}},
            {"id": "rollback", "title": "Roll back", "depends_on": ["build"],
             "when": {"node": "build", "status": "blocked"}},
        ]})
    assert r.status_code == 200, r.text
    r = client.post(f"{BASE}/projects/{enabled}/workflows/rollout/start",
                    json={"run_key": "run-1"})
    assert r.status_code == 200, r.text
    body = r.json()
    assert set(body["tasks"].keys()) == {"build"}
    assert body["node_states"] == {"rollout": "waiting", "rollback": "waiting"}

    build_ref = body["tasks"]["build"]
    adapter.transition_work(enabled, "task", build_ref, "blocked")
    r = client.post(
        f"{BASE}/projects/{enabled}/workflows/rollout/runs/run-1/advance")
    assert r.status_code == 200, r.text
    advanced = r.json()
    # A stuck step may still finish, so "when it is done" waits rather than
    # being skipped (08/10/2026, WORKFLOWS-R1.md engine round, bug 4).
    assert advanced["node_states"]["rollout"] == "waiting"
    assert advanced["node_states"]["rollback"] == "taken"
    work = _by_id(adapter.list_work(enabled))
    rollback_ref = advanced["tasks"]["rollback"]
    assert work[rollback_ref]["status"] == "backlog"
    # An "if stuck" step is never linked behind the stuck step: the board
    # would never start it, because that step is not done (bug 7).
    assert {"parent_id": build_ref, "child_id": rollback_ref} not in [
        {"parent_id": link[1], "child_id": link[2]}
        for link in sorted(adapter._canonical_links)
    ]

    # Idempotent: repeating advance with no decidable change is a no-op.
    again = client.post(
        f"{BASE}/projects/{enabled}/workflows/rollout/runs/run-1/advance").json()
    assert again["tasks"] == advanced["tasks"]
    assert again["node_states"] == advanced["node_states"]

    # The other branch is taken when the gate passes.
    r = client.post(f"{BASE}/projects/{enabled}/workflows/rollout/start",
                    json={"run_key": "run-2"})
    build2 = r.json()["tasks"]["build"]
    adapter.transition_work(enabled, "task", build2, "done")
    taken = client.post(
        f"{BASE}/projects/{enabled}/workflows/rollout/runs/run-2/advance").json()
    assert taken["node_states"]["rollout"] == "taken"
    assert taken["node_states"]["rollback"] == "skipped"


def test_workflow_timer_route_says_whether_runs_move_on_by_themselves(store, enabled):
    _adapter, client, _dy, workflows = _env(store)
    before = client.get(f"{BASE}/workflows/timer")
    assert before.status_code == 200, before.text
    assert before.json()["at"] is None and before.json()["moving"] is False
    workflows.tick(interface="timer")
    after = client.get(f"{BASE}/workflows/timer").json()
    assert after["by"] == "timer" and after["moving"] is True


def test_loops_bounded_iterations_exit_and_escalation(store, enabled):
    adapter, client, _dy, _workflows = _env(store)
    for bad_loop in ({"max_iterations": "3", "until": {"status": "done"}},
                     {"max_iterations": 11, "until": {"status": "done"}},
                     {"max_iterations": 2, "until": {"status": "maybe"}}):
        r = client.post(f"{BASE}/projects/{enabled}/workflows", json={
            "name": "retry", "nodes": [
                {"id": "build", "title": "Build"},
                {"id": "retry", "title": "Retry", "depends_on": ["build"],
                 "loop": bad_loop}]})
        assert r.status_code == 422, r.text

    r = client.post(f"{BASE}/projects/{enabled}/workflows", json={
        "name": "retry", "nodes": [
            {"id": "build", "title": "Build"},
            {"id": "retry", "title": "Retry", "depends_on": ["build"],
             "loop": {"max_iterations": 3, "until": {"status": "done"}}}]})
    assert r.status_code == 200, r.text
    r = client.post(f"{BASE}/projects/{enabled}/workflows/retry/start",
                    json={"run_key": "run-1"})
    body = r.json()
    assert body["iterations"] == {"retry": 1}
    first = body["tasks"]["retry"]
    work = _by_id(adapter.list_work(enabled))
    assert work[first]["title"] == "Retry"  # iteration 1 keeps the plain title

    # Blocked iteration materialises the next one with explicit identity.
    adapter.transition_work(enabled, "task", first, "blocked")
    adv = client.post(
        f"{BASE}/projects/{enabled}/workflows/retry/runs/run-1/advance").json()
    assert adv["iterations"]["retry"] == 2
    second = adv["tasks"]["retry"]
    assert second != first
    work = _by_id(adapter.list_work(enabled))
    assert work[second]["title"] == "Retry (round 2 of 3)"   # the run view's words
    assert adv["node_states"]["retry"] == "repeating"

    adapter.transition_work(enabled, "task", second, "blocked")
    adv2 = client.post(
        f"{BASE}/projects/{enabled}/workflows/retry/runs/run-1/advance").json()
    assert adv2["iterations"]["retry"] == 3

    # Third blocked iteration exhausts the bound -> human escalation.
    third = adv2["tasks"]["retry"]
    adapter.transition_work(enabled, "task", third, "blocked")
    adv3 = client.post(
        f"{BASE}/projects/{enabled}/workflows/retry/runs/run-1/advance").json()
    assert adv3["node_states"]["retry"] == "escalated"
    assert adv3["escalations"][0]["reason"] == "loop limit reached"
    runs = client.get(f"{BASE}/projects/{enabled}/workflows/retry/runs").json()["runs"]
    assert runs[-1]["status"] == "escalated"
    total_tasks = [item for item in adapter.list_work(enabled)
                   if item["title"].startswith("Retry")]
    assert len(total_tasks) == 3  # bounded: never a fourth iteration

    # Success exit: a done iteration closes the loop, no escalation.
    r = client.post(f"{BASE}/projects/{enabled}/workflows/retry/start",
                    json={"run_key": "run-2"})
    ref = r.json()["tasks"]["retry"]
    adapter.transition_work(enabled, "task", ref, "done")
    adv = client.post(
        f"{BASE}/projects/{enabled}/workflows/retry/runs/run-2/advance").json()
    assert adv["node_states"]["retry"] == "done"


# --------------------------------------------------------- P5.3/P5.11


def test_agent_revisions_policy_approval_and_stale(store, enabled):
    adapter, client, _dy, _workflows = _env(store)
    r = client.post(f"{BASE}/projects/{enabled}/workflows", json={
        "name": "release",
        "nodes": [
            {"id": "build", "title": "Build"},
            {"id": "ship", "title": "Ship", "depends_on": ["build"]}]})
    assert r.status_code == 200
    client.post(f"{BASE}/projects/{enabled}/workflows/release/start",
                json={"run_key": "run-1"})

    # In-policy proposal applies immediately and is recorded.
    r = client.post(
        f"{BASE}/projects/{enabled}/workflows/release/runs/run-1/proposals",
        json={"proposed_by": "agent-7",
              "rationale": "ship is flaky under load",
              "add_nodes": [{"id": "soak", "title": "Soak test",
                             "depends_on": ["build"]}],
              "add_edges": [{"from": "soak", "to": "ship"}]})
    assert r.status_code == 200, r.text
    assert r.json()["status"] == "auto_applied"
    assert r.json()["applied_nodes"] == ["soak"]
    work = _tasks_of(adapter, enabled)
    assert "Soak test" in work and "Ship" in work
    # The added gate links soak -> ship (native dependency), keeping order.
    soak = work["Soak test"]["id"]
    ship = work["Ship"]["id"]
    assert any(link[1] == soak and link[2] == ship
               for link in adapter._canonical_links)
    revisions = client.get(f"{BASE}/projects/{enabled}/workflows/release/"
                           "runs/run-1/revisions").json()["revisions"]
    assert revisions[-1]["status"] == "auto_applied"

    # Out-of-policy proposal is held: nothing materialises, run waits.
    big = [{"id": f"extra-{i}", "title": f"Extra {i}"} for i in range(6)]
    r = client.post(
        f"{BASE}/projects/{enabled}/workflows/release/runs/run-1/proposals",
        json={"proposed_by": "agent-7", "rationale": "retrospective sweep",
              "add_nodes": big})
    assert r.status_code == 200, r.text
    assert r.json()["status"] == "pending"
    assert "limit" in r.json()["reason"]
    assert not any(title.startswith("Extra") for title in _tasks_of(adapter, enabled))
    runs = client.get(f"{BASE}/projects/{enabled}/workflows/release/runs").json()["runs"]
    assert runs[0]["status"] == "awaiting_approval"

    # A restart (fresh app over the same store) does NOT apply pending work.
    fresh = TestClient(create_app(store, kanban_adapter=ReferenceKanbanAdapter(store)))
    assert not any(title.startswith("Extra")
                   for title in _tasks_of(adapter, enabled))
    pending = fresh.get(f"{BASE}/projects/{enabled}/workflows/release/"
                        "runs/run-1/revisions").json()["revisions"]
    assert [row["status"] for row in pending].count("pending") == 1

    # Human approval applies it exactly once; a second decision is stale.
    r = client.post(
        f"{BASE}/projects/{enabled}/workflows/release/runs/run-1/revisions/"
        "rev-2/decide", json={"approve": True, "actor_id": "sahil"})
    assert r.status_code == 200, r.text
    assert r.json()["status"] == "approved"
    assert len([t for t in _tasks_of(adapter, enabled) if t.startswith("Extra")]) == 6
    r = client.post(
        f"{BASE}/projects/{enabled}/workflows/release/runs/run-1/revisions/"
        "rev-2/decide", json={"approve": True, "actor_id": "sahil"})
    assert r.status_code == 409
    assert "stale" in r.text

    # Rejection leaves the graph untouched.
    big2 = [{"id": f"later-{i}", "title": f"Later {i}"} for i in range(6)]
    r = client.post(
        f"{BASE}/projects/{enabled}/workflows/release/runs/run-1/proposals",
        json={"proposed_by": "agent-7", "rationale": "nope",
              "add_nodes": big2})
    assert r.json()["status"] == "pending"
    r = client.post(
        f"{BASE}/projects/{enabled}/workflows/release/runs/run-1/revisions/"
        "rev-3/decide", json={"approve": False, "actor_id": "sahil"})
    assert r.status_code == 200
    assert r.json()["status"] == "rejected"
    assert not any(t.startswith("Later") for t in _tasks_of(adapter, enabled))
    assert len([t for t in _tasks_of(adapter, enabled) if t.startswith("Extra")]) == 6

    # Malformed proposals are refused before anything is recorded.
    r = client.post(
        f"{BASE}/projects/{enabled}/workflows/release/runs/run-1/proposals",
        json={"proposed_by": "agent-7", "rationale": "cycle",
              "add_nodes": [{"id": "loop-a", "title": "A", "depends_on": ["ship"]}],
              "add_edges": [{"from": "loop-a", "to": "build"}]})
    assert r.status_code == 422
    r = client.post(
        f"{BASE}/projects/{enabled}/workflows/release/runs/run-1/proposals",
        json={"proposed_by": "agent-7", "rationale": "reuse",
              "add_nodes": [{"id": "ship", "title": "Clone"}]})
    assert r.status_code == 422
    r = client.post(
        f"{BASE}/projects/{enabled}/workflows/release/runs/run-1/proposals",
        json={"proposed_by": "agent-7", "rationale": "",
              "add_nodes": [{"id": "doc", "title": "Doc"}]})
    assert r.status_code == 200
    assert r.json()["status"] == "pending"  # missing rationale needs a human


def test_revision_assignees_are_checked_before_auto_apply(store, enabled):
    # Catalog review (PR #136752): an agent revision is auto-applied only when
    # every added step's assignee is a project or bound-team member; an
    # undiscovered profile is refused outright.
    adapter, client, _dy, _workflows = _env(store)
    r = client.post(f"{BASE}/projects/{enabled}/workflows", json={
        "name": "release", "nodes": [{"id": "build", "title": "Build"}]})
    assert r.status_code == 200
    assert client.post(f"{BASE}/projects/{enabled}/workflows/release/start",
                       json={"run_key": "run-1"}).status_code == 200
    proposals = f"{BASE}/projects/{enabled}/workflows/release/runs/run-1/proposals"

    # "default" is a discovered profile but not a project or team member.
    r = client.post(proposals, json={
        "proposed_by": "agent-7", "rationale": "needs a soak",
        "add_nodes": [{"id": "soak", "title": "Soak test", "phase_team": "default",
                       "depends_on": ["build"]}]})
    assert r.status_code == 200, r.text
    assert r.json()["status"] == "pending"
    assert "not a project or team member" in r.json()["reason"]
    assert "Soak test" not in _tasks_of(adapter, enabled)

    # An undiscovered profile is refused before anything is recorded.
    before = client.get(f"{proposals[:-len('proposals')]}revisions").json()["revisions"]
    r = client.post(proposals, json={
        "proposed_by": "agent-7", "rationale": "ghost work",
        "add_nodes": [{"id": "ghost", "title": "Ghost", "phase_team": "nobody-here"}]})
    assert r.status_code == 422
    assert "undiscovered profile" in r.text
    after = client.get(f"{proposals[:-len('proposals')]}revisions").json()["revisions"]
    assert len(after) == len(before)

    # With "default" in the bound team the same kind of step auto-applies.
    group_id = _team_group(store)
    assert client.put(f"{BASE}/projects/{enabled}/workflows/release/binding",
                      json={"group_id": group_id, "overrides": {}}).status_code == 200
    r = client.post(proposals, json={
        "proposed_by": "agent-7", "rationale": "needs a lint",
        "add_nodes": [{"id": "lint", "title": "Lint", "phase_team": "default",
                       "depends_on": ["build"]}]})
    assert r.status_code == 200, r.text
    assert r.json()["status"] == "auto_applied"
    assert _tasks_of(adapter, enabled)["Lint"]["assignee"] == "default"


def test_revision_proposer_is_the_trusted_principal_never_the_body(store, enabled):
    adapter = ReferenceKanbanAdapter(store)
    app = create_app(store, kanban_adapter=adapter, auth_token="test-token",
                     auth_principal="test-user", auth_principal_is_human=True)
    with TestClient(app, headers={"Authorization": "Bearer test-token"}) as client:
        assert client.post(f"{BASE}/projects/{enabled}/workflows", json={
            "name": "release", "nodes": [{"id": "build", "title": "Build"}]}).status_code == 200
        assert client.post(f"{BASE}/projects/{enabled}/workflows/release/start",
                           json={"run_key": "run-1"}).status_code == 200
        r = client.post(
            f"{BASE}/projects/{enabled}/workflows/release/runs/run-1/proposals",
            json={"proposed_by": "mallory", "rationale": "",
                  "add_nodes": [{"id": "doc", "title": "Doc"}]})
        assert r.status_code == 200, r.text
    row = store._conn.execute(
        "SELECT proposed_by FROM dockyard_workflow_revisions WHERE project_id=? AND run_key='run-1'",
        (enabled,)).fetchone()
    assert row["proposed_by"] == "test-user"


# ---------------------------------------------------------------- P5.8


def test_export_import_round_trip_preview_and_limits(store, enabled):
    _adapter, client, _dy, _workflows = _env(store)
    group_id = _team_group(store)
    r = client.post(f"{BASE}/projects/{enabled}/workflows", json={
        "name": "full",
        "nodes": [
            {"id": "build", "title": "Build",
             "canvas_position": {"x": 5, "y": 6}, "phase_team": "default"},
            {"id": "ship", "title": "Ship", "depends_on": ["build"]},
            {"id": "rollback", "title": "Rollback", "depends_on": ["build"],
             "when": {"node": "build", "status": "blocked"}},
            {"id": "retry", "title": "Retry", "depends_on": ["build"],
             "loop": {"max_iterations": 3, "until": {"status": "done"}}},
        ]})
    assert r.status_code == 200, r.text
    r = client.put(f"{BASE}/projects/{enabled}/workflows/full/binding",
                   json={"group_id": group_id, "overrides": {"ship": "default"}})
    assert r.status_code == 200

    exported = client.get(f"{BASE}/projects/{enabled}/workflows/full/export").json()
    assert exported["schema"] == "stewardship.workflow/v2"
    assert exported["version"] == 1
    assert "runs" not in exported  # run state is deliberately not exported
    assert exported["binding"] == {"group_id": group_id,
                                   "overrides": {"ship": "default"}}
    assert exported["policy"]["max_loop_iterations"] >= 3

    # Preview validates without writing anything.
    r = client.post(f"{BASE}/projects/{enabled}/workflows/import",
                    json={"apply": False, "document": dict(exported, name="full-2")})
    assert r.status_code == 200, r.text
    preview = r.json()
    assert preview["applied"] is False
    assert preview["preview"]["valid"] is True
    assert preview["preview"]["node_count"] == 4
    kinds = {node["id"]: node for node in preview["preview"]["nodes"]}
    assert kinds["rollback"]["conditional"] is True
    assert kinds["retry"]["loop"] == {"max_iterations": 3,
                                      "until": {"status": "done"}}
    listing = client.get(f"{BASE}/projects/{enabled}/workflows").json()["workflows"]
    assert all(row["name"] != "full-2" for row in listing)

    # Apply creates a fresh versioned instance with semantic round-trip.
    r = client.post(f"{BASE}/projects/{enabled}/workflows/import",
                    json={"apply": True, "as_name": "full-2",
                          "document": dict(exported, name="full-2")})
    assert r.status_code == 200, r.text
    assert r.json()["applied"] is True
    round_trip = client.get(
        f"{BASE}/projects/{enabled}/workflows/full-2/export").json()
    assert round_trip["definition"] == exported["definition"]
    assert round_trip["binding"]["overrides"] == {"ship": "default"}

    # Oversized payloads are refused with the byte limit stated.
    huge = dict(exported)
    huge["definition"] = json.loads(json.dumps(exported["definition"]))
    huge["definition"]["nodes"][0]["body"] = "x" * (IMPORT_MAX_BYTES + 10)
    r = client.post(f"{BASE}/projects/{enabled}/workflows/import",
                    json={"apply": False, "document": huge})
    assert r.status_code == 422
    assert "byte limit" in r.text

    # Structurally invalid imports fail with the concrete reason.
    broken = {"name": "broken", "nodes": [
        {"id": "a", "title": "A", "depends_on": ["b"]},
        {"id": "b", "title": "B", "depends_on": ["a"]}]}
    r = client.post(f"{BASE}/projects/{enabled}/workflows/import",
                    json={"apply": True, "document": broken})
    assert r.status_code == 422
    assert "acyclic" in r.text


# ------------------------------------------------- P5.10/P5.11 support


def test_duplicate_start_interruption_recovery_and_isolation(store, enabled):
    adapter, client, _dy, _workflows = _env(store)
    enable_project(StewardshipService(store), "other")
    client.post(f"{BASE}/projects/{enabled}/workflows", json={
        "name": "release", "nodes": [
            {"id": "build", "title": "Build"},
            {"id": "ship", "title": "Ship", "depends_on": ["build"]}]})
    client.post(f"{BASE}/projects/other/workflows", json={
        "name": "release", "nodes": [{"id": "other", "title": "Other"}]})

    first = client.post(f"{BASE}/projects/{enabled}/workflows/release/start",
                        json={"run_key": "run-1"}).json()
    replay = client.post(f"{BASE}/projects/{enabled}/workflows/release/start",
                         json={"run_key": "run-1"})
    assert replay.status_code == 200
    assert replay.json()["replayed"] is True
    assert replay.json()["tasks"] == first["tasks"]
    assert len(adapter.list_work(enabled)) == 2  # no duplicates

    # Interruption: a crash between the ledger INSERT and materialisation
    # leaves a pending run; retrying start recovers without duplicates.
    store._conn.execute(
        "UPDATE dockyard_workflow_runs SET status='pending', result_json='{}' "
        "WHERE project_id=? AND name=? AND run_key=?",
        (enabled, "release", "run-1"))
    store._conn.commit()
    recovered = client.post(f"{BASE}/projects/{enabled}/workflows/release/start",
                            json={"run_key": "run-1"})
    assert recovered.status_code == 200
    assert recovered.json()["replayed"] is False
    assert recovered.json()["tasks"] == first["tasks"]
    assert len(adapter.list_work(enabled)) == 2

    # Isolation: the same workflow name in another project is independent.
    other = client.post(f"{BASE}/projects/other/workflows/release/start",
                        json={"run_key": "run-1"}).json()
    assert set(other["tasks"].keys()) == {"other"}
    runs = client.get(f"{BASE}/projects/other/workflows/release/runs").json()["runs"]
    other_titles = {node["title"] for node in runs[0]["nodes"]}
    assert other_titles == {"Other"}
    enabled_titles = {node["title"] for node in
                      client.get(f"{BASE}/projects/{enabled}/workflows/release/runs")
                      .json()["runs"][0]["nodes"]}
    assert enabled_titles == {"Build", "Ship"}
