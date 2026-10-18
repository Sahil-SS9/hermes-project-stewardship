"""Security-boundary tests for run_allowlisted (security/allowlist.py).

These pin the documented threat-model properties: restricted trusted PATH,
no shell interpolation, forbidden environment overrides refused, the
deadline as the only kill, the whole process tree stopped at the deadline or
on an interrupt, bounded output memory, real durations, and fail-closed
missing binaries.

Windows-specific branches are exercised where the interpreter can execute
them; the Windows stop path is also driven on POSIX through the module's
platform flag with a fake process, and end to end on the real Windows lane.
"""
from __future__ import annotations

import os
import signal
import subprocess
import sys
import threading
import time
from pathlib import Path

import pytest

from hermes_project_stewardship.security.allowlist import (
    MAX_OUTPUT_BYTES,
    CommandNotPermitted,
    _trusted_path,
    run_allowlisted,
)

# A process id no system hands out (Linux caps pid_max at 2**22, macOS at
# 99999): the stop-path tests below fake a process, and if a branch ever
# signalled this id for real it would reach nothing.
_UNREACHABLE_PID = 2**30


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


def test_timeout_returns_timed_out_result_not_exception(tmp_path):
    result = run_allowlisted(
        ["python3", "-c", "import sys, time; print('partial', flush=True); time.sleep(30)"],
        cwd=tmp_path,
        allowlist=frozenset({"python3"}),
        timeout_seconds=1,
    )
    assert result.ok is False
    assert result.timed_out is True
    assert result.exit_code is None
    # The time it really took (the deadline plus the stop), not a stand-in.
    assert 1000 <= result.duration_ms < 1000 + 3000
    assert "partial" in result.stdout


def test_duration_is_measured_for_a_command_that_finishes(tmp_path):
    """Every run records how long it took; a finished check used to read 0."""
    result = run_allowlisted(
        ["python3", "-c", "import time; time.sleep(0.3)"],
        cwd=tmp_path,
        allowlist=frozenset({"python3"}),
    )
    assert result.ok is True
    assert 300 <= result.duration_ms < 300 + 5000


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
    # The child builds the oversized line itself: a 64 KiB literal in argv
    # exceeds Windows' 32,767-character command-line limit.
    result = run_allowlisted(
        [exe, "-c", f"print('x' * {MAX_OUTPUT_BYTES + 10})"],
        cwd=tmp_path,
        allowlist=frozenset({exe}),
    )
    assert result.ok is True
    assert len(result.stdout) <= MAX_OUTPUT_BYTES
    assert result.truncated is True


@pytest.mark.parametrize("stream", ["stdout", "stderr"])
def test_verbose_command_that_succeeds_passes_and_keeps_both_ends(tmp_path, stream):
    """`pytest -v` or `cargo test` on a big repo: well past the kept window
    the output is still read, the run is not killed for volume, and the first
    and last lines survive (an objective's measure is its last line)."""
    script = (
        "import sys\n"
        f"out = sys.{stream}\n"
        "out.write('FIRST-LINE\\n')\n"
        "for _ in range(50000): out.write('progress line that keeps going\\n')\n"
        "out.write('LAST-LINE\\n')\n"
    )
    result = run_allowlisted(["python3", "-c", script], cwd=tmp_path,
                             allowlist=frozenset({"python3"}))
    text = getattr(result, stream)
    assert result.ok is True and result.exit_code == 0 and result.timed_out is False
    assert result.truncated is True
    assert text.startswith("FIRST-LINE")
    assert text.rstrip().endswith("LAST-LINE")
    assert len(text) <= MAX_OUTPUT_BYTES


@pytest.mark.parametrize("stream", ["stdout", "stderr"])
def test_output_flood_is_drained_until_the_deadline_not_killed_for_volume(tmp_path, stream):
    """A command that never stops writing runs until its deadline, like any
    other command, and only the kept window of its output is returned."""
    started = time.monotonic()
    result = run_allowlisted(
        ["python3", "-c", f"import sys\nwhile True: sys.{stream}.write('x' * 65536)"],
        cwd=tmp_path,
        allowlist=frozenset({"python3"}),
        timeout_seconds=2,
    )
    assert time.monotonic() - started < 2 + 3
    assert result.timed_out is True and result.ok is False and result.exit_code is None
    assert result.truncated is True
    assert len(getattr(result, stream)) <= MAX_OUTPUT_BYTES


