"""Persisted project planning canvas (Phase 8A).

Canvas state is project-owned metadata. Evidence/file records and canonical
work remain owned by their existing services; canvas objects may reference
those records but never copy or delete them.
"""
from __future__ import annotations

import json
import uuid
from typing import Any

from .store import Store, iso

OBJECT_KINDS = frozenset({"evidence", "claim", "question", "decision", "plan_block", "note", "link", "media"})
CONNECTOR_MEANINGS = frozenset({"supports", "contradicts", "derived_from", "clarifies", "depends_on", "implements", "raises_question"})


class CanvasConflictError(RuntimeError):
    """The caller attempted to write an older canvas revision."""


class CanvasService:
    def __init__(self, store: Store) -> None:
        self.store = store

    def _ensure_project(self, project_id: str) -> None:
        row = self.store._conn.execute(
            "SELECT 1 FROM project_stewardship WHERE project_id=?", (project_id,)
        ).fetchone()
        if row is None:
            raise ValueError(f"unknown project: {project_id}")

    @staticmethod
    def _normalise_objects(objects: list[dict[str, Any]]) -> list[dict[str, Any]]:
        seen: set[str] = set()
        result: list[dict[str, Any]] = []
        for raw in objects:
            if not isinstance(raw, dict):
                raise ValueError("canvas objects must be objects")
            object_id = str(raw.get("id") or "").strip()
            kind = str(raw.get("kind") or "").strip()
            if not object_id or object_id in seen:
                raise ValueError("canvas object IDs must be non-empty and unique")
            if kind not in OBJECT_KINDS:
                raise ValueError(f"unknown canvas object kind: {kind or '<empty>'}")
            content = raw.get("content", {})
            if not isinstance(content, dict):
                raise ValueError("canvas object content must be an object")
            seen.add(object_id)
            result.append({
                "id": object_id,
                "kind": kind,
                "content": content,
                "x": float(raw.get("x", 0)),
                "y": float(raw.get("y", 0)),
                "width": float(raw.get("width", 240)),
                "height": float(raw.get("height", 140)),
                "tags": list(raw.get("tags", [])),
                "evidence_ref": raw.get("evidence_ref"),
                "work_ref": raw.get("work_ref"),
            })
        return result

    @classmethod
    def _normalise_connectors(cls, connectors: list[dict[str, Any]], object_ids: set[str]) -> list[dict[str, Any]]:
        seen: set[str] = set()
        triples: set[tuple[str, str, str]] = set()
        result: list[dict[str, Any]] = []
        for raw in connectors:
            if not isinstance(raw, dict):
                raise ValueError("canvas connectors must be objects")
            edge_id = str(raw.get("id") or "").strip()
            source = str(raw.get("source") or "").strip()
            target = str(raw.get("target") or "").strip()
            meaning = str(raw.get("meaning") or "").strip()
            if not edge_id or edge_id in seen:
                raise ValueError("canvas connector IDs must be non-empty and unique")
            if source not in object_ids or target not in object_ids:
                raise ValueError("canvas connector references an unknown object")
            if meaning not in CONNECTOR_MEANINGS:
                raise ValueError(f"unknown connector meaning: {meaning or '<empty>'}")
            if source == target:
                raise ValueError("canvas connectors cannot link an object to itself")
            triple = (source, target, meaning)
            if triple in triples:
                raise ValueError(f"duplicate canvas connector: {source} -> {target} ({meaning}) already exists")
            triples.add(triple)
            seen.add(edge_id)
            result.append({"id": edge_id, "source": source, "target": target, "meaning": meaning})
        return result

    def create_document(self, project_id: str, *, actor: str) -> dict[str, Any]:
        self._ensure_project(project_id)
        now = iso(self.store._clock())
        document_id = "canvas-" + uuid.uuid4().hex[:16]
        with self.store.tx() as cx:
            cx.execute(
                "INSERT INTO project_canvases(canvas_id, project_id, revision, objects_json, connectors_json, created_at, updated_at, updated_by) VALUES(?,?,?,?,?,?,?,?)",
                (document_id, project_id, 1, "[]", "[]", now, now, actor),
            )
        return self.get(project_id)

    def get(self, project_id: str) -> dict[str, Any]:
        self._ensure_project(project_id)
        row = self.store._conn.execute(
            "SELECT * FROM project_canvases WHERE project_id=?", (project_id,)
        ).fetchone()
        if row is None:
            return self.create_document(project_id, actor="system")
        return {
            "canvas_id": row["canvas_id"],
            "project_id": row["project_id"],
            "revision": int(row["revision"]),
            "objects": json.loads(row["objects_json"]),
            "connectors": json.loads(row["connectors_json"]),
            "updated_at": row["updated_at"],
            "updated_by": row["updated_by"],
        }

    def save(self, project_id: str, *, expected_revision: int, objects: list[dict[str, Any]], connectors: list[dict[str, Any]], actor: str) -> dict[str, Any]:
        self._ensure_project(project_id)
        normal_objects = self._normalise_objects(objects)
        normal_connectors = self._normalise_connectors(connectors, {item["id"] for item in normal_objects})
        now = iso(self.store._clock())
        with self.store.tx() as cx:
            row = cx.execute("SELECT canvas_id, revision FROM project_canvases WHERE project_id=?", (project_id,)).fetchone()
            if row is None:
                raise ValueError("canvas document does not exist")
            if int(row["revision"]) != int(expected_revision):
                raise CanvasConflictError(f"canvas revision conflict: expected {expected_revision}, current {row['revision']}")
            cx.execute(
                "UPDATE project_canvases SET revision=revision+1, objects_json=?, connectors_json=?, updated_at=?, updated_by=? WHERE project_id=?",
                (json.dumps(normal_objects, sort_keys=True), json.dumps(normal_connectors, sort_keys=True), now, actor, project_id),
            )
        return self.get(project_id)

    def remove_object(self, project_id: str, object_id: str, *, expected_revision: int, actor: str) -> dict[str, Any]:
        current = self.get(project_id)
        objects = [item for item in current["objects"] if item["id"] != object_id]
        if len(objects) == len(current["objects"]):
            raise ValueError(f"unknown canvas object: {object_id}")
        connectors = [edge for edge in current["connectors"] if edge["source"] != object_id and edge["target"] != object_id]
        return self.save(project_id, expected_revision=expected_revision, objects=objects, connectors=connectors, actor=actor)
