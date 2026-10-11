// GENERATED-STRUCTURE: hand-edited Desktop module. Edit this file, then run
// node hermes_dockyard_plugin/desktop/build.mjs to regenerate plugin.js.
//
// Archived projects (owner decisions 10/10/2026 and 11/10/2026). Archive hides
// a project everywhere; the project switcher's menu (Sahil's pick, option A)
// opens the one list that shows archived projects, with what Restore brings
// back. Restore puts a project back exactly as it was archived (backend:
// StewardshipService.restore_project) and opens it.
import { useEffect } from '../runtime/react.js'
import { useState } from '../runtime/react.js'
import { jsx } from '../runtime/react.js'
import { jsxs } from '../runtime/react.js'
import { Fragment } from '../runtime/react.js'
import { api } from '../runtime/context.js'
import { emitToast } from '../runtime/context.js'
import { Button } from '../lib/ui.js'
import { Icon } from '../lib/ui.js'

// Where the archive messages send people to restore a project.
export const RESTORE_FROM = 'the project switcher > Archived projects'

const PHASE_WORDS = { active: 'active', paused: 'paused', frozen: 'frozen' }

// "switched on, frozen": the state a project is in now, or comes back in.
export function stateWords({ enabled, phase } = {}) {
  return `${enabled ? 'switched on' : 'switched off'}, ${PHASE_WORDS[phase] ?? String(phase ?? 'unknown')}`
}

const day = (iso) => {
  const date = new Date(iso)
  return Number.isNaN(date.getTime()) ? String(iso ?? '') : date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export async function loadArchivedProjects() {
  const result = await api('/projects/archived', { suppressErrorToast: true })
  return result?.projects ?? []
}

function ArchivedProjectsList({ onRestored, onCount }) {
  const [rows, setRows] = useState(null)
  const [error, setError] = useState(null)
  const [confirming, setConfirming] = useState(null)
  const [busy, setBusy] = useState(null)
  const load = async () => {
    try {
      const next = await loadArchivedProjects()
      setRows(next)
      setError(null)
      onCount?.(next.length)
    } catch (failure) {
      setError(String(failure?.message ?? failure))
    }
  }
  useEffect(() => { load() }, [])
  const restore = async (row) => {
    setBusy(row.project_id)
    try {
      await api(`/projects/${encodeURIComponent(row.project_id)}/restore`, { method: 'POST', body: {}, quiet: true })
      emitToast('success', `${row.project_id} is back, exactly as it was archived: ${stateWords(row.restores_to)}.`)
      setConfirming(null)
      await load()
      onRestored?.(row.project_id)
    } catch (failure) {
      setError(String(failure?.message ?? failure))
    }
    setBusy(null)
  }
  if (error) return jsx('p', { className: 'dockyard-inline-error', role: 'alert', 'data-archived-error': true, children: error })
  if (!rows) return jsx('p', { className: 'dockyard-meta', 'data-archived-loading': true, children: 'Loading archived projects...' })
  if (!rows.length) {
    return jsx('p', { className: 'dy-arch-empty', 'data-archived-empty': true,
      children: 'No archived projects. Archive one from its Settings tab: it is hidden everywhere else and waits here until you restore it.' })
  }
  return jsx('ul', { className: 'dy-arch-list', 'data-archived-list': true, children: rows.map((row) => {
    const asking = confirming === row.project_id
    const working = busy === row.project_id
    return jsxs('li', { className: 'dy-arch-row', 'data-archived-project': row.project_id, children: [
      jsxs('div', { className: 'dy-arch-copy', children: [
        jsx('strong', { children: row.project_id }),
        row.mission ? jsx('span', { className: 'dy-arch-mission', children: row.mission }) : null,
        jsx('span', { className: 'dy-arch-meta', children:
          `Archived ${day(row.archived_at)}${row.archived_by ? ` by ${row.archived_by}` : ''} · comes back ${stateWords(row.restores_to)}` }),
      ] }),
      asking
        ? jsxs('div', { className: 'dy-arch-confirm', role: 'group', 'aria-label': `Restore ${row.project_id}`, children: [
            jsx('span', { children: `Restore ${row.project_id}? It comes back exactly as it was archived (${stateWords(row.restores_to)}) and shows on your dashboard, inbox and roadmap again.` }),
            jsxs('span', { className: 'dy-arch-confirm-actions', children: [
              jsx(Button, { small: true, action: 'cancel-restore', disabled: working, onClick: () => setConfirming(null), children: 'Cancel' }),
              jsx(Button, { small: true, variant: 'primary', action: 'confirm-restore', disabled: working, onClick: () => restore(row), children: working ? 'Restoring...' : 'Restore' }),
            ] }),
          ] })
        : jsx(Button, { small: true, action: 'restore-project', data: { 'data-restore-project': row.project_id },
            onClick: () => setConfirming(row.project_id),
            children: jsxs(Fragment, { children: [jsx(Icon, { name: 'archive-restore' }), 'Restore'] }) }),
    ] }, row.project_id)
  }) })
}

export function ArchivedProjectsDialog({ onClose, onRestored, onCount }) {
  useEffect(() => {
    const closeOnEscape = (event) => { if (event.key === 'Escape') onClose() }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [onClose])
  return jsx('section', {
    className: 'dockyard-modal-layer', 'data-archived-dialog': true,
    onMouseDown: (event) => { if (event.target === event.currentTarget) onClose() },
    children: jsxs('div', { className: 'dockyard-modal dy-arch-modal', role: 'dialog', 'aria-modal': true, 'aria-labelledby': 'dy-arch-title', children: [
      jsxs('header', { className: 'dy-arch-head', children: [
        jsx('h2', { id: 'dy-arch-title', children: 'Archived projects' }),
        jsx('p', { children: 'Hidden everywhere else, and nothing was deleted. Restore brings a project back exactly as it was archived.' }),
      ] }),
      jsx(ArchivedProjectsList, { onRestored, onCount }),
      jsx('div', { className: 'dockyard-modal-actions', children: jsx(Button, { action: 'close-archived', onClick: onClose, children: 'Close' }) }),
    ] }),
  })
}
