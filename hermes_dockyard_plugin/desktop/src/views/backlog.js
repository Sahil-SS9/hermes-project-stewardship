// GENERATED-STRUCTURE: hand-edited Desktop module (large view; model helpers in backlog-model.js).
// Edit this file, then run
// node hermes_dockyard_plugin/desktop/build.mjs to regenerate plugin.js.
import { readableLabel } from '../data/loaders.js'
import { unassignedWork } from '../data/loaders.js'
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
import { BacklogBoard } from './backlog-board.js'
import { Fragment } from '../runtime/react.js'
import { UnlinkedNotice } from '../lib/ui.js'
import { isUnlinked } from '../data/unlinked.js'
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

// The create form's assignee choice: a bot, or deliberately unassigned (Sahil 04/10).
const UNASSIGNED = '__unassigned__'

export function BacklogView({ view, onRefresh, preset }) {
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
  // Opened from the Dashboard's unassigned-work alert: show only unassigned work.
  useEffect(() => { if (preset?.kind === 'unassigned') setColumnFilters((current) => ({ ...current, assignee: '__unassigned__' })) }, [preset])
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
  // Work lives in Hermes: none can be created for an unlinked project.
  const canCreate = project.enabled !== false && project.phase === 'active' && !isUnlinked(project)
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
  // Sahil 04/10: open unassigned work is never picked up; the board says so.
  const unassigned = unassignedWork(allItems)
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
      emitToast('success', bot ? `${item.title} → ${bot}` : `${item.title} is now unassigned.`)
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
    if (key === 'assignee' && !createForm.assignee) return 'Choose an assignee, or Unassigned.'
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
        assignee_id: createForm.assignee === UNASSIGNED ? null : createForm.assignee,
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
  const board = BacklogBoard({
    UNASSIGNED,
    unassigned,
    ROOT_TYPES,
    STATUS_LABELS,
    STATUS_OPTIONS,
    STATUS_UI,
    TYPE_NAMES,
    activeFilterCount,
    assignItem,
    assigneeFilterValues,
    availableCreateParents,
    availableCreateTypes,
    branchMatch,
    bulkBusy,
    bulkError,
    bulkOperation,
    bulkPreview,
    bulkSameSource,
    bulkSelected,
    canCreate,
    cellError,
    changeStatus,
    changeType,
    childTypesFor,
    childrenOf,
    closeImport,
    cmMenu,
    collapsedSet,
    columnFilters,
    commitRank,
    commitTitle,
    createError,
    createForm,
    createOpen,
    createSaving,
    createTouched,
    createValid,
    detailItem,
    draggedRef,
    editing,
    entries,
    error,
    executeBulk,
    flashCell,
    groupBy,
    groups,
    hasFilters,
    hasUnassignedItems,
    hiddenCols,
    importBusy,
    importColumnMetadata,
    importError,
    importMode,
    importOpen,
    importResult,
    importRows,
    importSelected,
    importStep,
    importText,
    importValid,
    importWarningsOnly,
    initiativeFilterValues,
    initiativeLabel,
    maxInitialRank,
    menuRef,
    onRefresh,
    openCreate,
    ownerLabel,
    parentOf,
    parentRefOf,
    parseImport,
    pendingMove,
    pendingParentChanged,
    pendingParentChoices,
    pendingParentItem,
    pendingParentRef,
    previewBulk,
    project,
    q,
    reason,
    refreshTransfer,
    reparentTargets,
    requestMove,
    requestReparent,
    resetFilters,
    retryBulk,
    retryTransfer,
    runImport,
    saveCreate,
    saveMove,
    saveParent,
    saving,
    search,
    selectedEligible,
    setBulkError,
    setBulkOperation,
    setBulkPreview,
    setBulkReplacement,
    setBulkSelected,
    setCmMenu,
    setColumnFilters,
    setCreateOpen,
    setDetailItem,
    setDraggedRef,
    setEditing,
    setGroupBy,
    setImportBusy,
    setImportError,
    setImportMode,
    setImportOpen,
    setImportResult,
    setImportRows,
    setImportSelected,
    setImportStep,
    setImportText,
    setImportValid,
    setMenuRef,
    setPendingMove,
    setReason,
    setSearch,
    setSortDir,
    setSortKey,
    sortDir,
    sortHeader,
    sortKey,
    sortLabels,
    statusChoicesFor,
    statusFilterValues,
    todayISO,
    toggleBulk,
    toggleCollapse,
    transfers,
    treeRows,
    typeChoicesFor,
    typeFilterValues,
    typeLabel,
    updateCreate,
    view,
    workByRef,
  })
  // Hermes has no project for it: say so above the (empty) board.
  return isUnlinked(project)
    ? jsxs(Fragment, { children: [jsx(UnlinkedNotice, { projectId: project.id }, 'unlinked'), board] })
    : board
}

export const DOCKYARD_VIEW_TEST = Object.freeze({ name: 'BacklogView' })
