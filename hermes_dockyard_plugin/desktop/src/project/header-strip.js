// GENERATED-STRUCTURE: hand-edited Desktop module. Edit this file, then run
// node hermes_dockyard_plugin/desktop/build.mjs to regenerate plugin.js.
//
// C1 Overview: the project header strip (signed by Sahil 16/09, "okay happy
// with all this"; built 05/10). It replaces the old page head above the
// project tabs, in full on every tab (Sahil 06/10: "full strip + keep all"),
// so the tabs never move when you switch:
//   1. a thin status banner, coloured by state (red blocked, amber at risk,
//      blue needs review, green on track, grey for idle or switched off);
//      clicking it, or Enter / Space, opens the "Needs attention" drawer;
//   2. a small eyebrow row: project, lead, evidence when not healthy, and
//      on the right recency, View in Roadmap, Chat and Refresh;
//   3. the mission as the one headline;
//   4. the delivery bar as a thin strip with % complete and a legend.
// Chat (checks round 1, Sahil 08/10 pick 1a = A): a small menu of the
// project's bots, lead first; picking one opens a fresh Desktop chat with it
// (project/chat.js). Shown only when the project has a bot to chat with.
// The project picker the 16/09 mock-up had in the eyebrow row is not here:
// Sahil 04/10 chose one global switcher for the whole app.
// Every fact comes from projectAttention() and existing routes (see
// attention.js). Nothing is stored in the browser.
import { useState } from '../runtime/react.js'
import { useEffect } from '../runtime/react.js'
import { jsx } from '../runtime/react.js'
import { jsxs } from '../runtime/react.js'
import { Fragment } from '../runtime/react.js'
import { host } from '@hermes/plugin-sdk'
import { api } from '../runtime/context.js'
import { emitToast } from '../runtime/context.js'
import { Button } from '../lib/ui.js'
import { Icon } from '../lib/ui.js'
import { healthDetails } from '../lib/ui.js'
import { number } from '../lib/ui.js'
import { useDialogFocusManager } from '../lib/ui.js'
import { Menu } from './plan/plan-ui.js'
import { chatOutcomeMessage } from './chat.js'
import { chatTargets } from './chat.js'
import { openProjectChat } from './chat.js'
import { projectAttention } from './attention.js'
import { deliveryCounts } from './attention.js'
import { lastActivity } from './attention.js'
import { timeAgo } from './attention.js'

const SEGMENTS = [
  ['done', 'done'], ['active', 'active'], ['blocked', 'blocked'], ['backlog', 'backlog'],
]

function ageText(days) {
  if (typeof days !== 'number' || !Number.isFinite(days)) return null
  if (days < 1) return 'Under a day'
  return `${number(days)} ${days === 1 ? 'day' : 'days'}`
}

// Chat with the project's bots (checks round 1, pick 1a): the team, lead
// first. The team loads once per project; until it does, the lead from the
// settings is listed. Nothing shows when there is no bot to chat with.
function ProjectChatMenu({ projectId, lead }) {
  const [members, setMembers] = useState(null)
  useEffect(() => {
    let live = true
    setMembers(null)
    api(`/projects/${encodeURIComponent(projectId)}/members`)
      .then((result) => { if (live) setMembers(result?.members ?? []) })
      .catch(() => { if (live) setMembers([]) })
    return () => { live = false }
  }, [projectId])
  const targets = chatTargets(members, lead)
  if (targets.length === 0) return null
  const open = async (profile) => {
    const [tone, message] = chatOutcomeMessage(profile, await openProjectChat({ host, api, projectId, profile }))
    emitToast(tone, message)
  }
  return jsx('span', { className: 'dy-ov-chat', 'data-strip-chat': projectId, children: jsx(Menu, {
    label: `Chat with a bot on ${projectId}`,
    action: 'project-chat',
    trigger: jsxs(Fragment, { children: [jsx(Icon, { name: 'message-square' }), jsx('span', { children: 'Chat' })] }),
    items: targets.map((target) => ({
      id: target.profile,
      label: target.role === 'lead' ? `${target.profile} (lead)` : target.profile,
      onSelect: () => open(target.profile),
    })),
  }) })
}

