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

import base64
import binascii
import os
from dataclasses import asdict
from pathlib import Path
from typing import Any, cast, Dict, List, NoReturn, Optional

try:
    from fastapi import APIRouter, FastAPI, HTTPException, Request
    from pydantic import BaseModel, ConfigDict, Field
except ImportError as e:  # pragma: no cover
    raise ImportError(
        "The RPC server needs the 'desktop-panel' extra: "
        "pip install 'hermes-project-stewardship[desktop-panel]'"
    ) from e

from ..cycles.engine import CycleEngine, CycleRefused
from ..dockyard import Actor, ActorKind
from ..events.bus import EventBus
from ..gateway.handler import CommandRequest, GatewayCommandHandler
from ..gateway.webhooks import WebhookRejected, WebhookReceiver
from ..kanban import (
    KanbanAdapter,
    KanbanAdapterError,
    KanbanBridge,
    UnavailableKanbanAdapter,
    create_project_kanban_adapter,
)
from ..persistence import (
    CanonicalWorkPartialError,
    CanonicalWorkPort,
    CanonicalWorkService,
)
from ..persistence.dockyard_service import DockyardService
from ..persistence.dockyard_integration import DockyardIntegration, IntegrationError
from ..persistence.service import ServiceError, StewardshipService
from ..persistence.workflow_service import WorkflowService
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


class SettingsPatch(BaseModel):
    mission: Optional[str] = None
    lead_profile: Optional[str] = None
    member_profiles: Optional[list[str]] = None
    autonomy_level: Optional[int] = None
    autonomy_policy: Optional[Dict[str, Any]] = None
    verification_policy: Optional[Dict[str, Any]] = None
    release_policy: Optional[Dict[str, Any]] = None
    notification_policy: Optional[Dict[str, Any]] = None
    actor: str = "sahil"
    interface: str = "dockyard:human"


class ObjectiveRequest(BaseModel):
    name: str
    evaluator_type: str = "manual"
    target: str = ">=1"
    severity: str = "medium"
    description: str = ""
    command: Optional[list[str]] = None
    integration: Optional[str] = None
    window: str = "30d"
    actor: str = "system"
    interface: str = "rpc"


class ObjectivePatch(BaseModel):
    name: Optional[str] = None
    evaluator_type: Optional[str] = None
    target: Optional[str] = None
    severity: Optional[str] = None
    description: Optional[str] = None
    command: Optional[list[str]] = None
    integration: Optional[str] = None
    window: Optional[str] = None
    actor: str = "system"
    interface: str = "rpc"


class ContentUploadRequest(BaseModel):
    filename: str
    media_type: str
    content_base64: str
    actor: str = "system"
    interface: str = "rpc"


class InitiativeProposal(BaseModel):
    title: str
    rationale: str
    expected_outcome: str = ""
    risk: str = "low"
    dedupe_key: Optional[str] = None
    validation_contract: Optional[Dict[str, Any]] = None


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
    actor_id: str = "sahil"
    actor_kind: str = "human"


class WorkItemCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    type: str
    title: str
    actor_id: str
    actor_kind: str = "bot"
    body: Optional[str] = None
    parent_ref: Optional[str] = None
    labels: List[str] = Field(default_factory=list)
    evidence_refs: List[str] = Field(default_factory=list)
    estimate_days: Optional[float] = None
    due: Optional[str] = None
    idempotency_key: Optional[str] = None


class WorkItemTransition(BaseModel):
    status: str
    actor_id: str
    actor_kind: str = "bot"


class WorkItemUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    title: Optional[str] = None
    type: Optional[str] = None
    body: Optional[str] = None
    parent_ref: Optional[str] = None
    labels: Optional[List[str]] = None
    evidence_refs: Optional[List[str]] = None
    estimate_days: Optional[float] = None
    due: Optional[str] = None
    actor_id: str
    actor_kind: str = "human"


class WorkItemAssign(BaseModel):
    model_config = ConfigDict(extra="forbid")
    assignee_id: Optional[str] = None
    actor_id: str
    actor_kind: str = "human"


class WorkItemDependency(BaseModel):
    model_config = ConfigDict(extra="forbid")
    dependency_ref: str
    actor_id: str
    actor_kind: str = "human"


class WorkItemActor(BaseModel):
    model_config = ConfigDict(extra="forbid")
    actor_id: str
    actor_kind: str = "human"


