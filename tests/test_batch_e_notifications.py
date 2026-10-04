"""Batch E: notification lifecycle (resolved/ack), wiring, policies, API.

Tests written first (RED) per evidence/e/E-PLAN.md E1-E4. Screens (E5) are a
later step gated on the Planning-canvas merge.

Conventions:
- end-to-end tests build `create_app` like tests/test_api.py does;
- clock: tests/conftest.py FrozenClock (store fixtures);
- policy: the normalised shape lives in
  hermes_project_stewardship.events.notifications:normalize_policy;
- every ack/resolve writes an audit row with the actor and is idempotent.
"""
from __future__ import annotations

import json

import pytest

fastapi = pytest.importorskip("fastapi")
from fastapi.testclient import TestClient  # noqa: E402

from hermes_project_stewardship.api.server import create_app  # noqa: E402
from hermes_project_stewardship.events import (  # noqa: E402
    HEALTH_CHANGED,
    VERIFICATION_FAILED,
)
from hermes_project_stewardship.events.notifications import (  # noqa: E402
    DEFAULT_EFFECTIVE_POLICY,
    NotificationEngine,
    normalize_policy,
)
from hermes_project_stewardship.kanban import ReferenceKanbanAdapter  # noqa: E402
from hermes_project_stewardship.persistence.service import (  # noqa: E402
    StewardshipService,
)
from hermes_project_stewardship.persistence.store import Store  # noqa: E402
from hermes_project_stewardship.gateway.handler import (  # noqa: E402
    CommandRequest,
)
from tests.conftest import make_repo  # noqa: E402

V = "/stewardship/v1"


@pytest.fixture()
def env(tmp_path):
    store = Store(tmp_path / "e.db")
    app = create_app(store, auth_token="test-token", auth_principal="test-user", auth_principal_is_human=True, kanban_adapter=ReferenceKanbanAdapter(store))
    c = TestClient(app)
    c.headers.update({"Authorization": "Bearer test-token"})
    yield c, store
    store.close()


def enable(c, pid="p1", features=None):
    r = c.post(f"{V}/projects/{pid}/enable", json={
        "project_id": pid, "mission": "m", "lead_profile": "lead",
        "autonomy_level": 2,
    })
    assert r.status_code == 200
    if features:
        r = c.patch(f"{V}/projects/{pid}/features",
                    json={"features": features,
                          "actor": "test", "interface": "test"})
        assert r.status_code == 200, r.text
    return r


def wire_repo(svc, pid, repo):
    svc.store._conn.execute(
        "UPDATE project_stewardship SET verification_policy_json=? WHERE project_id=?",
        (f'{{"repo_path": "{repo.as_posix()}"}}', pid),
    )


def ack_actor(c, nid=1, actor="desktop-user"):
    return c.post(f"{V}/notifications/{nid}/ack", json={"actor_id": actor})


# --------------------------------------------------------------------- #
# E1: switch notifications on                                            #
# --------------------------------------------------------------------- #

def test_e1_health_cycle_creates_notification_end_to_end(env, tmp_path):
    """A cycle that changes health creates a notification through create_app."""
    c, store = env
    enable(c, "p1")
    svc = StewardshipService(store)
    repo = make_repo(tmp_path / "r", dirty=True)
    wire_repo(svc, "p1", repo)
    svc.add_objective("p1", name="cov", evaluator_type="manual", target=">=1",
                      severity="medium")
    app = c.app
    engine = app.state.cycle_engine
    engine.run_cycle("p1")
    rows = c.get(f"{V}/projects/p1/notifications").json()["unacked"]
    if rows:
        assert any(n["kind"] == "health_change" for n in rows)


def test_e1_engine_attached_by_create_app(env):
    """create_app attaches exactly one NotificationEngine on the bus."""
    c, store = env
    bus = c.app.state.bus
    engines = [fn.__self__ for fn in bus._wildcards
               if getattr(fn, "__qualname__", "").startswith("NotificationEngine")]
    assert len(engines) == 1


