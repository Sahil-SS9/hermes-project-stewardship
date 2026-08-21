"""Cycle engine: gates, budget, mutex, health derivation, proposals."""

from __future__ import annotations

from pathlib import Path

import pytest

from hermes_project_stewardship.cycles.engine import CycleEngine, CycleRefused
from hermes_project_stewardship.persistence.service import ServiceError
from hermes_project_stewardship.verification.engine import CollectorSpec

from tests.conftest import make_repo


def wire_repo(svc, pid: str, repo: Path) -> None:
    svc.store._conn.execute(
        "UPDATE project_stewardship SET verification_policy_json=? WHERE project_id=?",
        (f'{{"repo_path": "{repo.as_posix()}"}}', pid),
    )


def test_basic_cycle_healthy(engine, enabled):
    r = engine.run_cycle(enabled)
    assert r["verification_ok"] is True
    assert r["health"]["state"] == "healthy"


def test_cycle_records_snapshot_and_audit(engine, enabled, svc):
    engine.run_cycle(enabled)
    h = svc.latest_health(enabled)
    assert h is not None and h["status"] == "healthy"
    actions = [a["action"] for a in svc.store.audit_tail(10)]
    assert "health.snapshot_recorded" in actions


def test_objective_failure_drives_proposals(engine, enabled, svc, tmp_path):
    repo = make_repo(tmp_path / "r")
    wire_repo(svc, enabled, repo)
    # failing high-severity objective
    svc.add_objective(enabled, name="ci", evaluator_type="command",
                      target=">=1", severity="high",
                      command=["python3", "-c", "raise SystemExit(1)"])
    proposals = []

    def proposer(pid, verdict, results, cycle_id):
        for res in results:
            if not res["passed"]:
                proposals.append({
                    "title": f"Fix {res['name']}",
                    "rationale": f"objective {res['name']} failed: {res['detail']}",
                    "risk": "medium",
                    "dedupe_key": f"fix-{res['name']}",
                })
        return proposals

    engine.proposal_fn = proposer
    r = engine.run_cycle(enabled)
    assert r["health"]["state"] in ("watch", "degraded")
    created = [i for i in r["initiatives"] if not i.get("refused")]
    assert len(created) == 1 and created[0]["approval_state"] == "pending"
    assert r["mutation_blocked_reason"] is None


def test_unknown_state_blocks_mutations(engine, enabled, svc, tmp_path):
    """Fail-closed: missing declared file → Unknown → no proposals even if
    the proposer tries."""
    wire_repo(svc, enabled, tmp_path / "missing-repo")
    svc.add_objective(enabled, name="ci", evaluator_type="manual",
                      target=">=1", severity="high")

    def proposer(pid, verdict, results, cycle_id):
        return [{"title": "Should never be created", "rationale": "x"}]

    engine.proposal_fn = proposer
    r = engine.run_cycle(enabled)
    assert r["health"]["state"] == "unknown"
    assert r["initiatives"] == []
    assert "fail-closed" in (r["mutation_blocked_reason"] or "")


def test_idempotency_key_blocks_duplicate_cycle(engine, enabled):
    engine.run_cycle(enabled, idempotency_key="webhook:redeliver-1")
    with pytest.raises(CycleRefused, match="duplicate trigger"):
        engine.run_cycle(enabled, idempotency_key="webhook:redeliver-1")


def test_daily_budget_enforced(engine, enabled):
    engine.max_cycles_per_day = 2
    engine.run_cycle(enabled)
    engine.run_cycle(enabled)
    with pytest.raises(CycleRefused, match="budget"):
        engine.run_cycle(enabled)


def test_mutex_prevents_parallel_cycles(engine, enabled, store):
    assert store.mutex_acquire(enabled, "other-holder", ttl_seconds=600)
    with pytest.raises(CycleRefused, match="mutex"):
        engine.run_cycle(enabled)
    store.mutex_release(enabled, "other-holder")
    engine.run_cycle(enabled)  # now fine


def test_expired_mutex_lease_reclaimable(engine, enabled, store, clock):
    assert store.mutex_acquire(enabled, "stale", ttl_seconds=60)
    clock.advance(minutes=5)
    assert store.mutex_holder(enabled) is None  # expired
    engine.run_cycle(enabled)  # reclaim works


def test_pause_allows_manual_only(engine, enabled, svc):
    svc.pause(enabled)
    with pytest.raises(CycleRefused, match="paused"):
        engine.run_cycle(enabled, trigger_type="cron")
    r = engine.run_cycle(enabled, trigger_type="manual")
    assert r["cycle_id"] >= 0


def test_freeze_blocks_everything(engine, enabled, svc):
    svc.freeze(enabled)
    for tt in ("manual", "cron", "gateway"):
        with pytest.raises(CycleRefused, match="frozen"):
            engine.run_cycle(enabled, trigger_type=tt)


def test_max_initiatives_per_cycle_cap(engine, enabled, svc):
    svc.add_objective(enabled, name="o1", evaluator_type="manual", target=">=1",
                      severity="low")
    svc.store._conn.execute(
        "UPDATE project_objectives SET enabled=1"
    )
    # manual objectives without status fail => three failures proposed at once
    for n in ("o2", "o3"):
        svc.add_objective(enabled, name=n, evaluator_type="manual", target=">=1",
                          severity="low")

    def proposer(pid, verdict, results, cycle_id):
        return [
            {"title": f"fix {n}", "rationale": "e", "dedupe_key": n}
            for n in ("o1", "o2", "o3")
        ]

    engine.proposal_fn = proposer
    r = engine.run_cycle(enabled)
    real = [i for i in r["initiatives"] if not i.get("refused")]
    assert len(real) <= engine.max_initiatives_per_cycle


def test_health_hysteresis_suppresses_noise(engine, enabled, svc):
    r1 = engine.run_cycle(enabled)
    r2 = engine.run_cycle(enabled)
    healthy_to_watch_quiet = (
        svc.latest_health(enabled)["status"] == "watch"
        and r2["health"]["notify"] is False
    ) or r2["health"]["notify"] is False or True
    # strong assertion: identical healthy runs never notify twice
    assert r1["health"]["state"] == r2["health"]["state"] == "healthy"
    assert r2["health"]["notify"] is False
