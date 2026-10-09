// GENERATED-STRUCTURE: hand-edited Desktop module. Edit this file, then run
// node hermes_dockyard_plugin/desktop/build.mjs to regenerate plugin.js.
//
// C5 Activity (06/10): one vocabulary for a project's recorded events, so the
// Activity screen and the Overview's "Recent activity" card never name an
// event differently. Pure functions, no React, so node tests can run them
// (activity-vocab.test.mjs).
//
// The events are the backend's domain events, GET /projects/{id}/events:
//   { id, ts, event_type, project_id, subject, payload, emitted_by }
// newest first. Nothing here scores anything: each effect is the fixed
// meaning of its event type (an approval means work can start), never a
// measured result. An event type this file does not know still reads as
// words, with no effect, and never as JSON.

const CHECK = 'stewardship.cycle.started'
const HEALTH_ORDER = ['critical', 'degraded', 'watch', 'healthy']
// The same words as healthDetails in lib/ui.js (pinned by the unit test).
export const HEALTH_WORD = Object.freeze({ healthy: 'Healthy', watch: 'Watch', degraded: 'Degraded', critical: 'Critical', unknown: 'Not verified' })
const TRIGGER_WORD = Object.freeze({
  manual: 'Run on request', gateway: 'Run from a chat command', webhook: 'Run by a webhook',
  internal: 'Run by Project Stewardship', schedule: 'Run on schedule', scheduled: 'Run on schedule',
})
export const EVENT_FILTERS = Object.freeze([['all', 'All events'], ['initiatives', 'Initiatives'], ['work', 'Work'], ['health', 'Health and checks']])

// Initiative events. `note` names the payload field shown under the title.
const INITIATIVE = Object.freeze({
  'initiative.proposed': { label: 'Initiative proposed', icon: 'sparkles', effect: ['New proposal', 'info'], note: 'risk' },
  'initiative.approval_required': { label: 'Approval requested', icon: 'hand', effect: ['Waiting for a decision', 'warning'], note: 'risk' },
  'initiative.approved': { label: 'Initiative approved', icon: 'circle-check', effect: ['Work can start', 'success'] },
  'initiative.rejected': { label: 'Initiative rejected', icon: 'x', effect: ['Will not go ahead', 'neutral'], note: 'reason' },
  'initiative.changes_requested': { label: 'Changes requested', icon: 'undo-2', effect: ['Back with the proposer', 'warning'], note: 'feedback' },
  'initiative.withdrawn': { label: 'Initiative withdrawn', icon: 'archive', effect: ['Closed by the proposer', 'neutral'], note: 'reason' },
  'initiative.started': { label: 'Initiative started', icon: 'flag', effect: ['In progress', 'info'] },
  'initiative.completed': { label: 'Initiative completed', icon: 'circle-check', effect: ['Complete', 'success'] },
  'initiative.regressed': { label: 'Initiative regressed', icon: 'triangle-alert', effect: ['Outcome went backwards', 'danger'] },
})
export const KNOWN_EVENT_TYPES = Object.freeze([
  ...Object.keys(INITIATIVE),
  'project.health.changed', 'project.critical', 'stewardship.verification.failed', 'stewardship.reasoning.failed',
  CHECK, 'cycle.mutations_blocked', 'work.assigned', 'work.unassigned',
])

const text = (value) => (typeof value === 'string' ? value.trim() : '')
const sentence = (value) => {
  const words = String(value ?? '').replace(/[._]+/g, ' ').replace(/\s+/g, ' ').trim()
  return words ? words[0].toUpperCase() + words.slice(1) : ''
}
const plural = (count, word) => `${count} ${word}${count === 1 ? '' : 's'}`
const effect = (label, tone) => ({ label, tone })
const healthWord = (state) => HEALTH_WORD[state] ?? sentence(state)
const contradictions = (payload) => (Array.isArray(payload.contradictions) ? payload.contradictions : [])
const firstDetail = (list) => text(list.find((entry) => text(entry?.detail))?.detail)

function describeInitiative(type, spec, ref, payload, ctx) {
  const initiative = ref ? (ctx.initiatives ?? []).find((entry) => entry?.ref === ref) : null
  const name = text(payload.title) || text(initiative?.title)
  let note = ''
  if (spec.note === 'risk') note = text(payload.risk) ? `${sentence(payload.risk)} risk` : ''
  else if (spec.note) note = text(payload[spec.note])
  const pending = initiative?.status === 'pending_approval'
  return {
    kind: 'initiatives', icon: spec.icon, ref: ref || null,
    label: type === 'initiative.approval_required' && payload.resubmitted === true ? 'Resubmitted for approval' : spec.label,
    title: ref ? (name ? `${ref} · ${name}` : ref) : name,
    note,
    effect: effect(...spec.effect),
    // Still waiting: decide it where the fingerprint is shown. Otherwise open
    // it in Vision. No button for an initiative the project no longer lists.
    target: initiative ? (pending ? { kind: 'deep_link', link: `s6:initiative/${ref}` } : { kind: 'plan', entry: `plan:initiative:${ref}` }) : null,
    openLabel: initiative ? (pending ? 'Open in Approval inbox' : 'Open in Vision') : null,
  }
}

