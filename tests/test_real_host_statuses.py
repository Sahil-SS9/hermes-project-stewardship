"""Real-host statuses: every item reaches the board in one of its five columns.

On real Hermes the plugin saves a Backlog item as Hermes `triage`
(kanban/vanilla_host.py `_native_status`). Reading it back, the work service
did not translate `triage`, so every new task and epic reached the Kanban
screen as "triage", a status none of its columns lists: the board put them all
in its "Other states" catch-all and Backlog stayed empty. The practice server's
sample board never produces `triage`, so no fake-backed test could see it.
Proven 04/10/2026 on disposable upstream Hermes (evidence/c/C2/other-states-probe/).
"""
from __future__ import annotations

from tests.r2_helpers import HUMAN


def test_new_task_and_epic_read_back_as_backlog(real_host):
    world, pid = real_host
    task = world.work.create_item(pid, "task", "New task", actor=HUMAN)["ref"]
    epic = world.work.create_item(pid, "epic", "New epic", actor=HUMAN)["ref"]
    rows = {row["ref"]: row for row in world.work.list(pid)}
    assert rows[task]["canonical_status"] == "triage"  # what Hermes stores
    assert rows[task]["status"] == "backlog"  # what the board receives
    assert rows[epic]["status"] == "backlog"
    assert world.work.get(pid, task)["status"] == "backlog"


def test_each_move_lands_in_a_board_column(real_host):
    world, pid = real_host
    seen = {}
    walker = world.work.create_item(pid, "task", "Walks the board", actor=HUMAN)["ref"]
    seen["new"] = world.work.get(pid, walker)["status"]
    for target in ("in_progress", "in_review", "done"):
        world.work.transition(pid, walker, target, actor=HUMAN)
        seen[target] = world.work.get(pid, walker)["status"]
    stuck = world.work.create_item(pid, "task", "Gets blocked", actor=HUMAN)["ref"]
    world.work.transition(pid, stuck, "in_progress", actor=HUMAN)
    world.work.transition(pid, stuck, "blocked", actor=HUMAN)
    seen["blocked"] = world.work.get(pid, stuck)["status"]
    assert seen == {
        "new": "backlog",
        "in_progress": "in_progress",
        "in_review": "in_review",
        "done": "done",
        "blocked": "blocked",
    }
