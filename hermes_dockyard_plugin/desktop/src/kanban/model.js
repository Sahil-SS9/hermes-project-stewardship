// C2 Kanban: pure model. No React, no DOM, no network, no storage.
// Everything the board shows is derived here from real API data, so it can be
// unit-tested without a browser (kanban-model.test.mjs).
//
// Rules this file keeps:
// - A signal or link exists only if the data says so. Nothing is invented.
// - Blocked by / Blocks come only from the dependencies route (real links).
// - An objective appears only through the item's initiative, never directly.
// - `parent_task_id` is never read.
//
// r6 design (Sahil's C2 review, 04/10/2026): five columns and no catch-all,
// a compact card with an expanded form, moves limited to what Hermes accepts,
// and views that save what you see (filters, layout and card settings).

export const DONE_STATUSES = Object.freeze(['done', 'complete', 'completed'])
export const isDone = (status) => DONE_STATUSES.includes(status)

// Five columns. Every Hermes status reaches one of them through the backend
// (persistence/canonical_work_service.py _CANONICAL_STATUS): Backlog = triage
// or todo, In progress = ready, scheduled or running, Review = review,
// Blocked = blocked, Done = done. There is no catch-all column: an item whose
// status no column lists is named in a notice above the board instead.
export const STAGES = Object.freeze([
  { key: 'backlog', label: 'Backlog', statuses: ['backlog'], hint: 'Not started' },
  { key: 'active', label: 'In progress', statuses: ['in_progress', 'executing', 'active'], hint: 'Being worked on' },
  { key: 'review', label: 'Review', statuses: ['in_review', 'review'], hint: 'Waiting for a check' },
  { key: 'blocked', label: 'Blocked', statuses: ['blocked'], hint: 'Stopped until something changes' },
  { key: 'done', label: 'Done', statuses: DONE_STATUSES, hint: 'Finished' },
])
const STAGE_BY_KEY = Object.fromEntries(STAGES.map((stage) => [stage.key, stage]))
export const stageLabel = (key) => STAGE_BY_KEY[key]?.label ?? key

// Which column an item belongs to: null when archived or when no column lists its status.
export function stageKeyOf(item) {
  if (!item || item.status === 'archived') return null
  return STAGES.find((candidate) => candidate.statuses.includes(item.status))?.key ?? null
}

// { backlog: [...], active: [...], ... } in the original item order.
export function groupByStage(items) {
  const groups = Object.fromEntries(STAGES.map((stage) => [stage.key, []]))
  for (const item of items ?? []) {
    const key = stageKeyOf(item)
    if (key) groups[key].push(item)
  }
  return groups
}

// Items no column can show (never archived ones). Named in a notice, never hidden.
export const unplacedItems = (items) => (items ?? []).filter((item) => item && item.status !== 'archived' && !stageKeyOf(item))

// The status a card takes when it is dropped on, or moved into, a column.
export const dropStatusOf = (stageKey) => STAGE_BY_KEY[stageKey]?.statuses[0] ?? null

// ---- moves ---------------------------------------------------------------------
// The moves real Hermes accepts, measured on 04/10/2026 against upstream
// 8c098e9e81 and KenseiAgent 67751cd9f23 with the plugin's own services
// (evidence/c/C2/other-states-probe/move-matrix-*.out). Hermes refuses every
// other move, or (for epics) accepts it without the card landing in that column.
// Known limit: the allowed moves depend on the host, so the backend should send
// them with each item. Until it does, this measured table is the source; a move
// the host refuses anyway is reported as an error, never as a success.
const TASK_MOVES = Object.freeze({ backlog: ['active', 'done'], active: ['review', 'blocked', 'done'], review: ['done'], blocked: ['active', 'done'], done: [] })
const EPIC_MOVES = Object.freeze({ backlog: ['active'], active: [], review: [], blocked: [], done: [] })

// { targets: [{ key, label, status }], reason } for one card. `openBlockers` is
// the number of Blocked by items that are not done: Hermes parks a task with
// open blockers in Backlog until they finish, and refuses to close it.
export function movesFor(item, openBlockers = 0) {
  const from = stageKeyOf(item)
  if (!from) return { targets: [], reason: 'This item is not in a board column.' }
  const epic = (item.type || 'task') === 'epic'
  let keys = (epic ? EPIC_MOVES : TASK_MOVES)[from] ?? []
  let reason = null
  if (!epic && from === 'backlog' && openBlockers > 0) {
    keys = []
    reason = `Can't start yet: waiting on ${openBlockers} open ${openBlockers === 1 ? 'blocker' : 'blockers'}.`
  } else if (keys.length === 0) {
    reason = from === 'done' ? 'Finished work stays in Done.' : epic ? 'Hermes does not move an epic from this column.' : null
  }
  return { targets: keys.map((key) => ({ key, label: STAGE_BY_KEY[key].label, status: dropStatusOf(key) })), reason }
}

export const typeLabel = (type) => {
  const value = String(type || 'task')
  return value.charAt(0).toUpperCase() + value.slice(1)
}

