// GENERATED-STRUCTURE: hand-edited Desktop module. Edit this file, then run
// node hermes_dockyard_plugin/desktop/build.mjs to regenerate plugin.js.
import { useState } from '../runtime/react.js'
import { useRef } from '../runtime/react.js'
import { api } from '../runtime/context.js'
import { useEffect } from '../runtime/react.js'
import { mountDesktopWorkflowCanvas } from '../../workflow-canvas-mount.js'
import { validateConnection } from '../../workflow-canvas-mount.js'
import { jsxs } from '../runtime/react.js'
import { jsx } from '../runtime/react.js'
import { StatusTag } from '../lib/ui.js'
import { number } from '../lib/ui.js'
import { Button } from '../lib/ui.js'
export function ExecutableWorkflowsPanel({ project, workflows, onRefresh }) {
  const [name, setName] = useState('release')
  const [title, setTitle] = useState('Draft release plan')
  const [team, setTeam] = useState('')
  const [runKey, setRunKey] = useState('')
  const [phaseTeams, setPhaseTeams] = useState({})
  const canvasRef = useRef(null)
  const [selected, setSelected] = useState(workflows?.[0]?.name ?? '')
  const [runs, setRuns] = useState([])
  const [error, setError] = useState(null)
  // v6 composition: the canvas is the surface. 'live' draws the latest
  // canonical run (the shipped default — statuses are read from the real run
  // projection); 'definition' draws the stored plan with no run overlay.
  // Both read the same mount; neither invents graph state.
  const [mode, setMode] = useState('live')
  const [validation, setValidation] = useState(null)
  const encoded = encodeURIComponent(project.id)
  const grouped = Object.values((workflows ?? []).reduce((all, row) => {
    const item = all[row.name] ?? { name: row.name, versions: [], archived_at: row.archived_at }
    item.versions.push(row); item.archived_at = row.archived_at; all[row.name] = item; return all
  }, {}))
  const current = grouped.find((item) => item.name === selected) ?? grouped[0]
  const definition = current?.versions?.[current.versions.length - 1]?.definition ?? { nodes: [] }
  const nodes = definition.nodes ?? []
  // The persisted definition's nodes in the canvas's own vocabulary, so toolbar
  // actions persist through the exact mapping the canvas edits use.
  const currentCanvasNodes = () => nodes.map((n) => ({
    node_id: n.node_id ?? n.id,
    title: n.title ?? n.name ?? n.id,
    depends_on: n.depends_on ?? [],
    human_gate: Boolean(n.human_gate),
    task_ref: n.task_ref ?? null,
    kind: n.kind ?? (n.human_gate ? 'gate' : 'task'),
    phase_team: n.phase_team ?? null,
    canvas_position: n.canvas_position ?? undefined,
  }))
  const loadRuns = async (workflow = current?.name) => {
    if (!workflow) return
    try { const result = await api(`/projects/${encoded}/workflows/${encodeURIComponent(workflow)}/runs`); setRuns(result.runs ?? []) }
    catch (failure) { setError(String(failure?.message ?? failure)) }
  }
  useEffect(() => { loadRuns() }, [selected, workflows?.length])
  useEffect(() => {
    if (!canvasRef.current || !current) return undefined
    // Live mode renders the real canonical run (the mount falls back to the
    // definition frame when no run exists); definition mode renders the stored
    // plan with no run overlay. Same mount, same data source — a display
    // choice only.
    const visibleRuns = mode === 'live' ? runs : []
    return mountDesktopWorkflowCanvas(canvasRef.current, project.id, current.name, definition, visibleRuns, {
      onEdit: async (editedNodes) => {
        await api(`/projects/${encoded}/workflows/${encodeURIComponent(current.name)}/versions`, { method: 'POST', body: { nodes: editedNodes.map(({ node_id, title, depends_on, human_gate, task_ref, kind, phase_team, canvas_position }) => ({ id: node_id, title, depends_on, human_gate, task_ref, kind, phase_team, canvas_position })) } })
        onRefresh?.()
      },
      // Gate decisions use the same canonical authority as the dashboard: the
      // reviewed decision fingerprint is submitted with the action, so a stale
      // review can never approve something else. Retry re-queues via the
      // canonical work-item transition — never an optimistic local flip.
      onApprove: async (ref) => {
        const decision = await api(`/initiatives/${encodeURIComponent(ref)}/decision`)
        await api(`/initiatives/${encodeURIComponent(ref)}/approve`, { method: 'POST', body: { expected_fingerprint: decision.fingerprint } })
        await loadRuns(current.name)
      },
      onReject: async (ref) => {
        const decision = await api(`/initiatives/${encodeURIComponent(ref)}/decision`)
        await api(`/initiatives/${encodeURIComponent(ref)}/reject`, { method: 'POST', body: { expected_fingerprint: decision.fingerprint, reason: 'Rejected from workflow gate review' } })
        await loadRuns(current.name)
      },
      onRetry: async (ref) => {
        await api(`/projects/${encoded}/work-items/${encodeURIComponent(ref)}/transition`, { method: 'POST', body: { status: 'backlog' } })
        await loadRuns(current.name)
      },
    })  }, [project.id, current?.name, current?.versions?.length, runs, mode])
  const mutate = async (path, body = {}) => {
    setError(null)
    try { await api(path, { method: 'POST', body }); onRefresh?.() }
    catch (failure) { setError(String(failure?.message ?? failure)) }
  }
  const define = () => {
    if (!name.trim() || !title.trim()) return
    const existing = grouped.find((item) => item.name === name.trim())
    const path = `/projects/${encoded}/workflows${existing ? `/${encodeURIComponent(name.trim())}/versions` : ''}`
    mutate(path, { ...(existing ? {} : { name: name.trim() }), nodes: [{ id: 'step-1', title: title.trim(), depends_on: [], human_gate: false, team: team || null, phase_team: phaseTeams['step-1'] || null }] })
    setSelected(name.trim()); setTitle('')
  }
  // Toolbar actions persist through the SAME version contract the canvas uses.
  const persistNodes = (nextNodes) => {
    if (!current) return
    void mutate(`/projects/${encoded}/workflows/${encodeURIComponent(current.name)}/versions`, {
      nodes: nextNodes.map(({ node_id, title: nodeTitle, depends_on, human_gate, task_ref, kind, phase_team, canvas_position }) => ({ id: node_id, title: nodeTitle, depends_on, human_gate, task_ref, kind, phase_team, canvas_position })),
    })
  }
  const addNode = (gate) => {
    const existingIds = new Set(currentCanvasNodes().map((n) => n.node_id))
    let index = nodes.length + 1
    while (existingIds.has(gate ? `gate-${index}` : `step-${index}`)) index += 1
    const id = gate ? `gate-${index}` : `step-${index}`
    persistNodes([...currentCanvasNodes(), {
      node_id: id, title: gate ? `Gate ${index}` : `Step ${index}`, depends_on: [],
      human_gate: gate, task_ref: null, kind: gate ? 'gate' : 'task', phase_team: null,
    }])
  }
  // Auto layout: dropping canvas_position lets the layout engine place every
  // node by topology again. It writes the version, like any other edit.
  const autoLayout = () => persistNodes(currentCanvasNodes())
  const validateGraph = () => {
    const nodesNow = currentCanvasNodes()
    const issues = []
    for (const n of nodesNow) {
      for (const dep of n.depends_on) {
        const problem = validateConnection(nodesNow, dep, n.node_id)
        if (problem) issues.push(`${n.title} ← ${dep}: ${problem}`)
      }
    }
    if (!nodesNow.some((n) => n.human_gate)) issues.push('no human gate on this graph')
    // Both outcomes are stated: an empty result is a finding too, and it must
    // not read as "the button did nothing".
    setValidation(issues.length ? { ok: false, text: `Validation: ${issues.join('; ')}` } : { ok: true, text: 'Validation: no issues found' })
  }
  const statusFor = (run, node) => run?.nodes?.find((item) => item.node_id === (node.id || node.node_id))?.status ?? 'pending'
  const latest = runs[0]
  const liveCounts = latest ? (latest.nodes ?? []).reduce((acc, node) => { const key = node.status ?? 'pending'; acc[key] = (acc[key] ?? 0) + 1; return acc }, {}) : null
  return jsxs('section', { className: 'dockyard-feature-card dockyard-workflows-v6', 'data-workflows-prototype': project.id, 'data-executable-workflows': project.id, children: [
    jsxs('header', { className: 'dockyard-section-head', children: [jsxs('div', { children: [jsx('h2', { children: 'Workflows' }), jsx('p', { children: 'Planning is saved as a version; execution is shown only from canonical runs.' })] }), jsx(StatusTag, { tone: latest?.status === 'running' ? 'info' : 'neutral', label: latest ? `Live: ${latest.status}` : `${number(grouped.length)} instances` })] }),
    error ? jsx('p', { className: 'dockyard-inline-error', role: 'alert', children: error }) : null,
    jsxs('div', { className: 'dockyard-wf3', children: [
      // ---- Zone 1: workflow library + create/define editor ---------------
      jsxs('aside', { className: 'dockyard-wf3-lib', 'data-workflow-library': project.id, children: [
        jsxs('div', { className: 'dockyard-wf3-lib-head', children: [jsx('strong', { children: 'Library' }), jsx('span', { children: number(grouped.length) })] }),
        grouped.length ? jsx('div', { className: 'dockyard-wf3-lib-list', children: grouped.map((item) => jsxs('button', {
          type: 'button',
          className: item.name === current?.name ? 'active' : '',
          'data-workflow-library-item': item.name,
          'data-action': 'select-workflow',
          onClick: () => { setSelected(item.name); loadRuns(item.name) },
          children: [
            jsx('strong', { children: item.name }),
            jsx('small', { children: `v${item.versions[item.versions.length - 1].version}${item.archived_at ? ' · archived' : ''}` }),
          ],
        }, item.name)) }) : jsx('p', { className: 'dockyard-meta', children: 'No workflow instances yet.' }),
        jsxs('div', { className: 'dockyard-inline-editor', children: [
          jsxs('label', { children: [jsx('span', { children: 'Template / instance' }), jsx('input', { 'data-workflow-name': true, value: name, onChange: (event) => setName(event.target.value) })] }),
          jsxs('label', { children: [jsx('span', { children: 'Phase title' }), jsx('input', { 'data-workflow-title': true, value: title, onChange: (event) => setTitle(event.target.value) })] }),
          jsxs('label', { children: [jsx('span', { children: 'Default bot team' }), jsx('input', { 'data-workflow-team': true, value: team, placeholder: 'team slug', onChange: (event) => setTeam(event.target.value) })] }),
          jsxs('label', { children: [jsx('span', { children: 'Run key' }), jsx('input', { 'data-workflow-run-key': current?.name ?? name, value: runKey, onChange: (event) => setRunKey(event.target.value), placeholder: 'execution key' })] }),
          jsx(Button, { action: 'define-workflow', variant: 'primary', disabled: !name.trim() || !title.trim(), onClick: define, children: current ? 'Save planning version' : 'Create instance' }),
        ] }),
      ]}),
      // ---- Zone 2: toolbar + canvas (the surface) -------------------------
      jsxs('div', { className: 'dockyard-wf3-stage', children: [
        jsxs('div', { className: 'dockyard-wf3-toolbar', role: 'toolbar', 'aria-label': 'Workflow canvas tools', children: [
          jsx(Button, { small: true, action: 'wf-view-definition', variant: mode === 'definition' ? 'primary' : '', onClick: () => setMode('definition'), children: 'Definition' }),
          jsx(Button, { small: true, action: 'wf-view-live', variant: mode === 'live' ? 'primary' : '', disabled: !latest, onClick: () => setMode('live'), children: 'Live run' }),
          jsx('span', { className: 'dockyard-wf3-sep', 'aria-hidden': true }),
          jsx(Button, { small: true, action: 'wf-add-step', disabled: !current, onClick: () => addNode(false), children: '＋ Step' }),
          jsx(Button, { small: true, action: 'wf-add-gate', disabled: !current, onClick: () => addNode(true), children: '＋ Gate' }),
          jsx(Button, { small: true, action: 'wf-auto-layout', disabled: !current, onClick: autoLayout, children: 'Auto layout' }),
          jsx(Button, { small: true, action: 'wf-validate', disabled: !current, onClick: validateGraph, children: 'Validate' }),
          jsx('span', { className: 'dockyard-wf3-sep', 'aria-hidden': true }),
          jsx(Button, { small: true, action: 'inspect-workflow', disabled: !current, onClick: () => { setSelected(current.name); loadRuns(current.name) }, children: 'Refresh canvas' }),
        ]}),
        validation ? jsx('p', { className: 'dockyard-wf3-validation', role: 'status', 'data-wf-validate-result': validation.ok ? 'ok' : 'issues', children: validation.text }) : null,
        current ? jsx('div', { ref: canvasRef, className: 'dockyard-workflow-graph', 'data-workflow-canvas': current.name, role: 'img', 'aria-label': 'Workflow planning graph' }) : jsx('p', { className: 'dockyard-meta', children: 'No workflow selected.' }),
      ]}),
      // ---- Zone 3: run inspector (canonical runs + versions + lifecycle) --
      jsxs('aside', { className: 'dockyard-wf3-insp', children: [
        jsxs('div', { className: 'dockyard-wf3-insp-head', children: [jsx('strong', { children: 'Run inspector' }), current ? jsx('span', { children: `v${current.versions[current.versions.length - 1].version}` }) : null] }),
        latest ? jsxs('div', { 'data-workflow-live-run': latest.run_key, children: [
          jsx(StatusTag, { tone: latest.status === 'completed' ? 'success' : latest.status === 'failed' ? 'danger' : 'info', label: latest.status }),
          jsx('p', { className: 'dockyard-wf3-runkey', children: `${latest.run_key} · v${latest.version}` }),
          liveCounts ? jsx('p', { className: 'dockyard-wf3-counts', children: ['done', 'working', 'blocked', 'pending'].filter((k) => liveCounts[k]).map((k) => `${liveCounts[k]} ${k}`).join(' · ') }) : null,
          jsx('ul', { children: (latest.nodes ?? []).map((node) => jsx('li', { children: `${node.title} — ${node.status ?? 'pending'}${node.assignee ? ` · ${node.assignee}` : ''}` }, node.node_id)) }),
        ] }) : jsx('p', { className: 'dockyard-meta', children: 'No canonical run recorded. Start a run to see truthful state.' }),
        jsxs('div', { className: 'dockyard-form-actions', children: current ? current.versions.map((version) => jsx(Button, { action: 'start-workflow', disabled: Boolean(current.archived_at), onClick: async () => { await mutate(`/projects/${encoded}/workflows/${encodeURIComponent(current.name)}/start`, { version: version.version, run_key: runKey || `${current.name}-${Date.now()}` }); await loadRuns(current.name) }, children: `Start v${version.version}` }, String(version.version))) : null }),
        current ? jsxs('details', { className: 'dockyard-workflow-definitions', 'data-workflow-definitions': current.name, children: [
          jsx('summary', { children: 'Stored definition versions' }),
          ...current.versions.map((version) => jsxs('section', { 'data-workflow-definition-version': version.version, children: [
            jsx('strong', { children: `Version ${version.version}` }),
            jsx('pre', { children: JSON.stringify(version.definition?.nodes ?? [], null, 2) }),
          ]}, `definition-${version.version}`)),
        ]}) : null,
        jsxs('div', { className: 'dockyard-form-actions', children: current ? [
          current.archived_at
            ? jsx(Button, { action: 'restore-workflow', onClick: () => mutate(`/projects/${encoded}/workflows/${encodeURIComponent(current.name)}/restore`), children: 'Restore workflow' })
            : jsx(Button, { action: 'archive-workflow', variant: 'danger', onClick: () => mutate(`/projects/${encoded}/workflows/${encodeURIComponent(current.name)}/archive`), children: 'Archive workflow' }),
        ] : null }),
      ]}),
    ]}),
  ]})
}

