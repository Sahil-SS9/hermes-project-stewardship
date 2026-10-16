"""File identity in the form SQLite can store.

Managed-content removal is bound to a file's identity, (st_dev, st_ino),
stored in SQLite INTEGER columns, which hold signed 64-bit values.

POSIX reports identities below 2**63. Windows does not: NTFS file references
carry a sequence number in the top bits (often at or above 2**63), and from
Python 3.12 ReFS / Dev Drive volumes report 128-bit file ids. Stored raw they
raised ``OverflowError`` and every upload or restore on Windows failed.

``sqlite_int64`` maps any non-negative identity into the signed 64-bit range:

* below 2**63 (every POSIX value): unchanged, so rows written before this
  module existed still match without a migration;
* 2**63 up to 2**64 - 1 (64-bit Windows values): two's complement, one-to-one;
* wider (128-bit ReFS ids): a stable 64-bit BLAKE2b digest.

Identity is only ever compared for equality, between the value stored at
upload or restore and a fresh stat of the same file, so a one-to-one or
collision-resistant mapping preserves every check.
"""
from __future__ import annotations

import hashlib
import os

_SIGNED_LIMIT = 1 << 63
_UNSIGNED_LIMIT = 1 << 64


def sqlite_int64(value: int) -> int:
    """Map a stat identity field onto SQLite's signed 64-bit INTEGER range."""
    number = int(value)
    if 0 <= number < _SIGNED_LIMIT:
        return number
    if _SIGNED_LIMIT <= number < _UNSIGNED_LIMIT:
        return number - _UNSIGNED_LIMIT
    digest = hashlib.blake2b(str(number).encode("ascii"), digest_size=8).digest()
    return int.from_bytes(digest, "big", signed=True)


def sqlite_file_identity(info: os.stat_result) -> tuple[int, int]:
    """The (device, inode) pair of ``info`` as stored in ``project_content``."""
    return sqlite_int64(info.st_dev), sqlite_int64(info.st_ino)
