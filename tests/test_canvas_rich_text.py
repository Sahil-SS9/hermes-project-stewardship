"""Stage 2 rich text: TipTap JSON allow-list (owner 30/09, option B)."""
from __future__ import annotations

import pytest

from hermes_project_stewardship.persistence.canvas_service import CanvasService


def _p(text, **attrs):
    node = {"type": "paragraph", "content": [{"type": "text", "text": text}]}
    if attrs:
        node["attrs"] = attrs
    return node


def _doc(*blocks):
    return {"type": "doc", "content": list(blocks)}


def _save(store, project, doc, extra=None, name="RT"):
    service = CanvasService(store)
    board = service.create_board(project, name=name, actor="sahil")
    content = {"text": "Card", "description_doc": doc, **(extra or {})}
    saved = service.save(project, canvas_id=board["canvas_id"], expected_revision=board["revision"],
                         objects=[{"id": "o1", "kind": "note", "content": content, "x": 0, "y": 0}],
                         connectors=[], actor="sahil")
    return saved["objects"][0]["content"]


RICH = _doc(
    {"type": "heading", "attrs": {"level": 2, "textAlign": "center"}, "content": [{"type": "text", "text": "Plan"}]},
    {"type": "paragraph", "content": [
        {"type": "text", "text": "Big ", "marks": [{"type": "bold"}, {"type": "fontSize", "attrs": {"size": "large"}}]},
        {"type": "text", "text": "idea", "marks": [{"type": "italic"}, {"type": "underline"}, {"type": "strike"}]},
        {"type": "hardBreak"}, {"type": "text", "text": "next line"}]},
    {"type": "bulletList", "content": [
        {"type": "listItem", "content": [_p("one"), {"type": "orderedList", "attrs": {"start": 3}, "content": [
            {"type": "listItem", "content": [_p("nested")]}]}]},
        {"type": "listItem", "content": [_p("two")]}]},
    {"type": "orderedList", "content": [{"type": "listItem", "content": [_p("first", textAlign="right")]}]},
)


def test_full_formatting_round_trips_and_plain_copy_is_derived(store, enabled):
    got = _save(store, enabled, RICH, {"description": "stale text the client sent"})
    assert got["description_doc"] == RICH
    assert got["description"] == "Plan\nBig idea\nnext line\n- one\n  3. nested\n- two\n1. first"


def test_defaults_are_not_stored(store, enabled):
    doc = _doc({"type": "paragraph", "attrs": {"textAlign": "left"}, "content": [{"type": "text", "text": "x"}]},
               {"type": "orderedList", "attrs": {"start": 1, "type": None}, "content": [
                   {"type": "listItem", "content": [_p("y")]}]})
    got = _save(store, enabled, doc)["description_doc"]
    assert "attrs" not in got["content"][0] and "attrs" not in got["content"][1]


def test_empty_editor_clears_description(store, enabled):
    got = _save(store, enabled, _doc({"type": "paragraph"}), {"description": "old"})
    assert "description" not in got and "description_doc" not in got


@pytest.mark.parametrize("doc, message", [
    ("<p>hi</p>", "document"),
    (_doc({"type": "codeBlock", "content": [{"type": "text", "text": "x"}]}), "not allowed"),
    (_doc({"type": "image", "attrs": {"src": "javascript:alert(1)"}}), "not allowed"),
    (_doc({"type": "paragraph", "content": [{"type": "text", "text": "x", "marks": [{"type": "link", "attrs": {"href": "javascript:x"}}]}]}), "not allowed"),
    (_doc({"type": "paragraph", "content": [{"type": "text", "text": "x", "marks": [{"type": "textStyle", "attrs": {"style": "background:url(x)"}}]}]}), "not allowed"),
    (_doc({"type": "paragraph", "content": [{"type": "text", "text": "x", "marks": [{"type": "fontSize", "attrs": {"size": "72px"}}]}]}), "small, large or huge"),
    (_doc(_p("x", textAlign="middle")), "alignment"),
    (_doc(_p("x", style="color:red")), "does not allow"),
    (_doc({"type": "heading", "attrs": {"level": 7}, "content": [{"type": "text", "text": "x"}]}), "level"),
    (_doc({"type": "bulletList", "content": [_p("x")]}), "list items"),
    (_doc({"type": "paragraph", "content": [_p("x")]}), "text only"),
    (_doc({"type": "listItem", "content": [_p("x")]}), "top level"),
    (_doc({"type": "orderedList", "attrs": {"start": -1}, "content": []}), "starts between"),
    (_doc(*[_p("x")] * 3001), "too large"),
    (_doc(_p("y" * 20001)), "20000"),
])
def test_anything_outside_the_allow_list_is_refused(store, enabled, doc, message):
    with pytest.raises(ValueError, match=message):
        _save(store, enabled, doc)


def test_deep_nesting_is_refused(store, enabled):
    node = _p("deep")
    for _ in range(8):
        node = {"type": "bulletList", "content": [{"type": "listItem", "content": [node]}]}
    with pytest.raises(ValueError, match="deeply nested"):
        _save(store, enabled, _doc(node))


# --- Quan re-check (Stage 1+2) -------------------------------------------

def test_heading_level_true_is_refused(store, enabled):
    """L1: True == 1 in Python; a boolean level must not be stored."""
    doc = _doc({"type": "heading", "attrs": {"level": True}, "content": [{"type": "text", "text": "x"}]})
    with pytest.raises(ValueError, match="level"):
        _save(store, enabled, doc)


@pytest.mark.parametrize("char", ["\u00e9", "\u6f22"])
def test_twenty_thousand_multibyte_characters_fit(store, enabled, char):
    """M2: the derived plain copy is not counted against the 64 KB card cap."""
    text = char * 20000
    got = _save(store, enabled, _doc(_p(text)))
    assert got["description"] == text
    assert got["description_doc"]["content"][0]["content"][0]["text"] == text


def test_saved_doc_round_trips_unchanged(store, enabled):
    """Saving the stored form again changes nothing (idempotent allow-list)."""
    first = _save(store, enabled, RICH)
    second = _save(store, enabled, first["description_doc"], name="RT again")
    assert second["description_doc"] == first["description_doc"]
    assert second["description"] == first["description"]
