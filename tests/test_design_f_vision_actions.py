"""Design round f, Option B (Sahil, 05/10/2026): safe deletes, HPS only.

* Withdraw an initiative before approval: it becomes ``cancelled``, frees its
  open-initiative slot and its title, closes the approval notification, and
  keeps its history. Only a trusted caller may withdraw (same rule as the
  decisions it pre-empts, Q2 03/10/2026).
* Delete an archived goal or an archived milestone for good. Active ones are
  refused. Their links go with them; the objectives and work items stay.
* Completion only moves an approved or in-progress initiative. The Desktop
  "Mark complete" button must not be able to finish a proposal nobody approved.
"""
from __future__ import annotations

import pytest

pytest.importorskip("fastapi")
from fastapi.testclient import TestClient  # noqa: E402

from hermes_project_stewardship.api.server import create_app  # noqa: E402
from hermes_project_stewardship.kanban import ReferenceKanbanAdapter  # noqa: E402
from hermes_project_stewardship.persistence.service import ServiceError  # noqa: E402
from .r2_helpers import HUMAN, World  # noqa: E402
from .test_owner_q2_trusted_decisions import BASE, TOKEN, _load_plugin  # noqa: E402

V1 = "/stewardship/v1"
BEARER = {"Authorization": "Bearer t0k"}


def _app(store, adapter, *, human=True, capabilities=None, token="t0k"):
    return create_app(
        store, kanban_adapter=adapter, auth_token=token, auth_principal="sahil",
        auth_principal_is_human=human, capabilities=capabilities)


def _audit(store, action):
    return [r for r in store.audit_tail(500) if r["action"] == action]


def _status(store, ref):
    return store._conn.execute(
        "SELECT status, approval_state FROM project_initiatives WHERE ref=?", (ref,)).fetchone()


@pytest.fixture()
def world(store, clock):
    w = World(store, clock, adapter=ReferenceKanbanAdapter(store))
    w.project("alpha")
    return w


@pytest.fixture()
def api(store, clock):
    adapter = ReferenceKanbanAdapter(store)
    w = World(store, clock, adapter=adapter)
    w.project("alpha")
    client = TestClient(_app(store, adapter), headers=BEARER)
    return client, w, store


# =============================================================================
# 1. Withdraw before approval
# =============================================================================

@pytest.mark.parametrize("before", ["pending_approval", "changes_requested", "proposed"])
def test_withdraw_cancels_an_initiative_that_is_not_yet_approved(world, store, before):
    ref = world.initiative("alpha", "Try a thing", requires_approval=True)
    if before == "changes_requested":
        world.svc.request_changes_initiative(ref, actor="owner", interface="test",
                                             feedback="smaller please")
    elif before == "proposed":
        # Set directly: 'proposed' is the legacy pre-approval state.
        with store.tx() as cx:
            cx.execute("UPDATE project_initiatives SET status='proposed' WHERE ref=?", (ref,))
    revision = store._conn.execute(
        "SELECT decision_revision FROM project_initiatives WHERE ref=?", (ref,)).fetchone()[0]

    out = world.svc.withdraw_initiative(ref, actor="owner", interface="test",
                                        reason="  Not needed after all  ")

    assert out["status"] == "cancelled"
    # Nothing is waiting for a decision any more, so no approval is pending.
    assert tuple(_status(store, ref)) == ("cancelled", "not_required")
    assert store._conn.execute(
        "SELECT decision_revision FROM project_initiatives WHERE ref=?", (ref,)
    ).fetchone()[0] == revision + 1, "a stale decision fingerprint must stop matching"
    [row] = _audit(store, "initiative.withdrawn")
    assert row["subject"] == ref and row["actor"] == "owner"
    assert row["detail"] == {"from_status": before, "reason": "Not needed after all"}


