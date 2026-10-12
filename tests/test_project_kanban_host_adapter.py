"""Contract tests for Project Stewardship's in-process ProjectKanbanHost adapter."""
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
    "update_task",
    "assign_task",
    "update_epic",
    "transition_task",
    "link_tasks",
    "unlink_tasks",
    "list_links",
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
        self.links: set[tuple[str, str]] = set()

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

    def update_task(self, task_id: str, **payload: Any) -> dict[str, Any]:
        if task_id not in self.tasks:
            raise FakeHostFailure("task_not_found")
        self.tasks[task_id].update(payload)
        return dict(self.tasks[task_id])

    def assign_task(
        self,
        task_id: str,
        profile: str | None,
        **payload: Any,
    ) -> dict[str, Any]:
        if task_id not in self.tasks:
            raise FakeHostFailure("task_not_found")
        self.tasks[task_id]["assignee"] = profile
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
        self.links.add((parent_task_id, child_task_id))
        return {
            "parent_task_id": parent_task_id,
            "child_task_id": child_task_id,
        }

    def unlink_tasks(
        self,
        parent_task_id: str,
        child_task_id: str,
        *,
        board: str | None = None,
    ) -> dict[str, str]:
        self.links.discard((parent_task_id, child_task_id))
        return {
            "parent_task_id": parent_task_id,
            "child_task_id": child_task_id,
        }

    def list_links(
        self,
        task_id: str,
        *,
        board: str | None = None,
        limit: int = 500,
    ) -> dict[str, list[dict[str, str]]]:
        # Same row shape as the real host (vanilla_host.list_links): one page
        # whose ``items`` are {parent_task_id, child_task_id} rows, the ones
        # that point AT the task first, then the ones that point away from it.
        # Recorded from a real Hermes in evidence/kensei-link-probe/.
        return {
            "items": [
                {"parent_task_id": parent, "child_task_id": child}
                for parent, child in sorted(self.links)
                if child == task_id
            ]
            + [
                {"parent_task_id": parent, "child_task_id": child}
                for parent, child in sorted(self.links)
                if parent == task_id
            ],
        }


def _adapter_type():
    adapter_type = getattr(kanban, "ProjectKanbanHostAdapter", None)
    assert adapter_type is not None, "Project Stewardship host adapter is not implemented"
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
    assert host.transition_calls[0] == (first, "ready", {"board": "alpha"})
    done_id, done_status, done_payload = host.transition_calls[1]
    assert (done_id, done_status, done_payload["board"]) == (first, "done", "alpha")
    # Hermes Kanban refuses evidence-free completions; the adapter must send one.
    assert done_payload["summary"].strip()
    assert len(host.transition_calls) == 2


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


def test_adapter_passes_parent_changes_through_for_epics_too():
    """Owner decision 4 = B: an epic's grouping parent changes and clears like a task's."""
    host = FakeProjectKanbanHost()
    adapter = _adapter_type()(host)
    outer = adapter.create_work("project-1", kind="epic", title="Outer", body=None,
                                assignee=None, created_by="sahil")
    inner = adapter.create_work("project-1", kind="epic", title="Inner", body=None,
                                assignee=None, created_by="sahil", parent_id=outer["id"])
    assert host.epics[inner["id"]]["parent_epic_id"] == outer["id"]
    adapter.update_work("project-1", "epic", inner["id"], title="Inner renamed")
    assert host.epics[inner["id"]]["parent_epic_id"] == outer["id"]  # untouched
    adapter.update_work("project-1", "epic", inner["id"], parent_id=None)
    assert host.epics[inner["id"]]["parent_epic_id"] is None
    task = adapter.create_work("project-1", kind="task", title="Child", body=None,
                               assignee=None, created_by="sahil", parent_id=outer["id"],
                               idempotency_key="dockyard:task:child")
    adapter.update_work("project-1", "task", task["id"], parent_id=None)
    assert host.tasks[task["id"]]["parent_task_id"] is None


def test_transition_work_uses_canonical_post_write_readback(monkeypatch):
    host = FakeProjectKanbanHost()
    adapter = _adapter_type()(host)
    task = adapter.create_work(
        "project-1", kind="task", title="Readback", body=None,
        assignee=None, created_by="sahil",
    )
    original = host.transition_task

    def stale_response(task_id, status, **payload):
        before = dict(host.tasks[task_id])
        original(task_id, status, **payload)
        return before

    monkeypatch.setattr(host, "transition_task", stale_response)
    moved = adapter.transition_work("project-1", "task", task["id"], "done")
    assert moved["status"] == "done"
    assert adapter.get_work("project-1", "task", task["id"])["status"] == "done"


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