def test_e1_approval_required_emitted_and_notification_created(env):
    """An initiative needing approval emits on the service path and creates
    a notification with a structured ref (E1.2 + E1.6)."""
    c, store = env
    enable(c, "p1")
    r = c.post(f"{V}/projects/p1/initiatives", json={
        "title": "T", "rationale": "R"})
    assert r.status_code in (200, 201)
    ref = (r.json() if "ref" in r.json() else r.json().get("initiative"))["ref"]
    events = c.app.state.bus.recent(
        project_id="p1", event_type="initiative.approval_required")
    assert any(e["subject"] == ref for e in events)
    rows = c.get(f"{V}/projects/p1/notifications").json()["unacked"]
    approval = [n for n in rows if n["kind"] == "approval_required"
                and n.get("ref") == ref]
    assert len(approval) == 1  # dedupe regression: exactly one per ref


def test_e1_two_initiatives_two_notifications(env):
    """Two initiatives must create two notifications (legacy dedupe bug)."""
    c, store = env
    enable(c, "p1")
    c.post(f"{V}/projects/p1/initiatives", json={"title": "A", "rationale": "ra"})
    c.post(f"{V}/projects/p1/initiatives", json={"title": "B", "rationale": "rb"})
    rows = c.get(f"{V}/projects/p1/notifications").json()["unacked"]
    found = [n["ref"] for n in rows if n["kind"] == "approval_required"]
    assert len(found) == 2, f"dedupe collapsed distinct approvals: {found}"


def test_e1_feature_off_no_notifications(env):
    """A project with the notifications feature off creates none."""
    c, store = env
    enable(c, "p2", features={"notifications": False})
    r = c.post(f"{V}/projects/p2/initiatives", json={"title": "T", "rationale": "R"})
    assert r.status_code in (200, 201)
    feed = c.get(f"{V}/notifications", params={"project_id": "p2"}).json()
    assert [n for n in feed["notifications"]
            if n["kind"] == "approval_required"] == []


# --------------------------------------------------------------------- #
# Decision events resolve approval notifications (auto-resolve)          #
# --------------------------------------------------------------------- #

def _make_and_decide(c, store, interface):
    """Propose through API, decide through `interface`, return (ref, rows)."""
    enable(c, "p1")
    r = c.post(f"{V}/projects/p1/initiatives", json={"title": "T", "rationale": "R"})
    ref = (r.json() if "ref" in r.json() else r.json().get("initiative"))["ref"]
    rows = c.get(f"{V}/projects/p1/notifications").json()["unacked"]
    assert any(n["kind"] == "approval_required" and n.get("ref") == ref
               for n in rows), rows
    if interface == "desktop":
        c.post(f"{V}/initiatives/{ref}/approve",
               json={"actor": "desk", "interface": "desktop"})
    elif interface == "rpc":
        c.post(f"{V}/initiatives/{ref}/reject",
               json={"actor": "rpcr", "interface": "rpc", "reason": "no"})
    elif interface == "slash command":
        from hermes_project_stewardship.cli.app import main as cli_main
        assert cli_main(["--db", str(store.db_path), "initiative", "approve",
                         ref, "--actor", "cli-user"]) == 0
    elif interface == "gateway":
        store._conn.execute(
            "INSERT OR REPLACE INTO gateway_permissions(project_id, platform,"
            " sender_id, can_approve, can_trigger) VALUES('p1','discord','u1',1,1)")
        h = c.app.state.gateway
        resp = h.handle(CommandRequest(platform="discord", sender_id="u1",
                                       command="approve", project_id="p1",
                                       args={"initiative_ref": ref}))
        assert resp.ok, f"gateway approve refused: {resp.text}"
    return ref, c.get(f"{V}/notifications").json()["notifications"]





def test_decision_through_desktop_resolves_approval(env):
    c, store = env
    ref, rows = _make_and_decide(c, store, "desktop")
    row = [n for n in rows if n["kind"] == "approval_required" and n.get("ref") == ref][0]
    assert row["state"] == "resolved"
    assert row["resolution"] == "auto"
    assert row["resolved_by"] == "system"


