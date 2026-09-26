// GENERATED-STRUCTURE: hand-edited Desktop module. Edit this file, then run
// node hermes_dockyard_plugin/desktop/build.mjs to regenerate plugin.js.
import { sortApprovals } from '../data/loaders.js'
import { jsxs } from '../runtime/react.js'
import { Fragment } from '../runtime/react.js'
import { jsx } from '../runtime/react.js'
import { PageHead } from '../lib/ui.js'
import { EmptyState } from '../lib/ui.js'
import { number } from '../lib/ui.js'
import { plural } from '../lib/ui.js'
import { ApprovalRow } from '../work-item/approvals.js'
export function InboxView({ view, onRefresh }) {
  const items = sortApprovals(view.items ?? [])
  if (items.length === 0) {
    return jsxs(Fragment, { children: [
      jsx(PageHead, { title: 'Approval Inbox', description: 'Every pending human decision across every project, with enough context to decide here.', onRefresh }),
      jsx(EmptyState, { title: 'No approvals waiting', description: 'New owner decisions will appear here with their project, evidence context and risk.', icon: 'check' }),
    ]})
  }
  return jsxs(Fragment, { children: [
    jsx(PageHead, {
      title: 'Approval Inbox',
      description: 'Every pending human decision across every project, with enough context to decide here.',
      status: `${number(items.length)} ${plural(items.length, 'decision')} owed`,
      onRefresh,
    }),
    jsx('section', { className: 'dockyard-approval-list', 'aria-label': 'Pending approvals', children:
      items.map((item) => jsx(ApprovalRow, { item, onResolved: onRefresh }, item.ref)),
    }),
  ]})
}
