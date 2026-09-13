from __future__ import annotations

import os
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from hermes_project_stewardship.api.server import create_app
from hermes_project_stewardship.domain.constants import Capability
from hermes_project_stewardship.kanban import ReferenceKanbanAdapter
from hermes_project_stewardship.persistence.service import StewardshipService
from hermes_project_stewardship.persistence.service import ServiceError
from hermes_project_stewardship.persistence.store import Store


@pytest.fixture()
def phase5(tmp_path: Path):
    store = Store(tmp_path / "phase5.db")
    service = StewardshipService(store)
    service.enable(
        "demo",
        mission="Deliver safely",
        lead_profile="lead",
        member_profiles=["worker"],
    )
    adapter = ReferenceKanbanAdapter(store)
    app = create_app(
        store,
        kanban_adapter=adapter,
        auth_token="secret",
        auth_principal="sahil",
        auth_principal_is_human=True,
        capabilities={member.value for member in Capability},
    )
    client = TestClient(app)
    yield store, service, adapter, client, {"Authorization": "Bearer secret"}
    store.close()


def _objective(service: StewardshipService, project_id: str, name: str) -> int:
    return int(service.add_objective(
        project_id,
        name=name,
        evaluator_type="manual",
        target=">=1",
        actor="sahil",
        interface="test",
    )["id"])


def _managed_path(store: Store, content_id: str) -> Path:
    row = store._conn.execute(
        "SELECT stored_path FROM project_content WHERE content_id=?", (content_id,)
    ).fetchone()
    return store.db_path.parent / "project-content" / row["stored_path"]


def test_goal_lifecycle_order_and_nullable_objective_links_preserve_unlinked(phase5):
    store, service, _, client, headers = phase5
    linked_one = _objective(service, "demo", "Linked one")
    linked_two = _objective(service, "demo", "Linked two")
    unlinked = _objective(service, "demo", "Still unlinked")

    first = client.post(
        "/stewardship/v1/projects/demo/goals",
        headers=headers,
        json={
            "title": "Ship recovery",
            "description": "Protect retry paths",
            "objective_ids": [linked_one, linked_two],
        },
    )
    assert first.status_code == 200, first.text
    second = client.post(
        "/stewardship/v1/projects/demo/goals",
        headers=headers,
        json={"title": "Document operations", "objective_ids": []},
    )
    assert second.status_code == 200, second.text
    first_id = first.json()["goal_id"]
    second_id = second.json()["goal_id"]

    listed = client.get(
        "/stewardship/v1/projects/demo/goals?include_archived=true",
        headers=headers,
    )
    assert listed.status_code == 200, listed.text
    assert [row["goal_id"] for row in listed.json()["goals"]] == [first_id, second_id]
    assert listed.json()["goals"][0]["objective_ids"] == [linked_one, linked_two]
    assert listed.json()["goals"][1]["objective_ids"] == []
    assert store._conn.execute(
        "SELECT goal_id FROM project_objective_goals WHERE objective_id=?",
        (unlinked,),
    ).fetchone() is None

    edited = client.patch(
        f"/stewardship/v1/projects/demo/goals/{first_id}",
        headers=headers,
        json={
            "title": "Ship verified recovery",
            "description": "Protect every retry path",
            "objective_ids": [linked_two],
        },
    )
    assert edited.status_code == 200, edited.text
    assert edited.json()["objective_ids"] == [linked_two]
    assert store._conn.execute(
        "SELECT goal_id FROM project_objective_goals WHERE objective_id=?",
        (linked_one,),
    ).fetchone() is None

    reordered = client.put(
        "/stewardship/v1/projects/demo/goals/order",
        headers=headers,
        json={"goal_ids": [second_id, first_id]},
    )
    assert reordered.status_code == 200, reordered.text
    assert [row["goal_id"] for row in reordered.json()["goals"]] == [second_id, first_id]

    archived = client.post(
        f"/stewardship/v1/projects/demo/goals/{first_id}/archive",
        headers=headers,
        json={},
    )
    assert archived.status_code == 200, archived.text
    assert archived.json()["archived_at"]
    assert archived.json()["objective_ids"] == [linked_two]
    active = client.get("/stewardship/v1/projects/demo/goals", headers=headers).json()["goals"]
    assert [row["goal_id"] for row in active] == [second_id]

    restored = client.post(
        f"/stewardship/v1/projects/demo/goals/{first_id}/restore",
        headers=headers,
        json={},
    )
    assert restored.status_code == 200, restored.text
    assert restored.json()["archived_at"] is None
    assert restored.json()["objective_ids"] == [linked_two]
    assert [item.id for item in service.objectives("demo", include_disabled=True)] == [
        linked_one,
        linked_two,
        unlinked,
    ]


