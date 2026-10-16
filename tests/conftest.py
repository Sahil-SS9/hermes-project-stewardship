"""Repository-wide pytest safety guard and shared fixtures.

Every pytest process gets a disposable state root before application modules
are imported. SQLite connections to the operator's real Hermes state are
rejected as a second line of defence, and the live Project Stewardship database is
fingerprinted before and after the run.
"""
from __future__ import annotations

import atexit
import os
import shutil
import sqlite3
import subprocess
import tempfile
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import unquote, urlsplit

import pytest

from .live_db_guard import live_fingerprint as _live_fingerprint
from .offline_guard import ATTEMPTS as _OFFLINE_ATTEMPTS
from .offline_guard import install as _install_offline_guard


# Read by the repo-root conftest.py: while this module is loaded it owns every
# state path, so the root conftest must not re-pin them. A module attribute,
# not an environment variable, because a shell can export a variable and
# child processes inherit one.
HPS_FAIL_CLOSED_STATE_ISOLATION = True

_LIVE_HERMES_HOME = (Path.home() / ".hermes").resolve()
_LIVE_DOCKYARD_DB = _LIVE_HERMES_HOME / "plugin-data" / "hermes-dockyard" / "dockyard.db"
_DEFAULT_TMP_ROOT = Path(os.environ.get("TMPDIR") or (Path.home() / ".hermes" / "cache" / "scratch")).expanduser().resolve()
_DEFAULT_TMP_ROOT.mkdir(parents=True, exist_ok=True)
_EXPLICIT_STATE_ROOT = os.environ.get("HPS_TEST_STATE_ROOT")
if _EXPLICIT_STATE_ROOT:
    explicit_root = Path(_EXPLICIT_STATE_ROOT).expanduser().resolve()
    in_live_home = explicit_root == _LIVE_HERMES_HOME or _LIVE_HERMES_HOME in explicit_root.parents
    in_disposable_tmp = explicit_root == _DEFAULT_TMP_ROOT or _DEFAULT_TMP_ROOT in explicit_root.parents
    if in_live_home and not in_disposable_tmp:
        raise RuntimeError(f"pytest state isolation rejected live HPS_TEST_STATE_ROOT={_EXPLICIT_STATE_ROOT!r}")
    _TEST_ROOT = explicit_root / "pytest-state"
    _TEST_ROOT.mkdir(parents=True, exist_ok=True)
else:
    _TEST_ROOT = Path(tempfile.mkdtemp(prefix="hps-pytest-", dir=str(_DEFAULT_TMP_ROOT))).resolve()
os.environ["HPS_TEST_STATE_ROOT"] = str(_TEST_ROOT)
os.environ["HERMES_HOME"] = str(_TEST_ROOT / "hermes-home")
os.environ["HERMES_KANBAN_HOME"] = str(_TEST_ROOT / "hermes-home")
os.environ.pop("HERMES_KANBAN_BOARD", None)
# The dispatcher injects a full board handoff into every worker shell, and a
# worker running pytest inherits it: ``HERMES_KANBAN_DB`` pins the live ops DB
# path and kanban_db_path() honours it FIRST, ``HERMES_KANBAN_TASK`` points the
# shared-board write guard at a live task, and a profile ``HERMES_HOME`` makes
# get_default_hermes_root() resolve the live shared root. Pop the whole family
# (the same tuple the real-host fixtures delenv) before any host is built.
for _injected in ("HERMES_KANBAN_BOARD", "HERMES_KANBAN_DB", "HERMES_KANBAN_TASK",
                  "HERMES_KANBAN_WORKSPACES_ROOT", "HERMES_TENANT"):
    os.environ.pop(_injected, None)
os.environ["STEWARD_DB_PATH"] = str(_TEST_ROOT / "dockyard.db")
os.environ["DOCKYARD_PLUGIN_DB"] = str(_TEST_ROOT / "dockyard.db")


def _path_from_sqlite_database(database: object) -> Path | None:
    if isinstance(database, os.PathLike):
        return Path(database).expanduser()
    if not isinstance(database, (str, bytes)):
        return None
    value = os.fsdecode(database)
    if value in {":memory:", ""}:
        return None
    if value.startswith("file:"):
        parsed = urlsplit(value)
        if parsed.path in {"", "/:memory:"}:
            return None
        return Path(unquote(parsed.path)).expanduser()
    return Path(value).expanduser()


def _is_live_path(value: object) -> bool:
    path = _path_from_sqlite_database(value)
    if path is None:
        return False
    try:
        resolved = path.resolve()
    except OSError:
        resolved = path.absolute()
    if not (resolved == _LIVE_HERMES_HOME or _LIVE_HERMES_HOME in resolved.parents):
        return False
    # The runtime scratch tree is disposable even though it is under ~/.hermes.
    return not (resolved == _DEFAULT_TMP_ROOT or _DEFAULT_TMP_ROOT in resolved.parents)