# --- P1.7: factory fallback provenance, no fork injected ---


def test_factory_falls_back_to_vanilla_host_without_fork_module(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
):
    import sys

    from hermes_project_stewardship.kanban.host_adapter import (
        create_project_kanban_adapter,
    )

    pytest.importorskip("hermes_cli.kanban_db")
    monkeypatch.setenv("HERMES_KANBAN_HOME", str(tmp_path / "native-root"))
    monkeypatch.setitem(sys.modules, "hermes_cli.project_kanban_host", None)

    adapter = create_project_kanban_adapter(hermes_home=tmp_path / "hermes", board="demo")

    from hermes_project_stewardship.kanban import vanilla_host

    assert type(adapter.host).__module__ == vanilla_host.ProjectKanbanHost.__module__
    provenance = adapter.host_provenance
    assert provenance["host_module"] == vanilla_host.ProjectKanbanHost.__module__
    assert "ProjectKanbanHost(" in provenance["host_signature"]


def test_incomplete_host_module_is_rejected_and_recorded(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
):
    """P1.3 selection: a host-tree ProjectKanbanHost that predates the plugin contract
    (e.g. a fork without list_existing_projects) must never be selected; the
    plugin's vanilla host is used and the rejection is recorded in provenance.
    Regression for the onboarding-503 failure class on the KenseiAgent lane."""
    import sys
    import types

    from hermes_project_stewardship.kanban.host_adapter import (
        create_project_kanban_adapter,
    )
    from hermes_project_stewardship.kanban import vanilla_host

    pytest.importorskip("hermes_cli.kanban_db")
    monkeypatch.setenv("HERMES_KANBAN_HOME", str(tmp_path / "native-root"))

    class IncompleteHost:
        def __init__(self, *, hermes_home=None, board=None, **_kw):
            pass

        def capabilities(self):
            return {"contract_version": "0", "methods": ["list_tasks"]}

    fake = types.ModuleType("hermes_cli.project_kanban_host")
    setattr(fake, "ProjectKanbanHost", IncompleteHost)
    monkeypatch.setitem(sys.modules, "hermes_cli.project_kanban_host", fake)

    adapter = create_project_kanban_adapter(
        hermes_home=tmp_path / "hermes", board="demo")
    prov = adapter.host_provenance or {}
    assert type(adapter.host).__module__ == vanilla_host.ProjectKanbanHost.__module__
    assert prov["rejected_host_module"] == IncompleteHost.__module__

    board_id = adapter.ensure_board(
        adapter.host.provision_project(
            idempotency_key="vanilla-fallback",
            name="Vanilla Fallback",
            slug="vanilla-fallback",
            description="created through vanilla fallback",
            repo_path=str(tmp_path),
            lead_profile="default",
            board_slug="vanilla-fallback",
        )["project"]["id"],
        "vanilla-fallback",
    )
    task_id = adapter.add_card(
        board_id,
        kanban.BoardCard(
            title="Fallback task",
            description="created through vanilla fallback",
            column="todo",
            metadata={},
        ),
    )
    adapter.move_card(board_id, task_id, "done")
    assert adapter.host.get_task(task_id, board=board_id)["task"]["status"] == "done"


def test_factory_rejects_hostless_environment_cleanly(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
):
    """Without any Hermes host importable, the factory fails closed."""
    import subprocess
    import textwrap


    monkeypatch.setenv("HERMES_HOME", str(tmp_path / "empty"))

    child = textwrap.dedent(
        """
        from hermes_project_stewardship.kanban.host_adapter import (
            create_project_kanban_adapter,
        )
        try:
            create_project_kanban_adapter(board="demo")
            print("NO-ERROR")
        except Exception as exc:
            print(type(exc).__name__, getattr(exc, "code", ""))
        """
    )
    # Use the candidate venv (no Hermes host installed) so the child truly
    # lacks any host module; the factory must fail closed, not silently fall back.
    standalone_python = Path(__file__).resolve().parents[1] / ".venv" / "bin" / "python"
    result = subprocess.run(
        [str(standalone_python), "-c", child],
        capture_output=True, text=True, timeout=60,
        cwd=str(tmp_path),
        env={
            "PATH": "/usr/bin:/bin",
            "HOME": str(tmp_path),
            "HERMES_HOME": str(tmp_path / "empty"),
            "PYTHONPATH": str(Path(__file__).resolve().parents[1] / "src"),
        },
    )
    assert result.returncode == 0, result.stderr
    assert result.stdout.strip().startswith("KanbanAdapterError host_contract_unavailable")


