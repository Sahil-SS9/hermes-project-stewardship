// GENERATED-STRUCTURE: hand-edited Desktop module. Edit this file, then run
// node hermes_dockyard_plugin/desktop/build.mjs to regenerate plugin.js.
//
// Chat with a project's bots (checks round 1; Sahil 08/10 pick 1a = A).
// The header strip's Chat menu lists the project's team, lead first; picking
// a bot opens a fresh Hermes Desktop chat with it through the plugin kit's own
// door (host.newChat, the same one the sidebar "+" uses). The chat opens in the
// normal chat list, not as a tile in the Bots tab: placing it there needs the
// Bots plugin's private key format, and Dockyard does not depend on it.
// Before opening, Dockyard records a one-time link so the chat's first
// message gets this project's memory (persistence/chat_links.py). Everything
// here takes host and api as arguments so it is tested without a browser.

// The team, lead first, each bot once; departed members are never listed.
export function chatTargets(members, lead) {
  const list = Array.isArray(members) ? members : []
  const seen = new Set()
  const out = []
  const push = (slug, role) => {
    const profile = String(slug ?? '').trim()
    if (!profile || seen.has(profile)) return
    seen.add(profile)
    out.push({ profile, role })
  }
  const leadSlug = String(lead ?? '').trim() || list.find((member) => member?.role === 'lead')?.profile_slug
  if (leadSlug) push(leadSlug, 'lead')
  for (const member of list) {
    if (member?.state === 'departed') continue
    push(member?.profile_slug, member?.role === 'lead' ? 'lead' : 'member')
  }
  return out
}

// The bot's route on the connection Dockyard's data lives on (the active one).
// Backend profile first (targetProfile), then the Desktop profile name.
export function chatRoute(routes, activeConnectionId, profile) {
  if (!activeConnectionId) return null
  const list = (Array.isArray(routes) ? routes : []).filter((route) => route?.connectionId === activeConnectionId)
  return list.find((route) => route?.targetProfile === profile) ?? list.find((route) => route?.profile === profile) ?? null
}

// Open a fresh chat with `profile`. Returns what happened, so the caller can
// say it plainly: { opened, linked, via } or { opened: false, reason }.
export async function openProjectChat({ host, api, projectId, profile }) {
  if (typeof host?.newChat !== 'function') return { opened: false, reason: 'unsupported' }
  let linked = false
  try {
    // quiet: the caller says what happened in one toast (chatOutcomeMessage).
    await api(`/projects/${encodeURIComponent(projectId)}/chat-links`, { method: 'POST', body: { profile }, quiet: true })
    linked = true
  } catch {
    linked = false
  }
  let route = null
  try {
    if (typeof host.profileRoutes === 'function') {
      route = chatRoute(await host.profileRoutes(), host.activeConnectionId?.() ?? null, profile)
    }
  } catch {
    route = null
  }
  host.newChat(route ? { ...route } : profile)
  return { opened: true, linked, via: route ? 'route' : 'profile' }
}

export function chatOutcomeMessage(profile, outcome) {
  if (!outcome?.opened) return ['danger', 'This version of Hermes Desktop cannot open a chat from Dockyard. Update Hermes Desktop.']
  if (!outcome.linked) return ['danger', `Chat with ${profile} opened, but without this project's memory: Dockyard could not link it.`]
  return ['success', `Chat with ${profile} opened. Its first message brings this project's memory.`]
}
