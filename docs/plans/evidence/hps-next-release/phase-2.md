# HPS next release — Phase 2 evidence

**Candidate:** `/home/kensei/worktrees/stewardship-release-candidate-r3`
**Vanilla:** `/home/kensei/repos/hermes-agent-vanilla`
**HEAD:** `e538c2c` (`hps: Project screen approved — header strip replaces PageHead/notice; sub-view order locked (Reports above Settings, Workflows promoted out)`)
**Working tree:** pre-existing dirty workflow/backlog/canvas scope preserved; no source changes made by this run.
**Status:** **PASSED — Phase 2 gate passed**

## Disposable-container command and result

The following command ran in a fresh `python:3.12-slim` container. It mounted the vanilla checkout and candidate read-only, installed only test/runtime dependencies, set `PYTHONPATH=/workspace/candidate/src:/workspace/vanilla`, and used temporary container state only:

```bash
docker run --rm \
  -v /home/kensei/repos/hermes-agent-vanilla:/workspace/vanilla:ro \
  -v /home/kensei/worktrees/stewardship-release-candidate-r3:/workspace/candidate:ro \
  -v /tmp/p2_native_evidence.py:/tmp/p2_native_evidence.py:ro \
  python:3.12-slim bash -lc '
    python -m pip install -q pytest pydantic fastapi httpx typer rich pyyaml filelock requests &&
    PYTHONPATH=/workspace/candidate/src:/workspace/vanilla \
      python /tmp/p2_native_evidence.py &&
    PYTHONPATH=/workspace/candidate/src:/workspace/vanilla \
      pytest -q /workspace/candidate/tests/test_workflow_real_host.py \
      -p no:cacheprovider --basetemp /tmp/p2
  '
```

Result: exit `0`.

```text
{"final_status": "done", "human_gate_protected": true,
 "materialized": {"gate": "t_48fb31d2", "task": "t_5d08be6f"},
 "native_execution": {"claims": 2,
   "events": [1, 3, 4, 5, 6],
   "runs": [["reclaimed", "reclaimed"], ["done", "completed"]]},
 "no_duplicate_side_effects": true, "recovery": true,
 "result": "FAKE_OK"}
.                                                                        [100%]
```

The deterministic fake worker exercised native materialised-task execution: ready claim, duplicate claim rejection, side-effect write, forced interruption/reclaim, second claim, returned result completion, and duplicate completion rejection. The human approval task was placed in the native `review` lane and the worker claim was rejected. Idempotency returned the same materialised task id on retry. The side-effect ledger contained one entry per attempt and no duplicate entry after replay.

The existing real-host materialisation test also passed: `1 passed`.

## Findings

- Materialisation and execution are now separately evidenced: the candidate host created task/gate records; unmodified vanilla `hermes_cli.kanban_db` performed claim/run/result lifecycle operations against disposable SQLite state.
- Native run history recorded one reclaimed failed/interrupted run and one completed run: `reclaimed/reclaimed`, then `done/completed`.
- Human-gate protection held: the `review` task was not claimable by the fake worker.
- Idempotency and duplicate protections held: repeated materialisation returned the same task id; a second claim and post-completion duplicate completion were rejected; side effects were not duplicated.
- No paid model execution, live service, live database, deployment, merge, or publication was attempted.

## Gate decision

**PASSED.** Phase 2 requirements for native ready/claim/dispatch/result handling, human-gate protection, partial interruption recovery, and no duplicate tasks/side effects are evidenced by real execution in the disposable vanilla container. Phase 3 may proceed under its own evidence gate; this run made no Phase 3 changes.
