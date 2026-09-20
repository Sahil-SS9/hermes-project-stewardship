"""Phase 8B provider-neutral curation contract.

This is deliberately a proposal generator, not an autonomous mutator. A real
provider adapter can implement the same input/output contract later; every
returned item remains a user-approved proposal with source object IDs.
"""
from __future__ import annotations

from hashlib import sha256
import json
from typing import Any, Protocol


class CurationProvider(Protocol):
    """Injected provider seam; providers return proposals, never mutations."""

    provider_id: str
    model_id: str

    def propose(self, context: dict[str, Any]) -> dict[str, Any]: ...


class CanvasCurationService:
    def __init__(self, provider: CurationProvider | None = None) -> None:
        self.provider = provider

    def curate(self, canvas: dict[str, Any], *, clarifications: list[dict[str, Any]] | None = None) -> dict[str, Any]:
        objects = list(canvas.get("objects", []))
        clarifications = list(clarifications or [])
        resolved_question_ids = {
            str(item.get("question", {}).get("id") or "")
            for item in clarifications
            if item.get("outcome") in {"answer", "skip"}
        }
        evidence = [o for o in objects if o.get("kind") in {"evidence", "note", "media", "link"}]
        claims = [o for o in objects if o.get("kind") == "claim"]
        questions = [o for o in objects if o.get("kind") == "question"]
        plan_blocks = [o for o in objects if o.get("kind") == "plan_block"]
        missing = []
        for gap_id, question, required in (
            ("missing-evidence", "What evidence supports the intended outcome?", not evidence),
            ("missing-claim", "What problem or user need are we solving?", not claims),
            ("missing-plan", "What is the smallest outcome worth building first?", not plan_blocks),
        ):
            if required and gap_id not in resolved_question_ids:
                missing.append({"id": gap_id, "question": question})
        context_fingerprint = sha256(json.dumps(canvas, sort_keys=True, separators=(",", ":")).encode()).hexdigest()
        if self.provider is not None and not missing:
            try:
                provider_result = self.provider.propose({"canvas": canvas, "untrusted_content": True})
                if not isinstance(provider_result, dict) or not isinstance(provider_result.get("proposals", []), list):
                    raise ValueError("provider returned malformed curation output")
            except Exception as exc:  # provider failures are explicit, never simulated success
                return {"canvas_revision": canvas.get("revision"), "status": "provider_failed", "error": str(exc), "context_fingerprint": context_fingerprint, "clarifying_questions": [], "proposals": []}
        else:
            provider_result = None
        proposals = provider_result.get("proposals", []) if provider_result else ([
                {
                    "kind": kind,
                    "title": title,
                    "source_object_ids": [o["id"] for o in objects],
                    "requires_approval": True,
                    "context_fingerprint": context_fingerprint,
                    "provider_id": getattr(self.provider, "provider_id", "local-contract"),
                    "model_id": getattr(self.provider, "model_id", "provider-neutral"),
                }
                for kind, title in (
                    ("synthesis", "Curated planning brief"),
                    ("user_journey", "Candidate user journey"),
                    ("edge_case", "Edge-case review"),
                    ("technical_plan", "Technical implementation plan"),
                )
            ] if objects and not missing else [])
        for proposal in proposals:
            proposal.setdefault("requires_approval", True)
            proposal.setdefault("context_fingerprint", context_fingerprint)
            proposal.setdefault("source_object_ids", [o["id"] for o in objects])
        return {
            "canvas_revision": canvas.get("revision"),
            "status": "needs_clarification" if missing else "ready_for_review",
            "summary": {
                "evidence_count": len(evidence),
                "claim_count": len(claims),
                "question_count": len(questions),
                "plan_block_count": len(plan_blocks),
            },
            "clarifying_questions": missing,
            "proposals": proposals,
        }
