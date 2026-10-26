"""Batch B contracts: desktop write shapes, trusted attribution, bot-group ids.

Drives the real plugin proxy -> real backend app -> reference canonical adapter
against a temporary HERMES_HOME. The request bodies mirror exactly what
desktop/plugin.js sends, so a proxy schema that rejects the UI fails here.
"""
import importlib.util
from pathlib import Path

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from hermes_project_stewardship.api.server import create_app
from hermes_project_stewardship.kanban import ReferenceKanbanAdapter
from hermes_project_stewardship.persistence.service import StewardshipService

TOKEN = "synthetic-desktop-token"
HEADERS = {"x-hermes-session-token": TOKEN}


def _load_proxy(tmp_path, monkeypatch, *, principal_is_human=True, auth=True):
    monkeypatch.setenv("HERMES_HOME", str(tmp_path))
    monkeypatch.setenv("HERMES_KANBAN_HOME", str(tmp_path))
    monkeypatch.setenv("STEWARD_DB_PATH", str(tmp_path / "db.sqlite"))
    monkeypatch.setenv("DOCKYARD_ACTOR_ID", "trusted-desktop")
    monkeypatch.delenv("STEWARD_RPC_TOKEN", raising=False)
    monkeypatch.setenv("HERMES_DASHBOARD_SESSION_TOKEN", TOKEN)
    path = Path(__file__).parents[1] / "hermes_dockyard_plugin/dashboard/plugin_api.py"
    spec = importlib.util.spec_from_file_location("batch_b_isolated_proxy", path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    store = module._store
    adapter = ReferenceKanbanAdapter(store)
    StewardshipService(store).enable(
        "p1", mission="m", lead_profile="lead", member_profiles=["worker"], autonomy_level=2)
    StewardshipService(store).enable(
        "p2", mission="m", lead_profile="lead", member_profiles=["worker"], autonomy_level=2)
    module._app = create_app(
        store, kanban_adapter=adapter,
        auth_token=module._rpc_token if auth else None,
        auth_principal="owner" if auth else None,
        auth_principal_is_human=principal_is_human)
    module._client = module.httpx.AsyncClient(
        transport=module.httpx.ASGITransport(app=module._app), base_url="http://dockyard.test")
    host = FastAPI()
    host.include_router(module.plugin_api, prefix="/api")
    return module, adapter, TestClient(host)


def _ref(client, project="p1", title="Parent task", kind="task"):
    r = client.post(f"/api/projects/{project}/backlog/items", headers=HEADERS, json={
        "type": kind, "title": title, "assignee_id": "worker", "assignee_kind": "bot",
        "rank": 1, "reason": "seed item"})
    assert r.status_code == 200, r.text
    return r.json()["item"]["ref"] if "item" in r.json() else r.json()["ref"]


def test_desktop_drawer_write_shapes_are_accepted(tmp_path, monkeypatch):
    module, _adapter, client = _load_proxy(tmp_path, monkeypatch)
    parent = _ref(client, title="Parent epic", kind="epic")
    child = _ref(client, title="Child task")
    sibling = _ref(client, title="Sibling task")
    base = f"/api/projects/p1/work-items/{child}"

    # Drawer save: field edits including initiative, sent with no actor fields.
    r = client.patch(base, headers=HEADERS, json={"title": "Child task renamed", "initiative_ref": None})
    assert r.status_code == 200, r.text
    # Re-parent carries its mandatory audit reason through the proxy.
    r = client.patch(base, headers=HEADERS, json={"parent_ref": parent, "reason": "group under parent"})
    assert r.status_code == 200, r.text
    r = client.post(f"{base}/assign", headers=HEADERS, json={"assignee_id": "worker"})
    assert r.status_code == 200, r.text
    r = client.post(f"{base}/dependencies", headers=HEADERS, json={"dependency_ref": sibling})
    assert r.status_code == 200, r.text

    detail = client.get(base, headers=HEADERS).json()
    assert detail["work_item"]["title"] == "Child task renamed"
    assert detail["parent"]["ref"] == parent
    assert detail["work_item"]["assignee"] == "worker"
    assert [d["ref"] for d in detail["dependencies"]] == [sibling]
    # Every write above is attributed to the trusted principal, never the client.
    actors = {e.get("actor") for e in detail["history"] if e.get("actor")}
    assert actors and actors <= {"owner"}, actors


def test_client_cannot_forge_work_item_attribution(tmp_path, monkeypatch):
    _module, _adapter, client = _load_proxy(tmp_path, monkeypatch)
    ref = _ref(client)
    r = client.patch(f"/api/projects/p1/work-items/{ref}", headers=HEADERS,
                     json={"title": "Renamed", "actor_id": "forged", "actor_kind": "human"})
    assert r.status_code == 422, "proxy must reject client-supplied attribution"


def test_canvas_writes_use_trusted_actor_not_client_body(tmp_path, monkeypatch):
    # No backend principal: attribution falls through to what the proxy sends,
    # which is exactly the case where a forged client field would leak.
    module, _adapter, client = _load_proxy(tmp_path, monkeypatch, auth=False)
    canvas = client.get("/api/projects/p1/canvas", headers=HEADERS).json()
    saved = client.put("/api/projects/p1/canvas", headers=HEADERS, json={
        "expected_revision": canvas["revision"], "objects": [], "connectors": [], "actor": "forged"})
    assert saved.status_code == 200, saved.text
    assert saved.json()["updated_by"] == module._ACTOR_ID == "trusted-desktop"


def test_board_routes_proxy_with_trusted_actor(tmp_path, monkeypatch):
    """D14/D16/D19: every multi-board route is reachable through the plugin
    proxy, and writes are attributed to the trusted principal, never a
    client-supplied actor."""
    module, _adapter, client = _load_proxy(tmp_path, monkeypatch, auth=False)
    # The board model picker is not under test here. Unstubbed, it read this
    # machine's logins and called provider APIs; the conftest guard refuses both.
    import hermes_project_stewardship.persistence.hermes_curation_provider as hcp
    monkeypatch.setattr(hcp, "list_hermes_models", lambda: {"available": False, "default": None, "providers": []})
    created = client.post("/api/projects/p1/canvases", headers=HEADERS,
                          json={"name": "Import", "actor": "forged"})
    assert created.status_code == 200, created.text
    board = created.json()
    assert board["updated_by"] == module._ACTOR_ID
    cid = board["canvas_id"]
    dup = client.post("/api/projects/p1/canvases", headers=HEADERS, json={"name": "IMPORT"})
    assert dup.status_code == 409, dup.text
    saved = client.put(f"/api/projects/p1/canvases/{cid}", headers=HEADERS, json={
        "expected_revision": board["revision"], "connectors": [], "actor": "forged",
        "objects": [{"id": "e1", "kind": "evidence", "content": {"text": "x"}}]})
    assert saved.status_code == 200, saved.text
    assert saved.json()["updated_by"] == module._ACTOR_ID
    patched = client.patch(f"/api/projects/p1/canvases/{cid}", headers=HEADERS,
                           json={"theme": "dark", "actor": "forged"})
    assert patched.status_code == 200 and patched.json()["theme"] == "dark"
    assert patched.json()["updated_by"] == module._ACTOR_ID
    cleared = client.patch(f"/api/projects/p1/canvases/{cid}", headers=HEADERS, json={"theme": None})
    assert cleared.status_code == 200 and cleared.json()["theme"] is None
    assert client.get(f"/api/projects/p1/canvases/{cid}", headers=HEADERS).json()["name"] == "Import"
    session = client.post(f"/api/projects/p1/canvases/{cid}/sessions", headers=HEADERS, json={})
    assert session.status_code == 200 and session.json()["canvas_id"] == cid
    listed = client.get("/api/projects/p1/canvases", headers=HEADERS).json()["canvases"]
    assert [row["canvas_id"] for row in listed] == [cid]
    plans = client.get(f"/api/projects/p1/canvases/{cid}/plans", headers=HEADERS)
    assert plans.status_code == 200 and plans.json()["plans"] == []
    client.patch(f"/api/projects/p1/canvases/{cid}", headers=HEADERS, json={"status": "archived"})
    assert client.get("/api/projects/p1/canvases", headers=HEADERS).json()["canvases"] == []
    archived = client.get("/api/projects/p1/canvases?include_archived=true", headers=HEADERS).json()
    assert [row["status"] for row in archived["canvases"]] == ["archived"]
    models = client.get("/api/canvas/models", headers=HEADERS)
    assert models.status_code == 200 and "available" in models.json()
    # A board from another project is invisible through the proxy too.
    other = client.post("/api/projects/p2/canvases", headers=HEADERS, json={"name": "Theirs"}).json()
    assert client.get(f"/api/projects/p1/canvases/{other['canvas_id']}", headers=HEADERS).status_code == 404


def test_board_delete_review_message_and_plan_edit_proxy(tmp_path, monkeypatch):
    """D15: board-scoped delete/review, chat message and plan-step edits all
    pass the proxy with the trusted principal."""
    module, _adapter, client = _load_proxy(tmp_path, monkeypatch, auth=False)
    objects = [
        {"id": "e1", "kind": "evidence", "content": {"text": "Users stall at import"}},
        {"id": "c1", "kind": "claim", "content": {"text": "Import feels unsafe"}},
        {"id": "p1", "kind": "plan_block", "content": {"text": "Preview before commit"}},
    ]
    board = client.post("/api/projects/p1/canvases", headers=HEADERS, json={"name": "Flow"}).json()
    cid = board["canvas_id"]
    saved = client.put(f"/api/projects/p1/canvases/{cid}", headers=HEADERS,
                       json={"expected_revision": board["revision"], "objects": objects, "connectors": []})
    assert saved.status_code == 200, saved.text
    review = client.post(f"/api/projects/p1/canvases/{cid}/curate", headers=HEADERS)
    assert review.status_code == 200 and review.json()["summary"]["claim_count"] == 1
    session = client.post(f"/api/projects/p1/canvases/{cid}/sessions", headers=HEADERS,
                          json={"message": "Keep it small", "actor": "forged"})
    assert session.status_code == 200, session.text
    notes = [row for row in session.json()["answers"] if row["outcome"] == "message"]
    assert [(row["answer"], row["actor"]) for row in notes] == [("Keep it small", module._ACTOR_ID)]
    proposal = next(p for p in session.json()["proposals"] if p["kind"] == "technical_plan")
    client.post(f"/api/canvas/proposals/{proposal['proposal_id']}/decision", headers=HEADERS, json={"approve": True})
    plan = client.post(f"/api/canvas/proposals/{proposal['proposal_id']}/plan", headers=HEADERS,
                       json={"project_id": "p1"}).json()
    edited = client.patch(f"/api/projects/p1/plans/{plan['plan_id']}", headers=HEADERS,
                          json={"steps": [{"title": "Only step"}], "actor": "forged"})
    assert edited.status_code == 200, edited.text
    assert edited.json()["steps"][0]["title"] == "Only step"
    assert edited.json()["edited_by"] == module._ACTOR_ID
    revision = client.get(f"/api/projects/p1/canvases/{cid}", headers=HEADERS).json()["revision"]
    gone = client.delete(f"/api/projects/p1/canvases/{cid}/objects/e1", headers=HEADERS,
                         params={"expected_revision": revision})
    assert gone.status_code == 200, gone.text
    assert gone.json()["updated_by"] == module._ACTOR_ID
    assert [o["id"] for o in gone.json()["objects"]] == ["c1", "p1"]


def test_bot_groups_list_exposes_stable_id(tmp_path, monkeypatch):
    _module, _adapter, client = _load_proxy(tmp_path, monkeypatch)
    created = client.post("/api/bot-groups", headers=HEADERS, json={
        "name": "delivery-crew", "purpose": "ship", "member_ids": []})
    assert created.status_code == 200, created.text
    groups = client.get("/api/bot-groups", headers=HEADERS).json()["groups"]
    match = [g for g in groups if g["name"] == "delivery-crew"]
    assert len(match) == 1
    assert match[0]["id"], "workflow binding needs the group id, not just the name"
    assert len({g["id"] for g in groups}) == len(groups)


def test_reference_adapter_reports_only_declared_profiles(tmp_path):
    from hermes_project_stewardship.persistence.store import Store
    store = Store(tmp_path / "ref.db")
    try:
        bare = ReferenceKanbanAdapter(store).list_profiles()
        assert [p["name"] for p in bare] == ["default"]
        declared = ReferenceKanbanAdapter(store, profiles=["worker", "default", "worker", ""]).list_profiles()
        assert [p["name"] for p in declared] == ["default", "worker"]
        assert [p["is_default"] for p in declared] == [True, False]
    finally:
        store.close()


def test_workflow_library_routes_reach_backend_through_proxy(tmp_path, monkeypatch):
    # Batch W review: Desktop only talks to the plugin proxy. Every library /
    # enablement / scoped-start call the UI makes must exist on the proxy, or
    # the feature works only against the phase4 mock host.
    _module, _adapter, client = _load_proxy(tmp_path, monkeypatch)
    created = client.post("/api/workflow-library", headers=HEADERS, json={
        "scope": "global", "name": "release-cadence",
        "nodes": [{"id": "cut", "title": "Cut release", "depends_on": []}]})
    assert created.status_code == 200, created.text
    listed = client.get("/api/workflow-library", headers=HEADERS, params={"scope": "global"})
    assert listed.status_code == 200, listed.text
    assert [w["name"] for w in listed.json()["workflows"]] == ["release-cadence"]
    versioned = client.post("/api/workflow-library/global/release-cadence/versions", headers=HEADERS,
                            json={"nodes": [{"id": "cut", "title": "Cut release v2", "depends_on": []}]})
    assert versioned.status_code == 200 and versioned.json()["version"] == 2, versioned.text

    base = "/api/projects/p2/workflows"
    # Globals default OFF per project: start is refused with 409, not 404.
    refused = client.post(f"{base}/global/release-cadence/start", headers=HEADERS, json={"run_key": "r1"})
    assert refused.status_code == 409, refused.text
    loose = client.put(f"{base}/global/release-cadence/enablement", headers=HEADERS, json={"enabled": "true"})
    assert loose.status_code == 422, "enablement accepts only a JSON boolean"
    on = client.put(f"{base}/global/release-cadence/enablement", headers=HEADERS, json={"enabled": True})
    assert on.status_code == 200 and on.json()["project_id"] == "p2", on.text
    available = client.get(f"{base}/available", headers=HEADERS).json()["workflows"]
    assert {(w["scope"], w["name"], w["enabled"]) for w in available} == {("global", "release-cadence", True)}
    # p1 is unaffected by p2's toggle.
    p1 = client.get("/api/projects/p1/workflows/available", headers=HEADERS).json()["workflows"]
    assert [w["enabled"] for w in p1] == [False]
    started = client.post(f"{base}/global/release-cadence/start", headers=HEADERS, json={"run_key": "r1"})
    assert started.status_code == 200, started.text
    runs = client.get(f"{base}/global/release-cadence/runs", headers=HEADERS)
    assert runs.status_code == 200 and [r["run_key"] for r in runs.json()["runs"]] == ["r1"], runs.text

    # Lifecycle through the proxy: delete is refused while history exists; archive/restore work.
    blocked = client.delete("/api/workflow-library/global/release-cadence", headers=HEADERS)
    assert blocked.status_code == 409, blocked.text
    archived = client.post("/api/workflow-library/global/release-cadence/archive", headers=HEADERS)
    assert archived.status_code == 200 and archived.json()["archived_at"], archived.text
    restored = client.post("/api/workflow-library/global/release-cadence/restore", headers=HEADERS)
    assert restored.status_code == 200 and restored.json()["archived_at"] is None, restored.text

    # Dedicated workflows carry their owner through the proxy query string.
    dedicated = client.post("/api/workflow-library", headers=HEADERS, json={
        "scope": "project", "name": "p1-only", "owner_project_id": "p1",
        "nodes": [{"id": "a", "title": "A", "depends_on": []}]})
    assert dedicated.status_code == 200, dedicated.text
    gone = client.delete("/api/workflow-library/project/p1-only", headers=HEADERS,
                         params={"owner_project_id": "p1"})
    assert gone.status_code == 200 and gone.json()["deleted"] is True, gone.text
    # Attribution is trusted, never client-supplied.
    forged = client.post("/api/workflow-library", headers=HEADERS, json={
        "scope": "global", "name": "x", "nodes": [], "actor": "forged"})
    assert forged.status_code == 422


def test_create_and_queue_keeps_every_form_field(tmp_path, monkeypatch):
    _module, _adapter, client = _load_proxy(tmp_path, monkeypatch)
    epic = _ref(client, title="Parent epic", kind="epic")
    r = client.post("/api/projects/p1/backlog/items", headers=HEADERS, json={
        "type": "task", "title": "Full create", "body": "desc text", "labels": ["x"],
        "evidence_refs": ["e1"], "assignee_id": "worker", "assignee_kind": "bot",
        "initiative_ref": None, "parent_ref": epic, "estimate_days": 2.5,
        "due": "2026-10-01", "rank": 1, "reason": "seed item"})
    assert r.status_code == 200, r.text
    ref = r.json().get("item", r.json())["ref"]
    detail = client.get(f"/api/projects/p1/work-items/{ref}", headers=HEADERS).json()
    item = detail["work_item"]
    assert (item["body"], item["labels"], item["evidence_refs"]) == ("desc text", ["x"], ["e1"])
    assert (item["estimate_days"], item["due"]) == (2.5, "2026-10-01")
    assert detail["parent"]["ref"] == epic
    assert item["created_by"] == "owner"
    forged = client.post("/api/projects/p1/backlog/items", headers=HEADERS, json={
        "type": "task", "title": "Forged create", "assignee_id": "worker", "rank": 1,
        "reason": "seed item", "creator_id": "forged"})
    assert forged.status_code == 422
