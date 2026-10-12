// GENERATED-STRUCTURE: hand-edited Desktop module. Edit this file, then run
// node hermes_dockyard_plugin/desktop/build.mjs to regenerate plugin.js.
//
// R2 Phase C: the Roadmap screen. Signed design = the roadmap-v4 OUTLINE study
// only: a project-first collapsible tree (Project -> Initiative -> Milestone ->
// Objective -> Goal), honest bucket counts, "Not linked yet" with a link flow
// that never invents data, and a detail drawer per node. Dates/quarters are
// not an axis; there is no percentage anywhere.
//
// Every node carries the project it belongs to, so the drawer, the goal
// contract, Open and Link… always act on that project, in All-projects scope
// too. Link… makes the human choose the item AND the initiative, then confirm;
// it shows only when the server says this principal may write (can_write).
import { api } from '../runtime/context.js'
import { emitToast } from '../runtime/context.js'
import { UNLINKED_LABEL } from '../data/unlinked.js'
import { UNLINKED_TITLE } from '../data/unlinked.js'
import { unavailableWords } from '../data/unlinked.js'
import { useEffect } from '../runtime/react.js'
import { useMemo } from '../runtime/react.js'
import { useRef } from '../runtime/react.js'
import { useState } from '../runtime/react.js'
import { Fragment } from '../runtime/react.js'
import { jsx } from '../runtime/react.js'
import { jsxs } from '../runtime/react.js'
import { Button } from '../lib/ui.js'
import { EmptyState } from '../lib/ui.js'
import { ErrorState } from '../lib/ui.js'
import { Icon } from '../lib/ui.js'
import { LoadingState } from '../lib/ui.js'
import { PageHead } from '../lib/ui.js'
import { number } from '../lib/ui.js'
import { plural } from '../lib/ui.js'
import { useDialogFocusManager } from '../lib/ui.js'
import { loadRoadmapData } from '../data/loaders.js'
import { BUCKETS } from '../lib/plan-vocab.js'
import { ICON } from '../lib/plan-vocab.js'

const CONTRACT_STATUS = { active: 'Active', paused: 'Paused', done: 'Done', cleared: 'Cleared' }

// v42 placement: one parent per level. The Roadmap only shows and places; each
// item's own screen still owns create/edit. The human picks the parent from the
// project's own candidates, so a stale or cross-project list is never offered
// and nothing is chosen for them.
const PLACE_KIND = {
  milestone: {
    title: 'Place a milestone under an initiative',
    itemLabel: 'Milestone',
    path: (projectId, itemId) => `/projects/${encodeURIComponent(projectId)}/milestones/${itemId}/initiative`,
    candidates: (project) => (project.initiatives ?? [])
      .filter((row) => row.governance !== 'rejected' && row.governance !== 'cancelled')
      .map((row) => ({ id: row.ref, label: row.title })),
  },
  objective: {
    title: 'Place an objective under a milestone',
    itemLabel: 'Objective',
    path: (projectId, itemId) => `/projects/${encodeURIComponent(projectId)}/objectives/${itemId}/milestone`,
    candidates: (project) => (project.milestones ?? []).map((row) => ({ id: String(row.id), label: row.name })),
  },
  goal: {
    title: 'Place a goal under an objective',
    itemLabel: 'Goal',
    path: (projectId, itemId) => `/projects/${encodeURIComponent(projectId)}/goals/${encodeURIComponent(itemId)}/objective`,
    candidates: (project) => (project.objectives ?? []).map((row) => ({ id: String(row.id), label: row.name })),
  },
  task: {
    title: 'Place a task under a goal',
    itemLabel: 'Task',
    path: (projectId, itemId) => `/projects/${encodeURIComponent(projectId)}/tasks/${encodeURIComponent(itemId)}/goal`,
    candidates: (project) => (project.goals ?? []).map((row) => ({ id: row.id, label: row.title })),
  },
}

// Derived states, exactly as the backend computes them. Unknown is unknown:
// never rendered as met, and never as zero.
const STATE_LABEL = {
  not_started: 'Not started', in_progress: 'In progress', met: 'Met',
  at_risk: 'At risk', unknown: 'Unknown', reached: 'Reached', not_reached: 'Not reached',
}
const milestoneStateWords = (row) => (
  `${STATE_LABEL[row.state] ?? words(row.state)}${row.overdue ? ' · overdue' : ''}${row.closed ? ' · closed' : ''}`)
const objectiveStateWords = (row) => {
  const check = row.check?.state
  const checkText = check && check !== 'no_check' ? ` · check ${STATE_LABEL[check] ?? words(check)}` : ''
  return `${STATE_LABEL[row.state] ?? words(row.state)}${checkText}`
}
const goalStateWords = (row) => {
  const check = row.check?.state
  const checkText = check && check !== 'no_check' ? ` · check ${STATE_LABEL[check] ?? words(check)}` : ''
  const tasks = row.task_count ? ` · ${row.task_count} ${row.task_count === 1 ? 'task' : 'tasks'}` : ' · no tasks'
  return `${STATE_LABEL[row.state] ?? words(row.state)}${tasks}${checkText}`
}

const words = (value) => String(value ?? '').replace(/_/g, ' ')
const chip = (text, tone = '') => jsx('span', { className: `dy-rm-chip${tone ? ` ${tone}` : ''}`, children: text })