// P9.2/P9.3/P9.4/P9.5: milestone planning panel (table/summary first —
// deliberately no Gantt, no scheduling engine, no auto-replan). Milestone
// actions reuse the canonical milestone contracts and are audited there.
export function PlanningPanel({ project, milestones, workItems, onRefresh }) {
  const today = new Date().toISOString().slice(0, 10)
  const [expanded, setExpanded] = useState(null)
  const [detail, setDetail] = useState(null)
  const [notice, setNotice] = useState(null)
  const [newName, setNewName] = useState('')
  const [newDue, setNewDue] = useState('')
  const loadDetail = (name) => {
    if (expanded === name) { setExpanded(null); setDetail(null); return }
    setExpanded(name)
    setDetail(null)
    api(`/projects/${encodeURIComponent(project.id)}/milestones/${encodeURIComponent(name)}`)
      .then((d) => setDetail(d))
      .catch(() => setNotice(`Planning details for ${name} are unavailable.`))
  }
  const act = (path, body = {}, method = 'POST') => {
    setNotice(null)
    api(path, { method, body })
      .then(() => { setExpanded(null); setDetail(null); onRefresh?.() })
      .catch((error) => setNotice(error?.message || 'Action failed.'))
  }
  const create = () => {
    if (!newName.trim()) return
    act(`/projects/${encodeURIComponent(project.id)}/milestones`, {
      name: newName.trim(), due: newDue || null,
    })
    setNewName('')
    setNewDue('')
  }
  const rename = (name) => {
    const target = detail?.renameValue?.trim()
    if (!target || target === name) return
    act(`/projects/${encodeURIComponent(project.id)}/milestones/${encodeURIComponent(name)}/rename`,
      { new_name: target })
  }
  const closeReopen = (m) => act(
    `/projects/${encodeURIComponent(project.id)}/milestones/${encodeURIComponent(m.name)}`,
    { closed: !m.closed }, 'PATCH')
  const updateDue = (m) => act(
    `/projects/${encodeURIComponent(project.id)}/milestones/${encodeURIComponent(m.name)}`,
    { due: detail?.dueValue || null }, 'PATCH')
  const forecastLine = (fc) => {
    if (!fc) return 'Forecast unavailable.'
    if (fc.state === 'complete') return 'Forecast: complete.'
    if (fc.state === 'insufficient_history') {
      return `Forecast: insufficient history (${fc.sample_size ?? 0} completions in the last ${fc.assumptions?.window_weeks ?? 4} complete weeks; needs ${fc.assumptions?.min_sample ?? 8}).`
    }
    if (fc.state === 'not_comparable') return 'Forecast: work history is not comparable.'
    const range = fc.range_weeks ?? {}
    const upper = range.upper_open_ended ? 'open-ended (a zero-throughput week was observed)' : `${range.upper} weeks`
    return `Forecast: ~${fc.central_weeks} weeks central (range ${range.lower}–${upper}); ${fc.sample_size} completions. A count-based scenario, not a delivery promise.`
  }
  return jsxs('section', { className: 'dockyard-feature-card', 'data-planning-panel': true, children: [
    jsx('h2', { children: 'Milestone planning' }),
    notice && jsx('p', { className: 'dockyard-inline-error', role: 'alert', children: notice }),
    jsx('p', { className: 'dockyard-meta', children: 'Counts are item counts, not hour estimates. Forecast is a scenario from completed-item history, never a delivery promise.' }),
    jsxs('div', { className: 'dockyard-inline-editor', 'data-milestone-create': true, children: [
      jsxs('label', { children: [jsx('span', { children: 'Milestone name' }), jsx('input', { 'data-milestone-name': true, value: newName, onChange: (event) => setNewName(event.target.value) })] }),
      jsxs('label', { children: [jsx('span', { children: 'Due date' }), jsx('input', { 'data-milestone-due': true, type: 'date', value: newDue, onChange: (event) => setNewDue(event.target.value) })] }),
      jsx(Button, { action: 'create-milestone', variant: 'primary', disabled: !newName.trim(), onClick: create, children: 'Create milestone' }),
    ]}),
    milestones.length === 0 ? jsx('p', { className: 'dockyard-meta', children: 'No milestones yet. Create one here with the form above; it appears in this panel for review.' }) : null,
    jsx('div', { className: 'dockyard-planning-table', role: 'table', 'aria-label': 'Milestones and delivery risk', children:
      milestones.map((m, index) => {
        const overdue = !m.closed && m.due && m.due < today
        const isOpen = expanded === m.name
        const d = isOpen ? detail : null
        return jsxs('div', { className: `dockyard-planning-row${overdue ? ' dockyard-milestone-overdue' : ''}`, 'data-milestone-row': m.name, role: 'row', children: [
          jsxs('button', { type: 'button', className: 'dockyard-planning-toggle', onClick: () => loadDetail(m.name), 'aria-expanded': String(isOpen), children: [
            jsx('span', { className: 'dockyard-planning-name', children: m.closed ? `${m.name} (closed)` : m.name }, 'name'),
            jsx('span', { children: m.due ? `Due ${m.due}` : 'No due date' }, 'due'),
            jsx('span', { children: `${m.done}/${m.total} done` }, 'count'),
          ]}),          d && jsx('div', { className: 'dockyard-planning-detail', children: [
            jsx('p', { className: 'dockyard-meta', children: `Scope: ${d.committed ?? d.total} committed, ${d.done} done, ${d.blocked ?? 0} blocked (${d.units || 'items'}, not hours).` }, 'scope'),
            (d.assignee_wip && Object.keys(d.assignee_wip).length > 0)
              ? jsx('p', { className: 'dockyard-meta', children: `Assignee WIP: ${Object.entries(d.assignee_wip).map(([who, n]) => `${who}: ${n}`).join(', ')} (item counts).` }, 'wip')
              : jsx('p', { className: 'dockyard-meta', children: 'No in-progress assignments.' }, 'no-wip'),
            (d.risks ?? []).length > 0
              ? jsx('ul', { className: 'dockyard-planning-risks', children: d.risks.map((risk, index) => jsxs('li', { 'data-risk-kind': risk.kind, children: [
                  risk.kind === 'dependency_blocker' && risk.item
                    ? `${risk.item} blocked by ${(risk.blockers ?? []).join(', ')} — owner ${risk.owner || 'unassigned'}`
                    : risk.kind === 'overdue_item' && risk.item
                      ? `${risk.item} overdue — owner ${risk.owner || 'unassigned'}`
                      : risk.kind === 'milestone_overdue'
                        ? `Milestone past its due date with ${risk.remaining} item(s) remaining.`
                        : risk.kind,
                ] }, `${risk.kind}:${risk.item ?? 'risk'}:${index}`)) }, 'risks')
              : jsx('p', { className: 'dockyard-meta', children: 'No blocking risks recorded.' }, 'no-risks'),
            jsx('p', { className: 'dockyard-planning-forecast', children: forecastLine(d.forecast) }, 'forecast'),
            jsxs('div', { className: 'dockyard-inline-editor', children: [
              jsxs('label', { children: [jsx('span', { children: 'Rename' }), jsx('input', { 'data-milestone-rename': m.name, defaultValue: m.name, onChange: (event) => setDetail((current) => ({ ...current, renameValue: event.target.value })) })] }, 'rename-field'),
              jsx(Button, { action: 'rename-milestone', onClick: () => rename(m.name), children: 'Rename' }, 'rename'),
              jsxs('label', { children: [jsx('span', { children: 'Due date' }), jsx('input', { type: 'date', 'data-milestone-edit-due': m.name, defaultValue: m.due || '', onChange: (event) => setDetail((current) => ({ ...current, dueValue: event.target.value })) })] }, 'due-field'),
              jsx(Button, { action: 'update-milestone-due', onClick: () => updateDue(m), children: 'Update due date' }, 'due'),
              jsx(Button, { action: m.closed ? 'reopen-milestone' : 'close-milestone', onClick: () => closeReopen(m), children: m.closed ? 'Reopen' : 'Close' }, 'close'),
              m.archived_at
                ? jsx(Button, { action: 'restore-milestone', onClick: () => act(`/projects/${encodeURIComponent(project.id)}/milestones/${encodeURIComponent(m.name)}/restore`), children: 'Restore' }, 'restore')
                : jsx(Button, { action: 'archive-milestone', variant: 'danger', onClick: () => act(`/projects/${encodeURIComponent(project.id)}/milestones/${encodeURIComponent(m.name)}/archive`), children: 'Archive' }, 'archive'),
              jsxs('label', { children: [jsx('span', { children: 'Scope item' }), jsx('select', { 'data-milestone-scope': m.name, defaultValue: '', onChange: (event) => setDetail((current) => ({ ...current, scopeRef: event.target.value })), children: [jsx('option', { value: '', children: 'Select work item' }, 'empty'), ...workItems.map((item) => jsx('option', { value: item.ref, children: `${item.ref} — ${item.title}` }, item.ref))] })] }, 'scope-field'),
              jsx(Button, { action: 'attach-milestone-scope', disabled: !d.scopeRef, onClick: () => act(`/projects/${encodeURIComponent(project.id)}/milestones/${encodeURIComponent(m.name)}/attach`, { ref: d.scopeRef }), children: 'Attach' }, 'attach'),
              (d.item_refs ?? []).map((ref) => jsx(Button, { action: 'detach-milestone-scope', onClick: () => act(`/projects/${encodeURIComponent(project.id)}/milestones/${encodeURIComponent(m.name)}/detach`, { ref }), children: `Detach ${ref}` }, ref)),
            ]}, 'editor'),
            jsx('p', { className: 'dockyard-meta', children: 'Open a work item ref in the Board tab to drill into a blocker. Nothing is auto-reassigned or replanned.' }, 'note'),
          ] }),
        ]}, `${m.name}:item:${index}`)
      })
    }),
  ]})
}
