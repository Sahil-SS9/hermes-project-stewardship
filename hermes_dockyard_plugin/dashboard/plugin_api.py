"""Dockyard Dashboard plugin backend.

Mounted by the Hermes dashboard host at /api/plugins/hermes-dockyard/.
Thin proxy over the Dockyard API (create_app) so the plugin frontend
never needs to know where the stewardship service lives. The host
contract expects an ``APIRouter`` named ``plugin_api`` in this module.
"""
from __future__ import annotations

import logging
import os
import re
import sqlite3
import tempfile
from datetime import datetime, timezone
from pathlib import Path

import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

logger = logging.getLogger(__name__)

from hermes_project_stewardship.api.server import create_app
from hermes_project_stewardship.persistence.dockyard_store import DockyardStore
from hermes_project_stewardship.persistence.store import Store

plugin_api = APIRouter()

# The KenseiAgent host contract mounts the module-level `router` attribute
# (web_server.py `_mount_plugin_api_routes`); `plugin_api` is the same object
# under the name our own docs/tests use.
router = plugin_api

# Single shared store for the plugin's lifetime; swap via env var.
_DB = Path(
    os.environ.get(
        "DOCKYARD_PLUGIN_DB",
        str(Path(tempfile.gettempdir()) / "hermes-dockyard" / "dockyard.db"),
    )
)
_DB.parent.mkdir(parents=True, exist_ok=True)

# NOTE (lifecycle): _store/_client are closed when the host process exits; the
# desktop-plugin contract exposes no router-level teardown hook, so an explicit
# close would require a custom seam. Acceptable for single-user local tooling.
_store = Store(_DB)
_dockyard = DockyardStore(_store)
_app = create_app(_store)


# One process-lifetime client over ASGI: no per-request TestClient churn
# (cor-001/002) and genuinely non-blocking for the host's event loop.
# Hermaguard fixes: EAGER initialisation (no lazy-init race, HG-CRITICAL),
# explicit timeouts (HG-HIGH), env-configurable base URL (HG-MEDIUM).
_BASE_URL = os.environ.get("DOCKYARD_PLUGIN_URL", "http://dockyard.local")
_client = httpx.AsyncClient(
    transport=httpx.ASGITransport(app=_app),
    base_url=_BASE_URL,
    timeout=httpx.Timeout(10.0, read=30.0),
)
logger.info("Dockyard plugin HTTP client initialised (base_url=%s)", _BASE_URL)


async def _proxy(method: str, path: str, json_body: dict | None = None,
                 params: dict | None = None):
    """Forward a request to the Dockyard API app and normalise the reply."""
    logger.debug("Proxying %s %s", method, path)
    response = await _client.request(method, path, json=json_body, params=params)
    logger.debug("Upstream %s %s -> %s", method, path, response.status_code)
    if response.status_code >= 400:
        try:
            detail = response.json()
        except ValueError:
            # cor-003: upstream non-JSON failures (plain-text 500s) must not
            # become an opaque JSONDecodeError here.
            detail = {"error": {"code": "upstream_error",
                                "message": response.text[:500]}}
        logger.error("Upstream error %s on %s %s",
                     response.status_code, method, path)
        raise HTTPException(status_code=response.status_code, detail=detail)
    try:
        return response.json()
    except ValueError:
        logger.error("Upstream returned invalid JSON on successful %s %s", method, path)
        raise HTTPException(502, "Dockyard returned an invalid response")


_PROFILE_NAME = re.compile(r"^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$")
_SESSION_SCOPE_NOTE = "System prompts and private reasoning are excluded."


class SettingsPatchBody(BaseModel):
    mission: str | None = None
    lead_profile: str | None = None
    member_profiles: list[str] | None = None
    autonomy_level: int | None = None
    autonomy_policy: dict | None = None
    verification_policy: dict | None = None
    release_policy: dict | None = None
    notification_policy: dict | None = None