# ---- link rows: the real host's shape, converted relative to the item ------------


def _link_adapter(host=None):
    host = host or FakeProjectKanbanHost()
    return host, _adapter_type()(host)


def test_list_work_links_converts_real_host_rows_relative_to_the_item_asked_about():
    host, adapter = _link_adapter()
    # first -> task -> after, three plain blocking links: "first" blocks "task"
    # (direction parent, from task's side) and "task" blocks "after".
    host.links.update({("t_first", "t_task"), ("t_task", "t_after")})

    assert adapter.list_work_links("project-1", "t_task") == [
        {"direction": "parent", "task_id": "t_first"},
        {"direction": "child", "task_id": "t_after"},
    ]
    assert adapter.list_work_links("project-1", "t_first") == [
        {"direction": "child", "task_id": "t_task"},
    ]
    assert adapter.list_work_links("project-1", "t_after") == [
        {"direction": "parent", "task_id": "t_task"},
    ]


def test_list_work_links_passes_through_rows_already_in_direction_form():
    class DirectionHost(FakeProjectKanbanHost):
        def list_links(self, task_id, *, board=None, limit=500):
            return {
                "items": [
                    {"direction": "parent", "task_id": "t_a"},
                    {"direction": "child", "task_id": "t_b"},
                ]
            }

    _, adapter = _link_adapter(DirectionHost())
    assert adapter.list_work_links("project-1", "t_x") == [
        {"direction": "parent", "task_id": "t_a"},
        {"direction": "child", "task_id": "t_b"},
    ]


def test_list_work_links_accepts_both_row_forms_in_one_page_and_an_empty_page():
    class MixedHost(FakeProjectKanbanHost):
        def list_links(self, task_id, *, board=None, limit=500):
            return {
                "items": [
                    {"direction": "parent", "task_id": "t_a"},
                    {"parent_task_id": task_id, "child_task_id": "t_b"},
                ]
            }

    _, adapter = _link_adapter(MixedHost())
    assert adapter.list_work_links("project-1", "t_x") == [
        {"direction": "parent", "task_id": "t_a"},
        {"direction": "child", "task_id": "t_b"},
    ]
    # A task with no links is a genuinely empty list, not an error.
    _, adapter = _link_adapter()
    assert adapter.list_work_links("project-1", "t_none") == []


@pytest.mark.parametrize(
    "row",
    [
        {"foo": "bar"},
        {},
        {"parent_task_id": "t_a"},
        {"child_task_id": "t_a"},
        # a link row that is not about the item asked about
        {"parent_task_id": "t_a", "child_task_id": "t_b"},
        # a link from the item to itself is not a valid dependency
        {"parent_task_id": "t_x", "child_task_id": "t_x"},
        {"parent_task_id": "", "child_task_id": "t_x"},
        {"parent_task_id": None, "child_task_id": "t_x"},
        {"direction": "sideways", "task_id": "t_a"},
        {"direction": "parent"},
        {"direction": "parent", "task_id": ""},
        {"direction": "parent", "task_id": "t_a", "parent_task_id": "t_a", "child_task_id": "t_x"},
        "t_a",
        ["t_a", "t_x"],
        None,
    ],
)
def test_list_work_links_raises_on_any_row_shape_it_does_not_know(row):
    class OddHost(FakeProjectKanbanHost):
        def list_links(self, task_id, *, board=None, limit=500):
            return {"items": [row]}

    _, adapter = _link_adapter(OddHost())
    with pytest.raises(_adapter_error_type()) as exc:
        adapter.list_work_links("project-1", "t_x")
    assert exc.value.code == "host_link_shape_invalid"
    # redacted: the message never echoes row values
    assert "t_a" not in str(exc.value)


@pytest.mark.parametrize(
    "page",
    [
        {"dependencies": [], "dependents": []},  # a shape no real host returns
        {},
        {"items": None},
        {"items": "t_a"},
        {"items": {"t_a": 1}},
        [],
        None,
    ],
)
def test_list_work_links_raises_when_the_page_is_not_a_page_of_rows(page):
    class OddHost(FakeProjectKanbanHost):
        def list_links(self, task_id, *, board=None, limit=500):
            return page

    _, adapter = _link_adapter(OddHost())
    with pytest.raises(_adapter_error_type()) as exc:
        adapter.list_work_links("project-1", "t_x")
    assert exc.value.code == "host_link_shape_invalid"