_REAL_SQLITE_CONNECT = sqlite3.connect


def _guarded_sqlite_connect(database, *args, **kwargs):
    if _is_live_path(database):
        raise RuntimeError(
            f"pytest test isolation refused SQLite path inside live Hermes home: {database!r}"
        )
    return _REAL_SQLITE_CONNECT(database, *args, **kwargs)


sqlite3.connect = _guarded_sqlite_connect


# Tests stay offline: no connection off this machine and no GitHub CLI run
# (see tests/offline_guard.py for why). Attempts are refused and recorded;
# _test_stays_offline fails the test that made one, and attempts outside any
# test fail the session.
_install_offline_guard()


# Rows, not file bytes, and without the live workflow timer's own rows: see
# tests/live_db_guard.py. Read through the real connect, which the guard above
# would otherwise refuse for this path.
_LIVE_BEFORE = _live_fingerprint(_LIVE_DOCKYARD_DB, connect=_REAL_SQLITE_CONNECT)


def _cleanup() -> None:
    if not _EXPLICIT_STATE_ROOT:
        shutil.rmtree(_TEST_ROOT, ignore_errors=True)


atexit.register(_cleanup)


def _require_isolated_environment() -> None:
    if os.environ.get("HPS_ALLOW_LIVE_TEST_STATE") == "1":
        raise RuntimeError(
            "refusing HPS_ALLOW_LIVE_TEST_STATE=1 in pytest; use the explicit "
            "native-host lane outside the normal test suite"
        )
    state_root = Path(os.environ["HPS_TEST_STATE_ROOT"]).resolve()
    for name in ("HERMES_HOME", "HERMES_KANBAN_HOME", "STEWARD_DB_PATH", "DOCKYARD_PLUGIN_DB"):
        value = Path(os.environ[name]).expanduser().resolve()
        if not (value == state_root or state_root in value.parents):
            raise RuntimeError(f"pytest state path escaped disposable root: {name}={value}")


_require_isolated_environment()


@pytest.hookimpl(trylast=True)
def pytest_sessionfinish(session: pytest.Session, exitstatus: int) -> None:
    after = _live_fingerprint(_LIVE_DOCKYARD_DB, connect=_REAL_SQLITE_CONNECT)
    if after != _LIVE_BEFORE:
        print("\nERROR: live Project Stewardship database changed during pytest; refusing a green result"
              " (the live workflow timer's heartbeat is already left out; if workflows are running"
              " live, pause the dockyard-workflow-timer job and run again)")
        session.exitstatus = 1
    if _OFFLINE_ATTEMPTS:
        print(f"\nERROR: code outside any test tried to go online (refused): {_OFFLINE_ATTEMPTS[:5]}")
        session.exitstatus = 1


@pytest.fixture(scope="session", autouse=True)
def _prove_test_paths_are_disposable():
    """Keep the isolation contract active for the complete pytest session."""
    yield


_SANDBOX_ENV = ("HPS_TEST_STATE_ROOT", "HERMES_HOME", "HERMES_KANBAN_HOME", "STEWARD_DB_PATH", "DOCKYARD_PLUGIN_DB")


@pytest.fixture(autouse=True)
def _sandbox_env_survives_each_test():
    """Fail any test that leaves a sandbox path changed or unset, after repairing it.

    A test that popped HERMES_HOME instead of restoring it pointed every later
    test at the live ~/.hermes. This fixture tears down after the test's own
    fixtures (monkeypatch undo has run); repairing first stops one leak from
    carrying later tests onto live state.
    """
    before = {name: os.environ.get(name) for name in _SANDBOX_ENV}
    yield
    after = {name: os.environ.get(name) for name in _SANDBOX_ENV}
    if after == before:
        return
    for name, value in before.items():
        if value is None:
            os.environ.pop(name, None)
        else:
            os.environ[name] = value
    changed = {name: (before[name], after[name]) for name in _SANDBOX_ENV if after[name] != before[name]}
    pytest.fail(f"test left the pytest sandbox environment changed (before, after): {changed}", pytrace=False)


@pytest.fixture(autouse=True)
def _test_stays_offline():
    """Fail any test that tried to leave the machine or run the GitHub CLI.

    The refusal itself happens in _offline_audit_hook; this turns a refusal the
    code under test swallowed into a failure of the test that caused it.
    """
    start = len(_OFFLINE_ATTEMPTS)
    yield
    attempts = _OFFLINE_ATTEMPTS[start:]
    if attempts:
        del _OFFLINE_ATTEMPTS[start:]
        pytest.fail(f"test tried to go online (refused): {attempts[:5]}", pytrace=False)


