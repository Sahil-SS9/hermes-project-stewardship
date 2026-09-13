# Lane B Phase 7 — test development + UX proof (parallel preparation, NOT final sign-off)

Status: LANE COMPLETE FOR REVIEW — do not self-approve the release.
Base: frozen Phase5 `b462249ac37447bb32c3426d3f2c6d93bb17ee66` (integration checkout clean at handoff).
Lane A changes were NOT pulled or waited on. No production code changed.

Verdict first:
- New reusable Phase7 gates pass on the base: 23 Python + 9 Node, exit 0.
- Baseline subsets still green: 72 passed, 2 skipped (Phase4/5/6-fleet/plugin-backend).
- Real backend journeys prove run_key (never run_id), stale-409, claimed refusal, crash retry, isolation + disable/archive retention with byte-identical repo fixtures.
- Visual/a11y proven statically; full browser matrix + installed-plugin videos await post-integration (documented prerequisites, no mocks claimed as videos).
- One next step: Sahil reconciles A+B, then reruns the listed final gates on the combined candidate under the heavy lock.

## 1. Implemented / verified behaviour (PM map)

PM-0701 (full suites): PARTIAL — new lane suites green + relevant baselines green once (see logs). Full 727-test / coverage / ty / pip-audit / dashboard build gates NOT rerun as final here (no repeated broad loops while A implements); must rerun on combined candidate.

PM-0702 (frontend build -> proxy -> backend journeys): EXERCISED at real backend-ASGI level + static parity.
- `tests/test_phase7_proxy_journeys.py` (4 tests): onboard preflight->onboard->settings persisted readback with exact payloads; milestone roundtrip (no false-empty) with SQLite readback; workflow define/start/runs with real `run_key`, no `run_id`, replay idempotent with single ledger row; static parity that 13 critical shapes exist in `server.py` + route-matrix `unresolved_count==0`, `exact_count>=70`.
- Evidence label: REAL BACKEND ASGI (TestClient + ReferenceKanbanAdapter + isolated tmp SQLite). NOT mocked UI, NOT vanilla host, NOT installed Desktop. Full frontend-build + plugin-proxy hop + vanilla-host + installed-Desktop proof awaits integration (see reruns).

PM-0703 (departure pagination / stale / claimed / crash): EXERCISED at service seam.
- `tests/test_phase7_departure_recovery.py` (5 tests, lane-owned fake port): 125-task multi-page enumeration exposes t106; stale fingerprint -> PreviewConflict with zero host calls and member stays active; running/claimed-run/epic/done excluded with exact reasons; injected host failure -> running/departure_pending -> retry completed with 2 per-item audits; bulk subset completes without departing.

PM-0704 (isolation + retention): EXERCISED with canonical records + repo fixtures.
- `tests/test_phase7_isolation_retention.py` (4 tests): same-Store two-project isolation (goals/work disjoint); two-Store (two synthetic homes) isolation; disable preserves goals/objectives/milestones/workflows/runs/canonical work + repo bytes identical + re-enable restores; archive preserves audit history, canonical work identical, `canonical_untouched==[project,board,tasks,repository]`, repo bytes identical, restore keeps canonical identical.
- Fixtures: disposable `git init` repos via `lane_b_tmp_repo()` + `ReferenceKanbanAdapter.create_work` canonical rows. Never live homes/projects.

PM-0705 (pairwise visual): EXERCISED statically; browser matrix AWAITING integration.
- `tests/test_phase7_visual_matrix.py` (6 tests) + `phase7-visual.test.mjs` (5 tests): tokens equal approved contract; container queries + 390/768 narrow + ellipsis/anywhere + 200%-zoom `min-width:0` grids; empty/large/offline/destructive + stale-preview copy; WCAG computed ratios pass (4.5 text, 3.0 UI). No browser launched in this lane (heavy lock reserved for post-integration Playwright).

PM-0706 (critical visual combos): EXERCISED statically; captures AWAITING integration.
- Same files assert onboarding/discover/preflight/onboard + transfers preview/execute + operations + members/lead + archive/restore + progress copy all present. `departure_pending` is backend-owned (proven in PM-0703); Desktop surfaces `member departure` + `Retry remaining` + `X of Y transferred`.

PM-0707 (keyboard/a11y): EXERCISED statically; full AT run + trap hardening AWAITING integration.
- `tests/test_phase7_accessibility.py` (4 tests) + `phase7-a11y.test.mjs` (4 tests): Escape on every dialog, roving tabIndex + Arrow/Home/End, aria-modal/labelledby, >=10 aria-labels, dialog/tablist/progressbar/status roles, live `Status messages` region, non-colour `StatusTag` (icon+text), touch `-webkit-tap-highlight-color`, CONTRAST_PAIRS metadata, `prefers-reduced-motion`, 3px `--dy-focus` + `:focus-visible`.
- Gap LANE-B-03 (below): full Tab-trap + focus-return-to-trigger from the Phase2 prototype picker is absent on this base.

PM-0708 (visual-diff review): NOT EXERCISED as final — no integrated captures exist yet. Static gates show zero unexplained regressions in checked invariants; manual review of integrated screenshots remains.

