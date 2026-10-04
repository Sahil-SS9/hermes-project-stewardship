// GENERATED-STRUCTURE: hand-edited Desktop module. Edit this file, then run
// node hermes_dockyard_plugin/desktop/build.mjs to regenerate plugin.js.
// C2 Kanban screen. PROTOTYPE r6 (04/10/2026), built for Sahil's review:
// - Cards show a summary by default. Click one to expand it in place (several
//   can be open). Actions (Move, Open full details) live in the expanded card.
// - A view is what you see: filters, layout and card settings. Change any of
//   them and the view shows unsaved changes, with Save, Save as new view and
//   Reset. Views sit in a bar above the board; the Manage views side panel
//   renames, duplicates, shares and deletes them and sets what cards show.
// - Five columns, no catch-all. Move offers only the moves Hermes accepts.
// Every fact shown comes from the real API. Nothing is stored in the browser:
// unsaved view changes and opened cards reset on reload. Saved views live in
// the backend.
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
import { WorkTable } from './table.js'
import {
  STAGES, stageKeyOf, stageLabel, groupByStage, unplacedItems, dropStatusOf, movesFor, typeLabel, initialsOf,
  displayName, shortDate, cardFacts, cardSignals, CARD_FIELDS, CARD_FIELD_LABELS, LABEL_LIMIT, emptyFilters,
  filtersActive, filterOptions, applyFilters, ALL_WORK, defaultDefinition, definitionOf, viewBody,
  sameDefinition, describeDefinition, describeFilters, freeName,
} from './model.js'

const todayIso = () => new Date().toISOString().slice(0, 10)
const TYPE_ICONS = { epic: 'layers', task: 'square-check-big', bug: 'bug', spike: 'lightbulb' }
const typeIcon = (type) => TYPE_ICONS[type || 'task'] ?? 'square'
const domId = (prefix, ref) => `${prefix}-${String(ref).replace(/[^A-Za-z0-9_-]/g, '_')}`
const draftKey = (name) => name ?? ''
const statusText = (status) => {
  const key = stageKeyOf({ status })
  return key ? stageLabel(key) : readableLabel(status || 'unknown', 'Unknown')
}

function Avatar({ name }) {
  const initials = initialsOf(name)
  return jsx('span', { className: initials ? 'dy-kb-avatar' : 'dy-kb-avatar empty', title: name ? displayName(name) : 'Unassigned', 'aria-hidden': true, children: initials })
}

// The expanded part of a card: labelled sections, then the actions.
function CardBody({ id, item, facts, moves, moving, today, onMove, onOpenItem, onOpenRef, onNavigate, onMilestones }) {
  const linkRow = (card) => jsx('li', { children: jsxs('button', { type: 'button', className: 'dy-kb-link', 'data-link-ref': card.ref, 'data-done': card.done ? 'true' : undefined,
    title: `Open ${card.ref}`, onClick: () => onOpenRef(card.ref), children: [
      jsx('span', { className: 'dy-kb-key', children: card.ref }),
      jsx('span', { className: 'dy-kb-link-title', children: card.title || typeLabel(card.type) }),
      jsx('span', { className: 'dy-kb-link-status', children: statusText(card.status) }),
    ]}) }, card.ref)
  const section = (key, title, body) => jsxs('section', { className: 'dy-kb-section', 'data-card-section': key, children: [jsx('h5', { children: title }), body] }, key)
  const row = (label, value, extra = {}, key = label) => jsxs('div', { className: 'dy-kb-row', ...extra, children: [jsx('dt', { children: label }), jsx('dd', { children: value })] }, key)
  const goto = (label, onClick, text) => jsx('button', { type: 'button', className: 'dy-kb-goto', 'aria-label': `${label}: ${text}`, onClick, children: text })

  const planning = []
  if (facts.initiative) planning.push(row('Initiative', goto('Initiative', () => onNavigate('roadmap'), facts.initiative.title || facts.initiative.ref)))
  facts.milestones.forEach((milestone, index) => planning.push(row('Milestone', goto('Milestone', onMilestones, milestone.due ? `${milestone.name} · due ${shortDate(milestone.due, today)}` : milestone.name), {}, `milestone:${index}`)))
  facts.objectives.forEach((objective, index) => planning.push(row('Objective', jsxs('span', { children: [goto('Objective', () => onNavigate('objectives'), objective.name), jsx('span', { className: 'dy-kb-via', children: ' (through the initiative)' })] }), {}, `objective:${index}`)))

  const details = [row('Assignee', item.assignee ? displayName(item.assignee) : 'Unassigned')]
  if (facts.due) details.push(row('Due', facts.overdue ? `${shortDate(facts.due, today)} · Overdue` : shortDate(facts.due, today), facts.overdue ? { 'data-overdue': 'true' } : {}))
  if (facts.labels.length) details.push(row('Labels', facts.labels.join(', ')))

  return jsxs('div', { className: 'dy-kb-card-body', id, 'data-card-body': item.ref, children: [
    facts.blockedBy.length ? section('blocked_by', 'Blocked by', jsx('ul', { className: 'dy-kb-links', children: facts.blockedBy.map(linkRow) })) : null,
    facts.blocks.length ? section('blocks', 'Blocks', jsx('ul', { className: 'dy-kb-links', children: facts.blocks.map(linkRow) })) : null,
    planning.length ? section('planning', 'Planning', jsx('dl', { children: planning })) : null,
    section('details', 'Details', jsx('dl', { children: details })),
    jsxs('div', { className: 'dy-kb-card-actions', children: [
      moves.targets.length
        ? jsxs('select', { 'aria-label': `Move ${item.ref}`, 'data-card-move': item.ref, disabled: moving, value: '', onChange: (event) => onMove(item.ref, event.target.value), children: [
            jsx('option', { value: '', children: 'Move to…' }),
            ...moves.targets.map((target) => jsx('option', { value: target.status, children: target.label }, target.key)),
          ]})
        : moves.reason ? jsx('p', { className: 'dy-kb-move-none', 'data-card-move-none': item.ref, children: moves.reason }) : null,
      jsxs('button', { type: 'button', className: 'dockyard-button small', 'data-card-open': item.ref, onClick: () => onOpenItem(item), children: [jsx(Icon, { name: 'arrow-up-right' }), 'Open full details'] }),
    ]}),
  ]})
}