def test_withdraw_frees_the_slot_and_the_title_without_a_suppression_window(store, clock):
    w = World(store, clock, adapter=ReferenceKanbanAdapter(store))
    w.svc.enable("tight", mission="m", lead_profile="lead", member_profiles=["coder"],
                 autonomy_level=2, verification_policy={"max_open_initiatives": 1})
    first = w.svc.propose_initiative("tight", title="Only one", rationale="r")
    with pytest.raises(ServiceError, match="open-initiative cap"):
        w.svc.propose_initiative("tight", title="Second", rationale="r")

    w.svc.withdraw_initiative(first["ref"], actor="owner", interface="test")

    # Unlike a rejection, a withdrawal does not block the same title.
    again = w.svc.propose_initiative("tight", title="Only one", rationale="r")
    assert again["status"] == "pending_approval" and again["ref"] != first["ref"]
    assert store._conn.execute("SELECT COUNT(*) FROM initiative_suppression").fetchone()[0] == 0


@pytest.mark.parametrize("after", ["approved", "executing", "completed", "regressed", "rejected"])
def test_withdraw_is_refused_once_the_initiative_has_left_the_approval_stage(world, store, after):
    ref = world.initiative("alpha", "Already decided", status=after)
    before = tuple(_status(store, ref))
    with pytest.raises(ServiceError, match="only be withdrawn before approval"):
        world.svc.withdraw_initiative(ref, actor="owner", interface="test")
    assert tuple(_status(store, ref)) == before
    assert _audit(store, "initiative.withdrawn") == []


def test_withdraw_twice_returns_the_same_result_without_a_second_record(world, store):
    ref = world.initiative("alpha", "Twice", requires_approval=True)
    world.svc.withdraw_initiative(ref, actor="owner", interface="test")
    again = world.svc.withdraw_initiative(ref, actor="owner", interface="test")
    assert again["status"] == "cancelled"
    assert len(_audit(store, "initiative.withdrawn")) == 1


def test_a_withdrawn_initiative_cannot_then_be_approved_rejected_or_completed(api):
    client, w, store = api
    ref = w.initiative("alpha", "Gone", requires_approval=True)
    fingerprint = client.get(f"{V1}/initiatives/{ref}/decision").json()["fingerprint"]
    assert client.post(f"{V1}/initiatives/{ref}/withdraw", json={}).status_code == 200
    for route, body in (("approve", {}), ("reject", {"reason": "no"}),
                        ("request-changes", {"feedback": "no"})):
        r = client.post(f"{V1}/initiatives/{ref}/{route}",
                        json={"expected_fingerprint": fingerprint, **body})
        assert r.status_code == 409, (route, r.text)
    r = client.post(f"{V1}/initiatives/{ref}/complete", json={"outcome": {"verified": True}})
    assert r.status_code == 409, r.text
    assert tuple(_status(store, ref)) == ("cancelled", "not_required")
    assert client.get(f"{V1}/initiatives/{ref}/decision/receipts").json()["receipts"] == []


def test_withdraw_route_records_the_trusted_caller_and_closes_the_approval_notification(api):
    client, _w, store = api
    # Proposed through the API so the real notification stack raises the
    # approval notification, exactly as the Desktop "+ New" form does.
    ref = client.post(f"{V1}/projects/alpha/initiatives",
                      json={"title": "Ask first", "rationale": "because"}).json()["ref"]
    open_rows = store._conn.execute(
        "SELECT id FROM notifications WHERE dedupe_key=? AND resolved_at IS NULL",
        (f"approval_required:{ref}",)).fetchall()
    assert len(open_rows) == 1

    r = client.post(f"{V1}/initiatives/{ref}/withdraw",
                    json={"actor": "mallory", "reason": "Changed my mind"})

    assert r.status_code == 200, r.text
    assert r.json()["status"] == "cancelled"
    [row] = _audit(store, "initiative.withdrawn")
    assert row["actor"] == "sahil", "the body's actor is attribution only, never authority"
    note = store._conn.execute(
        "SELECT resolution, resolution_note FROM notifications WHERE id=?",
        (open_rows[0]["id"],)).fetchone()
    assert tuple(note) == ("auto", f"initiative withdrawn: {ref}")
    events = [e["event_type"] for e in client.get(
        f"{V1}/projects/alpha/events").json()["events"]]
    assert "initiative.withdrawn" in events


