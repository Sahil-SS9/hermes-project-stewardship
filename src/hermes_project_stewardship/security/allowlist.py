"""Allowlisted command execution for objective evaluators and probes.

Security properties:
- argv list only — never a shell string; `shell=False` always;
- per-project allowlist of executables (exact binary names);
- working directory confined to the project path, a fixed trusted PATH and
  a scrubbed environment; stdin is empty, never the steward's own;
- one deadline per command (60 s by default), and the deadline is the only
  reason a command is stopped. At the deadline, or when the caller is
  interrupted or fails mid-run, the command and everything it started are
  stopped: on POSIX its own session's process group (SIGTERM, then SIGKILL
  after a grace period), on Windows its process tree (`taskkill /T /F`);
- output is read as it is written and only the head and tail of each stream
  are kept (at most MAX_OUTPUT_BYTES), so however much a command writes its
  memory stays flat, and its last line (an objective's measure) survives;
- exit code, kept output and the real duration recorded as evidence.

This mirrors Hermes's own local runner, which plugins may not import (its
module paths are not part of the plugin contract): a 40/60 head/tail window,
no kill for volume, group TERM then KILL, `taskkill /T /F` on Windows, and
cleanup on any exception.

This is the ONLY sanctioned way stewardship runs commands in a project
context. See docs/threat-model.md §4.
"""

from __future__ import annotations

import os
import selectors
import shutil
import signal
import subprocess
import threading
import time
from contextlib import suppress
from dataclasses import dataclass
from pathlib import Path
from typing import IO, Dict, FrozenSet, List, Optional, Sequence, Tuple

# Most text kept per stream: its first and last bytes, with the omitted middle
# marked. The returned text never exceeds this.
MAX_OUTPUT_BYTES = 64 * 1024
DEFAULT_TIMEOUT_SECONDS = 60
# POSIX: SIGTERM, then SIGKILL for what is left after this grace period.
KILL_GRACE_SECONDS = 1.0
# Bounded waits after a stop: the tree to go, the pipes to close.
_STOP_WAIT_SECONDS = 2.0
_TASKKILL_TIMEOUT_SECONDS = 10
_READ_CHUNK = 64 * 1024
_HEAD_SHARE = 0.4  # Hermes keeps 40 % head, 60 % tail
_TRUNCATION_MARKER = "\n[... output truncated: the middle was not kept ...]\n"
_IS_WINDOWS = os.name == "nt"
# subprocess.CREATE_NO_WINDOW, which only Windows builds of Python define: no
# console window flashes up for a check, or for taskkill.
_CREATE_NO_WINDOW = 0x08000000


class CommandNotPermitted(Exception):
    pass


def _trusted_path(cwd: Path) -> str:
    if not _IS_WINDOWS:
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
    ok: bool                 # exit code 0, within the deadline
    exit_code: Optional[int]
    timed_out: bool
    stdout: str
    stderr: str
    duration_ms: int         # wall time from start until it ended or was stopped
    command: List[str]
    truncated: bool = False  # some output was not kept (see MAX_OUTPUT_BYTES)


class _HeadTail:
    """The first and last bytes of one stream within a fixed budget."""

    _budget = MAX_OUTPUT_BYTES - len(_TRUNCATION_MARKER.encode("utf-8"))

    def __init__(self) -> None:
        self._head_limit = int(self._budget * _HEAD_SHARE)
        self._tail_limit = self._budget - self._head_limit
        self._head = bytearray()
        self._tail = bytearray()
        self._total = 0
        self._lock = threading.Lock()  # Windows reader threads add concurrently

    def add(self, chunk: bytes) -> None:
        with self._lock:
            self._total += len(chunk)
            room = self._head_limit - len(self._head)
            if room > 0:
                self._head += chunk[:room]
                chunk = chunk[room:]
            if chunk:
                self._tail += chunk
                excess = len(self._tail) - self._tail_limit
                if excess > 0:
                    del self._tail[:excess]

    @property
    def truncated(self) -> bool:
        with self._lock:
            return self._total > len(self._head) + len(self._tail)

    def text(self) -> str:
        with self._lock:
            if self._total <= len(self._head) + len(self._tail):
                return (self._head + self._tail).decode("utf-8", errors="replace")
            # Each part decodes on its own: a character cut at either edge of
            # the omitted middle reads as U+FFFD, never as a wrong one.
            return (self._head.decode("utf-8", errors="replace") + _TRUNCATION_MARKER
                    + self._tail.decode("utf-8", errors="replace"))


