from __future__ import annotations

import threading

import pytest
from fastapi.testclient import TestClient

from hermes_project_stewardship.api.server import create_app
from hermes_project_stewardship.persistence.membership import MembershipService
from hermes_project_stewardship.persistence.service import ServiceError, StewardshipService
from hermes_project_stewardship.persistence.store import Store
from hermes_project_stewardship.persistence.team_management import PreviewConflict, TeamManagementService


class Phase4Port:
    def __init__(self, tasks=None, profiles=None):
        self.tasks = {str(t["id"]): dict(t) for t in (tasks or [])}
        self.profiles = profiles or [{"slug": "lead", "available": True}, {"slug": "gone", "available": True}, {"slug": "new", "available": True}]
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
            raise RuntimeError("host unavailable")
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
    def get_work(self, project_id, kind, item_id): return dict(self.tasks[item_id])
    def assign_work(self, project_id, kind, item_id, assignee):
        self.tasks[item_id]["assignee"] = assignee
        return dict(self.tasks[item_id])
    def list_work_links(self, project_id, item_id): return []


def _setup(tmp_path, tasks):
    store = Store(tmp_path / "p4.db")
    stewardship = StewardshipService(store)
    stewardship.enable("demo", mission="m", lead_profile="lead", member_profiles=["gone", "new"])
    members = MembershipService(store, stewardship)
    port = Phase4Port(tasks)
    return store, members, port, TeamManagementService(store, stewardship, members, port)


def _task(i, status="ready", kind="task", assignee="gone"):
    return {"id": f"t{i}", "title": f"Task {i}", "status": status, "kind": kind, "assignee": assignee, "revision": i, "current_run_id": None}


def test_team_list_counts_complete_more_than_100_and_availability(tmp_path):
    store, _, _, teams = _setup(tmp_path, [_task(i) for i in range(1, 126)])
    result = teams.team("demo")
    gone = next(m for m in result["members"] if m["profile_slug"] == "gone")
    assert result["complete"] is True
    assert result["work_item_count"] == 125
    assert gone["workload"]["total"] == 125
    assert gone["hermes_available"] is True
    store.close()


def test_preview_exact_scope_exclusions_and_stale_refusal(tmp_path):
    tasks = [_task(1), _task(2, "running"), _task(3, "ready", "epic"), _task(4, "done")]
    store, members, port, teams = _setup(tmp_path, tasks)
    preview = teams.preview("demo", "gone", "new")
    assert preview["complete"] is True
    assert [x["id"] for x in preview["eligible_items"]] == ["t1"]
    assert {x["reason"] for x in preview["excluded_items"]} == {"claimed_or_running", "epic_assignment_unsupported", "not_eligible:done"}
    assert preview["fingerprint"]
    port.tasks["t1"]["revision"] += 1
    with pytest.raises(PreviewConflict, match="stale"):
        teams.execute_departure("demo", "gone", "new", fingerprint=preview["fingerprint"], selected_ids=None, idempotency_key="k1", actor="human")
    assert members._row("demo", "gone").state == "active"
    assert port.calls == []
    store.close()


def test_partial_retry_departure_and_per_item_audit(tmp_path):
    store, members, port, teams = _setup(tmp_path, [_task(1), _task(2)])
    port.fail_once.add("t2")
    preview = teams.preview("demo", "gone", "new")
    first = teams.execute_departure("demo", "gone", "new", fingerprint=preview["fingerprint"], selected_ids=None, idempotency_key="k2", actor="verified-human")
    assert first["state"] == "running"
    assert members._row("demo", "gone").state == "departure_pending"
    retried = teams.retry(first["op_id"], actor="verified-human")
    assert retried["state"] == "completed"
    assert members._row("demo", "gone").state == "departed"
    assert {t["assignee"] for t in port.tasks.values()} == {"new"}
    audits = store._conn.execute("SELECT actor, action, subject, detail_json FROM stewardship_audit_log WHERE action='workitem.reassigned'").fetchall()
    assert len(audits) == 2
    assert {r["actor"] for r in audits} == {"verified-human"}
    assert all(first["op_id"] in r["detail_json"] for r in audits)
    store.close()


