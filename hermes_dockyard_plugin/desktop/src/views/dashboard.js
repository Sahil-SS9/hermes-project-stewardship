// GENERATED-STRUCTURE: hand-edited Desktop module. Edit this file, then run
// node hermes_dockyard_plugin/desktop/build.mjs to regenerate plugin.js.
import { useState } from '../runtime/react.js'
import { jsxs } from '../runtime/react.js'
import { jsx } from '../runtime/react.js'
import { sortApprovals } from '../data/loaders.js'
import { Icon } from '../lib/ui.js'
import { number } from '../lib/ui.js'
import { plural } from '../lib/ui.js'
import { Button } from '../lib/ui.js'
import { riskDetails } from '../lib/ui.js'
import { StatusTag } from '../lib/ui.js'
import { healthDetails } from '../lib/ui.js'
import { initials } from '../data/loaders.js'
import { severityTone } from '../lib/ui.js'
import { formatWhen } from '../lib/ui.js'
import { Fragment } from '../runtime/react.js'
import { useEffect } from '../runtime/react.js'
import { api } from '../runtime/context.js'
import { readableLabel } from '../data/loaders.js'
import { EmptyState } from '../lib/ui.js'
import { validationSummary } from '../data/loaders.js'
import { emitToast } from '../runtime/context.js'
export function DiscoveredProfilePicker({ profiles = [], value = '', onChange, name, label = 'Hermes profile', disabled = false }) {
  const [search, setSearch] = useState('')
  const normalised = profiles.map((profile) => ({
    ...profile,
    value: profile.slug || profile.name || profile.id,
    label: profile.display_name || profile.slug || profile.name || profile.id,
  })).filter((profile) => profile.value)
  if (value && !normalised.some((profile) => profile.value === value)) {
    normalised.push({ value, label: value, available: false, selectable: false, historical_reference: true })
  }
  const query = search.trim().toLowerCase()
  const visible = normalised.filter((profile) => !query || profile.label.toLowerCase().includes(query) || profile.value.toLowerCase().includes(query))
  return jsxs('div', { className: 'dockyard-field dockyard-profile-picker', 'data-profile-picker': name, children: [
    jsx('label', { htmlFor: `dockyard-profile-search-${name}`, children: `${label} search` }),
    jsx('input', { id: `dockyard-profile-search-${name}`, 'data-profile-search': true, value: search, placeholder: 'Search discovered profiles', disabled, onInput: (event) => setSearch(event.target.value), onChange: (event) => setSearch(event.target.value) }),
    jsx('select', { value, disabled, 'aria-label': label, onChange: (event) => onChange?.(event.target.value), children: [
      jsx('option', { value: '', children: 'Choose an available profile' }, 'none'),
      ...visible.map((profile) => jsx('option', { value: profile.value, disabled: profile.available === false || profile.selectable === false, children: `${profile.label}${profile.available === false || profile.selectable === false ? ' (unavailable)' : ''}` }, profile.value)),
    ] }),
  ] })
}

export function AttentionPanel({ items, onReview }) {
  const decisions = sortApprovals(items ?? [])
  const owed = decisions.length
  if (owed === 0) {
    return jsxs('section', { className: 'dockyard-attention-card is-clear', 'data-dashboard-card': 'attention', children: [
      jsxs('div', { className: 'dockyard-attention-summary', children: [
        jsx('span', { className: 'dockyard-attention-icon', children: jsx(Icon, { name: 'check' }) }),
        jsx('h2', { children: 'No decisions waiting' }),
        jsx('strong', { className: 'dockyard-decision-count', children: 'All clear' }),
        jsx('p', { children: 'The fleet can keep moving without owner input.' }),
      ]}),
    ]})
  }
  return jsxs('section', { className: 'dockyard-attention-card', 'data-dashboard-card': 'attention', children: [
    jsxs('div', { className: 'dockyard-attention-summary', children: [
      jsx('h2', { children: 'Needs your decision' }),
      jsx('strong', { className: 'dockyard-decision-count', children: number(owed) }),
      jsx('p', { children: `${number(owed)} ${plural(owed, 'decision')} carry project context and a declared risk.` }),
      jsx(Button, { variant: 'primary', onClick: onReview, children: 'Review decisions' }),
    ]}),
    jsxs('div', { className: 'dockyard-attention-copy', children: [
      jsx('h2', { children: 'Everything else can keep moving' }),
      jsx('div', { className: 'dockyard-attention-list', children:
        decisions.map((item) => {
          const [tone, label] = riskDetails(item.risk)
          return jsxs('div', { className: 'dockyard-attention-decision', 'data-attention-decision': item.ref, children: [
            jsx(StatusTag, { tone, label }),
            jsxs('span', { children: [
              jsx('strong', { children: item.title }),
              jsx('span', { className: 'dockyard-meta', children: `${item.project || 'Unknown project'} / ${item.ref}` }),
            ]}),
            jsx(Button, { small: true, onClick: onReview, children: 'Open' }),
          ]}, item.ref)
        }),
      }),
    ]}),
  ]})
}

