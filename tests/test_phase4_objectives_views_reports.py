"""HPS Phase 4 — objectives evaluate-now, report bytes, saved-view lifecycle.

Covers the Phase 4 acceptance surface:
- objective create/edit/archive/remove retained + evidence history semantics
- D6 "Evaluate now": ONLY the selected objective; command/attempt recording;
  manual objectives never auto-pass; stale/missing evidence; denied authority;
  evaluator failure (blocked command / missing project path); repeat runs
- report download bytes equal the API content (UTF-8 safe), unknown report 404
- saved views: save, recall (filters applied server-side), overwrite, delete,
  owner-only delete, cross-project isolation, invalid filters refused,
  reopen persistence

All runs use disposable stores under tmp_path; no live services.
"""
from __future__ import annotations


import pytest

fastapi = pytest.importorskip("fastapi")
from fastapi.testclient import TestClient  # noqa: E402

from hermes_project_stewardship.api.server import create_app  # noqa: E402
from hermes_project_stewardship.dockyard import (  # noqa: E402
    Actor,
    ActorKind,
)
from hermes_project_stewardship.kanban import ReferenceKanbanAdapter  # noqa: E402
from hermes_project_stewardship.persistence.dockyard_service import (  # noqa: E402
    DockyardService,
)
from hermes_project_stewardship.persistence.service import (  # noqa: E402
    ServiceError,
    StewardshipService,
)
from hermes_project_stewardship.persistence.store import Store  # noqa: E402

from tests.conftest import enable_project  # noqa: E402
from tests.lane_b_phase7_fixtures import make_service_client  # noqa: E402

HUMAN = Actor(id="sahil", display_name="Sahil", kind=ActorKind.HUMAN)
_EXPIRED = "2026-08-20T00:00:00+00:00"  # frozen clock is 2026-08-21 12:00 UTC
_NOT_EXPIRED = "2026-09-01T00:00:00+00:00"


def _repo(tmp_path, name="repo"):
    path = tmp_path / name
    path.mkdir(parents=True, exist_ok=True)
    (path / "README.md").write_text("phase-4 fixture\n")
    return path


def _command_objective(svc, pid, *, name="ci-green", command=("echo", "1"),
                       target=">=1", repo=None):
    if repo is not None:
        svc.update_settings(pid, verification_policy={"repo_path": str(repo)})
    return svc.add_objective(
        pid, name=name, evaluator_type="command", target=target,
        severity="high", command=list(command),
    )


def _manual_objective(svc, pid, *, name="manual-check"):
    return svc.add_objective(
        pid, name=name, evaluator_type="manual", target=">=1", severity="high",
    )


def _evaluations(store, pid, objective_id):
    return store._conn.execute(
        "SELECT * FROM project_objective_evaluations"
        " WHERE project_id=? AND objective_id=? ORDER BY id",
        (pid, objective_id),
    ).fetchall()


# ------------------------------------------------------------------ #
# Evaluate now — command semantics                                    #
# ------------------------------------------------------------------ #

def test_evaluate_now_command_runs_records_and_updates_evidence(svc, enabled, tmp_path):
    obj = _command_objective(svc, enabled, repo=_repo(tmp_path))
    first = svc.evaluate_objective_now(enabled, obj["id"], actor="sahil")
    assert first["recorded"] is True
    assert first["result"]["state"] == "passed"
    assert first["result"]["measured"] == 1.0
    assert first["result"]["target_met"] is True
    evidence = first["evidence"]
    assert evidence["state"] == "passed"
    assert evidence["sample_count"] == 1
    assert evidence["pass_rate"] == 1.0
    assert evidence["history"][0]["source"] == "evaluate-now"
    assert _evaluations(svc.store, enabled, obj["id"]) and len(
        _evaluations(svc.store, enabled, obj["id"])) == 1

    second = svc.evaluate_objective_now(enabled, obj["id"], actor="sahil")
    assert second["evidence"]["sample_count"] == 2
    assert len(_evaluations(svc.store, enabled, obj["id"])) == 2


def test_evaluate_now_touches_only_the_selected_objective(svc, enabled, tmp_path):
    repo = _repo(tmp_path)
    first = _command_objective(svc, enabled, name="obj-a", repo=repo)
    other = _command_objective(svc, enabled, name="obj-b", repo=repo)
    svc.evaluate_objective_now(enabled, first["id"], actor="sahil")

    untouched = svc.objective_evidence(enabled, other["id"])
    assert untouched["sample_count"] == 0
    assert untouched["state"] == "unknown"
    assert _evaluations(svc.store, enabled, other["id"]) == []
    # And no full-cycle health snapshot was written by the single evaluation.
    rows = svc.store._conn.execute(
        "SELECT COUNT(*) AS n FROM project_health_snapshots WHERE project_id=?",
        (enabled,),
    ).fetchone()
    assert rows["n"] == 0