def test_subset_bulk_reassignment_does_not_depart_member(tmp_path):
    store, members, port, teams = _setup(tmp_path, [_task(1), _task(2)])
    preview = teams.preview("demo", "gone", "new")
    result = teams.execute_bulk("demo", "gone", "new", fingerprint=preview["fingerprint"], selected_ids=["t1"], idempotency_key="bulk", actor="verified-human")
    assert result["state"] == "completed"
    assert members._row("demo", "gone").state == "active"
    assert port.tasks["t1"]["assignee"] == "new"
    assert port.tasks["t2"]["assignee"] == "gone"
    readback = teams.operation(result["op_id"])
    assert readback["actor"] == "verified-human"
    assert readback["operation_audit"]["operation"] == result["op_id"]
    assert readback["items"][0]["audit"]["action"] == "workitem.reassigned"
    assert readback["items"][0]["audit"]["actor"] == "verified-human"
    store.close()


def test_concurrent_task_creation_between_preview_and_execute_is_stale_without_writes(tmp_path):
    store, members, port, teams = _setup(tmp_path, [_task(1)])
    preview = teams.preview("demo", "gone", "new")
    recomputing = threading.Event()
    release = threading.Event()
    original_list = port.list_work
    calls = 0

    def barrier_list(project_id):
        nonlocal calls
        calls += 1
        if calls == 1:
            recomputing.set()
            assert release.wait(5)
        return original_list(project_id)

    port.list_work = barrier_list
    result = {}

    def execute():
        try:
            teams.execute_departure(
                "demo", "gone", "new", fingerprint=preview["fingerprint"],
                selected_ids=None, idempotency_key="concurrent-create", actor="verified-human",
            )
        except Exception as exc:
            result["error"] = exc

    worker = threading.Thread(target=execute)
    worker.start()
    assert recomputing.wait(5)
    port.tasks["t2"] = _task(2)
    release.set()
    worker.join(5)
    assert isinstance(result.get("error"), PreviewConflict)
    assert port.calls == []
    assert {task["assignee"] for task in port.tasks.values()} == {"gone"}
    assert members._row("demo", "gone").state == "active"
    store.close()


def test_departure_rechecks_scope_after_execution_before_marking_departed(tmp_path):
    store, members, port, teams = _setup(tmp_path, [_task(1)])
    preview = teams.preview("demo", "gone", "new")
    original = port.assign_task_if_unchanged

    def assign_then_create(*args, **kwargs):
        result = original(*args, **kwargs)
        port.tasks["t2"] = _task(2)
        return result

    port.assign_task_if_unchanged = assign_then_create
    result = teams.execute_departure(
        "demo", "gone", "new", fingerprint=preview["fingerprint"],
        selected_ids=None, idempotency_key="late-scope", actor="verified-human",
    )

    assert result["state"] == "running"
    assert result["scope_changed"] is True
    assert result["new_item_ids"] == ["t2"]
    assert members._row("demo", "gone").state == "departure_pending"
    assert port.tasks["t2"]["assignee"] == "gone"
    assert [row["item_id"] for row in store._conn.execute(
        "SELECT item_id FROM operation_items WHERE op_id=? ORDER BY item_id", (result["op_id"],)
    ).fetchall()] == ["t1"]
    store.close()


def test_departure_retry_rechecks_scope_and_requires_fresh_preview(tmp_path):
    store, members, port, teams = _setup(tmp_path, [_task(1)])
    port.fail_once.add("t1")
    preview = teams.preview("demo", "gone", "new")
    first = teams.execute_departure(
        "demo", "gone", "new", fingerprint=preview["fingerprint"],
        selected_ids=None, idempotency_key="retry-expanded", actor="verified-human",
    )
    assert first["state"] in {"failed", "running"}
    port.tasks["t2"] = _task(2)

    retried = teams.retry(first["op_id"], actor="verified-human")

    assert retried["state"] == "running"
    assert retried["scope_changed"] is True
    assert retried["new_item_ids"] == ["t2"]
    assert members._row("demo", "gone").state == "departure_pending"
    assert port.tasks["t1"]["assignee"] == "new"
    assert port.tasks["t2"]["assignee"] == "gone"
    store.close()


