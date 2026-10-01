"""Isolate default application stores before pytest imports test modules.

Individual tests can still choose their own disposable paths using monkeypatch.
This is not a sandbox for arbitrary scripts or third-party pytest plugins.
"""
import atexit
import os
from pathlib import Path
import shutil
import tempfile
import types


def _fail_closed_isolation_loaded(config) -> bool:
    """True when tests/conftest.py is loaded in this pytest process.

    That module pins every state path under its own disposable root at import
    time and fails closed on live roots. pytest_configure runs after it has
    imported, so re-pinning here would override the stricter guard. The check
    reads the loaded module itself, never an environment variable: a shell can
    export a variable, and child processes inherit one.
    """
    return any(
        isinstance(plugin, types.ModuleType)
        and getattr(plugin, "HPS_FAIL_CLOSED_STATE_ISOLATION", False) is True
        for plugin in config.pluginmanager.get_plugins()
    )


def pytest_configure(config):
    if _fail_closed_isolation_loaded(config):
        return
    home = Path(tempfile.mkdtemp(prefix='dockyard-pytest-home-'))
    atexit.register(shutil.rmtree, home, ignore_errors=True)
    # Override inherited defaults: setdefault would preserve a live DB path.
    os.environ['HERMES_HOME'] = str(home)
    os.environ['HERMES_KANBAN_HOME'] = str(home)
    os.environ['STEWARD_DB_PATH'] = str(home / 'dockyard.db')
    os.environ['DOCKYARD_PLUGIN_DB'] = str(home / 'dockyard.db')
