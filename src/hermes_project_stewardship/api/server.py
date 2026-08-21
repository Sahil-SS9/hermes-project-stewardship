"""RPC API: the single backend contract for TUI/Desktop/gateway surfaces.

FastAPI is an OPTIONAL dependency (`pip install .[desktop-panel]`). The app
factory takes an existing Store so embedding processes (e.g. `hermes serve`)
can mount it on their own app; standalone `python -m
hermes_project_stewardship.api.server` runs a dev server on 127.0.0.1:9310.

Hardening (S5/S6/R2):
- optional bearer auth (`auth_token`); /healthz always open;
- per-client token-bucket rate limit on mutating methods;
- uniform error envelope {error:{code,message}} on every non-2xx.

Every endpoint returns JSON built from the same service layer the CLI uses —
no separate state anywhere.
"""

from __future__ import annotations

import os
from pathlib import Path
from typing import Any, Dict, Optional

try:
    from fastapi import APIRouter, FastAPI, HTTPException, Request
    from pydantic import BaseModel
except ImportError as e:  # pragma: no cover
    raise ImportError(
        "The RPC server needs the 'desktop-panel' extra: "
        "pip install 'hermes-project-stewardship[desktop-panel]'"
    ) from e

from ..cycles.engine import CycleEngine, CycleRefused
from ..events.bus import EventBus
from ..gateway.handler import CommandRequest, GatewayCommandHandler
from ..gateway.webhooks import WebhookRejected, WebhookReceiver
from ..kanban import KanbanBridge, ReferenceKanbanAdapter
from ..persistence.service import ServiceError, StewardshipService
from ..persistence.store import Store
from .middleware import (
    BearerAuthMiddleware,
    RateLimitMiddleware,
    error_envelope_handler,
)


class EnableRequest(BaseModel):
    project_id: str = ""
    mission: str = ""
    lead_profile: Optional[str] = None
    member_profiles: list[str] = []
    autonomy_level: int = 0
    verification_policy: Dict[str, Any] = {}
    release_policy: Dict[str, Any] = {}
    notification_policy: Dict[str, Any] = {}


class ObjectiveRequest(BaseModel):
    name: str
    evaluator_type: str = "manual"
    target: str = ">=1"
    severity: str = "medium"
    description: str = ""
    command: Optional[list[str]] = None
    window: str = "30d"


class InitiativeProposal(BaseModel):
    title: str
    rationale: str
    expected_outcome: str = ""
    risk: str = "low"
    dedupe_key: Optional[str] = None


class ApprovalAction(BaseModel):
    actor: str
    interface: str = "rpc"


class CycleRequest(BaseModel):
    trigger_type: str = "manual"
    idempotency_key: Optional[str] = None


class GatewayCommandBody(BaseModel):
    platform: str
    sender_id: str
    command: str
    project_id: str
    args: Dict[str, Any] = {}


class BindBoardRequest(BaseModel):
    board_slug: Optional[str] = None


class CompleteRequest(BaseModel):
    outcome: Dict[str, Any]
    regressed: bool = False


