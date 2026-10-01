"""Store internals: migrations, mutex, idempotency keys, retention."""

from __future__ import annotations

import os
import sqlite3
from pathlib import Path

import pytest

from hermes_project_stewardship.persistence.store import Store


def test_migration_runs_and_is_idempotent(tmp_path):
    db = tmp_path / "m.db"
    s1 = Store(db)
    assert s1.schema_version >= 1
    tables = {
        r["name"]
        for r in s1._conn.execute(
            "SELECT name FROM sqlite_master WHERE type='table'"
        ).fetchall()
    }
    assert {"project_stewardship", "project_initiatives", "cycle_mutex",
            "stewardship_audit_log", "processed_triggers"} <= tables
    v1 = s1.schema_version
    s1.close()
    s2 = Store(db)  # reopen: no duplicate-migration error
    assert s2.schema_version == v1
    s2.close()


def test_schema_version_constant_matches_migrations(tmp_path):
    """SCHEMA_VERSION must equal max(migration.version) and a fresh store
    must report exactly that constant."""
    from hermes_project_stewardship.persistence.migrations import (
        MIGRATIONS, SCHEMA_VERSION,
    )
    latest = max(m.version for m in MIGRATIONS)
    assert SCHEMA_VERSION == latest, (
        f"SCHEMA_VERSION={SCHEMA_VERSION} but MIGRATIONS reaches {latest}"
    )
    fresh = Store(tmp_path / "fresh.db")
    try:
        assert fresh.schema_version == latest
    finally:
        fresh.close()


def test_table_rebuild_migration_keeps_cascade_children(tmp_path):
    """v30 rebuilds project_initiatives (DROP + RENAME). With foreign keys on,
    that DROP cascades and silently deletes every decision receipt. The runner
    must keep child rows through a rebuild and leave no dangling references."""
    import sqlite3 as _sqlite3

    from hermes_project_stewardship.persistence.migrations import MIGRATIONS

    db = tmp_path / "rebuild.db"
    conn = _sqlite3.connect(db, isolation_level=None)
    conn.row_factory = _sqlite3.Row
    conn.execute("PRAGMA foreign_keys=ON")
    conn.execute(
        "CREATE TABLE schema_migrations (version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL)")
    for migration in sorted(MIGRATIONS, key=lambda m: m.version):
        if migration.version >= 30:
            break
        conn.executescript(migration.upgrade_sql)
        conn.execute("INSERT INTO schema_migrations VALUES(?, '2026')", (migration.version,))
    required = {
        row[1]: "x" for row in conn.execute("PRAGMA table_info(project_stewardship)")
        if row[3] and row[4] is None
    }
    required["project_id"] = "p1"
    conn.execute(
        f"INSERT INTO project_stewardship({','.join(required)}) VALUES({','.join('?' * len(required))})",
        list(required.values()))
    conn.execute(
        "INSERT INTO project_initiatives(ref, project_id, title, rationale, created_at)"
        " VALUES('I-1', 'p1', 't', 'r', '2026')")
    conn.execute(
        "INSERT INTO stewardship_decision_receipts(initiative_ref, decision, actor, interface,"
        " fingerprint, revision, decided_at) VALUES('I-1', 'approved', 'sahil', 'ui', 'f', 1, '2026')")
    conn.close()

    store = Store(db)  # the real runner applies v30 onwards
    try:
        assert store.schema_version >= 30
        receipts = store._conn.execute(
            "SELECT initiative_ref, decision FROM stewardship_decision_receipts").fetchall()
        assert [tuple(row) for row in receipts] == [("I-1", "approved")]
        assert store._conn.execute("PRAGMA foreign_key_check").fetchall() == []
        assert store._conn.execute("PRAGMA foreign_keys").fetchone()[0] == 1
    finally:
        store.close()


def test_initiative_relation_migration_roundtrips(tmp_path):
    """Migration 9 must support downgrade followed by a clean re-upgrade."""
    from hermes_project_stewardship.persistence.migrations import MIGRATIONS

    store = Store(tmp_path / "roundtrip.db")
    migration = next(item for item in MIGRATIONS if item.version == 9)
    try:
        store._conn.executescript(migration.downgrade_sql)
        columns = {
            row["name"]
            for row in store._conn.execute(
                "PRAGMA table_info(dockyard_work_items)"
            ).fetchall()
        }
        assert "initiative_ref" not in columns

        store._conn.executescript(migration.upgrade_sql)
        columns = {
            row["name"]
            for row in store._conn.execute(
                "PRAGMA table_info(dockyard_work_items)"
            ).fetchall()
        }
        assert "initiative_ref" in columns
    finally:
        store.close()


