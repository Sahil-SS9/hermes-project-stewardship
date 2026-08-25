# Mockup vs Implementation - Historical Feature Discrepancy Report

> Historical snapshot from the initial three-tab implementation. The current Desktop plugin has since implemented or intentionally superseded most entries. Use [`../roadmap.md`](../roadmap.md) for remaining work and do not treat the counts below as current.

Reference mockup: `/home/sahil/Desktop/carad/Hermes-Dockyard-v4.html` (106,801 chars, 7 screens, 101 buttons, 14 overlays, drag-drop + wizard + toasts).
Current implementation: `~/.hermes/desktop-plugins/hermes-dockyard/plugin.js` (3 tabs).

## Why the gap exists (short answer)

The mockup is a **fully interactive design prototype**: all seven screens are hand-drawn with
sample data and working simulated interactions. The desktop implementation was scoped to
three tabs as a first slice and only implements the screens that map directly onto the
already-built backend endpoints (`/dashboard`, `/inbox`, `/notifications`). Everything else
in the mockup was designed but never carried across — partly by sequencing (core loop
first), partly because some mockup features need plugin-api routes that were never added.

## Discrepancy matrix

Legend: mock = in carad mockup · impl = in current desktop implementation · API = backend
readiness today. Verdicts: **implement** (do it), **extend**, **needs route** (add plugin-api
endpoint first), **intentional** (deviation is deliberate), **confirm** (owner decision).

| # | Feature | Mock | Impl | API | Verdict |
|---|---------|------|------|-----|---------|
| 1 | Attention card ("decisions owed" + review CTA) | yes | yes | ready | implemented |
| 2 | Metric strip: health / active / milestones / result | yes | partial — milestones tile missing | milestones API exists | extend |
| 3 | Project rows with health badges | yes | yes | ready | implemented |
| 4 | Fleet activity feed (attributed events) | yes | **missing** | `/projects/{id}/events` exists | implement |
| 5 | Approval evidence grid (observed / proposed / rollback) | yes | **missing** | partial — initiative has rationale; observed+rollback fields not modelled | decide: extend initiative schema or render available fields |
| 6 | Approve action | yes | yes | ready | implemented |
| 7 | Reject action | yes | **missing** | **ready** — `POST /initiatives/{ref}/reject` already exists | implement now |
| 8 | Show/hide evidence-chain toggle | yes | **missing** | frontend-only | implement |
| 9 | Project detail screen s2 (mission KPIs, Board/Timeline/Objectives/Activity/Settings tabs, project rules) | yes | **missing** | work-items, settings, initiatives, events endpoints exist | implement |
| 10 | Prioritised backlog board s3 with **drag-drop re-rank** | yes | **missing** | service has `backlog_list`/`rerank(reason)` but no HTTP routes | needs 2 routes, then implement; reason-capture modal pairs with it |
| 11 | Reason-capture modal on rank changes | yes | **missing** | rerank requires a reason string | pairs with #10 |
| 12 | Bot teams screen s5 (registry cards, groups, workload heat, A2A message feed) | yes | **missing** | `/bots`, `/workload` exist; A2A feed has no HTTP route | needs 1 route, then implement |
| 13 | Initiative loop screen s6 (stage graph, freeze action, per-stage evidence) | yes | **missing** | initiatives list exists; stage/freeze transitions not exposed | needs routes + data check, then implement |
| 14 | Workflows screen s7 (saved workflows list + creator wizard) | yes | **missing** | `view_save`/`views_list` exist in service; no HTTP routes | needs 2 routes, then implement |
| 15 | Onboarding wizard (multi-step project creation) | yes | **missing** — replaced by a CLI hint card | `POST /onboard` ready | implement (backend ready) |
| 16 | Toasts on actions | yes | **missing** | frontend-only | implement |
| 17 | Notifications as appbar popover | yes | standalone tab instead | ready | intentional deviation — panel layout favours a tab; owner to confirm |
| 18 | In-panel light/dark toggle | yes | follows OS instead | n/a | intentional deviation — OS-follow is cleaner; owner to confirm |
| 19 | Command-palette entry "Dockyard: Open fleet overview" | no | added | n/a | intentional addition (desktop integration) |

## Counts

- Implemented and matching the mockup: **3 core pieces** (#1, #3, #6)
- Ready to implement immediately (backend done): **#4, #7, #9, #15, #16**
- Need small plugin-api additions before UI work: **#10–#12, #14** (backlog rerank, A2A feed, saved views, plus stage/freeze for #13)
- Need a data-model decision first: **#5** (evidence fields observed/proposed/rollback are not in the initiative schema)
- Deliberate deviations to confirm with the owner: **#17, #18, #19**

## Recommendation for the redesign agent

Treat this matrix as the feature backlog. Order of attack:
1. Quick wins with zero backend work: #7 reject, #8 evidence toggle, #16 toasts.
2. Screen builds over existing endpoints: #4 activity feed, #9 project detail, #15 onboarding wizard.
3. Route-then-build: #10+#11 backlog board, #12 bot teams, #14 workflows, #13 initiative loop.
4. Owner decisions: #5 evidence schema, #17/#18 layout/theme deviations.
