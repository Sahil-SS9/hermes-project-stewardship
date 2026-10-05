// C2 Kanban: the pure model, proven without a browser.
// r6 design (Sahil's C2 review, 04/10/2026): five columns and no catch-all,
// summary cards that expand, only the moves Hermes accepts, and views that save
// what you see. C's chip and Tags guarantees are kept below as card facts,
// summary signals and card fields.
import { test } from 'node:test'
import assert from 'node:assert/strict'

const m = await import('./src/kanban/model.js')

const item = (over = {}) => ({ ref: 'HDY-10', title: 'Build the thing', type: 'task', status: 'backlog', assignee: '', labels: [], due: '', ...over })
const card = (ref, type, status, title = 'Linked item') => ({ ref, title, type, status })
const TODAY = '2026-10-04'

// ---- stages ----------------------------------------------------------------

test('five stages with the same keys, labels and status mapping as before; no catch-all column', () => {
  assert.deepEqual(m.STAGES.map((s) => [s.key, s.label]), [
    ['backlog', 'Backlog'], ['active', 'In progress'], ['review', 'Review'], ['blocked', 'Blocked'], ['done', 'Done'],
  ])
  assert.deepEqual(m.STAGES.find((s) => s.key === 'active').statuses, ['in_progress', 'executing', 'active'])
  assert.deepEqual(m.STAGES.find((s) => s.key === 'review').statuses, ['in_review', 'review'])
  assert.deepEqual(m.STAGES.find((s) => s.key === 'done').statuses, ['done', 'complete', 'completed'])
  assert.ok(m.STAGES.every((s) => s.statuses.length > 0 && s.hint), 'every column says which statuses it holds')
})

test('grouping: known statuses go to their column; an unknown one is named, never hidden; archived are dropped; order is kept', () => {
  const items = [
    item({ ref: 'A', status: 'in_progress' }), item({ ref: 'B', status: 'executing' }),
    item({ ref: 'C', status: 'weird_state' }), item({ ref: 'D', status: 'archived' }),
    item({ ref: 'E', status: 'completed' }), item({ ref: 'F', status: 'in_progress' }),
  ]
  const groups = m.groupByStage(items)
  assert.deepEqual(Object.keys(groups), ['backlog', 'active', 'review', 'blocked', 'done'])
  assert.deepEqual(groups.active.map((i) => i.ref), ['A', 'B', 'F'])
  assert.deepEqual(groups.done.map((i) => i.ref), ['E'])
  assert.equal(Object.values(groups).flat().some((i) => i.ref === 'C' || i.ref === 'D'), false)
  assert.deepEqual(m.unplacedItems(items).map((i) => i.ref), ['C'], 'named in the notice above the board')
})

test('dropping on a stage uses the stage first status; an unknown stage takes no drop', () => {
  assert.equal(m.dropStatusOf('active'), 'in_progress')
  assert.equal(m.dropStatusOf('review'), 'in_review')
  assert.equal(m.dropStatusOf('done'), 'done')
  assert.equal(m.dropStatusOf('other'), null)
})

test('the moves offered are exactly what real Hermes accepted (move-matrix probe)', () => {
  const offered = (status, blockers = 0, type = 'task') => m.movesFor(item({ status, type }), blockers).targets.map((target) => target.key)
  assert.deepEqual(offered('backlog'), ['active', 'done'])
  assert.deepEqual(offered('in_progress'), ['review', 'blocked', 'done'])
  assert.deepEqual(offered('in_review'), ['done'])
  assert.deepEqual(offered('blocked'), ['active', 'done'])
  assert.deepEqual(offered('done'), [])
  assert.deepEqual(offered('backlog', 2), [], 'Hermes keeps a task with open blockers in Backlog')
  assert.match(m.movesFor(item(), 2).reason, /waiting on 2 open blockers\./)
  assert.match(m.movesFor(item(), 1).reason, /waiting on 1 open blocker\./)
  assert.deepEqual(offered('backlog', 0, 'epic'), ['active'])
  assert.deepEqual(offered('in_progress', 0, 'epic'), [])
  assert.deepEqual(offered('weird_state'), [])
  assert.match(m.movesFor(item({ status: 'done' })).reason, /stays in Done/)
  assert.deepEqual(m.movesFor(item({ status: 'in_progress' })).targets[0], { key: 'review', label: 'Review', status: 'in_review' })
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
  assert.equal(m.isOverdue(item({ due: '2000-01-01' }), TODAY), true)
  assert.equal(m.isOverdue(item({ due: '2099-01-01' }), TODAY), false)
  assert.equal(m.isOverdue(item({ due: '2000-01-01', status: 'done' }), TODAY), false)
  assert.equal(m.isOverdue(item({ due: '' }), TODAY), false)
  assert.equal(m.isOverdue(item({ due: TODAY }), TODAY), false, 'due today is not overdue')
})

