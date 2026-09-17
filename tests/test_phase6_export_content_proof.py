"""Lane C F3 behavioural proof: does export/restore lose managed content?

Real behaviour, not source reading: upload a managed file, export the store,
restore into a clean directory, then exercise preview/removal against the
restored database exactly the way the API does.
"""

from __future__ import annotations

from pathlib import Path
import json

import pytest

from hermes_project_stewardship.persistence.backup import BackupError, export_store, restore_store
import hermes_project_stewardship.persistence.backup as backup_module

from hermes_project_stewardship.persistence.service import ServiceError, StewardshipService
from hermes_project_stewardship.persistence.store import Store


def test_export_restore_managed_content_gap(tmp_path: Path):
    store = Store(tmp_path / "orig" / "dockyard.db")
    service = StewardshipService(store)
    service.enable("demo", mission="m", lead_profile="lead", member_profiles=[])

    uploaded = service.upload_project_content(
        "demo", filename="runbook.md", media_type="text/markdown",
        content=b"# runbook\n", actor="sahil", interface="test",
    )
    content_id = uploaded["content_id"]

    # Live managed file sits next to the ORIGINAL database.
    original_root = store.db_path.parent / "project-content"
    row = store._conn.execute(
        "SELECT stored_path FROM project_content WHERE content_id=?", (content_id,)
    ).fetchone()
    managed = original_root / row["stored_path"]
    assert managed.is_file(), "managed file must exist beside the original DB"

    # Export (the documented operator recovery path) and restore elsewhere.
    archive = tmp_path / "export"
    manifest = export_store(store, archive)
    assert manifest["manifest_version"] == 2
    assert manifest["content"][0]["content_id"] == content_id
    archived = archive / "content" / row["stored_path"]
    assert archived.is_file()

    restored_dir = tmp_path / "restored"
    restored_dir.mkdir()
    result = restore_store(archive, restored_dir / "dockyard.db")
    assert result["integrity_check"] == "ok"

    # Open the restored database and inspect the same row.
    restored_store = Store(restored_dir / "dockyard.db")
    restored_service = StewardshipService(restored_store)
    row = restored_store._conn.execute(
        "SELECT stored_path, removal_state FROM project_content"
        " WHERE content_id=?",
        (content_id,),
    ).fetchone()
    assert row is not None, "content row must survive export/restore"
    assert row["removal_state"] == "active"

    expected_in_restored_home = restored_dir / "project-content" / row["stored_path"]
    assert expected_in_restored_home.is_file()
    assert expected_in_restored_home.read_bytes() == b"# runbook\n"

    # The new inode is explicitly rebound only after archive/hash validation.
    removed = restored_service.remove_project_content(
        "demo", content_id, actor="sahil", interface="test",
    )
    assert removed["removal_state"] == "file_removed"
    assert not expected_in_restored_home.exists()

    listing = restored_service.project_content("demo")
    assert all(item["content_id"] != content_id for item in listing)

    store.close()
    restored_store.close()



def test_restore_rejects_tampered_managed_content(tmp_path: Path):
    store = Store(tmp_path / "orig" / "dockyard.db")
    service = StewardshipService(store)
    service.enable("demo", mission="m", lead_profile="lead")
    uploaded = service.upload_project_content(
        "demo", filename="runbook.md", media_type="text/markdown",
        content=b"trusted\n", actor="sahil", interface="test",
    )
    archive = tmp_path / "export"
    export_store(store, archive)
    row = store._conn.execute(
        "SELECT stored_path FROM project_content WHERE content_id=?",
        (uploaded["content_id"],),
    ).fetchone()
    (archive / "content" / row["stored_path"]).write_bytes(b"tampered\n")
    restored_dir = tmp_path / "restored"
    restored_dir.mkdir()
    with pytest.raises(BackupError, match="integrity"):
        restore_store(archive, restored_dir / "dockyard.db")
    assert not (restored_dir / "project-content").exists()
    store.close()



