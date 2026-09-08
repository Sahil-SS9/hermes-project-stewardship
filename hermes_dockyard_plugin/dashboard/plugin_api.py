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
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import quote

import httpx2 as httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, ConfigDict

logger = logging.getLogger(__name__)

from hermes_project_stewardship.persistence.dockyard_store import DockyardStore  # noqa: E402
from hermes_project_stewardship.runtime import (  # noqa: E402
    StateSelectionError,
    open_store,
    resolve_db_path,
)

plugin_api = APIRouter()

# The KenseiAgent host contract mounts the module-level `router` attribute
# (web_server.py `_mount_plugin_api_routes`); `plugin_api` is the same object
# under the name our own docs/tests use.
router = plugin_api

def _default_db_path() -> Path:
    """Return a restart-durable, profile-scoped plugin database path."""
    return resolve_db_path()


# Single shared store for the plugin's lifetime; swap via env var.
# Phase1 F2: state selection is a strict improvement in fail-closed behaviour,
# but a populated legacy database must not take the whole dashboard host down
# at import. Surface the selection error through the plugin's own routes
# (503 with operator guidance); never fall back to an alternate database.
_startup_error: str | None = None
_DB: Path | None = None
_store = None
_app = None
_dockyard = None
try:
    # Deferred import: api.server has a module-level `app = create_app()`
    # that would otherwise run before the guard below (Phase1 F2).
    from hermes_project_stewardship.api.server import create_app

    _DB = _default_db_path()
    _store = open_store(_DB)
    if os.name == "posix":
        _DB.chmod(0o600)
    _dockyard = DockyardStore(_store)
    _app = create_app(_store)
except StateSelectionError as exc:
    # Fail closed: no data moved, no alternate database chosen. The host
    # keeps loading; proxied routes return 503 until an operator selects
    # state explicitly (STEWARD_DB_PATH / --db).
    _startup_error = str(exc)
    logger.error("Dockyard plugin startup degraded: %s", exc)


# One process-lifetime client over ASGI: no per-request TestClient churn
# (cor-001/002) and genuinely non-blocking for the host's event loop.
# Hermaguard fixes: EAGER initialisation (no lazy-init race, HG-CRITICAL),
# explicit timeouts (HG-HIGH), env-configurable base URL (HG-MEDIUM).
_BASE_URL = os.environ.get("DOCKYARD_PLUGIN_URL", "http://dockyard.local")
_ACTOR_ID = os.environ.get("DOCKYARD_ACTOR_ID", "dashboard-user")
_client = httpx.AsyncClient(
    # Degraded startup: no Dockyard app exists yet; requests are rejected in
    # _proxy before ever reaching the transport.
    transport=httpx.ASGITransport(app=_app if _app is not None else APIRouter()),
    base_url=_BASE_URL,
    timeout=httpx.Timeout(10.0, read=30.0),
)
logger.info("Dockyard plugin HTTP client initialised (base_url=%s)", _BASE_URL)


def _degraded_503() -> HTTPException:
    """Fail-closed reply when state selection blocked startup (Phase1 F2)."""
    return HTTPException(
        503,
        "Dockyard plugin did not start: " + (_startup_error or "unknown startup error")
        + " Set STEWARD_DB_PATH (or --db) to select the authoritative database, "
        "then restart the dashboard host.",
    )


async def _proxy(method: str, path: str, json_body: dict | None = None,
                 params: dict | None = None):
    """Forward a request to the Dockyard API app and normalise the reply."""
    if _app is None:
        # Fail closed: never silently pick an alternate database.
        logger.error("Proxy %s %s rejected: plugin startup degraded", method, path)
        raise _degraded_503()
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


class ObjectiveBody(BaseModel):
    name: str
    evaluator_type: str = "manual"
    target: str = ">=1"
    severity: str = "medium"
    description: str = ""
    command: list[str] | None = None
    integration: str | None = None
    window: str = "30d"


class ObjectivePatchBody(BaseModel):
    name: str | None = None
    evaluator_type: str | None = None
    target: str | None = None
    severity: str | None = None
    description: str | None = None
    command: list[str] | None = None
    integration: str | None = None
    window: str | None = None


class ContentUploadBody(BaseModel):
    filename: str
    media_type: str
    content_base64: str


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
    # Degraded startup (Phase1 F2): state selection blocked init; fail closed.
    if _app is None:
        return {"ok": False, "service": "hermes-dockyard", "status": "degraded"}
    return {"ok": True, "service": "hermes-dockyard"}


# ---------------------------------------------------------------- reads --
@plugin_api.get("/dashboard")
async def dashboard() -> dict:
    return await _proxy("GET", "/stewardship/v1/dashboard")


