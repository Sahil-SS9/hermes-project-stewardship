"""Project memory (checks round 1; Sahil 08/10 pick 1b = A).

Dockyard keeps a short memory for each project - facts, decisions and rules - and
gives it to the bots working on that project (``bot_context.py``). It works with any
memory provider because it never touches one: a bot's own memory is unchanged.

Rules that shape everything here:
* A person writes the memory. Rules become instructions to bots, so only a project
  owner may write through the API (``api/memory_routes.py``); a payload can never
  name its own actor.
* Nothing is deleted. Remove = archive, and an archived entry can be restored as it
  was. An edit adds a new entry that replaces the old one; the old one stays as
  history. An entry has at most one successor (a unique index), so two edits of
  the same entry cannot both win.
* What a bot gets is short: rules, then decisions, then facts, newest first, at
  most ``CONTEXT_CAP`` characters, saying how many entries were left out.
* Finished work is offered as a starting point; nothing is added by itself.
* Every write is audited in the same transaction as the write.
"""
from __future__ import annotations

import re
import sqlite3
from typing import Any, Dict, Iterable, List, Optional

from .service import ServiceError
from .store import Store, iso

KINDS = ("rule", "decision", "fact")  # the order a bot reads them in
MAX_TEXT = 500
CONTEXT_CAP = 2000
SUGGESTION_LIMIT = 10
_MISSION_CAP = 200
_SOURCE = re.compile(r"^(human|work:[A-Za-z0-9_.:-]{1,64})$")
_HEADINGS = {"rule": "Rules", "decision": "Decisions", "fact": "Facts"}


class MemoryNotFound(ServiceError):
    """No such project, or no such entry in this project (HTTP 404)."""


class MemoryConflict(ServiceError):
    """The entry is in the wrong state for this change (HTTP 409)."""


class MemoryInvalid(ServiceError):
    """The input breaks a rule (HTTP 422)."""


_COLUMNS = ("id", "project_id", "kind", "text", "source", "supersedes_id", "created_by",
            "created_at", "archived_at", "archived_by")
# Current = not replaced by a later edit.
_CURRENT = ("SELECT k.* FROM project_knowledge k WHERE k.project_id=? AND NOT EXISTS"
            " (SELECT 1 FROM project_knowledge n WHERE n.supersedes_id=k.id)")


def _entry(row: sqlite3.Row) -> Dict[str, Any]:
    return {name: row[name] for name in _COLUMNS}


def current_entries(conn: sqlite3.Connection, project_id: str, *,
                    include_archived: bool = False) -> List[Dict[str, Any]]:
    sql = _CURRENT + ("" if include_archived else " AND k.archived_at IS NULL") + " ORDER BY k.id DESC"
    return [_entry(row) for row in conn.execute(sql, (project_id,))]


def context_for(conn: sqlite3.Connection, project_id: str) -> str:
    """What a bot working on ``project_id`` is given; ``""`` when there is nothing.

    Takes a plain connection (rows by name) so the bot-side hook can read a
    database it must never migrate.
    """
    project = conn.execute(
        "SELECT mission FROM project_stewardship WHERE project_id=?", (project_id,)
    ).fetchone()
    if project is None:
        return ""
    entries = current_entries(conn, project_id)
    if not entries:
        return ""
    mission = " ".join(str(project["mission"] or "").split())
    if len(mission) > _MISSION_CAP:
        mission = mission[: _MISSION_CAP - 3].rstrip() + "..."
    header = f"Dockyard project memory for project {project_id}"
    header += f" (mission: {mission})." if mission else "."
    header += " The project owner keeps this in Dockyard; follow its rules."
    lines = [header]
    used = len(header)
    shown = 0
    reserve = len("\n...and 999 more in Dockyard.")
    for kind in KINDS:
        heading_added = False
        for entry in (e for e in entries if e["kind"] == kind):
            line = f"\n- {entry['text']}"
            heading = "" if heading_added else f"\n{_HEADINGS[kind]}:"
            if used + len(heading) + len(line) + reserve > CONTEXT_CAP:
                continue  # a shorter entry later may still fit
            if heading:
                lines.append(heading)
                used += len(heading)
                heading_added = True
            lines.append(line)
            used += len(line)
            shown += 1
    left_out = len(entries) - shown
    if left_out:
        lines.append(f"\n...and {left_out} more in Dockyard.")
    return "".join(lines)