test('type words are capitalised from the real type', () => {
  assert.equal(m.typeLabel('epic'), 'Epic')
  assert.equal(m.typeLabel('feature'), 'Feature')
  assert.equal(m.typeLabel(''), 'Task')
  assert.equal(m.typeLabel(undefined), 'Task')
})

test('profile ids read as names; dates read as words', () => {
  assert.equal(m.displayName('ada-lovelace'), 'Ada Lovelace')
  assert.equal(m.displayName(''), '')
  assert.equal(m.shortDate('2099-06-30', TODAY), '30 Jun 2099')
  assert.equal(m.shortDate('2026-03-01', TODAY), '1 Mar', 'the year is dropped when it is this year')
})

// ---- links and planning (what C's chips showed) --------------------------------

test('Blocked by and Blocks come from real links, with id, name, type and status', () => {
  const deps = { 'HDY-10': { blocked_by: [card('HDY-1', 'epic', 'in_progress', 'Payments rewrite')], blocks: [card('HDY-9', 'task', 'backlog', 'Fix login')] } }
  const facts = m.cardFacts(item(), { deps })
  assert.deepEqual(facts.blockedBy, [{ ref: 'HDY-1', title: 'Payments rewrite', type: 'epic', status: 'in_progress', done: false }])
  assert.deepEqual(facts.blocks, [{ ref: 'HDY-9', title: 'Fix login', type: 'task', status: 'backlog', done: false }])
  assert.deepEqual([facts.openBlockers, facts.openBlocks], [1, 1])
})

test('a done linked item is marked done and no longer counts as open', () => {
  const deps = { 'HDY-10': { blocked_by: [card('HDY-2', 'task', 'done', 'Shipped'), card('HDY-3', 'task', 'backlog')], blocks: [] } }
  const facts = m.cardFacts(item(), { deps })
  assert.deepEqual(facts.blockedBy.map((c) => c.done), [true, false])
  assert.equal(facts.openBlockers, 1)
})

test('an item carrying parent_task_id gets no link from it; only real links show', () => {
  assert.deepEqual(m.cardFacts(item({ parent_task_id: 'HDY-1' }), { deps: {}, initiatives: [], milestones: [] }).blockedBy, [])
  const facts = m.cardFacts(item({ parent_task_id: 'HDY-1' }), { deps: { 'HDY-10': { blocked_by: [card('HDY-5', 'task', 'backlog')], blocks: [] } } })
  assert.deepEqual(facts.blockedBy.map((c) => c.ref), ['HDY-5'], 'only the real link shows')
  assert.deepEqual(facts.blocks, [])
})

test('the initiative uses initiative_ref and the real title; no invented title when it is not loaded', () => {
  const initiatives = [{ ref: 'INIT-7', title: 'Ship saved views' }]
  assert.deepEqual(m.cardFacts(item({ initiative_ref: 'INIT-7' }), { initiatives }).initiative, { ref: 'INIT-7', title: 'Ship saved views' })
  assert.deepEqual(m.cardFacts(item({ initiative_ref: 'INIT-9' }), { initiatives }).initiative, { ref: 'INIT-9', title: '' })
  assert.equal(m.cardFacts(item(), { initiatives }).initiative, null)
})

test('milestones come from item_refs and skip archived milestones', () => {
  const milestones = [
    { id: 1, name: 'Pilot release', item_refs: ['HDY-10'], due: '2099-03-01' },
    { id: 2, name: 'Old one', item_refs: ['HDY-10'], archived_at: '2026-01-01' },
    { id: 3, name: 'Elsewhere', item_refs: ['HDY-99'] },
  ]
  assert.deepEqual(m.cardFacts(item(), { milestones }).milestones, [{ name: 'Pilot release', due: '2099-03-01' }])
})

