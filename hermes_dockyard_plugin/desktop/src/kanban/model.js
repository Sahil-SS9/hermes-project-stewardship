// C2 Kanban: pure model. No React, no DOM, no network, no storage.
// Everything the board shows is derived here from real API data, so it can be
// unit-tested without a browser (kanban-model.test.mjs).
//
// Rules this file keeps:
// - A chip exists only if the data says so. Nothing is invented.
// - Blocked by / Blocks come only from the dependencies route (real links).
// - An objective appears only through the item's initiative, never directly.
// - `parent_task_id` is never read.

export const DONE_STATUSES = Object.freeze(['done', 'complete', 'completed'])
export const isDone = (status) => DONE_STATUSES.includes(status)

// The six stages: same keys, labels and status mapping as the board always had.
export const STAGES = Object.freeze([
  { key: 'backlog', label: 'Backlog', statuses: ['backlog'] },
  { key: 'active', label: 'In progress', statuses: ['in_progress', 'executing', 'active'] },
  { key: 'review', label: 'Review', statuses: ['in_review', 'review'] },
  { key: 'blocked', label: 'Blocked', statuses: ['blocked'] },
  { key: 'done', label: 'Done', statuses: DONE_STATUSES },
  { key: 'other', label: 'Other states', statuses: null },
])

// Which stage an item belongs to. Archived items belong to none.
export function stageKeyOf(item) {
  if (!item || item.status === 'archived') return null
  const stage = STAGES.find((candidate) => candidate.statuses?.includes(item.status))
  return stage ? stage.key : 'other'
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

// The status a card takes when it is dropped on, or moved into, a stage.
export const dropStatusOf = (stageKey) => STAGES.find((stage) => stage.key === stageKey)?.statuses?.[0] ?? null

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

// Overdue only when the due date has passed and the item is not done.
// `today` is an ISO date (YYYY-MM-DD) so tests never depend on the clock.
export function isOverdue(item, today) {
  const due = String(item?.due ?? '').slice(0, 10)
  if (!due || !today || isDone(item?.status)) return false
  return due < today
}

// ---- chips -------------------------------------------------------------------

export const CHIP_GROUPS = Object.freeze({ blocked_by: 'links', blocks: 'links', initiative: 'planning', milestone: 'planning', objective: 'planning' })
export const TAG_KEYS = Object.freeze(['links', 'planning', 'due', 'labels'])
export const TAG_LABELS = Object.freeze({ links: 'Links', planning: 'Planning', due: 'Due', labels: 'Labels' })
export const defaultTags = () => ({ links: true, planning: true, due: true, labels: true })

function linkChip(kind, card) {
  const word = kind === 'blocked_by' ? 'Blocked by' : 'Blocks'
  const done = isDone(card.status)
  const status = String(card.status || 'unknown').replaceAll('_', ' ')
  return {
    key: `${kind}:${card.ref}`,
    kind,
    group: 'links',
    ref: card.ref,
    // The type word is the linked item's own type. Done is written, not just coloured.
    text: `${word} · ${typeLabel(card.type)} · ${card.ref} ${card.title || ''}`.trim() + (done ? ' · Done' : ''),
    title: `${card.ref} — ${card.title || 'Untitled'} · ${typeLabel(card.type)} · ${status}`,
    done,
    target: { kind: 'item', ref: card.ref },
  }
}

// The objectives an initiative supports, from the roadmap read model.
export function objectivesOfInitiative(roadmapProject, initiativeRef) {
  const initiative = (roadmapProject?.initiatives ?? []).find((candidate) => candidate.ref === initiativeRef)
  return initiative ? { initiative, objectives: initiative.objectives ?? [] } : { initiative: null, objectives: [] }
}

// Chips for one item, in display order: links, then planning.
// `data` = { deps, initiatives, milestones, roadmapProject }; each may be missing.
export function chipsFor(item, data = {}) {
  if (!item) return []
  const chips = []
  const entry = data.deps?.[item.ref]
  for (const card of entry?.blocked_by ?? []) chips.push(linkChip('blocked_by', card))
  for (const card of entry?.blocks ?? []) chips.push(linkChip('blocks', card))

  if (item.initiative_ref) {
    const initiative = (data.initiatives ?? []).find((candidate) => candidate.ref === item.initiative_ref)
    chips.push({
      key: `initiative:${item.initiative_ref}`, kind: 'initiative', group: 'planning', ref: item.initiative_ref,
      text: `Initiative · ${item.initiative_ref}${initiative?.title ? ` ${initiative.title}` : ''}`,
      title: `${item.initiative_ref}${initiative?.title ? ` — ${initiative.title}` : ''}`,
      target: { kind: 'view', view: 'initiative' },
    })
  }
  for (const milestone of data.milestones ?? []) {
    if (milestone.archived_at) continue // archived milestones are skipped
    if (!(milestone.item_refs ?? []).includes(item.ref)) continue
    chips.push({
      key: `milestone:${milestone.id ?? milestone.name}`, kind: 'milestone', group: 'planning', ref: null,
      text: `Milestone · ${milestone.name}`, title: `${milestone.name}${milestone.due ? ` · due ${milestone.due}` : ''}`,
      target: { kind: 'view', view: 'milestones' },
    })
  }
  // Objective: only through the item's initiative. No initiative, no objective chip.
  if (item.initiative_ref) {
    const { initiative, objectives } = objectivesOfInitiative(data.roadmapProject, item.initiative_ref)
    for (const objective of objectives) {
      const via = initiative?.title || item.initiative_ref
      const relationship = objective.relationship ? ` · ${objective.relationship}` : ''
      chips.push({
        key: `objective:${objective.id}:${item.initiative_ref}`, kind: 'objective', group: 'planning', ref: null,
        text: `Objective · ${objective.name} · via ${via}${relationship}`,
        title: `${objective.name} — through initiative ${via}`,
        target: { kind: 'view', view: 'objectives' },
      })
    }
  }
  return chips
}

// Chips shown for the current Tags choices. Due and Labels are not chips.
export const visibleChips = (chips, tags) => chips.filter((chip) => tags?.[CHIP_GROUPS[chip.kind]] !== false)

// A card shows the first three chips; the rest sit behind "+n".
export const CHIP_LIMIT = 3
export function splitChips(chips, expanded) {
  if (expanded || chips.length <= CHIP_LIMIT) return { shown: chips, hidden: 0 }
  return { shown: chips.slice(0, CHIP_LIMIT), hidden: chips.length - CHIP_LIMIT }
}

// ---- filters -----------------------------------------------------------------

export const emptyFilters = () => ({ query: '', assignee: '', type: '', label: '' })
export const filtersActive = (filters) => Boolean(filters.query.trim() || filters.assignee || filters.type || filters.label)

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

// Search finds an item by its own ref or title, and also every item whose
// chips reference the searched ref (so searching HDY-1 finds what it blocks).
export function applyFilters(items, filters, chipsByRef = {}) {
  const query = filters.query.trim().toLowerCase()
  return (items ?? []).filter((item) => {
    if (filters.assignee && (item.assignee || '') !== filters.assignee) return false
    if (filters.type && (item.type || 'task') !== filters.type) return false
    if (filters.label && !(item.labels ?? []).includes(filters.label)) return false
    if (!query) return true
    if (String(item.ref).toLowerCase().includes(query) || String(item.title ?? '').toLowerCase().includes(query)) return true
    return (chipsByRef[item.ref] ?? []).some((chip) => chip.ref && String(chip.ref).toLowerCase().includes(query))
  })
}