def _archive_with_one_content(tmp_path: Path) -> tuple[Store, Path, Path, dict]:
    store = Store(tmp_path / "orig" / "dockyard.db")
    service = StewardshipService(store)
    service.enable("demo", mission="m", lead_profile="lead")
    uploaded = service.upload_project_content(
        "demo", filename="proof.txt", media_type="text/plain",
        content=b"proof", actor="sahil", interface="test",
    )
    archive = tmp_path / "export"
    export_store(store, archive)
    manifest_path = archive / "manifest.json"
    manifest = json.loads(manifest_path.read_text())
    return store, archive, manifest_path, manifest


def test_restore_rejects_omitted_active_content_manifest_entry(tmp_path: Path):
    store, archive, manifest_path, manifest = _archive_with_one_content(tmp_path)
    manifest["content"] = []
    manifest_path.write_text(json.dumps(manifest))
    restored = tmp_path / "restored"
    restored.mkdir()
    with pytest.raises(BackupError, match="exactly one-to-one"):
        restore_store(archive, restored / "dockyard.db")
    store.close()


def test_restore_rejects_duplicate_content_id_manifest_entry(tmp_path: Path):
    store, archive, manifest_path, manifest = _archive_with_one_content(tmp_path)
    manifest["content"].append(dict(manifest["content"][0]))
    manifest_path.write_text(json.dumps(manifest))
    restored = tmp_path / "restored"
    restored.mkdir()
    with pytest.raises(BackupError, match="duplicate"):
        restore_store(archive, restored / "dockyard.db")
    store.close()


def test_restore_rejects_unexpected_content_manifest_entry(tmp_path: Path):
    store, archive, manifest_path, manifest = _archive_with_one_content(tmp_path)
    entry = dict(manifest["content"][0])
    entry["content_id"] = "unexpected-content-id"
    manifest["content"].append(entry)
    manifest_path.write_text(json.dumps(manifest))
    restored = tmp_path / "restored"
    restored.mkdir()
    with pytest.raises(BackupError, match="unexpected"):
        restore_store(archive, restored / "dockyard.db")
    store.close()



def test_restore_cleans_owned_content_when_database_publish_is_interrupted(tmp_path: Path, monkeypatch):
    store, archive, _manifest_path, _manifest = _archive_with_one_content(tmp_path)
    restored = tmp_path / "restored"
    restored.mkdir()
    real_replace = backup_module.os.replace
    def fail_publish(source, destination):
        if Path(destination) == restored / "dockyard.db":
            raise OSError("simulated publish interruption")
        return real_replace(source, destination)
    monkeypatch.setattr(backup_module.os, "replace", fail_publish)
    with pytest.raises(OSError, match="publish interruption"):
        restore_store(archive, restored / "dockyard.db")
    assert not (restored / "dockyard.db").exists()
    assert not (restored / "project-content").exists()
    monkeypatch.setattr(backup_module.os, "replace", real_replace)
    restore_store(archive, restored / "dockyard.db")
    store.close()


def test_export_restore_without_content_is_complete(tmp_path: Path):
    """Databases with no managed content restore fully usable — the gap is
    specific to managed files, not to export/restore generally."""
    store = Store(tmp_path / "orig" / "dockyard.db")
    service = StewardshipService(store)
    service.enable("demo", mission="m", lead_profile="lead", member_profiles=[])
    service.add_objective("demo", name="obj", evaluator_type="manual", target=">=1",
                          actor="sahil", interface="test")

    archive = tmp_path / "export"
    export_store(store, archive)
    restored_dir = tmp_path / "restored"
    restored_dir.mkdir()
    restore_store(archive, restored_dir / "dockyard.db")

    restored_store = Store(restored_dir / "dockyard.db")
    restored_service = StewardshipService(restored_store)
    assert restored_service.settings("demo")["project_id"] == "demo"
    assert restored_service.objectives("demo"), "objective must survive restore"
    store.close()
    restored_store.close()
