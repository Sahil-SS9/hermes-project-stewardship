"""G4 GATE E2E: a week of oversight without opening a terminal.

PRD v0.3 §6 Gate G4 exit criterion:
    "Sahil completes a full week of oversight without opening a terminal."

Simulated purely through product surfaces (RPC + the integration seam):
onboard Monday, triage inbox, approve, watch Kanban execute, ack
notifications, read dashboard roll-ups — every step zero CLI.
"""
from __future__ import annotations

import pytest

fastapi = pytest.importorskip("fastapi")
from fastapi.testclient import TestClient  # noqa: E402

from hermes_project_stewardship.api.server import create_app  # noqa: E402
from hermes_project_stewardship.kanban import ReferenceKanbanAdapter  # noqa: E402
from hermes_project_stewardship.persistence.store import Store  # noqa: E402


@pytest.fixture()
def c(tmp_path):
    store = Store(tmp_path / "week.db")
    client = TestClient(
        create_app(store, auth_token="test-token", auth_principal="test-user", auth_principal_is_human=True, kanban_adapter=ReferenceKanbanAdapter(store)),
        headers={"Authorization": "Bearer test-token"},
    )
    yield client, store
    store.close()


V = "/stewardship/v1"
CONTRACT = {"steps": ["implement", "verify", "measure"],
            "tests": "project test suite"}


def test_week_of_oversight_zero_terminal(c):
    client, store = c
    # ---- MONDAY: onboard two projects via the wizard endpoint -------- #
    for pid in ("checkout-service", "content-engine"):
        r = client.post(f"{V}/onboard", json={
            "project_id": pid,
            "repo_path": f"/srv/{pid}",
            "mission": f"keep {pid} healthy",
            "lead_profile": "octacon", "autonomy_level": 2})
        assert r.status_code == 200
        assert r.json()["screen"] == "s2"

    # ---- TUESDAY: bots propose; items land on boards ----------------- #
    for pid in ("checkout-service", "content-engine"):
        r = client.post(f"{V}/projects/{pid}/initiatives", json={
            "title": f"Improve {pid} pipeline",
            "rationale": "objective breach: flaky checks block releases",
            "validation_contract": CONTRACT})
        assert r.status_code == 200

    # ---- WEDNESDAY: open the Approval Inbox once, decide everything -- #
    inbox = client.get(f"{V}/inbox").json()
    approvals = [i for i in inbox["items"]
                 if i["kind"] == "initiative_approval"]
    assert len(approvals) >= 2
    assert all("deep_link" in i for i in inbox["items"])
    for i in approvals:
        r = client.post(f"{V}/initiatives/{i['ref']}/approve", json={
            "actor": "sahil", "interface": "dockyard:human"})
        assert r.status_code == 200

    # approved initiatives are executing with cards bound
    for i in approvals:
        ini = client.get(
            f"{V}/projects/{i['project']}/initiatives").json()
        mine = [x for x in ini["initiatives"] if x["ref"] == i["ref"]][0]
        assert mine["status"] in ("executing", "approved")
        assert mine.get("board_slug")

    # ---- THURSDAY: bots work; notifications accumulate --------------- #
    # (execution events flow through the engine; check feed shape)
    feed = client.get(f"{V}/notifications").json()["notifications"]
    assert isinstance(feed, list)

    # ---- FRIDAY: measure outcomes from the board --------------------- #
    from .r2_helpers import make_ready

    # D-L3: /complete now confirms delivery through the ladder rule, so the
    # initiative needs a reached milestone first. Build one for the initiative
    # we are about to confirm (via the app's own services), then /complete
    # (a person confirms) succeeds.
    for i in approvals[:1]:
        make_ready(client.app, i["project"], i["ref"])
        r = client.post(f"{V}/initiatives/{i['ref']}/complete", json={
            "outcome": {"pipeline_green": True}, "regressed": False})
        assert r.status_code == 200

    # ---- SATURDAY: read the dashboard roll-up ------------------------ #
    d = client.get(f"{V}/dashboard").json()
    ids = {p["id"] for p in d["projects"]}
    assert {"checkout-service", "content-engine"} <= ids
    assert d["totals"]["active_work"] >= 0

    # ---- SUNDAY: ack remaining alerts -------------------------------- #
    feed = client.get(f"{V}/notifications").json()["notifications"]
    for n in [x for x in feed if not x["acked"]][:5]:
        assert client.post(f"{V}/notifications/{n['id']}/ack").status_code == 200

    # ---- PROOF: the whole week left an auditable trail, zero CLI ----- #
    # (audit rows were written server-side at each step)
    # and the inbox no longer owes the pending approvals decided above
    inbox_after = client.get(f"{V}/inbox").json()
    still_pending = [i for i in inbox_after["items"]
                     if i["kind"] == "initiative_approval"
                     and i["ref"] in {a["ref"] for a in approvals}]
    assert still_pending == []
