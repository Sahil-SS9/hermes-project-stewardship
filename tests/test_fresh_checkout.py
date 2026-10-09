"""A fresh clone must run the suite whatever its folder is called (issue #1).

The repo root is itself a package: its __init__.py is the Hermes directory-plugin
entry point. In a folder whose name is a valid Python identifier (`git clone ... hps`)
pytest therefore names the test modules `hps.tests.*`, not `tests.*`, and an absolute
`from tests.conftest import ...` cannot be found: collection stops before any test.
Putting the root on sys.path instead (`pythonpath = ["."]`) makes those imports load a
second copy of conftest.py under the other name, which wraps sqlite3.connect again and
moves every test state path mid-collection. So test modules import each other
relatively, and this test collects the suite from such a folder: CI's checkout is
always named after the repo, so CI never sees that layout otherwise.
"""

from __future__ import annotations

import json
import os
import shutil
import subprocess
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]

# Runs pytest as the `pytest` command does: the runner's own folder goes first on
# sys.path, not the current folder (`python -m pytest` would add the checkout and hide
# the bug). Records every file of the checkout imported under more than one name.
RUNNER = """
import json, os, sys

import pytest


class Probe:
    def pytest_collection_finish(self, session):
        root = os.path.normcase(os.path.realpath(os.getcwd())) + os.sep
        names = {}
        for name, module in list(sys.modules.items()):
            path = getattr(module, "__file__", None)
            if path:
                path = os.path.normcase(os.path.realpath(path))
                if path.startswith(root):
                    names.setdefault(path, []).append(name)
        twice = sorted(sorted(group) for group in names.values() if len(group) > 1)
        with open(os.environ["HPS_PROBE_OUT"], "w", encoding="utf-8") as out:
            json.dump({"collected": len(session.items), "twice": twice}, out)


sys.exit(pytest.main(sys.argv[1:], plugins=[Probe()]))
"""

NOT_IN_A_CLONE = shutil.ignore_patterns(
    ".git", ".venv", "venv", "node_modules", "__pycache__", ".pytest_cache", ".ruff_cache",
    ".mypy_cache", "htmlcov", ".coverage*", "*.egg-info", "dist", "build",
)


def _child_env(tmp_path: Path, report: Path) -> dict[str, str]:
    env = {
        key: value
        for key, value in os.environ.items()
        if not key.startswith(("PYTEST_", "COV_CORE_", "COVERAGE_"))
    }
    # Keep absolute import roots (the native-host lane adds Hermes this way), but
    # never the checkout itself or a relative entry: either would hide the bug.
    env["PYTHONPATH"] = os.pathsep.join(
        entry
        for entry in os.environ.get("PYTHONPATH", "").split(os.pathsep)
        if entry and os.path.isabs(entry) and Path(entry).resolve() != ROOT
    )
    env.update(
        HPS_PROBE_OUT=str(report),
        HPS_TEST_STATE_ROOT=str(tmp_path / "state"),
        PYTHONDONTWRITEBYTECODE="1",
    )
    return env


@pytest.mark.timeout(300)
def test_suite_collects_from_a_folder_named_like_a_python_package(tmp_path):
    checkout = tmp_path / "hps"
    shutil.copytree(
        ROOT, checkout, ignore=NOT_IN_A_CLONE,
        symlinks=os.name != "nt", ignore_dangling_symlinks=True,
    )
    runner = tmp_path / "runner" / "run_pytest.py"
    runner.parent.mkdir()
    runner.write_text(RUNNER, encoding="utf-8")
    report = tmp_path / "probe.json"

    result = subprocess.run(
        [sys.executable, str(runner), "--collect-only", "-q", "-p", "no:cacheprovider"],
        cwd=checkout, env=_child_env(tmp_path, report), capture_output=True,
        encoding="utf-8", errors="replace", timeout=280,
    )

    tail = (result.stdout + result.stderr)[-3000:]
    assert result.returncode == 0, f"collection failed in a folder named 'hps':\n{tail}"
    probe = json.loads(report.read_text(encoding="utf-8"))
    assert probe["collected"] > 0, tail
    assert probe["twice"] == [], f"imported twice under two names: {probe['twice']}"
