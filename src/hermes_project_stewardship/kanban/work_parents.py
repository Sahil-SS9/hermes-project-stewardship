"""Parents of Dockyard work items, kept beside the Hermes boards.

Owner decision 4 = B (04/10/2026): a parent only groups work (an epic and its
tasks); it never blocks. A Hermes dependency link does block (the child waits
until the parent is done), so a parent is not stored as one. Upstream Hermes
has no parent field and the plugin never changes the host's schema, so parents
live in this small SQLite file under the kanban home. Every profile that
shares the boards shares the file.

Reads never create the file. Rows whose child task was later deleted are
inert: they are only read through a live child, and the host shows a parent
only while the parent task still exists.
"""
from __future__ import annotations

from contextlib import closing
from pathlib import Path
import sqlite3

_SCHEMA = (
    "CREATE TABLE IF NOT EXISTS work_parents ("
    " board TEXT NOT NULL,"
    " task_id TEXT NOT NULL,"
    " parent_id TEXT NOT NULL,"
    " PRIMARY KEY (board, task_id))"
)


class WorkParents:
    def __init__(self, path: str | Path) -> None:
        self.path = Path(path)

    def for_board(self, board: str) -> dict[str, str]:
        """Every stored parent on one board: {task_id: parent_id}."""
        if not self.path.is_file():
            return {}
        with closing(sqlite3.connect(self.path, timeout=30)) as conn:
            rows = conn.execute(
                "SELECT task_id, parent_id FROM work_parents WHERE board = ?", (board,)
            ).fetchall()
        return {str(task_id): str(parent_id) for task_id, parent_id in rows}

    def set(self, board: str, task_id: str, parent_id: str | None) -> None:
        """Replace the task's parent; None clears it."""
        self.path.parent.mkdir(parents=True, exist_ok=True)
        with closing(sqlite3.connect(self.path, timeout=30)) as conn, conn:
            conn.execute(_SCHEMA)
            if parent_id is None:
                conn.execute(
                    "DELETE FROM work_parents WHERE board = ? AND task_id = ?", (board, task_id)
                )
            else:
                conn.execute(
                    "INSERT INTO work_parents (board, task_id, parent_id) VALUES (?, ?, ?)"
                    " ON CONFLICT (board, task_id) DO UPDATE SET parent_id = excluded.parent_id",
                    (board, task_id, parent_id),
                )
