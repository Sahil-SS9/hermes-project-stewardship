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

// W3: the top-level Workflows tab is the library. Every workflow the owner can
// edit lives here — global (available to every project) or dedicated to one
// project. No workflow data is invented: empty, loading and error states read
// only from the real /workflow-library contract.
export function WorkflowLibraryView({ onOpenBuilder }) {
  const [scope, setScope] = useState('all')
  const [search, setSearch] = useState('')
  const [rows, setRows] = useState(null)
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  const [name, setName] = useState('')
  const [title, setTitle] = useState('')
  const [creating, setCreating] = useState(false)
  const [enablement, setEnablement] = useState({})
  const [refusals, setRefusals] = useState({})
  const load = async () => {
    setError(null)
    try {
      const result = await api(`/workflow-library${scope === 'all' ? '' : `?scope=${scope}`}`)
      const nextRows = result.workflows ?? []
      setRows(nextRows)
      // Enablement is a per-project contract; this library view reads the
      // first project's availability so the switch is never invented state.
      const dashboard = await api('/dashboard')
      const firstProject = (dashboard.projects ?? [])[0]?.id
      if (firstProject) {
        const available = await api(`/projects/${encodeURIComponent(firstProject)}/workflows/available`)
        setEnablement(Object.fromEntries((available.workflows ?? []).map((row) => [`${row.scope}:${row.name}`, row.enabled])))
      }
    } catch (failure) { setError(String(failure?.message ?? failure)) }
  }
  useEffect(() => { void load() }, [scope])
  const filtered = (rows ?? []).filter((row) =>
    !search.trim() || row.name.toLowerCase().includes(search.trim().toLowerCase()))
  const create = async () => {
    if (!name.trim() || !title.trim()) return
    setBusy(true); setError(null)
    try {
      await api('/workflow-library', { method: 'POST', body: { scope: 'global', name: name.trim(), nodes: [{ id: 'step-1', title: title.trim(), depends_on: [] }] } })
      setName(''); setTitle(''); setCreating(false)
      await load()
      emitToast('success', 'Workflow library updated.')
    } catch (failure) { setError(String(failure?.message ?? failure)) }
    finally { setBusy(false) }
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
    const dashboard = await api('/dashboard')
    const firstProject = (dashboard.projects ?? [])[0]?.id
    if (!firstProject) return
    const key = `${rowScope}:${rowName}`
    setBusy(true); setError(null)
    try {
      const next = !(enablement[key] ?? rowScope === 'project')
      await api(`/projects/${encodeURIComponent(firstProject)}/workflows/${rowScope}/${encodeURIComponent(rowName)}/enablement`, { method: 'PUT', body: { enabled: next } })
      setEnablement((current) => ({ ...current, [key]: next }))
      emitToast('success', `Workflow turned ${next ? 'on' : 'off'} for ${firstProject}.`)
    } catch (failure) { setError(String(failure?.message ?? failure)) }
    finally { setBusy(false) }
  }
  const start = async (rowScope, rowName) => {
    const dashboard = await api('/dashboard')
    const firstProject = (dashboard.projects ?? [])[0]?.id
    if (!firstProject) return
    const key = `${rowScope}:${rowName}`
    setBusy(true); setError(null)
    try {
      await api(`/projects/${encodeURIComponent(firstProject)}/workflows/${rowScope}/${encodeURIComponent(rowName)}/start`, { method: 'POST', body: { run_key: `${rowName}-${Date.now()}` } })
      setRefusals((current) => ({ ...current, [key]: null }))
      emitToast('success', `Run of ${rowName} started for ${firstProject}.`)
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
      jsx(Button, { action: 'library-create', variant: 'primary', disabled: busy, onClick: () => setCreating((open) => !open), children: creating ? 'Close' : 'New workflow' }),
    ]}),
    creating ? jsxs('div', { className: 'dockyard-wf-library-create', 'data-library-create-form': true, children: [
      jsxs('label', { children: [jsx('span', { children: 'Workflow name' }), jsx('input', { 'data-library-name': true, value: name, onChange: (event) => setName(event.target.value) })] }),
      jsxs('label', { children: [jsx('span', { children: 'First step title' }), jsx('input', { 'data-library-title': true, value: title, onChange: (event) => setTitle(event.target.value) })] }),
      jsx(Button, { action: 'library-create-confirm', variant: 'primary', disabled: busy || !name.trim() || !title.trim(), onClick: create, children: 'Create global workflow' }),
    ]}) : null,
    rows === null && !error
      ? jsx(LoadingState, {})
      : rows === null && error
        ? jsx(ErrorState, { error, onRetry: load })
        : filtered.length === 0
          ? jsx(EmptyState, { title: 'No workflows yet', description: 'Create a workflow and project teams can adopt it for autonomous work.', icon: 'project' })
          : jsxs('div', { className: 'dockyard-wf-library-grid', 'data-library-rows': true, children: filtered.map((row) => jsxs('article', { className: 'dockyard-feature-card', 'data-library-row': row.name, 'data-library-scope': row.scope, children: [
              jsxs('header', { children: [
                jsx('h3', { children: row.name }),
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
              jsxs('div', { className: 'dockyard-wf-enablement', children: [
                jsxs('label', { className: 'dockyard-switch', children: [
                  jsx('input', { type: 'checkbox', role: 'switch', 'data-wf-enablement': `${row.scope}:${row.name}`, 'aria-checked': String(Boolean(enablement[`${row.scope}:${row.name}`] ?? row.scope === 'project')), disabled: busy, onChange: () => toggle(row.scope, row.name) }),
                  jsx('span', { className: 'dockyard-switch-track', 'aria-hidden': true }),
                  jsx('span', { className: 'dockyard-switch-thumb', 'aria-hidden': true }),
                ]}),
                jsx('span', { children: row.scope === 'global' ? 'On for the current project (off by default)' : 'On for this project' }),
                jsx(Button, { small: true, action: 'library-run', data: { 'data-wf-run-start': `${row.scope}:${row.name}` }, disabled: busy, onClick: () => start(row.scope, row.name), children: 'Start run' }),
              ]}),
              refusals[`${row.scope}:${row.name}`]
                ? jsx('p', { className: 'dockyard-inline-error', role: 'alert', 'data-wf-run-refused': `${row.scope}:${row.name}`, children: refusals[`${row.scope}:${row.name}`] })
                : null,
            ]}, `${row.scope}:${row.name}:${row.owner_project_id ?? ''}`)) }),
  ]})
}