@plugin_api.get("/portfolio")
async def portfolio() -> dict:
    return await _proxy("GET", "/stewardship/v1/portfolio")


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
    # cor-004: quote path segments; pass query values structurally so a
    # crafted value can never inject extra upstream parameters.
    pid = quote(project_id, safe="")
    params = {"status": status} if status else None
    return await _proxy(
        "GET", f"/stewardship/v1/projects/{pid}/work-items", params=params)


@plugin_api.get("/projects/{project_id}/work-items/{ref}")
async def work_item_detail(project_id: str, ref: str) -> dict:
    pid = quote(project_id, safe="")
    item_ref = quote(ref, safe="")
    return await _proxy(
        "GET",
        f"/stewardship/v1/projects/{pid}/work-items/{item_ref}",
    )


@plugin_api.get("/projects/{project_id}/settings")
async def project_settings(project_id: str) -> dict:
    pid = quote(project_id, safe="")
    return await _proxy("GET", f"/stewardship/v1/projects/{pid}/settings")


@plugin_api.patch("/projects/{project_id}/settings")
async def patch_project_settings(project_id: str, body: SettingsPatchBody) -> dict:
    pid = quote(project_id, safe="")
    payload = body.model_dump(exclude_unset=True)
    payload.update({"actor": _ACTOR_ID, "interface": "dockyard:human"})
    return await _proxy(
        "PATCH", f"/stewardship/v1/projects/{pid}/settings", payload
    )


@plugin_api.get("/projects/{project_id}/objectives")
async def project_objectives(
    project_id: str, include_archived: bool = True
) -> dict:
    pid = quote(project_id, safe="")
    return await _proxy(
        "GET",
        f"/stewardship/v1/projects/{pid}/objectives",
        params={"include_archived": include_archived},
    )


class AssessmentBody(BaseModel):
    model_config = ConfigDict(extra="forbid")
    passed: bool
    evidence: list[str]
    detail: str = ""
    expires_at: str | None = None


@plugin_api.post("/projects/{project_id}/objectives/{objective_id}/assessment")
async def record_project_assessment(project_id: str, objective_id: int, body: AssessmentBody) -> dict:
    # The downstream authenticated composition, not this payload/route, decides human authority.
    return await _proxy("POST", f"/stewardship/v1/projects/{quote(project_id, safe='')}/objectives/{objective_id}/assessment",
                        {**body.model_dump(), "interface": "desktop"})


@plugin_api.post("/projects/{project_id}/objectives")
async def create_project_objective(
    project_id: str, body: ObjectiveBody
) -> dict:
    pid = quote(project_id, safe="")
    payload = {
        **body.model_dump(),
        "actor": _ACTOR_ID,
        "interface": "dockyard:human",
    }
    return await _proxy(
        "POST", f"/stewardship/v1/projects/{pid}/objectives", payload
    )


@plugin_api.patch("/projects/{project_id}/objectives/{objective_id}")
async def patch_project_objective(
    project_id: str, objective_id: int, body: ObjectivePatchBody
) -> dict:
    pid = quote(project_id, safe="")
    payload = {
        **body.model_dump(exclude_unset=True),
        "actor": _ACTOR_ID,
        "interface": "dockyard:human",
    }
    return await _proxy(
        "PATCH",
        f"/stewardship/v1/projects/{pid}/objectives/{objective_id}",
        payload,
    )


@plugin_api.post("/projects/{project_id}/objectives/{objective_id}/archive")
async def archive_project_objective(project_id: str, objective_id: int) -> dict:
    pid = quote(project_id, safe="")
    return await _proxy(
        "POST",
        f"/stewardship/v1/projects/{pid}/objectives/{objective_id}/archive",
        {"actor": _ACTOR_ID, "interface": "dockyard:human"},
    )


@plugin_api.delete("/projects/{project_id}/objectives/{objective_id}")
async def remove_project_objective(project_id: str, objective_id: int) -> dict:
    pid = quote(project_id, safe="")
    return await _proxy(
        "DELETE",
        f"/stewardship/v1/projects/{pid}/objectives/{objective_id}",
        {"actor": _ACTOR_ID, "interface": "dockyard:human"},
    )


@plugin_api.get("/projects/{project_id}/missions/archive")
async def project_mission_archive(project_id: str) -> dict:
    pid = quote(project_id, safe="")
    return await _proxy(
        "GET", f"/stewardship/v1/projects/{pid}/missions/archive"
    )


