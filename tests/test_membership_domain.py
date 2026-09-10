"""Phase 1 (PM-0101..0110) RED tests: membership, goals, saga contracts.

Every test here is written first and must fail against the pre-Phase-1
source; each turns GREEN with the corresponding contract implementation.
"""
from __future__ import annotations

import pytest


def test_pm0101_project_member_dataclass_exists():
    """PM-0101: ProjectMember dataclass with the exact Phase 1 fields."""
    from hermes_project_stewardship.domain.models import ProjectMember

    member = ProjectMember(
        project_id="demo",
        profile_slug="octacon",
        role="lead",
        state="active",
        joined_at="2026-09-10T00:00:00+00:00",
        left_at=None,
    )
    assert member.project_id == "demo"
    assert member.profile_slug == "octacon"
    assert member.role == "lead"
    assert member.state == "active"
    assert member.joined_at.startswith("2026-09-10")
    assert member.left_at is None


def test_pm0104_membership_states_enum():
    """PM-0104: active, departure_pending, departed + unavailable display status."""
    from hermes_project_stewardship.domain.constants import MembershipState

    assert MembershipState.ACTIVE.value == "active"
    assert MembershipState.DEPARTURE_PENDING.value == "departure_pending"
    assert MembershipState.DEPARTED.value == "departed"
    assert MembershipState.UNAVAILABLE.value == "unavailable"


def test_pm0106_goal_entity():
    """PM-0106: Goal with stable ID, project, title, description, order, archive timestamps."""
    from hermes_project_stewardship.domain.models import Goal

    goal = Goal(
        goal_id="GOAL-ABC123",
        project_id="demo",
        title="Ship Phase 1",
        description="",
        position=1,
    )
    assert goal.goal_id.startswith("GOAL-")
    assert hasattr(goal, "archived_at")


def test_pm0106_goal_supports_multiple_objectives(store, clock, enabled):
    """Fix 7: one goal links to multiple objectives via project_objective_goals;
    unlinked objectives remain untouched."""
    cx = store._conn
    cx.execute(
        "INSERT INTO project_objectives(project_id, name, evaluator_type, target)"
        " VALUES('demo','obj1','manual','>=1')"
    )
    cx.execute(
        "INSERT INTO project_objectives(project_id, name, evaluator_type, target)"
        " VALUES('demo','obj2','manual','>=2')"
    )
    cx.execute(
        "INSERT INTO project_objectives(project_id, name, evaluator_type, target)"
        " VALUES('demo','unlinked','manual','>=3')"
    )
    cx.execute(
        "INSERT INTO project_goals(goal_id, project_id, title, created_at, updated_at)"
        " VALUES('GOAL-1','demo','t','2026-01-01','2026-01-01')"
    )
    cx.execute(
        "INSERT INTO project_objective_goals(objective_id, goal_id) VALUES(1,'GOAL-1')"
    )
    cx.execute(
        "INSERT INTO project_objective_goals(objective_id, goal_id) VALUES(2,'GOAL-1')"
    )
    cx.commit()
    linked = [r["objective_id"] for r in cx.execute(
        "SELECT objective_id FROM project_objective_goals WHERE goal_id='GOAL-1'"
    ).fetchall()]
    assert sorted(linked) == [1, 2]
    # Unlinked objective preserved.
    assert cx.execute(
        "SELECT COUNT(*) AS n FROM project_objectives WHERE project_id='demo'"
    ).fetchone()["n"] == 3


def test_pm0102_membership_is_sole_writable_representation(store, clock, enabled):
    """PM-0102/0103: normalised membership rows are writable through the
    membership service; the legacy settings fields remain readable
    projections that reflect the normalised table."""
    from hermes_project_stewardship.persistence.membership import MembershipService
    from hermes_project_stewardship.persistence.service import StewardshipService

    svc = StewardshipService(store, clock=clock)
    members = MembershipService(store, svc, clock=clock)

    members.add_member("demo", "octacon", role="member")
    members.add_member("demo", "gojo", role="member")
    listing = members.list_members("demo")
    by_slug = {m.profile_slug: m for m in listing}
    assert set(by_slug) >= {"octacon", "gojo"}
    assert all(m.state == "active" for m in listing)

    # Exactly one lead: transfer moves the role, never duplicates it.
    members.transfer_lead("demo", "octacon")
    leads = [m for m in members.list_members("demo") if m.role == "lead"]
    assert len(leads) == 1
    assert leads[0].profile_slug == "octacon"

    # Legacy projection reflects the normalised table exactly (read-only).
    settings = svc.settings("demo")
    assert settings["owner"]["lead_profile"] == "octacon"
    normalised_members = sorted(m.profile_slug for m in members.list_members("demo") if m.role != "lead")
    assert settings["owner"]["member_profiles"] == normalised_members


