// GENERATED-STRUCTURE: hand-edited Desktop module. Edit this file, then run
// node hermes_dockyard_plugin/desktop/build.mjs to regenerate plugin.js.
//
// Deep-link routing as a pure decision, separate from the React state setters
// that apply it. Notifications and inbox rows are the only place a person
// reaches a specific object from outside its project, so this is the one
// function that has to get the destination project right.
//
// A link identifies its object globally (``s2:work/<ref>``) but never names
// the project the object lives in. The owning project therefore has to travel
// with the click: recovering it from the current selection is exactly what
// fails in "All projects", where the previous board scan found nothing and
// the screen fell back to the project chooser instead of the task.

/** Read the owning project from either an id or the clicked row. */
export function ownerProjectOf(owner) {
  if (typeof owner === 'string') return owner || null
  return owner?.project ?? owner?.project_id ?? null
}

/**
 * Decide where a deep link goes.
 *
 * Returns null for a link this app does not route. Fields left `undefined`
 * mean "leave that piece of state alone"; `null` means "clear it".
 */
export function resolveDeepLink({
  link,
  owner = null,
  projectContext = {},
  projects = [],
  selectedProject = null,
} = {}) {
  if (typeof link !== 'string' || !link.includes(':')) return null
  const ownerProject = ownerProjectOf(owner)
  const [screen, rest] = link.split(':', 2)
  const slash = rest.indexOf('/')
  const objectKind = slash >= 0 ? rest.slice(0, slash) : ''
  const objectId = slash >= 0 ? rest.slice(slash + 1) : rest

  if (screen === 's4' || (screen === 's6' && objectKind === 'initiative')) {
    return {
      tab: 'inbox',
      // The inbox is per-project, so a confirmation or approval opened from
      // "All projects" has to carry its project too.
      project: ownerProject ?? undefined,
      focusRef: objectId || null,
      notice: objectId ? `Approval inbox: focus ${objectId}` : null,
    }
  }

  if (screen === 's2' && objectKind === 'work' && objectId) {
    // The caller's project wins over the board-data scan: in "All projects"
    // the scanned context holds no work items for the target project, so the
    // scan found nothing and the screen opened whichever project happened to
    // be selected.
    const scanned = Object.entries(projectContext ?? {}).find(([, context]) =>
      (context?.workItems ?? []).some((item) => item.ref === objectId))
    const resolved = ownerProject ?? (scanned ? scanned[0] : null)
    return {
      tab: 'project',
      project: resolved ?? (selectedProject ?? projects?.[0]?.id ?? null),
      entryView: 'overview',
      workRef: objectId,
      notice: resolved ? null : `Work item ${objectId} is not in the current board data.`,
    }
  }

  if (screen === 's2' && objectKind === 'project' && objectId) {
    return { tab: 'project', project: objectId, entryView: 'overview', notice: null }
  }

  if (screen === 's3' && objectKind === 'unassigned' && objectId) {
    // The Dashboard's unassigned-work alert: that project's Backlog, showing
    // unassigned work.
    return {
      tab: 'backlog',
      project: objectId,
      notice: null,
      backlogPreset: { kind: 'unassigned', projectId: objectId },
    }
  }

  if (screen === 's1' && objectKind === 'project' && objectId) {
    return { tab: 'project', project: objectId, entryView: 'overview', notice: null }
  }

  if (screen === 's2' || screen === 's1') {
    if (objectId) return { tab: 'project', project: objectId, entryView: 'overview' }
    return { tab: 'dashboard' }
  }

  if (screen === 's5') return { tab: 'teams' }
  return { tab: 'dashboard' }
}
