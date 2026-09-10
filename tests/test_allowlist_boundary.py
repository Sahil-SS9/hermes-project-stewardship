"""Security-boundary tests for run_allowlisted (security/allowlist.py).

These pin the documented threat-model properties: restricted trusted PATH,
no shell interpolation, forbidden environment overrides refused, timeout
kill, fail-closed missing binaries, and output truncation caps.

Windows-specific branches (os.name == 'nt') are exercised only where the
interpreter can actually execute them; on POSIX they cannot be faked without
breaking pathlib itself, so they are guarded for a real Windows CI lane.
"""
from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path

import pytest

from hermes_project_stewardship.security.allowlist import (
    MAX_OUTPUT_BYTES,
    CommandNotPermitted,
    _trusted_path,
    run_allowlisted,
)


def test_trusted_path_is_fixed_on_posix(tmp_path):
    if os.name != "nt":
        assert _trusted_path(tmp_path) == "/usr/local/bin:/usr/bin:/bin"
    else:  # pragma: no cover — windows lane
        assert "System32" in _trusted_path(tmp_path) or "SystemRoot" in str(tmp_path)


@pytest.mark.skipif(os.name != "nt", reason="Windows PATH sanitisation branch")
def test_trusted_path_on_windows_excludes_project_root(tmp_path, monkeypatch):
    inside = tmp_path / "tools"
    inside.mkdir()
    monkeypatch.setenv("PATH", os.pathsep.join([str(inside), "C:\\Windows\\System32"]))
    safe = _trusted_path(tmp_path)
    assert str(inside) not in safe
    assert "System32" in safe


def test_empty_argv_and_non_list_refused(tmp_path):
    with pytest.raises(CommandNotPermitted):
        run_allowlisted([], cwd=tmp_path, allowlist=frozenset({"git"}))
    with pytest.raises(CommandNotPermitted):
        # deliberate type violation: the API must reject non-list input too
        run_allowlisted("git status", cwd=tmp_path, allowlist=frozenset({"git"}))  # type: ignore[arg-type]


def test_forbidden_env_keys_are_refused(tmp_path):
    for bad in ("PATH", "PYTHONPATH", "LD_PRELOAD", "LD_LIBRARY_PATH"):
        with pytest.raises(CommandNotPermitted, match="not permitted"):
            run_allowlisted(
                ["python3", "-c", "print(1)"],
                cwd=tmp_path,
                allowlist=frozenset({"python3"}),
                env_extra={bad: "/tmp/evil"},
            )


def test_permitted_env_extra_reaches_child(tmp_path):
    result = run_allowlisted(
        ["python3", "-c", "import os; print(os.environ.get('STEW_PROBE', 'missing'))"],
        cwd=tmp_path,
        allowlist=frozenset({"python3"}),
        env_extra={"STEW_PROBE": "delivered"},
    )
    assert result.ok is True
    assert "delivered" in result.stdout


def test_timeout_returns_timed_out_result_not_exception(tmp_path, monkeypatch):
    def slow_run(*args, **kwargs):
        raise subprocess.TimeoutExpired(
            cmd=args[0], timeout=0.01, output=b"partial", stderr=b"")

    monkeypatch.setattr(subprocess, "run", slow_run)
    result = run_allowlisted(
        ["python3", "-c", "import time; time.sleep(5)"],
        cwd=tmp_path,
        allowlist=frozenset({"python3"}),
        timeout_seconds=1,
    )
    assert result.ok is False
    assert result.timed_out is True
    assert result.exit_code is None
    assert result.duration_ms == 1000
    assert "partial" in result.stdout


def test_missing_binary_fails_closed_without_crash(tmp_path):
    """A missing evaluator binary is an unmet objective, not a crash."""
    result = run_allowlisted(
        ["definitely-not-a-real-binary-xyz"],
        cwd=tmp_path,
        allowlist=frozenset({"definitely-not-a-real-binary-xyz"}),
    )
    assert result.ok is False
    assert result.exit_code is None
    assert "not found on PATH" in result.stderr
    assert result.command == ["definitely-not-a-real-binary-xyz"]


def test_output_truncation_flag_and_cap(tmp_path):
    exe = "python3"  # /usr/bin/python3 — the only interpreter on the trusted PATH
    big = "x" * (MAX_OUTPUT_BYTES + 10)
    result = run_allowlisted(
        [exe, "-c", f"print('{big}')"],
        cwd=tmp_path,
        allowlist=frozenset({exe}),
    )
    assert result.ok is True
    assert len(result.stdout) <= MAX_OUTPUT_BYTES
    assert result.truncated is True


def test_nonzero_exit_reports_not_ok(tmp_path):
    exe = "python3"
    result = run_allowlisted(
        [exe, "-c", "raise SystemExit(3)"],
        cwd=tmp_path,
        allowlist=frozenset({exe}),
    )
    assert result.ok is False
    assert result.exit_code == 3
    assert result.timed_out is False


def test_default_allowlist_is_frozen_and_populated():
    from hermes_project_stewardship.security.allowlist import DEFAULT_ALLOWLIST

    assert isinstance(DEFAULT_ALLOWLIST, frozenset)
    assert {"git", "python3", "pytest", "npm"} <= set(DEFAULT_ALLOWLIST)
