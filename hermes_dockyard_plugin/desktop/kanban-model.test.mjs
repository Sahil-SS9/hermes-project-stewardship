// C2 Kanban: the pure model, proven without a browser.
import { test } from 'node:test'
import assert from 'node:assert/strict'

const m = await import('./src/kanban/model.js')

const item = (over = {}) => ({ ref: 'HDY-10', title: 'Build the thing', type: 'task', status: 'backlog', assignee: '', labels: [], due: '', ...over })
const card = (ref, type, status, title = 'Linked item') => ({ ref, title, type, status })

// ---- stages ----------------------------------------------------------------

test('six stages with the same keys, labels and status mapping as before', () => {
  assert.deepEqual(m.STAGES.map((s) => [s.key, s.label]), [
    ['backlog', 'Backlog'], ['active', 'In progress'], ['review', 'Review'],
    ['blocked', 'Blocked'], ['done', 'Done'], ['other', 'Other states'],
  ])
  assert.deepEqual(m.STAGES.find((s) => s.key === 'active').statuses, ['in_progress', 'executing', 'active'])
  assert.deepEqual(m.STAGES.find((s) => s.key === 'review').statuses, ['in_review', 'review'])
  assert.deepEqual(m.STAGES.find((s) => s.key === 'done').statuses, ['done', 'complete', 'completed'])
  assert.equal(m.STAGES.find((s) => s.key === 'other').statuses, null)
})

test('grouping: known statuses, unknown go to Other, archived are dropped, order is kept', () => {
  const groups = m.groupByStage([
    item({ ref: 'A', status: 'in_progress' }), item({ ref: 'B', status: 'executing' }),
    item({ ref: 'C', status: 'weird_state' }), item({ ref: 'D', status: 'archived' }),
    item({ ref: 'E', status: 'completed' }), item({ ref: 'F', status: 'in_progress' }),
  ])
  assert.deepEqual(groups.active.map((i) => i.ref), ['A', 'B', 'F'])
  assert.deepEqual(groups.other.map((i) => i.ref), ['C'])
  assert.deepEqual(groups.done.map((i) => i.ref), ['E'])
  assert.equal(Object.values(groups).flat().some((i) => i.ref === 'D'), false)
})

test('dropping on a stage uses the stage first status; Other accepts no drop', () => {
  assert.equal(m.dropStatusOf('active'), 'in_progress')
  assert.equal(m.dropStatusOf('done'), 'done')
  assert.equal(m.dropStatusOf('other'), null)
})

// ---- small helpers -----------------------------------------------------------

test('initials come from the real name only', () => {
  assert.equal(m.initialsOf('Ada Lovelace'), 'AL')
  assert.equal(m.initialsOf('worker'), 'W')
  assert.equal(m.initialsOf('grace.brewster hopper'), 'GH')
  assert.equal(m.initialsOf(''), '')
  assert.equal(m.initialsOf(null), '')
})

test('overdue only when the date has passed and the item is not done', () => {
  assert.equal(m.isOverdue(item({ due: '2000-01-01' }), '2026-10-04'), true)
  assert.equal(m.isOverdue(item({ due: '2099-01-01' }), '2026-10-04'), false)
  assert.equal(m.isOverdue(item({ due: '2000-01-01', status: 'done' }), '2026-10-04'), false)
  assert.equal(m.isOverdue(item({ due: '' }), '2026-10-04'), false)
  assert.equal(m.isOverdue(item({ due: '2026-10-04' }), '2026-10-04'), false, 'due today is not overdue')
})

test('type words are capitalised from the real type', () => {
  assert.equal(m.typeLabel('epic'), 'Epic')
  assert.equal(m.typeLabel('feature'), 'Feature')
  assert.equal(m.typeLabel(''), 'Task')
  assert.equal(m.typeLabel(undefined), 'Task')
})

// ---- chips -------------------------------------------------------------------

test('link chips show the linked item type, id and name, in that order', () => {
  const deps = { 'HDY-10': { blocked_by: [card('HDY-1', 'epic', 'in_progress', 'Payments rewrite')], blocks: [card('HDY-9', 'task', 'backlog', 'Fix login')] } }
  const chips = m.chipsFor(item(), { deps })
  assert.deepEqual(chips.map((c) => c.text), [
    'Blocked by · Epic · HDY-1 Payments rewrite',
    'Blocks · Task · HDY-9 Fix login',
  ])
  assert.deepEqual(chips.map((c) => c.target), [{ kind: 'item', ref: 'HDY-1' }, { kind: 'item', ref: 'HDY-9' }])
  assert.match(chips[0].title, /HDY-1 — Payments rewrite · Epic · in progress/)
})