class FrozenClock:
    """Deterministic clock; advance() moves time forward."""

    def __init__(self) -> None:
        self._now = datetime(2026, 8, 21, 12, 0, 0, tzinfo=timezone.utc)

    def __call__(self) -> datetime:
        return self._now

    def advance(self, **kw) -> None:
        from datetime import timedelta
        self._now += timedelta(**kw)


@pytest.fixture()
def clock() -> FrozenClock:
    return FrozenClock()


@pytest.fixture()
def store(tmp_path: Path, clock: FrozenClock):
    from hermes_project_stewardship.persistence.store import Store
    s = Store(tmp_path / "test.db", clock=clock)
    yield s
    s.close()


@pytest.fixture()
def svc(store, clock):
    from hermes_project_stewardship.persistence.service import StewardshipService
    return StewardshipService(store, clock=clock)


@pytest.fixture()
def engine(svc, clock):
    from hermes_project_stewardship.cycles.engine import CycleEngine
    return CycleEngine(svc, clock=clock)


@pytest.fixture()
def enabled(svc) -> str:
    pid = "demo"
    svc.enable(pid, mission="keep CI green and deps fresh", lead_profile="lead",
               member_profiles=["coder", "qa"], autonomy_level=2)
    return pid


@pytest.fixture()
def real_host(tmp_path: Path, monkeypatch):
    """The real services on a disposable real Hermes kanban: (world, project id).

    Drives the plugin as the Desktop app does, against whichever Hermes is
    importable. Every piece of state lives under tmp_path. Skips when no Hermes
    runtime is installed, unless the native host lane demands one.
    """
    try:
        import hermes_cli.kanban_db  # noqa: F401
    except ImportError:
        if os.environ.get("STEWARD_REQUIRE_NATIVE_HOST") == "1":
            pytest.fail("Native host lane requires a real pinned Hermes runtime")
        pytest.skip("optional native Hermes runtime not installed")
    from hermes_project_stewardship.kanban.host_adapter import create_project_kanban_adapter
    from hermes_project_stewardship.persistence.store import Store
    from .r2_helpers import World

    # This fixture owns only tmp_path state: clear the orchestration child marker
    # so Hermes' write guard does not mistake it for a live delegated write.
    monkeypatch.delenv("HERMES_DELEGATED_CHILD_CONTEXT", raising=False)
    try:
        import agent.delegation_context as delegation_context

        monkeypatch.setattr(delegation_context, "is_delegated_child_process_context", lambda: False)
    except ImportError:
        pass
    for key in ("HERMES_KANBAN_DB", "HERMES_KANBAN_BOARD", "HERMES_KANBAN_TASK",
                "HERMES_KANBAN_WORKSPACES_ROOT", "HERMES_TENANT"):
        monkeypatch.delenv(key, raising=False)
    home = tmp_path / "hermes-home"
    monkeypatch.setenv("HERMES_KANBAN_HOME", str(tmp_path / "kanban-root"))
    monkeypatch.setenv("HERMES_HOME", str(home))
    adapter = create_project_kanban_adapter(hermes_home=home)
    assert adapter.host_provenance["host_module"].endswith("vanilla_host")  # the real host
    native = adapter.host.provision_project(
        idempotency_key="real-host", name="Real host", slug="real-host",
        board_slug="default", description="disposable real-host lane",
        lead_profile="default", repo_path=str(tmp_path),
    )
    project_id = str(native["project"]["id"])
    store = Store(tmp_path / "dockyard.db")
    world = World(store, None, adapter=adapter)
    world.project(project_id)
    try:
        yield world, project_id
    finally:
        store.close()


def enable_project(svc, pid: str) -> str:
    svc.enable(pid, mission="keep CI green and deps fresh", lead_profile="lead",
               member_profiles=["coder", "qa"], autonomy_level=2)
    return pid


def make_repo(path: Path, *, dirty: bool = False, commits: int = 1,
              readme_text: str = "example project") -> Path:
    path.mkdir(parents=True, exist_ok=True)

    def git(*args: str) -> None:
        subprocess.run(["git", *args], cwd=str(path), check=True,
                       capture_output=True)

    git("init", "-q")
    git("config", "user.email", "t@example.com")
    git("config", "user.name", "T")
    (path / "README.md").write_text(readme_text)
    git("add", "-A")
    for i in range(commits):
        (path / f"f{i}.txt").write_text(str(i))
        git("add", "-A")
        git("commit", "-qm", f"commit {i}")
    if dirty:
        (path / "uncommitted.txt").write_text("wip")
    return path
