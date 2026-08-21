"""Coverage completion: CLI dispatch paths, gateway handler, health machine."""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from hermes_project_stewardship.cli import ui
from hermes_project_stewardship.cli.app import EXIT_ERROR, EXIT_OK, main
from hermes_project_stewardship.domain.constants import HealthState
from hermes_project_stewardship.domain.health import HealthStateMachine
from hermes_project_stewardship.gateway import GatewayCommandHandler, CommandRequest


# ----------------------------- CLI paths -------------------------------- #

@pytest.fixture()
def db(tmp_path):
    return tmp_path / "cov.db"


def test_cli_project_lifecycle_paths(db):
    assert main(["--db", str(db), "project", "enable", "p", "--repo", "/tmp/x"]) == EXIT_OK
    assert main(["--db", str(db), "project", "pause", "p"]) == EXIT_OK
    assert main(["--db", str(db), "project", "resume", "p"]) == EXIT_OK
    assert main(["--db", str(db), "project", "freeze", "p"]) == EXIT_OK
    assert main(["--db", str(db), "project", "disable", "p"]) == EXIT_OK


def test_cli_objective_list_and_json(db, capsys):
    main(["--db", str(db), "project", "enable", "p"])
    main(["--db", str(db), "objective", "add", "p", "--name", "n1"])
    capsys.readouterr()
    main(["--db", str(db), "objective", "list", "p", "--json"])
    data = json.loads(capsys.readouterr().out)
    assert data[0]["name"] == "n1"
    main(["--db", str(db), "objective", "list", "p"])
    assert "n1" in capsys.readouterr().out


def test_cli_health_json_and_contradictions(db, capsys):
    main(["--db", str(db), "project", "enable", "p"])
    main(["--db", str(db), "run", "p"])
    capsys.readouterr()
    main(["--db", str(db), "health", "p", "--json"])
    data = json.loads(capsys.readouterr().out)
    assert data["status"] in {"healthy", "watch", "degraded", "critical", "unknown"}


def test_cli_audit_json(db, capsys):
    main(["--db", str(db), "project", "enable", "a1"])
    capsys.readouterr()
    main(["--db", str(db), "audit", "--limit", "2", "--json"])
    rows = json.loads(capsys.readouterr().out)
    assert isinstance(rows, list) and len(rows) >= 1


def test_cli_initiative_reject_flow(db):
    main(["--db", str(db), "project", "enable", "rj"])
    import sys as _s
    from hermes_project_stewardship.persistence.store import Store
    from hermes_project_stewardship.persistence.service import StewardshipService
    store = Store(db)
    ini = StewardshipService(store).propose_initiative("rj", title="T", rationale="R")
    store.close()
    assert main(["--db", str(db), "initiative", "reject", ini["ref"]]) == EXIT_OK


def test_cli_run_refused_exit_code(db):
    main(["--db", str(db), "project", "enable", "rz"])
    main(["--db", str(db), "project", "freeze", "rz"])
    from hermes_project_stewardship.cli.app import EXIT_REFUSED
    assert main(["--db", str(db), "run", "rz"]) == EXIT_REFUSED


# ------------------------- gateway handler ------------------------------ #

def test_gateway_unknown_command(svc, enabled):
    h = GatewayCommandHandler(svc)
    resp = h.handle(CommandRequest(platform="discord", sender_id="U",
                                   command="self-destruct", project_id=enabled))
    assert resp.ok is False and "unknown command" in resp.text


def test_gateway_run_requires_trigger_grant(svc, engine, enabled):
    h = GatewayCommandHandler(svc, cycle_engine=engine)
    resp = h.handle(CommandRequest(platform="discord", sender_id="U",
                                   command="run", project_id=enabled))
    assert resp.ok is False and "not permitted" in resp.text
    svc.set_gateway_permission(enabled, platform="discord", sender_id="U",
                               can_trigger=True)
    resp = h.handle(CommandRequest(platform="discord", sender_id="U",
                                   command="run", project_id=enabled))
    assert resp.ok is True


def test_gateway_reject_requires_grant_and_works(svc, enabled):
    h = GatewayCommandHandler(svc)
    ini = svc.propose_initiative(enabled, title="T", rationale="R")
    resp = h.handle(CommandRequest(platform="discord", sender_id="U",
                                   command="reject", project_id=enabled,
                                   args={"initiative_ref": ini["ref"]}))
    assert resp.ok is False
    svc.set_gateway_permission(enabled, platform="discord", sender_id="U",
                               can_approve=True)
    resp = h.handle(CommandRequest(platform="discord", sender_id="U",
                                   command="reject", project_id=enabled,
                                   args={"initiative_ref": ini["ref"]}))
    assert resp.ok is True and svc.initiative_by_ref(ini["ref"])["status"] == "rejected"


def test_gateway_missing_initiative_ref_raises(svc, enabled):
    h = GatewayCommandHandler(svc)
    svc.set_gateway_permission(enabled, platform="discord", sender_id="U",
                               can_approve=True)
    from hermes_project_stewardship.gateway.errors import CommandError

    with pytest.raises(CommandError):
        h.handle(CommandRequest(platform="discord", sender_id="U", command="approve",
                                project_id=enabled, args={}))


# --------------------------- health machine ------------------------------ #

def test_health_machine_matrix():
    m = HealthStateMachine()
    ok = dict(verification_ok=True, critical_signals=[], failed_objectives=[],
              watch_signals=[])
    assert m.derive(**ok) == HealthState.HEALTHY
    assert m.derive(**{**ok, "verification_ok": False}) == HealthState.UNKNOWN
    assert m.derive(**{**ok, "critical_signals": ["x"]}) == HealthState.CRITICAL
    high_fail = [{"severity": "high"}]
    assert m.derive(**{**ok, "failed_objectives": high_fail}) == HealthState.DEGRADED
    two_low = [{"severity": "low"}, {"severity": "low"}]
    assert m.derive(**{**ok, "failed_objectives": two_low}) == HealthState.DEGRADED
    one_low = [{"severity": "low"}]
    assert m.derive(**{**ok, "failed_objectives": one_low}) == HealthState.WATCH
    assert m.derive(**{**ok, "watch_signals": ["drift"]}) == HealthState.WATCH


def test_material_change_rules():
    m = HealthStateMachine()
    assert m.material_change(None, HealthState.UNKNOWN) is True
    assert m.material_change(None, HealthState.HEALTHY) is False
    assert m.material_change(HealthState.HEALTHY, HealthState.WATCH) is False  # adjacent, quiet
    assert m.material_change(HealthState.HEALTHY, HealthState.DEGRADED) is True
    assert m.material_change(HealthState.HEALTHY, HealthState.CRITICAL) is True
    assert m.material_change(HealthState.CRITICAL, HealthState.CRITICAL) is False


# ------------------------------- UI utils -------------------------------- #

def test_paint_respects_no_color(monkeypatch, capsys):
    monkeypatch.setenv("NO_COLOR", "1")
    assert ui.paint("x", "red") == "x"


def test_render_table_truncates():
    out = ui.render_table(("A", "B"), [["x" * 100, "y"]])
    assert len(out.splitlines()[2].split()[0]) <= 60
