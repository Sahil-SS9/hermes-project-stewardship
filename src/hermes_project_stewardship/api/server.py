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
import hashlib
import json
import logging
import os
from dataclasses import asdict
from pathlib import Path
from typing import Any, cast, Dict, List, NoReturn, Optional

try:
    from fastapi import APIRouter, FastAPI, HTTPException, Query, Request
    from pydantic import BaseModel, ConfigDict, Field, StrictBool
except ImportError as e:  # pragma: no cover
    raise ImportError(
        "The RPC server needs the 'desktop-panel' extra: "
        "pip install 'hermes-project-stewardship[desktop-panel]'"
    ) from e

from ..cycles.engine import CycleEngine, CycleRefused
from ..domain.constants import Capability
from ..dockyard import Actor, ActorKind
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
from ..persistence.service import (
    FeatureDisabledError,
    ServiceError,
    StewardshipService,
)
from ..persistence.workflow_service import WorkflowService
from ..persistence.workflow_library import WorkflowLibrary
from ..observation.recovery import ReconcileService
from ..persistence.store import Store, iso
from .middleware import (
    BearerAuthMiddleware,
    DesktopProxyBindingMiddleware,
    MissingAuthMiddleware,
    RateLimitMiddleware,
    acting_actor,
    current_principal,
    desktop_proxy_actor,
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


class MemberRequest(BaseModel):
    profile_slug: str
    role: str = "member"
    actor: str = ""  # attribution only; never authorisation


class MemberStateRequest(BaseModel):
    state: str
    actor: str = ""


class RelinkRequest(BaseModel):
    new_profile_slug: str
    actor: str = ""


class TransferPreviewRequest(BaseModel):
    from_profile: str
    to_profile: str


class TransferExecuteRequest(TransferPreviewRequest):
    fingerprint: str
    idempotency_key: str
    selected_ids: Optional[List[str]] = None


class SettingsPatch(BaseModel):
    mission: Optional[str] = None
    lead_profile: Optional[str] = None
    member_profiles: Optional[list[str]] = None
    autonomy_level: Optional[int] = None
    autonomy_policy: Optional[Dict[str, Any]] = None
    verification_policy: Optional[Dict[str, Any]] = None
    release_policy: Optional[Dict[str, Any]] = None
    notification_policy: Optional[Dict[str, Any]] = None
    actor: str = "stewardship-api"
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


class GoalCreateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    title: str
    description: str = ""
    position: Optional[int] = None
    objective_ids: List[int] = Field(default_factory=list)


class GoalPatchRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    title: Optional[str] = None
    description: Optional[str] = None
    position: Optional[int] = None
    objective_ids: Optional[List[int]] = None


class GoalOrderRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    goal_ids: List[str]


class ObjectiveAssessmentRequest(BaseModel):
    passed: bool
    evidence: list[str]
    detail: str = ""
    expires_at: Optional[str] = None
    interface: str = "rpc"


class ContentUploadRequest(BaseModel):
    filename: str
    media_type: str
    content_base64: str
    actor: str = "system"
    interface: str = "rpc"


class CanvasObjectRequest(BaseModel):
    id: str
    kind: str
    content: Dict[str, Any] = Field(default_factory=dict)
    x: float = 0
    y: float = 0
    width: float = 240
    height: float = 140
    tags: List[str] = Field(default_factory=list)
    evidence_ref: Optional[str] = None
    work_ref: Optional[str] = None
    # D20 palette key; validated against STICKER_COLOURS in the service.
    colour: Optional[str] = Field(default=None, max_length=32)


class CanvasConnectorRequest(BaseModel):
    id: str
    source: str
    target: str
    meaning: str


class CanvasSaveRequest(BaseModel):
    expected_revision: int
    objects: List[CanvasObjectRequest] = Field(default_factory=list)
    connectors: List[CanvasConnectorRequest] = Field(default_factory=list)
    actor: str = "system"


class CanvasSessionStartRequest(BaseModel):
    # D15: the chat box text. Bounded again in the service (4000 chars).
    message: Optional[str] = Field(default=None, max_length=4000)
    actor: str = "system"


class CanvasBoardCreateRequest(BaseModel):
    name: str = Field(min_length=1, max_length=400)
    actor: str = "system"


class CanvasBoardModel(BaseModel):
    provider: str = Field(min_length=1, max_length=200)
    model: str = Field(min_length=1, max_length=200)


class CanvasBoardUpdateRequest(BaseModel):
    """Only fields present in the body change; ``null`` clears theme/model."""
    name: Optional[str] = Field(default=None, max_length=400)
    status: Optional[str] = None
    theme: Optional[str] = None
    model: Optional[CanvasBoardModel] = None
    actor: str = "system"


class CanvasSessionAnswerRequest(BaseModel):
    outcome: str
    answer: str = ""
    actor: str = "system"


class CanvasProposalDecisionRequest(BaseModel):
    approve: bool
    # Ignored, like ApprovalAction.actor: the decider is the trusted caller
    # (Q2 rule, extended to canvas proposals by Sahil 04/10/2026).
    actor: str = ""
    # QA M-4: when given, the proposal must belong to this project (404 if
    # not). Optional so older callers keep working.
    project_id: str | None = Field(default=None, min_length=1, max_length=200)


class CanvasPlanSynthesisRequest(BaseModel):
    project_id: str
    actor: str = "system"


class CanvasPlanDocumentRequest(BaseModel):
    actor: str = "system"


class CanvasPlanBacklogRequest(BaseModel):
    step_orders: List[int]
    actor: str = "system"
    goal_id: Optional[Any] = None


class CanvasPlanStepsRequest(BaseModel):
    """D15: edit a draft plan's steps from the expanded overlay."""
    steps: Any
    actor: str = "system"


def _canvas_provider(board_model: dict | None = None):
    """The curation provider for canvas sessions.

    ``board_model`` is the board's saved {provider, model}; when unset the
    Hermes-configured default is used.

    The assistant runs through the provider seam, never a hard-coded model.
    Default is the REAL Hermes adapter (whatever model Hermes is configured
    for). A provider seam must stay test-safe: the pytest suite never calls a
    real model, so tests inject a fake provider (or set HPS_CANVAS_PROVIDER)
    instead of going through this route's default.
    """
    import os

    requested = os.environ.get("HPS_CANVAS_PROVIDER", "hermes")
    if requested == "none":
        return None
    if requested == "fake":
        # Deterministic test-safe provider for browser journeys: synthesises a
        # technical_plan proposal from the canvas seed, never touches a model.
        class _JourneyProvider:
            provider_id = "fake"
            model_id = "fake-model"

            def propose(self, context):
                canvas = context.get("canvas") or {}
                plan = context.get("plan")
                if isinstance(plan, dict):
                    # Plan refinement: echo the approved step titles verbatim
                    # (refinement-only contract; invention is rejected anyway).
                    steps = [
                        {"title": step.get("title"), "source_object_ids": list(step.get("source_object_ids") or [])}
                        for step in (plan.get("steps") or []) if isinstance(step, dict) and step.get("title")
                    ]
                    return {"proposals": [
                        {"kind": "technical_plan", "title": "Technical implementation plan",
                         "body": {"steps": steps}},
                    ]}
                objects = [
                    {"id": row.get("id"), "kind": row.get("kind"), "content": row.get("content") or {}}
                    for row in (canvas.get("objects") or [])
                ]
                seen_titles = set()
                plan_items = []
                for row in objects:
                    title = f"Implement: {(row.get('content') or {}).get('text') or row.get('kind')}"
                    if title in seen_titles:
                        continue
                    seen_titles.add(title)
                    plan_items.append(
                        {"title": title, "source_object_ids": [row.get("id")]}
                    )
                return {"proposals": [
                    {"kind": "technical_plan", "title": "Technical implementation plan",
                     "body": {"steps": plan_items}},
                ]}

        return _JourneyProvider()
    if requested == "hermes":
        from ..persistence.hermes_curation_provider import HermesCurationProvider
        try:
            if board_model:
                return HermesCurationProvider(provider_id=board_model.get("provider"),
                                              model_id=board_model.get("model"))
            return HermesCurationProvider()
        except Exception:
            # No Hermes runtime/configured model in this process (tests,
            # bare hosts): fall back to the provider-neutral local contract
            # instead of failing every session route.
            return None
    raise ValueError(f"unknown canvas provider: {requested}")


class InitiativeProposal(BaseModel):
    title: str
    rationale: str
    expected_outcome: str = ""
    risk: str = "low"
    dedupe_key: Optional[str] = None
    validation_contract: Optional[Dict[str, Any]] = None


class ApprovalAction(BaseModel):
    # Ignored by approve/reject (owner decision 03/10/2026, Q2): the decider is
    # the trusted caller, never a name in the body. Kept so older callers that
    # still send it are not rejected for the field itself.
    actor: str = ""
    interface: str = "rpc"
    expected_fingerprint: Optional[str] = None
    note: str = ""
    reason: str = ""
    # Approve only: the profile that owns the Implement card.
    assignee: Optional[str] = None


class RequestChangesAction(BaseModel):
    model_config = ConfigDict(extra="forbid")
    actor: str = ""  # ignored: see ApprovalAction (Q2, 03/10/2026)
    interface: str = "desktop"
    expected_fingerprint: Optional[str] = None
    feedback: str = ""
    note: str = ""


class ResubmitAction(BaseModel):
    model_config = ConfigDict(extra="forbid")
    actor: str = "proposer"
    interface: str = "desktop"
    rationale: Optional[str] = None
    expected_outcome: Optional[str] = None
    risk: Optional[str] = None
    note: str = ""


class WithdrawAction(BaseModel):
    """Withdraw before approval (design round f, Option B, 05/10/2026)."""

    model_config = ConfigDict(extra="forbid")
    actor: str = ""  # ignored: the trusted caller withdraws (Q2, 03/10/2026)
    interface: str = "rpc"
    reason: str = Field(default="", max_length=2000)


class InitiativeCommentAction(BaseModel):
    model_config = ConfigDict(extra="forbid")
    actor: str = ""
    interface: str = "desktop"
    body: str = ""


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
    assignee: Optional[str] = None
    actor_id: str = "stewardship-api"


class CompleteRequest(BaseModel):
    outcome: Dict[str, Any]
    regressed: bool = False
    actor_id: str = "stewardship-api"
    actor_kind: str = "human"


def _post_confirm(integration, ref: str) -> None:
    """After a person confirms delivery, sync canonical work and schedule the
    post-delivery observation. complete_from_board no longer completes the
    initiative (D-L3); here it only does the work-sync + observation scheduling."""
    integration.complete_from_board(ref, outcome={}, regressed=False)


class ReconcileRequest(BaseModel):
    actor: str = "stewardship-api"
    interface: str = "api"
    trigger_type: str = "manual"


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


class BacklogCsvImport(BaseModel):
    model_config = ConfigDict(extra="forbid")
    csv_text: str
    apply: bool = False
    actor_id: str = "stewardship-api"
    actor_kind: str = "human"


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
    initiative_ref: Optional[str] = None
    labels: Optional[List[str]] = None
    evidence_refs: Optional[List[str]] = None
    estimate_days: Optional[float] = None
    due: Optional[str] = None
    reason: Optional[str] = None
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
    body: Optional[str] = None
    labels: List[str] = []
    evidence_refs: List[str] = []
    creator_id: str
    creator_kind: str = "human"
    # Sahil 04/10 (demo feedback b): an item may be unassigned. Hermes never
    # dispatches unassigned work, and the screens say so.
    assignee_id: Optional[str] = None
    assignee_kind: str = "bot"
    rank: int
    reason: str
    initiative_ref: Optional[str] = None
    parent_ref: Optional[str] = None
    estimate_days: Optional[float] = None
    due: Optional[str] = None
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


class MilestoneRename(BaseModel):
    new_name: str
    actor_id: str
    actor_kind: str = "human"


class FeaturePatch(BaseModel):
    features: Dict[str, bool]
    actor: str = "stewardship-api"
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
    actor_id: str = "stewardship-api"
    actor_kind: str = "human"


class OnboardingRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    project_id: str
    name: Optional[str] = None
    slug: Optional[str] = None
    repo_path: str
    mission: str
    lead_profile: str
    member_profiles: List[str] = Field(default_factory=list)
    board_slug: Optional[str] = None
    idempotency_key: Optional[str] = None
    autonomy_level: int = 2
    actor_id: str = "stewardship-api"
    expected_membership_revision: Optional[int] = None
    preflight_token: Optional[str] = None


class WorkflowDefine(BaseModel):
    model_config = ConfigDict(extra="forbid")
    name: str
    nodes: List[Dict[str, Any]]


class WorkflowVersionDefine(BaseModel):
    model_config = ConfigDict(extra="forbid")
    nodes: List[Dict[str, Any]]


class WorkflowStart(BaseModel):
    model_config = ConfigDict(extra="forbid")
    run_key: str
    version: Optional[int] = None


class WorkflowTemplateDefine(BaseModel):
    model_config = ConfigDict(extra="forbid")
    name: str
    nodes: List[Dict[str, Any]]


class WorkflowInstantiate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    template: str
    name: Optional[str] = None
    version: Optional[int] = None

class WorkflowLibraryDefine(BaseModel):
    model_config = ConfigDict(extra="forbid")
    scope: str
    name: str
    owner_project_id: Optional[str] = None
    nodes: List[Dict[str, Any]]

class WorkflowEnablementBody(BaseModel):
    model_config = ConfigDict(extra="forbid")
    enabled: StrictBool


class WorkflowBindingBody(BaseModel):
    model_config = ConfigDict(extra="forbid")
    group_id: Optional[int] = None
    overrides: Dict[str, str] = Field(default_factory=dict)


class WorkflowRevisionProposal(BaseModel):
    model_config = ConfigDict(extra="forbid")
    proposed_by: str = "agent"
    rationale: str
    add_nodes: List[Dict[str, Any]]
    add_edges: List[Dict[str, str]] = Field(default_factory=list)


class WorkflowRevisionDecision(BaseModel):
    model_config = ConfigDict(extra="forbid")
    approve: bool
    actor_id: str = "stewardship-api"


class WorkflowImportBody(BaseModel):
    model_config = ConfigDict(extra="forbid")
    apply: bool = False
    as_name: Optional[str] = None
    document: Dict[str, Any]


def _kanban_error_status(code: str) -> int:
    """HTTP status for a Hermes (canonical host) error code.

    A missing project, board, task or epic is a 404. For a project Hermes does
    not know, that is an unlinked project, not an outage (10/10/2026). Only an
    unavailable or failing host is a 503, so the API still fails closed.
    """
    if code.endswith("_not_found"):
        return 404
    if code == "validation_error":
        return 422
    if code in {"transition_conflict", "write_conflict", "idempotency_conflict"}:
        return 409
    return 503


def create_app(
    store: Optional[Store] = None,
    db_path: Optional[Path] = None,
    *,
    auth_token: Optional[str] = None,
    auth_principal: str = "rpc-token",
    auth_principal_is_human: bool = False,
    rate_limit_rpm: int = 120,
    kanban_adapter: KanbanAdapter | None = None,
    capabilities=None,
) -> FastAPI:
    embedded = store is not None
    if store is None:
        from ..runtime import open_store

        store = open_store(db_path)
    svc = StewardshipService(store)
    engine = CycleEngine(svc)
    # Batch E1: notifications switched on via the ONE shared wiring function
    # (review bug 2) — bus, engine and decision hook in a single seam.
    from ..events.notifications import wire_notification_stack

    bus, notification_engine = wire_notification_stack(store, svc)
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
    from ..persistence.membership import MembershipService
    from ..persistence.team_management import PreviewConflict, TeamManagementService
    membership_service = MembershipService(store, svc)
    team_management = TeamManagementService(store, svc, membership_service, adapter)
    workflows = WorkflowService(store, cast(CanonicalWorkPort, adapter))
    workflow_library = WorkflowLibrary(workflows)
    dy = DockyardService(store, canonical_work=work)
    integration = DockyardIntegration(
        dy=dy,
        svc=svc,
        bridge=bridge,
        canonical_work=work,
    )

    app = FastAPI(
        title="Hermes Project Stewardship RPC",
        version="0.5.2",
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
    # Batch E1: bus + engines surfaced for tests and host integrations.
    app.state.bus = bus
    app.state.cycle_engine = engine
    app.state.notification_engine = notification_engine
    app.state.svc = svc
    app.state.gateway = gateway
    token = auth_token or os.environ.get("STEWARD_RPC_TOKEN")
    if token:
        app.add_middleware(
            BearerAuthMiddleware,
            token=token,
            principal=auth_principal or os.environ.get("STEWARD_RPC_PRINCIPAL", "rpc-token"),
        )
    elif not embedded:
        app.add_middleware(MissingAuthMiddleware)
    app.add_middleware(RateLimitMiddleware, requests_per_minute=rate_limit_rpm)
    app.add_middleware(DesktopProxyBindingMiddleware)

    router = APIRouter(prefix="/stewardship/v1")

    @router.get("/projects")
    def list_projects():
        return {"projects": svc.list_projects()}

    # Archived projects are hidden from every other list; this is where they
    # are listed, with what Restore brings back. Declared before any
    # /projects/{project_id} route so "archived" is never read as a project id.
    @router.get("/projects/archived")
    def archived_projects():
        return {"projects": svc.archived_projects()}

    def _lifecycle_authority() -> str:
        if embedded and not token:
            return "embedded-service"
        if capabilities is not None or (token and not auth_principal_is_human):
            return _membership_authority("project_archive")
        principal = current_principal()
        if principal:
            return principal
        raise HTTPException(503, "no trusted principal available")

    @router.post("/projects/{project_id}/enable")
    def enable(project_id: str, body: EnableRequest):
        principal = _lifecycle_authority()
        return svc.enable(
            project_id,
            mission=body.mission,
            lead_profile=body.lead_profile,
            member_profiles=body.member_profiles,
            autonomy_level=body.autonomy_level,
            verification_policy=body.verification_policy,
            release_policy=body.release_policy,
            notification_policy=body.notification_policy,
            actor=principal,
            interface="rpc",
        )

    @router.post("/projects/{project_id}/disable")
    def disable(project_id: str):
        principal = _lifecycle_authority()
        return svc.disable(project_id, actor=principal, interface="rpc")

    # ------------------------------------------------------------------ #
    # Membership (Phase 1, PM-0102/0103/0104/0105/0111). Authority: a     #
    # verified human principal is required; capability is composed by the #
    # server, never by request fields. Fail closed with 503 when no       #
    # trusted principal exists.                                           #
    # ------------------------------------------------------------------ #

    def _membership():
        return membership_service

    # Fix 5: the server composes the capability set bound to the verified
    # principal. Payloads can never grant capabilities; shared/agent
    # principals carry the default denial for privileged membership work.
    # Fix 6: the capability set is composed by the SERVER (explicit
    # per-principal grant), never by the request. A verified human without
    # a capability gets exactly 403.
    principal_capabilities: frozenset = (
        frozenset(capabilities) if capabilities is not None
        else (frozenset({c.value for c in Capability}) if auth_principal_is_human else frozenset())
    )

    def _membership_authority(capability_name: str) -> str:
        principal = current_principal()
        if (
            not principal
            and embedded
            and kanban_adapter is not None
            and auth_principal_is_human
            and capabilities is not None
        ):
            principal = auth_principal
        if not principal:
            raise HTTPException(
                503,
                "no trusted principal available: membership changes require"
                " an authenticated human caller; a payload actor string is"
                " attribution, never authority",
            )
        if capability_name not in principal_capabilities:
            raise HTTPException(
                403,
                f"verified principal '{principal}' lacks the '{capability_name}' capability",
            )
        return principal

    @router.get("/projects/{project_id}/members")
    def list_members(project_id: str):
        return {"members": [m.__dict__ for m in _membership().list_members(project_id)]}

    @router.get("/projects/{project_id}/team")
    def project_team(project_id: str):
        try:
            return team_management.team(project_id)
        except KanbanAdapterError as exc:
            raise HTTPException(_kanban_error_status(exc.code),
                                {"code": exc.code, "message": exc.message}) from None
        except (ServiceError, PreviewConflict) as exc:
            raise HTTPException(409, str(exc)) from None

    @router.post("/projects/{project_id}/members")
    def add_member(project_id: str, body: MemberRequest):
        principal = _membership_authority("membership_admin")
        try:
            if body.role != "member":
                raise ServiceError("add members as role 'member'; use lead transfer separately")
            member = team_management.add_member(project_id, body.profile_slug, actor=principal)
        except KanbanAdapterError as e:
            raise HTTPException(_kanban_error_status(e.code),
                                {"code": e.code, "message": e.message}) from None
        except ServiceError as e:
            raise HTTPException(409, str(e)) from None
        return member.__dict__

    @router.delete("/projects/{project_id}/members/{profile_slug}")
    def remove_member(project_id: str, profile_slug: str, body: MemberRequest):
        principal = _membership_authority("membership_admin")
        try:
            return _membership().remove_member(project_id, profile_slug, actor=principal).__dict__
        except ServiceError as e:
            raise HTTPException(409, str(e)) from None

    @router.post("/projects/{project_id}/members/{profile_slug}/lead")
    def transfer_lead(project_id: str, profile_slug: str, body: MemberRequest):
        principal = _membership_authority("lead_transfer")
        try:
            return team_management.transfer_lead(project_id, profile_slug, actor=principal).__dict__
        except ServiceError as e:
            raise HTTPException(409, str(e)) from None

    @router.post("/projects/{project_id}/transfers/preview")
    def transfer_preview(project_id: str, body: TransferPreviewRequest):
        _membership_authority("bulk_reassignment")
        try:
            return team_management.preview(project_id, body.from_profile, body.to_profile)
        except KanbanAdapterError as exc:
            raise HTTPException(_kanban_error_status(exc.code),
                                {"code": exc.code, "message": exc.message}) from None
        except (ServiceError, PreviewConflict) as exc:
            raise HTTPException(409, str(exc)) from None

    @router.post("/projects/{project_id}/transfers/execute")
    def transfer_execute(project_id: str, body: TransferExecuteRequest):
        principal = _membership_authority("bulk_reassignment")
        try:
            return team_management.execute_departure(
                project_id, body.from_profile, body.to_profile,
                fingerprint=body.fingerprint, selected_ids=body.selected_ids,
                idempotency_key=body.idempotency_key, actor=principal,
            )
        except (ServiceError, PreviewConflict, ValueError) as exc:
            raise HTTPException(409, str(exc)) from None

    @router.post("/projects/{project_id}/reassignments")
    def bulk_reassign(project_id: str, body: TransferExecuteRequest):
        principal = _membership_authority("bulk_reassignment")
        try:
            return team_management.execute_bulk(
                project_id, body.from_profile, body.to_profile,
                fingerprint=body.fingerprint, selected_ids=body.selected_ids,
                idempotency_key=body.idempotency_key, actor=principal,
            )
        except (ServiceError, PreviewConflict, ValueError) as exc:
            raise HTTPException(409, str(exc)) from None

    @router.get("/projects/{project_id}/transfers/pending")
    def pending_transfers(project_id: str):
        _membership_authority("bulk_reassignment")
        return {"operations": team_management.pending_operations(project_id)}

    @router.get("/operations/{op_id}")
    def transfer_operation(op_id: str):
        _membership_authority("bulk_reassignment")
        try:
            return team_management.operation(op_id)
        except KeyError:
            raise HTTPException(404, "transfer operation not found") from None

    @router.post("/operations/{op_id}/retry")
    def retry_transfer(op_id: str):
        principal = _membership_authority("bulk_reassignment")
        try:
            return team_management.retry(op_id, actor=principal)
        except KeyError:
            raise HTTPException(404, "transfer operation not found") from None

    @router.post("/projects/{project_id}/members/{profile_slug}/state")
    def set_member_state(project_id: str, profile_slug: str, body: MemberStateRequest):
        principal = _membership_authority("membership_admin")
        try:
            return _membership().set_state(project_id, profile_slug, body.state, actor=principal).__dict__
        except ServiceError as e:
            raise HTTPException(409, str(e)) from None

    @router.post("/projects/{project_id}/members/{profile_slug}/relink")
    def relink_member(project_id: str, profile_slug: str, body: RelinkRequest):
        principal = _membership_authority("membership_admin")
        try:
            return _membership().relink_profile(
                project_id, profile_slug, body.new_profile_slug, actor=principal
            ).__dict__
        except ServiceError as e:
            raise HTTPException(409, str(e)) from None

    @router.post("/projects/{project_id}/re-enable")
    def re_enable(project_id: str):
        principal = _lifecycle_authority()
        return svc.re_enable(project_id, actor=principal, interface="rpc")

    @router.get("/projects/{project_id}/settings")
    def settings(project_id: str):
        result = svc.settings(project_id, include_disabled=True)
        verification = result.get("policies", {}).get("verification", {})
        if "webhook_secret" in verification:
            verification["webhook_secret"] = "***"
        return result

    @router.get("/projects/{project_id}/features")
    def features(project_id: str):
        return {"features": svc.features(project_id)}

    @router.patch("/projects/{project_id}/features")
    def patch_features(project_id: str, body: FeaturePatch):
        return {"features": svc.update_features(
            project_id, body.features,
            actor=_principal_id(body.actor), interface=body.interface,
        )}

    @router.patch("/projects/{project_id}/settings")
    def patch_settings(project_id: str, body: SettingsPatch):
        changes = body.model_dump(exclude_unset=True)
        if "lead_profile" in changes or "member_profiles" in changes:
            raise HTTPException(
                status_code=409,
                detail="settings PATCH cannot change lead_profile or member_profiles; use membership authority endpoints",
            )
        actor = _principal_id(changes.pop("actor", body.actor))
        interface = changes.pop("interface", body.interface)
        try:
            return svc.update_settings(
                project_id, actor=actor, interface=interface, **changes
            )
        except ServiceError as exc:
            # Review bug 1: notification-policy validation failures are 422
            # (the review's "saving validates strictly" contract), matching
            # the app-wide PUT; other settings errors keep the 409 envelope.
            if "notification policy" in str(exc).lower() or \
                    "notification_policy" in str(exc).lower():
                raise HTTPException(status_code=422, detail=str(exc)) from None
            raise HTTPException(status_code=409, detail=str(exc)) from None

    @router.post("/projects/{project_id}/pause")
    def pause(project_id: str):
        principal = _lifecycle_authority()
        return svc.pause(project_id, actor=principal, interface="rpc")

    @router.post("/projects/{project_id}/resume")
    def resume(project_id: str):
        principal = _lifecycle_authority()
        return svc.resume(project_id, actor=principal, interface="rpc")

    @router.post("/projects/{project_id}/freeze")
    def freeze(project_id: str):
        principal = _lifecycle_authority()
        return svc.freeze(project_id, actor=principal, interface="rpc")

    @router.post("/projects/{project_id}/archive")
    def archive_project(project_id: str):
        principal = _membership_authority("project_archive")
        try:
            return svc.archive_project(project_id, actor=principal, interface="rpc")
        except ServiceError as exc:
            raise HTTPException(409, str(exc)) from None

    @router.post("/projects/{project_id}/restore")
    def restore_project(project_id: str):
        principal = _membership_authority("project_archive")
        try:
            return svc.restore_project(project_id, actor=principal, interface="rpc")
        except ServiceError as exc:
            raise HTTPException(409, str(exc)) from None

    @router.get("/projects/{project_id}/goals")
    def goals(project_id: str, include_archived: bool = False):
        return {"goals": svc.goals(project_id, include_archived=include_archived)}

    @router.post("/projects/{project_id}/goals")
    def create_goal(project_id: str, body: GoalCreateRequest):
        principal = _membership_authority("project_archive")
        try:
            return svc.create_goal(
                project_id, actor=principal, interface="rpc", **body.model_dump()
            )
        except ServiceError as exc:
            raise HTTPException(409, str(exc)) from None

    @router.patch("/projects/{project_id}/goals/{goal_id}")
    def update_goal(project_id: str, goal_id: str, body: GoalPatchRequest):
        principal = _membership_authority("project_archive")
        try:
            return svc.update_goal(
                project_id, goal_id, actor=principal, interface="rpc",
                **body.model_dump(exclude_unset=True),
            )
        except ServiceError as exc:
            raise HTTPException(404 if "unknown goal" in str(exc) else 409, str(exc)) from None

    @router.put("/projects/{project_id}/goals/order")
    def reorder_goals(project_id: str, body: GoalOrderRequest):
        principal = _membership_authority("project_archive")
        try:
            return {"goals": svc.reorder_goals(
                project_id, body.goal_ids, actor=principal, interface="rpc"
            )}
        except ServiceError as exc:
            raise HTTPException(409, str(exc)) from None

    @router.post("/projects/{project_id}/goals/{goal_id}/archive")
    def archive_goal(project_id: str, goal_id: str):
        principal = _membership_authority("project_archive")
        try:
            return svc.archive_goal(
                project_id, goal_id, actor=principal, interface="rpc"
            )
        except ServiceError as exc:
            raise HTTPException(404 if "unknown goal" in str(exc) else 409, str(exc)) from None

    @router.post("/projects/{project_id}/goals/{goal_id}/restore")
    def restore_goal(project_id: str, goal_id: str):
        principal = _membership_authority("project_archive")
        try:
            return svc.restore_goal(
                project_id, goal_id, actor=principal, interface="rpc"
            )
        except ServiceError as exc:
            raise HTTPException(404 if "unknown goal" in str(exc) else 409, str(exc)) from None

    @router.delete("/projects/{project_id}/goals/{goal_id}")
    def delete_goal(project_id: str, goal_id: str):
        # Design round f, Option B: whoever may archive may delete, and only
        # an archived goal can be deleted.
        principal = _membership_authority("project_archive")
        try:
            return svc.delete_goal(
                project_id, goal_id, actor=principal, interface="rpc"
            )
        except ServiceError as exc:
            raise HTTPException(404 if "unknown goal" in str(exc) else 409, str(exc)) from None

    @router.get("/projects/{project_id}/objectives")
    def objectives(project_id: str, include_archived: bool = False):
        return {
            "objectives": [
                {**asdict(item), "can_record_assessment": bool(auth_principal_is_human and current_principal()), "evidence": svc.objective_evidence(project_id, item.id) if item.id is not None else None}
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
            actor=_principal_id(body.actor),
            interface=body.interface,
        )

    @router.patch("/projects/{project_id}/objectives/{objective_id}")
    def update_objective(
        project_id: str, objective_id: int, body: ObjectivePatch
    ):
        values = body.model_dump(exclude_unset=True)
        actor = _principal_id(values.pop("actor", body.actor))
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
            actor=_principal_id(body.actor),
            interface=body.interface,
        )

    @router.delete("/projects/{project_id}/objectives/{objective_id}")
    def remove_objective(
        project_id: str, objective_id: int, body: ApprovalAction
    ):
        return svc.remove_objective(
            project_id,
            objective_id,
            actor=_principal_id(body.actor),
            interface=body.interface,
        )

    @router.post("/projects/{project_id}/objectives/{objective_id}/assessment")
    def record_assessment(
        project_id: str, objective_id: int, body: ObjectiveAssessmentRequest
    ):
        # Authority: verified actor is the authenticated principal bound by
        # the bearer middleware — never a payload field. Fail closed with 503
        # when no trusted principal is configured.
        principal = current_principal()
        if not principal:
            raise HTTPException(
                503,
                "no trusted principal available: manual assessments require"
                " an authenticated human caller; the payload cannot name the"
                " verifying actor",
            )
        # This capability is assigned by the server's composition, never by
        # request fields. Shared/agent tokens retain the default denial.
        if not auth_principal_is_human:
            raise HTTPException(403, "manual assessments require a dedicated human principal")
        try:
            return svc.record_assessment(
                project_id,
                objective_id,
                passed=body.passed,
                evidence=body.evidence,
                detail=body.detail,
                expires_at=body.expires_at,
                actor=principal,
                interface=body.interface,
                trusted_principal=principal,
            )
        except ServiceError as e:
            raise HTTPException(409, str(e)) from None

    @router.post("/projects/{project_id}/objectives/{objective_id}/evaluate")
    def evaluate_objective_now(project_id: str, objective_id: int):
        """D6 'Evaluate now': evaluate ONLY the selected objective.

        Not the full stewardship cycle: no other objective, no collectors and
        no health snapshot are involved. Human-authority action — fail closed
        (503) without a trusted principal, and agent/shared tokens keep the
        default denial (403)."""
        principal = current_principal()
        if not principal:
            raise HTTPException(
                503,
                "no trusted principal available: objective evaluation requires"
                " an authenticated caller; the payload cannot name the actor",
            )
        if not auth_principal_is_human:
            raise HTTPException(
                403, "objective evaluation requires a dedicated human principal"
            )
        try:
            return svc.evaluate_objective_now(
                project_id, objective_id, actor=principal, interface="desktop"
            )
        except ServiceError as e:
            raise HTTPException(409, str(e)) from None

    @router.get("/projects/{project_id}/objectives/{objective_id}/assessments")
    def list_assessments(project_id: str, objective_id: int):
        return {"assessments": svc.assessments(project_id, objective_id)}

    @router.get("/projects/{project_id}/missions/archive")
    def archived_missions(project_id: str):
        return {"missions": svc.archived_missions(project_id)}

    @router.post("/projects/{project_id}/mission/archive")
    def archive_mission(project_id: str, body: ApprovalAction):
        return svc.archive_mission(
            project_id, actor=_principal_id(body.actor), interface=body.interface
        )

    @router.delete("/projects/{project_id}/mission")
    def remove_mission(project_id: str, body: ApprovalAction):
        return svc.remove_mission(
            project_id, actor=_principal_id(body.actor), interface=body.interface
        )

    @router.get("/projects/{project_id}/canvas")
    def project_canvas(project_id: str):
        from ..persistence.canvas_service import CanvasService
        try:
            return CanvasService(store).get(project_id)
        except ValueError as exc:
            raise HTTPException(404, str(exc)) from exc

    @router.put("/projects/{project_id}/canvas")
    def save_project_canvas(project_id: str, body: CanvasSaveRequest):
        from ..persistence.canvas_service import CanvasConflictError, CanvasService
        try:
            return CanvasService(store).save(
                project_id,
                expected_revision=body.expected_revision,
                objects=[item.model_dump() for item in body.objects],
                connectors=[item.model_dump() for item in body.connectors],
                actor=_principal_id(body.actor),
            )
        except CanvasConflictError as exc:
            raise _board_error(exc) from exc
        except ValueError as exc:
            raise HTTPException(422, str(exc)) from exc

    @router.delete("/projects/{project_id}/canvas/objects/{object_id}")
    def remove_canvas_object(project_id: str, object_id: str, expected_revision: int, actor: str = "system"):
        from ..persistence.canvas_service import CanvasConflictError, CanvasService
        try:
            return CanvasService(store).remove_object(
                project_id, object_id, expected_revision=expected_revision,
                actor=_principal_id(actor),
            )
        except CanvasConflictError as exc:
            raise _board_error(exc) from exc
        except ValueError as exc:
            raise HTTPException(422, str(exc)) from exc

    # ---- D14/D16/D19: several named boards per project ------------------
    def _board_error(exc: Exception):
        from ..persistence.canvas_service import CanvasConflictError, CanvasLockedError
        message = str(exc)
        if isinstance(exc, CanvasLockedError):
            # Distinct code so the client never mistakes a locked board for
            # a stale revision (QA M-1).
            return HTTPException(409, {"code": "board_locked", "message": message})
        if isinstance(exc, CanvasConflictError):
            return HTTPException(409, message)
        if message.startswith("unknown project") or message.startswith("unknown canvas board"):
            return HTTPException(404, message)
        if "already exists" in message:
            return HTTPException(409, message)
        return HTTPException(422, message)

    @router.get("/canvas/models")
    def canvas_models():
        from ..persistence import hermes_curation_provider
        return hermes_curation_provider.list_hermes_models()

    @router.get("/projects/{project_id}/canvases")
    def list_canvas_boards(project_id: str, include_archived: bool = False):
        from ..persistence.canvas_service import CanvasService
        try:
            return {"canvases": CanvasService(store).list_boards(project_id, include_archived=include_archived)}
        except ValueError as exc:
            raise _board_error(exc) from exc

    @router.post("/projects/{project_id}/canvases")
    def create_canvas_board(project_id: str, body: CanvasBoardCreateRequest):
        from ..persistence.canvas_service import CanvasService
        try:
            return CanvasService(store).create_board(project_id, name=body.name, actor=_principal_id(body.actor))
        except ValueError as exc:
            raise _board_error(exc) from exc

    @router.get("/projects/{project_id}/canvases/{canvas_id}")
    def get_canvas_board(project_id: str, canvas_id: str):
        from ..persistence.canvas_service import CanvasService
        try:
            return CanvasService(store).get_board(project_id, canvas_id)
        except ValueError as exc:
            raise _board_error(exc) from exc

    @router.put("/projects/{project_id}/canvases/{canvas_id}")
    def save_canvas_board(project_id: str, canvas_id: str, body: CanvasSaveRequest):
        from ..persistence.canvas_service import CanvasConflictError, CanvasService
        try:
            return CanvasService(store).save(
                project_id, canvas_id=canvas_id, expected_revision=body.expected_revision,
                objects=[item.model_dump() for item in body.objects],
                connectors=[item.model_dump() for item in body.connectors],
                actor=_principal_id(body.actor))
        except (CanvasConflictError, ValueError) as exc:
            raise _board_error(exc) from exc

    @router.patch("/projects/{project_id}/canvases/{canvas_id}")
    def update_canvas_board(project_id: str, canvas_id: str, body: CanvasBoardUpdateRequest):
        from ..persistence import hermes_curation_provider
        from ..persistence.canvas_service import CanvasService
        fields = body.model_dump(exclude_unset=True)
        fields.pop("actor", None)
        catalogue = hermes_curation_provider.list_hermes_models() if fields.get("model") else None
        if "name" in fields and fields["name"] is None:
            raise HTTPException(422, "board name cannot be cleared")
        if "status" in fields and fields["status"] is None:
            raise HTTPException(422, "board status cannot be cleared")
        try:
            return CanvasService(store).update_board(
                project_id, canvas_id, actor=_principal_id(body.actor), catalogue=catalogue, **fields)
        except ValueError as exc:
            raise _board_error(exc) from exc

    @router.post("/projects/{project_id}/canvases/{canvas_id}/sessions")
    def start_canvas_board_session(project_id: str, canvas_id: str, body: CanvasSessionStartRequest):
        from ..persistence.canvas_planning import CanvasPlanningService
        from ..persistence.canvas_service import CanvasConflictError, CanvasService
        try:
            board = CanvasService(store).get_board(project_id, canvas_id)
            return CanvasPlanningService(store, provider=_canvas_provider(board.get("model"))).start(
                project_id, canvas_id=canvas_id, actor=_principal_id(body.actor), message=body.message)
        except (CanvasConflictError, ValueError) as exc:
            raise _board_error(exc) from exc

    @router.delete("/projects/{project_id}/canvases/{canvas_id}/objects/{object_id}")
    def remove_canvas_board_object(project_id: str, canvas_id: str, object_id: str,
                                   expected_revision: int, actor: str = "system"):
        """Board-scoped delete: never falls back to "the most recent board"."""
        from ..persistence.canvas_service import CanvasConflictError, CanvasService
        try:
            CanvasService(store).get_board(project_id, canvas_id)
        except ValueError as exc:
            raise _board_error(exc) from exc
        try:
            return CanvasService(store).remove_object(
                project_id, object_id, expected_revision=expected_revision,
                actor=_principal_id(actor), canvas_id=canvas_id)
        except CanvasConflictError as exc:
            raise _board_error(exc) from exc
        except ValueError as exc:
            raise HTTPException(422, str(exc)) from exc

    @router.post("/projects/{project_id}/canvases/{canvas_id}/curate")
    def curate_canvas_board(project_id: str, canvas_id: str):
        """Read-only review of one board (no provider, no writes)."""
        from ..persistence.canvas_curation import CanvasCurationService
        from ..persistence.canvas_service import CanvasService
        try:
            board = CanvasService(store).get_board(project_id, canvas_id)
        except ValueError as exc:
            raise _board_error(exc) from exc
        return CanvasCurationService().curate(board)

    @router.patch("/projects/{project_id}/plans/{plan_id}")
    def update_canvas_plan_steps(project_id: str, plan_id: str, body: CanvasPlanStepsRequest):
        from ..persistence.canvas_plan_document import PlanDocumentService
        from ..persistence.canvas_service import CanvasConflictError
        try:
            return PlanDocumentService(store).update_steps(
                project_id, plan_id, steps=body.steps, actor=_principal_id(body.actor))
        except CanvasConflictError as exc:
            raise _board_error(exc) from exc
        except ValueError as exc:
            if str(exc).startswith("unknown canvas plan"):
                raise HTTPException(404, str(exc)) from exc
            raise HTTPException(422, str(exc)) from exc

    @router.get("/projects/{project_id}/canvases/{canvas_id}/plans")
    def list_canvas_board_plans(project_id: str, canvas_id: str):
        from ..persistence.canvas_plan_document import PlanDocumentService
        from ..persistence.canvas_service import CanvasService
        try:
            CanvasService(store).get_board(project_id, canvas_id)
        except ValueError as exc:
            raise _board_error(exc) from exc
        return {"plans": PlanDocumentService(store).list_plans(project_id, canvas_id=canvas_id)}

    @router.post("/projects/{project_id}/canvas/curate")
    def curate_project_canvas(project_id: str):
        from ..persistence.canvas_curation import CanvasCurationService
        from ..persistence.canvas_service import CanvasService
        canvas = CanvasService(store).get(project_id)
        return CanvasCurationService().curate(canvas)

    @router.post("/projects/{project_id}/canvas/sessions")
    def start_canvas_session(project_id: str, body: CanvasSessionStartRequest):
        from ..persistence.canvas_planning import CanvasPlanningService
        from ..persistence.canvas_service import CanvasConflictError
        provider = _canvas_provider()
        try:
            return CanvasPlanningService(store, provider=provider).start(
                project_id, actor=_principal_id(body.actor), message=body.message)
        except CanvasConflictError as exc:
            raise _board_error(exc) from exc
        except ValueError as exc:
            message = str(exc)
            if "unknown" in message:
                raise HTTPException(404, message) from exc
            raise HTTPException(422, message) from exc

    @router.get("/canvas/sessions/{session_id}")
    def get_canvas_session(session_id: str):
        from ..persistence.canvas_planning import CanvasPlanningService
        try:
            return CanvasPlanningService(store).get(session_id)
        except ValueError as exc:
            raise HTTPException(404, str(exc)) from exc

    @router.post("/canvas/sessions/{session_id}/answer")
    def answer_canvas_session(session_id: str, body: CanvasSessionAnswerRequest):
        from ..persistence.canvas_planning import CanvasPlanningService
        from ..persistence.canvas_service import CanvasConflictError
        try:
            # The board's chosen model answers its own chat (D19); a legacy
            # session with no board, or a board with no choice, uses the default.
            row = store._conn.execute(
                "SELECT c.model_json FROM canvas_sessions s LEFT JOIN project_canvases c ON c.canvas_id = s.canvas_id "
                "WHERE s.session_id=?", (session_id,)).fetchone()
            board_model = json.loads(row[0]) if row and row[0] else None
            return CanvasPlanningService(store, provider=_canvas_provider(board_model)).answer(session_id, outcome=body.outcome, answer=body.answer, actor=_principal_id(body.actor))
        except CanvasConflictError as exc:
            raise _board_error(exc) from exc
        except ValueError as exc:
            raise HTTPException(422, str(exc)) from exc

    @router.post("/canvas/proposals/{proposal_id}/decision")
    def decide_canvas_proposal(proposal_id: str, body: CanvasProposalDecisionRequest, request: Request):
        from ..persistence.canvas_service import CanvasConflictError
        from ..persistence.canvas_planning import CanvasPlanningService
        # Approving or dismissing a proposal is a decision: trusted callers
        # only, checked before anything is looked up (Sahil 04/10/2026).
        actor = _decision_actor(request)
        try:
            return CanvasPlanningService(store).decide(proposal_id, approve=body.approve, actor=actor,
                                                       project_id=body.project_id)
        except CanvasConflictError as exc:
            raise _board_error(exc) from exc
        except ValueError as exc:
            message = str(exc)
            if "unknown" in message:
                raise HTTPException(404, message) from exc
            raise HTTPException(422, message) from exc

    @router.post("/canvas/proposals/{proposal_id}/plan")
    def synthesise_canvas_plan(proposal_id: str, body: CanvasPlanSynthesisRequest):
        from ..persistence.canvas_service import CanvasConflictError
        from ..persistence.canvas_plan_document import PlanDocumentService
        # D16: the plan is written by the model chosen on the proposal's own
        # board (the default when none was chosen), never a different board's.
        row = store._conn.execute(
            "SELECT c.model_json FROM canvas_proposals p LEFT JOIN project_canvases c ON c.canvas_id = p.canvas_id "
            "WHERE p.proposal_id=? AND p.project_id=?", (proposal_id, body.project_id)).fetchone()
        board_model = json.loads(row[0]) if row and row[0] else None
        provider = _canvas_provider(board_model)
        try:
            return PlanDocumentService(store, provider=provider).synthesise_plan(
                body.project_id, proposal_id=proposal_id, actor=_principal_id(body.actor))
        except CanvasConflictError as exc:
            raise _board_error(exc) from exc
        except ValueError as exc:
            message = str(exc)
            if "unknown" in message:
                raise HTTPException(404, message) from exc
            raise HTTPException(422, message) from exc

    @router.get("/projects/{project_id}/plans")
    def list_canvas_plans(project_id: str):
        from ..persistence.canvas_plan_document import PlanDocumentService
        return {"plans": PlanDocumentService(store).list_plans(project_id)}

    @router.get("/projects/{project_id}/plans/{plan_id}")
    def get_canvas_plan(project_id: str, plan_id: str):
        from ..persistence.canvas_plan_document import PlanDocumentService
        try:
            return PlanDocumentService(store).get_plan(project_id, plan_id)
        except ValueError as exc:
            raise HTTPException(404, str(exc)) from exc

    @router.post("/projects/{project_id}/plans/{plan_id}/document")
    def build_canvas_plan_document(project_id: str, plan_id: str):
        """Preview the implementation document without persisting it."""
        from ..persistence.canvas_plan_document import PlanDocumentService
        try:
            return {"plan_id": plan_id, "markdown": PlanDocumentService(store).build_implementation_document(project_id, plan_id)}
        except ValueError as exc:
            message = str(exc)
            if "unknown" in message:
                raise HTTPException(404, message) from exc
            raise HTTPException(422, message) from exc

    @router.post("/projects/{project_id}/plans/{plan_id}/document/save")
    def save_canvas_plan_document(project_id: str, plan_id: str, body: CanvasPlanDocumentRequest):
        from ..persistence.canvas_service import CanvasConflictError
        """D-P2: persist the implementation document into the project's
        Content tab (Markdown)."""
        from ..persistence.canvas_plan_document import PlanDocumentService
        service = PlanDocumentService(store)
        try:
            service.save_implementation_document(
                project_id, plan_id, service.build_implementation_document(project_id, plan_id),
                actor=_principal_id(body.actor))
        except CanvasConflictError as exc:
            raise _board_error(exc) from exc
        except ValueError as exc:
            message = str(exc)
            if "unknown" in message:
                raise HTTPException(404, message) from exc
            raise HTTPException(422, message) from exc
        return service.get_plan(project_id, plan_id)

    @router.get("/projects/{project_id}/plans/{plan_id}/document")
    def fetch_canvas_plan_document(project_id: str, plan_id: str):
        from ..persistence.canvas_plan_document import PlanDocumentService
        try:
            return PlanDocumentService(store).get_implementation_document(project_id, plan_id)
        except ValueError as exc:
            message = str(exc)
            if "unknown" in message:
                raise HTTPException(404, message) from exc
            raise HTTPException(422, message) from exc

    @router.post("/projects/{project_id}/plans/{plan_id}/backlog")
    def create_backlog_from_plan(project_id: str, plan_id: str, body: CanvasPlanBacklogRequest):
        from ..persistence.canvas_service import CanvasConflictError
        from ..persistence.canvas_plan_document import PlanConflictError, PlanDocumentService
        try:
            return PlanDocumentService(store).create_backlog_items(
                project_id, plan_id, step_orders=body.step_orders,
                actor=_principal_id(body.actor), work=work,
                goal_id=body.goal_id,
                place_task_goal=lambda pid, ref, gid, actor: _ladder.set_task_goal(
                    pid, ref, gid, actor=actor, interface="plan"))
        except PlanConflictError as exc:
            raise HTTPException(409, str(exc)) from exc
        except CanvasConflictError as exc:
            raise _board_error(exc) from exc
        except ValueError as exc:
            message = str(exc)
            if "unknown" in message:
                raise HTTPException(404, message) from exc
            raise HTTPException(422, message) from exc

    @router.get("/projects/{project_id}/content")
    def project_content(
        project_id: str, include_archived: bool = False,
        include_removed: bool = False,
    ):
        return {"content": svc.project_content(
            project_id, include_archived=include_archived,
            include_removed=include_removed,
        )}

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
            actor=_principal_id(body.actor),
            interface=body.interface,
        )

    @router.get("/projects/{project_id}/content/{content_id}/preview")
    def project_content_preview(project_id: str, content_id: str):
        return svc.project_content_preview(project_id, content_id)

    @router.get("/projects/{project_id}/content/{content_id}/image")
    def project_content_image(project_id: str, content_id: str):
        try:
            return svc.project_content_image(project_id, content_id)
        except ServiceError as exc:
            message = str(exc)
            raise HTTPException(404 if "unknown" in message else 422, message) from exc

    @router.get("/projects/{project_id}/content/{content_id}/dependencies")
    def project_content_dependencies(project_id: str, content_id: str):
        return {"dependencies": svc.project_content_dependencies(project_id, content_id)}

    @router.post("/projects/{project_id}/content/{content_id}/archive")
    def archive_project_content(project_id: str, content_id: str):
        principal = _membership_authority("managed_file_removal")
        try:
            return svc.archive_project_content(
                project_id, content_id, actor=principal, interface="rpc"
            )
        except ServiceError as exc:
            raise HTTPException(409, str(exc)) from None

    @router.post("/projects/{project_id}/content/{content_id}/restore")
    def restore_project_content(project_id: str, content_id: str):
        principal = _membership_authority("managed_file_removal")
        try:
            return svc.restore_project_content(
                project_id, content_id, actor=principal, interface="rpc"
            )
        except ServiceError as exc:
            raise HTTPException(409, str(exc)) from None

    @router.delete("/projects/{project_id}/content/{content_id}")
    def remove_project_content(project_id: str, content_id: str):
        principal = _membership_authority("managed_file_removal")
        try:
            return svc.remove_project_content(
                project_id, content_id, actor=principal, interface="rpc"
            )
        except ServiceError as exc:
            raise HTTPException(409, str(exc)) from None

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

    @router.get("/initiatives/{ref}/decision")
    def decision(ref: str):
        return svc.decision(ref)

    @router.get("/initiatives/{ref}/decision/receipts")
    def decision_receipts(ref: str):
        return {"receipts": svc.decision_receipts(ref)}

    def _decision_actor(request: Request) -> str:
        """Owner decision 03/10/2026 (Q2, Rule 5): only a trusted caller decides.

        Trusted means the bearer principal (STEWARD_RPC_TOKEN or the dashboard
        session token), or the in-process Desktop proxy vouching for the user
        Hermes already authenticated. An actor named in the request body is
        attribution from an unverified caller: it is never accepted, so with
        neither of the above the decision is refused and nothing is recorded.
        """
        actor = current_principal() or desktop_proxy_actor(request)
        if not actor:
            raise HTTPException(403, {
                "code": "trusted_principal_required",
                "message": (
                    "decisions need a trusted caller: the Desktop app, or a"
                    " backend started with STEWARD_RPC_TOKEN. An actor named"
                    " in the request is attribution only, never authority."
                ),
            })
        return actor

    @router.post("/initiatives/{ref}/approve")
    def approve(ref: str, body: ApprovalAction, request: Request):
        actor_id = _decision_actor(request)
        try:
            return integration.approve(
                ref,
                actor=Actor(
                    id=actor_id,
                    display_name=actor_id,
                    kind=ActorKind.HUMAN,
                ),
                expected_fingerprint=body.expected_fingerprint,
                note=body.note,
                assignee=body.assignee,
            )
        except (IntegrationError, ServiceError) as exc:
            raise HTTPException(409, str(exc)) from None

    @router.post("/initiatives/{ref}/reject")
    def reject(ref: str, body: ApprovalAction, request: Request):
        actor_id = _decision_actor(request)
        try:
            return svc.reject_initiative(
                ref, actor=actor_id, interface=body.interface,
                expected_fingerprint=body.expected_fingerprint,
                reason=body.reason or "rejected via API",
                note=body.note,
            )
        except ServiceError as exc:
            raise HTTPException(409, str(exc)) from None

    @router.post("/initiatives/{ref}/request-changes")
    def request_changes(ref: str, body: RequestChangesAction, request: Request):
        actor_id = _decision_actor(request)
        try:
            return svc.request_changes_initiative(
                ref, actor=actor_id, interface=body.interface,
                expected_fingerprint=body.expected_fingerprint,
                feedback=body.feedback, note=body.note,
            )
        except ServiceError as exc:
            raise HTTPException(409, str(exc)) from None

    @router.post("/initiatives/{ref}/resubmit")
    def resubmit(ref: str, body: ResubmitAction):
        try:
            return svc.resubmit_initiative(
                ref, actor=_principal_id(body.actor), interface=body.interface,
                rationale=body.rationale, expected_outcome=body.expected_outcome,
                risk=body.risk, note=body.note,
            )
        except ServiceError as exc:
            raise HTTPException(409, str(exc)) from None

    @router.post("/initiatives/{ref}/withdraw")
    def withdraw(ref: str, body: WithdrawAction, request: Request):
        # Withdrawing takes an item out of the owner's approval queue, so it
        # needs the same trusted caller as the decisions it pre-empts (Q2).
        actor_id = _decision_actor(request)
        try:
            return svc.withdraw_initiative(
                ref, actor=actor_id, interface=body.interface, reason=body.reason)
        except ServiceError as exc:
            raise HTTPException(
                404 if str(exc).startswith("no such initiative") else 409, str(exc)
            ) from None

    @router.get("/initiatives/{ref}/comments")
    def comments(ref: str):
        return {"comments": svc.initiative_comments(ref)}

    @router.post("/initiatives/{ref}/comments")
    def add_comment(ref: str, body: InitiativeCommentAction):
        actor_id = principal_bound() or body.actor
        if not actor_id:
            raise HTTPException(409, "trusted actor attribution is required")
        try:
            return svc.add_initiative_comment(
                ref, actor=actor_id, interface=body.interface, body=body.body)
        except ServiceError as exc:
            raise HTTPException(409, str(exc)) from None

    @router.post("/initiatives/{ref}/bind-board")
    def bind_board(ref: str, body: BindBoardRequest):
        try:
            return integration.bind(
                ref, board_slug=body.board_slug, assignee=body.assignee,
                actor=_actor(body.actor_id, "human"))
        except (IntegrationError, ServiceError) as e:
            raise HTTPException(409, str(e))

    @router.post("/initiatives/{ref}/complete")
    def complete(ref: str, body: CompleteRequest, request: Request):
        # D-L3: a person confirms an initiative as delivered, and only when
        # every milestone is reached. The old board-driven completion is gone;
        # this route now goes through the ladder rule. It refuses (403) without
        # a trusted caller and (409) naming confirm-delivered unless the
        # initiative is ready, so no path completes behind the rule. The legacy
        # engine_status/observation_status contract is preserved by merging the
        # post-confirm work-sync result into the response.
        principal = _decision_actor(request)
        ini = svc.initiative_by_ref(ref)
        try:
            confirmed = _ladder.confirm_delivered(
                ini["project_id"], ref, actor=principal, interface="rpc",
                after_confirm=lambda r: _post_confirm(integration, r))
            return {**confirmed,
                    "engine_status": confirmed.get("status"),
                    "observation_status": "pending"}
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

    @router.post("/projects/{project_id}/reconcile")
    def reconcile(project_id: str, body: ReconcileRequest):
        """Bounded reconciliation pass (manual / native-cron).

        Gated by the per-project `reconciliation` feature (default OFF).
        The caller's trigger type passes through unchanged: 'cron' stays
        'cron', so a paused project's manual-only gate still refuses it.
        """
        svc.require_feature(project_id, "reconciliation")
        recovery = ReconcileService(
            store, adapter, engine=engine, service=svc,
        )
        try:
            return recovery.reconcile(
                project_id,
                actor=body.actor,
                interface=body.interface,
                trigger_type=body.trigger_type,
            )
        except (IntegrationError, CycleRefused) as exc:
            raise HTTPException(409, str(exc)) from None

    @router.post("/gateway/command")
    def gateway_command(body: GatewayCommandBody, request: Request):
        # R-M3 (3b): the sender maps to stored gateway_permissions rows —
        # the highest-value spoof. Bind to the trusted caller (bearer
        # principal or Desktop proxy user); refuse when neither is bound.
        # Nothing in-repo calls this endpoint unauthenticated (verified:
        # grep across tests/ and src/). A body sender_id is attribution
        # for the messaging platform identity, never the authority.
        sender_id = current_principal() or acting_actor()
        if not sender_id:
            raise HTTPException(403, {
                "code": "trusted_principal_required",
                "message": (
                    "gateway commands need a trusted caller: the Desktop"
                    " app, or a backend started with STEWARD_RPC_TOKEN. A"
                    " sender_id in the request names the messaging user;"
                    " it is never the authority."
                ),
            })
        req = CommandRequest(
            platform=body.platform,
            sender_id=sender_id,
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
    def events(
        project_id: str,
        limit: int = Query(50, ge=1, le=500),
        event_type: Optional[str] = None,
    ):
        return {"events": bus.recent(project_id=project_id, limit=limit,
                                     event_type=event_type)}

    @router.get("/projects/{project_id}/notifications")
    def notifications(project_id: str):
        from ..events.notifications import NotificationEngine

        svc.require_feature(project_id, "notifications")
        ne = NotificationEngine(store, svc)
        return {"unacked": ne.unacked(project_id),
                "queued": ne.pending_delivery(project_id)}


    # ------------------- Project Stewardship work management (G1) ----------------- #

    def principal_bound() -> Optional[str]:
        """The acting identity for THIS request: trusted callers only.

        Owner decision 03/10/2026 (Q2, Rule 5) and the 3b wave (R-M1/M2):
        the bearer principal when one authenticated, else the Desktop proxy's
        vouched user (the live Desktop app's identity). Anything a caller
        sends in a body/query field is attribution only, never authority.
        """
        return current_principal() or acting_actor()

    def _principal_id(candidate: str) -> str:
        return principal_bound() or candidate

    def _actor(actor_id: str, actor_kind: str) -> Actor:
        from ..dockyard import Actor as _Actor, ActorKind as _ActorKind

        bound = principal_bound()
        bound_id = bound or actor_id
        # Proxy-vouched users are real humans; bearer principals were
        # already recorded human before this wave. Unbound open mode keeps
        # the caller-declared kind (documented dev-only behavior).
        bound_kind = "human" if bound else actor_kind
        return _Actor(id=bound_id, display_name=bound_id,
                      kind=_ActorKind(bound_kind))

    def _view_actor(actor_id: str, actor_kind: str) -> Actor:
        """Saved views act as the trusted caller when one is bound (R-M2): a
        query actor never outranks it. Open dev mode has no trusted caller,
        so there the query must name the actor."""
        if not actor_id and not principal_bound():
            raise HTTPException(
                422, "actor_id is required when no trusted caller is bound")
        try:
            return _actor(actor_id, actor_kind)
        except ValueError:
            raise HTTPException(422, f"invalid actor_kind {actor_kind!r}")

    def _target_actor(actor_id: str, actor_kind: str) -> Actor:
        """An action TARGET (e.g. a new item's assignee) is named by the
        caller, not the authenticated principal. Binding targets to the
        principal made human-authed backlog creation impossible (creator and
        assignee collapsed to the same id -> 422). Only the ACTOR is bound."""
        from ..dockyard import Actor as _Actor, ActorKind as _ActorKind

        return _Actor(id=actor_id, display_name=actor_id,
                      kind=_ActorKind(actor_kind))

    _FINISHED_STATUSES = {"done", "complete", "completed", "archived"}

    def _tell_assignment(project_id: str, item: Dict[str, Any], *, before: Optional[str],
                         actor_id: str, new: bool = False) -> None:
        """Sahil 04/10 (demo feedback b): open unassigned work is never picked
        up by a bot. Say so when an item starts unassigned or loses its
        assignee, and stop saying so when it is assigned. The change itself
        already happened, so a failure here is logged, never raised."""
        from ..events.bus import WORK_ASSIGNED, WORK_UNASSIGNED

        ref, after = item.get("ref"), item.get("assignee") or None
        if not ref:
            return
        try:
            if after and not before and not new:
                bus.emit(WORK_ASSIGNED, project_id=project_id, subject=ref,
                         payload={"to": after}, emitted_by=actor_id)
            elif (not after and (new or before)
                  and (item.get("type") or "task") != "epic"
                  and item.get("status") not in _FINISHED_STATUSES):
                bus.emit(WORK_UNASSIGNED, project_id=project_id, subject=ref,
                         payload={"title": item.get("title") or ""}, emitted_by=actor_id)
        except Exception:
            logging.getLogger(__name__).exception(
                "could not record the assignment change of %s", ref)

    def _raise_work_error(exc: Exception) -> NoReturn:
        if isinstance(exc, CanonicalWorkPartialError):
            raise HTTPException(
                409,
                f"canonical work {exc.item_ref} exists; ranking is incomplete",
            ) from None
        if isinstance(exc, KanbanAdapterError):
            raise HTTPException(
                _kanban_error_status(exc.code),
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

    @router.get("/projects/{project_id}/work-dependencies")
    def work_dependencies(project_id: str):
        # Read-only: what blocks each item and what it blocks (Kanban chips).
        try:
            return {"dependencies": work.dependency_map(project_id)}
        except Exception as exc:
            _raise_work_error(exc)

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
            actor = _actor(body.actor_id, body.actor_kind)
            before = (work.get(project_id, ref) or {}).get("assignee")
            item = work.assign_item(project_id, ref, body.assignee_id, actor=actor)
        except Exception as exc:
            _raise_work_error(exc)
        _tell_assignment(project_id, item, before=before, actor_id=actor.id)
        return item

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

    @router.get("/projects/{project_id}/backlog/import-template")
    def backlog_import_template(project_id: str):
        return {"csv": dy.backlog_csv_template(), "columns": list(dy.CSV_COLUMNS),
                "column_metadata": list(dy.CSV_COLUMN_METADATA)}

    @router.post("/projects/{project_id}/backlog/import")
    def backlog_import(project_id: str, body: BacklogCsvImport):
        try:
            actor = _actor(body.actor_id, body.actor_kind)
            if body.apply:
                return dy.import_csv(project_id, body.csv_text, actor=actor)
            return {"imported": 0, "failed": 0,
                    "preview": dy.preview_csv_import(project_id, body.csv_text)}
        except Exception as exc:
            _raise_work_error(exc)

    @router.post("/projects/{project_id}/backlog/items")
    def create_queued_work_item(project_id: str,
                                body: QueuedWorkItemCreate):
        try:
            creator = _actor(body.creator_id, body.creator_kind)
            item, entry = work.create_queued_item(
                project_id,
                title=body.title,
                body=body.body,
                labels=body.labels,
                evidence_refs=body.evidence_refs,
                item_type=body.type,
                creator=creator,
                assignee=(_target_actor(body.assignee_id.strip(), body.assignee_kind)
                          if body.assignee_id and body.assignee_id.strip() else None),
                rank=body.rank,
                reason=body.reason,
                initiative_ref=body.initiative_ref,
                parent_ref=body.parent_ref,
                estimate_days=body.estimate_days,
                due=body.due,
                idempotency_key=body.idempotency_key,
            )
        except Exception as exc:
            _raise_work_error(exc)
        _tell_assignment(project_id, item, before=None, new=True, actor_id=creator.id)
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
    def milestone_list(project_id: str, include_archived: bool = False):
        svc.require_feature(project_id, "milestones")
        if store._conn.execute(
            "SELECT 1 FROM project_stewardship WHERE project_id=?",
                (project_id,)).fetchone() is None:
            raise HTTPException(404, f"project {project_id} not found")
        return {"milestones": dy.milestone_list(
            project_id, include_archived=include_archived
        )}

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

    @router.post("/projects/{project_id}/milestones/{name}/rename")
    def milestone_rename(project_id: str, name: str, body: MilestoneRename):
        try:
            svc.require_feature(project_id, "milestones")
            dy.milestone_rename(project_id, name, body.new_name,
                                actor=_actor(body.actor_id, body.actor_kind))
        except ValueError as e:
            raise HTTPException(404 if "not found" in str(e) else 409, str(e))
        except Exception as e:
            raise HTTPException(409, str(e))
        return {"renamed": name, "new_name": body.new_name}

    @router.post("/projects/{project_id}/milestones/{name}/archive")
    def milestone_archive(project_id: str, name: str):
        principal = _membership_authority("project_archive")
        try:
            svc.require_feature(project_id, "milestones")
            return dy.milestone_archive(
                project_id, name, actor=_actor(principal, "human")
            )
        except ValueError as exc:
            raise HTTPException(404 if "not found" in str(exc) else 409, str(exc)) from None

    @router.post("/projects/{project_id}/milestones/{name}/restore")
    def milestone_restore(project_id: str, name: str):
        principal = _membership_authority("project_archive")
        try:
            svc.require_feature(project_id, "milestones")
            return dy.milestone_restore(
                project_id, name, actor=_actor(principal, "human")
            )
        except ValueError as exc:
            raise HTTPException(404 if "not found" in str(exc) else 409, str(exc)) from None

    @router.delete("/projects/{project_id}/milestones/{name}")
    def milestone_delete(project_id: str, name: str):
        # Design round f, Option B: same trust as archive; archived only.
        principal = _membership_authority("project_archive")
        try:
            svc.require_feature(project_id, "milestones")
            return dy.milestone_delete(
                project_id, name, actor=_actor(principal, "human")
            )
        except ValueError as exc:
            # Match the not-found message by its ending: a milestone's own
            # name may contain the words "not found".
            raise HTTPException(404 if str(exc).endswith(" not found") else 409, str(exc)) from None

    @router.post("/projects/{project_id}/milestones/{name}/detach")
    def milestone_detach(project_id: str, name: str, body: MilestoneAttach):
        try:
            svc.require_feature(project_id, "milestones")
            dy.milestone_detach(project_id, name, body.ref,
                                actor=_actor(body.actor_id, body.actor_kind))
        except ValueError as e:
            raise HTTPException(404, str(e))
        except Exception as e:
            raise HTTPException(409, str(e))
        return {"name": name, "detached": body.ref}

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
    def views_list(project_id: str, request: Request, actor_id: str = "",
                   actor_kind: str = "human"):
        """List the saved views the acting user may see (see _view_actor)."""
        svc.require_feature(project_id, "saved_views")
        actor = _view_actor(actor_id, actor_kind)
        return {"views": dy.views_list(project_id, actor=actor)}

    @router.get("/projects/{project_id}/views/{name}/items")
    def view_run(project_id: str, name: str, request: Request,
                 actor_id: str = "", actor_kind: str = "human"):
        """Run a saved view's query; returns matching work items."""
        svc.require_feature(project_id, "saved_views")
        actor = _view_actor(actor_id, actor_kind)
        return {"items": dy.view_items(project_id, name, actor=actor)}

    @router.delete("/projects/{project_id}/views/{name}")
    def view_delete(project_id: str, name: str, request: Request,
                    actor_id: str = "", actor_kind: str = "human"):
        """Delete a saved view; only its owner may delete it.

        Error envelope: unknown/not-visible views map to 404 via the app
        ServiceError handler; views owned by another actor map to 409.
        The acting user is the trusted caller when one is bound (R-M2)."""
        svc.require_feature(project_id, "saved_views")
        actor = _view_actor(actor_id, actor_kind)
        return dy.view_delete(project_id, name, actor=actor)

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
    def reports_list(project_id: str, limit: int = Query(20, ge=1, le=500)):
        return {"reports": dy.reports_list(project_id, limit=limit)}

    @router.get("/projects/{project_id}/reports/{report_id}")
    def report_get(project_id: str, report_id: str):
        try:
            return dy.report_get(project_id, report_id)
        except ValueError as exc:
            raise HTTPException(404, str(exc))


    # ------------------- Project Stewardship bot layer (G2) ---------------------- #

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
            {"id": g.id, "name": g.name, "purpose": g.purpose,
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
    def a2a_feed(name: str, limit: int = Query(50, ge=1, le=500)):
        try:
            feed = dy.a2a_feed(name, limit=limit)
        except Exception as e:
            raise HTTPException(404, str(e))
        return {"group": name, "messages": feed}


    # ------------------- Project Stewardship product polish (G4) ------------------ #

    @router.get("/inbox")
    def approval_inbox():
        # Cross-project inbox: fail closed only if every enabled project has
        # the inbox feature off; otherwise filter per project below.
        return dy.approval_inbox()

    @router.get("/dashboard")
    def dashboard():
        return dy.dashboard()

    @router.get("/portfolio")
    def portfolio():
        """Cross-project rollup: attention, per-project standing, mix."""
        return dy.portfolio()

    @router.get("/search")
    def fleet_search(q: str, limit: int = 30):
        """Search project, work and initiative titles across the fleet."""
        try:
            return dy.fleet_search(q, limit=limit)
        except (ValueError, TypeError) as exc:
            raise HTTPException(422, str(exc)) from None

    @router.get("/notifications")
    def fleet_notifications(
        state: Optional[str] = None,
        kind: Optional[str] = None,
        severity: Optional[str] = None,
        project_id: Optional[str] = None,
        before_id: Optional[int] = None,
        limit: int = Query(100, ge=1, le=500),
    ):
        # Batch E4: filtered, paged feed + counts for the filter chips.
        # keeps the legacy no-filter shape ("notifications" list) as default.
        ne = notification_engine
        items = ne.list_notifications(
            project_id=project_id, state=state, kind=kind, severity=severity,
            before_id=before_id, limit=limit)
        out = {"notifications": items, "counts": ne.counts(
            project_id=project_id)}
        if before_id is not None and items:
            out["next_before_id"] = items[-1]["id"]
        return out

    @router.post("/notifications/{notification_id}/ack")
    def ack_notification(notification_id: int, body: dict | None = None):
        # Batch E2: one service-side path; records the actor, audited,
        # idempotent (second ack / ack-after-resolve change nothing).
        actor = _principal_id((body or {}).get("actor_id") or "unknown")
        try:
            acked = notification_engine.ack(notification_id, actor=actor)
        except LookupError as e:
            raise HTTPException(404, str(e))
        return {"acked": notification_id, "changed": acked}

    # ------------------- Batch E: resolution + pop-ups + settings ------ #

    @router.post("/notifications/{notification_id}/resolve")
    def resolve_notification(notification_id: int, body: dict | None = None):
        payload = body or {}
        note = str(payload.get("note") or "")
        if len(note) > 2000:
            raise HTTPException(422, "note must be at most 2000 characters")
        actor = _principal_id(payload.get("actor_id") or "unknown")
        try:
            changed = notification_engine.resolve(
                notification_id, actor=actor, resolution="manual", note=note)
        except LookupError as e:
            raise HTTPException(404, str(e))
        return {"resolved": notification_id, "changed": changed}

    @router.post("/notifications/ack-all")
    def ack_all(body: dict | None = None):
        payload = body or {}
        project_id = payload.get("project_id") or None
        kind = payload.get("kind") or None
        severity = payload.get("severity") or None
        if payload.get("resolve"):
            raise HTTPException(
                422, "bulk resolve is not supported; resolve items individually")
        actor = _principal_id(payload.get("actor_id") or "unknown")
        n = notification_engine.ack_matching(
            project_id=project_id, kind=kind, severity=severity, actor=actor)
        return {"acked": n}

    @router.get("/notifications/popups")
    def list_popups():
        return notification_engine.popups()

    @router.post("/notifications/popups/shown")
    def popups_shown(body: dict):
        ids = body.get("ids")
        if not isinstance(ids, list) or not all(
                isinstance(i, int) for i in ids):
            raise HTTPException(422, "ids must be a list of notification ids")
        return {"marked": notification_engine.mark_popups_shown(ids)}

    @router.get("/settings/notifications")
    def get_app_notification_settings():
        return {"policy": notification_engine.app_policy()}

    # The last project chosen in the app (Sahil 02/10): kept in the backend,
    # never in browser storage. null forgets it; unknown projects are 422.
    @router.get("/settings/last-project")
    def get_last_project():
        return {"project_id": svc.last_project()}

    @router.put("/settings/last-project")
    def put_last_project(body: dict):
        if "project_id" not in body:
            raise HTTPException(422, "project_id is required (a project id or null)")
        actor = _principal_id(body.get("actor_id") or "unknown")
        try:
            return {"project_id": svc.set_last_project(body["project_id"], actor=actor)}
        except ServiceError as exc:
            raise HTTPException(422, str(exc)) from None

    @router.put("/settings/notifications")
    def put_app_notification_settings(body: dict):
        policy = body.get("policy")
        actor = _principal_id(body.get("actor_id") or "unknown")
        try:
            return {"policy": notification_engine.set_app_policy(policy, actor=actor)}
        except ServiceError as exc:
            raise HTTPException(422, str(exc)) from None

    # The app's display choices (Sahil 04/10: a folded Dashboard list stays
    # folded): kept in the backend, never in browser storage.
    @router.get("/settings/ui")
    def get_ui_settings():
        return svc.ui_settings()

    @router.put("/settings/ui")
    def put_ui_settings(body: dict):
        actor = _principal_id(body.get("actor_id") or "unknown")
        settings = {key: value for key, value in body.items() if key != "actor_id"}
        try:
            return svc.set_ui_settings(settings, actor=actor)
        except ServiceError as exc:
            raise HTTPException(422, str(exc)) from None

    # Sahil 05/10 (demo feedback h): the app's theme and typeface. Kept in the
    # backend, never in browser storage; the fold setting above is separate.
    @router.get("/settings/appearance")
    def get_appearance():
        return svc.appearance()

    @router.put("/settings/appearance")
    def put_appearance(body: dict):
        actor = _principal_id(body.get("actor_id") or "unknown")
        settings = {key: value for key, value in body.items() if key != "actor_id"}
        try:
            return svc.set_appearance(settings, actor=actor)
        except ServiceError as exc:
            raise HTTPException(422, str(exc)) from None

    @router.get("/settings/notifications/effective")
    def get_effective_notification_settings(project_id: Optional[str] = None):
        try:
            if project_id:
                notification_engine.svc.require_feature(project_id, "notifications")
                effective = notification_engine.effective(project_id)
            else:
                # No project: the app-wide layer alone.
                from ..events.notifications import effective_policy

                effective = effective_policy(
                    notification_engine.app_policy(), None)
        except ServiceError as exc:
            raise HTTPException(404, str(exc)) from None
        # The screen needs the zone quiet hours are evaluated in, and the
        # list of stored keys that were ignored on read (review bug 1).
        from ..events.notifications import normalize_policy

        ignored = set((effective or {}).get("ignored", []))
        try:
            ignored |= set(normalize_policy(
                notification_engine.app_policy()).get("ignored", []))
        except ServiceError:
            pass
        if project_id:
            try:
                override = (
                    notification_engine.svc.settings(project_id).get("policies")
                    or {}).get("notification") or {}
                ignored |= set(normalize_policy(override).get("ignored", []))
            except ServiceError:
                pass
        ignored = sorted(ignored)
        effective = dict(effective or {})
        effective["ignored"] = ignored
        effective["timezone"] = notification_engine.zone_name
        return {"effective": effective}

    def _workflow_audience(
        project_id: str,
    ) -> tuple[Optional[list[str]], Optional[list[str]]]:
        """Discovered host profiles + project members for assignment validation.

        Returns ``(None, None)`` when the host cannot enumerate profiles, in
        which case workflow assignment validation falls back to shape checks.
        """
        listed = getattr(adapter, "list_profiles", None)
        known: list[str] = []
        if callable(listed):
            try:
                items = listed()
                if isinstance(items, (list, tuple)):
                    known = [str(item.get("name")) for item in items
                             if isinstance(item, dict) and item.get("name")]
            except Exception:
                known = []
        members: list[str] = []
        try:
            owner = (svc.settings(project_id, include_disabled=True) or {}).get("owner") or {}
            if owner.get("lead_profile"):
                members.append(str(owner["lead_profile"]))
            members.extend(str(profile) for profile in owner.get("member_profiles") or [])
        except Exception:
            members = []
        return (known or None), (members or None)

    @router.get("/workflow-library")
    def list_workflow_library(scope: Optional[str] = None,
                              include_archived: bool = False):
        try:
            return {"workflows": workflow_library.list(
                scope=scope, include_archived=include_archived)}
        except ValueError as exc:
            raise HTTPException(422, str(exc)) from None

    @router.post("/workflow-library")
    def create_workflow_library(body: WorkflowLibraryDefine):
        try:
            return workflow_library.define(
                body.name, body.scope, {"nodes": body.nodes},
                project_id=body.owner_project_id,
                actor=current_principal() or "stewardship-api", interface="rpc")
        except ValueError as exc:
            raise HTTPException(409 if "archived" in str(exc) else 422, str(exc)) from None

    @router.post("/workflow-library/{scope}/{name}/versions")
    def version_workflow_library(scope: str, name: str, body: WorkflowVersionDefine,
                                 owner_project_id: Optional[str] = None):
        try:
            if workflow_library._latest(name, scope, owner_project_id) is None:
                raise ValueError("workflow was not found")
            return workflow_library.define(
                name, scope, {"nodes": body.nodes}, project_id=owner_project_id,
                actor=current_principal() or "stewardship-api", interface="rpc")
        except ValueError as exc:
            raise HTTPException(404 if "not found" in str(exc)
                                else 409 if "archived" in str(exc) else 422, str(exc)) from None

    @router.post("/workflow-library/{scope}/{name}/archive")
    def archive_workflow_library(scope: str, name: str,
                                 owner_project_id: Optional[str] = None):
        principal = _membership_authority("project_archive")
        try:
            return workflow_library.archive(
                name, scope, actor=principal, project_id=owner_project_id,
                interface="rpc")
        except ValueError as exc:
            raise HTTPException(404 if "not found" in str(exc) else 422, str(exc)) from None

    @router.post("/workflow-library/{scope}/{name}/restore")
    def restore_workflow_library(scope: str, name: str,
                                 owner_project_id: Optional[str] = None):
        principal = _membership_authority("project_archive")
        try:
            return workflow_library.archive(
                name, scope, actor=principal, project_id=owner_project_id,
                restore=True, interface="rpc")
        except ValueError as exc:
            raise HTTPException(404 if "not found" in str(exc) else 422, str(exc)) from None

    @router.delete("/workflow-library/{scope}/{name}")
    def delete_workflow_library(scope: str, name: str,
                                owner_project_id: Optional[str] = None):
        principal = _membership_authority("project_archive")
        try:
            return workflow_library.delete(
                name, scope, actor=principal, project_id=owner_project_id,
                interface="rpc")
        except ValueError as exc:
            message = str(exc)
            raise HTTPException(404 if "not found" in message
                                else 409 if "run" in message or "enabled" in message
                                else 422, message) from None

    @router.get("/projects/{project_id}/workflows/available")
    def available_workflow_library(project_id: str):
        try:
            return {"workflows": workflow_library.available(project_id)}
        except ValueError as exc:
            raise HTTPException(404, str(exc)) from None

    @router.put("/projects/{project_id}/workflows/{scope}/{name}/enablement")
    def toggle_workflow_library(project_id: str, scope: str, name: str,
                                body: WorkflowEnablementBody):
        svc.require_feature(project_id, "workflow_canvas")
        try:
            return workflow_library.toggle(
                project_id, name, scope, enabled=body.enabled,
                actor=current_principal() or "stewardship-api", interface="rpc")
        except ValueError as exc:
            raise HTTPException(404 if "not found" in str(exc) else 422, str(exc)) from None

    @router.post("/projects/{project_id}/workflows/{scope}/{name}/start")
    def start_scoped_workflow(project_id: str, scope: str, name: str,
                              body: WorkflowStart):
        svc.require_feature(project_id, "workflow_canvas")
        known, members = _workflow_audience(project_id)
        try:
            return workflow_library.start(
                project_id, name, scope, body.run_key,
                actor=current_principal() or "stewardship-api", interface="rpc",
                known_profiles=known, project_members=members)
        except KanbanAdapterError as exc:
            _raise_work_error(exc)
        except ValueError as exc:
            raise HTTPException(409 if "disabled" in str(exc) or "archived" in str(exc)
                                else 404 if "not found" in str(exc) else 422,
                                str(exc)) from None

    @router.get("/projects/{project_id}/workflows/{scope}/{name}/runs")
    def scoped_workflow_runs(project_id: str, scope: str, name: str):
        svc.require_feature(project_id, "workflow_canvas")
        try:
            return {"runs": workflow_library.runs(project_id, name, scope)}
        except ValueError as exc:
            raise HTTPException(404, str(exc)) from None

    @router.post("/workflow-templates")
    def define_workflow_template(body: WorkflowTemplateDefine):
        try:
            return workflows.define_template(
                body.name, {"nodes": body.nodes}, actor="stewardship-api",
                interface="rpc")
        except ValueError as exc:
            raise HTTPException(422, str(exc)) from None

    @router.get("/workflow-templates")
    def list_workflow_templates():
        return {"templates": workflows.list_templates()}

    @router.post("/projects/{project_id}/workflows/from-template")
    def instantiate_workflow(project_id: str, body: WorkflowInstantiate):
        svc.require_feature(project_id, "workflow_canvas")
        try:
            return workflows.instantiate(
                project_id, body.template, workflow_name=body.name,
                version=body.version, actor="stewardship-api", interface="rpc")
        except ValueError as exc:
            raise HTTPException(404 if "not found" in str(exc) else 422, str(exc)) from None

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

    @router.post("/projects/{project_id}/workflows/{name}/versions")
    def define_workflow_version(
        project_id: str, name: str, body: WorkflowVersionDefine
    ):
        try:
            return workflows.define(project_id, name, {"nodes": body.nodes})
        except ValueError as exc:
            raise HTTPException(409 if "archived" in str(exc) else 422, str(exc)) from None

    @router.get("/projects/{project_id}/workflows")
    def list_workflows(project_id: str, include_archived: bool = False):
        return {"workflows": workflows.list(
            project_id, include_archived=include_archived
        )}

    @router.post("/projects/{project_id}/workflows/{name}/archive")
    def archive_workflow(project_id: str, name: str):
        principal = _membership_authority("project_archive")
        try:
            return workflows.archive(project_id, name, actor=principal, interface="rpc")
        except ValueError as exc:
            raise HTTPException(404, str(exc)) from None

    @router.post("/projects/{project_id}/workflows/{name}/restore")
    def restore_workflow(project_id: str, name: str):
        principal = _membership_authority("project_archive")
        try:
            return workflows.restore(project_id, name, actor=principal, interface="rpc")
        except ValueError as exc:
            raise HTTPException(404, str(exc)) from None

    @router.post("/projects/{project_id}/workflows/{name}/start")
    def start_workflow(project_id: str, name: str, body: WorkflowStart):
        try:
            svc.require_feature(project_id, "workflow_canvas")
            known, members = _workflow_audience(project_id)
            return workflows.start(
                project_id,
                name,
                body.run_key,
                body.version,
                known_profiles=known,
                project_members=members,
            )
        except KanbanAdapterError as exc:
            _raise_work_error(exc)
        except ValueError as exc:
            raise HTTPException(409 if any(word in str(exc) for word in ("archived", "disabled"))
                                else 422, str(exc)) from None

    @router.get("/projects/{project_id}/workflows/{name}/runs")
    def list_workflow_runs(project_id: str, name: str):
        """Read-only run ledger with per-node canonical status (canvas view)."""
        svc.require_feature(project_id, "workflow_canvas")
        try:
            return {"runs": workflows.runs(project_id, name)}
        except ValueError as exc:
            raise HTTPException(404, str(exc)) from None

    @router.get("/projects/{project_id}/workflows/{scope}/{name}/runs/{run_key}/timeline")
    def scoped_workflow_run_timeline(project_id: str, scope: str, name: str, run_key: str):
        svc.require_feature(project_id, "workflow_canvas")
        try:
            return workflow_library.timeline(project_id, name, scope, run_key)
        except ValueError as exc:
            raise HTTPException(404, str(exc)) from None

    @router.get("/projects/{project_id}/workflows/{name}/runs/{run_key}/timeline")
    def workflow_run_timeline(project_id: str, name: str, run_key: str):
        """Ordered canonical node-state history for canvas playback."""
        svc.require_feature(project_id, "workflow_canvas")
        try:
            return workflows.timeline(project_id, name, run_key)
        except ValueError as exc:
            raise HTTPException(404, str(exc)) from None

    @router.get("/projects/{project_id}/workflows/{name}/binding")
    def get_workflow_binding(project_id: str, name: str):
        svc.require_feature(project_id, "workflow_canvas")
        try:
            return workflows.get_binding(project_id, name)
        except ValueError as exc:
            raise HTTPException(404, str(exc)) from None

    @router.put("/projects/{project_id}/workflows/{name}/binding")
    def set_workflow_binding(project_id: str, name: str, body: WorkflowBindingBody):
        svc.require_feature(project_id, "workflow_canvas")
        known, members = _workflow_audience(project_id)
        try:
            return workflows.set_binding(
                project_id, name,
                group_id=body.group_id, overrides=body.overrides,
                actor=current_principal() or "stewardship-api", interface="rpc",
                known_profiles=known, project_members=members)
        except ValueError as exc:
            raise HTTPException(404 if "not found" in str(exc) else 422, str(exc)) from None

    @router.get("/workflows/timer")
    def workflow_timer():
        """Whether runs move on by themselves: the timer's last pass and problems."""
        return workflows.tick_status()

    @router.post("/projects/{project_id}/workflows/{name}/runs/{run_key}/advance")
    def advance_workflow_run(project_id: str, name: str, run_key: str):
        """Move a run on now (Move on now); works while the project is paused."""
        svc.require_feature(project_id, "workflow_canvas")
        try:
            return workflows.advance(project_id, name, run_key)
        except KanbanAdapterError as exc:
            _raise_work_error(exc)
        except ValueError as exc:
            message = str(exc)
            code = (404 if "not found" in message
                    else 409 if any(word in message for word in ("archived", "disabled"))
                    else 422)
            raise HTTPException(code, message) from None

    @router.post("/projects/{project_id}/workflows/{name}/runs/{run_key}/proposals")
    def propose_workflow_revision(
        project_id: str, name: str, run_key: str, body: WorkflowRevisionProposal
    ):
        svc.require_feature(project_id, "workflow_canvas")
        known, members = _workflow_audience(project_id)
        try:
            return workflows.propose_revision(
                project_id, name, run_key,
                {"rationale": body.rationale, "add_nodes": body.add_nodes,
                 "add_edges": body.add_edges},
                # The trusted principal when one is bound; the body field is
                # attribution only (catalog review, PR #136752).
                proposed_by=_principal_id(body.proposed_by),
                known_profiles=known, project_members=members)
        except ValueError as exc:
            raise HTTPException(404 if "not found" in str(exc) else 422, str(exc)) from None

    @router.get("/projects/{project_id}/workflows/{name}/runs/{run_key}/revisions")
    def list_workflow_revisions(project_id: str, name: str, run_key: str):
        svc.require_feature(project_id, "workflow_canvas")
        return {"revisions": workflows.revisions(project_id, name, run_key)}

    @router.post(
        "/projects/{project_id}/workflows/{name}/runs/{run_key}/revisions/"
        "{revision_key}/decide"
    )
    def decide_workflow_revision(
        project_id: str, name: str, run_key: str, revision_key: str,
        body: WorkflowRevisionDecision,
    ):
        svc.require_feature(project_id, "workflow_canvas")
        # Revision decisions are privileged graph mutations.  The request's
        # actor_id is attribution only; authority must come from the bound
        # trusted human principal and its server-composed capability set.
        principal = _membership_authority("workflow_revision_approval")
        try:
            return workflows.decide_revision(
                project_id, name, run_key, revision_key,
                approve=body.approve, actor=principal,
                interface="rpc")
        except ValueError as exc:
            message = str(exc)
            code = 404 if "not found" in message else (409 if "stale" in message else 422)
            raise HTTPException(code, message) from None

    @router.get("/projects/{project_id}/workflows/{name}/export")
    def export_workflow(project_id: str, name: str):
        svc.require_feature(project_id, "workflow_canvas")
        try:
            return workflows.export_definition(project_id, name)
        except ValueError as exc:
            raise HTTPException(404, str(exc)) from None

    @router.post("/projects/{project_id}/workflows/import")
    def import_workflow(project_id: str, body: WorkflowImportBody):
        svc.require_feature(project_id, "workflow_canvas")
        try:
            return workflows.import_definition(
                project_id, body.document, apply=body.apply, as_name=body.as_name,
                actor=current_principal() or "stewardship-api", interface="rpc")
        except ValueError as exc:
            raise HTTPException(422, str(exc)) from None

    def _onboarding_discovery() -> dict[str, Any]:
        """Merge host discovery with explicitly non-selectable historical refs."""
        result = dict(adapter.list_existing_projects())
        referenced: dict[str, set[str]] = {}
        rows = store._conn.execute(
            "SELECT project_id, profile_slug FROM project_members"
            " WHERE state != 'departed' ORDER BY project_id, profile_slug"
        ).fetchall()
        for row in rows:
            referenced.setdefault(str(row["profile_slug"]), set()).add(
                str(row["project_id"])
            )

        profiles: list[dict[str, Any]] = []
        host_names: set[str] = set()
        for profile in result.get("profiles", []):
            item = dict(profile)
            name = str(item.get("name") or "")
            host_names.add(name)
            item.setdefault("available", True)
            item.setdefault("host_capabilities", [])
            if not item["available"] and name in referenced:
                item.update(
                    selectable=False,
                    historical_reference=True,
                    project_ids=sorted(referenced[name]),
                )
            else:
                item.setdefault("selectable", bool(item["available"]))
                item.setdefault("historical_reference", False)
                item.setdefault("project_ids", [])
            profiles.append(item)
        for name in sorted(set(referenced) - host_names):
            profiles.append(
                {
                    "name": name,
                    "available": False,
                    "selectable": False,
                    "historical_reference": True,
                    "project_ids": sorted(referenced[name]),
                    "host_capabilities": [],
                }
            )
        return {**result, "profiles": profiles}

    def _onboarding_fingerprint(body: OnboardingRequest) -> str:
        payload = {
            "project_id": body.project_id.strip(),
            "name": (body.name or body.project_id.replace("-", " ").title()).strip(),
            "slug": (body.slug or body.project_id).strip(),
            "repo_path": body.repo_path.strip(),
            "mission": body.mission.strip(),
            "lead_profile": body.lead_profile.strip(),
            "member_profiles": [str(p).strip() for p in body.member_profiles],
            "board_slug": (body.board_slug or body.slug or body.project_id).strip(),
            "autonomy_level": min(max(body.autonomy_level, 0), 3),
        }
        encoded = json.dumps(payload, sort_keys=True, separators=(",", ":"))
        return hashlib.sha256(encoded.encode()).hexdigest()

    def _preflight_token(body: OnboardingRequest, revision: int) -> str:
        return hashlib.sha256(
            f"{_onboarding_fingerprint(body)}:{revision}".encode()
        ).hexdigest()

    @router.get("/onboard/discover")
    def onboard_discover():
        """P7.1: host-driven discovery for onboarding — existing native
        projects (connect-existing candidates) and valid lead profiles.
        Read-only; no provisioning. The host itself is the source; no
        hard-coded project or profile lists.

        A genuinely missing canonical host fails closed with 503 (proven in
        test_phase7_onboarding). A legacy IN-PROCESS adapter (one that never
        overrides KanbanAdapter.list_existing_projects, e.g. the reference
        adapter in test/embedded compositions) gets the same documented
        fallback the preflight applies: its list_profiles is authoritative
        and the project universe is the store's own enabled projects.
        """
        try:
            return _onboarding_discovery()
        except KanbanAdapterError as exc:
            _raise_work_error(exc)
        except NotImplementedError:
            if type(adapter).list_existing_projects is not KanbanAdapter.list_existing_projects:
                raise HTTPException(
                    503,
                    {"code": "host_unavailable",
                     "message": "canonical project and Kanban host is unavailable"},
                ) from None
            try:
                listed = {str(item.get("name")): dict(item) for item in adapter.list_profiles()}
            except NotImplementedError:
                listed = {}
            profiles = [
                {**item,
                 "available": item.get("available", True),
                 "selectable": item.get("selectable", True),
                 "host_capabilities": item.get("host_capabilities", ["lead", "member"])}
                for item in listed.values()
            ]
            rows = store._conn.execute(
                "SELECT project_id FROM project_stewardship WHERE enabled=1"
            ).fetchall()
            return {
                "projects": [{"slug": str(r["project_id"]), "id": str(r["project_id"])}
                             for r in rows],
                "profiles": profiles,
            }
        except Exception:
            raise HTTPException(
                503,
                {
                    "code": "host_unavailable",
                    "message": "canonical project and Kanban host is unavailable",
                },
            ) from None

    @router.post("/onboard/preflight")
    def onboard_preflight(body: OnboardingRequest):
        """P7.2: the host's validate_project IS the preflight. Runs BEFORE
        any commitment and surfaces path/profile/duplicate conflicts with the
        host's own field errors; no second validator with different rules.
        P7.4: the response also carries the exact proposed identifiers —
        governance project id, canonical board, objectives store, automation
        state — so both UIs can preview what onboarding will create."""
        slug = (body.slug or body.project_id).strip()
        board_slug = (body.board_slug or slug).strip()
        name = (body.name or body.project_id.replace("-", " ").title()).strip()
        try:
            validated = adapter.validate_project(
                name=name,
                slug=slug,
                description=body.mission,
                repo_path=body.repo_path,
                lead_profile=body.lead_profile,
                board_slug=board_slug,
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
        # Team selection is validated from the same live discovery snapshot used
        # by mutation; discovery failure is never converted into an empty list.
        try:
            existing = _onboarding_discovery()
        except NotImplementedError:
            if type(adapter).list_existing_projects is not KanbanAdapter.list_existing_projects:
                raise HTTPException(
                    503,
                    {"code": "host_unavailable", "message": "canonical project and Kanban host is unavailable"},
                ) from None
            try:
                listed = {str(item.get("name")): dict(item) for item in adapter.list_profiles()}
            except NotImplementedError:
                listed = {}
            names = [body.lead_profile, *body.member_profiles]
            # Legacy in-process adapters have no external project registry. Their
            # list_profiles result remains authoritative when provided; otherwise
            # submitted profiles form the synthetic test-host universe.
            profiles = []
            for name in dict.fromkeys(names):
                item = listed.get(name, {"name": name})
                profiles.append({
                    **item,
                    "available": item.get("available", True),
                    "selectable": item.get("selectable", True),
                    "host_capabilities": item.get("host_capabilities", ["lead", "member"]),
                })
            existing = {"projects": [], "profiles": profiles}
        except Exception:
            raise HTTPException(
                503,
                {"code": "host_unavailable", "message": "canonical project and Kanban host is unavailable"},
            ) from None
        mode = ("connect_existing"
                if any(p["slug"] == slug for p in existing.get("projects", []))
                else "create_new")
        profiles = {str(p.get("name")): p for p in existing.get("profiles", [])}
        members = [str(p).strip() for p in body.member_profiles]
        errors: dict[str, list[str]] = {}
        if any(not name for name in members) or len(set(members)) != len(members) or body.lead_profile.strip() in members:
            errors["member_profiles"] = ["Member profiles must be non-empty, unique and cannot include the lead"]
        historical_unavailable: list[str] = []
        unavailable: list[str] = []
        for profile_name in members:
            profile = profiles.get(profile_name)
            if profile is None:
                continue
            if profile.get("available", True) and profile.get("selectable", True):
                capabilities = profile.get("host_capabilities", [])
                if capabilities and "member" not in capabilities:
                    unavailable.append(profile_name)
                continue
            if (
                profile.get("historical_reference") is True
                and body.project_id in profile.get("project_ids", [])
            ):
                historical_unavailable.append(profile_name)
            else:
                unavailable.append(profile_name)
        lead = profiles.get(body.lead_profile.strip())
        if lead is not None and (
            not lead.get("available", True)
            or not lead.get("selectable", True)
            or (lead.get("host_capabilities", []) and "lead" not in lead.get("host_capabilities", []))
        ):
            errors["lead_profile"] = [f"Profile '{body.lead_profile.strip()}' is unavailable as lead"]
        if unavailable:
            errors["member_profiles"] = [f"Profile '{p}' is unavailable" for p in unavailable]
        unknown = [p for p in members + [body.lead_profile] if p not in profiles]
        if unknown:
            errors.setdefault("profiles", []).extend(f"Profile '{p}' is not available" for p in unknown)
        if errors:
            raise HTTPException(status_code=422, detail={"code": "validation_error", "message": "Member selection is invalid", "fields": errors})
        row = store._conn.execute("SELECT revision FROM membership_revisions WHERE project_id=?", (body.project_id,)).fetchone()
        membership_revision = int(row["revision"]) if row else 0
        # P7.4: exact proposed targets. Governance project id equals the
        # stewardship project id (body.project_id); the canonical board is
        # the validated board slug; automation stays inactive.
        # P7.3: inert tooling suggestions from the VALIDATED repo path.
        # Read-only declared-file detection; acceptance later is an explicit
        # owner action through the normal objective endpoint. Files that are
        # not in the declared allow-list produce no suggestions at all.
        suggestions: list[dict] = []
        try:
            from hermes_project_stewardship.onboarding.tooling import (
                suggest_objectives,
            )

            suggestions = suggest_objectives(Path(validated["repo_path"]))
        except Exception:
            suggestions = []
        return {
            "validated": validated,
            "existing": existing,
            "mode": mode,
            "preflight": {
                "team_revision": membership_revision,
                "membership_revision": membership_revision,
                "member_profiles": members,
                "lead_profile": body.lead_profile,
                "historical_unavailable_profiles": historical_unavailable,
                "token": _preflight_token(body, membership_revision),
            },
            "suggestions": suggestions,
            "preview": {
                "governance_project_id": body.project_id,
                "canonical_board": validated["board_slug"],
                "canonical_project_slug": validated["slug"],
                "lead_profile": validated["lead_profile"],
                "repo_path": validated["repo_path"],
                "objectives_store": f"project:{body.project_id}",
                "schedules_enabled": False,
                "future_execution_enabled": False,
                "first_action": "Run first read-only assessment after onboarding",
            },
        }

    @router.post("/onboard")
    def onboard(body: OnboardingRequest):
        """Provision canonical Hermes state before Project Stewardship governance metadata."""
        slug = (body.slug or body.project_id).strip()
        board_slug = (body.board_slug or slug).strip()
        name = (body.name or body.project_id.replace("-", " ").title()).strip()
        key = (
            body.idempotency_key
            or f"dockyard-onboard:{body.project_id}"
        ).strip()
        autonomy = min(max(body.autonomy_level, 0), 3)
        fingerprint = _onboarding_fingerprint(body)
        operation = store._conn.execute(
            "SELECT * FROM onboarding_operations WHERE idempotency_key=?",
            (key,),
        ).fetchone()
        if operation is not None:
            if operation["request_fingerprint"] != fingerprint:
                raise HTTPException(
                    409,
                    {"code": "idempotency_conflict", "message": "Idempotency key is already bound to a different onboarding request"},
                )
            if operation["state"] == "completed":
                return json.loads(operation["result_json"])
        prior_rows = store._conn.execute(
            "SELECT detail_json FROM stewardship_audit_log WHERE action='project.onboarded' ORDER BY id DESC"
        ).fetchall()
        for prior_row in prior_rows:
            detail = json.loads(prior_row["detail_json"])
            if detail.get("idempotency_key") != key:
                continue
            if detail.get("request_fingerprint") != fingerprint:
                raise HTTPException(
                    409,
                    {"code": "idempotency_conflict", "message": "Idempotency key is already bound to a different onboarding request"},
                )
            return detail["result"]

        reviewed = onboard_preflight(body)["preflight"]
        current_revision = int(reviewed["membership_revision"])
        legacy_reference_submission = (
            type(adapter).list_existing_projects is KanbanAdapter.list_existing_projects
            and body.expected_membership_revision is None
            and body.preflight_token is None
        )
        if operation is None and not legacy_reference_submission and (
            body.expected_membership_revision is None
            or body.preflight_token is None
            or body.expected_membership_revision != current_revision
            or body.preflight_token != _preflight_token(body, current_revision)
        ):
            raise HTTPException(
                409,
                {
                    "code": "stale_preflight",
                    "message": "Team membership changed or this exact onboarding request was not reviewed",
                    "fields": {"membership_revision": [current_revision]},
                },
            )
        if operation is None:
            expected_revision = current_revision
            now = iso(store._clock())
            try:
                with store.tx() as cx:
                    cx.execute(
                        "INSERT INTO onboarding_operations("
                        "idempotency_key, request_fingerprint, project_id,"
                        " expected_revision, state, created_at, updated_at)"
                        " VALUES(?,?,?,?, 'incomplete', ?, ?)",
                        (key, fingerprint, body.project_id, expected_revision, now, now),
                    )
            except Exception:
                raced = store._conn.execute(
                    "SELECT * FROM onboarding_operations WHERE idempotency_key=?",
                    (key,),
                ).fetchone()
                if raced is None or raced["request_fingerprint"] != fingerprint:
                    raise HTTPException(
                        409,
                        {"code": "idempotency_conflict", "message": "Idempotency key is already bound to a different onboarding request"},
                    ) from None
                operation = raced
                expected_revision = int(raced["expected_revision"])
        else:
            expected_revision = int(operation["expected_revision"])
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
                svc.accept_onboarding_membership(
                    body.project_id,
                    idempotency_key=key,
                    expected_revision=expected_revision,
                    mission=body.mission,
                    lead_profile=body.lead_profile,
                    member_profiles=body.member_profiles,
                    autonomy_level=autonomy,
                )
            except ServiceError as exc:
                if "membership changed" in str(exc):
                    raise HTTPException(
                        409,
                        {
                            "code": "stale_preflight",
                            "message": "Team membership changed after preflight; canonical project remains recoverable",
                        },
                    ) from None
                raise
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
        except HTTPException:
            raise
        except Exception:
            raise HTTPException(
                409,
                {
                    "code": "governance_incomplete",
                    "message": "Canonical project exists; Project Stewardship governance setup can be retried",
                    "fields": {"idempotency_key": [key]},
                },
            ) from None

        result = {
            "project": body.project_id,
            "screen": "s2",
            "group": f"{body.project_id}-ops",
            "view": "Default board",
            "canonical": canonical,
            "next": "Run first read-only assessment",
        }
        store.audit(
            actor=_principal_id(body.actor_id),
            interface="dockyard:human",
            action="project.onboarded",
            subject=body.project_id,
            detail={
                "repo": body.repo_path,
                "canonical_project_id": canonical["project"]["id"],
                "board_slug": canonical["board"]["slug"],
                "idempotency_key": key,
                "request_fingerprint": fingerprint,
                "result": result,
            },
        )
        with store.tx() as cx:
            cx.execute(
                "UPDATE onboarding_operations SET state='completed', result_json=?,"
                " updated_at=? WHERE idempotency_key=?",
                (store._j(result), iso(store._clock()), key),
            )
        return result

    @router.post("/projects/{project_id}/first-assessment")
    def first_assessment(project_id: str):
        """P7.6: the onboarding completion action — run the FIRST read-only
        assessment now. Manual trigger, no schedule created, no initiatives
        proposed (the engine's own gates keep mutation off when nothing is
        proposed). Returns the evidence/result the owner reviews."""
        try:
            result = engine.run_cycle(
                project_id,
                trigger_type="manual",
                idempotency_key=f"dockyard-first-assessment:{project_id}",
            )
        except CycleRefused as exc:
            raise HTTPException(409, str(exc)) from None
        except Exception as exc:
            raise HTTPException(503, str(exc)) from None
        health = svc.latest_health(project_id)
        return {
            "project": project_id,
            "assessment": {
                "cycle_id": result.get("cycle_id"),
                "verification_ok": result.get("verification_ok"),
                "health_state": result.get("health", {}).get("state"),
                "objective_results": result.get("objective_results", []),
                "initiatives_created": len(
                    [i for i in result.get("initiatives", []) if not i.get("refused")]),
            },
            "health_snapshot": health,
            "schedules_enabled": False,
            "next": "Review the objective results; onboarding enables no automation.",
        }

    # --- Batch R2/L: Roadmap routes (one contiguous block; see api/roadmap_routes.py)
    from ..persistence.ladder_service import LadderService
    from ..persistence.roadmap_service import RoadmapService
    from .roadmap_routes import install as _install_roadmap_routes

    _roadmap = RoadmapService(store, svc, work)
    _ladder = LadderService(store, svc, work, _roadmap)
    app.state.ladder = _ladder
    _install_roadmap_routes(
        router, _roadmap, _ladder,
        authority=_membership_authority,
        # After a person confirms delivery, sync canonical work and schedule
        # the post-delivery observation (complete_from_board no longer
        # completes; it only does the work-sync + observation scheduling).
        on_confirmed=lambda ref: _post_confirm(integration, ref))
    # --- end Batch R2/L

    # --- Project memory and chat links (checks round 1; see api/memory_routes.py)
    from ..persistence.chat_links import ChatLinkService
    from ..persistence.memory_service import ProjectMemoryService
    from .memory_routes import install as _install_memory_routes

    _install_memory_routes(
        router, ProjectMemoryService(store), chat_links=ChatLinkService(store, membership_service),
        authority=_membership_authority,
        finished_work=lambda project_id: work.list(project_id, status="done"),
        work_error=_raise_work_error)
    # --- end project memory

    app.include_router(router)

    @app.exception_handler(HTTPException)
    async def http_envelope(request: Request, exc: HTTPException):
        return error_envelope_handler(request, exc)

    @app.exception_handler(FeatureDisabledError)
    async def feature_disabled_envelope(request: Request, exc: FeatureDisabledError):
        return error_envelope_handler(
            request,
            HTTPException(409, {
                "code": "feature_disabled",
                "message": str(exc),
                "fields": {"project_id": exc.project_id, "feature": exc.feature},
            }),
        )

    @app.exception_handler(KanbanAdapterError)
    async def kanban_envelope(request: Request, exc: KanbanAdapterError):
        # Safety net for routes that do not catch a Hermes error themselves:
        # a project Hermes does not know must never become a server error.
        return error_envelope_handler(
            request,
            HTTPException(_kanban_error_status(exc.code), {
                "code": exc.code,
                "message": exc.message,
                "fields": exc.fields,
            }),
        )

    @app.exception_handler(ServiceError)
    async def service_envelope(request: Request, exc: ServiceError):
        msg = str(exc).lower()
        not_found = "not enabled" in msg or "no such" in msg
        return error_envelope_handler(
            request, HTTPException(404 if not_found else 409, str(exc))
        )

    @app.get("/healthz")
    def healthz():
        return {"ok": True, "schema_version": store.schema_version}

    return app


# P addendum fix 1: no database is opened at import time. Run the server with
# the factory flag so uvicorn calls create_app() itself:
#   uvicorn --factory hermes_project_stewardship.api.server:create_app --host 127.0.0.1 --port 9310
if __name__ == "__main__":  # pragma: no cover
    import uvicorn

    uvicorn.run("hermes_project_stewardship.api.server:create_app", factory=True, host="127.0.0.1", port=9310)
