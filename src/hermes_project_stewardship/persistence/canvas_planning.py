"""Persistent Phase 8B clarification, proposal and promotion workflow."""
from __future__ import annotations

import json
import uuid
from typing import Any

from .canvas_curation import CanvasCurationService
from .canvas_service import CanvasService
from .store import Store, iso

OUTCOME_ANSWER = "answer"
OUTCOME_SKIP = "skip"
OUTCOME_DEFER = "defer"
OUTCOME_STOP = "stop"
_OUTCOMES = {OUTCOME_ANSWER, OUTCOME_SKIP, OUTCOME_DEFER, OUTCOME_STOP}
# D15: a free-text chat message is recorded in the ledger as its own outcome.
# It is context for the AI only: it never closes a clarification gap.
OUTCOME_MESSAGE = "message"
MAX_MESSAGE = 4000


def _clean_message(message: str | None) -> str:
    text = str(message or "").strip()
    if len(text) > MAX_MESSAGE:
        raise ValueError(f"chat message must be at most {MAX_MESSAGE} characters")
    return text


class CanvasPlanningService:
    """Runs a clarify → propose → decide loop on top of the canvas.

    The ledger is the source of truth for what has been answered: the
    curation contract receives every prior answer (answer / skip) so an
    explicitly resolved gap is never re-asked. A *defer* keeps a gap open,
    so its question is re-presented when curation runs again. Proposals are
    always scratch: deciding them never mutates the canvas.
    """

    def __init__(self, store: Store, provider=None) -> None:
        self.store = store
        self.provider = provider
        self.canvas = CanvasService(store)

    def _ledger_answers(self, canvas_id: str) -> list[dict[str, Any]]:
        # The ledger is per board: an answer on one board never closes a gap
        # on another board of the same project.
        rows = self.store._conn.execute(
            "SELECT answers_json FROM canvas_sessions WHERE canvas_id=? ORDER BY created_at",
            (canvas_id,),
        ).fetchall()
        ledger: list[dict[str, Any]] = []
        for row in rows:
            try:
                ledger.extend(json.loads(row["answers_json"]))
            except (TypeError, ValueError):
                continue
        return ledger

    def _session_at_revision(self, canvas_id: str, canvas_revision: int) -> dict[str, Any] | None:
        rows = self.store._conn.execute(
            "SELECT session_id FROM canvas_sessions WHERE canvas_id=? AND canvas_revision=? ORDER BY created_at",
            (canvas_id, canvas_revision),
        ).fetchall()
        if not rows:
            return None
        return self.get(rows[-1]["session_id"])

    def start(self, project_id: str, *, actor: str, canvas_id: str | None = None,
              message: str | None = None) -> dict[str, Any]:
        text = _clean_message(message)
        current = self.canvas.get(project_id, canvas_id)
        canvas_id = current["canvas_id"]
        self.canvas.require_editable(project_id, canvas_id)
        note = {"outcome": OUTCOME_MESSAGE, "answer": text, "actor": actor} if text else None
        ledger = self._ledger_answers(canvas_id) + ([note] if note else [])
        existing = self._session_at_revision(canvas_id, current["revision"])
        result = CanvasCurationService(self.provider).curate(current, clarifications=ledger, message=text or None)
        questions = result.get("clarifying_questions", [])
        question = questions[0] if questions else None
        status = "active" if question else "complete"
        if existing is not None:
            # Same canvas revision: re-evaluate against the ledger instead of
            # crashing on the UNIQUE(project_id, canvas_revision) constraint.
            # Already-decided proposals stay decided — a re-run never
            # resurrects a rejected proposal.
            answers = [*existing["answers"], note] if note else existing["answers"]
            with self.store.tx() as cx:
                cx.execute(
                    "UPDATE canvas_sessions SET status=?, current_question_json=?, answers_json=?, updated_at=? WHERE session_id=?",
                    (status, json.dumps(question) if question else None, json.dumps(answers, sort_keys=True),
                     iso(self.store._clock()), existing["session_id"]),
                )
            # A new message asks for fresh advice, so its proposals are kept
            # alongside earlier (already decided or pending) ones.
            if status == "complete" and (note or not existing["proposals"]):
                self._store_proposals(existing["session_id"], project_id, canvas_id, current["revision"], result)
            return self.get(existing["session_id"])
        session_id = "canvas-session-" + uuid.uuid4().hex[:16]
        now = iso(self.store._clock())
        with self.store.tx() as cx:
            cx.execute(
                "INSERT INTO canvas_sessions(session_id, project_id, canvas_id, canvas_revision, status, current_question_json, answers_json, created_at, updated_at) VALUES(?,?,?,?,?,?,?,?,?)",
                (session_id, project_id, canvas_id, current["revision"], status, json.dumps(question) if question else None,
                 json.dumps([note] if note else []), now, now),
            )
        # First AI run submits a draft board; later states are never rewound.
        self.canvas.advance(canvas_id, "submitted", only_from=("draft",))
        self._store_proposals(session_id, project_id, canvas_id, current["revision"], result)
        return self.get(session_id)

    def _store_proposals(self, session_id: str, project_id: str, canvas_id: str, canvas_revision: int, result: dict[str, Any]) -> None:
        proposals = result.get("proposals", [])
        if not proposals:
            return
        with self.store.tx() as cx:  # all-or-nothing: never half a proposal set
            for proposal in proposals:
                cx.execute(
                    "INSERT INTO canvas_proposals(proposal_id, project_id, canvas_id, session_id, canvas_revision, proposal_json, status, created_at) VALUES(?,?,?,?,?,?,?,?)",
                    ("canvas-proposal-" + uuid.uuid4().hex[:16], project_id, canvas_id, session_id, canvas_revision, json.dumps(proposal, sort_keys=True), "pending", iso(self.store._clock())),
                )

    def get(self, session_id: str) -> dict[str, Any]:
        row = self.store._conn.execute("SELECT * FROM canvas_sessions WHERE session_id=?", (session_id,)).fetchone()
        if row is None:
            raise ValueError("unknown canvas session")
        proposals = self.store._conn.execute("SELECT * FROM canvas_proposals WHERE session_id=? ORDER BY created_at", (session_id,)).fetchall()
        return {"session_id": row["session_id"], "project_id": row["project_id"], "canvas_id": row["canvas_id"], "canvas_revision": row["canvas_revision"], "status": row["status"], "current_question": json.loads(row["current_question_json"]) if row["current_question_json"] else None, "answers": json.loads(row["answers_json"]), "proposals": [{"proposal_id": p["proposal_id"], "status": p["status"], "canvas_id": p["canvas_id"], **json.loads(p["proposal_json"])} for p in proposals]}

    def answer(self, session_id: str, *, outcome: str, answer: str = "", actor: str) -> dict[str, Any]:
        if outcome not in _OUTCOMES:
            raise ValueError("invalid clarification outcome")
        current = self.get(session_id)
        if current["status"] != "active":
            raise ValueError("canvas session is not active")
        self.canvas.require_editable(current["project_id"], current["canvas_id"])
        answers = [*current["answers"], {"question": current["current_question"], "outcome": outcome, "answer": answer, "actor": actor}]
        status = "stopped" if outcome == OUTCOME_STOP else "complete"
        with self.store.tx() as cx:
            cx.execute("UPDATE canvas_sessions SET status=?, current_question_json=NULL, answers_json=?, updated_at=? WHERE session_id=?", (status, json.dumps(answers, sort_keys=True), iso(self.store._clock()), session_id))
        resolved = current.get("current_question")
        if resolved and outcome in {OUTCOME_ANSWER, OUTCOME_SKIP}:
            # The answer just closed the last open gap: run curation with the
            # updated ledger so its proposals are waiting for review now,
            # instead of hiding behind the next manual re-run.
            canvas = self.canvas.get(current["project_id"], current["canvas_id"])
            result = CanvasCurationService(self.provider).curate(
                canvas,
                clarifications=self._ledger_answers(current["canvas_id"]),
            )
            self._store_proposals(session_id, current["project_id"], current["canvas_id"], canvas["revision"], result)
        return self.get(session_id)

    def decide(self, proposal_id: str, *, approve: bool, actor: str,
               project_id: str | None = None) -> dict[str, Any]:
        row = self.store._conn.execute("SELECT * FROM canvas_proposals WHERE proposal_id=?", (proposal_id,)).fetchone()
        # A proposal from another project reads exactly like a missing one.
        if row is None or (project_id is not None and row["project_id"] != project_id):
            raise ValueError("unknown canvas proposal")
        if row["canvas_id"]:
            # Decisions on a completed/archived board's proposals are refused.
            CanvasService(self.store).require_editable(row["project_id"], row["canvas_id"])
        status = "approved" if approve else "rejected"
        with self.store.tx() as cx:
            updated = cx.execute("UPDATE canvas_proposals SET status=?, decided_at=?, decided_by=? WHERE proposal_id=? AND status='pending'", (status, iso(self.store._clock()), actor, proposal_id)).rowcount
            if updated != 1:
                raise ValueError("canvas proposal is not pending")
        return {"proposal_id": proposal_id, "status": status}