def test_withdraw_route_maps_errors(api):
    client, w, _store = api
    assert client.post(f"{V1}/initiatives/INIT-NOPE-0001/withdraw", json={}).status_code == 404
    ref = w.initiative("alpha", "Running", status="executing")
    r = client.post(f"{V1}/initiatives/{ref}/withdraw", json={})
    assert r.status_code == 409 and "before approval" in r.text


@pytest.mark.parametrize("headers", [{}, {"x-dockyard-desktop-proxy": "guessed",
                                          "x-dockyard-desktop-actor": "sahil"}],
                         ids=["no_principal", "forged_proxy_key"])
def test_withdraw_without_a_trusted_caller_is_refused_and_changes_nothing(store, clock, headers):
    adapter = ReferenceKanbanAdapter(store)
    w = World(store, clock, adapter=adapter)
    w.project("alpha")
    ref = w.initiative("alpha", "Keep me", requires_approval=True)
    client = TestClient(create_app(store, kanban_adapter=adapter))
    r = client.post(f"{V1}/initiatives/{ref}/withdraw", json={"actor": "sahil"}, headers=headers)
    assert r.status_code == 403, r.text
    assert r.json()["error"]["code"] == "trusted_principal_required"
    assert tuple(_status(store, ref)) == ("pending_approval", "pending")
    assert _audit(store, "initiative.withdrawn") == []


@pytest.mark.parametrize("env_token", [False, True], ids=["cli_started_dashboard", "desktop_env_token"])
def test_desktop_withdraw_works_through_the_plugin_proxy(tmp_path, monkeypatch, env_token):
    module, svc, client = _load_plugin(tmp_path, monkeypatch, env_token=env_token)
    headers = {"x-hermes-session-token": TOKEN} if env_token else {}
    ref = svc.propose_initiative("p1", title="Desk withdraw", rationale="r")["ref"]
    # The exact body the Vision screen sends.
    r = client.post(f"{BASE}/initiatives/{ref}/withdraw", headers=headers,
                    json={"reason": "Not now"})
    assert r.status_code == 200, r.text
    assert r.json()["status"] == "cancelled"
    [row] = _audit(module._store, "initiative.withdrawn")
    assert row["actor"] == ("dashboard-user" if env_token else "desk-owner")
    assert row["detail"]["reason"] == "Not now"
    module._store.close()


# =============================================================================
# 2. Delete an archived goal
# =============================================================================

def test_an_active_goal_cannot_be_deleted(world, store):
    oid = world.objective("alpha", "Speed")
    gid = world.goal("alpha", "Faster", [oid])
    with pytest.raises(ServiceError, match="archive it before deleting"):
        world.svc.delete_goal("alpha", gid, actor="owner", interface="test")
    assert store._conn.execute(
        "SELECT COUNT(*) FROM project_goals WHERE goal_id=?", (gid,)).fetchone()[0] == 1


def test_deleting_an_archived_goal_frees_its_objectives_and_keeps_them(world, store):
    """Was: an archived goal held its objective (one goal per objective).

    v42 drops that rule: a goal has exactly one objective and re-pointing it is
    a normal placement, so there is no "linked to another goal" conflict to
    raise. What must still hold is the substance of the old test — deleting the
    goal frees its objective and keeps the objective itself.
    """
    oid = world.objective("alpha", "Speed")
    gid = world.goal("alpha", "Faster", [oid])
    world.svc.archive_goal("alpha", gid, actor="owner", interface="test")

    out = world.svc.delete_goal("alpha", gid, actor="owner", interface="test")

    assert out == {"goal_id": gid, "deleted": True, "objective_ids": [oid]}
    for table in ("project_goals", "project_goal_contracts"):
        assert store._conn.execute(
            f"SELECT COUNT(*) FROM {table} WHERE goal_id=?", (gid,)).fetchone()[0] == 0, table
    assert [o.id for o in world.svc.objectives("alpha")] == [oid], "the objective itself stays"
    replacement = world.goal("alpha", "Replacement", [oid])
    assert world.svc.goals("alpha")[0]["goal_id"] == replacement
    [row] = _audit(store, "goal.deleted")
    assert row["subject"] == gid and row["actor"] == "owner"
    assert row["detail"] == {"project_id": "alpha", "title": "Faster", "objective_ids": [oid]}


