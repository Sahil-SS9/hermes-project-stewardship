# Lane A — Phase 6 implementation, security and compatibility (evidence)

Status: COMPLETE FOR REVIEW — REVIEW ROUND 2. Round 1 evidence preserved
below; round 2 adds the three cross-lane findings (LANE-B-03, Lane C F3,
latest-host cell) with behavioural proof, plus the post-integration
combination run (A+B+C) and remaining real-browser/installation checks
see "Review round 2" and "Combined candidate" sections).

Lane: A (Phase 6). Branch: `work/stewardship-lane-a-phase6`.
Worktree: `/home/kensei/worktrees/stewardship-lane-a-phase6`.
Base (frozen): `b462249ac37447bb32c3426d3f2c6d93bb17ee66` (integration checkout
verified clean at this commit before lane start; Lane B and Lane C worktrees
observed occupied at the same commit and untouched).
Candidate: uncommitted working tree. No commit, push, merge, PR, installation
or live mutation performed by this lane.

Environment provenance: all Python gates ran with `uv run --locked
--extra dev --extra plugin` inside the lane worktree; `hermes_project_stewardship.__file__`
resolves to `/home/kensei/worktrees/stewardship-lane-a-phase6/src/hermes_project_stewardship/__init__.py`
(provenance proven, not assumed from cwd). The lane venv was created with the
canonical `uv sync --locked --extra dev --extra plugin`; `uv.lock` was NOT
modified. One lane-venv-only addition (`pyyaml`, `uv pip install`) was needed
because the pinned vanilla runtime's `hermes_cli.config` imports it; this is a
host-runtime dependency, not a project dependency, and lives only in the
lane's disposable `.venv`.

## PM-ID status (coordinator to reconcile into the shared plan)

