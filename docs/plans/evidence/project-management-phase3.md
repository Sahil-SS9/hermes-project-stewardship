# Phase 3 evidence — onboarding vertical slice

Candidate baseline: `947d2e58b1736ec0f5420e83332f3ae28aef22e5`
Branch: `feat/project-management-stewardship`

## Scope and routing

- PM-0301–0304: backend/API discovery and preflight.
- PM-0305–0306: dashboard/plugin profile guidance and state preservation.
- PM-0307–0308: canonical host provisioning, readback and recovery.

No commit, push, merge, install, deployment or live Hermes-state change was performed. Phase 4 was not started.

## PM-0304 — unavailable profile semantics

- Duplicate member entries and lead/member overlap fail preflight with a field-scoped 422.
- A currently unavailable host profile cannot be newly selected.
- A profile reference already persisted in an existing project's normalised membership remains present in discovery even after it disappears from the host registry. It is explicitly represented with `available=false`, `selectable=false`, `historical_reference=true` and the owning `project_ids`.
- That historical reference can pass preflight only for the project that already owns it, is returned in `historical_unavailable_profiles`, and remains unchanged in backend settings. Selecting the same unavailable reference for another project fails with a field-scoped 422.

RED witness:

- `uv run pytest -q tests/test_phase3_backend.py` initially produced `2 passed, 1 failed`; `test_historical_unavailable_profile_is_explicit_and_preserved_only_for_its_project` failed because the persisted missing profile was absent from discovery (`StopIteration`).

GREEN witness:

- `uv run pytest -q tests/test_phase3_backend.py` → **3 passed**.

## PM-0308 — isolated vanilla-home integration

`tests/test_phase3_host_provisioning.py` uses isolated temporary Hermes and Kanban roots and the real `ProjectKanbanHost` fallback, `ProjectKanbanHostAdapter`, native Hermes project/Kanban databases, FastAPI onboarding route, `StewardshipService`, `MembershipService` read path and Stewardship SQLite store. It does not replace those layers with an in-memory provisioning mock.

Covered scenarios:

1. **Create new:** canonical project and board are read back inside an observer around the real conditional persistence seam, `StewardshipService.accept_onboarding_membership`, while the Stewardship project table is still empty. Final canonical project/board identity and the exact lead/member roles and states are read back from their owning backends.
2. **Connect existing:** the canonical project is provisioned first, preflight reports `connect_existing`, onboarding reuses the same native identity, and complete team state is read back.
3. **Partial failure and idempotent retry:** a one-shot failure is injected at the real native board-creation boundary. The canonical project remains archived/resumable, no board exists, and no Stewardship metadata is written. Same-key retry completes and restores it; a further replay remains idempotent. Final canonical project/board identity and complete team state are read back.

Integration witness:

- `env -u HERMES_DELEGATED_CHILD_CONTEXT PYTHONPATH=/home/kensei/repos/hermes-agent-vanilla uv run --with pyyaml pytest -q tests/test_phase3_host_provisioning.py` → **7 passed** after final reviewer remediation. The parent controller ran this command because delegated child processes are correctly forbidden from mutating Kanban; every mutation was confined to pytest temporary homes.

## Wider verification

- `uv run pytest -o addopts='' tests/test_phase3_backend.py tests/test_canonical_onboarding_api.py tests/test_phase7_onboarding.py tests/test_project_kanban_host_adapter.py` → **15 passed, 13 skipped**. Skips are the repository's native-host guards when Hermes is absent from the project venv.
- `uv run pytest -o addopts='' --disable-warnings` → **689 passed, 35 skipped** (723 collected plus one collection skip), 81.74s.
- `DOCKYARD_CAPTURE_SCREENSHOTS=0 node --experimental-vm-modules --test repro-live.test.mjs` from `hermes_dockyard_plugin/desktop` → **PASS_SUMMARY=27/27**, Node runner **1 passed, 0 failed**.
- `git diff --check` → **passed**.

A separate exploratory run against a moving KenseiAgent host checkout is not acceptance evidence: five pre-existing Phase 7 tests target an older host contract and fail there. The pinned vanilla-home PM-0308 lane above is the required genuine integration proof; the normal project suite remains green.

## Reviewer-blocker remediation

The five Phase 3 review defects were converted into regression coverage and repaired:

