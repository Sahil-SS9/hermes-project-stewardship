// GENERATED-STRUCTURE: hand-edited Desktop module. Edit this file, then run
// node hermes_dockyard_plugin/desktop/build.mjs to regenerate plugin.js.
//
// Workflows design round (07/10/2026): pieces both options use. Anything that
// writes to the stand-in store is tagged "Preview".
import { useState } from '../../runtime/react.js'
import { useEffect } from '../../runtime/react.js'
import { jsxs } from '../../runtime/react.js'
import { jsx } from '../../runtime/react.js'
import { Button } from '../../lib/ui.js'
import { useDialogFocusManager } from '../../lib/ui.js'
import { readWorkflowSettings } from './standins.js'
import { writeWorkflowSettings } from './standins.js'
import { CHECK_WORDS } from './standins.js'

export const PreviewTag = ({ children = 'Preview' }) => jsx('span', { className: 'dy-wfd-preview-tag', children })
export const PracticeAiNote = () => jsxs('p', { className: 'dy-wfd-ai-note', 'data-wfd-practice-ai': true, children: [
  jsx(PreviewTag, { children: 'Practice AI' }), ' Canned answers for this review; no model is called.',
] })

// Steps in the order they run (each step after the steps it waits for).
export function runOrder(nodes) {
  const byId = new Map(nodes.map((n) => [n.id ?? n.node_id, n]))
  const seen = new Set(); const out = []
  const visit = (id) => {
    if (seen.has(id) || !byId.has(id)) return
    seen.add(id)
    for (const dep of byId.get(id).depends_on ?? []) visit(dep)
    out.push(byId.get(id))
  }
  for (const n of nodes) visit(n.id ?? n.node_id)
  return out
}

export function stepNotes(node, nodes) {
  const notes = []
  if (node.human_gate) notes.push('your sign-off')
  if (node.loop) notes.push(`repeats, up to ${node.loop.max_iterations} rounds`)
  if (node.when) notes.push(`only if "${nodes.find((n) => (n.id ?? n.node_id) === node.when.node)?.title ?? node.when.node}" ${node.when.status === 'blocked' ? 'gets stuck' : 'is done'}`)
  if (node.phase_team) notes.push(`done by ${node.phase_team}`)
  return notes
}

export function StepsPreview({ nodes }) {
  const ordered = runOrder(nodes)
  return jsx('ol', { className: 'dy-wfd-steps', 'data-wfd-steps': ordered.length, children: ordered.map((node) => jsxs('li', { children: [
    jsx('strong', { children: node.title }),
    ...stepNotes(node, nodes).map((note) => jsx('span', { className: 'dy-wfd-step-note', children: note }, note)),
  ] }, node.id ?? node.node_id)) })
}

export function TemplateList({ templates, value, onPick }) {
  if (templates === null) return jsx('p', { className: 'dockyard-meta', role: 'status', children: 'Loading templates…' })
  if (!templates.length) return jsx('p', { className: 'dockyard-meta', 'data-wfd-no-templates': true, children: 'No templates yet. In the library, save a workflow for every project to make it a template.' })
  return jsx('div', { className: 'dy-wfd-templates', role: 'radiogroup', 'aria-label': 'Templates', children: templates.map((t) => {
    const nodes = t.definition?.nodes ?? []
    return jsxs('button', {
      type: 'button', role: 'radio', 'aria-checked': value === t.name, 'data-wfd-template': t.name,
      className: value === t.name ? 'active' : '', onClick: () => onPick(t),
      children: [
        jsxs('span', { className: 'dy-wfd-template-head', children: [jsx('strong', { children: t.name }), jsx('small', { children: `${nodes.length} step${nodes.length === 1 ? '' : 's'}` })] }),
        jsx('span', { className: 'dy-wfd-template-line', children: runOrder(nodes).map((n) => n.title).join(' → ') }),
      ],
    }, t.name)
  }) })
}

