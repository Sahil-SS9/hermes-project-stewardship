"""G2 P2 tests: registry + groups persistence and service wiring."""
from __future__ import annotations

import pytest

from hermes_project_stewardship.dockyard.bots import (
    Bot,
    BotStatus,
    GroupRole,
)
from hermes_project_stewardship.persistence.dockyard_service import (
    DockyardService,
)


@pytest.fixture()
def dsvc(store, enabled) -> DockyardService:
    return DockyardService(store)


def test_bot_register_roundtrip_persists_capabilities(dsvc):
    dsvc.bot_register("coder-bot", "Coder", capabilities=["Python", "CI"],
                      profile="octacon")
    got = dsvc.bot_get("coder-bot")
    assert got is not None
    assert got.capabilities == ["python", "ci"]
    assert got.profile == "octacon"
    assert got.status is BotStatus.IDLE


def test_bot_reregister_updates_not_duplicates(dsvc):
    dsvc.bot_register("coder-bot", "Coder", capabilities=["python"])
    dsvc.bot_register("coder-bot", "Coder v2", capabilities=["rust"])
    bots = dsvc.bots_list()
    assert len(bots) == 1
    assert bots[0].display_name == "Coder v2"
    assert bots[0].has_capability("rust")


def test_bot_status_busy_with_item_and_back(dsvc, bot_actor):
    dsvc.bot_register("qa-bot", "QA")
    dsvc.bot_set_status("qa-bot", "busy", current_item="HDY-41")
    busy = dsvc.bot_get("qa-bot")
    assert busy.status is BotStatus.BUSY
    assert busy.current_item == "HDY-41"
    dsvc.bot_set_status("qa-bot", "idle")
    idle = dsvc.bot_get("qa-bot")
    assert idle.status is BotStatus.IDLE and idle.current_item is None


def test_unknown_bot_status_raises(dsvc):
    with pytest.raises(ValueError):
        dsvc.bot_set_status("ghost", "busy")


def test_bots_filter_by_status(dsvc):
    dsvc.bot_register("a-bot", "A")
    dsvc.bot_register("b-bot", "B")
    dsvc.bot_set_status("b-bot", "stuck")
    stuck = dsvc.bots_list(status="stuck")
    assert [b.id for b in stuck] == ["b-bot"]


def test_group_create_with_lead_and_members(dsvc):
    dsvc.bot_register("coder-bot", "Coder")
    dsvc.bot_register("qa-bot", "QA")
    g = dsvc.group_create("checkout-ops", purpose="payment work",
                          member_ids=["coder-bot", "qa-bot"],
                          lead_id="qa-bot")
    assert g.lead_id() == "qa-bot"
    fetched = dsvc.group_get("checkout-ops")
    assert fetched is not None
    assert fetched.members["coder-bot"] == GroupRole.MEMBER
    assert fetched.members["qa-bot"] == GroupRole.LEAD
    assert fetched.channel_ref is None


def test_group_membership_add_after_create(dsvc):
    dsvc.bot_register("writer-bot", "Writer")
    dsvc.group_create("docs-ops")
    dsvc.group_add_member("docs-ops", "writer-bot")
    g = dsvc.group_get("docs-ops")
    assert "writer-bot" in g.members
    # unknown group / unknown bot refused
    from pytest import raises

    with raises(ValueError):
        dsvc.group_add_member("no-such-group", "writer-bot")
    with raises(ValueError):
        dsvc.group_add_member("docs-ops", "ghost-bot")


@pytest.fixture()
def bot_actor():
    from hermes_project_stewardship.dockyard import Actor, ActorKind

    return Actor(id="qa-bot", display_name="QA", kind=ActorKind.BOT)
