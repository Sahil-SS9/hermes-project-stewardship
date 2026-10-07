// GENERATED-STRUCTURE: hand-edited Desktop module. Edit this file, then run
// node hermes_dockyard_plugin/desktop/build.mjs to regenerate plugin.js.
//
// Workflows design round (07/10/2026), design review only. Opening the
// practice link with ?review=1 shows a bar that switches the Workflows
// builder between today's screen and the two options, and switches how loops
// are shown. The choice lives in the URL only (no browser storage). Without
// ?review=1 the screen is exactly today's.
import { jsxs } from '../../runtime/react.js'
import { jsx } from '../../runtime/react.js'

export const WF_DESIGNS = Object.freeze([
  { value: 'today', label: 'Today' },
  { value: 'a', label: 'A · Start dialog' },
  { value: 'b', label: 'B · Build on the canvas' },
])
export const WF_LOOPS = Object.freeze([
  { value: 'panel', label: 'In the step panel' },
  { value: 'frame', label: 'Frame around the steps' },
])
const DEFAULT_LOOPS = Object.freeze({ today: 'panel', a: 'panel', b: 'frame' })

export function readWorkflowReview(search = globalThis.location?.search ?? '') {
  const params = new URLSearchParams(search)
  const active = params.get('review') === '1'
  const asked = params.get('wf')
  const design = active ? (WF_DESIGNS.some((d) => d.value === asked) ? asked : 'a') : 'today'
  const loopsAsked = params.get('wfloops')
  const loops = WF_LOOPS.some((l) => l.value === loopsAsked) ? loopsAsked : DEFAULT_LOOPS[design]
  return { active, design, loops }
}

export function writeWorkflowReview(review) {
  const url = new URL(globalThis.location.href)
  url.searchParams.set('wf', review.design)
  url.searchParams.set('wfloops', review.loops)
  globalThis.history.replaceState(globalThis.history.state, '', url)
}

// Switching the option resets the loop presentation to that option's own;
// the loops switch then mixes it.
export function nextReview(review, change) {
  if (change.design && change.design !== review.design) return { ...review, design: change.design, loops: DEFAULT_LOOPS[change.design] }
  return { ...review, ...change }
}

function ChoiceGroup({ label, choices, value, group, onPick }) {
  return jsxs('span', { className: 'dy-wfd-review-group', role: 'group', 'aria-label': label, children: [
    jsx('span', { className: 'dy-wfd-review-label', children: label }),
    ...choices.map((choice) => jsx('button', {
      type: 'button',
      'aria-pressed': value === choice.value,
      'data-review-choice': `${group}:${choice.value}`,
      onClick: () => onPick(choice.value),
      children: choice.label,
    }, choice.value)),
  ] })
}

export function WorkflowReviewBar({ review, onChange, collapsed, onCollapse }) {
  if (collapsed) {
    return jsx('div', { className: 'dy-wfd-review collapsed', 'data-wf-review': true, children:
      jsx('button', { type: 'button', 'data-action': 'wf-review-expand', onClick: () => onCollapse(false), children: 'Design review' }) })
  }
  return jsxs('div', { className: 'dy-wfd-review', 'data-wf-review': true, role: 'region', 'aria-label': 'Design review', children: [
    jsx('strong', { children: 'Design review' }),
    jsx(ChoiceGroup, { label: 'Option', group: 'wf', choices: WF_DESIGNS, value: review.design, onPick: (design) => onChange({ design }) }),
    review.design === 'today' ? null : jsx(ChoiceGroup, { label: 'Loops', group: 'wfloops', choices: WF_LOOPS, value: review.loops, onPick: (loops) => onChange({ loops }) }),
    review.design === 'today' ? null : jsxs('span', { className: 'dy-wfd-review-key', children: [
      jsx('span', { className: 'dy-wfd-preview-tag', children: 'Preview' }),
      ' = not saved: kept until you reload',
    ] }),
    jsx('button', { type: 'button', className: 'dy-wfd-review-hide', 'data-action': 'wf-review-collapse', 'aria-label': 'Hide the design review bar', onClick: () => onCollapse(true), children: '×' }),
  ] })
}