export function ImportResult({ result }) {
  if (!result) return null
  if (result.kind === 'invalid') return jsx('p', { className: 'dy-wfd-error', role: 'alert', 'data-wfd-import-error': true, children: result.reason })
  if (result.kind === 'dockyard') return jsxs('div', { className: 'dy-wfd-import-ok', role: 'status', 'data-wfd-import': 'dockyard', children: [
    jsx('p', { children: `A Dockyard workflow${result.name ? ` ("${result.name}")` : ''} with ${result.nodes.length} step${result.nodes.length === 1 ? '' : 's'}. It imports exactly.` }),
    ...result.warnings.map((w) => jsx('p', { className: 'dockyard-meta', children: w }, w)),
    jsx(StepsPreview, { nodes: result.nodes }),
  ] })
  return jsxs('div', { className: 'dy-wfd-import-ok', role: 'status', 'data-wfd-import': 'other', children: [
    jsx(PracticeAiNote, {}),
    jsx('p', { children: `This looks like ${result.format}. The AI drafted ${result.nodes.length} step${result.nodes.length === 1 ? '' : 's'} from it.` }),
    jsx('p', { className: 'dockyard-meta', children: `It could not carry over: ${result.notCarried.join('; ')}.` }),
    jsx(StepsPreview, { nodes: result.nodes }),
  ] })
}

// The AI's answer: its plan in words, the steps and its questions.
export function AiPlan({ draft, onAnswer }) {
  return jsxs('div', { className: 'dy-wfd-ai-plan', 'data-wfd-ai-plan': draft.name, children: [
    jsx('h4', { children: "Here's my plan" }),
    jsx('ol', { className: 'dy-wfd-ai-explain', children: draft.explain.map((line) => jsx('li', { children: line }, line)) }),
    jsx('h4', { children: 'Steps' }),
    jsx(StepsPreview, { nodes: draft.nodes }),
    draft.questions.length ? jsx('h4', { children: 'Questions for you' }) : null,
    ...draft.questions.map((q) => jsxs('div', { className: 'dy-wfd-question', role: 'group', 'aria-label': q.text, 'data-wfd-question': q.id, children: [
      jsx('span', { children: q.text }),
      jsx('span', { className: 'dy-wfd-chips', children: q.options.map((o) => jsx('button', { type: 'button', 'aria-pressed': q.current === o.value, 'data-wfd-answer': `${q.id}:${o.value}`, onClick: () => onAnswer(q.id, o.value), children: o.label }, String(o.value))) }),
    ] }, q.id)),
  ] })
}

const TRIGGERS = [['manual', 'By hand: I press Start'], ['schedule', 'On a schedule'], ['event', 'When something happens']]
const SCHEDULES = [['weekdays', 'Every weekday'], ['daily', 'Every day'], ['mondays', 'Every Monday']]
const EVENTS = [['task-done', 'A task in this project finishes'], ['task-blocked', 'A task in this project gets stuck'], ['run-done', 'A run of this workflow finishes']]

