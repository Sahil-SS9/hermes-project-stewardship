"""Roadmap fixtures for the disposable desktop backend (R2 Phase C).

Imported only by hermes_dockyard_plugin/desktop/disposable-backend.py. Seeds
through the REAL services so the browser suite reads exactly what production
writes. Kept in its own module so the backend file stays one contiguous block
per owner.
"""


def seed_roadmap_fixtures(service, adapter, roadmap) -> None:
    store = service.store

    def actor():
        return __import__("hermes_project_stewardship.dockyard", fromlist=["Actor"]).Actor(
            id="fixture", display_name="fixture",
            kind=__import__("hermes_project_stewardship.dockyard", fromlist=["ActorKind"]).ActorKind.HUMAN)

    HUMAN = actor()
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
    mid = None
    try:
        mid = adapter.milestone_create(pid, "Pilot release", due="2099-01-01", actor=HUMAN)
    except Exception:
        from hermes_project_stewardship.persistence.dockyard_service import DockyardService
        dy = DockyardService(store, canonical_work=adapter)
        mid = dy.milestone_create(pid, "Pilot release", due="2099-01-01", actor=HUMAN)
    work = adapter.create_work(pid, kind="task", title="Build setup flow", body="fixture", assignee="worker", created_by="fixture")
    adapter.transition_work(pid, "task", work["ref"], "in_progress")
    attached = adapter.milestone_attach(pid, "Pilot release", work["ref"], actor=HUMAN) if hasattr(
        adapter, "milestone_attach") else None
    if attached is None:
        store._conn.execute(
            "INSERT INTO dockyard_milestone_items(milestone_id, item_ref) VALUES(?,?)",
            (mid, work["ref"]))
        store._conn.commit()
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
    try:
        from hermes_project_stewardship.persistence.dockyard_service import DockyardService
        dy2 = DockyardService(store, canonical_work=adapter)
        dy2.milestone_create(pid, "Unlinked milestone for linking", actor=HUMAN)
    except Exception:
        pass
