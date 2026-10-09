# Supported host revisions — Project Stewardship (D5 / P1.8)

Bound to exact revisions, verified by real test runs — not by assumption.
Re-verify at every release; compatibility is not indefinite.

Verified on 2026-09-17 against candidate `hps/release-candidate-r3`:

| Role | Revision | Verification |
|---|---|---|
| Installed reference host (KENSEI fleet) | `c129a476` (Hermes Agent v0.21.3, 2026.9.14) | full native lane 858 pass / 1 skip (Windows branch), exit 0 — /tmp/hps-p1-v3-ka/final.log (2026-09-18, candidate ba3b671) |
| Vanilla minimum supported | `8c098e9e819169879a7b2f74990e83b5d39696c8` (2026-08-28) | full native lane 857 pass / 2 skips, exit 0 — /tmp/hps-p1-v3-vanold/final.log |
| Vanilla latest upstream | `cdceca42e107f0e51ab9ff50e1cc881ad76b577e` | full native lane 857 pass / 2 skips, exit 0 — /tmp/hps-p1-v3-vannew/final.log (checkout /tmp/hps-p1-vanilla-cdceca42) |
| Fallback (no host, documented) | none | 814 pass / 38 host-optional skips, exit 0 — /tmp/hps-p1-v3-nohost/final.log — NOT vanilla certification |

Selection contract (P1.3 selection): the plugin's own vanilla host implementation is
canonical. A host-tree `hermes_cli.project_kanban_host` is used only when it
provably declares the full plugin contract via `capabilities()`; otherwise it
is recorded as `rejected_host_module` provenance and the plugin implementation
is used. Without any host runtime the factory fails closed with
`host_contract_unavailable` — there is no silent fallback onto a missing tree,
and a personalised-host hit never satisfies the vanilla lane.

Native lanes must FAIL, not skip, when the host is absent
(`STEWARD_REQUIRE_NATIVE_HOST=1`). The fallback lane (no host) keeps its
documented host-optional skips and is not a vanilla certification.

Tests find the Hermes checkout through `HPS_HERMES_SOURCE` (see
`tests/hermes_source.py`); `scripts/native-host-lane.sh` sets it to the tree it
tests. Unset, the tests that need a real tree skip, or fail under
`STEWARD_REQUIRE_NATIVE_HOST=1`.

Host APIs known to differ across these revisions and handled explicitly:
`hermes_cli.kanban_db.connect` → `hermes_cli.kanban_db_connect.connect`
(tests support both trees); `scoped_kanban_home` exists only on some forks
and must never be a required dependency.
