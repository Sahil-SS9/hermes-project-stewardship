"""A corrected onboarding review must stay onboardable.

The desktop wizard used to send one fixed idempotency key per project
(``dockyard-onboard:<project_id>``). The API binds a key to the exact request
it first carried and answers ``409 idempotency_conflict`` when a later request
under that key differs, so a first attempt that died before completing
poisoned every corrected retry: "Validate with host" kept passing and
"Onboard project" kept 409ing with no way out of the wizard.

The wizard now derives its key from the reviewed preflight token (a hash of
the payload + membership revision the commit is already gated on), so an
unchanged resubmit keeps its key and any edit mints a fresh one. These tests
pin both halves of that contract.
"""

from __future__ import annotations

from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from hermes_project_stewardship.api.server import create_app
from hermes_project_stewardship.kanban.bridge import BoardCard, KanbanAdapter
from hermes_project_stewardship.kanban.host_adapter import KanbanAdapterError
from hermes_project_stewardship.persistence.store import Store

ONBOARD = "/stewardship/v1/onboard"
PREFLIGHT = "/stewardship/v1/onboard/preflight"


class ProvisioningAdapter(KanbanAdapter):
    def __init__(self, store: Store) -> None:
        self.store = store
        self.calls: list[dict] = []

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
            {"name": "crew", "is_default": False},
        ]

    def validate_project(self, **payload):
        return dict(payload)

    def provision_project(self, **payload):
        self.calls.append(dict(payload))
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
            "board": {
                "slug": payload["board_slug"],
                "project_id": "p_native_accountability",
            },
        }

    def create_work(self, *args, **kwargs):
        raise AssertionError("not used")

    def list_work(self, *args, **kwargs):
        return []

    def get_work(self, *args, **kwargs):
        raise ValueError("not found")

    def transition_work(self, *args, **kwargs):
        raise AssertionError("not used")


def _payload(
    repo: Path,
    mission: str,
    *,
    key: str,
    contract: dict | None = None,
    extra: dict | None = None,
) -> dict:
    """Exactly the fields the desktop wizard posts (it sends no display name)."""
    body = {
        "project_id": "accountability-app",
        "slug": "accountability-app",
        "repo_path": str(repo),
        "mission": mission,
        "lead_profile": "octacon",
        "member_profiles": ["crew"],
        "idempotency_key": key,
        "autonomy_level": 2,
        "actor_id": "sahil",
    }
    if contract is not None:
        body["expected_membership_revision"] = contract["membership_revision"]
        body["preflight_token"] = contract["token"]
    if extra:
        body.update(extra)
    return body


def _reviewed_key(
    repo: Path, client: TestClient, mission: str, extra: dict | None = None
) -> tuple[str, dict]:
    """Exactly what the wizard does: preflight, then key + contract from it."""
    reviewed = client.post(
        PREFLIGHT,
        json={
            "project_id": "accountability-app",
            "slug": "accountability-app",
            "repo_path": str(repo),
            "mission": mission,
            "lead_profile": "octacon",
            "member_profiles": ["crew"],
            **(extra or {}),
        },
    )
    assert reviewed.status_code == 200, reviewed.text
    contract = reviewed.json()["preflight"]
    return f"dockyard-onboard:accountability-app:{contract['token']}", contract


@pytest.fixture()
def harness(tmp_path, monkeypatch):
    repo = tmp_path / "accountability-app"
    repo.mkdir()
    store = Store(tmp_path / "dockyard.db")
    adapter = ProvisioningAdapter(store)
    client = TestClient(create_app(store, kanban_adapter=adapter), raise_server_exceptions=False)

    # Attempt 1 dies after the host provisioned but before the receipt landed,
    # leaving the key bound to an "incomplete" operation — the state every
    # real 409 in the wild started from.
    original_audit = store.audit

    def fail_receipt(*args, **kwargs):
        if kwargs.get("action") == "project.onboarded":
            raise RuntimeError("injected receipt failure")
        return original_audit(*args, **kwargs)

    monkeypatch.setattr(store, "audit", fail_receipt)
    first = client.post(
        ONBOARD,
        json=_payload(repo, "Ship the accountability app", key="dockyard-onboard:accountability-app"),
    )
    assert first.status_code == 500, first.text
    monkeypatch.setattr(store, "audit", original_audit)
    assert store._conn.execute(
        "SELECT state FROM onboarding_operations WHERE idempotency_key=?",
        ("dockyard-onboard:accountability-app",),
    ).fetchone()["state"] == "incomplete"

    yield client, store, adapter, repo
    store.close()