def _sort_key(item: Dict[str, Any]):
    value = item["completed_at"]
    numeric = isinstance(value, (int, float)) and not isinstance(value, bool)
    # Newest first; entries without a time last. Numbers and strings never mix
    # in one comparison because the flag differs first.
    return (value is None, not numeric, -value if numeric else "", "" if numeric else str(value))


class ProjectMemoryService:
    def __init__(self, store: Store, *, clock=None) -> None:
        self.store = store
        self._clock = clock or store._clock

    # ------------------------------------------------------------------ #
    # Checks                                                             #
    # ------------------------------------------------------------------ #

    def _known_project(self, project_id: str) -> None:
        row = self.store._conn.execute(
            "SELECT 1 FROM project_stewardship WHERE project_id=?", (project_id,)
        ).fetchone()
        if row is None:
            raise MemoryNotFound(f"no such project '{project_id}'")

    @staticmethod
    def _kind(kind: Any) -> str:
        if kind not in KINDS:
            raise MemoryInvalid("kind must be one of: fact, decision, rule")
        return str(kind)

    @staticmethod
    def _text(text: Any) -> str:
        clean = " ".join(str(text or "").split())
        if not clean:
            raise MemoryInvalid("text is required")
        if len(clean) > MAX_TEXT:
            raise MemoryInvalid(f"text is limited to {MAX_TEXT} characters")
        return clean

    @staticmethod
    def _source(source: Any) -> str:
        value = str(source or "")
        if not _SOURCE.match(value):
            raise MemoryInvalid("source must be 'human' or 'work:<task id>'")
        return value

    def _row(self, cx, project_id: str, entry_id: int) -> sqlite3.Row:
        row = cx.execute("SELECT * FROM project_knowledge WHERE id=?", (entry_id,)).fetchone()
        if row is None or row["project_id"] != project_id:
            raise MemoryNotFound(f"no memory entry {entry_id} in project '{project_id}'")
        return row

    @staticmethod
    def _replaced(cx, entry_id: int) -> bool:
        return cx.execute(
            "SELECT 1 FROM project_knowledge WHERE supersedes_id=?", (entry_id,)
        ).fetchone() is not None

    def _audit(self, cx, *, actor: str, interface: str, action: str, project_id: str,
               detail: Dict[str, Any]) -> None:
        cx.execute(
            "INSERT INTO stewardship_audit_log(ts, actor, interface, action,"
            " subject, detail_json) VALUES(?,?,?,?,?,?)",
            (iso(self._clock()), actor, interface, action, project_id, self.store._j(detail)),
        )

    def _get(self, entry_id: int) -> Dict[str, Any]:
        return _entry(self.store._conn.execute(
            "SELECT * FROM project_knowledge WHERE id=?", (entry_id,)).fetchone())

    # ------------------------------------------------------------------ #
    # Reads                                                              #
    # ------------------------------------------------------------------ #

    def entries(self, project_id: str, *, include_archived: bool = False) -> List[Dict[str, Any]]:
        self._known_project(project_id)
        return current_entries(self.store._conn, project_id, include_archived=include_archived)

    def bot_context(self, project_id: str) -> str:
        self._known_project(project_id)
        return context_for(self.store._conn, project_id)

    def history(self, project_id: str, entry_id: int) -> List[Dict[str, Any]]:
        """Every version of an entry, oldest first."""
        conn = self.store._conn
        row = self._row(conn, project_id, entry_id)
        while row["supersedes_id"] is not None:  # back to the first version
            row = conn.execute("SELECT * FROM project_knowledge WHERE id=?",
                               (row["supersedes_id"],)).fetchone()
        chain = [_entry(row)]
        while True:  # forward to the current one (one successor at most)
            nxt = conn.execute("SELECT * FROM project_knowledge WHERE supersedes_id=?",
                               (chain[-1]["id"],)).fetchone()
            if nxt is None:
                return chain
            chain.append(_entry(nxt))

    def suggestions(self, project_id: str, work_items: Iterable[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Finished work with a result, newest first, not already used as a source."""
        self._known_project(project_id)
        used = {
            row["source"][len("work:"):]
            for row in self.store._conn.execute(
                "SELECT source FROM project_knowledge WHERE project_id=? AND source LIKE 'work:%'",
                (project_id,))
        }
        out: List[Dict[str, Any]] = []
        for item in work_items:
            if str(item.get("status") or "") != "done":
                continue
            work_id = str(item.get("id") or item.get("ref") or "")
            text = " ".join(str(item.get("result") or "").split())
            if not work_id or not text or work_id in used:
                continue
            out.append({"work_id": work_id, "title": str(item.get("title") or ""),
                        "text": text[:MAX_TEXT], "completed_at": item.get("completed_at")})
        out.sort(key=_sort_key)
        return out[:SUGGESTION_LIMIT]

    # ------------------------------------------------------------------ #
    # Writes                                                             #
    # ------------------------------------------------------------------ #

    def add(self, project_id: str, *, kind: str, text: str, actor: str, interface: str,
            source: str = "human") -> Dict[str, Any]:
        self._known_project(project_id)
        kind, text, source = self._kind(kind), self._text(text), self._source(source)
        with self.store.tx() as cx:
            entry_id = cx.execute(
                "INSERT INTO project_knowledge(project_id, kind, text, source, created_by, created_at)"
                " VALUES(?,?,?,?,?,?)",
                (project_id, kind, text, source, actor, iso(self._clock())),
            ).lastrowid
            self._audit(cx, actor=actor, interface=interface, action="project.memory.added",
                        project_id=project_id, detail={"id": entry_id, "kind": kind, "source": source})
        return self._get(int(entry_id))

    def edit(self, project_id: str, entry_id: int, *, actor: str, interface: str,
             text: Optional[str] = None, kind: Optional[str] = None) -> Dict[str, Any]:
        if text is None and kind is None:
            raise MemoryInvalid("nothing to change: give new text or a new kind")
        with self.store.tx() as cx:
            row = self._row(cx, project_id, entry_id)
            if self._replaced(cx, entry_id):
                raise MemoryConflict("this entry was already replaced; edit the current one")
            if row["archived_at"] is not None:
                raise MemoryConflict("this entry is archived; restore it first")
            new_kind = row["kind"] if kind is None else self._kind(kind)
            new_text = row["text"] if text is None else self._text(text)
            if (new_kind, new_text) == (row["kind"], row["text"]):
                raise MemoryInvalid("nothing to change: the entry already says this")
            try:
                new_id = cx.execute(
                    "INSERT INTO project_knowledge(project_id, kind, text, source, supersedes_id,"
                    " created_by, created_at) VALUES(?,?,?,?,?,?,?)",
                    (project_id, new_kind, new_text, row["source"], entry_id, actor, iso(self._clock())),
                ).lastrowid
            except sqlite3.IntegrityError:  # another edit of the same entry won the race
                raise MemoryConflict("this entry was already replaced; edit the current one") from None
            self._audit(cx, actor=actor, interface=interface, action="project.memory.edited",
                        project_id=project_id, detail={"id": new_id, "replaces": entry_id, "kind": new_kind})
        return self._get(int(new_id))

    def archive(self, project_id: str, entry_id: int, *, actor: str, interface: str) -> Dict[str, Any]:
        with self.store.tx() as cx:
            row = self._row(cx, project_id, entry_id)
            if self._replaced(cx, entry_id):
                raise MemoryConflict("this entry was replaced; archive the current one")
            if row["archived_at"] is not None:
                raise MemoryConflict("this entry is already archived")
            cx.execute("UPDATE project_knowledge SET archived_at=?, archived_by=? WHERE id=?",
                       (iso(self._clock()), actor, entry_id))
            self._audit(cx, actor=actor, interface=interface, action="project.memory.archived",
                        project_id=project_id, detail={"id": entry_id})
        return self._get(entry_id)

    def restore(self, project_id: str, entry_id: int, *, actor: str, interface: str) -> Dict[str, Any]:
        with self.store.tx() as cx:
            row = self._row(cx, project_id, entry_id)
            if row["archived_at"] is None:
                raise MemoryConflict("this entry is not archived")
            cx.execute("UPDATE project_knowledge SET archived_at=NULL, archived_by=NULL WHERE id=?",
                       (entry_id,))
            self._audit(cx, actor=actor, interface=interface, action="project.memory.restored",
                        project_id=project_id, detail={"id": entry_id})
        return self._get(entry_id)
