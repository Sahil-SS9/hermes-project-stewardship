"""Council-finding regression tests: every audit finding pinned by a test."""
from __future__ import annotations

import pytest

fastapi = pytest.importorskip("fastapi")
from fastapi.testclient import TestClient  # noqa: E402

from hermes_project_stewardship.api.server import create_app  # noqa: E402
from hermes_project_stewardship.dockyard import WorkItemType  # noqa: E402
from hermes_project_stewardship.dockyard.bots import BotStatus  # noqa: E402
from hermes_project_stewardship.persistence.dockyard_service import (
    DockyardService,  # noqa: E402
)
from hermes_project_stewardship.persistence.service import (
    StewardshipService,  # noqa: E402
)
from hermes_project_stewardship.persistence.store import Store  # noqa: E402


@pytest.fixture()
def env(tmp_path):
    store = Store(tmp_path / "council.db")
    c = TestClient(create_app(store))
    c.post("/stewardship/v1/onboard", json={
        "project_id": "alpha", "repo_path": "/srv/a",
        "mission": "m", "lead_profile": "l"})
    c.post("/stewardship/v1/onboard", json={
        "project_id": "beta", "repo_path": "/srv/b",
        "mission": "m", "lead_profile": "l"})
    yield c, DockyardService(store), store
    store.close()


# C1: cross-scope backlog contamination impossible (composite PK + FK)
def test_c1_backlog_cannot_hijack_across_projects(env):
    c, dy, store = env
    it_a = dy.create_item("alpha", WorkItemType.TASK, "A's item",
                          actor=_human())
    # beta cannot create a backlog row pointing at alpha's item ref:
    with pytest.raises(Exception):
        dy.backlog_add("beta", it_a.ref, 1,
                       reason="hostile cross-scope write",
                       actor=_bot())
    # alpha still owns its entry space; beta backlog stays empty
    assert dy.backlog_list("beta") == []


def test_c1_same_ref_space_independent_ranks(env):
    c, dy, store = env
    a = dy.create_item("alpha", WorkItemType.TASK, "Alpha one", actor=_human())
    b = dy.create_item("beta", WorkItemType.TASK, "Beta one", actor=_human())
    dy.backlog_add("alpha", a.ref, 1, reason="a ranks first",
                   actor=_human())
    dy.backlog_add("beta", b.ref, 1, reason="b ranks first too",
                   actor=_human())
    assert [e.rank for e in dy.backlog_list("alpha")] == [1]
    assert [e.rank for e in dy.backlog_list("beta")] == [1]


# C2: promotion path uses race-safe store-derived refs under threads
def test_c2_parallel_promotions_unique_refs(env):
    c, dy, store = env
    svc = StewardshipService(store)
    import threading

    refs: list[str] = []
    lock = threading.Lock()
    for pid in ("alpha", "beta"):
        ini = svc.propose_initiative(
            pid, title=f"promo {pid}",
            rationale="objective: council C2 check")
        svc.approve_initiative(ini["ref"], actor="sahil", interface="rpc")
        payload = svc.initiative_by_ref(ini["ref"])

        def promote(p=payload):
            item = dy.promote_initiative(p, actor=_human())
            with lock:
                refs.append(item.ref)

        ts = [threading.Thread(target=promote) for _ in range(4)]
        [t.start() for t in ts]
        [t.join() for t in ts]
        # idempotent: all four threads return the same twin
        assert len(set(refs[-4:])) == 1
    assert all(r.startswith("HDY-") for r in refs)


# C3: invalid enum params -> 422 not 500
def test_c3_invalid_status_query_returns_422(env):
    c, _, _ = env
    r = c.get("/stewardship/v1/projects/alpha/work-items?status=flying")
    assert r.status_code == 422
    r = c.get("/stewardship/v1/bots?status=telepathic")
    assert r.status_code == 422
    r = c.get("/stewardship/v1/projects/alpha/views"
              "?actor_id=sahil&actor_kind=wizard")
    assert r.status_code == 422


# C4: phantom backlog refs refused at API edge
def test_c4_phantom_backlog_ref_404(env):
    c, _, _ = env
    r = c.post("/stewardship/v1/projects/alpha/backlog", json={
        "ref": "HDY-9999", "rank": 1,
        "reason": "ghost reference probe", "actor_id": "sahil"})
    assert r.status_code == 404


# C5: unknown notification ack -> 404
def test_c5_ack_unknown_notification_404(env):
    c, _, _ = env
    r = c.post("/stewardship/v1/notifications/999999/ack")
    assert r.status_code == 404


# C6+M3: milestone attach on non-existent milestone/work-item refused
def test_c6_milestone_attach_validated(env):
    c, dy, store = env
    real = dy.create_item("alpha", WorkItemType.TASK, "real item",
                          actor=_human())
    r = c.post("/stewardship/v1/projects/alpha/milestones/nope/attach",
               json={"ref": real.ref, "actor_id": "sahil"})
    assert r.status_code == 409 or r.status_code == 404
    # unknown work item on a REAL milestone also refused
    c.post("/stewardship/v1/projects/alpha/milestones", json={
        "name": "v1", "actor_id": "sahil"})
    r = c.post("/stewardship/v1/projects/alpha/milestones/v1/attach",
               json={"ref": "HDY-9999", "actor_id": "sahil"})
    assert r.status_code >= 400


# M1: OFFLINE -> STUCK illegal through the service path too
def test_m1_offline_bot_cannot_become_stuck_via_service(env):
    c, dy, store = env
    dy.bot_register("sleepy-bot", "Sleepy")
    dy.bot_set_status("sleepy-bot", "offline")
    with pytest.raises(ValueError):
        dy.bot_set_status("sleepy-bot", "stuck")


def _human():
    from hermes_project_stewardship.dockyard import Actor, ActorKind

    return Actor(id="sahil", display_name="Sahil", kind=ActorKind.HUMAN)


def _bot():
    from hermes_project_stewardship.dockyard import Actor, ActorKind

    return Actor(id="probe-bot", display_name="P", kind=ActorKind.BOT)