def test_workflow_versions_archive_restore_explicit_start_and_saved_view_separation(phase5):
    store, _, adapter, client, headers = phase5
    base = "/stewardship/v1/projects/demo/workflows"
    v1_nodes = [{"id": "build", "title": "Build v1"}]
    v2_nodes = [
        {"id": "build", "title": "Build v2"},
        {"id": "approve", "title": "Approve v2", "depends_on": ["build"], "human_gate": True},
    ]

    first = client.post(base, headers=headers, json={"name": "release", "nodes": v1_nodes})
    assert first.status_code == 200, first.text
    second = client.post(
        f"{base}/release/versions", headers=headers, json={"nodes": v2_nodes}
    )
    assert second.status_code == 200, second.text
    assert (first.json()["version"], second.json()["version"]) == (1, 2)

    view = client.put(
        "/stewardship/v1/projects/demo/views",
        headers=headers,
        json={
            "name": "release", "layout": "board", "filters": {},
            "actor_id": "sahil", "actor_kind": "human", "shared": False,
        },
    )
    assert view.status_code == 200, view.text
    assert store._conn.execute(
        "SELECT COUNT(*) FROM dockyard_saved_views WHERE project_id='demo' AND name='release'"
    ).fetchone()[0] == 1
    assert store._conn.execute(
        "SELECT COUNT(*) FROM dockyard_workflows WHERE project_id='demo' AND name='release'"
    ).fetchone()[0] == 2

    started_v1 = client.post(
        f"{base}/release/start", headers=headers,
        json={"run_key": "run-v1", "version": 1},
    )
    assert started_v1.status_code == 200, started_v1.text
    assert started_v1.json()["version"] == 1
    task_v1 = adapter.get_work("demo", "task", started_v1.json()["tasks"]["build"])
    assert task_v1["title"] == "Build v1"

    before_runs = client.get(f"{base}/release/runs", headers=headers).json()["runs"]
    assert [(run["version"], run["run_key"]) for run in before_runs] == [(1, "run-v1")]
    archived = client.post(f"{base}/release/archive", headers=headers, json={})
    assert archived.status_code == 200, archived.text
    assert all(row["archived_at"] for row in archived.json()["versions"])
    blocked = client.post(
        f"{base}/release/start", headers=headers,
        json={"run_key": "blocked", "version": 2},
    )
    assert blocked.status_code == 409
    assert adapter.get_work("demo", "task", started_v1.json()["tasks"]["build"])["title"] == "Build v1"

    restored = client.post(f"{base}/release/restore", headers=headers, json={})
    assert restored.status_code == 200, restored.text
    assert all(row["archived_at"] is None for row in restored.json()["versions"])
    started_v2 = client.post(
        f"{base}/release/start", headers=headers,
        json={"run_key": "run-v2", "version": 2},
    )
    assert started_v2.status_code == 200, started_v2.text
    assert started_v2.json()["version"] == 2
    runs = client.get(f"{base}/release/runs", headers=headers).json()["runs"]
    assert {(run["version"], run["run_key"]) for run in runs} == {
        (1, "run-v1"), (2, "run-v2")
    }
    listed = client.get(f"{base}?include_archived=true", headers=headers).json()["workflows"]
    assert [(row["name"], row["version"]) for row in listed] == [
        ("release", 1), ("release", 2)
    ]


