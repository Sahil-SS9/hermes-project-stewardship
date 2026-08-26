# Changelog

All notable changes to this project are documented here.
Format based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/);
versioning: [SemVer](https://semver.org/spec/v2.0.0.html).

## [0.2.0rc2] - 2026-08-26

### Added
- Complete canonical work-item editing, assignment and dependency mutation
  across RPC, Desktop proxy and dashboard UI.
- Structured planning metadata for labels, evidence, estimates and due dates.
- End-to-end initiative approval, canonical execution, completion/regression,
  durable observation scheduling and idempotent internal observation cycles.
- Delivery dashboard with initiative-to-work deep links and operator actions.

### Changed
- Approval now binds canonical work and enters execution atomically; it no
  longer creates a legacy Dockyard work-item twin.
- Dockyard schema advanced from version 13 to version 15.
- Dashboard, API and CLI package metadata are aligned on `0.2.0rc2`.

### Release state
- Local engineering candidate. Publication and live activation remain separate
  owner-controlled operations.

## [0.2.0rc1] - 2026-08-26

### Added
- Canonical Hermes Project/Kanban host contract v2 with fail-closed adapter,
  native project/board provisioning and idempotent onboarding.
- Canonical Board, Backlog table and work-item detail surfaces.
- Board/Table Saved Views; Timeline remains explicitly unavailable until
  canonical scheduling data exists.
- Versioned, manually started workflow DAGs with deterministic task keys,
  human gates, dependency links and crash-recovery journalling.
- Marker-guarded legacy work migration with dry-run, snapshot-backed apply,
  automatic failure restore and explicit rollback.
- `stewardctl export` and `stewardctl restore` with a versioned manifest,
  online SQLite snapshot, checksums and integrity validation.

### Changed
- Dockyard governance/ranking metadata is separated from canonical Hermes work
  authority; production task writes no longer fall back to legacy tables.
- Project/Kanban host contract advanced from v1 to v2.
- Dockyard schema advanced to version 13.
- Dashboard, API and CLI package metadata are aligned on `0.2.0rc1`.

### Security
- Host errors are redacted at the adapter boundary.
- Migration and restore paths fail closed on missing ownership markers,
  traversal, symlinks, existing targets, checksum mismatch and schema mismatch.
- Dashboard source and built output remain free of prohibited DOM, execution
  and browser-storage sinks.

### Release state
- Local engineering candidate only. No tag, publish, deployment, service
  restart, live plugin reload or production migration is authorised here.

## [0.1.0-alpha] - 2026-08-21

### Added
- Domain model: stewardship-enabled projects with mission, ownership
  (lead + member profiles, forward-compatible `owner_team_id`), objectives,
  autonomy policy (levels 0–5), verification policy, release policy,
  notification policy.
- Restriction-only autonomy policy engine with intersection invariant and
  per-level capability gating.
- Two-tier verification engine:
  - deterministic collectors (git status/log/branch, declared files,
    command probes) produce the canonical baseline;
  - advisory collectors (LLM/session/memory summaries) are recorded as advice
    and can never authorise mutations.
  - Contradiction detection with severity classification; high-severity
    contradictions force Unknown/Critical health and fail closed.
- Health state machine: healthy / watch / degraded / critical / unknown with
  hysteresis (material-change debounce) on transitions.
- Objective evaluators: `manual` and `command` types; command evaluators run
  under an allowlist with timeout, output cap and no shell interpolation.
- Initiative service: evidence-backed proposal, risk classification,
  dedupe against active/recent initiatives, per-project concurrency caps,
  rejection-driven suppression windows.
- Approval workflow: idempotent approvals keyed by initiative, actor +
  interface attribution, permission binding for gateway senders.
- Cycle engine: manual / cron / webhook / gateway triggers with idempotency
  keys, a cross-process cycle mutex, budget enforcement (max cycles/day,
  max initiatives/cycle), pause/freeze semantics honoured mid-cycle.
- Persistence: SQLite store with numbered migrations, WAL mode, foreign-key
  enforcement, audit log of every material action, retention/pruning job.
- Security module: untrusted-content labelling, prompt-injection pattern
  scanning with severity scoring, evidence/authority separation helpers,
  runtime capability allowlist gate required for autonomy ≥ 3.
- RPC API (optional FastAPI extra) exposing the same service layer;
  CLI (`stewardctl`) with human output and `--json`.
- Gateway command contract (platform-neutral) with sender-permission binding.
- Docs: PRD v0.2, architecture, threat model, gateway contract, upstream path.

### Security
- Builder+ autonomy (levels ≥ 3) requires the runtime capability allowlist
  gate and ships disabled by default in the reference config.