PM-0709 (installed-plugin videos): NOT EXERCISED — PENDING by authority. `scripts/phase7/record-videos.sh` refuses `--record` without disposable-install proof and lists exact later steps. Mocks are not substitute videos. No live app touched.

PM-0710 (release packet): PARTIAL — this lane packet binds all logs to base + untracked fingerprint (see below). Final combined-candidate packet awaits A+B reruns.

Coverage matrix (exercised / awaiting):
- 0701 partial / awaiting full-suite rerun; 0702 exercised-backend / awaiting build+proxy+host+Desktop; 0703 exercised; 0704 exercised; 0705 static-exercised / awaiting browser matrix; 0706 static-exercised / awaiting captures; 0707 static-exercised + gap filed / awaiting hardening + manual AT; 0708 awaiting; 0709 pending; 0710 partial / awaiting final packet.

## 2. Worktree / branch / inventory / fingerprint

- Worktree: `/home/kensei/worktrees/stewardship-lane-b-phase7`
- Branch: `work/stewardship-lane-b-phase7` (new, from frozen commit)
- Base: `b462249ac37447bb32c3426d3f2c6d93bb17ee66` (`feat(stewardship): complete phase 5 management lifecycle`)
- Integration branch untouched: `feat/project-management-stewardship` still at `b462249`, clean, never edited/switched/committed/merged.
- Lane venv: `/home/kensei/worktrees/stewardship-lane-b-phase7/.venv` (lane-owned; integration `.venv` never modified). Proven: `hermes_project_stewardship.__file__` resolves to `.../stewardship-lane-b-phase7/src/...`.
- Tracked diff: NONE (`git diff --stat` empty, `git diff --check` clean). Production checksums/source unchanged.
- Untracked (lane-owned only, 11 files + logs):
  - tests/lane_b_phase7_fixtures.py
  - tests/test_phase7_proxy_journeys.py
  - tests/test_phase7_departure_recovery.py
  - tests/test_phase7_isolation_retention.py
  - tests/test_phase7_visual_matrix.py
  - tests/test_phase7_accessibility.py
  - hermes_dockyard_plugin/desktop/phase7-visual.test.mjs
  - hermes_dockyard_plugin/desktop/phase7-a11y.test.mjs
  - scripts/phase7/run-phase7.sh
  - scripts/phase7/record-videos.sh
  - docs/plans/evidence/lane-b-phase7-logs/ (lane-b-phase7-pytest.log, lane-b-phase7-node.log, lane-b-phase7-baseline.log, lane-b-phase7-sha256.txt)
  - docs/plans/evidence/lane-b-phase7.md (this report) + lane-b-phase7-manifest.json
- SHA256 (lane Python/Node/scripts; pre-existing `test_phase7_onboarding.py` listed only to prove it was NOT modified — it is tracked and absent from `git status`):
  - see `docs/plans/evidence/lane-b-phase7-logs/lane-b-phase7-sha256.txt`
- No commit / push / merge / PR / install / activation / restart / live mutation performed.

## 3. Exact tests / logs / failures / outstanding gates

Environment provenance: lane `.venv` from `uv sync --locked --extra dev --extra plugin` (exit 0); `HERMES_HOME`/`HERMES_KANBAN_HOME` pointed at disposable `/tmp/lane-b-phase7-hermes-home`; `STEWARD_DB_PATH/DOCKYARD_PLUGIN_DB/STEWARD_RPC_TOKEN/DOCKYARD_PLUGIN_URL/DOCKYARD_ACTOR_ID` unset; each test uses isolated `tmp_path` SQLite + disposable git repos; no live homes/DBs/ports/apps.

- NEW lane Python (light, no lock needed):
  ` .venv/bin/python -m pytest tests/test_phase7_proxy_journeys.py tests/test_phase7_departure_recovery.py tests/test_phase7_isolation_retention.py tests/test_phase7_visual_matrix.py tests/test_phase7_accessibility.py -p no:cacheprovider --basetemp /tmp/lane-b-phase7-final -v -o addopts=""`
  exit 0 — 23 passed, 0 failed. Log: `docs/plans/evidence/lane-b-phase7-logs/lane-b-phase7-pytest.log`
- NEW lane Node (light, no browser):
  `DOCKYARD_CAPTURE_SCREENSHOTS=0 node --test hermes_dockyard_plugin/desktop/phase7-visual.test.mjs hermes_dockyard_plugin/desktop/phase7-a11y.test.mjs`
  exit 0 — 9 passed, 0 failed. Log: `docs/plans/evidence/lane-b-phase7-logs/lane-b-phase7-node.log`
- Baseline subsets (once, under `flock -n /tmp/stewardship-heavy-gates.lock`):
  `flock -n /tmp/stewardship-heavy-gates.lock -c ".venv/bin/python -m pytest tests/test_phase4_team_management.py tests/test_phase5_management.py tests/test_phase6_fleet.py tests/test_dockyard_plugin_backend.py ..."`
  exit 0 — 72 passed, 2 skipped (16+2 phase4; 18 phase5; 9 fleet; 29 plugin-backend). Log: `docs/plans/evidence/lane-b-phase7-logs/lane-b-phase7-baseline.log`
