"""Canonical Hermes work service for Dockyard.

This service owns Dockyard's production work-item seam. Hermes Project/Kanban
records remain authoritative for task and epic state. Dockyard writes only its
own governance metadata around those canonical records.
"""
from __future__ import annotations

from typing import Any, Protocol

from ..dockyard import Actor, WorkItemStatus, WorkItemType
from .canonical_work_store import CanonicalWorkMetadataStore
from .service import ServiceError, StewardshipService
from .store import Store


class CanonicalWorkPort(Protocol):
    """Backend-neutral canonical work operations consumed by Dockyard."""

    def create_work(
        self,
        project_id: str,
        *,
        kind: str,
        title: str,
        body: str | None,
        assignee: str | None,
        created_by: str,
        parent_id: str | None = None,
        idempotency_key: str | None = None,
    ) -> dict[str, Any]: ...

    def list_work(self, project_id: str) -> list[dict[str, Any]]: ...

    def get_work(
        self,
        project_id: str,
        kind: str,
        item_id: str,
    ) -> dict[str, Any]: ...

    def transition_work(
        self,
        project_id: str,
        kind: str,
        item_id: str,
        status: str,
    ) -> dict[str, Any]: ...

    def link_work(
        self,
        project_id: str,
        parent_id: str,
        child_id: str,
    ) -> dict[str, Any]: ...


_CANONICAL_STATUS = {
    "backlog": "backlog",
    "todo": "backlog",
    "ready": "in_progress",
    "scheduled": "in_progress",
    "running": "in_progress",
    "review": "in_review",
    "done": "done",
    "archived": "done",
    "blocked": "blocked",
    "active": "backlog",
}


class CanonicalWorkPartialError(RuntimeError):
    """Canonical work exists, but Dockyard metadata is incomplete."""

    code = "ranking_incomplete"

    def __init__(self, item: dict[str, Any]) -> None:
        super().__init__(
            "canonical work was created, but Dockyard ranking is incomplete"
        )
        self.item = dict(item)
        self.item_ref = str(item.get("ref") or item.get("id") or "")


