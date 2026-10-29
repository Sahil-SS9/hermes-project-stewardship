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
from dataclasses import dataclass
from pathlib import Path
from typing import Callable, List, Optional

from ..domain.constants import HealthState, Severity
from ..domain.models import Contradiction, Evidence, VerificationVerdict
from ..security.untrusted import (
    EvidencePrefix,
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

    @staticmethod
    def _stderr_of(proc: "subprocess.CompletedProcess") -> str:
        raw = getattr(proc, "stderr", b"") or b""
        if isinstance(raw, bytes):
            raw = raw.decode("utf-8", errors="replace")
        return " ".join(str(raw).split())[:200]

    def _repo_root_contradiction(
        self, spec: CollectorSpec, root: Path
    ) -> Optional[Contradiction]:
        """Refuse evidence that does not describe the declared path itself.

        git walks UP from its working directory, so a non-repo directory
        nested inside another checkout answers with the OUTER repository's
        status and log. That output is about a different tree, so accepting it
        would attribute someone else's working state to this project. A
        directory that is no repository at all exits non-zero and is refused
        by the same check.
        """
        proc = self._git(["rev-parse", "--show-toplevel"], root)
        if proc.returncode != 0:
            return Contradiction(
                severity="high",
                subject=spec.kind,
                detail=(
                    "declared repo path is not a git repository "
                    f"(git exit {proc.returncode}: {self._stderr_of(proc)})"
                ),
                evidence_refs=[f"git:{root}"],
            )
        top = proc.stdout.decode("utf-8", errors="replace").strip()
        try:
            same = top and Path(top).resolve() == Path(root).resolve()
        except OSError:
            same = False
        if not same:
            return Contradiction(
                severity="high",
                subject=spec.kind,
                detail=(
                    "declared repo path is not the root of the repository git "
                    f"resolved ({top or 'unknown'}): evidence would describe "
                    "a different working tree"
                ),
                evidence_refs=[f"git:{root}"],
            )
        return None

    def _collect_git(self, spec: CollectorSpec) -> tuple[Evidence, List[Contradiction]]:
        root = spec.path
        if not root or not Path(root).exists():
            return (
                Evidence(
                    kind="git_status",
                    source=f"git:{root}",
                    summary="repo path missing",
                    authoritative=False,
                ),
                [Contradiction(Severity.HIGH if hasattr(Severity, 'HIGH') else 'high',
                               subject="git", detail="declared repo path does not exist",
                               evidence_refs=[f"git:{root}"])],
            )
        # Identity first: prove the path IS the repository this evidence will
        # claim to describe, before any output is read as canonical state.
        misattributed = self._repo_root_contradiction(spec, root)
        if misattributed is not None:
            return (
                Evidence(
                    kind=spec.kind,
                    source=f"git:{root}",
                    summary="unverified: declared repo path is not a repository root",
                    authoritative=False,
                ),
                [misattributed],
            )
        if spec.kind == "git_status":
            proc = self._git(["status", "--porcelain=v1"], root)
            if proc.returncode != 0:
                # A failed command measured nothing. Reading empty stdout as a
                # clean tree would turn an error into authoritative "no changes"
                # evidence, so the verdict fails closed instead.
                return (
                    Evidence(
                        kind="git_status",
                        source=f"git:{root}",
                        summary=f"git status failed (exit {proc.returncode})",
                        payload_json={"exit_code": proc.returncode,
                                      "stderr_head": self._stderr_of(proc)},
                        authoritative=False,
                    ),
                    [Contradiction(
                        severity="high",
                        subject="git_status",
                        detail=(
                            f"git status exited {proc.returncode}: working tree "
                            f"state is unknown ({self._stderr_of(proc)})"
                        ),
                        evidence_refs=[f"git:{root}"],
                    )],
                )
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
            if proc.returncode != 0:
                # A repository with no commits yet is a known state, not a
                # failure: `git log` exits 128 there while `git rev-list --all`
                # succeeds with empty output. Anything else measured nothing,
                # and "0 recent commits" from a failed command must not look
                # like a genuinely empty history.
                probe = self._git(["rev-list", "-n1", "--all"], root)
                empty_history = (
                    probe.returncode == 0
                    and not probe.stdout.decode("utf-8", errors="replace").strip()
                )
                if not empty_history:
                    return (
                        Evidence(
                            kind="git_log",
                            source=f"git:{root}",
                            summary=f"git log failed (exit {proc.returncode})",
                            payload_json={"exit_code": proc.returncode,
                                          "stderr_head": self._stderr_of(proc)},
                            authoritative=False,
                        ),
                        [Contradiction(
                            severity="high",
                            subject="git_log",
                            detail=(
                                f"git log exited {proc.returncode}: commit history "
                                f"is unknown ({self._stderr_of(proc)})"
                            ),
                            evidence_refs=[f"git:{root}"],
                        )],
                    )
                return (
                    Evidence(
                        kind="git_log",
                        source=f"git:{root}",
                        summary="0 recent commits",
                        payload_json={"commits": [], "empty_history": True},
                    ),
                    [],
                )
            out = proc.stdout.decode("utf-8", errors="replace")
            lines = [line for line in out.splitlines() if line.strip()]
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
