"""End-to-end example: steward a small repo through a full loop.

Run from the repo root:
    python examples/example_project.py
"""

from pathlib import Path
import subprocess
import sys
import tempfile

from hermes_project_stewardship.cycles.engine import CycleEngine
from hermes_project_stewardship.persistence.service import StewardshipService
from hermes_project_stewardship.persistence.store import Store


def make_demo_repo(path: Path) -> Path:
    path.mkdir(parents=True, exist_ok=True)

    def git(*args: str) -> None:
        subprocess.run(["git", *args], cwd=str(path), check=True, capture_output=True)

    git("init", "-q")
    git("config", "user.email", "demo@example.com")
    git("config", "user.name", "Demo")
    (path / "README.md").write_text("# demo service\nstatus: all checks pass\n")
    (path / "app.py").write_text("print('hello')\n")
    (path / "test_app.py").write_text("import app\n\ndef test_ok():\n    assert app is not None\n")
    git("add", "-A")
    git("commit", "-qm", "initial commit")
    return path


def main() -> int:
    workdir = Path(tempfile.mkdtemp(prefix="steward-demo-"))
    db_path = workdir / "stewardship.db"
    repo = make_demo_repo(workdir / "my-service")

    store = Store(db_path)
    svc = StewardshipService(store)

    # 1. Enable stewardship: mission + ownership + autonomy.
    svc.enable(
        "my-service",
        mission="Keep tests green; no unreviewed dependency bumps",
        lead_profile="lead",
        member_profiles=["coder", "qa"],
        autonomy_level=2,  # Planner: propose but never write code
        verification_policy={"repo_path": str(repo)},
        release_policy={"require_human_merge_approval": True},
    )
    print("[1] stewardship enabled (autonomy L2)")

    # 2. Declare objectives with deterministic evaluators.
    svc.add_objective(
        "my-service",
        name="tests-pass",
        evaluator_type="command",
        target=">=1",
        severity="high",
        command=[sys.executable, "-m", "pytest", "-q"],
    )
    print("[2] objective declared: tests-pass >=1 (high)")

    # 3. Run a cycle: verify → assess → propose (nothing to fix → NO_ACTION).
    engine = CycleEngine(svc)
    result = engine.run_cycle("my-service", trigger_type="manual")
    print(f"[3] cycle 1 → health={result['health']['state']} "
          f"initiatives={len([i for i in result['initiatives'] if not i.get('refused')])}")

    # 4. Break the tests out-of-band; next cycle detects the regression and
    #    the steward proposes an evidence-backed initiative.
    (repo / "app.py").write_text("raise RuntimeError('regression')\n")

    def proposer(pid, verdict, results, cycle_id):
        props = []
        for res in results:
            if not res["passed"]:
                props.append({
                    "title": f"Restore {res['name']}",
                    "rationale": (
                        f"objective '{res['name']}' failed after last cycle: "
                        f"{res['detail']}"
                    ),
                    "expected_outcome": f"{res['name']} returns to passing",
                    "risk": "medium",
                    "dedupe_key": f"restore-{res['name']}",
                })
        return props

    engine.proposal_fn = proposer
    result = engine.run_cycle("my-service", trigger_type="manual")
    created = [i for i in result["initiatives"] if not i.get("refused")]
    print(f"[4] cycle 2 → health={result['health']['state']}, "
          f"proposed={[c['ref'] for c in created]}")

    # 5. Human approves via any surface (here: CLI path).
    if created:
        approved = svc.approve_initiative(
            created[0]["ref"], actor="sahil", interface="cli"
        )
        print(f"[5] {approved['ref']} approved by sahil (audit recorded)")

    # 6. Inspect canonical state — same answer from every surface.
    print(f"[6] health={svc.latest_health('my-service')['status']}, "
          f"open initiatives={len(svc.initiatives('my-service'))}, "
          f"audit entries={len(store.audit_tail(50))}")

    store.close()
    print("done.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
