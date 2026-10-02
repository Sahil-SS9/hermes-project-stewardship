// GENERATED-STRUCTURE: hand-edited Desktop module. Edit this file, then run
// node hermes_dockyard_plugin/desktop/build.mjs to regenerate plugin.js.
// Batch E5: notifications screen — filters, day groups, detail panel, settings
// panel. Data comes from the real /notifications endpoints (E4); every action
// goes through the api() helper so busy states and toasts stay consistent.
import { useState } from '../runtime/react.js'
import { severityTone } from '../lib/ui.js'
import { api } from '../runtime/context.js'
import { formatWhen } from '../lib/ui.js'
import { jsxs } from '../runtime/react.js'
import { jsx } from '../runtime/react.js'
import { Icon } from '../lib/ui.js'
import { Button } from '../lib/ui.js'
import { StatusTag } from '../lib/ui.js'
import { number } from '../lib/ui.js'
import { Fragment } from '../runtime/react.js'
import { PageHead } from '../lib/ui.js'
import { EmptyState } from '../lib/ui.js'
import { NOTIFICATIONS_CSS } from '../styles/notifications-css.js'

const SEVERITIES = ['info', 'low', 'medium', 'high', 'critical']
const KIND_LABELS = {
  approval_required: 'Approvals',
  health_change: 'Health',
  alert: 'Alerts',
}
const STATE_LABELS = { new: 'New', seen: 'Seen', resolved: 'Resolved' }
const PAGE_SIZE = 50

const kindLabel = (kind) => KIND_LABELS[kind] ?? 'Other'

function dayBucket(createdAt) {
  const value = String(createdAt || '')
  const stamp = Date.parse(value)
  if (!Number.isFinite(stamp)) return 'Earlier'
  const day = new Date(stamp)
  day.setHours(0, 0, 0, 0)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const diff = Math.round((today.getTime() - day.getTime()) / 86400000)
  if (diff <= 0) return 'Today'
  if (diff === 1) return 'Yesterday'
  return 'Earlier'
}

