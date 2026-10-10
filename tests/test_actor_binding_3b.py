"""R-M1/R-M2/R-M3 (3b majors): acting identity binds to trusted callers only.

Owner decision (NOTES-FOR-3C-FIXES #5): bind the acting user to
``current_principal() or desktop_proxy_actor(request)`` — exactly as
``_decision_actor`` already does. Targets stay caller-named. Red-first tests
for each spoof: a body ``actor_id``, ``?actor_id=`` on saved views (list,
run, delete) and gateway ``sender_id``; plus tests through the REAL proxy
path proving Desktop writes still work and record the right user.

Spoof contract: when a trusted caller is bound, ANY caller-supplied
attribution string (body/query) is ignored — history and audit show the
trusted identity. Open dev mode (no token, no Desktop proxy) has no caller to
bind to, so attribution there stays caller-named, and non-decision writes are
not refused: open mode is documented as dev-only. Decisions and gateway
commands refuse without a trusted caller (the gateway's sender_id maps to
stored permission rows: the highest-value spoof). Nothing in-repo calls
/gateway/command anonymously.
"""
from __future__ import annotations

import importlib.util

import pytest

fastapi = pytest.importorskip("fastapi")
from fastapi import FastAPI  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from hermes_project_stewardship.api.server import create_app  # noqa: E402
from hermes_project_stewardship.kanban import ReferenceKanbanAdapter  # noqa: E402
from hermes_project_stewardship.persistence.service import (  # noqa: E402
    StewardshipService,
)
from hermes_project_stewardship.persistence.store import Store  # noqa: E402

V = "/stewardship/v1"


def _open_env(tmp_path):
    """No token, no principal: embedded open mode (documented dev-only)."""
    store = Store(tmp_path / "open.db")
    app = create_app(store, kanban_adapter=ReferenceKanbanAdapter(store))
    c = TestClient(app)
    StewardshipService(store).enable("p1", mission="m", lead_profile="l",
                                     autonomy_level=2)
    return c, store


def _seed_view(c):
    r = c.put(f"{V}/projects/p1/views", json={
        "name": "mine", "layout": "table", "actor_id": "spoofer"})
    assert r.status_code == 200, r.text


# ------------------------- R-M1: body actor spoofs ------------------------- #

def test_settings_patch_in_open_mode_keeps_the_caller_named_actor(tmp_path):
    """Open dev mode has no trusted caller to bind to, so the body actor is
    recorded as named. Pinned so a change to that contract is deliberate; the
    spoof denial that matters is the trusted-caller case right below."""
    c, store = _open_env(tmp_path)
    r = c.patch(f"{V}/projects/p1/settings",
                json={"mission": "updated", "actor": "forged-admin"})
    assert r.status_code == 200, r.text
    assert store.audit_tail(1)[0]["actor"] == "forged-admin"


def test_proxy_bound_settings_ignores_spoofed_body_actor(tmp_path):
    """R-M1 witnessed RED on db320ea ('forged' recorded) — binding the
    desktop proxy user fixes attribution where notes §5 demand it: the
    real Desktop app reaches mutating routes through the proxy, not the
    bearer. Same contract as _decision_actor's Q2 binding."""
    from hermes_project_stewardship.api.middleware import desktop_proxy_headers
    c, store = _open_env(tmp_path)
    r = c.patch(f"{V}/projects/p1/settings",
                json={"mission": "updated", "actor": "forged"},
                headers=desktop_proxy_headers("trusted-desktop"))
    assert r.status_code == 200, r.text
    actors = [t["actor"] for t in store.audit_tail(3)]
    assert actors[0] == "trusted-desktop", actors
    assert "forged" not in actors, actors


def test_settings_body_actor_binds_trusted_principal(tmp_path):
    store = Store(tmp_path / "auth.db")
    app = create_app(store, auth_token="sekrit", auth_principal="trusted-user",
                     auth_principal_is_human=True,
                     kanban_adapter=ReferenceKanbanAdapter(store))
    c = TestClient(app, headers={"Authorization": "Bearer sekrit"})
    StewardshipService(store).enable("p1", mission="m", lead_profile="l",
                                     autonomy_level=2)
    r = c.patch(f"{V}/projects/p1/settings",
                json={"mission": "updated", "actor": "forged-admin"})
    assert r.status_code == 200
    assert store.audit_tail(1)[0]["actor"] == "trusted-user"


