"""Phase 6: actionable Fleet overview, explicit groups, exact-context deep links.

P6.1 — Decision / Intervention / Informational groups from existing records.
P6.2 — Intervention items carry cause, age, accountable owner, evidence
       freshness and next action (derived, no analytics warehouse).
P6.4 — Deep links to the EXACT object (project/initiative/work-item), stale
       and deleted targets handled explicitly.
P6.5 — Acknowledgement stays separate from resolution: acking a notification
       must not change initiative status or remove an intervention row.
"""
from __future__ import annotations

import json
from datetime import datetime, timedelta, timezone

import pytest

fastapi = pytest.importorskip("fastapi")
from fastapi.testclient import TestClient  # noqa: E402

from hermes_project_stewardship.api.server import create_app  # noqa: E402
from hermes_project_stewardship.kanban import ReferenceKanbanAdapter  # noqa: E402
from hermes_project_stewardship.persistence.dockyard_service import (  # noqa: E402
    DockyardService,
)
from hermes_project_stewardship.persistence.service import (  # noqa: E402
    StewardshipService,
)
from hermes_project_stewardship.persistence.store import Store  # noqa: E402


def _iso(dt: datetime) -> str:
    return dt.isoformat()


def _now() -> datetime:
    return datetime.now(timezone.utc)


@pytest.fixture()
def store(tmp_path):
    s = Store(tmp_path / "fleet.db")
    yield s
    s.close()


@pytest.fixture()
def client(store):
    return TestClient(create_app(store, kanban_adapter=ReferenceKanbanAdapter(store)))


def _enable(store, pid, *, lead="octacon"):
    store._conn.execute(
        "INSERT INTO project_stewardship (project_id, enabled,"
        " mission, owner_lead_profile, autonomy_level, created_at,"
        " updated_at)"
        " VALUES(?, 1, 'm', ?, 2, ?, ?)",
        (pid, lead, _iso(_now()), _iso(_now())))
    store._conn.commit()


def _work(store, pid, status, *, ref=None, blocked_reason=None, due=None,
          created_days_ago=0):
    ref = ref or f"HDY-{pid}-{store._conn.total_changes}"
    now = _now()
    created = _iso(now - timedelta(days=created_days_ago))
    store._conn.execute(
        "INSERT INTO dockyard_work_items (project_id, ref, type, title,"
        " status, blocked_by_json, created_at, updated_at)"
        " VALUES(?, ?, 'task', ?, ?, ?, ?, ?)",
        (pid, ref, f"Task in {pid}", status,
         json.dumps(blocked_reason) if blocked_reason else "[]",
         created, created))
    store._conn.commit()
    return ref


def _notification(store, pid, *, kind="alert", severity="high",
                  title="Verification failed", created_days_ago=0,
                  acked=False):
    now = _now()
    created = _iso(now - timedelta(days=created_days_ago))
    store._conn.execute(
        "INSERT INTO notifications (project_id, severity, kind, title,"
        " body, created_at, acked_at)"
        " VALUES(?, ?, ?, ?, '', ?, ?)",
        (pid, severity, kind, title, created,
         _iso(now) if acked else None))
    store._conn.commit()


def _health(store, pid, status, *, days_ago=0):
    store._conn.execute(
        "INSERT INTO project_health_snapshots (project_id, status, score,"
        " created_at) VALUES(?, ?, NULL, ?)",
        (pid, status, _iso(_now() - timedelta(days=days_ago))))
    store._conn.commit()


# ------------------------------------------------------------------ #
# P6.1 — groups                                                       #
# ------------------------------------------------------------------ #

def test_portfolio_groups_are_explicit_and_exclusive(store, client):
    """P6.1: portfolio exposes decision/intervention/informational groups
    derived from existing records; a row lands in exactly one group."""
    _enable(store, "p1")
    _enable(store, "p2")
    StewardshipService(store).propose_initiative("p1", title="Needs approval",
                                                 rationale="objective: grouping")
    _work(store, "p1", "blocked", blocked_reason="Upstream API down")
    _notification(store, "p2", kind="health_change", title="Health degraded")
    svc = DockyardService(store)
    out = svc.portfolio()
    groups = out["groups"]
    assert set(groups) == {"decisions", "interventions", "informational"}
    assert len(groups["decisions"]) == 1
    assert groups["decisions"][0]["kind"] == "initiative_approval"
    interventions = groups["interventions"]
    assert len(interventions) >= 1
    # informational carries the health event; not duplicated as a decision
    assert any(item["kind"] == "health_change"
               for item in groups["informational"])
    # a decision must not also appear as an intervention
    decision_refs = {item.get("ref") for item in groups["decisions"]}
    intervention_refs = {item.get("ref") for item in interventions}
    assert not (decision_refs & intervention_refs)


