"""Persisted project planning boards (Phase 8A, multi-board since v33).

A project holds any number of named boards. Each board is its own revisioned
document with a lifecycle (draft -> submitted -> planned -> completed; any
live status may be archived and restored to exactly where it was). Board
metadata (name, status, theme, model) never bumps the content revision, so a
metadata change cannot conflict with an in-flight edit.

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
BOARD_STATUSES = ("draft", "submitted", "planned", "completed", "archived")
BOARD_THEMES = frozenset({"light", "dark"})
DEFAULT_BOARD_NAME = "Main board"
MAX_NAME = 120
_EDITABLE = frozenset({"draft", "submitted", "planned"})
# Moves the lifecycle allows by hand. "planned" is normally reached by
# synthesising a plan; reopening a completed board returns it to "planned".
_MOVES = {
    "draft": {"submitted"},
    "submitted": {"draft", "planned"},
    "planned": {"submitted", "completed"},
    "completed": {"planned"},
}
_UNSET: Any = object()


class CanvasConflictError(RuntimeError):
    """The caller attempted to write an older canvas revision."""


class CanvasLockedError(CanvasConflictError):
    """The board is completed or archived and therefore read-only."""


class CanvasService:
    def __init__(self, store: Store) -> None:
        self.store = store

    # ----------------------------------------------------------- helpers --
    def _ensure_project(self, project_id: str) -> None:
        row = self.store._conn.execute(
            "SELECT 1 FROM project_stewardship WHERE project_id=?", (project_id,)
        ).fetchone()
        if row is None:
            raise ValueError(f"unknown project: {project_id}")

    @staticmethod
    def _clean_name(name: Any) -> str:
        text = " ".join(str(name or "").split())
        if not text:
            raise ValueError("board name is required")
        if len(text) > MAX_NAME:
            raise ValueError(f"board name must be at most {MAX_NAME} characters")
        return text

    @staticmethod
    def _clean_model(model: Any, catalogue: dict[str, Any] | None) -> str | None:
        if model is None:
            return None
        if not isinstance(model, dict):
            raise ValueError("model must be {provider, model}")
        provider = str(model.get("provider") or "").strip()
        name = str(model.get("model") or "").strip()
        if not provider or not name or len(provider) > 200 or len(name) > 200:
            raise ValueError("model needs a provider and a model name")
        if catalogue is not None and catalogue.get("available"):
            known = {row.get("slug"): set(row.get("models") or []) for row in catalogue.get("providers") or []}
            if provider not in known:
                raise ValueError(f"provider {provider!r} is not configured in Hermes")
            if known[provider] and name not in known[provider]:
                raise ValueError(f"model {name!r} is not configured in Hermes for {provider!r}")
        return json.dumps({"provider": provider, "model": name}, sort_keys=True)

    def _row(self, project_id: str, canvas_id: str):
        row = self.store._conn.execute(
            "SELECT * FROM project_canvases WHERE project_id=? AND canvas_id=?", (project_id, canvas_id)
        ).fetchone()
        if row is None:
            raise ValueError(f"unknown canvas board: {canvas_id}")
        return row

    @staticmethod
    def _board(row) -> dict[str, Any]:
        return {
            "canvas_id": row["canvas_id"],
            "project_id": row["project_id"],
            "name": row["name"],
            "status": row["status"],
            "archived_from": row["archived_from"],
            "theme": row["theme"],
            "model": json.loads(row["model_json"]) if row["model_json"] else None,
            "revision": int(row["revision"]),
            "objects": json.loads(row["objects_json"]),
            "connectors": json.loads(row["connectors_json"]),
            "created_at": row["created_at"],
            "updated_at": row["updated_at"],
            "updated_by": row["updated_by"],
        }

    @staticmethod
    def _unique_name(cx, project_id: str, name: str, *, skip: str | None = None) -> None:
        clash = cx.execute(
            "SELECT 1 FROM project_canvases WHERE project_id=? AND lower(name)=lower(?)"
            " AND status!='archived' AND canvas_id IS NOT ?",
            (project_id, name, skip),
        ).fetchone()
        if clash:
            raise ValueError(f"a board named {name!r} already exists in this project")

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

    # ------------------------------------------------------------ boards --
    def create_board(self, project_id: str, *, name: str, actor: str) -> dict[str, Any]:
        self._ensure_project(project_id)
        clean = self._clean_name(name)
        now = iso(self.store._clock())
        canvas_id = "canvas-" + uuid.uuid4().hex[:16]
        with self.store.tx() as cx:
            self._unique_name(cx, project_id, clean)
            cx.execute(
                "INSERT INTO project_canvases(canvas_id, project_id, name, status, revision, objects_json,"
                " connectors_json, created_at, updated_at, updated_by) VALUES(?,?,?,'draft',1,'[]','[]',?,?,?)",
                (canvas_id, project_id, clean, now, now, actor),
            )
        return self.get_board(project_id, canvas_id)

    def get_board(self, project_id: str, canvas_id: str) -> dict[str, Any]:
        self._ensure_project(project_id)
        return self._board(self._row(project_id, canvas_id))

    def list_boards(self, project_id: str, *, include_archived: bool = False) -> list[dict[str, Any]]:
        self._ensure_project(project_id)
        rows = self.store._conn.execute(
            "SELECT c.*,"
            " (SELECT COUNT(*) FROM canvas_plans p WHERE p.canvas_id=c.canvas_id) AS plan_count,"
            " (SELECT MAX(p.canvas_revision) FROM canvas_plans p WHERE p.canvas_id=c.canvas_id) AS planned_revision"
            " FROM project_canvases c WHERE c.project_id=?"
            + ("" if include_archived else " AND c.status!='archived'")
            + " ORDER BY c.updated_at DESC, c.rowid DESC",
            (project_id,),
        ).fetchall()
        result = []
        for row in rows:
            board = self._board(row)
            board["object_count"] = len(board.pop("objects"))
            board.pop("connectors")
            board["plan_count"] = int(row["plan_count"])
            # A plan made from an older revision no longer matches the board.
            board["changed_since_plan"] = bool(row["plan_count"]) and int(row["planned_revision"] or 0) < board["revision"]
            result.append(board)
        return result

    def update_board(self, project_id: str, canvas_id: str, *, actor: str, name: Any = _UNSET,
                     status: Any = _UNSET, theme: Any = _UNSET, model: Any = _UNSET,
                     catalogue: dict[str, Any] | None = None) -> dict[str, Any]:
        self._ensure_project(project_id)
        sets: dict[str, Any] = {}
        if theme is not _UNSET:
            if theme is not None and theme not in BOARD_THEMES:
                raise ValueError("theme must be light, dark or unset")
            sets["theme"] = theme
        if model is not _UNSET:
            sets["model_json"] = self._clean_model(model, catalogue)
        if name is not _UNSET:
            sets["name"] = self._clean_name(name)
        with self.store.tx() as cx:
            row = cx.execute(
                "SELECT name, status, archived_from FROM project_canvases WHERE project_id=? AND canvas_id=?",
                (project_id, canvas_id),
            ).fetchone()
            if row is None:
                raise ValueError(f"unknown canvas board: {canvas_id}")
            current = row["status"]
            if status is not _UNSET and status != current:
                if status not in BOARD_STATUSES:
                    raise ValueError(f"unknown board status: {status}")
                if status == "archived":
                    sets.update(status="archived", archived_from=current)
                elif current == "archived":
                    if status != row["archived_from"]:
                        raise ValueError(
                            f"cannot move an archived board to {status}; restore returns it to {row['archived_from']}")
                    sets.update(status=status, archived_from=None)
                elif status not in _MOVES[current]:
                    raise ValueError(f"cannot move a board from {current} to {status}")
                else:
                    sets["status"] = status
            if sets.get("status", current) != "archived" and ("name" in sets or current == "archived"):
                # A rename, or restoring an archived board, must not collide
                # with a live board's name.
                self._unique_name(cx, project_id, sets.get("name", row["name"]), skip=canvas_id)
            if sets:
                sets["updated_at"] = iso(self.store._clock())
                sets["updated_by"] = actor
                cols = ", ".join(f"{key}=?" for key in sets)
                cx.execute(f"UPDATE project_canvases SET {cols} WHERE canvas_id=?", (*sets.values(), canvas_id))
        return self.get_board(project_id, canvas_id)

    def advance(self, canvas_id: str, status: str, *, only_from: tuple[str, ...]) -> None:
        """System transition (submitted on first AI run, planned on plan
        synthesis). Only moves forward from the listed states, so it never
        overrides a board a person has completed or archived."""
        marks = ",".join("?" * len(only_from))
        with self.store.tx() as cx:
            cx.execute(f"UPDATE project_canvases SET status=? WHERE canvas_id=? AND status IN ({marks})",
                       (status, canvas_id, *only_from))

    def require_editable(self, project_id: str, canvas_id: str) -> dict[str, Any]:
        board = self.get_board(project_id, canvas_id)
        if board["status"] not in _EDITABLE:
            raise CanvasLockedError(f"board is {board['status']} and read-only; reopen it to edit")
        return board

    # -------------------------------------------- legacy single-board API --
    def default_board_id(self, project_id: str) -> str:
        """The board the pre-v33 /canvas routes act on: the most recently
        updated live board, creating "Main board" when a project has none."""
        self._ensure_project(project_id)
        row = self.store._conn.execute(
            "SELECT canvas_id FROM project_canvases WHERE project_id=? AND status!='archived'"
            # rowid breaks timestamp ties so the newer board always wins.
            " ORDER BY updated_at DESC, rowid DESC LIMIT 1",
            (project_id,),
        ).fetchone()
        if row is not None:
            return row["canvas_id"]
        return self.create_board(project_id, name=DEFAULT_BOARD_NAME, actor="system")["canvas_id"]

    def create_document(self, project_id: str, *, actor: str) -> dict[str, Any]:
        """Legacy: ensure the project has a board and return it."""
        return self.get_board(project_id, self.default_board_id(project_id))

    def get(self, project_id: str, canvas_id: str | None = None) -> dict[str, Any]:
        return self.get_board(project_id, canvas_id or self.default_board_id(project_id))

    # ------------------------------------------------------------ writes --
    def save(self, project_id: str, *, expected_revision: int, objects: list[dict[str, Any]],
             connectors: list[dict[str, Any]], actor: str, canvas_id: str | None = None) -> dict[str, Any]:
        self._ensure_project(project_id)
        canvas_id = canvas_id or self.default_board_id(project_id)
        normal_objects = self._normalise_objects(objects)
        normal_connectors = self._normalise_connectors(connectors, {item["id"] for item in normal_objects})
        now = iso(self.store._clock())
        with self.store.tx() as cx:
            row = cx.execute(
                "SELECT revision, status FROM project_canvases WHERE project_id=? AND canvas_id=?",
                (project_id, canvas_id),
            ).fetchone()
            if row is None:
                raise ValueError(f"unknown canvas board: {canvas_id}")
            if row["status"] not in _EDITABLE:
                raise CanvasLockedError(f"board is {row['status']} and read-only; reopen it to edit")
            if int(row["revision"]) != int(expected_revision):
                raise CanvasConflictError(
                    f"canvas revision conflict: expected {expected_revision}, current {row['revision']}")
            cx.execute(
                "UPDATE project_canvases SET revision=revision+1, objects_json=?, connectors_json=?,"
                " updated_at=?, updated_by=? WHERE canvas_id=?",
                (json.dumps(normal_objects, sort_keys=True), json.dumps(normal_connectors, sort_keys=True),
                 now, actor, canvas_id),
            )
        return self.get_board(project_id, canvas_id)

    def remove_object(self, project_id: str, object_id: str, *, expected_revision: int, actor: str,
                      canvas_id: str | None = None) -> dict[str, Any]:
        current = self.get(project_id, canvas_id)
        objects = [item for item in current["objects"] if item["id"] != object_id]
        if len(objects) == len(current["objects"]):
            raise ValueError(f"unknown canvas object: {object_id}")
        connectors = [edge for edge in current["connectors"]
                      if edge["source"] != object_id and edge["target"] != object_id]
        return self.save(project_id, expected_revision=expected_revision, objects=objects,
                         connectors=connectors, actor=actor, canvas_id=current["canvas_id"])
