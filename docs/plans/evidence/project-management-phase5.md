# Project management Phase 5 evidence

Status: FINAL DELETION-BOUNDARY CORRECTION — READY FOR RE-REVIEW
Base checkpoint: `13370ce9b9bc85582b8ae13245eaa3ac0341e707`
Candidate: dirty, uncommitted
Review sources: `/tmp/phase5-independent-review/report.md`, `/tmp/phase5-rereview/report.md`, `/tmp/phase5-final-rereview/report.md`, `/tmp/phase5-direct-review/report.md`

## Review corrections

| Finding | Correction | Evidence |
|---|---|---|
| Final quarantine pathname substitution | Pathname unlink was removed. Normal and recovery completion erase and fsync only the already-verified open inode through its descriptor. A concurrent replacement remains untouched; only the recorded inode becomes zero length. A zero-byte quarantine marker is intentionally retained because later pathname cleanup would recreate the race | `test_final_removal_is_bound_to_verified_descriptor` (normal + recovery) |
| Interruption after quarantine rename | Pending retry now discovers and verifies the retained deterministic tombstone, promotes it to durable quarantine and completes removal/audit | `test_interruption_after_quarantine_rename_recovers_on_retry` |
| Final basename could be replaced after identity stat | Removal atomically quarantines the basename and verifies the quarantined inode. Substitution before quarantine fails closed; substitution after descriptor verification cannot redirect descriptor-bound erasure | `test_managed_file_basename_swap_is_quarantined_without_deleting_replacement`, `test_quarantine_stat_boundary_swap_is_refused` |
| Parent-directory replacement | Removal opens the managed root, each directory and the file with no-follow flags; all later operations stay bound to those descriptors | `test_managed_file_removal_is_anchored_against_root_and_parent_swaps` |
| Managed-root symlink bypass | Raw managed root is lstat-checked and symlinks/non-directories are refused before resolution | same regression |
| Dependency race | Removal rechecks dependencies while holding SQLite `BEGIN IMMEDIATE`; the final check, descriptor erasure, durable completion and audit are fenced from competing database writers | `test_managed_file_removal_rechecks_dependencies_under_write_lock` |
| Interrupted erasure lost audit | A verified zero-length quarantine inode is recognised on retry; durable completion and its audit are finalised idempotently | `test_interrupted_descriptor_erase_recovery_finalises_state_and_audit` |
| Archive could be bypassed through re-enable | Re-enable refuses archived projects; explicit restore clears `archived_at`, `archived_by` and stale `paused_at` | Phase 5 project lifecycle tests |
| Plugin project archive/restore returned 404 | Added actual proxy routes and a real proxy→ASGI backend→SQLite roundtrip | `test_project_archive_restore_roundtrip_through_plugin_proxy` |
| Missing Desktop management controls | Added milestone create/rename/close/reopen/archive/restore/scope controls; managed-content archive/restore/removal; executable workflow definition/version/start/archive/restore; project archive/restore | Desktop `Phase 5 management journeys` |
| Remaining Desktop gaps | Added existing milestone due-date editing, stored workflow-definition inspection, workflow run-history display through a new proxy route, and explicit canonical-retention archive copy | Expanded Desktop `Phase 5 management journeys` plus real workflow proxy/run persistence test |
| Real run-history identity | Desktop and fixtures now use backend `run_key`, not invented `run_id`; captured real payload renders `run1 — v1 — complete` | `/tmp/phase5-final-rereview/render-history.cjs` |

## Preserved contracts

- Goal lifecycle, ordering and nullable objective links remain available.
- Existing linked and unlinked objective behaviour remains intact.
- Saved Views remain visibly and technically separate from executable workflows.
- Project archive/restore mutates stewardship lifecycle state only; canonical project, board, work and repository fixtures remain unchanged.
- Managed-content removal accepts only recorded managed paths and recorded file identity.

## Direct consecutive-interruption repair

Recovery now commits the verified pending-to-quarantined transition before descriptor truncation. A fresh write transaction rechecks dependencies before the destructive effect, preserving the dependency fence without rolling recovery intent back on interruption.

Expanded `test_interruption_after_quarantine_rename_recovers_on_retry` covers consecutive rename and descriptor-erasure interruptions, durable quarantined state, successful retry/replay and exactly one removal audit. Witnessed RED before the fix (`pending` instead of `quarantined`), then GREEN after it.

Fresh direct verification (no delegation):
- Focused Phase 5/proxy suite: passed (47 test progress markers).
- Independent `/tmp/phase5-descriptor-review.py`: normal/recovery replacements untouched; consecutive interruptions recover; exactly one audit.
- Full Python suite: 727 passed, 37 skipped; coverage 87.11% (floor 87%).
- Ruff 0.15.10 on the two edited Python files: passed.
- `git diff --check`: passed.
- Subsequent `hermes verify --json . --timeout 600 --ready-timeout 60`: exit 0, `ok: true`, 727 passed / 37 skipped; temporary runtime readiness HTTP 200 and clean shutdown.
- Subsequent direct `.venv/bin/python -m pytest`: exit 0, 727 passed / 37 skipped.
- Desktop and isolated host not rerun for this bounded persistence/test-only correction; prior results below are historical.

## Verification

- Focused Phase 5 + complete plugin proxy module: 46 passed.
- Final managed-file boundary regressions: 11 passed.
- Full Python/coverage: passed; coverage 87.03% against 87% floor.
- Ruff 0.15.10, isolated pinned tool: all changed Python paths passed.
- Desktop harness: `PASS_SUMMARY=30/30`; Phase 5 journey now executes milestone create/due/rename/close/reopen/scope attach-detach/archive/restore, workflow version/start/definition inspection/history/archive/restore, content archive/restore/remove/dependency refusal, and project archive/restore with retention copy. It remains correctly labelled as a rendered SDK-mock journey, with separate Python proxy→backend→SQLite evidence rather than a single browser E2E claim.
- Isolated vanilla-host checks: 2 passed.
- `git diff --check`: clean.
- `hermes verify --json .`: `ok: true`; 726 passed, 37 skipped; readiness HTTP 200.

No Phase 6 work, commit, push, merge, installation, deployment or live-state mutation was performed.
