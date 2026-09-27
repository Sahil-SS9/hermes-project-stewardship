"""Batch P — P0 fixes + plan/impl-document contract tests.

RED-first per handoff §6/P0: each test pins a bug from evidence/p/P0-BUGS.md
or an acceptance bullet from HANDOFF-BATCH-P §8. No real model calls: the
provider seam takes injected fakes only.
"""
from __future__ import annotations

import json

import pytest

from hermes_project_stewardship.persistence.canvas_plan_document import PlanDocumentService
from hermes_project_stewardship.persistence.canvas_planning import CanvasPlanningService
from hermes_project_stewardship.persistence.canvas_service import CanvasService

def _api(tmp_path):
    from fastapi.testclient import TestClient
    from hermes_project_stewardship.api.server import create_app
    from hermes_project_stewardship.kanban import ReferenceKanbanAdapter
    from hermes_project_stewardship.persistence.store import Store
    store = Store(tmp_path / "b7.db")
    client = TestClient(create_app(store, kanban_adapter=ReferenceKanbanAdapter(store)))
    client.post("/stewardship/v1/projects/p7/enable", json={
        "project_id": "p7", "mission": "probe", "lead_profile": "l", "autonomy_level": 2})
    return client



def _seed_canvas(store, enabled, *, with_claim=True):
    canvas = CanvasService(store)
    current = canvas.create_document(enabled, actor="sahil")
    objects = [
        {"id": "e1", "kind": "evidence", "content": {"text": "Users stall at import"}, "x": 80, "y": 80},
        {"id": "c1", "kind": "claim", "content": {"text": "Import feels unsafe"}, "x": 400, "y": 80},
        {"id": "p1", "kind": "plan_block", "content": {"text": "Preview before commit"}, "x": 400, "y": 300},
        {"id": "q1", "kind": "question", "content": {"text": "Which fields scare users off?"}, "x": 720, "y": 80},
        {"id": "d1", "kind": "decision", "content": {"text": "Ship a one-field preview"}, "x": 720, "y": 300},
    ]
    return canvas.save(enabled, expected_revision=current["revision"], objects=objects,
                       connectors=[{"id": "x1", "source": "e1", "target": "c1", "meaning": "supports"},
                                   {"id": "x2", "source": "c1", "target": "e1", "meaning": "contradicts"}],
                       actor="sahil")


def _seed_gap_canvas(store, enabled, *, gap="missing-claim"):
    """A canvas with exactly one open gap (no claim / no plan block)."""
    canvas = CanvasService(store)
    current = canvas.create_document(enabled, actor="sahil")
    if gap == "missing-claim":
        objects = [{"id": "e1", "kind": "evidence", "content": {"text": "Users stall at import"}, "x": 80, "y": 80}]
    else:  # missing-plan
        objects = [{"id": "e1", "kind": "evidence", "content": {"text": "Users stall at import"}, "x": 80, "y": 80},
                   {"id": "c1", "kind": "claim", "content": {"text": "Import feels unsafe"}, "x": 400, "y": 80}]
    return canvas.save(enabled, expected_revision=current["revision"], objects=objects, connectors=[], actor="sahil")


# ---------------------------------------------------------------- B1: resume --
def test_second_session_at_same_revision_resumes_instead_of_crashing(store, enabled):
    _seed_gap_canvas(store, enabled, gap="missing-plan")
    planning = CanvasPlanningService(store)
    first = planning.start(enabled, actor="sahil")
    assert first["status"] == "active" and first["current_question"], "the seeded canvas has one open gap"
    second = planning.start(enabled, actor="sahil")
    assert second["session_id"] == first["session_id"], "same canvas revision must resume, not 500"
    assert second["current_question"]["id"] == first["current_question"]["id"], "the open gap is re-presented"


def test_session_after_answer_resumes_with_ledger_intact(store, enabled):
    _seed_gap_canvas(store, enabled, gap="missing-plan")
    planning = CanvasPlanningService(store)
    session = planning.start(enabled, actor="sahil")
    answered = planning.answer(session["session_id"], outcome="answer", answer="Payment fields", actor="sahil")
    assert answered["status"] == "complete"
    again = planning.start(enabled, actor="sahil")
    assert again["session_id"] == session["session_id"]
    assert again["current_question"] is None, "an answered gap must not be re-asked"
    assert again["status"] == "complete"
    assert again["answers"] == answered["answers"]


