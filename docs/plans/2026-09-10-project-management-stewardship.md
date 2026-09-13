# Project Stewardship Management — Revised Implementation Plan

> **Execution status:** Phases 0–4 complete. Phase 5 corrected candidate is ready for re-review on checkpoint `13370ce9b9bc85582b8ae13245eaa3ac0341e707`; PM-0501..PM-0509 are implemented, independent-review findings are repaired, and final evidence is in `docs/plans/evidence/project-management-phase5.md`. Phase 5 remains uncommitted.
>
> **Parent WIP branch:** `feat/trustworthy-daily-stewardship-20260908`
>
> **Historical baseline:** `59cd75ca0eb78d20a41682c1d9f0284e04fe4696`
>
> **Implementation branch:** `feat/project-management-stewardship`
>
> **Review outcome incorporated:** `REVISE` — cross-database consistency, authority, pagination, concurrency and scope corrections accepted.

**Goal:** Deliver credible project onboarding, team ownership and project-management controls in Hermes Desktop without duplicating canonical Hermes Projects, Profiles or Kanban state.

**Release shape:** Desktop is the complete management surface. The backend is authoritative. Dashboard support must reuse the same contracts and may be a documented subset. CLI is for essential administration and recovery. TUI and messaging receive discovery/deep links only where vanilla Hermes supports them.

---

## 1. Locked decisions

### 1.1 Branch and merge strategy

```text
feat/trustworthy-daily-stewardship-20260908
                  │
                  └── feat/project-management-stewardship
                               │
                               └── independently verified PR back into current WIP
```

- Preserve `59cd75...` as the historical baseline.
- Allow independently verified fixes to continue landing on the parent WIP branch.
- Synchronise parent → child only at named checkpoints; prefer merge commits while the child has other consumers.
- Final QA compares the candidate against the actual PR merge base, not permanently against `59cd75...`.
- If the parent reaches `main` first, retarget the child PR and choose merge/rebase according to publication state.
- Never cherry-pick individual files from the child into the parent.
- Merge approval and deployment approval remain separate.

### 1.2 Sources of truth

- Hermes Projects owns project identity, repository path and board binding.
- Hermes Kanban owns canonical tasks, epics, status, claims and assignments.
- Hermes Profiles owns profile existence and profile creation.
- Stewardship owns project membership, project roles, mission, goals, objectives, milestones, workflow governance, supporting content and audit history.
- Hermes profile identity in v1 is the exact profile slug inside one `HERMES_HOME`.
- Stewardship bot records and groups may enrich display data; they cannot establish that a Hermes profile exists.
- One plugin process binds to one active `HERMES_HOME`. Switching homes requires a new process or a supported host restart.

### 1.3 Lifecycle and destructive scope

Included:

- Pause, freeze and disable/re-enable.
- Project archive/restore.
- Goal, objective, milestone, workflow and managed-content archive/restore.
- Permanent removal of a Stewardship-managed file only when authority, dependencies and safe deletion are proven.

Deferred from this release:

- Permanent project metadata purge.
- Permanent milestone deletion.
- Permanent workflow-definition deletion.
- Workflow cloning.
- Rich graphical workflow authoring.
- Repository or arbitrary filesystem deletion.

### 1.4 Cross-database consistency

Stewardship and canonical Hermes Kanban do not share one database transaction. Therefore the release must use one of these verified models:

1. A canonical Hermes batch-assignment operation owning one Kanban transaction; or
2. A durable, idempotent, resumable Stewardship operation saga.

The product must never claim cross-database atomicity. A member remains `departure_pending` until canonical assignments are verified and the membership transition completes. Partial operations remain visible and resumable.

### 1.5 Authority

Actor attribution is not authorisation. Membership changes, lead transfer, bulk reassignment and archive/removal require a verified principal and explicit capability. Request-supplied actor strings and `DOCKYARD_ACTOR_ID` are not sufficient authority.

---

## 2. Release acceptance boundaries

