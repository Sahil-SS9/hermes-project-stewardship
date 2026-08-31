"""Adapter implementing Dockyard's host contract on vanilla Hermes APIs."""
from __future__ import annotations

from contextlib import contextmanager
from dataclasses import asdict
from pathlib import Path
import re
import time
from typing import Any, Iterator

CONTRACT_VERSION = 2
MAX_PAGE_SIZE = 500
_PROFILE_RE = re.compile(r"^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$")
_TASK_KINDS = {"task", "bug", "spike", "subtask", "gate", "epic"}
_METHODS = {
    "get_board", "get_project", "get_task", "get_epic", "list_profiles",
    "validate_project", "provision_project", "list_tasks", "list_epics",
    "create_task", "create_epic", "update_task", "assign_task", "update_epic",
    "transition_task", "block_task", "link_tasks", "unlink_tasks", "list_links",
}


class HostError(RuntimeError):
    def __init__(self, code: str, message: str, *, fields=None) -> None:
        super().__init__(message)
        self.code = code
        self.message = message
        self.fields = dict(fields or {})


def _record(value: Any) -> dict[str, Any]:
    if hasattr(value, "to_dict"):
        return value.to_dict()
    return asdict(value)


def _page(items: list[dict[str, Any]], limit: int) -> dict[str, Any]:
    if isinstance(limit, bool) or not 1 <= int(limit) <= MAX_PAGE_SIZE:
        raise HostError("validation_error", "limit must be between 1 and 500")
    size = int(limit)
    return {"items": items[:size], "limit": size, "has_more": len(items) > size}


