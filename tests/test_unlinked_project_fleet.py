"""One project Hermes does not know must not take the fleet pages down.

Found 10/10/2026 on Sahil's real data: two stewardship projects
(demo-project, payments-relaunch) have no matching project in Hermes, so
/portfolio and /dashboard raised "canonical project was not found" and the
Desktop Dashboard showed nothing but an error. A missing link now flags that
one project and raises an intervention for it; every other project still
reports, and an unavailable host still fails closed.
"""
from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from hermes_project_stewardship.api.server import create_app
from hermes_project_stewardship.kanban import KanbanAdapterError, ReferenceKanbanAdapter

from .r2_helpers import HUMAN, World

GHOST = "payments-relaunch"  # enabled in stewardship, unknown to Hermes


def test_real_host_fleet_pages_survive_a_project_hermes_does_not_know(real_host):
    world, pid = real_host
    stuck = world.work.create_item(pid, "task", "Stuck on review", actor=HUMAN)["ref"]
    world.work.transition(pid, stuck, "in_progress", actor=HUMAN)
    world.work.transition(pid, stuck, "blocked", actor=HUMAN)
    world.project(GHOST)

    portfolio = world.dy.portfolio()
    rows = {row["project_id"]: row for row in portfolio["projects"]}
    assert rows[GHOST]["status"] == "unlinked"
    assert rows[GHOST]["items"]["total"] == 0
    assert rows[pid]["status"] == "at_risk"  # the linked project still reports
    assert rows[pid]["items"]["blocked"] == 1

    causes = {(g["project"], g["cause"]): g for g in portfolio["groups"]["interventions"]}
    assert (pid, "blocked_item") in causes
    warning = causes[(GHOST, "unlinked_project")]
    assert warning["deep_link"] == f"s1:project/{GHOST}"
    assert warning["next_action"]

    dashboard = {row["id"]: row for row in world.dy.dashboard()["projects"]}
    assert dashboard[GHOST]["linked"] is False
    assert dashboard[pid]["linked"] is True
    assert dashboard[pid]["work"]["blocked"] == 1

    found = world.dy.fleet_search("payments")["results"]
    assert [hit["project"] for hit in found if hit["kind"] == "project"] == [GHOST]
    assert [hit["ref"] for hit in world.dy.fleet_search("stuck")["results"]] == [stuck]

    client = TestClient(create_app(world.store, kanban_adapter=world.adapter))
    for page in ("/stewardship/v1/portfolio", "/stewardship/v1/dashboard"):
        assert client.get(page).status_code == 200, page


class _HostMissing(ReferenceKanbanAdapter):
    """Reference host that fails GHOST's lookup with one Hermes error code."""

    def __init__(self, store, code: str) -> None:
        super().__init__(store)
        self.code = code

    def list_work(self, project_id: str):
        if project_id == GHOST:
            raise KanbanAdapterError(self.code, "host said no")
        return super().list_work(project_id)


def _world(store, clock, code: str) -> World:
    world = World(store, clock, adapter=_HostMissing(store, code))
    world.project("linked")
    world.project(GHOST)
    return world


def test_a_missing_board_is_a_missing_link_too(store, clock):
    rows = _world(store, clock, "board_not_found").dy.portfolio()["projects"]
    assert {row["project_id"]: row["status"] for row in rows}[GHOST] == "unlinked"


def test_an_unavailable_host_still_fails_closed(store, clock):
    world = _world(store, clock, "host_unavailable")
    for page in (world.dy.portfolio, world.dy.dashboard):
        with pytest.raises(KanbanAdapterError):
            page()