export function WorkBar({ work, project = false, label = 'Work distribution' }) {
  const backlog = Number(work?.backlog ?? 0)
  const active = Number(work?.active ?? 0)
  const done = Number(work?.done ?? 0)
  const total = Math.max(1, backlog + active + done)
  return jsxs('div', {
    className: `dockyard-work-visual${project ? ' compact' : ''}`,
    role: 'img',
    'aria-label': `${label}: ${backlog} backlog, ${active} active, ${done} done`,
    'data-work-visual': project ? true : undefined,
    children: [
      backlog > 0 ? jsx('span', { className: 'backlog', style: { width: `${(backlog / total) * 100}%` } }) : null,
      active > 0 ? jsx('span', { className: 'active', style: { width: `${(active / total) * 100}%` } }) : null,
      done > 0 ? jsx('span', { className: 'done', style: { width: `${(done / total) * 100}%` } }) : null,
    ],
  })
}

export function PortfolioVisual({ projects }) {
  const totals = projects.reduce((acc, project) => ({
    backlog: acc.backlog + Number(project.work?.backlog ?? 0),
    active: acc.active + Number(project.work?.active ?? 0),
    done: acc.done + Number(project.work?.done ?? 0),
  }), { backlog: 0, active: 0, done: 0 })
  return jsxs('section', { className: 'dockyard-portfolio-visual', 'data-portfolio-visual': true, children: [
    jsxs('div', { className: 'dockyard-portfolio-copy', children: [
      jsx('h2', { children: 'Delivery mix' }),
      jsx('p', { children: 'Current work distribution across the watched projects.' }),
    ]}),
    jsxs('div', { className: 'dockyard-portfolio-chart', children: [
      jsx(WorkBar, { work: totals, label: 'Portfolio work distribution' }),
      jsxs('div', { className: 'dockyard-work-legend', children: [
        jsxs('span', { className: 'backlog', children: [jsx('i', {}), `${number(totals.backlog)} backlog`] }),
        jsxs('span', { className: 'active', children: [jsx('i', {}), `${number(totals.active)} active`] }),
        jsxs('span', { className: 'done', children: [jsx('i', {}), `${number(totals.done)} done`] }),
      ]}),
    ]}),
  ]})
}

export function ProjectRow({ project, context, botNames, onOpen }) {
  const [tone, label] = healthDetails(project.health)
  const work = project.work ?? {}
  const alerts = Number(project.unacked_notifications ?? 0)
  const mission = context?.settings?.mission || (project.phase ? `Phase: ${project.phase}` : 'No mission supplied')
  const activeAssignees = [...new Set((context?.workItems ?? [])
    .filter((item) => !['done', 'backlog', 'cancelled'].includes(item.status))
    .map((item) => item.assignee)
    .filter(Boolean))].slice(0, 3)
  return jsxs('div', { className: 'dockyard-project-row', role: 'row', 'data-project-row': project.id, children: [
    jsxs('div', { className: 'dockyard-project-cell project', role: 'cell', children: [
      jsxs('div', { className: 'dockyard-project-name', children: [
        jsx('span', { className: 'dockyard-project-icon', children: jsx(Icon, { name: 'project' }) }),
        jsxs('span', { className: 'dockyard-project-copy', children: [
          jsx('strong', { children: project.id }),
          jsx('span', { className: 'dockyard-project-mission', children: mission }),
        ]}),
      ]}),
      activeAssignees.length > 0 ? jsx('div', { className: 'dockyard-avatar-stack', 'aria-label': 'Active owners', children:
        activeAssignees.map((assignee) => {
          const label = botNames?.[assignee] || assignee
          return jsx('span', { className: 'dockyard-avatar', title: label, children: initials(label) }, assignee)
        }),
      }) : null,
    ]}),
    jsx('div', { className: 'dockyard-project-cell health', role: 'cell', children: jsx(StatusTag, { tone, label }) }),
    jsxs('div', { className: 'dockyard-project-cell work', role: 'cell', children: [
      jsxs('div', { className: 'dockyard-work-stats', 'aria-label': `Work: ${work.active ?? 0} active, ${work.backlog ?? 0} backlog, ${work.done ?? 0} done`, children: [
        jsxs('span', { children: [jsx('strong', { children: number(work.active) }), ' active'] }),
        jsxs('span', { children: [jsx('strong', { children: number(work.backlog) }), ' backlog'] }),
        jsxs('span', { children: [jsx('strong', { children: number(work.done) }), ' done'] }),
      ]}),
      jsx(WorkBar, { work, project: true, label: `${project.id} work distribution` }),
    ]}),
    jsx('div', { className: 'dockyard-project-cell alerts', role: 'cell', children:
      jsxs('span', { className: `dockyard-alert-count${alerts > 0 ? ' has-alert' : ''}`, children: [
        alerts > 0 ? `${number(alerts)} unread` : 'None unread',
        typeof onOpen === 'function'
          ? jsx(Button, { action: 'open', small: true, onClick: () => onOpen(`s1:project/${project.id}`), children: 'Open' })
          : null,
      ]}),
    }),
  ]})
}

