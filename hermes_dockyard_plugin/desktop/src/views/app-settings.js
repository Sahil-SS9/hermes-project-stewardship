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
import { ArchivedProjectsList } from './archived-projects.js'
import { NOTIFICATIONS_CSS } from '../styles/notifications-css.js'
import { ALL_PROJECTS } from '../lib/project-switcher.js'
import { THEMES } from '../styles/themes.js'
import { FONTS } from '../styles/themes.js'
import { THEME_ART } from '../styles/theme-assets.js'
import { LIGHT_TOKENS } from '../styles/tokens.js'
import { DARK_TOKENS } from '../styles/tokens.js'

// Arrow keys move a radio group's choice (and apply it, like any radio group).
const moveChoice = (event, ids, current, choose) => {
  const index = Math.max(0, ids.indexOf(current))
  const last = ids.length - 1
  const next = ['ArrowRight', 'ArrowDown'].includes(event.key) ? Math.min(last, index + 1)
    : ['ArrowLeft', 'ArrowUp'].includes(event.key) ? Math.max(0, index - 1)
    : event.key === 'Home' ? 0 : event.key === 'End' ? last : null
  if (next === null) return
  event.preventDefault()
  choose(ids[next])
  event.currentTarget.parentElement?.querySelectorAll('[role="radio"]')[next]?.focus()
}

// A miniature of the theme: page (with its background art), bar, card, accent.
function ThemePreview({ theme }) {
  const half = (tokens, key) => jsxs('span', { style: { position: 'relative', background: tokens.bg }, children: [
    jsx('span', { className: 'bar', style: { background: tokens.surface, left: 6, right: 6 } }),
    jsxs('span', { className: 'card', style: { background: tokens.surface, left: 6, right: 18 }, children: [
      jsx('i', { style: { background: tokens.text, width: '70%' } }), jsx('i', { style: { background: tokens.textSecondary, width: '50%' } })] }),
    jsx('span', { className: 'accent', style: { background: tokens.action, right: 4, width: 12, height: 12 } }),
  ] }, key)
  if (!theme.tokens) return jsxs('span', { className: 'dy-theme-preview split', 'aria-hidden': true, children: [half(LIGHT_TOKENS, 'light'), half(DARK_TOKENS, 'dark')] })
  const t = theme.tokens
  const art = theme.art ? THEME_ART[theme.art] : null
  return jsxs('span', { className: 'dy-theme-preview', 'aria-hidden': true,
    style: { backgroundColor: t.bg, backgroundImage: art ? `url("${art}")` : 'none' }, children: [
      jsx('span', { className: 'bar', style: { background: t.surface, opacity: art ? 0.85 : 1 } }),
      jsxs('span', { className: 'card', style: { background: t.surface, border: `1px solid ${t.border}` }, children: [
        jsx('i', { style: { background: t.text, width: '72%' } }),
        jsx('i', { style: { background: t.textSecondary, width: '54%' } }),
        jsx('i', { style: { background: t.success, width: '26%' } }),
      ] }),
      jsx('span', { className: 'accent', style: { background: t.action } }),
    ] })
}

