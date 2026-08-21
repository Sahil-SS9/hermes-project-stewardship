"""Store internals: migrations, mutex, idempotency keys, retention."""

from __future__ import annotations

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


def test_cascade_delete_removes_children(tmp_path):
    s = Store(tmp_path / "c.db")
    svc = None  # keep this test service-free; raw inserts
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