def test_evaluate_now_failing_command_is_failed_not_unknown(svc, enabled, tmp_path):
    obj = _command_objective(svc, enabled, command=("echo", "0"), repo=_repo(tmp_path))
    res = svc.evaluate_objective_now(enabled, obj["id"], actor="sahil")
    assert res["recorded"] is True
    assert res["result"]["state"] == "failed"
    assert res["result"]["measured"] == 0.0
    assert res["result"]["passed"] is False
    assert res["evidence"]["state"] == "failed"
    assert res["evidence"]["pass_rate"] == 0.0


def test_evaluate_now_blocked_command_is_unknown_and_visible(svc, enabled, tmp_path):
    obj = _command_objective(svc, enabled, command=("rm", "-rf", "/tmp/nope"),
                             repo=_repo(tmp_path))
    res = svc.evaluate_objective_now(enabled, obj["id"], actor="sahil")
    assert res["recorded"] is True
    assert res["result"]["state"] == "unknown"
    assert res["result"]["measured"] is None
    assert res["result"]["detail"].startswith("blocked:")
    # A blocked attempt must never count towards the pass rate.
    assert res["evidence"]["pass_rate"] is None
    assert res["evidence"]["sample_count"] == 0
    assert res["evidence"]["history"][0]["state"] == "unknown"


def test_evaluate_now_missing_project_path_fails_closed(svc, enabled):
    obj = svc.add_objective(enabled, name="no-repo", evaluator_type="command",
                            target=">=1", severity="medium",
                            command=["echo", "1"])
    res = svc.evaluate_objective_now(enabled, obj["id"], actor="sahil")
    assert res["result"]["state"] == "unknown"
    assert "project path missing" in res["result"]["detail"]
    assert res["result"]["passed"] is False


def test_evaluate_now_archived_objective_skips_execution(svc, enabled, tmp_path):
    obj = _command_objective(svc, enabled, repo=_repo(tmp_path))
    svc.archive_objective(enabled, obj["id"], actor="sahil")
    res = svc.evaluate_objective_now(enabled, obj["id"], actor="sahil")
    assert res["recorded"] is False
    assert res["result"]["state"] == "not_applicable"
    assert "archived" in res["result"]["detail"]
    assert _evaluations(svc.store, enabled, obj["id"]) == []


def test_evaluate_now_unknown_objective_is_refused(svc, enabled):
    with pytest.raises(ServiceError, match="unknown objective"):
        svc.evaluate_objective_now(enabled, 9999, actor="sahil")


# ------------------------------------------------------------------ #
# Evaluate now — manual semantics (never auto-pass)                   #
# ------------------------------------------------------------------ #

def test_evaluate_now_manual_uses_latest_assessment_without_recording(svc, enabled):
    obj = _manual_objective(svc, enabled)
    svc.record_assessment(
        enabled, obj["id"], passed=True, evidence=["ticket:OPS-1"],
        actor="payload", interface="dockyard:human", trusted_principal="sahil",
        expires_at=_NOT_EXPIRED,
    )
    res = svc.evaluate_objective_now(enabled, obj["id"], actor="sahil")
    assert res["result"]["state"] == "passed"
    assert res["result"]["passed"] is True
    assert res["recorded"] is False  # assessments own the manual history
    assert _evaluations(svc.store, enabled, obj["id"]) == []
    assert res["evidence"]["sample_count"] == 1


def test_evaluate_now_manual_without_evidence_never_auto_passes(svc, enabled):
    obj = _manual_objective(svc, enabled)
    res = svc.evaluate_objective_now(enabled, obj["id"], actor="sahil")
    assert res["result"]["passed"] is False
    assert res["result"]["state"] == "unknown"
    assert "no manual status recorded" in res["result"]["detail"]
    assert res["evidence"]["sample_count"] == 0


def test_evaluate_now_manual_expired_assessment_is_stale(svc, enabled):
    obj = _manual_objective(svc, enabled)
    svc.record_assessment(
        enabled, obj["id"], passed=True, evidence=["ticket:OLD"],
        actor="payload", interface="dockyard:human", trusted_principal="sahil",
        expires_at=_EXPIRED,
    )
    res = svc.evaluate_objective_now(enabled, obj["id"], actor="sahil")
    assert res["result"]["passed"] is False
    assert res["result"]["detail"].startswith("stale:")


