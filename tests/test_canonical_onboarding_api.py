from __future__ import annotations

from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from hermes_project_stewardship.api.server import create_app
from hermes_project_stewardship.kanban import KanbanAdapterError
from hermes_project_stewardship.kanban.bridge import BoardCard, KanbanAdapter
from hermes_project_stewardship.persistence.dockyard_service import DockyardService
from hermes_project_stewardship.persistence.store import Store


class ProvisioningAdapter(KanbanAdapter):
    def __init__(self, store: Store, *, fail: bool = False) -> None:
        self.store = store
        self.fail = fail
        self.calls: list[dict] = []
        self.by_key: dict[str, dict] = {}

    def ensure_board(self, project_id: str, slug: str) -> str:
        return slug

    def add_card(self, board_id: str, card: BoardCard) -> str:
        raise AssertionError("not used")

    def move_card(self, board_id: str, card_id: str, column: str) -> None:
        raise AssertionError("not used")

    def list_profiles(self) -> list[dict]:
        return [
            {"name": "default", "is_default": True},
            {"name": "octacon", "is_default": False},
        ]

    def validate_project(self, **payload):
        if self.fail:
            raise KanbanAdapterError(
                "validation_error",
                "Project details are invalid",
                fields={"repo_path": ["Repository path does not exist"]},
            )
        return dict(payload)

    def provision_project(self, **payload):
        self.calls.append(dict(payload))
        key = payload["idempotency_key"]
        if key in self.by_key:
            return {**self.by_key[key], "replayed": True}
        assert self.store._conn.execute(
            "SELECT COUNT(*) AS n FROM project_stewardship"
        ).fetchone()["n"] == 0
        if self.fail:
            raise KanbanAdapterError(
                "validation_error",
                "Project details are invalid",
                fields={"repo_path": ["Repository path does not exist"]},
            )
        result = {
            "status": "complete",
            "idempotency_key": key,
            "replayed": False,
            "project": {
                "id": "p_native_alpha",
                "slug": payload["slug"],
                "name": payload["name"],
                "board_slug": payload["board_slug"],
            },
            "board": {
                "slug": payload["board_slug"],
                "project_id": "p_native_alpha",
            },
        }
        self.by_key[key] = result
        return result

    def create_work(self, *args, **kwargs):
        raise AssertionError("not used")

    def list_work(self, *args, **kwargs):
        return []

    def get_work(self, *args, **kwargs):
        raise ValueError("not found")

    def transition_work(self, *args, **kwargs):
        raise AssertionError("not used")


def _payload(repo: Path) -> dict:
    return {
        "project_id": "alpha",
        "name": "Alpha Project",
        "slug": "alpha",
        "repo_path": str(repo),
        "mission": "Deliver Alpha safely",
        "lead_profile": "octacon",
        "board_slug": "alpha",
        "idempotency_key": "dockyard-onboard-alpha",
        "autonomy_level": 2,
        "actor_id": "sahil",
    }


def test_onboarding_provisions_canonical_project_before_governance_and_replays(tmp_path):
    repo = tmp_path / "alpha"
    repo.mkdir()
    store = Store(tmp_path / "dockyard.db")
    adapter = ProvisioningAdapter(store)
    app = create_app(store, kanban_adapter=adapter)
    client = TestClient(app)

    first = client.post("/stewardship/v1/onboard", json=_payload(repo))
    assert first.status_code == 200, first.text
    assert first.json()["canonical"]["project"]["id"] == "p_native_alpha"
    assert first.json()["canonical"]["board"]["slug"] == "alpha"
    assert adapter.calls[0]["repo_path"] == str(repo)

    settings = client.get("/stewardship/v1/projects/alpha/settings")
    assert settings.status_code == 200
    assert settings.json()["owner"]["lead_profile"] == "octacon"
    groups = client.get("/stewardship/v1/bot-groups").json()["groups"]
    assert any(group["name"] == "alpha-ops" for group in groups)
    views = client.get(
        "/stewardship/v1/projects/alpha/views",
        params={"actor_id": "sahil"},
    ).json()["views"]
    assert any(view["name"] == "Default board" for view in views)

    replay = client.post("/stewardship/v1/onboard", json=_payload(repo))
    assert replay.status_code == 200, replay.text
    assert replay.json()["canonical"]["project"]["id"] == "p_native_alpha"
    assert replay.json()["canonical"]["replayed"] is True
    assert store._conn.execute(
        "SELECT COUNT(*) AS n FROM project_stewardship WHERE project_id='alpha'"
    ).fetchone()["n"] == 1
    store.close()


def test_onboarding_preserves_host_field_errors_and_writes_no_governance(tmp_path):
    repo = tmp_path / "missing"
    store = Store(tmp_path / "dockyard.db")
    adapter = ProvisioningAdapter(store, fail=True)
    response = TestClient(create_app(store, kanban_adapter=adapter)).post(
        "/stewardship/v1/onboard",
        json=_payload(repo),
    )

    assert response.status_code == 422
    assert response.json() == {
        "error": {
            "code": "validation_error",
            "message": "Project details are invalid",
            "fields": {"repo_path": ["Repository path does not exist"]},
        }
    }
    assert store._conn.execute(
        "SELECT COUNT(*) AS n FROM project_stewardship"
    ).fetchone()["n"] == 0
    store.close()


def test_onboarding_retry_finishes_governance_after_local_failure(tmp_path, monkeypatch):
    repo = tmp_path / "recover"
    repo.mkdir()
    store = Store(tmp_path / "dockyard.db")
    adapter = ProvisioningAdapter(store)
    client = TestClient(create_app(store, kanban_adapter=adapter))
    original = DockyardService.group_create
    attempts = {"count": 0}

    def fail_once(self, *args, **kwargs):
        attempts["count"] += 1
        if attempts["count"] == 1:
            raise RuntimeError("raw local failure")
        return original(self, *args, **kwargs)

    monkeypatch.setattr(DockyardService, "group_create", fail_once)
    first = client.post("/stewardship/v1/onboard", json=_payload(repo))
    assert first.status_code == 409
    assert "raw local failure" not in first.text
    assert len(adapter.by_key) == 1

    replay = client.post("/stewardship/v1/onboard", json=_payload(repo))
    assert replay.status_code == 200, replay.text
    assert replay.json()["canonical"]["replayed"] is True
    store.close()