def test_output_flood_keeps_the_runner_memory_flat(tmp_path):
    """Draining a flood for the whole deadline must not buffer it: 0.5.2 grew
    by about 4 GB per second here. The runner runs in a fresh interpreter (with
    its address space capped where the platform allows) and reports how much
    its own peak memory grew while it drained the flood.

    Growth, not the absolute peak: an interpreter's size depends on the Python
    version and on coverage, and on Linux ``ru_maxrss`` also carries the
    parent's peak across fork and exec (a full pytest run with coverage read
    as 205 MB here). ``VmHWM`` is the peak of the process's own image, so it is
    used where the platform has it."""
    pytest.importorskip("resource")
    import hermes_project_stewardship

    package_root = str(Path(hermes_project_stewardship.__file__).resolve().parents[1])
    probe = (
        "import resource, sys\n"
        "from pathlib import Path\n"
        "try:\n"
        "    resource.setrlimit(resource.RLIMIT_AS, (1 << 30, resource.RLIM_INFINITY))\n"
        "except (ValueError, OSError):\n"
        "    pass  # macOS does not enforce an address-space cap\n"
        "def peak_kib():\n"
        "    try:\n"
        "        with open('/proc/self/status') as status:\n"
        "            for line in status:\n"
        "                if line.startswith('VmHWM:'):\n"
        "                    return int(line.split()[1])\n"
        "    except OSError:\n"
        "        pass  # no procfs (macOS): the rusage peak, in bytes there\n"
        "    peak = resource.getrusage(resource.RUSAGE_SELF).ru_maxrss\n"
        "    return peak // 1024 if sys.platform == 'darwin' else peak\n"
        "from hermes_project_stewardship.security.allowlist import run_allowlisted\n"
        "before = peak_kib()\n"
        "flood = \"import sys\\nwhile True: sys.stdout.write('x' * 65536)\"\n"
        "run_allowlisted(['python3', '-c', flood], cwd=Path(sys.argv[1]),\n"
        "                allowlist=frozenset({'python3'}), timeout_seconds=2)\n"
        "print(before, peak_kib())\n"
    )
    done = subprocess.run(
        [sys.executable, "-c", probe, str(tmp_path)],
        capture_output=True, text=True, timeout=60,
        env={**os.environ, "PYTHONPATH": package_root},
    )
    assert done.returncode == 0, done.stderr[-2000:]
    before, after = (int(value) for value in done.stdout.split()[-2:])
    growth_mb = (after - before) / 1024
    assert growth_mb < 32, f"runner peak grew by {growth_mb:.0f} MB while draining a flood"


def test_command_never_reads_the_callers_stdin(tmp_path):
    """Like Hermes's runner, a check gets an empty stdin: it can neither read
    the operator's terminal nor wait on an input the steward holds open. The
    runner runs in a fresh interpreter whose own stdin is a pipe kept open."""
    import hermes_project_stewardship

    package_root = str(Path(hermes_project_stewardship.__file__).resolve().parents[1])
    probe = (
        "import sys\n"
        "from pathlib import Path\n"
        "from hermes_project_stewardship.security.allowlist import run_allowlisted\n"
        "r = run_allowlisted(['python3', '-c', 'import sys; print(len(sys.stdin.read()))'],\n"
        "                    cwd=Path(sys.argv[1]), allowlist=frozenset({'python3'}),\n"
        "                    timeout_seconds=5)\n"
        "print(r.timed_out, r.ok, r.stdout.strip())\n"
    )
    holder = subprocess.Popen(
        [sys.executable, "-c", probe, str(tmp_path)],
        stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True,
        env={**os.environ, "PYTHONPATH": package_root},
    )
    try:
        holder.wait(timeout=60)  # never written to or closed while the probe runs
        out, err = holder.stdout.read(), holder.stderr.read()  # type: ignore[union-attr]
    finally:
        if holder.poll() is None:
            holder.kill()
            holder.wait()
        for stream in (holder.stdin, holder.stdout, holder.stderr):
            if stream is not None:
                stream.close()
    assert holder.returncode == 0, err[-2000:]
    assert out.split() == ["False", "True", "0"]


