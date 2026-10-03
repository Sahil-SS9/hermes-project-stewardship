"""Batch D — the six decision rules, each proven with a backend test.

These are the binding rules from the Batch D brief. Each rule is proven at
the backend (FastAPI) level so the contract holds regardless of which front
end calls it. The Desktop proxy (dashboard/plugin_api.py) is covered by
tests/test_desktop_proxy_routes.py; the browser-level proof for the same rules
lives in desktop/inbox-decisions.test.mjs.

Rules under test
  R1  approve / reject / request-changes are three DIFFERENT outcomes.
  R2  request-changes sends the item back to the proposer with the feedback.
  R3  resubmit produces a new fingerprint; approve, reject AND request-changes
      against the old fingerprint are each refused.
  R4  a comment never changes the decision state.
  R5  only a trusted human decides; the named actor is attribution only and
      is never the authority. This file IS the Rule 5 probe (Decision C):
      - with a trusted principal the body actor is IGNORED and the receipt
        names the principal;
      - without any principal the behaviour is recorded as it is today:
        attribution is required (refused without it, accepted with it);
      - through the proxy a caller-named actor is refused with 422 — proven
        in tests/test_desktop_proxy_routes.py and in the browser test.
      Deployed-config conclusion (recorded 03/10/2026): the Desktop proxy
      always binds a bearer-authenticated principal server-side and refuses
      caller-named actors, so the deployed path satisfies Rule 5 without a
      backend change. No code change was needed; nothing was stopped for.
  R6  the decision payload carries the evidence, the policy gate, the impact
      and the capability boundary (the authority grant).
"""
from __future__ import annotations

import pytest

fastapi = pytest.importorskip("fastapi")
from fastapi.testclient import TestClient  # noqa: E402

from hermes_project_stewardship.api.server import create_app  # noqa: E402
from hermes_project_stewardship.kanban import ReferenceKanbanAdapter  # noqa: E402
from hermes_project_stewardship.persistence.store import Store  # noqa: E402

NO_AUTH_HEADERS: dict = {}
TRUSTED_HEADERS = {"Authorization": "Bearer trusted-token"}


@pytest.fixture()
def client(tmp_path):
    """Open (embedded) app: no bearer token, so no trusted principal binds."""
    store = Store(tmp_path / "rules.db")
    app = create_app(store, kanban_adapter=ReferenceKanbanAdapter(store))
    try:
        with TestClient(app) as c:
            c.post("/stewardship/v1/projects/demo/enable", json={
                "project_id": "demo", "mission": "m", "lead_profile": "lead",
                "autonomy_level": 2})
            yield c, store
    finally:
        store.close()


@pytest.fixture()
def trusted_client(tmp_path):
    """App with bearer auth: every request carries a trusted principal."""
    store = Store(tmp_path / "trusted.db")
    app = create_app(
        store, kanban_adapter=ReferenceKanbanAdapter(store),
        auth_token="trusted-token", auth_principal="owner",
        auth_principal_is_human=True)
    try:
        with TestClient(app) as c:
            r = c.post("/stewardship/v1/projects/demo/enable", headers=TRUSTED_HEADERS, json={
                "project_id": "demo", "mission": "m", "lead_profile": "lead",
                "autonomy_level": 2})
            assert r.status_code == 200, r.text
            yield c, store
    finally:
        store.close()


def _propose(client, title="Decide this", headers=None):
    c, _ = client
    r = c.post("/stewardship/v1/projects/demo/initiatives", headers=headers or {},
               json={"title": title, "rationale": "objective: decision-rules test"})
    assert r.status_code == 200, r.text
    return r.json()["ref"]


def _decision(client, ref, headers=None):
    c, _ = client
    r = c.get(f"/stewardship/v1/initiatives/{ref}/decision", headers=headers or {})
    assert r.status_code == 200, r.text
    return r.json()


def _receipts(client, ref, headers=None):
    c, _ = client
    r = c.get(f"/stewardship/v1/initiatives/{ref}/decision/receipts", headers=headers or {})
    assert r.status_code == 200, r.text
    return r.json()["receipts"]