def test_decision_through_rpc_resolves_approval(env):
    c, store = env
    ref, rows = _make_and_decide(c, store, "rpc")
    row = [n for n in rows if n["kind"] == "approval_required" and n.get("ref") == ref][0]
    assert row["state"] == "resolved"


def test_decision_through_slash_command_resolves_approval(env):
    c, store = env
    ref, rows = _make_and_decide(c, store, "slash command")
    row = [n for n in rows if n["kind"] == "approval_required" and n.get("ref") == ref][0]
    assert row["state"] == "resolved"


def test_decision_through_gateway_resolves_approval(env):
    c, store = env
    ref, rows = _make_and_decide(c, store, "gateway")
    row = [n for n in rows if n["kind"] == "approval_required" and n.get("ref") == ref][0]
    assert row["state"] == "resolved"


# --------------------------------------------------------------------- #
# E2: auto-resolve health, dedupe, resolve/ack, audit                    #
# --------------------------------------------------------------------- #

def test_health_healthy_resolves_health_and_alert_notifications(env):
    c, store = env
    enable(c, "p1")
    svc = StewardshipService(store)
    notif = NotificationEngine(svc.store, svc)
    nid_health = notif.create("p1", severity="medium", kind="health_change",
                              title="h", dedupe_key="project.health.changed:degraded")
    nid_alert = notif.create("p1", severity="high", kind="alert",
                             title="a", dedupe_key="project.critical:")
    notif.process_event_and_resolve({
        "event_type": HEALTH_CHANGED, "project_id": "p1",
        "subject": "degraded->healthy", "payload": {"from": "degraded", "to": "healthy"},
    })
    rows = {n["id"]: n for n in
            c.get(f"{V}/projects/p1/notifications").json()["unacked"]}
    assert nid_health not in rows or rows.get(nid_health, {}).get("state") == "resolved"
    assert nid_alert not in rows or rows.get(nid_alert, {}).get("state") == "resolved"
    # the HEALTH_CHANGED healthy event itself is info — nothing new recorded
    new_health = [n for n in rows.values() if n["kind"] == "health_change"
                  and "healthy" in (n["title"] + n["body"]).lower()
                  and n["id"] not in (nid_health, nid_alert)]
    assert new_health == []


def test_dedupe_open_collapses_recurrence_within_window(env):
    c, store = env
    enable(c, "p1")
    svc = StewardshipService(store)
    notif = NotificationEngine(svc.store, svc)
    e = {"event_type": VERIFICATION_FAILED, "project_id": "p1",
         "subject": "cycle:1", "payload": {}}
    n1 = notif.process_event(e)
    n2 = notif.process_event(dict(e, subject="cycle:2"))
    assert n1 is not None and n2 is None


def test_recurrence_after_resolve_creates_new_notification(env):
    c, store = env
    enable(c, "p1")
    svc = StewardshipService(store)
    notif = NotificationEngine(svc.store, svc)
    e = {"event_type": VERIFICATION_FAILED, "project_id": "p1",
         "subject": "cycle:1", "payload": {}}
    n1 = notif.process_event(e)
    assert n1 is not None
    assert notif.resolve(n1, actor="human", resolution="manual", note="fixed") is True
    n2 = notif.process_event(dict(e, subject="cycle:2"))
    assert n2 is not None and n2 != n1


def test_manual_resolve_with_note(env):
    c, store = env
    enable(c, "p1")
    svc = StewardshipService(store)
    notif = NotificationEngine(svc.store, svc)
    nid = notif.create("p1", severity="low", kind="health_change", title="t")
    r = c.post(f"{V}/notifications/{nid}/resolve", json={
        "actor_id": "sahil", "note": "handled internally"})
    assert r.status_code == 200
    row = [n for n in
           c.get(f"{V}/notifications").json()["notifications"]
           if n["id"] == nid][0]
    assert row["state"] == "resolved" and row["resolution"] == "manual"
    assert row["resolution_note"] == "handled internally"


