"""Versioned, manually-started canonical Hermes workflow graphs.

Phase 5 (team-bound workflows) extends the Phase 2 execution foundation:

- reusable **templates** versus **project instances**: an instance is a copy
  of a template version; later template edits never touch existing
  instances (ownership boundary), and every run records where it came from;
- per-instance **team binding** with **per-phase (per-node) overrides**,
  validated against discovered host profiles and project/group membership;
- **effective-definition snapshots**: each run stores the resolved
  definition + assignments it materialised, so ordinary template/team edits
  cannot silently alter a running or historical instance;
- bounded **conditional branches** (`when`) and **loops** (`loop`) with
  explicit iteration identity, exit conditions and human escalation;
  malformed references and unsafe/unbounded cycles are rejected, and string
  booleans (for example ``"false"``) are rejected rather than coerced;
- **agent-proposed graph revisions**: within the approved policy they are
  applied immediately and recorded; outside it they wait for human
  approval while independent, already-authorised work continues; pending
  proposals are never applied by a restart, and decided/stale proposals can
  only be decided once;
- versioned plugin-native **JSON import/export** with validation preview,
  size limits and semantic round-trip fidelity.

Deliberate scope limits (approved policy limits, P5.12):
  ``IMPORT_MAX_BYTES``, ``MAX_LOOP_ITERATIONS``, ``MAX_PROPOSAL_NODES`` and
  ``MAX_REVISIONS_PER_RUN`` — the minimum plugin-specific bounds; no cost
  dashboard is built on top of them.
"""
from __future__ import annotations

import json
import os
import re
import uuid
from datetime import datetime, timedelta
from typing import Any, Mapping, Sequence

from .canonical_work_service import CanonicalWorkPort, dockyard_status
from .store import Store, iso

# ---- approved policy limits (P5.12) ---------------------------------------
IMPORT_MAX_BYTES = 262_144          # plugin-native JSON import limit (256 KiB)
MAX_LOOP_ITERATIONS = 10            # bounded repeat of a single node
MAX_PROPOSAL_NODES = 5              # agent-proposed nodes applied without human approval
MAX_REVISIONS_PER_RUN = 10          # total revisions (auto or approved) per run
BRANCH_STATUSES = frozenset({"done", "blocked"})
# Host words for a card nobody has picked up yet (Hermes "triage" is
# Project Stewardship's To do). Only such a card is handed to its bot.
_UNSTARTED = frozenset({"triage", "backlog"})
_REASON_LIMIT = 500
_TICK_LEASE_KEY = "workflows.tick_lease"
_TICK_STATUS_KEY = "workflows.tick"
TICK_LEASE_SECONDS = 120            # longer than one pass; a crashed pass frees it
TIMER_FRESH_SECONDS = 180           # the timer runs each minute; 3 missed = off
CANONICAL_STATUSES = frozenset({"backlog", "in_progress", "in_review", "blocked", "done"})
_PROFILE_RE = re.compile(r"^[a-z0-9][a-z0-9._-]{0,63}$")

WORKFLOW_SCHEMA = "stewardship.workflow/v2"

POLICY_DOC = {
    "import_max_bytes": IMPORT_MAX_BYTES,
    "max_loop_iterations": MAX_LOOP_ITERATIONS,
    "max_proposal_nodes": MAX_PROPOSAL_NODES,
    "max_revisions_per_run": MAX_REVISIONS_PER_RUN,
}


def _strict_bool(value: Any, field: str) -> bool:
    """JSON booleans only. A string ``"false"`` (or any string) is rejected."""
    if isinstance(value, bool):
        return value
    if value is None:
        return False
    raise ValueError(f"{field} must be a JSON boolean, got {type(value).__name__} {value!r}")


def _finite_number(value: Any) -> float | None:
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        return None
    number = float(value)
    if number != number or number in (float("inf"), float("-inf")):
        return None
    return number


def _clean_position(raw: Any) -> dict[str, float] | None:
    if raw is None:
        return None
    if not isinstance(raw, dict):
        raise ValueError("canvas_position must be an object with x/y")
    x = _finite_number(raw.get("x"))
    y = _finite_number(raw.get("y"))
    if x is None or y is None:
        raise ValueError("canvas_position x/y must be finite numbers")
    if abs(x) > 100000 or abs(y) > 100000:
        raise ValueError("canvas_position is out of the supported range")
    return {"x": x, "y": y}


def _in_order(nodes: Sequence[Mapping[str, Any]]) -> list[dict[str, Any]]:
    """The nodes with every node they depend on listed first (else as given)."""
    placed: set[str] = set()
    ordered: list[dict[str, Any]] = []
    pending = [dict(node) for node in nodes]
    while pending:
        ready = [node for node in pending if all(dep in placed for dep in node["depends_on"])]
        if not ready:
            raise ValueError("workflow graph must be acyclic")
        for node in ready:
            ordered.append(node)
            placed.add(node["id"])
        pending = [node for node in pending if node["id"] not in placed]
    return ordered


def _clean_profile(raw: Any, field: str) -> str | None:
    if raw is None:
        return None
    value = str(raw).strip()
    if not value:
        return None
    if not _PROFILE_RE.match(value):
        raise ValueError(f"{field} must be a host profile id (got {value!r})")
    return value


