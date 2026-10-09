// GENERATED-STRUCTURE: hand-edited Desktop module. Edit this file, then run
// node hermes_dockyard_plugin/desktop/build.mjs to regenerate plugin.js.
//
// Project memory (checks round 1; Sahil 08/10 pick 1b = A): the facts,
// decisions and rules this project's bots are given when they work on it.
// Loads its own data. Writes need the project owner (the backend checks every
// write; can_write only hides what it would refuse). Nothing is deleted:
// Archive hides an entry and Restore brings it back as it was. An edit keeps
// the old wording as history. Finished work is offered as a starting point
// for a new entry; nothing is added without a person pressing Add.
import { useEffect } from '../runtime/react.js'
import { useState } from '../runtime/react.js'
import { jsx } from '../runtime/react.js'
import { jsxs } from '../runtime/react.js'
import { api } from '../runtime/context.js'
import { emitToast } from '../runtime/context.js'
import { Button } from '../lib/ui.js'
import { StatusTag } from '../lib/ui.js'
import { formatWhen } from '../lib/ui.js'
import { number } from '../lib/ui.js'
import { plural } from '../lib/ui.js'

export const MEMORY_KINDS = Object.freeze([
  ['rule', 'Rule', 'Rules'],
  ['decision', 'Decision', 'Decisions'],
  ['fact', 'Fact', 'Facts'],
])
export const MEMORY_MAX_TEXT = 500
const kindLabel = (kind) => (MEMORY_KINDS.find(([key]) => key === kind) ?? [kind, kind])[1]

// "Added by sahil · 8 Oct, 21:40 · from finished work t_1 · edited"
export function memoryMeta(entry) {
  const parts = [`Added by ${entry.created_by}`]
  const when = formatWhen(entry.created_at)
  if (when) parts.push(when)
  if (String(entry.source ?? '').startsWith('work:')) parts.push(`from finished work ${entry.source.slice(5)}`)
  if (entry.supersedes_id != null) parts.push('edited')
  if (entry.archived_at) parts.push(`archived by ${entry.archived_by}`)
  return parts.join(' · ')
}

function KindSelect({ value, onChange, label }) {
  return jsxs('label', { children: [
    label,
    jsx('select', { value, 'data-memory-kind': true, onChange: (event) => onChange(event.target.value), children:
      MEMORY_KINDS.map(([key, name]) => jsx('option', { value: key, children: name }, key)) }),
  ]})
}

function TextBox({ value, onChange, label, field }) {
  return jsxs('label', { children: [
    label,
    jsx('textarea', { value, rows: 3, maxLength: MEMORY_MAX_TEXT, [field]: true, onChange: (event) => onChange(event.target.value) }),
    jsx('small', { className: 'dy-mem-count', 'aria-live': 'polite', children: `${number(value.length)} / ${number(MEMORY_MAX_TEXT)}` }),
  ]})
}

function MemoryEntry({ entry, canWrite, busy, onEdit, onArchive, onRestore }) {
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState(entry.text)
  const [kind, setKind] = useState(entry.kind)
  const [history, setHistory] = useState(null)
  const showHistory = async () => {
    if (history) { setHistory(null); return }
    try {
      const result = await api(`/projects/${encodeURIComponent(entry.project_id)}/memory/${entry.id}/history`)
      setHistory(result.history ?? [])
    } catch (failure) {
      emitToast('danger', String(failure?.message ?? failure))
    }
  }
  const save = async () => {
    const changed = await onEdit(entry, { text: text.trim() === entry.text ? undefined : text, kind: kind === entry.kind ? undefined : kind })
    if (changed) setEditing(false)
  }
  return jsxs('article', { className: 'dy-mem-entry', 'data-memory-entry': entry.id, 'data-memory-entry-kind': entry.kind, 'data-archived': entry.archived_at ? 'true' : 'false', children: [
    editing
      ? jsxs('div', { className: 'dockyard-inline-editor', 'data-memory-editor': entry.id, children: [
        jsx(KindSelect, { value: kind, onChange: setKind, label: 'Kind' }),
        jsx(TextBox, { value: text, onChange: setText, label: 'Text', field: 'data-memory-edit-text' }),
        jsxs('div', { className: 'dy-mem-actions', children: [
          jsx(Button, { action: 'save-memory-entry', variant: 'primary', small: true, disabled: busy || !text.trim(), onClick: save, children: 'Save' }),
          jsx(Button, { action: 'cancel-memory-edit', small: true, onClick: () => { setEditing(false); setText(entry.text); setKind(entry.kind) }, children: 'Cancel' }),
        ]}),
      ]})
      : jsxs('div', { className: 'dy-mem-body', children: [
        jsx('p', { className: 'dy-mem-text', children: entry.text }),
        jsx('small', { className: 'dy-mem-meta', children: memoryMeta(entry) }),
      ]}),
    !editing ? jsxs('div', { className: 'dy-mem-actions', children: [
      entry.supersedes_id != null ? jsx(Button, { action: 'memory-history', small: true, ariaLabel: `History of: ${entry.text}`, onClick: showHistory, children: history ? 'Hide history' : 'History' }) : null,
      canWrite && !entry.archived_at ? jsx(Button, { action: 'edit-memory-entry', small: true, ariaLabel: `Edit: ${entry.text}`, disabled: busy, onClick: () => setEditing(true), children: 'Edit' }) : null,
      canWrite && !entry.archived_at ? jsx(Button, { action: 'archive-memory-entry', small: true, ariaLabel: `Archive: ${entry.text}`, disabled: busy, onClick: () => onArchive(entry), children: 'Archive' }) : null,
      canWrite && entry.archived_at ? jsx(Button, { action: 'restore-memory-entry', small: true, ariaLabel: `Restore: ${entry.text}`, disabled: busy, onClick: () => onRestore(entry), children: 'Restore' }) : null,
    ]}) : null,
    history ? jsx('ol', { className: 'dy-mem-history', 'data-memory-history': entry.id, children: history.map((version) => jsxs('li', { children: [
      jsx('span', { children: `${kindLabel(version.kind)}: ${version.text}` }),
      jsx('small', { children: `${version.created_by} · ${formatWhen(version.created_at)}` }),
    ]}, version.id)) }) : null,
  ]})
}