// One card. The summary is a single button: click (or Enter/Space) expands it.
function Card({ item, facts, fields, open, moves, moving, today, onToggle, onDragStart, onDragEnd, ...bodyProps }) {
  const signals = cardSignals(facts, fields, today)
  const labels = fields.labels ? facts.labels : []
  const shownLabels = labels.slice(0, LABEL_LIMIT)
  const hiddenLabels = labels.slice(LABEL_LIMIT)
  const planningText = fields.planning ? [facts.initiative ? (facts.initiative.title || facts.initiative.ref) : null, facts.milestones[0]?.name].filter(Boolean).join(' · ') : ''
  const bodyId = domId('dy-kb-body', item.ref)
  const summaryId = domId('dy-kb-sum', item.ref)
  const hasSummary = signals.length > 0 || shownLabels.length > 0 || Boolean(planningText)
  return jsxs('article', { className: 'dockyard-work-card', 'data-work-card': item.ref, 'data-open': open ? 'true' : 'false', 'data-type': item.type || 'task',
    draggable: moves.targets.length > 0 && !moving, onDragStart, onDragEnd, children: [
    jsxs('button', { type: 'button', className: 'dy-kb-card-toggle', 'data-card-toggle': item.ref, 'aria-expanded': open, 'aria-controls': open ? bodyId : undefined,
      'aria-label': `${typeLabel(item.type)} ${item.ref}: ${item.title}${fields.assignee ? `, ${item.assignee ? `assigned to ${displayName(item.assignee)}` : 'unassigned'}` : ''}`,
      'aria-describedby': hasSummary ? summaryId : undefined, onClick: () => onToggle(item.ref, !open), children: [
      jsxs('span', { className: 'dy-kb-card-top', children: [
        jsxs('span', { className: 'dy-kb-type', 'data-type': item.type || 'task', title: typeLabel(item.type), children: [jsx(Icon, { name: typeIcon(item.type) }), jsx('span', { children: typeLabel(item.type) })] }),
        jsx('span', { className: 'dy-kb-key', children: item.ref }),
        fields.assignee ? jsx(Avatar, { name: item.assignee }) : null,
        jsx('span', { className: 'dy-kb-chevron', 'aria-hidden': true, children: jsx(Icon, { name: 'chevron-down' }) }),
      ]}),
      jsx('span', { className: 'dy-kb-title', children: item.title }),
      hasSummary ? jsxs('span', { className: 'dy-kb-summary', id: summaryId, children: [
        ...signals.map((signal) => jsxs('span', { className: 'dy-kb-signal', 'data-signal': signal.kind, children: [jsx(Icon, { name: signal.icon }), jsx('span', { children: signal.text })] }, signal.kind)),
        ...shownLabels.map((label) => jsx('span', { className: 'dy-kb-label', 'data-card-label': label, children: label }, `label:${label}`)),
        hiddenLabels.length ? jsx('span', { className: 'dy-kb-label', 'data-card-label-more': hiddenLabels.length, title: hiddenLabels.join(', '), children: `+${hiddenLabels.length}` }, 'label-more') : null,
        planningText ? jsxs('span', { className: 'dy-kb-signal dy-kb-planning', 'data-signal': 'planning', children: [jsx(Icon, { name: 'target' }), jsx('span', { children: planningText })] }, 'planning') : null,
      ]}) : null,
    ]}),
    open ? jsx(CardBody, { id: bodyId, item, facts, moves, moving, today, ...bodyProps }) : null,
  ]})
}

