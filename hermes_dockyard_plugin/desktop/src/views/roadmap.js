// GENERATED-STRUCTURE: hand-edited Desktop module. Edit this file, then run
// node hermes_dockyard_plugin/desktop/build.mjs to regenerate plugin.js.
//
// R2 Phase C: the Roadmap screen. Signed design = the roadmap-v4 OUTLINE study
// only: a project-first collapsible tree (Project -> Initiative -> Milestone ->
// Objective -> Goal), honest bucket counts, "Not linked yet" with a link flow
// that never invents data, and a detail drawer per node. Dates/quarters are
// not an axis; there is no percentage anywhere.
import { api } from '../runtime/context.js'
import { emitToast } from '../runtime/context.js'
import { useEffect } from '../runtime/react.js'
import { useMemo } from '../runtime/react.js'
import { useState } from '../runtime/react.js'
import { Fragment } from '../runtime/react.js'
import { jsx } from '../runtime/react.js'
import { jsxs } from '../runtime/react.js'
import { Button } from '../lib/ui.js'
import { EmptyState } from '../lib/ui.js'
import { ErrorState } from '../lib/ui.js'
import { LoadingState } from '../lib/ui.js'
import { PageHead } from '../lib/ui.js'
import { number } from '../lib/ui.js'
import { plural } from '../lib/ui.js'
import { loadRoadmapData } from '../data/loaders.js'

const BUCKETS = [
  ['planned', 'Planned'],
  ['building', 'Building'],
  ['ready_for_review', 'Ready for review'],
  ['complete', 'Complete'],
]
const GOAL_LABEL = { met: 'Met', at_risk: 'At risk', unknown: 'Unknown evidence', unproven: 'Unproven' }
const OUTCOME_LABEL = { passed: 'Passed', failed: 'Failed', stale: 'Stale', unknown: 'Unknown', not_applicable: 'Not applicable' }
const REL_LABEL = { delivers: 'delivers', depends_on: 'depends on', supports: 'supports', measures: 'measures', unblocks: 'unblocks' }

// W3C APG tree pattern: ArrowDown/Up move between visible rows, Right opens,
// Left closes, Enter/Space toggle, Home/End jump. Roving focus is the DOM
// tabIndex below.
function treeKeydown(event) {
  const rows = [...event.currentTarget.querySelectorAll('[data-rm-row]')]
  const index = rows.indexOf(document.activeElement)
  if (event.key === 'ArrowDown' && index >= 0 && index < rows.length - 1) {
    event.preventDefault(); rows[index + 1].focus()
  } else if (event.key === 'ArrowUp' && index > 0) {
    event.preventDefault(); rows[index - 1].focus()
  } else if (event.key === 'Home' && rows.length) {
    event.preventDefault(); rows[0].focus()
  } else if (event.key === 'End' && rows.length) {
    event.preventDefault(); rows[rows.length - 1].focus()
  } else if (event.key === 'ArrowRight' && document.activeElement?.dataset.rmExpandable === 'true') {
    event.preventDefault(); document.activeElement.dataset.rmOpen = 'true'
    document.activeElement.querySelector('[data-rm-disclosure]').click()
  } else if (event.key === 'ArrowLeft' && document.activeElement?.dataset.rmOpen === 'true') {
    event.preventDefault(); document.activeElement.querySelector('[data-rm-disclosure]').click()
  } else if (event.key === 'Enter' || event.key === ' ') {
    const row = event.target.closest('[data-rm-row]')
    if (row) { event.preventDefault(); row.click() }
  }
}

function deliveryChips(delivery) {
  if (!delivery) return null
  if (delivery.state === 'no_linked_work') return jsx('span', { className: 'dy-rm-chip', children: 'No linked work' })
  if (delivery.state === 'unavailable') return jsx('span', { className: 'dy-rm-chip', children: 'Unavailable' })
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
  if (goal.unavailable === 'archived') return jsx('span', { className: 'dy-rm-chip', children: `Goal ${goal.title} — unavailable (archived)` })
  return jsx('span', { className: 'dy-rm-chip', children: `Goal: ${GOAL_LABEL[goal.state] ?? goal.state}` })
}

