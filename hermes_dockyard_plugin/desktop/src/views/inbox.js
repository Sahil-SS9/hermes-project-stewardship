// GENERATED-STRUCTURE: hand-edited Desktop module. Edit this file, then run
// node hermes_dockyard_plugin/desktop/build.mjs to regenerate plugin.js.
import { sortApprovals } from '../data/loaders.js'
import { api } from '../runtime/context.js'
import { emitToast } from '../runtime/context.js'
import { useEffect, useRef, useState } from '../runtime/react.js'
import { jsx, jsxs } from '../runtime/react.js'
import { Button, EmptyState, PageHead, number, plural } from '../lib/ui.js'
import { ApprovalDetail } from '../work-item/approvals.js'
import { TAB_KEYS, TAB_LABELS, attentionPanel, countTabs, evidenceCount, filterByTab, isAttention, rowSummary } from '../inbox/model.js'

const narrowViewport = () => typeof window !== 'undefined' && window.innerWidth <= 820

function InboxRow({ item, selected, onSelect, onOpenProject }) {
  const summary = rowSummary(item)
  if (isAttention(item)) {
    return jsxs('div', {
      className: 'dockyard-attention-row',
      role: 'button',
      tabIndex: 0,
      'aria-selected': selected,
      'data-inbox-row': true,
      'data-attention-row': true,
      'data-inbox-ref': item.ref,
      onClick: () => onSelect(item.ref),
      onKeyDown: (event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onSelect(item.ref) } },
      children: [
        jsx('span', { className: 'dockyard-attention-row-title', children: `${item.project || item.title} needs attention` }),
        jsx('small', { children: summary.meta || 'frozen or disabled project' }),
        jsx('a', {
          href: '#',
          onClick: (event) => { event.preventDefault(); event.stopPropagation(); onOpenProject?.(item.deep_link, item) },
          children: 'Open project',
        }),
      ],
    })
  }
  const count = evidenceCount(item)
  const danger = ['high', 'critical'].includes(summary.risk)
  return jsxs('button', {
    type: 'button',
    className: 'dockyard-inbox-row',
    'aria-selected': selected,
    'data-inbox-row': true,
    'data-inbox-ref': item.ref,
    'data-approval-ref': item.ref,
    onClick: () => onSelect(item.ref),
    children: [
      jsx('span', { className: 'dockyard-inbox-row-title', children: item.title }),
      jsx('span', { className: 'dockyard-inbox-row-meta', children: `${summary.project}${summary.project && summary.meta ? ' · ' : ''}${summary.meta}` }),
      jsx('span', { className: `dockyard-inbox-row-badge${danger ? ' danger' : ''}`, children: count ? `${count} evidence` : summary.risk || 'pending' }),
    ],
  })
}

function AttentionDetail({ item, onBack, onOpenProject }) {
  const copy = attentionPanel(item)
  return jsxs('article', { className: 'dockyard-inbox-panel dockyard-attention-panel', 'data-inbox-panel': 'true', children: [
    onBack ? jsx(Button, { variant: 'quiet', small: true, onClick: onBack, children: 'Back' }) : null,
    jsx('h2', { children: copy.title }),
    jsx('p', { children: copy.description }),
    jsx(Button, { variant: 'primary', onClick: () => onOpenProject?.(copy.deeplink, item), children: `Open ${copy.project || 'project'}` }),
  ]})
}

// Batch L: initiatives whose every milestone is reached, waiting for a person
// to confirm as delivered. The same action the Roadmap offers, in the inbox
// where decisions live.
function ReadyToConfirm({ rows, onDone }) {
  const [busy, setBusy] = useState(null)
  const confirm = async (row) => {
    setBusy(row.ref)
    try {
      await api(`/projects/${encodeURIComponent(row.project)}/initiatives/${encodeURIComponent(row.ref)}/confirm-delivered`, { method: 'POST', body: {} })
      emitToast('success', `“${row.title}” confirmed as delivered.`)
      onDone?.()
    } catch (failure) {
      emitToast('danger', String(failure?.message ?? failure))
    } finally {
      setBusy(null)
    }
  }
  if (!rows?.length) return null
  return jsxs('section', { className: 'dockyard-inbox-ready', 'data-inbox-ready-confirm': true, children: [
    jsx('h3', { children: `Ready to confirm · ${number(rows.length)}` }),
    jsx('ul', { children: rows.map((row) => jsxs('li', { children: [
      jsxs('span', { children: [row.title, jsx('small', { children: ` · ${row.project}` })] }),
      jsx(Button, { small: true, variant: 'primary', action: 'inbox-confirm-delivered', disabled: busy === row.ref, onClick: () => confirm(row), children: busy === row.ref ? 'Confirming…' : 'Confirm as delivered' }),
    ] }, `${row.project}/${row.ref}`)) }),
  ] })
}

