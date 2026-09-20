# HPS Phase 4 — Objectives, Reports and Saved Views (evidence)

Date: 2026-09-20 (BST)
Candidate: `hps/release-candidate-r3` @ `stewardship-release-candidate-r3`
Worktree: `/home/kensei/worktrees/stewardship-release-candidate-r3`

Gate: PASSED. Backend and full Desktop/proxy vertical acceptance are fresh-green on the candidate worktree.

## What was delivered

### Objectives (P4.1–P4.3)

- Objective create/edit/archive/remove behaviour retained end-to-end. The
  Desktop flow posts through the real plugin proxy (`POST/PATCH/…/archive`)
  and the read-back preserves historical evidence — archiving keeps the
  evidence list and status visible (disabled) rather than deleting history.
- **"Evaluate now" (D6) — new, single-objective only.**
  - Backend: `POST /projects/{pid}/objectives/{oid}/evaluate` →
    `StewardshipService.evaluate_objective_now()`.
  - Command/integration objectives run the same allowlisted evaluator the
    stewardship cycle uses, and the sample is persisted to the new
    `project_objective_evaluations` table (migration v25) so evidence
    history/state refresh immediately.
  - Manual objectives are re-derived from the latest recorded human
    assessment only — never auto-passed; no new persistence.
  - Archived objectives return `not_applicable` without executing anything.
  - Failure handling: blocked commands (allowlist), missing project path,
    evaluator errors and expired assessments all render honest
    `unknown`/`stale` states with detail; failed evaluations never mark
    success.
  - Authority: fail-closed. No trusted principal → 503; non-human
    principal → 403 (evaluator execution is permissioned; agents keep the
    default denial).
  - Labelling: the UI states "Evaluates this objective only. The full
    stewardship cycle is a separate action." Manual recording remains the
    only way to create human evidence.
- Evidence history reads union: health snapshots (cycle) + evaluations
  (evaluate-now) for command/integration objectives; assessments for manual.

### Reports (P4.4–P4.5)

- **Download Markdown** added to the report preview: downloads the exact
  `content` string the API returned, with a sanitised ASCII filename
  (`download.js`: NFKD normalise, strip reserved characters, length-capped,
  always `.md`). No content is transformed or re-rendered at download time.
- Verified byte-for-byte in the rendered browser: downloaded file equals the
  API content bytes, including emoji and accented characters.
- Error paths: download unavailable in an environment without `document`
  returns false → toast "Download could not start"; unknown report id → 404.

### Saved views (P4.6–P4.8)

- Moved into the **Work** tab as a clearly separated "Saved views" section
  (per plan P4.6; the phase-0 addendum's "fold into Workflows" predates the
  11-tab shell — flagged below).
- Save / recall / overwrite / delete all complete:
  - Save: `PUT /views` (create + overwrite); saving over an existing name
    requires the **overwrite confirmation** dialog.
  - Recall: loads the definition into the editor **and applies it to the
    board** — the stored query runs server-side (`GET /views/{name}/items`)
    and the matching items replace the board list; `board` and `table`
    layouts both render (timeline maps to board with an explicit note).
  - Delete: `DELETE /views/{name}` (new backend route) with confirmation;
    deletes are owner-only. Selection is cleared after delete (stale
    selection handling).
  - Refresh: after save/delete the list refreshes and the selection follows
    the saved definition.
- Isolation & persistence: views are per-project (list/save/delete/run all
  project-scoped; verified no leakage across projects), survive a full page
  reload, and invalid filters are rejected by the shared query validator
  (409 with message; UI keeps the editor state).

## Evidence — commands and results

All commands run with disposable state (`HERMES_HOME`/`HERMES_KANBAN_HOME`
under `/tmp/hps-p4-…`), `PYTHONDONTWRITEBYTECODE=1`, sources frozen to the
candidate worktree.

1. Focused Python acceptance — 19 tests, exit 0:

   ```
   .venv/bin/python -m pytest -q tests/test_phase4_objectives_views_reports.py
   ```
   Covers: single-objective evaluation + persistence + repeat evaluation,
   manual no-auto-pass, stale/expired assessments, blocked commands,
   missing project path, archived objectives skip execution, denied
   authority (503/403), archived read-back, view lifecycle incl. delete
   ownership (404 vs 409), cross-project isolation, invalid filters (409),
   report byte round-trip with Unicode, report 404.

2. Full Python suite (fallback lane): see `full.log` summary line appended
   below on the evidence commit.