@plugin_api.post("/projects/{project_id}/mission/archive")
async def archive_project_mission(project_id: str) -> dict:
    pid = quote(project_id, safe="")
    return await _proxy(
        "POST",
        f"/stewardship/v1/projects/{pid}/mission/archive",
        {"actor": _ACTOR_ID, "interface": "dockyard:human"},
    )


@plugin_api.delete("/projects/{project_id}/mission")
async def remove_project_mission(project_id: str) -> dict:
    pid = quote(project_id, safe="")
    return await _proxy(
        "DELETE",
        f"/stewardship/v1/projects/{pid}/mission",
        {"actor": _ACTOR_ID, "interface": "dockyard:human"},
    )


@plugin_api.get("/projects/{project_id}/content")
async def project_content(project_id: str) -> dict:
    pid = quote(project_id, safe="")
    return await _proxy("GET", f"/stewardship/v1/projects/{pid}/content")


@plugin_api.post("/projects/{project_id}/content")
async def upload_project_content(
    project_id: str, body: ContentUploadBody
) -> dict:
    pid = quote(project_id, safe="")
    payload = {
        **body.model_dump(),
        "actor": _ACTOR_ID,
        "interface": "dockyard:human",
    }
    return await _proxy(
        "POST", f"/stewardship/v1/projects/{pid}/content", payload
    )


@plugin_api.get("/projects/{project_id}/content/{content_id}/preview")
async def project_content_preview(project_id: str, content_id: str) -> dict:
    pid = quote(project_id, safe="")
    cid = quote(content_id, safe="")
    return await _proxy(
        "GET", f"/stewardship/v1/projects/{pid}/content/{cid}/preview"
    )


@plugin_api.post("/projects/{project_id}/reports")
async def generate_project_report(project_id: str, body: ReportBody) -> dict:
    pid = quote(project_id, safe="")
    payload = {
        **body.model_dump(),
        "actor_id": _ACTOR_ID,
        "actor_kind": "human",
    }
    return await _proxy(
        "POST", f"/stewardship/v1/projects/{pid}/reports", payload
    )


@plugin_api.get("/projects/{project_id}/reports")
async def project_reports(project_id: str, limit: int = 20) -> dict:
    pid = quote(project_id, safe="")
    return await _proxy(
        "GET", f"/stewardship/v1/projects/{pid}/reports",
        params={"limit": limit},
    )


@plugin_api.get("/projects/{project_id}/reports/{report_id}")
async def project_report(project_id: str, report_id: str) -> dict:
    pid = quote(project_id, safe="")
    rid = quote(report_id, safe="")
    return await _proxy(
        "GET", f"/stewardship/v1/projects/{pid}/reports/{rid}"
    )


@plugin_api.get("/projects/{project_id}/initiatives")
async def project_initiatives(project_id: str,
                              status: str | None = None) -> dict:
    pid = quote(project_id, safe="")
    params = {"status": status} if status else None
    return await _proxy(
        "GET", f"/stewardship/v1/projects/{pid}/initiatives", params=params)


@plugin_api.get("/projects/{project_id}/events")
async def project_events(project_id: str, limit: int = 50) -> dict:
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
    if _dockyard is None:
        raise _degraded_503()
    return _session_list(bot_id, limit=limit)


@plugin_api.get("/bots/{bot_id}/sessions/{session_id}")
def bot_transcript(bot_id: str, session_id: str, limit: int = 200) -> dict:
    if _dockyard is None:
        raise _degraded_503()
    return _session_transcript(bot_id, session_id, limit=limit)


@plugin_api.get("/workload")
async def workload() -> dict:
    return await _proxy("GET", "/stewardship/v1/workload")


@plugin_api.get("/bot-groups")
async def bot_groups() -> dict:
    return await _proxy("GET", "/stewardship/v1/bot-groups")


@plugin_api.get("/bot-groups/{name}/messages")
async def bot_group_messages(name: str, limit: int = 50) -> dict:
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


class WorkUpdateBody(BaseModel):
    model_config = ConfigDict(extra="forbid")
    title: str | None = None
    type: str | None = None
    body: str | None = None
    parent_ref: str | None = None
    labels: list[str] | None = None
    evidence_refs: list[str] | None = None
    estimate_days: float | None = None
    due: str | None = None


class WorkAssignBody(BaseModel):
    model_config = ConfigDict(extra="forbid")
    assignee_id: str | None = None


class DependencyBody(BaseModel):
    model_config = ConfigDict(extra="forbid")
    dependency_ref: str


class InitiativeCompleteBody(BaseModel):
    model_config = ConfigDict(extra="forbid")
    verified: bool = True
    regressed: bool = False


