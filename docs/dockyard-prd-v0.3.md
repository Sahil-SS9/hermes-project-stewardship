# HERMES DOCKYARD
## PRD v0.3 — Platform Realignment

**Status:** Draft for review (2026-08-21). Not yet council-reviewed or approved.
**Supersedes:** nothing. Extends `docs/prd-v0.2.md` (Stewardship core), which remains accurate for what is built today.
**Decision record:** All five structural decisions were made by Sahil in chat on 2026-08-21 and are quoted in §1.

---

## 1. Decision Record (verbatim, 21/08/2026)

| # | Question | Sahil's decision |
|---|---|---|
| D1 | Own the work-management model or orchestrate Kanban underneath? | "yes, however it should be also able to support the orchestration of hermes kanban underneath" → **native work-item model, plus Hermes Kanban as an execution backend**. **CORRECTED (Phase 0 PM-0015, 2026-09-10):** Hermes Kanban is the canonical work/execution model (tasks, epics, status, claims, assignments); Stewardship integrates with it and owns project-governance metadata only. "WorkItem" below is compatibility/read-model vocabulary mapped to Hermes Kanban task rows — Dockyard never stores a second canonical work-item store. |
| D2 | Where does the Monday.com/Jira-class experience live? | **"within the plugin"** — the Hermes Desktop plugin surface |
| D3 | What does integrated A2A mean? | **"feeds in to bot groups/channels"** — coordination lands in the fleet's shared group channels |
| D4 | Do humans work items directly? | **"both"** — humans and bots create/assign/edit work side by side |
| D5 | PRD form | **"a separate document should be created IF WE PROCEED WITH THIS"** → this document; Stewardship repo keeps its scope |
| D6 | Canonical loop | Sahil's DOCKYARD flow diagram (§2), which wraps the existing stewardship cycle |

## 2. Product Premise

**Hermes Dockyard is the Monday.com/Jira of bots**: a unified system where a fleet of
bot workers and their human owners plan, track, coordinate, execute and verify work
across projects — without anyone operating the engine through CLI, TUI, slash
commands or engine instructions.

The unit of autonomy graduates from *"complete this task"* (Kanban) through
*"remain responsible for this project"* (Stewardship v0.1) to:

> **"See everything my bots are doing across all projects, intervene only when it
> matters, and trust the system to keep every project healthy."**

### 2.1 Canonical loop (Sahil's flow, verbatim structure)

```
PROJECT GOALS ──────┐         ┌────────── BOT TEAM
Mission/KPIs/Rules  │         │  Lead + Specialists
                    └────┬────┘
                         ▼
                 VERIFY PROJECT STATE        ← Stewardship engine (built)
                         ▼
              RESEARCH / DETECT OPPORTUNITIES
                         ▼
                  CREATE INITIATIVE          ← initiative service (built)
                         ▼
                     PRIORITISE              ← NEW: prioritised backlog
                         ▼
                 HUMAN APPROVAL? ──→ Yes/No  ← approval gates (built)
                         ▼
                   HERMES KANBAN             ← execution backend (orchestrated)
                         ▼
              Research → Build → Test → Review
                         ▼
                       RELEASE
                         ▼
                  OBSERVE RESULTS            ← outcome evaluation (built)
                         ▼
                DID THE PROJECT IMPROVE?
                    ↙            ↘
              YES: learn      NO: follow-up
                    ↺───────────↺
```

### 2.2 Non-negotiables (carried from v0.1 §15.2)

- One canonical backend. Every screen, channel and bot reads/writes the same state.
- Verification before action. No status claim without deterministic evidence.
- Restriction-only autonomy. Policy narrows bot permissions; never escalates.
- Fail closed on unknown/critical state. Human approval for risky transitions.
- Humans and bots are peers in the same work model (D4): both appear on boards,
  both own items, approvals remain permission-bound regardless of who initiates.

## 3. Domain Model (new + extended entities)

### 3.1 New platform entities