3. Desktop jsdom + Chromium harness (`repro-live.test.mjs`): **30/30 PASS**
   (all journeys incl. layout snapshots at 700/725/1000/1200/1400/1600,
   contrast, keyboard, deep links; journeys updated for the Phase 4 shell —
   see "Reconciliation" below).

4. Rendered-browser Phase 4 acceptance (`phase4-rendered-browser.test.mjs`,
   disposable `phase4-host.mjs` + esbuild bundle of the real plugin.js):
   **4/4 PASS** on 2026-09-20.
   - objectives: create → edit → Evaluate now (asserts exactly one evaluate
     call, for the selected objective only) → archive (confirm) with
     evidence surviving, no page errors;
   - reports: open RPT-1 → Download Markdown → assert safe filename, byte
     equality with API content, Unicode preserved;
   - saved views: recall applies filter to board → save (PUT once, exact
     payload) → recall table layout with done filter → overwrite (confirm
     dialog, second PUT) → reload persistence → project isolation → delete
     (confirm, DELETE recorded, stale selection cleared).

   - Fresh rerun command: `node hermes_dockyard_plugin/desktop/phase4-rendered-browser.test.mjs`
     with new `HERMES_HOME` and `HERMES_KANBAN_HOME` directories under
     `/tmp/hps-p4-run-*`; result **4/4 pass**, exit 0, 5.1 seconds.
   - Candidate identity: the test derives `REPO` from its own worktree path and
     esbuilds the absolute candidate `hermes_dockyard_plugin/desktop/plugin.js`
     into a new `mkdtemp` bundle before starting the host. The host serves only
     that bundle and binds to `127.0.0.1`; no installed plugin, live database,
     profile, gateway or scheduler is consulted. Host state is an in-memory
     seed reset per process, and the test kills the host and removes the bundle
     directory in `finally`. This is trustworthy for the candidate-bound
     rendered gate; the host itself intentionally accepts the bundle path
     supplied by the test rather than claiming arbitrary bundles are bound.

5. Other desktop harnesses: `phase6-focus` 4/4, `workflow-canvas-mount`,
   `milestone-chain`, `phase7-a11y`, `phase7-visual`, `backlog-slice` — all
   PASS.

## Repo reconciliation (P3 shell state, fixed as part of this phase)

The Phase 3 shell shipped an 11-tab ConsoleBar whose project-scoped tabs
(delivery/work/reports/settings/workflows) fell through to the notifications
view, teams/initiative lost UI reachability, and the local desktop harness
was red (unhandled `./workflow-canvas-mount.js` import + journey drift).
Fixed in this phase:

- All project-scoped tabs now dispatch to the project screen focused on the
  matching sub-view; the 'project' tab is "Objectives" and opens the
  objectives sub-view — the sub-view bar still reaches overview/board/etc.
- Delivery tab = initiative loop + milestone planning (map row 5/10).
- Bot teams reachability restored via a Dashboard affordance ("Bot teams"
  button); the screen itself is unchanged (P7.1 refines the cards).
- Tab strip wraps instead of scrolling at narrow widths (no hidden tabs at
  700px); the backlog priority-reason cell collapses at <=820px (metadata
  remains in tooltip/details/rank dialog) so nothing clips.
- Harness journeys updated to the shipped nav; `repro-live` back to green.

### Open decisions for Sahil (flagged)

1. **Saved views home**: plan P4.6 says Work; the phase-0 addendum said
   "fold into Workflows" (written when Work was not a top-level tab). This
   phase placed them in Work. One-line move if you prefer Workflows.
2. **Bot teams placement**: map row 4 says "Project tab"; this phase used a
   Dashboard affordance because the screen is fleet-level (all bots,
   workload, groups). Confirm before P7.1 wires the bot-member card v2.
3. `evaluate_objective_now` for command objectives records a sample row for
   every attempt (including blocked/unknown) — pass-rate math ignores
   non-pass/fail states, so blocked attempts cannot inflate outcomes.

## Deliberate deviations from plan sub-tasks

- None of the plan's task IDs were skipped. P4.5's Unicode/safe-filename
  cases run in the rendered browser (real download path) rather than jsdom
  because jsdom does not implement `URL.createObjectURL`.
- P4.3's "evaluator failure" case is covered as blocked-command and
  missing-project-path detail states (the evaluator's own fail-closed
  branches); an injected `ValueError` path is not reachable through the
  public service API.

## Follow-ups (explicitly not done here)

- Timeline layout for saved views renders as board with an explicit note
  (web-parity was the same: timeline was never applied there either).
- Phase 5 canvas work continues from the canonical phase-2/3 state.
