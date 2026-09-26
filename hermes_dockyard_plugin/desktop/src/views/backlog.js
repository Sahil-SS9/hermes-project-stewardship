// GENERATED-STRUCTURE: hand-edited Desktop module (large view; model helpers in backlog-model.js).
// Edit this file, then run
// node hermes_dockyard_plugin/desktop/build.mjs to regenerate plugin.js.
import { readableLabel } from '../data/loaders.js'
import { useState } from '../runtime/react.js'
import { useRef } from '../runtime/react.js'
import { useEffect } from '../runtime/react.js'
import { api } from '../runtime/context.js'
import { jsx } from '../runtime/react.js'
import { EmptyState } from '../lib/ui.js'
import { emitToast } from '../runtime/context.js'
import { Icon } from '../lib/ui.js'
import { jsxs } from '../runtime/react.js'
import { PageHead } from '../lib/ui.js'
import { number } from '../lib/ui.js'
import { Button } from '../lib/ui.js'
import { normaliseBulkImportText } from './bulk-import.js'
import { GROUP_LABELS } from '../lib/ui.js'
import { WorkItemDetail } from '../work-item/detail.js'
import { BacklogImportWizard } from './backlog-import-wizard.js'
import { BacklogReasonModal } from './backlog-reason-modal.js'
import {
  DOCKYARD_TYPE_NAMES,
  DOCKYARD_EDITABLE_TYPES,
  DOCKYARD_ROOT_TYPES,
  DOCKYARD_CREATE_CHILD_TYPES,
  DOCKYARD_ALLOWED_CHILDREN,
  dockyardTypeLabel,
  dockyardChildTypes,
  dockyardParentAccepts,
} from './backlog-model.js'
export {
  DOCKYARD_TYPE_NAMES,
  DOCKYARD_EDITABLE_TYPES,
  DOCKYARD_ROOT_TYPES,
  DOCKYARD_CREATE_CHILD_TYPES,
  DOCKYARD_ALLOWED_CHILDREN,
  dockyardTypeLabel,
  dockyardChildTypes,
  dockyardParentAccepts,
} from './backlog-model.js'

