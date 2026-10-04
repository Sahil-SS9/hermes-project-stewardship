// GENERATED-STRUCTURE: hand-edited Desktop module. Edit this file, then run
// node hermes_dockyard_plugin/desktop/build.mjs to regenerate plugin.js.
// C2 Kanban screen: Board | List | Milestones, a filter row, a Tags menu,
// collapsible columns, and reference chips. Every fact shown comes from the
// real API (work items, milestones, initiatives, the dependencies route and
// the roadmap read model). Nothing is stored in the browser: collapsed
// columns, Tags choices, filters and the Board/List choice reset on reload.
import { useEffect } from '../runtime/react.js'
import { useRef } from '../runtime/react.js'
import { useState } from '../runtime/react.js'
import { jsx } from '../runtime/react.js'
import { jsxs } from '../runtime/react.js'
import { Icon } from '../lib/ui.js'
import { number } from '../lib/ui.js'
import { plural } from '../lib/ui.js'
import { api } from '../runtime/context.js'
import { emitToast } from '../runtime/context.js'
import { readableLabel } from '../data/loaders.js'
import { PlanningPanel } from '../project/workflows.js'
import { SavedViewsSection } from '../project/saved-views.js'
import { WorkTable, SAVED_VIEW_COLUMNS } from './table.js'
import {
  STAGES, TAG_KEYS, TAG_LABELS, defaultTags, emptyFilters, filtersActive, filterOptions, applyFilters,
  groupByStage, dropStatusOf, chipsFor, visibleChips, splitChips, initialsOf, isOverdue, typeLabel,
} from './model.js'

const SUB_TABS = [['board', 'Board'], ['list', 'List'], ['milestones', 'Milestones']]
const todayIso = () => new Date().toISOString().slice(0, 10)

function Avatar({ name }) {
  const initials = initialsOf(name)
  return jsxs('span', { className: 'dy-kb-who', children: [
    jsx('span', { className: initials ? 'dy-kb-avatar' : 'dy-kb-avatar empty', 'aria-hidden': true, children: initials }),
    jsx('span', { children: name || 'Unassigned' }),
  ]})
}

// One reference chip. A chip is a button only when it can go somewhere.
function Chip({ chip, onGo }) {
  const common = { className: 'dy-kb-chip', 'data-kind': chip.kind, 'data-chip': chip.key, title: chip.title, 'data-done': chip.done ? 'true' : undefined }
  return chip.target
    ? jsx('button', { type: 'button', ...common, onClick: () => onGo(chip), children: jsx('span', { children: chip.text }) })
    : jsx('span', { ...common, children: jsx('span', { children: chip.text }) })
}

function Chips({ item, chips, tags, expanded, onToggle, onGo, today }) {
  const { shown, hidden } = splitChips(visibleChips(chips, tags), expanded)
  const labels = tags.labels ? (item.labels ?? []) : []
  const showDue = tags.due && item.due
  if (shown.length === 0 && hidden === 0 && labels.length === 0 && !showDue) return null
  const overdue = isOverdue(item, today)
  return jsxs('div', { className: 'dy-kb-chips', 'data-card-chips': item.ref, children: [
    ...shown.map((chip) => jsx(Chip, { chip, onGo }, chip.key)),
    hidden > 0 || (expanded && visibleChips(chips, tags).length > 3)
      ? jsx('button', { type: 'button', className: 'dy-kb-chip dy-kb-more', 'data-chips-toggle': item.ref, 'aria-expanded': Boolean(expanded),
          'aria-label': expanded ? 'Show fewer references' : `Show ${hidden} more ${plural(hidden, 'reference')}`,
          onClick: () => onToggle(item.ref), children: jsx('span', { children: expanded ? 'Show less' : `+${hidden}` }) })
      : null,
    showDue ? jsx('span', { className: 'dy-kb-chip', 'data-chip-due': item.ref, 'data-overdue': overdue ? 'true' : undefined, children: jsx('span', { children: `Due ${String(item.due).slice(0, 10)}${overdue ? ' · Overdue' : ''}` }) }) : null,
    ...labels.map((label) => jsx('span', { className: 'dy-kb-chip', 'data-chip-label': label, children: jsx('span', { children: label }) }, `label:${label}`)),
  ]})
}