function AttentionDrawer({ projectId, attention, onClose, onOpenItem }) {
  const [expanded, setExpanded] = useState(null)
  // Initial focus, Tab kept inside, and focus back to the banner on close.
  useDialogFocusManager('[data-attention-drawer] .dy-ov-attn-panel')
  useEffect(() => {
    const onKey = (event) => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      event.stopPropagation()
      onClose()
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [onClose])
  const items = attention.items
  const sub = !attention.available
    ? 'The attention check did not load, so nothing is listed. Refresh to try again.'
    : items.length === 0
      ? `Nothing needs action in ${projectId} right now.`
      : `${number(items.length)} ${items.length === 1 ? 'thing needs' : 'things need'} action in ${projectId}. Most urgent first.`
  return jsx('section', {
    className: 'dockyard-modal-layer dy-ov-attn-layer',
    'data-attention-drawer': projectId,
    onClick: (event) => { if (event.target === event.currentTarget) onClose() },
    children: jsxs('aside', {
      className: 'dy-ov-attn-panel', role: 'dialog', 'aria-modal': true, 'aria-labelledby': 'dy-ov-attn-title',
      children: [
        jsxs('header', { children: [
          jsx('h2', { id: 'dy-ov-attn-title', children: 'Needs attention' }),
          jsx('button', { type: 'button', className: 'dy-ov-attn-close', 'aria-label': 'Close attention panel', 'data-attention-close': true, onClick: onClose, children: jsx(Icon, { name: 'x' }) }),
        ]}),
        jsx('p', { className: 'dy-ov-attn-sub', children: sub }),
        items.length > 0
          ? jsx('ul', { className: 'dy-ov-attn-list', children: items.map((item, index) => {
            const open = expanded === item.key
            const facts = [
              ['Owner', item.owner],
              ['Waiting', ageText(item.ageDays)],
              ['Next step', item.next],
            ].filter(([, value]) => value)
            return jsxs('li', { className: 'dy-ov-attn-item', 'data-tone': item.tone, 'data-attention-item': item.key, children: [
              jsxs('button', {
                type: 'button', className: 'dy-ov-attn-row', 'aria-expanded': open, 'aria-controls': `dy-ov-attn-detail-${index}`,
                onClick: () => setExpanded(open ? null : item.key),
                children: [
                  jsx('span', { className: 'dy-ov-attn-sev', children: item.label }),
                  jsx('strong', { children: item.title }),
                  item.note ? jsx('span', { className: 'dy-ov-attn-note', children: item.note }) : null,
                ],
              }),
              open ? jsxs('div', { className: 'dy-ov-attn-detail', id: `dy-ov-attn-detail-${index}`, children: [
                facts.length > 0 ? jsx('dl', { children: facts.flatMap(([term, value]) => [
                  jsx('dt', { children: term }, `${term}-t`), jsx('dd', { children: value }, `${term}-d`),
                ]) }) : null,
                jsx(Button, { variant: 'primary', small: true, action: 'attention-open', onClick: () => onOpenItem(item), children: item.openLabel }),
              ]}) : null,
            ]}, item.key)
          }) })
          : jsx('p', { className: 'dy-ov-attn-empty', 'data-attention-empty': true, children: attention.available
            ? 'The banner turns amber or red when work is overdue, blocked or stalled, and blue when a decision waits for you.'
            : 'No status is shown rather than a guess.' }),
      ],
    }),
  })
}

export function ProjectHeaderStrip({ project, view, onRefresh, onOpenRoadmap, onOpenItem }) {
  const [open, setOpen] = useState(false)
  const attention = projectAttention({ project, portfolio: view.portfolio, milestones: view.milestones ?? [] })
  const delivery = deliveryCounts(project.work)
  const portfolioRow = (view.portfolio?.projects ?? []).find((row) => row?.project_id === project.id) ?? null
  const recent = timeAgo(lastActivity({ portfolioRow, events: view.events ?? [] }))
  const lead = view.settings?.owner?.lead_profile
  const mission = String(view.settings?.mission ?? '').trim()
  const [healthTone, healthLabel] = healthDetails(project.health)
  const legend = SEGMENTS.filter(([key]) => delivery[key] > 0)
  const legendText = legend.map(([key, word]) => `${number(delivery[key])} ${word}`).join(', ')
  const openDrawer = () => setOpen(true)
  const sep = (key) => jsx('span', { className: 'dy-ov-sep', 'aria-hidden': true, children: '·' }, key)
  return jsxs(Fragment, { children: [jsxs('header', { className: 'dy-ov-strip', 'data-project-strip': project.id, children: [
    jsxs('div', {
      className: 'dy-ov-banner', role: 'button', tabIndex: 0,
      'data-tone': attention.tone, 'data-attention-state': attention.state,
      'aria-haspopup': 'dialog', 'aria-expanded': open,
      'aria-label': `Project status: ${attention.label}. ${attention.summary.replace(/\.$/, '')}. Open attention details.`,
      title: 'Open attention details',
      onClick: openDrawer,
      onKeyDown: (event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); openDrawer() } },
      children: [
        jsxs('span', { className: 'dy-ov-banner-left', children: [
          jsx('span', { className: 'dy-ov-mark', 'aria-hidden': true }),
          jsx('strong', { children: attention.label }),
          jsx('span', { className: 'dy-ov-banner-summary', children: `— ${attention.summary}` }),
        ]}),
        jsx('span', { className: 'dy-ov-banner-view', 'aria-hidden': true, children: 'View' }),
      ],
    }),
    jsxs('div', { className: 'dy-ov-eyebrow-row', children: [
      jsxs('p', { className: 'dy-ov-eyebrow', children: [
        jsx('span', { className: 'dy-ov-proj', 'data-strip-project': true, children: project.id }),
        lead ? sep('lead-sep') : null,
        lead ? jsx('span', { children: `Lead ${lead}` }, 'lead') : null,
        project.health !== 'healthy' ? sep('evidence-sep') : null,
        project.health !== 'healthy'
          ? jsxs('span', { className: 'dy-ov-evidence', 'data-tone': healthTone, 'data-strip-evidence': project.health ?? 'unknown', children: [jsx('i', { 'aria-hidden': true }), `Evidence: ${healthLabel}`] }, 'evidence')
          : null,
      ]}),
      jsxs('div', { className: 'dy-ov-meta', children: [
        jsx('span', { 'data-strip-updated': true, children: recent ? `Updated ${recent}` : 'No activity yet' }),
        jsx('span', { 'data-roadmap-link': true, children: jsx('a', { href: '#', onClick: (event) => { event.preventDefault(); onOpenRoadmap?.() }, children: 'View in Roadmap' }) }),
        jsx(ProjectChatMenu, { projectId: project.id, lead }, `chat:${project.id}`),
        jsx('button', { type: 'button', className: 'dy-ov-refresh', 'data-action': 'refresh', 'aria-label': 'Refresh', title: 'Refresh', onClick: onRefresh, children: jsx(Icon, { name: 'refresh' }) }),
      ]}),
    ]}),
    jsx('h1', { className: 'dy-ov-headline', 'data-strip-headline': mission ? 'mission' : 'missing', children: mission || project.id }),
    jsxs('div', { className: 'dy-ov-progress', 'data-strip-progress': true, children: [
      jsxs('span', { className: 'dy-ov-pct', children: [
        delivery.percent === null ? 'No work yet' : `${delivery.percent}%`,
        delivery.total > 0 ? jsx('small', { children: `complete · ${number(delivery.done)} of ${number(delivery.total)} work items` }) : null,
      ]}),
      jsx('div', {
        className: 'dy-ov-track', role: 'img',
        'aria-label': delivery.total > 0 ? `Delivery: ${legendText}` : 'Delivery: no work items yet',
        children: legend.map(([key]) => jsx('span', { className: key, style: { width: `${(delivery[key] / delivery.total) * 100}%` } }, key)),
      }),
      legend.length > 0 ? jsx('div', { className: 'dy-ov-legend', children: legend.map(([key, word]) =>
        jsxs('span', { className: key, children: [jsx('i', { 'aria-hidden': true }), `${number(delivery[key])} ${word}`] }, key)) }) : null,
    ]}),
  ]}, 'strip'),
  open ? jsx(AttentionDrawer, {
    projectId: project.id, attention,
    onClose: () => setOpen(false),
    onOpenItem: (item) => { setOpen(false); onOpenItem?.(item) },
  }, 'drawer') : null,
  ]})
}
