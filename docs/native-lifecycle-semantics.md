# Native task lifecycle semantics

Dockyard delegates status changes to the native Hermes lifecycle functions; it does not represent manual status changes as verified worker execution.

- An unclaimed task has no run identity to protect. Where the native host permits it, an explicit review request (including `force_review=True`) and subsequent completion may therefore occur without `expected_run_id`. This is a manual lifecycle action, not evidence that a worker ran.
- `create_task(initial_status="review" | "done")` records a task directly in the requested lifecycle state through native review/completion operations. No worker run is implied. Native events and completion timestamps remain authoritative; outcome verification is a separate requirement.
- For a task with a current run, transitions require its matching `expected_run_id`, except the explicit force-review path. Completion does not inherit that exception.
- Epics are grouping records created in native triage, not running tasks. Native dependency and completion restrictions still apply.

These semantics describe the existing adapter, not additional automation authority. Approval, execution and verified outcome remain separate concepts.
