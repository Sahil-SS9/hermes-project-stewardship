// GENERATED-STRUCTURE: hand-edited Desktop module. Edit this file, then run
// node hermes_dockyard_plugin/desktop/build.mjs to regenerate plugin.js.
import { useState } from '../runtime/react.js'
import { api } from '../runtime/context.js'
import { jsxs } from '../runtime/react.js'
import { jsx } from '../runtime/react.js'
import { Button } from '../lib/ui.js'
import { StatusTag } from '../lib/ui.js'
import { emitToast } from '../runtime/context.js'
import { readableLabel } from '../data/loaders.js'
import { formatWhen } from '../lib/ui.js'
import { number } from '../lib/ui.js'
import { severityTone } from '../lib/ui.js'
import { ObjectiveEvidence } from '../work-item/detail.js'
import { ConfirmDialog } from '../lib/ui.js'
export function GoalsManager({ project, goals, objectives, onRefresh }) {
  const [rows, setRows] = useState(goals ?? [])
  const [editor, setEditor] = useState(null)
  const [form, setForm] = useState({ title: '', description: '', objective_ids: [] })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const encoded = encodeURIComponent(project.id)
  const start = (goal = null) => {
    setEditor(goal?.goal_id ?? 'new')
    setForm({
      title: goal?.title ?? '',
      description: goal?.description ?? '',
      objective_ids: [...(goal?.objective_ids ?? [])],
    })
    setError(null)
  }
  const toggleObjective = (objectiveId) => setForm((current) => ({
    ...current,
    objective_ids: current.objective_ids.includes(objectiveId)
      ? current.objective_ids.filter((value) => value !== objectiveId)
      : [...current.objective_ids, objectiveId],
  }))
  const save = async () => {
    if (!form.title.trim()) return
    setBusy(true); setError(null)
    try {
      const body = { ...form, title: form.title.trim(), description: form.description.trim() }
      const saved = editor === 'new'
        ? await api(`/projects/${encoded}/goals`, { method: 'POST', body })
        : await api(`/projects/${encoded}/goals/${encodeURIComponent(editor)}`, { method: 'PATCH', body })
      setRows((current) => editor === 'new'
        ? [...current, saved]
        : current.map((goal) => goal.goal_id === saved.goal_id ? saved : goal))
      setEditor(null)
      onRefresh?.()
    } catch (failure) { setError(String(failure?.message ?? failure)) }
    setBusy(false)
  }
  const move = async (goalId, direction) => {
    const active = rows.filter((goal) => !goal.archived_at).sort((a, b) => a.position - b.position)
    const index = active.findIndex((goal) => goal.goal_id === goalId)
    const target = index + direction
    if (index < 0 || target < 0 || target >= active.length) return
    const reordered = [...active]
    ;[reordered[index], reordered[target]] = [reordered[target], reordered[index]]
    setBusy(true); setError(null)
    try {
      const result = await api(`/projects/${encoded}/goals/order`, { method: 'PUT', body: { goal_ids: reordered.map((goal) => goal.goal_id) } })
      const archived = rows.filter((goal) => goal.archived_at)
      setRows([...(result.goals ?? []), ...archived])
      onRefresh?.()
    } catch (failure) { setError(String(failure?.message ?? failure)) }
    setBusy(false)
  }
  const lifecycle = async (goal, action) => {
    setBusy(true); setError(null)
    try {
      const saved = await api(`/projects/${encoded}/goals/${encodeURIComponent(goal.goal_id)}/${action}`, { method: 'POST', body: {} })
      setRows((current) => current.map((item) => item.goal_id === saved.goal_id ? saved : item))
      onRefresh?.()
    } catch (failure) { setError(String(failure?.message ?? failure)) }
    setBusy(false)
  }
  const objectiveName = (id) => objectives.find((item) => Number(item.id) === Number(id))?.name ?? `Objective ${id}`
  const active = rows.filter((goal) => !goal.archived_at).sort((a, b) => a.position - b.position)
  const archived = rows.filter((goal) => goal.archived_at)
  return jsxs('section', { className: 'dockyard-feature-card', 'data-goals-manager': true, children: [
    jsxs('div', { className: 'dockyard-section-head', children: [
      jsxs('div', { children: [jsx('span', { className: 'dockyard-card-label', children: 'GOALS' }), jsx('h2', { children: `${active.length} active` }), jsx('p', { children: 'Goals order outcomes. Objectives may stay unlinked.' })] }),
      jsx(Button, { action: 'add-goal', variant: 'primary', small: true, onClick: () => start(), children: 'Add goal' }),
    ]}),
    editor !== null ? jsxs('div', { className: 'dockyard-inline-editor', 'data-goal-editor': String(editor), children: [
      jsxs('label', { children: [jsx('span', { children: 'Title' }), jsx('input', { 'data-goal-field': 'title', value: form.title, onChange: (event) => setForm((current) => ({ ...current, title: event.target.value })) })] }),
      jsxs('label', { children: [jsx('span', { children: 'Description' }), jsx('textarea', { 'data-goal-field': 'description', rows: 3, value: form.description, onChange: (event) => setForm((current) => ({ ...current, description: event.target.value })) })] }),
      jsxs('fieldset', { 'data-goal-objectives': true, children: [
        jsx('legend', { children: 'Linked objectives (optional)' }),
        ...(objectives ?? []).map((objective) => jsxs('label', { children: [jsx('input', { type: 'checkbox', value: String(objective.id), checked: form.objective_ids.includes(Number(objective.id)), onChange: () => toggleObjective(Number(objective.id)) }), objective.name] }, String(objective.id))),
      ]}),
      jsxs('div', { className: 'dockyard-form-actions', children: [
        jsx(Button, { disabled: busy, onClick: () => setEditor(null), children: 'Cancel' }),
        jsx(Button, { action: 'save-goal', variant: 'primary', disabled: busy || !form.title.trim(), onClick: save, children: busy ? 'Saving...' : editor === 'new' ? 'Create goal' : 'Save goal' }),
      ]}),
    ]}) : null,
    jsx('div', { className: 'dockyard-objective-list', children: [...active, ...archived].map((goal, index) => jsxs('article', { 'data-goal-row': goal.goal_id, className: goal.archived_at ? 'archived' : '', children: [
      jsxs('div', { className: 'dockyard-objective-copy', children: [jsxs('span', { children: [jsx('strong', { children: goal.title }), jsx('small', { children: goal.description || 'No description supplied.' })] }), jsx(StatusTag, { tone: goal.archived_at ? 'neutral' : 'success', label: goal.archived_at ? 'Archived' : `Order ${goal.position + 1}` })] }),
      jsx('p', { children: goal.objective_ids?.length ? `Objectives: ${goal.objective_ids.map(objectiveName).join(', ')}` : 'No linked objectives.' }),
      jsxs('div', { className: 'dockyard-form-actions', children: goal.archived_at ? [
        jsx(Button, { action: 'restore-goal', small: true, disabled: busy, onClick: () => lifecycle(goal, 'restore'), children: 'Restore' }, 'restore'),
      ] : [
        jsx(Button, { action: 'move-goal-up', small: true, disabled: busy || index === 0, onClick: () => move(goal.goal_id, -1), children: 'Move up' }, 'up'),
        jsx(Button, { action: 'move-goal-down', small: true, disabled: busy || index === active.length - 1, onClick: () => move(goal.goal_id, 1), children: 'Move down' }, 'down'),
        jsx(Button, { action: 'edit-goal', small: true, disabled: busy, onClick: () => start(goal), children: 'Edit' }, 'edit'),
        jsx(Button, { action: 'archive-goal', small: true, disabled: busy, onClick: () => lifecycle(goal, 'archive'), children: 'Archive' }, 'archive'),
      ] }),
    ]}, goal.goal_id)) }),
    error ? jsx('p', { className: 'dockyard-inline-error', role: 'alert', children: error }) : null,
  ]})
}

