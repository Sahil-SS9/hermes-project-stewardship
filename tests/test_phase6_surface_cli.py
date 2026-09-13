"""PM-0602 essential CLI: list/recovery for members, pending transfers and
project archive; explicit confirmation for managed-file removal.

Phase 6 lane A. These tests use the DB-only stewardctl surface (no Hermes
host runtime), matching the existing in-process CLI test conventions in
tests/test_cli.py.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from hermes_project_stewardship.cli.app import EXIT_ERROR, EXIT_OK, EXIT_REFUSED, main


@pytest.fixture()
def db(tmp_path: Path) -> Path:
    return tmp_path / "phase6-cli.db"


def _enable(db: Path, project_id: str) -> None:
    assert main([
        "--db", str(db), "project", "enable", project_id,
        "--mission", "recover operations", "--lead", "lead",
        "--member", "worker", "--autonomy", "0",
    ]) == EXIT_OK


# ------------------------------------------------------------------ #
# PM-0602: team member listing incl. pending departures
# ------------------------------------------------------------------ #


def test_pm0602_team_members_lists_active_and_departure_states(db, capsys):
    _enable(db, "p1")
    capsys.readouterr()  # discard enable output
    rc = main(["--db", str(db), "team", "members", "p1", "--json"])
    assert rc == EXIT_OK
    payload = json.loads(capsys.readouterr().out)
    slugs = {m["profile_slug"]: m for m in payload["members"]}
    assert slugs["lead"]["role"] == "lead"
    assert slugs["lead"]["state"] == "active"
    assert slugs["worker"]["role"] == "member"


def test_pm0602_team_members_unknown_project_is_exit_error(db):
    rc = main(["--db", str(db), "team", "members", "ghost", "--json"])
    assert rc == EXIT_ERROR


# ------------------------------------------------------------------ #
# PM-0602: pending transfer operation listing and recovery retry
# ------------------------------------------------------------------ #


def test_pm0602_transfer_operations_list_empty_then_reports(db, capsys):
    _enable(db, "p1")
    capsys.readouterr()
    rc = main(["--db", str(db), "transfer", "list", "--project", "p1", "--json"])
    assert rc == EXIT_OK
    payload = json.loads(capsys.readouterr().out)
    assert payload["operations"] == []


def test_pm0602_transfer_retry_unknown_operation_is_exit_error(db):
    _enable(db, "p1")
    rc = main(["--db", str(db), "transfer", "retry", "op-missing"])
    assert rc == EXIT_ERROR


def test_pm0602_transfer_retry_without_host_runtime_fails_closed(db):
    """A pending operation must never be reported as recovered when no
    transfer host runtime is available; the CLI fails with a truthful
    error instead of a fake success."""
    _enable(db, "p1")
    # Synthetic pending journal row: exactly the recovery state an operator
    # would face after an interrupted transfer.
    import sqlite3

    conn = sqlite3.connect(db)
    conn.execute(
        "INSERT INTO operation_journal (op_id, idempotency_key, kind, state,"
        " project_id, payload_hash, payload_json, created_at, updated_at)"
        " VALUES ('op-x', 'key-x', 'work_transfer', 'running', 'p1', 'h', '{}', 't', 't')"
    )
    conn.commit()
    conn.close()
    rc = main(["--db", str(db), "transfer", "retry", "op-x"])
    assert rc == EXIT_ERROR


def test_pm0602_transfer_list_shows_pending_operations(db, capsys):
    _enable(db, "p1")
    capsys.readouterr()
    import sqlite3

    conn = sqlite3.connect(db)
    conn.execute(
        "INSERT INTO operation_journal (op_id, idempotency_key, kind, state,"
        " project_id, payload_hash, payload_json, created_at, updated_at)"
        " VALUES ('op-y', 'key-y', 'work_transfer', 'running', 'p1', 'h',"
        ' \'{"from": "worker", "to": "lead"}\', \'t\', \'t\')'
    )
    conn.commit()
    conn.close()
    rc = main(["--db", str(db), "transfer", "list", "--project", "p1", "--json"])
    assert rc == EXIT_OK
    ops = json.loads(capsys.readouterr().out)["operations"]
    assert [op["op_id"] for op in ops] == ["op-y"]
    assert ops[0]["state"] == "running"
    assert ops[0]["project_id"] == "p1"


# ------------------------------------------------------------------ #
# PM-0602: project archive list / restore
# ------------------------------------------------------------------ #


def test_pm0602_project_archive_list_and_restore_roundtrip(db, capsys):
    _enable(db, "p1")
    _enable(db, "p2")
    assert main(["--db", str(db), "project", "archive", "p1"]) == EXIT_OK
    capsys.readouterr()
    rc = main(["--db", str(db), "project", "archive", "--list", "--json"])
    assert rc == EXIT_OK
    archived = json.loads(capsys.readouterr().out)["archived"]
    assert [row["project_id"] for row in archived] == ["p1"]
    assert main(["--db", str(db), "project", "restore", "p1"]) == EXIT_OK
    capsys.readouterr()
    rc = main(["--db", str(db), "project", "archive", "--list", "--json"])
    assert json.loads(capsys.readouterr().out)["archived"] == []


def test_pm0602_archive_double_archive_is_refused_error(db):
    _enable(db, "p1")
    assert main(["--db", str(db), "project", "archive", "p1"]) == EXIT_OK
    rc = main(["--db", str(db), "project", "archive", "p1"])
    assert rc == EXIT_ERROR
    rc = main(["--db", str(db), "project", "restore", "p1"])
    assert rc == EXIT_OK
    rc = main(["--db", str(db), "project", "restore", "p1"])
    assert rc == EXIT_ERROR


# ------------------------------------------------------------------ #
# PM-0602: managed-file removal requires explicit confirmation
# ------------------------------------------------------------------ #


@pytest.fixture()
def content_project(db, tmp_path):
    _enable(db, "p1")
    from hermes_project_stewardship.persistence.service import StewardshipService
    from hermes_project_stewardship.persistence.store import Store

    store = Store(db)
    service = StewardshipService(store)
    uploaded = service.upload_project_content(
        "p1", filename="runbook.md", media_type="text/markdown",
        content=b"# runbook\n", actor="cli-test", interface="test",
    )
    yield db, store, uploaded["content_id"]
    store.close()


def test_pm0602_content_removal_without_confirm_is_refused(content_project, capsys):
    db, store, content_id = content_project
    rc = main(["--db", str(db), "content", "remove", "p1", content_id])
    assert rc == EXIT_REFUSED
    err = capsys.readouterr().err
    assert "--confirm" in err
    # File must still exist: refusal is not a silent no-op deletion path.
    row = store._conn.execute(
        "SELECT stored_path, removal_state FROM project_content WHERE content_id=?",
        (content_id,),
    ).fetchone()
    assert row["removal_state"] == "active"
    assert (store.db_path.parent / "project-content" / row["stored_path"]).is_file()


def test_pm0602_content_removal_with_confirm_removes_managed_file(content_project):
    db, store, content_id = content_project
    rc = main(["--db", str(db), "content", "remove", "p1", content_id, "--confirm"])
    assert rc == EXIT_OK
    row = store._conn.execute(
        "SELECT stored_path, removal_state FROM project_content WHERE content_id=?",
        (content_id,),
    ).fetchone()
    assert row["removal_state"] == "file_removed"
    path = store.db_path.parent / "project-content" / row["stored_path"]
    assert not path.exists()
    # Verified inode truncation semantics preserved: zero-byte marker retained.
    assert path.with_name(f".{content_id}.removing").read_bytes() == b""


def test_pm0602_content_removal_unknown_content_is_exit_error(content_project):
    db, _store, _content_id = content_project
    rc = main(["--db", str(db), "content", "remove", "p1", "nope", "--confirm"])
    assert rc == EXIT_ERROR