def test_managed_content_archive_restore_dependency_block_and_removal(phase5):
    store, service, _, client, headers = phase5
    uploaded = service.upload_project_content(
        "demo", filename="runbook.md", media_type="text/markdown",
        content=b"# Recovery\n", actor="sahil", interface="test",
    )
    content_id = uploaded["content_id"]
    path = _managed_path(store, content_id)

    archived = client.post(
        f"/stewardship/v1/projects/demo/content/{content_id}/archive",
        headers=headers, json={},
    )
    assert archived.status_code == 200, archived.text
    assert archived.json()["archived_at"]
    assert client.get(
        "/stewardship/v1/projects/demo/content", headers=headers
    ).json()["content"] == []
    assert client.get(
        "/stewardship/v1/projects/demo/content?include_archived=true", headers=headers
    ).json()["content"][0]["content_id"] == content_id

    restored = client.post(
        f"/stewardship/v1/projects/demo/content/{content_id}/restore",
        headers=headers, json={},
    )
    assert restored.status_code == 200, restored.text
    assert restored.json()["archived_at"] is None

    objective_id = _objective(service, "demo", "Runbook current")
    service.record_assessment(
        "demo", objective_id, passed=True, evidence=[content_id],
        actor="sahil", interface="service", trusted_principal="sahil",
    )
    blocked = client.delete(
        f"/stewardship/v1/projects/demo/content/{content_id}", headers=headers
    )
    assert blocked.status_code == 409, blocked.text
    assert blocked.json()["error"]["message"]
    assert path.is_file()
    assert store._conn.execute(
        "SELECT removal_state FROM project_content WHERE content_id=?", (content_id,)
    ).fetchone()["removal_state"] == "active"

    service.remove_objective("demo", objective_id, actor="sahil", interface="test")
    removed = client.delete(
        f"/stewardship/v1/projects/demo/content/{content_id}", headers=headers
    )
    assert removed.status_code == 200, removed.text
    assert removed.json()["removal_state"] == "file_removed"
    assert not path.exists()
    assert path.with_name(f".{content_id}.removing").read_bytes() == b""
    history = client.get(
        "/stewardship/v1/projects/demo/content?include_archived=true&include_removed=true",
        headers=headers,
    ).json()["content"]
    assert history[0]["content_id"] == content_id
    assert history[0]["removal_state"] == "file_removed"


def test_managed_file_removal_rejects_traversal_symlink_and_changed_identity(phase5, tmp_path):
    store, service, _, _, _ = phase5

    traversal = service.upload_project_content(
        "demo", filename="traversal.md", media_type="text/markdown",
        content=b"safe", actor="sahil",
    )
    outside = tmp_path / "outside.md"
    outside.write_bytes(b"outside")
    store._conn.execute(
        "UPDATE project_content SET stored_path='../outside.md' WHERE content_id=?",
        (traversal["content_id"],),
    )
    store._conn.commit()
    traversal_before = dict(store._conn.execute(
        "SELECT * FROM project_content WHERE content_id=?", (traversal["content_id"],)
    ).fetchone())
    with pytest.raises(ServiceError, match="managed relative path"):
        service.remove_project_content("demo", traversal["content_id"], actor="sahil")
    assert outside.read_bytes() == b"outside"
    assert dict(store._conn.execute(
        "SELECT * FROM project_content WHERE content_id=?", (traversal["content_id"],)
    ).fetchone()) == traversal_before

    symlinked = service.upload_project_content(
        "demo", filename="symlink.md", media_type="text/markdown",
        content=b"managed", actor="sahil",
    )
    symlink_path = _managed_path(store, symlinked["content_id"])
    symlink_path.unlink()
    symlink_path.symlink_to(outside)
    symlink_before = dict(store._conn.execute(
        "SELECT * FROM project_content WHERE content_id=?", (symlinked["content_id"],)
    ).fetchone())
    with pytest.raises(ServiceError, match="symlink"):
        service.remove_project_content("demo", symlinked["content_id"], actor="sahil")
    assert symlink_path.is_symlink()
    assert outside.read_bytes() == b"outside"
    assert dict(store._conn.execute(
        "SELECT * FROM project_content WHERE content_id=?", (symlinked["content_id"],)
    ).fetchone()) == symlink_before

    changed = service.upload_project_content(
        "demo", filename="changed.md", media_type="text/markdown",
        content=b"same bytes", actor="sahil",
    )
    changed_path = _managed_path(store, changed["content_id"])
    replacement = changed_path.with_name("replacement.tmp")
    replacement.write_bytes(b"same bytes")
    os.replace(replacement, changed_path)
    changed_before = dict(store._conn.execute(
        "SELECT * FROM project_content WHERE content_id=?", (changed["content_id"],)
    ).fetchone())
    with pytest.raises(ServiceError, match="identity"):
        service.remove_project_content("demo", changed["content_id"], actor="sahil")
    assert changed_path.read_bytes() == b"same bytes"
    assert dict(store._conn.execute(
        "SELECT * FROM project_content WHERE content_id=?", (changed["content_id"],)
    ).fetchone()) == changed_before


