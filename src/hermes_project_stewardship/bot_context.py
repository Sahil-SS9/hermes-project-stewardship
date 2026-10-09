"""Give a bot its project's memory (checks round 1; Sahil 08/10 picks 1b = A and 1a = A).

Registered as Hermes' ``pre_llm_call`` hook by ``plugin.register``. For each turn it
works out whether the bot is working on a Dockyard project and, if so, returns that
project's memory (``memory_service.context_for``). Hermes adds the text to that
turn's user message only; it is not saved in the transcript, and the bot's own
memory provider is never touched.

A bot is working on a project when:
* it is a Kanban worker on the project's board: the dispatcher sets
  ``HERMES_KANBAN_TASK`` and ``HERMES_KANBAN_BOARD``, and the board maps to exactly
  one Hermes project in the owner's projects list, which is the Dockyard project by
  id or slug - the same resolution as ``KanbanAdapter.project_board``; or
* it is in a Desktop chat opened from Dockyard's Chat button: the first message of a
  new chat on the Desktop chat panel (``platform="desktop"``) in this bot's profile
  claims the oldest open link for this bot, once (``persistence/chat_links.py``).
  Later turns of that chat, also after a restart, find the claimed link. Never in a
  Kanban worker or a sub-agent.
Nothing is guessed: an unbound board, a board shared by two projects, an expired or
used link, or a project that is switched off gives nothing.

Safety:
* never creates or migrates a database and never writes Dockyard data, except the
  one claim of a chat link (a single UPDATE on an existing file); a schema too old
  for a feature is skipped rather than upgraded;
* never raises: any error means no memory for this turn (logged at debug);
* cheap when there is nothing to do: a turn that is neither a worker's nor a
  Desktop chat's opens no file, and each chat is looked up once per process.
"""
from __future__ import annotations

import logging
import os
import sqlite3
import threading
from collections import OrderedDict
from contextlib import closing
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

from .persistence.memory_service import context_for
from .persistence.store import iso
from .runtime import locate_shared_db

logger = logging.getLogger(__name__)

MIN_SCHEMA = 38        # project memory
MIN_SCHEMA_CHATS = 39  # chat links
CHAT_PLATFORM = "desktop"
_CACHE_LIMIT = 1024
_LOCK = threading.Lock()
# session id -> (database, project id) for a linked chat, or None for an unlinked one.
_SESSIONS: "OrderedDict[str, Optional[Tuple[Path, str]]]" = OrderedDict()


def _now() -> datetime:
    return datetime.now(timezone.utc)


def reset_cache() -> None:
    """Forget which chats are linked (tests; a restart does the same)."""
    with _LOCK:
        _SESSIONS.clear()


def project_memory_hook(**kwargs: Any) -> Optional[Dict[str, str]]:
    """``pre_llm_call``: ``{"context": memory}`` for a bot on a project, else ``None``."""
    try:
        return _hook(**kwargs)
    except Exception:  # a memory problem must never break a bot's turn
        logger.debug("Dockyard project memory skipped for this turn", exc_info=True)
        return None


def _hook(*, session_id: Any = "", is_first_turn: Any = False, platform: Any = "",
          parent_session_id: Any = "", **_kwargs: Any) -> Optional[Dict[str, str]]:
    task = os.environ.get("HERMES_KANBAN_TASK", "").strip()
    board = os.environ.get("HERMES_KANBAN_BOARD", "").strip()
    if task or board:  # a Kanban worker: only its board decides, never a chat link
        return _worker_context(board) if task and board else None
    if str(platform or "") != CHAT_PLATFORM or str(parent_session_id or "").strip():
        return None
    sid = str(session_id or "").strip()
    if not sid:
        return None
    linked = _linked_chat(sid, first_turn=bool(is_first_turn))
    if linked is None:
        return None
    db, project = linked
    with closing(_read_only(db)) as conn:
        if not _active_project(conn, project):
            return None
        text = context_for(conn, project)
    return {"context": text} if text else None


# ---- Kanban workers ---------------------------------------------------------

def _worker_context(board: str) -> Optional[Dict[str, str]]:
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


