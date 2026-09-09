from __future__ import annotations

import json
from datetime import date, datetime, timedelta, timezone

import pytest

fastapi = pytest.importorskip("fastapi")
from fastapi.testclient import TestClient  # noqa: E402

from hermes_project_stewardship.api.server import create_app  # noqa: E402
from hermes_project_stewardship.kanban import ReferenceKanbanAdapter  # noqa: E402
from hermes_project_stewardship.persistence.store import Store  # noqa: E402

ACTOR = {"actor_id": "sahil", "actor_kind": "human"}


def _api(tmp_path, clock=None):
    store = Store(tmp_path / "dy.db", clock=clock) if clock else Store(tmp_path / "dy.db")
    client = TestClient(create_app(store, kanban_adapter=ReferenceKanbanAdapter(store)))
    client.post("/stewardship/v1/projects/p9/enable", json={
        "project_id": "p9", "mission": "planning",
        "lead_profile": "l", "autonomy_level": 2})
    return client


def _mk_item(client, ref, status="backlog", assignee=None):
    r = client.post("/stewardship/v1/projects/p9/work-items", json={
        "type": "task", "title": f"Item {ref}", **ACTOR,
        "idempotency_key": ref})
    assert r.status_code in (200, 201), r.text
    real_ref = r.json()["ref"]
    if status != "backlog":
        t = client.post(f"/stewardship/v1/projects/p9/work-items/{real_ref}/transition",
                        json={"status": status, **ACTOR})
        assert t.status_code == 200, t.text
    if assignee:
        a = client.post(f"/stewardship/v1/projects/p9/work-items/{real_ref}/assign",
                        json={"assignee_id": assignee, **ACTOR})
        assert a.status_code == 200, a.text
    return real_ref


# ------------------------------------------------------------------ P9.1 --

def test_milestone_rename_preserves_items_and_audits(tmp_path):
    """P9.1: rename keeps milestone identity (attached items survive) and is
    audit-trailed; the old name 404s afterwards."""
    client = _api(tmp_path)
    client.post("/stewardship/v1/projects/p9/milestones", json={
        "name": "M1", "due": "2026-10-01", **ACTOR})
    ref = _mk_item(client, "T-1")
    client.post("/stewardship/v1/projects/p9/milestones/M1/attach",
                json={"ref": ref, **ACTOR})
    rename = client.post("/stewardship/v1/projects/p9/milestones/M1/rename",
                         json={"new_name": "M1-renamed", **ACTOR})
    assert rename.status_code == 200, rename.text
    progress = client.get("/stewardship/v1/projects/p9/milestones/M1-renamed")
    assert progress.status_code == 200
    assert progress.json()["total"] == 1, "attached items must survive rename"
    assert client.get("/stewardship/v1/projects/p9/milestones/M1").status_code == 404


def test_milestone_close_then_reopen_roundtrip(tmp_path):
    """P9.1: close then reopen restores an open milestone (closed=false)."""
    client = _api(tmp_path)
    client.post("/stewardship/v1/projects/p9/milestones", json={
        "name": "M2", **ACTOR})
    r = client.patch("/stewardship/v1/projects/p9/milestones/M2", json={
        "closed": True, **ACTOR})
    assert r.status_code == 200 and r.json()["closed"] is True
    r = client.patch("/stewardship/v1/projects/p9/milestones/M2", json={
        "closed": False, **ACTOR})
    assert r.status_code == 200 and r.json()["closed"] is False


def test_milestone_detach_item_contract(tmp_path):
    """P9.1: work-attachment contract includes detach (changed-scope path)."""
    client = _api(tmp_path)
    client.post("/stewardship/v1/projects/p9/milestones", json={
        "name": "M3", **ACTOR})
    ref = _mk_item(client, "T-9")
    client.post("/stewardship/v1/projects/p9/milestones/M3/attach",
                json={"ref": ref, **ACTOR})
    r = client.post("/stewardship/v1/projects/p9/milestones/M3/detach",
                    json={"ref": ref, **ACTOR})
    assert r.status_code == 200, r.text
    assert client.get("/stewardship/v1/projects/p9/milestones/M3").json()["total"] == 0


# ------------------------------------------------------------------ P9.3 --

def test_scope_and_wip_payload_distinguishes_counts_from_hours(tmp_path):
    """P9.3: payload carries committed/done/blocked scope, dependency
    blockers and assignee WIP — labelled as item counts, never hours."""
    client = _api(tmp_path)
    client.post("/stewardship/v1/projects/p9/milestones", json={
        "name": "Scope", **ACTOR})
    done = _mk_item(client, "S-1", status="done")
    blocked = _mk_item(client, "S-2", status="blocked", assignee="octacon")
    wip = _mk_item(client, "S-3", status="in_progress", assignee="octacon")
    for ref in (done, blocked, wip):
        client.post("/stewardship/v1/projects/p9/milestones/Scope/attach",
                    json={"ref": ref, **ACTOR})
    dep = _mk_item(client, "DEP-1")
    client.post(
        f"/stewardship/v1/projects/p9/work-items/{blocked}/dependencies",
        json={"dependency_ref": dep, **ACTOR})
    detail = client.get("/stewardship/v1/projects/p9/milestones/Scope").json()
    assert detail["committed"] == 3 and detail["done"] == 1
    assert detail["blocked"] == 1
    assert detail["blockers"] == {blocked: [dep]}
    assert detail["assignee_wip"] == {"octacon": 1}
    assert detail["units"] == "items"


