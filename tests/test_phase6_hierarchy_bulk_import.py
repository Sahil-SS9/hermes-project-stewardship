"""Phase 6 backend acceptance: hierarchy and safe CSV bulk entry."""
from __future__ import annotations

from hermes_project_stewardship.dockyard import Actor, ActorKind, WorkItemType
from hermes_project_stewardship.persistence.dockyard_service import DockyardService


ACTOR = Actor(id="sahil", display_name="Sahil", kind=ActorKind.HUMAN)


def test_epic_feature_task_containment_and_cross_project_isolation(store, enabled, svc):
    other = "other"
    svc.enable(other, mission="other", lead_profile="lead")
    dy = DockyardService(store)
    epic = dy.create_item(enabled, WorkItemType.EPIC, "Platform", actor=ACTOR)
    feature = dy.create_item(enabled, WorkItemType.FEATURE, "Import", actor=ACTOR,
                             parent_ref=epic.ref)
    task = dy.create_item(enabled, WorkItemType.TASK, "Parse CSV", actor=ACTOR,
                          parent_ref=feature.ref)
    assert dy.get(enabled, task.ref).parent_id == feature.id
    try:
        dy.create_item(enabled, WorkItemType.TASK, "Bad child", actor=ACTOR,
                       parent_ref=task.ref)
    except ValueError as exc:
        assert "cannot parent" in str(exc)
    else:
        raise AssertionError("task parent cycle/type violation accepted")
    foreign = dy.create_item(other, WorkItemType.EPIC, "Foreign", actor=ACTOR)
    try:
        dy.attach_parent(enabled, feature.ref, foreign.ref, actor=ACTOR)
    except ValueError as exc:
        assert "child and parent" in str(exc)
    else:
        raise AssertionError("cross-project containment accepted")


def test_csv_preview_apply_retry_and_no_data_loss(store, enabled):
    dy = DockyardService(store)
    csv_text = ("row_key,type,title,parent_key,labels,estimate_days,due,initiative_ref\n"
                "epic-1,epic,Platform,,,,,\n"
                "feature-1,feature,Import,epic-1,backend;bulk,2,,\n"
                "task-1,task,Parse CSV,feature-1,parser,1,,\n")
    preview = dy.preview_csv_import(enabled, csv_text)
    assert preview["valid"] is True and preview["row_count"] == 3
    result = dy.import_csv(enabled, csv_text, actor=ACTOR)
    assert result["imported"] == 3
    rows = {row["row_key"]: row["ref"] for row in result["items"]}
    assert len(rows) == 3
    assert dy.get(enabled, rows["task-1"]).parent_id == dy.get(enabled, rows["feature-1"]).id

    bad = csv_text.replace("feature-1,feature", "feature-1,feature").replace(
        "task-1,task,Parse CSV,feature-1", "task-1,task,Parse CSV,missing")
    invalid = dy.preview_csv_import(enabled, bad)
    assert invalid["valid"] is False
    assert dy.import_csv(enabled, bad, actor=ACTOR)["imported"] == 0
    assert len(dy.list(enabled)) == 3




def test_csv_preview_rejects_values_that_would_fail_apply(store, enabled):
    dy = DockyardService(store)
    csv_text = ("row_key,type,title,estimate_days,due\n"
                "bad-1,task,Valid title,nope,2026-99-99\n")
    preview = dy.preview_csv_import(enabled, csv_text)
    assert preview["valid"] is False
    assert {error["field"] for error in preview["errors"]} == {"estimate_days", "due"}
    assert dy.list(enabled) == []


def test_csv_cycle_and_oversize_refused_before_write(store, enabled):
    dy = DockyardService(store)
    cycle = ("row_key,type,title,parent_key\n"
             "a,epic,Alpha,b\n"
             "b,feature,Beta,a\n")
    preview = dy.preview_csv_import(enabled, cycle)
    assert preview["valid"] is False
    assert any("cycle" in item["error"] for item in preview["errors"])
    assert dy.list(enabled) == []
    try:
        dy.preview_csv_import(enabled, "row_key,type,title\n" + "a,epic," + "x" * 1_048_577)
    except ValueError as exc:
        assert "byte limit" in str(exc)
    else:
        raise AssertionError("oversize CSV accepted")
