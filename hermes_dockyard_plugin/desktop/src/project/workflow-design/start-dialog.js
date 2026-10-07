// GENERATED-STRUCTURE: hand-edited Desktop module. Edit this file, then run
// node hermes_dockyard_plugin/desktop/build.mjs to regenerate plugin.js.
//
// Workflows (Sahil's pick, 07/10/2026): one New workflow button opens this
// dialog with the four ways in. The AI is one of them: describe, read its
// plan, answer its questions, then Create workflow; the conversation then
// carries on in the AI sidebar beside the canvas. Nothing is saved until
// Create workflow.
import { useState } from '../../runtime/react.js'
import { useEffect } from '../../runtime/react.js'
import { jsxs } from '../../runtime/react.js'
import { jsx } from '../../runtime/react.js'
import { Button } from '../../lib/ui.js'
import { useDialogFocusManager } from '../../lib/ui.js'
import { practiceDraft } from './standins.js'
import { answerQuestion } from './standins.js'
import { readImport } from './standins.js'
import { uniqueName } from './standins.js'
import { TemplateList } from './shared.js'
import { ImportResult } from './shared.js'
import { AiPlan } from './shared.js'
import { PracticeAiNote } from './shared.js'
import { PreviewTag } from './shared.js'

export const WAYS = Object.freeze([
  { way: 'blank', title: 'Start blank', text: 'An empty workflow with one step.' },
  { way: 'template', title: 'Use a template', text: 'Start from a workflow saved for every project.' },
  { way: 'import', title: 'Import', text: 'Paste a workflow, or choose a file.' },
  { way: 'ai', title: 'Describe it to the AI', text: 'Say what you want. The AI explains its plan and drafts the steps.' },
])
export const AI_EXAMPLES = Object.freeze(['Fix a bug until the tests pass', 'Prepare a weekly release', 'Research a topic and write a summary'])

export function NameField({ value, onChange, error }) {
  return jsxs('label', { className: 'dy-wfd-field', children: [
    jsx('span', { children: 'Workflow name' }),
    jsx('input', { value, 'data-wfd-name': true, 'aria-invalid': error ? 'true' : 'false', 'aria-describedby': error ? 'wfd-name-error' : undefined, onChange: (e) => onChange(e.target.value) }),
    error ? jsx('span', { className: 'dy-wfd-error', id: 'wfd-name-error', 'data-wfd-name-error': true, children: error }) : null,
  ] })
}

export async function readFileText(file) {
  if (!file) return ''
  if (typeof file.text === 'function') return file.text()
  return new Promise((resolve, reject) => { const r = new FileReader(); r.onload = () => resolve(String(r.result ?? '')); r.onerror = reject; r.readAsText(file) })
}

