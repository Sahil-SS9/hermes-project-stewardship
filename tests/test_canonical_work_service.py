"""Canonical Dockyard work service contract tests."""
from __future__ import annotations

from typing import Any

import pytest

from hermes_project_stewardship.dockyard import (
    Actor,
    ActorKind,
    WorkItemStatus,
    WorkItemType,
)
import hermes_project_stewardship.persistence as persistence


class FakeCanonicalWorkPort:
    def __init__(self) -> None:
        self.items: dict[tuple[str, str, str], dict[str, Any]] = {}
        self.transitions: list[tuple[str, str, str, str]] = []
        self.sequence = 0
        self.by_key: dict[str, tuple[str, str, str]] = {}

    def create_work(
        self,
        project_id: str,
        *,
        kind: str,
        title: str,
        body: str | None,
        assignee: str | None,
        created_by: str,
        parent_id: str | None = None,
        idempotency_key: str | None = None,
    ) -> dict[str, Any]:
        if idempotency_key and idempotency_key in self.by_key:
            return dict(self.items[self.by_key[idempotency_key]])
        self.sequence += 1
        prefix = "e" if kind == "epic" else "t"
        item_id = f"{prefix}_{self.sequence}"
        item = {
            "id": item_id,
            "ref": item_id,
            "kind": kind,
            "type": kind,
            "project_id": project_id,
            "title": title,
            "body": body,
            "status": "backlog" if kind != "epic" else "active",
            "assignee": assignee,
            "created_by": created_by,
            "parent_task_id": parent_id,
        }
        self.items[(project_id, kind, item_id)] = item
        if idempotency_key:
            self.by_key[idempotency_key] = (project_id, kind, item_id)
        return dict(item)

    def list_work(self, project_id: str) -> list[dict[str, Any]]:
        return [
            dict(item)
            for (owner, _kind, _item_id), item in self.items.items()
            if owner == project_id
        ]

    def get_work(self, project_id: str, kind: str, item_id: str) -> dict[str, Any]:
        key = (project_id, kind, item_id)
        if key not in self.items:
            raise ValueError("canonical work was not found")
        return dict(self.items[key])

    def transition_work(
        self,
        project_id: str,
        kind: str,
        item_id: str,
        status: str,
    ) -> dict[str, Any]:
        item = self.get_work(project_id, kind, item_id)
        item["status"] = status
        self.items[(project_id, kind, item_id)] = item
        self.transitions.append((project_id, kind, item_id, status))
        return dict(item)


def _service_type():
    service_type = getattr(persistence, "CanonicalWorkService", None)
    assert service_type is not None, "canonical work service is not implemented"
    return service_type


def _human() -> Actor:
    return Actor(id="sahil", display_name="Sahil", kind=ActorKind.HUMAN)


def test_canonical_service_creates_lists_and_transitions_without_local_work_row(
    store,
    enabled,
):
    port = FakeCanonicalWorkPort()
    service = _service_type()(store, port)

    created = service.create_item(
        enabled,
        WorkItemType.TASK,
        "Canonical task",
        actor=_human(),
    )
    listed = service.list(enabled)
    transitioned = service.transition(
        enabled,
        created["ref"],
        WorkItemStatus.DONE,
        actor=_human(),
    )

    assert created["ref"].startswith("t_")
    assert listed == [created]
    assert transitioned["status"] == "done"
    assert port.transitions == [(enabled, "task", created["ref"], "done")]
    local_rows = store._conn.execute(
        "SELECT COUNT(*) AS n FROM dockyard_work_items"
    ).fetchone()["n"]
    assert local_rows == 0
    audit = store._conn.execute(
        "SELECT action, subject FROM stewardship_audit_log "
        "WHERE action IN ('workitem.created','workitem.transition') "
        "ORDER BY id"
    ).fetchall()
    assert [(row["action"], row["subject"]) for row in audit] == [
        ("workitem.created", created["ref"]),
        ("workitem.transition", created["ref"]),
    ]


def test_canonical_service_filters_status_using_normalised_dockyard_view(
    store,
    enabled,
):
    port = FakeCanonicalWorkPort()
    service = _service_type()(store, port)
    first = service.create_item(
        enabled,
        WorkItemType.BUG,
        "First bug",
        actor=_human(),
    )
    service.create_item(
        enabled,
        WorkItemType.SPIKE,
        "Second spike",
        actor=_human(),
    )
    service.transition(
        enabled,
        first["ref"],
        WorkItemStatus.BLOCKED,
        actor=_human(),
    )

    blocked = service.list(enabled, status=WorkItemStatus.BLOCKED)
    assert [item["ref"] for item in blocked] == [first["ref"]]