export function BacklogView({ view, onRefresh }) {
  const [draggedRef, setDraggedRef] = useState(null)
  const [pendingMove, setPendingMove] = useState(null)
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [createSaving, setCreateSaving] = useState(false)
  const [createError, setCreateError] = useState(null)
  const [createForm, setCreateForm] = useState({
    type: 'task', title: '', body: '', labels: '', evidence_refs: '', assignee: '', initiative: '', estimate_days: '', rank: '1', reason: '', parent: '', due: '',
  })
  const [createTouched, setCreateTouched] = useState({})
  const [bulkSelected, setBulkSelected] = useState([])
  // PROTOTYPE v4 local state
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState('rank')
  const [sortDir, setSortDir] = useState(1)
  const [groupBy, setGroupBy] = useState('none')
  const [columnFilters, setColumnFilters] = useState({ type: '', status: '', initiative: '', assignee: '' })
  const [hiddenCols, setHiddenCols] = useState([])
  const [cmMenu, setCmMenu] = useState(null)
  const [collapsed, setCollapsed] = useState([])
  const [menuRef, setMenuRef] = useState(null)
  const [editing, setEditing] = useState(null)
  const [cellError, setCellError] = useState(null)
  const [importOpen, setImportOpen] = useState(false)
  const [importStep, setImportStep] = useState(1)
  const [importText, setImportText] = useState('')
  const [importMode, setImportMode] = useState('csv')
  const [importRows, setImportRows] = useState(null)
  const [importValid, setImportValid] = useState(false)
  const [importError, setImportError] = useState(null)
  const [importBusy, setImportBusy] = useState(false)
  const [importResult, setImportResult] = useState(null)
  // Approved import design: selected preview row for the split pane and a
  // warnings-only filter toggle.
  const [importSelected, setImportSelected] = useState(null)
  const [importWarningsOnly, setImportWarningsOnly] = useState(false)
  const [importColumnMetadata, setImportColumnMetadata] = useState([])
  const [detailItem, setDetailItem] = useState(null)
  const project = view.project
  useEffect(() => {
    if (!importOpen) return undefined
    const onEscape = (event) => {
      if (event.key !== 'Escape' || importBusy) return
      setImportOpen(false)
      setImportStep(1)
      setImportRows(null)
      setImportValid(false)
      setImportError(null)
      setImportResult(null)
      document.querySelector('[data-action="open-bulk-import"]')?.focus()
    }
    document.addEventListener('keydown', onEscape)
    return () => document.removeEventListener('keydown', onEscape)
  }, [importOpen, importBusy])

  useEffect(() => {
    if (!importOpen) return undefined
    api(`/projects/${encodeURIComponent(project.id)}/backlog/import-template`).then((template) => {
      setImportColumnMetadata(Array.isArray(template?.column_metadata) ? template.column_metadata : [])
    }).catch(() => setImportColumnMetadata([]))
    return undefined
  }, [importOpen, project.id])

  useEffect(() => {
    const onKey = (event) => {
      if (event.key === 'Escape') { setCmMenu(null); setMenuRef(null) }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])
  // LANE-TOOLBAR: Sort/Group popovers close on any outside pointer press.
  useEffect(() => {
    if (!cmMenu) return undefined
    const onPointer = (event) => { if (!event.target?.closest?.('[data-cm-anchor]')) setCmMenu(null) }
    document.addEventListener('pointerdown', onPointer)
    return () => document.removeEventListener('pointerdown', onPointer)
  }, [cmMenu])
  const [bulkReplacement, setBulkReplacement] = useState('')
  const [bulkPreview, setBulkPreview] = useState(null)
  const [bulkOperation, setBulkOperation] = useState(null)
  const [bulkError, setBulkError] = useState(null)
  const [bulkBusy, setBulkBusy] = useState(false)
  useEffect(() => {
    if (!createOpen) return undefined
    const closeOnEscape = (event) => {
      if (event.key === 'Escape' && !createSaving) setCreateOpen(false)
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [createOpen, createSaving])
  if (!project) return jsx(EmptyState, { title: 'No project selected', description: 'Select a project before prioritising its backlog.', icon: 'project' })
  const canCreate = project.enabled !== false && project.phase === 'active'
  const workByRef = Object.fromEntries((view.workItems ?? []).map((item) => [item.ref, item]))
  const entries = [...(view.backlog ?? [])].sort((left, right) => Number(left.rank) - Number(right.rank))
  const requestMove = (entry, newRank) => {
    if (!entry || newRank < 1 || newRank > entries.length || newRank === Number(entry.rank)) return
    setPendingMove({ ref: entry.item_ref, newRank, title: workByRef[entry.item_ref]?.title || entry.item_ref })
    setReason('')
    setError(null)
  }
  // PROTOTYPE v4: tree + view engines (parent_ref read via demo proxy; prod wiring = Phase 4)
  const STATUS_LABELS = { backlog: 'Backlog', triage: 'Backlog', todo: 'Backlog', ready: 'Backlog', running: 'In progress', in_progress: 'In progress', review: 'In review', in_review: 'In review', blocked: 'Blocked', done: 'Done' }
  const STATUS_UI = { backlog: 'backlog', triage: 'backlog', todo: 'backlog', ready: 'backlog', running: 'in_progress', in_progress: 'in_progress', review: 'in_review', in_review: 'in_review', blocked: 'blocked', done: 'done' }
  const STATUS_OPTIONS = ['backlog', 'in_progress', 'in_review', 'blocked', 'done']
  const TYPE_NAMES = DOCKYARD_TYPE_NAMES
  const ROOT_TYPES = DOCKYARD_ROOT_TYPES
  const CHILD_TYPES = DOCKYARD_CREATE_CHILD_TYPES
  const typeLabel = dockyardTypeLabel
  const childTypesFor = dockyardChildTypes
  const parentAccepts = dockyardParentAccepts
  const todayISO = () => new Date().toISOString().slice(0, 10)
  const allItems = view.workItems ?? []
  const initiativeByRef = Object.fromEntries((view.initiatives ?? []).map((initiative) => [initiative.ref, initiative]))
  const botById = Object.fromEntries((view.bots ?? []).map((bot) => [bot.id, bot]))
  const initiativeLabel = (ref) => ref ? (initiativeByRef[ref]?.title || ref) : 'No initiative'
  const ownerLabel = (id) => id ? (botById[id]?.name || id) : 'Unassigned'
  const parentOf = {}
  const childrenOf = {}
  const allChildrenOf = {}
  const entrySet = new Set(entries.map((entry) => entry.item_ref))
  const parentRefOf = (item) => item?.parent_ref || item?.parent_task_id || item?.parent_id || ''
  for (const it of allItems) {
    const parentRef = parentRefOf(it)
    if (!parentRef || parentRef === it.ref) continue
    ;(allChildrenOf[parentRef] ||= []).push(it.ref)
    if (entrySet.has(it.ref) && entrySet.has(parentRef)) {
      parentOf[it.ref] = parentRef
      ;(childrenOf[parentRef] ||= []).push(it.ref)
    }
  }
  const rankOf = (ref) => { const e = entries.find((entry) => entry.item_ref === ref); return e ? Number(e.rank) : 1e9 }
  const collapsedSet = new Set(collapsed)
  const q = search.trim().toLowerCase()
  const typeFilterValues = [...new Set(entries.map((entry) => workByRef[entry.item_ref]?.type || 'task'))].sort((a, b) => typeLabel(a).localeCompare(typeLabel(b)))
  const statusFilterValues = [...new Set(entries.map((entry) => STATUS_UI[workByRef[entry.item_ref]?.status] || workByRef[entry.item_ref]?.status || 'backlog'))]
    .sort((a, b) => STATUS_OPTIONS.indexOf(a) - STATUS_OPTIONS.indexOf(b))
  const initiativeFilterValues = [...new Set(entries.map((entry) => workByRef[entry.item_ref]?.initiative_ref).filter(Boolean))]
    .sort((a, b) => initiativeLabel(a).localeCompare(initiativeLabel(b)))
  const assigneeFilterValues = [...new Set(entries.map((entry) => workByRef[entry.item_ref]?.assignee).filter(Boolean))]
    .sort((a, b) => ownerLabel(a).localeCompare(ownerLabel(b)))
  const hasUnassignedItems = entries.some((entry) => !workByRef[entry.item_ref]?.assignee)
  const activeFilterCount = Object.values(columnFilters).filter(Boolean).length
  const hasFilters = activeFilterCount > 0 || Boolean(q)
  const selfMatch = (ref) => {
    const it = workByRef[ref] ?? {}
    const statusValue = STATUS_UI[it.status] || it.status || 'backlog'
    const filterMatch = (!columnFilters.type || (it.type || 'task') === columnFilters.type)
      && (!columnFilters.status || statusValue === columnFilters.status)
      && (!columnFilters.initiative || (it.initiative_ref || '') === columnFilters.initiative)
      && (!columnFilters.assignee || (columnFilters.assignee === '__unassigned__' ? !it.assignee : it.assignee === columnFilters.assignee))
    if (!filterMatch) return false
    if (!q) return true
    const entry = entries.find((candidate) => candidate.item_ref === ref)
    return [it.title, it.body, ref, typeLabel(it.type), ownerLabel(it.assignee), STATUS_LABELS[it.status],
      initiativeLabel(it.initiative_ref), it.due, entry?.priority_reason].join(' ').toLowerCase().includes(q)
  }
  const branchMatch = (ref) => selfMatch(ref) || (childrenOf[ref] ?? []).some(branchMatch)
  const visibleTop = entries.map((entry) => entry.item_ref).filter((ref) => !parentOf[ref] && branchMatch(ref))
  const sortCmp = (a, b) => {
    const ia = workByRef[a] ?? {}, ib = workByRef[b] ?? {}
    const keyVal = (item, ref) => ({
      rank: rankOf(ref),
      type: typeLabel(item.type),
      title: String(item.title || ref),
      status: STATUS_LABELS[item.status] || readableLabel(item.status || 'backlog'),
      initiative: item.initiative_ref ? initiativeLabel(item.initiative_ref) : '\\uffff',
      assignee: item.assignee ? ownerLabel(item.assignee) : '\\uffff',
      age: entries.find((candidate) => candidate.item_ref === ref)?.aged_since || '9999-12-31',
      estimate: item.estimate_days !== null && item.estimate_days !== undefined && item.estimate_days !== '' && Number.isFinite(Number(item.estimate_days)) ? Number(item.estimate_days) : Number.POSITIVE_INFINITY,
      due: item.due || '9999-12-31',
    }[sortKey])
    const va = keyVal(ia, a), vb = keyVal(ib, b)
    const cmp = typeof va === 'number' && typeof vb === 'number'
      ? (va < vb ? -1 : va > vb ? 1 : 0)
      : String(va).localeCompare(String(vb), undefined, { numeric: true, sensitivity: 'base' })
    return cmp * sortDir
  }
  const treeRows = []
  ;(function build(refs, depth, prefixOpen) {
    refs.forEach((ref, idx) => {
      const last = idx === refs.length - 1
      const guides = depth === 0 ? [] : prefixOpen.map((open) => (open ? 'line' : 'blank')).concat([last ? 'elbow' : 'tee'])
      treeRows.push({ ref, depth, guides })
      const kids = (childrenOf[ref] ?? []).filter(branchMatch).sort(sortCmp)
      if (kids.length && !collapsedSet.has(ref)) build(kids, depth + 1, prefixOpen.concat([!last]))
    })
  })(visibleTop.slice().sort(sortCmp), 0, [])
  const groups = groupBy === 'none' ? [[null, treeRows]] : (() => {
    const map = new Map()
    for (const row of treeRows) {
      const it = workByRef[row.ref] ?? {}
      const key = groupBy === 'status' ? (STATUS_LABELS[it.status] || it.status || 'Unset')
        : groupBy === 'assignee' ? ownerLabel(it.assignee)
          : groupBy === 'initiative' ? initiativeLabel(it.initiative_ref)
            : groupBy === 'type' ? typeLabel(it.type)
              : String(it.due || 'No due date').slice(0, 7) || 'No due date'
      ;(map.get(key) || map.set(key, []).get(key)).push(row)
    }
    return [...map.entries()].sort((a, b) => String(a[0]).localeCompare(String(b[0])))
  })()
  const toggleCollapse = (ref) => setCollapsed((current) => current.includes(ref) ? current.filter((r) => r !== ref) : [...current, ref])
  const descendantsOf = (ref) => {
    const out = []
    const seen = new Set([ref])
    ;(function walk(current) {
      for (const childRef of allChildrenOf[current] ?? []) {
        if (seen.has(childRef)) continue
        seen.add(childRef)
        out.push(childRef)
        walk(childRef)
      }
    })(ref)
    return out
  }
  const reparentTargets = (ref) => {
    const item = workByRef[ref]
    const banned = new Set([ref, ...descendantsOf(ref)])
    return entries
      .map((entry) => workByRef[entry.item_ref])
      .filter((candidate) => candidate && !banned.has(candidate.ref) && parentAccepts(candidate.type, item?.type || 'task'))
  }
  const typeChoicesFor = (ref) => {
    const item = workByRef[ref]
    if (!item) return []
    if (item.type === 'epic' || !DOCKYARD_EDITABLE_TYPES.includes(item.type)) return [item.type]
    const parent = workByRef[parentRefOf(item)]
    const childRefs = allChildrenOf[ref] ?? []
    const choices = DOCKYARD_EDITABLE_TYPES.filter((candidate) =>
      (candidate !== 'subtask' || Boolean(parent))
      && (!parent || parentAccepts(parent.type, candidate))
      && childRefs.every((childRef) => parentAccepts(candidate, workByRef[childRef]?.type)))
    return choices.includes(item.type) ? choices : [item.type, ...choices]
  }
  const createTypesForParent = (parentRef) => parentRef ? childTypesFor(workByRef[parentRef]?.type) : ROOT_TYPES
  const createParentsForType = (type, excludeRef = '') => {
    const descendants = new Set(excludeRef ? descendantsOf(excludeRef) : [])
    return allItems.filter((candidate) => candidate.ref !== excludeRef && !descendants.has(candidate.ref)
      && parentAccepts(candidate.type, type))
  }
  const statusChoicesFor = (item) => STATUS_OPTIONS.filter((status) => item?.type !== 'epic' || status !== 'done')
  const flashCell = (ref, field, message) => { setCellError({ ref, field, message }) }
  const patchItem = async (ref, patch, okMessage) => {
    const item = workByRef[ref]
    if (!item) return
    try {
      await api(`/projects/${encodeURIComponent(project.id)}/work-items/${encodeURIComponent(ref)}`, { method: 'PATCH', body: patch })
      setCellError(null)
      emitToast('success', okMessage || `${item.title} updated.`)
      onRefresh()
    } catch (failure) {
      flashCell(ref, Object.keys(patch)[0], String(failure?.message ?? failure).replace(/^\d+:\s*/, '').slice(0, 120))
    }
  }
  const commitTitle = (ref, value) => {
    setEditing(null)
    const v = String(value || '').trim()
    if (v.length < 3) { flashCell(ref, 'title', 'Title must be at least 3 characters.'); return }
    if (v !== (workByRef[ref]?.title ?? '')) patchItem(ref, { title: v })
  }
  const commitRank = (entry, value) => {
    setEditing(null)
    const next = parseInt(value, 10)
    if (!Number.isInteger(next) || next < 1 || next > entries.length) { flashCell(entry.item_ref, 'rank', `Rank must be between 1 and ${entries.length}.`); return }
    if (next !== Number(entry.rank)) requestMove(entry, next)
  }
  const changeStatus = async (ref, nextStatus) => {
    const item = workByRef[ref]
    if (!item || nextStatus === item.status) return
    if ((item.type || 'task') === 'epic' && nextStatus === 'done') { flashCell(ref, 'status', 'Epics are completed through their children — close the sub-items first.'); return }
    try {
      await api(`/projects/${encodeURIComponent(project.id)}/work-items/${encodeURIComponent(ref)}/transition`, { method: 'POST', body: { status: nextStatus } })
      setCellError(null)
      emitToast('success', `${item.title} → ${STATUS_LABELS[nextStatus] || nextStatus}`)
      onRefresh()
    } catch (failure) {
      flashCell(ref, 'status', String(failure?.message ?? failure).replace(/^\d+:\s*/, '').slice(0, 130))
    }
  }
  const assignItem = async (ref, bot) => {
    const item = workByRef[ref]
    if (!item) return
    if ((item.type || 'task') === 'epic') { flashCell(ref, 'assignee', 'Epics are never assigned — assign one of its children instead.'); return }
    try {
      await api(`/projects/${encodeURIComponent(project.id)}/work-items/${encodeURIComponent(ref)}/assign`, { method: 'POST', body: { assignee_id: bot || null } })
      setCellError(null)
      emitToast('success', bot ? `${item.title} → ${bot}` : `${item.title} unassigned.`)
      onRefresh()
    } catch (failure) {
      flashCell(ref, 'assignee', String(failure?.message ?? failure).replace(/^\d+:\s*/, '').slice(0, 130))
    }
  }
  const changeType = (ref, nextType) => {
    const item = workByRef[ref]
    if (!item || nextType === item.type) return
    if (!typeChoicesFor(ref).includes(nextType)) {
      flashCell(ref, 'type', `Changing ${item.type} to ${nextType} is not valid for this item's parent and children.`)
      return
    }
    patchItem(ref, { type: nextType }, `${item.title} is now ${typeLabel(nextType)}.`)
  }
  const requestReparent = (ref) => {
    setMenuRef(null)
    setPendingMove({ ref, mode: 'parent', title: workByRef[ref]?.title || ref, parent_ref: parentRefOf(workByRef[ref]) || '' })
    setReason('')
    setError(null)
  }
  const saveParent = async () => {
    if (!pendingMove || !pendingParentChanged || reason.trim().length < 4) return
    setSaving(true)
    setError(null)
    try {
      const parent = pendingParentRef || null
      await api(`/projects/${encodeURIComponent(project.id)}/work-items/${encodeURIComponent(pendingMove.ref)}`, {
        method: 'PATCH', body: { parent_ref: parent, reason: reason.trim() },
      })
      const title = pendingMove.title
      setPendingMove(null)
      setReason('')
      emitToast('success', `${title} ${parent ? 'moved under ' + (workByRef[parent]?.title || parent) : 'moved to top level'} (audit recorded).`)
      onRefresh()
    } catch (failure) {
      setError(String(failure?.message ?? failure))
    }
    setSaving(false)
  }
  const closeImport = () => { setImportOpen(false); setImportStep(1); setImportRows(null); setImportValid(false); setImportError(null); setImportResult(null); setImportSelected(null); setImportWarningsOnly(false) }
  const parseImport = (advance) => {
    setImportError(null)
    setImportValid(false)
    const text = importText.trim()
    if (!text) { setImportError('Paste CSV lines or a JSON array first.'); setImportRows(null); return }
    // P6.7/P6.8: the shared backend validator is the single source of truth.
    // JSON paste is normalised to CSV rows here, then validated server-side;
    // the UI must not invent a second validation vocabulary.
    const normalised = normaliseBulkImportText(text, importMode)
    if (normalised.error) { setImportError(normalised.error); setImportRows(null); return }
    const csvText = normalised.csvText
    setImportBusy(true)
    api(`/projects/${encodeURIComponent(project.id)}/backlog/import`, {
      method: 'POST', body: { csv_text: csvText, apply: false },
    }).then((previewResult) => {
      setImportBusy(false)
      const preview = previewResult?.preview
      if (!preview) { setImportError('The import service returned no preview.'); setImportRows(null); return }
      const errorByRow = {}
      for (const problem of preview.errors ?? []) {
        const key = String(problem.row ?? '')
        ;(errorByRow[key] = errorByRow[key] ?? []).push(problem.error)
      }
      const parsed = (preview.rows ?? []).map((row, idx) => {
        const type = String(row.type ?? 'task').toLowerCase()
        const title = String(row.title ?? '').trim()
        const parent = String(row.parent_key ?? '').trim()
        const labels = String(row.labels ?? '').trim()
        const estimate = row.estimate_days == null || row.estimate_days === '' ? '' : String(row.estimate_days)
        const due = String(row.due ?? '').trim()
        const initiative = String(row.initiative_ref ?? '').trim()
        const rowKey = String(row.row_key ?? '').trim()
        const problems = [...(errorByRow[String(idx + 2)] ?? []), ...(errorByRow[String(row.row_key ?? '')] ?? [])]
        if (parent && type === 'epic') problems.push('epics are top level — parent must be empty')
        // Warnings are non-blocking (e.g. empty initiative_ref); errors block.
        const errors = problems.filter((problem) => !/can still be imported|warning/i.test(problem))
        const warnings = problems.filter((problem) => /can still be imported|warning/i.test(problem))
        return { idx, type, title, parent, labels, estimate, due, initiative, rowKey, assignee: String(row.owner ?? row.assignee ?? '').trim(), problems, errors, warnings, csv_text: csvText }
      })
      if (!parsed.length) { setImportError('No rows found in that input.'); setImportRows(null); return }
      if ((preview.errors ?? []).length && !parsed.some((row) => row.problems.length)) {
        setImportError((preview.errors ?? []).map((problem) => `Row ${problem.row}: ${problem.error}`).join('; '))
      }
      setImportRows(parsed)
      setImportValid(preview.valid === true && parsed.every((row) => !row.errors.length))
      if (advance) setImportStep(2)
    }).catch((bad) => {
      setImportBusy(false)
      setImportError(`Could not validate: ${String(bad?.message ?? bad).slice(0, 140)}`)
      setImportRows(null)
    })
  }
  const runImport = async () => {
    // Approved contract: warnings never block; only rows with errors do.
    const good = (importRows ?? []).filter((row) => !row.errors.length)
    if (!good.length || good.length !== importRows.length) return
    setImportBusy(true)
    try {
      // One shared-validator commit for the whole file: parent-first order,
      // cycle protection and idempotent row keys are enforced server-side.
      const result = await api(`/projects/${encodeURIComponent(project.id)}/backlog/import`, {
        method: 'POST', body: { csv_text: good[0].csv_text, apply: true },
      })
      setImportBusy(false)
      setImportResult({
        written: Number(result?.imported ?? 0),
        items: Array.isArray(result?.items) ? result.items : [],
        failed: (result?.preview?.errors ?? []).map((problem) => `row ${problem.row}: ${problem.error}`),
      })
      if (result?.preview?.valid === false) setImportError('The server rejected the import. Return to the source and correct the reported rows.')
      setImportStep(3)
      onRefresh()
    } catch (bad) {
      setImportBusy(false)
      // P6.9: partial failure stays visible; nothing is lost — preview state
      // is kept so the operator can fix rows and retry the same file.
      setImportError(`Import failed before commit: ${String(bad?.message ?? bad).slice(0, 140)}`)
    }
  }
  const saveMove = async () => {
    if (!pendingMove || !reason.trim()) return
    setSaving(true)
    setError(null)
    try {
      await api(`/projects/${encodeURIComponent(project.id)}/backlog/${encodeURIComponent(pendingMove.ref)}/rerank`, {
        method: 'POST', body: { new_rank: pendingMove.newRank, reason: reason.trim() },
      })
      setPendingMove(null)
      setReason('')
      onRefresh()
    } catch (failure) {
      setError(String(failure?.message ?? failure))
    }
    setSaving(false)
  }
  const updateCreate = (key, value) => {
    setCreateForm((current) => {
      const next = { ...current, [key]: value }
      if (key === 'parent') {
        const allowed = createTypesForParent(value)
        if (!allowed.includes(next.type)) next.type = allowed.includes('task') ? 'task' : (allowed[0] || 'task')
      } else if (key === 'type' && next.parent
        && !childTypesFor(workByRef[next.parent]?.type).includes(value)) {
        next.parent = ''
      }
      return next
    })
    setCreateTouched((current) => ({ ...current, [key]: true }))
  }
  const maxInitialRank = entries.length + 1
  const initialRank = Number(createForm.rank)
  const availableCreateTypes = createTypesForParent(createForm.parent)
  const availableCreateParents = createParentsForType(createForm.type)
  const estimateValid = createForm.estimate_days === ''
    || (Number.isFinite(Number(createForm.estimate_days)) && Number(createForm.estimate_days) >= 0)
  const createFieldError = (key) => {
    if (!createTouched[key]) return null
    if (key === 'title' && createForm.title.trim().length < 3) return 'At least 3 characters.'
    if (key === 'assignee' && !createForm.assignee) return 'Choose who picks this up.'
    if (key === 'reason' && createForm.reason.trim().length < 4) return 'A ranking reason is required (audit trail).'
    if (key === 'estimate_days' && !estimateValid) return 'Use a non-negative number of days.'
    if (key === 'type' && !availableCreateTypes.includes(createForm.type)) return 'Choose a supported type for this parent.'
    return null
  }
  const createValid = createForm.title.trim().length >= 3
    && Boolean(createForm.assignee)
    && Number.isInteger(initialRank)
    && initialRank >= 1
    && initialRank <= maxInitialRank
    && createForm.reason.trim().length >= 4
    && estimateValid
    && availableCreateTypes.includes(createForm.type)
    && (!createForm.parent || availableCreateParents.some((parent) => parent.ref === createForm.parent))
  const openCreate = (parentRef) => {
    if (!canCreate) return
    const parent = typeof parentRef === 'string' ? parentRef : ''
    const allowed = createTypesForParent(parent)
    if (parent && allowed.length === 0) return
    const type = allowed.includes('task') ? 'task' : (allowed[0] || 'task')
    setCreateForm({ type, title: '', body: '', labels: '', evidence_refs: '', assignee: '', initiative: '', estimate_days: '', rank: String(maxInitialRank), reason: '', parent, due: '' })
    setCreateTouched({})
    setCreateError(null)
    setCreateOpen(true)
  }
  const saveCreate = async () => {
    if (!createValid) return
    setCreateSaving(true)
    setCreateError(null)
    try {
      const body = {
        type: createForm.type,
        title: createForm.title.trim(),
        body: createForm.body.trim() || null,
        labels: createForm.labels.split(',').map((label) => label.trim()).filter(Boolean),
        evidence_refs: createForm.evidence_refs.split(',').map((ref) => ref.trim()).filter(Boolean),
        assignee_id: createForm.assignee,
        assignee_kind: 'bot',
        initiative_ref: createForm.initiative || null,
        parent_ref: createForm.parent || null,
        estimate_days: createForm.estimate_days === '' ? null : Number(createForm.estimate_days),
        due: createForm.due || null,
        rank: initialRank,
        reason: createForm.reason.trim(),
      }
      const created = await api(`/projects/${encodeURIComponent(project.id)}/backlog/items`, { method: 'POST', body })
      setCreateOpen(false)
      emitToast('success', `${created.ref || 'Work item'} created and added to the backlog.`)
      onRefresh()
    } catch (failure) {
      setCreateError(String(failure?.message ?? failure))
    }
    setCreateSaving(false)
  }
  const selectedItems = bulkSelected.map((ref) => workByRef[ref]).filter(Boolean)
  const bulkSource = selectedItems[0]?.assignee || ''
  const bulkSameSource = selectedItems.length > 0 && selectedItems.every((item) => item.assignee === bulkSource)
  const toggleBulk = (ref) => {
    setBulkSelected((current) => current.includes(ref) ? current.filter((item) => item !== ref) : [...current, ref])
    setBulkPreview(null); setBulkOperation(null); setBulkError(null)
  }
  const previewBulk = async () => {
    setBulkBusy(true); setBulkError(null); setBulkPreview(null)
    try {
      setBulkPreview(await api(`/projects/${encodeURIComponent(project.id)}/transfers/preview`, { method: 'POST', body: { from_profile: bulkSource, to_profile: bulkReplacement } }))
    } catch (failure) { setBulkError(String(failure?.message ?? failure)) }
    setBulkBusy(false)
  }
  const executeBulk = async () => {
    setBulkBusy(true); setBulkError(null)
    try {
      const result = await api(`/projects/${encodeURIComponent(project.id)}/reassignments`, { method: 'POST', body: {
        from_profile: bulkSource, to_profile: bulkReplacement, fingerprint: bulkPreview.fingerprint,
        selected_ids: bulkSelected, idempotency_key: `desktop-bulk-${bulkPreview.fingerprint}-${bulkSelected.join('-')}`,
      } })
      setBulkOperation(await api(`/operations/${encodeURIComponent(result.op_id)}`))
      await onRefresh?.()
    } catch (failure) {
      setBulkPreview(null)
      setBulkError(`Preview is stale or reassignment failed: ${String(failure?.message ?? failure)}. Refresh the preview and retry.`)
    }
    setBulkBusy(false)
  }
  const retryBulk = async () => {
    setBulkBusy(true); setBulkError(null)
    try {
      await api(`/operations/${encodeURIComponent(bulkOperation.op_id)}/retry`, { method: 'POST', body: {} })
      setBulkOperation(await api(`/operations/${encodeURIComponent(bulkOperation.op_id)}`))
      await onRefresh?.()
    } catch (failure) { setBulkError(String(failure?.message ?? failure)) }
    setBulkBusy(false)
  }
  const previewEligible = new Set((bulkPreview?.eligible_items ?? []).map((item) => item.id))
  const selectedEligible = bulkSelected.length > 0 && bulkSelected.every((ref) => previewEligible.has(ref))
  const pendingParentItem = pendingMove?.mode === 'parent' ? workByRef[pendingMove.ref] : null
  const pendingCurrentParent = parentRefOf(pendingParentItem)
  const pendingParentRef = pendingMove?.parent_ref ?? pendingCurrentParent ?? ''
  const pendingParentChoices = pendingMove?.mode === 'parent' ? reparentTargets(pendingMove.ref) : []
  if (pendingCurrentParent && !pendingParentChoices.some((item) => item.ref === pendingCurrentParent) && workByRef[pendingCurrentParent]) {
    pendingParentChoices.unshift(workByRef[pendingCurrentParent])
  }
  const pendingParentChanged = Boolean(pendingMove?.mode === 'parent' && pendingParentRef !== pendingCurrentParent)
  const sortLabels = { rank: 'Rank', type: 'Type', title: 'Work item', status: 'Status', initiative: 'Initiative', assignee: 'Assignee', age: 'Age', estimate: 'Estimate', due: 'Due date' }
  const sortHeader = (key, label, className = '') => jsx('button', {
    type: 'button',
    className: `th-sort th-cell ${className}${sortKey === key ? ' active' : ''}`.trim(),
    'data-head-sort': key,
    'data-dir': sortKey === key && sortDir < 0 ? 'desc' : 'asc',
    onClick: () => { if (sortKey === key) setSortDir(-sortDir); else { setSortKey(key); setSortDir(1) } },
    children: [label, jsx(Icon, { name: 'chevron-down' }, 'v4-chev')],
  })
  const resetFilters = () => { setSearch(''); setColumnFilters({ type: '', status: '', initiative: '', assignee: '' }) }
  const [transfers, setTransfers] = useState({})
  const transferProjectRef = useRef('')
  const transferRequestRef = useRef(0)
  useEffect(() => {
    transferProjectRef.current = project.id
    const requestId = ++transferRequestRef.current
    setTransfers({})
    let live = true
    api(`/projects/${encodeURIComponent(project.id)}/transfers/pending`).then((result) => {
      if (!live || transferProjectRef.current !== project.id || transferRequestRef.current !== requestId) return
      const next = {}
      for (const operation of result?.operations ?? []) next[operation.op_id] = operation
      setTransfers(next)
    }).catch(() => {})
    return () => { live = false }
  }, [project.id])
  const showTransfer = (operation) => {
    if (!operation || operation.project_id !== project.id) return
    setTransfers((current) => ({ ...current, [operation.op_id]: operation }))
  }
  const removeTransfer = (opId) => setTransfers((current) => {
    const next = { ...current }
    delete next[opId]
    return next
  })
  const refreshTransfer = (opId) => {
    const requestProject = project.id
    api(`/operations/${opId}`).then((operation) => {
      if (requestProject !== project.id) return
      if (operation?.project_id !== requestProject) return
      if (operation?.state === 'completed') removeTransfer(opId)
      else showTransfer(operation)
    }).catch(() => {})
  }
  const retryTransfer = (opId) => {
    const requestProject = project.id
    api(`/operations/${opId}/retry`, { method: 'POST' }).then((operation) => {
      if (requestProject !== project.id) return
      if (operation?.project_id !== requestProject) return
      if (operation?.state === 'completed') removeTransfer(opId)
      else showTransfer(operation)
    }).catch(() => {})
  }
  return jsxs('div', { 'data-backlog-board': project.id, children: [
    jsx(PageHead, {
      title: 'Backlog',
      description: 'One ranked queue for what should happen next.',
      status: `${number(entries.length)} ranked`,
      onRefresh,
    }),
    jsxs('div', { className: 'dockyard-project-toolbar backlog-create-toolbar', children: [
      jsx('span', { className: 'dockyard-meta', children: `${project.name || project.id} / Work items` }),
      jsx(Button, { action: 'open-bulk-import', small: true, disabled: !canCreate, onClick: () => { setImportOpen(true); setImportRows(null); setImportValid(false); setImportError(null); setImportResult(null); setImportStep(1) }, children: 'Import' }),
      jsx(Button, { action: 'open-create-backlog-item', variant: 'primary', small: true, disabled: !canCreate, onClick: () => openCreate(), children: 'Create item' }),
    ]}),
    // PROTOTYPE v4: bulk reassignment now lives in the selection popover;
    // preview/execute/retry handlers unchanged.
    bulkError ? jsx('p', { className: 'dockyard-inline-error', role: 'alert', children: bulkError }) : null,
    bulkPreview ? jsxs('div', { className: 'dockyard-view-only-note', 'data-bulk-preview': bulkPreview.fingerprint, children: [
      jsx('strong', { children: `Preview · ${number(bulkPreview.enumerated_count)} items · fingerprint ${bulkPreview.fingerprint}` }),
      jsx('span', { children: `${(bulkPreview.eligible_items ?? []).length} eligible · ${(bulkPreview.excluded_items ?? []).length} excluded · confirm in the popover below` }),
      jsx('ul', { children: [...(bulkPreview.eligible_items ?? []), ...(bulkPreview.excluded_items ?? [])].map((item) => jsx('li', { children: `${item.id} · ${item.title || ''} · ${item.status} · ${item.reason || 'eligible'}` }, item.id)) }),
    ] }) : null,
    bulkOperation ? jsxs('div', { className: 'dockyard-view-only-note', 'data-bulk-operation': bulkOperation.op_id, role: 'status', children: [
      jsx('strong', { children: `${bulkOperation.op_id} · ${bulkOperation.state}` }),
      jsx('span', { children: `${(bulkOperation.items ?? []).filter((item) => item.outcome === 'completed').length} of ${(bulkOperation.items ?? []).length} completed · actor ${bulkOperation.actor || 'verified principal'}` }),
      jsx('ul', { children: (bulkOperation.items ?? []).map((item) => jsx('li', { children: `${item.item_id} · ${item.outcome} · ${item.audit?.actor || bulkOperation.actor || 'verified principal'} · ${item.audit?.action || 'audit pending'}${item.detail ? ` · ${item.detail}` : ''}` }, item.item_id)) }),
      bulkOperation.state !== 'completed' ? jsx(Button, { action: 'retry-bulk-reassignment', disabled: bulkBusy, small: true, onClick: retryBulk, children: 'Retry remaining items' }) : null,
    ] }) : null,
    Object.values(transfers).map((operation) => jsxs('div', { className: 'dockyard-view-only-note', 'data-transfer-operation': operation.op_id, role: 'status', children: [
      jsx('strong', { children: `${operation.op_id} · ${operation.state}` }),
      jsx('span', { children: `${(operation.items ?? []).length} items · project ${operation.project_id || project.id}` }),
      jsx('button', { type: 'button', 'data-transfer-refresh': operation.op_id, onClick: () => refreshTransfer(operation.op_id), children: 'Refresh' }),
      jsx('button', { type: 'button', 'data-transfer-retry': operation.op_id, onClick: () => retryTransfer(operation.op_id), children: 'Retry remaining items' }),
    ] }, operation.op_id)),
    entries.length > 0 ? jsxs('section', { className: 'dockyard-backlog-list', 'data-backlog-table': true, children: [
      !window.__V4_DISABLE?.has('cmdbar') ? jsxs('div', { className: 'dockyard-cmdbar', 'data-column-filters': true, children: [
        jsxs('label', { className: 'cm-search', children: [
          jsx(Icon, { name: 'search' }, 'v4-search'),
          jsx('input', { type: 'search', 'data-cm-search': true, 'aria-label': 'Search backlog', placeholder: 'Search backlog', value: search, onInput: (event) => setSearch(event.target.value) }),
        ] }),
        // LANE-TOOLBAR: icon-driven Sort/Group controls with floating popover menus.
        ...[
          ['sort', 'arrow-up-down', 'Sort', `${sortLabels[sortKey]} ${sortDir > 0 ? '↑' : '↓'}`, sortKey !== 'rank' || sortDir < 0,
            ['rank', 'type', 'title', 'status', 'initiative', 'assignee', 'age'].map((key) => [key, sortLabels[key], sortKey === key]),
            (key) => { if (sortKey === key) setSortDir(-sortDir); else { setSortKey(key); setSortDir(1) } }],
          ['group', 'layers', 'Group', GROUP_LABELS[groupBy], groupBy !== 'none',
            Object.entries(GROUP_LABELS).map(([key, label]) => [key, label, groupBy === key]),
            (key) => setGroupBy(key)],
        ].map(([menu, icon, label, value, modified, options, choose]) => jsxs('span', { className: 'cm-anchor', 'data-cm-anchor': menu, children: [
          jsxs('button', { type: 'button', className: `cm-icon-btn${modified ? ' is-modified' : ''}`, 'data-cm-menu-btn': menu, 'aria-haspopup': 'menu', 'aria-expanded': cmMenu === menu ? 'true' : 'false', 'aria-label': `${label}: ${value}`, title: `${label}: ${value}`,
            onClick: (event) => { event.stopPropagation(); setCmMenu(cmMenu === menu ? null : menu) },
            onKeyDown: (event) => { if (event.key === 'ArrowDown') { event.preventDefault(); setCmMenu(menu) } },
            children: [jsx(Icon, { name: icon }, `${menu}-icon`), modified ? jsx('span', { className: 'cm-icon-dot', 'aria-hidden': true }, `${menu}-dot`) : null] }),
          cmMenu === menu ? jsxs('div', { className: 'cm-menu cm-popover', role: 'menu', 'aria-label': `${label} by`, 'data-cm-menu': menu, onClick: (event) => event.stopPropagation(),
            onKeyDown: (event) => {
              const items = [...event.currentTarget.querySelectorAll('[data-cm-option]')]
              const at = items.indexOf(document.activeElement)
              if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); items[(at + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length]?.focus() }
              else if (event.key === 'Home') { event.preventDefault(); items[0]?.focus() }
              else if (event.key === 'End') { event.preventDefault(); items[items.length - 1]?.focus() }
              else if (event.key === 'Tab') setCmMenu(null)
            },
            children: [
              jsx('div', { className: 'menu-label', children: `${label} by` }, 'label'),
              ...options.map(([key, optionLabel, active]) => jsxs('button', { type: 'button', role: 'menuitemradio', 'aria-checked': active ? 'true' : 'false', className: active ? 'is-active' : '', 'data-cm-option': `${menu}-${key}`, autoFocus: active,
                onClick: () => { choose(key); setCmMenu(null); document.querySelector(`[data-cm-menu-btn="${menu}"]`)?.focus() },
                children: [
                  jsx('span', { className: 'cm-check', children: active ? jsx(Icon, { name: 'check' }) : null }, 'check'),
                  jsx('span', { className: 'cm-option-label', children: optionLabel }, 'label'),
                  menu === 'sort' && active ? jsx('span', { className: 'cm-dir', title: sortDir > 0 ? 'Ascending — select again to reverse' : 'Descending — select again to reverse', children: jsx(Icon, { name: sortDir > 0 ? 'arrow-up-narrow-wide' : 'arrow-down-wide-narrow' }) }, 'dir') : null,
                ] }, key)),
            ] }) : null,
        ] }, menu)),
        jsx('span', { className: 'cm-divider', 'aria-hidden': true }),
        jsxs('label', { className: 'cm-filter', children: [
          jsx('span', { children: 'Type' }),
          jsx('select', { 'data-filter-field': 'type', 'aria-label': 'Filter by type', value: columnFilters.type, onChange: (event) => setColumnFilters((current) => ({ ...current, type: event.target.value })), children: [
            jsx('option', { value: '', children: 'All types' }),
            ...typeFilterValues.map((type) => jsx('option', { value: type, children: typeLabel(type) }, type)),
          ] }),
        ] }),
        jsxs('label', { className: 'cm-filter', children: [
          jsx('span', { children: 'Status' }),
          jsx('select', { 'data-filter-field': 'status', 'aria-label': 'Filter by status', value: columnFilters.status, onChange: (event) => setColumnFilters((current) => ({ ...current, status: event.target.value })), children: [
            jsx('option', { value: '', children: 'All statuses' }),
            ...statusFilterValues.map((status) => jsx('option', { value: status, children: STATUS_LABELS[status] || readableLabel(status) }, status)),
          ] }),
        ] }),
        jsxs('label', { className: 'cm-filter', children: [
          jsx('span', { children: 'Initiative' }),
          jsx('select', { 'data-filter-field': 'initiative', 'aria-label': 'Filter by initiative', value: columnFilters.initiative, onChange: (event) => setColumnFilters((current) => ({ ...current, initiative: event.target.value })), children: [
            jsx('option', { value: '', children: 'All initiatives' }),
            ...initiativeFilterValues.map((ref) => jsx('option', { value: ref, children: initiativeLabel(ref) }, ref)),
          ] }),
        ] }),
        jsxs('label', { className: 'cm-filter', children: [
          jsx('span', { children: 'Assignee' }),
          jsx('select', { 'data-filter-field': 'assignee', 'aria-label': 'Filter by assignee', value: columnFilters.assignee, onChange: (event) => setColumnFilters((current) => ({ ...current, assignee: event.target.value })), children: [
            jsx('option', { value: '', children: 'All assignees' }),
            hasUnassignedItems ? jsx('option', { value: '__unassigned__', children: 'Unassigned' }, 'unassigned') : null,
            ...assigneeFilterValues.map((owner) => jsx('option', { value: owner, children: ownerLabel(owner) }, owner)),
          ] }),
        ] }),
        hasFilters ? jsx('button', { type: 'button', className: 'cm-reset-filters', 'data-clear-filters': true, onClick: resetFilters, children: 'Clear all' }) : null,
        jsx('span', { className: 'cm-count', 'data-cm-count': true, role: 'status', title: [
          `${number(treeRows.length)} of ${number(entries.length)} items`,
          q ? `search “${search}”` : '',
          activeFilterCount ? `${activeFilterCount} filter${activeFilterCount === 1 ? '' : 's'}` : '',
          sortKey !== 'rank' ? `sorted by ${sortLabels[sortKey]}` : '',
          groupBy !== 'none' ? `grouped by ${GROUP_LABELS[groupBy]}` : '',
        ].filter(Boolean).join(' · '), children: treeRows.length === entries.length ? `${number(entries.length)} items` : `${number(treeRows.length)} of ${number(entries.length)}` }),
      ] }) : null,
      !window.__V4_DISABLE?.has('head') ? jsxs('div', { className: 'tree-head', children: [
        jsx('span', { className: 'th-gutter' }),
        sortHeader('rank', 'Rank', 'th-rank'),
        sortHeader('type', 'Type', 'th-type'),
        sortHeader('title', 'Work item', 'th-title'),
        sortHeader('status', 'Status', 'th-status'),
        sortHeader('initiative', 'Initiative', 'th-initiative'),
        sortHeader('assignee', 'Assignee', 'th-who'),
        sortHeader('age', 'Age', 'th-age'),
        jsx('span', { className: 'th-reason', children: 'Priority reason' }),
        jsx('span', { className: 'th-act', 'aria-label': 'Actions' }),
      ] }) : null,
      !window.__V4_DISABLE?.has('head') && treeRows.length === 0 ? jsxs('div', { className: 'tree-group-head', 'data-no-matches': true, children: [
        jsx('span', { children: hasFilters ? 'No items match the current search and filters.' : 'No backlog items to show.' }),
        hasFilters ? jsx('button', { type: 'button', className: 'cm-chip', onClick: resetFilters, children: 'Clear filters' }) : null,
      ] }) : null,
      ...(window.__V4_DISABLE?.has('rows') ? [] : groups.flatMap(([label, rows], gi) => [
        label !== null ? jsxs('div', { className: 'tree-group-head', children: [
          jsx('span', { children: label }),
          jsx('span', { className: 'grp-count', children: `· ${rows.length}` }),
        ] }, `grp-${String(label)}-${gi}`) : null,
        ...rows.map(({ ref, depth, guides }) => {
          const entry = entries.find((candidate) => candidate.item_ref === ref)
          const item = workByRef[ref] ?? { ref, title: ref, status: 'backlog', type: 'task' }
          const kids = (childrenOf[ref] ?? []).filter(branchMatch)
          const overdue = Boolean(item.due) && item.status !== 'done' && item.due < todayISO()
          const stUi = (item.status && STATUS_UI[item.status]) || item.status || 'backlog'
          const err = cellError && cellError.ref === ref ? cellError : null
          const cell = editing && editing.ref === ref ? editing.field : null
          const titleText = item.title || ref
          const validTypeChoices = typeChoicesFor(ref)
          const validStatusChoices = statusChoicesFor(item)
          const validParentChoices = reparentTargets(ref)
          const mayAddChild = canCreate && childTypesFor(item.type).length > 0
          const mayReparent = Boolean(validParentChoices.length || parentRefOf(item))
          const estimateDays = item.estimate_days !== null && item.estimate_days !== undefined && item.estimate_days !== ''
            ? Number(item.estimate_days) : null
          const { openDetails, openDetailsSoon, startTitleEdit } = (function () {
            // Shared per-row click timer: single click opens the detail drawer
            // after a short delay; a double click cancels it and switches to
            // inline title editing (JIRA-style). The timer id lives on the
            // row's closures via titleClickTimer.
            let titleClickTimer = null
            const cancelTitleTimer = () => { if (titleClickTimer) { clearTimeout(titleClickTimer); titleClickTimer = null } }
            var openDetails = (event) => { event.stopPropagation(); cancelTitleTimer(); setDetailItem(item) }
            var openDetailsSoon = (event) => { event.stopPropagation(); cancelTitleTimer(); titleClickTimer = setTimeout(() => { titleClickTimer = null; setDetailItem(item) }, 220) }
            var startTitleEdit = (event) => { event.stopPropagation(); cancelTitleTimer(); setEditing({ ref, field: 'title' }) }
            return { openDetails, openDetailsSoon, startTitleEdit, cancelTitleTimer }
          })()
          return jsxs('div', {
            onClick: (event) => { if (event.target.closest('button, input, select, a, [data-bulk-select], .tree-twisty, .drag-grip')) return; openDetails(event) },
            className: `dockyard-tree-row${draggedRef === ref ? ' tree-dragging' : ''}`, role: 'treeitem', 'aria-level': depth + 1,
            'aria-expanded': kids.length ? String(!collapsedSet.has(ref)) : undefined,
            'data-backlog-item': ref, 'data-tree-depth': depth,
            onDragOver: (event) => { if (draggedRef && depth === 0 && entry) { event.preventDefault(); event.currentTarget.classList.add('tree-drop') } },
            onDragLeave: (event) => event.currentTarget.classList.remove('tree-drop'),
            onDrop: (event) => {
              event.preventDefault(); event.currentTarget.classList.remove('tree-drop')
              if (!draggedRef || !entry) return
              const source = entries.find((candidate) => candidate.item_ref === draggedRef)
              if (source && draggedRef !== ref) requestMove(source, Number(entry.rank))
              setDraggedRef(null)
            },
            children: [
              jsxs('span', { className: 'tree-gutter', children: [
                ...guides.map((mode, idx) => jsx('span', { className: `tree-guide ${mode}`, 'aria-hidden': true }, `g${idx}`)),
                kids.length ? jsx('button', { type: 'button', className: 'tree-twisty', 'data-collapse-ref': ref, 'aria-expanded': String(!collapsedSet.has(ref)), 'aria-label': `${collapsedSet.has(ref) ? 'Expand' : 'Collapse'} ${kids.length} sub-item${kids.length === 1 ? '' : 's'}`, onClick: (event) => { event.stopPropagation(); toggleCollapse(ref) }, children: jsx(Icon, { name: 'chevron' }) }) : null,
                jsx('input', { type: 'checkbox', className: 'tree-check', 'data-bulk-select': ref, 'aria-label': `Select ${titleText}`, checked: bulkSelected.includes(ref), onClick: (event) => event.stopPropagation(), onChange: () => toggleBulk(ref) }),
              ] }),
              !hiddenCols.includes('rank') ? jsxs('span', { className: 'tree-rank', children: [
                depth === 0 ? jsx('span', { className: 'drag-grip', 'aria-hidden': true, draggable: true, onDragStart: (event) => { event.stopPropagation(); setDraggedRef(ref) }, children: '⠿' }) : null,
                entry ? (cell === 'rank'
                  ? jsx('input', { autoFocus: true, type: 'number', min: 1, max: entries.length, 'data-cell-input': 'rank', defaultValue: String(entry.rank), onKeyDown: (event) => { if (event.key === 'Enter') event.target.blur(); if (event.key === 'Escape') setEditing(null) }, onBlur: (event) => commitRank(entry, event.target.value) })
                  : jsx('button', { type: 'button', className: 'cell-edit cell-rank', 'data-cell': 'rank', onClick: (event) => { event.stopPropagation(); setEditing({ ref, field: 'rank' }) }, children: number(entry.rank) }))
                  : jsx('span', { children: '·' }),
              ] }) : null,
              jsxs('span', { className: 'tree-type-cell', title: `Type: ${typeLabel(item.type)}`, children: [
                jsx('span', { className: `tree-type ${TYPE_NAMES.includes(item.type) ? item.type : 'task'}`, 'aria-hidden': true, children: jsx(Icon, { name: `type-${TYPE_NAMES.includes(item.type) ? item.type : 'task'}` }) }),
                jsx('span', { children: typeLabel(item.type) }),
              ] }),
              jsxs('span', { className: 'tree-title', children: [
                cell === 'title'
                  ? jsxs('span', { className: 'cell-edit is-input', style: { display: 'inline-flex', alignItems: 'center', minWidth: 0, flex: 1 }, children: [
                      jsx('input', { autoFocus: true, className: 'cell-title-input', 'data-cell-input': 'title', defaultValue: item.title || '', onKeyDown: (event) => { if (event.key === 'Enter') { event.target.blur(); } if (event.key === 'Escape') { setEditing(null) } }, onBlur: (event) => commitTitle(ref, event.target.value) }),
                      err && err.field === 'title' ? jsx('span', { className: 'dockyard-inline-error', role: 'alert', 'data-cell-error': 'title', style: { fontSize: 10.5, padding: '1px 6px', whiteSpace: 'nowrap' }, children: err.message }) : null,
                    ] })
                  : jsxs('span', { style: { display: 'inline-flex', alignItems: 'center', gap: 8, minWidth: 0, flex: 1 }, children: [
                      jsxs('span', { className: 'tree-title-stack', children: [
                        jsxs('span', { className: 'tree-title-line', children: [
                          jsx('span', { className: 'tree-ref-chip', children: item.ref }),
                          jsx('button', {
                            type: 'button', className: 'cell-edit cell-title', 'data-cell': 'title', 'data-title-edit': ref,
                            title: 'Double-click to edit title inline · single-click opens details',
                            onDoubleClick: startTitleEdit,
                            onClick: openDetailsSoon, children: titleText,
                          }),
                          depth && parentOf[ref] ? jsx('span', { className: 'tree-parent', children: ` · in ${workByRef[parentOf[ref]]?.title || parentOf[ref]}` }) : null,
                        ] }),
                        item.body ? jsx('span', { className: 'tree-desc', children: String(item.body).replace(/\s+/g, ' ').slice(0, 90) }) : null,
                      ] }),
                      err && err.field === 'title' ? jsx('span', { className: 'dockyard-inline-error', role: 'alert', 'data-cell-error': 'title', style: { fontSize: 10.5, padding: '1px 6px', whiteSpace: 'nowrap' }, children: err.message }) : null,

                    ] }),
              ] }),

              jsxs('span', { className: 'tree-status', children: [
                cell === 'status'
                  ? jsx('select', { autoFocus: true, className: 'cell-edit is-input', 'data-cell-input': 'status', value: (item.status && STATUS_UI[item.status]) || 'backlog', onChange: (event) => { setEditing(null); changeStatus(ref, event.target.value) }, onBlur: () => setEditing(null), children: validStatusChoices.map((st) => jsx('option', { value: st, children: STATUS_LABELS[st] }, st)) })
                  : jsx('button', { type: 'button', className: `cell-edit cell-status tree-status ${stUi === 'done' ? 'success' : (overdue || stUi === 'blocked') ? 'danger' : stUi === 'in_progress' ? 'info' : stUi === 'in_review' ? 'warning' : 'neutral'}`, 'data-cell': 'status', title: 'Change status', onClick: (event) => { event.stopPropagation(); setEditing({ ref, field: 'status' }) }, children: [
                      jsx('span', { className: 'tree-status-icon', 'aria-hidden': true }),
                      jsx('span', { children: STATUS_LABELS[item.status] || 'Backlog' }),
                    ] }),
                err && err.field === 'status' ? jsx('span', { className: 'cell-due overdue', children: err.message }) : null,
              ] }),
              jsxs('span', { className: 'tree-initiative', title: item.initiative_ref ? `Initiative ${item.initiative_ref}` : 'No linked initiative', children: [
                item.initiative_ref
                  ? jsxs('span', { className: 'initiative-cell-value', children: [
                      jsx('strong', { children: initiativeLabel(item.initiative_ref) }),
                      jsx('small', { children: item.initiative_ref }),
                    ] })
                  : jsx('span', { className: 'initiative-cell-empty', children: '—' }),
              ] }),
              jsxs('span', { className: 'tree-who', children: [
                cell === 'assignee'
                  ? jsxs('select', { autoFocus: true, className: 'cell-edit is-input', 'data-cell-input': 'assignee', value: item.assignee || '', onChange: (event) => { setEditing(null); assignItem(ref, event.target.value) }, onBlur: () => setEditing(null), children: [
                      jsx('option', { value: '', children: 'Unassigned' }),
                      ...(view.bots ?? []).map((bot) => jsx('option', { value: bot.id, children: bot.name || bot.id }, bot.id)),
                    ] })
                  : jsx('button', { type: 'button', className: 'cell-edit cell-who', 'data-cell': 'assignee', title: (item.type === 'epic') ? 'Epics are never assigned — their children carry the work' : 'Change assignee', disabled: (item.type || 'task') === 'epic', onClick: (event) => { event.stopPropagation(); if ((item.type || 'task') === 'epic') { flashCell(ref, 'assignee', 'Epics are never assigned — assign one of its children instead.'); return } setEditing({ ref, field: 'assignee' }) }, children: [
                      item.assignee ? jsx('span', { className: 'tree-avatar', children: String(item.assignee).replace(/[^a-zA-Z]/g, '').slice(0, 2).toUpperCase() }) : jsx('span', { className: 'tree-avatar none', children: '—' }),
                      jsx('span', { className: 'who-name', children: ownerLabel(item.assignee) }),
                    ] }),
                err && err.field === 'assignee' ? jsx('span', { className: 'cell-due overdue', children: err.message }) : null,
              ] }),
              jsx('span', { className: 'tree-age', title: entry?.aged_since ? `Ranked since ${entry.aged_since}` : 'Rank date unavailable', children: entry?.aged_since ? `${Math.max(0, Math.floor((Date.now() - Date.parse(entry.aged_since)) / 86400000))}d` : '—' }),
              jsx('span', { className: 'tree-priority-reason', title: entry?.priority_reason || 'No priority reason recorded', children: entry?.priority_reason || 'No reason recorded' }),
              jsxs('span', { className: 'tree-actions', children: [
                jsx('button', { type: 'button', className: 'tree-menu-btn', 'data-menu-ref': ref, 'aria-expanded': String(menuRef === ref), 'aria-label': `Actions for ${titleText}`, onClick: (event) => { event.stopPropagation(); setMenuRef(menuRef === ref ? null : ref) }, children: '⋯' }),
              ] }),
              menuRef === ref ? jsxs('div', { className: 'tree-menu', role: 'menu', onClick: (event) => event.stopPropagation(), children: [
                jsx('div', { className: 'menu-label', children: 'Open' }),
                jsxs('button', { type: 'button', role: 'menuitem', 'data-menu-action': 'details', onClick: () => { setMenuRef(null); setDetailItem(item) }, children: [jsx(Icon, { name: 'pencil' }), 'Open task details'] }),
                validTypeChoices.length > 1 ? jsxs('label', { className: 'tree-menu-field', children: [
                  jsx('span', { children: 'Type' }),
                  jsx('select', { 'data-menu-type': ref, 'aria-label': `Change type for ${titleText}`, value: item.type, onChange: (event) => { setMenuRef(null); changeType(ref, event.target.value) }, children:
                    validTypeChoices.map((type) => jsx('option', { value: type, children: typeLabel(type) }, type)),
                  }),
                ] }) : jsx('div', { className: 'tree-menu-static', children: [jsx('span', { children: 'Type' }), jsx('strong', { children: typeLabel(item.type) })] }),
                mayAddChild || mayReparent || (depth === 0 && entry)
                  ? jsx('div', { className: 'menu-label', children: 'Structure' }) : null,
                mayAddChild ? jsxs('button', { type: 'button', role: 'menuitem', 'data-menu-action': 'add-child', onClick: () => { setMenuRef(null); openCreate(ref) }, children: [jsx(Icon, { name: 'type-subtask' }), 'Add child item'] }) : null,
                mayReparent ? jsxs('button', { type: 'button', role: 'menuitem', 'data-menu-action': 'reparent', onClick: () => requestReparent(ref), children: [jsx(Icon, { name: 'arrow-right' }), 'Change parent…'] }) : null,
                depth === 0 && entry ? jsxs('div', { className: 'tree-menu-rank-actions', children: [
                  jsx('div', { className: 'menu-label', children: 'Priority' }),
                  jsx('button', { type: 'button', role: 'menuitem', 'data-menu-action': 'up', disabled: Number(entry.rank) <= 1, onClick: () => { setMenuRef(null); requestMove(entry, Number(entry.rank) - 1) }, children: 'Move up' }),
                  jsx('button', { type: 'button', role: 'menuitem', 'data-menu-action': 'down', disabled: Number(entry.rank) >= entries.length, onClick: () => { setMenuRef(null); requestMove(entry, Number(entry.rank) + 1) }, children: 'Move down' }),
                ] }) : null,
                item.status !== 'done' && item.type !== 'epic' ? jsxs('div', { className: 'tree-menu-status-actions', children: [
                  jsx('div', { className: 'menu-label', children: 'Status' }),
                  jsx('button', { type: 'button', role: 'menuitem', 'data-menu-action': 'status-done', onClick: () => { setMenuRef(null); changeStatus(ref, 'done') }, children: 'Mark done' }),
                ] }) : null,
              ] }) : null,
            ],
          }, ref)
        }),
      ])),
      !window.__V4_DISABLE?.has('popover') && bulkSelected.length ? jsxs('div', { className: 'sel-pop', 'data-selection-popover': true, onClick: (event) => event.stopPropagation(), children: [
        jsx('span', { className: 'sel-count', children: `${bulkSelected.length} selected` }),
        jsx('span', { className: 'sel-sep' }),
        jsxs('select', { 'data-pop-target': true, 'aria-label': 'Bulk target', defaultValue: '', children: [
          jsx('option', { value: '', disabled: true, children: 'Act on selection…' }),
          ...(view.bots ?? []).map((bot) => jsxs('option', { value: `assign:${bot.id}`, children: [`Reassign all → ${bot.name || bot.id}`] }, `a-${bot.id}`)),
          ...STATUS_OPTIONS.map((st) => jsxs('option', { value: `status:${st}`, children: [`Set status → ${STATUS_LABELS[st]}`] }, `s-${st}`)),
        ], onChange: (event) => {
          const [op, value] = event.target.value.split(':')
          event.target.value = ''
          const refs = bulkSelected.slice()
          if (!op || !refs.length) return
          if (op === 'assign') {
            setBulkReplacement(value)
            setBulkSelected(refs)
            setBulkPreview(null); setBulkOperation(null)
            previewBulk()
            return
          }
          setBulkSelected([])
          refs.forEach((ref) => changeStatus(ref, value))
        } }),
        !bulkSameSource && bulkSelected.length > 0 ? jsx('span', { style: { fontSize: 11, color: 'var(--dy-warning)', padding: '0 6px' }, children: 'mixed current assignees' }) : null,
        bulkPreview ? jsxs('button', { type: 'button', 'data-pop-action': 'execute', disabled: bulkBusy || !selectedEligible, onClick: () => { executeBulk(); }, children: [`Confirm reassign (${(bulkPreview.eligible_items ?? []).length})`] }) : null,
        jsxs('button', { type: 'button', 'data-pop-action': 'clear', onClick: () => { setBulkSelected([]); setBulkPreview(null); setBulkOperation(null); setBulkError(null) }, children: ['Clear', jsx('span', { style: { opacity: .6 }, children: ' esc' })] }),
      ] }) : null,
    ] }) : (q ? jsx(EmptyState, { title: 'No matches', description: `Nothing in the backlog matches “${search}”. Clear the filter to see all items.`, icon: 'project', children: jsx(Button, { small: true, onClick: () => setSearch(''), children: 'Clear filter' }) }) : jsx(EmptyState, { title: 'No ranked backlog items', description: 'Work items appear here after they are added to the project backlog.', icon: 'project' })),
    detailItem ? jsx(WorkItemDetail, { item: detailItem, projectId: project.id, profiles: view.profiles ?? [], initiatives: view.initiatives ?? [], onClose: () => setDetailItem(null), onRefresh }) : null,
    !window.__V4_DISABLE?.has('wizard') ? jsx(BacklogImportWizard, {
      project, importOpen, importStep, importText, importMode, importRows, importValid, importError, importBusy, importResult, importSelected, importWarningsOnly, importColumnMetadata, setImportMode, setImportText, setImportRows, setImportValid, setImportError, setImportBusy, setImportStep, setImportSelected, closeImport, parseImport, runImport, api,
    }) : null,
    jsx(BacklogReasonModal, { pendingMove, reason, setReason, error, saving, pendingParentItem, pendingParentRef, pendingParentChoices, pendingParentChanged, saveParent, saveMove, setPendingMove, typeLabel }),
    jsxs('section', {
      className: 'dockyard-modal-layer',
      'data-create-backlog-layer': true,
      hidden: !createOpen,
      onClick: (event) => { if (event.target === event.currentTarget && !createSaving) setCreateOpen(false) },
      children: [
      jsxs('form', { className: 'dockyard-modal dockyard-create-modal', role: 'dialog', 'aria-modal': true, 'aria-labelledby': 'dockyard-create-title', 'data-create-backlog-item': true, onSubmit: (event) => { event.preventDefault(); saveCreate() }, children: [
        jsxs('header', { className: 'dockyard-modal-head', children: [
          jsxs('div', { children: [jsx('span', { className: 'dockyard-create-eyebrow', children: `New work item · ${project.id}` }), jsx('h2', { id: 'dockyard-create-title', children: 'Create backlog item' })] }),
          jsx(Button, { action: 'close-create-backlog-item', ariaLabel: 'Close create item dialog', disabled: createSaving, onClick: () => setCreateOpen(false), children: 'Close' }),
        ]}),
        jsxs('div', { className: 'dockyard-create-body', children: [
          jsxs('p', { className: 'dockyard-create-context', children: [jsx('span', { className: 'dockyard-status-dot status-backlog', 'aria-hidden': true }), 'Starts in Backlog · Sahil is recorded as creator'] }),
          jsxs('div', { className: 'dockyard-settings-grid dockyard-create-fields', children: [
          jsxs('label', { className: 'dockyard-field dockyard-field-wide field-required', children: [jsx('span', { children: 'Title' }), jsx('input', { 'data-create-field': 'title', value: createForm.title, onInput: (event) => updateCreate('title', event.target.value), onChange: (event) => updateCreate('title', event.target.value), placeholder: 'Describe the delivery outcome' })] }),
          jsxs('label', { className: 'dockyard-field dockyard-field-wide', children: [jsx('span', { children: 'Description (optional)' }), jsx('textarea', { rows: 3, 'data-create-field': 'body', value: createForm.body, onChange: (event) => updateCreate('body', event.target.value), placeholder: 'Describe the outcome and acceptance criteria…' })] }),
          jsxs('label', { className: 'dockyard-field', children: [jsx('span', { children: 'Parent (optional)' }), jsx('select', { 'data-create-field': 'parent', value: createForm.parent, onChange: (event) => updateCreate('parent', event.target.value), children: [
            ROOT_TYPES.includes(createForm.type) ? jsx('option', { value: '', children: 'Top level' }, 'none') : null,
            ...availableCreateParents.map((parent) => jsx('option', { value: parent.ref, children: `${parent.title || parent.ref} · ${typeLabel(parent.type)}` }, parent.ref)),
          ]})] }),
          jsxs('label', { className: 'dockyard-field', children: [jsx('span', { children: 'Due date (optional)' }), jsx('input', { type: 'date', 'data-create-field': 'due', value: createForm.due, onInput: (event) => updateCreate('due', event.target.value), onChange: (event) => updateCreate('due', event.target.value) })] }),
          jsxs('label', { className: 'dockyard-field field-required', children: [jsx('span', { children: 'Type' }), jsx('select', { 'data-create-field': 'type', value: createForm.type, onChange: (event) => updateCreate('type', event.target.value), children:
            availableCreateTypes.map((type) => jsx('option', { value: type, children: typeLabel(type) }, type)),
          })] }),
          jsxs('label', { className: 'dockyard-field', children: [jsx('span', { children: 'Estimated days (optional)' }), jsx('input', { type: 'number', min: 0, step: 0.5, 'data-create-field': 'estimate_days', value: createForm.estimate_days, onInput: (event) => updateCreate('estimate_days', event.target.value), onChange: (event) => updateCreate('estimate_days', event.target.value), placeholder: 'e.g. 2.5' })] }),
          jsxs('label', { className: 'dockyard-field field-required', children: [jsx('span', { children: 'Assignee' }), jsx('select', { 'data-create-field': 'assignee', value: createForm.assignee, onChange: (event) => updateCreate('assignee', event.target.value), children: [
            jsx('option', { value: '', children: 'Select a bot' }, 'none'),
            ...(view.bots ?? []).map((bot) => jsx('option', { value: bot.id, children: bot.name || bot.id }, bot.id)),
          ]})] }),
          jsxs('label', { className: 'dockyard-field', children: [jsx('span', { className: 'field-optional-hint', children: 'Initiative' }), jsx('select', { 'data-create-field': 'initiative', value: createForm.initiative, onChange: (event) => updateCreate('initiative', event.target.value), children: [
            jsx('option', { value: '', children: 'No initiative' }, 'none'),
            ...(view.initiatives ?? []).map((initiative) => jsx('option', { value: initiative.ref, children: `${initiative.ref} / ${initiative.title}` }, initiative.ref)),
          ]})] }),
          jsxs('label', { className: 'dockyard-field', children: [jsx('span', { children: 'Evidence refs (optional)' }), jsx('input', { 'data-create-field': 'evidence_refs', value: createForm.evidence_refs, onChange: (event) => updateCreate('evidence_refs', event.target.value), placeholder: 'Comma-separated refs' })] }),
          jsxs('label', { className: 'dockyard-field', children: [jsx('span', { children: 'Labels (optional)' }), jsx('input', { 'data-create-field': 'labels', value: createForm.labels, onChange: (event) => updateCreate('labels', event.target.value), placeholder: 'Comma-separated labels' })] }),
          jsxs('label', { className: 'dockyard-field field-required', children: [jsx('span', { children: 'Initial rank' }), jsx('input', { type: 'number', min: 1, max: maxInitialRank, 'data-create-field': 'rank', value: createForm.rank, onInput: (event) => updateCreate('rank', event.target.value), onChange: (event) => updateCreate('rank', event.target.value) })] }),
          jsxs('label', { className: 'dockyard-field dockyard-field-wide field-required', children: [jsx('span', { children: 'Priority reason' }), jsx('textarea', { rows: 3, 'data-create-field': 'reason', value: createForm.reason, onInput: (event) => updateCreate('reason', event.target.value), onChange: (event) => updateCreate('reason', event.target.value), placeholder: 'Why should this item hold this rank?' })] }),
        ]}),
        createTouched.title && createForm.title.trim().length < 3 ? jsx('p', { className: 'create-help bad', 'data-create-help': 'title', children: 'Title must be at least 3 characters.' }) : null,
        createTouched.assignee && !createForm.assignee ? jsx('p', { className: 'create-help bad', 'data-create-help': 'assignee', children: 'Every work item needs a bot assignee.' }) : null,
        createTouched.reason && createForm.reason.trim().length < 4 ? jsx('p', { className: 'create-help bad', 'data-create-help': 'reason', children: 'A ranking reason is required — it becomes the audit record.' }) : null,
        jsx('p', { className: 'create-help', 'data-create-reqnote': true, children: '* required. Initial rank and priority reason are recorded in the backlog audit trail.' }),
        createError ? jsx('p', { className: 'dockyard-inline-error', role: 'alert', children: createError }) : null,
        ]}),
        jsxs('div', { className: 'dockyard-modal-actions', children: [
          jsx(Button, { disabled: createSaving, onClick: () => setCreateOpen(false), children: 'Cancel' }),
          jsx(Button, { action: 'submit-create-backlog-item', variant: 'primary', disabled: createSaving || !createValid, onClick: saveCreate, children: createSaving ? 'Creating...' : 'Create and add' }),
        ]}),
      ]}),
    ]}),
  ]})
}

export const DOCKYARD_VIEW_TEST = Object.freeze({ name: 'BacklogView' })