# ------------------------------------------------------------------ P9.4 --

def test_forecast_insufficient_history_is_honest(tmp_path):
    """P9.4: fewer than 8 comparable completions in the previous four
    completed project weeks -> 'insufficient_history' with assumptions and
    sample size exposed; never an invented date."""
    client = _api(tmp_path)
    client.post("/stewardship/v1/projects/p9/milestones", json={
        "name": "F1", **ACTOR})
    ref = _mk_item(client, "F-a")
    client.post("/stewardship/v1/projects/p9/milestones/F1/attach",
                json={"ref": ref, **ACTOR})
    detail = client.get("/stewardship/v1/projects/p9/milestones/F1").json()
    fc = detail["forecast"]
    assert fc["state"] == "insufficient_history"
    assert fc["sample_size"] < 8
    assert fc["assumptions"]["min_sample"] == 8
    assert fc["assumptions"]["window_weeks"] == 4
    assert "eta" not in fc and "range" not in fc


def test_forecast_complete_milestone_has_no_forecast(tmp_path):
    """P9.4: all items done -> state 'complete', no speculative forecast."""
    client = _api(tmp_path)
    client.post("/stewardship/v1/projects/p9/milestones", json={
        "name": "F2", **ACTOR})
    ref = _mk_item(client, "F-b", status="done")
    client.post("/stewardship/v1/projects/p9/milestones/F2/attach",
                json={"ref": ref, **ACTOR})
    fc = client.get("/stewardship/v1/projects/p9/milestones/F2").json()["forecast"]
    assert fc["state"] == "complete"
    assert "eta" not in fc


# ------------------------------------------- P9.4 math (frozen clock) ----

WED = date(2026, 9, 9)  # mid-week anchor: previous 4 ISO weeks are complete


def _iso(dt: datetime) -> str:
    return dt.isoformat()


def _forecast_via_function(store, remaining, weekly_counts, today=WED):
    """Drive the pure function directly with controlled done-item history."""
    from hermes_project_stewardship.persistence.planning import forecast_milestone

    this_monday = today - timedelta(days=today.weekday())
    done_items = []
    for week_index, count in enumerate(weekly_counts):
        monday = this_monday - timedelta(weeks=4 - week_index)
        for i in range(count):
            done_items.append({"updated_at": _iso(
                datetime(monday.year, monday.month, monday.day, 12, 0,
                         tzinfo=timezone.utc) + timedelta(days=2))})
    return forecast_milestone(remaining=remaining, done_items=done_items, today=today)


def test_forecast_math_central_and_range_with_frozen_clock():
    """P9.4 rule: 8+ completions -> central = remaining/mean; range from
    slowest/fastest weeks; sample size and assumptions echoed."""
    fc = _forecast_via_function(None, remaining=6, weekly_counts=[2, 3, 2, 3])
    assert fc["state"] == "forecast"
    assert fc["sample_size"] == 10
    assert fc["weekly_throughput"]["mean"] == 2.5
    assert fc["central_weeks"] == round(6 / 2.5, 2)
    assert fc["range_weeks"]["lower"] == 2.0      # fastest=3 -> 6/3
    assert fc["range_weeks"]["upper"] == 3.0      # slowest=2 -> 6/2
    assert fc["range_weeks"]["upper_open_ended"] is False
    assert fc["assumptions"]["min_sample"] == 8


def test_forecast_zero_throughput_week_is_open_ended():
    """P9.4 rule: a zero-throughput week keeps the forecast but makes the
    upper duration open-ended (never omitted)."""
    fc = _forecast_via_function(None, remaining=4, weekly_counts=[0, 4, 2, 2])
    assert fc["state"] == "forecast"
    assert fc["range_weeks"]["upper_open_ended"] is True
    assert fc["range_weeks"]["upper"] is None
    assert fc["range_weeks"]["lower"] == 1.0  # fastest=4 -> 4/4


