// GENERATED-STRUCTURE: hand-edited Desktop module. Edit this file, then run
// node hermes_dockyard_plugin/desktop/build.mjs to regenerate plugin.js.
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
import { SEVERITY_PRIORITY } from '../data/loaders.js'
export function NotificationRow({ note, onAcknowledged, onOpen }) {
  const [state, setState] = useState(note.acked ? 'cleared' : 'unread')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const tone = severityTone(note.severity)
  const acknowledge = async () => {
    setBusy(true)
    setError(null)
    try {
      await api(`/notifications/${note.id}/ack`, { method: 'POST', body: {} })
      setState('cleared')
      onAcknowledged(note.id)
    } catch (failure) {
      setError(String(failure?.message ?? failure))
    }
    setBusy(false)
  }
  const when = formatWhen(note.created_at)
  return jsxs('article', { className: 'dockyard-notification-row', 'data-notification-id': String(note.id), 'data-notification-state': state, children: [
    jsx('span', { className: `dockyard-notification-marker ${tone}`, children: jsx(Icon, { name: tone === 'danger' || tone === 'warning' ? 'alert' : 'bell' }) }),
    jsxs('div', { className: 'dockyard-notification-main', children: [
      jsx('h3', { children: note.title ?? 'Fleet notification' }),
      jsx('p', { children: note.body ?? '' }),
      jsx('span', { className: 'dockyard-meta', children: `${note.project || 'Fleet'}${when ? ` / ${when}` : ''}` }),
    ]}),
    jsxs('div', { className: 'dockyard-notification-action', children: [
      typeof onOpen === 'function' && note.deep_link
        ? jsx(Button, { action: 'open', small: true, onClick: () => onOpen(note.deep_link), children: 'Open' })
        : null,
      state === 'cleared'
        ? jsx(StatusTag, { tone: 'neutral', label: 'Cleared' })
        : jsx(Button, { action: 'acknowledge', small: true, disabled: busy, onClick: acknowledge, children: busy ? 'Clearing...' : 'Acknowledge' }),
    ]}),
    error ? jsx('p', { className: 'dockyard-inline-error', children: `Could not clear: ${error}` }) : null,
  ]})
}

export function NotificationGroup({ title, description, items, onAcknowledged, onOpen }) {
  return jsxs('section', { className: 'dockyard-feed-group', children: [
    jsxs('div', { className: 'dockyard-feed-head', children: [
      jsxs('div', { children: [jsx('h2', { children: title }), jsx('p', { children: description })] }),
      jsx('span', { className: 'dockyard-section-count', children: number(items.length) }),
    ]}),
    items.map((note) => jsx(NotificationRow, { note, onAcknowledged, onOpen }, String(note.id))),
  ]})
}

export function NotificationsView({ view, onRefresh, onAcknowledged, onOpen }) {
  const notes = view.notifications ?? []
  if (notes.length === 0) {
    return jsxs(Fragment, { children: [
      jsx(PageHead, { title: 'Notifications', description: 'Attributed fleet events and their cleared history.', onRefresh }),
      jsx(EmptyState, { title: 'No notifications yet', description: 'Fleet events will appear here when work changes state or needs attention.', icon: 'bell' }),
    ]})
  }
  const unread = notes.filter((note) => !note.acked).sort((left, right) => {
    const severity = (SEVERITY_PRIORITY[String(left.severity || 'info').toLowerCase()] ?? 3)
      - (SEVERITY_PRIORITY[String(right.severity || 'info').toLowerCase()] ?? 3)
    return severity !== 0 ? severity : String(right.created_at || '').localeCompare(String(left.created_at || ''))
  })
  const cleared = notes.filter((note) => note.acked).sort((left, right) => String(right.created_at || '').localeCompare(String(left.created_at || '')))
  return jsxs(Fragment, { children: [
    jsx(PageHead, {
      title: 'Notifications',
      description: 'Attributed fleet events and their cleared history.',
      status: unread.length > 0 ? `${number(unread.length)} unread` : null,
      onRefresh,
    }),
    unread.length > 0 ? jsx(NotificationGroup, { title: 'Needs attention', description: 'Unread fleet events.', items: unread, onAcknowledged, onOpen }) : null,
    cleared.length > 0 ? jsx(NotificationGroup, { title: 'Cleared', description: 'Acknowledged events remain available for context.', items: cleared, onAcknowledged, onOpen }) : null,
  ]})
}
