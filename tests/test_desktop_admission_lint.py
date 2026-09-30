"""plugin.js must pass the Hermes host's Desktop admission lint (Quan re-check H2).

The host lint lives in KenseiAgent (hermes_cli/plugin_validate_desktop.py). A
copy of its rules is not kept here on purpose: when the host checkout is
present the real file is used, so a rule change there is caught here too.
"""
from __future__ import annotations

import importlib.util
import os
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
PLUGIN_JS = ROOT / "hermes_dockyard_plugin" / "desktop" / "plugin.js"
HOST_LINT = Path(os.environ.get(
    "HERMES_DESKTOP_LINT", Path.home() / "repos" / "KenseiAgent" / "hermes_cli" / "plugin_validate_desktop.py"))


@pytest.mark.skipif(not HOST_LINT.is_file(), reason="Hermes host checkout not available")
def test_plugin_js_passes_host_admission_lint():
    spec = importlib.util.spec_from_file_location("host_desktop_lint", HOST_LINT)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    findings = module.desktop_surface_findings(PLUGIN_JS.read_text(encoding="utf-8"))
    assert findings == [], f"host admission lint findings: {findings[:10]}"
