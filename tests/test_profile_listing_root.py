"""Profiles are listed from the Hermes root; projects stay with their profile.

A plugin process running under a named profile serves hermes_home =
<root>/profiles/<name>. Profile names live under <root>/profiles, so listing
them from the active profile's home showed only "default": team pickers, the
project-lead check and the profiles an Implement card may be assigned to were
all wrong inside any named profile.

Projects are different: Hermes keeps projects.db per profile on purpose
(hermes_cli.projects_db: "Scope: per-profile"), so a profile's host keeps
reading its own projects, never the root's.
"""
from __future__ import annotations

import sys
import types
from pathlib import Path

import pytest

from hermes_project_stewardship.kanban.vanilla_host import ProjectKanbanHost


def _root_with_profiles(tmp_path: Path) -> Path:
    root = tmp_path / "hermes-root"
    for slug in ("beta", "alpha"):
        (root / "profiles" / slug).mkdir(parents=True)
    (root / "profiles" / ".deleted").mkdir()  # core's tombstone dir, not a profile
    return root


@pytest.fixture(autouse=True)
def _pinned_kanban_root(tmp_path, monkeypatch):
    monkeypatch.setenv("HERMES_KANBAN_HOME", str(tmp_path / "kanban"))


def test_a_host_serving_a_named_profile_lists_every_profile(tmp_path):
    root = _root_with_profiles(tmp_path)
    host = ProjectKanbanHost(hermes_home=root / "profiles" / "alpha")
    assert [p["name"] for p in host.list_profiles()] == ["default", "alpha", "beta"]


def test_the_root_host_lists_the_same_profiles(tmp_path):
    root = _root_with_profiles(tmp_path)
    host = ProjectKanbanHost(hermes_home=root)
    assert [p["name"] for p in host.list_profiles()] == ["default", "alpha", "beta"]


def test_the_root_comes_from_core_when_core_resolves_it(tmp_path, monkeypatch):
    """Newer Hermes resolves the root of an explicit home itself
    (get_default_hermes_root(home=...)); its answer wins over our fallback."""
    elsewhere = _root_with_profiles(tmp_path / "core-says")
    seen = {}

    def get_default_hermes_root(*, home=None):
        seen["home"] = home
        return elsewhere

    fake = types.ModuleType("hermes_constants")
    fake.get_default_hermes_root = get_default_hermes_root
    monkeypatch.setitem(sys.modules, "hermes_constants", fake)
    served = tmp_path / "some-profile-home"
    host = ProjectKanbanHost(hermes_home=served)
    assert [p["name"] for p in host.list_profiles()] == ["default", "alpha", "beta"]
    assert Path(seen["home"]) == served


def test_projects_stay_with_the_profile_that_owns_them(tmp_path):
    pytest.importorskip("hermes_cli.projects_db", reason="needs the native Hermes runtime")
    root = _root_with_profiles(tmp_path)
    repo = tmp_path / "repo"
    repo.mkdir()
    alpha = ProjectKanbanHost(hermes_home=root / "profiles" / "alpha")
    alpha.provision_project(
        name="Alpha only", slug="alpha-only", description="lives in alpha",
        repo_path=str(repo), lead_profile="beta",  # a sibling profile is a valid lead
        idempotency_key="alpha-only-1", board_slug="alpha-only",
    )
    in_alpha = alpha.list_existing_projects()
    assert [p["slug"] for p in in_alpha["projects"]] == ["alpha-only"]
    assert [p["name"] for p in in_alpha["profiles"]] == ["default", "alpha", "beta"]
    in_root = ProjectKanbanHost(hermes_home=root).list_existing_projects()
    assert in_root["projects"] == [], "the root profile must not see alpha's projects"


# ---- issue #30: an empty registry says where the projects are ------------------

