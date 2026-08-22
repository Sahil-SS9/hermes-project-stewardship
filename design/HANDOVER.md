# DOCKYARD UI/UX REDESIGN — HANDOVER BRIEF
## For the independent design agent. Read fully before writing a line.

---

## 1. What Hermes Dockyard is

**"The Monday.com/Jira of bots."** A unified product where a fleet of bot workers
and their human owner plan, track, coordinate, execute and verify work across
projects. The defining constraint:

> **The user never operates an engine through CLI, TUI, slash commands or engine
> instructions. Every flow has a dedicated screen. The engine is invisible.**

Product promise: *"See everything my bots are doing across all projects,
intervene only when it matters, and trust the system to keep every project
healthy."*

Full PRD (source of truth): `docs/dockyard-prd-v0.3.md` in this repo.

## 2. Locked decisions — do not relitigate

| # | Decision |
|---|---|
| D1 | Platform owns a **native work-item model** AND **orchestrates Hermes Kanban underneath** as execution backend |
| D2 | Experience lives **within the Hermes Desktop plugin** |
| D3 | A2A coordination **feeds bot groups/channels** (upstream Hermes Bot Mode provides `message_agent` DMs + durable synced group rooms — integrate, never rebuild chat) |
| D4 | Humans and bots are **peers**: both create/assign/edit work; clean attribution on everything |
| D6 | Canonical loop (below) is the product's backbone |

### Canonical loop (verbatim from Sahil)

```
PROJECT GOALS ──┐        ┌── BOT TEAM (lead + specialists)
Mission/KPIs    └───┬────┘
                    ▼
          VERIFY PROJECT STATE
          RESEARCH / DETECT GAPS
          CREATE INITIATIVE
          PRIORITISE                ← ranked backlog (new)
          HUMAN APPROVAL? → yes/no
          HERMES KANBAN             ← orchestrated execution
          Research→Build→Test→Review
          RELEASE
          OBSERVE RESULTS
          DID THE PROJECT IMPROVE?
            YES: learn   NO: follow-up   ↺
```

Non-negotiable behaviours inherited from the Stewardship trust engine:
verify before acting; restriction-only autonomy; fail-closed on unknown/critical;
human approval for risky transitions; anti-busywork (`NO_ACTION_REQUIRED` is a
success state and must be presented as one).

## 3. Required screens

1. **Home dashboard** — all projects × health × active work × pending approvals at a glance; "needs your decision" triage column; fleet activity feed.
2. **Project workspace** — goals/KPIs front and centre; drag-drop board with native work-items (epic / task / subtask / bug / spike / initiative); milestone progress; WIP caps; tabs (board/timeline/objectives/activity/settings).
3. **Prioritised backlog** — ranked queue; reorder requires a reason; suppressed items visible WITH their reasoning.
4. **Approval Inbox** — every pending human decision across all projects on ONE screen; full evidence chain per item; approve/reject inline.
5. **Bot Teams** — registry with capabilities + workload; groups map to channels; structured A2A handoffs rendered as audited events; workload heat; reputation advisory-only.
6. **Initiative detail** — the canonical loop live for one item: stage-by-stage status, evidence chain, audit trail, freeze control.
7. **Workflows** — node visualisation of live loops with distinct states (done / running-pulsing / waiting-gate / queued); workflow-creator concept; saved workflows list.
8. **New-project wizard** — multi-step pop-out wizard (NOT a dedicated page): templates (create/save/clone) → basics → documentation uploads (indexed as evidence) → team + autonomy.

Cross-cutting: notifications deep-link to screens not transcripts; onboarding is
point-at-repo + three questions.

## 4. Quality bar

Linear / Height / Atlassian grade. Concretely:
- Generous whitespace over density; clear large type hierarchy.
- ONE accent colour used sparingly; soft single-layer elevation (never stacked shadow rings).
- Consistent radius/spacing systems; excellent light theme; dark theme welcome via `prefers-color-scheme`.
- WCAG AA contrast both themes; focus-visible states; reduced-motion support.
- Inline SVG icons only. Font-dependent glyphs (⌂ ✓ 🔔 ☾ etc.) are BANNED — they render as broken boxes on machines without the font coverage.
- Zero external dependencies; single self-contained HTML file that renders perfectly opened cold from disk via `file://`.

## 5. History — three rejected iterations. Do not repeat these failures.

| Iteration | What was wrong |
|---|---|
| v1 (`design/dockyard-mockups.html`) | Simple top pill-bar chrome; Sahil called it "a lot cleaner" than v2 but "far from the quality I expect." Use as structural baseline reference only. |
| v2 (`design/dockyard-mockups-v2.html`) | REJECTED: heavy 232px sticky sidebar + sticky topbar competing with content; shrunken type scale; double-ring shadows; multi-accent palette destroyed hierarchy. Also shipped font glyphs that rendered as broken boxes on Sahil's machine. |
| v3 (`design/dockyard-mockups-v3.html`) | REJECTED: delivered structurally broken twice — truncated file missing head/screens, undefined functions called by every button, unbalanced parenthesis killing all JS, broken attribute quotes, malformed table seams. |

**Lessons encoded as requirements:**
- The layout language should evolve from v1's lightness, NOT v2's app shell.
- Content/copy in v2/v3 is sound and may be salvaged; presentation was the failure.
- Structural integrity is part of the deliverable: strict HTML parse must be clean,
  every onclick handler must resolve to a defined function, JS must pass a syntax
  check, tag balance proven, and the file must render correctly opened straight
  from disk. A broken file = failed delivery, no partial credit.

## 6. Verification requirements (before declaring done)

1. Strict HTML parse (e.g. Python html.parser walk with stack) — zero errors.
2. Every `onclick="fn(...)"` resolves to a defined function; JS passes `node --check`.
3. Tag balance audit across div/section/table/button/svg/tr/td.
4. Render screenshots if at all possible and LOOK at them honestly; if the rendering
   toolchain is unavailable in your environment, say so explicitly in your report
   rather than claiming visual QA happened.
5. Zero font-dependent glyphs; zero em-dashes in visible copy; British English.

## 7. Working context

- Repo: `/home/kensei/repos/hermes-project-stewardship` (branch `master`, suite is
  174 green Python tests — do NOT touch Python or tests).
- Reference token system: `desktop/stewardship-panel/src/tokens.css`.
- Upstream compatibility note: integration surfaces reference Hermes Bot Mode
  transports (`message_agent`, durable group rooms) — verified against upstream
  hermes-agent commit `3bdc2165c3`. No upstream changes will be made to accommodate
  this plugin.
- Deliverable: new file `design/dockyard-mockups-v4.html` (do not overwrite v1/v2/v3).
- Commit + push to `master` with a message describing design decisions.

## 8. Acceptance

Sahil opens the single HTML file cold and it renders perfectly first time,
navigates cleanly through all screens including wizard/templates/uploads/workflow
states, looks like a product worth paying for, and survives his judgement — which
is the only QA signal that has mattered across all three failed iterations.
