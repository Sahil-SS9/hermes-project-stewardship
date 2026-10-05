// GENERATED-STRUCTURE: hand-edited Desktop module. Edit this file, then run
// node hermes_dockyard_plugin/desktop/build.mjs to regenerate plugin.js.
// PROTOTYPE (design round f, 05/10): the one Plan screen inside a project.
// Sahil 04/10 (feedback f): "one planning screen per project" where a person
// creates, edits, deletes and reviews initiatives, milestones, objectives and
// goals together; the global Roadmap stays read-only across projects.
// Three layouts share one data layer, one drawer and one set of dialogs:
//   A Outline       four sections, one under the other
//   B Columns       goals -> objectives -> initiatives -> milestones; picking
//                   a card traces everything linked to it
//   C Review first  what needs a decision on top, then the plan by initiative
// The Design review bar switches between them until Sahil picks one.
import { useCallback } from '../../runtime/react.js'
import { useEffect } from '../../runtime/react.js'
import { useMemo } from '../../runtime/react.js'
import { useState } from '../../runtime/react.js'
import { jsx } from '../../runtime/react.js'
import { jsxs } from '../../runtime/react.js'
import { Button } from '../../lib/ui.js'
import { StatusTag } from '../../lib/ui.js'
import { number } from '../../lib/ui.js'
import { KIND_LABEL } from '../../lib/plan-vocab.js'
import { OPEN_STATUSES } from '../../lib/plan-vocab.js'
import { REL_LABEL } from '../../lib/plan-vocab.js'
import { ApprovalDetail } from '../../work-item/approvals.js'
import { findItem } from './plan-data.js'
import { isOverdue } from './plan-data.js'
import { listOf } from './plan-data.js'
import { loadPlan } from './plan-data.js'
import { needsReview } from './plan-data.js'
import { planActions } from './plan-data.js'
import { sameItem } from './plan-data.js'
import { statusOf } from './plan-data.js'
import { PlanDrawer } from './plan-drawer.js'
import { Confirm } from './plan-ui.js'
import { ItemForm } from './plan-ui.js'
import { KindGlyph } from './plan-ui.js'
import { LinkDialog } from './plan-ui.js'
import { Menu } from './plan-ui.js'
import { MissionStrip } from './plan-ui.js'
import { PlanDialog } from './plan-ui.js'
import { Tag } from './plan-ui.js'
import { errorText } from './plan-ui.js'

// Prototype only: the layout choice lives in memory for the session. No
// browser storage (26/08 locked rule); the build keeps the layout Sahil picks.
const LAYOUTS = [['A', 'Outline'], ['B', 'Columns'], ['C', 'Review first']]
const KINDS = ['initiative', 'milestone', 'objective', 'goal']
const PLURAL = { initiative: 'Initiatives', milestone: 'Milestones', objective: 'Objectives', goal: 'Goals' }
const EMPTY = {
  initiative: 'No initiatives yet. Propose one: it waits for approval before work starts.',
  milestone: 'No milestones yet. A milestone groups the work for one delivery date.',
  objective: 'No objectives yet. An objective is evidence that the work made a difference.',
  goal: 'No goals yet. A goal is met when its objectives pass.',
}

// "plan:<kind>:<id>" is how another screen (the Roadmap's Open) asks the Plan
// screen to open on one item.
export function parsePlanFocus(entry) {
  const match = /^plan:(initiative|milestone|objective|goal):(.+)$/.exec(String(entry ?? ''))
  return match ? { kind: match[1], id: match[2] } : null
}

const plural = (n, word) => `${number(n)} ${word}${n === 1 ? '' : 's'}`
function summaryOf(item) {
  const linked = item.initiatives?.length ? plural(item.initiatives.length, 'initiative') : 'no initiative'
  if (item.kind === 'initiative') return [`${item.risk} risk`, plural(item.milestones.length, 'milestone'), plural(item.objectives.length, 'objective')].join(' · ')
  if (item.kind === 'milestone') return [item.due ? `due ${item.due}` : 'no due date', `${number(item.done)}/${number(item.total)} done`, linked].join(' · ')
  if (item.kind === 'objective') return [`target ${item.target}`, `${item.severity} severity`, linked].join(' · ')
  return [plural(item.objectiveIds.length, 'objective'), item.objectivesPassed !== null ? `${number(item.objectivesPassed)} passing` : null].filter(Boolean).join(' · ')
}

