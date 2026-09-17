from __future__ import annotations

import os
from pathlib import Path

import pytest

from hermes_project_stewardship.kanban import ProjectKanbanHostAdapter
from hermes_project_stewardship.persistence.migration_service import IsolatedMigrationRunner
from hermes_project_stewardship.persistence.service import StewardshipService
from hermes_project_stewardship.persistence.store import Store


def _fixture(tmp_path: Path, *, status: str = "backlog"):
    try:
        import hermes_constants
        from hermes_cli import kanban_db as kb, projects_db as pdb
    except ImportError:
        if os.environ.get("STEWARD_REQUIRE_NATIVE_HOST") == "1":
            pytest.fail("Native host lane requires a real pinned Hermes runtime")
        pytest.skip("optional native Hermes runtime not installed")
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
    previous_home = os.environ.get("HERMES_HOME")
    os.environ["HERMES_HOME"] = str(home)
    try:
        with pdb.connect_closing() as conn:
            project_id = pdb.create_project(
                conn, name="Demo", slug="demo", board_slug="demo")
        with kb.scoped_current_board("demo"):
            kb.create_board("demo", name="Demo", project_id=project_id)
    finally:
        hermes_constants.reset_hermes_home_override(token)
        if previous_home is None:
            os.environ.pop("HERMES_HOME", None)
        else:
            os.environ["HERMES_HOME"] = previous_home
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
    monkeypatch.setenv("HERMES_HOME", str(home))
    original = ProjectKanbanHostAdapter.transition_work

    def fail_after_create(self, *args, **kwargs):
        raise RuntimeError("simulated post-create failure")

    monkeypatch.setattr(ProjectKanbanHostAdapter, "transition_work", fail_after_create)
    runner = IsolatedMigrationRunner(
        source_db=source_db, target_home=home, snapshot=snapshot, board="demo")
    with pytest.raises(RuntimeError, match="post-create"):
        runner.apply("demo")
    monkeypatch.setattr(ProjectKanbanHostAdapter, "transition_work", original)

    from hermes_project_stewardship.kanban.vanilla_host import ProjectKanbanHost
    restored = ProjectKanbanHostAdapter(ProjectKanbanHost(hermes_home=home))
    assert restored.list_work("demo") == []
    failed = snapshot.with_name(snapshot.name + "-failed")
    monkeypatch.setenv("HERMES_HOME", str(failed))
    failed_host = ProjectKanbanHostAdapter(ProjectKanbanHost(hermes_home=failed))
    assert len(failed_host.list_work("demo")) == 1


def test_successful_apply_can_be_explicitly_rolled_back(tmp_path, monkeypatch):
    source_db, home, snapshot = _fixture(tmp_path)
    monkeypatch.setenv("HERMES_HOME", str(home))
    runner = IsolatedMigrationRunner(
        source_db=source_db, target_home=home, snapshot=snapshot, board="demo")
    result = runner.apply("demo")
    assert result["count"] == 1 and result["rolled_back"] is False
    rollback = runner.rollback()
    assert rollback["rolled_back"] is True
    from hermes_project_stewardship.kanban.vanilla_host import ProjectKanbanHost
    restored = ProjectKanbanHostAdapter(ProjectKanbanHost(hermes_home=home))
    assert restored.list_work("demo") == []
