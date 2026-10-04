// Backlog board render tree.
//
// Structure-only extraction from views/backlog.js. The markup below is moved
// verbatim; state and handlers arrive through ctx so this module stays
// presentation-only. Do not restyle or reorder children: rendered output must
// stay byte-identical to the pre-split plugin.
import { jsx, jsxs } from '../runtime/react.js'
import { readableLabel } from '../data/loaders.js'
import { api } from '../runtime/context.js'
import { Button, EmptyState, GROUP_LABELS, Icon, number, PageHead, plural } from '../lib/ui.js'
import { BacklogImportWizard } from './backlog-import-wizard.js'
import { BacklogReasonModal } from './backlog-reason-modal.js'
import { WorkItemDetail } from '../work-item/detail.js'

export function BacklogBoard(ctx) {
  const {
    NO_OWNER,
    unowned,
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
  } = ctx
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
    // Sahil 04/10 (demo feedback b): a gentle note, never a blocker. Work with
    // no owner is never picked up by a bot; each item opens so it can be given one.
    unowned.length ? jsxs('div', { className: 'dockyard-soft-alert', 'data-unowned-alert': project.id, role: 'status', children: [
      jsx(Icon, { name: 'user' }),
      jsxs('div', { className: 'dockyard-soft-alert-body', children: [
        jsx('strong', { children: `${number(unowned.length)} ${plural(unowned.length, 'work item')} ${unowned.length === 1 ? 'has' : 'have'} no owner, so no bot will pick ${unowned.length === 1 ? 'it' : 'them'} up.` }),
        jsxs('span', { className: 'dockyard-soft-alert-items', children: [
          ...unowned.slice(0, 5).map((item) => jsx('button', { type: 'button', className: 'dockyard-soft-alert-item', 'data-unowned-item': item.ref, onClick: () => setDetailItem(item), children: `${item.ref} ${item.title}` }, item.ref)),
          unowned.length > 5 ? jsx('span', { children: `and ${number(unowned.length - 5)} more` }, 'more') : null,
        ] }),
      ] }),
      hasUnassignedItems ? jsx(Button, { small: true, onClick: () => setColumnFilters((current) => ({ ...current, assignee: '__unassigned__' })), children: 'Show in the list' }) : null,
    ] }) : null,
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
            hasUnassignedItems ? jsx('option', { value: '__unassigned__', children: 'No owner' }, 'unassigned') : null,
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
                      jsx('option', { value: '', children: 'No owner' }),
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
            jsx('option', { value: '', children: 'Choose an assignee' }, 'choose'),
            jsx('option', { value: NO_OWNER, children: 'No owner' }, 'none'),
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
        createTouched.assignee && !createForm.assignee ? jsx('p', { className: 'create-help bad', 'data-create-help': 'assignee', children: 'Choose an assignee, or No owner.' }) : null,
        createForm.assignee === NO_OWNER ? jsx('p', { className: 'create-help', 'data-create-help': 'no-owner', children: 'No bot will pick this up until someone owns it.' }) : null,
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