def test_managed_file_permission_refusal_precedes_mutation_and_filesystem_failure_recovers(
    phase5, monkeypatch
):
    store, service, _, client, headers = phase5
    uploaded = service.upload_project_content(
        "demo", filename="protected.md", media_type="text/markdown",
        content=b"protected", actor="sahil",
    )
    content_id = uploaded["content_id"]
    path = _managed_path(store, content_id)
    before = dict(store._conn.execute(
        "SELECT * FROM project_content WHERE content_id=?", (content_id,)
    ).fetchone())

    denied = client.delete(f"/stewardship/v1/projects/demo/content/{content_id}")
    assert denied.status_code == 401
    assert path.is_file()
    assert dict(store._conn.execute(
        "SELECT * FROM project_content WHERE content_id=?", (content_id,)
    ).fetchone()) == before

    real_ftruncate = os.ftruncate
    def refuse_erase(*args, **kwargs):
        raise PermissionError("disposable permission denial")
    monkeypatch.setattr(os, "ftruncate", refuse_erase)
    failed = client.delete(
        f"/stewardship/v1/projects/demo/content/{content_id}", headers=headers
    )
    assert failed.status_code == 409, failed.text
    assert not path.exists()
    quarantined = path.with_name(f".{content_id}.removing")
    assert quarantined.read_bytes() == b"protected"
    assert store._conn.execute(
        "SELECT removal_state FROM project_content WHERE content_id=?", (content_id,)
    ).fetchone()["removal_state"] == "quarantined"

    monkeypatch.setattr(os, "ftruncate", real_ftruncate)
    recovered = client.delete(
        f"/stewardship/v1/projects/demo/content/{content_id}", headers=headers
    )
    assert recovered.status_code == 200, recovered.text
    assert recovered.json()["removal_state"] == "file_removed"
    assert not path.exists()
    assert quarantined.read_bytes() == b""


def test_managed_file_removal_is_anchored_against_root_and_parent_swaps(phase5, tmp_path, monkeypatch):
    store, service, _, _, _ = phase5
    uploaded = service.upload_project_content(
        "demo", filename="anchored.md", media_type="text/markdown",
        content=b"managed", actor="sahil",
    )
    path = _managed_path(store, uploaded["content_id"])
    root = store.db_path.parent / "project-content"
    external_root = tmp_path / "external-root"
    root.rename(external_root)
    root.symlink_to(external_root, target_is_directory=True)
    with pytest.raises(ServiceError, match="root cannot be a symlink"):
        service.remove_project_content("demo", uploaded["content_id"], actor="sahil")
    assert (external_root / path.relative_to(root)).read_bytes() == b"managed"

    root.unlink()
    external_root.rename(root)
    uploaded = service.upload_project_content(
        "demo", filename="parent-swap.md", media_type="text/markdown",
        content=b"managed-two", actor="sahil",
    )
    path = _managed_path(store, uploaded["content_id"])
    held = path.parent.with_name("held-parent")
    outside = tmp_path / "outside-parent"
    outside.mkdir()
    victim = outside / path.name
    victim.write_bytes(b"unrelated")
    real_stat = os.stat
    swapped = False

    def swap_after_anchored_stat(target, *args, **kwargs):
        nonlocal swapped
        result = real_stat(target, *args, **kwargs)
        if target == path.name and kwargs.get("dir_fd") is not None and not swapped:
            swapped = True
            path.parent.rename(held)
            path.parent.symlink_to(outside, target_is_directory=True)
        return result

    monkeypatch.setattr(os, "stat", swap_after_anchored_stat)
    result = service.remove_project_content("demo", uploaded["content_id"], actor="sahil")
    assert result["removal_state"] == "file_removed"
    assert victim.read_bytes() == b"unrelated"
    assert not (held / path.name).exists()