function Row({ type, id, depth, label, detail, open, expandable, selected, chips, onToggle, onOpen, actions }) {
  return jsxs('div', {
    className: `dy-rm-row depth-${depth}`,
    'data-rm-row': true,
    'data-rm-node': `${type}:${id}`,
    'data-rm-expandable': String(Boolean(expandable)),
    'data-rm-open': String(Boolean(open)),
    'data-selected': String(Boolean(selected)),
    role: 'treeitem',
    'aria-level': depth + 1,
    'aria-expanded': expandable ? Boolean(open) : undefined,
    tabIndex: 0,
    onClick: () => onOpen(),
    children: [
      jsx('button', {
        type: 'button', className: `dy-rm-disclosure${expandable ? '' : ' blank'}`,
        'data-rm-disclosure': true, tabIndex: -1, 'aria-hidden': !expandable,
        'aria-label': `${open ? 'Collapse' : 'Expand'} ${label}`,
        onClick: (event) => { event.stopPropagation(); if (expandable) onToggle() },
        children: open ? '−' : '+',
      }),
      jsx('span', { className: `dy-rm-icon ${type}`, 'aria-hidden': true, children: { project: 'P', initiative: 'I', milestone: 'M', work: 'W', objective: 'O', goal: 'G' }[type] ?? '·' }),
      jsxs('span', { className: 'dy-rm-copy', children: [
        jsx('strong', { children: label }),
        jsx('small', { children: detail }),
      ]}),
      jsxs('span', { className: 'dy-rm-chips', children: [
        jsx(Fragment, { key: 'chips', children: chips }),
        jsx(Fragment, { key: 'actions', children: actions ?? null }),
      ] }),
    ],
  })
}

function deliveryDetail(delivery) {
  if (!delivery) return []
  if (delivery.state === 'no_linked_work') return [['Linked work', 'No linked work']]
  if (delivery.state === 'unavailable') return [['Linked work', 'Unavailable (the work host did not respond)']]
  return [
    ...BUCKETS.map(([key, label]) => [label, number(delivery[key] ?? 0)]),
    ['Blocked', number(delivery.blocked ?? 0)],
    ['Total linked', number(delivery.total)],
  ]
}

function MilestoneItems({ projectId, milestoneId }) {
  const [items, setItems] = useState(null)
  const [error, setError] = useState(null)
  useEffect(() => {
    let current = true
    api(`/roadmap/projects/${encodeURIComponent(projectId)}/milestones/${milestoneId}/items`)
      .then((result) => { if (current) { setItems(result.items ?? []); setError(result.state === 'unavailable' ? 'Work items are unavailable (the work host did not respond).' : null) } })
      .catch((failure) => { if (current) setError(String(failure?.message ?? failure)) })
    return () => { current = false }
  }, [projectId, milestoneId])
  if (error) return jsx('p', { role: 'status', children: error })
  if (!items) return jsx('p', { role: 'status', children: 'Loading work items…' })
  if (!items.length) return jsx('p', { role: 'status', children: 'No work items are attached to this milestone.' })
  return jsx('ul', { className: 'dy-rm-items', children: items.map((item) => jsxs('li', { children: [
    jsx('strong', { children: item.title }),
    jsx('small', { children: item.bucket.replace(/_/g, ' ') }),
    Array.isArray(item.blockers) && item.blockers.length
      ? jsx('small', { children: `waiting on ${item.blockers.join(', ')}` })
      : null,
  ] }, item.ref)) })
}

