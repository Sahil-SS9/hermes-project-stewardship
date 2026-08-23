"""G2 P3 tests: A2A message bus — structured events, audit, item trail."""
from __future__ import annotations

import pytest

from hermes_project_stewardship.persistence.dockyard_service import (
    DockyardService,
)


@pytest.fixture()
def dsvc(store, enabled) -> DockyardService:
    s = DockyardService(store)
    s.bot_register("coder-bot", "Coder", capabilities=["python"])
    s.bot_register("qa-bot", "QA", capabilities=["testing"])
    s.group_create("checkout-ops", purpose="payment work",
                   member_ids=["coder-bot", "qa-bot"], lead_id="qa-bot")
    return s


def _handoff(svc, item="HDY-41"):
    return svc.a2a_send(
        "handoff", from_actor="coder-bot", to_group="checkout-ops",
        payload={"item_ref": item, "summary": "CI split done, needs verify",
                 "context_refs": ["audit:991"]},
        item_ref=item)


def test_handoff_persists_with_channel_post(dsvc):
    sent = _handoff(dsvc)
    feed = dsvc.a2a_feed("checkout-ops")
    assert len(feed) == 1
    msg = feed[0]
    assert msg["type"] == "handoff"
    assert msg["from"] == "coder-bot"
    assert msg["item_ref"] == "HDY-41"
    # BM-04: channel post carries full context line
    assert "coder-bot → #checkout-ops [HDY-41]" in msg["channel_post"]
    assert "needs verify" in msg["channel_post"]
    assert sent["id"].startswith("a2a-")


def test_unknown_group_refused(dsvc):
    with pytest.raises(ValueError):
        dsvc.a2a_send(
            "status_query", from_actor="kensei", to_group="ghost-group",
            payload={"about": "HDY-1"})


def test_invalid_payload_refused_at_bus(dsvc):
    with pytest.raises(Exception):
        dsvc.a2a_send(
            "handoff", from_actor="coder-bot", to_group="checkout-ops",
            payload={"summary": "missing refs and item"})


@pytest.mark.parametrize("msg_type,payload", [
    ("status_query", {"about": "HDY-52"}),
    ("capability_request", {"capability": "rust"}),
])
def test_query_messages_flow(dsvc, msg_type, payload):
    r = dsvc.a2a_send(msg_type, from_actor="kensei",
                      to_group="checkout-ops", payload=payload)
    assert r["id"]
    feed = dsvc.a2a_feed("checkout-ops")
    assert feed[0]["type"] == msg_type


def test_result_completes_handoff_trail(dsvc):
    _handoff(dsvc, item="HDY-41")
    dsvc.a2a_send("result", from_actor="qa-bot", to_group="checkout-ops",
                  payload={"item_ref": "HDY-41", "outcome": "verified"},
                  item_ref="HDY-41")
    trail = dsvc.a2a_item_trail("HDY-41")
    types = [m["type"] for m in trail]
    assert types == ["handoff", "result"]  # chronological


def test_every_a2a_message_writes_shared_audit(dsvc, store):
    _handoff(dsvc)
    rows = store._conn.execute(
        "SELECT * FROM stewardship_audit_log WHERE action='a2a.handoff'"
    ).fetchall()
    assert len(rows) == 1
    assert rows[0]["actor"] == "coder-bot"
    assert rows[0]["subject"] == "checkout-ops"