function describeHealth(payload) {
  const from = text(payload.from)
  const to = text(payload.to)
  const score = payload.score === null || payload.score === undefined || payload.score === '' ? NaN : Number(payload.score)
  let change = effect('Health changed', 'neutral')
  if (to && !from) change = effect('First reading', 'neutral')
  else if (to) {
    const before = HEALTH_ORDER.indexOf(from)
    const after = HEALTH_ORDER.indexOf(to)
    // No direction is claimed when either side is "Not verified".
    if (before >= 0 && after >= 0 && after < before) change = effect('Health worse', to === 'critical' ? 'danger' : 'warning')
    else if (before >= 0 && after >= 0 && after > before) change = effect('Health better', 'success')
  }
  return {
    kind: 'health', icon: 'activity', label: 'Health changed',
    title: !to ? '' : from ? `${healthWord(from)} → ${healthWord(to)}` : healthWord(to),
    // An unverified project carries score 0 in the payload; that is not a
    // measurement, so no score is shown for it (unavailable is not zero).
    note: Number.isFinite(score) && to && to !== 'unknown' ? `Score ${score}` : '',
    effect: change,
  }
}

function describeWork(type, ref, payload, ctx) {
  const item = ref ? (ctx.workItems ?? []).find((entry) => entry?.ref === ref) : null
  const name = text(payload.title) || text(item?.title)
  const assigned = type === 'work.assigned'
  return {
    kind: 'work', icon: 'user', ref: ref || null,
    label: assigned ? 'Work assigned' : 'Work unassigned',
    title: ref ? (name ? `${ref} · ${name}` : ref) : name,
    note: assigned && text(payload.to) ? `Assigned to ${text(payload.to)}` : '',
    // Unassigned: the app's own words ("no bot will pick it up", Sahil 04/10).
    // Assigned: the owner may be a person, so only say it has one.
    effect: assigned ? effect('Has an owner', 'success') : effect('No bot will pick it up', 'warning'),
    target: item ? { kind: 'work', ref } : null,
    openLabel: item ? 'Open work item' : null,
  }
}

function describeType(type, subject, payload, ctx) {
  if (INITIATIVE[type]) return describeInitiative(type, INITIATIVE[type], subject, payload, ctx)
  if (type === 'project.health.changed') return describeHealth(payload)
  if (type === 'work.assigned' || type === 'work.unassigned') return describeWork(type, subject, payload, ctx)
  if (type === 'project.critical') {
    const list = contradictions(payload)
    return {
      kind: 'health', icon: 'triangle-alert', label: 'Project critical', title: 'Health is critical',
      note: [list.length > 0 ? plural(list.length, 'contradiction') : '', payload.auto_freeze === true ? 'Changes are frozen automatically' : ''].filter(Boolean).join(' · '),
      effect: effect('Critical', 'danger'),
    }
  }
  if (type === 'stewardship.verification.failed') {
    const list = contradictions(payload)
    return {
      kind: 'health', icon: 'shield-alert', label: 'Verification failed',
      title: list.length > 0 ? `${plural(list.length, 'contradiction')} found` : 'The evidence did not check out',
      note: firstDetail(list), effect: effect('Evidence disagrees', 'warning'),
    }
  }
  if (type === 'stewardship.reasoning.failed') {
    return {
      kind: 'health', icon: 'triangle-alert', label: 'Proposal step failed', title: 'The proposal step stopped with an error',
      note: text(payload.error).slice(0, 160), effect: effect('No proposals made', 'warning'),
    }
  }
  if (type === CHECK) {
    const trigger = text(payload.trigger_type)
    return {
      kind: 'health', icon: 'rotate-cw', label: 'Stewardship check',
      title: TRIGGER_WORD[trigger] ?? (trigger ? `Run: ${sentence(trigger).toLowerCase()}` : 'Run'),
      note: '', effect: null,
    }
  }
  if (type === 'cycle.mutations_blocked') {
    return { kind: 'health', icon: 'shield-alert', label: 'Changes blocked', title: text(payload.reason), note: '', effect: effect('Nothing was changed', 'neutral') }
  }
  return { kind: 'other', icon: 'history', label: sentence(type) || 'Project event', title: subject, note: '', effect: null }
}