The release is blocked if any of these remain true:

- Work enumeration can silently stop at 100 tasks or epics.
- Removing a member can hide, orphan or partially transfer work without a resumable operation record.
- Claimed/running work can be reassigned without an explicit safe handoff contract.
- A stale consequence preview can still execute.
- A caller can perform ownership or archive mutations using only a payload actor string.
- Desktop can turn a missing proxy/backend route into a false empty state.
- Stewardship treats its bot registry or member table as the source of Hermes profile existence.
- Existing `dockyard.db` state cannot upgrade and recover from a verified snapshot.
- Vanilla Hermes integration is tested only with fake adapters.
- Critical UI journeys lack real installed-plugin visual evidence.

---

# Phase 0 — Baseline, defect repair and feasibility

**Authority:** Read-only discovery plus the narrowly scoped milestone route regression/repair. No team-management schema or product implementation yet.

**Primary files:**

- `.github/workflows/ci.yml`
- `src/hermes_project_stewardship/kanban/host_adapter.py`
- `src/hermes_project_stewardship/kanban/vanilla_host.py`
- `src/hermes_project_stewardship/api/server.py`
- `src/hermes_project_stewardship/persistence/store.py`
- `hermes_dockyard_plugin/dashboard/plugin_api.py`
- `hermes_dockyard_plugin/dashboard/src/api.ts`
- `hermes_dockyard_plugin/dashboard/src/app.ts`
- `hermes_dockyard_plugin/desktop/plugin.js`
- `docs/dockyard-prd-v0.3.md`
- `README.md`
- `roadmap.md`

**Required evidence:**

- `docs/plans/evidence/project-management-phase0.md`
- `docs/plans/evidence/project-management-route-matrix.json`

- [x] **PM-0001** Record the historical parent/child baseline as `59cd75ca0eb78d20a41682c1d9f0284e04fe4696`.
- [x] **PM-0002** Verify/create `feat/project-management-stewardship` at that baseline.
- [x] **PM-0003** Capture current parent HEAD, child HEAD, merge base, ahead/behind and working-tree status without changing branches.
- [x] **PM-0004** Run the complete Python coverage gate on a clean baseline checkout using the command from `.github/workflows/ci.yml`.
- [x] **PM-0005** Run Ruff, ty, pip-audit and compileall using the exact CI commands.
- [x] **PM-0006** Run dashboard TypeScript, test, build and dependency-audit gates.
- [x] **PM-0007** Run the Desktop harness with `node --experimental-vm-modules --test repro-live.test.mjs`.
- [x] **PM-0008** Generate a mechanical frontend-call → plugin-proxy → canonical-backend method/path matrix.
- [x] **PM-0009** Add a failing real milestone frontend/proxy/backend regression proving the current false-empty behaviour.
- [x] **PM-0010** Apply the minimal missing milestone proxy routes and remove the false-empty substitution; rerun the focused and full frontend gates.
- [x] **PM-0011** Spike complete pagination, canonical batch assignment, assignment preconditions and claimed-task handoff against minimum/latest supported vanilla Hermes.
- [x] **PM-0012** Trace the Desktop/dashboard trusted principal from host → plugin proxy → backend; identify required capabilities and fail-closed states.
- [x] **PM-0013** Classify every imported Hermes symbol as public, private or compatibility-shim usage using source and official Hermes documentation.
- [x] **PM-0014** Verify profile creation/deep-link support, plugin-data retention and one-`HERMES_HOME`-per-process behaviour in isolated homes.
- [x] **PM-0015** Reconcile the old native-WorkItem PRD language with current canonical Hermes Kanban ownership; mark legacy tables as migration/metadata-only where accurate.
- [x] **PM-0016** Record the selected transfer consistency model, blockers, exact host capabilities and decision rationale in the Phase 0 evidence pack.

**Phase 0 gate:**

