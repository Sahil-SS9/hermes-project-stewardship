"""Phase 1 (PM-0110) RED tests: metadata preservation and exact revision retry semantics.

These tests verify:
1. TransferSaga.execute preserves complete original item metadata for blocked/skipped records
   - item_id, original_revision, original_status, original_kind are retained
   - blocked records do NOT contain only {id, reason}
2. Retry passes exact persisted non-zero revision to assign_task_if_unchanged
   - Execute item {id:t, status:running, revision:7} -> retry while still running
   - Canonical status changes to ready (external event)
   - Retry with guard expected_revision == 7
   - Operation completes -> member departs
   - DB row revision=7 before and after retries
"""
from hermes_project_stewardship.persistence.transfer import TransferSaga, TaskStateConflict


def test_pm0110_metadata_preserved_for_blocked_skipped_items(store, clock, enabled):
    """Blocked/skipped items must retain full original metadata: id, revision, status, kind.

    The operation_items row must store:
    - item_id (PK part)
    - original_revision (persisted before any host call)
    - original_status (from input item)
    - item_kind (from input item, not just 'task' default)
    """
    class MockHost:
        def __init__(self):
            self.assignments = {}

        def get_task(self, task_id, *, board=None):
            return {"task": {
                "id": task_id,
                "assignee": "gone",
                "status": "ready",
                "current_run_id": None,
                "task_kind": "task",
            }}

        def assign_task_if_unchanged(self, task_id, from_profile, to_profile, guard):
            raise TaskStateConflict("claimed_or_running")

    host = MockHost()
    saga = TransferSaga(store, host, clock=clock)

    # Execute with items that will be skipped due to "claimed_or_running"
    outcome = saga.execute(
        op_id="op-meta-test",
        idempotency_key="k-meta-test",
        project_id="demo",
        from_profile="gone",
        to_profile="new",
        items=[
            {"id": "t1", "revision": 7, "status": "running", "kind": "task"},
            {"id": "t2", "revision": 3, "status": "claimed", "kind": "task"},
            {"id": "t3", "revision": 5, "status": "blocked", "kind": "comment"},
        ],
    )

    # Verify the operation is not completed due to blocked items
    assert outcome["state"] == "running"

    # Verify DB rows have ALL original metadata preserved
    rows = store._conn.execute(
        "SELECT item_id, revision, status, item_kind, outcome FROM operation_items "
        "WHERE op_id='op-meta-test' ORDER BY item_id"
    ).fetchall()

    assert len(rows) == 3, f"Expected 3 rows, got {len(rows)}"

    # t1: revision 7, status running, kind task
    t1_row = next(r for r in rows if r["item_id"] == "t1")
    assert t1_row["revision"] == 7, f"t1 revision should be 7, got {t1_row['revision']}"
    assert t1_row["status"] == "running", f"t1 status should be 'running', got {t1_row['status']}"
    assert t1_row["item_kind"] == "task", f"t1 kind should be 'task', got {t1_row['item_kind']}"
    assert t1_row["outcome"] == "pending", "t1 outcome should be 'pending' (retryable blocker)"

    # t2: revision 3, status claimed
    t2_row = next(r for r in rows if r["item_id"] == "t2")
    assert t2_row["revision"] == 3, f"t2 revision should be 3, got {t2_row['revision']}"
    assert t2_row["status"] == "claimed", f"t2 status should be 'claimed', got {t2_row['status']}"

    # t3: revision 5, status blocked, kind comment
    t3_row = next(r for r in rows if r["item_id"] == "t3")
    assert t3_row["revision"] == 5, f"t3 revision should be 5, got {t3_row['revision']}"
    assert t3_row["status"] == "blocked", f"t3 status should be 'blocked', got {t3_row['status']}"
    assert t3_row["item_kind"] == "comment", f"t3 kind should be 'comment', got {t3_row['item_kind']}"


