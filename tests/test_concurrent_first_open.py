"""Two surfaces opening an older database at once both come up (0.4.0 upgrade path).

``Store.migrate`` reads the ledger, then applies each pending migration in its own
``BEGIN IMMEDIATE`` transaction. When two processes open the same older database at
the same moment (the Desktop backend, the dashboard and the gateway can all start
together after an upgrade), both read the old version; the one that gets the write lock
second used to run the same migration again and fail ("duplicate column name"), so that
surface stayed broken until restarted. Found 11/10/2026 while sequencing the archive-fix
deploy. The data was never at risk: each migration commits whole or not at all.

The race is replayed deterministically: the second opener has already read the ledger
when the first one applies every pending migration.
"""
from __future__ import annotations

import sqlite3

import pytest

from hermes_project_stewardship.persistence import store as store_module
from hermes_project_stewardship.persistence.migrations import MIGRATIONS
from hermes_project_stewardship.persistence.store import Store

LATEST = max(m.version for m in MIGRATIONS)


def _older_database(path, monkeypatch, *, steps_behind: int) -> int:
    """A database migrated by an older binary (the last ``steps_behind`` migrations unknown)."""
    older = sorted(MIGRATIONS, key=lambda m: m.version)[:-steps_behind]
    with monkeypatch.context() as m:
        m.setattr(store_module, "MIGRATIONS", older)
        Store(path).close()
    return older[-1].version


def _ledger(path) -> list[int]:
    cx = sqlite3.connect(path)
    try:
        return [r[0] for r in cx.execute("SELECT version FROM schema_migrations ORDER BY version")]
    finally:
        cx.close()


@pytest.mark.parametrize("steps_behind", [1, 3])
def test_the_second_opener_comes_up_when_the_first_has_migrated(tmp_path, monkeypatch, steps_behind):
    path = tmp_path / "steward.db"
    start = _older_database(path, monkeypatch, steps_behind=steps_behind)
    assert _ledger(path)[-1] == start < LATEST

    original = Store._apply_migration
    raced = []

    def first_opener_wins(self, migration):
        # The second opener has read the ledger (``start``) and is about to take the write
        # lock for its first pending migration; the first opener gets there first and
        # applies everything.
        if not raced:
            raced.append(migration.version)
            Store(path).close()
        return original(self, migration)

    monkeypatch.setattr(Store, "_apply_migration", first_opener_wins)
    second = Store(path)  # used to raise sqlite3.OperationalError (duplicate column / table exists)
    try:
        assert raced == [start + 1]
        assert second.schema_version == LATEST
    finally:
        second.close()

    # Each migration recorded once, in order, and the database is whole.
    assert _ledger(path) == list(range(1, LATEST + 1))
    cx = sqlite3.connect(path)
    try:
        assert cx.execute("PRAGMA integrity_check").fetchone()[0] == "ok"
        assert cx.execute("PRAGMA foreign_key_check").fetchall() == []
    finally:
        cx.close()
    monkeypatch.undo()
    Store(path).close()  # and a later open is a plain no-op


def test_a_migration_already_applied_by_another_process_is_skipped(tmp_path):
    path = tmp_path / "steward.db"
    store = Store(path)
    try:
        newest = max(MIGRATIONS, key=lambda m: m.version)
        store._apply_migration(newest)  # as a second opener would, after the first committed it
        assert _ledger(path).count(newest.version) == 1
    finally:
        store.close()