// W3C APG tree pattern with one roving tab stop (the row holding tabIndex 0).
// Down/Up move between visible rows; Right opens a closed node or moves to the
// first child of an open one; Left closes an open node or moves to the parent;
// Home/End jump; Enter/Space activate the focused row (never its inner buttons).
function treeKeydown(event) {
  const rows = [...event.currentTarget.querySelectorAll('[data-rm-row]')]
  const row = document.activeElement?.closest?.('[data-rm-row]')
  const index = rows.indexOf(row)
  if (index < 0) return
  const move = (target) => { event.preventDefault(); target?.focus() }
  const level = Number(row.getAttribute('aria-level'))
  if (event.key === 'ArrowDown') move(rows[index + 1])
  else if (event.key === 'ArrowUp') move(rows[index - 1])
  else if (event.key === 'Home') move(rows[0])
  else if (event.key === 'End') move(rows[rows.length - 1])
  else if (event.key === 'ArrowRight' && row.dataset.rmExpandable === 'true') {
    event.preventDefault()
    if (row.dataset.rmOpen === 'true') rows[index + 1]?.focus()
    else row.querySelector('[data-rm-disclosure]')?.click()
  } else if (event.key === 'ArrowLeft') {
    event.preventDefault()
    if (row.dataset.rmOpen === 'true') row.querySelector('[data-rm-disclosure]')?.click()
    else rows.slice(0, index).reverse().find((other) => Number(other.getAttribute('aria-level')) === level - 1)?.focus()
  } else if ((event.key === 'Enter' || event.key === ' ') && event.target === row) {
    event.preventDefault(); row.click()
  }
}

function deliveryChips(delivery) {
  if (!delivery) return null
  if (delivery.state === 'no_linked_work') return chip('No linked work')
  if (delivery.state === 'unavailable') return chip(delivery.reason === 'unlinked' ? UNLINKED_LABEL : 'Unavailable')
  const chips = BUCKETS
    .map(([key, label]) => Number(delivery[key] ?? 0) > 0
      ? jsx('span', { className: 'dy-rm-chip', children: `${label} ${number(delivery[key])}` }, key)
      : null)
    .filter(Boolean)
  if (Number(delivery.blocked ?? 0) > 0) {
    chips.push(jsx('span', { className: 'dy-rm-chip blocked', children: `Blocked ${number(delivery.blocked)}` }, 'blocked'))
  }
  chips.push(jsx('span', { className: 'dy-rm-chip', children: `${number(delivery.total)} total` }, 'total'))
  return chips
}

function deliveryDetail(delivery) {
  if (!delivery) return []
  if (delivery.state === 'no_linked_work') return [['Linked work', 'No linked work']]
  if (delivery.state === 'unavailable') return [['Linked work', unavailableWords(delivery.reason)]]
  return [
    ...BUCKETS.map(([key, label]) => [label, number(delivery[key] ?? 0)]),
    ['Blocked', number(delivery.blocked ?? 0)],
    ['Total linked', number(delivery.total)],
  ]
}

function focusProps(node, tabStop, onFocusRow) {
  return {
    'data-rm-node': node,
    tabIndex: tabStop ? 0 : -1,
    onFocus: (event) => { if (event.target === event.currentTarget) onFocusRow(node) },
  }
}

function Row({ node, type, depth, label, detail, open, expandable, selected, tabStop, chips, actions, onFocusRow, onToggle, onOpen }) {
  return jsxs('div', {
    className: `dy-rm-row depth-${depth}`,
    'data-rm-row': true,
    'data-rm-expandable': String(Boolean(expandable)),
    'data-rm-open': String(Boolean(open)),
    'data-selected': String(Boolean(selected)),
    role: 'treeitem',
    'aria-level': depth + 1,
    'aria-expanded': expandable ? Boolean(open) : undefined,
    'aria-selected': Boolean(selected),
    ...focusProps(node, tabStop, onFocusRow),
    onClick: () => onOpen(),
    children: [
      jsx('button', {
        type: 'button', className: `dy-rm-disclosure${expandable ? '' : ' blank'}`,
        'data-rm-disclosure': true, tabIndex: -1, 'aria-hidden': !expandable,
        'aria-label': `${open ? 'Collapse' : 'Expand'} ${label}`,
        onClick: (event) => { event.stopPropagation(); if (expandable) onToggle() },
        children: open ? '−' : '+',
      }),
      jsx('span', { className: `dy-rm-icon ${type}`, 'aria-hidden': true, children: ICON[type] ?? '·' }),
      jsxs('span', { className: 'dy-rm-copy', children: [
        jsx('strong', { children: label }),
        jsx('small', { children: detail }),
      ]}),
      jsx('span', { className: 'dy-rm-chips', children: chips ?? null }),
      // Actions sit outside the chip strip: the narrow layout hides chips, never actions.
      actions ? jsx('span', { className: 'dy-rm-row-actions', children: actions }) : null,
    ],
  })
}

function PlainRow({ node, depth, label, detail, tabStop, onFocusRow }) {
  return jsx('div', {
    className: `dy-rm-row depth-${depth}`, 'data-rm-row': true,
    role: 'treeitem', 'aria-level': depth + 1, ...focusProps(node, tabStop, onFocusRow),
    children: jsxs('span', { className: 'dy-rm-copy', children: [jsx('strong', { children: label }), jsx('small', { children: detail })] }),
  })
}

