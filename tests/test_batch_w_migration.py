"""Batch W: upgrade a populated, disposable v30 DB, downgrade and re-upgrade."""
from __future__ import annotations

import json

from hermes_project_stewardship.persistence import migrations, store as store_module
from hermes_project_stewardship.persistence.migrations import SCHEMA_VERSION
from hermes_project_stewardship.persistence.store import Store


_TABLES = (
    "dockyard_workflows", "dockyard_workflow_runs",
    "dockyard_workflow_bindings", "dockyard_workflow_revisions",
    "dockyard_workflow_templates",
)


def _snapshot(cx):
    return {table: [tuple(row) for row in cx.execute(
        f"SELECT * FROM {table} ORDER BY rowid")] for table in _TABLES}


def _whole_v30_snapshot(cx):
    """Compare all pre-existing domain tables, not only the seeded tables."""
    names = [row[0] for row in cx.execute(
        "SELECT name FROM sqlite_master WHERE type='table' "
        "AND name NOT IN ('schema_migrations','sqlite_sequence') ORDER BY name")]
    return {name: [tuple(row) for row in cx.execute(f"SELECT * FROM {name}")]
            for name in names}


def test_v30_v31_v30_v31_roundtrip_preserves_legacy_data_and_name_clash(tmp_path, monkeypatch):
    db = tmp_path / "populated-v30.db"
    with monkeypatch.context() as context:
        context.setattr(store_module, "MIGRATIONS", [m for m in migrations.MIGRATIONS if m.version <= 30])
        legacy = Store(db)
    assert legacy.schema_version == 30
    cx = legacy._conn
    definition = json.dumps({"nodes": [{"id": "step", "title": "Step", "depends_on": []}]})
    cx.execute("INSERT INTO dockyard_workflows(project_id,name,version,definition_json,created_at) VALUES(?,?,?,?,?)", ("p1", "clash", 1, definition, "2026-01-01"))
    cx.execute("INSERT INTO dockyard_workflows(project_id,name,version,definition_json,created_at) VALUES(?,?,?,?,?)", ("p1", "clash", 2, definition, "2026-01-02"))
    cx.execute("INSERT INTO dockyard_workflow_runs(project_id,name,version,run_key,result_json,started_at,status,updated_at,effective_json) VALUES(?,?,?,?,?,?,?,?,?)", ("p1", "clash", 1, "run-1", "{}", "2026-01-01", "complete", "2026-01-01", definition))
    cx.execute("INSERT INTO dockyard_workflow_bindings(project_id,name,group_id,overrides_json,updated_at,updated_by) VALUES(?,?,?,?,?,?)", ("p1", "clash", None, "{}", "2026-01-01", "owner"))
    cx.execute("INSERT INTO dockyard_workflow_revisions(project_id,name,run_key,revision_key,proposal_json,status,proposed_by,created_at) VALUES(?,?,?,?,?,?,?,?)", ("p1", "clash", "run-1", "revision-1", "{}", "pending", "bot", "2026-01-01"))
    cx.execute("INSERT INTO dockyard_workflow_templates(name,version,definition_json,created_at,created_by) VALUES(?,?,?,?,?)", ("clash", 1, definition, "2026-01-01", "owner"))
    cx.execute("INSERT INTO dockyard_workflow_templates(name,version,definition_json,created_at,created_by) VALUES(?,?,?,?,?)", ("clash", 2, definition, "2026-01-02", "owner"))
    before = _snapshot(cx)
    whole_before = _whole_v30_snapshot(cx)
    legacy.close()

    upgraded = Store(db)
    assert upgraded.schema_version == SCHEMA_VERSION
    assert upgraded._conn.execute("SELECT count(*) FROM dockyard_global_workflows WHERE name='clash'").fetchone()[0] == 2
    assert [tuple(row) for row in upgraded._conn.execute("SELECT project_id,name,version,scope,owner_project_id FROM dockyard_workflows ORDER BY version")] == [
        ("p1", "clash", 1, "project", "p1"), ("p1", "clash", 2, "project", "p1")]
    assert upgraded._conn.execute("SELECT enabled FROM dockyard_workflow_enablement WHERE project_id='p1' AND scope='project' AND workflow_name='clash'").fetchone()[0] == 1
    assert upgraded._conn.execute("SELECT count(*) FROM dockyard_workflow_enablement WHERE scope='global'").fetchone()[0] == 0
    assert {table: [tuple(row) for row in upgraded._conn.execute(f"SELECT * FROM {table} ORDER BY rowid")] for table in _TABLES[1:]} == {table: before[table] for table in _TABLES[1:]}
    # Downgrade every lane > 30 (this test pins the v31 roundtrip; later lanes
    # may have added their own objects on top).
    for lane in sorted((m.version for m in migrations.MIGRATIONS if 30 < m.version <= SCHEMA_VERSION), reverse=True):
        upgraded._conn.executescript(next(m for m in migrations.MIGRATIONS if m.version == lane).downgrade_sql)
        upgraded._conn.execute("DELETE FROM schema_migrations WHERE version=?", (lane,))
    assert _snapshot(upgraded._conn) == before
    assert _whole_v30_snapshot(upgraded._conn) == whole_before
    upgraded.migrate()
    assert upgraded.schema_version == SCHEMA_VERSION
    assert upgraded._conn.execute("SELECT count(*) FROM dockyard_global_workflows WHERE name='clash'").fetchone()[0] == 2
    upgraded.close()