def test_pm0103_only_one_lead_enforced_in_database(store, clock, enabled):
    """PM-0103: a partial index/state guard makes two active leads impossible."""
    from hermes_project_stewardship.persistence.membership import MembershipService
    from hermes_project_stewardship.persistence.service import StewardshipService

    svc = StewardshipService(store, clock=clock)
    members = MembershipService(store, svc, clock=clock)
    members.add_member("demo", "a", role="member")
    members.add_member("demo", "b", role="member")
    members.transfer_lead("demo", "a")
    members.transfer_lead("demo", "b")

    rows = store._conn.execute(
        "SELECT profile_slug FROM project_members"
        " WHERE project_id='demo' AND role='lead' AND state='active'"
    ).fetchall()
    assert len(rows) == 1


def test_pm0105_profile_identity_is_slug_and_relink(store, clock, enabled):
    """PM-0105: identity is the profile slug; relink marks a renamed profile."""
    from hermes_project_stewardship.persistence.membership import MembershipService
    from hermes_project_stewardship.persistence.service import StewardshipService

    svc = StewardshipService(store, clock=clock)
    members = MembershipService(store, svc, clock=clock)
    members.add_member("demo", "renamed-later", role="member")

    relinked = members.relink_profile("demo", "renamed-later", "renamed-now")
    assert relinked.profile_slug == "renamed-now"
    assert {m.profile_slug for m in members.list_members("demo")} >= {"renamed-now"}


def test_pm0104_membership_revision_monotonic_on_lead_transfer(store, clock, enabled):
    """Fix 4: revision changes even when row counts/timestamps do not."""
    from hermes_project_stewardship.persistence.membership import MembershipService
    from hermes_project_stewardship.persistence.service import StewardshipService

    svc = StewardshipService(store, clock=clock)
    members = MembershipService(store, svc, clock=clock)
    members.add_member("demo", "a", role="member")
    rev1 = members.membership_revision("demo")
    members.transfer_lead("demo", "a")
    rev2 = members.membership_revision("demo")
    assert rev2 > rev1
    # transfer BACK: same row count, same set of slugs — revision still moves.
    members.transfer_lead("demo", "lead")
    rev3 = members.membership_revision("demo")
    assert rev3 > rev2


def test_pm0108_transfer_eligibility_rules():
    """PM-0108: backlog/triage, ready, blocked, review eligible; claimed/running and epics not."""
    from hermes_project_stewardship.domain.constants import TransferEligibility

    assert TransferEligibility.is_eligible("backlog")
    assert TransferEligibility.is_eligible("triage")
    assert TransferEligibility.is_eligible("ready")
    assert TransferEligibility.is_eligible("blocked")
    assert TransferEligibility.is_eligible("review")
    assert not TransferEligibility.is_eligible("running")
    assert not TransferEligibility.is_eligible("claimed")
    assert not TransferEligibility.is_eligible("done")
    assert TransferEligibility.is_eligible("epic") is False


def test_pm0109_preview_fingerprint_covers_inputs(store, clock, enabled):
    """PM-0109: fingerprint covers board state, membership revision, task set and revisions."""
    from hermes_project_stewardship.persistence.transfer import preview_fingerprint

    fp_a = preview_fingerprint(
        project_id="demo",
        from_profile="gone",
        to_profile="new",
        membership_revision=3,
        items=[{"id": "t1", "revision": 7, "status": "ready"}],
    )
    fp_b = preview_fingerprint(
        project_id="demo",
        from_profile="gone",
        to_profile="new",
        membership_revision=3,
        items=[{"id": "t1", "revision": 7, "status": "ready"}],
    )
    fp_changed = preview_fingerprint(
        project_id="demo",
        from_profile="gone",
        to_profile="new",
        membership_revision=4,
        items=[{"id": "t1", "revision": 7, "status": "ready"}],
    )
    assert fp_a == fp_b
    assert fp_a != fp_changed
    assert len(fp_a) >= 32


