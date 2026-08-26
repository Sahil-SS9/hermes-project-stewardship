# Remaining work and current state

Updated: 26/08/2026

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