// The neighbours of one item, both ways: [kind, id][].
function neighbours(item) {
  if (item.kind === 'goal') return item.objectiveIds.map((id) => ['objective', id])
  if (item.kind === 'objective') return [...item.goals.map((g) => ['goal', g.id]), ...item.initiatives.map((link) => ['initiative', link.ref])]
  if (item.kind === 'initiative') return [...item.milestones.map((m) => ['milestone', m.id]), ...item.objectives.map((o) => ['objective', o.id])]
  return item.initiatives.map((link) => ['initiative', link.ref])
}

// Everything linked to one item along the chain goal -> objective ->
// initiative -> milestone, walking away from it in both directions (never
// back again), so a goal's trace does not flood into its sibling goals.
const RANK = { goal: 0, objective: 1, initiative: 2, milestone: 3 }
function traceOf(plan, ref) {
  const start = findItem(plan, ref)
  const seen = new Set()
  if (!start) return seen
  const walk = (item, direction) => {
    seen.add(`${item.kind}:${item.id}`)
    for (const [kind, id] of neighbours(item)) {
      const step = Math.sign(RANK[kind] - RANK[item.kind])
      const next = findItem(plan, { kind, id })
      if (next && (direction === 0 || step === direction) && !seen.has(`${kind}:${id}`)) walk(next, step)
    }
  }
  walk(start, 0)
  return seen
}

function rowMenu(item, ui) {
  if (ui.readOnly) return null
  const entry = (id, label, onSelect, danger) => ({ id, label, onSelect, danger })
  const items = [entry('open', 'Open details', () => ui.open(item))]
  if (item.kind === 'initiative') {
    if (item.status === 'pending_approval') items.push(entry('review', 'Review…', () => ui.review(item)))
    if (item.status === 'changes_requested') items.push(entry('revise', 'Revise and resubmit…', () => ui.edit(item)))
    items.push(entry('link-milestone', 'Link a milestone…', () => ui.link(item, 'milestone')), entry('link-objective', 'Link an objective…', () => ui.link(item, 'objective')))
  } else if (item.archived) {
    items.push(item.kind === 'objective' ? entry('delete', 'Delete for good…', () => ui.remove(item), true) : entry('restore', 'Restore…', () => ui.restore(item)))
  } else {
    items.push(entry('edit', 'Edit…', () => ui.edit(item)))
    items.push(item.kind === 'goal' ? entry('link-objective', 'Add an objective…', () => ui.link(item, 'objective')) : entry('link-initiative', 'Link to an initiative…', () => ui.link(item, 'initiative')))
    items.push(entry('archive', 'Archive…', () => ui.archive(item), true))
  }
  return jsx(Menu, { label: `Actions for ${item.title}`, trigger: '⋯', action: `row-${item.kind}`, items })
}

function Row({ item, ui, selected, dim = false, compact = false, depth = 0, relationship }) {
  const status = statusOf(item)
  const quick = ui.readOnly || item.kind !== 'initiative' ? null
    : item.status === 'pending_approval' ? jsx(Button, { small: true, variant: 'primary', action: 'plan-row-review', onClick: () => ui.review(item), children: 'Review' })
      : item.status === 'changes_requested' ? jsx(Button, { small: true, action: 'plan-row-revise', onClick: () => ui.edit(item), children: 'Revise' }) : null
  return jsxs('div', {
    className: ['dy-plan-row', selected && 'selected', item.archived && 'archived', dim && 'dim', compact && 'compact', depth && `depth-${depth}`].filter(Boolean).join(' '),
    'data-plan-row': item.kind, 'data-plan-id': String(item.id), role: 'listitem',
    children: [
      jsxs('button', { type: 'button', className: 'dy-plan-row-open', 'aria-pressed': selected, onClick: () => ui.open(item), children: [
        jsx(KindGlyph, { kind: item.kind }),
        jsxs('span', { className: 'dy-plan-row-text', children: [
          jsxs('strong', { children: [relationship ? jsx('em', { className: 'dy-plan-rel', children: `${REL_LABEL[relationship] ?? relationship} · ` }) : null, item.title] }),
          jsx('small', { children: summaryOf(item) }),
        ] }),
      ] }),
      jsx('span', { className: 'dy-plan-row-status', children: jsx(StatusTag, { tone: status.tone, label: status.label }) }),
      quick,
      rowMenu(item, ui),
    ],
  })
}

