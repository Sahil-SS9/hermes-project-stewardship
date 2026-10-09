"""Consistent, versioned Project Stewardship database export and isolated restore."""
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


def _safe_relative(value: str, *, label: str) -> Path:
    relative = Path(value)
    if (
        not value or relative.is_absolute() or not relative.parts
        or any(part in {"", ".", ".."} for part in relative.parts)
    ):
        raise BackupError(f"{label} must be a contained relative path")
    return relative


def _safe_file(root: Path, relative: str, *, label: str) -> Path:
    rel = _safe_relative(relative, label=label)
    current = root
    for part in rel.parts:
        current = current / part
        if current.is_symlink():
            raise BackupError(f"{label} must not contain symlinks")
    candidate = (root / rel).resolve()
    try:
        candidate.relative_to(root.resolve())
    except ValueError:
        raise BackupError(f"{label} escapes its root") from None
    if not candidate.is_file() or candidate.is_symlink():
        raise BackupError(f"{label} is missing or not a regular file")
    return candidate


def _content_records(
    rows_reader, source_root: Path, destination_root: Path
) -> list[dict[str, Any]]:
    """Build manifest content records from given ``project_content`` rows.

    R-B1 (3b): the rows MUST come from the export's database snapshot, not the
    live connection. The snapshot (``store._conn.backup``) and the manifest are
    two halves of one archive; reading either half from a different point in
    time splits the archive and makes a "successful" export unrestorable.
    ``rows_reader`` is a callable returning the rows so the snapshot connection
    can be the source while it is still open.
    """
    rows = rows_reader()
    records = []
    for row in rows:
        if row["removal_state"] != "active":
            continue
        source = _safe_file(source_root, str(row["stored_path"]), label="managed content path")
        digest = _sha256(source)
        if source.stat().st_size != int(row["size_bytes"]) or digest != row["sha256"]:
            raise BackupError(f"managed content integrity mismatch for {row['content_id']}")
        target = destination_root / _safe_relative(str(row["stored_path"]), label="managed content path")
        target.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
        shutil.copyfile(source, target)
        if target.stat().st_size != int(row["size_bytes"]) or _sha256(target) != digest:
            raise BackupError(f"managed content archive verification failed for {row['content_id']}")
        records.append({
            "content_id": row["content_id"], "project_id": row["project_id"],
            "path": str(row["stored_path"]), "bytes": int(row["size_bytes"]),
            "sha256": digest, "removal_state": "active",
        })
    return records


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
            target.row_factory = sqlite3.Row

            # R-B1: content rows come from the SNAPSHOT, at the same point in
            # time as the archived database. A commit landing after .backup()
            # lands in the NEXT export instead, so manifest and snapshot can
            # no longer disagree and a successful export always restores.
            def snapshot_rows() -> list:
                return target.execute(
                    "SELECT content_id, project_id, stored_path, size_bytes, sha256,"
                    " removal_state FROM project_content ORDER BY content_id"
                ).fetchall()

            content_records = _content_records(
                snapshot_rows,
                store.db_path.parent / "project-content", temporary / "content",
            )
        finally:
            target.close()
        os.chmod(database, 0o600)
        manifest = {
            "manifest_version": 2,
            "created_at": iso(store._clock()),
            "schema_version": int(schema_row[0]),
            "database": {
                "path": "dockyard.sqlite3",
                "bytes": database.stat().st_size,
                "sha256": _sha256(database),
                "integrity_check": "ok",
            },
            "content": content_records,
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


def _restore_content(
    connection: sqlite3.Connection, archive_root: Path, target_root: Path,
    records: list[dict[str, Any]],
) -> None:
    if target_root.exists() or target_root.is_symlink():
        raise BackupError("content restore target already exists")
    if not isinstance(records, list):
        raise BackupError("content manifest is invalid")
    active_rows = connection.execute(
        "SELECT content_id FROM project_content WHERE removal_state='active'"
    ).fetchall()
    active_ids = {str(row["content_id"]) for row in active_rows}
    manifest_ids: list[str] = []
    for record in records:
        if not isinstance(record, dict) or record.get("removal_state") != "active":
            raise BackupError("content manifest contains a non-active record")
        content_id = record.get("content_id")
        if not isinstance(content_id, str):
            raise BackupError("content manifest content_id is invalid")
        if content_id in manifest_ids:
            raise BackupError(f"duplicate content ID in manifest: {content_id}")
        manifest_ids.append(content_id)
    manifest_id_set = set(manifest_ids)
    if manifest_id_set != active_ids:
        missing = active_ids - manifest_id_set
        if missing:
            raise BackupError("content manifest does not exactly one-to-one match active records: omitted entry")
        raise BackupError("content manifest contains unexpected active record")
    target_root.mkdir(mode=0o700)
    try:
        for record in records:
            if not isinstance(record, dict) or record.get("removal_state") != "active":
                raise BackupError("content manifest contains a non-active record")
            content_id = record.get("content_id")
            row = connection.execute(
                "SELECT project_id, stored_path, size_bytes, sha256, removal_state "
                "FROM project_content WHERE content_id=?", (content_id,)
            ).fetchone()
            if row is None or row["removal_state"] != "active":
                raise BackupError(f"content record is missing or not active: {content_id}")
            if (
                row["project_id"] != record.get("project_id")
                or row["stored_path"] != record.get("path")
                or int(row["size_bytes"]) != int(record.get("bytes", -1))
                or row["sha256"] != record.get("sha256")
            ):
                raise BackupError(f"content manifest does not match database: {content_id}")
            source = _safe_file(archive_root / "content", str(record["path"]), label="archived content path")
            if source.stat().st_size != int(record["bytes"]) or _sha256(source) != record["sha256"]:
                raise BackupError(f"archived content integrity mismatch: {content_id}")
            destination = target_root / _safe_relative(str(record["path"]), label="restored content path")
            destination.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
            shutil.copyfile(source, destination)
            identity = destination.stat()
            connection.execute(
                "UPDATE project_content SET file_dev=?, file_ino=? WHERE content_id=?",
                (int(identity.st_dev), int(identity.st_ino), content_id),
            )
        connection.commit()
    except Exception:
        connection.rollback()
        shutil.rmtree(target_root, ignore_errors=True)
        raise


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
    if manifest.get("manifest_version") not in (1, 2):
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
    content_root = destination.parent / "project-content"
    content_root_created = False
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
        if int(manifest.get("manifest_version", 1)) >= 2:
            writable = sqlite3.connect(str(temporary))
            writable.row_factory = sqlite3.Row
            try:
                _restore_content(
                    writable, archive_path, content_root,
                    manifest.get("content", []),
                )
                content_root_created = True
            finally:
                writable.close()
        os.replace(temporary, destination)
        target_sha256 = _sha256(destination)
        return {
            "target": str(destination),
            "sha256": target_sha256,
            "source_snapshot_sha256": actual,
            "schema_version": int(schema),
            "integrity_check": "ok",
        }
    except Exception:
        try:
            temporary.unlink(missing_ok=True)
        except OSError:
            pass
        if content_root_created and content_root.is_dir() and not content_root.is_symlink():
            shutil.rmtree(content_root)
        raise
