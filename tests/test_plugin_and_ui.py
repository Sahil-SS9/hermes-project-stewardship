"""Coverage: plugin registration surface + CLI UI helpers."""

from __future__ import annotations

import pytest

from hermes_project_stewardship import plugin
from hermes_project_stewardship.cli import ui
from hermes_project_stewardship.persistence.store import Store


class FakeRuntime:
    def __init__(self, with_tools=True, with_slash=True):
        self.tools = {}
        self.with_tools = with_tools
        self.with_slash = with_slash

    def register_tool(self, name, fn):
        self.tools[name] = fn

    def register_slash_group(self, name, routes):
        assert name == "project"
        assert "status" in routes and "approve" in routes


def test_register_with_full_runtime(store):
    plugin.PluginState.reset()
    plugin.PluginState.db_path = store.db_path
    rt = FakeRuntime()
    summary = plugin.register(rt)
    assert set(summary["tools"]) == set(plugin.TOOLS)
    assert summary["commands"] == ["project"]


def test_register_defensive_against_bare_runtime():
    class Bare:  # no register_tool at all
        pass

    summary = plugin.register(Bare())
    assert summary["tools"] == [] and summary["commands"] == []


def test_plugin_tools_roundtrip(store, svc, enabled):
    plugin.PluginState.reset()
    plugin.PluginState.db_path = store.db_path
    status = plugin.tool_steward_status(enabled)
    assert status["settings"]["project_id"] == enabled
    ini = plugin.tool_steward_propose_initiative(
        enabled, title="T", rationale="R", dedupe_key="plug-1")
    out = plugin.tool_steward_approve(ini["ref"], actor="h")
    assert out["status"] == "approved"


def test_ui_pick_numbered_fallback(monkeypatch, capsys):
    monkeypatch.setattr("sys.stdin", type("FakeIn", (), {"isatty": lambda s: False})())
    opts = [{"ref": "INIT-A-0001", "title": "A", "risk": "low"},
            {"ref": "INIT-A-0002", "title": "B", "risk": "high"}]
    assert ui.pick_initiative(opts, "Pick:") is None
    out = capsys.readouterr().out
    assert "1. INIT-A-0001" in out and "non-interactive" in out


def test_ui_pick_empty(monkeypatch, capsys):
    monkeypatch.setattr("sys.stdin", type("FakeIn", (), {"isatty": lambda s: True})())
    assert ui.pick_initiative([], "Pick:") is None
    assert "Nothing pending" in capsys.readouterr().out


def test_ui_paint_colour_when_tty(monkeypatch):
    import sys as _s

    class FakeOut:
        def isatty(self):
            return True

    monkeypatch.setattr(_s.stdout, "isatty", lambda: True)
    monkeypatch.delenv("NO_COLOR", raising=False)
    out = ui.paint("warn", "yellow")
    assert "\033[33m" in out


def test_ui_state_glyph_known_states():
    for st in ("healthy", "watch", "degraded", "critical", "unknown"):
        assert ui.state_glyph(st)