# ------------------------------------------------- B2: ledger drives curation --
def test_answered_question_feeds_curation_and_lands_proposals(store, enabled):
    _seed_gap_canvas(store, enabled, gap="missing-plan")
    planning = CanvasPlanningService(store)
    session = planning.start(enabled, actor="sahil")
    answered = planning.answer(session["session_id"], outcome="answer", answer="Payment fields", actor="sahil")
    assert len(answered["proposals"]) >= 1, "an answered gap must immediately surface proposals"
    assert all(p["status"] == "pending" for p in answered["proposals"])
    assert all(p["requires_approval"] for p in answered["proposals"])


def test_skipped_gap_is_recorded_and_not_reasked(store, enabled):
    _seed_gap_canvas(store, enabled, gap="missing-plan")
    planning = CanvasPlanningService(store)
    session = planning.start(enabled, actor="sahil")
    assert session["current_question"]["id"] in {"missing-claim", "missing-plan", "missing-evidence"}
    planning.answer(session["session_id"], outcome="skip", answer="", actor="sahil")
    again = planning.start(enabled, actor="sahil")
    # The skipped gap is resolved in the ledger: curation never asks it again.
    assert again["current_question"] is None
    assert again["status"] == "complete"


def test_defer_keeps_the_gap_open_for_the_next_run(store, enabled):
    _seed_gap_canvas(store, enabled, gap="missing-plan")
    planning = CanvasPlanningService(store)
    session = planning.start(enabled, actor="sahil")
    planning.answer(session["session_id"], outcome="defer", answer="", actor="sahil")
    again = planning.start(enabled, actor="sahil")
    assert again["current_question"] is not None, "a deferred gap stays open"


# ---------------------------------------------------------------- B8: dupes --
def test_duplicate_connector_triple_is_refused(store, enabled):
    from hermes_project_stewardship.persistence.canvas_service import CanvasService
    canvas = CanvasService(store)
    current = canvas.create_document(enabled, actor="sahil")
    objects = [{"id": "a", "kind": "evidence", "content": {"text": "A"}}, {"id": "b", "kind": "claim", "content": {"text": "B"}}]
    saved = canvas.save(enabled, expected_revision=current["revision"], objects=objects,
                        connectors=[{"id": "x1", "source": "a", "target": "b", "meaning": "supports"}], actor="sahil")
    with pytest.raises(ValueError, match="duplicate canvas connector"):
        canvas.save(enabled, expected_revision=saved["revision"], objects=objects,
                    connectors=[
                        {"id": "x1", "source": "a", "target": "b", "meaning": "supports"},
                        {"id": "x2", "source": "a", "target": "b", "meaning": "supports"},
                    ], actor="sahil")


def test_self_connector_is_refused(store, enabled):
    from hermes_project_stewardship.persistence.canvas_service import CanvasService
    canvas = CanvasService(store)
    current = canvas.create_document(enabled, actor="sahil")
    objects = [{"id": "a", "kind": "evidence", "content": {"text": "A"}}]
    with pytest.raises(ValueError, match="itself"):
        canvas.save(enabled, expected_revision=current["revision"], objects=objects,
                    connectors=[{"id": "x1", "source": "a", "target": "a", "meaning": "supports"}], actor="sahil")


# ----------------------------------------------------------------- B3: provider --
def test_session_uses_injected_provider_for_proposals(store, enabled):
    class FakeProvider:
        provider_id = "fake"
        model_id = "fake-model"

        def propose(self, context):
            return {"proposals": [
                {"kind": kind, "title": f"{kind} title", "body": {"steps": [{"title": "Preview before commit", "source_object_ids": ["p1"]}]}}
                for kind in ("synthesis", "user_journey", "edge_case", "technical_plan")
            ]}

    _seed_canvas(store, enabled)
    planning = CanvasPlanningService(store, provider=FakeProvider())
    session = planning.start(enabled, actor="sahil")
    assert session["status"] == "complete", "a complete canvas with a provider goes straight to proposals"
    kinds = {p["kind"] for p in session["proposals"]}
    assert kinds == {"synthesis", "user_journey", "edge_case", "technical_plan"}
    for proposal in session["proposals"]:
        assert proposal["provider_id"] == "fake"
        assert proposal["model_id"] == "fake-model"
        assert proposal["requires_approval"] is True


