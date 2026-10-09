"""P addendum: database-safety fixes 1-4.

Nothing here touches the operator's real database: every database lives in
pytest's tmp_path, and subprocesses get an empty HERMES_HOME.
"""
from __future__ import annotations

import hashlib
import importlib.util
import json
import os
import sqlite3
import subprocess
import sys
from pathlib import Path

import pytest

from hermes_project_stewardship.persistence import migrations
from hermes_project_stewardship.persistence import store as store_module
from hermes_project_stewardship.persistence.schema_guard import (
    HOST_TABLE_DDL,
    SchemaDriftError,
    _schema,
    expected_schema,
    normalise,
)
from hermes_project_stewardship.persistence.store import Store

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "src"
PLUGIN_DASHBOARD = ROOT / "hermes_dockyard_plugin" / "dashboard"
FIXTURE = Path(__file__).parent / "fixtures" / "v0_3_0_migrations.py"


def _clean_env(home: Path) -> dict:
    env = dict(os.environ, HERMES_HOME=str(home), HERMES_KANBAN_HOME=str(home),
               PYTHONPATH=str(SRC))
    for name in ("STEWARD_DB_PATH", "DOCKYARD_PLUGIN_DB", "HPS_TEST_STATE_ROOT"):
        env.pop(name, None)
    return env


def _files(root: Path) -> list:
    return sorted(str(p.relative_to(root)) for p in root.rglob("*") if p.is_file())


