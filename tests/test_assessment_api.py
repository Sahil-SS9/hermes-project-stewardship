"""API boundary: manual assessment endpoints bind to the trusted principal."""

from __future__ import annotations

import pytest

fastapi = pytest.importorskip("fastapi")
from fastapi.testclient import TestClient  # noqa: E402

from hermes_project_stewardship.api.server import create_app  # noqa: E402
from hermes_project_stewardship.kanban import ReferenceKanbanAdapter  # noqa: E402
from hermes_project_stewardship.persistence.store import Store  # noqa: E402


@pytest.fixture()
def authed(tmp_path, request):
    store = Store(tmp_path / "api.db")
    app = create_app(
        store, auth_token="sekrit", rate_limit_rpm=1000,
        auth_principal_is_human=getattr(request, "param", False),
        kanban_adapter=ReferenceKanbanAdapter(store),
    )
    c = TestClient(app)
    c.headers.update({"Authorization": "Bearer sekrit"})
    c.post("/stewardship/v1/projects/p1/enable", json={
        "project_id": "p1", "mission": "m", "lead_profile": "l",
        "autonomy_level": 2,
    })
    r = c.post("/stewardship/v1/projects/p1/objectives", json={
        "name": "manual-check", "evaluator_type": "manual",
        "target": ">=1", "severity": "high",
    })
    obj_id = r.json()["id"]
    yield c, obj_id
    store.close()


@pytest.fixture()
def unauthed(tmp_path):
    """Open API: no auth configured -> no trusted principal exists."""
    store = Store(tmp_path / "api2.db")
    app = create_app(store, kanban_adapter=ReferenceKanbanAdapter(store))
    c = TestClient(app)
    yield c
    store.close()


def test_shared_token_cannot_claim_human_authority(authed):
    c, obj_id = authed
    response = c.post(
        f"/stewardship/v1/projects/p1/objectives/{obj_id}/assessment",
        json={"passed": True, "evidence": ["ticket:1"],
              "interface": "dockyard:human", "actor": "sahil"},
    )
    assert response.status_code == 403
    assert c.get(f"/stewardship/v1/projects/p1/objectives/{obj_id}/assessments").json()["assessments"] == []


@pytest.mark.parametrize("authed", [True], indirect=True)
def test_assessment_binds_verified_actor_to_principal(authed):
    c, obj_id = authed
    r = c.post(
        f"/stewardship/v1/projects/p1/objectives/{obj_id}/assessment",
        json={"passed": True, "evidence": ["ticket:1"],
              "expires_at": "2027-01-01T00:00:00+00:00"},
    )
    assert r.status_code == 200
    body = r.json()
    assert body["verified_actor"] == "rpc-token"  # middleware principal, not payload
    r = c.get(
        f"/stewardship/v1/projects/p1/objectives/{obj_id}/assessments")
    assert r.json()["assessments"][0]["verified_actor"] == "rpc-token"


def test_assessment_fails_closed_without_trusted_principal(unauthed):
    c = unauthed
    c.post("/stewardship/v1/projects/p1/enable", json={
        "project_id": "p1", "mission": "m", "autonomy_level": 2,
    })
    r = c.post("/stewardship/v1/projects/p1/objectives", json={
        "name": "manual-check", "evaluator_type": "manual", "target": ">=1",
    })
    obj_id = r.json()["id"]
    # No auth middleware configured -> no trusted authority -> 503 fail closed
    r = c.post(
        f"/stewardship/v1/projects/p1/objectives/{obj_id}/assessment",
        json={"passed": True, "evidence": ["x"]},
    )
    assert r.status_code == 503
    assert "trusted principal" in r.json()["error"]["message"]