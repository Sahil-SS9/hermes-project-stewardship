from __future__ import annotations

from pathlib import Path

import pytest
from fastapi.testclient import TestClient

pytest.importorskip("hermes_constants")
pytest.importorskip("hermes_cli.kanban_db")
pytest.importorskip("hermes_cli.projects_db")

from hermes_cli import kanban_db

from hermes_project_stewardship.api.server import create_app
from hermes_project_stewardship.kanban.host_adapter import ProjectKanbanHostAdapter
from hermes_project_stewardship.kanban.vanilla_host import HostError, ProjectKanbanHost
from hermes_project_stewardship.persistence.service import StewardshipService
from hermes_project_stewardship.persistence.store import Store


@pytest.fixture(autouse=True)
def _isolate_vanilla_kanban_home(tmp_path, monkeypatch):
    monkeypatch.setenv("HERMES_KANBAN_HOME", str(tmp_path / "hermes-home"))


def _vanilla_home(tmp_path: Path) -> Path:
    home = tmp_path / "hermes-home"
    (home / "profiles" / "lead").mkdir(parents=True)
    (home / "profiles" / "worker").mkdir()
    return home


def _payload(repo: Path, *, key: str = "onboard-alpha") -> dict:
    return {
        "project_id": "alpha",
        "name": "Alpha Project",
        "slug": "alpha",
        "repo_path": str(repo),
        "mission": "Deliver Alpha safely",
        "lead_profile": "lead",
        "member_profiles": ["worker"],
        "board_slug": "alpha",
        "idempotency_key": key,
        "autonomy_level": 2,
        "actor_id": "owner",
    }


def _app(tmp_path: Path, home: Path):
    store = Store(tmp_path / "stewardship.db")
    adapter = ProjectKanbanHostAdapter(
        ProjectKanbanHost(hermes_home=home, board="alpha")
    )
    client = TestClient(create_app(store, kanban_adapter=adapter))
    return store, adapter, client


def _reviewed(client: TestClient, payload: dict) -> dict:
    response = client.post("/stewardship/v1/onboard/preflight", json=payload)
    assert response.status_code == 200, response.text
    contract = response.json()["preflight"]
    return {
        **payload,
        "expected_membership_revision": contract["membership_revision"],
        "preflight_token": contract["token"],
    }


def _state_counts(store: Store, adapter: ProjectKanbanHostAdapter) -> tuple:
    return (
        len(adapter.list_existing_projects()["projects"]),
        store._conn.execute("SELECT COUNT(*) AS n FROM project_stewardship").fetchone()["n"],
        store._conn.execute("SELECT COUNT(*) AS n FROM project_members").fetchone()["n"],
        store._conn.execute("SELECT COUNT(*) AS n FROM stewardship_audit_log").fetchone()["n"],
    )


def _assert_complete_readback(
    store: Store,
    adapter: ProjectKanbanHostAdapter,
    client: TestClient,
) -> None:
    project = adapter.host.get_project("alpha")
    board = adapter.host.get_board("alpha")
    assert project["slug"] == "alpha"
    assert project["board_slug"] == "alpha"
    assert project["archived"] is False
    assert board["slug"] == "alpha"
    assert str(board["project_id"]) == str(project["id"])

    settings = client.get("/stewardship/v1/projects/alpha/settings")
    members = client.get("/stewardship/v1/projects/alpha/members")
    assert settings.status_code == 200
    assert members.status_code == 200
    owner = settings.json()["owner"]
    assert owner["lead_profile"] == "lead"
    assert owner["member_profiles"] == ["worker"]
    team = {
        (item["profile_slug"], item["role"], item["state"])
        for item in members.json()["members"]
    }
    assert team == {
        ("lead", "lead", "active"),
        ("worker", "member", "active"),
    }
    assert store._conn.execute(
        "SELECT COUNT(*) AS n FROM project_stewardship WHERE project_id='alpha'"
    ).fetchone()["n"] == 1


def test_create_new_uses_vanilla_host_before_metadata_and_reads_back_complete_team(
    tmp_path, monkeypatch
):
    home = _vanilla_home(tmp_path)
    repo = tmp_path / "repo"
    repo.mkdir()
    store, adapter, client = _app(tmp_path, home)
    original_accept = StewardshipService.accept_onboarding_membership
    ordering_witness: list[tuple[str, str]] = []

    def observed_accept(service, project_id, **kwargs):
        project = adapter.host.get_project("alpha")
        board = adapter.host.get_board("alpha")
        assert store._conn.execute(
            "SELECT COUNT(*) AS n FROM project_stewardship"
        ).fetchone()["n"] == 0
        ordering_witness.append((project["slug"], board["slug"]))
        return original_accept(service, project_id, **kwargs)

    monkeypatch.setattr(
        StewardshipService, "accept_onboarding_membership", observed_accept
    )
    response = client.post("/stewardship/v1/onboard", json=_reviewed(client, _payload(repo)))

    assert response.status_code == 200, response.text
    assert ordering_witness == [("alpha", "alpha")]
    assert response.json()["canonical"]["project"] == adapter.host.get_project("alpha")
    assert response.json()["canonical"]["board"] == adapter.host.get_board("alpha")
    _assert_complete_readback(store, adapter, client)
    store.close()


