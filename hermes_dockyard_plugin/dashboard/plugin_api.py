"""Dockyard Dashboard plugin backend.

Mounted by the Hermes dashboard host at /api/plugins/hermes-dockyard/.
Thin proxy over the Dockyard API (create_app) so the plugin frontend
never needs to know where the stewardship service lives. The host
contract expects an ``APIRouter`` named ``plugin_api`` in this module.
"""
from __future__ import annotations

import os
import tempfile
from pathlib import Path

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from hermes_project_stewardship.api.server import create_app
from hermes_project_stewardship.persistence.store import Store

plugin_api = APIRouter()

# Single shared store for the plugin's lifetime; swap via env var.
_DB = Path(
    os.environ.get(
        "DOCKYARD_PLUGIN_DB",
        str(Path(tempfile.gettempdir()) / "hermes-dockyard" / "dockyard.db"),
    )
)
_DB.parent.mkdir(parents=True, exist_ok=True)

_store = Store(_DB)
_app = create_app(_store)


# One process-lifetime client over ASGI: no per-request TestClient churn
# (cor-001/002) and genuinely non-blocking for the host's event loop.
import httpx

_client: httpx.AsyncClient | None = None


def _get_client() -> httpx.AsyncClient:
    global _client
    if _client is None:
        _client = httpx.AsyncClient(
            transport=httpx.ASGITransport(app=_app),
            base_url="http://dockyard.local",
        )
    return _client


async def _proxy(method: str, path: str, json_body: dict | None = None,
                 params: dict | None = None):
    """Forward a request to the Dockyard API app and normalise the reply."""
    response = await _get_client().request(
        method, path, json=json_body, params=params)
    if response.status_code >= 400:
        try:
            detail = response.json()
        except ValueError:
            # cor-003: upstream non-JSON failures (plain-text 500s) must not
            # become an opaque JSONDecodeError here.
            detail = {"error": {"code": "upstream_error",
                                "message": response.text[:500]}}
        raise HTTPException(status_code=response.status_code, detail=detail)
    return response.json()


@plugin_api.get("/health")
async def health() -> dict:
    return {"ok": True, "service": "hermes-dockyard", "db": str(_DB)}


# ---------------------------------------------------------------- reads --
@plugin_api.get("/dashboard")
async def dashboard() -> dict:
    return await _proxy("GET", "/stewardship/v1/dashboard")


@plugin_api.get("/inbox")
async def inbox() -> dict:
    return await _proxy("GET", "/stewardship/v1/inbox")


@plugin_api.get("/notifications")
async def notifications() -> dict:
    return await _proxy("GET", "/stewardship/v1/notifications")


@plugin_api.get("/projects")
async def projects() -> dict:
    return await _proxy("GET", "/stewardship/v1/projects")


@plugin_api.get("/projects/{project_id}/work-items")
async def work_items(project_id: str, status: str | None = None) -> dict:
    from urllib.parse import quote

    # cor-004: quote path segments; pass query values structurally so a
    # crafted value can never inject extra upstream parameters.
    pid = quote(project_id, safe="")
    params = {"status": status} if status else None
    return await _proxy(
        "GET", f"/stewardship/v1/projects/{pid}/work-items", params=params)


# --------------------------------------------------------------- writes --
class OnboardBody(BaseModel):
    project_id: str
    repo_path: str
    mission: str
    lead_profile: str


@plugin_api.post("/onboard")
async def onboard(body: OnboardBody) -> dict:
    payload = body.model_dump()
    payload["actor_id"] = "sahil"
    return await _proxy("POST", "/stewardship/v1/onboard", payload)


@plugin_api.post("/initiatives/{ref}/approve")
async def approve(ref: str) -> dict:
    # Actor attribution is fixed server-side: this dashboard always acts as sahil.
    from urllib.parse import quote

    r = quote(ref, safe="")
    return await _proxy(
        "POST", f"/stewardship/v1/initiatives/{r}/approve",
        {"actor_id": "sahil"})


@plugin_api.post("/notifications/{notification_id}/ack")
async def ack(notification_id: int) -> dict:
    return await _proxy(
        "POST", f"/stewardship/v1/notifications/{notification_id}/ack",
        {"actor_id": "sahil"})
