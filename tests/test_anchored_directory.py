"""The anchored directory used by managed-content removal (persistence/anchored.py).

Each test runs on every platform: POSIX takes the descriptor path, Windows
the pinned-handle path. Where the two differ by design (a moved directory is
followed on POSIX, refused on Windows) the test says which it expects.
"""
from __future__ import annotations

import os
import stat
from pathlib import Path
from types import SimpleNamespace

import pytest

from hermes_project_stewardship.persistence.anchored import is_link, open_anchored


def _symlink_or_skip(link: Path, target: Path, *, directory: bool) -> None:
    try:
        link.symlink_to(target, target_is_directory=directory)
    except OSError as exc:  # pragma: no cover — Windows without symlink rights
        pytest.skip(f"cannot create symlinks here: {exc}")


@pytest.fixture()
def tree(tmp_path: Path) -> Path:
    root = tmp_path / "root"
    (root / "a" / "b").mkdir(parents=True)
    (root / "a" / "b" / "file.txt").write_bytes(b"managed")
    return root


def test_a_reparse_point_is_a_link_even_when_it_is_not_s_islnk():
    junction = SimpleNamespace(st_mode=stat.S_IFDIR | 0o755, st_file_attributes=0x400)
    plain = SimpleNamespace(st_mode=stat.S_IFDIR | 0o755, st_file_attributes=0x10)
    posix_symlink = SimpleNamespace(st_mode=stat.S_IFLNK | 0o777)
    assert is_link(junction) and is_link(posix_symlink)  # type: ignore[arg-type]
    assert not is_link(plain)  # type: ignore[arg-type]


def test_open_stat_and_rename_work_inside_the_anchor(tree):
    with open_anchored(tree, ["a", "b"]) as anchor:
        fd = anchor.open("file.txt", os.O_RDONLY)
        try:
            assert os.read(fd, 100) == b"managed"
            opened = os.fstat(fd)
        finally:
            os.close(fd)
        named = anchor.stat("file.txt")
        assert (named.st_dev, named.st_ino) == (opened.st_dev, opened.st_ino)
        anchor.rename("file.txt", ".file.removing")
        with pytest.raises(FileNotFoundError):
            anchor.stat("file.txt")
    assert (tree / "a" / "b" / ".file.removing").read_bytes() == b"managed"


def test_a_symlinked_directory_on_the_way_is_refused(tree, tmp_path):
    outside = tmp_path / "outside"
    outside.mkdir()
    (tree / "a" / "b").rename(tmp_path / "held")
    _symlink_or_skip(tree / "a" / "b", outside, directory=True)
    with pytest.raises(OSError):
        open_anchored(tree, ["a", "b"])


def test_a_symlinked_root_is_refused(tree, tmp_path):
    link = tmp_path / "root-link"
    _symlink_or_skip(link, tree, directory=True)
    with pytest.raises(OSError):
        open_anchored(link, ["a", "b"])


def test_a_symlinked_file_is_refused_not_followed(tree, tmp_path):
    outside = tmp_path / "outside.txt"
    outside.write_bytes(b"unrelated")
    _symlink_or_skip(tree / "a" / "b" / "link.txt", outside, directory=False)
    with open_anchored(tree, ["a", "b"]) as anchor:
        with pytest.raises(OSError):
            anchor.open("link.txt", os.O_RDWR)
        assert is_link(anchor.stat("link.txt"))
    assert outside.read_bytes() == b"unrelated"


def test_a_moved_directory_is_still_the_anchored_one(tree, tmp_path):
    """POSIX keeps working in the directory it opened even after it moves;
    Windows refuses the move while the anchor holds it. Either way a
    replacement put at the old path is never touched."""
    with open_anchored(tree, ["a", "b"]) as anchor:
        if os.name == "nt":
            with pytest.raises(PermissionError):
                (tree / "a").rename(tmp_path / "moved")
            moved = tree / "a" / "b"
        else:
            (tree / "a").rename(tmp_path / "moved")
            (tree / "a" / "b").mkdir(parents=True)
            (tree / "a" / "b" / "file.txt").write_bytes(b"replacement")
            moved = tmp_path / "moved" / "b"
        anchor.rename("file.txt", ".file.removing")
    assert (moved / ".file.removing").read_bytes() == b"managed"
    if os.name != "nt":
        assert (tree / "a" / "b" / "file.txt").read_bytes() == b"replacement"


def test_close_is_idempotent(tree):
    anchor = open_anchored(tree, ["a"])
    anchor.close()
    anchor.close()
