"""Phase 3: native observation-to-outcome loop — deterministic lanes.

Covers claim atomicity, native-event tracing, bounded reasoning failure
contract, host-identity completion reconciliation, crash recovery, and the
bounded reconciliation command. The REAL-host lane lives in
tests/test_native_stewardship_loop.py.

Design contract being proven (from the plan):
- Replayed and out-of-order events must not duplicate execution (P3.2).
- A submitted verified=true field alone must not prove successful delivery or
  mark unrelated work done (P3.4); host result identity + validation contract
  required.
- Run the existing post-delivery observation once per execution outcome;
  persist improved/regressed/unknown with evidence (P3.5).
- Handle worker crash and pending-observation recovery after restart (P3.5).
- One bounded reconciliation command for manual/native-cron use, default
  inactive; non-manual triggers cannot bypass a paused project (P3.6, P3.7).

These tests run against the REAL Store (production schema + migrations), the
REAL StewardshipService feature gates, and a fake host implementing exactly
the three-method observation read surface.
"""
from __future__ import annotations

import json

import pytest

from hermes_project_stewardship.domain.constants import HealthState
from hermes_project_stewardship.events import EventBus
from hermes_project_stewardship.observation.native_events import NativeEventObserver
from hermes_project_stewardship.observation.recovery import ReconcileService
from hermes_project_stewardship.persistence.dockyard_integration import (
    IntegrationError,
)
from hermes_project_stewardship.persistence.service import (
    FeatureDisabledError,
)
from hermes_project_stewardship.persistence.store import Store
from tests.conftest import make_repo


# --------------------------------------------------------------------------- #
# Fake observation host: the small read-only surface production consumes      #
# --------------------------------------------------------------------------- #


class FakeObservationHost:
    """Host-side read surface: get_task / get_task_events / get_task_runs."""

    def __init__(self) -> None:
        self.tasks: dict[str, dict] = {}
        self.events: dict[str, list[dict]] = {}
        self.runs: dict[str, list[dict]] = {}

    def get_task(self, task_id: str) -> dict:
        try:
            return {"task": dict(self.tasks[task_id])}
        except KeyError:
            raise LookupError(f"task {task_id} not found") from None

    def get_task_events(self, task_id: str) -> list[dict]:
        return list(self.events.get(task_id, []))

    def get_task_runs(self, task_id: str) -> list[dict]:
        return list(self.runs.get(task_id, []))


def seed_initiative(store: Store, ref="ini-1", project="demo", status="executing"):
    now = "2026-09-08T12:00:00+00:00"
    # FK target: project_initiatives references project_stewardship.
    with store.tx() as cx:
        cx.execute(
            "INSERT OR IGNORE INTO project_stewardship(project_id, enabled,"
            " mission, phase, created_at, updated_at) VALUES(?,?,?,?,?,?)",
            (project, 1, "test mission", "active", now, now),
        )
        cx.execute(
            "INSERT INTO project_initiatives(ref, project_id, title, rationale,"
            " status, board_slug, validation_contract_json, created_at)"
            " VALUES(?,?,?,?,?,?,?,?)",
            (ref, project, "Fix the flaky check", "the check flakes",
             status, "demo",
             json.dumps({"steps": ["implement", "verify"], "tests": "suite"}),
             now),
        )


def seed_observation(
    store: Store, ref="ini-1", project="demo", status="pending",
    outcome=None, regressed=0, cycle_id=None, updated_at=None,
):
    outcome = outcome or {"verified": True}
    now = updated_at or store._clock().isoformat()
    with store.tx() as cx:
        cx.execute(
            "INSERT INTO dockyard_observation_triggers(initiative_ref,"
            " project_id, trigger_key, status, outcome_json, regressed,"
            " cycle_id, created_at, updated_at) VALUES(?,?,?,?,?,?,?,?,?)",
            (
                ref, project, f"dockyard-observation:{ref}", status,
                json.dumps(outcome), regressed, cycle_id, now, now,
            ),
        )


def seed_binding(store: Store, project: str, item_id: str, ref: str):
    with store.tx() as cx:
        cx.execute(
            "INSERT INTO dockyard_canonical_work_bindings(project_id, item_kind,"
            " item_id, initiative_ref, created_by_id, created_by_kind, created_at)"
            " VALUES(?,?,?,?,?,?,?)",
            (project, "task", item_id, ref, "dockyard", "bot",
             "2026-09-08T12:00:00+00:00"),
        )


def make_service(store: Store, host, engine=None, service=None) -> ReconcileService:
    return ReconcileService(store, host, engine=engine, service=service,
                            clock=store._clock)


def wire_repo(svc, pid: str, repo) -> None:
    svc.store._conn.execute(
        "UPDATE project_stewardship SET verification_policy_json=? WHERE project_id=?",
        (f'{{"repo_path": "{repo.as_posix()}"}}', pid),
    )


# --------------------------------------------------------------------------- #
# P3.2 — event claims: atomic, replay-safe, single winner                     #
# --------------------------------------------------------------------------- #


def test_claim_primitive_is_atomic_and_idempotent(store):
    first = store.claim_event("evt:1", holder="worker-a")
    assert first is True
    # Replay with a different holder must NOT steal the claim.
    second = store.claim_event("evt:1", holder="worker-b")
    assert second is False
    row = store._conn.execute(
        "SELECT holder FROM event_claims WHERE claim_key='evt:1'"
    ).fetchone()
    assert row["holder"] == "worker-a"