def _registry(home: Path, *, live: int, archived: int = 0) -> None:
    """A projects.db with core's columns that this check reads."""
    import sqlite3

    home.mkdir(parents=True, exist_ok=True)
    with sqlite3.connect(home / "projects.db") as conn:
        conn.execute("CREATE TABLE projects (id TEXT PRIMARY KEY, slug TEXT NOT NULL UNIQUE,"
                     " name TEXT NOT NULL, created_at INTEGER NOT NULL,"
                     " archived INTEGER NOT NULL DEFAULT 0)")
        for n in range(live + archived):
            conn.execute("INSERT INTO projects VALUES (?,?,?,?,?)",
                         (f"p{n}", f"p{n}", f"P{n}", n, 1 if n >= live else 0))


def test_other_profiles_with_projects_are_named_with_counts(tmp_path):
    root = _root_with_profiles(tmp_path)
    (root / "profiles" / "gamma").mkdir()
    _registry(root, live=2, archived=1)  # the default profile
    _registry(root / "profiles" / "alpha", live=1)
    _registry(root / "profiles" / "beta", live=0, archived=2)  # only archived: nothing to offer
    (root / "profiles" / "gamma" / "projects.db").write_bytes(b"not a database")  # skipped
    host = ProjectKanbanHost(hermes_home=root / "profiles" / "beta")
    assert host._other_profile_projects() == [
        {"name": "default", "project_count": 2},
        {"name": "alpha", "project_count": 1},
    ]
    # The served profile is never listed, and reading creates nothing.
    root_host = ProjectKanbanHost(hermes_home=root)
    assert root_host._other_profile_projects() == [{"name": "alpha", "project_count": 1}]
    assert sorted(p.name for p in (root / "profiles").iterdir()) == [".deleted", "alpha", "beta", "gamma"]
    assert not (root / "profiles" / "alpha" / "projects.db-wal").exists()


def test_discovery_names_other_profiles_only_when_this_registry_is_empty(tmp_path):
    pytest.importorskip("hermes_cli.projects_db", reason="needs the native Hermes runtime")
    root = _root_with_profiles(tmp_path)
    repo = tmp_path / "repo"
    repo.mkdir()
    alpha = ProjectKanbanHost(hermes_home=root / "profiles" / "alpha")
    alpha.provision_project(
        name="Alpha only", slug="alpha-only", description="lives in alpha",
        repo_path=str(repo), lead_profile="beta",
        idempotency_key="alpha-only-1", board_slug="alpha-only",
    )
    in_root = ProjectKanbanHost(hermes_home=root).list_existing_projects()
    assert in_root["projects"] == [] and in_root["profile"] == "default"
    assert in_root["other_profiles"] == [{"name": "alpha", "project_count": 1}]
    in_alpha = alpha.list_existing_projects()
    assert [p["slug"] for p in in_alpha["projects"]] == ["alpha-only"]
    assert in_alpha["profile"] == "alpha" and in_alpha["other_profiles"] == []
    in_beta = ProjectKanbanHost(hermes_home=root / "profiles" / "beta").list_existing_projects()
    assert in_beta["profile"] == "beta"
    assert in_beta["other_profiles"] == [{"name": "alpha", "project_count": 1}]


def test_the_discover_route_passes_other_profiles_through(tmp_path, monkeypatch):
    from fastapi.testclient import TestClient

    from hermes_project_stewardship.api.server import create_app
    from hermes_project_stewardship.kanban import ReferenceKanbanAdapter
    from hermes_project_stewardship.persistence.store import Store

    store = Store(tmp_path / "dockyard.db")
    try:
        adapter = ReferenceKanbanAdapter(store)
        monkeypatch.setattr(adapter, "list_existing_projects", lambda: {
            "projects": [],
            "profiles": [{"name": "default", "is_default": True}],
            "other_profiles": [{"name": "alpha", "project_count": 3}],
        })
        client = TestClient(create_app(store, kanban_adapter=adapter))
        body = client.get("/stewardship/v1/onboard/discover").json()
        assert body["projects"] == []
        assert body["other_profiles"] == [{"name": "alpha", "project_count": 3}]
    finally:
        store.close()
