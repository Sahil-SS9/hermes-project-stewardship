// Batch D — the inbox model, proven as pure functions before any UI exists.
// RED first: importing ./src/inbox/model.js fails until the module lands.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const require = createRequire(fileURLToPath(new URL('../dashboard/package.json', import.meta.url)))
require('react') // keep the dashboard workspace resolution warm like other suites
const model = await import('./src/inbox/model.js')

const NOW = new Date('2026-10-03T12:00:00Z')
const freeze = (fn) => fn({ now: () => NOW })

const ITEMS = [
  { kind: 'initiative_approval', project: 'payments-relaunch', ref: 'INI-HI', title: 'High risk change', risk: 'high', created_at: '2026-10-03T08:00:00Z', deep_link: 's6:initiative/INI-HI' },
  { kind: 'initiative_approval', project: 'demo-project', ref: 'INI-MED', title: 'Medium change', risk: 'medium', created_at: '2026-10-02T04:00:00Z', deep_link: 's6:initiative/INI-MED' },
  { kind: 'initiative_approval', project: 'demo-project', ref: 'INI-LOW', title: 'Low tweak', risk: 'low', created_at: '2026-09-20T04:00:00Z', deep_link: 's6:initiative/INI-LOW' },
  { kind: 'project_attention', project: 'payments-relaunch', ref: 'frozen', title: 'Project needs attention (phase=frozen)', risk: 'high', deep_link: 's1:project/payments-relaunch' },
]

test('inboxTabs: All, Urgent, Today, Earlier (never Later)', () => {
  assert.deepEqual(model.TAB_KEYS, ['all', 'urgent', 'today', 'earlier'])
  assert.deepEqual(model.TAB_LABELS, { all: 'All', urgent: 'Urgent', today: 'Today', earlier: 'Earlier' })
})

test('countTabs returns a count per tab from the real item shape', () => {
  const counts = model.countTabs(ITEMS, NOW)
  assert.equal(counts.all, 4)
  assert.equal(counts.urgent, 2, 'high risk decision + frozen project attention')
  assert.equal(counts.today, 1, 'only the same-day decision')
  assert.equal(counts.earlier, 2, 'items older than today')
})

test('filterByTab splits attention rows from decidable rows', () => {
  const filtered = model.filterByTab(ITEMS, 'urgent', NOW)
  assert.equal(filtered.length, 2)
  assert.ok(filtered.every((item) => model.isAttention(item) ? String(item.risk || 'low') === 'high' : ['high', 'critical'].includes(String(item.risk).toLowerCase())))
  assert.ok(filtered.some((item) => item.kind === 'project_attention'))
  assert.ok(filtered.every((item) => item.kind !== 'initiative_approval' || item.risk === 'high'))
  assert.equal(model.filterByTab(ITEMS, 'today', NOW).length, 1)
  assert.equal(model.filterByTab(ITEMS, 'earlier', NOW).length, 2)
})

test('isAttention marks project_attention rows undecidable', () => {
  assert.equal(model.isAttention(ITEMS[3]), true)
  assert.equal(model.isAttention(ITEMS[0]), false)
})

test('ageLabel renders an honest age from created_at or the backend age_days', () => {
  assert.equal(model.ageLabel({ created_at: '2026-10-03T08:00:00Z' }, NOW), 'today')
  assert.equal(model.ageLabel({ created_at: '2026-10-01T08:00:00Z' }, NOW), '2 days old')
  assert.equal(model.ageLabel({ age_days: 5 }, NOW), '5 days old')
  assert.equal(model.ageLabel({}, NOW), '')
})

test('evidenceCount derives a count for the row badge', () => {
  assert.equal(model.evidenceCount({ detail: { validation_contract: { steps: ['a', 'b'], tests: 'x' } } }), 3)
  assert.equal(model.evidenceCount({ detail: { validation_contract: { tests: 'suite' } } }), 1)
  assert.equal(model.evidenceCount({ detail: null }), 0)
  assert.equal(model.evidenceCount({}), 0)
})

test('rowSummary gives the list line: project, meta and risk', () => {
  const summary = model.rowSummary(ITEMS[0], NOW)
  assert.equal(summary.project, 'payments-relaunch')
  assert.equal(summary.risk, 'high')
  assert.ok(summary.meta.includes('high risk'), `meta carries risk: ${summary.meta}`)
  assert.ok(summary.meta.includes('today'), `meta carries age: ${summary.meta}`)
})

test('mergeActivity merges comments, receipts and events into one timeline', () => {
  const timeline = model.mergeActivity({
    comments: [
      { id: 1, actor: 'sahil', body: 'Which metric backs this?', created_at: '2026-10-03T09:00:00Z' },
    ],
    receipts: [
      { id: 2, actor: 'owner', decision: 'approved', created_at: '2026-10-03T10:00:00Z' },
    ],
    events: [
      { id: 3, actor: 'fixture', kind: 'resubmit', summary: 'Proposal resubmitted', created_at: '2026-10-03T11:00:00Z' },
    ],
  })
  assert.deepEqual(timeline.map((entry) => entry.kind), ['comment', 'receipt', 'event'])
  assert.deepEqual(timeline.map((entry) => entry.at), [
    '2026-10-03T09:00:00Z', '2026-10-03T10:00:00Z', '2026-10-03T11:00:00Z',
  ])
  const mixed = model.mergeActivity({
    comments: [{ id: 1, actor: 'a', body: 'x', created_at: '2026-10-03T11:30:00Z' }],
    receipts: [{ id: 2, actor: 'b', decision: 'approved', created_at: '2026-10-03T09:00:00Z' }],
    events: [],
  })
  assert.equal(mixed[0].kind, 'receipt', 'timeline is ordered by time, not by source')
})

test('attentionPanel copy stays honest: what is true, what to do next', () => {
  const copy = model.attentionPanel(ITEMS[3])
  assert.match(copy.title, /needs attention/i)
  assert.ok(String(copy.description).length > 10)
  assert.equal(copy.decidable, false)
})