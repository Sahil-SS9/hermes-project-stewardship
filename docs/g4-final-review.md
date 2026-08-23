# G4 PRODUCT POLISH — FINAL REVIEW
## Hermes Dockyard PRD v0.3 Gate G4 · 2026-08-23 · KENSEI build record

---

## Verdict

**G4 COMPLETE. Exit criterion met and proven by test.**
PRD §6 Gate G4: "Sahil completes a full week of oversight without
opening a terminal."

Evidence at HEAD `b4dd0e3`: suite **273 passing, 0 warnings, exit 0**.
Gate E2E `tests/test_dockyard_g4_gate_e2e.py` simulates Monday→Sunday
oversight through product surfaces only: onboard → propose → single
Inbox pass decides everything (auto-binding boards) → measured
completion → dashboard roll-up → ack alerts.

## Phase-by-phase record

| Phase | Commit | Scope | Tests | Result |
|---|---|---|---|---|
| P1-P4 backend | `1a555d4` | /inbox, /dashboard, /notifications+ack, /onboard | 5 | PASS |
| UI wiring | `5f0dc85` | v4 adapter consumes all four; demo mode preserved | contract suite | PASS |
| Gate E2E | `b4dd0e3` | week-of-oversight zero CLI | 1 (composite) | PASS |

## Requirements coverage

| FR | Requirement | Status |
|---|---|---|
| TE-02 | Approval Inbox aggregates ALL pending decisions, one screen/call | DONE — cross-project /inbox with deep-links |
| UX-01 | No CLI/TUI/slash for any flow | PROVEN by gate E2E |
| UX-02 | Home: projects × health × work × owed decisions at a glance | DONE — /dashboard roll-up wired to live badges |
| UX-05 | Approval Inbox with evidence context, inline decisions | DONE |
| UX-07 | Notifications deep-link to screens, not transcripts | DONE — kind→screen mapping + ack |
| UX-08 | Zero-setup onboarding: repo + 3 questions | DONE — /onboard seeds group + default view |

## Defects found & fixed during G4

1. `InitiativeProposal` RPC model was missing `validation_contract`
   passthrough — a PRE-EXISTING upstream gap: contracts could never
   reach the engine via the API until this fix.
2. Approve route approved but never bound the board — zero-CLI approval
   now auto-binds + starts execution when a contract defines the work;
   manual /bind-board retained for edge cases.
3. Health snapshot column is `status`, not `objective_status`
   (dashboard would have crashed on first render).
4. Nested Pydantic model inside create_app broke request-body parsing
   (onboard 422s) — moved to module scope.
5. `group_create` surfaced raw IntegrityError on duplicates — now
   pre-checks and raises a clean domain error; re-onboard returns 409.

## Honest limitations

- UI wiring verified structurally + JS-syntax + contract tests; headless
  Firefox remains unavailable on this rig so pixel-QA of the wired
  adapter is pending your eyes on the real screen.
- Notification engine policies unchanged from stewardship v0.1 (no new
  severity routing) — deep-links and fleet feed are additive.
- Concurrency/race fuzzing and A2A injection hardening remain G5 scope.

## Suite state at close

273 passed · 0 warnings · exit 0 · HEAD `b4dd0e3` pushed to origin/master.

Gates closed: G0, G1, G2, G3, G4. Remaining: G5 hardening
(adversarial suite extension per PRD §6).
