"""A managed directory, reached from its root without following links and
held in place while removal works inside it (``remove_project_content``).

POSIX: a chain of directory descriptors, each opened relative to the one
before with ``O_DIRECTORY | O_NOFOLLOW``. Names inside are opened, stat'ed
and renamed relative to the last descriptor (openat, fstatat, renameat), so a
path component swapped for a symlink is never followed.

Windows has neither directory descriptors nor the ``*at`` calls, so the
directories are pinned instead: every component from the root down is opened
as a handle that does not share delete access (with
``FILE_FLAG_BACKUP_SEMANTICS | FILE_FLAG_OPEN_REPARSE_POINT``). While those
handles are held no component can be renamed, deleted or replaced, so a full
path below them names the directories that were checked; a component that is
itself a reparse point (a symlink or a junction) is refused. The handles ask
for read access because an attribute-only handle takes no part in sharing
checks, and they share write access so files inside can still be created and
renamed. Files are opened without following a final reparse point and with
delete sharing, so a held file can still be renamed, as on POSIX.
"""

from __future__ import annotations

import errno
import os
import stat
import sys
from pathlib import Path
from typing import Iterable, List

_FILE_ATTRIBUTE_REPARSE_POINT = 0x400
_GENERIC_READ = 0x80000000
_GENERIC_WRITE = 0x40000000
_FILE_SHARE_READ = 0x1
_FILE_SHARE_WRITE = 0x2
_FILE_SHARE_DELETE = 0x4
_OPEN_EXISTING = 3
_FILE_FLAG_BACKUP_SEMANTICS = 0x02000000
_FILE_FLAG_OPEN_REPARSE_POINT = 0x00200000
_NOFOLLOW = getattr(os, "O_NOFOLLOW", 0)
_ACCESS_MODES = os.O_RDONLY | os.O_WRONLY | os.O_RDWR


def is_link(info: os.stat_result) -> bool:
    """A symlink, or on Windows any reparse point: a junction is not S_ISLNK."""
    attributes = getattr(info, "st_file_attributes", 0)
    return stat.S_ISLNK(info.st_mode) or bool(attributes & _FILE_ATTRIBUTE_REPARSE_POINT)


class AnchoredDirectory:
    """Open, stat and rename names inside one anchored directory."""

    def open(self, name: str, flags: int) -> int:
        """A descriptor for ``name``; a final symlink is refused, not followed."""
        raise NotImplementedError

    def stat(self, name: str) -> os.stat_result:
        """``name``'s own status: a final symlink is described, not followed."""
        raise NotImplementedError

    def rename(self, src: str, dst: str) -> None:
        raise NotImplementedError

    def close(self) -> None:
        raise NotImplementedError

    def __enter__(self) -> "AnchoredDirectory":
        return self

    def __exit__(self, *exc_info: object) -> None:
        self.close()


class _PosixAnchor(AnchoredDirectory):
    _DIRECTORY_FLAGS = os.O_RDONLY | getattr(os, "O_DIRECTORY", 0) | _NOFOLLOW

    def __init__(self, root: Path, parts: Iterable[str]) -> None:
        fd = os.open(root, self._DIRECTORY_FLAGS)
        try:
            for part in parts:
                next_fd = os.open(part, self._DIRECTORY_FLAGS, dir_fd=fd)
                os.close(fd)
                fd = next_fd
        except BaseException:
            os.close(fd)
            raise
        self._fd: int | None = fd

    def _dir_fd(self) -> int:
        if self._fd is None:
            raise ValueError("anchored directory is closed")
        return self._fd

    def open(self, name: str, flags: int) -> int:
        return os.open(name, flags | _NOFOLLOW, dir_fd=self._dir_fd())

    def stat(self, name: str) -> os.stat_result:
        return os.stat(name, dir_fd=self._dir_fd(), follow_symlinks=False)

    def rename(self, src: str, dst: str) -> None:
        fd = self._dir_fd()
        os.rename(src, dst, src_dir_fd=fd, dst_dir_fd=fd)

    def close(self) -> None:
        if self._fd is not None:
            fd, self._fd = self._fd, None
            os.close(fd)


class _WindowsAnchor(AnchoredDirectory):  # pragma: no cover — exercised on the Windows lane
    def __init__(self, root: Path, parts: Iterable[str]) -> None:
        self._pins: List[int] = []
        path = Path(root)
        try:
            self._pin(path)
            for part in parts:
                path = path / part
                self._pin(path)
        except BaseException:
            self.close()
            raise
        self._path = path

    @staticmethod
    def _descriptor(path: Path, access: int, share: int, flags: int, fd_flags: int) -> int:
        if sys.platform != "win32":
            raise NotImplementedError("Windows handles exist only on Windows")
        import _winapi
        import msvcrt

        handle = _winapi.CreateFile(
            str(path), access, share, _winapi.NULL, _OPEN_EXISTING, flags, _winapi.NULL
        )
        try:
            return msvcrt.open_osfhandle(handle, fd_flags)
        except BaseException:
            _winapi.CloseHandle(handle)
            raise

    def _pin(self, path: Path) -> None:
        fd = self._descriptor(
            path, _GENERIC_READ, _FILE_SHARE_READ | _FILE_SHARE_WRITE,
            _FILE_FLAG_BACKUP_SEMANTICS | _FILE_FLAG_OPEN_REPARSE_POINT, os.O_RDONLY,
        )
        self._pins.append(fd)
        info = os.fstat(fd)
        if is_link(info):
            raise OSError(errno.ELOOP, "managed directory is a symlink or junction", str(path))
        if not stat.S_ISDIR(info.st_mode):
            raise OSError(errno.ENOTDIR, "managed path component is not a directory", str(path))

    def open(self, name: str, flags: int) -> int:
        read_only = (flags & _ACCESS_MODES) == os.O_RDONLY
        fd = self._descriptor(
            self._path / name,
            _GENERIC_READ if read_only else _GENERIC_READ | _GENERIC_WRITE,
            _FILE_SHARE_READ | _FILE_SHARE_WRITE | _FILE_SHARE_DELETE,
            _FILE_FLAG_OPEN_REPARSE_POINT,
            os.O_RDONLY if read_only else 0,
        )
        try:
            if is_link(os.fstat(fd)):
                raise OSError(errno.ELOOP, "managed file is a symlink or reparse point", name)
        except BaseException:
            os.close(fd)
            raise
        return fd

    def stat(self, name: str) -> os.stat_result:
        return os.stat(self._path / name, follow_symlinks=False)

    def rename(self, src: str, dst: str) -> None:
        os.rename(self._path / src, self._path / dst)

    def close(self) -> None:
        while self._pins:
            os.close(self._pins.pop())


def open_anchored(root: Path, parts: Iterable[str]) -> AnchoredDirectory:
    """The directory ``root/<parts...>``, anchored as described above."""
    return _WindowsAnchor(root, parts) if os.name == "nt" else _PosixAnchor(root, parts)
