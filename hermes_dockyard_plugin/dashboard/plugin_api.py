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
from contextvars import ContextVar
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import quote

import httpx2 as httpx
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, ConfigDict

logger = logging.getLogger(__name__)

from hermes_project_stewardship.api.middleware import desktop_proxy_headers  # noqa: E402
from hermes_project_stewardship.persistence.dockyard_store import DockyardStore  # noqa: E402
from hermes_project_stewardship.persistence.schema_guard import SchemaDriftError  # noqa: E402
from hermes_project_stewardship.persistence.store import NewerSchemaError  # noqa: E402
from hermes_project_stewardship.runtime import (  # noqa: E402
    StateSelectionError,
    open_store,
    resolve_db_path,
)

_REQUEST_AUTHORIZATION: ContextVar[str | None] = ContextVar(
    "dockyard_plugin_request_authorization", default=None
)


async def _capture_request(request: Request):
    authorization = request.headers.get("authorization")
    if authorization is None and os.environ.get("HERMES_DASHBOARD_SESSION_TOKEN"):
        session_token = request.headers.get("x-hermes-session-token")
        if session_token:
            authorization = f"Bearer {session_token}"
    token = _REQUEST_AUTHORIZATION.set(authorization)
    try:
        yield
    finally:
        _REQUEST_AUTHORIZATION.reset(token)


plugin_api = APIRouter(dependencies=[Depends(_capture_request)])

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
    # Deferred import keeps the guard below in charge of every startup error.
    from hermes_project_stewardship.api.server import create_app

    _DB = _default_db_path()
    _store = open_store(_DB)
    if os.name == "posix":
        _DB.chmod(0o600)
    _dockyard = DockyardStore(_store)
    _rpc_token = os.environ.get("STEWARD_RPC_TOKEN") or os.environ.get("HERMES_DASHBOARD_SESSION_TOKEN")
    _rpc_capabilities = frozenset(
        value.strip() for value in os.environ.get("STEWARD_RPC_CAPABILITIES", "").split(",")
        if value.strip()
    )
    _app = create_app(
        _store,
        auth_token=_rpc_token,
        auth_principal=os.environ.get("STEWARD_RPC_PRINCIPAL", "dashboard-user"),
        auth_principal_is_human=os.environ.get("STEWARD_RPC_PRINCIPAL_KIND") == "human",
        capabilities=_rpc_capabilities,
    )
except (StateSelectionError, SchemaDriftError, NewerSchemaError) as exc:
    # Fail closed: no data moved, no alternate database chosen, nothing
    # migrated. The host keeps loading; proxied routes return 503 with the
    # reason until an operator selects or repairs state (P addendum fix 3).
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
        + " Set STEWARD_DB_PATH (or --db) to select the authoritative database,"
        " or repair it with `stewardctl db repair` on a copy, then restart the"
        " dashboard host.",
    )


async def _proxy(method: str, path: str, json_body: dict | None = None,
                 params: dict | None = None):
    """Forward a request to the Dockyard API app and normalise the reply."""
    if _app is None:
        # Fail closed: never silently pick an alternate database.
        logger.error("Proxy %s %s rejected: plugin startup degraded", method, path)
        raise _degraded_503()
    logger.debug("Proxying %s %s", method, path)
    # Hermes only routes an authenticated dashboard user here, so the proxy
    # vouches for that user (owner decision 03/10/2026, Q2). The backend
    # trusts this only for decisions, and a bearer principal still wins.
    headers = desktop_proxy_headers(_ACTOR_ID)
    authorization = _REQUEST_AUTHORIZATION.get()
    if authorization:
        headers["authorization"] = authorization
    response = await _client.request(
        method, path, json=json_body, params=params, headers=headers
    )
    logger.debug("Upstream %s %s -> %s", method, path, response.status_code)
    if response.status_code >= 400:
        detail, code = _upstream_error(response)
        logger.error("Upstream error %s on %s %s",
                     response.status_code, method, path)
        raise HTTPException(
            status_code=response.status_code, detail=detail,
            headers={"X-Dockyard-Error-Code": code} if code else None)
    try:
        return response.json()
    except ValueError:
        logger.error("Upstream returned invalid JSON on successful %s %s", method, path)
        raise HTTPException(502, "Dockyard returned an invalid response")


def _upstream_error(response) -> tuple[object, str | None]:
    """A refusal from the Dockyard API as (detail, error code).

    The API answers every error as ``{"error": {"code", "message",
    "fields"?}}`` (api/middleware.py). Passing that whole body on as this
    route's detail put the message two levels down, and the Desktop host,
    which prints ``<status>: <detail>``, showed every refusal as
    "[object Object]" (07/10/2026, WORKFLOWS-R1.md finding 10). The detail is
    now the message a person reads; the code travels in the
    ``X-Dockyard-Error-Code`` header. FastAPI-style ``{"detail": ...}`` bodies
    are unwrapped the same way; anything else passes through unchanged.
    """
    try:
        body = response.json()
    except ValueError:
        # cor-003: upstream non-JSON failures (plain-text 500s) must not
        # become an opaque JSONDecodeError here.
        return (response.text[:500] or "Dockyard returned an error"), "upstream_error"
    if isinstance(body, dict) and isinstance(body.get("error"), dict):
        error = body["error"]
        message = str(error.get("message") or "request failed")
        fields = error.get("fields")
        if isinstance(fields, dict) and fields:
            message += " (" + "; ".join(f"{name}: {reason}" for name, reason in fields.items()) + ")"
        return message, (str(error["code"]) if error.get("code") else None)
    if isinstance(body, dict) and "detail" in body:
        detail = body["detail"]
        if isinstance(detail, list):
            messages = [str(item["msg"]) for item in detail
                        if isinstance(item, dict) and item.get("msg")]
            if messages:
                return "; ".join(messages), None
        return detail, None
    return body, None


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


class FeaturePatchBody(BaseModel):
    model_config = ConfigDict(extra="forbid")
    features: dict[str, bool]


class GoalCreateBody(BaseModel):
    model_config = ConfigDict(extra="forbid")
    title: str
    description: str = ""
    position: int | None = None
    objective_ids: list[int] = []


class GoalPatchBody(BaseModel):
    model_config = ConfigDict(extra="forbid")
    title: str | None = None
    description: str | None = None
    position: int | None = None
    objective_ids: list[int] | None = None


class GoalOrderBody(BaseModel):
    model_config = ConfigDict(extra="forbid")
    goal_ids: list[str]


class WorkflowDefineBody(BaseModel):
    model_config = ConfigDict(extra="forbid")
    name: str
    nodes: list[dict]


class WorkflowVersionBody(BaseModel):
    model_config = ConfigDict(extra="forbid")
    nodes: list[dict]


class WorkflowStartBody(BaseModel):
    model_config = ConfigDict(extra="forbid")
    run_key: str
    version: int


# Batch W library contract. Shapes mirror the backend models exactly; no
# attribution fields, so the backend's trusted principal is always used.
class WorkflowLibraryBody(BaseModel):
    model_config = ConfigDict(extra="forbid")
    scope: str
    name: str
    owner_project_id: str | None = None
    nodes: list[dict]


class WorkflowEnablementBody(BaseModel):
    # strict: only a JSON boolean is accepted ("true"/1 are refused), matching
    # the backend's StrictBool without a non-builtin annotation.
    model_config = ConfigDict(extra="forbid", strict=True)
    enabled: bool


class WorkflowScopedStartBody(BaseModel):
    model_config = ConfigDict(extra="forbid")
    run_key: str
    version: int | None = None


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