1. `/onboard` invokes the same live team validation as preflight before canonical provisioning. Unknown, duplicate, overlap, newly unavailable and cross-project historical references are rejected before writes.
2. Preflight returns a token binding the normalized request fingerprint and membership revision. Desktop retains and submits both fields; stale or altered submissions return `409 stale_preflight`.
3. Desktop now provides searchable member multi-selection, submits the selected team, and the dashboard proxy preserves the complete request. `test_onboarding_member_contract_survives_proxy_and_persists` exercises plugin proxy → backend → persisted settings readback.
4. Completed onboarding records bind the idempotency key to the complete normalized request, including team. Exact replay returns the recorded result; conflicting reuse returns `409 idempotency_conflict` before mutation.
5. Refresh and profile-manager guidance remain present after successful discovery. Refresh preserves entered values; unavailable historical profiles remain visible and disabled in both selectors.

Fresh verification:

- `.venv/bin/python -m pytest -q tests/test_phase3_backend.py tests/test_canonical_onboarding_api.py tests/test_dockyard_plugin_backend.py::test_onboard_then_dashboard_flow tests/test_dockyard_plugin_backend.py::test_onboarding_member_contract_survives_proxy_and_persists tests/test_dockyard_plugin_backend.py::test_existing_onboarding_rejects_conflicting_default_key_reuse` → **9 passed**.
- `.venv/bin/python -m pytest -q` → **689 passed, 35 skipped** across **724 collected** canonical Python cases.
- `node repro-live.test.mjs` from `hermes_dockyard_plugin/desktop` → **PASS_SUMMARY=28/28**, including success→refresh and member-selection journeys.
- `git diff --check` → **passed**.
- `/tmp/review_phase3_probe.py` now shows mutation rejection (`422`) and stale conflict (`409`) through its valid assertions. Its historical case then crashes because its final inspection assumes the rejected onboarding created `alpha`; that post-check encodes the old defect and is superseded by committed-quality regressions.

## Final boundary remediation

Two deterministic regressions were added for the final review findings:

1. A failure of the final `project.onboarded` receipt after canonical and local writes leaves a durable `onboarding_operations` row in explicit `incomplete` state. The row binds the complete request fingerprint to the key before canonical effects. Exact retry recognises the operation's own persisted roster and resumes; changed payload/team reuse returns `409 idempotency_conflict` while incomplete or completed.
2. Local onboarding acceptance now checks the reviewed membership revision inside the same Stewardship transaction as project/roster persistence. A real competing `StewardshipService.enable` injected after canonical provisioning is retained, the request returns `409 stale_preflight`, the canonical project remains recoverable, and the operation remains incomplete without claiming the competitor's membership as its own.

RED witness:

- `PYTHONPATH=/home/kensei/repos/hermes-agent-vanilla uv run --with pyyaml pytest -q tests/test_phase3_host_provisioning.py -k 'failed_success_receipt or conditionally_rejects'` → **2 failed** before implementation (missing durable operation state; interleaved request did not return the required conflict). The native host then also exposed the delegated-child Kanban mutation guard, so authoritative host GREEN requires the parent lane.

GREEN witnesses in this lane:

- `uv run pytest -q tests/test_canonical_onboarding_api.py` → **5 passed** (both exact sequences use the real Stewardship store/service; only canonical host provisioning is faked).
- Focused adversarial/backend/proxy command → **11 passed**.
- `uv run pytest -q tests/test_dockyard_plugin_backend.py` → **28 passed**.
- `uv run pytest -o addopts='' --disable-warnings -q` → **692 passed, 35 skipped**.
- Desktop harness → **PASS_SUMMARY=28/28** (Node: 1 passed, 0 failed).
- Parent-controller reviewer probe: identical incomplete-operation retry returned **200**, changed same-key request returned **409**, and interleaved competing membership returned **409**.
- Parent-controller isolated vanilla-host suite after updating its ordering witness to the new conditional persistence seam: **7 passed**.

The operation binding and Stewardship acceptance transaction are local durability boundaries only. Canonical host and Stewardship remain ordered, resumable stores; cross-database atomicity is not claimed.

## Gate disposition

**PASS / STOPPED at Phase 3 gate.** The implementation, focused regressions, complete canonical Python suite, Desktop harness, reviewer probe, isolated vanilla-host suite and diff check are green. PM-0301–PM-0308 are complete. Phase 4 was not started.