def test_claim_release_is_owner_scoped(store):
    assert store.claim_event("evt:2", holder="worker-a") is True
    assert store.release_event_claim("evt:2", holder="worker-b") is False
    assert store.release_event_claim("evt:2", holder="worker-a") is True
    # Released key can be claimed again.
    assert store.claim_event("evt:2", holder="worker-c") is True


def test_concurrent_claims_have_single_winner(store):
    import threading

    winners: list[int] = []
    barrier = threading.Barrier(4)

    def claim(i: int) -> None:
        barrier.wait()
        if store.claim_event("evt:race", holder=f"worker-{i}"):
            winners.append(i)

    threads = [threading.Thread(target=claim, args=(i,)) for i in range(4)]
    for thread in threads:
        thread.start()
    for thread in threads:
        thread.join()
    assert len(winners) == 1


# --------------------------------------------------------------------------- #
# P3.1 — native events trace to the initiative (fake host, contract level)   #
# --------------------------------------------------------------------------- #


def test_native_event_traces_to_initiative_via_binding(store):
    host = FakeObservationHost()
    host.tasks["t1"] = {"id": "t1", "status": "done"}
    host.events["t1"] = [
        {"kind": "claimed", "payload": {"lock": "w", "run_id": 1}, "run_id": 1},
        {"kind": "completed", "payload": {"summary": "did work"}, "run_id": 1},
    ]
    seed_initiative(store)
    seed_binding(store, "demo", "t1", "ini-1")
    record = NativeEventObserver(store, host).observe_task("t1")
    assert record["initiative_ref"] == "ini-1"
    assert record["task_id"] == "t1"
    assert record["task_status"] == "done"
    assert record["completed_event_run_id"] == 1


def test_unbound_native_task_is_observed_but_not_reconciled(store):
    host = FakeObservationHost()
    host.tasks["t-unknown"] = {"id": "t-unknown", "status": "done"}
    host.events["t-unknown"] = [
        {"kind": "completed", "payload": {}, "run_id": 2}
    ]
    record = NativeEventObserver(store, host).observe_task("t-unknown")
    assert record["initiative_ref"] is None
    assert record["task_status"] == "done"


def test_observer_is_read_only(store):
    host = FakeObservationHost()
    host.tasks["t2"] = {"id": "t2", "status": "done"}
    NativeEventObserver(store, host).observe_task("t2")
    assert host.tasks["t2"]["status"] == "done"  # unchanged


def test_observation_event_persisted_to_domain_events(store):
    seed_initiative(store, ref="ini-3")
    seed_binding(store, "demo", "t3", "ini-3")
    host = FakeObservationHost()
    host.tasks["t3"] = {"id": "t3", "status": "done"}
    host.events["t3"] = [{"kind": "completed", "payload": {}, "run_id": 5}]
    NativeEventObserver(store, host).observe_task("t3")
    rows = store._conn.execute(
        "SELECT event_type, subject, payload_json FROM domain_events"
        " WHERE event_type='stewardship.native.task_observed'"
    ).fetchall()
    assert len(rows) == 1
    payload = json.loads(rows[0]["payload_json"])
    assert payload["task_id"] == "t3"
    assert payload["completed_event_run_id"] == 5


def test_duplicate_native_events_dedupe_via_claims(store):
    host = FakeObservationHost()
    host.tasks["t1"] = {"id": "t1", "status": "done"}
    host.events["t1"] = [{"kind": "completed", "payload": {}, "run_id": 1}]
    seed_initiative(store)
    observer = NativeEventObserver(store, host)
    first = observer.observe_task("t1", claim_key="native:t1")
    replay = observer.observe_task("t1", claim_key="native:t1")
    assert first and first["claim"] == "won"
    assert replay == {}  # replay suppressed


def test_out_of_order_events_do_not_duplicate_execution(store):
    host = FakeObservationHost()
    host.tasks["t1"] = {"id": "t1", "status": "done"}
    host.events["t1"] = [
        {"kind": "completed", "payload": {}, "run_id": 1},
        # late-arriving OLDER event must not re-execute anything
        {"kind": "claimed", "payload": {"run_id": 1}, "run_id": 1},
    ]
    seed_initiative(store)
    observer = NativeEventObserver(store, host)
    first = observer.observe_task("t1", claim_key="native:t1")
    replay = observer.observe_task("t1", claim_key="native:t1")
    assert first["task_status"] == "done"
    assert replay == {}


# --------------------------------------------------------------------------- #
# P3.3 — bounded reasoning failure contract (no fabricated proposals)        #
# --------------------------------------------------------------------------- #


def test_reasoning_failure_records_error_not_proposal(svc, enabled, clock, tmp_path):
    from hermes_project_stewardship.cycles.engine import CycleEngine

    repo = make_repo(tmp_path / "r")
    wire_repo(svc, enabled, repo)
    bus = EventBus(svc.store)
    engine = CycleEngine(svc, clock=clock)
    engine.attach_events(bus)
    svc.add_objective(
        enabled, name="ci green", evaluator_type="command",
        target=">=1", command=["python3", "-c", "raise SystemExit(1)"],
        severity="high",
    )

    def failing_proposal_fn(project_id, verdict, results, cycle_id):
        raise RuntimeError("provider unavailable: simulated budget exhaustion")

    engine.proposal_fn = failing_proposal_fn
    result = engine.run_cycle(enabled, trigger_type="manual")
    assert result["initiatives"] == []
    errors = bus.recent(
        project_id=enabled, event_type="stewardship.reasoning.failed"
    )
    assert len(errors) == 1
    assert "provider unavailable" in errors[0]["payload"]["error"]
    # The cycle still completes honestly: health derived from real evidence.
    assert result["health"]["state"] in {
        HealthState.WATCH.value, HealthState.DEGRADED.value,
    }