test('a done linked item says Done in words', () => {
  const deps = { 'HDY-10': { blocked_by: [card('HDY-2', 'task', 'done', 'Shipped')], blocks: [] } }
  const [chip] = m.chipsFor(item(), { deps })
  assert.equal(chip.done, true)
  assert.match(chip.text, / · Done$/)
})

test('an item carrying parent_task_id produces no chip from it', () => {
  const chips = m.chipsFor(item({ parent_task_id: 'HDY-1' }), { deps: {}, initiatives: [], milestones: [] })
  assert.deepEqual(chips, [])
  const withLinks = m.chipsFor(item({ parent_task_id: 'HDY-1' }), { deps: { 'HDY-10': { blocked_by: [card('HDY-5', 'task', 'backlog')], blocks: [] } } })
  assert.deepEqual(withLinks.map((c) => c.ref), ['HDY-5'], 'only the real link shows')
})

test('initiative chip uses initiative_ref and the real title', () => {
  const initiatives = [{ ref: 'INIT-7', title: 'Ship saved views' }]
  const [chip] = m.chipsFor(item({ initiative_ref: 'INIT-7' }), { initiatives })
  assert.equal(chip.text, 'Initiative · INIT-7 Ship saved views')
  assert.deepEqual(chip.target, { kind: 'view', view: 'initiative' })
  const [bare] = m.chipsFor(item({ initiative_ref: 'INIT-9' }), { initiatives })
  assert.equal(bare.text, 'Initiative · INIT-9', 'no invented title when the initiative is not loaded')
})

test('milestone chips come from item_refs and skip archived milestones', () => {
  const milestones = [
    { id: 1, name: 'Pilot release', item_refs: ['HDY-10'] },
    { id: 2, name: 'Old one', item_refs: ['HDY-10'], archived_at: '2026-01-01' },
    { id: 3, name: 'Elsewhere', item_refs: ['HDY-99'] },
  ]
  const chips = m.chipsFor(item(), { milestones })
  assert.deepEqual(chips.map((c) => c.text), ['Milestone · Pilot release'])
  assert.deepEqual(chips[0].target, { kind: 'view', view: 'milestones' })
})

test('an objective appears only through the initiative, and says which', () => {
  const roadmapProject = { initiatives: [{ ref: 'INIT-7', title: 'Ship saved views', objectives: [{ id: 4, name: 'Review cycle under two days', relationship: 'supports' }] }] }
  const initiatives = [{ ref: 'INIT-7', title: 'Ship saved views' }]
  const withInit = m.chipsFor(item({ initiative_ref: 'INIT-7' }), { initiatives, roadmapProject })
  assert.deepEqual(withInit.filter((c) => c.kind === 'objective').map((c) => c.text),
    ['Objective · Review cycle under two days · via Ship saved views · supports'])
  const noInit = m.chipsFor(item(), { initiatives, roadmapProject })
  assert.deepEqual(noInit, [], 'no initiative means no objective chip, ever')
  const otherInit = m.chipsFor(item({ initiative_ref: 'INIT-8' }), { roadmapProject })
  assert.equal(otherInit.some((c) => c.kind === 'objective'), false, 'an initiative with no objective shows none')
})

test('chip order: links first, then initiative, milestone, objective', () => {
  const data = {
    deps: { 'HDY-10': { blocked_by: [card('HDY-1', 'epic', 'backlog')], blocks: [card('HDY-9', 'task', 'backlog')] } },
    initiatives: [{ ref: 'INIT-7', title: 'T' }],
    milestones: [{ id: 1, name: 'M', item_refs: ['HDY-10'] }],
    roadmapProject: { initiatives: [{ ref: 'INIT-7', title: 'T', objectives: [{ id: 4, name: 'O', relationship: 'supports' }] }] },
  }
  assert.deepEqual(m.chipsFor(item({ initiative_ref: 'INIT-7' }), data).map((c) => c.kind),
    ['blocked_by', 'blocks', 'initiative', 'milestone', 'objective'])
})