Proceed only when the milestone integrity defect is repaired and no authority, pagination, profile-identity, host-support or transfer-consistency question remains unresolved. If vanilla Hermes lacks batch assignment, Phase 1 must specify the durable saga. If it lacks safe claimed-task handoff, claimed/running items must be non-transferable in this release.

---

# Phase 1 — Domain, migration, authority and consistency contracts

**Purpose:** Establish one writable representation for membership and one recoverable operation model before API or UI implementation.

**Primary files:**

- `src/hermes_project_stewardship/domain/models.py`
- `src/hermes_project_stewardship/persistence/migrations.py`
- `src/hermes_project_stewardship/persistence/store.py`
- `src/hermes_project_stewardship/persistence/service.py`
- `src/hermes_project_stewardship/persistence/dockyard_service.py`
- New focused membership, migration, authority and operation-journal tests

- [x] **PM-0101** Define `ProjectMember` with project ID, Hermes profile slug, project role, state, joined time and left time.
- [x] **PM-0102** Make the normalised membership model the sole writable representation; expose old lead/member fields only as compatibility projections.
- [x] **PM-0103** Enforce exactly one active lead through one database-backed authoritative representation.
- [x] **PM-0104** Define membership states: `active`, `departure_pending`, `departed` and `unavailable` display status.
- [x] **PM-0105** Define profile-slug/default-profile identity and explicit relink behaviour after rename or disappearance.
- [x] **PM-0106** Define a minimal Goal entity: stable ID, project ID, title, description, order and archive timestamps; objective link remains nullable.
- [x] **PM-0107** Define explicit lifecycle transitions and side effects for active, paused, frozen, disabled and archived projects.
- [x] **PM-0108** Define work-transfer eligibility for backlog/triage, ready, blocked, review, claimed/running, workflow-gate tasks and epics.
- [x] **PM-0109** Define preview fingerprints over project/board, membership revision, member/replacement, exact task set and available task revisions.
- [x] **PM-0110** Define the durable operation/saga states, idempotency key, retry rules, compensation limits and reconciliation outcome.
- [x] **PM-0111** Define capabilities for membership administration, lead transfer, bulk reassignment, project archive and managed-file removal.
- [x] **PM-0112** Implement forward migration, newer-schema fail-closed behaviour, pre-upgrade snapshot and snapshot-restoration tests; no in-place production downgrade.
- [x] **PM-0113** Prove existing mission, owner, member, objective, milestone, workflow, evidence and audit state survives migration.
- [x] **PM-0114** Add invariant/race tests for one lead, duplicate membership, interrupted migration and partial operation recovery.

**Phase 1 gate:**

The schema and service contracts must make split-brain state visible and recoverable. No API may write both legacy and normalised ownership representations independently.

**Phase 1 implementation correction:** `afe3255a4d674994266e3d332f403a3e4613db11` (dedicated seven-file correction on top of `83405ce`; clean-head verification recorded in `docs/plans/evidence/project-management-phase1.md`).

---

# Phase 2 — UX contract and prototype approval

**Purpose:** Validate the difficult journeys before finalising mutation APIs.

**Primary files/artifacts:**

- Existing Desktop token/style sources
- `design/` prototype and journey artifacts
- `docs/plans/evidence/project-management-ux-contract.md`

- [x] **PM-0201** Audit existing Desktop components/tokens and define one shared profile/actor picker.
- [x] **PM-0202** Prototype onboarding as Project → Purpose → Team and policy → Review/preflight; first assessment is a separate post-onboarding action.
- [x] **PM-0203** Prototype add-member, lead-transfer and remove-member-with-no-work journeys.
- [x] **PM-0204** Prototype member exit with work preview, target selection and exact affected-item list.
- [x] **PM-0205** Prototype stale-preview conflict, incomplete pagination, claimed-task refusal and partial-transfer recovery.
- [x] **PM-0206** Prototype minimal goals/objectives, milestone archive/restore and project archive/restore.
- [x] **PM-0207** Define loading, empty, unavailable-profile, offline, validation, conflict, recovery and permission-denied states.
- [x] **PM-0208** Validate keyboard order, focus restoration, screen-reader language, reduced motion, narrow widths and destructive-action separation; obtain Sahil’s visual/interaction approval.

