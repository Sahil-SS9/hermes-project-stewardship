"""Allowlisted command execution for objective evaluators and probes.

Security properties:
- argv list only — never a shell string; `shell=False` always;
- per-project allowlist of executables (exact binary names);
- working directory confined to the project path, a fixed trusted PATH and
  a scrubbed environment; stdin is empty, never the steward's own;
- one deadline per command (60 s by default), and the deadline is the only
  reason a command is stopped. At the deadline, or when the caller is
  interrupted or fails mid-run, the command and what it started are stopped:
  on POSIX its own session's process group (SIGTERM, then SIGKILL after a
  grace period; a second interrupt cuts the SIGTERM grace short, never the
  group kill — a further interrupt can still cut short the final marker
  sweep), then, on Linux and macOS, any process still carrying the run's
  private environment marker (a helper that left the group or outlived its
  parent); on Windows its process tree (`taskkill /T /F`, run from
  System32). A command that finishes within its deadline is not swept, and a
  process that replaces its inherited environment and leaves the group, or
  on Windows one whose parent already exited, can still escape;
- output is read as it is written and only the head and tail of each stream
  are kept (at most MAX_OUTPUT_BYTES), so however much a command writes its
  memory stays flat, and its last line (an objective's measure) survives;
- exit code, kept output and the real duration recorded as evidence.

This mirrors Hermes's own local runner, which plugins may not import (its
module paths are not part of the plugin contract): a 40/60 head/tail window,
no kill for volume, group TERM then KILL, `taskkill /T /F` on Windows, and
cleanup on any exception. Hermes sweeps escaped descendants it can still
reach through their parents; the marker also reaches those whose parent has
already exited.

This is the ONLY sanctioned way stewardship runs commands in a project
context. See docs/threat-model.md §4.
"""

from __future__ import annotations

import ntpath
import os
import secrets
import selectors
import shutil
import signal
import subprocess
import sys
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
# Each run puts a private random value under this name in its command's
# environment. What the command starts inherits it, including a helper that
# leaves the command's process group (setsid) or outlives its parent, so a
# stop on Linux and macOS finds those by it. Callers cannot set it.
_RUN_MARKER = "STEWARD_RUN_MARKER"
_PS_TIMEOUT_SECONDS = 10


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
    deadline passes (True). A read never blocks past the deadline. POSIX
    only: Windows cannot select() on pipes (see _start_readers)."""
    if _IS_WINDOWS:
        raise NotImplementedError("Windows drains pipes with reader threads")
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
    (a dead but unreaped leader keeps ``killpg(pgid, 0)`` succeeding). POSIX
    only: Windows has no process groups to wait on (see _kill)."""
    if _IS_WINDOWS:
        raise NotImplementedError("Windows stops the tree with taskkill")
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


def _kill(proc: subprocess.Popen, *, marker: Optional[str] = None) -> None:
    """Stop the command and what it started. OS errors never escape; an
    interrupt during the stop goes on up only after the kill has been sent.

    Windows: ``taskkill /T /F`` ends the whole tree (see _stop_tree_windows).
    POSIX: the command leads its own session, so its process group is the
    tree (see _stop_group); then any process still carrying the run's
    ``marker`` (``NAME=value``) is killed too (see _stop_marked).
    """
    if _IS_WINDOWS:
        _stop_tree_windows(proc)
        return
    try:
        _stop_group(proc)
    finally:
        if marker is not None:
            _stop_marked(marker)


