"""Batch R2 test helpers: a small real-service world for Roadmap tests.

Everything goes through the real services (``StewardshipService``,
``CanonicalWorkService`` over the reference host, ``DockyardService``) so the
read model is exercised against the same rows production code writes.
"""
from __future__ import annotations

from hermes_project_stewardship.dockyard import Actor, ActorKind
from hermes_project_stewardship.kanban import ReferenceKanbanAdapter
from hermes_project_stewardship.persistence.canonical_work_service import (
    CanonicalWorkService,
)
from hermes_project_stewardship.persistence.dockyard_service import DockyardService
from hermes_project_stewardship.persistence.roadmap_service import RoadmapService
from hermes_project_stewardship.persistence.service import StewardshipService

HUMAN = Actor(id="owner", display_name="owner", kind=ActorKind.HUMAN)


class World:
    """One store, one reference host, every service wired like create_app."""

    def __init__(self, store, clock, adapter=None) -> None:
        self.store = store
        self.clock = clock
        self.adapter = adapter or ReferenceKanbanAdapter(store)
        self.svc = StewardshipService(store, clock=clock)
        self.work = CanonicalWorkService(store, self.adapter)
        self.dy = DockyardService(store, canonical_work=self.work)
        self.roadmap = RoadmapService(
            store, self.svc, self.work, clock=clock)

    # -- projects -----------------------------------------------------
    def project(self, pid: str) -> str:
        # Raise the open-initiative cap through its documented policy knob:
        # Roadmap tests need many initiatives per project.
        self.svc.enable(pid, mission=f"{pid} mission", lead_profile="lead",
                        member_profiles=["coder"], autonomy_level=2,
                        verification_policy={"max_open_initiatives": 50})
        return pid

    # -- initiatives --------------------------------------------------
    def initiative(self, pid: str, title: str, *, status: str | None = None,
                   requires_approval: bool = False) -> str:
        ini = self.svc.propose_initiative(
            pid, title=title, rationale=f"because {title}",
            requires_approval=requires_approval)
        if status is not None:
            with self.store.tx() as cx:
                cx.execute("UPDATE project_initiatives SET status=? WHERE ref=?",
                           (status, ini["ref"]))
        return ini["ref"]

    # -- milestones ---------------------------------------------------
    def milestone(self, pid: str, name: str, *, due: str | None = None) -> int:
        return self.dy.milestone_create(pid, name, due=due, actor=HUMAN)

    # -- work ---------------------------------------------------------
    def item(self, pid: str, title: str, *, status: str = "backlog",
             initiative: str | None = None, milestone: str | None = None) -> str:
        created = self.work.create_item(pid, "task", title, actor=HUMAN)
        ref = created["ref"]
        if status != "backlog":
            self.adapter.transition_work(pid, "task", ref, status)
        if initiative is not None:
            self.work.metadata.set_initiative(pid, "task", ref, initiative)
        if milestone is not None:
            self.dy.milestone_attach(pid, milestone, ref, actor=HUMAN)
        return ref

    # -- objectives / goals ------------------------------------------
    def objective(self, pid: str, name: str, *, state: str | None = None) -> int:
        oid = int(self.svc.add_objective(
            pid, name=name, evaluator_type="manual", target=">=1",
            actor="owner", interface="test")["id"])
        if state in ("passed", "failed"):
            self.svc.record_assessment(
                pid, oid, passed=(state == "passed"), evidence=["ticket:1"],
                actor="owner", interface="dockyard:human",
                trusted_principal="owner")
        elif state == "stale":
            self.svc.record_assessment(
                pid, oid, passed=True, evidence=["ticket:1"],
                actor="owner", interface="dockyard:human",
                trusted_principal="owner",
                expires_at="2026-08-20T00:00:00+00:00")
        return oid

    def goal(self, pid: str, title: str, objective_ids=()) -> str:
        return self.svc.create_goal(
            pid, title=title, objective_ids=list(objective_ids),
            actor="owner", interface="test")["goal_id"]

    # -- links --------------------------------------------------------
    def link_milestone(self, pid, ref, milestone_id, relationship="delivers"):
        return self.roadmap.link_initiative_milestone(
            pid, ref, milestone_id, relationship, actor="owner")

    def link_objective(self, pid, objective_id, ref, relationship="supports"):
        return self.roadmap.link_objective_initiative(
            pid, objective_id, ref, relationship, actor="owner")

    # -- read-model navigation ---------------------------------------
    def outline(self, pid: str):
        data = self.roadmap.roadmap(pid)
        assert [p["id"] for p in data["projects"]] == [pid]
        return data["projects"][0]


def find(rows, **match):
    """First row whose keys equal ``match`` (assert-friendly)."""
    for row in rows:
        if all(row.get(k) == v for k, v in match.items()):
            return row
    raise AssertionError(f"no row matching {match!r} in {rows!r}")