| Entity | Purpose | Key fields |
|---|---|---|
| **WorkItem** *(legacy/compatibility read-model — see D1 correction)* | Read-model projection over canonical **Hermes Kanban tasks** (epic, task, subtask, bug, spike). NOT a Dockyard-owned store: status/claims/assignments are read from and written through Hermes Kanban; Dockyard may cache projections + Stewardship metadata (labels, views, evidence links) but never as authoritative state | id, type, title, parent_id, project_id, assignee (human or bot), status, priority, labels, due, estimate, source (human\|bot\|initiative), blocked_by[] |
| **Epic** *(legacy/compatibility read-model)* | Grouping of initiatives/tasks toward a goal, represented through the Hermes Kanban task/tenant convention (see `vanilla_host.py:300-337`) | goal_refs[], health_rollup |
| **Milestone/Sprint** | Time-bounded delivery window | window, committed_item_ids[], completion forecast |
| **BacklogEntry** | Prioritised queue position for a proposed item | item_ref, rank, priority_reason, aged_since |
| **BotRecord** | Registry entry for one worker profile | profile_id, display_name, capabilities[], current_work[], load, reputation_summary, group_memberships[] |
| **BotGroup** | Persistent team with its own channel(s) (D3) | name, member_bot_ids[], lead_bot_id, channel_ref, active_assignments[] |
| **A2AMessage** | Structured inter-bot coordination event | from_bot, to_group/channel, type (handoff\|status_query\|capability_request\|result), refs[], audit_id |
| **View** | Saved, shareable query over work (board/table/timeline/portfolio) | owner, filters, layout, shared_with |

### 3.2 Extended existing entities

| Entity | Extension |
|---|---|
| Project | gains goals/KPIs/rules as first-class editable object (not policy JSON); portfolio membership; milestone set |
| Initiative | becomes visible on boards/timelines like any other work: promotion creates/links a canonical **Hermes Kanban task** and records the initiative's Stewardship metadata/evidence alongside it (no second native WorkItem store) |
| Stewardship policies | unchanged — they attach to projects/bots exactly as today |

### 3.3 Relationship to Stewardship v0.1

Stewardship is retained whole as Dockyard's **trust engine**:

```
Dockyard platform (goals · teams · backlog · views · UI)
        │ uses
Stewardship trust engine (verify · propose · approve · measure · fail-closed)
        │ orchestrates
Hermes Kanban (execution backend)   +   Gateway channels (coordination surface)
```

The existing `hermes-project-stewardship` repo stays green and unexpanded. New
platform services live in a new package (`dockyard/`) that imports the
stewardship engine as a library dependency.

### 3.4 Canonical ownership (PM-0015 correction, Phase 0 evidence 2026-09-10)

Hermes Kanban is the canonical work/execution system. This is a hard correction
to the original v0.3 draft (decision D1) based on the Phase 0 vanilla-host
capability spike:

- **Hermes Kanban owns:** task and epic records, hierarchy/links, task status
  transitions, claims/running locks, assignments and reassignments, task
  events/comments, and the execution lifecycle.
- **Stewardship/Dockyard owns:** project membership and lead metadata,
  project/initiative governance metadata, objectives, evidence and outcome
  records, approval gates, feature enablement, and plugin-owned
  provisioning/reconciliation journals.
- **Legacy WorkItem tables are migration/compatibility metadata only.** Any
  Dockyard-side `work_items`/WorkItem storage is a read-model projection cache
  keyed to canonical Hermes task IDs — never authoritative state. Status,
  claims and assignees must be read from (and written through) Hermes Kanban;
  duplicating them as authoritative Dockyard state is prohibited.
- The shared boundary stores canonical Hermes task references plus governance
  metadata; it must not shadow canonical task status, claim, or assignee
  fields.

## 4. Functional Requirements

### 4.1 Work management (PM core)

| FR | Requirement |
|---|---|
| PM-01 | Create/edit/close **Hermes Kanban tasks** of type epic/task/subtask/bug/spike with hierarchy (Kanban owns the records; Dockyard UI/API drives them) |
| PM-02 | Human OR bot can create/assign/edit any task (D4) through Hermes Kanban; actor identity + interface recorded as Stewardship attribution metadata |
| PM-03 | Backlog per project with explicit ranking; PRIORITISE stage writes here; reordering requires reason |
| PM-04 | Milestones/sprints with committed items and progress roll-up |
| PM-05 | Labels, filters, saved views (board/table/timeline/portfolio), shareable |
| PM-06 | Cross-project portfolio view with health roll-ups (v0.1 deferred item — now in scope) |
| PM-07 | Initiative → Hermes Kanban task promotion preserves evidence chain end-to-end (Stewardship records the evidence; Kanban owns the task) |
| PM-08 | Blocked-by / related-item graph visible on every item |

### 4.2 Bot management & A2A

| FR | Requirement |
|---|---|
| BM-01 | Bot registry: every fleet profile discoverable with capabilities and current workload |
| BM-02 | BotGroups with dedicated channels; assignment targets a group, lead routes internally |
| BM-03 | A2A messages (handoff, status query, capability request, result) are structured, audited events — not chat noise |
| BM-04 | A2A feeds bot groups/channels (D3): handoffs post to the group channel with full context links |
| BM-05 | Load balancing view: who is busy, who is idle, what is stuck |
| BM-06 | Reputation summary surfaced from measured outcomes (regressed/completed history) — advisory only, never auto-routes |

### 4.3 Trust engine (existing, integration requirements only)

