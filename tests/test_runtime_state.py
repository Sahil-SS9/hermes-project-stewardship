"""Default surfaces must observe one store without touching a real Hermes home."""
from __future__ import annotations

import json
import os
from pathlib import Path
import subprocess
import sys

import pytest

from hermes_project_stewardship.persistence.store import Store
from hermes_project_stewardship.persistence.service import StewardshipService

ROOT = Path(__file__).resolve().parents[1]


def run_surface(tmp_path, code, **overrides):
    env = dict(os.environ)
    for name in ("STEWARD_DB_PATH", "DOCKYARD_PLUGIN_DB", "STEWARD_RPC_TOKEN"):
        env.pop(name, None)
    env.update(HOME=str(tmp_path / "os-home"),
               HERMES_HOME=str(tmp_path / "profile"), PYTHONDONTWRITEBYTECODE="1")
    env.update(overrides)
    return subprocess.run([sys.executable, "-c", code], cwd=tmp_path, env=env,
                          capture_output=True, text=True, timeout=40)


def test_default_surfaces_observe_the_same_project(tmp_path):
    result = run_surface(tmp_path, f'''
import sys, importlib, json, io, contextlib
sys.modules["httpx"] = importlib.import_module("httpx2")
from hermes_project_stewardship.plugin import PluginState
from hermes_project_stewardship.cli.app import main
from hermes_project_stewardship.persistence.service import StewardshipService
from hermes_project_stewardship.api.server import create_app
from fastapi.testclient import TestClient
state = PluginState.services()
state.enable("shared", mission="one state", lead_profile="test")
cli_output = io.StringIO()
with contextlib.redirect_stdout(cli_output):
    cli_code = main(["project", "status", "shared", "--json"])
cli = json.loads(cli_output.getvalue()) if cli_code == 0 else {{}}
app = create_app(auth_token="fixture-token")
with TestClient(app) as client:
    api = client.get("/stewardship/v1/projects", headers={{"Authorization": "Bearer fixture-token"}}).json()
sys.path.insert(0, {str(ROOT / "hermes_dockyard_plugin/dashboard")!r})
import plugin_api
print(json.dumps({{"core": str(state.store.db_path),
                  "cli": cli.get("settings", {{}}).get("project_id"),
                  "api": [p["project_id"] for p in api["projects"]],
                  "plugin": [p["project_id"] for p in StewardshipService(plugin_api._store).list_projects()]}}))
''')
    assert result.returncode == 0, result.stderr
    output = json.loads(result.stdout)
    expected = tmp_path / "profile/plugin-data/hermes-dockyard/dockyard.db"
    assert output == {"core": str(expected), "cli": "shared",
                      "api": ["shared"], "plugin": ["shared"]}


def test_runtime_override_is_read_after_cli_import(tmp_path):
    result = run_surface(tmp_path, '''
import os
from pathlib import Path
from hermes_project_stewardship.cli.app import main
os.environ["STEWARD_DB_PATH"] = str(Path.cwd() / "late.db")
assert main(["project", "enable", "late", "--lead", "test"]) == 0
print((Path.cwd() / "late.db").exists())
''')
    assert result.returncode == 0, result.stderr
    assert result.stdout.splitlines()[-1] == "True"


@pytest.mark.parametrize("name", ["STEWARD_DB_PATH", "DOCKYARD_PLUGIN_DB"])
def test_both_environment_overrides_are_supported(tmp_path, name):
    target = tmp_path / "chosen.db"
    result = run_surface(tmp_path, '''
from hermes_project_stewardship.plugin import PluginState
s = PluginState.services().store
print(s.db_path)
s.close()
''', **{name: str(target)})
    assert result.returncode == 0, result.stderr
    assert result.stdout.strip() == str(target)


def test_legacy_populated_database_blocks_silent_empty_default(tmp_path):
    legacy = tmp_path / "profile/stewardship.db"
    store = Store(legacy)
    StewardshipService(store).enable("preserve", mission="keep me", lead_profile="test")
    store.close()
    before = legacy.read_bytes()
    result = run_surface(tmp_path, '''
from hermes_project_stewardship.plugin import PluginState
PluginState.services()
''')
    assert result.returncode != 0
    assert "STEWARD_DB_PATH" in result.stderr
    assert legacy.read_bytes() == before
    assert not (tmp_path / "profile/plugin-data/hermes-dockyard/dockyard.db").exists()


def test_explicit_database_preserves_existing_selection(tmp_path):
    explicit = tmp_path / "selected.db"
    result = run_surface(tmp_path, f'''
from pathlib import Path
from hermes_project_stewardship.plugin import PluginState
PluginState.db_path = Path({str(explicit)!r})
print(PluginState.services().store.db_path)
PluginState.reset()
''', STEWARD_DB_PATH=str(tmp_path / "env.db"))
    assert result.returncode == 0, result.stderr
    assert result.stdout.strip() == str(explicit)
    assert not (tmp_path / "env.db").exists()


