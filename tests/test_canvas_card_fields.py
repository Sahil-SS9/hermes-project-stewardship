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


# --- Quan Stage 1 review fixes: stale stored data never blocks a save ------

def _stored(store, board, objects):
    import json as _json
    with store.tx() as cx:
        cx.execute("UPDATE project_canvases SET objects_json=? WHERE canvas_id=?",
                   (_json.dumps(objects), board["canvas_id"]))


def test_h1_image_on_a_card_cannot_be_removed(store, svc, enabled):
    service = CanvasService(store)
    board = _board(service, enabled)
    image = svc.upload_project_content(enabled, filename="p.png", media_type="image/png", content=PNG)
    _save(service, enabled, board, {"content_id": image["content_id"]}, kind="media")
    deps = svc.project_content_dependencies(enabled, image["content_id"])
    assert {"kind": "canvas", "ref": board["canvas_id"]} in deps
    with pytest.raises(Exception):
        svc.remove_project_content(enabled, image["content_id"], actor="sahil")


def test_h1_board_with_a_dangling_image_still_saves_and_card_can_be_removed(store, enabled):
    service = CanvasService(store)
    board = _board(service, enabled)
    _stored(store, board, [{"id": "o1", "kind": "media", "content": {"content_id": "CONTENT-" + "A" * 16}, "x": 0, "y": 0}])
    current = service.get_board(enabled, board["canvas_id"])
    saved = service.save(enabled, canvas_id=board["canvas_id"], expected_revision=current["revision"],
                         objects=[*current["objects"], {"id": "o2", "kind": "note", "content": {"text": "new"}, "x": 5, "y": 5}],
                         connectors=[], actor="sahil")
    assert len(saved["objects"]) == 2
    gone = service.remove_object(enabled, "o1", expected_revision=saved["revision"], actor="sahil",
                                 canvas_id=board["canvas_id"])
    assert [o["id"] for o in gone["objects"]] == ["o2"]
    # But pointing a card at a missing image is still refused.
    with pytest.raises(ValueError, match="uploaded image"):
        service.save(enabled, canvas_id=board["canvas_id"], expected_revision=gone["revision"],
                     objects=[{"id": "o3", "kind": "media", "content": {"content_id": "CONTENT-" + "B" * 16}, "x": 0, "y": 0}],
                     connectors=[], actor="sahil")


def test_h2_board_naming_a_former_member_still_saves(store, enabled):
    service = CanvasService(store)
    board = _board(service, enabled)
    _stored(store, board, [{"id": "o1", "kind": "plan_block", "content": {"text": "S", "owner": "renamed-away"}, "x": 0, "y": 0}])
    current = service.get_board(enabled, board["canvas_id"])
    moved = [{**current["objects"][0], "x": 40}]
    saved = service.save(enabled, canvas_id=board["canvas_id"], expected_revision=current["revision"],
                         objects=moved, connectors=[], actor="sahil")
    assert saved["objects"][0]["content"]["owner"] == "renamed-away"
    with pytest.raises(ValueError, match="not a member"):
        service.save(enabled, canvas_id=board["canvas_id"], expected_revision=saved["revision"],
                     objects=[{**moved[0], "content": {"text": "S", "owner": "another-stranger"}}],
                     connectors=[], actor="sahil")


def test_h3_long_titles_save(store, enabled):
    service = CanvasService(store)
    got = _save(service, enabled, _board(service, enabled), {"text": "t" * 4000})
    assert len(got["objects"][0]["content"]["text"]) == 4000
    with pytest.raises(ValueError, match="4000"):
        _save(service, enabled, service.create_board(enabled, name="Two", actor="s"), {"text": "t" * 4001})


def test_m1_legacy_values_pass_through_until_edited(store, enabled):
    service = CanvasService(store)
    board = _board(service, enabled)
    legacy = {"text": "old", "url": "www.example.com", "confidence": 0.8}
    _stored(store, board, [{"id": "o1", "kind": "link", "content": legacy, "x": 0, "y": 0}])
    current = service.get_board(enabled, board["canvas_id"])
    saved = service.save(enabled, canvas_id=board["canvas_id"], expected_revision=current["revision"],
                         objects=[{**current["objects"][0], "content": {**legacy, "text": "renamed"}}],
                         connectors=[], actor="sahil")
    assert saved["objects"][0]["content"]["confidence"] == 0.8
    with pytest.raises(ValueError, match="http"):
        service.save(enabled, canvas_id=board["canvas_id"], expected_revision=saved["revision"],
                     objects=[{**current["objects"][0], "content": {**legacy, "url": "ftp://x.test"}}],
                     connectors=[], actor="sahil")


def test_m4_non_ascii_description_uses_real_byte_size(store, enabled):
    service = CanvasService(store)
    got = _save(service, enabled, _board(service, enabled), {"text": "t", "description": "é" * 20000})
    assert len(got["objects"][0]["content"]["description"]) == 20000


@pytest.mark.parametrize("content, message", [
    ({"due_on": "2026-02-31"}, "real date"),
    ({"links": [{"url": 5}]}, "must be text"),
    ({"links": [{"url": "http://a.b"}]}, None),
    ({"links": [{"url": "http://localhost"}]}, "http"),
])
def test_low_fixes(store, enabled, content, message):
    service = CanvasService(store)
    board = _board(service, enabled)
    if message is None:
        _save(service, enabled, board, content, kind="plan_block")
    else:
        with pytest.raises(ValueError, match=message):
            _save(service, enabled, board, content, kind="plan_block")