class WorkflowService:
    def __init__(self, store: Store, port: CanonicalWorkPort) -> None:
        self.store = store
        self.port = port
        # Timeline cursors are process-local only; the durable source remains
        # the canonical run projection plus domain_events. A cursor prevents a
        # poll from recording the same observed status twice.
        self._timeline_seen: dict[tuple[str, str, int, str], dict[str, str | None]] = {}

    def _timeline_key(self, project_id: str, name: str, version: int, run_key: str) -> tuple[str, str, int, str]:
        return (project_id, name, version, run_key)

    def _timeline_events(self, project_id: str, name: str, version: int, run_key: str,
                         result: Mapping[str, Any], snapshot: Mapping[str, Any],
                         work_index: Mapping[str, Mapping[str, Any]]) -> list[dict[str, Any]]:
        key = self._timeline_key(project_id, name, version, run_key)
        seen = self._timeline_seen.setdefault(key, {})
        now = iso(self.store._clock())
        events: list[dict[str, Any]] = []
        refs = result.get("tasks") or {}
        states = result.get("node_states") or {}
        # The initial observation is ordered by the stored graph, while later
        # observations append only changed nodes. The persisted domain-event
        # rows supply the global sequence in timeline().
        for node in snapshot.get("nodes", []):
            node_id = str(node["id"])
            ref = refs.get(node_id)
            item = work_index.get(ref) if ref else None
            status = dockyard_status(item.get("status")) if item else states.get(node_id)
            # The display status is the same canonical vocabulary returned by
            # runs(); no synthetic 'thinking' or tool-call events are created.
            status = status or states.get(node_id) or "waiting"
            previous = seen.get(node_id, None)
            if node_id not in seen or previous != status:
                event = {
                    "seq": len(events), "run_key": run_key, "node_id": node_id,
                    "task_ref": ref, "kind": (item or {}).get("kind") or ("gate" if node.get("human_gate") else "task"),
                    "title": node.get("title"), "from_status": previous,
                    "to_status": status, "ts": now,
                }
                events.append(event)
                seen[node_id] = status
        return events

    def timeline(self, project_id: str, name: str, run_key: str) -> dict[str, Any]:
        row = self._run_row(project_id, name, run_key)
        result = json.loads(row["result_json"]) or {}
        snapshot = json.loads(row["effective_json"]) if row["effective_json"] else {"nodes": []}
        work_index = {item["id"]: item for item in self.port.list_work(project_id)}
        # Timeline events are materialised in domain_events so they survive a
        # service restart and can be replayed by the canvas. The per-process
        # cursor only decides what to append on this observation.
        key = self._timeline_key(project_id, name, row["version"], run_key)
        existing = self.store._conn.execute(
            "SELECT id, ts, payload_json FROM domain_events WHERE event_type=? AND project_id=? AND subject=? ORDER BY id",
            ("workflow.node_state", project_id, f"{name}:v{row['version']}:{run_key}"),
        ).fetchall()
        if existing:
            seen = self._timeline_seen.setdefault(key, {})
            for item in existing:
                payload = json.loads(item["payload_json"])
                seen[payload["node_id"]] = dockyard_status(payload["to_status"])
        new_events = self._timeline_events(project_id, name, row["version"], run_key, result, snapshot, work_index)
        with self.store.tx() as cx:
            for event in new_events:
                event["seq"] = len(existing)
                cur = cx.execute(
                    "INSERT INTO domain_events(ts,event_type,project_id,subject,payload_json,emitted_by) VALUES(?,?,?,?,?,?)",
                    (event["ts"], "workflow.node_state", project_id, f"{name}:v{row['version']}:{run_key}", json.dumps(event, sort_keys=True), "workflow-service"),
                )
                event["id"] = int(cur.lastrowid or 0)
                existing.append({"id": event["id"], "ts": event["ts"], "payload_json": json.dumps(event)})
        events = [json.loads(item["payload_json"]) | {"id": int(item["id"])} for item in existing]
        for index, event in enumerate(events):
            event["seq"] = index
        return {"project_id": project_id, "name": name, "version": row["version"], "run_key": run_key, "events": events}

    # ---- validation ---------------------------------------------------

    @staticmethod
    def _clean_node(raw: Mapping[str, Any]) -> dict[str, Any]:
        if not isinstance(raw, Mapping):
            raise ValueError("workflow nodes must be objects")
        node_id = str(raw.get("id") or "").strip()
        title = str(raw.get("title") or "").strip()
        if not node_id or not title:
            raise ValueError("workflow node ids and titles must be unique")
        deps = [str(value).strip() for value in raw.get("depends_on") or []]
        if any(not dep for dep in deps):
            raise ValueError("workflow dependencies must be node ids")
        human_gate = _strict_bool(raw.get("human_gate", False), f"node {node_id} human_gate")
        kind = str(raw.get("kind") or ("gate" if human_gate else "task")).strip()
        if kind not in {"task", "gate"}:
            raise ValueError(f"node {node_id} kind must be task or gate")
        if kind == "gate":
            human_gate = True
        node: dict[str, Any] = {
            "id": node_id,
            "title": title,
            "depends_on": deps,
            "human_gate": human_gate,
            "kind": kind,
            "body": str(raw.get("body") or "") or None,
            "phase_team": _clean_profile(raw.get("phase_team"), f"node {node_id} phase_team"),
            "canvas_position": _clean_position(raw.get("canvas_position")),
            "when": None,
            "loop": None,
        }
        when = raw.get("when")
        if when is not None:
            if not isinstance(when, Mapping):
                raise ValueError(f"node {node_id} when must be an object")
            target = str(when.get("node") or "").strip()
            status = str(when.get("status") or "").strip()
            if not target:
                raise ValueError(f"node {node_id} when.node is required")
            if status not in BRANCH_STATUSES:
                raise ValueError(
                    f"node {node_id} when.status must be one of {sorted(BRANCH_STATUSES)}")
            node["when"] = {"node": target, "status": status}
        loop = raw.get("loop")
        if loop is not None:
            if not isinstance(loop, Mapping):
                raise ValueError(f"node {node_id} loop must be an object")
            raw_max = loop.get("max_iterations")
            if isinstance(raw_max, bool) or not isinstance(raw_max, int):
                raise ValueError(
                    f"node {node_id} loop.max_iterations must be an integer")
            if raw_max < 1 or raw_max > MAX_LOOP_ITERATIONS:
                raise ValueError(
                    f"node {node_id} loop.max_iterations must be 1..{MAX_LOOP_ITERATIONS}")
            until = loop.get("until")
            if not isinstance(until, Mapping):
                raise ValueError(f"node {node_id} loop.until is required")
            status = str(until.get("status") or "").strip()
            if status not in BRANCH_STATUSES:
                raise ValueError(
                    f"node {node_id} loop.until.status must be one of {sorted(BRANCH_STATUSES)}")
            node["loop"] = {"max_iterations": raw_max, "until": {"status": status}}
        if node["when"] and node["loop"]:
            raise ValueError(
                f"node {node_id} cannot be both conditional and looping")
        # "Ask me first": a person starts this step even when its turn has
        # come. Saved only when on, so existing workflows are unchanged.
        if _strict_bool(raw.get("ask_first", False), f"node {node_id} ask_first"):
            node["ask_first"] = True
        return node

    @classmethod
    def _validated(cls, definition: Mapping[str, Any]) -> dict[str, Any]:
        nodes = definition.get("nodes")
        if not isinstance(nodes, list) or not nodes:
            raise ValueError("workflow nodes are required")
        ids: set[str] = set()
        cleaned: list[dict[str, Any]] = []
        for raw in nodes:
            node = cls._clean_node(raw)
            if node["id"] in ids:
                raise ValueError("workflow node ids and titles must be unique")
            ids.add(node["id"])
            cleaned.append(node)
        graph = {node["id"]: list(node["depends_on"]) for node in cleaned}
        if any(dep not in ids for deps in graph.values() for dep in deps):
            raise ValueError("workflow dependencies must reference existing nodes")
        visiting: set[str] = set()
        visited: set[str] = set()

        def visit(node: str) -> None:
            if node in visiting:
                raise ValueError("workflow graph must be acyclic")
            if node in visited:
                return
            visiting.add(node)
            for dep in graph[node]:
                visit(dep)
            visiting.remove(node)
            visited.add(node)

        for node in graph:
            visit(node)

        def ancestors(node_id: str) -> set[str]:
            found: set[str] = set()
            stack = list(graph[node_id])
            while stack:
                current = stack.pop()
                if current in found:
                    continue
                found.add(current)
                stack.extend(graph[current])
            return found

        for node in cleaned:
            if node["when"]:
                target = node["when"]["node"]
                if target not in ids:
                    raise ValueError(
                        f"node {node['id']} when.node must reference an existing node")
                if target == node["id"]:
                    raise ValueError(
                        f"node {node['id']} cannot branch on itself")
                if target not in ancestors(node["id"]):
                    raise ValueError(
                        f"node {node['id']} when.node must be an upstream dependency")
            if node["loop"]:
                if not node["depends_on"]:
                    raise ValueError(
                        f"loop node {node['id']} needs at least one dependency "
                        "so its iterations have a native gate")
        result: dict[str, Any] = {"nodes": cleaned}
        template = definition.get("template")
        if template is not None:
            if not isinstance(template, Mapping):
                raise ValueError("template provenance must be an object")
            name = str(template.get("name") or "").strip()
            version = template.get("version")
            if not name or isinstance(version, bool) or not isinstance(version, int):
                raise ValueError("template provenance requires name and version")
            result["template"] = {"name": name, "version": version}
        return result

    # ---- templates ----------------------------------------------------

    def define_template(self, name: str, definition: Mapping[str, Any], *,
                        actor: str, interface: str = "rpc") -> dict[str, Any]:
        from .workflow_library import WorkflowLibrary
        result = WorkflowLibrary(self).define(name, "global", definition,
                                              actor=actor, interface=interface)
        return {"name": result["name"], "version": result["version"],
                "definition": result["definition"]}

    def list_templates(self) -> list[dict[str, Any]]:
        rows = self.store._conn.execute(
            "SELECT name,version,definition_json,created_at,created_by "
            "FROM dockyard_global_workflows ORDER BY name, version",
        ).fetchall()
        latest: dict[str, dict[str, Any]] = {}
        for row in rows:
            latest[row["name"]] = {
                "name": row["name"], "version": row["version"],
                "definition": json.loads(row["definition_json"]),
                "created_at": row["created_at"], "created_by": row["created_by"],
            }
        return list(latest.values())

    def get_template(self, name: str, version: int | None = None) -> dict[str, Any]:
        clean_name = str(name or "").strip()
        if version is None:
            row = self.store._conn.execute(
                "SELECT * FROM dockyard_global_workflows WHERE name=? "
                "ORDER BY version DESC LIMIT 1", (clean_name,)).fetchone()
        else:
            row = self.store._conn.execute(
                "SELECT * FROM dockyard_global_workflows WHERE name=? AND version=?",
                (clean_name, version)).fetchone()
        if row is None:
            raise ValueError("template was not found")
        return {"name": row["name"], "version": row["version"],
                "definition": json.loads(row["definition_json"]),
                "created_at": row["created_at"], "created_by": row["created_by"]}

    def instantiate(self, project_id: str, template_name: str, *,
                    workflow_name: str | None = None, version: int | None = None,
                    actor: str, interface: str = "rpc") -> dict[str, Any]:
        """Create a project instance as an independent copy of a template."""
        template = self.get_template(template_name, version)
        name = str(workflow_name or template["name"]).strip()
        definition = dict(template["definition"])
        definition["template"] = {"name": template["name"], "version": template["version"]}
        created = self.define(project_id, name, definition)
        self.store.audit(actor=actor, interface=interface,
                         action="workflow.instantiated",
                         subject=f"{project_id}:{name}",
                         detail={"template": template["name"],
                                 "template_version": template["version"]})
        return {**created, "template": {"name": template["name"],
                                        "version": template["version"]}}

    # ---- definition versions -----------------------------------------

    def define(self, project_id: str, name: str, definition: Mapping[str, Any], *,
               actor: str = "system", interface: str = "service") -> dict[str, Any]:
        clean_name = str(name or "").strip()
        if not clean_name:
            raise ValueError("workflow name is required")
        clean = self._validated(definition)
        with self.store.tx() as cx:
            lifecycle = cx.execute(
                "SELECT archived_at FROM dockyard_workflows WHERE project_id=? AND name=?"
                " ORDER BY version DESC LIMIT 1",
                (project_id, clean_name),
            ).fetchone()
            if lifecycle is not None and lifecycle["archived_at"] is not None:
                raise ValueError("workflow is archived; restore it before creating a new version")
            row = cx.execute(
                "SELECT COALESCE(MAX(version), 0) AS version FROM dockyard_workflows "
                "WHERE project_id=? AND name=?",
                (project_id, clean_name),
            ).fetchone()
            version = int(row["version"]) + 1
            cx.execute(
                "INSERT INTO dockyard_workflows("
                "project_id,name,version,definition_json,created_at) VALUES(?,?,?,?,?)",
                (project_id, clean_name, version, json.dumps(clean, sort_keys=True),
                 iso(self.store._clock())),
            )
        self.store.audit(actor=actor, interface=interface, action="workflow.defined",
                         subject=f"{project_id}:{clean_name}:v{version}")
        return {"project_id": project_id, "name": clean_name,
                "version": version, "definition": clean}

    def list(self, project_id: str, *, include_archived: bool = False) -> list[dict[str, Any]]:
        archive_clause = "" if include_archived else " AND archived_at IS NULL"
        rows = self.store._conn.execute(
            "SELECT project_id,name,version,definition_json,created_at,"
            " archived_at,archived_by FROM dockyard_workflows "
            f"WHERE project_id=?{archive_clause} AND NOT EXISTS ("
            "SELECT 1 FROM dockyard_global_instances gi WHERE "
            "gi.project_id=dockyard_workflows.project_id AND "
            "gi.internal_name=dockyard_workflows.name) ORDER BY name,version",
            (project_id,),
        ).fetchall()
        return [{"project_id": row["project_id"], "name": row["name"],
                 "version": row["version"],
                 "definition": json.loads(row["definition_json"]),
                 "created_at": row["created_at"],
                 "archived_at": row["archived_at"],
                 "archived_by": row["archived_by"]} for row in rows]

    def archive(
        self, project_id: str, name: str, *, actor: str, interface: str = "service"
    ) -> dict[str, Any]:
        rows = self.list(project_id, include_archived=True)
        selected = [row for row in rows if row["name"] == name]
        if not selected:
            raise ValueError("workflow was not found")
        stamp = iso(self.store._clock())
        with self.store.tx() as cx:
            cx.execute(
                "UPDATE dockyard_workflows SET archived_at=COALESCE(archived_at,?),"
                " archived_by=COALESCE(archived_by,?) WHERE project_id=? AND name=?",
                (stamp, actor, project_id, name),
            )
        self.store.audit(
            actor=actor, interface=interface, action="workflow.archived",
            subject=f"{project_id}:{name}",
        )
        return {"project_id": project_id, "name": name,
                "versions": [row for row in self.list(project_id, include_archived=True)
                             if row["name"] == name]}

    def restore(
        self, project_id: str, name: str, *, actor: str, interface: str = "service"
    ) -> dict[str, Any]:
        rows = self.list(project_id, include_archived=True)
        if not any(row["name"] == name for row in rows):
            raise ValueError("workflow was not found")
        with self.store.tx() as cx:
            cx.execute(
                "UPDATE dockyard_workflows SET archived_at=NULL, archived_by=NULL"
                " WHERE project_id=? AND name=?",
                (project_id, name),
            )
        self.store.audit(
            actor=actor, interface=interface, action="workflow.restored",
            subject=f"{project_id}:{name}",
        )
        return {"project_id": project_id, "name": name,
                "versions": [row for row in self.list(project_id, include_archived=True)
                             if row["name"] == name]}

    # ---- team binding (P5.2) ------------------------------------------

    def _group_profiles(self, group_id: int) -> set[str]:
        rows = self.store._conn.execute(
            "SELECT b.profile FROM dockyard_group_members m "
            "JOIN dockyard_bots b ON b.id = m.bot_id WHERE m.group_id=?",
            (group_id,),
        ).fetchall()
        return {str(row["profile"]) for row in rows if row["profile"]}

    def group_exists(self, group_id: int) -> bool:
        row = self.store._conn.execute(
            "SELECT 1 FROM dockyard_bot_groups WHERE id=?", (group_id,)).fetchone()
        return row is not None

    def _latest_definition(self, project_id: str, name: str) -> dict[str, Any]:
        row = self.store._conn.execute(
            "SELECT definition_json FROM dockyard_workflows "
            "WHERE project_id=? AND name=? ORDER BY version DESC LIMIT 1",
            (project_id, name)).fetchone()
        if row is None:
            raise ValueError("workflow was not found")
        return json.loads(row["definition_json"])

    def set_binding(self, project_id: str, name: str, *,
                    group_id: int | None, overrides: Mapping[str, str] | None,
                    actor: str, interface: str = "rpc",
                    known_profiles: Sequence[str] | None = None,
                    project_members: Sequence[str] | None = None) -> dict[str, Any]:
        definition = self._latest_definition(project_id, name)
        by_id = {node["id"]: node for node in definition["nodes"]}
        clean_overrides: dict[str, str] = {}
        if overrides:
            for node_id, profile in overrides.items():
                node_key = str(node_id).strip()
                if node_key not in by_id:
                    raise ValueError(f"override references unknown node {node_key!r}")
                profile_value = _clean_profile(profile, f"override {node_key}")
                if not profile_value:
                    continue
                clean_overrides[node_key] = profile_value
        membership: set[str] = set()
        if group_id is not None:
            if isinstance(group_id, bool) or not isinstance(group_id, int):
                raise ValueError("group_id must be an integer or null")
            if not self.group_exists(group_id):
                raise ValueError("bot group was not found")
            membership = self._group_profiles(group_id)
        if known_profiles is not None:
            discovered = set(known_profiles)
            allowed = membership | set(project_members or [])
            for node_id, profile in clean_overrides.items():
                if profile not in discovered:
                    raise ValueError(
                        f"override for {node_id} names undiscovered profile {profile!r}")
                if allowed and profile not in allowed:
                    raise ValueError(
                        f"override for {node_id} names {profile!r} which is not a member "
                        "of the bound team or the project")
        stamp = iso(self.store._clock())
        with self.store.tx() as cx:
            cx.execute(
                "INSERT INTO dockyard_workflow_bindings("
                "project_id,name,group_id,overrides_json,updated_at,updated_by) "
                "VALUES(?,?,?,?,?,?) ON CONFLICT(project_id,name) DO UPDATE SET "
                "group_id=excluded.group_id, overrides_json=excluded.overrides_json, "
                "updated_at=excluded.updated_at, updated_by=excluded.updated_by",
                (project_id, name, group_id, json.dumps(clean_overrides, sort_keys=True),
                 stamp, actor),
            )
        self.store.audit(actor=actor, interface=interface,
                         action="workflow.binding_updated",
                         subject=f"{project_id}:{name}",
                         detail={"group_id": group_id, "overrides": clean_overrides})
        return self.get_binding(project_id, name)

    def get_binding(self, project_id: str, name: str) -> dict[str, Any]:
        self._latest_definition(project_id, name)
        row = self.store._conn.execute(
            "SELECT group_id, overrides_json, updated_at, updated_by "
            "FROM dockyard_workflow_bindings WHERE project_id=? AND name=?",
            (project_id, name)).fetchone()
        if row is None:
            return {"project_id": project_id, "name": name, "group_id": None,
                    "overrides": {}, "updated_at": None, "updated_by": None}
        return {"project_id": project_id, "name": name,
                "group_id": row["group_id"],
                "overrides": json.loads(row["overrides_json"]),
                "updated_at": row["updated_at"], "updated_by": row["updated_by"]}

    def effective_assignments(self, project_id: str, name: str) -> dict[str, dict[str, Any]]:
        """Resolve per-node assignee + team for the latest version.

        Precedence: explicit binding override → node ``phase_team`` → unassigned.
        """
        definition = self._latest_definition(project_id, name)
        binding = self.get_binding(project_id, name)
        group = binding.get("group_id")
        team_label = None
        if group is not None:
            row = self.store._conn.execute(
                "SELECT name FROM dockyard_bot_groups WHERE id=?", (group,)).fetchone()
            team_label = row["name"] if row else None
        resolved: dict[str, dict[str, Any]] = {}
        for node in definition["nodes"]:
            override = binding["overrides"].get(node["id"])
            assignee = override or node.get("phase_team")
            resolved[node["id"]] = {
                "assignee": assignee,
                "team": team_label,
                "source": "override" if override else ("node" if node.get("phase_team") else None),
            }
        return resolved

    # ---- runs (P5.3/P5.5) ---------------------------------------------

    def _run_row(self, project_id: str, name: str, run_key: str):
        row = self.store._conn.execute(
            "SELECT * FROM dockyard_workflow_runs WHERE project_id=? AND name=? AND run_key=?"
            " ORDER BY version DESC LIMIT 1",
            (project_id, name, run_key)).fetchone()
        if row is None:
            raise ValueError("workflow run was not found")
        return row

    def runs(self, project_id: str, name: str) -> list[dict[str, Any]]:
        """Read-only run ledger with per-node canonical status for the canvas."""
        known = self.store._conn.execute(
            "SELECT 1 FROM dockyard_workflows WHERE project_id=? AND name=?",
            (project_id, name),
        ).fetchone()
        if known is None:
            raise ValueError("workflow was not found")
        rows = self.store._conn.execute(
            "SELECT version, run_key, status, started_at, updated_at, "
            "result_json, effective_json, template_origin "
            "FROM dockyard_workflow_runs WHERE project_id=? AND name=? "
            "ORDER BY version DESC, started_at DESC, run_key DESC",
            (project_id, name),
        ).fetchall()
        work_index = {item["id"]: item for item in self.port.list_work(project_id)}
        runs: list[dict[str, Any]] = []
        for row in rows:
            result = json.loads(row["result_json"]) or {}
            snapshot = json.loads(row["effective_json"]) if row["effective_json"] else None
            source_def = snapshot or {"nodes": []}
            refs: dict[str, str] = result.get("tasks") or {}
            iterations: dict[str, int] = result.get("iterations") or {}
            states: dict[str, str] = result.get("node_states") or {}
            nodes = []
            for node in source_def.get("nodes", []):
                ref = refs.get(node["id"])
                item = work_index.get(ref) if ref else None
                nodes.append({
                    "node_id": node["id"],
                    "title": node["title"],
                    "depends_on": node["depends_on"],
                    "human_gate": bool(node["human_gate"]),
                    "task_ref": ref,
                    "kind": (item["kind"] if item else
                             ("gate" if node["human_gate"] else "task")),
                    "status": dockyard_status(item["status"]) if item else None,
                    "assignee": (item.get("assignee") if item
                                 else node.get("assignee")),
                    "phase_team": node.get("phase_team"),
                    "team": node.get("team"),
                    "evidence_refs": (item.get("evidence_refs") or []) if item else [],
                    "when": node.get("when"),
                    "loop": node.get("loop"),
                    "iteration": iterations.get(node["id"]),
                    "state": states.get(node["id"]),
                    "ask_first": bool(node.get("ask_first")),
                    "canvas_position": node.get("canvas_position"),
                })
            runs.append({
                "run_key": row["run_key"],
                "version": row["version"],
                "status": row["status"],
                "started_at": row["started_at"],
                "updated_at": row["updated_at"],
                "template_origin": (json.loads(row["template_origin"])
                                    if row["template_origin"] else None),
                "nodes": nodes,
            })
        return runs

    def _load_bounds(self, project_id: str, name: str) -> dict[str, Any]:
        return {
            "assignments": self.effective_assignments(project_id, name),
            "binding": self.get_binding(project_id, name),
        }

    def start(self, project_id: str, name: str, run_key: str,
              version: int | None = None, *,
              known_profiles: Sequence[str] | None = None,
              project_members: Sequence[str] | None = None) -> dict[str, Any]:
        key = str(run_key or "").strip()
        if not key:
            raise ValueError("run_key is required")
        if version is None:
            row = self.store._conn.execute(
                "SELECT * FROM dockyard_workflows WHERE project_id=? AND name=? "
                "ORDER BY version DESC LIMIT 1", (project_id, name)).fetchone()
        else:
            row = self.store._conn.execute(
                "SELECT * FROM dockyard_workflows WHERE project_id=? AND name=? AND version=?",
                (project_id, name, version)).fetchone()
        if row is None:
            raise ValueError("workflow was not found")
        if row["archived_at"] is not None:
            raise ValueError("workflow is archived; restore it before starting a run")
        if self._switched_off(project_id, name):
            raise ValueError("workflow is disabled for this project")
        existing = self.store._conn.execute(
            "SELECT result_json,status FROM dockyard_workflow_runs WHERE project_id=? AND name=? "
            "AND version=? AND run_key=?",
            (project_id, name, row["version"], key),
        ).fetchone()
        if existing is not None and existing["result_json"] not in (None, "{}"):
            return {**json.loads(existing["result_json"]), "replayed": True}
        definition = json.loads(row["definition_json"])

        # P5.2: validate effective assignments at start against discovered
        # profiles and project/group membership (fail before any write).
        resolved = self.effective_assignments(project_id, name)
        if known_profiles is not None:
            discovered = set(known_profiles)
            allowed = set(project_members or [])
            group_id = self.get_binding(project_id, name).get("group_id")
            if group_id is not None:
                allowed |= self._group_profiles(group_id)
            problems: list[str] = []
            for node_id, info in resolved.items():
                assignee = info["assignee"]
                if not assignee:
                    continue
                if assignee not in discovered:
                    problems.append(f"{node_id}:{assignee} (undiscovered profile)")
                elif not allowed or assignee not in allowed:
                    problems.append(f"{node_id}:{assignee} (not a project or team member)")
            if problems:
                raise ValueError(
                    "workflow assignments failed validation: " + ", ".join(problems))

        effective = {
            "schema": WORKFLOW_SCHEMA,
            "nodes": [{**node,
                       "assignee": resolved[node["id"]]["assignee"],
                       "team": resolved[node["id"]]["team"]}
                      for node in definition["nodes"]],
        }
        template_origin = definition.get("template")
        now = iso(self.store._clock())
        with self.store.tx() as cx:
            cx.execute(
                "INSERT OR IGNORE INTO dockyard_workflow_runs "
                "(project_id,name,version,run_key,result_json,started_at,status,updated_at) "
                "VALUES(?,?,?,?,?,?,?,?)",
                (project_id, name, row["version"], key, "{}", now, "pending", now),
            )
            cx.execute(
                "UPDATE dockyard_workflow_runs SET status='pending', updated_at=?, "
                "effective_json=?, template_origin=? "
                "WHERE project_id=? AND name=? AND version=? AND run_key=? "
                "AND status!='complete'",
                (now, json.dumps(effective, sort_keys=True),
                 json.dumps(template_origin) if template_origin else None,
                 project_id, name, row["version"], key),
            )
        tasks: dict[str, str] = {}
        states: dict[str, str] = {}
        iterations: dict[str, int] = {}
        # A step's card is made now when the step has no branch and every
        # step before it is made now too. The rest wait until what they
        # follow has been decided, so nothing after a branch can start
        # before the branch does.
        for node in _in_order(effective["nodes"]):
            node_id = node["id"]
            if node.get("when") or any(dep not in tasks for dep in node["depends_on"]):
                states[node_id] = "waiting"
                continue
            created = self._materialise_node(
                project_id, name, row["version"], key, node,
                iteration=1 if node.get("loop") else None)
            tasks[node_id] = created["id"]
            for dependency in node["depends_on"]:
                self.port.link_work(project_id, tasks[dependency], created["id"])
            if node.get("loop"):
                iterations[node_id] = 1
        result = {
            "project_id": project_id,
            "name": name,
            "version": row["version"],
            "run_key": key,
            "replayed": False,
            "tasks": tasks,
            "node_states": states,
            "iterations": iterations,
            # The timer moves on only runs started from this change on; runs
            # started before it move on when a person says so (Move on now).
            "auto": True,
        }
        self._finish_run(project_id, name, row["version"], key, result, status="pending")
        self.store.audit(actor="system", interface="service", action="workflow.started",
                         subject=f"{project_id}:{name}:{key}")
        # Steps with nothing before them go to their bots straight away.
        return self._move_on(project_id, name, row["version"], key)

    def _materialise_node(self, project_id: str, name: str, version: int, run_key: str,
                          node: Mapping[str, Any], *, iteration: int | None,
                          note: str | None = None) -> dict[str, Any]:
        suffix = f":iter{iteration}" if iteration else ""
        rounds = (node.get("loop") or {}).get("max_iterations")
        title = (node["title"] if iteration in (None, 1)
                 else f"{node['title']} (round {iteration} of {rounds})")
        body = node.get("body")
        if note:
            body = f"{body}\n\n{note}" if body else note
        return self.port.create_work(
            project_id,
            kind="gate" if node["human_gate"] else "task",
            title=title,
            body=body,
            assignee=node.get("assignee"),
            created_by="dockyard-workflow",
            idempotency_key=(
                f"dockyard-workflow:{project_id}:{name}:v{version}:{run_key}:"
                f"{node['id']}{suffix}"
            ),
        )

    def _finish_run(self, project_id: str, name: str, version: int, key: str,
                    result: dict[str, Any], *, status: str = "complete") -> dict[str, Any]:
        with self.store.tx() as cx:
            cx.execute(
                "UPDATE dockyard_workflow_runs SET result_json=?, status=?, "
                "updated_at=? WHERE project_id=? AND name=? AND version=? AND run_key=?",
                (json.dumps(result, sort_keys=True), status, iso(self.store._clock()),
                 project_id, name, version, key),
            )
        return result

    def _snapshot(self, project_id: str, name: str, run_key: str) -> dict[str, Any]:
        row = self._run_row(project_id, name, run_key)
        snapshot = json.loads(row["effective_json"]) if row["effective_json"] else {"nodes": []}
        return snapshot

    def _switched_off(self, project_id: str, name: str) -> bool:
        """The project has switched this workflow (or the global it copies) off."""
        shadow = self.store._conn.execute(
            "SELECT workflow_name FROM dockyard_global_instances "
            "WHERE project_id=? AND internal_name=?",
            (project_id, name),
        ).fetchone()
        choices = [("project", name)]
        if shadow is not None:
            choices.append(("global", shadow["workflow_name"]))
        for scope, workflow_name in choices:
            choice = self.store._conn.execute(
                "SELECT enabled FROM dockyard_workflow_enablement WHERE "
                "project_id=? AND scope=? AND workflow_name=?",
                (project_id, scope, workflow_name),
            ).fetchone()
            if choice is not None and not choice["enabled"]:
                return True
        return False

    def _move_refusal(self, project_id: str, name: str) -> str | None:
        """Why this workflow's runs may not move on at all, or None."""
        latest = self.store._conn.execute(
            "SELECT archived_at FROM dockyard_workflows WHERE project_id=? AND name=?"
            " ORDER BY version DESC LIMIT 1",
            (project_id, name),
        ).fetchone()
        if latest is None:
            return "workflow was not found"
        if latest["archived_at"] is not None:
            return "workflow is archived; restore it before moving its runs on"
        if self._switched_off(project_id, name):
            return "workflow is disabled for this project"
        return None

    def advance(self, project_id: str, name: str, run_key: str, *,
                statuses: Mapping[str, str] | None = None) -> dict[str, Any]:
        """Move one run on now (a person's Move on now; the timer uses tick()).

        Works on a paused project and on runs started before runs moved on
        by themselves; refuses only for an archived or switched-off workflow.
        """
        row = self._run_row(project_id, name, run_key)
        refusal = self._move_refusal(project_id, name)
        if refusal:
            raise ValueError(refusal)
        return self._move_on(project_id, name, row["version"], run_key, statuses=statuses)

    def _why_stuck(self, project_id: str, ref: str) -> str | None:
        reader: Any = getattr(self.port, "work_block_reason", None)
        if not callable(reader):
            return None
        try:
            reason = reader(project_id, ref)
        except Exception:
            return None  # advisory text for the next round, never a reason to stop
        text = str(reason or "").strip()
        return text[:_REASON_LIMIT] or None

    def _move_on(self, project_id: str, name: str, version: int, run_key: str, *,
                 statuses: Mapping[str, str] | None = None) -> dict[str, Any]:
        """Decide branches, repeat stuck rounds and hand steps to their bots.

        The host's links decide *when* a card may start; this decides which
        cards exist, keeps those links truthful as rounds and branches
        appear, and hands each bot step over once, when its turn has come.
        Safe to repeat: cards are made idempotently by key, links are set
        before old ones are removed, and a card is handed over at most once.
        """
        row = self.store._conn.execute(
            "SELECT * FROM dockyard_workflow_runs WHERE project_id=? AND name=? "
            "AND version=? AND run_key=?",
            (project_id, name, version, run_key),
        ).fetchone()
        if row is None:
            raise ValueError("workflow run was not found")
        result = json.loads(row["result_json"]) or {}
        snapshot = json.loads(row["effective_json"]) if row["effective_json"] else {"nodes": []}
        nodes = _in_order(snapshot.get("nodes", []))
        by_id = {node["id"]: node for node in nodes}
        tasks: dict[str, str] = dict(result.get("tasks") or {})
        states: dict[str, str] = dict(result.get("node_states") or {})
        iterations: dict[str, int] = {
            node_id: int(count) for node_id, count in (result.get("iterations") or {}).items()}
        escalations: list[dict[str, Any]] = list(result.get("escalations") or [])
        handed: dict[str, str] = dict(result.get("handed") or {})
        changes: list[str] = []
        records: dict[str, dict[str, Any]] = {}
        listing: dict[str, Mapping[str, Any]] | None = None

        def kind_of(node: Mapping[str, Any]) -> str:
            return "gate" if node["human_gate"] else "task"

        def record(node_id: str) -> dict[str, Any]:
            """The step's current card as the host reports it ({} if unreadable)."""
            nonlocal listing
            ref = tasks.get(node_id)
            if ref is None:
                return {}
            if ref not in records:
                try:
                    records[ref] = dict(self.port.get_work(project_id, kind_of(by_id[node_id]), ref))
                except Exception:
                    # The live read failed: fall back to the board listing,
                    # then to what the caller saw.
                    if listing is None:
                        try:
                            listing = {item["id"]: item for item in self.port.list_work(project_id)}
                        except Exception:
                            listing = {}
                    if ref in listing:
                        records[ref] = dict(listing[ref])
                    elif statuses and ref in statuses:
                        records[ref] = {"status": statuses[ref]}
                    else:
                        records[ref] = {}
            return records[ref]

        def word(node_id: str) -> str | None:
            return dockyard_status(record(node_id).get("status"))

        def outcome(node_id: str) -> str | None:
            """How a step ended, as far as a branch on it is concerned."""
            if states.get(node_id) == "skipped":
                return "skipped"
            if node_id not in tasks:
                return None
            now = word(node_id)
            if now == "done":
                return "done"
            if by_id[node_id].get("loop"):
                # A stuck round is not the loop's outcome while rounds are
                # left; it is once the loop has given up.
                return "blocked" if states.get(node_id) == "escalated" else None
            return "blocked" if now == "blocked" else None

        def gating(node: Mapping[str, Any]) -> list[str]:
            """The steps whose cards are linked before this step's card."""
            when = node.get("when")
            return [dep for dep in node["depends_on"]
                    if states.get(dep) != "skipped"
                    and not (when and when["status"] == "blocked" and dep == when["node"])]

        def make(node: Mapping[str, Any], *, iteration: int | None,
                 note: str | None = None) -> str:
            created = self._materialise_node(
                project_id, name, version, run_key, node, iteration=iteration, note=note)
            ref = str(created["id"])
            for dep in gating(node):
                parent = tasks.get(dep)
                if parent:
                    self.port.link_work(project_id, parent, ref)
            tasks[node["id"]] = ref
            return ref

        # 1. Decide, in graph order, so a step sees what came before it.
        for node in nodes:
            node_id, title = node["id"], node["title"]
            loop = node.get("loop")
            if node_id in tasks:
                if not loop or states.get(node_id) == "done":
                    continue
                now = word(node_id)
                rounds = int(loop["max_iterations"])
                k = iterations.get(node_id, 1)
                if now == "done" or now == loop["until"]["status"]:
                    if states.get(node_id) == "escalated":
                        changes.append(f"{title}: finished after a person stepped in")
                    elif k > 1:
                        changes.append(f"{title}: finished in round {k} of {rounds}")
                    states[node_id] = "done"
                elif now == "blocked" and states.get(node_id) != "escalated":
                    if k < rounds:
                        old = tasks[node_id]
                        reason = self._why_stuck(project_id, old)
                        note = (f"Round {k + 1} of {rounds}. The last round got stuck: {reason}"
                                if reason else
                                f"Round {k + 1} of {rounds}. The last round got stuck.")
                        new = make(node, iteration=k + 1, note=note)
                        iterations[node_id] = k + 1
                        states[node_id] = "repeating"
                        changes.append(f"{title}: round {k} got stuck, so round {k + 1} of {rounds} started")
                        # Steps after the loop follow its latest round. The
                        # new link goes in first, so they are never left
                        # free to start between the two writes.
                        for child in nodes:
                            child_ref = tasks.get(child["id"])
                            if child_ref and node_id in gating(child):
                                self.port.link_work(project_id, new, child_ref)
                                self.port.unlink_work(project_id, old, child_ref)
                    else:
                        states[node_id] = "escalated"
                        escalations.append({
                            "node_id": node_id,
                            "reason": "loop limit reached",
                            "iterations": k,
                            "max_iterations": rounds,
                        })
                        changes.append(f"{title}: still stuck after {k} rounds, so it needs a person")
                continue
            if states.get(node_id) != "waiting":
                continue
            deps = node["depends_on"]
            if any(dep not in tasks and states.get(dep) != "skipped" for dep in deps):
                continue  # something before it has not been decided yet
            when = node.get("when")
            if when:
                seen = outcome(when["node"])
                if seen is None or (seen == "blocked" and when["status"] == "done"):
                    continue  # not decided yet; a stuck step may still finish
                if seen != when["status"]:
                    states[node_id] = "skipped"
                    after = by_id[when["node"]]["title"]
                    changes.append(f"{title}: not needed ({after} "
                                   f"{'finished' if seen == 'done' else 'was skipped'})")
                    continue
            elif deps and all(states.get(dep) == "skipped" for dep in deps):
                states[node_id] = "skipped"
                changes.append(f"{title}: not needed (every step before it was skipped)")
                continue
            make(node, iteration=1 if loop else None)
            if loop:
                iterations[node_id] = 1
            if when:
                states[node_id] = "taken"
                after = by_id[when["node"]]["title"]
                changes.append(f"{title}: needed, because {after} "
                               f"{'finished' if when['status'] == 'done' else 'is stuck'}")
            else:
                states.pop(node_id, None)

        # 2. Hand each bot step over once, when its turn has come. Sign-offs,
        #    "Ask me first" steps and steps with no bot wait for a person; a
        #    card someone else has already moved is left where it is. A step
        #    the host refuses does not stop the others: the pass is saved
        #    first, then the refusal is reported.
        refused: Exception | None = None
        for node in nodes:
            node_id = node["id"]
            ref = tasks.get(node_id)
            if ref is None or handed.get(node_id) == ref:
                continue
            if node["human_gate"] or node.get("ask_first") or not node.get("assignee"):
                continue
            raw = str(record(node_id).get("status") or "")
            if not raw:
                continue  # unreadable now; look again next time
            if raw not in _UNSTARTED:
                handed[node_id] = ref
                continue
            if not all(tasks.get(dep) and word(dep) == "done" for dep in gating(node)):
                continue
            try:
                self.port.transition_work(project_id, kind_of(node), ref, "in_progress")
            except Exception as exc:
                records.pop(ref, None)
                if str(record(node_id).get("status") or "") in _UNSTARTED:
                    refused = refused or exc
                    continue
                # Someone else moved it first: it has been handed over.
            records.pop(ref, None)
            handed[node_id] = ref
            changes.append(f"{node['title']}: handed to {node['assignee']}")

        # 3. Record what has finished, then the run's own status.
        for node in nodes:
            node_id = node["id"]
            if (node_id in tasks and not node.get("loop")
                    and states.get(node_id) not in ("skipped", "done")
                    and word(node_id) == "done"):
                states[node_id] = "done"

        def resolved(node: Mapping[str, Any]) -> bool:
            node_id = node["id"]
            if states.get(node_id) == "skipped":
                return True
            if node.get("loop"):
                return states.get(node_id) == "done"
            return node_id in tasks and word(node_id) == "done"

        if all(resolved(node) for node in nodes):
            status = "complete"
        elif any(state == "escalated" for state in states.values()):
            status = "escalated"
        else:
            status = "pending"
        if status == "complete" and row["status"] != "complete":
            changes.append("the run has finished")
        updated = {**result, "tasks": tasks, "node_states": states,
                   "iterations": iterations, "escalations": escalations, "handed": handed}
        if updated != result or status != row["status"]:
            self._finish_run(project_id, name, version, run_key, updated, status=status)
        if refused is not None:
            raise refused
        return {**updated, "status": status, "changes": changes}

    # ---- the timer (runs move on by themselves) ----------------------

    def tick(self, *, interface: str = "timer") -> dict[str, Any]:
        """Move every running run on once. The timer calls this each minute.

        Skips (and says why) runs of a paused, frozen or archived project, of
        a project with workflows switched off, of an archived or switched-off
        workflow, and runs started before runs moved on by themselves. One
        pass at a time: a second caller while a pass is running gets busy.
        """
        holder = f"{interface}:{os.getpid()}:{uuid.uuid4().hex[:8]}"
        if not self._take_tick_lease(holder):
            return {"busy": True, "runs": [], "skipped": [], "failed": [], "new_failures": []}
        try:
            summary: dict[str, Any] = {"busy": False, "runs": [], "skipped": [], "failed": []}
            rows = self.store._conn.execute(
                "SELECT project_id, name, version, run_key, result_json "
                "FROM dockyard_workflow_runs WHERE status IN ('pending','escalated') "
                "ORDER BY project_id, name, started_at, run_key").fetchall()
            project_refusals: dict[str, str | None] = {}
            for row in rows:
                ident = {"project_id": row["project_id"], "name": row["name"],
                         "run_key": row["run_key"]}
                project_id = row["project_id"]
                if project_id not in project_refusals:
                    project_refusals[project_id] = self._timer_refusal(project_id)
                reason = project_refusals[project_id] or self._move_refusal(project_id, row["name"])
                if reason is None and not (json.loads(row["result_json"] or "{}") or {}).get("auto"):
                    reason = "started before runs moved on by themselves; use Move on now"
                if reason:
                    summary["skipped"].append({**ident, "reason": reason})
                    continue
                try:
                    moved = self._move_on(project_id, row["name"], row["version"], row["run_key"])
                except Exception as exc:  # one broken run must not stop the others
                    summary["failed"].append({**ident, "error": str(exc)[:_REASON_LIMIT]})
                    continue
                summary["runs"].append({**ident, "status": moved["status"],
                                        "changes": moved["changes"]})
            summary["at"] = iso(self.store._clock())
            summary["new_failures"] = self._record_tick(summary, interface=interface)
            return summary
        finally:
            self._drop_tick_lease(holder)

    def tick_status(self) -> dict[str, Any]:
        """When the timer last moved runs on, what went wrong, and whether it
        is on (``moving``: a pass within the last few minutes)."""
        row = self.store._conn.execute(
            "SELECT value_json FROM dockyard_app_settings WHERE key=?",
            (_TICK_STATUS_KEY,)).fetchone()
        status = (json.loads(row["value_json"]) if row is not None
                  else {"at": None, "by": None, "moved": 0, "failed": []})
        try:
            age = (self.store._clock() - datetime.fromisoformat(status["at"])).total_seconds()
        except (KeyError, TypeError, ValueError):
            age = None
        status["moving"] = age is not None and age <= TIMER_FRESH_SECONDS
        return status

    def _timer_refusal(self, project_id: str) -> str | None:
        """Why the timer leaves this project's runs alone, or None."""
        row = self.store._conn.execute(
            "SELECT enabled, phase, archived_at, features_json FROM project_stewardship"
            " WHERE project_id=?",
            (project_id,)).fetchone()
        if row is None or not row["enabled"]:
            return "stewardship is off for this project"
        if row["archived_at"] is not None:
            return "project is archived"
        if row["phase"] == "paused":
            return "project is paused"
        if row["phase"] == "frozen":
            return "project is frozen"
        from .service import StewardshipService

        if not StewardshipService.features_from_json(row["features_json"]).get("workflow_canvas", True):
            return "workflows are switched off for this project"
        return None

    def _take_tick_lease(self, holder: str) -> bool:
        now = self.store._clock()
        with self.store.tx() as cx:
            row = cx.execute("SELECT value_json FROM dockyard_app_settings WHERE key=?",
                             (_TICK_LEASE_KEY,)).fetchone()
            if row is not None:
                try:
                    lease = json.loads(row["value_json"])
                    held = (lease.get("holder") != holder
                            and datetime.fromisoformat(lease["until"]) > now)
                except (ValueError, KeyError, TypeError, AttributeError):
                    held = False  # an unreadable lease is no lease
                if held:
                    return False
            cx.execute(
                "INSERT INTO dockyard_app_settings(key,value_json,updated_at,updated_by) "
                "VALUES(?,?,?,?) ON CONFLICT(key) DO UPDATE SET value_json=excluded.value_json,"
                " updated_at=excluded.updated_at, updated_by=excluded.updated_by",
                (_TICK_LEASE_KEY,
                 json.dumps({"holder": holder,
                             "until": iso(now + timedelta(seconds=TICK_LEASE_SECONDS))}),
                 iso(now), holder))
        return True

    def _drop_tick_lease(self, holder: str) -> None:
        with self.store.tx() as cx:
            row = cx.execute("SELECT value_json FROM dockyard_app_settings WHERE key=?",
                             (_TICK_LEASE_KEY,)).fetchone()
            try:
                mine = row is not None and json.loads(row["value_json"]).get("holder") == holder
            except (ValueError, AttributeError):
                mine = False
            if mine:
                cx.execute("DELETE FROM dockyard_app_settings WHERE key=?", (_TICK_LEASE_KEY,))

    def _record_tick(self, summary: Mapping[str, Any], *, interface: str) -> list[dict[str, Any]]:
        """Save the heartbeat; return the failures that are new since last time."""
        failed = [{"run": f"{f['project_id']}/{f['name']}/{f['run_key']}", "error": f["error"]}
                  for f in summary["failed"]]
        previous = self.tick_status()
        before = {(f.get("run"), f.get("error")) for f in previous.get("failed") or []}
        status = {
            "at": summary["at"],
            "by": interface,
            "moved": sum(len(run["changes"]) for run in summary["runs"]),
            "runs": len(summary["runs"]),
            "skipped": len(summary["skipped"]),
            "failed": failed,
        }
        with self.store.tx() as cx:
            cx.execute(
                "INSERT INTO dockyard_app_settings(key,value_json,updated_at,updated_by) "
                "VALUES(?,?,?,?) ON CONFLICT(key) DO UPDATE SET value_json=excluded.value_json,"
                " updated_at=excluded.updated_at, updated_by=excluded.updated_by",
                (_TICK_STATUS_KEY, json.dumps(status, sort_keys=True), summary["at"], interface))
        return [f for f in summary["failed"]
                if (f"{f['project_id']}/{f['name']}/{f['run_key']}", f["error"]) not in before]

    # ---- agent-proposed revisions (P5.3/P5.11) ------------------------

    def proposals_policy(self) -> dict[str, Any]:
        return dict(POLICY_DOC)

    def _within_policy(self, proposal: Mapping[str, Any]) -> str | None:
        """Return None when within policy, else the reason it needs approval."""
        add_nodes = proposal.get("add_nodes") or []
        if not isinstance(add_nodes, list) or not add_nodes:
            return "proposal must add at least one node"
        if len(add_nodes) > MAX_PROPOSAL_NODES:
            return f"proposal adds {len(add_nodes)} nodes (limit {MAX_PROPOSAL_NODES})"
        if not str(proposal.get("rationale") or "").strip():
            return "proposal requires a rationale"
        edges = proposal.get("add_edges") or []
        if not isinstance(edges, list):
            return "add_edges must be a list"
        for edge in edges:
            if not isinstance(edge, Mapping) or not edge.get("from") or not edge.get("to"):
                return "add_edges entries require from/to"
        return None

    def propose_revision(self, project_id: str, name: str, run_key: str,
                         proposal: Mapping[str, Any], *, proposed_by: str,
                         known_profiles: Sequence[str] | None = None,
                         project_members: Sequence[str] | None = None) -> dict[str, Any]:
        run = self._run_row(project_id, name, run_key)
        snapshot = self._snapshot(project_id, name, run_key)
        result = json.loads(run["result_json"]) or {}
        revisions = self.store._conn.execute(
            "SELECT COUNT(*) AS n FROM dockyard_workflow_revisions "
            "WHERE project_id=? AND name=? AND run_key=?",
            (project_id, name, run_key)).fetchone()
        if int(revisions["n"]) >= MAX_REVISIONS_PER_RUN:
            raise ValueError(
                f"revision limit reached for this run ({MAX_REVISIONS_PER_RUN})")
        existing_ids = {node["id"] for node in snapshot.get("nodes", [])}
        # Validate the full candidate graph before any write.
        candidate_nodes = [dict(node) for node in snapshot.get("nodes", [])]
        for raw in proposal.get("add_nodes") or []:
            node = self._clean_node(raw)
            if node["id"] in existing_ids:
                raise ValueError(f"proposal reuses existing node id {node['id']!r}")
            candidate_nodes.append(node)
        for edge in proposal.get("add_edges") or []:
            target = next((n for n in candidate_nodes if n["id"] == str(edge.get("to"))), None)
            source = next((n for n in candidate_nodes if n["id"] == str(edge.get("from"))), None)
            if target is None or source is None:
                raise ValueError("proposal edges must reference existing or added nodes")
            if str(edge["from"]) not in target["depends_on"]:
                target["depends_on"] = [*target["depends_on"], str(edge["from"])]
        try:
            self._validated({"nodes": candidate_nodes})
        except ValueError as error:
            raise ValueError(f"proposal produces an invalid graph: {error}") from None
        revision_key = f"rev-{int(revisions['n']) + 1}"
        policy_reason = self._within_policy(proposal)
        stamp = iso(self.store._clock())
        with self.store.tx() as cx:
            cx.execute(
                "INSERT INTO dockyard_workflow_revisions("
                "project_id,name,run_key,revision_key,proposal_json,status,proposed_by,"
                "detail,created_at) VALUES(?,?,?,?,?,?,?,?,?)",
                (project_id, name, run_key, revision_key,
                 json.dumps({**proposal}, sort_keys=True),
                 "pending" if policy_reason else "auto_applied",
                 proposed_by, policy_reason or "within policy", stamp),
            )
        if policy_reason:
            self._finish_run(project_id, name, run["version"], run_key, result,
                             status="awaiting_approval")
            self.store.audit(actor=proposed_by, interface="agent",
                             action="workflow.revision_proposed",
                             subject=f"{project_id}:{name}:{run_key}:{revision_key}",
                             detail={"policy": policy_reason})
            return {"revision_key": revision_key, "status": "pending",
                    "reason": policy_reason,
                    "awaiting_approval": True}
        applied = self._apply_revision(project_id, name, run, revision_key,
                                       {**proposal}, actor=proposed_by)
        return {"revision_key": revision_key, "status": "auto_applied",
                "reason": "within policy", "awaiting_approval": False,
                **applied}

    def _apply_revision(self, project_id: str, name: str, run, revision_key: str,
                        proposal: Mapping[str, Any], *, actor: str) -> dict[str, Any]:
        run_key = run["run_key"]
        result = json.loads(run["result_json"]) or {}
        snapshot = self._snapshot(project_id, name, run_key)
        tasks: dict[str, str] = dict(result.get("tasks") or {})
        states: dict[str, str] = dict(result.get("node_states") or {})
        added: dict[str, str] = {}
        for raw in proposal.get("add_nodes") or []:
            node = self._clean_node(raw)
            assignee = node.get("phase_team")
            if assignee is None and not node.get("when"):
                # reuse the binding's single default override when unambiguous
                overrides = set(self.get_binding(project_id, name)["overrides"].values())
                if len(overrides) == 1:
                    assignee = next(iter(overrides))
            node["assignee"] = assignee
            node["team"] = None
            snapshot["nodes"].append(node)
            if node.get("when"):
                states[node["id"]] = "waiting"
                continue
            created = self.port.create_work(
                project_id,
                kind="gate" if node["human_gate"] else "task",
                title=node["title"],
                body=node.get("body"),
                assignee=assignee,
                created_by=f"dockyard-workflow:{revision_key}",
                idempotency_key=(
                    f"dockyard-workflow:{project_id}:{name}:v{run['version']}:{run_key}:"
                    f"{revision_key}:{node['id']}"
                ),
            )
            added[node["id"]] = created["id"]
            tasks[node["id"]] = created["id"]
        for edge in proposal.get("add_edges") or []:
            target_id = str(edge.get("to"))
            source_id = str(edge.get("from"))
            target_ref = tasks.get(target_id)
            source_ref = tasks.get(source_id)
            if target_ref and source_ref:
                self.port.link_work(project_id, source_ref, target_ref)
        for node_id, ref in added.items():
            for dep in next((n["depends_on"] for n in snapshot["nodes"]
                             if n["id"] == node_id), []):
                dep_ref = tasks.get(dep)
                if dep_ref:
                    self.port.link_work(project_id, dep_ref, ref)
        result.update({"tasks": tasks, "node_states": states,
                       "revisions": [*(result.get("revisions") or []), {
                           "revision_key": revision_key, "status": "applied",
                           "nodes": list(added.keys()), "by": actor}]})
        with self.store.tx() as cx:
            cx.execute(
                "UPDATE dockyard_workflow_runs SET effective_json=? "
                "WHERE project_id=? AND name=? AND run_key=?",
                (json.dumps(snapshot, sort_keys=True), project_id, name, run_key))
        self._finish_run(project_id, name, run["version"], run_key, result)
        self.store.audit(actor=actor, interface="agent",
                         action="workflow.revision_applied",
                         subject=f"{project_id}:{name}:{run_key}:{revision_key}",
                         detail={"nodes": list(added.keys())})
        return {"applied_nodes": list(added.keys()), "tasks": added}

    def decide_revision(self, project_id: str, name: str, run_key: str,
                        revision_key: str, *, approve: bool, actor: str,
                        interface: str = "rpc") -> dict[str, Any]:
        row = self.store._conn.execute(
            "SELECT * FROM dockyard_workflow_revisions "
            "WHERE project_id=? AND name=? AND run_key=? AND revision_key=?",
            (project_id, name, run_key, revision_key)).fetchone()
        if row is None:
            raise ValueError("revision was not found")
        if row["status"] != "pending":
            with self.store.tx() as cx:
                cx.execute(
                    "UPDATE dockyard_workflow_revisions SET status='stale' "
                    "WHERE id=?", (row["id"],))
            raise ValueError("revision is no longer pending (stale)")
        run = self._run_row(project_id, name, run_key)
        proposal = json.loads(row["proposal_json"])
        if approve:
            applied = self._apply_revision(project_id, name, run, revision_key,
                                           proposal, actor=actor)
            new_status, detail = "approved", "approved by human"
            payload = {"revision_key": revision_key, "status": "approved", **applied}
        else:
            new_status, detail = "rejected", "rejected by human"
            payload = {"revision_key": revision_key, "status": "rejected",
                       "applied_nodes": []}
        with self.store.tx() as cx:
            cx.execute(
                "UPDATE dockyard_workflow_revisions SET status=?, decided_by=?, "
                "decided_at=?, detail=? WHERE id=?",
                (new_status, actor, iso(self.store._clock()), detail, row["id"]),
            )
        remaining = self.store._conn.execute(
            "SELECT COUNT(*) AS n FROM dockyard_workflow_revisions WHERE project_id=? "
            "AND name=? AND run_key=? AND status='pending'",
            (project_id, name, run_key)).fetchone()
        if not int(remaining["n"]):
            result = json.loads(self._run_row(project_id, name, run_key)["result_json"]) or {}
            result.setdefault("decisions", []).append(
                {"revision_key": revision_key, "approve": approve, "by": actor})
            self._finish_run(project_id, name, run["version"], run_key, result)
        self.store.audit(actor=actor, interface=interface,
                         action="workflow.revision_decided",
                         subject=f"{project_id}:{name}:{run_key}:{revision_key}",
                         detail={"approve": approve})
        return payload

    def revisions(self, project_id: str, name: str, run_key: str) -> list[dict[str, Any]]:
        rows = self.store._conn.execute(
            "SELECT revision_key, proposal_json, status, proposed_by, decided_by, "
            "detail, created_at, decided_at FROM dockyard_workflow_revisions "
            "WHERE project_id=? AND name=? AND run_key=? ORDER BY id",
            (project_id, name, run_key)).fetchall()
        return [{"revision_key": row["revision_key"],
                 "proposal": json.loads(row["proposal_json"]),
                 "status": row["status"],
                 "proposed_by": row["proposed_by"],
                 "decided_by": row["decided_by"],
                 "detail": row["detail"],
                 "created_at": row["created_at"],
                 "decided_at": row["decided_at"]} for row in rows]

    # ---- export / import (P5.8) ---------------------------------------

    def export_definition(self, project_id: str, name: str) -> dict[str, Any]:
        """Plugin-native export: definition + binding only.

        Deliberately excludes credentials, run history and work-item state.
        """
        row = self.store._conn.execute(
            "SELECT version, definition_json FROM dockyard_workflows "
            "WHERE project_id=? AND name=? ORDER BY version DESC LIMIT 1",
            (project_id, name)).fetchone()
        if row is None:
            raise ValueError("workflow was not found")
        binding = self.get_binding(project_id, name)
        return {
            "schema": WORKFLOW_SCHEMA,
            "name": name,
            "version": int(row["version"]),
            "exported_at": iso(self.store._clock()),
            "definition": json.loads(row["definition_json"]),
            "binding": {"group_id": binding["group_id"],
                        "overrides": binding["overrides"]},
            "policy": self.proposals_policy(),
        }

    def import_definition(self, project_id: str, payload: Mapping[str, Any], *,
                          apply: bool = False, as_name: str | None = None,
                          actor: str = "system", interface: str = "rpc") -> dict[str, Any]:
        encoded = json.dumps(payload, sort_keys=True)
        if len(encoded.encode("utf-8")) > IMPORT_MAX_BYTES:
            raise ValueError(
                f"import exceeds the {IMPORT_MAX_BYTES} byte limit")
        if not isinstance(payload, Mapping):
            raise ValueError("import payload must be an object")
        definition = payload.get("definition") if "definition" in payload else payload
        if not isinstance(definition, Mapping):
            raise ValueError("import payload must contain a workflow definition")
        clean = self._validated(definition)
        warnings: list[str] = []
        if "schema" in payload and payload.get("schema") != WORKFLOW_SCHEMA:
            warnings.append(
                f"schema {payload.get('schema')!r} is not {WORKFLOW_SCHEMA!r}; "
                "validated against the native schema")
        source_name = str(as_name or payload.get("name") or "").strip()
        preview = {
            "valid": True,
            "name": source_name or None,
            "report_version": payload.get("version"),
            "node_count": len(clean["nodes"]),
            "nodes": [{"id": node["id"], "title": node["title"],
                       "kind": node["kind"],
                       "conditional": bool(node["when"]),
                       "loop": node["loop"]} for node in clean["nodes"]],
            "warnings": warnings,
            "exported_at": payload.get("exported_at"),
        }
        if not apply:
            return {"applied": False, "preview": preview, "definition": clean}
        if not source_name:
            raise ValueError("import requires a workflow name when applying")
        created = self.define(project_id, source_name, clean)
        binding = payload.get("binding")
        if isinstance(binding, Mapping):
            overrides = binding.get("overrides")
            if isinstance(overrides, Mapping) and overrides:
                group_id = binding.get("group_id")
                if isinstance(group_id, bool) or not isinstance(group_id, int):
                    group_id = None
                self.set_binding(
                    project_id, source_name,
                    group_id=group_id, overrides=overrides, actor=actor,
                    interface=interface)
        self.store.audit(actor=actor, interface=interface,
                         action="workflow.imported",
                         subject=f"{project_id}:{source_name}",
                         detail={"node_count": preview["node_count"]})
        return {"applied": True, "preview": preview, "version": created["version"],
                "workflow": created}
