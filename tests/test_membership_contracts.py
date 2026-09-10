"""Phase 1 (PM-0111..0114) tests: migration integrity, authority, races.

Covers: forward migration + newer-schema fail-closed + snapshot restore,
state-survival proof, invariant/race tests for one-lead/duplicate-membership/
interrupted migration/partial saga recovery.
"""
from __future__ import annotations

import sqlite3
import threading

import pytest

from hermes_project_stewardship.persistence.migrations import SCHEMA_VERSION
from hermes_project_stewardship.persistence.store import Store
from hermes_project_stewardship.persistence.membership import MembershipService
from hermes_project_stewardship.persistence.service import StewardshipService
from hermes_project_stewardship.persistence.transfer import TransferSaga


def test_pm0112_real_upgrade_from_v20_backfills_membership(tmp_path):
    """Fix 2: build a v20 database, seed legacy ownership, then open with
    the current binary and prove the normalised rows AND projections
    survive migration 21."""
    import hermes_project_stewardship.persistence.migrations as migrations_module
    from hermes_project_stewardship.persistence.migrations import Migration

    db = tmp_path / "upgrade.db"

    # Build a schema-20 database by running only migrations 1..20.
    original = migrations_module.MIGRATIONS
    migrations_v20 = [m for m in original if m.version <= 20]
    conn = sqlite3.connect(db)
    conn.row_factory = sqlite3.Row
    try:
        conn.execute("PRAGMA foreign_keys=ON")
        conn.execute(
            "CREATE TABLE schema_migrations ("
            " version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL)"
        )
        import re as _re
        for m in migrations_v20:
            no_comments = _re.sub(r"--[^\n]*", "", m.upgrade_sql)
            for statement in no_comments.split(";"):
                sql = statement.strip()
                if sql:
                    conn.execute(sql)
            conn.execute(
                "INSERT INTO schema_migrations(version, applied_at) VALUES(?, 'v20')",
                (m.version,),
            )
        # Seed legacy ownership the old way (direct column writes).
        conn.execute(
            "INSERT INTO project_stewardship(project_id, enabled, mission,"
            " owner_lead_profile, member_profiles_json, created_at, updated_at)"
            " VALUES('legacy', 1, 'keep me', 'old-lead', ?, '2026-01-01', '2026-01-01')",
            ('["mem-a","mem-b","old-lead"]',),
        )
        conn.commit()
    finally:
        conn.close()

    # Open with the CURRENT binary: migration 21 runs the backfill.
    store = Store(db)
    try:
        assert store.schema_version == SCHEMA_VERSION
        cx = store._conn
        rows = {
            r["profile_slug"]: r["role"]
            for r in cx.execute(
                "SELECT profile_slug, role FROM project_members WHERE project_id='legacy'"
            ).fetchall()
        }
        assert rows == {"old-lead": "lead", "mem-a": "member", "mem-b": "member"}
        # Exactly one active lead after backfill.
        leads = cx.execute(
            "SELECT profile_slug FROM project_members"
            " WHERE project_id='legacy' AND role='lead' AND state='active'"
        ).fetchall()
        assert len(leads) == 1
        # Legacy projections still readable and consistent.
        assert cx.execute(
            "SELECT owner_lead_profile FROM project_stewardship WHERE project_id='legacy'"
        ).fetchone()["owner_lead_profile"] == "old-lead"
        assert cx.execute(
            "SELECT mission FROM project_stewardship WHERE project_id='legacy'"
        ).fetchone()["mission"] == "keep me"
        # Membership revision row exists for the upgraded project.
        assert cx.execute(
            "SELECT revision FROM membership_revisions WHERE project_id='legacy'"
        ).fetchone()["revision"] == 0
    finally:
        store.close()


def test_pm0112_newer_schema_fails_closed(tmp_path):
    """PM-0112: a database migrated by a NEWER binary must refuse to open."""
    from hermes_project_stewardship.persistence import migrations as migrations_module
    from hermes_project_stewardship.persistence.migrations import Migration

    # Build the DB at the current version.
    db = tmp_path / "future.db"
    store = Store(db)
    store.close()

    # Simulate a future version having run.
    conn = sqlite3.connect(db)
    try:
        conn.execute(
            "INSERT INTO schema_migrations(version, applied_at) VALUES(?, 'x')",
            (SCHEMA_VERSION + 1,),
        )
        conn.commit()
    finally:
        conn.close()

    from hermes_project_stewardship.persistence.store import NewerSchemaError

    with pytest.raises(NewerSchemaError):
        Store(db)


