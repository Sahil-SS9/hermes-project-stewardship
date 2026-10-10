// GENERATED-STRUCTURE: hand-edited Desktop module. Edit this file, then run
// node hermes_dockyard_plugin/desktop/build.mjs to regenerate plugin.js.
// Design round f: the Vision screen's detail drawer. It opens on demand
// (never a permanent inspector) and is always handed the item from the
// latest plan, so it never shows a stale copy after a change.
import { api } from '../../runtime/context.js'
import { emitToast } from '../../runtime/context.js'
import { unavailableWords } from '../../data/unlinked.js'
import { useEffect } from '../../runtime/react.js'
import { useRef } from '../../runtime/react.js'
import { useState } from '../../runtime/react.js'
import { jsx } from '../../runtime/react.js'
import { jsxs } from '../../runtime/react.js'
import { validationSummary } from '../../data/loaders.js'
import { ObjectiveEvidence } from '../../work-item/detail.js'
import { Button } from '../../lib/ui.js'
import { StatusTag } from '../../lib/ui.js'
import { number } from '../../lib/ui.js'
import { BUCKETS } from '../../lib/plan-vocab.js'
import { COMPLETABLE_STATUSES } from '../../lib/plan-vocab.js'
import { KIND_LABEL } from '../../lib/plan-vocab.js'
import { OUTCOME_LABEL } from '../../lib/plan-vocab.js'
import { REL_LABEL } from '../../lib/plan-vocab.js'
import { WITHDRAWABLE_STATUSES } from '../../lib/plan-vocab.js'
import { forecastLine } from '../../lib/plan-vocab.js'
import { riskLine } from '../../lib/plan-vocab.js'
import { isLinkable } from './plan-data.js'
import { statusOf } from './plan-data.js'
import { KindGlyph } from './plan-ui.js'
import { Tag } from './plan-ui.js'
import { errorText } from './plan-ui.js'

// The initiative loop that was the Initiatives tab, kept as a compact list
// with the same stages and wording. Sahil 05/10 asked how the stages are
// created: they are not. Every initiative has these same eight, and its
// status alone says where it is. Changes requested sits at the approval gate,
// a regression at Observe outcome; a withdrawn or rejected one stopped at the
// approval gate.
const LOOP = [
  ['verify', 'Verify state', () => 'Confirm the project state and evidence source.'],
  ['detect', 'Detect gap', (i) => i.rationale || 'Research the highest-value project gap.'],
  ['propose', 'Create initiative', (i) => i.expectedOutcome || 'Declare the expected outcome.'],
  // No priority number: nothing can set one (the API has no field for it).
  ['prioritise', 'Prioritise', () => 'Counted against the project’s open-initiative limit.'],
  ['approval', 'Human approval', () => 'Owner reviews the risk, evidence and checks.'],
  ['execute', 'Build and verify', (i) => checksOf(i.record.validation_contract) ?? 'No checks recorded: mark it complete when the work is done.'],
  ['release', 'Release', () => 'Release remains bounded by project policy.'],
  ['observe', 'Observe outcome', () => 'Measure whether the project improved.'],
]
const STOPPED = { rejected: 'Rejected at approval.', cancelled: 'Withdrawn before approval.' }
const loopIndex = (status) => ['pending_approval', 'changes_requested', 'rejected', 'cancelled'].includes(status) ? 4
  : ['approved', 'executing'].includes(status) ? 5 : ['completed', 'regressed'].includes(status) ? 7 : 2
// The checks a proposal carries (its validation contract), or null.
function checksOf(contract) {
  const steps = Array.isArray(contract?.steps) ? contract.steps.filter(Boolean) : []
  const tests = typeof contract?.tests === 'string' ? contract.tests.trim() : ''
  return steps.length || tests ? validationSummary(contract) : null
}

function Section({ title, action, children, readOnly }) {
  return jsxs('section', { className: 'dy-plan-drawer-section', children: [
    jsxs('header', { children: [jsx('h4', { children: title }), readOnly ? null : action] }),
    children,
  ] })
}

function Links({ rows, empty }) {
  return jsx('ul', { className: 'dy-plan-links', children: rows.length ? rows : jsx('li', { className: 'empty', children: empty }) })
}

