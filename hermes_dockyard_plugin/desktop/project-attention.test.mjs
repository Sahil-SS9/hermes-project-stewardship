// C1 Overview: the header strip's model (src/project/attention.js), proven as
// pure functions. Every state and drawer row must come from a backend fact;
// none may be invented, and a missing portfolio must read as unavailable,
// never as "on track".
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { projectAttention, deliveryCounts, lastActivity, timeAgo, STALLED_AFTER_DAYS } from './src/project/attention.js'

const NOW = new Date('2026-10-05T12:00:00Z')
const row = (over = {}) => ({ project_id: 'p1', status: 'on_track', phase: 'active', enabled: true, items: { done: 1, total: 4, blocked: 0, overdue: 0 }, last_activity: null, ...over })
const portfolio = ({ rowOver = {}, decisions = [], interventions = [] } = {}) => ({ projects: [row(rowOver)], groups: { decisions, interventions, informational: [] } })
const project = (over = {}) => ({ id: 'p1', enabled: true, phase: 'active', health: 'unknown', work: { backlog: 2, active: 1, done: 1, blocked: 0 }, ...over })
const blockedEntry = { project: 'p1', cause: 'blocked_item', ref: 'W-9', title: 'Crash on launch', detail: 'Waiting on the vendor', owner: 'grace', age_days: 3, next_action: 'Unblock or reassign' }
const overdueEntry = { project: 'p1', cause: 'overdue_item', ref: 'W-8', title: 'Release notes', detail: 'Due 2026-10-01', owner: null, age_days: 4, next_action: 'Re-plan' }
const decision = { project: 'p1', ref: 'INIT-2', title: 'Faster checkout', risk: 'low', age_days: 1, deep_link: 's6:initiative/INIT-2' }

test('no portfolio row: "Status unavailable", never a guessed state', () => {
  for (const value of [null, undefined, { projects: [] }, { projects: [row({ project_id: 'other' })] }]) {
    const result = projectAttention({ project: project(), portfolio: value, now: NOW })
    assert.equal(result.available, false)
    assert.equal(result.state, 'unknown')
    assert.equal(result.tone, 'neutral')
    assert.equal(result.label, 'Status unavailable')
    assert.deepEqual(result.items, [])
  }
})

test('banner priority: switched off, then lifecycle, then blocked, at risk, stalled, review, idle, on track', () => {
  const cases = [
    [{ project: project({ enabled: false, work: { blocked: 2 } }), portfolio: portfolio({ interventions: [blockedEntry] }) }, ['disabled', 'neutral', 'Disabled']],
    [{ project: project({ phase: 'frozen' }), portfolio: portfolio({ rowOver: { phase: 'frozen' } }) }, ['frozen', 'neutral', 'Frozen']],
    [{ project: project(), portfolio: portfolio({ rowOver: { status: 'at_risk', items: { blocked: 1 } }, interventions: [blockedEntry] }) }, ['blocked', 'danger', 'Blocked']],
    [{ project: project(), portfolio: portfolio({ rowOver: { status: 'at_risk', items: { overdue: 1 } }, interventions: [overdueEntry], decisions: [decision] }) }, ['at_risk', 'warning', 'At risk']],
    [{ project: project(), portfolio: portfolio({ rowOver: { status: 'stalled' }, decisions: [decision] }) }, ['stalled', 'warning', 'Stalled']],
    [{ project: project(), portfolio: portfolio({ decisions: [decision] }) }, ['review', 'info', 'Needs review']],
    [{ project: project(), portfolio: portfolio({ rowOver: { status: 'idle' } }) }, ['idle', 'neutral', 'Idle']],
    [{ project: project(), portfolio: portfolio() }, ['on_track', 'success', 'On track']],
  ]
  for (const [input, [state, tone, label]] of cases) {
    const result = projectAttention({ ...input, now: NOW })
    assert.deepEqual([result.state, result.tone, result.label], [state, tone, label], `expected ${state}`)
  }
})

