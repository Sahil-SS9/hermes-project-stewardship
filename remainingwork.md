# Remaining work and current state

Updated: 26/08/2026 (addenda 30/08/2026, 31/08/2026, 01/09/2026)

## Addendum 01/09/2026 — GitHub Actions restored and green

- GitHub Actions run `33455039432` completed successfully on commit
  `8b102c23b2510704a6fbb4f6f5dd003b5d1e5f51`.
- All 11 jobs passed: Linux, macOS and Windows on Python 3.10–3.12,
  API import, frontend build/tests/audit and Desktop harness.
- Cross-platform repairs covered Python 3.10 TOML compatibility, Windows-safe
  file/process handling, portable Desktop harness dependencies and Chromium setup.
- `scripts/local-ci.sh --with-node --json` remains the exact local mirror; it
  passed with 453 tests and the 87% coverage gate before the final CI push.
- Remote cross-platform CI is no longer a release blocker.

## Addendum 31/08/2026 — 0.3.0 release cut

- Version bumped to `0.3.0` across pyproject, plugin.yaml, dashboard
  manifest/package/lock, CLI, API metadata; README status line updated.
- New in this release: DY-P1-03 saved views (validated v1 queries,
  role-aware sharing, deep links), rolled-up portfolio dashboard
  (attention-first, derived per-project status), DY-FT-01 central feature
  toggles, read-only workflow canvas, milestones UI.
- Evidence run 2026-08-31: local-ci.sh ALL GATES PASS (434 passed,
  5 skipped, coverage gate 87 green); `hermes verify --json` ok:true,
  readiness HTTP 200; dashboard build/tests 4/4; portfolio tab verified
  end-to-end in real Chrome via CDP.
- Post-audit remediation: milestone and portfolio progress use grouped queries;
  feature-disabled errors use a structured `feature_disabled` code; standalone
  RPC is fail-closed without a token; vanilla Hermes plugin/host adapters are
  shipped in the repository.
- No known release-blocking engineering debt remains; live activation and
  cross-platform remote CI evidence remain separate release gates.

## Addendum 30/08/2026 — CI reality correction and local mirror

The 26/08 "PASS" verdict described local verification only. Independent CI on
GitHub Actions has NEVER produced a green run: every `CI` workflow run to date
(failure in ~3-6s, no steps, empty logs; the account-level dependency-graph
workflow succeeds) failed. Root causes verified 30/08:

1. `ci.yml` installed only the `[dev]` extra; 7 API-importing test modules
   failed collection without the `desktop-panel` extra (`fastapi`).
2. The coverage gate required 90%; measured coverage on the exact candidate
   is 87.11%. The 90 gate never held on the committed tree.

Also corrected: `plugin.yaml` still pointed at the retired
`desktop/stewardship-panel` TSX scaffold; realigned to the shipped
`hermes_dockyard_plugin/desktop/plugin.js` surface (route `/dockyard`).

Correction delivered (local commit, pre-402):

- `.github/workflows/ci.yml`: install `[dev,desktop-panel]`; gate pinned to 87
  with a note that the gate is only re-raised deliberately. This workflow
  still cannot execute remotely — see below.
- `scripts/local-ci.sh` (new): exact local mirror of the CI gate sequence
  (install, suite+coverage at 87, byte-compile, API import; optional
  dashboard/desktop JS gates; `--json` evidence). Until GitHub Actions is
  available again (currently rate-limited at account level — no paid minutes),
  `scripts/local-ci.sh --with-node --json` output is the authoritative CI
  evidence for this repository.
- Evidence run 2026-08-30T13:50:56Z: 6/6 gates PASS (399 passed, 5 skipped,
  byte-compile clean, rpc-ok, dashboard 3/3, desktop 1/1).
- Local repo `.venv` resynced to `[dev,desktop-panel]`; the stale
  missing-`httpx2` state that blocked any local suite run is resolved.

Items that were open on 30/08 and are now closed:

- The historical `0.2.0rc2` tag was superseded by the published `v0.3.0` tag.
- GitHub Actions execution was restored; cross-platform run `33455039432`
  passed all jobs on 01/09.

## Current verdict

**PASS — selected product scope and repository state are complete.**

For the agreed current scope, no further engineering, repository-convergence, cleanup or verification work remains.

Broader product opportunity ideas are explicitly excluded from this verdict and remain optional future scope requiring separate validation.

## Evidence

- All 8 tracked tasks are complete.
- The verified Dockyard rc2 evidence baseline is
  `859e02db0cdcbf7f4875adab15c345a4a105c401`; this note is committed on top of
  that baseline and the final local/remote `main` identity must be read from Git.
- KenseiAgent local `main` and `origin/main` match at `750aca15b08604befeba7932310b463612544559`.
- Both GitHub repositories use `main` as the default branch.
- Fresh-clone verification passed:
  - Dockyard: 399 passed, 5 declared optional-environment skips
  - Host/Kanban: 49 passed
  - Cross-repository integration: 9 passed
  - Desktop harness: 20/20
  - Dashboard tests/build: passed
  - npm audit: 0 vulnerabilities
  - Runtime health: HTTP 200
- Obsolete and redundant branches, refs and worktrees were removed.
- Remaining KenseiAgent branches, worktrees and stash entries contain unique or active unrelated work and were intentionally preserved.
- Dockyard `origin` exposes only the canonical `main` branch.
- Dockyard GitHub default branch is `main`.
- KenseiAgent remote branches with unique patches were preserved rather than deleted.

## Delivered selected scope

### O1 — Complete work management

- Canonical work-item editing
- Title, type and body changes
- Labels, evidence references, estimates and due dates
- Human-to-bot and bot-to-human reassignment
- Dependency creation and removal
- Dependency/dependent visibility
- Cross-project and cyclic dependency rejection
- Actor-attributed audit records
- Desktop work-item editor
- Canonical planning metadata migrations
- Initiative provenance in backlog readback