def _timed(command, tmp_path, timeout_seconds=2):
    started = time.monotonic()
    result = run_allowlisted(command, cwd=tmp_path, allowlist=frozenset({"python3"}),
                             timeout_seconds=timeout_seconds)
    return result, time.monotonic() - started


def _spawns_a_grandchild(marker: Path, *, then: str) -> str:
    """argv[2] for a child that starts a grandchild which, unless stopped,
    touches ``marker`` after 4 s; the child then runs ``then``."""
    grandchild = f"import time, pathlib; time.sleep(4); pathlib.Path({str(marker)!r}).touch()"
    return ("import pathlib, subprocess, sys, time\n"
            f"subprocess.Popen([sys.executable, '-c', {grandchild!r}])\n"
            "print('started', flush=True)\n" + then)


@pytest.mark.skipif(os.name == "nt", reason="a Windows grandchild does not inherit the pipe "
                    "here; test_timeout_stops_the_commands_children_too covers Windows")
def test_grandchild_holding_stdout_is_killed_at_the_deadline(tmp_path):
    """The child exits at once but leaves a grandchild with its stdout open:
    the read must not wait for that pipe past the deadline, and the kill
    must reach the grandchild through the process group."""
    marker = tmp_path / "grandchild-survived"
    grandchild = f"import time, pathlib; time.sleep(6); pathlib.Path({str(marker)!r}).touch()"
    result, elapsed = _timed(
        ["python3", "-c", f"import subprocess, sys; subprocess.Popen([sys.executable, '-c', {grandchild!r}]);"
                          " print('started', flush=True)"], tmp_path)
    assert result.timed_out is True and result.ok is False
    assert "started" in result.stdout
    assert elapsed < 2 + 3
    time.sleep(6)
    assert not marker.exists()


def test_timeout_stops_the_commands_children_too(tmp_path):
    """At the deadline the whole tree stops, not only the direct child: a
    process group on POSIX, `taskkill /T` on Windows."""
    marker = tmp_path / "grandchild-survived"
    result, elapsed = _timed(
        ["python3", "-c", _spawns_a_grandchild(marker, then="time.sleep(30)\n")],
        tmp_path, timeout_seconds=3)
    assert result.timed_out is True and result.ok is False
    assert "started" in result.stdout
    assert elapsed < 3 + 3
    time.sleep(5)
    assert not marker.exists()


@pytest.mark.skipif(os.name == "nt", reason="closing the standard streams is POSIX here")
def test_command_that_closes_its_output_is_still_bound_by_the_deadline(tmp_path):
    result, elapsed = _timed(
        ["python3", "-c", "import os, time; os.close(1); os.close(2); time.sleep(30)"], tmp_path)
    assert result.timed_out is True and result.exit_code is None
    assert elapsed < 2 + 3


def _interrupt_main_thread_after(seconds: float) -> threading.Timer:
    """Deliver what Ctrl-C delivers to the main thread: a real SIGINT where
    POSIX can target the thread, the simulated one Windows offers otherwise."""
    main = threading.main_thread().ident
    assert main is not None
    if hasattr(signal, "pthread_kill"):
        def fire():
            signal.pthread_kill(main, signal.SIGINT)
    else:  # pragma: no cover — windows lane
        import _thread

        fire = _thread.interrupt_main
    timer = threading.Timer(seconds, fire)
    timer.start()
    return timer


