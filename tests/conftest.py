"""Shared fixtures: temp store, service, engine, fake repos, frozen clock."""

from __future__ import annotations

import subprocess
from datetime import datetime, timezone
from pathlib import Path

import pytest

from hermes_project_stewardship.cycles.engine import CycleEngine
from hermes_project_stewardship.persistence.service import StewardshipService
from hermes_project_stewardship.persistence.store import Store


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
def store(tmp_path: Path, clock: FrozenClock) -> Store:
    s = Store(tmp_path / "test.db", clock=clock)
    yield s
    s.close()


@pytest.fixture()
def svc(store: Store, clock: FrozenClock) -> StewardshipService:
    return StewardshipService(store, clock=clock)


@pytest.fixture()
def engine(svc: StewardshipService, clock: FrozenClock) -> CycleEngine:
    return CycleEngine(svc, clock=clock)


@pytest.fixture()
def enabled(svc: StewardshipService) -> str:
    pid = "demo"
    svc.enable(pid, mission="keep CI green and deps fresh", lead_profile="lead",
               member_profiles=["coder", "qa"], autonomy_level=2)
    return pid


def enable_project(svc: StewardshipService, pid: str) -> str:
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
