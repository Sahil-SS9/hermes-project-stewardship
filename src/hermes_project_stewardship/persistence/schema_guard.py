"""Fail-closed schema check run every time a database is opened (P addendum fix 3).

A database is refused, before any migration runs, when:

* its migration ledger holds a version this code does not know;
* its ledger has a gap (it must be exactly 1..N);
* its schema differs from what this code builds for the same versions
  (normalised ``sqlite_master`` compared against an in-memory build);
* it has schema objects but no ledger at all.

Refusal raises :class:`SchemaDriftError`; nothing is written. Callers surface
it (the plugin shows its 503 operator message; the CLI prints it).
"""
from __future__ import annotations

import re
import sqlite3
from typing import Dict, List, Tuple

from .migrations import MIGRATIONS

# kanban_* tables are created by the reference kanban adapter
# (kanban/bridge.py ReferenceKanbanAdapter.SCHEMA), not by a migration. They may exist,
# but only with exactly the bridge's definition. A test pins this text to
# ReferenceKanbanAdapter.SCHEMA so the two cannot drift apart.
HOST_TABLE_DDL = """
    CREATE TABLE IF NOT EXISTS kanban_boards (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        project_id TEXT NOT NULL,
        slug       TEXT NOT NULL,
        created_at TEXT NOT NULL,
        UNIQUE(project_id, slug)
    );
    CREATE TABLE IF NOT EXISTS kanban_cards (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        board_id   INTEGER NOT NULL REFERENCES kanban_boards(id) ON DELETE CASCADE,
        title      TEXT NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        column_name TEXT NOT NULL DEFAULT 'todo',
        metadata_json TEXT NOT NULL DEFAULT '{}',
        created_at TEXT NOT NULL
    );
    """
HOST_TABLES = frozenset({"kanban_boards", "kanban_cards"})

Schema = Dict[Tuple[str, str], str]


class SchemaDriftError(RuntimeError):
    """The database does not match what this code builds; refused, untouched."""


def normalise(sql: str | None) -> str:
    """Collapse whitespace and identifier quoting (SQLite adds quotes on RENAME)."""
    text = re.sub(r"\s+", " ", sql or "").replace('"', "").strip()
    return re.sub(r"\s*([(),])\s*", r"\1", text)


def _schema(conn: sqlite3.Connection) -> Schema:
    return {
        (kind, name): normalise(sql)
        for kind, name, sql in conn.execute(
            "SELECT type, name, sql FROM sqlite_master "
            "WHERE name NOT LIKE 'sqlite_%' AND name != 'schema_migrations'"
        )
    }


def _host_schema() -> Schema:
    conn = sqlite3.connect(":memory:")
    try:
        conn.executescript(HOST_TABLE_DDL)
        return _schema(conn)
    finally:
        conn.close()


def expected_schema(versions: List[int]) -> Schema:
    """The schema this code builds by applying exactly ``versions`` in order."""
    known = {m.version: m for m in MIGRATIONS}
    conn = sqlite3.connect(":memory:")
    try:
        conn.execute("PRAGMA foreign_keys=OFF")
        for version in versions:
            conn.executescript(known[version].upgrade_sql)
        return _schema(conn)
    finally:
        conn.close()


def fail_closed(conn: sqlite3.Connection, *, has_ledger: bool = True) -> None:
    """Raise SchemaDriftError unless the database is a clean prefix of ours."""
    ledger = [int(row[0]) for row in conn.execute(
        "SELECT version FROM schema_migrations ORDER BY version")] if has_ledger else []
    actual = _schema(conn)
    host = _host_schema()
    for key in [k for k in actual if k[0] == "table" and k[1] in HOST_TABLES]:
        if actual.pop(key) != host[key]:
            raise SchemaDriftError(
                f"host table {key[1]} has an unexpected definition; refusing to open")
    if not ledger:
        if actual:
            names = sorted(name for _, name in actual)
            raise SchemaDriftError(
                "database has tables but no migration ledger; refusing to adopt "
                f"an unrecognised schema (e.g. {names[:5]})")
        return
    known = {m.version for m in MIGRATIONS}
    unknown = [v for v in ledger if v not in known]
    if unknown:
        raise SchemaDriftError(
            f"database ledger has migration version(s) {unknown} that this code "
            f"does not know (it knows 1..{max(known)}); it was migrated by "
            "different code. Refusing to open; use `stewardctl db repair` on a copy.")
    missing = sorted(set(range(1, ledger[-1] + 1)) - set(ledger))
    if missing:
        raise SchemaDriftError(
            f"database ledger has a gap: version(s) {missing} were never applied "
            f"below {ledger[-1]}. Refusing to open; use `stewardctl db repair` on a copy.")
    expected = expected_schema(ledger)
    only_db = sorted(set(actual) - set(expected))
    only_code = sorted(set(expected) - set(actual))
    differing = sorted(k for k in set(actual) & set(expected) if actual[k] != expected[k])
    if only_db or only_code or differing:
        parts = []
        if differing:
            parts.append(f"different definition: {[name for _, name in differing]}")
        if only_code:
            parts.append(f"missing: {[name for _, name in only_code]}")
        if only_db:
            parts.append(f"unexpected: {[name for _, name in only_db]}")
        raise SchemaDriftError(
            f"database schema at v{ledger[-1]} differs from what this code builds "
            f"for the same versions ({'; '.join(parts)}). Refusing to open; use "
            "`stewardctl db repair` on a copy.")
