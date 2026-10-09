"""Real-provider (Hermes) curation smoke test for Phase 8B.

Runs a SUBPROCESS driver outside pytest (upstream Hermes refuses real-auth
reads while PYTEST_CURRENT_TEST is set). Opt-in only:
RUN_REAL_PROVIDER_TEST=1. Never depends on live credentials in normal CI.
"""
import os
import subprocess
import sys
from pathlib import Path

import pytest

requires_real = pytest.mark.skipif(
    os.environ.get("RUN_REAL_PROVIDER_TEST") != "1",
    reason="real Hermes provider test is opt-in via RUN_REAL_PROVIDER_TEST=1",
)


@requires_real
def test_real_hermes_provider_curation_contract():
    driver = Path(__file__).parent / "real_provider_driver.py"
    # HPS_REAL_PROVIDER_PYTHON: an interpreter that has Hermes's provider
    # dependencies installed (for example your Hermes install's venv python).
    candidates = [
        Path(p) for p in (os.environ.get("HPS_REAL_PROVIDER_PYTHON", "").strip(),) if p
    ] + [Path(sys.executable)]
    interpreter = next((c for c in candidates if c.exists()), sys.executable)
    result = subprocess.run(
        [str(interpreter), str(driver)],
        capture_output=True,
        text=True,
        timeout=300,
        env={**os.environ, "PYTEST_CURRENT_TEST": ""},
    )
    verdict_lines = [
        line for line in result.stdout.splitlines() if line.startswith("{")
    ]
    print("\n".join(verdict_lines) or result.stdout or result.stderr)
    assert result.returncode == 0, result.stderr or result.stdout
    assert len(verdict_lines) == 2, verdict_lines
    import json

    checks = [json.loads(line) for line in verdict_lines]
    assert all(check["ok"] for check in checks), checks
    assert checks[0]["model"], checks[0]