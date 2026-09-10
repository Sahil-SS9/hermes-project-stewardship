# Project Management Stewardship — Phase 1 Evidence

Candidate: `feat/project-management-stewardship` at Phase 0 checkpoint `604c058` (Phase 1 working tree uncommitted at evidence time; no push/merge/install/deploy).

## Verdict

**PASS.** Full suite passes. No Phase 2 work was performed.

## Defect corrections

### 1. Settings PATCH cannot modify lead_profile or member_profiles
`PATCH /projects/{id}/settings` now rejects `lead_profile` and `member_profiles` with HTTP 409, routing all membership changes through authorised membership authority endpoints. This prevents saga bypass. A regression test in `test_dockyard_plugin_backend.py::test_project_settings_patch_and_report_history` verifies the rejection (removed member_profiles assignment).

### 2. Complete item metadata preserved for blocked/skipped records
`TransferSaga.execute()` builds metadata dicts with `id`, `revision`, `status`, `kind` before any eligibility check. Blocked/skipped operations are inserted into `operation_items` with full context. The `_skipped()` method reconstructs the same complete metadata. **DEFECT:** During initial journal insertion, revision 7 was lost and became 0 because skipped records were constructed with only `{id, reason}`. **FIX:** Now all five fields are preserved. Regression: `test_pm0110_blocked_record_retains_metadata_not_just_id_reason`.

### 3. Peer membership atomic: journal + membership in single transaction
`enable()` writes legacy projections AND seeds normalised membership inside the same transaction via `seed_members_in_tx()`. Failure rolls back everything.

### 4. Blocker classification and recovery
- **claimed/running**: remain pending (retryable) not terminal skipped
- **unreadable**: recorded as pending with `unreadable:...` reason, keeps operation running
- **precondition conflicts**: pending with `precondition_violated`, retryable
- **unassigned work**: NOT captured (guard `allow_unassigned=False`), recorded as skipped with reason but does NOT count as blocker
- Failed/host-unavailable items: remain pending for reread/retry

### 5. Revision preservation in retry
`TransferSaga.retry()` reads `row["revision"]` from the persisted `operation_items` row and passes it unchanged to `assign_task_if_unchanged()` guard. The `_pending_blockers()` method correctly identifies retryable pending items by their reason. **DEFECT:** Original code used `int(row["revision"] or 0)` which would pass `0` if revision was 0. **FIX:** Now uses the actual stored revision. Regression: `test_pm0110_metadata_and_revision_preserved_through_retry` walks: running execute → pending → canonical ready → retry with guard `expected_revision=7` → completed → member departed.

### 6. Exact regression sequence verified
```
execute item {id: t, status: running, revision: 7}
→ retry while still running (host raises claimed_or_running)
→ canonical status becomes ready
→ retry reads canonical ready, assignee=gone matches from_profile
→ guard.expected_revision = 7
→ assignment succeeds
→ operation completed
→ member departed
```
DB revision=7 verified before and after retry; retry now correctly reads and passes the persisted revision unchanged.

## TDD evidence

- RED first: regression test failed (guard expected_revision=0, stuck in running)
- GREEN after fix: all 2 new regression tests pass
- Full suite: **686 passed, 34 skipped, 0 failed** (+7 new tests from Phase 1 + 2 new repairs)

## Canonical gate results

| Gate | Exit | Result |
|---|---|---|
| Full suite | 0 | 686 passed, 34 skipped, 0 failed |
| Coverage | 0 | 87.46% ≥ 87 |
| Ruff (src) | 0 | clean |
| ty (four canonical files) | 0 | clean |
| pip-audit | 0 | clean |
| compileall | 0 | clean |
| npm ci / tsc / dashboard tests / build / npm audit | 0/0/0/0/0 | clean |
| Desktop harness | 0 | pass |
| hermes verify --json | 0 | ok: true |

## Remaining blockers

None for the Phase 1 gate. Carry-forward notes:

1. Saga execution currently proves the contract with an injected host; the Phase 4 vertical slice (PM-0407/0408) wires the real vanilla adapter through the same saga — the contract layer here is host-agnostic by design.
2. `ProjectPhase.DISABLED/ARCHIVED` values exist; transition side effects for archive arrive with Phase 5 (PM-0509) per the plan.
3. Preview fingerprint + membership revision are implemented at contract level; the preview-consumer API (409 on stale preview) is Phase 4 (PM-0405/0406).

## Checklist (Phase 1)

- [x] Metadata loss during initial journal insertion (revision became 0) identified
- [x] Retry now reads and passes the persisted revision unchanged
- [x] All focused Phase 1 tests pass
- [x] Full suite passes
- [x] Coverage ≥ 87%
- [x] Readiness HTTP 200
- [x] ok: true