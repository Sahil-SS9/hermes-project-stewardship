// GENERATED-STRUCTURE: hand-edited Desktop module. Edit this file, then run
// node hermes_dockyard_plugin/desktop/build.mjs to regenerate plugin.js.
import { useState } from '../runtime/react.js'
import { useEffect } from '../runtime/react.js'
import { api } from '../runtime/context.js'
import { jsx } from '../runtime/react.js'
import { jsxs } from '../runtime/react.js'
import { Button } from '../lib/ui.js'
import { readableLabel } from '../data/loaders.js'
import { Icon } from '../lib/ui.js'
import { formatWhen } from '../lib/ui.js'
export function WorkItemDetail({ item, projectId, profiles, initiatives = [], onClose, onRefresh }) {
  const [draft, setDraft] = useState(null)
  const [detail, setDetail] = useState(null)
  // The project dashboard mounts this drawer with no selection; `item` is null until one is opened.
  const taskId = detail?.work_item?.id ?? item?.id ?? null
  const taskIdText = taskId === null || taskId === '' ? null : String(taskId)
  const [busy, setBusy] = useState(false)
  const [feedback, setFeedback] = useState(null)
  const [error, setError] = useState(null)
  const [depRef, setDepRef] = useState('')
  const [parentReason, setParentReason] = useState('')
  // Dirty-state guard: Escape / outside click with unsaved edits must ask,
  // not silently destroy the operator's work. Undo restores the canonical
  // baseline; Discard is explicit and separate. (isDirty is defined below,
  // after the baseline state it compares against.)
  const [confirmDiscard, setConfirmDiscard] = useState(false)
  // Canonical baseline (round-4 Residual B): fields are compared against this
  // refreshed record, not the stale inbox list item, so consecutive edits and
  // re-edits both reach the backend.
  const [baseline, setBaseline] = useState(null)
  const rebaseFromDetail = (result) => {
    if (!result) return null
    const current = result.work_item ?? {}
    const record = {
      title: current.title ?? '',
      type: current.type ?? 'task',
      assignee: current.assignee ?? '',
      status: current.status ?? 'backlog',
      body: current.body ?? '',
      labels: (current.labels ?? []).join(', '),
      estimate_days: current.estimate_days == null ? '' : String(current.estimate_days),
      due: current.due ?? '',
      // Canonical shape supplies parent_task_id; detail.parent.ref mirrors it.
      parent_ref: current.parent_task_id ?? result.parent?.ref ?? '',
      initiative_ref: current.initiative_ref ?? '',
      evidence_refs: (current.evidence_refs ?? []).join(', '),
      labels_raw: current.labels ?? [],
      estimate_raw: current.estimate_days ?? null,
      evidence_raw: current.evidence_refs ?? [],
    }
    setBaseline(record)
    return record
  }
  // isDirty + undoChanges live here, after baseline/draft state exist.
  const isDirty = Boolean(draft && baseline && (
    draft.title !== baseline.title || draft.type !== baseline.type ||
    draft.body !== (baseline.body ?? '') || draft.labels !== baseline.labels ||
    draft.estimate_days !== baseline.estimate_days || draft.due !== baseline.due ||
    draft.parent_ref !== baseline.parent_ref || draft.initiative_ref !== baseline.initiative_ref || draft.evidence_refs !== baseline.evidence_refs ||
    (draft.assignee ?? '') !== (baseline.assignee ?? '') || draft.status !== baseline.status))
  const undoChanges = () => { if (baseline) { setDraft({ ...baseline }); setParentReason(''); setConfirmDiscard(false); setError(null) } }
  useEffect(() => {
    if (!item) {
      setDraft(null)
      setDetail(null)
      setBaseline(null)
      setFeedback(null)
      setError(null)
      return
    }
    // Optimistic baseline from the list item so the drawer opens instantly;
    // the canonical fetch below rebases it.
    setDraft({
      title: item.title ?? '', type: item.type ?? 'task',
      assignee: item.assignee ?? '', status: item.status ?? 'backlog',
      body: item.body ?? '', labels: (item.labels ?? []).join(', '),
      estimate_days: item.estimate_days == null ? '' : String(item.estimate_days),
      due: item.due ?? '', parent_ref: item.parent_task_id ?? item.parent_ref ?? '',
      initiative_ref: item.initiative_ref ?? '',
      evidence_refs: (item.evidence_refs ?? []).join(', '),
    })
    setBaseline({
      title: item.title ?? '', type: item.type ?? 'task',
      assignee: item.assignee ?? '', status: item.status ?? 'backlog',
      body: item.body ?? '', labels: (item.labels ?? []).join(', '),
      estimate_days: item.estimate_days == null ? '' : String(item.estimate_days),
      due: item.due ?? '', parent_ref: item.parent_task_id ?? item.parent_ref ?? '',
      initiative_ref: item.initiative_ref ?? '',
      evidence_refs: (item.evidence_refs ?? []).join(', '),
      labels_raw: item.labels ?? [], estimate_raw: item.estimate_days ?? null,
      evidence_raw: item.evidence_refs ?? [],
    })
    setDetail(null)
    setParentReason('')
    setFeedback(null)
    setError(null)
  }, [item])
  useEffect(() => {
    if (!item) return undefined
    const closeOnEscape = (event) => {
      if (event.key !== 'Escape') return
      if (isDirty) { setConfirmDiscard(true); return }
      onClose()
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [item, onClose, isDirty])
  // Full supported-field detail (P5.3): canonical relationships, evidence and
  // history come from the existing work-item detail reader. Requests carry a
  // lifetime/identity guard (round-5 regression): an obsolete response — one
  // for an unmounted drawer, a different item, or a superseded load — must
  // never rebase the currently open drawer's draft.
  const loadDetail = (ref, guard) => {
    if (!item) return Promise.resolve(null)
    return api(`/projects/${encodeURIComponent(projectId || item.project_id)}/work-items/${encodeURIComponent(ref)}`)
      .then((result) => {
        if (guard && !guard.current.alive) return result
        setDetail(result)
        const record = rebaseFromDetail(result)
        // Rebase the draft onto canonical state, preserving any in-flight
        // text the owner is still typing only when no mutation just happened.
        if (record && !busy) setDraft((current) => (current ? { ...record } : current))
        return result
      })
      .catch((failure) => {
        if (!guard || guard.current.alive) { setDetail(null); setError(`Could not load item details: ${String(failure?.message ?? failure)}`) }
        return null
      })
  }
  useEffect(() => {
    if (!item) return undefined
    const guard = { current: { alive: true, ref: item.ref } }
    loadDetail(item.ref, guard)
    return () => {
      // Any response arriving after this cleanup is obsolete: the drawer now
      // shows a different item (effect re-ran) or is unmounted.
      guard.current.alive = false
    }
  }, [item?.ref, projectId])
  const save = async () => {
    if (!item || !draft) return
    setBusy(true)
    setError(null)
    setFeedback(null)
    const projectIdResolved = projectId || item.project_id
    const base = baseline ?? draft
    const changes = {}
    if (draft.title !== base.title) changes.title = draft.title
    if (draft.type !== base.type) changes.type = draft.type
    if (draft.body !== base.body) changes.body = draft.body || null
    // Actor identity rides only with a real field change: adding actor fields
    // unconditionally made the PATCH fire even for assign-only edits, which
    // aborts the save sequence before the /assign branch runs.
    const hasFieldChanges = () => Object.keys(changes).length > 0
    if (draft.labels !== base.labels) {
      changes.labels = draft.labels.split(',').map((v) => v.trim()).filter(Boolean)
    }
    const estimateValue = draft.estimate_days === '' ? null : Number(draft.estimate_days)
    if (estimateValue !== (base.estimate_days === '' ? null : Number(base.estimate_days))) {
      changes.estimate_days = estimateValue
    }
    if (draft.due !== base.due) changes.due = draft.due || null
    if (draft.parent_ref !== base.parent_ref) {
      if (parentReason.trim().length < 4) { setError('Changing the parent needs a reason of at least 4 characters.'); setBusy(false); return }
      changes.parent_ref = draft.parent_ref || null
      changes.reason = parentReason.trim()
    }
    if (draft.initiative_ref !== base.initiative_ref) changes.initiative_ref = draft.initiative_ref || null
    if (draft.evidence_refs !== base.evidence_refs) {
      changes.evidence_refs = draft.evidence_refs.split(',').map((v) => v.trim()).filter(Boolean)
    }
    try {
      if (hasFieldChanges()) {
        await api(`/projects/${encodeURIComponent(projectIdResolved)}/work-items/${encodeURIComponent(item.ref)}`, {
          method: 'PATCH',
          body: changes,
        })
      }
      if ((draft.assignee ?? '') !== (base.assignee ?? '')) {
        await api(`/projects/${encodeURIComponent(projectIdResolved)}/work-items/${encodeURIComponent(item.ref)}/assign`, {
          method: 'POST',
          body: { assignee_id: draft.assignee.trim() || null },
        })
      }
      if (draft.status !== base.status) {
        await api(`/projects/${encodeURIComponent(projectIdResolved)}/work-items/${encodeURIComponent(item.ref)}/transition`, {
          method: 'POST',
          body: { status: draft.status },
        })
      }
      // Rebase onto canonical state so the NEXT edit diffs against reality
      // (round-4 Residual B): a second edit back to the original must send
      // its own PATCH.
      await loadDetail(item.ref)
      setParentReason('')
      setFeedback('Saved.')
      await onRefresh?.()
    } catch (failure) {
      setError(String(failure?.message ?? failure))
    }
    setBusy(false)
  }
  const addDependency = async () => {
    if (!depRef.trim()) return
    setBusy(true)
    setError(null)
    try {
      await api(`/projects/${encodeURIComponent(projectId || item.project_id)}/work-items/${encodeURIComponent(item.ref)}/dependencies`, {
        method: 'POST', body: { dependency_ref: depRef.trim() },
      })
      setDepRef('')
      await loadDetail(item.ref)
      setFeedback('Dependency added.')
      await onRefresh?.()
    } catch (failure) {
      setError(String(failure?.message ?? failure))
    }
    setBusy(false)
  }
  // History filtering matches the approved reference: the timeline header
  // carries an 'All activity' dropdown; narrower scopes cut the list.
  const [historyFilter, setHistoryFilter] = useState('all')
  const [activityExpanded, setActivityExpanded] = useState(false)
  useEffect(() => { setHistoryFilter('all'); setActivityExpanded(false) }, [item?.ref])
  const historyEntries = (detail?.history ?? []).filter((entry) => {
    if (historyFilter === 'all') return true
    const action = String(entry.summary || entry.action || entry.kind || '').toLowerCase()
    if (historyFilter === 'status') return /status|transition|state/.test(action)
    if (historyFilter === 'assignee') return /assign/.test(action)
    if (historyFilter === 'fields') return !/status|transition|state|assign/.test(action)
    return true
  })
  const detailProject = detail?.project?.title || detail?.project?.name || item?.project_name || projectId
  // Approved reference: icon inside the field control, plus an explicit X
  // that clears the value (assignee, due date). Backend-supported only.
  const clearDue = () => { if (!busy && draft?.due) setDraft({ ...draft, due: '' }) }
  const clearAssignee = () => { if (!busy && draft?.assignee) setDraft({ ...draft, assignee: '' }) }
  return jsx('section', {
    className: 'dockyard-modal-layer',
    'data-work-item-detail-layer': true,
    hidden: !item,
    onClick: (event) => {
      if (event.target !== event.currentTarget) return
      if (isDirty) { setConfirmDiscard(true); return }
      onClose()
    },
    children: item ? jsxs('div', {
      className: 'dockyard-modal dockyard-create-modal dockyard-detail-modal',
      role: 'dialog',
      'aria-modal': true,
      'aria-labelledby': 'dockyard-work-item-title',
      'data-work-item-detail': item.ref,
      'data-dirty': isDirty ? 'true' : undefined,
      children: [
        jsxs('header', { className: 'dockyard-modal-head', children: [
          jsxs('div', { children: [
            jsx('span', { className: 'dockyard-create-eyebrow', children: `Work item · ${detailProject || projectId}` }),
            jsx('h2', { id: 'dockyard-work-item-title', children: 'Edit backlog item' }),
          ]}),
          jsx(Button, { action: 'close-work-item-detail', ariaLabel: 'Close work item details', onClick: () => { if (isDirty) { setConfirmDiscard(true) } else { onClose() } }, children: 'Close' }),
        ]}),
        confirmDiscard ? jsxs('div', { className: 'dockyard-dirty-confirm', role: 'alertdialog', 'aria-label': 'Unsaved changes', 'data-discard-confirm': true, children: [
          jsx('strong', { children: 'Discard unsaved changes?' }),
          jsx('p', { children: 'Your edits to this work item have not been saved. Choosing discard loses them; keep editing returns you to the form.' }),
          jsxs('div', { className: 'dockyard-modal-actions', children: [
            jsx(Button, { action: 'keep-editing', variant: 'primary', onClick: () => setConfirmDiscard(false), children: 'Keep editing' }),
            jsx(Button, { action: 'confirm-discard', onClick: () => { setConfirmDiscard(false); onClose() }, children: 'Discard changes' }),
          ]}),
        ] }) : null,
        jsxs('div', { className: 'dockyard-create-body dockyard-edit-body', children: [
          jsxs('div', { className: 'dockyard-create-context dockyard-edit-context', children: [
            jsx('span', { children: 'Status' }),
            jsx('span', { className: `dockyard-status-dot status-${draft?.status ?? 'backlog'}`, 'aria-hidden': true }),
            jsx('select', { 'aria-label': 'Status', value: draft?.status ?? 'backlog', onChange: (event) => setDraft({ ...draft, status: event.target.value }), children:
              ['backlog', 'in_progress', 'in_review', 'blocked', 'done'].map((status) => jsx('option', { value: status, children: readableLabel(status) }, status)),
            }),
            jsxs('span', { className: 'dockyard-detail-task-id', 'data-task-id': taskIdText ?? undefined, children: [
              jsx('span', { children: 'Task ID' }),
              jsx('code', { children: taskIdText ?? 'Unavailable' }),
            ]}),
            (detail?.work_item?.created_by || item.created_by) ? jsx('span', { children: `· Created by ${detail?.work_item?.created_by || item.created_by}` }) : null,
          ]}),
          jsxs('div', { className: 'dockyard-settings-grid dockyard-create-fields dockyard-edit-fields', children: [
            jsxs('label', { className: 'dockyard-field dockyard-field-wide field-required', children: [jsx('span', { children: 'Title' }), jsx('input', { 'aria-label': 'Title', value: draft?.title ?? '', onChange: (event) => setDraft({ ...draft, title: event.target.value }) })] }),
            jsxs('label', { className: 'dockyard-field dockyard-field-wide', children: [jsx('span', { children: 'Description (optional)' }), jsx('textarea', { 'aria-label': 'Body', rows: 3, placeholder: 'Describe the outcome and acceptance criteria…', value: draft?.body ?? '', onChange: (event) => setDraft({ ...draft, body: event.target.value }) })] }),
            jsxs('label', { className: 'dockyard-field', children: [jsx('span', { children: 'Parent (optional)' }), jsx('select', { 'aria-label': 'Parent', value: draft?.parent_ref ?? '', onChange: (event) => setDraft({ ...draft, parent_ref: event.target.value }), children: [
              jsx('option', { value: '', children: 'Top level' }, 'none'),
              ...(detail?.parent_choices ?? []).map((choice) => jsx('option', { value: choice.ref, children: `${choice.ref} · ${choice.title}` }, choice.ref)),
              draft?.parent_ref && !(detail?.parent_choices ?? []).some((choice) => choice.ref === draft.parent_ref) ? jsx('option', { value: draft.parent_ref, children: draft.parent_ref }, 'current-parent') : null,
            ] })] }),
            jsxs('label', { className: 'dockyard-field', children: [jsx('span', { children: 'Due date (optional)' }), jsx('input', { type: 'date', 'aria-label': 'Due date', value: draft?.due ?? '', onChange: (event) => setDraft({ ...draft, due: event.target.value }) })] }),
            draft && baseline && draft.parent_ref !== baseline.parent_ref ? jsxs('label', { className: 'dockyard-field dockyard-field-wide', children: [jsx('span', { children: 'Reason for changing parent *' }), jsx('input', { 'aria-label': 'Reason for changing parent', value: parentReason, placeholder: 'Required for the audit trail', onChange: (event) => setParentReason(event.target.value) })] }) : null,
            jsxs('label', { className: 'dockyard-field field-required', children: [jsx('span', { children: 'Type' }), jsx('select', { 'aria-label': 'Type', value: draft?.type ?? 'task', onChange: (event) => setDraft({ ...draft, type: event.target.value }), children:
              [...new Set([draft?.type || 'task', 'task', 'bug', 'spike', 'subtask', 'gate', 'feature'])].map((kind) => jsx('option', { value: kind, children: readableLabel(kind) }, kind)),
            })] }),
            jsxs('label', { className: 'dockyard-field', children: [jsx('span', { children: 'Estimated days (optional)' }), jsx('input', { type: 'number', min: 0, step: 0.5, 'aria-label': 'Estimated days', placeholder: 'e.g. 2.5', value: draft?.estimate_days ?? '', onChange: (event) => setDraft({ ...draft, estimate_days: event.target.value }) })] }),
            jsxs('label', { className: 'dockyard-field', children: [jsx('span', { children: 'Assignee (optional)' }), jsx('select', { 'aria-label': 'Assignee', value: draft?.assignee ?? '', disabled: busy, onChange: (event) => setDraft({ ...draft, assignee: event.target.value }), children: [
              jsx('option', { value: '', children: 'No owner' }, 'none'),
              ...(profiles ?? []).filter((profile) => profile.slug || profile.id || profile.name).map((profile) => { const value = profile.slug || profile.id || profile.name; return jsx('option', { value, disabled: profile.available === false && value !== draft?.assignee, children: profile.display_name || profile.name || value }, value) }),
              draft?.assignee && !(profiles ?? []).some((profile) => (profile.slug || profile.id || profile.name) === draft.assignee) ? jsx('option', { value: draft.assignee, children: `${draft.assignee} (current)` }, 'current-assignee') : null,
            ] })] }),
            jsxs('label', { className: 'dockyard-field', children: [jsx('span', { className: 'field-optional-hint', children: 'Initiative' }), jsx('select', { 'aria-label': 'Initiative', value: draft?.initiative_ref ?? '', onChange: (event) => setDraft({ ...draft, initiative_ref: event.target.value }), children: [
              jsx('option', { value: '', children: 'No initiative' }, 'none'),
              ...initiatives.map((initiative) => jsx('option', { value: initiative.ref, children: `${initiative.ref} / ${initiative.title}` }, initiative.ref)),
              draft?.initiative_ref && !initiatives.some((initiative) => initiative.ref === draft.initiative_ref) ? jsx('option', { value: draft.initiative_ref, children: `${draft.initiative_ref} (current)` }, 'current-initiative') : null,
            ] })] }),
            jsxs('label', { className: 'dockyard-field', children: [jsx('span', { children: 'Evidence refs (optional)' }), jsx('input', { 'aria-label': 'Evidence refs', placeholder: 'Comma-separated refs', value: draft?.evidence_refs ?? '', onChange: (event) => setDraft({ ...draft, evidence_refs: event.target.value }) })] }),
            jsxs('label', { className: 'dockyard-field', children: [jsx('span', { children: 'Labels (optional)' }), jsx('input', { 'aria-label': 'Labels', placeholder: 'Comma-separated labels', value: draft?.labels ?? '', onChange: (event) => setDraft({ ...draft, labels: event.target.value }) })] }),
            jsxs('div', { className: 'dockyard-edit-backlog-fields dockyard-field-wide', children: [
              jsxs('span', { children: ['Current rank: ', jsx('strong', { children: detail?.work_item?.priority_rank ?? item.priority_rank ?? 'Not ranked' })] }),
              jsxs('span', { children: ['Priority reason: ', jsx('strong', { children: detail?.work_item?.priority_reason || item.priority_reason || 'Not recorded' })] }),
              jsx('small', { children: 'Change rank from the backlog table; a new priority reason is required there.' }),
            ] }),
          ]}),
          detail ? jsxs('div', { className: 'dockyard-edit-dependencies', 'data-dependency-editor': true, children: [
            jsxs('strong', { children: ['Dependencies', ` · ${(detail.dependencies ?? []).length}`] }),
            (detail.dependencies ?? []).length ? jsx('ul', { children: detail.dependencies.map((dependency) => jsx('li', { children: `${dependency.ref} · ${dependency.title}` }, dependency.ref)) }) : jsx('span', { children: 'None recorded' }),
            jsx('input', { 'aria-label': 'Dependency task ref', placeholder: 'Task ref, e.g. HDY-4', value: depRef, onChange: (event) => setDepRef(event.target.value) }),
            jsx(Button, { action: 'add-dependency', variant: 'quiet', disabled: busy || !depRef.trim(), onClick: addDependency, children: 'Add' }),
          ] }) : null,
          error ? jsx('p', { className: 'dockyard-inline-error', role: 'alert', children: error }) : null,
        ]}),
        // Approved reference: the Activity timeline is a full-width section
        // below the field columns, with an 'All activity' scope dropdown.
        detail ? jsxs('section', { className: 'dockyard-detail-activity', 'data-work-history': true, 'aria-label': 'Task activity', children: [
          jsxs('div', { className: 'dockyard-detail-activity-head', children: [
            jsx('h3', { children: `Activity · ${historyEntries.length}` }),
            jsxs('div', { className: 'dockyard-activity-actions', children: [
              historyEntries.length > 2 ? jsx('button', { type: 'button', className: 'dockyard-activity-expand', 'aria-expanded': activityExpanded, onClick: () => setActivityExpanded(!activityExpanded), children: activityExpanded ? 'Show less' : `View all ${historyEntries.length}` }) : null,
              jsx('label', { className: 'dockyard-activity-scope', children: [
                jsxs('span', { className: 'dockyard-field-shell dockyard-activity-scope-shell', children: [
                  jsx(Icon, { name: 'filter' }),
                  jsx('select', { 'data-activity-scope': true, 'aria-label': 'Activity scope', value: historyFilter, onChange: (event) => { setHistoryFilter(event.target.value); setActivityExpanded(false) }, children: [
                    jsx('option', { value: 'all', children: 'All activity' }, 'all'),
                    jsx('option', { value: 'status', children: 'Status changes' }, 'status'),
                    jsx('option', { value: 'assignee', children: 'Assignment' }, 'assignee'),
                    jsx('option', { value: 'fields', children: 'Field edits' }, 'fields'),
                  ] }),
                ]}),
              ]}),
            ]}),
          ]}),
          detail === null ? jsx('p', { className: 'dockyard-meta', children: 'Loading recorded activity…' })
            : historyEntries.length
              ? jsx('ol', { className: 'dockyard-history-list', children:                 (activityExpanded ? historyEntries : historyEntries.slice(0, 2)).map((entry, index) => {
                  const rawAction = String(entry.summary || entry.action || entry.kind || 'workitem.updated')
                  const detail = entry.detail && typeof entry.detail === 'object' ? entry.detail : {}
                  const changes = Array.isArray(detail.changes) ? detail.changes : (
                    /transition/.test(rawAction) && Object.hasOwn(detail, 'from') ? [{ field: 'status', from: detail.from, to: detail.to }]
                    : /assigned/.test(rawAction) && Object.hasOwn(detail, 'from') ? [{ field: 'assignee', from: detail.from, to: detail.to }]
                    : /dependency_added/.test(rawAction) ? [{ field: 'dependencies', from: null, to: detail.dependency }]
                    : /dependency_removed/.test(rawAction) ? [{ field: 'dependencies', from: detail.dependency, to: null }]
                    : []
                  )
                  const action = /workitem\.updated/.test(rawAction) ? 'Updated fields'
                    : /workitem\.transition/.test(rawAction) ? 'Status changed'
                    : /workitem\.assigned/.test(rawAction) ? 'Assignee changed'
                    : /dependency_added/.test(rawAction) ? 'Dependency added'
                    : /dependency_removed/.test(rawAction) ? 'Dependency removed'
                    : rawAction.replace(/[._]/g, ' ')
                  const fieldNames = { title: 'Title', body: 'Description', type: 'Type', parent_ref: 'Parent', initiative_ref: 'Initiative', labels: 'Labels', evidence_refs: 'Evidence refs', estimate_days: 'Estimate', due: 'Due date', status: 'Status', assignee: 'Assignee', dependencies: 'Dependency' }
                  const valueText = (value, field) => Array.isArray(value) ? (value.length ? value.join(', ') : '—') : (value === null || value === undefined || value === '' ? '—' : (['status', 'type'].includes(field) ? readableLabel(value) : String(value)))
                  const actor = entry.actor_id || entry.actor || entry.verified_actor || 'Actor not recorded'
                  const at = entry.ts || entry.created_at || entry.at
                  return jsxs('li', { children: [
                    jsx('strong', { children: action }),
                    jsx('span', { children: `${actor}${at ? ` · ${formatWhen(at)}` : ''}` }),
                    changes.length ? jsx('ul', { className: 'dockyard-history-changes', children: changes.map((change, changeIndex) => jsxs('li', { className: 'dockyard-history-change', children: [
                      jsx('strong', { children: fieldNames[change.field] || readableLabel(change.field) }),
                      jsx('span', { className: 'dockyard-history-from', title: valueText(change.from, change.field), children: valueText(change.from, change.field) }),
                      jsx('span', { className: 'dockyard-history-arrow', 'aria-label': 'changed to', children: '→' }),
                      jsx('span', { className: 'dockyard-history-to', title: valueText(change.to, change.field), children: valueText(change.to, change.field) }),
                    ] }, `${change.field}-${changeIndex}`)) }) : null,
                    !changes.length && detail.fields?.length ? jsx('span', { className: 'dockyard-history-legacy', children: `Changed: ${detail.fields.map((field) => fieldNames[field] || readableLabel(field)).join(', ')} (previous value not recorded)` }) : null,
                    detail.reason ? jsx('span', { children: `Reason: ${detail.reason}` }) : null,
                  ] }, String(entry.id ?? index))
                }) })
              : jsx('p', { className: 'dockyard-meta', children: (detail?.history ?? []).length ? 'No entries match this scope.' : 'No recorded activity for this item yet.' }),
        ] }) : null,
        jsxs('div', { className: 'dockyard-form-actions dockyard-detail-footer', children: [
          // Approved reference: Cancel sits on the left; 'Unsaved changes' and
          // the primary Save sit on the right. Cancel discards via the same
          // guarded path as Escape (dirty edits ask first).
          jsx(Button, {
            action: 'cancel-work-item-detail', onClick: () => { if (isDirty) { setConfirmDiscard(true) } else { onClose() } },
            disabled: busy, children: 'Cancel',
          }),
          jsxs('span', { className: 'dockyard-detail-footer-right', children: [
            isDirty ? jsxs('span', { className: 'dockyard-edit-unsaved', role: 'status', 'data-dirty-banner': true, children: [
              jsx('span', { children: 'Unsaved changes' }),
              jsx(Button, { small: true, action: 'undo-work-item-changes', disabled: busy, onClick: undoChanges, children: 'Undo' }),
            ] }) : null,
            jsx(Button, {
              action: 'save-work-item', variant: 'primary', disabled: busy || !isDirty,
              onClick: save, children: busy ? 'Saving...' : 'Save changes',
            }),
            feedback ? jsx('span', { role: 'status', children: feedback }) : null,
          ]}),
        ]}),
      ],
    }) : null,
  })
}

export function ObjectiveEvidence({ objective, projectId, onSaved }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const evidence = objective.evidence || {}
  const state = objective.enabled === false ? 'not_applicable' : evidence.state || 'unknown'
  const save = async (event) => {
    event.preventDefault()
    const fields = new FormData(event.currentTarget)
    setBusy(true)
    setError(null)
    try {
      await api(`/projects/${encodeURIComponent(projectId)}/objectives/${objective.id}/assessment`, {
        method: 'POST', body: { passed: fields.get('result') === 'passed', evidence: [String(fields.get('evidence') || '')], detail: String(fields.get('detail') || ''), expires_at: fields.get('expiry') ? new Date(String(fields.get('expiry'))).toISOString() : null },
      })
      await onSaved()
    } catch (failure) { setError(String(failure?.message ?? failure)) }
    setBusy(false)
  }
  return jsxs('details', { 'data-objective-evidence': objective.id, children: [
    jsx('summary', { children: `Result: ${readableLabel(state)} · Evidence/history` }),
    jsx('p', { children: evidence.detail || 'Insufficient data: no recorded evidence.' }),
    jsx('p', { children: `Evidence age: ${evidence.evidence_age_seconds == null ? 'unavailable' : Math.floor(evidence.evidence_age_seconds) + ' seconds'} · Window: ${objective.window || '30d'} · Samples: ${evidence.sample_count || 0} · Pass rate: ${evidence.pass_rate == null ? 'insufficient data' : Math.round(evidence.pass_rate * 100) + '%'}` }),
    jsx('ul', { children: (evidence.history || []).map((sample, index) => jsx('li', { children: `${sample.recorded_at} · ${sample.state} · ${sample.verified_actor || sample.actor || sample.source_evidence?.source || 'objective evaluator'}${sample.source === 'evaluate-now' ? ' (Evaluate now)' : ''} · ${sample.detail || ''} · ${JSON.stringify(sample.evidence || sample.source_evidence || {})}` }, index)) }),
    objective.evaluator_type === 'manual' && objective.enabled !== false ? jsxs('form', { onSubmit: save, children: [
      jsxs('label', { children: ['Result ', jsx('select', { name: 'result', children: ['passed', 'failed'].map(value => jsx('option', { value, children: value }, value)) })] }),
      jsxs('label', { children: ['Evidence reference ', jsx('input', { name: 'evidence', required: true, maxLength: 500 })] }),
      jsxs('label', { children: ['Assessment note ', jsx('input', { name: 'detail', maxLength: 2000 })] }),
      jsxs('label', { children: ['Expires at (local time) ', jsx('input', { name: 'expiry', type: 'datetime-local' })] }),
      jsx('button', { type: 'submit', disabled: busy || !objective.can_record_assessment, children: busy ? 'Saving and verifying…' : 'Record human assessment' }),
      !objective.can_record_assessment ? jsx('p', { children: 'Read-only: a dedicated authenticated human principal is required to record assessments.' }) : null,
    ]}) : null,
    error ? jsx('p', { role: 'alert', children: error }) : null,
  ]})
}
