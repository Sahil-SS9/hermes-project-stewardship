# Hermes Dockyard UI/UX redesign notes

Research run: 24 August 2026

## Design read

Dockyard is an embedded operational oversight console for one human owner. It is not a marketing dashboard and it must not duplicate the Hermes Desktop shell.

- Redesign mode: visual overhaul. Preserve the API contract and the useful data mapping only.
- Design language: calm operational precision, scan-first hierarchy, restrained colour.
- Design variance: 4/10. Structure should be clear rather than theatrical.
- Motion: 2/10. Motion is limited to loading and direct action feedback.
- Visual density: 7/10. Dense enough for oversight, with enough spacing to separate decisions from passive status.

## Current implementation audit

### What is worth keeping

- `ctx.rest` binding and the existing `/dashboard`, `/inbox`, `/notifications`, approve and acknowledge paths.
- The field mappings for projects, work counts, approvals and notifications match the real API responses.
- React state and effect boundaries are small enough to keep the plugin self-contained.
- Dynamic list keys and `jsx(Type, {})` props guards are present in the current code.
- The plugin registration surface is sound: route, desktop navigation item and command-palette entry.
- CSS injection is mounted and removed with the page lifecycle.

### What fails and is being replaced

| Failure | Evidence | Decision |
|---|---|---|
| Most of the stylesheet never parses | The generated CSS contains `.dockyard-root @keyframes screen-in`, then prefixes `to` and later selectors as if they were descendants. Chromium exposes only 48 parsed rules and stops before `.page-head`. | Replace the generated/scoped stylesheet with authored, valid CSS. Keep selectors explicitly under `.dockyard-root`; keep the keyframe name globally unique. |
| Typography falls back to Times New Roman | Computed style on `.dockyard-root` is `Times New Roman`. The inline `fontFamily: inherit` overrides the root's system stack. | Remove the inline inheritance override and set the complete stack on `.dockyard-root`. |
| Dark project rows become white-on-white | Project rows fall back to default browser buttons because their CSS is after the parse break. Dark mode inherits white text over the default light button surface. | Rebuild project rows as non-interactive structured rows. The current route cannot open a project detail, so a button is a false affordance. |
| Layout collapses into stacked text | Metrics compute as `display: block`; project buttons compute as browser-default `inline-block`. The 1200px screenshot shows labels and values concatenated without hierarchy. | Replace the page composition, not just the broken selectors. |
| The runtime markup and imported v4 stylesheet do not match | The plugin carries roughly 35KB of CSS for screens that do not exist in the live three-tab runtime. | Ship a small component-specific design system for the live surface only. |
| Navigation looks like three unrelated buttons | No tab semantics, selected state is colour-only, no per-tab counts. | Use a compact tab list with `aria-selected`, a visible active rail and semantic count badges. |
| Tab changes can flash the wrong empty state | `data` is not cleared when the requested endpoint changes. The prior tab's payload is rendered through the next tab's renderer until the request completes. | Clear stale data on every tab request and keep only summary counts across tabs. |
| Loading is a text card | It does not resemble the incoming layout and gives no useful spatial expectation. | Use skeletons shaped like the summary and rows, disabled under reduced motion. |
| The empty dashboard tells the owner to use the CLI | `hermes dockyard onboard` conflicts with the product rule that the engine is invisible. | Use a truthful no-project state with no fake action. Onboarding is not part of the current API surface. |
| Notification count is labelled as decisions owed | `Owed` is reused for unread notifications. | Give approvals and notifications separate language and counts. |
| Acknowledge failures are swallowed | The catch block silently re-enables the button. | Show an inline error and keep the row actionable. |
| The repo mirror is missing | `hermes_dockyard_plugin/desktop/plugin.js` does not exist at `9d2c2af`; only the live door copy exists. | Create the repo copy and prove byte identity before completion. |
| The harness is too narrow | It checks one populated dashboard render only. It does not exercise tabs, writes, empties, errors, themes, widths or CSS parsing. | Replace it with a state and interaction harness that also records screenshots and computed layout checks. |

### Baseline visual evidence

- Light screenshot: `/tmp/current-light.png`
- Dark screenshot: `/tmp/current-dark.png`
- 700px screenshot: `/tmp/current-700.png`
- Computed root font: `Times New Roman`
- Parsed stylesheet rules: `48`; `.page-head`, metrics, project rows and every later rule are missing from the CSSOM.
- 1200px body width: 1184px, with no horizontal overflow. The problem is hierarchy and missing CSS, not viewport overflow.