def test_changed_review_after_incomplete_attempt_onboards_with_reviewed_key(harness):
    client, store, adapter, repo = harness
    changed_mission = "Accountability group plus async video"
    key, contract = _reviewed_key(repo, client, changed_mission)

    response = client.post(
        ONBOARD,
        json=_payload(repo, changed_mission, key=key, contract=contract),
    )
    assert response.status_code == 200, response.text
    assert adapter.calls[-1]["description"] == changed_mission
    assert store._conn.execute(
        "SELECT mission FROM project_stewardship WHERE project_id='accountability-app'"
    ).fetchone()["mission"] == changed_mission


def test_legacy_fixed_key_with_changed_review_is_the_409_that_trapped_it(harness):
    """The old fixed key: a corrected review can never be committed."""
    client, _store, adapter, repo = harness
    before = len(adapter.calls)

    response = client.post(
        ONBOARD,
        json=_payload(
            repo,
            "Accountability group plus async video",
            key="dockyard-onboard:accountability-app",
        ),
    )

    assert response.status_code == 409, response.text
    assert response.json()["error"]["code"] == "idempotency_conflict"
    assert len(adapter.calls) == before


class HostedProjectAdapter(ProvisioningAdapter):
    """The native host's connect semantics: an existing record is connectable
    only when the request agrees with the name/path/board it already stored."""

    def __init__(self, store, hosted: dict) -> None:
        super().__init__(store)
        self.hosted = dict(hosted)

    def list_existing_projects(self) -> dict:
        return {"projects": [dict(self.hosted)], "profiles": self.list_profiles()}

    def provision_project(self, **payload):
        self.calls.append(dict(payload))
        if (
            payload["name"] != self.hosted["name"]
            or payload["board_slug"] != self.hosted["board_slug"]
            or payload["repo_path"] != self.hosted["repo_path"]
        ):
            raise KanbanAdapterError(
                "idempotency_conflict", "Project slug is already in use"
            )
        return {
            "status": "complete",
            "replayed": True,
            "project": {
                "id": "p_native_accountability",
                "slug": self.hosted["slug"],
                "name": self.hosted["name"],
                "board_slug": self.hosted["board_slug"],
            },
            "board": {
                "slug": self.hosted["board_slug"],
                "project_id": "p_native_accountability",
            },
        }


def _hosted_harness(tmp_path):
    repo = tmp_path / "accountability-app"
    repo.mkdir()
    store = Store(tmp_path / "dockyard.db")
    hosted = {
        "id": "p_4b5b14e5",
        "slug": "accountability-app",
        "name": "Accountability__App",
        "board_slug": "accountability-app",
        "repo_path": str(repo),
    }
    adapter = HostedProjectAdapter(store, hosted)
    client = TestClient(create_app(store, kanban_adapter=adapter), raise_server_exceptions=False)
    return client, store, adapter, repo


def test_connect_existing_adopts_the_host_record_name(tmp_path):
    """The wizard sends no display name; a hosted record under another name
    must still be connectable instead of 409 "slug is already in use"."""
    client, store, adapter, repo = _hosted_harness(tmp_path)
    mission = "Accountability group plus async video"
    key, contract = _reviewed_key(repo, client, mission)

    response = client.post(
        ONBOARD,
        json=_payload(repo, mission, key=key, contract=contract),
    )

    assert response.status_code == 200, response.text
    assert adapter.calls[-1]["name"] == "Accountability__App"
    assert store._conn.execute(
        "SELECT COUNT(*) AS n FROM project_stewardship WHERE project_id='accountability-app'"
    ).fetchone()["n"] == 1
    store.close()


def test_an_explicit_mismatched_name_is_still_a_real_conflict(tmp_path):
    client, store, adapter, repo = _hosted_harness(tmp_path)
    mission = "Accountability group plus async video"
    extra = {"name": "Somebody Else"}
    key, contract = _reviewed_key(repo, client, mission, extra=extra)
    body = _payload(repo, mission, key=key, contract=contract, extra=extra)

    response = client.post(ONBOARD, json=body)

    assert response.status_code == 409, response.text
    assert response.json()["error"]["code"] == "idempotency_conflict"
    store.close()
