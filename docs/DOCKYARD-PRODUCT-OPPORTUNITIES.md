# Dockyard broader product opportunities

Status: selection menu; none are authorised for implementation by this file.
Canonical requirement details remain in [`../roadmap.md`](../roadmap.md).

## Recommended product sequence

Select **O1 + O2** as the next product wave. Together they complete daily work
management and Dockyard's proposal-to-outcome promise. Add O3/O4 after that.
Keep O8 disabled unless elevated autonomy becomes an explicit strategic goal.

## Opportunity menu

### O1. Complete work management

Roadmap: DY-P1-01
Value: High | Confidence: High | Effort: Medium | Risk: Medium

Build:

- edit title/type/body/labels/estimate/due date;
- reassign human <-> bot with actor attribution;
- add/remove parent, dependency and related-item links;
- expose cycle/cross-project failures in UI;
- complete item detail and Board actions.

Dependencies: canonical mutation APIs already exist; UI/actor contracts need
one approved design.

Recommendation: **select first**.

### O2. Initiative-to-outcome loop

Roadmap: DY-P1-04
Value: Very high | Confidence: Medium | Effort: High | Risk: Medium

Build:

- proposal -> backlog -> approval -> canonical execution;
- initiative/work/board deep links;
- idempotent post-delivery observation trigger;
- outcome/regression updates across initiative, health and reputation;
- one full end-to-end scenario.

Dependencies: O1 editing/dependency flow; observation trigger contract.

Recommendation: **select with O1, execute after O1 foundations**.

### O3. Planning and portfolio

Roadmap: DY-P1-02 + DY-P1-03
Value: High | Confidence: Medium | Effort: High | Risk: Medium

Build:

- milestone list/edit/close and sprint commitments;
- schedule fields and real Timeline;
- role-aware Saved View queries over project/status/assignee/label/milestone;
- typed profile/group sharing and deep links;
- portfolio layout and forecasting.

Decisions:

- sharing subjects: recommend typed `{kind: profile|group, id}`;
- scheduling: recommend optional canonical `start_at`/`due_at` plus milestone;
- forecast method and timezone.

### O4. Deterministic CI/release evidence

Roadmap: DY-P1-06
Value: High | Confidence: Medium | Effort: Medium | Risk: Medium

Build:

- backend-neutral integration collector;
- GitHub Checks/Releases reference adapter;
- host-managed credential references, never stored secrets;
- redaction hook before persistence;
- glob/required-section declared-file policies;
- trend windows feeding health.

Decision: first provider. Recommendation: GitHub.

### O5. Cost and operational observability

Roadmap: DY-P1-07
Value: Medium | Confidence: High | Effort: Medium | Risk: Low

Build:

- close phase timing for success/failure/crash;
- provider-reported usage when available;
- explicit unknown estimates otherwise;
- budget context in dashboard/reports;
- DORA/error-budget release monitoring packet.

### O6. Live fleet coordination

Roadmap: DY-P2-01
Value: Medium-high | Confidence: Medium | Effort: High | Risk: High

Build:

- group update/delete and assignment;
- handoff composer with evidence links;
- real channel delivery and stable platform message IDs;
- two-bot audited handoff;
- advisory-only reputation.

Decisions: pilot platform/channel, delivery failure owner and channel-ID source.
Recommendation: defer until local Desktop pilot is stable.

### O7. Scheduler operations

Roadmap: DY-P2-02
Value: Medium | Confidence: Medium | Effort: Medium | Risk: High

Build:

- explicit cron trigger command/API;
- lock-safe, idempotent invocation;
- operator-visible failure evidence;
- no duplicate cycles/runs;
- activation and rollback runbook.

Dependency: manual workflows and observation loop must soak first.
Recommendation: build later; activation always separate.

### O8. Levels 4-5 merge authority

Roadmap: DY-P1-05
Value: Conditional | Confidence: Low | Effort: High | Risk: Very high

Build:

- real merge-request gate with stored evidence;
- explicit human authority and fail-closed freeze;
- full capability-delta audit on level change;
- race/idempotency proof.

Decision: whether elevated autonomy is wanted at all.
Recommendation: **do not select now; keep disabled**.

### O9. Supported external API

Roadmap: DY-P2-03 + DY-P2-04 + DY-P2-05
Value: High for external use | Confidence: High | Effort: Medium | Risk: Medium

Build:

- strict schemas across all public requests;
- bounded pagination and stable ordering;
- generated examples and actor/error documentation;
- current threat model and credential/privacy boundaries;
- CI coverage/fresh-clone gates and optional-lane reporting.

Dependency: required before public third-party API support, not before local-only
Desktop experimentation.

### O10. Product walkthrough and demo

Roadmap: DY-P3-01 + DY-P3-02
Value: Medium | Confidence: Medium | Effort: Medium | Risk: Low

Build:

- one seeded owner tutorial;
- real light/dark screenshots;
- deterministic incident-to-recovery demo;
- Desktop and Discord simulator on the same state;
- reproducible narration/media.

Dependency: O2 should be complete so the demo proves the intended product loop.

## Suggested selection bundles

- **Core product:** O1 + O2
- **Planning product:** O3
- **Evidence product:** O4 + O5
- **External platform:** O9 + O10
- **Fleet automation:** O6 + O7
- **High autonomy:** O8 only after explicit risk approval

## Reply format

Choose any set, for example:

`SELECT O1,O2; HOLD O6,O7,O8; REVISIT O3,O4 AFTER CORE`

Selection authorises discovery/specification only unless the reply explicitly
says `BUILD`.