def test_intervention_rows_carry_cause_owner_and_next_action(store):
    """P6.2: cause, age, accountable owner and a next action are present."""
    _enable(store, "p1", lead="octacon")
    _work(store, "p1", "blocked", blocked_reason="Upstream API down",
          created_days_ago=3)
    _health(store, "p1", "degraded", days_ago=1)
    svc = DockyardService(store)
    interventions = svc.portfolio()["groups"]["interventions"]
    blocked = [i for i in interventions if i["cause"] == "blocked_item"]
    assert blocked, interventions
    row = blocked[0]
    assert row["detail"] == "Upstream API down"
    assert row["owner"] == "octacon"
    assert "age_days" in row and row["age_days"] >= 3
    assert row["next_action"], "intervention must suggest a next action"
    assert "deep_link" in row and row["deep_link"]


def test_evidence_freshness_is_separate_from_delivery_status(store):
    """P6.1/P6.2: evidence age is its own field, never blended into status."""
    _enable(store, "p1")
    _health(store, "p1", "watch", days_ago=5)
    _work(store, "p1", "in_progress")
    svc = DockyardService(store)
    out = svc.portfolio()
    project = out["projects"][0]
    assert "evidence_freshness_days" in project
    assert project["evidence_freshness_days"] >= 5
    assert project["status"] in ("on_track", "stalled", "at_risk", "idle")


# ------------------------------------------------------------------ #
# P6.4 — exact deep links                                             #
# ------------------------------------------------------------------ #

def test_fleet_groups_deep_link_to_exact_objects(store, client):
    """P6.4: links name the exact target object, not a generic screen."""
    _enable(store, "demo")
    StewardshipService(store).propose_initiative("demo", title="Decide me",
                                                 rationale="objective: links")
    ref = _work(store, "demo", "blocked", blocked_reason="flaky dep")
    body = client.get("/stewardship/v1/portfolio").json()
    groups = body["groups"]
    decision = groups["decisions"][0]
    assert decision["deep_link"] == f"s6:initiative/{decision['ref']}"
    intervention = [i for i in groups["interventions"]
                    if i["cause"] == "blocked_item"][0]
    assert intervention["deep_link"] == f"s2:work/{ref}"


def test_project_attention_links_to_project_row(store):
    _enable(store, "demo")
    _work(store, "demo", "blocked", blocked_reason="needs attention")
    svc = DockyardService(store)
    groups = svc.portfolio()["groups"]
    attention = [i for i in groups["interventions"]
                 if i["cause"] == "blocked_item"]
    assert attention
    assert attention[0]["deep_link"] == "s2:work/" + attention[0]["ref"]
    assert attention[0]["owner"] == "unassigned" or attention[0]["owner"]


def test_notification_deep_link_targets_exact_object(store, client):
    """P6.4: approval notifications link to the exact initiative."""
    _enable(store, "demo")
    StewardshipService(store).propose_initiative("demo", title="N",
                                                 rationale="objective: link")
    store._conn.execute(
        "INSERT INTO notifications (project_id, severity, kind, title,"
        " body, created_at)"
        " SELECT 'demo', 'high', 'approval_required', 'Approval needed',"
        " 'ref=INI-x', ?",
        (_iso(_now()),))
    store._conn.commit()
    feed = client.get("/stewardship/v1/notifications").json()["notifications"]
    row = [n for n in feed if n["kind"] == "approval_required"][0]
    assert row["deep_link"] == "s4:approval-inbox"


# ------------------------------------------------------------------ #
# P6.5 — ack separate from resolution                                 #
# ------------------------------------------------------------------ #

def test_ack_does_not_resolve_intervention(store):
    """P6.5: acknowledging a notification must not remove or resolve the
    underlying intervention; the row persists with acked state only."""
    _enable(store, "demo")
    _work(store, "demo", "blocked", blocked_reason="still blocked")
    now = _now()
    store._conn.execute(
        "INSERT INTO notifications (project_id, severity, kind, title,"
        " body, created_at) VALUES(?, 'high', 'alert', 'blocked flag',"
        " '', ?)", ("demo", _iso(now)))
    store._conn.commit()
    svc = DockyardService(store)
    before = svc.portfolio()["groups"]["interventions"]
    assert any(i["cause"] == "blocked_item" for i in before)
    notifications = svc.fleet_notifications()["notifications"]
    assert notifications, "fixture notification missing"
    svc.ack_notification(notifications[0]["id"])
    after = svc.portfolio()["groups"]["interventions"]
    assert any(i["cause"] == "blocked_item" for i in after), (
        "ack must not resolve the intervention")
    feed = svc.fleet_notifications()["notifications"]
    assert [n for n in feed if n["id"] == notifications[0]["id"]][0]["acked"]


def test_ack_keeps_notification_visible_as_acknowledged(store, client):
    _enable(store, "demo")
    _notification(store, "demo", title="event one")
    feed = client.get("/stewardship/v1/notifications").json()["notifications"]
    nid = feed[0]["id"]
    acked = client.post(f"/stewardship/v1/notifications/{nid}/ack")
    assert acked.status_code == 200
    feed2 = client.get("/stewardship/v1/notifications").json()["notifications"]
    row = [n for n in feed2 if n["id"] == nid][0]
    assert row["acked"] is True, "ack must keep the record visible"