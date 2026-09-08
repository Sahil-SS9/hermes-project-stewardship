import hashlib
import json
import os
import sys

import pytest

from hermes_project_stewardship.persistence.service import ServiceError


def seed_pending(store, *, project="demo", ref="ini-1", risk="high"):
    store._conn.execute(
        "INSERT OR IGNORE INTO project_stewardship(project_id,enabled,mission,"
        "member_profiles_json,autonomy_level,verification_policy_json,"
        "release_policy_json,notification_policy_json,phase,created_at,updated_at)"
        " VALUES(?,1,'','[]',0,'{}','{}','{}','active',?,?)",
        (project, "2026-09-08T00:00:00+00:00", "2026-09-08T00:00:00+00:00"),
    )
    store._conn.execute(
        "INSERT INTO project_initiatives(ref,project_id,title,rationale,"
        "expected_outcome,risk,status,approval_state,validation_contract_json,"
        "outcome_json,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)",
        (ref, project, "Improve checks", "Need safer delivery", "green", risk,
         "pending_approval", "pending", json.dumps({"checks": ["ci"]}),
         "{}", "2026-09-08T00:00:00+00:00"),
    )
    store._conn.commit()


def test_decision_payload_contains_scope_proof_and_authority(store, svc):
    seed_pending(store)
    decision = svc.decision("ini-1")
    assert decision["action"] == "approve"
    assert decision["project_id"] == "demo"
    assert decision["initiative_ref"] == "ini-1"
    assert decision["proposer"]
    assert decision["risk"] == "high"
    assert decision["validation"]["contract"] == {"checks": ["ci"]}
    assert decision["authority"]["granted"] == "approve_and_start_execution"
    assert decision["fingerprint"]


def test_approval_receipt_is_immutable_and_idempotent(store, svc):
    seed_pending(store)
    decision = svc.decision("ini-1")
    first = svc.approve_initiative(
        "ini-1", actor="trusted-human", interface="api",
        expected_fingerprint=decision["fingerprint"], note="reviewed scope",
    )
    second = svc.approve_initiative(
        "ini-1", actor="trusted-human", interface="api",
        expected_fingerprint=decision["fingerprint"], note="reviewed scope",
    )
    assert first["status"] == second["status"] == "approved"
    rows = store.audit_tail(10)
    receipts = [r for r in rows if r["action"] == "initiative.decision"]
    assert len(receipts) == 1
    assert receipts[0]["detail"]["decision"] == "approved"
    assert receipts[0]["detail"]["note"] == "reviewed scope"


def test_stale_fingerprint_refuses_approval(store, svc):
    seed_pending(store)
    old = svc.decision("ini-1")["fingerprint"]
    store._conn.execute("UPDATE project_initiatives SET rationale='changed' WHERE ref='ini-1'")
    store._conn.commit()
    with pytest.raises(ServiceError, match="stale decision evidence"):
        svc.approve_initiative("ini-1", actor="human-1", interface="api",
                               expected_fingerprint=old)


def test_rejection_requires_reason_and_persists_receipt(store, svc):
    seed_pending(store)
    decision = svc.decision("ini-1")
    with pytest.raises(ServiceError, match="rejection reason"):
        svc.reject_initiative("ini-1", actor="human-1", interface="api",
                              expected_fingerprint=decision["fingerprint"])
    result = svc.reject_initiative(
        "ini-1", actor="human-1", interface="api",
        expected_fingerprint=decision["fingerprint"], reason="scope is too broad",
    )
    assert result["status"] == "rejected"
    receipt = [r for r in store.audit_tail(10) if r["action"] == "initiative.decision"][0]
    assert receipt["detail"]["decision"] == "rejected"
    assert receipt["detail"]["reason"] == "scope is too broad"


def test_cross_project_reference_is_not_accepted(store, svc):
    seed_pending(store, project="alpha", ref="ini-a")
    with pytest.raises(ServiceError):
        svc.decision("ini-a", project_id="beta")


def test_decision_api_exposes_same_fingerprint_and_receipts(tmp_path):
    from fastapi.testclient import TestClient
    from hermes_project_stewardship.api.server import create_app
    from hermes_project_stewardship.persistence.store import Store

    store = Store(tmp_path / "api.db")
    seed_pending(store)
    client = TestClient(create_app(store))
    response = client.get("/stewardship/v1/initiatives/ini-1/decision")
    assert response.status_code == 200
    payload = response.json()
    assert payload["fingerprint"]
    assert payload["authority"]["granted"] == "approve_and_start_execution"
    assert client.get("/stewardship/v1/initiatives/ini-1/decision/receipts").json() == {"receipts": []}
    store.close()


def test_concurrent_approve_and_reject_never_contradict(store, svc):
    """Round-2 issue 2: approve/reject must serialise through one store
    transaction; the loser must not corrupt status or receipts."""
    import threading

    seed_pending(store)
    results: dict = {}

    def approve():
        try:
            svc.approve_initiative("ini-1", actor="approver", interface="api")
            results["approve"] = "ok"
        except Exception as exc:
            results["approve"] = f"error: {exc}"

    def reject():
        try:
            svc.reject_initiative("ini-1", actor="rejecter", interface="api",
                                  reason="concurrent reject")
            results["reject"] = "ok"
        except Exception as exc:
            results["reject"] = f"error: {exc}"

    t1 = threading.Thread(target=approve)
    t2 = threading.Thread(target=reject)
    t1.start(); t2.start(); t1.join(); t2.join()

    ini = svc.initiative_by_ref("ini-1")
    receipts = svc.decision_receipts("ini-1")
    # Exactly one decision outcome recorded, matching the final status.
    decisions = {r["decision"] for r in receipts}
    assert len(decisions) == 1, (results, receipts)
    assert decisions == {ini["status"]}, (results, receipts, ini["status"])


