"""Pressing "first read-only assessment" twice must not be an error.

The route triggers a cycle under a per-project key
(``dockyard-first-assessment:<project>``), and the engine refuses a key it has
already processed. That made the onboarding screen's one action answer 409
"duplicate trigger" forever after the first press, with no way to see the
result it was hiding. A completed cycle is now replayed instead.
"""

from __future__ import annotations

from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from hermes_project_stewardship.api.server import create_app
from hermes_project_stewardship.kanban.bridge import BoardCard, KanbanAdapter
from hermes_project_stewardship.persistence.store import Store

PREFLIGHT = "/stewardship/v1/onboard/preflight"
ONBOARD = "/stewardship/v1/onboard"
ASSESS = "/stewardship/v1/projects/accountability-app/first-assessment"


class Adapter(KanbanAdapter):
    def __init__(self, store: Store) -> None:
        self.store = store

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
        return dict(payload)

    def provision_project(self, **payload):
        return {
            "status": "complete",
            "idempotency_key": payload["idempotency_key"],
            "replayed": False,
            "project": {
                "id": "p_native_accountability",
                "slug": payload["slug"],
                "name": payload["name"],
                "board_slug": payload["board_slug"],
            },
            "board": {"slug": payload["board_slug"], "project_id": "p_native_accountability"},
        }

    def create_work(self, *args, **kwargs):
        raise AssertionError("not used")

    def list_work(self, *args, **kwargs):
        return []

    def get_work(self, *args, **kwargs):
        raise ValueError("not found")

    def transition_work(self, *args, **kwargs):
        raise AssertionError("not used")


@pytest.fixture()
def onboarded(tmp_path):
    repo = tmp_path / "accountability-app"
    repo.mkdir()
    store = Store(tmp_path / "dockyard.db")
    client = TestClient(create_app(store, kanban_adapter=Adapter(store)), raise_server_exceptions=False)

    form = {
        "project_id": "accountability-app",
        "slug": "accountability-app",
        "repo_path": str(repo),
        "mission": "Ship the accountability app",
        "lead_profile": "octacon",
        "member_profiles": ["default"],
        "autonomy_level": 2,
    }
    contract = client.post(PREFLIGHT, json=form).json()["preflight"]
    body = dict(form)
    body["idempotency_key"] = f"dockyard-onboard:accountability-app:{contract['token']}"
    body["expected_membership_revision"] = contract["membership_revision"]
    body["preflight_token"] = contract["token"]
    body["actor_id"] = "desktop"
    assert client.post(ONBOARD, json=body).status_code == 200

    yield client, store
    store.close()


def test_first_assessment_replays_instead_of_409(onboarded):
    client, _store = onboarded

    first = client.post(ASSESS)
    assert first.status_code == 200, first.text
    cycle_id = first.json()["assessment"]["cycle_id"]

    second = client.post(ASSESS)
    assert second.status_code == 200, second.text
    replay = second.json()["assessment"]
    assert replay["replayed"] is True
    assert replay["cycle_id"] == cycle_id
    assert second.json()["schedules_enabled"] is False