export function KanbanScreen({ project, view, onRefresh, setWorkNotice, onOpenItem, onNavigate, appliedView, setAppliedView }) {
  const [tab, setTab] = useState('board')
  const [filters, setFilters] = useState(emptyFilters())
  const [tags, setTags] = useState(defaultTags())
  const [tagsOpen, setTagsOpen] = useState(false)
  const [collapsed, setCollapsed] = useState({})
  const [expandedChips, setExpandedChips] = useState({})
  const [draggedRef, setDraggedRef] = useState(null)
  const [moving, setMoving] = useState(false)
  const [deps, setDeps] = useState({ status: 'loading', data: null })
  const [roadmap, setRoadmap] = useState({ status: 'loading', data: null })
  const moveLock = useRef(false)
  const boardRef = useRef(null)
  const focusAfter = useRef(null)
  const tagsRef = useRef(null)
  const encoded = encodeURIComponent(project.id)
  const today = todayIso()

  // Two loads when this screen opens: the dependencies route and the roadmap
  // read model. Either may fail without breaking the board: a visible note
  // says so and the chips that need it are not shown (never silently empty).
  useEffect(() => {
    let live = true
    api(`/projects/${encoded}/work-dependencies`)
      .then((result) => { if (live) setDeps({ status: 'ok', data: result?.dependencies ?? {} }) })
      .catch(() => { if (live) setDeps({ status: 'error', data: null }) })
    return () => { live = false }
  }, [project.id, view.workItems])
  useEffect(() => {
    let live = true
    api(`/roadmap?project_id=${encoded}`)
      .then((result) => { if (live) setRoadmap({ status: 'ok', data: (result?.projects ?? [])[0] ?? null }) })
      .catch(() => { if (live) setRoadmap({ status: 'error', data: null }) })
    return () => { live = false }
  }, [project.id, view.initiatives])

  // Tags menu: Escape and an outside click close it.
  useEffect(() => {
    if (!tagsOpen) return undefined
    const onKey = (event) => { if (event.key === 'Escape') { setTagsOpen(false); tagsRef.current?.querySelector('[data-kanban-tags]')?.focus() } }
    const onDown = (event) => { if (tagsRef.current && !tagsRef.current.contains(event.target)) setTagsOpen(false) }
    document.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onDown)
    return () => { document.removeEventListener('keydown', onKey); document.removeEventListener('mousedown', onDown) }
  }, [tagsOpen])

  // Focus follows a collapse (to the strip) or an expand (to the header button).
  useEffect(() => {
    const target = focusAfter.current
    if (!target) return
    focusAfter.current = null
    boardRef.current?.querySelector(`[data-board-${target.to}="${target.key}"]`)?.focus()
  }, [collapsed])

  const allItems = view.workItems ?? []
  const baseItems = appliedView ? (appliedView.items ?? []) : allItems
  const chipData = { deps: deps.data ?? {}, initiatives: view.initiatives ?? [], milestones: view.milestones ?? [], roadmapProject: roadmap.data }
  const chipsByRef = Object.fromEntries(baseItems.map((item) => [item.ref, chipsFor(item, chipData)]))
  const items = applyFilters(baseItems, filters, chipsByRef)
  const options = filterOptions(baseItems)
  const layout = appliedView?.layout ?? 'board'
  const liveCount = items.filter((item) => item.status !== 'archived').length

  const transitionStatus = async (ref, status) => {
    if (!project || !ref || !status || moveLock.current || !allItems.some((item) => item.ref === ref)) return
    moveLock.current = true
    setMoving(true)
    setDraggedRef(null)
    setWorkNotice(null)
    try {
      // The plugin proxy supplies configured DOCKYARD_ACTOR_ID attribution.
      await api(`/projects/${encoded}/work-items/${encodeURIComponent(ref)}/transition`, { method: 'POST', body: { status } })
      const readback = await api(`/projects/${encoded}/work-items`)
      if (!(readback.work_items ?? []).some((item) => item.ref === ref && item.status === status)) throw new Error('Canonical readback did not confirm the requested status')
      if (appliedView) {
        const result = await api(`/projects/${encoded}/views/${encodeURIComponent(appliedView.name)}/items`)
        setAppliedView((current) => current?.name === appliedView.name ? { ...current, items: result.items ?? [] } : current)
      }
      onRefresh?.()
      emitToast('success', `Work item moved to ${status.replaceAll('_', ' ')}.`)
    } catch (failure) {
      setWorkNotice(`Could not complete move or refresh: ${String(failure?.message ?? failure)}. Refresh to confirm the canonical state before retrying.`)
      onRefresh?.()
    } finally {
      moveLock.current = false
      setMoving(false)
    }
  }

  const toggleColumn = (key) => {
    const willCollapse = !collapsed[key]
    focusAfter.current = { key, to: willCollapse ? 'strip' : 'collapse' }
    setCollapsed((current) => ({ ...current, [key]: willCollapse }))
  }
  const toggleChips = (ref) => setExpandedChips((current) => ({ ...current, [ref]: !current[ref] }))
  const openRef = (ref) => {
    const target = allItems.find((item) => item.ref === ref)
    if (target) onOpenItem(target)
    else setWorkNotice(`Work item ${ref} is not in this project's board data.`)
  }
  const go = (chip) => {
    if (chip.target.kind === 'item') openRef(chip.target.ref)
    else if (chip.target.view === 'milestones') setTab('milestones')
    else onNavigate(chip.target.view)
  }
  const clearFilters = () => setFilters(emptyFilters())

  const moveSelect = (item) => jsxs('select', { 'aria-label': `Move ${item.ref}`, disabled: moving, value: '', onChange: (event) => transitionStatus(item.ref, event.target.value), children: [
    jsx('option', { value: '', children: 'Move to…' }),
    ...STAGES.filter((stage) => stage.statuses).map((stage) => jsx('option', { value: stage.statuses[0], children: stage.label }, stage.key)),
  ]})

  const card = (item) => jsxs('article', { className: 'dockyard-work-card', draggable: !moving, 'data-work-card': item.ref,
    onDragStart: (event) => { event.dataTransfer.setData('text/plain', item.ref); setDraggedRef({ ref: item.ref, project: project.id }) },
    onDragEnd: () => setDraggedRef(null), children: [
    // The first button on a card opens its details (relied on by existing tests).
    jsxs('div', { className: 'dy-kb-actions', children: [
      jsx('button', { type: 'button', className: 'dockyard-button small', onClick: () => onOpenItem(item), children: 'Open details' }),
      moveSelect(item),
    ]}),
    jsxs('div', { className: 'dy-kb-keyrow', children: [
      jsx('span', { className: 'dy-kb-key', children: item.ref }),
      jsx('span', { className: 'dockyard-work-type', children: item.type || 'task' }),
    ]}),
    jsx('h4', { children: item.title }),
    jsx(Avatar, { name: item.assignee }),
    jsx(Chips, { item, chips: chipsByRef[item.ref] ?? [], tags, expanded: Boolean(expandedChips[item.ref]), onToggle: toggleChips, onGo: go, today }),
  ]}, item.ref)

  const grouped = groupByStage(items)
  const column = (stage) => {
    const stageItems = grouped[stage.key]
    const isCollapsed = Boolean(collapsed[stage.key])
    const droppable = Boolean(stage.statuses) && draggedRef?.project === project.id && !moving
    return jsxs('section', { className: 'dockyard-board-column', 'data-board-column': stage.key, 'data-collapsed': isCollapsed ? 'true' : 'false',
      'data-drop-ready': isCollapsed && droppable ? 'true' : undefined,
      onDragOver: (event) => { if (droppable) event.preventDefault() },
      onDrop: (event) => { event.preventDefault(); const status = dropStatusOf(stage.key); if (draggedRef?.project === project.id && status) transitionStatus(draggedRef.ref, status); setDraggedRef(null) },
      children: isCollapsed
        ? [jsxs('button', { type: 'button', className: 'dy-kb-strip', 'data-board-strip': stage.key, 'aria-expanded': false,
            'aria-label': `Expand ${stage.label}, ${number(stageItems.length)} ${plural(stageItems.length, 'item')}`, onClick: () => toggleColumn(stage.key), children: [
            jsx('span', { className: 'dy-kb-strip-count', children: number(stageItems.length) }),
            jsx('span', { className: 'dy-kb-strip-label', children: stage.label }),
          ]}, 'strip')]
        : [
            jsxs('header', { children: [
              jsx('button', { type: 'button', className: 'dy-kb-collapse', 'data-board-collapse': stage.key, 'aria-expanded': true, 'aria-label': `Collapse ${stage.label}`, onClick: () => toggleColumn(stage.key), children: jsx(Icon, { name: 'chevrons-left' }) }),
              jsx('h3', { children: stage.label }),
              jsx('span', { children: number(stageItems.length) }),
            ]}, 'header'),
            jsx('div', { className: 'dockyard-board-cards', children: stageItems.length > 0 ? stageItems.map(card) : jsx('p', { className: 'dockyard-meta', children: 'No work in this stage.' }) }, 'cards'),
          ],
    }, stage.key)
  }

  const toolbar = jsxs('div', { className: 'dy-kb-toolbar', 'data-kanban-toolbar': true, children: [
    jsxs('label', { className: 'dy-kb-control dy-kb-search', children: [
      jsx(Icon, { name: 'search' }),
      jsx('input', { type: 'search', 'aria-label': 'Search work items', placeholder: 'Search ref or title', value: filters.query, onChange: (event) => setFilters({ ...filters, query: event.target.value }) }),
    ]}),
    ...[['assignee', 'Filter by assignee', 'All assignees', options.assignees], ['type', 'Filter by type', 'All types', options.types], ['label', 'Filter by label', 'All labels', options.labels]].map(([key, label, all, values]) =>
      jsx('label', { className: 'dy-kb-control', children: jsxs('select', { 'aria-label': label, 'data-kanban-filter': key, value: filters[key], onChange: (event) => setFilters({ ...filters, [key]: event.target.value }), children: [
        jsx('option', { value: '', children: all }),
        ...values.map((value) => jsx('option', { value, children: key === 'type' ? typeLabel(value) : value }, value)),
      ]}) }, key)),
    jsxs('div', { className: 'dy-kb-tags', ref: tagsRef, children: [
      jsx('button', { type: 'button', className: 'dy-kb-control dy-kb-button', 'data-kanban-tags': true, 'aria-expanded': tagsOpen, 'aria-haspopup': 'true', onClick: () => setTagsOpen(!tagsOpen), children: 'Tags' }),
      tagsOpen ? jsx('div', { className: 'dy-kb-tags-panel', role: 'group', 'aria-label': 'Show on cards', children:
        TAG_KEYS.map((key) => jsxs('label', { children: [
          jsx('input', { type: 'checkbox', 'data-kanban-tag': key, checked: tags[key], onChange: () => setTags({ ...tags, [key]: !tags[key] }) }),
          jsx('span', { children: TAG_LABELS[key] }),
        ]}, key)) }) : null,
    ]}),
    jsx('button', { type: 'button', className: 'dy-kb-control dy-kb-button', 'data-kanban-clear': true, disabled: !filtersActive(filters), onClick: clearFilters, children: 'Clear filters' }),
    jsx('span', { className: 'dy-kb-count', 'data-kanban-count': true, role: 'status', children: `${number(liveCount)} ${plural(liveCount, 'item')}` }),
  ]})

  const notes = [
    deps.status === 'error' ? jsx('p', { className: 'dy-kb-note', 'data-kanban-note': 'dependencies', role: 'status', children: 'Dependencies unavailable. Blocked by and Blocks are not shown.' }, 'deps') : null,
    roadmap.status === 'error' ? jsx('p', { className: 'dy-kb-note', 'data-kanban-note': 'objectives', role: 'status', children: 'Objectives unavailable. Objective chips are not shown.' }, 'roadmap') : null,
  ]

  const noMatch = baseItems.length > 0 && liveCount === 0 && filtersActive(filters)
  const empty = (noMatch
    ? jsxs('p', { className: 'dy-kb-empty', 'data-kanban-empty': 'filters', children: ['No work matches these filters. ', jsx('button', { type: 'button', className: 'dockyard-button small', onClick: clearFilters, children: 'Clear filters' })] })
    : baseItems.length === 0 && !appliedView
      ? jsx('p', { className: 'dy-kb-empty', 'data-kanban-empty': 'none', children: 'This project has no work items yet. Add work from the Backlog tab.' })
      : null)

  const board = jsxs('div', { className: 'dockyard-board', ref: boardRef, tabIndex: 0, role: 'region', 'aria-label': 'Kanban board', 'data-kanban-board': true, children: STAGES.map(column) })

  const stageLabel = Object.fromEntries(STAGES.map((stage) => [stage.key, stage.label]))
  const chipCell = (item, kinds) => jsx('div', { className: 'dy-kb-cell-chips', children:
    (chipsByRef[item.ref] ?? []).filter((chip) => kinds.includes(chip.kind)).map((chip) => jsx(Chip, { chip: { ...chip, text: chip.text.replace(/^[^·]*· /, '') }, onGo: go }, chip.key)) })
  const listColumns = [
    { key: 'ref', heading: 'Ref', cell: (item) => item.ref },
    { key: 'title', heading: 'Title', cell: (item) => item.title },
    { key: 'type', heading: 'Type', cell: (item) => item.type || 'task' },
    { key: 'status', heading: 'State', cell: (item) => readableLabel(item.status || 'unknown', 'unknown') },
    { key: 'assignee', heading: 'Assignee', cell: (item) => item.assignee || 'Unassigned' },
    { key: 'blocked_by', heading: 'Blocked by', cell: (item) => chipCell(item, ['blocked_by']) },
    { key: 'blocks', heading: 'Blocks', cell: (item) => chipCell(item, ['blocks']) },
    { key: 'initiative', heading: 'Initiative', cell: (item) => chipCell(item, ['initiative']) },
    { key: 'milestone', heading: 'Milestone', cell: (item) => chipCell(item, ['milestone']) },
    { key: 'objective', heading: 'Objective', cell: (item) => chipCell(item, ['objective']) },
    { key: 'due', heading: 'Due', cell: (item) => item.due ? `${String(item.due).slice(0, 10)}${isOverdue(item, today) ? ' · Overdue' : ''}` : '' },
    { key: 'move', heading: 'Move', cell: (item) => moveSelect(item) },
  ]
  const list = jsx('div', { className: 'dy-kb-list', children: jsx(WorkTable, { columns: listColumns, className: 'dy-kb-table',
    groups: STAGES.map((stage) => ({ key: stage.key, label: stageLabel[stage.key], items: grouped[stage.key] })).filter((group) => group.items.length > 0),
    emptyText: 'No work items to list.' }) })

  const appliedNote = appliedView ? jsxs('div', { className: 'dockyard-view-only-note', 'data-applied-view-note': appliedView.name, children: [
    jsx(Icon, { name: 'eye' }),
    jsx('span', { children: `Showing saved view "${appliedView.name}" (${readableLabel(layout, 'Board')} layout${layout === 'timeline' ? ' — timeline is not available on Desktop, showing board' : ''}). ${number(baseItems.length)} matching ${plural(baseItems.length, 'item')}.` }),
    jsx('button', { type: 'button', className: 'dockyard-button small', 'data-action': 'clear-applied-view', onClick: () => setAppliedView(null), children: 'Clear view' }),
  ]}) : jsxs('div', { className: 'dockyard-view-only-note', 'data-kanban-help': true, children: [
    jsx(Icon, { name: 'eye' }),
    jsx('span', { children: 'Drag an item to move it, or use its Move menu. The canonical work system validates every transition.' }),
  ]})

  // A saved view's own layout wins while it is applied; the tab switch is hidden.
  const savedTable = jsxs('section', { className: 'dockyard-feature-card', children: [
    jsx('h2', { children: 'Work items' }),
    jsx(WorkTable, { columns: SAVED_VIEW_COLUMNS, items: baseItems }),
  ]})
  const savedViews = jsx(SavedViewsSection, {
    project, views: view.views ?? [], onApply: setAppliedView, onClear: () => setAppliedView(null), appliedName: appliedView?.name ?? null, onRefresh,
  }, `${project.id}:saved-views`)

  let body
  if (appliedView && layout === 'table') body = [savedTable]
  else if (tab === 'milestones' && !appliedView) body = [jsx(PlanningPanel, { project, milestones: view.milestones ?? [], workItems: allItems, onRefresh })]
  else body = [toolbar, ...notes, empty, tab === 'list' && !appliedView ? list : board]

  return jsxs('div', { className: 'dockyard-board-wrap', 'data-kanban-screen': true, 'data-applied-view': appliedView?.name ?? undefined, children: [
    appliedView ? null : jsx('nav', { className: 'dy-kb-subtabs', 'aria-label': 'Kanban views', children:
      SUB_TABS.map(([key, label]) => jsx('button', { type: 'button', className: 'dy-kb-subtab', 'data-kanban-tab': key, 'aria-pressed': tab === key, onClick: () => setTab(key), children: label }, key)) }),
    appliedNote,
    ...body,
    tab === 'milestones' && !appliedView ? null : savedViews,
  ]})
}
