// GENERATED-STRUCTURE: hand-edited Desktop module. Edit this file, then run
// node hermes_dockyard_plugin/desktop/build.mjs to regenerate plugin.js.
// C2 Kanban: ONE table component, used by the List tab and by the saved-view
// `table` layout. It keeps `data-work-table`, `data-work-row` and the
// `dockyard-backlog-table` class (pinned by phase4-rendered-browser.test.mjs).
// The saved-view layout passes the original five columns, so it looks and
// tests exactly as before; the List tab passes more columns plus `className`.
import { jsxs } from '../runtime/react.js'
import { jsx } from '../runtime/react.js'
import { Fragment } from '../runtime/react.js'

// The five columns the saved-view table has always had.
export const SAVED_VIEW_COLUMNS = Object.freeze([
  { key: 'ref', heading: 'Ref', cell: (item) => item.ref },
  { key: 'title', heading: 'Title', cell: (item) => item.title },
  { key: 'type', heading: 'Type', cell: (item) => item.type || 'task' },
  { key: 'status', heading: 'Status', cell: (item) => item.status || 'unknown' },
  { key: 'assignee', heading: 'Assignee', cell: (item) => item.assignee || 'Unassigned' },
])

// columns: [{ key, heading, cell(item) }]
// groups (optional): [{ key, label, items }] renders a labelled row per group.
// Otherwise `items` is a flat list. Archived items are never shown.
export function WorkTable({ columns, items, groups, className, emptyText }) {
  const live = (list) => (list ?? []).filter((item) => item.status !== 'archived')
  const rowsOf = (list) => live(list).map((item) => jsxs('tr', { 'data-work-row': item.ref, children:
    columns.map((column) => jsx('td', { children: column.cell(item) }, column.key)) }, item.ref))
  // Flat lists keep the saved-view table's original rule: empty means the raw list is empty.
  const total = groups ? groups.reduce((sum, group) => sum + live(group.items).length, 0) : (items ?? []).length
  if (total === 0) return jsx('p', { className: 'dockyard-meta', 'data-work-table-empty': true, children: emptyText ?? 'No work items match this saved view.' })
  return jsxs('table', { className: ['dockyard-backlog-table', className].filter(Boolean).join(' '), 'data-work-table': true, children: [
    jsx('thead', { children: jsx('tr', { children: columns.map((column) => jsx('th', { scope: 'col', children: column.heading }, column.key)) }) }),
    jsx('tbody', { children: groups
      ? groups.map((group) => jsxs(Fragment, { children: [
          jsx('tr', { className: 'dy-kb-stage-row', 'data-work-group': group.key, children: jsx('th', { scope: 'colgroup', colSpan: columns.length, children: `${group.label} (${live(group.items).length})` }) }),
          ...rowsOf(group.items),
        ]}, group.key))
      : rowsOf(items) }),
  ]})
}
