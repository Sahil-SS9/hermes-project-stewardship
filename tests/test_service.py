"""Service layer: lifecycle, anti-busywork controls, approvals, permissions."""

from __future__ import annotations

import pytest

from hermes_project_stewardship.persistence.service import ServiceError


def test_enable_and_settings(svc, enabled):
    s = svc.settings("demo")
    assert s["enabled"] and s["phase"] == "active"
    assert s["owner"]["lead_profile"] == "lead"
    assert s["owner"]["member_profiles"] == ["coder", "qa"]
    assert s["owner"]["owner_team_id"] is None  # forward-compatible schema only


def test_update_settings_merges_policies_and_records_audit(svc, enabled):
    svc.update_settings(
        enabled,
        mission="Keep releases reversible",
        lead_profile="octacon",
        member_profiles=["quan", "wesker"],
        autonomy_level=2,
        verification_policy={"require_tests": True, "max_open_initiatives": 3},
        release_policy={"require_rollback": True, "soak_hours": 24},
        notification_policy={"severity_threshold": "medium", "digest": "daily"},
        actor="sahil",
        interface="dockyard:human",
    )
    svc.update_settings(
        enabled,
        verification_policy={"max_open_initiatives": 4},
        actor="sahil",
        interface="dockyard:human",
    )

    settings = svc.settings(enabled)
    assert settings["mission"] == "Keep releases reversible"
    assert settings["owner"]["lead_profile"] == "octacon"
    assert settings["owner"]["member_profiles"] == ["quan", "wesker"]
    assert settings["autonomy_level"] == 2
    assert settings["policies"]["verification"] == {
        "require_tests": True,
        "max_open_initiatives": 4,
    }
    assert settings["policies"]["release"]["soak_hours"] == 24
    assert settings["policies"]["notification"]["digest"] == "daily"
    assert any(
        row["action"] == "project.settings_updated" and row["actor"] == "sahil"
        for row in svc.store.audit_tail(5)
    )


def test_update_settings_rejects_invalid_autonomy(svc, enabled):
    with pytest.raises(ServiceError, match="autonomy_level"):
        svc.update_settings(enabled, autonomy_level=6)


def test_unknown_project_raises(svc):
    with pytest.raises(ServiceError):
        svc.settings("ghost")


def test_disable_then_refuse(svc, enabled):
    svc.disable(enabled)
    with pytest.raises(ServiceError):
        svc.propose_initiative(enabled, title="x", rationale="y")


def test_pause_resume_freeze(svc, enabled):
    assert svc.pause(enabled)["phase"] == "paused"
    assert not svc.is_active(enabled)
    assert svc.resume(enabled)["phase"] == "active"
    assert svc.freeze(enabled)["phase"] == "frozen"
    # frozen still readable
    assert svc.settings(enabled)["phase"] == "frozen"


def test_initiative_requires_rationale(svc, enabled):
    with pytest.raises(ServiceError):
        svc.propose_initiative(enabled, title="t", rationale="   ")


def test_dedupe_open_initiative(svc, enabled):
    a = svc.propose_initiative(enabled, title="Fix X", rationale="evidence E",
                               dedupe_key="fix-x")
    with pytest.raises(ServiceError, match="duplicate"):
        svc.propose_initiative(enabled, title="Fix X again", rationale="more",
                               dedupe_key="fix-x")


def test_completed_initiative_allows_new_dedupe_match(svc, enabled):
    a = svc.propose_initiative(enabled, title="Fix X", rationale="E", dedupe_key="fix-x")
    svc.approve_initiative(a["ref"], actor="h", interface="cli")
    ini = svc.start_execution(a["ref"])
    svc.complete_initiative(a["ref"], outcome={"ok": True})
    b = svc.propose_initiative(enabled, title="Fix X", rationale="E2", dedupe_key="fix-x")
    assert b["ref"] != a["ref"]


def test_rejection_suppression_window(svc, enabled, clock):
    a = svc.propose_initiative(enabled, title="Refactor all", rationale="feels good",
                               dedupe_key="big-refactor")
    svc.reject_initiative(a["ref"], actor="human", interface="cli", suppress_days=14)
    with pytest.raises(ServiceError, match="suppressed"):
        svc.propose_initiative(enabled, title="Refactor all", rationale="again?",
                               dedupe_key="big-refactor")
    clock.advance(days=15)
    b = svc.propose_initiative(enabled, title="Refactor all", rationale="post-window",
                               dedupe_key="big-refactor")
    assert b["ref"]


