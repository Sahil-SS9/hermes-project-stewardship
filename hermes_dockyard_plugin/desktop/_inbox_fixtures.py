"""Batch D — seed helper for the disposable desktop backend.

Imported only by hermes_dockyard_plugin/desktop/disposable-backend.py. Seeds
pending approvals through the REAL StewardshipService so the browser suite and
screenshots exercise exact production data paths. Kept in its own module so the
backend file stays one contiguous block per owner (same pattern as
_roadmap_fixtures.py).
"""


def seed_inbox_fixtures(service) -> None:
    """Pending approvals for the inbox browser journey (R1-R6 + tabs + attention).

    Seeded through the REAL StewardshipService so the disposable backend serves
    exactly what production writes. Two pending decisions are created here with
    distinct titles/risks; the roadmap fixture's "Ship saved views" is already
    approved and therefore absent from the pending inbox. Refs are deterministic
    (INIT-PAYMENTS-NNNN); the browser tests read them from the DOM.
    """
    pid = "payments-relaunch"
    service.update_features(pid, {"initiatives": True}, actor="fixture", interface="fixture")
    service.propose_initiative(
        pid, title="Retire legacy webhook listener", risk="low",
        rationale="The listener duplicates the gateway path and doubles maintenance",
        expected_outcome="One canonical webhook path remains",
        validation_contract={"steps": ["diff the gateway routes"], "tests": "gateway suite"})
    service.propose_initiative(
        pid, title="Ship saved views safely", risk="high",
        rationale="Saved views reduce review toil but change shared review state",
        expected_outcome="Reviewers can return to a stable, named queue",
        validation_contract={"steps": ["exercise saved-view restore", "verify rollback"],
                             "tests": "desktop and stewardship suites"})