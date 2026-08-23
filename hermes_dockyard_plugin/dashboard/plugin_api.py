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


async def _proxy(method: str, path: str, json_body: dict | None = None):
    """Forward a request to the Dockyard API app and normalise the reply."""
    from starlette.testclient import TestClient  # local import: heavy

    with TestClient(_app) as client:
        response = client.request(method, path, json=json_body)
    if response.status_code >= 400:
        raise HTTPException(status_code=response.status_code,
                            detail=response.json())
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
    suffix = f"?status={status}" if status else ""
    return await _proxy(
        "GET", f"/stewardship/v1/projects/{project_id}/work-items{suffix}")


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


class DecisionBody(BaseModel):
    actor_id: str = "sahil"


@plugin_api.post("/initiatives/{ref}/approve")
async def approve(ref: str, body: DecisionBody | None = None) -> dict:
    return await _proxy(
        "POST", f"/stewardship/v1/initiatives/{ref}/approve",
        {"actor_id": "sahil"})


@plugin_api.post("/notifications/{notification_id}/ack")
async def ack(notification_id: int) -> dict:
    return await _proxy(
        "POST", f"/stewardship/v1/notifications/{notification_id}/ack",
        {"actor_id": "sahil"})
