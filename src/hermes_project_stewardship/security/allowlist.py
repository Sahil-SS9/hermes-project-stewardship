"""Allowlisted command execution for objective evaluators and probes.

Security properties:
- argv list only — never a shell string; `shell=False` always;
- per-project allowlist of executables (exact binary names);
- hard timeout (SIGKILL after deadline), stdout/stderr caps; a command
  whose output passes MAX_CAPTURE_BYTES on either stream is killed;
- working directory confined to the project path;
- exit code, truncated output and duration recorded as evidence.

This is the ONLY sanctioned way stewardship runs commands in a project
context. See docs/threat-model.md §5.
"""

from __future__ import annotations

import os
import shutil
import selectors
import signal
import subprocess
import threading
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, FrozenSet, List, Optional

MAX_OUTPUT_BYTES = 64 * 1024  # 64 KiB combined cap per stream
# Bytes read from each stream while the command runs. Past this the command
# is killed, so a flood of output cannot exhaust memory before the timeout.
MAX_CAPTURE_BYTES = 1024 * 1024
DEFAULT_TIMEOUT_SECONDS = 60


class CommandNotPermitted(Exception):
    pass


def _trusted_path(cwd: Path) -> str:
    if os.name != "nt":
        return "/usr/local/bin:/usr/bin:/bin"
    project_root = cwd.resolve()
    safe_entries = []
    for entry in os.environ.get("PATH", "").split(os.pathsep):
        if not entry:
            continue
        try:
            resolved = Path(entry).resolve()
        except OSError:
            continue
        if resolved == project_root or project_root in resolved.parents:
            continue
        safe_entries.append(str(resolved))
    return os.pathsep.join(safe_entries)


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
    output_too_large: bool = False  # killed after MAX_CAPTURE_BYTES on a stream


KILL_GRACE_SECONDS = 1.0


def _capture_posix(proc: subprocess.Popen, deadline: float):
    """Read both pipes until EOF, the byte cap or the deadline; never block past it."""
    out, err = bytearray(), bytearray()
    selector = selectors.DefaultSelector()
    for stream, sink in ((proc.stdout, out), (proc.stderr, err)):
        assert stream is not None  # both pipes are requested
        os.set_blocking(stream.fileno(), False)
        selector.register(stream, selectors.EVENT_READ, sink)
    flooded = timed_out = False
    with selector:
        while selector.get_map() and not flooded:
            remaining = deadline - time.monotonic()
            if remaining <= 0:
                timed_out = True
                break
            for key, _ in selector.select(remaining):
                try:
                    chunk = os.read(key.fd, 64 * 1024)
                except BlockingIOError:
                    continue
                if not chunk:
                    selector.unregister(key.fileobj)
                    continue
                sink = key.data
                room = MAX_CAPTURE_BYTES - len(sink)
                sink += chunk[:room]
                flooded = flooded or len(chunk) > room
    return out, err, flooded, timed_out


def _capture_threads(proc: subprocess.Popen, deadline: float):
    """Windows has no select() on pipes: one daemon reader per stream, joined
    against the same deadline, so a stuck read never holds the caller."""
    out, err, over = bytearray(), bytearray(), threading.Event()

    def drain(stream, sink):
        while not over.is_set():
            chunk = stream.read(64 * 1024)
            if not chunk:
                return
            room = MAX_CAPTURE_BYTES - len(sink)
            sink += chunk[:room]
            if len(chunk) > room:
                over.set()

    readers = [threading.Thread(target=drain, args=pair, daemon=True)
               for pair in ((proc.stdout, out), (proc.stderr, err))]
    for reader in readers:
        reader.start()
    for reader in readers:
        while reader.is_alive() and not over.is_set() and time.monotonic() < deadline:
            reader.join(timeout=0.05)
    timed_out = any(reader.is_alive() for reader in readers) and not over.is_set()
    return out, err, over.is_set(), timed_out


