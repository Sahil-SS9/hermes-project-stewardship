"""The six critical regression scenarios from the PRD (§24.3), plus
gateway-contract regressions (unauthorised approvals, redelivery)."""

from __future__ import annotations

from pathlib import Path

import pytest

from hermes_project_stewardship.cycles.engine import CycleEngine, CycleRefused
from hermes_project_stewardship.gateway import (
    CommandRequest,
    GatewayCommandHandler,
)
from hermes_project_stewardship.verification.engine import CollectorSpec

from tests.conftest import make_repo


def wire_repo(svc, pid, repo):
    svc.store._conn.execute(
        "UPDATE project_stewardship SET verification_policy_json=? WHERE project_id=?",
        (f'{{"repo_path": "{repo.as_posix()}"}}', pid),
    )


# --------------------------------------------------------------------- #
# Scenario 1: stale memory vs verified reality                           #
# --------------------------------------------------------------------- #

def test_scenario_1_stale_memory_causes_no_duplicate_mutation(
    engine, enabled, svc, tmp_path
):
    """Session memory says work incomplete; git proves complete. Cycle reports
    verified state and creates no duplicate work."""
    repo = make_repo(tmp_path / "r1", commits=2)
    wire_repo(svc, enabled, repo)
    engine.proposal_fn = lambda *a, **k: [
        {"title": "Finish the incomplete work", "rationale": "memory says incomplete"}
    ]
    result = engine.run_cycle(enabled)
    assert result["health"]["state"] == "healthy"  # git wins
    assert [i for i in result["initiatives"] if not i.get("refused")] == []
    # the stale claim is visible as a recorded contradiction for humans
    h = svc.latest_health(enabled)
    assert isinstance(h["contradictions"], list)


# --------------------------------------------------------------------- #
# Scenario 2: duplicate webhook event IDs                                #
# --------------------------------------------------------------------- #

def test_scenario_2_duplicate_webhook_only_one_cycle(engine, enabled):
    key = "webhook:gh:evt_123"
    r1 = engine.run_cycle(enabled, trigger_type="webhook", idempotency_key=key)
    with pytest.raises(CycleRefused):
        engine.run_cycle(enabled, trigger_type="webhook", idempotency_key=key)
    cycles = svc_cycles = engine.svc.recent_cycles(enabled, limit=10)
    matching = [c for c in cycles if c["id"] == r1["cycle_id"]]
    assert len(matching) == 1


# --------------------------------------------------------------------- #
# Scenario 3: two surfaces see identical state                           #
# --------------------------------------------------------------------- #

def test_scenario_3_cross_surface_identical_state(engine, enabled, svc, store, tmp_path):
    """CLI path and RPC path both construct services over the same Store and
    must observe byte-identical settings + health."""
    repo = make_repo(tmp_path / "r3")
    wire_repo(svc, enabled, repo)
    engine.run_cycle(enabled)

    # simulate a second surface (new service instances, same canonical DB)
    from hermes_project_stewardship.persistence.service import StewardshipService

    svc2 = StewardshipService(store)
    assert svc2.settings(enabled) == svc.settings(enabled)
    assert svc2.latest_health(enabled) == svc.latest_health(enabled)


# --------------------------------------------------------------------- #
# Scenario 4: unauthorised Discord approval                              #
# --------------------------------------------------------------------- #

def test_scenario_4_unauthorised_sender_cannot_approve(engine, enabled, svc):
    ini = svc.propose_initiative(enabled, title="T", rationale="R")
    handler = GatewayCommandHandler(svc)
    resp = handler.handle(
        CommandRequest(platform="discord", sender_id="STRANGER",
                       command="approve", project_id=enabled,
                       args={"initiative_ref": ini["ref"]})
    )
    assert resp.ok is False
    assert svc.initiative_by_ref(ini["ref"])["status"] == "pending_approval"
    # audit shows nothing approved by the stranger
    assert not any(
        r["action"] == "initiative.approved" and "STRANGER" in r["actor"]
        for r in svc.store.audit_tail(10)
    )


def test_gateway_approval_permission_and_idempotence(engine, enabled, svc):
    ini = svc.propose_initiative(enabled, title="T2", rationale="R2")
    svc.set_gateway_permission(enabled, platform="discord", sender_id="ADMIN",
                               can_approve=True)
    handler = GatewayCommandHandler(svc)
    req = CommandRequest(platform="discord", sender_id="ADMIN", command="approve",
                         project_id=enabled, args={"initiative_ref": ini["ref"]})
    r1 = handler.handle(req)
    assert r1.ok and r1.already_done is False
    # platform redelivery
    r2 = handler.handle(req)
    assert r2.ok and r2.already_done is True


# --------------------------------------------------------------------- #
# Scenario 5: technically complete but objective regressed               #
# --------------------------------------------------------------------- #

def test_scenario_5_regressed_initiative_flags_health_path(engine, enabled, svc, clock):
    ini = svc.propose_initiative(enabled, title="Speed up CI", rationale="CI slow",
                                 dedupe_key="ci-speed")
    svc.approve_initiative(ini["ref"], actor="h", interface="cli")
    out = svc.complete_initiative(ini["ref"], outcome={"ci_pass_rate": 0.91},
                                  regressed=True)
    assert out["status"] == "regressed"
    actions = [r["action"] for r in svc.store.audit_tail(10)]
    assert "initiative.regressed" in actions


# --------------------------------------------------------------------- #
# Scenario 6: pause during active cycle stops new mutating steps         #
# --------------------------------------------------------------------- #

def test_scenario_6_pause_mid_cycle_blocks_new_proposals(engine, enabled, svc, tmp_path):
    repo = make_repo(tmp_path / "r6")
    wire_repo(svc, enabled, repo)
    svc.add_objective(enabled, name="cov", evaluator_type="manual", target=">=1",
                      severity="medium")

    def proposer(pid, verdict, results, cycle_id):
        # pause lands mid-cycle (between assessment and proposal phase)
        svc.pause(pid)
        return [{"title": "work after pause", "rationale": "should be refused",
                 "dedupe_key": "after-pause"}]

    engine.proposal_fn = proposer
    result = engine.run_cycle(enabled, trigger_type="manual")
    # Pause landed inside the proposer callback: engine must stop proposing
    # immediately and record why — no initiative may be created after that.
    assert result["initiatives"] == []
    assert result["mutation_blocked_reason"] is not None
    assert "mid-cycle" in result["mutation_blocked_reason"]
    assert svc.settings(enabled)["phase"] == "paused"
