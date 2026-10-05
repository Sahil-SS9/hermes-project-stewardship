// GENERATED-STRUCTURE: hand-edited Desktop module. Edit this file, then run
// node hermes_dockyard_plugin/desktop/build.mjs to regenerate plugin.js.
import { useState } from '../runtime/react.js'
import { useRef } from '../runtime/react.js'
import { useEffect } from '../runtime/react.js'
import { jsxs } from '../runtime/react.js'
import { jsx } from '../runtime/react.js'
import { Button } from '../lib/ui.js'
import { useDialogFocusManager } from '../lib/ui.js'
import { EmptyState } from '../lib/ui.js'
import { healthDetails } from '../lib/ui.js'
import { Icon } from '../lib/ui.js'
import { number } from '../lib/ui.js'
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
import { WorkItemDetail } from '../work-item/detail.js'
import { KanbanScreen } from '../kanban/board.js'
import { PlanScreen } from './plan/plan-screen.js'
import { parsePlanFocus } from './plan/plan-screen.js'
import { ProjectHeaderStrip } from './header-strip.js'

// Design round f: the old Objectives and Initiatives tabs (and the milestone
// panel) are one Vision tab (Sahil 05/10 named it; the whiteboards keep
// "Planning"). Its view key stays 'plan', so older entry names still land on
// it, and "plan:<kind>:<id>" opens it on one item (the Roadmap's Open).
const planView = (entry) => (parsePlanFocus(entry) || ['objectives', 'initiative', 'vision'].includes(entry) ? 'plan' : entry)

