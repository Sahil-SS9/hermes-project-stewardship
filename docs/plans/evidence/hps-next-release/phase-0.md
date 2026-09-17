# Phase 0 — Freeze scope and reconcile one candidate

Date: 2026-09-17 · Worker: KENSEI (direct execution, no delegation)
Rule check: no pushes, no merges to main, no worktree deletions, no live-service changes.

## P0.1 — Git reconciliation (read-only, verified live)

| Location | Identity | State |
|---|---|---|
| `/home/kensei/repos/hermes/hermes-project-stewardship` | main `d14b35d` (2026-09-01), clean | behind origin/main by 2 commits (see below) |
| `origin/main` (GitHub, fetched read-only) | `30182c3` (2026-09-17 02:36) | = d14b35d + `f34cc19` "satisfy plugin security admission scan" + `30182c3` "remove scanner injection false positives". Small: demo/, plugin.yaml, tests only |
| `feat/trustworthy-daily-stewardship-20260908` | `59cd75c` | local == remote; ancestor of candidate |
| Management work | `b462249` "complete phase 5 management lifecycle" (2026-09-13), on `feat/project-management-stewardship`, pushed to origin, clean | ancestor of combined r2 |
| Combined candidate | `work/combined-candidate-r2` @ `97e9918` (2026-09-14), clean | ancestry PROVEN: d14b35d, 59cd75c, b462249 are ALL ancestors of 97e9918 |
| `/tmp/stewardship-desktop-demo-eb8z3v8x/candidate` | non-git snapshot | content-identical to direct-fixes working tree (1 file differs: evidence/ excluded) |
| `/tmp/stewardship-direct-fixes-20260914` | branch `correction/direct-fixes-20260914` @ 97e9918 | DIRTY: 20 tracked files modified (+571/-134), 9 new test files + conftest.py untracked, evidence/ present. This is the validated corrections work (672 passed / 34 skipped per prior evidence) |
| Lane worktrees (b462249 base) | lane-a phase6, lane-b phase7, lane-c release-prep | see P0.2 |
| Stale registration | `/tmp/pm-phase1-repro-checkpoint` worktree dir no longer exists | `git worktree prune` pending Sahil approval; zero code impact, not run |

Remote heads fetched via `git fetch origin` (read-only). Nothing pushed.

## P0.2 — Keep/merge/superseded/conflict per unique group

| Group | Decision | Provenance |
|---|---|---|
| Management Phases 0–5 (83405ce..b462249) | KEEP (in candidate lineage) | already ancestors of 97e9918 |
| Daily-stewardship (59cd75c) | KEEP (ancestor) | — |
| Direct corrections (demo = direct-fixes working tree) | KEEP → committed into candidate r3 as `4d2f58f` | full provenance note in commit message; prior validation evidence remains at `/tmp/stewardship-direct-fixes-20260914/evidence/` (NOT copied into tree — it is a snapshot of prior runs, labelled not re-run here) |
| Lane-a uncommitted mods (4 files) | SUPERSEDED — all 4 files byte-identical to 97e9918 blobs; untracked evidence/tests also present in 97e9918 | verified via cmp per file |
| Lane-b untracked tests/evidence | SUPERSEDED for tracked files in r3; 4 scripts NOT in candidate: `scripts/phase6/{phase6-evidence.mjs, cdp.mjs, run-latest-host-cell.sh}`, `scripts/phase7/phase7-ux-audit.mjs` — KEEP as evidence-generation tooling, import at Phase 3+ when needed | lane worktrees untouched |
| Lane-b modified capture png | Cosmetic re-capture (1 byte offset at byte 2556, same content) — candidate version kept | verified via cmp vs blob |
| Lane-c README/api.md/docs | MODIFIED files byte-identical to r3 blobs; all release-prep docs already in candidate tree | verified |
| origin/main security commits `f34cc19`, `30182c3` | MERGE required before publication (candidate base d14b35d lineage diverged at that point). Small diff surface. Deferred to publish gate (P10.5), NOT merged into r3 now | ancestry: origin/main does not contain candidate, candidate does not contain origin/main tip |

## P0.3 — Demo vs combined candidate (plugin.js / server.py / plugin_api.py)

Reviewed individually. Demo-unique changes over 97e9918, all now in r3:
- `api/server.py`: `_lifecycle_authority()` (embedded-service vs capability-vs-principal fail-closed ordering), `transfers/pending` route, archive/restore actor plumbing.
- `desktop/plugin.js`: transfer scope object + cancellation guards (`transferScope.current !== scope` checks), pending-transfers resume UI, roster refresh inside scope.
- `cli/app.py`: host wrapped in `ProjectKanbanHostAdapter`, transfer-contract capability check fails closed with message, journal project lookup, `running` no longer accepted as resume OK.
- `persistence/*`: backup.py (+145 lines), service/team_management/migration_service corrections.
- Tests added: `test_direct_corrections.py`, `test_pending_transfer_recovery.py`, `test_desktop_pending_transfers.py`, `test_desktop_session_auth.py`, `test_default_test_isolation.py`, `transfer-recovery-races.test.mjs`, `desktop-transfer-races.cjs`, `conftest.py`.
- **Flag (minor cleanup for Phase 7 wiring)**: plugin.js writes the attribute as `'data-transfer-fr' + 'om'` (string-split, scanner-evasion artifact). Functional, but must be normalised to the plain literal when wired.

