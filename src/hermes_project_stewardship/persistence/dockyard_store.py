"""Dockyard persistence: WorkItem + Backlog CRUD on the stewardship Store.

G1 (PRD v0.3 §4.1): work-items live in the SAME canonical DB as stewardship
state (TE-01: no state duplication). This module adds typed accessors; the
Store keeps owning connections and transactions.
"""
from __future__ import annotations

import json
from typing import Dict, List, Optional

from .store import Store


def _j(value) -> str:
    return json.dumps(value, sort_keys=True, separators=(",", ":"))

from ..dockyard import (
    Actor,
    ActorKind,
    BacklogEntry,
    make_ref,
    WorkItem,
    WorkItemStatus,
    WorkItemType,
)


def _actor_from(row, id_col: str, kind_col: str) -> Optional[Actor]:
    aid = row[id_col]
    if not aid:
        return None
    return Actor(id=aid, display_name=aid,
                 kind=ActorKind(row[kind_col] or "bot"))


def _row_to_item(row) -> WorkItem:
    return WorkItem(
        project_id=row["project_id"],
        type=WorkItemType(row["type"]),
        title=row["title"],
        id=row["id"],
        ref=row["ref"],
        parent_id=row["parent_id"],
        status=WorkItemStatus(row["status"]),
        assignee=_actor_from(row, "assignee_id", "assignee_kind"),
        created_by=_actor_from(row, "created_by_id", "created_by_kind"),
        priority_rank=row["priority_rank"],
        labels=json.loads(row["labels_json"]),
        blocked_by=json.loads(row["blocked_by_json"]),
        estimate_days=row["estimate_days"],
        evidence_refs=json.loads(row["evidence_refs_json"]),
        created_at=row["created_at"],
        updated_at=row["updated_at"],
    )


