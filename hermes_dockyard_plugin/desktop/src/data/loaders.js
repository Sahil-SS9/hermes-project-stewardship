// GENERATED-STRUCTURE: hand-edited Desktop module. Edit this file, then run
// node hermes_dockyard_plugin/desktop/build.mjs to regenerate plugin.js.
import { api } from '../runtime/context.js'
export const HEALTH_PRIORITY = Object.freeze({ critical: 0, frozen: 0, attention: 0, degraded: 1, watch: 1, unknown: 2, healthy: 3 })
export const RISK_PRIORITY = Object.freeze({ critical: 0, high: 0, medium: 1, low: 2 })
export const SEVERITY_PRIORITY = Object.freeze({ critical: 0, high: 0, error: 0, medium: 1, warning: 1, low: 2, info: 3 })

export function sortProjects(projects) {
  return [...projects].sort((left, right) => {
    const health = (HEALTH_PRIORITY[left.health] ?? 2) - (HEALTH_PRIORITY[right.health] ?? 2)
    if (health !== 0) return health
    const blocked = Number(right.work?.blocked ?? 0) - Number(left.work?.blocked ?? 0)
    if (blocked !== 0) return blocked
    const alerts = Number(right.unacked_notifications ?? 0) - Number(left.unacked_notifications ?? 0)
    if (alerts !== 0) return alerts
    return String(left.id).localeCompare(String(right.id))
  })
}

export function sortApprovals(items) {
  return [...items].sort((left, right) => {
    const risk = (RISK_PRIORITY[String(left.risk || 'medium').toLowerCase()] ?? 1)
      - (RISK_PRIORITY[String(right.risk || 'medium').toLowerCase()] ?? 1)
    if (risk !== 0) return risk
    return Number(right.detail?.priority ?? 0) - Number(left.detail?.priority ?? 0)
  })
}

export function initials(value) {
  const words = String(value || '?').replace(/-bot$/i, '').split(/[-_\s]+/).filter(Boolean)
  return words.slice(0, 2).map((word) => word.charAt(0).toUpperCase()).join('') || '?'
}

export function readableLabel(value, fallback = 'All') {
  const text = String(value || fallback).replace(/[_-]+/g, ' ').trim()
  return text ? `${text.charAt(0).toUpperCase()}${text.slice(1)}` : fallback
}

export function validationSummary(contract) {
  if (!contract || typeof contract !== 'object') return 'No validation contract supplied'
  const steps = Array.isArray(contract.steps) ? contract.steps.filter(Boolean) : []
  const tests = typeof contract.tests === 'string' ? contract.tests.trim() : ''
  if (steps.length > 0 && tests) return `${steps.length} checks plus ${tests}`
  if (steps.length > 0) return steps.join('; ')
  if (tests) return tests
  return 'No validation contract supplied'
}

export async function loadDashboardData() {
  // P6 (review R2): the fleet groups live on /portfolio; /dashboard keeps
  // serving the legacy summary. Load both so the grouped read model renders
  // without losing workload/project context.
  const [dashboard, portfolio, inbox, notifications, bots, workload] = await Promise.all([
    api('/dashboard'), api('/portfolio'), api('/inbox'), api('/notifications'), api('/bots'), api('/workload'),
  ])
  const entries = await Promise.all((dashboard.projects ?? []).map(async (project) => {
    const projectId = encodeURIComponent(project.id)
    const [settings, workItems] = await Promise.all([
      api(`/projects/${projectId}/settings`),
      api(`/projects/${projectId}/work-items`),
    ])
    return [project.id, { settings, workItems: workItems.work_items ?? [] }]
  }))
  return {
    ...dashboard,
    portfolio,
    groups: portfolio?.groups ?? null,
    inbox,
    notifications,
    bots,
    workload,
    projectContext: Object.fromEntries(entries),
  }
}