def _sha(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def _v030():
    spec = importlib.util.spec_from_file_location("hps_v0_3_0_migrations", FIXTURE)
    assert spec is not None and spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


def _build(path: Path, migration_list, *, stop_at=None) -> None:
    """Build a database by hand from a migration list, recording the ledger."""
    cx = sqlite3.connect(path)
    cx.execute("PRAGMA foreign_keys=OFF")
    cx.execute("CREATE TABLE schema_migrations (version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL)")
    for m in migration_list:
        if stop_at is not None and m.version > stop_at:
            break
        cx.executescript(m.upgrade_sql)
        cx.execute("INSERT INTO schema_migrations VALUES (?, '2026-01-01')", (m.version,))
    cx.commit()
    cx.close()


# ------------------------------------------------------------------ fix 1 --
def test_fix1_importing_every_module_opens_no_database(tmp_path):
    home = tmp_path / "home"
    home.mkdir()
    db_dir = tmp_path / "db"
    db_dir.mkdir()
    env = _clean_env(home)
    env["STEWARD_DB_PATH"] = str(db_dir / "dockyard.db")
    script = (
        "import importlib, pkgutil, hermes_project_stewardship as p\n"
        "names = [m.name for m in pkgutil.walk_packages(p.__path__, p.__name__ + '.')]\n"
        "for name in names:\n"
        "    importlib.import_module(name)\n"
        "import hermes_project_stewardship.api.server as s\n"
        "assert not hasattr(s, 'app'), 'module-level app must not exist'\n"
        "print('IMPORTED', len(names))\n"
    )
    result = subprocess.run([sys.executable, "-c", script], env=env, cwd=tmp_path,
                            capture_output=True, text=True, timeout=180)
    assert result.returncode == 0, result.stderr[-3000:]
    assert "IMPORTED" in result.stdout
    assert int(result.stdout.split("IMPORTED")[1].split()[0]) > 20
    assert _files(home) == [] and _files(db_dir) == []
    assert not any(tmp_path.glob("*.db"))


# ------------------------------------------------------------------ fix 2 --
def _run(code: str, env: dict, cwd: Path) -> subprocess.CompletedProcess:
    return subprocess.run([sys.executable, "-c", code], env=env, cwd=cwd,
                          capture_output=True, text=True, timeout=180)


@pytest.mark.parametrize("call", [
    "from hermes_project_stewardship.runtime import open_store; open_store()",
    "from hermes_project_stewardship.api.server import create_app; create_app()",
    "from hermes_project_stewardship.runtime import resolve_db_path; resolve_db_path()",
])
def test_fix2_no_path_outside_host_raises_and_creates_nothing(tmp_path, call):
    home = tmp_path / "home"
    home.mkdir()
    result = _run(call, _clean_env(home), tmp_path)
    assert result.returncode != 0
    assert "StateSelectionError" in result.stderr and "STEWARD_DB_PATH" in result.stderr
    assert _files(home) == []


def test_fix2_store_requires_a_path():
    with pytest.raises(TypeError):
        Store()  # type: ignore[call-arg]


def test_fix2_stewardctl_from_checkout_refuses_without_db(tmp_path):
    home = tmp_path / "home"
    home.mkdir()
    stewardctl = Path(sys.executable).parent / "stewardctl"
    if not stewardctl.exists():
        pytest.skip("stewardctl console script not installed in this venv")
    result = subprocess.run([str(stewardctl), "audit", "--limit", "1"], env=_clean_env(home),
                            cwd=tmp_path, capture_output=True, text=True, timeout=180)
    assert result.returncode != 0
    assert "STEWARD_DB_PATH" in result.stderr
    assert _files(home) == []
    explicit = tmp_path / "chosen.db"
    ok = subprocess.run([str(stewardctl), "--db", str(explicit), "audit", "--limit", "1"],
                        env=_clean_env(home), cwd=tmp_path, capture_output=True,
                        text=True, timeout=180)
    assert ok.returncode == 0, ok.stderr
    assert explicit.exists() and _files(home) == []


_PLUGIN_HARNESS = r"""
import importlib.util, json, sys
sys.path.insert(0, {src!r})
spec = importlib.util.spec_from_file_location({name!r}, {path!r})
mod = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = mod
spec.loader.exec_module(mod)
out = {{"startup_error": mod._startup_error, "has_store": mod._store is not None,
        "db": str(mod._DB) if mod._DB else None}}
if mod._startup_error:
    exc = mod._degraded_503()
    out["status"] = exc.status_code
    out["detail"] = exc.detail
print("RESULT::" + json.dumps(out))
"""


def _load_plugin(tmp_path: Path, module_name: str, env: dict) -> dict:
    code = _PLUGIN_HARNESS.format(src=str(SRC), name=module_name,
                                  path=str(PLUGIN_DASHBOARD / "plugin_api.py"))
    result = _run(code, env, tmp_path)
    assert result.returncode == 0, "plugin import crashed the host:\n" + result.stderr[-3000:]
    line = next(x for x in result.stdout.splitlines() if x.startswith("RESULT::"))
    return json.loads(line[len("RESULT::"):])


def test_fix2_host_load_uses_profile_default(tmp_path):
    home = tmp_path / "home"
    home.mkdir()
    out = _load_plugin(tmp_path, "hermes_dashboard_plugin_hermes-project-stewardship", _clean_env(home))
    assert out["startup_error"] is None and out["has_store"] is True
    assert out["db"] == str(home / "plugin-data" / "hermes-dockyard" / "dockyard.db")


def test_fix2_adhoc_plugin_import_refuses_default_and_creates_nothing(tmp_path):
    home = tmp_path / "home"
    home.mkdir()
    out = _load_plugin(tmp_path, "plugin_api", _clean_env(home))
    assert out["has_store"] is False and out["status"] == 503
    assert "STEWARD_DB_PATH" in out["startup_error"]
    assert _files(home) == []


def _run_py(tmp_path, code, home):
    return subprocess.run([sys.executable, "-c", code], cwd=tmp_path, env=_clean_env(home),
                          capture_output=True, text=True, timeout=60)


def test_d1_importing_hermes_cli_does_not_unlock_the_default(tmp_path):
    """Quan D1: a process that merely has hermes_cli loaded must name a path."""
    home = tmp_path / "home"
    home.mkdir()
    r = _run_py(tmp_path, """
import sys, types
sys.modules["hermes_cli"] = types.ModuleType("hermes_cli")
from hermes_project_stewardship.runtime import resolve_db_path, StateSelectionError
try:
    print("RESOLVED", resolve_db_path())
except StateSelectionError:
    print("REFUSED")
""", home)
    assert r.returncode == 0, r.stderr
    assert r.stdout.strip() == "REFUSED", r.stdout
    assert _files(home) == []


def test_d1_real_host_entry_point_keeps_the_default(tmp_path):
    """The Hermes host calls register(); after that the profile default is allowed."""
    home = tmp_path / "home"
    home.mkdir()
    r = _run_py(tmp_path, """
from hermes_project_stewardship.runtime import resolve_db_path, StateSelectionError
try:
    resolve_db_path(); print("BEFORE allowed")
except StateSelectionError:
    print("BEFORE refused")
class Ctx:
    def register_tool(self, **kw): pass
    def register_command(self, **kw): pass
    def register_skill(self, *a): pass
    def register_cli_command(self, **kw): pass
from hermes_project_stewardship.plugin import register
register(Ctx())
print("AFTER", resolve_db_path())
""", home)
    assert r.returncode == 0, r.stderr
    lines = r.stdout.strip().splitlines()
    assert lines[0] == "BEFORE refused"
    assert lines[1] == f"AFTER {(home / 'plugin-data' / 'hermes-dockyard' / 'dockyard.db').resolve()}"
    assert _files(home) == []  # resolving creates nothing


def test_fix2_installed_stewardctl_may_use_default(monkeypatch):
    from hermes_project_stewardship import runtime
    # Earlier tests may load real host modules; this test is about the CLI alone.
    for name in [n for n in sys.modules if n.startswith("hermes_dashboard_plugin_")]:
        monkeypatch.delitem(sys.modules, name)
    monkeypatch.setattr(runtime, "_HOST_REGISTERED", False)
    monkeypatch.setattr(sys, "argv", ["/usr/local/bin/stewardctl", "audit"])
    monkeypatch.setattr(runtime, "_inside_git_checkout", lambda _path: False)
    assert runtime.default_location_allowed() is True
    monkeypatch.setattr(runtime, "_inside_git_checkout", lambda _path: True)
    assert runtime.default_location_allowed() is False


# ------------------------------------------------------------------ fix 3 --
def _refused(path: Path, match: str) -> None:
    before = _sha(path)
    with pytest.raises(SchemaDriftError, match=match):
        Store(path)
    assert _sha(path) == before, "a refused database must not be written"


def test_fix3_unknown_version_refused(tmp_path):
    db = tmp_path / "unknown.db"
    _build(db, migrations.MIGRATIONS)
    cx = sqlite3.connect(db)
    cx.execute("DELETE FROM schema_migrations WHERE version = 20")
    cx.execute("INSERT INTO schema_migrations VALUES (0, 'x')")
    cx.commit()
    cx.close()
    _refused(db, "does not know")


def test_fix3_ledger_gap_refused(tmp_path):
    db = tmp_path / "gap.db"
    _build(db, migrations.MIGRATIONS)
    cx = sqlite3.connect(db)
    cx.execute("DELETE FROM schema_migrations WHERE version = 29")
    cx.commit()
    cx.close()
    _refused(db, r"gap: version\(s\) \[29\]")


def test_fix3_same_number_different_ddl_refused(tmp_path):
    """A P-draft v31 recorded as 31 is not W's v31: refused, not skipped."""
    db = tmp_path / "pdraft.db"
    _build(db, migrations.MIGRATIONS, stop_at=30)
    cx = sqlite3.connect(db)
    cx.executescript("""
        CREATE TABLE canvas_plans (plan_id TEXT PRIMARY KEY, project_id TEXT NOT NULL);
        INSERT INTO schema_migrations VALUES (31, '2026-09-27');
    """)
    cx.commit()
    cx.close()
    _refused(db, "differs from what this code builds")


def test_fix3_missing_w_v31_tables_refused(tmp_path):
    db = tmp_path / "no-w.db"
    _build(db, migrations.MIGRATIONS, stop_at=31)
    cx = sqlite3.connect(db)
    cx.execute("DROP TABLE dockyard_global_workflows")
    cx.commit()
    cx.close()
    _refused(db, r"missing: \[.*dockyard_global_workflows")


def test_fix3_tables_without_ledger_refused(tmp_path):
    db = tmp_path / "no-ledger.db"
    cx = sqlite3.connect(db)
    cx.execute("CREATE TABLE project_stewardship (project_id TEXT PRIMARY KEY)")
    cx.commit()
    cx.close()
    _refused(db, "no migration ledger")


def test_fix3_newer_database_still_reports_newer(tmp_path):
    db = tmp_path / "newer.db"
    _build(db, migrations.MIGRATIONS)
    cx = sqlite3.connect(db)
    cx.execute("INSERT INTO schema_migrations VALUES (999, 'x')")
    cx.commit()
    cx.close()
    with pytest.raises(store_module.NewerSchemaError):
        Store(db)


def test_fix3_healthy_databases_open(tmp_path):
    fresh = Store(tmp_path / "fresh.db")
    assert fresh.schema_version == migrations.SCHEMA_VERSION
    fresh.close()
    reopened = Store(tmp_path / "fresh.db")  # second open re-runs the check
    reopened.close()
    from hermes_project_stewardship.kanban.bridge import ReferenceKanbanAdapter
    store = Store(tmp_path / "bridge.db")
    ReferenceKanbanAdapter(store)
    store.close()
    Store(tmp_path / "bridge.db").close()  # host kanban tables are accepted


def test_fix3_host_table_ddl_matches_the_bridge():
    from hermes_project_stewardship.kanban.bridge import ReferenceKanbanAdapter
    assert normalise(HOST_TABLE_DDL) == normalise(ReferenceKanbanAdapter.SCHEMA)


def test_fix3_plugin_shows_503_and_host_survives(tmp_path):
    db = tmp_path / "drift.db"
    _build(db, migrations.MIGRATIONS)
    cx = sqlite3.connect(db)
    cx.execute("DELETE FROM schema_migrations WHERE version = 12")
    cx.commit()
    cx.close()
    before = _sha(db)
    home = tmp_path / "home"
    home.mkdir()
    env = _clean_env(home)
    env["STEWARD_DB_PATH"] = str(db)
    out = _load_plugin(tmp_path, "hermes_dashboard_plugin_hermes-project-stewardship", env)
    assert out["has_store"] is False and out["status"] == 503
    assert "gap" in out["startup_error"] and "stewardctl db repair" in out["detail"]
    assert _sha(db) == before


# ------------------------------------------------------------------ fix 4 --
def test_fix4a_v1_to_v17_match_released_v0_3_0():
    frozen = _v030()
    assert [m.version for m in frozen.MIGRATIONS] == list(range(1, 18))
    current = {m.version: m for m in migrations.MIGRATIONS}
    for old in frozen.MIGRATIONS:
        new = current[old.version]
        assert (new.name, new.upgrade_sql, new.downgrade_sql) == \
            (old.name, old.upgrade_sql, old.downgrade_sql), f"v{old.version} was edited"


V0_3_0_MIGRATIONS_SHA256 = "f8996e4b051600b9db66188848185a214cbcc0c9c86a38e07b7b0fa3cb95d92d"


def test_fix4a_fixture_hash_is_pinned():
    """Runs even where the v0.3.0 tag is absent (CI clones without tags; Quan D5)."""
    import hashlib
    assert hashlib.sha256(FIXTURE.read_bytes()).hexdigest() == V0_3_0_MIGRATIONS_SHA256


def test_fix4a_fixture_is_the_tagged_release():
    tagged = subprocess.run(
        ["git", "show", "v0.3.0:src/hermes_project_stewardship/persistence/migrations.py"],
        cwd=ROOT, capture_output=True, text=True)
    if tagged.returncode != 0:
        pytest.skip("git tag v0.3.0 not available in this checkout")
    assert FIXTURE.read_text() == tagged.stdout


def test_fix4b_v0_3_0_database_upgrades_to_fresh_schema_with_rows(tmp_path):
    db = tmp_path / "v030.db"
    _build(db, _v030().MIGRATIONS)
    cx = sqlite3.connect(db)
    cx.execute("PRAGMA foreign_keys=ON")
    cx.execute("INSERT INTO project_stewardship (project_id, enabled, mission, created_at, updated_at)"
               " VALUES ('p1', 1, 'ship it', '2026-01-01', '2026-01-01')")
    cx.execute("INSERT INTO dockyard_work_items (project_id, ref, type, title, created_at, updated_at)"
               " VALUES ('p1', 'P1-1', 'epic', 'Epic', '2026-01-01', '2026-01-01')")
    cx.execute("INSERT INTO dockyard_work_items (project_id, ref, type, title, parent_id, created_at, updated_at)"
               " VALUES ('p1', 'P1-2', 'task', 'Task', 1, '2026-01-01', '2026-01-01')")
    cx.execute("INSERT INTO stewardship_audit_log (ts, actor, interface, action, subject)"
               " VALUES ('2026-01-01', 'sahil', 'cli', 'enable', 'p1')")
    with pytest.raises(sqlite3.IntegrityError):  # the released schema rejects 'feature'
        cx.execute("INSERT INTO dockyard_work_items (project_id, ref, type, title, created_at, updated_at)"
                   " VALUES ('p1', 'P1-3', 'feature', 'F', '2026-01-01', '2026-01-01')")
    cx.commit()
    tables = ("project_stewardship", "dockyard_work_items", "stewardship_audit_log")
    before = {t: cx.execute(f"SELECT * FROM {t} ORDER BY rowid").fetchall() for t in tables}
    cx.close()

    upgraded = Store(db)
    try:
        assert upgraded.schema_version == migrations.SCHEMA_VERSION
        assert _schema(upgraded._conn) == expected_schema(
            [m.version for m in migrations.MIGRATIONS])
        for table, rows in before.items():
            got = [tuple(r) for r in upgraded._conn.execute(
                f"SELECT * FROM {table} ORDER BY rowid")]
            width = len(rows[0])
            assert [r[:width] for r in got] == rows, table
        assert upgraded._conn.execute("PRAGMA foreign_key_check").fetchall() == []
        upgraded._conn.execute(
            "INSERT INTO dockyard_work_items (project_id, ref, type, title, created_at, updated_at)"
            " VALUES ('p1', 'P1-3', 'feature', 'F', '2026-01-01', '2026-01-01')")
    finally:
        upgraded.close()


def test_fix4c_versions_strictly_ascending_and_unique():
    versions = [m.version for m in migrations.MIGRATIONS]
    assert versions == sorted(set(versions))
    assert versions == list(range(1, len(versions) + 1))
    assert migrations.SCHEMA_VERSION == versions[-1]
    assert next(m for m in migrations.MIGRATIONS if m.version == 31).name.startswith("scoped workflow")


def test_fix4_v34_downgrade_restores_release_and_refuses_feature_rows(tmp_path):
    v34 = next(m for m in migrations.MIGRATIONS if m.version == 34)
    store = Store(tmp_path / "down.db")
    try:
        cx = store._conn
        cx.execute("INSERT INTO project_stewardship (project_id, created_at, updated_at)"
                   " VALUES ('p', 'x', 'x')")
        cx.execute("INSERT INTO dockyard_work_items (project_id, ref, type, title, created_at, updated_at)"
                   " VALUES ('p', 'P-1', 'feature', 'F', 'x', 'x')")
        cx.commit()
        with pytest.raises(sqlite3.IntegrityError):
            cx.executescript("BEGIN;" + v34.downgrade_sql + "COMMIT;")
        cx.rollback()
        assert cx.execute("SELECT type FROM dockyard_work_items").fetchall()[0][0] == "feature"
        cx.execute("DELETE FROM dockyard_work_items")
        cx.commit()
        cx.executescript(v34.downgrade_sql)
        cx.execute("DELETE FROM schema_migrations WHERE version = 34")
        cx.commit()
        # Downgrading 34 must restore exactly the schema of every OTHER current
        # migration (the v33 release shape plus later lanes' migrations, which
        # this downgrade has no business touching).
        others = [m.version for m in migrations.MIGRATIONS if m.version != 34]
        assert _schema(cx) == expected_schema(others)
    finally:
        store.close()