_Reader = Tuple[threading.Thread, IO[bytes]]


def _drain_posix(proc: subprocess.Popen, sinks: Sequence[_HeadTail], deadline: float) -> bool:
    """Read both pipes into their windows until both reach EOF, or the
    deadline passes (True). A read never blocks past the deadline."""
    selector = selectors.DefaultSelector()
    with selector:
        for stream, sink in zip((proc.stdout, proc.stderr), sinks):
            assert stream is not None  # both pipes are requested
            os.set_blocking(stream.fileno(), False)
            selector.register(stream, selectors.EVENT_READ, sink)
        while selector.get_map():
            remaining = deadline - time.monotonic()
            if remaining <= 0:
                return True
            for key, _ in selector.select(remaining):
                try:
                    chunk = os.read(key.fd, _READ_CHUNK)
                except BlockingIOError:
                    continue
                if chunk:
                    key.data.add(chunk)
                else:
                    selector.unregister(key.fileobj)
    return False


def _start_readers(proc: subprocess.Popen, sinks: Sequence[_HeadTail]) -> List[_Reader]:
    """Windows cannot select() on pipes: one daemon reader per stream. Each
    closes its own pipe at EOF, because closing a pipe while another thread
    is reading it blocks."""

    def pump(stream: IO[bytes], sink: _HeadTail) -> None:
        try:
            while chunk := stream.read1(_READ_CHUNK):  # type: ignore[attr-defined]
                sink.add(chunk)
        except (OSError, ValueError):
            pass  # the pipe broke: there is nothing more to read
        finally:
            with suppress(OSError):
                stream.close()

    readers: List[_Reader] = []
    for stream, sink in zip((proc.stdout, proc.stderr), sinks):
        assert stream is not None  # both pipes are requested
        reader = threading.Thread(target=pump, args=(stream, sink), daemon=True)
        reader.start()
        readers.append((reader, stream))
    return readers


def _join_until(readers: Sequence[_Reader], deadline: float) -> bool:
    """Wait for the readers to reach EOF, or the deadline to pass (True), in
    short steps: an interrupt is then handled at once (a long join cannot be
    interrupted on Windows)."""
    for reader, _ in readers:
        while reader.is_alive():
            remaining = deadline - time.monotonic()
            if remaining <= 0:
                return True
            reader.join(min(remaining, 0.05))
    return False


def _group_gone(proc: subprocess.Popen, pgid: int, timeout: float) -> bool:
    """Wait until the process group is gone, reaping the leader as it exits
    (a dead but unreaped leader keeps ``killpg(pgid, 0)`` succeeding)."""
    deadline = time.monotonic() + timeout
    while True:
        proc.poll()
        try:
            os.killpg(pgid, 0)
        except ProcessLookupError:
            return True
        except PermissionError:
            pass  # still there (macOS: only zombies), just not signalable
        if time.monotonic() >= deadline:
            return False
        time.sleep(0.05)