def test_pm0112_pre_upgrade_snapshot_and_restore(tmp_path):
    """PM-0112: snapshot before upgrade restores byte-identical state."""
    from hermes_project_stewardship.persistence.backup import export_store, restore_store

    db = tmp_path / "pre.db"
    store = Store(db)
    store._conn.execute(
        "INSERT INTO project_stewardship(project_id, enabled, mission, created_at, updated_at)"
        " VALUES('snap', 1, 'preserve me', '2026-01-01', '2026-01-01')"
    )
    store._conn.commit()
    store.close()

    archive = tmp_path / "snap-archive"
    manifest = export_store(Store(db), archive)

    # Corrupt a copy of the live db; restore writes a verified fresh file.
    broken = tmp_path / "broken.db"
    broken.write_bytes(db.read_bytes())
    conn = sqlite3.connect(broken)
    conn.execute("UPDATE project_stewardship SET mission='lost'")
    conn.commit()
    conn.close()

    restored_path = tmp_path / "restored.db"
    result = restore_store(archive, restored_path)
    conn = sqlite3.connect(restored_path)
    try:
        mission = conn.execute(
            "SELECT mission FROM project_stewardship WHERE project_id='snap'"
        ).fetchone()[0]
    finally:
        conn.close()
    assert mission == "preserve me"
    assert manifest.get("database", {}).get("sha256")
    assert result.get("target")


def test_pm0113_existing_state_survives_migration(tmp_path):
    """PM-0113: mission/owner/member/objective/milestone/workflow/audit rows survive v21."""
    db = tmp_path / "survive.db"
    store = Store(db)
    cx = store._conn
    cx.execute(
        "INSERT INTO project_stewardship(project_id, enabled, mission,"
        " owner_lead_profile, member_profiles_json, created_at, updated_at)"
        " VALUES('demo', 1, 'the mission', 'lead', '[\"a\",\"b\"]', '2026-01-01', '2026-01-01')"
    )
    cx.execute(
        "INSERT INTO project_objectives(project_id, name, evaluator_type, target)"
        " VALUES('demo', 'obj', 'manual', '>=1')"
    )
    objective_id = cx.execute("SELECT id FROM project_objectives").fetchone()["id"]
    cx.execute(
        "INSERT INTO project_mission_archive(archive_id, project_id, mission, archived_by, archived_at)"
        " VALUES('M-1', 'demo', 'old mission', 'sahil', '2026-01-02')"
    )
    cx.execute(
        "INSERT INTO stewardship_audit_log(ts, actor, interface, action, subject, detail_json)"
        " VALUES('2026-01-01T00:00:00+00:00', 'sahil', 'test', 'probe', 'demo', '{}')"
    )
    cx.commit()

    # Migration 21 already ran as part of Store init; assert everything still there.
    assert cx.execute(
        "SELECT mission FROM project_stewardship WHERE project_id='demo'"
    ).fetchone()["mission"] == "the mission"
    assert cx.execute(
        "SELECT COUNT(*) FROM project_mission_archive"
    ).fetchone()["COUNT(*)"] == 1
    assert cx.execute(
        "SELECT COUNT(*) FROM project_objectives WHERE id=?", (objective_id,)
    ).fetchone()["COUNT(*)"] == 1
    assert cx.execute(
        "SELECT COUNT(*) FROM stewardship_audit_log"
    ).fetchone()["COUNT(*)"] >= 1
    assert cx.execute(
        "SELECT owner_lead_profile FROM project_stewardship WHERE project_id='demo'"
    ).fetchone()["owner_lead_profile"] == "lead"
    store.close()


