// GENERATED-STRUCTURE: hand-edited Desktop module. Edit this file, then run
// node hermes_dockyard_plugin/desktop/build.mjs to regenerate plugin.js.
//
// C7 Reports, design review only. Opening the practice link with ?review=1
// shows a bar that switches the open choice on real data:
//   reports  side | table   how the Reports tab lists and opens reports
// The choice lives in the page address only (no browser storage). This file,
// the bar and the losing layout are deleted once Sahil picks.
import { jsx } from '../runtime/react.js'
import { jsxs } from '../runtime/react.js'

// The default is Kensei's recommendation; the bar can switch it.
export const REPORTS_REVIEW_DEFAULTS = { reports: 'side' }
const LAYOUTS = [['side', 'Side by side'], ['table', 'Table + side panel']]

export function readReportsReview(search = globalThis.location?.search ?? '') {
  const params = new URLSearchParams(search)
  const reports = params.get('reports')
  return {
    active: params.get('review') === '1',
    reports: LAYOUTS.some(([value]) => value === reports) ? reports : REPORTS_REVIEW_DEFAULTS.reports,
  }
}

function writeReportsReview(key, value) {
  const url = new URL(globalThis.location.href)
  url.searchParams.set(key, value)
  globalThis.history.replaceState(globalThis.history.state, '', url)
}

export function ReportsReviewBar({ review, onChange }) {
  return jsxs('div', { className: 'dy-rep-review', 'data-reports-review': true, children: [
    jsx('strong', { children: 'Design review' }),
    jsxs('span', { role: 'group', 'aria-label': 'Reports tab layout', children: [
      jsx('span', { children: 'Reports tab:' }),
      ...LAYOUTS.map(([value, text]) => jsx('button', {
        type: 'button', 'aria-pressed': review.reports === value, 'data-review-choice': `reports:${value}`,
        onClick: () => { writeReportsReview('reports', value); onChange?.() },
        children: text,
      }, value)),
    ]}),
  ]})
}
