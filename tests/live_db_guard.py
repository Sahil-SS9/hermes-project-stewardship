"""The live-database check that runs around every pytest session (tests/conftest.py).

Tests may never open the real Project Stewardship database: conftest refuses the connection.
As a second line, the session compares the real database before and after the run and
refuses a green result when it changed.

It compares rows, not file bytes, and leaves out the workflow timer's own rows. Since the
0.4.0 deploy the live timer (a host cron job, ``dockyard-workflow-timer``, every minute) writes
its heartbeat row ``workflows.tick`` and takes and drops a lease row
``workflows.tick_lease`` in ``dockyard_app_settings``. That is the live app writing, not a
test, yet it changed the bytes of the database and its -wal/-shm files every minute, so a
byte comparison refused every session longer than a minute (found 11/10/2026: one tick
changes that one row and nothing else). Every other row of every table, and the schema,
still count: any other change fails the session.
"""
from __future__ import annotations

import hashlib
import sqlite3
from pathlib import Path
from typing import Callable, Optional

# Rows the live workflow timer writes on every pass, even when it moves nothing.
TIMER_ROWS = ("workflows.tick", "workflows.tick_lease")
_SETTINGS = "dockyard_app_settings"


def _digest(rows) -> str:
    return hashlib.sha256("\n".join(sorted(repr(tuple(row)) for row in rows)).encode()).hexdigest()


def live_fingerprint(db: Path, connect: Callable[..., sqlite3.Connection] = sqlite3.connect
                     ) -> Optional[tuple]:
    """Content fingerprint of ``db`` without the timer's rows; None when there is no file.

    Opens the file read-only. ``connect`` is passed in by conftest, whose own
    ``sqlite3.connect`` refuses every path in the live Hermes home.
    """
    db = Path(db)
    if not db.exists():
        return None
    con = connect(f"{db.resolve().as_uri()}?mode=ro", uri=True)
    try:
        schema = con.execute("SELECT type, name, sql FROM sqlite_master").fetchall()
        result = [("<schema>", len(schema), _digest(schema))]
        for (table,) in con.execute(
                "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").fetchall():
            if table == _SETTINGS:
                marks = ",".join("?" for _ in TIMER_ROWS)
                rows = con.execute(
                    f'SELECT * FROM "{table}" WHERE key NOT IN ({marks})', TIMER_ROWS).fetchall()
            else:
                rows = con.execute(f'SELECT * FROM "{table}"').fetchall()
            result.append((table, len(rows), _digest(rows)))
        return tuple(result)
    finally:
        con.close()