def test_resolver_boundaries_do_not_hide_or_change_data(tmp_path, monkeypatch):
    from hermes_project_stewardship.runtime import StateSelectionError, resolve_db_path
    monkeypatch.chdir(tmp_path)
    monkeypatch.setenv("HERMES_HOME", str(tmp_path / "profile"))
    monkeypatch.delenv("DOCKYARD_PLUGIN_DB", raising=False)
    monkeypatch.delenv("STEWARD_DB_PATH", raising=False)
    expected = tmp_path / "profile/plugin-data/hermes-dockyard/dockyard.db"
    assert resolve_db_path() == expected
    assert not expected.parent.exists()
    legacy = tmp_path / "stewardship.db"
    store = Store(legacy)
    store.close()
    assert resolve_db_path() == expected  # Schema-only legacy DB is not user data.
    store = Store(legacy)
    StewardshipService(store).enable("kept", lead_profile="test")
    store.close()
    with pytest.raises(StateSelectionError, match="STEWARD_DB_PATH"):
        resolve_db_path()
    monkeypatch.setenv("DOCKYARD_PLUGIN_DB", str(tmp_path / "alias.db"))
    assert resolve_db_path() == tmp_path / "alias.db"
    monkeypatch.setenv("STEWARD_DB_PATH", str(tmp_path / "preferred.db"))
    assert resolve_db_path() == tmp_path / "preferred.db"
    assert resolve_db_path(legacy) == legacy
    monkeypatch.delenv("DOCKYARD_PLUGIN_DB")
    monkeypatch.delenv("STEWARD_DB_PATH")
    legacy.write_bytes(b"corrupt database must not be replaced")
    with pytest.raises(StateSelectionError, match="inspect"):
        resolve_db_path()
    assert legacy.read_bytes() == b"corrupt database must not be replaced"


@pytest.mark.skipif(os.name != "posix", reason="POSIX permissions")
def test_factory_secures_managed_directory_but_preserves_explicit_parent(tmp_path, monkeypatch):
    from hermes_project_stewardship.runtime import open_store
    monkeypatch.chdir(tmp_path)
    monkeypatch.setenv("HERMES_HOME", str(tmp_path / "profile"))
    monkeypatch.delenv("DOCKYARD_PLUGIN_DB", raising=False)
    monkeypatch.delenv("STEWARD_DB_PATH", raising=False)
    managed = tmp_path / "profile/plugin-data/hermes-dockyard"
    managed.mkdir(parents=True, mode=0o755)
    managed.chmod(0o755)
    opened = open_store()
    opened.close()
    assert managed.stat().st_mode & 0o777 == 0o700
    assert (managed / "dockyard.db").stat().st_mode & 0o777 == 0o600
    explicit = tmp_path / "user-managed"
    explicit.mkdir(mode=0o755)
    opened = open_store(explicit / "chosen.db")
    opened.close()
    assert explicit.stat().st_mode & 0o777 == 0o755


def test_distinct_profiles_remain_isolated(tmp_path, monkeypatch):
    from hermes_project_stewardship.runtime import open_store
    monkeypatch.chdir(tmp_path)
    monkeypatch.delenv("DOCKYARD_PLUGIN_DB", raising=False)
    monkeypatch.delenv("STEWARD_DB_PATH", raising=False)
    for name, expected in (("first", []), ("second", []), ("first", ["only-here"])):
        monkeypatch.setenv("HERMES_HOME", str(tmp_path / name))
        store = open_store()
        svc = StewardshipService(store)
        assert [p["project_id"] for p in svc.list_projects()] == expected
        if name == "first" and not expected:
            svc.enable("only-here", lead_profile="test")
        store.close()


def test_conflicting_stores_are_preserved_and_restore_is_rehearsable(tmp_path, monkeypatch):
    from hermes_project_stewardship.persistence.backup import export_store, restore_store
    from hermes_project_stewardship.runtime import StateSelectionError, open_store
    monkeypatch.chdir(tmp_path)
    monkeypatch.setenv("HERMES_HOME", str(tmp_path / "profile"))
    monkeypatch.delenv("DOCKYARD_PLUGIN_DB", raising=False)
    monkeypatch.delenv("STEWARD_DB_PATH", raising=False)
    legacy = tmp_path / "stewardship.db"
    canonical = tmp_path / "profile/plugin-data/hermes-dockyard/dockyard.db"
    before = {}
    for path, project in ((legacy, "legacy"), (canonical, "canonical")):
        store = Store(path)
        StewardshipService(store).enable(project, lead_profile="test")
        store.close()
        before[path] = path.read_bytes()
    with pytest.raises(StateSelectionError, match="No data was moved"):
        open_store()
    for path in before:
        assert path.read_bytes() == before[path]
    selected = open_store(legacy)
    export_store(selected, tmp_path / "backup")
    selected.close()
    restored = tmp_path / "restored.db"
    restore_store(tmp_path / "backup", restored)
    reopened = open_store(restored)
    assert StewardshipService(reopened).settings("legacy")["project_id"] == "legacy"
    reopened.close()