export async function loadProjectData(projectId) {
  const dashboard = await api('/dashboard')
  const projects = sortProjects(dashboard.projects ?? [])
  // P6.4 (review R3): never substitute a different project for an explicit
  // stale or unknown id — surface the miss explicitly instead. A null id
  // (plain tab open, no target) keeps the first-project default.
  const project = (projectId
    ? projects.find((item) => item.id === projectId) ?? null
    : projects[0] ?? null)
  if (projectId && !project) {
    return { ...dashboard, projects, project: null, missingProject: projectId }
  }
  if (!project) return { ...dashboard, project: null, projects }
  const encoded = encodeURIComponent(project.id)
  const [settings, workItems, initiatives, objectives, goals, missionArchive, content, events, reports, milestones, workflows, views, canvas, discovery] = await Promise.all([
    api(`/projects/${encoded}/settings`),
    api(`/projects/${encoded}/work-items`),
    api(`/projects/${encoded}/initiatives`),
    api(`/projects/${encoded}/objectives`),
    api(`/projects/${encoded}/goals`),
    api(`/projects/${encoded}/missions/archive`),
    api(`/projects/${encoded}/content`),
    api(`/projects/${encoded}/events`),
    api(`/projects/${encoded}/reports`),
    api(`/projects/${encoded}/milestones`),
    api(`/projects/${encoded}/workflows`),
    api(`/projects/${encoded}/views`),
    api(`/projects/${encoded}/canvas`),
    api('/onboard/discover'),
  ])
  return {
    ...dashboard,
    projects,
    project,
    settings,
    workItems: workItems.work_items ?? [],
    initiatives: initiatives.initiatives ?? [],
    objectives: objectives.objectives ?? [],
    goals: goals.goals ?? [],
    missionArchive: missionArchive.missions ?? [],
    content: content.content ?? [],
    events: events.events ?? [],
    reports: reports.reports ?? [],
    milestones: milestones.milestones ?? [],
    workflows: workflows.workflows ?? [],
    views: views.views ?? [],
    canvas: canvas ?? { revision: 1, objects: [], connectors: [] },
    profiles: discovery.profiles ?? [],
  }
}

export async function loadOnboardData() {
  const dashboard = await api('/dashboard')
  const projects = sortProjects(dashboard.projects ?? [])
  const discovery = await api('/onboard/discover')
  return { ...dashboard, projects, profiles: discovery.profiles ?? [] }
}

export async function loadBacklogData(projectId) {
  const dashboard = await api('/dashboard')
  const projects = sortProjects(dashboard.projects ?? [])
  const project = projectId ? projects.find((item) => item.id === projectId) ?? null : projects[0] ?? null
  if (projectId && !project) return { project: null, projects, missingProject: projectId, backlog: [], workItems: [], initiatives: [], bots: [] }
  if (!project) return { project: null, projects, backlog: [], workItems: [], initiatives: [], bots: [] }
  const encoded = encodeURIComponent(project.id)
  const [backlog, workItems, initiatives, bots, discovery] = await Promise.all([
    api(`/projects/${encoded}/backlog`),
    api(`/projects/${encoded}/work-items`),
    api(`/projects/${encoded}/initiatives`),
    api('/bots'),
    api('/onboard/discover'),
  ])
  return {
    project,
    projects,
    backlog: backlog.backlog ?? [],
    workItems: workItems.work_items ?? [],
    initiatives: initiatives.initiatives ?? [],
    bots: bots.bots ?? [],
    profiles: discovery.profiles ?? [],
  }
}

export async function loadRoadmapData(projectId) {
  // R2 (Phase C): the outline read model. One call; the backend makes one
  // canonical list_work call per project. Milestone items load separately
  // when a milestone opens (roadmap.milestone_items).
  const path = projectId ? `/roadmap?project_id=${encodeURIComponent(projectId)}` : '/roadmap'
  return api(path)
}

export async function loadTeamsData() {
  const [bots, workload, groups, dashboard, discovery] = await Promise.all([
    api('/bots'), api('/workload'), api('/bot-groups'), api('/dashboard'), api('/onboard/discover'),
  ])
  const projects = sortProjects(dashboard.projects ?? [])
  const project = projects[0] ?? null
  const team = project ? await api(`/projects/${encodeURIComponent(project.id)}/team`) : null
  const messages = {}
  await Promise.all((groups.groups ?? []).map(async (group) => {
    const result = await api(`/bot-groups/${encodeURIComponent(group.name)}/messages`)
    messages[group.name] = result.messages ?? []
  }))
  return { bots: bots.bots ?? [], workload, groups: groups.groups ?? [], messages,
    projects, project, team, profiles: discovery.profiles ?? [] }
}

export async function loadInboxData() {
  const inbox = await api('/inbox')
  const projectIds = [...new Set((inbox.items ?? []).map((item) => item.project).filter(Boolean))]
  const projectInitiatives = await Promise.all(projectIds.map(async (projectId) => {
    const result = await api(`/projects/${encodeURIComponent(projectId)}/initiatives`)
    return result.initiatives ?? []
  }))
  const detailByRef = {}
  projectInitiatives.flat().forEach((initiative) => { detailByRef[initiative.ref] = initiative })
  return {
    ...inbox,
    items: (inbox.items ?? []).map((item) => ({ ...item, detail: detailByRef[item.ref] ?? null })),
  }
}