export function ObjectivesPanel({ project, settings, objectives, goals, missionArchive, onRefresh }) {
  const [mission, setMission] = useState(settings?.mission ?? '')
  const [missionDraft, setMissionDraft] = useState(settings?.mission ?? '')
  const [missionEditing, setMissionEditing] = useState(false)
  const [history, setHistory] = useState(missionArchive ?? [])
  const [items, setItems] = useState(objectives ?? [])
  const [objectiveEditor, setObjectiveEditor] = useState(null)
  const [objectiveForm, setObjectiveForm] = useState({ name: '', description: '', target: '>=1', severity: 'medium' })
  const [pending, setPending] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  // Phase 4 / D6: per-objective "Evaluate now" results, keyed by objective id.
  const [evaluating, setEvaluating] = useState(null)
  const [evaluations, setEvaluations] = useState({})
  const encoded = encodeURIComponent(project.id)
  const startObjective = (objective = null) => {
    setObjectiveEditor(objective?.id ?? 'new')
    setObjectiveForm({
      name: objective?.name ?? '',
      description: objective?.description ?? '',
      target: objective?.target ?? '>=1',
      severity: objective?.severity ?? 'medium',
    })
    setError(null)
  }
  const saveMission = async () => {
    const clean = missionDraft.trim()
    if (!clean) return
    setBusy(true)
    setError(null)
    try {
      const result = await api(`/projects/${encoded}/settings`, { method: 'PATCH', body: { mission: clean } })
      setMission(result?.mission ?? clean)
      setMissionDraft(result?.mission ?? clean)
      setMissionEditing(false)
      onRefresh?.()
    } catch (failure) {
      setError(String(failure?.message ?? failure))
    }
    setBusy(false)
  }
  const saveObjective = async () => {
    if (!objectiveForm.name.trim() || !objectiveForm.target.trim()) return
    setBusy(true)
    setError(null)
    try {
      const body = {
        name: objectiveForm.name.trim(),
        description: objectiveForm.description.trim(),
        target: objectiveForm.target.trim(),
        severity: objectiveForm.severity,
      }
      if (objectiveEditor === 'new') {
        const created = await api(`/projects/${encoded}/objectives`, { method: 'POST', body: { ...body, evaluator_type: 'manual', window: '30d' } })
        setItems((current) => [...current, created])
      } else {
        const updated = await api(`/projects/${encoded}/objectives/${objectiveEditor}`, { method: 'PATCH', body })
        setItems((current) => current.map((item) => Number(item.id) === Number(objectiveEditor) ? updated : item))
      }
      setObjectiveEditor(null)
      onRefresh?.()
    } catch (failure) {
      setError(String(failure?.message ?? failure))
    }
    setBusy(false)
  }
  const evaluateNow = async (objective) => {
    // D6: evaluates ONLY the selected objective. Command/integration
    // objectives run their allowlisted evaluator; manual objectives are
    // re-derived from the latest recorded assessment (never auto-passed).
    setEvaluating(objective.id)
    setError(null)
    try {
      const result = await api(`/projects/${encoded}/objectives/${objective.id}/evaluate`, { method: 'POST' })
      setEvaluations((current) => ({ ...current, [objective.id]: result }))
      const refreshed = await api(`/projects/${encoded}/objectives`)
      setItems(refreshed.objectives || [])
      const state = result?.result?.state ?? 'unknown'
      emitToast(state === 'passed' ? 'success' : 'danger',
        `Evaluate now (${objective.name}): ${readableLabel(state, 'unknown')}.` +
        (state === 'unknown' ? ' No evidence was fabricated — the objective stays unproven.' : ''))
      onRefresh?.()
    } catch (failure) {
      setEvaluations((current) => ({ ...current, [objective.id]: { error: String(failure?.message ?? failure) } }))
    }
    setEvaluating(null)
  }
  const applyDestructive = async () => {
    if (!pending) return
    setBusy(true)
    setError(null)
    try {
      if (pending.type === 'archive-mission') {
        const archived = await api(`/projects/${encoded}/mission/archive`, { method: 'POST', body: {} })
        setHistory((current) => [archived, ...current])
        setMission('')
        setMissionDraft('')
        setMissionEditing(false)
      } else if (pending.type === 'remove-mission') {
        await api(`/projects/${encoded}/mission`, { method: 'DELETE', body: {} })
        setMission('')
        setMissionDraft('')
        setMissionEditing(false)
      } else if (pending.type === 'archive-objective') {
        const archived = await api(`/projects/${encoded}/objectives/${pending.id}/archive`, { method: 'POST', body: {} })
        setItems((current) => current.map((item) => Number(item.id) === Number(pending.id) ? archived : item))
      } else if (pending.type === 'remove-objective') {
        await api(`/projects/${encoded}/objectives/${pending.id}`, { method: 'DELETE', body: {} })
        setItems((current) => current.filter((item) => Number(item.id) !== Number(pending.id)))
      }
      setPending(null)
      onRefresh?.()
    } catch (failure) {
      setError(String(failure?.message ?? failure))
    }
    setBusy(false)
  }
  const confirmation = pending ? {
    'archive-mission': {
      key: 'archive-mission',
      title: 'Archive this mission?',
      description: 'The mission moves to history and is removed from the active project.',
      label: 'Archive mission',
    },
    'remove-mission': {
      key: 'remove-mission',
      title: 'Remove this mission?',
      description: 'The active mission is cleared without adding it to mission history.',
      label: 'Remove mission',
    },
    'archive-objective': {
      key: `archive-objective-${pending.id}`,
      title: 'Archive this objective?',
      description: 'The objective remains visible in history but stops participating in active evaluation.',
      label: 'Archive objective',
    },
    'remove-objective': {
      key: `remove-objective-${pending.id}`,
      title: 'Remove this objective?',
      description: 'This permanently removes the objective from the project.',
      label: 'Remove objective',
    },
  }[pending.type] : null
  return jsxs('div', { className: 'dockyard-objectives-layout', children: [
    jsx(GoalsManager, { project, goals, objectives: items, onRefresh }),
    jsxs('section', { className: 'dockyard-feature-card', 'data-mission-manager': true, children: [
      jsxs('div', { className: 'dockyard-section-head', children: [
        jsxs('div', { children: [jsx('span', { className: 'dockyard-card-label', children: 'MISSION' }), jsx('h2', { children: mission || 'No active mission' })] }),
        mission ? jsx(StatusTag, { tone: 'success', label: 'Active' }) : jsx(StatusTag, { tone: 'neutral', label: 'Not set' }),
      ]}),
      missionEditing ? jsxs('div', { className: 'dockyard-inline-editor', children: [
        jsx('label', { htmlFor: 'dockyard-mission-editor', children: 'Mission statement' }),
        jsx('textarea', { id: 'dockyard-mission-editor', 'data-mission-field': true, rows: 4, value: missionDraft, onInput: (event) => setMissionDraft(event.target.value), onChange: (event) => setMissionDraft(event.target.value) }),
        jsxs('div', { className: 'dockyard-form-actions', children: [
          jsx(Button, { disabled: busy, onClick: () => { setMissionDraft(mission); setMissionEditing(false) }, children: 'Cancel' }),
          jsx(Button, { action: 'save-mission', variant: 'primary', disabled: busy || !missionDraft.trim(), onClick: saveMission, children: busy ? 'Saving...' : 'Save mission' }),
        ]}),
      ]}) : jsxs('div', { className: 'dockyard-form-actions', children: [
        jsx(Button, { action: 'edit-mission', onClick: () => { setMissionDraft(mission); setMissionEditing(true) }, children: mission ? 'Edit mission' : 'Set mission' }),
        mission ? jsx(Button, { action: 'archive-mission', variant: 'danger', onClick: () => setPending({ type: 'archive-mission' }), children: 'Archive' }) : null,
        mission ? jsx(Button, { action: 'remove-mission', variant: 'danger', onClick: () => setPending({ type: 'remove-mission' }), children: 'Remove' }) : null,
      ]}),
      history.length > 0 ? jsxs('div', { className: 'dockyard-mission-history', children: [
        jsx('h3', { children: 'Mission history' }),
        history.map((entry) => jsxs('article', { children: [
          jsx('strong', { children: entry.mission }),
          jsx('span', { children: `Archived ${formatWhen(entry.archived_at) || 'previously'} by ${entry.archived_by || 'unknown'}` }),
        ]}, entry.archive_id)),
      ]}) : null,
    ]}),
    jsxs('section', { className: 'dockyard-feature-card', children: [
      jsxs('div', { className: 'dockyard-section-head', children: [
        jsxs('div', { children: [jsx('span', { className: 'dockyard-card-label', children: 'OBJECTIVES' }), jsx('h2', { children: `${number(items.filter((item) => item.enabled !== false).length)} active` })] }),
        jsx(Button, { action: 'add-objective', variant: 'primary', small: true, onClick: () => startObjective(), children: 'Add objective' }),
      ]}),
      objectiveEditor !== null ? jsxs('div', { className: 'dockyard-inline-editor', 'data-objective-editor': String(objectiveEditor), children: [
        jsxs('label', { children: [jsx('span', { children: 'Name' }), jsx('input', { 'data-objective-field': 'name', value: objectiveForm.name, onChange: (event) => setObjectiveForm((current) => ({ ...current, name: event.target.value })) })] }),
        jsxs('label', { children: [jsx('span', { children: 'Description' }), jsx('textarea', { 'data-objective-field': 'description', rows: 3, value: objectiveForm.description, onInput: (event) => setObjectiveForm((current) => ({ ...current, description: event.target.value })), onChange: (event) => setObjectiveForm((current) => ({ ...current, description: event.target.value })) })] }),
        jsxs('div', { className: 'dockyard-settings-grid', children: [
          jsxs('label', { className: 'dockyard-field', children: [jsx('span', { children: 'Target' }), jsx('input', { 'data-objective-field': 'target', value: objectiveForm.target, onChange: (event) => setObjectiveForm((current) => ({ ...current, target: event.target.value })) })] }),
          jsxs('label', { className: 'dockyard-field', children: [jsx('span', { children: 'Severity' }), jsx('select', { 'data-objective-field': 'severity', value: objectiveForm.severity, onChange: (event) => setObjectiveForm((current) => ({ ...current, severity: event.target.value })), children: ['info', 'low', 'medium', 'high'].map((value) => jsx('option', { value, children: readableLabel(value) }, value)) })] }),
        ]}),
        jsxs('div', { className: 'dockyard-form-actions', children: [
          jsx(Button, { disabled: busy, onClick: () => setObjectiveEditor(null), children: 'Cancel' }),
          jsx(Button, { action: 'save-objective', variant: 'primary', disabled: busy || !objectiveForm.name.trim() || !objectiveForm.target.trim(), onClick: saveObjective, children: busy ? 'Saving...' : objectiveEditor === 'new' ? 'Create objective' : 'Save objective' }),
        ]}),
      ]}) : null,
      items.length > 0 ? jsx('div', { className: 'dockyard-objective-list', children: items.map((objective) => jsxs('article', { 'data-objective-row': objective.id, className: objective.enabled === false ? 'archived' : '', children: [
        jsxs('div', { className: 'dockyard-objective-copy', children: [
          jsxs('span', { children: [jsx('strong', { children: objective.name }), jsx('small', { children: objective.description || 'No description supplied.' })] }),
          jsx(StatusTag, { tone: objective.enabled === false ? 'neutral' : severityTone(objective.severity), label: objective.enabled === false ? 'Archived' : readableLabel(objective.severity) }),
        ]}),
        jsx('p', { children: `Target ${objective.target} / ${readableLabel(objective.evaluator_type, 'Manual')} / ${objective.window || '30d'}` }),
        jsx(ObjectiveEvidence, { objective, projectId: project.id, onSaved: async () => { const refreshed = await api(`/projects/${encoded}/objectives`); setItems(refreshed.objectives || []); onRefresh?.() } }),
        jsxs('div', { className: 'dockyard-objective-evaluate', children: [
          jsx('button', { type: 'button', className: 'dockyard-button small', 'data-action': 'evaluate-objective', 'data-objective-id': objective.id, disabled: objective.enabled === false || evaluating === objective.id, onClick: () => evaluateNow(objective), children: evaluating === objective.id ? 'Evaluating...' : 'Evaluate now' }),
          jsx('span', { className: 'dockyard-meta', children: 'Evaluates this objective only. The full stewardship cycle is a separate action.' }),
        ]}),
        evaluations[objective.id]
          ? (evaluations[objective.id].error
              ? jsx('p', { className: 'dockyard-inline-error', role: 'alert', 'data-objective-evaluation': objective.id, children: evaluations[objective.id].error })
              : jsx('p', { className: 'dockyard-meta', 'data-objective-evaluation': objective.id, children: [
                  `Last evaluation: ${readableLabel(evaluations[objective.id].result?.state, 'unknown')}`,
                  evaluations[objective.id].result?.measured != null ? ` / measured ${evaluations[objective.id].result.measured}` : '',
                  evaluations[objective.id].result?.detail ? ` / ${evaluations[objective.id].result.detail}` : '',
                  evaluations[objective.id].recorded === false ? ' (no new evidence recorded)' : '',
                ].join('') }))
          : null,
        jsxs('div', { className: 'dockyard-form-actions', children: [
          objective.enabled !== false ? jsx('button', { type: 'button', className: 'dockyard-button small', 'data-action': 'edit-objective', 'data-objective-id': objective.id, onClick: () => startObjective(objective), children: 'Edit' }) : null,
          objective.enabled !== false ? jsx('button', { type: 'button', className: 'dockyard-button danger small', 'data-action': 'archive-objective', 'data-objective-id': objective.id, onClick: () => setPending({ type: 'archive-objective', id: objective.id }), children: 'Archive' }) : null,
          jsx('button', { type: 'button', className: 'dockyard-button danger small', 'data-action': 'remove-objective', 'data-objective-id': objective.id, onClick: () => setPending({ type: 'remove-objective', id: objective.id }), children: 'Remove' }),
        ]}),
      ]}, String(objective.id))) }) : jsx('p', { className: 'dockyard-meta', children: 'No objectives are configured.' }),
    ]}),
    error ? jsx('p', { className: 'dockyard-inline-error', role: 'alert', children: error }) : null,
    confirmation ? jsx(ConfirmDialog, { confirmKey: confirmation.key, title: confirmation.title, description: confirmation.description, confirmLabel: confirmation.label, busy, onConfirm: applyDestructive, onCancel: () => setPending(null) }) : null,
  ]})
}
