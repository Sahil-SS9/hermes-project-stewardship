"""Dockyard RPC routes: work-items + backlog over /stewardship/v1."""
from __future__ import annotations

import base64
import sqlite3

import pytest

fastapi = pytest.importorskip("fastapi")
from fastapi.testclient import TestClient  # noqa: E402

from hermes_project_stewardship.api.server import create_app  # noqa: E402
from hermes_project_stewardship.kanban import ReferenceKanbanAdapter  # noqa: E402
from hermes_project_stewardship.persistence.canonical_work_store import CanonicalWorkMetadataStore  # noqa: E402
from hermes_project_stewardship.persistence.store import Store  # noqa: E402


@pytest.fixture()
def env(tmp_path):
    store = Store(tmp_path / "dy.db")
    app = create_app(store, kanban_adapter=ReferenceKanbanAdapter(store))
    c = TestClient(app)
    yield c, store
    store.close()


def _enable(c, pid="dy1"):
    r = c.post(f"/stewardship/v1/projects/{pid}/enable", json={
        "project_id": pid, "mission": "m",
        "lead_profile": "l", "autonomy_level": 2})
    assert r.status_code == 200


def test_workitem_create_list_transition(env):
    c, _ = env
    _enable(c)
    r = c.post("/stewardship/v1/projects/dy1/work-items", json={
        "type": "task", "title": "Split CI matrix by OS",
        "actor_id": "sahil", "actor_kind": "human"})
    assert r.status_code == 200
    ref = r.json()["ref"]
    assert ref.startswith("test-t-")

    r = c.get("/stewardship/v1/projects/dy1/work-items")
    assert r.status_code == 200
    items = r.json()["work_items"]
    assert len(items) == 1 and items[0]["created_by"] == "sahil"

    r = c.post(f"/stewardship/v1/projects/dy1/work-items/{ref}/transition",
               json={"status": "in_progress", "actor_id": "coder-bot"})
    assert r.status_code == 200
    assert r.json()["status"] == "in_progress"


def test_workitem_validation_errors(env):
    c, _ = env
    _enable(c)
    r = c.post("/stewardship/v1/projects/dy1/work-items", json={
        "type": "task", "title": "ab", "actor_id": "x"})
    assert r.status_code == 422
    r = c.post("/stewardship/v1/projects/dy1/work-items", json={
        "type": "task", "title": "Valid enough", "actor_id": "x",
        "parent_ref": "HDY-999"})
    assert r.status_code == 422


def test_backlog_add_rerank_reason_mandatory(env):
    c, _ = env
    _enable(c)
    r = c.post("/stewardship/v1/projects/dy1/work-items", json={
        "type": "bug", "title": "Webhook duplicates events",
        "actor_id": "qa-bot"})
    ref = r.json()["ref"]

    r = c.post("/stewardship/v1/projects/dy1/backlog", json={
        "ref": ref, "rank": 2, "reason": "x", "actor_id": "qa-bot"})
    assert r.status_code == 422  # reason too short

    r = c.post("/stewardship/v1/projects/dy1/backlog", json={
        "ref": ref, "rank": 2, "reason": "customer-reported regression",
        "actor_id": "qa-bot"})
    assert r.status_code == 200

    r = c.post(f"/stewardship/v1/projects/dy1/backlog/{ref}/rerank", json={
        "new_rank": 1, "reason": "security impact escalates priority",
        "actor_id": "sahil", "actor_kind": "human"})
    assert r.status_code == 200
    body = r.json()
    assert body["from_rank"] == 2 and body["to_rank"] == 1

    r = c.get("/stewardship/v1/projects/dy1/backlog")
    entries = r.json()["backlog"]
    assert entries[0]["item_ref"] == ref and entries[0]["rank"] == 1


def test_unknown_project_404_shape(env):
    c, _ = env
    r = c.post("/stewardship/v1/projects/ghost/work-items", json={
        "type": "task", "title": "Orphan item", "actor_id": "x"})
    # FK violation surfaces as error envelope (500-class or 404 per handler);
    # must NOT be a bare traceback.
    assert r.status_code >= 400
    assert "detail" in r.json() or "error" in r.json()


