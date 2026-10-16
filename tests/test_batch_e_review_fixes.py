"""Batch E review fixes: RED tests for KENSEI-REVIEW-E-BACKEND.md bugs 1-8.

One test per must-fix bug (plus the small fixes), each written against the
reviewer's acceptance criteria. Every test here must FAIL on 173b85c (RED)
and pass after the fix (GREEN).
"""
from __future__ import annotations

from datetime import datetime, timezone

import pytest

fastapi = pytest.importorskip("fastapi")
from fastapi.testclient import TestClient  # noqa: E402

from hermes_project_stewardship.api.server import create_app  # noqa: E402
from hermes_project_stewardship.events import (  # noqa: E402
    HEALTH_CHANGED,
)
from hermes_project_stewardship.events.notifications import (  # noqa: E402
    NotificationEngine,
)
from hermes_project_stewardship.kanban import ReferenceKanbanAdapter  # noqa: E402
from hermes_project_stewardship.persistence.service import (  # noqa: E402
    StewardshipService,
)
from hermes_project_stewardship.persistence.store import Store  # noqa: E402

V = "/stewardship/v1"


def pinned(ts: str):
    t = datetime.fromisoformat(ts)
    return lambda: t


@pytest.fixture()
def env(tmp_path):
    store = Store(tmp_path / "e.db")
    app = create_app(store, kanban_adapter=ReferenceKanbanAdapter(store))
    c = TestClient(app)
    c.headers.update({"Authorization": "Bearer test-token"})
    yield c, store
    store.close()


def enable(c, pid="p1"):
    r = c.post(f"{V}/projects/{pid}/enable", json={
        "project_id": pid, "mission": "m", "lead_profile": "lead",
        "autonomy_level": 2,
    })
    assert r.status_code == 200


def propose(c, pid, title="T"):
    r = c.post(f"{V}/projects/{pid}/initiatives",
               json={"title": title, "rationale": "R"})
    j = r.json()
    ini = j if "ref" in j else j.get("initiative", {})
    return r.status_code, ini.get("ref"), ini.get("status")


def approvals(c, pid):
    return [n for n in c.get(f"{V}/notifications",
                             params={"project_id": pid}).json()["notifications"]
            if n["kind"] == "approval_required"]


# --------------------------------------------------------------------- #
# Bug 1: legacy stored policy shapes must never silence notifications    #
# --------------------------------------------------------------------- #

def test_bug1_panel_shape_still_notifies(env):
    """The project Settings panel saves {severity_threshold, digest}; that
    stored shape must not stop notifications."""
    c, store = env
    enable(c, "pa1")
    r = c.patch(f"{V}/projects/pa1/settings", json={
        "notification_policy": {"severity_threshold": "medium", "digest": "daily"},
        "actor": "sahil"})
    assert r.status_code == 200
    code, ref, status = propose(c, "pa1")
    assert status == "pending_approval"
    assert len(approvals(c, "pa1")) == 1


def test_bug1_real_db_shape_still_notifies(env):
    """The real DB stores {digest, minimum_severity} for payments-relaunch.

    That shape is pre-existing stored data: it is never 422'd on READ (the
    unknown minimum_severity lands under `ignored` and the threshold falls
    back), and the notification still fires. New SAVES reject it with 422.
    """
    c, store = env
    enable(c, "pa2")
    store._conn.execute(
        "UPDATE project_stewardship SET notification_policy_json=?"
        " WHERE project_id='pa2'",
        ('{"digest": "daily", "minimum_severity": "warning"}',))
    store._conn.commit()
    eff = c.get(f"{V}/settings/notifications/effective",
                params={"project_id": "pa2"}).json()["effective"]
    assert "minimum_severity" in (eff.get("ignored") or [])
    code, ref, status = propose(c, "pa2")
    assert status == "pending_approval"
    assert len(approvals(c, "pa2")) == 1


def test_bug1_unknown_key_422_on_save(env):
    """Saving (app-wide PUT) still rejects unknown keys with 422."""
    c, store = env
    r = c.put(f"{V}/settings/notifications", json={
        "policy": {"banana": True}, "actor_id": "sahil"})
    assert r.status_code == 422


def test_bug1_carried_keys_accepted_on_save(env):
    """digest and max_open_initiatives are legitimate notification-policy
    keys (propose_initiative reads the latter) and must save cleanly."""
    c, store = env
    r = c.put(f"{V}/settings/notifications", json={
        "policy": {"digest": "daily", "max_open_initiatives": 3},
        "actor_id": "sahil"})
    assert r.status_code == 200


