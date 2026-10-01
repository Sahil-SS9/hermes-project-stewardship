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
    # tests/conftest.py (fail-closed isolation, 77c0000) pins state paths from
    # an HPS_TEST_STATE_ROOT at module level. pytest_configure hooks run after
    # every conftest module has imported, so blindly re-pinning here STOMPS
    # that tighter isolation — and diverges from it whenever TMPDIR is
    # redirected. Defer to the deeper conftest when it already spoke.
    if "HPS_TEST_STATE_ROOT" in os.environ:
        return
    home = Path(tempfile.mkdtemp(prefix='dockyard-pytest-home-'))
    atexit.register(shutil.rmtree, home, ignore_errors=True)
    # Override inherited defaults: setdefault would preserve a live DB path.
    os.environ['HERMES_HOME'] = str(home)
    os.environ['HERMES_KANBAN_HOME'] = str(home)
    os.environ['STEWARD_DB_PATH'] = str(home / 'dockyard.db')
