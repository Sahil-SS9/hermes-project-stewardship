#!/usr/bin/env python3
"""Run pip-audit with this project's single documented exception.

filelock's patched releases (4.2.1 and later) need Python 3.11, but this
project still supports 3.10. Every filelock that installs on 3.10 carries two
advisories, so 3.10 keeps the 3.20.3 line (the fewest advisories) and ignores
exactly those two, on 3.10 only. filelock is dev tooling (pip-audit's own
cache) and is not part of the installed plugin. Every other advisory, on every
Python version, still fails the audit.

CI and scripts/local-ci.sh both call this file, so the exception lives in one
place. Delete PYTHON_310_ONLY_IGNORES when the minimum Python becomes 3.11.
"""
from __future__ import annotations

import subprocess
import sys

PYTHON_310_ONLY_IGNORES = ("CVE-2026-112909", "CVE-2026-112910")


def audit_command(version_info=sys.version_info, extra=()):
    command = [sys.executable, "-m", "pip_audit"]
    if tuple(version_info[:2]) < (3, 11):
        for advisory in PYTHON_310_ONLY_IGNORES:
            command += ["--ignore-vuln", advisory]
    return command + list(extra)


if __name__ == "__main__":
    command = audit_command(extra=sys.argv[1:])
    if "--ignore-vuln" in command:
        print(
            "pip-audit: ignoring " + ", ".join(PYTHON_310_ONLY_IGNORES)
            + " on Python 3.10 only (see scripts/audit_python.py)",
            file=sys.stderr,
        )
    raise SystemExit(subprocess.call(command))
