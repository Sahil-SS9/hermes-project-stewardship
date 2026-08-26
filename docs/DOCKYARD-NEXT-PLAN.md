# Dockyard next plan

Status: proposed sequencing over the canonical [`../roadmap.md`](../roadmap.md)
Candidate: `0.2.0rc1` local engineering candidate
Rule: this document orders the roadmap; it does not create a second backlog.

## Recommendation

Close and commit the current RC first, then harden it for a bounded Desktop
pilot. Do not hold the proven canonical convergence work until every long-term
product ambition is built. After the pilot gate, prioritise the complete
initiative-to-outcome loop, then planning depth, then conditional autonomy and
fleet expansion.

No push, deployment, scheduler activation, production migration or service
restart is implied by this sequence.

## Prioritised sequence

Relative WSJF = cost of delay / effort. Scores are directional, not promises.

| Order | Roadmap scope | Outcome | CoD | Effort | WSJF | Confidence | Why now |
|---:|---|---|---:|---:|---:|---|---|
| 1 | DY-R0-01 | Review and local commit of exact green candidate | 10 | 2 | 5.0 | High | Dirty/uncommitted state blocks every release claim |
| 2 | DY-P2-05 | Fresh-clone bootstrap, coverage gate and optional-lane reporting | 9 | 4 | 2.3 | High | Removes environment-dependent proof gaps before pilot |
| 3 | DY-P2-03 + DY-P2-04 | Pagination/schema consistency, OpenAPI examples and current threat model | 8 | 4 | 2.0 | High | Required before treating the API as a supported external contract |
| 4 | DY-P3-01 + DY-P3-03 | Owner walkthrough, final artefact identity and gated pilot packet | 10 | 4 | 2.5 | High | Converts green engineering into an approvable release candidate |
| 5 | DY-P1-01 | Full work editing, reassignment and dependency mutation in product UI | 9 | 5 | 1.8 | High | Core day-to-day usability and prerequisite for complete delivery flows |
| 6 | DY-P1-04 | Proposal -> backlog -> approval -> execution -> observation -> regression loop | 10 | 8 | 1.3 | Medium | Closes Dockyard's central product promise end to end |
| 7 | DY-P1-02 + DY-P1-03 | Milestones/sprints plus role-aware Saved View queries | 7 | 7 | 1.0 | Medium | Planning depth after execution fundamentals are complete |
| 8 | DY-P1-06 | CI/release evidence adapter, redaction and trend evaluators | 7 | 6 | 1.2 | Medium | Improves evidence quality; provider choice is still needed |
| 9 | DY-P1-07 | Honest phase timing and cost accounting | 5 | 4 | 1.3 | High | Useful operations data, but not a blocker for the core loop |
| 10 | DY-P2-01 | Live group management and channel-backed handoffs | 6 | 7 | 0.9 | Medium | Valuable only when channel ownership and pilot scope are agreed |
| 11 | DY-P2-02 | Scheduler adapter and operator-visible failures | 5 | 5 | 1.0 | Medium | Build after manual flows are stable; activation remains separate |
| 12 | DY-P1-05 | Levels 4-5 merge gate and capability audits | 8 | 9 | 0.9 | Low | High risk; only build if elevated autonomy is explicitly wanted |
| 13 | DY-P3-02 | Repeatable buyer/operator demo | 4 | 4 | 1.0 | Medium | Best after the full product loop is coherent |

## Dependencies

- **Current RC commit** depends on owner approval for a path-scoped commit in
  both candidate worktrees. Push and deployment remain separate.
- **Fresh-clone proof** depends on committed source and declared dependency
  installation; dirty-worktree proof is not a substitute.
- **External API support** depends on uniform strict request models, bounded
  pagination and generated OpenAPI examples.
- **Initiative outcome loop** depends on full item editing/dependencies,
  cross-screen deep links and a durable post-delivery observation trigger.
- **Timeline** depends on canonical scheduling fields, milestone assignment and
  date semantics. It should remain unavailable until those contracts exist.
- **Role-aware Saved Views** depend on deciding whether access subjects are
  Hermes profiles, Dockyard bot groups, or both.
- **Verification integrations** depend on one reference provider and a
  credential-reference convention that never stores credentials.
- **Levels 4-5** depend on an explicit merge provider, authority model,
  fail-closed recovery and owner acceptance of the blast radius.
- **Live bot groups** depend on a selected messaging channel, stable channel
  IDs and ownership of delivery failures.
- **Scheduler activation** depends on manual flow soak evidence and a separate
  deployment approval.
- **Production legacy migration** depends on a read-only source inventory,
  marker-owned isolated rehearsal, fresh backup and approved target paths.

## Decisions required

### D1. Release scope

Choose whether `0.2.0rc1` should become a bounded local/Desktop pilot after
release hardening, or whether release waits for the full Priority-1 product
loop.

**Recommendation:** pilot the current RC after orders 1-4. Do not wait for every
roadmap item; keep unsupported features visibly unavailable.

### D2. Independent review versus direct-only execution

Settled for `0.2.0rc1`: the owner's direct-only instruction is recorded as the
independent-review waiver. This does not set policy for later releases.

### D3. Elevated autonomy

Decide whether levels 4-5 are part of the intended product release.

**Recommendation:** keep levels 4-5 disabled and defer DY-P1-05 until the lower
levels and full initiative loop have pilot evidence.

### D4. Saved View identity model

Choose profile IDs, bot-group IDs, or both for shared-view access.

**Recommendation:** support both through a typed subject `{kind, id}` contract;
do not retain a single `shared` boolean as the final model.

### D5. First verification provider

Choose the first CI/release integration.

**Recommendation:** GitHub Checks/Releases, because GitHub webhook and HMAC
surfaces already exist. Credentials remain references to host-managed secrets.

### D6. Scheduling model

Confirm whether Timeline is milestone-based, explicit start/due dates, or both.

**Recommendation:** canonical optional `start_at`/`due_at` fields plus milestone
membership. Do not derive dates from rank or status.

### D7. Pilot channel and deployment boundary

Choose local Desktop only, or Desktop plus one real Discord project channel.

**Recommendation:** local Desktop first. Add one Discord channel only after the
manual workflow and delivery error path are accepted.

## Definition of ready for the next build slice

A roadmap item enters implementation only when it has:

- one owner-approved outcome;
- explicit non-goals;
- affected canonical authority and write seam;
- failure/rollback boundary;
- behavioural acceptance tests;
- deployment/activation classification;
- no unresolved dependency that would change the implementation route.

## Immediate next action

Select which broader product opportunities should enter the next build slice,
and separately decide whether to publish or run a local Desktop pilot. Do not
combine product selection with publish, activation, migration or scheduler
approval.
