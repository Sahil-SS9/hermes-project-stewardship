"""Regression tests for the v0.5.4 community review findings.

Each test names the defect it pins. They are kept together because they share
one theme: an authorisation, phase or verification gate that existed somewhere
in the code but was not consulted on the path an attacker or an agent actually
takes.

Reported against v0.5.4 (40a03fc) by an external reviewer.
"""

from __future__ import annotations

import json
import subprocess
from pathlib import Path

import pytest

from hermes_project_stewardship import plugin
from hermes_project_stewardship.gateway import CommandError, GatewayCommandHandler
from hermes_project_stewardship.gateway.handler import CommandRequest
from hermes_project_stewardship.persistence.service import ServiceError
from hermes_project_stewardship.verification.engine import (
    CollectorSpec,
    VerificationEngine,
)

from .conftest import make_repo

# --------------------------------------------------------------------- #
# Finding 1: cross-project approval bypass                              #
# --------------------------------------------------------------------- #


@pytest.fixture()
def two_projects(svc):
    """Two enabled projects; the actor may approve on 'alpha' only."""
    for pid in ("alpha", "beta"):
        svc.enable(pid, mission="m", lead_profile="lead", autonomy_level=2)
    svc.set_gateway_permission("alpha", platform="discord", sender_id="MALLORY",
                               can_approve=True)
    return svc


def _initiative(svc, pid: str, title: str) -> dict:
    return svc.propose_initiative(pid, title=title, rationale="evidence E")


def _request(command: str, project_id: str, ref: str) -> CommandRequest:
    return CommandRequest(
        project_id=project_id,
        platform="discord",
        sender_id="MALLORY",
        command=command,
        args={"initiative_ref": ref},
    )


def test_approval_authority_does_not_cross_projects(two_projects, svc):
    """Authority on 'alpha' must not approve 'beta' work by quoting its ref.

    Permission was checked against the project named in the request while the
    initiative was resolved by its globally unique ref, so the two could name
    different projects.
    """
    victim = _initiative(svc, "beta", "beta work")
    handler = GatewayCommandHandler(svc)

    with pytest.raises(CommandError) as excinfo:
        handler.handle(_request("approve", "alpha", victim["ref"]))

    assert "does not belong to project" in str(excinfo.value)
    assert svc.initiative_by_ref(victim["ref"])["status"] == "pending_approval"


def test_rejection_authority_does_not_cross_projects(two_projects, svc):
    """Rejection is equally destructive: it applies a suppression window."""
    victim = _initiative(svc, "beta", "beta work 2")
    handler = GatewayCommandHandler(svc)

    with pytest.raises(CommandError):
        handler.handle(_request("reject", "alpha", victim["ref"]))

    assert svc.initiative_by_ref(victim["ref"])["status"] == "pending_approval"


def test_foreign_ref_is_refused_before_its_status_is_disclosed(two_projects, svc):
    """Ownership is checked first, so a foreign ref cannot be probed.

    The 'already approved' short-circuit would otherwise confirm the existence
    and state of another project's initiative to an unauthorised caller.
    """
    victim = _initiative(svc, "beta", "beta work 3")
    svc.approve_initiative(victim["ref"], actor="owner", interface="cli")
    handler = GatewayCommandHandler(svc)

    with pytest.raises(CommandError) as excinfo:
        handler.handle(_request("approve", "alpha", victim["ref"]))

    message = str(excinfo.value)
    assert "does not belong to project" in message
    assert "already approved" not in message


def test_own_project_approval_still_works_and_stays_idempotent(two_projects, svc):
    """The fix must not disturb the permitted path or its replay behaviour."""
    own = _initiative(svc, "alpha", "alpha work")
    handler = GatewayCommandHandler(svc)

    first = handler.handle(_request("approve", "alpha", own["ref"]))
    again = handler.handle(_request("approve", "alpha", own["ref"]))

    assert first.ok and not first.already_done
    assert again.ok and again.already_done
    assert svc.initiative_by_ref(own["ref"])["status"] == "approved"


