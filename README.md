# Hermes Project Stewardship

Durable project **ownership** for Hermes agent fleets.

Hermes can complete tasks. Stewardship makes a team of Hermes profiles
**responsible for a project over time**: it verifies reality before acting,
turns gaps into evidence-backed initiatives, executes through existing Kanban,
enforces explicit autonomy policy, and measures whether the project actually
improved — from every surface (CLI, RPC API, Desktop panel, Discord/gateway).

> Status: **v0.1.0-alpha.** Core domain engine implemented and tested (174 tests, 90% coverage).
> Hermes runtime integration points are documented contracts
> ([docs/architecture.md](docs/architecture.md#hermes-integration-contracts)),
> not yet wired to a live gateway.

---

## The ownership loop

Every stewardship cycle walks the same ring:

```
WAKE → VERIFY → SNAPSHOT → ASSESS → PROPOSE → GATE → EXECUTE → MEASURE → LEARN ↺
```

- **Verify first.** A cycle may not claim project status or authorise mutating
  work without canonical evidence (git state, tests/CI, declared files).
  Memory and session history are supporting evidence only.
- **Fail closed.** Unknown or contradictory project state blocks mutations.
- **Autonomy is restriction-only.** Project policy may narrow what Hermes may
  do; it never escalates tool permissions or credentials.
- **No busywork.** `NO_ACTION_REQUIRED` is a first-class cycle outcome.

## System workflow

The full cycle as it runs in the engine — including where human approval and
the fail-closed freeze sit:

![Stewardship cycle workflow](docs/assets/cycle-workflow.svg)

## Architecture

One canonical backend, many thin surfaces. There is no second state store:
CLI, RPC API, gateway adapters and the Desktop panel all bind to the same
service, which is the only writer of the SQLite (WAL) database.

![Architecture](docs/assets/architecture.svg)

### Surfaces

| Surface | Entry point | Notes |
|---|---|---|
| CLI | `stewardctl` | human output by default, `--json` on reads |
| RPC API | `/stewardship/v1` | FastAPI optional extra; bearer auth + rate limiting |
| Gateway commands | Discord et al. | permission binding + idempotent approvals |
| Desktop panel | React + Vite | thin client of the same RPC |

## Autonomy levels

| Level | Name | Allowed by default |
|---|---|---|
| 0 | Assistant | Inspect and answer only |
| 1 | Investigator | Observe, research, non-mutating diagnostics |
| 2 | Planner | + create initiatives/plans (no source changes) |
| 3 | Builder | + branches, code, tests, PRs (gated: see security model) |
| 4 | Maintainer | + low-risk merges when policy gates pass |
| 5 | Steward | Broad lifecycle within release/budget policy |

Level ≥ 3 additionally requires the runtime capability allowlist gate
(`docs/threat-model.md` §6). Levels 4–5 ship disabled pending the merge-gate
implementation (`docs/prd-v0.2.md` §Deferred).

## Install

Requires Python 3.10+. No third-party runtime dependencies for the core engine.

```bash
git clone https://github.com/Sahil-SS9/hermes-project-stewardship.git
cd hermes-project-stewardship
uv venv && uv pip install -e ".[dev]"
pytest                      # run the test suite
stewardctl --help           # CLI
uvicorn hermes_project_stewardship.api.server:app --port 9310   # RPC API
```

## 60-second example

```python
from pathlib import Path
from hermes_project_stewardship.persistence.store import Store
from hermes_project_stewardship.cycles.engine import CycleEngine

store = Store(Path("./stewardship.db"))
svc = store.services()

svc.enable(project_id="my-repo", mission="Keep CI >99% and deps fresh",
           lead_profile="lead", member_profiles=["coder", "qa"])
svc.add_objective("my-repo", name="ci-health", evaluator_type="command",
                  target=">=0.99", command=["pytest", "-q"], severity="high")

engine = CycleEngine(svc)
result = engine.run_cycle("my-repo")
print(result["health"]["state"])          # e.g. "healthy"
print([i["title"] for i in result["initiatives"]])
```

Then:

```bash
stewardctl health my-repo
stewardctl initiative list my-repo
stewardctl initiative approve INIT-0001
```

See [examples/example-project](examples/example-project) for a full walkthrough,
and [demo/](demo/) for a scripted 5-act terminal demo plus an interactive HTML
dashboard of the same story.

## Documentation

- [PRD v0.2](docs/prd-v0.2.md) — product requirements this implementation satisfies
- [Architecture](docs/architecture.md)
- [Threat model](docs/threat-model.md)
- [Gateway command contract](docs/gateway-contract.md)
- [Roadmap to upstream Hermes core](docs/upstream-path.md)

## Security

Read [SECURITY.md](SECURITY.md) and [docs/threat-model.md](docs/threat-model.md)
before enabling autonomy above level 2 on any repository that accepts content
from untrusted people (issues, PRs, READMEs). Retrieved repository content is
untrusted input; it is never treated as authority over project policy.

## Licence

Apache-2.0. See [LICENSE](LICENSE).