function MilestoneItems({ projectId, milestoneId, onOpen }) {
  const [items, setItems] = useState(null)
  const [error, setError] = useState(null)
  useEffect(() => {
    let current = true
    api(`/roadmap/projects/${encodeURIComponent(projectId)}/milestones/${milestoneId}/items`)
      .then((result) => { if (current) { setItems(result.items ?? []); setError(result.state !== 'unavailable' ? null : result.reason === 'unlinked' ? `${UNLINKED_TITLE}: its work items cannot be shown.` : 'Work items are unavailable (the work host did not respond).') } })
      .catch((failure) => { if (current) setError(String(failure?.message ?? failure)) })
    return () => { current = false }
  }, [projectId, milestoneId])
  if (error) return jsx('p', { role: 'status', children: error })
  if (!items) return jsx('p', { role: 'status', children: 'Loading work items…' })
  if (!items.length) return jsx('p', { role: 'status', children: 'No work items are attached to this milestone.' })
  return jsx('ul', { className: 'dy-rm-items', children: items.map((item) => jsxs('li', { children: [
    jsx('strong', { children: item.title }),
    jsx('small', { children: words(item.bucket) }),
    Array.isArray(item.blockers) && item.blockers.length
      ? jsx('small', { children: `waiting on ${item.blockers.join(', ')}` })
      : null,
    jsx(Button, {
      small: true, action: 'roadmap-open-work', ariaLabel: `Open ${item.title} on the project board`,
      onClick: (event) => { event.stopPropagation(); onOpen({ project: projectId, entryView: 'board', workRef: item.ref }) },
      children: 'Open',
    }),
  ] }, item.ref)) })
}

function MilestoneItemsRow({ node, projectId, milestoneId, tabStop, onFocusRow, onOpen }) {
  return jsx('div', {
    className: 'dy-rm-row depth-3', 'data-rm-row': true, 'data-rm-items-row': milestoneId,
    role: 'treeitem', 'aria-level': 4, ...focusProps(node, tabStop, onFocusRow),
    children: jsx('div', { style: { minWidth: 0, flex: 1 }, children: jsx(MilestoneItems, { projectId, milestoneId, onOpen }) }),
  })
}

// The goal contract, read-only (plan §5). An outcome that still equals the
// goal title is labelled as copied, never presented as a separate statement.
function contractFacts(entry, goalTitle) {
  if (!entry || entry.loading) return [['Goal contract', 'Loading…']]
  if (entry.error) return [['Goal contract', `Unavailable: ${entry.error}`]]
  const contract = entry.contract
  const text = (value) => (value === null || value === undefined || String(value).trim() === '' ? '—' : String(value))
  const outcome = String(contract.outcome ?? '').trim()
  const copied = outcome !== '' && outcome === String(goalTitle ?? '').trim()
  return [
    ['Outcome', copied
      ? jsxs(Fragment, { children: [contract.outcome, jsx('small', { className: 'dy-rm-copied', children: 'Copied from the goal title' })] })
      : text(contract.outcome)],
    ['Contract status', CONTRACT_STATUS[contract.status] ?? words(contract.status)],
    ...(contract.status === 'paused' ? [['Paused because', text(contract.paused_reason)]] : []),
    ['Verification', text(contract.verification)],
    ['Constraints', text(contract.constraints)],
    ['Boundaries', text(contract.boundaries)],
    ['Stop when', text(contract.stop_when)],
    ...(contract.max_turns !== null && contract.max_turns !== undefined ? [['Turn limit', number(contract.max_turns)]] : []),
  ]
}

// The drawer always reads the project the selected node belongs to.
function drawerBody(sel, project, contract, onOpen) {
  // "Open" lands on the project, or on the item itself inside its Plan screen.
  const open = { project: project.id, entryView: sel.type === 'project' ? 'overview' : `plan:${sel.type}:${sel.id}` }
  const initiativeOf = (ref) => (project.initiatives ?? []).find((row) => row.ref === ref)
  if (sel.type === 'project') {
    return {
      title: project.label ?? project.id, subtitle: project.mission || 'No mission recorded', open,
      facts: [
        ['Initiatives', number(project.initiatives?.length ?? 0)],
        ['Goals', number(project.goals?.length ?? 0)],
        ['Milestones not placed', number(project.not_placed?.milestones?.length ?? 0)],
        ['Objectives not placed', number(project.not_placed?.objectives?.length ?? 0)],
        ['Goals not placed', number(project.not_placed?.goals?.length ?? 0)],
        ['Needs placing', number(project.needs_placing?.length ?? 0)],
        ['Work host', project.work_host === 'unavailable' ? 'Unavailable' : 'Connected'],
      ],
    }
  }
  if (sel.type === 'initiative') {
    const initiative = initiativeOf(sel.id)
    if (!initiative) return null
    return {
      title: initiative.title, subtitle: `Governance: ${words(initiative.governance)}`, open,
      facts: [
        ...deliveryDetail(initiative.delivery),
        ['Milestones', number((initiative.milestones ?? []).length)],
        ['Work not placed under a goal', number((initiative.not_placed?.tasks ?? []).length)],
        ['Attention', initiative.attention_reasons?.length ? initiative.attention_reasons.map(words).join(', ') : 'none'],
      ],
    }
  }
  if (sel.type === 'milestone') {
    const milestone = project.milestones.find((row) => row.id === sel.id)
    if (!milestone) return null
    return {
      title: milestone.name, open,
      subtitle: `${STATE_LABEL[milestone.state] ?? words(milestone.state)}${milestone.initiative_ref ? ` · under ${milestone.initiative_ref}` : ' · not placed yet'}`,
      facts: [
        ...deliveryDetail(milestone.delivery),
        ['Due', milestone.due ?? 'No due date'],
        ['Closed', milestone.closed ? 'Yes' : 'No'],
        ...(milestone.overdue ? [['Overdue', 'Yes — past due and not closed']] : []),
        ['Objectives', number((milestone.objectives ?? []).length)],
      ],
      extra: jsx(MilestoneItems, { projectId: project.id, milestoneId: milestone.id, onOpen }),
    }
  }
  if (sel.type === 'objective') {
    const objective = project.objectives.find((row) => row.id === sel.id)
    if (!objective) return null
    const check = objective.check ?? {}
    return {
      title: objective.name, open,
      subtitle: `${STATE_LABEL[objective.state] ?? words(objective.state)}${objective.milestone_id ? ` · under milestone ${objective.milestone_id}` : ' · not placed yet'}`,
      facts: [
        ['State', STATE_LABEL[objective.state] ?? words(objective.state)],
        ['Check', check.state === 'no_check' || !check.state ? 'No check' : STATE_LABEL[check.state] ?? words(check.state)],
        ['Evidence window', check.window ?? '—'],
        ['Last evaluated', check.evaluated_at ?? 'Never'],
        ['Goals', number((objective.goals ?? []).length)],
      ],
    }
  }
  if (sel.type === 'goal') {
    const goal = (project.goals ?? []).find((row) => row.id === sel.id)
    if (!goal) return null
    const entry = contract?.key === `${project.id}/${goal.id}` ? contract : null
    const check = goal.check ?? {}
    return {
      title: goal.title, subtitle: 'Goal · its contract is read-only here', open,
      facts: [
        ['State', STATE_LABEL[goal.state] ?? words(goal.state)],
        ['Tasks', number(goal.task_count ?? 0)],
        ['Check', check.state === 'no_check' || !check.state ? 'No check' : STATE_LABEL[check.state] ?? words(check.state)],
        ['Placed under', goal.objective_id ? `Objective ${goal.objective_id}` : 'Not placed yet'],
        ...contractFacts(entry, goal.title),
      ],
    }
  }
  return null
}

