// GENERATED-STRUCTURE: hand-edited Desktop module. Edit this file, then run
// node hermes_dockyard_plugin/desktop/build.mjs to regenerate plugin.js.
//
// The AI chat for the open workflow (Sahil's pick, 07/10/2026): a sidebar at
// the window's right edge, outside the canvas, so it never takes the canvas's
// room. Unpinned, it floats over the page and tucks away on Escape, its close
// button, or a press anywhere else; pinned, it stays open and the page narrows
// to make room, so nothing is covered.
//
// It talks first (Sahil, 07/10/2026: "suggest, then Apply"). A question is
// answered from the steps on the canvas. A change comes back as a suggestion
// card that lists what would change; talking more refines that suggestion
// (one live suggestion at a time), and nothing on the canvas changes until
// Apply. Not yet sets a suggestion aside; a suggestion whose canvas has since
// changed says so and cannot be applied. Applied changes are unsaved, each can
// be undone, and nothing is saved until Save version. The conversation belongs
// to the workflow and outlives the sidebar (the screen holds it), so closing
// and reopening keeps it, and a workflow created by describing it to the AI
// carries that conversation over.
import { useState } from '../../runtime/react.js'
import { useRef } from '../../runtime/react.js'
import { useEffect } from '../../runtime/react.js'
import { jsxs } from '../../runtime/react.js'
import { jsx } from '../../runtime/react.js'
import { Button } from '../../lib/ui.js'
import { practiceDraft } from './standins.js'
import { practiceRevise } from './standins.js'
import { practiceExplain } from './standins.js'
import { answerQuestion } from './standins.js'
import { isQuestion } from './standins.js'
import { sameSteps } from './standins.js'
import { withCurrentPositions } from './standins.js'
import { AiPlan } from './shared.js'
import { StepsPreview } from './shared.js'
import { PracticeAiNote } from './shared.js'
import { AI_EXAMPLES } from './start-dialog.js'

let entryId = 0
// One entry of a conversation: { role: 'user', text } or { role: 'ai', reply,
// plan, steps, after, did, suggestion, before }. A suggestion is { kind:
// 'draft' | 'change', nodes, base, checks, status: 'pending' | 'parked' |
// 'replaced' | 'applied' }; `base` is the canvas it was made from. `before`
// holds the steps to go back to once it is applied (Undo).
export const aiEntry = (fields) => { entryId += 1; return { id: `wfd-ai-${entryId}`, did: [], before: null, ...fields } }

// The conversation that a workflow made in the New workflow dialog starts with.
export function createdConversation(workflowName, { describe, plan }) {
  return [
    aiEntry({ role: 'user', text: describe }),
    aiEntry({ role: 'ai', plan, did: plan.did ?? [] }),
    aiEntry({ role: 'ai', reply: [`Created "${workflowName}". Ask me about it or for changes here: I suggest each change first, and nothing changes until you press Apply.`] }),
  ]
}

// Save version or Discard ends the AI's unsaved changes: their Undo goes.
export const settleConversation = (thread, how) =>
  thread.map((entry) => (entry.before && !entry.undone && !entry.settled ? { ...entry, settled: how } : entry))

// What a suggestion shows as: its own status, or stale once the canvas it was
// made from has changed (applying it would undo that change).
export function shownStatus(suggestion, nodes) {
  const open = suggestion.status === 'pending' || suggestion.status === 'parked'
  return open && !sameSteps(suggestion.base, nodes) ? 'stale' : suggestion.status
}

// Pinned or not is remembered while Dockyard is open (across projects and
// screens). The plugin keeps nothing in browser storage, and there is no
// preferences store on the server yet, so a restart starts unpinned.
let pinnedNow = false
export const readAiPinned = () => pinnedNow
export function writeAiPinned(pinned) { pinnedNow = Boolean(pinned) }

const TOGGLE = '[data-action="wfd-ask-ai"]'
const focusToggle = () => { window.setTimeout(() => document.querySelector(TOGGLE)?.focus(), 0) }
const STATUS_WORDS = {
  pending: 'Nothing changes on the canvas until you press Apply.',
  parked: 'Not applied.',
  replaced: 'Replaced by the suggestion below, which includes these changes.',
  stale: 'The canvas has changed since this suggestion. Ask again for an up-to-date one.',
  applied: 'Applied to the canvas.',
}
const SETTLED_WORDS = { saved: 'Saved.', discarded: 'Discarded.' }

