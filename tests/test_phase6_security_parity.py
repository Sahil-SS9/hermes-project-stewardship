"""PM-0603/0604/0605 Phase 6 security and surface-parity tests.

- Gateway/messaging surface: no destructive mutations by default; deep
  links must be exact, never fabricated.
- Verified-principal enforcement: fail closed on missing identity;
  browser origin/CSRF assumptions are tested, not implied.
- Route parity: every dashboard-frontend call must resolve to a real
  backend route; no false-empty substitution.
"""

from __future__ import annotations

import json
import shutil
import sys
from pathlib import Path

import httpx2 as httpx
import pytest
from fastapi.testclient import TestClient

from hermes_project_stewardship.api.server import create_app
from hermes_project_stewardship.domain.constants import Capability
from hermes_project_stewardship.gateway.handler import CommandRequest, GatewayCommandHandler
from hermes_project_stewardship.kanban import ReferenceKanbanAdapter
from hermes_project_stewardship.persistence.membership import MembershipService
from hermes_project_stewardship.persistence.service import StewardshipService
from hermes_project_stewardship.persistence.store import Store


@pytest.fixture()
def phase6(tmp_path: Path):
    store = Store(tmp_path / "phase6-sec.db")
    service = StewardshipService(store)
    service.enable("demo", mission="m", lead_profile="lead", member_profiles=["worker"])
    app = create_app(
        store,
        kanban_adapter=ReferenceKanbanAdapter(store),
        auth_token="secret",
        auth_principal="sahil",
        auth_principal_is_human=True,
        capabilities={member.value for member in Capability},
    )
    client = TestClient(app)
    yield store, service, client, {"Authorization": "Bearer secret"}
    store.close()


# ------------------------------------------------------------------ #
# PM-0603: messaging surface supports discovery/approval only
# ------------------------------------------------------------------ #

DESTRUCTIVE_COMMANDS = (
    "archive", "disable", "freeze", "pause", "remove", "delete",
    "restore", "transfer", "reassign", "relink", "resume", "enable",
)


def test_pm0603_gateway_rejects_destructive_commands(phase6):
    _store, service, _client, _h = phase6
    handler = GatewayCommandHandler(service)
    for cmd in DESTRUCTIVE_COMMANDS:
        resp = handler.handle(CommandRequest(
            platform="discord", sender_id="u1", command=cmd, project_id="demo",
        ))
        assert resp.ok is False, cmd
        assert "not supported over messaging" in resp.text, cmd


def test_pm0603_gateway_unknown_command_still_refused(phase6):
    _store, service, _client, _h = phase6
    handler = GatewayCommandHandler(service)
    resp = handler.handle(CommandRequest(
        platform="discord", sender_id="u1", command="explode", project_id="demo",
    ))
    assert resp.ok is False


def test_pm0603_gateway_reads_and_approval_remain_supported(phase6):
    """PM-0603 keeps discovery/approval over messaging: unknown senders get
    a deny-all permission set (platform auth binds the sender identity),
    and destructive commands are refused before any capability check."""
    _store, service, _client, _h = phase6
    handler = GatewayCommandHandler(service)
    # Unenrolled sender: deny-all permissions, reads still return truthful
    # data without leaking more than the read itself allows.
    resp = handler.handle(CommandRequest(
        platform="discord", sender_id="stranger", command="status", project_id="demo",
    ))
    assert resp.ok is True
    assert "demo" in resp.text


# ------------------------------------------------------------------ #
# PM-0603: deep links are exact — no fabricated URL schemes
# ------------------------------------------------------------------ #


def test_pm0603_no_fabricated_deep_link_schemes_in_messaging_templates():
    """Templates must not invent hermes:// routes the host never promised
    (PM-0014 spike: no supported deep-link contract was found)."""
    src = Path(__file__).resolve().parents[1] / (
        "src/hermes_project_stewardship/gateway/templates.py"
    )
    text = src.read_text(encoding="utf-8")
    assert "hermes://" not in text