test('the drawer lists only this project\'s facts, most severe first, oldest first within a severity', () => {
  const other = { ...blockedEntry, project: 'p2', ref: 'X-1' }
  const result = projectAttention({
    project: project(),
    portfolio: portfolio({ rowOver: { status: 'at_risk', items: { blocked: 1, overdue: 1 } }, interventions: [overdueEntry, other, blockedEntry], decisions: [{ ...decision, age_days: 9 }, { ...decision, project: 'p2', ref: 'INIT-9' }] }),
    milestones: [{ id: 7, name: 'Beta', due: '2026-09-20', closed: false, archived_at: null, total: 4, done: 1 }],
    now: NOW,
  })
  assert.deepEqual(result.items.map((item) => item.key), ['blocked:W-9', 'milestone:7', 'approval:INIT-2', 'overdue:W-8'])
  const blocked = result.items[0]
  assert.equal(blocked.tone, 'danger')
  assert.equal(blocked.owner, 'grace')
  assert.equal(blocked.note, 'Waiting on the vendor')
  assert.deepEqual(blocked.target, { kind: 'work', ref: 'W-9' })
  const approval = result.items.find((item) => item.kind === 'approval')
  assert.equal(approval.tone, 'warning', 'signed 16/09: an approval is amber in the drawer')
  assert.deepEqual(approval.target, { kind: 'deep_link', link: 's6:initiative/INIT-2' })
  const milestone = result.items.find((item) => item.kind === 'milestone')
  assert.equal(milestone.ageDays, 15)
  assert.deepEqual(milestone.target, { kind: 'plan', entry: 'plan:milestone:7' })
  assert.match(milestone.note, /1 of 4 done/)
})

test('milestones: only open, unarchived ones past their due date count as overdue', () => {
  const milestones = [
    { id: 1, name: 'Past, open', due: '2026-10-01', closed: false, archived_at: null },
    { id: 2, name: 'Past, closed', due: '2026-10-01', closed: true, archived_at: null },
    { id: 3, name: 'Past, archived', due: '2026-10-01', closed: false, archived_at: '2026-10-02' },
    { id: 4, name: 'Future', due: '2099-01-01', closed: false, archived_at: null },
    { id: 5, name: 'No date', due: null, closed: false, archived_at: null },
  ]
  const result = projectAttention({ project: project(), portfolio: portfolio(), milestones, now: NOW })
  assert.deepEqual(result.items.map((item) => item.key), ['milestone:1'])
})

test('summary sentence counts what needs the person, with correct plurals', () => {
  const one = projectAttention({ project: project(), portfolio: portfolio({ rowOver: { items: { blocked: 1 } }, interventions: [blockedEntry] }), now: NOW })
  assert.equal(one.summary, '1 blocked item needs you')
  const many = projectAttention({ project: project(), portfolio: portfolio({ rowOver: { items: { blocked: 1 } }, interventions: [blockedEntry, overdueEntry], decisions: [decision, { ...decision, ref: 'INIT-3' }] }), now: NOW })
  assert.equal(many.summary, '1 blocked item, 1 overdue item and 2 approvals need you')
  const stalled = projectAttention({ project: project(), portfolio: portfolio({ rowOver: { status: 'stalled' } }), now: NOW })
  assert.equal(stalled.summary, `no work has moved for ${STALLED_AFTER_DAYS} days or more`)
  assert.equal(stalled.items[0].target.view, 'board')
  assert.equal(projectAttention({ project: project(), portfolio: portfolio(), now: NOW }).summary, 'nothing needs you right now')
  assert.equal(projectAttention({ project: project(), portfolio: portfolio({ rowOver: { status: 'idle' } }), now: NOW }).summary, 'nothing is in progress and no milestone is open')
  const off = projectAttention({ project: project({ enabled: false }), portfolio: portfolio({ interventions: [{ project: 'p1', cause: 'project_attention', ref: 'active', title: 'p1', age_days: 0 }] }), now: NOW })
  assert.equal(off.summary, 'nothing runs until it is enabled')
  assert.deepEqual(off.items.map((item) => [item.label, item.target.view]), [['Switched off', 'settings']])
})