def test_work_item_actor_binds_principal_target_stays_named(tmp_path):
    """Targets stay caller-named; only the ACTOR binds (owner decision in
    the P1 regression test at tests/test_api.py:277)."""
    store = Store(tmp_path / "wi.db")
    app = create_app(store, auth_token="sekrit", auth_principal="trusted-user",
                     auth_principal_is_human=True,
                     kanban_adapter=ReferenceKanbanAdapter(store))
    c = TestClient(app, headers={"Authorization": "Bearer sekrit"})
    StewardshipService(store).enable("p1", mission="m", lead_profile="l",
                                     autonomy_level=2)
    r = c.post(f"{V}/projects/p1/work-items", json={
        "title": "Task three", "type": "task", "actor_id": "spoofer",
        "actor_kind": "human"})
    assert r.status_code == 200, r.text
    ref = r.json()["ref"]
    detail = c.get(f"{V}/projects/p1/work-items/{ref}").json()
    if "history" in detail:
        actors = {e.get("actor") for e in detail["history"] if e.get("actor")}
        assert actors <= {"trusted-user"}, actors
    else:
        wb = detail.get("work_item", detail)
        actors = {(wb.get("created_by") or "", wb.get("updated_by") or "")}
        assert all(a in ("", "trusted-user") for a in actors), actors


# --------------------------- R-M2: saved views ----------------------------- #

def test_views_list_query_actor_visible_in_open_mode(tmp_path):
    """Open dev mode keeps caller-named multi-actor view semantics (the
    owner did not refuse unbound writes). The spoof contract is proven by
    the trusted-binding tests: when a principal/proxy identity is bound it
    outranks the query string."""
    c, store = _open_env(tmp_path)
    _seed_view(c)
    r = c.get(f"{V}/projects/p1/views?actor_id=spoofer")
    assert r.status_code == 200, r.text
    assert any(v["name"] == "mine" for v in r.json()["views"])


def test_view_run_query_actor_visible_in_open_mode(tmp_path):
    c, _ = _open_env(tmp_path)
    _seed_view(c)
    r = c.get(f"{V}/projects/p1/views/mine/items?actor_id=spoofer")
    assert r.status_code == 200, r.text


def test_views_list_query_actor_ignored_when_bearer_bound(tmp_path):
    """R-M2 spoof denial: with a bearer principal bound, ?actor_id= never
    becomes the acting identity even when it names a real view owner."""
    store = Store(tmp_path / "vw.db")
    app = create_app(store, auth_token="sekrit", auth_principal="trusted-user",
                     auth_principal_is_human=True,
                     kanban_adapter=ReferenceKanbanAdapter(store))
    c = TestClient(app, headers={"Authorization": "Bearer sekrit"})
    StewardshipService(store).enable("p1", mission="m", lead_profile="l",
                                     autonomy_level=2)
    r = c.put(f"{V}/projects/p1/views", json={
        "name": "mine", "layout": "table", "actor_id": "spoofer"})
    assert r.status_code == 200, r.text
    row = store._conn.execute(
        "SELECT owner_id FROM dockyard_saved_views WHERE name='mine'"
    ).fetchone()
    assert row["owner_id"] == "trusted-user", row