| PM-ID | Status | Evidence |
|---|---|---|
| PM-0601 | DONE (candidate) | `docs/surfaces/supported-surfaces.md` documents the exact dashboard subset (41 calls, mechanically extracted from `dashboard/src/api.ts`); drift-guarded by `tests/test_phase6_surface_doc.py::test_pm0601_documented_dashboard_subset_matches_frontend_calls`. Desktop stated as the complete surface. TUI explicitly unsupported (deferred backlog); messaging limited to discovery/approval (see PM-0603). |
| PM-0602 | DONE (candidate) | Essential CLI implemented in `src/hermes_project_stewardship/cli/app.py`: `team members` (incl. `departure_pending`), `transfer list/retry` (durable operation journal; fail-closed without a host runtime), `project archive [--list]`, `project restore`, `content remove --confirm` (refuses without explicit confirmation, exit 1, leaving state untouched). Tests: `tests/test_phase6_surface_cli.py` (11 tests). |
| PM-0603 | DONE (candidate) | `GatewayCommandHandler.DESTRUCTIVE_COMMANDS` in `src/hermes_project_stewardship/gateway/handler.py` refuses destructive verbs over messaging with an explicit surface statement (never "unknown command", never executed). Deep links: no `hermes://` scheme fabricated anywhere (negative tests on templates + dashboard SDK; PM-0014 spike evidence referenced). Tests: `tests/test_phase6_security_parity.py::test_pm0603_*`. |
| PM-0604 | DONE (candidate) | Verified-principal enforcement pre-existed server-side (`_membership_authority`: 503 without principal, 403 without capability); Phase 6 adds fail-closed and browser-origin tests: `tests/test_phase6_security_parity.py::test_pm0604_*` (no-principal 503, zero-capability 403, wrong token 401, cross-site form POST refused, unsafe methods not auth-exempt). CSRF assumption pinned: bearer-token-only auth; any future cookie scheme must re-prove. |
| PM-0605 | DONE (candidate) | Route-parity contract test through the REAL plugin proxy hop: `tests/test_phase6_security_parity.py::test_pm0605_every_dashboard_call_resolves_to_backend_route` (14 method/path shapes through `plugin_api` → ASGI backend). It caught a REAL defect: `GET/PATCH /projects/{id}/features` existed on the backend and were called by the dashboard, but had no proxy hop (raw `{"detail": "Not Found"}` route-miss). Fixed by adding the two proxy routes + `FeaturePatchBody` in `hermes_dockyard_plugin/dashboard/plugin_api.py`. False-empty regression also pinned (`test_pm0605_backend_route_surface_has_no_false_empty_substitution`). Phase 0 matrix (`docs/plans/evidence/project-management-route-matrix.json`: 72 exact, 5 flagged-resolved, 0 unresolved) re-verified in spirit by the live proxy test; schema-level parity remains Desktop-harness territory (Phase 7). |
| PM-0606 | PARTIAL — real-host cells proven at the pinned MINIMUM only; LATEST cell unproven (no newer checkout available locally — named gap, not invented). | Matrix cells proven against vanilla `8c098e9e819169879a7b2f74990e83b5d39696c8` via `tests/test_phase6_compatibility.py::test_pm0606_native_host_matrix_cells` (STEWARD_REQUIRE_NATIVE_HOST=1, PYTHONPATH=<read-only vanilla checkout>, disposable /tmp homes): clean install (provision+readback), upgrade (re-open same home), separate-process home isolation, stale profile, plugin-data retention (`resolve_db_path()` under HERMES_HOME, outside install dir). Default-only/multiple-profile and stale-profile behaviours also unit-proven without a host. Clean/disable/uninstall-reinstall retention cells for the REAL installed Desktop plugin: PENDING (per handoff: isolated test installation is allowed only in lane-owned disposable dirs and must never touch the user's installed Desktop; safe local install of the real desktop plugin was not performed in this lane — report as pending gate for Phase 7/integration). Version targets are recorded, not invented: minimum `8c098e9e…`, recommended upstream `866332bf…` (both from the Phase 0 spike; enforced by `test_pm0606_recorded_version_targets_exist_in_phase0_evidence`). Shipped manifest v1-shape enforced by `test_pm0606_shipped_manifest_is_v1_supported_shape`. |
| PM-0607 | DONE (candidate) | Import-isolation guard: no production module outside `vanilla_host.py` imports `hermes_cli`/`hermes_constants` (`test_pm0607_all_hermes_imports_are_isolated_in_vanilla_host`); CLI import leaves internals unloaded (`test_pm0607_importing_cli_never_imports_hermes_internals`); API-server module import in a clean subprocess without Hermes runtime loads no internals (`test_pm0607_server_import_without_hermes_runtime_is_clean`); adapter factory fails closed with `host_contract_unavailable` when no runtime exists (`test_pm0607_adapter_factory_fails_closed_without_host`). The four private imports (`hermes_constants`, `hermes_cli.kanban_db`, `hermes_cli.projects_db`, `hermes_cli.kanban_db_connect`) remain lazily isolated behind `ProjectKanbanHost` (the tested compatibility adapter); `host_provenance` records the actually-imported host truthfully. No unguarded Kensei-only imports found (mechanical sweep). |

## Implementation summary (plain English)

1. Essential recovery CLI (PM-0602): stewardctl gained `team members`,
   `transfer list/retry`, `project archive/restore`, and
   `content remove --confirm`. Transfer retry refuses (exit 1) unless the
   operator passes `--hermes-home` AND the vanilla runtime is importable —
   the journal is never touched on refusal, so nothing is reported recovered
   that is not. Managed-file removal without `--confirm` exits 1 with guidance
   and leaves the file and its DB state untouched.
2. Messaging truthfulness (PM-0603): destructive verbs are refused with an
   explicit statement naming the Desktop/CLI surfaces; reads, approvals and
   cycle triggers are unchanged; no fabricated deep-link schemes.
3. Security tests (PM-0604): the fail-closed principal contract now has
   negative-path proof at the HTTP layer, including a cross-site form POST
   (Origin/Referer evil.example) and auth-exemption checks on unsafe methods.
4. Route parity (PM-0605): a live proxy→backend contract test now runs on
   every candidate; it found and the lane fixed the missing features proxy
   hop. The test asserts failures cross the proxy as real error envelopes and
   treats FastAPI's bare `{"detail": "Not Found"}` as the forbidden
   false-surface signature.
5. Surface documentation (PM-0601): `docs/surfaces/supported-surfaces.md`
   states exactly what Desktop, Dashboard, CLI and messaging support,
   including the "not available" list per surface, kept mechanically honest
   against the frontend source.
6. Compatibility (PM-0606/0607): version targets bound to recorded Phase 0
   evidence; real-host matrix cells proven at the pinned minimum; import
   isolation enforced by tests at three layers.

## Changed-file inventory (tracked)

- `src/hermes_project_stewardship/cli/app.py` (+226/-0): PM-0602 essential CLI.
- `src/hermes_project_stewardship/gateway/handler.py` (+18/-0): PM-0603 refusal contract.
- `hermes_dockyard_plugin/dashboard/plugin_api.py` (+19/-0): PM-0605 features proxy hop + FeaturePatchBody.

Untracked (lane-owned, new):

- `docs/surfaces/supported-surfaces.md` (PM-0601 documentation)
- `tests/test_phase6_surface_cli.py`
- `tests/test_phase6_security_parity.py`
- `tests/test_phase6_surface_doc.py`
- `tests/test_phase6_compatibility.py`
- `docs/plans/evidence/lane-a-phase6.md` (this report)

Tracked diff sha256 (git diff): `a070baee5bd189fe…` (first 16 hex).
Combined candidate fingerprint including untracked files:
`820d181bb0c7abb6` (sha256 over tracked-diff hash + the five code/doc
untracked paths + contents, excluding this self-referential report file;
recompute before integration). Bind all verdicts to base
`b462249ac37447bb32c3426d3f2c6d93bb17ee66` + this fingerprint.

## Focused test evidence (RED→GREEN)

- Initial RED (preserved): 16 failed / 14 passed / 1 skipped across the four
  new Phase 6 test files at first run — the genuine Phase 6 gaps (missing CLI
  surface, missing gateway refusal contract, missing parity coverage, etc.).
  Three RED expectations were corrected during the work after discovery of the
  real contracts (proxy-hopper parity, manifest v1-shape, gateway read
  semantics for deny-all senders); the corrected forms are the ones recorded
  here. The 11 original CLI/security RED failures were turned GREEN by the
  production delta; the parity discovery failures were turned GREEN by the
  features proxy fix.
- Final focused run: 33 passed, 1 skipped (`test_pm0606_native_host_matrix_cells`
  skips without the native runtime; it PASSES with it, see below).
- Real-host run: `STEWARD_REQUIRE_NATIVE_HOST=1 PYTHONPATH=/home/kensei/repos/hermes-agent-vanilla
  uv run … pytest tests/test_phase6_compatibility.py` → 10 passed, 0 failed,
  exit 0 (vanilla `8c098e9e…`, disposable /tmp homes, read-only checkout).
- Native host lane was NOT bypassed: without PYTHONPATH the matrix test skips
  honestly; with it, it runs against the real host. `STEWARD_REQUIRE_NATIVE_HOST=1`
  was honoured in the same run.
- Logs: focused-run transcripts in `/tmp/stewardship-lane-a-logs/` alongside
  the gate logs; raw per-gate logs listed below.

## Label discipline

- Rendered SDK-mock journeys: not produced by this lane (Desktop harness is
  run below and remains labelled as the pre-existing mock journey).
- Real Python proxy evidence: `test_pm0605_every_dashboard_call_resolves_to_backend_route`
  (TestClient → plugin_api router → ASGI backend → SQLite; in-process, no live server).
- Real host evidence: `test_pm0606_native_host_matrix_cells` (vanilla `8c098e9e…`).
- Installed-Desktop evidence: NOT produced (pending; see PM-0606 row).

## Canonical gates

Appended below when the background gate run completes; all heavy suites ran
sequentially under `flock -n /tmp/stewardship-heavy-gates.lock` (shared with
Lanes B/C; non-blocking, defer-not-compete).

<!-- GATES -->

### Canonical gate results (2026-09-13, lane worktree, `uv run --locked --extra dev --extra plugin`)

All heavy suites ran sequentially under the shared non-blocking flock
(`flock -n /tmp/stewardship-heavy-gates.lock`, acquired 23:05:22 BST; no
contention — no other lane held it).

| Gate | Command | Exit | Result | Raw log |
|---|---|---|---|---|
| Full Python + coverage | `pytest --cov=hermes_project_stewardship --cov-report=term --cov-fail-under=87` | 0 | **760 passed, 38 skipped**, coverage **87.06%** (floor 87%) | `/tmp/stewardship-lane-a-logs/full-pytest.log` |
| Ruff | `ruff check src` | 0 | All checks passed | `/tmp/stewardship-lane-a-logs/ruff.log` |
| ty | `ty check src/.../allowlist.py src/.../middleware.py src/.../plugin.py src/.../store.py` | 0 | All checks passed | `/tmp/stewardship-lane-a-logs/ty.log` |
| compileall | `python -m compileall src tests` | 0 | PASS | `/tmp/stewardship-lane-a-logs/compileall.log` |
| pip-audit | `pip-audit` | 0 | No vulnerabilities (self-package "not on PyPI" note is informational) | `/tmp/stewardship-lane-a-logs/pip-audit.log` |
| npm ci | `npm ci` (dashboard) | 0 | PASS | `/tmp/stewardship-lane-a-logs/npm-ci.log` |
| TypeScript | `npx tsc --noEmit` | 0 | PASS | `/tmp/stewardship-lane-a-logs/tsc.log` |
| Dashboard tests | `npm test` | 0 | **23 tests, 23 pass, 0 fail** | `/tmp/stewardship-lane-a-logs/npm-test.log` |
| Dashboard build | `npm run build` | 0 | PASS | `/tmp/stewardship-lane-a-logs/npm-build.log` |
| Dependency audit | `npm audit --omit=dev` | 0 | found 0 vulnerabilities | `/tmp/stewardship-lane-a-logs/npm-audit.log` |
| Desktop harness | `DOCKYARD_CAPTURE_SCREENSHOTS=0 node --experimental-vm-modules --test repro-live.test.mjs` | 0 | **PASS_SUMMARY=30/30** (rendered SDK-mock journey, per label discipline) | `/tmp/stewardship-lane-a-logs/desktop-harness.log` |

Count reconciliation against the Phase 5 reported baseline (727 passed /
37 skipped, historical, not a fresh gate): 727 + 33 new Phase 6 tests = 760
passed; 37 + 1 native-host matrix skip = 38 skipped. No pre-existing test was
weakened, deleted or skipped to make the suite pass.

### `hermes verify --json` (full runtime verification, post-gates)

- Command: `hermes verify --json . --timeout 600 --ready-timeout 60`
- Log: `/tmp/stewardship-lane-a-logs/hermes-verify.log`
- Result: **`ok: true`** — phases: bootstrap `uv venv` exit 0, bootstrap
  `uv sync --locked --extra dev --extra plugin` exit 0, test
  `.venv/bin/python -m pytest` exit 0 (**760 passed, 38 skipped**, 147.4s),
  readiness `http://127.0.0.1:9310/healthz` → **HTTP 200** with uvicorn
  startup + clean shutdown in the tail. This is the fresh, full-suite
  verification bound to the exact uncommitted candidate described above
  (base `b462249…`, tracked diff `a070baee5bd189fe`, candidate fingerprint
  `820d181bb0c7abb6`).

## Cross-lane findings (not edited — outside lane A ownership)

1. `tests/test_phase6_fleet.py` (pre-existing, predates the Phase 6 numbering;
   not owned by this lane's PM-060x work): untouched. No conflict with the new
   `test_phase6_*.py` files (different filenames, no duplicate module names).
2. `src/hermes_project_stewardship/api/server.py:2232` module-level
   `app = create_app()` invokes `create_project_kanban_adapter()` at import
   time. This is guarded and fails closed, but it means importing the module
   on a host WITH a Hermes runtime eagerly constructs an adapter bound to
   `get_hermes_home()`. Finding: if the plugin host imports `api.server` while
   `HERMES_HOME` points at a live home, the module-level app binds that home —
   consistent with the one-home-per-process contract (PM-0014 spike), but
   worth a Phase 7/integration look to confirm the Desktop host never imports
   this module with an unintended `HERMES_HOME`. Proposed fix (if wanted):
   lazy-construct the module-level `app` via `__getattr__` (PEP 562). No edit
   made (outside lane A's minimal-delta ownership for this candidate).
3. `hermes_dockyard_plugin/desktop/repro-live.test.mjs` and dashboard tests
   are owned by Lane B/C surfaces; this lane did not modify them. If the
   features-proxy routes added here should be mirrored in Desktop-harness
   fixtures, that is an integration note for the coordinator (below).

## Integration notes for the coordinator

- Overlap risk: low. Lane A touched only `cli/app.py`, `gateway/handler.py`,
  `dashboard/plugin_api.py` + new files. Lane B's `test_phase7_*`,
  `scripts/phase7/` and Lane C's docs/README were not touched.
- Rerun on the combined candidate: the full Python suite, the Desktop harness
  (`repro-live.test.mjs`), and `npm test` — especially because Lane B's final
  tests will integrate against this delta. The route-parity proxy test
  (`test_pm0605_*`) should be rerun if any lane touches `plugin_api.py` or
  `api/server.py`.
- `pyyaml` note: any lane running real-host cells against the vanilla checkout
  needs `pyyaml` importable in its venv (vanilla's `hermes_cli.config`
  requires it). This is a host-side dependency; consider recording it in the
  Phase 7 real-host runbook.
- Tests needing the shared heavy-gate lock on the combined candidate: full
  pytest/coverage, npm suite, Desktop harness (same lock path
  `/tmp/stewardship-heavy-gates.lock`).

## No-commit confirmation

No commit, push, PR, merge, rebase, tag, installation, activation, service
restart or live-state mutation was performed by this lane. The integration
checkout at `/home/kensei/repos/hermes-project-stewardship` remains clean and
unmodified (verified before lane start; not touched since). The lane's entire
candidate is the uncommitted working tree of
`/home/kensei/worktrees/stewardship-lane-a-phase6` at branch
`work/stewardship-lane-a-phase6`.


---

# Review round 2 — cross-lane findings, outcomes and fresh evidence

## Finding 1 (Lane B, LANE-B-03) — dialog focus trap and focus return: CONFIRMED, FIXED

Investigation (behavioural, not source-string): a jsdom probe driving the
real plugin through real user flows (project tab -> Objectives view ->
mission "Archive" -> ConfirmDialog; console-bar "New project" ->
OnboardingWizard) confirmed the base had no initial-focus move, no Tab
containment and no trigger restore. Escape existed and worked on all dialogs.

Minimal fix (`hermes_dockyard_plugin/desktop/plugin.js`, +54 lines):
`useDialogFocusManager(containerSelector)` — on mount captures
`document.activeElement` (the trigger), moves focus to the first enabled,
non-hidden focusable element inside the dialog; traps Tab/Shift+Tab by
cycling within the dialog on real keydowns (capture listener); on unmount
restores focus to the captured trigger. Wired into `ConfirmDialog` and
`OnboardingWizard` only. `DiscoveredProfilePicker` was deliberately NOT
wired: it is an inline field, not a modal — trapping Tab inside it would
make the rest of the page keyboard-unreachable, and inside the wizard it is
already covered by the wizard's dialog-level manager. Constrained to
`useState`/`useEffect` (the shared harness stub's destructure set) so
`repro-live.test.mjs` keeps working unchanged.

Behavioural tests (`hermes_dockyard_plugin/desktop/phase6-focus.test.mjs`,
4 tests, all passing): initial focus inside the dialog; Tab from the last
control wraps to the first and Shift+Tab from the first wraps to the last;
Tab never escapes across a full cycle +2 presses; Escape unmounts and focus
returns to the exact trigger element; wizard containment while typing in
step 1; containment while the dialog is busy. Real KeyboardEvents and real
focus — no source inspection.

## Finding 2 (Lane C, F3) — export/restore excludes managed content: CONFIRMED, DOCUMENTED, NO CODE CHANGE

Behavioural proof (`tests/test_phase6_export_content_proof.py`, 2 tests):
upload a managed file -> `export_store` -> `restore_store` into a clean
directory -> the restored database carries `project_content` rows whose
files do not exist in the restored home (no content root is created), and
`remove_project_content` on such a row fails closed with ServiceError
"unavailable" (identity verification refuses, exactly as designed). The
second test proves databases without managed content restore fully usable —
the gap is specific to managed files.

Conclusion: any promised recovery behaviour that assumes managed files
survive export/restore is INCOMPLETE. The truthful operator contract is: the
archive contains the database only; the managed-content root
(`<database parent>/project-content/`) must be backed up separately. Lane C's
documentation (README + `docs/guides/migration-backup-recovery.md` section 2)
is correct. Per instruction, no backup-feature expansion was made. Options
for a future approved change (not implemented): export-time warning in the
manifest, or a content-root backup helper.

## Finding 3 — latest-host compatibility cell: CLOSED with real evidence

Read-only discovery (2026-09-13, no checkout/installation touched): current
upstream main is `a7254e2d4c170725a4136591e96efc5066251d2c`
(NousResearch/hermes-agent). Both compatibility seams are UNCHANGED from the
pinned minimum `8c098e9e...`: the installer still gates at
`_SUPPORTED_MANIFEST_VERSION = 1` (`hermes_cli/plugins_cmd.py:161`) and the
host still mounts plugin routers via `_mount_plugin_api_routes()`
(`hermes_cli/web_server.py:984`). The shipped v1-shape manifest and the
`plugin_api` router contract remain the supported interface.

The cell was then EXECUTED: `scripts/phase6/run-latest-host-cell.sh` clones
upstream at that SHA into a disposable /tmp dir, re-verifies both seams from
the fetched sources, and runs the full Phase 6 compatibility suite with
`STEWARD_REQUIRE_NATIVE_HOST=1` against the fresh clone. Result: **10
passed, exit 0** (`/tmp/stewardship-lane-a-logs/pm0606-latest-host.log`).
The shared vanilla snapshot stayed byte-clean at `8c098e9e...` (verified
after the run) and the disposable clone was removed. PM-0606's remaining
open item is now only the installed-Desktop lifecycle cells (unchanged,
Phase 7/integration).

## Round 2 regression binding (everything rerun after the plugin.js fix)

- Full pytest + coverage: **762 passed, 38 skipped**, coverage **87.07%**
  (floor 87), exit 0 — `full-pytest-r2.log` (760 round 1 + 2 new proof tests).
- Desktop harness `repro-live.test.mjs`: PASS_SUMMARY=**30/30** (unchanged
  harness, proving the hook did not break the shared stub contract).
- Focus tests: **4/4 pass** (same run as the harness).
- Dashboard: tsc clean, npm test **23/23**, build pass, audit 0 vulnerabilities.
- ruff + ty: pass.
- Updated fingerprints: tracked diff sha256 `e395be4258e8ad9a` (first 16);
  combined candidate fingerprint including untracked files (excluding this
  report): `75d639642cd085ad`. Round-1 fingerprints are superseded; bind
  round-2 verdicts to base `b462249...` + these values.