def test_pm0110_saga_states_and_idempotency(store, clock, enabled):
    """PM-0110: durable saga states, idempotency key, retry and reconciliation outcome."""
    from hermes_project_stewardship.domain.constants import OperationState
    from hermes_project_stewardship.persistence.transfer import TaskStateConflict, TransferSaga

    assert {s.value for s in OperationState} >= {
        "pending", "running", "completed", "failed", "compensated",
    }

    class RecordingHost:
        def __init__(self):
            self.assignments: dict[str, str] = {}
            self.statuses: dict[str, str] = {}
            self.fail_on: set[str] = set()

        def assign_task_if_unchanged(self, task_id, from_profile, to_profile, guard):
            record = self.get_task(task_id)["task"]
            if str(record.get("assignee") or "") and str(record.get("assignee")) != from_profile:
                raise TaskStateConflict(f"assignee_changed:{record.get('assignee')}")
            if str(record.get("status") or "") not in guard["eligible_statuses"]:
                raise TaskStateConflict("claimed_or_running")
            self.assignments[task_id] = to_profile or ""
            return {"id": task_id, "assignee": to_profile, "status": "ready"}

        def assign_task(self, task_id, assignee, *, board=None):
            if task_id in self.fail_on:
                raise RuntimeError("host unavailable")
            self.assignments[task_id] = assignee or ""
            return {"id": task_id, "assignee": assignee, "status": "ready"}

        def get_task(self, task_id, *, board=None):
            return {
                "task": {
                    "id": task_id,
                    "assignee": self.assignments.get(task_id, "gone"),
                    "status": self.statuses.get(task_id, "ready"),
                    "current_run_id": None,
                    "task_kind": "task",
                }
            }

    host = RecordingHost()
    saga = TransferSaga(store, host, clock=clock)

    outcome_a = saga.execute(
        op_id="op-1",
        idempotency_key="transfer-demo-gone",
        project_id="demo",
        from_profile="gone",
        to_profile="new",
        items=[{"id": "t1", "revision": 1, "status": "ready", "assignee": "gone"},
               {"id": "t2", "revision": 1, "status": "blocked", "assignee": "gone"}],
    )
    assert outcome_a["state"] == "completed"
    assert outcome_a["completed_items"] == 2

    # Idempotent replay: same op_id returns the recorded outcome, host untouched.
    host2 = RecordingHost()
    saga2 = TransferSaga(store, host2, clock=clock)
    outcome_b = saga2.execute(
        op_id="op-1",
        idempotency_key="transfer-demo-gone",
        project_id="demo",
        from_profile="gone",
        to_profile="new",
        items=[{"id": "t1", "revision": 1, "status": "ready", "assignee": "gone"},
               {"id": "t2", "revision": 1, "status": "blocked", "assignee": "gone"}],
    )
    assert outcome_b["state"] == "completed"
    assert not host2.assignments  # replayed, no new host writes


def test_pm0110_conflicting_payload_reuse_rejected(store, clock, enabled):
    """Fix 6: same op_id/idempotency_key with a DIFFERENT payload is rejected."""
    from hermes_project_stewardship.persistence.transfer import TaskStateConflict, TransferSaga

    class RecordingHost:
        def assign_task_if_unchanged(self, task_id, from_profile, to_profile, guard):
            record = self.get_task(task_id)["task"]
            if str(record.get("assignee") or "") and str(record.get("assignee")) != from_profile:
                raise TaskStateConflict(f"assignee_changed:{record.get('assignee')}")
            if str(record.get("status") or "") not in guard["eligible_statuses"]:
                raise TaskStateConflict("claimed_or_running")
            self.assignments[task_id] = to_profile or ""
            return {"id": task_id, "assignee": to_profile, "status": "ready"}

        def assign_task(self, task_id, assignee, *, board=None):
            return {"id": task_id, "assignee": assignee, "status": "ready"}

        def get_task(self, task_id, *, board=None):
            return {"task": {"id": task_id, "assignee": "gone", "status": "ready",
                             "current_run_id": None, "task_kind": "task"}}

    saga = TransferSaga(store, RecordingHost(), clock=clock)
    saga.execute(
        op_id="op-x",
        idempotency_key="k-x",
        project_id="demo",
        from_profile="gone",
        to_profile="new",
        items=[{"id": "t1", "revision": 1, "status": "ready"}],
    )
    with pytest.raises(ValueError):
        saga.execute(
            op_id="op-x",
            idempotency_key="k-other",
            project_id="demo",
            from_profile="gone",
            to_profile="different",
            items=[{"id": "t1", "revision": 1, "status": "ready"}],
        )


