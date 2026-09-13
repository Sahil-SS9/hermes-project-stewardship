"""Lane B Phase 7 shared helpers (lane-namespaced, no production edits).

Provides isolated Store/Service/TestClient factories bound to tmp_path,
WCAG contrast math, and route-parity helpers reused by all
test_phase7_*.py files in this lane.
"""
from __future__ import annotations

from pathlib import Path


def make_store(tmp_path: Path, name: str = "lane-b-phase7.db"):
    """Create an isolated Store inside tmp_path (never a live home)."""
    from hermes_project_stewardship.persistence.store import Store

    db = tmp_path / name
    store = Store(db)
    return store


def make_service_client(tmp_path: Path, *, db_name: str = "lane-b-phase7.db"):
    """Return (store, service, adapter, app, client, headers) with verified human auth."""
    from fastapi.testclient import TestClient

    from hermes_project_stewardship.api.server import create_app
    from hermes_project_stewardship.domain.constants import Capability
    from hermes_project_stewardship.kanban import ReferenceKanbanAdapter
    from hermes_project_stewardship.persistence.service import StewardshipService

    store = make_store(tmp_path, db_name)
    adapter = ReferenceKanbanAdapter(store)
    app = create_app(
        store,
        kanban_adapter=adapter,
        auth_token="lane-b-phase7-secret",
        auth_principal="verified-human",
        auth_principal_is_human=True,
        capabilities={c.value for c in Capability},
    )
    client = TestClient(app)
    headers = {"Authorization": "Bearer lane-b-phase7-secret"}
    service = StewardshipService(store)
    return store, service, adapter, app, client, headers


def make_open_client(tmp_path: Path, *, db_name: str = "lane-b-open.db"):
    """Return unauthenticated embedded client (for negative auth tests)."""
    from fastapi.testclient import TestClient

    from hermes_project_stewardship.api.server import create_app
    from hermes_project_stewardship.kanban import ReferenceKanbanAdapter

    store = make_store(tmp_path, db_name)
    adapter = ReferenceKanbanAdapter(store)
    app = create_app(store, kanban_adapter=adapter)
    client = TestClient(app)
    return store, adapter, app, client


# ------------------------------------------------------------------ #
# WCAG contrast helpers (relative luminance, WCAG 2.1)
# ------------------------------------------------------------------ #

def _lin(c: float) -> float:
    c = c / 255.0
    return c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4


def hex_to_rgb(h: str) -> tuple[float, float, float]:
    h = h.strip().lstrip("#")
    if len(h) == 3:
        h = "".join(ch * 2 for ch in h)
    return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16))


def contrast_ratio(fg: str, bg: str) -> float:
    """WCAG contrast ratio between two #rrggbb colours."""
    r1, g1, b1 = hex_to_rgb(fg)
    r2, g2, b2 = hex_to_rgb(bg)
    l1 = 0.2126 * _lin(r1) + 0.7152 * _lin(g1) + 0.0722 * _lin(b1)
    l2 = 0.2126 * _lin(r2) + 0.7152 * _lin(g2) + 0.0722 * _lin(b2)
    hi, lo = (l1, l2) if l1 >= l2 else (l2, l1)
    return (hi + 0.05) / (lo + 0.05)


# Canonical Desktop tokens (must match plugin.js LIGHT_TOKENS/DARK_TOKENS).
LANE_B_LIGHT = {
    "bg": "#f6f7f9", "surface": "#ffffff", "text": "#15171c",
    "textSecondary": "#515968", "action": "#3654c7", "actionHover": "#2945b4",
    "success": "#136c4a", "successBg": "#e7f6ef", "warning": "#805200",
    "warningBg": "#fff3d4", "danger": "#a72a2a", "dangerBg": "#ffeded",
    "info": "#315ca8", "infoBg": "#eaf2ff", "focus": "#3654c7",
}
LANE_B_DARK = {
    "bg": "#0f1217", "surface": "#171b22", "text": "#f3f5f7",
    "textSecondary": "#b6beca", "action": "#3654c7", "actionHover": "#4662d4",
    "success": "#72cda2", "successBg": "#16372a", "warning": "#f0bd64",
    "warningBg": "#3a2c14", "danger": "#ff9188", "dangerBg": "#40201f",
    "info": "#9ab9ff", "infoBg": "#1c2d4a", "focus": "#8fa2ff",
}


def lane_b_tmp_repo(path: Path, *, commits: int = 1) -> Path:
    """Create a disposable git repo fixture (never a live project)."""
    import subprocess

    path.mkdir(parents=True, exist_ok=True)

    def git(*args: str) -> None:
        subprocess.run(["git", *args], cwd=str(path), check=True, capture_output=True)

    git("init", "-q")
    git("config", "user.email", "lane-b@example.com")
    git("config", "user.name", "LaneB")
    (path / "README.md").write_text("lane-b fixture\n")
    git("add", "-A")
    for i in range(commits):
        (path / f"f{i}.txt").write_text(str(i))
        git("add", "-A")
        git("commit", "-qm", f"fixture {i}")
    return path
