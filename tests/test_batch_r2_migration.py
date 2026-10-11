"""Batch R2 migration: three Roadmap tables, backfill, downgrade, upgrade parity.

The migration is located by NAME, never by number: Kensei renumbers it to the
next free slot when it merges, and these tests must survive that.
"""
from __future__ import annotations

import sqlite3

import pytest

from hermes_project_stewardship.persistence import migrations, store as store_module
from hermes_project_stewardship.persistence.store import Store

R2_NAME = "roadmap links and goal contracts"
NEW_TABLES = ("project_goal_contracts", "project_objective_deliveries",
              "initiative_milestones")
NEW_INDEXES = ("idx_objective_deliveries_initiative", "idx_initiative_milestones_milestone")


def _r2():
    matches = [m for m in migrations.MIGRATIONS if m.name == R2_NAME]
    assert len(matches) == 1, "exactly one R2 migration must exist"
    return matches[0]


def _store_without_r2(path, monkeypatch):
    """A database as it stands just before R2 (every earlier migration)."""
    r2 = _r2()
    with monkeypatch.context() as context:
        context.setattr(
            store_module, "MIGRATIONS",
            [m for m in migrations.MIGRATIONS if m.version < r2.version])
        return Store(path)


def _schema(cx) -> list[tuple]:
    """Normalised sqlite_master: what a fresh build and an upgrade must share."""
    return [tuple(" ".join((row[3] or "").split()) if i == 3 else row[i] for i in range(4))
            for row in cx.execute(
                "SELECT type,name,tbl_name,sql FROM sqlite_master "
                "WHERE name NOT LIKE 'sqlite_%' ORDER BY type,name")]


def _rows(cx, table, cols="*"):
    return [tuple(r) for r in cx.execute(f"SELECT {cols} FROM {table} ORDER BY rowid")]


def _cols(cx, table):
    """The table's columns as they are now, for reading the same ones after a
    later migration adds more (v41 added one to project_stewardship)."""
    return ", ".join(f'"{r[1]}"' for r in cx.execute(f"PRAGMA table_info({table})"))


def _all_tables(cx, exclude=()):
    return [r[0] for r in cx.execute(
        "SELECT name FROM sqlite_master WHERE type='table' "
        "AND name NOT LIKE 'sqlite_%' ORDER BY name") if r[0] not in exclude]


def _seed_legacy(cx):
    """Representative pre-R2 rows: goals (active + archived), objectives,
    initiatives, milestones with items, and a goal link."""
    cx.execute("INSERT INTO project_stewardship(project_id,enabled,created_at,updated_at)"
               " VALUES('p1',1,'2026-01-01','2026-01-01')")
    cx.execute("INSERT INTO project_stewardship(project_id,enabled,created_at,updated_at)"
               " VALUES('p2',1,'2026-01-01','2026-01-01')")
    cx.execute("INSERT INTO project_goals(goal_id,project_id,title,position,created_at,updated_at)"
               " VALUES('G-1','p1','Ship it',0,'2026-02-01','2026-03-01')")
    cx.execute("INSERT INTO project_goals(goal_id,project_id,title,position,created_at,updated_at)"
               " VALUES('G-2','p2','Second goal',0,'2026-02-02','2026-03-02')")
    cx.execute("INSERT INTO project_goals(goal_id,project_id,title,position,created_at,updated_at,archived_at)"
               " VALUES('G-ARCH','p1','Old goal',1,'2026-02-03','2026-03-03','2026-04-01')")
    cx.execute("INSERT INTO project_objectives(project_id,name,evaluator_type,target)"
               " VALUES('p1','Obj one','manual','>=1')")
    cx.execute("INSERT INTO project_objective_goals(objective_id,goal_id) VALUES(1,'G-1')")
    cx.execute("INSERT INTO project_initiatives(ref,project_id,title,rationale,created_at)"
               " VALUES('INI-1','p1','Initiative','why','2026-02-01')")
    cx.execute("INSERT INTO dockyard_milestones(project_id,name,created_at)"
               " VALUES('p1','Release','2026-02-01')")
    cx.execute("INSERT INTO dockyard_milestone_items(milestone_id,item_ref) VALUES(1,'t-1')")


def test_migration_is_last_and_registered_exactly_once():
    # R2's v35 was the newest lane when Batch R2 merged; later lanes (Batch E)
    # may genuinely follow it. Registered exactly once, ledger maximum intact,
    # and nothing after R2 re-registers R2's name.
    r2_versions = [m.version for m in migrations.MIGRATIONS if m.name == R2_NAME]
    assert r2_versions == [35]
    assert migrations.SCHEMA_VERSION == max(m.version for m in migrations.MIGRATIONS)
    assert all(m.name != R2_NAME for m in migrations.MIGRATIONS if m.version > 35)


