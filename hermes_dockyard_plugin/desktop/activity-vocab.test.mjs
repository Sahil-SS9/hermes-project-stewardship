// C5 Activity: the words, colours and links for every recorded project event,
// as pure rules (no React). The Activity screen (project/activity.js) and the
// Overview's "Recent activity" card both read them, so the two can never name
// an event differently. The browser half is activity-screen.test.mjs.
//
// The events are the backend's domain events (GET /projects/{id}/events):
// { id, ts, event_type, project_id, subject, payload, emitted_by }. The
// payloads below are the ones the backend's own emit sites send.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  KNOWN_EVENT_TYPES, EVENT_FILTERS, HEALTH_WORD, describeEvent, activityRows, groupByDay, matchesFilter,
} from './src/lib/event-vocab.js'

const SRC = fileURLToPath(new URL('../../src/hermes_project_stewardship/', import.meta.url))
const UI = fileURLToPath(new URL('./src/lib/ui.js', import.meta.url))

// Every event type the backend can record: the constants in events/bus.py,
// plus every literal or constant passed to an emit call anywhere in the
// backend. A new type without plain words fails here, not on Sahil's screen.
function backendTypes() {
  const files = []
  const walk = (dir) => {
    for (const name of readdirSync(dir)) {
      const full = path.join(dir, name)
      if (statSync(full).isDirectory()) { if (!['tests', '__pycache__'].includes(name)) walk(full) } else if (name.endsWith('.py')) files.push(full)
    }
  }
  walk(SRC)
  const bus = readFileSync(path.join(SRC, 'events/bus.py'), 'utf8')
  const constants = Object.fromEntries([...bus.matchAll(/^([A-Z_]+)\s*=\s*"([a-z_]+(?:\.[a-z_]+)+)"/gm)].map((match) => [match[1], match[2]]))
  const emitted = new Set()
  for (const file of files) {
    const text = readFileSync(file, 'utf8')
    for (const match of text.matchAll(/(?:\.emit|_notify_decisions)\(\s*(?:"([a-z_]+(?:\.[a-z_]+)+)"|([A-Z][A-Z_]{3,})\b)/g)) {
      const type = match[1] ?? constants[match[2]]
      if (type) emitted.add(type)
    }
  }
  return { emitted: [...emitted].sort(), defined: Object.values(constants) }
}

const event = (type, extra = {}) => ({ id: extra.id ?? 7, ts: extra.ts ?? '2026-10-06T09:15:00Z', event_type: type, project_id: 'pay', subject: extra.subject ?? null, payload: extra.payload ?? {}, emitted_by: extra.emitted_by ?? 'system' })
const CTX = {
  initiatives: [
    { ref: 'PAY-3', title: 'Retry payment webhooks', status: 'pending_approval' },
    { ref: 'PAY-4', title: 'Cache the price list', status: 'approved' },
  ],
  workItems: [{ ref: 'PAY-12', title: 'Fix refund rounding' }],
}

test('every event type the backend records or defines has its own plain words', () => {
  const { emitted, defined } = backendTypes()
  assert.ok(emitted.length >= 13, `found the backend's emit sites: ${emitted.join(', ')}`)
  for (const type of [...new Set([...emitted, ...defined])]) {
    assert.ok(KNOWN_EVENT_TYPES.includes(type), `${type} has its own words`)
    const row = describeEvent(event(type, { subject: 'X-1' }))
    assert.match(row.label, /^[A-Z][a-z]/, `${type}: the label reads as words ("${row.label}")`)
    const shown = [row.label, row.title, row.note, row.by, row.effect?.label].join(' ')
    assert.doesNotMatch(shown, /[{}"_]|\b[a-z]+\.[a-z]+/, `${type}: no code names or JSON on screen ("${shown}")`)
  }
})

test('an unknown event type still reads as words and never as JSON', () => {
  const row = describeEvent(event('billing.invoice_overdue', { subject: 'INV-9', payload: { deep: { nested: [1, 2] } } }))
  assert.equal(row.label, 'Billing invoice overdue')
  assert.equal(row.title, 'INV-9')
  assert.equal(row.effect, null, 'no effect is invented for a type the screen does not know')
  assert.equal(row.kind, 'other')
  assert.doesNotMatch(JSON.stringify([row.label, row.title, row.note]), /nested/)
})

test('initiative decisions: who, what, and what it means', () => {
  const asked = describeEvent(event('initiative.approval_required', { subject: 'PAY-3', payload: { title: 'Retry payment webhooks', risk: 'medium' } }), CTX)
  assert.deepEqual([asked.label, asked.title, asked.note, asked.kind, asked.by], ['Approval requested', 'PAY-3 · Retry payment webhooks', 'Medium risk', 'initiatives', 'System'])
  assert.deepEqual(asked.effect, { label: 'Waiting for a decision', tone: 'warning' })
  assert.deepEqual([asked.target, asked.openLabel], [{ kind: 'deep_link', link: 's6:initiative/PAY-3' }, 'Open in Approval inbox'], 'still waiting: open the Approval inbox')

  const again = describeEvent(event('initiative.approval_required', { subject: 'PAY-3', payload: { title: 'Retry payment webhooks', resubmitted: true } }), CTX)
  assert.equal(again.label, 'Resubmitted for approval')

  const approved = describeEvent(event('initiative.approved', { subject: 'PAY-4', payload: { actor: 'sahil', interface: 'dockyard:human' } }), CTX)
  assert.deepEqual([approved.label, approved.title, approved.by], ['Initiative approved', 'PAY-4 · Cache the price list', 'sahil'], 'the title comes from the initiative when the event has none')
  assert.deepEqual(approved.effect, { label: 'Work can start', tone: 'success' })
  assert.deepEqual([approved.target, approved.openLabel], [{ kind: 'plan', entry: 'plan:initiative:PAY-4' }, 'Open in Vision'], 'decided: open it in Vision')

  const rejected = describeEvent(event('initiative.rejected', { subject: 'PAY-4', payload: { actor: 'sahil', reason: 'Too costly this quarter' } }), CTX)
  assert.deepEqual([rejected.label, rejected.note], ['Initiative rejected', 'Too costly this quarter'])
  assert.deepEqual(rejected.effect, { label: 'Will not go ahead', tone: 'neutral' })

  const changes = describeEvent(event('initiative.changes_requested', { subject: 'PAY-4', payload: { actor: 'sahil', feedback: 'Show the cost first' } }), CTX)
  assert.deepEqual([changes.label, changes.note], ['Changes requested', 'Show the cost first'])
  assert.deepEqual(changes.effect, { label: 'Back with the proposer', tone: 'warning' })

  const withdrawn = describeEvent(event('initiative.withdrawn', { subject: 'PAY-4', payload: { actor: 'quan-bot', reason: 'Duplicate' } }), CTX)
  assert.deepEqual([withdrawn.label, withdrawn.note, withdrawn.by], ['Initiative withdrawn', 'Duplicate', 'quan-bot'])
  assert.deepEqual(withdrawn.effect, { label: 'Closed by the proposer', tone: 'neutral' })

  const gone = describeEvent(event('initiative.approved', { subject: 'OLD-1' }), CTX)
  assert.deepEqual([gone.title, gone.target, gone.openLabel], ['OLD-1', null, null], 'no Open button for an initiative this project no longer lists')
})

test('health: the same words as the rest of the app, and the direction of the change', () => {
  const ui = readFileSync(UI, 'utf8')
  const map = ui.slice(ui.indexOf('export function healthDetails'), ui.indexOf('return map[value]'))
  for (const [state, word] of Object.entries(HEALTH_WORD)) {
    assert.match(map, new RegExp(`${state}: \\['[a-z]+', '${word}'\\]`), `"${word}" for ${state} matches healthDetails in lib/ui.js`)
  }
  const worse = describeEvent(event('project.health.changed', { subject: 'healthy->critical', payload: { from: 'healthy', to: 'critical', score: 31 } }))
  assert.deepEqual([worse.label, worse.title, worse.note, worse.kind, worse.target], ['Health changed', 'Healthy → Critical', 'Score 31', 'health', null])
  assert.deepEqual(worse.effect, { label: 'Health worse', tone: 'danger' })
  assert.deepEqual(describeEvent(event('project.health.changed', { payload: { from: 'healthy', to: 'watch' } })).effect, { label: 'Health worse', tone: 'warning' })
  assert.deepEqual(describeEvent(event('project.health.changed', { payload: { from: 'degraded', to: 'healthy' } })).effect, { label: 'Health better', tone: 'success' })
  const first = describeEvent(event('project.health.changed', { payload: { from: null, to: 'healthy' } }))
  assert.deepEqual([first.title, first.effect], ['Now Healthy', { label: 'First reading', tone: 'neutral' }])
  assert.deepEqual(describeEvent(event('project.health.changed', { payload: { from: 'unknown', to: 'healthy' } })).effect, { label: 'Health changed', tone: 'neutral' }, 'no direction is claimed from "Not verified"')

  const critical = describeEvent(event('project.critical', { subject: 'snapshot:5', payload: { contradictions: [{}, {}], auto_freeze: true } }))
  assert.deepEqual([critical.label, critical.title, critical.note], ['Project critical', 'Health is critical', '2 contradictions · Changes are frozen automatically'])
  assert.deepEqual(critical.effect, { label: 'Critical', tone: 'danger' })

  const failed = describeEvent(event('stewardship.verification.failed', { subject: 'cycle:4', payload: { contradictions: [{ claim: 'x' }] } }))
  assert.deepEqual([failed.label, failed.title, failed.effect], ['Verification failed', '1 contradiction found', { label: 'Evidence disagrees', tone: 'warning' }])
  const detailed = describeEvent(event('stewardship.verification.failed', { payload: { contradictions: [{ severity: 'high', subject: 'tests', detail: 'Claimed green, CI is red' }, { detail: 'second' }] } }))
  assert.deepEqual([detailed.title, detailed.note], ['2 contradictions found', 'Claimed green, CI is red'], 'the first contradiction says what disagrees')

  const reasoning = describeEvent(event('stewardship.reasoning.failed', { subject: 'cycle:4', payload: { error: 'provider timed out' } }))
  assert.deepEqual([reasoning.label, reasoning.title, reasoning.note, reasoning.effect], ['Proposal step failed', 'The proposal step stopped with an error', 'provider timed out', { label: 'No proposals made', tone: 'warning' }])

  const check = describeEvent(event('stewardship.cycle.started', { subject: 'cycle:4', payload: { trigger_type: 'webhook' } }))
  assert.deepEqual([check.label, check.title, check.effect, check.kind], ['Stewardship check', 'Run by a webhook', null, 'health'])
})

test('work: assignment and the soft warning when nobody owns it', () => {
  const assigned = describeEvent(event('work.assigned', { subject: 'PAY-12', payload: { to: 'quan-bot' }, emitted_by: 'sahil' }), CTX)
  assert.deepEqual([assigned.label, assigned.title, assigned.note, assigned.by, assigned.kind], ['Work assigned', 'PAY-12 · Fix refund rounding', 'Assigned to quan-bot', 'sahil', 'work'])
  assert.deepEqual(assigned.effect, { label: 'Has an owner', tone: 'success' }, 'the owner may be a person: no claim that a bot picks it up')
  assert.deepEqual([assigned.target, assigned.openLabel], [{ kind: 'work', ref: 'PAY-12' }, 'Open work item'])

  const unassigned = describeEvent(event('work.unassigned', { subject: 'PAY-99', payload: { title: 'Write the runbook' } }), CTX)
  assert.deepEqual([unassigned.label, unassigned.title, unassigned.effect], ['Work unassigned', 'PAY-99 · Write the runbook', { label: 'No bot will pick it up', tone: 'warning' }])
  assert.deepEqual([unassigned.target, unassigned.openLabel], [null, null], 'no Open button for work this project no longer lists')
})

test('rows: routine checks in a row fold into one, other events never do', () => {
  const events = [
    event('stewardship.cycle.started', { id: 9, ts: '2026-10-06T15:00:00Z', payload: { trigger_type: 'manual' } }),
    event('stewardship.cycle.started', { id: 8, ts: '2026-10-06T12:00:00Z' }),
    event('stewardship.cycle.started', { id: 7, ts: '2026-10-06T09:00:00Z' }),
    event('initiative.approved', { id: 6, ts: '2026-10-06T08:00:00Z', subject: 'PAY-4' }),
    event('stewardship.cycle.started', { id: 5, ts: '2026-10-06T07:00:00Z' }),
    event('stewardship.cycle.started', { id: 4, ts: '2026-10-05T23:00:00Z' }),
    event('initiative.approved', { id: 3, ts: '2026-10-05T22:00:00Z', subject: 'PAY-4' }),
    event('initiative.approved', { id: 2, ts: '2026-10-05T21:00:00Z', subject: 'PAY-4' }),
  ]
  const rows = activityRows(events, CTX, { timeZone: 'UTC' })
  assert.deepEqual(rows.map((row) => [row.type.split('.').pop(), row.count]), [['started', 3], ['approved', 1], ['started', 1], ['started', 1], ['approved', 1], ['approved', 1]], 'only back-to-back checks on the same day fold')
  assert.deepEqual([rows[0].title, rows[0].note], ['Ran 3 times, 09:00 to 15:00', 'Latest: run on request'])
  assert.deepEqual(rows.map((row) => row.key), ['event:9', 'event:6', 'event:5', 'event:4', 'event:3', 'event:2'], 'each row keeps the id of its newest event')
})

test('days: Today, Yesterday, then dated groups, newest first; a bad time is shown, not hidden', () => {
  const now = new Date('2026-10-06T18:00:00Z')
  const rows = activityRows([
    event('initiative.approved', { id: 4, ts: '2026-10-06T09:15:00Z' }),
    event('initiative.approved', { id: 3, ts: '2026-10-05T23:59:00Z' }),
    event('initiative.approved', { id: 2, ts: '2026-09-28T10:00:00Z' }),
    event('initiative.approved', { id: 9, ts: 'not a time' }),
    event('initiative.approved', { id: 1, ts: '2025-12-31T10:00:00Z' }),
  ], CTX, { timeZone: 'UTC' })
  const groups = groupByDay(rows, { now, timeZone: 'UTC' })
  assert.deepEqual(groups.map((group) => [group.label, group.rows.map((row) => row.id)]), [
    ['Today', [4]], ['Yesterday', [3]], ['Mon 28 Sept', [2]], ['Wed 31 Dec 2025', [1]], ['Unknown time', [9]],
  ])
  assert.deepEqual(groups[0].rows.map((row) => row.time), ['09:15'], 'each row carries its clock time')
  assert.equal(groups[4].rows[0].time, '—')
})

test('filters: by kind and by a search across the words on the row', () => {
  const rows = activityRows([
    event('initiative.approved', { id: 3, subject: 'PAY-4', payload: { actor: 'sahil' } }),
    event('work.unassigned', { id: 2, subject: 'PAY-99', payload: { title: 'Write the runbook' } }),
    event('project.health.changed', { id: 1, payload: { from: 'healthy', to: 'critical' } }),
  ], CTX, { timeZone: 'UTC' })
  assert.deepEqual(EVENT_FILTERS.map(([key]) => key), ['all', 'initiatives', 'work', 'health'])
  const pick = (filter) => rows.filter((row) => matchesFilter(row, filter)).map((row) => row.id)
  assert.deepEqual(pick({ kind: 'all' }), [3, 2, 1])
  assert.deepEqual(pick({ kind: 'initiatives' }), [3])
  assert.deepEqual(pick({ kind: 'work' }), [2])
  assert.deepEqual(pick({ kind: 'health' }), [1])
  assert.deepEqual(pick({ kind: 'all', query: 'runbook' }), [2], 'searches the detail')
  assert.deepEqual(pick({ kind: 'all', query: 'SAHIL' }), [3], 'searches who, ignoring case')
  assert.deepEqual(pick({ kind: 'all', query: 'health worse' }), [1], 'searches the effect')
  assert.deepEqual(pick({ kind: 'work', query: 'pay-4' }), [], 'kind and search combine')
})