def _stop_tree_windows(proc: subprocess.Popen) -> None:
    """``taskkill /T /F`` ends the whole tree (``kill()`` ends only the direct
    child); ``kill()`` is the fallback when taskkill is missing, hangs, or the
    command outlives it. taskkill runs from the system directory with a
    minimal environment, never found by search: Windows looks in the
    application's and the current directory before System32, so a planted
    taskkill.exe would run instead."""
    root = os.environ.get("SYSTEMROOT") or os.environ.get("WINDIR") or "C:\\Windows"
    system32 = ntpath.join(root, "System32")
    try:
        subprocess.run(
            [ntpath.join(system32, "taskkill.exe"), "/PID", str(proc.pid), "/T", "/F"],
            stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
            env={"SYSTEMROOT": root, "WINDIR": root, "PATH": system32},
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


def _stop_group(proc: subprocess.Popen) -> None:
    """POSIX: SIGTERM the command's process group, wait out the grace, then
    SIGKILL what is left. Only called while the leader is unreaped, so its
    pid, and the group's id, cannot have been handed to another process."""
    if _IS_WINDOWS:
        raise NotImplementedError("Windows stops the tree with taskkill")
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
    try:
        if _group_gone(proc, pgid, KILL_GRACE_SECONDS):
            return
    except BaseException:
        # Interrupted again (a second Ctrl-C) or failing while the grace runs:
        # the grace is cut short, never the kill.
        with suppress(ProcessLookupError, PermissionError):
            os.killpg(pgid, signal.SIGKILL)
        raise
    with suppress(ProcessLookupError, PermissionError):
        os.killpg(pgid, signal.SIGKILL)
    _group_gone(proc, pgid, _STOP_WAIT_SECONDS)


def _stop_marked(marker: str) -> None:
    """POSIX: SIGKILL every process still carrying this run's marker, i.e.
    what the command started that left its process group (setsid) or
    outlived its parent. Runs after the group stop. Best effort: Linux reads
    /proc, macOS asks ps; a process that replaced its environment is not
    found, and other systems rely on the group stop alone."""
    if _IS_WINDOWS:
        raise NotImplementedError("Windows stops the tree with taskkill")
    needle = marker.encode()
    for pid in _marked(needle):
        _kill_marked(pid, needle)


def _carries(pid: int, needle: bytes) -> bool:
    """Linux: whether process ``pid``'s environment holds ``needle`` exactly."""
    try:
        with open(f"/proc/{pid}/environ", "rb") as handle:
            return needle in handle.read().split(b"\0")
    except OSError:
        return False  # gone, or not ours to read


def _marked(needle: bytes) -> List[int]:
    """Pids, other than ours, whose environment carries ``needle``."""
    me = os.getpid()
    if sys.platform.startswith("linux"):
        try:
            names = os.listdir("/proc")
        except OSError:
            return []
        return [int(name) for name in names
                if name.isdigit() and int(name) != me and _carries(int(name), needle)]
    if sys.platform == "darwin":
        # No /proc: ps -E prints each process's launch environment after its
        # command, as space-separated NAME=value words.
        try:
            listing = subprocess.run(
                ["/bin/ps", "-A", "-E", "-ww", "-o", "pid=", "-o", "command="],
                stdin=subprocess.DEVNULL, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL,
                timeout=_PS_TIMEOUT_SECONDS, check=False,
            ).stdout
        except (OSError, subprocess.TimeoutExpired):
            return []
        found = []
        for line in listing.splitlines():
            pid_text, _, rest = line.strip().partition(b" ")
            if pid_text.isdigit() and int(pid_text) != me and needle in rest.split():
                found.append(int(pid_text))
        return found
    return []


def _kill_marked(pid: int, needle: bytes) -> None:
    """SIGKILL a marked process. Linux goes through a pidfd and re-checks the
    marker on the process the fd holds, so a reused pid is never signalled;
    elsewhere the pid is signalled directly, moments after it was listed."""
    if _IS_WINDOWS:
        raise NotImplementedError("Windows stops the tree with taskkill")
    pidfd_open = getattr(os, "pidfd_open", None)
    send_signal = getattr(signal, "pidfd_send_signal", None)
    if pidfd_open is None or send_signal is None:
        with suppress(OSError):
            os.kill(pid, signal.SIGKILL)
        return
    try:
        fd = pidfd_open(pid)
    except ProcessLookupError:
        return  # already gone
    except OSError:  # a kernel without pidfds
        with suppress(OSError):
            os.kill(pid, signal.SIGKILL)
        return
    try:
        if _carries(pid, needle):
            send_signal(fd, signal.SIGKILL)
    except OSError:
        pass
    finally:
        os.close(fd)


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
            f"(autonomy level does not permit 'run_command_evaluator', the "
            f"threat-model §6 builder acknowledgements are missing, "
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
        forbidden = {"PATH", "PYTHONPATH", "LD_PRELOAD", "LD_LIBRARY_PATH", _RUN_MARKER}
        bad = forbidden.intersection(env_extra)
        if bad:
            raise CommandNotPermitted(
                f"environment override is not permitted for {sorted(bad)}"
            )
        env.update(env_extra)
    env[_RUN_MARKER] = secrets.token_hex(16)
    marker = f"{_RUN_MARKER}={env[_RUN_MARKER]}"
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
            _kill(proc, marker=marker)
    except BaseException:
        # Ctrl-C or any failure mid-run: its own session kept the terminal's
        # SIGINT from the command, so stop it here before the error goes on.
        if proc.returncode is None:
            _kill(proc, marker=marker)
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