**Phase 2 approval evidence (2026-09-11 BST):**

- Standalone prototype: `design/project-ux/prototype/`; deterministic synthetic state only.
- Browser gate: 37 Playwright tests passed across the required viewport/theme, interaction, keyboard, focus, recovery, motion, overflow and contrast checks.
- Visual evidence: nine rendered PNGs in `design/project-ux/captures/`; final repaired captures have no Critical or High visual findings.
- Sahil reviewed the live app at `http://127.0.0.1:5174/` and explicitly signed off: “it looks awesome im happy to sign it off.”
- Full contract and evidence: `docs/plans/evidence/project-management-ux-contract.md`.

**Phase 2 gate:**

No production Team or transfer UI begins until Sahil approves the interaction model and every failure/recovery state is implementable against the Phase 1 contracts.

---

# Phase 3 — Onboarding vertical slice

**Purpose:** Deliver initial team assembly end to end through the real plugin path.

**Primary files:**

- `src/hermes_project_stewardship/api/server.py`
- `src/hermes_project_stewardship/kanban/host_adapter.py`
- `src/hermes_project_stewardship/kanban/vanilla_host.py`
- `hermes_dockyard_plugin/dashboard/plugin_api.py`
- `hermes_dockyard_plugin/desktop/plugin.js`
- Dashboard source only where it is an explicitly supported surface
- Onboarding and vanilla-host tests

- [x] **PM-0301** Extend discovery with truthful profile availability and host capability fields without inventing native capability data. Evidence: `docs/plans/evidence/project-management-phase3.md`.
- [x] **PM-0302** Add validated lead selection and searchable member multi-selection from the active Hermes home. Evidence: `docs/plans/evidence/project-management-phase3.md`.
- [x] **PM-0303** Include the exact team and membership revision in preflight validity. Evidence: `docs/plans/evidence/project-management-phase3.md`.
- [x] **PM-0304** Reject duplicate/unavailable new members and preserve explicit handling for historical unavailable references. Discovery now represents persisted unavailable references as non-selectable historical entries scoped to their existing projects; preflight preserves unchanged historical members but rejects the same profile for a new project. Evidence: `docs/plans/evidence/project-management-phase3.md`.
- [x] **PM-0305** Add native profile-manager navigation only if Phase 0 proves a supported host contract; otherwise show external-creation guidance and refresh discovery. Evidence: `docs/plans/evidence/project-management-phase3.md`.
- [x] **PM-0306** Preserve wizard input while refreshing discovery or recovering from host failure. Evidence: `docs/plans/evidence/project-management-phase3.md`.
- [x] **PM-0307** Provision/connect the canonical project and board before Stewardship metadata using existing idempotent recovery. Evidence: `docs/plans/evidence/project-management-phase3.md`.
- [x] **PM-0308** Verify complete team state through backend readback and run real create-new/connect-existing/partial-retry tests against isolated vanilla Hermes homes. The final parent-controller run passed all seven isolated-host scenarios, including incomplete-receipt recovery and competing-membership rejection. Evidence: `docs/plans/evidence/project-management-phase3.md`.

**Phase 3 gate:**

A user can connect or create a project, select a real Hermes lead/team, review exact effects and complete onboarding without stale preflight or a duplicate source of profile truth.

---

# Phase 4 — Team management and work transfer vertical slice

**Purpose:** Replace the view-only Bot Teams experience with safe operational project membership.

**Primary files:**

- Membership/service/API modules from Phases 1 and 3
- `src/hermes_project_stewardship/persistence/canonical_work_service.py`
- `hermes_dockyard_plugin/dashboard/plugin_api.py`
- `hermes_dockyard_plugin/desktop/plugin.js`
- Work-management, race and real-host integration tests