# ------------------------------------------------------------------ #
# Evaluate now — API authority + readback                             #
# ------------------------------------------------------------------ #

def test_evaluate_endpoint_denies_missing_and_agent_principals(tmp_path):
    store = Store(tmp_path / "ev.db")
    pid = enable_project(StewardshipService(store), "demo")
    StewardshipService(store).add_objective(
        pid, name="ci", evaluator_type="manual", target=">=1", severity="high")

    open_app = create_app(store, kanban_adapter=ReferenceKanbanAdapter(store))
    open_client = TestClient(open_app)
    r = open_client.post(f"/stewardship/v1/projects/{pid}/objectives/1/evaluate")
    assert r.status_code == 503, r.text

    agent_app = create_app(
        store, kanban_adapter=ReferenceKanbanAdapter(store),
        auth_token="agent-secret", auth_principal="agent-bot",
        auth_principal_is_human=False,
    )
    agent_client = TestClient(agent_app)
    r = agent_client.post(
        f"/stewardship/v1/projects/{pid}/objectives/1/evaluate",
        headers={"Authorization": "Bearer agent-secret"},
    )
    assert r.status_code == 403, r.text
    store.close()


def test_evaluate_endpoint_human_readback_through_api(tmp_path):
    store, service, adapter, app, client, headers = make_service_client(tmp_path)
    pid = "phase4-eval"
    service.enable(pid, mission="m", lead_profile="lead")
    repo = _repo(tmp_path, "api-repo")
    service.update_settings(pid, verification_policy={"repo_path": str(repo)})
    created = service.add_objective(
        pid, name="ci-green", evaluator_type="command", target=">=1",
        severity="high", command=["echo", "1"])
    r = client.post(
        f"/stewardship/v1/projects/{pid}/objectives/{created['id']}/evaluate",
        headers=headers)
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["result"]["state"] == "passed"
    assert body["recorded"] is True
    # Readback through the hub GET: evidence reflects the recorded evaluation.
    listing = client.get(f"/stewardship/v1/projects/{pid}/objectives", headers=headers)
    row = next(o for o in listing.json()["objectives"] if o["id"] == created["id"])
    assert row["evidence"]["state"] == "passed"
    assert row["evidence"]["sample_count"] == 1
    store.close()


# ------------------------------------------------------------------ #
# Objectives retained behaviours (create/edit/archive/evidence)       #
# ------------------------------------------------------------------ #

def test_objective_edit_and_archive_preserve_history(svc, enabled, tmp_path):
    obj = _command_objective(svc, enabled, repo=_repo(tmp_path))
    svc.evaluate_objective_now(enabled, obj["id"], actor="sahil")

    updated = svc.update_objective(enabled, obj["id"], name="ci-green-v2",
                                   target=">=2", actor="sahil")
    assert updated["name"] == "ci-green-v2"
    # Evidence history survives the edit (same objective id, same samples).
    evidence = svc.objective_evidence(enabled, obj["id"])
    assert evidence["sample_count"] == 1

    archived = svc.archive_objective(enabled, obj["id"], actor="sahil")
    assert archived["enabled"] is False
    evidence = svc.objective_evidence(enabled, obj["id"])
    assert evidence["state"] == "not_applicable"
    assert evidence["sample_count"] == 1  # history preserved, not deleted
    assert "evidence preserved" in evidence["detail"]

    removed = svc.remove_objective(enabled, obj["id"], actor="sahil")
    assert removed["removed"] is True
    with pytest.raises(ServiceError, match="not found"):
        svc.objective_evidence(enabled, obj["id"])


# ------------------------------------------------------------------ #
# Reports — download bytes equal API content                          #
# ------------------------------------------------------------------ #