def test_canonical_service_rejects_initiative_as_execution_work(store, enabled):
    service = _service_type()(store, FakeCanonicalWorkPort())
    with pytest.raises(ValueError, match="initiative"):
        service.create_item(
            enabled,
            WorkItemType.INITIATIVE,
            "Wrong execution type",
            actor=_human(),
        )


def test_canonical_queued_item_keeps_only_binding_and_rank_metadata(
    store,
    enabled,
    svc,
):
    port = FakeCanonicalWorkPort()
    service = _service_type()(store, port)
    initiative = svc.propose_initiative(
        enabled,
        title="Canonical convergence",
        rationale="remove duplicate task storage",
    )
    actor = _human()
    assignee = Actor(
        id="coder-bot",
        display_name="Coder bot",
        kind=ActorKind.BOT,
    )

    item, entry = service.create_queued_item(
        enabled,
        title="Move work to Hermes",
        item_type=WorkItemType.TASK,
        creator=actor,
        assignee=assignee,
        rank=1,
        reason="canonical source of truth",
        initiative_ref=initiative["ref"],
        idempotency_key="queue:canonical:1",
    )

    assert item["ref"] == "t_1"
    assert item["initiative_ref"] == initiative["ref"]
    assert item["priority_rank"] == 1
    assert entry == {
        "item_ref": "t_1",
        "item_kind": "task",
        "rank": 1,
        "priority_reason": "canonical source of truth",
    }
    assert service.backlog_list(enabled) == [entry]
    assert store._conn.execute(
        "SELECT COUNT(*) AS n FROM dockyard_work_items"
    ).fetchone()["n"] == 0
    assert store._conn.execute(
        "SELECT COUNT(*) AS n FROM dockyard_canonical_work_bindings"
    ).fetchone()["n"] == 1
    assert store._conn.execute(
        "SELECT COUNT(*) AS n FROM dockyard_canonical_backlog"
    ).fetchone()["n"] == 1


def test_canonical_queue_partial_failure_is_visible_and_idempotent_retry_completes(
    store,
    enabled,
    monkeypatch,
):
    port = FakeCanonicalWorkPort()
    service = _service_type()(store, port)
    partial_error = getattr(persistence, "CanonicalWorkPartialError", None)
    assert partial_error is not None, "partial canonical write error is not implemented"
    original = service.metadata.create_binding_and_queue
    attempts = 0

    def fail_once(*args, **kwargs):
        nonlocal attempts
        attempts += 1
        if attempts == 1:
            raise RuntimeError("simulated metadata failure")
        return original(*args, **kwargs)

    monkeypatch.setattr(service.metadata, "create_binding_and_queue", fail_once)
    payload = {
        "title": "Retry canonical queue",
        "item_type": WorkItemType.BUG,
        "creator": _human(),
        "assignee": Actor(
            id="coder-bot",
            display_name="Coder bot",
            kind=ActorKind.BOT,
        ),
        "rank": 1,
        "reason": "retry must not duplicate",
        "idempotency_key": "queue:retry:1",
    }

    with pytest.raises(partial_error) as exc:
        service.create_queued_item(enabled, **payload)
    assert exc.value.item_ref == "t_1"
    assert exc.value.code == "ranking_incomplete"
    assert len(port.items) == 1
    assert service.backlog_list(enabled) == []

    item, entry = service.create_queued_item(enabled, **payload)
    assert item["ref"] == "t_1"
    assert entry["rank"] == 1
    assert len(port.items) == 1


def test_canonical_backlog_rank_shifts_and_rerank_reason_is_required(
    store,
    enabled,
):
    service = _service_type()(store, FakeCanonicalWorkPort())
    creator = _human()
    assignee = Actor(
        id="coder-bot",
        display_name="Coder bot",
        kind=ActorKind.BOT,
    )
    first, _ = service.create_queued_item(
        enabled,
        title="First canonical task",
        item_type=WorkItemType.TASK,
        creator=creator,
        assignee=assignee,
        rank=1,
        reason="first priority reason",
        idempotency_key="rank:first",
    )
    second, _ = service.create_queued_item(
        enabled,
        title="Second canonical task",
        item_type=WorkItemType.TASK,
        creator=creator,
        assignee=assignee,
        rank=1,
        reason="second priority reason",
        idempotency_key="rank:second",
    )

    ranks = {row["item_ref"]: row["rank"] for row in service.backlog_list(enabled)}
    assert ranks == {second["ref"]: 1, first["ref"]: 2}
    with pytest.raises(ValueError, match="reason"):
        service.backlog_rerank(
            enabled,
            first["ref"],
            1,
            reason="no",
            actor=creator,
        )
    audit = service.backlog_rerank(
        enabled,
        first["ref"],
        1,
        reason="customer impact is higher",
        actor=creator,
    )
    assert audit["from_rank"] == 2
    assert audit["to_rank"] == 1