def test_goal_delete_route(api):
    client, w, store = api
    gid = w.goal("alpha", "Old goal")
    assert client.delete(f"{V1}/projects/alpha/goals/{gid}").status_code == 409
    assert client.post(f"{V1}/projects/alpha/goals/{gid}/archive").status_code == 200
    r = client.delete(f"{V1}/projects/alpha/goals/{gid}")
    assert r.status_code == 200, r.text
    assert r.json()["deleted"] is True
    assert client.delete(f"{V1}/projects/alpha/goals/{gid}").status_code == 404
    assert _audit(store, "goal.deleted")[0]["actor"] == "sahil"


@pytest.mark.parametrize("kind", ["non_human", "no_capability", "unauthenticated"])
def test_goal_and_milestone_delete_are_refused_like_archive(store, clock, kind):
    adapter = ReferenceKanbanAdapter(store)
    w = World(store, clock, adapter=adapter)
    w.project("alpha")
    gid = w.goal("alpha", "Keep")
    w.svc.archive_goal("alpha", gid, actor="owner", interface="test")
    w.milestone("alpha", "Keep M")
    w.dy.milestone_archive("alpha", "Keep M", actor=HUMAN)
    options = {"non_human": dict(human=False), "no_capability": dict(capabilities=[]),
               "unauthenticated": {}}[kind]
    client = TestClient(_app(store, adapter, **options))
    headers = {} if kind == "unauthenticated" else BEARER
    reference = client.post(f"{V1}/projects/alpha/goals/{gid}/restore", headers=headers)
    assert reference.status_code in (401, 403, 503)
    assert client.delete(f"{V1}/projects/alpha/goals/{gid}", headers=headers).status_code \
        == reference.status_code
    assert client.delete(f"{V1}/projects/alpha/milestones/Keep M", headers=headers).status_code \
        == reference.status_code
    assert store._conn.execute("SELECT COUNT(*) FROM project_goals").fetchone()[0] == 1
    assert store._conn.execute("SELECT COUNT(*) FROM dockyard_milestones").fetchone()[0] == 1


# =============================================================================
# 3. Delete an archived milestone
# =============================================================================

def test_an_active_milestone_cannot_be_deleted(world, store):
    world.milestone("alpha", "Beta launch")
    with pytest.raises(ValueError, match="archive it before deleting"):
        world.dy.milestone_delete("alpha", "Beta launch", actor=HUMAN)
    assert store._conn.execute("SELECT COUNT(*) FROM dockyard_milestones").fetchone()[0] == 1


def test_deleting_an_archived_milestone_drops_its_links_and_frees_its_name(world, store):
    mid = world.milestone("alpha", "Beta launch")
    ref = world.initiative("alpha", "Ship beta")
    world.place_milestone("alpha", mid, ref)
    item = world.item("alpha", "Write docs", milestone="Beta launch")
    world.dy.milestone_archive("alpha", "Beta launch", actor=HUMAN)

    out = world.dy.milestone_delete("alpha", "Beta launch", actor=HUMAN)

    assert out == {"name": "Beta launch", "deleted": True, "items": [item], "initiatives": [ref]}
    assert store._conn.execute("SELECT COUNT(*) FROM dockyard_milestones").fetchone()[0] == 0
    assert store._conn.execute("SELECT COUNT(*) FROM dockyard_milestone_items").fetchone()[0] == 0
    # The work item and the initiative stay; only the grouping goes.
    assert world.work.get("alpha", item)["ref"] == item
    assert world.svc.initiative_by_ref(ref)["status"] == "approved"
    # The name is free again.
    world.milestone("alpha", "Beta launch")
    [row] = _audit(store, "milestone.deleted")
    assert row["subject"] == "Beta launch" and row["actor"] == "owner"
    assert row["detail"] == {"items": [item], "initiatives": [ref]}
    # The read model still builds.
    assert world.outline("alpha")["initiatives"][0]["milestones"] == []