def test_departure_does_not_complete_when_approved_item_returns_to_source(tmp_path):
    store, members, port, teams = _setup(tmp_path, [_task(1)])
    preview = teams.preview("demo", "gone", "new")
    original_list = port.list_work

    def return_approved_item(project_id):
        if port.tasks["t1"]["assignee"] == "new":
            port.tasks["t1"]["assignee"] = "gone"
        return original_list(project_id)

    port.list_work = return_approved_item
    result = teams.execute_departure(
        "demo", "gone", "new", fingerprint=preview["fingerprint"],
        selected_ids=None, idempotency_key="approved-item-returned", actor="verified-human",
    )

    assert result["state"] == "running"
    assert result["scope_changed"] is True
    assert result["changed_item_ids"] == ["t1"]
    assert members._row("demo", "gone").state == "departure_pending"
    assert port.tasks["t1"]["assignee"] == "gone"
    assert teams.operation(result["op_id"])["state"] == "running"
    store.close()


def test_final_readback_failure_keeps_operation_pending_actor_and_retryable(tmp_path):
    store, members, port, teams = _setup(tmp_path, [_task(1)])
    preview = teams.preview("demo", "gone", "new")
    original_list = port.list_work

    def fail_final_read(project_id):
        if port.tasks["t1"]["assignee"] == "new":
            raise RuntimeError("canonical readback unavailable")
        return original_list(project_id)

    port.list_work = fail_final_read
    with pytest.raises(RuntimeError, match="canonical readback unavailable"):
        teams.execute_departure(
            "demo", "gone", "new", fingerprint=preview["fingerprint"],
            selected_ids=None, idempotency_key="final-read-failure", actor="verified-human",
        )

    row = store._conn.execute(
        "SELECT op_id, state FROM operation_journal WHERE idempotency_key=?",
        ("final-read-failure",),
    ).fetchone()
    assert row["state"] == "running"
    assert members._row("demo", "gone").state == "departure_pending"
    pending = teams.operation(row["op_id"])
    assert pending["state"] == "running"
    assert pending["actor"] == "verified-human"

    port.list_work = original_list
    recovered = teams.retry(row["op_id"], actor="verified-human")
    assert recovered["state"] == "completed"
    assert members._row("demo", "gone").state == "departed"
    assert teams.operation(row["op_id"])["actor"] == "verified-human"
    store.close()


def test_interruption_before_final_verification_never_persists_completed(tmp_path, monkeypatch):
    store, members, port, teams = _setup(tmp_path, [_task(1)])
    preview = teams.preview("demo", "gone", "new")

    def interrupt(result, **kwargs):
        operation = teams.operation(result["op_id"])
        assert operation["state"] == "running"
        assert operation["actor"] == "verified-human"
        raise RuntimeError("interruption before final verification")

    monkeypatch.setattr(teams, "_finish_departure_if_scope_unchanged", interrupt)
    with pytest.raises(RuntimeError, match="interruption before final verification"):
        teams.execute_departure(
            "demo", "gone", "new", fingerprint=preview["fingerprint"],
            selected_ids=None, idempotency_key="final-interruption", actor="verified-human",
        )

    row = store._conn.execute(
        "SELECT op_id, state FROM operation_journal WHERE idempotency_key=?",
        ("final-interruption",),
    ).fetchone()
    assert row["state"] == "running"
    assert members._row("demo", "gone").state == "departure_pending"
    assert teams.operation(row["op_id"])["actor"] == "verified-human"
    store.close()


def test_zero_work_departure_completes_after_empty_canonical_verification(tmp_path):
    store, members, _, teams = _setup(tmp_path, [])
    preview = teams.preview("demo", "gone", "new")

    result = teams.execute_departure(
        "demo", "gone", "new", fingerprint=preview["fingerprint"],
        selected_ids=None, idempotency_key="empty-departure", actor="verified-human",
    )

    assert result["state"] == "completed"
    assert result["total_items"] == 0
    assert teams.operation(result["op_id"])["state"] == "completed"
    assert members._row("demo", "gone").state == "departed"
    store.close()


def test_zero_work_departure_retry_preserves_completed_state(tmp_path):
    store, members, _, teams = _setup(tmp_path, [])
    preview = teams.preview("demo", "gone", "new")
    first = teams.execute_departure(
        "demo", "gone", "new", fingerprint=preview["fingerprint"],
        selected_ids=None, idempotency_key="empty-retry", actor="verified-human",
    )

    replay = teams.retry(first["op_id"], actor="verified-human")

    assert replay["state"] == "completed"
    assert teams.operation(first["op_id"])["state"] == "completed"
    assert teams.operation(first["op_id"])["actor"] == "verified-human"
    assert members._row("demo", "gone").state == "departed"
    store.close()


