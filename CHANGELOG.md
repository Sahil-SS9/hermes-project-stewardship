# Changelog

All notable changes to this project are documented here.
Format based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/);
versioning: [SemVer](https://semver.org/spec/v2.0.0.html).

## [0.1.0-alpha] — 2026-08-21

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
