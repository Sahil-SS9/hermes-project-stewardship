"""P addendum fix 5: the repair tool, proven on copies only.

The snapshot test uses a copy of the evidence snapshot of Sahil's database
(skipped where the evidence file is absent, e.g. CI). The other tests build
small databases in tmp_path to prove the tool fails loudly instead of losing data.
"""
from __future__ import annotations

import hashlib
import json
import os
import shutil
import sqlite3
import subprocess
import sys
from pathlib import Path

import pytest

from hermes_project_stewardship.persistence import migrations
from hermes_project_stewardship.persistence.repair import RepairError, repair_database
from hermes_project_stewardship.persistence.schema_guard import SchemaDriftError
from hermes_project_stewardship.persistence.store import Store

# HPS_LIVE_SNAPSHOT: a COPY of a real schema-v33 database (the maintainer's
# is a private evidence snapshot). Unset, the snapshot tests skip.
_SNAPSHOT_ENV = os.environ.get("HPS_LIVE_SNAPSHOT", "").strip()
SNAPSHOT = Path(_SNAPSHOT_ENV).expanduser() if _SNAPSHOT_ENV else None

EXPECTED_ROWS = {
    "dockyard_a2a_messages": 2, "dockyard_backlog": 2, "dockyard_bot_groups": 1,
    "dockyard_bots": 3, "dockyard_group_members": 2, "dockyard_reports": 5,
    "dockyard_saved_views": 3, "dockyard_work_items": 18, "dockyard_workflows": 1,
    "initiative_suppression": 1, "notifications": 2, "project_content": 2,
    "project_initiatives": 2, "project_stewardship": 2, "stewardship_audit_log": 38,
}


def _sha(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def _counts(path: Path) -> dict:
    cx = sqlite3.connect(f"{path.as_uri()}?mode=ro", uri=True)
    try:
        names = [r[0] for r in cx.execute(
            "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
            " AND name != 'schema_migrations'")]
        return {n: cx.execute(f'SELECT count(*) FROM "{n}"').fetchone()[0] for n in names}
    finally:
        cx.close()


@pytest.fixture
def snapshot_copy(tmp_path):
    if SNAPSHOT is None or not SNAPSHOT.is_file():
        pytest.skip(f"set HPS_LIVE_SNAPSHOT to a copy of a real v33 database (now: {SNAPSHOT})")
    copy = tmp_path / "snapshot-copy.db"
    shutil.copy2(SNAPSHOT, copy)
    return copy


def test_snapshot_is_refused_before_repair(snapshot_copy):
    before = _sha(snapshot_copy)
    with pytest.raises(SchemaDriftError):
        Store(snapshot_copy)
    assert _sha(snapshot_copy) == before


def test_repair_snapshot_copy_keeps_every_row_and_opens(snapshot_copy, tmp_path):
    source_before = _sha(snapshot_copy)
    target = tmp_path / "repaired.db"
    report = repair_database(snapshot_copy, target, tmp_path / "backup")

    assert _sha(snapshot_copy) == source_before, "repair must never write the source"
    assert Path(report.backup).is_file() and _counts(Path(report.backup)) == _counts(snapshot_copy)
    assert report.ok and report.integrity_check == "ok" and report.foreign_key_violations == 0
    nonempty = {t: n for t, n in report.source_rows.items() if n}
    assert nonempty == EXPECTED_ROWS
    assert report.target_rows == report.source_rows
    assert {t: n for t, n in _counts(target).items() if n} == EXPECTED_ROWS

    repaired = Store(target)  # merged code opens it, fail-closed check passes
    try:
        assert repaired.schema_version == migrations.SCHEMA_VERSION
        repaired._conn.execute(
            "INSERT INTO dockyard_work_items (project_id, ref, type, title, created_at, updated_at)"
            " SELECT project_id, 'REPAIR-FEATURE', 'feature', 'f', 'x', 'x' FROM project_stewardship LIMIT 1")
        assert repaired._conn.execute(
            "SELECT count(*) FROM dockyard_global_workflows").fetchone()[0] == 0
    finally:
        repaired.close()


def test_repair_refuses_existing_target_and_same_file(snapshot_copy, tmp_path):
    taken = tmp_path / "taken.db"
    taken.write_bytes(b"keep me")
    with pytest.raises(RepairError, match="already exists"):
        repair_database(snapshot_copy, taken, tmp_path / "b1")
    assert taken.read_bytes() == b"keep me"
    with pytest.raises(RepairError, match="not the source"):
        repair_database(snapshot_copy, snapshot_copy, tmp_path / "b2")


def _store_with_extra(tmp_path: Path, sql: str) -> Path:
    db = tmp_path / "src.db"
    Store(db).close()
    cx = sqlite3.connect(db)
    cx.executescript(sql)
    cx.commit()
    cx.close()
    return db


def test_repair_fails_loudly_on_unknown_table_with_rows(tmp_path):
    src = _store_with_extra(tmp_path, "CREATE TABLE stray (x); INSERT INTO stray VALUES (1);")
    target = tmp_path / "out.db"
    with pytest.raises(RepairError, match="stray has 1 row"):
        repair_database(src, target, tmp_path / "backup")
    assert not target.exists(), "a failed repair leaves no half-built target"


def test_repair_fails_loudly_on_dropped_column_with_data(tmp_path):
    src = _store_with_extra(tmp_path, """
        INSERT INTO project_stewardship (project_id, created_at, updated_at) VALUES ('p', 'x', 'x');
        ALTER TABLE project_stewardship ADD COLUMN legacy_note TEXT;
        UPDATE project_stewardship SET legacy_note = 'precious';
    """)
    target = tmp_path / "out.db"
    with pytest.raises(RepairError, match="legacy_note holds data"):
        repair_database(src, target, tmp_path / "backup")
    assert not target.exists()


def test_stewardctl_db_repair_cli(snapshot_copy, tmp_path):
    report_path = tmp_path / "report.json"
    env = dict(os.environ)
    env.pop("STEWARD_DB_PATH", None)
    env.pop("DOCKYARD_PLUGIN_DB", None)
    result = subprocess.run(
        [sys.executable, "-m", "hermes_project_stewardship.cli.app", "db", "repair",
         "--db-source", str(snapshot_copy), "--db-target", str(tmp_path / "cli.db"),
         "--backup-dir", str(tmp_path / "backup"), "--report", str(report_path)],
        env=env, capture_output=True, text=True, timeout=180)
    assert result.returncode == 0, result.stderr[-2000:]
    report = json.loads(report_path.read_text())
    assert report["ok"] is True
    assert {t: n for t, n in report["target_rows"].items() if n} == EXPECTED_ROWS
