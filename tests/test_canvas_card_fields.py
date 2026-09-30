"""Stage 1 card fields: per-kind fields, links, members, images (owner 30/09).

Owner decisions: 3b new kinds risk + assumption; 4a fields a kind does not use
are kept (hidden), never deleted; 5b owners are project members or unassigned;
1a images now (existing safe upload), video later; 2a no link previews.
"""
from __future__ import annotations

import base64

import pytest

from hermes_project_stewardship.persistence.canvas_service import CanvasService

PNG = base64.b64decode(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="
)


def _board(service, project):
    return service.create_board(project, name="Fields", actor="sahil")


def _save(service, project, board, content, kind="note"):
    return service.save(project, canvas_id=board["canvas_id"], expected_revision=board["revision"],
                        objects=[{"id": "o1", "kind": kind, "content": content, "x": 0, "y": 0}],
                        connectors=[], actor="sahil")


def _member(store, project, slug="octacon"):
    with store.tx() as cx:
        cx.execute("INSERT OR IGNORE INTO project_members(project_id, profile_slug, role, state)"
                   " VALUES(?,?,'member','active')", (project, slug))


@pytest.mark.parametrize("kind", ["risk", "assumption"])
def test_new_kinds_are_accepted(store, enabled, kind):
    service = CanvasService(store)
    saved = _save(service, enabled, _board(service, enabled), {"text": "Import may time out"}, kind=kind)
    assert saved["objects"][0]["kind"] == kind


def test_full_decision_card_round_trips(store, enabled):
    _member(store, enabled)
    service = CanvasService(store)
    content = {
        "text": "Use SQLite", "description": "Local-first, one file.",
        "decision_status": "accepted", "rationale": "No server to run",
        "alternatives": ["Postgres", " ", "Files"], "decided_by": "octacon", "decided_on": "2026-09-30",
        "links": [{"url": "https://sqlite.org", "label": "Docs"}, {"url": "  "}, {"url": "https://x.test/a"}],
    }
    got = _save(service, enabled, _board(service, enabled), content, kind="decision")["objects"][0]["content"]
    assert got["alternatives"] == ["Postgres", "Files"]            # blank line dropped
    assert got["links"] == [{"url": "https://sqlite.org", "label": "Docs"}, {"url": "https://x.test/a"}]
    assert got["decided_by"] == "octacon" and got["decision_status"] == "accepted"


def test_changing_kind_keeps_hidden_fields(store, enabled):
    service = CanvasService(store)
    board = _board(service, enabled)
    saved = _save(service, enabled, board, {"text": "Q", "question_status": "answered", "answer": "Yes"},
                  kind="question")
    back = service.save(enabled, canvas_id=board["canvas_id"], expected_revision=saved["revision"],
                        objects=[{**saved["objects"][0], "kind": "note"}], connectors=[], actor="sahil")
    assert back["objects"][0]["content"]["answer"] == "Yes"  # 4a: hidden, not deleted


def test_empty_values_mean_unset_including_unassigned_owner(store, enabled):
    service = CanvasService(store)
    got = _save(service, enabled, _board(service, enabled), {"text": "Step", "owner": "", "due_on": None},
                kind="plan_block")["objects"][0]["content"]
    assert got == {"text": "Step"}


def test_checklist_is_validated_and_blank_items_dropped(store, enabled):
    service = CanvasService(store)
    got = _save(service, enabled, _board(service, enabled),
                {"text": "S", "checklist": [{"text": "a", "done": True}, {"text": " "}, {"text": "b"}]},
                kind="plan_block")["objects"][0]["content"]
    assert got["checklist"] == [{"text": "a", "done": True}, {"text": "b", "done": False}]


@pytest.mark.parametrize("content, message", [
    ({"decision_status": "maybe"}, "decision_status"),
    ({"confidence": "certain"}, "confidence"),
    ({"due_on": "30/09/2026"}, "date"),
    ({"description": "x" * 20001}, "description"),
    ({"links": [{"url": "javascript:alert(1)"}]}, "http"),
    ({"links": [{"url": "data:text/html,hi"}]}, "http"),
    ({"links": [{"url": "https://ok.test/" }] * 21}, "at most 20"),
    ({"url": "file:///etc/passwd"}, "http"),
    ({"checklist": [{"text": "a", "done": "yes"}]}, "checklist"),
    ({"alternatives": "Postgres"}, "alternatives"),
    ({"content_id": "../../etc/passwd"}, "uploaded"),
    ({"legacy": "y" * (70 * 1024)}, "64 KB"),
])
def test_bad_fields_are_refused(store, enabled, content, message):
    service = CanvasService(store)
    with pytest.raises(ValueError, match=message):
        _save(service, enabled, _board(service, enabled), content)


def test_owner_must_be_a_project_member(store, enabled):
    service = CanvasService(store)
    with pytest.raises(ValueError, match="not a member"):
        _save(service, enabled, _board(service, enabled), {"text": "S", "owner": "stranger"}, kind="plan_block")


def test_image_must_be_this_projects_uploaded_image(store, svc, enabled):
    service = CanvasService(store)
    board = _board(service, enabled)
    text = svc.upload_project_content(enabled, filename="n.txt", media_type="text/plain", content=b"hi")
    with pytest.raises(ValueError, match="uploaded image"):
        _save(service, enabled, board, {"content_id": "CONTENT-" + "0" * 16}, kind="media")
    with pytest.raises(ValueError, match="uploaded image"):
        _save(service, enabled, board, {"content_id": text["content_id"]}, kind="media")
    image = svc.upload_project_content(enabled, filename="p.png", media_type="image/png", content=PNG)
    saved = _save(service, enabled, board, {"content_id": image["content_id"], "alt": "a dot"}, kind="media")
    assert saved["objects"][0]["content"]["content_id"] == image["content_id"]


def test_image_route_returns_verified_bytes_only_for_images(svc, enabled):
    image = svc.upload_project_content(enabled, filename="p.png", media_type="image/png", content=PNG)
    got = svc.project_content_image(enabled, image["content_id"])
    assert base64.b64decode(got["data_base64"]) == PNG and got["media_type"] == "image/png"
    text = svc.upload_project_content(enabled, filename="n.txt", media_type="text/plain", content=b"hi")
    with pytest.raises(Exception, match="not an image"):
        svc.project_content_image(enabled, text["content_id"])


def test_existing_text_only_boards_still_save(store, enabled):
    service = CanvasService(store)
    saved = _save(service, enabled, _board(service, enabled), {"text": "old", "title": "t", "url": "https://a.b"},
                  kind="link")
    assert saved["objects"][0]["content"]["url"] == "https://a.b"
