"""Kanban fixtures for the disposable desktop backend (C2).

Imported only by hermes_dockyard_plugin/desktop/disposable-backend.py. Seeds
through the REAL services, so the browser suite reads exactly what production
writes. Everything lives in atlas-mobile, the project the legacy drag suites
never open (they drive payments-relaunch's board with exact coordinates).

Rules for these fixtures:
- A blocker is made only with an explicit blocking link (add_dependency).
  Nothing here gives an item a parent, and no epic is linked to a task.
- Due dates are far in the past or far in the future, so no test depends on
  today's date.
- Assignees are real profile-style ids; the board derives initials from them.
"""


def seed_kanban_fixtures(service, adapter, roadmap, *, owner: str) -> None:
    from hermes_project_stewardship.dockyard import Actor, ActorKind
    from hermes_project_stewardship.persistence.canonical_work_service import CanonicalWorkService
    from hermes_project_stewardship.persistence.dockyard_service import DockyardService
    from hermes_project_stewardship.persistence.ladder_service import LadderService

    human = Actor(id="fixture", display_name="fixture", kind=ActorKind.HUMAN)
    ada = Actor(id="ada-lovelace", display_name="ada-lovelace", kind=ActorKind.HUMAN)
    grace = Actor(id="grace-hopper", display_name="grace-hopper", kind=ActorKind.HUMAN)
    pid = "atlas-mobile"
    store = service.store
    work = CanonicalWorkService(store, adapter)
    dy = DockyardService(store, canonical_work=work)
    ladder = LadderService(store, service, work, roadmap)

    service.update_features(pid, {"initiatives": True, "milestones": True}, actor="fixture", interface="fixture")

    def item(actor, kind, title, **kwargs):
        return work.create_item(pid, kind, title, actor=actor, **kwargs)["ref"]

    item(ada, "epic", "Mobile app revamp", labels=["mobile"])  # no links: shows the Epic type only
    feature = item(ada, "task", "Guided setup", labels=["mobile"], due="2099-06-30")
    screens = item(ada, "task", "Build setup screens", labels=["mobile", "ux"], due="2000-01-15")
    crash = item(grace, "bug", "Crash on first launch", labels=["mobile", "stability"], due="2099-12-31")
    analytics = item(grace, "task", "Wire up analytics", labels=["data"])
    sync_spike = item(grace, "spike", "Try offline sync", labels=["research"])

    work.transition(pid, screens, "in_progress", actor=human)
    work.transition(pid, crash, "blocked", actor=human)
    work.transition(pid, sync_spike, "in_progress", actor=human)
    work.transition(pid, sync_spike, "done", actor=human)

    # Explicit blocking links only: dependency_ref blocks ref.
    work.add_dependency(pid, screens, feature, actor=human)    # Guided setup blocks Build setup screens
    work.add_dependency(pid, screens, crash, actor=human)      # the crash bug blocks it too
    work.add_dependency(pid, analytics, screens, actor=human)  # Build setup screens blocks Wire up analytics
    work.add_dependency(pid, crash, sync_spike, actor=human)   # a DONE spike blocks the crash fix: "Done" in words

    # One initiative with one objective, one milestone with two items.
    initiative = service.propose_initiative(pid, title="Make setup effortless", rationale="First run decides retention")
    ref = initiative["ref"]
    try:
        service.approve_initiative(ref, actor="fixture", interface="fixture")
    except Exception:
        pass  # already approved or governance differs; the link rules still hold
    work.update_item(pid, screens, actor=human, initiative_ref=ref)
    work.update_item(pid, analytics, actor=human, initiative_ref=ref)

    objective_id = int(service.add_objective(
        pid, name="Setup under two minutes", evaluator_type="manual", target=">=1",
        actor="fixture", interface="fixture")["id"])
    # v42 ladder: an objective has one milestone parent, placed with the ladder.
    beta_milestone = dy.milestone_create(pid, "Beta launch", due="2099-03-01", actor=human)
    ladder.set_objective_milestone(
        pid, objective_id, beta_milestone, actor="fixture", interface="fixture")
    ladder.set_milestone_initiative(
        pid, beta_milestone, ref, actor="fixture", interface="fixture")

    dy.milestone_attach(pid, "Beta launch", screens, actor=human)
    dy.milestone_attach(pid, "Beta launch", analytics, actor=human)

    # Kanban views: three saved views, so the views bar has
    # something to show. Two belong to `owner`, the user the practice server
    # signs the Desktop in as (one shared); the third is shared by grace-hopper,
    # so the panel shows a view you can open and duplicate but not change.
    me = Actor(id=owner, display_name=owner, kind=ActorKind.HUMAN)
    every_field = ["assignee", "links", "due", "labels", "planning"]
    dy.view_save(pid, "Ada's work", "board", actor=me, filters={
        "assignee": "ada-lovelace", "display": {"density": "compact", "fields": ["assignee", "links", "due", "labels"]}})
    dy.view_save(pid, "Mobile, all cards open", "board", actor=me, shared=True, filters={
        "labels": ["mobile"], "display": {"density": "detailed", "fields": every_field}})
    dy.view_save(pid, "Grace's bugs", "table", actor=grace, shared=True, filters={"types": ["bug"]})