test('an objective appears only through the initiative, and says how it relates', () => {
  const roadmapProject = { initiatives: [{ ref: 'INIT-7', title: 'Ship saved views', objectives: [{ id: 4, name: 'Review cycle under two days', relationship: 'supports' }] }] }
  assert.deepEqual(m.cardFacts(item({ initiative_ref: 'INIT-7' }), { roadmapProject }).objectives,
    [{ id: 4, name: 'Review cycle under two days', relationship: 'supports' }])
  assert.deepEqual(m.cardFacts(item(), { roadmapProject }).objectives, [], 'no initiative means no objective, ever')
  assert.deepEqual(m.cardFacts(item({ initiative_ref: 'INIT-8' }), { roadmapProject }).objectives, [], 'an initiative with no objective shows none')
})

test('missing data never invents links, planning or dates', () => {
  for (const facts of [m.cardFacts(item(), {}), m.cardFacts(item())]) {
    assert.deepEqual([facts.blockedBy, facts.blocks, facts.initiative, facts.milestones, facts.objectives, facts.due, facts.labels],
      [[], [], null, [], [], null, []])
  }
})

// ---- what a summary card shows (C's Tags are now card fields) ------------------

test('summary signals, in reading order: Blocked by, Blocks, then due or overdue', () => {
  const deps = { 'HDY-10': { blocked_by: [card('HDY-1', 'task', 'backlog'), card('HDY-2', 'task', 'done')], blocks: [card('HDY-9', 'task', 'backlog')] } }
  const late = m.cardFacts(item({ due: '2000-01-15' }), { deps }, TODAY)
  assert.deepEqual(m.cardSignals(late, m.defaultFields(), TODAY).map((s) => s.text), ['Blocked by 1', 'Blocks 1', 'Overdue · 15 Jan 2000'])
  const soon = m.cardFacts(item({ due: '2099-06-30' }), {}, TODAY)
  assert.deepEqual(m.cardSignals(soon, m.defaultFields(), TODAY).map((s) => [s.kind, s.text]), [['due', 'Due 30 Jun 2099']])
  assert.deepEqual(m.cardSignals(m.cardFacts(item(), {}), m.defaultFields(), TODAY), [], 'nothing to say, nothing shown')
})

test('card fields switch whole groups off; all but planning are on by default', () => {
  assert.deepEqual(m.CARD_FIELDS, ['assignee', 'links', 'due', 'labels', 'planning'])
  assert.deepEqual(m.defaultFields(), { assignee: true, links: true, due: true, labels: true, planning: false })
  const deps = { 'HDY-10': { blocked_by: [card('HDY-1', 'task', 'backlog')], blocks: [] } }
  const facts = m.cardFacts(item({ due: '2099-06-30' }), { deps }, TODAY)
  const kinds = (fields) => m.cardSignals(facts, { ...m.defaultFields(), ...fields }, TODAY).map((s) => s.kind)
  assert.deepEqual(kinds({}), ['blocked_by', 'due'])
  assert.deepEqual(kinds({ links: false }), ['due'])
  assert.deepEqual(kinds({ due: false }), ['blocked_by'])
  assert.equal(m.LABEL_LIMIT, 2, 'a card shows two labels, then "+n" (checked on the screen)')
})

// ---- filters -----------------------------------------------------------------

const items = [
  item({ ref: 'HDY-10', title: 'Build setup flow', assignee: 'Ada Lovelace', type: 'task', labels: ['mobile'] }),
  item({ ref: 'HDY-11', title: 'Fix login', assignee: 'Grace Hopper', type: 'bug', labels: ['auth', 'mobile'], status: 'blocked' }),
  item({ ref: 'HDY-12', title: 'Spike on sync', assignee: '', type: 'spike', status: 'archived' }),
]

test('filter options list only values that exist, from live items', () => {
  assert.deepEqual(m.filterOptions(items), { assignees: ['Ada Lovelace', 'Grace Hopper'], types: ['bug', 'task'], labels: ['auth', 'mobile'] })
})