- [x] **PM-0401** Add project-team list with lead, role, Hermes availability and complete paginated workload counts. Evidence: `docs/plans/evidence/project-management-phase4.md`.
- [x] **PM-0402** Add existing Hermes profile as a project member under verified membership-admin authority. Evidence: `docs/plans/evidence/project-management-phase4.md`.
- [x] **PM-0403** Transfer leadership while preserving one active lead and recording the verified principal. Evidence: `docs/plans/evidence/project-management-phase4.md`.
- [x] **PM-0404** Replace free-text member/lead/assignee controls with the shared discovered-profile picker. Evidence: shared search/keyboard/unavailable contract and unchanged assignment payload in the Desktop harness.
- [x] **PM-0405** Produce a complete consequence preview with exact items, eligibility, claimed/running exclusions and preview fingerprint. Evidence: `docs/plans/evidence/project-management-phase4.md`.
- [x] **PM-0406** Reject stale/incomplete previews with 409 and require a fresh preview. Evidence: `docs/plans/evidence/project-management-phase4.md`.
- [x] **PM-0407** Execute selected or all eligible assignments through canonical batch assignment or the approved durable saga. Evidence: `docs/plans/evidence/project-management-phase4.md`.
- [x] **PM-0408** Keep membership at `departure_pending` until canonical readback proves every eligible assignment outcome. Evidence: `docs/plans/evidence/project-management-phase4.md`.
- [x] **PM-0409** Surface durable progress, partial failure, retry and operator-recovery state; never show false success. Evidence: `docs/plans/evidence/project-management-phase4.md`.
- [x] **PM-0410** Prevent claimed/running transfer unless a supported handoff operation was proven; reject epic assignment under current host rules. Evidence: `docs/plans/evidence/project-management-phase4.md`.
- [x] **PM-0411** Add bulk selection/reassignment to the canonical work view and verify actor, operation and per-item audit history. Evidence: Desktop Backlog subset journey plus authenticated API/durable readback in `docs/plans/evidence/project-management-phase4.md`.
- [x] **PM-0412** Run >100-task pagination, concurrent task creation, simultaneous lead/member changes, host failure and crash-recovery tests. Evidence: deterministic execute-time barrier on the isolated vanilla host proves a 106th task cannot be hidden by pagination and stale execution writes nothing.

**Phase 4 gate:**

No member can become departed while eligible work is silently retained, hidden or partially transferred without a visible resumable operation. Canonical Kanban readback is required before success.

---

# Phase 5 — Goals, planning, workflows, content and project archive

**Purpose:** Complete the management hierarchy without introducing low-value permanent deletion.

- [x] **PM-0501** Add minimal Goal create/edit/order/archive/restore and nullable objective linking.
- [x] **PM-0502** Preserve existing unlinked objectives and existing objective create/edit/archive/remove behaviour.
- [x] **PM-0503** Add milestone create/edit/rename/close/reopen/archive/restore and scope attach/detach using working proxy routes.
- [x] **PM-0504** Preserve milestone/work attribution and treat removal as archive in this release.
- [x] **PM-0505** Expose existing workflow definitions, explicit new versions, archive/restore, explicit-version start and run history.
- [x] **PM-0506** Keep Saved Views visibly and technically separate from executable Workflow definitions.
- [x] **PM-0507** Add managed-content archive/restore and dependency-aware removal under verified authority.
- [x] **PM-0508** Implement safe managed-file removal with raw-path symlink checks, managed-root containment and fail-closed file identity verification; never accept arbitrary paths.
- [x] **PM-0509** Add project archive/restore with the Phase 1 lifecycle side effects; explicitly state canonical project, board, tasks and repository remain untouched.

**Phase 5 gate:**

Mission, goals, objectives, milestones, workflows and managed content are navigable and lifecycle-safe. Archive/restore preserves history. No permanent project/workflow/milestone purge exists.

---

# Phase 6 — Surface, security and vanilla compatibility hardening

