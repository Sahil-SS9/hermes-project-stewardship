# Upstream path: plugin → Hermes core

Intent (disclosed up front, per the project's positioning): this plugin may
graduate into Hermes core if it validates the ownership model. Contributors
should know what that means.

## Graduation criteria (measurable)

1. Three real projects stewarded ≥ 30 days with: zero duplicate/stale-state
   mutations; ≥ 1 delivered initiative measured post-completion per project;
   human intervention rate stable or falling.
2. Six regression scenarios green across all supported Python versions and OS
   matrix for two consecutive release trains.
3. A core PR/RFC with: schema translation plan, command namespace migration
   (`hermes project steward ...`), event-bus design replacing the audit-log
   consumer for FR-13, and a deprecation path for the plugin DB.

## What moves where

| Incubation artifact | Core destination |
|---|---|
| Companion DB + service | Global persistence beside Projects |
| `stewardctl` commands | Core CLI namespace |
| Slash routes (`plugin.py`) | Central command registry |
| Audit log events | Core lifecycle/domain events |
| Gateway handler | Gateway adapter SDK example |
| Desktop panel | Native Project Stewardship page |
| Integration adapters (git/CI) | Stay pluggable — third-party surface |

## Compatibility discipline while incubating

- The engine never mutates Hermes-owned stores.
- Schema changes only via numbered migrations with downgrades.
- No dependency on unreleased Hermes APIs — integration seams are contracts
  (docs/architecture.md) so core churn cannot break the engine itself.
