// Roadmap state vocabulary, split out of roadmap.js to keep each hand-edited
// module under the ~800-line rule (Batch L waivers pushed it over).
import { jsx } from '../runtime/react.js'

// Derived states, exactly as the backend computes them. Unknown is unknown:
// never rendered as met, and never as zero.
export const STATE_LABEL = {
  not_started: 'Not started', in_progress: 'In progress', met: 'Met',
  at_risk: 'At risk', unknown: 'Unknown', reached: 'Reached', not_reached: 'Not reached',
  waived: 'No longer required',
}

export const words = (value) => String(value ?? '').replace(/_/g, ' ')
export const chip = (text, tone = '') => jsx('span', { className: `dy-rm-chip${tone ? ` ${tone}` : ''}`, children: text })

// v43: a waived item shows its reason, so the decision is never anonymous.
export const waivedChip = (row) => (row.waived
  ? chip(`No longer required — ${row.waived.reason}`, 'waived')
  : null)

export const milestoneStateWords = (row) => (
  `${STATE_LABEL[row.state] ?? words(row.state)}${row.overdue ? ' · overdue' : ''}${row.closed ? ' · closed' : ''}`)
export const objectiveStateWords = (row) => {
  const check = row.check?.state
  const checkText = check && check !== 'no_check' ? ` · check ${STATE_LABEL[check] ?? words(check)}` : ''
  return `${STATE_LABEL[row.state] ?? words(row.state)}${checkText}`
}
export const goalStateWords = (row) => {
  const check = row.check?.state
  const checkText = check && check !== 'no_check' ? ` · check ${STATE_LABEL[check] ?? words(check)}` : ''
  const tasks = row.task_count ? ` · ${row.task_count} ${row.task_count === 1 ? 'task' : 'tasks'}` : ' · no tasks'
  return `${STATE_LABEL[row.state] ?? words(row.state)}${tasks}${checkText}`
}