@plugin_api.get("/search")
async def fleet_search(q: str, limit: int = 30) -> dict:
    return await _proxy("GET", "/stewardship/v1/search",
                        params={"q": q, "limit": limit})


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


@plugin_api.get("/projects/{project_id}/work-dependencies")
async def work_dependencies(project_id: str) -> dict:
    return await _proxy(
        "GET", f"/stewardship/v1/projects/{quote(project_id, safe='')}/work-dependencies")


class MemberBody(BaseModel):
    model_config = ConfigDict(extra="forbid")
    profile_slug: str
    role: str = "member"


class TransferPreviewBody(BaseModel):
    model_config = ConfigDict(extra="forbid")
    from_profile: str
    to_profile: str


class TransferExecuteBody(TransferPreviewBody):
    fingerprint: str
    idempotency_key: str
    selected_ids: list[str] | None = None


@plugin_api.get("/projects/{project_id}/team")
async def project_team(project_id: str) -> dict:
    return await _proxy("GET", f"/stewardship/v1/projects/{quote(project_id, safe='')}/team")


@plugin_api.get("/projects/{project_id}/members")
async def list_project_members(project_id: str) -> dict:
    # Read-only: the planning canvas owner pickers list current members.
    return await _proxy("GET", f"/stewardship/v1/projects/{quote(project_id, safe='')}/members")


@plugin_api.post("/projects/{project_id}/members")
async def add_project_member(project_id: str, body: MemberBody) -> dict:
    return await _proxy("POST", f"/stewardship/v1/projects/{quote(project_id, safe='')}/members", body.model_dump())


@plugin_api.post("/projects/{project_id}/members/{profile_slug}/lead")
async def transfer_project_lead(project_id: str, profile_slug: str) -> dict:
    return await _proxy("POST", f"/stewardship/v1/projects/{quote(project_id, safe='')}/members/{quote(profile_slug, safe='')}/lead", {"profile_slug": profile_slug})


@plugin_api.post("/projects/{project_id}/transfers/preview")
async def preview_project_transfer(project_id: str, body: TransferPreviewBody) -> dict:
    return await _proxy("POST", f"/stewardship/v1/projects/{quote(project_id, safe='')}/transfers/preview", body.model_dump())


@plugin_api.post("/projects/{project_id}/transfers/execute")
async def execute_project_transfer(project_id: str, body: TransferExecuteBody) -> dict:
    return await _proxy("POST", f"/stewardship/v1/projects/{quote(project_id, safe='')}/transfers/execute", body.model_dump())


@plugin_api.post("/projects/{project_id}/reassignments")
async def bulk_project_reassignment(project_id: str, body: TransferExecuteBody) -> dict:
    return await _proxy("POST", f"/stewardship/v1/projects/{quote(project_id, safe='')}/reassignments", body.model_dump())


@plugin_api.get("/projects/{project_id}/transfers/pending")
async def pending_project_transfers(project_id: str) -> dict:
    return await _proxy("GET", f"/stewardship/v1/projects/{quote(project_id, safe='')}/transfers/pending")


@plugin_api.get("/operations/{op_id}")
async def project_transfer_operation(op_id: str) -> dict:
    return await _proxy("GET", f"/stewardship/v1/operations/{quote(op_id, safe='')}")


@plugin_api.post("/operations/{op_id}/retry")
async def retry_project_transfer(op_id: str) -> dict:
    return await _proxy("POST", f"/stewardship/v1/operations/{quote(op_id, safe='')}/retry", {})


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


@plugin_api.get("/projects/{project_id}/goals")
async def project_goals(project_id: str, include_archived: bool = True) -> dict:
    pid = quote(project_id, safe="")
    return await _proxy(
        "GET", f"/stewardship/v1/projects/{pid}/goals",
        params={"include_archived": include_archived},
    )


@plugin_api.post("/projects/{project_id}/goals")
async def create_project_goal(project_id: str, body: GoalCreateBody) -> dict:
    return await _proxy(
        "POST", f"/stewardship/v1/projects/{quote(project_id, safe='')}/goals",
        body.model_dump(exclude_none=True),
    )


@plugin_api.put("/projects/{project_id}/goals/order")
async def order_project_goals(project_id: str, body: GoalOrderBody) -> dict:
    return await _proxy(
        "PUT", f"/stewardship/v1/projects/{quote(project_id, safe='')}/goals/order",
        body.model_dump(),
    )


@plugin_api.patch("/projects/{project_id}/goals/{goal_id}")
async def patch_project_goal(project_id: str, goal_id: str, body: GoalPatchBody) -> dict:
    return await _proxy(
        "PATCH",
        f"/stewardship/v1/projects/{quote(project_id, safe='')}/goals/{quote(goal_id, safe='')}",
        body.model_dump(exclude_unset=True),
    )


@plugin_api.post("/projects/{project_id}/goals/{goal_id}/archive")
async def archive_project_goal(project_id: str, goal_id: str) -> dict:
    return await _proxy(
        "POST",
        f"/stewardship/v1/projects/{quote(project_id, safe='')}/goals/{quote(goal_id, safe='')}/archive",
        {},
    )


@plugin_api.post("/projects/{project_id}/goals/{goal_id}/restore")
async def restore_project_goal(project_id: str, goal_id: str) -> dict:
    return await _proxy(
        "POST",
        f"/stewardship/v1/projects/{quote(project_id, safe='')}/goals/{quote(goal_id, safe='')}/restore",
        {},
    )


