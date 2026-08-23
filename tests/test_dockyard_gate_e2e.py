"""G2 GATE E2E: two-bot handoff through a group channel, fully audited.

PRD v0.3 §6 Gate G2 exit criterion:
    "Two bots hand off a task through a group channel, fully audited."

This test walks the complete lifecycle over the RPC surface only (no
direct store/service access for the actors) and then proves the audit
trail end-to-end from the stewardship audit log.
"""
from __future__ import annotations

import sqlite3

import pytest

fastapi = pytest.importorskip("fastapi")
from fastapi.testclient import TestClient  # noqa: E402

from hermes_project_stewardship.api.server import create_app  # noqa: E402
from hermes_project_stewardship.persistence.store import Store  # noqa: E402


@pytest.fixture()
def env(tmp_path):
    store = Store(tmp_path / "gate.db")
    c = TestClient(create_app(store))
    r = c.post("/stewardship/v1/projects/demo/enable", json={
        "project_id": "demo", "mission": "keep checkout healthy",
        "lead_profile": "octacon", "autonomy_level": 2})
    assert r.status_code == 200
    yield c, store
    store.close()


def _register(c, bot_id, name):
    r = c.post("/stewardship/v1/projects/demo/bots", json={
        "bot_id": bot_id, "display_name": name})
    assert r.status_code == 200


def _audit_rows(store: Store, action: str) -> list:
    rows = store._conn.execute(
        "SELECT actor, interface, action, subject FROM"
        " stewardship_audit_log WHERE action=? ORDER BY rowid",
        (action,),
    ).fetchall()
    return [dict(r) for r in rows]


def test_two_bot_handoff_via_group_channel_fully_audited(env):
    c, store = env
    V = "/stewardship/v1"

    # -- Fleet setup: two bots, one group with qa-bot as lead ---------- #
    _register(c, "coder-bot", "Coder")
    _register(c, "qa-bot", "QA")
    r = c.post(f"{V}/bot-groups", json={
        "name": "checkout-ops",
        "purpose": "payment path reliability",
        "member_ids": ["coder-bot", "qa-bot"],
        "lead_id": "qa-bot",
        "actor_id": "sahil"})
    assert r.status_code == 200

    # -- A work item exists on the board (created by coder-bot) -------- #
    r = c.post(f"{V}/projects/demo/work-items", json={
        "type": "task", "title": "Verify CI matrix split by OS",
        "actor_id": "coder-bot", "actor_kind": "bot"})
    assert r.status_code == 200
    item_ref = r.json()["ref"]

    # -- HANDOFF: coder-bot posts structured handoff to the group ------ #
    r = c.post(f"{V}/a2a", json={
        "msg_type": "handoff",
        "from_actor": "coder-bot",
        "to_group": "checkout-ops",
        "item_ref": item_ref,
        "payload": {
            "item_ref": item_ref,
            "summary": "CI matrix split complete; needs independent verify",
            "context_refs": [f"workitem:{item_ref}", "audit:ci-split"]}})
    assert r.status_code == 200
    handoff_id = r.json()["id"]
    assert "[HDY-" in r.json()["channel_post"] or item_ref in \
        r.json()["channel_post"]

    # -- Channel renders the message (BM-04 feed = the group channel) -- #
    feed = c.get(f"{V}/bot-groups/checkout-ops/messages").json()["messages"]
    assert len(feed) == 1
    assert feed[0]["id"] == handoff_id
    assert feed[0]["type"] == "handoff"
    assert feed[0]["item_ref"] == item_ref

    # -- Lead routes internally: qa-bot picks it up -------------------- #
    r = c.post(f"{V}/bots/qa-bot/status", json={
        "status": "busy", "current_item": item_ref,
        "actor_id": "qa-bot-lead"})
    assert r.status_code == 200

    r = c.post(f"{V}/projects/demo/work-items/{item_ref}/transition", json={
        "status": "in_review", "actor_id": "qa-bot", "actor_kind": "bot"})
    assert r.status_code == 200

    # -- RESULT: qa-bot posts verified outcome back to the channel ----- #
    r = c.post(f"{V}/a2a", json={
        "msg_type": "result",
        "from_actor": "qa-bot",
        "to_group": "checkout-ops",
        "item_ref": item_ref,
        "payload": {"item_ref": item_ref, "outcome": "verified"}})
    assert r.status_code == 200

    # -- Coder-bot returns to idle ------------------------------------- #
    r = c.post(f"{V}/bots/coder-bot/status", json={"status": "idle"})
    assert r.status_code == 200

    # ------------------ FULL AUDIT TRAIL PROOF ------------------------ #
    # 1. Item trail in the A2A bus is chronological and complete.
    trail = None
    # a2a trail via service-level endpoint: use messages feed filtered client-side
    msgs = c.get(f"{V}/bot-groups/checkout-ops/messages").json()["messages"]
    types = [m["type"] for m in msgs]
    assert set(types) == {"handoff", "result"}

    # 2. Every step wrote to the ONE shared stewardship audit log.
    registered = _audit_rows(store, "bot.registered")
    assert [r["actor"] for r in registered] == ["coder-bot", "qa-bot"]

    grouped = _audit_rows(store, "group.created")
    assert grouped[0]["subject"] == "checkout-ops"
    assert grouped[0]["interface"] == "dockyard:human"

    created = _audit_rows(store, "workitem.transition")
    assert created[0]["actor"] == "qa-bot"
    assert created[0]["interface"] == "dockyard:bot"

    handoffs = _audit_rows(store, "a2a.handoff")
    results = _audit_rows(store, "a2a.result")
    assert len(handoffs) == 1 and handoffs[0]["actor"] == "coder-bot"
    assert len(results) == 1 and results[0]["actor"] == "qa-bot"

    status_events = _audit_rows(store, "bot.status")
    subjects = {r["subject"] for r in status_events}
    assert subjects == {"qa-bot", "coder-bot"}

    # 3. Reputation reflects the measured outcome (advisory).
    rep = c.get(f"{V}/bots/qa-bot/reputation").json()
    assert rep["completed"] == 1 and rep["regressed"] == 0
    assert rep["advisory"] is True

    # 4. Workload board shows the end state cleanly.
    wl = c.get(f"{V}/workload").json()
    assert any(e["bot"] == "qa-bot" and e["item"] == item_ref
               for e in wl["busy"])
    assert any(e["bot"] == "coder-bot" for e in wl["idle"])