class CanonicalWorkService:
    """Business rules over canonical Hermes work plus Dockyard governance."""

    def __init__(self, store: Store, port: CanonicalWorkPort) -> None:
        self.store = store
        self.port = port
        self.stewardship = StewardshipService(store)
        self.metadata = CanonicalWorkMetadataStore(store)

    def _require_project(
        self,
        project_id: str,
        *,
        include_disabled: bool = False,
    ) -> dict[str, Any]:
        try:
            return self.stewardship.settings(
                project_id,
                include_disabled=include_disabled,
            )
        except ServiceError as exc:
            raise ValueError(str(exc)) from exc

    @staticmethod
    def _kind(item_type: WorkItemType | str) -> str:
        value = item_type.value if isinstance(item_type, WorkItemType) else str(item_type)
        if value == WorkItemType.INITIATIVE.value:
            raise ValueError(
                "initiative is governance work; use the initiative endpoint"
            )
        if value not in {
            WorkItemType.EPIC.value,
            WorkItemType.TASK.value,
            WorkItemType.SUBTASK.value,
            WorkItemType.BUG.value,
            WorkItemType.SPIKE.value,
        }:
            raise ValueError(f"unsupported work item type {value!r}")
        return value

    @staticmethod
    def _view(item: dict[str, Any]) -> dict[str, Any]:
        view = dict(item)
        item_id = str(view.get("id") or view.get("ref") or "")
        kind = str(view.get("kind") or view.get("type") or "task")
        canonical_status = str(view.get("status") or "backlog")
        view["id"] = item_id
        view["ref"] = item_id
        view["kind"] = kind
        view["type"] = kind
        view["canonical_status"] = canonical_status
        view["status"] = _CANONICAL_STATUS.get(canonical_status, canonical_status)
        return view

    def _overlay_items(
        self,
        project_id: str,
        items: list[dict[str, Any]],
    ) -> list[dict[str, Any]]:
        bindings = self.metadata.bindings(project_id)
        ranks = {
            (row["item_kind"], row["item_ref"]): row
            for row in self.metadata.list_backlog(project_id)
        }
        output = []
        for raw in items:
            view = self._view(raw)
            key = (view["kind"], view["ref"])
            binding = bindings.get(key)
            rank = ranks.get(key)
            view["initiative_ref"] = (
                binding.get("initiative_ref") if binding is not None else None
            )
            view["priority_rank"] = rank["rank"] if rank is not None else None
            view["priority_reason"] = (
                rank["priority_reason"] if rank is not None else None
            )
            if not view.get("created_by") and binding is not None:
                view["created_by"] = binding.get("created_by_id")
            output.append(view)
        return output

    @staticmethod
    def _body(
        *,
        labels: list[str] | None,
        evidence_refs: list[str] | None,
        estimate_days: float | None,
    ) -> str | None:
        lines: list[str] = []
        if labels:
            lines.append("Labels: " + ", ".join(labels))
        if evidence_refs:
            lines.append("Evidence: " + ", ".join(evidence_refs))
        if estimate_days is not None:
            lines.append(f"Estimate: {estimate_days:g} days")
        return "\n".join(lines) or None

    def create_item(
        self,
        project_id: str,
        item_type: WorkItemType | str,
        title: str,
        *,
        actor: Actor,
        parent_ref: str | None = None,
        labels: list[str] | None = None,
        evidence_refs: list[str] | None = None,
        estimate_days: float | None = None,
        idempotency_key: str | None = None,
    ) -> dict[str, Any]:
        self._require_project(project_id)
        if not title or len(title.strip()) < 3:
            raise ValueError("title must be at least 3 characters")
        kind = self._kind(item_type)
        created = self.port.create_work(
            project_id,
            kind=kind,
            title=title.strip(),
            body=self._body(
                labels=labels,
                evidence_refs=evidence_refs,
                estimate_days=estimate_days,
            ),
            assignee=actor.id,
            created_by=actor.id,
            parent_id=parent_ref,
            idempotency_key=idempotency_key,
        )
        view = self._view(created)
        try:
            self.metadata.bind_work(
                project_id,
                kind,
                view["ref"],
                initiative_ref=None,
                actor=actor,
            )
        except Exception:
            raise CanonicalWorkPartialError(view) from None
        view = self._overlay_items(project_id, [view])[0]
        self._audit(
            actor=actor,
            action="workitem.created",
            subject=view["ref"],
            detail={"kind": kind, "canonical": True},
        )
        return view

    def list(
        self,
        project_id: str,
        *,
        status: WorkItemStatus | str | None = None,
    ) -> list[dict[str, Any]]:
        self._require_project(project_id, include_disabled=True)
        wanted = None
        if status is not None:
            wanted = status.value if isinstance(status, WorkItemStatus) else str(status)
            wanted = WorkItemStatus(wanted).value
        items = self._overlay_items(project_id, self.port.list_work(project_id))
        if wanted is not None:
            items = [item for item in items if item["status"] == wanted]
        return items

    def get(self, project_id: str, ref: str) -> dict[str, Any] | None:
        for item in self.list(project_id):
            if item["ref"] == ref:
                return item
        return None

    def detail(self, project_id: str, ref: str) -> dict[str, Any] | None:
        items = self.list(project_id)
        item = next((row for row in items if row["ref"] == ref), None)
        if item is None:
            return None
        parent_ref = item.get("parent_task_id") or item.get("parent_id")
        parent = (
            next((row for row in items if row["ref"] == parent_ref), None)
            if parent_ref
            else None
        )
        children = [
            row
            for row in items
            if (row.get("parent_task_id") or row.get("parent_id")) == ref
        ]
        history = item.get("history") or item.get("events") or []
        return {
            "work_item": item,
            "parent": parent,
            "children": children,
            "history": history if isinstance(history, list) else [],
        }

    def transition(
        self,
        project_id: str,
        ref: str,
        new_status: WorkItemStatus | str,
        *,
        actor: Actor,
    ) -> dict[str, Any]:
        self._require_project(project_id)
        target = (
            new_status.value
            if isinstance(new_status, WorkItemStatus)
            else WorkItemStatus(str(new_status)).value
        )
        current = self.get(project_id, ref)
        if current is None:
            raise ValueError(f"no such canonical work item {ref}")
        updated = self.port.transition_work(
            project_id,
            current["kind"],
            ref,
            target,
        )
        view = self._overlay_items(project_id, [self._view(updated)])[0]
        self._audit(
            actor=actor,
            action="workitem.transition",
            subject=ref,
            detail={"from": current["status"], "to": view["status"]},
        )
        return view

    def create_queued_item(
        self,
        project_id: str,
        *,
        title: str,
        item_type: WorkItemType | str,
        creator: Actor,
        assignee: Actor,
        rank: int,
        reason: str,
        initiative_ref: str | None = None,
        idempotency_key: str | None = None,
    ) -> tuple[dict[str, Any], dict[str, Any]]:
        settings = self._require_project(project_id)
        if settings.get("phase") != "active":
            raise ValueError(
                f"project {project_id} is {settings.get('phase')}; resume it before adding work"
            )
        if not title or len(title.strip()) < 3:
            raise ValueError("title must be at least 3 characters")
        if rank < 1:
            raise ValueError("backlog rank must be at least 1")
        if len(reason.strip()) < 4:
            raise ValueError("backlog additions require a priority reason")
        if creator.id == assignee.id:
            raise ValueError("assignee must be distinct from the creator")
        kind = self._kind(item_type)
        relation = initiative_ref.strip() if initiative_ref else None
        if relation:
            try:
                initiative = self.stewardship.initiative_by_ref(relation)
            except ServiceError as exc:
                raise ValueError(str(exc)) from exc
            if initiative["project_id"] != project_id:
                raise ValueError(
                    f"initiative {relation} belongs to another project"
                )
        created = self.port.create_work(
            project_id,
            kind=kind,
            title=title.strip(),
            body=None,
            assignee=assignee.id,
            created_by=creator.id,
            parent_id=None,
            idempotency_key=idempotency_key,
        )
        view = self._view(created)
        try:
            entry = self.metadata.create_binding_and_queue(
                project_id,
                kind,
                view["ref"],
                rank=rank,
                reason=reason,
                initiative_ref=relation,
                actor=creator,
            )
        except Exception:
            raise CanonicalWorkPartialError(view) from None
        view = self._overlay_items(project_id, [view])[0]
        self._audit(
            actor=creator,
            action="backlog.item_created",
            subject=view["ref"],
            detail={
                "assignee": assignee.id,
                "initiative_ref": relation,
                "rank": entry["rank"],
                "reason": entry["priority_reason"],
                "canonical": True,
            },
        )
        return view, entry

    def backlog_add(
        self,
        project_id: str,
        ref: str,
        rank: int,
        *,
        reason: str,
        actor: Actor,
    ) -> dict[str, Any]:
        self._require_project(project_id)
        current = self.get(project_id, ref)
        if current is None:
            raise ValueError(f"no such canonical work item {ref}")
        entry = self.metadata.create_binding_and_queue(
            project_id,
            current["kind"],
            ref,
            rank=rank,
            reason=reason,
            initiative_ref=current.get("initiative_ref"),
            actor=actor,
        )
        self._audit(
            actor=actor,
            action="backlog.added",
            subject=ref,
            detail={"rank": entry["rank"], "reason": entry["priority_reason"]},
        )
        return entry

    def backlog_list(self, project_id: str) -> list[dict[str, Any]]:
        self._require_project(project_id, include_disabled=True)
        return self.metadata.list_backlog(project_id)

    def backlog_rerank(
        self,
        project_id: str,
        ref: str,
        new_rank: int,
        *,
        reason: str,
        actor: Actor,
    ) -> dict[str, Any]:
        self._require_project(project_id)
        audit = self.metadata.rerank(
            project_id,
            ref,
            new_rank,
            reason,
            actor=actor,
        )
        self._audit(
            actor=actor,
            action="backlog.rerank",
            subject=ref,
            detail={
                "from": audit["from_rank"],
                "to": audit["to_rank"],
                "reason": audit["reason"],
            },
        )
        return audit

    def _audit(
        self,
        *,
        actor: Actor,
        action: str,
        subject: str,
        detail: dict[str, Any] | None = None,
    ) -> None:
        self.store.audit(
            actor=actor.id,
            interface=f"dockyard:{actor.kind.value}",
            action=action,
            subject=subject,
            detail=detail,
        )
