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
        # v42 ladder: the one-parent placement writes, goal checks, needs-placing
        # queue and human delivery confirmation (Batch L).
        from hermes_project_stewardship.persistence.ladder_service import LadderService
        self.ladder = LadderService(
            store, self.svc, self.work, self.roadmap, clock=clock)

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

    # -- links (v42 delivery ladder: one parent per level) -------------------
    # The 0.4.0 link tables (initiative_milestones, project_objective_deliveries,
    # project_objective_goals) are history only. Placement is one set-parent call
    # per level; a parent_id of None unplaces the item.
    def place_task(self, pid, item_ref, goal_id):
        return self.ladder.set_task_goal(pid, item_ref, goal_id, actor="owner")

    def place_goal(self, pid, goal_id, objective_id):
        return self.ladder.set_goal_objective(pid, goal_id, objective_id, actor="owner")

    def place_objective(self, pid, objective_id, milestone_id):
        return self.ladder.set_objective_milestone(
            pid, objective_id, milestone_id, actor="owner")

    def place_milestone(self, pid, milestone_id, initiative_ref):
        return self.ladder.set_milestone_initiative(
            pid, milestone_id, initiative_ref, actor="owner")

    def confirm(self, pid, ref):
        return self.ladder.confirm_delivered(pid, ref, actor="owner")

    def ready_initiative(self, pid, title="Ready", *, status="executing"):
        """An executing initiative whose single milestone is fully reached.

        Builds milestone <- objective(passed check) <- goal <- one done task,
        so the initiative is `ready_to_confirm`. Returns the initiative ref.
        """
        ref = self.initiative(pid, title, status=status)
        mid = self.milestone(pid, "Release")
        self.place_milestone(pid, mid, ref)
        oid = self.objective(pid, "Obj", state="passed")
        self.place_objective(pid, oid, mid)
        gid = self.goal(pid, "Goal")
        self.place_goal(pid, gid, oid)
        self.place_task(pid, self.item(pid, "Task", status="done"), gid)
        return ref

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


def make_ready(app, project_id, ref):
    """Give an executing initiative a fully-reached ladder, using the APP's own
    services (so the in-memory kanban adapter the routes use sees the work).

    Builds milestone <- objective(passed check) <- goal <- one done task, so
    the initiative becomes `ready_to_confirm`. Required because a fresh
    ReferenceKanbanAdapter keeps work items in memory only — a second instance
    would not see them, so the routes' read of the ladder must go through the
    app's own CanonicalWorkService/LadderService.
    """
    return reach_ladder(project_id, ref, app.state.ladder,
                        app.state.canonical_work_service, app.state.svc)


def ladder_for(store, svc, adapter=None):
    """A LadderService and CanonicalWorkService sharing ONE in-memory adapter.

    Tests that build a ladder must create the work items through the same
    CanonicalWorkService the ladder reads: the reference adapter keeps items in
    memory, so a second instance would not see them.
    """
    from hermes_project_stewardship.kanban import ReferenceKanbanAdapter
    from hermes_project_stewardship.persistence.canonical_work_service import (
        CanonicalWorkService,
    )
    from hermes_project_stewardship.persistence.ladder_service import LadderService
    from hermes_project_stewardship.persistence.roadmap_service import RoadmapService

    adapter = adapter or ReferenceKanbanAdapter(store)
    work = CanonicalWorkService(store, adapter)
    return LadderService(store, svc, work, RoadmapService(store, svc, work)), work


def reach_ladder(project_id, ref, ladder, work, svc, *, actor="test-user"):
    """Build a fully-reached ladder: milestone <- objective(passed) <- goal <-
    one done task. Returns (milestone_id, objective_id, goal_id, task_ref)."""
    from hermes_project_stewardship.dockyard import Actor, ActorKind
    from hermes_project_stewardship.persistence.dockyard_service import DockyardService

    human = Actor(id=actor, display_name=actor, kind=ActorKind.HUMAN)
    dy = DockyardService(work.store, canonical_work=work)
    mid = dy.milestone_create(project_id, "Release", actor=human)
    ladder.set_milestone_initiative(project_id, mid, ref, actor=actor, interface="test")
    oid = int(svc.add_objective(project_id, name="Obj", evaluator_type="manual",
                                target=">=1", actor=actor, interface="test")["id"])
    svc.record_assessment(project_id, oid, passed=True, evidence=["t:1"], actor=actor,
                          interface="dockyard:human", trusted_principal=actor)
    ladder.set_objective_milestone(project_id, oid, mid, actor=actor, interface="test")
    gid = svc.create_goal(project_id, title="Goal", objective_ids=[oid],
                          actor=actor, interface="test")["goal_id"]
    ladder.set_goal_objective(project_id, gid, oid, actor=actor, interface="test")
    task = work.create_item(project_id, "task", "Task", actor=human)
    work.transition(project_id, task["ref"], "done", actor=human)
    ladder.set_task_goal(project_id, task["ref"], gid, actor=actor, interface="test")
    return mid, oid, gid, task["ref"]
