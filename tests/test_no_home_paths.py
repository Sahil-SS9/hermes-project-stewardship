"""No file in the repository names a personal home folder.

A maintainer's machine path (a home folder: /home/<user>/...) exposes private
machine layout and works for nobody else. Code and scripts take locations from
settings; docs and examples use ``~/`` or a ``<path>`` placeholder.

09/10 (0.4.0): the owner decided that old internal working notes holding such
paths leave the repository (kept in the maintainer's private archive), and the
prototypes, mockups and tests that stay use neutral example paths. This test
keeps new ones out.
"""

from __future__ import annotations

import re
import shutil
import subprocess
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
HOME_FOLDER = re.compile(rb"/home/[A-Za-z0-9._-]+/")


def _repository_files() -> list[str]:
    if shutil.which("git") is None:
        pytest.skip("git is not installed: the repository's file list is unavailable")
    listed = subprocess.run(["git", "ls-files", "-z"], cwd=ROOT, capture_output=True)
    if listed.returncode != 0:
        pytest.skip("not a git checkout: the repository's file list is unavailable")
    return [name for name in listed.stdout.decode("utf-8").split("\0") if name]


def test_no_repository_file_names_a_home_folder():
    offenders = []
    for name in _repository_files():
        path = ROOT / name
        if not path.is_file():  # deleted in the working tree, or not a regular file
            continue
        data = path.read_bytes()
        if not HOME_FOLDER.search(data):
            continue
        for number, line in enumerate(data.split(b"\n"), 1):
            if HOME_FOLDER.search(line):
                offenders.append(f"{name}:{number}")
    assert offenders == [], (
        f"{len(offenders)} line(s) name a home folder; use ~/, a <path> placeholder "
        "or a setting instead: " + ", ".join(offenders[:80])
    )