function LinkRow({ kind, title, meta, onOpen, onUnlink, unlinkLabel }) {
  return jsxs('li', { className: 'dy-plan-link-row', children: [
    jsx(KindGlyph, { kind }),
    jsxs('button', { type: 'button', className: 'dy-plan-link-open', onClick: onOpen, 'aria-label': `Open ${title}`, children: [jsx('strong', { children: title }), meta ? jsx('small', { children: meta }) : null] }),
    onUnlink ? jsx('button', { type: 'button', className: 'dy-plan-unlink', 'data-plan-unlink': kind, 'aria-label': unlinkLabel, title: unlinkLabel, onClick: onUnlink, children: '×' }) : null,
  ] })
}

function Facts({ rows }) {
  return jsx('dl', { className: 'dy-plan-facts', children: rows.map(([label, value]) => jsxs('div', { children: [jsx('dt', { children: label }), jsx('dd', { children: value })] }, label)) })
}

function ChangesFeedback({ refId }) {
  const [rows, setRows] = useState(null)
  useEffect(() => {
    let current = true
    api(`/initiatives/${encodeURIComponent(refId)}/decision/receipts`, { quiet: true })
      .then((ledger) => { if (current) setRows((ledger?.receipts ?? []).filter((row) => row.decision === 'changes_requested')) })
      .catch(() => { if (current) setRows([]) })
    return () => { current = false }
  }, [refId])
  if (!rows) return jsx('p', { className: 'dockyard-meta', children: 'Loading the reviewer’s feedback…' })
  // request_changes_initiative stores the reviewer's feedback in `reason`.
  return jsx('blockquote', { className: 'dy-plan-feedback', 'data-plan-feedback': true, children: rows.at(-1)?.reason || 'The reviewer asked for changes without a note.' })
}

function MilestoneWork({ milestone, plan, actions, onChanged, readOnly }) {
  const [detail, setDetail] = useState(null)
  const [failure, setFailure] = useState(null)
  const [scopeRef, setScopeRef] = useState('')
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    let current = true
    setDetail(null); setFailure(null)
    actions.milestoneDetail(milestone.name)
      .then((row) => { if (current) setDetail(row) })
      .catch(() => { if (current) setFailure(`Planning details for ${milestone.name} are unavailable.`) })
    return () => { current = false }
  }, [milestone.name, milestone.itemRefs.join(',')])
  const run = async (work, message) => {
    setBusy(true); setFailure(null)
    try { await work(); emitToast('success', message); setScopeRef(''); onChanged() } catch (error) { setFailure(errorText(error)) } finally { setBusy(false) }
  }
  const editable = !readOnly && !milestone.archived
  const attachable = plan.workItems.filter((item) => !milestone.itemRefs.includes(item.ref))
  const wip = Object.entries(detail?.assignee_wip ?? {})
  return jsxs(Section, { title: 'Work in this milestone', children: [
    failure ? jsx('p', { className: 'dockyard-inline-error', role: 'alert', children: failure }) : null,
    detail ? jsx('p', { className: 'dockyard-meta', children: `Scope: ${detail.committed ?? detail.total} committed, ${detail.done} done, ${detail.blocked ?? 0} blocked (${detail.units || 'items'}, not hours).` })
      : failure ? null : jsx('p', { className: 'dockyard-meta', children: 'Loading…' }),
    wip.length ? jsx('p', { className: 'dockyard-meta', children: `In progress: ${wip.map(([who, n]) => `${who} ${n}`).join(', ')} (item counts).` }) : null,
    detail?.risks?.length ? jsx('ul', { className: 'dy-plan-risks', children: detail.risks.map((risk, index) => jsx('li', { 'data-risk-kind': risk.kind, children: riskLine(risk) }, `${risk.kind}:${index}`)) }) : null,
    detail ? jsx('p', { className: 'dockyard-meta', children: forecastLine(detail.forecast) }) : null,
    jsx(Links, { empty: 'No work items yet.', rows: milestone.itemRefs.map((ref) => jsxs('li', { className: 'dy-plan-link-row', children: [
      jsx(KindGlyph, { kind: 'work' }),
      jsxs('span', { className: 'dy-plan-link-open static', children: [jsx('strong', { children: plan.workItems.find((item) => item.ref === ref)?.title ?? ref }), jsx('small', { children: ref })] }),
      editable ? jsx('button', { type: 'button', className: 'dy-plan-unlink', 'data-plan-detach': ref, 'aria-label': `Remove ${ref} from ${milestone.name}`, title: 'Remove from milestone', disabled: busy,
        onClick: () => run(() => actions.detachWork(milestone.name, ref), `Removed ${ref} from ${milestone.name}.`), children: '×' }) : null,
    ] }, ref)) }),
    editable ? jsxs('div', { className: 'dy-plan-inline', children: [
      jsxs('select', { 'aria-label': `Add a work item to ${milestone.name}`, 'data-plan-attach-choice': true, value: scopeRef, onChange: (event) => setScopeRef(event.target.value), children: [
        jsx('option', { value: '', children: attachable.length ? 'Add a work item…' : 'Every work item is already here' }),
        ...attachable.map((item) => jsx('option', { value: item.ref, children: `${item.title} (${item.ref})` }, item.ref)),
      ] }),
      jsx(Button, { small: true, action: 'plan-attach-work', disabled: busy || !scopeRef, onClick: () => run(() => actions.attachWork(milestone.name, scopeRef), `Added ${scopeRef} to ${milestone.name}.`), children: 'Add' }),
    ] }) : null,
  ] })
}

