// GENERATED-STRUCTURE: hand-edited Desktop module. Edit this file, then run
// node hermes_dockyard_plugin/desktop/build.mjs to regenerate plugin.js.
// Design round f (Sahil 05/10): shared parts of the Vision screen: menus,
// dialogs and forms.
import { emitToast } from '../../runtime/context.js'
import { useEffect } from '../../runtime/react.js'
import { useRef } from '../../runtime/react.js'
import { useState } from '../../runtime/react.js'
import { jsx } from '../../runtime/react.js'
import { jsxs } from '../../runtime/react.js'
import { Button } from '../../lib/ui.js'
import { ConfirmDialog } from '../../lib/ui.js'
import { formatWhen } from '../../lib/ui.js'
import { useDialogFocusManager } from '../../lib/ui.js'
import { ICON } from '../../lib/plan-vocab.js'
import { KIND_LABEL } from '../../lib/plan-vocab.js'


const RISKS = ['low', 'medium', 'high']
const SEVERITIES = ['low', 'medium', 'high', 'critical']
const capital = (word) => word[0].toUpperCase() + word.slice(1)
export const errorText = (failure) => String(failure?.message ?? failure ?? 'Something went wrong')

export function KindGlyph({ kind }) {
  return jsx('span', { className: `dy-plan-glyph ${kind}`, 'aria-hidden': true, children: ICON[kind] ?? '·' })
}

export function Tag({ tone = 'neutral', children, data = {} }) {
  return jsx('span', { className: `dy-plan-tag ${tone}`, ...data, children })
}

// A small popover menu, anchored under its own trigger. Closes on a choice,
// Escape or a click outside; focus returns to the trigger.
export function Menu({ label, trigger, items, action, variant = '' }) {
  const [open, setOpen] = useState(false)
  const root = useRef(null)
  const button = useRef(null)
  useEffect(() => {
    if (!open) return undefined
    const outside = (event) => { if (!root.current?.contains(event.target)) setOpen(false) }
    document.addEventListener('mousedown', outside)
    root.current?.querySelector('[role="menuitem"]:not([disabled])')?.focus()
    return () => document.removeEventListener('mousedown', outside)
  }, [open])
  const keydown = (event) => {
    if (event.key === 'Escape') { event.stopPropagation(); setOpen(false); button.current?.focus(); return }
    if (!['ArrowDown', 'ArrowUp'].includes(event.key)) return
    event.preventDefault()
    const entries = [...(root.current?.querySelectorAll('[role="menuitem"]:not([disabled])') ?? [])]
    const index = entries.indexOf(document.activeElement)
    entries[(index + (event.key === 'ArrowDown' ? 1 : -1) + entries.length) % entries.length]?.focus()
  }
  return jsxs('span', { className: 'dy-plan-menu', ref: root, onKeyDown: keydown, onClick: (event) => event.stopPropagation(), children: [
    jsx('button', {
      ref: button, type: 'button', className: `dy-plan-menu-trigger ${variant}`, 'aria-haspopup': 'menu', 'aria-expanded': open,
      'aria-label': label, 'data-plan-menu': action, title: label, onClick: () => setOpen(!open), children: trigger,
    }),
    open ? jsx('span', { className: 'dy-plan-menu-list', role: 'menu', 'aria-label': label, children:
      items.filter(Boolean).map((item) => jsx('button', {
        type: 'button', role: 'menuitem', className: item.danger ? 'danger' : '', 'data-plan-menu-item': item.id,
        // Focus the trigger before acting, so a dialog opened from the menu
        // returns focus there when it closes (the menu item itself is gone).
        onClick: () => { setOpen(false); button.current?.focus(); item.onSelect() }, children: item.label,
      }, item.id)) }) : null,
  ] })
}