class DockyardStore:
    """Typed data-access for the dockyard tables on a shared Store."""

    def __init__(self, store: Store) -> None:
        self.store = store

    # ------------------------------------------------------------------ #
    # Work items                                                         #
    # ------------------------------------------------------------------ #

    def create_item(self, item: WorkItem) -> WorkItem:
        if not item.ref:
            row = self.store._conn.execute(
                "SELECT COUNT(*) AS n FROM dockyard_work_items WHERE project_id=?",
                (item.project_id,),
            ).fetchone()
            item.ref = make_ref("HDY", row["n"] + 1)
        with self.store.tx() as cx:
            cur = cx.execute(
                """
                INSERT INTO dockyard_work_items(
                    project_id, ref, type, title, status,
                    assignee_id, assignee_kind, created_by_id, created_by_kind,
                    priority_rank, labels_json, blocked_by_json,
                    estimate_days, due, evidence_refs_json, created_at, updated_at)
                VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
                """,
                (
                    item.project_id, item.ref, item.type.value, item.title,
                    item.status.value,
                    item.assignee.id if item.assignee else None,
                    item.assignee.kind.value if item.assignee else None,
                    item.created_by.id if item.created_by else None,
                    item.created_by.kind.value if item.created_by else None,
                    item.priority_rank,
                    _j(item.labels), _j(item.blocked_by),
                    item.estimate_days,
                    item.due.isoformat() if item.due else None,
                    _j(item.evidence_refs),
                    item.created_at.isoformat(), item.updated_at.isoformat(),
                ),
            )
            item.id = cur.lastrowid
        return item

    def get_item(self, project_id: str, item_id: int) -> Optional[WorkItem]:
        row = self.store._conn.execute(
            "SELECT * FROM dockyard_work_items WHERE project_id=? AND id=?",
            (project_id, item_id),
        ).fetchone()
        return _row_to_item(row) if row else None

    def list_items(self, project_id: str, *,
                   status: Optional[WorkItemStatus] = None) -> List[WorkItem]:
        if status:
            rows = self.store._conn.execute(
                "SELECT * FROM dockyard_work_items WHERE project_id=? AND status=?"
                " ORDER BY priority_rank IS NULL, priority_rank, id",
                (project_id, status.value),
            ).fetchall()
        else:
            rows = self.store._conn.execute(
                "SELECT * FROM dockyard_work_items WHERE project_id=?"
                " ORDER BY priority_rank IS NULL, priority_rank, id",
                (project_id,),
            ).fetchall()
        return [_row_to_item(r) for r in rows]

    def update_status(self, project_id: str, item_id: int,
                      new_status: WorkItemStatus | str) -> Optional[WorkItem]:
        if isinstance(new_status, str):
            new_status = WorkItemStatus(new_status)
        from .store import iso

        with self.store.tx() as cx:
            cx.execute(
                "UPDATE dockyard_work_items SET status=?, updated_at=?"
                " WHERE project_id=? AND id=?",
                (new_status.value, iso(), project_id, item_id),
            )
        return self.get_item(project_id, item_id)

    def set_parent(self, project_id: str, child_id: int,
                   parent_id: int) -> None:
        child = self.get_item(project_id, child_id)
        parent = self.get_item(project_id, parent_id)
        if child is None or parent is None:
            raise ValueError("child and parent must exist in same project")
        child.set_parent(parent)
        from .store import iso

        with self.store.tx() as cx:
            cx.execute(
                "UPDATE dockyard_work_items SET parent_id=?, updated_at=?"
                " WHERE project_id=? AND id=?",
                (parent_id, iso(), project_id, child_id),
            )

    # ------------------------------------------------------------------ #
    # Backlog                                                            #
    # ------------------------------------------------------------------ #

    def upsert_backlog(self, project_id: str, entry: BacklogEntry) -> None:
        with self.store.tx() as cx:
            cx.execute(
                """
                INSERT INTO dockyard_backlog(
                    item_ref, project_id, rank, priority_reason, aged_since)
                VALUES (?,?,?,?,?)
                ON CONFLICT(item_ref) DO UPDATE SET
                    rank=excluded.rank,
                    priority_reason=excluded.priority_reason
                """,
                (entry.item_ref, project_id, entry.rank,
                 entry.priority_reason, entry.aged_since.isoformat()),
            )

    def list_backlog(self, project_id: str) -> List[BacklogEntry]:
        rows = self.store._conn.execute(
            "SELECT * FROM dockyard_backlog WHERE project_id=? ORDER BY rank",
            (project_id,),
        ).fetchall()
        return [
            BacklogEntry(item_ref=r["item_ref"], rank=r["rank"],
                         priority_reason=r["priority_reason"])
            for r in rows
        ]

    def rerank(self, project_id: str, item_ref: str, new_rank: int,
               reason: str, *, actor: Actor) -> dict:
        """PM-03: reason-mandatory rerank that persists the audit fields."""
        rows = self.store._conn.execute(
            "SELECT rank FROM dockyard_backlog WHERE project_id=? AND item_ref=?",
            (project_id, item_ref),
        ).fetchall()
        if not rows:
            raise ValueError(f"no backlog entry {item_ref} in {project_id}")
        old = rows[0]["rank"]
        entry = BacklogEntry(item_ref=item_ref, rank=old)
        audit = entry.rerank(new_rank, reason, actor=actor)
        from .store import iso

        with self.store.tx() as cx:
            cx.execute(
                """
                UPDATE dockyard_backlog SET rank=?, last_rerank_actor=?,
                    last_rerank_kind=?, last_rerank_reason=?
                WHERE project_id=? AND item_ref=?
                """,
                (new_rank, actor.id, actor.kind.value, reason,
                 project_id, item_ref),
            )
        return audit

    def stats(self) -> Dict[str, int]:
        items = self.store._conn.execute(
            "SELECT COUNT(*) AS n FROM dockyard_work_items").fetchone()["n"]
        entries = self.store._conn.execute(
            "SELECT COUNT(*) AS n FROM dockyard_backlog").fetchone()["n"]
        return {"work_items": items, "backlog_entries": entries}

    # ------------------------------------------------------------------ #
    # Milestones (PM-04)                                                 #
    # ------------------------------------------------------------------ #

    def milestone_create(self, project_id: str, name: str, *,
                         due: Optional[str] = None,
                         created_at: Optional[str] = None) -> int:
        from .store import iso

        with self.store.tx() as cx:
            cur = cx.execute(
                "INSERT INTO dockyard_milestones(project_id, name, due,"
                " created_at) VALUES (?,?,?,?)",
                (project_id, name, due, created_at or iso()),
            )
            return cur.lastrowid

    def milestone_attach(self, project_id: str, name: str,
                         item_ref: str) -> None:
        with self.store.tx() as cx:
            cx.execute(
                """
                INSERT INTO dockyard_milestone_items(milestone_id, item_ref)
                SELECT id, ? FROM dockyard_milestones
                WHERE project_id=? AND name=?
                """,
                (item_ref, project_id, name),
            )

    def milestone_progress(self, project_id: str, name: str) -> Dict:
        row = self.store._conn.execute(
            "SELECT id, due FROM dockyard_milestones"
            " WHERE project_id=? AND name=?", (project_id, name),
        ).fetchone()
        if not row:
            raise ValueError(f"milestone {name} not found")
        total = self.store._conn.execute(
            "SELECT COUNT(*) AS n FROM dockyard_milestone_items WHERE milestone_id=?",
            (row["id"],),
        ).fetchone()["n"]
        done = self.store._conn.execute(
            """
            SELECT COUNT(*) AS n FROM dockyard_milestone_items mi
            JOIN dockyard_work_items w ON w.ref = mi.item_ref
            WHERE mi.milestone_id=? AND w.status='done'
            """,
            (row["id"],),
        ).fetchone()["n"]
        return {"name": name, "total": total, "done": done,
                "due": row["due"]}

    # ------------------------------------------------------------------ #
    # Saved views (PM-05)                                                #
    # ------------------------------------------------------------------ #

    def view_save(self, project_id: str, name: str, layout: str, *,
                  filters: Dict, owner_id: str,
                  shared: bool = False) -> None:
        from .store import iso

        if layout not in ("board", "table", "timeline", "portfolio"):
            raise ValueError(f"unknown layout {layout}")
        with self.store.tx() as cx:
            cx.execute(
                """
                INSERT INTO dockyard_saved_views(
                    project_id, name, layout, filters_json, owner_id,
                    shared, created_at)
                VALUES (?,?,?,?,?,?,?)
                ON CONFLICT(project_id, name) DO UPDATE SET
                    layout=excluded.layout,
                    filters_json=excluded.filters_json,
                    shared=excluded.shared
                """,
                (project_id, name, layout, _j(filters), owner_id,
                 1 if shared else 0, iso()),
            )

    def views_list(self, project_id: str, *, include_private_of=None) -> List[Dict]:
        rows = self.store._conn.execute(
            "SELECT * FROM dockyard_saved_views WHERE project_id=?"
            " AND (shared=1 OR owner_id=?) ORDER BY name",
            (project_id, include_private_of or "__none__"),
        ).fetchall()
        return [
            {"name": r["name"], "layout": r["layout"],
             "filters": json.loads(r["filters_json"]),
             "owner": r["owner_id"], "shared": bool(r["shared"])}
            for r in rows
        ]