# ---------------------------------------------------------------------------
# Slice 3 - atomic create+queue, distinct assignee, initiative linkage,
# truthy enabled/disabled readback.
# ---------------------------------------------------------------------------

def test_create_queued_item_endpoint_is_atomic(env):
    c, _ = env
    _enable(c)
    r = c.post("/stewardship/v1/projects/dy1/backlog/items", json={
        "type": "task", "title": "Investigate latency",
        "creator_id": "sahil", "creator_kind": "human",
        "assignee_id": "qa-bot", "assignee_kind": "bot",
        "rank": 1, "reason": "customer reported intermittent latency",
    })
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["ref"].startswith("test-t-") and body["rank"] == 1
    # Read-back: work item and backlog entry both present
    work = c.get("/stewardship/v1/projects/dy1/work-items").json()["work_items"]
    assert any(w["ref"] == body["ref"] and w["assignee"] == "qa-bot"
               and w["created_by"] == "sahil" for w in work)
    entries = c.get("/stewardship/v1/projects/dy1/backlog").json()["backlog"]
    assert entries[0]["item_ref"] == body["ref"]


def test_create_queued_item_integrity_error_is_redacted(env, monkeypatch):
    c, _ = env
    _enable(c)

    def fail_insert(self, *args, **kwargs):
        raise sqlite3.IntegrityError(
            "UNIQUE constraint failed: dockyard_canonical_backlog.project_id"
        )

    monkeypatch.setattr(
        CanonicalWorkMetadataStore,
        "create_binding_and_queue",
        fail_insert,
    )
    response = c.post("/stewardship/v1/projects/dy1/backlog/items", json={
        "type": "task", "title": "Conflicting queue item",
        "creator_id": "sahil", "creator_kind": "human",
        "assignee_id": "qa-bot", "assignee_kind": "bot",
        "rank": 1, "reason": "exercise safe conflict response",
    })

    assert response.status_code == 409
    message = response.json()["error"]["message"]
    assert "ranking is incomplete" in message
    assert "UNIQUE" not in message


def test_create_queued_item_endpoint_rejects_same_creator_assignee(env):
    c, _ = env
    _enable(c)
    r = c.post("/stewardship/v1/projects/dy1/backlog/items", json={
        "type": "task", "title": "Same actor",
        "creator_id": "sahil", "creator_kind": "human",
        "assignee_id": "sahil", "assignee_kind": "human",
        "rank": 1, "reason": "reasonable reason supplied",
    })
    assert r.status_code == 422, r.text


def test_create_queued_item_endpoint_links_initiative(env):
    c, store = env
    _enable(c)
    from hermes_project_stewardship.persistence.service import StewardshipService

    svc = StewardshipService(store)
    ini = svc.propose_initiative(
        "dy1", title="Reduce checkout p95", rationale="customer impact",
    )
    r = c.post("/stewardship/v1/projects/dy1/backlog/items", json={
        "type": "task", "title": "Optimise DB query",
        "creator_id": "sahil", "creator_kind": "human",
        "assignee_id": "coder-bot", "assignee_kind": "bot",
        "initiative_ref": ini["ref"],
        "rank": 1, "reason": "directly unblocks the approved initiative",
    })
    assert r.status_code == 200, r.text
    assert r.json()["initiative_ref"] == ini["ref"]
    listed = c.get("/stewardship/v1/projects/dy1/work-items").json()["work_items"]
    target = next(w for w in listed if w["ref"] == r.json()["ref"])
    assert target["initiative_ref"] == ini["ref"]