export function InboxView({ view, onRefresh, focusRef = null, onOpenProject }) {
  const [items, setItems] = useState(() => sortApprovals(view.items ?? []))
  const [tab, setTab] = useState('all')
  const [selectedRef, setSelectedRef] = useState(null)
  const [narrow, setNarrow] = useState(narrowViewport)
  const lastRow = useRef(null)

  useEffect(() => { setItems(sortApprovals(view.items ?? [])) }, [view.items])
  useEffect(() => {
    const resize = () => setNarrow(narrowViewport())
    window.addEventListener('resize', resize)
    return () => window.removeEventListener('resize', resize)
  }, [])
  useEffect(() => {
    if (!focusRef) return
    if (items.some((item) => item.ref === focusRef)) setSelectedRef(focusRef)
  }, [focusRef, items])
  useEffect(() => {
    const close = (event) => {
      if (event.key !== 'Escape' || !selectedRef) return
      const ref = selectedRef
      setSelectedRef(null)
      window.setTimeout(() => document.querySelector(`[data-inbox-ref="${CSS.escape(ref)}"]`)?.focus(), 0)
    }
    window.addEventListener('keydown', close)
    return () => window.removeEventListener('keydown', close)
  }, [selectedRef])

  const counts = countTabs(items)
  const visible = filterByTab(items, tab)
  const selected = items.find((item) => item.ref === selectedRef) ?? null
  const selectRow = (ref) => {
    lastRow.current = ref
    setSelectedRef(ref)
  }
  const closePanel = () => {
    const ref = selectedRef || lastRow.current
    setSelectedRef(null)
    window.setTimeout(() => document.querySelector(`[data-inbox-ref="${CSS.escape(ref || '')}"]`)?.focus(), 0)
  }
  const resolved = (ref) => {
    const index = visible.findIndex((item) => item.ref === ref)
    const remaining = items.filter((item) => item.ref !== ref)
    const nextVisible = filterByTab(remaining, tab)
    const next = nextVisible[Math.min(index, Math.max(0, nextVisible.length - 1))] ?? null
    setItems(remaining)
    setSelectedRef(narrow ? null : next?.ref ?? null)
    window.setTimeout(() => document.querySelector(`[data-inbox-ref="${CSS.escape(next?.ref || '')}"]`)?.focus(), 0)
    onRefresh?.()
  }

  if (items.length === 0) {
    return jsxs('div', { 'data-inbox-screen': 'true', children: [
      jsx(PageHead, { title: 'Approval Inbox', description: 'Every pending human decision across every project, with enough context to decide here.', onRefresh }),
      jsx(EmptyState, { title: 'No approvals waiting', description: 'New owner decisions will appear here with their project, evidence context and risk.', icon: 'check' }),
    ]})
  }

  return jsxs('div', { className: 'dockyard-inbox', 'data-inbox-screen': 'true', children: [
    jsx(PageHead, {
      title: 'Approval Inbox',
      description: 'Review one decision at a time. Attention rows are project warnings, not decisions.',
      status: `${number(items.length)} ${plural(items.length, 'item')} waiting`,
      onRefresh,
    }),
    jsx('div', { className: 'dockyard-inbox-tabs', role: 'tablist', 'aria-label': 'Approval age filters', children:
      TAB_KEYS.map((key) => jsxs('button', {
        type: 'button',
        role: 'tab',
        className: 'dockyard-inbox-tab',
        'data-inbox-tab': key,
        'aria-selected': tab === key,
        onClick: () => { setTab(key); setSelectedRef(null) },
        children: [TAB_LABELS[key], jsx('small', { children: number(counts[key]) })],
      }, key)),
    }),
    jsxs('section', { className: 'dockyard-inbox-layout', children: [
      jsx(ReadyToConfirm, { rows: view.readyToConfirm ?? [], onDone: onRefresh }),
      narrow && selected ? null : jsx('div', { className: 'dockyard-inbox-list', 'aria-label': 'Pending approvals and project attention', children: visible.length
        ? visible.map((item) => jsx(InboxRow, { item, selected: item.ref === selectedRef, onSelect: selectRow, onOpenProject }, item.ref))
        : jsx('p', { className: 'dockyard-inbox-empty', children: `No ${TAB_LABELS[tab].toLowerCase()} items.` }) }),
      selected
        ? isAttention(selected)
          ? jsx(AttentionDetail, { item: selected, onBack: narrow ? closePanel : null, onOpenProject })
          : jsx(ApprovalDetail, { item: selected, onResolved: resolved, onBack: narrow ? closePanel : null })
        : narrow
          ? null
          : jsx('p', { className: 'dockyard-inbox-empty', children: 'Select a row to review its full decision context.' }),
    ]}),
  ]})
}