// One modal frame for every Vision dialog (same classes as ConfirmDialog).
export function PlanDialog({ dialogKey, eyebrow, title, onClose, busy = false, children, actions, wide = false }) {
  useDialogFocusManager(`[data-plan-dialog="${dialogKey}"]`)
  return jsx('div', {
    className: 'dockyard-modal-layer', 'data-plan-dialog': dialogKey,
    onKeyDown: (event) => { if (event.key === 'Escape' && !busy) { event.stopPropagation(); onClose() } },
    onClick: (event) => { if (event.target === event.currentTarget && !busy) onClose() },
    children: jsxs('section', { className: `dockyard-modal dy-plan-dialog${wide ? ' wide' : ''}`, role: 'dialog', 'aria-modal': true, 'aria-labelledby': `dy-plan-dialog-${dialogKey}`, children: [
      jsxs('header', { className: 'dy-plan-dialog-head', children: [
        eyebrow ? jsx('p', { className: 'dockyard-meta', children: eyebrow }) : null,
        jsx('h2', { id: `dy-plan-dialog-${dialogKey}`, children: title }),
      ] }),
      children,
      jsx('div', { className: 'dockyard-modal-actions', children: actions }),
    ] }),
  })
}

function Field({ id, label, required, error, hint, children }) {
  return jsxs('label', { className: `dockyard-field dy-plan-field${error ? ' invalid' : ''}`, htmlFor: id, children: [
    jsxs('span', { children: [label, jsx('em', { className: 'dy-plan-required', children: required ? ' required' : ' optional' })] }),
    children,
    error ? jsx('small', { className: 'dy-plan-field-error', id: `${id}-error`, role: 'alert', children: error }) : hint ? jsx('small', { className: 'dy-plan-field-hint', children: hint }) : null,
  ] })
}

const blank = (kind, item) => ({
  initiative: { title: item?.title ?? '', rationale: item?.rationale ?? '', expectedOutcome: item?.expectedOutcome ?? '', risk: item?.risk ?? 'low', checks: '' },
  milestone: { title: item?.title ?? '', due: item?.due ?? '', closed: Boolean(item?.closed) },
  objective: { title: item?.title ?? '', description: item?.description ?? '', target: item?.target ?? '>=1', severity: item?.severity ?? 'medium' },
  goal: { title: item?.title ?? '', description: item?.description ?? '', objectiveIds: item?.objectiveIds ?? [] },
}[kind])

function validate(kind, form, mode) {
  const errors = {}
  // A resubmitted initiative keeps its proposed title (the backend has no rename).
  if (!(mode === 'edit' && kind === 'initiative') && !form.title.trim()) errors.title = `Give the ${KIND_LABEL[kind].toLowerCase()} a name.`
  if (kind === 'initiative' && !form.rationale.trim()) errors.rationale = 'Say why this initiative matters; reviewers decide on it.'
  if (kind === 'objective' && !form.target.trim()) errors.target = 'Set a target, for example >=1.'
  return errors
}

// One write per kind and mode; returns the toast text.
async function save(kind, mode, form, item, actions, linkTo) {
  const name = form.title.trim()
  if (kind === 'initiative') {
    if (mode === 'create') { await actions.proposeInitiative(form); return `Proposed “${name}”. It waits for approval.` }
    await actions.resubmitInitiative(item.ref, form); return `Resubmitted “${item.title}” for approval.`
  }
  if (kind === 'milestone') {
    if (mode === 'create') {
      const created = await actions.createMilestone(form)
      if (linkTo) await actions.linkMilestone(linkTo.ref, created?.id, linkTo.relationship)
      return `Created milestone “${name}”${linkTo ? ' and linked it' : ''}.`
    }
    if (name !== item.name) await actions.renameMilestone(item.name, name)
    if ((form.due || null) !== (item.due || null) || form.closed !== item.closed) await actions.updateMilestone(name, { due: form.due || null, closed: form.closed })
    return `Saved milestone “${name}”.`
  }
  if (kind === 'objective') {
    if (mode === 'edit') { await actions.updateObjective(item.id, form); return `Saved objective “${name}”.` }
    const created = await actions.createObjective(form)
    if (linkTo) await actions.linkObjective(linkTo.ref, created?.id, linkTo.relationship)
    return `Created objective “${name}”${linkTo ? ' and linked it' : ''}.`
  }
  if (mode === 'create') { await actions.createGoal(form); return `Created goal “${name}”.` }
  await actions.updateGoal(item.id, { title: name, description: form.description.trim(), objective_ids: form.objectiveIds })
  return `Saved goal “${name}”.`
}

