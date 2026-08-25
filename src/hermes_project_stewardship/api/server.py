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
from typing import Any, Dict, List, Optional

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
from ..persistence.dockyard_service import DockyardService
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
    window: str = "30d"


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


class WorkItemCreate(BaseModel):
    type: str
    title: str
    actor_id: str
    actor_kind: str = "bot"
    parent_ref: Optional[str] = None
    labels: List[str] = []
    evidence_refs: List[str] = []
    estimate_days: Optional[float] = None


class WorkItemTransition(BaseModel):
    status: str
    actor_id: str
    actor_kind: str = "bot"


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
    project_id: str
    repo_path: str
    mission: str
    lead_profile: str
    autonomy_level: int = 2
    actor_id: str = "sahil"


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
    dy = DockyardService(store)

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

    @router.post("/projects/{project_id}/re-enable")
    def re_enable(project_id: str):
        return svc.re_enable(project_id)

    @router.get("/projects/{project_id}/settings")
    def settings(project_id: str):
        return svc.settings(project_id, include_disabled=True)

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
        result = svc.approve_initiative(ref, actor=body.actor,
                                        interface=body.interface)
        # zero-CLI flow (G4): approval auto-binds the board when a
        # validation contract defines the work; failure surfaces as 409.
        ini = svc.initiative_by_ref(ref)
        if ini.get("validation_contract"):
            try:
                bound = bridge.bind(ref, start_execution=True)
                result["board_slug"] = bound.get("board_slug")
                result["cards"] = len(bound.get("card_ids") or [])
            except ServiceError as e:
                raise HTTPException(409, str(e))
        return result

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


    # ------------------- Dockyard work management (G1) ----------------- #

    def _actor(actor_id: str, actor_kind: str) -> Actor:
        from ..dockyard import Actor as _Actor, ActorKind as _ActorKind

        return _Actor(id=actor_id, display_name=actor_id,
                      kind=_ActorKind(actor_kind))

    @router.get("/projects/{project_id}/work-items")
    def list_work_items(project_id: str, status: Optional[str] = None):
        from ..dockyard import WorkItemStatus as _S

        try:
            st = _S(status) if status else None
        except ValueError:
            raise HTTPException(422, f"invalid status {status!r}")
        return {"work_items": [
            w.__dict__ | {"type": w.type.value, "status": w.status.value,
                          "assignee": w.assignee.id if w.assignee else None,
                          "created_by": (w.created_by.id if w.created_by else None)}
            for w in dy.list(project_id, status=st)
        ]}

    @router.post("/projects/{project_id}/work-items")
    def create_work_item(project_id: str, body: WorkItemCreate):
        import sqlite3 as _sq

        try:
            if store._conn.execute(
                "SELECT 1 FROM project_stewardship WHERE project_id=?",
                    (project_id,)).fetchone() is None:
                raise HTTPException(404, f"project {project_id} not found")
            item = dy.create_item(
                project_id, body.type, body.title,
                actor=_actor(body.actor_id, body.actor_kind),
                parent_ref=body.parent_ref,
                labels=body.labels,
                evidence_refs=body.evidence_refs,
                estimate_days=body.estimate_days,
            )
        except HTTPException:
            raise
        except ValueError as e:
            raise HTTPException(422, str(e))
        except _sq.IntegrityError as e:
            raise HTTPException(409, f"constraint violation: {e}")
        return {"ref": item.ref, "id": item.id, "title": item.title}

    @router.post("/projects/{project_id}/work-items/{ref}/transition")
    def transition_work_item(project_id: str, ref: str,
                             body: WorkItemTransition):
        try:
            item = dy.transition(project_id, ref, body.status,
                                 actor=_actor(body.actor_id, body.actor_kind))
        except ValueError as e:
            raise HTTPException(404 if "no such" in str(e) else 422, str(e))
        return {"ref": ref, "status": item.status.value}

    @router.get("/projects/{project_id}/backlog")
    def list_backlog(project_id: str):
        return {"backlog": [e.__dict__ | {
            "aged_since": e.aged_since.isoformat()} for e in
            dy.backlog_list(project_id)]}

    @router.post("/projects/{project_id}/backlog/items")
    def create_queued_work_item(project_id: str,
                                body: QueuedWorkItemCreate):
        import sqlite3 as _sq

        try:
            from ..dockyard import WorkItemType as _T

            item, entry = dy.create_queued_item(
                project_id,
                title=body.title,
                item_type=_T(body.type),
                creator=_actor(body.creator_id, body.creator_kind),
                assignee=_actor(body.assignee_id, body.assignee_kind),
                rank=body.rank,
                reason=body.reason,
                initiative_ref=body.initiative_ref,
            )
        except ValueError as exc:
            raise HTTPException(422, str(exc))
        except _sq.IntegrityError:
            raise HTTPException(
                409,
                "queued item conflicts with current project state",
            )
        return {
            "ref": item.ref,
            "id": item.id,
            "type": item.type.value,
            "title": item.title,
            "assignee": item.assignee.id if item.assignee else None,
            "created_by": item.created_by.id if item.created_by else None,
            "initiative_ref": item.initiative_ref,
            "rank": entry.rank,
            "priority_reason": entry.priority_reason,
        }

    @router.post("/projects/{project_id}/backlog")
    def backlog_add(project_id: str, body: BacklogAdd):
        try:
            entry = dy.backlog_add(project_id, body.ref, body.rank,
                                   reason=body.reason,
                                   actor=_actor(body.actor_id, body.actor_kind))
        except Exception as e:
            msg = str(e)
            raise HTTPException(400 if "reason" in msg else 404, msg)
        return {"ref": entry.item_ref, "rank": entry.rank}

    @router.post("/projects/{project_id}/backlog/{ref}/rerank")
    def backlog_rerank(project_id: str, ref: str, body: BacklogRerank):
        try:
            audit = dy.backlog_rerank(project_id, ref, body.new_rank,
                                      reason=body.reason,
                                      actor=_actor(body.actor_id,
                                                   body.actor_kind))
        except Exception as e:
            msg = str(e)
            raise HTTPException(400 if "reason" in msg else 404, msg)
        return {"ref": ref, "from_rank": audit["from_rank"],
                "to_rank": audit["to_rank"]}


    @router.post("/projects/{project_id}/milestones")
    def milestone_create(project_id: str, body: MilestoneCreate):
        try:
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
            dy.milestone_attach(project_id, name, body.ref,
                                actor=_actor(body.actor_id, body.actor_kind))
        except Exception as e:
            raise HTTPException(409, str(e))
        return {"name": name, "attached": body.ref}

    @router.get("/projects/{project_id}/milestones/{name}")
    def milestone_progress(project_id: str, name: str):
        try:
            return dy.milestone_progress(project_id, name)
        except ValueError as e:
            raise HTTPException(404, str(e))

    @router.put("/projects/{project_id}/views")
    def view_save(project_id: str, body: ViewSave):
        try:
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

    @router.post("/onboard")
    def onboard(body: OnboardingRequest):
        """Zero-setup onboarding (UX-08): point at a repo, answer 3
        questions. Creates the project, seeds the ops group + default
        saved view, returns the starting screen."""
        import sqlite3 as _sq

        if store._conn.execute(
            "SELECT 1 FROM project_stewardship WHERE project_id=?",
                (body.project_id,)).fetchone() is not None:
            raise HTTPException(409, f"project {body.project_id} already"
                                     " onboarded")
        try:
            svc.enable(project_id=body.project_id,
                       mission=body.mission,
                       lead_profile=body.lead_profile,
                       autonomy_level=min(max(body.autonomy_level, 0), 3))
        except ServiceError as e:
            raise HTTPException(409, str(e))
        except _sq.IntegrityError as e:
            raise HTTPException(409, f"constraint violation: {e}")
        except Exception as e:
            raise HTTPException(400, str(e))
        try:
            dy.group_create(f"{body.project_id}-ops",
                            purpose="auto-created by onboarding")
        except ValueError:
            pass  # already exists
        try:
            dy.view_save(body.project_id, "Default board", "board",
                         filters={}, actor=_actor(body.actor_id, "human"))
        except Exception:
            pass  # view already saved
        self_audit = store.audit(actor=body.actor_id, interface="dockyard:human",
                                 action="project.onboarded",
                                 subject=body.project_id,
                                 detail={"repo": body.repo_path})
        return {"project": body.project_id, "screen": "s2",
                "group": f"{body.project_id}-ops",
                "view": "Default board"}

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


# Module-level app so `uvicorn hermes_project_stewardship.api.server:app`
# works as documented in the README. Uses ./stewardship.db by default.
app = create_app()


if __name__ == "__main__":  # pragma: no cover
    import uvicorn

    uvicorn.run(app, host="127.0.0.1", port=9310)
