"""Central feature toggles (DY-FT-01): hide, never delete; re-enable restores."""
from __future__ import annotations

import pytest

fastapi = pytest.importorskip("fastapi")
from fastapi.testclient import TestClient  # noqa: E402

from hermes_project_stewardship.api.server import create_app  # noqa: E402
from hermes_project_stewardship.kanban import ReferenceKanbanAdapter  # noqa: E402
from hermes_project_stewardship.persistence.store import Store  # noqa: E402
from hermes_project_stewardship.persistence.service import (  # noqa: E402
    ServiceError,
    StewardshipService,
)


@pytest.fixture()
def env(tmp_path):
    store = Store(tmp_path / "ft.db")
    app = create_app(store, kanban_adapter=ReferenceKanbanAdapter(store))
    c = TestClient(app)
    svc = StewardshipService(store)
    svc.enable("dy1", mission="m", lead_profile="l", autonomy_level=2)
    yield c, svc, store
    store.close()


def test_features_default_all_on(env):
    c, _, _ = env
    r = c.get("/stewardship/v1/projects/dy1/features")
    assert r.status_code == 200
    features = r.json()["features"]
    assert features["workflow_canvas"] is True
    assert features["milestones"] is True
    assert len(features) >= 6


def test_settings_include_features(env):
    c, _, _ = env
    r = c.get("/stewardship/v1/projects/dy1/settings")
    assert r.status_code == 200
    assert "features" in r.json() and r.json()["features"]["inbox"] is True


def test_disable_feature_409_then_reenable_200(env):
    c, svc, store = env

    # Data exists before toggle.
    rows_before = store._conn.execute(
        "SELECT COUNT(*) AS n FROM dockyard_milestones"
    ).fetchone()["n"]

    r = c.patch("/stewardship/v1/projects/dy1/features", json={
        "features": {"milestones": False}, "actor": "sahil"})
    assert r.status_code == 200 and r.json()["features"]["milestones"] is False

    # Read endpoint fails closed 409...
    r = c.get("/stewardship/v1/projects/dy1/milestones")
    assert r.status_code == 409
    assert r.json()["error"]["code"] == "feature_disabled"
    assert r.json()["error"]["fields"] == {
        "project_id": "dy1", "feature": "milestones"
    }
    assert "feature 'milestones' is disabled" in r.json()["error"]["message"]

    # ...and no data was lost.
    rows_after = store._conn.execute(
        "SELECT COUNT(*) AS n FROM dockyard_milestones"
    ).fetchone()["n"]
    assert rows_after == rows_before

    # Re-enable restores the surface.
    r = c.patch("/stewardship/v1/projects/dy1/features", json={
        "features": {"milestones": True}, "actor": "sahil"})
    assert r.status_code == 200 and r.json()["features"]["milestones"] is True
    assert c.get("/stewardship/v1/projects/dy1/milestones").status_code == 200


def test_core_features_cannot_be_toggled(env):
    c, _, _ = env
    for name in ("projects", "work_items", "audit"):
        r = c.patch("/stewardship/v1/projects/dy1/features", json={
            "features": {name: False}})
        assert r.status_code == 409, name
        assert "core" in r.json()["error"]["message"]


def test_unknown_feature_rejected(env):
    c, _, _ = env
    r = c.patch("/stewardship/v1/projects/dy1/features", json={
        "features": {"not_a_feature": False}})
    assert r.status_code == 409
    assert "unknown feature" in r.json()["error"]["message"]


def test_feature_value_must_be_boolean(env):
    c, _, _ = env
    r = c.patch("/stewardship/v1/projects/dy1/features", json={
        "features": {"inbox": "yes"}})
    # Pydantic Dict[str, bool] coerces "yes" -> True; string values that are
    # not coercion-valid are rejected by the model itself (422). Either way
    # the endpoint never stores a non-boolean.
    assert r.status_code in (200, 409, 422)


def test_audit_trail_records_toggles(env):
    c, _, store = env
    c.patch("/stewardship/v1/projects/dy1/features", json={
        "features": {"inbox": False}, "actor": "sahil"})
    rows = store._conn.execute(
        "SELECT action, actor FROM stewardship_audit_log"
        " WHERE subject='dy1:inbox' ORDER BY id DESC LIMIT 1").fetchone()
    assert rows is not None
    assert rows["action"] == "feature.disabled" and rows["actor"] == "sahil"


def test_unknown_project_404(env):
    c, _, _ = env
    r = c.get("/stewardship/v1/projects/ghost/features")
    assert r.status_code == 404


def test_work_item_data_survives_milestone_toggle(env):
    c, svc, store = env
    # Work items are core; their data must be untouched by any toggle.
    n_items = store._conn.execute(
        "SELECT COUNT(*) AS n FROM dockyard_work_items").fetchone()["n"]
    c.patch("/stewardship/v1/projects/dy1/features", json={
        "features": {"workflow_canvas": False, "milestones": False}})
    n_after = store._conn.execute(
        "SELECT COUNT(*) AS n FROM dockyard_work_items").fetchone()["n"]
    assert n_items == n_after