// Manage views: a side panel over the right of the board (the board stays usable).
function ViewsPanel({ views, currentName, working, edited, startNew, busy, error, openerRef, onClose, onSelect, onCreate, onSaveCurrent, onReset,
  onRename, onDuplicate, onShare, onDelete, onFields, onClearFilters }) {
  const panelRef = useRef(null)
  const [newOpen, setNewOpen] = useState(Boolean(startNew))
  const [newName, setNewName] = useState(() => freeName('New view', [ALL_WORK, ...views.map((saved) => saved.name)]))
  const [newShared, setNewShared] = useState(false)
  const [renaming, setRenaming] = useState(null)
  const [renameText, setRenameText] = useState('')
  const [confirming, setConfirming] = useState(null)
  const current = views.find((saved) => saved.name === currentName) ?? null
  const names = [ALL_WORK, ...views.map((saved) => saved.name)]

  useEffect(() => { setNewOpen(Boolean(startNew)) }, [startNew])
  useEffect(() => {
    const target = newOpen ? panelRef.current?.querySelector('[data-view-new-name]') : panelRef.current?.querySelector('h2')
    target?.focus()
  }, [newOpen])
  const close = () => { onClose(); openerRef.current?.focus() }
  const onKeyDown = (event) => { if (event.key === 'Escape') { event.stopPropagation(); close() } }

  const trimmed = newName.trim()
  const newProblem = !trimmed ? 'Give the view a name.' : names.includes(trimmed) ? `A view called "${trimmed}" already exists.` : null
  const renameProblem = (from) => {
    const text = renameText.trim()
    if (!text) return 'Give the view a name.'
    if (text !== from && names.includes(text)) return `A view called "${text}" already exists.`
    return null
  }

  const newForm = newOpen ? jsxs('form', { className: 'dy-kb-panel-section dy-kb-new-view', 'data-view-new-form': true,
    onSubmit: (event) => { event.preventDefault(); if (!newProblem && !busy) onCreate(trimmed, newShared).then((ok) => { if (ok) setNewOpen(false) }) }, children: [
    jsx('h3', { children: 'New view' }),
    jsxs('label', { className: 'dy-kb-field', children: [jsx('span', { children: 'Name' }),
      jsx('input', { type: 'text', 'data-view-new-name': true, value: newName, maxLength: 80, onChange: (event) => setNewName(event.target.value) })] }),
    jsxs('fieldset', { className: 'dy-kb-choice', children: [jsx('legend', { children: 'Who can see it' }),
      ...[[false, 'Only me'], [true, 'Everyone on this project']].map(([value, label]) => jsxs('label', { children: [
        jsx('input', { type: 'radio', name: 'dy-kb-new-shared', 'data-view-new-shared': String(value), checked: newShared === value, onChange: () => setNewShared(value) }),
        jsx('span', { children: label })] }, String(value)))] }),
    jsxs('p', { className: 'dy-kb-panel-meta', children: ['Saves what you see now: ', describeDefinition(working), '.'] }),
    newProblem && trimmed ? jsx('p', { className: 'dy-kb-panel-problem', role: 'alert', children: newProblem }) : null,
    jsxs('div', { className: 'dy-kb-panel-buttons', children: [
      jsx('button', { type: 'submit', className: 'dockyard-button small primary', 'data-view-create': true, disabled: Boolean(newProblem) || busy, children: 'Create view' }),
      jsx('button', { type: 'button', className: 'dockyard-button small', onClick: () => setNewOpen(false), children: 'Cancel' }),
    ]}),
  ]}) : jsx('div', { className: 'dy-kb-panel-section', children: jsxs('button', { type: 'button', className: 'dockyard-button small', 'data-view-new-open': true, onClick: () => setNewOpen(true), children: [jsx(Icon, { name: 'plus' }), 'New view from what you see'] }) })

  const viewRow = (saved) => {
    const name = saved ? saved.name : ALL_WORK
    const isCurrent = (saved ? saved.name : null) === currentName
    const definition = saved ? definitionOf(saved) : defaultDefinition()
    const mine = saved ? saved.mine !== false : false
    const badge = !saved ? 'Built in' : saved.shared ? 'Shared' : 'Only me'
    let actions
    if (saved && renaming === name) {
      const problem = renameProblem(name)
      actions = jsxs('form', { className: 'dy-kb-rename', onSubmit: (event) => { event.preventDefault(); if (!problem && !busy) onRename(saved, renameText.trim()).then((ok) => { if (ok) setRenaming(null) }) }, children: [
        jsx('input', { type: 'text', 'aria-label': `New name for ${name}`, 'data-view-rename-input': name, value: renameText, maxLength: 80, autoFocus: true, onChange: (event) => setRenameText(event.target.value) }),
        jsx('button', { type: 'submit', className: 'dockyard-button small primary', disabled: Boolean(problem) || busy, children: 'Save name' }),
        jsx('button', { type: 'button', className: 'dockyard-button small', onClick: () => setRenaming(null), children: 'Cancel' }),
        problem && renameText.trim() ? jsx('p', { className: 'dy-kb-panel-problem', role: 'alert', children: problem }) : null,
      ]})
    } else if (saved && confirming === name) {
      actions = jsxs('div', { className: 'dy-kb-confirm', role: 'alert', children: [
        jsx('span', { children: `Delete "${name}"? This can't be undone.` }),
        jsx('button', { type: 'button', className: 'dockyard-button small danger', 'data-view-delete-confirm': name, disabled: busy, onClick: () => onDelete(saved).then(() => setConfirming(null)), children: 'Delete' }),
        jsx('button', { type: 'button', className: 'dockyard-button small', onClick: () => setConfirming(null), children: 'Cancel' }),
      ]})
    } else {
      const small = (label, icon, onClick, extra = {}) => jsxs('button', { type: 'button', className: 'dy-kb-icon-button', title: label, 'aria-label': `${label} ${name}`, disabled: busy, onClick, ...extra, children: [jsx(Icon, { name: icon }), jsx('span', { children: label })] }, label)
      actions = jsxs('div', { className: 'dy-kb-row-actions', children: [
        isCurrent ? null : small('Open', 'eye', () => onSelect(saved ? saved.name : null), { 'data-view-open': name }),
        saved && mine ? small('Rename', 'pencil', () => { setRenaming(name); setRenameText(name); setConfirming(null) }, { 'data-view-rename': name }) : null,
        saved ? small('Duplicate', 'copy', () => onDuplicate(saved), { 'data-view-duplicate': name }) : null,
        saved && mine ? small(saved.shared ? 'Make it only mine' : 'Share with project', saved.shared ? 'user' : 'send', () => onShare(saved, !saved.shared), { 'data-view-share': name }) : null,
        saved && mine ? small('Delete', 'trash-2', () => { setConfirming(name); setRenaming(null) }, { 'data-view-delete': name }) : null,
        saved && !mine ? jsx('span', { className: 'dy-kb-panel-meta', children: saved.owner ? `Shared by ${displayName(saved.owner)}. Duplicate it to make your own.` : 'Shared view. Duplicate it to make your own.' }) : null,
      ]})
    }
    return jsxs('li', { className: 'dy-kb-view-row', 'data-view-row': name, 'data-current': isCurrent ? 'true' : undefined, children: [
      jsxs('div', { className: 'dy-kb-view-row-head', children: [
        jsx('strong', { children: name }),
        jsx('span', { className: 'dy-kb-badge', children: badge }),
        isCurrent ? jsx('span', { className: 'dy-kb-badge current', children: 'Showing' }) : null,
      ]}),
      jsx('p', { className: 'dy-kb-panel-meta', children: describeDefinition(definition) }),
      actions,
    ]}, name)
  }

  const fields = working.fields
  const adjust = jsxs('section', { className: 'dy-kb-panel-section', 'data-view-adjust': currentName ?? ALL_WORK, children: [
    jsx('h3', { children: `Adjust "${currentName ?? ALL_WORK}"` }),
    jsxs('fieldset', { className: 'dy-kb-choice', children: [jsx('legend', { children: 'Show on cards' }),
      ...CARD_FIELDS.map((key) => jsxs('label', { children: [
        jsx('input', { type: 'checkbox', 'data-card-field': key, checked: Boolean(fields[key]), onChange: () => onFields({ ...fields, [key]: !fields[key] }) }),
        jsx('span', { children: CARD_FIELD_LABELS[key] })] }, key))] }),
    jsxs('div', { className: 'dy-kb-filter-summary', children: [
      jsx('span', { children: describeFilters(working.filters) || 'No filters: shows all work.' }),
      filtersActive(working.filters) ? jsx('button', { type: 'button', className: 'dockyard-button small', 'data-view-clear-filters': true, onClick: onClearFilters, children: 'Clear filters' }) : null,
    ]}),
    jsx('p', { className: 'dy-kb-panel-meta', children: 'Layout and card size are on the toolbar. Every change shows straight away on the board.' }),
    edited ? jsxs('div', { className: 'dy-kb-panel-buttons', children: [
      current && current.mine !== false ? jsx('button', { type: 'button', className: 'dockyard-button small primary', 'data-view-save': true, disabled: busy, onClick: onSaveCurrent, children: 'Save changes' }) : null,
      jsx('button', { type: 'button', className: 'dockyard-button small', disabled: busy, onClick: () => setNewOpen(true), children: 'Save as new view' }),
      jsx('button', { type: 'button', className: 'dockyard-button small', disabled: busy, onClick: onReset, children: 'Reset' }),
    ]}) : null,
  ]})

  return jsxs('aside', { className: 'dy-kb-panel', ref: panelRef, 'data-views-panel': true, 'aria-labelledby': 'dy-kb-panel-title', onKeyDown, children: [
    jsxs('header', { children: [
      jsx('h2', { id: 'dy-kb-panel-title', tabIndex: -1, children: 'Manage views' }),
      jsx('button', { type: 'button', className: 'dy-kb-collapse', 'aria-label': 'Close Manage views', 'data-views-close': true, onClick: close, children: jsx(Icon, { name: 'x' }) }),
    ]}),
    error ? jsx('p', { className: 'dy-kb-note', role: 'alert', 'data-views-error': true, children: error }) : null,
    newForm,
    jsxs('section', { className: 'dy-kb-panel-section', children: [
      jsx('h3', { children: 'Views' }),
      jsx('ul', { className: 'dy-kb-view-rows', children: [viewRow(null), ...views.map(viewRow)] }),
    ]}),
    adjust,
  ]})
}

