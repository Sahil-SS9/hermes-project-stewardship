"""Rebuild a damaged Dockyard database into this code's schema (P addendum fix 5).

``stewardctl db repair --db-source SRC --db-target NEW --backup-dir DIR``

1. Backs up ``SRC`` with SQLite's backup API (``SRC`` is opened read-only).
2. Builds a fresh database at ``NEW`` (must not exist) at the current schema.
3. Copies every row, table by table, matching columns by name. Columns the
   source lacks get the schema default (or NULL when nullable).
4. Fails loudly, writing nothing, if any row cannot be copied faithfully:
   a source column with data that the new schema has no place for, a new
   NOT NULL column with no default while the table has rows, a source table
   the new schema does not have while it has rows, or any constraint error.
5. Checks per-table row counts, ``integrity_check`` and ``foreign_key_check``,
   then reopens ``NEW`` through ``Store`` so the fail-closed check must pass.
6. Writes a JSON report.

It never writes to ``SRC``. On failure the half-built target is removed so a
failed attempt can never be mistaken for a repaired database.
"""
from __future__ import annotations

import json
import sqlite3
import sys
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List

from .migrations import SCHEMA_VERSION
from .schema_guard import HOST_TABLE_DDL, HOST_TABLES
from .store import Store

_NOT_COPIED = {"schema_migrations", "sqlite_sequence"}


class RepairError(RuntimeError):
    """The repair could not copy every row faithfully; nothing was kept."""


@dataclass
class RepairReport:
    source: str
    backup: str
    target: str
    schema_version: int
    source_rows: Dict[str, int] = field(default_factory=dict)
    target_rows: Dict[str, int] = field(default_factory=dict)
    defaulted_columns: Dict[str, List[str]] = field(default_factory=dict)
    dropped_empty_columns: Dict[str, List[str]] = field(default_factory=dict)
    dropped_empty_tables: List[str] = field(default_factory=list)
    integrity_check: str = ""
    foreign_key_violations: int = 0
    reopened_by_store: bool = False
    created_at: str = ""

    @property
    def ok(self) -> bool:
        return (self.integrity_check == "ok" and self.foreign_key_violations == 0
                and self.reopened_by_store
                and all(self.target_rows.get(t) == n for t, n in self.source_rows.items()))

    def as_json(self) -> str:
        return json.dumps({**asdict(self), "ok": self.ok}, sort_keys=True, indent=2)


def _ro(path: Path) -> sqlite3.Connection:
    return sqlite3.connect(f"{path.as_uri()}?mode=ro", uri=True)


def _quote(name: str) -> str:
    return '"' + name.replace('"', '""') + '"'


def _columns(conn: sqlite3.Connection, table: str) -> list:
    return conn.execute(f"PRAGMA table_info({_quote(table)})").fetchall()


def repair_database(source, target, backup_dir) -> RepairReport:
    source = Path(source).expanduser().resolve()
    target = Path(target).expanduser().resolve()
    backup_dir = Path(backup_dir).expanduser().resolve()
    if not source.is_file():
        raise RepairError(f"source database {source} does not exist")
    if target == source:
        raise RepairError("target must be a new file, not the source")
    if target.exists() or Path(f"{target}-wal").exists():
        raise RepairError(f"target {target} already exists; choose an unused path")
    backup_dir.mkdir(parents=True, exist_ok=True, mode=0o700)
    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    backup = backup_dir / f"{source.stem}.pre-repair-{stamp}.db"
    if backup.exists():
        raise RepairError(f"backup {backup} already exists")

    src = _ro(source)
    try:
        out = sqlite3.connect(backup)
        try:
            src.backup(out)
        finally:
            out.close()
    finally:
        src.close()
    backup.chmod(0o600)

    report = RepairReport(str(source), str(backup), str(target), SCHEMA_VERSION)
    try:
        target.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
        Store(target).close()  # fresh, fully migrated, empty
        _copy(backup, target, report)
        Store(target).close()  # fail-closed check must accept the result
        report.reopened_by_store = True
    except BaseException:
        for leftover in (target, Path(f"{target}-wal"), Path(f"{target}-shm")):
            leftover.unlink(missing_ok=True)
        raise
    report.created_at = datetime.now(timezone.utc).isoformat()
    if not report.ok:
        raise RepairError(f"repair verification failed: {report.as_json()}")
    return report


