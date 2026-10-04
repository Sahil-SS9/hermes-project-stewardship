"""Real proxy + backend; disposable SQLite and reference canonical adapter.

Not a vanilla Hermes compatibility test. All state is beneath the caller's
TMPDIR. Never point this server at a live home or database.
"""
import os
from pathlib import Path
import sys
import tempfile

root = Path(tempfile.mkdtemp(prefix="hps-browser-backend-"))
os.environ["HERMES_HOME"] = str(root)
os.environ["HERMES_KANBAN_HOME"] = str(root)
os.environ["DOCKYARD_PLUGIN_DB"] = str(root / "dockyard.db")
os.environ["STEWARD_DB_PATH"] = str(root / "dockyard.db")
os.environ["HERMES_DASHBOARD_SESSION_TOKEN"] = "demo-session-token"
sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "dashboard"))
# The practice server stays offline, like the pytest suite: every connection
# off this machine and every GitHub CLI run is refused and recorded
# (tests/offline_guard.py). /health reports the refusals and
# run-browser-suite.mjs fails the run if there are any.
import importlib.util as _il  # noqa: E402 (after env setup, like plugin_api below)
_offline_guard_spec = _il.spec_from_file_location(
    "_offline_guard", Path(__file__).resolve().parents[2] / "tests" / "offline_guard.py")
_offline_guard = _il.module_from_spec(_offline_guard_spec)
_offline_guard_spec.loader.exec_module(_offline_guard)  # noqa: E402 (file-path load after env setup)
_offline_guard.install()
import plugin_api
from fastapi import FastAPI
from fastapi.responses import FileResponse, HTMLResponse
from hermes_project_stewardship.api.server import create_app
from hermes_project_stewardship.kanban import ReferenceKanbanAdapter
from hermes_project_stewardship.persistence.service import StewardshipService

store = plugin_api._store
# The practice server has no Hermes behind it (reference adapter), so the
# board model picker gets the same answer as a machine without Hermes. Left
# alone, every canvas open listed this machine's real models: it ran
# `gh auth token` and called provider APIs with the operator's logins.
from hermes_project_stewardship.persistence import hermes_curation_provider  # noqa: E402 (after env setup)
hermes_curation_provider.list_hermes_models = lambda: {"available": False, "default": None, "providers": []}
# Phase-5 workflow binding validates overrides against discovered profiles
# (P5.2). Declare the fixture team's profiles through the adapter's own
# constructor seam. This is reference-adapter coverage, not vanilla-host proof.
adapter = ReferenceKanbanAdapter(
    store, profiles=["worker", "reviewer", "fixture-lead", "octacon", "quan"])
service = StewardshipService(store)
# Fixture budget: the whole browser suite shares this one backend, and its
# fixtures and tests open more than the default 5 initiatives in
# payments-relaunch (roadmap fixture 1 + inbox fixtures 2 + E5 test 3).
# Raise that project's cap through its documented policy knob, as
# tests/r2_helpers.py does for the Roadmap tests. No browser test exercises
# the cap; tests/test_service.py::test_concurrency_cap proves it is enforced.
_FIXTURE_VERIFICATION_POLICY = {"payments-relaunch": {"max_open_initiatives": 50}}
for pid in ("payments-relaunch", "mobile-client", "atlas-mobile", "legacy-integration"):
    service.enable(pid, mission=f"Deliver {pid}", lead_profile="fixture-lead",
                   member_profiles=["worker", "reviewer"], autonomy_level=2,
                   verification_policy=_FIXTURE_VERIFICATION_POLICY.get(pid))
    adapter.create_work(pid, kind="task", title=f"Verify {pid}", body="Fixture canonical work",
                        assignee="worker", created_by="fixture")

# R2 Phase C: real Roadmap fixtures. Built through the same services the
# production routes use, so the browser suite exercises the real read model.
from hermes_project_stewardship.persistence.roadmap_service import RoadmapService  # noqa: E402 (needs plugin_api._store above)
_roadmap_fixtures_spec = _il.spec_from_file_location(
    "_roadmap_fixtures", Path(__file__).resolve().parent / "_roadmap_fixtures.py")
_roadmap_fixtures = _il.module_from_spec(_roadmap_fixtures_spec)
_roadmap_fixtures_spec.loader.exec_module(_roadmap_fixtures)  # noqa: E402 (file-path load after env setup)

roadmap = RoadmapService(store, service, adapter)
_roadmap_fixtures.seed_roadmap_fixtures(service, adapter, roadmap)

# Batch D inbox fixtures: pending decisions across both tab states + one
# frozen project for the attention row. Same seam as the roadmap fixtures.
_inbox_fixtures_spec = _il.spec_from_file_location(
    "_inbox_fixtures", Path(__file__).resolve().parent / "_inbox_fixtures.py")
_inbox_fixtures = _il.module_from_spec(_inbox_fixtures_spec)
_inbox_fixtures_spec.loader.exec_module(_inbox_fixtures)  # noqa: E402 (file-path load after env setup)
_inbox_fixtures.seed_inbox_fixtures(service)

# C2 Kanban fixtures: linked work, an initiative with an objective, a milestone,
# mixed labels and far-past/far-future due dates. All in atlas-mobile.
_kanban_fixtures_spec = _il.spec_from_file_location(
    "_kanban_fixtures", Path(__file__).resolve().parent / "_kanban_fixtures.py")
_kanban_fixtures = _il.module_from_spec(_kanban_fixtures_spec)
_kanban_fixtures_spec.loader.exec_module(_kanban_fixtures)  # noqa: E402 (file-path load after env setup)
_PRINCIPAL = "demo-owner"  # who the Desktop is signed in as; the backend binds every action to it
_kanban_fixtures.seed_kanban_fixtures(service, adapter, roadmap, owner=_PRINCIPAL)
for _pid in ("legacy-integration",):
    service.disable(_pid, actor="fixture", interface="fixture")
plugin_api._app = create_app(store, kanban_adapter=adapter,
    auth_token="demo-session-token", auth_principal=_PRINCIPAL,
    auth_principal_is_human=True, capabilities=frozenset({"workflow_revision_approval", "project_archive"}))
plugin_api._client = plugin_api.httpx.AsyncClient(
    transport=plugin_api.httpx.ASGITransport(app=plugin_api._app), base_url="http://dockyard.test")
app = FastAPI()
app.include_router(plugin_api.plugin_api, prefix="/api/plugins/hermes-dockyard")

@app.get("/desktop")
def desktop():
    return HTMLResponse('<!doctype html><html><body><div id="root"></div><script type="module" src="/bundle.js"></script></body></html>')

@app.get("/bundle.js")
def bundle():
    return FileResponse(os.environ["HPS_BROWSER_BUNDLE"], media_type="text/javascript")

@app.get("/health")
def health():
    return {"state": str(root), "adapter": "reference", "backend": "real",
            "offline_refusals": list(_offline_guard.ATTEMPTS)}

if __name__ == "__main__":
    import uvicorn
    try:
        uvicorn.run(app, host="127.0.0.1", port=int(os.environ["HPS_BROWSER_PORT"]), log_level="error")
    finally:
        import shutil
        store.close()
        shutil.rmtree(root)
