# Hermes Project Stewardship — repository layout

```
hermes-project-stewardship/
├── src/hermes_project_stewardship/
│   ├── domain/          # constants, models, autonomy policy, health machine
│   ├── persistence/     # SQLite store, migrations, service layer (single write path)
│   ├── verification/    # deterministic collectors + advisory tier, fail-closed verdicts
│   ├── objectives/      # manual/command evaluators (strict target grammar)
│   ├── cycles/          # cycle engine: mutex, idempotency, budget, fail-closed gates
│   ├── security/        # untrusted-content scanning + allowlisted command runner
│   ├── api/             # FastAPI RPC (optional extra) — the shared backend contract
│   ├── cli/             # stewardctl (--json reads, stable exit codes)
│   ├── gateway/         # platform-neutral command contract w/ permission binding
│   └── plugin.py        # defensive Hermes plugin registration surface
├── tests/               # 78 tests incl. the six PRD regression scenarios
├── docs/                # PRD v0.2, architecture, threat model, gateway contract, upstream path
├── skill/project-stewardship/SKILL.md   # steward behaviour layer (never owns state)
├── desktop/stewardship-panel/           # React panel scaffold (thin RPC client)
├── examples/example_project.py          # full loop walkthrough
└── .github/workflows/ci.yml            # 3 OS × 3 Python matrix + API-extra job
```

Milestone mapping (PRD v0.1 §23): A→`domain/`+`persistence/`, B→`verification/`,
C→initiative lifecycle+`bind_board`, D→`cycles/` triggers+budget,
E→`api/`+`cli/`+`gateway/`, F→desktop scaffold, G→threat-model controls
(budget, mutex, hysteresis, audit), H→`docs/upstream-path.md`.