def test_list_work_links_refuses_a_page_that_says_more_links_exist():
    class MoreHost(FakeProjectKanbanHost):
        def list_links(self, task_id, *, board=None, limit=500):
            return {
                "items": [{"parent_task_id": "t_a", "child_task_id": task_id}],
                "has_more": True,
            }

    _, adapter = _link_adapter(MoreHost())
    with pytest.raises(_adapter_error_type()) as exc:
        adapter.list_work_links("project-1", "t_x")
    assert exc.value.code == "host_link_shape_invalid"


def test_list_work_links_still_maps_host_failures_to_the_stable_codes():
    class MissingHost(FakeProjectKanbanHost):
        def list_links(self, task_id, *, board=None, limit=500):
            raise FakeHostFailure("task_not_found")

    _, adapter = _link_adapter(MissingHost())
    with pytest.raises(_adapter_error_type()) as exc:
        adapter.list_work_links("project-1", "t_x")
    assert exc.value.code == "task_not_found"


# ---- approval binds the project's own board, or is not committed; the ------
# ---- Implement card can carry an owner the host will run (appletechie) ----.


def _approval_client(tmp_path: Path, host: FakeProjectKanbanHost):
    from fastapi.testclient import TestClient

    from hermes_project_stewardship.api.server import create_app
    from hermes_project_stewardship.persistence.store import Store

    app = create_app(
        Store(tmp_path / "dockyard.sqlite"),
        kanban_adapter=_adapter_type()(host),
        auth_token="test-token",
        auth_principal="owner",
        auth_principal_is_human=True,
    )
    svc = app.state.svc
    svc.enable("project-1", mission="keep it green", lead_profile="lead",
               member_profiles=[], autonomy_level=2)
    ref = svc.propose_initiative(
        "project-1", title="Fix flaky CI", rationale="3 flakes in 30d")["ref"]
    client = TestClient(app, headers={"Authorization": "Bearer test-token"})
    return client, svc, ref


@pytest.mark.parametrize("board_slug", ["", "ghost"])
def test_approval_is_not_committed_when_the_project_board_cannot_be_bound(
    tmp_path: Path, board_slug: str,
):
    """Production 0.3/0.4: approving committed first, then binding fell back to
    "<project>-ops" (no such board) and left the initiative approved but
    unbound. The board is now resolved and verified before the approval."""
    host = FakeProjectKanbanHost()
    host.projects["project-1"]["board_slug"] = board_slug
    client, svc, ref = _approval_client(tmp_path, host)

    response = client.post(f"/stewardship/v1/initiatives/{ref}/approve", json={})

    assert response.status_code == 409, response.text
    assert "board" in response.text
    assert "project-1-ops" not in response.text
    assert svc.initiative_by_ref(ref)["status"] == "pending_approval"
    assert svc.initiative_by_ref(ref)["board_slug"] is None
    assert host.create_calls == []


def test_approval_binds_the_hosts_board_and_records_canonical_bindings(tmp_path: Path):
    client, svc, ref = _approval_client(tmp_path, FakeProjectKanbanHost())

    response = client.post(f"/stewardship/v1/initiatives/{ref}/approve", json={})

    assert response.status_code == 200, response.text
    assert response.json()["board_slug"] == "alpha"
    assert svc.initiative_by_ref(ref)["status"] == "executing"
    work = client.get("/stewardship/v1/projects/project-1/work-items").json()["work_items"]
    assert sorted(item["ref"] for item in work if item["initiative_ref"] == ref) == sorted(
        response.json()["work_item_refs"])


def test_bind_board_route_records_canonical_bindings(tmp_path: Path):
    """The bind-board route created cards without canonical work bindings, so
    reconciliation and the work-items view could not see them."""
    client, svc, ref = _approval_client(tmp_path, FakeProjectKanbanHost())
    svc.approve_initiative(ref, actor="owner", interface="cli")

    response = client.post(f"/stewardship/v1/initiatives/{ref}/bind-board", json={})

    assert response.status_code == 200, response.text
    card_ids = response.json()["card_ids"]
    assert card_ids
    work = client.get("/stewardship/v1/projects/project-1/work-items").json()["work_items"]
    assert sorted(item["ref"] for item in work if item["initiative_ref"] == ref) == sorted(card_ids)


