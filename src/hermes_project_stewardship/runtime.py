"""One profile-scoped state location for every Stewardship surface.

Resolution never migrates or merges databases. Existing legacy data requires an
explicit selection, rather than silently opening a second empty store.
"""
from __future__ import annotations

import os
import sys
from importlib import import_module
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


def _db_in(home: Path) -> Path:
    return home / "plugin-data" / "hermes-dockyard" / "dockyard.db"


def _standalone_home() -> Path:
    """Without Hermes: ``HERMES_HOME``, else ``~/.hermes``."""
    return Path(os.environ.get("HERMES_HOME") or Path.home() / ".hermes").expanduser().resolve()


def active_hermes_home() -> Path:
    """The Hermes home of the turn or request in progress (issue #36).

    Inside Hermes this is Hermes' own answer, ``hermes_constants.get_hermes_home()``:
    the context-local profile a multiplexed Desktop/TUI process binds for each
    session, else ``HERMES_HOME``, else the platform default (``%LOCALAPPDATA%\\hermes``
    on Windows). Hermes deliberately never writes that per-session profile into
    ``os.environ``, which every profile in the process shares, so reading the
    environment named the launch profile instead. Nothing here writes it either.

    A failing Hermes resolver raises rather than falling back to the launch
    profile: a guess could hand one profile's chat link or memory to another.
    Without Hermes (a standalone ``stewardctl``) the environment rule applies.
    """
    try:
        get_hermes_home = import_module("hermes_constants").get_hermes_home
    except (ImportError, AttributeError):
        return _standalone_home()
    return Path(get_hermes_home()).expanduser().resolve()


def hermes_root(home: Path | None = None) -> Path:
    """The root that holds every profile: ``<root>/profiles/<name>`` -> ``<root>``.

    Mirrors Hermes' own ``get_default_hermes_root()`` for the standard and Docker
    layouts; any other home is its own root. Defaults to the active home.
    """
    home = active_hermes_home() if home is None else home
    return home.parent.parent if home.parent.name == "profiles" else home


def _profile_db_path() -> Path:
    return _db_in(active_hermes_home())


def _root_db_path() -> Path:
    """The root profile's database, beside the root's own Hermes data."""
    return _db_in(hermes_root())


def _old_default_store() -> set[Path]:
    """Where 0.5.5 and earlier put the default store when ``HERMES_HOME`` was unset.

    That was always ``~/.hermes``, also on Windows, where Hermes keeps its data in
    ``%LOCALAPPDATA%\\hermes``. Hermes' own home is authoritative now; a store left
    at the old place is reported for an explicit selection, never silently
    replaced by a new empty one or moved.
    """
    if os.environ.get("HERMES_HOME", "").strip():
        return set()
    old_home = (Path.home() / ".hermes").expanduser().resolve()
    return set() if old_home == hermes_root() else {_db_in(old_home)}


def locate_shared_db() -> Path | None:
    """Where a bot finds Project Stewardship's data (checks round 1, pick 1b).

    Project Stewardship normally runs in the root profile while its bots run in their own
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
    """The database Project Stewardship's bot tools should name, or ``None`` for the host default.

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
    legacy = {home / "stewardship.db", Path.cwd().resolve() / "stewardship.db", *_old_default_store()}
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