function Rows({ items, ui, selected, empty, row = {} }) {
  return items.length
    ? jsx('div', { className: 'dy-plan-rows', role: 'list', children: items.map((item) => jsx(Row, { item, ui, selected: sameItem(item, selected), ...row, dim: row.dim?.(item) }, `${item.kind}:${item.id}`)) })
    : jsx('p', { className: 'dy-plan-empty', children: empty })
}

function SectionHead({ title, kind, count, ui, note, actions }) {
  return jsxs('header', { className: 'dy-plan-section-head', children: [
    jsxs('h3', { children: [kind ? jsx(KindGlyph, { kind }) : null, title ?? PLURAL[kind], jsx('span', { className: 'dy-plan-count', children: number(count) })] }),
    note ? jsx('span', { className: 'dy-plan-section-note', children: note }) : null,
    ui.readOnly ? null : actions ?? (kind ? jsx(Button, { small: true, action: `plan-new-${kind}`, onClick: () => ui.create(kind), children: kind === 'initiative' ? '+ Propose' : '+ New' }) : null),
  ] })
}

// Layout A: four sections, one under the other.
function OutlineLayout({ lists, ui, selected, openNote }) {
  return jsx('div', { className: 'dy-plan-outline', 'data-plan-layout-body': 'A', children: KINDS.map((kind) => jsxs('section', { className: 'dy-plan-section', 'data-plan-section': kind, 'aria-label': PLURAL[kind], children: [
    jsx(SectionHead, { kind, count: lists[kind].length, ui, note: kind === 'initiative' ? openNote : null }),
    jsx(Rows, { items: lists[kind], ui, selected, empty: EMPTY[kind] }),
  ] }, kind)) })
}

// Layout B: columns from why to when; a picked card traces its links.
const COLUMNS = [['goal', 'Why'], ['objective', 'How we know'], ['initiative', 'What we do'], ['milestone', 'When it lands']]
function ColumnsLayout({ plan, lists, ui, selected, openNote }) {
  const trace = useMemo(() => traceOf(plan, selected), [plan, selected])
  const picked = findItem(plan, selected)
  return jsxs('div', { className: 'dy-plan-columns-wrap', 'data-plan-layout-body': 'B', children: [
    jsx('p', { className: 'dy-plan-columns-hint', children: picked ? `Showing what is linked to “${picked.title}”. Pick it again or press Escape to clear.` : 'Pick a card to see everything linked to it.' }),
    jsx('div', { className: 'dy-plan-columns', children: COLUMNS.map(([kind, caption]) => jsxs('section', { className: 'dy-plan-column', 'data-plan-section': kind, 'aria-label': PLURAL[kind], children: [
      jsx('p', { className: 'dy-plan-column-caption', children: caption }),
      jsx(SectionHead, { kind, count: lists[kind].length, ui, note: kind === 'initiative' ? openNote : null }),
      jsx(Rows, { items: lists[kind], ui, selected, empty: EMPTY[kind], row: { compact: true, dim: (item) => Boolean(picked) && !trace.has(`${kind}:${item.id}`) } }),
    ] }, kind)) }),
  ] })
}

