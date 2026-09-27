"""W2 API: scoped library CRUD, opt-in execution and legacy template aliases."""
from fastapi.testclient import TestClient
from hermes_project_stewardship.api.server import create_app
from hermes_project_stewardship.kanban import ReferenceKanbanAdapter

NODES = [{"id": "step", "title": "One step"}]
PREFIX = "/stewardship/v1"


def test_w2_library_alias_and_off_default_with_name_clash(store, svc, enabled):
    client = TestClient(create_app(store, kanban_adapter=ReferenceKanbanAdapter(store)))
    p = enabled
    dedicated = client.post(f"{PREFIX}/projects/{p}/workflows", json={"name": "clash", "nodes": NODES})
    assert dedicated.status_code == 200
    template = client.post(f"{PREFIX}/workflow-templates", json={"name": "clash", "nodes": NODES})
    assert template.status_code == 200, template.text
    rows = client.get(f"{PREFIX}/workflow-library").json()["workflows"]
    assert {(w["scope"], w["name"], w["owner_project_id"]) for w in rows if w["name"] == "clash"} == {
        ("project", "clash", p), ("global", "clash", None)}
    assert client.get(f"{PREFIX}/workflow-library?scope=global").json()["workflows"][0]["name"] == "clash"
    assert client.get(f"{PREFIX}/workflow-templates").json()["templates"][0]["name"] == "clash"
    available = client.get(f"{PREFIX}/projects/{p}/workflows/available")
    assert available.status_code == 200, available.text
    assert {(w["scope"], w["enabled"]) for w in available.json()["workflows"]} == {
        ("project", True), ("global", False)}
    refused = client.post(f"{PREFIX}/projects/{p}/workflows/global/clash/start", json={"run_key": "r1"})
    assert refused.status_code == 409, refused.text
    enabled_response = client.put(f"{PREFIX}/projects/{p}/workflows/global/clash/enablement", json={"enabled": True})
    assert enabled_response.status_code == 200, enabled_response.text
    started = client.post(f"{PREFIX}/projects/{p}/workflows/global/clash/start", json={"run_key": "r1"})
    assert started.status_code == 200, started.text
    assert started.json()["scope"] == "global"
    assert all(not row["name"].startswith("__global__:")
               for row in client.get(f"{PREFIX}/projects/{p}/workflows").json()["workflows"])
    assert client.post(f"{PREFIX}/projects/{p}/workflows/clash/start", json={"run_key": "dedicated"}).status_code == 200
    assert client.put(f"{PREFIX}/projects/{p}/workflows/global/clash/enablement", json={"enabled": False}).status_code == 200
    assert client.get(f"{PREFIX}/projects/{p}/workflows/global/clash/runs").json()["runs"][0]["run_key"] == "r1"
    assert client.post(f"{PREFIX}/projects/{p}/workflows/global/clash/start", json={"run_key": "r2"}).status_code == 409
    internal = store._conn.execute(
        "SELECT internal_name FROM dockyard_global_instances WHERE project_id=? AND workflow_name='clash'",
        (p,),
    ).fetchone()[0]
    assert client.post(f"{PREFIX}/projects/{p}/workflows/{internal}/start",
                       json={"run_key": "bypass"}).status_code == 409


def test_w2_versions_archive_delete_and_instantiated_copy(store, svc, enabled):
    client = TestClient(create_app(store, kanban_adapter=ReferenceKanbanAdapter(store),
                                   auth_principal="owner", auth_principal_is_human=True,
                                   capabilities={"project_archive"}))
    created = client.post(f"{PREFIX}/workflow-library", json={"scope": "global", "name": "starter", "nodes": NODES})
    assert created.status_code == 200, created.text
    copy = client.post(f"{PREFIX}/projects/{enabled}/workflows/from-template",
                       json={"template": "starter", "name": "copy"})
    assert copy.status_code == 200, copy.text
    revised = client.post(f"{PREFIX}/workflow-library/global/starter/versions",
                          json={"nodes": [{"id": "new", "title": "New"}]})
    assert revised.status_code == 200 and revised.json()["version"] == 2, revised.text
    assert client.get(f"{PREFIX}/projects/{enabled}/workflows").json()["workflows"][0]["definition"]["nodes"][0]["id"] == "step"
    assert client.delete(f"{PREFIX}/workflow-library/global/starter").status_code == 200
    assert client.get(f"{PREFIX}/workflow-templates").json()["templates"] == []