class ProjectKanbanHost:
    """Small compatibility layer; Hermes remains owner of both canonical stores."""

    def __init__(self, *, hermes_home: str | Path, board: str = "default", **_kwargs) -> None:
        self.hermes_home = Path(hermes_home)
        self.board = (board or "default").strip()

    @staticmethod
    def _modules():
        import hermes_constants
        from hermes_cli import kanban_db, projects_db
        return hermes_constants, kanban_db, projects_db

    @contextmanager
    def _scope(self, board: str | None = None) -> Iterator[str]:
        hermes_constants, kanban_db, _ = self._modules()
        selected = (board or self.board or "default").strip()
        token = hermes_constants.set_hermes_home_override(self.hermes_home)
        try:
            with kanban_db.scoped_current_board(selected):
                yield selected
        finally:
            hermes_constants.reset_hermes_home_override(token)

    def capabilities(self) -> dict[str, Any]:
        return {"contract_version": CONTRACT_VERSION, "methods": sorted(_METHODS)}

    def list_profiles(self) -> list[dict[str, Any]]:
        profiles = [{"name": "default", "is_default": True}]
        root = self.hermes_home / "profiles"
        if root.is_dir():
            for path in sorted(root.iterdir(), key=lambda p: p.name.casefold()):
                if path.is_dir() and _PROFILE_RE.fullmatch(path.name):
                    profiles.append({"name": path.name, "is_default": False})
        return profiles

    def _validate(self, **payload: Any) -> dict[str, Any]:
        _, kanban_db, projects_db = self._modules()
        name = str(payload.get("name") or "").strip()
        slug_raw = str(payload.get("slug") or "").strip()
        board_raw = str(payload.get("board_slug") or slug_raw).strip()
        description = str(payload.get("description") or "").strip()
        lead = str(payload.get("lead_profile") or "").strip()
        errors: dict[str, list[str]] = {}
        try:
            slug = projects_db.normalize_slug(slug_raw)
            if not slug or slug != slug_raw:
                raise ValueError
        except ValueError:
            slug = None
            errors["slug"] = ["Use a lowercase project slug"]
        try:
            board_slug = kanban_db._normalize_board_slug(board_raw)
            if not board_slug or board_slug != board_raw:
                raise ValueError
        except ValueError:
            board_slug = None
            errors["board_slug"] = ["Use a lowercase board slug"]
        repo = Path(str(payload.get("repo_path") or "")).expanduser()
        try:
            repo = repo.resolve(strict=True)
            if not repo.is_dir():
                raise OSError
        except (OSError, RuntimeError):
            errors["repo_path"] = ["Repository path must be an existing directory"]
        if not name:
            errors["name"] = ["Project name is required"]
        if not description:
            errors["description"] = ["Project mission is required"]
        if lead not in {item["name"] for item in self.list_profiles()}:
            errors["lead_profile"] = ["Lead profile is not available"]
        if errors:
            raise HostError("validation_error", "Project details are invalid", fields=errors)
        return {
            "name": name, "slug": slug, "description": description,
            "repo_path": str(repo), "lead_profile": lead, "board_slug": board_slug,
        }

    def validate_project(self, **payload: Any) -> dict[str, Any]:
        with self._scope():
            return self._validate(**payload)

    def provision_project(self, *, idempotency_key: str, **payload: Any) -> dict[str, Any]:
        del idempotency_key  # vanilla create APIs are naturally idempotent by slug/path
        _, kanban_db, projects_db = self._modules()
        with self._scope(payload.get("board_slug")):
            clean = self._validate(**payload)
            with projects_db.connect_closing() as conn:
                existing = projects_db.get_project(conn, clean["slug"])
                if existing is not None:
                    record = _record(existing)
                    same = (
                        record.get("name") == clean["name"]
                        and record.get("primary_path") == clean["repo_path"]
                        and record.get("board_slug") == clean["board_slug"]
                    )
                    if not same:
                        raise HostError("idempotency_conflict", "Project slug is already in use")
                    return {
                        "status": "complete", "replayed": True,
                        "project": record, "board": self.get_board(clean["board_slug"]),
                    }
                project_id = projects_db.create_project(
                    conn, name=clean["name"], slug=clean["slug"],
                    description=clean["description"], primary_path=clean["repo_path"],
                    board_slug=clean["board_slug"],
                )
            try:
                board = kanban_db.create_board(
                    clean["board_slug"], name=clean["name"],
                    description=clean["description"], default_workdir=clean["repo_path"],
                    project_id=project_id,
                )
            except Exception:
                with projects_db.connect_closing() as conn:
                    projects_db.archive_project(conn, project_id)
                raise
            return {
                "status": "complete", "replayed": False,
                "project": self.get_project(project_id), "board": board,
            }

    def get_project(self, project_id: str) -> dict[str, Any]:
        _, _, projects_db = self._modules()
        with self._scope(), projects_db.connect_closing() as conn:
            project = projects_db.get_project(conn, project_id)
            if project is None:
                raise HostError("project_not_found", "canonical project was not found")
            return _record(project)

    def get_board(self, board: str | None = None) -> dict[str, Any]:
        _, kanban_db, _ = self._modules()
        selected = board or self.board
        with self._scope(selected):
            if not kanban_db.board_exists(selected):
                raise HostError("board_not_found", "canonical board was not found")
            return dict(kanban_db.read_board_metadata(selected))

    @contextmanager
    def _kanban(self, board: str | None = None):
        _, kanban_db, _ = self._modules()
        with self._scope(board) as selected, kanban_db.connect_closing(board=selected) as conn:
            yield kanban_db, conn, selected

    @staticmethod
    def _task_record(task: Any) -> dict[str, Any]:
        record = _record(task)
        tenant = str(record.get("tenant") or "")
        record["task_kind"] = tenant.removeprefix("dockyard:") if tenant.startswith("dockyard:") else "task"
        record["initial_status"] = record.get("status")
        return record

    def get_task(self, task_id: str, *, board: str | None = None) -> dict[str, Any]:
        with self._kanban(board) as (kb, conn, _):
            task = kb.get_task(conn, task_id)
            if task is None or self._task_record(task)["task_kind"] == "epic":
                raise HostError("task_not_found", "canonical task was not found")
            return {"task": self._task_record(task)}

    def get_epic(self, epic_id: str, *, board: str | None = None) -> dict[str, Any]:
        with self._kanban(board) as (kb, conn, _):
            task = kb.get_task(conn, epic_id)
            if task is None or self._task_record(task)["task_kind"] != "epic":
                raise HostError("epic_not_found", "canonical epic was not found")
            return self._task_record(task)

    def _list(self, *, epic: bool, board: str | None, limit: int) -> dict[str, Any]:
        with self._kanban(board) as (kb, conn, _):
            items = [self._task_record(task) for task in kb.list_tasks(conn, include_archived=False)]
        items = [item for item in items if (item["task_kind"] == "epic") is epic]
        return _page(items, limit)

    def list_tasks(self, *, board: str | None = None, limit: int = 100) -> dict[str, Any]:
        return self._list(epic=False, board=board, limit=limit)

    def list_epics(self, *, board: str | None = None, limit: int = 100) -> dict[str, Any]:
        return self._list(epic=True, board=board, limit=limit)

    def create_task(
        self, *, title: str, body: str | None = None, assignee: str | None = None,
        created_by: str | None = None, project_id: str | None = None,
        task_kind: str = "task", parent_task_id: str | None = None,
        initial_status: str = "backlog", idempotency_key: str | None = None,
        board: str | None = None, **_kwargs: Any,
    ) -> dict[str, Any]:
        if task_kind not in _TASK_KINDS - {"epic"}:
            raise HostError("validation_error", "canonical work type is not supported")
        with self._kanban(board) as (kb, conn, selected):
            task_id = kb.create_task(
                conn, title=title, body=body, assignee=assignee, created_by=created_by,
                tenant=f"dockyard:{task_kind}", initial_status="running",
                idempotency_key=idempotency_key, board=selected, project_id=project_id,
            )
            if parent_task_id:
                kb.link_tasks(conn, parent_task_id, task_id)
            self._set_status(conn, task_id, initial_status)
            return self._task_record(kb.get_task(conn, task_id))

    def create_epic(
        self, *, title: str, description: str | None = None,
        parent_epic_id: str | None = None, status: str = "active",
        board: str | None = None, **_kwargs: Any,
    ) -> dict[str, Any]:
        with self._kanban(board) as (kb, conn, selected):
            epic_id = kb.create_task(
                conn, title=title, body=description, created_by="dockyard",
                tenant="dockyard:epic", initial_status="running", board=selected,
            )
            if parent_epic_id:
                kb.link_tasks(conn, parent_epic_id, epic_id)
            self._set_status(conn, epic_id, "done" if status == "done" else "ready")
            return self._task_record(kb.get_task(conn, epic_id))

    @staticmethod
    def _set_status(conn, task_id: str, status: str) -> None:
        allowed = {"backlog", "triage", "todo", "ready", "review", "done", "blocked"}
        if status not in allowed:
            raise HostError("validation_error", "canonical task status is invalid")
        completed = int(time.time()) if status == "done" else None
        conn.execute(
            "UPDATE tasks SET status=?, completed_at=?, claim_lock=NULL, claim_expires=NULL WHERE id=?",
            (status, completed, task_id),
        )

    def transition_task(
        self, task_id: str, status: str, *, board: str | None = None,
        force_review: bool = False, **_kwargs: Any,
    ) -> dict[str, Any]:
        del force_review
        with self._kanban(board) as (kb, conn, _):
            if kb.get_task(conn, task_id) is None:
                raise HostError("task_not_found", "canonical task was not found")
            self._set_status(conn, task_id, status)
            return self._task_record(kb.get_task(conn, task_id))

    def block_task(self, task_id: str, *, board: str | None = None, **_kwargs: Any) -> dict[str, Any]:
        return self.transition_task(task_id, "blocked", board=board)

    def update_task(self, task_id: str, *, board: str | None = None, **changes: Any) -> dict[str, Any]:
        columns = {"title": "title", "body": "body"}
        with self._kanban(board) as (kb, conn, _):
            if kb.get_task(conn, task_id) is None:
                raise HostError("task_not_found", "canonical task was not found")
            for key, column in columns.items():
                if key in changes:
                    conn.execute(f"UPDATE tasks SET {column}=? WHERE id=?", (changes[key], task_id))
            if "task_kind" in changes:
                kind = str(changes["task_kind"])
                if kind not in _TASK_KINDS:
                    raise HostError("validation_error", "canonical work type is not supported")
                conn.execute("UPDATE tasks SET tenant=? WHERE id=?", (f"dockyard:{kind}", task_id))
            if changes.get("parent_task_id"):
                kb.link_tasks(conn, str(changes["parent_task_id"]), task_id)
            return self._task_record(kb.get_task(conn, task_id))

    def update_epic(self, epic_id: str, *, board: str | None = None, **changes: Any) -> dict[str, Any]:
        mapped = {"title": changes.get("title"), "body": changes.get("description")}
        result = self.update_task(epic_id, board=board, **{k: v for k, v in mapped.items() if v is not None})
        if "status" in changes:
            result = self.transition_task(
                epic_id, "done" if changes["status"] == "done" else "ready", board=board
            )
        return result

    def assign_task(self, task_id: str, assignee: str | None, *, board: str | None = None) -> dict[str, Any]:
        with self._kanban(board) as (kb, conn, _):
            if not kb.assign_task(conn, task_id, assignee):
                raise HostError("task_not_found", "canonical task was not found")
            return self._task_record(kb.get_task(conn, task_id))

    def link_tasks(self, parent_id: str, child_id: str, *, board: str | None = None) -> dict[str, Any]:
        with self._kanban(board) as (kb, conn, _):
            kb.link_tasks(conn, parent_id, child_id)
        return {"parent_task_id": parent_id, "child_task_id": child_id}

    def unlink_tasks(self, parent_id: str, child_id: str, *, board: str | None = None) -> dict[str, Any]:
        with self._kanban(board) as (kb, conn, _):
            removed = kb.unlink_tasks(conn, parent_id, child_id)
        return {"parent_task_id": parent_id, "child_task_id": child_id, "removed": removed}

    def list_links(self, task_id: str, *, board: str | None = None, limit: int = 500) -> dict[str, Any]:
        with self._kanban(board) as (kb, conn, _):
            if kb.get_task(conn, task_id) is None:
                raise HostError("task_not_found", "canonical task was not found")
            items = [
                {"parent_task_id": parent, "child_task_id": task_id}
                for parent in kb.parent_ids(conn, task_id)
            ] + [
                {"parent_task_id": task_id, "child_task_id": child}
                for child in kb.child_ids(conn, task_id)
            ]
        return _page(items, limit)
