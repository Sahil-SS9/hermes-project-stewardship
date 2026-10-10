"""scripts/native-host-lane.sh decides which skips fail the native lane (R-NOTE2).

The lane promises that native tests pass or fail. A skip because the host is
missing, or one of its modules fails to import, means the lane is misconfigured,
so it fails the lane. Platform-only and opt-in tests, and modules a Hermes
revision does not ship, skip on any machine: they are listed, not failed.

Each test runs the real script and real pytest, with the script's own flags, on
a tiny suite against a fake Hermes tree. About a second each; no Hermes needed.
"""

from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
LANE = ROOT / "scripts" / "native-host-lane.sh"

# Stands in for the lane's Python: swaps the suite path the script passes for
# the tiny suite, then runs this interpreter with the script's own arguments.
STAND_IN = """#!/bin/sh
for a in "$@"; do
  shift
  [ "$a" = "$HPS_LANE_SUITE" ] && a="$HPS_TINY_SUITE"
  set -- "$@" "$a"
done
exec "$HPS_REAL_PYTHON" "$@"
"""

pytestmark = pytest.mark.skipif(os.name != "posix", reason="the native lane is a POSIX shell script")


def _lane(tmp_path: Path, tests: str) -> tuple[int, str]:
    host = tmp_path / "hermes" / "hermes_cli"
    host.mkdir(parents=True)
    (host / "__init__.py").write_text("", encoding="utf-8")
    (host / "kanban_db.py").write_text("import ruamel_yaml_not_installed\n", encoding="utf-8")
    suite = tmp_path / "test_tiny.py"
    suite.write_text("import pytest\n\n\ndef test_runs():\n    pass\n" + tests, encoding="utf-8")
    stand_in = tmp_path / "python"
    stand_in.write_text(STAND_IN, encoding="utf-8")
    stand_in.chmod(0o755)
    env = {
        **os.environ,
        "STEWARD_TEST_PYTHON": str(stand_in),
        "HPS_LANE_SUITE": f"{ROOT}/tests",
        "HPS_TINY_SUITE": str(suite),
        "HPS_REAL_PYTHON": sys.executable,
    }
    done = subprocess.run(
        ["bash", str(LANE), str(tmp_path / "hermes")],
        env=env, capture_output=True, text=True, timeout=120,
    )
    return done.returncode, done.stdout + done.stderr


def test_platform_opt_in_and_unshipped_module_skips_are_listed_not_failed(tmp_path):
    code, out = _lane(tmp_path, '''

@pytest.mark.skip(reason="Windows PATH sanitisation branch")
def test_windows_only():
    pass


def test_needs_a_module_this_revision_does_not_ship():
    pytest.importorskip("hermes_cli.project_kanban_host")
''')
    assert code == 0, out
    assert "native lane counts: 1 passed, 2 skipped" in out
    assert "Windows PATH sanitisation branch" in out
    assert "No module named 'hermes_cli.project_kanban_host'" in out
    assert "NATIVE LANE GREEN" in out


def test_a_host_module_that_fails_to_import_fails_the_lane(tmp_path):
    code, out = _lane(tmp_path, '''

def test_needs_the_host():
    pytest.importorskip("hermes_cli.kanban_db")
''')
    assert code == 3, out
    assert "No module named 'ruamel_yaml_not_installed'" in out
    assert "NATIVE LANE GREEN" not in out


def test_a_failing_test_fails_the_lane_and_says_so(tmp_path):
    code, out = _lane(tmp_path, '''

def test_broken():
    assert False
''')
    assert code == 1, out
    assert "NATIVE LANE FAILED (exit 1)" in out
