"""Where the tests find an upstream Hermes checkout, if you have one.

Set ``HPS_HERMES_SOURCE`` to the path of a hermes-agent checkout. The
supported revision is pinned in docs/surfaces/supported-host-revisions.md,
and scripts/native-host-lane.sh sets the variable to the tree it tests.

Tests that need a real Hermes tree call ``require_hermes_tree()``: unset or
missing, they skip, or fail when ``STEWARD_REQUIRE_NATIVE_HOST=1`` (the
native lanes must never silently skip).
"""
from __future__ import annotations

import os
from pathlib import Path

import pytest

ENV = "HPS_HERMES_SOURCE"


def pinned_hermes_tree() -> Path | None:
    """The Hermes checkout named by HPS_HERMES_SOURCE, or None when unset."""
    raw = os.environ.get(ENV, "").strip()
    return Path(raw).expanduser() if raw else None


def require_hermes_tree() -> Path:
    """The pinned Hermes checkout; skip (or fail on a native lane) without it."""
    tree = pinned_hermes_tree()
    if tree is None or not tree.is_dir():
        if os.environ.get("STEWARD_REQUIRE_NATIVE_HOST") == "1":
            pytest.fail(f"pinned upstream Hermes tree is missing: {ENV}={tree}")
        pytest.skip(f"pinned upstream Hermes tree is not installed (set {ENV})")
    return tree
