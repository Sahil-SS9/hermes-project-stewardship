# Phase 1 — Prove and repair vanilla foundations

Date: 2026-09-17/18 · Worker: KENSEI (direct execution, no delegation)
Candidate: hps/release-candidate-r3 (commits 2afa9e2, f1f7a51, + this phase's work)

## Task status

- [x] P1.1 Docs + upstream inspection. Official docs read (developer-guide/plugins
  — "Build a Hermes Plugin"; the dashboard plugin surface is documented there,
  manifest `api` files mount at /api/plugins/<name>/). Supported load gates found
  in code, not assumed: user plugins require `plugins.enabled` allow-list
  (#46435 trust gate) and the api path must resolve inside the plugin's dashboard/
  dir (GHSA-5qr3-c538-wm9j). Private imports treated as unstable — the fork-module host selection is now contract-probed (see adapter-selection repair under "Baseline-failure dispositions").
- [x] P1.2 Disposable environments: every run below under /tmp/hps-p1-*/ with
  isolated HERMES_HOME + HERMES_KANBAN_HOME, STEWARD_DB_PATH unset (env -u),
  PYTHONDONTWRITEBYTECODE=1, no inherited credentials (production env scrubbed;
  one composition verified with env -i). Imports recorded: candidate resolves to
  <worktree>/src (editable .pth verified), host tree explicit via PYTHONPATH.
  NOTE: two extra host deps (python-multipart, psutil) had to be installed into
  the relocated venv to import vanilla web_server — see "harness findings".
- [x] P1.3 Discovery/load/adapter selection on minimum + latest vanilla.
  Real-host composition proof (NOT our own wiring): copied the plugin into a
  disposable HERMES_HOME/plugins, enabled it in config.yaml, imported the
  vanilla web_server, ran _get_dashboard_plugins() + _mount_plugin_api_routes(),
  and exercised routes through the mounted app:
    discovered: ['hermes-dockyard', 'hermes-achievements', 'kanban']
    has_api: True | source: user
    plugin health: 200; dashboard read: 200;
    archive no-auth: 401; archive forged-actor with valid token: 409 (fail closed)
  Log: /tmp/hps-p1-hostcompose/ (inline) + lane logs below.
  Adapter-path assertion (both vanilla revisions, native mode):
    host_module: hermes_project_stewardship.kanban.vanilla_host
    rejected_host_module: None (vanilla trees); 'hermes_cli.project_kanban_host'
    on KenseiAgent — the personalised-host module is now DEMONSTRABLY unable to
    satisfy the lane (see P1.6/P1.3 adapter-selection repair), which is exactly the "must not satisfy" rule.
  Official `hermes plugins compat` checker on cdceca42 with plugin installed:
    "✓ No enabled plugin imports paths scheduled for removal on 2026-09-14."
- [x] P1.4/P1.5 Trusted-principal gap: reproduced and repaired at test level.
  New tests/test_plugin_authority_integration.py (7 cases, all green on the
  fallback lane where they run):
    valid session token -> 200 and archived_by == trusted principal (body
    actor 'forger' never used as authority — attribution column proves it)
    wrong session token -> 401, zero mutation (row still enabled=1)
    raw Bearer follows possession contract; Authorization precedence asserted
    token-absent host -> 401 fail-closed
    capability matrix: human+grant -> 200, agent-kind+no-grant -> 403
    unmanaged project -> 409 (fail-closed refusal, not silent success)
  Cross-project create guard already covered (test_plugin_create_queued_item_
  rejects_cross_project_initiative). Real-host mount path also exercised above.
- [x] P1.6 Native lifecycle coverage mapping: provision/create/assign/depend/
  review/complete/block/archive/restore/transfer all covered across
  test_vanilla_host, test_phase3_host_provisioning, test_pending_transfer_
  recovery, test_dockyard_plugin_backend (all green on both vanilla trees).
  Gap found while doing this: GET /onboard/discover 503'd for the in-process
  reference adapter (bridge.py), breaking the DESKTOP real-HTTP chain tests
  (milestone-chain / repro-live never ran green — pre-existing at 97e9918,
  PROVEN by running them at a dedicated /home/kensei/worktrees/hps-r2-baseline
  worktree, both failing identically there). Fixed server-side: discover now
  applies the same documented legacy in-process fallback preflight already
  uses (list_profiles authoritative + store's enabled projects), while a
  genuinely absent canonical host still fails closed 503 (existing test
  asserts that path; still green).
  Both desktop chain tests now PASS (was: fail at r2, fail at r3 before fix):
    milestone-chain: pass 1, repro-live: pass 30/30 steps.
  Root-causing along the way (all proven, not guessed):
    - both harness stubs predate the pending-transfers feature: no
      GET transfers/pending stub, and readback stubs lacked project_id, so
      r3's (correct) scope guard rejected the fake — fixed the STUBS to match
      the real backend contract (transfer.py line 329 returns project_id;
      sorted-first project in the fake is payments-relaunch, matching what the
      teams view targets). No production guard weakened.
    - milestone-chain "false-empty" text expected copy that existed in
      plugin.js only at dded7bc..b462249 era? — no: -S pickaxe shows the long
      message was present when the test was written and plugin.js since shows
      the short 'No milestones yet.' — Desktop is now the creation surface
      (D1), so the old copy ("Create one in the Dockyard dashboard") is stale
      and misleading. Fixed the COPY in plugin.js to an honest one and synced
      the test constant (both sides explicit, single source acknowledged).
    - PlanningPanel missing React keys (14-element inline-editor array +
      detail children) — real warning, fixed by keying every static child
      (matches the file's existing per-static-child key convention).
- [x] P1.7 Personalised identifiers removed from functional paths and generic
  product copy (production sweep now CLEAN: no octacon/remii/wesker/ceecee/
  gojo/mrhermagi/denji/quan/kensei/sahil/"/home/sahil" left in src,
  dashboard/src, desktop/plugin.js):
    - server.py: 6 model defaults actor/actor_id "sahil" -> "stewardship-api"
      (11 test files that relied on the default audited; the 5 flagged ones
      re-checked: all pass actor explicitly or via trusted_principal — zero
      tests depended on the personalised string; full suite confirms)
    - view_query.py docstring example de-personalised
    - api.ts: client no longer sends actor/actor_id at all (10 sites) — the
      proxy injects server-side attribution; extra "actor" fields were being
      silently dropped/422'd anyway (proved with a live proxy probe: 422
      extra_forbidden). FeaturePatchBody/TransitionBody/rename/update models
      verified against both shapes; dist/index.js rebuilt (sahil count: 0).
    - desktop plugin.js: rename call no longer sends actor_id; repo-path and
      member-list placeholders genericised ('/path/to/repo/project',
      'lead, reviewer').
    - Dashboard profile discovery already host-driven (list_profiles reads
      the actual host profiles dir) — no fabricated fleet anywhere.
- [x] P1.8 Version binding + CI lanes:
    - docs/surfaces/supported-host-revisions.md binds installed reference
      host c129a476 (v0.21.3), minimum vanilla 8c098e9e, latest upstream
      cdceca42 — each verified by full-suite native lanes (counts below),
      latest-upstream row updated from "pending" to measured once the lane
      landed.
    - scripts/native-host-lane.sh: runs the FULL suite with
      STEWARD_REQUIRE_NATIVE_HOST=1 against a given host tree, verifies the
      host's git SHA before running (guard proven: mismatched SHA aborts
      exit 2), and skips are converted to failures by the REQUIRE flag —
      required native tests fail, not skip. local-ci.sh (fallback gates)
      untouched and still green (it has no native cell).
    - scripts/phase6/run-latest-host-cell.sh: observed (b462249 era) — pins
      stale upstream a7254e2d (2026-09-13). Left in place; the new lane
      script supersedes it for this programme and takes the SHA explicitly.

## Baseline-failure dispositions (from Phase 0 hand-off)

- 2 migration failures (both native lanes): root-caused as harness scoping —
  IsolatedMigrationRunner + both fixtures scoped only HERMES_HOME while
  hermes_cli.kanban_db resolves the board umbrella from HERMES_KANBAN_HOME;
  writes leaked to the shared root and restore assertions compared the wrong
  directory. Fixed runner (_target_environment scopes/restores both) and both
  test fixtures. Green on all native lanes after.
- 5 onboarding 503s + 1 team failure on KenseiAgent: root cause = adapter
  factory preferred host-tree hermes_cli.project_kanban_host whenever
  importable; the installed fork class predates list_existing_projects, so
  discovery threw AttributeError -> host_contract_unavailable. Fixed via
  capability-contract selection (P1.3 adapter-selection repair): vanilla plugin implementation is
  canonical; a host module is chosen only if its capabilities() provably
  declares the full contract; rejections recorded in provenance. Regression
  test added (fake incomplete host -> rejected, vanilla used, provenance
  asserts). Fail-closed no-host behaviour preserved (existing subprocess test
  green). No vanilla code was patched.
- The phase4/phase6 failures that only appeared in full-suite runs: order
  contamination from the migration leak above — gone with the scoping fix.

## Lane results (final, post-fix, full suite, candidate ba3b671)

| Lane | Host | Result | Log |
|---|---|---|---|
| KA native (installed ref) | KenseiAgent c129a476 | 858 passed, 1 skipped (Windows branch), exit 0 | /tmp/hps-p1-v3-ka/final.log |
| Vanilla minimum | 8c098e9e | 857 passed, 2 skipped, exit 0 | /tmp/hps-p1-v3-vanold/final.log |
| Vanilla latest | cdceca42 | 857 passed, 2 skipped, exit 0 | /tmp/hps-p1-v3-vannew/final.log |
| Fallback (no host) | none | 814 passed, 38 host-optional skips, exit 0 | /tmp/hps-p1-v3-nohost/final.log |

JS gates on the same tree: dashboard 24/24; desktop chains milestone-chain +
repro-live both pass (0/2 at r2 and r3 before this phase); tsc clean.
Counts in the lane table were derived from pytest progress characters in
-q mode (exit markers present). Caveat recorded honestly: dot-counting
underreports collection-time skips (they never print a character), so
authoritative totals come from pytest's summary line — e.g. fallback lane
summary "814 passed, 39 skipped" vs dots 814+38; totals reconcile at 853
collected on both methods. No pass->skip regression exists; all lanes green.
All lanes: env -u STEWARD_DB_PATH, isolated HERMES_HOME + HERMES_KANBAN_HOME,
PYTHONDONTWRITEBYTECODE=1, candidate venv relocated (editable pointer
verified resolving to r3/src).


## Post-commit full verification (hermes verify --json, workspace, HEAD 532ce0f)

`hermes verify --json` → ok=true, exit 0. Phases:
- bootstrap: `uv venv .venv --allow-existing` + `uv sync --locked --extra dev --extra plugin` (exit 0; restored the lockfile-clean venv, removing the two ad-hoc host-only packages used by the P1.3 composition probe — historical logs retain that evidence; rerun host-mount composition via a dedicated env)
- test: `.venv/bin/python -m pytest` → 814 passed, 39 skipped, 0 failed, 122.5s
- start + readiness: uvicorn on 127.0.0.1:9310, GET /healthz -> 200 in 1.25s, clean shutdown
Raw JSON: /tmp/hps-p1-hermes-verify.json

## Harness findings (recorded honestly)

- The relocated .venv needed python-multipart + psutil added to import the
  vanilla web_server host (host deps, not plugin deps — pyproject
  dependencies remain []: the plugin never imports them).
- First discovery-fallback draft used the WRONG probe condition (checked the
  abstract-method identity); corrected by reproducing the real reference
  adapter behaviour before committing.
- One stash-pop mishap during bisection clobbered an uncommitted api.ts
  rewrite; recovered and re-applied cleanly (verified: api.ts sahil count 0,
  dist rebuilt, tsc + 24 dashboard tests + both desktop chains green after).
- pkill self-matching incident: two kill rounds matched my own shell cmdline;
  resolved with explicit PID kills; no lane results lost (all re-run on clean
  tree afterwards).

## Gate status

- Real vanilla plugin install/load + privileged proxy operations pass on
  supported targets: YES — host-mount composition proof (P1.3 bullet) and
  both vanilla revisions green on the full native lane.
- Negative authority tests pass: YES — 7 integration cases
  (test_plugin_authority_integration.py) plus the existing 401/403/409/503
  matrix.
- No KENSEI patch required: YES — vanilla trees untouched; the fork-module
  preference was fixed inside the plugin's own factory.
- Desktop real-HTTP journeys on the canonical chain: YES (2/2), from 0/2 at
  baseline.
- Green baseline ≠ vanilla certification: maintained — the fallback (no-host)
  lane is explicitly NOT vanilla evidence.

## Carried into Phase 2 (no absorption)

- P2.1 is already known from Phase 0 (WorkflowService.start writes `complete`
  after creating unassigned tasks) — Phase 2 starts with that regression.
- scripts/phase6/run-latest-host-cell.sh pins a stale upstream sha
  (a7254e2d, 2026-09-13); scripts/native-host-lane.sh supersedes it (takes
  the SHA explicitly, verifies before running).
- KENSEI's fork host class still lacks list_existing_projects; the plugin no
  longer depends on it (contract probe) but records
  rejected_host_module=hermes_cli.project_kanban_host until upstream catches
  up.