def test_nonempty_approved_scope_with_missing_outcome_fails_closed(tmp_path, monkeypatch):
    store, members, _, teams = _setup(tmp_path, [_task(1)])
    preview = teams.preview("demo", "gone", "new")
    original_finish = teams._finish_departure_if_scope_unchanged

    def remove_outcome_then_finish(result, **kwargs):
        with store.tx() as cx:
            cx.execute("DELETE FROM operation_items WHERE op_id=?", (result["op_id"],))
        return original_finish(result, **kwargs)

    monkeypatch.setattr(teams, "_finish_departure_if_scope_unchanged", remove_outcome_then_finish)
    result = teams.execute_departure(
        "demo", "gone", "new", fingerprint=preview["fingerprint"],
        selected_ids=None, idempotency_key="missing-outcome", actor="verified-human",
    )

    assert result["state"] == "running"
    assert result["outcome_incomplete"] is True
    assert result["missing_outcome_ids"] == ["t1"]
    assert teams.operation(result["op_id"])["state"] == "running"
    assert members._row("demo", "gone").state == "departure_pending"
    store.close()


def test_self_transfer_rejected_before_reads_or_mutation(tmp_path):
    store, members, port, teams = _setup(tmp_path, [_task(1)])
    before_audits = store._conn.execute("SELECT COUNT(*) FROM stewardship_audit_log").fetchone()[0]

    with pytest.raises(ServiceError, match="source and destination profiles must differ"):
        teams.preview("demo", "gone", "gone")

    client = TestClient(create_app(
        store, kanban_adapter=port, auth_token="secret",
        auth_principal="sahil", auth_principal_is_human=True,
    ))
    response = client.post(
        "/stewardship/v1/projects/demo/transfers/preview",
        headers={"Authorization": "Bearer secret"},
        json={"from_profile": "gone", "to_profile": "gone"},
    )
    assert response.status_code == 409
    assert response.json() == {"error": {
        "code": "conflict", "message": "source and destination profiles must differ"
    }}

    assert port.calls == []
    assert members._row("demo", "gone").state == "active"
    assert store._conn.execute("SELECT COUNT(*) FROM operation_journal").fetchone()[0] == 0
    assert store._conn.execute("SELECT COUNT(*) FROM stewardship_audit_log").fetchone()[0] == before_audits
    store.close()


def test_api_authority_profile_validation_and_409(tmp_path):
    tasks = [_task(1)]
    store, members, port, _ = _setup(tmp_path, tasks)
    denied = TestClient(create_app(store, kanban_adapter=port))
    before = members.membership_revision("demo")
    response = denied.post("/stewardship/v1/projects/demo/members", json={"profile_slug": "other", "role": "member"})
    assert response.status_code in {403, 503}
    assert members.membership_revision("demo") == before

    client = TestClient(create_app(store, kanban_adapter=port, auth_token="secret", auth_principal="sahil", auth_principal_is_human=True))
    headers = {"Authorization": "Bearer secret"}
    unavailable = client.post("/stewardship/v1/projects/demo/members", headers=headers, json={"profile_slug": "missing", "role": "member"})
    assert unavailable.status_code == 409
    team = client.get("/stewardship/v1/projects/demo/team", headers=headers)
    assert team.status_code == 200
    preview = client.post("/stewardship/v1/projects/demo/transfers/preview", headers=headers, json={"from_profile": "gone", "to_profile": "new"}).json()
    port.tasks["t1"]["revision"] += 1
    stale = client.post("/stewardship/v1/projects/demo/transfers/execute", headers=headers, json={"from_profile": "gone", "to_profile": "new", "fingerprint": preview["fingerprint"], "idempotency_key": "api-k"})
    assert stale.status_code == 409
    fresh = client.post("/stewardship/v1/projects/demo/transfers/preview", headers=headers, json={"from_profile": "gone", "to_profile": "new"}).json()
    bulk = client.post("/stewardship/v1/projects/demo/reassignments", headers=headers, json={"from_profile": "gone", "to_profile": "new", "fingerprint": fresh["fingerprint"], "selected_ids": ["t1"], "idempotency_key": "api-bulk"})
    assert bulk.status_code == 200, bulk.text
    readback = client.get(f"/stewardship/v1/operations/{bulk.json()['op_id']}", headers=headers)
    assert readback.status_code == 200
    assert readback.json()["actor"] == "sahil"
    assert readback.json()["items"][0]["audit"]["actor"] == "sahil"
    assert readback.json()["items"][0]["audit"]["action"] == "workitem.reassigned"
    assert members._row("demo", "gone").state == "active"
    store.close()