# --------------------------------------------------------------------------- #
# R1 — the three outcomes are three distinct states and receipts
# --------------------------------------------------------------------------- #
def test_r1_approve_reject_request_changes_are_three_outcomes(client):
    c, _ = client
    # One initiative per outcome: the resulting status and the receipt decision
    # label must each be distinct.
    outcomes = {}
    for label, ref in [
        ("approve", _propose(client, "approve me")),
        ("reject", _propose(client, "reject me")),
        ("request_changes", _propose(client, "change me")),
    ]:
        fp = _decision(client, ref)["fingerprint"]
        if label == "approve":
            r = c.post(f"/stewardship/v1/initiatives/{ref}/approve",
                       json={"expected_fingerprint": fp, "actor": "human-a"})
        elif label == "reject":
            r = c.post(f"/stewardship/v1/initiatives/{ref}/reject",
                       json={"expected_fingerprint": fp, "actor": "human-a",
                             "reason": "no"})
        else:
            r = c.post(f"/stewardship/v1/initiatives/{ref}/request-changes",
                       json={"expected_fingerprint": fp, "actor": "human-a",
                             "feedback": "tighten"})
        assert r.status_code == 200, r.text
        outcomes[label] = (r.json(), _receipts(client, ref))

    approved = outcomes["approve"][1][-1]
    rejected = outcomes["reject"][1][-1]
    changed = outcomes["request_changes"][1][-1]
    # Distinct receipt decisions.
    assert {approved["decision"], rejected["decision"], changed["decision"]} == {
        "approved", "rejected", "changes_requested"}
    # Distinct states. Approve auto-starts execution, so the returned status is
    # "executing"; the receipt (not the status) is the authoritative record of
    # which of the three outcomes happened.
    assert outcomes["approve"][0]["status"] in ("approved", "executing")
    assert outcomes["reject"][0]["status"] == "rejected"
    assert outcomes["request_changes"][0]["status"] == "changes_requested"


# --------------------------------------------------------------------------- #
# R2 — request changes sends the item back to the proposer with feedback
# --------------------------------------------------------------------------- #
def test_r2_request_changes_returns_to_proposer_with_feedback(client):
    c, _ = client
    ref = _propose(client)
    fp = _decision(client, ref)["fingerprint"]
    r = c.post(f"/stewardship/v1/initiatives/{ref}/request-changes", json={
        "expected_fingerprint": fp, "actor": "reviewer",
        "feedback": "show the interview evidence"})
    assert r.status_code == 200, r.text
    body = r.json()
    # Back to the proposer, not approved and not dead.
    assert body["status"] == "changes_requested"
    assert body["approval_state"] == "changes_requested"
    receipt = _receipts(client, ref)[-1]
    assert receipt["decision"] == "changes_requested"
    assert receipt["reason"] == "show the interview evidence"
    # It is out of the pending inbox but not rejected/approved.
    inbox = c.get("/stewardship/v1/inbox").json()["items"]
    assert not any(i.get("ref") == ref for i in inbox), \
        "request-changes item must leave the approval inbox"


# --------------------------------------------------------------------------- #
# R3 — resubmit changes the fingerprint; the old fingerprint is refused for
#      approve, reject AND request-changes
# --------------------------------------------------------------------------- #
def test_r3_resubmit_changes_fingerprint_and_old_one_is_refused(client):
    c, _ = client
    ref = _propose(client)
    old = _decision(client, ref)["fingerprint"]
    c.post(f"/stewardship/v1/initiatives/{ref}/request-changes", json={
        "expected_fingerprint": old, "actor": "reviewer", "feedback": "revise"})
    r = c.post(f"/stewardship/v1/initiatives/{ref}/resubmit", json={
        "actor": "proposer", "rationale": "added the evidence"})
    assert r.status_code == 200, r.text
    assert r.json()["status"] == "pending_approval"
    new = _decision(client, ref)["fingerprint"]
    assert new != old, "resubmission must change the decision fingerprint"

    receipts_before = _receipts(client, ref)

    # A decision against the OLD fingerprint must be refused (stale) for all
    # three outcomes, and none may append a receipt.
    stale_approve = c.post(f"/stewardship/v1/initiatives/{ref}/approve",
                           json={"expected_fingerprint": old, "actor": "human-a"})
    assert stale_approve.status_code == 409, stale_approve.text
    stale_reject = c.post(f"/stewardship/v1/initiatives/{ref}/reject",
                          json={"expected_fingerprint": old, "actor": "human-a",
                                "reason": "stale"})
    assert stale_reject.status_code == 409, stale_reject.text
    stale_changes = c.post(f"/stewardship/v1/initiatives/{ref}/request-changes",
                           json={"expected_fingerprint": old, "actor": "human-a",
                                 "feedback": "stale"})
    assert stale_changes.status_code == 409, stale_changes.text
    assert _receipts(client, ref) == receipts_before, \
        "a refused decision must not leave a receipt"

    # And the CURRENT fingerprint is accepted. Approve auto-starts execution,
    # so the returned status is "executing"; the receipt is authoritative.
    good = c.post(f"/stewardship/v1/initiatives/{ref}/approve",
                  json={"expected_fingerprint": new, "actor": "human-a"})
    assert good.status_code == 200, good.text
    assert _receipts(client, ref)[-1]["decision"] == "approved"