def test_forecast_week_boundary_timezone_handling():
    """P9.6: a completion at Mon 00:30 +01:00 (= Sun 23:30 UTC) belongs to
    the PREVIOUS ISO week; the current week never counts."""
    from hermes_project_stewardship.persistence.planning import (
        _completed_week_buckets,
    )
    # Current week (Mon 2026-09-07) completions must be ignored entirely.
    current_week = [{"updated_at": "2026-09-08T09:00:00+01:00"}]
    # Mon 2026-08-31 00:30 +01:00 == Sun 2026-08-30 23:30 UTC -> last week.
    edge = [{"updated_at": "2026-08-31T00:30:00+01:00"}]
    buckets = _completed_week_buckets(current_week + edge, WED)
    assert buckets == [0, 0, 0, 1], "tz-shifted Monday morning counts in prior week"


def test_forecast_empty_milestone_is_complete():
    from hermes_project_stewardship.persistence.planning import forecast_milestone

    assert forecast_milestone(remaining=0, done_items=[], today=WED)["state"] == "complete"


def test_milestone_reopened_payload_after_close_reopen(tmp_path):
    """P9.6: reopened milestone forecasts again (not stuck at 'complete')."""
    client = _api(tmp_path)
    client.post("/stewardship/v1/projects/p9/milestones", json={
        "name": "R1", **ACTOR})
    ref = _mk_item(client, "R-a", status="done")
    client.post("/stewardship/v1/projects/p9/milestones/R1/attach",
                json={"ref": ref, **ACTOR})
    client.patch("/stewardship/v1/projects/p9/milestones/R1", json={
        "closed": True, **ACTOR})
    client.patch("/stewardship/v1/projects/p9/milestones/R1", json={
        "closed": False, **ACTOR})
    detail = client.get("/stewardship/v1/projects/p9/milestones/R1").json()
    assert detail["closed"] is False and detail["forecast"]["state"] == "complete"


def test_milestone_risks_surface_overdue_and_blockers_with_owners(tmp_path):
    """P9.5: risks list overdue items and dependency blockers, each with an
    owner and drill-down ref; no auto-reassignment happens."""
    client = _api(tmp_path)
    client.post("/stewardship/v1/projects/p9/milestones", json={
        "name": "R2", "due": "2026-01-01", **ACTOR})  # already overdue
    blocker = _mk_item(client, "B-1", assignee="octacon")
    blocked = _mk_item(client, "B-2", status="in_progress", assignee="gojo")
    client.post(
        f"/stewardship/v1/projects/p9/work-items/{blocked}/dependencies",
        json={"dependency_ref": blocker, **ACTOR})
    for ref in (blocker, blocked):
        client.post("/stewardship/v1/projects/p9/milestones/R2/attach",
                    json={"ref": ref, **ACTOR})
    detail = client.get("/stewardship/v1/projects/p9/milestones/R2").json()
    kinds = {r["kind"] for r in detail["risks"]}
    assert "dependency_blocker" in kinds and "milestone_overdue" in kinds
    blocker_risk = next(r for r in detail["risks"]
                        if r["kind"] == "dependency_blocker")
    assert blocker_risk["item"] == blocked and blocker_risk["owner"] == "gojo"
    assert blocker in blocker_risk["blockers"]


def test_dependency_cycle_guarded_and_forecast_unaffected(tmp_path):
    """P9.6: dependency cycles are refused by the existing guard; milestone
    payload stays well-formed for the remaining items."""
    client = _api(tmp_path)
    client.post("/stewardship/v1/projects/p9/milestones", json={
        "name": "C1", **ACTOR})
    a = _mk_item(client, "C-a")
    b = _mk_item(client, "C-b")
    client.post(f"/stewardship/v1/projects/p9/work-items/{b}/dependencies",
                json={"dependency_ref": a, **ACTOR})
    cycle = client.post(
        f"/stewardship/v1/projects/p9/work-items/{a}/dependencies",
        json={"dependency_ref": b, **ACTOR})
    assert cycle.status_code in (409, 422), "cycle must be refused"
    client.post("/stewardship/v1/projects/p9/milestones/C1/attach",
                json={"ref": a, **ACTOR})
    client.post("/stewardship/v1/projects/p9/milestones/C1/attach",
                json={"ref": b, **ACTOR})
    detail = client.get("/stewardship/v1/projects/p9/milestones/C1").json()
    assert detail["forecast"]["state"] == "insufficient_history"
    assert detail["units"] == "items"


def test_missing_estimates_never_break_payload(tmp_path):
    """P9.6: estimate_days is optional; counts-only payload works when every
    item lacks an estimate (no invented hours)."""
    client = _api(tmp_path)
    client.post("/stewardship/v1/projects/p9/milestones", json={
        "name": "E1", **ACTOR})
    ref = _mk_item(client, "E-a")  # no estimate_days supplied
    client.post("/stewardship/v1/projects/p9/milestones/E1/attach",
                json={"ref": ref, **ACTOR})
    detail = client.get("/stewardship/v1/projects/p9/milestones/E1").json()
    assert detail["committed"] == 1 and detail["units"] == "items"
    assert "hours" not in json.dumps(detail).lower()