def test_reasoning_budget_caps_proposals(svc, enabled, clock, tmp_path):
    from hermes_project_stewardship.cycles.engine import CycleEngine

    repo = make_repo(tmp_path / "r2")
    wire_repo(svc, enabled, repo)
    engine = CycleEngine(svc, clock=clock, max_initiatives_per_cycle=1)
    svc.add_objective(
        enabled, name="ci green", evaluator_type="command",
        target=">=1", command=["python3", "-c", "raise SystemExit(1)"],
        severity="high",
    )

    def greedy_proposal_fn(project_id, verdict, results, cycle_id):
        return [
            {"title": "Idea one", "rationale": "r", "risk": "low",
             "dedupe_key": "idea-1"},
            {"title": "Idea two", "rationale": "r", "risk": "low",
             "dedupe_key": "idea-2"},
        ]

    engine.proposal_fn = greedy_proposal_fn
    result = engine.run_cycle(enabled, trigger_type="manual")
    created = [i for i in result["initiatives"] if not i.get("refused")]
    assert len(created) == 1
    assert created[0]["title"] == "Idea one"


# --------------------------------------------------------------------------- #
# P3.4 — host-identity-verified completion reconciliation                    #
# --------------------------------------------------------------------------- #


def test_completion_requires_host_identity(store):
    seed_initiative(store)
    seed_observation(store)
    reconciler = make_service(store, FakeObservationHost())
    with pytest.raises(IntegrationError):
        reconciler.complete_from_native(ref="ini-1", outcome={"verified": True})


def test_completion_with_wrong_run_identity_refused(store):
    host = FakeObservationHost()
    seed_initiative(store)
    seed_observation(store)
    host.tasks["t1"] = {"id": "t1", "status": "done"}
    host.runs["t1"] = [{"id": 7, "outcome": "completed"}]  # actual run 7
    reconciler = make_service(store, host)
    with pytest.raises(IntegrationError):
        reconciler.complete_from_native(
            ref="ini-1", outcome={"verified": True}, run_id=99, task_id="t1"
        )


def test_completion_without_validation_contract_refused(store):
    host = FakeObservationHost()
    seed_initiative(store)
    seed_observation(store)
    with store.tx() as cx:
        cx.execute(
            "UPDATE project_initiatives SET validation_contract_json='{}'"
            " WHERE ref='ini-1'"
        )
    host.tasks["t1"] = {"id": "t1", "status": "done"}
    host.runs["t1"] = [{"id": 7, "outcome": "completed"}]
    reconciler = make_service(store, host)
    with pytest.raises(IntegrationError):
        reconciler.complete_from_native(
            ref="ini-1", outcome={"verified": True}, run_id=7, task_id="t1"
        )


def test_completion_with_valid_identity_reconciles(store):
    host = FakeObservationHost()
    seed_initiative(store)
    seed_observation(store)
    seed_binding(store, "demo", "t1", "ini-1")
    host.tasks["t1"] = {"id": "t1", "status": "done"}
    host.runs["t1"] = [{"id": 7, "outcome": "completed", "status": "done"}]
    reconciler = make_service(store, host)
    result = reconciler.complete_from_native(
        ref="ini-1", outcome={"summary": "suite green", "verified": True},
        run_id=7, task_id="t1",
    )
    assert result["initiative_status"] == "completed"
    row = store._conn.execute(
        "SELECT status, completed_at FROM project_initiatives WHERE ref='ini-1'"
    ).fetchone()
    assert row["status"] == "completed"
    assert row["completed_at"] is not None


def test_unrelated_work_not_marked_done(store):
    host = FakeObservationHost()
    seed_initiative(store, ref="ini-a")
    seed_initiative(store, ref="ini-b", status="executing")
    seed_binding(store, "demo", "ta", "ini-a")
    host.tasks["ta"] = {"id": "ta", "status": "done"}
    host.runs["ta"] = [{"id": 1, "outcome": "completed", "status": "done"}]
    reconciler = make_service(store, host)
    reconciler.complete_from_native(
        ref="ini-a", outcome={"summary": "ok", "verified": True},
        run_id=1, task_id="ta",
    )
    b_status = store._conn.execute(
        "SELECT status FROM project_initiatives WHERE ref='ini-b'"
    ).fetchone()["status"]
    assert b_status == "executing"


def test_native_blocked_outcome_blocks_initiative(store):
    host = FakeObservationHost()
    seed_initiative(store)
    seed_binding(store, "demo", "t1", "ini-1")
    host.tasks["t1"] = {"id": "t1", "status": "blocked"}
    host.runs["t1"] = [{"id": 3, "outcome": "blocked", "status": "blocked"}]
    reconciler = make_service(store, host)
    result = reconciler.complete_from_native(
        ref="ini-1", outcome={"reason": "waiting on upstream"},
        run_id=3, task_id="t1", regressed=True,
    )
    row = store._conn.execute(
        "SELECT status FROM project_initiatives WHERE ref='ini-1'"
    ).fetchone()
    assert row["status"] == "regressed"
    assert result["initiative_status"] == "regressed"