test('missing data never invents chips', () => {
  assert.deepEqual(m.chipsFor(item(), {}), [])
  assert.deepEqual(m.chipsFor(item()), [])
  assert.deepEqual(m.chipsFor(null, {}), [])
})

// ---- tags and the +n split -----------------------------------------------------

test('Tags switch whole groups off; all are on by default', () => {
  assert.deepEqual(m.defaultTags(), { links: true, planning: true, due: true, labels: true })
  const data = {
    deps: { 'HDY-10': { blocked_by: [card('HDY-1', 'epic', 'backlog')], blocks: [] } },
    initiatives: [{ ref: 'INIT-7', title: 'T' }],
  }
  const chips = m.chipsFor(item({ initiative_ref: 'INIT-7' }), data)
  assert.deepEqual(m.visibleChips(chips, { ...m.defaultTags(), links: false }).map((c) => c.kind), ['initiative'])
  assert.deepEqual(m.visibleChips(chips, { ...m.defaultTags(), planning: false }).map((c) => c.kind), ['blocked_by'])
  assert.equal(m.visibleChips(chips, m.defaultTags()).length, 2)
})

test('a card shows three chips and "+n" for the rest; expanding shows all', () => {
  const chips = ['a', 'b', 'c', 'd', 'e'].map((k) => ({ key: k, kind: 'milestone' }))
  assert.deepEqual(m.splitChips(chips, false), { shown: chips.slice(0, 3), hidden: 2 })
  assert.deepEqual(m.splitChips(chips, true), { shown: chips, hidden: 0 })
  assert.deepEqual(m.splitChips(chips.slice(0, 3), false), { shown: chips.slice(0, 3), hidden: 0 })
})

// ---- filters -----------------------------------------------------------------

const items = [
  item({ ref: 'HDY-10', title: 'Build setup flow', assignee: 'Ada Lovelace', type: 'task', labels: ['mobile'] }),
  item({ ref: 'HDY-11', title: 'Fix login', assignee: 'Grace Hopper', type: 'bug', labels: ['auth', 'mobile'] }),
  item({ ref: 'HDY-12', title: 'Spike on sync', assignee: '', type: 'spike', status: 'archived' }),
]

test('filter options list only values that exist, from live items', () => {
  assert.deepEqual(m.filterOptions(items), { assignees: ['Ada Lovelace', 'Grace Hopper'], types: ['bug', 'task'], labels: ['auth', 'mobile'] })
})

test('filters combine; the empty set returns everything', () => {
  assert.equal(m.applyFilters(items, m.emptyFilters()).length, 3)
  assert.deepEqual(m.applyFilters(items, { ...m.emptyFilters(), assignee: 'Ada Lovelace' }).map((i) => i.ref), ['HDY-10'])
  assert.deepEqual(m.applyFilters(items, { ...m.emptyFilters(), label: 'mobile', type: 'bug' }).map((i) => i.ref), ['HDY-11'])
  assert.deepEqual(m.applyFilters(items, { ...m.emptyFilters(), query: 'LOGIN' }).map((i) => i.ref), ['HDY-11'])
  assert.deepEqual(m.applyFilters(items, { ...m.emptyFilters(), query: 'hdy-10' }).map((i) => i.ref), ['HDY-10'])
  assert.equal(m.filtersActive(m.emptyFilters()), false)
  assert.equal(m.filtersActive({ ...m.emptyFilters(), query: '  ' }), false)
  assert.equal(m.filtersActive({ ...m.emptyFilters(), type: 'bug' }), true)
})

test('searching a ref also finds every item whose chips reference it', () => {
  const chipsByRef = {
    'HDY-10': [{ kind: 'blocked_by', ref: 'HDY-1' }],
    'HDY-11': [{ kind: 'blocks', ref: 'HDY-10' }, { kind: 'milestone', ref: null }],
  }
  assert.deepEqual(m.applyFilters(items, { ...m.emptyFilters(), query: 'HDY-1' }, chipsByRef).map((i) => i.ref), ['HDY-10', 'HDY-11', 'HDY-12'])
  assert.deepEqual(m.applyFilters(items, { ...m.emptyFilters(), query: 'HDY-10' }, chipsByRef).map((i) => i.ref), ['HDY-10', 'HDY-11'])
})
