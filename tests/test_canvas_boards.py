"""D14/D16/D19 — multiple named planning boards per project (schema v33).

RED-first contract tests: several boards per project with a
Draft -> Submitted -> Plan made -> Completed lifecycle, non-destructive archive
(restore returns the exact prior status), per-board theme and model choice,
and board-scoped planning (sessions, answers, proposals, plans never leak
between boards). No real model calls.
"""
from __future__ import annotations

import sqlite3

import pytest

from hermes_project_stewardship.persistence.canvas_plan_document import PlanDocumentService
from hermes_project_stewardship.persistence.canvas_planning import CanvasPlanningService
from hermes_project_stewardship.persistence.canvas_service import (
    CanvasConflictError,
    CanvasLockedError,
    CanvasService,
)

B = "/stewardship/v1"
GAP = [{"id": "e1", "kind": "evidence", "content": {"text": "Users stall at import"}, "x": 80, "y": 80}]
FULL = [
    {"id": "e1", "kind": "evidence", "content": {"text": "Users stall at import"}, "x": 80, "y": 80},
    {"id": "c1", "kind": "claim", "content": {"text": "Import feels unsafe"}, "x": 400, "y": 80},
    {"id": "p1", "kind": "plan_block", "content": {"text": "Preview before commit"}, "x": 400, "y": 300},
]


def _fill(service, project, board, objects):
    return service.save(project, canvas_id=board["canvas_id"], expected_revision=board["revision"],
                        objects=objects, connectors=[], actor="sahil")


# ------------------------------------------------------------------ boards --
def test_project_holds_several_named_boards(store, enabled):
    service = CanvasService(store)
    first = service.create_board(enabled, name="Import flow", actor="sahil")
    second = service.create_board(enabled, name="Billing", actor="sahil")
    assert first["canvas_id"] != second["canvas_id"]
    assert first["status"] == "draft" and first["name"] == "Import flow"
    listed = {row["name"]: row for row in service.list_boards(enabled)}
    assert set(listed) == {"Import flow", "Billing"}
    assert listed["Billing"]["object_count"] == 0


def test_board_edits_are_isolated(store, enabled):
    service = CanvasService(store)
    a = service.create_board(enabled, name="A", actor="sahil")
    b = service.create_board(enabled, name="B", actor="sahil")
    _fill(service, enabled, a, FULL)
    assert service.get_board(enabled, b["canvas_id"])["objects"] == []
    assert len(service.get_board(enabled, a["canvas_id"])["objects"]) == 3


def test_board_names_are_trimmed_bounded_and_unique_among_live_boards(store, enabled):
    service = CanvasService(store)
    service.create_board(enabled, name="  Roadmap  ", actor="sahil")
    with pytest.raises(ValueError, match="already exists"):
        service.create_board(enabled, name="roadmap", actor="sahil")
    for bad in ("", "   ", "x" * 121):
        with pytest.raises(ValueError):
            service.create_board(enabled, name=bad, actor="sahil")
    assert [row["name"] for row in service.list_boards(enabled)] == ["Roadmap"]


def test_board_from_another_project_is_unknown(store, svc, enabled):
    svc.enable("other", mission="m", lead_profile="l", member_profiles=[], autonomy_level=2)
    service = CanvasService(store)
    foreign = service.create_board("other", name="Theirs", actor="sahil")
    with pytest.raises(ValueError, match="unknown canvas"):
        service.get_board(enabled, foreign["canvas_id"])
    with pytest.raises(ValueError, match="unknown canvas"):
        service.save(enabled, canvas_id=foreign["canvas_id"], expected_revision=1,
                     objects=[], connectors=[], actor="sahil")


def test_same_revision_on_two_boards_does_not_collide(store, enabled):
    """Every new board starts at revision 1; sessions are unique per board."""
    service = CanvasService(store)
    planning = CanvasPlanningService(store)
    a = service.create_board(enabled, name="A", actor="sahil")
    b = service.create_board(enabled, name="B", actor="sahil")
    _fill(service, enabled, a, GAP)
    _fill(service, enabled, b, GAP)
    sa = planning.start(enabled, canvas_id=a["canvas_id"], actor="sahil")
    sb = planning.start(enabled, canvas_id=b["canvas_id"], actor="sahil")
    assert sa["session_id"] != sb["session_id"]
    assert sa["canvas_id"] == a["canvas_id"] and sb["canvas_id"] == b["canvas_id"]


