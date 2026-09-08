import hashlib
import json

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
