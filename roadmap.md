# Hermes Dockyard roadmap

Status: canonical forward-looking backlog
Updated: 25/08/2026

This file is the single roadmap for work that remains after the current Dockyard build. Historical checklists and discrepancy reports are evidence sources, not active backlogs. A box in an older document is a claim to re-test against current code.

## Authority and state model

Requirements are reconciled in this order:

1. Current code, schema, routes and tests.
2. The latest owner-approved decisions and slices.
3. `docs/dockyard-prd-v0.3.md` as the product direction. Its full programme remains subject to explicit owner sign-off.
4. `docs/IMPLEMENTATION-CHECKLIST.md` and `design/MOCKUP-VS-IMPLEMENTATION.md` as dated historical registers.

Delivery states stay separate:

- Engineered: implemented locally.
- Gated green: required tests and quality gates pass on the exact candidate.
- Reviewed: an independent review passes the exact candidate.
- Published: pushed, packaged or otherwise made externally available.
- Activated: installed and exercised in the live Hermes Desktop runtime.

A local commit is not a deployment. Deployment and push remain separate owner gates.

## Current delivered baseline

The following capabilities exist in current code and are not roadmap items unless a regression reopens them:

- One SQLite-backed canonical state shared by service, RPC, Desktop proxy and gateway adapters.
- Project enable, disable, pause, resume and freeze controls with durable audit records.
- Project dashboard, project workspace, activity, settings and generated report surfaces.
- Work-item creation, hierarchy on creation, status transitions and project-scoped listing.
- Atomic create-and-queue backlog operation with rank shifting, priority reason, creator/assignee separation and optional initiative linkage.
- Backlog re-ranking with mandatory reasons.
- Milestone create, attach and progress backend contracts.
- Saved views persisted as presentation filters. They are not executable workflows.
- Bot registry, workload, groups, structured A2A records, reputation data and read-only session evidence.
- Approval inbox with approve, reject and evidence disclosure.
- Initiative visual loop and project freeze action.
- Onboarding wizard, action toasts, loading, empty and error states.
- Durable domain events, notification records, quiet hours, dedupe, acknowledgement and optional critical auto-freeze.
- GitHub webhook HMAC validation and replay protection.
- Optional bearer authentication, mutating-request rate limiting and consistent API error envelopes.
- Kanban bridge contracts, a local reference adapter and Dockyard-to-stewardship integration seam.
- Discord adapter and reusable message-card templates.
- Responsive light/dark Desktop UI with keyboard navigation, reduced-motion handling and numerically checked contrast.

The current approved slice is only considered delivered after the exact dirty candidate passes the tests and review gates, then receives a local commit.

## Priority 0: close the current candidate

### DY-R0-01 - Verify and commit the approved slice

State: in progress

Outcome:

- The backlog creation and assignment slice, initiative linkage, project enablement controls and truthful Saved views surface land as one verified local commit.

Acceptance:

- Focused backend and Desktop tests pass.
- Full Python suite collects and executes successfully under `.venv/bin/python`.
- Desktop render harness passes every functional, accessibility, contrast and supported-width check.
- `git diff --check` is clean.
- Code, simplification, architecture, security and performance gates have no open blocker.
- The committed tree contains no unexplained test residue.
- Nothing is pushed or deployed as part of this item.

### DY-R0-02 - Documentation and metadata coherence

State: open
Depends on: DY-R0-01

Outcome:

- README, version, changelog, route documentation and test counts describe the same product state.

Current gap:

- `README.md` still advertises the older alpha baseline and historical test count.
- The old implementation checklist and mockup discrepancy matrix contain stale open markers.

Acceptance:

- README status is generated from current evidence rather than copied counts.
- Changelog describes the Dockyard platform slice and its intentional deviations.
- Old trackers are clearly labelled historical and link here.
- No document calls Saved views an executable workflow engine.

### DY-R0-03 - Operational backup and export

State: open
Source: historical P10

Outcome:

- An operator can export a consistent Dockyard database and restore it into an isolated environment.