def test_report_content_is_unicode_exact_and_reloadable(tmp_path):
    store, service, adapter, app, client, headers = make_service_client(tmp_path)
    pid = "phase4-reports"
    service.enable(pid, mission="Rénover le pipeline — 日本語 🚀", lead_profile="lead")

    created = client.post(
        f"/stewardship/v1/projects/{pid}/reports", headers=headers,
        json={"report_type": "executive", "include_activity": True,
              "actor_id": "sahil", "actor_kind": "human"})
    assert created.status_code == 200, created.text
    report = created.json()
    content = report["content"]
    assert "Rénover le pipeline — 日本語 🚀" in content

    # The Desktop download writes exactly the string the API returned; prove
    # the bytes are stable and identical across an independent re-fetch.
    fetched = client.get(
        f"/stewardship/v1/projects/{pid}/reports/{report['report_id']}",
        headers=headers)
    assert fetched.status_code == 200
    refetched = fetched.json()["content"]
    assert refetched == content
    assert refetched.encode("utf-8") == content.encode("utf-8")
    assert len(refetched.encode("utf-8")) == len(content.encode("utf-8"))

    # History lists the report for re-opening.
    listing = client.get(f"/stewardship/v1/projects/{pid}/reports", headers=headers)
    assert any(r["report_id"] == report["report_id"]
               for r in listing.json()["reports"])

    missing = client.get(
        f"/stewardship/v1/projects/{pid}/reports/does-not-exist", headers=headers)
    assert missing.status_code == 404
    store.close()


# ------------------------------------------------------------------ #
# Saved views — lifecycle, isolation, invalid filters, persistence    #
# ------------------------------------------------------------------ #

def _views_env(tmp_path):
    store = Store(tmp_path / "views.db")
    svc = DockyardService(store)
    r = TestClient(create_app(store, kanban_adapter=ReferenceKanbanAdapter(store)))
    r.post("/stewardship/v1/projects/dy1/enable", json={
        "project_id": "dy1", "mission": "m", "lead_profile": "l",
        "autonomy_level": 2})
    r.post("/stewardship/v1/projects/dy2/enable", json={
        "project_id": "dy2", "mission": "m2", "lead_profile": "l",
        "autonomy_level": 2})
    return store, svc, r


def test_saved_view_lifecycle_save_recall_overwrite_delete(tmp_path):
    store, svc, client = _views_env(tmp_path)
    try:
        # Items created through the API are canonical-visible; the view
        # runner reads the canonical projection.
        r = client.post("/stewardship/v1/projects/dy1/work-items", json={
            "title": "Done item", "type": "task", "actor_id": "sahil"})
        assert r.status_code == 200, r.text
        done_ref = r.json()["ref"]
        r = client.post(
            f"/stewardship/v1/projects/dy1/work-items/{done_ref}/transition",
            json={"status": "done", "actor_id": "sahil"})
        assert r.status_code == 200, r.text
        r = client.post("/stewardship/v1/projects/dy1/work-items", json={
            "title": "Open item", "type": "task", "actor_id": "sahil"})
        assert r.status_code == 200, r.text
        open_ref = r.json()["ref"]
        r = client.post(
            f"/stewardship/v1/projects/dy1/work-items/{open_ref}/transition",
            json={"status": "in_progress", "actor_id": "sahil"})
        assert r.status_code == 200, r.text

        # Save (create)
        r = client.put("/stewardship/v1/projects/dy1/views", json={
            "name": "Done list", "layout": "board",
            "filters": {"status": ["done"]}, "actor_id": "sahil",
            "actor_kind": "human", "shared": False})
        assert r.status_code == 200, r.text

        # Recall applies the stored filters (server-side query).
        r = client.get(
            "/stewardship/v1/projects/dy1/views/Done%20list/items?actor_id=sahil")
        assert r.status_code == 200, r.text
        refs = [item.get("ref") or item.get("item_ref") for item in r.json()["items"]]
        assert done_ref in refs
        assert open_ref not in refs

        # Overwrite changes the stored query; recall reflects it immediately.
        r = client.put("/stewardship/v1/projects/dy1/views", json={
            "name": "Done list", "layout": "table",
            "filters": {"status": ["in_progress"]}, "actor_id": "sahil",
            "actor_kind": "human", "shared": False})
        assert r.status_code == 200, r.text
        r = client.get(
            "/stewardship/v1/projects/dy1/views/Done%20list/items?actor_id=sahil")
        refs = [item.get("ref") or item.get("item_ref") for item in r.json()["items"]]
        assert open_ref in refs
        assert done_ref not in refs
        listing = client.get("/stewardship/v1/projects/dy1/views?actor_id=sahil")
        row = next(v for v in listing.json()["views"] if v["name"] == "Done list")
        assert row["layout"] == "table"

        # Delete; recall afterwards reports the view is gone (stale selection).
        r = client.delete(
            "/stewardship/v1/projects/dy1/views/Done%20list?actor_id=sahil")
        assert r.status_code == 200, r.text
        r = client.get(
            "/stewardship/v1/projects/dy1/views/Done%20list/items?actor_id=sahil")
        assert r.status_code == 404  # "no such view" → not-found envelope
        listing = client.get("/stewardship/v1/projects/dy1/views?actor_id=sahil")
        assert all(v["name"] != "Done list" for v in listing.json()["views"])
        # Deleting again is a truthful not-found, not a silent success.
        r = client.delete(
            "/stewardship/v1/projects/dy1/views/Done%20list?actor_id=sahil")
        assert r.status_code == 404
    finally:
        store.close()