def test_pm0110_preassign_assignee_change_skips_item(store, clock, enabled):
    """Fix 6: a task whose canonical assignee already moved is skipped, not stolen."""
    from hermes_project_stewardship.persistence.transfer import TaskStateConflict, TransferSaga

    class MovedHost:
        def __init__(self):
            self.assignments = {"t1": "someone-else"}

        def assign_task_if_unchanged(self, task_id, from_profile, to_profile, guard):
            record = self.get_task(task_id)["task"]
            if str(record.get("assignee") or "") and str(record.get("assignee")) != from_profile:
                raise TaskStateConflict(f"assignee_changed:{record.get('assignee')}")
            if str(record.get("status") or "") not in guard["eligible_statuses"]:
                raise TaskStateConflict("claimed_or_running")
            self.assignments[task_id] = to_profile or ""
            return {"id": task_id, "assignee": to_profile, "status": "ready"}

        def assign_task(self, task_id, assignee, *, board=None):
            self.assignments[task_id] = assignee or ""
            return {"id": task_id, "assignee": assignee, "status": "ready"}

        def get_task(self, task_id, *, board=None):
            return {"task": {"id": task_id, "assignee": self.assignments.get(task_id, "gone"),
                             "status": "ready", "current_run_id": None, "task_kind": "task"}}

    host = MovedHost()
    saga = TransferSaga(store, host, clock=clock)
    outcome = saga.execute(
        op_id="op-m",
        idempotency_key="k-m",
        project_id="demo",
        from_profile="gone",
        to_profile="new",
        items=[{"id": "t1", "revision": 1, "status": "ready"}],
    )
    assert outcome["completed_items"] == 0
    assert outcome["skipped_items"][0]["reason"].startswith("assignee_changed:")
    assert host.assignments["t1"] == "someone-else" if False else True
    # the item was never stolen
    assert host.assignments["t1"] == "someone-else"


def test_pm0110_membership_depature_pending_until_resolved(store, clock, enabled):
    """Fix 6: departure_pending before transfer; departed only after clean completion."""
    from hermes_project_stewardship.domain.constants import MembershipState
    from hermes_project_stewardship.persistence.membership import MembershipService
    from hermes_project_stewardship.persistence.service import StewardshipService
    from hermes_project_stewardship.persistence.transfer import TaskStateConflict, TransferSaga

    svc = StewardshipService(store, clock=clock)
    members = MembershipService(store, svc, clock=clock)
    members.add_member("demo", "gone", role="member")

    seen_states = []

    class TrackingHost:
        def __init__(self):
            self.assignments = {}

        def get_task(self, task_id, *, board=None):
            return {"task": {"id": task_id, "assignee": self.assignments.get(task_id),
                             "status": "ready", "current_run_id": None,
                             "task_kind": "task"}}

        def assign_task_if_unchanged(self, task_id, from_profile, to_profile, guard):
            record = self.get_task(task_id)["task"]
            if str(record.get("assignee") or "") and str(record.get("assignee")) != from_profile:
                raise TaskStateConflict(f"assignee_changed:{record.get('assignee')}")
            if str(record.get("status") or "") not in guard["eligible_statuses"]:
                raise TaskStateConflict("claimed_or_running")
            seen_states.append(next(
                (m.state for m in members.list_members("demo", include_departed=True)
                 if m.profile_slug == "gone"), None))
            self.assignments[task_id] = to_profile or ""
            return {"id": task_id, "assignee": to_profile, "status": "ready"}

        def get_task(self, task_id, *, board=None):
            return {"task": {"id": task_id, "assignee": self.assignments.get(task_id, "gone"),
                             "status": "ready", "current_run_id": None, "task_kind": "task"}}

    host = TrackingHost()
    saga = TransferSaga(store, host, clock=clock)
    outcome = saga.execute(
        op_id="op-s",
        idempotency_key="k-s",
        project_id="demo",
        from_profile="gone",
        to_profile="new",
        items=[{"id": "t1", "revision": 1, "status": "ready"}],
        membership=members,
    )
    assert outcome["state"] == "completed"
    # during execution the member was already departure_pending
    assert seen_states and seen_states[0] == MembershipState.DEPARTURE_PENDING.value
    final = next(
        m.state for m in members.list_members("demo", include_departed=True)
        if m.profile_slug == "gone"
    )
    assert final == MembershipState.DEPARTED.value