def _kill(proc: subprocess.Popen) -> None:
    """SIGTERM the command's process group, SIGKILL what is left after a short grace."""
    if os.name == "nt":
        proc.kill()
        return
    try:
        os.killpg(proc.pid, signal.SIGTERM)
        try:
            proc.wait(timeout=KILL_GRACE_SECONDS)
        except subprocess.TimeoutExpired:
            pass
        os.killpg(proc.pid, signal.SIGKILL)
    except (ProcessLookupError, PermissionError):
        # The group is gone (macOS answers EPERM for a group of zombies).
        pass


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
    requested = str(command[0])
    exe = Path(requested).name
    if requested != exe:
        raise CommandNotPermitted("command executable must be a bare executable name")
    if not allowlist:
        # An empty allowlist means no command may run at all, which is how the
        # cycle engine expresses "autonomy does not permit run_command_evaluator".
        # Reporting it as a missing entry would send the reader to the allowlist
        # config when the actual control is the project's autonomy level.
        raise CommandNotPermitted(
            f"no command may run for this project: the allowlist is empty "
            f"(autonomy level does not permit 'run_command_evaluator', "
            f"or the configured command_allowlist is empty); refused '{exe}'"
        )
    if exe not in allowlist:
        raise CommandNotPermitted(
            f"executable '{exe}' is not on this project's allowlist "
            f"(sorted: {sorted(allowlist)})"
        )
    env = {"PATH": _trusted_path(cwd), "LC_ALL": "C"}
    if os.name == "nt":
        for key in ("SYSTEMROOT", "WINDIR", "TEMP", "TMP", "PATHEXT"):
            value = os.environ.get(key)
            if value:
                env[key] = value
    if env_extra:
        forbidden = {"PATH", "PYTHONPATH", "LD_PRELOAD", "LD_LIBRARY_PATH"}
        bad = forbidden.intersection(env_extra)
        if bad:
            raise CommandNotPermitted(
                f"environment override is not permitted for {sorted(bad)}"
            )
        env.update(env_extra)
    # Resolve only from the same restricted PATH passed to the child. This
    # prevents caller-PATH shadowing and keeps the allowlist tied to trusted bins.
    exe_path = shutil.which(exe, path=env["PATH"])
    deadline = time.monotonic() + timeout_seconds
    argv = [exe_path] + [str(c) for c in command[1:]] if exe_path else [str(c) for c in command]
    try:
        proc = subprocess.Popen(
            argv,
            cwd=str(cwd),
            env=env,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            shell=False,  # explicit; never interpolate through a shell
            # Its own process group, so a kill reaches the children it started.
            start_new_session=os.name != "nt",
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
    capture = _capture_threads if os.name == "nt" else _capture_posix
    out, err, too_large, timed_out = capture(proc, deadline)
    if not (too_large or timed_out):
        # Both pipes reached EOF; the command may still run with them closed.
        try:
            proc.wait(timeout=max(deadline - time.monotonic(), 0))
        except subprocess.TimeoutExpired:
            timed_out = True
    if too_large or timed_out:
        _kill(proc)
    for stream in (proc.stdout, proc.stderr):
        if stream is not None:
            stream.close()
    try:
        proc.wait(timeout=KILL_GRACE_SECONDS)
    except subprocess.TimeoutExpired:
        pass
    return CommandResult(
        ok=proc.returncode == 0 and not too_large and not timed_out,
        exit_code=None if timed_out else proc.returncode,
        timed_out=timed_out,
        stdout=out.decode("utf-8", errors="replace")[:MAX_OUTPUT_BYTES],
        stderr=err.decode("utf-8", errors="replace")[:MAX_OUTPUT_BYTES],
        duration_ms=timeout_seconds * 1000 if timed_out else 0,
        command=[str(c) for c in command],
        truncated=too_large or len(out) > MAX_OUTPUT_BYTES or len(err) > MAX_OUTPUT_BYTES,
        output_too_large=too_large,
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
