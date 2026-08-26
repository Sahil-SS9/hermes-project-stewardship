from __future__ import annotations

from pathlib import Path

import pytest

from hermes_project_stewardship.kanban import ProjectKanbanHostAdapter
from hermes_project_stewardship.persistence.migration_service import IsolatedMigrationRunner
from hermes_project_stewardship.persistence.service import StewardshipService
from hermes_project_stewardship.persistence.store import Store


def _fixture(tmp_path: Path, *, status: str = "backlog"):
    hermes_constants = pytest.importorskip("hermes_constants")
    kb = pytest.importorskip("hermes_cli.kanban_db")
    pdb = pytest.importorskip("hermes_cli.projects_db")
    source_root = tmp_path / "source"
    source_root.mkdir()
    (source_root / IsolatedMigrationRunner.SOURCE_MARKER).write_text(
        "dockyard-isolated-v1\n", encoding="utf-8")
    source = Store(source_root / "legacy.db")
    StewardshipService(source).enable(
        project_id="demo", mission="Proof", lead_profile="octacon", autonomy_level=1)
    with source.tx() as cx:
        cx.execute(
            "INSERT INTO dockyard_work_items "
            "(project_id,ref,type,title,status,created_by_id,labels_json,"
            "blocked_by_json,evidence_refs_json,created_at,updated_at) "
            "VALUES(?,?,?,?,?,?,?,?,?,?,?)",
            ("demo", "HDY-1", "task", "Legacy task", status, "sahil",
             "[]", "[]", "[]", "2026-01-01T00:00:00Z", "2026-01-01T00:00:00Z"),
        )
    source.close()

    home = tmp_path / "target"
    home.mkdir()
    (home / IsolatedMigrationRunner.TARGET_MARKER).write_text(
        "dockyard-isolated-v1\n", encoding="utf-8")
    token = hermes_constants.set_hermes_home_override(home)
    try:
        with pdb.connect_closing() as conn:
            project_id = pdb.create_project(
                conn, name="Demo", slug="demo", board_slug="demo")
        with kb.scoped_kanban_home(home):
            kb.create_board("demo", name="Demo", project_id=project_id)
    finally:
        hermes_constants.reset_hermes_home_override(token)
    return source_root / "legacy.db", home, tmp_path / "snapshot"


def test_runner_refuses_unmarked_roots(tmp_path):
    source = tmp_path / "source"
    target = tmp_path / "target"
    source.mkdir(); target.mkdir()
    (source / "legacy.db").write_bytes(b"not-a-db")
    with pytest.raises(ValueError, match="missing"):
        IsolatedMigrationRunner(
            source_db=source / "legacy.db", target_home=target,
            snapshot=tmp_path / "snapshot", board="demo")


def test_apply_failure_restores_snapshot_and_preserves_failed_target(
    tmp_path, monkeypatch,
):
    source_db, home, snapshot = _fixture(tmp_path, status="done")
    original = ProjectKanbanHostAdapter.transition_work

    def fail_after_create(self, *args, **kwargs):
        raise RuntimeError("simulated post-create failure")

    monkeypatch.setattr(ProjectKanbanHostAdapter, "transition_work", fail_after_create)
    runner = IsolatedMigrationRunner(
        source_db=source_db, target_home=home, snapshot=snapshot, board="demo")
    with pytest.raises(RuntimeError, match="post-create"):
        runner.apply("demo")
    monkeypatch.setattr(ProjectKanbanHostAdapter, "transition_work", original)

    host_module = pytest.importorskip("hermes_cli.project_kanban_host")
    restored = host_module.ProjectKanbanHost(hermes_home=home, board="demo")
    assert restored.list_tasks(board="demo")["items"] == []
    failed = snapshot.with_name(snapshot.name + "-failed")
    failed_host = host_module.ProjectKanbanHost(hermes_home=failed, board="demo")
    assert len(failed_host.list_tasks(board="demo")["items"]) == 1


def test_successful_apply_can_be_explicitly_rolled_back(tmp_path):
    source_db, home, snapshot = _fixture(tmp_path)
    runner = IsolatedMigrationRunner(
        source_db=source_db, target_home=home, snapshot=snapshot, board="demo")
    result = runner.apply("demo")
    assert result["count"] == 1 and result["rolled_back"] is False
    rollback = runner.rollback()
    assert rollback["rolled_back"] is True
    host_module = pytest.importorskip("hermes_cli.project_kanban_host")
    restored = host_module.ProjectKanbanHost(hermes_home=home, board="demo")
    assert restored.list_tasks(board="demo")["items"] == []
