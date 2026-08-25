"""Dockyard service layer: business rules over DockyardStore.

TE-01 pattern: constructed on the SAME Store as StewardshipService, so
platform work-items and stewardship state share one canonical backend.
Enforces PRD rules that span domain + persistence:
- PM-02: every mutation records actor identity + kind (human|bot).
- PM-03: backlog rank changes carry reasons (delegated to BacklogEntry).
- Hierarchy/type rules delegated to WorkItem.set_parent.
"""
from __future__ import annotations

import json

from typing import Dict, List, Optional

from ..dockyard import (
    Actor,
    BacklogEntry,
    RankChangeError,
    WorkItem,
    WorkItemStatus,
    WorkItemType,
    make_ref,
)
from .dockyard_store import DockyardStore
from .service import ServiceError, StewardshipService

from .store import Store


import threading as _threading

_PROMOTION_LOCK = _threading.Lock()


class DockyardService:
    def __init__(self, store: Store) -> None:
        self.store = store
        self.dy = DockyardStore(store)
        self._ref_seq: Dict[str, int] = {}

    # ------------------------------------------------------------------ #
    # Work items                                                         #
    # ------------------------------------------------------------------ #

    def next_ref(self, project_id: str, prefix: str = "HDY") -> str:
        """Project-scoped sequential ref (HDY-n)."""
        n = self._ref_seq.get(project_id, 0)
        while True:
            n += 1
            ref = make_ref(prefix, n)
            row = self.store._conn.execute(
                "SELECT 1 FROM dockyard_work_items WHERE ref=?", (ref,)
            ).fetchone()
            if not row:
                self._ref_seq[project_id] = n
                return ref

    def create_item(self, project_id: str, item_type: WorkItemType,
                    title: str, *, actor: Actor,
                    parent_ref: Optional[str] = None,
                    labels: Optional[List[str]] = None,
                    evidence_refs: Optional[List[str]] = None,
                    estimate_days: Optional[float] = None) -> WorkItem:
        if not title or len(title.strip()) < 3:
            raise ValueError("title must be at least 3 characters")
        item = WorkItem(
            project_id=project_id,
            type=item_type,
            title=title.strip(),
            assignee=actor,
            created_by=actor,
            labels=labels or [],
            evidence_refs=evidence_refs or [],
            estimate_days=estimate_days,
        )
        # G5 race-safety: leave ref unset; DockyardStore.create_item
        # derives HDY-n from the assigned rowid inside its own
        # transaction, so concurrent creators can never collide.
        if parent_ref is not None:
            parent = self._by_ref(project_id, parent_ref)
            if parent is None:
                raise ValueError(f"parent {parent_ref} not found")
            item.set_parent(parent)  # rule check before persisting

        return self.dy.create_item(item)

    def _by_ref(self, project_id: str, ref: str) -> Optional[WorkItem]:
        row = self.store._conn.execute(
            "SELECT id FROM dockyard_work_items WHERE project_id=? AND ref=?",
            (project_id, ref),
        ).fetchone()
        return self.dy.get_item(project_id, row["id"]) if row else None

    def get(self, project_id: str, ref: str) -> Optional[WorkItem]:
        return self._by_ref(project_id, ref)

    def list(self, project_id: str, *,
             status: Optional[WorkItemStatus] = None) -> List[WorkItem]:
        return self.dy.list_items(project_id, status=status)

    def transition(self, project_id: str, ref: str,
                   new_status: WorkItemStatus | str, *, actor: Actor) -> WorkItem:
        if isinstance(new_status, str):
            from ..dockyard import WorkItemStatus as _S
            new_status = _S(new_status)
        item = self._by_ref(project_id, ref)
        if item is None or item.id is None:
            raise ValueError(f"no such work item {ref}")
        updated = self.dy.update_status(project_id, item.id, new_status)
        if updated is None:  # pragma: no cover - defensive
            raise ValueError(f"transition failed for {ref}")
        self._audit(actor=actor, action="workitem.transition",
                    subject=ref, detail={
                        "from": item.status.value, "to": new_status.value})
        return updated

    def attach_parent(self, project_id: str, child_ref: str,
                      parent_ref: str, *, actor: Actor) -> None:
        child = self._by_ref(project_id, child_ref)
        parent = self._by_ref(project_id, parent_ref)
        if child is None or parent is None:
            raise ValueError("child and parent must exist")
        if child.id is None or parent.id is None:
            raise ValueError("child and parent must be persisted")
        child.set_parent(parent)  # raises on rule violation
        self.dy.set_parent(project_id, child.id, parent.id)
        self._audit(actor=actor, action="workitem.parented",
                    subject=child_ref,
                    detail={"parent": parent_ref})

    # ------------------------------------------------------------------ #
    # Backlog                                                            #
    # ------------------------------------------------------------------ #

    def backlog_add(self, project_id: str, ref: str, rank: int, *,
                    reason: str, actor: Actor) -> BacklogEntry:
        if len(reason.strip()) < 4:
            raise RankChangeError(
                "backlog additions require a priority reason (min 4 chars)")
        # C4: refuse phantom refs; item must exist IN THIS project
        if self._by_ref(project_id, ref) is None:
            raise ValueError(f"no such work item {ref} in {project_id}")
        entry = BacklogEntry(item_ref=ref, rank=rank, priority_reason=reason)
        self.dy.upsert_backlog(project_id, entry, actor=actor)
        self._audit(actor=actor, action="backlog.added",
                    subject=ref, detail={"rank": rank, "reason": reason})
        return entry

    def create_queued_item(
        self,
        project_id: str,
        *,
        title: str,
        item_type: WorkItemType,
        creator: Actor,
        assignee: Actor,
        rank: int,
        reason: str,
        initiative_ref: Optional[str] = None,
    ) -> tuple[WorkItem, BacklogEntry]:
        """Create a work item and insert it into the backlog atomically."""
        if not title or len(title.strip()) < 3:
            raise ValueError("title must be at least 3 characters")
        if not reason or len(reason.strip()) < 4:
            raise RankChangeError(
                "backlog additions require a priority reason (min 4 chars)")
        if creator.id == assignee.id:
            raise ValueError("assignee must be distinct from the creator")

        stewardship = StewardshipService(self.store)
        try:
            settings = stewardship.settings(project_id)
        except ServiceError as exc:
            raise ValueError(str(exc)) from exc
        if settings["phase"] != "active":
            raise ValueError(
                f"project {project_id} is {settings['phase']}; resume it before adding work")

        relation = initiative_ref.strip() if initiative_ref else None
        if relation:
            try:
                initiative = stewardship.initiative_by_ref(relation)
            except ServiceError as exc:
                raise ValueError(str(exc)) from exc
            if initiative["project_id"] != project_id:
                raise ValueError(
                    f"initiative {relation} belongs to project "
                    f"{initiative['project_id']}, not {project_id}")

        item = WorkItem(
            project_id=project_id,
            type=item_type,
            title=title.strip(),
            assignee=assignee,
            created_by=creator,
            priority_rank=rank,
            initiative_ref=relation,
        )
        entry = BacklogEntry(
            item_ref="",
            rank=rank,
            priority_reason=reason.strip(),
        )
        item, entry = self.dy.create_queued_item(item, entry, actor=creator)
        self._audit(
            actor=creator,
            action="backlog.item_created",
            subject=item.ref,
            detail={
                "assignee": assignee.id,
                "initiative_ref": relation,
                "rank": rank,
                "reason": reason.strip(),
            },
        )
        return item, entry

    def backlog_rerank(self, project_id: str, ref: str, new_rank: int, *,
                       reason: str, actor: Actor) -> dict:
        audit = self.dy.rerank(project_id, ref, new_rank, reason, actor=actor)
        self._audit(actor=actor, action="backlog.rerank", subject=ref,
                    detail={"from": audit["from_rank"], "to": new_rank,
                            "reason": reason})
        return audit

    def backlog_list(self, project_id: str) -> List[BacklogEntry]:
        return self.dy.list_backlog(project_id)

    # ------------------------------------------------------------------ #
    # Audit — into the SAME stewardship audit log (one trail, TE-01)      #
    # ------------------------------------------------------------------ #

    def _audit(self, *, actor, action: str, subject: str,
               detail: Optional[dict] = None) -> None:
        from ..dockyard import Actor as _Actor

        if isinstance(actor, str):
            actor_id, kind = actor, "bot"
        else:
            actor_id = actor.id
            kind = actor.kind.value
        self.store.audit(
            actor=actor_id,
            interface=f"dockyard:{kind}",
            action=action,
            subject=subject,
            detail=detail,
        )

    # ------------------------------------------------------------------ #
    # Milestones (PM-04)                                                 #
    # ------------------------------------------------------------------ #

    def milestone_create(self, project_id: str, name: str, *,
                         due: Optional[str] = None,
                         actor: Optional[Actor] = None) -> int:
        mid = self.dy.milestone_create(project_id, name, due=due)
        if actor:
            self._audit(actor=actor, action="milestone.created",
                        subject=name, detail={"due": due})
        return mid

    def milestone_attach(self, project_id: str, name: str, ref: str, *,
                         actor: Actor) -> None:
        # C6: refuse attaching to non-existent milestones / phantom items
        self.dy.milestone_progress(project_id, name)  # raises if missing
        if self._by_ref(project_id, ref) is None:
            raise ValueError(f"no such work item {ref} in {project_id}")
        self.dy.milestone_attach(project_id, name, ref)
        self._audit(actor=actor, action="milestone.attached",
                    subject=name, detail={"item": ref})

    def milestone_progress(self, project_id: str, name: str) -> Dict:
        return self.dy.milestone_progress(project_id, name)

    # ------------------------------------------------------------------ #
    # Saved views (PM-05)                                                #
    # ------------------------------------------------------------------ #

    def view_save(self, project_id: str, name: str, layout: str, *,
                  filters: Dict, actor: Actor,
                  shared: bool = False) -> None:
        self.dy.view_save(project_id, name, layout, filters=filters,
                          owner_id=actor.id, shared=shared)

    def views_list(self, project_id: str, *, actor: Actor) -> List[Dict]:
        return self.dy.views_list(project_id, include_private_of=actor.id)

    # ------------------------------------------------------------------ #
    # Generated reports                                                  #
    # ------------------------------------------------------------------ #

    def report_generate(
        self,
        project_id: str,
        *,
        report_type: str = "executive",
        include_activity: bool = True,
        actor: Actor,
    ) -> Dict:
        """Build and persist a deterministic Markdown report from canonical data."""
        import uuid as _uuid

        from .service import StewardshipService
        from .store import iso

        if report_type not in {"executive", "delivery", "risk", "full"}:
            raise ValueError(
                "report_type must be executive, delivery, risk, or full"
            )

        steward = StewardshipService(self.store)
        settings = steward.settings(project_id)
        work_items = self.list(project_id)
        initiatives = steward.initiatives(project_id)
        notifications = self.store._conn.execute(
            "SELECT severity, kind, title, body, acked_at, created_at "
            "FROM notifications WHERE project_id=? "
            "ORDER BY id DESC LIMIT 50",
            (project_id,),
        ).fetchall()
        events = []
        if include_activity and report_type in {"executive", "delivery", "full"}:
            events = self.store._conn.execute(
                "SELECT ts, event_type, subject, emitted_by FROM domain_events "
                "WHERE project_id=? ORDER BY id DESC LIMIT 20",
                (project_id,),
            ).fetchall()

        def clean(value) -> str:
            text = str(value or "").replace("|", "\\|").replace("`", "\\`")
            return " ".join(text.split())

        status_counts = {
            status: sum(1 for item in work_items if item.status.value == status)
            for status in ("backlog", "in_progress", "in_review", "done", "blocked")
        }
        pending = [
            item for item in initiatives
            if item.get("status") in {"proposed", "awaiting_approval"}
        ]
        blocked = [item for item in work_items if item.status.value == "blocked"]
        open_alerts = [row for row in notifications if not row["acked_at"]]

        generated_at = iso()
        title = f"{project_id} {report_type} report"
        lines = [
            f"# {title}",
            "",
            f"Generated: {generated_at}",
            f"Generated by: {clean(actor.id)}",
            "",
            "## Configuration",
            "",
            f"- Mission: {clean(settings.get('mission')) or 'Not set'}",
            f"- Phase: {clean(settings.get('phase'))}",
            f"- Lead: {clean(settings['owner'].get('lead_profile')) or 'Not assigned'}",
            "- Members: " + (
                ", ".join(clean(profile) for profile in settings["owner"].get("member_profiles", []))
                or "None"
            ),
            f"- Autonomy level: {settings.get('autonomy_level', 0)}",
            f"- Verification policy: {clean(json.dumps(settings['policies'].get('verification', {}), sort_keys=True))}",
            f"- Release policy: {clean(json.dumps(settings['policies'].get('release', {}), sort_keys=True))}",
            f"- Notification policy: {clean(json.dumps(settings['policies'].get('notification', {}), sort_keys=True))}",
            "",
        ]

        if report_type != "risk":
            lines.extend([
                "## Delivery",
                "",
                f"- Backlog: {status_counts['backlog']}",
                f"- In progress: {status_counts['in_progress']}",
                f"- In review: {status_counts['in_review']}",
                f"- Done: {status_counts['done']}",
                f"- Blocked: {status_counts['blocked']}",
                "",
            ])
            if report_type in {"delivery", "full"}:
                if work_items:
                    lines.extend([
                        "| Ref | Work item | Status | Assignee |",
                        "| --- | --- | --- | --- |",
                    ])
                    for item in work_items[:30]:
                        assignee = item.assignee.id if item.assignee else "Unassigned"
                        lines.append(
                            f"| {clean(item.ref)} | {clean(item.title)} | "
                            f"{clean(item.status.value)} | {clean(assignee)} |"
                        )
                else:
                    lines.append("No work items have been recorded.")
                lines.append("")

        if report_type in {"executive", "risk", "full"}:
            lines.extend([
                "## Risks and decisions",
                "",
                f"- Pending initiatives: {len(pending)}",
                f"- Blocked work items: {len(blocked)}",
                f"- Unacknowledged alerts: {len(open_alerts)}",
                "",
            ])
            for initiative in pending[:15]:
                lines.append(
                    f"- Decision: {clean(initiative.get('ref'))} "
                    f"{clean(initiative.get('title'))} ({clean(initiative.get('risk'))} risk)"
                )
            for item in blocked[:15]:
                lines.append(f"- Blocked: {clean(item.ref)} {clean(item.title)}")
            for alert in open_alerts[:15]:
                lines.append(
                    f"- Alert: [{clean(alert['severity'])}] {clean(alert['title'])}"
                )
            if not pending and not blocked and not open_alerts:
                lines.append("No open decisions, blocks, or alerts were recorded.")

        activity_included = bool(
            include_activity and report_type in {"executive", "delivery", "full"}
        )
        if activity_included:
            lines.extend(["", "## Recent activity", ""])
            if events:
                for event in events:
                    lines.append(
                        f"- {clean(event['ts'])}: {clean(event['event_type'])} "
                        f"{clean(event['subject'])} by {clean(event['emitted_by'])}"
                    )
            else:
                lines.append("No project activity events were recorded.")

        report = {
            "report_id": "RPT-" + _uuid.uuid4().hex[:12].upper(),
            "project_id": project_id,
            "report_type": report_type,
            "title": title,
            "content": "\n".join(lines).rstrip() + "\n",
            "options": {
                "include_activity": bool(include_activity),
                "activity_included": activity_included,
            },
            "generated_by": actor.id,
            "generated_at": generated_at,
        }
        self.dy.report_save(report)
        self._audit(
            actor=actor,
            action="report.generated",
            subject=report["report_id"],
            detail={"project_id": project_id, "report_type": report_type},
        )
        return report

    def reports_list(self, project_id: str, *, limit: int = 20) -> List[Dict]:
        from .service import StewardshipService

        StewardshipService(self.store).settings(project_id)
        return self.dy.reports_list(project_id, limit=limit)

    def report_get(self, project_id: str, report_id: str) -> Dict:
        from .service import StewardshipService

        StewardshipService(self.store).settings(project_id)
        report = self.dy.report_get(project_id, report_id)
        if report is None:
            raise ValueError(f"report {report_id} not found for {project_id}")
        return report

    # ------------------------------------------------------------------ #
    # Bot registry + groups (BM-01/02) — G2 P2                           #
    # ------------------------------------------------------------------ #

    def bot_register(self, bot_id: str, display_name: str, *,
                     capabilities: Optional[List[str]] = None,
                     profile: Optional[str] = None) -> "Bot":
        from ..dockyard.bots import Bot

        bot = Bot(id=bot_id, display_name=display_name,
                  capabilities=capabilities or [], profile=profile)
        self.dy.bot_register(bot)
        self._audit(actor=bot_id, action="bot.registered", subject=bot_id,
                    detail={"capabilities": bot.capabilities})
        return bot

    def bot_get(self, bot_id: str):
        return self.dy.bot_get(bot_id)

    def bots_list(self, *, status: Optional[str] = None):
        return self.dy.bots_list(status=status)

    def bot_set_status(self, bot_id: str, status_value: str, *,
                       current_item: Optional[str] = None,
                       actor: Optional[Actor] = None):
        bot = self.dy.bot_set_status(bot_id, status_value,
                                     current_item=current_item)
        self._audit(actor=(actor.id if actor else bot_id),
                    action="bot.status", subject=bot_id,
                    detail={"status": status_value,
                            "item": current_item})
        return bot

    def group_create(self, name: str, *, purpose: str = "",
                     channel_ref: Optional[str] = None,
                     member_ids: Optional[List[str]] = None,
                     lead_id: Optional[str] = None,
                     actor: Optional[Actor] = None):
        from ..dockyard.bots import BotGroup, GroupRole

        if self.dy.group_get(name) is not None:
            raise ValueError(f"group {name} already exists")
        g = BotGroup(name=name, purpose=purpose, channel_ref=channel_ref)
        for b in (member_ids or []):
            role = GroupRole.LEAD if b == lead_id else GroupRole.MEMBER
            g.add_member(b, role)
        gid = self.dy.group_create(g)
        if actor:
            self._audit(actor=actor, action="group.created", subject=name,
                        detail={"members": list(g.members.keys()),
                                "lead": g.lead_id(),
                                "channel": channel_ref})
        g.id = gid
        return g

    def group_get(self, name: str):
        return self.dy.group_get(name)

    def groups_list(self):
        return self.dy.groups_list()

    def group_add_member(self, name: str, bot_id: str, *, as_lead=False,
                         actor: Optional[Actor] = None):
        from ..dockyard.bots import GroupRole

        if self.dy.bot_get(bot_id) is None:
            raise ValueError(f"unknown bot {bot_id}")
        role = GroupRole.LEAD.value if as_lead else GroupRole.MEMBER.value
        self.dy.group_add_member(name, bot_id, role)
        if actor:
            self._audit(actor=actor.id, action="group.member_added",
                        subject=name, detail={"bot": bot_id, "role": role})

    # ------------------------------------------------------------------ #
    # A2A bus service (BM-03/04)                                         #
    # ------------------------------------------------------------------ #

    def a2a_send(self, msg_type: str, *, from_actor: str, to_group: str,
                 payload: Optional[Dict] = None,
                 item_ref: Optional[str] = None) -> Dict:
        """Validate, persist, audit. Channel post text is generated
        (BM-04); actual gateway delivery stays an integration concern."""
        import uuid as _uuid

        from ..dockyard.bots import A2AMessage, A2AMessageType

        m = A2AMessage(
            msg_type=A2AMessageType(msg_type),
            from_actor=from_actor,
            to_group=to_group,
            payload=payload or {},
            item_ref=item_ref,
            id="a2a-" + _uuid.uuid4().hex[:12],
        )
        # G5 hardening: bounded event size (structured events, not blobs)
        import json as _json

        if len(_json.dumps(m.payload)) > 32_768:
            raise ValueError("a2a payload exceeds 32 KiB limit")
        self.dy.a2a_append(m)
        self._audit(actor=m.from_actor, action=f"a2a.{m.msg_type.value}",
                    subject=m.to_group,
                    detail={"item": m.item_ref, "message_id": m.id})
        return {"id": m.id, "channel_post": m.summary_line()}

    def a2a_feed(self, group_name: str, *, limit: int = 50) -> List[Dict]:
        return self.dy.a2a_for_group(group_name, limit=limit)

    def a2a_item_trail(self, item_ref: str) -> List[Dict]:
        return self.dy.a2a_for_item(item_ref)

    def workload_board(self) -> Dict:
        return self.dy.workload_board()

    def bot_reputation(self, bot_id: str) -> Dict:
        return self.dy.bot_reputation(bot_id)

    # ------------------------------------------------------------------ #
    # Initiative promotion (PM-07) — G3 P1                               #
    # ------------------------------------------------------------------ #

    def promote_initiative(self, initiative: Dict, *,
                           actor: Actor) -> WorkItem:
        """Mirror an approved stewardship initiative as a first-class
        WorkItem so it appears on boards/timelines with its evidence
        chain intact (PM-07).

        - type='initiative' (PRD §3.2)
        - evidence_refs carry the engine's evidence + validation contract
        - labels mark the engine ref for traceability both ways
        """
        if initiative.get("status") not in ("approved", "executing",
                                            "completed", "regressed"):
            raise ValueError(
                "only initiatives past approval can be promoted "
                f"(status={initiative.get('status')})")
        ref = initiative["ref"]
        existing = self.find_promoted(initiative["project_id"], ref)
        if existing is not None:
            return existing  # idempotent promotion

        evidence = list(initiative.get("evidence_refs") or [])
        contract = initiative.get("validation_contract") or {}
        if contract:
            evidence.append("contract:" + json.dumps(
                contract, sort_keys=True, separators=(",", ":")))
        item = WorkItem(
            project_id=initiative["project_id"],
            type=WorkItemType.INITIATIVE,
            title=initiative.get("title") or ref,
            assignee=actor,
            created_by=actor,
            labels=[f"engine:{ref}"],
            evidence_refs=evidence,
        )
        # C2: leave ref unset -> store derives HDY-n from rowid inside
        # its own transaction (no TOCTOU cache under concurrency).
        # Idempotency under concurrency: serialise twin-creation per
        # process, then re-check inside the lock.
        with _PROMOTION_LOCK:
            existing = self.find_promoted(initiative["project_id"], ref)
            if existing is not None:
                return existing  # idempotent promotion
            created = self.dy.create_item(item)
        self._audit(actor=actor, action="initiative.promoted",
                    subject=ref,
                    detail={"work_item": created.ref,
                            "evidence_count": len(evidence)})
        return created

    @staticmethod
    def _promotion_ref(engine_ref: str) -> str:
        """Deterministic label key used to find a promoted twin."""
        return f"engine:{engine_ref}"

    def find_promoted(self, project_id: str, engine_ref: str):
        """Return the promoted WorkItem twin for an engine ref, if any."""
        label = self._promotion_ref(engine_ref)
        row = self.store._conn.execute(
            "SELECT id FROM dockyard_work_items WHERE project_id=? AND"
            " labels_json LIKE ? ORDER BY id LIMIT 1",
            (project_id, f'%"{label}"%'),
        ).fetchone()
        if not row:
            return None
        return self.dy.get_item(project_id, row["id"])

    # ------------------------------------------------------------------ #
    # Approval Inbox (TE-02) — G4 P1                                     #
    # ------------------------------------------------------------------ #

    def approval_inbox(self) -> Dict:
        """ALL pending human decisions across ALL projects, one call."""
        initiatives = self.store._conn.execute(
            """
            SELECT project_id, ref, title, risk, priority, created_at
            FROM project_initiatives
            WHERE approval_state='pending' AND status='pending_approval'
            ORDER BY created_at
            """
        ).fetchall()
        items = []
        for r in initiatives:
            items.append({
                "kind": "initiative_approval",
                "project": r["project_id"],
                "ref": r["ref"],
                "title": r["title"],
                "risk": r["risk"],
                "deep_link": f"s6:initiative/{r['ref']}",
            })
        frozen = self.store._conn.execute(
            "SELECT project_id, phase FROM project_stewardship"
            " WHERE phase='frozen' OR enabled=0"
        ).fetchall()
        for r in frozen:
            items.append({
                "kind": "project_attention",
                "project": r["project_id"],
                "ref": r["phase"],
                "title": f"Project needs attention (phase={r['phase']})",
                "risk": "high",
                "deep_link": f"s1:project/{r['project_id']}",
            })
        return {"count": len(items), "items": items}

    # ------------------------------------------------------------------ #
    # Dashboard roll-up (UX-02) — G4 P2                                  #
    # ------------------------------------------------------------------ #

    def dashboard(self) -> Dict:
        """All projects x health x active work x owed decisions, one call.
        Answers 'what does my fleet owe me right now?' (PRD §8.5)."""
        projects = self.store._conn.execute(
            "SELECT project_id, enabled, phase, autonomy_level"
            " FROM project_stewardship ORDER BY project_id").fetchall()
        out = {"projects": [], "owed_decisions": 0, "totals":
               {"active_work": 0, "blocked": 0, "stuck_bots": 0,
                "unacked_notifications": 0}}
        inbox = self.approval_inbox()
        out["owed_decisions"] = inbox["count"]
        for p in projects:
            pid = p["project_id"]
            counts = self.store._conn.execute(
                "SELECT status, COUNT(*) AS n FROM dockyard_work_items"
                " WHERE project_id=? GROUP BY status", (pid,),
            ).fetchall()
            by = {r["status"]: r["n"] for r in counts}
            active = by.get("in_progress", 0) + by.get("in_review", 0)
            health_row = self.store._conn.execute(
                "SELECT status FROM project_health_snapshots"
                " WHERE project_id=? ORDER BY id DESC LIMIT 1",
                (pid,)).fetchone()
            unacked = self.store._conn.execute(
                "SELECT COUNT(*) AS n FROM notifications WHERE project_id=?"
                " AND acked_at IS NULL", (pid,)).fetchone()["n"]
            stuck = self.store._conn.execute(
                "SELECT COUNT(*) AS n FROM dockyard_bots WHERE status='stuck'"
            ).fetchone()["n"]
            out["projects"].append({
                "id": pid, "enabled": bool(p["enabled"]), "phase": p["phase"],
                "health": health_row["status"] if health_row
                else "unknown",
                "work": {"backlog": by.get("backlog", 0),
                         "active": active, "done": by.get("done", 0),
                         "blocked": by.get("blocked", 0)},
                "unacked_notifications": unacked,
            })
            out["totals"]["active_work"] += active
            out["totals"]["blocked"] += by.get("blocked", 0)
            out["totals"]["stuck_bots"] = max(
                out["totals"]["stuck_bots"], stuck)
            out["totals"]["unacked_notifications"] += unacked
        return out

    # ------------------------------------------------------------------ #
    # Notification deep-links (UX-07) — G4 P3                            #
    # ------------------------------------------------------------------ #

    def fleet_notifications(self) -> Dict:
        """Cross-project notification feed with screen deep-links."""
        rows = self.store._conn.execute(
            "SELECT n.id, n.project_id, n.severity, n.kind, n.title,"
            " n.body, n.created_at, n.acked_at"
            " FROM notifications n ORDER BY n.created_at DESC LIMIT 100"
        ).fetchall()
        items = []
        for r in rows:
            link = self._deep_link(r["kind"])
            items.append({
                "id": r["id"], "project": r["project_id"],
                "severity": r["severity"], "kind": r["kind"],
                "title": r["title"], "body": r["body"],
                "created_at": r["created_at"],
                "acked": r["acked_at"] is not None,
                "deep_link": link,
            })
        return {"notifications": items}

    @staticmethod
    def _deep_link(kind: str) -> str:
        if kind.startswith("approval"):
            return "s4:approval-inbox"
        if "health" in kind or "regression" in kind:
            return "s1:dashboard"
        if "handoff" in kind or "a2a" in kind:
            return "s5:bot-teams"
        return "s2:project-board"

    def ack_notification(self, notification_id: int) -> None:
        from .store import iso

        with self.store.tx() as cx:
            cur = cx.execute(
                "UPDATE notifications SET acked_at=? WHERE id=?",
                (iso(), notification_id))
        if cur.rowcount == 0:  # C5: fail closed on unknown ids
            raise ValueError(f"notification {notification_id} not found")