class ReportBody(BaseModel):
    report_type: str = "executive"
    include_activity: bool = True


def _as_iso(value) -> str | None:
    if value is None:
        return None
    if isinstance(value, (int, float)):
        return datetime.fromtimestamp(value, tz=timezone.utc).isoformat()
    return str(value)


def _bot_session_source(bot_id: str) -> tuple[str, Path]:
    bot = _dockyard.bot_get(bot_id)
    if bot is None:
        raise HTTPException(404, f"unknown bot {bot_id}")
    profile = bot.profile or bot_id.removesuffix("-bot")
    if not _PROFILE_NAME.fullmatch(profile):
        raise HTTPException(422, "bot profile name is not safe to resolve")

    root = Path(
        os.environ.get("DOCKYARD_SESSION_ROOT")
        or os.environ.get("HERMES_HOME")
        or str(Path.home() / ".hermes")
    ).expanduser().resolve()
    candidate = (
        root / "state.db"
        if profile == "default"
        else root / "profiles" / profile / "state.db"
    ).resolve()
    if candidate != root / "state.db" and root not in candidate.parents:
        raise HTTPException(422, "bot session store escapes the Hermes home")
    return profile, candidate


def _open_session_store(path: Path):
    if not path.is_file():
        return None
    connection = sqlite3.connect(
        f"{path.as_uri()}?mode=ro", uri=True, timeout=2.0
    )
    connection.row_factory = sqlite3.Row
    return connection


def _table_columns(connection, table: str) -> set[str]:
    queries = {
        "sessions": "PRAGMA table_info(sessions)",
        "messages": "PRAGMA table_info(messages)",
    }
    if table not in queries:
        raise ValueError(f"unsupported session-store table {table!r}")
    return {row["name"] for row in connection.execute(queries[table])}


def _session_list(bot_id: str, limit: int = 25) -> dict:
    profile, db_path = _bot_session_source(bot_id)
    connection = _open_session_store(db_path)
    if connection is None:
        return {
            "bot_id": bot_id,
            "profile": profile,
            "available": False,
            "sessions": [],
            "scope_note": _SESSION_SCOPE_NOTE,
        }
    try:
        columns = _table_columns(connection, "sessions")
        if "id" not in columns:
            raise HTTPException(503, "Hermes session store has no sessions table")
        where = "WHERE COALESCE(hidden, 0)=0" if "hidden" in columns else ""
        order = (
            "COALESCE(last_activity_at, started_at)"
            if "last_activity_at" in columns
            else "started_at"
        )
        rows = connection.execute(
            f"SELECT * FROM sessions {where} ORDER BY {order} DESC LIMIT ?",
            (max(1, min(int(limit), 100)),),
        ).fetchall()
        sessions = []
        for row in rows:
            data = dict(row)
            sessions.append({
                "session_id": data["id"],
                "title": data.get("title") or data["id"],
                "source": data.get("source") or "unknown",
                "model": data.get("model"),
                "started_at": _as_iso(data.get("started_at")),
                "last_activity_at": _as_iso(
                    data.get("last_activity_at") or data.get("started_at")
                ),
                "ended_at": _as_iso(data.get("ended_at")),
                "message_count": int(data.get("message_count") or 0),
                "tool_call_count": int(data.get("tool_call_count") or 0),
                "status": "completed" if data.get("ended_at") else "active",
            })
        return {
            "bot_id": bot_id,
            "profile": profile,
            "available": True,
            "sessions": sessions,
            "scope_note": _SESSION_SCOPE_NOTE,
        }
    except sqlite3.DatabaseError as exc:
        logger.warning("Could not read bot session list for %s: %s", bot_id, exc)
        raise HTTPException(503, "Hermes session store could not be read")
    finally:
        connection.close()