def test_managed_file_basename_swap_is_quarantined_without_deleting_replacement(
    phase5, tmp_path, monkeypatch
):
    store, service, _, _, _ = phase5
    uploaded = service.upload_project_content(
        "demo", filename="basename-swap.md", media_type="text/markdown",
        content=b"managed", actor="sahil",
    )
    path = _managed_path(store, uploaded["content_id"])
    held = path.with_name("original-held")
    external = tmp_path / "unrelated.md"
    external.write_bytes(b"unrelated")
    real_stat = os.stat
    swapped = False

    def swap_after_final_stat(target, *args, **kwargs):
        nonlocal swapped
        result = real_stat(target, *args, **kwargs)
        if target == path.name and kwargs.get("dir_fd") is not None and not swapped:
            swapped = True
            path.rename(held)
            os.replace(external, path)
        return result

    monkeypatch.setattr(os, "stat", swap_after_final_stat)
    with pytest.raises(ServiceError, match="changed during quarantine"):
        service.remove_project_content("demo", uploaded["content_id"], actor="sahil")
    assert swapped
    assert held.read_bytes() == b"managed"
    assert path.read_bytes() == b"unrelated"
    row = service._project_content_row("demo", uploaded["content_id"])
    assert row["removal_state"] != "file_removed"
    assert not [
        entry for entry in store.audit_tail(50)
        if entry["action"] == "project.content_file_removed"
        and entry["subject"] == f"demo:{uploaded['content_id']}"
    ]


def test_managed_file_removal_rechecks_dependencies_under_write_lock(phase5, monkeypatch):
    store, service, _, _, _ = phase5
    uploaded = service.upload_project_content(
        "demo", filename="dependency-race.md", media_type="text/markdown",
        content=b"managed", actor="sahil",
    )
    objective = service.add_objective(
        "demo", name="Evidence", evaluator_type="manual", target=">=1"
    )
    path = _managed_path(store, uploaded["content_id"])
    verify = service._verify_managed_content_identity

    def add_dependency(*args):
        verify(*args)
        service.record_assessment(
            "demo", objective["id"], passed=True,
            evidence=[uploaded["content_id"]], actor="human",
            interface="service", trusted_principal="human",
        )

    monkeypatch.setattr(service, "_verify_managed_content_identity", add_dependency)
    with pytest.raises(ServiceError, match="blocked by dependencies"):
        service.remove_project_content("demo", uploaded["content_id"], actor="sahil")
    assert path.read_bytes() == b"managed"
    assert service.project_content_dependencies("demo", uploaded["content_id"])


@pytest.mark.parametrize("recovery", [False, True])
def test_quarantine_stat_boundary_swap_is_refused(
    phase5, tmp_path, monkeypatch, recovery
):
    store, service, _, _, _ = phase5
    uploaded = service.upload_project_content(
        "demo", filename=f"quarantine-{recovery}.md", media_type="text/markdown",
        content=b"managed", actor="sahil",
    )
    path = _managed_path(store, uploaded["content_id"])
    tombstone = path.with_name(f".{uploaded['content_id']}.removing")
    if recovery:
        real_ftruncate = os.ftruncate
        monkeypatch.setattr(os, "ftruncate", lambda *args, **kwargs: (_ for _ in ()).throw(PermissionError("hold quarantine")))
        with pytest.raises(ServiceError, match="quarantined"):
            service.remove_project_content("demo", uploaded["content_id"], actor="sahil")
        monkeypatch.setattr(os, "ftruncate", real_ftruncate)

    held = path.with_name(f"held-{recovery}")
    replacement = tmp_path / f"replacement-{recovery}.md"
    replacement.write_bytes(b"unrelated")
    real_stat = os.stat
    seen = 0

    def swap_after_final_quarantine_stat(target, *args, **kwargs):
        nonlocal seen
        result = real_stat(target, *args, **kwargs)
        if target == tombstone.name and kwargs.get("dir_fd") is not None:
            seen += 1
            trigger = 1 if recovery else 2
            if seen == trigger:
                tombstone.rename(held)
                os.replace(replacement, tombstone)
        return result

    monkeypatch.setattr(os, "stat", swap_after_final_quarantine_stat)
    with pytest.raises(ServiceError, match="identity changed"):
        service.remove_project_content("demo", uploaded["content_id"], actor="sahil")
    assert seen == (1 if recovery else 2)
    assert held.read_bytes() == b"managed"
    assert tombstone.read_bytes() == b"unrelated"
    assert not [
        entry for entry in store.audit_tail(50)
        if entry["action"] == "project.content_file_removed"
        and entry["subject"] == f"demo:{uploaded['content_id']}"
    ]


