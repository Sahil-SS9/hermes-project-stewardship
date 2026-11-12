# File-lease dispatch for parallel worker lanes

> Pattern adapted from [mojomast/bundlebees](https://github.com/mojomast/bundlebees)
> v0.1.0 (MIT licence), a Hermes plugin that dispatches file-leased briefs to
> sandboxed coding workers. Generalized here for stewardship-driven Kanban lanes
> and subagent fan-out; the BundleBees plugin itself is not required. Credit and
> thanks to the BundleBees authors for the original pattern.

## Why leases

Parallel workers editing the same file race: last writer wins, diffs corrupt
each other, and review cannot tell which lane caused a change. A lease makes
file ownership explicit **before dispatch** and turns out-of-scope edits into a
detectable trust failure instead of a surprise in the diff.

## Brief schema (minimum for code work)

- `objective`: one bounded outcome, stated as acceptance criteria.
- `repo` + base branch + feature branch (never main/master).
- `assigned_files`: explicit paths or narrow globs the worker may create/modify.
- `tests`: named test commands the worker may run (advisory) and the owner reruns.
- `kanban_task_id`: provenance link when the work comes from a board card.

A code-work brief without `assigned_files` is `brief_invalid`. Fix the brief; do
not dispatch with implicit whole-repo scope.

## Dispatch rules

1. **Pre-dispatch overlap check.** Compare `assigned_files` against every live
   lane's leases (and known shared hotspots). Overlap → serialize the lanes or
   re-scope; never dispatch two writers onto one file.
2. **Scope violation is stop-and-ask.** A worker edit outside its lease is a
   `scope_violation`: halt the lane, preserve evidence, ask the owner. No blind
   repair, no silent revert.
3. **Lease-subset reconciliation.** At review, the observed diff must be a
   subset of the lease (`diff ⊆ assigned_files`). Claims are not evidence.
4. **Observed vs claimed.** Acceptance uses owner-observed results (rerun tests,
   read the diff, probe the live path), never the worker's self-report alone.

## Failure codes

| Code | Meaning | Action |
|---|---|---|
| `brief_invalid` | missing `assigned_files` / acceptance | fix brief, do not dispatch |
| `lease_overlap` | two lanes claim one file | serialize or re-scope |
| `scope_violation` | edit outside lease | stop lane, ask owner |
| `evidence_missing` | claims without observed proof | rerun verification |

## Owner-run verify gate

Clean worktree → lease check → named tests rerun by the owner → secret scan →
feature-branch push only. Production activation stays an explicit owner decision.

## Relationship to stewardship

Stewardship's restriction-only autonomy and evidence-first principles already
require deterministic gates. File leases extend the same discipline to the
*dispatch* side: ownership is declared before work starts, and reconciliation is
mechanical. Deployments that fan stewardship-generated work out to parallel
coding lanes should carry `assigned_files` in every brief.
