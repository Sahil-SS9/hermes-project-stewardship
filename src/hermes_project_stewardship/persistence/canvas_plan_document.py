"""Plan synthesis and the implementation document (Batch P, NEW-3 / D-P2).

An *approved* plan proposal (proposal with kind ``technical_plan`` whose
stored status is ``approved``) is the only seed for a plan and its
implementation document. Nothing here mutates the canvas and nothing here
creates backlog items: both stay explicit human actions.

The synthesis is deterministic reassembly of provider-suggested content that
is already stored, provenance-bound proposals (requires_approval, source
object ids, context fingerprint). The model never writes the board and the
board never receives an unapproved item.
"""
from __future__ import annotations

import json
from typing import Any

from .canvas_curation import CurationProvider
from .canvas_service import CanvasService
from .store import Store, iso

PLAN_KINDS = frozenset({"synthesis", "user_journey", "edge_case", "technical_plan"})
IMPL_KINDS = frozenset({"technical_plan", "user_journey", "edge_case"})
MAX_PLAN_STEPS = 50
MAX_STEP_TITLE = 500


class PlanConflictError(ValueError):
    """The request repeats an action the plan has already recorded."""


class PlanDocumentService:
    """Synthesis from approved proposals; pure document building otherwise."""

    def __init__(self, store: Store, provider: CurationProvider | None = None) -> None:
        self.store = store
        self.provider = provider
        self.canvas = CanvasService(store)

    # ------------------------------------------------------------ storage --
    def _conn(self):
        return self.store._conn

    def save_plan(self, project_id: str, plan: dict[str, Any]) -> dict[str, Any]:
        plan_id = "canvas-plan-" + plan.get("plan_hash", "")[:16] or "canvas-plan"
        now = iso(self.store._clock())
        # Re-synthesising the same proposal lands on the same plan_id. The
        # stored plan wins: it may carry owner step edits or a saved document,
        # and silently replacing it would lose both (QA H-1).
        if self._conn().execute("SELECT 1 FROM canvas_plans WHERE plan_id=?", (plan_id,)).fetchone():
            return self.get_plan(project_id, plan_id)
        with self.store.tx() as cx:
            cx.execute(
                "INSERT INTO canvas_plans(plan_id, project_id, canvas_id, proposal_id, canvas_revision, plan_json, status, created_at, updated_at) VALUES(?,?,?,?,?,?,?,?,?)",
                (plan_id, project_id, plan.get("canvas_id"), plan.get("proposal_id"), int(plan.get("canvas_revision") or 0),
                 json.dumps(plan, sort_keys=True), "draft", now, now),
            )
        if plan.get("canvas_id"):
            # A plan moves its board to "Plan made" unless a person has
            # already completed or archived it.
            self.canvas.advance(plan["canvas_id"], "planned", only_from=("draft", "submitted"))
        return self.get_plan(project_id, plan_id)

    def list_plans(self, project_id: str, *, canvas_id: str | None = None) -> list[dict[str, Any]]:
        sql = "SELECT plan_id, canvas_id, status, created_at, updated_at FROM canvas_plans WHERE project_id=?"
        args: tuple[Any, ...] = (project_id,)
        if canvas_id is not None:
            sql += " AND canvas_id=?"
            args += (canvas_id,)
        rows = self._conn().execute(sql + " ORDER BY updated_at, plan_id", args).fetchall()
        return [dict(row) for row in rows]

    def get_plan(self, project_id: str, plan_id: str) -> dict[str, Any]:
        row = self._conn().execute(
            "SELECT plan_json, canvas_id, status, updated_at FROM canvas_plans WHERE project_id=? AND plan_id=?",
            (project_id, plan_id),
        ).fetchone()
        if row is None:
            raise ValueError(f"unknown canvas plan: {plan_id}")
        plan = json.loads(row["plan_json"])
        plan["plan_id"] = plan_id
        plan["canvas_id"] = row["canvas_id"]
        plan["status"] = row["status"]
        plan["updated_at"] = row["updated_at"]
        return plan

    def update_steps(self, project_id: str, plan_id: str, *, steps: Any, actor: str) -> dict[str, Any]:
        """D15: the owner edits a DRAFT plan's steps from the expanded view.

        Each row is {title, order?}. A row with an ``order`` keeps that
        existing step's provenance (source objects, criteria, dependencies);
        a row without one is a new owner-written step with no sources. Steps
        are renumbered 1..n in the given order. Refused once the document is
        saved (the Content-tab copy would silently diverge) or when the board
        is completed/archived.
        """
        plan = self.get_plan(project_id, plan_id)
        if plan.get("status") != "draft":
            raise ValueError("plan steps are fixed once the implementation document is saved")
        if plan.get("canvas_id"):
            self.canvas.require_editable(project_id, plan["canvas_id"])
        if not isinstance(steps, list):
            raise ValueError("steps must be a list")
        if not steps:
            raise ValueError("a plan needs at least one step")
        if len(steps) > MAX_PLAN_STEPS:
            raise ValueError(f"a plan can have at most {MAX_PLAN_STEPS} steps")
        by_order = {int(step["order"]): step for step in plan.get("steps") or []}
        seen: set[str] = set()
        edited: list[dict[str, Any]] = []
        for raw in steps:
            if not isinstance(raw, dict):
                raise ValueError("each step must be an object with a title")
            title = " ".join(str(raw.get("title") or "").split())
            if not title:
                raise ValueError("a step title cannot be empty")
            if len(title) > MAX_STEP_TITLE:
                raise ValueError(f"a step title must be at most {MAX_STEP_TITLE} characters")
            if title.lower() in seen:
                raise ValueError(f"duplicate step title: {title}")
            seen.add(title.lower())
            base: dict[str, Any] = {"source_object_ids": [], "acceptance_criteria": [], "depends_on": []}
            if raw.get("order") is not None:
                try:
                    key = int(raw["order"])
                except (TypeError, ValueError) as exc:
                    raise ValueError("step order must be a number") from exc
                if key not in by_order:
                    raise ValueError(f"unknown step order: {key}")
                base = by_order[key]
            edited.append({**base, "title": title, "order": len(edited) + 1})
        # Dependencies pointed at old orders; drop any that no longer exist.
        valid = {step["order"] for step in edited}
        for step in edited:
            step["depends_on"] = [dep for dep in step.get("depends_on") or [] if dep in valid]
        stored = {key: value for key, value in plan.items() if key not in {"plan_id", "status", "updated_at"}}
        stored.update(steps=edited, edited_by=actor)
        with self.store.tx() as cx:
            cx.execute(
                "UPDATE canvas_plans SET plan_json=?, updated_at=? WHERE project_id=? AND plan_id=? AND status='draft'",
                (json.dumps(stored, sort_keys=True), iso(self.store._clock()), project_id, plan_id),
            )
        return self.get_plan(project_id, plan_id)

    def save_implementation_document(self, project_id: str, plan_id: str, document: str, *, actor: str) -> dict[str, Any]:
        """Persist the implementation doc through the existing content
        endpoints' service layer (D-P2: the Content tab is the destination).
        Returns the content record; never writes a new table row for the doc.
        """
        from .service import StewardshipService

        plan = self.get_plan(project_id, plan_id)
        if plan.get("status") not in {"draft", "documented"}:
            raise ValueError("implementation document requires an approved plan")
        # Completed/archived boards are read-only end to end: document the
        # plan and create backlog items first, then complete the board.
        if plan.get("canvas_id"):
            self.canvas.require_editable(project_id, plan["canvas_id"])
        existing = self._conn().execute(
            "SELECT doc_content_id FROM canvas_plans WHERE project_id=? AND plan_id=?",
            (project_id, plan_id),
        ).fetchone()
        if plan.get("status") == "documented" and existing and existing["doc_content_id"]:
            # Idempotent: one plan owns one document. A repeat save returns the
            # stored record instead of uploading a duplicate file.
            return {**plan, "doc_content_id": existing["doc_content_id"],
                    "doc_filename": f"implementation-{plan_id}.md"}
        media_type = "text/markdown"
        svc = StewardshipService(self.store)
        record = svc.upload_project_content(
            project_id,
            filename=f"implementation-{plan_id}.md",
            media_type=media_type,
            content=document.encode("utf-8"),
            actor=actor,
        )
        with self.store.tx() as cx:
            cx.execute(
                "UPDATE canvas_plans SET status='documented', doc_content_id=?, updated_at=? WHERE project_id=? AND plan_id=?",
                (record["content_id"], iso(self.store._clock()), project_id, plan_id),
            )
        updated = self.get_plan(project_id, plan_id)
        return {**updated, "doc_content_id": record["content_id"], "doc_filename": record["filename"]}

    def get_implementation_document(self, project_id: str, plan_id: str) -> dict[str, Any]:
        """Read the stored Markdown back through the content service."""
        from .service import StewardshipService

        row = self._conn().execute(
            "SELECT status, doc_content_id, updated_at FROM canvas_plans WHERE project_id=? AND plan_id=?",
            (project_id, plan_id),
        ).fetchone()
        if row is None:
            raise ValueError(f"unknown canvas plan: {plan_id}")
        content_id = row["doc_content_id"]
        if not content_id:
            raise ValueError("implementation document has not been saved yet")
        preview = StewardshipService(self.store).project_content_preview(project_id, content_id)
        return {"plan_id": plan_id, "content_id": content_id, "markdown": preview.get("text", ""), "truncated": preview.get("truncated", False)}

    # --------------------------------------------------------- synthesis --
    def synthesise_plan(self, project_id: str, *, proposal_id: str, actor: str) -> dict[str, Any]:
        """Build a plan proposal from an APPROVED technical_plan proposal.

        The provider (when configured) refines step titles only; every step
        keeps its source-object provenance and the whole plan re-states the
        approval contract. Malformed provider output is an explicit error
        with zero writes.
        """
        row = self._conn().execute(
            "SELECT proposal_json, status, session_id, canvas_id, canvas_revision FROM canvas_proposals WHERE proposal_id=? AND project_id=?",
            (proposal_id, project_id),
        ).fetchone()
        if row is None:
            raise ValueError(f"unknown canvas proposal: {proposal_id}")
        if row["status"] != "approved":
            raise ValueError("plan synthesis requires an approved technical_plan proposal")
        if row["canvas_id"]:
            self.canvas.require_editable(project_id, row["canvas_id"])
        proposal = json.loads(row["proposal_json"])
        if proposal.get("kind") != "technical_plan":
            raise ValueError("plan synthesis requires an approved technical_plan proposal")

        # Build from the board the proposal came from, never "the" project board.
        canvas = self.canvas.get(project_id, row["canvas_id"])
        by_id = {item["id"]: item for item in canvas["objects"]}
        steps = self._steps_from_proposal(proposal, by_id)
        open_questions = [item["content"].get("text") or item["content"].get("title") or item["id"]
                          for item in canvas["objects"] if item["kind"] == "question"]
        risks = self._risks_from_canvas(canvas)
        plan = {
            "plan_hash": self._plan_hash(project_id, proposal_id, steps),
            "proposal_id": proposal_id,
            "session_id": row["session_id"],
            "canvas_id": canvas["canvas_id"],
            "canvas_revision": row["canvas_revision"],
            "status": "draft",
            "actor": actor,
            "source_object_ids": proposal.get("source_object_ids") or [],
            "context_fingerprint": proposal.get("context_fingerprint"),
            "goals": self._goals_from_canvas(canvas),
            "scope": [item["content"].get("text") or item["content"].get("title") or item["id"]
                      for item in canvas["objects"] if item["kind"] in {"plan_block", "claim"}],
            "steps": steps,
            "risks": risks,
            "open_questions": open_questions,
        }
        provider_error = None
        if self.provider is not None:
            try:
                refined = self.provider.propose({"canvas": canvas, "plan": plan, "untrusted_content": True})
                plan = self._merge_provider_plan(plan, refined)
            except Exception as exc:  # explicit failure, zero writes
                provider_error = str(exc)
        if provider_error is not None:
            raise ValueError(f"plan synthesis provider failed: {provider_error}")
        saved = self.save_plan(project_id, plan)
        return saved

    # ------------------------------------------------------------- parts --
    @staticmethod
    def _steps_from_proposal(proposal: dict[str, Any], by_id: dict[str, dict[str, Any]]) -> list[dict[str, Any]]:
        body = proposal.get("body")
        raw_steps = []
        if isinstance(body, dict):
            maybe = body.get("steps")
            if isinstance(maybe, list):
                raw_steps = maybe
        steps = []
        for index, raw in enumerate(raw_steps, start=1):
            if isinstance(raw, str):
                title, source_ids = raw.strip(), []
            elif isinstance(raw, dict):
                title = str(raw.get("title") or raw.get("step") or "").strip()
                source_ids = [str(s) for s in raw.get("source_object_ids") or []]
            else:
                continue
            if not title:
                continue
            known = [s for s in source_ids if s in by_id]
            steps.append({"order": len(steps) + 1, "title": title, "source_object_ids": known,
                          "acceptance_criteria": [], "depends_on": []})
        if not steps:
            # Deterministic fallback: one step per plan_block object, in id
            # order — still provenance-bound, still approval-gated downstream.
            for item in sorted(by_id.values(), key=lambda row: row["id"]):
                if item["kind"] != "plan_block":
                    continue
                steps.append({
                    "order": len(steps) + 1,
                    "title": item["content"].get("title") or item["content"].get("text") or item["id"],
                    "source_object_ids": [item["id"]],
                    "acceptance_criteria": [], "depends_on": [],
                })
        return steps

    @staticmethod
    def _risks_from_canvas(canvas: dict[str, Any]) -> list[dict[str, Any]]:
        risks = []
        for item in canvas.get("objects", []):
            if item["kind"] != "question":
                continue
            risks.append({"kind": "open_question", "text": item["content"].get("text") or item["id"],
                          "source_object_ids": [item["id"]]})
        for edge in canvas.get("connectors", []):
            if edge.get("meaning") == "contradicts":
                risks.append({"kind": "contradiction", "text": f"{edge['source']} ↔ {edge['target']}",
                              "source_object_ids": [edge["source"], edge["target"]]})
        return risks

    @staticmethod
    def _goals_from_canvas(canvas: dict[str, Any]) -> list[str]:
        goals = []
        for item in canvas.get("objects", []):
            if item["kind"] != "decision":
                continue
            goals.append(item["content"].get("text") or item["content"].get("title") or item["id"])
        return goals

    @staticmethod
    def _plan_hash(project_id: str, proposal_id: str, steps: list[dict[str, Any]]) -> str:
        from hashlib import sha256
        payload = json.dumps({"project": project_id, "proposal": proposal_id,
                              "steps": steps}, sort_keys=True, separators=(",", ":"))
        return sha256(payload.encode()).hexdigest()[:32]

    @staticmethod
    def _merge_provider_plan(plan: dict[str, Any], refined: Any) -> dict[str, Any]:
        """Provider output is untrusted: strict shape, refinement only.

        Accepts {steps:[{title, source_object_ids?}...]} and nothing else.
        Anything malformed raises; the caller turns that into an explicit
        failure without writes.
        """
        if not isinstance(refined, dict):
            raise ValueError("plan provider returned a non-object payload")
        proposals = refined.get("proposals")
        if not isinstance(proposals, list) or not proposals:
            raise ValueError("plan provider returned no proposals")
        first = proposals[0]
        if not isinstance(first, dict):
            raise ValueError("plan provider returned a malformed proposal")
        body = first.get("body")
        steps = body.get("steps") if isinstance(body, dict) else None
        if not isinstance(steps, list) or not steps:
            raise ValueError("plan provider returned no steps")
        known = {step["title"] for step in plan["steps"]}
        order = []
        for raw in steps:
            if isinstance(raw, str):
                title = raw.strip()
                source_ids = []
            elif isinstance(raw, dict):
                title = str(raw.get("title") or "").strip()
                source_ids = [str(s) for s in raw.get("source_object_ids") or []]
            else:
                raise ValueError("plan provider returned a malformed step")
            if not title:
                raise ValueError("plan provider returned an empty step title")
            order.append((title, source_ids))
        titles = [title for title, _ in order]
        if len(set(titles)) != len(titles):
            raise ValueError("plan provider returned duplicate steps")
        if not set(titles) <= known:
            raise ValueError("plan provider invented steps outside the approved plan")
        merged = []
        for index, (title, source_ids) in enumerate(order, start=1):
            base = next(step for step in plan["steps"] if step["title"] == title)
            known = {str(s) for s in (plan.get("source_object_ids") or [])}
            known_sources = [s for s in source_ids if s in known]
            merged.append({**base, "order": index, "source_object_ids": known_sources or base["source_object_ids"]})
        return {**plan, "steps": merged}

    # ------------------------------------------------- implementation doc --
    def build_implementation_document(self, project_id: str, plan_id: str) -> str:
        plan = self.get_plan(project_id, plan_id)
        if plan.get("status") not in {"draft", "documented"}:
            raise ValueError("implementation document requires an approved plan")
        lines = [f"# Implementation plan — {project_id}", ""]
        lines.append(f"Source proposal: `{plan.get('proposal_id')}` (canvas revision {plan.get('canvas_revision')}).")
        lines.append("")
        if plan.get("goals"):
            lines += ["## Goals", ""]
            lines += [f"- {goal}" for goal in plan["goals"]] + [""]
        if plan.get("scope"):
            lines += ["## Scope", ""]
            lines += [f"- {item}" for item in plan["scope"]] + [""]
        lines += ["## Tasks", ""]
        for step in plan["steps"]:
            deps = f" (depends on: {', '.join(step['depends_on'])})" if step.get("depends_on") else ""
            lines.append(f"{step['order']}. {step['title']}{deps}")
            for source in step.get("source_object_ids") or []:
                lines.append(f"   - from board object `{source}`")
            for criterion in step.get("acceptance_criteria") or []:
                lines.append(f"   - accept when: {criterion}")
        lines += ["", "## Risks", ""]
        if plan.get("risks"):
            lines += [f"- {risk['kind']}: {risk['text']}" for risk in plan["risks"]]
        else:
            lines.append("- None recorded on the board yet.")
        lines += ["", "## Open questions", ""]
        if plan.get("open_questions"):
            lines += [f"- {question}" for question in plan["open_questions"]]
        else:
            lines.append("- None — every clarifying question on the board has been answered.")
        lines.append("")
        return "\n".join(lines)

    # -------------------------------------------------- backlog creation --
    def create_backlog_items(self, project_id: str, plan_id: str, *, step_orders: list[int], actor: str, work=None) -> dict[str, Any]:
        """Explicit, batch-confirmed creation of backlog items from APPROVED
        plan steps, through the canonical work service (never direct DB
        writes to work tables). ``work`` is the CanonicalWorkService the
        route already holds; it is injected, never constructed ad hoc.
        """
        plan = self.get_plan(project_id, plan_id)
        if plan.get("status") != "documented":
            raise ValueError("backlog items require the implementation document to be saved first")
        if plan.get("canvas_id"):
            self.canvas.require_editable(project_id, plan["canvas_id"])
        if work is None:
            raise ValueError("backlog creation requires the canonical work service")
        if not step_orders:
            raise ValueError("select at least one step to create backlog items from")
        steps_by_order = {step["order"]: step for step in plan["steps"]}
        unknown = [order for order in step_orders if order not in steps_by_order]
        if unknown:
            raise ValueError(f"unknown step(s): {unknown}")
        already = {row["order"] for row in plan.get("backlog_created") or []}
        repeated = sorted(set(step_orders) & already)
        if repeated:
            raise PlanConflictError(f"backlog items already created for step(s): {repeated}")
        created = []
        for order in sorted(set(step_orders)):
            step = steps_by_order[order]
            from ..dockyard import Actor, ActorKind
            actor_object = Actor(id=actor, display_name=actor, kind=ActorKind.HUMAN)
            record = work.create_item(
                project_id,
                "task",
                step["title"],
                actor=actor_object,
                body=f"From plan {plan_id} step {order} (board objects: {', '.join(step.get('source_object_ids') or [])})",
            )
            created.append({"order": order, "ref": record.get("ref") or record.get("id")})
        # Remember what this plan created so a repeat confirm cannot duplicate
        # work items. Stored inside plan_json: no schema change.
        row = self._conn().execute(
            "SELECT plan_json FROM canvas_plans WHERE project_id=? AND plan_id=?",
            (project_id, plan_id),
        ).fetchone()
        stored = json.loads(row["plan_json"])
        stored["backlog_created"] = sorted((stored.get("backlog_created") or []) + created, key=lambda item: item["order"])
        with self.store.tx() as cx:
            cx.execute(
                "UPDATE canvas_plans SET plan_json=?, updated_at=? WHERE project_id=? AND plan_id=?",
                (json.dumps(stored, sort_keys=True), iso(self.store._clock()), project_id, plan_id),
            )
        return {"plan_id": plan_id, "created": created, "backlog_created": stored["backlog_created"]}