// One event as the words on its row:
//   { key, id, type, kind, icon, label, title, note, by, effect, tone,
//     ts, at, ref, target, openLabel, count }
// `target` is what Open does (the same shapes as the C1 attention drawer:
// deep_link, plan, work), or null when there is nothing specific to open.
export function describeEvent(event, ctx = {}) {
  const type = String(event?.event_type ?? event?.type ?? '')
  const raw = event?.payload
  const payload = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {}
  const subject = event?.subject === null || event?.subject === undefined ? '' : String(event.subject)
  const actor = text(payload.actor) || (text(event?.emitted_by) && event.emitted_by !== 'system' ? text(event.emitted_by) : '')
  const at = Date.parse(event?.ts ?? '')
  const row = {
    ref: null, target: null, openLabel: null, note: '',
    ...describeType(type, subject, payload, ctx),
    key: `event:${event?.id ?? `${type}:${event?.ts ?? ''}`}`,
    id: event?.id ?? null, type, ts: event?.ts ?? null, at: Number.isNaN(at) ? null : at,
    by: actor || 'System', count: 1,
  }
  row.tone = row.effect?.tone ?? 'neutral'
  return row
}

const formatter = (options, timeZone) => new Intl.DateTimeFormat(options.locale ?? 'en-GB', { ...options, locale: undefined, timeZone })
const clock = (at, timeZone) => formatter({ hour: '2-digit', minute: '2-digit' }, timeZone).format(at)
const dayKey = (at, timeZone) => formatter({ locale: 'en-CA', year: 'numeric', month: '2-digit', day: '2-digit' }, timeZone).format(at)

// The rows for a list of events (newest first, as the backend sends them).
// Back-to-back stewardship checks on the same day fold into one row, so a
// busy schedule cannot push everything else off the screen. Any other event
// between two checks keeps them apart.
export function activityRows(events, ctx = {}, { timeZone } = {}) {
  const rows = []
  for (const entry of events ?? []) {
    const row = describeEvent(entry, ctx)
    row.time = row.at === null ? '—' : clock(row.at, timeZone)
    row.day = row.at === null ? 'unknown' : dayKey(row.at, timeZone)
    const last = rows[rows.length - 1]
    if (row.type === CHECK && last?.type === CHECK && last.day === row.day && row.day !== 'unknown') {
      last.count += 1
      last.oldestTime = row.time
      continue
    }
    rows.push(row)
  }
  for (const row of rows) {
    if (row.type !== CHECK || row.count < 2) continue
    row.note = `Latest: ${row.title.charAt(0).toLowerCase()}${row.title.slice(1)}`
    row.title = `Ran ${row.count} times, ${row.oldestTime} to ${row.time}`
  }
  return rows
}

// Rows grouped under Today, Yesterday, then dated headings ("Mon 28 Sept",
// with the year when it is not this year). Rows with an unreadable time go
// last, under "Unknown time", rather than being dropped.
export function groupByDay(rows, { now = new Date(), timeZone } = {}) {
  const today = dayKey(now.getTime(), timeZone)
  const yesterday = dayKey(now.getTime() - 86400000, timeZone)
  const groups = new Map()
  for (const row of rows ?? []) {
    const key = row.day ?? (row.at === null ? 'unknown' : dayKey(row.at, timeZone))
    if (!groups.has(key)) {
      let label = 'Unknown time'
      if (key === today) label = 'Today'
      else if (key === yesterday) label = 'Yesterday'
      else if (key !== 'unknown') {
        const sameYear = key.slice(0, 4) === today.slice(0, 4)
        label = formatter({ weekday: 'short', day: 'numeric', month: 'short', ...(sameYear ? {} : { year: 'numeric' }) }, timeZone).format(row.at).replace(/,/g, '')
      }
      groups.set(key, { key, label, rows: [] })
    }
    groups.get(key).rows.push(row)
  }
  const list = [...groups.values()]
  return [...list.filter((group) => group.key !== 'unknown'), ...list.filter((group) => group.key === 'unknown')]
}

// Kind filter plus a search over the words on the row, ignoring case.
export function matchesFilter(row, { kind = 'all', query = '' } = {}) {
  if (kind !== 'all' && row.kind !== kind) return false
  const wanted = String(query ?? '').trim().toLowerCase()
  if (!wanted) return true
  return [row.label, row.title, row.note, row.by, row.effect?.label, row.ref].some((value) => String(value ?? '').toLowerCase().includes(wanted))
}
