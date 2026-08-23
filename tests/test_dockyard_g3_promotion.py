"""G3 P1 tests: initiative promotion as first-class WorkItem (PM-07)."""
from __future__ import annotations

import pytest

from hermes_project_stewardship.dockyard import (
    Actor,
    ActorKind,
    WorkItemType,
)
from hermes_project_stewardship.persistence.dockyard_service import (
    DockyardService,
)
from hermes_project_stewardship.persistence.service import (
    StewardshipService,
)


@pytest.fixture()
def human() -> Actor:
    return Actor(id="sahil", display_name="Sahil", kind=ActorKind.HUMAN)


@pytest.fixture()
def both(store, enabled) -> tuple:
    return DockyardService(store), StewardshipService(store)


def test_promote_approved_initiative_creates_twin(both, enabled, human):
    dy, svc = both
    ini = svc.propose_initiative(
        enabled, title="Split CI matrix by OS",
        rationale="objective breach: flaky pipeline blocks releases [audit:991]",
        expected_outcome="green matrix across runners",
        validation_contract={"steps": ["verify split"], "tests": "ci"})
    svc.approve_initiative(ini["ref"], actor="sahil", interface="rpc")

    item = dy.promote_initiative(
        svc.initiative_by_ref(ini["ref"]), actor=human)

    assert item.type is WorkItemType.INITIATIVE
    assert f"engine:{ini['ref']}" in item.labels
    # PM-07: rationale (evidence-bearing) preserved verbatim in the twin
    assert item.title == "Split CI matrix by OS"
    assert any(e.startswith("contract:") for e in item.evidence_refs)
    contract_e = next(e for e in item.evidence_refs
                      if e.startswith("contract:"))
    assert "verify split" in contract_e


def test_promotion_is_idempotent(both, enabled, human):
    dy, svc = both
    ini = svc.propose_initiative(
        enabled, title="Second chance", rationale="objective breach: repeat flake")
    svc.approve_initiative(ini["ref"], actor="sahil", interface="rpc")
    payload = svc.initiative_by_ref(ini["ref"])

    first = dy.promote_initiative(payload, actor=human)
    again = dy.promote_initiative(payload, actor=human)
    assert first.ref == again.ref
    assert len(dy.list(enabled)) == 1


def test_pending_initiative_cannot_be_promoted(both, enabled, human):
    dy, svc = both
    ini = svc.propose_initiative(
        enabled, title="Not yet approved",
        rationale="weak signal: early telemetry")
    with pytest.raises(ValueError):
        dy.promote_initiative(svc.initiative_by_ref(ini["ref"]),
                              actor=human)


def test_find_promoted_roundtrip(both, enabled, human):
    dy, svc = both
    ini = svc.propose_initiative(
        enabled, title="Findable", rationale="maintenance: lookup test")
    svc.approve_initiative(ini["ref"], actor="sahil", interface="rpc")
    item = dy.promote_initiative(svc.initiative_by_ref(ini["ref"]),
                                 actor=human)
    found = dy.find_promoted(enabled, ini["ref"])
    assert found is not None and found.ref == item.ref
    assert dy.find_promoted(enabled, "NOPE-1") is None


def test_promotion_writes_audit(both, enabled, human, store):
    dy, svc = both
    ini = svc.propose_initiative(
        enabled, title="Audited promo", rationale="compliance: trail check")
    svc.approve_initiative(ini["ref"], actor="sahil", interface="rpc")
    dy.promote_initiative(svc.initiative_by_ref(ini["ref"]), actor=human)
    rows = store._conn.execute(
        "SELECT * FROM stewardship_audit_log WHERE"
        " action='initiative.promoted'").fetchall()
    assert len(rows) == 1
    assert rows[0]["actor"] == "sahil"
