"""Contract tests for Dockyard's in-process ProjectKanbanHost adapter."""
from __future__ import annotations

from pathlib import Path
import sys
from typing import Any

import pytest

_CANDIDATE_SRC = Path(__file__).resolve().parents[1] / "src"
sys.path.insert(0, str(_CANDIDATE_SRC))

import hermes_project_stewardship.kanban as kanban

assert Path(kanban.__file__).resolve().is_relative_to(_CANDIDATE_SRC.resolve())


_REQUIRED = {
    "capabilities",
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


class FakeHostFailure(Exception):
    def __init__(self, code: str = "task_not_found") -> None:
        super().__init__("sqlite failure at /private/kanban.db")
        self.code = code


class FakeProjectKanbanHost:
    def __init__(self) -> None:
        self.projects = {
            "project-1": {
                "id": "project-1",
                "slug": "alpha-project",
                "board_slug": "alpha",
            }
        }
        self.boards = {
            "alpha": {
                "slug": "alpha",
                "project_id": "project-1",
            }
        }
        self.tasks: dict[str, dict[str, Any]] = {}
        self.epics: dict[str, dict[str, Any]] = {}
        self.by_key: dict[str, str] = {}
        self.create_calls: list[dict[str, Any]] = []
        self.transition_calls: list[tuple[str, str, dict[str, Any]]] = []
        self.provisioned: dict[str, dict[str, Any]] = {}

    def capabilities(self) -> dict[str, Any]:
        return {"contract_version": 2, "methods": sorted(_REQUIRED - {"capabilities"})}

    def get_project(self, project_id: str) -> dict[str, Any]:
        if project_id not in self.projects:
            raise FakeHostFailure("project_not_found")
        return dict(self.projects[project_id])

    def list_profiles(self) -> list[dict[str, Any]]:
        return [{"name": "default", "is_default": True}]

    def validate_project(self, **payload: Any) -> dict[str, Any]:
        return dict(payload)

    def provision_project(self, **payload: Any) -> dict[str, Any]:
        key = str(payload["idempotency_key"])
        if key in self.provisioned:
            return {**self.provisioned[key], "replayed": True}
        project_id = f"p-{payload['slug']}"
        result = {
            "status": "complete",
            "idempotency_key": key,
            "replayed": False,
            "project": {
                "id": project_id,
                "slug": payload["slug"],
                "name": payload["name"],
                "board_slug": payload["board_slug"],
            },
            "board": {
                "slug": payload["board_slug"],
                "project_id": project_id,
            },
        }
        self.provisioned[key] = result
        return result

    def get_board(self, board: str | None = None) -> dict[str, Any]:
        if not board or board not in self.boards:
            raise FakeHostFailure("board_not_found")
        return dict(self.boards[board])

    def get_task(self, task_id: str, *, board: str | None = None) -> dict[str, Any]:
        if task_id not in self.tasks:
            raise FakeHostFailure("task_not_found")
        return {"task": dict(self.tasks[task_id])}

    def list_tasks(self, *, board: str | None = None, limit: int = 100):
        return {"items": [dict(item) for item in self.tasks.values()]}

    def list_epics(self, *, board: str | None = None, limit: int = 100):
        return {"items": [dict(item) for item in self.epics.values()]}

    def get_epic(self, epic_id: str, *, board: str | None = None):
        if epic_id not in self.epics:
            raise FakeHostFailure("epic_not_found")
        return dict(self.epics[epic_id])

    def create_task(self, **payload: Any) -> dict[str, Any]:
        self.create_calls.append(dict(payload))
        key = payload["idempotency_key"]
        task_id = self.by_key.get(key)
        if task_id is None:
            task_id = f"t_{len(self.tasks) + 1}"
            self.by_key[key] = task_id
            self.tasks[task_id] = {"id": task_id, **payload}
        return dict(self.tasks[task_id])

    def transition_task(
        self,
        task_id: str,
        status: str,
        **payload: Any,
    ) -> dict[str, Any]:
        if task_id not in self.tasks:
            raise FakeHostFailure("task_not_found")
        self.transition_calls.append((task_id, status, dict(payload)))
        self.tasks[task_id]["initial_status"] = status
        self.tasks[task_id]["status"] = status
        return dict(self.tasks[task_id])

    def create_epic(self, **payload: Any) -> dict[str, Any]:
        epic_id = f"e_{len(self.epics) + 1}"
        self.epics[epic_id] = {"id": epic_id, **payload}
        return dict(self.epics[epic_id])

    def update_epic(self, epic_id: str, **payload: Any) -> dict[str, Any]:
        if epic_id not in self.epics:
            raise FakeHostFailure("epic_not_found")
        self.epics[epic_id].update(payload)
        return dict(self.epics[epic_id])

    def link_tasks(
        self,
        parent_task_id: str,
        child_task_id: str,
        *,
        board: str | None = None,
    ) -> dict[str, str]:
        return {
            "parent_task_id": parent_task_id,
            "child_task_id": child_task_id,
        }


def _adapter_type():
    adapter_type = getattr(kanban, "ProjectKanbanHostAdapter", None)
    assert adapter_type is not None, "Dockyard host adapter is not implemented"
    return adapter_type


def _adapter_error_type():
    error_type = getattr(kanban, "KanbanAdapterError", None)
    assert error_type is not None, "stable adapter error is not implemented"
    return error_type


def test_adapter_requires_exact_v1_host_capabilities():
    adapter_type = _adapter_type()
    error_type = _adapter_error_type()

    class OldHost(FakeProjectKanbanHost):
        def capabilities(self):
            return {
                "contract_version": 1,
                "methods": sorted(_REQUIRED - {"capabilities"}),
            }

    with pytest.raises(error_type) as exc:
        adapter_type(OldHost())
    assert exc.value.code == "host_contract_unavailable"
    assert "sqlite" not in str(exc.value).lower()

    class PartialHost(FakeProjectKanbanHost):
        def capabilities(self):
            return {"contract_version": 2, "methods": ["get_board"]}

    with pytest.raises(error_type) as exc:
        adapter_type(PartialHost())
    assert exc.value.code == "host_contract_unavailable"


def test_adapter_binds_existing_project_board_and_creates_canonical_task():
    adapter = _adapter_type()(FakeProjectKanbanHost())

    board_id = adapter.ensure_board("project-1", "alpha")
    card = kanban.BoardCard(
        title="Validate release",
        description="Run the canonical suite",
        column="review",
        metadata={"initiative_ref": "INIT-1", "step": 2},
    )
    task_id = adapter.add_card(board_id, card)

    assert board_id == "alpha"
    assert task_id == "t_1"
    call = adapter.host.create_calls[0]
    assert call["board"] == "alpha"
    assert call["project_id"] == "project-1"
    assert call["title"] == "Validate release"
    assert call["body"] == "Run the canonical suite"
    assert call["task_kind"] == "task"
    assert call["initial_status"] == "backlog"
    assert call["created_by"] == "dockyard"
    assert call["idempotency_key"].startswith("dockyard-card:")
    assert adapter.host.transition_calls == [
        (task_id, "review", {"board": "alpha", "force_review": True})
    ]


def test_adapter_card_creation_is_idempotent_and_move_uses_host_transition():
    host = FakeProjectKanbanHost()
    adapter = _adapter_type()(host)
    board_id = adapter.ensure_board("project-1", "alpha")
    card = kanban.BoardCard(
        title="Ship release",
        description="One canonical task",
        metadata={"initiative_ref": "INIT-2", "step": 1},
    )

    first = adapter.add_card(board_id, card)
    replay = adapter.add_card(board_id, card)
    adapter.move_card(board_id, first, "done")

    assert first == replay
    assert len(host.tasks) == 1
    assert host.transition_calls == [
        (first, "ready", {"board": "alpha"}),
        (first, "done", {"board": "alpha"}),
    ]


def test_adapter_exposes_project_scoped_canonical_work_service_operations():
    adapter = _adapter_type()(FakeProjectKanbanHost())

    task = adapter.create_work(
        "project-1",
        kind="bug",
        title="Canonical bug",
        body="Full task body",
        assignee="coder-bot",
        created_by="sahil",
        idempotency_key="dockyard:bug:1",
    )
    epic = adapter.create_work(
        "project-1",
        kind="epic",
        title="Canonical epic",
        body="Epic description",
        assignee=None,
        created_by="sahil",
    )

    assert task["kind"] == "bug"
    assert task["project_id"] == "project-1"
    assert epic["kind"] == "epic"
    assert {item["id"] for item in adapter.list_work("project-1")} == {
        task["id"],
        epic["id"],
    }
    assert adapter.get_work("project-1", "task", task["id"])["title"] == "Canonical bug"
    moved = adapter.transition_work(
        "project-1", "task", task["id"], "done"
    )
    assert moved["status"] == "done"


def test_adapter_fails_closed_and_redacts_host_errors():
    adapter = _adapter_type()(FakeProjectKanbanHost())
    error_type = _adapter_error_type()

    with pytest.raises(error_type) as exc:
        adapter.ensure_board("missing", "private")
    assert exc.value.code == "project_not_found"
    rendered = str(exc.value)
    assert "sqlite" not in rendered.lower()
    assert "/private" not in rendered

    with pytest.raises(error_type) as exc:
        adapter.add_card("unbound", kanban.BoardCard(title="x", description="y"))
    assert exc.value.code == "project_board_mismatch"


def test_adapter_against_real_project_kanban_host_isolated_home(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
):
    hermes_constants = pytest.importorskip("hermes_constants")
    kb = pytest.importorskip("hermes_cli.kanban_db")
    pdb = pytest.importorskip("hermes_cli.projects_db")
    host_module = pytest.importorskip("hermes_cli.project_kanban_host")

    process_root = tmp_path / "process-root"
    process_root.mkdir()
    monkeypatch.setenv("HERMES_HOME", str(process_root))

    isolated_root = tmp_path / "isolated-root"
    isolated_root.mkdir()
    token = hermes_constants.set_hermes_home_override(isolated_root)
    try:
        with pdb.connect_closing() as conn:
            project_id = pdb.create_project(
                conn,
                name="Alpha Project",
                slug="alpha-project",
                board_slug="alpha",
            )
        with kb.scoped_kanban_home(isolated_root):
            kb.create_board("alpha", name="Alpha Board", project_id=project_id)
    finally:
        hermes_constants.reset_hermes_home_override(token)

    host = host_module.ProjectKanbanHost(
        hermes_home=isolated_root,
        board="alpha",
    )
    adapter = _adapter_type()(host)
    board_id = adapter.ensure_board(project_id, "alpha")
    task_id = adapter.add_card(
        board_id,
        kanban.BoardCard(
            title="Canonical adapter task",
            description="Stored only in the isolated Hermes home",
            column="todo",
            metadata={"initiative_ref": "INIT-real", "step": 1},
        ),
    )
    replay = adapter.add_card(
        board_id,
        kanban.BoardCard(
            title="Canonical adapter task",
            description="Stored only in the isolated Hermes home",
            column="todo",
            metadata={"initiative_ref": "INIT-real", "step": 1},
        ),
    )
    adapter.move_card(board_id, task_id, "done")

    assert replay == task_id
    assert host.get_task(task_id)["task"]["status"] == "done"
    assert (isolated_root / "kanban" / "boards" / "alpha" / "kanban.db").is_file()
    assert not (process_root / "kanban" / "boards" / "alpha").exists()


def test_create_app_composes_canonical_host_adapter_by_default(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
):
    from hermes_project_stewardship.api import server as api_server
    from hermes_project_stewardship.persistence.store import Store

    expected = _adapter_type()(FakeProjectKanbanHost())
    calls: list[str] = []

    def build_adapter():
        calls.append("called")
        return expected

    monkeypatch.setattr(
        api_server,
        "create_project_kanban_adapter",
        build_adapter,
        raising=False,
    )
    app = api_server.create_app(Store(tmp_path / "dockyard.sqlite"))

    assert calls == ["called"]
    assert app.state.kanban_adapter is expected
    assert app.state.kanban_bridge.adapter is expected
