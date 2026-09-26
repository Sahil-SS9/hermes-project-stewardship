// GENERATED-STRUCTURE: hand-edited Desktop module. Edit this file, then run
// node hermes_dockyard_plugin/desktop/build.mjs to regenerate plugin.js.
import { useState } from '../runtime/react.js'
import { api } from '../runtime/context.js'
import { emitToast } from '../runtime/context.js'
import { jsxs } from '../runtime/react.js'
import { jsx } from '../runtime/react.js'
import { StatusTag } from '../lib/ui.js'
import { number } from '../lib/ui.js'
import { readableLabel } from '../data/loaders.js'
import { Icon } from '../lib/ui.js'
import { Button } from '../lib/ui.js'
import { ConfirmDialog } from '../lib/ui.js'
export function SavedViewsSection({ project, views, onApply, onClear, appliedName, onRefresh }) {
  const [name, setName] = useState('')
  const [layout, setLayout] = useState('board')
  const [statusFilter, setStatusFilter] = useState('in_progress')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState(null)
  const [selectedView, setSelectedView] = useState(null)
  const [overwriteConfirm, setOverwriteConfirm] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [recallNotice, setRecallNotice] = useState(null)
  const encoded = encodeURIComponent(project.id)
  const savedList = views ?? []
  const loadSavedView = (saved) => {
    setSelectedView(saved.name)
    setName(saved.name ?? '')
    setLayout(saved.layout ?? 'board')
    setStatusFilter(saved.filters?.status ?? 'in_progress')
    setError(null)
    setRecallNotice(null)
  }
  // Recall applies the stored filters and layout to the board by running the
  // saved query on the backend; the client never re-derives the rows.
  const recall = async (saved) => {
    loadSavedView(saved)
    try {
      const result = await api(`/projects/${encoded}/views/${encodeURIComponent(saved.name)}/items`)
      onApply({ name: saved.name, layout: saved.layout ?? 'board', items: result.items ?? [] })
    } catch (failure) {
      setRecallNotice(`Could not run saved view ${saved.name}: ${String(failure?.message ?? failure)}`)
    }
  }
  const persist = async (viewName) => {
    setSaving(true)
    setError(null)
    try {
      await api(`/projects/${encoded}/views`, {
        method: 'PUT',
        body: { name: viewName, layout, filters: { status: statusFilter }, shared: false },
      })
      setSelectedView(viewName)
      if (appliedName && appliedName !== viewName) onClear()
      emitToast('success', `Saved view ${viewName}.`)
      onRefresh()
    } catch (failure) {
      setError(String(failure?.message ?? failure))
    }
    setSaving(false)
  }
  const save = () => {
    const viewName = name.trim()
    if (!viewName) return
    // Any save that replaces an existing definition asks first: overwrites
    // are destructive to the stored view even though they are not schema
    // changes.
    if (savedList.some((saved) => saved.name === viewName)) {
      setOverwriteConfirm(true)
      return
    }
    persist(viewName)
  }
  const remove = async () => {
    const viewName = selectedView
    if (!viewName) return
    setDeleting(true)
    setError(null)
    try {
      await api(`/projects/${encoded}/views/${encodeURIComponent(viewName)}`, { method: 'DELETE' })
      if (appliedName === viewName) onClear()
      setSelectedView(null)
      setName('')
      emitToast('success', `Deleted saved view ${viewName}.`)
      onRefresh()
    } catch (failure) {
      setError(String(failure?.message ?? failure))
    }
    setDeleting(false)
  }
  return jsxs('section', { className: 'dockyard-feature-card', 'data-saved-views-screen': project.id, children: [
    jsxs('div', { className: 'dockyard-section-head', children: [
      jsxs('div', { children: [
        jsx('h2', { children: 'Saved views' }),
        jsx('p', { children: 'Display preferences over canonical project work. Saved views change how canonical work is displayed; they do not run automations, assign work or expand permissions.' }),
      ]}),
      jsx(StatusTag, { tone: 'neutral', label: `${number(savedList.length)} saved` }),
    ]}),
    jsxs('div', { className: 'dockyard-saved-views-layout', children: [
      jsx('div', { className: 'dockyard-saved-views', children:
        savedList.length > 0
          ? savedList.map((saved) => jsxs('button', { type: 'button', className: (appliedName ?? selectedView) === saved.name ? 'active' : '', 'data-saved-view': saved.name, onClick: () => recall(saved), children: [
              jsxs('span', { children: [jsx('strong', { children: saved.name }), jsx('small', { children: `${readableLabel(saved.layout, 'Board')} / ${readableLabel(saved.filters?.status)}` })] }),
              jsx(Icon, { name: 'chevron' }),
            ]}, saved.name))
          : jsx('p', { className: 'dockyard-meta', children: 'No saved views yet.' }),
      }),
      jsxs('div', { className: 'dockyard-saved-view-editor', 'data-saved-view-editor': true, children: [
        jsxs('div', { className: 'dockyard-section-head', children: [
          jsxs('div', { children: [jsx('h2', { children: selectedView ? 'Edit saved view' : 'Create saved view' }), jsx('p', { children: 'Persist a bounded lens over canonical project work.' })] }),
          selectedView ? jsx(StatusTag, { tone: 'info', label: 'loaded' }) : null,
        ]}),
        jsx('label', { htmlFor: 'dockyard-view-name', children: 'Name' }),
        jsx('input', { id: 'dockyard-view-name', value: name, onChange: (event) => setName(event.target.value) }),
        jsx('label', { htmlFor: 'dockyard-view-layout', children: 'Layout' }),
        jsx('select', { id: 'dockyard-view-layout', value: layout, onChange: (event) => setLayout(event.target.value), children: [
          jsx('option', { value: 'board', children: 'Board' }, 'board'),
          jsx('option', { value: 'table', children: 'Table' }, 'table'),
          jsx('option', { value: 'timeline', children: 'Timeline' }, 'timeline'),
        ]}),
        jsx('label', { htmlFor: 'dockyard-view-status', children: 'Status filter' }),
        jsx('select', { id: 'dockyard-view-status', value: statusFilter, onChange: (event) => setStatusFilter(event.target.value), children: [
          jsx('option', { value: 'backlog', children: 'Backlog' }, 'backlog'),
          jsx('option', { value: 'in_progress', children: 'In progress' }, 'in_progress'),
          jsx('option', { value: 'in_review', children: 'In review' }, 'in_review'),
          jsx('option', { value: 'blocked', children: 'Blocked' }, 'blocked'),
          jsx('option', { value: 'done', children: 'Done' }, 'done'),
        ]}),
        recallNotice ? jsx('p', { className: 'dockyard-inline-error', role: 'alert', 'data-recall-notice': true, children: recallNotice }) : null,
        error ? jsx('p', { className: 'dockyard-inline-error', role: 'alert', children: error }) : null,
        jsxs('div', { className: 'dockyard-form-actions', children: [
          jsx(Button, { action: 'save-view', variant: 'primary', disabled: saving || deleting || !name.trim(), onClick: save, children: saving ? 'Saving...' : selectedView ? 'Save view' : 'Create view' }),
          selectedView ? jsx(Button, { action: 'delete-view', disabled: saving || deleting, onClick: () => setDeleteConfirm(true), children: deleting ? 'Deleting...' : 'Delete view' }) : null,
          selectedView ? jsx(Button, { onClick: () => { setSelectedView(null); setName(''); setLayout('board'); setStatusFilter('in_progress'); setError(null); setRecallNotice(null) }, children: 'Clear' }) : null,
        ]}),
      ]}),
    ]}),
    overwriteConfirm ? jsx(ConfirmDialog, {
      confirmKey: 'overwrite-view',
      title: `Overwrite saved view ${name.trim()}?`,
      description: 'An existing saved view with this name will be replaced by the current layout and filters.',
      confirmLabel: 'Overwrite view',
      busy: saving,
      onCancel: () => setOverwriteConfirm(false),
      onConfirm: async () => { setOverwriteConfirm(false); await persist(name.trim()) },
    }) : null,
    deleteConfirm ? jsx(ConfirmDialog, {
      confirmKey: 'delete-view',
      title: `Delete saved view ${selectedView}?`,
      description: 'This removes the stored display preference for this project. Canonical work is not affected.',
      confirmLabel: 'Delete view',
      busy: deleting,
      onCancel: () => setDeleteConfirm(false),
      onConfirm: async () => { setDeleteConfirm(false); await remove() },
    }) : null,
  ]})
}
