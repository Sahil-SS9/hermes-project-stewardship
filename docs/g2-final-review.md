# G2 BOT LAYER — FINAL REVIEW
## Hermes Dockyard PRD v0.3 Gate G2 · 2026-08-23 · KENSEI build record

---

## Verdict

**G2 COMPLETE. Exit criterion met and proven by test.**
PRD §6 Gate G2: "Registry, groups/channels, A2A message bus, workload
views. Two bots hand off a task through a group channel, fully audited."

Evidence at HEAD `c9943ee`: suite **256 passing, 0 warnings, exit 0**;
gate E2E `tests/test_dockyard_gate_e2e.py` walks the criterion end-to-end
over the RPC surface only.

## Phase-by-phase record

| Phase | Commit | Scope | Tests | Result |
|---|---|---|---|---|
| P1 Registry domain | `70d5a27` | Bot/BotGroup/A2AMessage domain + migration 5 tables | 14 | PASS |
| P2 Persistence+service | `6839770` | bot upsert/status/list, groups w/ roles, audit wiring | 7 | PASS |
| P3 A2A bus | `7556fb4` | migration 6 message log, payload contracts, channel posts | 7 | PASS |
| P4 Workload+reputation | `e407f7d` | BM-05 buckets, BM-06 advisory reputation | 5 | PASS |
| P5 RPC routes | `0d55b70` | 10 routes on /stewardship/v1 | 8 | PASS |
| Gate E2E | `c9943ee` | two-bot handoff fully audited | 1 (composite) | PASS |
| Warning fix | `dccacd7` | starlette/httpx deprecation filter (deleg investigation) | - | PASS |

Each phase was committed only after its own test pass went green, per
Sahil's phase-by-phase instruction.

## Requirements coverage (PRD §4.2)

| FR | Requirement | Status |
|---|---|---|
| BM-01 | Bot registry: discoverable, capabilities, workload | DONE — registry + status + current_item |
| BM-02 | BotGroups w/ channels; assignment targets group, lead routes | DONE — role map, deterministic lead routing, channel_ref for D3 rooms |
| BM-03 | A2A structured audited events, not chat noise | DONE — 4 typed payloads, contract-enforced at insert |
| BM-04 | Feeds bot groups/channels with full context links | DONE — generated channel_post lines; gateway delivery = G4 integration |
| BM-05 | Load view: busy / idle / stuck / offline | DONE — workload_board() + route |
| BM-06 | Reputation advisory-only, never auto-routes | DONE — `advisory: true` structural flag |

## Trust-engine guarantees preserved

- TE-01: zero state duplication — bots/groups/A2A live in the SAME
  canonical DB; every mutation writes the shared stewardship audit log.
- Attribution: all events carry actor + interface (dockyard:human/bot).
- Fail-closed: unknown bot/group refused (404/ValueError) at every layer;
  invalid A2A payloads cannot persist.

## Defects found & fixed during G2

1. `_audit()` accepted raw string actors, losing human/bot kind on some
   paths → normalised (str=bot, Actor=own kind).
2. Group-create RPC dropped actor attribution entirely → now forwards
   Actor with human kind. (Both caught by the gate E2E.)
3. summary_line missed RESULT outcomes → now prefers summary→outcome→type.
4. Starlette TestClient deprecation noise → root-caused via delegation
   (fastapi pins httpx while starlette prefers httpx2); minimal targeted
   pytest filter; watch-item recorded for future fastapi switch.

## Honest limitations

- Gateway delivery of channel posts is intentionally deferred (D3
  integration lands with the Desktop plugin work, G4).
- Reputation sources are dockyard-native events only until G3 wires
  measured initiative outcomes into it.
- No concurrency/race fuzzing yet — that is G5's explicit scope.

## Suite state at close

256 passed · 0 warnings · exit 0 · HEAD c9943ee pushed to origin/master.