function Drawer({ type, body, onClose, onOpen }) {
  return jsxs('aside', { className: 'dy-rm-drawer', 'aria-live': 'polite', 'data-rm-drawer': type, children: [
    jsxs('header', { className: 'dy-rm-drawer-head', children: [
      jsx('p', { className: 'dockyard-meta', children: type }),
      jsx('h3', { children: body.title }),
      jsx('p', { children: body.subtitle }),
    ]}),
    jsxs('div', { className: 'dy-rm-drawer-body', children: [
      jsx('ul', { className: 'dy-rm-facts', children: body.facts.map(([label, value]) => jsxs('li', { children: [
        jsx('span', { children: label }),
        jsx('span', { children: value }),
      ] }, label)) }),
      body.extra ?? null,
      jsxs('div', { className: 'dy-rm-actions', children: [
        jsx(Button, { variant: 'primary', action: 'roadmap-open', ariaLabel: `Open ${body.title} on its project screen`, onClick: () => onOpen(body.open), children: 'Open' }),
        jsx(Button, { onClick: onClose, children: 'Close' }),
      ]}),
    ]}),
  ]})
}

function PlaceDialog({ kind, itemId, projectId, projectLabel, onClose, onDone }) {
  const spec = PLACE_KIND[kind]
  const [candidates, setCandidates] = useState(null)
  const [parent, setParent] = useState('')
  const [step, setStep] = useState('choose')
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  useDialogFocusManager(`[data-rm-place-dialog][data-rm-step="${step}"] .dy-rm-modal`)
  useEffect(() => {
    let current = true
    loadRoadmapData(projectId)
      .then((result) => {
        if (!current) return
        const project = result.projects?.[0]
        setCandidates(project ? spec.candidates(project) : [])
      })
      .catch((failure) => { if (current) setError(String(failure?.message ?? failure)) })
    return () => { current = false }
  }, [])
  const parentLabel = candidates?.find((row) => row.id === parent)?.label ?? ''
  const ready = Boolean(candidates && parent)
  // A null parent is a real instruction: it unplaces the item ("Not placed yet").
  const submit = async (nextParent) => {
    setBusy(true); setError(null)
    try {
      await api(spec.path(projectId, itemId), { method: 'PUT', body: { parent_id: nextParent } })
      emitToast('success', nextParent === null
        ? `Removed the parent of “${itemId}”. It is now not placed yet.`
        : `Placed “${itemId}” under “${parentLabel}”.`)
      onDone()
    } catch (failure) {
      setError(String(failure?.message ?? failure))
      setBusy(false)
    }
  }
  const field = (id, label, value, onChange, options) => jsxs('label', { htmlFor: id, children: [
    label,
    jsx('select', { id, value, onChange: (event) => onChange(event.target.value), children: options }),
  ]})
  const choose = jsxs('div', { className: 'dy-rm-modal-body', children: [
    candidates === null && !error ? jsx('p', { role: 'status', children: 'Loading choices…' }) : null,
    candidates && candidates.length === 0
      ? jsx('p', { children: `Nothing to place it under: this project has no candidates yet. Create one on the project screen first.` })
      : null,
    candidates && candidates.length > 0
      ? field('dy-rm-place-choice', spec.itemLabel === 'Milestone' ? 'Initiative'
          : spec.itemLabel === 'Objective' ? 'Milestone'
          : spec.itemLabel === 'Goal' ? 'Objective' : 'Goal',
          parent, setParent, [
            jsx('option', { value: '', children: 'Choose…' }, ''),
            ...candidates.map((row) => jsx('option', { value: row.id, children: row.label }, row.id)),
          ])
      : null,
    jsx('p', { className: 'dy-rm-modal-error', role: 'alert', children: error }),
  ]})
  const confirm = jsxs('div', { className: 'dy-rm-modal-body', 'data-rm-place-confirm': true, children: [
    jsx('p', { className: 'dy-rm-confirm', children: `Place the ${spec.itemLabel.toLowerCase()} “${itemId}” under “${parentLabel}”?` }),
    jsx('p', { className: 'dy-rm-confirm', children: 'This records one placement and an audit entry under your name.' }),
    jsx('p', { className: 'dy-rm-modal-error', role: 'alert', children: error }),
  ]})
  return jsx('div', {
    className: 'dy-rm-modal-backdrop', 'data-rm-place-dialog': true, 'data-rm-step': step,
    onKeyDown: (event) => { if (event.key === 'Escape') { event.stopPropagation(); onClose() } },
    children: jsxs('section', { className: 'dy-rm-modal', role: 'dialog', 'aria-modal': true, 'aria-label': spec.title, children: [
      jsxs('header', { className: 'dy-rm-modal-head', children: [
        jsxs('div', { children: [
          jsx('p', { className: 'dockyard-meta', children: 'Place' }),
          jsx('h3', { children: spec.title }),
          jsx('p', { children: `Project ${projectLabel}` }),
        ] }),
        jsx(Button, { onClick: onClose, ariaLabel: 'Close place dialog', children: '×' }),
      ] }),
      step === 'choose' ? choose : confirm,
      step === 'choose'
        ? jsxs('div', { className: 'dy-rm-modal-actions', children: [
            jsx(Button, { onClick: onClose, children: 'Cancel' }),
            jsx(Button, { variant: 'primary', disabled: !ready, onClick: () => { setError(null); setStep('confirm') }, children: 'Continue' }),
          ] })
        : jsxs('div', { className: 'dy-rm-modal-actions', children: [
            jsx(Button, { disabled: busy, onClick: () => { setError(null); setStep('choose') }, children: 'Back' }),
            jsx(Button, { variant: 'primary', disabled: busy, onClick: () => submit(parent), children: busy ? 'Placing…' : 'Place' }),
          ] }),
    ] }),
  })
}