def test_answers_on_one_board_never_close_gaps_on_another(store, enabled):
    service = CanvasService(store)
    planning = CanvasPlanningService(store)
    a = service.create_board(enabled, name="A", actor="sahil")
    b = service.create_board(enabled, name="B", actor="sahil")
    _fill(service, enabled, a, GAP)
    _fill(service, enabled, b, GAP)
    sa = planning.start(enabled, canvas_id=a["canvas_id"], actor="sahil")
    planning.answer(sa["session_id"], outcome="skip", actor="sahil")
    sb = planning.start(enabled, canvas_id=b["canvas_id"], actor="sahil")
    assert sb["current_question"] is not None, "board B must still ask its own open gap"


# --------------------------------------------------------------- lifecycle --
def test_lifecycle_submit_plan_complete(store, enabled):
    service = CanvasService(store)
    planning = CanvasPlanningService(store)
    board = service.create_board(enabled, name="Import", actor="sahil")
    _fill(service, enabled, board, FULL)
    session = planning.start(enabled, canvas_id=board["canvas_id"], actor="sahil")
    assert service.get_board(enabled, board["canvas_id"])["status"] == "submitted"
    technical = next(p for p in session["proposals"] if p["kind"] == "technical_plan")
    assert technical["canvas_id"] == board["canvas_id"]
    planning.decide(technical["proposal_id"], approve=True, actor="sahil")
    plan = PlanDocumentService(store).synthesise_plan(enabled, proposal_id=technical["proposal_id"], actor="sahil")
    assert plan["canvas_id"] == board["canvas_id"]
    summary = next(r for r in service.list_boards(enabled) if r["canvas_id"] == board["canvas_id"])
    assert summary["status"] == "planned" and summary["plan_count"] == 1
    done = service.update_board(enabled, board["canvas_id"], status="completed", actor="sahil")
    assert done["status"] == "completed"
    plans = PlanDocumentService(store).list_plans(enabled, canvas_id=board["canvas_id"])
    assert [p["plan_id"] for p in plans] == [plan["plan_id"]]


def test_illegal_status_jump_is_refused(store, enabled):
    service = CanvasService(store)
    board = service.create_board(enabled, name="Jump", actor="sahil")
    with pytest.raises(ValueError, match="cannot move"):
        service.update_board(enabled, board["canvas_id"], status="completed", actor="sahil")
    with pytest.raises(ValueError, match="unknown board status"):
        service.update_board(enabled, board["canvas_id"], status="shipped", actor="sahil")


def test_completed_and_archived_boards_are_read_only(store, enabled):
    service = CanvasService(store)
    board = service.create_board(enabled, name="Lock", actor="sahil")
    service.update_board(enabled, board["canvas_id"], status="archived", actor="sahil")
    with pytest.raises(CanvasLockedError):
        _fill(service, enabled, board, GAP)
    with pytest.raises(CanvasLockedError):
        CanvasPlanningService(store).start(enabled, canvas_id=board["canvas_id"], actor="sahil")


def test_archive_restores_the_exact_prior_status(store, enabled):
    service = CanvasService(store)
    board = service.create_board(enabled, name="Keep", actor="sahil")
    service.update_board(enabled, board["canvas_id"], status="submitted", actor="sahil")
    service.update_board(enabled, board["canvas_id"], status="archived", actor="sahil")
    assert [r["name"] for r in service.list_boards(enabled)] == []
    archived = service.list_boards(enabled, include_archived=True)[0]
    assert archived["status"] == "archived" and archived["archived_from"] == "submitted"
    with pytest.raises(ValueError, match="cannot move"):
        service.update_board(enabled, board["canvas_id"], status="draft", actor="sahil")
    restored = service.update_board(enabled, board["canvas_id"], status="submitted", actor="sahil")
    assert restored["status"] == "submitted" and restored["archived_from"] is None