def test_milestone_delete_route(api):
    client, w, _store = api
    w.milestone("alpha", "Old M")
    assert client.delete(f"{V1}/projects/alpha/milestones/Old M").status_code == 409
    assert client.post(f"{V1}/projects/alpha/milestones/Old M/archive").status_code == 200
    r = client.delete(f"{V1}/projects/alpha/milestones/Old M")
    assert r.status_code == 200, r.text
    assert r.json() == {"name": "Old M", "deleted": True, "items": [], "initiatives": []}
    assert client.delete(f"{V1}/projects/alpha/milestones/Old M").status_code == 404


@pytest.mark.parametrize("env_token", [False, True], ids=["cli_started_dashboard", "desktop_env_token"])
def test_desktop_deletes_behave_like_desktop_archive_through_the_plugin_proxy(tmp_path, monkeypatch, env_token):
    module, svc, client = _load_plugin(tmp_path, monkeypatch, env_token=env_token)
    headers = {"x-hermes-session-token": TOKEN} if env_token else {}
    gid = svc.create_goal("p1", title="G", actor="owner", interface="test")["goal_id"]
    created = client.post(f"{BASE}/projects/p1/milestones", headers=headers, json={"name": "M 1"})
    assert created.status_code == 200, created.text

    archived_goal = client.post(f"{BASE}/projects/p1/goals/{gid}/archive", headers=headers)
    archived_ms = client.post(f"{BASE}/projects/p1/milestones/M%201/archive", headers=headers)
    deleted_goal = client.delete(f"{BASE}/projects/p1/goals/{gid}", headers=headers)
    deleted_ms = client.delete(f"{BASE}/projects/p1/milestones/M%201", headers=headers)

    # Whoever may archive may delete, through exactly the same trust check.
    assert deleted_goal.status_code == archived_goal.status_code, deleted_goal.text
    assert deleted_ms.status_code == archived_ms.status_code, deleted_ms.text
    module._store.close()


def test_desktop_deletes_work_through_the_plugin_proxy_when_archive_does(tmp_path, monkeypatch):
    """The operator grants the dashboard user the archive capability.

    Same production composition as ``_load_plugin`` (Hermes' module load, real
    auth), with STEWARD_RPC_CAPABILITIES set the way an install grants it.
    """
    import hermes_project_stewardship.api.server as server_module
    from hermes_project_stewardship.persistence.service import StewardshipService
    from hermes_project_stewardship.persistence.store import Store
    import importlib.util
    from fastapi import FastAPI
    from .test_owner_q2_trusted_decisions import PROXY

    db_path = tmp_path / "db.sqlite"
    for name, value in (("HERMES_HOME", str(tmp_path)), ("HERMES_KANBAN_HOME", str(tmp_path)),
                        ("STEWARD_DB_PATH", str(db_path)), ("DOCKYARD_ACTOR_ID", "desk-owner"),
                        ("HERMES_DASHBOARD_SESSION_TOKEN", TOKEN),
                        ("STEWARD_RPC_CAPABILITIES", "project_archive")):
        monkeypatch.setenv(name, value)
    for name in ("STEWARD_RPC_TOKEN", "STEWARD_RPC_PRINCIPAL", "STEWARD_RPC_PRINCIPAL_KIND",
                 "DOCKYARD_PLUGIN_URL"):
        monkeypatch.delenv(name, raising=False)
    monkeypatch.setattr(server_module, "create_project_kanban_adapter",
                        lambda *a, **k: ReferenceKanbanAdapter(Store(db_path)))
    spec = importlib.util.spec_from_file_location("design_f_plugin_api", PROXY)
    assert spec is not None and spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    assert module._startup_error is None, module._startup_error
    svc = StewardshipService(module._store)
    svc.enable("p1", mission="m", lead_profile="lead", member_profiles=["worker"], autonomy_level=2)
    host = FastAPI()
    host.include_router(module.plugin_api, prefix=BASE)
    client = TestClient(host, headers={"x-hermes-session-token": TOKEN})
    try:
        gid = svc.create_goal("p1", title="G", actor="owner", interface="test")["goal_id"]
        assert client.post(f"{BASE}/projects/p1/milestones", json={"name": "M 1"}).status_code == 200
        # Active ones are refused through the proxy too.
        assert client.delete(f"{BASE}/projects/p1/goals/{gid}").status_code == 409
        assert client.delete(f"{BASE}/projects/p1/milestones/M%201").status_code == 409
        assert client.post(f"{BASE}/projects/p1/goals/{gid}/archive").status_code == 200
        assert client.post(f"{BASE}/projects/p1/milestones/M%201/archive").status_code == 200
        goal = client.delete(f"{BASE}/projects/p1/goals/{gid}")
        milestone = client.delete(f"{BASE}/projects/p1/milestones/M%201")
        assert goal.status_code == 200 and goal.json()["deleted"] is True, goal.text
        assert milestone.status_code == 200 and milestone.json()["deleted"] is True, milestone.text
        assert [r["actor"] for r in _audit(module._store, "goal.deleted")] == ["dashboard-user"]
        assert [r["actor"] for r in _audit(module._store, "milestone.deleted")] == ["dashboard-user"]
    finally:
        module._store.close()