def _session_transcript(bot_id: str, session_id: str, limit: int = 200) -> dict:
    profile, db_path = _bot_session_source(bot_id)
    connection = _open_session_store(db_path)
    if connection is None:
        raise HTTPException(404, "No Hermes session store is available for this bot")
    try:
        session = connection.execute(
            "SELECT * FROM sessions WHERE id=?", (session_id,)
        ).fetchone()
        if session is None:
            raise HTTPException(404, "session not found for this bot profile")
        metadata = dict(session)
        if bool(metadata.get("hidden")):
            raise HTTPException(404, "session not found for this bot profile")
        columns = _table_columns(connection, "messages")
        if not {"session_id", "role"}.issubset(columns):
            raise HTTPException(503, "Hermes session store has no transcript table")
        active = "AND COALESCE(active, 1)=1" if "active" in columns else ""
        private_kinds = (
            "AND COALESCE(LOWER(display_kind), '') NOT IN "
            "('reasoning','thinking','internal','hidden','internal_notification')"
            if "display_kind" in columns else ""
        )
        order = "id" if "id" in columns else "timestamp"
        rows = connection.execute(
            f"SELECT * FROM messages WHERE session_id=? {active} "
            f"AND LOWER(role) NOT IN ('system','reasoning') {private_kinds} "
            f"ORDER BY {order} LIMIT ?",
            (session_id, max(1, min(int(limit), 500))),
        ).fetchall()
        messages = []
        for row in rows:
            data = dict(row)
            content = str(data.get("content") or "")
            truncated = len(content) > 6000
            messages.append({
                "message_id": data.get("id"),
                "role": data["role"],
                "content": content[:6000],
                "tool_name": data.get("tool_name"),
                "timestamp": _as_iso(data.get("timestamp")),
                "display_kind": data.get("display_kind"),
                "truncated": truncated,
            })
        return {
            "bot_id": bot_id,
            "profile": profile,
            "session": {
                "session_id": metadata["id"],
                "title": metadata.get("title") or metadata["id"],
                "source": metadata.get("source") or "unknown",
                "model": metadata.get("model"),
                "started_at": _as_iso(metadata.get("started_at")),
                "ended_at": _as_iso(metadata.get("ended_at")),
            },
            "messages": messages,
            "scope_note": _SESSION_SCOPE_NOTE,
        }
    except sqlite3.DatabaseError as exc:
        logger.warning("Could not read bot transcript for %s: %s", bot_id, exc)
        raise HTTPException(503, "Hermes session transcript could not be read")
    finally:
        connection.close()


@plugin_api.get("/health")
async def health() -> dict:
    # No filesystem paths in responses: dashboard viewers need liveness only.
    return {"ok": True, "service": "hermes-dockyard"}


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


@plugin_api.get("/projects/{project_id}/settings")
async def project_settings(project_id: str) -> dict:
    from urllib.parse import quote

    pid = quote(project_id, safe="")
    return await _proxy("GET", f"/stewardship/v1/projects/{pid}/settings")


@plugin_api.patch("/projects/{project_id}/settings")
async def patch_project_settings(project_id: str, body: SettingsPatchBody) -> dict:
    from urllib.parse import quote

    pid = quote(project_id, safe="")
    payload = body.model_dump(exclude_unset=True)
    payload.update({"actor": "sahil", "interface": "dockyard:human"})
    return await _proxy(
        "PATCH", f"/stewardship/v1/projects/{pid}/settings", payload
    )


@plugin_api.post("/projects/{project_id}/reports")
async def generate_project_report(project_id: str, body: ReportBody) -> dict:
    from urllib.parse import quote

    pid = quote(project_id, safe="")
    payload = {
        **body.model_dump(),
        "actor_id": "sahil",
        "actor_kind": "human",
    }
    return await _proxy(
        "POST", f"/stewardship/v1/projects/{pid}/reports", payload
    )


@plugin_api.get("/projects/{project_id}/reports")
async def project_reports(project_id: str, limit: int = 20) -> dict:
    from urllib.parse import quote

    pid = quote(project_id, safe="")
    return await _proxy(
        "GET", f"/stewardship/v1/projects/{pid}/reports",
        params={"limit": limit},
    )


