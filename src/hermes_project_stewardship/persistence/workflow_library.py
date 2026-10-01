"""Scoped workflow library over the legacy project workflow engine.

Existing project graph identities and all historical runs remain untouched. Global
definitions use a separate namespace; an enabled project materialises a private
execution identity on first run. That identity is opaque and cannot collide with
an existing dedicated workflow, even when the displayed names are identical.
"""
from __future__ import annotations

import json
from typing import Any, Mapping
from uuid import uuid4

from .store import iso


class WorkflowLibrary:
    def __init__(self, engine):
        self.engine = engine
        self.store = engine.store

    def _latest(self, name: str, scope: str, project_id: str | None = None):
        if scope == "global":
            return self.store._conn.execute(
                "SELECT * FROM dockyard_global_workflows WHERE name=? "
                "ORDER BY version DESC LIMIT 1", (name,)).fetchone()
        if scope == "project" and project_id:
            return self.store._conn.execute(
                "SELECT * FROM dockyard_workflows WHERE project_id=? AND name=? "
                "ORDER BY version DESC LIMIT 1", (project_id, name)).fetchone()
        raise ValueError("scope must be global or project with an owner project")

    def _exists(self, project_id: str) -> None:
        if self.store._conn.execute(
            "SELECT 1 FROM project_stewardship WHERE project_id=?", (project_id,)
        ).fetchone() is None:
            raise ValueError("project was not found")

    def list(self, *, scope: str | None = None, include_archived: bool = False):
        if scope not in (None, "global", "project"):
            raise ValueError("scope must be global or project")
        result = []
        if scope != "project":
            for row in self.store._conn.execute(
                "SELECT g.* FROM dockyard_global_workflows g WHERE version=("
                "SELECT MAX(version) FROM dockyard_global_workflows WHERE name=g.name) "
                "ORDER BY name"
            ):
                if include_archived or row["archived_at"] is None:
                    result.append(self._present(row, "global"))
        if scope != "global":
            for row in self.store._conn.execute(
                "SELECT w.* FROM dockyard_workflows w WHERE version=("
                "SELECT MAX(version) FROM dockyard_workflows WHERE "
                "project_id=w.project_id AND name=w.name) ORDER BY project_id,name"
            ):
                if include_archived or row["archived_at"] is None:
                    # Internal execution snapshots are not library entries.
                    if self.store._conn.execute(
                        "SELECT 1 FROM dockyard_global_instances WHERE project_id=? AND internal_name=?",
                        (row["project_id"], row["name"])
                    ).fetchone() is None:
                        result.append(self._present(row, "project"))
        return result

    @staticmethod
    def _present(row, scope: str):
        return {"scope": scope, "name": row["name"], "version": row["version"],
                "owner_project_id": row["project_id"] if scope == "project" else None,
                "definition": json.loads(row["definition_json"]),
                "archived_at": row["archived_at"], "created_at": row["created_at"]}

    def define(self, name: str, scope: str, definition: Mapping[str, Any], *,
               actor: str, project_id: str | None = None, interface: str = "service"):
        name = str(name or "").strip()
        if not name:
            raise ValueError("workflow name is required")
        if scope == "project":
            if not project_id:
                raise ValueError("project owner is required")
            self._exists(project_id)
            result = self.engine.define(project_id, name, definition)
            self.store.audit(actor=actor, interface=interface, action="workflow.library_defined",
                             subject=f"project:{project_id}:{name}:v{result['version']}")
            return {**result, "scope": scope, "owner_project_id": project_id}
        if scope != "global":
            raise ValueError("invalid workflow scope")
        clean = self.engine._validated(definition)
        clean.pop("template", None)
        with self.store.tx() as cx:
            old = self._latest(name, "global")
            if old is not None and old["archived_at"] is not None:
                raise ValueError("workflow is archived; restore before editing")
            version = int(old["version"]) + 1 if old is not None else 1
            cx.execute("INSERT INTO dockyard_global_workflows "
                       "(name,version,definition_json,created_at,created_by) "
                       "VALUES(?,?,?,?,?)",
                       (name, version, json.dumps(clean, sort_keys=True),
                        iso(self.store._clock()), actor))
            # v30 compatibility shadow: the old template routes and a v31→v30
            # downgrade must retain the same versions and definitions.
            cx.execute("INSERT INTO dockyard_workflow_templates "
                       "(name,version,definition_json,created_at,created_by) "
                       "VALUES(?,?,?,?,?)",
                       (name, version, json.dumps(clean, sort_keys=True),
                        iso(self.store._clock()), actor))
        self.store.audit(actor=actor, interface=interface, action="workflow.library_defined",
                         subject=f"global:{name}:v{version}")
        return {"name": name, "scope": scope, "version": version,
                "owner_project_id": None, "definition": clean}

    def enabled(self, project_id: str, name: str, scope: str) -> bool:
        row = self.store._conn.execute(
            "SELECT enabled FROM dockyard_workflow_enablement "
            "WHERE project_id=? AND scope=? AND workflow_name=?",
            (project_id, scope, name)).fetchone()
        # Existing and newly-created dedicated workflows default on. Globals
        # have NO implicit opt-in, including for projects created in future.
        return bool(row["enabled"]) if row is not None else scope == "project"

    def available(self, project_id: str):
        self._exists(project_id)
        return [{**row, "enabled": self.enabled(project_id, row["name"], row["scope"])}
                for row in self.list() if row["scope"] == "global" or
                row["owner_project_id"] == project_id]

    def toggle(self, project_id: str, name: str, scope: str, *, enabled: bool,
               actor: str, interface: str = "service"):
        if not isinstance(enabled, bool):
            raise ValueError("enabled must be a JSON boolean")
        self._exists(project_id)
        row = self._latest(name, scope, project_id)
        if row is None or row["archived_at"] is not None:
            raise ValueError("workflow was not found")
        with self.store.tx() as cx:
            cx.execute("INSERT INTO dockyard_workflow_enablement "
                       "(project_id,scope,workflow_name,enabled,updated_at,updated_by) "
                       "VALUES(?,?,?,?,?,?) ON CONFLICT(project_id,scope,workflow_name) "
                       "DO UPDATE SET enabled=excluded.enabled, updated_at=excluded.updated_at, "
                       "updated_by=excluded.updated_by",
                       (project_id, scope, name, int(enabled), iso(self.store._clock()), actor))
        self.store.audit(actor=actor, interface=interface,
                         action="workflow.enablement_updated",
                         subject=f"{project_id}:{scope}:{name}",
                         detail={"enabled": enabled})
        return {"project_id": project_id, "scope": scope,
                "name": name, "enabled": enabled}

    def _internal_name(self, project_id: str, name: str):
        row = self.store._conn.execute(
            "SELECT internal_name FROM dockyard_global_instances "
            "WHERE project_id=? AND workflow_name=?", (project_id, name)
        ).fetchone()
        return row["internal_name"] if row else None

    def start(self, project_id: str, name: str, scope: str, run_key: str,
              *, actor: str = "system", interface: str = "service",
              known_profiles=None, project_members=None):
        self._exists(project_id)
        row = self._latest(name, scope, project_id)
        if row is None:
            raise ValueError("workflow was not found")
        if row["archived_at"] is not None:
            raise ValueError("workflow is archived")
        if not self.enabled(project_id, name, scope):
            raise ValueError("workflow is disabled for this project")
        if scope == "project":
            result = self.engine.start(project_id, name, run_key,
                                       known_profiles=known_profiles,
                                       project_members=project_members)
        else:
            internal = self._internal_name(project_id, name)
            if internal is None:
                with self.store.tx() as cx:
                    while True:
                        internal = f"__global__:{uuid4().hex}"
                        if cx.execute("SELECT 1 FROM dockyard_workflows WHERE project_id=? AND name=?",
                                      (project_id, internal)).fetchone() is None:
                            break
                    cx.execute("INSERT INTO dockyard_global_instances "
                               "(project_id,workflow_name,internal_name) VALUES(?,?,?)",
                               (project_id, name, internal))
            definition = json.loads(row["definition_json"])
            existing = self._latest(internal, "project", project_id)
            if existing is None or json.loads(existing["definition_json"]) != definition:
                self.engine.define(project_id, internal, definition)
            result = {**self.engine.start(project_id, internal, run_key,
                                          known_profiles=known_profiles,
                                          project_members=project_members),
                      "name": name, "scope": "global"}
        self.store.audit(actor=actor, interface=interface,
                         action="workflow.library_started",
                         subject=f"{project_id}:{scope}:{name}:{run_key}")
        return result

    def runs(self, project_id: str, name: str, scope: str):
        self._exists(project_id)
        internal = self._internal_name(project_id, name) if scope == "global" else name
        return self.engine.runs(project_id, internal) if internal else []

    def timeline(self, project_id: str, name: str, scope: str, run_key: str):
        self._exists(project_id)
        internal = self._internal_name(project_id, name) if scope == "global" else name
        if not internal:
            raise ValueError("workflow run was not found")
        return self.engine.timeline(project_id, internal, run_key)

    def archive(self, name: str, scope: str, *, actor: str,
                project_id: str | None = None, restore: bool = False,
                interface: str = "service"):
        row = self._latest(name, scope, project_id)
        if row is None:
            raise ValueError("workflow was not found")
        if scope == "project":
            result = (self.engine.restore if restore else self.engine.archive)(
                project_id, name, actor=actor, interface=interface)
        else:
            with self.store.tx() as cx:
                cx.execute("UPDATE dockyard_global_workflows SET archived_at=?,archived_by=? "
                           "WHERE name=?", (None if restore else iso(self.store._clock()),
                                             None if restore else actor, name))
            result = self._present(self._latest(name, scope), scope)
            self.store.audit(actor=actor, interface=interface,
                             action="workflow.restored" if restore else "workflow.archived",
                             subject=f"global:{name}")
        return result

    def delete(self, name: str, scope: str, *, actor: str,
               project_id: str | None = None, interface: str = "service"):
        row = self._latest(name, scope, project_id)
        if row is None:
            raise ValueError("workflow was not found")
        with self.store.tx() as cx:
            if scope == "global":
                instances = cx.execute(
                    "SELECT project_id, internal_name FROM dockyard_global_instances "
                    "WHERE workflow_name=?", (name,)).fetchall()
                for instance in instances:
                    if cx.execute("SELECT 1 FROM dockyard_workflow_runs "
                                  "WHERE project_id=? AND name=? LIMIT 1",
                                  (instance["project_id"], instance["internal_name"])).fetchone():
                        raise ValueError("global workflow has an active run or history; archive instead")
                if cx.execute("SELECT 1 FROM dockyard_workflow_enablement WHERE scope='global' "
                              "AND workflow_name=? AND enabled=1 LIMIT 1", (name,)).fetchone():
                    raise ValueError("workflow is enabled in a project; disable before deleting")
                for instance in instances:
                    cx.execute("DELETE FROM dockyard_workflows WHERE project_id=? AND name=?",
                               (instance["project_id"], instance["internal_name"]))
                cx.execute("DELETE FROM dockyard_global_instances WHERE workflow_name=?", (name,))
                cx.execute("DELETE FROM dockyard_global_workflows WHERE name=?", (name,))
                cx.execute("DELETE FROM dockyard_workflow_templates WHERE name=?", (name,))
            else:
                if cx.execute("SELECT 1 FROM dockyard_workflow_runs WHERE project_id=? "
                              "AND name=? LIMIT 1", (project_id, name)).fetchone():
                    raise ValueError("workflow has run history; archive instead")
                cx.execute("DELETE FROM dockyard_workflows WHERE project_id=? AND name=?",
                           (project_id, name))
            cx.execute("DELETE FROM dockyard_workflow_enablement WHERE scope=? AND "
                       "workflow_name=?" + ("" if scope == "global" else " AND project_id=?"),
                       (scope, name) if scope == "global" else (scope, name, project_id))
        self.store.audit(actor=actor, interface=interface,
                         action="workflow.library_deleted", subject=f"{scope}:{project_id or ''}:{name}")
        return {"scope": scope, "name": name, "deleted": True}
