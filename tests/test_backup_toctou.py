"""R-B1 (3b blocker): export_store snapshot/manifest TOCTOU.

export_store snapshots the database (``store._conn.backup``) and then builds
the manifest's content list from the LIVE connection (``_content_records``).
A commit landing between the two steps splits the archive across two halves
of state: the manifest no longer matches the snapshot. ``restore_store``
requires an exact one-to-one manifest/DB match, so restore refuses — but
export has already returned success. The operator holds a "good" backup that
can never be restored.

Adapted from ``evidence/review-3b/octacon/probe_backup_toctou.py`` (validated
deterministic probe, single process, no threads): a sqlite authorizer fires
when ``_content_records`` executes its first read of ``project_content``; at
that boundary a second connection to the same WAL database commits the
concurrent change. The pytest version is RED on the unfixed tree (export
returns success, restore refuses) and GREEN after the fix (every export either
restores, or export itself fails loudly instead of lying).

Contract (owner decision, NOTES-FOR-3C-FIXES §4): every export either restores
or fails loudly; never "success" followed by "can't restore". Content rows are
read from the snapshot, not the live connection.
"""
from __future__ import annotations

import hashlib
import os
import sqlite3
import sys
import traceback
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))

from hermes_project_stewardship.persistence import backup as backup_mod  # noqa: E402
from hermes_project_stewardship.persistence.store import Store  # noqa: E402

_hook = {"armed": False, "fired": False, "variant": ""}
CONCURRENT_SHA = hashlib.sha256(b"b" * 64).hexdigest()


def _install_hook(store: Store, variant: str) -> None:
    """Fire a concurrent write exactly when _content_records first reads
    project_content — i.e. after the DB snapshot has been taken."""
    conn = store._conn
    db = str(store.db_path)

    def handler(action, arg1, arg2, dbname, source):
        if (action == sqlite3.SQLITE_READ and arg1 == "project_content"
                and _hook["armed"] and not _hook["fired"]):
            _hook["fired"] = True
            other = sqlite3.connect(db, timeout=5)
            try:
                other.execute("PRAGMA busy_timeout=5000")
                other.execute("BEGIN IMMEDIATE")
                if variant == "added":
                    other.execute(
                        "INSERT INTO project_content(content_id, project_id, filename,"
                        " stored_path, media_type, size_bytes, sha256, uploaded_by,"
                        " uploaded_at, file_dev, file_ino)"
                        " VALUES(?,?,?,?,?,?,?,?,?,?,?)",
                        ("CONTENT-CONCURRENT01", "proj-alpha", "concurrent.txt",
                         "sha256-proj-alpha-concurrent/concurrent.txt",
                         "text/plain", 64, CONCURRENT_SHA,
                         "ghost", "2026-10-09T00:00:00+00:00", 1, 2),
                    )
                elif variant == "removed":
                    other.execute("DELETE FROM project_content WHERE content_id='CONTENT-C1'")
                other.execute("COMMIT")
            finally:
                other.close()
        return sqlite3.SQLITE_OK

    conn.set_authorizer(handler)


def _make_store(tmp_path: Path) -> Store:
    path = tmp_path / "probe.db"
    for suffix in ("", "-wal", "-shm"):
        Path(f"{path}{suffix}").unlink(missing_ok=True)
    return Store(path)


def _seed(store: Store) -> None:
    with store.tx() as cx:
        cx.execute(
            "INSERT INTO project_stewardship(project_id, mission, enabled, created_at, updated_at)"
            " VALUES('proj-alpha', 'probe', 1, '2026-10-09T00:00:00+00:00',"
            " '2026-10-09T00:00:00+00:00')")
        cx.execute(
            "INSERT INTO project_content(content_id, project_id, filename, stored_path,"
            " media_type, size_bytes, sha256, uploaded_by, uploaded_at, file_dev, file_ino)"
            " VALUES(?,?,?,?,?,?,?,?,?,?,?)",
            ("CONTENT-C1", "proj-alpha", "c1.txt", "sha256-proj-alpha-c1/c1.txt",
             "text/plain", 64, "a" * 64, "tester",
             "2026-10-09T00:00:00+00:00", None, None),
        )