def test_simultaneous_membership_changes_preserve_one_lead(tmp_path):
    store, members, _, teams = _setup(tmp_path, [])
    errors = []
    def transfer(slug):
        try:
            teams.transfer_lead("demo", slug, actor="verified-human")
        except Exception as exc:
            errors.append(exc)
    threads = [threading.Thread(target=transfer, args=(slug,)) for slug in ("gone", "new")]
    [t.start() for t in threads]
    [t.join() for t in threads]
    assert len([m for m in members.list_members("demo") if m.role == "lead" and m.state == "active"]) == 1
    store.close()


def test_vanilla_host_more_than_100_route_to_durable_readback(tmp_path, monkeypatch):
    pytest.importorskip("hermes_constants")
    pytest.importorskip("hermes_cli.kanban_db")
    pytest.importorskip("hermes_cli.projects_db")
    from hermes_project_stewardship.kanban.host_adapter import ProjectKanbanHostAdapter
    from hermes_project_stewardship.kanban.vanilla_host import ProjectKanbanHost

    home = tmp_path / "hermes"
    for slug in ("lead", "gone", "new"):
        (home / "profiles" / slug).mkdir(parents=True, exist_ok=True)
    monkeypatch.setenv("HERMES_KANBAN_HOME", str(home))
    repo = tmp_path / "repo"
    repo.mkdir()
    store = Store(tmp_path / "real.db")
    adapter = ProjectKanbanHostAdapter(ProjectKanbanHost(hermes_home=home, board="alpha"))
    bootstrap = TestClient(create_app(store, kanban_adapter=adapter))
    payload = {"project_id": "alpha", "name": "Alpha Project", "slug": "alpha", "repo_path": str(repo), "mission": "Deliver Alpha safely", "lead_profile": "lead", "member_profiles": ["gone", "new"], "board_slug": "alpha", "idempotency_key": "provision", "autonomy_level": 2, "actor_id": "owner"}
    preflight = bootstrap.post("/stewardship/v1/onboard/preflight", json=payload)
    assert preflight.status_code == 200, preflight.text
    contract = preflight.json()["preflight"]
    onboarded = bootstrap.post("/stewardship/v1/onboard", json={**payload, "expected_membership_revision": contract["membership_revision"], "preflight_token": contract["token"]})
    assert onboarded.status_code == 200, onboarded.text
    stewardship = StewardshipService(store)
    for i in range(105):
        adapter.host.create_task(title=f"Task {i}", body=None, assignee="gone", created_by="lead", project_id=None, task_kind="task", initial_status="backlog", idempotency_key=f"task-{i}", board="alpha")
    client = TestClient(create_app(store, kanban_adapter=adapter, auth_token="secret", auth_principal="sahil", auth_principal_is_human=True))
    headers = {"Authorization": "Bearer secret"}
    team = client.get("/stewardship/v1/projects/alpha/team", headers=headers)
    assert team.status_code == 200, team.text
    gone = next(m for m in team.json()["members"] if m["profile_slug"] == "gone")
    assert team.json()["complete"] is True
    assert gone["workload"]["total"] == 105
    preview = client.post("/stewardship/v1/projects/alpha/transfers/preview", headers=headers, json={"from_profile": "gone", "to_profile": "new"})
    assert preview.status_code == 200, preview.text
    assert preview.json()["enumerated_count"] == 105
    recomputing = threading.Event()
    release = threading.Event()
    original_list = adapter.list_work
    execute_reads = 0

    def barrier_list(project_id):
        nonlocal execute_reads
        execute_reads += 1
        if execute_reads == 1:
            recomputing.set()
            assert release.wait(5)
        return original_list(project_id)

    monkeypatch.setattr(adapter, "list_work", barrier_list)
    stale_result = {}

    def stale_execute():
        stale_result["response"] = client.post("/stewardship/v1/projects/alpha/transfers/execute", headers=headers, json={"from_profile": "gone", "to_profile": "new", "fingerprint": preview.json()["fingerprint"], "idempotency_key": "stale-transfer"})

    worker = threading.Thread(target=stale_execute)
    worker.start()
    assert recomputing.wait(5)
    adapter.host.create_task(title="Concurrent task", body=None, assignee="gone", created_by="lead", project_id=None, task_kind="task", initial_status="backlog", idempotency_key="concurrent-task", board="alpha")
    release.set()
    worker.join(5)
    assert stale_result["response"].status_code == 409
    assert MembershipService(store, stewardship)._row("alpha", "gone").state == "active"
    assert len(original_list("alpha")) == 106
    assert all(item["assignee"] == "gone" for item in original_list("alpha"))
    monkeypatch.setattr(adapter, "list_work", original_list)
    preview = client.post("/stewardship/v1/projects/alpha/transfers/preview", headers=headers, json={"from_profile": "gone", "to_profile": "new"})
    assert preview.status_code == 200
    assert preview.json()["enumerated_count"] == 106
    executed = client.post("/stewardship/v1/projects/alpha/transfers/execute", headers=headers, json={"from_profile": "gone", "to_profile": "new", "fingerprint": preview.json()["fingerprint"], "idempotency_key": "real-transfer"})
    assert executed.status_code == 200, executed.text
    operation = client.get(f"/stewardship/v1/operations/{executed.json()['op_id']}", headers=headers)
    assert operation.status_code == 200
    assert operation.json()["state"] == "completed"
    assert len(operation.json()["items"]) == 106
    assert all(item["outcome"] == "completed" for item in operation.json()["items"])
    assert MembershipService(store, stewardship)._row("alpha", "gone").state == "departed"
    assert all(item["assignee"] == "new" for item in adapter.list_work("alpha"))
    store.close()