def test_board_changed_after_plan_is_flagged(store, enabled):
    service = CanvasService(store)
    planning = CanvasPlanningService(store)
    board = service.create_board(enabled, name="Drift", actor="sahil")
    saved = _fill(service, enabled, board, FULL)
    session = planning.start(enabled, canvas_id=board["canvas_id"], actor="sahil")
    technical = next(p for p in session["proposals"] if p["kind"] == "technical_plan")
    planning.decide(technical["proposal_id"], approve=True, actor="sahil")
    PlanDocumentService(store).synthesise_plan(enabled, proposal_id=technical["proposal_id"], actor="sahil")
    summary = lambda: next(r for r in service.list_boards(enabled) if r["canvas_id"] == board["canvas_id"])
    assert summary()["changed_since_plan"] is False
    service.save(enabled, canvas_id=board["canvas_id"], expected_revision=saved["revision"],
                 objects=FULL[:2], connectors=[], actor="sahil")
    assert summary()["changed_since_plan"] is True


# ----------------------------------------------------------- theme / model --
def test_theme_and_model_are_per_board_metadata_without_revision_bump(store, enabled):
    service = CanvasService(store)
    board = service.create_board(enabled, name="Meta", actor="sahil")
    updated = service.update_board(enabled, board["canvas_id"], theme="dark",
                                   model={"provider": "openai-codex", "model": "gpt-5.6-sol"}, actor="sahil")
    assert updated["theme"] == "dark"
    assert updated["model"] == {"provider": "openai-codex", "model": "gpt-5.6-sol"}
    assert updated["revision"] == board["revision"], "metadata must not conflict with in-flight edits"
    cleared = service.update_board(enabled, board["canvas_id"], theme=None, model=None, actor="sahil")
    assert cleared["theme"] is None and cleared["model"] is None
    with pytest.raises(ValueError):
        service.update_board(enabled, board["canvas_id"], theme="sepia", actor="sahil")
    with pytest.raises(ValueError):
        service.update_board(enabled, board["canvas_id"], model={"provider": "x"}, actor="sahil")


def test_model_choice_is_checked_against_the_hermes_catalogue(store, enabled):
    service = CanvasService(store)
    board = service.create_board(enabled, name="Pick", actor="sahil")
    catalogue = {"available": True, "providers": [{"slug": "openai-codex", "models": ["gpt-5.6-sol"]}]}
    with pytest.raises(ValueError, match="not configured in Hermes"):
        service.update_board(enabled, board["canvas_id"], model={"provider": "ghost", "model": "m"},
                             actor="sahil", catalogue=catalogue)
    ok = service.update_board(enabled, board["canvas_id"], model={"provider": "openai-codex", "model": "gpt-5.6-sol"},
                              actor="sahil", catalogue=catalogue)
    assert ok["model"]["provider"] == "openai-codex"


# ------------------------------------------------------ legacy single board --
def test_legacy_project_canvas_route_uses_the_most_recent_live_board(store, enabled):
    service = CanvasService(store)
    first = service.get(enabled)  # legacy call creates the default board
    assert first["name"] == "Main board"
    second = service.create_board(enabled, name="Newer", actor="sahil")
    _fill(service, enabled, second, GAP)
    assert service.get(enabled)["canvas_id"] == second["canvas_id"]
    service.update_board(enabled, second["canvas_id"], status="archived", actor="sahil")
    assert service.get(enabled)["canvas_id"] == first["canvas_id"]


def test_stale_revision_on_one_board_does_not_block_another(store, enabled):
    service = CanvasService(store)
    a = service.create_board(enabled, name="A", actor="sahil")
    b = service.create_board(enabled, name="B", actor="sahil")
    _fill(service, enabled, a, GAP)
    with pytest.raises(CanvasConflictError):
        _fill(service, enabled, a, GAP)  # stale revision 1
    assert _fill(service, enabled, b, GAP)["revision"] == 2


# --------------------------------------------------------------------- API --
def _client(tmp_path):
    from fastapi.testclient import TestClient
    from hermes_project_stewardship.api.server import create_app
    from hermes_project_stewardship.kanban import ReferenceKanbanAdapter
    from hermes_project_stewardship.persistence.store import Store
    store = Store(tmp_path / "boards.db")
    client = TestClient(create_app(store, kanban_adapter=ReferenceKanbanAdapter(store)))
    client.post(f"{B}/projects/p9/enable", json={
        "project_id": "p9", "mission": "boards", "lead_profile": "l", "autonomy_level": 2})
    return client