def test_host_blocked_outcome_cannot_complete_initiative(store):
    """Host says the run ended 'blocked' — a completed=true claim is refused."""
    host = FakeObservationHost()
    seed_initiative(store)
    host.tasks["t1"] = {"id": "t1", "status": "done"}
    host.runs["t1"] = [{"id": 4, "outcome": "blocked"}]
    reconciler = make_service(store, host)
    with pytest.raises(IntegrationError):
        reconciler.complete_from_native(
            ref="ini-1", outcome={"verified": True}, run_id=4, task_id="t1",
        )


def test_lost_run_history_never_fabricates_result(store):
    host = FakeObservationHost()
    seed_initiative(store)
    seed_observation(store)
    host.tasks["t1"] = {"id": "t1", "status": "done"}
    host.runs["t1"] = []  # run history lost
    reconciler = make_service(store, host)
    with pytest.raises(IntegrationError):
        reconciler.complete_from_native(ref="ini-1", outcome={"verified": True},
                                        run_id=1, task_id="t1")


def test_already_completed_initiative_not_recompleted(store):
    """Replayed completion on a non-executing initiative is refused."""
    host = FakeObservationHost()
    seed_initiative(store, status="completed")
    host.tasks["t1"] = {"id": "t1", "status": "done"}
    host.runs["t1"] = [{"id": 7, "outcome": "completed"}]
    reconciler = make_service(store, host)
    with pytest.raises(IntegrationError):
        reconciler.complete_from_native(
            ref="ini-1", outcome={"summary": "ok"}, run_id=7, task_id="t1",
        )


# --------------------------------------------------------------------------- #
# P3.5 — observation run-once, classification, crash recovery                 #
# --------------------------------------------------------------------------- #


class StubEngine:
    def __init__(self, state="healthy"):
        self.state = state
        self.calls: list[str] = []

    def run_cycle(self, project_id, *, trigger_type="manual", **kwargs):
        self.calls.append(trigger_type)
        return {"cycle_id": 42, "health": {"state": self.state}}


def test_observation_runs_once_per_outcome_with_classification(store):
    seed_initiative(store)
    seed_observation(store)
    reconciler = make_service(store, FakeObservationHost(),
                              engine=StubEngine("healthy"))
    first = reconciler.run_observation("ini-1")
    assert first["status"] == "completed"
    assert first["cycle_id"] == 42
    assert first["result_state"] == "improved"
    replay = reconciler.run_observation("ini-1")
    assert replay["cycle_id"] == 42  # same outcome, not re-run


def test_observation_result_states_are_persisted(store):
    host = FakeObservationHost()

    conn = store
    seed_initiative(conn)
    seed_observation(conn, outcome={"verified": True})
    improved = make_service(conn, host, engine=StubEngine("healthy"))
    assert improved.run_observation("ini-1")["result_state"] == "improved"

    seed_initiative(conn, ref="ini-2")
    seed_observation(conn, ref="ini-2", outcome={"verified": False}, regressed=1)
    regressed = make_service(conn, host, engine=StubEngine("degraded"))
    assert regressed.run_observation("ini-2")["result_state"] == "regressed"

    seed_initiative(conn, ref="ini-3")
    seed_observation(conn, ref="ini-3", outcome={"verified": True})
    unknown = make_service(conn, host, engine=StubEngine("unknown"))
    assert unknown.run_observation("ini-3")["result_state"] == "unknown"

    rows = store._conn.execute(
        "SELECT initiative_ref, result_state, result_evidence_json"
        " FROM dockyard_observation_triggers ORDER BY initiative_ref"
    ).fetchall()
    by_ref = {r["initiative_ref"]: r for r in rows}
    assert by_ref["ini-1"]["result_state"] == "improved"
    assert by_ref["ini-2"]["result_state"] == "regressed"
    assert by_ref["ini-3"]["result_state"] == "unknown"
    evidence = json.loads(by_ref["ini-1"]["result_evidence_json"])
    assert evidence["cycle_id"] == 42
    assert "health_state" in evidence


def _seed_crashed_observation(store, ref="ini-1", project="demo"):
    """Seed a running row with genuine crash evidence: last touched 2h ago."""
    seed_initiative(store, ref=ref, project=project)
    seed_observation(store, ref=ref, project=project, status="running")
    from datetime import timedelta

    stale_time = (store._clock() - timedelta(hours=2)).isoformat()
    with store.tx() as cx:
        cx.execute(
            "UPDATE dockyard_observation_triggers SET updated_at=?"
            " WHERE initiative_ref=?",
            (stale_time, ref),
        )


def test_crash_mid_observation_recovers_on_restart(store):
    """An aged 'running' row (crash evidence) returns to pending honestly."""
    _seed_crashed_observation(store)
    reconciler = make_service(store, FakeObservationHost())
    assert reconciler.recover_stale_observations() == ["ini-1"]
    row = store._conn.execute(
        "SELECT status FROM dockyard_observation_triggers"
        " WHERE initiative_ref='ini-1'"
    ).fetchone()
    assert row["status"] == "pending"


def test_recovered_observation_can_run(store):
    _seed_crashed_observation(store)
    reconciler = make_service(store, FakeObservationHost(),
                              engine=StubEngine("healthy"))
    assert reconciler.recover_stale_observations() == ["ini-1"]
    assert reconciler.run_observation("ini-1")["status"] == "completed"


