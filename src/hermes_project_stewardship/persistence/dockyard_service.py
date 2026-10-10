"""Project Stewardship service layer: business rules over DockyardStore.

TE-01 pattern: constructed on the SAME Store as StewardshipService, so
platform work-items and stewardship state share one canonical backend.
Enforces PRD rules that span domain + persistence:
- PM-02: every mutation records actor identity + kind (human|bot).
- PM-03: backlog rank changes carry reasons (delegated to BacklogEntry).
- Hierarchy/type rules delegated to WorkItem.set_parent.
"""
from __future__ import annotations

import io
import csv
import json
import math
from datetime import date, datetime, timezone

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
from ..dockyard.bots import Bot
from ..kanban.host_adapter import MISSING_LINK_CODES, KanbanAdapterError
from .dockyard_store import DockyardStore
from .planning import forecast_milestone
from .service import ServiceError, StewardshipService

from .store import Store


import threading as _threading

_PROMOTION_LOCK = _threading.Lock()


class DockyardService:
    def __init__(self, store: Store, *, canonical_work=None) -> None:
        self.store = store
        self.dy = DockyardStore(store)
        self.canonical_work = canonical_work
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
                    estimate_days: Optional[float] = None,
                    body: Optional[str] = None,
                    due: Optional[str] = None,
                    idempotency_key: Optional[str] = None) -> WorkItem:
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
    # CSV hierarchy import (Phase 6)                                    #
    # ------------------------------------------------------------------ #

    CSV_COLUMNS = ("row_key", "type", "title", "parent_key", "labels",
                   "estimate_days", "due")
    CSV_COLUMN_METADATA = (
        {"name": "row_key", "required": True, "description": "Stable unique key for this import row.", "format": "text", "example": "release-1"},
        {"name": "type", "required": True, "description": "Work item type.", "format": "epic|feature|task|bug|subtask|spike", "example": "task"},
        {"name": "title", "required": True, "description": "Item title (at least 3 characters).", "format": "text", "example": "Verify release checklist"},
        {"name": "parent_key", "required": False, "description": "row_key of a parent in this file.", "format": "text", "example": "release-epic"},
        {"name": "labels", "required": False, "description": "Semicolon-separated labels.", "format": "label;label", "example": "release;qa"},
        {"name": "estimate_days", "required": False, "description": "Non-negative delivery estimate.", "format": "number >= 0", "example": "2"},
        {"name": "due", "required": False, "description": "Due date.", "format": "YYYY-MM-DD", "example": "2026-10-08"},
    )

    def backlog_csv_template(self) -> str:
        return ",".join(self.CSV_COLUMNS) + "\n"

    def preview_csv_import(self, project_id: str, content: str) -> dict:
        if len(content.encode("utf-8")) > 1_048_576:
            raise ValueError("CSV import exceeds the 1048576 byte limit")
        reader = csv.DictReader(io.StringIO(content))
        missing = [column for column in ("row_key", "type", "title")
                   if column not in (reader.fieldnames or [])]
        if missing:
            raise ValueError("CSV is missing required columns: " + ", ".join(missing))
        unknown = [column for column in (reader.fieldnames or [])
                   if column not in self.CSV_COLUMNS and column != "initiative_ref"]
        if unknown:
            raise ValueError("CSV has unsupported columns: " + ", ".join(unknown))
        rows = list(reader)
        seen: set[str] = set()
        errors: list[dict] = []
        for index, row in enumerate(rows, 2):
            key = str(row.get("row_key") or "").strip()
            item_type = str(row.get("type") or "").strip().lower()
            title = str(row.get("title") or "").strip()
            if not key or key in seen:
                errors.append({"row": index, "field": "row_key", "error": "missing or duplicate row_key"})
            seen.add(key)
            if item_type not in {value.value for value in WorkItemType}:
                errors.append({"row": index, "field": "type", "error": "unsupported work type"})
            if len(title) < 3:
                errors.append({"row": index, "field": "title", "error": "title must be at least 3 characters"})
            # Older templates offered initiative_ref but the canonical importer
            # never persisted it. Reject rather than silently dropping data.
            if str(row.get("initiative_ref") or "").strip():
                errors.append({"row": index, "field": "initiative_ref", "error": "initiative_ref is not supported by bulk import; link the item after import"})
            estimate = str(row.get("estimate_days") or "").strip()
            if estimate:
                try:
                    value = float(estimate)
                    if not math.isfinite(value) or value < 0:
                        raise ValueError
                except (TypeError, ValueError):
                    errors.append({"row": index, "field": "estimate_days", "error": "estimate_days must be a finite non-negative number"})
            due = str(row.get("due") or "").strip()
            if due:
                try:
                    date.fromisoformat(due)
                except ValueError:
                    errors.append({"row": index, "field": "due", "error": "due must be an ISO date (YYYY-MM-DD)"})
            parent = str(row.get("parent_key") or "").strip()
            if parent and parent not in {str(item.get("row_key") or "").strip() for item in rows}:
                errors.append({"row": index, "field": "parent_key", "error": "parent_key is not in this import"})
        # Validate hierarchy in memory, including cycles, before writing.
        parent_map = {str(row.get("row_key") or "").strip(): str(row.get("parent_key") or "").strip()
                      for row in rows}
        for key in parent_map:
            path: set[str] = set()
            cursor = key
            while cursor:
                if cursor in path:
                    errors.append({"row": key, "field": "parent_key", "error": "hierarchy cycle"})
                    break
                path.add(cursor)
                cursor = parent_map.get(cursor, "")
        return {"valid": not errors, "row_count": len(rows), "errors": errors,
                "rows": rows, "columns": list(reader.fieldnames or [])}

    def import_csv(self, project_id: str, content: str, *, actor: Actor) -> dict:
        preview = self.preview_csv_import(project_id, content)
        if not preview["valid"]:
            return {"imported": 0, "failed": preview["row_count"], "preview": preview}
        # Parent-first deterministic order guarantees all containment links exist.
        rows = preview["rows"]
        pending = list(rows)
        created: dict[str, str] = {}
        imported: list[dict] = []
        while pending:
            progressed = False
            for row in pending[:]:
                parent_key = str(row.get("parent_key") or "").strip()
                if parent_key and parent_key not in created:
                    continue
                parent_ref = created.get(parent_key) if parent_key else None
                if self.canonical_work is not None:
                    # Canonical lane: materialise into the Kanban-backed work
                    # list so imported hierarchy appears in the Backlog tree
                    # and obeys the same containment/bridge contracts as
                    # manually created items.
                    due = str(row.get("due") or "").strip() or None
                    view = self.canonical_work.create_item(
                        project_id, WorkItemType(str(row["type"]).strip().lower()),
                        str(row["title"]).strip(), actor=actor,
                        parent_ref=parent_ref,
                        labels=[value.strip() for value in str(row.get("labels") or "").split(";") if value.strip()],
                        estimate_days=float(row["estimate_days"]) if row.get("estimate_days") else None,
                        due=due,
                        idempotency_key=(
                            f"backlog-import:{project_id}:"
                            f"{str(row['row_key']).strip()}"),
                    )
                    ref = view["ref"]
                else:
                    item = self.create_item(
                        project_id, WorkItemType(str(row["type"]).strip().lower()),
                        str(row["title"]).strip(), actor=actor,
                        parent_ref=parent_ref,
                        labels=[value.strip() for value in str(row.get("labels") or "").split(";") if value.strip()],
                        estimate_days=float(row["estimate_days"]) if row.get("estimate_days") else None,
                    )
                    ref = item.ref
                created[str(row["row_key"]).strip()] = ref
                imported.append({"row_key": str(row["row_key"]).strip(), "ref": ref})
                pending.remove(row)
                progressed = True
            if not progressed:
                raise ValueError("CSV hierarchy could not be ordered safely")
        return {"imported": len(imported), "failed": 0, "preview": preview, "items": imported}


    def _audit(self, *, actor, action: str, subject: str,
               detail: Optional[dict] = None) -> None:

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

    def _active_milestone(self, project_id: str, name: str) -> Dict:
        milestone = self.dy.milestone_progress(project_id, name)
        if milestone.get("archived_at"):
            raise ValueError(f"milestone {name} is archived; restore it before editing")
        return milestone

    def milestone_attach(self, project_id: str, name: str, ref: str, *,
                         actor: Actor) -> None:
        # Refuse attaching to non-existent milestones or phantom canonical work.
        self._active_milestone(project_id, name)
        item = (
            self.canonical_work.get(project_id, ref)
            if self.canonical_work is not None
            else self._by_ref(project_id, ref)
        )
        if item is None:
            raise ValueError(f"no such work item {ref} in {project_id}")
        self.dy.milestone_attach(project_id, name, ref)
        self._audit(actor=actor, action="milestone.attached",
                    subject=name, detail={"item": ref})

    def milestone_progress(self, project_id: str, name: str) -> Dict:
        if self.canonical_work is None:
            return self.dy.milestone_progress(project_id, name)
        row = self.store._conn.execute(
            "SELECT id, due, created_at, closed_at, archived_at, archived_by"
            " FROM dockyard_milestones "
            "WHERE project_id=? AND name=?",
            (project_id, name),
        ).fetchone()
        if row is None:
            raise ValueError(f"milestone {name} not found")
        refs = self.store._conn.execute(
            "SELECT item_ref FROM dockyard_milestone_items WHERE milestone_id=?",
            (row["id"],),
        ).fetchall()
        items = self.canonical_work.list(project_id)
        statuses = {
            item["ref"]: item
            for item in items
        }
        attached = [str(item["item_ref"]) for item in refs]
        done = sum(1 for ref in attached
                   if (statuses.get(ref) or {}).get("status") == "done")
        blocked = [ref for ref in attached
                   if (statuses.get(ref) or {}).get("status") == "blocked"]
        # P9.3: dependency blockers — undone dependencies per attached item.
        blockers: Dict[str, list] = {}
        for ref in attached:
            if (statuses.get(ref) or {}).get("status") == "done":
                continue
            detail = self.canonical_work.detail(project_id, ref)
            undone = [
                dep["ref"] for dep in (detail or {}).get("dependencies", [])
                if dep.get("status") != "done"
            ]
            if undone:
                blockers[ref] = undone
        # P9.3: assignee WIP — in-progress count per assignee (item counts,
        # NOT hours). Mixed assignments sum per person.
        assignee_wip: Dict[str, int] = {}
        for ref in attached:
            item = statuses.get(ref) or {}
            if item.get("status") != "in_progress":
                continue
            who = item.get("assignee") or item.get("assignee_id") or "unassigned"
            assignee_wip[who] = assignee_wip.get(who, 0) + 1
        progress = {
            "id": row["id"],
            "name": name,
            "total": len(attached),
            "done": done,
            "closed": bool(row["closed_at"]),
            "due": row["due"],
            "created_at": row["created_at"],
            "archived_at": row["archived_at"],
            "archived_by": row["archived_by"],
            "item_refs": attached,
            # P9.3 additions (counts, never hours):
            "committed": len(attached),
            "blocked": len(blocked),
            "blockers": blockers,
            "assignee_wip": assignee_wip,
            "units": "items",
        }
        # P9.5: what threatens this milestone — overdue/blocked/due-passed
        # risks, each linking the blocking work item ref (drill-down target).
        progress["risks"] = self._milestone_risks(
            project_id, row["due"], attached, statuses, blockers)
        # P9.4: pure read-model forecast (counts; no scheduler, no promises).
        progress["forecast"] = forecast_milestone(
            remaining=len(attached) - done,
            done_items=[
                item for item in items if item.get("status") == "done"
            ],
            today=None,
        )
        return progress

    @staticmethod
    def _milestone_risks(project_id, due, attached, statuses, blockers) -> list:
        from .store import utcnow

        risks = []
        today = utcnow().date()
        due_date = None
        if due:
            try:
                due_date = date.fromisoformat(str(due)[:10])
            except ValueError:
                due_date = None
        for ref in attached:
            item = statuses.get(ref) or {}
            status = item.get("status")
            item_due = item.get("due")
            if status == "done":
                continue
            if ref in blockers:
                risks.append({
                    "kind": "dependency_blocker",
                    "item": ref,
                    "blockers": blockers[ref],
                    "owner": item.get("assignee") or "unassigned",
                })
            elif item_due:
                try:
                    if date.fromisoformat(str(item_due)[:10]) < today:
                        risks.append({
                            "kind": "overdue_item",
                            "item": ref,
                            "owner": item.get("assignee") or "unassigned",
                        })
                except ValueError:
                    pass
        if due_date is not None and due_date < today and attached:
            remaining = sum(1 for ref in attached
                            if (statuses.get(ref) or {}).get("status") != "done")
            if remaining:
                risks.append({
                    "kind": "milestone_overdue",
                    "item": None,
                    "remaining": remaining,
                })
        return risks

    def milestone_list(self, project_id: str, *, include_archived: bool = False) -> list:
        if self.canonical_work is None:
            return self.dy.milestone_list(project_id, include_archived=include_archived)
        archive_clause = "" if include_archived else " AND archived_at IS NULL"
        rowset = self.store._conn.execute(
            "SELECT id, name, due, created_at, closed_at, archived_at, archived_by"
            f" FROM dockyard_milestones WHERE project_id=?{archive_clause}"
            " ORDER BY CASE WHEN archived_at IS NULL THEN 0 ELSE 1 END,"
            " CASE WHEN closed_at IS NULL THEN 0 ELSE 1 END, due, name",
            (project_id,),
        ).fetchall()
        statuses = {
            item["ref"]: item["status"]
            for item in self.canonical_work.list(project_id)
        }
        out = []
        for row in rowset:
            refs = self.store._conn.execute(
                "SELECT item_ref FROM dockyard_milestone_items WHERE milestone_id=?"
                " ORDER BY item_ref",
                (row["id"],),
            ).fetchall()
            attached = [str(item["item_ref"]) for item in refs]
            out.append({
                "id": row["id"],
                "name": row["name"],
                "due": row["due"],
                "created_at": row["created_at"],
                "closed": bool(row["closed_at"]),
                "archived_at": row["archived_at"],
                "archived_by": row["archived_by"],
                "item_refs": attached,
                "total": len(attached),
                "done": sum(1 for ref in attached if statuses.get(ref) == "done"),
            })
        return out

    def milestone_update(self, project_id: str, name: str, *, due: Optional[str],
                         closed: Optional[bool], actor: Actor) -> None:
        # Validated update: refuses phantom milestones, writes audit trail.
        self._active_milestone(project_id, name)
        self.dy.milestone_update(project_id, name, due=due, closed=closed)
        self._audit(actor=actor, action="milestone.updated",
                    subject=name, detail={"due": due, "closed": closed})

    def milestone_rename(self, project_id: str, name: str, new_name: str, *,
                         actor: Actor) -> None:
        """P9.1: rename preserving milestone identity (id + attachments);
        audit trails old -> new so actor history survives the rename."""
        self._active_milestone(project_id, name)
        self.dy.milestone_rename(project_id, name, new_name)
        self._audit(actor=actor, action="milestone.renamed",
                    subject=new_name, detail={"from": name, "to": new_name})

    def milestone_detach(self, project_id: str, name: str, ref: str, *,
                         actor: Actor) -> None:
        """P9.1: scope change — remove a work-attachment (audited)."""
        self._active_milestone(project_id, name)
        self.dy.milestone_detach(project_id, name, ref)
        self._audit(actor=actor, action="milestone.detached",
                    subject=name, detail={"item": ref})

    def milestone_archive(self, project_id: str, name: str, *, actor: Actor) -> Dict:
        self._active_milestone(project_id, name)
        self.dy.milestone_archive(project_id, name, actor=actor.id)
        self._audit(actor=actor, action="milestone.archived", subject=name)
        return self.milestone_progress(project_id, name)

    def milestone_restore(self, project_id: str, name: str, *, actor: Actor) -> Dict:
        self.dy.milestone_progress(project_id, name)
        self.dy.milestone_restore(project_id, name)
        self._audit(actor=actor, action="milestone.restored", subject=name)
        return self.milestone_progress(project_id, name)

    def milestone_delete(self, project_id: str, name: str, *, actor: Actor) -> Dict:
        """Delete an archived milestone for good (design round f, Option B).

        Archive first, then delete: an active milestone is refused. The work
        items stay; only their grouping goes, as do the initiative links. The
        name is free again. The audit row keeps what the milestone held.
        """
        held = self.dy.milestone_delete(project_id, name)
        self._audit(actor=actor, action="milestone.deleted", subject=name,
                    detail={"items": held["items"], "initiatives": held["initiatives"]})
        return {"name": name, "deleted": True, "items": held["items"],
                "initiatives": held["initiatives"]}

    # ------------------------------------------------------------------ #
    # Saved views (PM-05)                                                #
    # ------------------------------------------------------------------ #

    def view_save(self, project_id: str, name: str, layout: str, *,
                  filters: Dict, actor: Actor,
                  shared: bool = False) -> None:
        from .view_query import QuerySchemaError, validate_query

        try:
            validated = validate_query(filters)
        except QuerySchemaError as e:
            raise ServiceError(f"saved view query invalid: {e}") from None
        self.dy.view_save(project_id, name, layout, filters=validated,
                          owner_id=actor.id, shared=shared)

    def views_list(self, project_id: str, *, actor: Actor) -> List[Dict]:
        # Fetch all rows then filter here: role-aware sharing needs to read
        # shared_with from filters_json, which SQL can't match cleanly.
        views = self.dy.views_list(project_id, include_private_of=None)
        visible = []
        for v in views:
            shared_with = (v.get("filters") or {}).get("shared_with") or []
            if (v.get("shared")
                    or v.get("owner") == actor.id
                    or actor.id in shared_with):
                # Tell the screen which views the caller owns, so
                # Rename, Share and Delete show only where they will work.
                visible.append({**v, "mine": v.get("owner") == actor.id})
        return visible

    def view_delete(self, project_id: str, name: str, *, actor: Actor) -> Dict:
        """Delete a saved view by name; only its owner may delete it."""
        visible = self.views_list(project_id, actor=actor)
        if not any(v["name"] == name for v in visible):
            raise ServiceError(f"no such view '{name}' in {project_id}")
        all_views = self.dy.views_list(project_id, include_private_of=None)
        owned = next((v for v in all_views if v["name"] == name), None)
        if owned is None or owned.get("owner") != actor.id:
            raise ServiceError(
                f"saved view '{name}' is owned by another actor; only its owner can delete it"
            )
        deleted = self.dy.view_delete(project_id, name, owner_id=actor.id)
        if not deleted:
            raise ServiceError(f"no such view '{name}' in {project_id}")
        return {"name": name, "deleted": True}

    def view_items(self, project_id: str, name: str, *,
                   actor: Actor) -> List[Dict]:
        """Run a saved view's query and return the matching work items."""
        from .view_query import QuerySchemaError, apply_query, validate_query

        views = self.views_list(project_id, actor=actor)
        view = next((v for v in views if v["name"] == name), None)
        if view is None:
            raise ServiceError(f"no such view '{name}' in {project_id}")
        query = view.get("filters") or {}
        try:
            query = validate_query(query)
            if self.canonical_work is not None:
                items = [dict(x) for x in self.canonical_work.list(project_id)]
            else:
                from dataclasses import asdict
                from enum import Enum
                items = [asdict(w) for w in self.dy.list_items(project_id)]
                # Normalise enum values so filters compare by string.
                for item in items:
                    if isinstance(item.get("status"), Enum):
                        item["status"] = item["status"].value
        except QuerySchemaError as e:
            raise ServiceError(f"saved view query invalid: {e}") from None
        milestone_map: Dict[str, str] = {}
        if query.get("milestone"):
            # One query for the filtered milestone only — no per-milestone
            # loop (cor-002). An empty result legitimately yields an empty
            # map, which must filter to nothing, not be skipped.
            row = self.store._conn.execute(
                "SELECT mi.item_ref AS ref"
                " FROM dockyard_milestones m"
                " JOIN dockyard_milestone_items mi ON mi.milestone_id=m.id"
                " WHERE m.project_id=? AND m.name=?",
                (project_id, query["milestone"]),
            ).fetchall()
            for r in row:
                milestone_map[str(r["ref"])] = query["milestone"]
        # Pass the map even when empty: an empty map is a legitimate
        # "milestone has no items" state and must filter to nothing —
        # None would silently skip the filter.
        return apply_query(items, query,
                           milestone_map if query.get("milestone") else None)

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

        from . import report_words as words
        from .service import StewardshipService
        from .store import iso

        if report_type not in {"executive", "delivery", "risk", "full"}:
            raise ValueError(
                "report_type must be executive, delivery, risk, or full"
            )

        steward = StewardshipService(self.store)
        settings = steward.settings(project_id)
        work_items = (
            self.canonical_work.list(project_id)
            if self.canonical_work is not None
            else self.list(project_id)
        )
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
                "SELECT ts, event_type, subject, payload_json, emitted_by FROM domain_events "
                "WHERE project_id=? ORDER BY id DESC LIMIT 20",
                (project_id,),
            ).fetchall()

        def clean(value) -> str:
            text = str(value or "").replace("|", "\\|").replace("`", "\\`")
            return " ".join(text.split())

        def item_value(item, name: str, default=None):
            if isinstance(item, dict):
                return item.get(name, default)
            return getattr(item, name, default)

        def item_status(item) -> str:
            value = item_value(item, "status", "backlog")
            return str(getattr(value, "value", value))

        def item_assignee(item) -> str:
            value = item_value(item, "assignee")
            if value is None:
                return "Unassigned"
            return str(getattr(value, "id", value))

        status_counts = {
            status: sum(1 for item in work_items if item_status(item) == status)
            for status in ("backlog", "in_progress", "in_review", "done", "blocked")
        }
        # Proposals waiting for a decision. Every new proposal starts as
        # pending_approval (C7 06/10: this read "awaiting_approval", a status
        # no initiative has, so every report said 0).
        pending = [
            item for item in initiatives
            if item.get("status") in {"proposed", "pending_approval"}
        ]
        blocked = [item for item in work_items if item_status(item) == "blocked"]
        open_alerts = [row for row in notifications if not row["acked_at"]]

        generated_at = iso()
        title = f"{project_id} {report_type} report"
        lines = [
            f"# {title}",
            "",
            f"Generated: {words.when(generated_at)}",
            f"Generated by: {clean(actor.id)}",
            "",
            "## Configuration",
            "",
            f"- Mission: {clean(settings.get('mission')) or 'Not set'}",
            f"- Phase: {clean(words.sentence(settings.get('phase'))) or 'Not set'}",
            f"- Lead: {clean(settings['owner'].get('lead_profile')) or 'Not assigned'}",
            "- Members: " + (
                ", ".join(clean(profile) for profile in settings["owner"].get("member_profiles", []))
                or "None"
            ),
            f"- Autonomy level: {settings.get('autonomy_level', 0)}",
            f"- Verification policy: {clean(words.policy(settings['policies'].get('verification')))}",
            f"- Release policy: {clean(words.policy(settings['policies'].get('release')))}",
            f"- Notification policy: {clean(words.policy(settings['policies'].get('notification')))}",
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
                        assignee = item_assignee(item)
                        lines.append(
                            f"| {clean(item_value(item, 'ref'))} | "
                            f"{clean(item_value(item, 'title'))} | "
                            f"{clean(words.work_status(item_status(item)))} | {clean(assignee)} |"
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
                lines.append(
                    f"- Blocked: {clean(item_value(item, 'ref'))} "
                    f"{clean(item_value(item, 'title'))}"
                )
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
                initiative_names = {
                    str(item.get("ref")): str(item.get("title") or "") for item in initiatives
                }
                work_names = {
                    str(item_value(item, "ref")): str(item_value(item, "title") or "") for item in work_items
                }
                for event in events:
                    try:
                        payload = json.loads(event["payload_json"] or "{}")
                    except ValueError:
                        payload = {}
                    if not isinstance(payload, dict):
                        payload = {}
                    parts = [
                        clean(words.event(event["event_type"], payload)),
                        clean(words.detail(event["event_type"], event["subject"], payload,
                                           initiatives=initiative_names, work=work_names)),
                        f"by {clean(words.actor(event['emitted_by'], payload))}",
                    ]
                    lines.append(
                        f"- {clean(words.when(event['ts']))} — "
                        + " · ".join(part for part in parts if part)
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

        StewardshipService(self.store).settings(project_id, include_disabled=True)
        return self.dy.reports_list(project_id, limit=limit)

    def report_get(self, project_id: str, report_id: str) -> Dict:
        from .service import StewardshipService

        StewardshipService(self.store).settings(project_id, include_disabled=True)
        report = self.dy.report_get(project_id, report_id)
        if report is None:
            raise ValueError(f"report {report_id} not found for {project_id}")
        return report

    # ------------------------------------------------------------------ #
    # Bot registry + groups (BM-01/02) — G2 P2                           #
    # ------------------------------------------------------------------ #

    def bot_register(self, bot_id: str, display_name: str, *,
                     capabilities: Optional[List[str]] = None,
                     profile: Optional[str] = None) -> Bot:
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
            linked = True
            if self.canonical_work is not None:
                work = self._linked_work(pid)
                linked = work is not None
                by: Dict[str, int] = {}
                for item in work or ():
                    status = str(item["status"])
                    by[status] = by.get(status, 0) + 1
            else:
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
                "linked": linked,
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

    def fleet_search(self, query: str, *, limit: int = 30) -> Dict:
        """Bounded cross-project title search. Never search private content bodies.

        Uses the canonical Work projection when configured, as the Work tab
        does; avoids stale duplicate work-item tables. Each result has an
        existing exact-context deep link that the Desktop router understands.
        """
        term = str(query or "").strip().casefold()
        if len(term) < 2 or len(term) > 100:
            raise ValueError("search query must contain 2–100 characters")
        limit = max(1, min(int(limit), 50))
        projects = self.store._conn.execute(
            "SELECT project_id FROM project_stewardship ORDER BY project_id"
        ).fetchall()
        results: List[Dict] = []
        for row in projects:
            pid = row["project_id"]
            if term in pid.casefold():
                results.append({"kind": "project", "project": pid,
                                "title": pid, "ref": pid,
                                "deep_link": f"s1:project/{pid}"})
            if self.canonical_work is not None:
                work = self._linked_work(pid) or []
            else:
                work = [dict(row) for row in self.store._conn.execute(
                    "SELECT ref, title FROM dockyard_work_items"
                    " WHERE project_id=? ORDER BY id DESC", (pid,)
                ).fetchall()]
            for item in work:
                ref, title = str(item.get("ref") or ""), str(item.get("title") or "")
                if term in title.casefold() or term in ref.casefold():
                    results.append({"kind": "work", "project": pid,
                                    "title": title, "ref": ref,
                                    "deep_link": f"s2:work/{ref}"})
            initiatives = self.store._conn.execute(
                "SELECT ref, title FROM project_initiatives"
                " WHERE project_id=? ORDER BY id DESC", (pid,)
            ).fetchall()
            for item in initiatives:
                ref, title = item["ref"], item["title"]
                if term in title.casefold() or term in ref.casefold():
                    results.append({"kind": "initiative", "project": pid,
                                    "title": title, "ref": ref,
                                    "deep_link": f"s6:initiative/{ref}"})
            if len(results) > limit:
                break
        return {"query": query.strip(), "results": results[:limit],
                "has_more": len(results) > limit}

    # ------------------------------------------------------------------ #
    # Notification deep-links (UX-07) — G4 P3                            #
    # ------------------------------------------------------------------ #

    def fleet_notifications(
        self,
        *,
        state: Optional[str] = None,
        kind: Optional[str] = None,
        severity: Optional[str] = None,
        project_id: Optional[str] = None,
        before_id: Optional[int] = None,
        limit: int = 100,
    ) -> Dict:
        """Cross-project notification feed (Batch E shape).

        Delegates to the shared NotificationEngine list/counts so state
        derivation, filters and deep links come from one code path.
        """
        from ..events.notifications import NotificationEngine

        ne = NotificationEngine(self.store, None)  # reads only; no svc use
        items = ne.list_notifications(
            project_id=project_id, state=state, kind=kind, severity=severity,
            before_id=before_id, limit=limit)
        return {"notifications": items, "counts": ne.counts(project_id=project_id)}

    @staticmethod
    def _deep_link(kind: str, project_id: str = "", body: str = "") -> str:
        """Exact-context link: names the object, never a generic screen.

        Approval notifications carry the initiative ref (subject rides the
        body as ``ref=…`` per the notification engine's _body); health and
        alert kinds at minimum keep their project identity. The generic
        board label is the last-resort fallback for unknown kinds only.
        """
        if kind.startswith("approval"):
            ref = ""
            for part in (body or "").split(";"):
                part = part.strip()
                if part.startswith("ref="):
                    ref = part[4:].strip()
                    break
            if ref:
                return f"s6:initiative/{ref}"
            if project_id:
                return f"s4:project/{project_id}"
            return "s4:approval-inbox"
        if "health" in kind or "regression" in kind:
            if project_id:
                return f"s1:project/{project_id}"
            return "s1:dashboard"
        if "handoff" in kind or "a2a" in kind:
            return "s5:bot-teams"
        if project_id:
            return f"s2:project/{project_id}"
        return "s2:project-board"

    def ack_notification(self, notification_id: int) -> None:
        """One ack code path (review small fix): delegate to the engine so
        the actor is recorded and an audit row is written."""
        from ..events.notifications import NotificationEngine

        NotificationEngine(self.store, None).ack(notification_id, actor="dockyard")

    # ------------------------------------------------------------------ #
    # Portfolio rollup (release-cut feature)                              #
    # ------------------------------------------------------------------ #

    _STALLED_AFTER_DAYS = 14

    _UNLINKED = MISSING_LINK_CODES

    def _linked_work(self, project_id: str) -> Optional[List[Dict]]:
        """Canonical work for one project; None when Hermes has no such project.

        One unlinked project must not take the fleet pages down, so callers
        flag it and carry on. Any other host failure still fails closed.
        """
        try:
            return self.canonical_work.list(project_id)
        except KanbanAdapterError as exc:
            if exc.code in self._UNLINKED:
                return None
            raise

    def _portfolio_items(self, project_id: str) -> Optional[List[Dict]]:
        """Work items as plain dicts with status/due/updated_at normalised.

        Prefers the canonical projection (same source the Work tab shows);
        falls back to the dockyard table when no adapter is wired.
        ``created_at`` rides along as a last-activity fallback (canonical
        items carry no updated_at yet). None when the project is unlinked.
        """
        items: List[Dict] = []
        if self.canonical_work is not None:
            work = self._linked_work(project_id)
            if work is None:
                return None
            for row in work:
                items.append({
                    "ref": row.get("ref", ""),
                    "status": str(row.get("status", "")),
                    "due": row.get("due"),
                    "updated_at": row.get("updated_at"),
                    "created_at": row.get("created_at"),
                })
        else:
            rows = self.store._conn.execute(
                "SELECT ref, status, due, updated_at, created_at"
                " FROM dockyard_work_items WHERE project_id=?",
                (project_id,)).fetchall()
            items = [dict(r) for r in rows]
        return items

    @staticmethod
    def _parse_iso(value) -> Optional[datetime]:
        if not value or not isinstance(value, str):
            return None
        try:
            dt = datetime.fromisoformat(value.replace("Z", "+00:00"))
        except ValueError:
            return None
        # Date-only strings (e.g. due='2026-08-01', the API's own accepted
        # shape) parse naive; normalise to UTC so comparisons against the
        # aware clock never raise.
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt

    def portfolio(self) -> Dict:
        """Cross-project cockpit: attention, per-project standing, status mix.

        One read pass per project; no per-item loops against the DB.
        Status rules (documented in docs/PORTFOLIO-DESIGN.md):
          unlinked — Hermes has no project for it, so its work is unreadable
          at_risk  — overdue item, blocked item, or overdue milestone
          stalled  — open items but no activity in 14+ days
          idle     — nothing in flight and no open milestone
          on_track — everything else
        """
        now = datetime.now(timezone.utc)
        projects: List[Dict] = []
        mix = {"todo": 0, "in_progress": 0, "blocked": 0, "done": 0}
        attention = {"overdue_items": 0, "blocked_items": 0,
                     "overdue_milestones": 0}
        # P6.1: evidence health stays separate from delivery status; freshness
        # is surfaced per project as its own field, never a composite score.
        health_freshness: Dict[str, Optional[int]] = {}
        evidence_files = self.store._conn.execute(
            "SELECT COUNT(*) AS n FROM project_content"
            " WHERE removal_state='active' AND archived_at IS NULL"
        ).fetchone()["n"]
        for p in self.store._conn.execute(
                "SELECT project_id, enabled, phase, owner_lead_profile"
                " FROM project_stewardship"
                " ORDER BY project_id").fetchall():
            pid = p["project_id"]
            health_row = self.store._conn.execute(
                "SELECT created_at FROM project_health_snapshots"
                " WHERE project_id=? ORDER BY id DESC LIMIT 1",
                (pid,)).fetchone()
            if health_row is not None:
                created = self._parse_iso(health_row["created_at"])
                health_freshness[pid] = (
                    max(0, (now - created).days) if created else None)
            else:
                health_freshness[pid] = None
            items = self._portfolio_items(pid)
            linked = items is not None
            items = items or []
            milestones = self.dy.milestone_list(pid)

            counts: Dict[str, int] = {}
            overdue_items = 0
            blocked_items = 0
            last_activity: Optional[datetime] = None
            for it in items:
                status = it.get("status") or "backlog"
                counts[status] = counts.get(status, 0) + 1
                if status == "blocked":
                    blocked_items += 1
                updated = (self._parse_iso(it.get("updated_at"))
                          or self._parse_iso(it.get("created_at")))
                if updated and (last_activity is None
                                or updated > last_activity):
                    last_activity = updated
                due = self._parse_iso(it.get("due"))
                if (due and due < now and status != "done"):
                    overdue_items += 1

            next_milestone = None
            overdue_milestones = 0
            for m in milestones:
                if m["closed"]:
                    continue
                if next_milestone is None:
                    next_milestone = m
                due_d = None
                if m.get("due"):
                    due_d = self._parse_iso(m["due"])
                if due_d and due_d < now:
                    overdue_milestones += 1
            total = len(items)
            done = counts.get("done", 0)
            open_items = total - done

            if not linked:
                status = "unlinked"
            elif overdue_items or blocked_items or overdue_milestones:
                status = "at_risk"
            elif (open_items and last_activity is not None
                    and (now - last_activity).days >= self._STALLED_AFTER_DAYS):
                status = "stalled"
            elif (counts.get("in_progress", 0) == 0
                    and counts.get("in_review", 0) == 0
                    and next_milestone is None):
                status = "idle"
            else:
                status = "on_track"

            mix["todo"] += counts.get("backlog", 0)
            mix["in_progress"] += (counts.get("in_progress", 0)
                                   + counts.get("in_review", 0))
            mix["blocked"] += blocked_items
            mix["done"] += done

            attention["overdue_items"] += overdue_items
            attention["blocked_items"] += blocked_items
            attention["overdue_milestones"] += overdue_milestones

            nm_due = (self._parse_iso(next_milestone.get("due"))
                     if next_milestone else None)
            projects.append({
                "project_id": pid,
                "owner": p["owner_lead_profile"],
                "enabled": bool(p["enabled"]),
                "phase": p["phase"],
                "status": status,
                "items": {"done": done, "total": total,
                          "blocked": blocked_items,
                          "overdue": overdue_items},
                "next_milestone": (
                    {"name": next_milestone["name"],
                     "due": next_milestone.get("due"),
                     "overdue": bool(nm_due and nm_due < now)}
                    if next_milestone else None),
                "last_activity": last_activity.isoformat()
                if last_activity else None,
                "evidence_freshness_days": health_freshness.get(pid),
            })

        return {"projects": projects, "mix": mix, "attention": attention,
                "evidence_files": evidence_files,
                "groups": self._fleet_groups()}

    # ------------------------------------------------------------------ #
    # Fleet grouping + exact deep links (Phase 6, P6.1–P6.4)              #
    # ------------------------------------------------------------------ #

    _NEXT_ACTION = {
        "pending_decision": "Open the approval inbox and decide with the "
                            "displayed fingerprint.",
        "blocked_item": "Unblock or reassign the blocked work item.",
        "overdue_item": "Reschedule, re-scope or complete the overdue item.",
        "overdue_milestone": "Review the milestone date or close it out.",
        "project_attention": "Open the project and resolve its lifecycle state.",
        "stalled_project": "Check the project's last activity and re-plan.",
        "evidence_stale": "Re-run the objective evidence collection.",
        "unlinked_project": "Create a Hermes project with this slug to link it.",
    }

    @staticmethod
    def _deep_link_for(kind: str, project_id: str, ref: str) -> str:
        """Exact-context deep link: names the object, never a generic screen."""
        if kind == "initiative_approval":
            return f"s6:initiative/{ref}"
        if kind == "blocked_item":
            return f"s2:work/{ref}"
        if kind == "project_attention":
            return f"s1:project/{project_id}"
        if kind in ("overdue_item", "overdue_milestone"):
            return f"s2:project/{project_id}"
        if kind == "stalled_project":
            return f"s1:project/{project_id}"
        if kind == "pending_decision":
            return f"s6:initiative/{ref}"
        return f"s1:project/{project_id}"

    def _work_attention_rows(self, project_id: str) -> Optional[List[Dict]]:
        """Blocked + overdue work rows from the SAME source Work/portfolio use.

        Canonical first (adapter wired); legacy table only as the explicit
        no-adapter fallback. Each row normalises the fields the group builder
        needs: ref, title, blocked reason, due, created_at, assignee.
        None when the project is unlinked.
        """
        rows: List[Dict] = []
        if self.canonical_work is not None:
            work = self._linked_work(project_id)
            if work is None:
                return None
            for item in work:
                status = str(item.get("status") or "")
                raw_reason = item.get("blocked_reason")
                if isinstance(raw_reason, list):
                    reason = ", ".join(str(x) for x in raw_reason)
                elif raw_reason:
                    reason = str(raw_reason)
                else:
                    # legacy blocked_by_json carries the reason when the
                    # canonical row does not (dockyard-backed items)
                    meta = item.get("blocked_by")
                    if isinstance(meta, list) and meta:
                        reason = ", ".join(str(x) for x in meta)
                    elif isinstance(meta, str) and meta:
                        reason = meta
                    else:
                        reason = ""
                rows.append({
                    "ref": str(item.get("ref") or item.get("id") or ""),
                    "title": str(item.get("title") or ""),
                    "status": status,
                    "reason": reason,
                    "due": item.get("due"),
                    "created_at": item.get("created_at"),
                    "assignee": item.get("assignee") or None,
                })
        else:
            legacy = self.store._conn.execute(
                "SELECT ref, title, status, blocked_by_json, due,"
                " created_at, assignee_id FROM dockyard_work_items"
                " WHERE project_id=?",
                (project_id,)).fetchall()
            for w in legacy:
                raw = (w["blocked_by_json"] or "[]").strip()
                try:
                    parsed = json.loads(raw)
                except (TypeError, ValueError):
                    parsed = []
                if isinstance(parsed, str):
                    reason = parsed
                elif parsed:
                    reason = ", ".join(str(x) for x in parsed)
                else:
                    reason = ""
                rows.append({
                    "ref": w["ref"], "title": w["title"],
                    "status": str(w["status"] or ""), "reason": reason,
                    "due": w["due"], "created_at": w["created_at"],
                    "assignee": w["assignee_id"] or None,
                })
        return rows

    def _fleet_groups(self) -> Dict:
        """Decision / Intervention / Informational groups from existing rows.

        Sources: project_initiatives (pending decisions), canonical work via
        _work_attention_rows (blocked/overdue; falls back to
        dockyard_work_items only when no adapter is wired),
        project_stewardship (paused/frozen/disabled),
        project_health_snapshots (evidence staleness), notifications
        (informational feed). Evidence health stays SEPARATE from delivery
        status: freshness is its own field, never folded into a score.
        """
        now = datetime.now(timezone.utc)
        decisions: List[Dict] = []
        interventions: List[Dict] = []
        informational: List[Dict] = []

        pending = self.store._conn.execute(
            "SELECT project_id, ref, title, risk, created_at"
            " FROM project_initiatives"
            " WHERE approval_state='pending' AND status='pending_approval'"
            " ORDER BY created_at").fetchall()
        for r in pending:
            created = self._parse_iso(r["created_at"])
            age_days = max(0, (now - created).days) if created else 0
            decisions.append({
                "kind": "initiative_approval",
                "project": r["project_id"],
                "ref": r["ref"],
                "title": r["title"],
                "risk": r["risk"],
                "age_days": age_days,
                "deep_link": self._deep_link_for(
                    "initiative_approval", r["project_id"], r["ref"]),
            })

        for p in self.store._conn.execute(
                "SELECT project_id, owner_lead_profile, phase, enabled"
                " FROM project_stewardship ORDER BY project_id").fetchall():
            pid = p["project_id"]
            lead = p["owner_lead_profile"] or "unassigned"

            work_rows = self._work_attention_rows(pid)
            if work_rows is None:
                interventions.append({
                    "kind": "project_attention",
                    "cause": "unlinked_project",
                    "project": pid,
                    "ref": pid,
                    "title": "Not linked to a Hermes project",
                    "detail": ("Hermes has no project with this id or slug,"
                               " so its work cannot be shown."),
                    "owner": lead,
                    "age_days": 0,
                    "next_action": self._NEXT_ACTION["unlinked_project"],
                    "deep_link": self._deep_link_for(
                        "project_attention", pid, ""),
                })
            for w in work_rows or ():
                if w["status"] == "blocked":
                    created = self._parse_iso(w["created_at"])
                    interventions.append({
                        "kind": "project_attention",
                        "cause": "blocked_item",
                        "project": pid,
                        "ref": w["ref"],
                        "title": w["title"],
                        "detail": (w["reason"]
                                   or "Blocked without a recorded reason."),
                        "owner": w["assignee"] or lead,
                        "age_days": (max(0, (now - created).days)
                                     if created else 0),
                        "next_action": self._NEXT_ACTION["blocked_item"],
                        "deep_link": self._deep_link_for(
                            "blocked_item", pid, w["ref"]),
                    })
                due = self._parse_iso(w["due"])
                if (w["status"] != "done" and due is not None
                        and due < now):
                    interventions.append({
                        "kind": "project_attention",
                        "cause": "overdue_item",
                        "project": pid,
                        "ref": w["ref"],
                        "title": w["title"],
                        "detail": f"Due {w['due']} and not done.",
                        "owner": w["assignee"] or lead,
                        "age_days": max(0, (now - due).days),
                        "next_action": self._NEXT_ACTION["overdue_item"],
                        "deep_link": self._deep_link_for(
                            "overdue_item", pid, w["ref"]),
                    })

            if p["phase"] == "frozen" or not p["enabled"]:
                interventions.append({
                    "kind": "project_attention",
                    "cause": "project_attention",
                    "project": pid,
                    "ref": p["phase"] if not p["enabled"] else "frozen",
                    "title": f"Project needs attention (phase={p['phase']})",
                    "detail": f"Project is {p['phase'] or 'disabled'}.",
                    "owner": lead,
                    "age_days": 0,
                    "next_action": self._NEXT_ACTION["project_attention"],
                    "deep_link": self._deep_link_for(
                        "project_attention", pid, ""),
                })

            health = self.store._conn.execute(
                "SELECT status, created_at FROM project_health_snapshots"
                " WHERE project_id=? ORDER BY id DESC LIMIT 1",
                (pid,)).fetchone()
            if health is not None:
                created = self._parse_iso(health["created_at"])
                freshness = max(0, (now - created).days) if created else 0
                if freshness >= 7:
                    interventions.append({
                        "kind": "project_attention",
                        "cause": "evidence_stale",
                        "project": pid,
                        "ref": "evidence",
                        "title": f"Evidence is {freshness} days old",
                        "detail": (f"Last health snapshot {freshness}d ago"
                                   f" (status {health['status']})."),
                        "owner": lead,
                        "age_days": freshness,
                        "next_action": self._NEXT_ACTION["evidence_stale"],
                        "deep_link": self._deep_link_for(
                            "stalled_project", pid, ""),
                    })

        notes = self.store._conn.execute(
            "SELECT project_id, severity, kind, title, body, created_at"
            " FROM notifications WHERE acked_at IS NULL"
            " ORDER BY created_at DESC LIMIT 50").fetchall()
        for n in notes:
            informational.append({
                "kind": n["kind"],
                "project": n["project_id"],
                "severity": n["severity"],
                "title": n["title"],
                "created_at": n["created_at"],
                "deep_link": self._deep_link(
                    n["kind"], n["project_id"], n["body"]),
            })

        return {"decisions": decisions,
                "interventions": interventions,
                "informational": informational}
