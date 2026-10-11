"""Batch L migration v42: the delivery ladder.

The migration is located by NAME, never by number: Kensei renumbers it to the
next free slot when it merges, and these tests must survive that.

What v42 must prove:
  * one-parent chain columns and new tables exist; old link tables untouched;
  * every row of the conversion table converts when it fits and lands in
    roadmap_unplaced when it does not (nothing guessed);
  * downgrade v42 -> v41 restores v41 byte-for-byte in content (old tables were
    never written), and v41 -> v42 -> v41 -> v42 is lossless on a seeded DB;
  * 0.4.0 code refuses a v42 database (NewerSchemaError).
"""
from __future__ import annotations

import sqlite3

import pytest

from hermes_project_stewardship.persistence import migrations, store as store_module
from hermes_project_stewardship.persistence.store import NewerSchemaError, Store

L_NAME = "delivery ladder: one-parent chain task-goal-objective-milestone-initiative"
NEW_TABLES = ("goal_tasks", "goal_checks", "roadmap_unplaced")
NEW_INDEXES = (
    "idx_project_goals_objective",
    "idx_project_objectives_milestone",
    "idx_dockyard_milestones_initiative",
    "idx_goal_tasks_goal",
    "idx_roadmap_unplaced_open",
)
OLD_LINK_TABLES = (
    "project_objective_goals",
    "project_objective_deliveries",
    "initiative_milestones",
    "dockyard_milestone_items",
)


def _l():
    matches = [m for m in migrations.MIGRATIONS if m.name == L_NAME]
    assert len(matches) == 1, "exactly one Batch L migration must exist"
    return matches[0]


def _store_without_l(path, monkeypatch):
    """A database as it stands just before v42 (every earlier migration)."""
    lane = _l()
    with monkeypatch.context() as context:
        context.setattr(
            store_module, "MIGRATIONS",
            [m for m in migrations.MIGRATIONS if m.version < lane.version])
        context.setattr(store_module, "SCHEMA_VERSION", lane.version - 1)
        return Store(path)


def _schema(cx):
    return [tuple(" ".join((row[3] or "").split()) if i == 3 else row[i]
                  for i in range(4))
            for row in cx.execute(
                "SELECT type,name,tbl_name,sql FROM sqlite_master "
                "WHERE name NOT LIKE 'sqlite_%' ORDER BY type,name")]


def _content_snapshot(cx, exclude=()):
    """Every row of every non-ledger table, for a lossless round-trip proof."""
    tables = [r[0] for r in cx.execute(
        "SELECT name FROM sqlite_master WHERE type='table' "
        "AND name NOT LIKE 'sqlite_%' ORDER BY name")
        if r[0] not in exclude and r[0] != "schema_migrations"]
    snap = {}
    for t in tables:
        snap[t] = [tuple(r) for r in cx.execute(f'SELECT * FROM "{t}" ORDER BY rowid')]
    return snap


