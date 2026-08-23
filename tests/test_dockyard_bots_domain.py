"""G2 Phase 1 domain tests: Bot registry + BotGroup + A2AMessage contract."""
from __future__ import annotations

import pytest

from hermes_project_stewardship.dockyard.bots import (
    A2AError,
    A2AMessage,
    A2AMessageType,
    Bot,
    BotGroup,
    BotStatus,
    GroupRole,
)


# --------------------------------------------------------------------- #
# BM-01 registry domain                                                  #
# --------------------------------------------------------------------- #

def test_bot_id_format_enforced():
    with pytest.raises(ValueError):
        Bot(id="Bad Bot", display_name="Bad")
    with pytest.raises(ValueError):
        Bot(id="x", display_name="too short")
    bot = Bot(id="coder-bot", display_name="Coder",
              capabilities=["python", " CI "])
    assert bot.capabilities == ["python", "ci"]


def test_bot_capability_check_case_insensitive():
    bot = Bot(id="coder-bot", display_name="Coder", capabilities=["Python"])
    assert bot.has_capability("python")
    assert not bot.has_capability("rust")


def test_bot_status_transitions():
    bot = Bot(id="coder-bot", display_name="Coder")
    bot.set_status(BotStatus.BUSY, current_item="HDY-41")
    assert bot.current_item == "HDY-41"
    bot.set_status(BotStatus.IDLE)
    assert bot.current_item is None
    with pytest.raises(ValueError):
        bot.set_status(BotStatus.IDLE, current_item="HDY-41")


def test_bot_stuck_not_allowed_from_offline():
    bot = Bot(id="coder-bot", display_name="Coder")
    bot.set_status(BotStatus.OFFLINE)
    with pytest.raises(ValueError):
        bot.mark_stuck()


# --------------------------------------------------------------------- #
# BM-02 groups                                                           #
# --------------------------------------------------------------------- #

def test_group_name_kebab_enforced():
    with pytest.raises(ValueError):
        BotGroup(name="Checkout Ops")


def test_group_lead_routing():
    g = BotGroup(name="checkout-ops")
    g.add_member("coder-bot")
    g.add_member("qa-bot", GroupRole.LEAD)
    assert g.lead_id() == "qa-bot"
    assert g.route_target() == "qa-bot"


def test_group_without_lead_routes_to_first_member():
    g = BotGroup(name="checkout-ops")
    g.add_member("writer-bot")
    g.add_member("coder-bot")
    assert g.route_target() == "coder-bot"  # sorted fallback, deterministic


def test_empty_group_cannot_route():
    g = BotGroup(name="empty-ops")
    with pytest.raises(A2AError):
        g.route_target()


# --------------------------------------------------------------------- #
# BM-03 A2A structured message contract                                  #
# --------------------------------------------------------------------- #

def test_handoff_requires_full_context():
    m = A2AMessage(msg_type=A2AMessageType.HANDOFF, from_actor="coder-bot",
                   to_group="checkout-ops", item_ref="HDY-41",
                   payload={"item_ref": "HDY-41", "summary": "CI split done",
                            "context_refs": ["audit:991"]})
    m.validate_payload()  # ok

    bad = A2AMessage(msg_type=A2AMessageType.HANDOFF, from_actor="coder-bot",
                     to_group="checkout-ops",
                     payload={"item_ref": "HDY-41", "summary": "no refs"})
    with pytest.raises(A2AError):
        bad.validate_payload()


def test_status_query_minimal_payload():
    m = A2AMessage(msg_type=A2AMessageType.STATUS_QUERY,
                   from_actor="kensei", to_group="checkout-ops",
                   payload={"about": "HDY-52"})
    m.validate_payload()


def test_capability_request_requires_capability():
    m = A2AMessage(msg_type=A2AMessageType.CAPABILITY_REQUEST,
                   from_actor="kensei", to_group="checkout-ops",
                   payload={"capability": "rust"})
    m.validate_payload()
    bad = A2AMessage(msg_type=A2AMessageType.CAPABILITY_REQUEST,
                     from_actor="kensei", to_group="checkout-ops",
                     payload={})
    with pytest.raises(A2AError):
        bad.validate_payload()


def test_result_requires_outcome():
    m = A2AMessage(msg_type=A2AMessageType.RESULT, from_actor="qa-bot",
                   to_group="checkout-ops", item_ref="HDY-52",
                   payload={"item_ref": "HDY-52", "outcome": "verified"})
    m.validate_payload()


def test_handoff_ref_mismatch_refused():
    m = A2AMessage(msg_type=A2AMessageType.HANDOFF, from_actor="coder-bot",
                   to_group="checkout-ops", item_ref="HDY-41",
                   payload={"item_ref": "HDY-99", "summary": "mismatch",
                            "context_refs": ["a"]})
    with pytest.raises(A2AError):
        m.validate_payload()


def test_message_ids_unique_and_summary_line():
    a = A2AMessage(msg_type=A2AMessageType.RESULT, from_actor="qa-bot",
                   to_group="checkout-ops",
                   payload={"item_ref": "HDY-1", "outcome": "ok"})
    b = A2AMessage(msg_type=A2AMessageType.RESULT, from_actor="qa-bot",
                   to_group="checkout-ops",
                   payload={"item_ref": "HDY-1", "outcome": "ok"})
    assert a.id != b.id
    assert a.summary_line() == "qa-bot → #checkout-ops [HDY-1]: ok"
