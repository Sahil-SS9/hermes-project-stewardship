from __future__ import annotations

import json
from pathlib import Path

import pytest

from hermes_project_stewardship.persistence.backup import (
    BackupError,
    export_store,
    restore_store,
)
from hermes_project_stewardship.persistence.service import StewardshipService
from hermes_project_stewardship.persistence.store import Store
from hermes_project_stewardship.cli.app import EXIT_OK, main


def test_export_and_restore_round_trip(tmp_path: Path):
    source = Store(tmp_path / "source.db")
    StewardshipService(source).enable(
        project_id="alpha", mission="Prove backup", lead_profile="octacon",
        autonomy_level=1,
    )
    archive = tmp_path / "export-v1"
    manifest = export_store(source, archive)
    assert manifest["manifest_version"] == 1
    assert manifest["schema_version"] == source.schema_version
    assert manifest["database"]["path"] == "dockyard.sqlite3"
    assert "source" not in manifest
    assert (archive / "manifest.json").is_file()
    assert (archive / "dockyard.sqlite3").is_file()

    target = tmp_path / "restored.db"
    restored = restore_store(archive, target)
    assert restored["sha256"] == manifest["database"]["sha256"]
    reopened = Store(target)
    assert StewardshipService(reopened).settings("alpha")["mission"] == "Prove backup"
    reopened.close()
    source.close()


def test_restore_rejects_tampered_snapshot_without_target_residue(tmp_path: Path):
    source = Store(tmp_path / "source.db")
    archive = tmp_path / "export-v1"
    export_store(source, archive)
    source.close()
    database = archive / "dockyard.sqlite3"
    database.write_bytes(database.read_bytes() + b"tamper")
    target = tmp_path / "must-not-exist.db"
    with pytest.raises(BackupError, match="checksum"):
        restore_store(archive, target)
    assert not target.exists()


def test_restore_rejects_manifest_traversal(tmp_path: Path):
    source = Store(tmp_path / "source.db")
    archive = tmp_path / "export-v1"
    export_store(source, archive)
    source.close()
    manifest_path = archive / "manifest.json"
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    manifest["database"]["path"] = "../escape.db"
    manifest_path.write_text(json.dumps(manifest), encoding="utf-8")
    with pytest.raises(BackupError, match="relative"):
        restore_store(archive, tmp_path / "target.db")


def test_restore_rejects_symlinked_database(tmp_path: Path):
    source = Store(tmp_path / "source.db")
    archive = tmp_path / "export-v1"
    export_store(source, archive)
    source.close()
    database = archive / "dockyard.sqlite3"
    real = archive / "real.sqlite3"
    database.rename(real)
    database.symlink_to(real.name)
    with pytest.raises(BackupError, match="symlink"):
        restore_store(archive, tmp_path / "target.db")


def test_cli_export_restore_round_trip(tmp_path: Path):
    source = tmp_path / "source.db"
    assert main([
        "--db", str(source), "project", "enable", "alpha",
        "--mission", "CLI backup proof",
    ]) == EXIT_OK
    archive = tmp_path / "archive"
    assert main(["--db", str(source), "export", "--output", str(archive)]) == EXIT_OK
    target = tmp_path / "restored.db"
    assert main([
        "restore", "--archive", str(archive), "--target", str(target),
    ]) == EXIT_OK
    restored = Store(target)
    assert StewardshipService(restored).settings("alpha")["mission"] == "CLI backup proof"
    restored.close()