# --------------------------------------------------------------------------- #
# R4 — a comment never changes the decision state
# --------------------------------------------------------------------------- #
def test_r4_comment_never_changes_decision_state(client):
    c, _ = client
    ref = _propose(client)
    before_fp = _decision(client, ref)["fingerprint"]
    before_receipts = len(_receipts(client, ref))
    r = c.post(f"/stewardship/v1/initiatives/{ref}/comments",
               json={"actor": "reviewer", "body": "which metric backs this?"})
    assert r.status_code == 200, r.text
    after_fp = _decision(client, ref)["fingerprint"]
    assert after_fp == before_fp, "a comment must not change the fingerprint"
    assert len(_receipts(client, ref)) == before_receipts, \
        "a comment must not create a decision receipt"
    # The initiative is still pending, unchanged.
    row = c.get("/stewardship/v1/projects/demo/initiatives").json()
    ini = [i for i in row["initiatives"] if i["ref"] == ref][0]
    assert ini["status"] == "pending_approval"
    # The comment is recorded in its own thread.
    thread = c.get(f"/stewardship/v1/initiatives/{ref}/comments").json()["comments"]
    assert any(cm["body"] == "which metric backs this?" for cm in thread)


# --------------------------------------------------------------------------- #
# R5 — the Rule 5 probe: only a trusted human decides; actor is attribution.
#      Decision C recorded in the module docstring and the return packet.
# --------------------------------------------------------------------------- #
def test_r5_probe_trusted_principal_ignores_body_actor(trusted_client):
    """With a trusted principal the body actor is IGNORED; the receipt names
    the principal. Authority comes from the verified bearer identity."""
    c, _ = trusted_client
    ref = _propose(trusted_client, headers=TRUSTED_HEADERS)
    fp = _decision(trusted_client, ref, headers=TRUSTED_HEADERS)["fingerprint"]
    r = c.post(f"/stewardship/v1/initiatives/{ref}/approve", headers=TRUSTED_HEADERS,
               json={"expected_fingerprint": fp, "actor": "impostor"})
    assert r.status_code == 200, r.text
    receipt = _receipts(trusted_client, ref, headers=TRUSTED_HEADERS)[-1]
    assert receipt["actor"] == "owner", \
        "the trusted principal must be recorded, never the caller-named actor"
    assert receipt["decision"] == "approved"
    # The decision went through: the item left the pending inbox.
    inbox = c.get("/stewardship/v1/inbox", headers=TRUSTED_HEADERS).json()["items"]
    assert not any(i.get("ref") == ref for i in inbox)


def test_r5_probe_no_principal_requires_attribution_and_records_it(client):
    """Without any trusted principal the behaviour is recorded as it is:
    a decision without attribution is refused (never silently decided via a
    guessed identity); with attribution the receipt records exactly the
    supplied actor. The deployed config never reaches this branch — the proxy
    always binds a principal server-side."""
    c, _ = client
    ref = _propose(client)
    fp = _decision(client, ref)["fingerprint"]
    no_actor = c.post(f"/stewardship/v1/initiatives/{ref}/approve",
                      json={"expected_fingerprint": fp})
    assert no_actor.status_code in (409, 422), no_actor.text
    assert _receipts(client, ref) == [], "a refused decision must not leave a receipt"

    attributed = c.post(f"/stewardship/v1/initiatives/{ref}/approve",
                        json={"expected_fingerprint": fp, "actor": "sahil"})
    assert attributed.status_code == 200, attributed.text
    receipt = _receipts(client, ref)[-1]
    assert receipt["actor"] == "sahil"
    assert receipt["decision"] == "approved"


# --------------------------------------------------------------------------- #
# R6 — the decision payload carries evidence, policy gate, impact, boundary
# --------------------------------------------------------------------------- #
def test_r6_decision_payload_carries_evidence_impact_and_boundary(client):
    c, _ = client
    ref = _propose(client)
    payload = _decision(client, ref)
    # Evidence: the validation contract is the evidence the approver checks.
    assert "validation" in payload and payload["validation"] is not None
    # Impact: the requested change (reason) and expected outcome are present.
    assert payload.get("reason")
    assert "expected_outcome" in payload
    # Capability boundary: the authority grant scopes what approving confers.
    authority = payload["authority"]
    assert authority.get("granted")
    # Policy gate: the risk that puts it in front of a human.
    assert payload.get("risk")
    # Fingerprint binds all of the above to one decision scope.
    assert payload.get("fingerprint")


# --------------------------------------------------------------------------- #
# Cross-rule invariant: a decision is idempotent per fingerprint
# --------------------------------------------------------------------------- #
def test_same_fingerprint_is_idempotent_not_double_decided(client):
    c, _ = client
    ref = _propose(client)
    fp = _decision(client, ref)["fingerprint"]
    first = c.post(f"/stewardship/v1/initiatives/{ref}/approve",
                   json={"expected_fingerprint": fp, "actor": "h"})
    assert first.status_code == 200
    second = c.post(f"/stewardship/v1/initiatives/{ref}/approve",
                    json={"expected_fingerprint": fp, "actor": "h"})
    assert second.status_code == 200
    receipts = [r for r in _receipts(client, ref) if r["decision"] == "approved"]
    assert len(receipts) == 1, "one fingerprint decides once"