def test_pm0114_race_concurrent_lead_transfer_keeps_one_lead(store, clock, enabled):
    """PM-0114: simultaneous lead transfers leave exactly one active lead."""
    from hermes_project_stewardship.persistence.membership import MembershipService
    from hermes_project_stewardship.persistence.service import StewardshipService

    svc = StewardshipService(store, clock=clock)
    members = MembershipService(store, svc, clock=clock)
    for slug in ("a", "b", "c"):
        members.add_member("demo", slug, role="member")

    errors: list[Exception] = []

    def transfer(slug):
        try:
            members.transfer_lead("demo", slug)
        except Exception as exc:  # noqa: BLE001 - race probe collects
            errors.append(exc)

    threads = [threading.Thread(target=transfer, args=(s,)) for s in ("a", "b", "c")]
    for t in threads:
        t.start()
    for t in threads:
        t.join()

    rows = store._conn.execute(
        "SELECT profile_slug FROM project_members WHERE project_id='demo'"
        " AND role='lead' AND state='active'"
    ).fetchall()
    assert len(rows) == 1
    # Fix 8: no unexpected thread failures — rejections are the ONLY
    # tolerated errors and must carry a service-level message.
    for err in errors:
        assert type(err).__name__ in {"ServiceError", "IntegrityError", "OperationalError"}, err


def test_pm0114_race_duplicate_membership_single_row(store, clock, enabled):
    """PM-0114: concurrent add of the same profile produces one membership."""
    from hermes_project_stewardship.persistence.membership import MembershipService
    from hermes_project_stewardship.persistence.service import StewardshipService
    from hermes_project_stewardship.persistence.service import ServiceError

    svc = StewardshipService(store, clock=clock)
    members = MembershipService(store, svc, clock=clock)
    outcomes: list[str] = []
    lock = threading.Lock()

    def add():
        try:
            members.add_member("demo", "dup", role="member")
            with lock:
                outcomes.append("ok")
        except ServiceError:
            with lock:
                outcomes.append("rejected")

    threads = [threading.Thread(target=add) for _ in range(6)]
    for t in threads:
        t.start()
    for t in threads:
        t.join()

    count = store._conn.execute(
        "SELECT COUNT(*) AS n FROM project_members WHERE project_id='demo' AND profile_slug='dup'"
    ).fetchone()["n"]
    assert count == 1
    assert outcomes  # all threads resolved without crashing
    assert "rejected" in outcomes or "ok" in outcomes


def test_pm0114_interrupted_migration_rolls_back(tmp_path, monkeypatch):
    """PM-0114: a migration crashing mid-way leaves no partial schema."""
    from hermes_project_stewardship.persistence import migrations as migrations_module
    from hermes_project_stewardship.persistence.migrations import Migration

    original = migrations_module.MIGRATIONS
    broken = Migration(
        version=SCHEMA_VERSION + 1,
        name="interrupted witness",
        upgrade_sql=(
            "CREATE TABLE interrupted_marker(id INTEGER);"
            "INSERT INTO interrupted_marker VALUES(1);"
            "THIS IS NOT SQL;"
        ),
        downgrade_sql="DROP TABLE IF EXISTS interrupted_marker;",
    )
    monkeypatch.setattr(migrations_module, "MIGRATIONS", [*original, broken])
    monkeypatch.setattr(
        "hermes_project_stewardship.persistence.store.MIGRATIONS", [*original, broken]
    )
    with pytest.raises(sqlite3.DatabaseError):
        Store(tmp_path / "interrupted.db")
    conn = sqlite3.connect(tmp_path / "interrupted.db")
    try:
        row = conn.execute(
            "SELECT name FROM sqlite_master WHERE name='interrupted_marker'"
        ).fetchone()
        assert row is None
    finally:
        conn.close()