// Create or edit any of the four plan items. linkTo { ref, title, relationship }
// links a newly created milestone or objective to that initiative.
export function ItemForm({ kind, mode = 'create', item, plan, actions, linkTo, onClose, onDone }) {
  const [form, setForm] = useState(() => blank(kind, item))
  const [touched, setTouched] = useState({})
  const [tried, setTried] = useState(false)
  const [busy, setBusy] = useState(false)
  const [failure, setFailure] = useState(null)
  const errors = validate(kind, form, mode)
  const shown = (name) => (tried || touched[name]) ? errors[name] : null
  const set = (name) => (event) => setForm((current) => ({ ...current, [name]: event.target.type === 'checkbox' ? event.target.checked : event.target.value }))
  const input = (name, props = {}) => ({
    id: `dy-plan-${kind}-${name}`, value: form[name], onChange: set(name), onBlur: () => setTouched((current) => ({ ...current, [name]: true })), 'data-plan-field': name,
    'aria-invalid': Boolean(shown(name)), 'aria-describedby': shown(name) ? `dy-plan-${kind}-${name}-error` : undefined, ...props,
  })
  const field = (name, label, control, extra = {}) => jsx(Field, { id: `dy-plan-${kind}-${name}`, label, error: shown(name), children: control, ...extra }, name)
  const options = (values) => values.map((value) => jsx('option', { value, children: capital(value) }, value))
  const submit = async () => {
    setTried(true)
    if (Object.keys(errors).length) return
    setBusy(true); setFailure(null)
    try { emitToast('success', await save(kind, mode, form, item, actions, linkTo)); onDone() } catch (error) { setFailure(errorText(error)); setBusy(false) }
  }
  const fields = {
    initiative: () => [
      mode === 'create' ? field('title', 'Title', jsx('input', input('title', { autoComplete: 'off' })), { required: true }) : null,
      field('rationale', 'Why it matters', jsx('textarea', input('rationale', { rows: 3 })), { required: true }),
      field('expectedOutcome', 'Expected outcome', jsx('textarea', input('expectedOutcome', { rows: 2 })), { hint: 'What should be true when it is done.' }),
      field('risk', 'Risk', jsx('select', { ...input('risk'), children: options(RISKS) }), { required: true }),
      // The backend cannot add checks later (resubmit keeps them as they are),
      // so the box is offered when proposing only.
      mode === 'create' ? field('checks', 'How we’ll know it worked', jsx('textarea', input('checks', { rows: 2, placeholder: 'For example: the test suite passes and sign-ups recover to 40 a day.' })),
        { hint: 'Optional. Reviewers see these checks. Hermes can only finish an initiative by itself when it has them; without them, mark it complete when the work is done.' }) : null,
    ],
    milestone: () => [
      field('title', 'Name', jsx('input', input('title', { autoComplete: 'off' })), { required: true }),
      field('due', 'Due date', jsx('input', input('due', { type: 'date' })), { hint: 'Shown as overdue once it passes and the milestone is still open.' }),
      mode === 'edit' ? jsxs('label', { className: 'dy-plan-check', children: [jsx('input', { type: 'checkbox', checked: form.closed, onChange: set('closed'), 'data-plan-field': 'closed' }), 'Closed (finished)'] }, 'closed') : null,
    ],
    objective: () => [
      field('title', 'Name', jsx('input', input('title', { autoComplete: 'off' })), { required: true }),
      field('description', 'Description', jsx('textarea', input('description', { rows: 2 }))),
      field('target', 'Target', jsx('input', input('target', { autoComplete: 'off' })), { required: true, hint: 'How evidence is judged, for example >=1.' }),
      field('severity', 'Severity', jsx('select', { ...input('severity'), children: options(SEVERITIES) }), { required: true }),
    ],
    goal: () => {
      // The backend allows each objective in one goal only (archived goals
      // included), so an objective already in another goal is shown, not offered.
      const choices = plan.objectives.filter((row) => !row.archived)
      const ownerOf = (objectiveId) => plan.goals.find((goal) => goal.id !== item?.id && goal.objectiveIds.includes(objectiveId))
      const toggle = (id, on) => setForm((current) => ({ ...current, objectiveIds: on ? [...current.objectiveIds, id] : current.objectiveIds.filter((x) => x !== id) }))
      return [
        field('title', 'Title', jsx('input', input('title', { autoComplete: 'off' })), { required: true }),
        field('description', 'Description', jsx('textarea', input('description', { rows: 2 }))),
        jsxs('fieldset', { className: 'dy-plan-checklist', children: [
          jsx('legend', { children: 'Objectives that measure this goal (optional)' }),
          choices.length ? null : jsx('p', { className: 'dockyard-meta', children: 'No objectives yet. Add one first, then link it here.' }),
          ...choices.map((row) => {
            const owner = ownerOf(row.id)
            return jsxs('label', { className: `dy-plan-check${owner ? ' taken' : ''}`, children: [
              jsx('input', { type: 'checkbox', 'data-plan-goal-objective': row.id, disabled: Boolean(owner), checked: form.objectiveIds.includes(row.id), onChange: (event) => toggle(row.id, event.target.checked) }),
              row.title,
              owner ? jsx('small', { children: ` already measures “${owner.title}”${owner.archived ? ' (archived)' : ''}` }) : null,
            ] }, row.id)
          }),
        ] }, 'objectives'),
      ]
    },
  }[kind]()
  const verb = mode === 'create' ? (kind === 'initiative' ? 'Propose' : 'Create') : (kind === 'initiative' ? 'Resubmit' : 'Save')
  const title = mode === 'create' ? `New ${KIND_LABEL[kind].toLowerCase()}` : kind === 'initiative' ? `Revise “${item.title}”` : `Edit ${KIND_LABEL[kind].toLowerCase()}`
  const note = kind !== 'initiative' ? null : mode === 'create'
    ? 'A new initiative waits for approval before work starts. Reviewers see why it matters and its risk.'
    : 'Changes were requested. Update the proposal and resubmit it for approval. The title stays as proposed.'
  return jsx(PlanDialog, {
    dialogKey: `${mode}-${kind}`, eyebrow: linkTo ? `Will be linked to ${linkTo.title}` : plan.label, title, busy, onClose,
    actions: [
      jsx(Button, { onClick: onClose, disabled: busy, children: 'Cancel' }, 'cancel'),
      jsx(Button, { variant: 'primary', action: `plan-${mode}-${kind}`, disabled: busy, onClick: submit, children: busy ? `${verb}…` : verb }, 'submit'),
    ],
    children: jsxs('form', { className: 'dy-plan-form', noValidate: true, onSubmit: (event) => { event.preventDefault(); submit() }, children: [
      note ? jsx('p', { className: 'dy-plan-note', children: note }) : null,
      ...fields,
      failure ? jsx('p', { className: 'dockyard-inline-error', role: 'alert', children: failure }) : null,
      // Enter in a field submits; the visible button sits in the dialog footer.
      jsx('button', { type: 'submit', hidden: true }),
    ] }),
  })
}

