"""Hermes directory-plugin entry point."""
from __future__ import annotations

import sys
from pathlib import Path

_SRC = Path(__file__).resolve().parent / "src"
if str(_SRC) not in sys.path:
    sys.path.insert(0, str(_SRC))

from hermes_project_stewardship.plugin import register  # noqa: E402,F401
