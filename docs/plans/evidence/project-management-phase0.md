# Project Management Stewardship — Phase 0 Evidence

Candidate: `feat/project-management-stewardship` at `59cd75ca0eb78d20a41682c1d9f0284e04fe4696` (working tree contains the plan, evidence, the minimal milestone repair, the harness fixture extension, the genuine frontend-chain test, new coverage tests and the corrected route matrix; no commit/push).

## Verdict

**PASS.** The milestone integrity defect is repaired and proven end to end (real frontend JS → real HTTP → real proxy → real backend → temp DB, with failure propagation). The Python coverage gate is restored to **87.74% (≥ 87, threshold unchanged)** with meaningful boundary tests. The route matrix is mechanically regenerated with source/line attribution, zero unresolved entries, and every flagged route carries verified resolution evidence. The vanilla-host spike (PM-0011/0013/0014/0015) is complete with source citations and runtime probes — including a real v1-manifest plugin install, enable, load and health check from a repository/Git URL in a temporary vanilla Hermes home. The transfer consistency model is decided: **durable idempotent Stewardship saga**. Two pre-existing UI defects are recorded and classified (not hidden). All canonical gates pass at the final tree with direct exit codes. Note: `hermes plugins install . --enable` is not a supported Hermes command (`.` resolves through the community index); the supported install path is `hermes plugins install Sahil-SS9/hermes-project-stewardship --enable`, and local `.` installation is explicitly unsupported.

## PM-0003 topology

- branch: `feat/project-management-stewardship`
- HEAD: `59cd75c` — child, parent `feat/trustworthy-daily-stewardship-20260908` and merge base verified identical via `git merge-base`/`git rev-parse`; ahead/behind `0/0`
- initial working tree contained only untracked `docs/plans/`. No reset, stash, clean, push, live profile or live Dockyard DB was used at any point. All probes used detached worktrees, temp `HERMES_HOME`s and temp SQLite databases.

## Canonical gate results (exact final tree, direct exit codes)

| Gate | Command (canonical) | Exit | Result |
|---|---|---:|---|
| Python coverage | `uv run --locked --extra dev --extra plugin pytest --cov=hermes_project_stewardship --cov-report=term --cov-fail-under=87` | 0 | **87.74% ≥ 87 reached** (deterministic across repeats) |
| Full test suite | `uv run --locked --extra dev --extra plugin pytest -q` | 0 | 641 passed, 34 skipped, 0 failed |
| Ruff | `uv run ... ruff check src` | 0 | clean |
| ty (trust boundaries) | `uv run --locked --extra dev --extra plugin ty check src/hermes_project_stewardship/security/allowlist.py src/hermes_project_stewardship/api/middleware.py src/hermes_project_stewardship/plugin.py src/hermes_project_stewardship/persistence/store.py` | 0 | clean ("All checks passed!") |
| pip-audit | `uv run ... pip-audit` | 0 | 0 known vulnerabilities (local package not on PyPI, noted) |
| compileall | `uv run ... python -m compileall src tests` | 0 | clean |
| env sync | `uv sync --locked --extra dev --extra plugin` | 0 | clean |
| dashboard install | `npm ci` | 0 | clean |
| dashboard types | `npx tsc --noEmit` | 0 | clean |
| dashboard tests | `npm test` | 0 | 23 passed |
| dashboard build | `npm run build` | 0 | dist/index.js 108,911 B; style.css 17,591 B |
| dashboard deps audit | `npm audit --omit=dev` | 0 | 0 vulnerabilities |
| Desktop harness | `DOCKYARD_CAPTURE_SCREENSHOTS=0 node --experimental-vm-modules --test repro-live.test.mjs milestone-chain.test.mjs` | 0 | repro-live 26/26 internal checks PASS + chain test pass (CI lane updated to include milestone-chain.test.mjs) |

**Note on coverage history:** the shortfall was pre-existing at `59cd75c` (86.43% baseline). Earlier runs printed "FAIL … 86.55%" yet exited 0 intermittently — pytest-cov's loop-time threshold check is timing-sensitive when coverage sits just under the threshold (fail-under consumed at `[100%]` reporting time). This is why the previous BLOCKED verdict stood until real tests closed the gap. Margin is now 0.74pp and stable across repeated runs.

**Non-gate type debt (pre-existing, recorded separately):** `ty check src` (whole-tree) reports 31 diagnostics with exit 2 — middleware factory typing in `api/server.py`, optional vanilla-host imports in `kanban/vanilla_host.py`, and broad legacy annotations in persistence modules. None touch the four canonical gate files, which pass clean. This is tracked as non-gate debt, not a Phase 0 gate result.

## PM-0009/0010 milestone defect — full TDD chain

