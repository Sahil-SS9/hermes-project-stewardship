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

Use an action-first two-column summary followed by a full-width project roster.

- Left: decisions waiting, or a clear no-decisions state.
- Right: one compact fleet-status surface with projects, active work, blocked work and unread alerts.
- Below: project rows with name/phase, labelled health, backlog-active-done breakdown and notification count.
- Informed by Grafana's actionable-alert discipline, Vercel's project metadata and PatternFly's compact table.
- Rejected: four independent metric cards, charts without temporal data, a card gallery and clickable rows that navigate nowhere.

### 3. Approval queue

Use one structured row per approval. Surface risk, project, initiative reference, title and the only available action. The row moves through idle, approving, approved and failed states.

- Informed by Linear triage, Sentry issue triage and Atlassian semantic lozenges.
- The approved state is shown before an authoritative refresh removes the item.
- Rejected: fake evidence, a reject action that has no endpoint, modals and card-within-card composition.

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
| Light | `#687181` | `#ffffff` | Tertiary metadata | 4.92:1 |
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

The final harness will recompute these pairs and fail if any ratio is below the relevant threshold.

## Verification log

To be filled from executed evidence after implementation.

| Gate | Result | Evidence |
|---|---|---|
| CSS parse and render harness | Pending | |
| Loading, error, empty, populated | Pending | |
| Approve flow | Pending | |
| Acknowledge flow | Pending | |
| 700px and 1600px responsiveness | Pending | |
| Light and dark screenshots | Pending | |
| Contrast calculation | Pending | |
| Python regression suite | Pending | |
| Live desktop smoke | Pending | |
| Live/repo byte identity | Pending | |
