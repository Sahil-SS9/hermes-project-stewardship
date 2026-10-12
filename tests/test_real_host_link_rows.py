"""Real-host link rows: the details view and the roadmap blockers must see them.

The stand-in hosts return link rows as ``{direction, task_id}``; the real
Hermes host (the plugin's built-in ``vanilla_host``, which both upstream and
Sahil's live KenseiAgent select) returns ``{parent_task_id, child_task_id}``.
Services that read only the stand-in shape saw no links on a real install:
the details view listed no dependencies and the roadmap listed no blockers.
Recorded in evidence/kensei-link-probe/ (probe.py, README.md).

Like test_phase5_vanilla_execution_lane.py, the only host loaded is the pinned
upstream checkout and every piece of state lives under tmp_path.
"""
from __future__ import annotations


import pytest

from hermes_project_stewardship.kanban.host_adapter import create_project_kanban_adapter
from hermes_project_stewardship.persistence.store import Store

from .hermes_source import require_hermes_tree
from .r2_helpers import HUMAN, World


@pytest.fixture
def real(tmp_path, monkeypatch):
    vanilla = require_hermes_tree()
    # This test owns only tmp_path state: clear the orchestration child marker
    # so vanilla's write guard does not mistake it for a live delegated write.
    monkeypatch.delenv("HERMES_DELEGATED_CHILD_CONTEXT", raising=False)
    try:
        import agent.delegation_context as delegation_context

        monkeypatch.setattr(
            delegation_context, "is_delegated_child_process_context", lambda: False
        )
    except ImportError:
        pass
    monkeypatch.syspath_prepend(str(vanilla))
    home = tmp_path / "hermes-home"
    # Pin BOTH roots to tmp_path (kanban_db resolves HERMES_KANBAN_HOME first),
    # and drop any inherited board overrides.
    for key in ("HERMES_KANBAN_DB", "HERMES_KANBAN_BOARD", "HERMES_KANBAN_TASK",
                "HERMES_KANBAN_WORKSPACES_ROOT", "HERMES_TENANT"):
        monkeypatch.delenv(key, raising=False)
    monkeypatch.setenv("HERMES_KANBAN_HOME", str(tmp_path / "kanban-root"))
    monkeypatch.setenv("HERMES_HOME", str(home))

    adapter = create_project_kanban_adapter(hermes_home=home)
    # The real, built-in host: not a stand-in.
    assert adapter.host_provenance["host_module"].endswith("vanilla_host")
    native = adapter.host.provision_project(
        idempotency_key="real-link-rows", name="Links", slug="links",
        board_slug="default", description="disposable link-row lane",
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


def _refs(rows):
    return [row["ref"] for row in rows]


def test_the_real_host_returns_the_parent_child_row_shape_and_the_adapter_converts_it(real):
    world, pid = real
    blocker = world.item(pid, "Blocker task")
    blocked = world.item(pid, "Blocked task")
    world.work.add_dependency(pid, blocked, blocker, actor=HUMAN)

    # What the real host itself returns (the thing the old stand-ins hid) ...
    raw = world.adapter.host.list_links(blocked, board=world.adapter.project_board(pid))
    assert raw["items"] == [{"parent_task_id": blocker, "child_task_id": blocked}]
    # ... and what the adapter hands to the services.
    assert world.adapter.list_work_links(pid, blocked) == [
        {"direction": "parent", "task_id": blocker}
    ]
    assert world.adapter.list_work_links(pid, blocker) == [
        {"direction": "child", "task_id": blocked}
    ]


def test_details_view_lists_a_real_dependency_in_both_directions(real):
    world, pid = real
    blocker = world.item(pid, "Blocker task")
    blocked = world.item(pid, "Blocked task")
    world.work.add_dependency(pid, blocked, blocker, actor=HUMAN)

    assert _refs(world.work.detail(pid, blocked)["dependencies"]) == [blocker]
    assert world.work.detail(pid, blocked)["dependents"] == []
    assert _refs(world.work.detail(pid, blocker)["dependents"]) == [blocked]
    assert world.work.detail(pid, blocker)["dependencies"] == []


def test_roadmap_milestone_items_list_the_real_blocker(real):
    world, pid = real
    milestone = world.milestone(pid, "Pilot")
    objective = world.objective(pid, "Ship the pilot")
    goal = world.goal(pid, "Pilot goal")
    world.place_objective(pid, objective, milestone)
    world.place_goal(pid, goal, objective)
    blocker = world.item(pid, "Blocker task")
    blocked = world.item(pid, "Blocked task")
    world.place_task(pid, blocked, goal)
    world.work.add_dependency(pid, blocked, blocker, actor=HUMAN)

    items = {i["ref"]: i for i in world.roadmap.milestone_items(pid, milestone)["items"]}
    # [] would read as "nothing is blocking this"; it must name the blocker.
    assert items[blocked]["blockers"] == [blocker]


def test_the_dependency_map_shows_real_links_with_the_linked_items_type(real):
    """The Kanban board's chips come from explicit blocking links only."""
    world, pid = real
    bug = world.work.create_item(pid, "bug", "Login crash", actor=HUMAN)["ref"]
    blocker = world.item(pid, "Blocker task")
    task = world.item(pid, "Ship the release")
    world.work.add_dependency(pid, task, bug, actor=HUMAN)
    world.work.add_dependency(pid, task, blocker, actor=HUMAN)

    deps = world.work.dependency_map(pid)

    assert sorted((c["ref"], c["type"]) for c in deps[task]["blocked_by"]) == sorted(
        [(bug, "bug"), (blocker, "task")]
    )
    assert [c["ref"] for c in deps[bug]["blocks"]] == [task]
    assert [c["ref"] for c in deps[blocker]["blocks"]] == [task]
    assert deps[task]["blocks"] == []