def test_completed_observations_never_recovered(store):
    seed_initiative(store)
    seed_observation(store, status="completed", cycle_id=5)
    reconciler = make_service(store, FakeObservationHost())
    assert reconciler.recover_stale_observations() == []


def test_engine_failure_marks_observation_failed(store):
    seed_initiative(store)
    seed_observation(store)

    class BoomEngine:
        def run_cycle(self, project_id, **kwargs):
            raise RuntimeError("collector crashed")

    reconciler = make_service(store, FakeObservationHost(), engine=BoomEngine())
    with pytest.raises(RuntimeError):
        reconciler.run_observation("ini-1")
    row = store._conn.execute(
        "SELECT status FROM dockyard_observation_triggers"
        " WHERE initiative_ref='ini-1'"
    ).fetchone()
    assert row["status"] == "failed"
    # Failed rows need an explicit retry; recovery does NOT auto-retry them.
    assert reconciler.recover_stale_observations() == []


# --------------------------------------------------------------------------- #
# P3.6 — bounded reconciliation command: default-inactive, honest triggers    #
# --------------------------------------------------------------------------- #


def test_reconciliation_feature_disabled_by_default(svc, enabled):
    """The reconciliation feature is OFF until explicitly enabled."""
    features = svc.features(enabled)
    assert features["reconciliation"] is False
    with pytest.raises(FeatureDisabledError):
        svc.require_feature(enabled, "reconciliation")
    # Enabling restores the documented behaviour (non-destructive toggle).
    svc.update_features(
        enabled, {"reconciliation": True}, actor="sahil", interface="api"
    )
    svc.require_feature(enabled, "reconciliation")


def test_reconcile_requires_enabled_feature(store, svc, enabled):
    reconciler = make_service(store, FakeObservationHost(), service=svc)
    with pytest.raises(FeatureDisabledError):
        reconciler.reconcile(enabled, actor="sahil", interface="api")


def test_reconcile_preserves_non_manual_trigger_type(store, svc, enabled):
    """Scheduled reconciliation forwards the caller's trigger: 'cron' in the
    report is 'cron' at the engine, so pause protection uses the real type."""
    engine = StubEngine("healthy")
    svc.update_features(
        enabled, {"reconciliation": True}, actor="sahil", interface="api"
    )
    seed_initiative(store, project=enabled)
    seed_observation(store, project=enabled)
    reconciler = make_service(store, FakeObservationHost(),
                              engine=engine, service=svc)
    report = reconciler.reconcile(enabled, actor="cron",
                                  interface="native-cron", trigger_type="cron")
    assert report["trigger_type"] == "cron"
    assert engine.calls == ["cron"]  # report and engine agree; no rewrite


def test_reconcile_reports_empty_scope_honestly(store, svc, enabled):
    svc.update_features(
        enabled, {"reconciliation": True}, actor="sahil", interface="api"
    )
    reconciler = make_service(store, FakeObservationHost(),
                              engine=StubEngine(), service=svc)
    report = reconciler.reconcile(enabled, actor="sahil", interface="api")
    assert report["recovered"] == []
    assert report["observations_run"] == 0


def test_reconcile_recovers_then_runs_pending(store, svc, enabled):
    svc.update_features(
        enabled, {"reconciliation": True}, actor="sahil", interface="api"
    )
    _seed_crashed_observation(store, ref="ini-r", project=enabled)
    reconciler = make_service(store, FakeObservationHost(),
                              engine=StubEngine("healthy"), service=svc)
    report = reconciler.reconcile(enabled, actor="sahil", interface="api")
    assert report["recovered"] == ["ini-r"]
    assert report["observations_run"] == 1


def test_reconcile_on_paused_project_refuses_non_manual_trigger(store, enabled):
    """The paused gate lives in CycleEngine; reconciliation must forward it."""
    from hermes_project_stewardship.cycles.engine import CycleRefused

    class PausedEngine:
        def run_cycle(self, project_id, *, trigger_type="manual", **kwargs):
            raise CycleRefused("project is paused (only manual cycles allowed)")

    seed_initiative(store, ref="ini-p", project=enabled)
    seed_observation(store, ref="ini-p", project=enabled, status="pending")
    reconciler = make_service(store, FakeObservationHost(),
                              engine=PausedEngine())
    with pytest.raises(CycleRefused):
        reconciler.reconcile(enabled, actor="cron", interface="native-cron",
                             trigger_type="cron")


# --------------------------------------------------------------------------- #
# P3.6 — reconcile exposed through the API, default-inactive                  #
# --------------------------------------------------------------------------- #


def test_api_reconcile_disabled_by_default_409(store, enabled):
    from fastapi.testclient import TestClient

    from hermes_project_stewardship.api.server import create_app
    from hermes_project_stewardship.kanban import ReferenceKanbanAdapter

    client = TestClient(create_app(store, kanban_adapter=ReferenceKanbanAdapter(store)))
    response = client.post(f"/stewardship/v1/projects/{enabled}/reconcile",
                           json={"actor": "sahil", "interface": "api"})
    assert response.status_code == 409
    body = response.json()
    assert body["error"]["code"] in {"feature_disabled", "service_error"}
    assert "reconciliation" in body["error"]["message"]