@plugin_api.get("/projects/{project_id}/reports/{report_id}")
async def project_report(project_id: str, report_id: str) -> dict:
    from urllib.parse import quote

    pid = quote(project_id, safe="")
    rid = quote(report_id, safe="")
    return await _proxy(
        "GET", f"/stewardship/v1/projects/{pid}/reports/{rid}"
    )


@plugin_api.get("/projects/{project_id}/initiatives")
async def project_initiatives(project_id: str,
                              status: str | None = None) -> dict:
    from urllib.parse import quote

    pid = quote(project_id, safe="")
    params = {"status": status} if status else None
    return await _proxy(
        "GET", f"/stewardship/v1/projects/{pid}/initiatives", params=params)


@plugin_api.get("/projects/{project_id}/events")
async def project_events(project_id: str, limit: int = 50) -> dict:
    from urllib.parse import quote

    pid = quote(project_id, safe="")
    return await _proxy(
        "GET", f"/stewardship/v1/projects/{pid}/events",
        params={"limit": limit})


@plugin_api.get("/bots")
async def bots(status: str | None = None) -> dict:
    params = {"status": status} if status else None
    return await _proxy("GET", "/stewardship/v1/bots", params=params)


@plugin_api.get("/bots/{bot_id}/sessions")
def bot_sessions(bot_id: str, limit: int = 25) -> dict:
    return _session_list(bot_id, limit=limit)


@plugin_api.get("/bots/{bot_id}/sessions/{session_id}")
def bot_transcript(bot_id: str, session_id: str, limit: int = 200) -> dict:
    return _session_transcript(bot_id, session_id, limit=limit)


@plugin_api.get("/workload")
async def workload() -> dict:
    return await _proxy("GET", "/stewardship/v1/workload")


@plugin_api.get("/bot-groups")
async def bot_groups() -> dict:
    return await _proxy("GET", "/stewardship/v1/bot-groups")


@plugin_api.get("/bot-groups/{name}/messages")
async def bot_group_messages(name: str, limit: int = 50) -> dict:
    from urllib.parse import quote

    group = quote(name, safe="")
    return await _proxy(
        "GET", f"/stewardship/v1/bot-groups/{group}/messages",
        params={"limit": limit})


# --------------------------------------------------------------- writes --
class OnboardBody(BaseModel):
    project_id: str
    repo_path: str
    mission: str
    lead_profile: str


class TransitionBody(BaseModel):
    status: str


class BacklogAddBody(BaseModel):
    ref: str
    rank: int
    reason: str


class QueuedItemBody(BaseModel):
    type: str
    title: str
    assignee_id: str
    assignee_kind: str = "bot"
    rank: int
    reason: str
    initiative_ref: str | None = None


class BacklogRerankBody(BaseModel):
    new_rank: int
    reason: str


class ViewSaveBody(BaseModel):
    name: str
    layout: str
    filters: dict = {}
    shared: bool = False


@plugin_api.post("/projects/{project_id}/work-items/{ref}/transition")
async def transition_work_item(project_id: str, ref: str,
                               body: TransitionBody) -> dict:
    from urllib.parse import quote

    pid = quote(project_id, safe="")
    item = quote(ref, safe="")
    return await _proxy(
        "POST", f"/stewardship/v1/projects/{pid}/work-items/{item}/transition",
        {"status": body.status, "actor_id": "sahil", "actor_kind": "human"})


@plugin_api.get("/projects/{project_id}/backlog")
async def project_backlog(project_id: str) -> dict:
    from urllib.parse import quote

    pid = quote(project_id, safe="")
    return await _proxy("GET", f"/stewardship/v1/projects/{pid}/backlog")


