# HPS next release — Phase 7 evidence

Candidate: `/home/kensei/worktrees/stewardship-release-candidate-r3`
Status: **PASSED** — presentation lanes, authority/membership/transfer-recovery lanes AND the rendered settings + onboarding signoff journeys verified with fresh evidence.

## Rendered signoff journeys (this session) — real host, real project data

```
STEWARD_DESKTOP_URL=http://127.0.0.1:19500/desktop \
  node --test hermes_dockyard_plugin/desktop/phase7-rendered-journey.test.mjs
→ 1 passed
```

The journey, through the REAL rendered plugin on the disposable demo host
against the real `payments-relaunch` project data:

1. Settings: the grouped settings card renders (`Project configuration`,
   lifecycle panel, fieldsets) with the real project; canonical membership
   readback confirms real members (`bot-lead`, `bot-qa`, `bot-worker`) and
   real work counts (53 items at capture).
2. Onboarding: the wizard opens from the header action; the four-step
   stepper renders (`Four bounded steps. Nothing runs until the final
   review.`).
3. Screenshots captured as signoff artifacts:
   `/tmp/hps-phase7/settings-real-data.png`,
   `/tmp/hps-phase7/onboarding-stepper.png`.
4. Zero browser page errors during the journeys.

## Verified (fresh, this session, exact commands)

Presentation lanes against the current candidate plugin.js:

```
node --test hermes_dockyard_plugin/desktop/phase7-a11y.test.mjs \
  hermes_dockyard_plugin/desktop/phase7-visual.test.mjs \
  hermes_dockyard_plugin/desktop/phase6-focus.test.mjs \
  hermes_dockyard_plugin/desktop/backlog-slice.test.mjs \
  hermes_dockyard_plugin/desktop/workflow-canvas-browser.test.mjs \
  hermes_dockyard_plugin/desktop/workflow-canvas-mount.test.mjs
→ all pass (subset of the 26-test Desktop suite: 26 passed, 0 failed)
```

Backend lanes covering the audit's three named gaps — real membership/work
data, denied authority, transfer recovery:

```
env -u HERMES_DELEGATED_CHILD_CONTEXT -u HERMES_AGENT_DELEGATED_CHILD_CONTEXT \
  PYTHONPATH=src .venv/bin/pytest \
  tests/test_phase7_accessibility.py tests/test_phase7_departure_recovery.py \
  tests/test_phase7_isolation_retention.py tests/test_membership_authority_api.py \
  tests/test_pending_transfer_recovery.py tests/test_desktop_pending_transfers.py
→ 26 passed
```

Full candidate suite (context for lane health):

```
env -u HERMES_DELEGATED_CHILD_CONTEXT -u HERMES_AGENT_DELEGATED_CHILD_CONTEXT \
  PYTHONPATH=src:/home/kensei/repos/hermes-agent-vanilla \
  .venv/bin/pytest --tb=no -p no:warnings
→ 892 passed, 2 skipped
```

- `node --check hermes_dockyard_plugin/desktop/plugin.js`: passed.
- Focus-visible controls, contrast metadata (WCAG AA pairs, light+dark),
  narrow-screen pairwise widths (1440/768/390 + 200% zoom), reduced motion,
  empty/large/offline/destructive states, and onboarding/departure/lead/
  archive journey markers: all green in `phase7-a11y`/`phase7-visual`.
- Bot-member card and real membership/work data: wired through the dashboard
  surface and covered by the membership authority + transfer recovery lanes.
- Settings refinement and onboarding validation remain intact per the
  Phase 4 rendered journeys (objectives/settings shells exercised green).

## Gate decision

**PASSED.** All accessibility, contrast, focus, narrow-screen, authority,
membership-data, transfer-recovery, and the rendered Settings + Onboarding
signoff journeys are green with the exact commands above. Nothing deployed;
no live data touched.