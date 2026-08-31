# Dockyard API contract

Version: `0.3.0`
Base path: `/stewardship/v1`

The running application is authoritative. Use:

- OpenAPI JSON: `/openapi.json`
- Interactive schema: `/docs`
- Readiness: `/healthz`

## Security and errors

- Standalone mode fails closed unless `STEWARD_RPC_TOKEN` is configured.
- Embedded dashboard mode relies on the Hermes dashboard authentication boundary.
- Authenticated actor identity is bound server-side; body actor fields cannot
  override the configured principal (`STEWARD_RPC_PRINCIPAL`, default `rpc-token`).
- Mutating routes are rate-limited with a bounded client cache.
- Errors use `{"error":{"code","message","fields?"}}`.
- Canonical host failures are redacted and fail closed.
- Actor/interface attribution is explicit on policy and governance mutations.

## Main route groups

| Group | Representative routes | Authority |
|---|---|---|
| Projects | `GET /projects`, project lifecycle/settings routes | Dockyard stewardship metadata plus canonical project identity |
| Onboarding | `POST /onboard` | Canonical Hermes project/board first; Dockyard governance second |
| Work | list/create/detail/edit/assign/transition/dependency routes under `/projects/{id}/work-items` | Canonical Hermes Kanban plus Dockyard planning metadata |
| Backlog | list, queue and rerank routes under `/projects/{id}/backlog` | Canonical work plus Dockyard rank/reason metadata |
| Saved Views | `GET/PUT /projects/{id}/views` | Dockyard presentation metadata |
| Workflows | define/list/start under `/projects/{id}/workflows` | Dockyard version/run journal; canonical Hermes tasks and links |
| Initiatives | proposal, approval, rejection, completion/regression and board-binding routes | Dockyard governance plus canonical execution links |
| Observations | project observation list and `POST /observations/{ref}/run` | Durable Dockyard trigger plus idempotent stewardship cycle |
| Milestones | create, attach and progress routes | Dockyard planning metadata over canonical work |
| Reports | `/projects/{id}/reports` | Derived from canonical work and Dockyard governance |
| Bot fleet | bot registry, groups, workload, A2A, inbox and notifications | Dockyard coordination metadata |

## Canonical-host contract

Dockyard requires Project/Kanban host contract v2. The adapter verifies the
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
