"""R-REPAIR (3b major): the repair report must carry the managed-content
story a recovering operator needs.

repair_database copies every TABLE row faithfully and verifies counts,
integrity and foreign keys — and says nothing about ``project-content``.
The content root is derived from the DATABASE LOCATION by design
(service._content_root() = db_path.parent / "project-content"), so a repair
whose target lives under a different parent directory silently strands every
active content record:

1. the stored_path rows resolve under the NEW parent's root, which does not
   exist there — reads refuse with "project content file is unavailable";
2. when the operator then copies the old content tree across (the natural
   recovery step, landing files at new inodes), the copied rows keep the old
   file_dev/file_ino, so removal refuses with "project content file identity
   changed; removal refused" for every file.

The repair report must therefore state the content-root assumption and, when
the target's root differs from the source's, an explicit managed_content
section the runbook can point at. Safe portability when the whole state
directory moves WITH its content tree is reported, not invented; a same-parent
repair (or identical inode identity after a same-fs move) is explicitly NOT
flagged. Evidence: probe_repair_content_root.py (3b, all-true).

The recovery docs (R-DOC1 companion) are rewritten to point at this section.
"""
from __future__ import annotations

import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))

from hermes_project_stewardship.persistence.repair import repair_database  # noqa: E402
from hermes_project_stewardship.persistence.service import (  # noqa: E402
    ServiceError,
    StewardshipService,
)
from hermes_project_stewardship.persistence.store import Store  # noqa: E402


def _seed_with_content(src_dir: Path) -> tuple[Path, str, dict]:
    src_db = src_dir / "dockyard.db"
    store = Store(src_db)
    svc = StewardshipService(store)
    svc.enable("proj-r1", mission="probe", actor="probe-owner", interface="probe")
    meta = svc.upload_project_content(
        "proj-r1", filename="c1.bin", media_type="text/plain",
        content=b"x" * 128, actor="probe-owner")
    row = store._conn.execute(
        "SELECT stored_path, file_dev, file_ino FROM project_content").fetchone()
    stored_path = str(row["stored_path"])
    store.close()
    return src_db, stored_path, meta


def _read_report(report) -> dict:
    import json
    return json.loads(report.as_json())


def test_report_carries_managed_content_section(tmp_path):
    """The report always includes a managed_content section: the root the
    repaired rows will resolve content under, and how many active records
    that root must hold."""
    src_dir = tmp_path / "src-state"
    src_dir.mkdir()
    src_db, _stored_path, meta = _seed_with_content(src_dir)
    dst_dir = tmp_path / "dst-state"
    dst_dir.mkdir()
    report = repair_database(src_db, dst_dir / "repaired.db", tmp_path / "bk")
    data = _read_report(report)
    section = data.get("managed_content")
    assert isinstance(section, dict), "report must name managed content"
    assert section["content_root"] == str(dst_dir / "project-content"), (
        "the reported content root is the target's parent-resolved root")
    assert section["active_records"] == 1
    assert section["source_content_root"] == str(src_dir / "project-content")


def test_report_flags_cross_directory_relocation(tmp_path):
    """Repair to a DIFFERENT parent: the report must say the content tree was
    NOT moved and the records need the content root brought across."""
    src_dir = tmp_path / "src-state"
    src_dir.mkdir()
    src_db, _stored_path, meta = _seed_with_content(src_dir)
    dst_dir = tmp_path / "dst-state"
    dst_dir.mkdir()
    assert not (dst_dir / "project-content").exists()
    report = repair_database(src_db, dst_dir / "repaired.db", tmp_path / "bk")
    section = _read_report(report)["managed_content"]
    assert section["content_root_present"] is False, (
        "a cross-directory repair must say the target content root is absent")
    assert section["relocated"] is True, (
        "a cross-directory repair must mark the managed content relocated")


def test_report_not_relocated_for_same_parent_target(tmp_path):
    """Repair IN PLACE's directory (same parent): the root the rows resolve
    under is the same root that already exists, so no relocation warning."""
    src_dir = tmp_path / "src-state"
    src_dir.mkdir()
    src_db, _stored_path, meta = _seed_with_content(src_dir)
    report = repair_database(src_db, src_dir / "repaired.db", tmp_path / "bk")
    section = _read_report(report)["managed_content"]
    assert section["relocated"] is False
    assert section["content_root_present"] is True


def test_repaired_db_with_content_tree_copied_reports_identity_rebind_status(tmp_path):
    """After an operator copies the content tree across (new inodes), the
    report cannot know it — but the REPORTED state must tell the operator
    the copied rows' stored identity refers to the SOURCE filesystem, so the
    runbook instruction in the docs (R-DOC1) is grounded. The report carries
    source identity facts: rows holding dev/ino of the source's files."""
    src_dir = tmp_path / "src-state"
    src_dir.mkdir()
    src_db, stored_path, meta = _seed_with_content(src_dir)
    dst_dir = tmp_path / "dst-state"
    dst_dir.mkdir()
    report = repair_database(src_db, dst_dir / "repaired.db", tmp_path / "bk")
    section = _read_report(report)["managed_content"]
    assert "identity_note" in section and "file_dev" in section["identity_note"], (
        "the report must explain the stored dev/ino identity caveat")

    # Operational check (the observable refusal the probe demonstrated):
    # after copying the tree across, removal still refuses on unchanged
    # identity — the docs' identity-recompute instruction is a real need.
    shutil.copytree(src_dir / "project-content", dst_dir / "project-content")
    rep_store = Store(dst_dir / "repaired.db")
    rep_svc = StewardshipService(rep_store)
    try:
        refused = ""
        try:
            rep_svc.remove_project_content("proj-r1", meta["content_id"], actor="probe-owner")
        except ServiceError as exc:
            refused = str(exc)
        assert "identity changed" in refused
    finally:
        rep_store.close()