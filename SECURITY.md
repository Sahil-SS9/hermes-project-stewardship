# Security Policy

## Supported versions

| Version | Supported |
|---|---|
| 0.3.x   | yes       |
| < 0.3   | no        |

## Reporting a vulnerability

Do **not** open a public issue for security problems.

Email: security@sahilsaghir.dev (PGP key on request). You will get an
acknowledgement within 72 hours and a status update at least every 7 days
until resolution. We will credit reporters by default; say so if you prefer
to remain anonymous.

Please include: affected version/commit, environment, reproduction steps,
and any evidence of exploitation. Coordinated disclosure timeline is 90 days
by default, negotiable in both directions.

## Scope

In scope:

- The stewardship engine (`src/hermes_project_stewardship/`), including the
  autonomy/policy model, verification gate, approval flow, RPC API, CLI.
- Injection vectors through retrieved repository content (issues, PRs,
  READMEs, code comments) reaching stewardship decisions.
- The gateway command contract's permission binding.

Out of scope (report to Hermes upstream instead):

- The Hermes runtime itself, its tool executor or credential store.
- Platforms connected via the gateway (Discord etc.).

## Design commitments this policy relies on

- Project autonomy policy can only restrict, never escalate, runtime
  permissions.
- Mutating actions fail closed when canonical state is Unknown or contains
  unresolved high-severity contradictions.
- Approval identity is recorded for every material action; approvals are
  idempotent per initiative.
- Command evaluators execute under a strict allowlist with timeouts,
  output caps and no shell interpolation.

Full analysis: [docs/threat-model.md](docs/threat-model.md).
