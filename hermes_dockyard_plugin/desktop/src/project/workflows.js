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
export function ExecutableWorkflowsPanel({ project, workflows, onRefresh, onOpenLibrary }) {
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
  const [layoutPendingVersion, setLayoutPendingVersion] = useState(null)
  const [libCollapsed, setLibCollapsed] = useState(false)
  const encoded = encodeURIComponent(project.id)
  const grouped = Object.values((workflows ?? []).reduce((all, row) => {
    const item = all[row.name] ?? { name: row.name, versions: [], archived_at: row.archived_at }
    item.versions.push(row); item.archived_at = row.archived_at; all[row.name] = item; return all
  }, {}))
  const current = grouped.find((item) => item.name === selected) ?? grouped[0]
  // An auto-layout POST creates a new version. Keep the graph non-interactive
  // until that version is rendered, otherwise selecting a node during the
  // refresh exposes an editor whose Save button is immediately detached.
  useEffect(() => {
    if (layoutPendingVersion !== null && current?.versions?.length > layoutPendingVersion) {
      setLayoutPendingVersion(null)
    }
  }, [layoutPendingVersion, current?.versions?.length])
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
      fetchTimeline: async (pid, wname, runKey) => api(`/projects/${encodeURIComponent(pid)}/workflows/${encodeURIComponent(wname)}/runs/${encodeURIComponent(runKey)}/timeline`),
    })  }, [project.id, current?.name, current?.versions?.length, runs, mode])
  const mutate = async (path, body = {}) => {
    setError(null)
    try { await api(path, { method: 'POST', body }); onRefresh?.(); return true }
    catch (failure) { setError(String(failure?.message ?? failure)); return false }
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
    if (!current) return Promise.resolve(false)
    return mutate(`/projects/${encoded}/workflows/${encodeURIComponent(current.name)}/versions`, {
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
  const autoLayout = async () => {
    if (!current || layoutPendingVersion !== null) return
    setLayoutPendingVersion(current.versions.length)
    if (!await persistNodes(currentCanvasNodes())) setLayoutPendingVersion(null)
  }
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
  const latestVersion = current?.versions?.[current.versions.length - 1] ?? null
  // A node needs attention when it is blocked or a human gate is waiting —
  // the two states the run projection actually reports.
  const needsAttention = (node) => node.status === 'blocked' || (node.status === 'pending' && node.human_gate)
  const attentionCount = latest ? (latest.nodes ?? []).filter(needsAttention).length : 0
  const startVersion = async (version) => {
    if (!current || !version) return
    await mutate(`/projects/${encoded}/workflows/${encodeURIComponent(current.name)}/start`, { version: version.version, run_key: runKey || `${current.name}-${Date.now()}` })
    await loadRuns(current.name)
  }
  const liveCounts = latest ? (latest.nodes ?? []).reduce((acc, node) => { const key = node.status ?? 'pending'; acc[key] = (acc[key] ?? 0) + 1; return acc }, {}) : null
  // W5 live map: read only from the canonical run projection. A node needs
  // attention when it is blocked or waiting on a human decision — the two
  // states the run projection actually reports; nothing is inferred beyond it.
  return jsxs('section', { className: 'dockyard-feature-card dockyard-workflows-v6', 'data-workflows-prototype': project.id, 'data-executable-workflows': project.id, children: [
    jsxs('div', { className: 'dockyard-wf-entry', 'data-workflow-library-entry': true, children: [
      jsx(Button, { action: 'open-workflow-library', variant: 'primary', onClick: onOpenLibrary, children: 'Open workflow library' }),
      jsx('span', { children: 'The library holds every workflow: global (available to all projects) and this project\'s dedicated ones.' }),
    ]}),
    jsxs('header', { className: 'dockyard-section-head', children: [jsxs('div', { children: [jsx('h2', { children: 'Workflows' }), jsx('p', { children: 'Planning is saved as a version; execution is shown only from canonical runs.' })] }), jsx(StatusTag, { tone: latest?.status === 'running' ? 'info' : 'neutral', label: latest ? `Live: ${latest.status}` : `${number(grouped.length)} instances` })] }),
    error ? jsx('p', { className: 'dockyard-inline-error', role: 'alert', children: error }) : null,
    jsxs('div', { className: libCollapsed ? 'dockyard-wf3 lib-collapsed' : 'dockyard-wf3', 'data-wf-library-collapsed': libCollapsed ? 'true' : 'false', children: [
      // ---- Zone 1: workflow library + create/define editor ---------------
      jsxs('aside', { className: 'dockyard-wf3-lib', 'data-workflow-library': project.id, 'aria-hidden': libCollapsed ? 'true' : undefined, inert: libCollapsed ? true : undefined, children: [
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
      // ---- Zone 2: toolbar + run readout + canvas (the surface) ----------
      // There is no third column: run lifecycle lives in the toolbar, the
      // canonical run state is a one-line readout above the canvas, and step
      // details open in the canvas's own floating panel.
      jsxs('div', { className: 'dockyard-wf3-stage', children: [
        jsxs('div', { className: 'dockyard-wf3-toolbar', role: 'toolbar', 'aria-label': 'Workflow canvas tools', children: [
          jsx('button', { type: 'button', className: 'dockyard-wf3-libtoggle', 'data-action': 'wf-toggle-library', 'aria-expanded': libCollapsed ? 'false' : 'true', 'aria-label': libCollapsed ? 'Show workflow library' : 'Hide workflow library', title: libCollapsed ? 'Show library' : 'Hide library', onClick: () => setLibCollapsed((v) => !v), children: libCollapsed ? '»' : '«' }),
          jsx('span', { className: 'dockyard-wf3-sep', 'aria-hidden': true }),
          jsx(Button, { small: true, action: 'wf-view-definition', variant: mode === 'definition' ? 'primary' : '', onClick: () => setMode('definition'), children: 'Definition' }),
          jsx(Button, { small: true, action: 'wf-view-live', variant: mode === 'live' ? 'primary' : '', disabled: !latest, onClick: () => setMode('live'), children: 'Live run' }),
          jsx('span', { className: 'dockyard-wf3-sep', 'aria-hidden': true }),
          jsx(Button, { small: true, action: 'wf-add-step', disabled: !current, onClick: () => addNode(false), children: '＋ Step' }),
          jsx(Button, { small: true, action: 'wf-add-gate', disabled: !current, onClick: () => addNode(true), children: '＋ Gate' }),
          jsx(Button, { small: true, action: 'wf-auto-layout', disabled: !current || layoutPendingVersion !== null, onClick: autoLayout, children: layoutPendingVersion !== null ? 'Saving layout…' : 'Auto layout' }),
          jsx(Button, { small: true, action: 'wf-validate', disabled: !current, onClick: validateGraph, children: 'Validate' }),
          jsx('span', { className: 'dockyard-wf3-sep', 'aria-hidden': true }),
          // Run lifecycle (was the inspector column). Start runs the LATEST
          // stored version; older versions start from the Versions menu.
          jsx(Button, { small: true, action: 'start-workflow', variant: 'primary', disabled: !current || Boolean(current?.archived_at), onClick: () => startVersion(latestVersion), children: latestVersion ? `▶ Start v${latestVersion.version}` : '▶ Start' }),
          current ? jsxs('details', { className: 'dockyard-wf3-versions', 'data-workflow-definitions': current.name, children: [
            jsx('summary', { children: `Versions (${current.versions.length})` }),
            jsx('div', { className: 'dockyard-wf3-versions-menu', children: [...current.versions].reverse().map((version) => jsxs('section', { 'data-workflow-definition-version': version.version, children: [
              jsxs('div', { className: 'dockyard-wf3-version-head', children: [
                jsx('strong', { children: `Version ${version.version}${version === latestVersion ? ' · latest' : ''}` }),
                jsx(Button, { small: true, action: 'start-workflow-version', disabled: Boolean(current.archived_at), onClick: () => startVersion(version), children: `Start v${version.version}` }),
              ] }),
              jsx('pre', { children: JSON.stringify(version.definition?.nodes ?? [], null, 2) }),
            ] }, `definition-${version.version}`)) }),
          ] }) : null,
          current ? (current.archived_at
            ? jsx(Button, { small: true, action: 'restore-workflow', onClick: () => mutate(`/projects/${encoded}/workflows/${encodeURIComponent(current.name)}/restore`), children: 'Restore' })
            : jsx(Button, { small: true, action: 'archive-workflow', variant: 'danger', onClick: () => mutate(`/projects/${encoded}/workflows/${encodeURIComponent(current.name)}/archive`), children: 'Archive' })) : null,
          jsx(Button, { small: true, action: 'inspect-workflow', disabled: !current, onClick: () => { setSelected(current.name); loadRuns(current.name) }, children: 'Refresh' }),
        ]}),
        validation ? jsx('p', { className: 'dockyard-wf3-validation', role: 'status', 'data-wf-validate-result': validation.ok ? 'ok' : 'issues', children: validation.text }) : null,
        layoutPendingVersion !== null ? jsx('p', { role: 'status', 'data-wf-layout-saving': true, children: 'Saving layout version before the graph can be edited…' }) : null,
        // Run readout: the latest canonical run only. Nothing here is inferred.
        latest ? jsxs('div', { className: 'dockyard-wf3-run', 'data-workflow-live-run': latest.run_key, children: [
          jsx(StatusTag, { tone: latest.status === 'completed' ? 'success' : latest.status === 'failed' ? 'danger' : 'info', label: latest.status }),
          jsx('span', { className: 'dockyard-wf3-runkey', children: `${latest.run_key} · v${latest.version}` }),
          liveCounts ? jsx('span', { className: 'dockyard-wf3-counts', children: ['done', 'working', 'blocked', 'pending'].filter((k) => liveCounts[k]).map((k) => `${liveCounts[k]} ${k}`).join(' · ') }) : null,
          jsxs('details', { className: 'dockyard-wf3-steps', children: [
            jsx('summary', { children: attentionCount ? `Steps · ${attentionCount} need attention` : 'Steps' }),
            jsx('ul', { 'data-wf-live-map': latest.run_key, children: (latest.nodes ?? []).map((node) => jsx('li', { 'data-wf-live-node': node.node_id, 'data-wf-needs-attention': needsAttention(node) ? 'true' : undefined, children: `${node.title} — ${node.status ?? 'pending'}${node.assignee ? ` · ${node.assignee}` : ''}${needsAttention(node) ? ' · needs attention' : ''}` }, node.node_id)) }),
          ] }),
        ] }) : jsx('p', { className: 'dockyard-wf3-run dockyard-meta', 'data-workflow-no-run': true, children: 'No canonical run recorded. Start a run to see truthful state.' }),
        current ? jsx('div', { ref: canvasRef, className: 'dockyard-workflow-graph', 'data-workflow-canvas': current.name, role: 'img', 'aria-label': 'Workflow planning graph', 'aria-busy': layoutPendingVersion !== null, style: layoutPendingVersion !== null ? { pointerEvents: 'none' } : undefined }) : jsx('p', { className: 'dockyard-meta', children: 'No workflow selected.' }),
      ]}),
    ]}),
  ]})
}
