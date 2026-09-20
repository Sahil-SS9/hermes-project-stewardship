"""HPS Phase 5 — genuine worker-lifecycle acceptance gate.

This module closes the audit's two critical gaps:

1. **Claim/execute/result through the canonical host.**  The fake worker
   drives the real vanilla Hermes claim/complete lifecycle
   (``claim_task`` atomically transitions ``ready -> running`` with a
   claim lease; ``complete_task`` records a worker result and closes the
   run).  No test code writes task statuses directly.

2. **Real team binding.**  The run is started with a bound non-null
   group whose membership is discovered from the bot/team store; an
   assignee outside the team/project is refused at start.

Run completion is derived by ``WorkflowService.advance`` observing the
canonical worker outcome (result recorded on the task), never from
materialisation.  Duplicate worker results are protected by the
canonical claim/result identity: a second ``complete_task`` against the
already-closed run must not re-open or duplicate anything.
"""
from __future__ import annotations

import sys
from pathlib import Path

from hermes_project_stewardship.kanban.host_adapter import (
    create_project_kanban_adapter,
)
from hermes_project_stewardship.persistence.dockyard_service import (
    DockyardService,
)
from hermes_project_stewardship.persistence.store import Store
from hermes_project_stewardship.persistence.workflow_service import (
    WorkflowService,
)


VANILLA = Path("/home/kensei/repos/hermes-agent-vanilla")


def _clear_delegated_child(monkeypatch) -> None:
    monkeypatch.delenv("HERMES_DELEGATED_CHILD_CONTEXT", raising=False)
    monkeypatch.delenv("HERMES_AGENT_DELEGATED_CHILD_CONTEXT", raising=False)
    try:
        import agent.delegation_context as delegation_context
        monkeypatch.setattr(
            delegation_context, "is_delegated_child_process_context", lambda: False)
    except ImportError:
        pass


def _claimable(adapter, project_id: str, title: str):
    """Promote a materialised task to the native ready lane (specify)."""
    work = {x["title"]: x for x in adapter.list_work(project_id)}
    item = work[title]
    adapter.transition_work(project_id, item["kind"], item["id"], "in_progress")
    return item