# --------------------------------------------------------------------- #
# Finding 3: a failed git check is not evidence                         #
# --------------------------------------------------------------------- #


def _verdict_for(path: Path):
    engine = VerificationEngine()
    return engine.collect([
        CollectorSpec(kind="git_status", path=path),
        CollectorSpec(kind="git_log", path=path),
    ])


def test_non_repo_directory_is_not_a_clean_working_tree(tmp_path):
    """git exits 128 on a non-repo; empty stdout must not read as 'clean'."""
    plain = tmp_path / "not-a-repo"
    plain.mkdir()

    verdict = _verdict_for(plain)

    assert verdict.ok is False
    assert verdict.contradictions
    assert all(not e.authoritative for e in verdict.evidence)
    assert not any("clean working tree" in e.summary for e in verdict.evidence)


def test_non_repo_subdirectory_does_not_borrow_the_outer_repo_state(tmp_path):
    """git walks up, so a nested non-repo answered with the OUTER repo.

    That evidence describes a different working tree, and accepting it would
    attribute someone else's state - clean or dirty - to this project.
    """
    outer = make_repo(tmp_path / "outer")
    nested = Path(outer) / "subproject"
    nested.mkdir()

    verdict = _verdict_for(nested)

    assert verdict.ok is False
    assert any("not the root" in c.detail for c in verdict.contradictions)


def test_a_real_repository_still_verifies(tmp_path):
    """The fix must not break the path it is protecting."""
    repo = make_repo(tmp_path / "repo")

    verdict = _verdict_for(Path(repo))

    assert verdict.ok is True
    assert any(e.authoritative for e in verdict.evidence)


def test_a_repository_with_no_commits_is_a_known_state(tmp_path):
    """`git log` exits 128 on an empty repo; that is 0 commits, not a failure."""
    empty = tmp_path / "empty"
    empty.mkdir()
    subprocess.run(["git", "init", "-q", "."], cwd=empty, check=True,
                   capture_output=True)

    verdict = _verdict_for(empty)

    assert verdict.ok is True
    assert any(e.summary == "0 recent commits" for e in verdict.evidence)


def test_a_failed_check_cannot_authorise_proposals(engine, svc, tmp_path):
    """The downstream consequence: no proposals on unverified ground."""
    pid = "unverified"
    svc.enable(pid, mission="m", lead_profile="lead", autonomy_level=2)
    plain = tmp_path / "not-a-repo"
    plain.mkdir()
    svc.update_settings(pid, verification_policy={"repo_path": plain.as_posix()})
    svc.add_objective(pid, name="manual", evaluator_type="manual", target=">=1",
                      severity="high")
    engine.proposal_fn = lambda *a: [{"title": "T", "rationale": "R"}]

    result = engine.run_cycle(pid)

    assert result["verification_ok"] is False
    assert result["initiatives"] == []


# --------------------------------------------------------------------- #
# Finding 4: the model proposal tool answers to the same gates          #
# --------------------------------------------------------------------- #


@pytest.fixture()
def tool_project(store, svc):
    plugin.PluginState.reset()
    plugin.PluginState.db_path = store.db_path
    pid = "toolproj"
    svc.enable(pid, mission="m", lead_profile="lead", autonomy_level=2)
    yield pid
    plugin.PluginState.reset()


def _healthy(svc, pid, status="healthy"):
    svc.record_health_snapshot(pid, status=status, score=0.9, evidence=[],
                               contradictions=[])


def test_model_tool_refuses_a_frozen_project(tool_project, svc):
    _healthy(svc, tool_project)
    svc.freeze(tool_project)

    with pytest.raises(ServiceError) as excinfo:
        plugin.tool_steward_propose_initiative(tool_project, title="T", rationale="R")

    assert "frozen" in str(excinfo.value)
    assert svc.initiatives(tool_project) == []


def test_model_tool_refuses_an_observe_only_project(tool_project, svc):
    _healthy(svc, tool_project)
    svc.update_settings(tool_project, autonomy_level=0)

    with pytest.raises(ServiceError) as excinfo:
        plugin.tool_steward_propose_initiative(tool_project, title="T", rationale="R")

    assert "cannot create initiatives" in str(excinfo.value)
    assert "autonomy level 0" in str(excinfo.value)
    assert svc.initiatives(tool_project) == []