# =============================================================================
# 4. Completion only from approved or in progress
# =============================================================================

@pytest.mark.parametrize("before", ["pending_approval", "changes_requested", "cancelled", "rejected"])
def test_completion_is_refused_before_approval_or_after_closing(api, before):
    client, w, store = api
    ref = w.initiative("alpha", f"Not yet {before}", status=before)
    for regressed in (False, True):
        r = client.post(f"{V1}/initiatives/{ref}/complete",
                        json={"outcome": {"verified": True}, "regressed": regressed})
        assert r.status_code == 409, r.text
    assert _status(store, ref)["status"] == before
    assert _audit(store, "initiative.completed") == [] and _audit(store, "initiative.regressed") == []


@pytest.mark.parametrize("before", ["approved", "executing"])
def test_completion_goes_through_confirm_delivered_only(api, before):
    """D-L3: the old /complete route now goes through the ladder rule.

    An initiative with no reached milestone is refused (409) by /complete AND
    by confirm-delivered. Once every milestone is reached, confirm-delivered
    completes it; /complete (same rule) then succeeds too. Repeating is
    harmless: the recorded result stands.
    """
    client, w, store = api
    ref = w.initiative("alpha", f"Done {before}", status=before)
    # Not ready (no reached milestone): both routes refuse.
    assert client.post(f"{V1}/initiatives/{ref}/complete",
                       json={"outcome": {"verified": True}}).status_code == 409
    assert _status(store, ref)["status"] == before
    # Build a reached milestone: milestone <- objective <- goal <- done task,
    # with the objective's check passed. Only an executing initiative can be
    # ready to confirm, so start execution first.
    mid = w.milestone("alpha", "Release")
    w.place_milestone("alpha", mid, ref)
    oid = w.objective("alpha", "Obj", state="passed")
    w.place_objective("alpha", oid, mid)
    gid = w.goal("alpha", "Goal")
    w.place_goal("alpha", gid, oid)
    w.place_task("alpha", w.item("alpha", "Task", status="done"), gid)
    if before == "approved":
        w.svc.start_execution(ref)  # only an executing initiative can be ready
    # Now ready: confirm-delivered completes it.
    r = client.post(f"{V1}/projects/alpha/initiatives/{ref}/confirm-delivered", json={})
    assert r.status_code == 200, r.text
    assert _status(store, ref)["status"] == "completed"
    # Repeating is harmless: the recorded result stands.
    assert client.post(f"{V1}/projects/alpha/initiatives/{ref}/confirm-delivered",
                       json={}).status_code == 200
    assert _status(store, ref)["status"] == "completed"


def test_service_completion_guard(world, store):
    ref = world.initiative("alpha", "Guarded", requires_approval=True)
    with pytest.raises(ServiceError, match="cannot be completed"):
        world.svc.complete_initiative(ref, outcome={})
    assert _status(store, ref)["status"] == "pending_approval"
    done = world.initiative("alpha", "Finished", status="executing")
    assert world.svc.complete_initiative(done, outcome={"ok": 1})["status"] == "completed"
    # Same result again: returned as recorded, not rewritten.
    assert world.svc.complete_initiative(done, outcome={"ok": 2})["outcome"] == {"ok": 1}
    with pytest.raises(ServiceError, match="cannot be completed"):
        world.svc.complete_initiative(done, outcome={}, regressed=True)