function Drawer({ projectId, selection, outline, onClose, canWrite, onLink, contractFor, contracts }) {
  const [type, id] = selection.split(':')
  const findInitiative = (ref) => (outline?.initiatives ?? []).find((row) => row.ref === ref)
  const project = outline
  let body = null
  if (type === 'project') {
    body = {
      title: project?.label ?? id, subtitle: project?.mission ?? '',
      facts: [
        ['Initiatives', number(project?.initiatives?.length ?? 0)],
        ['Goals', number(project?.goals?.length ?? 0)],
        ['Milestones not linked', number(project?.unlinked?.milestones?.length ?? 0)],
        ['Objectives not linked', number(project?.unlinked?.objectives?.length ?? 0)],
      ],
      extra: null,
    }
  } else if (type === 'initiative') {
    const initiative = findInitiative(id)
    if (!initiative) return null
    body = {
      title: initiative.title, subtitle: `Governance: ${initiative.governance}`,
      facts: [
        ...deliveryDetail(initiative.delivery),
        ['Work not in a milestone', initiative.unmilestoned_work.state === 'ok' ? number(initiative.unmilestoned_work.count) : 'Unavailable'],
        ['Objectives linked', number(initiative.objectives?.length ?? 0)],
        ['Attention', initiative.attention_reasons.length ? initiative.attention_reasons.join(', ').replace(/_/g, ' ') : 'none'],
      ],
      extra: null,
    }
  } else if (type === 'milestone') {
    const milestoneId = Number(id)
    const all = [...(project?.initiatives ?? []).flatMap((row) => row.milestones), ...(project?.unlinked?.milestones ?? [])]
    const milestone = all.find((row) => row.id === milestoneId)
    if (!milestone) return null
    body = {
      title: milestone.name,
      subtitle: milestone.relationship ? `Relationship: ${REL_LABEL[milestone.relationship] ?? milestone.relationship}` : 'Not linked yet',
      facts: [
        ...deliveryDetail(milestone.delivery),
        ['Due', milestone.due ?? 'No due date'],
        ['Closed', milestone.closed ? 'Yes' : 'No'],
        ...(milestone.overdue ? [['Overdue', 'Yes — past due and not closed']] : []),
        ...(milestone.archived ? [['Status', 'Unavailable (archived)']] : []),
        ...(milestone.also_under?.length ? [['Also under', milestone.also_under.map((row) => row.title).join(', ')]] : []),
      ],
      extra: milestone.archived ? null : jsx(MilestoneItems, { projectId, milestoneId }),
    }
  } else if (type === 'objective') {
    const all = [...(project?.initiatives ?? []).flatMap((row) => row.objectives), ...(project?.unlinked?.objectives ?? [])]
    const objective = all.find((row) => row.id === Number(id))
    if (!objective) return null
    const contract = null  // contract facts surface on the goal row, not here
    body = {
      title: objective.name,
      subtitle: objective.relationship ? `Relationship: ${REL_LABEL[objective.relationship] ?? objective.relationship}` : 'Not linked yet',
      facts: [
        ['Outcome', OUTCOME_LABEL[objective.outcome?.state] ?? 'Unknown'],
        ['Evidence window', objective.outcome?.window ?? '—'],
        ['Last evaluated', objective.outcome?.evaluated_at ?? 'Never'],
        ...(objective.unavailable === 'archived' ? [['Status', 'Unavailable (archived)']] : []),
        ...(objective.goal ? [['Goal', objective.goal.unavailable === 'archived' ? `${objective.goal.title} (unavailable, archived)` : `${objective.goal.title} — ${GOAL_LABEL[objective.goal.state] ?? objective.goal.state}`]] : []),
      ],
      extra: contract,
    }
  } else if (type === 'goal') {
    const goal = (project?.goals ?? []).find((row) => row.id === id)
    if (!goal) return null
    const contract = contracts?.[id] ?? null
    body = {
      title: goal.title, subtitle: 'Goal',
      facts: [
        ['State', GOAL_LABEL[goal.state] ?? goal.state],
        ['Objectives linked', number(goal.objectives_linked ?? 0)],
        ['Objectives passed', goal.objectives_passed === null || goal.objectives_passed === undefined ? 'Unknown (evidence missing)' : number(goal.objectives_passed)],
        ...(contract ? [['Verification', contract.verification || '—'], ['Constraints', contract.constraints || '—']] : []),
      ],
      extra: null,
    }
  } else if (type === 'work') {
    body = { title: id, subtitle: 'Work item', facts: [['Opens on', 'the project board (Open button)']], extra: null }
  }
  if (!body) return null
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
      body.extra,
      jsxs('div', { className: 'dy-rm-actions', children: [
        canWrite && type === 'milestone' && !selection.includes('unlinked') ? null : null,
        jsx(Button, { onClick: onClose, children: 'Close' }),
      ]}),
    ]}),
  ]})
}

