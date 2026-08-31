"""Dockyard persistence: WorkItem + Backlog CRUD on the stewardship Store.

G1 (PRD v0.3 §4.1): work-items live in the SAME canonical DB as stewardship
state (TE-01: no state duplication). This module adds typed accessors; the
Store keeps owning connections and transactions.
"""
from __future__ import annotations

import json
from typing import Dict, List, Optional

from .store import Store

from ..dockyard import (
    Actor,
    ActorKind,
    BacklogEntry,
    make_ref,
    WorkItem,
    WorkItemStatus,
    WorkItemType,
)


def _j(value) -> str:
    return json.dumps(value, sort_keys=True, separators=(",", ":"))


def _actor_from(row, id_col: str, kind_col: str) -> Optional[Actor]:
    """Round-2 council fix: a NULL/unknown kind must NOT silently mask as
    'bot'. Such rows carry no trustworthy attribution -> return None so
    the field renders as unattributed rather than misattributed."""
    aid = row[id_col]
    if not aid:
        return None
    kind = row[kind_col]
    if not kind:
        return None
    try:
        return Actor(id=aid, display_name=aid, kind=ActorKind(kind))
    except ValueError:
        return None


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
        initiative_ref=row["initiative_ref"],
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
        """Insert; when ref unset, derive HDY-n from the assigned rowid
        inside the same transaction (race-safe, G5)."""
        with self.store.tx() as cx:
            self._insert_item(cx, item)
        return item

    def _insert_item(self, cx, item: WorkItem) -> None:
        """Insert a work item row inside an existing transaction.

        When ``item.ref`` is empty the HDY-n key is derived from the
        assigned rowid, so concurrent creators never collide. The same row
        is updated in place to the canonical ref.
        """
        cur = cx.execute(
            """
            INSERT INTO dockyard_work_items(
                project_id, ref, type, title, status,
                assignee_id, assignee_kind, created_by_id, created_by_kind,
                priority_rank, labels_json, blocked_by_json,
                estimate_days, due, evidence_refs_json, initiative_ref,
                created_at, updated_at)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
            """,
            (
                item.project_id,
                item.ref or ("tmp-" + cx.execute(
                    "SELECT hex(randomblob(12))").fetchone()[0]),
                item.type.value,
                item.title, item.status.value,
                item.assignee.id if item.assignee else None,
                item.assignee.kind.value if item.assignee else None,
                item.created_by.id if item.created_by else None,
                item.created_by.kind.value if item.created_by else None,
                item.priority_rank,
                _j(item.labels), _j(item.blocked_by),
                item.estimate_days,
                item.due.isoformat() if item.due else None,
                _j(item.evidence_refs),
                item.initiative_ref,
                item.created_at.isoformat(), item.updated_at.isoformat(),
            ),
        )
        row_id = cur.lastrowid
        if not item.ref:
            seq = cx.execute(
                "SELECT COUNT(*) AS n FROM dockyard_work_items WHERE id <= ?",
                (row_id,),
            ).fetchone()["n"]
            item.ref = make_ref("HDY", seq)
            cx.execute("UPDATE dockyard_work_items SET ref=? WHERE id=?",
                       (item.ref, row_id))
        item.id = row_id

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

    def upsert_backlog(self, project_id: str, entry: BacklogEntry, *,
                       actor=None) -> None:
        with self.store.tx() as cx:
            existing = cx.execute(
                "SELECT 1 FROM dockyard_backlog"
                " WHERE project_id=? AND item_ref=?",
                (project_id, entry.item_ref),
            ).fetchone()
            if existing is None:
                # Shift existing rows out of the way so the requested rank
                # remains unique within the project.
                self._shift_increase_from(cx, project_id, entry.rank)
            self._insert_backlog_row(cx, project_id, entry, actor=actor)
            self._sync_priority_rank(cx, project_id)

    @staticmethod
    def _temporary_offset(cx, project_id: str) -> int:
        """Return an offset above every live rank in one project."""
        row = cx.execute(
            "SELECT COALESCE(MAX(rank), 0) AS max_rank"
            " FROM dockyard_backlog WHERE project_id=?",
            (project_id,),
        ).fetchone()
        return int(row["max_rank"]) + 1

    @classmethod
    def _shift_increase_from(cls, cx, project_id: str,
                             from_rank: int) -> None:
        """Bump every backlog row with ``rank >= from_rank`` up by one
        (lower priority, larger rank).

        SQLite enforces the unique rank index per updated row. The first pass
        therefore moves affected rows above the project's highest live rank;
        the second maps them back to ``rank + 1`` without colliding with a
        valid sparse rank.
        """
        offset = cls._temporary_offset(cx, project_id)
        cx.execute(
            "UPDATE dockyard_backlog SET rank = rank + ?"
            " WHERE project_id=? AND rank >= ?",
            (offset, project_id, from_rank),
        )
        cx.execute(
            "UPDATE dockyard_backlog SET rank = rank - ? + 1"
            " WHERE project_id=? AND rank >= ?",
            (offset, project_id, from_rank + offset),
        )

    @classmethod
    def _shift_increase_range(cls, cx, project_id: str,
                              lo_inclusive: int,
                              hi_exclusive: int) -> None:
        """Bump every backlog row with ``lo <= rank < hi`` up by one
        (lower priority, larger rank). Used to make room above when an
        item reranks upward in priority.
        """
        offset = cls._temporary_offset(cx, project_id)
        cx.execute(
            "UPDATE dockyard_backlog SET rank = rank + ?"
            " WHERE project_id=? AND rank >= ? AND rank < ?",
            (offset, project_id, lo_inclusive, hi_exclusive),
        )
        cx.execute(
            "UPDATE dockyard_backlog SET rank = rank - ? + 1"
            " WHERE project_id=? AND rank >= ? AND rank < ?",
            (offset, project_id,
             lo_inclusive + offset, hi_exclusive + offset),
        )

    @classmethod
    def _shift_decrease_range(cls, cx, project_id: str,
                              lo_inclusive: int,
                              hi_inclusive: int) -> None:
        """Drop every backlog row with ``lo <= rank <= hi`` by one
        (higher priority, smaller rank). Used to make room below when an
        item reranks downward in priority.
        """
        offset = cls._temporary_offset(cx, project_id)
        cx.execute(
            "UPDATE dockyard_backlog SET rank = rank + ?"
            " WHERE project_id=? AND rank >= ? AND rank <= ?",
            (offset, project_id, lo_inclusive, hi_inclusive),
        )
        cx.execute(
            "UPDATE dockyard_backlog SET rank = rank - ? - 1"
            " WHERE project_id=? AND rank >= ? AND rank <= ?",
            (offset, project_id,
             lo_inclusive + offset, hi_inclusive + offset),
        )

    def _insert_backlog_row(self, cx, project_id: str, entry: BacklogEntry,
                            *, actor) -> None:
        """Insert one backlog row inside an existing transaction. The caller
        is responsible for any required rank shifting and synchronisation.
        """
        cx.execute(
            """
            INSERT INTO dockyard_backlog(
                item_ref, project_id, rank, priority_reason, aged_since,
                last_rerank_actor, last_rerank_kind, last_rerank_reason)
            VALUES (?,?,?,?,?,?,?,?)
            ON CONFLICT(project_id, item_ref) DO UPDATE SET
                rank=excluded.rank,
                priority_reason=excluded.priority_reason,
                last_rerank_actor=excluded.last_rerank_actor,
                last_rerank_kind=excluded.last_rerank_kind,
                last_rerank_reason=excluded.last_rerank_reason
            """,
            (entry.item_ref, project_id, entry.rank,
             entry.priority_reason, entry.aged_since.isoformat(),
             actor.id if actor else None,
             actor.kind.value if actor else None,
             entry.priority_reason or None),
        )

    def _sync_priority_rank(self, cx, project_id: str) -> None:
        """Make ``dockyard_work_items.priority_rank`` mirror the canonical
        ``dockyard_backlog.rank`` for every backlog entry in this project
        and NULL it for unranked items. Run inside the same transaction as
        any rank change so the two sources cannot drift.
        """
        cx.execute(
            """
            UPDATE dockyard_work_items
            SET priority_rank = (
                SELECT b.rank FROM dockyard_backlog b
                WHERE b.item_ref = dockyard_work_items.ref
                  AND b.project_id = dockyard_work_items.project_id
            )
            WHERE project_id = ?
            """,
            (project_id,),
        )

    @staticmethod
    def _validate_queue_context(cx, item: WorkItem) -> None:
        """Recheck queue invariants inside the write transaction."""
        project = cx.execute(
            "SELECT enabled, phase FROM project_stewardship WHERE project_id=?",
            (item.project_id,),
        ).fetchone()
        if project is None:
            raise ValueError(f"no such project {item.project_id}")
        if not project["enabled"]:
            raise ValueError(f"project {item.project_id} is disabled")
        if project["phase"] != "active":
            raise ValueError(
                f"project {item.project_id} is {project['phase']};"
                " resume it before adding work"
            )
        if not item.initiative_ref:
            return
        initiative = cx.execute(
            "SELECT project_id FROM project_initiatives WHERE ref=?",
            (item.initiative_ref,),
        ).fetchone()
        if initiative is None:
            raise ValueError(f"no such initiative {item.initiative_ref}")
        if initiative["project_id"] != item.project_id:
            raise ValueError(
                f"initiative {item.initiative_ref} belongs to project "
                f"{initiative['project_id']}, not {item.project_id}"
            )

    def create_queued_item(self, item: WorkItem, entry: BacklogEntry, *,
                           actor) -> tuple:
        """Atomic work-item create + backlog insert.

        Inside a single ``BEGIN IMMEDIATE`` transaction:

        1. Validate the requested rank, shifting any existing backlog rows
           at or above it up by one so the unique ``(project_id, rank)``
           index cannot collide.
        2. Insert the work item and derive its ref.
        3. Insert the backlog entry pointing at the new ref.
        4. Re-synchronise ``priority_rank`` on every work item in the
           project so the denormalised copy agrees with the canonical
           backlog rank.

        Any failure during these steps rolls back the whole transaction, so
        no orphan work item can be left behind.
        """
        if entry.rank < 1:
            raise ValueError(f"backlog rank must be >= 1, got {entry.rank}")
        entry.item_ref = entry.item_ref or item.ref
        if not item.ref:
            item.priority_rank = entry.rank  # reflected back via sync
        with self.store.tx() as cx:
            self._validate_queue_context(cx, item)
            self._shift_increase_from(cx, item.project_id, entry.rank)
            self._insert_item(cx, item)
            entry.item_ref = item.ref
            self._insert_backlog_row(cx, item.project_id, entry, actor=actor)
            self._sync_priority_rank(cx, item.project_id)
        return item, entry

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
        """PM-03: reason-mandatory rerank that persists the audit fields and
        keeps ``(project_id, rank)`` unique by shifting the affected rows
        inside the same transaction.
        """
        if new_rank < 1:
            raise ValueError(f"rerank target must be >= 1, got {new_rank}")

        # Read the source rank while holding the same write transaction used
        # for the move. Concurrent reranks then produce a serial audit chain
        # rather than reporting a stale from_rank.
        with self.store.tx() as cx:
            row = cx.execute(
                "SELECT rank FROM dockyard_backlog"
                " WHERE project_id=? AND item_ref=?",
                (project_id, item_ref),
            ).fetchone()
            if row is None:
                raise ValueError(
                    f"no backlog entry {item_ref} in {project_id}"
                )
            old = row["rank"]
            entry = BacklogEntry(item_ref=item_ref, rank=old)
            audit = entry.rerank(new_rank, reason, actor=actor)

            # The moving item sits inside the rank range that other rows will
            # occupy. Park it above the project's highest live rank, shift the
            # affected rows, then move it to the destination.
            if new_rank != old:
                sentinel = self._temporary_offset(cx, project_id)
                cx.execute(
                    "UPDATE dockyard_backlog SET rank=? WHERE project_id=?"
                    " AND item_ref=?",
                    (sentinel, project_id, item_ref),
                )
                if new_rank > old:
                    self._shift_decrease_range(cx, project_id,
                                               old + 1, new_rank)
                else:
                    self._shift_increase_range(cx, project_id,
                                                new_rank, old)
            cx.execute(
                """
                UPDATE dockyard_backlog SET rank=?, last_rerank_actor=?,
                    last_rerank_kind=?, last_rerank_reason=?
                WHERE project_id=? AND item_ref=?
                """,
                (new_rank, actor.id, actor.kind.value, reason,
                 project_id, item_ref),
            )
            self._sync_priority_rank(cx, project_id)
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
            "SELECT id, due, closed_at FROM dockyard_milestones"
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
                "closed": bool(row["closed_at"]), "due": row["due"]}

    def milestone_list(self, project_id: str) -> list:
        rows = self.store._conn.execute(
            """
            SELECT m.name, m.due, m.created_at, m.closed_at,
                   COUNT(mi.item_ref) AS total,
                   COALESCE(SUM(CASE WHEN w.status='done' THEN 1 ELSE 0 END), 0) AS done
            FROM dockyard_milestones m
            LEFT JOIN dockyard_milestone_items mi ON mi.milestone_id=m.id
            LEFT JOIN dockyard_work_items w ON w.ref=mi.item_ref
            WHERE m.project_id=?
            GROUP BY m.id, m.name, m.due, m.created_at, m.closed_at
            ORDER BY CASE WHEN m.closed_at IS NULL THEN 0 ELSE 1 END, m.due, m.name
            """,
            (project_id,),
        ).fetchall()
        return [
            {
                "name": row["name"],
                "due": row["due"],
                "created_at": row["created_at"],
                "closed": bool(row["closed_at"]),
                "total": row["total"],
                "done": row["done"],
            }
            for row in rows
        ]

    def milestone_update(self, project_id: str, name: str, *, due: Optional[str],
                         closed: Optional[bool]) -> None:
        from .store import iso

        with self.store.tx() as cx:
            cur = cx.execute(
                "SELECT id FROM dockyard_milestones WHERE project_id=? AND name=?",
                (project_id, name),
            ).fetchone()
            if cur is None:
                raise ValueError(f"milestone {name} not found")
            if due is not None:
                cx.execute("UPDATE dockyard_milestones SET due=? WHERE id=?",
                           (due, cur["id"]))
            if closed is not None:
                cx.execute(
                    "UPDATE dockyard_milestones SET closed_at=? WHERE id=?",
                    (iso() if closed else None, cur["id"]),
                )

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
        # Scoped to shared rows plus the caller's private ones; when
        # include_private_of is None, return all rows (service applies
        # role-aware sharing, which needs to read shared_with from JSON).
        if include_private_of is None:
            rows = self.store._conn.execute(
                "SELECT * FROM dockyard_saved_views WHERE project_id=?"
                " ORDER BY name",
                (project_id,),
            ).fetchall()
        else:
            rows = self.store._conn.execute(
                "SELECT * FROM dockyard_saved_views WHERE project_id=?"
                " AND (shared=1 OR owner_id=?) ORDER BY name",
                (project_id, include_private_of),
            ).fetchall()
        return [
            {"name": r["name"], "layout": r["layout"],
             "filters": json.loads(r["filters_json"]),
             "owner": r["owner_id"], "shared": bool(r["shared"])}
            for r in rows
        ]

    # ------------------------------------------------------------------ #
    # Generated reports                                                  #
    # ------------------------------------------------------------------ #

    def report_save(self, report: Dict) -> Dict:
        with self.store.tx() as cx:
            cx.execute(
                """
                INSERT INTO dockyard_reports(
                    report_id, project_id, report_type, title, content_md,
                    options_json, generated_by, generated_at)
                VALUES(?,?,?,?,?,?,?,?)
                """,
                (
                    report["report_id"], report["project_id"],
                    report["report_type"], report["title"], report["content"],
                    _j(report.get("options", {})), report["generated_by"],
                    report["generated_at"],
                ),
            )
        return dict(report)

    def reports_list(self, project_id: str, *, limit: int = 20) -> List[Dict]:
        rows = self.store._conn.execute(
            "SELECT report_id, project_id, report_type, title, options_json,"
            " generated_by, generated_at FROM dockyard_reports"
            " WHERE project_id=? ORDER BY generated_at DESC, report_id DESC LIMIT ?",
            (project_id, max(1, min(int(limit), 100))),
        ).fetchall()
        return [
            {
                "report_id": row["report_id"],
                "project_id": row["project_id"],
                "report_type": row["report_type"],
                "title": row["title"],
                "options": json.loads(row["options_json"]),
                "generated_by": row["generated_by"],
                "generated_at": row["generated_at"],
            }
            for row in rows
        ]

    def report_get(self, project_id: str, report_id: str) -> Optional[Dict]:
        row = self.store._conn.execute(
            "SELECT * FROM dockyard_reports WHERE project_id=? AND report_id=?",
            (project_id, report_id),
        ).fetchone()
        if row is None:
            return None
        return {
            "report_id": row["report_id"],
            "project_id": row["project_id"],
            "report_type": row["report_type"],
            "title": row["title"],
            "content": row["content_md"],
            "options": json.loads(row["options_json"]),
            "generated_by": row["generated_by"],
            "generated_at": row["generated_at"],
        }

    # ------------------------------------------------------------------ #
    # Bot registry (BM-01) — G2 P2                                       #
    # ------------------------------------------------------------------ #

    def bot_register(self, bot) -> None:
        from .store import iso

        with self.store.tx() as cx:
            cx.execute(
                """
                INSERT INTO dockyard_bots(
                    id, display_name, profile, capabilities_json,
                    status, registered_at, last_seen_at)
                VALUES (?,?,?,?,?,?,?)
                ON CONFLICT(id) DO UPDATE SET
                    display_name=excluded.display_name,
                    profile=excluded.profile,
                    capabilities_json=excluded.capabilities_json
                """,
                (bot.id, bot.display_name, bot.profile, _j(bot.capabilities),
                 bot.status.value, iso(), iso()),
            )

    def bot_get(self, bot_id: str):
        row = self.store._conn.execute(
            "SELECT * FROM dockyard_bots WHERE id=?", (bot_id,),
        ).fetchone()
        return self._bot_from_row(row)

    def _bot_from_row(self, row):
        if not row:
            return None
        from ..dockyard.bots import Bot, BotStatus

        bot = Bot(id=row["id"], display_name=row["display_name"],
                  profile=row["profile"],
                  capabilities=json.loads(row["capabilities_json"]))
        bot.status = BotStatus(row["status"])
        bot.current_item = row["current_item"]
        return bot

    def bots_list(self, *, status: Optional[str] = None) -> List:
        if status:
            rows = self.store._conn.execute(
                "SELECT * FROM dockyard_bots WHERE status=? ORDER BY id",
                (status,),
            ).fetchall()
        else:
            rows = self.store._conn.execute(
                "SELECT * FROM dockyard_bots ORDER BY id").fetchall()
        return [self._bot_from_row(r) for r in rows]

    def bot_set_status(self, bot_id: str, status_value: str,
                       current_item: Optional[str] = None):
        from ..dockyard.bots import BotStatus

        bot = self.bot_get(bot_id)
        if bot is None:
            raise ValueError(f"unknown bot {bot_id}")
        bot.set_status(BotStatus(status_value), current_item=current_item)
        from .store import iso

        with self.store.tx() as cx:
            cx.execute(
                "UPDATE dockyard_bots SET status=?, current_item=?,"
                " last_seen_at=? WHERE id=?",
                (bot.status.value, bot.current_item, iso(), bot_id),
            )
        return bot

    # ------------------------------------------------------------------ #
    # Groups (BM-02)                                                     #
    # ------------------------------------------------------------------ #

    def group_create(self, group) -> int:
        from .store import iso

        with self.store.tx() as cx:
            cur = cx.execute(
                "INSERT INTO dockyard_bot_groups(name, purpose, channel_ref,"
                " created_at) VALUES (?,?,?,?)",
                (group.name, group.purpose, group.channel_ref, iso()),
            )
            gid = cur.lastrowid
            for bot_id, role in group.members.items():
                cx.execute(
                    "INSERT INTO dockyard_group_members(group_id, bot_id,"
                    " role) VALUES (?,?,?)",
                    (gid, bot_id, role.value),
                )
        return gid

    def group_get(self, name: str):
        from ..dockyard.bots import BotGroup, GroupRole

        row = self.store._conn.execute(
            "SELECT * FROM dockyard_bot_groups WHERE name=?", (name,),
        ).fetchone()
        if not row:
            return None
        g = BotGroup(name=row["name"], purpose=row["purpose"],
                     channel_ref=row["channel_ref"], id=row["id"])
        members = self.store._conn.execute(
            "SELECT bot_id, role FROM dockyard_group_members WHERE group_id=?",
            (row["id"],),
        ).fetchall()
        for m in members:
            g.add_member(m["bot_id"], GroupRole(m["role"]))
        return g

    def groups_list(self) -> List:
        rows = self.store._conn.execute(
            "SELECT name FROM dockyard_bot_groups ORDER BY name").fetchall()
        return [self.group_get(r["name"]) for r in rows]

    def group_add_member(self, name: str, bot_id: str, role_value: str) -> None:
        from ..dockyard.bots import GroupRole

        g = self.group_get(name)
        if g is None:
            raise ValueError(f"unknown group {name}")
        g.add_member(bot_id, GroupRole(role_value))
        with self.store.tx() as cx:
            cx.execute(
                "INSERT OR REPLACE INTO dockyard_group_members("
                "group_id, bot_id, role) VALUES ("
                "(SELECT id FROM dockyard_bot_groups WHERE name=?),?,?)",
                (name, bot_id, role_value),
            )

    # ------------------------------------------------------------------ #
    # A2A message bus (BM-03/04) — G2 P3                                 #
    # ------------------------------------------------------------------ #

    def a2a_append(self, msg) -> None:
        """Persist one structured A2A event. Refuses unknown groups."""
        from .store import iso

        if self.group_get(msg.to_group) is None:
            raise ValueError(f"unknown group {msg.to_group}")
        msg.validate_payload()
        with self.store.tx() as cx:
            cx.execute(
                """
                INSERT INTO dockyard_a2a_messages(
                    id, msg_type, from_actor, to_group, item_ref,
                    payload_json, channel_post, created_at)
                VALUES (?,?,?,?,?,?,?,?)
                """,
                (msg.id, msg.msg_type.value, msg.from_actor, msg.to_group,
                 msg.item_ref, _j(msg.payload), msg.summary_line(), iso()),
            )

    def a2a_for_group(self, group_name: str, *,
                      limit: int = 50) -> List[Dict]:
        rows = self.store._conn.execute(
            "SELECT * FROM dockyard_a2a_messages WHERE to_group=?"
            " ORDER BY created_at DESC, id DESC LIMIT ?",
            (group_name, limit),
        ).fetchall()
        return [self._a2a_row(r) for r in rows]

    def a2a_for_item(self, item_ref: str) -> List[Dict]:
        rows = self.store._conn.execute(
            "SELECT * FROM dockyard_a2a_messages WHERE item_ref=?"
            " ORDER BY created_at, id", (item_ref,),
        ).fetchall()
        return [self._a2a_row(r) for r in rows]

    def _a2a_row(self, row) -> Dict:
        return {"id": row["id"], "type": row["msg_type"],
                "from": row["from_actor"], "group": row["to_group"],
                "item_ref": row["item_ref"],
                "payload": json.loads(row["payload_json"]),
                "channel_post": row["channel_post"],
                "created_at": row["created_at"]}

    # ------------------------------------------------------------------ #
    # Workload + reputation (BM-05/06) — G2 P4                           #
    # ------------------------------------------------------------------ #

    def workload_board(self) -> Dict:
        """Who is busy, idle, stuck, offline (BM-05)."""
        rows = self.store._conn.execute(
            "SELECT id, status, current_item FROM dockyard_bots ORDER BY id"
        ).fetchall()
        board = {"busy": [], "idle": [], "stuck": [], "offline": []}
        for r in rows:
            entry = {"bot": r["id"], "item": r["current_item"]}
            board[r["status"]].append(entry)
        return board

    def bot_reputation(self, bot_id: str) -> Dict:
        """Advisory-only summary from measured outcomes (BM-06).

        Sources: dockyard audit events for this bot (workitem transitions,
        a2a results). Never auto-routes; consumers decide.
        """
        row = self.store._conn.execute(
            "SELECT COUNT(*) AS n FROM dockyard_bots WHERE id=?",
            (bot_id,),
        ).fetchone()
        if not row["n"]:
            raise ValueError(f"unknown bot {bot_id}")
        results = self.store._conn.execute(
            "SELECT payload_json FROM dockyard_a2a_messages"
            " WHERE msg_type='result' AND from_actor=?", (bot_id,),
        ).fetchall()
        completed = sum(
            1 for r in results
            if json.loads(r["payload_json"]).get("outcome")
            in ("verified", "done", "completed"))
        regressed = sum(
            1 for r in results
            if json.loads(r["payload_json"]).get("outcome") == "regressed")
        transitions = self.store._conn.execute(
            "SELECT COUNT(*) AS n FROM stewardship_audit_log"
            " WHERE action='workitem.transition' AND actor=?",
            (bot_id,),
        ).fetchone()["n"]
        return {
            "bot": bot_id,
            "results_posted": len(results),
            "completed": completed,
            "regressed": regressed,
            "transitions": transitions,
            "advisory": True,
        }
