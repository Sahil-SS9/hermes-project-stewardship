"""Lane C F3 behavioural proof: does export/restore lose managed content?

Real behaviour, not source reading: upload a managed file, export the store,
restore into a clean directory, then exercise preview/removal against the
restored database exactly the way the API does.
"""

from __future__ import annotations

from pathlib import Path

import pytest

from hermes_project_stewardship.persistence.backup import export_store, restore_store
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
    assert manifest["database"]["integrity_check"] == "ok"

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

    # The restored database now references a managed file...
    expected_in_restored_home = restored_dir / "project-content" / row["stored_path"]
    # ...which was never part of the archive:
    assert not expected_in_restored_home.exists(), (
        "precondition failed: archive unexpectedly carried the managed file"
    )
    assert not (restored_dir / "project-content").exists(), (
        "no content root is created by restore"
    )

    # Behavioural consequence: identity verification fails closed exactly
    # as documented ("project content file is unavailable").
    with pytest.raises(ServiceError, match="unavailable"):
        restored_service.remove_project_content(
            "demo", content_id, actor="sahil", interface="test",
        )

    # Readback still works (the row is truthful about the missing file):
    # the failure is the FILE, not the database.
    listing = restored_service.project_content("demo")
    assert any(item["content_id"] == content_id for item in listing)

    store.close()
    restored_store.close()


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