def _seed_legacy(cx):
    """Representative 0.4.0 rows covering every conversion-table case."""
    cx.execute("INSERT INTO project_stewardship(project_id,enabled,created_at,updated_at)"
               " VALUES('p1',1,'2026-01-01','2026-01-01')")
    # Case 1a: a goal with exactly ONE objective -> converts.
    cx.execute("INSERT INTO project_goals(goal_id,project_id,title,position,created_at,updated_at)"
               " VALUES('G-1','p1','Ship it',0,'2026-02-01','2026-03-01')")
    cx.execute("INSERT INTO project_objectives(project_id,name,evaluator_type,target)"
               " VALUES('p1','Obj one','manual','>=1')")
    cx.execute("INSERT INTO project_objective_goals(objective_id,goal_id) VALUES(1,'G-1')")
    # Case 1b: a goal with TWO objectives -> needs placing.
    cx.execute("INSERT INTO project_goals(goal_id,project_id,title,position,created_at,updated_at)"
               " VALUES('G-2','p1','Ambiguous',1,'2026-02-01','2026-03-01')")
    cx.execute("INSERT INTO project_objectives(project_id,name,evaluator_type,target)"
               " VALUES('p1','Obj two','manual','>=1')")
    cx.execute("INSERT INTO project_objectives(project_id,name,evaluator_type,target)"
               " VALUES('p1','Obj three','manual','>=1')")
    cx.execute("INSERT INTO project_objective_goals(objective_id,goal_id) VALUES(2,'G-2')")
    cx.execute("INSERT INTO project_objective_goals(objective_id,goal_id) VALUES(3,'G-2')")

    # Initiative + milestones for the objective/initiative/milestone cases.
    cx.execute("INSERT INTO project_initiatives(ref,project_id,title,rationale,created_at)"
               " VALUES('INI-1','p1','Initiative','why','2026-02-01')")
    cx.execute("INSERT INTO project_initiatives(ref,project_id,title,rationale,created_at)"
               " VALUES('INI-2','p1','Other','why','2026-02-01')")
    cx.execute("INSERT INTO dockyard_milestones(project_id,name,created_at)"
               " VALUES('p1','Release','2026-02-01')")
    cx.execute("INSERT INTO dockyard_milestones(project_id,name,created_at)"
               " VALUES('p1','Beta','2026-02-01')")

    # Case 2a: objective links to exactly one initiative with exactly one
    # 'delivers' milestone -> objective.milestone_id converts.
    cx.execute("INSERT INTO project_objective_deliveries(objective_id,initiative_ref,relationship,created_by,created_at)"
               " VALUES(1,'INI-1','supports','seed','2026-02-01')")
    cx.execute("INSERT INTO initiative_milestones(initiative_ref,milestone_id,relationship,created_by,created_at)"
               " VALUES('INI-1',1,'delivers','seed','2026-02-01')")
    # Case 2b: objective links to an initiative with TWO 'delivers' milestones
    # -> does not map.
    cx.execute("INSERT INTO project_objective_deliveries(objective_id,initiative_ref,relationship,created_by,created_at)"
               " VALUES(2,'INI-2','supports','seed','2026-02-01')")
    cx.execute("INSERT INTO initiative_milestones(initiative_ref,milestone_id,relationship,created_by,created_at)"
               " VALUES('INI-2',2,'delivers','seed','2026-02-01')")
    cx.execute("INSERT INTO dockyard_milestones(project_id,name,created_at)"
               " VALUES('p1','Beta2','2026-02-01')")
    cx.execute("INSERT INTO initiative_milestones(initiative_ref,milestone_id,relationship,created_by,created_at)"
               " VALUES('INI-2',3,'delivers','seed','2026-02-01')")

    # Case 3a: another milestone under exactly one 'delivers' initiative
    # -> converts. Keep milestone 1 as INI-1's sole delivers row so case 2a
    # remains an independent fit case. Case 3b is shared by two initiatives.
    cx.execute("INSERT INTO project_initiatives(ref,project_id,title,rationale,created_at)"
               " VALUES('INI-3','p1','Third','why','2026-02-01')")
    cx.execute("INSERT INTO dockyard_milestones(project_id,name,created_at)"
               " VALUES('p1','Single initiative','2026-02-01')")
    cx.execute("INSERT INTO initiative_milestones(initiative_ref,milestone_id,relationship,created_by,created_at)"
               " VALUES('INI-3',4,'delivers','seed','2026-02-01')")
    cx.execute("INSERT INTO dockyard_milestones(project_id,name,created_at)"
               " VALUES('p1','Shared','2026-02-01')")
    cx.execute("INSERT INTO initiative_milestones(initiative_ref,milestone_id,relationship,created_by,created_at)"
               " VALUES('INI-2',5,'delivers','seed','2026-02-01')")
    cx.execute("INSERT INTO initiative_milestones(initiative_ref,milestone_id,relationship,created_by,created_at)"
               " VALUES('INI-3',5,'delivers','seed','2026-02-01')")

    # Case 4a: milestone 1 has exactly one objective (obj 1) with exactly one
    # goal (G-1) -> its item places under G-1. Case 4b: milestone 4 has no
    # objective -> its item needs placing.
    cx.execute("INSERT INTO dockyard_milestone_items(milestone_id,item_ref) VALUES(1,'t-placed')")
    cx.execute("INSERT INTO dockyard_milestone_items(milestone_id,item_ref) VALUES(4,'t-unplaced')")


# ---- registration & schema ---------------------------------------------------- //

def test_migration_is_registered_exactly_once_and_is_latest():
    versions = [m.version for m in migrations.MIGRATIONS if m.name == L_NAME]
    assert versions == [42]
    assert migrations.SCHEMA_VERSION == 42
    assert migrations.SCHEMA_VERSION == max(m.version for m in migrations.MIGRATIONS)


def test_fresh_build_equals_upgraded_build(tmp_path, monkeypatch):
    pre = _store_without_l(tmp_path / "pre.db", monkeypatch)
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


