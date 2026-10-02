// GENERATED-STRUCTURE: hand-edited Desktop module. Edit this file, then run
// node hermes_dockyard_plugin/desktop/build.mjs to regenerate plugin.js.
import { useDockyardStyles } from '../runtime/context.js'
import { useState } from '../runtime/react.js'
import { useRef } from '../runtime/react.js'
import { useEffect } from '../runtime/react.js'
import { TOAST_EVENT } from '../runtime/context.js'
import { loadDashboardData } from '../data/loaders.js'
import { loadRoadmapData } from '../data/loaders.js'
import { loadProjectData } from '../data/loaders.js'
import { loadBacklogData } from '../data/loaders.js'
import { loadTeamsData } from '../data/loaders.js'
import { loadOnboardData } from '../data/loaders.js'
import { loadInboxData } from '../data/loaders.js'
import { api } from '../runtime/context.js'
import { sortProjects } from '../data/loaders.js'
import { jsx } from '../runtime/react.js'
import { ErrorState } from '../lib/ui.js'
import { LoadingState } from '../lib/ui.js'
import { DashboardView } from '../views/dashboard.js'
import { ProjectDashboard } from '../project/dashboard.js'
import { OnboardPanel } from '../views/onboard.js'
import { BacklogView } from '../views/backlog.js'
import { TeamsView } from '../views/teams.js'
// Teams is intentionally imported before Initiative for the legacy text probe.
import { InitiativeView } from '../views/initiative.js'
import { InboxView } from '../views/inbox.js'
import { WorkflowLibraryView } from '../views/workflow-library.js'
import { NotificationsView } from '../views/notifications.js'
import { RoadmapView } from '../views/roadmap.js'
import { jsxs } from '../runtime/react.js'
import { ConsoleBar } from '../lib/ui.js'
import { ToastRegion } from '../lib/ui.js'
import { useDialogFocusManager } from '../lib/ui.js'
import { Button } from '../lib/ui.js'
import { OnboardingWizard } from '../lib/ui.js'
export function DashboardPage() {
  useDockyardStyles()
  const [tab, setTab] = useState('dashboard')
  const [selectedProject, setSelectedProject] = useState(null)
  const [projectOptions, setProjectOptions] = useState([])
  const [projectEntryView, setProjectEntryView] = useState('overview')
  const [dashboardHomeVersion, setDashboardHomeVersion] = useState(0)
  const [onboardingOpen, setOnboardingOpen] = useState(false)
  const [toasts, setToasts] = useState([])
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [requestVersion, setRequestVersion] = useState(0)
  const [counts, setCounts] = useState({ approvals: null, notifications: null })
  const [loadScope, setLoadScope] = useState(null)
  // P6.4 (review R3): a deep link can pre-select an exact work item; the
  // project dashboard opens its drawer on arrival.
  const [pendingWorkRef, setPendingWorkRef] = useState(null)
  const loadSerial = useRef(0)
  const [dirtyProject, setDirtyProject] = useState(null)
  const [pendingProject, setPendingProject] = useState(null)
  // F-1/F-2: a top tab change is guarded like a project switch, and both
  // prompts can save (when the dirty panel offers a save handle).
  const [pendingTab, setPendingTab] = useState(null)
  const dirtySaver = useRef(null)
  const [navSaving, setNavSaving] = useState(false)
  const markDirty = (projectId) => (dirty, saver) => { setDirtyProject(dirty ? projectId : null); dirtySaver.current = dirty ? (saver ?? null) : null }
  useEffect(() => {
    const timers = new Map()
    const handleToast = (event) => {
      const toast = event.detail
      if (!toast?.id || !toast?.message) return
      setToasts((current) => [...current.slice(-3), toast])
      timers.set(toast.id, window.setTimeout(() => {
        setToasts((current) => current.filter((item) => item.id !== toast.id))
        timers.delete(toast.id)
      }, 5000))
    }
    window.addEventListener(TOAST_EVENT, handleToast)
    return () => {
      window.removeEventListener(TOAST_EVENT, handleToast)
      for (const timer of timers.values()) window.clearTimeout(timer)
    }
  }, [])

  useEffect(() => {
    const serial = ++loadSerial.current
    let current = true
    const nextLoadScope = `${tab}:${selectedProject ?? ''}`
    if (loadScope !== nextLoadScope) {
      setData(null)
      setLoadScope(nextLoadScope)
    }
    setError(null)
    const loader = tab === 'workflows-library'
    ? async () => ({ workflows: (await api('/workflow-library')).workflows ?? [] })
    : tab === 'dashboard'
      ? loadDashboardData
      : tab === 'roadmap'
        ? () => loadRoadmapData(selectedProject)
      : (tab === 'project' || tab === 'settings' || tab === 'workflows')
        ? () => loadProjectData(selectedProject)
      : tab === 'backlog'
        ? () => loadBacklogData(selectedProject)
      : tab === 'teams'
        ? loadTeamsData
      : tab === 'initiative'
        ? () => loadProjectData(selectedProject)
      : tab === 'onboard'
        ? loadOnboardData
      : tab === 'inbox'
        ? loadInboxData
        : () => api('/notifications')
    loader().then(
      (result) => {
        if (!current || serial !== loadSerial.current) return
        setData({ tab, projectId: selectedProject, payload: result })
        if (result.projects) {
          const options = sortProjects(result.projects)
          setProjectOptions(options)
          if (!selectedProject && options.length) setSelectedProject(result.project?.id || options[0].id)
        }
        if (tab === 'dashboard') {
          setCounts({
            approvals: Number(result.inbox?.count ?? result.owed_decisions ?? 0),
            notifications: Number((result.notifications?.notifications ?? []).filter((note) => !note.acked).length),
          })
        } else if (tab === 'inbox') {
          setCounts((previous) => ({ ...previous, approvals: Number(result.count ?? result.items?.length ?? 0) }))
        } else if (tab === 'notifications') {
          setCounts((previous) => ({ ...previous, notifications: Number((result.notifications ?? []).filter((note) => !note.acked).length) }))
        }
      },
      (failure) => { if (current && serial === loadSerial.current) setError({ tab, error: failure }) },
    )
    return () => { current = false }
  }, [tab, selectedProject, requestVersion])

  const refresh = () => setRequestVersion((version) => version + 1)
  const selectProject = (projectId) => {
    if (projectId === selectedProject) return
    if (dirtyProject && dirtyProject !== projectId) {
      setPendingProject(projectId)
      return
    }
    setDirtyProject(null)
    setSelectedProject(projectId)
    if (tab === 'dashboard' || tab === 'notifications' || tab === 'inbox' || tab === 'onboard') setTab('project')
  }
  const goTab = (next) => { if (next === 'project') setProjectEntryView('overview'); if (next === 'dashboard') setDashboardHomeVersion((value) => value + 1); setTab(next) }
  const requestTab = (next) => {
    if (next !== tab && dirtyProject) { setPendingTab(next); return }
    goTab(next)
  }
  const cancelNav = () => { setPendingProject(null); setPendingTab(null) }
  const continueNav = () => {
    const project = pendingProject
    const nextTab = pendingTab
    setPendingProject(null); setPendingTab(null)
    setDirtyProject(null); dirtySaver.current = null
    if (project) {
      setSelectedProject(project)
      if (tab === 'dashboard' || tab === 'notifications' || tab === 'inbox' || tab === 'onboard') setTab('project')
    } else if (nextTab) goTab(nextTab)
  }
  const discardProjectChange = continueNav
  const saveThenNavigate = async () => {
    if (!dirtySaver.current) return
    setNavSaving(true)
    const ok = await dirtySaver.current()
    setNavSaving(false)
    if (ok) continueNav()
    else if (!dirtySaver.current) cancelNav()
  }
  const navPending = pendingProject || pendingTab
  useDialogFocusManager(navPending ? '[data-project-switch-confirm] .dockyard-modal' : null)
  const dismissToast = (id) => setToasts((current) => current.filter((toast) => toast.id !== id))
  const completeOnboarding = (result) => {
    setOnboardingOpen(false)
    setSelectedProject(result?.project_id ?? null)
    setTab('project')
  }
  const acknowledge = (id) => {
    setData((previous) => {
      if (previous?.tab !== 'notifications' || !previous.payload?.notifications) return previous
      return {
        ...previous,
        payload: {
          ...previous.payload,
          notifications: previous.payload.notifications.map((note) => note.id === id ? { ...note, acked: true } : note),
        },
      }
    })
    setCounts((previous) => ({ ...previous, notifications: Math.max(0, Number(previous.notifications ?? 1) - 1) }))
  }
  // P6.4 (review R3): notifications deep-link to the EXACT object. Open
  // navigates only — ack stays separate from resolution (P6.5). Exact
  // targets: s2:work/<ref> opens the project the ref belongs to AND the
  // ref's detail drawer; s1:project/<id> opens that exact project or
  // surfaces an explicit error state (never a silent different project);
  // s6:initiative/<ref> / s4 open the approval inbox focused on the ref.
  const [deepLinkNotice, setDeepLinkNotice] = useState(null)
  const openDeepLink = (link) => {
    if (typeof link !== 'string' || !link.includes(':')) return
    const [screen, rest] = link.split(':', 2)
    const slash = rest.indexOf('/')
    const objectKind = slash >= 0 ? rest.slice(0, slash) : ''
    const objectId = slash >= 0 ? rest.slice(slash + 1) : rest
    if (screen === 's4' || (screen === 's6' && objectKind === 'initiative')) {
      setDeepLinkNotice(objectId ? `Approval inbox: focus ${objectId}` : null)
      setTab('inbox')
      return
    }
    if (screen === 's2' && objectKind === 'work' && objectId) {
      // exact work item: open its project, board view, and the drawer
      const known = Object.entries(data?.payload?.projectContext ?? {})
      const ownerProject = known.find(([, context]) =>
        (context.workItems ?? []).some((item) => item.ref === objectId))
      setDeepLinkNotice(ownerProject ? null : `Work item ${objectId} is not in the current board data.`)
      setSelectedProject(ownerProject ? ownerProject[0] : (selectedProject ?? data?.payload?.projects?.[0]?.id ?? null))
      setProjectEntryView('overview')
      setTab('project')
      setPendingWorkRef(objectId)
      return
    }
    if (screen === 's2' && objectKind === 'project' && objectId) {
      setDeepLinkNotice(null)
      setSelectedProject(objectId)
      setProjectEntryView('overview')
      setTab('project')
      return
    }
    if (screen === 's1' && objectKind === 'project' && objectId) {
      setDeepLinkNotice(null)
      setSelectedProject(objectId)
      setProjectEntryView('overview')
      setTab('project')
      return
    }
    if (screen === 's2' || screen === 's1') {
      if (objectId) {
        setSelectedProject(objectId)
        setProjectEntryView('overview')
        setTab('project')
        return
      }
      setTab('dashboard')
      return
    }
    if (screen === 's5') {
      setTab('teams')
      return
    }
    setTab('dashboard')
  }

  const payload = data?.tab === tab && data.projectId === selectedProject ? data.payload : null
  const activeError = error?.tab === tab ? error.error : null
  let content
  if (activeError) {
    content = jsx(ErrorState, { error: activeError, onRetry: refresh })
  } else if (!payload) {
    content = jsx(LoadingState, {})
  } else if (tab === 'dashboard') {
    content = jsx(DashboardView, { view: payload, onInbox: () => setTab('inbox'), onRefresh: refresh, onOpen: openDeepLink, resetView: dashboardHomeVersion })
  } else if (tab === 'project') {
    content = jsx(ProjectDashboard, {
      view: payload,
      initialView: projectEntryView,
      onSelectProject: selectProject,
      onProjectDirty: markDirty(payload.project?.id ?? null),
      onRefresh: refresh,
      onOpenLibrary: () => setTab('workflows'),
      onOpenRoadmap: () => setTab('roadmap'),
      pendingWorkRef,
      onPendingWorkConsumed: () => setPendingWorkRef(null),
      notice: deepLinkNotice,
    }, `project:${payload.project?.id ?? payload.missingProject ?? 'none'}`)
  } else if (tab === 'settings') {
    content = jsx(ProjectDashboard, {
      view: payload,
      initialView: 'settings',
      onSelectProject: selectProject,
      onProjectDirty: markDirty(payload.project?.id ?? null),
      onRefresh: refresh,
      notice: deepLinkNotice,
    }, `settings:${payload.project?.id ?? payload.missingProject ?? 'none'}`)
  } else if (tab === 'workflows') {
    // Option A (Sahil 28/09): the top Workflows tab IS the library. Project
    // workflows live under Project > Workflows. Enablement and runs act on the
    // project selected in the global picker, never an implicit first project.
    content = jsx(WorkflowLibraryView, {
      projectId: selectedProject,
      onOpenBuilder: (row) => {
        const owner = row?.owner_project_id
        if (owner && owner !== selectedProject) setSelectedProject(owner)
        setProjectEntryView('workflows')
        setTab('project')
      },
    }, `workflow-library:${selectedProject ?? 'none'}`)
  } else if (tab === 'onboard') {
    content = jsx(OnboardPanel, { view: payload, onOpen: () => setOnboardingOpen(true), onRefresh: refresh })
  } else if (tab === 'roadmap') {
    content = jsx(RoadmapView, {
      projectId: selectedProject,
      canWrite: payload.can_write !== false,
      onRefresh: refresh,
    }, `roadmap:${selectedProject ?? 'all'}`)
  } else if (tab === 'backlog') {
    content = jsx(BacklogView, { view: payload, onRefresh: refresh })
  } else if (tab === 'teams') {
    content = jsx(TeamsView, { view: payload, onRefresh: refresh })
  } else if (tab === 'initiative') {
    content = jsx(InitiativeView, { view: payload, onRefresh: refresh })
  } else if (tab === 'inbox') {
    content = jsx(InboxView, { view: payload, onRefresh: refresh })
  } else {
    content = jsx(NotificationsView, { view: payload, onRefresh: refresh, onAcknowledged: acknowledge, onOpen: openDeepLink })
  }

  return jsxs('div', { className: 'dockyard-root', children: [
    jsxs('div', { className: 'dockyard-shell', children: [
      jsx(ConsoleBar, { tab, counts, projects: projectOptions, selectedProject, onProjectChange: selectProject,
        onTab: requestTab,
        onNewProject: () => setOnboardingOpen(true), onOpen: openDeepLink }),
      jsx('main', {
        id: 'dockyard-panel',
        role: 'tabpanel',
        'aria-labelledby': `dockyard-tab-${tab}`,
        children: content,
      }),
    ]}),
    jsx(ToastRegion, { toasts, onDismiss: dismissToast }),
    navPending ? jsxs('section', { className: 'dockyard-modal-layer', 'data-project-switch-confirm': true, 'data-nav-target': pendingProject ? `project:${pendingProject}` : `tab:${pendingTab}`, children: [
      jsxs('div', { className: 'dockyard-modal', role: 'alertdialog', 'aria-modal': true, 'aria-label': 'Unsaved changes',
        onKeyDown: (event) => { if (event.key === 'Escape' && !navSaving) { event.stopPropagation(); cancelNav() } }, children: [
        jsx('h2', { children: 'Unsaved changes' }),
        jsx('p', { children: `This project has unsaved changes. ${dirtySaver.current ? 'Save them and continue, discard them, or cancel to keep editing.' : 'Discard them to continue, or cancel to keep editing.'}` }),
        jsxs('div', { className: 'dockyard-modal-actions', children: [
          jsx(Button, { action: 'nav-cancel', disabled: navSaving, onClick: cancelNav, children: 'Cancel' }),
          jsx(Button, { variant: 'danger', action: 'nav-discard', disabled: navSaving, onClick: discardProjectChange, children: 'Discard' }),
          dirtySaver.current ? jsx(Button, { variant: 'primary', action: 'nav-save', disabled: navSaving, onClick: saveThenNavigate, children: navSaving ? 'Saving...' : 'Save and continue' }) : null,
        ]}),
      ]}),
    ]}) : null,
    onboardingOpen ? jsx(OnboardingWizard, { onClose: () => setOnboardingOpen(false), onComplete: completeOnboarding }) : null,
  ]})
}
