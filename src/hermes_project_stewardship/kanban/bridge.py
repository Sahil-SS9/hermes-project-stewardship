"""Kanban bridge: connect approved initiatives to execution boards.

Contract-first design (PRD FR-09; architecture §Hermes integration seams #3):

- `KanbanAdapter` is the abstract interface a host implements (upstream
  Hermes Kanban API, a fake for tests, or any card system).
- `ReferenceKanbanAdapter` is a fully-working local implementation backed by
  the stewardship store itself — usable standalone, and the shape upstream
  binding must satisfy.
- `KanbanBridge.bind()` drives the approved-initiative → board → cards flow
  with linkage persisted on BOTH sides, then `complete_from_board()` closes
  the loop with outcome evidence.

The bridge never mutates source code; it only creates execution scaffolding.
"""

from __future__ import annotations

import json
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional

from ..persistence.service import ServiceError, StewardshipService
from ..persistence.store import Store, iso


@dataclass
class BoardCard:
    title: str
    description: str
    column: str = "todo"
    metadata: Dict[str, Any] = field(default_factory=dict)


class KanbanAdapter(ABC):
    """Host-side board operations the bridge requires."""

    @abstractmethod
    def ensure_board(self, project_id: str, slug: str) -> str:
        """Return an existing or newly-created board id for slug."""

    @abstractmethod
    def add_card(self, board_id: str, card: BoardCard) -> str:
        """Create a card; return its id."""

    @abstractmethod
    def move_card(self, board_id: str, card_id: str, column: str) -> None: ...

    def list_profiles(self) -> List[Dict[str, Any]]:
        raise NotImplementedError("profile listing is not supported")

    def validate_project(self, **payload: Any) -> Dict[str, Any]:
        raise NotImplementedError("project validation is not supported")

    def provision_project(self, **payload: Any) -> Dict[str, Any]:
        raise NotImplementedError("project provisioning is not supported")


