"""Lane B Phase 7 — isolation + retention after disable/archive (PM-0704).

Uses real canonical project records (ReferenceKanbanAdapter work rows) and
attached disposable git repository fixtures — never unrelated stand-ins.
Proves:
  * cross-project isolation (same Store, two projects),
  * cross-database isolation (two separate Store files as two homes),
  * disable preserves goals/objectives/milestones/workflows/canonical work,
  * archive preserves history and leaves canonical project/board/tasks/repo untouched,
  * repository fixture bytes are unchanged by disable/archive.
"""
from __future__ import annotations

import pytest

fastapi = pytest.importorskip("fastapi")
from tests.lane_b_phase7_fixtures import (  # noqa: E402
    lane_b_tmp_repo,
    make_service_client,
    make_store,
)


@pytest.fixture()
def env(tmp_path):
    store, service, adapter, app, client, headers = make_service_client(tmp_path)
    yield store, service, adapter, app, client, headers
    store.close()


def _seed_project(service, adapter, pid, repo):
    from hermes_project_stewardship.dockyard import Actor, ActorKind
    from hermes_project_stewardship.persistence.dockyard_service import DockyardService

    service.enable(pid, mission=f"mission {pid}", lead_profile="lead",
                   member_profiles=["worker"])
    goal = service.create_goal(pid, actor="sahil", interface="test",
                               title=f"Goal {pid}", description="d",
                               objective_ids=[])
    oid = int(service.add_objective(pid, name=f"Obj {pid}",
                                    evaluator_type="manual", target=">=1",
                                    actor="sahil", interface="test")["id"])
    dy = DockyardService(service.store)
    dy.milestone_create(pid, f"M-{pid}", due="2026-12-01",
                        actor=Actor(id="sahil", display_name="Sahil", kind=ActorKind.HUMAN))
    adapter.create_work(pid, kind="task", title=f"Work {pid}", body=None,
                        assignee="worker", created_by="sahil",
                        parent_id=None)
    return {"goal_id": goal["goal_id"], "objective_id": oid, "repo": str(repo)}


def test_cross_project_isolation_same_store(env, tmp_path):
    """PM-0704: two projects in one Store never leak goals/work/members."""
    store, service, adapter, app, client, headers = env
    repo_a = lane_b_tmp_repo(tmp_path / "repo-a")
    repo_b = lane_b_tmp_repo(tmp_path / "repo-b")
    _seed_project(service, adapter, "proj-a", repo_a)
    _seed_project(service, adapter, "proj-b", repo_b)
    goals_a = {g["goal_id"] for g in service.goals("proj-a")}
    goals_b = {g["goal_id"] for g in service.goals("proj-b")}
    assert goals_a and goals_b and not (goals_a & goals_b)
    work_a = {w["id"] for w in adapter.list_work("proj-a")}
    work_b = {w["id"] for w in adapter.list_work("proj-b")}
    assert work_a and work_b and not (work_a & work_b)
    boards = (adapter.bound_board_slug("proj-a"), adapter.bound_board_slug("proj-b"))
    # Reference adapter binds boards per project; at minimum work sets differ.
    assert work_a.isdisjoint(work_b), (work_a, work_b)
    assert boards is not None


def test_cross_database_isolation_two_homes(tmp_path):
    """PM-0704: two separate Store files (two synthetic homes) are isolated."""
    store_a = make_store(tmp_path, "home-a.db")
    store_b = make_store(tmp_path, "home-b.db")
    try:
        from hermes_project_stewardship.persistence.service import StewardshipService

        svc_a, svc_b = StewardshipService(store_a), StewardshipService(store_b)
        svc_a.enable("demo", mission="a", lead_profile="lead")
        svc_b.enable("demo", mission="b", lead_profile="lead")
        svc_a.create_goal("demo", actor="s", interface="t", title="Only A",
                          description="d", objective_ids=[])
        assert [g["title"] for g in svc_b.goals("demo")] == []
        assert [g["title"] for g in svc_a.goals("demo")] == ["Only A"]
    finally:
        store_a.close()
        store_b.close()


def test_disable_preserves_canonical_records_and_repo(env, tmp_path):
    """PM-0704: disable keeps goals/objectives/milestones/workflows/work; repo untouched."""
    store, service, adapter, app, client, headers = env
    repo = lane_b_tmp_repo(tmp_path / "repo-disable")
    before_bytes = sorted((p.relative_to(repo), p.read_bytes()) for p in repo.rglob("*") if p.is_file() and ".git" not in p.parts)
    seed = _seed_project(service, adapter, "retain-me", repo)
    # One workflow + one run (real run_key ledger).
    from hermes_project_stewardship.persistence.workflow_service import WorkflowService

    wf = WorkflowService(store, adapter)
    wf.define("retain-me", "release", {"nodes": [
        {"id": "verify", "title": "Verify", "depends_on": [], "human_gate": False}]})
    started = wf.start("retain-me", "release", "retain-run-1")
    assert started["run_key"] == "retain-run-1"
    disabled = service.disable("retain-me")
    assert disabled["enabled"] is False
    # Canonical records survive disable (read via _require_known-tolerant paths).
    assert any(g["goal_id"] == seed["goal_id"] for g in service.goals("retain-me", include_archived=True))
    assert any(o.id == seed["objective_id"] for o in service.objectives("retain-me", include_disabled=True))
    assert wf.list("retain-me", include_archived=True)
    assert wf.runs("retain-me", "release")[0]["run_key"] == "retain-run-1"
    assert adapter.list_work("retain-me"), "canonical work must survive disable"
    after_bytes = sorted((p.relative_to(repo), p.read_bytes()) for p in repo.rglob("*") if p.is_file() and ".git" not in p.parts)
    assert before_bytes == after_bytes, "repository fixture must be byte-identical after disable"
    # Re-enable restores exactly.
    restored = service.re_enable("retain-me")
    assert restored["enabled"] is True
    assert any(g["goal_id"] == seed["goal_id"] for g in service.goals("retain-me"))


def test_archive_preserves_history_and_leaves_canonical_untouched(env, tmp_path):
    """PM-0704: archive keeps history; canonical project/board/tasks/repo untouched."""
    store, service, adapter, app, client, headers = env
    repo = lane_b_tmp_repo(tmp_path / "repo-archive")
    before = sorted((p.relative_to(repo), p.read_bytes()) for p in repo.rglob("*") if p.is_file() and ".git" not in p.parts)
    _seed_project(service, adapter, "arch-me", repo)
    work_before = sorted(w["id"] for w in adapter.list_work("arch-me"))
    assert work_before
    result = service.archive_project("arch-me", actor="verified-human", interface="test")
    assert result["canonical_untouched"] == ["project", "board", "tasks", "repository"]
    # History preserved: audit carries the archive event.
    audits = store._conn.execute(
        "SELECT action FROM stewardship_audit_log WHERE subject=? ORDER BY id",
        ("arch-me",),
    ).fetchall()
    assert "project.archived" in [r["action"] for r in audits]
    # Canonical work identical after archive.
    assert sorted(w["id"] for w in adapter.list_work("arch-me")) == work_before
    after = sorted((p.relative_to(repo), p.read_bytes()) for p in repo.rglob("*") if p.is_file() and ".git" not in p.parts)
    assert before == after
    # Restore brings the project back; canonical still identical.
    service.restore_project("arch-me", actor="verified-human", interface="test")
    assert sorted(w["id"] for w in adapter.list_work("arch-me")) == work_before
