// GENERATED-STRUCTURE: hand-edited Desktop module. Edit this file, then run
// node hermes_dockyard_plugin/desktop/build.mjs to regenerate plugin.js.
//
// C1 Overview: what the project header strip says (signed by Sahil 16/09,
// built 05/10). Pure functions, no React, so node tests can run them.
//
// Nothing here scores a project. Every state comes from facts the backend
// already works out, through routes that already exist:
//   /portfolio   this project's delivery status, with the Dashboard's own
//                rule (at_risk / stalled / idle / on_track), its counts, and
//                the fleet groups: decisions waiting and interventions.
//   /dashboard   enabled, phase and work counts (already on the page).
//   /projects/{id}/milestones   open milestones. The portfolio counts the
//                overdue ones but does not list them, so the rows come from
//                here, with the same rule (open, due date passed).
// Evidence health stays separate from delivery status (rule P6.1): it never
// changes the banner, it only adds a row when the evidence is out of date.

export const STALLED_AFTER_DAYS = 14

const PHASE_LABEL = { paused: 'Paused', frozen: 'Frozen', disabled: 'Disabled', archived: 'Archived' }

const plural = (count, word) => `${count} ${word}${count === 1 ? '' : 's'}`

function joinAnd(parts) {
  if (parts.length <= 1) return parts[0] ?? ''
  return `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`
}

// "2h ago" style recency. Unparseable or missing input gives null, never 0.
export function timeAgo(value, now = new Date()) {
  const at = Date.parse(value ?? '')
  if (Number.isNaN(at)) return null
  const minutes = Math.max(0, Math.floor((now.getTime() - at) / 60000))
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 60) return `${days}d ago`
  return `${Math.floor(days / 30)} months ago`
}

// The newest moment anything happened: the portfolio's last work change or
// the newest recorded project event, whichever is later.
export function lastActivity({ portfolioRow, events = [] }) {
  const stamps = [portfolioRow?.last_activity, ...events.map((event) => event?.ts ?? event?.created_at)]
    .map((value) => ({ value, at: Date.parse(value ?? '') }))
    .filter((entry) => !Number.isNaN(entry.at))
  if (stamps.length === 0) return null
  return stamps.reduce((newest, entry) => (entry.at > newest.at ? entry : newest)).value
}

// Delivery counts for the thin progress strip. Same buckets as the Dashboard
// (/dashboard work counts): active = in progress + in review.
export function deliveryCounts(work) {
  const counts = {
    done: Number(work?.done ?? 0),
    active: Number(work?.active ?? 0),
    blocked: Number(work?.blocked ?? 0),
    backlog: Number(work?.backlog ?? 0),
  }
  const total = counts.done + counts.active + counts.blocked + counts.backlog
  const percent = total > 0 ? Math.round((counts.done / total) * 100) : null
  return { ...counts, total, percent }
}

function overdueMilestones(milestones, now) {
  return (milestones ?? []).filter((milestone) => {
    if (!milestone || milestone.closed || milestone.archived_at) return false
    const due = Date.parse(milestone.due ?? '')
    return !Number.isNaN(due) && due < now.getTime()
  })
}

