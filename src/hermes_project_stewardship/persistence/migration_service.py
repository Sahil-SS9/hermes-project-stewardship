"""One-shot legacy Dockyard work migration into canonical Hermes work."""
from __future__ import annotations

import hashlib
import json
from pathlib import Path
import shutil
from typing import Any

from ..kanban import create_project_kanban_adapter
from .canonical_work_service import CanonicalWorkPort
from .store import Store


class LegacyWorkMigrator:
    def __init__(self, store: Store, port: CanonicalWorkPort) -> None:
        self.store = store
        self.port = port

    def source_digest(self) -> str:
        rows = self.store._conn.execute(
            "SELECT * FROM dockyard_work_items ORDER BY id"
        ).fetchall()
        encoded = json.dumps(
            [dict(row) for row in rows], sort_keys=True, default=str,
            separators=(",", ":"),
        ).encode("utf-8")
        return hashlib.sha256(encoded).hexdigest()

    def dry_run(self, project_id: str) -> dict[str, Any]:
        rows = self.store._conn.execute(
            "SELECT * FROM dockyard_work_items WHERE project_id=? ORDER BY id",
            (project_id,),
        ).fetchall()
        items = []
        known = {row["id"] for row in rows}
        for row in rows:
            if row["type"] == "initiative":
                continue
            if row["parent_id"] is not None and row["parent_id"] not in known:
                raise ValueError("legacy work contains an unresolved parent")
            items.append({
                "legacy_id": row["id"],
                "legacy_ref": row["ref"],
                "kind": row["type"],
                "title": row["title"],
                "status": row["status"],
                "assignee": row["assignee_id"],
                "created_by": row["created_by_id"] or "dockyard-migration",
                "parent_id": row["parent_id"],
                "body": self._body(row),
            })
        return {"project_id": project_id, "items": items, "count": len(items),
                "source_digest": self.source_digest()}

    def apply(self, project_id: str) -> dict[str, Any]:
        plan = self.dry_run(project_id)
        before = plan["source_digest"]
        pending = list(plan["items"])
        created: dict[int, dict[str, Any]] = {}
        while pending:
            progressed = False
            for item in list(pending):
                parent = item["parent_id"]
                if parent is not None and parent not in created:
                    continue
                record = self.port.create_work(
                    project_id,
                    kind=item["kind"],
                    title=item["title"],
                    body=item["body"],
                    assignee=item["assignee"],
                    created_by=item["created_by"],
                    parent_id=created[parent]["id"] if parent is not None else None,
                    idempotency_key=f"dockyard-migrate:{project_id}:{item['legacy_ref']}",
                )
                if item["status"] != "backlog":
                    record = self.port.transition_work(
                        project_id, item["kind"], record["id"], item["status"])
                created[item["legacy_id"]] = record
                pending.remove(item)
                progressed = True
            if not progressed:
                raise ValueError("legacy work hierarchy cannot be resolved")
        if self.source_digest() != before:
            raise RuntimeError("legacy source changed during migration")
        return {
            "project_id": project_id,
            "count": len(created),
            "source_digest": before,
            "mapping": {str(key): value["id"] for key, value in created.items()},
        }

    @staticmethod
    def _body(row: Any) -> str | None:
        parts = []
        labels = json.loads(row["labels_json"] or "[]")
        evidence = json.loads(row["evidence_refs_json"] or "[]")
        if labels:
            parts.append("Labels: " + ", ".join(labels))
        if evidence:
            parts.append("Evidence: " + ", ".join(evidence))
        if row["estimate_days"] is not None:
            parts.append(f"Estimate: {row['estimate_days']:g} days")
        return "\n".join(parts) or None


class IsolatedMigrationRunner:
    """Snapshot-backed migration runner restricted to marker-owned fixtures."""

    TARGET_MARKER = ".dockyard-isolated-migration-target"
    SOURCE_MARKER = ".dockyard-isolated-migration-source"

    def __init__(
        self,
        *,
        source_db: Path,
        target_home: Path,
        snapshot: Path,
        board: str,
    ) -> None:
        self.source_db = source_db.expanduser().resolve()
        self.target_home = target_home.expanduser().resolve()
        self.snapshot = snapshot.expanduser().resolve()
        self.board = board
        self._require_owned(self.source_db.parent, self.SOURCE_MARKER)
        self._require_owned(self.target_home, self.TARGET_MARKER)
        if not self.source_db.is_file() or self.source_db.is_symlink():
            raise ValueError("source database must be a real file")
        if self.snapshot == self.target_home or self.snapshot.is_relative_to(self.target_home):
            raise ValueError("snapshot must be outside the target home")

    @staticmethod
    def _require_owned(root: Path, marker: str) -> None:
        if root.is_symlink() or not root.is_dir():
            raise ValueError("migration root must be a real directory")
        marker_path = root / marker
        if not marker_path.is_file() or marker_path.is_symlink():
            raise ValueError(f"migration root is missing {marker}")
        if marker_path.read_text(encoding="utf-8").strip() != "dockyard-isolated-v1":
            raise ValueError("migration ownership marker is invalid")

    def dry_run(self, project_id: str) -> dict[str, Any]:
        store = Store(self.source_db)
        try:
            return LegacyWorkMigrator(
                store,
                create_project_kanban_adapter(
                    hermes_home=self.target_home,
                    board=self.board,
                ),
            ).dry_run(project_id)
        finally:
            store.close()

    def apply(self, project_id: str) -> dict[str, Any]:
        if self.snapshot.exists() or self.snapshot.is_symlink():
            raise ValueError("snapshot path must not already exist")
        shutil.copytree(self.target_home, self.snapshot, symlinks=True)
        failed = self.snapshot.with_name(self.snapshot.name + "-failed")
        if failed.exists() or failed.is_symlink():
            raise ValueError("failed-target preservation path already exists")
        store = Store(self.source_db)
        try:
            result = LegacyWorkMigrator(
                store,
                create_project_kanban_adapter(
                    hermes_home=self.target_home,
                    board=self.board,
                ),
            ).apply(project_id)
            return {**result, "snapshot": str(self.snapshot), "rolled_back": False}
        except Exception:
            self.target_home.rename(failed)
            shutil.copytree(self.snapshot, self.target_home, symlinks=True)
            raise
        finally:
            store.close()

    def rollback(self) -> dict[str, Any]:
        self._require_owned(self.target_home, self.TARGET_MARKER)
        if not self.snapshot.is_dir() or self.snapshot.is_symlink():
            raise ValueError("verified snapshot directory is required")
        applied = self.snapshot.with_name(self.snapshot.name + "-applied")
        if applied.exists() or applied.is_symlink():
            raise ValueError("applied-target preservation path already exists")
        self.target_home.rename(applied)
        shutil.copytree(self.snapshot, self.target_home, symlinks=True)
        return {
            "rolled_back": True,
            "restored_from": str(self.snapshot),
            "preserved_target": str(applied),
        }
