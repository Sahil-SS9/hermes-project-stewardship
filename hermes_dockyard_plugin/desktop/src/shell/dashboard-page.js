// GENERATED-STRUCTURE: hand-edited Desktop module. Edit this file, then run
// node hermes_dockyard_plugin/desktop/build.mjs to regenerate plugin.js.
import { useDockyardStyles } from '../runtime/context.js'
import { useStylesheet } from '../runtime/context.js'
import { useState } from '../runtime/react.js'
import { useRef } from '../runtime/react.js'
import { useEffect } from '../runtime/react.js'
import { useMemo } from '../runtime/react.js'
import { Fragment } from '../runtime/react.js'
import { emitToast } from '../runtime/context.js'
import { TOAST_EVENT } from '../runtime/context.js'
import { loadDashboardData } from '../data/loaders.js'
import { loadProjectData } from '../data/loaders.js'
import { loadBacklogData } from '../data/loaders.js'
import { loadTeamsData } from '../data/loaders.js'
import { loadInboxData } from '../data/loaders.js'
import { loadAppSettingsData } from '../data/loaders.js'
import { api } from '../runtime/context.js'
import { sortProjects } from '../data/loaders.js'
import { jsx } from '../runtime/react.js'
import { ErrorState } from '../lib/ui.js'
import { LoadingState } from '../lib/ui.js'
import { DashboardView } from '../views/dashboard.js'
import { ProjectDashboard } from '../project/dashboard.js'
import { BacklogView } from '../views/backlog.js'
import { TeamsView } from '../views/teams.js'
import { InboxView } from '../views/inbox.js'
import { WorkflowLibraryView } from '../views/workflow-library.js'
import { NotificationsView } from '../views/notifications.js'
import { AppSettingsView } from '../views/app-settings.js'
import { RoadmapView } from '../views/roadmap.js'
import { jsxs } from '../runtime/react.js'
import { ConsoleBar } from '../lib/ui.js'
import { ToastRegion } from '../lib/ui.js'
import { useDialogFocusManager } from '../lib/ui.js'
import { Button } from '../lib/ui.js'
import { OnboardingWizard } from '../lib/ui.js'
import { ALL_PROJECTS } from '../lib/project-switcher.js'
import { ProjectChooser } from '../lib/project-switcher.js'
import { ScopeNote } from '../lib/project-switcher.js'
import { projectName } from '../lib/project-switcher.js'
import { scopeDashboard } from '../data/scope.js'
import { scopeInbox } from '../data/scope.js'
import { hiddenNotifications } from '../data/scope.js'
import { DEFAULT_FONT } from '../styles/themes.js'
import { DEFAULT_THEME } from '../styles/themes.js'
import { fontById } from '../styles/themes.js'
import { hostIsDark } from '../styles/themes.js'
import { themeById } from '../styles/themes.js'
import { themeMode } from '../styles/themes.js'
// Sahil 04/10 (demo feedback d): screens that work on one project ask for one
// while the switcher is on All projects.
const ONE_PROJECT_TABS = Object.freeze({ project: 'Projects', backlog: 'Backlog' })
export function DashboardPage({ inboxCss = '' } = {}) {
  useDockyardStyles()
  useStylesheet('dy-inbox-stylesheet', 'dyInboxStylesheet', inboxCss)
  const [tab, setTab] = useState('dashboard')
  // The switcher's choice: a project id, or ALL_PROJECTS ("*").
  const [selectedProject, setSelectedProject] = useState(null)
  const isAll = selectedProject === ALL_PROJECTS
  // Sahil 05/10 (demo feedback h): theme and typeface for the whole app, kept
  // in the backend (/settings/appearance). Match Hermes follows Hermes
  // Desktop's own light/dark mode live (until now nothing set dark mode).
  const [appearance, setAppearance] = useState({ theme: DEFAULT_THEME, font: DEFAULT_FONT })
  const [hostDark, setHostDark] = useState(() => hostIsDark())
  // Asked for once, right after the first data load starts: the dashboard
  // stays the first request (same rule as the remembered project below).
  const appearanceAsked = useRef(false)
  const askAppearance = () => {
    if (appearanceAsked.current) return
    appearanceAsked.current = true
    api('/settings/appearance').then(
      (saved) => { if (saved) setAppearance({ theme: themeById(saved.theme).id, font: fontById(saved.font).id }) },
      () => {}, // unavailable: the defaults stand
    )
  }
  useEffect(() => {
    const read = () => setHostDark(hostIsDark())
    const watcher = typeof MutationObserver === 'function' ? new MutationObserver(read) : null
    watcher?.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'data-hermes-mode'] })
    const media = window.matchMedia?.('(prefers-color-scheme: dark)')
    media?.addEventListener?.('change', read)
    return () => { watcher?.disconnect(); media?.removeEventListener?.('change', read) }
  }, [])
  const appearanceRef = useRef(appearance)
  appearanceRef.current = appearance
  const changeAppearance = async (patch) => {
    const before = appearanceRef.current
    setAppearance({ ...before, ...patch })
    try {
      const saved = await api('/settings/appearance', { method: 'PUT', body: patch, quiet: true })
      setAppearance({ theme: themeById(saved?.theme).id, font: fontById(saved?.font).id })
      return true
    } catch {
      setAppearance(before)
      emitToast('danger', 'That change was not saved. Try again.')
      return false
    }
  }
  const [projectOptions, setProjectOptions] = useState([])
  const [projectEntryView, setProjectEntryView] = useState('overview')
  // Roadmap scope: 'all' (the signed default) or one project. Every request
  // bumps the version, so the view re-mounts on it even when the scope is
  // unchanged (re-picking the picker's current project still narrows).
  const [roadmap, setRoadmap] = useState({ scope: 'all', version: 0 })
  const showRoadmap = (scope) => setRoadmap(({ version }) => ({ scope, version: version + 1 }))
  const [dashboardHomeVersion, setDashboardHomeVersion] = useState(0)
  // The onboarding wizard: null (closed), 'new' (New project) or 'existing'
  // (Onboard existing project, Sahil 05/10). Same wizard either way.
  const [onboarding, setOnboarding] = useState(null)
  const openNewProject = () => setOnboarding('new')
  const openOnboardExisting = () => setOnboarding('existing')
  const [toasts, setToasts] = useState([])
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [requestVersion, setRequestVersion] = useState(0)
  const [counts, setCounts] = useState({ approvals: null, notifications: null })
  const [loadScope, setLoadScope] = useState(null)
  // P6.4 (review R3): a deep link can pre-select an exact work item; the
  // project dashboard opens its drawer on arrival.
  const [pendingWorkRef, setPendingWorkRef] = useState(null)
  // The Workflows tab hands the builder a workflow to open ({ project, name,
  // conversation?, checks? }), and the builder hands the tab a global
  // workflow it just made, to mark in the list.
  const [pendingWorkflow, setPendingWorkflow] = useState(null)
  const [libraryHighlight, setLibraryHighlight] = useState(null)
  const loadSerial = useRef(0)
  const [dirtyProject, setDirtyProject] = useState(null)
  const [pendingProject, setPendingProject] = useState(null)
  // F-1/F-2: a top tab change is guarded like a project switch, and both
  // prompts can save (when the dirty panel offers a save handle).
  const [pendingTab, setPendingTab] = useState(null)
  // A one-off filter for the Backlog, set by a deep link (the Dashboard's unassigned-work alert).
  const [backlogPreset, setBacklogPreset] = useState(null)
  useEffect(() => { if (tab !== 'backlog') setBacklogPreset(null) }, [tab])
  const dirtySaver = useRef(null)
  const [navSaving, setNavSaving] = useState(false)
  const markDirty = (projectId) => (dirty, saver) => { setDirtyProject(dirty ? projectId : null); dirtySaver.current = dirty ? (saver ?? null) : null }
  // Sahil 02/10: Project Stewardship reopens on the last project the person chose. The
  // choice is kept in the backend (GET/PUT /settings/last-project), never in
  // browser storage (26/08 locked rule). Only a person's choice is saved:
  // the automatic first pick (the remembered project, or All projects when
  // nothing is remembered, Sahil 05/10) is not. It is requested once per app load, right after
  // the first load starts: the dashboard stays the first request (repro-live
  // fails the first GET) and the first pick waits for no extra round trip.
  const lastProject = useRef({ request: null, saved: null, auto: null })
  const rememberedProject = () => {
    const memory = lastProject.current
    memory.request ??= api('/settings/last-project').then(
      (result) => {
        const saved = typeof result?.project_id === 'string' && result.project_id ? result.project_id : null
        memory.saved ??= saved
        return saved
      },
      () => null, // unavailable: open on All projects, as when nothing is remembered
    )
    return memory.request
  }
  // Open until the page goes away. A load a newer one superseded is stale for
  // its tab, but still delivers the project list (below).
  const mounted = useRef(false)
  useEffect(() => {
    mounted.current = true
    return () => { mounted.current = false }
  }, [])
  // The switcher's projects are the whole fleet's, not one tab's data. A quick
  // tab switch used to throw them away with the superseded Dashboard load and
  // leave the switcher empty (10/10/2026; the Roadmap test lost that race about
  // 1 run in 10). Then the first pick: the remembered choice (a project still
  // listed, or All projects); otherwise All projects (Sahil 05/10, design d).
  // It never replaces a project someone chose meanwhile, and a list never
  // replaces one from a newer load (an older load can finish last).
  const projectsFrom = useRef(0)
  const adoptProjects = (projects, serial) => {
    if (serial < projectsFrom.current) return
    projectsFrom.current = serial
    const options = sortProjects(projects)
    setProjectOptions(options)
    if (!options.length) return
    rememberedProject().then((saved) => {
      if (!mounted.current) return
      const pick = saved === ALL_PROJECTS || (saved && options.some((option) => option.id === saved)) ? saved : ALL_PROJECTS
      setSelectedProject((chosen) => {
        if (chosen) return chosen
        lastProject.current.auto = pick
        return pick
      })
    })
  }
  useEffect(() => {
    const memory = lastProject.current
    const auto = memory.auto
    memory.auto = null
    if (!selectedProject || selectedProject === auto || selectedProject === memory.saved) return
    memory.saved = selectedProject
    api('/settings/last-project', { method: 'PUT', body: { project_id: selectedProject }, quiet: true }).catch(() => {})
  }, [selectedProject])
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
    const loader = isAll && (ONE_PROJECT_TABS[tab] || tab === 'workflows')
    ? async () => ({})
    : tab === 'workflows-library'
    ? async () => ({ workflows: (await api('/workflow-library')).workflows ?? [] })
    : tab === 'dashboard'
      ? loadDashboardData
      : tab === 'roadmap'
        // RoadmapView loads its own scope; the shell only gates the tab.
        ? async () => ({})
      : tab === 'settings'
        ? loadAppSettingsData
      : (tab === 'project' || tab === 'workflows')
        ? () => loadProjectData(selectedProject)
      : tab === 'backlog'
        ? () => loadBacklogData(selectedProject)
      : tab === 'teams'
        ? loadTeamsData
      : tab === 'inbox'
        ? loadInboxData
        : async () => api('/notifications?limit=200')
    const loading = loader()
    // No project picked yet: ask for the remembered one alongside this load.
    if (!selectedProject) rememberedProject()
    askAppearance()
    loading.then(
      (result) => {
        if (mounted.current && result?.projects) adoptProjects(result.projects, serial)
        if (!current || serial !== loadSerial.current) return
        setData({ tab, projectId: selectedProject, payload: result })
        if (tab === 'dashboard') {
          setCounts({
            approvals: Number(result.inbox?.count ?? result.owed_decisions ?? 0),
            notifications: Number((result.notifications?.notifications ?? []).filter((note) => (note.state ?? (note.acked ? 'seen' : 'new')) === 'new').length),
          })
        } else if (tab === 'inbox') {
          setCounts((previous) => ({ ...previous, approvals: Number(result.count ?? result.items?.length ?? 0) }))
        } else if (tab === 'notifications') {
          setCounts((previous) => ({ ...previous, notifications: Number((result.notifications ?? []).filter((note) => (note.state ?? (note.acked ? 'seen' : 'new')) === 'new').length) }))
        }
      },
      (failure) => { if (current && serial === loadSerial.current) setError({ tab, error: failure }) },
    )
    return () => { current = false }
  }, [tab, selectedProject, requestVersion])

  const refresh = () => setRequestVersion((version) => version + 1)
  // Sahil 04/10 (demo feedback d): the switcher scopes every screen; picking a
  // project (or All projects) keeps you on the screen you are on.
  const selectProject = (projectId) => {
    if (projectId === selectedProject) { if (tab === 'roadmap') showRoadmap(projectId); return }
    if (dirtyProject && dirtyProject !== projectId) {
      setPendingProject(projectId)
      return
    }
    setDirtyProject(null)
    setSelectedProject(projectId)
    if (tab === 'roadmap') showRoadmap(projectId)
  }
  const showAllProjects = () => selectProject(ALL_PROJECTS)
  // opts.entryView / opts.project let a guarded switch land on a specific
  // project view (or owner project) once the unsaved-changes prompt clears.
  const pendingTabOpts = useRef({})
  const goTab = (next, opts = {}) => {
    if (opts.project) setSelectedProject(opts.project)
    if (next === 'project') { setProjectEntryView(opts.entryView ?? 'overview'); setPendingWorkflow(opts.workflow ?? null) }
    if (next === 'workflows') setLibraryHighlight(opts.highlight ?? null)
    // The Roadmap follows the switcher; "View in Roadmap" moves the switcher too.
    if (next === 'roadmap' && opts.roadmapScope) setSelectedProject(opts.roadmapScope === 'all' ? ALL_PROJECTS : opts.roadmapScope)
    if (next === 'roadmap') showRoadmap(opts.roadmapScope ?? selectedProject)
    if (next === 'dashboard') setDashboardHomeVersion((value) => value + 1)
    setTab(next)
  }
  const requestTab = (next, opts = {}) => {
    if (next !== tab && dirtyProject) { pendingTabOpts.current = opts; setPendingTab(next); return }
    goTab(next, opts)
  }
  const cancelNav = () => { setPendingProject(null); setPendingTab(null); pendingTabOpts.current = {} }
  const continueNav = () => {
    const project = pendingProject
    const nextTab = pendingTab
    setPendingProject(null); setPendingTab(null)
    setDirtyProject(null); dirtySaver.current = null
    if (project) {
      setSelectedProject(project)
      if (tab === 'roadmap') showRoadmap(project)
    } else if (nextTab) { const opts = pendingTabOpts.current; pendingTabOpts.current = {}; goTab(nextTab, opts) }
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
    setOnboarding(null)
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
          notifications: previous.payload.notifications.map((note) => note.id === id ? { ...note, acked: true, state: 'seen' } : note),
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
  const [inboxFocusRef, setInboxFocusRef] = useState(null)
  const openDeepLink = (link) => {
    if (typeof link !== 'string' || !link.includes(':')) return
    const [screen, rest] = link.split(':', 2)
    const slash = rest.indexOf('/')
    const objectKind = slash >= 0 ? rest.slice(0, slash) : ''
    const objectId = slash >= 0 ? rest.slice(slash + 1) : rest
    if (screen === 's4' || (screen === 's6' && objectKind === 'initiative')) {
      setDeepLinkNotice(objectId ? `Approval inbox: focus ${objectId}` : null)
      setInboxFocusRef(objectId || null)
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
    if (screen === 's3' && objectKind === 'unassigned' && objectId) {
      // The Dashboard's unassigned-work alert: that project's Backlog, showing unassigned work.
      setDeepLinkNotice(null)
      setSelectedProject(objectId)
      setBacklogPreset({ kind: 'unassigned', projectId: objectId, at: Date.now() })
      setTab('backlog')
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
  const scoped = useMemo(() => {
    if (!payload || isAll || !selectedProject) return null
    if (tab === 'dashboard') return scopeDashboard(payload, selectedProject)
    if (tab === 'inbox') return scopeInbox(payload, selectedProject)
    return null
  }, [payload, tab, selectedProject, isAll])
  const scopeLabel = isAll ? 'All projects' : projectName(projectOptions.find((project) => project.id === selectedProject) ?? { id: selectedProject })
  const scopeNote = (hidden, noun) => (!isAll && selectedProject
    ? jsx(ScopeNote, { name: scopeLabel, hidden, noun, onShowAll: showAllProjects }, 'scope-note') : null)
  const activeError = error?.tab === tab ? error.error : null
  let content
  if (isAll && ONE_PROJECT_TABS[tab]) {
    content = jsx(ProjectChooser, { projects: projectOptions, screen: ONE_PROJECT_TABS[tab], onPick: selectProject, onNewProject: openNewProject, onOnboardExisting: openOnboardExisting })
  } else if (activeError) {
    content = jsx(ErrorState, { error: activeError, onRetry: refresh })
  } else if (!payload) {
    content = jsx(LoadingState, {})
  } else if (tab === 'dashboard') {
    content = jsxs(Fragment, { children: [
      scopeNote(scoped?.hidden ?? 0, 'items that need you'),
      jsx(DashboardView, { view: scoped?.view ?? payload, onInbox: () => setTab('inbox'), onRefresh: refresh, onOpen: openDeepLink, resetView: dashboardHomeVersion }, 'dashboard'),
    ] })
  } else if (tab === 'project') {
    content = jsx(ProjectDashboard, {
      view: payload,
      initialView: projectEntryView,
      onSelectProject: selectProject,
      onProjectDirty: markDirty(payload.project?.id ?? null),
      onRefresh: refresh,
      onOpenLibrary: (opts) => requestTab('workflows', { highlight: opts?.highlight }),
      openWorkflow: pendingWorkflow,
      onOpenWorkflowDone: () => setPendingWorkflow(null),
      onOpenRoadmap: () => requestTab('roadmap', { roadmapScope: payload.project?.id }),
      // C1: the header strip's attention drawer opens approvals in the inbox.
      onOpenLink: openDeepLink,
      pendingWorkRef,
      onPendingWorkConsumed: () => setPendingWorkRef(null),
      notice: deepLinkNotice,
    }, `project:${payload.project?.id ?? payload.missingProject ?? 'none'}`)
  } else if (tab === 'settings') {
    // Sahil 04/10 (demo feedback e): App settings. Project settings stay in the project.
    content = jsx(AppSettingsView, {
      view: payload,
      selectedProject: isAll ? null : selectedProject,
      appearance,
      onAppearance: changeAppearance,
      onOpenProjectSettings: () => requestTab('project', { entryView: 'settings' }),
      onForgetProject: () => { lastProject.current.saved = null },
      onRefresh: refresh,
    }, 'app-settings')
  } else if (tab === 'workflows') {
    // Option A (Sahil 28/09): the top Workflows tab IS the library. Project
    // workflows live under Project > Workflows. Enablement and runs act on the
    // project selected in the global picker, never an implicit first project.
    content = jsx(WorkflowLibraryView, {
      projectId: isAll ? null : selectedProject,
      projectLabel: isAll ? null : scopeLabel,
      highlight: libraryHighlight,
      onOpenBuilder: (row, extra = {}) => {
        // Quan M1: guarded like every other tab switch (no silent loss of edits).
        // A project row opens that workflow (it used to open the first one);
        // one just made there brings its AI conversation along.
        const owner = row?.owner_project_id
        if (extra.created) refresh()
        const workflow = row?.scope === 'project' ? { project: owner ?? selectedProject, name: row.name, conversation: extra.conversation ?? null, checks: extra.checks ?? null } : undefined
        requestTab('project', { entryView: 'workflows', project: owner && owner !== selectedProject ? owner : undefined, workflow })
      },
    }, `workflow-library:${isAll ? 'all' : selectedProject ?? 'none'}`)
  } else if (tab === 'roadmap') {
    // The view owns its scope after mounting; the shell re-mounts it (new
    // version key) for "View in Roadmap", the tab bar (All) and the picker.
    // Sahil 04/10 (demo feedback d, f): the Roadmap follows the switcher; its
    // own picker is gone.
    const roadmapScope = isAll || !selectedProject ? 'all' : selectedProject
    content = jsxs(Fragment, { children: [
      scopeNote(0, 'items'),
      jsx(RoadmapView, {
        initialScope: roadmapScope,
        onRefresh: refresh,
        onOpen: ({ project, entryView, workRef }) => {
          if (workRef) setPendingWorkRef(workRef)
          requestTab('project', { project, entryView })
        },
      }, `roadmap:${roadmapScope}:${roadmap.version}`),
    ] })
  } else if (tab === 'backlog') {
    content = jsx(BacklogView, { view: payload, onRefresh: refresh, preset: backlogPreset?.projectId === selectedProject ? backlogPreset : null })
  } else if (tab === 'teams') {
    content = jsx(TeamsView, { view: payload, onRefresh: refresh })
  } else if (tab === 'inbox') {
    content = jsxs(Fragment, { children: [
      scopeNote(scoped?.hidden ?? 0, 'approvals'),
      jsx(InboxView, { view: scoped?.view ?? payload, onRefresh: refresh, focusRef: inboxFocusRef, onOpenProject: openDeepLink }, 'inbox'),
    ] })
  } else {
    content = jsxs(Fragment, { children: [
      scopeNote(hiddenNotifications(payload, selectedProject), 'notifications'),
      jsx(NotificationsView, { view: payload, scopeProjectId: isAll ? null : selectedProject, onRefresh: refresh, onAcknowledged: acknowledge, onOpen: openDeepLink, onOpenSettings: () => requestTab('settings') }, 'notifications'),
    ] })
  }

  const theme = themeById(appearance.theme)
  return jsxs('div', {
    className: 'dockyard-root',
    'data-theme': themeMode(theme.id, hostDark),
    'data-dy-theme': theme.id,
    'data-dy-art': theme.art ? 'true' : undefined,
    'data-dy-font': appearance.font !== DEFAULT_FONT ? appearance.font : undefined,
    children: [
    jsxs('div', { className: 'dockyard-shell', children: [
      jsx(ConsoleBar, { tab, counts, projects: projectOptions, selectedProject, onProjectChange: selectProject,
        onTab: requestTab, onNewProject: openNewProject, onOnboardExisting: openOnboardExisting, onOpen: openDeepLink }),
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
    onboarding ? jsx(OnboardingWizard, { intent: onboarding, onClose: () => setOnboarding(null), onComplete: completeOnboarding }) : null,
  ]})
}