class ReferenceKanbanAdapter(KanbanAdapter):
    """Local boards stored in the stewardship DB.

    Deliberately simple: proves the bridge contract end-to-end without a
    Hermes runtime and gives integrations a working reference.
    """

    SCHEMA = """
    CREATE TABLE IF NOT EXISTS kanban_boards (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        project_id TEXT NOT NULL,
        slug       TEXT NOT NULL,
        created_at TEXT NOT NULL,
        UNIQUE(project_id, slug)
    );
    CREATE TABLE IF NOT EXISTS kanban_cards (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        board_id   INTEGER NOT NULL REFERENCES kanban_boards(id) ON DELETE CASCADE,
        title      TEXT NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        column_name TEXT NOT NULL DEFAULT 'todo',
        metadata_json TEXT NOT NULL DEFAULT '{}',
        created_at TEXT NOT NULL
    );
    """

    def __init__(self, store: Store) -> None:
        self.store = store
        self._canonical_items: dict[tuple[str, str, str], dict[str, Any]] = {}
        self._canonical_keys: dict[str, tuple[str, str, str]] = {}
        self._canonical_sequence = 0
        self._canonical_links: set[tuple[str, str, str]] = set()
        self._provisioned_projects: dict[str, dict[str, Any]] = {}
        self._provisioning_requests: dict[str, dict[str, Any]] = {}
        # executescript issues an implicit COMMIT; run DDL outside an explicit
        # transaction (statements are idempotent IF NOT EXISTS).
        self.store._conn.executescript(self.SCHEMA)

    def ensure_board(self, project_id: str, slug: str) -> str:
        with self.store.tx() as cx:
            cx.execute(
                "INSERT OR IGNORE INTO kanban_boards(project_id, slug, created_at)"
                " VALUES(?,?,?)",
                (project_id, slug, iso(self.store._clock())),
            )
            row = cx.execute(
                "SELECT id FROM kanban_boards WHERE project_id=? AND slug=?",
                (project_id, slug),
            ).fetchone()
        return str(row["id"])

    def add_card(self, board_id: str, card: BoardCard) -> str:
        with self.store.tx() as cx:
            cur = cx.execute(
                "INSERT INTO kanban_cards(board_id, title, description,"
                " column_name, metadata_json, created_at) VALUES(?,?,?,?,?,?)",
                (
                    int(board_id), card.title, card.description, card.column,
                    json.dumps(card.metadata), iso(self.store._clock()),
                ),
            )
        return str(cur.lastrowid)

    def move_card(self, board_id: str, card_id: str, column: str) -> None:
        with self.store.tx() as cx:
            cx.execute(
                "UPDATE kanban_cards SET column_name=? WHERE id=? AND board_id=?",
                (column, int(card_id), int(board_id)),
            )

    def list_profiles(self) -> List[Dict[str, Any]]:
        return [{"name": "default", "is_default": True}]

    def validate_project(self, **payload: Any) -> Dict[str, Any]:
        return dict(payload)

    def provision_project(self, **payload: Any) -> Dict[str, Any]:
        key = str(payload["idempotency_key"])
        existing = self._provisioned_projects.get(key)
        if existing is not None:
            if self._provisioning_requests[key] != payload:
                from .host_adapter import KanbanAdapterError

                raise KanbanAdapterError(
                    "idempotency_conflict",
                    "Idempotency key was already used for different project details",
                    fields={"idempotency_key": ["Use a new idempotency key"]},
                )
            return {**existing, "replayed": True}
        slug = str(payload["slug"])
        board_slug = str(payload.get("board_slug") or slug)
        project_id = f"ref-p-{slug}"
        self.ensure_board(project_id, board_slug)
        result = {
            "status": "complete",
            "idempotency_key": key,
            "replayed": False,
            "project": {
                "id": project_id,
                "slug": slug,
                "name": str(payload["name"]),
                "board_slug": board_slug,
            },
            "board": {"slug": board_slug, "project_id": project_id},
        }
        self._provisioning_requests[key] = dict(payload)
        self._provisioned_projects[key] = result
        return result

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
    ) -> dict[str, Any]:
        if idempotency_key and idempotency_key in self._canonical_keys:
            return dict(self._canonical_items[self._canonical_keys[idempotency_key]])
        if parent_id is not None and not any(
            key[0] == project_id and key[2] == parent_id
            for key in self._canonical_items
        ):
            raise ValueError(f"parent {parent_id} not found")
        self._canonical_sequence += 1
        prefix = "e" if kind == "epic" else "t"
        item_id = f"test-{prefix}-{self._canonical_sequence}"
        item = {
            "id": item_id,
            "ref": item_id,
            "kind": kind,
            "type": kind,
            "project_id": project_id,
            "title": title,
            "body": body,
            "status": "active" if kind == "epic" else "backlog",
            "assignee": assignee,
            "created_by": created_by,
            "parent_task_id": parent_id,
        }
        key = (project_id, kind, item_id)
        self._canonical_items[key] = item
        if idempotency_key:
            self._canonical_keys[idempotency_key] = key
        return dict(item)

    def list_work(self, project_id: str) -> list[dict[str, Any]]:
        return [
            dict(item)
            for (owner, _kind, _item_id), item in self._canonical_items.items()
            if owner == project_id
        ]

    def get_work(
        self,
        project_id: str,
        kind: str,
        item_id: str,
    ) -> dict[str, Any]:
        for (owner, _stored_kind, stored_id), item in self._canonical_items.items():
            if owner == project_id and stored_id == item_id:
                return dict(item)
        raise ValueError(f"no such canonical work item {item_id}")

    def transition_work(
        self,
        project_id: str,
        kind: str,
        item_id: str,
        status: str,
    ) -> dict[str, Any]:
        for key, item in self._canonical_items.items():
            if key[0] == project_id and key[2] == item_id:
                item["status"] = status
                return dict(item)
        raise ValueError(f"no such canonical work item {item_id}")

    def link_work(
        self,
        project_id: str,
        parent_id: str,
        child_id: str,
    ) -> Dict[str, Any]:
        ids = {
            item_id
            for owner, _kind, item_id in self._canonical_items
            if owner == project_id
        }
        if parent_id not in ids or child_id not in ids:
            raise ValueError("dependency task belongs to another project or is missing")
        if parent_id == child_id:
            raise ValueError("a task cannot depend on itself")
        stack = [child_id]
        seen: set[str] = set()
        while stack:
            node = stack.pop()
            if node == parent_id:
                raise ValueError("dependency would create a cycle")
            if node in seen:
                continue
            seen.add(node)
            stack.extend(
                child
                for owner, parent, child in self._canonical_links
                if owner == project_id and parent == node
            )
        self._canonical_links.add((project_id, parent_id, child_id))
        return {"parent_task_id": parent_id, "child_task_id": child_id}

    def unlink_work(
        self,
        project_id: str,
        parent_id: str,
        child_id: str,
    ) -> Dict[str, Any]:
        link = (project_id, parent_id, child_id)
        if link not in self._canonical_links:
            raise ValueError("dependency link was not found")
        self._canonical_links.remove(link)
        return {"parent_task_id": parent_id, "child_task_id": child_id}

    def list_work_links(
        self,
        project_id: str,
        item_id: str,
    ) -> list[dict[str, Any]]:
        rows = []
        for owner, parent, child in sorted(self._canonical_links):
            if owner != project_id:
                continue
            if child == item_id:
                rows.append({"direction": "parent", "task_id": parent})
            if parent == item_id:
                rows.append({"direction": "child", "task_id": child})
        return rows

    def update_work(
        self,
        project_id: str,
        current_kind: str,
        item_id: str,
        **changes: Any,
    ) -> dict[str, Any]:
        key = next(
            (
                candidate
                for candidate in self._canonical_items
                if candidate[0] == project_id and candidate[2] == item_id
            ),
            None,
        )
        if key is None:
            raise ValueError(f"no such canonical work item {item_id}")
        item = self._canonical_items[key]
        if "title" in changes:
            item["title"] = changes["title"]
        if "body" in changes:
            item["body"] = changes["body"]
        if "parent_id" in changes:
            item["parent_task_id"] = changes["parent_id"]
        new_kind = str(changes.get("kind", item["kind"]))
        item["kind"] = new_kind
        item["type"] = new_kind
        if new_kind != key[1]:
            new_key = (project_id, new_kind, item_id)
            self._canonical_items[new_key] = self._canonical_items.pop(key)
            for idempotency_key, stored_key in list(self._canonical_keys.items()):
                if stored_key == key:
                    self._canonical_keys[idempotency_key] = new_key
        return dict(item)

    def assign_work(
        self,
        project_id: str,
        kind: str,
        item_id: str,
        assignee: str | None,
    ) -> dict[str, Any]:
        for key, item in self._canonical_items.items():
            if key[0] == project_id and key[2] == item_id:
                item["assignee"] = assignee
                return dict(item)
        raise ValueError(f"no such canonical work item {item_id}")

    def cards(self, board_id: str) -> List[Dict[str, Any]]:
        rows = self.store._conn.execute(
            "SELECT * FROM kanban_cards WHERE board_id=? ORDER BY id", (int(board_id),)
        ).fetchall()
        out = []
        for r in rows:
            d = dict(r)
            d["metadata"] = self.store._uj(d.pop("metadata_json"), {})
            d["column"] = d.pop("column_name")
            out.append(d)
        return out