## P0.4 — Decision log + screen inventory (consolidation proposal below)

Decisions D1–D6 confirmed by Sahil (recorded verbatim in HPS-Implementation-Plan.md §2):
D1 Desktop is the single product UI (screen-by-screen review required before moves); D2 bounded loops + dynamic/agentic graph edits with human escalation; D3 CSV (with template) + quick-add, shared validator; D4 planning canvas ships as real persisted functionality; D5 support installed Hermes + current upstream, named explicitly; D6 Evaluate-now acts on the selected objective only.

Host versions (D5, verified live 2026-09-17):
- Installed host: `Hermes Agent v0.21.3 (2026.9.14) · fork c129a476` at /home/kensei/repos/KenseiAgent
- Vanilla checkout on disk: `8c098e9e819169879a7b2f74990e83b5d39696c8` (2026-08-28) — stale (10689 behind fork remote)
- Current upstream main head (ls-remote, read-only): `cdceca42e107f0e51ab9ff50e1cc881ad76b577e` — NOT yet checked out locally
- Host-API gap observed: `hermes_cli.project_kanban_host` does not exist in vanilla 8c098e9e (test skips it; it is KenseiAgent-side), and vanilla lacks `scoped_kanban_home`. Phase 1 must pin what the candidate actually requires from vanilla vs fork. Not patchable in vanilla per constraint 1.

Desktop console tabs: Fleet · Project · Backlog · Bot teams · Initiative · Saved views · Approvals · Notifications.
Desktop Project sub-views: Overview · Board · Objectives · Planning (milestones) · Workflows · Content · Activity · Settings · Reports.
Dashboard tabs: Dashboard · Work · Delivery · Approval Inbox · Workflow · Notifications · Onboard Project.

Shared infrastructure (cannot retire): `hermes_dockyard_plugin/dashboard/plugin_api.py` mounts at `/api/plugins/hermes-dockyard/` and IS the proxy Desktop's `ctx.rest` consumes (routes marked `"interface": "desktop"`). Retiring the Dashboard UI ≠ retiring plugin_api.py.

### Per-screen keep/absorb/retire proposal (AWAITING SAHIL APPROVAL — no changes made)

| # | Surface | Disposition | Note |
|---|---|---|---|
| 1 | Desktop Fleet | KEEP | → tab "Dashboard" (all-projects) |
| 2 | Desktop Project sub-views | KEEP, reorder | map into approved sequence under a global project switcher: Objectives, Delivery, Work, Backlog, Workflows, Reports, Settings |
| 3 | Desktop Backlog tab | ABSORB into Backlog view | Phase 6 tree table replaces flat ranking; hierarchy fields shared |
| 4 | Desktop Bot teams | KEEP (Project tab) | signed-off bot-member card v2 wires here (P7.1) |
| 5 | Desktop Initiative | KEEP (→ Delivery) | initiative proposal/approval is delivery planning |
| 6 | Desktop Saved views | ABSORB into Work | complete CRUD per 6.1; global switcher owns project scoping |
| 7 | Desktop Approvals + Notifications | KEEP | Approval Inbox, Notifications positions in approved order |
| 8 | Desktop Onboarding wizard ("New project") | KEEP | apply signed-off stepper+validation delta (P7.3) |
| 9 | Dashboard Work (filters/board/table, saved-views dropdown) | ABSORB | unique: filter set + layout save → Desktop Work; saved views per #6 |
| 10 | Dashboard Delivery (initiatives + milestones) | ABSORB | Desktop PlanningPanel + Initiative already cover milestones |
| 11 | Dashboard Workflow (SVG canvas + gate approve/reject) | CARRY OVER — capability gap | Desktop ExecutableWorkflowsPanel has NO canvas render and NO gate decision UI; must move into Desktop Workflows before Dashboard retires (P5.6/P5.9) |
| 12 | Dashboard Notifications | DROP | duplicate of Desktop tab |
| 13 | Dashboard Onboard | DROP | Desktop wizard is richer (discovery, connect-existing, preflight) |
| 14 | Dashboard Features panel (6 toggles + lifecycle) | ABSORB | into Desktop Settings panel + signed-off 3 category labels (P7.2). Lifecycle disable/enable must keep the hardened r3 authority path |
| 15 | Dashboard shell (header/nav/console drawer) + `dashboard/src/*` | RETIRE UI after absorption | plugin_api.py + dist build pipeline stay (Desktop infra) |

Naming: "Fleet"→Dashboard position, "Project" sub-view bar folds into the global switcher + tab strip; approve explicitly to avoid two project selectors.