def test_create_queued_item_endpoint_rejects_cross_project_initiative(env):
    c, store = env
    _enable(c)
    r = c.post("/stewardship/v1/onboard", json={
        "project_id": "dy2", "repo_path": "/tmp/r2",
        "mission": "second project mission text", "lead_profile": "lead-x",
    })
    assert r.status_code == 200, r.text
    from hermes_project_stewardship.persistence.service import StewardshipService

    svc = StewardshipService(store)
    ini = svc.propose_initiative("dy1", title="Only here", rationale="x")
    # try to link it into dy2
    r = c.post("/stewardship/v1/projects/dy2/backlog/items", json={
        "type": "task", "title": "Cross project attempt",
        "creator_id": "sahil", "creator_kind": "human",
        "assignee_id": "coder-bot", "assignee_kind": "bot",
        "initiative_ref": ini["ref"],
        "rank": 1, "reason": "reasonable reason supplied",
    })
    assert r.status_code == 422, r.text
    listed = c.get("/stewardship/v1/projects/dy2/work-items").json()["work_items"]
    assert listed == []


def test_create_queued_item_endpoint_rejects_unknown_initiative(env):
    c, _ = env
    _enable(c)
    r = c.post("/stewardship/v1/projects/dy1/backlog/items", json={
        "type": "task", "title": "Implement something",
        "creator_id": "sahil", "creator_kind": "human",
        "assignee_id": "coder-bot", "assignee_kind": "bot",
        "initiative_ref": "INIT-BOGUS-9999",
        "rank": 1, "reason": "reasonable reason supplied",
    })
    assert r.status_code == 422, r.text


def test_disabled_project_settings_remain_readable(env):
    c, _ = env
    _enable(c)
    r = c.post("/stewardship/v1/projects/dy1/disable")
    assert r.status_code == 200, r.text
    r = c.get("/stewardship/v1/projects/dy1/settings")
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["enabled"] is False
    # Re-enable endpoint flips it back
    r = c.post("/stewardship/v1/projects/dy1/re-enable")
    assert r.status_code == 200, r.text
    assert r.json()["enabled"] is True


def test_disabled_project_dashboard_reads_remain_available(env):
    c, _ = env
    _enable(c)
    actor = {"actor": "sahil", "interface": "dockyard:human"}
    created = c.post("/stewardship/v1/projects/dy1/objectives", json={
        "name": "Keep the read-only dashboard available",
        "target": ">=1",
        **actor,
    })
    assert created.status_code == 200, created.text
    uploaded = c.post("/stewardship/v1/projects/dy1/content", json={
        "filename": "read-only.md",
        "media_type": "text/markdown",
        "content_base64": base64.b64encode(b"Readable while disabled.\n").decode("ascii"),
        **actor,
    })
    assert uploaded.status_code == 200, uploaded.text
    content_id = uploaded.json()["content_id"]

    disabled = c.post("/stewardship/v1/projects/dy1/disable")
    assert disabled.status_code == 200, disabled.text

    for path in (
        "settings",
        "objectives?include_archived=true",
        "missions/archive",
        "content",
        "initiatives",
        "work-items",
        "events",
        "reports",
    ):
        response = c.get(f"/stewardship/v1/projects/dy1/{path}")
        assert response.status_code == 200, (path, response.text)

    preview = c.get(
        f"/stewardship/v1/projects/dy1/content/{content_id}/preview"
    )
    assert preview.status_code == 200, preview.text
    assert preview.json()["text"] == "Readable while disabled.\n"


def test_duplicate_objective_create_is_rejected_without_mutation(env):
    c, _ = env
    _enable(c)
    actor = {"actor": "sahil", "interface": "dockyard:human"}
    first = c.post("/stewardship/v1/projects/dy1/objectives", json={
        "name": "Stable objective identity",
        "description": "Original description",
        "target": ">=1",
        **actor,
    })
    assert first.status_code == 200, first.text
    objective_id = first.json()["id"]
    archived = c.post(
        f"/stewardship/v1/projects/dy1/objectives/{objective_id}/archive",
        json=actor,
    )
    assert archived.status_code == 200, archived.text

    duplicate = c.post("/stewardship/v1/projects/dy1/objectives", json={
        "name": "Stable objective identity",
        "description": "Attempted overwrite",
        "target": ">=999",
        **actor,
    })
    assert duplicate.status_code == 409, duplicate.text
    assert "already exists" in duplicate.json()["error"]["message"]

    listed = c.get(
        "/stewardship/v1/projects/dy1/objectives?include_archived=true"
    )
    assert listed.status_code == 200, listed.text
    objectives = listed.json()["objectives"]
    assert len(objectives) == 1
    assert objectives[0]["enabled"] is False
    assert objectives[0]["description"] == "Original description"
    assert objectives[0]["target"] == ">=1"