function SuggestionCard({ entry, status, onApply, onNotYet, onUndo }) {
  const s = entry.suggestion
  return jsxs('div', { className: `dy-wfd-ai-suggestion is-${status}`, 'data-wfd-ai-suggestion': status, children: [
    jsx('h4', { children: s.kind === 'draft' ? 'Suggested steps' : 'Suggested change' }),
    entry.did?.length ? jsx('ul', { className: 'dy-wfd-ai-changes', 'data-wfd-ai-changes': true, children: entry.did.map((d, i) => jsx('li', { children: d }, `${i}-${d}`)) }) : null,
    s.kind === 'change' ? jsxs('details', { children: [jsx('summary', { children: 'All the steps after this change' }), jsx(StepsPreview, { nodes: s.nodes })] }) : null,
    entry.undone ? jsx('p', { className: 'dockyard-meta', children: 'Undone.' })
      : entry.settled ? jsx('p', { className: 'dockyard-meta', 'data-wfd-ai-settled': entry.settled, children: `${STATUS_WORDS.applied} ${SETTLED_WORDS[entry.settled]}` })
        : jsx('p', { className: 'dockyard-meta', children: STATUS_WORDS[status] }),
    status === 'pending' ? jsxs('div', { className: 'dy-wfd-ai-suggestion-actions', children: [
      jsx(Button, { small: true, variant: 'primary', action: 'wfd-ai-apply', onClick: onApply, children: 'Apply' }),
      jsx(Button, { small: true, action: 'wfd-ai-not-yet', onClick: onNotYet, children: 'Not yet' }),
    ] }) : null,
    status === 'parked' ? jsx('div', { className: 'dy-wfd-ai-suggestion-actions', children: jsx(Button, { small: true, action: 'wfd-ai-apply', onClick: onApply, children: 'Apply after all' }) }) : null,
    status === 'applied' && !entry.undone && !entry.settled ? jsx('div', { className: 'dy-wfd-ai-suggestion-actions', children: jsx(Button, { small: true, action: 'wfd-ai-undo', onClick: onUndo, children: 'Undo this change' }) }) : null,
  ] })
}

