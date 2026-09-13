"""Lane B Phase 7 — departure pagination / stale / claimed / crash recovery (PM-0703).

Reuses the Phase 4 TeamManagementService seam with a lane-owned fake port
(no production edits). Proves the exact behaviours the release gate needs:
multi-page enumeration, stale-preview 409, claimed/running + epic refusal,
partial-operation crash recovery with per-item audit, and bulk-subset safety.
"""
from __future__ import annotations

import pytest

from hermes_project_stewardship.persistence.membership import MembershipService
from hermes_project_stewardship.persistence.service import StewardshipService
from hermes_project_stewardship.persistence.store import Store
from hermes_project_stewardship.persistence.team_management import (
    PreviewConflict,
    TeamManagementService,
)


class LaneBPhase7Port:
    """Lane-owned canonical-work fake (mirrors Phase 4 seam, new names)."""

    def __init__(self, tasks=None):
        self.tasks = {str(t["id"]): dict(t) for t in (tasks or [])}
        self.profiles = [
            {"slug": "lead", "available": True},
            {"slug": "gone", "available": True},
            {"slug": "new", "available": True},
        ]
        self.fail_once: set[str] = set()
        self.calls: list[str] = []

    def list_profiles(self):
        return list(self.profiles)

    def list_work(self, project_id):
        return [dict(v) for v in self.tasks.values()]

    def get_task(self, task_id):
        return {"task": dict(self.tasks[task_id])}

    def assign_task_if_unchanged(self, task_id, from_profile, to_profile, guard):
        self.calls.append(task_id)
        task = self.tasks[task_id]
        if task_id in self.fail_once:
            self.fail_once.remove(task_id)
            raise RuntimeError("lane-b injected host unavailable")
        if task.get("assignee") != guard["expect_assignee"]:
            from hermes_project_stewardship.persistence.transfer import TaskStateConflict

            raise TaskStateConflict("assignee_changed")
        if task.get("status") not in guard["eligible_statuses"] or task.get("current_run_id"):
            from hermes_project_stewardship.persistence.transfer import TaskStateConflict

            raise TaskStateConflict("claimed_or_running")
        if int(task.get("revision", 0)) != int(guard["expected_revision"]):
            from hermes_project_stewardship.persistence.transfer import TaskStateConflict

            raise TaskStateConflict("revision_changed")
        task["assignee"] = to_profile
        return dict(task)

    # CanonicalWorkService compatibility for API construction.
    def get_work(self, project_id, kind, item_id):
        return dict(self.tasks[item_id])

    def assign_work(self, project_id, kind, item_id, assignee):
        self.tasks[item_id]["assignee"] = assignee
        return dict(self.tasks[item_id])

    def list_work_links(self, project_id, item_id):
        return []


def _setup(tmp_path, tasks):
    store = Store(tmp_path / "lane-b-departure.db")
    stewardship = StewardshipService(store)
    stewardship.enable("demo", mission="m", lead_profile="lead",
                       member_profiles=["gone", "new"])
    members = MembershipService(store, stewardship)
    port = LaneBPhase7Port(tasks)
    teams = TeamManagementService(store, stewardship, members, port)
    return store, members, port, teams


def _task(i, status="ready", kind="task", assignee="gone", run_id=None):
    return {"id": f"t{i}", "title": f"Task {i}", "status": status,
            "kind": kind, "assignee": assignee, "revision": i,
            "current_run_id": run_id}


def test_multi_page_enumeration_cannot_hide_106th_task(tmp_path):
    """PM-0703: >100 tasks enumerate completely (106th task visible)."""
    store, _, _, teams = _setup(tmp_path, [_task(i) for i in range(1, 126)])
    try:
        result = teams.team("demo")
        assert result["complete"] is True
        assert result["work_item_count"] == 125
        gone = next(m for m in result["members"] if m["profile_slug"] == "gone")
        assert gone["workload"]["total"] == 125
        preview = teams.preview("demo", "gone", "new")
        assert preview["complete"] is True
        assert len(preview["eligible_items"]) == 125
        assert any(x["id"] == "t106" for x in preview["eligible_items"])
    finally:
        store.close()


def test_stale_preview_rejected_with_409_and_no_writes(tmp_path):
    """PM-0703: mutated revision after preview -> PreviewConflict, zero calls."""
    tasks = [_task(1), _task(2)]
    store, members, port, teams = _setup(tmp_path, tasks)
    try:
        preview = teams.preview("demo", "gone", "new")
        assert preview["fingerprint"]
        port.tasks["t1"]["revision"] += 1
        with pytest.raises(PreviewConflict, match="stale"):
            teams.execute_departure("demo", "gone", "new",
                                    fingerprint=preview["fingerprint"],
                                    selected_ids=None, idempotency_key="lane-b-stale",
                                    actor="human")
        assert members._row("demo", "gone").state == "active"
        assert port.calls == []
    finally:
        store.close()


def test_claimed_running_epic_and_done_are_refused(tmp_path):
    """PM-0703: claimed/running/epic/done items excluded with exact reasons."""
    tasks = [
        _task(1),
        _task(2, "running"),
        _task(3, "ready", "epic"),
        _task(4, "done"),
        _task(5, "ready", "task", "gone", run_id=99),
    ]
    store, _, _, teams = _setup(tmp_path, tasks)
    try:
        preview = teams.preview("demo", "gone", "new")
        assert preview["complete"] is True
        assert [x["id"] for x in preview["eligible_items"]] == ["t1"]
        reasons = {x["reason"] for x in preview["excluded_items"]}
        assert "claimed_or_running" in reasons
        assert "epic_assignment_unsupported" in reasons
        assert any(r.startswith("not_eligible") for r in reasons)
    finally:
        store.close()


def test_partial_crash_recovery_retry_completes_with_audit(tmp_path):
    """PM-0703: injected host failure -> running/departure_pending -> retry completes."""
    store, members, port, teams = _setup(tmp_path, [_task(1), _task(2)])
    try:
        port.fail_once.add("t2")
        preview = teams.preview("demo", "gone", "new")
        first = teams.execute_departure("demo", "gone", "new",
                                        fingerprint=preview["fingerprint"],
                                        selected_ids=None, idempotency_key="lane-b-crash",
                                        actor="verified-human")
        assert first["state"] == "running"
        assert members._row("demo", "gone").state == "departure_pending"
        retried = teams.retry(first["op_id"], actor="verified-human")
        assert retried["state"] == "completed"
        assert members._row("demo", "gone").state == "departed"
        assert {t["assignee"] for t in port.tasks.values()} == {"new"}
        audits = store._conn.execute(
            "SELECT actor, detail_json FROM stewardship_audit_log WHERE action='workitem.reassigned'"
        ).fetchall()
        assert len(audits) == 2
        assert {r["actor"] for r in audits} == {"verified-human"}
        assert all(first["op_id"] in r["detail_json"] for r in audits)
    finally:
        store.close()


def test_bulk_subset_does_not_depart_member(tmp_path):
    """PM-0703: subset bulk reassignment completes without departing the member."""
    store, members, port, teams = _setup(tmp_path, [_task(1), _task(2)])
    try:
        preview = teams.preview("demo", "gone", "new")
        result = teams.execute_bulk("demo", "gone", "new",
                                    fingerprint=preview["fingerprint"],
                                    selected_ids=["t1"],
                                    idempotency_key="lane-b-bulk",
                                    actor="verified-human")
        assert result["state"] == "completed"
        assert members._row("demo", "gone").state == "active"
        assert port.tasks["t1"]["assignee"] == "new"
        assert port.tasks["t2"]["assignee"] == "gone"
    finally:
        store.close()
