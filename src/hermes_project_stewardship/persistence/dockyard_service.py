"""Dockyard service layer: business rules over DockyardStore.

TE-01 pattern: constructed on the SAME Store as StewardshipService, so
platform work-items and stewardship state share one canonical backend.
Enforces PRD rules that span domain + persistence:
- PM-02: every mutation records actor identity + kind (human|bot).
- PM-03: backlog rank changes carry reasons (delegated to BacklogEntry).
- Hierarchy/type rules delegated to WorkItem.set_parent.
"""
from __future__ import annotations

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
from .store import Store


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
        item.ref = self.next_ref(project_id)

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
        entry = BacklogEntry(item_ref=ref, rank=rank, priority_reason=reason)
        self.dy.upsert_backlog(project_id, entry)
        self._audit(actor=actor, action="backlog.added",
                    subject=ref, detail={"rank": rank, "reason": reason})
        return entry

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

    def _audit(self, *, actor: Actor, action: str, subject: str,
               detail: Optional[dict] = None) -> None:
        self.store.audit(
            actor=actor.id,
            interface=f"dockyard:{actor.kind.value}",
            action=action,
            subject=subject,
            detail=detail,
        )