class KanbanBridge:
    """Approved initiative → board + cards, with persisted linkage."""

    WORKFLOW_COLUMNS = ("todo", "doing", "review", "done")

    def __init__(self, service: StewardshipService, adapter: KanbanAdapter) -> None:
        self.svc = service
        self.adapter = adapter

    def bind(
        self,
        ref: str,
        *,
        board_slug: Optional[str] = None,
        start_execution: bool = True,
    ) -> Dict[str, Any]:
        ini = self.svc.initiative_by_ref(ref)
        if ini["status"] != "approved":
            raise ServiceError(f"initiative {ref} is not approved (status={ini['status']})")

        project_id = ini["project_id"]
        slug = board_slug or f"{project_id}-ops"
        board_id = self.adapter.ensure_board(project_id, slug)

        card_ids: List[str] = []
        validation = ini.get("validation_contract") or {}
        steps = validation.get("steps") or [
            f"Implement: {ini['title']}",
            f"Validate: {validation.get('tests') or 'project test suite'}",
            f"Outcome check: {ini.get('expected_outcome') or 'objective restored'}",
        ]
        n = max(len(steps), 1)
        for i, step in enumerate(steps):
            idx = min(i * len(self.WORKFLOW_COLUMNS) // n, len(self.WORKFLOW_COLUMNS) - 1)
            column = self.WORKFLOW_COLUMNS[idx]
            card_ids.append(
                self.adapter.add_card(
                    board_id,
                    BoardCard(
                        title=step[:120],
                        description=f"Initiative {ref} | risk={ini['risk']} | "
                                    f"evidence-backed by cycle {ini.get('source_cycle_id')}",
                        column=column,
                        metadata={"initiative_ref": ref, "step": i + 1},
                    ),
                )
            )

        self.svc.bind_board(ref, slug)
        if start_execution:
            self.svc.start_execution(ref)
        self.svc.store.audit(
            actor="system",
            interface="kanban_bridge",
            action="initiative.bound_to_board",
            subject=ref,
            detail={"board_slug": slug, "board_id": board_id, "cards": card_ids},
        )
        return {"ref": ref, "board_slug": slug, "board_id": board_id,
                "card_ids": card_ids}

    def complete_from_board(
        self,
        ref: str,
        *,
        outcome: Dict[str, Any],
        regressed: bool = False,
        board_slug: Optional[str] = None,
    ) -> Dict[str, Any]:
        ini = self.svc.initiative_by_ref(ref)
        slug = board_slug or ini.get("board_slug")
        if slug and isinstance(self.adapter, ReferenceKanbanAdapter):
            try:
                board_id = self.adapter.ensure_board(ini["project_id"], slug)
                for c in self.adapter.cards(board_id):
                    if c["metadata"].get("initiative_ref") == ref:
                        self.adapter.move_card(str(c["board_id"]), str(c["id"]), "done")
            except Exception:
                pass  # board cleanup is best-effort; outcome recording is not
        return self.svc.complete_initiative(ref, outcome=outcome, regressed=regressed)
