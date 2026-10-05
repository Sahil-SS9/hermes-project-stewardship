// GENERATED-STRUCTURE: hand-edited Desktop module. Edit this file, then run
// node hermes_dockyard_plugin/desktop/build.mjs to regenerate plugin.js.
//
// C1 Overview, design review only. Opening the practice link with ?review=1
// shows a bar that switches the two open choices on real data:
//   strip  full | slim   the header on the working tabs (Overview is always full)
//   cards  keep | trim   the two Overview cards the strip now repeats
// The choices live in the page address only (no browser storage). This file,
// the bar and the losing options are deleted once Sahil picks.
import { jsx } from '../runtime/react.js'
import { jsxs } from '../runtime/react.js'

// Defaults are Kensei's recommendation; the bar can switch either.
export const STRIP_REVIEW_DEFAULTS = { strip: 'slim', cards: 'trim' }

export function readStripReview(search = globalThis.location?.search ?? '') {
  const params = new URLSearchParams(search)
  const pick = (key, allowed) => (allowed.includes(params.get(key)) ? params.get(key) : STRIP_REVIEW_DEFAULTS[key])
  return {
    active: params.get('review') === '1',
    strip: pick('strip', ['full', 'slim']),
    cards: pick('cards', ['keep', 'trim']),
  }
}

function writeStripReview(key, value) {
  const url = new URL(globalThis.location.href)
  url.searchParams.set(key, value)
  globalThis.history.replaceState(globalThis.history.state, '', url)
}

export function StripReviewBar({ review, onChange }) {
  const group = (key, label, options) => jsxs('span', { role: 'group', 'aria-label': label, children: [
    jsx('span', { children: `${label}:` }),
    ...options.map(([value, text]) => jsx('button', {
      type: 'button', 'aria-pressed': review[key] === value, 'data-review-choice': `${key}:${value}`,
      onClick: () => { writeStripReview(key, value); onChange?.() },
      children: text,
    }, value)),
  ]}, key)
  return jsxs('div', { className: 'dy-ov-review', 'data-strip-review': true, children: [
    jsx('strong', { children: 'Design review' }),
    group('strip', 'Header on the other tabs', [['full', 'Full strip (as signed)'], ['slim', 'Slim strip']]),
    group('cards', 'Overview cards', [['keep', 'Keep all'], ['trim', 'Drop the two repeats']]),
  ]})
}