// Initials from a real name. "Ada Lovelace" -> "AL", "worker" -> "W", "" -> "".
export function initialsOf(name) {
  const words = String(name ?? '').trim().split(/[\s._-]+/).filter(Boolean)
  if (words.length === 0) return ''
  const first = words[0][0]
  const last = words.length > 1 ? words[words.length - 1][0] : ''
  return (first + last).toUpperCase()
}

// "ada-lovelace" -> "Ada Lovelace". Profile ids read as names on the card.
export const displayName = (name) => String(name ?? '').trim().split(/[\s._-]+/).filter(Boolean)
  .map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')

// Overdue only when the due date has passed and the item is not done.
// `today` is an ISO date (YYYY-MM-DD) so tests never depend on the clock.
export function isOverdue(item, today) {
  const due = String(item?.due ?? '').slice(0, 10)
  if (!due || !today || isDone(item?.status)) return false
  return due < today
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
// "2099-06-30" -> "30 Jun 2099"; the year is dropped when it is this year.
export function shortDate(iso, today) {
  const [year, month, day] = String(iso ?? '').slice(0, 10).split('-').map(Number)
  if (!year || !month || !day) return String(iso ?? '')
  const text = `${day} ${MONTHS[month - 1]}`
  return today && String(today).slice(0, 4) === String(year) ? text : `${text} ${year}`
}

// ---- links and planning ------------------------------------------------------

// The objectives an initiative supports, from the roadmap read model.
export function objectivesOfInitiative(roadmapProject, initiativeRef) {
  const initiative = (roadmapProject?.initiatives ?? []).find((candidate) => candidate.ref === initiativeRef)
  return initiative ? { initiative, objectives: initiative.objectives ?? [] } : { initiative: null, objectives: [] }
}

// Everything one card can show, from real data only.
// `data` = { deps, initiatives, milestones, roadmapProject }; each may be missing.
export function cardFacts(item, data = {}, today = null) {
  const entry = data.deps?.[item.ref] ?? {}
  const link = (card) => ({ ref: card.ref, title: card.title || '', type: card.type || 'task', status: card.status || 'unknown', done: isDone(card.status) })
  const blockedBy = (entry.blocked_by ?? []).map(link)
  const blocks = (entry.blocks ?? []).map(link)
  const initiative = item.initiative_ref
    ? { ref: item.initiative_ref, title: (data.initiatives ?? []).find((candidate) => candidate.ref === item.initiative_ref)?.title ?? '' }
    : null
  const milestones = (data.milestones ?? [])
    .filter((milestone) => !milestone.archived_at && (milestone.item_refs ?? []).includes(item.ref))
    // The id lets the card's link open this milestone on the Vision screen.
    .map((milestone) => ({ id: milestone.id, name: milestone.name, due: milestone.due ?? null }))
  // Objective: only through the item's initiative. No initiative, no objective.
  const objectives = item.initiative_ref
    ? objectivesOfInitiative(data.roadmapProject, item.initiative_ref).objectives.map((objective) => ({ id: objective.id, name: objective.name, relationship: objective.relationship ?? null }))
    : []
  const due = item.due ? String(item.due).slice(0, 10) : null
  return {
    blockedBy, blocks,
    openBlockers: blockedBy.filter((card) => !card.done).length,
    openBlocks: blocks.filter((card) => !card.done).length,
    initiative, milestones, objectives,
    due, overdue: isOverdue(item, today),
    labels: item.labels ?? [],
  }
}

// ---- card settings (part of a view) --------------------------------------------

export const CARD_FIELDS = Object.freeze(['assignee', 'links', 'due', 'labels', 'planning'])
export const CARD_FIELD_LABELS = Object.freeze({
  assignee: 'Assignee', links: 'Blocked by and Blocks', due: 'Due date', labels: 'Labels', planning: 'Initiative and milestone',
})
export const defaultFields = () => ({ assignee: true, links: true, due: true, labels: true, planning: false })
export const DENSITIES = Object.freeze(['compact', 'detailed'])
export const LABEL_LIMIT = 2

// The one-line signals on a compact card, in reading order. Only what applies.
export function cardSignals(facts, fields, today) {
  const out = []
  if (fields.links && facts.openBlockers > 0) out.push({ kind: 'blocked_by', icon: 'hand', text: `Blocked by ${facts.openBlockers}` })
  if (fields.links && facts.openBlocks > 0) out.push({ kind: 'blocks', icon: 'link', text: `Blocks ${facts.openBlocks}` })
  if (fields.due && facts.due) {
    out.push(facts.overdue
      ? { kind: 'overdue', icon: 'clock-3', text: `Overdue · ${shortDate(facts.due, today)}` }
      : { kind: 'due', icon: 'calendar', text: `Due ${shortDate(facts.due, today)}` })
  }
  return out
}

// ---- filters ---------------------------------------------------------------------

export const emptyFilters = () => ({ query: '', assignee: '', type: '', label: '', statuses: [] })
export const filtersActive = (filters) => Boolean(filters.query.trim() || filters.assignee || filters.type || filters.label || filters.statuses.length)

// Values that exist in this project, sorted, for the dropdowns.
export function filterOptions(items) {
  const live = (items ?? []).filter((item) => item.status !== 'archived')
  const uniq = (values) => [...new Set(values.filter(Boolean))].sort((a, b) => String(a).localeCompare(String(b)))
  return {
    assignees: uniq(live.map((item) => item.assignee)),
    types: uniq(live.map((item) => item.type || 'task')),
    labels: uniq(live.flatMap((item) => item.labels ?? [])),
  }
}

// Search finds an item by its own ref or title, and also every item that links
// to the searched ref (so searching a ref finds what it blocks).
export function applyFilters(items, filters, factsByRef = {}) {
  const query = filters.query.trim().toLowerCase()
  return (items ?? []).filter((item) => {
    if (filters.assignee && (item.assignee || '') !== filters.assignee) return false
    if (filters.type && (item.type || 'task') !== filters.type) return false
    if (filters.label && !(item.labels ?? []).includes(filters.label)) return false
    if (filters.statuses.length && !filters.statuses.includes(item.status)) return false
    if (!query) return true
    if (String(item.ref).toLowerCase().includes(query) || String(item.title ?? '').toLowerCase().includes(query)) return true
    const facts = factsByRef[item.ref]
    return [...(facts?.blockedBy ?? []), ...(facts?.blocks ?? [])].some((card) => String(card.ref).toLowerCase().includes(query))
  })
}

// ---- views -----------------------------------------------------------------------
// A view is what you are looking at: layout, filters and card settings.
// "All work" is built in: everything, on the board, compact cards.

export const ALL_WORK = 'All work'
export const defaultDefinition = () => ({ layout: 'board', filters: emptyFilters(), density: 'compact', fields: defaultFields() })

const sortedFields = (fields) => CARD_FIELDS.filter((key) => fields[key])
export const sameDefinition = (a, b) => JSON.stringify(canonical(a)) === JSON.stringify(canonical(b))
function canonical(definition) {
  const filters = definition.filters
  return {
    layout: definition.layout, density: definition.density, fields: sortedFields(definition.fields),
    filters: { query: filters.query.trim(), assignee: filters.assignee, type: filters.type, label: filters.label, statuses: [...filters.statuses].sort() },
  }
}

// Backend saved view -> definition. Missing parts fall back to the defaults, so
// views saved before r6 (layout + one status) still open.
export function definitionOf(view) {
  if (!view) return defaultDefinition()
  const stored = view.filters ?? {}
  const display = stored.display ?? {}
  const fields = Array.isArray(display.fields)
    ? Object.fromEntries(CARD_FIELDS.map((key) => [key, display.fields.includes(key)]))
    : defaultFields()
  return {
    layout: view.layout === 'table' ? 'list' : 'board',
    density: DENSITIES.includes(display.density) ? display.density : 'compact',
    fields,
    filters: {
      query: typeof stored.query === 'string' ? stored.query : '',
      assignee: stored.assignee ?? '',
      type: (stored.types ?? [])[0] ?? '',
      label: (stored.labels ?? [])[0] ?? '',
      statuses: Array.isArray(stored.status) ? stored.status : typeof stored.status === 'string' ? [stored.status] : [],
    },
  }
}

// Definition -> the body of PUT /projects/{id}/views.
export function viewBody(name, definition, shared = false) {
  const { filters } = definition
  const stored = { display: { density: definition.density, fields: sortedFields(definition.fields) } }
  if (filters.query.trim()) stored.query = filters.query.trim()
  if (filters.assignee) stored.assignee = filters.assignee
  if (filters.type) stored.types = [filters.type]
  if (filters.label) stored.labels = [filters.label]
  if (filters.statuses.length) stored.status = [...filters.statuses]
  return { name, layout: definition.layout === 'list' ? 'table' : 'board', filters: stored, shared: Boolean(shared) }
}

// "Search "x" · Assignee ada-lovelace · Label mobile", or "" when nothing filters.
export function describeFilters(filters) {
  const parts = []
  if (filters.query.trim()) parts.push(`Search "${filters.query.trim()}"`)
  if (filters.assignee) parts.push(`Assignee ${displayName(filters.assignee)}`)
  if (filters.type) parts.push(`Type ${typeLabel(filters.type)}`)
  if (filters.label) parts.push(`Label ${filters.label}`)
  if (filters.statuses.length) parts.push(`Status ${filters.statuses.map((status) => status.replaceAll('_', ' ')).join(', ')}`)
  return parts.join(' · ')
}

// "Board · Assignee Ada Lovelace · Label mobile" for the views panel; "All cards open" when they are.
export function describeDefinition(definition) {
  const parts = [definition.layout === 'list' ? 'List' : 'Board']
  const filters = describeFilters(definition.filters)
  if (filters) parts.push(filters)
  if (definition.layout !== 'list' && definition.density === 'detailed') parts.push('All cards open')
  return parts.join(' · ')
}

// A free name for "Save as new view" and "Duplicate": "Mine", "Mine (2)", ...
export function freeName(base, taken) {
  const names = new Set(taken)
  if (!names.has(base)) return base
  for (let n = 2; ; n++) if (!names.has(`${base} (${n})`)) return `${base} (${n})`
}
