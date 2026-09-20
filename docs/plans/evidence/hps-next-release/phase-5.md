# HPS next release — Phase 5 evidence

Candidate: `/home/kensei/worktrees/stewardship-release-candidate-r3`
Status: **PASSED** — backend, security, worker lifecycle AND the rendered UI end-to-end journey are verified with fresh, reproducible evidence.

## Delivered

- Versioned reusable workflow templates and project-owned instances with immutable provenance snapshots.
- Team/group binding, assignment precedence, host-profile discovery and membership validation at bind AND start.
- Validated dependency graph with canonical native task links, conditional branches, bounded loops, iteration identity and human-gate escalation.
- Truthful run lifecycle: `start()` materialises canonical tasks and keeps the run `pending`; `complete` is derived only when `advance()` observes terminal canonical task/gate states (regression: `tests/test_workflow_api.py`, `tests/test_workflow_recovery.py`).
- Trusted-human authority for graph revision decisions: `actor_id` payloads are attribution only; unauthenticated decisions fail closed with 503; authorised human principal with server-composed `workflow_revision_approval` capability proceeds (`tests/test_phase5_team_bound_workflows.py`).
- Membership hardening: empty-team bypass removed; overrides naming non-members are refused at binding time; phase_team naming undiscovered profiles is refused at start.

## Genuine worker-lifecycle gate (new, audit-closing)

`tests/test_phase5_worker_lifecycle.py` — pinned vanilla checkout
`/home/kensei/repos/hermes-agent-vanilla` at `8c098e9e819169879a7b2f74990e83b5d39696c8`,
disposable `tmp_path` Hermes + stewardship state, no model, no live fleet:

1. Real team binding: a bot group is created with a discovered member profile;
   `set_binding(group_id=…)` records it; an override naming a non-member
   profile is refused at binding time; a `phase_team` naming an undiscovered
   profile is refused at start.
2. Canonical claim: `hermes_cli.kanban_db.claim_task` atomically transitions
   the materialised task `ready → running` with a claim lease; a second
   concurrent claim is refused (single lease).
3. Worker result: `complete_task(expected_run_id=…)` records the worker's
   result on the canonical task; a duplicate replay against the closed claim
   cannot overwrite the recorded result.
4. Human gate: the reviewer drives the canonical review lifecycle
   (specify → review → approval) on the gate work item.
5. Truthful completion: `advance()` derives run `complete` from the canonical
   outcomes; before that the run reports `pending`. Exactly one side effect
   per node.

## Rendered UI end-to-end journey (P5.10, audit-closing) — this session

Real plugin bundle, real canonical backend + vanilla Kanban host, disposable
demo data, zero page errors:

```
STEWARD_DESKTOP_URL=http://127.0.0.1:19500/desktop \
  node --test hermes_dockyard_plugin/desktop/phase5-ui-journey.test.mjs
→ 1 passed
```

The journey proves through the rendered Desktop surface and the plugin's own
fetch proxy:

1. Real team binding: a bot group with a real registered member is created
   and bound to the workflow via `PUT /binding`; read-back confirms it.
2. Start run: canonical tasks materialise; the UI Live execution panel shows
   the truthful `pending` state.
3. Canonical transitions through the real lifecycle; `advance` derives run
   `complete` only from terminal canonical states.
4. Over-policy revision proposal (7 nodes > limit 5) → `awaiting_approval`.
5. Trusted-human approval via the UI decide endpoint with a FORGED payload
   `actor_id`: succeeds only because the host session carries
   `workflow_revision_approval`; recorded `decided_by` is the trusted
   principal (`demo-owner`), never the forged actor.
6. Negative authority: a human principal WITHOUT the capability → **403**.
7. Plugin proxy surface completed: binding GET/PUT, advance, proposals,
   revisions list/decide, project bot registration, bot-group creation
   (`hermes_dockyard_plugin/dashboard/plugin_api.py`).

## Verification (fresh, this session)

```
env -u HERMES_DELEGATED_CHILD_CONTEXT -u HERMES_AGENT_DELEGATED_CHILD_CONTEXT \
  PYTHONPATH=src:/home/kensei/repos/hermes-agent-vanilla \
  .venv/bin/pytest -p no:warnings --tb=short
→ 892 passed, 2 skipped
```

- Worker lifecycle lane: `tests/test_phase5_worker_lifecycle.py`: **1 passed**.
- Native execution lane: `tests/test_phase5_vanilla_execution_lane.py`: **1 passed**.
- Store/API acceptance: `tests/test_phase5_team_bound_workflows.py`: **9 passed**.
- Workflow API/recovery regressions: passed (pending-after-materialisation asserted).
- Both vanilla lanes pin `HERMES_HOME`/`HERMES_KANBAN_HOME` to tmp_path and
  purge cached `hermes_cli`/`agent.*` modules so earlier suites cannot leak
  state into the lane.
- Full Desktop browser suite (phase 3/4/5/6/7 rendered journeys, backlog
  slice, phase6 focus, phase7 a11y/visual, canvas mount/browser): **26 passed, 0 failed**.

## Gate decision

**PASSED.** All Phase 5 gates — backend, security/authority, membership,
genuine worker claim→result on vanilla, and the single rendered end-to-end
UI journey with trusted-human revision approval — are green with the exact
commands above. Nothing deployed; no live data touched.