// Place one plan item under its single v42 parent. The human picks the parent;
// nothing is chosen for them, and there is no relationship to pick (a placement
// is one parent on the child).
export function LinkDialog({ from, target, plan, actions, onClose, onDone, onCreateNew }) {
  // Candidates are the possible parents for `from` at this level, excluding any
  // already carrying a different child where the ladder allows only one.
  const options = from.kind === 'goal' ? plan.objectives.filter((row) => !row.archived)
    : from.kind === 'objective' ? plan.milestones.filter((row) => !row.archived)
      : from.kind === 'milestone' ? plan.initiatives.filter((row) => row.status !== 'rejected')
        : plan.milestones.filter((row) => !row.archived)
  const [choice, setChoice] = useState('')
  const [busy, setBusy] = useState(false)
  const [failure, setFailure] = useState(null)
  const chosen = options.find((row) => String(row.id ?? row.ref) === choice)
  const submit = async () => {
    setBusy(true); setFailure(null)
    try {
      // v42: a placement is a PUT of one parent on the child.
      if (from.kind === 'goal') await actions.linkGoal(from.id, chosen.id)
      else if (from.kind === 'objective') await actions.linkObjective(chosen.id, from.id)
      else if (from.kind === 'milestone') await actions.linkMilestone(chosen.ref, from.id)
      emitToast('success', `Placed “${from.title}” under “${chosen.title}”.`)
      onDone()
    } catch (error) {
      setFailure(errorText(error)); setBusy(false)
    }
  }
  const noun = KIND_LABEL[target].toLowerCase()
  const parentNoun = from.kind === 'goal' ? 'objective' : from.kind === 'objective' ? 'milestone' : from.kind === 'milestone' ? 'initiative' : 'milestone'
  return jsx(PlanDialog, {
    dialogKey: `link-${from.kind}-${target}`, eyebrow: `${KIND_LABEL[from.kind]} · ${from.title}`, title: `Place under a ${parentNoun}`, busy, onClose,
    actions: [
      onCreateNew ? jsx(Button, { action: `plan-link-new-${target}`, disabled: busy, onClick: onCreateNew, children: `New ${noun}…` }, 'new') : null,
      jsx(Button, { onClick: onClose, disabled: busy, children: 'Cancel' }, 'cancel'),
      jsx(Button, { variant: 'primary', action: 'plan-link-confirm', disabled: busy || !chosen, onClick: submit, children: busy ? 'Placing…' : 'Place' }, 'link'),
    ],
    children: jsxs('div', { className: 'dy-plan-form', children: [
      options.length === 0
        ? jsx('p', { className: 'dy-plan-note', children: `Nothing to place it under: this project has no ${parentNoun} yet${onCreateNew ? `. Create a new ${noun} instead` : ''}.` })
        : jsx(Field, { id: 'dy-plan-link-choice', label: KIND_LABEL[target], required: true, children: jsxs('select', { id: 'dy-plan-link-choice', 'data-plan-link-choice': true, value: choice, onChange: (event) => setChoice(event.target.value), children: [
          jsx('option', { value: '', children: 'Choose…' }),
          ...options.map((row) => jsx('option', { value: String(row.id ?? row.ref), children: row.title }, row.id ?? row.ref)),
        ] }) }),
      failure ? jsx('p', { className: 'dockyard-inline-error', role: 'alert', children: failure }) : null,
    ] }),
  })
}

