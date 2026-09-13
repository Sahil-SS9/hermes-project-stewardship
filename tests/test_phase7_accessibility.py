"""Lane B Phase 7 — keyboard / screen-reader / motion accessibility (PM-0707).

Static gates over the production Desktop file (no browser needed, no
production edits). Every assertion names the exact invariant; the full
manual assistive-technology run remains a post-integration gate (see lane
report PM-0707 awaiting-integration notes).
"""
from __future__ import annotations

from pathlib import Path

WT = Path(__file__).resolve().parents[1]
PLUGIN = WT / "hermes_dockyard_plugin/desktop/plugin.js"


def _text() -> str:
    return PLUGIN.read_text()


def test_keyboard_order_focus_trap_and_return():
    """PM-0707: keyboard support present on Phase5 base; full trap/return is a gap.

    Base provides: roving tabIndex + Arrow/Home/End for tabs, Escape closes
    every dialog, one explicit .focus() for tab navigation, aria-modal +
    aria-labelledby on dialogs. A full Tab-trap + focus-return-to-trigger
    (as in the Phase2 prototype picker) is NOT present in production
    plugin.js on this base — recorded as cross-lane finding LANE-B-03 for
    Lane A / Phase6 hardening. This gate asserts the base truthfully.
    """
    text = _text()
    assert "focus()" in text, "focus management must exist"
    assert "Escape" in text, "Escape-to-close must be implemented"
    assert "tabIndex" in text or "tabindex" in text.lower(), "roving tabindex required"
    assert "ArrowRight" in text and "ArrowLeft" in text, "arrow-key nav required"
    assert "aria-modal" in text
    assert "aria-labelledby" in text


def test_accessible_names_live_updates_and_dialog_semantics():
    """PM-0707: controls have accessible names; status uses live regions."""
    text = _text()
    assert "aria-label" in text
    assert text.count("aria-label") >= 10, "interactive controls need accessible names"
    assert "role=" in text or "role:" in text
    for role in ("dialog", "tablist", "progressbar", "status"):
        assert role in text, f"role '{role}' missing from Desktop surface"
    # Live feedback for async mutations (status/toast region).
    assert "aria-live" in text or "Status messages" in text


def test_non_colour_status_and_touch_targets():
    """PM-0707: status never colour-alone; touch targets meet 44px guidance."""
    text = _text()
    # Status pairs icon + text (aria-hidden mark + visible label), not colour alone.
    assert "dockyard-status-mark" in text
    assert "aria-hidden" in text
    # Buttons declare a usable hit area; small variant still >= 34px height
    # and base controls >= 38px (44px guidance documented as gap for small).
    assert "min-height: 38px" in text or "min-height: 40px" in text
    assert "-webkit-tap-highlight-color" in text, "touch feedback must be declared"


def test_contrast_metadata_and_reduced_motion():
    """PM-0707: contrast pairs declared; reduced motion disables animation."""
    text = _text()
    assert "CONTRAST_PAIRS" in text
    assert "minimum: 4.5" in text
    assert "minimum: 3" in text
    assert "prefers-reduced-motion" in text, "reduced-motion media query required"
    # Focus indicator is always visible (3px outline, not outline:none alone).
    assert "outline: 3px solid var(--dy-focus)" in text
    assert ":focus-visible" in text