def test_board_routes_round_trip(tmp_path):
    client = _client(tmp_path)
    created = client.post(f"{B}/projects/p9/canvases", json={"name": "Import"})
    assert created.status_code == 200, created.text
    cid = created.json()["canvas_id"]
    dup = client.post(f"{B}/projects/p9/canvases", json={"name": "import"})
    assert dup.status_code == 409, dup.text
    board = client.get(f"{B}/projects/p9/canvases/{cid}").json()
    saved = client.put(f"{B}/projects/p9/canvases/{cid}", json={
        "expected_revision": board["revision"], "objects": GAP, "connectors": []})
    assert saved.status_code == 200, saved.text
    stale = client.put(f"{B}/projects/p9/canvases/{cid}", json={
        "expected_revision": board["revision"], "objects": GAP, "connectors": []})
    assert stale.status_code == 409
    patched = client.patch(f"{B}/projects/p9/canvases/{cid}", json={"theme": "light", "name": "Import v2"})
    assert patched.status_code == 200 and patched.json()["name"] == "Import v2"
    bad = client.patch(f"{B}/projects/p9/canvases/{cid}", json={"status": "completed"})
    assert bad.status_code == 422
    session = client.post(f"{B}/projects/p9/canvases/{cid}/sessions", json={})
    assert session.status_code == 200 and session.json()["canvas_id"] == cid
    listed = client.get(f"{B}/projects/p9/canvases").json()["canvases"]
    assert [row["status"] for row in listed] == ["submitted"]
    assert client.get(f"{B}/projects/p9/canvases/nope").status_code == 404
    assert client.get(f"{B}/projects/ghost/canvases").status_code == 404
    client.patch(f"{B}/projects/p9/canvases/{cid}", json={"status": "archived"})
    locked = client.put(f"{B}/projects/p9/canvases/{cid}", json={
        "expected_revision": saved.json()["revision"], "objects": [], "connectors": []})
    assert locked.status_code == 409 and "archived" in locked.json()["error"]["message"]
    assert client.get(f"{B}/projects/p9/canvases").json()["canvases"] == []
    assert len(client.get(f"{B}/projects/p9/canvases?include_archived=true").json()["canvases"]) == 1


def test_models_route_reports_hermes_catalogue_or_unavailable(tmp_path, monkeypatch):
    import hermes_project_stewardship.persistence.hermes_curation_provider as hcp
    client = _client(tmp_path)
    monkeypatch.setattr(hcp, "list_hermes_models", lambda: {"available": False, "default": None, "providers": []})
    assert client.get(f"{B}/canvas/models").json()["available"] is False
    monkeypatch.setattr(hcp, "list_hermes_models", lambda: {
        "available": True, "default": {"provider": "openai-codex", "model": "gpt-5.6-sol"},
        "providers": [{"slug": "openai-codex", "name": "Codex", "models": ["gpt-5.6-sol"], "is_current": True}]})
    body = client.get(f"{B}/canvas/models").json()
    assert body["default"]["model"] == "gpt-5.6-sol"
    cid = client.post(f"{B}/projects/p9/canvases", json={"name": "M"}).json()["canvas_id"]
    rejected = client.patch(f"{B}/projects/p9/canvases/{cid}", json={"model": {"provider": "ghost", "model": "x"}})
    assert rejected.status_code == 422


# ------------------------------------------------ Hermes model catalogue --
def _fake_hermes(monkeypatch, *, rows, model_config, boom=None):
    import sys
    import types
    constants = types.ModuleType("hermes_constants")
    constants.get_process_hermes_home = lambda: "/nonexistent-hermes-home"
    constants.set_hermes_home_override = lambda home: "token"
    constants.reset_hermes_home_override = lambda token: None
    config = types.ModuleType("hermes_cli.config")
    config.load_config = lambda: {"model": model_config}
    inventory = types.ModuleType("hermes_cli.inventory")

    def build_aux_picker_rows(**kwargs):
        if boom:
            raise boom
        return rows
    inventory.build_aux_picker_rows = build_aux_picker_rows
    package = types.ModuleType("hermes_cli")
    for name, module in {"hermes_constants": constants, "hermes_cli": package,
                         "hermes_cli.config": config, "hermes_cli.inventory": inventory}.items():
        monkeypatch.setitem(sys.modules, name, module)


