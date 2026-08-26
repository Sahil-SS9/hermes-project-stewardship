"""G5 P2: A2A injection attempts.

Adversarial discipline: hostile payloads must be refused at every
boundary without persisting state or crashing into 500s.
"""
from __future__ import annotations

import json

import pytest

fastapi = pytest.importorskip("fastapi")
from fastapi.testclient import TestClient  # noqa: E402

from hermes_project_stewardship.api.server import create_app  # noqa: E402
from hermes_project_stewardship.kanban import ReferenceKanbanAdapter  # noqa: E402
from hermes_project_stewardship.persistence.dockyard_service import (
    DockyardService,
)
from hermes_project_stewardship.persistence.store import Store


@pytest.fixture()
def env(tmp_path):
    store = Store(tmp_path / "inj.db")
    c = TestClient(
        create_app(store, kanban_adapter=ReferenceKanbanAdapter(store))
    )
    dy = DockyardService(store)
    c.post(f"/stewardship/v1/onboard", json={
        "project_id": "demo", "repo_path": "/srv/demo",
        "mission": "m", "lead_profile": "l"})
    dy.bot_register("insider-bot", "Insider")
    # onboard already seeded demo-ops; add our bot as lead member
    dy.dy.group_add_member("demo-ops", "insider-bot",
                           "lead")
    yield c, store
    store.close()


def _a2a(c, **over):
    body = {"msg_type": "handoff", "from_actor": "insider-bot",
            "to_group": "demo-ops",
            "payload": {"item_ref": "HDY-1", "summary": "s",
                        "context_refs": ["a"]},
            "item_ref": "HDY-1"}
    body.update(over)
    return c.post("/stewardship/v1/a2a", json=body)


def test_unknown_group_spoofing_refused(env):
    c, _ = env
    assert _a2a(c, to_group="shadow-ops").status_code == 404


def test_envelope_payload_ref_mismatch_refused(env):
    c, _ = env
    r = _a2a(c, item_ref="HDY-1",
             payload={"item_ref": "HDY-999", "summary": "smuggled",
                      "context_refs": ["x"]})
    assert r.status_code == 422


def test_oversized_payload_refused(env):
    c, store = env
    big = {"item_ref": "HDY-1", "summary": "x" * 100_000,
           "context_refs": ["blob" * 10_000]}
    r = c.post("/stewardship/v1/a2a", json={
        "msg_type": "handoff", "from_actor": "insider-bot",
        "to_group": "demo-ops", "item_ref": "HDY-1",
        "payload": big})
    assert r.status_code == 422
    # nothing persisted
    n = store._conn.execute(
        "SELECT COUNT(*) AS n FROM dockyard_a2a_messages").fetchone()["n"]
    assert n == 0


def test_non_string_actor_types_refused(env):
    c, _ = env
    for hostile in (123, True, ["bot"], {"id": 1}):
        r = c.post("/stewardship/v1/a2a", headers={},
                   json={"msg_type": "handoff",
                         "from_actor": hostile,
                         "to_group": "demo-ops", "item_ref": "HDY-1",
                         "payload": {"item_ref": "HDY-1", "summary": "s",
                                     "context_refs": ["a"]}})
        assert r.status_code == 422, f"{hostile!r} accepted"


def test_injection_via_summary_cannot_escape_field(env):
    """HTML/JS in summary is stored as data only — channel_post renders it
    as text; no SQL/JSON structure breakage."""
    c, store = env
    nasty = ('</div><script>alert(1)</script>", "injected": true, "'
             'DROP TABLE dockyard_a2a_messages;--')
    r = _a2a(c, payload={"item_ref": "HDY-1", "summary": nasty,
                         "context_refs": ["a"]})
    assert r.status_code == 200
    row = store._conn.execute(
        "SELECT payload_json, channel_post FROM dockyard_a2a_messages"
        " ORDER BY created_at DESC LIMIT 1").fetchone()
    payload = json.loads(row["payload_json"])
    assert payload["summary"] == nasty          # stored verbatim as data
    tables = store._conn.execute(
        "SELECT COUNT(*) AS n FROM sqlite_master WHERE type='table'"
        " AND name='dockyard_a2a_messages'").fetchone()["n"]
    assert tables == 1                          # table survives


def test_missing_type_refused(env):
    c, _ = env
    r = c.post("/stewardship/v1/a2a", json={
        "from_actor": "insider-bot", "to_group": "demo-ops"})
    assert r.status_code == 422