def test_bind_board_route_refuses_a_board_the_project_is_not_bound_to(tmp_path: Path):
    client, svc, ref = _approval_client(tmp_path, FakeProjectKanbanHost())
    svc.approve_initiative(ref, actor="owner", interface="cli")

    response = client.post(f"/stewardship/v1/initiatives/{ref}/bind-board",
                           json={"board_slug": "someone-elses"})

    assert response.status_code == 409, response.text
    assert svc.initiative_by_ref(ref)["status"] == "approved"
    assert svc.initiative_by_ref(ref)["board_slug"] is None


class TeamHost(FakeProjectKanbanHost):
    def list_profiles(self):
        return [{"name": "default", "is_default": True},
                {"name": "coder", "is_default": False},
                {"name": "idle", "is_default": False}]


def test_approval_assigns_only_the_implement_card(tmp_path: Path):
    """Bound cards were always unassigned, and governance forbids unassigned
    cards; the fleet assigned the Implement card by hand afterwards."""
    host = TeamHost()
    client, svc, ref = _assign_client(tmp_path, host)

    response = client.post(f"/stewardship/v1/initiatives/{ref}/approve",
                           json={"assignee": "coder"})

    assert response.status_code == 200, response.text
    assert [call["assignee"] for call in host.create_calls] == ["coder", None, None]
    assert host.create_calls[0]["title"].startswith("Implement:")


def test_an_unknown_assignee_is_refused_before_the_approval(tmp_path: Path):
    host = TeamHost()
    client, svc, ref = _assign_client(tmp_path, host)

    response = client.post(f"/stewardship/v1/initiatives/{ref}/approve",
                           json={"assignee": "ghost"})

    assert response.status_code == 409, response.text
    assert "ghost" in response.text
    assert svc.initiative_by_ref(ref)["status"] == "pending_approval"
    assert host.create_calls == []


def test_assignee_must_be_dispatchable_when_the_host_says(tmp_path: Path):
    class DispatchHost(TeamHost):
        def list_dispatchable_profiles(self):
            return [{"name": "coder"}]

    host = DispatchHost()
    client, svc, ref = _assign_client(tmp_path, host)
    svc.approve_initiative(ref, actor="owner", interface="cli")

    refused = client.post(f"/stewardship/v1/initiatives/{ref}/bind-board",
                          json={"assignee": "idle"})
    assert refused.status_code == 409, refused.text
    assert host.create_calls == []

    bound = client.post(f"/stewardship/v1/initiatives/{ref}/bind-board",
                        json={"assignee": "coder"})
    assert bound.status_code == 200, bound.text
    assert host.create_calls[0]["assignee"] == "coder"


def test_vanilla_host_narrows_profiles_by_the_dispatchers_allowlist(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch,
):
    import contextlib
    import types

    from hermes_project_stewardship.kanban.vanilla_host import ProjectKanbanHost

    for name in ("coder", "idle"):
        (tmp_path / "profiles" / name).mkdir(parents=True)
    allowlist: dict = {"value": frozenset({"coder"})}
    constants = types.ModuleType("hermes_constants")
    setattr(constants, "set_hermes_home_override", lambda home: None)
    setattr(constants, "reset_hermes_home_override", lambda token: None)
    kanban_db = types.ModuleType("hermes_cli.kanban_db")
    setattr(kanban_db, "scoped_current_board", lambda board: contextlib.nullcontext())
    dispatch = types.ModuleType("hermes_cli.kanban_db_dispatch")
    setattr(dispatch, "_dispatch_profile_allowlist", lambda normalize: allowlist["value"])
    profiles = types.ModuleType("hermes_cli.profiles")
    setattr(profiles, "normalize_profile_name", str.lower)
    cli = types.ModuleType("hermes_cli")
    for attr, module in (("kanban_db", kanban_db), ("projects_db", types.ModuleType("p"))):
        setattr(cli, attr, module)
    for name, module in (("hermes_constants", constants), ("hermes_cli", cli),
                         ("hermes_cli.kanban_db", kanban_db),
                         ("hermes_cli.kanban_db_dispatch", dispatch),
                         ("hermes_cli.profiles", profiles)):
        monkeypatch.setitem(sys.modules, name, module)
    host = ProjectKanbanHost(hermes_home=tmp_path)

    assert [p["name"] for p in host.list_dispatchable_profiles()] == ["coder"]
    allowlist["value"] = None  # no kanban.dispatch_profiles: every profile runs
    assert [p["name"] for p in host.list_dispatchable_profiles()] == ["default", "coder", "idle"]