def test_pm0110_retry_uses_exact_persisted_revision(store, clock, enabled):
    """Retry must pass the exact persisted revision to assign_task_if_unchanged.

    Scenario:
    1. Execute item {id:t, status:running, revision:7}
    2. Retry while still running -> stays pending (eligible check fails)
    3. Canonical status changes to ready (external event)
    4. Retry should pass revision:7 to assign_task_if_unchanged
    5. Operation completes -> member departs
    6. Assert DB row revision=7 before AND after retries
    """
    class RevisionTrackingHost:
        def __init__(self):
            self.assignments = {}
            self.statuses = {"t": "running"}  # Start with running
            self.revisions_seen = []  # Track what revisions passed to host

        def get_task(self, task_id, *, board=None):
            return {"task": {
                "id": task_id,
                "assignee": "gone" if task_id not in self.assignments else self.assignments[task_id],
                "status": self.statuses.get(task_id, "running"),
                "current_run_id": None,
                "task_kind": "task",
            }}

        def assign_task_if_unchanged(self, task_id, from_profile, to_profile, guard):
            self.revisions_seen.append(guard.get("expected_revision"))
            # Assignment succeeds if status is now ready
            if self.statuses.get(task_id) == "ready":
                self.assignments[task_id] = to_profile
                return {"id": task_id, "assignee": to_profile, "status": "ready"}
            raise TaskStateConflict("claimed_or_running")

    from hermes_project_stewardship.persistence.membership import MembershipService
    from hermes_project_stewardship.persistence.service import StewardshipService

    members = MembershipService(store, StewardshipService(store, clock=clock), clock=clock)
    members.add_member("demo", "gone", role="member")
    host = RevisionTrackingHost()
    saga = TransferSaga(store, host, clock=clock)

    # Initial execute with revision 7, status running
    outcome1 = saga.execute(
        op_id="op-revision-test",
        idempotency_key="k-revision-test",
        project_id="demo",
        from_profile="gone",
        to_profile="new",
        items=[{"id": "t", "revision": 7, "status": "running", "kind": "task", "assignee": "gone"}],
        membership=members,
    )

    # First execute: status is running, not eligible -> operation stays running
    assert outcome1["state"] == "running", "First execute should be running (blocked)"
    assert outcome1["completed_items"] == 0

    # Verify revision 7 was stored in DB
    row_before = store._conn.execute(
        "SELECT revision FROM operation_items WHERE op_id='op-revision-test'"
    ).fetchone()
    assert row_before["revision"] == 7, f"DB revision should be 7, got {row_before['revision']}"

    # First retry: status still running, stays pending
    host.revisions_seen = []
    outcome2 = saga.retry("op-revision-test")
    assert outcome2["state"] == "running", "Second execute should still be running (status still running)"
    # assign_task_if_unchanged should NOT have been called (status still running)
    assert len(host.revisions_seen) == 0, "Should not call assign when status still running"

    # Now the canonical status changes to ready (simulated external event)
    host.statuses["t"] = "ready"

    # Second retry: should call assign_task_if_unchanged with revision 7
    host.revisions_seen = []
    outcome3 = saga.retry("op-revision-test", membership=members)
    assert outcome3["state"] == "completed", f"Expected completed, got {outcome3['state']}"
    assert outcome3["completed_items"] == 1
    assert next(m.state for m in members.list_members("demo", include_departed=True)
                if m.profile_slug == "gone") == "departed"
    # Verify revision 7 was passed to the host
    assert 7 in host.revisions_seen, f"Expected revision 7 in guard, saw {host.revisions_seen}"

    # Verify the revision is still 7 in the DB after completion
    row_after = store._conn.execute(
        "SELECT revision FROM operation_items WHERE op_id='op-revision-test'"
    ).fetchone()
    assert row_after["revision"] == 7, f"DB revision should still be 7 after completion, got {row_after['revision']}"


def test_pm0110_no_blocked_records_with_only_id_and_reason(store, clock, enabled):
    """Blocked records must NOT contain only {id, reason}.

    The evidence file explicitly states: "Do not create blocked records containing only {id, reason}".
    Full metadata (revision, status, kind) must be preserved in both:
    1. The returned skipped_items dict
    2. The persisted operation_items DB row
    """
    class MockHost:
        def get_task(self, task_id, *, board=None):
            return {"task": {
                "id": task_id,
                "assignee": "gone",
                "status": "ready",
                "current_run_id": None,
                "task_kind": "task",
            }}

        def assign_task_if_unchanged(self, task_id, from_profile, to_profile, guard):
            raise TaskStateConflict("claimed_or_running")

    host = MockHost()
    saga = TransferSaga(store, host, clock=clock)

    outcome = saga.execute(
        op_id="op-narrow-blocked",
        idempotency_key="k-narrow-blocked",
        project_id="demo",
        from_profile="gone",
        to_profile="new",
        items=[{"id": "blocked-item", "revision": 42, "status": "running", "kind": "task"}],
    )

    # Check the returned skipped_items has full metadata
    skipped = outcome["skipped_items"]
    assert len(skipped) == 1
    item = skipped[0]

    # Must have ID
    assert "id" in item
    assert item["id"] == "blocked-item"

    # Must have revision (not just id and reason)
    assert "revision" in item, "Blocked item must preserve revision"
    assert item["revision"] == 42

    # Must have status
    assert "status" in item, "Blocked item must preserve original status"
    assert item["status"] == "running"

    # Must have kind
    assert "kind" in item, "Blocked item must preserve original kind"
    assert item["kind"] == "task"

    # Must have reason
    assert "reason" in item
    assert item["reason"] == "claimed_or_running"

    # Also verify DB row has full metadata
    row = store._conn.execute(
        "SELECT item_id, revision, status, item_kind, outcome FROM operation_items "
        "WHERE op_id='op-narrow-blocked'"
    ).fetchone()
    assert row["item_id"] == "blocked-item"
    assert row["revision"] == 42
    assert row["status"] == "running"
    assert row["item_kind"] == "task"


def test_pm0110_conflict_skip_preserves_metadata(store, clock, enabled):
    """A conditional conflict reported during execute keeps full metadata."""
    class Host:
        def get_task(self, task_id, *, board=None):
            return {"task": {"id": task_id, "assignee": "gone", "status": "ready", "task_kind": "task"}}

        def assign_task_if_unchanged(self, task_id, from_profile, to_profile, guard):
            raise TaskStateConflict("unassigned_work_not_captured")

    outcome = TransferSaga(store, Host(), clock=clock).execute(
        op_id="op-conflict-meta", idempotency_key="k-conflict-meta", project_id="demo",
        from_profile="gone", to_profile="new",
        items=[{"id": "conflict", "revision": 9, "status": "ready", "kind": "task", "assignee": "gone"}],
    )
    assert outcome["skipped_items"] == [{
        "id": "conflict", "revision": 9, "status": "ready", "kind": "task",
        "reason": "unassigned_work_not_captured",
    }]