def _copy(backup: Path, target: Path, report: RepairReport) -> None:
    src = _ro(backup)
    dst = sqlite3.connect(target, isolation_level=None)
    try:
        dst.executescript(HOST_TABLE_DDL)
        dst.execute("PRAGMA foreign_keys=OFF")
        dst.execute("BEGIN IMMEDIATE")
        try:
            dst_tables = {r[0] for r in dst.execute(
                "SELECT name FROM sqlite_master WHERE type='table'")}
            src_tables = sorted(r[0] for r in src.execute(
                "SELECT name FROM sqlite_master WHERE type='table'") if r[0] not in _NOT_COPIED)
            for table in src_tables:
                rows = src.execute(f"SELECT count(*) FROM {_quote(table)}").fetchone()[0]
                report.source_rows[table] = rows
                if table not in dst_tables:
                    if rows:
                        raise RepairError(
                            f"table {table} has {rows} row(s) but does not exist in "
                            "the current schema; refusing to drop data")
                    report.dropped_empty_tables.append(table)
                    del report.source_rows[table]
                    continue
                _copy_table(src, dst, table, rows, report)
            for table, expected in report.source_rows.items():
                got = dst.execute(f"SELECT count(*) FROM {_quote(table)}").fetchone()[0]
                report.target_rows[table] = got
                if got != expected:
                    raise RepairError(f"table {table}: copied {got} of {expected} rows")
            report.foreign_key_violations = len(dst.execute("PRAGMA foreign_key_check").fetchall())
            if report.foreign_key_violations:
                raise RepairError(
                    f"{report.foreign_key_violations} foreign key violation(s) after copy")
            dst.execute("COMMIT")
        except BaseException:
            dst.execute("ROLLBACK")
            raise
        report.integrity_check = dst.execute("PRAGMA integrity_check").fetchone()[0]
    finally:
        dst.execute("PRAGMA foreign_keys=ON")
        dst.close()
        src.close()


def _copy_table(src, dst, table: str, rows: int, report: RepairReport) -> None:
    src_cols = [c[1] for c in _columns(src, table)]
    dst_info = _columns(dst, table)
    dst_cols = [c[1] for c in dst_info]
    for column in [c for c in src_cols if c not in dst_cols]:
        used = src.execute(
            f"SELECT count(*) FROM {_quote(table)} WHERE {_quote(column)} IS NOT NULL"
        ).fetchone()[0]
        if used:
            raise RepairError(
                f"table {table}: column {column} holds data in {used} row(s) but the "
                "current schema has no such column; refusing to drop data")
        report.dropped_empty_columns.setdefault(table, []).append(column)
    shared = [c for c in dst_cols if c in src_cols]
    for _cid, name, _type, notnull, default, _pk in dst_info:
        if name in shared:
            continue
        if notnull and default is None and rows:
            raise RepairError(
                f"table {table}: new column {name} is NOT NULL with no default and "
                f"{rows} existing row(s) have no value for it; refusing to invent one")
        report.defaulted_columns.setdefault(table, []).append(name)
    if not rows:
        return
    cols = ", ".join(_quote(c) for c in shared)
    marks = ", ".join("?" for _ in shared)
    insert = f"INSERT INTO {_quote(table)} ({cols}) VALUES ({marks})"
    for number, row in enumerate(src.execute(f"SELECT {cols} FROM {_quote(table)}"), 1):
        try:
            dst.execute(insert, row)
        except sqlite3.Error as exc:
            raise RepairError(f"table {table}: row {number} could not be copied: {exc}") from exc


def run_cli(args) -> int:
    """``stewardctl db repair`` entry point. Exit 0 only on a verified repair."""
    report = repair_database(args.db_source, args.db_target, args.backup_dir)
    text = report.as_json()
    report_path = Path(args.report) if args.report else Path(args.backup_dir) / (
        Path(args.db_target).stem + ".repair-report.json")
    report_path.write_text(text + "\n")
    print(text)
    print(f"report written to {report_path}", file=sys.stderr)
    return 0


__all__ = ["RepairError", "RepairReport", "repair_database", "run_cli", "HOST_TABLES"]