export function NotificationsView({ view, onRefresh, onAcknowledged: onChanged, onOpen }) {
  const [stateFilter, setStateFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [severityFilter, setSeverityFilter] = useState('all')
  const [projectFilter, setProjectFilter] = useState('all')
  const [selectedId, setSelectedId] = useState(null)
  const [resolveOpen, setResolveOpen] = useState(false)
  const [resolveNote, setResolveNote] = useState('')
  const [busyId, setBusyId] = useState(null)
  const [settings, setSettings] = useState(view.settings ?? null)
  const [settingsBusy, setSettingsBusy] = useState(false)
  const [settingsError, setSettingsError] = useState(null)
  const [actionError, setActionError] = useState(null)
  const [visible, setVisible] = useState(PAGE_SIZE)
  // Rows the user marked seen / resolved this session: applied over the view
  // data so the list stays honest even when the parent's refresh path is slow
  // or (in embedded runtimes) static.
  const [localStates, setLocalStates] = useState({})

  const all = (view.notifications ?? []).slice().map((note) => {
    const override = localStates[note.id]
    if (!override) return note
    if (override === 'seen') return { ...note, state: 'seen', acked: true }
    return { ...note, state: 'resolved', resolved_at: note.resolved_at ?? new Date().toISOString(), resolved_by: note.resolved_by ?? 'desktop', resolution: 'manual' }
  })
  const projects = []
  for (const note of all) {
    const key = note.project || 'Fleet'
    if (!projects.some((p) => p.key === key)) {
      projects.push({ key, count: all.filter((n) => (n.project || 'Fleet') === key).length })
    }
  }
  const filtered = all.filter((note) => {
    if (stateFilter !== 'all' && (note.state ?? (note.acked ? 'seen' : 'new')) !== stateFilter) return false
    if (typeFilter !== 'all') {
      if (typeFilter === 'other' && KIND_LABELS[note.kind]) return false
      if (typeFilter !== 'other' && note.kind !== typeFilter) return false
    }
    if (severityFilter !== 'all' && String(note.severity || 'info').toLowerCase() !== severityFilter) return false
    if (projectFilter !== 'all' && (note.project || 'Fleet') !== projectFilter) return false
    return true
  })
  filtered.sort((left, right) => String(right.created_at || '').localeCompare(String(left.created_at || '')))
  const shown = filtered.slice(0, visible)
  const selected = filtered.find((note) => note.id === selectedId) ?? null
  const newCount = all.filter((note) => (note.state ?? (note.acked ? 'seen' : 'new')) === 'new').length

  const markSeen = async (note) => {
    setBusyId(note.id)
    setActionError(null)
    try {
      await api(`/notifications/${note.id}/ack`, { method: 'POST', body: { actor_id: 'desktop' } })
      setLocalStates((current) => ({ ...current, [note.id]: 'seen' }))
      onChanged?.(note.id)
      onRefresh?.()
    } catch (failure) {
      setActionError(String(failure?.message ?? failure))
    }
    setBusyId(null)
  }
  const resolve = async (note) => {
    setBusyId(note.id)
    setActionError(null)
    try {
      await api(`/notifications/${note.id}/resolve`, {
        method: 'POST',
        body: { actor_id: 'desktop', note: resolveNote },
      })
      setResolveOpen(false)
      setResolveNote('')
      setLocalStates((current) => ({ ...current, [note.id]: 'resolved' }))
      onChanged?.(note.id)
      onRefresh?.()
    } catch (failure) {
      setActionError(String(failure?.message ?? failure))
    }
    setBusyId(null)
  }
  const markAllSeen = async () => {
    setBusyId('all')
    setActionError(null)
    try {
      await api('/notifications/ack-all', {
        method: 'POST',
        body: {
          actor_id: 'desktop',
          ...(projectFilter !== 'all' ? { project_id: projectFilter } : {}),
          ...(typeFilter !== 'all' && KIND_LABELS[typeFilter] ? { kind: typeFilter } : {}),
          ...(severityFilter !== 'all' ? { severity: severityFilter } : {}),
        },
      })
      onRefresh?.()
    } catch (failure) {
      setActionError(String(failure?.message ?? failure))
    }
    setBusyId(null)
  }
  const saveSettings = async (patch) => {
    setSettingsBusy(true)
    setSettingsError(null)
    // The read shape carries read-only annotations (ignored keys, the zone);
    // the save contract accepts policy keys only.
    const { ignored: _ignored, timezone: _timezone, ...base } = settings ?? {}
    const next = { ...base, ...patch }
    setSettings(next)
    try {
      const result = await api('/settings/notifications', {
        method: 'PUT',
        body: { actor_id: 'desktop', policy: next },
      })
      setSettings(result.policy ?? next)
    } catch (failure) {
      setSettingsError(String(failure?.message ?? failure))
    }
    setSettingsBusy(false)
  }

  const groups = []
  for (const note of shown) {
    const bucket = dayBucket(note.created_at)
    let group = groups.find((g) => g.title === bucket)
    if (!group) { group = { title: bucket, items: [] }; groups.push(group) }
    group.items.push(note)
  }

  const filterEmpty = all.length > 0 && filtered.length === 0
  return jsxs(Fragment, { children: [
    jsx('style', { 'data-dy-notifications': 'true', children: NOTIFICATIONS_CSS }),
    jsx(PageHead, {
      title: 'Notifications',
      description: 'Fleet events: approvals, health and alerts, with their history.',
      status: newCount > 0 ? `${number(newCount)} new` : null,
      onRefresh,
    }),
    jsxs('div', { className: 'dy-notif-toolbar', children: [
      jsxs('div', { className: 'dy-notif-filters', role: 'group', 'aria-label': 'Notification filters', children: [
        jsx('label', { className: 'dy-notif-filter', children:
          jsx('select', { 'aria-label': 'Filter by state', value: stateFilter, onChange: (e) => { setStateFilter(e.target.value); setVisible(PAGE_SIZE) }, children:
            ['all', 'new', 'seen', 'resolved'].map((value) => jsx('option', { value, children: value === 'all' ? 'All states' : STATE_LABELS[value] }, value)) }) }),
        jsx('label', { className: 'dy-notif-filter', children:
          jsx('select', { 'aria-label': 'Filter by type', value: typeFilter, onChange: (e) => { setTypeFilter(e.target.value); setVisible(PAGE_SIZE) }, children:
            [['all', 'All types'], ['approval_required', 'Approvals'], ['health_change', 'Health'], ['alert', 'Alerts'], ['other', 'Other']].map(([value, label]) => jsx('option', { value, children: label }, value)) }) }),
        jsx('label', { className: 'dy-notif-filter', children:
          jsx('select', { 'aria-label': 'Filter by severity', value: severityFilter, onChange: (e) => { setSeverityFilter(e.target.value); setVisible(PAGE_SIZE) }, children:
            [['all', 'All severities'], ...SEVERITIES.map((s) => [s, s])].map(([value, label]) => jsx('option', { value, children: label }, value)) }) }),
        jsx('label', { className: 'dy-notif-filter', children:
          jsx('select', { 'aria-label': 'Filter by project', value: projectFilter, onChange: (e) => { setProjectFilter(e.target.value); setVisible(PAGE_SIZE) }, children:
            [['all', 'All projects'], ...projects.map((p) => [p.key, `${p.key} (${p.count})`])].map(([value, label]) => jsx('option', { value, children: label }, value)) }) }),
      ]}),
      jsx('span', { className: 'dy-notif-spacer' }),
      jsx(Button, {
        action: 'ack-all',
        small: true,
        disabled: busyId === 'all' || filtered.length === 0,
        onClick: markAllSeen,
        children: busyId === 'all' ? 'Marking…' : 'Mark all as seen',
      }),
    ]}),
    filterEmpty
      ? jsx(EmptyState, { title: 'Nothing matches these filters', description: 'Loosen or reset the filters to see more of the history.', icon: 'bell' })
      : all.length === 0
        ? jsx(EmptyState, { title: 'No notifications yet', description: 'Fleet events will appear here when work changes state or needs attention.', icon: 'bell' })
        : jsxs('div', { className: 'dy-notif-layout', 'data-panel': selected ? 'open' : 'none', children: [
          jsxs('div', { children: [
            groups.map((group) => jsxs('section', { className: 'dockyard-feed-group', children: [
              jsxs('div', { className: 'dockyard-feed-head', children: [
                jsx('h2', { className: 'dy-notif-day', children: group.title }),
                jsx('span', { className: 'dockyard-section-count', children: number(group.items.length) }),
              ]}),
              group.items.map((note) => jsx(NotificationRow, {
                note,
                busy: busyId === note.id,
                selected: note.id === selectedId,
                onSelect: () => { setSelectedId(note.id === selectedId ? null : note.id); setResolveOpen(false) },
                onSeen: () => markSeen(note),
                onOpen,
              }, String(note.id))),
            ]}, group.title)),
            filtered.length > visible
              ? jsx(Button, { action: 'load-more', className: 'dy-notif-more', onClick: () => setVisible((v) => v + PAGE_SIZE), children: 'Load more' })
              : null,
          ]}),
          selected
            ? jsx(NotificationDetail, {
              note: selected,
              busy: busyId === selected.id,
              resolveOpen,
              onResolveToggle: () => setResolveOpen((open) => !open),
              resolveNote,
              onResolveNote: setResolveNote,
              onResolve: () => resolve(selected),
              onSeen: () => markSeen(selected),
              onOpen,
            })
            : null,
        ]}),
    all.length > 0 ? jsx(NotificationSettings, {
      settings, busy: settingsBusy, error: settingsError, onSave: saveSettings,
    }) : null,
    actionError ? jsx('p', { className: 'dockyard-inline-error', role: 'alert', children: `Action failed: ${actionError}` }) : null,
  ]})
}

export function NotificationRow({ note, busy, selected, onSelect, onSeen, onOpen }) {
  const tone = severityTone(note.severity)
  const state = note.state ?? (note.acked ? 'seen' : 'new')
  const when = formatWhen(note.created_at)
  return jsxs('article', {
    className: 'dockyard-notification-row',
    'data-notification-id': String(note.id),
    'data-notification-state': state,
    'data-selected': selected ? 'true' : 'false',
    children: [
      jsx('button', {
        type: 'button',
        className: 'dockyard-notification-main dy-notif-row-btn',
        'aria-expanded': selected ? 'true' : 'false',
        onClick: onSelect,
        children: jsxs('span', { className: 'dy-notif-row-inner', children: [
          jsx('span', { className: `dockyard-notification-marker ${tone}`, 'aria-hidden': 'true', children: jsx(Icon, { name: tone === 'danger' || tone === 'warning' ? 'alert' : 'bell' }) }),
          jsxs('span', { children: [
            jsxs('span', { className: 'dy-notif-row-titleline', children: [
              jsx('strong', { children: note.title ?? 'Fleet notification' }),
              jsx(StatusTag, { tone: state === 'new' ? 'info' : 'neutral', label: STATE_LABELS[state] ?? state }),
            ]}),
            jsx('p', { children: note.body ?? '' }),
            jsx('span', { className: 'dockyard-meta', children: `${note.project || 'Fleet'} · ${kindLabel(note.kind)} · ${note.severity}${when ? ` · ${when}` : ''}` }),
          ]}),
        ]}),
      }),
      jsxs('div', { className: 'dockyard-notification-action', children: [
        typeof onOpen === 'function' && note.deep_link
          ? jsx(Button, { action: 'open', small: true, onClick: () => onOpen(note.deep_link), children: 'Open' })
          : null,
        state === 'new'
          ? jsx(Button, { action: 'mark-seen', small: true, disabled: busy, onClick: onSeen, children: busy ? 'Working…' : 'Mark seen' })
          : null,
      ]}),
    ],
  })
}

export function NotificationDetail({ note, busy, resolveOpen, onResolveToggle, resolveNote, onResolveNote, onResolve, onSeen, onOpen }) {
  const state = note.state ?? (note.acked ? 'seen' : 'new')
  const resolvedBy = note.resolved_by
  const seenBy = note.acked_by
  return jsxs('aside', { className: 'dy-notif-detail', 'data-notification-detail': String(note.id), 'aria-label': 'Notification detail', children: [
    jsxs('h3', { children: [note.title ?? 'Fleet notification', ' ', jsx(StatusTag, { tone: state === 'new' ? 'info' : 'neutral', label: STATE_LABELS[state] ?? state }) ]}),
    jsx('p', { children: note.body ?? '' }),
    jsx('span', { className: 'dockyard-meta', children: `Project: ${note.project || 'Fleet'}` }),
    jsx('span', { className: 'dockyard-meta', children: `Type: ${kindLabel(note.kind)} · Severity: ${note.severity}` }),
    jsx('span', { className: 'dockyard-meta', children: `Created: ${formatWhen(note.created_at)}` }),
    seenBy ? jsx('span', { className: 'dockyard-meta', children: `Seen by ${seenBy}${note.acked_at ? ` at ${formatWhen(note.acked_at)}` : ''}` }) : null,
    resolvedBy ? jsxs('span', { className: 'dockyard-meta', children: [
      `Resolved by ${resolvedBy}${note.resolved_at ? ` at ${formatWhen(note.resolved_at)}` : ''}`,
      note.resolution ? ` (${note.resolution})` : '',
      note.resolution_note ? ` — “${note.resolution_note}”` : '',
    ]}) : null,
    jsxs('div', { className: 'dy-notif-detail-actions', children: [
      typeof onOpen === 'function' && note.deep_link
        ? jsx(Button, { action: 'detail-open', small: true, onClick: () => onOpen(note.deep_link), children: 'Open item' })
        : null,
      state === 'new'
        ? jsx(Button, { action: 'detail-seen', small: true, disabled: busy, onClick: onSeen, children: busy ? 'Working…' : 'Mark seen' })
        : null,
      state !== 'resolved'
        ? jsx(Button, { action: 'detail-resolve', small: true, disabled: busy, onClick: onResolveToggle, 'aria-expanded': resolveOpen ? 'true' : 'false', children: 'Resolve' })
        : null,
      note.kind === 'approval_required' && note.ref
        ? jsx(Button, { action: 'detail-approval', small: true, onClick: () => onOpen?.(`/dockyard/inbox?project=${encodeURIComponent(note.project || '')}`), children: 'Review in Approval Inbox' })
        : null,
    ]}),
    resolveOpen && state !== 'resolved'
      ? jsxs(Fragment, { children: [
        jsx('textarea', {
          className: 'dy-notif-resolve-note',
          'aria-label': 'Resolution note',
          placeholder: 'Resolution note (optional)',
          value: resolveNote,
          maxLength: 2000,
          onChange: (e) => onResolveNote(e.target.value),
        }),
        jsx(Button, { action: 'detail-resolve-confirm', variant: 'primary', small: true, disabled: busy, onClick: onResolve, children: busy ? 'Resolving…' : 'Confirm resolve' }),
      ]})
      : null,
  ]})
}

export function NotificationSettings({ settings, busy, error, onSave }) {
  const value = settings ?? {}
  const channels = value.channels ?? {}
  const desktop = channels.desktop ?? {}
  const quiet = value.quiet_hours ?? {}
  const bypass = value.bypass_quiet_hours ?? ['approval_required']
  const approvalsBypass = bypass.includes('approval_required')
  return jsxs('aside', { className: 'dy-notif-settings', 'data-notification-settings': 'true', 'aria-label': 'Notification settings', children: [
    jsx('h3', { children: 'Notification settings' }),
    jsxs('div', { className: 'dy-notif-setting', children: [
      jsx('label', { htmlFor: 'dy-notif-min-severity', children: 'Minimum severity' }),
      jsx('select', { id: 'dy-notif-min-severity', value: channels.in_app?.min_severity ?? 'low', disabled: busy, onChange: (e) => onSave({ channels: { ...channels, in_app: { ...(channels.in_app ?? {}), min_severity: e.target.value } } }), children:
        SEVERITIES.map((s) => jsx('option', { value: s, children: s }, s)) }),
    ]}),
    jsxs('div', { className: 'dy-notif-setting', children: [
      jsx('label', { htmlFor: 'dy-notif-popups-enabled', children: 'Pop-ups' }),
      jsx('select', { id: 'dy-notif-popups-enabled', value: desktop.enabled === false ? 'off' : 'on', disabled: busy, onChange: (e) => onSave({ channels: { ...channels, desktop: { ...desktop, enabled: e.target.value === 'on' } } }), children:
        [['on', 'On'], ['off', 'Off']].map(([v, label]) => jsx('option', { value: v, children: label }, v)) }),
    ]}),
    jsxs('div', { className: 'dy-notif-setting', children: [
      jsx('label', { htmlFor: 'dy-notif-popups-severity', children: 'Pop-up minimum severity' }),
      jsx('select', { id: 'dy-notif-popups-severity', value: desktop.min_severity ?? 'high', disabled: busy, onChange: (e) => onSave({ channels: { ...channels, desktop: { ...desktop, min_severity: e.target.value } } }), children:
        SEVERITIES.map((s) => jsx('option', { value: s, children: s }, s)) }),
    ]}),
    jsxs('div', { className: 'dy-notif-setting', children: [
      jsx('label', { htmlFor: 'dy-notif-quiet-start', children: 'Quiet hours' }),
      jsx('input', { id: 'dy-notif-quiet-start', type: 'time', value: quiet.start ?? '', disabled: busy, onChange: (e) => onSave({ quiet_hours: { ...(quiet || {}), start: e.target.value, end: quiet.end ?? '' } }) }),
      jsx('span', { children: '→' }),
      jsx('input', { 'aria-label': 'Quiet hours end', type: 'time', value: quiet.end ?? '', disabled: busy, onChange: (e) => onSave({ quiet_hours: { ...(quiet || {}), start: quiet.start ?? '', end: e.target.value } }) }),
    ]}),
    jsxs('div', { className: 'dy-notif-setting', children: [
      jsx('input', { id: 'dy-notif-bypass', type: 'checkbox', checked: approvalsBypass, disabled: busy, onChange: (e) => {
        const next = e.target.checked
          ? Array.from(new Set([...bypass, 'approval_required']))
          : bypass.filter((k) => k !== 'approval_required')
        onSave({ bypass_quiet_hours: next })
      } }),
      jsx('label', { htmlFor: 'dy-notif-bypass', children: 'Approvals ignore quiet hours' }),
    ]}),
    jsx('p', { className: 'dy-notif-override-link', children: 'Per-project overrides: pick a project, then Projects \u2192 Settings.' }),
    error ? jsx('p', { className: 'dockyard-inline-error', role: 'alert', children: `Could not save: ${error}` }) : null,
  ]})
}
