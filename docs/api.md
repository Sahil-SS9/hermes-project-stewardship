# Dockyard API contract

Version: `0.2.0rc1`
Base path: `/stewardship/v1`

The running application is authoritative. Use:

- OpenAPI JSON: `/openapi.json`
- Interactive schema: `/docs`
- Readiness: `/healthz`

## Security and errors

- Optional bearer authentication applies to stewardship routes when configured.
- Mutating routes are rate-limited.
- Errors use `{"error":{"code","message","fields?"}}`.
- Canonical host failures are redacted and fail closed.
- Actor/interface attribution is explicit on policy and governance mutations.

## Main route groups

| Group | Representative routes | Authority |
|---|---|---|
| Projects | `GET /projects`, project lifecycle/settings routes | Dockyard stewardship metadata plus canonical project identity |
| Onboarding | `POST /onboard` | Canonical Hermes project/board first; Dockyard governance second |
| Work | `GET/POST /projects/{id}/work-items`, detail and transition routes | Canonical Hermes Kanban |
| Backlog | list, queue and rerank routes under `/projects/{id}/backlog` | Canonical work plus Dockyard rank/reason metadata |
| Saved Views | `GET/PUT /projects/{id}/views` | Dockyard presentation metadata |
| Workflows | define/list/start under `/projects/{id}/workflows` | Dockyard version/run journal; canonical Hermes tasks and links |
| Initiatives | proposal, approval, rejection and board-binding routes | Dockyard governance plus canonical execution links |
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

- List pagination and examples are not yet uniform across every older route.
- Saved View filters are presentation metadata; the current Work UI applies
  Board/Table layout but not the full role-aware query roadmap.
- Timeline is unavailable until canonical scheduling fields exist.
- Workflow starts are manual only. No scheduler is activated by this release.
- Production migration, deployment, plugin reload and service restart require
  separate owner approval.
