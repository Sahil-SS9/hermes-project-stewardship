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


def test_cli_unknown_project_exit_code(db):
    rc = main(["--db", str(db), "health", "ghost"])
    assert rc == EXIT_ERROR


def test_cli_objective_command_requires_argv(db):
    rc = main(["--db", str(db), "project", "enable", "po"])
    assert rc == EXIT_OK
    rc = main(["--db", str(db), "objective", "add", "po", "--name", "x",
               "--evaluator", "command", "--target", ">=1"])
    assert rc == EXIT_ERROR  # missing --command refused, not crashed