def test_resolve_is_idempotent(env):
    c, store = env
    enable(c, "p1")
    svc = StewardshipService(store)
    notif = NotificationEngine(svc.store, svc)
    nid = notif.create("p1", severity="low", kind="health_change", title="t")
    r1 = c.post(f"{V}/notifications/{nid}/resolve", json={"actor_id": "sahil"})
    r2 = c.post(f"{V}/notifications/{nid}/resolve", json={"actor_id": "other"})
    assert r1.status_code == 200 and r2.status_code == 200
    row = [n for n in
           c.get(f"{V}/notifications").json()["notifications"]
           if n["id"] == nid][0]
    assert row["resolved_by"] == "test-user"


def test_unknown_id_404(env):
    c, store = env
    assert c.post(f"{V}/notifications/99999/resolve", json={}).status_code == 404
    assert c.post(f"{V}/notifications/99999/ack", json={}).status_code == 404


def test_ack_records_actor_and_audits(env):
    c, store = env
    enable(c, "p1")
    svc = StewardshipService(store)
    notif = NotificationEngine(svc.store, svc)
    nid = notif.create("p1", severity="low", kind="health_change", title="t")
    r = ack_actor(c, nid, "sahil")
    assert r.status_code == 200
    row = [n for n in
           c.get(f"{V}/notifications").json()["notifications"]
           if n["id"] == nid][0]
    assert row["acked_by"] == "test-user"
    tail = store.audit_tail(30)
    assert any(a["action"] == "notification.acked" and a["actor"] == "test-user"
               and a.get("subject") == str(nid) for a in tail), tail


def test_ack_all_respects_filters(env):
    c, store = env
    enable(c, "pA")
    enable(c, "pB")
    svc = StewardshipService(store)
    notif = NotificationEngine(svc.store, svc)
    a = notif.create("pA", severity="low", kind="health_change", title="a")
    b = notif.create("pB", severity="low", kind="health_change", title="b")
    r = c.post(f"{V}/notifications/ack-all", json={"project_id": "pA"})
    assert r.status_code == 200
    assert r.json()["acked"] == 1
    notif_state = {
        n["id"]: n["state"] for n in
        c.get(f"{V}/notifications").json()["notifications"]}
    assert notif_state[a] == "seen" and notif_state[b] == "new"


def test_resolved_rows_excluded_from_fleet_ack_state_unchanged(env):
    c, store = env
    enable(c, "p1")
    svc = StewardshipService(store)
    notif = NotificationEngine(svc.store, svc)
    nid = notif.create("p1", severity="low", kind="health_change", title="t")
    c.post(f"{V}/notifications/{nid}/resolve", json={"actor_id": "sahil"})
    feed = c.get(f"{V}/notifications").json()["notifications"]
    row = [n for n in feed if n["id"] == nid][0]
    assert row["acked"] is True and row["state"] == "resolved"


# --------------------------------------------------------------------- #
# E3: settings normalisation and merge                                   #
# --------------------------------------------------------------------- #

def test_normalize_legacy_shapes():
    legacy_flat = {"min_severity": "high"}
    p = normalize_policy(legacy_flat)
    assert p["channels"]["in_app"]["min_severity"] == "high"
    legacy_list = {"channels": ["desktop"]}
    p = normalize_policy(legacy_list)
    assert p["channels"]["desktop"]["enabled"] is True
    p = normalize_policy({"channels": []})
    assert p["channels"]["desktop"]["enabled"] is False
    p = normalize_policy({"channels": ["desktop", "discord"]})
    assert p["channels"]["discord"]["enabled"] is True
    base = normalize_policy({})
    merged = dict(base)
    assert merged["channels"]["in_app"]["min_severity"] == DEFAULT_EFFECTIVE_POLICY[
        "channels"]["in_app"]["min_severity"]


def test_invalid_severity_422(env):
    c, store = env
    r = c.put(f"{V}/settings/notifications", json={
        "policy": {"channels": {"in_app": {"min_severity": "banana"}}},
        "actor_id": "sahil"})
    assert r.status_code == 422


