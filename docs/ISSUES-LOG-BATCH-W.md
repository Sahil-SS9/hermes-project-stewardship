# Issues log — Batch W (Workflows canvas) — 29/09/26

Branch `hps/batch-w-workflows`, merged locally into `hps/integration`. Nothing pushed or deployed.

## Status at merge

- Dashboard tests 52/52, desktop browser tests 58/58, pytest 944 passed / 11 skipped / 0 failed.
- `hermes verify --json`: bootstrap, build and bundle checks pass. Its one failing test
  (`test_adapter_against_real_project_kanban_host_isolated_home`) was a **Hermes** bug, not Dockyard.
  Fixed in KenseiAgent branch `fix/kanban-db-merge-regression` @ `430a14f5aec` (local, not deployed).
  Proof: that test passes (11/11, exit 0) against the fixed Hermes and fails against live Hermes.
- Live Dockyard database unchanged (sha256 `8b0326a0…`).

## Remaining issues

| # | Severity | Issue | Next step |
|---|----------|-------|-----------|
| 1 | Medium | `hermes verify` stays red until the Hermes fix is deployed — it runs against live Hermes. | Deploy KenseiAgent `430a14f5aec` (Sahil go), then re-run `hermes verify --json`. |
| 2 | Low | Installed Dockyard plugin is older than this branch; Sahil has only seen the canvas via the safe demo. | Install from integration after release review. |
| 3 | Low | Demo server returns 404 for `/favicon.ico` (demo harness only, not plugin code). | None needed. |
| 4 | Low | Three test-generated review artefacts (`real-canvas-*.png`, `real-canvas-review-e2e.json`) are untracked in the worktree. | Keep as local evidence; do not commit. |
| 5 | Info | Batch P (`hps/batch-p-planning`) is not part of this merge. | Merge separately after its own acceptance. |