def test_saved_view_invalid_filters_refused(tmp_path):
    store, svc, client = _views_env(tmp_path)
    try:
        r = client.put("/stewardship/v1/projects/dy1/views", json={
            "name": "BAD", "layout": "board",
            "filters": {"status": ["imaginary-status"]},
            "actor_id": "sahil", "actor_kind": "human", "shared": False})
        assert r.status_code == 409
        r = client.put("/stewardship/v1/projects/dy1/views", json={
            "name": "BAD2", "layout": "board",
            "filters": {"nonsense": True},
            "actor_id": "sahil", "actor_kind": "human", "shared": False})
        assert r.status_code == 409
        listing = client.get("/stewardship/v1/projects/dy1/views?actor_id=sahil")
        assert all(v["name"] not in {"BAD", "BAD2"}
                   for v in listing.json()["views"])
    finally:
        store.close()


def test_saved_view_owner_only_delete_and_cross_actor_visibility(tmp_path):
    store, svc, client = _views_env(tmp_path)
    try:
        r = client.put("/stewardship/v1/projects/dy1/views", json={
            "name": "Private triage", "layout": "board", "filters": {},
            "actor_id": "sahil", "actor_kind": "human", "shared": False})
        assert r.status_code == 200
        # A different human actor cannot see it, and gets a truthful 404 —
        # a private view's existence must not leak.
        r = client.get("/stewardship/v1/projects/dy1/views?actor_id=other-human")
        assert all(v["name"] != "Private triage" for v in r.json()["views"])
        r = client.delete(
            "/stewardship/v1/projects/dy1/views/Private%20triage?actor_id=other-human")
        assert r.status_code == 404
        # The owner still can.
        r = client.delete(
            "/stewardship/v1/projects/dy1/views/Private%20triage?actor_id=sahil")
        assert r.status_code == 200
    finally:
        store.close()


def test_saved_view_cross_project_isolation_and_reopen_persistence(tmp_path):
    store, svc, client = _views_env(tmp_path)
    try:
        r = client.put("/stewardship/v1/projects/dy1/views", json={
            "name": "Shared name", "layout": "board",
            "filters": {"status": ["done"]}, "actor_id": "sahil",
            "actor_kind": "human", "shared": False})
        assert r.status_code == 200
        r = client.put("/stewardship/v1/projects/dy2/views", json={
            "name": "Shared name", "layout": "table", "filters": {},
            "actor_id": "sahil", "actor_kind": "human", "shared": False})
        assert r.status_code == 200

        # Deleting in dy1 must not touch dy2's identically-named view.
        r = client.delete(
            "/stewardship/v1/projects/dy1/views/Shared%20name?actor_id=sahil")
        assert r.status_code == 200
        listing = client.get("/stewardship/v1/projects/dy2/views?actor_id=sahil")
        row = next(v for v in listing.json()["views"] if v["name"] == "Shared name")
        assert row["layout"] == "table"
    finally:
        store.close()

    # Reopen persistence: the remaining view is still there after reopen.
    reopened = Store(tmp_path / "views.db")
    svc2 = DockyardService(reopened)
    names = {v["name"] for v in svc2.views_list("dy2", actor=HUMAN)}
    assert "Shared name" in names
    reopened.close()


def test_saved_view_shared_semantics_preserved(tmp_path):
    store, svc, client = _views_env(tmp_path)
    try:
        r = client.put("/stewardship/v1/projects/dy1/views", json={
            "name": "Team board", "layout": "table", "filters": {},
            "actor_id": "sahil", "actor_kind": "human", "shared": True})
        assert r.status_code == 200
        r = client.get("/stewardship/v1/projects/dy1/views?actor_id=someone-else")
        assert any(v["name"] == "Team board" for v in r.json()["views"])
        # Shared views remain non-deletable by non-owners.
        r = client.delete(
            "/stewardship/v1/projects/dy1/views/Team%20board?actor_id=someone-else")
        assert r.status_code == 409
    finally:
        store.close()