def test_view_delete_via_proxy_records_proxy_user(tmp_path, monkeypatch):
    """Positive path through the REAL plugin proxy: Desktop proxy writes
    still work and record the proxy's vouched user (not a body actor)."""
    monkeypatch.setenv("HERMES_HOME", str(tmp_path))
    monkeypatch.setenv("HERMES_KANBAN_HOME", str(tmp_path))
    monkeypatch.setenv("STEWARD_DB_PATH", str(tmp_path / "db.sqlite"))
    monkeypatch.setenv("DOCKYARD_ACTOR_ID", "trusted-desktop")
    monkeypatch.delenv("STEWARD_RPC_TOKEN", raising=False)
    from pathlib import Path as _P
    proxy_path = _P(__file__).parents[1] / "hermes_dockyard_plugin/dashboard/plugin_api.py"
    spec = importlib.util.spec_from_file_location("rm2_proxy", proxy_path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    store = module._store
    StewardshipService(store).enable("p1", mission="m", lead_profile="l",
                                     autonomy_level=2)
    module._app = create_app(store, kanban_adapter=ReferenceKanbanAdapter(store))
    module._client = module.httpx.AsyncClient(
        transport=module.httpx.ASGITransport(app=module._app),
        base_url="http://dockyard.test")
    host = FastAPI()
    host.include_router(module.plugin_api, prefix="/api")
    client = TestClient(host)
    saved = client.put("/api/projects/p1/views", headers={
        "x-hermes-session-token": "synthetic-desktop-token"},
        json={"name": "px", "layout": "table"})
    assert saved.status_code == 200, saved.text
    row = store._conn.execute(
        "SELECT owner_id FROM dockyard_saved_views WHERE name='px'").fetchone()
    assert row is not None
    assert row["owner_id"] == module._ACTOR_ID == "trusted-desktop", row

    # Desktop proxy deletes still work and are judged by the proxy identity.
    deleted = client.delete("/api/projects/p1/views/px", headers={
        "x-hermes-session-token": "synthetic-desktop-token"})
    assert deleted.status_code == 200, deleted.text
    assert store._conn.execute(
        "SELECT 1 FROM dockyard_saved_views WHERE name='px'").fetchone() is None


def test_view_delete_through_the_proxy_ignores_a_query_actor(tmp_path):
    """R-M2: a Desktop proxy request naming `?actor_id=<owner>` must not
    delete a view that belongs to someone else. On db320ea the query actor
    won and the view was deleted."""
    from hermes_project_stewardship.api.middleware import desktop_proxy_headers
    c, store = _open_env(tmp_path)
    r = c.put(f"{V}/projects/p1/views", json={
        "name": "theirs", "layout": "table", "actor_id": "victim"})
    assert r.status_code == 200, r.text
    r = c.delete(f"{V}/projects/p1/views/theirs?actor_id=victim",
                 headers=desktop_proxy_headers("trusted-desktop"))
    assert r.status_code in (404, 409), r.text
    row = store._conn.execute(
        "SELECT owner_id FROM dockyard_saved_views WHERE name='theirs'").fetchone()
    assert row is not None and row["owner_id"] == "victim", row


def test_views_need_an_actor_when_no_trusted_caller_is_bound(tmp_path):
    """Open dev mode: without a trusted caller the query must name the actor,
    and the refusal says so (not a misleading 'invalid actor_kind')."""
    c, _ = _open_env(tmp_path)
    for request in (lambda: c.get(f"{V}/projects/p1/views"),
                    lambda: c.get(f"{V}/projects/p1/views/mine/items"),
                    lambda: c.delete(f"{V}/projects/p1/views/mine")):
        r = request()
        assert r.status_code == 422, r.text
        assert "actor_id is required" in r.text, r.text


# ------------------------- R-M3: gateway sender ---------------------------- #

def test_gateway_sender_unbound_refused(tmp_path):
    c, _ = _open_env(tmp_path)
    r = c.post(f"{V}/gateway/command", json={
        "platform": "discord", "sender_id": "privileged-user",
        "command": "status", "project_id": "p1", "args": {}})
    assert r.status_code == 403, r.text
    assert r.json()["error"]["code"] == "trusted_principal_required"


def test_gateway_sender_privileged_row_not_spoofable_open(tmp_path):
    """The highest-value spoof: an unauthenticated request naming a
    sender whose gateway_permissions row allows approve/trigger must be
    refused, not executed."""
    c, store = _open_env(tmp_path)
    StewardshipService(store).set_gateway_permission(
        "p1", platform="discord", sender_id="privileged-user",
        can_approve=True, can_trigger=True)
    r = c.post(f"{V}/gateway/command", json={
        "platform": "discord", "sender_id": "privileged-user",
        "command": "run", "project_id": "p1", "args": {}})
    assert r.status_code == 403, r.text


def test_gateway_sender_binds_bearer_principal(tmp_path):
    """With a bearer, the sender_id the caller names must NOT become the
    acting identity; the permission row checked is the principal's."""
    store = Store(tmp_path / "gw.db")
    app = create_app(store, auth_token="sekrit", auth_principal="trusted-user",
                     auth_principal_is_human=True,
                     kanban_adapter=ReferenceKanbanAdapter(store))
    c = TestClient(app, headers={"Authorization": "Bearer sekrit"})
    StewardshipService(store).enable("p1", mission="m", lead_profile="l",
                                     autonomy_level=2)
    # A permission row exists for the SPOOFED sender only.
    StewardshipService(store).set_gateway_permission(
        "p1", platform="discord", sender_id="privileged-user",
        can_approve=True, can_trigger=True)
    r = c.post(f"{V}/gateway/command", json={
        "platform": "discord", "sender_id": "privileged-user",
        "command": "run", "project_id": "p1", "args": {}})
    assert r.status_code == 200, r.text
    assert r.json()["ok"] is False and "not permitted" in r.json()["text"], (
        "permission rows of a body-named sender must not apply")