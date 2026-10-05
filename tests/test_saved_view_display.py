"""C2 r6 (Sahil's C2 review, 04/10/2026): a saved Kanban view keeps what you see.

The query schema also takes the work type, the search text and the card
settings. Views saved before r6 validate unchanged. The views list says which
views are the caller's, so the screen offers Rename, Share and Delete only where
they will work.
"""
from __future__ import annotations

import pytest

from hermes_project_stewardship.dockyard import Actor, ActorKind
from hermes_project_stewardship.persistence.dockyard_service import DockyardService
from hermes_project_stewardship.persistence.service import StewardshipService
from hermes_project_stewardship.persistence.store import Store
from hermes_project_stewardship.persistence.view_query import (
    QuerySchemaError,
    apply_query,
    validate_query,
)

V = {"version": 1}  # validate_query always stamps the query version


# ---- the query schema ------------------------------------------------------ #

def test_new_keys_validate_trim_and_keep_the_field_order():
    got = validate_query({"types": ["task"], "query": "  setup ",
                          "display": {"density": "detailed", "fields": ["due", "links"]}})
    assert got == {**V, "types": ["task"], "query": "setup",
                   "display": {"density": "detailed", "fields": ["links", "due"]}}


def test_blank_search_text_is_dropped():
    assert validate_query({"query": "   "}) == V


def test_views_saved_before_r6_validate_unchanged():
    old = {"status": ["blocked"], "assignee": "ada", "labels": ["mobile"]}
    assert validate_query(old) == {**V, **old}


@pytest.mark.parametrize("bad", [
    {"display": {"density": "huge"}},
    {"display": {"fields": ["priority"]}},
    {"display": {"colour": "red"}},
    {"display": "compact"},
    {"types": []},
    {"types": [1]},
    {"query": "x" * 201},
    {"query": 3},
    {"priority": "high"},
], ids=["unknown-density", "unknown-field", "unknown-display-key", "display-not-an-object",
        "types-empty", "types-not-strings", "query-too-long", "query-not-a-string",
        "unknown-top-level-key"])
def test_bad_values_are_refused(bad):
    with pytest.raises(QuerySchemaError):
        validate_query(bad)


# ---- applying a stored query ------------------------------------------------ #

ITEMS = [
    {"ref": "t-1", "title": "Guided setup", "type": "task", "status": "backlog"},
    {"ref": "t-2", "title": "Crash on launch", "type": "bug", "status": "blocked"},
    {"ref": "t-3", "title": "Setup screens", "status": "in_progress"},
]


def _refs(query):
    return [item["ref"] for item in apply_query(ITEMS, query)]


def test_the_type_filter_counts_a_missing_type_as_task():
    assert _refs({"types": ["task"]}) == ["t-1", "t-3"]


def test_search_text_matches_a_ref_or_a_title_in_any_case():
    assert _refs({"query": "SETUP"}) == ["t-1", "t-3"]
    assert _refs({"query": "t-2"}) == ["t-2"]


def test_card_settings_never_filter():
    assert _refs({"display": {"density": "compact", "fields": []}}) == ["t-1", "t-2", "t-3"]


# ---- the service and the API ------------------------------------------------- #

@pytest.fixture()
def service(tmp_path):
    store = Store(tmp_path / "views.db")
    StewardshipService(store).enable("p1", mission="m", lead_profile="l", autonomy_level=2)
    yield DockyardService(store)
    store.close()


def test_views_list_says_which_views_are_mine_and_still_hides_other_peoples_private_views(service):
    me = Actor(id="dashboard-user", display_name="me", kind=ActorKind.HUMAN)
    grace = Actor(id="grace-hopper", display_name="grace", kind=ActorKind.HUMAN)
    service.view_save("p1", "Mine", "board", filters={"display": {"density": "compact"}}, actor=me)
    service.view_save("p1", "Grace's", "table", filters={"types": ["bug"]}, actor=grace, shared=True)
    service.view_save("p1", "Grace private", "board", filters={}, actor=grace)
    views = {view["name"]: view for view in service.views_list("p1", actor=me)}
    assert {name: view["mine"] for name, view in views.items()} == {"Grace's": False, "Mine": True}
    assert views["Mine"]["filters"] == {**V, "display": {"density": "compact"}}


def test_the_views_api_keeps_what_you_see_and_refuses_bad_card_settings(tmp_path):
    pytest.importorskip("fastapi")
    from fastapi.testclient import TestClient

    from hermes_project_stewardship.api.server import create_app
    from hermes_project_stewardship.kanban import ReferenceKanbanAdapter

    store = Store(tmp_path / "api.db")
    try:
        client = TestClient(create_app(store, kanban_adapter=ReferenceKanbanAdapter(store)))
        enabled = client.post("/stewardship/v1/projects/dy1/enable", json={
            "project_id": "dy1", "mission": "m", "lead_profile": "l", "autonomy_level": 2})
        assert enabled.status_code == 200
        filters = {"types": ["bug"], "query": "setup",
                   "display": {"density": "detailed", "fields": ["assignee", "links"]}}
        saved = client.put("/stewardship/v1/projects/dy1/views", json={
            "name": "Bugs", "layout": "table", "filters": filters, "actor_id": "sahil"})
        assert saved.status_code == 200, saved.text
        listed = client.get("/stewardship/v1/projects/dy1/views?actor_id=sahil").json()["views"]
        bugs = next(view for view in listed if view["name"] == "Bugs")
        assert bugs["filters"] == {**V, **filters}
        assert bugs["mine"] is True
        refused = client.put("/stewardship/v1/projects/dy1/views", json={
            "name": "Bad", "layout": "board", "filters": {"display": {"density": "huge"}},
            "actor_id": "sahil"})
        # Same contract as every other invalid saved-view query (test_saved_view_queries): 409.
        assert refused.status_code == 409
        assert "saved view query invalid" in refused.text
    finally:
        store.close()
