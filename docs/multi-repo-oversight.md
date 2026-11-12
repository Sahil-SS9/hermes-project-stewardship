# Multi-repository oversight for unbound shared boards

## Problem

Project Stewardship scopes oversight to a project. Many real Hermes deployments
run one **shared Kanban board across several repositories** with no project
binding on the board. Two bad options existed:

1. Bind the board to a project — this changes default board metadata, so future
   tasks with omitted workspace settings inherit that project's repo/worktree
   (see Hermes `test_board_inheritance_live.py` semantics). Silent blast radius.
2. Leave the board unscoped — no oversight at all.

## Design

`kanban/multi_repo_adapter.py` adds an **explicitly configured oversight scope**
for an unbound shared board:

- Reads all board projects; retains each source task's ownership in
  `source_project_id`. The adapter's `project_id` in the work contract denotes
  the oversight scope, not ownership.
- **Never binds board metadata.** Work generated for the oversight scope keeps
  the normal scratch default instead of inheriting an arbitrary repository.
- Other project scopes keep upstream semantics unchanged — only the explicitly
  configured scope is special-cased.
- **Fails closed** on a bound board or an oversight project that has a primary
  repository (`KanbanAdapterError`), per the project's fail-closed principle.

`kanban/multi_repo_runtime.py` supplies the API factory (`create_app`) and tick
runner using the adapter; `kanban/bootstrap_scope.py` supplies dry-run /
idempotent, repo-free project registration with backed-up databases before
mutation and autonomy level 0.

## Safety invariants (tested)

1. Shared-board projection never rebinds board metadata or changes task
   ownership, workspaces, or statuses.
2. Generated work keeps safe default workspaces (no repo inheritance).
3. Bound boards and repo-bearing oversight projects are refused.
4. Bootstrap is idempotent and dry-run-able; databases are backed up first.
5. Pagination and authenticated dashboard projection behave like upstream.

## Usage

```python
from hermes_project_stewardship.kanban.multi_repo_runtime import create_app
from hermes_project_stewardship.kanban import bootstrap_scope

# 1. Register the oversight scope (dry-run first; idempotent; autonomy 0)
bootstrap_scope.bootstrap(hermes_home, scope_name="shared-oversight", dry_run=True)

# 2. Serve the API with the oversight scope
app = create_app(hermes_home, oversight_scope="p_<scope_id>")
```

The stock gateway/CLI paths are unchanged; the runtime is an explicit opt-in
factory for deployments that supervise an unbound shared board.

## Verification

`tests/test_multi_repo_oversight.py` — 10 regression tests against isolated
native Hermes databases: authenticated dashboard projection, safe default
workspaces, fail-closed bindings, pagination, idempotent bootstrap, and two-step
workflow progression through the candidate tick. A private SQLite backup of a
real 382-task shared board confirmed all non-archived IDs project with copied
statuses/owners/workspaces and unchanged board metadata.
