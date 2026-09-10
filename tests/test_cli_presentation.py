"""Presentation-layer contract tests for the stewardctl CLI (cli/ui.py).

These pin the observable CLI behaviour: plain output without colour,
actionable error hints, aligned tables, and the non-interactive picker
degradation required by WS16 U1/U4/U5.
"""
from __future__ import annotations

import pytest

from hermes_project_stewardship.cli import ui


def test_state_glyph_maps_known_states_and_defaults_to_unknown():
    assert ui.state_glyph("healthy") == "\u2705"
    assert ui.state_glyph("never-verified") == "\u26aa"
    assert ui.state_glyph("totally-unmapped") == "\u26aa"


def test_paint_is_plain_when_not_a_tty_or_no_color(monkeypatch):
    monkeypatch.setattr(ui.sys.stdout, "isatty", lambda: False)
    assert ui.paint("hello", "red") == "hello"
    monkeypatch.setattr(ui.sys.stdout, "isatty", lambda: True)
    monkeypatch.setenv("NO_COLOR", "1")
    assert ui.paint("hello", "red") == "hello"
    monkeypatch.delenv("NO_COLOR")
    coloured = ui.paint("hello", "red")
    assert "\033[31m" in coloured and coloured.endswith("\033[0m")


def test_render_table_aligns_and_truncates_long_cells():
    long_cell = "x" * 80
    out = ui.render_table(("REF", "TITLE"), [["a", long_cell]])
    lines = out.splitlines()
    assert len(lines) == 3
    # header padded to the joined width (65 chars): 'REF' + 2sp + 'TITLE'.ljust(60)
    assert lines[0].rstrip() == "REF  TITLE"
    assert len(lines[0]) == 65
    # separator spans the joined width: 3 + 2 + 60 = 65 dashes
    assert lines[1] == "-" * 65
    # body cell truncated at 60 chars, column-aligned under TITLE
    assert lines[2] == "a" .ljust(3) + "  " + "x" * 60


def test_health_line_includes_state_score_phase_and_lead():
    settings = {"project_id": "demo", "phase": "active", "autonomy_level": 2,
                "owner": {"lead_profile": "octacon"}}
    health = {"status": "healthy", "score": 91}
    line = ui.health_line("demo", health, settings)
    assert "\u2705" in line and "demo" in line
    assert "healthy (score 91)" in line
    assert "phase=active" in line and "autonomy L2" in line and "lead=octacon" in line

    # no health snapshot yet -> never-verified without a score
    line2 = ui.health_line("demo", None, settings)
    assert "never-verified" in line2 and "score" not in line2


def test_initiative_rows_render_known_and_unknown_risk(monkeypatch):
    rows = ui.initiative_rows([
        {"ref": "PM-1", "risk": "high", "status": "pending_approval", "title": "T"},
        {"ref": "PM-2", "risk": "bizarre", "status": "pending_approval", "title": "U"},
    ])
    # non-TTY: paint is inert, cells are plain and width-padded
    assert rows[0][1] == "high".ljust(8)
    assert rows[1][1] == "bizarre".ljust(8)

    # TTY: known risks map to semantic colours, unknown falls back to grey
    monkeypatch.setattr(ui.sys.stdout, "isatty", lambda: True)
    coloured = ui.initiative_rows([
        {"ref": "PM-1", "risk": "high", "status": "pending_approval", "title": "T"},
        {"ref": "PM-2", "risk": "bizarre", "status": "pending_approval", "title": "U"},
    ])
    assert "\033[38;5;208m" in coloured[0][1]  # high -> orange (RISK_GLYPH)
    assert "\033[90m" in coloured[1][1]      # unknown -> grey


def test_friendly_error_applies_matching_hint_and_survives_unknown():
    out = ui.friendly_error("Project paused; nothing to do")
    assert "error:" in out and "stewardctl project resume" in out
    plain = ui.friendly_error("totally novel failure")
    assert plain.startswith("error:") and "hint:" not in plain


def test_pick_initiative_returns_none_when_nothing_pending(capsys):
    assert ui.pick_initiative([], "Choose:") is None
    assert "Nothing pending approval." in capsys.readouterr().out


def test_pick_initiative_degrades_to_numbered_list_without_tty(
    monkeypatch, capsys,
):
    monkeypatch.setattr(ui.sys.stdin, "isatty", lambda: False)
    options = [
        {"ref": "PM-9", "title": "Ninth", "risk": "low"},
        {"ref": "PM-10", "title": "Tenth", "risk": "high"},
    ]
    chosen = ui.pick_initiative(options, "Approve one:")
    out = capsys.readouterr().out
    assert chosen is None
    assert "1. PM-9" in out and "2. PM-10" in out
    assert "pass the ref explicitly" in out


def _fake_tty_stdin(keys):
    import itertools

    class FakeStdin:
        def isatty(self):
            return True

        def fileno(self):
            return 0

        def read(self, n=1):
            return next(keys)

    return FakeStdin()


def test_pick_initiative_interactive_arrow_selection(monkeypatch, capsys):
    """Full TTY path: escape sequence moves down, Enter selects, redraw runs."""
    import termios
    import tty

    options = [
        {"ref": "PM-A", "title": "Alpha", "risk": "low"},
        {"ref": "PM-B", "title": "Beta", "risk": "medium"},
    ]
    keys = iter(["\x1b", "[B", "\r"])  # down-arrow seq, then Enter

    monkeypatch.setattr(ui.sys, "stdin", _fake_tty_stdin(keys))
    monkeypatch.setattr(termios, "tcgetattr", lambda fd: [0] * 6)
    monkeypatch.setattr(termios, "tcsetattr", lambda fd, when, attrs: None)
    monkeypatch.setattr(tty, "setraw", lambda fd: None)

    chosen = ui.pick_initiative(options, "Pick:")
    out = capsys.readouterr().out
    assert chosen == "PM-B"
    # initial draw + redraw after the arrow key
    assert out.count("Pick:") == 2


def test_pick_initiative_interactive_quit_returns_none(monkeypatch):
    import termios
    import tty

    options = [{"ref": "PM-C", "title": "Gamma", "risk": "high"}]
    keys = iter(["q"])

    monkeypatch.setattr(ui.sys, "stdin", _fake_tty_stdin(keys))
    monkeypatch.setattr(termios, "tcgetattr", lambda fd: [0] * 6)
    monkeypatch.setattr(termios, "tcsetattr", lambda fd, when, attrs: None)
    monkeypatch.setattr(tty, "setraw", lambda fd: None)

    assert ui.pick_initiative(options, "Pick:") is None