def test_api_reconcile_enabled_runs_and_reports(store, svc, enabled):
    from fastapi.testclient import TestClient

    from hermes_project_stewardship.api.server import create_app
    from hermes_project_stewardship.kanban import ReferenceKanbanAdapter

    svc.update_features(
        enabled, {"reconciliation": True}, actor="sahil", interface="api"
    )
    seed_initiative(store, ref="ini-api", project=enabled)
    seed_observation(store, ref="ini-api", project=enabled, status="running")
    client = TestClient(create_app(store, kanban_adapter=ReferenceKanbanAdapter(store)))
    response = client.post(f"/stewardship/v1/projects/{enabled}/reconcile",
                           json={"actor": "sahil", "interface": "api"})
    assert response.status_code == 200, response.text
    report = response.json()
    assert report["recovered"] == ["ini-api"]
    assert report["observations_run"] == 1
    # Observations endpoint now carries the classification.
    observations = client.get(
        f"/stewardship/v1/projects/{enabled}/observations"
    ).json()["observations"]
    assert observations[0]["result_state"] in {"improved", "regressed", "unknown"}


def test_plugin_registers_reconcile_command():
    """The bounded reconcile command is registered and refuses cleanly."""
    from hermes_project_stewardship import plugin

    routes = plugin._slash_routes()
    assert "project-reconcile" in routes
    assert "usage: /project-reconcile" in routes["project-reconcile"]("")
    # Without an enabled project / host the command refuses honestly rather
    # than pretending to reconcile.
    out = routes["project-reconcile"]("no-such-project")
    assert "refused" in out.lower()


# --------------------------------------------------------------------------- #
# Review defect 1 — completion must verify the run BELONGS to this            #
# initiative and COMPLETED; an unrelated running run proves nothing.          #
# --------------------------------------------------------------------------- #


def test_completion_with_unrelated_running_run_refused(store):
    """A different task's still-running run must not complete anything."""
    host = FakeObservationHost()
    seed_initiative(store, ref="ini-a")
    seed_binding(store, "demo", "t-owned", "ini-a")
    # Unrelated task with a genuinely RUNNING run (not completed).
    host.tasks["t-other"] = {"id": "t-other", "status": "running"}
    host.runs["t-other"] = [{"id": 11, "outcome": None, "status": "running"}]
    reconciler = make_service(store, host)
    with pytest.raises(IntegrationError):
        reconciler.complete_from_native(
            ref="ini-a", outcome={"verified": True}, run_id=11, task_id="t-other",
        )
    row = store._conn.execute(
        "SELECT status FROM project_initiatives WHERE ref='ini-a'"
    ).fetchone()
    assert row["status"] == "executing"  # untouched


def test_completion_with_unfinished_run_outcome_refused(store):
    """A run whose outcome is not terminal (None/running) proves nothing."""
    host = FakeObservationHost()
    seed_initiative(store, ref="ini-a")
    seed_binding(store, "demo", "t1", "ini-a")
    host.tasks["t1"] = {"id": "t1", "status": "running"}
    host.runs["t1"] = [{"id": 5, "outcome": None, "status": "running"}]
    reconciler = make_service(store, host)
    with pytest.raises(IntegrationError):
        reconciler.complete_from_native(
            ref="ini-a", outcome={"verified": True}, run_id=5, task_id="t1",
        )
    row = store._conn.execute(
        "SELECT status FROM project_initiatives WHERE ref='ini-a'"
    ).fetchone()
    assert row["status"] == "executing"


def test_completion_with_wrong_project_task_refused(store):
    """Even a COMPLETED run proves nothing if its task belongs to another
    initiative (or none)."""
    host = FakeObservationHost()
    seed_initiative(store, ref="ini-a")
    seed_initiative(store, ref="ini-someone-else")
    seed_binding(store, "demo", "t-owned", "ini-a")
    # Task completed but bound to a DIFFERENT initiative.
    host.tasks["t-foreign"] = {"id": "t-foreign", "status": "done"}
    host.runs["t-foreign"] = [{"id": 12, "outcome": "completed", "status": "done"}]
    seed_binding(store, "demo", "t-foreign", "ini-someone-else")
    reconciler = make_service(store, host)
    with pytest.raises(IntegrationError):
        reconciler.complete_from_native(
            ref="ini-a", outcome={"verified": True}, run_id=12,
            task_id="t-foreign",
        )
    row = store._conn.execute(
        "SELECT status FROM project_initiatives WHERE ref='ini-a'"
    ).fetchone()
    assert row["status"] == "executing"


def test_completion_with_owned_completed_run_still_accepted(store):
    """The happy path survives: bound task, completed run, valid contract."""
    host = FakeObservationHost()
    seed_initiative(store, ref="ini-a")
    seed_binding(store, "demo", "t-owned", "ini-a")
    host.tasks["t-owned"] = {"id": "t-owned", "status": "done"}
    host.runs["t-owned"] = [{"id": 13, "outcome": "completed", "status": "done"}]
    reconciler = make_service(store, host)
    result = reconciler.complete_from_native(
        ref="ini-a", outcome={"summary": "done"}, run_id=13, task_id="t-owned",
    )
    assert result["initiative_status"] == "completed"


def test_completion_requires_binding_when_store_tracks_it(store):
    """A completed run on a task bound to NO initiative is refused — the
    binding is what makes 'belongs to this initiative' checkable."""
    host = FakeObservationHost()
    seed_initiative(store, ref="ini-a")
    # No binding for this task at all.
    host.tasks["t-orphan"] = {"id": "t-orphan", "status": "done"}
    host.runs["t-orphan"] = [{"id": 14, "outcome": "completed", "status": "done"}]
    reconciler = make_service(store, host)
    with pytest.raises(IntegrationError):
        reconciler.complete_from_native(
            ref="ini-a", outcome={"verified": True}, run_id=14,
            task_id="t-orphan",
        )
    row = store._conn.execute(
        "SELECT status FROM project_initiatives WHERE ref='ini-a'"
    ).fetchone()
    assert row["status"] == "executing"


