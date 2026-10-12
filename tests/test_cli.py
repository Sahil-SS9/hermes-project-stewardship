"""CLI + gateway surface tests (in-process; no subprocess)."""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from hermes_project_stewardship.cli.app import EXIT_ERROR, EXIT_OK, main


@pytest.fixture()
def db(tmp_path: Path) -> Path:
    return tmp_path / "cli.db"


def test_cli_enable_run_health_json(db):
    assert main(["--db", str(db), "project", "enable", "p1",
                 "--mission", "m", "--lead", "l", "--autonomy", "2"]) == EXIT_OK
    assert main(["--db", str(db), "run", "p1"]) == EXIT_OK
    assert main(["--db", str(db), "health", "p1"]) == EXIT_OK


def test_cli_json_output_parses(db, capsys):
    main(["--db", str(db), "project", "enable", "pj"])
    capsys.readouterr()
    main(["--db", str(db), "project", "status", "pj", "--json"])
    payload = json.loads(capsys.readouterr().out)
    assert payload["settings"]["project_id"] == "pj"
    main(["--db", str(db), "run", "pj", "--json"])
    cycle = json.loads(capsys.readouterr().out)
    assert cycle["health"]["state"] in {"healthy", "watch", "degraded", "critical", "unknown"}


def test_cli_objective_description_add_and_update(db, capsys):
    assert main(["--db", str(db), "project", "enable", "pd"]) == EXIT_OK
    assert main(["--db", str(db), "objective", "add", "pd", "--name", "drift",
                 "--description", "Uncommitted files in the checkout"]) == EXIT_OK
    assert main(["--db", str(db), "objective", "update", "pd", "--name", "drift",
                 "--description", "Uncommitted files; commit or revert them",
                 "--target", "<=0", "--severity", "high"]) == EXIT_OK
    capsys.readouterr()
    main(["--db", str(db), "objective", "list", "pd", "--json"])
    [objective] = json.loads(capsys.readouterr().out)
    assert objective["description"] == "Uncommitted files; commit or revert them"
    assert (objective["target"], objective["severity"]) == ("<=0", "high")


def test_cli_objective_update_unknown_name_is_an_error(db, capsys):
    assert main(["--db", str(db), "project", "enable", "pd"]) == EXIT_OK
    assert main(["--db", str(db), "objective", "update", "pd", "--name", "ghost",
                 "--description", "x"]) == EXIT_ERROR
    assert "ghost" in capsys.readouterr().err


def test_cli_unknown_project_exit_code(db):
    rc = main(["--db", str(db), "health", "ghost"])
    assert rc == EXIT_ERROR


def test_cli_objective_command_requires_argv(db):
    rc = main(["--db", str(db), "project", "enable", "po"])
    assert rc == EXIT_OK
    rc = main(["--db", str(db), "objective", "add", "po", "--name", "x",
               "--evaluator", "command", "--target", ">=1"])
    assert rc == EXIT_ERROR  # missing --command refused, not crashed


def test_cli_project_validation_steps(db, capsys):
    main(["--db", str(db), "project", "enable", "pv"])
    capsys.readouterr()

    def steps(*flags):
        assert main(["--db", str(db), "project", "validation-steps", "pv", *flags]) == EXIT_OK
        return json.loads(capsys.readouterr().out)["validation_steps"]

    assert steps() is None  # the default: Validate + Outcome check
    assert steps("--none") == []
    assert steps("--step", "Validate: npm test", "--step", "Outcome check: deployed") == [
        "Validate: npm test", "Outcome check: deployed"]
    assert steps() == ["Validate: npm test", "Outcome check: deployed"]
    assert steps("--default") is None
