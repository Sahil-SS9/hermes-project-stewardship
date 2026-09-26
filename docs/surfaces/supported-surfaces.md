# Supported surfaces — Project Stewardship (Phase 6, PM-0601/0603)

Status: Phase 6 lane A candidate documentation. Authoritative plan:
`docs/plans/2026-09-10-project-management-stewardship.md` (§ Release shape).

This document states exactly what each surface supports. Unsupported
capabilities are named explicitly; nothing is implied.

## Hermes Desktop — the complete management surface

Desktop (`hermes_dockyard_plugin/desktop/plugin.js`) is the complete product
surface. The committed file is generated from the hand-edited modules in
`hermes_dockyard_plugin/desktop/src/`; run
`node hermes_dockyard_plugin/desktop/build.mjs` after editing those modules.
The generated blob is a single ESM bundle and may import only the SDK and React
allowlist. Every management operation is available there: onboarding, team
membership, lead transfer, work transfer/reassignment with previews and
recovery, goals/objectives/milestones, workflows, managed content (including
dependency-aware removal), project lifecycle including archive/restore,
settings, audit and health.

## Dashboard — documented subset (shared contracts, bounded management scope)

The dashboard plugin (`hermes_dockyard_plugin/dashboard/`) reuses the same
backend contracts and is a documented SUBSET of Desktop: read/decision
surfaces, work-item management, milestones, backlog and feature toggles,
plus the onboarding flow. Every call is proxied to the identical backend
method/path — no separate contract.

Exact backend calls the dashboard frontend can make (mechanically extracted
from `dashboard/src/api.ts`; kept honest by
`tests/test_phase6_surface_doc.py`):

```text
GET   /dashboard
GET   /health
GET   /inbox
GET   /initiatives/{ref}/decision
GET   /initiatives/{ref}/decision/receipts
GET   /notifications
GET   /onboard/discover
GET   /portfolio
GET   /projects/{id}/backlog
GET   /projects/{id}/features
GET   /projects/{id}/initiatives
GET   /projects/{id}/milestones
GET   /projects/{id}/milestones/{name}
GET   /projects/{id}/objectives
GET   /projects/{id}/observations
GET   /projects/{id}/views
GET   /projects/{id}/work-items
GET   /projects/{id}/work-items/{ref}
GET   /projects/{id}/workflows/{name}/runs
PATCH /projects/{id}/features
PATCH /projects/{id}/milestones/{name}
PATCH /projects/{id}/work-items/{ref}
POST  /initiatives/{ref}/approve
POST  /initiatives/{ref}/complete
POST  /initiatives/{ref}/reject
POST  /notifications/{id}/ack
POST  /observations/{ref}/run
POST  /onboard
POST  /onboard/preflight
POST  /projects/{id}/first-assessment
POST  /projects/{id}/milestones
POST  /projects/{id}/milestones/{name}/attach
POST  /projects/{id}/milestones/{name}/detach
POST  /projects/{id}/milestones/{name}/rename
POST  /projects/{id}/objectives
POST  /projects/{id}/objectives/{id}/assessment
POST  /projects/{id}/work-items/{ref}/assign
POST  /projects/{id}/work-items/{ref}/dependencies
POST  /projects/{id}/work-items/{ref}/dependencies/{dependency_ref}/remove
POST  /projects/{id}/work-items/{ref}/transition
PUT   /projects/{id}/views
```

Not available on the dashboard (use Desktop): project lifecycle
(enable/disable/pause/resume/freeze/archive/restore), team membership and
lead transfer, transfer preview/execution/retry, bulk reassignment, goal
authoring/ordering, mission archive/removal, managed-content
upload/archive/removal, workflow definition/version/start/archive/restore,
settings mutation, reports, bot/session and bot-group administration.

## CLI (`stewardctl`) — essential administration and recovery

Essential list/recovery operations only; authoring stays on Desktop:

- `team members <project>` — list members with role and state, including
  `departure_pending` members awaiting work transfer.
- `transfer list [--project P] [--all]` — list durable transfer operations
  (pending/running by default) for operator recovery.
- `transfer retry <op_id> --hermes-home <path>` — resume an interrupted
  transfer against the named Hermes home. Fails closed when no host runtime
  is available; the operation journal is never touched on refusal.
- `project archive <id>` / `project archive --list` /
  `project restore <id>` — essential archive recovery.
- `content remove <project> <content_id> --confirm` — managed-file removal,
  requires explicit `--confirm`; performs the verified descriptor-bound
  truncation (zero-byte marker retained — this is not secure physical
  erasure).

Plus the pre-existing operational commands (`project enable/disable/pause/
resume/freeze/status`, `objective add/list`, `health`, `initiative …`,
`run`, `audit`, `export`, `restore`).

## TUI and messaging — discovery/approval/deep links only

TUI: no project-management controls in this release (deferred backlog).

Messaging (Discord/Buzz gateway handler): supported operations are status/
health reads, initiative listing (discovery), initiative approve/reject with
idempotent replay, cycle trigger for granted senders, and the exact
initiative reference to open in Desktop. Destructive verbs (archive, restore,
disable, enable, pause, resume, freeze, remove, delete, transfer, reassign,
relink and synonyms) are refused with an explicit statement that the operation
requires the Desktop management surface or the recovery CLI — they are never
silently treated as unknown commands, and never executed from messaging.

There is no `hermes://` deep-link scheme: the Phase 0 vanilla spike found no
supported host deep-link contract, so none is fabricated. Messaging cards
carry the exact project/initiative identifiers to open in Desktop.