export function ProjectMemoryPanel({ project }) {
  const encoded = encodeURIComponent(project.id)
  const [state, setState] = useState({ status: 'loading', entries: [], context: '', cap: 2000, canWrite: false })
  const [suggestions, setSuggestions] = useState({ status: 'loading', items: [] })
  const [showArchived, setShowArchived] = useState(false)
  const [kind, setKind] = useState('rule')
  const [text, setText] = useState('')
  const [source, setSource] = useState('human')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const load = async () => {
    try {
      const result = await api(`/projects/${encoded}/memory?include_archived=true`)
      setState({ status: 'ready', entries: result.entries ?? [], context: result.context ?? '', cap: result.cap ?? 2000, canWrite: Boolean(result.can_write) })
    } catch (failure) {
      setState((current) => ({ ...current, status: 'error' }))
      setError(String(failure?.message ?? failure))
    }
    try {
      const result = await api(`/projects/${encoded}/memory/suggestions`)
      setSuggestions({ status: 'ready', items: result.suggestions ?? [] })
    } catch {
      setSuggestions({ status: 'unavailable', items: [] })
    }
  }
  useEffect(() => { load() }, [project.id])
  // One door for every write: refresh after it, and say what went wrong in the
  // panel. `quiet`: the panel says what happened itself (one toast, not two).
  const write = async (path, init, done) => {
    setBusy(true)
    setError(null)
    try {
      await api(path, { ...init, quiet: true })
      await load()
      if (done) emitToast('success', done)
      return true
    } catch (failure) {
      setError(String(failure?.message ?? failure))
      return false
    } finally {
      setBusy(false)
    }
  }
  const add = async () => {
    const added = await write(`/projects/${encoded}/memory`, { method: 'POST', body: { kind, text, source } }, 'Added to the project memory.')
    if (added) { setText(''); setSource('human') }
  }
  const edit = (entry, changes) => {
    const body = Object.fromEntries(Object.entries(changes).filter(([, value]) => value !== undefined))
    if (Object.keys(body).length === 0) { setError('Nothing to change: the entry already says this.'); return Promise.resolve(false) }
    return write(`/projects/${encoded}/memory/${entry.id}`, { method: 'PATCH', body }, 'Memory entry updated.')
  }
  const archive = (entry) => write(`/projects/${encoded}/memory/${entry.id}/archive`, { method: 'POST', body: {} }, 'Archived. Bots no longer see it.')
  const restore = (entry) => write(`/projects/${encoded}/memory/${entry.id}/restore`, { method: 'POST', body: {} }, 'Restored. Bots see it again.')
  const useSuggestion = (item) => { setKind('fact'); setText(item.text); setSource(`work:${item.work_id}`) }

  const active = state.entries.filter((entry) => !entry.archived_at)
  const archived = state.entries.filter((entry) => entry.archived_at)
  const entryProps = { canWrite: state.canWrite, busy, onEdit: edit, onArchive: archive, onRestore: restore }
  return jsxs('div', { className: 'dockyard-content-layout', 'data-project-memory': project.id, children: [
    jsxs('section', { className: 'dockyard-feature-card', children: [
      jsxs('div', { className: 'dockyard-section-head', children: [
        jsxs('div', { children: [
          jsx('h2', { children: 'Project memory' }),
          jsx('p', { children: "What this project's bots are told when they work on it: rules first, then decisions, then facts." }),
        ]}),
        jsx(StatusTag, { tone: 'neutral', label: `${number(active.length)} ${plural(active.length, 'entry', 'entries')}` }),
      ]}),
      state.status === 'loading' ? jsx('p', { className: 'dockyard-meta', children: 'Loading memory...' }) : null,
      state.status === 'ready' && state.canWrite ? jsxs('div', { className: 'dockyard-inline-editor', 'data-memory-add': true, children: [
        jsx(KindSelect, { value: kind, onChange: setKind, label: 'Kind' }),
        jsx(TextBox, { value: text, onChange: setText, label: 'Text', field: 'data-memory-text' }),
        source !== 'human' ? jsxs('p', { className: 'dockyard-meta', 'data-memory-source': source, children: [
          `Starting from finished work ${source.slice(5)}. `,
          jsx(Button, { action: 'clear-memory-source', small: true, onClick: () => { setSource('human'); setText('') }, children: 'Clear' }),
        ]}) : null,
        jsx('div', { className: 'dy-mem-actions', children: jsx(Button, { action: 'add-memory-entry', variant: 'primary', disabled: busy || !text.trim(), onClick: add, children: busy ? 'Saving...' : 'Add to memory' }) }),
      ]}) : null,
      state.status === 'ready' && !state.canWrite ? jsx('p', { className: 'dockyard-meta', 'data-memory-read-only': true, children: 'Only the project owner can change the memory.' }) : null,
      error ? jsx('p', { className: 'dockyard-inline-error', role: 'alert', children: error }) : null,
      state.status === 'ready' && active.length === 0 ? jsx('p', { className: 'dockyard-meta', 'data-memory-empty': true, children: 'No memory yet. Add the facts, decisions and rules the bots should know.' }) : null,
      ...MEMORY_KINDS.map(([key, , heading]) => {
        const group = active.filter((entry) => entry.kind === key)
        if (group.length === 0) return null
        return jsxs('div', { className: 'dy-mem-group', 'data-memory-group': key, children: [
          jsx('h3', { children: heading }),
          ...group.map((entry) => jsx(MemoryEntry, { entry, ...entryProps }, `${entry.id}:${entry.archived_at ?? ''}`)),
        ]}, key)
      }),
      archived.length > 0 ? jsx('div', { className: 'dy-mem-actions', children: jsx(Button, { action: 'toggle-archived-memory', small: true, onClick: () => setShowArchived(!showArchived), children: showArchived ? 'Hide archived' : `Show archived (${number(archived.length)})` }) }) : null,
      showArchived && archived.length > 0 ? jsxs('div', { className: 'dy-mem-group', 'data-memory-group': 'archived', children: [
        jsx('h3', { children: 'Archived' }),
        ...archived.map((entry) => jsx(MemoryEntry, { entry, ...entryProps }, `${entry.id}:${entry.archived_at}`)),
      ]}) : null,
    ]}),
    jsxs('aside', { className: 'dockyard-feature-card', 'data-memory-preview-card': true, children: [
      jsx('span', { className: 'dockyard-card-label', children: 'WHAT BOTS SEE' }),
      state.context
        ? jsx('pre', { className: 'dockyard-content-preview', 'data-memory-preview': true, children: state.context })
        : jsx('p', { className: 'dockyard-meta', 'data-memory-preview': true, children: 'Nothing yet. Bots get no project memory until you add some.' }),
      jsx('small', { className: 'dy-mem-count', children: `${number(state.context.length)} of ${number(state.cap)} characters. Bots get this when they work on this project's tasks, or in a chat opened from Dockyard.` }),
      jsxs('div', { className: 'dy-mem-suggestions', 'data-memory-suggestions': suggestions.status, children: [
        jsx('h3', { children: 'From finished work' }),
        suggestions.status === 'loading' ? jsx('p', { className: 'dockyard-meta', children: 'Loading finished work...' }) : null,
        suggestions.status === 'unavailable' ? jsx('p', { className: 'dockyard-meta', children: 'Finished work is unavailable right now.' }) : null,
        suggestions.status === 'ready' && suggestions.items.length === 0 ? jsx('p', { className: 'dockyard-meta', children: 'No finished work with a result to start from.' }) : null,
        ...suggestions.items.map((item) => jsxs('article', { className: 'dy-mem-entry', 'data-memory-suggestion': item.work_id, children: [
          jsxs('div', { className: 'dy-mem-body', children: [
            jsx('p', { className: 'dy-mem-text', children: item.text }),
            jsx('small', { className: 'dy-mem-meta', children: [item.title, item.work_id].filter(Boolean).join(' · ') }),
          ]}),
          state.canWrite ? jsx('div', { className: 'dy-mem-actions', children: jsx(Button, { action: 'use-memory-suggestion', small: true, ariaLabel: `Start an entry from: ${item.title || item.work_id}`, onClick: () => useSuggestion(item), children: 'Use this' }) }) : null,
        ]}, item.work_id)),
      ]}),
    ]}),
  ]})
}