// The banner and the drawer for one project. Returns
//   { available, state, tone, label, summary, items: [...] }
// where tone is one of success | info | warning | danger | neutral and each
// item names its cause, where it came from and where Open goes.
export function projectAttention({ project, portfolio, milestones = [], now = new Date() }) {
  const id = project?.id
  const row = (portfolio?.projects ?? []).find((entry) => entry?.project_id === id) ?? null
  if (!id || !row) {
    return {
      available: false, state: 'unknown', tone: 'neutral', label: 'Status unavailable',
      summary: 'the attention check did not load. Refresh to try again.', items: [],
    }
  }
  const groups = portfolio.groups ?? {}
  const items = []
  for (const decision of groups.decisions ?? []) {
    if (decision?.project !== id) continue
    // Signed 16/09: an approval item is amber in the drawer (the banner
    // state it causes, "Needs review", is blue).
    items.push({
      key: `approval:${decision.ref}`, kind: 'approval', tone: 'warning', label: 'Approval waiting',
      title: decision.title || decision.ref, ref: decision.ref,
      note: `Initiative waiting for your decision${decision.risk ? ` (${decision.risk} risk)` : ''}.`,
      ageDays: decision.age_days, owner: null,
      next: 'Decide in the Approval inbox, where the fingerprint is shown.',
      target: { kind: 'deep_link', link: decision.deep_link || `s6:initiative/${decision.ref}` },
      openLabel: 'Open in Approval inbox',
    })
  }
  for (const entry of groups.interventions ?? []) {
    if (entry?.project !== id) continue
    const base = { ref: entry.ref, ageDays: entry.age_days, owner: entry.owner ?? null, next: entry.next_action ?? null }
    if (entry.cause === 'blocked_item') {
      items.push({ ...base, key: `blocked:${entry.ref}`, kind: 'blocked', tone: 'danger', label: 'Blocked',
        title: `${entry.ref} · ${entry.title}`, note: entry.detail || 'Blocked without a recorded reason.',
        target: { kind: 'work', ref: entry.ref }, openLabel: 'Open work item' })
    } else if (entry.cause === 'overdue_item') {
      items.push({ ...base, key: `overdue:${entry.ref}`, kind: 'overdue', tone: 'warning', label: 'Overdue',
        title: `${entry.ref} · ${entry.title}`, note: entry.detail || 'Past its due date and not done.',
        target: { kind: 'work', ref: entry.ref }, openLabel: 'Open work item' })
    } else if (entry.cause === 'evidence_stale') {
      items.push({ ...base, key: 'evidence', kind: 'evidence', tone: 'warning', label: 'Evidence out of date',
        title: entry.title || 'The last health check is old', note: entry.detail || '',
        target: { kind: 'view', view: 'overview' }, openLabel: 'Open the assessment' })
    } else if (entry.cause === 'project_attention') {
      const switchedOff = project.enabled === false || row.enabled === false
      items.push({ ...base, key: 'project', kind: 'project', tone: 'neutral',
        label: switchedOff ? 'Switched off' : (PHASE_LABEL[project.phase ?? row.phase] ?? 'Project state'),
        title: switchedOff ? 'This project is switched off' : `This project is ${project.phase ?? row.phase}`,
        note: switchedOff ? 'Nothing runs for it until someone enables it again.' : 'Its lifecycle state needs a decision.',
        target: { kind: 'view', view: 'settings' }, openLabel: 'Open project settings' })
    }
  }
  for (const milestone of overdueMilestones(milestones, now)) {
    items.push({
      key: `milestone:${milestone.id}`, kind: 'milestone', tone: 'warning', label: 'Milestone overdue',
      title: milestone.name, ref: milestone.id,
      note: `Due ${milestone.due} and still open${Number.isFinite(Number(milestone.total)) ? ` (${Number(milestone.done ?? 0)} of ${Number(milestone.total)} done)` : ''}.`,
      ageDays: Math.max(0, Math.floor((now.getTime() - Date.parse(milestone.due)) / 86400000)), owner: null,
      next: 'Review the date or close the milestone.',
      target: { kind: 'plan', entry: `plan:milestone:${milestone.id}` }, openLabel: 'Open in Vision',
    })
  }
  if (row.status === 'stalled') {
    items.push({
      key: 'stalled', kind: 'stalled', tone: 'warning', label: 'Stalled',
      title: `No work has moved for ${STALLED_AFTER_DAYS} days or more`,
      note: 'There is open work, but nothing on it has changed.', ageDays: null, owner: null,
      next: 'Check the board and re-plan.', target: { kind: 'view', view: 'board' }, openLabel: 'Open Kanban',
    })
  }

  // Order inside the drawer: most severe first, then oldest first.
  const rank = { danger: 0, warning: 1, info: 2, neutral: 3, success: 4 }
  items.sort((left, right) => (rank[left.tone] - rank[right.tone]) || ((right.ageDays ?? 0) - (left.ageDays ?? 0)))

  const enabled = project.enabled ?? row.enabled
  const phase = project.phase ?? row.phase
  let state
  if (enabled === false) state = ['disabled', 'neutral', 'Disabled']
  else if (phase && phase !== 'active') state = [phase, 'neutral', PHASE_LABEL[phase] ?? phase]
  else if (Number(row.items?.blocked ?? 0) > 0) state = ['blocked', 'danger', 'Blocked']
  else if (row.status === 'at_risk') state = ['at_risk', 'warning', 'At risk']
  else if (row.status === 'stalled') state = ['stalled', 'warning', 'Stalled']
  else if (items.some((item) => item.kind === 'approval')) state = ['review', 'info', 'Needs review']
  else if (row.status === 'idle') state = ['idle', 'neutral', 'Idle']
  else state = ['on_track', 'success', 'On track']

  const count = (kind) => items.filter((item) => item.kind === kind).length
  const countable = [
    ['blocked', 'blocked item'], ['overdue', 'overdue item'], ['milestone', 'overdue milestone'], ['approval', 'approval'],
  ].filter(([kind]) => count(kind) > 0)
  const sentences = []
  if (countable.length > 0) {
    const total = countable.reduce((sum, [kind]) => sum + count(kind), 0)
    sentences.push(`${joinAnd(countable.map(([kind, word]) => plural(count(kind), word)))} ${total === 1 ? 'needs' : 'need'} you`)
  }
  if (count('stalled') > 0) sentences.push(`no work has moved for ${STALLED_AFTER_DAYS} days or more`)
  const evidence = items.find((item) => item.kind === 'evidence')
  if (evidence) sentences.push(String(evidence.title).replace(/^Evidence/, 'evidence'))
  if (count('project') > 0 && sentences.length === 0) sentences.push(state[0] === 'disabled' ? 'nothing runs until it is enabled' : 'its lifecycle state needs a decision')
  let summary = sentences.join(' · ')
  if (!summary) {
    summary = state[0] === 'idle' ? 'nothing is in progress and no milestone is open'
      : PHASE_LABEL[state[0]] ? `the project is ${state[0]}`
        : 'nothing needs you right now'
  }
  return { available: true, state: state[0], tone: state[1], label: state[2], summary, items }
}