// Layout C: what needs a decision first, then the plan by initiative.
function attentionOf(item, ui) {
  if (item.archived) return null
  if (item.kind === 'initiative') {
    if (item.status === 'pending_approval') return ['Waiting for your approval', 'Review', () => ui.review(item), 'primary']
    if (item.status === 'changes_requested') return ['Changes were requested: revise and resubmit', 'Revise', () => ui.edit(item)]
    if (OPEN_STATUSES.includes(item.status) && !item.objectives.length) return ['Nothing measures it yet: link an objective', 'Link', () => ui.link(item, 'objective')]
    return null
  }
  if (item.kind === 'milestone') {
    if (isOverdue(item)) return [`Overdue since ${item.due}: ${number(item.total - item.done)} item(s) left`, 'Open', () => ui.open(item)]
    return !item.closed && !item.initiatives.length ? ['Not linked to an initiative', 'Link', () => ui.link(item, 'initiative')] : null
  }
  if (item.kind === 'objective') {
    if (item.outcome === 'failed') return ['Failing its target', 'Open', () => ui.open(item)]
    return !item.initiatives.length ? ['Not linked to an initiative', 'Link', () => ui.link(item, 'initiative')] : null
  }
  return item.state === 'at_risk' ? ['At risk', 'Open', () => ui.open(item)] : null
}

function ReviewLayout({ lists, ui, selected, openNote }) {
  const queue = KINDS.flatMap((kind) => lists[kind].map((item) => [item, attentionOf(item, ui)]).filter(([, why]) => why))
  const linked = (kind) => new Set(lists.initiative.flatMap((i) => i[`${kind}s`].map((link) => link.id)))
  const [milestones, objectives] = [linked('milestone'), linked('objective')]
  const loose = [...lists.milestone.filter((m) => !milestones.has(m.id)), ...lists.objective.filter((o) => !objectives.has(o.id))]
  const child = (kind, initiative) => initiative[`${kind}s`].map((link) => {
    const item = lists[kind].find((row) => row.id === link.id)
    return item ? jsx(Row, { item, ui, depth: 1, relationship: link.relationship, selected: sameItem(item, selected) }, `${initiative.id}:${kind}:${item.id}`) : null
  })
  return jsxs('div', { className: 'dy-plan-review', 'data-plan-layout-body': 'C', children: [
    jsxs('section', { className: 'dy-plan-queue', 'data-plan-queue': true, 'aria-label': 'Needs your attention', children: [
      jsx(SectionHead, { title: 'Needs your attention', count: queue.length, ui }),
      queue.length === 0
        ? jsx('p', { className: 'dy-plan-empty', children: 'Nothing needs a decision. Every initiative is decided, measured and on time.' })
        : jsx('ol', { className: 'dy-plan-queue-list', children: queue.map(([item, [why, label, onAct, variant]]) => jsxs('li', { 'data-plan-queue-item': `${item.kind}:${item.id}`, children: [
            jsx(KindGlyph, { kind: item.kind }),
            jsx('button', { type: 'button', className: 'dy-plan-row-open', onClick: () => ui.open(item), children: jsxs('span', { className: 'dy-plan-row-text', children: [jsx('strong', { children: item.title }), jsx('small', { children: why })] }) }),
            ui.readOnly ? null : jsx(Button, { small: true, variant, action: `plan-queue-${label.toLowerCase()}`, onClick: onAct, children: label }),
          ] }, `${item.kind}:${item.id}`)) }),
    ] }),
    lists.goal.length ? jsxs('section', { className: 'dy-plan-goalstrip', 'aria-label': 'Goals', 'data-plan-section': 'goal', children: [
      jsx('span', { className: 'dy-plan-goalstrip-label', children: 'Goals' }),
      ...lists.goal.map((goal) => jsxs('button', { type: 'button', className: ['dy-plan-goalchip', sameItem(goal, selected) && 'selected', goal.archived && 'archived'].filter(Boolean).join(' '),
        'data-plan-row': 'goal', 'data-plan-id': goal.id, onClick: () => ui.open(goal), children: [jsx('strong', { children: goal.title }), jsx(StatusTag, statusOf(goal))] }, goal.id)),
      ui.readOnly ? null : jsx(Button, { small: true, action: 'plan-new-goal', onClick: () => ui.create('goal'), children: '+ Goal' }),
    ] }) : null,
    jsxs('section', { className: 'dy-plan-section', 'data-plan-section': 'initiative', 'aria-label': 'Plan by initiative', children: [
      jsx(SectionHead, { kind: 'initiative', count: lists.initiative.length, ui, note: openNote }),
      lists.initiative.length
        ? jsx('div', { className: 'dy-plan-rows', role: 'list', children: lists.initiative.flatMap((initiative) => [
            jsx(Row, { item: initiative, ui, selected: sameItem(initiative, selected) }, initiative.id), ...child('milestone', initiative), ...child('objective', initiative)]) })
        : jsx('p', { className: 'dy-plan-empty', children: EMPTY.initiative }),
    ] }),
    jsxs('section', { className: 'dy-plan-section', 'data-plan-section': 'loose', 'aria-label': 'Not linked to an initiative', children: [
      jsx(SectionHead, { title: 'Not linked to an initiative', count: loose.length, ui, actions: jsxs('span', { className: 'dy-plan-head-actions', children: [
        jsx(Button, { small: true, action: 'plan-new-milestone', onClick: () => ui.create('milestone'), children: '+ Milestone' }),
        jsx(Button, { small: true, action: 'plan-new-objective', onClick: () => ui.create('objective'), children: '+ Objective' }),
      ] }) }),
      jsx(Rows, { items: loose, ui, selected, empty: 'Every milestone and objective belongs to an initiative.' }),
    ] }),
  ] })
}

