"""Dockyard adapter for the versioned in-process ProjectKanbanHost service."""
from __future__ import annotations

import hashlib
from importlib import import_module
import json
from pathlib import Path
from typing import Any, Mapping

from .bridge import BoardCard, KanbanAdapter


_REQUIRED_HOST_METHODS = frozenset(
    {
        "get_board",
        "get_project",
        "get_task",
        "get_epic",
        "list_profiles",
        "validate_project",
        "provision_project",
        "list_tasks",
        "list_epics",
        "create_task",
        "create_epic",
        "update_epic",
        "transition_task",
        "link_tasks",
    }
)
_COLUMN_STATUS = {
    "todo": "backlog",
    "doing": "ready",
    "review": "review",
    "done": "done",
    "blocked": "blocked",
}
_SAFE_HOST_MESSAGES = {
    "board_not_found": "canonical board was not found",
    "project_not_found": "canonical project was not found",
    "task_not_found": "canonical task was not found",
    "epic_not_found": "canonical epic was not found",
    "transition_conflict": "canonical task transition was rejected",
    "validation_error": "Project details are invalid",
    "write_conflict": "canonical work could not be written",
    "write_forbidden": "canonical work write is not permitted",
    "idempotency_conflict": "Idempotency key was already used for different project details",
    "host_unavailable": "canonical project and Kanban host is unavailable",
}


class KanbanAdapterError(RuntimeError):
    """Stable, redacted error raised at the Dockyard to Hermes boundary."""

    def __init__(
        self,
        code: str,
        message: str,
        *,
        fields: Mapping[str, Any] | None = None,
    ) -> None:
        super().__init__(message)
        self.code = code
        self.message = message
        self.fields = dict(fields or {})

    def to_envelope(self) -> dict[str, Any]:
        return {
            "error": {
                "code": self.code,
                "message": self.message,
                "fields": dict(self.fields),
            }
        }


class UnavailableKanbanAdapter(KanbanAdapter):
    """Fail closed when the canonical Hermes host cannot be loaded."""

    def __init__(self, error: KanbanAdapterError | None = None) -> None:
        self.error = error or KanbanAdapterError(
            "host_unavailable",
            "canonical project and Kanban host is unavailable",
        )

    def _refuse(self):
        raise KanbanAdapterError(
            self.error.code,
            self.error.message,
            fields=self.error.fields,
        )

    def ensure_board(self, project_id: str, slug: str) -> str:
        return self._refuse()

    def add_card(self, board_id: str, card: BoardCard) -> str:
        return self._refuse()

    def move_card(self, board_id: str, card_id: str, column: str) -> None:
        self._refuse()

    def create_work(self, *args: Any, **kwargs: Any) -> dict[str, Any]:
        return self._refuse()

    def list_work(self, *args: Any, **kwargs: Any) -> list[dict[str, Any]]:
        return self._refuse()

    def get_work(self, *args: Any, **kwargs: Any) -> dict[str, Any]:
        return self._refuse()

    def transition_work(self, *args: Any, **kwargs: Any) -> dict[str, Any]:
        return self._refuse()

    def link_work(self, *args: Any, **kwargs: Any) -> dict[str, Any]:
        return self._refuse()

    def list_profiles(self) -> list[dict[str, Any]]:
        return self._refuse()

    def validate_project(self, **kwargs: Any) -> dict[str, Any]:
        return self._refuse()

    def provision_project(self, **kwargs: Any) -> dict[str, Any]:
        return self._refuse()


