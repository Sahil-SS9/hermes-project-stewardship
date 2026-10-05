// GENERATED-STRUCTURE: hand-edited Desktop module. Edit this file, then run
// node hermes_dockyard_plugin/desktop/build.mjs to regenerate plugin.js.
// Sahil 04/10 (demo feedback d): every screen follows the global switcher.
// These narrow an all-projects payload to one project and count what the
// narrowing hides, so the screen can say "N more in other projects".
import { ALL_PROJECTS } from '../lib/project-switcher.js'

const ownerOf = (item) => item?.project ?? item?.project_id ?? null
const keepFor = (projectId) => (item) => ownerOf(item) === projectId

export function scopeDashboard(view, projectId) {
  if (!view || !projectId || projectId === ALL_PROJECTS) return { view, hidden: 0 }
  const keep = keepFor(projectId)
  const groups = view.groups
    ? Object.fromEntries(Object.entries(view.groups).map(([key, items]) => [key, Array.isArray(items) ? items.filter(keep) : items]))
    : view.groups
  const needsYou = (source) => [...(source?.decisions ?? []), ...(source?.interventions ?? [])].length
  const inboxItems = (view.inbox?.items ?? []).filter(keep)
  const project = (view.projects ?? []).find((entry) => entry.id === projectId)
  const totals = project ? {
    ...view.totals,
    active_work: Number(project.work?.active ?? 0),
    blocked: Number(project.work?.blocked ?? 0),
    unacked_notifications: Number(project.unacked_notifications ?? 0),
  } : view.totals
  return {
    hidden: Math.max(0, needsYou(view.groups) - needsYou(groups)),
    view: {
      ...view,
      projects: project ? [project] : [],
      totals,
      groups,
      portfolio: view.portfolio ? {
        ...view.portfolio,
        groups,
        projects: (view.portfolio.projects ?? []).filter((entry) => (entry.project_id ?? entry.id) === projectId),
      } : view.portfolio,
      inbox: view.inbox ? { ...view.inbox, items: inboxItems, count: inboxItems.length } : view.inbox,
      owed_decisions: inboxItems.length,
      notifications: view.notifications
        ? { ...view.notifications, notifications: (view.notifications.notifications ?? []).filter(keep) }
        : view.notifications,
      projectContext: Object.fromEntries(Object.entries(view.projectContext ?? {}).filter(([id]) => id === projectId)),
    },
  }
}

export function scopeInbox(view, projectId) {
  if (!view || !projectId || projectId === ALL_PROJECTS) return { view, hidden: 0 }
  const items = (view.items ?? []).filter(keepFor(projectId))
  return { hidden: (view.items ?? []).length - items.length, view: { ...view, items, count: items.length } }
}

export function hiddenNotifications(view, projectId) {
  if (!view || !projectId || projectId === ALL_PROJECTS) return 0
  return (view.notifications ?? []).filter((note) => ownerOf(note) !== projectId).length
}