def test_model_tool_refuses_without_a_health_snapshot(tool_project, svc):
    """The reported case: a proposal on a project never once measured."""
    with pytest.raises(ServiceError) as excinfo:
        plugin.tool_steward_propose_initiative(tool_project, title="T", rationale="R")

    assert "no health snapshot" in str(excinfo.value)
    assert svc.initiatives(tool_project) == []


@pytest.mark.parametrize("status", ["unknown", "critical"])
def test_model_tool_refuses_on_unverified_or_critical_health(tool_project, svc, status):
    _healthy(svc, tool_project, status=status)

    with pytest.raises(ServiceError) as excinfo:
        plugin.tool_steward_propose_initiative(tool_project, title="T", rationale="R")

    assert "fail-closed" in str(excinfo.value)
    assert svc.initiatives(tool_project) == []


def test_model_tool_still_proposes_on_a_verified_active_project(tool_project, svc):
    _healthy(svc, tool_project)

    out = plugin.tool_steward_propose_initiative(
        tool_project, title="T", rationale="R")

    assert out["status"] == "pending_approval"


def test_paused_projects_refuse_proposals_from_every_caller(svc):
    """Phase belongs in the service, so no entry point can skip it."""
    pid = "paused"
    svc.enable(pid, mission="m", lead_profile="lead", autonomy_level=2)
    svc.pause(pid)

    with pytest.raises(ServiceError) as excinfo:
        svc.propose_initiative(pid, title="T", rationale="R")

    assert "paused" in str(excinfo.value)


# --------------------------------------------------------------------- #
# Adjacent: the cycle obeys the autonomy level it reports               #
# --------------------------------------------------------------------- #


def _failing_integration_project(svc, monkeypatch, tmp_path, pid, level):
    """A project that verifies cleanly and has one genuinely failed check.

    Using a stubbed integration keeps health known (so the fail-closed gates
    do not fire first) while still producing the failed objective that drives
    the proposer.
    """
    from hermes_project_stewardship.objectives import github

    monkeypatch.setattr(github, "collect_checks", lambda *a: {
        "source": "github", "repository": "owner/repo", "sha": "a" * 40,
        "state": "failed", "checks": [{"name": "tests", "state": "failed"}],
        "detail": "tests failed",
    })
    svc.enable(pid, mission="m", lead_profile="lead", autonomy_level=level)
    repo = make_repo(tmp_path / "r")
    svc.update_settings(pid, verification_policy={
        "repo_path": Path(repo).as_posix(),
        "github": {"repository": "owner/repo", "sha": "a" * 40,
                   "required_checks": ["tests"]},
    })
    svc.add_objective(pid, name="checks", evaluator_type="integration",
                      integration="github", target=">=1", severity="medium")
    return pid


def test_cycle_does_not_create_initiatives_below_planner_level(
    engine, svc, monkeypatch, tmp_path
):
    """Creating initiatives is a level-2 capability; the cycle is the agent."""
    pid = _failing_integration_project(svc, monkeypatch, tmp_path, "observeonly", 0)
    engine.proposal_fn = lambda *a: [{"title": "T", "rationale": "R"}]

    result = engine.run_cycle(pid)

    assert result["initiatives"] == []
    assert "autonomy level" in (result.get("mutation_blocked_reason") or "")
    assert json.dumps(result, default=str)


def test_cycle_still_creates_initiatives_at_planner_level(
    engine, svc, monkeypatch, tmp_path
):
    """The level gate must not close the path it is scoping."""
    pid = _failing_integration_project(svc, monkeypatch, tmp_path, "planner", 2)
    engine.proposal_fn = lambda *a: [{"title": "T", "rationale": "objective failed"}]

    result = engine.run_cycle(pid)

    assert len(result["initiatives"]) == 1
    assert not result.get("mutation_blocked_reason")
