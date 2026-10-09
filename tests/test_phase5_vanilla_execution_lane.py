"""Disposable Phase 5 native-host execution gate.

This is deliberately a real vanilla host lane: the only host implementation
loaded is the pinned upstream checkout named by HPS_HERMES_SOURCE
(tests/hermes_source.py; unset, the test skips), while all state lives below
tmp_path. Workers are deterministic and never call a
model or a live fleet.
"""
from __future__ import annotations

import sys

from hermes_project_stewardship.kanban.host_adapter import create_project_kanban_adapter
from hermes_project_stewardship.persistence.workflow_service import WorkflowService
from hermes_project_stewardship.persistence.store import Store

from .hermes_source import require_hermes_tree


def test_phase5_complete_multistep_execution_on_pinned_vanilla(tmp_path, monkeypatch):
    vanilla = require_hermes_tree()
    # This test owns only tmp_path state; clear the orchestration child marker so
    # vanilla's production write guard does not mistake the disposable lane for
    # an attempted delegated live mutation.
    monkeypatch.delenv("HERMES_DELEGATED_CHILD_CONTEXT", raising=False)
    try:
        import agent.delegation_context as delegation_context
        monkeypatch.setattr(delegation_context, "is_delegated_child_process_context", lambda: False)
    except ImportError:
        pass
    # Import the genuine host runtime, not the stewardship compatibility host.
    sys.path.insert(0, str(vanilla))
    try:
        home = tmp_path / "hermes-home"
        # kanban_db resolves the board umbrella from HERMES_KANBAN_HOME before
        # the hermes-home override, so the disposable lane must pin BOTH roots
        # to tmp_path (migration/other suites pop these env vars).
        monkeypatch.setenv("HERMES_KANBAN_HOME", str(tmp_path / "kanban-root"))
        monkeypatch.setenv("HERMES_HOME", str(home))
        adapter = create_project_kanban_adapter(hermes_home=home)
        assert adapter.host_provenance["host_module"].startswith("hermes_project_stewardship")
        assert adapter.host.capabilities()["contract_version"]

        store = Store(tmp_path / "stewardship.db")
        try:
            # The native host project is the canonical execution boundary.
            native = adapter.host.provision_project(
                idempotency_key="phase5-native-project",
                name="Demo", slug="demo", board_slug="default",
                description="deterministic acceptance project", lead_profile="default",
                repo_path=str(tmp_path),
            )
            project_id = str(native["project"]["id"])
            service = WorkflowService(store, adapter)
            definition = {
                "nodes": [
                    {"id": "build", "title": "Build", "assignee": "worker-a"},
                    {"id": "review", "title": "Human review", "human_gate": True,
                     "depends_on": ["build"], "assignee": "worker-a"},
                    {"id": "ship", "title": "Ship", "depends_on": ["review"],
                     "when": {"node": "review", "status": "done"}, "assignee": "worker-a"},
                ]
            }
            service.define(project_id, "release", definition)
            service.set_binding(project_id, "release", group_id=None, overrides={}, actor="native-test")
            started = service.start(project_id, "release", "native-run-1",
                                    known_profiles=["worker-a"], project_members=["worker-a"])
            replay = service.start(project_id, "release", "native-run-1",
                                   known_profiles=["worker-a"], project_members=["worker-a"])
            assert replay["replayed"] is True
            assert set(started["tasks"]) == {"build", "review"}

            work = {x["title"]: x for x in adapter.list_work(project_id)}
            build = work["Build"]
            review = work["Human review"]
            ship_before = [x for x in work if x == "Ship"]
            assert not ship_before
            links = adapter.list_work_links(project_id, build["id"])
            # The adapter hands the services rows relative to the item asked
            # about: build -> review means review is a dependent (direction
            # "child") of build. No alternative key names are accepted.
            assert any(
                x.get("direction") == "child" and x.get("task_id") == review["id"]
                for x in links
            ), links

            # Deterministic fake worker: claim/finish the canonical task once.
            adapter.transition_work(project_id, "task", build["id"], "in_progress")
            adapter.transition_work(project_id, "task", build["id"], "in_review")
            adapter.transition_work(project_id, "task", build["id"], "done")
            # Dependency gating: review is still not executable until claimed.
            assert adapter.get_work(project_id, "gate", review["id"])["status"] == "triage"
            adapter.transition_work(project_id, "gate", review["id"], "in_progress")
            adapter.transition_work(project_id, "gate", review["id"], "in_review")
            adapter.transition_work(project_id, "gate", review["id"], "done")

            advanced = service.advance(project_id, "release", "native-run-1")
            assert advanced["node_states"]["ship"] == "taken"
            ship_id = advanced["tasks"]["ship"]
            assert adapter.get_work(project_id, "task", ship_id)["status"] == "triage"
            adapter.transition_work(project_id, "task", ship_id, "in_progress")
            adapter.transition_work(project_id, "task", ship_id, "in_review")
            adapter.transition_work(project_id, "task", ship_id, "done")
            # The orchestration poll/advance boundary derives run completion
            # from canonical task outcomes; materialisation alone is pending.
            service.advance(project_id, "release", "native-run-1")

            # Readback is durable and there is exactly one side effect per node.
            assert len(adapter.list_work(project_id)) == 3
            final = service.runs(project_id, "release")[0]
            assert final["run_key"] == "native-run-1"
            assert final["status"] == "complete"
            assert {x["title"] for x in adapter.list_work(project_id)} == {"Build", "Human review", "Ship"}
        finally:
            store.close()
    finally:
        sys.path.remove(str(vanilla))