export function NewWorkflowDialog({ takenNames, templates, members, onCreate, onClose }) {
  const [way, setWay] = useState('choose')
  const [name, setName] = useState('')
  const [first, setFirst] = useState('Step 1')
  const [template, setTemplate] = useState(null)
  const [importText, setImportText] = useState('')
  const [imported, setImported] = useState(null)
  const [describe, setDescribe] = useState('')
  const [aiDraft, setAiDraft] = useState(null)
  const [aiError, setAiError] = useState(null)
  const [nameError, setNameError] = useState(null)
  const [stepError, setStepError] = useState(null)
  const [wayError, setWayError] = useState(null)
  const [serverError, setServerError] = useState(null)
  const [busy, setBusy] = useState(false)
  useDialogFocusManager(`[data-wfd-new-dialog="${way}"]`)
  useEffect(() => {
    const onKey = (event) => { if (event.key === 'Escape' && !busy) onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [busy, onClose])
  const go = (next) => { setWay(next); setServerError(null); setNameError(null); setWayError(null) }
  const checkName = () => {
    const clean = name.trim()
    const problem = !clean ? 'Give the workflow a name.' : takenNames.includes(clean) ? `"${clean}" already exists. Pick another name.` : null
    setNameError(problem)
    return problem ? null : clean
  }
  const nodesNow = () => {
    if (way === 'blank') return first.trim() ? [{ id: 'step-1', title: first.trim(), depends_on: [], human_gate: false, kind: 'task' }] : null
    if (way === 'template') return template?.definition?.nodes ?? null
    if (way === 'import') return imported && imported.kind !== 'invalid' ? imported.nodes : null
    if (way === 'ai') return aiDraft?.nodes ?? null
    return null
  }
  // Create workflow stays enabled: pressed too early, it says what is missing
  // (a disabled button gives no reason).
  const create = async () => {
    const missing = way === 'template' && !template ? 'Pick a template first.'
      : way === 'import' && !(imported && imported.kind !== 'invalid') ? (imported ? 'This text cannot be imported. Fix it, or describe it to the AI instead.' : 'Press Check it first.')
        : way === 'ai' && !aiDraft ? 'Press Draft it first.' : null
    setWayError(missing)
    if (missing) return
    if (way === 'blank' && !first.trim()) setStepError('Name the first step.')
    else setStepError(null)
    const clean = checkName()
    const nodes = nodesNow()
    if (!clean || !nodes) return
    setBusy(true); setServerError(null)
    try {
      await onCreate({ name: clean, nodes, checks: way === 'ai' ? aiDraft.checks : null, conversation: way === 'ai' ? { describe: describe.trim(), plan: aiDraft } : null })
    } catch (failure) {
      setServerError(`Couldn't create it: ${String(failure?.message ?? failure).replace(/^\d{3}:\s*/, '')}`)
      setBusy(false)
    }
  }
  const pickTemplate = (t) => { setTemplate(t); setName(uniqueName(t.name, takenNames)); setNameError(null) }
  const check = (text) => {
    const result = readImport(text)
    setImported(result)
    if (result.kind !== 'invalid' && result.name) setName(uniqueName(result.name, takenNames))
  }
  const draft = (text) => {
    const result = practiceDraft(text, members)
    if (result.error) { setAiError(result.error); setAiDraft(null); return }
    setAiError(null); setAiDraft(result); setName(uniqueName(result.name, takenNames))
  }
  const body = () => {
    if (way === 'choose') return jsx('div', { className: 'dy-wfd-ways', children: WAYS.map((w) => jsxs('button', { type: 'button', 'data-wfd-way': w.way, onClick: () => go(w.way), children: [
      jsxs('strong', { children: [w.title, w.way === 'ai' ? jsx(PreviewTag, { children: 'Practice AI' }) : null] }),
      jsx('span', { children: w.text }),
    ] }, w.way)) })
    if (way === 'blank') return jsxs('div', { className: 'dy-wfd-way-body', children: [
      jsx(NameField, { value: name, onChange: setName, error: nameError }),
      jsxs('label', { className: 'dy-wfd-field', children: [
        jsx('span', { children: 'First step' }),
        jsx('input', { value: first, 'data-wfd-first-step': true, 'aria-invalid': stepError ? 'true' : 'false', onChange: (e) => setFirst(e.target.value) }),
        stepError ? jsx('span', { className: 'dy-wfd-error', 'data-wfd-step-error': true, children: stepError }) : null,
      ] }),
    ] })
    if (way === 'template') return jsxs('div', { className: 'dy-wfd-way-body', children: [
      jsx(TemplateList, { templates, value: template?.name, onPick: pickTemplate }),
      template ? jsx(NameField, { value: name, onChange: setName, error: nameError }) : null,
    ] })
    if (way === 'import') return jsxs('div', { className: 'dy-wfd-way-body', children: [
      jsxs('label', { className: 'dy-wfd-field', children: [
        jsx('span', { children: 'Paste the workflow' }),
        jsx('textarea', { rows: 5, value: importText, 'data-wfd-import-text': true, placeholder: 'A Dockyard export (JSON). Other formats go through the AI.', onChange: (e) => { setImportText(e.target.value); setImported(null) } }),
      ] }),
      jsxs('div', { className: 'dy-wfd-row', children: [
        jsxs('label', { className: 'dy-wfd-file', children: [jsx('span', { children: 'or choose a file' }), jsx('input', { type: 'file', accept: '.json,.yaml,.yml,.txt', 'data-wfd-import-file': true, onChange: async (e) => { const text = await readFileText(e.target.files?.[0]); setImportText(text); check(text) } })] }),
        jsx(Button, { small: true, action: 'wfd-import-check', onClick: () => check(importText), children: 'Check it' }),
      ] }),
      jsx(ImportResult, { result: imported }),
      imported?.kind === 'invalid' ? jsx(Button, { small: true, action: 'wfd-import-to-ai', onClick: () => { go('ai'); setDescribe(importText.slice(0, 400)) }, children: 'Describe it to the AI instead' }) : null,
      imported && imported.kind !== 'invalid' ? jsx(NameField, { value: name, onChange: setName, error: nameError }) : null,
    ] })
    return jsxs('div', { className: 'dy-wfd-way-body', children: [
      jsx(PracticeAiNote, {}),
      aiDraft ? null : jsxs('label', { className: 'dy-wfd-field', children: [
        jsx('span', { children: 'What should this workflow do?' }),
        jsx('textarea', { rows: 3, value: describe, 'data-wfd-ai-describe': true, 'aria-invalid': aiError ? 'true' : 'false', placeholder: 'e.g. When a test fails, find the bug, fix it until the tests pass, and ask me before merging.', onChange: (e) => setDescribe(e.target.value) }),
        aiError ? jsx('span', { className: 'dy-wfd-error', 'data-wfd-ai-error': true, children: aiError }) : null,
      ] }),
      aiDraft ? null : jsx('div', { className: 'dy-wfd-chips', role: 'group', 'aria-label': 'Examples', children: AI_EXAMPLES.map((text) => jsx('button', { type: 'button', 'data-wfd-ai-example': text, onClick: () => setDescribe(text), children: text }, text)) }),
      aiDraft ? null : jsx(Button, { action: 'wfd-ai-draft', variant: 'primary', onClick: () => draft(describe), children: 'Draft it' }),
      aiDraft ? jsx(AiPlan, { draft: aiDraft, onAnswer: (id, value) => setAiDraft(answerQuestion(aiDraft, id, value)) }) : null,
      aiDraft ? jsx(Button, { small: true, action: 'wfd-ai-redescribe', onClick: () => setAiDraft(null), children: 'Change the description' }) : null,
      aiDraft ? jsx(NameField, { value: name, onChange: setName, error: nameError }) : null,
    ] })
  }
  const heading = way === 'choose' ? 'How do you want to start?' : WAYS.find((w) => w.way === way).title
  return jsx('section', { className: 'dockyard-modal-layer', 'data-wfd-new-dialog': way, onClick: (event) => { if (event.target === event.currentTarget && !busy) onClose() }, children:
    jsxs('div', { className: 'dockyard-modal dy-wfd-modal dy-wfd-new', role: 'dialog', 'aria-modal': true, 'aria-labelledby': 'wfd-new-title', children: [
      jsxs('div', { className: 'dockyard-modal-head', children: [
        jsxs('div', { children: [jsx('h2', { id: 'wfd-new-title', children: 'New workflow' }), jsx('p', { children: heading })] }),
        jsx(Button, { small: true, action: 'wfd-new-close', ariaLabel: 'Close', disabled: busy, onClick: onClose, children: '×' }),
      ] }),
      body(),
      serverError ? jsx('p', { className: 'dy-wfd-error', role: 'alert', 'data-wfd-create-error': true, children: serverError }) : null,
      wayError ? jsx('p', { className: 'dy-wfd-error', role: 'alert', 'data-wfd-way-error': true, children: wayError }) : null,
      way === 'choose' ? null : jsx('p', { className: 'dockyard-meta', children: 'Nothing is saved until you press Create workflow.' }),
      jsxs('div', { className: 'dockyard-modal-actions', children: [
        way === 'choose' ? jsx(Button, { action: 'wfd-new-cancel', onClick: onClose, children: 'Cancel' }) : jsx(Button, { action: 'wfd-new-back', disabled: busy, onClick: () => go('choose'), children: '← All ways in' }),
        way === 'choose' ? null : jsx(Button, { action: 'wfd-create', variant: 'primary', disabled: busy, onClick: create, children: busy ? 'Creating…' : 'Create workflow' }),
      ] }),
    ] }) })
}