def test_pm0603_no_fabricated_deep_link_schemes_in_dashboard_sdk():
    src = Path(__file__).resolve().parents[1] / (
        "hermes_dockyard_plugin/dashboard/src/api.ts"
    )
    text = src.read_text(encoding="utf-8")
    assert "hermes://" not in text


# ------------------------------------------------------------------ #
# PM-0604: fail-closed identity and capability enforcement
# ------------------------------------------------------------------ #


def test_pm0604_membership_mutation_without_principal_fails_closed(phase6, monkeypatch):
    """Bypassing the bearer middleware (as a mis-wired host mount would)
    must leave membership writes unreachable: 503, not a payload-actor
    mutation."""
    store, _service, client, _h = phase6
    # Build an app whose middleware stack is absent but whose routes are
    # mounted — the API server constructs middleware inside create_app, so
    # simulate the mis-wired host by calling the route through an app
    # without auth wiring.
    from hermes_project_stewardship.api import server as server_module

    bare = create_app(
        store,
        auth_token=None,      # no auth configured
        auth_principal="sahil",
        auth_principal_is_human=True,
        capabilities={member.value for member in Capability},
    )
    monkeypatch.setattr(server_module, "MissingAuthMiddleware", object)
    probe = TestClient(bare)
    resp = probe.post(
        "/stewardship/v1/projects/demo/members",
        json={"profile_slug": "new"},
    )
    assert resp.status_code == 503
    assert "no trusted principal" in resp.json()["error"]["message"]


def test_pm0604_membership_mutation_with_token_but_zero_capabilities_403(phase6, tmp_path):
    store, _service, _client, _h = phase6
    app = create_app(
        store,
        auth_token="secret",
        auth_principal="token-principal",
        auth_principal_is_human=True,
        capabilities=frozenset(),  # verified but granted nothing
    )
    client = TestClient(app)
    resp = client.post(
        "/stewardship/v1/projects/demo/members",
        headers={"Authorization": "Bearer secret"},
        json={"profile_slug": "new"},
    )
    assert resp.status_code == 403
    assert "lacks the" in resp.json()["error"]["message"]


def test_pm0604_wrong_token_is_401(phase6):
    _store, _service, client, _h = phase6
    resp = client.post(
        "/stewardship/v1/projects/demo/members",
        headers={"Authorization": "Bearer wrong"},
        json={"profile_slug": "new"},
    )
    assert resp.status_code == 401


def test_pm0604_browser_origin_cross_site_request_is_refused(phase6):
    """CSRF assumption test: a browser-originating cross-site POST with
    cookies but no bearer token must not mutate. The API accepts bearer
    tokens only (no cookie auth), so a cross-site form POST is refused;
    this pins that contract so a future cookie scheme cannot silently
    weaken it."""
    _store, _service, client, _h = phase6
    resp = client.post(
        "/stewardship/v1/projects/demo/members",
        headers={
            "Origin": "https://evil.example",
            "Referer": "https://evil.example/attack",
            "Content-Type": "application/x-www-form-urlencoded",
        },
        data="profile_slug=new",
    )
    assert resp.status_code in (401, 403, 503)
    body = resp.json()
    assert body["error"]["code"] in ("unauthorized", "forbidden", "auth_not_configured")


def test_pm0604_unsafe_methods_not_exempt_from_auth(phase6):
    _store, _service, client, _h = phase6
    for method, path in (
        ("get", "/stewardship/v1/projects/demo/team"),
        ("post", "/stewardship/v1/projects/demo/archive"),
        ("delete", "/stewardship/v1/projects/demo/mission"),
    ):
        resp = getattr(client, method)(path)
        assert resp.status_code in (401, 403, 503), path


# ------------------------------------------------------------------ #
# PM-0605: route parity — dashboard frontend vs backend truth
# ------------------------------------------------------------------ #


