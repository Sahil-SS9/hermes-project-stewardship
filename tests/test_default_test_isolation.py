"""The normal pytest entrypoint isolates state and fails closed for live roots."""
import os
from pathlib import Path
import subprocess
import sys


if os.environ.get("HPS_ISOLATION_PROBE"):
    import sqlite3
    from hermes_project_stewardship.runtime import resolve_db_path

    resolved = resolve_db_path().resolve()
    state_root = Path(os.environ["HPS_TEST_STATE_ROOT"]).resolve()
    # Mirror tests/conftest.py: the disposable root is the inherited default
    # $(TMPDIR or ~/.hermes/cache/scratch), never the live home itself.
    default_tmp_root = Path(os.environ.get("TMPDIR") or (Path.home() / ".hermes" / "cache" / "scratch")).resolve()
    assert resolved == Path(os.environ["STEWARD_DB_PATH"]).resolve()
    assert state_root != Path.home() / ".hermes"
    assert resolved.name == "dockyard.db"
    assert resolved != Path.home() / ".hermes" / "plugin-data" / "hermes-dockyard" / "dockyard.db"
    assert str(resolved).startswith(str(state_root))
    assert str(state_root).startswith(str(default_tmp_root))
    try:
        sqlite3.connect(str(Path.home() / ".hermes" / "plugin-data" / "hermes-dockyard" / "dockyard.db"))
    except RuntimeError as exc:
        assert "test isolation refused SQLite path" in str(exc)
    else:
        raise AssertionError("the pytest SQLite guard allowed the live Dockyard database")


def _collect(env: dict[str, str]) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        [sys.executable, "-m", "pytest", "--collect-only", "-q", "-o", "addopts=", str(Path(__file__))],
        cwd=Path(__file__).parents[1], env=env, capture_output=True, text=True, timeout=60,
    )


def test_collection_redirects_inherited_live_paths(tmp_path):
    protected = tmp_path / "protected"
    protected.mkdir()
    sentinel = protected / "db.sqlite"
    sentinel.write_bytes(b"protected database sentinel")
    env = dict(os.environ)
    env.pop("HPS_TEST_STATE_ROOT", None)
    env.update(
        HPS_ISOLATION_PROBE="1",
        HERMES_HOME=str(Path.home() / ".hermes"),
        HERMES_KANBAN_HOME=str(Path.home() / ".hermes"),
        STEWARD_DB_PATH=str(sentinel),
        DOCKYARD_PLUGIN_DB=str(sentinel),
        PYTEST_DISABLE_PLUGIN_AUTOLOAD="1",
    )
    result = _collect(env)
    assert result.returncode == 0, result.stdout + result.stderr
    assert sentinel.read_bytes() == b"protected database sentinel"
    assert sorted(p.name for p in protected.iterdir()) == ["db.sqlite"]


def test_collection_rejects_explicit_live_state_root(tmp_path):
    protected = tmp_path / "protected"
    protected.mkdir()
    sentinel = protected / "db.sqlite"
    sentinel.write_bytes(b"protected database sentinel")
    env = dict(
        os.environ,
        HPS_TEST_STATE_ROOT=str(Path.home() / ".hermes"),
        HERMES_HOME=str(protected),
        HERMES_KANBAN_HOME=str(protected),
        STEWARD_DB_PATH=str(sentinel),
        DOCKYARD_PLUGIN_DB=str(sentinel),
        PYTEST_DISABLE_PLUGIN_AUTOLOAD="1",
    )
    result = _collect(env)
    assert result.returncode != 0
    combined_output = result.stdout + result.stderr
    assert "pytest state isolation rejected live HPS_TEST_STATE_ROOT" in combined_output
    assert sentinel.read_bytes() == b"protected database sentinel"
    assert sorted(p.name for p in protected.iterdir()) == ["db.sqlite"]


def test_collection_redirects_to_disposable_state(tmp_path):
    state = tmp_path / "state"
    state.mkdir()
    env = dict(
        os.environ,
        HPS_TEST_STATE_ROOT=str(state),
        HERMES_HOME=str(state / "hermes"),
        HERMES_KANBAN_HOME=str(state / "hermes"),
        STEWARD_DB_PATH=str(state / "db.sqlite"),
        DOCKYARD_PLUGIN_DB=str(state / "db.sqlite"),
        PYTEST_DISABLE_PLUGIN_AUTOLOAD="1",
    )
    result = _collect(env)
    assert result.returncode == 0, result.stdout + result.stderr