def test_connect_existing_vanilla_project_preserves_canonical_identity_and_builds_team(
    tmp_path,
):
    home = _vanilla_home(tmp_path)
    repo = tmp_path / "repo"
    repo.mkdir()
    store, adapter, client = _app(tmp_path, home)
    canonical = adapter.provision_project(
        name="Alpha Project",
        slug="alpha",
        description="Deliver Alpha safely",
        repo_path=str(repo),
        lead_profile="lead",
        board_slug="alpha",
        idempotency_key="onboard-alpha",
    )

    preflight = client.post(
        "/stewardship/v1/onboard/preflight", json=_payload(repo)
    )
    response = client.post("/stewardship/v1/onboard", json=_reviewed(client, _payload(repo)))

    assert preflight.status_code == 200, preflight.text
    assert preflight.json()["mode"] == "connect_existing"
    assert response.status_code == 200, response.text
    assert response.json()["canonical"]["replayed"] is True
    assert response.json()["canonical"]["project"]["id"] == canonical["project"]["id"]
    _assert_complete_readback(store, adapter, client)
    store.close()


def test_vanilla_partial_failure_writes_no_metadata_then_same_key_retry_converges(
    tmp_path, monkeypatch
):
    home = _vanilla_home(tmp_path)
    repo = tmp_path / "repo"
    repo.mkdir()
    store, adapter, client = _app(tmp_path, home)
    original_create_board = kanban_db.create_board
    attempts = 0

    def fail_once(*args, **kwargs):
        nonlocal attempts
        attempts += 1
        if attempts == 1:
            raise RuntimeError("injected board failure")
        return original_create_board(*args, **kwargs)

    monkeypatch.setattr(kanban_db, "create_board", fail_once)
    reviewed = _reviewed(client, _payload(repo))
    first = client.post("/stewardship/v1/onboard", json=reviewed)

    assert first.status_code == 503
    assert "injected board failure" not in first.text
    assert store._conn.execute(
        "SELECT COUNT(*) AS n FROM project_stewardship"
    ).fetchone()["n"] == 0
    partial = adapter.host.get_project("alpha")
    assert partial["archived"] is True
    import json

    journal = json.loads(
        (home / "dockyard" / "provisioning-journal.json").read_text()
    )
    assert journal["alpha"]["project_id"] == partial["id"]
    with pytest.raises(HostError) as missing_board:
        adapter.host.get_board("alpha")
    assert missing_board.value.code == "board_not_found"

    retry = client.post("/stewardship/v1/onboard", json=reviewed)
    replay = client.post("/stewardship/v1/onboard", json=reviewed)

    assert retry.status_code == 200, retry.text
    assert retry.json()["canonical"]["replayed"] is True
    assert replay.status_code == 200, replay.text
    assert replay.json()["canonical"]["replayed"] is True
    assert attempts >= 1
    _assert_complete_readback(store, adapter, client)
    store.close()


def test_onboard_revalidates_team_before_any_write(tmp_path):
    home = _vanilla_home(tmp_path)
    repo = tmp_path / "repo"
    repo.mkdir()
    store, adapter, client = _app(tmp_path, home)
    base = _payload(repo)
    for change in [
        {"member_profiles": ["missing"]},
        {"member_profiles": ["worker", "worker"]},
        {"member_profiles": ["lead"]},
    ]:
        payload = {**base, **change, "expected_membership_revision": 0, "preflight_token": "reviewed"}
        before = _state_counts(store, adapter)
        response = client.post("/stewardship/v1/onboard", json=payload)
        assert response.status_code == 422
        assert _state_counts(store, adapter) == before

    reviewed = _reviewed(client, base)
    (home / "profiles" / "worker").rmdir()
    before = _state_counts(store, adapter)
    unavailable = client.post("/stewardship/v1/onboard", json=reviewed)
    assert unavailable.status_code == 422
    assert _state_counts(store, adapter) == before
    store.close()


