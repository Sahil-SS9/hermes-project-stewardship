"""Built-in workflow templates (Sahil, 07/10/2026: "increasing the templates to 30").

The 30 templates ship inside the Desktop plugin as one JSON file
(`hermes_dockyard_plugin/desktop/src/project/workflow-design/builtin-templates.json`),
listed in the New workflow dialog next to templates saved in the library. This
test holds them to the same validator as every workflow save, and to the rules
they were designed to:

- the 30 names are the designed set, in five groups (7, 6, 6, 5, 6);
- every template keeps your sign-off and stays small (4 to 8 steps);
- a step that runs only if another gets stuck is the last step on its path
  (the engine does not hold later steps for a branch yet), listed after the
  step it watches, and that step repeats;
- no bot is named: who does the work and who checks it are asked on use;
- every step a bot does says what to do.
"""
from __future__ import annotations

import json
import re
from pathlib import Path

from hermes_project_stewardship.persistence.workflow_service import (
    MAX_LOOP_ITERATIONS,
    WorkflowService,
)

ROOT = Path(__file__).resolve().parents[1]
BUILTINS = ROOT / "hermes_dockyard_plugin/desktop/src/project/workflow-design/builtin-templates.json"

GROUPS = {
    "loops": ["reach-a-goal", "improve-a-number", "migrate-step-by-step",
              "work-through-a-checklist", "try-several-keep-the-best",
              "find-the-breaking-change", "run-experiments"],
    "build-and-fix": ["plan-then-build", "test-first-change", "fix-a-reported-bug",
                      "fix-failing-ci", "upgrade-a-dependency", "check-a-ui-change"],
    "check-quality": ["review-with-three-reviewers", "raise-test-coverage", "security-sweep",
                      "explore-the-app", "red-team-an-ai-feature", "tune-a-prompt"],
    "look-after": ["docs-follow-code", "write-an-onboarding-guide", "triage-the-backlog",
                   "investigate-an-incident", "prepare-a-release"],
    "research-writing": ["research-report", "draft-critique-refine", "challenge-a-plan",
                         "fact-check-a-draft", "make-a-decision", "feedback-to-themes"],
}
# Names the practice data already uses for saved library templates.
PRACTICE_NAMES = {"fix-until-green", "release-check", "weekly-tidy"}


def _load() -> dict:
    return json.loads(BUILTINS.read_text(encoding="utf-8"))


def test_thirty_builtins_in_five_groups_match_the_research_doc():
    data = _load()
    assert data["schema"] == "dockyard.builtin-templates/v1"
    assert [g["id"] for g in data["groups"]] == list(GROUPS)
    assert all(g["title"].strip() for g in data["groups"])
    templates = data["templates"]
    assert len(templates) == 30
    for group, names in GROUPS.items():
        assert [t["name"] for t in templates if t["group"] == group] == names, group
    names = [t["name"] for t in templates]
    titles = [t["title"] for t in templates]
    assert len(set(names)) == 30 and len(set(titles)) == 30
    assert not PRACTICE_NAMES & set(names)
    for t in templates:
        assert re.fullmatch(r"[a-z0-9]+(-[a-z0-9]+)*", t["name"]), t["name"]
        assert 0 < len(t["summary"]) <= 140, t["name"]
        assert t["based_on"].strip(), t["name"]


def test_every_builtin_passes_the_save_validator_unchanged():
    for t in _load()["templates"]:
        cleaned = WorkflowService._validated({"nodes": t["nodes"]})["nodes"]
        assert [n["id"] for n in cleaned] == [n["id"] for n in t["nodes"]], t["name"]
        for raw, clean in zip(t["nodes"], cleaned):
            for key in ("title", "depends_on", "body", "loop", "when"):
                if key in raw:
                    assert clean[key] == raw[key], (t["name"], raw["id"], key)


def test_builtins_follow_the_template_rules():
    for t in _load()["templates"]:
        name = t["name"]
        nodes = t["nodes"]
        by_id = {n["id"]: n for n in nodes}
        order = [n["id"] for n in nodes]
        assert 4 <= len(nodes) <= 8, name
        assert any(n.get("kind") == "gate" and n.get("human_gate") is True for n in nodes), \
            f"{name}: keeps your sign-off"
        assert not any("phase_team" in n for n in nodes), f"{name}: no bot named"
        checks = t["check_steps"]
        for step in checks:
            assert step in by_id and by_id[step].get("kind") != "gate", (name, step)
        workers = [n for n in nodes if n.get("kind") != "gate" and n["id"] not in checks]
        assert workers, f"{name}: someone does the work"
        for n in nodes:
            if n.get("kind") != "gate":
                assert (n.get("body") or "").strip(), (name, n["id"])
            loop = n.get("loop")
            if loop:
                assert 1 <= loop["max_iterations"] <= MAX_LOOP_ITERATIONS, (name, n["id"])
                assert loop["until"] == {"status": "done"}, (name, n["id"])
            when = n.get("when")
            if when:
                assert when["status"] == "blocked", (name, n["id"])
                assert order.index(when["node"]) < order.index(n["id"]), (name, n["id"])
                assert by_id[when["node"]].get("loop"), (name, n["id"])
                assert not any(n["id"] in m["depends_on"] for m in nodes), \
                    f"{name}: branch step {n['id']} must be last on its path"
