"""One profile-scoped state location for every Stewardship surface.

Resolution never migrates or merges databases. Existing legacy data requires an
explicit selection, rather than silently opening a second empty store.
"""
from __future__ import annotations

import os
from pathlib import Path
import sqlite3

from .persistence.store import Store


class StateSelectionError(RuntimeError):
    """An operator must explicitly select existing state before starting."""


def _populated(path: Path) -> bool:
    if not path.exists():
        return False
    try:
        conn = sqlite3.connect(path.as_uri() + "?mode=ro", uri=True, timeout=2)
        try:
            exists = conn.execute(
                "SELECT 1 FROM sqlite_master WHERE type='table' "
                "AND name='project_stewardship'"
            ).fetchone()
            if exists is None:
                if conn.execute("SELECT 1 FROM sqlite_master LIMIT 1").fetchone():
                    raise StateSelectionError(f"Unrecognised existing database: {path}")
                return False
            return conn.execute("SELECT 1 FROM project_stewardship LIMIT 1").fetchone() is not None
        finally:
            conn.close()
    except sqlite3.Error as exc:
        raise StateSelectionError(f"Cannot safely inspect existing database: {path}") from exc


def _profile_db_path() -> Path:
    home = Path(os.environ.get("HERMES_HOME") or Path.home() / ".hermes").expanduser().resolve()
    return home / "plugin-data" / "hermes-dockyard" / "dockyard.db"


def resolve_db_path(explicit: Path | str | None = None) -> Path:
    """Explicit argument > STEWARD_DB_PATH > legacy DOCKYARD_PLUGIN_DB > default."""
    selected = explicit if explicit is not None else (
        os.environ.get("STEWARD_DB_PATH") or os.environ.get("DOCKYARD_PLUGIN_DB")
    )
    if selected is not None:
        return Path(selected).expanduser().resolve()
    canonical = _profile_db_path()
    home = canonical.parents[2]
    legacy = {home / "stewardship.db", Path.cwd().resolve() / "stewardship.db"}
    conflicts = [path for path in sorted(legacy) if path != canonical and _populated(path)]
    if conflicts:
        locations = ", ".join(str(path) for path in conflicts)
        raise StateSelectionError(
            f"Existing Stewardship state found at {locations}. No data was moved. "
            "Set STEWARD_DB_PATH (or --db) to select the authoritative database; "
            "back up and reconcile multiple populated databases before changing the default."
        )
    return canonical


def open_store(db_path: Path | str | None = None) -> Store:
    """Resolve before any write and create only missing private directories."""
    selected = resolve_db_path(db_path)
    selected.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
    if os.name == "posix" and selected == _profile_db_path():
        selected.parent.chmod(0o700)
    return Store(selected)