test('evidence out of date is a drawer row and a note, never the delivery state (rule P6.1)', () => {
  const stale = { project: 'p1', cause: 'evidence_stale', ref: 'p1', title: 'Evidence is 40 days old', detail: 'Last check 2026-08-26', age_days: 40 }
  const result = projectAttention({ project: project(), portfolio: portfolio({ interventions: [stale] }), now: NOW })
  assert.equal(result.state, 'on_track')
  assert.equal(result.items[0].kind, 'evidence')
  assert.equal(result.summary, 'evidence is 40 days old')
})

test('delivery counts use the Dashboard buckets; no work gives no percentage, not 0%', () => {
  assert.deepEqual(deliveryCounts({ done: 1, active: 2, blocked: 1, backlog: 4 }), { done: 1, active: 2, blocked: 1, backlog: 4, total: 8, percent: 13 })
  assert.deepEqual(deliveryCounts({}), { done: 0, active: 0, blocked: 0, backlog: 0, total: 0, percent: null })
  assert.equal(deliveryCounts(undefined).percent, null)
})

test('recency: the newest of the portfolio stamp and the project events; unreadable stamps are ignored', () => {
  const events = [{ ts: '2026-10-05T09:00:00+00:00' }, { ts: 'not a date' }, { created_at: '2026-10-04T09:00:00+00:00' }]
  assert.equal(lastActivity({ portfolioRow: { last_activity: '2026-10-03T00:00:00+00:00' }, events }), '2026-10-05T09:00:00+00:00')
  assert.equal(lastActivity({ portfolioRow: { last_activity: '2026-10-05T11:00:00.123456+00:00' }, events }), '2026-10-05T11:00:00.123456+00:00')
  assert.equal(lastActivity({ portfolioRow: null, events: [] }), null)
  assert.equal(timeAgo('2026-10-05T11:59:40Z', NOW), 'just now')
  assert.equal(timeAgo('2026-10-05T11:15:00Z', NOW), '45 min ago')
  assert.equal(timeAgo('2026-10-05T09:00:00Z', NOW), '3h ago')
  assert.equal(timeAgo('2026-09-30T12:00:00Z', NOW), '5d ago')
  assert.equal(timeAgo(null, NOW), null)
  assert.equal(timeAgo('garbage', NOW), null)
})

// Found on Sahil's live app (10/10/2026): a project Hermes has no project for
// ("unlinked") fell through every banner state to "On track", and its
// unlinked_project intervention never reached the drawer.
const unlinkedEntry = { kind: 'project_attention', project: 'p1', cause: 'unlinked_project', ref: 'p1', title: 'Not linked to a Hermes project', detail: 'Hermes has no project with this id or slug, so its work cannot be shown.', owner: 'lead', age_days: 0, next_action: 'Create a Hermes project with this slug to link it.', deep_link: 's1:project/p1' }
const unlinkedPortfolio = () => portfolio({ rowOver: { status: 'unlinked', items: { total: 0, done: 0, blocked: 0, overdue: 0 } }, interventions: [unlinkedEntry] })

test('an unlinked project says "Not linked", never "On track", and the drawer explains it', () => {
  const result = projectAttention({ project: project(), portfolio: unlinkedPortfolio(), now: NOW })
  assert.equal(result.available, true)
  assert.deepEqual([result.state, result.tone, result.label], ['unlinked', 'warning', 'Not linked'])
  assert.match(result.summary, /Hermes has no project for it/)
  const item = result.items.find((entry) => entry.kind === 'unlinked')
  assert.ok(item, 'the missing link is in the drawer')
  assert.equal(item.label, 'Not linked')
  assert.equal(item.title, unlinkedEntry.title)
  assert.equal(item.note, unlinkedEntry.detail)
  assert.equal(item.next, unlinkedEntry.next_action)
  assert.deepEqual(item.target, { kind: 'view', view: 'settings' })
  assert.equal(item.openLabel, 'Open project settings')
})

test('switched off and lifecycle states still outrank a missing link', () => {
  const off = projectAttention({ project: project({ enabled: false }), portfolio: unlinkedPortfolio(), now: NOW })
  assert.equal(off.state, 'disabled')
  const paused = projectAttention({ project: project({ phase: 'paused' }), portfolio: unlinkedPortfolio(), now: NOW })
  assert.equal(paused.state, 'paused')
})