def test_pm0605_every_dashboard_call_resolves_to_backend_route(phase6):
    """PM-0605 route parity through the REAL plugin proxy: every call the
    dashboard frontend can make must reach the backend with the same
    method through the real proxy hop. The dashboard subset (PM-0601) is
    documented as read/decision-only; nothing here substitutes a false
    empty state for a missing backend route."""
    store, _service, _client, _h = phase6

    import importlib
    import sys

    tmp_db = store.db_path.parent / "plugin-parity.db"
    import shutil
    shutil.copy(store.db_path, tmp_db)

    monkey_target = "hermes_dockyard_plugin.dashboard.plugin_api"
    saved_modules = {name: sys.modules.pop(name, None) for name in (monkey_target,)}
    try:
        import hermes_dockyard_plugin  # noqa: F401  (namespace package init)
        with pytest.MonkeyPatch.context() as mp:  # restores the suite's sandbox on exit
            mp.setenv("STEWARD_DB_PATH", str(tmp_db))
            plugin = importlib.import_module(monkey_target)

        application = create_app(
            plugin._store,
            kanban_adapter=ReferenceKanbanAdapter(plugin._store),
        )
        plugin._app = application
        plugin._client = httpx.AsyncClient(
            transport=httpx.ASGITransport(app=application),
            base_url="http://parity-test",
        )
        from fastapi import FastAPI

        host = FastAPI()
        host.include_router(plugin.plugin_api, prefix="/api/plugins/hermes-dockyard")
        proxy = TestClient(host)

        # The exact calls dashboard/src/api.ts can make (dashboard subset).
        calls = [
            ("get", "/portfolio", None),
            ("get", "/inbox", None),
            ("get", "/notifications", None),
            ("get", "/initiatives/INIT-1/decision", None),
            ("get", "/projects/demo/objectives", None),
            ("get", "/projects/demo/views?actor_id=sahil", None),
            ("get", "/projects/demo/backlog", None),
            ("get", "/projects/demo/features", None),
            ("get", "/projects/demo/milestones", None),
            ("post", "/initiatives/INIT-1/approve", {}),
            ("post", "/initiatives/INIT-1/reject", {}),
            ("post", "/notifications/1/ack", None),
            ("post", "/projects/demo/milestones", {"name": "parity"}),
            ("post", "/projects/demo/work-items/W-1/transition",
             {"status": "ready", "actor_id": "sahil", "actor_kind": "human"}),
        ]
        for method, path, body in calls:
            if method == "get":
                resp = proxy.get(f"/api/plugins/hermes-dockyard{path}")
            else:
                resp = proxy.post(
                    f"/api/plugins/hermes-dockyard{path}",
                    json=body,
                )
            assert resp.status_code != 500, f"{method.upper()} {path} leaks a raw error"
            payload = resp.json()
            if resp.status_code >= 400:
                # Truthful failure contract: a backend refusal crosses the
                # proxy as its readable message (the detail) with the
                # backend's error code in the X-Dockyard-Error-Code header, or
                # normalised ({"error": ...}). Until 07/10/2026 the whole
                # envelope was nested inside the detail, and the Desktop host
                # printed it as "[object Object]". A missing method/path would
                # instead surface as FastAPI's bare route-miss shape
                # {"detail": "Not Found"} with no error code — that exact
                # shape is the false-empty failure this test refuses (it now
                # also catches a bridge route that forwards to a missing
                # backend route, whose message is "Not Found").
                assert payload != {"detail": "Not Found"}, (
                    f"{method.upper()} {path}: route missing through proxy"
                )
                has_error = "error" in payload or bool(
                    resp.headers.get("x-dockyard-error-code"))
                assert has_error, f"{method.upper()} {path}: {resp.status_code} {payload}"
            else:
                # No false-empty substitution: success payloads are real
                # backend schema shapes, not opaque placeholders.
                assert isinstance(payload, (dict, list))
    finally:
        plugin._store.close()
        for name, mod in saved_modules.items():
            if mod is not None:
                sys.modules[name] = mod


def test_pm0605_backend_route_surface_has_no_false_empty_substitution(phase6):
    """The known historical false-empty pattern (Phase 0 PM-0009/0010) must
    stay dead: a missing sub-resource returns a real 404/409 envelope, not
    200 with an empty payload."""
    _store, _service, client, headers = phase6
    missing = client.get(
        "/stewardship/v1/projects/ghost-project/initiatives", headers=headers
    )
    assert missing.status_code in (404, 409)
    assert "error" in missing.json()