def test_receipt_write_failure_does_not_lose_status_or_receipt(store, svc):
    """Round-2 issue 2: a receipt insertion failure must abort the status
    change; retry must succeed and leave exactly one receipt."""
    seed_pending(store)
    decision = svc.decision("ini-1")
    import sqlite3

    # Abort receipt insertion via a temporary trigger, then retry.
    store._conn.execute(
        "CREATE TRIGGER abort_receipt BEFORE INSERT ON stewardship_decision_receipts"
        " BEGIN SELECT RAISE(ABORT, 'receipt write failed'); END")
    store._conn.commit()
    with pytest.raises(Exception):
        svc.approve_initiative("ini-1", actor="h", interface="api",
                               expected_fingerprint=decision["fingerprint"])
    # Status must NOT have committed without its receipt.
    ini_status = svc.initiative_by_ref("ini-1")["status"]
    assert ini_status != "approved", "status committed without receipt"
    store._conn.execute("DROP TRIGGER abort_receipt")
    store._conn.commit()
    retried = svc.approve_initiative("ini-1", actor="h", interface="api",
                                     expected_fingerprint=decision["fingerprint"])
    assert retried["status"] == "approved"
    receipts = svc.decision_receipts("ini-1")
    assert len(receipts) == 1, receipts
    assert receipts[0]["decision"] == "approved"


def test_dashboard_proxy_forwards_decision_fields_and_exposes_readers():
    """Round-2 review issue 1: the plugin proxy must expose decision/receipts
    readers and forward fingerprint/reason/note; actor stays server-owned."""
    import asyncio
    import tempfile
    from pathlib import Path

    from fastapi import FastAPI
    from fastapi.testclient import TestClient
    from hermes_project_stewardship.api.server import create_app
    from hermes_project_stewardship.kanban import ReferenceKanbanAdapter
    from hermes_project_stewardship.persistence.service import StewardshipService
    from hermes_project_stewardship.persistence.store import Store

    plugin_dir = os.path.join(
        os.path.dirname(__file__), os.pardir, "hermes_dockyard_plugin", "dashboard")
    plugin_dir = os.path.abspath(plugin_dir)
    if plugin_dir not in sys.path:
        sys.path.insert(0, plugin_dir)
    import plugin_api

    previous_app = plugin_api._app
    previous_client = plugin_api._client
    previous_store = plugin_api._store
    db_dir = Path(tempfile.mkdtemp(prefix="p4-proxy-"))
    store = Store(db_dir / "dockyard.db")
    adapter = ReferenceKanbanAdapter(store)
    plugin_api._store = store
    plugin_api._app = create_app(store, kanban_adapter=adapter)
    plugin_api._client = plugin_api.httpx.AsyncClient(
        transport=plugin_api.httpx.ASGITransport(app=plugin_api._app),
        base_url="http://dockyard.test",
    )
    app = FastAPI()
    app.include_router(plugin_api.plugin_api, prefix="/api/plugins/hermes-dockyard")

    project_id = "decision-ui"
    try:
        test_client = TestClient(app)
        created = test_client.post("/api/plugins/hermes-dockyard/onboard", json={
            "project_id": project_id, "repo_path": "/srv/decision-ui",
            "mission": "proxy contract", "lead_profile": "octacon"})
        assert created.status_code == 200, created.text

        service = StewardshipService(store)
        ini = service.propose_initiative(project_id, title="Proxy", rationale="r")

        payload = test_client.get(
            f"/api/plugins/hermes-dockyard/initiatives/{ini['ref']}/decision")
        assert payload.status_code == 200, payload.text
        fingerprint = payload.json()["fingerprint"]

        stale = test_client.post(
            f"/api/plugins/hermes-dockyard/initiatives/{ini['ref']}/reject",
            json={"expected_fingerprint": "stale", "reason": "owner reason",
                  "note": "owner note"})
        assert stale.status_code == 409, stale.text

        good = test_client.post(
            f"/api/plugins/hermes-dockyard/initiatives/{ini['ref']}/reject",
            json={"expected_fingerprint": fingerprint, "reason": "owner reason",
                  "note": "owner note"})
        assert good.status_code == 200, good.text

        receipts = test_client.get(
            f"/api/plugins/hermes-dockyard/initiatives/{ini['ref']}/decision/receipts")
        assert receipts.status_code == 200, receipts.text
        assert receipts.json()["receipts"][0]["reason"] == "owner reason"
        assert receipts.json()["receipts"][0]["note"] == "owner note"
    finally:
        asyncio.run(plugin_api._client.aclose())
        plugin_api._app = previous_app
        plugin_api._client = previous_client
        plugin_api._store = previous_store
        store.close()