def test_interrupt_mid_run_stops_the_command_and_its_children(tmp_path):
    """Ctrl-C while a check runs: the command has its own session, so the
    terminal's SIGINT never reaches it. The runner must stop it, and what it
    started, before the interrupt goes on up."""
    child_marker = tmp_path / "child-survived"
    grandchild_marker = tmp_path / "grandchild-survived"
    child = _spawns_a_grandchild(
        grandchild_marker,
        then=f"time.sleep(4); pathlib.Path({str(child_marker)!r}).touch()\n")
    timer = _interrupt_main_thread_after(1.5)
    started = time.monotonic()
    try:
        with pytest.raises(KeyboardInterrupt):
            run_allowlisted(["python3", "-c", child], cwd=tmp_path,
                            allowlist=frozenset({"python3"}), timeout_seconds=30)
    finally:
        timer.cancel()
    assert time.monotonic() - started < 1.5 + 3
    time.sleep(5)
    assert not child_marker.exists()
    assert not grandchild_marker.exists()


@pytest.mark.skipif(os.name == "nt", reason="sessions are POSIX; Windows stops the tree with taskkill")
def test_a_helper_that_leaves_the_process_group_is_stopped_too(tmp_path):
    """Independent review F1 (18/10/2026): the command starts a helper that
    calls setsid() (a session and process group of its own) and exits, and
    the helper keeps the pipes open. The group kill at the deadline cannot
    reach it; the private marker each run puts in its command's environment,
    which the helper inherits, does."""
    marker = tmp_path / "helper-survived"
    helper = ("import os, pathlib, time; os.setsid(); time.sleep(6); "
              f"pathlib.Path({str(marker)!r}).touch()")
    result, elapsed = _timed(
        ["python3", "-c", f"import subprocess, sys; subprocess.Popen([sys.executable, '-c', {helper!r}]);"
                          " print('started', flush=True)"], tmp_path)
    assert result.timed_out is True and result.ok is False
    assert "started" in result.stdout
    assert elapsed < 2 + 3
    time.sleep(6)
    assert not marker.exists()


@pytest.mark.skipif(os.name == "nt", reason="the marker sweep is POSIX")
def test_a_stop_spares_processes_that_do_not_carry_this_runs_marker(tmp_path):
    """The sweep kills only what this run started: a process outside the
    run keeps running, and so does one carrying another run's marker."""
    other_run = dict(os.environ, STEWARD_RUN_MARKER="another-run")
    bystanders = [
        subprocess.Popen([sys.executable, "-c", "import time; time.sleep(30)"]),
        subprocess.Popen([sys.executable, "-c", "import time; time.sleep(30)"], env=other_run),
    ]
    try:
        result, _ = _timed(["python3", "-c", "import time; time.sleep(30)"], tmp_path, timeout_seconds=1)
        assert result.timed_out is True
        assert [bystander.poll() for bystander in bystanders] == [None, None]
    finally:
        for bystander in bystanders:
            bystander.kill()
            bystander.wait()


def test_each_run_has_its_own_marker_that_callers_cannot_set(tmp_path):
    """The marker a stop relies on is private to one run: two runs see
    different values, the steward's own environment never carries it, and a
    caller cannot set or replace it."""
    probe = ["python3", "-c", "import os; print(os.environ.get('STEWARD_RUN_MARKER', ''))"]
    seen = [run_allowlisted(probe, cwd=tmp_path, allowlist=frozenset({"python3"})).stdout.strip()
            for _ in range(2)]
    assert all(len(value) >= 32 for value in seen) and seen[0] != seen[1]
    assert "STEWARD_RUN_MARKER" not in os.environ
    with pytest.raises(CommandNotPermitted, match="not permitted"):
        run_allowlisted(probe, cwd=tmp_path, allowlist=frozenset({"python3"}),
                        env_extra={"STEWARD_RUN_MARKER": "chosen-by-the-caller"})


@pytest.mark.skipif(os.name == "nt", reason="process groups are POSIX")
def test_a_second_interrupt_during_the_stop_never_skips_the_kill(tmp_path, monkeypatch):
    """Independent review F2 (18/10/2026): Ctrl-C again while the runner
    waits out the SIGTERM grace cuts the grace short, never the kill. The
    command ignores SIGTERM, and every grace wait is interrupted."""
    from hermes_project_stewardship.security import allowlist

    marker = tmp_path / "survived"
    child = ("import pathlib, signal, time; signal.signal(signal.SIGTERM, signal.SIG_IGN); "
             f"time.sleep(5); pathlib.Path({str(marker)!r}).touch()")

    def interrupted_grace(proc, pgid, timeout):
        raise KeyboardInterrupt

    monkeypatch.setattr(allowlist, "_group_gone", interrupted_grace)
    with pytest.raises(KeyboardInterrupt):
        run_allowlisted(["python3", "-c", child], cwd=tmp_path,
                        allowlist=frozenset({"python3"}), timeout_seconds=1)
    time.sleep(5)
    assert not marker.exists()


