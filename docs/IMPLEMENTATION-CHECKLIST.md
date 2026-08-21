# Implementation Checklist — Master Verification Register

Single source of truth for the final push. Everything from the concept PRD,
the 2026-08-21 critical review, and subsequent directives is tracked here.
Nothing ships until every open item is `[x]` with its verification evidence.

Status key: `[x]` done+verified · `[~]` partial (contract/scaffold exists) · `[ ]` open

---

## WS1 — Domain model & autonomy policy

- [x] D1 Stewardship-enabled project object (mission/objectives/owner/policies) — FR-01..03 · `tests/test_service.py`
- [x] D2 Owner: lead_profile + member_profiles; owner_team_id reserved (FR-20, §27 Teams non-goal) · `tests/test_service.py::test_enable_and_settings`
- [x] D3 Restriction-only autonomy invariant `base ∩ level ∩ ¬denied` — review fix · `tests/test_policy.py::test_policy_can_only_restrict_not_widen`
- [x] D4 Levels 0–5 defined; 0–2 never mutate · `tests/test_policy.py::test_levels_0_2_never_mutate`
- [x] D5 Builder gate (L≥3): untrusted_content_ack AND runtime_allowlist_confirmed · `tests/test_policy.py::test_builder_gate_blocks_until_double_acknowledged`
- [x] D6 Human merge approval default-on regardless of level · `tests/test_policy.py::test_merge_requires_human_approval_by_default`
- [ ] D7 **Levels 4–5 runtime flow**: merge-gate evaluation step in cycle/initiative lifecycle (policy checks exist; executable merge-request path with evidence + auto-freeze on violation does not)
- [ ] D8 Capability audit entries when a level transition occurs (who/when/what changed)

## WS2 — Persistence & canonical state

