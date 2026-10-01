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
import plugin_api
from fastapi import FastAPI
from fastapi.responses import FileResponse, HTMLResponse
from hermes_project_stewardship.api.server import create_app
from hermes_project_stewardship.kanban import ReferenceKanbanAdapter
from hermes_project_stewardship.persistence.service import StewardshipService

store = plugin_api._store
# Phase-5 workflow binding validates overrides against discovered profiles
# (P5.2). Declare the fixture team's profiles through the adapter's own
# constructor seam. This is reference-adapter coverage, not vanilla-host proof.
adapter = ReferenceKanbanAdapter(
    store, profiles=["worker", "reviewer", "fixture-lead", "octacon", "quan"])
service = StewardshipService(store)
for pid in ("payments-relaunch", "mobile-client", "atlas-mobile"):
    service.enable(pid, mission=f"Deliver {pid}", lead_profile="fixture-lead",
                   member_profiles=["worker", "reviewer"], autonomy_level=2)
    adapter.create_work(pid, kind="task", title=f"Verify {pid}", body="Fixture canonical work",
                        assignee="worker", created_by="fixture")
plugin_api._app = create_app(store, kanban_adapter=adapter,
    auth_token="demo-session-token", auth_principal="demo-owner",
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
    return {"state": str(root), "adapter": "reference", "backend": "real"}

if __name__ == "__main__":
    import uvicorn
    try:
        uvicorn.run(app, host="127.0.0.1", port=int(os.environ["HPS_BROWSER_PORT"]), log_level="error")
    finally:
        import shutil
        store.close()
        shutil.rmtree(root)
