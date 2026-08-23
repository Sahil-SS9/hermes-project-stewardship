# G5 HARDENING — FINAL REVIEW & PROGRAMME CLOSE-OUT
## Hermes Dockyard PRD v0.3 · 2026-08-23 · KENSEI build record

---

## Verdict

**G5 COMPLETE — and with it, ALL PRD GATES (G0–G5) ARE CLOSED.**
PRD §6 Gate G5: "Adversarial suite extension: multi-actor races, A2A
injection attempts, permission matrix fuzzing. 174-test discipline
extended to every new entity."

Evidence at HEAD `35ee1e3`: suite **292 passing, 0 warnings, exit 0**.
The adversarial E2E floods the RPC surface with hostile traffic and an
18-thread mixed storm while legitimate state stays byte-stable.

## Phase-by-phase record

| Phase | Commit | Scope | Tests | Result |
|---|---|---|---|---|
| P1 Races | `640a3f7` | parallel transitions/reranks/registrations/creates | 4 | PASS + 1 real defect fixed |
| P2 Injection | `c44c305` | spoofing, mismatch, oversize, hostile types, SQL/JSON smuggling | 6 | PASS + 1 gap fixed |
| P3 Matrix fuzz | `20805e2` | actor kinds × ops, status/rank grids, cross-project isolation | 7 | PASS |
| Adversarial E2E | `35ee1e3` | combined hostility + concurrent mixed load over RPC | 2 | PASS |

## Real defects found & fixed during G5

1. **HDY-n ref allocation race (P1):** SELECT-count then INSERT let two
   concurrent creators draw the same ref → UNIQUE violations and lost
   items. Fixed by deriving refs from the assigned rowid inside one
   transaction; verified 20/20 unique under thread contention.
2. **Unbounded A2A payloads (P2):** a 100 KB+ blob was accepted into the
   event log. Fixed with a 32 KiB serialised cap (422), preserving BM-03
   structured-event semantics.
3. Cross-project isolation, attribution exactness, rank invariants,
   ActorKind domain rejection — all proven already sound (no fixes
   needed; tests now guard them permanently).

## Trust-engine guarantees under attack (PRD §8.6)

- Verify-first / fail-closed: unknown projects, groups, bots, statuses,
  kinds all refused at every layer — no silent paths discovered.
- Restriction-only autonomy: no adversarial path escalated permissions.
- One canonical store + one audit log: zero audit loss across every
  race probe and hostile flood.
- Anti-busywork: reason-mandatory reranks refused empty/short reasons
  throughout the fuzz grids.

## Programme scoreboard (all gates)

| Gate | Verdict | Head at close |
|---|---|---|
| G0 design lock | CLOSED (Sahil-approved v4 baseline, contract-pinned) | `21bd42d` |
| G1 PM core | CLOSED (PM-01..08 minus deferred PM-06) | `5d80a98` |
| G2 bot layer | CLOSED (BM-01..06, two-bot handoff E2E) | `c9943ee` |
| G3 platform⇄engine | CLOSED (zero-CLI loop E2E) | `08c8ba5` |
| G4 product polish | CLOSED (week-of-oversight E2E) | `b4dd0e3` |
| G5 hardening | CLOSED (this review) | `35ee1e3` |

Suite trajectory: **174 → 292 tests**, zero warnings, exit 0 throughout.

## Honest limitations

- Pixel-level QA of the wired v4 UI still awaits Sahil's eyes (headless
  Firefox unavailable on this rig); structural + contract evidence only.
- PM-06 portfolio roll-up intentionally deferred (needs multi-project
  production data to be meaningful); schema/API ready.
- Gateway delivery of channel posts remains G4+/integration scope (D3).
- Race probes use threads on one process; true multi-process contention
  (separate API workers) is exercised by SQLite WAL but not fuzzed here.

## Final state

292 passed · 0 warnings · exit 0 · tree clean · pushed to origin/master.
The Dockyard platform per PRD v0.3 is built, gated, hardened, and ready
for Council review + Sahil sign-off toward Desktop-plugin integration.
