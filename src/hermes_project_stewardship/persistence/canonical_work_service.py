"""Canonical Hermes work service for Dockyard.

This service owns Dockyard's production work-item seam. Hermes Project/Kanban
records remain authoritative for task and epic state. Dockyard writes only its
own governance metadata around those canonical records.
"""
from __future__ import annotations
from datetime import date

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

    def unlink_work(
        self,
        project_id: str,
        parent_id: str,
        child_id: str,
    ) -> dict[str, Any]: ...

    def list_work_links(
        self,
        project_id: str,
        item_id: str,
    ) -> list[dict[str, Any]]: ...

    def update_work(
        self,
        project_id: str,
        current_kind: str,
        item_id: str,
        **changes: Any,
    ) -> dict[str, Any]: ...

    def assign_work(
        self,
        project_id: str,
        kind: str,
        item_id: str,
        assignee: str | None,
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
_UNSET = object()


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
        details = self.metadata.details(project_id)
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
            planning = details.get(view["ref"], {})
            view["labels"] = list(planning.get("labels") or [])
            view["evidence_refs"] = list(planning.get("evidence_refs") or [])
            view["estimate_days"] = planning.get("estimate_days")
            view["due"] = planning.get("due")
            output.append(view)
        return output

    @staticmethod
    def _body(
        *,
        body: str | None = None,
        labels: list[str] | None,
        evidence_refs: list[str] | None,
        estimate_days: float | None,
    ) -> str | None:
        lines: list[str] = []
        if body and body.strip():
            lines.append(body.strip())
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
        body: str | None = None,
        parent_ref: str | None = None,
        labels: list[str] | None = None,
        evidence_refs: list[str] | None = None,
        estimate_days: float | None = None,
        due: str | None = None,
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
                body=body,
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
        self.metadata.upsert_details(
            project_id,
            view["ref"],
            labels=list(labels or []),
            evidence_refs=list(evidence_refs or []),
            estimate_days=estimate_days,
            due=self._validate_due(due),
            actor=actor,
        )
        view = self._overlay_items(project_id, [view])[0]
        self._audit(
            actor=actor,
            action="workitem.created",
            subject=view["ref"],
            detail={"kind": kind, "canonical": True},
        )
        return view

    @staticmethod
    def _validate_due(value: str | None) -> str | None:
        if value is None or not str(value).strip():
            return None
        clean = str(value).strip()
        try:
            date.fromisoformat(clean)
        except ValueError:
            raise ValueError("due must be an ISO date (YYYY-MM-DD)") from None
        return clean

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
        by_ref = {row["ref"]: row for row in items}
        links = self.port.list_work_links(project_id, ref)
        dependencies = [
            by_ref[row["task_id"]]
            for row in links
            if row.get("direction") == "parent" and row.get("task_id") in by_ref
        ]
        dependents = [
            by_ref[row["task_id"]]
            for row in links
            if row.get("direction") == "child" and row.get("task_id") in by_ref
        ]
        return {
            "work_item": item,
            "parent": parent,
            "children": children,
            "dependencies": dependencies,
            "dependents": dependents,
            "history": history if isinstance(history, list) else [],
        }

    def update_item(
        self,
        project_id: str,
        ref: str,
        *,
        actor: Actor,
        title: Any = _UNSET,
        item_type: Any = _UNSET,
        body: Any = _UNSET,
        parent_ref: Any = _UNSET,
        labels: Any = _UNSET,
        evidence_refs: Any = _UNSET,
        estimate_days: Any = _UNSET,
        due: Any = _UNSET,
    ) -> dict[str, Any]:
        self._require_project(project_id)
        current = self.get(project_id, ref)
        if current is None:
            raise ValueError(f"no such canonical work item {ref}")
        changes: dict[str, Any] = {}
        changed_fields: list[str] = []
        if title is not _UNSET:
            if not isinstance(title, str) or len(title.strip()) < 3:
                raise ValueError("title must be at least 3 characters")
            changes["title"] = title.strip()
            changed_fields.append("title")
        new_kind = current["kind"]
        if item_type is not _UNSET:
            new_kind = self._kind(str(item_type))
            if current["kind"] == "epic" or new_kind == "epic":
                raise ValueError("task/epic conversion is not supported")
            changes["kind"] = new_kind
            changed_fields.append("type")
        if body is not _UNSET:
            if body is not None and not isinstance(body, str):
                raise ValueError("body must be text or null")
            changes["body"] = body.strip() if isinstance(body, str) else None
            changed_fields.append("body")
        if parent_ref is not _UNSET:
            if parent_ref == ref:
                raise ValueError("a task cannot be its own parent")
            if parent_ref is not None and self.get(project_id, str(parent_ref)) is None:
                raise ValueError("parent task belongs to another project or is missing")
            changes["parent_id"] = parent_ref
            changed_fields.append("parent_ref")

        planning = {
            "labels": list(current.get("labels") or []),
            "evidence_refs": list(current.get("evidence_refs") or []),
            "estimate_days": current.get("estimate_days"),
            "due": current.get("due"),
        }
        if labels is not _UNSET:
            if not isinstance(labels, list) or any(not isinstance(v, str) for v in labels):
                raise ValueError("labels must be a list of text values")
            planning["labels"] = [value.strip() for value in labels if value.strip()]
            changed_fields.append("labels")
        if evidence_refs is not _UNSET:
            if not isinstance(evidence_refs, list) or any(
                not isinstance(v, str) for v in evidence_refs
            ):
                raise ValueError("evidence_refs must be a list of text values")
            planning["evidence_refs"] = [
                value.strip() for value in evidence_refs if value.strip()
            ]
            changed_fields.append("evidence_refs")
        if estimate_days is not _UNSET:
            if estimate_days is not None and (
                not isinstance(estimate_days, (int, float)) or estimate_days < 0
            ):
                raise ValueError("estimate_days must be non-negative or null")
            planning["estimate_days"] = estimate_days
            changed_fields.append("estimate_days")
        if due is not _UNSET:
            planning["due"] = self._validate_due(due)
            changed_fields.append("due")
        if not changed_fields:
            raise ValueError("at least one work-item field is required")

        updated = self.port.update_work(
            project_id,
            current["kind"],
            ref,
            **changes,
        )
        if new_kind != current["kind"]:
            self.metadata.rekey_kind(project_id, ref, current["kind"], new_kind)
        self.metadata.upsert_details(
            project_id,
            ref,
            labels=planning["labels"],
            evidence_refs=planning["evidence_refs"],
            estimate_days=planning["estimate_days"],
            due=planning["due"],
            actor=actor,
        )
        view = self._overlay_items(project_id, [self._view(updated)])[0]
        self._audit(
            actor=actor,
            action="workitem.updated",
            subject=ref,
            detail={"fields": changed_fields},
        )
        return view

    def assign_item(
        self,
        project_id: str,
        ref: str,
        assignee: str | None,
        *,
        actor: Actor,
    ) -> dict[str, Any]:
        self._require_project(project_id)
        current = self.get(project_id, ref)
        if current is None:
            raise ValueError(f"no such canonical work item {ref}")
        clean = assignee.strip() if isinstance(assignee, str) and assignee.strip() else None
        updated = self.port.assign_work(
            project_id,
            current["kind"],
            ref,
            clean,
        )
        view = self._overlay_items(project_id, [self._view(updated)])[0]
        self._audit(
            actor=actor,
            action="workitem.assigned",
            subject=ref,
            detail={"from": current.get("assignee"), "to": clean},
        )
        return view

    def add_dependency(
        self,
        project_id: str,
        ref: str,
        dependency_ref: str,
        *,
        actor: Actor,
    ) -> dict[str, Any]:
        self._require_project(project_id)
        current = self.get(project_id, ref)
        dependency = self.get(project_id, dependency_ref)
        if current is None or dependency is None:
            raise ValueError("dependency task belongs to another project or is missing")
        if current["kind"] == "epic" or dependency["kind"] == "epic":
            raise ValueError("task dependencies cannot target epics")
        result = self.port.link_work(project_id, dependency_ref, ref)
        self._audit(
            actor=actor,
            action="workitem.dependency_added",
            subject=ref,
            detail={"dependency": dependency_ref},
        )
        return result

    def remove_dependency(
        self,
        project_id: str,
        ref: str,
        dependency_ref: str,
        *,
        actor: Actor,
    ) -> dict[str, Any]:
        self._require_project(project_id)
        if self.get(project_id, ref) is None or self.get(project_id, dependency_ref) is None:
            raise ValueError("dependency task belongs to another project or is missing")
        result = self.port.unlink_work(project_id, dependency_ref, ref)
        self._audit(
            actor=actor,
            action="workitem.dependency_removed",
            subject=ref,
            detail={"dependency": dependency_ref},
        )
        return result

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
