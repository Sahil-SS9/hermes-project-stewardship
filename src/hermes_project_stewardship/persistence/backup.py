"""Consistent, versioned Dockyard database export and isolated restore."""
from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path
import shutil
import sqlite3
from typing import Any
from uuid import uuid4

from .store import Store, iso


class BackupError(RuntimeError):
    pass


def _sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _safe_new_path(path: Path, *, kind: str) -> Path:
    candidate = path.expanduser().absolute()
    if candidate.exists() or candidate.is_symlink():
        raise BackupError(f"{kind} path already exists")
    parent = candidate.parent
    if not parent.is_dir() or parent.is_symlink():
        raise BackupError(f"{kind} parent must be a real directory")
    return candidate


def export_store(store: Store, archive: Path) -> dict[str, Any]:
    destination = _safe_new_path(archive, kind="archive")
    temporary = destination.with_name(f".{destination.name}.tmp-{uuid4().hex}")
    temporary.mkdir(mode=0o700)
    database = temporary / "dockyard.sqlite3"
    manifest_path = temporary / "manifest.json"
    try:
        target = sqlite3.connect(str(database))
        try:
            store._conn.backup(target)
            integrity = target.execute("PRAGMA integrity_check").fetchone()[0]
            if integrity != "ok":
                raise BackupError("exported database failed integrity check")
            schema_row = target.execute(
                "SELECT COALESCE(MAX(version),0) FROM schema_migrations"
            ).fetchone()
        finally:
            target.close()
        os.chmod(database, 0o600)
        manifest = {
            "manifest_version": 1,
            "created_at": iso(store._clock()),
            "schema_version": int(schema_row[0]),
            "database": {
                "path": "dockyard.sqlite3",
                "bytes": database.stat().st_size,
                "sha256": _sha256(database),
                "integrity_check": "ok",
            },
        }
        fd = os.open(
            manifest_path,
            os.O_WRONLY | os.O_CREAT | os.O_EXCL | getattr(os, "O_NOFOLLOW", 0),
            0o600,
        )
        with os.fdopen(fd, "w", encoding="utf-8") as handle:
            json.dump(manifest, handle, sort_keys=True, indent=2)
            handle.write("\n")
            handle.flush()
            os.fsync(handle.fileno())
        temporary.rename(destination)
        return manifest
    except Exception:
        if temporary.is_dir() and not temporary.is_symlink():
            shutil.rmtree(temporary)
        raise


def _snapshot_path(archive: Path, manifest: dict[str, Any]) -> Path:
    database = manifest.get("database")
    if not isinstance(database, dict):
        raise BackupError("manifest database record is missing")
    relative = database.get("path")
    if not isinstance(relative, str):
        raise BackupError("database path must be relative")
    rel_path = Path(relative)
    if rel_path.is_absolute() or not rel_path.parts or ".." in rel_path.parts:
        raise BackupError("database path must be a contained relative path")
    root = archive.resolve()
    lexical = root / rel_path
    current = root
    for part in rel_path.parts:
        current = current / part
        if current.is_symlink():
            raise BackupError("database path must not contain symlinks")
    candidate = lexical.resolve()
    try:
        candidate.relative_to(root)
    except ValueError:
        raise BackupError("database path escapes the archive") from None
    if not candidate.is_file():
        raise BackupError("database snapshot is missing")
    return candidate


def restore_store(archive: Path, target: Path) -> dict[str, Any]:
    archive_path = archive.expanduser().absolute()
    if archive_path.is_symlink() or not archive_path.is_dir():
        raise BackupError("archive must be a real directory")
    manifest_path = archive_path / "manifest.json"
    if manifest_path.is_symlink() or not manifest_path.is_file():
        raise BackupError("manifest is missing")
    try:
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        raise BackupError("manifest is invalid") from None
    if manifest.get("manifest_version") != 1:
        raise BackupError("manifest version is unsupported")
    snapshot = _snapshot_path(archive_path, manifest)
    expected = manifest["database"].get("sha256")
    actual = _sha256(snapshot)
    if not isinstance(expected, str) or actual != expected:
        raise BackupError("database checksum mismatch")
    if snapshot.stat().st_size != manifest["database"].get("bytes"):
        raise BackupError("database size mismatch")

    destination = _safe_new_path(target, kind="restore target")
    temporary = destination.with_name(f".{destination.name}.tmp-{uuid4().hex}")
    fd = os.open(
        temporary,
        os.O_WRONLY | os.O_CREAT | os.O_EXCL | getattr(os, "O_NOFOLLOW", 0),
        0o600,
    )
    try:
        with snapshot.open("rb") as source, os.fdopen(fd, "wb") as output:
            shutil.copyfileobj(source, output)
            output.flush()
            os.fsync(output.fileno())
        connection = sqlite3.connect(f"file:{temporary}?mode=ro", uri=True)
        try:
            integrity = connection.execute("PRAGMA integrity_check").fetchone()[0]
            schema = connection.execute(
                "SELECT COALESCE(MAX(version),0) FROM schema_migrations"
            ).fetchone()[0]
        finally:
            connection.close()
        if integrity != "ok":
            raise BackupError("restored database failed integrity check")
        if int(schema) != int(manifest.get("schema_version", -1)):
            raise BackupError("restored database schema version mismatch")
        os.replace(temporary, destination)
        return {
            "target": str(destination),
            "sha256": actual,
            "schema_version": int(schema),
            "integrity_check": "ok",
        }
    except Exception:
        try:
            temporary.unlink(missing_ok=True)
        except OSError:
            pass
        raise