## Exact local benchmark review

The owner supplied `/home/sahil/Desktop/carad/Hermes-Dockyard-v4.html` as the minimum quality benchmark. SHA-256: `e9ae7288a73c2d2597fbc14419b9ad660010db9d55d6bcb9f2b4e58b55906e44`.

The first rebuild remained too flat against this file. It had a count-only attention panel, one compressed status surface, one wide project table and a lightweight approval list. The reference was stronger because it used:

- one tinted, elevated decision card with the actual pending decisions inside it;
- a separate four-part metric strip;
- a projects card paired with a clearly separated activity card;
- individual approval cards with a three-cell evidence/context strip;
- selective semantic colour on risk, health and action states;
- stronger boundaries between overview, action and history components.

The final rebuild ports those compositional principles without copying unsupported or fabricated data. It also improves the reference by ordering projects, approvals and unread notifications by attention severity and by preserving complete keyboard tab behaviour, loading/error/empty states and numeric WCAG verification.

### Backend capability verification

The richer patterns were checked against the real stewardship API and demo database before implementation.

- Supported reads: project settings, work items, initiatives, events, bots and workload.
- Supported writes: approve, reject and notification acknowledge.
- The desktop plugin proxy was extended to expose those existing backend routes.
- The previous approve proxy was genuinely broken: it sent `actor_id`, while the upstream contract requires `actor` plus `interface`. The proxy now sends `{"actor":"sahil","interface":"dockyard:human"}` and focused integration tests prove both approve and reject.
- Approval evidence cards use actual initiative `rationale`, `expected_outcome` and `validation_contract` fields. Missing fields are labelled as missing rather than invented.

## Reference research

The references below informed patterns, not a visual copy.

| Reference | Concrete pattern studied | Borrow for Dockyard | Rejected alternative |
|---|---|---|---|
| Linear project overview | One content plane, a compact primary tab strip, editable properties presented inline, thin surface boundaries and progressive disclosure into details. Source: <https://linear.app/docs/project-overview> | Keep one quiet content plane. Put summary facts inline instead of wrapping every number in a card. Use tabs as peers. | Do not copy Linear's dark marketing glow, oversized display type or broad product navigation. Dockyard has three live destinations and sits inside another shell. |
| Vercel Projects and Deployments | Team overview to project list to project detail; status, commit and deployment metadata remain attached to the object they describe. Source: <https://vercel.com/docs/projects> and <https://vercel.com/docs/deployments> | Keep status and work counts on the project row. Use a strict project-to-detail hierarchy when a real project route exists. | Do not use several workflow accent colours or Vercel's layered shadow system. Colour in Dockyard is semantic, not decorative. |
| Grafana alert list and dashboard guidance | Sort by importance, show current state, link users from a signal to the relevant detail, and reserve alerts for items with an action. Sources: <https://grafana.com/docs/grafana/latest/visualizations/panels-visualizations/visualizations/alert-list/> and <https://grafana.com/docs/grafana/latest/dashboards/build-dashboards/best-practices> | Put decisions before passive metrics. Use highest-attention state for a consolidated summary. Treat no-action as a positive state. | Do not build a wall of charts. The current API has counts and states, not time-series evidence. |
| GitHub Actions and Primer | Workflow list to run summary to job/log detail; Primer ActionList supports an icon, description and side metadata in one row. Sources: <https://docs.github.com/en/actions/how-tos/monitor-workflows/view-workflow-run-history> and <https://primer.style/product/components> | Use structured rows with primary label, supporting copy and a right-aligned action or state. Keep focus and active state visible without relying on colour alone. | Do not add a second left sidebar. Hermes Desktop already owns product navigation. |
| Sentry Issues | Triage list first, then issue detail; event context and summary facts are promoted before deeper debugging material. Sources: <https://docs.sentry.io/product/issues/> and <https://docs.sentry.io/product/issues/issue-details/> | Approval rows surface project, reference, risk and action before any deeper detail. Notification rows keep state change and project attribution together. | Do not copy the purple/lime brand palette or debugging-heavy side panels. The current API cannot support that evidence depth. |
| IBM Carbon | Compact 14px rows, matched skeletons, 8px spacing discipline, status indicators combining label with shape/colour, and highest-attention consolidation. Sources: <https://carbondesignsystem.com/components/data-table/style>, <https://preview.carbondesignsystem.com/building-blocks/core/patterns/status-indicators> and <https://v10.carbondesignsystem.com/patterns/loading-pattern> | Use a compact row rhythm, tabular figures, matched skeletons and text labels on every status. Limit the number of coloured indicators. | Do not port Carbon's square IBM identity or install Carbon. Dockyard remains dependency-free. |
| Atlassian Design System | Semantic lozenges, direct empty-state language, and table loading/empty behaviour. Sources: <https://atlassian.design/components/lozenge>, <https://atlassian.design/components/empty-state/> and <https://atlassian.design/components/dynamic-table> | Use restrained semantic tags for risk and health. Empty states state what is true and what happens next. | Do not reproduce Jira chrome, pill every metadata value or expose controls that the backend does not support. |
| PatternFly 6 | Compact table density, row-local actions, toolbar only for global actions, and empty states without dead filters/toolbars. Sources: <https://staging-v6.patternfly.org/components/table/design-guidelines> and <https://patternfly.org/components/empty-state/design-guidelines> | Keep the project roster and notification feed row-based. Put Approve on its own row; put Refresh in the page header. | Do not use a card gallery. Projects are compared by state and work counts, not browsed by imagery. |
| Material 3 and MUI dashboard template | Primary tabs for peer destinations, accessible table structure, visible focus, dashboard cards and data grid composition. Sources: <https://m3.material.io/components/tabs/overview>, <https://mui.com/material-ui/getting-started/templates/dashboard/> and <https://mui.com/material-ui/react-table/> | Borrow tab semantics, focus discipline and the table's label/value alignment. | MUI cannot be imported by the desktop loader. Its permanent sidebar, chart grid and equal metric cards are too generic and duplicate the host shell. No MUI package will be added. |
| 21st.dev | Catalogued dashboard, table, notification, tab, sidebar and empty-state components. Sources: <https://21st.dev/community/components/s/21st-dev> and <https://21st.dev/community/components/lovesickfromthe6ix/project-management-dashboard> | Use it as a pattern index only, mainly to compare table, notification and empty-state compositions. | Do not copy a community dashboard wholesale. Most entries assume Tailwind, shadcn, Lucide and sometimes Motion. Those imports are unsupported, and the visual quality is inconsistent. |
| Fluent 2 | Alias tokens, light/dark parity, grid-led hierarchy and a deliberate radius vocabulary. Sources: <https://fluent2.microsoft.design/color>, <https://fluent2.microsoft.design/layout> and <https://fluent2.microsoft.design/shapes> | Use semantic aliases and a documented shape rule. | Do not add Fluent or mimic Microsoft product chrome. |