function LinkDialog({ projectId, payload, onClose, onDone }) {
  const [options, setOptions] = useState(null)
  const [choice, setChoice] = useState('')
  const [relationship, setRelationship] = useState(payload.relationships[0])
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    let current = true
    payload.loadOptions()
      .then((rows) => { if (current) setOptions(rows) })
      .catch((failure) => { if (current) setError(String(failure?.message ?? failure)) })
    return () => { current = false }
  }, [])
  const submit = async () => {
    if (!choice) { setError('Choose an item to link.'); return }
    setBusy(true); setError(null)
    try {
      await payload.submit(choice, relationship)
      emitToast('success', 'Link created.')
      onDone()
    } catch (failure) {
      setError(String(failure?.message ?? failure))
    } finally { setBusy(false) }
  }
  return jsxs('div', { className: 'dy-rm-modal-backdrop', 'data-rm-link-dialog': true, onKeyDown: (event) => { if (event.key === 'Escape') onClose() }, children: [
    jsxs('section', { className: 'dy-rm-modal', role: 'dialog', 'aria-modal': true, 'aria-label': payload.title, children: [
      jsxs('header', { className: 'dy-rm-modal-head', children: [
        jsxs('div', { children: [jsx('p', { className: 'dockyard-meta', children: 'Link' }), jsx('h3', { children: payload.title }), jsx('p', { children: payload.subtitle })] }),
        jsx(Button, { onClick: onClose, ariaLabel: 'Close link dialog', children: '×' }),
      ]}),
      jsxs('div', { className: 'dy-rm-modal-body', children: [
        jsx('label', { htmlFor: 'dy-rm-link-choice', children: payload.choiceLabel }),
        options === null
          ? jsx('p', { role: 'status', children: 'Loading choices…' })
          : options.length === 0
            ? jsx('p', { children: 'Nothing to link: no eligible items exist in this project.' })
            : jsx('select', { id: 'dy-rm-link-choice', value: choice, onChange: (event) => setChoice(event.target.value),
                'aria-label': payload.choiceLabel, children: [
                  jsx('option', { value: '', children: 'Choose…' }),
                  ...options.map((row) => jsx('option', { value: String(row.id), children: row.label }, String(row.id))),
                ] }),
        jsx('label', { htmlFor: 'dy-rm-link-rel', children: 'Relationship' }),
        jsx('select', { id: 'dy-rm-link-rel', value: relationship, onChange: (event) => setRelationship(event.target.value),
          'aria-label': 'Relationship', children:
          payload.relationships.map((value) => jsx('option', { value, children: REL_LABEL[value] ?? value }, value)) }),
        jsx('p', { className: 'dy-rm-modal-error', role: 'alert', children: error }),
      ]}),
      jsxs('div', { className: 'dy-rm-modal-actions', children: [
        jsx(Button, { onClick: onClose, children: 'Cancel' }),
        jsx(Button, { variant: 'primary', disabled: busy || !choice, onClick: submit, children: busy ? 'Linking…' : payload.confirm }),
      ]}),
    ]}),
  ]})
}

