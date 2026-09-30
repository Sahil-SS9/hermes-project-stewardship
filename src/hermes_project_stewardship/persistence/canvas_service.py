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

import datetime
import json
import re
import uuid
from typing import Any

from .store import Store, iso

OBJECT_KINDS = frozenset({"evidence", "claim", "question", "decision", "plan_block", "note", "link", "media",
                          "risk", "assumption"})
CONNECTOR_MEANINGS = frozenset({"supports", "contradicts", "derived_from", "clarifies", "depends_on", "implements", "raises_question"})
BOARD_STATUSES = ("draft", "submitted", "planned", "completed", "archived")
BOARD_THEMES = frozenset({"light", "dark"})
# D20: sticker colours are palette KEYS, never raw CSS. The desktop maps each
# key to a theme token, so a stored value can never inject a style.
STICKER_COLOURS = frozenset({"yellow", "green", "blue", "pink", "purple", "orange"})
DEFAULT_BOARD_NAME = "Main board"

# Stage 1 card fields. Every field is validated by type and size. Fields are
# kept whatever the card's current kind, so changing kind hides fields rather
# than deleting them (owner decision 4a). Unknown legacy keys are kept too,
# inside a total size cap, so old boards still save.
_LEVELS = frozenset({"low", "medium", "high"})
_TEXT_FIELDS = {  # name -> max characters
    "text": 4000, "title": 4000, "description": 20000, "source": 300, "quote": 5000,
    "answer": 5000, "rationale": 5000, "estimate": 50, "mitigation": 5000,
    "test": 2000, "alt": 300, "caption": 500, "url": 2048,
}
_CHOICE_FIELDS = {
    "confidence": _LEVELS, "likelihood": _LEVELS, "impact": _LEVELS,
    "claim_status": frozenset({"unverified", "supported", "disputed", "refuted"}),
    "question_status": frozenset({"open", "answered"}),
    "decision_status": frozenset({"proposed", "accepted", "rejected", "superseded"}),
    "plan_status": frozenset({"todo", "in_progress", "blocked", "done"}),
    "risk_status": frozenset({"open", "mitigating", "closed"}),
    "assumption_status": frozenset({"untested", "validated", "invalidated"}),
}
_DATE_FIELDS = frozenset({"observed_on", "decided_on", "due_on"})
_MEMBER_FIELDS = frozenset({"owner", "decided_by"})
MAX_LINKS = 20
MAX_LIST_ITEMS = 50
MAX_CONTENT_BYTES = 64 * 1024
# Same rule as canvasSafeUrl in the desktop client: scheme, a dotted host, no spaces.
_WEB_URL = re.compile(r"^https?://[^\s/?#]+\.[^\s/?#]+(?:[/?#]\S*)?$", re.IGNORECASE)
_DATE = re.compile(r"^\d{4}-\d{2}-\d{2}$")
_CONTENT_ID = re.compile(r"^CONTENT-[0-9A-F]{16}$")
MAX_NAME = 120
# Stage 2 rich text (owner 30/09, TipTap JSON). Only this allow-list is stored:
# no HTML, no raw CSS, no links or code inside text. Sizes and alignment are
# named options. The plain "description" is always re-derived from the doc so
# AI prompts, search and card previews never see markup.
_RT_BLOCKS = {
    "paragraph": {"textAlign"}, "heading": {"level", "textAlign"},
    "bulletList": set(), "orderedList": {"start", "type"}, "listItem": set(),
}
_RT_INLINE = {"text", "hardBreak"}
_RT_MARKS = {"bold": set(), "italic": set(), "underline": set(), "strike": set(), "fontSize": {"size"}}
_RT_ALIGN = frozenset({"left", "center", "right", "justify"})
_RT_SIZES = frozenset({"small", "large", "huge"})
MAX_RT_NODES = 3000
MAX_RT_DEPTH = 12
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
    def _normalise_objects(objects: list[dict[str, Any]],
                           previous: dict[str, dict[str, Any]] | None = None) -> list[dict[str, Any]]:
        """``previous`` maps object id -> stored content. Values a save leaves
        unchanged are passed through unvalidated, so old or now-stale data
        (legacy values, a deleted image, a relinked member) never blocks a
        save; only new or changed values must meet the current rules."""
        previous = previous or {}
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
            content = CanvasService._normalise_content(raw.get("content", {}), previous.get(object_id))
            colour = raw.get("colour")
            if colour in (None, ""):
                colour = None
            elif not isinstance(colour, str) or colour not in STICKER_COLOURS:
                raise ValueError(f"unknown sticker colour: {colour!r}")
            seen.add(object_id)
            result.append({
                "id": object_id,
                "kind": kind,
                "content": content,
                "colour": colour,
                "x": float(raw.get("x", 0)),
                "y": float(raw.get("y", 0)),
                "width": float(raw.get("width", 240)),
                "height": float(raw.get("height", 140)),
                "tags": list(raw.get("tags", [])),
                "evidence_ref": raw.get("evidence_ref"),
                "work_ref": raw.get("work_ref"),
            })
        return result

    @staticmethod
    def _normalise_content(content: Any, previous: dict[str, Any] | None = None) -> dict[str, Any]:
        if not isinstance(content, dict):
            raise ValueError("canvas object content must be an object")
        previous = previous if isinstance(previous, dict) else {}
        if content == previous and previous:
            return dict(previous)  # untouched card: keep exactly as stored
        out: dict[str, Any] = {}
        for key, value in content.items():
            if not isinstance(key, str):
                raise ValueError("canvas content keys must be strings")
            if value is None or value == "":
                continue  # empty = unset (e.g. "Unassigned")
            if key in previous and previous[key] == value and key != "description_doc":
                out[key] = value  # unchanged value: not re-validated
                continue
            if key in _TEXT_FIELDS:
                if not isinstance(value, str) or len(value) > _TEXT_FIELDS[key]:
                    raise ValueError(f"card field {key!r} must be text of at most {_TEXT_FIELDS[key]} characters")
                if key == "url":
                    CanvasService._check_url(value)
            elif key in _CHOICE_FIELDS:
                if value not in _CHOICE_FIELDS[key]:
                    raise ValueError(f"card field {key!r} must be one of {sorted(_CHOICE_FIELDS[key])}")
            elif key in _DATE_FIELDS:
                if not isinstance(value, str) or not _DATE.match(value):
                    raise ValueError(f"card field {key!r} must be a date (YYYY-MM-DD)")
                try:
                    datetime.date.fromisoformat(value)
                except ValueError:
                    raise ValueError(f"card field {key!r} is not a real date") from None
            elif key in _MEMBER_FIELDS:
                if not isinstance(value, str) or not value.strip() or len(value) > 64:
                    raise ValueError(f"card field {key!r} must be a project member")
                value = value.strip()
            elif key == "description_doc":
                value = CanvasService._check_rich_text(value)
            elif key == "content_id":
                if not isinstance(value, str) or not _CONTENT_ID.match(value):
                    raise ValueError("card image must reference uploaded project content")
            elif key == "links":
                if not isinstance(value, list) or len(value) > MAX_LINKS:
                    raise ValueError(f"a card holds at most {MAX_LINKS} links")
                links = []
                for link in value:
                    if not isinstance(link, dict):
                        raise ValueError("each link must be an object")
                    url = link.get("url")
                    label = link.get("label") or ""
                    if url is not None and not isinstance(url, str):
                        raise ValueError("a link address must be text")
                    if not url or not url.strip():
                        continue  # a blank new line is dropped, not an error
                    url = url.strip()
                    if len(url) > 2048 or not isinstance(label, str) or len(label) > 200:
                        raise ValueError("a link is at most 2048 characters with a label of at most 200")
                    CanvasService._check_url(url)
                    links.append({"url": url, "label": label.strip()} if label.strip() else {"url": url})
                value = links
            elif key == "alternatives":
                if not isinstance(value, list) or len(value) > MAX_LIST_ITEMS or not all(
                        isinstance(item, str) and len(item) <= 500 for item in value):
                    raise ValueError(f"alternatives must be at most {MAX_LIST_ITEMS} short texts")
                value = [item.strip() for item in value if item.strip()]
            elif key == "checklist":
                if not isinstance(value, list) or len(value) > MAX_LIST_ITEMS:
                    raise ValueError(f"a checklist holds at most {MAX_LIST_ITEMS} items")
                items = []
                for item in value:
                    if not isinstance(item, dict) or not isinstance(item.get("text", ""), str) \
                            or len(item.get("text", "")) > 300 or not isinstance(item.get("done", False), bool):
                        raise ValueError("each checklist item is short text with a done flag")
                    if item.get("text", "").strip():
                        items.append({"text": item["text"].strip(), "done": bool(item.get("done", False))})
                value = items
            out[key] = value
        if "description_doc" in out:
            plain = CanvasService._rich_text_plain(out["description_doc"]).strip()
            if len(plain) > _TEXT_FIELDS["description"]:
                raise ValueError("description must be at most 20000 characters")
            if plain:
                out["description"] = plain
            else:  # an empty editor means no description at all
                out.pop("description", None)
                out.pop("description_doc", None)
        if len(json.dumps(out, ensure_ascii=False).encode("utf-8")) > MAX_CONTENT_BYTES:
            raise ValueError("a card holds at most 64 KB of content")
        return out

    @staticmethod
    def _check_rich_text(doc: Any) -> dict[str, Any]:
        """Rebuild a TipTap doc from the allow-list; refuse anything else."""
        count = 0

        def attrs_of(node: dict[str, Any], allowed: set[str], what: str) -> dict[str, Any]:
            raw = node.get("attrs") or {}
            if not isinstance(raw, dict):
                raise ValueError(f"rich text {what} attributes must be an object")
            clean: dict[str, Any] = {}
            for name, val in raw.items():
                if val is None or (name == "textAlign" and val == "left"):
                    continue  # defaults are not stored
                if name not in allowed:
                    raise ValueError(f"rich text {what} does not allow {name!r}")
                if name == "textAlign" and val not in _RT_ALIGN:
                    raise ValueError("text alignment must be left, center, right or justify")
                if name == "level" and val not in (1, 2, 3):
                    raise ValueError("headings are level 1, 2 or 3")
                if name == "start" and (not isinstance(val, int) or isinstance(val, bool) or not 1 <= val <= 9999):
                    raise ValueError("a numbered list starts between 1 and 9999")
                if name == "type" and val not in ("1", "a", "A", "i", "I"):
                    raise ValueError("unsupported numbering style")
                if name == "size" and val not in _RT_SIZES:
                    raise ValueError("text size must be small, large or huge")
                if name in ("start", "type") and val in (1, "1"):
                    continue
                clean[name] = val
            return clean

        def walk(node: Any, depth: int) -> dict[str, Any]:
            nonlocal count
            count += 1
            if count > MAX_RT_NODES or depth > MAX_RT_DEPTH:
                raise ValueError("rich text is too large or too deeply nested")
            if not isinstance(node, dict) or not isinstance(node.get("type"), str):
                raise ValueError("rich text nodes must be objects with a type")
            kind = node["type"]
            if kind == "text":
                text = node.get("text")
                if not isinstance(text, str) or not text:
                    raise ValueError("rich text needs non-empty text in text nodes")
                out: dict[str, Any] = {"type": "text", "text": text}
                marks = node.get("marks") or []
                if not isinstance(marks, list) or len(marks) > len(_RT_MARKS):
                    raise ValueError("rich text marks must be a short list")
                clean_marks = []
                for mark in marks:
                    if not isinstance(mark, dict) or mark.get("type") not in _RT_MARKS:
                        raise ValueError(f"rich text formatting {mark.get('type') if isinstance(mark, dict) else mark!r} is not allowed")
                    m = {"type": mark["type"]}
                    a = attrs_of(mark, _RT_MARKS[mark["type"]], mark["type"])
                    if mark["type"] == "fontSize" and "size" not in a:
                        continue
                    if a:
                        m["attrs"] = a
                    clean_marks.append(m)
                if clean_marks:
                    out["marks"] = clean_marks
                return out
            if kind == "hardBreak":
                return {"type": "hardBreak"}
            if kind not in _RT_BLOCKS:
                raise ValueError(f"rich text block {kind!r} is not allowed")
            out = {"type": kind}
            a = attrs_of(node, _RT_BLOCKS[kind], kind)
            if kind == "heading" and "level" not in a:
                raise ValueError("headings need a level")
            if a:
                out["attrs"] = a
            children = node.get("content") or []
            if not isinstance(children, list):
                raise ValueError("rich text content must be a list")
            kids = [walk(child, depth + 1) for child in children]
            if kind in ("bulletList", "orderedList") and any(k["type"] != "listItem" for k in kids):
                raise ValueError("lists may only contain list items")
            if kind == "listItem" and any(k["type"] in _RT_INLINE for k in kids):
                raise ValueError("list items hold paragraphs, not bare text")
            if kind in ("paragraph", "heading") and any(k["type"] not in _RT_INLINE for k in kids):
                raise ValueError("paragraphs and headings hold text only")
            if kids:
                out["content"] = kids
            return out

        if not isinstance(doc, dict) or doc.get("type") != "doc":
            raise ValueError("rich text must be a document")
        blocks = doc.get("content") or []
        if not isinstance(blocks, list):
            raise ValueError("rich text content must be a list")
        top = [walk(block, 1) for block in blocks]
        if any(b["type"] in ("listItem", "text", "hardBreak") for b in top):
            raise ValueError("rich text top level holds paragraphs, headings and lists")
        return {"type": "doc", "content": top}

    @staticmethod
    def _rich_text_plain(doc: dict[str, Any]) -> str:
        """Plain text for AI, search and previews: one line per block, list markers kept."""
        lines: list[str] = []

        def inline(node: dict[str, Any]) -> str:
            return "".join(k.get("text", "") if k["type"] == "text" else "\n" for k in node.get("content", []))

        def block(node: dict[str, Any], prefix: str = "", indent: int = 0) -> None:
            kind = node["type"]
            if kind in ("paragraph", "heading"):
                lines.append("  " * indent + prefix + inline(node))
            elif kind in ("bulletList", "orderedList"):
                start = node.get("attrs", {}).get("start", 1)
                for i, item in enumerate(node.get("content", [])):
                    marker = "- " if kind == "bulletList" else f"{start + i}. "
                    for j, child in enumerate(item.get("content", [])):
                        if child["type"] in ("bulletList", "orderedList"):
                            block(child, "", indent + 1)  # nested list
                        else:
                            block(child, marker if j == 0 else "", indent)

        for node in doc.get("content", []):
            block(node)
        return "\n".join(lines)

    @staticmethod
    def _check_url(url: str) -> None:
        # Only web links: never javascript:, data:, file: or similar.
        if not _WEB_URL.match(url.strip()):
            raise ValueError("links must be http:// or https:// web addresses")

    def _check_references(self, cx: Any, project_id: str, objects: list[dict[str, Any]],
                          previous: dict[str, dict[str, Any]] | None = None) -> None:
        """Owners must be (current or former) project members; images must be
        this project's uploaded images."""
        members = {row["profile_slug"] for row in cx.execute(
            "SELECT profile_slug FROM project_members WHERE project_id=?", (project_id,))}
        previous = previous or {}
        for item in objects:
            content = item["content"]
            before = previous.get(item["id"]) or {}
            for field in _MEMBER_FIELDS:
                if field in content and content[field] != before.get(field) and content[field] not in members:
                    raise ValueError(f"{content[field]!r} is not a member of this project")
            if "content_id" in content and content["content_id"] != before.get("content_id"):
                row = cx.execute(
                    "SELECT media_type, removal_state FROM project_content WHERE project_id=? AND content_id=?",
                    (project_id, content["content_id"])).fetchone()
                if row is None or not str(row["media_type"]).startswith("image/") \
                        or row["removal_state"] == "file_removed":
                    raise ValueError("card image must reference an uploaded image in this project")

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
        now = iso(self.store._clock())
        with self.store.tx() as cx:
            row = cx.execute(
                "SELECT revision, status, objects_json FROM project_canvases WHERE project_id=? AND canvas_id=?",
                (project_id, canvas_id),
            ).fetchone()
            if row is None:
                raise ValueError(f"unknown canvas board: {canvas_id}")
            if row["status"] not in _EDITABLE:
                raise CanvasLockedError(f"board is {row['status']} and read-only; reopen it to edit")
            if int(row["revision"]) != int(expected_revision):
                raise CanvasConflictError(
                    f"canvas revision conflict: expected {expected_revision}, current {row['revision']}")
            try:
                stored = json.loads(row["objects_json"] or "[]")
            except (TypeError, json.JSONDecodeError):
                stored = []
            previous = {str(o.get("id")): o.get("content") or {} for o in stored if isinstance(o, dict)}
            normal_objects = self._normalise_objects(objects, previous)
            normal_connectors = self._normalise_connectors(connectors, {item["id"] for item in normal_objects})
            self._check_references(cx, project_id, normal_objects, previous)
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
