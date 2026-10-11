"""The session's live-database check ignores the workflow timer and nothing else.

See tests/live_db_guard.py for why it compares rows instead of file bytes.
"""
from __future__ import annotations

import hashlib
import json
import sqlite3
from pathlib import Path

import pytest

from .live_db_guard import TIMER_ROWS, live_fingerprint


@pytest.fixture()
def db(tmp_path: Path) -> Path:
    path = tmp_path / "dockyard.db"
    con = sqlite3.connect(path)
    con.execute("PRAGMA journal_mode=WAL")
    con.executescript("""
        CREATE TABLE dockyard_app_settings (key TEXT PRIMARY KEY, value_json TEXT NOT NULL,
                                            updated_at TEXT NOT NULL, updated_by TEXT NOT NULL);
        CREATE TABLE project_stewardship (project_id TEXT PRIMARY KEY, enabled INTEGER, phase TEXT);
        INSERT INTO project_stewardship VALUES ('demo', 1, 'active');
        INSERT INTO dockyard_app_settings VALUES ('dockyard.last_project', '{"project_id": "demo"}', 't0', 'sahil');
    """)
    con.commit()
    con.close()
    return path


def _write(path: Path, sql: str, *args) -> None:
    con = sqlite3.connect(path)
    con.execute(sql, args)
    con.commit()
    con.close()


def _tick(path: Path, at: str) -> None:
    """What one live timer pass writes: the heartbeat, and a lease taken and dropped."""
    for key in TIMER_ROWS:
        _write(path, "INSERT INTO dockyard_app_settings VALUES (?, ?, ?, 'timer')"
                     " ON CONFLICT(key) DO UPDATE SET value_json=excluded.value_json,"
                     " updated_at=excluded.updated_at", key, json.dumps({"at": at}), at)
    _write(path, "DELETE FROM dockyard_app_settings WHERE key='workflows.tick_lease'")


def _bytes(db: Path) -> str:
    """Hash of the database file and its -wal file as they sit on disk."""
    wal = db.with_name(db.name + "-wal")
    return hashlib.sha256(db.read_bytes() + (wal.read_bytes() if wal.exists() else b"")).hexdigest()


def test_timer_passes_change_the_bytes_but_not_the_fingerprint(db):
    before_bytes, before = _bytes(db), live_fingerprint(db)
    _tick(db, "2026-10-11T00:31:01+00:00")
    _tick(db, "2026-10-11T00:32:01+00:00")
    assert _bytes(db) != before_bytes  # why a byte comparison refused every long session
    assert live_fingerprint(db) == before


@pytest.mark.parametrize("change", [
    "UPDATE project_stewardship SET enabled=0 WHERE project_id='demo'",
    "INSERT INTO project_stewardship VALUES ('other', 1, 'active')",
    "DELETE FROM project_stewardship",
    "UPDATE dockyard_app_settings SET value_json='{}' WHERE key='dockyard.last_project'",
    "INSERT INTO dockyard_app_settings VALUES ('workflows.tick.extra', '{}', 't', 'x')",
    "ALTER TABLE project_stewardship ADD COLUMN archived_at TEXT",
    "CREATE TABLE stray (x INTEGER)",
])
def test_any_other_change_still_counts(db, change):
    before = live_fingerprint(db)
    _write(db, change)
    assert live_fingerprint(db) != before


def test_no_database_reads_as_none(tmp_path):
    assert live_fingerprint(tmp_path / "missing.db") is None


def test_reading_does_not_change_anything(db):
    first = live_fingerprint(db)
    assert live_fingerprint(db) == first