export function RoadmapView({ projectId, canWrite, onRefresh }) {
  const [outline, setOutline] = useState(null)
  const [error, setError] = useState(null)
  const [scope, setScope] = useState(projectId ?? 'all')
  const [search, setSearch] = useState('')
  const [attentionOnly, setAttentionOnly] = useState(false)
  const [openNodes, setOpenNodes] = useState(new Set())
  const [selection, setSelection] = useState(null)
  const [linkDialog, setLinkDialog] = useState(null)
  const [contracts, setContracts] = useState({})
  const [loading, setLoading] = useState(true)

  // The picker always lists every project, independent of the scoped outline.
  const [allProjects, setAllProjects] = useState([])
  const load = async () => {
    setLoading(true); setError(null)
    try {
      const result = await loadRoadmapData(scope === 'all' ? null : scope)
      setOutline(result.projects?.length === 1 ? result.projects[0] : { projects: result.projects ?? [] })
      if (scope !== 'all' && result.projects?.length === 1) setSelection(null)
    } catch (failure) { setError(String(failure?.message ?? failure)) }
    finally { setLoading(false) }
  }
  useEffect(() => { void load() }, [scope, projectId])
  useEffect(() => {
    let current = true
    loadRoadmapData(null)
      .then((result) => { if (current) setAllProjects(result.projects ?? []) })
      .catch(() => { /* picker falls back to the scoped outline */ })
    return () => { current = false }
  }, [])

  const projects = outline?.projects ?? (outline ? [outline] : [])
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
          ...(row.objectives ?? []).map((o) => o.name),
        ]),
        ...(project.goals ?? []).map((g) => g.title),
        ...(project.unlinked?.milestones ?? []).map((m) => m.name),
        ...(project.unlinked?.objectives ?? []).map((o) => o.name),
      ].join(' ').toLowerCase()
      return haystack.includes(query)
    }
  }, [search, attentionOnly])

  const toggle = (key) => setOpenNodes((current) => {
    const next = new Set(current)
    if (next.has(key)) next.delete(key); else next.add(key)
    return next
  })
  // Search reveals the ancestors of every match (plan §5).
  useEffect(() => {
    if (!search.trim() || !projects.length) return
    const query = search.trim().toLowerCase()
    const next = new Set(openNodes)
    for (const project of projects) {
      const projectKey = `project:${project.id}`
      const hit = (project.initiatives ?? []).some((row) =>
        row.title.toLowerCase().includes(query) || (row.milestones ?? []).some((m) => m.name.toLowerCase().includes(query)))
      if (hit) next.add(projectKey)
      for (const row of project.initiatives ?? []) {
        if ((row.milestones ?? []).some((m) => m.name.toLowerCase().includes(query))) next.add(`initiative:${row.ref}`)
      }
    }
    setOpenNodes(next)
  }, [search, outline])

  const contractFor = (objective) => null  // objective contracts live on the goal row
  const fetchContract = async (goalId) => {
    if (contracts[goalId]) return
    try {
      const result = await api(`/projects/${encodeURIComponent(scope === 'all' ? projects[0]?.id : scope)}/goals/${encodeURIComponent(goalId)}/contract`)
      setContracts((current) => ({ ...current, [goalId]: result }))
    } catch { /* contract display is best-effort; the drawer shows goal state regardless */ }
  }

  const rows = []
  const visibleProjects = projects.filter(matches)
  for (const project of visibleProjects) {
    const projectKey = `project:${project.id}`
    const projectOpen = openNodes.has(projectKey)
    rows.push(jsx(Row, {
      type: 'project', id: project.id, depth: 0,
      label: project.label ?? project.id,
      detail: `${number(project.initiatives?.length ?? 0)} ${plural(project.initiatives?.length ?? 0, 'initiative')} · ${project.mission ?? ''}`,
      expandable: true, open: projectOpen, selected: selection === projectKey,
      chips: project.attention ? jsx('span', { className: 'dy-rm-chip attention', children: 'Needs attention' }) : null,
      onToggle: () => toggle(projectKey), onOpen: () => { if (!projectOpen) toggle(projectKey); setSelection(projectKey) },
    }, projectKey))
    if (!projectOpen) continue
    if (project.features?.initiatives === false) {
      rows.push(jsx('div', { className: 'dy-rm-blank', children: 'Initiatives are turned off for this project.' }, `${projectKey}:off`))
      continue
    }
    for (const initiative of project.initiatives ?? []) {
      const initiativeKey = `initiative:${initiative.ref}`
      const initiativeOpen = openNodes.has(initiativeKey)
      rows.push(jsx(Row, {
        type: 'initiative', id: initiative.ref, depth: 1,
        label: initiative.title,
        detail: initiative.attention_reasons.length
          ? initiative.attention_reasons.map((r) => r.replace(/_/g, ' ')).join(' · ')
          : (initiative.delivery && initiative.delivery.state !== 'no_linked_work' ? `${number(initiative.delivery.total)} linked work items` : 'No linked work'),
        expandable: true, open: initiativeOpen, selected: selection === initiativeKey,
        chips: jsxs(Fragment, { children: [
          deliveryChips(initiative.delivery),
          initiative.attention ? jsx('span', { className: 'dy-rm-chip attention', children: 'Attention' }) : null,
        ] }),
        onToggle: () => toggle(initiativeKey), onOpen: () => { if (!initiativeOpen) toggle(initiativeKey); setSelection(initiativeKey) },
      }, initiativeKey))
      if (!initiativeOpen) continue
      for (const milestone of initiative.milestones ?? []) {
        const milestoneKey = `milestone:${milestone.id}`
        const milestoneOpen = openNodes.has(milestoneKey)
        rows.push(jsx(Row, {
          type: 'milestone', id: milestone.id, depth: 2,
          label: milestone.name,
          detail: milestone.archived ? 'Unavailable (archived)' : `${milestone.relationship ? REL_LABEL[milestone.relationship] : 'not linked'}${milestone.also_under?.length ? ` · also under ${milestone.also_under.map((r) => r.title).join(', ')}` : ''}`,
          expandable: !milestone.archived, open: milestoneOpen && !milestone.archived, selected: selection === milestoneKey,
          chips: jsxs(Fragment, { children: [
            deliveryChips(milestone.delivery),
            milestone.overdue ? jsx('span', { className: 'dy-rm-chip overdue', children: 'Overdue' }) : null,
          ] }),
          onToggle: () => toggle(milestoneKey), onOpen: () => { if (!milestoneOpen && !milestone.archived) toggle(milestoneKey); setSelection(milestoneKey) },
        }, milestoneKey))
        if (milestoneOpen && !milestone.archived) {
          rows.push(jsx(MilestoneItemsRow, { key: `items:${milestone.id}`, projectId: project.id, milestoneId: milestone.id }))
        }
      }
      if (initiative.unmilestoned_work?.count > 0) {
        rows.push(jsx('div', { className: 'dy-rm-row depth-2', 'data-rm-row': true, role: 'treeitem', 'aria-level': 3, tabIndex: 0, key: `loose:${initiative.ref}`, onClick: () => setSelection(`loose:${initiative.ref}`), children: jsxs('span', { className: 'dy-rm-copy', children: [
          jsx('strong', { children: 'Not in a milestone' }),
          jsx('small', { children: initiative.unmilestoned_work.items.map((item) => `${item.title} (${item.bucket.replace(/_/g, ' ')})`).join(', ') }),
        ] }) }))
      }
      for (const objective of initiative.objectives ?? []) {
        const objectiveKey = `objective:${objective.id}`
        rows.push(jsx(Row, {
          type: 'objective', id: objective.id, depth: 2,
          label: objective.name,
          detail: objective.unavailable === 'archived' ? 'Unavailable (archived)' : `Outcome: ${OUTCOME_LABEL[objective.outcome?.state] ?? 'Unknown'}${objective.outcome?.evaluated_at ? '' : ' · never evaluated'}`,
          expandable: Boolean(objective.goal), open: openNodes.has(objectiveKey), selected: selection === objectiveKey,
          chips: jsxs(Fragment, { children: [
            jsx('span', { className: `dy-rm-chip ${objective.outcome?.state === 'passed' ? 'passed' : objective.outcome?.state === 'failed' ? 'failed' : ''}`, children: OUTCOME_LABEL[objective.outcome?.state] ?? 'Unknown' }),
            goalChip(objective.goal),
          ] }),
          onToggle: () => { if (objective.goal) { toggle(objectiveKey); void fetchContract(objective.goal.id) } },
          onOpen: () => { if (objective.goal) { if (!openNodes.has(objectiveKey)) { toggle(objectiveKey); void fetchContract(objective.goal.id) } setSelection(objectiveKey) } },
        }, objectiveKey))
        if (openNodes.has(objectiveKey) && objective.goal) {
          const goalKey = `goal:${objective.goal.id}`
          const goal = (project.goals ?? []).find((row) => row.id === objective.goal.id)
          rows.push(jsx(Row, {
            type: 'goal', id: objective.goal.id, depth: 3,
            label: objective.goal.unavailable === 'archived' ? `${objective.goal.title} — unavailable (archived)` : objective.goal.title,
            detail: 'Goal context · read-only contract behind the drawer',
            expandable: false, open: false, selected: selection === goalKey,
            chips: goal?.unavailable !== 'archived' ? jsx('span', { className: 'dy-rm-chip', children: GOAL_LABEL[objective.goal.state] ?? objective.goal.state }) : null,
            onToggle: () => {}, onOpen: () => { setSelection(goalKey); void fetchContract(objective.goal.id) },
          }, goalKey))
        }
      }
    }
    const unlinkedMilestones = project.unlinked?.milestones ?? []
    if (unlinkedMilestones.length) {
      rows.push(jsxs('div', { className: 'dy-rm-row depth-1', 'data-rm-row': true, role: 'treeitem', 'aria-level': 2, tabIndex: 0, onClick: () => setSelection(`${projectKey}:unlinked-ms`), children: [
        jsx('span', { className: 'dy-rm-icon milestone', 'aria-hidden': true, children: 'M' }),
        jsxs('span', { className: 'dy-rm-copy', children: [
          jsx('strong', { children: 'Milestones not linked to an initiative' }),
          jsx('small', { children: unlinkedMilestones.map((m) => m.name).join(', ') }),
        ] }),
        jsx('span', { className: 'dy-rm-chips', children: canWrite ? jsx(Button, { small: true, onClick: () => setLinkDialog(unlinkedMilestonePayload(project)), children: 'Link…' }) : null }),
      ] }, `${projectKey}:unlinked-ms`))
    }
    const unlinkedObjectives = project.unlinked?.objectives ?? []
    if (unlinkedObjectives.length) {
      rows.push(jsxs('div', { className: 'dy-rm-row depth-1', 'data-rm-row': true, role: 'treeitem', 'aria-level': 2, tabIndex: 0, onClick: () => setSelection(`${projectKey}:unlinked-obj`), children: [
        jsx('span', { className: 'dy-rm-icon objective', 'aria-hidden': true, children: 'O' }),
        jsxs('span', { className: 'dy-rm-copy', children: [
          jsx('strong', { children: 'Objectives not linked to an initiative' }),
          jsx('small', { children: unlinkedObjectives.map((o) => o.name).join(', ') }),
        ] }),
        jsx('span', { className: 'dy-rm-chips', children: canWrite ? jsx(Button, { small: true, onClick: () => setLinkDialog(unlinkedObjectivePayload(project)), children: 'Link…' }) : null }),
      ] }, `${projectKey}:unlinked-obj`))
    }
  }

  // The drawer reads one project's outline; in All-projects scope pick the
  // project the selection belongs to (project rows carry their own id).
  const selectedDrawerProject = (() => {
    if (!selection) return null
    if (scope !== 'all') return projects[0] ?? null
    const owner = selection.startsWith('project:') ? selection.slice('project:'.length) : null
    if (owner) return projects.find((p) => (p.id ?? p.label) === owner) ?? null
    for (const p of projects) {
      const ids = new Set()
      for (const row of p.initiatives ?? []) {
        ids.add(`initiative:${row.ref}`)
        for (const m of row.milestones ?? []) ids.add(`milestone:${m.id}`)
        for (const o of row.objectives ?? []) ids.add(`objective:${o.id}`)
      }
      for (const m of p.unlinked?.milestones ?? []) ids.add(`milestone:${m.id}`)
      for (const o of p.unlinked?.objectives ?? []) ids.add(`objective:${o.id}`)
      if (ids.has(selection)) return p
    }
    return null
  })()

  const content = loading && !outline
    ? jsx(LoadingState, {})
    : error
      ? jsx(ErrorState, { error, onRetry: load })
      : !visibleProjects.length
        ? jsx(EmptyState, { title: 'No projects match this view', description: 'Adjust the search, the attention filter, or the project picker.' })
        : jsxs('div', { className: `dy-rm-shell${selection ? '' : ' full'}`, children: [
            jsxs('section', { className: 'dy-rm-tree', role: 'tree', 'aria-label': 'Project roadmap tree', onKeyDown: treeKeydown, 'data-rm-tree': true, children: [
              jsxs('header', { className: 'dy-rm-tree-head', children: [
                jsx('strong', { children: scope === 'all' ? 'All projects' : (projects[0]?.label ?? scope) }),
                jsx('span', { children: `${number(visibleProjects.length)} shown` }),
              ]}),
              rows,
            ]}),
            selection ? jsx(Drawer, {
              projectId: scope === 'all' ? selectedDrawerProject?.id : projects[0]?.id,
              selection, outline: scope === 'all' ? selectedDrawerProject : projects[0], onClose: () => setSelection(null),
              canWrite, onLink: setLinkDialog, contractFor, contracts,
            }) : null,
          ]})

  return jsxs('div', { className: 'dy-rm-page', 'data-roadmap-screen': true, children: [
    jsx(PageHead, {
      title: 'Roadmap',
      description: 'Projects first: initiatives, milestones, objectives and goals — linked by hand, never inferred.',
      onRefresh: () => { void load(); onRefresh?.() },
      status: error ? 'Load failed' : null,
    }),
    jsxs('div', { className: 'dy-rm-toolbar', children: [
      jsx('label', { children: jsx('input', { type: 'search', placeholder: 'Search the roadmap', value: search, onChange: (event) => setSearch(event.target.value), 'aria-label': 'Search the roadmap' }) }),
      jsx('label', { className: 'dy-rm-attention', children: jsxs(Fragment, { children: [
        jsx('input', { type: 'checkbox', checked: attentionOnly, onChange: (event) => setAttentionOnly(event.target.checked) }),
        'Needs attention only',
      ] }) }),
      jsx('label', { children: jsxs(Fragment, { children: [
        'Project',
        jsx('select', { value: scope, onChange: (event) => { setScope(event.target.value); setSelection(null) }, 'aria-label': 'Roadmap project picker', children: [
          jsx('option', { value: 'all', children: 'All projects' }),
          ...(allProjects.length ? allProjects : projects).map((project) => jsx('option', { value: project.id ?? project.label, children: project.label ?? project.id }, project.id)),
        ] }),
      ] }) }),
      jsx(Button, { onClick: () => { setSearch(''); setAttentionOnly(false); setScope('all'); setOpenNodes(new Set()); setSelection(null) }, children: 'Reset' }),
    ]}),
    content,
    linkDialog ? jsx(LinkDialog, {
      projectId: scope === 'all' ? projects[0]?.id : scope,
      payload: linkDialog, onClose: () => setLinkDialog(null),
      onDone: () => { setLinkDialog(null); void load() },
    }) : null,
  ]})
}