def test_phase5_worker_claim_execute_result_and_team_binding(tmp_path, monkeypatch):
    _clear_delegated_child(monkeypatch)
    sys.path.insert(0, str(VANILLA))
    try:
        home = tmp_path / "hermes-home"
        # kanban_db resolves the board umbrella from HERMES_KANBAN_HOME before
        # the hermes-home override, so the disposable lane must pin BOTH roots
        # to tmp_path (migration/other suites pop these env vars).
        monkeypatch.setenv("HERMES_KANBAN_HOME", str(tmp_path / "kanban-root"))
        monkeypatch.setenv("HERMES_HOME", str(home))
        adapter = create_project_kanban_adapter(hermes_home=home)
        assert adapter.host_provenance["host_module"].startswith(
            "hermes_project_stewardship")

        store = Store(tmp_path / "stewardship.db")
        try:
            native = adapter.host.provision_project(
                idempotency_key="phase5-worker-project",
                name="Worker Demo", slug="worker-demo", board_slug="default",
                description="worker lifecycle acceptance", lead_profile="default",
                repo_path=str(tmp_path),
            )
            project_id = str(native["project"]["id"])

            # --- Real team binding: a bot group with a discovered member.
            dy = DockyardService(store)
            dy.bot_register("bot-worker", "Worker One", profile="worker-a")
            group = dy.group_create("release-team")
            dy.group_add_member("release-team", "bot-worker")
            group_id = int(group.id)

            service = WorkflowService(store, adapter)
            definition = {
                "nodes": [
                    {"id": "build", "title": "Build", "assignee": "worker-a"},
                    {"id": "review", "title": "Human review", "human_gate": True,
                     "depends_on": ["build"], "assignee": "worker-a"},
                ],
            }
            service.define(project_id, "release", definition)

            # Binding validates the group exists; membership is discovered
            # from the bot/team tables (not injected arguments).
            binding = service.set_binding(
                project_id, "release", group_id=group_id, overrides={},
                actor="binding-test", known_profiles=["worker-a"])
            assert binding["group_id"] == group_id

            # Out-of-team assignment is refused at start: an override naming
            # a discovered profile that is not a team/project member fails,
            # and a phase_team naming an undiscovered profile fails too.
            import pytest
            service.define(project_id, "reject", {
                "nodes": [{"id": "build", "title": "Build",
                           "phase_team": "stranger"}]})
            service.set_binding(
                project_id, "reject", group_id=group_id, overrides={},
                actor="binding-test", known_profiles=["worker-a"])
            with pytest.raises(ValueError, match="failed validation"):
                service.start(project_id, "reject", "bad-run",
                              known_profiles=["worker-a"])
            # A discovered profile outside the team/project is refused —
            # the refusal fires at binding time itself.
            service.define(project_id, "reject2", {
                "nodes": [{"id": "build", "title": "Build"}]})
            with pytest.raises(ValueError, match="not a member"):
                service.set_binding(
                    project_id, "reject2", group_id=group_id,
                    overrides={"build": "outsider"},
                    actor="binding-test",
                    known_profiles=["worker-a", "outsider"])

            started = service.start(project_id, "release", "worker-run-1")
            assert started["replayed"] is False
            assert set(started["tasks"]) == {"build", "review"}

            # Materialised run is pending; nothing has executed yet.
            assert service.runs(project_id, "release")[0]["status"] == "pending"

            build = {x["title"]: x for x in adapter.list_work(project_id)}["Build"]
            review = {x["title"]: x for x in adapter.list_work(project_id)}["Human review"]

            # --- Fake worker drives the REAL claim/complete lifecycle.
            # The claim path is the canonical native lane:
            # task -> ready (specify) -> claim_task (running, lease) ->
            # complete_task (records result + closes the native run).
            adapter.transition_work(project_id, "task", build["id"], "in_progress")
            kb = adapter.host
            import hermes_cli.kanban_db as kanban_db
            with kb._kanban(None) as (_kbmod, conn, _board):  # vanilla native conn
                claimed = kanban_db.claim_task(
                    conn, build["id"], claimer="fake-worker-a")
                assert claimed is not None, "native claim must succeed"
                assert claimed.status == "running"
                # A second claim of the same task is refused (single lease).
                assert kanban_db.claim_task(
                    conn, build["id"], claimer="other-worker") is None
                # Complete with the claim's own run id — the canonical
                # result-recording path used by real workers.
                done = kanban_db.complete_task(
                    conn, build["id"], result="build finished",
                    summary="build ok", expected_run_id=claimed.current_run_id)
                assert done is True
                # Duplicate worker result against the closed claim must not
                # overwrite or duplicate: expected_run_id no longer matches
                # any open run.
                dup = kanban_db.complete_task(
                    conn, build["id"], result="replayed result",
                    expected_run_id=claimed.current_run_id)
                after = kanban_db.get_task(conn, build["id"])
                assert after.status == "done"
                assert (after.result or "") == "build finished"

            # --- Human gate: the human reviewer moves the gate through the
            # canonical review lifecycle (specify -> review -> approval).
            adapter.transition_work(project_id, "gate", review["id"], "in_progress")
            adapter.transition_work(
                project_id, "gate", review["id"], "in_review")
            adapter.transition_work(project_id, "gate", review["id"], "done")

            # --- Run completion derives from the canonical worker outcome.
            final_state = service.advance(project_id, "release", "worker-run-1")
            run = service.runs(project_id, "release")[0]
            assert run["status"] == "complete", run["status"]
            assert final_state["node_states"]["review"] == "done"

            # Exactly one side effect per node; worker result preserved.
            work = adapter.list_work(project_id)
            assert len(work) == 2
            recorded = {x["title"]: x for x in work}
            assert recorded["Build"]["status"] == "done"
        finally:
            store.close()
    finally:
        sys.path.remove(str(VANILLA))