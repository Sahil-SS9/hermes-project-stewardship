"""Archive hides a project everywhere; Restore brings it back exactly (owner decision 10/10/2026).

Sahil's rule for stewardship switches: hide, never delete; turning back on restores exactly.
Before this change (0.4.0 release candidate 344f4b7) Archive broke both halves:

- an archived project stayed on every list, and archiving it set ``enabled=0``, which the inbox
  read as "switched off" and raised a high-risk "Needs you now" item for it;
- Restore forced the project to switched-on + active, whatever it was before (a frozen or a
  switched-off project came back running).

Now Archive remembers whether the project was switched on (schema v41,
``archived_prior_enabled``) and keeps the project switched off while it is archived; Restore
puts back exactly what it found: the switch, the phase and the pause time. Every read that spans
projects leaves archived projects out; ``GET /projects/archived`` is the one place that lists
them, with what Restore will bring back.
"""
from __future__ import annotations

from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from hermes_project_stewardship.api.server import create_app
from hermes_project_stewardship.cli.app import main as stewardctl
from hermes_project_stewardship.domain.constants import Capability
from hermes_project_stewardship.events.notifications import NotificationEngine
from hermes_project_stewardship.kanban import ReferenceKanbanAdapter
from hermes_project_stewardship.persistence import migrations
from hermes_project_stewardship.persistence.service import ServiceError, StewardshipService
from hermes_project_stewardship.persistence.store import Store

GONE = "zz-retired-proj"  # distinctive: no other text in any response contains it
KEPT = "demo"
API = "/stewardship/v1"
# Not compared by the exact-restore check: they record the archive itself, or the write time.
_ARCHIVE_COLUMNS = {"updated_at", "archived_at", "archived_by", "archived_prior_enabled"}


@pytest.fixture()
def world(tmp_path: Path):
    store = Store(tmp_path / "archive.db")
    svc = StewardshipService(store)
    for pid in (KEPT, GONE):
        svc.enable(pid, mission=f"{pid} mission", lead_profile="lead", member_profiles=["worker"])
    app = create_app(
        store,
        kanban_adapter=ReferenceKanbanAdapter(store),
        auth_token="secret",
        auth_principal="sahil",
        auth_principal_is_human=True,
        capabilities={member.value for member in Capability},
    )
    yield store, svc, TestClient(app), {"Authorization": "Bearer secret"}
    store.close()


def _row(store: Store, project_id: str) -> dict:
    row = store._conn.execute(
        "SELECT * FROM project_stewardship WHERE project_id=?", (project_id,)
    ).fetchone()
    return {key: row[key] for key in row.keys() if key not in _ARCHIVE_COLUMNS}


def _archive(client, headers, project_id=GONE):
    response = client.post(f"{API}/projects/{project_id}/archive", headers=headers, json={})
    assert response.status_code == 200, response.text
    return response.json()


def _restore(client, headers, project_id=GONE):
    response = client.post(f"{API}/projects/{project_id}/restore", headers=headers, json={})
    assert response.status_code == 200, response.text
    return response.json()


# ---- Restore is exact -------------------------------------------------------------

_STARTS = {
    "active": lambda svc: None,
    "paused": lambda svc: svc.pause(GONE, actor="sahil"),
    "frozen": lambda svc: svc.freeze(GONE, actor="sahil"),
    "switched-off": lambda svc: svc.disable(GONE, actor="sahil"),
    "paused-then-switched-off": lambda svc: (svc.pause(GONE, actor="sahil"),
                                             svc.disable(GONE, actor="sahil")),
    "frozen-then-switched-off": lambda svc: (svc.freeze(GONE, actor="sahil"),
                                             svc.disable(GONE, actor="sahil")),
}


@pytest.mark.parametrize("start", sorted(_STARTS))
def test_restore_brings_the_project_back_exactly(world, start):
    store, svc, client, headers = world
    _STARTS[start](svc)
    before = _row(store, GONE)

    archived = _archive(client, headers)
    assert archived["archived_at"] and archived["archived_by"] == "sahil"
    assert archived["enabled"] is False  # nothing runs on a project while it is archived

    restored = _restore(client, headers)
    assert restored["archived_at"] is None and restored["archived_by"] is None
    assert _row(store, GONE) == before  # switch, phase, pause time and everything else
    assert store._conn.execute(
        "SELECT archived_prior_enabled FROM project_stewardship WHERE project_id=?", (GONE,)
    ).fetchone()[0] is None  # the memory is spent once it has been used


def test_restore_of_an_archive_made_by_an_older_version_keeps_phase_and_pause(world):
    """Archives made before v41 did not record the switch. Restore then switches the project
    back on, as it always did, but no longer forces it to active: frozen stays frozen."""
    store, svc, client, headers = world
    svc.freeze(GONE, actor="sahil")
    before = _row(store, GONE)
    with store.tx() as cx:  # exactly what the old Archive wrote
        cx.execute(
            "UPDATE project_stewardship SET enabled=0, archived_at=?, archived_by=?"
            " WHERE project_id=?", ("2026-09-01T00:00:00+00:00", "older-version", GONE),
        )
    _restore(client, headers)
    assert _row(store, GONE) == before
    assert before["enabled"] == 1 and before["phase"] == "frozen"


def test_archive_and_restore_refuse_the_wrong_state_and_change_nothing(world):
    store, svc, client, headers = world
    untouched = _row(store, GONE)
    refused = client.post(f"{API}/projects/{GONE}/restore", headers=headers, json={})
    assert refused.status_code == 409 and "not archived" in refused.text
    _archive(client, headers)
    archived_row = _row(store, GONE)
    again = client.post(f"{API}/projects/{GONE}/archive", headers=headers, json={})
    assert again.status_code == 409 and "already archived" in again.text
    assert _row(store, GONE) == archived_row
    with pytest.raises(ServiceError, match="archived"):
        svc.re_enable(GONE, actor="sahil")  # only the explicit Restore brings it back
    _restore(client, headers)
    assert _row(store, GONE) == untouched