@plugin_api.delete("/projects/{project_id}/goals/{goal_id}")
async def delete_project_goal(project_id: str, goal_id: str) -> dict:
    # Design round f, Option B: archived goals only (the backend refuses others).
    return await _proxy(
        "DELETE",
        f"/stewardship/v1/projects/{quote(project_id, safe='')}/goals/{quote(goal_id, safe='')}",
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


@plugin_api.post("/projects/{project_id}/objectives/{objective_id}/evaluate")
async def evaluate_project_objective(project_id: str, objective_id: int) -> dict:
    """D6 Evaluate-now: evaluate ONLY the selected objective.

    No body: the downstream composition decides authority (human principal
    required); the caller cannot name the actor."""
    pid = quote(project_id, safe="")
    return await _proxy(
        "POST",
        f"/stewardship/v1/projects/{pid}/objectives/{objective_id}/evaluate",
    )


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


@plugin_api.get("/projects/{project_id}/canvas")
async def project_canvas(project_id: str) -> dict:
    return await _proxy("GET", f"/stewardship/v1/projects/{quote(project_id, safe='')}/canvas")


@plugin_api.put("/projects/{project_id}/canvas")
async def save_project_canvas(project_id: str, body: dict) -> dict:
    return await _proxy(
        "PUT", f"/stewardship/v1/projects/{quote(project_id, safe='')}/canvas",
        {**body, "actor": _ACTOR_ID},
    )


@plugin_api.delete("/projects/{project_id}/canvas/objects/{object_id}")
async def remove_canvas_object(project_id: str, object_id: str, expected_revision: int) -> dict:
    return await _proxy(
        "DELETE",
        f"/stewardship/v1/projects/{quote(project_id, safe='')}/canvas/objects/{quote(object_id, safe='')}",
        params={"expected_revision": expected_revision, "actor": _ACTOR_ID},
    )


@plugin_api.post("/projects/{project_id}/canvas/curate")
async def curate_project_canvas(project_id: str) -> dict:
    return await _proxy("POST", f"/stewardship/v1/projects/{quote(project_id, safe='')}/canvas/curate", {})


@plugin_api.post("/projects/{project_id}/canvas/sessions")
async def start_canvas_session(project_id: str, body: dict) -> dict:
    return await _proxy("POST", f"/stewardship/v1/projects/{quote(project_id, safe='')}/canvas/sessions", {**body, "actor": _ACTOR_ID})


@plugin_api.get("/canvas/sessions/{session_id}")
async def get_canvas_session(session_id: str) -> dict:
    return await _proxy("GET", f"/stewardship/v1/canvas/sessions/{quote(session_id, safe='')}")


@plugin_api.post("/canvas/sessions/{session_id}/answer")
async def answer_canvas_session(session_id: str, body: dict) -> dict:
    return await _proxy("POST", f"/stewardship/v1/canvas/sessions/{quote(session_id, safe='')}/answer", {**body, "actor": _ACTOR_ID})


@plugin_api.post("/canvas/proposals/{proposal_id}/decision")
async def decide_canvas_proposal(proposal_id: str, body: dict) -> dict:
    # The decider comes from this proxy's vouching headers, never the body
    # (Q2 rule, extended to canvas proposals 04/10/2026).
    payload = {key: value for key, value in body.items() if key != "actor"}
    return await _proxy("POST", f"/stewardship/v1/canvas/proposals/{quote(proposal_id, safe='')}/decision", payload)


@plugin_api.post("/canvas/proposals/{proposal_id}/plan")
async def synthesise_canvas_plan(proposal_id: str, body: dict) -> dict:
    return await _proxy("POST", f"/stewardship/v1/canvas/proposals/{quote(proposal_id, safe='')}/plan", body)


# ---- D14/D16/D19: several named planning boards per project ---------------
# Writes always carry the trusted desktop principal; a client "actor" field is
# overwritten, never forwarded.
@plugin_api.get("/canvas/models")
async def canvas_models() -> dict:
    return await _proxy("GET", "/stewardship/v1/canvas/models")


@plugin_api.get("/projects/{project_id}/canvases")
async def list_canvas_boards(project_id: str, include_archived: bool = False) -> dict:
    return await _proxy(
        "GET", f"/stewardship/v1/projects/{quote(project_id, safe='')}/canvases",
        params={"include_archived": "true" if include_archived else "false"},
    )


@plugin_api.post("/projects/{project_id}/canvases")
async def create_canvas_board(project_id: str, body: dict) -> dict:
    return await _proxy(
        "POST", f"/stewardship/v1/projects/{quote(project_id, safe='')}/canvases",
        {**body, "actor": _ACTOR_ID},
    )


@plugin_api.get("/projects/{project_id}/canvases/{canvas_id}")
async def get_canvas_board(project_id: str, canvas_id: str) -> dict:
    return await _proxy(
        "GET", f"/stewardship/v1/projects/{quote(project_id, safe='')}/canvases/{quote(canvas_id, safe='')}")


@plugin_api.put("/projects/{project_id}/canvases/{canvas_id}")
async def save_canvas_board(project_id: str, canvas_id: str, body: dict) -> dict:
    return await _proxy(
        "PUT", f"/stewardship/v1/projects/{quote(project_id, safe='')}/canvases/{quote(canvas_id, safe='')}",
        {**body, "actor": _ACTOR_ID},
    )


@plugin_api.patch("/projects/{project_id}/canvases/{canvas_id}")
async def update_canvas_board(project_id: str, canvas_id: str, body: dict) -> dict:
    return await _proxy(
        "PATCH", f"/stewardship/v1/projects/{quote(project_id, safe='')}/canvases/{quote(canvas_id, safe='')}",
        {**body, "actor": _ACTOR_ID},
    )


@plugin_api.post("/projects/{project_id}/canvases/{canvas_id}/sessions")
async def start_canvas_board_session(project_id: str, canvas_id: str, body: dict) -> dict:
    return await _proxy(
        "POST",
        f"/stewardship/v1/projects/{quote(project_id, safe='')}/canvases/{quote(canvas_id, safe='')}/sessions",
        {**body, "actor": _ACTOR_ID},
    )


@plugin_api.delete("/projects/{project_id}/canvases/{canvas_id}/objects/{object_id}")
async def remove_canvas_board_object(project_id: str, canvas_id: str, object_id: str, expected_revision: int) -> dict:
    return await _proxy(
        "DELETE",
        f"/stewardship/v1/projects/{quote(project_id, safe='')}/canvases/{quote(canvas_id, safe='')}/objects/{quote(object_id, safe='')}",
        params={"expected_revision": expected_revision, "actor": _ACTOR_ID},
    )


@plugin_api.post("/projects/{project_id}/canvases/{canvas_id}/curate")
async def curate_canvas_board(project_id: str, canvas_id: str) -> dict:
    return await _proxy(
        "POST", f"/stewardship/v1/projects/{quote(project_id, safe='')}/canvases/{quote(canvas_id, safe='')}/curate", {})


@plugin_api.patch("/projects/{project_id}/plans/{plan_id}")
async def update_canvas_plan_steps(project_id: str, plan_id: str, body: dict) -> dict:
    return await _proxy(
        "PATCH", f"/stewardship/v1/projects/{quote(project_id, safe='')}/plans/{quote(plan_id, safe='')}",
        {**body, "actor": _ACTOR_ID},
    )


@plugin_api.get("/projects/{project_id}/canvases/{canvas_id}/plans")
async def list_canvas_board_plans(project_id: str, canvas_id: str) -> dict:
    return await _proxy(
        "GET",
        f"/stewardship/v1/projects/{quote(project_id, safe='')}/canvases/{quote(canvas_id, safe='')}/plans")


@plugin_api.get("/projects/{project_id}/plans")
async def list_project_plans(project_id: str) -> dict:
    return await _proxy("GET", f"/stewardship/v1/projects/{quote(project_id, safe='')}/plans")


@plugin_api.get("/projects/{project_id}/plans/{plan_id}")
async def get_project_plan(project_id: str, plan_id: str) -> dict:
    return await _proxy("GET", f"/stewardship/v1/projects/{quote(project_id, safe='')}/plans/{quote(plan_id, safe='')}")


@plugin_api.post("/projects/{project_id}/plans/{plan_id}/document")
async def build_project_plan_document(project_id: str, plan_id: str) -> dict:
    return await _proxy("POST", f"/stewardship/v1/projects/{quote(project_id, safe='')}/plans/{quote(plan_id, safe='')}/document", {})


@plugin_api.post("/projects/{project_id}/plans/{plan_id}/document/save")
async def save_project_plan_document(project_id: str, plan_id: str) -> dict:
    return await _proxy("POST", f"/stewardship/v1/projects/{quote(project_id, safe='')}/plans/{quote(plan_id, safe='')}/document/save", {})


@plugin_api.post("/projects/{project_id}/plans/{plan_id}/backlog")
async def create_plan_backlog_items(project_id: str, plan_id: str, body: dict) -> dict:
    return await _proxy("POST", f"/stewardship/v1/projects/{quote(project_id, safe='')}/plans/{quote(plan_id, safe='')}/backlog", body)



@plugin_api.get("/projects/{project_id}/content")
async def project_content(
    project_id: str, include_archived: bool = True,
    include_removed: bool = False,
) -> dict:
    pid = quote(project_id, safe="")
    return await _proxy(
        "GET", f"/stewardship/v1/projects/{pid}/content",
        params={"include_archived": include_archived, "include_removed": include_removed},
    )


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


@plugin_api.get("/projects/{project_id}/content/{content_id}/image")
async def project_content_image(project_id: str, content_id: str) -> dict:
    pid = quote(project_id, safe="")
    cid = quote(content_id, safe="")
    return await _proxy("GET", f"/stewardship/v1/projects/{pid}/content/{cid}/image")


@plugin_api.get("/projects/{project_id}/content/{content_id}/dependencies")
async def project_content_dependencies(project_id: str, content_id: str) -> dict:
    return await _proxy(
        "GET",
        f"/stewardship/v1/projects/{quote(project_id, safe='')}/content/{quote(content_id, safe='')}/dependencies",
    )


@plugin_api.post("/projects/{project_id}/content/{content_id}/archive")
async def archive_project_content(project_id: str, content_id: str) -> dict:
    return await _proxy(
        "POST",
        f"/stewardship/v1/projects/{quote(project_id, safe='')}/content/{quote(content_id, safe='')}/archive",
        {},
    )


@plugin_api.post("/projects/{project_id}/content/{content_id}/restore")
async def restore_project_content(project_id: str, content_id: str) -> dict:
    return await _proxy(
        "POST",
        f"/stewardship/v1/projects/{quote(project_id, safe='')}/content/{quote(content_id, safe='')}/restore",
        {},
    )


@plugin_api.delete("/projects/{project_id}/content/{content_id}")
async def remove_project_content(project_id: str, content_id: str) -> dict:
    return await _proxy(
        "DELETE",
        f"/stewardship/v1/projects/{quote(project_id, safe='')}/content/{quote(content_id, safe='')}",
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


@plugin_api.post("/projects/{project_id}/initiatives")
async def propose_project_initiative(project_id: str, body: dict) -> dict:
    pid = quote(project_id, safe='')
    return await _proxy(
        "POST", f"/stewardship/v1/projects/{pid}/initiatives", body)


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


@plugin_api.post("/projects/{project_id}/bots")
async def register_project_bot(project_id: str, body: dict) -> dict:
    return await _proxy(
        "POST",
        f"/stewardship/v1/projects/{quote(project_id, safe='')}/bots",
        body,
    )


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


@plugin_api.post("/bot-groups")
async def create_bot_group(body: dict) -> dict:
    return await _proxy("POST", "/stewardship/v1/bot-groups", body)


@plugin_api.get("/bot-groups/{name}/messages")
async def bot_group_messages(name: str, limit: int = 50) -> dict:
    group = quote(name, safe="")
    return await _proxy(
        "GET", f"/stewardship/v1/bot-groups/{group}/messages",
        params={"limit": limit})


# --------------------------------------------------------------- writes --
class OnboardBody(BaseModel):
    model_config = ConfigDict(extra="forbid")
    project_id: str
    name: str | None = None
    slug: str | None = None
    repo_path: str
    mission: str
    lead_profile: str
    member_profiles: list[str] = []
    board_slug: str | None = None
    idempotency_key: str | None = None
    autonomy_level: int = 2
    expected_membership_revision: int | None = None
    preflight_token: str | None = None
    actor_id: str | None = None


class TransitionBody(BaseModel):
    status: str


class WorkUpdateBody(BaseModel):
    model_config = ConfigDict(extra="forbid")
    title: str | None = None
    type: str | None = None
    body: str | None = None
    parent_ref: str | None = None
    initiative_ref: str | None = None
    labels: list[str] | None = None
    evidence_refs: list[str] | None = None
    estimate_days: float | None = None
    due: str | None = None
    reason: str | None = None


class WorkAssignBody(BaseModel):
    model_config = ConfigDict(extra="forbid")
    assignee_id: str | None = None


class MilestoneCreateBody(BaseModel):
    name: str
    due: str | None = None


class MilestoneAttachBody(BaseModel):
    ref: str


class MilestoneRenameBody(BaseModel):
    new_name: str


class MilestoneUpdateBody(BaseModel):
    due: str | None = None
    closed: bool | None = None


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


# The caller never names the actor: these bodies forbid it. For decisions the
# backend takes the decider from the bearer principal or this proxy's vouching
# headers; for resubmit and comments the proxy attaches _ACTOR_ID itself.
class RequestChangesBody(BaseModel):
    model_config = ConfigDict(extra="forbid")
    expected_fingerprint: str | None = None
    feedback: str = ""
    note: str = ""


class ResubmitBody(BaseModel):
    model_config = ConfigDict(extra="forbid")
    rationale: str | None = None
    expected_outcome: str | None = None
    risk: str | None = None
    note: str = ""


class WithdrawBody(BaseModel):
    # Design round f, Option B. Like the decision bodies, the caller never
    # names the actor: the backend takes it from this proxy's vouching.
    model_config = ConfigDict(extra="forbid")
    reason: str = ""


class InitiativeCommentBody(BaseModel):
    model_config = ConfigDict(extra="forbid")
    body: str = ""


class BacklogAddBody(BaseModel):
    ref: str
    rank: int
    reason: str


class QueuedItemBody(BaseModel):
    model_config = ConfigDict(extra="forbid")
    type: str
    title: str
    body: str | None = None
    labels: list[str] = []
    evidence_refs: list[str] = []
    # Unassigned is allowed (Sahil 04/10): Hermes never dispatches unassigned work.
    assignee_id: str | None = None
    assignee_kind: str = "bot"
    rank: int
    reason: str
    initiative_ref: str | None = None
    parent_ref: str | None = None
    estimate_days: float | None = None
    due: str | None = None
    idempotency_key: str | None = None


class BacklogRerankBody(BaseModel):
    new_rank: int
    reason: str


class BacklogImportBody(BaseModel):
    csv_text: str
    apply: bool = False


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


@plugin_api.post("/projects/{project_id}/milestones")
async def create_milestone(project_id: str, body: MilestoneCreateBody) -> dict:
    pid = quote(project_id, safe="")
    return await _proxy(
        "POST", f"/stewardship/v1/projects/{pid}/milestones",
        {**body.model_dump(), "actor_id": _ACTOR_ID, "actor_kind": "human"})


@plugin_api.get("/projects/{project_id}/milestones")
async def list_milestones(project_id: str, include_archived: bool = True) -> dict:
    pid = quote(project_id, safe="")
    return await _proxy(
        "GET", f"/stewardship/v1/projects/{pid}/milestones",
        params={"include_archived": include_archived},
    )


@plugin_api.get("/projects/{project_id}/milestones/{name}")
async def milestone_detail(project_id: str, name: str) -> dict:
    pid = quote(project_id, safe="")
    milestone = quote(name, safe="")
    return await _proxy("GET", f"/stewardship/v1/projects/{pid}/milestones/{milestone}")


@plugin_api.patch("/projects/{project_id}/milestones/{name}")
async def update_milestone(project_id: str, name: str, body: MilestoneUpdateBody) -> dict:
    pid = quote(project_id, safe="")
    milestone = quote(name, safe="")
    return await _proxy(
        "PATCH", f"/stewardship/v1/projects/{pid}/milestones/{milestone}",
        {**body.model_dump(exclude_unset=True), "actor_id": _ACTOR_ID, "actor_kind": "human"})


@plugin_api.post("/projects/{project_id}/milestones/{name}/rename")
async def rename_milestone(project_id: str, name: str, body: MilestoneRenameBody) -> dict:
    pid = quote(project_id, safe="")
    milestone = quote(name, safe="")
    return await _proxy(
        "POST", f"/stewardship/v1/projects/{pid}/milestones/{milestone}/rename",
        {**body.model_dump(), "actor_id": _ACTOR_ID, "actor_kind": "human"})


@plugin_api.post("/projects/{project_id}/milestones/{name}/archive")
async def archive_milestone(project_id: str, name: str) -> dict:
    return await _proxy(
        "POST",
        f"/stewardship/v1/projects/{quote(project_id, safe='')}/milestones/{quote(name, safe='')}/archive",
        {},
    )


@plugin_api.post("/projects/{project_id}/milestones/{name}/restore")
async def restore_milestone(project_id: str, name: str) -> dict:
    return await _proxy(
        "POST",
        f"/stewardship/v1/projects/{quote(project_id, safe='')}/milestones/{quote(name, safe='')}/restore",
        {},
    )


@plugin_api.delete("/projects/{project_id}/milestones/{name}")
async def delete_milestone(project_id: str, name: str) -> dict:
    # Design round f, Option B: archived milestones only (the backend refuses others).
    return await _proxy(
        "DELETE",
        f"/stewardship/v1/projects/{quote(project_id, safe='')}/milestones/{quote(name, safe='')}",
    )


@plugin_api.post("/projects/{project_id}/milestones/{name}/attach")
async def attach_milestone(project_id: str, name: str, body: MilestoneAttachBody) -> dict:
    pid = quote(project_id, safe="")
    milestone = quote(name, safe="")
    return await _proxy(
        "POST", f"/stewardship/v1/projects/{pid}/milestones/{milestone}/attach",
        {**body.model_dump(), "actor_id": _ACTOR_ID, "actor_kind": "human"})


@plugin_api.post("/projects/{project_id}/milestones/{name}/detach")
async def detach_milestone(project_id: str, name: str, body: MilestoneAttachBody) -> dict:
    pid = quote(project_id, safe="")
    milestone = quote(name, safe="")
    return await _proxy(
        "POST", f"/stewardship/v1/projects/{pid}/milestones/{milestone}/detach",
        {**body.model_dump(), "actor_id": _ACTOR_ID, "actor_kind": "human"})


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


@plugin_api.post("/projects/{project_id}/backlog/import")
async def import_backlog_csv(project_id: str, body: BacklogImportBody) -> dict:
    """Shared-validator CSV import: preview (apply=false) or commit (apply=true)."""
    pid = quote(project_id, safe="")
    return await _proxy(
        "POST", f"/stewardship/v1/projects/{pid}/backlog/import",
        {**body.model_dump(), "actor_id": _ACTOR_ID, "actor_kind": "human"})


@plugin_api.get("/projects/{project_id}/backlog/import-template")
async def backlog_import_template(project_id: str) -> dict:
    pid = quote(project_id, safe="")
    return await _proxy(
        "GET", f"/stewardship/v1/projects/{pid}/backlog/import-template")


@plugin_api.get("/projects/{project_id}/backlog/{ref}/links")
async def backlog_item_links(project_id: str, ref: str) -> dict:
    pid = quote(project_id, safe="")
    item = quote(ref, safe="")
    return await _proxy(
        "GET", f"/stewardship/v1/projects/{pid}/backlog/{item}/links")


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


@plugin_api.get("/projects/{project_id}/views/{name}/items")
async def run_project_view(project_id: str, name: str) -> dict:
    """Recall a saved view: run its stored query with the caller's identity."""
    pid = quote(project_id, safe="")
    vname = quote(name, safe="")
    return await _proxy(
        "GET", f"/stewardship/v1/projects/{pid}/views/{vname}/items",
        params={"actor_id": _ACTOR_ID, "actor_kind": "human"})


@plugin_api.delete("/projects/{project_id}/views/{name}")
async def delete_project_view(project_id: str, name: str) -> dict:
    """Delete a saved view (owner-only downstream)."""
    pid = quote(project_id, safe="")
    vname = quote(name, safe="")
    return await _proxy(
        "DELETE", f"/stewardship/v1/projects/{pid}/views/{vname}",
        params={"actor_id": _ACTOR_ID, "actor_kind": "human"})


@plugin_api.get("/projects/{project_id}/features")
async def project_features(project_id: str) -> dict:
    pid = quote(project_id, safe="")
    return await _proxy("GET", f"/stewardship/v1/projects/{pid}/features")


@plugin_api.patch("/projects/{project_id}/features")
async def patch_project_features(project_id: str, body: FeaturePatchBody) -> dict:
    pid = quote(project_id, safe="")
    return await _proxy(
        "PATCH", f"/stewardship/v1/projects/{pid}/features",
        {"features": body.features})


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


@plugin_api.post("/projects/{project_id}/archive")
async def archive_project(project_id: str) -> dict:
    pid = quote(project_id, safe="")
    return await _proxy("POST", f"/stewardship/v1/projects/{pid}/archive")


@plugin_api.post("/projects/{project_id}/restore")
async def restore_project(project_id: str) -> dict:
    pid = quote(project_id, safe="")
    return await _proxy("POST", f"/stewardship/v1/projects/{pid}/restore")


@plugin_api.get("/onboard/discover")
async def onboard_discover() -> dict:
    """Return host-owned projects and profiles for the onboarding wizard."""
    return await _proxy("GET", "/stewardship/v1/onboard/discover")


@plugin_api.post("/onboard/preflight")
async def onboard_preflight(body: OnboardBody) -> dict:
    return await _proxy(
        "POST", "/stewardship/v1/onboard/preflight", body.model_dump(exclude_none=True)
    )


@plugin_api.post("/onboard")
async def onboard(body: OnboardBody) -> dict:
    payload = body.model_dump(exclude_none=True)
    payload["actor_id"] = _ACTOR_ID
    return await _proxy("POST", "/stewardship/v1/onboard", payload)


@plugin_api.post("/projects/{project_id}/first-assessment")
async def first_assessment(project_id: str) -> dict:
    # Onboarding's last step (P7.6): one read-only assessment; it proposes nothing.
    return await _proxy("POST", f"/stewardship/v1/projects/{quote(project_id, safe='')}/first-assessment")


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
    # The decider is never named in the body: the backend takes it from the
    # bearer principal or from this proxy's vouching headers (Q2, 03/10/2026).
    r = quote(ref, safe="")
    payload = {"interface": "dockyard:human"}
    if body is not None:
        if body.expected_fingerprint is not None:
            payload["expected_fingerprint"] = body.expected_fingerprint
        if body.note:
            payload["note"] = body.note
    return await _proxy("POST", f"/stewardship/v1/initiatives/{r}/approve", payload)


@plugin_api.post("/initiatives/{ref}/reject")
async def reject(ref: str, body: DecisionActionBody | None = None) -> dict:
    r = quote(ref, safe="")
    payload = {"interface": "dockyard:human"}
    if body is not None:
        if body.expected_fingerprint is not None:
            payload["expected_fingerprint"] = body.expected_fingerprint
        if body.reason:
            payload["reason"] = body.reason
        if body.note:
            payload["note"] = body.note
    return await _proxy("POST", f"/stewardship/v1/initiatives/{r}/reject", payload)


@plugin_api.post("/initiatives/{ref}/request-changes")
async def request_changes(ref: str, body: RequestChangesBody) -> dict:
    r = quote(ref, safe="")
    payload = {**body.model_dump(exclude_none=True), "interface": "dockyard:human"}
    return await _proxy("POST", f"/stewardship/v1/initiatives/{r}/request-changes", payload)


@plugin_api.post("/initiatives/{ref}/resubmit")
async def resubmit(ref: str, body: ResubmitBody) -> dict:
    r = quote(ref, safe="")
    payload = {**body.model_dump(exclude_none=True), "actor": _ACTOR_ID, "interface": "dockyard:human"}
    return await _proxy("POST", f"/stewardship/v1/initiatives/{r}/resubmit", payload)


@plugin_api.post("/initiatives/{ref}/withdraw")
async def withdraw(ref: str, body: WithdrawBody | None = None) -> dict:
    r = quote(ref, safe="")
    payload = {"interface": "dockyard:human"}
    if body is not None and body.reason:
        payload["reason"] = body.reason
    return await _proxy("POST", f"/stewardship/v1/initiatives/{r}/withdraw", payload)


@plugin_api.get("/initiatives/{ref}/comments")
async def initiative_comments(ref: str) -> dict:
    r = quote(ref, safe="")
    return await _proxy("GET", f"/stewardship/v1/initiatives/{r}/comments")


@plugin_api.post("/initiatives/{ref}/comments")
async def add_initiative_comment(ref: str, body: InitiativeCommentBody) -> dict:
    # A comment never changes the decision; the backend records it beside it.
    r = quote(ref, safe="")
    payload = {"body": body.body, "actor": _ACTOR_ID, "interface": "dockyard:human"}
    return await _proxy("POST", f"/stewardship/v1/initiatives/{r}/comments", payload)


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


# ---- Batch W: workflow library (global + dedicated) --------------------
# Desktop reaches the backend only through this proxy; without these routes
# the library, per-project enablement and scoped runs 404 in the real stack.
_SCOPES = ("global", "project")


def _scope(scope: str) -> str:
    if scope not in _SCOPES:
        raise HTTPException(422, "scope must be global or project")
    return scope


def _owner(owner_project_id: str | None) -> dict | None:
    return {"owner_project_id": owner_project_id} if owner_project_id else None


@plugin_api.get("/workflow-library")
async def workflow_library(scope: str | None = None, include_archived: bool = False) -> dict:
    params: dict = {"include_archived": include_archived}
    if scope:
        params["scope"] = _scope(scope)
    return await _proxy("GET", "/stewardship/v1/workflow-library", params=params)


@plugin_api.post("/workflow-library")
async def create_workflow_library(body: WorkflowLibraryBody) -> dict:
    _scope(body.scope)
    return await _proxy("POST", "/stewardship/v1/workflow-library", body.model_dump())


@plugin_api.post("/workflow-library/{scope}/{name}/versions")
async def version_workflow_library(scope: str, name: str, body: WorkflowVersionBody,
                                   owner_project_id: str | None = None) -> dict:
    return await _proxy(
        "POST", f"/stewardship/v1/workflow-library/{_scope(scope)}/{quote(name, safe='')}/versions",
        body.model_dump(), params=_owner(owner_project_id))


@plugin_api.post("/workflow-library/{scope}/{name}/archive")
async def archive_workflow_library(scope: str, name: str,
                                   owner_project_id: str | None = None) -> dict:
    return await _proxy(
        "POST", f"/stewardship/v1/workflow-library/{_scope(scope)}/{quote(name, safe='')}/archive",
        {}, params=_owner(owner_project_id))


@plugin_api.post("/workflow-library/{scope}/{name}/restore")
async def restore_workflow_library(scope: str, name: str,
                                   owner_project_id: str | None = None) -> dict:
    return await _proxy(
        "POST", f"/stewardship/v1/workflow-library/{_scope(scope)}/{quote(name, safe='')}/restore",
        {}, params=_owner(owner_project_id))


@plugin_api.delete("/workflow-library/{scope}/{name}")
async def delete_workflow_library(scope: str, name: str,
                                  owner_project_id: str | None = None) -> dict:
    return await _proxy(
        "DELETE", f"/stewardship/v1/workflow-library/{_scope(scope)}/{quote(name, safe='')}",
        params=_owner(owner_project_id))


@plugin_api.get("/projects/{project_id}/workflows/available")
async def available_workflows(project_id: str) -> dict:
    return await _proxy(
        "GET", f"/stewardship/v1/projects/{quote(project_id, safe='')}/workflows/available")


@plugin_api.put("/projects/{project_id}/workflows/{scope}/{name}/enablement")
async def workflow_enablement(project_id: str, scope: str, name: str,
                              body: WorkflowEnablementBody) -> dict:
    return await _proxy(
        "PUT",
        f"/stewardship/v1/projects/{quote(project_id, safe='')}/workflows/{_scope(scope)}/{quote(name, safe='')}/enablement",
        body.model_dump())


@plugin_api.post("/projects/{project_id}/workflows/{scope}/{name}/start")
async def start_scoped_workflow(project_id: str, scope: str, name: str,
                                body: WorkflowScopedStartBody) -> dict:
    return await _proxy(
        "POST",
        f"/stewardship/v1/projects/{quote(project_id, safe='')}/workflows/{_scope(scope)}/{quote(name, safe='')}/start",
        body.model_dump(exclude_none=True))


@plugin_api.get("/projects/{project_id}/workflows/{scope}/{name}/runs/{run_key}/timeline")
async def scoped_workflow_run_timeline(project_id: str, scope: str, name: str, run_key: str) -> dict:
    return await _proxy(
        "GET",
        f"/stewardship/v1/projects/{quote(project_id, safe='')}/workflows/{_scope(scope)}/{quote(name, safe='')}/runs/{quote(run_key, safe='')}/timeline")


@plugin_api.get("/projects/{project_id}/workflows/{name}/runs/{run_key}/timeline")
async def workflow_run_timeline(project_id: str, name: str, run_key: str) -> dict:
    return await _proxy(
        "GET",
        f"/stewardship/v1/projects/{quote(project_id, safe='')}/workflows/{quote(name, safe='')}/runs/{quote(run_key, safe='')}/timeline")


@plugin_api.get("/projects/{project_id}/workflows/{scope}/{name}/runs")
async def scoped_workflow_runs(project_id: str, scope: str, name: str) -> dict:
    return await _proxy(
        "GET",
        f"/stewardship/v1/projects/{quote(project_id, safe='')}/workflows/{_scope(scope)}/{quote(name, safe='')}/runs")


@plugin_api.get("/projects/{project_id}/workflows")
async def workflows(project_id: str, include_archived: bool = True) -> dict:
    return await _proxy(
        "GET", f"/stewardship/v1/projects/{quote(project_id, safe='')}/workflows",
        params={"include_archived": include_archived},
    )


@plugin_api.post("/projects/{project_id}/workflows")
async def define_workflow(project_id: str, body: WorkflowDefineBody) -> dict:
    return await _proxy(
        "POST", f"/stewardship/v1/projects/{quote(project_id, safe='')}/workflows",
        body.model_dump(),
    )


@plugin_api.post("/projects/{project_id}/workflows/{name}/versions")
async def define_workflow_version(
    project_id: str, name: str, body: WorkflowVersionBody
) -> dict:
    return await _proxy(
        "POST",
        f"/stewardship/v1/projects/{quote(project_id, safe='')}/workflows/{quote(name, safe='')}/versions",
        body.model_dump(),
    )


@plugin_api.post("/projects/{project_id}/workflows/{name}/start")
async def start_workflow(project_id: str, name: str, body: WorkflowStartBody) -> dict:
    return await _proxy(
        "POST",
        f"/stewardship/v1/projects/{quote(project_id, safe='')}/workflows/{quote(name, safe='')}/start",
        body.model_dump(),
    )


@plugin_api.get("/projects/{project_id}/workflows/{name}/runs")
async def list_workflow_runs(project_id: str, name: str) -> dict:
    return await _proxy(
        "GET",
        f"/stewardship/v1/projects/{quote(project_id, safe='')}/workflows/{quote(name, safe='')}/runs",
    )


@plugin_api.post("/projects/{project_id}/workflows/{name}/archive")
async def archive_workflow(project_id: str, name: str) -> dict:
    return await _proxy(
        "POST",
        f"/stewardship/v1/projects/{quote(project_id, safe='')}/workflows/{quote(name, safe='')}/archive",
        {},
    )


@plugin_api.get("/projects/{project_id}/workflows/{name}/binding")
async def get_workflow_binding(project_id: str, name: str) -> dict:
    return await _proxy(
        "GET",
        f"/stewardship/v1/projects/{quote(project_id, safe='')}/workflows/{quote(name, safe='')}/binding",
    )


@plugin_api.put("/projects/{project_id}/workflows/{name}/binding")
async def set_workflow_binding(project_id: str, name: str, body: dict) -> dict:
    return await _proxy(
        "PUT",
        f"/stewardship/v1/projects/{quote(project_id, safe='')}/workflows/{quote(name, safe='')}/binding",
        body,
    )


@plugin_api.get("/workflows/timer")
async def workflow_timer() -> dict:
    return await _proxy("GET", "/stewardship/v1/workflows/timer")


@plugin_api.post("/projects/{project_id}/workflows/{name}/runs/{run_key}/advance")
async def advance_workflow_run(project_id: str, name: str, run_key: str) -> dict:
    return await _proxy(
        "POST",
        f"/stewardship/v1/projects/{quote(project_id, safe='')}/workflows/{quote(name, safe='')}/runs/{quote(run_key, safe='')}/advance",
        {},
    )


@plugin_api.post("/projects/{project_id}/workflows/{name}/runs/{run_key}/proposals")
async def propose_workflow_revision(project_id: str, name: str, run_key: str, body: dict) -> dict:
    return await _proxy(
        "POST",
        f"/stewardship/v1/projects/{quote(project_id, safe='')}/workflows/{quote(name, safe='')}/runs/{quote(run_key, safe='')}/proposals",
        body,
    )


@plugin_api.get("/projects/{project_id}/workflows/{name}/runs/{run_key}/revisions")
async def list_workflow_revisions_ui(project_id: str, name: str, run_key: str) -> dict:
    return await _proxy(
        "GET",
        f"/stewardship/v1/projects/{quote(project_id, safe='')}/workflows/{quote(name, safe='')}/runs/{quote(run_key, safe='')}/revisions",
    )


@plugin_api.post("/projects/{project_id}/workflows/{name}/runs/{run_key}/revisions/{revision_key}/decide")
async def decide_workflow_revision_ui(project_id: str, name: str, run_key: str, revision_key: str, body: dict) -> dict:
    return await _proxy(
        "POST",
        f"/stewardship/v1/projects/{quote(project_id, safe='')}/workflows/{quote(name, safe='')}/runs/{quote(run_key, safe='')}/revisions/{quote(revision_key, safe='')}/decide",
        body,
    )


@plugin_api.post("/projects/{project_id}/workflows/{name}/restore")
async def restore_workflow(project_id: str, name: str) -> dict:
    return await _proxy(
        "POST",
        f"/stewardship/v1/projects/{quote(project_id, safe='')}/workflows/{quote(name, safe='')}/restore",
        {},
    )


@plugin_api.post("/notifications/{notification_id}/ack")
async def ack(notification_id: int) -> dict:
    return await _proxy(
        "POST", f"/stewardship/v1/notifications/{notification_id}/ack",
        {"actor_id": _ACTOR_ID})


# --- Batch R2: Roadmap proxy routes (one contiguous block) ---------------------
# Bodies are strict (extra="forbid"): the caller can never name its own actor.
# Attribution comes from the verified session token the proxy forwards.

class RoadmapMilestoneLinkBody(BaseModel):
    model_config = ConfigDict(extra="forbid")
    milestone_id: int
    relationship: str = "delivers"


class RoadmapObjectiveLinkBody(BaseModel):
    model_config = ConfigDict(extra="forbid")
    initiative_ref: str
    relationship: str = "supports"


class GoalContractBody(BaseModel):
    model_config = ConfigDict(extra="forbid")
    outcome: str | None = None
    verification: str | None = None
    constraints: str | None = None
    boundaries: str | None = None
    stop_when: str | None = None
    status: str | None = None
    max_turns: int | str | None = None
    paused_reason: str | None = None


@plugin_api.get("/roadmap")
async def roadmap_outline(project_id: str | None = None) -> dict:
    params = {"project_id": project_id} if project_id else None
    return await _proxy("GET", "/stewardship/v1/roadmap", params=params)


@plugin_api.get("/roadmap/projects/{project_id}/milestones/{milestone_id}/items")
async def roadmap_milestone_items(project_id: str, milestone_id: int) -> dict:
    return await _proxy(
        "GET",
        f"/stewardship/v1/roadmap/projects/{quote(project_id, safe='')}"
        f"/milestones/{milestone_id}/items",
    )


@plugin_api.post("/projects/{project_id}/initiatives/{ref}/milestones")
async def roadmap_link_milestone(project_id: str, ref: str, body: RoadmapMilestoneLinkBody) -> dict:
    return await _proxy(
        "POST",
        f"/stewardship/v1/projects/{quote(project_id, safe='')}/initiatives/{quote(ref, safe='')}/milestones",
        body.model_dump(),
    )


@plugin_api.delete("/projects/{project_id}/initiatives/{ref}/milestones/{milestone_id}")
async def roadmap_unlink_milestone(project_id: str, ref: str, milestone_id: int) -> dict:
    return await _proxy(
        "DELETE",
        f"/stewardship/v1/projects/{quote(project_id, safe='')}/initiatives/{quote(ref, safe='')}"
        f"/milestones/{milestone_id}",
    )


@plugin_api.post("/projects/{project_id}/objectives/{objective_id}/initiatives")
async def roadmap_link_objective(project_id: str, objective_id: int, body: RoadmapObjectiveLinkBody) -> dict:
    return await _proxy(
        "POST",
        f"/stewardship/v1/projects/{quote(project_id, safe='')}/objectives/{objective_id}/initiatives",
        body.model_dump(),
    )


@plugin_api.delete("/projects/{project_id}/objectives/{objective_id}/initiatives/{ref}")
async def roadmap_unlink_objective(project_id: str, objective_id: int, ref: str) -> dict:
    return await _proxy(
        "DELETE",
        f"/stewardship/v1/projects/{quote(project_id, safe='')}/objectives/{objective_id}"
        f"/initiatives/{quote(ref, safe='')}",
    )


@plugin_api.get("/projects/{project_id}/goals/{goal_id}/contract")
async def roadmap_goal_contract(project_id: str, goal_id: str) -> dict:
    return await _proxy(
        "GET",
        f"/stewardship/v1/projects/{quote(project_id, safe='')}/goals/{quote(goal_id, safe='')}/contract",
    )


@plugin_api.put("/projects/{project_id}/goals/{goal_id}/contract")
async def roadmap_update_goal_contract(project_id: str, goal_id: str, body: GoalContractBody) -> dict:
    return await _proxy(
        "PUT",
        f"/stewardship/v1/projects/{quote(project_id, safe='')}/goals/{quote(goal_id, safe='')}/contract",
        body.model_dump(exclude_unset=True),
    )
# --- end Batch R2 ---------------------------------------------------------------


# ------------------- Batch E: notifications resolution + settings ----- #

@plugin_api.get("/notifications")
async def notifications_filtered(
    state: str | None = None,
    kind: str | None = None,
    severity: str | None = None,
    project_id: str | None = None,
    before_id: int | None = None,
    limit: int = 100,
) -> dict:
    params = {k: v for k, v in (
        ("state", state), ("kind", kind), ("severity", severity),
        ("project_id", project_id), ("before_id", before_id),
        ("limit", limit)) if v is not None}
    return await _proxy("GET", "/stewardship/v1/notifications", params=params)


@plugin_api.post("/notifications/{notification_id}/resolve")
async def resolve_notification(notification_id: int, body: dict) -> dict:
    return await _proxy(
        "POST", f"/stewardship/v1/notifications/{notification_id}/resolve",
        {"actor_id": _ACTOR_ID,
         "note": str(body.get("note") or "")[:2000]})


@plugin_api.post("/notifications/ack-all")
async def ack_all(body: dict | None = None) -> dict:
    payload = dict(body or {})
    payload.setdefault("actor_id", _ACTOR_ID)
    return await _proxy("POST", "/stewardship/v1/notifications/ack-all", payload)


@plugin_api.get("/notifications/popups")
async def notification_popups() -> dict:
    return await _proxy("GET", "/stewardship/v1/notifications/popups")


@plugin_api.post("/notifications/popups/shown")
async def notification_popups_shown(body: dict) -> dict:
    ids = body.get("ids")
    ids = [int(i) for i in ids] if isinstance(ids, list) else []
    return await _proxy(
        "POST", "/stewardship/v1/notifications/popups/shown", {"ids": ids})


@plugin_api.get("/settings/notifications")
async def get_notification_settings() -> dict:
    return await _proxy("GET", "/stewardship/v1/settings/notifications")


# The last project chosen in the app (Sahil 02/10): kept in the backend, never
# in browser storage. null forgets it. The caller never names the actor.
class LastProjectBody(BaseModel):
    model_config = ConfigDict(extra="forbid")
    project_id: str | None


@plugin_api.get("/settings/last-project")
async def get_last_project() -> dict:
    return await _proxy("GET", "/stewardship/v1/settings/last-project")


@plugin_api.put("/settings/last-project")
async def put_last_project(body: LastProjectBody) -> dict:
    return await _proxy(
        "PUT", "/stewardship/v1/settings/last-project",
        {"project_id": body.project_id, "actor_id": _ACTOR_ID})


@plugin_api.put("/settings/notifications")
async def put_notification_settings(body: dict) -> dict:
    return await _proxy(
        "PUT", "/stewardship/v1/settings/notifications",
        {"policy": body.get("policy"), "actor_id": _ACTOR_ID})


# The app's display choices (Sahil 04/10): which Dashboard lists are folded.
# Kept in the backend, never in browser storage. The caller never names the actor.
class UiSettingsBody(BaseModel):
    model_config = ConfigDict(extra="forbid")
    collapsed: list[str]


@plugin_api.get("/settings/ui")
async def get_ui_settings() -> dict:
    return await _proxy("GET", "/stewardship/v1/settings/ui")


@plugin_api.put("/settings/ui")
async def put_ui_settings(body: UiSettingsBody) -> dict:
    return await _proxy(
        "PUT", "/stewardship/v1/settings/ui",
        {"collapsed": body.collapsed, "actor_id": _ACTOR_ID})


# Sahil 05/10 (demo feedback h): the app's theme and typeface. The backend
# validates the ids; the caller never names the actor.
class AppearanceBody(BaseModel):
    model_config = ConfigDict(extra="forbid")
    theme: str | None = None
    font: str | None = None


@plugin_api.get("/settings/appearance")
async def get_appearance() -> dict:
    return await _proxy("GET", "/stewardship/v1/settings/appearance")


@plugin_api.put("/settings/appearance")
async def put_appearance(body: AppearanceBody) -> dict:
    choices = {key: value for key, value in (("theme", body.theme), ("font", body.font)) if value is not None}
    return await _proxy(
        "PUT", "/stewardship/v1/settings/appearance",
        {**choices, "actor_id": _ACTOR_ID})


@plugin_api.get("/settings/notifications/effective")
async def effective_notification_settings(
    project_id: str | None = None,
) -> dict:
    params = {"project_id": project_id} if project_id else None
    return await _proxy(
        "GET", "/stewardship/v1/settings/notifications/effective", params=params)


# --- Project memory proxy routes (checks round 1; one contiguous block) ---------
# Bodies are strict (extra="forbid"): the caller can never name its own actor.
# Writes need the project-owner capability, checked by the backend.

class MemoryAddBody(BaseModel):
    model_config = ConfigDict(extra="forbid")
    kind: str
    text: str
    source: str = "human"


class MemoryEditBody(BaseModel):
    model_config = ConfigDict(extra="forbid")
    kind: str | None = None
    text: str | None = None


def _memory_path(project_id: str, tail: str = "") -> str:
    return f"/stewardship/v1/projects/{quote(project_id, safe='')}/memory{tail}"


@plugin_api.get("/projects/{project_id}/memory")
async def project_memory(project_id: str, include_archived: bool = False) -> dict:
    params = {"include_archived": "true"} if include_archived else None
    return await _proxy("GET", _memory_path(project_id), params=params)


@plugin_api.get("/projects/{project_id}/memory/suggestions")
async def project_memory_suggestions(project_id: str) -> dict:
    return await _proxy("GET", _memory_path(project_id, "/suggestions"))


@plugin_api.get("/projects/{project_id}/memory/{entry_id}/history")
async def project_memory_history(project_id: str, entry_id: int) -> dict:
    return await _proxy("GET", _memory_path(project_id, f"/{entry_id}/history"))


@plugin_api.post("/projects/{project_id}/memory")
async def add_project_memory(project_id: str, body: MemoryAddBody) -> dict:
    return await _proxy("POST", _memory_path(project_id), body.model_dump())


@plugin_api.patch("/projects/{project_id}/memory/{entry_id}")
async def edit_project_memory(project_id: str, entry_id: int, body: MemoryEditBody) -> dict:
    return await _proxy("PATCH", _memory_path(project_id, f"/{entry_id}"),
                        body.model_dump(exclude_unset=True))


@plugin_api.post("/projects/{project_id}/memory/{entry_id}/archive")
async def archive_project_memory(project_id: str, entry_id: int) -> dict:
    return await _proxy("POST", _memory_path(project_id, f"/{entry_id}/archive"))


@plugin_api.post("/projects/{project_id}/memory/{entry_id}/restore")
async def restore_project_memory(project_id: str, entry_id: int) -> dict:
    return await _proxy("POST", _memory_path(project_id, f"/{entry_id}/restore"))


class ChatLinkBody(BaseModel):
    model_config = ConfigDict(extra="forbid")
    profile: str


@plugin_api.post("/projects/{project_id}/chat-links")
async def open_project_chat_link(project_id: str, body: ChatLinkBody) -> dict:
    # The Chat button's one-time link: the bot's next new Desktop chat gets this
    # project's memory (checks round 1, pick 1a).
    return await _proxy("POST", f"/stewardship/v1/projects/{quote(project_id, safe='')}/chat-links",
                        body.model_dump())
# --- end project memory
