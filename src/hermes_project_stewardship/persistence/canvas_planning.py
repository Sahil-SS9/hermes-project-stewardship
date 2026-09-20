"""Persistent Phase 8B clarification, proposal and promotion workflow."""
from __future__ import annotations

import json
import uuid
from typing import Any

from .canvas_curation import CanvasCurationService
from .canvas_service import CanvasService
from .store import Store, iso


class CanvasPlanningService:
    def __init__(self, store: Store, provider=None) -> None:
        self.store = store
        self.provider = provider
        self.canvas = CanvasService(store)

    def start(self, project_id: str, *, actor: str) -> dict[str, Any]:
        current = self.canvas.get(project_id)
        now = iso(self.store._clock())
        session_id = "canvas-session-" + uuid.uuid4().hex[:16]
        result = CanvasCurationService(self.provider).curate(current)
        questions = result.get("clarifying_questions", [])
        question = questions[0] if questions else None
        status = "active" if question else "complete"
        with self.store.tx() as cx:
            cx.execute(
                "INSERT INTO canvas_sessions(session_id, project_id, canvas_revision, status, current_question_json, answers_json, created_at, updated_at) VALUES(?,?,?,?,?,?,?,?)",
                (session_id, project_id, current["revision"], status, json.dumps(question) if question else None, "[]", now, now),
            )
            for proposal in result.get("proposals", []):
                cx.execute(
                    "INSERT INTO canvas_proposals(proposal_id, project_id, session_id, canvas_revision, proposal_json, status, created_at) VALUES(?,?,?,?,?,?,?)",
                    ("canvas-proposal-" + uuid.uuid4().hex[:16], project_id, session_id, current["revision"], json.dumps(proposal, sort_keys=True), "pending", now),
                )
        return self.get(session_id)

    def get(self, session_id: str) -> dict[str, Any]:
        row = self.store._conn.execute("SELECT * FROM canvas_sessions WHERE session_id=?", (session_id,)).fetchone()
        if row is None:
            raise ValueError("unknown canvas session")
        proposals = self.store._conn.execute("SELECT * FROM canvas_proposals WHERE session_id=? ORDER BY created_at", (session_id,)).fetchall()
        return {"session_id": row["session_id"], "project_id": row["project_id"], "canvas_revision": row["canvas_revision"], "status": row["status"], "current_question": json.loads(row["current_question_json"]) if row["current_question_json"] else None, "answers": json.loads(row["answers_json"]), "proposals": [{"proposal_id": p["proposal_id"], "status": p["status"], **json.loads(p["proposal_json"])} for p in proposals]}

    def answer(self, session_id: str, *, outcome: str, answer: str = "", actor: str) -> dict[str, Any]:
        if outcome not in {"answer", "skip", "defer", "stop"}:
            raise ValueError("invalid clarification outcome")
        current = self.get(session_id)
        if current["status"] != "active":
            raise ValueError("canvas session is not active")
        answers = [*current["answers"], {"question": current["current_question"], "outcome": outcome, "answer": answer, "actor": actor}]
        status = "stopped" if outcome == "stop" else "complete"
        with self.store.tx() as cx:
            cx.execute("UPDATE canvas_sessions SET status=?, current_question_json=NULL, answers_json=?, updated_at=? WHERE session_id=?", (status, json.dumps(answers, sort_keys=True), iso(self.store._clock()), session_id))
        return self.get(session_id)

    def decide(self, proposal_id: str, *, approve: bool, actor: str) -> dict[str, Any]:
        row = self.store._conn.execute("SELECT * FROM canvas_proposals WHERE proposal_id=?", (proposal_id,)).fetchone()
        if row is None:
            raise ValueError("unknown canvas proposal")
        status = "approved" if approve else "rejected"
        with self.store.tx() as cx:
            updated = cx.execute("UPDATE canvas_proposals SET status=?, decided_at=?, decided_by=? WHERE proposal_id=? AND status='pending'", (status, iso(self.store._clock()), actor, proposal_id)).rowcount
            if updated != 1:
                raise ValueError("canvas proposal is not pending")
        return {"proposal_id": proposal_id, "status": status}