Acceptance:

- `stewardctl export` or an equivalent supported command produces a versioned manifest plus database snapshot.
- Live SQLite consistency is preserved during export.
- Restore is tested against a disposable database.
- Secrets and machine-specific paths are excluded or explicitly classified.

## Priority 1: complete the product loop

### DY-P1-01 - Full work-item editing and dependency graph

State: partial
Sources: PM-01, PM-02, PM-08, UX-03, UX-04

Current evidence:

- Create and transition routes exist.
- Parent linkage can be set during creation.
- Labels and estimates are stored.
- The Desktop board lists items but does not offer a complete item editor.

Remaining outcome:

- Humans and bots can edit, reassign and close work items from the product UI.
- Parent, blocked-by and related-item relationships are visible and editable.

Acceptance:

- API supports edit, reassignment and relationship mutation with actor/interface attribution.
- Invalid cross-project or cyclic relationships fail closed.
- Item detail UI covers title, type, assignee, labels, estimate, due date, parent and dependencies.
- Tests cover human-to-bot and bot-to-human ownership changes on the same board.

### DY-P1-02 - Milestones and sprint planning in the UI

State: partial
Sources: PM-04, UX-03

Current evidence:

- Backend supports milestone create, attach and progress readback.

Remaining outcome:

- Milestones are listable, editable and manageable without CLI or raw RPC calls.

Acceptance:

- List, rename/update and close/archive contracts exist.
- Committed items and progress roll-up render in project workspace and portfolio dashboard.
- Empty, overdue and completed states are explicit.
- Forecast calculations use stored work state and have deterministic tests.

### DY-P1-03 - Real saved views and portfolio queries

State: partial
Sources: PM-05, PM-06

Current evidence:

- Owner-scoped saved view persistence and board/table/timeline labels exist.
- Current Desktop creator stores layout plus a status filter.

Remaining outcome:

- Saved views become role-aware queries over labels, assignee, milestone, status and project.
- Board, table, timeline and portfolio layouts render real data.

Acceptance:

- Shared access names specific users/groups rather than a single boolean.
- Query schema is validated and versioned.
- Deep links restore the same view and filters.
- Saved views remain presentation-only unless a separate automation feature is explicitly approved.

### DY-P1-04 - End-to-end initiative delivery and observation

State: partial
Sources: PM-07, TE-01, UX-01, G3, historical I8/C9

Current evidence:

- Initiative linkage is stored on queued work and shown in the backlog.
- Promotion and Kanban integration services exist.
- Approval, rejection, completion and board-binding backend contracts exist.

Remaining outcome:

- One product flow carries proposal to prioritisation, approval, Kanban execution, measured outcome and regression handling with no CLI step.

Acceptance:

- Initiative and work-item detail screens deep-link to each other and the bound execution board.
- Approval can promote/bind without duplicate state or orphan records.
- Completion schedules a post-delivery observation cycle with an idempotent internal trigger.
- Outcome evidence updates initiative, work item, project health and bot reputation consistently.
- A single end-to-end test proves proposal -> backlog -> approve -> execute -> observe -> complete/regress.

### DY-P1-05 - Levels 4-5 merge gate and capability audit

State: partial
Sources: historical D7/D8

Current evidence:

- Restriction-only policy logic and merge-gate schema exist.
- Project setting changes are audited by field name.

Remaining outcome:

- High-autonomy execution uses a real merge-request gate with stored evidence and explicit human authority.

Acceptance:

- Merge-gate evaluation is wired into initiative execution.
- Policy violations fail closed and can freeze the project according to policy.
- Level transitions record previous/new level, actor, interface, timestamp and effective capability delta.
- User-initiated lifecycle actions preserve the originating actor/interface instead of collapsing them to `system/service`.
- Replays are idempotent and race-tested.
- Automatic release publishing remains out of scope.

### DY-P1-06 - Verification integrations and evidence hygiene

State: open
Sources: historical V5-V7, O4-O5

Outcome:

- CI/release status can become deterministic evidence through a backend-neutral adapter.

Acceptance:

- Integration collector interface has a fake and at least one reference provider implementation.
- Credential source is recorded without persisting the credential.
- Evidence payloads pass a redaction hook before storage.
- Declared-file policy supports globs and required-section parsing.
- Integration evaluator consumes collector output rather than provider-specific state.
- Objective windows and pass-rate trends feed health scoring with time-travel tests.

### DY-P1-07 - Cost and phase accounting

State: partial
Source: historical C10

Current evidence:

- Schema fields for cycle duration, token estimate and per-phase timing exist.

Remaining outcome:

- The cycle engine records and reports actual phase timing and bounded cost estimates.

Acceptance:

- Every completed or failed cycle closes its phase timing records.
- Partial/crashed cycles remain distinguishable from zero-cost cycles.
- Dashboard/report surfaces show totals and budget context.
- No fabricated token precision is presented when a provider does not expose usage.

## Priority 2: fleet coordination and platform hardening

### DY-P2-01 - Live bot-group coordination

State: partial
Sources: BM-02 to BM-06, G2

Current evidence:

- Bot groups, members, A2A messages, workload and reputation contracts exist.
- Desktop renders roster, workload and handoff feeds.
- A Discord adapter and card templates exist.

Remaining outcome:

- A human can create/edit a group, assign work to it and send a structured handoff that reaches its real channel.

Acceptance:

- Group update/delete and group-assignment contracts exist.
- Desktop provides group management and handoff composition.
- Host adapter posts to the configured channel and records stable platform message IDs.
- Lead routing preserves full item and evidence links.
- Two-bot handoff is proven end to end with an auditable trail.
- Reputation remains advisory and never silently auto-routes work.

### DY-P2-02 - Scheduler adapter and trigger operations

State: partial
Sources: historical C8 and the PRD scheduling seam

Current evidence:

- Cycle engine accepts cron trigger type and idempotency keys.
- Webhook receiver is implemented.

Remaining outcome:

- A supported host scheduler can invoke one bounded cycle safely.

Acceptance:

- CLI/API exposes explicit trigger type for cron use.
- Lock-safe invocation and idempotency guidance are documented.
- Scheduler failures produce operator-visible evidence without duplicate cycles.
- No scheduler is activated without a separate owner-approved deployment gate.

### DY-P2-03 - API contract hardening

State: partial
Sources: historical R2/R3 and architecture review pattern 6

Current evidence:

- Auth, rate limiting and uniform error envelopes exist.

Remaining outcome:

- Public request schemas and list contracts are predictable for external adapters.

Acceptance:

- Request models reject unexpected fields.
- List routes use bounded pagination with stable ordering.
- OpenAPI descriptions and examples cover auth, errors and actor attribution.
- Backend error messages do not expose SQL, paths or internal exception classes.

### DY-P2-04 - Security documentation refresh

State: open
Sources: historical S7/S8

Outcome:

- Threat model matches webhook, notification, auto-freeze, credential and Desktop surfaces now present in code.

Acceptance:

- Per-project credential-scoping conventions are documented.
- Auto-freeze blast radius, recovery authority and notification failure modes are modelled.
- Desktop session-evidence privacy boundaries and gateway channel trust are explicit.
- Security claims are tied to tests or clearly labelled assumptions.

### DY-P2-05 - Quality gate automation

State: partial
Sources: historical B2, T17-T22, G5

Current evidence:

- API, race, injection, property-style, time-travel, fuzz and chaos-lite tests exist.
- Desktop harness checks behaviour, layouts, accessibility and contrast.

Remaining outcome:

- Repository automation proves these checks from a fresh clone and prevents silent test omission.

Acceptance:

- Skill-to-tool alignment is validated against `plugin.yaml`.
- Coverage threshold is measured and CI-enforced against `src/`.
- Fresh-clone bootstrap runs collection, full tests and Desktop harness in the canonical runtime.
- Test artefacts do not dirty the candidate.
- Optional integration lanes are separately reported rather than silently skipped.