def test_bug1_read_merges_new_key_over_old(env):
    """A pre-existing stored policy (written before this change, so it can
    carry unknown keys) reads back safely: the new key wins over the old
    alias, and unknown keys are reported under 'ignored', not errors."""
    c, store = env
    enable(c, "pa3")
    store._conn.execute(
        "UPDATE project_stewardship SET notification_policy_json=?"
        " WHERE project_id='pa3'",
        ('{"min_severity": "critical",'
         ' "channels": {"in_app": {"min_severity": "low"}},'
         ' "mystery_key": 1}',))
    store._conn.commit()
    eff = c.get(f"{V}/settings/notifications/effective",
                params={"project_id": "pa3"}).json()["effective"]
    assert eff["channels"]["in_app"]["min_severity"] == "low"
    assert "mystery_key" in (eff.get("ignored") or [])


def test_bug1_project_patch_unknown_key_422(env):
    """Saving (project settings PATCH) rejects unknown keys with 422."""
    c, store = env
    enable(c, "pa4")
    r = c.patch(f"{V}/projects/pa4/settings", json={
        "notification_policy": {"banana": True}, "actor": "sahil"})
    assert r.status_code == 422


# --------------------------------------------------------------------- #
# Bug 2: Hermes plugin path must raise approval notifications            #
# --------------------------------------------------------------------- #

def test_bug2_plugin_tool_proposal_notifies(env):
    c, store = env
    enable(c, "pb")
    from hermes_project_stewardship.plugin import PluginState, tool_steward_propose_initiative
    try:
        PluginState.reset()
        PluginState.db_path = store.db_path
        out = tool_steward_propose_initiative("pb", title="Agent proposal",
                                              rationale="R")
        assert out.get("status") == "pending_approval"
    finally:
        PluginState.reset()
    assert len(approvals(c, "pb")) == 1


def test_bug2_all_proposing_constructions_wired():
    """Guard: every production StewardshipService( construction that can
    propose or decide goes through the shared wiring function. Read-only
    constructions are named here as explicit exceptions."""
    from pathlib import Path
    root = Path(__file__).parents[1]
    read_only_exceptions = {
        # reads settings / reports only; never proposes or decides
        "src/hermes_project_stewardship/persistence/dockyard_service.py",
        # read-only projection over the same store; proposals flow through
        # the wired service constructed by the host
        "src/hermes_project_stewardship/persistence/canonical_work_service.py",
        # read-only convenience store used by desktop dev tooling
        "hermes_dockyard_plugin/desktop/disposable-backend.py",
        # P's plan documents: uploads/reads project content; never proposes
        # or decides initiatives
        "src/hermes_project_stewardship/persistence/canvas_plan_document.py",
    }
    offenders = []
    for py in root.rglob("*.py"):
        rel = py.relative_to(root).as_posix()
        if rel.startswith((".venv", "build", "dist", "node_modules")):
            continue
        # The guard covers PRODUCTION constructions only; test files build
        # bare services on purpose (they construct engines directly).
        if not (rel.startswith("src/") or rel.startswith("hermes_dockyard_plugin/")
                or rel.startswith("examples/")):
            continue
        if rel in read_only_exceptions:
            continue
        text = py.read_text(encoding="utf-8", errors="replace")
        if "StewardshipService(" not in text:
            continue
        if "wire_notification_stack" not in text:
            offenders.append(rel)
    assert offenders == [], (
        f"StewardshipService constructions missing notification wiring: {offenders}")


# --------------------------------------------------------------------- #
# Bug 3: sparse project override must not reset app-wide settings        #
# --------------------------------------------------------------------- #

def test_bug3_partial_override_keeps_app_wide_values(env):
    c, store = env
    enable(c, "pd1")
    r = c.put(f"{V}/settings/notifications", json={
        "policy": {"quiet_hours": {"start": "22:00", "end": "07:00"},
                   "channels": {"desktop": {"min_severity": "critical"}}},
        "actor_id": "sahil"})
    assert r.status_code == 200
    r = c.patch(f"{V}/projects/pd1/settings", json={
        "notification_policy": {"channels": {"in_app": {"min_severity": "medium"}}},
        "actor": "sahil"})
    assert r.status_code == 200
    eff = c.get(f"{V}/settings/notifications/effective",
                params={"project_id": "pd1"}).json()["effective"]
    assert eff["quiet_hours"] == {"start": "22:00", "end": "07:00"}
    assert eff["channels"]["desktop"]["min_severity"] == "critical"
    assert eff["channels"]["in_app"]["min_severity"] == "medium"


# --------------------------------------------------------------------- #
# Bug 4: verification-failed alerts resolve when health returns          #
# --------------------------------------------------------------------- #