export function FleetActivity({ notifications, onOpen }) {
  const items = [...(notifications ?? [])].sort((left, right) => String(right.created_at || '').localeCompare(String(left.created_at || ''))).slice(0, 4)
  return jsxs('aside', { className: 'dockyard-activity-card', 'data-dashboard-card': 'activity', 'data-fleet-activity': true, children: [
    jsxs('div', { className: 'dockyard-section-head', children: [
      jsxs('div', { children: [
        jsx('h2', { children: 'Fleet activity' }),
        jsx('p', { children: 'Recent attributed project signals.' }),
      ]}),
      jsx('span', { className: 'dockyard-section-count', children: `${number(items.length)} recent` }),
    ]}),
    items.length > 0 ? jsx('div', { className: 'dockyard-activity-list', children:
      items.map((note) => {
        const tone = severityTone(note.severity)
        return jsxs('div', { className: 'dockyard-activity-item', children: [
          jsx('span', { className: `dockyard-notification-marker ${tone}`, children: jsx(Icon, { name: tone === 'warning' || tone === 'danger' ? 'alert' : 'bell' }) }),
          jsxs('span', { children: [
            jsx('p', { children: note.title || 'Fleet event' }),
            jsx('span', { className: 'dockyard-meta', children: `${note.project || 'Fleet'}${note.body ? ` / ${note.body}` : ''}` }),
            jsx('time', { children: formatWhen(note.created_at) }),
            typeof onOpen === 'function' && note.deep_link
              ? jsx(Button, { action: 'open', small: true, onClick: () => onOpen(note.deep_link), children: 'Open' })
              : null,
          ]}),
        ]}, String(note.id))
      }),
    }) : jsx('div', { className: 'dockyard-activity-list', children: jsx('p', { className: 'dockyard-meta', children: 'No recent fleet signals.' }) }),
  ]})
}

export function FleetGroups({ groups, onOpen }) {
  const groupDefs = [
    { key: 'decisions', label: 'Decisions waiting on you', tone: 'warning' },
    { key: 'interventions', label: 'Interventions', tone: 'danger' },
    { key: 'informational', label: 'Informational', tone: 'neutral' },
  ]
  const sections = []
  for (const def of groups) {
    const items = def.items ?? []
    if (items.length === 0) continue
    sections.push(jsxs('section', { className: 'dockyard-fleet-group', 'data-fleet-group': def.key, children: [
      jsxs('div', { className: 'dockyard-section-head', children: [
        jsxs('div', { children: [
          jsx('h2', { children: def.label }),
          jsx('p', { children: def.description }),
        ]}),
        jsx('span', { className: 'dockyard-section-count', children: `${number(items.length)} ${items.length === 1 ? 'item' : 'items'}` }),
      ]}),
      jsx('div', { className: 'dockyard-fleet-list', children:
        items.map((item, index) => jsxs('div', { className: 'dockyard-fleet-row', 'data-fleet-row': `${def.key}:${item.ref || item.title}`, children: [
          jsxs('span', { children: [
            jsx('strong', { children: item.title }),
            jsx('span', { className: 'dockyard-meta', children: `${item.project || 'Fleet'}${item.ref && item.ref !== 'evidence' ? ` / ${item.ref}` : ''}` }),
            def.key !== 'decisions' && item.detail ? jsx('span', { className: 'dockyard-meta', children: item.detail }) : null,
            def.key === 'informational' && item.severity ? jsx('span', { className: 'dockyard-meta', children: `sev: ${item.severity}` }) : null,
          ]}),
          jsx('span', { className: 'dockyard-meta', children: [
            item.cause ? `cause: ${item.cause}` : null,
            item.risk ? `risk: ${item.risk}` : null,
            item.owner ? `owner: ${item.owner}` : null,
            typeof item.age_days === 'number' ? `age: ${item.age_days}d` : null,
          ].filter(Boolean).join(' · ') }),
          typeof onOpen === 'function' && item.deep_link
            ? jsx(Button, { action: 'open', small: true, onClick: () => onOpen(item.deep_link, item), children: 'Open' })
            : null,
        ]}, `${def.key}-${item.ref || item.title || index}`)),
      }),
    ]}, def.key))
  }
  if (sections.length === 0) {
    return jsx('section', { className: 'dockyard-fleet-group', 'data-fleet-group': 'clear', children:
      jsx('p', { className: 'dockyard-meta', children: 'No fleet groups need attention.' }) })
  }
  return jsxs(Fragment, { children: sections })
}