## Priority 3: documentation, demo and release

### DY-P3-01 - Owner walkthrough and product documentation

State: partial
Sources: historical Doc3-Doc5 and G4

Outcome:

- A new owner can understand and exercise the full product loop without interpreting source code.

Acceptance:

- Tutorial follows one seeded project from onboarding through observed outcome.
- API reference is generated from the hardened OpenAPI contract.
- Screenshots show real light/dark product states, not prototype-only data.
- Documentation names every unbuilt or activation-only capability honestly.

### DY-P3-02 - Repeatable product demo

State: partial
Sources: historical M1-M5

Current evidence:

- A seeded demo runner exists and the Desktop render harness creates deterministic states.

Remaining outcome:

- One repeatable demo proves the buyer/user story across Desktop and bot coordination.

Acceptance:

- Deterministic scenario covers healthy -> incident -> proposal -> approval -> execution -> regression caught -> recovery.
- Desktop walkthrough and Discord adapter simulator use the same database state.
- Narration maps each screen to a product outcome.
- Generated media is reproducible from committed scripts.

### DY-P3-03 - Release candidate and activation

State: gated
Sources: historical RL1-RL3
Depends on: owner-selected scope from priorities 0-3

Outcome:

- A versioned candidate can be reviewed, published and activated without conflating those stages.

Acceptance:

- Changelog and version are final for the selected release scope.
- Fresh-clone verification passes.
- Exact source/plugin byte identity is recorded before activation.
- Publish workflow exists but does not run without explicit approval.
- Deployment, service restart, live plugin reload and push each receive their own owner gate.
- Live QA checks the actual Desktop host after activation.

## Reconciliation of historical trackers

### Delivered since `docs/IMPLEMENTATION-CHECKLIST.md`

The following old open markers have current code/tests and should not be copied into a new backlog: schema v2 tables, Kanban bridge, webhook receiver, domain event bus, notification engine and acknowledgement records, critical auto-freeze, bearer auth, rate limiting, API error envelope, Discord adapter/templates, Desktop product surface, advanced race/property/time-travel/fuzz/chaos tests, design tokens, accessibility states, demo seed runner and CLI colour/table/version work.

### Still represented here

- D7/D8 -> DY-P1-05.
- P10 -> DY-R0-03.
- V5-V7/O4-O5 -> DY-P1-06.
- C8 -> DY-P2-02.
- C9/I8 -> DY-P1-04.
- C10 -> DY-P1-07.
- R2/R3 -> DY-P2-03.
- S7/S8 -> DY-P2-04.
- B2/T21/fresh-clone proof -> DY-P2-05.
- Documentation/demo/release items -> DY-P3-01 to DY-P3-03.

### Retired or superseded

- A separate end-user TUI is retired. PRD UX-01 requires the product UI; CLI remains internal plumbing.
- The old standalone `desktop/stewardship-panel` scaffold is superseded by the active Hermes Desktop plugin surface.
- An executable Workflow engine is not part of the delivered Saved views feature. Saved views are static presentation queries. Any future automation engine requires a separate approved product requirement, threat model and execution policy.
- Notifications remain a primary tab rather than an appbar popover.
- Theme follows the host OS rather than using an in-panel toggle.
- The Dockyard command-palette entry remains an intentional Desktop integration.

## Explicitly out of scope

Carried from PRD v0.3 unless the owner changes scope:

- Standards-based external A2A protocols beyond the local fleet.
- Automatic release publishing and autonomous merge authority.
- Multi-machine distributed replication.
- Mobile clients.

## Sequencing recommendation

1. Close DY-R0-01 now.
2. Correct documentation coherence in DY-R0-02.
3. Build DY-P1-04 next because it closes the core product promise.
4. Build DY-P1-01 and DY-P1-02 to complete daily PM use.
5. Add fleet coordination and remaining trust/verification depth.
6. Run the demo and fresh-clone release gates.
7. Ask separately for publish and activation approval.