@pytest.mark.parametrize("interrupt_erase", [False, True])
def test_interruption_after_quarantine_rename_recovers_on_retry(
    phase5, monkeypatch, interrupt_erase
):
    store, service, _, _, _ = phase5
    uploaded = service.upload_project_content(
        "demo", filename="rename-interruption.md", media_type="text/markdown",
        content=b"managed", actor="sahil",
    )
    path = _managed_path(store, uploaded["content_id"])
    tombstone = path.with_name(f".{uploaded['content_id']}.removing")
    real_rename = os.rename
    interrupted = False

    def rename_then_interrupt(*args, **kwargs):
        nonlocal interrupted
        real_rename(*args, **kwargs)
        if not interrupted:
            interrupted = True
            raise OSError("after quarantine rename")

    monkeypatch.setattr(os, "rename", rename_then_interrupt)
    with pytest.raises(ServiceError, match="pending"):
        service.remove_project_content("demo", uploaded["content_id"], actor="sahil")
    assert tombstone.read_bytes() == b"managed"
    assert service._project_content_row("demo", uploaded["content_id"])["removal_state"] == "pending"

    monkeypatch.setattr(os, "rename", real_rename)
    if interrupt_erase:
        real_ftruncate = os.ftruncate
        erased = []

        def erase_then_interrupt(*args, **kwargs):
            real_ftruncate(*args, **kwargs)
            erased.append(True)
            raise OSError("after recovery descriptor erase")

        monkeypatch.setattr(os, "ftruncate", erase_then_interrupt)
        with pytest.raises(ServiceError, match="quarantined"):
            service.remove_project_content("demo", uploaded["content_id"], actor="sahil")
        assert erased == [True]
        assert tombstone.read_bytes() == b""
        assert service._project_content_row("demo", uploaded["content_id"])["removal_state"] == "quarantined"
        monkeypatch.setattr(os, "ftruncate", real_ftruncate)
    recovered = service.remove_project_content("demo", uploaded["content_id"], actor="sahil")
    assert recovered["removal_state"] == "file_removed"
    assert tombstone.read_bytes() == b""
    replay = service.remove_project_content("demo", uploaded["content_id"], actor="sahil")
    assert replay["removal_state"] == "file_removed"
    assert len([
        entry for entry in store.audit_tail(50)
        if entry["action"] == "project.content_file_removed"
        and entry["subject"] == f"demo:{uploaded['content_id']}"
    ]) == 1


@pytest.mark.parametrize("recovery", [False, True])
def test_final_removal_is_bound_to_verified_descriptor(
    phase5, tmp_path, monkeypatch, recovery
):
    store, service, _, _, _ = phase5
    uploaded = service.upload_project_content(
        "demo", filename=f"descriptor-{recovery}.md", media_type="text/markdown",
        content=b"managed", actor="sahil",
    )
    path = _managed_path(store, uploaded["content_id"])
    tombstone = path.with_name(f".{uploaded['content_id']}.removing")
    if recovery:
        real_ftruncate = os.ftruncate
        monkeypatch.setattr(
            os, "ftruncate",
            lambda *args, **kwargs: (_ for _ in ()).throw(PermissionError("hold")),
        )
        with pytest.raises(ServiceError, match="quarantined"):
            service.remove_project_content("demo", uploaded["content_id"], actor="sahil")
        monkeypatch.setattr(os, "ftruncate", real_ftruncate)

    held = path.with_name(f"descriptor-held-{recovery}")
    replacement = tmp_path / f"descriptor-replacement-{recovery}.md"
    replacement.write_bytes(b"unrelated")
    verify = service._verify_open_content_file
    seen = 0

    def verify_then_replace(row, descriptor):
        nonlocal seen
        verify(row, descriptor)
        try:
            target = os.readlink(f"/proc/self/fd/{descriptor}")
        except OSError:
            return
        if target == str(tombstone):
            seen += 1
            if seen == 2:
                tombstone.rename(held)
                os.replace(replacement, tombstone)

    monkeypatch.setattr(service, "_verify_open_content_file", verify_then_replace)
    result = service.remove_project_content(
        "demo", uploaded["content_id"], actor="sahil"
    )
    assert seen == 2
    assert held.read_bytes() == b""
    assert tombstone.read_bytes() == b"unrelated"
    assert result["removal_state"] == "file_removed"
    assert len([
        entry for entry in store.audit_tail(50)
        if entry["action"] == "project.content_file_removed"
        and entry["subject"] == f"demo:{uploaded['content_id']}"
    ]) == 1


