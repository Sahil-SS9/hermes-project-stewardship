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
import { GOAL_LABEL } from '../lib/plan-vocab.js'
import { ICON } from '../lib/plan-vocab.js'
import { OUTCOME_LABEL } from '../lib/plan-vocab.js'
import { REL_LABEL } from '../lib/plan-vocab.js'
import { RELATIONSHIPS } from '../lib/plan-vocab.js'

const CONTRACT_STATUS = { active: 'Active', paused: 'Paused', done: 'Done', cleared: 'Cleared' }

// Link… flows. Choices are re-read for the one project the row belongs to, so
// a stale or cross-project list is never offered; the human picks both the
// item and the initiative (nothing is chosen for them).
const LINK_KIND = {
  milestone: {
    title: 'Link a milestone to an initiative',
    itemLabel: 'Milestone',
    relationships: RELATIONSHIPS.milestone,
    items: (project) => (project.unlinked?.milestones ?? []).map((row) => ({ id: String(row.id), label: row.name })),
    submit: (projectId, itemId, ref, relationship) => api(
      `/projects/${encodeURIComponent(projectId)}/initiatives/${encodeURIComponent(ref)}/milestones`,
      { method: 'POST', body: { milestone_id: Number(itemId), relationship } }),
  },
  objective: {
    title: 'Link an objective to an initiative',
    itemLabel: 'Objective',
    relationships: RELATIONSHIPS.objective,
    items: (project) => (project.unlinked?.objectives ?? []).map((row) => ({ id: String(row.id), label: row.name })),
    submit: (projectId, itemId, ref, relationship) => api(
      `/projects/${encodeURIComponent(projectId)}/objectives/${encodeURIComponent(itemId)}/initiatives`,
      { method: 'POST', body: { initiative_ref: ref, relationship } }),
  },
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

function goalChip(goal) {
  if (!goal) return null
  if (goal.unavailable === 'archived') return chip(`Goal ${goal.title} — unavailable (archived)`)
  return chip(`Goal: ${GOAL_LABEL[goal.state] ?? goal.state}`)
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
        ['Milestones not linked', number(project.unlinked?.milestones?.length ?? 0)],
        ['Objectives not linked', number(project.unlinked?.objectives?.length ?? 0)],
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
        ['Work not in a milestone', initiative.unmilestoned_work?.state === 'ok' ? number(initiative.unmilestoned_work.count) : 'Unavailable'],
        ['Objectives linked', number(initiative.objectives?.length ?? 0)],
        ['Attention', initiative.attention_reasons?.length ? initiative.attention_reasons.map(words).join(', ') : 'none'],
      ],
    }
  }
  if (sel.type === 'milestone') {
    const milestone = (initiativeOf(sel.via)?.milestones ?? []).find((row) => row.id === sel.id)
    if (!milestone) return null
    return {
      title: milestone.name, open,
      subtitle: milestone.relationship ? `Relationship: ${REL_LABEL[milestone.relationship] ?? milestone.relationship}` : 'Not linked yet',
      facts: [
        ...deliveryDetail(milestone.delivery),
        ['Due', milestone.due ?? 'No due date'],
        ['Closed', milestone.closed ? 'Yes' : 'No'],
        ...(milestone.overdue ? [['Overdue', 'Yes — past due and not closed']] : []),
        ...(milestone.archived ? [['Status', 'Unavailable (archived)']] : []),
        ...(milestone.also_under?.length ? [['Also under', milestone.also_under.map((row) => row.title).join(', ')]] : []),
      ],
      extra: milestone.archived ? null : jsx(MilestoneItems, { projectId: project.id, milestoneId: milestone.id, onOpen }),
    }
  }
  if (sel.type === 'objective') {
    const objective = (initiativeOf(sel.via)?.objectives ?? []).find((row) => row.id === sel.id)
    if (!objective) return null
    return {
      title: objective.name, open,
      subtitle: objective.relationship ? `Relationship: ${REL_LABEL[objective.relationship] ?? objective.relationship}` : 'Not linked yet',
      facts: [
        ['Outcome', OUTCOME_LABEL[objective.outcome?.state] ?? 'Unknown'],
        ['Evidence window', objective.outcome?.window ?? '—'],
        ['Last evaluated', objective.outcome?.evaluated_at ?? 'Never'],
        ...(objective.unavailable === 'archived' ? [['Status', 'Unavailable (archived)']] : []),
        ...(objective.goal ? [['Goal', objective.goal.unavailable === 'archived' ? `${objective.goal.title} (unavailable, archived)` : `${objective.goal.title} — ${GOAL_LABEL[objective.goal.state] ?? objective.goal.state}`]] : []),
      ],
    }
  }
  if (sel.type === 'goal') {
    const goal = (project.goals ?? []).find((row) => row.id === sel.id)
    if (!goal) {
      // Archived goals are not in the goal list; the objective still names them.
      return { title: sel.goal?.title ?? sel.id, subtitle: 'Goal', open, facts: [['Status', 'Unavailable (archived)']] }
    }
    const entry = contract?.key === `${project.id}/${goal.id}` ? contract : null
    return {
      title: goal.title, subtitle: 'Goal · its contract is read-only here', open,
      facts: [
        ['State', GOAL_LABEL[goal.state] ?? goal.state],
        ['Objectives linked', number(goal.objectives_linked ?? 0)],
        ['Objectives passed', goal.objectives_passed === null || goal.objectives_passed === undefined ? 'Unknown (evidence missing)' : number(goal.objectives_passed)],
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

function LinkDialog({ kind, projectId, projectLabel, onClose, onDone }) {
  const spec = LINK_KIND[kind]
  const [choices, setChoices] = useState(null)
  const [item, setItem] = useState('')
  const [initiative, setInitiative] = useState('')
  const [relationship, setRelationship] = useState(spec.relationships[0])
  const [step, setStep] = useState('choose')
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  useDialogFocusManager(`[data-rm-link-dialog][data-rm-step="${step}"] .dy-rm-modal`)
  useEffect(() => {
    let current = true
    loadRoadmapData(projectId)
      .then((result) => {
        if (!current) return
        const project = result.projects?.[0]
        setChoices({
          items: project ? spec.items(project) : [],
          initiatives: (project?.initiatives ?? []).map((row) => ({ ref: row.ref, title: row.title, governance: words(row.governance) })),
        })
      })
      .catch((failure) => { if (current) setError(String(failure?.message ?? failure)) })
    return () => { current = false }
  }, [])
  const itemLabel = choices?.items.find((row) => row.id === item)?.label ?? ''
  const initiativeTitle = choices?.initiatives.find((row) => row.ref === initiative)?.title ?? ''
  const ready = Boolean(choices && item && initiative)
  const submit = async () => {
    setBusy(true); setError(null)
    try {
      await spec.submit(projectId, item, initiative, relationship)
      emitToast('success', `Linked “${itemLabel}” to “${initiativeTitle}”.`)
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
    choices === null && !error ? jsx('p', { role: 'status', children: 'Loading choices…' }) : null,
    choices && choices.items.length === 0
      ? jsx('p', { children: `Nothing to link: every ${spec.itemLabel.toLowerCase()} in this project is already linked.` })
      : null,
    choices && choices.items.length > 0
      ? field('dy-rm-link-choice', spec.itemLabel, item, setItem, [
          jsx('option', { value: '', children: 'Choose…' }, ''),
          ...choices.items.map((row) => jsx('option', { value: row.id, children: row.label }, row.id)),
        ])
      : null,
    choices && choices.initiatives.length === 0
      ? jsx('p', { children: 'This project has no initiatives yet. Create one on the project screen first.' })
      : null,
    choices && choices.initiatives.length > 0
      ? field('dy-rm-link-initiative', 'Initiative', initiative, setInitiative, [
          jsx('option', { value: '', children: 'Choose…' }, ''),
          ...choices.initiatives.map((row) => jsx('option', { value: row.ref, children: `${row.title} (${row.governance})` }, row.ref)),
        ])
      : null,
    choices
      ? field('dy-rm-link-rel', 'Relationship', relationship, setRelationship,
          spec.relationships.map((value) => jsx('option', { value, children: REL_LABEL[value] ?? value }, value)))
      : null,
    jsx('p', { className: 'dy-rm-modal-error', role: 'alert', children: error }),
  ]})
  const confirm = jsxs('div', { className: 'dy-rm-modal-body', 'data-rm-link-confirm': true, children: [
    jsx('p', { className: 'dy-rm-confirm', children: `Link the ${spec.itemLabel.toLowerCase()} “${itemLabel}” to the initiative “${initiativeTitle}” (${REL_LABEL[relationship] ?? relationship})?` }),
    jsx('p', { className: 'dy-rm-confirm', children: 'This records one link and an audit entry under your name.' }),
    jsx('p', { className: 'dy-rm-modal-error', role: 'alert', children: error }),
  ]})
  return jsx('div', {
    className: 'dy-rm-modal-backdrop', 'data-rm-link-dialog': true, 'data-rm-step': step,
    onKeyDown: (event) => { if (event.key === 'Escape') { event.stopPropagation(); onClose() } },
    children: jsxs('section', { className: 'dy-rm-modal', role: 'dialog', 'aria-modal': true, 'aria-label': spec.title, children: [
      jsxs('header', { className: 'dy-rm-modal-head', children: [
        jsxs('div', { children: [jsx('p', { className: 'dockyard-meta', children: 'Link' }), jsx('h3', { children: spec.title }), jsx('p', { children: `Project ${projectLabel}` })] }),
        jsx(Button, { onClick: onClose, ariaLabel: 'Close link dialog', children: '×' }),
      ]}),
      step === 'choose' ? choose : confirm,
      step === 'choose'
        ? jsxs('div', { className: 'dy-rm-modal-actions', children: [
            jsx(Button, { onClick: onClose, children: 'Cancel' }),
            jsx(Button, { variant: 'primary', disabled: !ready, onClick: () => { setError(null); setStep('confirm') }, children: 'Continue' }),
          ]})
        : jsxs('div', { className: 'dy-rm-modal-actions', children: [
            jsx(Button, { disabled: busy, onClick: () => { setError(null); setStep('choose') }, children: 'Back' }),
            jsx(Button, { variant: 'primary', disabled: busy, onClick: submit, children: busy ? 'Linking…' : 'Create link' }),
          ]}),
    ]}),
  })
}

// initialScope: 'all' (the signed default) or one project id ("View in
// Roadmap", or the global picker while this tab is open). onOpen({ project,
// entryView, workRef }) asks the shell to open the item's own project screen.
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
  const [linkDialog, setLinkDialog] = useState(null)
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
        ...(project.unlinked?.milestones ?? []).map((m) => m.name),
        ...(project.unlinked?.objectives ?? []).map((o) => o.name),
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
        if ([...(project.unlinked?.milestones ?? []), ...(project.unlinked?.objectives ?? [])].some((x) => hit(x.name))) next.add(`project:${project.id}`)
      }
      return next
    })
  }, [search, data])

  const linkButton = (kind, project) => jsx(Button, {
    small: true, action: `roadmap-link-${kind}`,
    onClick: (event) => { event.stopPropagation(); setLinkDialog({ kind, projectId: project.id, projectLabel: project.label ?? project.id }) },
    children: 'Link…',
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
      add(initiativeNode, (tabStop) => jsx(Row, {
        ...base(initiativeNode), tabStop, type: 'initiative', depth: 1,
        label: initiative.title,
        detail: initiative.attention_reasons?.length
          ? initiative.attention_reasons.map(words).join(' · ')
          : (initiative.delivery?.state === 'ok' ? `${number(initiative.delivery.total)} linked work items` : 'No linked work'),
        expandable: true, open: initiativeOpen,
        chips: jsxs(Fragment, { children: [
          deliveryChips(initiative.delivery),
          initiative.attention ? chip('Attention', 'attention') : null,
        ] }),
        onToggle: () => toggle(initiativeNode),
        onOpen: () => { openNode(initiativeNode); setSelection({ type: 'initiative', id: ref, projectId: pid, node: initiativeNode }) },
      }, initiativeNode))
      if (!initiativeOpen) continue
      for (const milestone of initiative.milestones ?? []) {
        // A milestone under two initiatives appears under both: the node key
        // carries the parent so each copy has its own row, focus and selection.
        const milestoneNode = `milestone:${milestone.id}@${ref}`
        const milestoneOpen = openNodes.has(milestoneNode) && !milestone.archived
        add(milestoneNode, (tabStop) => jsx(Row, {
          ...base(milestoneNode), tabStop, type: 'milestone', depth: 2,
          label: milestone.name,
          detail: milestone.archived ? 'Unavailable (archived)' : `${milestone.relationship ? REL_LABEL[milestone.relationship] : 'not linked'}${milestone.also_under?.length ? ` · also under ${milestone.also_under.map((row) => row.title).join(', ')}` : ''}`,
          expandable: !milestone.archived, open: milestoneOpen,
          chips: jsxs(Fragment, { children: [
            deliveryChips(milestone.delivery),
            milestone.overdue ? chip('Overdue', 'overdue') : null,
          ] }),
          onToggle: () => toggle(milestoneNode),
          onOpen: () => { if (!milestone.archived) openNode(milestoneNode); setSelection({ type: 'milestone', id: milestone.id, via: ref, projectId: pid, node: milestoneNode }) },
        }, milestoneNode))
        if (milestoneOpen) {
          const itemsNode = `items:${milestone.id}@${ref}`
          add(itemsNode, (tabStop) => jsx(MilestoneItemsRow, {
            node: itemsNode, projectId: pid, milestoneId: milestone.id, tabStop, onFocusRow: setFocusNode, onOpen,
          }, itemsNode))
        }
      }
      if (initiative.unmilestoned_work?.count > 0) {
        const looseNode = `loose:${ref}`
        add(looseNode, (tabStop) => jsx(PlainRow, {
          node: looseNode, depth: 2, tabStop, onFocusRow: setFocusNode, label: 'Not in a milestone',
          detail: initiative.unmilestoned_work.items.map((item) => `${item.title} (${words(item.bucket)})`).join(', '),
        }, looseNode))
      }
      for (const objective of initiative.objectives ?? []) {
        const objectiveNode = `objective:${objective.id}@${ref}`
        const objectiveOpen = openNodes.has(objectiveNode) && Boolean(objective.goal)
        add(objectiveNode, (tabStop) => jsx(Row, {
          ...base(objectiveNode), tabStop, type: 'objective', depth: 2,
          label: objective.name,
          detail: objective.unavailable === 'archived' ? 'Unavailable (archived)' : `Outcome: ${OUTCOME_LABEL[objective.outcome?.state] ?? 'Unknown'}${objective.outcome?.evaluated_at ? '' : ' · never evaluated'}`,
          expandable: Boolean(objective.goal), open: objectiveOpen,
          chips: jsxs(Fragment, { children: [
            chip(OUTCOME_LABEL[objective.outcome?.state] ?? 'Unknown', objective.outcome?.state === 'passed' ? 'passed' : objective.outcome?.state === 'failed' ? 'failed' : ''),
            goalChip(objective.goal),
          ] }),
          onToggle: () => { if (objective.goal) toggle(objectiveNode) },
          onOpen: () => { if (objective.goal) openNode(objectiveNode); setSelection({ type: 'objective', id: objective.id, via: ref, projectId: pid, node: objectiveNode }) },
        }, objectiveNode))
        if (objectiveOpen) {
          const goal = objective.goal
          const goalNode = `goal:${goal.id}@${objective.id}@${ref}`
          add(goalNode, (tabStop) => jsx(Row, {
            ...base(goalNode), tabStop, type: 'goal', depth: 3,
            label: goal.unavailable === 'archived' ? `${goal.title} — unavailable (archived)` : goal.title,
            detail: 'Goal context · contract in the drawer (read-only)',
            expandable: false, open: false,
            chips: goal.unavailable !== 'archived' ? chip(GOAL_LABEL[goal.state] ?? goal.state) : null,
            onToggle: () => {},
            onOpen: () => setSelection({ type: 'goal', id: goal.id, goal, projectId: pid, node: goalNode }),
          }, goalNode))
        }
      }
    }
    const unlinkedMilestones = project.unlinked?.milestones ?? []
    if (unlinkedMilestones.length) {
      const node = `unlinked-milestones:${pid}`
      add(node, (tabStop) => jsx(Row, {
        ...base(node), tabStop, type: 'milestone', depth: 1,
        label: 'Milestones not linked to an initiative',
        detail: unlinkedMilestones.map((m) => m.name).join(', '),
        expandable: false, open: false,
        actions: canWrite ? linkButton('milestone', project) : null,
        onToggle: () => {}, onOpen: () => {},
      }, node))
    }
    const unlinkedObjectives = project.unlinked?.objectives ?? []
    if (unlinkedObjectives.length) {
      const node = `unlinked-objectives:${pid}`
      add(node, (tabStop) => jsx(Row, {
        ...base(node), tabStop, type: 'objective', depth: 1,
        label: 'Objectives not linked to an initiative',
        detail: unlinkedObjectives.map((o) => o.name).join(', '),
        expandable: false, open: false,
        actions: canWrite ? linkButton('objective', project) : null,
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
    linkDialog ? jsx(LinkDialog, {
      ...linkDialog,
      onClose: () => setLinkDialog(null),
      onDone: () => { setLinkDialog(null); void load() },
    }) : null,
  ]})
}
