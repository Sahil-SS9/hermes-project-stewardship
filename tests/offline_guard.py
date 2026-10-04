"""Keep test processes offline.

A test once reached real model providers with the operator's own logins: the
board model picker ran `gh auth token` and fetched model lists over the
network, from the pytest suite and from the browser suite's practice server.
install() refuses every connection off this machine and every GitHub CLI run
in the current process, and records each attempt in ATTEMPTS so the caller
can fail the run even when the code under test swallows the refusal.

It guards one process only; subprocesses are out of its reach, so every
process that must stay offline installs it itself (tests/conftest.py and
hermes_dockyard_plugin/desktop/disposable-backend.py). The opt-in
real-provider lane runs its driver in a subprocess, outside it on purpose.
"""
from __future__ import annotations

import ipaddress
import os
import socket
import sys

ATTEMPTS: list[str] = []
_installed = False


def is_local_host(host: object) -> bool:
    if isinstance(host, bytes):
        host = host.decode("ascii", "replace")
    if not isinstance(host, str):
        return False
    if host == "localhost":
        return True
    try:
        address = ipaddress.ip_address(host.split("%", 1)[0])
    except ValueError:
        return False  # any other hostname resolves off this machine
    if isinstance(address, ipaddress.IPv6Address) and address.ipv4_mapped:
        address = address.ipv4_mapped
    return address.is_loopback or address.is_unspecified


def _audit_hook(event: str, args: tuple) -> None:
    if event == "socket.connect":
        sock, address = args
        if getattr(sock, "family", None) not in (socket.AF_INET, socket.AF_INET6):
            return  # unix sockets and socket pairs never leave the machine
        host = address[0] if isinstance(address, tuple) and address else address
        if not is_local_host(host):
            ATTEMPTS.append(f"connection to {address!r}")
            raise ConnectionRefusedError(f"offline guard refused a connection to {address!r}")
    elif event == "subprocess.Popen":
        executable, argv = args[0], args[1]
        if isinstance(executable, (str, bytes, os.PathLike)) and os.path.basename(os.fsdecode(executable)) == "gh":
            shown = list(argv[1:3]) if isinstance(argv, (list, tuple)) else []
            ATTEMPTS.append(f"GitHub CLI run {shown!r}")
            raise PermissionError("offline guard refused to run the GitHub CLI")


def install() -> None:
    """Install the guard in this process (audit hooks cannot be removed)."""
    global _installed
    if not _installed:
        sys.addaudithook(_audit_hook)
        _installed = True
