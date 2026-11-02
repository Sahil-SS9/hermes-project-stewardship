"""F5 (v0.5.5 independent review): the preflight preview must match reality.

The onboard handler adopts an omitted name/board from the host's own record
(connect-existing), but the preflight preview was computed from the DEFAULT
name/board (title-cased project id / bare slug), so wizard step 2 previewed
``canonical_board: accountability-app`` while provisioning actually used the
hosted ``accountability-app-board``. Preview and provisioning now resolve the
name/board through the one adoption helper.
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


class Adapter(KanbanAdapter):
    """A host that owns the project under a name/board the wizard never asks
    for: stored name ``Accountability__App``, board ``accountability-app-board``."""

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

    def list_existing_projects(self) -> dict:
        return {
            "projects": [
                {
                    "slug": "accountability-app",
                    "id": "p_native_accountability",
                    "name": "Accountability__App",
                    "board_slug": "accountability-app-board",
                    "repo_path": "/hosted/repo",
                },
            ],
            "profiles": self.list_profiles(),
        }

    def validate_project(self, **payload):
        return dict(payload)

    def provision_project(self, **payload):
        self.provisioned = dict(payload)
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
def app_client(tmp_path):
    repo = tmp_path / "accountability-app"
    repo.mkdir()
    store = Store(tmp_path / "dockyard.db")
    client = TestClient(
        create_app(store, kanban_adapter=Adapter(store)), raise_server_exceptions=False
    )
    yield client, store, repo
    store.close()


def _form(repo) -> dict:
    # No name, no board_slug: exactly the connect-existing case where the host
    # record must win at provision time (issue #32).
    return {
        "project_id": "accountability-app",
        "slug": "accountability-app",
        "repo_path": str(repo),
        "mission": "Ship the accountability app",
        "lead_profile": "octacon",
        "member_profiles": ["default"],
        "autonomy_level": 2,
    }


def test_preflight_preview_carries_the_adopted_name_and_board(app_client):
    client, _store, repo = app_client
    body = _form(repo)

    preview = client.post(PREFLIGHT, json=body).json()["preview"]
    assert preview["canonical_board"] == "accountability-app-board"
    assert preview["canonical_project_slug"] == "accountability-app"


def test_preview_and_provision_agree_on_the_board(app_client):
    client, _store, repo = app_client
    form = _form(repo)
    contract = client.post(PREFLIGHT, json=form).json()["preflight"]
    body = dict(form)
    body["idempotency_key"] = f"dockyard-onboard:accountability-app:{contract['token']}"
    body["expected_membership_revision"] = contract["membership_revision"]
    body["preflight_token"] = contract["token"]
    body["actor_id"] = "desktop"

    result = client.post(ONBOARD, json=body)
    assert result.status_code == 200, result.text
    assert result.json()["canonical"]["board"]["slug"] == "accountability-app-board"
    assert result.json()["canonical"]["project"]["name"] == "Accountability__App"