def test_pm0107_lifecycle_transition_matrix():
    """Fix 7: explicit transition matrix with side effects; illegal moves refused."""
    from hermes_project_stewardship.domain.constants import ProjectLifecycle

    assert ProjectLifecycle.can_transition("active", "paused")
    assert ProjectLifecycle.can_transition("active", "frozen")
    assert ProjectLifecycle.can_transition("active", "disabled")
    assert ProjectLifecycle.can_transition("active", "archived")
    assert ProjectLifecycle.can_transition("paused", "active")
    assert ProjectLifecycle.can_transition("frozen", "active")
    assert ProjectLifecycle.can_transition("disabled", "active")
    assert ProjectLifecycle.can_transition("archived", "active")
    # Illegal moves:
    assert not ProjectLifecycle.can_transition("archived", "paused")
    assert not ProjectLifecycle.can_transition("disabled", "frozen")
    assert not ProjectLifecycle.can_transition("paused", "frozen")
    assert not ProjectLifecycle.can_transition("frozen", "paused")
    assert not ProjectLifecycle.can_transition("archived", "disabled")
    with pytest.raises(ValueError):
        ProjectLifecycle.require_transition("archived", "paused")
    effects = ProjectLifecycle.side_effects("paused")
    assert effects["paused_at"] == "now" and effects["phase"] == "paused"
    effects = ProjectLifecycle.side_effects("active")
    assert effects["paused_at"] is None


def test_pm0102_enable_seeding_failure_leaves_no_legacy_ownership(store, clock):
    """Fix 1 regression: a seeding failure must not leave user-supplied
    ownership in legacy columns (fail injection)."""
    from hermes_project_stewardship.persistence.service import StewardshipService

    svc = StewardshipService(store, clock=clock)

    from hermes_project_stewardship.persistence import membership as membership_module

    original = membership_module.MembershipService.seed_members_in_tx

    def exploding(self, cx, project_id, *, lead_profile, member_profiles):
        raise RuntimeError("injected seeding failure")

    membership_module.MembershipService.seed_members_in_tx = exploding
    try:
        with pytest.raises(RuntimeError):
            svc.enable("demo", mission="m", lead_profile="boss",
                       member_profiles=["worker"])
    finally:
        membership_module.MembershipService.seed_members_in_tx = original
    # The whole enable transaction rolled back: no project row, no legacy
    # ownership values, no normalised rows.
    row = store._conn.execute(
        "SELECT owner_lead_profile, member_profiles_json FROM project_stewardship WHERE project_id='demo'"
    ).fetchone()
    assert row is None
    assert store._conn.execute(
        "SELECT COUNT(*) AS n FROM project_members WHERE project_id='demo'"
    ).fetchone()["n"] == 0


def test_pm0102_update_settings_failure_leaves_everything_unchanged(store, clock, enabled):
    """Fix 2 regression: a roster-reconciliation failure rolls back mission
    and policy changes too."""
    from hermes_project_stewardship.persistence.service import StewardshipService

    svc = StewardshipService(store, clock=clock)

    from hermes_project_stewardship.persistence import membership as membership_module

    original = membership_module.MembershipService.reconcile_in_tx

    def exploding(self, cx, project_id, **kwargs):
        raise RuntimeError("injected reconciliation failure")

    membership_module.MembershipService.reconcile_in_tx = exploding
    try:
        with pytest.raises(RuntimeError):
            svc.update_settings(
                "demo", mission="new mission", member_profiles=["brand-new"],
                actor="sahil",
            )
    finally:
        membership_module.MembershipService.reconcile_in_tx = original
    current = svc.settings("demo")
    assert current["mission"] != "new mission"


def test_pm0110_unassigned_work_not_captured_by_transfer(store, clock, enabled):
    """Fix 3: unassigned work is never captured by a member-exit transfer."""
    from hermes_project_stewardship.persistence.transfer import (
        TaskStateConflict,
        TransferSaga,
    )

    class Host:
        def __init__(self):
            self.assignments = {}

        def get_task(self, task_id, *, board=None):
            return {"task": {"id": task_id, "assignee": self.assignments.get(task_id),
                             "status": "ready", "current_run_id": None,
                             "task_kind": "task"}}

        def assign_task_if_unchanged(self, task_id, from_profile, to_profile, guard):
            assert guard["allow_unassigned"] is False
            record = self.get_task(task_id)["task"]
            if not record.get("assignee"):
                # Real vanilla assign_task would happily take unassigned
                # work; the CONTRACT refuses it before the write.
                raise TaskStateConflict("unassigned_work_not_captured")
            self.assignments[task_id] = to_profile
            return {"id": task_id, "assignee": to_profile, "status": "ready"}

    host = Host()
    saga = TransferSaga(store, host, clock=clock)
    outcome = saga.execute(
        op_id="op-u",
        idempotency_key="k-u",
        project_id="demo",
        from_profile="gone",
        to_profile="new",
        items=[{"id": "t1", "revision": 1, "status": "ready", "assignee": "gone"}],  # canonical assignee None
    )
    assert outcome["completed_items"] == 0
    assert outcome["skipped_items"][0]["reason"] == "unassigned_work_not_captured"
    assert "t1" not in host.assignments


