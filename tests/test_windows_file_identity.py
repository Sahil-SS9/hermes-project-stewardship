"""Managed content works with the file identities Windows reports.

Removal is bound to a file's identity (st_dev, st_ino), stored in SQLite
INTEGER columns, which hold signed 64-bit values. Windows reports identities
those columns cannot hold as-is: NTFS file references carry a sequence number
in the top bits (often >= 2**63), and from Python 3.12 ReFS / Dev Drive volumes
report 128-bit file ids. Stored raw, every upload and restore on Windows raised
``OverflowError: Python int too large to convert to SQLite INTEGER``.

These tests replay Windows-scale identities on any OS by widening every
os.stat/os.lstat/os.fstat result the same way, so a file keeps one consistent
(large) identity, exactly as on Windows.
"""
from __future__ import annotations

import os
import pathlib
from pathlib import Path

import pytest

from hermes_project_stewardship.persistence.backup import export_store, restore_store
from hermes_project_stewardship.persistence.service import StewardshipService
from hermes_project_stewardship.persistence.store import Store

_SEQUENCE = ("st_mode", "st_ino", "st_dev", "st_nlink", "st_uid", "st_gid", "st_size")


def _widened(result: os.stat_result, widen) -> os.stat_result:
    fields = list(result)
    fields[1] = widen(result.st_ino)
    fields[2] = widen(result.st_dev)
    extra = {
        name: getattr(result, name)
        for name in dir(result)
        if name.startswith("st_") and name not in _SEQUENCE
        and not callable(getattr(result, name))
    }
    return os.stat_result(fields, extra)


# NTFS: the top bit set (a file-reference sequence number >= 0x8000);
# ReFS / Dev Drive: an identity beyond 64 bits.
_WINDOWS_SCALES = {
    "ntfs-64bit": lambda value: value | (1 << 63),
    "refs-128bit": lambda value: value + (1 << 64),
}


@pytest.fixture(params=sorted(_WINDOWS_SCALES))
def windows_identities(request, monkeypatch):
    widen = _WINDOWS_SCALES[request.param]

    def wrap(real):
        def stat_with_windows_identity(*args, **kwargs):
            return _widened(real(*args, **kwargs), widen)
        return stat_with_windows_identity

    for name in ("stat", "lstat", "fstat"):
        wrapped = wrap(getattr(os, name))
        monkeypatch.setattr(os, name, wrapped)
        # Python 3.10's pathlib keeps its own reference to os.stat/os.lstat
        # (Path.stat goes through _NormalAccessor), so widen it there too;
        # 3.11+ calls os.stat directly.
        accessor = getattr(pathlib, "_NormalAccessor", None)
        if accessor is not None and hasattr(accessor, name):
            monkeypatch.setattr(accessor, name, staticmethod(wrapped))
    return request.param


def _service(path: Path) -> tuple[Store, StewardshipService]:
    store = Store(path)
    service = StewardshipService(store)
    service.enable("demo", mission="m", lead_profile="lead", member_profiles=[])
    return store, service


def test_upload_preview_and_removal_work_with_windows_file_identities(
    tmp_path: Path, windows_identities
):
    store, service = _service(tmp_path / "dockyard.db")
    try:
        assert os.stat(tmp_path).st_ino >= 1 << 63, "the probe must really be Windows-scale"
        first = service.upload_project_content(
            "demo", filename="runbook.md", media_type="text/markdown",
            content=b"# runbook\n", actor="sahil", interface="test",
        )
        second = service.upload_project_content(
            "demo", filename="notes.md", media_type="text/markdown",
            content=b"# notes\n", actor="sahil", interface="test",
        )
        rows = {
            row["content_id"]: (row["file_dev"], row["file_ino"])
            for row in store._conn.execute(
                "SELECT content_id, file_dev, file_ino FROM project_content")
        }
        assert all(-(1 << 63) <= v < (1 << 63) for pair in rows.values() for v in pair)
        assert rows[first["content_id"]] != rows[second["content_id"]], \
            "two files must keep two identities"

        removed = service.remove_project_content(
            "demo", first["content_id"], actor="sahil", interface="test")
        assert removed["removal_state"] == "file_removed"
        listing = service.project_content("demo")
        assert [item["content_id"] for item in listing] == [second["content_id"]]
    finally:
        store.close()


def test_restore_rebinds_windows_file_identities(tmp_path: Path, windows_identities):
    store, service = _service(tmp_path / "orig" / "dockyard.db")
    try:
        uploaded = service.upload_project_content(
            "demo", filename="runbook.md", media_type="text/markdown",
            content=b"# runbook\n", actor="sahil", interface="test",
        )
        export_store(store, tmp_path / "export")
    finally:
        store.close()
    restored_dir = tmp_path / "restored"
    restored_dir.mkdir()
    result = restore_store(tmp_path / "export", restored_dir / "dockyard.db")
    assert result["integrity_check"] == "ok"
    restored = Store(restored_dir / "dockyard.db")
    try:
        removed = StewardshipService(restored).remove_project_content(
            "demo", uploaded["content_id"], actor="sahil", interface="test")
        assert removed["removal_state"] == "file_removed"
    finally:
        restored.close()


def test_identity_mapping_keeps_posix_values_and_fits_every_windows_value():
    from hermes_project_stewardship.persistence.file_identity import sqlite_int64

    # Every value POSIX reports is below 2**63 and stays unchanged, so rows
    # written before this change still match without a migration.
    for value in (0, 1, 123_456_789, (1 << 63) - 1):
        assert sqlite_int64(value) == value
    # 64-bit Windows values map one-to-one onto the negative half.
    assert sqlite_int64(1 << 63) == -(1 << 63)
    assert sqlite_int64((1 << 64) - 1) == -1
    assert sqlite_int64((1 << 63) + 5) != sqlite_int64((1 << 63) + 6)
    # Wider (ReFS 128-bit) values fold to a stable signed 64-bit digest.
    wide = (1 << 64) + 987_654_321
    assert sqlite_int64(wide) == sqlite_int64(wide)
    assert sqlite_int64(wide) != sqlite_int64(wide + 1)
    for value in (1 << 63, (1 << 64) - 1, wide, (1 << 127) + 3):
        assert -(1 << 63) <= sqlite_int64(value) < (1 << 63)