**Purpose:** Ensure every advertised surface is truthful without rebuilding the product five times.

- [ ] **PM-0601** Keep Desktop as the complete management surface and document the exact dashboard subset or shared build.
- [ ] **PM-0602** Provide essential CLI list/recovery operations for members, pending transfers and project archive; require explicit confirmation for managed-file removal.
- [ ] **PM-0603** Limit TUI/messaging to supported discovery, approval and exact deep links; no destructive mutations by default.
- [ ] **PM-0604** Enforce verified-principal capability checks and fail closed when host identity/capability is unavailable; test browser origin/CSRF assumptions where applicable.
- [ ] **PM-0605** Run the route-parity contract in every UI vertical slice and fail on missing method/path/schema or false-empty substitutions.
- [ ] **PM-0606** Verify minimum/latest vanilla Hermes, default-only/multiple profiles, stale profile, clean install, upgrade, disable, uninstall/reinstall and separate-process home isolation.
- [ ] **PM-0607** Ensure every Hermes import exists on supported vanilla revisions or is isolated behind a tested compatibility adapter.

**Phase 6 gate:**

Every advertised operation works through the same backend contract. Unsupported surfaces say so explicitly. Kensei-specific modules, fake identities and hidden route failures cannot satisfy the gate.

---

# Phase 7 — Final regression, accessibility and visual proof

**Purpose:** Produce fresh evidence against the exact candidate, not fixture-only confidence.

**Canonical gate commands begin with:**

```bash
uv sync --locked --extra dev --extra plugin
uv run --locked --extra dev --extra plugin pytest --cov=hermes_project_stewardship --cov-report=term --cov-fail-under=87
uv run --locked --extra dev --extra plugin ruff check src
uv run --locked --extra dev --extra plugin ty check \
  src/hermes_project_stewardship/security/allowlist.py \
  src/hermes_project_stewardship/api/middleware.py \
  src/hermes_project_stewardship/plugin.py \
  src/hermes_project_stewardship/persistence/store.py
uv run --locked --extra dev --extra plugin pip-audit
uv run --locked --extra dev --extra plugin python -m compileall src tests

cd hermes_dockyard_plugin/dashboard
npm ci
npx tsc --noEmit
npm test
npm run build
npm audit --omit=dev

cd ../desktop
DOCKYARD_CAPTURE_SCREENSHOTS=0 node --experimental-vm-modules --test repro-live.test.mjs
```

- [ ] **PM-0701** Run full unit, migration, API, transaction, race, security, audit and recovery suites with direct exit propagation.
- [ ] **PM-0702** Run real frontend build → plugin router → backend ASGI tests and label fixture, proxy, vanilla-host and installed-Desktop evidence separately.
- [ ] **PM-0703** Prove member exit over multiple pages, stale preview rejection, claimed-task refusal and partial-operation crash recovery.
- [ ] **PM-0704** Prove project/profile/board isolation across separate synthetic Hermes homes and verify no canonical data loss after disable/archive/uninstall.
- [ ] **PM-0705** Run pairwise visual regression across light/dark, 1440/768/390 widths, 200% zoom, long names, empty, large-data, offline and destructive states.
- [ ] **PM-0706** Run complete visual combinations for onboarding, member exit, lead transfer and project archive/restore.
- [ ] **PM-0707** Run keyboard-only, focus trap/return, screen-reader labels/live feedback, contrast, non-colour status, touch-target and reduced-motion checks.
- [ ] **PM-0708** Review every visual diff manually; zero unexplained visual regressions and zero unresolved critical/high defects.
- [ ] **PM-0709** Record real installed-plugin videos for onboarding → team change, interrupted transfer recovery and project archive/restore.
- [ ] **PM-0710** Bind test logs, approved screenshots and recordings to the exact candidate commit and produce one release-evidence packet.

**Phase 7 gate:**

All canonical commands pass, zero critical/high defects remain, all visual differences are explained/approved and the real installed-plugin videos prove the critical journeys.

---