function MilestoneItemsRow({ projectId, milestoneId }) {
  return jsx('div', { className: 'dy-rm-row depth-3', 'data-rm-items-row': milestoneId, role: 'treeitem', 'aria-level': 4, tabIndex: 0, children:
    jsx('div', { style: { minWidth: 0, flex: 1 }, children: jsx(MilestoneItems, { projectId, milestoneId }) }) })
}

function unlinkedMilestonePayload(project) {
  return {
    title: 'Link a milestone to an initiative',
    subtitle: `Project ${project.label ?? project.id}`,
    choiceLabel: 'Milestone',
    relationships: ['delivers', 'depends_on'],
    confirm: 'Create link',
    loadOptions: async () => {
      const result = await api(`/roadmap?project_id=${encodeURIComponent(project.id)}`)
      const one = result.projects?.[0]
      return (one?.unlinked?.milestones ?? []).map((m) => ({ id: m.id, label: m.name }))
    },
    submit: async (milestoneId, relationship) => {
      const result = await api(`/roadmap?project_id=${encodeURIComponent(project.id)}`)
      const one = result.projects?.[0]
      const initiative = (one?.initiatives ?? [])[0]
      if (!initiative) throw Error('This project has no initiative to link to yet. Create one on the project screen first.')
      await api(`/projects/${encodeURIComponent(project.id)}/initiatives/${encodeURIComponent(initiative.ref)}/milestones`,
        { method: 'POST', body: { milestone_id: Number(milestoneId), relationship } })
    },
  }
}

function unlinkedObjectivePayload(project) {
  return {
    title: 'Link an objective to an initiative',
    subtitle: `Project ${project.label ?? project.id}`,
    choiceLabel: 'Objective',
    relationships: ['supports', 'measures', 'unblocks'],
    confirm: 'Create link',
    loadOptions: async () => {
      const result = await api(`/roadmap?project_id=${encodeURIComponent(project.id)}`)
      const one = result.projects?.[0]
      return (one?.unlinked?.objectives ?? []).map((o) => ({ id: o.id, label: o.name }))
    },
    submit: async (objectiveId, relationship) => {
      const result = await api(`/roadmap?project_id=${encodeURIComponent(project.id)}`)
      const one = result.projects?.[0]
      const initiative = (one?.initiatives ?? [])[0]
      if (!initiative) throw Error('This project has no initiative to link to yet. Create one on the project screen first.')
      await api(`/projects/${encodeURIComponent(project.id)}/objectives/${objectiveId}/initiatives`,
        { method: 'POST', body: { initiative_ref: initiative.ref, relationship } })
    },
  }
}
