"""Coverage's one existing host exclusion must not depend on the shell cwd."""
from __future__ import annotations

import json
import os
from pathlib import Path
import subprocess
import sys

import pytest

ROOT = Path(__file__).resolve().parents[1]


@pytest.mark.parametrize("neutral", [False, True])
def test_host_omission_is_working_directory_independent(tmp_path, neutral):
    code = f'''
import coverage, importlib, json
cov = coverage.Coverage(config_file={str(ROOT / "pyproject.toml")!r})
cov.start()
importlib.import_module("hermes_project_stewardship.kanban.vanilla_host")
cov.stop()
print(json.dumps(sorted(cov.get_data().measured_files())))
'''
    result = subprocess.run([sys.executable, "-c", code], cwd=tmp_path if neutral else ROOT,
                            env={**os.environ, "PYTHONDONTWRITEBYTECODE": "1"},
                            capture_output=True, text=True, timeout=20)
    assert result.returncode == 0, result.stderr
    measured = json.loads(result.stdout)
    assert measured, "The control must actually collect package execution"
    assert not any(p.endswith("/kanban/vanilla_host.py") for p in measured), measured
    assert any(p.endswith("/kanban/host_adapter.py") for p in measured), measured