// Archive / delete / unlink confirmations share the app's destructive dialog.
// spec: { key, title, description, label, done, run, after? }
export function Confirm({ spec, onCancel, onDone }) {
  const [busy, setBusy] = useState(false)
  const [failure, setFailure] = useState(null)
  return jsx(ConfirmDialog, {
    confirmKey: spec.key, title: spec.title, confirmLabel: busy ? 'Working…' : spec.label, busy,
    description: failure ? `${spec.description} — ${failure}` : spec.description,
    onCancel,
    onConfirm: async () => {
      setBusy(true); setFailure(null)
      try { await spec.run(); emitToast('success', spec.done); onDone(); spec.after?.() } catch (error) { setFailure(errorText(error)); setBusy(false) }
    },
  })
}

// An initiative step that changes its state: Withdraw (with an optional
// reason for the record) or Mark complete. Not a plain delete, so it has its
// own dialog: the confirm button takes the step's tone, and the text says
// exactly what happens.
// spec: { key, eyebrow, title, lines: string[], label, variant, reasonLabel?, done, run(reason) }
export function ActionDialog({ spec, onCancel, onDone }) {
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [failure, setFailure] = useState(null)
  const submit = async () => {
    setBusy(true); setFailure(null)
    try { await spec.run(reason.trim()); emitToast('success', spec.done); onDone() } catch (error) { setFailure(errorText(error)); setBusy(false) }
  }
  const id = `dy-plan-${spec.key}-reason`
  return jsx(PlanDialog, {
    dialogKey: spec.key, eyebrow: spec.eyebrow, title: spec.title, busy, onClose: onCancel,
    actions: [
      jsx(Button, { onClick: onCancel, disabled: busy, children: 'Cancel' }, 'cancel'),
      jsx(Button, { variant: spec.variant ?? 'primary', action: `plan-${spec.key}-confirm`, disabled: busy, onClick: submit, children: busy ? 'Working…' : spec.label }, 'confirm'),
    ],
    children: jsxs('div', { className: 'dy-plan-form', children: [
      jsx('ul', { className: 'dy-plan-consequences', children: spec.lines.filter(Boolean).map((line) => jsx('li', { children: line }, line)) }),
      spec.reasonLabel ? jsx(Field, { id, label: spec.reasonLabel, children: jsx('textarea', {
        id, rows: 2, value: reason, 'data-plan-field': 'reason', maxLength: 2000, onChange: (event) => setReason(event.target.value),
      }) }) : null,
      failure ? jsx('p', { className: 'dockyard-inline-error', role: 'alert', children: failure }) : null,
    ] }),
  })
}

