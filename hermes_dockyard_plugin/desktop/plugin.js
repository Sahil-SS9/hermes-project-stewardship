/**
 * Hermes Dockyard — desktop runtime plugin (Option B surface).
 * Loaded through the runtime disk door: ~/.hermes/plugins/hermes-dockyard/desktop/plugin.js
 * (unified agent-plugin half; plain ESM + jsx() calls, specifiers rewritten to SDK shims).
 */
import { jsx, jsxs, Fragment } from 'react/jsx-runtime'
import { host } from '@hermes/plugin-sdk'
import { useEffect, useState } from 'react'

function EmptyState({ icon, title, description, action }) {
  return jsxs('div', {
    style: {
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      gap: 12, padding: '64px 24px', textAlign: 'center', minHeight: '50vh',
    },
    children: [
      jsx('div', {
        style: {
          width: 56, height: 56, borderRadius: '50%',
          background: 'var(--ui-bg-active, #2a2f3a)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        },
        children: icon,
      }),
      jsx('div', { style: { fontSize: 16, fontWeight: 600 }, children: title }),
      description && jsx('div', {
        style: { fontSize: 13, opacity: 0.65, maxWidth: 360, lineHeight: 1.5 },
        children: description,
      }),
      action,
    ],
  })
}

const icons = {
  grid: jsx('svg', { width: 24, height: 24, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor',
    strokeWidth: 1.5, style: { opacity: 0.5 },
    children: [
      jsx('rect', { x: 3, y: 3, width: 7, height: 7, rx: 1 }),
      jsx('rect', { x: 14, y: 3, width: 7, height: 7, rx: 1 }),
      jsx('rect', { x: 3, y: 14, width: 7, height: 7, rx: 1 }),
      jsx('rect', { x: 14, y: 14, width: 7, height: 7, rx: 1 }),
    ]}),
  inbox: jsx('svg', { width: 24, height: 24, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor',
    strokeWidth: 1.5, style: { opacity: 0.5 },
    children: [
      jsx('path', { d: 'M22 12h-6l-2 3h-4l-2-3H2' }),
      jsx('path', { d: 'M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z' }),
    ]}),
  bell: jsx('svg', { width: 24, height: 24, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor',
    strokeWidth: 1.5, style: { opacity: 0.5 },
    children: [
      jsx('path', { d: 'M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9' }),
      jsx('path', { d: 'M10.3 21a1.94 1.94 0 0 0 3.4 0' }),
    ]}),
}

let _rest = null
function bindRest(ctx) { _rest = ctx.rest }

async function api(path, init) {
  try {
    return await _rest(path, { method: init?.method ?? 'GET', body: init?.body })
  } catch (e) {
    throw new Error(String(e?.message ?? e).slice(0, 120))
  }
}

function DashboardPage() {
  const [tab, setTab] = useState('dashboard')
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    let live = true
    setError(null)
    const path =
      tab === 'dashboard' ? '/dashboard' :
      tab === 'inbox' ? '/inbox' : '/notifications'
    api(path).then(
      (d) => { if (live) setData(d) },
      (e) => { if (live) setError(String(e)) },
    )
    return () => { live = false }
  }, [tab])

  const tabs = ['dashboard', 'inbox', 'notifications']

  return jsxs('div', {
    style: { padding: 16, fontFamily: 'system-ui, sans-serif', display: 'flex', flexDirection: 'column', gap: 12 },
    children: [
      jsxs('div', { style: { display: 'flex', gap: 8 }, children: [
        tabs.map((t) =>
          jsx('button', {
            onClick: () => setTab(t),
            style: {
              padding: '6px 12px', borderRadius: 6, cursor: 'pointer',
              border: '1px solid var(--ui-border, #333)',
              background: tab === t ? 'var(--ui-bg-active, #2a2f3a)' : 'transparent',
              color: 'inherit',
            },
            children: t === 'dashboard' ? 'Dashboard' : t === 'inbox' ? 'Approval Inbox' : 'Notifications',
          }, t),
        ),
      ]}),
      error
        ? jsx('div', { style: { color: 'var(--ui-text-danger, #f85149)' }, children: `Backend unreachable: ${error}` })
        : !data
          ? jsx('div', { children: 'Loading…' })
          : tab === 'dashboard'
            ? renderDashboard(data)
            : tab === 'inbox'
              ? renderInbox(data)
              : renderNotifications(data),
    ],
  })
}

