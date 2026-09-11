# Project Management Phase 4 Evidence

**Candidate:** Phase 4 checkpoint on `feat/project-management-stewardship`; the enclosing commit is the accepted checkpoint
**Base / Phase 3 checkpoint:** `8fb34ba07094758ec5fc00dc639f67eb91f9f496`
**Scope:** PM-0401 through PM-0412 only
**Verdict:** **PASSED INDEPENDENT REVIEW** — PM-0401 through PM-0412 and all review corrections were accepted for local checkpointing.

## Delivered contract

- `TeamManagementService` composes the existing normalized membership service, monotonic membership revision, canonical host adapter and durable `TransferSaga`; it introduces no parallel membership model and makes no cross-database atomicity claim.
- Project-team reads include role/lead state, current Hermes discovery availability and complete canonical workload counts.
- Add-member and lead-transfer routes require server-verified principals/capabilities and discovered, available Hermes profiles. Audit attribution uses the verified principal, never the payload actor.
- Preview enumerates the exact member-owned canonical set and returns item identity/title/kind/status/revision, eligibility/exclusion reason, complete count, membership revision and SHA-256 fingerprint. Epics and claimed/running work are excluded. Any changed membership or canonical item set/state/revision causes HTTP 409 before a write.
- Member departure is all-eligible only. It persists operation identity and item intents before host effects, uses the conditional host assignment seam, verifies canonical readback, leaves the member `departure_pending` across partial failure, and marks `departed` only after every journal item is confirmed complete. Excluded work blocks departure.
- Bulk subset reassignment is a separate route and never marks the source member departed. Operation and per-item audit records carry the verified principal and durable operation ID.
- Desktop loads discovery through the plugin proxy and uses one shared searchable picker for member, lead, work-item assignee and bulk replacement controls. Unavailable profiles are visible but disabled; the selected profile identifier is submitted unchanged.
- Canonical Backlog rows support keyboard-focusable subset selection and bulk reassignment separately from departure. The UI renders the complete preview/fingerprint, eligibility/exclusions, durable progress, verified operation actor and per-item audit/outcome, clears stale previews on 409 and leaves refresh/retry recovery visible.
- Vanilla host pagination now exposes offset/next-offset and the adapter exhausts every page. The old host connection surface remains supported. Conditional assignment checks task kind, assignee, eligible status and claim lock in the host transaction.

## TDD witnesses

- Initial focused run: `uv run --locked --extra dev --extra plugin pytest -q tests/test_phase4_team_management.py` → collection RED, `ModuleNotFoundError: ...team_management` (exit 2).
- API authority/profile validation RED: focused API test returned 200 for an unavailable profile instead of 409 (exit 1).
- Desktop RED: `DOCKYARD_CAPTURE_SCREENSHOTS=0 node --experimental-vm-modules --test ...` failed after 12/28 because the team-management surface was absent (exit 1).
- Focused GREEN: Phase 4 + membership/host/plugin groups → 68 passed (exit 0).
- Review correction RED: `/tmp/phase4_review.py` reported `late_task.state=completed` with membership `departed` while `t2.assignee=gone`; `retry_new_task` reported the same false completion; and `self_transfer` completed instead of refusing. The native arm initially reported `native_stale_guard` success after overwriting the independent writer. Deterministic regressions then failed 3/3 for late scope/retry/self-transfer, and the real vanilla competing-writer regression failed because no `HostError` was raised.

## Phase 4 review corrections

| Reviewer defect | Correction | Regression proof |
|---|---|---|
| Work arrives after enumeration or during retry | Departure uses the existing saga while reserving final membership completion for a fresh complete canonical enumeration. Work outside the approved item IDs leaves the operation `running`, the member `departure_pending`, and returns `scope_changed:true` plus `new_item_ids`; it is not appended to the approved operation. | `test_departure_rechecks_scope_after_execution_before_marking_departed`; `test_departure_retry_rechecks_scope_and_requires_fresh_preview` |
| Vanilla write guard was read-then-write | Vanilla now derives a stable signed-SQLite-range revision token from guarded native task state and performs the recheck plus assignment under the host's supported `write_txn` boundary. The native `UPDATE` also repeats assignee/status/claim predicates. | `test_vanilla_conditional_assignment_retains_competing_writer` uses a separate real vanilla connection, retains `third-party`, observes `write_conflict`, and proves the saga does not complete falsely. |
| Source equals destination | `preview()` rejects identical profiles before profile discovery, workload enumeration, journalling, audit, or membership mutation. | `test_self_transfer_rejected_before_reads_or_mutation` proves typed `ServiceError`, exact API `409 conflict` envelope, and zero operation/audit/membership effects. |
| Originally approved ownership changes before finalisation | Final readback now checks every approved ID still exists and is owned by the approved target, as well as checking for newly retained IDs. A reverted or otherwise divergent approved item leaves the operation `running`, membership `departure_pending`, and reports the exact `changed_item_ids`; it is not blindly reassigned with its obsolete guard. | `test_departure_does_not_complete_when_approved_item_returns_to_source` |
| Final canonical verification is unavailable or interrupted | Departure calls the existing saga with deferred durable completion from operation creation; there is no `completed`→`running` corrective write. The verified initiating actor is stored in the journal payload before host effects. The operation remains `running` through the boundary, and only successful final canonical verification plus membership finalisation atomically changes local operation/membership state to `completed`/`departed`. Retry resumes from the same journal and actor attribution remains visible. | `test_final_readback_failure_keeps_operation_pending_actor_and_retryable`; `test_interruption_before_final_verification_never_persists_completed` |
| Explicitly empty approved workload | Finalisation compares the exact journalled and completed ID sets with the approved ID set. Empty equals empty and may finalise after successful canonical verification; a non-empty scope with absent or incomplete outcome rows remains `running`. Response state is set from the final durable result. | `test_zero_work_departure_completes_after_empty_canonical_verification`; `test_zero_work_departure_retry_preserves_completed_state`; `test_nonempty_approved_scope_with_missing_outcome_fails_closed` |

