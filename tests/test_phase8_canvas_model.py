"""Phase 8A contract tests — RED-first canvas persistence seam.

These tests intentionally target the public service contract before the
implementation exists. They are the first behavioural witness for the new
persisted evidence canvas; no source-text assertions are used.
"""
from __future__ import annotations

import pytest

from hermes_project_stewardship.persistence.canvas_service import (
    CanvasConflictError,
    CanvasService,
)


def test_canvas_round_trip_and_safe_reference_delete(store, svc, enabled):
    """A visual delete removes only the canvas reference, never canonical work."""
    service = CanvasService(store)
    created = service.create_document(enabled, actor="sahil")
    saved = service.save(
        enabled,
        expected_revision=created["revision"],
        objects=[
            {
                "id": "evidence-1",
                "kind": "evidence",
                "content": {"text": "Users need an import preview."},
            },
            {
                "id": "plan-1",
                "kind": "plan_block",
                "content": {"title": "Preview before commit"},
            },
        ],
        connectors=[
            {"id": "edge-1", "source": "evidence-1", "target": "plan-1", "meaning": "supports"}
        ],
        actor="sahil",
    )

    assert saved["revision"] == 2
    loaded = service.get(enabled)
    assert loaded["objects"][0]["content"]["text"] == "Users need an import preview."
    assert loaded["connectors"][0]["meaning"] == "supports"

    deleted = service.remove_object(
        enabled, "evidence-1", expected_revision=2, actor="sahil"
    )
    assert deleted["revision"] == 3
    assert service.get(enabled)["connectors"] == []


def test_canvas_stale_write_is_refused_without_partial_mutation(store, svc, enabled):
    service = CanvasService(store)
    created = service.create_document(enabled, actor="sahil")
    service.save(
        enabled,
        expected_revision=created["revision"],
        objects=[{"id": "evidence-1", "kind": "evidence", "content": {"text": "A"}}],
        connectors=[],
        actor="sahil",
    )

    with pytest.raises(CanvasConflictError):
        service.save(
            enabled,
            expected_revision=1,
            objects=[{"id": "evidence-2", "kind": "evidence", "content": {"text": "stale"}}],
            connectors=[],
            actor="sahil",
        )

    current = service.get(enabled)
    assert current["revision"] == 2
    assert [row["id"] for row in current["objects"]] == ["evidence-1"]


def test_canvas_rejects_unknown_connector_meaning(store, svc, enabled):
    service = CanvasService(store)
    created = service.create_document(enabled, actor="sahil")
    with pytest.raises(ValueError, match="connector meaning"):
        service.save(
            enabled,
            expected_revision=created["revision"],
            objects=[
                {"id": "a", "kind": "evidence", "content": {"text": "A"}},
                {"id": "b", "kind": "claim", "content": {"text": "B"}},
            ],
            connectors=[{"id": "x", "source": "a", "target": "b", "meaning": "invented"}],
            actor="sahil",
        )