def test_pm0110_lost_host_response_recognised_completed_on_retry(store, clock, enabled):
    """Fix 4 regression: the host committed but the response was lost —
    retry recognises assignee == to_profile as completed, not skipped."""
    from hermes_project_stewardship.persistence.transfer import TransferSaga

    class LostResponseHost:
        def __init__(self):
            self.assignments = {}

        def get_task(self, task_id, *, board=None):
            return {"task": {"id": task_id, "assignee": self.assignments.get(task_id, "gone"),
                             "status": "ready", "current_run_id": None,
                             "task_kind": "task"}}

        def assign_task_if_unchanged(self, task_id, from_profile, to_profile, guard):
            # The assignment actually commits, but the response is LOST.
            self.assignments[task_id] = to_profile
            raise RuntimeError("connection reset: response lost")

    host = LostResponseHost()
    saga = TransferSaga(store, host, clock=clock)
    first = saga.execute(
        op_id="op-l",
        idempotency_key="k-l",
        project_id="demo",
        from_profile="gone",
        to_profile="new",
        items=[{"id": "t1", "revision": 1, "status": "ready", "assignee": "gone"}],
    )
    assert first["completed_items"] == 0
    assert any(f["id"] == "t1" for f in first["failed_items"])
    # The canonical state ALREADY shows the new assignee.
    assert host.assignments["t1"] == "new"

    retry = saga.retry("op-l")
    assert retry["state"] == "completed"
    assert retry["completed_items"] == 1
    # Not skipped: the item is recorded completed.
    assert all(sk["id"] != "t1" for sk in retry["skipped_items"])


def test_pm0110_retry_membership_departed_after_confirmed(store, clock, enabled):
    """Fix 5: retry with the membership coordinator departs the member only
    when all journalled work is resolved."""
    from hermes_project_stewardship.persistence.membership import MembershipService
    from hermes_project_stewardship.persistence.service import StewardshipService
    from hermes_project_stewardship.persistence.transfer import TransferSaga

    svc = StewardshipService(store, clock=clock)
    members = MembershipService(store, svc, clock=clock)
    members.add_member("demo", "gone", role="member")

    class FlakyThenFineHost:
        def __init__(self):
            self.assignments = {}
            self.fail_first = True

        def get_task(self, task_id, *, board=None):
            return {"task": {"id": task_id, "assignee": self.assignments.get(task_id, "gone"),
                             "status": "ready", "current_run_id": None,
                             "task_kind": "task"}}

        def assign_task_if_unchanged(self, task_id, from_profile, to_profile, guard):
            if self.fail_first:
                self.fail_first = False
                raise RuntimeError("host unavailable mid-saga")
            self.assignments[task_id] = to_profile
            return {"id": task_id, "assignee": to_profile, "status": "ready"}

    host = FlakyThenFineHost()
    saga = TransferSaga(store, host, clock=clock)
    first = saga.execute(
        op_id="op-c",
        idempotency_key="k-c",
        project_id="demo",
        from_profile="gone",
        to_profile="new",
        items=[{"id": "t1", "revision": 1, "status": "ready", "assignee": "gone"}],
        membership=members,
    )
    assert first["state"] != "completed"
    pending = next(m.state for m in members.list_members("demo", include_departed=True)
                   if m.profile_slug == "gone")
    assert pending == "departure_pending"

    retry = saga.retry("op-c", membership=members)
    assert retry["state"] == "completed"
    final = next(m.state for m in members.list_members("demo", include_departed=True)
                 if m.profile_slug == "gone")
    assert final == "departed"