## Design decisions

### 1. Information architecture

Use one embedded console header with three peer tabs: Fleet, Approvals and Notifications. Hermes Desktop remains the only global application shell.

- Informed by Linear primary tabs, Material 3 primary tabs and the GitHub list-to-detail hierarchy.
- Fits the current API exactly: one read endpoint per tab.
- Rejected: a second sidebar, app bar, command menu or fake project detail navigation.

### 2. Fleet page

Use an action-first dashboard composed as four distinct bands.

- Decision card: count and CTA on the left; actual risk-ordered decisions on the right.
- Metric strip: project health, active work, bot workload and owner attention.
- Main grid: severity-ordered project roster with actual missions/owners, plus recent fleet signals from notifications.
- At 700px the cards stack while the decision rows, 2x2 metrics and project rows retain their hierarchy.
- Informed by Grafana's actionable-alert discipline, Vercel's project metadata and PatternFly's compact table.
- Rejected: charts without temporal data, a generic card gallery and clickable rows that navigate nowhere.

### 3. Approval queue

Use one separated decision card per approval. Surface risk, project, initiative reference and actual backend context before the actions.

- Informed by Linear triage, Sentry issue triage and Atlassian semantic lozenges.
- Three context cells show why the initiative was proposed, its expected outcome and its validation contract.
- Approve and Reject are both real backend operations. Approved/rejected state is shown before an authoritative refresh removes the item.
- Evidence details progressively disclose status, priority, approval state and context reference.
- Rejected: fake evidence and decorative fields unsupported by the backend.

### 4. Notifications

Split the feed into `Needs attention` and `Cleared`. Keep project attribution, severity, title and body together. Acknowledging an item immediately moves it to Cleared and retains readable contrast.