## Final verification receipts

- Focused Phase 4 plus relevant membership/saga contracts: `env -u PYTHONPATH .venv/bin/python -m pytest -q tests/test_membership_authority_api.py tests/test_phase4_team_management.py tests/test_membership_domain.py tests/test_membership_contracts.py` → 57 passed, 2 native-host skips; collection count 59 (exit 0).
- Isolated vanilla host: `env -u HERMES_DELEGATED_CHILD_CONTEXT PYTHONPATH=/home/kensei/repos/hermes-agent-vanilla uv run --with pyyaml pytest -q tests/test_phase4_team_management.py::test_vanilla_host_more_than_100_route_to_durable_readback tests/test_phase4_team_management.py::test_vanilla_conditional_assignment_retains_competing_writer` → 2 passed (exit 0).
- Post-fix reviewer probe: `/tmp/phase4_review.py` reported `late_task` and `retry_new_task` with `state:"running"`, `scope_changed:true`, `new_item_ids:["t2"]`, membership `departure_pending`, and `t2.assignee:"gone"`. It then stopped with the newly correct typed `ServiceError` on `self_transfer`, so its later native print arm is unreachable by design; the native regression above is the authoritative replacement proof.
- Finalisation reviewer probe: `uv run python /tmp/phase4_completion_review.py` → final read failure leaves journal/operation `running`, member `departure_pending`, actor `human`; approved item returned to source leaves operation `running`, member `departure_pending`, and reports `changed_item_ids:["t1"]` while preserving `t1.assignee:"gone"` (exit 0).
- Interruption reviewer probe: `uv run python /tmp/phase4_interruption_review.py` → its monkeypatch targets the removed post-completion correction method, so no interruption is triggered and the valid operation completes normally. The permanent regression injects at the actual boundary before final verification and observes durable `running`, actor `verified-human`, and membership `departure_pending` before raising.
- Empty-departure reviewer probe: `uv run python /tmp/phase4_empty_departure_review.py` → execute and retry both return and persist `completed`, membership is `departed`, actor is `human`, and the operation has zero item rows (exit 0).
- Full Python + coverage: `env -u PYTHONPATH .venv/bin/python -m pytest -c pyproject.toml -q -p no:cacheprovider --basetemp /tmp/phase4-empty-pytest --cov=hermes_project_stewardship --cov-config=pyproject.toml --cov-report=term --cov-fail-under=87` → passed with 87.25% coverage (exit 0); exact case counts are recorded by the canonical verifier below.
- Lint/type/security/compile: Ruff pass; `ty check` pass; `pip-audit` no known vulnerabilities (local package not on PyPI); compileall pass (combined exit 0).
- Dashboard: `./node_modules/.bin/tsc --noEmit && npm test && npm run build && npm audit --omit=dev` → 10 test journeys passed, build artifacts generated, 0 vulnerabilities (exit 0).
- Desktop harness: `DOCKYARD_CAPTURE_SCREENSHOTS=0 node --experimental-vm-modules --test repro-live.test.mjs` → all 29 named journeys passed, runner 1 passed (exit 0); existing React `act`/key warnings remain non-failing.
- `hermes verify --json` → `ok:true`; manifest test phase 708 passed/37 skipped; real server readiness `/healthz` HTTP 200 (exit 0).
- A broad `ruff check .` was also attempted and retained as a non-gating baseline result: 93 pre-existing errors outside the canonical `src` lint scope. The required canonical `ruff check src` gate passes.
- `git diff --check` passes after this evidence/plan update.

## Required adversarial coverage

- More than 100 items and complete pagination: fake 125-item aggregation plus real vanilla 105-item route/host/readback test.
- Concurrent task creation: deterministic service and isolated vanilla-host barriers create a new task between preview and execute; complete current-set recomputation returns HTTP 409 with zero assignment/departure mutation, and the refreshed count is 106.
- Simultaneous membership changes: concurrent lead transfers preserve exactly one active lead.
- Host failure / partial: one item fails after another completes; operation remains running and membership remains `departure_pending`.
- Crash/lost response recovery: existing Phase 1 durable saga tests remain green; retry reads canonical state first, preserves journal guards and does not duplicate completed writes.
- Claimed/running and epic work: exact exclusions are visible and departure execution is refused; no supported handoff is claimed.
- Permission no-write: unauthenticated/non-capable calls fail before profile discovery or membership writes and membership revision is unchanged.

## Limitations

- Vanilla Hermes exposes no supported claimed/running handoff and no native batch-assignment operation. This slice therefore uses the already-approved durable Stewardship saga and refuses claimed/running transfer and epic assignment.
- Dashboard UI remains its documented subset; Desktop is the complete Phase 4 management surface.
- Dashboard `dist/` is tracked release output in this repository; the build left it byte-unchanged (`git diff --quiet -- hermes_dockyard_plugin/dashboard/dist` exit 0), so no generated residue is present in the Phase 4 diff.

## Review state

All PM-0401..PM-0412 checkboxes are supported by the receipts above and the candidate passed independent review. This evidence is included in the complete local Phase 4 checkpoint. No Phase 5 implementation, installation, deployment, restart or live mutation was performed before that checkpoint.
