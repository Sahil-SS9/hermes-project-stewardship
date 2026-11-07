"""Issue #38: the dashboard Hermes installs is a real directory, never a Git symlink.

Hermes finds a plugin's dashboard at ``<plugin>/dashboard/manifest.json`` and mounts
its backend from the manifest's ``api`` file. The repository used to ship
``dashboard`` as a Git symlink into ``hermes_dockyard_plugin/dashboard``. Git for
Windows checks a symlink out as a small text file holding the target path
(``core.symlinks=false``, its default), so Hermes found no manifest, the
``/api/plugins/hermes-project-stewardship/`` routes were never mounted and the
onboarding wizard reported "Host discovery failed".

The source stays in ``hermes_dockyard_plugin/dashboard/``; its build publishes the
files Hermes reads at runtime into the top-level ``dashboard/`` as regular files,
the same arrangement as ``desktop/plugin.js``. Pinned here:

- the repository tracks no symlink at all (any OS, any Git setting);
- the published directory is real and holds exactly the manifest's runtime files,
  byte-identical to the source;
- Hermes' own dashboard discovery finds the published copy and its backend API.
"""
from __future__ import annotations

import json
import shutil
import subprocess
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "hermes_dockyard_plugin" / "dashboard"
PUBLISHED = ROOT / "dashboard"
REBUILD = "run `npm run build` in hermes_dockyard_plugin/dashboard and commit the result"


def _manifest() -> dict:
    return json.loads((SOURCE / "manifest.json").read_text(encoding="utf-8"))


def _runtime_files() -> list[str]:
    manifest = _manifest()
    return ["manifest.json", manifest["api"], manifest["entry"], manifest["css"]]


def _published_files() -> set[str]:
    return {
        path.relative_to(PUBLISHED).as_posix()
        for path in PUBLISHED.rglob("*")
        if path.is_file() and "__pycache__" not in path.parts
    }


def test_the_repository_tracks_no_symlinks():
    if shutil.which("git") is None or not (ROOT / ".git").exists():
        pytest.skip("needs a Git checkout of the repository")
    listed = subprocess.run(
        ["git", "ls-files", "-s"], cwd=ROOT, capture_output=True, text=True, check=True,
    ).stdout.splitlines()
    links = [line.split("\t", 1)[1] for line in listed if line.startswith("120000 ")]
    assert links == [], (
        f"tracked symlinks {links}: Git for Windows checks them out as text files "
        "(core.symlinks=false), so Hermes cannot read through them"
    )


def test_the_published_dashboard_is_a_real_directory():
    assert not PUBLISHED.is_symlink(), "dashboard/ must be a real directory, not a symlink"
    assert PUBLISHED.is_dir(), f"dashboard/ is missing: {REBUILD}"
    for relative in _runtime_files():
        target = PUBLISHED / relative
        assert target.is_file() and not target.is_symlink(), f"dashboard/{relative} must be a regular file"


def test_the_published_dashboard_matches_its_source():
    assert _published_files() == set(_runtime_files()), (
        f"dashboard/ must hold exactly the manifest's runtime files: {REBUILD}"
    )
    for relative in _runtime_files():
        assert (PUBLISHED / relative).read_bytes() == (SOURCE / relative).read_bytes(), (
            f"dashboard/{relative} is STALE: {REBUILD}"
        )


def test_the_manifest_names_files_inside_the_published_directory():
    for relative in _runtime_files()[1:]:
        assert not Path(relative).is_absolute() and ".." not in Path(relative).parts
        resolved = (PUBLISHED / relative).resolve()
        assert resolved.is_relative_to(PUBLISHED.resolve()), relative


def test_hermes_discovers_the_published_dashboard_and_its_api(tmp_path):
    """Hermes' own discovery, on a copy laid out as an installed plugin."""
    dashboard_host = pytest.importorskip("hermes_cli.web_server_dashboard")
    plugins = tmp_path / "plugins"
    shutil.copytree(PUBLISHED, plugins / "hermes-project-stewardship" / "dashboard")
    found = [
        entry for entry in dashboard_host._discover_dashboard_plugins(search_dirs=[(plugins, "user")])
        if entry["name"] == "hermes-project-stewardship"
    ]
    assert len(found) == 1, "Hermes did not discover the dashboard plugin"
    assert found[0]["has_api"] is True
    assert found[0]["_api_file"] == _manifest()["api"]