function renderDashboard(view) {
  const projects = view.projects ?? []
  if (projects.length === 0) return jsx(EmptyState, {
    icon: icons.grid,
    title: 'No projects yet',
    description: 'Create your first project to start tracking work items, bot teams and approvals. Onboarding walks you through setup in under a minute.',
    action: jsx('code', {
      style: {
        padding: '8px 14px', borderRadius: 6,
        background: 'var(--ui-bg-active, #2a2f3a)',
        fontFamily: 'ui-monospace, monospace', fontSize: 12.5,
      },
      children: 'hermes dockyard onboard',
    }),
  })
  const totals = view.totals ?? {}
  return jsxs('table', {
    style: { borderCollapse: 'collapse', width: '100%', fontSize: 13 },
    children: [
      jsx('thead', { children: jsxs('tr', {
        children: ['Project', 'Phase', 'Backlog', 'Active', 'Blocked', 'Done', 'Health'].map((h) =>
          jsx('th', { style: { textAlign: 'left', padding: '6px 10px', borderBottom: '1px solid var(--ui-border, #333)', fontWeight: 500, opacity: 0.7 }, children: h }, h)),
      })}),
      jsx('tbody', { children: projects.map((p) => jsxs('tr', {
        children: [
          jsx('td', { style: cell(), children: p.id }),
          jsx('td', { style: cell(), children: p.phase ?? '' }),
          jsx('td', { style: cellNum(), children: p.work?.backlog ?? 0 }),
          jsx('td', { style: cellNum(), children: p.work?.active ?? 0 }),
          jsx('td', { style: cellNum(p.work?.blocked ? '#d29922' : undefined), children: p.work?.blocked ?? 0 }),
          jsx('td', { style: cellNum(), children: p.work?.done ?? 0 }),
          jsx('td', { style: cell(), children: p.health ?? '—' }),
        ].map((child, i) => jsx(Fragment, { children: child }, i)),
      }, p.id))}),
    ],
  })
  function cell(extra) {
    return { padding: '8px 10px', borderBottom: '1px solid var(--ui-border, #222)', ...extra }
  }
  function cellNum(color) {
    return { padding: '8px 10px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', ...(color ? { color } : {}) }
  }
}

function InboxRow({ item, refresh }) {
  const [busy, setBusy] = useState(false)
  const [fail, setFail] = useState(null)
  const approve = async () => {
    setBusy(true); setFail(null)
    try { await api(`/initiatives/${encodeURIComponent(item.ref)}/approve`, { method: 'POST', body: {} }); refresh() }
    catch (e) { setBusy(false); setFail(String(e).slice(0, 60)) }
  }
  return jsxs('div', {
    style: { display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: '1px solid var(--ui-border, #222)' },
    children: [
      jsxs('span', { children: [jsx('strong', { children: item.title }), jsx('span', { style: { opacity: 0.6, marginLeft: 8, fontSize: 12 }, children: `${item.project_id} · ${item.ref}` })] }),
      item.kind === 'approval' && jsx('button', {
        disabled: busy, onClick: approve,
        style: { marginLeft: 'auto', padding: '5px 12px', cursor: busy ? 'default' : 'pointer', borderRadius: 6, border: 'none', background: '#4c8dff', color: '#fff' },
        children: fail ?? (busy ? '…' : 'Approve'),
      }),
    ],
  })
}

function renderInbox(view) {
  const items = view.items ?? []
  if (items.length === 0) return jsx(EmptyState, {
    icon: icons.inbox,
    title: 'Inbox zero',
    description: 'Nothing is waiting on your approval. New requests will appear here as they arrive.',
  })
  return jsx('div', { children: items.map((it) => jsx(InboxRowWithRefresh, { item: it }, it.ref)) })
}

let _refreshInbox = null
function InboxRowWithRefresh({ item }) {
  return jsx(InboxRow, { item, refresh: () => _refreshInbox?.() })
}

function renderNotifications(view) {
  const notes = view.notifications ?? []
  if (notes.length === 0) return jsx(EmptyState, {
    icon: icons.bell,
    title: 'All caught up',
    description: 'Fleet notifications will appear here when bots need attention or tasks complete.',
  })
  return jsx('div', { children: notes.map((n) => jsx(NotificationRow, { n }, String(n.id)) ) })
}

function NotificationRow({ n }) {
  const [acked, setAcked] = useState(Boolean(n.acked_at))
  const [busy, setBusy] = useState(false)
  const ack = async () => {
    setBusy(true)
    try { await api(`/notifications/${n.id}/ack`, { method: 'POST', body: {} }); setAcked(true) }
    catch { /* leave unacked; button re-enables */ }
    setBusy(false)
  }
  return jsxs('div', {
    style: { display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--ui-border, #222)', opacity: acked ? 0.45 : 1 },
    children: [
      jsx('span', { style: acked ? { textDecoration: 'line-through' } : undefined, children: n.summary ?? n.title ?? '' }),
      !acked && n.id != null && jsx('button', {
        disabled: busy, onClick: ack,
        style: { marginLeft: 'auto', padding: '4px 10px', cursor: busy ? 'default' : 'pointer', borderRadius: 6, border: '1px solid var(--ui-border, #333)', background: 'transparent', color: 'inherit' },
        children: busy ? '…' : 'Acknowledge',
      }),
    ],
  })
}

export default {
  id: 'hermes-dockyard',
  name: 'Hermes Dockyard',
  register(ctx) {
    bindRest(ctx)
    ctx.registerMany([
      {
        id: 'page',
        area: 'routes',
        data: { path: '/dockyard' },
        render: () => jsx(DashboardPage, {}),
      },
      {
        id: 'nav',
        area: 'sidebar.nav',
        order: 55,
        data: { codicon: 'project', label: 'Dockyard', path: '/dockyard' },
      },
      {
        id: 'open',
        area: 'palette',
        data: {
          id: 'hermes-dockyard.open',
          label: 'Dockyard: Open fleet overview',
          keywords: ['dockyard', 'fleet', 'projects', 'inbox'],
          run: () => host.navigate('/dockyard'),
        },
      },
    ])
  },
}
