"""Dockyard v4-approved UI contract tests.

Locks the approved baseline (Sahil, 2026-08-22): the file at
design/dockyard-mockups-v4-approved.html is the canonical UI. Only palette
and background shader/image may change; structure, screens and interactions
are frozen. These tests pin that contract so future edits cannot silently
regress it.
"""
from __future__ import annotations
from pathlib import Path

import pytest

BASELINE = Path(__file__).resolve().parents[1] / "design" / "dockyard-mockups-v4-approved.html"


@pytest.fixture(scope="module")
def html() -> str:
    assert BASELINE.exists(), "approved baseline missing"
    return BASELINE.read_text()


def test_baseline_is_self_contained(html):
    assert "<!DOCTYPE html>" in html.lstrip()[:20]
    assert html.rstrip().endswith("</html>")
    assert "https://" not in html.replace("http://www.w3.org", "")


def test_all_seven_screens_present(html):
    import re
    ids = sorted(set(re.findall(r'class="screen[^"]*" id="(s\d)"', html)))
    assert ids == [f"s{i}" for i in range(1, 8)]


def test_nav_pills_cover_every_screen(html):
    import re
    nav = set(re.findall(r'nav-pill[^>]*data-s="(s\d)"', html))
    assert nav == {f"s{i}" for i in range(1, 8)}


def test_wizard_templates_uploads_present(html):
    low = html.lower()
    assert "wizard" in low and "template" in low
    assert ("dropzone" in low) or ("upload" in low)


def test_a2a_handoff_and_audit_surfaces(html):
    low = html.lower()
    assert "handoff" in low and "audit" in low


def test_no_font_dependent_glyphs(html):
    import re
    banned = re.findall(r"[⌂✓✕⇄◉🔔☾☀▶⏸↻↺＋—–]", html)
    assert not banned, f"font glyphs regressed: {banned}"


def test_inline_svg_icon_system(html):
    assert html.count("<svg") >= 50  # icon system is inline SVG


def test_theme_system_present(html):
    assert 'data-theme="light"' in html or "data-theme='light'" in html \
        or "--bg:" in html
    assert "prefers-reduced-motion" in html or "[hidden]" in html