export function ProjectDashboard({ view, onSelectProject, onRefresh, onProjectDirty, pendingWorkRef, onPendingWorkConsumed, notice, initialView, onOpenLibrary, onOpenRoadmap, onOpenLink }) {
  const [projectView, setProjectView] = useState(planView(initialView) || 'overview')
  const [planFocus, setPlanFocus] = useState(() => parsePlanFocus(initialView))
  // QA M-7: leaving the Planning view with unsaved board edits asks first.
  const [canvasDirty, setCanvasDirty] = useState(false)
  const [pendingView, setPendingView] = useState(null)
  const changeView = (key) => {
    if (key === projectView) return
    if (projectView === 'planning' && canvasDirty) { setPendingView(key); return }
    setProjectView(key)
  }
  // A view key, or "plan:<kind>:<id>" to open one item on the Vision screen
  // (the Kanban card links use it).
  const openView = (entry) => {
    const focus = parsePlanFocus(entry)
    if (focus) setPlanFocus(focus)
    changeView(planView(entry))
  }
  const canvasSaver = useRef(null)
  const [viewSaving, setViewSaving] = useState(false)
  const onCanvasDirty = (dirty, saver) => { setCanvasDirty(dirty); canvasSaver.current = dirty ? saver : null; onProjectDirty?.(dirty, dirty ? saver : null) }
  useDialogFocusManager(pendingView ? '[data-view-switch-confirm] .dockyard-modal' : null)
  const leaveView = (next) => { setPendingView(null); setCanvasDirty(false); canvasSaver.current = null; onProjectDirty?.(false); setProjectView(next) }
  const saveThenLeave = async () => {
    const next = pendingView
    if (!next || !canvasSaver.current) return
    setViewSaving(true)
    const ok = await canvasSaver.current()
    setViewSaving(false)
    if (ok) leaveView(next)
    else if (!canvasSaver.current) setPendingView(null)
  }
  const [selectedWorkItem, setSelectedWorkItem] = useState(null)
  const [workNotice, setWorkNotice] = useState(null)
  // Phase 4: the applied saved view drives the Work board's contents and
  // layout until it is cleared. Recall never invents rows client-side: the
  // item list comes from the stored query run through the backend.
  const [appliedView, setAppliedView] = useState(null)
  const project = view.project
  // Tab-driven entry points (Objectives/Work/Reports/Settings/Workflows)
  // focus the matching sub-view; manual sub-view clicks are free afterwards
  // because this effect only runs when the entry target changes.
  useEffect(() => {
    if (initialView) { setProjectView(planView(initialView)); setPlanFocus(parsePlanFocus(initialView)) }
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
    ['overview', 'Overview'], ['plan', 'Vision'], ['board', 'Kanban'], ['planning', 'Planning'], ['workflows', 'Workflows'], ['content', 'Content'], ['activity', 'Activity'], ['reports', 'Reports'], ['settings', 'Settings'],
  ]
  // C1: Open on a "Needs attention" item goes to the exact place to act.
  const openAttentionItem = (item) => {
    const target = item?.target ?? {}
    if (target.kind === 'deep_link') { onOpenLink?.(target.link); return }
    if (target.kind === 'work') {
      const found = (view.workItems ?? []).find((entry) => entry.ref === target.ref)
      setWorkNotice(found ? null : `Work item ${target.ref} is not in this project's board data.`)
      setSelectedWorkItem(found ?? null)
      return
    }
    if (target.kind === 'plan') { openView(target.entry); return }
    if (target.kind === 'view') changeView(target.view)
  }
  let panel
  if (projectView === 'board') {
    // C2: the Kanban screen lives in src/kanban/. appliedView stays here so a
    // saved view survives a switch to another project tab and back.
    panel = jsx(KanbanScreen, {
      project, view, onRefresh, setWorkNotice, appliedView, setAppliedView,
      onOpenItem: setSelectedWorkItem,
      onNavigate: openView,
    })
  } else if (projectView === 'plan') {
    // Design round f (Sahil 04/10, feedback f): the Vision screen, one place
    // for initiatives, milestones, objectives, goals and the mission. It loads
    // its own data.
    panel = jsx(PlanScreen, { project, focus: planFocus, onFocusConsumed: () => setPlanFocus(null), onOpenRoadmap }, project.id)
  } else if (projectView === 'planning') {
    panel = jsx(PlanningCanvasPanel, { project, canvas: view.canvas, content: view.content ?? [], onRefresh, onDirty: onCanvasDirty }, project.id)
  } else if (projectView === 'workflows') {
    panel = jsx(ExecutableWorkflowsPanel, { project, workflows: view.workflows ?? [], onRefresh, onOpenLibrary }, project.id)
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
    // C1 (signed 16/09): the header strip replaces the old page head, in full
    // on every tab (Sahil 06/10: "full strip + keep all"), so the tab bar never
    // moves. The project comes from the global switcher only (Sahil 04/10), so
    // the strip and the tab bar carry no project picker.
    jsx(ProjectHeaderStrip, {
      project, view, onRefresh, onOpenRoadmap, onOpenItem: openAttentionItem,
    }, `strip:${project.id}`),
    workNotice || notice ? jsxs('div', { className: 'dockyard-view-only-note', role: 'alert', 'data-deep-link-notice': true, children: [
      jsx(Icon, { name: 'alert' }),
      jsx('span', { children: workNotice || notice }),
    ]}) : null,
    jsx('p', { className: 'dockyard-inline-error', role: 'alert', 'data-deep-link-error': true, hidden: !(workNotice || notice), children: workNotice || notice }),
    jsx('div', { className: 'dockyard-project-toolbar', children:
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
    }),
    panel,
    pendingView ? jsxs('section', { className: 'dockyard-modal-layer', 'data-view-switch-confirm': pendingView, children: [
      jsxs('div', { className: 'dockyard-modal', role: 'alertdialog', 'aria-modal': true, 'aria-label': 'Unsaved planning board changes',
        onKeyDown: (event) => { if (event.key === 'Escape' && !viewSaving) { event.stopPropagation(); setPendingView(null) } }, children: [
        jsx('h2', { children: 'Unsaved changes on this board' }),
        jsx('p', { children: 'The planning board has edits that are not saved. Save them before you leave, discard them, or cancel to keep editing.' }),
        jsxs('div', { className: 'dockyard-modal-actions', children: [
          jsx(Button, { action: 'view-switch-cancel', disabled: viewSaving, onClick: () => setPendingView(null), children: 'Cancel' }),
          jsx(Button, { variant: 'danger', action: 'view-switch-discard', disabled: viewSaving, onClick: () => leaveView(pendingView), children: 'Discard' }),
          jsx(Button, { variant: 'primary', action: 'view-switch-save', disabled: viewSaving || !canvasSaver.current, onClick: saveThenLeave, children: viewSaving ? 'Saving...' : 'Save and continue' }),
        ]}),
      ]}),
    ]}) : null,
    jsx(WorkItemDetail, { item: selectedWorkItem, projectId: project.id, profiles: view.profiles ?? [], initiatives: view.initiatives ?? [], onClose: () => setSelectedWorkItem(null), onRefresh }),
  ]})
}