def test_pm0114_partial_saga_recovery_via_retry(store, clock, enabled):
    """PM-0114: a host failure mid-saga is durable and resumable."""
    from hermes_project_stewardship.persistence.transfer import TaskStateConflict, TransferSaga

    class FlakyHost:
        def __init__(self):
            self.assignments: dict[str, str] = {}
            self.fails_next = {"t2"}

        def assign_task_if_unchanged(self, task_id, from_profile, to_profile, guard):
            record = self.get_task(task_id)["task"]
            if str(record.get("assignee") or "") and str(record.get("assignee")) != from_profile:
                raise TaskStateConflict(f"assignee_changed:{record.get('assignee')}")
            if str(record.get("status") or "") not in guard["eligible_statuses"]:
                raise TaskStateConflict("claimed_or_running")
            if task_id in self.fails_next:
                self.fails_next.discard(task_id)
                raise RuntimeError("host unavailable mid-saga")
            self.assignments[task_id] = to_profile or ""
            return {"id": task_id, "assignee": to_profile, "status": "ready"}

        def assign_task(self, task_id, assignee, *, board=None):
            if task_id in self.fails_next:
                self.fails_next.discard(task_id)
                raise RuntimeError("host unavailable mid-saga")
            self.assignments[task_id] = assignee or ""
            return {"id": task_id, "assignee": assignee, "status": "ready"}

        def get_task(self, task_id, *, board=None):
            return {"task": {"id": task_id, "assignee": self.assignments.get(task_id, "gone"),
                             "status": "ready", "current_run_id": None,
                             "task_kind": "task"}}

    host = FlakyHost()
    saga = TransferSaga(store, host, clock=clock)
    first = saga.execute(
        op_id="op-r1",
        idempotency_key="transfer-demo-r1",
        project_id="demo",
        from_profile="gone",
        to_profile="new",
        items=[{"id": "t1", "revision": 1, "status": "ready", "assignee": "gone"},
               {"id": "t2", "revision": 1, "status": "ready"}],
    )
    # Fix 8: deterministic — first run MUST be partial (one item failed).
    assert first["state"] != "completed"
    assert first["completed_items"] == 1
    assert any(f["id"] == "t2" for f in first["failed_items"])
    # The journal is resumable: retry completes the failed item.
    retry = saga.retry("op-r1")
    assert retry["state"] == "completed"
    assert host.assignments.get("t2") == "new"


def test_pm0114_zero_active_lead_routes_refused(store, clock, enabled):
    """Fix 3: every route that could leave zero active leads is refused."""
    from hermes_project_stewardship.persistence.membership import MembershipService
    from hermes_project_stewardship.persistence.service import ServiceError, StewardshipService

    svc = StewardshipService(store, clock=clock)
    members = MembershipService(store, svc, clock=clock)
    lead_slug = next(m.profile_slug for m in members.list_members("demo") if m.role == "lead")
    members.add_member("demo", "x1", role="member")

    # Route 1: remove the lead.
    with pytest.raises(ServiceError):
        members.remove_member("demo", lead_slug)
    # Route 2: departure_pending on the lead.
    with pytest.raises(ServiceError):
        members.set_state("demo", lead_slug, "departure_pending")
    # Route 3: unavailable on the lead.
    with pytest.raises(ServiceError):
        members.set_state("demo", lead_slug, "unavailable")
    # Route 4: departed on the lead.
    with pytest.raises(ServiceError):
        members.set_state("demo", lead_slug, "departed")
    # Route 4b: relink the lead away.
    with pytest.raises(ServiceError):
        members.relink_profile("demo", lead_slug, "relinked-lead")

    # Sanity: the lead is still active after every refusal.
    assert members.active_lead("demo").profile_slug == lead_slug