export function DashboardView({ view, onInbox, onRefresh, onOpen, resetView }) {
  // Attention-first ordering: at-risk/stalled projects outrank healthy ones.
  const STATUS_PRIORITY = { at_risk: 0, stalled: 1, on_track: 2, idle: 3 }
  const projects = [...(view.portfolio?.projects ?? [])].sort((left, right) =>
    (STATUS_PRIORITY[left.status] ?? 2) - (STATUS_PRIORITY[right.status] ?? 2))
  const decisions = view.groups?.decisions ?? []
  const interventions = view.groups?.interventions ?? []
  const rows = [...decisions, ...interventions].sort((a, b) => (b.age_days ?? 0) - (a.age_days ?? 0))
  const [selected, setSelected] = useState(null)
  const [subview, setSubview] = useState('overview')
  const [directoryQuery, setDirectoryQuery] = useState('')
  const [issueFilter, setIssueFilter] = useState('all')
  useEffect(() => { setSubview('overview') }, [resetView])
  const [decision, setDecision] = useState(null)
  const [detailError, setDetailError] = useState('')
  const focusItem = selected === false ? null : selected ?? decisions[0] ?? null
  useEffect(() => {
    if (!focusItem?.ref || focusItem.kind !== 'initiative_approval') { setDecision(null); setDetailError(''); return undefined }
    let cancelled = false
    setDecision(null)
    api(`/initiatives/${encodeURIComponent(focusItem.ref)}/decision`)
      .then((result) => { if (!cancelled) { setDecision(result); setDetailError('') } })
      .catch((error) => { if (!cancelled) setDetailError(String(error?.message ?? error)) })
    return () => { cancelled = true }
  }, [focusItem?.ref, focusItem?.kind])
  const onTrack = projects.filter((project) => project.status === 'on_track').length
  const evidenceFiles = view.portfolio?.evidence_files
  const workActive = Number(view.totals?.active_work ?? 0)
  const waiting = Number(view.inbox?.count ?? 0)
  const statusName = { on_track: 'On track', at_risk: 'At risk', stalled: 'Stalled', idle: 'Idle' }
  const metric = (label, value, detail, icon, tone, onClick) => jsxs(onClick ? 'button' : 'div', {
    type: onClick ? 'button' : undefined, onClick,
    'data-metric': label.toLowerCase().replace(/[^a-z]+/g, '-'),
    className: `dockyard-command-metric dockyard-command-metric-${tone}${onClick ? ' is-actionable' : ''}`, children: [
      jsxs('span', { className: 'dockyard-command-metric-label', children: [jsx(Icon, { name: icon }), label] }),
      jsx('strong', { children: value }), jsx('small', { children: detail }),
  ]}, label)
  const renderProjectRow = (project) => {
    const total = Number(project.items?.total ?? 0)
    const done = Number(project.items?.done ?? 0)
    const status = statusName[project.status] ?? readableLabel(project.status, 'Unknown')
    return jsxs('div', { role: 'row', className: 'dockyard-command-row dockyard-command-project-row',
      'data-project-row': project.project_id, children: [
        jsx('span', { role: 'cell', children: jsx('button', { type: 'button', className: 'dockyard-button small', onClick: () => onOpen?.(`s1:project/${project.project_id}`), children: project.project_id }) }),
        jsx('span', { role: 'cell', children: project.owner || 'Not assigned' }),
        jsx('span', { role: 'cell', className: `dockyard-command-health ${project.status}`, children: status }),
        jsxs('span', { role: 'cell', className: 'dockyard-command-progress', children: [
          jsx('span', { children: total ? `${number(done)} / ${number(total)} work items` : 'No work items' }),
          jsx('span', { className: 'dockyard-command-progress-track', children: jsx('span', { style: { width: `${total ? Math.round((done / total) * 100) : 0}%` } }) }),
        ] }),
        jsx('span', { role: 'cell', children: project.next_milestone ? `${project.next_milestone.name} · ${project.next_milestone.due || 'No due date'}` : 'Not scheduled' }),
        jsx('span', { role: 'cell', children: (project.items?.blocked || project.items?.overdue) ? `${number(project.items.blocked || 0)} blocked · ${number(project.items.overdue || 0)} overdue` : 'No open blockers' }),
      ]}, project.project_id)
  }
  const empty = projects.length === 0
  if (subview === 'projects') {
    const match = directoryQuery.trim().toLowerCase()
    const filtered = projects.filter((project) => !match ||
      [project.project_id, project.owner, project.status].some((field) => String(field || '').toLowerCase().includes(match)))
    return jsxs('div', { className: 'dockyard-command dockyard-command-directory', 'data-dashboard-subview': 'projects', children: [
      jsx(Button, { small: true, onClick: () => setSubview('overview'), children: '← Back to Dashboard' }),
      jsxs('div', { className: 'dockyard-command-head', children: [
        jsxs('div', { children: [jsx('span', { className: 'dockyard-command-eyebrow', children: 'FLEET DIRECTORY' }),
          jsx('h1', { children: 'All projects' }),
          jsx('p', { children: `${number(projects.length)} ${plural(projects.length, 'project')} under watch. Select one for its Overview.` })] }),
        jsx('input', { type: 'search', className: 'dockyard-command-directory-search',
          value: directoryQuery, onChange: (event) => setDirectoryQuery(event.target.value),
          placeholder: 'Filter by project, owner or status', 'aria-label': 'Filter projects' }),
      ] }),
      jsxs('section', { className: 'dockyard-command-section dockyard-command-directory-list', role: 'table', 'aria-label': 'Project fleet', children: [
        jsx('div', { className: 'dockyard-command-row dockyard-command-project-head', role: 'row', children:
          ['Project', 'Owner', 'Health', 'Progress', 'Next milestone', 'Delivery risk'].map((label) => jsx('span', { role: 'columnheader', children: label }, label)) }),
        filtered.length ? filtered.map(renderProjectRow) : jsx('p', { className: 'dockyard-command-empty', children: 'No projects match this filter.' }),
      ] }),
    ] })
  }
  if (subview === 'issues') {
    const options = [['all', 'All issues'], ['decision', 'Decisions'], ['blocked_item', 'Blocked'],
      ['overdue_item', 'Overdue'], ['evidence_stale', 'Stale evidence'], ['project_attention', 'Project state']]
    const filtered = rows.filter((item) => issueFilter === 'all' ||
      (issueFilter === 'decision' ? item.kind === 'initiative_approval' : item.cause === issueFilter))
    return jsxs('div', { className: 'dockyard-command dockyard-command-directory', 'data-dashboard-subview': 'issues', children: [
      jsx(Button, { small: true, onClick: () => setSubview('overview'), children: '← Back to Dashboard' }),
      jsxs('div', { className: 'dockyard-command-head', children: [
        jsxs('div', { children: [jsx('span', { className: 'dockyard-command-eyebrow', children: 'FLEET ATTENTION' }),
          jsx('h1', { children: 'All issues' }),
          jsx('p', { children: `${number(rows.length)} ${plural(rows.length, 'item')} need a decision or intervention across the fleet.` })] }),
        jsx(Button, { onClick: onInbox, children: 'Open Approval Inbox' }),
      ] }),
      jsx('div', { className: 'dockyard-command-issue-filters', role: 'group', 'aria-label': 'Filter issues', children:
        options.map(([key, label]) => jsx('button', { type: 'button', className: issueFilter === key ? 'is-active' : '',
          'aria-pressed': issueFilter === key, onClick: () => setIssueFilter(key),
          children: `${label} (${number(key === 'all' ? rows.length : rows.filter((item) => key === 'decision' ? item.kind === 'initiative_approval' : item.cause === key).length)})`,
        }, key)),
      }),
      jsxs('section', { className: 'dockyard-command-section dockyard-command-directory-list', children: [
        jsx('div', { className: 'dockyard-command-row dockyard-command-attention-head', children:
          ['Type', 'Item', 'Project', 'Owner / risk', 'Waiting'].map((label) => jsx('span', { children: label }, label)) }),
        filtered.length ? filtered.map((item, index) => jsxs('button', { type: 'button',
          className: 'dockyard-command-row dockyard-command-attention-row',
          onClick: () => item.deep_link ? onOpen?.(item.deep_link) : onInbox?.(),
          children: [
            jsx('span', { className: `dockyard-command-type ${item.kind === 'initiative_approval' ? 'approval' : 'blocker'}`,
              children: item.kind === 'initiative_approval' ? 'Approval' : readableLabel(item.cause, 'Issue') }),
            jsxs('span', { className: 'dockyard-command-title', children: [jsx('strong', { children: item.title }),
              jsx('small', { children: item.ref || item.detail || '' })] }),
            jsx('span', { children: item.project }), jsx('span', { children: item.owner || readableLabel(item.risk, 'Not assigned') }),
            jsx('span', { children: typeof item.age_days === 'number' ? `${number(item.age_days)}d` : 'Not recorded' }),
          ], }, `${item.kind}:${item.ref || index}`)) : jsx('p', { className: 'dockyard-command-empty', children: 'No issues match this filter.' }),
      ] }),
    ] })
  }
  return jsxs('div', { className: 'dockyard-command', children: [
    jsxs('div', { className: 'dockyard-command-head', children: [
      jsxs('div', { children: [jsx('span', { className: 'dockyard-command-eyebrow', children: 'FLEET OVERVIEW' }),
        jsx('h1', { children: 'Command Center' }),
        jsx('p', { children: 'Stewardship at a glance. Evidence over assumptions.' })] }),
      jsxs('div', { className: 'dockyard-command-head-actions', children: [
        jsx(Button, { action: 'refresh', onClick: onRefresh, children: 'Refresh' }),
        jsx(Button, { action: 'open-bot-teams', onClick: () => onOpen?.('s5:teams'), children: 'Bot teams' }),
        waiting > 0 ? jsx(Button, { variant: 'primary', onClick: onInbox, children: `Review ${number(waiting)} ${plural(waiting, 'decision')}` }) : null,
      ]}),
    ]}),
    empty ? jsx(EmptyState, { title: 'No projects under watch', description: 'Use New project above to connect your first project.', icon: 'project' }) :
    jsxs(Fragment, { children: [
      jsxs('section', { className: 'dockyard-command-metrics', 'aria-label': 'Fleet summary', children: [
        metric('PROJECTS', number(projects.length), `${number(projects.filter((p) => p.status === 'at_risk').length)} at risk`, 'folders', 'info', () => setSubview('projects')),
        metric('NEEDS YOUR REVIEW', number(waiting), `${number(interventions.length)} other ${plural(interventions.length, 'intervention')}`, 'triangle-alert', 'warning', () => setSubview('issues')),
        metric('ON TRACK', `${number(onTrack)} / ${number(projects.length)}`, 'Project delivery status', 'activity', onTrack ? 'success' : 'neutral', () => setSubview('projects')),
        metric('EVIDENCE FILES', evidenceFiles == null ? 'Unavailable' : number(evidenceFiles), 'Files attached to tracked projects', 'file-text', 'accent'),
      ]}),
      jsxs('div', { className: 'dockyard-command-health-summary', children: [
        jsx('span', { children: 'FLEET HEALTH' }),
        jsx('div', { className: 'dockyard-command-health-track', role: 'img',
          'aria-label': `${number(onTrack)} on track, ${number(projects.filter((p) => p.status === 'at_risk').length)} at risk, ${number(projects.filter((p) => p.status === 'stalled').length)} stalled, ${number(projects.filter((p) => p.status === 'idle').length)} idle, ${number(projects.filter((p) => !['on_track', 'at_risk', 'stalled', 'idle'].includes(p.status)).length)} unverified`,
          children: ['on_track', 'at_risk', 'stalled', 'idle', 'unknown'].map((state) => {
            const count = projects.filter((p) => (['on_track', 'at_risk', 'stalled', 'idle'].includes(p.status) ? p.status : 'unknown') === state).length
            return count ? jsx('span', { className: `dockyard-health-segment ${state}`, style: { width: `${count / projects.length * 100}%` } }, state) : null
          }),
        }),
        jsx('div', { className: 'dockyard-command-health-legend', children: [
          ['on_track', 'On track'], ['at_risk', 'At risk'], ['stalled', 'Stalled'], ['idle', 'Idle'], ['unknown', 'Unverified'],
        ].map(([state, label]) => jsxs('span', { children: [jsx('i', { className: `dockyard-health-dot ${state}`, 'aria-hidden': true }), label] }, state)) }),
      ]}),
      jsxs('div', { className: 'dockyard-command-layout', children: [
        jsxs('div', { className: 'dockyard-command-main', children: [
          jsxs('section', { className: 'dockyard-command-section', children: [
            jsxs('div', { className: 'dockyard-section-head', children: [
              jsxs('div', { children: [jsxs('h2', { children: [jsx(Icon, { name: 'triangle-alert' }), 'Needs you now'] }), jsx('p', { children: 'Decisions and blocked work, ranked by waiting age.' })] }),
              jsxs('div', { className: 'dockyard-command-section-actions', children: [
                jsx(Button, { small: true, onClick: () => setSubview('issues'), children: 'View all issues' }),
                jsx(Button, { small: true, onClick: onInbox, children: `View approvals (${number(waiting)})` }),
              ] }),
            ]}),
            jsxs('div', { className: 'dockyard-command-table-wrap', children: [
              jsxs('div', { className: 'dockyard-command-row dockyard-command-attention-head', role: 'row', children: [
                jsx('span', { children: 'Type' }), jsx('span', { children: 'Item' }), jsx('span', { children: 'Project' }), jsx('span', { children: 'Impact' }), jsx('span', { children: 'Waiting' }),
              ]}),
              rows.length ? rows.map((item, index) => jsxs('button', { type: 'button', className: `dockyard-command-row dockyard-command-attention-row${focusItem === item ? ' is-selected' : ''}`,
                onClick: () => setSelected(item), 'aria-label': `Inspect ${item.title}`, children: [
                  jsx('span', { className: `dockyard-command-type ${item.kind === 'initiative_approval' ? 'approval' : 'blocker'}`, children: item.kind === 'initiative_approval' ? 'Approval' : 'Blocked' }),
                  jsxs('span', { className: 'dockyard-command-title', children: [jsx('strong', { children: item.title }), jsx('small', { children: item.ref || item.detail || '' })] }),
                  jsx('span', { children: item.project }), jsx('span', { children: item.kind === 'initiative_approval' ? `Risk: ${readableLabel(item.risk)}` : 'Work blocked' }),
                  jsx('span', { children: typeof item.age_days === 'number' ? `${number(item.age_days)}d` : 'Not recorded' }),
                ]}, `${item.kind}:${item.ref || index}`)) : jsx('p', { className: 'dockyard-command-empty', children: 'No decisions or blocked work need attention.' }),
            ]}),
          ]}),
          jsxs('section', { className: 'dockyard-command-section', children: [
            jsxs('div', { className: 'dockyard-section-head', children: [
              jsxs('div', { children: [jsxs('h2', { children: [jsx(Icon, { name: 'folder-kanban' }), 'Project health'] }), jsx('p', { children: `Portfolio status across ${number(projects.length)} ${plural(projects.length, 'project')}.` })] }),
              jsx(Button, { small: true, onClick: () => setSubview('projects'), children: 'View all projects' }),
            ]}),
            jsxs('div', { className: 'dockyard-command-table-wrap', role: 'table', 'aria-label': 'Project fleet', children: [
              jsxs('div', { className: 'dockyard-command-row dockyard-command-project-head', role: 'row', children: [
                ...['Project', 'Owner', 'Health', 'Progress', 'Next milestone', 'Delivery risk'].map(label => jsx('span', { role: 'columnheader', children: label }, label)),
              ]}),
              projects.map(renderProjectRow),
            ]}),
          ]}),
        ]}),
        jsxs('aside', { className: 'dockyard-command-detail', 'aria-label': 'Selected item details', children: [
          jsxs('div', { className: 'dockyard-command-detail-head', children: [jsx('h2', { children: focusItem?.kind === 'initiative_approval' ? 'Approval' : 'Item details' }), focusItem ? jsx(Button, { small: true, onClick: () => setSelected(false), children: 'Close' }) : null] }),
          focusItem ? jsxs(Fragment, { children: [
            jsx('h3', { children: focusItem.title }),
            jsx('p', { className: 'dockyard-meta', children: `${focusItem.project} · ${focusItem.ref || ''} · ${number(focusItem.age_days ?? 0)} ${plural(focusItem.age_days ?? 0, 'day')} waiting` }),
            detailError ? jsx('p', { role: 'alert', children: detailError }) : null,
            focusItem.kind === 'initiative_approval' && decision ? jsxs(Fragment, { children: [
              jsx('h4', { children: 'Summary' }), jsx('p', { children: decision.reason || 'No rationale supplied.' }),
              jsx('h4', { children: 'Expected outcome' }), jsx('p', { children: decision.expected_outcome || 'Not supplied.' }),
              jsx('h4', { children: 'Decision context' }),
              jsxs('dl', { children: [jsx('dt', { children: 'Risk' }), jsx('dd', { children: readableLabel(decision.risk) }),
                jsx('dt', { children: 'Proposer' }), jsx('dd', { children: String(decision.proposer || 'Stewardship') }),
                jsx('dt', { children: 'Evidence contract' }), jsx('dd', { children: validationSummary(decision.validation?.contract) })] }),
            ]}) : null,
            jsx('h4', { children: 'Recent activity' }),
            jsx('div', { className: 'dockyard-command-detail-activity', children: (view.notifications?.notifications ?? []).filter((note) => note.project === focusItem.project).slice(0, 3).map((note) => jsx('p', { children: `${note.title} · ${formatWhen(note.created_at)}` }, note.id)) }),
            jsx(Button, { variant: 'primary', onClick: () => focusItem.kind === 'initiative_approval' ? onInbox?.() : onOpen?.(focusItem.deep_link), children: focusItem.kind === 'initiative_approval' ? 'Review approval' : 'Open work item' }),
          ]}) : jsx('p', { children: 'Select an item to see its details.' }),
        ]}),
      ]}),
    ]}),
  ]})
}