// initialScope: 'all' (the signed default) or one project id ("View in
// Roadmap", or the global picker while this tab is open). onOpen({ project,
// entryView, workRef }) asks the shell to open the item's own project screen.
function ConfirmDeliveredDialog({ projectId, ref, title, onClose, onDone }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  useDialogFocusManager('[data-rm-confirm-dialog] .dy-rm-modal')
  const submit = async () => {
    setBusy(true); setError(null)
    try {
      await api(
        `/projects/${encodeURIComponent(projectId)}/initiatives/${encodeURIComponent(ref)}/confirm-delivered`,
        { method: 'POST', body: {} })
      emitToast('success', `“${title}” confirmed as delivered.`)
      onDone()
    } catch (failure) {
      // A 409 (a milestone is not reached) shows its message in plain words.
      setError(String(failure?.message ?? failure))
      setBusy(false)
    }
  }
  return jsx('div', {
    className: 'dy-rm-modal-backdrop', 'data-rm-confirm-dialog': true,
    onKeyDown: (event) => { if (event.key === 'Escape') { event.stopPropagation(); onClose() } },
    children: jsxs('section', { className: 'dy-rm-modal', role: 'dialog', 'aria-modal': true, 'aria-label': 'Confirm as delivered', children: [
      jsxs('header', { className: 'dy-rm-modal-head', children: [
        jsxs('div', { children: [
          jsx('p', { className: 'dockyard-meta', children: 'Confirm' }),
          jsx('h3', { children: 'Confirm as delivered' }),
          jsx('p', { children: `Project ${projectId}` }),
        ] }),
        jsx(Button, { onClick: onClose, ariaLabel: 'Close confirm dialog', children: '×' }),
      ] }),
      jsxs('div', { className: 'dy-rm-modal-body', 'data-rm-confirm-body': true, children: [
        jsx('p', { className: 'dy-rm-confirm', children: `Confirm “${title}” as delivered? Every milestone is reached.` }),
        jsx('p', { className: 'dy-rm-confirm', children: 'This records the delivery under your name and an audit entry.' }),
        jsx('p', { className: 'dy-rm-modal-error', role: 'alert', children: error }),
      ] }),
      jsxs('div', { className: 'dy-rm-modal-actions', children: [
        jsx(Button, { disabled: busy, onClick: onClose, children: 'Cancel' }),
        jsx(Button, { variant: 'primary', disabled: busy, onClick: submit, children: busy ? 'Confirming…' : 'Confirm as delivered' }),
      ] }),
    ] }),
  })
}

