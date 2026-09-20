import pytest

from hermes_project_stewardship.persistence.canvas_planning import CanvasPlanningService
from hermes_project_stewardship.persistence.canvas_service import CanvasService


def test_clarification_session_is_persistent_and_answerable(store, enabled):
    canvas = CanvasService(store)
    current = canvas.create_document(enabled, actor="sahil")
    canvas.save(enabled, expected_revision=current["revision"], objects=[
        {"id": "n1", "kind": "note", "content": {"text": "A rough idea"}},
    ], connectors=[], actor="sahil")
    planning = CanvasPlanningService(store)
    session = planning.start(enabled, actor="sahil")
    assert session["status"] == "active"
    assert session["current_question"]
    loaded = planning.get(session["session_id"])
    assert loaded["current_question"] == session["current_question"]
    answered = planning.answer(session["session_id"], outcome="answer", answer="Build a reviewable import flow", actor="sahil")
    assert answered["status"] == "complete"
    assert answered["answers"][0]["outcome"] == "answer"


def test_proposal_decision_is_idempotent_and_does_not_mutate_canvas(store, enabled):
    canvas = CanvasService(store)
    current = canvas.create_document(enabled, actor="sahil")
    saved = canvas.save(enabled, expected_revision=current["revision"], objects=[
        {"id": "e1", "kind": "evidence", "content": {"text": "Users need preview"}},
        {"id": "c1", "kind": "claim", "content": {"text": "Preview reduces bad imports"}},
        {"id": "p1", "kind": "plan_block", "content": {"title": "Import preview"}},
    ], connectors=[], actor="sahil")
    planning = CanvasPlanningService(store)
    session = planning.start(enabled, actor="sahil")
    assert session["proposals"]
    proposal_id = session["proposals"][0]["proposal_id"]
    decision = planning.decide(proposal_id, approve=True, actor="sahil")
    assert decision["status"] == "approved"
    with pytest.raises(ValueError, match="pending"):
        planning.decide(proposal_id, approve=False, actor="sahil")
    assert CanvasService(store).get(enabled)["revision"] == saved["revision"]