**RED witnessed at pristine baseline.** `test_milestone_proxy_round_trip_is_not_false_empty` against baseline `plugin_api.py` (zero milestone proxy decorators): POST `/api/plugins/hermes-dockyard/projects/{id}/milestones` → **404**.

**False-empty mechanism proven end to end.** At baseline, `desktop/plugin.js:2220` wrapped the milestones list fetch in `.catch(() => ({ milestones: [] }))`, and the harness fixture threw `Unhandled test request: GET /projects/{id}/milestones` — the catch swallowed the error and the harness passed 26/26 with the route missing. A missing backend route was invisible to the UI: exactly the false-empty behaviour PM-0009 targets. The baseline harness "pass" was an artefact of the defect.

**Minimal repair (PM-0010):** seven proxy routes added to `plugin_api.py` (create POST, list GET, detail GET, update PATCH, rename, attach, detach — proxying to `/stewardship/v1/projects/{pid}/milestones…`), and the false-empty `.catch` removed from `plugin.js`. One additional in-scope change: the harness fixture now serves GET `/projects/{id}/milestones` honestly (it previously encoded the obsolete contract the false-empty catch masked).

**Genuine frontend → proxy → backend regression (`desktop/milestone-chain.test.mjs`).** The chain contains no HTTP-layer mocks: the real `plugin.js` runs in jsdom with `ctx.rest` bound to real `fetch()` against a spawned real server (uvicorn serving the FastAPI app that mounts the plugin router at `/api/plugins/hermes-dockyard` with the backend ASGI app installed and a temp `dockyard.db`). The test **drives the real UI**: mount → click project tab → click Planning view → assert the documented empty state → create the milestone through the real chain → drive real tab-switch reloads → assert `[data-milestone-row="Chain Release"]` renders and the false-empty message is absent → expand the row and assert milestone detail loads through the proxy → rename → reload → assert the renamed row renders. Failure propagation is proven twice: a missing milestone surfaces an error over the real chain, and the UI never renders the false-empty state while the backend holds a milestone. **Both RED proofs witnessed:** removing the `GET /projects/{id}/milestones` proxy route fails the test (Promise.all 404 → dashboard error state, loud failure); removing the frontend milestones fetch from `loadProjectData` equally fails it. Only stub: Hermes host plumbing (`ctx.rest` → `fetch`), which is the host's own contract.

## PM-0008 route matrix (regenerated, trustworthy)

`project-management-route-matrix.json` rebuilt mechanically with a paren-balanced `api()` extractor (handles template literals, multiline calls, nested braces, per-call `method:`), `act()` wrapper expansion with per-call method, and static resolution of the two dynamic templates (lifecycle config table `plugin.js:2676-2680`, decision actions `plugin.js:4362-4368`). Every entry carries method, normalised frontend path, proxy path, backend path, source file and line.

- **77 frontend calls** (60 distinct shapes), **66 proxy routes**, **90 backend routes**
- **72 exact** frontend→proxy→backend parity, **5 flagged** (each with verified resolution: 3 intentional direct-backend onboarding routes — `/onboard/discover`, `/onboard/preflight`, `/projects/{}/first-assessment` — whose backend routes exist; 2 statically-resolved dynamic templates whose targets are matched exactly in their resolved entries), **0 unresolved**
- Proxy routes without backend routes: 0 (the 3 self-served host-data routes `/health`, `/bots/{id}/sessions*` are terminal by design and marked)
- Summary counts reconcile against the per-entry list.

## Feasibility investigations — final verdicts

Full evidence: `docs/plans/evidence/project-management-vanilla-host-spike.md` (vanilla rev `8c098e9e819169879a7b2f74990e83b5d39696c8`, runtime probes in temp homes).