# Phase 8 — Parent reconciliation, independent QA and merge

**Purpose:** Reconcile concurrent WIP fixes and prove the actual merge candidate.

- [ ] **PM-0801** Freeze and record the current parent WIP SHA and actual PR merge base.
- [ ] **PM-0802** Merge the verified current parent into the child at a named sync point; preserve explicit conflict-resolution evidence.
- [ ] **PM-0803** Run the parent baseline suite at the frozen parent commit and the complete candidate suite after reconciliation.
- [ ] **PM-0804** Attribute every changed result against the final merge base while retaining `59cd75...` as historical evidence.
- [ ] **PM-0805** Obtain independent code, architecture, data-integrity, security and UX review against the exact candidate SHA.
- [ ] **PM-0806** Update README, current PRD/roadmap, migration, recovery, lifecycle and surface-support documentation to one canonical ownership model.
- [ ] **PM-0807** Open the child → current WIP PR only after all gates pass; if WIP reached `main`, retarget safely and rerun required gates.
- [ ] **PM-0808** Require Sahil’s explicit merge approval; keep installation, activation and deployment unapproved until separate soak/pilot evidence.

**Phase 8 gate:**

The exact PR candidate—not an earlier local tree—has green evidence, independent approval and no unresolved critical/high issue. Merge approval does not authorise deployment.

---

## 3. Definition of done

The release is complete when the Phase 8 gate passes and the evidence proves:

- Existing/new Hermes projects onboard without recreation or state loss.
- A real Hermes lead and team can be selected during onboarding.
- Team membership and lead changes use verified authority.
- Single and bulk work changes use complete canonical enumeration.
- Stale previews, claimed work and partial cross-database operations fail honestly.
- A departing member cannot silently orphan work.
- Mission, minimal goals, objectives and milestones are manageable.
- Saved Views and executable Workflows cannot be confused.
- Managed content and projects support archive/restore without touching repository or canonical Hermes state.
- Desktop is the complete product surface; every other surface is truthful about its supported subset.
- Existing `dockyard.db` state upgrades and restores without loss.
- Minimum/latest vanilla Hermes integration has real-host evidence.
- Accessibility, visual regressions and real installed-plugin journeys pass.
- Parent baseline and management delta remain independently attributable.

## 4. Explicitly deferred backlog

These are not hidden follow-ups and do not block this release:

- Permanent project metadata purge.
- Permanent milestone/workflow definition deletion.
- Workflow cloning.
- Rich graphical workflow builder.
- Complete duplicate dashboard management if Desktop remains primary.
- TUI project-management controls.
- Messaging mutation controls.
- Native profile creation when vanilla Hermes provides no supported host capability.
- Full Cartesian visual testing across every state/theme/width combination.

## 5. Tracking and evidence rules

- This document is the requirements authority.
- Stable `PM-*` items are the only plan-level tracking units.
- Code-level tasks are decomposed after the governing phase gate, not pre-invented here.
- Check an item only when its focused evidence exists.
- A phase gate passes only after focused tests, relevant full regression and all discovered critical/high defects are remediated.
- Fixture-only UI success cannot satisfy a real proxy/host/integration item.
- A successful write must be read back from the authoritative target.
- Every verdict applies to an exact commit SHA.
- No commit, push, PR, merge, install or deployment is implied by this plan; each occurs only under its named gate and authority.

## 6. Executor starting instruction

Begin with Phase 0 only.

1. Verify current branch/topology and preserve the uncommitted plan.
2. Create clean detached baseline/candidate worktrees for evidence runs; do not reset, stash or clean the working branch.
3. Produce the two required Phase 0 evidence artifacts.
4. Write the milestone failing regression before the route repair.
5. Make only the minimal milestone repair permitted by Phase 0.
6. Complete the host, authority, pagination, claimed-task and plugin-lifecycle spikes.
7. Stop at the Phase 0 gate and return a decision packet. Do not begin Phase 1 automatically if any contract remains unresolved.