- Informed by Grafana Alert List and Sentry workflow notifications.
- Rejected: calling unread notifications decisions, hiding acknowledged history, silently swallowing write errors and using opacity so low that text becomes unreadable.

### 5. Component and library strategy

The runtime remains plain React with `jsx()` calls and one authored CSS string.

- No MUI, Carbon, Fluent, PatternFly, Atlassian, shadcn or 21st.dev code is imported.
- The loader permits only `@hermes/plugin-sdk`, `react/jsx-runtime` and `react`.
- Design-system research is translated into semantic tokens and small local components, not copied package APIs.

### 6. Visual system

- Font: native UI stack; tabular figures for counts and references.
- Spacing: 4px base with 8, 12, 16, 20, 24 and 32px working steps.
- Radius: 6px controls, 10px rows and small surfaces, 14px major surfaces. Pills are reserved for semantic status tags and numeric tab counts.
- Elevation: one subtle border, no default shadow. A shadow is reserved for focus or a genuinely raised transient state.
- Colour: neutral cool slate with one cobalt action accent. Green, amber and red are semantic only.
- Motion: 120-160ms hover/press feedback and skeleton shimmer. `prefers-reduced-motion` removes both.

### 7. Responsive behaviour

- 1100px and above: action summary and fleet status share a row.
- Below 980px: summary surfaces stack.
- Below 820px: project and feed rows switch from table columns to named grid areas.
- At 700px: tabs remain usable, every row is full width, no horizontal scroll is required, and actions remain at least 40px high.
- Content max-width is 1360px so 1600px panels retain readable measure.

## Contrast plan

All ratios use WCAG 2.1 relative luminance. Normal text must be at least 4.5:1; focus and non-text indicators must be at least 3:1.

| Theme | Foreground | Background | Use | Ratio |
|---|---:|---:|---|---:|
| Light | `#15171c` | `#f6f7f9` | Primary text on page | 16.73:1 |
| Light | `#15171c` | `#ffffff` | Primary text on surface | 17.93:1 |
| Light | `#515968` | `#ffffff` | Secondary text | 7.05:1 |
| Light | `#626c7b` | `#ffffff` | Tertiary metadata | 5.32:1 |
| Light | `#ffffff` | `#3654c7` | Primary action | 6.46:1 |
| Light | `#293f9e` | `#eef1ff` | Accent tag/selection | 8.12:1 |
| Light | `#136c4a` | `#e7f6ef` | Success | 5.75:1 |
| Light | `#805200` | `#fff3d4` | Warning | 6.09:1 |
| Light | `#a72a2a` | `#ffeded` | Danger | 6.18:1 |
| Light | `#315ca8` | `#eaf2ff` | Information | 5.78:1 |
| Light | `#596273` | `#edf0f4` | Unknown/neutral | 5.37:1 |
| Light | `#3654c7` | `#f6f7f9` | Focus indicator against page | 6.03:1 |
| Dark | `#f3f5f7` | `#0f1217` | Primary text on page | 17.17:1 |
| Dark | `#f3f5f7` | `#171b22` | Primary text on surface | 15.80:1 |
| Dark | `#b6beca` | `#171b22` | Secondary text | 9.21:1 |
| Dark | `#949eac` | `#171b22` | Tertiary metadata | 6.37:1 |
| Dark | `#ffffff` | `#3654c7` | Primary action | 6.46:1 |
| Dark | `#c2cbff` | `#232c4f` | Accent tag/selection | 8.60:1 |
| Dark | `#72cda2` | `#16372a` | Success | 6.80:1 |
| Dark | `#f0bd64` | `#3a2c14` | Warning | 7.85:1 |
| Dark | `#ff9188` | `#40201f` | Danger | 6.69:1 |
| Dark | `#9ab9ff` | `#1c2d4a` | Information | 7.06:1 |
| Dark | `#bac2ce` | `#2a303a` | Unknown/neutral | 7.39:1 |
| Dark | `#8fa2ff` | `#0f1217` | Focus indicator against page | 7.84:1 |

The harness recomputes 54 declared foreground/background pairs and fails if any ratio is below the relevant threshold. Lowest normal-text result: 4.74:1. Lowest non-text control-boundary result: 3.01:1.

## Verification log

Final verification run: 25 August 2026.