def _project_for_turn(conn: sqlite3.Connection, db: Path, *, board: str) -> Optional[str]:
    candidates = _hermes_projects_for_board(_owner_home(db), board)
    if len(candidates) != 1:
        return None  # unbound, or two projects on one board: never guess
    project_id, slug = candidates[0]
    found = {pid for pid in (project_id, slug) if _active_project(conn, pid)}
    return found.pop() if len(found) == 1 else None


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


# ---- Desktop chats opened from Dockyard ---------------------------------------

def _linked_chat(session_id: str, *, first_turn: bool) -> Optional[Tuple[Path, str]]:
    with _LOCK:
        if session_id in _SESSIONS:
            _SESSIONS.move_to_end(session_id)
            return _SESSIONS[session_id]
    db = locate_shared_db()
    found: Optional[Tuple[Path, str]] = None
    if db is not None and db.is_file():
        project = _claim(db, session_id) if first_turn else _claimed(db, session_id)
        found = (db, project) if project else None
    with _LOCK:
        _SESSIONS[session_id] = found
        while len(_SESSIONS) > _CACHE_LIMIT:
            _SESSIONS.popitem(last=False)
    return found


def _claim(db: Path, session_id: str) -> Optional[str]:
    """The first message of a new Desktop chat takes this bot's oldest open link."""
    now = iso(_now())
    with closing(_read_write(db)) as conn:
        if _schema_version(conn) < MIN_SCHEMA_CHATS:
            return None
        claimed = conn.execute(
            "UPDATE project_chat_links SET session_id=?, claimed_at=?"
            " WHERE id=(SELECT id FROM project_chat_links WHERE profile=? AND session_id IS NULL"
            " AND expires_at>? ORDER BY id LIMIT 1) AND session_id IS NULL",
            (session_id, now, _own_profile(), now),
        ).rowcount
        if claimed != 1:
            return None
        row = conn.execute("SELECT project_id FROM project_chat_links WHERE session_id=?",
                           (session_id,)).fetchone()
    return str(row["project_id"]) if row else None


def _claimed(db: Path, session_id: str) -> Optional[str]:
    with closing(_read_only(db)) as conn:
        if _schema_version(conn) < MIN_SCHEMA_CHATS:
            return None
        row = conn.execute("SELECT project_id FROM project_chat_links WHERE session_id=?",
                           (session_id,)).fetchone()
    return str(row["project_id"]) if row else None


def _own_profile() -> str:
    home = Path(os.environ.get("HERMES_HOME") or Path.home() / ".hermes").expanduser().resolve()
    return home.name if home.parent.name == "profiles" else "default"


# ---- shared -------------------------------------------------------------------

def _read_only(path: Path) -> sqlite3.Connection:
    conn = sqlite3.connect(path.as_uri() + "?mode=ro", uri=True, timeout=2)
    conn.row_factory = sqlite3.Row
    return conn


def _read_write(path: Path) -> sqlite3.Connection:
    # mode=rw opens an existing file only: a missing database is never created.
    conn = sqlite3.connect(path.as_uri() + "?mode=rw", uri=True, timeout=2, isolation_level=None)
    conn.row_factory = sqlite3.Row
    return conn


def _schema_version(conn: sqlite3.Connection) -> int:
    try:
        row = conn.execute("SELECT max(version) FROM schema_migrations").fetchone()
    except sqlite3.OperationalError:
        return 0
    return int(row[0] or 0)


def _active_project(conn: sqlite3.Connection, project_id: str) -> bool:
    return conn.execute(
        "SELECT 1 FROM project_stewardship WHERE project_id=? AND enabled=1 AND archived_at IS NULL",
        (project_id,),
    ).fetchone() is not None


def _owner_home(db: Path) -> Path:
    """The Hermes home that owns Dockyard's database (its projects list sits beside it)."""
    if db.parent.name == "hermes-dockyard" and db.parent.parent.name == "plugin-data":
        return db.parent.parent.parent
    home = Path(os.environ.get("HERMES_HOME") or Path.home() / ".hermes").expanduser().resolve()
    return home.parent.parent if home.parent.name == "profiles" else home