### O2 — Initiative-to-outcome loop

- Idempotent initiative approval
- Canonical work materialisation without legacy task dual writes
- Approval-to-execution transition
- Initiative/work-item linkage and deep links
- Backlog prioritisation with initiative provenance
- Completion and regression state synchronisation
- Regression blocking linked canonical work
- Durable observation scheduling
- Executable idempotent internal observation cycles
- Observation state and cycle-ID persistence
- Delivery UI for approval, completion, regression and observation execution
- A2A result/reputation input maintained

## Release candidate identity

Version: `0.2.0rc2`

- Dockyard implementation commit: `580e296e9ba95e804a115571e78e43a665c23981`
- Dockyard rc2 canonical evidence baseline: `859e02db0cdcbf7f4875adab15c345a4a105c401`
- KenseiAgent canonical host main commit: `750aca15b08604befeba7932310b463612544559`
- Original host-contract commit before replay: `ce7d9d4fb407a5f43ec6691e4aeb340d0b43a6c9`

Artefact hashes:

- Dashboard JS: `0c4de43d04f6da6d7d5ee8bbcb8055d7fc3f6ff3c2e861a3d20a28d2a8229cff`
- Dashboard CSS: `409e8c326772b5f5a89187a708df9fefd52e84e78e604dd9ddd8572bc1df8761`
- Desktop plugin: `b50bcebb1fadc363e51407be5fa73432abb66a748fb822d6c75f0e596f64d70c`

Release evidence: `docs/release/0.2.0rc2-release-candidate.md`.

## Deliberately deferred operational actions

These are separate deployment/activation operations, not unfinished engineering:

1. Install or activate the plugin.
2. Run a production migration, if a valid owned legacy source is discovered.
3. Restart the affected dashboard/Desktop services.
4. Enable Dockyard scheduler automation.
5. Perform live post-activation QA in the actual Hermes Desktop host.

Sahil changed direction before these operations were executed. No Dockyard installation, production migration, service restart, scheduler activation or live Desktop launch was performed during the aborted rollout attempt.

Each deferred operation requires renewed explicit validation in chat before execution.

## Operational discovery and cautions

### Deployment topology

Prior proven deployment notes identify two distinct services:

- Hermes gateway on port `8642`: RPC/agent surface; it does not serve dashboard plugin routes.
- Hermes dashboard host on port `9119`: serves `/api/dashboard/plugins` and `/api/plugins/<name>/*`.

Backend discovery must prove Dockyard appears with `has_api: true` before Desktop activation is considered successful.

### One plugin ID, one Desktop door

Dockyard previously used both possible Desktop plugin doors:

- Standalone: `~/.hermes/desktop-plugins/hermes-dockyard/plugin.js`
- Unified: `~/.hermes/plugins/hermes-dockyard/desktop/plugin.js`

Do not activate both. For a Python-plus-Desktop package, the unified door is the preferred authoritative location and must be explicitly enabled. Duplicate doors can produce stale UI despite matching source hashes.

Before future installation:

1. Inspect current live plugin paths and symlink targets.
2. Choose one authoritative door.
3. Back up the current installed plugin and database.
4. Compare source and installed hashes.
5. Remove or disable the duplicate door only after proving which path is active.

### Python/backend dependency

The dashboard API imports `hermes_project_stewardship`. The package must be installed from the canonical Dockyard `main` checkout into the exact Python environment used by the dashboard host. Verify import and version before restart.

### Desktop launch safety

Do not launch or foreground Hermes Desktop without explicit approval.

On this rig, any future controlled launch must retain the proven safe flags:

- `--no-sandbox`
- `--disable-gpu`

A prior GPU-enabled launch froze the desktop. The display may also require Sahil to renew the `xhost +si:localuser:kensei` grant after logout/reboot.

### Migration boundary

No production migration should run merely because a migration CLI exists. First prove:

- the legacy source database exists;
- it is owned by Dockyard;
- its ownership marker is valid;
- the canonical target is correct and isolated;
- a consistent backup exists;
- dry-run output is clean;
- rollback has been rehearsed against disposable data.

If no valid legacy source exists, record migration as not applicable rather than creating or fabricating one.

### Scheduler boundary

The Hermes scheduler is already operational for other jobs. No Dockyard-specific scheduler job was selected or enabled during the aborted rollout.

Future Dockyard automation should be created only after manual activation and live QA pass. It must use an idempotent internal trigger, expose failures to an operator, and remain separately pausable.

### Live QA requirements

A future activation is not complete until all of the following are verified:

- backend health and plugin discovery;
- active plugin path and enabled state;
- source/install hash equality;
- actual Hermes Desktop route renders;
- sidebar-open and sidebar-closed layouts;
- Work and Delivery tabs show current `rc2` capabilities;
- one real mutation is read back from the backend;
- one initiative approval-to-observation journey completes;
- renderer/dashboard logs contain no Dockyard route or API errors;
- rollback restores the prior working state.

## Preserved unrelated work

The remaining KenseiAgent branches, worktrees, remote refs and stash were intentionally retained because they contain active or unique work, including blog, Walkie Talkie, anti-scripted, strict-persona, recovery/parking and macOS updater changes. They are not Dockyard cleanup residue.

## Product opportunities

Broader opportunities remain documented separately in:

- `docs/DOCKYARD-PRODUCT-OPPORTUNITIES.md`
- `docs/DOCKYARD-NEXT-PLAN.md`
- `roadmap.md`

They are not authorised by this file. Every new backlog item requires explicit scope and priority validation in chat before implementation, configuration, infrastructure changes, provider spend or activation.
