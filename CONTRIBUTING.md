# Contributing to Hermes Project Stewardship

Thanks for your interest. This project accepts contributions under the
Apache-2.0 licence (see CONTRIBUTING agreement at the bottom).

## Project principles (non-negotiable in review)

1. **Fail closed.** If canonical state cannot be verified, mutating paths must
   refuse. PRs that add a "best effort" fallback for verification failures will
   be rejected.
2. **Restriction-only autonomy.** Policy code may narrow permissions, never
   widen them. Any change to `AutonomyPolicy` must preserve the invariant
   `merged = base.intersect(policy)` and its test.
3. **Deterministic gates, advisory LLMs.** Anything that authorises a mutation
   (verification verdicts, approval checks, dedupe) must be deterministic.
   LLM output is advisory input only and is always recorded as such.
4. **One canonical state.** All surfaces read/write the same store via the
   service layer. No surface keeps private stewardship state.
5. **Evidence or it didn't happen.** Health states, initiative proposals,
   approvals and completions all persist evidence references.

## Setup

```bash
git clone https://github.com/YOUR_ORG/hermes-project-stewardship.git
cd hermes-project-stewardship
uv venv && uv pip install -e ".[dev]"
pytest
```

Python 3.10–3.12 supported. No third-party runtime dependencies for the core;
the optional FastAPI extra powers the RPC server only.

## Workflow

1. Open or comment on an issue first for anything that changes behaviour.
2. Branch from `main`: `feat/<short-name>` or `fix/<short-name>`.
3. Add tests for every behaviour change. Bug fixes need a regression test that
   fails without the fix.
4. Run the full suite plus lint before pushing:

```bash
pytest
python -m compileall src tests
```

5. Keep commits atomic; write messages in the imperative mood.

## Test conventions

- The six critical regression scenarios from the PRD live in
  `tests/test_regression_scenarios.py`. Extend them when adding lifecycle
  behaviour — they are the contract.
- Never write tests that depend on wall-clock time; inject clocks
  (`store.services(clock=...)`).
- Never let a test touch anything outside `tmp_path`.

## Review gates

- Any change touching `domain/policy.py`, `security/`, or persistence schema
  requires a maintainer review plus updated threat-model notes.
- Schema changes require a new numbered migration in
  `persistence/migrations.py` with both upgrade and downgrade paths.

## Licence agreement

By contributing, you agree your contributions are licensed under Apache-2.0
(the project's licence) — the standard Developer Certificate of Contribution.
