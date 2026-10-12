"""Roadmap fixtures for the disposable desktop backend (R2 Phase C).

Imported only by hermes_dockyard_plugin/desktop/disposable-backend.py. Seeds
through the REAL services so the browser suite reads exactly what production
writes. Kept in its own module so the backend file stays one contiguous block
per owner.
"""


def seed_roadmap_fixtures(service, adapter, roadmap, ladder=None) -> None:
    from hermes_project_stewardship.dockyard import Actor, ActorKind
    from hermes_project_stewardship.persistence.dockyard_service import DockyardService
    from hermes_project_stewardship.persistence.ladder_service import LadderService

    HUMAN = Actor(id="fixture", display_name="fixture", kind=ActorKind.HUMAN)
    store = service.store  # noqa: F841 — kept for parity with disposable-backend locals
    if ladder is None:
        from hermes_project_stewardship.persistence.canonical_work_service import (
            CanonicalWorkService,
        )
        ladder = LadderService(
            store, service, CanonicalWorkService(store, adapter), roadmap)
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
    # v42 ladder: one parent per level, placed with the ladder service.
    ladder.set_milestone_initiative(pid, mid, ref, actor="fixture", interface="fixture")
    objective_id = int(service.add_objective(
        pid, name="Review cycle under two days", evaluator_type="manual", target=">=1",
        actor="fixture", interface="fixture")["id"])
    service.record_assessment(
        pid, objective_id, passed=True, evidence=["fixture:1"], actor="fixture",
        interface="dockyard:human", trusted_principal="fixture")
    ladder.set_objective_milestone(pid, objective_id, mid, actor="fixture", interface="fixture")
    goal = service.create_goal(pid, title="Reviewers trust the queue", objective_ids=[objective_id],
                               actor="fixture", interface="fixture")
    roadmap.update_goal_contract(
        pid, goal["goal_id"],
        {"verification": "suite green", "constraints": "no downtime"},
        actor="fixture", interface="fixture")
    # A second, deliberately unlinked objective + milestone: drives the
    # "Not placed yet" groups and the placement flows in the browser tests.
    service.add_objective(
        pid, name="Unlinked objective for linking", evaluator_type="manual", target=">=1",
        actor="fixture", interface="fixture")
    dy.milestone_create(pid, "Unlinked milestone for linking", actor=HUMAN)

    # A fully-reached initiative (Batch L journeys): the goal's task is done,
    # so the milestone is reached and the initiative shows "Ready to confirm".
    ready_ref = service.propose_initiative(
        pid, title="Confirm me when ready", rationale="Delivered in full")["ref"]
    try:
        service.approve_initiative(ready_ref, actor="fixture", interface="fixture")
        service.start_execution(ready_ref)
    except Exception:
        pass
    ready_mid = dy.milestone_create(pid, "Ready milestone", due="2099-01-15", actor=HUMAN)
    ladder.set_milestone_initiative(pid, ready_mid, ready_ref,
                                    actor="fixture", interface="fixture")
    ready_oid = int(service.add_objective(
        pid, name="Ready objective", evaluator_type="manual", target=">=1",
        actor="fixture", interface="fixture")["id"])
    service.record_assessment(
        pid, ready_oid, passed=True, evidence=["fixture:2"], actor="fixture",
        interface="dockyard:human", trusted_principal="fixture")
    ladder.set_objective_milestone(pid, ready_oid, ready_mid,
                                   actor="fixture", interface="fixture")
    ready_gid = service.create_goal(
        pid, title="Ready goal", objective_ids=[ready_oid],
        actor="fixture", interface="fixture")["goal_id"]
    ladder.set_goal_objective(pid, ready_gid, ready_oid, actor="fixture", interface="fixture")
    ready_task = adapter.create_work(
        pid, kind="task", title="Ready task", body="fixture",
        assignee="worker", created_by="fixture")
    adapter.transition_work(pid, "task", ready_task["ref"], "done")
    ladder.set_task_goal(pid, ready_task["ref"], ready_gid,
                         actor="fixture", interface="fixture")

    # Batch L R2 fix 7: both ladder notifications, so the Notifications screen
    # shows the new kinds with their plain words in the signoff screenshots.
    from hermes_project_stewardship.events.bus import EventBus
    from hermes_project_stewardship.events.notifications import NotificationEngine

    notif = NotificationEngine(store, service)
    notif.attach(EventBus(store))
    # Both are left OPEN (each keeps its ladder meaning) but marked SEEN, so the
    # Notifications badge is unchanged for tests that count unseen items.
    for event in (
        {"event_type": "initiative.ready_to_confirm", "project_id": pid,
         "subject": ready_ref, "payload": {"title": "Confirm me when ready"}},
        {"event_type": "initiative.regressed", "project_id": pid,
         "subject": "INIT-REGRESSED-DEMO",
         "payload": {"reason": "ladder check failed after confirmation"}},
    ):
        nid = notif.process_event(event)
        if nid is not None:
            notif.ack(nid)