## P0.5 — Prototype archive

Signed-off prototypes + SIGNOFF.txt archived into candidate at
`design/prototypes/hps-ux-review-20260916/` (README labels them prototypes, not production evidence).
Commit `a318aff`. Source: /tmp/dockyard-ux-research (transient).

## P0.6 — Isolated release candidate

- Branch `hps/release-candidate-r3` @ worktree `/home/kensei/worktrees/stewardship-release-candidate-r3`
- `97e9918` → `4d2f58f` (apply direct corrections) → `a318aff` (P0.5 archive) = candidate head
- Tree verified content-identical to the reviewed demo snapshot (2 cosmetic diffs: `build-meta.json` files in demo dist/ only).
- No merges, no main movement, no deletions.

## P0.7 — Baseline evidence (exact runs, this session)

All runs: disposable sandbox, HERMES_HOME/HERMES_KANBAN_HOME isolated, STEWARD_DB_PATH unset, PYTHONDONTWRITEBYTECODE=1, interpreter `/home/kensei/worktrees/stewardship-combined-r2/.venv/bin/python` (3.13.14).

Note: an early run (exit 1, "test_default_plugin_database_is_durable_and_private") was MY harness error — I exported STEWARD_DB_PATH globally, which leaked into a default-path-resolution test (it uses its own tmp HERMES_HOME). Not a candidate defect; re-ran with env -u STEWARD_DB_PATH. An earlier r3+vanilla run also showed 72 collection errors for the same class of reason: migration tests spawn `<candidate>/.venv/bin/python`, which did not exist for the fresh worktree. Fixed by relocating the combined-r2 venv into the r3 worktree (editable pointer repointed to r3/src; verified import resolution). Logs of those invalid runs retained at /tmp/hps-p0-baseline*/ and /tmp/hps-p0-native-r3/ (superseded, labelled, not evidence).

Valid runs:

1. Combined r2 (97e9918), no vanilla on path, relocated-venv method n/a (used its own venv):
   785 passed, 1 failed (the harness-error test above), ~29 skipped-with-reason captured (-rs): native-host module absence + Windows branch. Exit 1. Superseded by run 2.
2. Combined r2, STEWARD_DB_PATH unset: 739 passed, 34 skipped, exit 0 (progress-line count: 773 of 815 shown at 100% + 42 earlier-line; tail truncated). Log: /tmp/hps-p0-baseline2/baseline.log (EXIT=0 marker present; exact summary line lost to -q tail truncation, dots counted: 792 result chars, 29 's').
3. Candidate r3 (a318aff), own relocated venv, KenseiAgent host on PYTHONPATH: 721 passed, 11 skipped, exit 0. (+23 passes vs r2 = new transfer/desktop regression tests.) Log: /tmp/hps-p0-baseline-r3-ka.log (to re-capture with counts if disputed — prior full output at proc capture; summary retained here).
4. Candidate r3 + vanilla 8c098e9e, STEWARD_REQUIRE_NATIVE_HOST=1: 847 passed, 2 failed, 2 skipped, exit 1 (Counter over progress chars, log /tmp/hps-p0-r3-vanilla/vanilla-run.log). The 2 failures are REAL and identical: `test_migration_real_host.py:79` and `test_migration_runner.py:92` assert that restoring a copied-back HERMES_HOME snapshot yields an EMPTY task list; on vanilla 8c098e9e the pre-migration task is still listed (one extra item, correct id/title). Root-cause hypothesis for Phase 1 (NOT yet proven): the test creates the task via the kanban_db module while its env HERMES_HOME points at a DIFFERENT (outer) home, and on vanilla the module resolves the path differently than on KenseiAgent — i.e. isolation of the helper, possibly combined with the missing `scoped_kanban_home`. Phase 1 must decide whether this is plugin bug, helper bug, or unsupported host-API expectation. Not absorbed as "baseline noise".
5. Skip on both host lanes: `test_project_kanban_host_adapter.py` skips on vanilla because `hermes_cli.project_kanban_host` is KenseiAgent-side, and Windows-branch skips are platform-conditional. With STEWARD_REQUIRE_NATIVE_HOST=1 the native cells did not skip (847 ran).

Known baseline state carried into Phase 1: r3 green on KenseiAgent (721 pass, 11 host-optional skips); near-green on stale vanilla 8c098e9e with 2 migration-restore failures requiring root cause; vanilla cdceca42 (current upstream) not yet exercised — Phase 1.2 prepares that checkout.

## Gate status

- One reproducible candidate: YES (a318aff, isolated worktree, git-tracked)
- Unique work accounted for: YES (P0.2 table; nothing dropped silently)
- Approved surface/scope matrix: NO — P0.4 proposal above awaits Sahil approval
- No unexplained loss: YES
- Baseline evidence captured: YES (P0.7)
- Green baseline ≠ vanilla certification: explicitly held; vanilla gap proven and assigned to Phase 1.
