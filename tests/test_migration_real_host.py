from __future__ import annotations

import os
import shutil
from pathlib import Path

import pytest

from hermes_project_stewardship.kanban import ProjectKanbanHostAdapter
from hermes_project_stewardship.persistence.migration_service import LegacyWorkMigrator
from hermes_project_stewardship.persistence.store import Store


def test_real_host_migration_and_snapshot_rollback(tmp_path: Path, monkeypatch):
    try:
        import hermes_constants
        from hermes_cli import kanban_db as kb, projects_db as pdb
    except ImportError:
        if os.environ.get("STEWARD_REQUIRE_NATIVE_HOST") == "1":
            pytest.fail("Native host lane requires a real pinned Hermes runtime")
        pytest.skip("optional native Hermes runtime not installed")
    from hermes_project_stewardship.kanban.vanilla_host import ProjectKanbanHost
    monkeypatch.delenv("HERMES_DELEGATED_CHILD_CONTEXT", raising=False)

    source = Store(tmp_path / "legacy.db")
    source_service = __import__(
        "hermes_project_stewardship.persistence.service",
        fromlist=["StewardshipService"],
    ).StewardshipService(source)
    source_service.enable(
        project_id="demo",
        mission="Migration proof",
        lead_profile="octacon",
        autonomy_level=1,
    )
    with source.tx() as cx:
        cx.execute(
            "INSERT INTO dockyard_work_items "
            "(project_id,ref,type,title,status,created_by_id,labels_json,"
            "blocked_by_json,evidence_refs_json,created_at,updated_at) "
            "VALUES(?,?,?,?,?,?,?,?,?,?,?)",
            ("demo", "HDY-real-1", "task", "Real migrated task", "done",
             "sahil", "[]", "[]", "[]", "2026-01-01T00:00:00Z",
             "2026-01-01T00:00:00Z"),
        )

    home = tmp_path / "hermes"
    home.mkdir()
    token = hermes_constants.set_hermes_home_override(home)
    # Scope BOTH roots: hermes_cli.kanban_db resolves the board umbrella from
    # HERMES_KANBAN_HOME first; leaving it on the shared conftest root makes
    # the snapshot/restore below assert against the wrong directory.
    monkeypatch.setenv("HERMES_HOME", str(home))
    monkeypatch.setenv("HERMES_KANBAN_HOME", str(home))
    try:
        with pdb.connect_closing() as conn:
            project_id = pdb.create_project(
                conn, name="Demo", slug="demo", board_slug="demo")
        with kb.scoped_current_board("demo"):
            kb.create_board("demo", name="Demo", project_id=project_id)
    finally:
        hermes_constants.reset_hermes_home_override(token)

    snapshot = tmp_path / "rollback-snapshot"
    shutil.copytree(home, snapshot)
    monkeypatch.setenv("HERMES_HOME", str(home))
    host = ProjectKanbanHost(hermes_home=home, board="demo")
    migrator = LegacyWorkMigrator(source, ProjectKanbanHostAdapter(host))
    before = migrator.source_digest()
    result = migrator.apply("demo")
    assert result["count"] == 1
    assert len(host.list_tasks(board="demo")["items"]) == 1
    assert migrator.source_digest() == before

    shutil.rmtree(home)
    shutil.copytree(snapshot, home)
    restored = ProjectKanbanHost(hermes_home=home, board="demo")
    assert restored.list_tasks(board="demo")["items"] == []
    assert migrator.source_digest() == before
    source.close()