export function AiSidebar({ members, nodes, workflowTitle, thread, onThread, pinned, onPin, onApply, onClose, unsaved = false, saveError = null, onSave, onDiscard }) {
  const [text, setText] = useState('')
  const [error, setError] = useState(null)
  const panelRef = useRef(null)
  const listRef = useRef(null)
  const inputRef = useRef(null)
  const closeRef = useRef(onClose)
  closeRef.current = onClose
  // Opening puts the cursor in the message box.
  useEffect(() => { inputRef.current?.focus() }, [])
  // Show the start of the newest reply, so the plan is read before its
  // questions (scrolling to the bottom landed on the questions).
  useEffect(() => {
    const list = listRef.current
    const last = list?.lastElementChild
    if (list && last) list.scrollTop = Math.max(0, last.offsetTop - list.offsetTop - 8)
  }, [thread.length])
  // Pinned: the whole page makes room (the class sits on the plugin's root).
  useEffect(() => {
    const root = panelRef.current?.closest('.dockyard-root')
    if (!root) return undefined
    root.classList.toggle('dy-wfd-ai-docked', pinned)
    return () => root.classList.remove('dy-wfd-ai-docked')
  }, [pinned])
  // Unpinned: a press anywhere else tucks it away (its toggle button aside,
  // which does that itself). Dialogs above it are not "elsewhere".
  useEffect(() => {
    if (pinned) return undefined
    const onDown = (event) => {
      const target = event.target
      if (panelRef.current?.contains(target) || target?.closest?.(`${TOGGLE}, .dockyard-modal-layer, .dy-wfd-repeat`)) return
      closeRef.current()
    }
    document.addEventListener('pointerdown', onDown, true)
    return () => document.removeEventListener('pointerdown', onDown, true)
  }, [pinned])
  // Escape inside the sidebar closes it, pinned or not, and gives the focus
  // back to Ask AI. It stops there, so an open step panel stays open.
  useEffect(() => {
    const onKey = (event) => {
      if (event.key !== 'Escape' || !panelRef.current?.contains(document.activeElement)) return
      event.preventDefault()
      event.stopPropagation()
      closeRef.current()
      focusToggle()
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [])
  const empty = !nodes.length
  // The one suggestion that talking refines: the newest pending one whose
  // canvas has not changed since.
  const live = [...thread].reverse().find((e) => e.suggestion?.status === 'pending' && sameSteps(e.suggestion.base, nodes)) ?? null
  const send = (message = text) => {
    const clean = message.trim()
    if (!clean) { setError('Type what you want first.'); return }
    setError(null); setText('')
    const user = aiEntry({ role: 'user', text: clean })
    const from = live ? live.suggestion.nodes : nodes
    let reply = null
    if (!from.length && !isQuestion(clean)) {
      const draft = practiceDraft(clean, members)
      reply = draft.error ? aiEntry({ role: 'ai', reply: [draft.error] })
        : aiEntry({ role: 'ai', plan: draft, did: draft.did, suggestion: { kind: 'draft', nodes: draft.nodes, base: nodes, checks: draft.checks, status: 'pending' } })
    } else {
      const result = from.length ? practiceRevise(from, clean, members) : { unknown: true }
      if (!result.unknown) {
        reply = aiEntry({ role: 'ai', reply: result.reply, did: [...(live?.did ?? []), ...result.did], suggestion: { kind: 'change', nodes: result.nodes, base: nodes, checks: live?.suggestion.checks ?? null, status: 'pending' } })
      } else if (isQuestion(clean)) {
        const told = practiceExplain(nodes, workflowTitle)
        reply = aiEntry({ role: 'ai', reply: told.reply, steps: told.steps, after: told.after })
      } else {
        reply = aiEntry({ role: 'ai', reply: result.reply ?? practiceRevise([], clean, members).reply })
      }
    }
    const replaced = reply.suggestion && live ? live.id : null
    onThread((t) => [...t.map((e) => (e.id === replaced ? { ...e, suggestion: { ...e.suggestion, status: 'replaced' } } : e)), user, reply])
  }
  // A question in a suggested plan changes the suggestion, never the canvas.
  const answer = (entry, id, value) => {
    const plan = answerQuestion({ ...entry.plan, nodes: entry.suggestion.nodes }, id, value)
    onThread((t) => t.map((e) => (e.id === entry.id ? { ...e, plan, suggestion: { ...e.suggestion, nodes: plan.nodes } } : e)))
  }
  const apply = (entry) => {
    if (shownStatus(entry.suggestion, nodes) === 'stale') return
    onApply(withCurrentPositions(entry.suggestion.nodes, nodes), { checks: entry.suggestion.checks })
    onThread((t) => t.map((e) => (e.id === entry.id ? { ...e, before: nodes, suggestion: { ...e.suggestion, status: 'applied' } } : e)))
  }
  const notYet = (entry) => onThread((t) => t.map((e) => (e.id === entry.id ? { ...e, suggestion: { ...e.suggestion, status: 'parked' } } : e)))
  const undo = (entry) => {
    onApply(entry.before, {})
    onThread((t) => t.map((e) => (e.id === entry.id ? { ...e, undone: true } : e)))
  }
  const renderAi = (entry) => {
    const status = entry.suggestion ? shownStatus(entry.suggestion, nodes) : null
    return jsxs('div', { className: `dy-wfd-ai-reply${entry.undone ? ' undone' : ''}`, 'data-wfd-ai-reply': true, children: [
      entry.plan ? jsx(AiPlan, { draft: entry.plan, readOnly: status !== 'pending', onAnswer: (id, value) => answer(entry, id, value) }) : null,
      ...(entry.reply ?? []).map((line, i) => jsx('p', { children: line }, `r${i}`)),
      entry.steps ? jsx(StepsPreview, { nodes: entry.steps }) : null,
      ...(entry.after ?? []).map((line, i) => jsx('p', { children: line }, `a${i}`)),
      entry.suggestion ? jsx(SuggestionCard, { entry, status, onApply: () => apply(entry), onNotYet: () => notYet(entry), onUndo: () => undo(entry) })
        : entry.did?.length ? jsxs('details', { children: [jsx('summary', { children: 'What I changed' }), jsx('ul', { children: entry.did.map((d, i) => jsx('li', { children: d }, `${i}-${d}`)) })] }) : null,
    ] }, entry.id)
  }
  return jsxs('aside', { ref: panelRef, id: 'wfd-ai-sidebar', className: 'dy-wfd-ai', 'aria-labelledby': 'wfd-ai-title', 'data-wfd-ai-sidebar': true, 'data-pinned': pinned ? 'true' : 'false', children: [
    jsxs('header', { className: 'dy-wfd-ai-head', children: [
      jsxs('div', { children: [
        jsx('h2', { id: 'wfd-ai-title', children: 'Ask AI' }),
        jsx('p', { className: 'dy-wfd-ai-sub', children: workflowTitle }),
      ] }),
      jsx(Button, { small: true, action: 'wfd-ai-pin', variant: pinned ? 'primary' : '', data: { 'aria-pressed': pinned ? 'true' : 'false', title: pinned ? 'Let it float over the page again' : 'Keep it open beside the page' }, onClick: () => onPin(!pinned), children: pinned ? 'Unpin' : 'Pin' }),
      jsx(Button, { small: true, action: 'wfd-ai-close', ariaLabel: 'Close the AI chat', onClick: () => { closeRef.current(); focusToggle() }, children: '×' }),
    ] }),
    jsx(PracticeAiNote, {}),
    jsxs('div', { className: 'dy-wfd-ai-thread', ref: listRef, 'aria-live': 'polite', children: [
      thread.length ? null : jsx('p', { className: 'dockyard-meta', children: empty
        ? 'Say what the workflow should do. I suggest the steps here first; nothing goes on the canvas until you press Apply.'
        : `Ask about "${workflowTitle}" or ask for a change. I suggest each change here first; nothing changes until you press Apply.` }),
      ...thread.map((entry) => (entry.role === 'user'
        ? jsx('p', { className: 'dy-wfd-ai-user', 'data-wfd-ai-user': true, children: entry.text }, entry.id)
        : renderAi(entry))),
    ] }),
    empty && !thread.length ? jsx('div', { className: 'dy-wfd-chips', role: 'group', 'aria-label': 'Examples', children: AI_EXAMPLES.map((example) => jsx('button', { type: 'button', 'data-wfd-ai-example': example, onClick: () => send(example), children: example }, example)) }) : null,
    // The AI's changes can be kept or dropped from here too: floating, the
    // sidebar covers the right end of the toolbar.
    unsaved ? jsxs('div', { className: 'dy-wfd-ai-unsaved', role: 'group', 'aria-label': 'Unsaved changes', 'data-wfd-ai-unsaved': true, children: [
      jsx('span', { children: 'Unsaved changes on the canvas' }),
      jsx(Button, { small: true, variant: 'primary', action: 'wfd-ai-save', onClick: onSave, children: 'Save version' }),
      jsx(Button, { small: true, action: 'wfd-ai-discard', onClick: onDiscard, children: 'Discard' }),
      saveError ? jsx('p', { className: 'dy-wfd-error', role: 'alert', children: saveError }) : null,
    ] }) : null,
    jsxs('div', { className: 'dy-wfd-ai-compose', children: [
      jsx('textarea', { ref: inputRef, rows: 2, value: text, 'data-wfd-ai-input': true, 'aria-label': 'Message to the AI', 'aria-invalid': error ? 'true' : 'false', placeholder: empty ? 'e.g. Fix a bug until the tests pass' : 'e.g. what does this do? or: repeat up to 3 times', onChange: (e) => setText(e.target.value), onKeyDown: (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } } }),
      jsx(Button, { small: true, variant: 'primary', action: 'wfd-ai-send', onClick: () => send(), children: 'Send' }),
    ] }),
    error ? jsx('p', { className: 'dy-wfd-error', role: 'alert', children: error }) : null,
    jsx('p', { className: 'dockyard-meta', children: 'Nothing changes until you press Apply, and nothing is saved until Save version.' }),
  ] })
}
