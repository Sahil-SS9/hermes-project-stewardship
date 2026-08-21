"""Discord adapter + template pack (G4/G5): cards, buttons, permissions."""

from __future__ import annotations

import pytest

from hermes_project_stewardship.gateway import GatewayCommandHandler
from hermes_project_stewardship.gateway.discord_adapter import DiscordAdapter
from hermes_project_stewardship.gateway.templates import (
    SEVERITY_COLOURS,
    approval_card,
    cycle_summary_card,
    render_discord_components,
    render_discord_embed,
    status_card,
)


@pytest.fixture()
def adapter(svc, enabled):
    return DiscordAdapter(GatewayCommandHandler(svc))


def test_status_card_shape(svc, enabled):
    card = status_card(enabled, svc.latest_health(enabled), svc.settings(enabled))
    assert card.project_id == enabled
    assert any("Health:" in l for l in card.lines)
    embed = render_discord_embed(card)
    assert embed["color"] == card.colour
    assert embed["title"].startswith(enabled)


def test_approval_card_has_buttons_and_plain_text(svc, enabled):
    ini = svc.propose_initiative(enabled, title="Fix X", rationale="evidence E",
                                 risk="high")
    card = approval_card(enabled, ini)
    comps = render_discord_components(card)
    assert len(comps) == 1
    buttons = comps[0]["components"]
    ids = [b["custom_id"] for b in buttons]
    assert f"approve:{ini['ref']}" in ids and f"reject:{ini['ref']}" in ids
    text = card.plain_text()
    assert ini["ref"] in text and "Approval needed" in text


def test_colourblind_palette_distinct():
    colours = list(SEVERITY_COLOURS.values())
    assert len(set(colours)) == len(colours)


def test_button_press_requires_grant(adapter, enabled, svc):
    ini = svc.propose_initiative(enabled, title="T", rationale="R")
    out = adapter.on_button(sender_id="STRANGER", custom_id=f"approve:{ini['ref']}",
                            project_id=enabled)
    assert out["ok"] is False
    assert svc.initiative_by_ref(ini["ref"])["status"] == "pending_approval"


def test_button_press_with_grant_approves(adapter, enabled, svc):
    ini = svc.propose_initiative(enabled, title="T2", rationale="R2")
    svc.set_gateway_permission(enabled, platform="discord", sender_id="ADMIN",
                               can_approve=True)
    out = adapter.on_button(sender_id="ADMIN", custom_id=f"approve:{ini['ref']}",
                            project_id=enabled)
    assert out["ok"] is True
    # redelivery of the same button press → idempotent
    again = adapter.on_button(sender_id="ADMIN", custom_id=f"approve:{ini['ref']}",
                              project_id=enabled)
    assert again.get("already_done") is True or "already" in again["text"]


def test_unknown_action_rejected(adapter, enabled):
    out = adapter.on_button(sender_id="U", custom_id="nuke:everything",
                            project_id=enabled)
    assert out["ok"] is False


def test_cycle_summary_card_no_action(engine, enabled, svc):
    r = engine.run_cycle(enabled)
    card = cycle_summary_card(enabled, r)
    assert any("No action required" in l for l in card.lines)


def test_pending_approval_messages_build_payloads(adapter, enabled, svc):
    svc.propose_initiative(enabled, title="A", rationale="r1")
    svc.propose_initiative(enabled, title="B", rationale="r2")
    msgs = adapter.pending_approval_messages(enabled)
    assert len(msgs) == 2
    for m in msgs:
        assert m["embeds"] and m["components"]
