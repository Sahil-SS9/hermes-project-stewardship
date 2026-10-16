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
