// GENERATED-STRUCTURE: hand-edited Desktop module. Edit this file, then run
// node hermes_dockyard_plugin/desktop/build.mjs to regenerate plugin.js.
import { api } from '../runtime/context.js'
import { emitToast } from '../runtime/context.js'
import { useEffect } from '../runtime/react.js'
import { useState } from '../runtime/react.js'
import { jsx } from '../runtime/react.js'
import { jsxs } from '../runtime/react.js'
import { Button } from '../lib/ui.js'
import { EmptyState } from '../lib/ui.js'
import { ErrorState } from '../lib/ui.js'
import { LoadingState } from '../lib/ui.js'
import { PageHead } from '../lib/ui.js'
import { StatusTag } from '../lib/ui.js'
import { number } from '../lib/ui.js'
import { NewWorkflowDialog } from '../project/workflow-design/start-dialog.js'

// W3: the top-level Workflows tab is the library. Every workflow the owner can
// edit lives here — global (available to every project) or dedicated to one
// project. No workflow data is invented: empty, loading and error states read
// only from the real /workflow-library contract.
//
// New workflow opens the builder's dialog (Sahil 08/10/2026: not a name and
// first-step form): where it lives first, then the four ways in. A global
// one stays here, marked as just made; a project one opens on the canvas.
export function WorkflowLibraryView({ projectId, projectLabel = null, highlight = null, onOpenBuilder }) {
  const [scope, setScope] = useState('all')
  const [search, setSearch] = useState('')
  const [rows, setRows] = useState(null)
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  // The New workflow dialog and what it needs: the names in use, the saved
  // templates and the project's bots. null = closed.
  const [dialog, setDialog] = useState(null)
  const [justMade, setJustMade] = useState(highlight)
  const [enablement, setEnablement] = useState({})
  const [refusals, setRefusals] = useState({})
  const load = async () => {
    setError(null)
    try {
      const result = await api(`/workflow-library${scope === 'all' ? '' : `?scope=${scope}`}`)
      const nextRows = result.workflows ?? []
      setRows(nextRows)
      // Enablement is per project: read it for the project selected in the
      // global picker so every switch reflects persisted state for THAT project.
      if (projectId) {
        const available = await api(`/projects/${encodeURIComponent(projectId)}/workflows/available`)
        setEnablement(Object.fromEntries((available.workflows ?? []).map((row) => [`${row.scope}:${row.name}`, row.enabled])))
      } else {
        setEnablement({})
      }
    } catch (failure) { setError(String(failure?.message ?? failure)) }
  }
  useEffect(() => { void load() }, [scope, projectId])
  const filtered = (rows ?? []).filter((row) =>
    !search.trim() || row.name.toLowerCase().includes(search.trim().toLowerCase()))
  useEffect(() => {
    if (justMade && rows) document.querySelector('[data-library-just-created="true"]')?.scrollIntoView({ block: 'nearest' })
  }, [justMade, rows])
  const openNew = async () => {
    setError(null)
    setDialog({ taken: null, templates: null, members: [] })
    try {
      const [all, team] = await Promise.all([
        api('/workflow-library?include_archived=true'),
        projectId ? api(`/projects/${encodeURIComponent(projectId)}/team`).catch(() => null) : null,
      ])
      const every = all?.workflows ?? []
      const names = (keep) => every.filter(keep).map((row) => row.name)
      setDialog((open) => open && {
        taken: { global: names((row) => row.scope === 'global'), project: projectId ? names((row) => row.scope === 'project' && row.owner_project_id === projectId) : [] },
        templates: every.filter((row) => row.scope === 'global' && !row.archived_at),
        members: (team?.members ?? []).filter((m) => m.state === 'active').map((m) => m.profile_slug),
      })
    } catch (failure) {
      setDialog(null)
      setError(`Couldn't open New workflow: ${String(failure?.message ?? failure)}`)
    }
  }
  const createNew = async ({ scope: where, name, nodes, checks, conversation }) => {
    if (where === 'global') {
      await api('/workflow-library', { method: 'POST', body: { scope: 'global', name, nodes }, quiet: true })
      setDialog(null); setJustMade(name); setSearch('')
      if (scope === 'project') setScope('all')
      else await load()
      emitToast('success', `${name} is saved for every project.`)
      return
    }
    await api(`/projects/${encodeURIComponent(projectId)}/workflows`, { method: 'POST', body: { name, nodes }, quiet: true })
    setDialog(null)
    onOpenBuilder?.({ scope: 'project', name, owner_project_id: projectId }, { created: true, conversation, checks })
  }
  const act = async (path) => {
    setBusy(true); setError(null)
    try { await api(path, { method: 'POST' }); await load(); emitToast('success', 'Workflow library updated.') }
    catch (failure) { setError(String(failure?.message ?? failure)) }
    finally { setBusy(false) }
  }
  const remove = async (rowScope, rowName, owner) => {
    setBusy(true); setError(null)
    try {
      const params = owner ? `?owner_project_id=${encodeURIComponent(owner)}` : ''
      await api(`/workflow-library/${rowScope}/${encodeURIComponent(rowName)}${params}`, { method: 'DELETE' })
      await load(); emitToast('success', 'Workflow library updated.')
    } catch (failure) { setError(String(failure?.message ?? failure)) }
    finally { setBusy(false) }
  }
  const toggle = async (rowScope, rowName) => {
    if (!projectId) return
    const key = `${rowScope}:${rowName}`
    setBusy(true); setError(null)
    try {
      const next = !(enablement[key] ?? rowScope === 'project')
      await api(`/projects/${encodeURIComponent(projectId)}/workflows/${rowScope}/${encodeURIComponent(rowName)}/enablement`, { method: 'PUT', body: { enabled: next } })
      setEnablement((current) => ({ ...current, [key]: next }))
      emitToast('success', `Workflow turned ${next ? 'on' : 'off'} for ${projectId}.`)
    } catch (failure) { setError(String(failure?.message ?? failure)) }
    finally { setBusy(false) }
  }
  const start = async (rowScope, rowName) => {
    if (!projectId) return
    const key = `${rowScope}:${rowName}`
    setBusy(true); setError(null)
    try {
      await api(`/projects/${encodeURIComponent(projectId)}/workflows/${rowScope}/${encodeURIComponent(rowName)}/start`, { method: 'POST', body: { run_key: `${rowName}-${Date.now()}` } })
      setRefusals((current) => ({ ...current, [key]: null }))
      emitToast('success', `Run of ${rowName} started for ${projectId}.`)
    } catch (failure) {
      setRefusals((current) => ({ ...current, [key]: `Run refused: ${String(failure?.message ?? failure)}` }))
    } finally { setBusy(false) }
  }
  return jsxs('section', { 'data-workflow-library-screen': true, children: [
    jsx(PageHead, { title: 'Workflows', description: 'Every workflow available to project teams. Global workflows are shared by all projects; dedicated ones belong to a single project.' }),
    error ? jsx('p', { className: 'dockyard-inline-error', role: 'alert', 'data-library-error': true, children: error }) : null,
    jsxs('div', { className: 'dockyard-wf-library-toolbar', children: [
      jsxs('div', { className: 'dockyard-wf-library-scope', role: 'group', 'aria-label': 'Scope filter', children: [
        jsx(Button, { small: true, action: 'library-scope-all', variant: scope === 'all' ? 'primary' : '', onClick: () => setScope('all'), children: 'All' }),
        jsx(Button, { small: true, action: 'library-scope-global', variant: scope === 'global' ? 'primary' : '', onClick: () => setScope('global'), children: 'Global' }),
        jsx(Button, { small: true, action: 'library-scope-project', variant: scope === 'project' ? 'primary' : '', onClick: () => setScope('project'), children: 'Project' }),
      ]}),
      jsx('input', { 'data-library-search': true, 'aria-label': 'Search workflows', placeholder: 'Search workflows', value: search, onChange: (event) => setSearch(event.target.value) }),
      jsx(Button, { action: 'library-create', variant: 'primary', disabled: busy || Boolean(dialog), onClick: openNew, children: 'New workflow' }),
    ]}),
    dialog ? jsx(NewWorkflowDialog, { project: projectId ? { id: projectId, name: projectLabel ?? projectId } : null, taken: dialog.taken, templates: dialog.templates, members: dialog.members, onCreate: createNew, onClose: () => setDialog(null) }) : null,
    rows === null && !error
      ? jsx(LoadingState, {})
      : rows === null && error
        ? jsx(ErrorState, { error, onRetry: load })
        : filtered.length === 0
          ? jsx(EmptyState, { title: 'No workflows yet', description: 'Create a workflow and project teams can adopt it for autonomous work.', icon: 'project' })
          : jsxs('div', { className: 'dockyard-wf-library-grid', 'data-library-rows': true, children: filtered.map((row) => {
            const made = row.scope === 'global' && row.name === justMade
            return jsxs('article', { className: `dockyard-feature-card${made ? ' dy-wf-just-made' : ''}`, 'data-library-row': row.name, 'data-library-scope': row.scope, 'data-library-just-created': made ? 'true' : undefined, children: [
              jsxs('header', { children: [
                jsx('h3', { children: row.name }),
                made ? jsx(StatusTag, { tone: 'success', label: 'Just made' }) : null,
                jsx(StatusTag, { tone: row.scope === 'global' ? 'info' : 'neutral', label: row.scope === 'global' ? 'Global' : 'Project' }),
              ]}),
              jsx('p', { className: 'dockyard-meta', children: row.owner_project_id ? `Dedicated to ${row.owner_project_id} · v${row.version}` : `Available to every project · v${row.version}` }),
              jsx('p', { className: 'dockyard-meta', children: `${number(row.definition?.nodes?.length ?? 0)} nodes` }),
              row.archived_at
                ? jsx(Button, { small: true, action: 'library-restore', disabled: busy, onClick: () => act(`/workflow-library/${row.scope}/${encodeURIComponent(row.name)}/restore${row.owner_project_id ? `?owner_project_id=${encodeURIComponent(row.owner_project_id)}` : ''}`), children: 'Restore' })
                : jsxs('div', { className: 'dockyard-form-actions', children: [
                    jsx(Button, { small: true, action: 'library-open', disabled: busy, onClick: () => onOpenBuilder?.(row), children: 'Open builder' }),
                    jsx(Button, { small: true, action: 'library-archive', disabled: busy, onClick: () => act(`/workflow-library/${row.scope}/${encodeURIComponent(row.name)}/archive${row.owner_project_id ? `?owner_project_id=${encodeURIComponent(row.owner_project_id)}` : ''}`), children: 'Archive' }),
                    jsx(Button, { small: true, action: 'library-delete', variant: 'danger', disabled: busy, onClick: () => remove(row.scope, row.name, row.owner_project_id), children: 'Delete' }),
                  ] }),
              !projectId || (row.scope === 'project' && row.owner_project_id !== projectId)
                ? jsx('p', { className: 'dockyard-meta', 'data-wf-enablement-na': `${row.scope}:${row.name}`, children: projectId ? `Only ${row.owner_project_id} can run this workflow.` : 'Select a project to turn workflows on or off.' })
                : jsxs('div', { className: 'dockyard-wf-enablement', children: [
                jsxs('label', { className: 'dockyard-switch', children: [
                  jsx('input', { type: 'checkbox', role: 'switch', 'data-wf-enablement': `${row.scope}:${row.name}`, 'aria-label': `Turn ${row.name} on for ${projectId}`, checked: Boolean(enablement[`${row.scope}:${row.name}`] ?? row.scope === 'project'), 'aria-checked': String(Boolean(enablement[`${row.scope}:${row.name}`] ?? row.scope === 'project')), disabled: busy, onChange: () => toggle(row.scope, row.name) }),
                  jsx('span', { className: 'dockyard-switch-track', 'aria-hidden': true }),
                  jsx('span', { className: 'dockyard-switch-thumb', 'aria-hidden': true }),
                ]}),
                jsx('span', { className: 'dockyard-wf-enablement-label', children: row.scope === 'global' ? `On for ${projectId} (off by default)` : `On for ${projectId}` }),
                jsx(Button, { small: true, action: 'library-run', data: { 'data-wf-run-start': `${row.scope}:${row.name}` }, disabled: busy, onClick: () => start(row.scope, row.name), children: 'Start run' }),
              ]}),
              refusals[`${row.scope}:${row.name}`]
                ? jsx('p', { className: 'dockyard-inline-error', role: 'alert', 'data-wf-run-refused': `${row.scope}:${row.name}`, children: refusals[`${row.scope}:${row.name}`] })
                : null,
            ]}, `${row.scope}:${row.name}:${row.owner_project_id ?? ''}`)
          }) }),
  ]})
}