class _FakeProc:
    """Stands in for a Popen whose process ignores everything but `kill()`
    when ``stubborn``; signalling its pid for real would reach nothing."""

    def __init__(self, *, stubborn: bool = False):
        self.pid = _UNREACHABLE_PID
        self.returncode = None
        self.killed = False
        self._stubborn = stubborn

    def kill(self):
        self.killed = True

    def poll(self):
        return self.returncode

    def wait(self, timeout=None):
        if self._stubborn and not self.killed:
            raise subprocess.TimeoutExpired("fake", timeout or 0)
        self.returncode = 1
        return 1


def _windows_stop(monkeypatch, proc, run):
    from hermes_project_stewardship.security import allowlist

    monkeypatch.setattr(allowlist, "_IS_WINDOWS", True, raising=False)
    monkeypatch.setattr(allowlist.subprocess, "run", run)
    allowlist._kill(proc)  # type: ignore[arg-type]


def test_windows_stop_ends_the_whole_tree_with_taskkill_from_system32(monkeypatch):
    """`taskkill /T /F` ends the tree. It runs from the system directory with
    a minimal environment, never found by search: Windows looks in the
    application's and the current directory before System32, so a planted
    taskkill.exe would run instead (independent review F3, 18/10/2026)."""
    calls = []

    def run(argv, **kwargs):
        calls.append((argv, kwargs))
        return subprocess.CompletedProcess(argv, 0)

    monkeypatch.setenv("SYSTEMROOT", "C:\\Windows")
    monkeypatch.setenv("STEW_STEWARD_ONLY", "not for taskkill")
    proc = _FakeProc()
    _windows_stop(monkeypatch, proc, run)
    assert [argv for argv, _ in calls] == [
        ["C:\\Windows\\System32\\taskkill.exe", "/PID", str(_UNREACHABLE_PID), "/T", "/F"]]
    kwargs = calls[0][1]
    assert kwargs["creationflags"] == 0x08000000  # CREATE_NO_WINDOW: no console flash
    assert kwargs["stdin"] is subprocess.DEVNULL and kwargs["timeout"] > 0
    assert kwargs.get("env") is not None and "STEW_STEWARD_ONLY" not in kwargs["env"]
    assert proc.killed is False  # taskkill did it; the fallback stayed unused


@pytest.mark.parametrize("failure", [FileNotFoundError("taskkill"), subprocess.TimeoutExpired("taskkill", 10)])
def test_windows_stop_falls_back_to_kill_when_taskkill_fails(monkeypatch, failure):
    def run(argv, **kwargs):
        raise failure

    proc = _FakeProc()
    _windows_stop(monkeypatch, proc, run)
    assert proc.killed is True


def test_windows_stop_kills_a_process_that_outlives_taskkill(monkeypatch):
    proc = _FakeProc(stubborn=True)
    _windows_stop(monkeypatch, proc, lambda argv, **kwargs: subprocess.CompletedProcess(argv, 128))
    assert proc.killed is True


@pytest.mark.skipif(os.name == "nt", reason="process groups are POSIX")
def test_posix_stop_survives_macos_eperm_on_a_zombie_group(monkeypatch):
    """macOS answers killpg with EPERM once only zombies are left: the stop
    must not raise, and still kills the leader directly."""
    from hermes_project_stewardship.security import allowlist

    def killpg(pgid, sig):
        raise PermissionError(1, "Operation not permitted")

    monkeypatch.setattr(allowlist.os, "killpg", killpg)
    proc = _FakeProc()
    allowlist._kill(proc)  # type: ignore[arg-type]
    assert proc.killed is True


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
