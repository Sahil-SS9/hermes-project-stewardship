"""Real-host parents: they show, change and clear, and never become blockers.

Owner decision 4 = B (04/10/2026). On real Hermes a parent used to be written
as a Hermes dependency link, so the child waited for the parent; the details
view never showed the parent; changing it added a second link; clearing it
failed. Proven 03/10 on disposable real Hermes (evidence/kensei-link-probe/).
The plugin now keeps parents in its own store beside the boards
(kanban/work_parents.py). This drives the real services against the real
Hermes kanban, as the Desktop app does; every piece of state lives under
tmp_path.
"""
from __future__ import annotations

import os

import pytest

from hermes_project_stewardship.kanban.host_adapter import create_project_kanban_adapter
from hermes_project_stewardship.persistence.store import Store

from tests.r2_helpers import HUMAN, World


@pytest.fixture
def real(tmp_path, monkeypatch):
    try:
        import hermes_cli.kanban_db  # noqa: F401
    except ImportError:
        if os.environ.get("STEWARD_REQUIRE_NATIVE_HOST") == "1":
            pytest.fail("Native host lane requires a real pinned Hermes runtime")
        pytest.skip("optional native Hermes runtime not installed")
    # This test owns only tmp_path state: clear the orchestration child marker
    # so Hermes' write guard does not mistake it for a live delegated write.
    monkeypatch.delenv("HERMES_DELEGATED_CHILD_CONTEXT", raising=False)
    try:
        import agent.delegation_context as delegation_context

        monkeypatch.setattr(delegation_context, "is_delegated_child_process_context", lambda: False)
    except ImportError:
        pass
    for key in ("HERMES_KANBAN_DB", "HERMES_KANBAN_BOARD", "HERMES_KANBAN_TASK",
                "HERMES_KANBAN_WORKSPACES_ROOT", "HERMES_TENANT"):
        monkeypatch.delenv(key, raising=False)
    home = tmp_path / "hermes-home"
    monkeypatch.setenv("HERMES_KANBAN_HOME", str(tmp_path / "kanban-root"))
    monkeypatch.setenv("HERMES_HOME", str(home))
    adapter = create_project_kanban_adapter(hermes_home=home)
    assert adapter.host_provenance["host_module"].endswith("vanilla_host")  # the real host
    native = adapter.host.provision_project(
        idempotency_key="real-parents", name="Parents", slug="parents",
        board_slug="default", description="disposable parent lane",
        lead_profile="default", repo_path=str(tmp_path),
    )
    project_id = str(native["project"]["id"])
    store = Store(tmp_path / "dockyard.db")
    world = World(store, None, adapter=adapter)
    world.project(project_id)
    try:
        yield world, project_id
    finally:
        store.close()


def test_parent_shows_changes_and_clears_and_never_links(real):
    world, pid = real
    epic_one = world.work.create_item(pid, "epic", "Parent epic one", actor=HUMAN)["ref"]
    epic_two = world.work.create_item(pid, "epic", "Parent epic two", actor=HUMAN)["ref"]
    child = world.work.create_item(pid, "task", "Child task", actor=HUMAN, parent_ref=epic_one)["ref"]

    def parent_of(ref):
        return (world.work.detail(pid, ref)["parent"] or {}).get("ref")

    def children_of(ref):
        return [row["ref"] for row in world.work.detail(pid, ref)["children"]]

    assert parent_of(child) == epic_one
    assert children_of(epic_one) == [child]
    assert world.adapter.list_work_links(pid, child) == []

    world.work.update_item(pid, child, actor=HUMAN, parent_ref=epic_two, reason="moved to epic two")
    assert parent_of(child) == epic_two
    assert children_of(epic_one) == []
    assert children_of(epic_two) == [child]
    assert world.adapter.list_work_links(pid, child) == []

    world.work.update_item(pid, child, actor=HUMAN, parent_ref=None, reason="no longer grouped")
    assert parent_of(child) is None
    assert children_of(epic_two) == []
    assert world.adapter.list_work_links(pid, child) == []


def test_a_real_dependency_still_blocks(real):
    """Explicit "blocked by" links are untouched: they stay Hermes links."""
    world, pid = real
    blocker = world.item(pid, "Blocker task")
    blocked = world.item(pid, "Blocked task")
    world.work.add_dependency(pid, blocked, blocker, actor=HUMAN)
    rows = world.adapter.list_work_links(pid, blocked)
    assert rows == [{"parent_task_id": blocker, "child_task_id": blocked}]
    assert world.work.detail(pid, blocked)["parent"] is None  # a blocker is not a parent