// Reviews use the Inbox's approval panel (same checks, same decisions),
// handed the same initiative record the Inbox gives it.
function ReviewDialog({ initiative, projectId, onClose, onResolved }) {
  const item = { ref: initiative.ref, title: initiative.title, risk: initiative.risk, project: projectId, detail: initiative.record }
  return jsx(PlanDialog, {
    dialogKey: 'review', eyebrow: `Review · ${projectId}`, title: initiative.title, wide: true, onClose,
    actions: [jsx(Button, { onClick: onClose, children: 'Close' }, 'close')],
    children: jsx(ApprovalDetail, { item, onResolved: () => { onResolved(); onClose() } }),
  })
}

export function PlanScreen({ project, focus, onFocusConsumed, onOpenRoadmap }) {
  const [plan, setPlan] = useState(null)
  const [failure, setFailure] = useState(null)
  const [layout, setLayout] = useState('A')
  const [selected, setSelected] = useState(null)
  const [dialog, setDialog] = useState(null)
  const [confirm, setConfirm] = useState(null)
  const [query, setQuery] = useState('')
  const [showArchived, setShowArchived] = useState(false)
  const actions = useMemo(() => planActions(project.id), [project.id])
  const reload = useCallback(async () => {
    try { setPlan(await loadPlan(project.id)); setFailure(null) } catch (error) { setFailure(errorText(error)) }
  }, [project.id])
  useEffect(() => { setPlan(null); setSelected(null); reload() }, [reload])
  useEffect(() => {
    if (!focus || !plan) return
    const item = findItem(plan, focus)
    if (item) { setSelected({ kind: item.kind, id: item.id }); if (item.archived) setShowArchived(true) }
    onFocusConsumed?.()
  }, [focus, plan])
  // One Escape handler: it closes the drawer or the trace, never while a
  // dialog, confirmation or menu has the key (they handle their own Escape).
  useEffect(() => {
    if (!selected) return undefined
    const key = (event) => {
      if (event.key === 'Escape' && !document.querySelector('[data-plan-dialog], [data-destructive-confirm], .dy-plan-menu-list')) setSelected(null)
    }
    document.addEventListener('keydown', key)
    return () => document.removeEventListener('keydown', key)
  }, [selected])
  if (!plan) {
    return jsxs('section', { className: 'dockyard-feature-card', 'data-plan-screen': failure ? 'error' : 'loading', 'aria-busy': !failure, children: failure ? [
      jsx('h2', { children: 'Plan' }), jsx('p', { className: 'dockyard-inline-error', role: 'alert', children: `The plan could not be loaded: ${failure}` }),
      jsx(Button, { action: 'plan-retry', onClick: reload, children: 'Try again' }),
    ] : [jsx('p', { className: 'dockyard-meta', children: 'Loading the plan…' })] })
  }

  const noun = (item) => KIND_LABEL[item.kind].toLowerCase()
  const ui = {
    readOnly: !plan.canWrite,
    // In Columns, picking the traced card again clears the trace.
    open: (item) => setSelected((current) => (layout === 'B' && sameItem(current, item) ? null : { kind: item.kind, id: item.id })),
    create: (kind, linkTo) => setDialog({ type: 'form', kind, mode: 'create', linkTo }),
    edit: (item) => setDialog({ type: 'form', kind: item.kind, mode: 'edit', item }),
    link: (item, target) => setDialog({ type: 'link', from: item, target }),
    review: (item) => setDialog({ type: 'review', item }),
    confirm: setConfirm,
    archive: (item) => setConfirm({
      key: 'plan-archive', title: `Archive this ${noun(item)}?`, label: 'Archive', done: `${KIND_LABEL[item.kind]} archived.`,
      description: item.kind === 'objective' ? `“${item.title}” stops being evaluated and leaves the plan. It can then be deleted for good.`
        : `“${item.title}” is hidden from the plan${item.kind === 'milestone' ? ' and the Roadmap' : ''}. Restore it any time from Show archived.`,
      run: () => ({ milestone: () => actions.archiveMilestone(item.name), objective: () => actions.archiveObjective(item.id), goal: () => actions.archiveGoal(item.id) })[item.kind](),
    }),
    restore: (item) => setConfirm({
      key: 'plan-restore', title: `Restore this ${noun(item)}?`, label: 'Restore', done: `${KIND_LABEL[item.kind]} restored.`,
      description: `“${item.title}” returns to the plan.`,
      run: () => (item.kind === 'milestone' ? actions.restoreMilestone(item.name) : actions.restoreGoal(item.id)),
    }),
    remove: (item) => setConfirm({
      key: 'plan-delete', title: 'Delete this objective for good?', label: 'Delete', done: 'Objective deleted.',
      description: `“${item.title}” and its links to goals and initiatives are removed. This cannot be undone.`,
      run: () => actions.removeObjective(item.id), after: () => setSelected(null),
    }),
  }
  const needle = query.trim().toLowerCase()
  const lists = Object.fromEntries(KINDS.map((kind) => [kind, listOf(plan, kind).filter((item) => (showArchived || !item.archived) && item.title.toLowerCase().includes(needle))]))
  const openCount = plan.initiatives.filter((row) => OPEN_STATUSES.includes(row.status)).length
  const openNote = `${number(openCount)} of ${number(plan.maxOpenInitiatives)} open allowed`
  const reviewCount = plan.initiatives.filter(needsReview).length
  const archivedCount = KINDS.reduce((sum, kind) => sum + listOf(plan, kind).filter((row) => row.archived).length, 0)
  const selectedItem = findItem(plan, selected)
  const Layout = { A: OutlineLayout, B: ColumnsLayout, C: ReviewLayout }[layout]
  const done = () => { setDialog(null); reload() }

  return jsxs('section', { className: `dy-plan${selectedItem ? ' with-drawer' : ''}`, 'data-plan-screen': project.id, 'data-plan-layout': layout, children: [
    jsxs('div', { className: 'dy-plan-review-bar', 'data-design-review': 'plan', role: 'group', 'aria-label': 'Design review: Plan layout', children: [
      jsx('span', { children: 'Design review · Plan layout' }),
      ...LAYOUTS.map(([key, label]) => jsx('button', { type: 'button', 'aria-pressed': layout === key, 'data-plan-layout-choice': key, onClick: () => setLayout(key), children: `${key} · ${label}` }, key)),
    ] }),
    jsxs('header', { className: 'dy-plan-head', children: [
      jsxs('div', { children: [
        jsx('h2', { children: 'Plan' }),
        jsx('p', { className: 'dockyard-meta', children: `Initiatives, milestones, objectives and goals for ${plan.label}. The Roadmap shows them across all projects.` }),
      ] }),
      jsxs('div', { className: 'dy-plan-toolbar', children: [
        reviewCount ? jsx(Tag, { tone: 'warning', data: { 'data-plan-review-count': reviewCount }, children: `${number(reviewCount)} to review` }) : null,
        jsx('input', { type: 'search', className: 'dy-plan-search', placeholder: 'Find in plan', 'aria-label': 'Find in plan', 'data-plan-search': true, value: query, onChange: (event) => setQuery(event.target.value) }),
        jsxs('label', { className: 'dy-plan-check', children: [
          jsx('input', { type: 'checkbox', 'data-plan-show-archived': true, checked: showArchived, onChange: (event) => setShowArchived(event.target.checked) }),
          `Show archived${archivedCount ? ` (${number(archivedCount)})` : ''}`,
        ] }),
        ui.readOnly ? null : jsx(Menu, { label: 'Create', trigger: '+ New', action: 'new', variant: 'primary', items: KINDS.map((kind) => ({
          id: kind, label: kind === 'initiative' ? 'Propose an initiative…' : `New ${KIND_LABEL[kind].toLowerCase()}…`, onSelect: () => ui.create(kind),
        })) }),
        jsx(Menu, { label: 'More plan actions', trigger: '⋯', action: 'plan-more', items: [
          onOpenRoadmap ? { id: 'roadmap', label: 'Open the Roadmap (all projects)', onSelect: onOpenRoadmap } : null,
          ui.readOnly ? null : { id: 'freeze', label: 'Freeze project…', danger: true, onSelect: () => setConfirm({
            key: 'freeze-project', title: 'Freeze this project?', description: 'Freezing stops new execution until the project is explicitly resumed.',
            label: 'Freeze project', done: 'Project frozen. New execution stops until it is resumed.', run: actions.freeze,
          }) },
        ] }),
      ] }),
    ] }),
    ui.readOnly ? jsx('p', { className: 'dy-plan-note', role: 'status', children: 'Read-only: this session can view the plan but not change it.' }) : null,
    failure ? jsx('p', { className: 'dockyard-inline-error', role: 'alert', children: `Last refresh failed: ${failure}` }) : null,
    jsx(MissionStrip, { plan, actions, onChanged: reload, onConfirm: setConfirm }, `${project.id}:${plan.mission}`),
    jsxs('div', { className: 'dy-plan-main', children: [
      jsx(Layout, { plan, lists, ui, selected, openNote }),
      // Narrow screens show the drawer as a bottom sheet; the backdrop closes it.
      selectedItem ? jsx('div', { className: 'dy-plan-sheet-backdrop', 'aria-hidden': true, onClick: () => setSelected(null) }) : null,
      selectedItem ? jsx(PlanDrawer, { item: selectedItem, plan, actions, ui, onClose: () => setSelected(null), onChanged: reload }, `${selectedItem.kind}:${selectedItem.id}`) : null,
    ] }),
    dialog?.type === 'form' ? jsx(ItemForm, { kind: dialog.kind, mode: dialog.mode, item: dialog.item, linkTo: dialog.linkTo, plan, actions, onClose: () => setDialog(null), onDone: done }) : null,
    dialog?.type === 'link' ? jsx(LinkDialog, {
      from: dialog.from, target: dialog.target, plan, actions, onClose: () => setDialog(null), onDone: done,
      // From an initiative, a milestone or objective can be created and linked in one go.
      onCreateNew: dialog.from.kind === 'initiative'
        ? () => setDialog({ type: 'form', kind: dialog.target, mode: 'create', linkTo: { ref: dialog.from.ref, title: dialog.from.title, relationship: dialog.target === 'milestone' ? 'delivers' : 'supports' } })
        : null,
    }) : null,
    dialog?.type === 'review' ? jsx(ReviewDialog, { initiative: dialog.item, projectId: project.id, onClose: () => setDialog(null), onResolved: reload }) : null,
    confirm ? jsx(Confirm, { spec: confirm, onCancel: () => setConfirm(null), onDone: () => { setConfirm(null); reload() } }) : null,
  ] })
}