# ---- Archive hides it everywhere ----------------------------------------------------

def _cross_project_reads(app) -> list[str]:
    """Every RPC read that spans projects: GET routes with no path parameter, taken from the
    app's own OpenAPI schema so a route added later is covered without editing this list.
    (FastAPI 0.141 keeps included routers lazily, so ``app.routes`` does not list them; no
    route in this app is left out of the schema.)"""
    return sorted(path for path, operations in app.openapi()["paths"].items()
                  if "get" in operations and path.startswith(f"{API}/") and "{" not in path)


# Before archiving, the project must show on these, or the "nowhere" check below proves nothing.
_SHOWN_BEFORE = [
    f"{API}/projects", f"{API}/dashboard", f"{API}/portfolio", f"{API}/inbox", f"{API}/search",
    f"{API}/notifications", f"{API}/settings/last-project",
]


def test_an_archived_project_appears_in_no_list_count_or_inbox(world, monkeypatch):
    store, svc, client, headers = world
    # /canvas/models lists the models Hermes has set up. With a real Hermes importable (as under
    # `hermes verify`) that asks the providers over the network, which the offline guard
    # refuses: answer as a machine without Hermes does, like desktop/disposable-backend.py.
    from hermes_project_stewardship.persistence import hermes_curation_provider
    monkeypatch.setattr(hermes_curation_provider, "list_hermes_models",
                        lambda: {"available": False, "default": None, "providers": []})
    # Everything that puts a project on a list: a decision waiting (approval inbox), an unread
    # high alert (notifications), the app's last-chosen project, and frozen (attention).
    svc.propose_initiative(GONE, title="Retired work", rationale="evidence: CI red for 3 days")
    NotificationEngine(store, svc, zone="Europe/London").create(
        GONE, severity="high", kind="alert", title="Retired alert")
    assert client.put(f"{API}/settings/last-project", headers=headers,
                      json={"project_id": GONE}).status_code == 200
    svc.freeze(GONE, actor="sahil")
    reads = _cross_project_reads(client.app)
    assert set(_SHOWN_BEFORE) <= set(reads)
    params = {f"{API}/search": {"q": GONE[:6]}}

    def read_all() -> dict[str, tuple[int, str]]:
        out = {}
        for path in reads:
            response = client.get(path, headers=headers, params=params.get(path))
            out[path] = (response.status_code, response.text)
        return out

    before = read_all()
    for path in _SHOWN_BEFORE:
        code, text = before[path]
        assert code == 200 and GONE in text, f"positive control: {path} {code} {text[:200]}"

    _archive(client, headers)
    after = read_all()
    leaks = {path: text[:300] for path, (_, text) in after.items()
             if GONE in text and path != f"{API}/projects/archived"}
    assert leaks == {}
    for path in _SHOWN_BEFORE:
        assert after[path][0] == 200, (path, after[path])
    for path in (f"{API}/projects", f"{API}/dashboard", f"{API}/portfolio"):
        assert KEPT in after[path][1], path  # the other project is still everywhere
    dashboard = client.get(f"{API}/dashboard", headers=headers).json()
    assert [p["id"] for p in dashboard["projects"]] == [KEPT]
    # Its own pages still open when asked for by name (that is how Restore finds it).
    assert client.get(f"{API}/projects/{GONE}/settings", headers=headers).status_code == 200

    _restore(client, headers)
    again = read_all()
    for path in _SHOWN_BEFORE:
        assert GONE in again[path][1], f"not back after restore: {path}"


def test_the_archived_list_says_what_restore_brings_back(world):
    store, svc, client, headers = world
    svc.freeze(GONE, actor="sahil")
    _archive(client, headers)
    response = client.get(f"{API}/projects/archived", headers=headers)
    assert response.status_code == 200, response.text
    projects = response.json()["projects"]
    assert [p["project_id"] for p in projects] == [GONE]
    entry = projects[0]
    assert entry["mission"] == f"{GONE} mission"
    assert entry["archived_by"] == "sahil" and entry["archived_at"]
    assert entry["restores_to"] == {"enabled": True, "phase": "frozen"}
    _restore(client, headers)
    assert client.get(f"{API}/projects/archived", headers=headers).json() == {"projects": []}


def test_the_archived_list_needs_the_token(world):
    _, _, client, _ = world
    assert client.get(f"{API}/projects/archived").status_code == 401


def test_cli_archive_list_still_finds_archived_projects(world, capsys):
    store, svc, client, headers = world
    _archive(client, headers)
    capsys.readouterr()
    assert stewardctl(["--db", str(store.db_path), "project", "archive", "--list"]) == 0
    out = capsys.readouterr().out
    assert GONE in out and KEPT not in out


# ---- schema v41 ---------------------------------------------------------------------

def test_v41_adds_and_removes_the_archive_memory(world):
    store, _, _, _ = world
    columns = lambda: [r[1] for r in store._conn.execute("PRAGMA table_info(project_stewardship)")]
    assert store.schema_version >= 41
    assert "archived_prior_enabled" in columns()
    v41 = next(m for m in migrations.MIGRATIONS if m.version == 41)
    store._conn.executescript(v41.downgrade_sql)
    assert "archived_prior_enabled" not in columns()
    store._conn.executescript(v41.upgrade_sql)
    assert "archived_prior_enabled" in columns()