# --------------------------------------------------------------------------- #
# Review defect 2 — recovery must be project-scoped and crash-evidenced.      #
# --------------------------------------------------------------------------- #


def test_recovery_is_scoped_to_project(store):
    """Recovering project A must not touch project B's running observation."""
    _seed_crashed_observation(store, ref="ini-a", project="alpha")
    seed_initiative(store, ref="ini-b", project="beta")
    # B's observation has been running recently (active worker plausible).
    fresh = store._clock().isoformat()
    seed_observation(store, ref="ini-b", project="beta", status="running",
                     updated_at=fresh)
    reconciler = make_service(store, FakeObservationHost())
    recovered = reconciler.recover_stale_observations(project_id="alpha")
    assert recovered == ["ini-a"]
    statuses = dict(
        (r["initiative_ref"], r["status"])
        for r in store._conn.execute(
            "SELECT initiative_ref, status FROM dockyard_observation_triggers"
        ).fetchall()
    )
    assert statuses["ini-a"] == "pending"   # A recovered (aged crash evidence)
    assert statuses["ini-b"] == "running"   # B untouched (fresh + other project)


def test_recovery_requires_crash_evidence(store):
    """A recently-updated running observation may be genuinely ACTIVE work —
    recovery must not reset it without crash evidence (age)."""
    seed_initiative(store, ref="ini-live")
    fresh = store._clock().isoformat()
    seed_observation(store, ref="ini-live", status="running",
                     updated_at=fresh)
    reconciler = make_service(store, FakeObservationHost())
    assert reconciler.recover_stale_observations() == []
    row = store._conn.execute(
        "SELECT status FROM dockyard_observation_triggers"
        " WHERE initiative_ref='ini-live'"
    ).fetchone()
    assert row["status"] == "running"  # active work untouched


def test_recovery_takes_aged_running_rows_with_expired_claims(store):
    """A running observation whose claim has expired (old updated_at, claim
    holder gone/TTL exceeded) is stale — recovery resets it."""
    seed_initiative(store, ref="ini-dead")
    old = (store._clock()).isoformat()
    seed_observation(store, ref="ini-dead", status="running", updated_at=old)
    # Age the row far beyond the stale threshold by rewinding updated_at.
    from datetime import timedelta

    stale_time = (store._clock() - timedelta(hours=2)).isoformat()
    with store.tx() as cx:
        cx.execute(
            "UPDATE dockyard_observation_triggers SET updated_at=?"
            " WHERE initiative_ref='ini-dead'",
            (stale_time,),
        )
    reconciler = make_service(store, FakeObservationHost())
    assert reconciler.recover_stale_observations() == ["ini-dead"]


# --------------------------------------------------------------------------- #
# Review defect 3 — a failed observation must not be permanently suppressed.  #
# --------------------------------------------------------------------------- #


def test_transient_read_failure_then_retry_observes(store):
    """Read failure after claiming → retry must observe, not return {}."""
    seed_initiative(store)
    seed_binding(store, "demo", "t1", "ini-1")

    class FlakyHost(FakeObservationHost):
        def __init__(self):
            super().__init__()
            self.fail_reads = True

        def get_task(self, task_id):
            if self.fail_reads:
                raise OSError("transient host read failure")
            return super().get_task(task_id)

    host = FlakyHost()
    observer = NativeEventObserver(store, host)
    with pytest.raises(OSError):
        observer.observe_task("t1", claim_key="native:t1")
    # Host recovers; the SAME claim key must now observe successfully.
    host.fail_reads = False
    host.tasks["t1"] = {"id": "t1", "status": "done"}
    host.events["t1"] = [{"kind": "completed", "payload": {}, "run_id": 1}]
    record = observer.observe_task("t1", claim_key="native:t1")
    assert record and record.get("claim") == "won"
    assert record["task_status"] == "done"


def test_failed_observation_trigger_is_retryable(store):
    """A failed trigger must be re-runnable after its error is cleared —
    a transient engine failure must not permanently lose the observation."""
    seed_initiative(store)
    seed_observation(store)

    class BoomThenWorkEngine:
        def __init__(self):
            self.calls = 0

        def run_cycle(self, project_id, **kwargs):
            self.calls += 1
            if self.calls == 1:
                raise RuntimeError("transient engine failure")
            return {"cycle_id": 77, "health": {"state": "healthy"}}

    engine = BoomThenWorkEngine()
    reconciler = make_service(store, FakeObservationHost(), engine=engine)
    with pytest.raises(RuntimeError):
        reconciler.run_observation("ini-1")
    # The failed row is left for retry: a later run attempt succeeds.
    result = reconciler.run_observation("ini-1", retry_failed=True)
    assert result["status"] == "completed"
    assert result["cycle_id"] == 77
    assert engine.calls == 2


# --------------------------------------------------------------------------- #
# Review defect 4 — the loop must be CONNECTED: observation → reconciliation. #
# --------------------------------------------------------------------------- #


