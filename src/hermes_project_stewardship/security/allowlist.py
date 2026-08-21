"""Allowlisted command execution for objective evaluators and probes.

Security properties:
- argv list only — never a shell string; `shell=False` always;
- per-project allowlist of executables (exact binary names);
- hard timeout (SIGKILL after deadline), stdout/stderr caps;
- working directory confined to the project path;
- exit code, truncated output and duration recorded as evidence.

This is the ONLY sanctioned way stewardship runs commands in a project
context. See docs/threat-model.md §5.
"""

from __future__ import annotations

import shutil
import subprocess
from dataclasses import dataclass, field
from pathlib import Path
from typing import Dict, FrozenSet, List, Optional

MAX_OUTPUT_BYTES = 64 * 1024  # 64 KiB combined cap per stream
DEFAULT_TIMEOUT_SECONDS = 60


class CommandNotPermitted(Exception):
    pass


@dataclass
class CommandResult:
    ok: bool                 # exit code 0
    exit_code: Optional[int]
    timed_out: bool
    stdout: str
    stderr: str
    duration_ms: int
    command: List[str]
    truncated: bool = False


def run_allowlisted(
    command: List[str],
    *,
    cwd: Path,
    allowlist: FrozenSet[str],
    timeout_seconds: int = DEFAULT_TIMEOUT_SECONDS,
    env_extra: Optional[Dict[str, str]] = None,
) -> CommandResult:
    if not command or not isinstance(command, list):
        raise CommandNotPermitted("command must be a non-empty argv list")
    exe = Path(command[0]).name
    if exe not in allowlist:
        raise CommandNotPermitted(
            f"executable '{exe}' is not on this project's allowlist "
            f"(sorted: {sorted(allowlist)})"
        )
    env = {"PATH": "/usr/local/bin:/usr/bin:/bin", "LC_ALL": "C"}
    if env_extra:
        env.update(env_extra)
    # Resolve the executable via the *caller's* PATH (shutil.which), not the
    # stripped child env: allowlist checks match on basename, and venv tools
    # (e.g. .venv/bin/pytest) live outside the sanitised PATH above.
    exe_path = shutil.which(str(command[0]))
    argv = [exe_path] + [str(c) for c in command[1:]] if exe_path else [str(c) for c in command]
    try:
        proc = subprocess.run(
            argv,
            cwd=str(cwd),
            env=env,
            capture_output=True,
            timeout=timeout_seconds,
            shell=False,  # explicit; never interpolate through a shell
        )
        return CommandResult(
            ok=proc.returncode == 0,
            exit_code=proc.returncode,
            timed_out=False,
            stdout=proc.stdout.decode("utf-8", errors="replace")[:MAX_OUTPUT_BYTES],
            stderr=proc.stderr.decode("utf-8", errors="replace")[:MAX_OUTPUT_BYTES],
            duration_ms=0,
            command=[str(c) for c in command],
            truncated=len(proc.stdout) > MAX_OUTPUT_BYTES or len(proc.stderr) > MAX_OUTPUT_BYTES,
        )
    except subprocess.TimeoutExpired as t:
        return CommandResult(
            ok=False,
            exit_code=None,
            timed_out=True,
            stdout=(t.stdout or b"").decode("utf-8", errors="replace")[:MAX_OUTPUT_BYTES],
            stderr=(t.stderr or b"").decode("utf-8", errors="replace")[:MAX_OUTPUT_BYTES],
            duration_ms=timeout_seconds * 1000,
            command=[str(c) for c in command],
            truncated=False,
        )
    except FileNotFoundError:
        # Fail closed, never crash: a missing evaluator binary is an
        # unmet objective (the operator must fix the allowlist/env), not an
        # engine exception.
        return CommandResult(
            ok=False,
            exit_code=None,
            timed_out=False,
            stdout="",
            stderr=f"executable not found on PATH: {command[0]}",
            duration_ms=0,
            command=[str(c) for c in command],
            truncated=False,
        )


DEFAULT_ALLOWLIST: FrozenSet[str] = frozenset(
    {
        # Read-only / build-tool probes commonly needed by evaluators.
        "git",
        "pytest",
        "python",
        "python3",
        "npm",
        "npx",
        "cargo",
        "make",
        "grep",
        "ls",
        "cat",
        "true",
        "echo",
    }
)
