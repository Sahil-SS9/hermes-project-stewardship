"""PM-0111 authority: privileged membership operations require a verified
principal carrying the explicit capability; payload actor strings alone
never authorise (Phase 0 §1.5, locked decision).
"""
from __future__ import annotations

from fastapi.testclient import TestClient

from hermes_project_stewardship.api.server import create_app
from hermes_project_stewardship.domain.constants import Capability
from hermes_project_stewardship.persistence.store import Store


class _ProfileDiscoveryAdapter:
    def list_profiles(self):
        return [{"slug": "sahil", "available": True}, {"slug": "octacon", "available": True}]


def _client(tmp_path, *, token: str | None = "t0k", principal: str = "sahil",
            is_human: bool = True, capabilities=None):
    store = Store(tmp_path / "authority.db")
    app = create_app(store=store, auth_token=token,
                     auth_principal=principal, auth_principal_is_human=is_human,
                     capabilities=capabilities, kanban_adapter=_ProfileDiscoveryAdapter())
    client = TestClient(app)
    return client, store


AUTH = {"Authorization": "Bearer t0k"}


def test_pm0111_capability_enums_are_wellformed():
    values = {c.value for c in Capability}
    assert values == {
        "membership_admin", "lead_transfer", "bulk_reassignment",
        "project_archive", "managed_file_removal",
    }


def test_pm0111_membership_write_requires_verified_principal(tmp_path):
    """An unauthenticated caller cannot mutate membership (401)."""
    client, store = _client(tmp_path)
    try:
        client.post(
            "/stewardship/v1/projects/demo/enable",
            json={"mission": "m", "lead_profile": "sahil"},
            headers=AUTH,
        )
        r = client.post(
            "/stewardship/v1/projects/demo/members",
            json={"profile_slug": "octacon", "role": "member"},
        )
        assert r.status_code == 401
    finally:
        store.close()


def test_pm0111_payload_actor_is_not_authorisation(tmp_path):
    """A payload actor string never grants membership authority.

    The bearer token verifies a shared (non-human) principal; the payload
    claims a human actor, but authority comes from the verified principal,
    so the write is refused with 403.
    """
    client, store = _client(tmp_path, is_human=False)
    try:
        created = client.post(
            "/stewardship/v1/projects/demo/enable",
            json={"mission": "m", "lead_profile": "sahil"},
            headers=AUTH,
        )
        assert created.status_code in (200, 201), created.text
        # Attempt with NO verified principal (server composed without one)
        # but a spoofed payload actor.
        r = client.post(
            "/stewardship/v1/projects/demo/members",
            json={"profile_slug": "octacon", "role": "member",
                  "actor": "spoofed-admin"},
            headers=AUTH,
        )
        assert r.status_code == 403  # verified non-human principal: capability denied
    finally:
        store.close()


def test_pm0111_human_without_lead_transfer_capability_exact_403(tmp_path):
    """Fix 6: a verified human lacking lead_transfer gets exactly 403."""
    client, store = _client(tmp_path, capabilities={"membership_admin"})
    try:
        created = client.post(
            "/stewardship/v1/projects/demo/enable",
            json={"mission": "m", "lead_profile": "sahil"},
            headers=AUTH,
        )
        assert created.status_code in (200, 201), created.text
        r = client.post(
            "/stewardship/v1/projects/demo/members/octacon/lead",
            json={"profile_slug": "octacon", "actor": "sahil"},
            headers=AUTH,
        )
        assert r.status_code == 403
        # membership_admin capability still works for the same principal.
        add = client.post(
            "/stewardship/v1/projects/demo/members",
            json={"profile_slug": "octacon"},
            headers=AUTH,
        )
        assert add.status_code in (200, 201)
    finally:
        store.close()


def test_pm0111_human_without_bulk_reassignment_exact_403(tmp_path):
    """Fix 6: a verified human lacking bulk_reassignment and lead_transfer
    is refused with exactly 403 on the lead route (bulk route lands in
    Phase 4 on the same authority path)."""
    client, store = _client(tmp_path, capabilities=set())
    try:
        client.post(
            "/stewardship/v1/projects/demo/enable",
            json={"mission": "m", "lead_profile": "sahil"},
            headers=AUTH,
        )
        r = client.post(
            "/stewardship/v1/projects/demo/members/octacon/lead",
            json={"profile_slug": "octacon", "actor": "sahil"},
            headers=AUTH,
        )
        assert r.status_code == 403
    finally:
        store.close()


def test_pm0111_membership_write_requires_verified_principal_exact_401(tmp_path):
    """Unauthenticated membership write is exactly 401 (no capability check first)."""
    client, store = _client(tmp_path)
    try:
        r = client.post(
            "/stewardship/v1/projects/demo/members",
            json={"profile_slug": "octacon", "role": "member"},
        )
        assert r.status_code == 401
    finally:
        store.close()


def test_pm0111_verified_human_can_administer_membership(tmp_path):
    """A verified human principal with membership-admin capability succeeds."""
    client, store = _client(tmp_path)
    try:
        created = client.post(
            "/stewardship/v1/projects/demo/enable",
            json={"mission": "m", "lead_profile": "sahil"},
            headers=AUTH,
        )
        assert created.status_code in (200, 201), created.text
        r = client.post(
            "/stewardship/v1/projects/demo/members",
            json={"profile_slug": "octacon", "role": "member"},
            headers=AUTH,
        )
        assert r.status_code in (200, 201), r.text
        listing = client.get("/stewardship/v1/projects/demo/members", headers=AUTH)
        assert listing.status_code == 200
        slugs = {m["profile_slug"] for m in listing.json()["members"]}
        assert "octacon" in slugs
    finally:
        store.close()