def _kill(proc: subprocess.Popen) -> None:
    """Stop the command and everything it started; never raises.

    Windows: ``taskkill /T /F`` ends the whole tree (``kill()`` ends only the
    direct child); ``kill()`` is the fallback when taskkill is missing, hangs,
    or the command outlives it. POSIX: the command leads its own session, so
    its process group is the tree: SIGTERM, wait for the group to go, then
    SIGKILL. Only called while the leader is unreaped, so its pid, and the
    group's id, cannot have been handed to another process.
    """
    if _IS_WINDOWS:
        try:
            subprocess.run(
                ["taskkill", "/PID", str(proc.pid), "/T", "/F"],
                stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
                timeout=_TASKKILL_TIMEOUT_SECONDS, check=False, creationflags=_CREATE_NO_WINDOW,
            )
        except (OSError, subprocess.TimeoutExpired):
            with suppress(OSError):
                proc.kill()
            return
        try:
            proc.wait(timeout=KILL_GRACE_SECONDS)
        except subprocess.TimeoutExpired:
            with suppress(OSError):
                proc.kill()
        return
    pgid = proc.pid
    try:
        os.killpg(pgid, signal.SIGTERM)
    except ProcessLookupError:
        return  # the whole group is already gone
    except PermissionError:
        # macOS answers EPERM once only zombies are left: nothing group-wide
        # can be signalled. Signal the leader itself.
        with suppress(OSError):
            proc.kill()
        return
    if _group_gone(proc, pgid, KILL_GRACE_SECONDS):
        return
    with suppress(ProcessLookupError, PermissionError):
        os.killpg(pgid, signal.SIGKILL)
    _group_gone(proc, pgid, _STOP_WAIT_SECONDS)


def _release(proc: subprocess.Popen, readers: Sequence[_Reader]) -> None:
    """Close the pipes and reap the command, with bounded waits only. A pipe
    a Windows reader is still blocked on is left to that reader."""
    stop_by = time.monotonic() + _STOP_WAIT_SECONDS
    for reader, _ in readers:
        reader.join(max(stop_by - time.monotonic(), 0))
    reading = {id(stream) for reader, stream in readers if reader.is_alive()}
    for stream in (proc.stdout, proc.stderr):
        if stream is not None and id(stream) not in reading:
            stream.close()
    with suppress(subprocess.TimeoutExpired):
        proc.wait(timeout=max(stop_by - time.monotonic(), 0))


def _elapsed_ms(started: float) -> int:
    return int((time.monotonic() - started) * 1000)


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
    if _IS_WINDOWS:
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
    argv = [exe_path] + [str(c) for c in command[1:]] if exe_path else [str(c) for c in command]
    started = time.monotonic()
    deadline = started + timeout_seconds
    try:
        proc = subprocess.Popen(
            argv,
            cwd=str(cwd),
            env=env,
            stdin=subprocess.DEVNULL,  # never the steward's own stdin or terminal
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            shell=False,  # explicit; never interpolate through a shell
            # POSIX: its own session and process group, so a stop reaches all
            # it started. Windows: no console window.
            start_new_session=not _IS_WINDOWS,
            creationflags=_CREATE_NO_WINDOW if _IS_WINDOWS else 0,
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
            duration_ms=_elapsed_ms(started),
            command=[str(c) for c in command],
            truncated=False,
        )
    out, err = _HeadTail(), _HeadTail()
    readers: List[_Reader] = []
    timed_out = False
    try:
        if _IS_WINDOWS:
            readers = _start_readers(proc, (out, err))
            timed_out = _join_until(readers, deadline)
        else:
            timed_out = _drain_posix(proc, (out, err), deadline)
        if not timed_out:
            # Both pipes reached EOF; the command may still run with them closed.
            try:
                proc.wait(timeout=max(deadline - time.monotonic(), 0))
            except subprocess.TimeoutExpired:
                timed_out = True
        if timed_out:
            _kill(proc)
    except BaseException:
        # Ctrl-C or any failure mid-run: its own session kept the terminal's
        # SIGINT from the command, so stop it here before the error goes on.
        if proc.returncode is None:
            _kill(proc)
        raise
    finally:
        _release(proc, readers)
    return CommandResult(
        ok=proc.returncode == 0 and not timed_out,
        exit_code=None if timed_out else proc.returncode,
        timed_out=timed_out,
        stdout=out.text(),
        stderr=err.text(),
        duration_ms=_elapsed_ms(started),
        command=[str(c) for c in command],
        truncated=out.truncated or err.truncated,
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