def test_fresh_build_equals_upgraded_build(tmp_path, monkeypatch):
    """Schema parity: upgrading a populated pre-R2 DB == building fresh."""
    pre = _store_without_r2(tmp_path / "pre.db", monkeypatch)
    _seed_legacy(pre._conn)
    pre.close()
    upgraded = Store(tmp_path / "pre.db")
    fresh = Store(tmp_path / "fresh.db")
    try:
        assert upgraded.schema_version == fresh.schema_version == migrations.SCHEMA_VERSION
        assert _schema(upgraded._conn) == _schema(fresh._conn)
    finally:
        upgraded.close()
        fresh.close()


def test_upgrade_creates_exactly_the_three_tables_and_two_indexes(tmp_path, monkeypatch):
    pre = _store_without_r2(tmp_path / "pre.db", monkeypatch)
    before_tables = set(_all_tables(pre._conn))
    pre.close()
    # Apply only through R2's v35: Batch E's v36 is a later lane and its tables
    # are asserted in its own suite. R2's delta must still be exactly R2's.
    # Patch both bindings: store.py from-imports MIGRATIONS/SCHEMA_VERSION.
    through_r2 = [m for m in migrations.MIGRATIONS if m.version <= 35]
    monkeypatch.setattr(migrations, "MIGRATIONS", through_r2)
    monkeypatch.setattr(migrations, "SCHEMA_VERSION", 35)
    monkeypatch.setattr(store_module, "MIGRATIONS", through_r2)
    monkeypatch.setattr(store_module, "SCHEMA_VERSION", 35)
    store = Store(tmp_path / "pre.db")
    try:
        after_tables = set(_all_tables(store._conn))
        assert after_tables - before_tables == set(NEW_TABLES)
        assert before_tables - after_tables == set()
        indexes = {r[0] for r in store._conn.execute(
            "SELECT name FROM sqlite_master WHERE type='index'")}
        assert set(NEW_INDEXES) <= indexes
    finally:
        store.close()


def test_backfill_one_contract_per_active_goal_and_nothing_inferred(tmp_path, monkeypatch):
    pre = _store_without_r2(tmp_path / "pre.db", monkeypatch)
    _seed_legacy(pre._conn)
    pre.close()
    store = Store(tmp_path / "pre.db")
    try:
        cx = store._conn
        rows = {r["goal_id"]: dict(r) for r in cx.execute(
            "SELECT * FROM project_goal_contracts")}
        assert set(rows) == {"G-1", "G-2"}, "archived goals get no contract"
        g1 = rows["G-1"]
        assert g1["outcome"] == "Ship it"
        assert (g1["verification"], g1["constraints"], g1["boundaries"], g1["stop_when"]) == ("", "", "", "")
        assert g1["status"] == "active"
        assert g1["max_turns"] == 20
        assert g1["paused_reason"] is None
        assert g1["updated_at"] == "2026-03-01", "existing timestamp preserved"
        # the two link tables start empty: no inference from titles or shared work
        assert cx.execute("SELECT COUNT(*) FROM project_objective_deliveries").fetchone()[0] == 0
        assert cx.execute("SELECT COUNT(*) FROM initiative_milestones").fetchone()[0] == 0
    finally:
        store.close()


def test_upgrade_keeps_every_existing_row(tmp_path, monkeypatch):
    pre = _store_without_r2(tmp_path / "pre.db", monkeypatch)
    _seed_legacy(pre._conn)
    legacy = {t: (_cols(pre._conn, t), _rows(pre._conn, t)) for t in _all_tables(pre._conn)}
    pre.close()
    store = Store(tmp_path / "pre.db")
    try:
        for table, (cols, rows) in legacy.items():
            if table == "schema_migrations":
                continue
            # Every row keeps every value it had; later columns may be added.
            assert _rows(store._conn, table, cols) == rows, table
    finally:
        store.close()


def test_downgrade_removes_only_the_new_tables_then_reupgrades(tmp_path, monkeypatch):
    pre = _store_without_r2(tmp_path / "pre.db", monkeypatch)
    _seed_legacy(pre._conn)
    pre.close()
    store = Store(tmp_path / "pre.db")
    try:
        cx = store._conn
        r2 = _r2()
        # A coherent partial downgrade on a multi-lane ledger: R2's v35 and
        # every later lane (Batch E's v36) go together, leaving the pre-R2
        # world (1..34). Downgrading only v35 would leave a ledger gap that
        # the schema guard rightly refuses.
        for lane in sorted((m.version for m in migrations.MIGRATIONS
                            if m.version >= r2.version), reverse=True):
            lane_m = next(m for m in migrations.MIGRATIONS if m.version == lane)
            cx.executescript(lane_m.downgrade_sql)
            cx.execute("DELETE FROM schema_migrations WHERE version=?", (lane,))
        names = set(_all_tables(cx))
        assert not names & set(NEW_TABLES)
        indexes = {r[0] for r in cx.execute("SELECT name FROM sqlite_master WHERE type='index'")}
        assert not indexes & set(NEW_INDEXES)
        # untouched: goals, links, objectives, initiatives, milestones, items
        assert cx.execute("SELECT COUNT(*) FROM project_goals").fetchone()[0] == 3
        assert cx.execute("SELECT COUNT(*) FROM project_objective_goals").fetchone()[0] == 1
        assert cx.execute("SELECT COUNT(*) FROM project_initiatives").fetchone()[0] == 1
        assert cx.execute("SELECT COUNT(*) FROM dockyard_milestone_items").fetchone()[0] == 1
        store.migrate()
        assert store.schema_version == migrations.SCHEMA_VERSION
        assert cx.execute("SELECT COUNT(*) FROM project_goal_contracts").fetchone()[0] == 2
    finally:
        store.close()


