# HPS next release — Phase 3 evidence

**Candidate:** `/home/kensei/worktrees/stewardship-release-candidate-r3`
**Phase:** 3 — Establish navigation and project scope
**HEAD at verification:** `e538c2cc505c89abbff66f18d957304f94199991` (working tree intentionally dirty; Phase 2 and signed-off Backlog/Workflows changes preserved)
**Status:** **PASSED — disposable in-process host, candidate bundle, canonical project data, and full rendered browser journey verified**

## Implemented

- Consolidated the Desktop shell navigation into the authorised sequence: Dashboard, Objectives, Delivery, Work, Backlog, Workflows, Reports, Approval Inbox, Notifications, Onboard, Settings.
- Added a persistent, labelled header project switcher sourced from the loaded project list. Project selection routes project-scoped tabs to the selected project; Dashboard, Approval Inbox and Notifications remain fleet-level surfaces.
- Removed silent first-project substitution for explicit project IDs in Backlog and Saved Views/Workflows loaders. Unknown explicit IDs now produce a missing-project state.
- Added serial/request identity protection to the shell loader. A late response from an earlier tab/project request cannot replace the current payload or error state.
- Added dirty-project switch confirmation seam in the shell; switching away from a dirty project requires explicit discard confirmation.
- Preserved the existing real-data Dashboard metric/attention surfaces and existing panel content; no backend, live data, deployment, merge or publication changes were made.

## Exact verification

Commands run from the candidate:

```text
node --check desktop/plugin.js
exit 0

node hermes_dockyard_plugin/desktop/backlog-slice.test.mjs
2 passed, 0 failed; exit 0

node hermes_dockyard_plugin/desktop/workflow-canvas-mount.test.mjs
2 passed, 0 failed; exit 0

`npm install --ignore-scripts` and `node build.mjs` in `hermes_dockyard_plugin/dashboard`
exit 0 — rebuilt `dist/index.js` (116139 bytes) and `dist/style.css` (17591 bytes).

`env -u HERMES_DELEGATED_CHILD_CONTEXT node /tmp/phase3-host.mjs` (fresh disposable in-process host; candidate bundle and disposable seeded project data; 127.0.0.1:19500)
`curl -fsS http://127.0.0.1:19500/health`
`{"status":"ok","bundle":"candidate"}`
`sha256sum /tmp/phase3-bundle.js`
`c28c4683207728a5f95677ee95eb0735716a2c7507fb64f92834b6a28c7f9208`

node hermes_dockyard_plugin/desktop/phase3-rendered-browser.test.mjs
1 passed, 0 failed; exit 0 — full rendered journey verified: navigation, keyboard activation, project scope switching, dirty cancel/discard, computed styles, narrow body overflow, and real-data readback; zero page errors.

node hermes_dockyard_plugin/desktop/workflow-canvas-browser.test.mjs
1 passed, 0 failed; exit 0

git diff --check
exit 0

pytest -q
exit 127 — pytest is not installed on PATH

uv run pytest -q
exit 2 — collection stopped because the editable environment imported
hermes_project_stewardship from /home/kensei/worktrees/stewardship-combined-r2,
not this candidate. The same failure remained with PYTHONPATH unset.
```

The full Phase 3 browser journey ran against the fresh disposable host and candidate bundle. The host served seeded disposable canonical project data and returned a healthy response before the browser gate. No live service, deployment, publication, merge, or Phase 4 work was started.

## Gate decision

**PASSED.** Phase 3 rendered Desktop verification is green. Phase 4 was not started.