const HELD = 'kanban-r6'

export function KanbanScreen({ project, view, onRefresh, setWorkNotice, onOpenItem, onNavigate, appliedView, setAppliedView }) {
  const [page, setPage] = useState('work')
  const [overrides, setOverrides] = useState({})
  const [collapsed, setCollapsed] = useState({})
  const [dragged, setDragged] = useState(null)
  const [moving, setMoving] = useState(false)
  const [deps, setDeps] = useState({ status: 'loading', data: null })
  const [roadmap, setRoadmap] = useState({ status: 'loading', data: null })
  const [viewList, setViewList] = useState(view.views ?? [])
  const [panel, setPanel] = useState(null)
  const [busy, setBusy] = useState(false)
  const [viewError, setViewError] = useState(null)
  const moveLock = useRef(false)
  const boardRef = useRef(null)
  const focusAfter = useRef(null)
  const focusCard = useRef(null)
  const manageRef = useRef(null)
  const encoded = encodeURIComponent(project.id)
  const today = todayIso()

  // The current view and any unsaved changes are held by the dashboard, so they
  // survive a switch to another project tab and back (never stored in the browser).
  const fresh = { kind: HELD, projectId: project.id, currentName: null, drafts: {} }
  const held = appliedView?.kind === HELD && appliedView.projectId === project.id ? appliedView : fresh
  const updateHeld = (change) => setAppliedView((previous) => {
    const base = previous?.kind === HELD && previous.projectId === project.id ? previous : fresh
    return { ...base, ...change(base) }
  })

  useEffect(() => { setViewList(view.views ?? []) }, [view.views])
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
  useEffect(() => {
    const target = focusAfter.current
    if (!target) return
    focusAfter.current = null
    boardRef.current?.querySelector(`[data-board-${target.to}="${target.key}"]`)?.focus()
  }, [collapsed])
  // After a move, keyboard focus follows the card to its new column, unless that
  // column is collapsed or the List is showing (then focus stays where it is).
  useEffect(() => {
    const pending = focusCard.current
    if (!pending) return
    if (collapsed[pending.stage] || working.layout === 'list') { focusCard.current = null; return }
    const target = boardRef.current?.querySelector(`[data-board-column="${pending.stage}"] [data-card-toggle="${CSS.escape(pending.ref)}"]`)
    if (target) { focusCard.current = null; target.focus() }
  })

  const currentSaved = held.currentName ? viewList.find((saved) => saved.name === held.currentName) ?? null : null
  const currentName = currentSaved ? currentSaved.name : null
  const savedDefinition = currentSaved ? definitionOf(currentSaved) : defaultDefinition()
  const draft = held.drafts[draftKey(currentName)]
  const working = draft ?? savedDefinition
  const edited = Boolean(draft) && !sameDefinition(draft, savedDefinition)
  const editedNames = new Set([null, ...viewList.map((saved) => saved.name)].filter((name) => {
    const pending = held.drafts[draftKey(name)]
    const saved = name ? viewList.find((candidate) => candidate.name === name) : null
    return pending && !sameDefinition(pending, saved ? definitionOf(saved) : defaultDefinition())
  }))

  const setWorking = (next) => updateHeld((base) => ({ drafts: { ...base.drafts, [draftKey(currentName)]: next } }))
  const setFilters = (filters) => setWorking({ ...working, filters })
  const dropDraft = (name) => updateHeld((base) => { const drafts = { ...base.drafts }; delete drafts[draftKey(name)]; return { drafts } })
  const selectView = (name) => { setPage('work'); setOverrides({}); updateHeld(() => ({ currentName: name })) }

  const allItems = view.workItems ?? []
  const factData = { deps: deps.data ?? {}, initiatives: view.initiatives ?? [], milestones: view.milestones ?? [], roadmapProject: roadmap.data }
  const factsByRef = Object.fromEntries(allItems.map((item) => [item.ref, cardFacts(item, factData, today)]))
  const items = applyFilters(allItems, working.filters, factsByRef)
  const grouped = groupByStage(items)
  const options = filterOptions(allItems)
  const liveCount = STAGES.reduce((total, stage) => total + grouped[stage.key].length, 0)
  const unplaced = unplacedItems(allItems)
  const movesOf = (item) => movesFor(item, deps.status === 'ok' ? factsByRef[item.ref]?.openBlockers ?? 0 : 0)
  const isOpen = (ref) => overrides[ref] ?? working.density === 'detailed'

  const transitionStatus = async (ref, status) => {
    if (!project || !ref || !status || moveLock.current || !allItems.some((item) => item.ref === ref)) return
    moveLock.current = true
    setMoving(true)
    setDragged(null)
    setWorkNotice(null)
    try {
      // The plugin proxy supplies configured DOCKYARD_ACTOR_ID attribution.
      await api(`/projects/${encoded}/work-items/${encodeURIComponent(ref)}/transition`, { method: 'POST', body: { status } })
      const readback = await api(`/projects/${encoded}/work-items`)
      if (!(readback.work_items ?? []).some((item) => item.ref === ref && item.status === status)) throw new Error('Hermes did not confirm the new column')
      focusCard.current = { ref, stage: stageKeyOf({ status }) }
      onRefresh?.()
      emitToast('success', `Work item moved to ${status.replaceAll('_', ' ')}.`)
    } catch (failure) {
      setWorkNotice(`Could not move ${ref}: ${String(failure?.message ?? failure)}. The board shows what Hermes has now.`)
      onRefresh?.()
    } finally {
      moveLock.current = false
      setMoving(false)
    }
  }

  // ---- views: backend calls -------------------------------------------------------
  const putView = (name, definition, shared) => api(`/projects/${encoded}/views`, { method: 'PUT', body: viewBody(name, definition, shared) })
  const upsertLocal = (name, definition, shared) => setViewList((list) => {
    const body = viewBody(name, definition, shared)
    const entry = { ...(list.find((saved) => saved.name === name) ?? { mine: true }), name, layout: body.layout, filters: body.filters, shared: body.shared }
    return list.some((saved) => saved.name === name) ? list.map((saved) => saved.name === name ? entry : saved) : [...list, entry]
  })
  const runView = async (label, work) => {
    setBusy(true)
    setViewError(null)
    try {
      await work()
      onRefresh?.()
      return true
    } catch (failure) {
      setViewError(`${label}: ${String(failure?.message ?? failure)}`)
      return false
    } finally {
      setBusy(false)
    }
  }
  const saveCurrent = () => currentSaved && runView(`Could not save "${currentSaved.name}"`, async () => {
    await putView(currentSaved.name, working, currentSaved.shared)
    upsertLocal(currentSaved.name, working, currentSaved.shared)
    dropDraft(currentSaved.name)
    emitToast('success', `Saved "${currentSaved.name}".`)
  })
  const createView = (name, shared) => runView(`Could not create "${name}"`, async () => {
    await putView(name, working, shared)
    upsertLocal(name, working, shared)
    dropDraft(currentName)
    selectView(name)
    emitToast('success', `Created "${name}".`)
  })
  const renameView = (saved, name) => name === saved.name ? Promise.resolve(true) : runView(`Could not rename "${saved.name}"`, async () => {
    const definition = definitionOf(saved)
    await putView(name, definition, saved.shared)
    upsertLocal(name, definition, saved.shared)
    try {
      await api(`/projects/${encoded}/views/${encodeURIComponent(saved.name)}`, { method: 'DELETE' })
    } catch (failure) {
      throw new Error(`saved as "${name}", but the old view could not be removed (${String(failure?.message ?? failure)})`)
    }
    setViewList((list) => list.filter((candidate) => candidate.name !== saved.name))
    updateHeld((base) => {
      const drafts = { ...base.drafts }
      if (drafts[saved.name]) { drafts[name] = drafts[saved.name]; delete drafts[saved.name] }
      return { drafts, currentName: base.currentName === saved.name ? name : base.currentName }
    })
    emitToast('success', `Renamed to "${name}".`)
  })
  const duplicateView = (saved) => runView(`Could not duplicate "${saved.name}"`, async () => {
    const name = freeName(`${saved.name} copy`, [ALL_WORK, ...viewList.map((candidate) => candidate.name)])
    await putView(name, definitionOf(saved), false)
    upsertLocal(name, definitionOf(saved), false)
    emitToast('success', `Duplicated as "${name}" (only you can see it).`)
  })
  const shareView = (saved, shared) => runView(`Could not change who sees "${saved.name}"`, async () => {
    await putView(saved.name, definitionOf(saved), shared)
    upsertLocal(saved.name, definitionOf(saved), shared)
    emitToast('success', shared ? `"${saved.name}" is now shared with the project.` : `"${saved.name}" is now only yours.`)
  })
  const deleteView = (saved) => runView(`Could not delete "${saved.name}"`, async () => {
    await api(`/projects/${encoded}/views/${encodeURIComponent(saved.name)}`, { method: 'DELETE' })
    setViewList((list) => list.filter((candidate) => candidate.name !== saved.name))
    updateHeld((base) => {
      const drafts = { ...base.drafts }
      delete drafts[saved.name]
      return { drafts, currentName: base.currentName === saved.name ? null : base.currentName }
    })
    emitToast('success', `Deleted "${saved.name}".`)
  })
  const resetView = () => { dropDraft(currentName); setOverrides({}) }
  const openPanel = (mode) => { setViewError(null); setPanel({ mode, at: Date.now() }) }

  // ---- views bar ------------------------------------------------------------------
  const viewTab = (saved) => {
    const name = saved ? saved.name : null
    const label = saved ? saved.name : ALL_WORK
    const active = page === 'work' && name === currentName
    return jsxs('button', { type: 'button', className: 'dy-kb-viewtab', 'data-view-tab': label, 'aria-pressed': active, title: saved ? describeDefinition(definitionOf(saved)) : 'Everything, on the board', onClick: () => selectView(name), children: [
      jsx('span', { className: 'dy-kb-viewtab-name', children: label }),
      editedNames.has(name) ? jsx('span', { className: 'dy-kb-dot', 'aria-label': 'unsaved changes', role: 'img' }) : null,
    ]}, label)
  }
  const viewsBar = jsxs('div', { className: 'dy-kb-viewsbar', children: [
    jsxs('nav', { className: 'dy-kb-viewtabs', 'aria-label': 'Views', children: [
      viewTab(null),
      ...viewList.map(viewTab),
      jsxs('button', { type: 'button', className: 'dy-kb-viewtab dy-kb-viewtab-new', 'data-view-new': true, onClick: () => openPanel('new'), children: [jsx(Icon, { name: 'plus' }), jsx('span', { children: 'New view' })] }, 'new'),
    ]}),
    jsxs('div', { className: 'dy-kb-views-right', children: [
      jsxs('button', { type: 'button', className: 'dy-kb-control dy-kb-button', 'data-kanban-page': 'milestones', 'aria-pressed': page === 'milestones', onClick: () => setPage(page === 'milestones' ? 'work' : 'milestones'), children: [jsx(Icon, { name: 'flag' }), 'Milestones'] }),
      jsxs('button', { type: 'button', className: 'dy-kb-control dy-kb-button', ref: manageRef, 'data-views-manage': true, 'aria-expanded': Boolean(panel), onClick: () => (panel ? setPanel(null) : openPanel('manage')), children: [jsx(Icon, { name: 'list-filter' }), 'Manage views'] }),
    ]}),
  ]})

  // ---- toolbar --------------------------------------------------------------------
  const { filters } = working
  const segmented = (label, key, value, choices, onPick) => jsx('div', { className: 'dy-kb-segmented', role: 'group', 'aria-label': label, children:
    choices.map(([choice, text]) => jsx('button', { type: 'button', [`data-kanban-${key}`]: choice, 'aria-pressed': value === choice, onClick: () => onPick(choice), children: text }, choice)) })
  const toolbar = jsxs('div', { className: 'dy-kb-toolbar', 'data-kanban-toolbar': true, children: [
    jsxs('label', { className: 'dy-kb-control dy-kb-search', children: [
      jsx(Icon, { name: 'search' }),
      jsx('input', { type: 'search', 'aria-label': 'Search work items', placeholder: 'Search ref or title', value: filters.query, onChange: (event) => setFilters({ ...filters, query: event.target.value }) }),
    ]}),
    ...[['assignee', 'Filter by assignee', 'All assignees', options.assignees], ['type', 'Filter by type', 'All types', options.types], ['label', 'Filter by label', 'All labels', options.labels]].map(([key, label, all, values]) =>
      jsx('label', { className: 'dy-kb-control', children: jsxs('select', { 'aria-label': label, 'data-kanban-filter': key, value: filters[key], onChange: (event) => setFilters({ ...filters, [key]: event.target.value }), children: [
        jsx('option', { value: '', children: all }),
        ...values.map((value) => jsx('option', { value, children: key === 'type' ? typeLabel(value) : key === 'assignee' ? displayName(value) : value }, value)),
      ]}) }, key)),
    filters.statuses.length ? jsxs('button', { type: 'button', className: 'dy-kb-control dy-kb-button', 'data-kanban-status-filter': true, onClick: () => setFilters({ ...filters, statuses: [] }),
      'aria-label': 'Remove the status filter', children: [`Status: ${filters.statuses.map(statusText).join(', ')}`, jsx(Icon, { name: 'x' })] }) : null,
    jsx('button', { type: 'button', className: 'dy-kb-control dy-kb-button', 'data-kanban-clear': true, disabled: !filtersActive(filters), onClick: () => setFilters(emptyFilters()), children: 'Clear filters' }),
    jsx('span', { className: 'dy-kb-toolbar-gap', 'aria-hidden': true }),
    segmented('Layout', 'layout', working.layout, [['board', 'Board'], ['list', 'List']], (layout) => setWorking({ ...working, layout })),
    working.layout === 'board' ? segmented('Cards', 'density', working.density, [['compact', 'Summary'], ['detailed', 'Expanded']], (density) => { setOverrides({}); setWorking({ ...working, density }) }) : null,
    jsx('span', { className: 'dy-kb-count', 'data-kanban-count': true, role: 'status', children: `${number(liveCount)} ${plural(liveCount, 'item')}` }),
  ]})

  const editedStrip = edited ? jsxs('div', { className: 'dy-kb-edited', 'data-view-edited': currentName ?? ALL_WORK, role: 'status', children: [
    jsx('span', { className: 'dy-kb-dot', 'aria-hidden': true }),
    jsx('span', { className: 'dy-kb-edited-text', children: currentSaved ? `Unsaved changes to "${currentSaved.name}".` : 'You changed All work. Save it as a view to keep this.' }),
    currentSaved && currentSaved.mine !== false ? jsx('button', { type: 'button', className: 'dockyard-button small primary', 'data-view-save': true, disabled: busy, onClick: saveCurrent, children: 'Save' }) : null,
    jsx('button', { type: 'button', className: 'dockyard-button small', 'data-view-save-as': true, disabled: busy, onClick: () => openPanel('new'), children: 'Save as new view' }),
    jsx('button', { type: 'button', className: 'dockyard-button small', 'data-view-reset': true, onClick: resetView, children: 'Reset' }),
  ]}) : null

  const notes = [
    deps.status === 'error' ? jsx('p', { className: 'dy-kb-note', 'data-kanban-note': 'dependencies', role: 'status', children: 'Dependencies unavailable. Blocked by and Blocks are not shown.' }, 'deps') : null,
    roadmap.status === 'error' ? jsx('p', { className: 'dy-kb-note', 'data-kanban-note': 'objectives', role: 'status', children: 'Objectives unavailable. Objectives are not shown.' }, 'roadmap') : null,
    // Never hide work: an item whose status no column lists is named here.
    unplaced.length ? jsxs('div', { className: 'dy-kb-note', 'data-kanban-note': 'unplaced', role: 'status', children: [
      jsx('span', { children: `${number(unplaced.length)} ${plural(unplaced.length, 'item')} not on the board: Hermes gave ${unplaced.length === 1 ? 'it a status' : 'them statuses'} no column lists. ` }),
      ...unplaced.map((item) => jsx('button', { type: 'button', className: 'dy-kb-goto', onClick: () => onOpenItem(item), children: `${item.ref} (${item.status})` }, item.ref)),
    ]}, 'unplaced') : null,
  ]

  const noMatch = allItems.length > 0 && liveCount === 0 && filtersActive(filters)
  const empty = noMatch
    ? jsxs('p', { className: 'dy-kb-empty', 'data-kanban-empty': 'filters', children: ['No work matches these filters. ', jsx('button', { type: 'button', className: 'dockyard-button small', onClick: () => setFilters(emptyFilters()), children: 'Clear filters' })] }, 'empty')
    : allItems.length === 0
      ? jsx('p', { className: 'dy-kb-empty', 'data-kanban-empty': 'none', children: 'This project has no work items yet. Add work from the Backlog tab.' }, 'empty')
      : null

  // ---- board ----------------------------------------------------------------------
  const openRef = (ref) => {
    const target = allItems.find((item) => item.ref === ref)
    if (target) onOpenItem(target)
    else setWorkNotice(`Work item ${ref} is not in this project's board data.`)
  }
  const toggleColumn = (key) => {
    const willCollapse = !collapsed[key]
    focusAfter.current = { key, to: willCollapse ? 'strip' : 'collapse' }
    setCollapsed((current) => ({ ...current, [key]: willCollapse }))
  }
  const card = (item, stageKey) => {
    const moves = movesOf(item)
    return jsx(Card, { item, facts: factsByRef[item.ref], fields: working.fields, open: isOpen(item.ref), moves, moving, today,
      onToggle: (ref, open) => setOverrides((current) => ({ ...current, [ref]: open })),
      onDragStart: (event) => { event.dataTransfer.setData('text/plain', item.ref); event.dataTransfer.effectAllowed = 'move'; setDragged({ ref: item.ref, project: project.id, from: stageKey, targets: moves.targets.map((target) => target.key) }) },
      onDragEnd: () => setDragged(null),
      onMove: transitionStatus, onOpenItem, onOpenRef: openRef, onNavigate, onMilestones: () => setPage('milestones'),
    }, item.ref)
  }
  const column = (stage) => {
    const stageItems = grouped[stage.key]
    const isCollapsed = Boolean(collapsed[stage.key])
    const canDrop = Boolean(dragged) && dragged.project === project.id && !moving && dragged.targets.includes(stage.key)
    const refused = Boolean(dragged) && !canDrop && dragged.from !== stage.key
    return jsxs('section', { className: 'dockyard-board-column', 'data-board-column': stage.key, 'data-collapsed': isCollapsed ? 'true' : 'false',
      'data-drop-ready': canDrop ? 'true' : undefined, 'data-drop-refused': refused ? 'true' : undefined,
      onDragOver: (event) => { if (canDrop) { event.preventDefault(); event.dataTransfer.dropEffect = 'move' } },
      onDrop: (event) => { event.preventDefault(); if (canDrop) transitionStatus(dragged.ref, dropStatusOf(stage.key)); setDragged(null) },
      children: isCollapsed
        ? [jsxs('button', { type: 'button', className: 'dy-kb-strip', 'data-board-strip': stage.key, 'aria-expanded': false,
            'aria-label': `Expand ${stage.label}, ${number(stageItems.length)} ${plural(stageItems.length, 'item')}`, onClick: () => toggleColumn(stage.key), children: [
            jsx('span', { className: 'dy-kb-strip-count', children: number(stageItems.length) }),
            jsx('span', { className: 'dy-kb-strip-label', children: stage.label }),
          ]}, 'strip')]
        : [
            jsxs('header', { children: [
              jsx('button', { type: 'button', className: 'dy-kb-collapse', 'data-board-collapse': stage.key, 'aria-expanded': true, 'aria-label': `Collapse ${stage.label}`, onClick: () => toggleColumn(stage.key), children: jsx(Icon, { name: 'chevrons-left' }) }),
              jsx('h3', { title: stage.hint, children: stage.label }),
              jsx('span', { children: number(stageItems.length) }),
            ]}, 'header'),
            jsx('div', { className: 'dockyard-board-cards', children: stageItems.length > 0 ? stageItems.map((item) => card(item, stage.key)) : jsx('p', { className: 'dockyard-meta', children: refused ? "Can't move here." : 'Nothing here.' }) }, 'cards'),
          ],
    }, stage.key)
  }
  const board = jsx('div', { className: 'dockyard-board', ref: boardRef, role: 'region', 'aria-label': 'Kanban board', 'data-kanban-board': true, children: STAGES.map(column) }, 'board')

  // ---- list (C's columns; card settings only change cards) --------------------------
  const refsCell = (cards) => jsx('div', { className: 'dy-kb-cell-refs', children: cards.map((linked) => jsx('button', { type: 'button', className: 'dy-kb-goto', 'data-done': linked.done ? 'true' : undefined, title: statusText(linked.status), onClick: () => openRef(linked.ref), children: `${linked.ref} ${linked.title}` }, linked.ref)) })
  const moveCell = (item) => {
    const moves = movesOf(item)
    return moves.targets.length
      ? jsxs('select', { 'aria-label': `Move ${item.ref}`, 'data-card-move': item.ref, disabled: moving, value: '', onChange: (event) => transitionStatus(item.ref, event.target.value), children: [
          jsx('option', { value: '', children: 'Move to…' }),
          ...moves.targets.map((target) => jsx('option', { value: target.status, children: target.label }, target.key)),
        ]})
      : jsx('span', { className: 'dy-kb-panel-meta', title: moves.reason ?? '', children: '—' })
  }
  const facts = (item) => factsByRef[item.ref]
  const listColumns = [
    { key: 'ref', heading: 'Ref', cell: (item) => jsx('button', { type: 'button', className: 'dy-kb-goto', onClick: () => onOpenItem(item), children: item.ref }) },
    { key: 'title', heading: 'Title', cell: (item) => item.title },
    { key: 'type', heading: 'Type', cell: (item) => typeLabel(item.type) },
    { key: 'status', heading: 'State', cell: (item) => statusText(item.status) },
    { key: 'assignee', heading: 'Assignee', cell: (item) => item.assignee ? displayName(item.assignee) : 'Unassigned' },
    { key: 'blocked_by', heading: 'Blocked by', cell: (item) => refsCell(facts(item).blockedBy) },
    { key: 'blocks', heading: 'Blocks', cell: (item) => refsCell(facts(item).blocks) },
    { key: 'initiative', heading: 'Initiative', cell: (item) => facts(item).initiative ? (facts(item).initiative.title || facts(item).initiative.ref) : '' },
    { key: 'milestone', heading: 'Milestone', cell: (item) => facts(item).milestones.map((milestone) => milestone.name).join(', ') },
    { key: 'objective', heading: 'Objective', cell: (item) => facts(item).objectives.map((objective) => objective.name).join(', ') },
    { key: 'due', heading: 'Due', cell: (item) => facts(item).due ? `${shortDate(facts(item).due, today)}${facts(item).overdue ? ' · Overdue' : ''}` : '' },
    { key: 'move', heading: 'Move', cell: moveCell },
  ]
  const list = jsx('div', { className: 'dy-kb-list', children: jsx(WorkTable, { columns: listColumns, className: 'dy-kb-table',
    groups: STAGES.map((stage) => ({ key: stage.key, label: stage.label, items: grouped[stage.key] })).filter((group) => group.items.length > 0),
    emptyText: 'No work items to list.' }) }, 'list')

  const body = page === 'milestones'
    ? [jsx(PlanningPanel, { project, milestones: view.milestones ?? [], workItems: allItems, onRefresh }, 'milestones')]
    : [jsxs('div', { className: 'dy-kb-controls', children: [toolbar, editedStrip] }, 'controls'), ...notes, empty, working.layout === 'list' ? list : board]

  return jsxs('div', { className: 'dockyard-board-wrap', 'data-kanban-screen': true, 'data-view': currentName ?? ALL_WORK, 'data-panel-open': panel ? 'true' : undefined, children: [
    viewsBar,
    ...body,
    panel ? jsx(ViewsPanel, { views: viewList, currentName, working, edited, startNew: panel.mode === 'new' ? panel.at : 0, busy, error: viewError, openerRef: manageRef,
      onClose: () => setPanel(null), onSelect: selectView, onCreate: createView, onSaveCurrent: saveCurrent, onReset: resetView,
      onRename: renameView, onDuplicate: duplicateView, onShare: shareView, onDelete: deleteView,
      onFields: (next) => setWorking({ ...working, fields: next }), onClearFilters: () => setFilters(emptyFilters()) }, 'panel') : null,
  ]})
}
