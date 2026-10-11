// GENERATED-STRUCTURE: hand-edited Desktop module. Edit this file, then run
// node hermes_dockyard_plugin/desktop/build.mjs to regenerate plugin.js.
//
// Archive and Restore in the Desktop, design review only (11/10/2026). Opening
// the practice link with ?review=1 shows a bar that switches the open choice
// on real data:
//   place  switcher | settings   where archived projects are listed and restored
// The choice lives in the page address only (no browser storage). This file,
// the bar and the losing place are deleted once Sahil picks.
import { jsx } from '../runtime/react.js'
import { jsxs } from '../runtime/react.js'

// The default is Kensei's recommendation; the bar can switch it.
export const ARCHIVE_REVIEW_DEFAULTS = { place: 'switcher' }
const PLACES = [['switcher', 'A: in the project switcher'], ['settings', 'B: in App settings']]

export function readArchiveReview(search = globalThis.location?.search ?? '') {
  const params = new URLSearchParams(search)
  const place = params.get('archived')
  return {
    active: params.get('review') === '1',
    place: PLACES.some(([value]) => value === place) ? place : ARCHIVE_REVIEW_DEFAULTS.place,
  }
}

// Where the archive and restore messages send people, for each place.
export function restoreFromWords(place) {
  return place === 'settings' ? 'App settings > Archived projects' : 'the project switcher > Archived projects'
}

function writeArchiveReview(value) {
  const url = new URL(globalThis.location.href)
  url.searchParams.set('archived', value)
  globalThis.history.replaceState(globalThis.history.state, '', url)
}

export function ArchiveReviewBar({ review, onChange }) {
  return jsxs('div', { className: 'dy-arch-review', 'data-archive-review': true, children: [
    jsx('strong', { children: 'Design review' }),
    jsxs('span', { role: 'group', 'aria-label': 'Where archived projects live', children: [
      jsx('span', { children: 'Archived projects:' }),
      ...PLACES.map(([value, text]) => jsx('button', {
        type: 'button', 'aria-pressed': review.place === value, 'data-review-choice': `archived:${value}`,
        onClick: () => { writeArchiveReview(value); onChange?.() },
        children: text,
      }, value)),
    ] }),
  ] })
}