| Gate | Result | Evidence |
|---|---|---|
| CSS parse and interaction harness | PASS | `node --test hermes_dockyard_plugin/desktop/repro-live.test.mjs`; `PASS_SUMMARY=16/16` |
| Loading, error, empty and populated states | PASS | Dashboard, Project, Backlog, Bot teams, Initiative, Workflows, Approvals, Notifications and onboarding states exercised in the render harness |
| Approve and reject flows | PASS | Frontend interaction tests; backend contract tests; live authenticated rejection of `INI-DEMO-1` returned 200 and read back `status=rejected`, `approval_state=rejected` |
| Settings save | PASS | Live authenticated PATCH for `payments-relaunch` returned 200; mission, team, autonomy level and all four policy groups matched on readback |
| Reports | PASS | Live executive, delivery, risk and full reports generated, fetched by ID and found in durable history. Section and activity inclusion rules matched each report type |
| Bot session evidence | PASS | Live Octacon, Quan and Wesker session discovery returned 200. Twenty-message transcript samples excluded system, reasoning, thinking, internal, hidden and internal-notification rows |
| Workflow save | PASS | Live `Release control` board view saved and read back with its status filter and private ownership boundary intact |
| 700px to 1600px responsiveness | PASS | Zero document overflow, clipped rows, clipped controls, misaligned project icons or primary-tab overflow across supported widths. The 480px onboarding dialog also remained usable |
| Live host-shell render | PASS | Restarted Hermes Desktop mounted the unified plugin and displayed all primary tabs plus the icon-only project action without the earlier right-edge clipping. Screenshot: `/home/kensei/.hermes/cache/images/computer_use_abc06e3094d74638b44dd818d3ba46fc.png` |
| Light and dark screenshots | PASS | Dashboard, settings, reports, transcripts, backlog, initiative, workflows, approvals, notifications and onboarding renders were produced under `/tmp/dockyard-*.png` |
| Contrast calculation | PASS | 54 declared pairs; 4.74:1 minimum normal text and 3.01:1 minimum control boundary |
| Python regression suite | PASS | 317 tests collected; `.venv/bin/pytest -q` exited 0 after the final privacy-filter change |
| Static security scan | PASS | 727 added lines scanned; no hardcoded-secret, shell-injection, eval/exec, pickle, SQL-formatting, XSS, direct-network, browser-storage or debug-output matches |
| Architecture and performance | PASS | Desktop code stays on `ctx.rest` and the OS capability surface; profile paths are contained and opened read-only; transcript queries are bounded, parameterised and backed by existing session/message indexes; blocking SQLite routes run in the FastAPI thread pool |
| Code simplification | PASS | Inline reuse, clarity, efficiency and altitude review found no actionable dead helper or duplicate abstraction. `add_to_backlog` is a decorator-referenced route, not dead code |
| Live/repo byte identity | PASS | Canonical and active unified desktop plugin SHA-256: `aa6bffecc30c9604f7038b422d42dd4e56bbee6e022557cc32e7d02858ea443b` |
| Runtime logs | CONDITIONAL | Dashboard emitted readiness only and remained running. Electron emitted no Dockyard-specific exception, but repeated host-level `hermes:readFileText` ENOENT plus D-Bus/accessibility warnings remain unclassified outside this plugin |
| Direct live GUI mutation controls | CONDITIONAL | Background Computer Use click approval timed out. Live backend writes and readbacks passed, and the render harness covers the same controls plus clipboard behaviour, but clipboard copy and a separate sidebar-toggle sequence were not re-exercised inside the restarted Desktop window |

## Quality-gate verdict

Verdict: CONDITIONAL

- Code review: PASS.
- Simplification: PASS, performed inline because this redesign was explicitly no-delegation work.
- Architecture: PASS.
- Security: PASS. `hermaguard-prescan`, Semgrep, Bandit, Ruff and ESLint were not installed; the documented added-line scan and manual review were used instead.
- Performance: PASS.
- Release condition: Sahil must approve one final Computer Use interaction sequence if direct in-window clipboard and sidebar-toggle evidence is required. The remaining Electron ENOENT noise belongs to the host file-preview path and is not causally linked to Dockyard.

## Deployment state

- Code commits: `6b66b14` and `2414572`.
- Active door: unified plugin symlink at `/home/kensei/.hermes/plugins/hermes-dockyard`.
- The stale duplicate standalone door was moved, not deleted, to `/home/kensei/.hermes/backups/desktop-plugin-doors/hermes-dockyard-standalone-20260825-094528`.
- Dashboard and Hermes Desktop were restarted and remain running.
- The branch is ahead of `origin/master`; nothing has been pushed.
