"""Work with no owner: allowed, and never silent.

Sahil's demo feedback (04/10, point b): a new Backlog item can be created with
no owner, and an existing item can lose its owner. Hermes never dispatches work
with no owner, so the app says so: a gentle notification (medium: in the app,
not a desktop pop-up by default) that links to the item, one per item, which
resolves itself as soon as the item has an owner.

Rules pinned here:
- POST /backlog/items without an assignee creates an item with no owner.
- That raises one "unowned_work" notification for the item; an owned item raises none.
- Removing the owner raises it; giving an owner resolves it ("owner set: <ref>").
- Epics never raise it (they are never assigned).
- Repeating the removal while one is open does not stack a second notification.
- A creator still cannot name themselves as the assignee.
- Through the real plugin proxy the Desktop may omit the assignee.
"""
from __future__ import annotations

import importlib.util
from pathlib import Path

import pytest

fastapi = pytest.importorskip("fastapi")
from fastapi import FastAPI  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from hermes_project_stewardship.api.server import create_app  # noqa: E402
from hermes_project_stewardship.kanban import ReferenceKanbanAdapter  # noqa: E402
from hermes_project_stewardship.persistence.service import StewardshipService  # noqa: E402
from hermes_project_stewardship.persistence.store import Store  # noqa: E402

V = "/stewardship/v1"
ROOT = Path(__file__).parents[1]
PROXY = ROOT / "hermes_dockyard_plugin/dashboard/plugin_api.py"
TOKEN = "synthetic-desktop-token"
HEADERS = {"x-hermes-session-token": TOKEN}
BASE = "/api/plugins/hermes-dockyard"


def _enable(store, *pids):
    svc = StewardshipService(store)
    for pid in pids:
        svc.enable(pid, mission="m", lead_profile="lead", member_profiles=["worker"], autonomy_level=2)


@pytest.fixture()
def client(tmp_path):
    store = Store(tmp_path / "unowned.db")
    _enable(store, "p1")
    yield TestClient(create_app(store, kanban_adapter=ReferenceKanbanAdapter(store)))
    store.close()


def _create(client, title, *, assignee=None, kind="task"):
    body = {"type": kind, "title": title, "creator_id": "sahil", "creator_kind": "human",
            "rank": 1, "reason": "test item"}
    if assignee is not None:
        body["assignee_id"] = assignee
    response = client.post(f"{V}/projects/p1/backlog/items", json=body)
    assert response.status_code == 200, response.text
    return response.json()


def _assign(client, ref, assignee):
    response = client.post(f"{V}/projects/p1/work-items/{ref}/assign",
                           json={"assignee_id": assignee, "actor_id": "sahil", "actor_kind": "human"})
    assert response.status_code == 200, response.text
    return response.json()


def _unowned(client, state=None):
    params = {"kind": "unowned_work", **({"state": state} if state else {})}
    return client.get(f"{V}/notifications", params=params).json()["notifications"]


def test_a_new_item_may_have_no_owner_and_the_app_says_so(client):
    item = _create(client, "Nobody owns this yet")
    assert item["assignee"] is None
    [note] = _unowned(client)
    assert note["ref"] == item["ref"]
    assert note["title"] == f"{item['ref']} Nobody owns this yet has no owner"
    assert note["body"] == "No bot will pick it up until someone owns it."
    assert note["severity"] == "medium"
    assert note["deep_link"] == f"s2:work/{item['ref']}"


def test_an_owned_item_raises_nothing(client):
    _create(client, "Owned from the start", assignee="worker")
    assert _unowned(client) == []


def test_removing_the_owner_raises_it_and_giving_one_resolves_it(client):
    item = _create(client, "Owned, then not", assignee="worker")
    assert _assign(client, item["ref"], None)["assignee"] is None
    [note] = _unowned(client)
    assert note["state"] != "resolved"
    _assign(client, item["ref"], None)  # again, while it is still open: no second one
    assert len(_unowned(client)) == 1
    assert _assign(client, item["ref"], "worker")["assignee"] == "worker"
    [resolved] = _unowned(client)
    assert resolved["state"] == "resolved"
    assert resolved["resolution_note"] == f"owner set: {item['ref']}"
    _assign(client, item["ref"], "lead")  # owner to owner: nothing new
    assert len(_unowned(client)) == 1


def test_epics_never_raise_it(client):
    epic = _create(client, "A whole programme", kind="epic")
    assert epic["assignee"] is None
    assert _unowned(client) == []


def test_a_creator_still_cannot_assign_themselves(client):
    response = client.post(f"{V}/projects/p1/backlog/items", json={
        "type": "task", "title": "Self-assigned", "creator_id": "sahil", "creator_kind": "human",
        "assignee_id": "sahil", "rank": 1, "reason": "not allowed"})
    assert response.status_code in (409, 422), response.text


def test_the_desktop_may_omit_the_assignee_through_the_real_proxy(tmp_path, monkeypatch):
    monkeypatch.setenv("HERMES_HOME", str(tmp_path))
    monkeypatch.setenv("HERMES_KANBAN_HOME", str(tmp_path))
    monkeypatch.setenv("STEWARD_DB_PATH", str(tmp_path / "db.sqlite"))
    monkeypatch.setenv("DOCKYARD_ACTOR_ID", "trusted-desktop")
    monkeypatch.delenv("STEWARD_RPC_TOKEN", raising=False)
    monkeypatch.setenv("HERMES_DASHBOARD_SESSION_TOKEN", TOKEN)
    spec = importlib.util.spec_from_file_location("unowned_work_isolated_proxy", PROXY)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    _enable(module._store, "p1")
    module._app = create_app(module._store, kanban_adapter=ReferenceKanbanAdapter(module._store))
    module._client = module.httpx.AsyncClient(
        transport=module.httpx.ASGITransport(app=module._app), base_url="http://dockyard.test")
    host = FastAPI()
    host.include_router(module.plugin_api, prefix=BASE)
    proxy = TestClient(host)
    # The exact body the Backlog create form sends for "No owner".
    created = proxy.post(f"{BASE}/projects/p1/backlog/items", headers=HEADERS, json={
        "type": "task", "title": "Made in the Desktop", "body": None, "labels": [], "evidence_refs": [],
        "assignee_id": None, "assignee_kind": "bot", "initiative_ref": None, "parent_ref": None,
        "estimate_days": None, "due": None, "rank": 1, "reason": "made with no owner"})
    assert created.status_code == 200, created.text
    assert created.json()["assignee"] is None