// item: the live row; ui: the screen's shared actions ({ open, link, edit,
// review, confirm, archive, restore, remove, withdraw, complete, readOnly }).
export function PlanDrawer({ item, plan, actions, ui, onClose, onChanged }) {
  const [evaluation, setEvaluation] = useState(null)
  const [busy, setBusy] = useState(false)
  const root = useRef(null)
  // Narrow screens show the drawer as a bottom sheet over the list: move focus
  // into it, and give it back to the opener when it closes. Wide screens keep
  // focus in the list (the drawer sits beside it).
  useEffect(() => {
    if (getComputedStyle(root.current).position !== 'fixed') return undefined
    const opener = document.activeElement
    root.current.querySelector('[data-plan-drawer-close]')?.focus()
    return () => { if (document.contains(opener)) opener.focus() }
  }, [])
  const readOnly = ui.readOnly
  // New links only on live items: not archived, and not a withdrawn or
  // rejected initiative (it never runs).
  const live = !readOnly && !item.archived && (item.kind !== 'initiative' || isLinkable(item))
  const open = (kind, id) => () => ui.open({ kind, id })
  const linkButton = (target, label = '+ Link') => live ? jsx(Button, { small: true, action: `plan-link-${target}`, onClick: () => ui.link(item, target), children: label }) : null
  // An unlink keeps both items; only the link between them goes.
  const unlink = (title, description, run, label = 'Unlink') => readOnly ? null : () => ui.confirm({ key: 'plan-unlink', title, description, label, done: 'Link removed.', run })
  const act = async (work, message) => {
    setBusy(true)
    try { await work(); emitToast('success', message); onChanged() } catch (error) { emitToast('danger', errorText(error)) } finally { setBusy(false) }
  }
  const initiativeRows = (links, other) => links.map((link) => jsx(LinkRow, {
    kind: 'initiative', title: link.title, meta: REL_LABEL[link.relationship], onOpen: open('initiative', link.ref), unlinkLabel: `Unlink from ${link.title}`,
    onUnlink: unlink(`Unlink this ${other}?`, `“${item.title}” stays in the project; it is no longer linked to “${link.title}”.`,
      () => item.kind === 'milestone' ? actions.unlinkMilestone(link.ref, item.id) : actions.unlinkObjective(link.ref, item.id)),
  }, link.ref))
  const status = statusOf(item)
  const tags = [jsx(StatusTag, { tone: status.tone, label: status.label }, 'status')]
  let body
  let footer = []
  if (item.kind === 'initiative') {
    const stage = loopIndex(item.status)
    const stopped = STOPPED[item.status]
    const checks = checksOf(item.record.validation_contract)
    tags.push(jsx(Tag, { children: `${item.risk} risk` }, 'risk'))
    body = [
      jsx(Facts, { rows: [['Why', item.rationale || '—'], ['Expected outcome', item.expectedOutcome || '—'],
        ['Checks', checks ?? 'None recorded'], ['Reference', item.ref]] }, 'facts'),
      item.status === 'changes_requested' ? jsxs(Section, { title: 'Changes requested', children: [
        jsx(ChangesFeedback, { refId: item.ref }),
        readOnly ? null : jsx(Button, { small: true, variant: 'primary', action: 'plan-revise', onClick: () => ui.edit(item), children: 'Revise and resubmit' }),
      ] }, 'changes') : null,
      item.status === 'pending_approval' && !readOnly ? jsxs(Section, { title: 'Waiting for your decision', children: [
        jsx('p', { className: 'dockyard-meta', children: 'Approve, request changes or reject, with the same checks as the Inbox.' }),
        jsx(Button, { small: true, variant: 'primary', action: 'plan-review', onClick: () => ui.review(item), children: 'Review…' }),
      ] }, 'review') : null,
      jsx(Section, { title: 'Milestones', readOnly, action: linkButton('milestone'), children: jsx(Links, { empty: 'No milestones linked yet.', rows: item.milestones.map((m) => {
        const row = plan.milestones.find((x) => x.id === m.id)
        return jsx(LinkRow, { kind: 'milestone', title: m.title, onOpen: open('milestone', m.id), unlinkLabel: `Unlink ${m.title}`,
          meta: [REL_LABEL[m.relationship], row?.due && `due ${row.due}`, row && `${row.done}/${row.total} done`, row?.closed && 'closed'].filter(Boolean).join(' · '),
          onUnlink: unlink('Unlink this milestone?', `“${m.title}” stays in the project; it is no longer linked to “${item.title}”.`, () => actions.unlinkMilestone(item.ref, m.id)) }, m.id)
      }) }) }, 'milestones'),
      jsx(Section, { title: 'Objectives', readOnly, action: linkButton('objective'), children: jsx(Links, {
        empty: 'No objectives linked yet. Work finishing does not prove the outcome; link an objective that measures it.',
        rows: item.objectives.map((o) => {
          const row = plan.objectives.find((x) => x.id === o.id)
          return jsx(LinkRow, { kind: 'objective', title: o.title, onOpen: open('objective', o.id), unlinkLabel: `Unlink ${o.title}`,
            meta: [REL_LABEL[o.relationship], row && OUTCOME_LABEL[row.outcome]].filter(Boolean).join(' · '),
            onUnlink: unlink('Unlink this objective?', `“${o.title}” stays in the project; it no longer measures “${item.title}”.`, () => actions.unlinkObjective(item.ref, o.id)) }, o.id)
        }),
      }) }, 'objectives'),
      jsx(Section, { title: 'Delivery', children: !item.delivery || item.delivery.state === 'no_linked_work'
        ? jsx('p', { className: 'dockyard-meta', children: 'No linked work yet.' })
        : item.delivery.state === 'unavailable' ? jsx('p', { className: 'dockyard-meta', children: unavailableWords(item.delivery.reason) })
          : jsx('div', { className: 'dy-plan-buckets', children: [
              ...BUCKETS.map(([key, label]) => jsxs('span', { children: [jsx('strong', { children: number(item.delivery[key] ?? 0) }), label] }, key)),
              item.delivery.blocked > 0 ? jsxs('span', { className: 'blocked', children: [jsx('strong', { children: number(item.delivery.blocked) }), 'Blocked'] }, 'blocked') : null,
            ] }) }, 'delivery'),
      jsx('p', { className: 'dy-plan-note', 'data-plan-no-delete': true, children: WITHDRAWABLE_STATUSES.includes(item.status)
        ? 'Initiatives are not deleted: each keeps its approval record. Not needed any more? Withdraw it before approval.'
        : 'Initiatives are not deleted: each keeps its approval record.' }, 'nodelete'),
      jsx(Section, { title: 'Stages', children: jsx('ol', { className: 'dy-plan-loop', 'data-plan-loop': item.ref, children: LOOP.map(([key, label, text], index) => jsxs('li', {
        className: index < stage ? 'done' : index === stage ? (stopped ? 'stopped' : 'current') : '', 'aria-current': index === stage ? 'step' : undefined,
        children: [jsx('strong', { children: label }), index === stage ? jsx('small', { children: stopped ?? text(item) }) : null],
      }, key)) }) }, 'loop'),
    ]
    footer = [
      COMPLETABLE_STATUSES.includes(item.status) ? jsx(Button, { variant: 'primary', action: 'plan-complete', onClick: () => ui.complete(item), children: 'Mark complete…' }, 'complete') : null,
      WITHDRAWABLE_STATUSES.includes(item.status) ? jsx(Button, { variant: 'danger', action: 'plan-withdraw', onClick: () => ui.withdraw(item), children: 'Withdraw…' }, 'withdraw') : null,
    ].filter(Boolean)
  } else if (item.kind === 'milestone') {
    body = [
      jsx(Facts, { rows: [['Due', item.due ?? 'No due date'], ['Progress', `${number(item.done)} of ${number(item.total)} work items done`]] }, 'facts'),
      jsx(Section, { title: 'Initiatives', readOnly, action: linkButton('initiative'), children: jsx(Links, { empty: 'Not linked to an initiative yet.', rows: initiativeRows(item.initiatives, 'milestone') }) }, 'initiatives'),
      jsx(MilestoneWork, { milestone: item, plan, actions, onChanged, readOnly }, 'work'),
    ]
    footer = item.archived ? [
      jsx(Button, { action: 'plan-restore-milestone', onClick: () => ui.restore(item), children: 'Restore' }, 'restore'),
      jsx(Button, { variant: 'danger', action: 'plan-delete-milestone', onClick: () => ui.remove(item), children: 'Delete for good…' }, 'delete'),
    ] : [
      jsx(Button, { variant: 'primary', action: 'plan-edit', onClick: () => ui.edit(item), children: 'Edit' }, 'edit'),
      jsx(Button, { action: item.closed ? 'plan-reopen-milestone' : 'plan-close-milestone', disabled: busy,
        onClick: () => act(() => actions.updateMilestone(item.name, { closed: !item.closed }), item.closed ? 'Milestone reopened.' : 'Milestone closed.'), children: item.closed ? 'Reopen' : 'Close' }, 'close'),
      jsx(Button, { variant: 'danger', action: 'plan-archive-milestone', onClick: () => ui.archive(item), children: 'Archive' }, 'archive'),
    ]
  } else if (item.kind === 'objective') {
    tags.push(jsx(Tag, { children: `${item.severity} severity` }, 'severity'))
    const evaluate = async () => {
      setBusy(true); setEvaluation(null)
      try {
        // Same reading as the Objectives screen: { recorded, result: { state, measured, detail } }.
        const { recorded, result = {} } = await actions.evaluateObjective(item.id)
        const state = result.state ?? 'unknown'
        setEvaluation([
          `Evaluate now: ${OUTCOME_LABEL[state] ?? state}.`,
          result.measured != null ? ` Measured ${result.measured}.` : '',
          result.detail ? ` Detail: ${result.detail}.` : '',
          recorded === false ? ' No new evidence recorded.' : '',
          state === 'unknown' ? ' No evidence was made up; the objective stays unproven.' : '',
        ].join(''))
        onChanged()
      } catch (error) { setEvaluation(`Evaluate now failed: ${errorText(error)}`) } finally { setBusy(false) }
    }
    const goal = item.goals[0]
    const goalRow = goal && plan.goals.find((x) => x.id === goal.id)
    body = [
      jsx(Facts, { rows: [['Description', item.description || '—'], ['Target', item.target],
        ['Evidence', item.samples ? `${number(item.samples)} result(s) in ${item.window}${item.passRate !== null ? `, ${Math.round(item.passRate * 100)}% passed` : ''}` : `None yet (${item.window} window)`]] }, 'facts'),
      evaluation ? jsx('p', { className: 'dy-plan-note', role: 'status', 'data-plan-evaluation': true, children: evaluation }, 'evaluation') : null,
      // Evidence history and, for a manual objective, the human assessment
      // form: the old Objectives tab's panel, unchanged (it fails closed
      // without an authenticated human).
      item.record ? jsx(ObjectiveEvidence, { objective: item.record, projectId: plan.projectId, onSaved: onChanged }, 'evidence') : null,
      // The backend allows each objective in one goal.
      jsx(Section, { title: 'Goal it measures', readOnly, action: goal ? null : linkButton('goal', '+ Add'), children: jsx(Links, {
        empty: 'Not part of a goal yet. An objective can measure one goal.',
        rows: goal ? [jsx(LinkRow, { kind: 'goal', title: goal.title, onOpen: open('goal', goal.id), unlinkLabel: `Remove from ${goal.title}`,
          onUnlink: unlink('Remove from this goal?', `“${item.title}” no longer measures the goal “${goal.title}”.`,
            () => actions.updateGoal(goal.id, { objective_ids: goalRow.objectiveIds.filter((id) => id !== item.id) }), 'Remove') }, goal.id)] : [],
      }) }, 'goal'),
      jsx(Section, { title: 'Initiatives it measures', readOnly, action: linkButton('initiative'), children: jsx(Links, { empty: 'Not linked to an initiative yet.', rows: initiativeRows(item.initiatives, 'objective') }) }, 'initiatives'),
    ]
    footer = item.archived ? [jsx(Button, { variant: 'danger', action: 'plan-delete-objective', onClick: () => ui.remove(item), children: 'Delete for good…' }, 'delete')] : [
      jsx(Button, { variant: 'primary', action: 'plan-edit', onClick: () => ui.edit(item), children: 'Edit' }, 'edit'),
      jsx(Button, { action: 'plan-evaluate', disabled: busy, onClick: evaluate, children: busy ? 'Evaluating…' : 'Evaluate now' }, 'evaluate'),
      jsx(Button, { variant: 'danger', action: 'plan-archive-objective', onClick: () => ui.archive(item), children: 'Archive' }, 'archive'),
    ]
  } else {
    const active = plan.goals.filter((row) => !row.archived)
    const index = active.findIndex((row) => row.id === item.id)
    const move = (step) => {
      const ids = active.map((row) => row.id)
      ;[ids[index], ids[index + step]] = [ids[index + step], ids[index]]
      act(() => actions.orderGoals(ids), 'Goal order saved.')
    }
    body = [
      jsx(Facts, { rows: [['Description', item.description || '—'], ['Order', item.archived ? '—' : `${index + 1} of ${active.length}`]] }, 'facts'),
      jsx(Section, { title: 'Objectives that measure it', readOnly, action: linkButton('objective', '+ Add'), children: jsx(Links, {
        empty: 'No objectives yet. A goal is met only when its objectives pass.',
        rows: item.objectiveIds.map((id) => {
          const row = plan.objectives.find((x) => x.id === id)
          const title = row?.title ?? `Objective ${id}`
          return jsx(LinkRow, { kind: 'objective', title, meta: row && OUTCOME_LABEL[row.outcome], onOpen: open('objective', id), unlinkLabel: `Remove ${title} from this goal`,
            onUnlink: unlink('Remove from this goal?', `“${title}” no longer measures “${item.title}”.`,
              () => actions.updateGoal(item.id, { objective_ids: item.objectiveIds.filter((x) => x !== id) }), 'Remove') }, id)
        }),
      }) }, 'objectives'),
    ]
    footer = item.archived ? [
      jsx(Button, { action: 'plan-restore-goal', onClick: () => ui.restore(item), children: 'Restore' }, 'restore'),
      jsx(Button, { variant: 'danger', action: 'plan-delete-goal', onClick: () => ui.remove(item), children: 'Delete for good…' }, 'delete'),
    ] : [
      jsx(Button, { variant: 'primary', action: 'plan-edit', onClick: () => ui.edit(item), children: 'Edit' }, 'edit'),
      jsx(Button, { action: 'plan-goal-up', disabled: busy || index <= 0, onClick: () => move(-1), children: 'Move up' }, 'up'),
      jsx(Button, { action: 'plan-goal-down', disabled: busy || index >= active.length - 1, onClick: () => move(1), children: 'Move down' }, 'down'),
      jsx(Button, { variant: 'danger', action: 'plan-archive-goal', onClick: () => ui.archive(item), children: 'Archive' }, 'archive'),
    ]
  }
  return jsxs('aside', { ref: root, className: 'dy-plan-drawer', 'aria-label': `${KIND_LABEL[item.kind]} details`, 'data-plan-drawer': item.kind, 'data-plan-drawer-id': String(item.id), children: [
    jsxs('header', { className: 'dy-plan-drawer-head', children: [
      jsxs('p', { className: 'dockyard-meta', children: [jsx(KindGlyph, { kind: item.kind }), KIND_LABEL[item.kind]] }),
      jsx('h3', { children: item.title }),
      jsx('div', { className: 'dy-plan-tags', children: tags }),
      jsx('button', { type: 'button', className: 'dy-plan-drawer-close', 'aria-label': 'Close details', 'data-plan-drawer-close': true, onClick: onClose, children: '×' }),
    ] }),
    jsx('div', { className: 'dy-plan-drawer-body', children: body }),
    readOnly || !footer.length ? null : jsx('footer', { className: 'dy-plan-drawer-foot', children: footer }),
  ] })
}