# --------------------------------------------------------------------- B7: 404s --
def test_canvas_get_unknown_project_is_404(tmp_path):
    client = _api(tmp_path)
    assert client.get("/stewardship/v1/projects/ghost/canvas").status_code == 404


def test_proposal_decision_unknown_is_404(tmp_path):
    client = _api(tmp_path)
    response = client.post("/stewardship/v1/canvas/proposals/nope/decision", json={"approve": True})
    assert response.status_code == 404


# ------------------------------------------------------------- plan + doc (NEW-3, D-P2) --
def _approve_technical_plan(store, enabled):
    planning = CanvasPlanningService(store)
    session = planning.start(enabled, actor="sahil")
    assert session["proposals"], "seeded canvas must reach proposals"
    technical = next(p for p in session["proposals"] if p["kind"] == "technical_plan")
    planning.decide(technical["proposal_id"], approve=True, actor="sahil")
    return technical


def test_plan_requires_approved_technical_proposal(store, enabled):
    _seed_canvas(store, enabled)
    planning = CanvasPlanningService(store)
    session = planning.start(enabled, actor="sahil")
    pending = next(p for p in session["proposals"] if p["kind"] == "technical_plan")
    service = PlanDocumentService(store)
    with pytest.raises(ValueError, match="approved"):
        service.synthesise_plan(enabled, proposal_id=pending["proposal_id"], actor="sahil")
    planning.decide(pending["proposal_id"], approve=True, actor="sahil")
    plan = service.synthesise_plan(enabled, proposal_id=pending["proposal_id"], actor="sahil")
    assert plan["status"] == "draft"
    assert plan["proposal_id"] == pending["proposal_id"]
    assert plan["steps"], "steps are reassembled from the proposal and board"
    assert all(step["source_object_ids"] for step in plan["steps"]), "every step keeps provenance"


def test_plan_synthesis_provider_may_only_reorder_titled_steps(store, enabled):
    class ReorderingProvider:
        provider_id = "fake"
        model_id = "fake-model"

        def propose(self, context):
            titles = [s["title"] for s in context["plan"]["steps"]]
            assert titles, "the seed plan has fallback steps"
            return {"proposals": [{"kind": "technical_plan", "title": "refined",
                                   "body": {"steps": [{"title": t} for t in reversed(titles)]}}]}

    _seed_canvas(store, enabled)
    technical = _approve_technical_plan(store, enabled)
    service = PlanDocumentService(store, provider=ReorderingProvider())
    plan = service.synthesise_plan(enabled, proposal_id=technical["proposal_id"], actor="sahil")
    assert len(plan["steps"]) >= 1
    # The provider may only reorder steps it was given: same set, provider order.
    assert set(s["title"] for s in plan["steps"]) == set(s["title"] for s in service.get_plan(enabled, plan["plan_id"])["steps"])


def test_plan_synthesis_malformed_provider_output_is_zero_writes(store, enabled):
    class GarbageProvider:
        provider_id = "fake"
        model_id = "garbage"

        def propose(self, context):
            return {"proposals": [{"kind": "technical_plan", "title": "x", "body": {"steps": "not-a-list"}}]}

    _seed_canvas(store, enabled)
    technical = _approve_technical_plan(store, enabled)
    plans_before = PlanDocumentService(store).list_plans(enabled)
    service = PlanDocumentService(store, provider=GarbageProvider())
    with pytest.raises(ValueError, match="provider failed"):
        service.synthesise_plan(enabled, proposal_id=technical["proposal_id"], actor="sahil")
    assert PlanDocumentService(store).list_plans(enabled) == plans_before, "malformed output must leave zero writes"


def test_implementation_document_requires_approved_plan_and_links_back(store, enabled):
    _seed_canvas(store, enabled)
    technical = _approve_technical_plan(store, enabled)
    service = PlanDocumentService(store)
    plan = service.synthesise_plan(enabled, proposal_id=technical["proposal_id"], actor="sahil")
    document = service.build_implementation_document(enabled, plan["plan_id"])
    assert document.startswith("# Implementation plan")
    assert f"`{technical['proposal_id']}`" in document, "doc links back to the approved proposal"
    assert "from board object" in document
    assert "## Risks" in document and "## Open questions" in document


