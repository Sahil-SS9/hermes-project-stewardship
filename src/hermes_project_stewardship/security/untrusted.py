"""Untrusted-content handling: labelling, injection scanning, authority split.

Threat model (docs/threat-model.md §3): retrieved repository content — issues,
PR bodies, README text, code comments, commit messages — is attacker-
controllable when a stewardship project points at a public repo. This module
gives the engine three defences:

1. **Labelling.** Every piece of externally-sourced text is wrapped in an
   `UntrustedContent` envelope that records its origin and carries a
   machine-readable boundary marker. Prompts built from evidence must include
   these markers; the API layer refuses to serialise unlabelled untrusted
   strings into instruction-bearing fields.
2. **Scanning.** Deterministic pattern scan for known prompt-injection
   shapes, producing severities. High-severity hits are treated as
   contradictions (fail-closed) by the verification engine.
3. **Authority separation.** `Evidence.authoritative` is False for anything
   derived from untrusted sources; the cycle engine only lets authoritative
   evidence move health upward or authorise mutations.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Dict, List, Optional

BOUNDARY_BEGIN = "<<<UNTRUSTED_CONTENT origin={origin} >>>"
BOUNDARY_END = "<<<END_UNTRUSTED_CONTENT>>>"


@dataclass
class UntrustedContent:
    """A string that originated outside the trusted operator boundary."""

    text: str
    origin: str  # e.g. "github_issue:1234", "pr:55:description"

    def wrap(self) -> str:
        """Render with explicit non-authority markers for prompt inclusion."""
        return (
            f"{BOUNDARY_BEGIN.format(origin=self.origin)}\n"
            f"{self.text}\n"
            f"{BOUNDARY_END}"
        )


@dataclass
class InjectionFinding:
    rule: str
    severity: str  # info | low | medium | high
    excerpt: str


# Rule name → (compiled regex, severity).
# Deliberately conservative: this is defence-in-depth for *flagging*, not a
# sandbox. False positives fail safe (they only add scrutiny, never reduce it).
_INJECTION_RULES: List[tuple] = [
    (
        "ignore_previous",
        re.compile(r"ignore\s+(all\s+)?(previous|prior|above)\s+(instructions|prompts?)", re.I),
        "high",
    ),
    (
        "disregard_policy",
        re.compile(r"disregard\s+(the\s+)?(project\s+)?(policy|rules|constraints)", re.I),
        "high",
    ),
    (
        "reveal_secret",
        re.compile(r"(reveal|print|expose|output)\s+(?:\w+\s+){0,2}(api[\s_-]?keys?|secrets?|tokens?|credentials)", re.I),
        "high",
    ),
    (
        "authority_claim",
        re.compile(r"(as\s+)?(the\s+)?(admin|administrator|maintainer|owner|developer),?\s+I\s+(hereby\s+)?(authorize|approve|command|instruct)", re.I),
        "medium",
    ),
    (
        "new_instructions",
        re.compile(r"\b(new|updated|revised)\s+(system\s+)?instructions?\s*:", re.I),
        "medium",
    ),
    (
        "tool_invocation_request",
        re.compile(r"\b(run|execute)\s+the\s+(following\s+)?(command|shell|script)", re.I),
        "medium",
    ),
    (
        "approval_forgery",
        re.compile(r"\b(this\s+)?(change|initiative|pr|pull request)\s+is\s+(pre-?approved|approved\s+by)", re.I),
        "medium",
    ),
    (
        "boundary_probe",
        re.compile(r"<<?<?UNTRUSTED_CONTENT", re.I),
        "low",
    ),
]


def scan_text(text: str) -> List[InjectionFinding]:
    """Deterministic scan of one text blob; returns findings (may be empty)."""
    findings: List[InjectionFinding] = []
    for rule_name, pattern, severity in _INJECTION_RULES:
        m = pattern.search(text or "")
        if m:
            start = max(0, m.start() - 30)
            excerpt = (text[start:m.end() + 30]).replace("\n", " ")
            findings.append(
                InjectionFinding(rule=rule_name, severity=severity, excerpt=excerpt)
            )
    return findings


def worst_severity(findings: List[InjectionFinding]) -> str:
    order = ["info", "low", "medium", "high"]
    worst = "info"
    for f in findings:
        if order.index(f.severity) > order.index(worst):
            worst = f.severity
    return worst


def is_authoritative(kind_source: str) -> bool:
    """Authoritative evidence comes from deterministic local/integration
    collectors, never from content authored inside the repo under watch."""
    return not kind_source.startswith(("untrusted:", EvidencePrefix.ADVISORY))


class EvidencePrefix:
    ADVISORY = "advisory:"


def make_evidence_entry(
    *,
    kind: str,
    source: str,
    summary: str,
    untrusted_origins: Optional[List[str]] = None,
) -> Dict:
    """Build a health-snapshot evidence entry with correct authority flag."""
    authoritative = True
    if source.startswith(EvidencePrefix.ADVISORY) or (untrusted_origins):
        authoritative = False
    entry = {
        "kind": kind,
        "source": source,
        "summary": summary,
        "authoritative": authoritative,
    }
    if untrusted_origins:
        entry["untrusted_origins"] = untrusted_origins
    return entry