export function InitiativeRevisionRow({ initiative, onResubmitted }) {
  const returned = initiative.status === 'changes_requested'
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [feedback, setFeedback] = useState([])
  const [rationale, setRationale] = useState(initiative.rationale || '')
  useEffect(() => {
    if (!returned || !open) return undefined
    let disposed = false
    api(`/initiatives/${encodeURIComponent(initiative.ref)}/decision/receipts`)
      .then((receipts) => {
        if (disposed) return
        const rows = (receipts.receipts ?? []).filter((r) => r.decision === 'changes_requested')
        setFeedback(rows)
      })
      .catch(() => {})
    return () => { disposed = true }
  }, [returned, open, initiative.ref])
  const resubmit = async () => {
    setBusy(true)
    setError(null)
    try {
      await api(`/initiatives/${encodeURIComponent(initiative.ref)}/resubmit`, {
        method: 'POST', body: { rationale: rationale.trim() }, suppressErrorToast: true,
      })
      emitToast('success', 'Resubmitted for approval')
      // The row must reflect the new state immediately; the payload refresh is
      // the authoritative source (never a client-side status rewrite).
      onResubmitted?.(initiative.ref)
    } catch (failure) {
      setError(`Resubmission was not recorded. ${String(failure?.message ?? failure)}`)
    } finally { setBusy(false) }
  }
  return jsxs('article', { 'data-initiative-row': initiative.ref, 'data-initiative-status': initiative.status, children: [
    jsxs('span', { children: [jsx('strong', { children: initiative.title }), jsx('small', { children: initiative.expected_outcome || initiative.rationale || initiative.ref })] }),
    returned ? jsx(Button, { small: true, onClick: () => setOpen((v) => !v), children: open ? 'Hide revision' : 'Revise & resubmit' })
      : jsx(StatusTag, { tone: initiative.status === 'pending_approval' ? 'warning' : 'info', label: String(initiative.status || 'unknown').replaceAll('_', ' ') }),
    returned && open ? jsxs('div', { className: 'dockyard-initiative-revision', 'data-resubmit-form': true, children: [
      feedback.length ? jsxs('div', { className: 'dockyard-comment-thread', children:
        feedback.map((row) => jsxs('p', { children: [
          jsx('strong', { children: row.actor }), jsx('span', { children: ` · ${row.reason}` }),
        ]}, row.id)),
      }) : jsx('p', { className: 'dockyard-meta', children: 'Loading reviewer feedback…' }),
      jsx('input', {
        value: rationale, onChange: (event) => setRationale(event.target.value),
        placeholder: 'Revised rationale (address the feedback)', 'aria-label': 'Revised rationale',
      }),
      jsx(Button, { small: true, variant: 'primary', onClick: resubmit, disabled: busy || !rationale.trim(), children: busy ? 'Resubmitting…' : 'Resubmit' }),
      error ? jsx('p', { className: 'dockyard-inline-error', role: 'alert', children: error }) : null,
    ]}) : null,
  ]})
}

