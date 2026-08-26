"""Dockyard governance metadata for canonical Hermes work records."""
from __future__ import annotations
import json

from typing import Any

from ..dockyard import Actor
from .store import Store, iso


class CanonicalWorkMetadataStore:
    """Persist only Dockyard-owned metadata keyed by canonical work identity."""

    def __init__(self, store: Store) -> None:
        self.store = store

    @staticmethod
    def _bind(
        cx,
        project_id: str,
        item_kind: str,
        item_id: str,
        *,
        initiative_ref: str | None,
        actor: Actor,
    ) -> None:
        cx.execute(
            """
            INSERT INTO dockyard_canonical_work_bindings(
                project_id, item_kind, item_id, initiative_ref,
                created_by_id, created_by_kind, created_at)
            VALUES (?,?,?,?,?,?,?)
            ON CONFLICT(project_id, item_kind, item_id) DO UPDATE SET
                initiative_ref=COALESCE(
                    excluded.initiative_ref,
                    dockyard_canonical_work_bindings.initiative_ref
                )
            """,
            (
                project_id,
                item_kind,
                item_id,
                initiative_ref,
                actor.id,
                actor.kind.value,
                iso(),
            ),
        )

    def bind_work(
        self,
        project_id: str,
        item_kind: str,
        item_id: str,
        *,
        initiative_ref: str | None,
        actor: Actor,
    ) -> None:
        with self.store.tx() as cx:
            self._bind(
                cx,
                project_id,
                item_kind,
                item_id,
                initiative_ref=initiative_ref,
                actor=actor,
            )

    @staticmethod
    def _temporary_offset(cx, project_id: str) -> int:
        row = cx.execute(
            "SELECT COALESCE(MAX(rank), 0) AS maximum "
            "FROM dockyard_canonical_backlog WHERE project_id=?",
            (project_id,),
        ).fetchone()
        return int(row["maximum"]) + 1

    @classmethod
    def _shift_increase_from(cls, cx, project_id: str, rank: int) -> None:
        offset = cls._temporary_offset(cx, project_id)
        cx.execute(
            "UPDATE dockyard_canonical_backlog SET rank=rank+? "
            "WHERE project_id=? AND rank>=?",
            (offset, project_id, rank),
        )
        cx.execute(
            "UPDATE dockyard_canonical_backlog SET rank=rank-?+1 "
            "WHERE project_id=? AND rank>=?",
            (offset, project_id, rank + offset),
        )

    @classmethod
    def _shift_increase_range(
        cls,
        cx,
        project_id: str,
        lower: int,
        upper_exclusive: int,
    ) -> None:
        offset = cls._temporary_offset(cx, project_id)
        cx.execute(
            "UPDATE dockyard_canonical_backlog SET rank=rank+? "
            "WHERE project_id=? AND rank>=? AND rank<?",
            (offset, project_id, lower, upper_exclusive),
        )
        cx.execute(
            "UPDATE dockyard_canonical_backlog SET rank=rank-?+1 "
            "WHERE project_id=? AND rank>=? AND rank<?",
            (
                offset,
                project_id,
                lower + offset,
                upper_exclusive + offset,
            ),
        )

    @classmethod
    def _shift_decrease_range(
        cls,
        cx,
        project_id: str,
        lower: int,
        upper: int,
    ) -> None:
        offset = cls._temporary_offset(cx, project_id)
        cx.execute(
            "UPDATE dockyard_canonical_backlog SET rank=rank+? "
            "WHERE project_id=? AND rank>=? AND rank<=?",
            (offset, project_id, lower, upper),
        )
        cx.execute(
            "UPDATE dockyard_canonical_backlog SET rank=rank-?-1 "
            "WHERE project_id=? AND rank>=? AND rank<=?",
            (offset, project_id, lower + offset, upper + offset),
        )

    def create_binding_and_queue(
        self,
        project_id: str,
        item_kind: str,
        item_id: str,
        *,
        rank: int,
        reason: str,
        initiative_ref: str | None,
        actor: Actor,
    ) -> dict[str, Any]:
        clean_reason = reason.strip()
        if rank < 1:
            raise ValueError("backlog rank must be at least 1")
        if len(clean_reason) < 4:
            raise ValueError("backlog additions require a priority reason")
        with self.store.tx() as cx:
            self._bind(
                cx,
                project_id,
                item_kind,
                item_id,
                initiative_ref=initiative_ref,
                actor=actor,
            )
            existing = cx.execute(
                "SELECT rank FROM dockyard_canonical_backlog "
                "WHERE project_id=? AND item_kind=? AND item_id=?",
                (project_id, item_kind, item_id),
            ).fetchone()
            if existing is None:
                self._shift_increase_from(cx, project_id, rank)
                cx.execute(
                    """
                    INSERT INTO dockyard_canonical_backlog(
                        project_id, item_kind, item_id, rank,
                        priority_reason, aged_since,
                        last_rerank_actor, last_rerank_kind,
                        last_rerank_reason)
                    VALUES (?,?,?,?,?,?,?,?,?)
                    """,
                    (
                        project_id,
                        item_kind,
                        item_id,
                        rank,
                        clean_reason,
                        iso(),
                        actor.id,
                        actor.kind.value,
                        clean_reason,
                    ),
                )
            else:
                rank = int(existing["rank"])
        return {
            "item_ref": item_id,
            "item_kind": item_kind,
            "rank": rank,
            "priority_reason": clean_reason,
        }

    def bindings(self, project_id: str) -> dict[tuple[str, str], dict[str, Any]]:
        rows = self.store._conn.execute(
            "SELECT * FROM dockyard_canonical_work_bindings WHERE project_id=?",
            (project_id,),
        ).fetchall()
        return {
            (str(row["item_kind"]), str(row["item_id"])): dict(row)
            for row in rows
        }

    def details(self, project_id: str) -> dict[str, dict[str, Any]]:
        rows = self.store._conn.execute(
            "SELECT * FROM dockyard_canonical_work_details WHERE project_id=?",
            (project_id,),
        ).fetchall()
        return {
            str(row["item_id"]): {
                "labels": json.loads(row["labels_json"]),
                "evidence_refs": json.loads(row["evidence_refs_json"]),
                "estimate_days": row["estimate_days"],
                "due": row["due"],
            }
            for row in rows
        }

    def upsert_details(
        self,
        project_id: str,
        item_id: str,
        *,
        labels: list[str],
        evidence_refs: list[str],
        estimate_days: float | None,
        due: str | None,
        actor: Actor,
    ) -> None:
        with self.store.tx() as cx:
            cx.execute(
                """
                INSERT INTO dockyard_canonical_work_details(
                    project_id,item_id,labels_json,evidence_refs_json,
                    estimate_days,due,updated_by,updated_by_kind,updated_at)
                VALUES(?,?,?,?,?,?,?,?,?)
                ON CONFLICT(project_id,item_id) DO UPDATE SET
                    labels_json=excluded.labels_json,
                    evidence_refs_json=excluded.evidence_refs_json,
                    estimate_days=excluded.estimate_days,
                    due=excluded.due,
                    updated_by=excluded.updated_by,
                    updated_by_kind=excluded.updated_by_kind,
                    updated_at=excluded.updated_at
                """,
                (
                    project_id,
                    item_id,
                    json.dumps(labels, sort_keys=True),
                    json.dumps(evidence_refs, sort_keys=True),
                    estimate_days,
                    due,
                    actor.id,
                    actor.kind.value,
                    iso(),
                ),
            )

    def rekey_kind(
        self,
        project_id: str,
        item_id: str,
        old_kind: str,
        new_kind: str,
    ) -> None:
        if old_kind == new_kind:
            return
        with self.store.tx() as cx:
            cx.execute(
                """
                INSERT INTO dockyard_canonical_work_bindings(
                    project_id,item_kind,item_id,initiative_ref,
                    created_by_id,created_by_kind,created_at)
                SELECT project_id,?,item_id,initiative_ref,
                       created_by_id,created_by_kind,created_at
                FROM dockyard_canonical_work_bindings
                WHERE project_id=? AND item_kind=? AND item_id=?
                """,
                (new_kind, project_id, old_kind, item_id),
            )
            cx.execute(
                "UPDATE dockyard_canonical_backlog SET item_kind=? "
                "WHERE project_id=? AND item_kind=? AND item_id=?",
                (new_kind, project_id, old_kind, item_id),
            )
            cx.execute(
                "DELETE FROM dockyard_canonical_work_bindings "
                "WHERE project_id=? AND item_kind=? AND item_id=?",
                (project_id, old_kind, item_id),
            )

    def list_backlog(self, project_id: str) -> list[dict[str, Any]]:
        rows = self.store._conn.execute(
            """
            SELECT b.item_id, b.item_kind, b.rank, b.priority_reason,
                   w.initiative_ref
            FROM dockyard_canonical_backlog AS b
            LEFT JOIN dockyard_canonical_work_bindings AS w
              ON w.project_id=b.project_id
             AND w.item_kind=b.item_kind
             AND w.item_id=b.item_id
            WHERE b.project_id=?
            ORDER BY b.rank
            """,
            (project_id,),
        ).fetchall()
        return [
            {
                "item_ref": str(row["item_id"]),
                "item_kind": str(row["item_kind"]),
                "rank": int(row["rank"]),
                "priority_reason": str(row["priority_reason"]),
                "initiative_ref": row["initiative_ref"],
            }
            for row in rows
        ]

    def rerank(
        self,
        project_id: str,
        item_id: str,
        new_rank: int,
        reason: str,
        *,
        actor: Actor,
    ) -> dict[str, Any]:
        clean_reason = reason.strip()
        if new_rank < 1:
            raise ValueError("rerank target must be at least 1")
        if len(clean_reason) < 4:
            raise ValueError("rerank requires a priority reason")
        with self.store.tx() as cx:
            row = cx.execute(
                "SELECT item_kind, rank FROM dockyard_canonical_backlog "
                "WHERE project_id=? AND item_id=?",
                (project_id, item_id),
            ).fetchone()
            if row is None:
                raise ValueError(f"no canonical backlog entry {item_id}")
            old_rank = int(row["rank"])
            item_kind = str(row["item_kind"])
            if new_rank != old_rank:
                sentinel = self._temporary_offset(cx, project_id)
                cx.execute(
                    "UPDATE dockyard_canonical_backlog SET rank=? "
                    "WHERE project_id=? AND item_kind=? AND item_id=?",
                    (sentinel, project_id, item_kind, item_id),
                )
                if new_rank > old_rank:
                    self._shift_decrease_range(
                        cx,
                        project_id,
                        old_rank + 1,
                        new_rank,
                    )
                else:
                    self._shift_increase_range(
                        cx,
                        project_id,
                        new_rank,
                        old_rank,
                    )
            cx.execute(
                "UPDATE dockyard_canonical_backlog SET rank=?, "
                "last_rerank_actor=?, last_rerank_kind=?, "
                "last_rerank_reason=? "
                "WHERE project_id=? AND item_kind=? AND item_id=?",
                (
                    new_rank,
                    actor.id,
                    actor.kind.value,
                    clean_reason,
                    project_id,
                    item_kind,
                    item_id,
                ),
            )
        return {
            "item_ref": item_id,
            "item_kind": item_kind,
            "from_rank": old_rank,
            "to_rank": new_rank,
            "reason": clean_reason,
        }