def test_hermes_model_list_is_cleaned_and_names_the_default(monkeypatch):
    from hermes_project_stewardship.persistence.hermes_curation_provider import list_hermes_models
    _fake_hermes(monkeypatch, model_config={"provider": "openai-codex", "default": "gpt-5.6-sol"}, rows=[
        {"slug": "openai-codex", "name": "Codex", "models": ["gpt-5.6-sol", " ", ""], "is_current": True},
        {"slug": "", "name": "no slug is dropped"},
        {"slug": "zai", "models": None},
    ])
    result = list_hermes_models()
    assert result["available"] is True
    assert result["default"] == {"provider": "openai-codex", "model": "gpt-5.6-sol"}
    assert result["providers"] == [
        {"slug": "openai-codex", "name": "Codex", "models": ["gpt-5.6-sol"], "is_current": True},
        {"slug": "zai", "name": "zai", "models": [], "is_current": False},
    ]


def test_hermes_model_list_handles_string_config_and_no_model(monkeypatch):
    from hermes_project_stewardship.persistence.hermes_curation_provider import list_hermes_models
    _fake_hermes(monkeypatch, model_config="local-qwen", rows=[])
    assert list_hermes_models()["default"] == {"provider": "", "model": "local-qwen"}
    _fake_hermes(monkeypatch, model_config={}, rows=[])
    assert list_hermes_models() == {"available": True, "default": None, "providers": []}


def test_hermes_model_list_never_raises(monkeypatch):
    from hermes_project_stewardship.persistence.hermes_curation_provider import list_hermes_models
    _fake_hermes(monkeypatch, model_config={}, rows=[], boom=RuntimeError("picker exploded"))
    assert list_hermes_models() == {"available": False, "default": None, "providers": []}


def test_provider_without_models_accepts_any_model_name(store, enabled):
    """Some Hermes providers (custom endpoints) list no models; the picker
    then lets a model be typed, so the catalogue check only pins the provider."""
    service = CanvasService(store)
    board = service.create_board(enabled, name="Custom", actor="sahil")
    catalogue = {"available": True, "providers": [{"slug": "local", "models": []}]}
    ok = service.update_board(enabled, board["canvas_id"], model={"provider": "local", "model": "anything"},
                              actor="sahil", catalogue=catalogue)
    assert ok["model"] == {"provider": "local", "model": "anything"}
    offline = {"available": False, "providers": []}
    ok = service.update_board(enabled, board["canvas_id"], model={"provider": "x", "model": "y"},
                              actor="sahil", catalogue=offline)
    assert ok["model"]["provider"] == "x", "no Hermes catalogue -> nothing to check against"


def test_renaming_or_restoring_into_a_taken_name_is_refused(store, enabled):
    service = CanvasService(store)
    a = service.create_board(enabled, name="Alpha", actor="sahil")
    service.update_board(enabled, a["canvas_id"], status="archived", actor="sahil")
    b = service.create_board(enabled, name="Alpha", actor="sahil")  # archived names are free
    with pytest.raises(ValueError, match="already exists"):
        service.update_board(enabled, a["canvas_id"], status="draft", actor="sahil")
    assert service.get_board(enabled, a["canvas_id"])["status"] == "archived", "refused restore changes nothing"
    service.update_board(enabled, a["canvas_id"], status="draft", name="Alpha (old)", actor="sahil")
    with pytest.raises(ValueError, match="already exists"):
        service.update_board(enabled, b["canvas_id"], name="alpha (OLD)", actor="sahil")


def test_system_status_advance_never_overrides_a_human_choice(store, enabled):
    service = CanvasService(store)
    board = service.create_board(enabled, name="Done", actor="sahil")
    service.update_board(enabled, board["canvas_id"], status="submitted", actor="sahil")
    service.update_board(enabled, board["canvas_id"], status="planned", actor="sahil")
    service.update_board(enabled, board["canvas_id"], status="completed", actor="sahil")
    service.advance(board["canvas_id"], "planned", only_from=("draft", "submitted"))
    assert service.get_board(enabled, board["canvas_id"])["status"] == "completed"


