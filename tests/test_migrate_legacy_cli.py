"""Contract tests for the dockyard-migrate-legacy CLI wrapper.

The wrapper (cli/migrate_legacy.py) is the only sanctioned entry point for
isolated legacy-migration proofs: it must refuse unmarked roots with a
machine-readable JSON error and exit 1, proxy runner results as JSON, and
return 0 on success. The runner itself is covered by test_migration_runner.
"""
from __future__ import annotations

import json
from pathlib import Path

import pytest

from hermes_project_stewardship.cli import migrate_legacy
from hermes_project_stewardship.persistence.migration_service import (
    IsolatedMigrationRunner,
)


def _argv(tmp_path: Path, mode: str = "dry-run") -> list[str]:
    return [
        mode,
        "--source-db", str(tmp_path / "source" / "legacy.db"),
        "--target-home", str(tmp_path / "target"),
        "--snapshot", str(tmp_path / "snapshot"),
        "--project", "demo",
        "--board", "demo",
    ]


def test_cli_refuses_unmarked_roots_with_json_error_and_exit_1(
    tmp_path, capsys,
):
    (tmp_path / "source").mkdir()
    (tmp_path / "source" / "legacy.db").write_bytes(b"not-a-db")
    (tmp_path / "target").mkdir()

    code = migrate_legacy.main(_argv(tmp_path))
    out = json.loads(capsys.readouterr().out)

    assert code == 1
    assert out["ok"] is False
    assert "missing" in out["error"]


def test_cli_accepts_help_only_invocation_without_touching_roots():
    # argparse exits 2 on missing required args before any filesystem access
    with pytest.raises(SystemExit) as exc:
        migrate_legacy.main(["--help"])
    assert exc.value.code == 0


def test_cli_dry_run_proxies_runner_result(tmp_path, monkeypatch, capsys):
    calls: list[tuple] = []

    class FakeRunner:
        def __init__(self, **kwargs):
            calls.append(tuple(sorted(kwargs)))

        def dry_run(self, project_id):
            return {"project_id": project_id, "count": 0}

        def apply(self, project_id):
            raise AssertionError("apply must not run in dry-run mode")

        def rollback(self):
            raise AssertionError("rollback must not run in dry-run mode")

    monkeypatch.setattr(migrate_legacy, "IsolatedMigrationRunner", FakeRunner)
    code = migrate_legacy.main(_argv(tmp_path, "dry-run"))
    out = json.loads(capsys.readouterr().out)

    assert code == 0
    assert out == {"ok": True, "result": {"project_id": "demo", "count": 0}}
    assert calls and "board" in calls[0]


def test_cli_apply_mode_routes_to_runner_apply(tmp_path, monkeypatch, capsys):
    class FakeRunner:
        def __init__(self, **kwargs):
            pass

        def apply(self, project_id):
            return {"count": 3, "rolled_back": False}

    monkeypatch.setattr(migrate_legacy, "IsolatedMigrationRunner", FakeRunner)
    code = migrate_legacy.main(_argv(tmp_path, "apply"))
    out = json.loads(capsys.readouterr().out)

    assert code == 0
    assert out["result"]["count"] == 3


def test_cli_rollback_mode_routes_to_runner_rollback(tmp_path, monkeypatch, capsys):
    class FakeRunner:
        def __init__(self, **kwargs):
            pass

        def rollback(self):
            return {"rolled_back": True}

    monkeypatch.setattr(migrate_legacy, "IsolatedMigrationRunner", FakeRunner)
    code = migrate_legacy.main(_argv(tmp_path, "rollback"))
    out = json.loads(capsys.readouterr().out)

    assert code == 0
    assert out["result"]["rolled_back"] is True


def test_cli_wraps_unexpected_runner_exception_as_json_failure(
    tmp_path, monkeypatch, capsys,
):
    class FakeRunner:
        def __init__(self, **kwargs):
            raise RuntimeError("explosion during construction")

    monkeypatch.setattr(migrate_legacy, "IsolatedMigrationRunner", FakeRunner)
    code = migrate_legacy.main(_argv(tmp_path))
    out = json.loads(capsys.readouterr().out.strip().splitlines()[-1])

    assert code == 1
    assert out["ok"] is False and "explosion" in out["error"]


def _last_stdout(capsys) -> str:
    return capsys.readouterr().out.strip().splitlines()[-1]


def test_real_runner_still_refuses_missing_marker_files(tmp_path):
    """Integration seam: wrapper + real runner agree on the refusal contract."""
    (tmp_path / "source").mkdir()
    (tmp_path / "source" / "legacy.db").write_bytes(b"not-a-db")
    (tmp_path / "target").mkdir()
    with pytest.raises(ValueError, match="missing"):
        IsolatedMigrationRunner(
            source_db=tmp_path / "source" / "legacy.db",
            target_home=tmp_path / "target",
            snapshot=tmp_path / "snapshot",
            board="demo",
        )
