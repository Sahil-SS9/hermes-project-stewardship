// GENERATED-STRUCTURE: hand-edited Desktop module. Edit this file, then run
// node hermes_dockyard_plugin/desktop/build.mjs to regenerate plugin.js.
//
// Workflows design round (07/10/2026), option B: the AI side panel next to
// the canvas. It explains in plain words while it draws the steps on the
// canvas, takes follow-up changes, and works on a new or an open workflow.
// Every change can be undone; nothing is saved until Save.
import { useState } from '../../runtime/react.js'
import { useRef } from '../../runtime/react.js'
import { useEffect } from '../../runtime/react.js'
import { jsxs } from '../../runtime/react.js'
import { jsx } from '../../runtime/react.js'
import { Button } from '../../lib/ui.js'
import { practiceDraft } from './standins.js'
import { practiceRevise } from './standins.js'
import { answerQuestion } from './standins.js'
import { AiPlan } from './shared.js'
import { PracticeAiNote } from './shared.js'
import { AI_EXAMPLES } from './start-dialog.js'

let entryId = 0
const nextId = () => { entryId += 1; return `wfd-ai-${entryId}` }

export function AiSidePanel({ members, nodes, workflowTitle, seed, onApply, onClose }) {
  const [thread, setThread] = useState(() => (seed ? [{ id: nextId(), role: 'ai', reply: seed.reply, did: seed.did ?? [], before: null }] : []))
  const [text, setText] = useState('')
  const [error, setError] = useState(null)
  const listRef = useRef(null)
  // Show the start of the newest reply, so the plan is read before its
  // questions (scrolling to the bottom landed on the questions).
  useEffect(() => {
    const list = listRef.current
    const last = list?.lastElementChild
    if (list && last) list.scrollTop = Math.max(0, last.offsetTop - list.offsetTop - 8)
  }, [thread.length])
  const empty = !nodes.length
  const send = (message = text) => {
    const clean = message.trim()
    if (!clean) { setError('Type what you want first.'); return }
    setError(null); setText('')
    const user = { id: nextId(), role: 'user', text: clean }
    if (empty) {
      const draft = practiceDraft(clean, members)
      onApply(draft.nodes, { name: draft.name, checks: draft.checks })
      setThread((t) => [...t, user, { id: nextId(), role: 'ai', plan: draft, did: draft.did, before: nodes }])
      return
    }
    const result = practiceRevise(nodes, clean, members)
    if (!result.unknown) onApply(result.nodes, {})
    setThread((t) => [...t, user, { id: nextId(), role: 'ai', reply: result.reply, did: result.did, before: result.unknown ? null : nodes }])
  }
  const answer = (entry, id, value) => {
    const plan = answerQuestion({ ...entry.plan, nodes }, id, value)
    onApply(plan.nodes, {})
    setThread((t) => t.map((e) => (e.id === entry.id ? { ...e, plan } : e)))
  }
  const undo = (entry) => {
    onApply(entry.before, {})
    setThread((t) => t.map((e) => (e.id === entry.id ? { ...e, undone: true } : e)))
  }
  return jsxs('aside', { className: 'dy-wfd-ai', 'aria-label': 'AI builder', 'data-wfd-ai-panel': empty ? 'new' : 'edit', children: [
    jsxs('div', { className: 'dy-wfd-ai-head', children: [
      jsx('strong', { children: 'AI builder' }),
      jsx(Button, { small: true, action: 'wfd-ai-close', ariaLabel: 'Close the AI builder', onClick: onClose, children: '×' }),
    ] }),
    jsx(PracticeAiNote, {}),
    jsxs('div', { className: 'dy-wfd-ai-thread', ref: listRef, 'aria-live': 'polite', children: [
      thread.length ? null : jsx('p', { className: 'dockyard-meta', children: empty
        ? 'Say what the workflow should do. I explain my plan here and draw the steps on the canvas.'
        : `Ask for a change to "${workflowTitle}". You see it on the canvas before anything is saved.` }),
      ...thread.map((entry) => (entry.role === 'user'
        ? jsx('p', { className: 'dy-wfd-ai-user', 'data-wfd-ai-user': true, children: entry.text }, entry.id)
        : jsxs('div', { className: `dy-wfd-ai-reply${entry.undone ? ' undone' : ''}`, 'data-wfd-ai-reply': true, children: [
          entry.plan ? jsx(AiPlan, { draft: entry.plan, onAnswer: (id, value) => answer(entry, id, value) }) : null,
          ...(entry.reply ?? []).map((line) => jsx('p', { children: line }, line)),
          entry.did?.length ? jsxs('details', { children: [jsx('summary', { children: 'What I changed' }), jsx('ul', { children: entry.did.map((d) => jsx('li', { children: d }, d)) })] }) : null,
          entry.before && !entry.undone ? jsx(Button, { small: true, action: 'wfd-ai-undo', onClick: () => undo(entry), children: 'Undo this change' }) : null,
          entry.undone ? jsx('p', { className: 'dockyard-meta', children: 'Undone.' }) : null,
        ] }, entry.id))),
    ] }),
    empty && !thread.length ? jsx('div', { className: 'dy-wfd-chips', role: 'group', 'aria-label': 'Examples', children: AI_EXAMPLES.map((example) => jsx('button', { type: 'button', 'data-wfd-ai-example': example, onClick: () => send(example), children: example }, example)) }) : null,
    jsxs('div', { className: 'dy-wfd-ai-compose', children: [
      jsx('textarea', { rows: 2, value: text, 'data-wfd-ai-input': true, 'aria-label': 'Message to the AI builder', 'aria-invalid': error ? 'true' : 'false', placeholder: empty ? 'e.g. Fix a bug until the tests pass' : 'e.g. repeat up to 3 times', onChange: (e) => setText(e.target.value), onKeyDown: (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } } }),
      jsx(Button, { small: true, variant: 'primary', action: 'wfd-ai-send', onClick: () => send(), children: 'Send' }),
    ] }),
    error ? jsx('p', { className: 'dy-wfd-error', role: 'alert', children: error }) : null,
    jsx('p', { className: 'dockyard-meta', children: 'Nothing is saved until you press Save.' }),
  ] })
}