class DecisionActionBody(BaseModel):
    model_config = ConfigDict(extra="forbid")
    expected_fingerprint: str | None = None
    reason: str = ""
    note: str = ""


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
    pid = quote(project_id, safe="")
    item = quote(ref, safe="")
    return await _proxy(
        "POST", f"/stewardship/v1/projects/{pid}/work-items/{item}/transition",
        {"status": body.status, "actor_id": _ACTOR_ID, "actor_kind": "human"})


@plugin_api.patch("/projects/{project_id}/work-items/{ref}")
async def update_work_item(project_id: str, ref: str, body: WorkUpdateBody) -> dict:
    pid = quote(project_id, safe="")
    item = quote(ref, safe="")
    return await _proxy(
        "PATCH",
        f"/stewardship/v1/projects/{pid}/work-items/{item}",
        {**body.model_dump(exclude_unset=True), "actor_id": _ACTOR_ID, "actor_kind": "human"},
    )


@plugin_api.post("/projects/{project_id}/work-items/{ref}/assign")
async def assign_work_item(project_id: str, ref: str, body: WorkAssignBody) -> dict:
    pid = quote(project_id, safe="")
    item = quote(ref, safe="")
    return await _proxy(
        "POST",
        f"/stewardship/v1/projects/{pid}/work-items/{item}/assign",
        {"assignee_id": body.assignee_id, "actor_id": _ACTOR_ID, "actor_kind": "human"},
    )


@plugin_api.post("/projects/{project_id}/work-items/{ref}/dependencies")
async def add_work_dependency(project_id: str, ref: str, body: DependencyBody) -> dict:
    pid = quote(project_id, safe="")
    item = quote(ref, safe="")
    return await _proxy(
        "POST",
        f"/stewardship/v1/projects/{pid}/work-items/{item}/dependencies",
        {"dependency_ref": body.dependency_ref, "actor_id": _ACTOR_ID, "actor_kind": "human"},
    )


@plugin_api.post(
    "/projects/{project_id}/work-items/{ref}/dependencies/{dependency_ref}/remove"
)
async def remove_work_dependency(project_id: str, ref: str, dependency_ref: str) -> dict:
    pid = quote(project_id, safe="")
    item = quote(ref, safe="")
    dependency = quote(dependency_ref, safe="")
    return await _proxy(
        "POST",
        f"/stewardship/v1/projects/{pid}/work-items/{item}/dependencies/{dependency}/remove",
        {"actor_id": _ACTOR_ID, "actor_kind": "human"},
    )


@plugin_api.get("/projects/{project_id}/backlog")
async def project_backlog(project_id: str) -> dict:
    pid = quote(project_id, safe="")
    return await _proxy("GET", f"/stewardship/v1/projects/{pid}/backlog")


@plugin_api.post("/projects/{project_id}/backlog/items")
async def create_queued_item(project_id: str, body: QueuedItemBody) -> dict:
    pid = quote(project_id, safe="")
    payload = {
        **body.model_dump(),
        "creator_id": _ACTOR_ID,
        "creator_kind": "human",
    }
    return await _proxy(
        "POST", f"/stewardship/v1/projects/{pid}/backlog/items", payload)


@plugin_api.post("/projects/{project_id}/backlog")
async def add_to_backlog(project_id: str, body: BacklogAddBody) -> dict:
    pid = quote(project_id, safe="")
    return await _proxy(
        "POST", f"/stewardship/v1/projects/{pid}/backlog",
        {**body.model_dump(), "actor_id": _ACTOR_ID, "actor_kind": "human"})


@plugin_api.post("/projects/{project_id}/backlog/{ref}/rerank")
async def rerank_backlog(project_id: str, ref: str,
                         body: BacklogRerankBody) -> dict:
    pid = quote(project_id, safe="")
    item = quote(ref, safe="")
    return await _proxy(
        "POST", f"/stewardship/v1/projects/{pid}/backlog/{item}/rerank",
        {**body.model_dump(), "actor_id": _ACTOR_ID, "actor_kind": "human"})


@plugin_api.get("/projects/{project_id}/views")
async def project_views(project_id: str) -> dict:
    pid = quote(project_id, safe="")
    return await _proxy(
        "GET", f"/stewardship/v1/projects/{pid}/views",
        params={"actor_id": _ACTOR_ID, "actor_kind": "human"})


@plugin_api.put("/projects/{project_id}/views")
async def save_project_view(project_id: str, body: ViewSaveBody) -> dict:
    pid = quote(project_id, safe="")
    return await _proxy(
        "PUT", f"/stewardship/v1/projects/{pid}/views",
        {**body.model_dump(), "actor_id": _ACTOR_ID, "actor_kind": "human"})


