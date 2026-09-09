"""Onboarding tooling detection (Phase 7, P7.3).

Reads DECLARED files in a repository root and derives SUGGESTED objectives.
Suggestions are inert by contract: manual evaluator only, no command argv,
no execution of any repository script. Accepting a suggestion is an explicit
owner action that goes through the normal objective-add validation.
"""
from __future__ import annotations

from pathlib import Path
from typing import Any, Dict, List

# Declared file -> suggested objective. Only files that EXIST are suggested.
# Every suggestion is manual: a human confirms evidence; onboarding never
# pre-arms a command against the repository.
_DECLARED: List[Dict[str, Any]] = [
    {"file": "pyproject.toml", "name": "Python packaging present",
     "target": ">=1", "severity": "low",
     "description": "Declares Python packaging; owner verifies the build is healthy."},
    {"file": "package.json", "name": "Node tooling present",
     "target": ">=1", "severity": "low",
     "description": "Declares Node/package tooling; owner verifies install and test scripts."},
    {"file": "Cargo.toml", "name": "Rust tooling present",
     "target": ">=1", "severity": "low",
     "description": "Declares a Rust workspace; owner verifies cargo build health."},
    {"file": "go.mod", "name": "Go tooling present",
     "target": ">=1", "severity": "low",
     "description": "Declares a Go module; owner verifies build and test health."},
    {"file": "README.md", "name": "README maintained",
     "target": ">=1", "severity": "info",
     "description": "Canonical repo surface file; owner confirms it stays accurate."},
    {"file": "AGENTS.md", "name": "AGENTS guidance present",
     "target": ">=1", "severity": "info",
     "description": "Agent-context file exists; owner reviews it stays current."},
]


def suggest_objectives(repo_path: Path) -> List[Dict[str, Any]]:
    """Detect declared files and return inert objective suggestions.

    Read-only: only stat()s the listed file names. Never reads beyond the
    declared list, never executes anything. Each suggestion is a manual
    objective the owner may accept through the normal objective endpoint.
    """
    repo = Path(repo_path)
    out: List[Dict[str, Any]] = []
    for spec in _DECLARED:
        if (repo / spec["file"]).exists():
            out.append({
                "name": spec["name"],
                "evaluator_type": "manual",
                "target": spec["target"],
                "severity": spec["severity"],
                "description": spec["description"],
                "suggested_file": spec["file"],
            })
    return out