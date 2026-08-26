from copy import deepcopy

from hermes_project_stewardship.kanban import ReferenceKanbanAdapter
from hermes_project_stewardship.persistence.migration_service import LegacyWorkMigrator


def test_legacy_migration_dry_run_apply_replay_and_rollback(store, enabled):
    with store.tx() as cx:
        cx.execute(
            "INSERT INTO dockyard_work_items "
            "(project_id,ref,type,title,status,assignee_id,created_by_id,"
            "labels_json,blocked_by_json,evidence_refs_json,created_at,updated_at) "
            "VALUES(?,?,?,?,?,?,?,?,?,?,?,?)",
            (enabled, "HDY-1", "task", "Legacy parent", "done", "octacon",
             "sahil", '["release"]', "[]", '["EV-1"]',
             "2026-01-01T00:00:00Z", "2026-01-01T00:00:00Z"),
        )
        parent_id = cx.execute(
            "SELECT id FROM dockyard_work_items WHERE ref='HDY-1'"
        ).fetchone()["id"]
        cx.execute(
            "INSERT INTO dockyard_work_items "
            "(project_id,ref,type,title,parent_id,status,assignee_id,created_by_id,"
            "labels_json,blocked_by_json,evidence_refs_json,created_at,updated_at) "
            "VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)",
            (enabled, "HDY-2", "subtask", "Legacy child", parent_id,
             "backlog", "quan", "sahil", "[]", "[]", "[]",
             "2026-01-01T00:00:00Z", "2026-01-01T00:00:00Z"),
        )
    adapter = ReferenceKanbanAdapter(store)
    migrator = LegacyWorkMigrator(store, adapter)
    source_before = migrator.source_digest()
    snapshot = {
        "items": deepcopy(adapter._canonical_items),
        "keys": deepcopy(adapter._canonical_keys),
        "sequence": adapter._canonical_sequence,
    }

    plan = migrator.dry_run(enabled)
    assert plan["count"] == 2
    assert adapter.list_work(enabled) == []
    applied = migrator.apply(enabled)
    assert applied["count"] == 2
    assert migrator.source_digest() == source_before
    records = adapter.list_work(enabled)
    assert len(records) == 2
    assert next(item for item in records if item["title"] == "Legacy parent")["status"] == "done"
    assert next(item for item in records if item["title"] == "Legacy child")["parent_task_id"]

    replay = migrator.apply(enabled)
    assert replay["mapping"] == applied["mapping"]
    assert len(adapter.list_work(enabled)) == 2

    adapter._canonical_items = snapshot["items"]
    adapter._canonical_keys = snapshot["keys"]
    adapter._canonical_sequence = snapshot["sequence"]
    assert adapter.list_work(enabled) == []
    assert migrator.source_digest() == source_before
