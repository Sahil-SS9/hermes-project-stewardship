# Supported host revisions — Project Stewardship (D5 / P1.8)

Bound to exact revisions, verified by real test runs — not by assumption.
Re-verify at every release; compatibility is not indefinite.

Verified on 2026-09-17 against candidate `hps/release-candidate-r3`:

| Role | Revision | Verification |
|---|---|---|
| Installed reference host (KENSEI fleet) | `c129a476` (Hermes Agent v0.21.3, 2026.9.14) | full suite on native lane, see evidence dir |
| Vanilla minimum supported | `8c098e9e819169879a7b2f74990e83b5d39696c8` (2026-08-28) | full suite, `STEWARD_REQUIRE_NATIVE_HOST=1`, no skips on native cells |
| Vanilla latest upstream | `cdceca42e107f0e51ab9ff50e1cc881ad76b577e` | pending: checkout prepared at /tmp/hps-p1-vanilla-cdceca42; run in progress — record PASS/FAIL below only after evidence lands |

Selection contract (P1.10): the plugin's own vanilla host implementation is
canonical. A host-tree `hermes_cli.project_kanban_host` is used only when it
provably declares the full plugin contract via `capabilities()`; otherwise it
is recorded as `rejected_host_module` provenance and the plugin implementation
is used. Without any host runtime the factory fails closed with
`host_contract_unavailable` — there is no silent fallback onto a missing tree,
and a personalised-host hit never satisfies the vanilla lane.

Native lanes must FAIL, not skip, when the host is absent
(`STEWARD_REQUIRE_NATIVE_HOST=1`). The fallback lane (no host) keeps its
documented host-optional skips and is not a vanilla certification.

Host APIs known to differ across these revisions and handled explicitly:
`hermes_cli.kanban_db.connect` → `hermes_cli.kanban_db_connect.connect`
(tests support both trees); `scoped_kanban_home` exists only on some forks
and must never be a required dependency.