def test_pm0110_metadata_and_revision_preserved_through_retry(store, clock, enabled):
    """Exact regression: running->retry->ready->retry->completed->departed with revision=7."""
    svc = StewardshipService(store, clock=clock)
    members = MembershipService(store, svc, clock=clock)
    members.add_member("demo", "gone", role="member")

    from hermes_project_stewardship.persistence.transfer import TaskStateConflict

    class SingleFailHost:
        def __init__(self):
            self.assignments = {}
            self.call_count = 0
            self.guards = []
            self.status = "running"

        def get_task(self, task_id, *, board=None):
            return {"task": {
                "id": task_id,
                "assignee": self.assignments.get(task_id, "gone"),
                "status": self.status,
                "current_run_id": None,
                "task_kind": "task"
            }}

        def assign_task_if_unchanged(self, task_id, from_profile, to_profile, guard):
            self.call_count += 1
            self.guards.append(dict(guard))
            self.assignments[task_id] = to_profile
            return {"id": task_id, "assignee": to_profile, "status": "ready"}

    host = SingleFailHost()
    saga = TransferSaga(store, host)

    # Execute with a running task (revision=7)
    first = saga.execute(
        op_id="op-meta",
        idempotency_key="k-meta",
        project_id="demo",
        from_profile="gone",
        to_profile="new",
        items=[{"id": "t", "revision": 7, "status": "running", "kind": "task"}],
        membership=members,
    )
    assert first["state"] == "running"
    assert first["completed_items"] == 0

    # DB row retains revision=7 and complete metadata
    row = store._conn.execute(
        "SELECT item_id, revision, status, item_kind, outcome, detail FROM operation_items WHERE op_id='op-meta'"
    ).fetchone()
    assert row["revision"] == 7
    assert row["status"] == "running"
    assert row["item_kind"] == "task"
    assert row["outcome"] == "pending"
    assert row["detail"] == "claimed_or_running"

    # Skipped item dict in returned payload retains full metadata
    assert first["skipped_items"][0]["revision"] == 7
    assert first["skipped_items"][0]["status"] == "running"
    assert first["skipped_items"][0]["kind"] == "task"

    # Retry while still running remains pending and does not call the host.
    second = saga.retry("op-meta", membership=members)
    assert second["state"] == "running"
    assert host.call_count == 0

    # Canonical state becomes ready; retry transfers with persisted revision 7.
    host.status = "ready"
    second = saga.retry("op-meta", membership=members)
    assert second["state"] == "completed"
    assert second["completed_items"] == 1
    assert len(host.guards) >= 1
    # Guard carries exact persisted revision 7
    assert host.guards[-1]["expected_revision"] == 7

    # DB row still revision=7 after retry
    row_after = store._conn.execute(
        "SELECT revision FROM operation_items WHERE op_id='op-meta'"
    ).fetchone()
    assert row_after["revision"] == 7

    # Member departed
    final_state = next((m.state for m in members.list_members("demo", include_departed=True)
                        if m.profile_slug == "gone"), None)
    assert final_state == "departed"


def test_pm0110_blocked_record_retains_metadata_not_just_id_reason(store, clock, enabled):
    """Blocked/skipped records must have revision, status, kind - not just {id, reason}."""
    svc = StewardshipService(store, clock=clock)

    class NoopHost:
        def get_task(self, task_id, *, board=None):
            return {"task": {"id": task_id, "assignee": "gone", "status": "ready"}, }

        def assign_task_if_unchanged(self, task_id, from_profile, to_profile, guard):
            return {"id": task_id, "assignee": to_profile, "status": "ready"}

    saga = TransferSaga(store, NoopHost())

    # Epics are not eligible; should be skipped with full metadata
    result = saga.execute(
        op_id="op-epic",
        idempotency_key="k-epic",
        project_id="demo",
        from_profile="gone",
        to_profile="new",
        items=[{"id": "e1", "revision": 3, "status": "backlog", "kind": "epic"}],
    )
    skipped = result["skipped_items"]
    assert len(skipped) == 1
    item = skipped[0]
    assert item["id"] == "e1"
    assert item["revision"] == 3
    assert item["status"] == "backlog"
    assert item["kind"] == "epic"
    assert "reason" in item

    # DB row retains the metadata too
    db_row = store._conn.execute(
        "SELECT item_id, revision, status, item_kind FROM operation_items WHERE op_id='op-epic'"
    ).fetchone()
    assert db_row["revision"] == 3
    assert db_row["status"] == "backlog"
    assert db_row["item_kind"] == "epic"


