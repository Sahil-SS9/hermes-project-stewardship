"""G2 P5 tests: bot-layer RPC routes on /stewardship/v1."""
from __future__ import annotations

import pytest

fastapi = pytest.importorskip("fastapi")
from fastapi.testclient import TestClient  # noqa: E402

from hermes_project_stewardship.api.server import create_app  # noqa: E402
from hermes_project_stewardship.kanban import ReferenceKanbanAdapter  # noqa: E402
from hermes_project_stewardship.persistence.store import Store  # noqa: E402


@pytest.fixture()
def c(tmp_path):
    store = Store(tmp_path / "p5.db")
    client = TestClient(
        create_app(store, kanban_adapter=ReferenceKanbanAdapter(store))
    )
    yield client
    store.close()


def _register(c, bot="coder-bot", name="Coder"):
    r = c.post("/stewardship/v1/projects/dy1/bots", json={
        "bot_id": bot, "display_name": name,
        "capabilities": ["python"]})
    assert r.status_code == 200
    return r


def _group(c):
    r = c.post("/stewardship/v1/bot-groups", json={
        "name": "checkout-ops", "purpose": "payment work",
        "member_ids": ["coder-bot", "qa-bot"], "lead_id": "qa-bot"})
    assert r.status_code == 200


def test_register_and_list_bots(c):
    _register(c)
    r = c.get("/stewardship/v1/bots")
    assert r.status_code == 200
    bots = r.json()["bots"]
    assert any(b["id"] == "coder-bot" and b["status"] == "idle"
               for b in bots)


def test_invalid_bot_id_422(c):
    r = c.post("/stewardship/v1/projects/dy1/bots", json={
        "bot_id": "Bad Bot!", "display_name": "X"})
    assert r.status_code == 422


def test_status_route_updates_and_lists(c):
    _register(c)
    r = c.post("/stewardship/v1/bots/coder-bot/status", json={
        "status": "busy", "current_item": "HDY-9"})
    assert r.status_code == 200
    busy = [b for b in c.get("/stewardship/v1/bots").json()["bots"]
            if b["id"] == "coder-bot"][0]
    assert busy["status"] == "busy" and busy["current_item"] == "HDY-9"


def test_unknown_bot_status_404(c):
    r = c.post("/stewardship/v1/bots/ghost/status", json={"status": "idle"})
    assert r.status_code == 404


def test_workload_route_buckets(c):
    _register(c)
    c.post("/stewardship/v1/bots/coder-bot/status",
           json={"status": "busy", "current_item": "HDY-9"})
    wl = c.get("/stewardship/v1/workload").json()
    assert {"bot": "coder-bot", "item": "HDY-9"} in wl["busy"]


def test_reputation_route_404_for_unknown(c):
    assert c.get("/stewardship/v1/bots/ghost/reputation").status_code == 404


def test_group_routes_roundtrip(c):
    _register(c)
    c.post("/stewardship/v1/projects/dy1/bots", json={
        "bot_id": "qa-bot", "display_name": "QA"})
    _group(c)
    groups = c.get("/stewardship/v1/bot-groups").json()["groups"]
    g = [x for x in groups if x["name"] == "checkout-ops"][0]
    assert g["lead"] == "qa-bot" and set(g["members"]) == {
        "coder-bot", "qa-bot"}

    c.post("/stewardship/v1/projects/dy1/bots", json={
        "bot_id": "writer-bot", "display_name": "Writer"})
    r = c.post("/stewardship/v1/bot-groups/checkout-ops/members", json={
        "bot_id": "writer-bot"})
    assert r.status_code == 200
    # unknown bot -> 404
    r = c.post("/stewardship/v1/bot-groups/checkout-ops/members", json={
        "bot_id": "nope"})
    assert r.status_code == 404


def test_a2a_send_feed_and_validation(c):
    _register(c)
    c.post("/stewardship/v1/projects/dy1/bots", json={
        "bot_id": "qa-bot", "display_name": "QA"})
    _group(c)
    r = c.post("/stewardship/v1/a2a", json={
        "msg_type": "handoff", "from_actor": "coder-bot",
        "to_group": "checkout-ops", "item_ref": "HDY-41",
        "payload": {"item_ref": "HDY-41", "summary": "done, verify please",
                    "context_refs": ["audit:1"]}})
    assert r.status_code == 200
    body = r.json()
    assert body["channel_post"].startswith("coder-bot → #checkout-ops")

    feed = c.get("/stewardship/v1/bot-groups/checkout-ops/messages").json()
    assert feed["messages"][0]["type"] == "handoff"

    # invalid payload -> 422; unknown group -> 404
    r = c.post("/stewardship/v1/a2a", json={
        "msg_type": "handoff", "from_actor": "coder-bot",
        "to_group": "checkout-ops",
        "payload": {"summary": "incomplete"}})
    assert r.status_code == 422
    r = c.post("/stewardship/v1/a2a", json={
        "msg_type": "status_query", "from_actor": "kensei",
        "to_group": "ghost", "payload": {"about": "HDY-1"}})
    assert r.status_code == 404
