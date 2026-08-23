# G3 PLATFORM ⇄ ENGINE — FINAL REVIEW
## Hermes Dockyard PRD v0.3 Gate G3 · 2026-08-23 · KENSEI build record

---

## Verdict

**G3 COMPLETE. Exit criterion met and proven by test.**
PRD §6 Gate G3: "An initiative flows: proposal → backlog → approve →
Kanban → measured outcome, zero CLI steps."

Evidence at HEAD `08c8ba5`: suite **268 passing, 0 warnings, exit 0**;
gate E2E `tests/test_dockyard_g3_gate_e2e.py` walks the criterion
through integration seams only, plus the rejection path (no board, no
twin).

## Phase-by-phase record

| Phase | Commit | Scope | Tests | Result |
|---|---|---|---|---|
| P1 Promotion | `84f8529` | initiative → first-class WorkItem twin (PM-07) | 5 | PASS |
| P2+P3 Orchestration + outcome | `2a6e4e5` | DockyardIntegration: propose/approve/bind/complete loop-back | 5 | PASS |
| Gate E2E | `08c8ba5` | full zero-CLI lifecycle + audit proof + rejection path | 2 | PASS |

## What now works end-to-end

1. Bot proposes with an evidence-bearing rationale + validation contract
   (engine enforces anti-busywork: dedupe, suppression windows).
2. PRIORITISE stage ranks it into the backlog with a mandatory reason,
   audit-stamped (bot kind recorded).
3. Human approves through the dockyard interface — the engine records
   `dockyard:human`; promotion mirrors the initiative onto the board as
   a first-class WorkItem carrying the contract in its evidence chain.
4. KanbanBridge cards the contract steps and starts execution.
5. Measured completion syncs the twin (done / blocked-on-regression)
   and posts a platform `result` event into the project's group channel,
   feeding BM-06 reputation from measured reality.

Every step lands in the ONE shared stewardship audit log with actor +
interface attribution (TE-01 preserved; zero state duplication).

## Defects found & fixed during G3

1. Promotion idempotency looked up by ref instead of label → twins
   would have duplicated on re-promotion (caught by P1 tests).
2. Group-create RPC dropped actor attribution (caught by G2 gate,
   fixed there; regression-guarded since).
3. Initial backlog add did not stamp audit fields — the FIRST ranked
   decision is itself a rank decision; upsert now stamps actor/kind/
   reason (surfaced by the gate E2E).
4. Validation-contract steps are string-typed for the bridge; earlier
   dict-shaped steps would crash card creation (caught in P2).

## Honest limitations

- Outcome measurement currently consumes bridge completion results;
  live objective/KPI evaluation wiring is G4 surface work (the trust
  engine already computes it; the product screens render it next).
- Approval Inbox aggregation across projects (TE-02) exists at API
  level; its dedicated screen ships with the v4 UI wiring in G4.
- Concurrency/race fuzzing remains G5 scope, as does A2A injection
  hardening beyond current payload contracts.

## Suite state at close

268 passed · 0 warnings · exit 0 · HEAD `08c8ba5` pushed to origin/master.

Gates closed so far: G0 (design lock), G1 (PM core), G2 (bot layer),
G3 (platform ⇄ engine). Next: G4 product polish (dashboard, approval
inbox screens wired to v4 UI, notifications, onboarding wizard).
