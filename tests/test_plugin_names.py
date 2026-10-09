"""Every part of the plugin goes by one name (issue #4).

Hermes mounts a plugin's dashboard backend only when the dashboard's own
manifest name is in ``plugins.enabled``, and pairs a dashboard with its plugin
by name. Hermes Desktop sends the Desktop half's data calls to
``/api/plugins/<Desktop plugin id>``. So the plugin, the dashboard and the
Desktop half must share one name; when they differed, a normal install left
the data side switched off.
"""

from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
PARTS = ROOT / "hermes_dockyard_plugin"
TITLE = "Hermes Project Stewardship"


def _one(pattern: str, path: Path) -> Any:
    found = re.findall(pattern, path.read_text(encoding="utf-8"), flags=re.MULTILINE)
    assert len(found) == 1, f"{path.relative_to(ROOT)}: expected one match for {pattern!r}, found {found}"
    return found[0]


def _manifest() -> dict:
    return json.loads((PARTS / "dashboard" / "manifest.json").read_text(encoding="utf-8"))


def _desktop_id_and_title() -> tuple[str, str]:
    return _one(r"const __plugin = \{\s*id: '([^']+)',\s*name: '([^']+)',", PARTS / "desktop" / "src" / "index.js")


def test_every_part_uses_the_plugin_name() -> None:
    name = _one(r"^name:\s*(\S+)\s*$", ROOT / "plugin.yaml")
    parts = {
        "dashboard manifest name": _manifest()["name"],
        "dashboard build name": _one(r"^\s*name:\s*'([^']+)',", PARTS / "dashboard" / "build.mjs"),
        "dashboard tab registration": _one(r"registry\.register\('([^']+)'", PARTS / "dashboard" / "src" / "index.ts"),
        "dashboard data address": _one(r"const BASE = '/api/plugins/([^']+)'", PARTS / "dashboard" / "src" / "api.ts"),
        "Desktop plugin id": _desktop_id_and_title()[0],
    }
    assert {part: value for part, value in parts.items() if value != name} == {}, f"plugin.yaml name is {name!r}"


def test_dashboard_and_desktop_show_one_title() -> None:
    assert (_manifest()["label"], _desktop_id_and_title()[1]) == (TITLE, TITLE)