def test_upgrade_adds_exactly_the_new_tables_and_leaves_old_links(tmp_path, monkeypatch):
    pre = _store_without_l(tmp_path / "pre.db", monkeypatch)
    before = {r[0] for r in pre._conn.execute(
        "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")}
    old_before = {t: pre._conn.execute(f"SELECT COUNT(*) FROM {t}").fetchone()[0]
                  for t in OLD_LINK_TABLES}
    pre.close()
    store = Store(tmp_path / "pre.db")
    try:
        after = {r[0] for r in store._conn.execute(
            "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")}
        assert after - before == set(NEW_TABLES)
        assert before - after == set()  # nothing dropped
        idx = {r[0] for r in store._conn.execute(
            "SELECT name FROM sqlite_master WHERE type='index'")}
        assert set(NEW_INDEXES) <= idx
        # Old link tables are untouched: same row counts, still present.
        for t in OLD_LINK_TABLES:
            assert t in after
            assert store._conn.execute(f"SELECT COUNT(*) FROM {t}").fetchone()[0] == old_before[t]
    finally:
        store.close()


def test_parent_columns_exist_and_are_nullable(tmp_path, monkeypatch):
    pre = _store_without_l(tmp_path / "pre.db", monkeypatch)
    pre.close()
    store = Store(tmp_path / "pre.db")
    try:
        cols = {t: {r[1] for r in store._conn.execute(f"PRAGMA table_info({t})")}
                for t in ("project_goals", "project_objectives", "dockyard_milestones")}
        assert "objective_id" in cols["project_goals"]
        assert "milestone_id" in cols["project_objectives"]
        assert "initiative_ref" in cols["dockyard_milestones"]
        # All nullable (notnull == 0): an item may be "Not placed yet".
        for table, col in (("project_goals", "objective_id"),
                           ("project_objectives", "milestone_id"),
                           ("dockyard_milestones", "initiative_ref")):
            row = next(r for r in store._conn.execute(f"PRAGMA table_info({table})")
                       if r[1] == col)
            assert row[3] == 0, f"{table}.{col} must be nullable"
    finally:
        store.close()


# ---- conversion table --------------------------------------------------------- //

def test_conversion_table_every_case(tmp_path, monkeypatch):
    pre = _store_without_l(tmp_path / "pre.db", monkeypatch)
    _seed_legacy(pre._conn)
    pre.close()
    store = Store(tmp_path / "pre.db")
    try:
        cx = store._conn
        # 1a: G-1 single objective -> objective_id set.
        assert cx.execute("SELECT objective_id FROM project_goals WHERE goal_id='G-1'").fetchone()[0] == 1
        # 1b: G-2 two objectives -> unplaced, old links preserved.
        assert cx.execute("SELECT objective_id FROM project_goals WHERE goal_id='G-2'").fetchone()[0] is None
        g2 = cx.execute("SELECT reason, old_links_json FROM roadmap_unplaced WHERE kind='goal' AND item_id='G-2'").fetchone()
        assert g2["reason"] == "goal had multiple objectives"
        assert set(g2["old_links_json"]) >= {"2", "3"}  # both old objectives listed

        # 2a: obj 1 -> milestone 1 (INI-1 single delivers).
        assert cx.execute("SELECT milestone_id FROM project_objectives WHERE id=1").fetchone()[0] == 1
        # 2b: obj 2 -> INI-2 has two 'delivers' milestones -> unplaced.
        assert cx.execute("SELECT milestone_id FROM project_objectives WHERE id=2").fetchone()[0] is None
        assert cx.execute("SELECT 1 FROM roadmap_unplaced WHERE kind='objective' AND item_id='2'").fetchone() is not None

        # 3a: milestone 4 -> INI-3 (single delivers). 3b: milestone 5 shared -> unplaced.
        assert cx.execute("SELECT initiative_ref FROM dockyard_milestones WHERE id=4").fetchone()[0] == "INI-3"
        assert cx.execute("SELECT initiative_ref FROM dockyard_milestones WHERE id=5").fetchone()[0] is None
        assert cx.execute("SELECT 1 FROM roadmap_unplaced WHERE kind='milestone' AND item_id='5'").fetchone() is not None

        # 4a: t-placed under G-1 (milestone 1 -> obj 1 -> G-1). 4b: t-unplaced.
        assert cx.execute("SELECT goal_id FROM goal_tasks WHERE item_ref='t-placed'").fetchone()[0] == "G-1"
        assert cx.execute("SELECT 1 FROM goal_tasks WHERE item_ref='t-unplaced'").fetchone() is None
        assert cx.execute("SELECT 1 FROM roadmap_unplaced WHERE kind='task' AND item_id='t-unplaced'").fetchone() is not None
    finally:
        store.close()