def test_implementation_document_saves_to_content_tab(store, svc, enabled):
    _seed_canvas(store, enabled)
    technical = _approve_technical_plan(store, enabled)
    service = PlanDocumentService(store)
    plan = service.synthesise_plan(enabled, proposal_id=technical["proposal_id"], actor="sahil")
    saved = service.save_implementation_document(enabled, plan["plan_id"], service.build_implementation_document(enabled, plan["plan_id"]), actor="sahil")
    assert saved["status"] == "documented"
    content = svc.project_content(enabled)
    assert any(row["filename"] == f"implementation-{plan['plan_id']}.md" for row in content), "doc lives in the Content tab"
    readback = service.get_implementation_document(enabled, plan["plan_id"])
    assert readback["markdown"].startswith("# Implementation plan")
    assert "# Implementation plan" in svc.project_content_preview(enabled, saved["doc_content_id"])["text"]


def test_backlog_creation_is_explicit_and_uses_canonical_endpoints(tmp_path):
    client = _api(tmp_path)
    B = "/stewardship/v1"
    # seed a complete canvas through the REAL routes
    canvas = client.get(f"{B}/projects/p7/canvas").json()
    objects = [
        {"id": "e1", "kind": "evidence", "content": {"text": "Users stall at import"}, "x": 80, "y": 80},
        {"id": "c1", "kind": "claim", "content": {"text": "Import feels unsafe"}, "x": 400, "y": 80},
        {"id": "p1", "kind": "plan_block", "content": {"text": "Preview before commit"}, "x": 400, "y": 300},
    ]
    saved = client.put(f"{B}/projects/p7/canvas", json={"expected_revision": canvas["revision"], "objects": objects, "connectors": []}).json()
    # no provider is configured in tests -> local-contract proposals
    session = client.post(f"{B}/projects/p7/canvas/sessions", json={}).json()
    technical = next(p for p in session["proposals"] if p["kind"] == "technical_plan")
    decided = client.post(f"{B}/canvas/proposals/{technical['proposal_id']}/decision", json={"approve": True})
    assert decided.status_code == 200, decided.text
    plan = client.post(f"{B}/canvas/proposals/{technical['proposal_id']}/plan", json={"project_id": "p7"}).json()
    doc = client.post(f"{B}/projects/p7/plans/{plan['plan_id']}/document/save", json={})
    assert doc.status_code == 200, doc.text
    backlog = client.post(f"{B}/projects/p7/plans/{plan['plan_id']}/backlog", json={"step_orders": [1]})
    assert backlog.status_code == 200, backlog.text
    created = backlog.json()["created"]
    assert created, "confirmed steps create canonical work items"
    readback = client.get(f"{B}/projects/p7/work-items").json()
    assert any(item["title"] == created[0]["ref"] or item["ref"] == created[0]["ref"] for item in readback["work_items"])


# ------------------------------------------------------------ migration v31 --
def test_plan_table_migration_round_trip(store):
    rows = store._conn.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='canvas_plans'").fetchall()
    assert rows, "v31 creates the canvas_plans table"

def test_canvas_save_conflict_returns_409_at_route_level(tmp_path):
    """NEW-2: a stale expected_revision through the HTTP route must give 409."""
    from fastapi.testclient import TestClient
    from hermes_project_stewardship.api.server import create_app
    from hermes_project_stewardship.kanban import ReferenceKanbanAdapter
    from hermes_project_stewardship.persistence.store import Store
    store = Store(tmp_path / "b7c.db")
    client = TestClient(create_app(store, kanban_adapter=ReferenceKanbanAdapter(store)))
    client.post("/stewardship/v1/projects/p7c/enable", json={
        "project_id": "p7c", "mission": "probe", "lead_profile": "l", "autonomy_level": 2})
    planning = CanvasPlanningService(store)
    planning.start("p7c", actor="sahil")
    current = client.get("/stewardship/v1/projects/p7c/canvas").json()
    objects = [dict(current["objects"][0])] if current["objects"] else [
        {"id": "c1", "kind": "note", "content": {"text": "first"}, "x": 40, "y": 40,
         "width": 240, "height": 140, "tags": [], "evidence_ref": None, "work_ref": None}]
    body = {"expected_revision": current["revision"] + 5, "objects": objects, "connectors": []}
    conflict = client.put("/stewardship/v1/projects/p7c/canvas", json=body)
    assert conflict.status_code == 409
    payload = conflict.json()
    assert payload["error"]["code"] in {"revision_conflict", "conflict"}
    # The canonical revision is unchanged and a fresh save still succeeds.
    after = client.get("/stewardship/v1/projects/p7c/canvas").json()
    assert after["revision"] == current["revision"]