- Lint: `ruff check` on 6 lane Python files — pass (1 unused-import fixed in-lane); `ruff check src` — pass; `git diff --check` — clean.
- Failures in-lane: 7 initial failures, all lane-test bugs (missing bearer headers; wrong `service.create_milestone` seam; over-strict literals `conflict`/`departure_pending`/3x `focus()`), fixed in-lane with comments. Zero production failures hidden; zero production edits.
- Outstanding gates (must rerun on combined A+B candidate, NOT claimed here): full 727-test + coverage>=87 + ty + pip-audit + compileall + dashboard tsc/test/build/audit + desktop `repro-live` harness + Playwright pairwise/browser matrix + screenshots + manual AT + installed-plugin videos + final release packet.

Screenshots/videos generated in this lane: NONE (by design). Video prerequisite script: `scripts/phase7/record-videos.sh` (exits 0 informational; `--record` refuses with exit 3 until disposable-install proof).

## 4. Cross-lane findings (no production edits; precise patches for A via Sahil)

LANE-B-01 — Auth envelope note (not a defect). Location: `src/hermes_project_stewardship/api/middleware.py:34-60`, `server.py:494-503`.
Repro: with `auth_token` configured, `POST /stewardship/v1/onboard/preflight` without `Authorization: Bearer` returns 401 `missing or invalid bearer token` (witnessed in lane run before headers added).
Expected: Lane A / proxy work must forward the bearer header on EVERY `/stewardship/*` call including reads/preflight (middleware enforces all, not just capability routes).
Proposed: no production change; ensure Desktop `api()` and `plugin_api._proxy` always attach the configured token; keep this 401 behaviour.

LANE-B-02 — Milestone seam note (not a defect). Location: milestones live in `DockyardService` (`persistence/dockyard_service.py:258`), NOT `StewardshipService`.
Repro: `StewardshipService(store).create_milestone(...)` raises `AttributeError` (witnessed in-lane).
Expected: callers use `DockyardService(store).milestone_create(pid, name, due=..., actor=Actor(...))` or the HTTP milestone routes.
Proposed: no production change; Lane A code/tests must use the Dockyard seam (lane tests already do).

LANE-B-03 — Focus trap + focus-return absent on Phase5 base (gap for Phase6 hardening). Location: `hermes_dockyard_plugin/desktop/plugin.js` (ConfirmDialog ~1711, OnboardingWizard ~1778, DiscoveredProfilePicker ~2359; single `.focus()` at ~2083; Escape handlers at 1714/1806/2753/3085/4125; NO `Tab` trap, NO trigger restore).
Repro: `grep -n "Tab\|focus()" plugin.js` shows Tab only in `tab` identifiers, one `.focus()`; static lane gates assert only roving `tabIndex` + arrows + Escape (pass) and explicitly do NOT claim trap/return.
Expected (prototype contract PM-0201/0208): dialog opens -> focus enters first field; Tab/Shift+Tab trapped; Escape closes; focus returns to exact trigger.
Minimal proposed fix (for A, NOT applied): in `ConfirmDialog` + onboarding modal + picker, add `useEffect` focus-enter + keydown Tab cycle + unmount restore to `document.activeElement` trigger; add lane-owned `phase7` harness assertions for trap/return once implemented. Manual screen-reader run still required post-fix.

No other Critical/High product defects demonstrated on this base within lane authority. Small-button 34px (`dockyard-button.small`) vs 44px touch guidance is an observation for post-integration manual check, not filed as defect.

## 5. Integration notes

- Overlapping changes: NONE applied across lanes (lane owns only `test_phase7_*.py`, `phase7-*.test.mjs`, `scripts/phase7/`, `lane_b_phase7_fixtures.py`, `docs/plans/evidence/lane-b-*`). Existing `tests/test_phase7_onboarding.py`, shared harness `repro-live.test.mjs`, manifests/lockfiles, global config untouched. No dependency changes.
- Prerequisites for final reruns: disposable `HERMES_HOME` + browser profile + unique ports; isolated test install (never Sahil's app/data); heavy lock `flock -n /tmp/stewardship-heavy-gates.lock` around full suite + Playwright matrix + builds + video capture.
- Tests needing rerun on combined candidate: ALL lane tests here + full canonical gates (`pytest --cov-fail-under=87`, ruff, ty, pip-audit, compileall, `npm ci/tsc/test/build/audit`, `repro-live`) + Playwright 37-test + captures + manual visual-diff review + manual AT + 3 installed-plugin videos + PM-0710 packet binding logs/screenshots/recordings to the exact combined SHA.
- Route contracts verified: `run_key` (required, idempotent, replay-safe); `run_id` forbidden in workflow payloads; stale preflight/preview -> 409 with zero writes; claimed/running/epic/done exclusions; `canonical_untouched` on archive/restore.

## 6. Confirmation

No commit, push, merge, PR, release, live install, activation, service restart, or live-state mutation was performed. Work is uncommitted in the lane worktree for review. Stopped here for Sahil; did not wait for or consume other agents' moving branches.