export function FirstAssessmentCard({ projectId }) {
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const run = async () => {
    setBusy(true)
    setError(null)
    try {
      const out = await api(`/projects/${encodeURIComponent(projectId)}/first-assessment`, {
        method: 'POST', body: {},
      })
      setResult(out)
    } catch (failure) {
      setError(String(failure?.message ?? failure))
    }
    setBusy(false)
  }
  return jsxs('section', { className: 'dockyard-feature-card dockyard-first-assessment', 'data-first-assessment': true, children: [
    jsxs('div', { className: 'dockyard-section-head', children: [
      jsxs('div', { children: [
        jsx('h2', { children: 'First read-only assessment' }),
        jsx('p', { children: 'One manual cycle: verifies the repo, records health and objective evidence. Enables no schedules.' }),
      ]}),
      jsx(Button, {
        action: 'run-first-assessment',
        variant: 'primary',
        small: true,
        disabled: busy,
        onClick: run,
        children: busy ? 'Assessing…' : 'Run first assessment',
      }),
    ]}),
    error ? jsx('p', { className: 'dockyard-inline-error', role: 'alert', children: error }) : null,
    result ? jsxs('dl', { className: 'dockyard-onboarding-review', 'data-assessment-result': true, children: [
      jsx('dt', { children: 'Verification' }), jsx('dd', { children: result.assessment?.verification_ok ? 'Passed' : 'Not passed' }),
      jsx('dt', { children: 'Health' }), jsx('dd', { children: result.assessment?.health_state ?? 'unknown' }),
      jsx('dt', { children: 'Objectives assessed' }), jsx('dd', { children: number((result.assessment?.objective_results ?? []).length) }),
      jsx('dt', { children: 'Initiatives created' }), jsx('dd', { children: number(result.assessment?.initiatives_created ?? 0) }),
      jsx('dt', { children: 'Schedules' }), jsx('dd', { children: result.schedules_enabled ? 'enabled' : 'disabled (onboarding never enables automation)' }),
    ]}) : null,
  ]})
}