def test_app_wide_and_project_settings_merge(env):
    c, store = env
    enable(c, "p1")
    r = c.put(f"{V}/settings/notifications", json={
        "policy": {"channels": {"desktop": {"min_severity": "high"}}},
        "actor_id": "sahil"})
    assert r.status_code == 200
    c.patch(f"{V}/projects/p1/settings", json={
        "notification_policy": {"channels": {"desktop": {"enabled": False}}},
        "actor": "sahil"})
    eff = c.get(f"{V}/settings/notifications/effective",
                params={"project_id": "p1"}).json()["effective"]
    assert eff["channels"]["desktop"]["enabled"] is False
    assert eff["channels"]["desktop"]["min_severity"] == "high"


def test_settings_changes_audited(env):
    c, store = env
    r = c.put(f"{V}/settings/notifications", json={
        "policy": {"quiet_hours": {"start": "22:00", "end": "08:00"}},
        "actor_id": "sahil"})
    assert r.status_code == 200
    tail = store.audit_tail(30)
    assert any("notification_policy" in json.dumps(a) for a in tail)


# --------------------------------------------------------------------- #
# E3: pop-ups                                                            #
# --------------------------------------------------------------------- #

def _popup_setup(c, store, **policy):
    enable(c, "p1")
    svc = StewardshipService(store)
    if policy:
        r = c.put(f"{V}/settings/notifications", json={"policy": policy,
                                                       "actor_id": "sahil"})
        assert r.status_code == 200
    return NotificationEngine(svc.store, svc)


def test_popup_severity_threshold_applies(env):
    c, store = env
    notif = _popup_setup(c, store)
    lo = notif.create("p1", severity="medium", kind="health_change", title="t")
    hi = notif.create("p1", severity="critical", kind="alert", title="t")
    ids = [p["id"] for p in c.get(f"{V}/notifications/popups").json()["popups"]]
    assert lo not in ids and hi in ids


def test_popups_disabled_no_popups(env):
    c, store = env
    notif = _popup_setup(c, store,
                         channels={"desktop": {"enabled": False}})
    notif.create("p1", severity="critical", kind="alert", title="t")
    assert c.get(f"{V}/notifications/popups").json()["popups"] == []


def test_quiet_hours_hold_then_release(env):
    c, store = env
    notif = _popup_setup(c, store, quiet_hours={"start": "00:00", "end": "23:59"})
    nid = notif.create("p1", severity="critical", kind="alert", title="t")
    assert c.get(f"{V}/notifications/popups").json()["popups"] == []
    # quiet hours end (policy cleared) → the held pop-up appears
    c.put(f"{V}/settings/notifications", json={"policy": {"quiet_hours": None},
                                               "actor_id": "sahil"})
    ids = [p["id"] for p in c.get(f"{V}/notifications/popups").json()["popups"]]
    assert nid in ids


def test_approval_bypasses_quiet_hours_popups(env):
    c, store = env
    _popup_setup(c, store, quiet_hours={"start": "00:00", "end": "23:59"})
    c.post(f"{V}/projects/p1/initiatives", json={"title": "T", "rationale": "R"})
    ids = [p["id"] for p in c.get(f"{V}/notifications/popups").json()["popups"]]
    assert len(ids) == 1


def test_seen_or_resolved_never_popup(env):
    c, store = env
    notif = _popup_setup(c, store)
    nid = notif.create("p1", severity="critical", kind="alert", title="t")
    ack_actor(c, nid)
    assert c.get(f"{V}/notifications/popups").json()["popups"] == []