export function WorkflowSettingsDialog({ project, workflow, title, members, onClose }) {
  const saved = readWorkflowSettings(project, workflow)
  const [trigger, setTrigger] = useState(saved.trigger)
  const [improve, setImprove] = useState(saved.improve)
  const [error, setError] = useState(null)
  useDialogFocusManager('[data-wfd-settings]')
  useEffect(() => {
    const onKey = (event) => { if (event.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  const save = () => {
    const runs = Number(improve.afterRuns)
    if (improve.on && !(Number.isInteger(runs) && runs >= 1 && runs <= 50)) { setError('After how many runs: a whole number from 1 to 50.'); return }
    if (trigger.kind === 'schedule' && !/^([01]\d|2[0-3]):[0-5]\d$/.test(trigger.time)) { setError('Time: use 24-hour time, e.g. 09:00.'); return }
    writeWorkflowSettings(project, workflow, { trigger, improve: { ...improve, afterRuns: runs || 5 } })
    onClose()
  }
  const radio = (value, words) => jsxs('label', { className: 'dy-wfd-radio', children: [
    jsx('input', { type: 'radio', name: 'wfd-trigger', value, checked: trigger.kind === value, 'data-wfd-trigger': value, onChange: () => setTrigger({ ...trigger, kind: value }) }),
    jsx('span', { children: words }),
  ] }, value)
  return jsx('section', { className: 'dockyard-modal-layer', 'data-wfd-settings': workflow, onClick: (event) => { if (event.target === event.currentTarget) onClose() }, children:
    jsxs('div', { className: 'dockyard-modal dy-wfd-modal', role: 'dialog', 'aria-modal': true, 'aria-labelledby': 'wfd-settings-title', children: [
      jsxs('div', { className: 'dockyard-modal-head', children: [
        jsxs('div', { children: [jsx('h2', { id: 'wfd-settings-title', children: 'Workflow settings' }), jsx('p', { children: title })] }),
        jsx(Button, { small: true, action: 'wfd-settings-close', ariaLabel: 'Close settings', onClick: onClose, children: '×' }),
      ] }),
      jsxs('fieldset', { className: 'dy-wfd-fieldset', children: [
        jsxs('legend', { children: ['When it runs ', jsx(PreviewTag, {})] }),
        ...TRIGGERS.map(([value, words]) => radio(value, words)),
        trigger.kind === 'schedule' ? jsxs('div', { className: 'dy-wfd-row', children: [
          jsxs('label', { children: [jsx('span', { children: 'How often' }), jsx('select', { value: trigger.schedule, 'data-wfd-schedule': true, onChange: (e) => setTrigger({ ...trigger, schedule: e.target.value }), children: SCHEDULES.map(([v, w]) => jsx('option', { value: v, children: w }, v)) })] }),
          jsxs('label', { children: [jsx('span', { children: 'At (UK time)' }), jsx('input', { value: trigger.time, 'data-wfd-time': true, inputMode: 'numeric', onChange: (e) => setTrigger({ ...trigger, time: e.target.value }) })] }),
        ] }) : null,
        trigger.kind === 'event' ? jsxs('label', { className: 'dy-wfd-row', children: [jsx('span', { children: 'When' }), jsx('select', { value: trigger.event, 'data-wfd-event': true, onChange: (e) => setTrigger({ ...trigger, event: e.target.value }), children: EVENTS.map(([v, w]) => jsx('option', { value: v, children: w }, v)) })] }) : null,
      ] }),
      jsxs('fieldset', { className: 'dy-wfd-fieldset', children: [
        jsxs('legend', { children: ['Improve over time ', jsx(PreviewTag, {})] }),
        jsxs('label', { className: 'dy-wfd-radio', children: [
          jsx('input', { type: 'checkbox', checked: improve.on, 'data-wfd-improve': true, onChange: (e) => setImprove({ ...improve, on: e.target.checked }) }),
          jsx('span', { children: 'After a number of runs, a reviewer bot suggests changes' }),
        ] }),
        improve.on ? jsxs('div', { className: 'dy-wfd-row', children: [
          jsxs('label', { children: [jsx('span', { children: 'After this many runs' }), jsx('input', { type: 'number', min: 1, max: 50, value: improve.afterRuns, 'data-wfd-improve-runs': true, onChange: (e) => setImprove({ ...improve, afterRuns: e.target.value }) })] }),
          jsxs('label', { children: [jsx('span', { children: 'Reviewer' }), jsx('select', { value: improve.reviewer, 'data-wfd-improve-reviewer': true, onChange: (e) => setImprove({ ...improve, reviewer: e.target.value }), children: [jsx('option', { value: '', children: 'Whoever the project picks' }, ''), ...members.map((m) => jsx('option', { value: m, children: m }, m))] })] }),
        ] }) : null,
        jsx('p', { className: 'dockyard-meta', children: 'Nothing changes until you approve the suggestion.' }),
      ] }),
      error ? jsx('p', { className: 'dy-wfd-error', role: 'alert', children: error }) : null,
      jsxs('div', { className: 'dockyard-modal-actions', children: [
        jsx(Button, { action: 'wfd-settings-cancel', onClick: onClose, children: 'Cancel' }),
        jsx(Button, { action: 'wfd-settings-save', variant: 'primary', onClick: save, children: 'Save settings' }),
      ] }),
    ] }) })
}

// The repeat settings, opened from a frame (or the step panel) and anchored
// next to it. Rounds are real (saved with the workflow); the check is a
// preview.
export function RepeatPopover({ node, anchor, check: savedCheck, onSave, onStop, onClose, draft }) {
  const [rounds, setRounds] = useState(String(node.loop?.max_iterations ?? 3))
  const [check, setCheck] = useState(savedCheck)
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  useDialogFocusManager('[data-wfd-repeat]')
  useEffect(() => {
    const onKey = (event) => { if (event.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  // Below the frame's label when it fits clear of the bottom of the window
  // (where the review bar and status messages sit), otherwise above it.
  const width = 300
  const height = check.by === 'judge' ? 360 : 310
  const viewW = globalThis.innerWidth ?? 1024
  const viewH = globalThis.innerHeight ?? 768
  const left = Math.max(8, Math.min((anchor?.left ?? 40), viewW - width - 8))
  const below = (anchor?.bottom ?? 120) + 6
  const top = below + height <= viewH - 90 ? below : Math.max(8, (anchor?.top ?? 120) - 6 - height)
  const run = async (action) => {
    setBusy(true); setError(null)
    try { await action(); onClose() } catch (failure) { setError(`Couldn't save: ${String(failure?.message ?? failure).replace(/^\d{3}:\s*/, '')}`); setBusy(false) }
  }
  const save = () => {
    const n = Number(rounds)
    if (!(Number.isInteger(n) && n >= 1 && n <= 10)) { setError('Rounds must be a whole number from 1 to 10.'); return }
    run(() => onSave({ rounds: n, check }))
  }
  return jsxs('div', { className: 'dy-wfd-repeat', role: 'dialog', 'aria-modal': true, 'aria-labelledby': 'wfd-repeat-title', 'data-wfd-repeat': node.node_id ?? node.id, style: { left: `${left}px`, top: `${top}px`, width: `${width}px` }, children: [
    jsx('h3', { id: 'wfd-repeat-title', children: `Repeat "${node.title}"` }),
    jsxs('label', { children: [jsx('span', { children: 'At most this many rounds, then it asks you' }), jsx('input', { type: 'number', min: 1, max: 10, value: rounds, 'aria-invalid': error ? 'true' : 'false', 'data-wfd-repeat-rounds': true, onChange: (e) => setRounds(e.target.value) })] }),
    jsxs('label', { children: [jsxs('span', { children: ["How it's checked ", jsx(PreviewTag, {})] }), jsx('select', { value: check.by, 'data-wfd-repeat-check': true, onChange: (e) => setCheck({ ...check, by: e.target.value }), children: Object.entries(CHECK_WORDS).map(([v, w]) => jsx('option', { value: v, children: w }, v)) })] }),
    check.by === 'judge' ? jsxs('label', { children: [jsx('span', { children: 'Done when' }), jsx('input', { value: check.doneWhen, placeholder: 'e.g. every test passes', 'data-wfd-repeat-done-when': true, onChange: (e) => setCheck({ ...check, doneWhen: e.target.value }) })] }) : null,
    jsx('p', { className: 'dockyard-meta', children: 'A round that gets stuck starts again; after the last round it asks you.' }),
    error ? jsx('p', { className: 'dy-wfd-error', role: 'alert', children: error }) : null,
    jsxs('div', { className: 'dy-wfd-repeat-actions', children: [
      jsx(Button, { small: true, variant: 'primary', action: 'wfd-repeat-save', disabled: busy, onClick: save, children: busy ? 'Saving…' : (draft ? 'Apply to draft' : 'Save version') }),
      jsx(Button, { small: true, action: 'wfd-repeat-stop', disabled: busy, onClick: () => run(onStop), children: 'Stop repeating' }),
      jsx(Button, { small: true, action: 'wfd-repeat-cancel', disabled: busy, onClick: onClose, children: 'Cancel' }),
    ] }),
  ] })
}
