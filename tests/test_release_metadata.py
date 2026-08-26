from __future__ import annotations

import json
from pathlib import Path
import tomllib

from hermes_project_stewardship.api.server import create_app
from hermes_project_stewardship.cli.ui import __version__
from hermes_project_stewardship.persistence.store import Store


ROOT = Path(__file__).resolve().parents[1]


def test_active_release_metadata_is_coherent(tmp_path):
    version = "0.2.0rc2"
    project = tomllib.loads((ROOT / "pyproject.toml").read_text(encoding="utf-8"))
    assert project["project"]["version"] == version
    assert __version__ == version
    manifest = json.loads(
        (ROOT / "hermes_dockyard_plugin/dashboard/manifest.json").read_text(
            encoding="utf-8"))
    package = json.loads(
        (ROOT / "hermes_dockyard_plugin/dashboard/package.json").read_text(
            encoding="utf-8"))
    package_lock = json.loads(
        (ROOT / "hermes_dockyard_plugin/dashboard/package-lock.json").read_text(
            encoding="utf-8"))
    plugin_text = (ROOT / "plugin.yaml").read_text(encoding="utf-8")
    assert manifest["version"] == version
    assert package["version"] == version
    assert package_lock["version"] == version
    assert package_lock["packages"][""]["version"] == version
    assert f"version: {version}" in plugin_text
    store = Store(tmp_path / "version.db")
    app = create_app(store)
    assert app.version == version
    store.close()
    assert version in (ROOT / "README.md").read_text(encoding="utf-8")
    assert f"[{version}]" in (ROOT / "CHANGELOG.md").read_text(encoding="utf-8")