export function RoadmapView({ initialScope = 'all', onOpen, onRefresh }) {
  // The scope is the switcher's; a new scope re-mounts the view (shell key).
  const [scope] = useState(initialScope)
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [attentionOnly, setAttentionOnly] = useState(false)
  const [openNodes, setOpenNodes] = useState(() => new Set())
  const [selection, setSelection] = useState(null)
  const [focusNode, setFocusNode] = useState(null)
  const [placeDialog, setPlaceDialog] = useState(null)
  const [confirmDialog, setConfirmDialog] = useState(null)
  const [contract, setContract] = useState(null)
  const [refreshTick, setRefreshTick] = useState(0)
  const loadSerial = useRef(0)

  const load = async () => {
    const serial = ++loadSerial.current
    setLoading(true); setError(null); setRefreshTick((tick) => tick + 1)
    try {
      const result = await loadRoadmapData(scope === 'all' ? null : scope)
      if (serial !== loadSerial.current) return
      setData(result)
    } catch (failure) {
      if (serial === loadSerial.current) setError(String(failure?.message ?? failure))
    } finally {
      if (serial === loadSerial.current) setLoading(false)
    }
  }
  useEffect(() => { void load() }, [scope])
  // The goal contract loads for the goal in the drawer, from that goal's project.
  useEffect(() => {
    if (selection?.type !== 'goal' || selection.goal?.unavailable === 'archived') return undefined
    const key = `${selection.projectId}/${selection.id}`
    let current = true
    setContract({ key, loading: true })
    api(`/projects/${encodeURIComponent(selection.projectId)}/goals/${encodeURIComponent(selection.id)}/contract`)
      .then((result) => { if (current) setContract({ key, contract: result }) })
      .catch((failure) => { if (current) setContract({ key, error: String(failure?.message ?? failure) }) })
    return () => { current = false }
  }, [selection?.node, refreshTick])

  const projects = data?.projects ?? []
  const canWrite = data?.can_write === true
  const matches = useMemo(() => {
    const query = search.trim().toLowerCase()
    return (project) => {
      if (attentionOnly && !project.attention) return false
      if (!query) return true
      const haystack = [
        project.id, project.label, project.mission,
        ...(project.initiatives ?? []).flatMap((row) => [
          row.ref, row.title,
          ...(row.milestones ?? []).map((m) => m.name),
          ...(row.objectives ?? []).flatMap((o) => [o.name, o.goal?.title]),
        ]),
        ...(project.goals ?? []).map((g) => g.title),
        ...(project.not_placed?.milestones ?? []).map((m) => m.name),
        ...(project.not_placed?.objectives ?? []).map((o) => o.name),
        ...(project.not_placed?.goals ?? []).map((g) => g.title),
      ].join(' ').toLowerCase()
      return haystack.includes(query)
    }
  }, [search, attentionOnly])

  const toggle = (node) => setOpenNodes((current) => {
    const next = new Set(current)
    if (next.has(node)) next.delete(node); else next.add(node)
    return next
  })
  const openNode = (node) => setOpenNodes((current) => (current.has(node) ? current : new Set([...current, node])))
  // Search reveals the ancestors of every match (plan §5).
  useEffect(() => {
    const query = search.trim().toLowerCase()
    if (!query) return
    setOpenNodes((current) => {
      const next = new Set(current)
      const hit = (value) => String(value ?? '').toLowerCase().includes(query)
      for (const project of projects) {
        for (const row of project.initiatives ?? []) {
          const goalHits = (row.objectives ?? []).filter((o) => o.goal && hit(o.goal.title))
          const childHit = (row.milestones ?? []).some((m) => hit(m.name)) || (row.objectives ?? []).some((o) => hit(o.name)) || goalHits.length > 0
          if (childHit || hit(row.title) || hit(row.ref)) next.add(`project:${project.id}`)
          if (childHit) next.add(`initiative:${row.ref}`)
          for (const o of goalHits) next.add(`objective:${o.id}@${row.ref}`)
        }
        const unplaced = [...(project.not_placed?.milestones ?? []),
                          ...(project.not_placed?.objectives ?? []),
                          ...(project.not_placed?.goals ?? [])]
        if (unplaced.some((x) => hit(x.name ?? x.title))) next.add(`project:${project.id}`)
      }
      return next
    })
  }, [search, data])

  // The caller names the item to place, so the dialog knows which child to PUT.
  // No aria-label: the visible "Place…" is the accessible name (an aria-label
  // would override it and the button would be unfindable by its own text).
  const placeButton = (kind, project, itemId) => jsx(Button, {
    small: true, action: `roadmap-place-${kind}`,
    onClick: (event) => {
      event.stopPropagation()
      setPlaceDialog({ kind, itemId, projectId: project.id, projectLabel: project.label ?? project.id })
    },
    children: 'Place…',
  })

  // Rows are collected as (node, render) pairs so exactly one row holds the
  // roving tab stop: the last focused row while visible, else the first row.
  const rows = []
  const add = (node, render) => rows.push({ node, render })
  const base = (node) => ({ node, selected: selection?.node === node, onFocusRow: setFocusNode })
  const visibleProjects = projects.filter(matches)
  for (const project of visibleProjects) {
    const pid = project.id
    const projectNode = `project:${pid}`
    const projectOpen = openNodes.has(projectNode)
    const initiativeCount = project.initiatives?.length ?? 0
    add(projectNode, (tabStop) => jsx(Row, {
      ...base(projectNode), tabStop, type: 'project', depth: 0,
      label: project.label ?? pid,
      detail: `${number(initiativeCount)} ${plural(initiativeCount, 'initiative')}${project.mission ? ` · ${project.mission}` : ''}`,
      expandable: true, open: projectOpen,
      chips: project.attention ? chip('Needs attention', 'attention') : null,
      onToggle: () => toggle(projectNode),
      onOpen: () => { openNode(projectNode); setSelection({ type: 'project', id: pid, projectId: pid, node: projectNode }) },
    }, projectNode))
    if (!projectOpen) continue
    if (project.features?.initiatives === false) {
      add(`${projectNode}:off`, (tabStop) => jsx(PlainRow, {
        node: `${projectNode}:off`, depth: 1, tabStop, onFocusRow: setFocusNode,
        label: 'Initiatives are turned off for this project.', detail: 'Turn them on in the project settings to use the Roadmap here.',
      }, `${projectNode}:off`))
      continue
    }
    for (const initiative of project.initiatives ?? []) {
      const ref = initiative.ref
      const initiativeNode = `initiative:${ref}`
      const initiativeOpen = openNodes.has(initiativeNode)
      const readyToConfirm = Boolean(initiative.ready_to_confirm)
      add(initiativeNode, (tabStop) => jsx(Row, {
        ...base(initiativeNode), tabStop, type: 'initiative', depth: 1,
        label: initiative.title,
        detail: initiative.attention_reasons?.length
          ? initiative.attention_reasons.map(words).join(' · ')
          : (initiative.delivery?.state === 'ok' ? `${number(initiative.delivery.total)} linked work items` : 'No linked work'),
        expandable: true, open: initiativeOpen,
        chips: jsxs(Fragment, { children: [
          deliveryChips(initiative.delivery),
          readyToConfirm ? chip('Ready to confirm', 'ready') : null,
          initiative.attention ? chip('Attention', 'attention') : null,
        ] }),
        actions: (readyToConfirm && canWrite) ? jsx(Button, {
          small: true, action: 'roadmap-confirm-delivered',
          onClick: (event) => {
            event.stopPropagation()
            setConfirmDialog({ projectId: pid, ref, title: initiative.title })
          },
          children: 'Confirm as delivered',
        }) : null,
        onToggle: () => toggle(initiativeNode),
        onOpen: () => { openNode(initiativeNode); setSelection({ type: 'initiative', id: ref, projectId: pid, node: initiativeNode }) },
      }, initiativeNode))
      if (!initiativeOpen) continue
      // v42: a milestone has ONE initiative, so there is no also_under copy.
      for (const milestone of initiative.milestones ?? []) {
        const milestoneNode = `milestone:${milestone.id}@${ref}`
        const milestoneOpen = openNodes.has(milestoneNode)
        add(milestoneNode, (tabStop) => jsx(Row, {
          ...base(milestoneNode), tabStop, type: 'milestone', depth: 2,
          label: milestone.name,
          detail: milestoneStateWords(milestone),
          expandable: true, open: milestoneOpen,
          chips: jsxs(Fragment, { children: [
            deliveryChips(milestone.delivery),
            milestone.overdue ? chip('Overdue', 'overdue') : null,
          ] }),
          onToggle: () => toggle(milestoneNode),
          onOpen: () => { openNode(milestoneNode); setSelection({ type: 'milestone', id: milestone.id, via: ref, projectId: pid, node: milestoneNode }) },
        }, milestoneNode))
        if (milestoneOpen) {
          const itemsNode = `items:${milestone.id}@${ref}`
          add(itemsNode, (tabStop) => jsx(MilestoneItemsRow, {
            node: itemsNode, projectId: pid, milestoneId: milestone.id, tabStop, onFocusRow: setFocusNode, onOpen,
          }, itemsNode))
          // An objective has ONE milestone, so its goals sit directly beneath it.
          for (const objective of milestone.objectives ?? []) {
            const objectiveNode = `objective:${objective.id}@${milestone.id}@${ref}`
            const objectiveOpen = openNodes.has(objectiveNode)
            add(objectiveNode, (tabStop) => jsx(Row, {
              ...base(objectiveNode), tabStop, type: 'objective', depth: 3,
              label: objective.name,
              detail: objectiveStateWords(objective),
              expandable: (objective.goals ?? []).length > 0, open: objectiveOpen,
              chips: jsx('span', { className: 'dy-rm-chips', children: chip(STATE_LABEL[objective.state] ?? words(objective.state), objective.state === 'met' ? 'passed' : objective.state === 'at_risk' ? 'failed' : '') }),
              onToggle: () => toggle(objectiveNode),
              onOpen: () => { openNode(objectiveNode); setSelection({ type: 'objective', id: objective.id, via: ref, projectId: pid, node: objectiveNode }) },
            }, objectiveNode))
            if (!objectiveOpen) continue
            for (const goal of objective.goals ?? []) {
              const goalNode = `goal:${goal.id}@${objective.id}@${milestone.id}@${ref}`
              const goalOpen = openNodes.has(goalNode)
              add(goalNode, (tabStop) => jsx(Row, {
                ...base(goalNode), tabStop, type: 'goal', depth: 4,
                label: goal.title,
                detail: goalStateWords(goal),
                expandable: (goal.tasks ?? []).length > 0, open: goalOpen,
                chips: jsx('span', { className: 'dy-rm-chips', children: chip(STATE_LABEL[goal.state] ?? words(goal.state), goal.state === 'met' ? 'passed' : goal.state === 'at_risk' ? 'failed' : '') }),
                onToggle: () => toggle(goalNode),
                onOpen: () => { openNode(goalNode); setSelection({ type: 'goal', id: goal.id, projectId: pid, node: goalNode }) },
              }, goalNode))
              if (!goalOpen) continue
              for (const task of goal.tasks ?? []) {
                const taskNode = `task:${task.ref}@${goal.id}@${objective.id}@${ref}`
                add(taskNode, (tabStop) => jsx(Row, {
                  ...base(taskNode), tabStop, type: 'task', depth: 5,
                  label: task.title,
                  detail: words(task.bucket),
                  expandable: false, open: false,
                  chips: null,
                  onToggle: () => {},
                  onOpen: () => onOpen({ project: pid, entryView: 'board', workRef: task.ref }),
                }, taskNode))
              }
            }
          }
        }
      }
      // Work tagged with this initiative but under no goal: "Not placed yet".
      if ((initiative.not_placed?.tasks ?? []).length) {
        const looseNode = `loose:${ref}`
        add(looseNode, (tabStop) => jsx(PlainRow, {
          node: looseNode, depth: 2, tabStop, onFocusRow: setFocusNode,
          label: 'Not placed yet',
          detail: initiative.not_placed.tasks.map((item) => `${item.title} (${words(item.bucket)})`).join(', '),
        }, looseNode))
      }
    }
    // "Not placed yet" groups: one per level, so nothing is ever silently lost.
    // Each unplaced item gets its own row with its own Place… action, because
    // the action must name the item it places.
    const notPlaced = project.not_placed ?? {}
    const notPlacedSpec = [
      ['milestones', 'Milestones not placed under an initiative', 'milestone'],
      ['objectives', 'Objectives not placed under a milestone', 'objective'],
      ['goals', 'Goals not placed under an objective', 'goal'],
    ]
    for (const [kind, groupLabel, placeKind] of notPlacedSpec) {
      const rowsFor = notPlaced[kind] ?? []
      if (!rowsFor.length) continue
      const groupNode = `not-placed-${kind}:${pid}`
      add(groupNode, (tabStop) => jsx(Row, {
        ...base(groupNode), tabStop, type: placeKind, depth: 1,
        label: groupLabel,
        detail: `${rowsFor.length} ${rowsFor.length === 1 ? 'item' : 'items'}`,
        // The group header is a label, not a disclosure: its item rows are
        // always listed, so a "Not placed yet" item is never hidden behind a
        // second click and its Place… action is always reachable.
        expandable: false, open: false,
        chips: null,
        onToggle: () => {},
        onOpen: () => setSelection({ type: 'project', id: pid, projectId: pid, node: groupNode }),
      }, groupNode))
      for (const row of rowsFor) {
        const itemId = String(row.id ?? row.ref)
        const itemNode = `not-placed-${kind}:${pid}:${itemId}`
        add(itemNode, (tabStop) => jsx(Row, {
          ...base(itemNode), tabStop, type: placeKind, depth: 2,
          label: row.name ?? row.title ?? itemId,
          detail: placeKind === 'goal' ? goalStateWords(row) : STATE_LABEL[row.state] ?? words(row.state),
          expandable: false, open: false,
          chips: null,
          actions: canWrite ? placeButton(placeKind, project, itemId) : null,
          onToggle: () => {},
          onOpen: () => setSelection(
            placeKind === 'goal'
              ? { type: 'goal', id: itemId, projectId: pid, node: itemNode }
              : { type: 'project', id: pid, projectId: pid, node: itemNode }),
        }, itemNode))
      }
    }
    // Needs placing: what the 0.4.0 upgrade could not convert. Each row keeps
    // its old links so a human can place it by hand.
    if ((project.needs_placing ?? []).length) {
      const node = `needs-placing:${pid}`
      add(node, (tabStop) => jsx(Row, {
        ...base(node), tabStop, type: 'milestone', depth: 1,
        label: `Needs placing (${project.needs_placing.length})`,
        detail: project.needs_placing.map((row) => `${row.kind} ${row.item_id} — ${row.reason}`).join(', '),
        expandable: false, open: false,
        actions: canWrite ? jsx(Button, {
          small: true, action: 'roadmap-open-unplaced',
          ariaLabel: 'Open the needs-placing list for this project',
          onClick: (event) => { event.stopPropagation(); onOpen({ project: pid, entryView: 'roadmap-unplaced' }) },
          children: 'Review',
        }) : null,
        onToggle: () => {}, onOpen: () => {},
      }, node))
    }
  }
  const nodes = rows.map((row) => row.node)
  const tabStop = nodes.includes(focusNode) ? focusNode : nodes[0]

  const selectedProject = selection ? projects.find((project) => project.id === selection.projectId) ?? null : null
  const body = selection && selectedProject ? drawerBody(selection, selectedProject, contract, onOpen) : null

  const content = loading && !data
    ? jsx(LoadingState, {})
    : error
      ? jsx(ErrorState, { error, onRetry: load })
      : !visibleProjects.length
        ? jsx(EmptyState, { title: 'No projects match this view', description: 'Adjust the search, the attention filter, or the project in the switcher.' })
        : jsxs('div', { className: `dy-rm-shell${body ? '' : ' full'}`, children: [
            jsxs('section', { className: 'dy-rm-tree', role: 'tree', 'aria-label': 'Project roadmap tree', onKeyDown: treeKeydown, 'data-rm-tree': true, children: [
              jsxs('header', { className: 'dy-rm-tree-head', children: [
                jsx('strong', { children: scope === 'all' ? 'All projects' : (projects[0]?.label ?? scope) }),
                jsx('span', { children: `${number(visibleProjects.length)} shown` }),
              ]}),
              ...rows.map((row) => row.render(row.node === tabStop)),
            ]}),
            body ? jsx(Drawer, { type: selection.type, body, onClose: () => setSelection(null), onOpen }) : null,
          ]})

  return jsxs('div', { className: 'dy-rm-page', 'data-roadmap-screen': true, children: [
    jsx(PageHead, {
      title: 'Roadmap',
      description: 'Projects first: initiatives, milestones, objectives and goals — linked by hand, never inferred.',
      onRefresh: () => { void load(); onRefresh?.() },
      status: error ? 'Load failed' : null,
    }),
    // Filters in the signed v4 order: search, attention, Reset (the project
    // moved to the global switcher, Sahil 04/10).
    // Every control shares one height, radius and font (roadmap-css.js).
    jsxs('div', { className: 'dy-rm-toolbar', role: 'group', 'aria-label': 'Roadmap filters', children: [
      // Sahil 04/10 (demo feedback d): the project comes from the global switcher.
      jsxs('label', { className: 'dy-rm-control dy-rm-search', children: [
        jsx(Icon, { name: 'search' }),
        jsx('input', { type: 'search', placeholder: 'Search the roadmap', value: search, onChange: (event) => setSearch(event.target.value), 'aria-label': 'Search the roadmap' }),
      ] }),
      jsxs('label', { className: 'dy-rm-control dy-rm-attention', children: [
        jsx('input', { type: 'checkbox', checked: attentionOnly, onChange: (event) => setAttentionOnly(event.target.checked) }),
        jsx('span', { children: 'Needs attention only' }),
      ] }),
      jsx('button', { type: 'button', className: 'dy-rm-control dy-rm-reset', onClick: () => { setSearch(''); setAttentionOnly(false); setOpenNodes(new Set()) }, children: 'Reset' }),
    ]}),
    content,
    placeDialog ? jsx(PlaceDialog, {
      ...placeDialog,
      onClose: () => setPlaceDialog(null),
      onDone: () => { setPlaceDialog(null); void load() },
    }) : null,
    confirmDialog ? jsx(ConfirmDeliveredDialog, {
      ...confirmDialog,
      onClose: () => setConfirmDialog(null),
      onDone: () => { setConfirmDialog(null); void load() },
    }) : null,
  ]})
}
