"""Phase1 F2 regression: plugin startup must fail closed, not crash the host.

When resolve_db_path raises StateSelectionError (populated legacy database,
unrecognised schema, uninspectable file), importing the dockyard plugin must
succeed while every proxied route reports 503 with explicit operator
guidance. No alternate database may be chosen and unrelated host routes stay
up. Runs each scenario in a subprocess so the module-level import is witnessed
for real, isolated in a temporary HERMES_HOME.
"""
from __future__ import annotations

import json
import os
import sqlite3
import subprocess
import sys
import tempfile
from pathlib import Path

import pytest

fastapi = pytest.importorskip("fastapi")

PLUGIN_DIR = Path(__file__).resolve().parents[1] / "hermes_dockyard_plugin" / "dashboard"
SRC_DIR = Path(__file__).resolve().parents[1] / "src"

# In-process harness code executed inside the subprocess (imports plugin_api
# against the prepared HERMES_HOME, mounts the router, probes routes).
_HARNESS = """
import json, os, sys
from pathlib import Path
sys.path.insert(0, {plugin_dir!r})
sys.path.insert(0, {src_dir!r})

import plugin_api
from fastapi import FastAPI, APIRouter
from fastapi.testclient import TestClient

app = FastAPI()
unrelated = APIRouter()

@unrelated.get("/host/other")
def other():
    return {{"alive": True}}

app.include_router(unrelated)
app.include_router(plugin_api.plugin_api, prefix="/api/plugins/hermes-dockyard")

out = {{
    "startup_error": getattr(plugin_api, "_startup_error", "MISSING"),
    "has_store": plugin_api._store is not None,
    "legacy_untouched": not Path({legacy!r}).exists() or Path({legacy!r}).read_bytes() == {legacy_bytes!r},
    "canonical_created": Path({canonical!r}).exists(),
}}
with TestClient(app) as client:
    out["health"] = client.get("/api/plugins/hermes-dockyard/health").json()
    r = client.get("/api/plugins/hermes-dockyard/dashboard")
    out["dashboard_status"] = r.status_code
    out["dashboard_body"] = r.json()
    out["unrelated"] = client.get("/host/other").json()
print("RESULT::" + json.dumps(out))
"""


def _run_plugin_import(legacy_rows: bool) -> dict:
    """Import the plugin against a profile home containing a legacy database."""
    with tempfile.TemporaryDirectory(prefix="f2-startup-") as tmp:
        home = Path(tmp) / "hermes-home"
        legacy = home / "stewardship.db"
        home.mkdir(parents=True)
        conn = sqlite3.connect(legacy)
        if legacy_rows:  # unrecognised schema -> StateSelectionError
            conn.execute("CREATE TABLE unrelated_legacy (x)")
        conn.commit()
        conn.close()
        legacy_bytes = legacy.read_bytes()
        canonical = home / "plugin-data" / "hermes-dockyard" / "dockyard.db"
        harness = _HARNESS.format(
            plugin_dir=str(PLUGIN_DIR),
            src_dir=str(SRC_DIR),
            legacy=str(legacy),
            legacy_bytes=legacy_bytes,
            canonical=str(canonical),
        )
        env = dict(os.environ, HERMES_HOME=str(home))
        # Isolate from parent-suite env leakage (e.g. DOCKYARD_PLUGIN_DB set
        # by test_dockyard_plugin_backend before importing its plugin_api).
        env.pop("DOCKYARD_PLUGIN_DB", None)
        env.pop("STEWARD_DB_PATH", None)
        proc = subprocess.run(
            [sys.executable, "-c", harness],
            env=env, capture_output=True, text=True, timeout=120,
        )
        assert proc.returncode == 0, (
            "plugin import/serve crashed the host process:\n" + proc.stderr[-2000:]
        )
        for line in proc.stdout.splitlines():
            if line.startswith("RESULT::"):
                return json.loads(line[len("RESULT::"):])
        pytest.fail("harness produced no result:\n" + proc.stdout[-2000:])


def test_import_survives_unrecognised_legacy_db_and_fails_closed():
    result = _run_plugin_import(legacy_rows=True)
    # Import succeeded; selection error surfaced, not swallowed.
    assert "No data was moved" in result["startup_error"] or \
        "Unrecognised existing database" in result["startup_error"] or \
        "Set STEWARD_DB_PATH" in result["startup_error"]
    assert result["has_store"] is False
    # Fail closed: degraded health, 503 with operator guidance on proxied routes.
    assert result["health"]["ok"] is False
    assert result["health"]["status"] == "degraded"
    assert "STEWARD_DB_PATH" in result["dashboard_body"]["detail"]
    assert result["dashboard_status"] == 503
    # No alternate database chosen; legacy file byte-identical.
    assert result["legacy_untouched"] is True
    assert result["canonical_created"] is False
    # Unrelated host routes keep working.
    assert result["unrelated"] == {"alive": True}