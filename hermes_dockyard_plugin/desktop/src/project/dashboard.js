// GENERATED-STRUCTURE: hand-edited Desktop module. Edit this file, then run
// node hermes_dockyard_plugin/desktop/build.mjs to regenerate plugin.js.
import { useState } from '../runtime/react.js'
import { useRef } from '../runtime/react.js'
import { useEffect } from '../runtime/react.js'
import { jsxs } from '../runtime/react.js'
import { jsx } from '../runtime/react.js'
import { Button } from '../lib/ui.js'
import { EmptyState } from '../lib/ui.js'
import { healthDetails } from '../lib/ui.js'
import { api } from '../runtime/context.js'
import { emitToast } from '../runtime/context.js'
import { Icon } from '../lib/ui.js'
import { readableLabel } from '../data/loaders.js'
import { number } from '../lib/ui.js'
import { plural } from '../lib/ui.js'
import { PlanningPanel } from '../project/workflows.js'
import { SavedViewsSection } from '../project/saved-views.js'
import { InitiativeView } from '../views/initiative.js'
import { ObjectivesPanel } from '../project/objectives.js'
import { PlanningCanvasPanel } from '../project/canvas.js'
import { ExecutableWorkflowsPanel } from '../project/workflows.js'
import { ProjectContentPanel } from '../project/content.js'
import { ProjectSettingsPanel } from '../project/panels.js'
import { ProjectReportsPanel } from '../project/panels.js'
import { Fragment } from '../runtime/react.js'
import { StatusTag } from '../lib/ui.js'
import { WorkBar } from '../views/dashboard.js'
import { InitiativeRevisionRow } from '../views/dashboard.js'
import { formatWhen } from '../lib/ui.js'
import { FirstAssessmentCard } from '../views/dashboard.js'
import { PageHead } from '../lib/ui.js'
import { WorkItemDetail } from '../work-item/detail.js'
export function ProjectDashboard({ view, onSelectProject, onRefresh, onProjectDirty, pendingWorkRef, onPendingWorkConsumed, notice, initialView }) {
  const [projectView, setProjectView] = useState(initialView || 'overview')
  // QA M-7: leaving the Planning view with unsaved board edits asks first.
  const [canvasDirty, setCanvasDirty] = useState(false)
  const [pendingView, setPendingView] = useState(null)
  const changeView = (key) => {
    if (key === projectView) return
    if (projectView === 'planning' && canvasDirty) { setPendingView(key); return }
    setProjectView(key)
  }
  const onCanvasDirty = (dirty) => { setCanvasDirty(dirty); onProjectDirty?.(dirty) }
  const [selectedWorkItem, setSelectedWorkItem] = useState(null)
  const [workNotice, setWorkNotice] = useState(null)
  // Phase 4: the applied saved view drives the Work board's contents and
  // layout until it is cleared. Recall never invents rows client-side: the
  // item list comes from the stored query run through the backend.
  const [appliedView, setAppliedView] = useState(null)
  const [draggedRef, setDraggedRef] = useState(null)
  const [moving, setMoving] = useState(false)
  const moveLock = useRef(false)
  const project = view.project
  // Tab-driven entry points (Objectives/Delivery/Work/Reports/Settings/
  // Workflows) focus the matching sub-view; manual sub-view clicks are free
  // afterwards because this effect only runs when the entry target changes.
  useEffect(() => {
    if (initialView) setProjectView(initialView)
  }, [initialView])
  // P6.4 (review R3): a deep link targeting an exact work ref opens that
  // ref's drawer on arrival (or surfaces an explicit notice when the ref is
  // not in this project's board data — never a silent substitute). Hooks run
  // unconditionally; the empty-project return happens after them.
  useEffect(() => {
    if (!pendingWorkRef || !project) return
    const target = (view.workItems ?? []).find((item) => item.ref === pendingWorkRef)
    setWorkNotice(target ? null : `Work item ${pendingWorkRef} is not in this project's board data.`)
    if (target) setProjectView('board')
    setSelectedWorkItem(target ?? null)
    onPendingWorkConsumed?.()
  }, [pendingWorkRef])
  if (!project && view.missingProject) {
    return jsxs('section', { className: 'dockyard-deep-link-miss', 'data-deep-link-miss': view.missingProject, children: [
      jsx('p', { className: 'dockyard-inline-error', role: 'alert', children: `Project ${view.missingProject} no longer exists or is not connected. Nothing was substituted.` }),
      jsx(Button, { onClick: () => onSelectProject?.((view.projects ?? [])[0]?.id ?? null), children: 'Back to fleet' }),
    ]})
  }
  if (!project) return jsx(EmptyState, { title: 'No project selected', description: 'Connect a project before opening the project dashboard.', icon: 'project' })
  const [healthTone, healthLabel] = healthDetails(project.health)
  const views = [
    ['overview', 'Overview'], ['board', 'Kanban'], ['objectives', 'Objectives'], ['planning', 'Planning'], ['workflows', 'Workflows'], ['content', 'Content'], ['activity', 'Activity'], ['initiative', 'Initiatives'], ['reports', 'Reports'], ['settings', 'Settings'],
  ]
  const columns = [
    ['backlog', 'Backlog', ['backlog']],
    ['active', 'In progress', ['in_progress', 'executing', 'active']],
    ['review', 'Review', ['in_review', 'review']],
    ['blocked', 'Blocked', ['blocked']],
    ['done', 'Done', ['done', 'complete', 'completed']],
    ['other', 'Other states', null],
  ]
  const projectOptions = view.projects ?? []
  const transitionStatus = async (ref, status) => {
    if (!project || !ref || !status || moveLock.current || !(view.workItems ?? []).some(item => item.ref === ref)) return
    moveLock.current = true
    setMoving(true)
    setDraggedRef(null)
    setWorkNotice(null)
    try {
      // The plugin proxy supplies configured DOCKYARD_ACTOR_ID attribution.
      await api(`/projects/${encodeURIComponent(project.id)}/work-items/${encodeURIComponent(ref)}/transition`, {
        method: 'POST', body: { status },
      })
      const readback = await api(`/projects/${encodeURIComponent(project.id)}/work-items`)
      if (!(readback.work_items ?? []).some(item => item.ref === ref && item.status === status)) throw new Error('Canonical readback did not confirm the requested status')
      if (appliedView) {
        const result = await api(`/projects/${encodeURIComponent(project.id)}/views/${encodeURIComponent(appliedView.name)}/items`)
        setAppliedView(current => current?.name === appliedView.name ? { ...current, items: result.items ?? [] } : current)
      }
      onRefresh?.()
      emitToast('success', `Work item moved to ${status.replaceAll('_', ' ')}.`)
    } catch (failure) {
      setWorkNotice(`Could not complete move or refresh: ${String(failure?.message ?? failure)}. Refresh to confirm the canonical state before retrying.`)
      onRefresh?.()
    } finally {
      moveLock.current = false
      setMoving(false)
    }
  }
  let panel
  if (projectView === 'board') {
    const boardItems = appliedView ? (appliedView.items ?? []) : (view.workItems ?? [])
    const layout = appliedView?.layout ?? 'board'
    panel = jsxs('div', { className: 'dockyard-board-wrap', 'data-applied-view': appliedView?.name ?? undefined, children: [
      appliedView ? jsxs('div', { className: 'dockyard-view-only-note', 'data-applied-view-note': appliedView.name, children: [
        jsx(Icon, { name: 'eye' }),
        jsx('span', { children: `Showing saved view "${appliedView.name}" (${readableLabel(layout, 'Board')} layout${layout === 'timeline' ? ' — timeline is not available on Desktop, showing board' : ''}). ${number(boardItems.length)} matching ${plural(boardItems.length, 'item')}.` }),
        jsx('button', { type: 'button', className: 'dockyard-button small', 'data-action': 'clear-applied-view', onClick: () => setAppliedView(null), children: 'Clear view' }),
      ]}) : jsxs('div', { className: 'dockyard-view-only-note', 'data-kanban-help': true, children: [
        jsx(Icon, { name: 'eye' }),
        jsx('span', { children: 'Drag an item to move it, or use its Move menu. The canonical work system validates every transition.' }),
      ]}),
      layout === 'table'
        ? jsxs('section', { className: 'dockyard-feature-card', children: [
            jsx('h2', { children: 'Work items' }),
            boardItems.length === 0
              ? jsx('p', { className: 'dockyard-meta', 'data-work-table-empty': true, children: 'No work items match this saved view.' })
              : jsxs('table', { className: 'dockyard-backlog-table', 'data-work-table': true, children: [
                  jsx('thead', { children: jsxs('tr', { children: ['Ref', 'Title', 'Type', 'Status', 'Assignee'].map((heading) => jsx('th', { children: heading }, heading)) }) }),
                  jsx('tbody', { children: boardItems.filter((item) => item.status !== 'archived').map((item) => jsxs('tr', { 'data-work-row': item.ref, children: [
                    jsx('td', { children: item.ref }),
                    jsx('td', { children: item.title }),
                    jsx('td', { children: item.type || 'task' }),
                    jsx('td', { children: item.status || 'unknown' }),
                    jsx('td', { children: item.assignee || 'Unassigned' }),
                  ]}, item.ref)) }),
                ]}),
          ]})
        : jsx('div', { className: 'dockyard-board', children:
            columns.map(([key, label, statuses]) => {
              const items = statuses === null
                ? boardItems.filter((item) => item.status !== 'archived' &&
                    !['backlog', 'in_progress', 'executing', 'active', 'in_review', 'review', 'blocked', 'done', 'complete', 'completed'].includes(item.status))
                : boardItems.filter((item) => item.status !== 'archived' && statuses.includes(item.status))
              return jsxs('section', { className: 'dockyard-board-column', 'data-board-column': key,
                onDragOver: (event) => { if (draggedRef?.project === project.id && !moving && statuses) event.preventDefault() },
                onDrop: (event) => { event.preventDefault(); if (draggedRef?.project === project.id && statuses?.[0]) transitionStatus(draggedRef.ref, statuses[0]); setDraggedRef(null) }, children: [
                jsxs('header', { children: [jsx('h3', { children: label }), jsx('span', { children: number(items.length) })] }),
                jsx('div', { className: 'dockyard-board-cards', children:
                  items.length > 0
                    ? items.map((item) => jsxs('article', { className: 'dockyard-work-card', draggable: !moving, 'data-work-card': item.ref,
                      onDragStart: (event) => { event.dataTransfer.setData('text/plain', item.ref); setDraggedRef({ ref: item.ref, project: project.id }) }, onDragEnd: () => setDraggedRef(null), children: [
                        jsx('button', { type: 'button', className: 'dockyard-button small', onClick: () => setSelectedWorkItem(item), children: 'Open details' }),
                        jsx('select', { 'aria-label': `Move ${item.ref}`, disabled: moving, value: '', onChange: (event) => transitionStatus(item.ref, event.target.value), children: [jsx('option', { value: '', children: 'Move to…' }), ...columns.filter(([, , states]) => states).map(([, label, states]) => jsx('option', { value: states[0], children: label }, states[0]))] }),
                        jsx('span', { className: 'dockyard-work-type', children: item.type || 'task' }),
                        jsx('h4', { children: item.title }),
                        jsxs('footer', { children: [jsx('span', { children: item.ref }), jsx('span', { children: item.assignee || 'Unassigned' })] }),
                      ]}, item.ref))
                    : jsx('p', { className: 'dockyard-meta', children: 'No work in this stage.' }),
                }),
              ]}, key)
            }),
          }),
      jsx(PlanningPanel, { project, milestones: view.milestones ?? [], workItems: view.workItems ?? [], onRefresh }),
      jsx(SavedViewsSection, {
        project,
        views: view.views ?? [],
        onApply: setAppliedView,
        onClear: () => setAppliedView(null),
        appliedName: appliedView?.name ?? null,
        onRefresh,
      }, `${project.id}:saved-views`),
    ]})
  } else if (projectView === 'initiative') {
    panel = jsx(InitiativeView, { view, onRefresh })
  } else if (projectView === 'objectives') {
    panel = jsx(ObjectivesPanel, { project, settings: view.settings ?? {}, objectives: view.objectives ?? [], goals: view.goals ?? [], missionArchive: view.missionArchive ?? [], onRefresh }, project.id)
  } else if (projectView === 'planning') {
    panel = jsx(PlanningCanvasPanel, { project, canvas: view.canvas, content: view.content ?? [], onRefresh, onDirty: onCanvasDirty }, project.id)
  } else if (projectView === 'workflows') {
    panel = jsx(ExecutableWorkflowsPanel, { project, workflows: view.workflows ?? [], onRefresh }, project.id)
  } else if (projectView === 'content') {
    panel = jsx(ProjectContentPanel, { project, content: view.content ?? [], onRefresh }, project.id)
  } else if (projectView === 'activity') {
    panel = jsxs('section', { className: 'dockyard-feature-card', children: [
      jsx('h2', { children: 'Project activity' }),
      (view.events ?? []).length > 0
        ? jsx('div', { className: 'dockyard-activity-list', children: view.events.map((event, index) => jsx('p', { children: JSON.stringify(event) }, String(event.id ?? index))) })
        : jsx('p', { className: 'dockyard-meta', children: 'No attributed project events have been recorded yet.' }),
    ]})
  } else if (projectView === 'settings') {
    panel = jsx(ProjectSettingsPanel, { project, settings: view.settings ?? {}, onRefresh, onDirty: onProjectDirty }, `${project.id}:${view.settings?.updated_at || 'initial'}`)
  } else if (projectView === 'reports') {
    panel = jsx(ProjectReportsPanel, { project, reports: view.reports ?? [], onRefresh })
  } else {
    const visibleWork = [...(view.workItems ?? [])]
      .sort((left, right) => String(left.status || '').localeCompare(String(right.status || '')))
      .slice(0, 5)
    const visibleInitiatives = [...(view.initiatives ?? [])]
      .sort((left, right) => Number(right.priority ?? 0) - Number(left.priority ?? 0))
      .slice(0, 3)
    const visibleEvents = [...(view.events ?? [])]
      .sort((left, right) => String(right.created_at || '').localeCompare(String(left.created_at || '')))
      .slice(0, 4)
    panel = jsxs(Fragment, { children: [
      jsxs('div', { className: 'dockyard-project-grid', 'data-project-visual': true, children: [
        jsxs('section', { className: 'dockyard-feature-card dockyard-project-hero', children: [
          jsx(StatusTag, { tone: healthTone, label: healthLabel }),
          jsx('h2', { children: view.settings?.mission || project.id }),
          jsx('p', { children: 'Work distribution and current delivery state from the canonical Dockyard backend.' }),
          jsx(WorkBar, { work: project.work ?? {}, label: `${project.id} delivery state` }),
          jsxs('div', { className: 'dockyard-work-legend', children: [
            jsxs('span', { className: 'backlog', children: [jsx('i', {}), `${number(project.work?.backlog ?? 0)} backlog`] }),
            jsxs('span', { className: 'active', children: [jsx('i', {}), `${number(project.work?.active ?? 0)} active`] }),
            jsxs('span', { className: 'done', children: [jsx('i', {}), `${number(project.work?.done ?? 0)} done`] }),
          ]}),
        ]}),
        jsxs('section', { className: 'dockyard-feature-card', children: [
          jsx('span', { className: 'dockyard-card-label', children: 'CURRENT SIGNALS' }),
          jsx('h2', { children: `${number(project.work?.blocked ?? 0)} blocked` }),
          jsx('p', { children: `${number(view.workItems?.length ?? 0)} work items and ${number(view.initiatives?.length ?? 0)} initiatives are attached to this project.` }),
        ]}),
      ]}),
      jsxs('div', { className: 'dockyard-project-overview-grid', children: [
        jsxs('section', { className: 'dockyard-feature-card dockyard-overview-card', 'data-overview-work': true, children: [
          jsxs('header', { children: [jsx('h2', { children: 'Current work' }), jsx('span', { children: number(view.workItems?.length ?? 0) })] }),
          jsx('p', { children: 'Live work, ownership and stage.' }),
          visibleWork.length > 0 ? jsx('div', { className: 'dockyard-overview-list', children:
            visibleWork.map((item) => jsxs('article', { children: [
              jsxs('span', { children: [jsx('strong', { children: item.title || item.ref }), jsx('small', { children: `${item.ref} / ${item.assignee || 'Unassigned'}` })] }),
              jsx(StatusTag, { tone: ['done', 'completed'].includes(item.status) ? 'success' : item.status === 'in_progress' ? 'info' : 'neutral', label: String(item.status || 'unknown').replaceAll('_', ' ') }),
            ]}, item.ref)),
          })
            : jsx('p', { className: 'dockyard-meta', children: 'No work items are attached.' }),
        ]}),
        jsxs('section', { className: 'dockyard-feature-card dockyard-overview-card', 'data-overview-initiatives': true, children: [
          jsxs('header', { children: [jsx('h2', { children: 'Initiatives' }), jsx('span', { children: number(view.initiatives?.length ?? 0) })] }),
          jsx('p', { children: 'Current improvement bets and their decision state.' }),
          visibleInitiatives.length > 0 ? jsx('div', { className: 'dockyard-overview-list', children:
            visibleInitiatives.map((initiative) => jsx(InitiativeRevisionRow, { initiative, onResubmitted: onRefresh }, initiative.ref)),
          })
            : jsx('p', { className: 'dockyard-meta', children: 'No initiatives are attached.' }),
        ]}),
        jsxs('section', { className: 'dockyard-feature-card dockyard-overview-card', 'data-overview-activity': true, children: [
          jsxs('header', { children: [jsx('h2', { children: 'Recent activity' }), jsx('span', { children: number(view.events?.length ?? 0) })] }),
          jsx('p', { children: 'Attributed events from this project.' }),
          visibleEvents.length > 0 ? jsx('div', { className: 'dockyard-overview-list activity', children:
            visibleEvents.map((event, index) => jsxs('article', { children: [
              jsxs('span', { children: [jsx('strong', { children: event.title || event.event_type || event.type || 'Project event' }), jsx('small', { children: event.actor_id || event.actor || formatWhen(event.created_at) || 'Attributed event' })] }),
            ]}, String(event.id ?? index))),
          })
            : jsx('p', { className: 'dockyard-meta', children: 'No attributed project events recorded yet.' }),
        ]}),
      ]}),
      jsx(FirstAssessmentCard, { projectId: project.id }),
    ]})
  }
  return jsxs('div', { 'data-project-dashboard': project.id, children: [
    jsx(PageHead, {
      title: view.settings?.mission || project.id,
      description: `Project dashboard / ${project.id}`,
      status: project.health && project.health !== 'healthy' ? healthLabel : null,
      onRefresh,
    }),
    workNotice || notice ? jsxs('div', { className: 'dockyard-view-only-note', role: 'alert', 'data-deep-link-notice': true, children: [
      jsx(Icon, { name: 'alert' }),
      jsx('span', { children: workNotice || notice }),
    ]}) : null,
    jsx('p', { className: 'dockyard-inline-error', role: 'alert', 'data-deep-link-error': true, hidden: !(workNotice || notice), children: workNotice || notice }),
    jsxs('div', { className: 'dockyard-project-toolbar', children: [
      jsx('label', { children: 'Project' }),
      jsx('select', { value: project.id, onChange: (event) => onSelectProject(event.target.value), children:
        projectOptions.map((option) => jsx('option', { value: option.id, children: option.id }, option.id)),
      }),
      jsx('nav', { className: 'dockyard-project-tabs', 'aria-label': 'Project views', children:
        views.map(([key, label]) => jsx('button', {
          type: 'button',
          className: projectView === key ? 'active' : '',
          'data-project-view': key,
          'aria-pressed': projectView === key,
          onClick: () => changeView(key),
          children: label,
        }, key)),
      }),
    ]}),
    panel,
    pendingView ? jsxs('section', { className: 'dockyard-modal-layer', 'data-view-switch-confirm': pendingView, children: [
      jsxs('div', { className: 'dockyard-modal', role: 'alertdialog', 'aria-modal': true, 'aria-label': 'Unsaved planning board changes', children: [
        jsx('h2', { children: 'Unsaved changes on this board' }),
        jsx('p', { children: 'The planning board has edits that are not saved. Stay to save them, or discard them and leave.' }),
        jsxs('div', { className: 'dockyard-modal-actions', children: [
          jsx(Button, { action: 'view-switch-stay', onClick: () => setPendingView(null), children: 'Stay and save' }),
          jsx(Button, { variant: 'danger', action: 'view-switch-discard', onClick: () => { const next = pendingView; setPendingView(null); setCanvasDirty(false); onProjectDirty?.(false); setProjectView(next) }, children: 'Discard and leave' }),
        ]}),
      ]}),
    ]}) : null,
    jsx(WorkItemDetail, { item: selectedWorkItem, projectId: project.id, profiles: view.profiles ?? [], initiatives: view.initiatives ?? [], onClose: () => setSelectedWorkItem(null), onRefresh }),
  ]})
}