def test_mission_and_objective_management_routes(env):
    c, _ = env
    _enable(c)
    actor = {"actor": "sahil", "interface": "dockyard:human"}

    archived = c.post(
        "/stewardship/v1/projects/dy1/mission/archive", json=actor
    )
    assert archived.status_code == 200, archived.text
    assert archived.json()["mission"] == "m"
    history = c.get("/stewardship/v1/projects/dy1/missions/archive")
    assert history.status_code == 200
    assert history.json()["missions"][0]["archive_id"] == archived.json()["archive_id"]

    created = c.post("/stewardship/v1/projects/dy1/objectives", json={
        "name": "Keep retries safe",
        "description": "Initial",
        "target": ">=1",
        "severity": "medium",
        **actor,
    })
    assert created.status_code == 200, created.text
    objective_id = created.json()["id"]

    edited = c.patch(
        f"/stewardship/v1/projects/dy1/objectives/{objective_id}",
        json={"name": "Keep payment retries safe", "severity": "high", **actor},
    )
    assert edited.status_code == 200, edited.text
    assert edited.json()["name"] == "Keep payment retries safe"

    archived_objective = c.post(
        f"/stewardship/v1/projects/dy1/objectives/{objective_id}/archive",
        json=actor,
    )
    assert archived_objective.status_code == 200, archived_objective.text
    listed = c.get(
        "/stewardship/v1/projects/dy1/objectives?include_archived=true"
    )
    assert listed.status_code == 200
    assert listed.json()["objectives"][0]["enabled"] is False

    removed = c.request(
        "DELETE",
        f"/stewardship/v1/projects/dy1/objectives/{objective_id}",
        json=actor,
    )
    assert removed.status_code == 200, removed.text
    assert removed.json() == {"id": objective_id, "removed": True}

    c.patch(
        "/stewardship/v1/projects/dy1/settings",
        json={"mission": "Temporary mission", **actor},
    )
    removed_mission = c.request(
        "DELETE", "/stewardship/v1/projects/dy1/mission", json=actor
    )
    assert removed_mission.status_code == 200, removed_mission.text
    assert removed_mission.json()["removed"] is True


def test_project_content_routes_upload_list_and_preview(env):
    c, _ = env
    _enable(c)
    raw = b"# Runbook\n\nRecovery steps.\n"
    uploaded = c.post("/stewardship/v1/projects/dy1/content", json={
        "filename": "runbook.md",
        "media_type": "text/markdown",
        "content_base64": base64.b64encode(raw).decode("ascii"),
        "actor": "sahil",
        "interface": "dockyard:human",
    })
    assert uploaded.status_code == 200, uploaded.text
    content_id = uploaded.json()["content_id"]

    listed = c.get("/stewardship/v1/projects/dy1/content")
    assert listed.status_code == 200
    assert listed.json()["content"][0]["filename"] == "runbook.md"

    preview = c.get(
        f"/stewardship/v1/projects/dy1/content/{content_id}/preview"
    )
    assert preview.status_code == 200, preview.text
    assert preview.json()["text"] == raw.decode("utf-8")

    invalid = c.post("/stewardship/v1/projects/dy1/content", json={
        "filename": "runbook.md",
        "media_type": "text/markdown",
        "content_base64": "not valid base64!",
        "actor": "sahil",
    })
    assert invalid.status_code == 422
