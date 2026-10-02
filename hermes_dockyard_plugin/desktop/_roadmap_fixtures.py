"""Roadmap fixtures for the disposable desktop backend (R2 Phase C).

Imported only by hermes_dockyard_plugin/desktop/disposable-backend.py. Seeds
through the REAL services so the browser suite reads exactly what production
writes. Kept in its own module so the backend file stays one contiguous block
per owner.
"""


def seed_roadmap_fixtures(service, adapter, roadmap) -> None:
    from hermes_project_stewardship.dockyard import Actor, ActorKind
    from hermes_project_stewardship.persistence.dockyard_service import DockyardService

    HUMAN = Actor(id="fixture", display_name="fixture", kind=ActorKind.HUMAN)
    store = service.store  # noqa: F841 — kept for parity with disposable-backend locals
    # payments-relaunch: the fully linked story.
    pid = "payments-relaunch"
    service.update_features(pid, {"initiatives": True, "milestones": True}, actor="fixture", interface="fixture")
    initiative = service.propose_initiative(
        pid, title="Ship saved views", rationale="Reduce review toil")
    ref = initiative["ref"]
    try:
        service.approve_initiative(ref, actor="fixture", interface="fixture")
    except Exception:
        pass  # already approved or governance differs; the link rules still hold
    from hermes_project_stewardship.persistence.canonical_work_service import CanonicalWorkService
    dy = DockyardService(store, canonical_work=CanonicalWorkService(store, adapter))
    mid = dy.milestone_create(pid, "Pilot release", due="2099-01-01", actor=HUMAN)
    # The linked work item lives in a project the LEGACY drag suites never
    # open (they drive payments-relaunch's board with exact coordinates).
    # payments-relaunch keeps its milestone with zero items ('No linked work'
    # — an honest state). atlas-mobile hosts the demonstration work item.
    work = adapter.create_work("atlas-mobile", kind="task", title="Build setup flow", body="fixture", assignee="worker", created_by="fixture")
    adapter.transition_work("atlas-mobile", "task", work["ref"], "in_progress")
    dy.milestone_create("atlas-mobile", "Demo milestone", due="2099-02-01", actor=HUMAN)
    dy.milestone_attach("atlas-mobile", "Demo milestone", work["ref"], actor=HUMAN)
    roadmap.link_initiative_milestone(pid, ref, mid, "delivers", actor="fixture", interface="fixture")
    objective_id = int(service.add_objective(
        pid, name="Review cycle under two days", evaluator_type="manual", target=">=1",
        actor="fixture", interface="fixture")["id"])
    service.record_assessment(
        pid, objective_id, passed=True, evidence=["fixture:1"], actor="fixture",
        interface="dockyard:human", trusted_principal="fixture")
    roadmap.link_objective_initiative(pid, objective_id, ref, "supports", actor="fixture", interface="fixture")
    goal = service.create_goal(pid, title="Reviewers trust the queue", objective_ids=[objective_id],
                               actor="fixture", interface="fixture")
    roadmap.update_goal_contract(
        pid, goal["goal_id"],
        {"verification": "suite green", "constraints": "no downtime"},
        actor="fixture", interface="fixture")
    # A second, deliberately unlinked objective + milestone: drives the
    # "Not linked yet" groups and the Link… flow in the browser tests.
    service.add_objective(
        pid, name="Unlinked objective for linking", evaluator_type="manual", target=">=1",
        actor="fixture", interface="fixture")
    dy.milestone_create(pid, "Unlinked milestone for linking", actor=HUMAN)