- [x] P1 SQLite WAL store, FK ON, busy_timeout · `tests/test_store.py`
- [x] P2 Numbered migrations w/ downgrade SQL, idempotent re-run · `tests/test_store.py::test_migration_runs_and_is_idempotent`
- [x] P3 Companion DB keyed by GLOBAL project_id (§27.2 decision; avoids #75308 scoping bug) · architecture doc + cross-surface test
- [x] P4 Cross-thread safety: thread-local connections (caught by verify boot) · verify run 2026-08-21, readiness 200
- [x] P5 Retention/pruning job (snapshots/cycles/audit/trigger keys) · `tests/test_service.py::test_retention_prune`
- [x] P6 Audit log of every material action w/ actor+interface (FR-18) · `tests/test_service.py::test_audit_trail_records_material_actions`
- [ ] P9 **Schema v2 migration**: domain_events, notifications, cycle cost fields, merge-gate records
- [ ] P10 Backup/export command (`stewardctl export`) for operational safety

## WS3 — Verification (two-tier, fail-closed)

- [x] V1 Deterministic collectors: git_status, git_log, declared_file · `tests/test_verification.py`
- [x] V2 Missing repo/file ⇒ high-severity contradiction ⇒ fail-closed · `test_missing_repo_fails_closed`, `test_injection_in_readme_flags_contradiction`
- [x] V3 Advisory tier (memory/session/LLM) never authoritative; conflicts recorded low-severity · `test_stale_memory_recorded_but_not_blocking` (=PRD scenario 1)
- [x] V4 Injection scanning integrated into collectors · `tests/test_security.py`
- [ ] V5 **Integration collector**: CI/release status via provider APIs behind an adapter interface (+ recorded credential source)
- [ ] V6 Declared-file policy: support globs + required-section parsing (AGENTS.md convention)
- [ ] V7 Evidence payload redaction hook (strip secrets patterns before persistence)

## WS4 — Objectives & evaluators

- [x] O1 Manual + command evaluators; strict target grammar · `tests/test_objectives.py`
- [x] O2 Command objectives allowlist-only, argv-list enforced (no shell strings) · service + allowlist tests
- [x] O3 Missing binary ⇒ failed objective, never crash · fixed + example-verified
- [ ] O4 **Integration evaluator type** (CI health from V5 collector data)
- [ ] O5 Objective windows/trends: rolling pass-rate history feeding health score (30d window currently stored but unused)

## WS5 — Initiatives

- [x] I1 Evidence-backed proposal enforced (rationale mandatory) · anti-busywork tests
- [x] I2 Dedupe against OPEN initiatives by key; completed keys may repeat · `test_dedupe_open_initiative`, `test_completed_initiative_allows_new_dedupe_match`
- [x] I3 Rejection suppression window (default 14d, configurable) · `test_rejection_suppression_window`
- [x] I4 Per-project open-initiative cap · `test_concurrency_cap`
- [x] I5 Full lifecycle incl. regressed outcome (FR-10/11) · `test_regression_completion` (=scenario 5)
- [x] I6 Approval state machine w/ actor+interface attribution · `test_approval_flow_and_idempotence_guard`
- [ ] I7 **Kanban bridge adapter**: interface + reference impl calling host Kanban API; `bind_board` exists, creation/binding flow + fake-host tests do not
- [ ] I8 Initiative→board linkage surfaced in API/desktop deep-link

## WS6 — Cycles, triggers, scheduling

- [x] C1 Manual cycles always available when active · pause/freeze tests
- [x] C2 Idempotency keys neutralise duplicate webhooks (=scenario 2) · `tests/test_regression_scenarios.py`
- [x] C3 Cross-process mutex w/ TTL lease reclaim · `tests/test_cycles.py`
- [x] C4 Budget caps: max cycles/day + max initiatives/cycle · implemented+tested
- [x] C5 Pause honoured at entry AND re-checked per proposal mid-cycle (=scenario 6) · fixed+tested
- [x] C6 Health hysteresis suppresses notification noise · `test_health_hysteresis_suppresses_noise`
- [ ] C7 **Webhook receiver** (HTTP endpoint): GitHub HMAC-SHA256 signature validation, event→trigger mapping, targeted-cycle hints
- [ ] C8 **Cron adapter helper**: `stewardctl run --trigger cron` + lockfile-safe invocation pattern documented/shipped
- [ ] C9 Post-delivery observation scheduling (internal trigger after initiative completion → outcome check cycle)
- [ ] C10 Cycle cost accounting (tokens/duration per phase) persisted + reported

## WS7 — Events & notifications

- [x] E1 Audit log as event record of material actions · done
- [ ] E11 **Domain event bus** (FR-13): in-process pub/sub emitting the §13 event vocabulary (`cycle.started`, `health.changed`, `initiative.*`, `project.critical`)
- [ ] E12 **Notification policy engine**: severity routing, quiet hours, dedupe/aggregation window, per-channel targets — read from notification_policy_json
- [ ] E13 Notification records persisted w/ ack state (avoid alert fatigue metric)
- [ ] E14 Auto-freeze option on project.critical (release policy flag)

## WS8 — Security hardening

- [x] S1 Injection scanner w/ severity rules; high ⇒ contradiction · tested
- [x] S2 Allowlisted argv runner: no shell, timeout, 64KiB caps, FileNotFoundError fail-closed · tested
- [x] S3 Gateway per-sender grants; unknown senders read-only · tested
- [x] S4 Idempotent approvals (redelivery-safe) · scenario-tested
- [ ] S5 RPC auth: bearer-token middleware + localhost binding default (production posture)
- [ ] S6 Rate limiting on RPC/gateway command endpoints
- [ ] S7 Secrets-handling doc: per-project credential scoping conventions (V5 dependency)
- [ ] S8 Threat-model refresh after WS7/E14 lands (auto-freeze blast radius)

## WS9–WS12 — Surfaces (one backend, four clients)

### CLI (WS9)
- [x] L1 stewardctl full lifecycle + --json + exit codes 0/1/2 · `tests/test_cli.py`
- [ ] L2 **CLI UX pass**: ANSI colour tiers, aligned tables, actionable error text, shell completions, `--version`
- [ ] L3 Interactive `stewardctl tui` minimal dashboard loop (arrow-key initiative picker) — matches Sahil preference: interactive pickers, not flat text

### RPC API (WS10)
- [x] R1 FastAPI app factory over Store; mounted contracts documented · api/server.py + verify boot
- [ ] R2 Auth middleware (S5), pagination on list endpoints, consistent error envelope
- [ ] R3 OpenAPI description/examples polish (it IS the integration doc)

### Gateway / messaging (WS11)
- [x] G1 Platform-neutral handler; permission binding; idempotent approvals · tested
- [ ] G4 **Reference Discord adapter** (discord.py optional extra): maps `/project …`, renders notifications w/ stable IDs, button-based approve/reject wired to grants
- [ ] G5 Message template pack (status card, approval card, alert card) — shared shape for any platform

### Desktop panel (WS12)
- [~] K1 Scaffold consuming RPC; zero local state · desktop/stewardship-panel/src/StewardshipPanel.tsx
- [ ] K2 **Full build**: Vite+TS config, design-token stylesheet, health timeline chart, activity feed, approval queue w/ optimistic states, loading/empty/error states, keyboard + ARIA accessibility
- [ ] K3 Design review vs design-taste skill rubric before sign-off

## WS13 — Agent behaviour layer

- [x] B1 Steward SKILL.md: hard rules, cycle procedure, escalation · skill/project-stewardship
- [ ] B2 Skill↔tool alignment test (every tool referenced exists; names pinned in plugin.yaml)

## WS14 — Documentation

- [x] Doc1 README quickstart + positioning + honest status banner
- [x] Doc2 Architecture (incl. Hermes integration seams), threat model, gateway contract, upstream path, layout map, PRD v0.2 gap-resolution map
- [ ] Doc3 Tutorial walkthrough generated FROM the demo scenario (single narrative)
- [ ] Doc4 Screenshots/GIF assets produced by the demo pipeline
- [ ] Doc5 API reference page (from R3)

## WS15 — Test depth (production grade)

- [x] T1 78 tests: unit+integration+six PRD regressions · green
- [ ] T15 **Concurrency stress**: N threads × cycles/approvals/proposals; assert no duplicate initiatives, no lost updates
- [ ] T16 **Property tests**: policy invariant holds for random level/base/denied sets; scanner never marks benign corpus high
- [ ] T17 **API suite**: TestClient covering every route incl. auth-negative paths (after S5)
- [ ] T18 **Gateway matrix**: grant combinations × commands, replay storms
- [ ] T19 Time-travel suite: suppression expiry, budget rollover, retention boundaries, quiet hours
- [ ] T20 Fuzz: malformed argv, oversized payloads, hostile JSON bodies
- [ ] T21 Coverage gate ≥ 90% lines on src/ (CI-enforced)
- [ ] T22 Chaos-lite: kill cycle mid-flight (simulated crash) → mutex TTL recovery proven

## WS16 — UI/UX excellence pass (all forms)

- [ ] U1 CLI output rubric: scan-in-3s rule, verb-first help, no dead ends (design-taste applied to terminal)
- [ ] U2 Desktop visual design: tokens (type scale, spacing, semantic colours incl. colourblind-safe health palette), dark/light
- [ ] U3 Discord cards: hierarchy, risk badges, single-tap approve w/ confirmation state
- [ ] U4 Accessibility: WCAG AA contrast on all surfaces, focus management, reduced-motion
- [ ] U5 Empty/error states written like a product (never raw stack traces to users)
- [ ] U6 Design review checkpoint with Sahil BEFORE build freeze (per standing rule: his sign-off on look-and-feel)

## WS17 — Demo

- [ ] M1 Seeded scenario script: repo lifecycle story (healthy → incident → proposal → approval → regression caught → recovery) with deterministic clock
- [ ] M2 Terminal demo (scripted `stewardctl` session, clean cast output)
- [ ] M3 Interactive HTML demo dashboard (seeded DB snapshot + desktop panel build served statically) for point-and-click walkthrough
- [ ] M4 Discord-side demo via adapter simulator (approval arriving from chat)
- [ ] M5 One-page demo narration script tying visuals to PRD outcomes

## WS18 — Release readiness (gated on final push approval)

- [ ] RL1 All above `[x]`; CHANGELOG finalised; version 0.2.0
- [ ] RL2 Fresh-clone bootstrap verified via `hermes verify --json` ok:true (manifest committed)
- [ ] RL3 Publish workflow file prepared but push ONLY on Sahil's explicit go

---

## Traceability — review findings → resolution

| Finding (2026-08-21 review) | Checklist items |
|---|---|
| Prompt injection one-line deep | V4, S1, threat-model doc |
| Command evals unsandboxed | O2/O3, S2 |
| Contradiction severity nondeterminism | V2/V3 deterministic-only authority |
| Discord permission binding unspecified | G1, S3/S4 |
| Cost measured not enforced | C4 done; C10 accounting |
| No concurrency control | P4, C3, T15/T22 |
| Storage decision open | P3 companion-DB decision |
| OSS layer missing | WS18 + root docs (done) |
| Plugin extensibility unverified | defensive register() + standalone engine |
| Levels 4–5 vague | D5/D6 done, D7 flow open |

## Directives log (this programme)

- 2026-08-21 Option 1 executed: Gate-0/security/packaging folded into v0.1.0-alpha build (7 commits, 78 tests).
- 2026-08-21 KEEP LOCAL. Upgrade to full solution; production-grade depth testing; impeccable UI/UX on ALL surfaces using design skills; demo required; this checklist is the cross-check gate before final push.