def test_vanilla_conditional_assignment_retains_competing_writer(tmp_path, monkeypatch):
    pytest.importorskip("hermes_constants")
    from hermes_cli import kanban_db as kb
    pytest.importorskip("hermes_cli.projects_db")
    from hermes_project_stewardship.kanban.vanilla_host import HostError, ProjectKanbanHost

    home = tmp_path / "hermes-race"
    monkeypatch.setenv("HERMES_HOME", str(home))
    monkeypatch.setenv("HERMES_KANBAN_HOME", str(home))
    host = ProjectKanbanHost(hermes_home=home, board="default")
    task = host.create_task(
        title="Race", body=None, assignee="gone", created_by="lead",
        project_id=None, task_kind="task", initial_status="backlog",
        idempotency_key="native-race", board="default",
    )
    initial_revision = task["revision"]
    competitor = kb.connect(board="default")
    try:
        assert kb.assign_task(competitor, task["id"], "third-party") is True
    finally:
        competitor.close()

    with pytest.raises(HostError) as conflict:
        host.assign_task_if_unchanged(
            task["id"], "gone", "new",
            {"expect_assignee": "gone", "eligible_statuses": [task["status"]],
             "claim_lock_absent": True, "expected_revision": initial_revision},
            board="default",
        )
    assert conflict.value.code == "write_conflict"
    assert host.get_task(task["id"], board="default")["task"]["assignee"] == "third-party"

    from hermes_project_stewardship.persistence.transfer import TransferSaga

    class StaleReadRealWriteHost:
        def __init__(self):
            self.first_read = True

        def get_task(self, task_id):
            if self.first_read:
                self.first_read = False
                return {"task": dict(task)}
            return host.get_task(task_id, board="default")

        def assign_task_if_unchanged(self, task_id, from_profile, to_profile, guard):
            return host.assign_task_if_unchanged(
                task_id, from_profile, to_profile, guard, board="default"
            )

    saga_store = Store(tmp_path / "native-race-saga.db")
    result = TransferSaga(saga_store, StaleReadRealWriteHost()).execute(
        op_id="OP-native-race", idempotency_key="native-race-saga",
        project_id="demo", from_profile="gone", to_profile="new",
        items=[{"id": task["id"], "kind": "task", "status": task["status"],
                "revision": initial_revision}],
    )
    assert result["state"] != "completed"
    assert saga_store._conn.execute(
        "SELECT outcome FROM operation_items WHERE op_id='OP-native-race'"
    ).fetchone()["outcome"] != "completed"
    assert host.get_task(task["id"], board="default")["task"]["assignee"] == "third-party"
    saga_store.close()
