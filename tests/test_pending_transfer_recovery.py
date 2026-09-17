import importlib.util
from pathlib import Path

from hermes_project_stewardship.persistence.store import Store
from hermes_project_stewardship.persistence.service import StewardshipService
from hermes_project_stewardship.persistence.membership import MembershipService
from hermes_project_stewardship.persistence.team_management import TeamManagementService


def test_reopen_pending_project_transfer_and_retry_only_remaining(tmp_path):
    _spec = importlib.util.spec_from_file_location(
        "recovery_test_helpers", Path(__file__).with_name("test_phase4_team_management.py")
    )
    assert _spec is not None and _spec.loader is not None
    _helpers = importlib.util.module_from_spec(_spec)
    _spec.loader.exec_module(_helpers)
    _setup, _task = _helpers._setup, _helpers._task
    store, _, port, teams = _setup(tmp_path, [_task(1), _task(2)])
    port.fail_once.add("t2")
    preview = teams.preview("demo", "gone", "new")
    result = teams.execute_departure("demo", "gone", "new", fingerprint=preview["fingerprint"], selected_ids=None, idempotency_key="reopen", actor="human")
    op_id = result["op_id"]
    store.close()
    store = Store(tmp_path / "p4.db")
    service = StewardshipService(store)
    teams = TeamManagementService(store, service, MembershipService(store, service), port)
    assert teams.pending_operations("other") == []
    assert [op["op_id"] for op in teams.pending_operations("demo")] == [op_id]
    port.calls.clear()
    assert teams.retry(op_id, actor="human")["state"] == "completed"
    assert port.calls == ["t2"]
    assert teams.pending_operations("demo") == []
    assert all(item["outcome"] == "completed" for item in teams.operation(op_id)["items"])
    store.close()
