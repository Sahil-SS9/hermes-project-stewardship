from __future__ import annotations

from pathlib import Path

from fastapi.testclient import TestClient

from hermes_project_stewardship.api.server import create_app
from hermes_project_stewardship.kanban.bridge import KanbanAdapter
from hermes_project_stewardship.persistence.service import StewardshipService
from hermes_project_stewardship.persistence.store import Store


class DiscoveryAdapter(KanbanAdapter):
    def __init__(self) -> None:
        self.projects: list[dict] = []
        self.profiles = [
            {
                "name": "default",
                "is_default": True,
                "available": True,
                "host_capabilities": ["lead", "member"],
            },
            {
                "name": "worker",
                "available": True,
                "host_capabilities": ["member"],
            },
            {
                "name": "offline",
                "available": False,
                "host_capabilities": [],
            },
        ]

    def ensure_board(self, *args):
        return "board"

    def add_card(self, *args):
        return "card"

    def move_card(self, *args):
        return None

    def list_existing_projects(self):
        return {"projects": self.projects, "profiles": self.profiles}

    def validate_project(self, **payload):
        return payload


def _payload(repo: Path, project_id: str = "alpha", **changes) -> dict:
    payload = {
        "project_id": project_id,
        "repo_path": str(repo),
        "mission": "Own the project",
        "lead_profile": "default",
        "member_profiles": ["worker"],
    }
    payload.update(changes)
    return payload


def test_discovery_and_preflight_expose_selection_and_revisions(tmp_path):
    store = Store(tmp_path / "stewardship.db")
    client = TestClient(create_app(store, kanban_adapter=DiscoveryAdapter()))

    discovery = client.get("/stewardship/v1/onboard/discover").json()
    assert discovery["profiles"][0]["available"] is True
    assert "host_capabilities" in discovery["profiles"][0]

    response = client.post(
        "/stewardship/v1/onboard/preflight", json=_payload(tmp_path)
    )
    assert response.status_code == 200
    assert response.json()["preflight"]["membership_revision"] == 0
    store.close()


def test_preflight_rejects_duplicate_and_newly_unavailable_profiles(tmp_path):
    store = Store(tmp_path / "stewardship.db")
    client = TestClient(create_app(store, kanban_adapter=DiscoveryAdapter()))

    duplicate = client.post(
        "/stewardship/v1/onboard/preflight",
        json=_payload(tmp_path, member_profiles=["worker", "worker"]),
    )
    assert duplicate.status_code == 422
    assert duplicate.json()["error"]["fields"]["member_profiles"] == [
        "Member profiles must be non-empty, unique and cannot include the lead"
    ]

    unavailable = client.post(
        "/stewardship/v1/onboard/preflight",
        json=_payload(tmp_path, member_profiles=["offline"]),
    )
    assert unavailable.status_code == 422
    assert unavailable.json()["error"]["fields"]["member_profiles"] == [
        "Profile 'offline' is unavailable"
    ]
    store.close()


def test_historical_unavailable_profile_is_explicit_and_preserved_only_for_its_project(
    tmp_path,
):
    store = Store(tmp_path / "stewardship.db")
    StewardshipService(store).enable(
        "alpha",
        mission="Existing mission",
        lead_profile="default",
        member_profiles=["retired-profile"],
    )
    client = TestClient(create_app(store, kanban_adapter=DiscoveryAdapter()))

    discovery = client.get("/stewardship/v1/onboard/discover").json()
    retired = next(p for p in discovery["profiles"] if p["name"] == "retired-profile")
    assert retired == {
        "name": "retired-profile",
        "available": False,
        "selectable": False,
        "historical_reference": True,
        "project_ids": ["alpha"],
        "host_capabilities": [],
    }

    preserved = client.post(
        "/stewardship/v1/onboard/preflight",
        json=_payload(tmp_path, member_profiles=["retired-profile"]),
    )
    assert preserved.status_code == 200, preserved.text
    assert preserved.json()["preflight"]["historical_unavailable_profiles"] == [
        "retired-profile"
    ]
    assert StewardshipService(store).settings("alpha")["owner"][
        "member_profiles"
    ] == ["retired-profile"]

    newly_selected = client.post(
        "/stewardship/v1/onboard/preflight",
        json=_payload(
            tmp_path,
            project_id="beta",
            member_profiles=["retired-profile"],
        ),
    )
    assert newly_selected.status_code == 422
    assert newly_selected.json()["error"]["fields"]["member_profiles"] == [
        "Profile 'retired-profile' is unavailable"
    ]
    store.close()