def test_project_management_migration_roundtrips(tmp_path):
    """Migration 10 must drop and recreate both project-management tables."""
    from hermes_project_stewardship.persistence.migrations import MIGRATIONS

    store = Store(tmp_path / "project-management-roundtrip.db")
    migration = next(item for item in MIGRATIONS if item.version == 10)
    try:
        store._conn.executescript(migration.downgrade_sql)
        tables = {
            row["name"]
            for row in store._conn.execute(
                "SELECT name FROM sqlite_master WHERE type='table'"
            ).fetchall()
        }
        assert "project_mission_archive" not in tables
        assert "project_content" not in tables

        store._conn.executescript(migration.upgrade_sql)
        tables = {
            row["name"]
            for row in store._conn.execute(
                "SELECT name FROM sqlite_master WHERE type='table'"
            ).fetchall()
        }
        assert {"project_mission_archive", "project_content"} <= tables
    finally:
        store.close()


def test_mutex_exclusive_and_ttl(store, clock):
    assert store.mutex_acquire("p", "a", ttl_seconds=100)
    assert not store.mutex_acquire("p", "b", ttl_seconds=100)
    clock.advance(seconds=101)
    # expired: b can reclaim
    assert store.mutex_acquire("p", "b", ttl_seconds=100)
    assert store.mutex_holder("p") == "b"


def test_trigger_keys_roundtrip_and_prune(store, clock):
    assert not store.trigger_seen("k1")
    store.trigger_mark("k1")
    assert store.trigger_seen("k1")
    store.trigger_mark("k1")  # idempotent insert
    clock.advance(days=31)
    removed = store.trigger_prune(older_than_days=30)
    assert removed == 1


def test_wal_and_foreign_keys(store):
    mode = store._conn.execute("PRAGMA journal_mode").fetchone()[0]
    assert mode.lower() == "wal"
    fk = store._conn.execute("PRAGMA foreign_keys").fetchone()[0]
    assert fk == 1


@pytest.mark.skipif(os.name != "posix", reason="POSIX file modes only")
def test_database_files_are_owner_only(tmp_path):
    db = tmp_path / "private.db"
    store = Store(db)
    try:
        store.audit(actor="test", interface="test", action="test", subject="test")
        files = [db, Path(f"{db}-wal"), Path(f"{db}-shm")]
        assert all(path.stat().st_mode & 0o777 == 0o600 for path in files if path.exists())
    finally:
        store.close()


def test_migrations_execute_atomically(tmp_path, monkeypatch):
    from hermes_project_stewardship.persistence import migrations as migrations_module
    from hermes_project_stewardship.persistence.migrations import Migration

    db = tmp_path / "atomic.db"
    original = migrations_module.MIGRATIONS
    failing = Migration(
        version=max(item.version for item in original) + 1,
        name="atomic failure witness",
        upgrade_sql="CREATE TABLE must_rollback(id INTEGER); INVALID SQL;",
        downgrade_sql="DROP TABLE IF EXISTS must_rollback;",
    )
    monkeypatch.setattr(migrations_module, "MIGRATIONS", [*original, failing])
    monkeypatch.setattr("hermes_project_stewardship.persistence.store.MIGRATIONS", [*original, failing])

    with pytest.raises(sqlite3.DatabaseError):
        Store(db)

    conn = sqlite3.connect(db)
    try:
        row = conn.execute(
            "SELECT 1 FROM sqlite_master WHERE type='table' AND name='must_rollback'"
        ).fetchone()
        assert row is None
    finally:
        conn.close()


def test_cascade_delete_removes_children(tmp_path):
    s = Store(tmp_path / "c.db")
    c = s._conn
    c.execute(
        "INSERT INTO project_stewardship(project_id, enabled, created_at, updated_at)"
        " VALUES('x', 1, '2026-01-01', '2026-01-01')"
    )
    c.execute(
        "INSERT INTO project_objectives(project_id, name, evaluator_type, target)"
        " VALUES('x', 'o', 'manual', '>=1')"
    )
    with pytest.raises(sqlite3.IntegrityError):
        # orphan objective must be impossible
        c.execute(
            "INSERT INTO project_objectives(project_id, name, evaluator_type, target)"
            " VALUES('ghost', 'o', 'manual', '>=1')"
        )
    c.execute("DELETE FROM project_stewardship WHERE project_id='x'")
    left = c.execute("SELECT COUNT(*) AS n FROM project_objectives").fetchone()["n"]
    assert left == 0
    s.close()
