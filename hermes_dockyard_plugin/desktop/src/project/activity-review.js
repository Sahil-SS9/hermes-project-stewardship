// GENERATED-STRUCTURE: hand-edited Desktop module. Edit this file, then run
// node hermes_dockyard_plugin/desktop/build.mjs to regenerate plugin.js.
//
// C5 Activity, design review only. Opening the practice link with ?review=1
// shows a bar that switches the two open choices on real data:
//   layout  table | timeline   how the Activity tab lists the events
//   card    words | today      the Overview "Recent activity" card
// The choices live in the page address only (no browser storage). This file,
// the bar and the losing options are deleted once Sahil picks.
import { jsx } from '../runtime/react.js'
import { jsxs } from '../runtime/react.js'

// Defaults are Kensei's recommendation; the bar can switch either.
export const ACTIVITY_REVIEW_DEFAULTS = { layout: 'table', card: 'words' }

export function readActivityReview(search = globalThis.location?.search ?? '') {
  const params = new URLSearchParams(search)
  const pick = (key, allowed) => (allowed.includes(params.get(key)) ? params.get(key) : ACTIVITY_REVIEW_DEFAULTS[key])
  return {
    active: params.get('review') === '1',
    layout: pick('layout', ['table', 'timeline']),
    card: pick('card', ['words', 'today']),
  }
}

function writeActivityReview(key, value) {
  const url = new URL(globalThis.location.href)
  url.searchParams.set(key, value)
  globalThis.history.replaceState(globalThis.history.state, '', url)
}

export function ActivityReviewBar({ review, onChange }) {
  const group = (key, label, options) => jsxs('span', { role: 'group', 'aria-label': label, children: [
    jsx('span', { children: `${label}:` }),
    ...options.map(([value, text]) => jsx('button', {
      type: 'button', 'aria-pressed': review[key] === value, 'data-review-choice': `${key}:${value}`,
      onClick: () => { writeActivityReview(key, value); onChange?.() },
      children: text,
    }, value)),
  ]}, key)
  return jsxs('div', { className: 'dy-act-review', 'data-activity-review': true, children: [
    jsx('strong', { children: 'Design review' }),
    group('layout', 'Activity tab', [['table', 'Table'], ['timeline', 'Timeline']]),
    group('card', "Overview's Recent activity card", [['words', 'Same words + View all'], ['today', 'As today']]),
  ]})
}