@plugin_api.post("/projects/{project_id}/freeze")
async def freeze_project(project_id: str) -> dict:
    pid = quote(project_id, safe="")
    return await _proxy("POST", f"/stewardship/v1/projects/{pid}/freeze")


@plugin_api.post("/projects/{project_id}/pause")
async def pause_project(project_id: str) -> dict:
    pid = quote(project_id, safe="")
    return await _proxy("POST", f"/stewardship/v1/projects/{pid}/pause")


@plugin_api.post("/projects/{project_id}/resume")
async def resume_project(project_id: str) -> dict:
    pid = quote(project_id, safe="")
    return await _proxy("POST", f"/stewardship/v1/projects/{pid}/resume")


@plugin_api.post("/projects/{project_id}/disable")
async def disable_project(project_id: str) -> dict:
    pid = quote(project_id, safe="")
    return await _proxy("POST", f"/stewardship/v1/projects/{pid}/disable")


@plugin_api.post("/projects/{project_id}/re-enable")
async def re_enable_project(project_id: str) -> dict:
    pid = quote(project_id, safe="")
    return await _proxy("POST", f"/stewardship/v1/projects/{pid}/re-enable")


@plugin_api.post("/onboard")
async def onboard(body: OnboardBody) -> dict:
    payload = body.model_dump()
    payload["actor_id"] = _ACTOR_ID
    return await _proxy("POST", "/stewardship/v1/onboard", payload)


@plugin_api.get("/initiatives/{ref}/decision")
async def decision(ref: str) -> dict:
    r = quote(ref, safe="")
    return await _proxy("GET", f"/stewardship/v1/initiatives/{r}/decision")


@plugin_api.get("/initiatives/{ref}/decision/receipts")
async def decision_receipts(ref: str) -> dict:
    r = quote(ref, safe="")
    return await _proxy("GET", f"/stewardship/v1/initiatives/{r}/decision/receipts")


@plugin_api.post("/initiatives/{ref}/approve")
async def approve(ref: str, body: DecisionActionBody | None = None) -> dict:
    # Actor attribution is fixed server-side: this dashboard always acts as sahil.
    r = quote(ref, safe="")
    payload = {"actor": _ACTOR_ID, "interface": "dockyard:human"}
    if body is not None:
        if body.expected_fingerprint is not None:
            payload["expected_fingerprint"] = body.expected_fingerprint
        if body.note:
            payload["note"] = body.note
    return await _proxy("POST", f"/stewardship/v1/initiatives/{r}/approve", payload)


@plugin_api.post("/initiatives/{ref}/reject")
async def reject(ref: str, body: DecisionActionBody | None = None) -> dict:
    r = quote(ref, safe="")
    payload = {"actor": _ACTOR_ID, "interface": "dockyard:human"}
    if body is not None:
        if body.expected_fingerprint is not None:
            payload["expected_fingerprint"] = body.expected_fingerprint
        if body.reason:
            payload["reason"] = body.reason
        if body.note:
            payload["note"] = body.note
    return await _proxy("POST", f"/stewardship/v1/initiatives/{r}/reject", payload)


@plugin_api.post("/initiatives/{ref}/complete")
async def complete_initiative(ref: str, body: InitiativeCompleteBody) -> dict:
    r = quote(ref, safe="")
    return await _proxy(
        "POST",
        f"/stewardship/v1/initiatives/{r}/complete",
        {
            "outcome": {"verified": body.verified},
            "regressed": body.regressed,
            "actor_id": _ACTOR_ID,
            "actor_kind": "human",
        },
    )


@plugin_api.get("/projects/{project_id}/observations")
async def project_observations(project_id: str) -> dict:
    pid = quote(project_id, safe="")
    return await _proxy("GET", f"/stewardship/v1/projects/{pid}/observations")


@plugin_api.post("/observations/{ref}/run")
async def run_observation(ref: str) -> dict:
    r = quote(ref, safe="")
    return await _proxy("POST", f"/stewardship/v1/observations/{r}/run", {})


@plugin_api.get("/projects/{project_id}/workflows/{name}/runs")
async def workflow_runs(project_id: str, name: str) -> dict:
    pid = quote(project_id, safe="")
    wf = quote(name, safe="")
    return await _proxy(
        "GET", f"/stewardship/v1/projects/{pid}/workflows/{wf}/runs")


@plugin_api.post("/notifications/{notification_id}/ack")
async def ack(notification_id: int) -> dict:
    return await _proxy(
        "POST", f"/stewardship/v1/notifications/{notification_id}/ack",
        {"actor_id": _ACTOR_ID})