class BacklogAdd(BaseModel):
    ref: str
    rank: int
    reason: str
    actor_id: str
    actor_kind: str = "bot"


class QueuedWorkItemCreate(BaseModel):
    type: str
    title: str
    creator_id: str
    creator_kind: str = "human"
    assignee_id: str
    assignee_kind: str = "bot"
    rank: int
    reason: str
    initiative_ref: Optional[str] = None
    idempotency_key: Optional[str] = None


class BacklogRerank(BaseModel):
    new_rank: int
    reason: str
    actor_id: str
    actor_kind: str = "bot"


class BotRegister(BaseModel):
    bot_id: str
    display_name: str
    capabilities: List[str] = []
    profile: Optional[str] = None


class BotStatusBody(BaseModel):
    status: str
    current_item: Optional[str] = None
    actor_id: Optional[str] = None


class GroupCreate(BaseModel):
    name: str
    purpose: str = ""
    channel_ref: Optional[str] = None
    member_ids: List[str] = []
    lead_id: Optional[str] = None
    actor_id: Optional[str] = None


class GroupMemberAdd(BaseModel):
    bot_id: str
    as_lead: bool = False
    actor_id: Optional[str] = None


class A2ASend(BaseModel):
    msg_type: str
    from_actor: str
    to_group: str
    payload: Dict[str, Any] = {}
    item_ref: Optional[str] = None


class MilestoneCreate(BaseModel):
    name: str
    due: Optional[str] = None
    actor_id: str
    actor_kind: str = "human"


class MilestoneAttach(BaseModel):
    ref: str
    actor_id: str
    actor_kind: str = "bot"


class MilestoneUpdate(BaseModel):
    due: Optional[str] = None
    closed: Optional[bool] = None
    actor_id: str
    actor_kind: str = "human"


class FeaturePatch(BaseModel):
    features: Dict[str, bool]
    actor: str = "sahil"
    interface: str = "dockyard:human"


class ViewSave(BaseModel):
    name: str
    layout: str
    filters: Dict[str, Any] = {}
    actor_id: str
    actor_kind: str = "human"
    shared: bool = False


class ReportRequest(BaseModel):
    report_type: str = "executive"
    include_activity: bool = True
    actor_id: str = "sahil"
    actor_kind: str = "human"


class OnboardingRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    project_id: str
    name: Optional[str] = None
    slug: Optional[str] = None
    repo_path: str
    mission: str
    lead_profile: str
    board_slug: Optional[str] = None
    idempotency_key: Optional[str] = None
    autonomy_level: int = 2
    actor_id: str = "sahil"


class WorkflowDefine(BaseModel):
    model_config = ConfigDict(extra="forbid")
    name: str
    nodes: List[Dict[str, Any]]


class WorkflowStart(BaseModel):
    model_config = ConfigDict(extra="forbid")
    run_key: str
    version: Optional[int] = None


