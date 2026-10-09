"""One profile-scoped state location for every Stewardship surface.

Resolution never migrates or merges databases. Existing legacy data requires an
explicit selection, rather than silently opening a second empty store.
"""
from __future__ import annotations

import os
import sys
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


def _root_db_path() -> Path:
    """The root profile's database: ``<root>/profiles/<name>`` -> ``<root>``.

    Mirrors Hermes' own ``get_default_hermes_root()`` for the standard and Docker
    layouts, without importing Hermes (the dashboard loads this module too).
    """
    home = Path(os.environ.get("HERMES_HOME") or Path.home() / ".hermes").expanduser().resolve()
    root = home.parent.parent if home.parent.name == "profiles" else home
    return root / "plugin-data" / "hermes-dockyard" / "dockyard.db"


def locate_shared_db() -> Path | None:
    """Where a bot finds Dockyard's data (checks round 1, pick 1b).

    Dockyard normally runs in the root profile while its bots run in their own
    profiles. Order: an explicit path; else this profile's copy if it holds
    projects; else the root profile's copy if it holds projects; else ``None``.
    An empty copy never wins, so a stray one cannot hide the real data. Opens
    nothing for writing and creates nothing.
    """
    explicit = os.environ.get("STEWARD_DB_PATH") or os.environ.get("DOCKYARD_PLUGIN_DB")
    if explicit:
        return Path(explicit).expanduser().resolve()
    for candidate in dict.fromkeys((_profile_db_path(), _root_db_path())):
        if _populated(candidate):
            return candidate
    return None


def bot_db_path() -> Path | None:
    """The database Dockyard's bot tools should name, or ``None`` for the host default.

    Only a redirect to the root profile's copy is returned. In every other case the
    caller keeps the usual resolution (``resolve_db_path``) with all its checks.
    """
    if os.environ.get("STEWARD_DB_PATH") or os.environ.get("DOCKYARD_PLUGIN_DB"):
        return None
    shared = locate_shared_db()
    return shared if shared is not None and shared != _profile_db_path() else None


def _inside_git_checkout(path: Path) -> bool:
    return any((parent / ".git").exists() for parent in path.parents)


_HOST_REGISTERED = False


def mark_hermes_host() -> None:
    """Called only from ``plugin.register()``, which only the Hermes host invokes."""
    global _HOST_REGISTERED
    _HOST_REGISTERED = True


def default_location_allowed() -> bool:
    """P addendum fix 2: who may fall back to the profile default database.

    Only two callers may: the Hermes host loading the plugin, and an installed
    ``stewardctl``. The host signals are explicit, set only by host entry points:

    * the gateway/CLI host calls ``plugin.register()``, which calls
      ``mark_hermes_host()`` (Quan D1: merely having ``hermes_cli`` imported is
      no longer enough - any script with a Hermes checkout on ``sys.path`` had it);
    * the dashboard imports ``plugin_api.py`` under the module name
      ``hermes_dashboard_plugin_<name>``, registered in ``sys.modules`` by the
      host loader before the file executes.

    An installed ``stewardctl`` is the console script running from an installed
    package, not from a git checkout or worktree. Everything else - ad-hoc
    imports, scripts, ``stewardctl`` from a checkout - must name a path.
    """
    if _HOST_REGISTERED:
        return True
    if any(name.startswith("hermes_dashboard_plugin_") for name in sys.modules):
        return True
    entry = Path(sys.argv[0]).name if sys.argv and sys.argv[0] else ""
    if entry == "stewardctl":
        return not _inside_git_checkout(Path(__file__).resolve())
    return False


def resolve_db_path(explicit: Path | str | None = None) -> Path:
    """Explicit argument > STEWARD_DB_PATH > legacy DOCKYARD_PLUGIN_DB > default.

    P addendum fix 2: the profile default is reserved for the Hermes host.
    Anything else must say where the database lives, or the resolution raises.
    """
    selected = explicit if explicit is not None else (
        os.environ.get("STEWARD_DB_PATH") or os.environ.get("DOCKYARD_PLUGIN_DB")
    )
    if selected is not None:
        return Path(selected).expanduser().resolve()
    if not default_location_allowed():
        raise StateSelectionError(
            "No database path given. Set STEWARD_DB_PATH or pass --db; only the "
            "Hermes host and an installed stewardctl may use the default "
            "profile database."
        )
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
