// GENERATED-STRUCTURE: hand-edited Desktop module. Edit this file, then run
// node hermes_dockyard_plugin/desktop/build.mjs to regenerate plugin.js.
// Sahil 04/10 (demo feedback e): the top-bar Settings tab is App settings,
// for the whole app only. Each project's own settings stay in the project
// (Projects > Settings). Every value here lives in the backend, never in the
// browser (26/08 locked rule).
import { useState } from '../runtime/react.js'
import { jsx } from '../runtime/react.js'
import { jsxs } from '../runtime/react.js'
import { Fragment } from '../runtime/react.js'
import { api } from '../runtime/context.js'
import { emitToast } from '../runtime/context.js'
import { Button } from '../lib/ui.js'
import { PageHead } from '../lib/ui.js'
import { NotificationSettings } from './notifications.js'
import { NOTIFICATIONS_CSS } from '../styles/notifications-css.js'

const section = (key, title, description, body) => jsxs('section', { className: 'dockyard-app-settings-section', 'data-app-setting': key, children: [
  jsxs('header', { children: [jsx('h2', { children: title }), description ? jsx('p', { children: description }) : null] }),
  body,
] }, key)

export function AppSettingsView({ view, selectedProject, onOpenProjectSettings, onForgetProject, onRefresh }) {
  const projects = view.projects ?? []
  const nameOf = (id) => projects.find((project) => project.id === id)?.name || id
  const [lastProject, setLastProject] = useState(view.lastProject ?? null)
  const [collapsed, setCollapsed] = useState(view.ui?.collapsed ?? [])
  const [policy, setPolicy] = useState(view.notificationPolicy ?? null)
  const [busy, setBusy] = useState(null)
  const [policyError, setPolicyError] = useState(null)

  const forgetProject = async () => {
    setBusy('opening')
    try {
      await api('/settings/last-project', { method: 'PUT', body: { project_id: null }, quiet: true })
      setLastProject(null)
      onForgetProject?.()
      emitToast('success', 'The app will open on the project that needs most attention.')
    } catch {
      emitToast('danger', 'That change was not saved. Try again.')
    }
    setBusy(null)
  }
  const setFolded = async (folded) => {
    const before = collapsed
    const next = folded ? ['needs-you-now'] : []
    setCollapsed(next)
    try {
      await api('/settings/ui', { method: 'PUT', body: { collapsed: next }, quiet: true })
    } catch {
      setCollapsed(before)
      emitToast('danger', 'That change was not saved. Try again.')
    }
  }
  // Same save as the Notifications screen: the read shape carries read-only
  // annotations (ignored keys, the zone); the save contract takes policy keys only.
  const saveNotifications = async (patch) => {
    setBusy('notifications')
    setPolicyError(null)
    const { ignored: _ignored, timezone: _timezone, ...base } = policy ?? {}
    const next = { ...base, ...patch }
    setPolicy(next)
    try {
      const result = await api('/settings/notifications', { method: 'PUT', body: { actor_id: 'desktop', policy: next } })
      setPolicy(result.policy ?? next)
    } catch (failure) {
      setPolicyError(String(failure?.message ?? failure))
    }
    setBusy(null)
  }

  return jsxs('div', { className: 'dockyard-app-settings', 'data-app-settings': true, children: [
    jsx('style', { 'data-dy-notifications': 'true', children: NOTIFICATIONS_CSS }),
    jsx(PageHead, { title: 'App settings', description: 'Settings for the whole app. Each project keeps its own settings in Projects > Settings.', onRefresh }),
    selectedProject ? jsxs('p', { className: 'dockyard-app-settings-project', 'data-app-settings-project': selectedProject, children: [
      jsx('span', { children: `${nameOf(selectedProject)} has its own settings: mission, lead, members, autonomy and checks.` }),
      jsx(Button, { small: true, action: 'open-project-settings', onClick: onOpenProjectSettings, children: 'Open project settings' }),
    ] }) : null,
    section('opening', 'When the app opens', null, lastProject
      ? jsxs(Fragment, { children: [
          jsx('p', { 'data-opening-project': lastProject, children: `It opens on the last project you chose: ${nameOf(lastProject)}.` }),
          jsx(Button, { small: true, action: 'forget-last-project', disabled: busy === 'opening', onClick: forgetProject, children: 'Forget it' }),
        ] })
      : jsx('p', { 'data-opening-project': '', children: 'It opens on the project that needs most attention, until you choose one.' })),
    section('dashboard', 'Dashboard', null, jsxs('label', { className: 'dockyard-app-settings-check', children: [
      jsx('input', { type: 'checkbox', 'data-app-setting-fold': 'needs-you-now', checked: collapsed.includes('needs-you-now'), onChange: (event) => setFolded(event.target.checked) }),
      jsx('span', { children: 'Keep "Needs you now" folded' }),
    ] })),
    section('notifications', 'Notifications for every project', 'A project can change these in its own settings.',
      jsx(NotificationSettings, { settings: policy, busy: busy === 'notifications', error: policyError, onSave: saveNotifications })),
    section('appearance', 'Appearance', null, jsx('p', { children: 'Dockyard follows Hermes Desktop: light or dark.' })),
  ] })
}
