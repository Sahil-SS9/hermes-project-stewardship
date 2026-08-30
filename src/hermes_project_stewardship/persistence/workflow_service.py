"""Versioned, manually-started canonical Hermes workflow graphs."""
from __future__ import annotations

import json
from typing import Any

from .canonical_work_service import CanonicalWorkPort
from .store import Store, iso


class WorkflowService:
    def __init__(self, store: Store, port: CanonicalWorkPort) -> None:
        self.store = store
        self.port = port

    @staticmethod
    def _validated(definition: dict[str, Any]) -> dict[str, Any]:
        nodes = definition.get("nodes")
        if not isinstance(nodes, list) or not nodes:
            raise ValueError("workflow nodes are required")
        ids: set[str] = set()
        graph: dict[str, list[str]] = {}
        cleaned = []
        for raw in nodes:
            if not isinstance(raw, dict):
                raise ValueError("workflow nodes must be objects")
            node_id = str(raw.get("id") or "").strip()
            title = str(raw.get("title") or "").strip()
            deps = [str(value) for value in raw.get("depends_on") or []]
            if not node_id or not title or node_id in ids:
                raise ValueError("workflow node ids and titles must be unique")
            ids.add(node_id)
            graph[node_id] = deps
            cleaned.append({
                "id": node_id,
                "title": title,
                "depends_on": deps,
                "human_gate": bool(raw.get("human_gate", False)),
                "body": str(raw.get("body") or "") or None,
            })
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
        return {"nodes": cleaned}

    def define(self, project_id: str, name: str, definition: dict[str, Any]) -> dict[str, Any]:
        clean_name = str(name or "").strip()
        if not clean_name:
            raise ValueError("workflow name is required")
        clean = self._validated(definition)
        with self.store.tx() as cx:
            row = cx.execute(
                "SELECT COALESCE(MAX(version), 0) AS version FROM dockyard_workflows "
                "WHERE project_id=? AND name=?",
                (project_id, clean_name),
            ).fetchone()
            version = int(row["version"]) + 1
            cx.execute(
                "INSERT INTO dockyard_workflows VALUES(?,?,?,?,?)",
                (project_id, clean_name, version, json.dumps(clean, sort_keys=True),
                 iso(self.store._clock())),
            )
        return {"project_id": project_id, "name": clean_name,
                "version": version, "definition": clean}

    def list(self, project_id: str) -> list[dict[str, Any]]:
        rows = self.store._conn.execute(
            "SELECT project_id,name,version,definition_json FROM dockyard_workflows "
            "WHERE project_id=? ORDER BY name,version",
            (project_id,),
        ).fetchall()
        return [{"project_id": row["project_id"], "name": row["name"],
                 "version": row["version"],
                 "definition": json.loads(row["definition_json"])} for row in rows]

    def runs(self, project_id: str, name: str) -> list[dict[str, Any]]:
        """Read-only run ledger with per-node canonical status for the canvas."""
        known = self.store._conn.execute(
            "SELECT 1 FROM dockyard_workflows WHERE project_id=? AND name=?",
            (project_id, name),
        ).fetchone()
        if known is None:
            raise ValueError("workflow was not found")
        rows = self.store._conn.execute(
            "SELECT r.version, r.run_key, r.status, r.started_at, r.updated_at, "
            "r.result_json, w.definition_json "
            "FROM dockyard_workflow_runs r "
            "JOIN dockyard_workflows w ON w.project_id=r.project_id "
            "AND w.name=r.name AND w.version=r.version "
            "WHERE r.project_id=? AND r.name=? "
            "ORDER BY r.version DESC, r.started_at DESC, r.run_key DESC",
            (project_id, name),
        ).fetchall()
        work_index = {
            item["id"]: item for item in self.port.list_work(project_id)
        }
        runs: list[dict[str, Any]] = []
        for row in rows:
            result = json.loads(row["result_json"]) or {}
            refs: dict[str, str] = result.get("tasks") or {}
            nodes = []
            for node in json.loads(row["definition_json"])["nodes"]:
                ref = refs.get(node["id"])
                item = work_index.get(ref) if ref else None
                nodes.append({
                    "node_id": node["id"],
                    "title": node["title"],
                    "depends_on": node["depends_on"],
                    "human_gate": bool(node["human_gate"]),
                    "task_ref": ref,
                    "kind": item["kind"] if item else
                            ("gate" if node["human_gate"] else "task"),
                    "status": item["status"] if item else None,
                    "assignee": item.get("assignee") if item else None,
                    "evidence_refs": item.get("evidence_refs") or []
                    if item else [],
                })
            runs.append({
                "run_key": row["run_key"],
                "version": row["version"],
                "status": row["status"],
                "started_at": row["started_at"],
                "updated_at": row["updated_at"],
                "nodes": nodes,
            })
        return runs

    def start(self, project_id: str, name: str, run_key: str,
              version: int | None = None) -> dict[str, Any]:
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
        existing = self.store._conn.execute(
            "SELECT result_json,status FROM dockyard_workflow_runs WHERE project_id=? AND name=? "
            "AND version=? AND run_key=?",
            (project_id, name, row["version"], key),
        ).fetchone()
        if existing is not None and existing["status"] == "complete":
            return {**json.loads(existing["result_json"]), "replayed": True}
        now = iso(self.store._clock())
        with self.store.tx() as cx:
            cx.execute(
                "INSERT OR IGNORE INTO dockyard_workflow_runs "
                "(project_id,name,version,run_key,result_json,started_at,status,updated_at) "
                "VALUES(?,?,?,?,?,?,?,?)",
                (project_id, name, row["version"], key, "{}", now, "pending", now),
            )
            cx.execute(
                "UPDATE dockyard_workflow_runs SET status='pending', updated_at=? "
                "WHERE project_id=? AND name=? AND version=? AND run_key=? "
                "AND status!='complete'",
                (now, project_id, name, row["version"], key),
            )
        definition = json.loads(row["definition_json"])
        tasks: dict[str, dict[str, Any]] = {}
        for node in definition["nodes"]:
            tasks[node["id"]] = self.port.create_work(
                project_id,
                kind="gate" if node["human_gate"] else "task",
                title=node["title"],
                body=node["body"],
                assignee=None,
                created_by="dockyard-workflow",
                idempotency_key=(
                    f"dockyard-workflow:{project_id}:{name}:v{row['version']}:{key}:{node['id']}"
                ),
            )
        for node in definition["nodes"]:
            for dependency in node["depends_on"]:
                self.port.link_work(project_id, tasks[dependency]["id"], tasks[node["id"]]["id"])
        result = {
            "project_id": project_id,
            "name": name,
            "version": row["version"],
            "run_key": key,
            "replayed": False,
            "tasks": {node_id: task["id"] for node_id, task in tasks.items()},
        }
        with self.store.tx() as cx:
            cx.execute(
                "UPDATE dockyard_workflow_runs SET result_json=?, status='complete', "
                "updated_at=? WHERE project_id=? AND name=? AND version=? AND run_key=?",
                (json.dumps(result, sort_keys=True), iso(self.store._clock()),
                 project_id, name, row["version"], key),
            )
        return result