function AppearanceSettings({ appearance, onAppearance }) {
  const theme = appearance?.theme ?? 'auto'
  const font = appearance?.font ?? 'system'
  const chooseTheme = (id) => { if (id !== theme) onAppearance?.({ theme: id }) }
  const chooseFont = (id) => { if (id !== font) onAppearance?.({ font: id }) }
  return jsxs(Fragment, { children: [
    jsx('h3', { className: 'dockyard-app-settings-sub', id: 'dy-appearance-theme', children: 'Theme' }),
    jsx('div', { className: 'dy-theme-grid', role: 'radiogroup', 'aria-labelledby': 'dy-appearance-theme', children: THEMES.map((option) =>
      jsxs('button', {
        type: 'button', role: 'radio', className: 'dy-theme-card', 'aria-checked': option.id === theme, 'data-theme-choice': option.id,
        tabIndex: option.id === theme ? 0 : -1,
        onClick: () => chooseTheme(option.id),
        onKeyDown: (event) => moveChoice(event, THEMES.map((entry) => entry.id), theme, chooseTheme),
        children: [
          jsx(ThemePreview, { theme: option }),
          jsxs('span', { className: 'dy-theme-name', children: [
            jsx('strong', { children: option.name }),
            jsx('span', { children: option.mode === 'auto' ? 'Light or dark' : option.art ? `${option.mode} · art` : option.mode }),
          ] }),
        ],
      }, option.id)) }),
    jsx('p', { className: 'dy-appearance-note', children: theme === 'auto'
      ? 'Match Hermes: light or dark, the same as Hermes Desktop, and it changes when Hermes does.'
      : 'The theme applies to the whole app straight away, for everyone using this Hermes.' }),
    jsx('h3', { className: 'dockyard-app-settings-sub', id: 'dy-appearance-font', children: 'Typeface' }),
    jsx('div', { className: 'dy-font-grid', role: 'radiogroup', 'aria-labelledby': 'dy-appearance-font', children: FONTS.map((option) =>
      jsxs('button', {
        type: 'button', role: 'radio', className: 'dy-font-card', 'aria-checked': option.id === font, 'data-font-choice': option.id,
        tabIndex: option.id === font ? 0 : -1,
        style: { fontFamily: option.family },
        onClick: () => chooseFont(option.id),
        onKeyDown: (event) => moveChoice(event, FONTS.map((entry) => entry.id), font, chooseFont),
        children: [jsx('span', { className: 'sample', 'aria-hidden': true, children: 'Aa 123' }), jsx('strong', { children: option.name })],
      }, option.id)) }),
  ] })
}

const section = (key, title, description, body) => jsxs('section', { className: 'dockyard-app-settings-section', 'data-app-setting': key, children: [
  jsxs('header', { children: [jsx('h2', { children: title }), description ? jsx('p', { children: description }) : null] }),
  body,
] }, key)

export function AppSettingsView({ view, selectedProject, appearance, onAppearance, onOpenProjectSettings, onForgetProject, onRefresh, showArchived = false, onRestored, onArchivedCount }) {
  const projects = view.projects ?? []
  const nameOf = (id) => id === ALL_PROJECTS ? 'All projects' : projects.find((project) => project.id === id)?.name || id
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
      emitToast('success', 'The app will open on All projects.')
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
          jsx('p', { 'data-opening-project': lastProject, children: lastProject === ALL_PROJECTS
            ? 'It opens on All projects, your last choice in the switcher.'
            : `It opens on the last project you chose: ${nameOf(lastProject)}.` }),
          jsx(Button, { small: true, action: 'forget-last-project', disabled: busy === 'opening', onClick: forgetProject, children: 'Forget it' }),
        ] })
      : jsx('p', { 'data-opening-project': '', children: 'It opens on All projects, until you choose in the switcher.' })),
    section('dashboard', 'Dashboard', null, jsxs('label', { className: 'dockyard-app-settings-check', children: [
      jsx('input', { type: 'checkbox', 'data-app-setting-fold': 'needs-you-now', checked: collapsed.includes('needs-you-now'), onChange: (event) => setFolded(event.target.checked) }),
      jsx('span', { children: 'Keep "Needs you now" folded' }),
    ] })),
    section('notifications', 'Notifications for every project', 'A project can change these in its own settings.',
      jsx(NotificationSettings, { settings: policy, busy: busy === 'notifications', error: policyError, onSave: saveNotifications })),
    // Sahil 05/10 (demo feedback h): the September themes, backgrounds and fonts.
    section('appearance', 'Appearance', 'Colour theme and typeface for the whole app.', jsx(AppearanceSettings, { appearance, onAppearance })),
    // Archived projects are hidden everywhere else; restore them here (11/10/2026).
    showArchived
      ? section('archived', 'Archived projects', 'Hidden everywhere else, and nothing was deleted. Restore brings a project back exactly as it was archived.',
          jsx(ArchivedProjectsList, { onRestored, onCount: onArchivedCount }))
      : null,
  ] })
}