# --------------------------------------------------------------- migration --
def _v32_db(path):
    """Build a real v32 database holding one legacy single-board project."""
    from hermes_project_stewardship.persistence import migrations as m
    from hermes_project_stewardship.persistence.store import Store
    original = list(m.MIGRATIONS)
    m.MIGRATIONS[:] = [x for x in original if x.version <= 32]
    try:
        store = Store(path)
        from hermes_project_stewardship.persistence.service import StewardshipService
        StewardshipService(store).enable("legacy", mission="m", lead_profile="l",
                                         member_profiles=[], autonomy_level=2)
        now = "2026-09-01T00:00:00+00:00"
        with store.tx() as cx:
            cx.execute("INSERT INTO project_canvases VALUES('canvas-old','legacy',4,?, '[]', ?, ?, 'sahil')",
                       ('[{"id":"e1","kind":"evidence","content":{"text":"x"}}]', now, now))
            cx.execute("INSERT INTO canvas_sessions VALUES('s1','legacy',4,'complete',NULL,'[]',?,?)", (now, now))
            cx.execute("INSERT INTO canvas_proposals VALUES('pr1','legacy','s1',4,'{\"kind\":\"technical_plan\"}','approved',?,?, 'sahil')", (now, now))
            cx.execute("INSERT INTO canvas_plans VALUES('pl1','legacy','pr1',4,'{}','draft',NULL,?,?)", (now, now))
        assert store.schema_version == 32
        store.close()
    finally:
        m.MIGRATIONS[:] = original


def _rows(path, sql):
    cx = sqlite3.connect(path)
    try:
        return cx.execute(sql).fetchall()
    finally:
        cx.close()


def test_v33_upgrade_keeps_the_legacy_board_and_links_its_history(tmp_path):
    from hermes_project_stewardship.persistence.store import Store
    db = tmp_path / "legacy.db"
    _v32_db(db)
    store = Store(db)
    try:
        assert store.schema_version == 33
        board = CanvasService(store).get_board("legacy", "canvas-old")
        assert board["name"] == "Main board" and board["revision"] == 4
        assert board["status"] == "planned", "a legacy board with a plan is shown as Plan made"
        assert board["objects"][0]["id"] == "e1"
    finally:
        store.close()
    assert _rows(db, "SELECT canvas_id FROM canvas_sessions") == [("canvas-old",)]
    assert _rows(db, "SELECT canvas_id FROM canvas_proposals") == [("canvas-old",)]
    assert _rows(db, "SELECT canvas_id FROM canvas_plans") == [("canvas-old",)]
    assert _rows(db, "PRAGMA foreign_key_check") == []


def test_v33_round_trip_is_lossless_and_downgrade_refuses_multi_board_loss(tmp_path):
    from hermes_project_stewardship.persistence.migrations import MIGRATIONS
    from hermes_project_stewardship.persistence.store import Store
    v33 = next(m for m in MIGRATIONS if m.version == 33)
    db = tmp_path / "rt.db"
    _v32_db(db)
    legacy = lambda: (
        _rows(db, "SELECT canvas_id, project_id, revision, objects_json, connectors_json, created_at, updated_at, updated_by FROM project_canvases ORDER BY 1"),
        _rows(db, "SELECT session_id, project_id, canvas_revision, status, answers_json FROM canvas_sessions ORDER BY 1"),
        _rows(db, "SELECT proposal_id, session_id, status FROM canvas_proposals ORDER BY 1"),
        _rows(db, "SELECT plan_id, proposal_id, status FROM canvas_plans ORDER BY 1"),
    )
    before = legacy()

    def downgrade(store):
        store._conn.executescript(v33.downgrade_sql)
        store._conn.execute("DELETE FROM schema_migrations WHERE version = 33")
        store._conn.commit()

    for _cycle in range(2):
        store = Store(db)
        try:
            assert store.schema_version == 33
            downgrade(store)
            assert store.schema_version == 32
        finally:
            store.close()
        assert legacy() == before
        assert _rows(db, "PRAGMA foreign_key_check") == []

    store = Store(db)
    try:
        CanvasService(store).create_board("legacy", name="Second", actor="sahil")
        with pytest.raises(sqlite3.IntegrityError):
            downgrade(store)
        assert store.schema_version == 33
        assert len(CanvasService(store).list_boards("legacy")) == 2, "a refused downgrade loses nothing"
    finally:
        store.close()
