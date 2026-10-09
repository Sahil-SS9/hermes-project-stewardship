"""Give a bot its project's memory (checks round 1; Sahil 08/10 pick 1b = A).

Registered as Hermes' ``pre_llm_call`` hook by ``plugin.register``. For each turn it
works out whether the bot is working on a Dockyard project and, if so, returns that
project's memory (``memory_service.context_for``). Hermes adds the text to that
turn's user message only; it is not saved in the transcript, and the bot's own
memory provider is never touched.

A bot is working on a project when it is a Kanban worker on the project's board:
the dispatcher sets ``HERMES_KANBAN_TASK`` and ``HERMES_KANBAN_BOARD``, and the board
maps to exactly one Hermes project in the owner's projects list, which is the
Dockyard project by id or slug - the same resolution as
``KanbanAdapter.project_board``. Nothing is guessed: an unbound board, a board
shared by two projects or a project that is switched off gives nothing.

Safety:
* never creates, writes or migrates a database: read-only connections only, and a
  schema older than v38 is skipped rather than upgraded;
* never raises: any error means no memory for this turn (logged at debug);
* cheap when there is nothing to do: a turn that is not a worker's opens no file.
"""
from __future__ import annotations

import logging
import os
import sqlite3
from contextlib import closing
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

from .persistence.memory_service import context_for
from .runtime import locate_shared_db

logger = logging.getLogger(__name__)

MIN_SCHEMA = 38  # project memory


def reset_cache() -> None:
    """Forget per-process lookups (tests; a long-lived process never needs it)."""


def project_memory_hook(**kwargs: Any) -> Optional[Dict[str, str]]:
    """``pre_llm_call``: ``{"context": memory}`` for a bot on a project, else ``None``."""
    try:
        return _hook(**kwargs)
    except Exception:  # a memory problem must never break a bot's turn
        logger.debug("Dockyard project memory skipped for this turn", exc_info=True)
        return None


def _hook(**_kwargs: Any) -> Optional[Dict[str, str]]:
    task = os.environ.get("HERMES_KANBAN_TASK", "").strip()
    board = os.environ.get("HERMES_KANBAN_BOARD", "").strip()
    if not (task and board):
        return None
    db = locate_shared_db()
    if db is None or not db.is_file():
        return None
    with closing(_read_only(db)) as conn:
        if _schema_version(conn) < MIN_SCHEMA:
            return None
        project = _project_for_turn(conn, db, board=board)
        if project is None:
            return None
        text = context_for(conn, project)
    return {"context": text} if text else None


def _read_only(path: Path) -> sqlite3.Connection:
    conn = sqlite3.connect(path.as_uri() + "?mode=ro", uri=True, timeout=2)
    conn.row_factory = sqlite3.Row
    return conn


def _schema_version(conn: sqlite3.Connection) -> int:
    try:
        row = conn.execute("SELECT max(version) FROM schema_migrations").fetchone()
    except sqlite3.OperationalError:
        return 0
    return int(row[0] or 0)


def _owner_home(db: Path) -> Path:
    """The Hermes home that owns Dockyard's database (its projects list sits beside it)."""
    if db.parent.name == "hermes-dockyard" and db.parent.parent.name == "plugin-data":
        return db.parent.parent.parent
    home = Path(os.environ.get("HERMES_HOME") or Path.home() / ".hermes").expanduser().resolve()
    return home.parent.parent if home.parent.name == "profiles" else home


def _hermes_projects_for_board(home: Path, board: str) -> List[Tuple[str, str]]:
    path = home / "projects.db"
    if not path.is_file():
        return []
    with closing(_read_only(path)) as conn:
        try:
            rows = conn.execute(
                "SELECT id, slug FROM projects WHERE lower(board_slug)=lower(?) AND archived=0",
                (board,),
            ).fetchall()
        except sqlite3.OperationalError:  # a Hermes without project-board bindings
            return []
    return [(str(row["id"]), str(row["slug"])) for row in rows]


def _project_for_turn(conn: sqlite3.Connection, db: Path, *, board: str) -> Optional[str]:
    candidates = _hermes_projects_for_board(_owner_home(db), board)
    if len(candidates) != 1:
        return None  # unbound, or two projects on one board: never guess
    project_id, slug = candidates[0]
    rows = conn.execute(
        "SELECT project_id FROM project_stewardship WHERE project_id IN (?, ?)"
        " AND enabled=1 AND archived_at IS NULL",
        (project_id, slug),
    ).fetchall()
    found = {row["project_id"] for row in rows}
    return found.pop() if len(found) == 1 else None