def create_app(
    store: Optional[Store] = None,
    db_path: Optional[Path] = None,
    *,
    auth_token: Optional[str] = None,
    rate_limit_rpm: int = 120,
    kanban_adapter: KanbanAdapter | None = None,
) -> FastAPI:
    if store is None:
        store = Store(db_path or Path("./stewardship.db"))
    svc = StewardshipService(store)
    engine = CycleEngine(svc)
    bus = EventBus(store)
    engine.attach_events(bus)
    gateway = GatewayCommandHandler(svc, cycle_engine=engine)
    webhooks = WebhookReceiver(svc, engine)
    if kanban_adapter is not None:
        adapter = kanban_adapter
    else:
        try:
            adapter = create_project_kanban_adapter()
        except KanbanAdapterError as exc:
            adapter = UnavailableKanbanAdapter(exc)
    bridge = KanbanBridge(svc, adapter)
    work = CanonicalWorkService(store, cast(CanonicalWorkPort, adapter))
    workflows = WorkflowService(store, cast(CanonicalWorkPort, adapter))
    dy = DockyardService(store, canonical_work=work)
    integration = DockyardIntegration(
        dy=dy,
        svc=svc,
        bridge=bridge,
        canonical_work=work,
    )

    app = FastAPI(
        title="Hermes Project Stewardship RPC",
        version="0.2.0rc2",
        description=(
            "Durable project ownership for Hermes agent fleets. One canonical "
            "backend serving CLI, TUI, Desktop and messaging gateways. "
            "Mutating endpoints require a bearer token when auth_token is "
            "configured; all errors use the {error:{code,message}} envelope."
        ),
    )
    app.state.kanban_adapter = adapter
    app.state.kanban_bridge = bridge
    app.state.canonical_work_service = work
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

    @router.post("/projects/{project_id}/re-enable")
    def re_enable(project_id: str):
        return svc.re_enable(project_id)

    @router.get("/projects/{project_id}/settings")
    def settings(project_id: str):
        return svc.settings(project_id, include_disabled=True)

    @router.get("/projects/{project_id}/features")
    def features(project_id: str):
        return {"features": svc.features(project_id)}

    @router.patch("/projects/{project_id}/features")
    def patch_features(project_id: str, body: FeaturePatch):
        return {"features": svc.update_features(
            project_id, body.features,
            actor=body.actor, interface=body.interface,
        )}

    @router.patch("/projects/{project_id}/settings")
    def patch_settings(project_id: str, body: SettingsPatch):
        changes = body.model_dump(exclude_unset=True)
        actor = changes.pop("actor", body.actor)
        interface = changes.pop("interface", body.interface)
        return svc.update_settings(
            project_id, actor=actor, interface=interface, **changes
        )

    @router.post("/projects/{project_id}/pause")
    def pause(project_id: str):
        return svc.pause(project_id)

    @router.post("/projects/{project_id}/resume")
    def resume(project_id: str):
        return svc.resume(project_id)

    @router.post("/projects/{project_id}/freeze")
    def freeze(project_id: str):
        return svc.freeze(project_id)

    @router.get("/projects/{project_id}/objectives")
    def objectives(project_id: str, include_archived: bool = False):
        return {
            "objectives": [
                asdict(item)
                for item in svc.objectives(
                    project_id, include_disabled=include_archived
                )
            ]
        }

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
            integration=body.integration,
            window=body.window,
            actor=body.actor,
            interface=body.interface,
        )

    @router.patch("/projects/{project_id}/objectives/{objective_id}")
    def update_objective(
        project_id: str, objective_id: int, body: ObjectivePatch
    ):
        values = body.model_dump(exclude_unset=True)
        actor = values.pop("actor", body.actor)
        interface = values.pop("interface", body.interface)
        return svc.update_objective(
            project_id,
            objective_id,
            actor=actor,
            interface=interface,
            **values,
        )

    @router.post("/projects/{project_id}/objectives/{objective_id}/archive")
    def archive_objective(
        project_id: str, objective_id: int, body: ApprovalAction
    ):
        return svc.archive_objective(
            project_id,
            objective_id,
            actor=body.actor,
            interface=body.interface,
        )

    @router.delete("/projects/{project_id}/objectives/{objective_id}")
    def remove_objective(
        project_id: str, objective_id: int, body: ApprovalAction
    ):
        return svc.remove_objective(
            project_id,
            objective_id,
            actor=body.actor,
            interface=body.interface,
        )

    @router.get("/projects/{project_id}/missions/archive")
    def archived_missions(project_id: str):
        return {"missions": svc.archived_missions(project_id)}

    @router.post("/projects/{project_id}/mission/archive")
    def archive_mission(project_id: str, body: ApprovalAction):
        return svc.archive_mission(
            project_id, actor=body.actor, interface=body.interface
        )

    @router.delete("/projects/{project_id}/mission")
    def remove_mission(project_id: str, body: ApprovalAction):
        return svc.remove_mission(
            project_id, actor=body.actor, interface=body.interface
        )

    @router.get("/projects/{project_id}/content")
    def project_content(project_id: str):
        return {"content": svc.project_content(project_id)}

    @router.post("/projects/{project_id}/content")
    def upload_project_content(project_id: str, body: ContentUploadRequest):
        try:
            content = base64.b64decode(body.content_base64, validate=True)
        except (binascii.Error, ValueError) as error:
            raise HTTPException(422, "content_base64 must be valid base64") from error
        return svc.upload_project_content(
            project_id,
            filename=body.filename,
            media_type=body.media_type,
            content=content,
            actor=body.actor,
            interface=body.interface,
        )

    @router.get("/projects/{project_id}/content/{content_id}/preview")
    def project_content_preview(project_id: str, content_id: str):
        return svc.project_content_preview(project_id, content_id)

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
        svc.require_feature(project_id, "initiatives")
        return {"initiatives": svc.initiatives(project_id, status=status)}

    @router.post("/projects/{project_id}/initiatives")
    def propose(project_id: str, body: InitiativeProposal):
        return svc.propose_initiative(project_id, **body.model_dump())

    @router.post("/initiatives/{ref}/approve")
    def approve(ref: str, body: ApprovalAction):
        try:
            return integration.approve(
                ref,
                actor=Actor(
                    id=body.actor,
                    display_name=body.actor,
                    kind=ActorKind.HUMAN,
                ),
            )
        except IntegrationError as exc:
            raise HTTPException(409, str(exc)) from None

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
            return integration.complete_from_board(
                ref,
                outcome=body.outcome,
                regressed=body.regressed,
                actor=Actor(
                    id=body.actor_id,
                    display_name=body.actor_id,
                    kind=ActorKind(body.actor_kind),
                ),
            )
        except (ServiceError, IntegrationError) as exc:
            raise HTTPException(409, str(exc)) from None

    @router.get("/projects/{project_id}/observations")
    def observations(project_id: str):
        return {"observations": integration.observations(project_id)}

    @router.post("/observations/{ref}/run")
    def run_observation(ref: str):
        try:
            return integration.run_observation(ref, engine)
        except (IntegrationError, CycleRefused) as exc:
            raise HTTPException(409, str(exc)) from None

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

        svc.require_feature(project_id, "notifications")
        ne = NotificationEngine(store, svc)
        return {"unacked": ne.unacked(project_id),
                "queued": ne.pending_delivery(project_id)}


    # ------------------- Dockyard work management (G1) ----------------- #

    def _actor(actor_id: str, actor_kind: str) -> Actor:
        from ..dockyard import Actor as _Actor, ActorKind as _ActorKind

        return _Actor(id=actor_id, display_name=actor_id,
                      kind=_ActorKind(actor_kind))

    def _raise_work_error(exc: Exception) -> NoReturn:
        if isinstance(exc, CanonicalWorkPartialError):
            raise HTTPException(
                409,
                f"canonical work {exc.item_ref} exists; ranking is incomplete",
            ) from None
        if isinstance(exc, KanbanAdapterError):
            status_code = 503
            if exc.code.endswith("_not_found"):
                status_code = 404
            elif exc.code == "validation_error":
                status_code = 422
            elif exc.code in {
                "transition_conflict",
                "write_conflict",
                "idempotency_conflict",
            }:
                status_code = 409
            raise HTTPException(
                status_code,
                {
                    "code": exc.code,
                    "message": exc.message,
                    "fields": exc.fields,
                },
            ) from None
        message = str(exc)
        missing = "no such canonical work item" in message.lower()
        raise HTTPException(404 if missing else 422, message) from None

    @router.get("/projects/{project_id}/work-items")
    def list_work_items(project_id: str, status: Optional[str] = None):
        try:
            items = work.list(project_id, status=status)
        except Exception as exc:
            _raise_work_error(exc)
        return {"work_items": items}

    @router.post("/projects/{project_id}/work-items")
    def create_work_item(project_id: str, body: WorkItemCreate):
        try:
            item = work.create_item(
                project_id,
                body.type,
                body.title,
                actor=_actor(body.actor_id, body.actor_kind),
                body=body.body,
                parent_ref=body.parent_ref,
                labels=body.labels,
                evidence_refs=body.evidence_refs,
                estimate_days=body.estimate_days,
                due=body.due,
                idempotency_key=body.idempotency_key,
            )
        except Exception as exc:
            _raise_work_error(exc)
        return {"ref": item["ref"], "id": item["id"], "title": item["title"]}

    @router.patch("/projects/{project_id}/work-items/{ref}")
    def update_work_item(project_id: str, ref: str, body: WorkItemUpdate):
        changes = body.model_dump(exclude_unset=True)
        actor_id = changes.pop("actor_id")
        actor_kind = changes.pop("actor_kind", body.actor_kind)
        if "type" in changes:
            changes["item_type"] = changes.pop("type")
        try:
            return work.update_item(
                project_id,
                ref,
                actor=_actor(actor_id, actor_kind),
                **changes,
            )
        except Exception as exc:
            _raise_work_error(exc)

    @router.post("/projects/{project_id}/work-items/{ref}/assign")
    def assign_work_item(project_id: str, ref: str, body: WorkItemAssign):
        try:
            return work.assign_item(
                project_id,
                ref,
                body.assignee_id,
                actor=_actor(body.actor_id, body.actor_kind),
            )
        except Exception as exc:
            _raise_work_error(exc)

    @router.post("/projects/{project_id}/work-items/{ref}/dependencies")
    def add_work_dependency(project_id: str, ref: str, body: WorkItemDependency):
        try:
            return work.add_dependency(
                project_id,
                ref,
                body.dependency_ref,
                actor=_actor(body.actor_id, body.actor_kind),
            )
        except Exception as exc:
            _raise_work_error(exc)

    @router.post(
        "/projects/{project_id}/work-items/{ref}/dependencies/{dependency_ref}/remove"
    )
    def remove_work_dependency(
        project_id: str,
        ref: str,
        dependency_ref: str,
        body: WorkItemActor,
    ):
        try:
            return work.remove_dependency(
                project_id,
                ref,
                dependency_ref,
                actor=_actor(body.actor_id, body.actor_kind),
            )
        except Exception as exc:
            _raise_work_error(exc)

    @router.get("/projects/{project_id}/work-items/{ref}")
    def work_item_detail(project_id: str, ref: str):
        try:
            detail = work.detail(project_id, ref)
        except Exception as exc:
            _raise_work_error(exc)
        if detail is None:
            raise HTTPException(
                404,
                {
                    "code": "task_not_found",
                    "message": "canonical task was not found",
                    "fields": {"task": ref},
                },
            )
        return detail

    @router.post("/projects/{project_id}/work-items/{ref}/transition")
    def transition_work_item(project_id: str, ref: str,
                             body: WorkItemTransition):
        try:
            item = work.transition(
                project_id,
                ref,
                body.status,
                actor=_actor(body.actor_id, body.actor_kind),
            )
        except Exception as exc:
            _raise_work_error(exc)
        return {"ref": ref, "status": item["status"]}

    @router.get("/projects/{project_id}/backlog")
    def list_backlog(project_id: str):
        try:
            entries = work.backlog_list(project_id)
        except Exception as exc:
            _raise_work_error(exc)
        return {"backlog": entries}

    @router.post("/projects/{project_id}/backlog/items")
    def create_queued_work_item(project_id: str,
                                body: QueuedWorkItemCreate):
        try:
            item, entry = work.create_queued_item(
                project_id,
                title=body.title,
                item_type=body.type,
                creator=_actor(body.creator_id, body.creator_kind),
                assignee=_actor(body.assignee_id, body.assignee_kind),
                rank=body.rank,
                reason=body.reason,
                initiative_ref=body.initiative_ref,
                idempotency_key=body.idempotency_key,
            )
        except Exception as exc:
            _raise_work_error(exc)
        return {
            "ref": item["ref"],
            "id": item["id"],
            "type": item["type"],
            "title": item["title"],
            "assignee": item.get("assignee"),
            "created_by": item.get("created_by"),
            "initiative_ref": item.get("initiative_ref"),
            "rank": entry["rank"],
            "priority_reason": entry["priority_reason"],
        }

    @router.post("/projects/{project_id}/backlog")
    def backlog_add(project_id: str, body: BacklogAdd):
        try:
            entry = work.backlog_add(
                project_id,
                body.ref,
                body.rank,
                reason=body.reason,
                actor=_actor(body.actor_id, body.actor_kind),
            )
        except Exception as exc:
            _raise_work_error(exc)
        return {"ref": entry["item_ref"], "rank": entry["rank"]}

    @router.post("/projects/{project_id}/backlog/{ref}/rerank")
    def backlog_rerank(project_id: str, ref: str, body: BacklogRerank):
        try:
            audit = work.backlog_rerank(
                project_id,
                ref,
                body.new_rank,
                reason=body.reason,
                actor=_actor(body.actor_id, body.actor_kind),
            )
        except Exception as exc:
            _raise_work_error(exc)
        return {"ref": ref, "from_rank": audit["from_rank"],
                "to_rank": audit["to_rank"]}


    @router.post("/projects/{project_id}/milestones")
    def milestone_create(project_id: str, body: MilestoneCreate):
        try:
            svc.require_feature(project_id, "milestones")
            if store._conn.execute(
                "SELECT 1 FROM project_stewardship WHERE project_id=?",
                    (project_id,)).fetchone() is None:
                raise HTTPException(404, f"project {project_id} not found")
            mid = dy.milestone_create(project_id, body.name, due=body.due,
                                      actor=_actor(body.actor_id,
                                                   body.actor_kind))
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(409, str(e))
        return {"id": mid, "name": body.name}

    @router.post("/projects/{project_id}/milestones/{name}/attach")
    def milestone_attach(project_id: str, name: str, body: MilestoneAttach):
        try:
            svc.require_feature(project_id, "milestones")
            dy.milestone_attach(project_id, name, body.ref,
                                actor=_actor(body.actor_id, body.actor_kind))
        except ServiceError:
            raise
        except Exception as e:
            raise HTTPException(409, str(e))
        return {"name": name, "attached": body.ref}

    @router.get("/projects/{project_id}/milestones")
    def milestone_list(project_id: str):
        svc.require_feature(project_id, "milestones")
        if store._conn.execute(
            "SELECT 1 FROM project_stewardship WHERE project_id=?",
                (project_id,)).fetchone() is None:
            raise HTTPException(404, f"project {project_id} not found")
        return {"milestones": dy.milestone_list(project_id)}

    @router.patch("/projects/{project_id}/milestones/{name}")
    def milestone_update(project_id: str, name: str, body: MilestoneUpdate):
        try:
            svc.require_feature(project_id, "milestones")
            dy.milestone_update(project_id, name, due=body.due,
                                closed=body.closed,
                                actor=_actor(body.actor_id, body.actor_kind))
        except ValueError as e:
            raise HTTPException(404, str(e))
        except Exception as e:
            raise HTTPException(409, str(e))
        return dy.milestone_progress(project_id, name)

    @router.get("/projects/{project_id}/milestones/{name}")
    def milestone_progress(project_id: str, name: str):
        try:
            return dy.milestone_progress(project_id, name)
        except ValueError as e:
            raise HTTPException(404, str(e))

    @router.put("/projects/{project_id}/views")
    def view_save(project_id: str, body: ViewSave):
        try:
            svc.require_feature(project_id, "saved_views")
            dy.view_save(project_id, body.name, body.layout,
                         filters=body.filters,
                         actor=_actor(body.actor_id, body.actor_kind),
                         shared=body.shared)
        except ValueError as e:
            raise HTTPException(422, str(e))
        except Exception as e:
            raise HTTPException(409, str(e))
        return {"name": body.name, "layout": body.layout}

    @router.get("/projects/{project_id}/views")
    def views_list(project_id: str, actor_id: str, actor_kind: str = "human"):
        svc.require_feature(project_id, "saved_views")
        try:
            actor = _actor(actor_id, actor_kind)
        except ValueError:
            raise HTTPException(422, f"invalid actor_kind {actor_kind!r}")
        return {"views": dy.views_list(project_id, actor=actor)}

    @router.post("/projects/{project_id}/reports")
    def report_generate(project_id: str, body: ReportRequest):
        try:
            actor = _actor(body.actor_id, body.actor_kind)
            return dy.report_generate(
                project_id,
                report_type=body.report_type,
                include_activity=body.include_activity,
                actor=actor,
            )
        except ValueError as exc:
            raise HTTPException(422, str(exc))

    @router.get("/projects/{project_id}/reports")
    def reports_list(project_id: str, limit: int = 20):
        return {"reports": dy.reports_list(project_id, limit=limit)}

    @router.get("/projects/{project_id}/reports/{report_id}")
    def report_get(project_id: str, report_id: str):
        try:
            return dy.report_get(project_id, report_id)
        except ValueError as exc:
            raise HTTPException(404, str(exc))


    # ------------------- Dockyard bot layer (G2) ---------------------- #

    @router.post("/projects/{project_id}/bots")
    def register_bot(project_id: str, body: BotRegister):
        try:
            bot = dy.bot_register(body.bot_id, body.display_name,
                                  capabilities=body.capabilities,
                                  profile=body.profile)
        except ValueError as e:
            raise HTTPException(422, str(e))
        return {"bot": body.bot_id, "capabilities": bot.capabilities}

    @router.get("/bots")
    def list_bots(status: Optional[str] = None):
        from ..dockyard.bots import BotStatus as _BS

        if status:
            try:
                _BS(status)
            except ValueError:
                raise HTTPException(422, f"invalid status {status!r}")
        return {"bots": [
            {"id": b.id, "name": b.display_name, "status": b.status.value,
             "current_item": b.current_item, "capabilities": b.capabilities}
            for b in dy.bots_list(status=status)
        ]}

    @router.post("/bots/{bot_id}/status")
    def set_bot_status(bot_id: str, body: BotStatusBody):
        try:
            actor = _actor(body.actor_id or bot_id,
                           "bot" if not body.actor_id else "human")
            bot = dy.bot_set_status(bot_id, body.status,
                                    current_item=body.current_item,
                                    actor=actor if body.actor_id else None)
        except ValueError as e:
            raise HTTPException(404 if "unknown" in str(e) else 422, str(e))
        return {"bot": bot_id, "status": bot.status.value}

    @router.get("/workload")
    def workload_board():
        return dy.workload_board()

    @router.get("/bots/{bot_id}/reputation")
    def bot_reputation(bot_id: str):
        try:
            return dy.bot_reputation(bot_id)
        except ValueError as e:
            raise HTTPException(404, str(e))

    @router.post("/bot-groups")
    def create_group(body: GroupCreate):
        try:
            g = dy.group_create(
                body.name, purpose=body.purpose,
                channel_ref=body.channel_ref,
                member_ids=body.member_ids, lead_id=body.lead_id,
                actor=_actor(body.actor_id, "human")
                if body.actor_id else None)
        except ValueError as e:
            raise HTTPException(422, str(e))
        except Exception as e:
            raise HTTPException(409, str(e))
        return {"group": body.name, "lead": g.lead_id(),
                "members": list(g.members.keys())}

    @router.get("/bot-groups")
    def list_groups():
        return {"groups": [
            {"name": g.name, "purpose": g.purpose,
             "channel_ref": g.channel_ref, "lead": g.lead_id(),
             "members": list(g.members.keys())}
            for g in dy.groups_list()
        ]}

    @router.post("/bot-groups/{name}/members")
    def add_group_member(name: str, body: GroupMemberAdd):
        try:
            dy.group_add_member(name, body.bot_id, as_lead=body.as_lead)
        except ValueError as e:
            raise HTTPException(404 if "unknown" in str(e) else 422, str(e))
        except Exception as e:
            raise HTTPException(409, str(e))
        return {"group": name, "added": body.bot_id}

    @router.post("/a2a")
    def a2a_send(body: A2ASend):
        try:
            sent = dy.a2a_send(body.msg_type, from_actor=body.from_actor,
                               to_group=body.to_group,
                               payload=body.payload, item_ref=body.item_ref)
        except Exception as e:
            msg = str(e)
            code = 404 if "unknown group" in msg else 422
            raise HTTPException(code, msg)
        return sent

    @router.get("/bot-groups/{name}/messages")
    def a2a_feed(name: str, limit: int = 50):
        try:
            feed = dy.a2a_feed(name, limit=limit)
        except Exception as e:
            raise HTTPException(404, str(e))
        return {"group": name, "messages": feed}


    # ------------------- Dockyard product polish (G4) ------------------ #

    @router.get("/inbox")
    def approval_inbox():
        # Cross-project inbox: fail closed only if every enabled project has
        # the inbox feature off; otherwise filter per project below.
        return dy.approval_inbox()

    @router.get("/dashboard")
    def dashboard():
        return dy.dashboard()

    @router.get("/notifications")
    def fleet_notifications():
        return dy.fleet_notifications()

    @router.post("/notifications/{notification_id}/ack")
    def ack_notification(notification_id: int):
        try:
            dy.ack_notification(notification_id)
        except ValueError as e:
            raise HTTPException(404, str(e))
        return {"acked": notification_id}

    @router.post("/projects/{project_id}/workflows")
    def define_workflow(project_id: str, body: WorkflowDefine):
        try:
            return workflows.define(
                project_id,
                body.name,
                {"nodes": body.nodes},
            )
        except ValueError as exc:
            raise HTTPException(422, str(exc)) from None

    @router.get("/projects/{project_id}/workflows")
    def list_workflows(project_id: str):
        return {"workflows": workflows.list(project_id)}

    @router.post("/projects/{project_id}/workflows/{name}/start")
    def start_workflow(project_id: str, name: str, body: WorkflowStart):
        try:
            svc.require_feature(project_id, "workflow_canvas")
            return workflows.start(
                project_id,
                name,
                body.run_key,
                body.version,
            )
        except KanbanAdapterError as exc:
            _raise_work_error(exc)
        except ValueError as exc:
            raise HTTPException(422, str(exc)) from None

    @router.get("/projects/{project_id}/workflows/{name}/runs")
    def list_workflow_runs(project_id: str, name: str):
        """Read-only run ledger with per-node canonical status (canvas view)."""
        svc.require_feature(project_id, "workflow_canvas")
        try:
            return {"runs": workflows.runs(project_id, name)}
        except ValueError as exc:
            raise HTTPException(404, str(exc)) from None

    @router.post("/onboard")
    def onboard(body: OnboardingRequest):
        """Provision canonical Hermes state before Dockyard governance metadata."""
        slug = (body.slug or body.project_id).strip()
        board_slug = (body.board_slug or slug).strip()
        name = (body.name or body.project_id.replace("-", " ").title()).strip()
        key = (
            body.idempotency_key
            or f"dockyard-onboard:{body.project_id}"
        ).strip()
        autonomy = min(max(body.autonomy_level, 0), 3)
        try:
            canonical = adapter.provision_project(
                name=name,
                slug=slug,
                description=body.mission,
                repo_path=body.repo_path,
                lead_profile=body.lead_profile,
                board_slug=board_slug,
                idempotency_key=key,
            )
        except KanbanAdapterError as exc:
            _raise_work_error(exc)
        except Exception:
            raise HTTPException(
                503,
                {
                    "code": "host_unavailable",
                    "message": "canonical project and Kanban host is unavailable",
                },
            ) from None

        try:
            try:
                svc.settings(body.project_id)
            except ServiceError:
                svc.enable(
                    project_id=body.project_id,
                    mission=body.mission,
                    lead_profile=body.lead_profile,
                    autonomy_level=autonomy,
                )
            try:
                dy.group_create(
                    f"{body.project_id}-ops",
                    purpose="auto-created by onboarding",
                )
            except ValueError:
                pass
            try:
                dy.view_save(
                    body.project_id,
                    "Default board",
                    "board",
                    filters={},
                    actor=_actor(body.actor_id, "human"),
                )
            except ValueError:
                pass
        except Exception:
            raise HTTPException(
                409,
                {
                    "code": "governance_incomplete",
                    "message": "Canonical project exists; Dockyard governance setup can be retried",
                    "fields": {"idempotency_key": [key]},
                },
            ) from None

        store.audit(
            actor=body.actor_id,
            interface="dockyard:human",
            action="project.onboarded",
            subject=body.project_id,
            detail={
                "repo": body.repo_path,
                "canonical_project_id": canonical["project"]["id"],
                "board_slug": canonical["board"]["slug"],
                "idempotency_key": key,
            },
        )
        return {
            "project": body.project_id,
            "screen": "s2",
            "group": f"{body.project_id}-ops",
            "view": "Default board",
            "canonical": canonical,
        }

    app.include_router(router)

    @app.exception_handler(HTTPException)
    async def http_envelope(request: Request, exc: HTTPException):
        return error_envelope_handler(request, exc)

    @app.exception_handler(ServiceError)
    async def service_envelope(request: Request, exc: ServiceError):
        msg = str(exc).lower()
        not_found = "not enabled" in msg or "no such" in msg
        # "disabled" alone is ambiguous: stewardship disabled = 404, but a
        # togglable feature being off is a conflict the client can flip (409).
        feature_disabled = "feature '" in msg and "is disabled" in msg
        if feature_disabled:
            return error_envelope_handler(
                request, HTTPException(409, str(exc)))
        return error_envelope_handler(
            request, HTTPException(404 if not_found else 409, str(exc))
        )

    @app.get("/healthz")
    def healthz():
        return {"ok": True, "schema_version": store.schema_version}

    return app


# Module-level app so `uvicorn hermes_project_stewardship.api.server:app`
# works as documented in the README. Uses ./stewardship.db by default.
app = create_app()


if __name__ == "__main__":  # pragma: no cover
    import uvicorn

    uvicorn.run(app, host="127.0.0.1", port=9310)