def test_interrupted_descriptor_erase_recovery_finalises_state_and_audit(phase5, monkeypatch):
    store, service, _, _, _ = phase5
    uploaded = service.upload_project_content(
        "demo", filename="recovery.md", media_type="text/markdown",
        content=b"managed", actor="sahil",
    )
    real_ftruncate = os.ftruncate

    def erase_then_interrupt(*args, **kwargs):
        real_ftruncate(*args, **kwargs)
        raise OSError("simulated interruption after descriptor erase")

    monkeypatch.setattr(os, "ftruncate", erase_then_interrupt)
    with pytest.raises(ServiceError, match="quarantined"):
        service.remove_project_content("demo", uploaded["content_id"], actor="sahil")
    monkeypatch.setattr(os, "ftruncate", real_ftruncate)
    recovered = service.remove_project_content("demo", uploaded["content_id"], actor="sahil")
    assert recovered["removal_state"] == "file_removed"
    audits = [
        row for row in store.audit_tail(50)
        if row["action"] == "project.content_file_removed"
        and row["subject"] == f"demo:{uploaded['content_id']}"
    ]
    assert len(audits) == 1


def test_project_archive_restore_uses_local_lifecycle_and_leaves_canonical_state_untouched(
    phase5, tmp_path
):
    store, _, adapter, client, headers = phase5
    board_id = adapter.ensure_board("demo", "demo")
    task = adapter.create_work(
        "demo", kind="task", title="Canonical task", body=None,
        assignee="worker", created_by="sahil", idempotency_key="archive-task",
    )
    repository = tmp_path / "repository"
    repository.mkdir()
    tracked = repository / "README.md"
    tracked.write_text("canonical repository\n")
    board_before = [dict(row) for row in store._conn.execute(
        "SELECT * FROM kanban_boards ORDER BY id"
    ).fetchall()]
    work_before = adapter.list_work("demo")
    repo_before = tracked.read_bytes()

    denied = client.post("/stewardship/v1/projects/demo/archive", json={})
    assert denied.status_code == 401
    assert store._conn.execute(
        "SELECT archived_at FROM project_stewardship WHERE project_id='demo'"
    ).fetchone()["archived_at"] is None

    archived = client.post(
        "/stewardship/v1/projects/demo/archive", headers=headers, json={}
    )
    assert archived.status_code == 200, archived.text
    assert archived.json()["enabled"] is False
    assert archived.json()["archived_at"]
    assert archived.json()["canonical_untouched"] == [
        "project", "board", "tasks", "repository"
    ]
    assert [dict(row) for row in store._conn.execute(
        "SELECT * FROM kanban_boards ORDER BY id"
    ).fetchall()] == board_before
    assert adapter.list_work("demo") == work_before
    assert tracked.read_bytes() == repo_before
    assert board_id
    assert task["id"]

    restored = client.post(
        "/stewardship/v1/projects/demo/restore", headers=headers, json={}
    )
    assert restored.status_code == 200, restored.text
    assert restored.json()["enabled"] is True
    assert restored.json()["phase"] == "active"
    assert restored.json()["archived_at"] is None
    assert restored.json()["canonical_untouched"] == [
        "project", "board", "tasks", "repository"
    ]
    assert [dict(row) for row in store._conn.execute(
        "SELECT * FROM kanban_boards ORDER BY id"
    ).fetchall()] == board_before
    assert adapter.list_work("demo") == work_before
    assert tracked.read_bytes() == repo_before
    audited = [row for row in store.audit_tail(20) if row["action"].startswith("project.")]
    assert [(row["action"], row["actor"]) for row in audited[:2]] == [
        ("project.restored", "sahil"), ("project.archived", "sahil")
    ]