def create_app(
    store: Optional[Store] = None,
    db_path: Optional[Path] = None,
    *,
    auth_token: Optional[str] = None,
    rate_limit_rpm: int = 120,
) -> FastAPI:
    if store is None:
        store = Store(db_path or Path("./stewardship.db"))
    svc = StewardshipService(store)
    engine = CycleEngine(svc)
    bus = EventBus(store)
    engine.attach_events(bus)
    gateway = GatewayCommandHandler(svc, cycle_engine=engine)
    webhooks = WebhookReceiver(svc, engine)
    bridge = KanbanBridge(svc, ReferenceKanbanAdapter(store))

    app = FastAPI(
        title="Hermes Project Stewardship RPC",
        version="0.2.0",
        description=(
            "Durable project ownership for Hermes agent fleets. One canonical "
            "backend serving CLI, TUI, Desktop and messaging gateways. "
            "Mutating endpoints require a bearer token when auth_token is "
            "configured; all errors use the {error:{code,message}} envelope."
        ),
    )
    token = auth_token or os.environ.get("STEWARD_RPC_TOKEN")
    if token:
        app.add_middleware(BearerAuthMiddleware, token=token)
    app.add_middleware(RateLimitMiddleware, requests_per_minute=rate_limit_rpm)

    router = APIRouter(prefix="/stewardship/v1")

    @router.get("/projects")
    def list_projects():
        return {"projects": svc.list_projects()}

    @router.post("/projects/{project_id}/enable")
    def enable(project_id: str, body: EnableRequest):
        return svc.enable(
            project_id,
            mission=body.mission,
            lead_profile=body.lead_profile,
            member_profiles=body.member_profiles,
            autonomy_level=body.autonomy_level,
            verification_policy=body.verification_policy,
            release_policy=body.release_policy,
            notification_policy=body.notification_policy,
        )

    @router.post("/projects/{project_id}/disable")
    def disable(project_id: str):
        return svc.disable(project_id)

    @router.get("/projects/{project_id}/settings")
    def settings(project_id: str):
        return svc.settings(project_id)

    @router.post("/projects/{project_id}/pause")
    def pause(project_id: str):
        return svc.pause(project_id)

    @router.post("/projects/{project_id}/resume")
    def resume(project_id: str):
        return svc.resume(project_id)

    @router.post("/projects/{project_id}/freeze")
    def freeze(project_id: str):
        return svc.freeze(project_id)

    @router.post("/projects/{project_id}/objectives")
    def add_objective(project_id: str, body: ObjectiveRequest):
        return svc.add_objective(
            project_id,
            name=body.name,
            evaluator_type=body.evaluator_type,
            target=body.target,
            severity=body.severity,
            description=body.description,
            command=body.command,
            window=body.window,
        )

    @router.get("/projects/{project_id}/health")
    def health(project_id: str):
        h = svc.latest_health(project_id)
        if h is None:
            raise HTTPException(404, "no health snapshot yet")
        return h

    @router.post("/projects/{project_id}/cycle")
    def run_cycle(project_id: str, body: CycleRequest):
        try:
            return engine.run_cycle(
                project_id,
                trigger_type=body.trigger_type,
                idempotency_key=body.idempotency_key,
            )
        except CycleRefused as e:
            raise HTTPException(409, str(e))

    @router.get("/projects/{project_id}/initiatives")
    def initiatives(project_id: str, status: Optional[str] = None):
        return {"initiatives": svc.initiatives(project_id, status=status)}

    @router.post("/projects/{project_id}/initiatives")
    def propose(project_id: str, body: InitiativeProposal):
        return svc.propose_initiative(project_id, **body.model_dump())

    @router.post("/initiatives/{ref}/approve")
    def approve(ref: str, body: ApprovalAction):
        return svc.approve_initiative(ref, actor=body.actor, interface=body.interface)

    @router.post("/initiatives/{ref}/reject")
    def reject(ref: str, body: ApprovalAction):
        return svc.reject_initiative(ref, actor=body.actor, interface=body.interface)

    @router.post("/initiatives/{ref}/bind-board")
    def bind_board(ref: str, body: BindBoardRequest):
        try:
            return bridge.bind(ref, board_slug=body.board_slug)
        except ServiceError as e:
            raise HTTPException(409, str(e))

    @router.post("/initiatives/{ref}/complete")
    def complete(ref: str, body: CompleteRequest):
        try:
            return bridge.complete_from_board(
                ref, outcome=body.outcome, regressed=body.regressed
            )
        except ServiceError as e:
            raise HTTPException(409, str(e))

    @router.post("/gateway/command")
    def gateway_command(body: GatewayCommandBody):
        req = CommandRequest(
            platform=body.platform,
            sender_id=body.sender_id,
            command=body.command,
            project_id=body.project_id,
            args=body.args,
        )
        resp = gateway.handle(req)
        return {
            "ok": resp.ok,
            "text": resp.text,
            "data": resp.data,
            "already_done": resp.already_done,
        }

    @router.post("/webhooks/{project_id}")
    async def receive_webhook(project_id: str, request: Request):
        body = await request.body()
        signature = request.headers.get("x-hub-signature-256", "")
        delivery = request.headers.get("x-github-delivery")
        try:
            res = webhooks.handle(
                project_id=project_id, body=body,
                signature=signature, delivery_id=delivery,
            )
        except WebhookRejected as e:
            raise HTTPException(e.status, e.reason)
        except CycleRefused as e:
            raise HTTPException(409, str(e))
        return {"accepted": True, "detail": res.detail, "trigger_key": res.trigger_key}

    @router.get("/projects/{project_id}/events")
    def events(project_id: str, limit: int = 50, event_type: Optional[str] = None):
        return {"events": bus.recent(project_id=project_id, limit=limit,
                                     event_type=event_type)}

    @router.get("/projects/{project_id}/notifications")
    def notifications(project_id: str):
        from ..events.notifications import NotificationEngine

        ne = NotificationEngine(store, svc)
        return {"unacked": ne.unacked(project_id),
                "queued": ne.pending_delivery(project_id)}

    app.include_router(router)

    @app.exception_handler(HTTPException)
    async def http_envelope(request: Request, exc: HTTPException):
        return error_envelope_handler(request, exc)

    @app.exception_handler(ServiceError)
    async def service_envelope(request: Request, exc: ServiceError):
        msg = str(exc).lower()
        not_found = "not enabled" in msg or "no such" in msg or "disabled" in msg
        return error_envelope_handler(
            request, HTTPException(404 if not_found else 409, str(exc))
        )

    @app.get("/healthz")
    def healthz():
        return {"ok": True, "schema_version": store.schema_version}

    return app


if __name__ == "__main__":  # pragma: no cover
    import uvicorn

    uvicorn.run(create_app(), host="127.0.0.1", port=9310)
