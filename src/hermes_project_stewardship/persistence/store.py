"""SQLite-backed store: connection management, migrations, retention.

Design notes
------------
- WAL mode + foreign keys ON for every connection.
- All timestamps are UTC ISO-8601 strings (sortable, diffable).
- A single `Store` owns the sqlite3 connection; services are built on top via
  `Store.services()` so every surface shares one canonical backend.
- Retention/pruning keeps the DB bounded: snapshots, resolved cycles and audit
  rows older than their windows are removed.
"""

from __future__ import annotations

import json
import os
import sqlite3
import threading
from contextlib import contextmanager
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Dict, Iterator, List, Optional

from .migrations import MIGRATIONS


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def iso(dt: Optional[datetime] = None) -> str:
    return (dt or utcnow()).isoformat()


class Store:
    def __init__(
        self,
        db_path: Path,
        *,
        clock=None,
        snapshot_retention_days: int = 90,
        cycle_retention_days: int = 180,
        audit_retention_days: int = 365,
    ) -> None:
        self.db_path = Path(db_path)
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self._clock = clock or utcnow
        self.snapshot_retention_days = snapshot_retention_days
        self.cycle_retention_days = cycle_retention_days
        self.audit_retention_days = audit_retention_days
        # One connection per thread (FastAPI/gateway serve from worker
        # threads); WAL + busy_timeout make cross-thread concurrency safe,
        # and BEGIN IMMEDIATE serialises writers, so connections are opened
        # with check_same_thread=False purely to allow deterministic
        # cross-thread teardown in close().
        self._local = threading.local()
        self._registry: Dict[int, sqlite3.Connection] = {}
        self._reg_lock = threading.Lock()
        self.migrate()

    # ------------------------------------------------------------------ #
    # Connection / migrations                                            #
    # ------------------------------------------------------------------ #

    @property
    def _conn(self) -> sqlite3.Connection:
        conn = getattr(self._local, "conn", None)
        if conn is None:
            conn = self._connect()
            self._local.conn = conn
            with self._reg_lock:
                self._registry[id(threading.current_thread())] = conn
        return conn

    def _secure_database_files(self) -> None:
        if os.name != "posix":
            return
        for path in (
            self.db_path,
            Path(f"{self.db_path}-wal"),
            Path(f"{self.db_path}-shm"),
        ):
            if path.exists():
                path.chmod(0o600)

    def _connect(self) -> sqlite3.Connection:
        conn = sqlite3.connect(
            str(self.db_path), isolation_level=None, check_same_thread=False
        )
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA journal_mode=WAL")
        conn.execute("PRAGMA foreign_keys=ON")
        conn.execute("PRAGMA busy_timeout=5000")
        try:
            self._secure_database_files()
        except OSError:
            conn.close()
            raise
        return conn

    def close(self) -> None:
        """Close every thread's connection deterministically.

        Connections are opened with ``check_same_thread=False`` (writes are
        serialised by BEGIN IMMEDIATE under WAL), so any thread may close
        them. Registered connections are closed first; the calling thread's
        cached handle is then dropped so a subsequent operation reopens
        cleanly.
        """
        with self._reg_lock:
            for conn in self._registry.values():
                try:
                    conn.close()
                except Exception:
                    pass
            self._registry.clear()
        self._local.conn = None

    @contextmanager
    def tx(self) -> Iterator[sqlite3.Connection]:
        """Immediate-mode transaction (write lock up front; no upgrade deadlock)."""
        self._conn.execute("BEGIN IMMEDIATE")
        try:
            yield self._conn
            self._conn.execute("COMMIT")
        except BaseException:
            self._conn.execute("ROLLBACK")
            raise
        finally:
            self._secure_database_files()

    def migrate(self) -> None:
        with self.tx() as cx:
            cx.execute(
                "CREATE TABLE IF NOT EXISTS schema_migrations ("
                " version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL)"
            )
        current = self._conn.execute(
            "SELECT COALESCE(MAX(version),0) AS v FROM schema_migrations"
        ).fetchone()["v"]
        for m in MIGRATIONS:
            if m.version <= current:
                continue
            with self.tx() as cx:
                statement = ""
                for character in m.upgrade_sql:
                    statement += character
                    if character == ";" and sqlite3.complete_statement(statement):
                        sql = statement.strip()
                        statement = ""
                        if sql:
                            cx.execute(sql)
                if statement.strip():
                    raise sqlite3.OperationalError(
                        f"incomplete SQL in migration {m.version}"
                    )
                cx.execute(
                    "INSERT INTO schema_migrations(version, applied_at) VALUES(?,?)",
                    (m.version, iso(self._clock())),
                )

    @property
    def schema_version(self) -> int:
        row = self._conn.execute(
            "SELECT COALESCE(MAX(version),0) AS v FROM schema_migrations"
        ).fetchone()
        return int(row["v"])

    # ------------------------------------------------------------------ #
    # JSON helpers                                                       #
    # ------------------------------------------------------------------ #

    @staticmethod
    def _j(value: Any) -> str:
        return json.dumps(value, sort_keys=True, separators=(",", ":"))

    @staticmethod
    def _uj(raw: Any, default: Any) -> Any:
        if raw is None or raw == "":
            return default
        if isinstance(raw, (dict, list)):
            return raw
        return json.loads(raw)

    # ------------------------------------------------------------------ #
    # Audit                                                              #
    # ------------------------------------------------------------------ #

    def audit(
        self,
        *,
        actor: str,
        interface: str,
        action: str,
        subject: str,
        detail: Optional[Dict[str, Any]] = None,
    ) -> None:
        with self.tx() as cx:
            cx.execute(
                "INSERT INTO stewardship_audit_log(ts, actor, interface, action,"
                " subject, detail_json) VALUES(?,?,?,?,?,?)",
                (
                    iso(self._clock()),
                    actor,
                    interface,
                    action,
                    subject,
                    self._j(detail or {}),
                ),
            )

    def audit_tail(self, limit: int = 50) -> List[Dict[str, Any]]:
        rows = self._conn.execute(
            "SELECT * FROM stewardship_audit_log ORDER BY id DESC LIMIT ?", (limit,)
        ).fetchall()
        return [self._audit_row(r) for r in rows]

    def _audit_row(self, r: sqlite3.Row) -> Dict[str, Any]:
        return {
            "id": r["id"],
            "ts": r["ts"],
            "actor": r["actor"],
            "interface": r["interface"],
            "action": r["action"],
            "subject": r["subject"],
            "detail": self._uj(r["detail_json"], {}),
        }

    # ------------------------------------------------------------------ #
    # Cycle mutex (cross-process)                                        #
    # ------------------------------------------------------------------ #

    def mutex_acquire(self, project_id: str, holder: str, ttl_seconds: int = 900) -> bool:
        now = self._clock()
        cutoff = (iso(now), iso(now + timedelta(seconds=ttl_seconds)))
        with self.tx() as cx:
            row = cx.execute(
                "SELECT holder, expires_at FROM cycle_mutex WHERE project_id=?",
                (project_id,),
            ).fetchone()
            if row is not None:
                if row["expires_at"] > iso(now):
                    return False
                # expired lease: reclaim
            cx.execute(
                "INSERT INTO cycle_mutex(project_id, holder, acquired_at, expires_at)"
                " VALUES(?,?,?,?)"
                " ON CONFLICT(project_id) DO UPDATE SET"
                " holder=excluded.holder, acquired_at=excluded.acquired_at,"
                " expires_at=excluded.expires_at",
                (project_id, holder, cutoff[0], cutoff[1]),
            )
        return True

    def mutex_release(self, project_id: str, holder: str) -> bool:
        with self.tx() as cx:
            cur = cx.execute(
                "DELETE FROM cycle_mutex WHERE project_id=? AND holder=?",
                (project_id, holder),
            )
        return cur.rowcount > 0

    def mutex_holder(self, project_id: str) -> Optional[str]:
        row = self._conn.execute(
            "SELECT holder, expires_at FROM cycle_mutex WHERE project_id=?",
            (project_id,),
        ).fetchone()
        if row is None or row["expires_at"] <= iso(self._clock()):
            return None
        return row["holder"]

    # ------------------------------------------------------------------ #
    # Idempotent triggers                                                #
    # ------------------------------------------------------------------ #

    def trigger_seen(self, trigger_key: str) -> bool:
        row = self._conn.execute(
            "SELECT 1 FROM processed_triggers WHERE trigger_key=?", (trigger_key,)
        ).fetchone()
        return row is not None

    def trigger_mark(self, trigger_key: str) -> None:
        with self.tx() as cx:
            cx.execute(
                "INSERT OR IGNORE INTO processed_triggers(trigger_key, processed_at)"
                " VALUES(?,?)",
                (trigger_key, iso(self._clock())),
            )

    def trigger_prune(self, older_than_days: int = 30) -> int:
        cutoff = iso(self._clock() - timedelta(days=older_than_days))
        with self.tx() as cx:
            cur = cx.execute(
                "DELETE FROM processed_triggers WHERE processed_at < ?", (cutoff,)
            )
        return cur.rowcount

    # ------------------------------------------------------------------ #
    # Retention                                                          #
    # ------------------------------------------------------------------ #

    def prune(self) -> Dict[str, int]:
        """Bounded-state job: prune snapshots/cycles/audit/trigger keys."""
        now = self._clock()
        out: Dict[str, int] = {}
        columns = {
            "project_health_snapshots": "created_at",
            "project_cycles": "started_at",
            "stewardship_audit_log": "ts",
        }
        windows = {
            "project_health_snapshots": self.snapshot_retention_days,
            "project_cycles": self.cycle_retention_days,
            "stewardship_audit_log": self.audit_retention_days,
        }
        with self.tx() as cx:
            for table, col in columns.items():
                cutoff = iso(now - timedelta(days=windows[table]))
                cur = cx.execute(f"DELETE FROM {table} WHERE {col} < ?", (cutoff,))
                out[table] = cur.rowcount
        out["processed_triggers"] = self.trigger_prune()
        return out