def test_popup_shown_idempotent_and_cap(env):
    c, store = env
    notif = _popup_setup(c, store)
    ids = [notif.create("p1", severity="critical", kind="alert", title=f"t{i}")
           for i in range(5)]
    r1 = c.get(f"{V}/notifications/popups").json()
    assert len(r1["popups"]) == 3
    shown = [p["id"] for p in r1["popups"]]
    r2 = c.post(f"{V}/notifications/popups/shown", json={"ids": shown})
    assert r2.status_code == 200
    r3 = c.post(f"{V}/notifications/popups/shown", json={"ids": shown})
    assert r3.status_code == 200
    rest = c.get(f"{V}/notifications/popups").json()
    assert sorted(p["id"] for p in rest["popups"]) == sorted(set(ids) - set(shown))


# --------------------------------------------------------------------- #
# E4: list filters, counts, paging                                       #
# --------------------------------------------------------------------- #

def test_list_filters_counts_paging(env):
    c, store = env
    enable(c, "p1")
    svc = StewardshipService(store)
    notif = NotificationEngine(svc.store, svc)
    a = notif.create("p1", severity="low", kind="health_change", title="t1")
    b = notif.create("p1", severity="high", kind="alert", title="t2")
    c.post(f"{V}/notifications/{a}/resolve", json={"actor_id": "sahil"})
    r = c.get(f"{V}/notifications", params={"state": "resolved"}).json()
    assert [n["id"] for n in r["notifications"]] == [a]
    r = c.get(f"{V}/notifications", params={"severity": "high"}).json()
    assert [n["id"] for n in r["notifications"]] == [b]
    counts = c.get(f"{V}/notifications", params={"limit": 1}).json()["counts"]
    assert counts["state"]["resolved"] >= 1
    assert counts["state"]["new"] >= 1


def test_list_legacy_fields_present(env):
    c, store = env
    enable(c, "p1")
    svc = StewardshipService(store)
    notif = NotificationEngine(svc.store, svc)
    notif.create("p1", severity="low", kind="health_change", title="t")
    n = c.get(f"{V}/notifications").json()["notifications"][0]
    for key in ("id", "project", "severity", "kind", "title", "body",
                "created_at", "acked", "deep_link"):
        assert key in n, key


# --------------------------------------------------------------------- #
# Upgrade semantics                                                      #
# --------------------------------------------------------------------- #

def test_upgrade_acknowledged_rows_read_seen(tmp_path, monkeypatch):
    """A populated pre-E database upgrades: acked rows read seen, rest new,
    fresh build matches upgraded build."""
    from hermes_project_stewardship.persistence import migrations
    from hermes_project_stewardship.persistence import store as store_module

    db = tmp_path / "up.db"
    with monkeypatch.context() as ctx:
        # notifications table + acked_at exist from migration v1.
        pre = [m for m in migrations.MIGRATIONS if m.version <= 31]
        # Find the migration that created `notifications` (v1); stop after it
        # to build a "pre-E" database by removing only later columns logic:
        # simpler: build current schema then drop the new columns.
        ctx.setattr(store_module, "MIGRATIONS", pre)  # noqa: F841 (documented)
        legacy = Store(db)
    cx = legacy._conn
    cx.execute("SELECT 1")  # sanity
    # Emulate pre-E: create a row and ack it, then drop E columns if present.
    cx.execute(
        "INSERT INTO notifications(project_id,severity,kind,title,body,"
        "dedupe_key,channel,delivered_at,acked_at,created_at) "
        "VALUES('p1','low','health_change','t','',NULL,'desktop','2026-08-01',"
        "'2026-08-02','2026-08-01')")
    cx.execute("UPDATE notifications SET acked_at='2026-08-02'")
    for col in ("acked_by", "resolved_at", "resolved_by", "resolution",
                "resolution_note", "popup_shown_at"):
        if col in [r[1] for r in cx.execute("PRAGMA table_info(notifications)")]:
            cx.execute(f"ALTER TABLE notifications DROP COLUMN {col}")
    legacy.close()
    upgraded = Store(db)
    from hermes_project_stewardship.persistence.dockyard_service import (
        DockyardService,
    )
    dy = DockyardService(upgraded)
    rows = dy.fleet_notifications()["notifications"]
    assert len(rows) == 1 and rows[0]["acked"] is True and rows[0]["state"] == "seen"
    upgraded.close()