def test_milestone_full_lifecycle_preserves_identity_scope_and_attribution(phase5):
    store, _, adapter, client, headers = phase5
    task = adapter.create_work(
        "demo", kind="task", title="Release task", body=None,
        assignee="worker", created_by="sahil", idempotency_key="phase5-task",
    )
    base = "/stewardship/v1/projects/demo/milestones"

    created = client.post(
        base, headers=headers,
        json={"name": "Release", "due": "2026-12-01", "actor_id": "sahil", "actor_kind": "human"},
    )
    assert created.status_code == 200, created.text
    milestone_id = created.json()["id"]
    attached = client.post(
        f"{base}/Release/attach", headers=headers,
        json={"ref": task["id"], "actor_id": "sahil", "actor_kind": "human"},
    )
    assert attached.status_code == 200, attached.text
    closed = client.patch(
        f"{base}/Release", headers=headers,
        json={"due": "2027-01-15", "closed": True, "actor_id": "sahil", "actor_kind": "human"},
    )
    assert closed.status_code == 200, closed.text
    assert closed.json()["closed"] is True
    reopened = client.patch(
        f"{base}/Release", headers=headers,
        json={"closed": False, "actor_id": "sahil", "actor_kind": "human"},
    )
    assert reopened.status_code == 200, reopened.text
    renamed = client.post(
        f"{base}/Release/rename", headers=headers,
        json={"new_name": "Release candidate", "actor_id": "sahil", "actor_kind": "human"},
    )
    assert renamed.status_code == 200, renamed.text

    archived = client.post(
        f"{base}/Release%20candidate/archive", headers=headers, json={}
    )
    assert archived.status_code == 200, archived.text
    assert archived.json()["archived_at"]
    assert archived.json()["item_refs"] == [task["id"]]
    assert client.get(base, headers=headers).json()["milestones"] == []
    historical = client.get(f"{base}?include_archived=true", headers=headers).json()["milestones"]
    assert historical[0]["name"] == "Release candidate"
    assert historical[0]["archived_at"]

    restored = client.post(
        f"{base}/Release%20candidate/restore", headers=headers, json={}
    )
    assert restored.status_code == 200, restored.text
    assert restored.json()["archived_at"] is None
    assert restored.json()["item_refs"] == [task["id"]]
    row = store._conn.execute(
        "SELECT id, name FROM dockyard_milestones WHERE project_id='demo'"
    ).fetchone()
    assert row["id"] == milestone_id
    assert row["name"] == "Release candidate"

    detached = client.post(
        f"{base}/Release%20candidate/detach", headers=headers,
        json={"ref": task["id"], "actor_id": "sahil", "actor_kind": "human"},
    )
    assert detached.status_code == 200, detached.text
    assert client.get(f"{base}/Release%20candidate", headers=headers).json()["total"] == 0
    actions = [row["action"] for row in store.audit_tail(20)]
    assert {
        "milestone.created", "milestone.attached", "milestone.updated",
        "milestone.renamed", "milestone.archived", "milestone.restored",
        "milestone.detached",
    } <= set(actions)
    assert all(
        row["actor"] == "sahil"
        for row in store.audit_tail(20)
        if row["action"].startswith("milestone.")
    )


def test_goal_archive_requires_verified_capability_before_mutation(phase5):
    _, _, _, client, headers = phase5
    created = client.post(
        "/stewardship/v1/projects/demo/goals",
        headers=headers,
        json={"title": "Protected goal"},
    )
    assert created.status_code == 200, created.text
    goal_id = created.json()["goal_id"]

    denied = client.post(
        f"/stewardship/v1/projects/demo/goals/{goal_id}/archive",
        json={},
    )
    assert denied.status_code == 401
    readback = client.get(
        "/stewardship/v1/projects/demo/goals?include_archived=true",
        headers=headers,
    ).json()["goals"]
    assert next(row for row in readback if row["goal_id"] == goal_id)["archived_at"] is None