def test_reconcile_observes_native_tasks_and_completes_initiatives(store):
    """The promised loop: reconcile() must drive the real chain — observe
    bound native tasks, require host identity, and complete the matching
    initiative when the host proves completion — not just re-run old
    observation triggers."""
    seed_initiative(store, ref="ini-conn", status="executing")
    seed_binding(store, "demo", "t-conn", "ini-conn")

    host = FakeObservationHost()
    host.tasks["t-conn"] = {"id": "t-conn", "status": "done"}
    host.events["t-conn"] = [
        {"kind": "completed", "payload": {"summary": "suite green"}, "run_id": 9},
    ]
    host.runs["t-conn"] = [{"id": 9, "outcome": "completed", "status": "done"}]

    class RecordingEngine:
        def __init__(self):
            self.calls: list[str] = []

        def run_cycle(self, project_id, *, trigger_type="manual", **kw):
            self.calls.append(trigger_type)
            return {"cycle_id": 1, "health": {"state": "healthy"}}

    engine = RecordingEngine()
    reconciler = make_service(store, host, engine=engine)
    report = reconciler.reconcile("demo", actor="sahil", interface="api")
    # The bound task was observed through the host...
    observed = store._conn.execute(
        "SELECT COUNT(*) AS n FROM domain_events"
        " WHERE event_type='stewardship.native.task_observed'"
    ).fetchone()["n"]
    assert observed >= 1
    # ...the initiative was completed from HOST evidence (not just the
    # outcome payload)...
    row = store._conn.execute(
        "SELECT status FROM project_initiatives WHERE ref='ini-conn'"
    ).fetchone()
    assert row["status"] == "completed"
    # ...and the report says so honestly.
    assert report["completed"] == ["ini-conn"]


def test_reconcile_reports_cron_trigger_and_engine_receives_cron(store):
    """Contract mismatch fix: the report's trigger_type must equal what the
    engine actually received — no silent rewrite to 'internal'."""
    seed_initiative(store, ref="ini-t", status="executing")
    seed_binding(store, "demo", "t-t", "ini-t")
    host = FakeObservationHost()
    host.tasks["t-t"] = {"id": "t-t", "status": "done"}
    host.events["t-t"] = [{"kind": "completed", "payload": {}, "run_id": 2}]
    host.runs["t-t"] = [{"id": 2, "outcome": "completed", "status": "done"}]

    engine = StubEngine("healthy")
    reconciler = make_service(store, host, engine=engine)
    report = reconciler.reconcile("demo", actor="cron",
                                  interface="native-cron", trigger_type="cron")
    assert report["trigger_type"] == "cron"
    assert engine.calls == ["cron"], (
        f"engine received {engine.calls}; the reported trigger and the"
        " engine's trigger must agree"
    )


def test_observation_run_uses_reconcile_supplied_trigger(store):
    """run_observation must forward the caller's trigger type, not a
    hard-coded 'internal'."""
    seed_initiative(store)
    seed_observation(store)
    engine = StubEngine("healthy")
    reconciler = make_service(store, FakeObservationHost(), engine=engine)
    reconciler.run_observation("ini-1", trigger_type="cron")
    assert engine.calls == ["cron"]


def test_repeated_reconcile_observes_later_completion(store):
    """Review blocker: reconciliation is REPEATED by design. Pass 1 observes
    a running task; pass 2 (after the native task completes) must observe the
    completion — not crash on an empty claim-suppressed record, and not stay
    silently stuck in executing.

    Deduplication must distinguish a NEW task outcome from a replay of the
    SAME observation: the claim must key on the observed state, so a state
    transition re-observes while same-state replays stay suppressed.
    """
    seed_initiative(store, status="executing")
    seed_binding(store, "demo", "task-a", "ini-1")
    host = FakeObservationHost()
    host.tasks["task-a"] = {"id": "task-a", "status": "in_progress"}

    reconciler = make_service(store, host)
    first = reconciler.reconcile("demo", actor="test", interface="api")
    assert first["observed_tasks"] == 1
    assert first["completed"] == []

    # Native work finishes between the two passes.
    host.tasks["task-a"] = {"id": "task-a", "status": "done"}
    host.events["task-a"] = [{"kind": "completed", "payload": {}, "run_id": 1}]
    host.runs["task-a"] = [{"id": 1, "outcome": "completed", "status": "done"}]

    second = reconciler.reconcile("demo", actor="test", interface="api")
    assert second["completed"] == ["ini-1"], (
        f"second pass must observe the completion, got {second}"
    )
    status = store._conn.execute(
        "SELECT status FROM project_initiatives WHERE ref='ini-1'"
    ).fetchone()["status"]
    assert status == "completed"

    # Pass 3 replays the SAME state: deduped (no crash, no duplicate work).
    third = reconciler.reconcile("demo", actor="test", interface="api")
    assert third["completed"] == []


def test_same_state_replay_stays_deduped(store):
    """The claim must still suppress an identical re-observation: two passes
    over the same unchanged state dedupe to one observed record."""
    seed_initiative(store, status="executing")
    seed_binding(store, "demo", "task-a", "ini-1")
    host = FakeObservationHost()
    host.tasks["task-a"] = {"id": "task-a", "status": "in_progress"}

    reconciler = make_service(store, host)
    first = reconciler.reconcile("demo", actor="test", interface="api")
    second = reconciler.reconcile("demo", actor="test", interface="api")
    assert first["observed_tasks"] == 1
    # Unchanged state: the second pass does not re-observe the task.
    assert second["observed_tasks"] == 0
