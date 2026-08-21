"""Two-tier verification engine.

Tier 1 (authoritative, deterministic): git collectors and declared-file
collectors run locally against the project checkout. Their output is the
canonical baseline.

Tier 2 (advisory): memory/session summaries and LLM assessments. They are
recorded with `authoritative: False` and can NEVER move the verdict to ok on
their own or authorise mutations.

Contradiction handling (fail-closed):
- high-severity contradictions => verdict.ok = False;
- Unknown state until verification succeeds.
"""

from __future__ import annotations

import subprocess
from dataclasses import dataclass, field
from pathlib import Path
from typing import Callable, Dict, List, Optional

from ..domain.constants import HealthState, Severity
from ..domain.models import Contradiction, Evidence, VerificationVerdict
from ..security.untrusted import (
    EvidencePrefix,
    make_evidence_entry,
    scan_text,
    worst_severity,
)


@dataclass
class CollectorSpec:
    """One canonical evidence source for a project."""

    kind: str                      # git_status | git_log | declared_file | command_probe
    path: Optional[Path] = None    # repo root / file path
    argv: Optional[List[str]] = None  # for command_probe


class VerificationEngine:
    def __init__(
        self,
        *,
        git_runner: Optional[Callable[..., subprocess.CompletedProcess]] = None,
        file_reader: Optional[Callable[[Path], str]] = None,
        max_git_log_entries: int = 10,
    ) -> None:
        self._git = git_runner or self._default_git_runner
        self._read = file_reader or self._default_read
        self._max_log = max_git_log_entries

    # ------------------------------------------------------------------ #
    # Default IO adapters (real subprocess/file access)                  #
    # ------------------------------------------------------------------ #

    @staticmethod
    def _default_git_runner(args: List[str], cwd: Path) -> "subprocess.CompletedProcess":
        return subprocess.run(
            ["git", *args],
            cwd=str(cwd),
            capture_output=True,
            timeout=30,
            check=False,
        )

    @staticmethod
    def _default_read(path: Path) -> str:
        return path.read_text(encoding="utf-8", errors="replace")

    # ------------------------------------------------------------------ #
    # Collectors                                                         #
    # ------------------------------------------------------------------ #

    def _collect_git(self, spec: CollectorSpec) -> tuple[Evidence, List[Contradiction]]:
        root = spec.path
        if not root or not Path(root).exists():
            return (
                Evidence(
                    kind="git_status",
                    source=f"git:{root}",
                    summary="repo path missing",
                ),
                [Contradiction(Severity.HIGH if hasattr(Severity, 'HIGH') else 'high',
                               subject="git", detail="declared repo path does not exist",
                               evidence_refs=[f"git:{root}"])],
            )
        if spec.kind == "git_status":
            proc = self._git(["status", "--porcelain=v1"], root)
            out = proc.stdout.decode("utf-8", errors="replace")
            dirty = bool(out.strip())
            findings = scan_text(out)
            evidence = Evidence(
                kind="git_status",
                source=f"git:{root}",
                summary=("dirty working tree" if dirty else "clean working tree"),
                payload_json={
                    "dirty": dirty,
                    "entries": out.splitlines()[:200],
                },
            )
            contradictions: List[Contradiction] = []
            if worst_severity(findings) == "high":
                contradictions.append(
                    Contradiction(
                        severity="high",
                        subject="git_status",
                        detail="prompt-injection pattern detected in git status output",
                        evidence_refs=[evidence.source],
                    )
                )
            return evidence, contradictions
        else:  # git_log
            proc = self._git(
                ["log", f"-n{self._max_log}", "--pretty=format:%H %ad %s", "--date=iso"],
                root,
            )
            out = proc.stdout.decode("utf-8", errors="replace")
            lines = [l for l in out.splitlines() if l.strip()]
            return (
                Evidence(
                    kind="git_log",
                    source=f"git:{root}",
                    summary=f"{len(lines)} recent commits",
                    payload_json={"commits": lines},
                ),
                [],
            )

    def _collect_declared_file(self, spec: CollectorSpec) -> tuple[Evidence, List[Contradiction]]:
        path = spec.path
        assert path is not None
        try:
            text = self._read(Path(path))
        except FileNotFoundError:
            return (
                Evidence(kind="declared_file", source=f"file:{path}", summary="missing"),
                [
                    Contradiction(
                        severity="high",
                        subject=f"file:{path.name}",
                        detail="declared status/roadmap file is missing",
                        evidence_refs=[f"file:{path}"],
                    )
                ],
            )
        findings = scan_text(text)
        contradictions: List[Contradiction] = []
        sev = worst_severity(findings)
        if sev == "high":
            contradictions.append(
                Contradiction(
                    severity="high",
                    subject=f"file:{path.name}",
                    detail="prompt-injection pattern detected in declared file",
                    evidence_refs=[f"file:{path}"],
                )
            )
        return (
            Evidence(
                kind="declared_file",
                source=f"file:{path}",
                summary=f"{len(text)} chars",
                payload_json={"head": text[:4000]},
            ),
            contradictions,
        )

    def collect(self, specs: List[CollectorSpec]) -> VerificationVerdict:
        """Run all collectors; produce a fail-closed verdict."""
        evidence: List[Evidence] = []
        contradictions: List[Contradiction] = []
        for spec in specs or []:
            if spec.kind in ("git_status", "git_log"):
                ev, cs = self._collect_git(spec)
            elif spec.kind == "declared_file":
                ev, cs = self._collect_declared_file(spec)
            elif spec.kind == "command_probe":
                # executed by objectives module under allowlist; placeholder
                continue
            else:
                continue
            evidence.append(ev)
            contradictions.extend(cs)
        ok = not any(c.severity == "high" for c in contradictions)
        return VerificationVerdict(
            ok=ok,
            state_basis=(HealthState.HEALTHY if ok else HealthState.UNKNOWN),
            contradictions=contradictions,
            evidence=evidence,
        )


def advisory_evidence(source_ref: str, summary: str) -> Evidence:
    """Build an explicitly non-authoritative memory/session/LLM evidence item.

    Advisory evidence is recorded for provenance but can never justify a
    mutating action — see cycle engine's gate.
    """
    return Evidence(
        kind="advisory_memory",
        source=f"{EvidencePrefix.ADVISORY}{source_ref}",
        summary=summary,
        authoritative=False,
    )


def reconcile_with_advisory(
    verdict: VerificationVerdict,
    advisory_claims: List[str],
) -> VerificationVerdict:
    """Regression scenario 1 helper: stale session/memory says work incomplete
    while git proves complete. Deterministic evidence wins; the conflict is
    recorded as a low-severity contradiction so humans see it, but it does NOT
    block (memory is not authority) — unless policy marks otherwise upstream.
    """
    out = VerificationVerdict(
        ok=verdict.ok,
        state_basis=(
            HealthState.HEALTHY if verdict.ok else HealthState.UNKNOWN
        ),
        contradictions=list(verdict.contradictions),
        evidence=list(verdict.evidence),
    )
    for claim in advisory_claims:
        out.contradictions.append(
            Contradiction(
                severity="low",
                subject="memory_vs_reality",
                detail=f"advisory claim conflicts with canonical evidence: {claim[:200]}",
                evidence_refs=["advisory"],
            )
        )
    return out