def test_onboard_rejects_stale_review_and_conflicting_idempotency_reuse(tmp_path):
    home = _vanilla_home(tmp_path)
    repo = tmp_path / "repo"
    repo.mkdir()
    store, adapter, client = _app(tmp_path, home)
    payload = _payload(repo)
    reviewed = _reviewed(client, payload)

    StewardshipService(store).enable(
        "alpha", mission="old", lead_profile="lead", member_profiles=[]
    )
    stale_before = _state_counts(store, adapter)
    stale = client.post("/stewardship/v1/onboard", json=reviewed)
    assert stale.status_code == 409
    assert stale.json()["error"]["code"] == "stale_preflight"
    assert _state_counts(store, adapter) == stale_before
    store.close()

    fresh = tmp_path / "fresh"
    fresh.mkdir()
    store, adapter, client = _app(fresh, home)
    first_payload = _payload(repo)
    first = client.post("/stewardship/v1/onboard", json=_reviewed(client, first_payload))
    assert first.status_code == 200, first.text
    exact = client.post("/stewardship/v1/onboard", json=_reviewed(client, first_payload))
    assert exact.status_code == 200
    before = _state_counts(store, adapter)
    conflict_payload = {**first_payload, "member_profiles": []}
    conflict = client.post("/stewardship/v1/onboard", json=_reviewed(client, conflict_payload))
    assert conflict.status_code == 409
    assert conflict.json()["error"]["code"] == "idempotency_conflict"
    assert _state_counts(store, adapter) == before
    assert StewardshipService(store).settings("alpha")["owner"]["member_profiles"] == ["worker"]
    store.close()


def test_failed_success_receipt_keeps_binding_and_exact_retry_recovers(tmp_path, monkeypatch):
    home = _vanilla_home(tmp_path)
    repo = tmp_path / "repo"
    repo.mkdir()
    store, adapter, _ = _app(tmp_path, home)
    client = TestClient(create_app(store, kanban_adapter=adapter), raise_server_exceptions=False)
    reviewed = _reviewed(client, _payload(repo))
    original_audit = store.audit

    def fail_success_receipt(*args, **kwargs):
        if kwargs.get("action") == "project.onboarded":
            raise RuntimeError("injected receipt failure")
        return original_audit(*args, **kwargs)

    monkeypatch.setattr(store, "audit", fail_success_receipt)
    first = client.post("/stewardship/v1/onboard", json=reviewed)
    assert first.status_code == 500
    operation = store._conn.execute(
        "SELECT state, local_applied_revision FROM onboarding_operations"
        " WHERE idempotency_key=?",
        (reviewed["idempotency_key"],),
    ).fetchone()
    assert dict(operation) == {"state": "incomplete", "local_applied_revision": 1}

    monkeypatch.setattr(store, "audit", original_audit)
    retry = client.post("/stewardship/v1/onboard", json=reviewed)
    assert retry.status_code == 200, retry.text
    assert store._conn.execute(
        "SELECT state FROM onboarding_operations WHERE idempotency_key=?",
        (reviewed["idempotency_key"],),
    ).fetchone()["state"] == "completed"

    changed = _reviewed(client, {**_payload(repo), "member_profiles": []})
    conflict = client.post("/stewardship/v1/onboard", json=changed)
    assert conflict.status_code == 409
    assert conflict.json()["error"]["code"] == "idempotency_conflict"
    assert StewardshipService(store).settings("alpha")["owner"]["member_profiles"] == ["worker"]
    store.close()


def test_onboard_conditionally_rejects_membership_write_after_canonical_provision(
    tmp_path, monkeypatch
):
    home = _vanilla_home(tmp_path)
    repo = tmp_path / "repo"
    repo.mkdir()
    store, adapter, client = _app(tmp_path, home)
    reviewed = _reviewed(client, _payload(repo))
    original_provision = adapter.provision_project

    def provision_then_compete(**kwargs):
        canonical = original_provision(**kwargs)
        StewardshipService(store).enable(
            "alpha",
            mission="Concurrent onboarding",
            lead_profile="worker",
            member_profiles=["lead"],
        )
        return canonical

    monkeypatch.setattr(adapter, "provision_project", provision_then_compete)
    response = client.post("/stewardship/v1/onboard", json=reviewed)

    assert response.status_code == 409
    assert response.json()["error"]["code"] == "stale_preflight"
    assert StewardshipService(store).settings("alpha")["owner"] == {
        "lead_profile": "worker",
        "member_profiles": ["lead"],
        "owner_team_id": None,
    }
    operation = store._conn.execute(
        "SELECT state, local_applied_revision FROM onboarding_operations"
        " WHERE idempotency_key=?",
        (reviewed["idempotency_key"],),
    ).fetchone()
    assert dict(operation) == {"state": "incomplete", "local_applied_revision": None}
    assert adapter.host.get_project("alpha")["slug"] == "alpha"
    store.close()
