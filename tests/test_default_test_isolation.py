"""Collection-time defaults must never target the caller's real home."""
import os
from pathlib import Path
import subprocess
import sys

if os.environ.get('DOCKYARD_ISOLATION_PROBE'):
    protected = Path(os.environ['DOCKYARD_PROTECTED_HOME'])
    for key in ('HERMES_HOME', 'HERMES_KANBAN_HOME', 'STEWARD_DB_PATH'):
        assert not Path(os.environ[key]).is_relative_to(protected), key
    from hermes_project_stewardship.api import server  # noqa: F401


def test_collection_redirects_inherited_live_paths(tmp_path):
    protected = tmp_path / 'protected'
    protected.mkdir()
    sentinel = protected / 'db.sqlite'
    sentinel.write_bytes(b'protected database sentinel')
    env = dict(os.environ, DOCKYARD_ISOLATION_PROBE='1',
               DOCKYARD_PROTECTED_HOME=str(protected), HERMES_HOME=str(protected),
               HERMES_KANBAN_HOME=str(protected), STEWARD_DB_PATH=str(sentinel))
    result = subprocess.run(
        [sys.executable, '-m', 'pytest', '--collect-only', '-q', '-o', 'addopts=',
         str(Path(__file__))], cwd=Path(__file__).parents[1], env=env,
        capture_output=True, text=True, timeout=60,
    )
    assert result.returncode == 0, result.stdout + result.stderr
    assert sentinel.read_bytes() == b'protected database sentinel'
    assert sorted(p.name for p in protected.iterdir()) == ['db.sqlite']