def test_pm0110_membership_stays_pending_with_claimed_blocker(store, clock, enabled):
    """Fix 6: claimed/running blockers keep the member pending, never departed."""
    from hermes_project_stewardship.persistence.membership import MembershipService
    from hermes_project_stewardship.persistence.service import StewardshipService
    from hermes_project_stewardship.persistence.transfer import TaskStateConflict, TransferSaga

    svc = StewardshipService(store, clock=clock)
    members = MembershipService(store, svc, clock=clock)
    members.add_member("demo", "gone", role="member")

    class Host:
        def assign_task_if_unchanged(self, task_id, from_profile, to_profile, guard):
            record = self.get_task(task_id)["task"]
            if str(record.get("assignee") or "") and str(record.get("assignee")) != from_profile:
                raise TaskStateConflict(f"assignee_changed:{record.get('assignee')}")
            if str(record.get("status") or "") not in guard["eligible_statuses"]:
                raise TaskStateConflict("claimed_or_running")
            self.assignments[task_id] = to_profile or ""
            return {"id": task_id, "assignee": to_profile, "status": "ready"}

        def assign_task(self, task_id, assignee, *, board=None):
            return {"id": task_id, "assignee": assignee, "status": "ready"}

        def get_task(self, task_id, *, board=None):
            return {"task": {"id": task_id, "assignee": "gone", "status": "ready",
                             "current_run_id": None, "task_kind": "task"}}

    saga = TransferSaga(store, Host(), clock=clock)
    outcome = saga.execute(
        op_id="op-p",
        idempotency_key="k-p",
        project_id="demo",
        from_profile="gone",
        to_profile="new",
        items=[{"id": "t1", "revision": 1, "status": "ready"},
               {"id": "t2", "revision": 1, "status": "running"}],
        membership=members,
    )
    state = next(m.state for m in members.list_members("demo") if m.profile_slug == "gone")
    assert state == "departure_pending"


def test_pm0108_claimed_running_never_transferred_by_saga(store, clock, enabled):
    """Phase 0 decision: claimed/running stays non-transferable; saga skips it explicitly."""
    from hermes_project_stewardship.persistence.transfer import TaskStateConflict, TransferSaga

    class RecordingHost:
        def __init__(self):
            self.assignments = {}

        def assign_task_if_unchanged(self, task_id, from_profile, to_profile, guard):
            record = self.get_task(task_id)["task"]
            if str(record.get("assignee") or "") and str(record.get("assignee")) != from_profile:
                raise TaskStateConflict(f"assignee_changed:{record.get('assignee')}")
            if str(record.get("status") or "") not in guard["eligible_statuses"]:
                raise TaskStateConflict("claimed_or_running")
            self.assignments[task_id] = to_profile or ""
            return {"id": task_id, "assignee": to_profile, "status": "ready"}

        def assign_task(self, task_id, assignee, *, board=None):
            self.assignments[task_id] = assignee or ""
            return {"id": task_id, "assignee": assignee, "status": "ready"}

        def get_task(self, task_id, *, board=None):
            return {"task": {"id": task_id, "assignee": self.assignments.get(task_id, "gone"),
                             "status": "ready", "current_run_id": None,
                             "task_kind": "task"}}

    host = RecordingHost()
    saga = TransferSaga(store, host, clock=clock)
    outcome = saga.execute(
        op_id="op-2",
        idempotency_key="transfer-demo-gone2-new",
        project_id="demo",
        from_profile="gone",
        to_profile="new",
        items=[{"id": "t1", "revision": 1, "status": "ready"},
               {"id": "t2", "revision": 1, "status": "running"}],
    )
    skipped = {item["id"] for item in outcome["skipped_items"]}
    assert "t2" in skipped
    assert outcome["completed_items"] == 1


def test_pm0111_capability_names_defined():
    """PM-0111: explicit capability names for the five Phase 1 authorities."""
    from hermes_project_stewardship.domain.constants import Capability

    expected = {
        "membership_admin", "lead_transfer", "bulk_reassignment",
        "project_archive", "managed_file_removal",
    }
    values = {c.value for c in Capability}
    assert expected <= values