def test_bug4_verification_failed_alert_resolves_on_healthy(env):
    c, store = env
    enable(c, "pc")
    ne = NotificationEngine(store, StewardshipService(store))
    nid = ne.create("pc", severity="high", kind="alert",
                    title="Verification failed: pc",
                    dedupe_key="stewardship.verification.failed:cycle-1")
    ne.on_event({"event_type": HEALTH_CHANGED, "project_id": "pc",
                 "subject": "c", "payload": {"from": "degraded", "to": "healthy"}})
    row = [n for n in c.get(f"{V}/notifications",
                            params={"project_id": "pc"}).json()["notifications"]
           if n["id"] == nid][0]
    assert row["state"] == "resolved"


# --------------------------------------------------------------------- #
# Bug 5: ack-all counts and audits only rows it actually changes         #
# --------------------------------------------------------------------- #

def test_bug5_ack_all_second_run_zero_no_audit(env):
    c, store = env
    enable(c, "ph")
    ne = NotificationEngine(store, StewardshipService(store))
    n1 = ne.create("ph", severity="high", kind="alert", title="one", dedupe_key="h1")
    ne.create("ph", severity="high", kind="alert", title="two", dedupe_key="h2")
    c.post(f"{V}/notifications/{n1}/ack", json={"actor_id": "alice"})
    first = c.post(f"{V}/notifications/ack-all",
                   json={"project_id": "ph", "actor_id": "bob"}).json()["acked"]
    second = c.post(f"{V}/notifications/ack-all",
                    json={"project_id": "ph", "actor_id": "carol"}).json()["acked"]
    assert first == 1
    assert second == 0
    aud = [r[0] for r in store._conn.execute(
        "SELECT actor FROM stewardship_audit_log"
        " WHERE action='notification.acked' AND subject=? ORDER BY rowid",
        (str(n1),))]
    assert aud == ["alice"]


def test_bug5_ack_all_severity_filter(env):
    c, store = env
    enable(c, "ph2")
    ne = NotificationEngine(store, StewardshipService(store))
    lo = ne.create("ph2", severity="low", kind="health_change", title="lo")
    hi = ne.create("ph2", severity="high", kind="alert", title="hi")
    n = c.post(f"{V}/notifications/ack-all",
               json={"project_id": "ph2", "severity": "high",
                     "actor_id": "bob"}).json()["acked"]
    assert n == 1
    states = {row["id"]: row["state"] for row in
              c.get(f"{V}/notifications",
                    params={"project_id": "ph2"}).json()["notifications"]}
    assert states[hi] == "seen" and states[lo] == "new"


# --------------------------------------------------------------------- #
# Bug 6: quiet hours follow UK local time (zone injectable)              #
# --------------------------------------------------------------------- #

def test_bug6_quiet_hours_use_local_zone():
    """21:30 UTC on a summer date is 22:30 Europe/London, inside 22:00-07:00."""
    from hermes_project_stewardship.events.notifications import in_quiet_hours
    from zoneinfo import ZoneInfo

    policy = {"quiet_hours": {"start": "22:00", "end": "07:00"}}
    utc_moment = datetime(2026, 7, 15, 21, 30, tzinfo=timezone.utc)
    local = utc_moment.astimezone(ZoneInfo("Europe/London"))
    assert in_quiet_hours(policy, local) is True


def test_bug6_engine_default_zone_injectable(tmp_path, monkeypatch):
    """The engine accepts an injectable tz and defaults to the machine zone;
    the effective-settings response names the zone.

    The machine zone is pinned to Europe/London here: the 22:30 hold below is
    UK local time, and CI runners (UTC) must reach the same verdict as a UK
    machine. Which zone the machine reports is _machine_zone's own contract,
    covered by its tests; this one proves the engine DEFAULTS to it."""
    import hermes_project_stewardship.events.notifications as notifications

    monkeypatch.setattr(notifications, "_machine_zone", lambda: "Europe/London")
    c = None
    store = Store(tmp_path / "tz.db", clock=pinned("2026-07-15T21:30:00+00:00"))
    app = create_app(store, kanban_adapter=ReferenceKanbanAdapter(store))
    c = TestClient(app)
    c.headers.update({"Authorization": "Bearer test-token"})
    try:
        enable(c, "pg1")
        r = c.put(f"{V}/settings/notifications", json={
            "policy": {"quiet_hours": {"start": "22:00", "end": "07:00"}},
            "actor_id": "sahil"})
        assert r.status_code == 200
        eff = c.get(f"{V}/settings/notifications/effective",
                    params={"project_id": "pg1"}).json()["effective"]
        assert eff.get("timezone") == "Europe/London", \
            "effective settings must name the machine's time zone"
        ne = app.state.notification_engine
        ne.create("pg1", severity="high", kind="alert", title="a", dedupe_key="g")
        kinds = [p["kind"] for p in
                 c.get(f"{V}/notifications/popups").json()["popups"]]
        assert kinds == [], "22:30 UK local must be a quiet hold"
    finally:
        store.close()