def _fix_content_files(store: Store) -> None:
    root = store.db_path.parent / "project-content"
    f1 = root / "sha256-proj-alpha-c1" / "c1.txt"
    f1.parent.mkdir(parents=True, exist_ok=True)
    f1.write_bytes(b"a" * 64)
    f2 = root / "sha256-proj-alpha-concurrent" / "concurrent.txt"
    f2.parent.mkdir(parents=True, exist_ok=True)
    f2.write_bytes(b"b" * 64)
    with store.tx() as cx:
        cx.execute("UPDATE project_content SET sha256=? WHERE content_id='CONTENT-C1'",
                   (hashlib.sha256(f1.read_bytes()).hexdigest(),))


def _run_case(tmp_path: Path, name: str, variant: str) -> dict:
    out: dict = {"case": name, "variant": variant or "none", "steps": []}
    global _hook
    store = _make_store(tmp_path)
    _seed(store)
    _fix_content_files(store)
    archive = tmp_path / f"archive-{name}"
    if variant:
        _install_hook(store, variant)
        _hook = {"armed": True, "fired": False, "variant": variant}
    try:
        manifest = backup_mod.export_store(store, archive)
        out["steps"].append({
            "step": "export_store",
            "result": "RETURNED SUCCESS (manifest produced)",
            "manifest_content_ids": [r["content_id"] for r in manifest.get("content", [])],
        })
    except Exception as exc:
        out["steps"].append({"step": "export_store",
                             "result": f"REFUSED: {type(exc).__name__}: {exc}"})
        return out
    _hook = {"armed": False, "fired": False, "variant": ""}

    # Read the SNAPSHOT inside the archive: which content ids persisted there?
    snap = archive / "dockyard.sqlite3"
    con = sqlite3.connect(f"file:{snap}?mode=ro", uri=True)
    snap_ids = [r[0] for r in con.execute(
        "SELECT content_id FROM project_content ORDER BY content_id").fetchall()]
    con.close()
    out["snapshot_content_ids"] = snap_ids

    restore_parent = tmp_path / f"restore-parent-{name}"
    restore_parent.mkdir(parents=True)
    target = restore_parent / f"restored-{name}.db"
    try:
        backup_mod.restore_store(archive, target)
        out["steps"].append({"step": "restore_store", "result": "OK"})
    except Exception as exc:
        out["steps"].append({"step": "restore_store",
                             "result": f"FAILED: {type(exc).__name__}: {exc}",
                             "traceback": traceback.format_exc(limit=3)})
    return out


def test_control_export_restores(tmp_path):
    out = _run_case(tmp_path, "control", "")
    assert out["steps"][-1]["result"] == "OK"


def test_race_added_export_is_never_silently_unrestorable(tmp_path):
    """A commit landing mid-export must not yield declared success that
    restore refuses. Either export fails loudly, or what export returns
    restores. (Unfixed: success + 'unexpected active record'.)"""
    out = _run_case(tmp_path, "race-added", "added")
    export_step = next(s for s in out["steps"] if s["step"] == "export_store")
    restore_step = out["steps"][-1]
    exported_ok = "RETURNED SUCCESS" in export_step["result"]
    restored_ok = restore_step["result"] == "OK"
    assert exported_ok == restored_ok, (
        "export declared success but the archive cannot be restored (R-B1)")

def test_race_removed_export_is_never_silently_unrestorable(tmp_path):
    """"Removal" variant: DB snapshot keeps the row the manifest omits.
    Same contract: success ⟺ restorable."""
    out = _run_case(tmp_path, "race-removed", "removed")
    export_step = next(s for s in out["steps"] if s["step"] == "export_store")
    restore_step = out["steps"][-1]
    exported_ok = "RETURNED SUCCESS" in export_step["result"]
    restored_ok = restore_step["result"] == "OK"
    assert exported_ok == restored_ok, (
        "export declared success but the archive cannot be restored (R-B1)")