| FR | Requirement |
|---|---|
| TE-01 | Dockyard calls stewardship verify/approve/measure via library API; no state duplication |
| TE-02 | Approval Inbox aggregates all pending human decisions across projects into one screen |
| TE-03 | Fail-closed states render prominently (frozen/unknown projects cannot be missed) |

### 4.4 Product experience (the hard requirement)

| FR | Requirement |
|---|---|
| UX-01 | **No engine operation requires CLI/TUI/slash commands.** Every flow in §2.1 has a dedicated screen. CLI remains internal plumbing only. |
| UX-02 | Home dashboard: all projects × health × active work × pending approvals at a glance |
| UX-03 | Project workspace: goals/KPIs front and centre; board, timeline, activity as tabs |
| UX-04 | Drag-drop board over canonical Hermes Kanban tasks, rendered as a Dockyard board (presentation projection — drag-drop translates to Kanban status/claim mutations, never a parallel store) |
| UX-05 | Approval Inbox: one screen, full evidence context per decision, approve/reject inline |
| UX-06 | Bot Team screens: roster, workload heat, assignments, group channels |
| UX-07 | Notifications route to the right screen deep-link, not to a transcript |
| UX-08 | Zero-setup onboarding: point the product at a repo/folder, answer 3 questions, done |

## 5. Surface Architecture

Per D2, the product lives **within the Hermes Desktop plugin**, but is architected
as a web app served by the Dockyard backend so the identical UI could graduate to
standalone later without rewrite:

```
┌──────────────────────────────────────────────────────┐
│ Desktop plugin shell                                 │
│   ┌────────────────────────────────────────────┐     │
│   │ Dockyard Web UI (React SPA, served by      │     │
│   │ dockyard backend, embedded in plugin pane) │     │
│   └────────────────────────────────────────────┘     │
│                        │ RPC (extends stewardship /v1)│
│   ┌────────────────────────────────────────────┐     │
│   │ Dockyard backend                           │     │
│   │  work-items · backlog · milestones ·       │     │
│   │  bots/groups · A2A bus · views             │     │
│   │        │ library import                    │     │
│   │  Stewardship trust engine (existing repo)  │     │
│   │        │ orchestrates                      │     │
│   │  Hermes Kanban · Gateway channels · Cron   │     │
│   └────────────────────────────────────────────┘     │
└──────────────────────────────────────────────────────┘
```

Gateway channels remain a first-class control/notification surface (D3) — but they
render summaries with deep-links into the product; they are never required for
operation.

## 6. Milestones (gates, not dates)

| Gate | Deliverable | Exit criterion |
|---|---|---|
| **G0. Design lock** | Clickable HTML mockups of all §4.4 screens, built on the desktop panel's token system | Sahil clicks through and approves look-and-feel |
| G1. PM core | Hermes Kanban integration model (tasks/hierarchy via Kanban), migration/compatibility WorkItem read-model, backlog, labels, saved views + API | Board/table views live against real Hermes Kanban data |
| G2. Bot layer | Registry, groups/channels, A2A message bus, workload views | Two bots hand off a task through a group channel, fully audited |
| G3. Platform ⇄ engine | Dockyard work-items ⇄ initiative promotion ⇄ Kanban orchestration | An initiative flows: proposal → backlog → approve → Kanban → measured outcome, zero CLI steps |
| G4. Product polish | Dashboard, Approval Inbox, notifications, onboarding wizard | Sahil completes a full week of oversight without opening a terminal |
| G5. Hardening | Adversarial suite extension (multi-actor races, A2A injection attempts, permission matrix fuzzing) | Existing 174-test discipline extended to every new entity |

## 7. Explicitly Out of Scope (v0.3)

- Standards-based external A2A protocols (agent discovery/auth beyond the fleet) — schema designed forward-compatible (D3 kept internal).
- Automatic release publishing; levels 4–5 merge autonomy (still disabled).
- Multi-machine distributed replication.
- Mobile clients.

## 8. Acceptance Criteria (headline)

1. The entire §2.1 loop is completable start-to-finish **entirely within the product UI**.
2. A human and a bot each create work that the other executes, on the same board, with clean attribution.
3. Pending approvals across all projects resolve from one screen with evidence attached.
4. Two bots exchange a structured handoff through a bot-group channel; the trail is auditable end-to-end.
5. Every screen answers "what does my fleet owe me right now?" in under 5 seconds of looking.
6. The stewardship guarantees (verify-first, restriction-only, fail-closed, anti-busywork) demonstrably survive the larger surface — adversarial tests prove no new path bypasses them.

---

*This draft goes to LLM Council review and Sahil sign-off together with the design
mockup pack (Gate G0). No implementation tasks may be created before both pass.*
