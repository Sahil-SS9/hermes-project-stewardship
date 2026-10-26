# Project Stewardship API contract

Version: `0.3.0`
Base path: `/stewardship/v1`

The running application is authoritative. Use:

- OpenAPI JSON: `/openapi.json`
- Interactive schema: `/docs`
- Readiness: `/healthz`

## Security and errors

- Standalone mode fails closed unless `STEWARD_RPC_TOKEN` is configured.
- Embedded dashboard mode relies on the Hermes dashboard authentication boundary.
  The plugin proxy authenticates its process-local ASGI hop with a private
  credential; it does not forward browser cookies, provider bearers or legacy
  session headers as backend credentials. No reverse-proxy token injection is
  needed. The configured RPC principal takes precedence over the Desktop actor;
  human/capability grants remain explicit. Standalone RPC tokens are unchanged.
- Authenticated actor identity is bound server-side; body actor fields cannot
  override the configured principal (`STEWARD_RPC_PRINCIPAL`, default `rpc-token`).
- Mutating routes are rate-limited with a bounded client cache.
- Errors use `{"error":{"code","message","fields?"}}`.
- Canonical host failures are redacted and fail closed.
- A Hermes (canonical host) error has one status on every route: a missing
  project, board, task or epic (`*_not_found`) is 404, `validation_error` is
  422, a transition, write or idempotency conflict is 409, and anything else,
  such as `host_unavailable`, is 503. A project Hermes has no project for (an
  "unlinked" project) is therefore a 404 with code `project_not_found` on the
  routes that need Hermes (work items, work dependencies, milestones, team,
  memory suggestions, report generation), while its stewardship data still
  reads normally. `/dashboard` reports `linked: false` and `/portfolio` status
  `unlinked` for it. Reads that only annotate stewardship records with live
  Hermes state degrade instead of failing: a workflow's run ledger
  (`GET /projects/{id}/workflows/{name}/runs`) lists its runs without live task
  status, and the roadmap reports `work_host: "unlinked"` and delivery
  `{"state": "unavailable", "reason": "unlinked"}` (`"host_unavailable"` only
  when Hermes failed). A run's timeline still needs Hermes (404) and records
  nothing without it.
- Actor/interface attribution is explicit on policy and governance mutations.

## Main route groups

| Group | Representative routes | Authority |
|---|---|---|
| Projects | `GET /projects`, project lifecycle/settings routes | Stewardship metadata plus canonical project identity |
| Lifecycle | `POST /projects/{id}/{pause,resume,freeze,disable,re-enable,archive,restore}` | Project Stewardship phase state, guarded by the Phase 1 transition matrix |
| Onboarding | `POST /onboard` | Canonical Hermes project/board first; Project Stewardship governance second |
| Membership and team | `GET /projects/{id}/members`, `GET /projects/{id}/team`, `POST /projects/{id}/members`, `DELETE /projects/{id}/members/{slug}`, `POST .../lead`, `POST .../state`, `POST .../relink` | Project Stewardship membership store; requires a verified principal holding `membership_admin` or `lead_transfer` |
| Transfers and operations | `POST /projects/{id}/transfers/preview`, `POST .../transfers/execute`, `POST .../reassignments`, `GET /operations/{op_id}`, `POST /operations/{op_id}/retry` | Durable Project Stewardship saga journal plus conditional canonical Kanban writes and readback; requires `bulk_reassignment` |
| Work | list/create/detail/edit/assign/transition/dependency routes under `/projects/{id}/work-items` | Canonical Hermes Kanban plus Project Stewardship planning metadata |
| Backlog | list, queue and rerank routes under `/projects/{id}/backlog` | Canonical work plus Project Stewardship rank/reason metadata |
| Goals and planning | `/projects/{id}/goals` (create/edit/order/archive/restore), `/projects/{id}/milestones` (archive/restore/rename/attach/detach) | Project Stewardship planning metadata |
| Saved Views | `GET/PUT /projects/{id}/views` | Project Stewardship presentation metadata |
| Workflows | define/list/start/versions/runs/archive/restore under `/projects/{id}/workflows` | Project Stewardship version/run journal; canonical Hermes tasks and links |
| Managed content | `/projects/{id}/content` (upload/list/detail/preview/dependencies/archive/restore) and removal | Project Stewardship managed files under `<database parent>/project-content`; removal requires `managed_file_removal` and truncates the verified inode to a zero-byte marker |
| Initiatives | proposal, approval, rejection, completion/regression and board-binding routes | Project Stewardship governance plus canonical execution links |
| Observations and recovery | project observation list, `POST /observations/{ref}/run`, `POST /projects/{id}/reconcile` | Durable Project Stewardship trigger plus idempotent stewardship cycle |
| Mission | `GET/POST /projects/{id}/mission`, `GET /projects/{id}/missions/archive`, `POST .../mission/archive` | Project Stewardship governance metadata |
| Reports | `/projects/{id}/reports` | Derived from canonical work and Project Stewardship governance |
| Bot fleet | bot registry, groups, workload, A2A, inbox and notifications | Project Stewardship coordination metadata |
| Health and events | `GET /projects/{id}/health`, `GET /projects/{id}/events`, `GET /projects/{id}/notifications`, `GET /projects/{id}/cycle`, `/workload` | Project Stewardship observation and notification metadata |

This table is a summary, not the contract. `/openapi.json` from the running
application is authoritative; a route appearing here is not evidence that Phase 6
route-parity work has been done.

## Canonical-host contract

Project Stewardship requires Project/Kanban host contract v2. The adapter verifies the
contract and mandatory capability set at composition time. Missing or older
hosts produce a controlled unavailable adapter; production never falls back to
legacy task storage.

## Operational CLI contracts

These are deliberately outside the HTTP API:

```bash
stewardctl --db DB export --output NEW_ARCHIVE_DIR
stewardctl restore --archive ARCHIVE_DIR --target NEW_DB

dockyard-migrate-legacy dry-run --source-db DB_COPY \
  --target-home MARKED_ISOLATED_HOME --snapshot NEW_SNAPSHOT \
  --project PROJECT --board BOARD
```

Legacy migration accepts only marker-owned source/target roots. Apply takes a
snapshot first; failures restore automatically and preserve the failed target.

## Current limitations

- List limits are uniformly bounded to 1–500.
- Saved View filters are presentation metadata; the current Work UI applies
  Board/Table layout but not the full role-aware query roadmap.
- Timeline is unavailable until canonical scheduling fields exist.
- Workflow starts are manual only. No scheduler is activated by this release.
- Production migration, deployment, plugin reload and service restart require
  separate owner approval.