class ProjectKanbanHostAdapter(KanbanAdapter):
    """Translate Dockyard board/card calls to canonical Hermes host calls.

    P3 deliberately binds only to existing project and board records. Native
    project and board provisioning belongs to the separately gated P4 slice.
    """

    contract_version = 2

    def __init__(self, host: Any) -> None:
        self.host = host
        self._board_projects: dict[str, str] = {}
        self._verify_contract()

    def _verify_contract(self) -> None:
        try:
            document = self.host.capabilities()
            version = int(document.get("contract_version", 0))
            methods = set(document.get("methods") or ())
        except Exception:
            raise KanbanAdapterError(
                "host_contract_unavailable",
                "canonical project and Kanban host is unavailable",
            ) from None
        if version < self.contract_version or not _REQUIRED_HOST_METHODS.issubset(
            methods
        ):
            raise KanbanAdapterError(
                "host_contract_unavailable",
                "canonical project and Kanban host is unavailable",
            )

    @staticmethod
    def _mapped_error(exc: Exception) -> KanbanAdapterError:
        host_code = str(getattr(exc, "code", "host_unavailable"))
        if host_code in _SAFE_HOST_MESSAGES:
            raw_fields = getattr(exc, "fields", {})
            fields = dict(raw_fields) if isinstance(raw_fields, Mapping) else {}
            return KanbanAdapterError(
                host_code,
                _SAFE_HOST_MESSAGES[host_code],
                fields=fields,
            )
        return KanbanAdapterError(
            "host_unavailable",
            "canonical project and Kanban host is unavailable",
        )

    def list_profiles(self) -> list[dict[str, Any]]:
        try:
            return list(self.host.list_profiles())
        except Exception as exc:
            raise self._mapped_error(exc) from None

    def validate_project(self, **payload: Any) -> dict[str, Any]:
        try:
            return dict(self.host.validate_project(**payload))
        except Exception as exc:
            raise self._mapped_error(exc) from None

    def provision_project(self, **payload: Any) -> dict[str, Any]:
        try:
            return dict(self.host.provision_project(**payload))
        except Exception as exc:
            raise self._mapped_error(exc) from None

    def ensure_board(self, project_id: str, slug: str) -> str:
        try:
            project = self.host.get_project(project_id)
            if project.get("board_slug") != slug:
                raise KanbanAdapterError(
                    "project_board_mismatch",
                    "project is not bound to the requested canonical board",
                    fields={"project_id": project_id, "board_slug": slug},
                )
            board = self.host.get_board(slug)
            if board.get("slug") != slug or board.get("project_id") != project.get("id"):
                raise KanbanAdapterError(
                    "project_board_mismatch",
                    "project is not bound to the requested canonical board",
                    fields={"project_id": project_id, "board_slug": slug},
                )
        except KanbanAdapterError:
            raise
        except Exception as exc:
            raise self._mapped_error(exc) from None
        self._board_projects[slug] = str(project["id"])
        return slug

    @staticmethod
    def _status_for_column(column: str) -> str:
        try:
            return _COLUMN_STATUS[column]
        except KeyError:
            raise KanbanAdapterError(
                "validation_error",
                "Dockyard board column is not supported by canonical Kanban",
                fields={"column": column},
            ) from None

    @staticmethod
    def _idempotency_key(board_id: str, card: BoardCard) -> str:
        payload = json.dumps(
            {
                "board": board_id,
                "title": card.title,
                "description": card.description,
                "metadata": card.metadata,
            },
            sort_keys=True,
            separators=(",", ":"),
        ).encode("utf-8")
        digest = hashlib.sha256(payload).hexdigest()
        return f"dockyard-card:{digest}"

    def project_board(self, project_id: str) -> str:
        """Resolve and verify the canonical board bound to a project."""
        try:
            project = self.host.get_project(project_id)
            slug = str(project.get("board_slug") or "")
            if not slug:
                raise KanbanAdapterError(
                    "project_board_mismatch",
                    "project has no canonical board binding",
                    fields={"project_id": project_id},
                )
            return self.ensure_board(str(project.get("id") or project_id), slug)
        except KanbanAdapterError:
            raise
        except Exception as exc:
            raise self._mapped_error(exc) from None

    @staticmethod
    def _work_record(
        raw: Mapping[str, Any],
        *,
        project_id: str,
        kind: str,
    ) -> dict[str, Any]:
        record = dict(raw)
        item_id = str(record.get("id") or "")
        if not item_id:
            raise KanbanAdapterError(
                "host_unavailable",
                "canonical project and Kanban host returned invalid work",
            )
        actual_kind = "epic" if kind == "epic" else str(
            record.get("task_kind") or kind or "task"
        )
        record["id"] = item_id
        record["ref"] = item_id
        record["kind"] = actual_kind
        record["type"] = actual_kind
        record["project_id"] = project_id
        record["status"] = str(
            record.get("status")
            or record.get("initial_status")
            or ("active" if actual_kind == "epic" else "backlog")
        )
        if actual_kind == "epic" and "body" not in record:
            record["body"] = record.get("description")
        return record

    def list_work(self, project_id: str) -> list[dict[str, Any]]:
        board = self.project_board(project_id)
        native_project_id = self._board_projects.get(board)
        try:
            task_page = self.host.list_tasks(board=board, limit=100)
            epic_page = self.host.list_epics(board=board, limit=100)
            tasks = []
            for raw in task_page.get("items") or ():
                owner = raw.get("project_id")
                if owner not in (None, "", project_id, native_project_id):
                    continue
                tasks.append(
                    self._work_record(raw, project_id=project_id, kind="task")
                )
            epics = [
                self._work_record(raw, project_id=project_id, kind="epic")
                for raw in epic_page.get("items") or ()
            ]
            return tasks + epics
        except KanbanAdapterError:
            raise
        except Exception as exc:
            raise self._mapped_error(exc) from None

    def get_work(
        self,
        project_id: str,
        kind: str,
        item_id: str,
    ) -> dict[str, Any]:
        board = self.project_board(project_id)
        native_project_id = self._board_projects.get(board)
        try:
            if kind == "epic":
                raw = self.host.get_epic(item_id, board=board)
                return self._work_record(raw, project_id=project_id, kind="epic")
            envelope = self.host.get_task(item_id, board=board)
            raw = envelope.get("task", envelope)
            owner = raw.get("project_id")
            if owner not in (None, "", project_id, native_project_id):
                raise KanbanAdapterError(
                    "task_not_found",
                    "canonical task was not found",
                    fields={"task": item_id},
                )
            return self._work_record(raw, project_id=project_id, kind=kind)
        except KanbanAdapterError:
            raise
        except Exception as exc:
            raise self._mapped_error(exc) from None

    def create_work(
        self,
        project_id: str,
        *,
        kind: str,
        title: str,
        body: str | None,
        assignee: str | None,
        created_by: str,
        parent_id: str | None = None,
        idempotency_key: str | None = None,
    ) -> dict[str, Any]:
        board = self.project_board(project_id)
        try:
            if kind == "epic":
                raw = self.host.create_epic(
                    title=title,
                    description=body,
                    parent_epic_id=parent_id,
                    status="active",
                    board=board,
                )
                return self._work_record(raw, project_id=project_id, kind="epic")
            if kind not in {"task", "bug", "spike", "subtask", "gate"}:
                raise KanbanAdapterError(
                    "validation_error",
                    "canonical work type is not supported",
                    fields={"kind": kind},
                )
            raw = self.host.create_task(
                title=title,
                body=body,
                assignee=assignee,
                created_by=created_by,
                project_id=project_id,
                task_kind=kind,
                parent_task_id=parent_id,
                initial_status="backlog",
                idempotency_key=idempotency_key,
                board=board,
            )
            return self._work_record(raw, project_id=project_id, kind=kind)
        except KanbanAdapterError:
            raise
        except Exception as exc:
            raise self._mapped_error(exc) from None

    def transition_work(
        self,
        project_id: str,
        kind: str,
        item_id: str,
        status: str,
    ) -> dict[str, Any]:
        board = self.project_board(project_id)
        current = self.get_work(project_id, kind, item_id)
        if kind == "epic":
            if status == "blocked":
                raise KanbanAdapterError(
                    "validation_error",
                    "canonical epics do not support a blocked state",
                    fields={"status": status},
                )
            epic_status = "done" if status == "done" else "active"
            try:
                raw = self.host.update_epic(
                    item_id,
                    status=epic_status,
                    board=board,
                )
                return self._work_record(raw, project_id=project_id, kind="epic")
            except Exception as exc:
                raise self._mapped_error(exc) from None
        target = {
            "backlog": "backlog",
            "in_progress": "ready",
            "in_review": "review",
            "done": "done",
            "blocked": "blocked",
        }.get(status)
        if target is None:
            raise KanbanAdapterError(
                "validation_error",
                "Dockyard work status is not supported by canonical Kanban",
                fields={"status": status},
            )
        try:
            current_status = current["status"]
            if target == "done" and current_status in {"backlog", "triage", "todo"}:
                self.host.transition_task(item_id, "ready", board=board)
            options: dict[str, Any] = {"board": board}
            if target == "review":
                options["force_review"] = True
            raw = self.host.transition_task(item_id, target, **options)
            return self._work_record(raw, project_id=project_id, kind=kind)
        except Exception as exc:
            raise self._mapped_error(exc) from None

    def link_work(
        self,
        project_id: str,
        parent_id: str,
        child_id: str,
    ) -> dict[str, Any]:
        board = self.project_board(project_id)
        try:
            return dict(self.host.link_tasks(parent_id, child_id, board=board))
        except Exception as exc:
            raise self._mapped_error(exc) from None

    def add_card(self, board_id: str, card: BoardCard) -> str:
        project_id = self._board_projects.get(board_id)
        if project_id is None:
            raise KanbanAdapterError(
                "project_board_mismatch",
                "canonical board must be bound before work is created",
                fields={"board_slug": board_id},
            )
        status = self._status_for_column(card.column)
        try:
            task = self.host.create_task(
                title=card.title,
                body=card.description,
                created_by="dockyard",
                project_id=project_id,
                task_kind="task",
                initial_status="backlog",
                idempotency_key=self._idempotency_key(board_id, card),
                board=board_id,
            )
            current_status = task.get("status", task.get("initial_status"))
            if current_status != status:
                options: dict[str, Any] = {"board": board_id}
                if status == "review":
                    options["force_review"] = True
                task = self.host.transition_task(
                    str(task.get("id") or ""),
                    status,
                    **options,
                )
        except Exception as exc:
            raise self._mapped_error(exc) from None
        task_id = task.get("id")
        if not task_id:
            raise KanbanAdapterError(
                "host_unavailable",
                "canonical project and Kanban host returned an invalid task",
            )
        return str(task_id)

    def move_card(self, board_id: str, card_id: str, column: str) -> None:
        if board_id not in self._board_projects:
            raise KanbanAdapterError(
                "project_board_mismatch",
                "canonical board must be bound before work is changed",
                fields={"board_slug": board_id},
            )
        status = self._status_for_column(column)
        options: dict[str, Any] = {"board": board_id}
        if status == "review":
            options["force_review"] = True
        try:
            envelope = self.host.get_task(card_id, board=board_id)
            task = envelope.get("task", envelope)
            current_status = task.get("status", task.get("initial_status"))
            if current_status == status:
                return
            if status == "done" and current_status in {"backlog", "triage", "todo"}:
                self.host.transition_task(card_id, "ready", board=board_id)
            self.host.transition_task(card_id, status, **options)
        except Exception as exc:
            raise self._mapped_error(exc) from None


def create_project_kanban_adapter(
    *,
    hermes_home: str | Path | None = None,
    board: str | None = None,
) -> ProjectKanbanHostAdapter:
    """Compose Dockyard against the active Hermes host implementation."""
    try:
        host_module = import_module("hermes_cli.project_kanban_host")
        constants_module = import_module("hermes_constants")
        host_type = getattr(host_module, "ProjectKanbanHost")
        resolved_home = (
            Path(hermes_home)
            if hermes_home is not None
            else Path(constants_module.get_hermes_home())
        )
    except Exception:
        raise KanbanAdapterError(
            "host_contract_unavailable",
            "canonical project and Kanban host is unavailable",
        ) from None
    host = host_type(hermes_home=resolved_home, board=board or "default")
    return ProjectKanbanHostAdapter(host)