@plugin_api.post("/projects/{project_id}/backlog/items")
async def create_queued_item(project_id: str, body: QueuedItemBody) -> dict:
    from urllib.parse import quote

    pid = quote(project_id, safe="")
    payload = {
        **body.model_dump(),
        "creator_id": "sahil",
        "creator_kind": "human",
    }
    return await _proxy(
        "POST", f"/stewardship/v1/projects/{pid}/backlog/items", payload)


@plugin_api.post("/projects/{project_id}/backlog")
async def add_to_backlog(project_id: str, body: BacklogAddBody) -> dict:
    from urllib.parse import quote

    pid = quote(project_id, safe="")
    return await _proxy(
        "POST", f"/stewardship/v1/projects/{pid}/backlog",
        {**body.model_dump(), "actor_id": "sahil", "actor_kind": "human"})


@plugin_api.post("/projects/{project_id}/backlog/{ref}/rerank")
async def rerank_backlog(project_id: str, ref: str,
                         body: BacklogRerankBody) -> dict:
    from urllib.parse import quote

    pid = quote(project_id, safe="")
    item = quote(ref, safe="")
    return await _proxy(
        "POST", f"/stewardship/v1/projects/{pid}/backlog/{item}/rerank",
        {**body.model_dump(), "actor_id": "sahil", "actor_kind": "human"})


@plugin_api.get("/projects/{project_id}/views")
async def project_views(project_id: str) -> dict:
    from urllib.parse import quote

    pid = quote(project_id, safe="")
    return await _proxy(
        "GET", f"/stewardship/v1/projects/{pid}/views",
        params={"actor_id": "sahil", "actor_kind": "human"})


@plugin_api.put("/projects/{project_id}/views")
async def save_project_view(project_id: str, body: ViewSaveBody) -> dict:
    from urllib.parse import quote

    pid = quote(project_id, safe="")
    return await _proxy(
        "PUT", f"/stewardship/v1/projects/{pid}/views",
        {**body.model_dump(), "actor_id": "sahil", "actor_kind": "human"})


@plugin_api.post("/projects/{project_id}/freeze")
async def freeze_project(project_id: str) -> dict:
    from urllib.parse import quote

    pid = quote(project_id, safe="")
    return await _proxy("POST", f"/stewardship/v1/projects/{pid}/freeze")


@plugin_api.post("/projects/{project_id}/pause")
async def pause_project(project_id: str) -> dict:
    from urllib.parse import quote

    pid = quote(project_id, safe="")
    return await _proxy("POST", f"/stewardship/v1/projects/{pid}/pause")


@plugin_api.post("/projects/{project_id}/resume")
async def resume_project(project_id: str) -> dict:
    from urllib.parse import quote

    pid = quote(project_id, safe="")
    return await _proxy("POST", f"/stewardship/v1/projects/{pid}/resume")


@plugin_api.post("/projects/{project_id}/disable")
async def disable_project(project_id: str) -> dict:
    from urllib.parse import quote

    pid = quote(project_id, safe="")
    return await _proxy("POST", f"/stewardship/v1/projects/{pid}/disable")


@plugin_api.post("/projects/{project_id}/re-enable")
async def re_enable_project(project_id: str) -> dict:
    from urllib.parse import quote

    pid = quote(project_id, safe="")
    return await _proxy("POST", f"/stewardship/v1/projects/{pid}/re-enable")


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
        {"actor": "sahil", "interface": "dockyard:human"})


@plugin_api.post("/initiatives/{ref}/reject")
async def reject(ref: str) -> dict:
    from urllib.parse import quote

    r = quote(ref, safe="")
    return await _proxy(
        "POST", f"/stewardship/v1/initiatives/{r}/reject",
        {"actor": "sahil", "interface": "dockyard:human"})


@plugin_api.post("/notifications/{notification_id}/ack")
async def ack(notification_id: int) -> dict:
    return await _proxy(
        "POST", f"/stewardship/v1/notifications/{notification_id}/ack",
        {"actor_id": "sahil"})