@pytest.fixture()
def populated(tmp_path):
    store = Store(tmp_path / "db.sqlite")
    cx = store._conn
    _seed_legacy(cx)
    # The store migrated while empty, so the backfill saw no goals: add the
    # contract the real create_goal path would have written.
    cx.execute("INSERT INTO project_goal_contracts(goal_id,outcome,updated_at)"
               " VALUES('G-1','Ship it','2026-03-01')")
    cx.execute("INSERT INTO project_objective_deliveries(objective_id,initiative_ref,created_by,created_at)"
               " VALUES(1,'INI-1','owner','2026-05-01')")
    cx.execute("INSERT INTO initiative_milestones(initiative_ref,milestone_id,created_by,created_at)"
               " VALUES('INI-1',1,'owner','2026-05-01')")
    yield store
    store.close()


def test_defaults_and_checks(populated):
    cx = populated._conn
    assert cx.execute("SELECT relationship FROM project_objective_deliveries").fetchone()[0] == "supports"
    assert cx.execute("SELECT relationship FROM initiative_milestones").fetchone()[0] == "delivers"
    with pytest.raises(sqlite3.IntegrityError):
        cx.execute("INSERT INTO project_objective_deliveries(objective_id,initiative_ref,relationship,created_by,created_at)"
                   " VALUES(1,'INI-1','bogus','o','t')")
    with pytest.raises(sqlite3.IntegrityError):
        cx.execute("INSERT INTO initiative_milestones(initiative_ref,milestone_id,relationship,created_by,created_at)"
                   " VALUES('INI-1',1,'bogus','o','t')")
    with pytest.raises(sqlite3.IntegrityError):
        cx.execute("UPDATE project_goal_contracts SET status='bogus' WHERE goal_id='G-1'")
    with pytest.raises(sqlite3.IntegrityError):
        cx.execute("UPDATE project_goal_contracts SET max_turns=0 WHERE goal_id='G-1'")


def test_primary_keys_refuse_duplicate_edges(populated):
    cx = populated._conn
    with pytest.raises(sqlite3.IntegrityError):
        cx.execute("INSERT INTO project_objective_deliveries(objective_id,initiative_ref,created_by,created_at)"
                   " VALUES(1,'INI-1','o','t')")
    with pytest.raises(sqlite3.IntegrityError):
        cx.execute("INSERT INTO initiative_milestones(initiative_ref,milestone_id,created_by,created_at)"
                   " VALUES('INI-1',1,'o','t')")


def test_foreign_keys_refuse_unknown_ends(populated):
    cx = populated._conn
    with pytest.raises(sqlite3.IntegrityError):
        cx.execute("INSERT INTO project_objective_deliveries(objective_id,initiative_ref,created_by,created_at)"
                   " VALUES(99,'INI-1','o','t')")
    with pytest.raises(sqlite3.IntegrityError):
        cx.execute("INSERT INTO initiative_milestones(initiative_ref,milestone_id,created_by,created_at)"
                   " VALUES('NOPE',1,'o','t')")
    with pytest.raises(sqlite3.IntegrityError):
        cx.execute("INSERT INTO project_goal_contracts(goal_id,outcome,updated_at) VALUES('NOPE','x','t')")


@pytest.mark.parametrize("delete_sql,table", [
    ("DELETE FROM project_initiatives WHERE ref='INI-1'", "initiative_milestones"),
    ("DELETE FROM project_initiatives WHERE ref='INI-1'", "project_objective_deliveries"),
    ("DELETE FROM dockyard_milestones WHERE id=1", "initiative_milestones"),
    ("DELETE FROM project_objectives WHERE id=1", "project_objective_deliveries"),
    ("DELETE FROM project_goals WHERE goal_id='G-1'", "project_goal_contracts"),
])
def test_deleting_either_end_cascades_to_the_edge(populated, delete_sql, table):
    cx = populated._conn
    before = cx.execute(f"SELECT COUNT(*) FROM {table}").fetchone()[0]
    assert before >= 1
    cx.execute(delete_sql)
    after = cx.execute(f"SELECT COUNT(*) FROM {table}").fetchone()[0]
    assert after == before - 1 if table == "project_goal_contracts" else after == 0
    assert cx.execute("PRAGMA foreign_key_check").fetchall() == []


def test_no_triggers_are_added(tmp_path):
    """The plan forbids triggers: check the real schema, not the SQL text."""
    store = Store(tmp_path / "t.db")
    try:
        assert store._conn.execute(
            "SELECT name FROM sqlite_master WHERE type='trigger'").fetchall() == []
    finally:
        store.close()
    assert "CREATE TRIGGER" not in _r2().upgrade_sql.upper()