test('filters combine; the empty set returns everything', () => {
  assert.equal(m.applyFilters(items, m.emptyFilters()).length, 3)
  assert.deepEqual(m.applyFilters(items, { ...m.emptyFilters(), assignee: 'Ada Lovelace' }).map((i) => i.ref), ['HDY-10'])
  assert.deepEqual(m.applyFilters(items, { ...m.emptyFilters(), label: 'mobile', type: 'bug' }).map((i) => i.ref), ['HDY-11'])
  assert.deepEqual(m.applyFilters(items, { ...m.emptyFilters(), statuses: ['blocked'] }).map((i) => i.ref), ['HDY-11'])
  assert.deepEqual(m.applyFilters(items, { ...m.emptyFilters(), query: 'LOGIN' }).map((i) => i.ref), ['HDY-11'])
  assert.deepEqual(m.applyFilters(items, { ...m.emptyFilters(), query: 'hdy-10' }).map((i) => i.ref), ['HDY-10'])
  assert.equal(m.filtersActive(m.emptyFilters()), false)
  assert.equal(m.filtersActive({ ...m.emptyFilters(), query: '  ' }), false)
  assert.equal(m.filtersActive({ ...m.emptyFilters(), type: 'bug' }), true)
  assert.equal(m.filtersActive({ ...m.emptyFilters(), statuses: ['blocked'] }), true)
})

test('searching a ref also finds every item that links to it', () => {
  const factsByRef = {
    'HDY-10': { blockedBy: [{ ref: 'HDY-1' }], blocks: [] },
    'HDY-11': { blockedBy: [], blocks: [{ ref: 'HDY-10' }] },
  }
  assert.deepEqual(m.applyFilters(items, { ...m.emptyFilters(), query: 'HDY-1' }, factsByRef).map((i) => i.ref), ['HDY-10', 'HDY-11', 'HDY-12'])
  assert.deepEqual(m.applyFilters(items, { ...m.emptyFilters(), query: 'HDY-10' }, factsByRef).map((i) => i.ref), ['HDY-10', 'HDY-11'])
})

// ---- views: what you see, saved -------------------------------------------------

test('All work is built in: everything, on the board, summary cards', () => {
  assert.equal(m.ALL_WORK, 'All work')
  assert.deepEqual(m.defaultDefinition(), { layout: 'board', filters: m.emptyFilters(), density: 'compact', fields: m.defaultFields() })
  assert.deepEqual(m.definitionOf(null), m.defaultDefinition())
})

test('a saved view round-trips; views saved before r6 still open', () => {
  const definition = { layout: 'list', density: 'detailed', fields: { ...m.defaultFields(), planning: true, labels: false },
    filters: { ...m.emptyFilters(), query: ' setup ', assignee: 'ada', type: 'bug', label: 'mobile', statuses: ['blocked'] } }
  const body = m.viewBody('Mine', definition, true)
  assert.deepEqual(body, { name: 'Mine', layout: 'table', shared: true, filters: {
    display: { density: 'detailed', fields: ['assignee', 'links', 'due', 'planning'] },
    query: 'setup', assignee: 'ada', types: ['bug'], labels: ['mobile'], status: ['blocked'] } })
  assert.ok(m.sameDefinition(m.definitionOf(body), definition))
  const old = m.definitionOf({ name: 'Old', layout: 'board', filters: { status: 'blocked' } })
  assert.deepEqual([old.layout, old.density, old.fields, old.filters.statuses], ['board', 'compact', m.defaultFields(), ['blocked']])
  assert.equal(m.sameDefinition(definition, { ...definition, density: 'compact' }), false, 'a card setting is a change')
})

test('views read as words, and new names never clash', () => {
  assert.equal(m.describeDefinition(m.defaultDefinition()), 'Board')
  assert.equal(m.describeDefinition({ ...m.defaultDefinition(), density: 'detailed' }), 'Board · All cards open')
  assert.equal(m.describeDefinition({ ...m.defaultDefinition(), layout: 'list', filters: { ...m.emptyFilters(), assignee: 'ada-lovelace', label: 'mobile' } }),
    'List · Assignee Ada Lovelace · Label mobile')
  assert.equal(m.freeName('Mine', ['Mine', 'Mine (2)']), 'Mine (3)')
  assert.equal(m.freeName('Fresh', ['Mine']), 'Fresh')
})
