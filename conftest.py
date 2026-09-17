"""Isolate default application stores before pytest imports test modules.

Individual tests can still choose their own disposable paths using monkeypatch.
This is not a sandbox for arbitrary scripts or third-party pytest plugins.
"""
import atexit
import os
from pathlib import Path
import shutil
import tempfile


def pytest_configure(config):
    home = Path(tempfile.mkdtemp(prefix='dockyard-pytest-home-'))
    atexit.register(shutil.rmtree, home, ignore_errors=True)
    # Override inherited defaults: setdefault would preserve a live DB path.
    os.environ['HERMES_HOME'] = str(home)
    os.environ['HERMES_KANBAN_HOME'] = str(home)
    os.environ['STEWARD_DB_PATH'] = str(home / 'dockyard.db')
