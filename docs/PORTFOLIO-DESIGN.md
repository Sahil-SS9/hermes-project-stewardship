# Portfolio Dashboard — Anti-Slop Design Brief (final feature pre-release-cut)

## Purpose

One screen that answers, without leaving the page:

1. **What needs attention right now?** (attention-first, per dashboard UX research:
   surface actionable items, prioritise warnings)
2. **Where is each project standing?** (status, velocity, next milestone)
3. **Where does work sit?** (distribution by status across the portfolio)

Type: **functional/monitoring hybrid** — a "product home page" that doubles as an
at-a-glance monitor. Not a report, not an explorer.

## Anti-slop rules (hard constraints, from research)

Research sources: BSWEN anti-patterns guide, anti-slop-library (slop indicators),
Pencil&Paper dashboard UX patterns, Linear/Linear-Insights reference behaviour.

1. **No purple/indigo gradients, no gradient text, no glassmorphism/blur.**
   Existing tokens only: `#0d1117` bg, `#161b22` panels, `#5b687a` lines,
   `#4c8dff` accent, `#d29922` warn, `#f85149` bad. One accent colour, used
   sparingly.
2. **No hero metrics** (big number + tiny label + gradient bar). Numbers earn
   their size through tabular alignment in a table, not through display type.
3. **No card-in-card.** One panel per section; internal rows separated by
   borders, not nested boxes.
4. **No Inter/Roboto/Space Grotesk.** Keep the existing system font stack.
5. **No decorative blobs/orbs/shadows-for-style.** Borders and spacing do the
   work.
6. **F-pattern scan:** most global numbers top-left; detail sections below.
   Important stuff left-aligned; rows, not centred hero blocks.
7. **Data density with breathing room:** a row per project, not a card grid.
   Whitespace between sections, not padding everywhere.
8. **Colour is not the only signal** (accessibility): status uses
   colour + short text label ("at risk", "on track") + row ordering.
9. **Progressive disclosure:** summary row → click-through to the project's
   Work tab (deep link `#/work/<view>` already exists). No second level of
   inline expansion beyond a single row detail toggle.
10. **Empty/loading states are designed**, not forgotten (loading = one line,
    "Reading portfolio…", never a skeleton grid; empty = one actionable line
    with the create-project entry point).

## Layout (top → bottom)

```
Portfolio                          [as-of timestamp, small, right]
──────────────────────────────────────────────────────────────
Attention                          ← only if non-empty; else the section is gone
  ⚠ 3 overdue items — alpha: 2, beta: 1          [Review →]
──────────────────────────────────────────────────────────────
Projects
  name          status     items done/total   next milestone (due)   last activity
  alpha         on track   7/12  ▓▓▓▓░░░░      v0.2 — due in 4d      2h ago
  beta          at risk    2/9   ▓░░░░░░░░░      beta-ship — 3d over  1d ago
  gamma          idle     0/0   —                 —                  6d ago
──────────────────────────────────────────────────────────────
Status mix      (inline bars: to-do 8 · in progress 3 · blocked 1 · done 12)
```

### Section 1 — Attention strip
- Only rendered when something needs a human. One row per reason group
  (overdue items, blocked items, overdue milestones), each with a count and
  the project names, plus one link.
- This is the "warnings first" rule. If nothing is wrong, the section does
  not exist — no green "all clear" hero block (vanity).

### Section 2 — Project table (the core)
- One row per project. Columns: name (link → Work tab deep link), status chip
  (on track / at risk / idle / stalled — derived, see below), items
  done/total with a 10-segment tick bar (not a percentage hero), next
  open milestone name + relative due date (warn colour when overdue), last
  activity (relative time).
- Status derivation (documented, deterministic):
  - **at risk** — any overdue milestone, or overdue work items, or
    blocked > 0
  - **idle** — no items in progress AND no open milestone
  - **stalled** — no activity in 14+ days while items are open
  - **on track** — everything else
- Sort: at risk first, then by next milestone due date (soonest open first);
  idle/stalled sink to the bottom. No user-configurable sort in v1 (the
  table is 10 rows max — sorting is theatre).
- 10-segment tick bar: pure CSS (repeating-linear-gradient background-size),
  no SVG, no chart library. Ticks are honest units (each = ceil(total/10)),
  not a smooth fake.

### Section 3 — Status mix
- One inline row of `status count` pairs with tiny inline bars (width
  proportional, label always visible). Reads in one eye movement; no pie
  chart (pies are the dashboard anti-pattern).

## Typography & numerals

- `font-variant-numeric: tabular-nums` on every count column.
- Three type sizes only: section title (12px, dim, upper — matches existing
  `.dy-card h2`), body (13px), timestamp (12px dim). Nothing larger —
  restraint is the anti-slop move here.
- Relative dates ("due in 4d", "3d over") over ISO dates; full date in a
  `title` attribute on hover.

## Backend contract (single endpoint, no N+1)

`GET /stewardship/v1/portfolio` →

```json
{
  "projects": [
    {"project_id":"alpha","enabled":true,"phase":"build",
     "status":"at_risk","items":{"done":7,"total":12,"blocked":1},
     "next_milestone":{"name":"v0.2","due":"2026-09-04","overdue_days":0},
     "last_activity":"2026-08-31T09:00:00Z",
     "attention":{"overdue_items":2,"blocked_items":1,"overdue_milestones":0}}
  ],
  "mix":{"todo":8,"in_progress":3,"blocked":1,"done":12},
  "attention":{"overdue_items":3,"blocked_items":1,"overdue_milestones":0}
}
```

Single SQL pass per project (no per-item loops), computed in the service
layer so the API layer stays thin.

## What this deliberately is NOT

- Not a Gantt/timeline (DY-P2 territory, blocked on scheduling fields)
- Not a kanban board (that's the Work tab)
- Not a configurable widget grid (Jira-style gadget boards are for data teams;
  this is a 5-project owner's cockpit)
- Not a charting demo — zero chart libraries, zero new dependencies