def test_reject_legacy_initiative_without_dedupe_key(svc, enabled):
    """Legacy/demo rows with NULL dedupe keys still reject and stay suppressed."""
    title = "Legacy demo initiative"
    a = svc.propose_initiative(enabled, title=title, rationale="seeded before dedupe")
    svc.store._conn.execute(
        "UPDATE project_initiatives SET dedupe_key=NULL WHERE ref=?", (a["ref"],)
    )

    out = svc.reject_initiative(
        a["ref"], actor="sahil", interface="dockyard:human", suppress_days=14
    )

    assert out["status"] == "rejected"
    fallback_key = title.lower()
    suppressed = svc.store._conn.execute(
        "SELECT reason FROM initiative_suppression"
        " WHERE project_id=? AND dedupe_key=?",
        (enabled, fallback_key),
    ).fetchone()
    assert suppressed is not None and suppressed["reason"] == "rejected"
    with pytest.raises(ServiceError, match="suppressed"):
        svc.propose_initiative(enabled, title=title, rationale="same legacy work")


def test_concurrency_cap(svc, enabled):
    svc.store._conn.execute(
        "UPDATE project_stewardship SET verification_policy_json=? WHERE project_id=?",
        ('{"max_open_initiatives": 2}', enabled),
    )
    svc.propose_initiative(enabled, title="A1", rationale="r1")
    svc.propose_initiative(enabled, title="A2", rationale="r2")
    with pytest.raises(ServiceError, match="cap"):
        svc.propose_initiative(enabled, title="A3", rationale="r3")


def test_approval_flow_and_idempotence_guard(svc, enabled):
    a = svc.propose_initiative(enabled, title="T", rationale="R")
    assert a["approval_state"] == "pending"
    out = svc.approve_initiative(a["ref"], actor="human", interface="cli")
    assert out["status"] == "approved"
    with pytest.raises(ServiceError):
        svc.approve_initiative(a["ref"], actor="human", interface="cli")


def test_reject_records_actor(svc, enabled):
    a = svc.propose_initiative(enabled, title="T2", rationale="R2")
    out = svc.reject_initiative(a["ref"], actor="sahil", interface="discord")
    assert out["status"] == "rejected"
    tail = svc.store.audit_tail(5)
    assert any(r["action"] == "initiative.rejected" and r["actor"] == "sahil"
               for r in tail)


def test_execution_requires_approval(svc, enabled):
    a = svc.propose_initiative(enabled, title="T3", rationale="R3")
    with pytest.raises(ServiceError):
        svc.start_execution(a["ref"])
    svc.approve_initiative(a["ref"], actor="h", interface="cli")
    assert svc.start_execution(a["ref"])["status"] == "executing"


def test_regression_completion(svc, enabled):
    a = svc.propose_initiative(enabled, title="T4", rationale="R4")
    svc.approve_initiative(a["ref"], actor="h", interface="cli")
    out = svc.complete_initiative(a["ref"], outcome={"ci": "worse"}, regressed=True)
    assert out["status"] == "regressed"


def test_gateway_permission_binding(svc, enabled):
    svc.set_gateway_permission(enabled, platform="discord", sender_id="U1",
                               can_approve=True)
    assert svc.gateway_permission(enabled, platform="discord", sender_id="U1") == {
        "can_approve": True, "can_trigger": False,
    }
    assert svc.gateway_permission(enabled, platform="discord", sender_id="U2") == {
        "can_approve": False, "can_trigger": False,
    }


def test_audit_trail_records_material_actions(svc, enabled):
    a = svc.propose_initiative(enabled, title="T5", rationale="R5")
    svc.approve_initiative(a["ref"], actor="h", interface="cli")
    actions = [r["action"] for r in svc.store.audit_tail(20)]
    assert "stewardship.enabled" in actions
    assert "initiative.approved" in actions


def test_knowledge_roundtrip(svc, enabled):
    kid = svc.add_knowledge(enabled, type="decision", statement="use uv",
                            source="cycle:1", confidence=0.9)
    rows = svc.knowledge(enabled)
    assert rows[0]["id"] == kid and rows[0]["statement"] == "use uv"


def test_retention_prune(store, svc, enabled, clock):
    svc.record_health_snapshot("demo", status="healthy", score=1.0,
                               evidence=[], contradictions=[])
    clock.advance(days=400)
    removed = store.prune()
    assert removed.get("project_health_snapshots", 0) >= 1 or removed
