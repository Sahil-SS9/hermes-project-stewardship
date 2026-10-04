"""Audited request-changes / comment / resubmission lifecycle (owner-approved).

Contract (HPS-Dashboard-corrected-contract-2026-09-23.md):
- 'Request changes' is a distinct audited return-to-proposer path: it must not
  silently reject or approve. Reviewer supplies feedback; the proposer can
  resubmit a revised decision under a new fingerprint. Comments are recorded
  independently without changing the decision state.
"""
from __future__ import annotations

import pytest

fastapi = pytest.importorskip("fastapi")
from fastapi.testclient import TestClient  # noqa: E402

from hermes_project_stewardship.api.server import create_app  # noqa: E402
from hermes_project_stewardship.kanban import ReferenceKanbanAdapter  # noqa: E402
from hermes_project_stewardship.persistence.store import Store  # noqa: E402


@pytest.fixture()
def client(tmp_path):
    store = Store(tmp_path / "lifecycle.db")
    app = create_app(store, auth_token="test-token", auth_principal="test-user", auth_principal_is_human=True, kanban_adapter=ReferenceKanbanAdapter(store))
    try:
        with TestClient(app, headers={"Authorization": "Bearer test-token"}) as c:
            c.post("/stewardship/v1/projects/demo/enable", json={
                "project_id": "demo", "mission": "m", "lead_profile": "lead",
                "autonomy_level": 2})
            yield c, store
    finally:
        store.close()


def _propose(client, title="Decide me"):
    c, _ = client
    r = c.post("/stewardship/v1/projects/demo/initiatives", json={
        "title": title, "rationale": "objective: lifecycle test"})
    assert r.status_code == 200, r.text
    return r.json()["ref"]


def _decision(client, ref):
    c, _ = client
    r = c.get(f"/stewardship/v1/initiatives/{ref}/decision")
    assert r.status_code == 200, r.text
    return r.json()


def test_request_changes_returns_to_proposer_with_audit_trail(client):
    c, store = client
    ref = _propose(client)
    fp = _decision(client, ref)["fingerprint"]
    r = c.post(f"/stewardship/v1/initiatives/{ref}/request-changes", json={
        "expected_fingerprint": fp, "actor": "reviewer", "feedback": "tighten the risk note"})
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["status"] == "changes_requested"
    assert body["approval_state"] == "changes_requested"
    receipts = c.get(f"/stewardship/v1/initiatives/{ref}/decision/receipts").json()["receipts"]
    assert [x["decision"] for x in receipts] == ["changes_requested"]
    assert receipts[0]["reason"] == "tighten the risk note"
    assert receipts[0]["actor"] == "test-user"


def test_request_changes_is_not_a_rejection_and_not_an_approval(client):
    c, store = client
    ref = _propose(client)
    fp = _decision(client, ref)["fingerprint"]
    r = c.post(f"/stewardship/v1/initiatives/{ref}/request-changes", json={
        "expected_fingerprint": fp, "actor": "reviewer", "feedback": "more evidence"})
    assert r.status_code == 200
    row = store._conn.execute(
        "SELECT status, approval_state FROM project_initiatives WHERE ref=?", (ref,)).fetchone()
    assert row["status"] == "changes_requested"
    # suppression must NOT be created: proposal is still revisable, not dead
    assert store._conn.execute(
        "SELECT COUNT(*) FROM initiative_suppression WHERE project_id='demo'").fetchone()[0] == 0


def test_request_changes_requires_feedback_and_valid_fingerprint(client):
    c, _ = client
    ref = _propose(client)
    fp = _decision(client, ref)["fingerprint"]
    r = c.post(f"/stewardship/v1/initiatives/{ref}/request-changes", json={
        "expected_fingerprint": fp, "actor": "reviewer", "feedback": "  "})
    assert r.status_code == 409
    r = c.post(f"/stewardship/v1/initiatives/{ref}/request-changes", json={
        "expected_fingerprint": "deadbeef", "actor": "reviewer", "feedback": "x"})
    assert r.status_code == 409


def test_resubmit_after_changes_returns_pending_with_new_fingerprint(client):
    c, _store = client
    ref = _propose(client)
    fp = _decision(client, ref)["fingerprint"]
    c.post(f"/stewardship/v1/initiatives/{ref}/request-changes", json={
        "expected_fingerprint": fp, "actor": "reviewer", "feedback": "clarify"})
    r = c.post(f"/stewardship/v1/initiatives/{ref}/resubmit", json={
        "actor": "proposer", "rationale": "clarified: interviews + retry evidence",
        "expected_outcome": "safer import flow"})
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["status"] == "pending_approval"
    assert body["approval_state"] == "pending"
    new = _decision(client, ref)
    assert new["fingerprint"] != fp, "resubmission must change the decision fingerprint"
    assert "clarified" in new["reason"]


def test_resubmit_requires_pending_changes_request_state(client):
    c, _ = client
    ref = _propose(client)
    r = c.post(f"/stewardship/v1/initiatives/{ref}/resubmit", json={
        "actor": "proposer", "rationale": "still pending, cannot resubmit"})
    assert r.status_code == 409


def test_comments_recorded_independently_of_decision_state(client):
    c, _ = client
    ref = _propose(client)
    r = c.post(f"/stewardship/v1/initiatives/{ref}/comments", json={
        "actor": "reviewer", "body": "Which metrics back this?"})
    assert r.status_code == 200, r.text
    thread = c.get(f"/stewardship/v1/initiatives/{ref}/comments").json()["comments"]
    assert len(thread) == 1
    assert thread[0]["body"] == "Which metrics back this?"
    assert thread[0]["actor"] == "test-user"
    # comment did not mutate the decision payload
    before = _decision(client, ref)["fingerprint"]
    c.post(f"/stewardship/v1/initiatives/{ref}/comments", json={
        "actor": "proposer", "body": "Preview metrics, see contract."})
    assert _decision(client, ref)["fingerprint"] == before
    # comment on a rejected initiative still works (independent lifecycle)
    fp = _decision(client, ref)["fingerprint"]
    c.post(f"/stewardship/v1/initiatives/{ref}/reject", json={
        "expected_fingerprint": fp, "actor": "reviewer", "reason": "not now"})
    r = c.post(f"/stewardship/v1/initiatives/{ref}/comments", json={
        "actor": "reviewer", "body": "Post-rejection context for the record"})
    assert r.status_code == 200
    assert len(c.get(f"/stewardship/v1/initiatives/{ref}/comments").json()["comments"]) == 3


def test_resubmit_blocked_until_state_is_changes_requested(client):
    c, _ = client
    ref = _propose(client)
    fp = _decision(client, ref)["fingerprint"]
    c.post(f"/stewardship/v1/initiatives/{ref}/reject", json={
        "expected_fingerprint": fp, "actor": "reviewer", "reason": "duplicate"})
    r = c.post(f"/stewardship/v1/initiatives/{ref}/resubmit", json={
        "actor": "proposer", "rationale": "try again"})
    assert r.status_code == 409


def test_revision_requested_initiative_not_silently_resubmittable_by_other(client):
    c, store = client
    ref = _propose(client)
    fp = _decision(client, ref)["fingerprint"]
    c.post(f"/stewardship/v1/initiatives/{ref}/request-changes", json={
        "expected_fingerprint": fp, "actor": "reviewer", "feedback": "tighten"})
    # duplicate propose of same dedupe key is still blocked while changes_requested is open
    r = c.post("/stewardship/v1/projects/demo/initiatives", json={
        "title": "Decide me", "rationale": "objective: dup while open"})
    assert r.status_code == 409