"""Real-host parents: they show, change and clear, and never become blockers.

Owner decision 4 = B (04/10/2026). On real Hermes a parent used to be written
as a Hermes dependency link, so the child waited for the parent; the details
view never showed the parent; changing it added a second link; clearing it
failed. Proven 03/10 on disposable real Hermes (evidence/kensei-link-probe/).
The plugin now keeps parents in its own store beside the boards
(kanban/work_parents.py). This drives the real services against the real
Hermes kanban, as the Desktop app does (fixture `real_host` in conftest.py);
every piece of state lives under tmp_path.
"""
from __future__ import annotations

from tests.r2_helpers import HUMAN


def test_parent_shows_changes_and_clears_and_never_links(real_host):
    world, pid = real_host
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


def test_a_real_dependency_still_blocks(real_host):
    """Explicit "blocked by" links are untouched: they stay Hermes links."""
    world, pid = real_host
    blocker = world.item(pid, "Blocker task")
    blocked = world.item(pid, "Blocked task")
    world.work.add_dependency(pid, blocked, blocker, actor=HUMAN)
    # Checked at the host: these rows are what make it a Hermes link. The
    # adapter's view of them is the Kanban lane's to shape (C2 reshapes it).
    rows = world.adapter.host.list_links(blocked)["items"]
    assert rows == [{"parent_task_id": blocker, "child_task_id": blocked}]
    assert world.work.detail(pid, blocked)["parent"] is None  # a blocker is not a parent