# --------------------------------------------------------------------- #
# Bug 7: bypass_quiet_hours list actually controls approvals             #
# --------------------------------------------------------------------- #

def test_bug7_empty_bypass_holds_approvals(tmp_path):
    store = Store(tmp_path / "byp.db", clock=pinned("2026-07-15T12:00:00+00:00"))
    app = create_app(store, kanban_adapter=ReferenceKanbanAdapter(store))
    c = TestClient(app)
    c.headers.update({"Authorization": "Bearer test-token"})
    try:
        enable(c, "pf")
        r = c.put(f"{V}/settings/notifications", json={
            "policy": {"quiet_hours": {"start": "00:00", "end": "23:59"},
                       "bypass_quiet_hours": []},
            "actor_id": "sahil"})
        assert r.status_code == 200
        app.state.notification_engine.create(
            "pf", severity="high", kind="approval_required",
            title="appr", dedupe_key="approval_required:X", ref="X")
        kinds = [p["kind"] for p in
                 c.get(f"{V}/notifications/popups").json()["popups"]]
        assert "approval_required" not in kinds
    finally:
        store.close()


# --------------------------------------------------------------------- #
# Bug 8: "and N more" counts only rows that pass every pop-up rule       #
# --------------------------------------------------------------------- #

def test_bug8_more_excludes_never_popups(tmp_path):
    store = Store(tmp_path / "more.db", clock=pinned("2026-07-15T12:00:00+00:00"))
    app = create_app(store, kanban_adapter=ReferenceKanbanAdapter(store))
    c = TestClient(app)
    c.headers.update({"Authorization": "Bearer test-token"})
    try:
        enable(c, "pe")
        ne = app.state.notification_engine
        for i in range(5):
            ne.create("pe", severity="low", kind="health_change",
                      title=f"low {i}", dedupe_key=f"x{i}")
        ne.create("pe", severity="high", kind="alert", title="high",
                  dedupe_key="y")
        p = c.get(f"{V}/notifications/popups").json()
        assert len(p["popups"]) == 1 and p["more"] == 0
    finally:
        store.close()


# --------------------------------------------------------------------- #
# Small fixes                                                            #
# --------------------------------------------------------------------- #

def test_small_single_ack_path(tmp_path):
    """DockyardService.ack_notification either delegates to the engine
    (actor + audit) or is gone."""
    from hermes_project_stewardship.persistence.dockyard_service import DockyardService
    store = Store(tmp_path / "ack.db")
    app = create_app(store, kanban_adapter=ReferenceKanbanAdapter(store))
    c = TestClient(app)
    c.headers.update({"Authorization": "Bearer test-token"})
    try:
        enable(c, "pack")
        ne = app.state.notification_engine
        nid = ne.create("pack", severity="high", kind="alert", title="t")
        dy = DockyardService(store)
        if hasattr(dy, "ack_notification"):
            dy.ack_notification(nid)
            row = [n for n in c.get(f"{V}/notifications",
                                    params={"project_id": "pack"}).json()["notifications"]
                   if n["id"] == nid][0]
            assert row["acked_by"], "legacy ack must record the actor"
            aud = store._conn.execute(
                "SELECT 1 FROM stewardship_audit_log"
                " WHERE action='notification.acked' AND subject=?",
                (str(nid),)).fetchone()
            assert aud, "legacy ack must write an audit row"
    finally:
        store.close()


def test_small_decision_hook_errors_logged(env, monkeypatch):
    """_notify_decisions logs hook failures instead of discarding them."""
    c, store = env
    logged = []
    monkeypatch.setattr("hermes_project_stewardship.persistence.service.logger",
                        type("L", (), {"exception": staticmethod(
                            lambda *a, **k: logged.append(a)),
                            "error": staticmethod(
                            lambda *a, **k: logged.append(a)),
                            "warning": staticmethod(
                            lambda *a, **k: logged.append(a))}))
    enable(c, "plog")
    svc = StewardshipService(store)
    svc.on_decision(lambda *a: 1 / 0)
    svc._notify_decisions("initiative.approved", "REF-1", "plog", {})
    assert logged, "hook failure must be logged, not silently discarded"