- **PM-0011 pagination:** PROVEN — vanilla `list_tasks()` has no default cap (`hermes_cli/kanban_db.py:3661-3710`); 137-task probe returned 137; the 100/500 caps live in the Stewardship adapter (`vanilla_host.py:12,37-42`), not vanilla. Epics are task-kind rows in the same enumeration.
- **PM-0011 batch assignment:** PROVEN-ABSENT at this revision — assignment is singular; no batch/bulk transaction exists.
- **PM-0011 preconditions:** PROVEN — assignment has a running/claim guard and write transaction but **no revision/optimistic-CAS precondition** (claim_lock CAS protects claims only).
- **PM-0011 claimed handoff:** PROVEN — reassignment of claimed/running work is refused; explicit `reassign_task(..., reclaim_first=True)` is the operator recovery path. **Claimed/running work is non-transferable in this release.**
- **PM-0012 trusted principal (resolved from PARTIAL):** The chain is Desktop host → plugin proxy → backend. The proxy stamps `actor_id`/`actor_kind` from `DOCKYARD_ACTOR_ID` — **attribution only, never authorisation**. Authority is backend-enforced: requests carry an Authorization bearer token; the backend resolves a **verified principal** with `auth_principal_is_human` capability. Proven fail-closed by `test_assessment_proxy_preserves_server_authority`: forged actor payload → 422; authenticated non-human principal → 403 and zero records written; verified human → 200 with `verified_actor` recorded. Proxy stamping cannot escalate: the backend ignores payload actors for authorisation. Degraded proxy startup fails closed with 503 rather than falling back to another database.
- **PM-0013 imports:** PROVEN — all Hermes imports (`hermes_constants`, `hermes_cli.kanban_db`, `hermes_cli.projects_db`, `hermes_cli.kanban_db_connect.connect_closing`) are private/internal source modules, not a documented public plugin API; isolated behind the tested host adapter (which is coverage-omitted by design and exercised against a real vanilla checkout in the integration lane).
- **PM-0014 lifecycle:** PROVEN in isolated homes — profile creation supported (`hermes profile create`); no deep-link/navigation contract exists (do not invent one); disable/enable are config-only; `plugin-data/<namespace>` survives disable, enable and two uninstall/reinstall cycles (runtime probe; uninstall deletes only the install dir + metadata, `plugins_cmd.py:1207-1232`); one `HERMES_HOME` per process confirmed (switching requires a new process). **Compatibility RESOLVED with the shipped v1 manifest:** the real v1 plugin installs from a repository/Git URL in a temporary vanilla Hermes home (install, enable, discovery, load, health verified). Supported install command: `hermes plugins install Sahil-SS9/hermes-project-stewardship --enable`; local `.` installation is not a supported Hermes command and is explicitly unsupported. Full matrix in the spike file.
- **PM-0015 ownership:** PROVEN reconciliation and **APPLIED** — `docs/dockyard-prd-v0.3.md` corrected: D1 annotated, WorkItem/Epic reclassified as legacy/compatibility read-model vocabulary, new §3.4 canonical-ownership block added, PM-01/PM-02/PM-07/UX-04/G1 rewritten to Hermes-Kanban-canonical phrasing. Repo-wide sweep found no remaining current-document ownership contradictions (README and release notes already state Hermes Kanban canonical ownership).

## PM-0016 consistency decision (final)

**Durable, idempotent, resumable Stewardship operation saga.** Rationale: vanilla has no canonical batch-assignment transaction to own cross-database state, and single-task assignment has no revision precondition the saga could lean on. The saga records intent and per-task outcomes, retries idempotently (host `reassign_task` is the per-item primitive; claimed items excluded unless explicitly reclaimed), reconciles by canonical readback, and never claims cross-database atomicity. Membership stays `departure_pending` until canonical readback verifies every eligible assignment outcome.

## UI defects exposed by the fresh Desktop harness (recorded, not fixed)

Both reproduce at clean `59cd75c` (pre-existing) and remain at the candidate; the harness exits 0 despite them, which is why they were previously invisible.

1. **Duplicate React key `demo-project`** — component-render warning during project list render. Severity: **low/medium**; user impact: React reconciliation can duplicate/drop a row in pathological updates. Fix direction: key by stable unique id (`project.id` vs discovery-slug collision) in the project list source. Recommended phase: **Phase 2** (shared project list/picker work) with regression proof in Phase 7.
2. **`tabOverflow: 210` at `onboarding-480-dark`** — the onboarding tab bar overflows by 210 px at a 480 px host pane (all tabs rendered, none wraps/collapses). Severity: **medium** (narrow-pane onboarding is unusable navigation-wise); no data risk. Fix direction: responsive tab condensation (overflow menu / horizontal scroll region) at the 480 px breakpoint. Recommended phase: **Phase 2** prototype + **Phase 7** narrow-width visual regression row.

Neither blocks Phase 0: the Phase 0 gate covers integrity, authority, host capability and consistency questions; both defects are visual/UX and fall under Phase 2/7 gates (zero unresolved critical/high is a Phase 7 condition).

## Carry-forward constraints

1. Deployment uses the supported repository install: `hermes plugins install Sahil-SS9/hermes-project-stewardship --enable`. The real v1-manifest plugin was verified installing from a local Git URL (repository clone) in a temporary vanilla Hermes home. Local `.` installation is not a supported Hermes command and is explicitly unsupported.
2. Phase 6 minimum-vanilla-host matrix should target **host ≥ upstream/main `866332bf`** where practical; the shipped plugin uses a v1 manifest and installs through the repository/Git-URL path.
3. The two classified UI defects enter the Phase 2 prototype scope and the Phase 7 regression matrix.

**Phase 1 is safe to begin.**
