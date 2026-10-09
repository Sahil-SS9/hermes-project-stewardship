"""Schema v37: project content accepts MP4 and WebM videos up to 25 MB.

Sahil 05/10 (demo feedback g). SQLite cannot widen a CHECK in place, so v37
rebuilds project_content the way v24 did. Pinned here, on a database stopped
at v36 and then upgraded:
- every existing row comes through with every column unchanged;
- the index the screens sort by is still there;
- video rows up to 25 MB are accepted afterwards, and nothing larger;
- the media types the table accepts are still a closed list.
"""
from __future__ import annotations

import sqlite3

import pytest

from hermes_project_stewardship.persistence import migrations, store as store_module
from hermes_project_stewardship.persistence.service import StewardshipService
from hermes_project_stewardship.persistence.store import Store

ROW = ("CONTENT-OLD", "p1", "runbook.md", "abc/CONTENT-OLD.md", "text/markdown", 12, "a" * 64,
       "sahil", "2026-10-01T00:00:00+00:00", "2026-10-02T00:00:00+00:00", "sahil", "active", 7, 9, None, None)
COLUMNS = ("content_id, project_id, filename, stored_path, media_type, size_bytes, sha256, uploaded_by,"
           " uploaded_at, archived_at, archived_by, removal_state, file_dev, file_ino, removed_at, removed_by")


def _insert(conn, row):
    conn.execute(f"INSERT INTO project_content({COLUMNS}) VALUES({','.join('?' * len(row))})", row)


@pytest.fixture()
def upgraded(tmp_path, monkeypatch):
    path = tmp_path / "v36.db"
    with monkeypatch.context() as context:
        context.setattr(store_module, "MIGRATIONS", [m for m in migrations.MIGRATIONS if m.version <= 36])
        old = Store(path)
        assert old.schema_version == 36
        StewardshipService(old).enable("p1", mission="m", lead_profile="l", autonomy_level=2)
        with old.tx() as cx:
            _insert(cx, ROW)
        old.close()
    store = Store(path)
    yield store
    store.close()


def test_the_upgrade_keeps_every_row_and_column(upgraded):
    # Upgraded through v37 to the latest schema (later versions only add to it).
    assert upgraded.schema_version == migrations.SCHEMA_VERSION >= 37
    row = upgraded._conn.execute(f"SELECT {COLUMNS} FROM project_content").fetchone()
    assert tuple(row) == ROW
    indexes = {r[0] for r in upgraded._conn.execute(
        "SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='project_content'")}
    assert "idx_project_content_project_time" in indexes


def test_videos_up_to_25_mb_are_accepted_and_nothing_larger(upgraded):
    video = ("CONTENT-VID", "p1", "clip.mp4", "abc/CONTENT-VID.mp4", "video/mp4", 25 * 1024 * 1024, "b" * 64,
             "sahil", "2026-10-05T00:00:00+00:00", None, None, "active", 7, 10, None, None)
    with upgraded.tx() as cx:
        _insert(cx, video)
    for bad in [video[:4] + ("video/mp4", 25 * 1024 * 1024 + 1) + video[6:],
                video[:4] + ("video/quicktime", 10) + video[6:]]:
        with pytest.raises(sqlite3.IntegrityError):
            with upgraded.tx() as cx:
                _insert(cx, ("CONTENT-BAD",) + bad[1:])
