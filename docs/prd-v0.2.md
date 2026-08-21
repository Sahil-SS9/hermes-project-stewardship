# Hermes Project Stewardship — PRD v0.2 (implementation-backed)

Status: **implemented core** (v0.1.0-alpha). This revision of the original
concept PRD maps every requirement to its implementation and records the
decisions the original v0.1 left open.

## What changed from the concept PRD (v0.1)

The 2026-08-21 critical review identified two hard gaps: a one-line security
model at the highest-risk point, and zero open-source packaging. Both are now
first-class:

| Review finding | Resolution in this repo |
|---|---|
| Prompt injection one bullet deep | `security/untrusted.py` + own threat model (`docs/threat-model.md`) + high-severity scan hits force fail-closed |
| Command evaluators unsandboxed | argv-only, allowlisted executables, timeout+output caps, no shell (`security/allowlist.py`) |
| Contradiction severity by LLM? | Deterministic: only deterministic collectors classify; LLM/memory is advisory-only evidence that can never authorise mutations |
| Discord permission binding unspecified | Stored per-project grants checked in gateway handler; approvals idempotent per initiative |
| Cost measured but never enforced | Cycle budget: max cycles/day + max initiatives/cycle enforced in engine |
| No concurrency control | Cross-process cycle mutex with TTL lease |
| Storage decision (§27.2) unresolved | Companion DB keyed by global project ID; single service layer for all surfaces |
| OSS layer missing | LICENSE/CONTRIBUTING/SECURITY/CoC/CHANGELOG/CI matrix/example/docs shipped |
| Plugin extensibility unverified (Gate-0 risk) | Registration surface is defensive; engine runs standalone without Hermes — integration contracts documented, not assumed |

## Requirement → implementation map

| FR | Status | Where |
|---|---|---|
| FR-01 enable/disable | done | `persistence/service.py::enable/disable` |
| FR-02 lead/member ownership | done | enable(owner…) + settings() |
| FR-03 persist policies | done | schema `project_stewardship` policy JSON columns |
| FR-04 deterministic verification cycle | done | `verification/engine.py` |
| FR-05 health snapshots w/ provenance | done | `record_health_snapshot` + evidence refs |
| FR-06 manual/cron/webhook cycles | partial | manual + gateway live; cron/webhook = trigger keys + budget guard ready, scheduler wiring is host-side (documented) |
| FR-07 evidence-backed initiatives | done | proposal requires rationale; cycle proposals carry objective refs |
| FR-08 approval before risky execution | done | approval_state machine + gateway permission binding |
| FR-09 Kanban binding | contract | `bind_board` + validation contract field; actual board creation is host-side (Hermes Kanban API), documented interface |
| FR-10 independent lifecycle tracking | done | initiative state machine incl. regressed |
| FR-11 outcome evaluation / regressions | done | `complete_initiative(regressed=True)` + health re-derivation path |
| FR-12 knowledge persistence | done | project_knowledge table + service methods |
| FR-13 domain events | partial | audit log covers all material actions today; pub/sub bus is an upstream-integration item |
| FR-14 identical state on all surfaces | done | single service layer behind CLI/RPC/gateway |
| FR-15 slash commands | contract | plugin.py `_slash_routes` mapping; registry wiring host-side |
| FR-16 Discord approvals via gateway | done (contract level) | gateway/handler.py platform-neutral; adapters translate |
| FR-17 pause/freeze without deletion | done | phase machine, mid-cycle honoured |
| FR-18 audit history | done | stewardship_audit_log w/ actor+interface |
| FR-19 standalone behaviour preserved | done | opt-in table; no core mutation |
| FR-20 owner_team_id migration path | done | column reserved; owner object exposes it |

MVP checklist MVP-01…MVP-17 from v0.1: satisfied except MVP-15/16 runtime
wiring (Discord adapter + desktop build) which are presentation hosts — the
contracts and reference implementations are here.

## Deferred (unchanged from v0.1 §22, plus review additions)

- Autonomy levels 4–5 enforcement details (merge gates) — ship disabled.
- Integration evaluators (CI APIs) beyond the collector hook.
- First-class Teams consumption.
- Pub/sub event bus for FR-13 (audit log is the interim consumer).
- Desktop panel build tooling (scaffold + contract shipped).

## Acceptance criteria

Carried over from v0.1 §25 verbatim; all testable ones are covered in
`tests/test_regression_scenarios.py` and `tests/test_cycles.py`.