// Mission: one line at the top of the screen, edited in place.
export function MissionStrip({ plan, actions, onChanged, onConfirm }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(plan.mission)
  const [busy, setBusy] = useState(false)
  const [failure, setFailure] = useState(null)
  const [history, setHistory] = useState(false)
  const cancel = () => { setEditing(false); setDraft(plan.mission); setFailure(null) }
  const saveMission = async () => {
    if (!draft.trim()) { setFailure('Write the mission, or use Remove mission to clear it.'); return }
    setBusy(true); setFailure(null)
    try { await actions.saveMission(draft); emitToast('success', 'Mission saved.'); setEditing(false); onChanged() } catch (error) { setFailure(errorText(error)) } finally { setBusy(false) }
  }
  return jsxs('section', { className: 'dy-plan-mission', 'data-plan-mission': true, 'aria-label': 'Project mission', children: [
    jsx('span', { className: 'dy-plan-mission-label', children: 'Mission' }),
    editing
      ? jsxs('div', { className: 'dy-plan-mission-edit', children: [
          jsx('textarea', { 'aria-label': 'Mission statement', 'data-plan-mission-input': true, rows: 2, value: draft, onChange: (event) => setDraft(event.target.value),
            onKeyDown: (event) => { if (event.key === 'Escape') { event.stopPropagation(); cancel() } } }),
          jsx(Button, { small: true, variant: 'primary', action: 'plan-mission-save', disabled: busy, onClick: saveMission, children: busy ? 'Saving…' : 'Save' }),
          jsx(Button, { small: true, disabled: busy, onClick: cancel, children: 'Cancel' }),
        ] })
      : jsx('p', { className: plan.mission ? '' : 'empty', children: plan.mission || 'No mission set. Say what this project exists to achieve.' }),
    editing ? null : jsx(Button, { small: true, action: 'plan-mission-edit', onClick: () => { setDraft(plan.mission); setEditing(true) }, children: plan.mission ? 'Edit' : 'Add mission' }),
    editing ? null : jsx(Menu, { label: 'Mission actions', trigger: '⋯', action: 'mission', items: [
      { id: 'history', label: history ? 'Hide mission history' : `Mission history (${plan.missionHistory.length})`, onSelect: () => setHistory(!history) },
      plan.mission ? { id: 'archive', label: 'Archive mission…', onSelect: () => onConfirm({ key: 'archive-mission', title: 'Archive this mission?', description: 'The mission moves to history and is removed from the active project.', label: 'Archive mission', done: 'Mission archived.', run: actions.archiveMission }) } : null,
      plan.mission ? { id: 'remove', label: 'Remove mission…', danger: true, onSelect: () => onConfirm({ key: 'remove-mission', title: 'Remove this mission?', description: 'The active mission is cleared without adding it to mission history.', label: 'Remove mission', done: 'Mission removed.', run: actions.removeMission }) } : null,
    ] }),
    failure ? jsx('p', { className: 'dockyard-inline-error', role: 'alert', children: failure }) : null,
    history ? jsx('ol', { className: 'dy-plan-mission-history', 'data-plan-mission-history': true, children: plan.missionHistory.length
      // Same wording as the old Objectives screen's mission history.
      ? plan.missionHistory.map((entry) => jsxs('li', { children: [
          jsx('span', { children: entry.mission }),
          jsx('small', { children: `Archived ${formatWhen(entry.archived_at) || 'previously'} by ${entry.archived_by || 'unknown'}` }),
        ] }, entry.archive_id))
      : jsx('li', { className: 'empty', children: 'No earlier missions.' }) }) : null,
  ] })
}
