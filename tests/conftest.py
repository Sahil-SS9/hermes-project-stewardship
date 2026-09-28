"""Repository-wide pytest safety guard and shared fixtures.

Every pytest process gets a disposable state root before application modules
are imported. SQLite connections to the operator's real Hermes state are
rejected as a second line of defence, and the live Dockyard database is
fingerprinted before and after the run.
"""
from __future__ import annotations

import atexit
import hashlib
import os
import shutil
import sqlite3
import subprocess
import tempfile
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import unquote, urlsplit

import pytest


_LIVE_HERMES_HOME = (Path.home() / ".hermes").resolve()
_LIVE_DOCKYARD_FILES = tuple(
    _LIVE_HERMES_HOME / "plugin-data" / "hermes-dockyard" / name
    for name in ("dockyard.db", "dockyard.db-wal", "dockyard.db-shm")
)
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


def _fingerprint(paths: tuple[Path, ...]) -> tuple[tuple[str, int, str], ...]:
    """Content fingerprint only.

    WAL mode touches the -shm/-wal sidecar timestamps when any process merely
    opens the database read-only, so mtimes are not a reliable write signal.
    The main database file's size and content hash are.
    """
    result = []
    for path in paths:
        if not path.exists():
            result.append((str(path), 0, ""))
            continue
        data = path.read_bytes()
        result.append((str(path), len(data), hashlib.sha256(data).hexdigest()))
    return tuple(result)


_LIVE_BEFORE = _fingerprint(_LIVE_DOCKYARD_FILES)


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
    after = _fingerprint(_LIVE_DOCKYARD_FILES)
    if after != _LIVE_BEFORE:
        print("\nERROR: live Dockyard database changed during pytest; refusing a green result")
        session.exitstatus = 1


@pytest.fixture(scope="session", autouse=True)
def _prove_test_paths_are_disposable():
    """Keep the isolation contract active for the complete pytest session."""
    yield


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
