"""Mission, objective and project-content management contracts."""
from __future__ import annotations

import hashlib

import pytest

from hermes_project_stewardship.persistence.service import ServiceError


def test_mission_archive_preserves_history_and_remove_does_not(svc, enabled):
    archived = svc.archive_mission(
        enabled, actor="sahil", interface="dockyard:human"
    )

    assert archived["mission"] == "keep CI green and deps fresh"
    assert archived["archived_by"] == "sahil"
    assert svc.settings(enabled)["mission"] == ""
    assert svc.archived_missions(enabled) == [archived]

    svc.update_settings(enabled, mission="A replacement mission")
    removed = svc.remove_mission(
        enabled, actor="sahil", interface="dockyard:human"
    )

    assert removed["removed"] is True
    assert svc.settings(enabled)["mission"] == ""
    assert [item["mission"] for item in svc.archived_missions(enabled)] == [
        "keep CI green and deps fresh"
    ]


def test_objective_can_be_created_edited_archived_and_removed(svc, enabled):
    created = svc.add_objective(
        enabled,
        name="Tests stay green",
        evaluator_type="manual",
        target=">=1",
        severity="medium",
        description="Initial wording",
        actor="sahil",
        interface="dockyard:human",
    )
    objective_id = created["id"]

    edited = svc.update_objective(
        enabled,
        objective_id,
        name="Release tests stay green",
        target=">=2",
        severity="high",
        description="Updated wording",
        actor="sahil",
        interface="dockyard:human",
    )
    assert edited["name"] == "Release tests stay green"
    assert edited["target"] == ">=2"
    assert edited["severity"] == "high"

    archived = svc.archive_objective(
        enabled, objective_id, actor="sahil", interface="dockyard:human"
    )
    assert archived["enabled"] is False
    assert svc.objectives(enabled) == []
    assert svc.objectives(enabled, include_disabled=True)[0].enabled is False

    removed = svc.remove_objective(
        enabled, objective_id, actor="sahil", interface="dockyard:human"
    )
    assert removed == {"id": objective_id, "removed": True}
    assert svc.objectives(enabled, include_disabled=True) == []


def test_project_content_upload_is_listed_and_text_previewed(svc, enabled):
    uploaded = svc.upload_project_content(
        enabled,
        filename="release-notes.md",
        media_type="text/markdown",
        content=b"# Release notes\n\nEvidence lives here.\n",
        actor="sahil",
        interface="dockyard:human",
    )

    assert uploaded["filename"] == "release-notes.md"
    assert uploaded["media_type"] == "text/markdown"
    assert uploaded["size_bytes"] > 0
    assert len(uploaded["sha256"]) == 64
    assert "stored_path" not in uploaded
    assert svc.project_content(enabled) == [uploaded]

    preview = svc.project_content_preview(enabled, uploaded["content_id"])
    assert preview["preview_kind"] == "text"
    assert preview["text"] == "# Release notes\n\nEvidence lives here.\n"


def test_project_content_rejects_unsafe_or_unsupported_inputs(svc, enabled):
    with pytest.raises(ServiceError, match="filename"):
        svc.upload_project_content(
            enabled,
            filename="../secret.md",
            media_type="text/markdown",
            content=b"no",
            actor="sahil",
        )

    with pytest.raises(ServiceError, match="supported"):
        svc.upload_project_content(
            enabled,
            filename="payload.exe",
            media_type="application/octet-stream",
            content=b"MZ",
            actor="sahil",
        )

    with pytest.raises(ServiceError, match="empty"):
        svc.upload_project_content(
            enabled,
            filename="empty.txt",
            media_type="text/plain",
            content=b"",
            actor="sahil",
        )

    with pytest.raises(ServiceError, match="declared media type"):
        svc.upload_project_content(
            enabled,
            filename="fake.pdf",
            media_type="application/pdf",
            content=b"not a PDF",
            actor="sahil",
        )


def test_project_content_storage_rejects_a_physical_symlink_escape(
    svc, enabled, tmp_path
):
    root = svc.store.db_path.parent / "project-content"
    root.mkdir(parents=True, exist_ok=True)
    outside = tmp_path / "outside-content"
    outside.mkdir()
    project_dir = root / hashlib.sha256(enabled.encode("utf-8")).hexdigest()[:20]
    project_dir.symlink_to(outside, target_is_directory=True)

    with pytest.raises(ServiceError, match="escaped its storage root"):
        svc.upload_project_content(
            enabled,
            filename="evidence.md",
            media_type="text/markdown",
            content=b"# Evidence\n",
            actor="sahil",
        )

    assert list(outside.iterdir()) == []


def test_project_content_preview_fails_closed_on_tamper_or_missing_file(svc, enabled):
    uploaded = svc.upload_project_content(
        enabled,
        filename="evidence.md",
        media_type="text/markdown",
        content=b"# Verified evidence\n",
        actor="sahil",
    )
    row = svc.store._conn.execute(
        "SELECT stored_path FROM project_content WHERE content_id=?",
        (uploaded["content_id"],),
    ).fetchone()
    stored = svc.store.db_path.parent / "project-content" / row["stored_path"]

    stored.write_bytes(b"# Tampered evidence\n")
    with pytest.raises(ServiceError, match="integrity check"):
        svc.project_content_preview(enabled, uploaded["content_id"])

    stored.unlink()
    with pytest.raises(ServiceError, match="unavailable"):
        svc.project_content_preview(enabled, uploaded["content_id"])


def test_text_preview_does_not_split_a_valid_utf8_character(svc, enabled):
    content = ("a" * 99_999 + "€" + "done").encode("utf-8")
    uploaded = svc.upload_project_content(
        enabled,
        filename="unicode.txt",
        media_type="text/plain",
        content=content,
        actor="sahil",
    )

    preview = svc.project_content_preview(enabled, uploaded["content_id"])

    assert preview["truncated"] is True
    assert preview["text"] == "a" * 99_999