def test_depends_on_only_milestone_is_not_converted(tmp_path, monkeypatch):
    """A milestone linked only via depends_on must not gain an initiative."""
    pre = _store_without_l(tmp_path / "pre.db", monkeypatch)
    cx = pre._conn
    cx.execute("INSERT INTO project_stewardship(project_id,enabled,created_at,updated_at)"
               " VALUES('p1',1,'2026-01-01','2026-01-01')")
    cx.execute("INSERT INTO project_initiatives(ref,project_id,title,rationale,created_at)"
               " VALUES('INI-1','p1','I','why','2026-02-01')")
    cx.execute("INSERT INTO dockyard_milestones(project_id,name,created_at)"
               " VALUES('p1','Dep','2026-02-01')")
    cx.execute("INSERT INTO initiative_milestones(initiative_ref,milestone_id,relationship,created_by,created_at)"
               " VALUES('INI-1',1,'depends_on','seed','2026-02-01')")
    pre.close()
    store = Store(tmp_path / "pre.db")
    try:
        assert store._conn.execute(
            "SELECT initiative_ref FROM dockyard_milestones WHERE id=1").fetchone()[0] is None
        assert store._conn.execute(
            "SELECT 1 FROM roadmap_unplaced WHERE kind='milestone'").fetchone() is not None
    finally:
        store.close()


# ---- downgrade & round-trip --------------------------------------------------- //

def test_downgrade_restores_v41_content_byte_for_byte(tmp_path, monkeypatch):
    pre = _store_without_l(tmp_path / "pre.db", monkeypatch)
    _seed_legacy(pre._conn)
    before = _content_snapshot(pre._conn)
    pre.close()
    lane = _l()
    store = Store(tmp_path / "pre.db")   # upgrades to v42
    try:
        assert store.schema_version == 42
    finally:
        store.close()
    # Downgrade back to v41 content: drop the new columns/tables via the
    # downgrade SQL, then compare every old-table row.
    store = Store(tmp_path / "pre.db")
    try:
        store._conn.executescript(lane.downgrade_sql)
        # A direct migration downgrade must also move the ledger back to v41;
        # Store's forward migrator normally owns ledger writes.
        store._conn.execute("DELETE FROM schema_migrations WHERE version=42")
        after = _content_snapshot(store._conn, exclude=set(NEW_TABLES))
        # Old link tables + all pre-existing tables are unchanged.
        assert after == before
        for t in NEW_TABLES:
            assert store._conn.execute(
                f"SELECT 1 FROM sqlite_master WHERE name='{t}'").fetchone() is None
    finally:
        store.close()


def test_v41_v42_v41_v42_roundtrip_is_lossless(tmp_path, monkeypatch):
    pre = _store_without_l(tmp_path / "pre.db", monkeypatch)
    _seed_legacy(pre._conn)
    v42_snapshot_after_first = None
    pre.close()
    lane = _l()

    store = Store(tmp_path / "pre.db")  # v41 -> v42
    try:
        assert store.schema_version == 42
        v42_snapshot_after_first = _content_snapshot(store._conn)
    finally:
        store.close()

    store = Store(tmp_path / "pre.db")
    store._conn.executescript(lane.downgrade_sql)  # v42 -> v41
    # Mirror the migration runner's ledger transition for this direct SQL proof.
    store._conn.execute("DELETE FROM schema_migrations WHERE version=42")
    store.close()

    store = Store(tmp_path / "pre.db")  # v41 -> v42 again
    try:
        assert store.schema_version == 42
        assert _content_snapshot(store._conn) == v42_snapshot_after_first
    finally:
        store.close()


def test_v040_code_refuses_a_v42_database(tmp_path, monkeypatch):
    """0.4.0 (SCHEMA_VERSION 41) refuses a v42 DB with NewerSchemaError."""
    store = Store(tmp_path / "v42.db")   # builds at v42
    try:
        assert store.schema_version == 42
    finally:
        store.close()
    # Simulate the 0.4.0 binary: its MIGRATIONS top out at 41.
    old = [m for m in migrations.MIGRATIONS if m.version <= 41]
    old_max = max(m.version for m in old)
    with monkeypatch.context() as ctx:
        ctx.setattr(store_module, "MIGRATIONS", old)
        ctx.setattr(store_module, "SCHEMA_VERSION", old_max)
        with pytest.raises(NewerSchemaError):
            Store(tmp_path / "v42.db")
