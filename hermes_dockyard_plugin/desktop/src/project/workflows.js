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
import { plural } from '../lib/ui.js'
// Workflows design round (07/10/2026): review-only options behind ?review=1.
import { readWorkflowReview } from './workflow-design/review.js'
import { writeWorkflowReview } from './workflow-design/review.js'
import { nextReview } from './workflow-design/review.js'
import { WorkflowReviewBar } from './workflow-design/review.js'
import { canvasDesignHooks } from './workflow-design/step-settings.js'
import { NewWorkflowDialog } from './workflow-design/start-dialog.js'
import { CanvasStartCard } from './workflow-design/canvas-start.js'
import { AiSidePanel } from './workflow-design/ai-panel.js'
import { WorkflowSettingsDialog } from './workflow-design/shared.js'
import { RepeatPopover } from './workflow-design/shared.js'
import { readStepSettings } from './workflow-design/standins.js'
import { writeStepSettings } from './workflow-design/standins.js'
import { renameStandins } from './workflow-design/standins.js'
import { EMPTY_STEP } from './workflow-design/standins.js'
const NO_RUNS = []
const failureText = (failure) => String(failure?.message ?? failure ?? 'unknown error').replace(/^\d{3}:\s*/, '')
export function ExecutableWorkflowsPanel({ project, workflows, onRefresh, onOpenLibrary }) {
  const [name, setName] = useState('release')
  const [title, setTitle] = useState('Draft release plan')
  const [team, setTeam] = useState('')
  const [runKey, setRunKey] = useState('')
  const [phaseTeams, setPhaseTeams] = useState({})
  const canvasRef = useRef(null)
  const [selected, setSelected] = useState(workflows?.[0]?.name ?? '')
  // Runs belong to one workflow. Keyed by name so a newly opened workflow
  // never shows the previous workflow's run while its own runs load.
  const [runsFor, setRunsFor] = useState({ workflow: null, runs: NO_RUNS })
  const [error, setError] = useState(null)
  // v6 composition: the canvas is the surface. 'live' draws the latest
  // canonical run (the shipped default — statuses are read from the real run
  // projection); 'definition' draws the stored plan with no run overlay.
  // Both read the same mount; neither invents graph state.
  const [mode, setMode] = useState('live')
  const [validation, setValidation] = useState(null)
  const [layoutPendingVersion, setLayoutPendingVersion] = useState(null)
  const [libCollapsed, setLibCollapsed] = useState(false)
  // ---- design round (review only) ----------------------------------------
  const [review, setReview] = useState(() => readWorkflowReview())
  const [reviewHidden, setReviewHidden] = useState(false)
  const designOn = review.design !== 'today'
  const [members, setMembers] = useState([])
  const membersRef = useRef([])
  membersRef.current = members
  const [templates, setTemplates] = useState(null)
  const [dialog, setDialog] = useState(null)
  // An unsaved workflow on the canvas (option B, and AI changes to an open
  // one): { key, name, base: null | { name, version }, nodes }. Every change
  // goes through updateDraft so the canvas reads the same value React has.
  const [draft, setDraft] = useState(null)
  const draftRef = useRef(null)
  const updateDraft = (change) => {
    const next = typeof change === 'function' ? change(draftRef.current) : change
    draftRef.current = next
    setDraft(next)
    return next
  }
  const [aiOpen, setAiOpen] = useState(false)
  const [aiSeed, setAiSeed] = useState(null)
  const [repeatAt, setRepeatAt] = useState(null)
  const [draftError, setDraftError] = useState(null)
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
  const latestVersion = current?.versions?.[current.versions.length - 1] ?? null
  // The latest saved plan of the open workflow: the newest version in the
  // workflow list, or a save's own response when that is newer (the list is
  // re-fetched after a save and lags behind it). Every edit, from the canvas
  // or the toolbar, starts here. Edits used to start from whatever the canvas
  // showed, so a drag on a run's view saved a version without the steps added
  // since that run started (07/10/2026, WORKFLOWS-R1.md finding 14).
  const planRef = useRef({ name: null, version: -1, nodes: [] })
  if (current && latestVersion && (planRef.current.name !== current.name || latestVersion.version >= planRef.current.version)) {
    planRef.current = { name: current.name, version: latestVersion.version, nodes: latestVersion.definition?.nodes ?? [] }
  }
  const nodes = planRef.current.name === current?.name ? planRef.current.nodes : []
  const runs = runsFor.workflow === current?.name ? runsFor.runs : NO_RUNS
  const runsReady = runsFor.workflow === current?.name
  // What the canvas draws, read when it draws, so new data reaches the same
  // canvas instead of a re-mounted one (finding 13).
  const viewRef = useRef(null)
  viewRef.current = { definition: { nodes }, runs: mode === 'live' ? runs : NO_RUNS }
  const selectedNodeRef = useRef(null)
  const canvasHandle = useRef(null)
  // The saved plan's steps in the canvas's own vocabulary, so toolbar actions
  // persist through the exact mapping the canvas edits use.
  const canvasNodesOf = (list) => list.map((n) => ({
    node_id: n.node_id ?? n.id,
    title: n.title ?? n.name ?? n.id,
    depends_on: n.depends_on ?? [],
    human_gate: Boolean(n.human_gate),
    task_ref: n.task_ref ?? null,
    kind: n.kind ?? (n.human_gate ? 'gate' : 'task'),
    phase_team: n.phase_team ?? null,
    canvas_position: n.canvas_position ?? undefined,
    // Read-only here (never written back from these fields): the canvas needs
    // them to refuse a delete that would break a condition or a loop.
    when: n.when ?? null,
    loop: n.loop ?? null,
  }))
  const currentCanvasNodes = () => canvasNodesOf(planRef.current.nodes)
  // Every save path (canvas edits and the toolbar) goes through here. The
  // canvas only manages the fields below; everything else on a stored step
  // (its loop, its condition, its instructions, anything added later) is
  // carried over from the saved plan. Rebuilding steps from a fixed field
  // list wiped them on every edit (06/10/2026, WORKFLOWS-R1.md bug 1).
  // Design round: the review step panel may also send `design_patch` (body,
  // loop); only the fields it names change.
  const mergeEdits = (editedNodes, storedList) => {
    const storedById = new Map(storedList.map((n) => [n.node_id ?? n.id, n]))
    return editedNodes.map(({ node_id, title: nodeTitle, depends_on, human_gate, task_ref, kind, phase_team, canvas_position, design_patch }) => ({
      ...(storedById.get(node_id) ?? {}),
      id: node_id, title: nodeTitle, depends_on, human_gate, task_ref, kind, phase_team, canvas_position,
      ...(design_patch ?? {}),
    }))
  }
  const toDefinitionNodes = (editedNodes) => mergeEdits(editedNodes, planRef.current.nodes)
  // One save path for the canvas and the toolbar. The response is the new
  // version, so the plan is current before the list re-fetch lands. Errors
  // are shown where the edit was made (the step panel, or the line above the
  // toolbar), not as a second toast.
  const savePlan = async (editedNodes) => {
    const workflow = planRef.current.name
    if (!workflow) throw new Error('No workflow is open.')
    const saved = await api(`/projects/${encoded}/workflows/${encodeURIComponent(workflow)}/versions`, { method: 'POST', body: { nodes: toDefinitionNodes(editedNodes) }, suppressErrorToast: true })
    if (planRef.current.name === workflow && Number.isFinite(Number(saved?.version)) && Array.isArray(saved?.definition?.nodes)) {
      planRef.current = { name: workflow, version: Number(saved.version), nodes: saved.definition.nodes }
      viewRef.current = { ...viewRef.current, definition: { nodes: saved.definition.nodes } }
    }
    // An edit made while a run is on screen changes the plan, not the run:
    // show the plan so the change can be seen (finding 14).
    if (viewRef.current.runs.length) setMode('definition')
    canvasHandle.current?.refresh()
    onRefresh?.()
    return saved
  }
  const loadRuns = async (workflow = current?.name) => {
    if (!workflow) return
    try {
      const result = await api(`/projects/${encoded}/workflows/${encodeURIComponent(workflow)}/runs`)
      setRunsFor({ workflow, runs: result.runs ?? NO_RUNS })
    } catch (failure) {
      setRunsFor({ workflow, runs: NO_RUNS })
      setError(String(failure?.message ?? failure))
    }
  }
  // One runs request per opened workflow (opening used to ask twice: once
  // from the library click and once from this effect).
  useEffect(() => { loadRuns() }, [current?.name, workflows?.length])
  // The canvas mounts once per open workflow, after that workflow's runs have
  // loaded (the live view needs them), and is never rebuilt for new data.
  const actionsRef = useRef(null)
  actionsRef.current = { savePlan, loadRuns, planNodes: currentCanvasNodes }
  const canvasReady = Boolean(current) && (mode === 'definition' || runsReady)
  // ---- design round: canvas hooks, size and drafts -------------------------
  // The preview settings of a step live under its workflow's name; a new
  // draft's live under its draft key until it is saved.
  const standinWorkflow = () => {
    const d = draftRef.current
    return d ? (d.base?.name ?? `draft:${d.key}`) : planRef.current.name
  }
  const storedNodeOf = (id) => (draftRef.current ? draftRef.current.nodes : planRef.current.nodes).find((n) => (n.id ?? n.node_id) === id) ?? null
  const hooksFor = (isDraft) => canvasDesignHooks({
    loops: review.loops,
    draft: isDraft,
    members: () => membersRef.current,
    storedNode: storedNodeOf,
    settingsKey: (id) => [project.id, standinWorkflow(), id],
    onEditFrame: (nodeId, rect) => setRepeatAt({ nodeId, rect }),
  })
  // The canvas fills the rest of the first screen, so opening Workflows shows
  // the steps without scrolling (WORKFLOWS-R1.md: at 1440x900 today's canvas
  // starts below the window). Phones keep the stacked layout.
  const fitCanvasHeight = () => {
    const host = canvasRef.current
    if (!host) return
    if (!designOn || globalThis.innerWidth <= 640) { host.style.height = ''; return }
    const top = host.getBoundingClientRect().top + globalThis.scrollY
    const height = Math.max(360, Math.round(globalThis.innerHeight - top - 12))
    host.style.height = `${height}px`
    // The AI builder beside the canvas matches its height (option B).
    host.closest('.dy-wfd-canvas-row')?.style.setProperty('--dy-wfd-canvas-h', `${height}px`)
  }
  useEffect(() => {
    if (!designOn) return undefined
    const onResize = () => fitCanvasHeight()
    globalThis.addEventListener('resize', onResize)
    return () => globalThis.removeEventListener('resize', onResize)
  }, [designOn])
  // Opening a step gives its panel room: the canvas grows to the window and
  // the page scrolls so the toolbar sits at the top. The canvas keeps its zoom
  // and position (the engine only adds room on a resize). At 1440x900 the
  // first-screen canvas left the panel ~330px, hiding the new sections.
  const growForPanel = () => {
    const host = canvasRef.current
    if (!host || !designOn || globalThis.innerWidth <= 640) return
    const stage = host.closest('.dockyard-wf3-stage')
    const toolbar = stage?.querySelector('.dockyard-wf3-toolbar')
    const want = Math.min(820, Math.round(globalThis.innerHeight - (toolbar?.getBoundingClientRect().height ?? 0) - 24))
    if (host.getBoundingClientRect().height >= want - 4) return
    host.style.height = `${want}px`
    host.closest('.dy-wfd-canvas-row')?.style.setProperty('--dy-wfd-canvas-h', `${want}px`)
    stage?.scrollIntoView({ block: 'start' })
  }
  const onSelectStep = (nodeId) => {
    selectedNodeRef.current = nodeId
    if (nodeId && designOn) growForPanel()
  }
  useEffect(() => {
    if (!designOn) return undefined
    let live = true
    api(`/projects/${encoded}/team`).then((result) => { if (live) setMembers((result?.members ?? []).filter((m) => m.state === 'active').map((m) => m.profile_slug)) }).catch(() => undefined)
    api('/workflow-library?scope=global').then((result) => { if (live) setTemplates(result?.workflows ?? []) }).catch(() => { if (live) setTemplates([]) })
    return () => { live = false }
  }, [designOn, encoded, workflows?.length])
  const designKey = designOn ? `${review.design}:${review.loops}` : 'today'
  const draftKey = draft?.key ?? null
  useEffect(() => {
    if (!canvasRef.current || !draftKey) return undefined
    fitCanvasHeight()
    const handle = mountDesktopWorkflowCanvas(canvasRef.current, project.id, draftRef.current?.base?.name ?? 'new-workflow', () => ({ nodes: draftRef.current?.nodes ?? [] }), () => NO_RUNS, {
      // A draft changes in memory only; Save in the toolbar saves it.
      onEdit: (editedNodes) => { updateDraft((d) => (d ? { ...d, nodes: mergeEdits(editedNodes, d.nodes) } : d)); canvasHandle.current?.refresh() },
      editNodes: () => canvasNodesOf(draftRef.current?.nodes ?? []),
      onSelect: (nodeId) => onSelectStep(nodeId),
      design: hooksFor(true),
    })
    canvasHandle.current = handle
    return () => {
      if (canvasHandle.current === handle) canvasHandle.current = null
      selectedNodeRef.current = null
      handle()
    }
  }, [project.id, draftKey, designKey])
  useEffect(() => {
    if (!canvasRef.current || !current || !canvasReady || draftKey) return undefined
    fitCanvasHeight()
    const workflowName = current.name
    const handle = mountDesktopWorkflowCanvas(canvasRef.current, project.id, workflowName, () => viewRef.current.definition, () => viewRef.current.runs, {
      onEdit: (editedNodes) => actionsRef.current.savePlan(editedNodes),
      editNodes: () => actionsRef.current.planNodes(),
      onSelect: (nodeId) => (designOn ? onSelectStep(nodeId) : (selectedNodeRef.current = nodeId)),
      // Gate decisions use the same canonical authority as the dashboard: the
      // reviewed decision fingerprint is submitted with the action, so a stale
      // review can never approve something else. Retry re-queues via the
      // canonical work-item transition — never an optimistic local flip.
      onApprove: async (ref) => {
        const decision = await api(`/initiatives/${encodeURIComponent(ref)}/decision`)
        await api(`/initiatives/${encodeURIComponent(ref)}/approve`, { method: 'POST', body: { expected_fingerprint: decision.fingerprint } })
        await actionsRef.current.loadRuns(workflowName)
      },
      onReject: async (ref) => {
        const decision = await api(`/initiatives/${encodeURIComponent(ref)}/decision`)
        await api(`/initiatives/${encodeURIComponent(ref)}/reject`, { method: 'POST', body: { expected_fingerprint: decision.fingerprint, reason: 'Rejected from workflow gate review' } })
        await actionsRef.current.loadRuns(workflowName)
      },
      onRetry: async (ref) => {
        await api(`/projects/${encoded}/work-items/${encodeURIComponent(ref)}/transition`, { method: 'POST', body: { status: 'backlog' } })
        await actionsRef.current.loadRuns(workflowName)
      },
      fetchTimeline: async (pid, wname, runKey) => api(`/projects/${encodeURIComponent(pid)}/workflows/${encodeURIComponent(wname)}/runs/${encodeURIComponent(runKey)}/timeline`),
      design: designOn ? hooksFor(false) : undefined,
    })
    canvasHandle.current = handle
    return () => {
      if (canvasHandle.current === handle) canvasHandle.current = null
      selectedNodeRef.current = null
      handle()
    }
  }, [project.id, current?.name, canvasReady, draftKey, designKey])
  // New data reaches the mounted canvas without rebuilding it, so the open
  // step panel, the selection and the zoom survive Refresh and saves
  // (finding 13).
  useEffect(() => { canvasHandle.current?.refresh() }, [runs, mode, latestVersion?.version])
  const mutate = async (path, body = {}) => {
    setError(null)
    try { await api(path, { method: 'POST', body }); onRefresh?.(); return true }
    catch (failure) { setError(String(failure?.message ?? failure)); return false }
  }
  // The side form only creates. A name that already exists used to post a
  // one-step version that replaced the whole workflow (06/10/2026,
  // WORKFLOWS-R1.md bug 2); now the form says so and saves nothing.
  const nameTaken = grouped.some((item) => item.name === name.trim())
  const define = () => {
    if (!name.trim() || !title.trim() || nameTaken) return
    mutate(`/projects/${encoded}/workflows`, { name: name.trim(), nodes: [{ id: 'step-1', title: title.trim(), depends_on: [], human_gate: false, team: team || null, phase_team: phaseTeams['step-1'] || null }] })
    setSelected(name.trim()); setTitle('')
  }
  // Toolbar actions persist through the SAME save path the canvas uses. With
  // a draft open (design round), they change the draft in memory instead.
  const persistNodes = async (nextNodes) => {
    if (draftRef.current) {
      updateDraft((d) => ({ ...d, nodes: mergeEdits(nextNodes, d.nodes) }))
      canvasHandle.current?.refresh()
      return true
    }
    if (!current) return false
    setError(null)
    try { await savePlan(nextNodes); return true }
    catch (failure) { setError(String(failure?.message ?? failure)); return false }
  }
  const planNodesNow = () => (draftRef.current ? canvasNodesOf(draftRef.current.nodes) : currentCanvasNodes())
  // A new step follows the selected step, or the last step when none is
  // selected; it used to be added with no link at all (finding 8).
  const addNode = (gate) => {
    const nodesNow = planNodesNow()
    const existingIds = new Set(nodesNow.map((n) => n.node_id))
    let index = nodesNow.length + 1
    while (existingIds.has(gate ? `gate-${index}` : `step-${index}`)) index += 1
    const id = gate ? `gate-${index}` : `step-${index}`
    const after = existingIds.has(selectedNodeRef.current) ? selectedNodeRef.current : nodesNow[nodesNow.length - 1]?.node_id
    persistNodes([...nodesNow, {
      node_id: id, title: gate ? `Gate ${index}` : `Step ${index}`, depends_on: after ? [after] : [],
      human_gate: gate, task_ref: null, kind: gate ? 'gate' : 'task', phase_team: null,
    }])
  }
  // Auto layout clears every saved position so the layout places each step
  // again. It used to save the positions unchanged, so dragged steps stayed
  // where they were (finding 6).
  const autoLayout = async () => {
    if (draftRef.current) { persistNodes(planNodesNow().map((n) => ({ ...n, canvas_position: undefined }))); return }
    if (!current || layoutPendingVersion !== null) return
    setLayoutPendingVersion(current.versions.length)
    if (!await persistNodes(currentCanvasNodes().map((n) => ({ ...n, canvas_position: undefined })))) setLayoutPendingVersion(null)
  }
  const validateGraph = () => {
    const nodesNow = planNodesNow()
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
  // A node needs attention when it is blocked or a human gate is waiting —
  // the two states the run projection actually reports.
  const needsAttention = (node) => node.status === 'blocked' || (node.status === 'pending' && node.human_gate)
  const attentionCount = latest ? (latest.nodes ?? []).filter(needsAttention).length : 0
  const startVersion = async (version) => {
    if (!current || !version) return
    await mutate(`/projects/${encoded}/workflows/${encodeURIComponent(current.name)}/start`, { version: version.version, run_key: runKey || `${current.name}-${Date.now()}` })
    await loadRuns(current.name)
  }
  // ---- design round actions ----------------------------------------------
  const takenNames = grouped.map((item) => item.name)
  const keepChecks = (workflowName, checks) => {
    for (const [id, check] of Object.entries(checks ?? {})) writeStepSettings(project.id, workflowName, id, { ...EMPTY_STEP, check })
  }
  const closeDraft = () => { updateDraft(null); setAiOpen(false); setAiSeed(null); setDraftError(null); setRepeatAt(null) }
  const startNew = () => {
    setValidation(null)
    if (review.design === 'a') { setDialog('new'); return }
    closeDraft()
    updateDraft({ key: `new-${Date.now()}`, name: '', base: null, nodes: [] })
  }
  // Option A: the dialog's Create workflow.
  const createFromDialog = async ({ name: newName, nodes: newNodes, checks }) => {
    await api(`/projects/${encoded}/workflows`, { method: 'POST', body: { name: newName, nodes: newNodes }, quiet: true })
    keepChecks(newName, checks)
    setDialog(null); setSelected(newName); onRefresh?.()
  }
  // Option B: a way in from the start card fills the draft.
  const useStart = ({ name: startName, nodes: startNodes, source, notCarried, format }) => {
    updateDraft((d) => ({ ...d, name: d.name || (startName ? uniqueDraftName(startName) : ''), nodes: startNodes.map((n) => ({ ...n })) }))
    canvasHandle.current?.refresh()
    if (source === 'ai-import') {
      setAiSeed({ reply: [`I drafted ${startNodes.length} steps from ${format}.`, `I could not carry over: ${notCarried.join('; ')}.`, 'Check the steps on the canvas, then ask me for changes.'], did: [`Added ${startNodes.length} steps`] })
      setAiOpen(true)
    }
  }
  const uniqueDraftName = (base) => {
    let candidate = base; let index = 2
    while (takenNames.includes(candidate)) { candidate = `${base}-${index}`; index += 1 }
    return candidate
  }
  // The AI panel's changes. On an open workflow the first change makes a
  // draft of it; nothing is saved until Save version.
  const aiApply = (nextNodes, meta = {}) => {
    if (!draftRef.current) {
      if (!current) return
      updateDraft({ key: `edit-${Date.now()}`, name: current.name, base: { name: current.name, version: latestVersion?.version ?? 0 }, nodes: nextNodes })
    } else {
      updateDraft((d) => ({ ...d, nodes: nextNodes, name: d.name || (meta.name ? uniqueDraftName(meta.name) : '') }))
    }
    keepChecks(standinWorkflow(), meta.checks)
    canvasHandle.current?.refresh()
  }
  const saveDraft = async () => {
    const d = draftRef.current
    if (!d) return
    setDraftError(null)
    if (!d.nodes.length) { setDraftError('Add at least one step first.'); return }
    try {
      if (d.base) {
        await api(`/projects/${encoded}/workflows/${encodeURIComponent(d.base.name)}/versions`, { method: 'POST', body: { nodes: d.nodes }, quiet: true })
        closeDraft(); onRefresh?.()
        return
      }
      const clean = d.name.trim()
      if (!clean) { setDraftError('Give the workflow a name.'); return }
      if (takenNames.includes(clean)) { setDraftError(`"${clean}" already exists. Pick another name.`); return }
      await api(`/projects/${encoded}/workflows`, { method: 'POST', body: { name: clean, nodes: d.nodes }, quiet: true })
      renameStandins(project.id, `draft:${d.key}`, clean)
      closeDraft(); setSelected(clean); onRefresh?.()
    } catch (failure) {
      setDraftError(`Couldn't save: ${failureText(failure)}`)
    }
  }
  // The repeat popover (a frame's settings). Rounds are real; the check is a
  // preview kept in memory.
  const saveRepeat = async (nodeId, loop, check) => {
    const key = [project.id, standinWorkflow(), nodeId]
    if (check) writeStepSettings(...key, { ...readStepSettings(...key), check })
    const edited = planNodesNow().map((n) => (n.node_id === nodeId ? { ...n, design_patch: { loop } } : n))
    if (draftRef.current) { persistNodes(edited); return }
    await savePlan(edited)
  }
  const changeReview = (change) => {
    const next = nextReview(review, change)
    writeWorkflowReview(next)
    closeDraft(); setDialog(null)
    setReview(next)
  }
  const repeatNode = repeatAt ? storedNodeOf(repeatAt.nodeId) : null
  const liveCounts = latest ? (latest.nodes ?? []).reduce((acc, node) => { const key = node.status ?? 'pending'; acc[key] = (acc[key] ?? 0) + 1; return acc }, {}) : null
  // W5 live map: read only from the canonical run projection. A node needs
  // attention when it is blocked or waiting on a human decision — the two
  // states the run projection actually reports; nothing is inferred beyond it.
  return jsxs('section', { className: designOn ? 'dockyard-feature-card dockyard-workflows-v6 dy-wfd-on' : 'dockyard-feature-card dockyard-workflows-v6', 'data-workflows-prototype': project.id, 'data-executable-workflows': project.id, 'data-wf-design': designOn ? review.design : undefined, 'data-wf-loops': designOn ? review.loops : undefined, children: [
    designOn ? null : jsxs('div', { className: 'dockyard-wf-entry', 'data-workflow-library-entry': true, children: [
      jsx(Button, { action: 'open-workflow-library', variant: 'primary', onClick: onOpenLibrary, children: 'Open workflow library' }),
      jsx('span', { children: 'The library holds every workflow: global (available to all projects) and this project\'s dedicated ones.' }),
    ]}),
    designOn ? null : jsxs('header', { className: 'dockyard-section-head', children: [jsxs('div', { children: [jsx('h2', { children: 'Workflows' }), jsx('p', { children: 'Planning is saved as a version; execution is shown only from canonical runs.' })] }), jsx(StatusTag, { tone: latest?.status === 'running' ? 'info' : 'neutral', label: latest ? `Live: ${latest.status}` : `${number(grouped.length)} instances` })] }),
    // Design round: one compact row (the two blocks above took ~150px and
    // pushed the canvas below the window).
    designOn ? jsxs('header', { className: 'dy-wfd-head', 'data-wfd-head': true, children: [
      jsx('h2', { children: 'Workflows' }),
      jsx(StatusTag, { tone: latest?.status === 'running' ? 'info' : 'neutral', label: latest ? `Live: ${latest.status}` : `${number(grouped.length)} ${plural(grouped.length, 'workflow')}` }),
      !latest && current && !draft ? jsx('span', { className: 'dy-wfd-chip', 'data-workflow-no-run': true, children: `${current.name}: no runs yet` }) : null,
      jsx('span', { className: 'dy-wfd-grow' }),
      jsx(Button, { small: true, action: 'open-workflow-library', onClick: onOpenLibrary, children: 'Open library' }),
      jsx(Button, { small: true, variant: 'primary', action: 'wfd-new-workflow', disabled: Boolean(draft), onClick: startNew, children: 'New workflow' }),
    ] }) : null,
    error ? jsx('p', { className: 'dockyard-inline-error', role: 'alert', children: error }) : null,
    jsxs('div', { className: libCollapsed ? 'dockyard-wf3 lib-collapsed' : 'dockyard-wf3', 'data-wf-library-collapsed': libCollapsed ? 'true' : 'false', children: [
      // ---- Zone 1: workflow library + create/define editor ---------------
      jsxs('aside', { className: 'dockyard-wf3-lib', 'data-workflow-library': project.id, 'aria-hidden': libCollapsed ? 'true' : undefined, inert: libCollapsed ? true : undefined, children: [
        jsxs('div', { className: 'dockyard-wf3-lib-head', children: [jsx('strong', { children: 'Library' }), jsx('span', { children: number(grouped.length) })] }),
        designOn && draft && !draft.base ? jsx('div', { className: 'dockyard-wf3-lib-list', children: jsxs('button', { type: 'button', className: 'active', 'data-wfd-draft-item': true, 'aria-current': 'true', children: [jsx('strong', { children: draft.name || 'New workflow' }), jsx('small', { children: 'not saved' })] }) }) : null,
        grouped.length ? jsx('div', { className: 'dockyard-wf3-lib-list', children: grouped.map((item) => jsxs('button', {
          type: 'button',
          className: item.name === current?.name && !(designOn && draft && !draft.base) ? 'active' : '',
          'data-workflow-library-item': item.name,
          'data-action': 'select-workflow',
          // Design round: an unsaved draft is never thrown away by a click.
          disabled: designOn && Boolean(draft),
          title: designOn && draft ? 'Save or discard the open draft first.' : undefined,
          onClick: () => setSelected(item.name),
          children: [
            jsx('strong', { children: item.name }),
            jsx('small', { children: `v${item.versions[item.versions.length - 1].version}${item.archived_at ? ' · archived' : ''}` }),
          ],
        }, item.name)) }) : jsx('p', { className: 'dockyard-meta', children: designOn ? 'No workflows yet. Press New workflow.' : 'No workflow instances yet.' }),
        designOn ? null : jsxs('div', { className: 'dockyard-inline-editor', children: [
          jsxs('label', { children: [jsx('span', { children: 'Template / instance' }), jsx('input', { 'data-workflow-name': true, value: name, onChange: (event) => setName(event.target.value) })] }),
          jsxs('label', { children: [jsx('span', { children: 'Phase title' }), jsx('input', { 'data-workflow-title': true, value: title, onChange: (event) => setTitle(event.target.value) })] }),
          jsxs('label', { children: [jsx('span', { children: 'Default bot team' }), jsx('input', { 'data-workflow-team': true, value: team, placeholder: 'team slug', onChange: (event) => setTeam(event.target.value) })] }),
          jsxs('label', { children: [jsx('span', { children: 'Run key' }), jsx('input', { 'data-workflow-run-key': current?.name ?? name, value: runKey, onChange: (event) => setRunKey(event.target.value), placeholder: 'execution key' })] }),
          nameTaken ? jsx('p', { className: 'dockyard-meta', role: 'status', 'data-workflow-name-taken': name.trim(), children: `"${name.trim()}" already exists. Pick a new name; to change "${name.trim()}", edit it on the canvas.` }) : null,
          jsx(Button, { action: 'define-workflow', variant: 'primary', disabled: !name.trim() || !title.trim() || nameTaken, onClick: define, children: 'Create workflow' }),
        ] }),
      ]}),
      // ---- Zone 2: toolbar + run readout + canvas (the surface) ----------
      // There is no third column: run lifecycle lives in the toolbar, the
      // canonical run state is a one-line readout above the canvas, and step
      // details open in the canvas's own floating panel.
      jsxs('div', { className: 'dockyard-wf3-stage', children: [
        jsxs('div', { className: 'dockyard-wf3-toolbar', role: 'toolbar', 'aria-label': 'Workflow canvas tools', children: designOn && draft ? [
          // Design round: an unsaved draft has its own controls; the run
          // controls come back once it is saved.
          jsx('button', { type: 'button', className: 'dockyard-wf3-libtoggle', 'data-action': 'wf-toggle-library', 'aria-expanded': libCollapsed ? 'false' : 'true', 'aria-label': libCollapsed ? 'Show workflow library' : 'Hide workflow library', title: libCollapsed ? 'Show library' : 'Hide library', onClick: () => setLibCollapsed((v) => !v), children: libCollapsed ? '»' : '«' }, 'lib'),
          draft.base
            ? jsx('span', { className: 'dy-wfd-draft-label', 'data-wfd-draft-label': true, children: `Unsaved changes to ${draft.base.name}` }, 'label')
            : jsxs('label', { className: 'dy-wfd-draft-name', children: [jsx('span', { children: 'Name' }), jsx('input', { value: draft.name, 'data-wfd-draft-name': true, placeholder: 'e.g. fix-a-bug', 'aria-invalid': draftError && !draft.name.trim() ? 'true' : 'false', onChange: (event) => updateDraft((d) => ({ ...d, name: event.target.value })) })] }, 'name'),
          jsx('span', { className: 'dockyard-wf3-sep', 'aria-hidden': true }, 'sep1'),
          jsx(Button, { small: true, action: 'wf-add-step', onClick: () => addNode(false), children: '＋ Step' }, 'step'),
          jsx(Button, { small: true, action: 'wf-add-gate', onClick: () => addNode(true), children: '＋ Gate' }, 'gate'),
          jsx(Button, { small: true, action: 'wf-auto-layout', disabled: !draft.nodes.length, onClick: autoLayout, children: 'Auto layout' }, 'layout'),
          jsx(Button, { small: true, action: 'wf-validate', disabled: !draft.nodes.length, onClick: validateGraph, children: 'Validate' }, 'validate'),
          jsx(Button, { small: true, action: 'wfd-settings', onClick: () => setDialog('settings'), children: 'Settings' }, 'settings'),
          review.design === 'b' ? jsx(Button, { small: true, action: 'wfd-ask-ai', variant: aiOpen ? 'primary' : '', data: { 'aria-pressed': aiOpen }, onClick: () => setAiOpen((v) => !v), children: 'Ask AI' }, 'ai') : null,
          jsx('span', { className: 'dockyard-wf3-sep', 'aria-hidden': true }, 'sep2'),
          jsx(Button, { small: true, variant: 'primary', action: 'wfd-draft-save', onClick: saveDraft, children: draft.base ? 'Save version' : 'Save workflow' }, 'save'),
          jsx(Button, { small: true, action: 'wfd-draft-discard', onClick: closeDraft, children: 'Discard' }, 'discard'),
        ] : [
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
          jsx(Button, { small: true, action: 'inspect-workflow', disabled: !current, onClick: () => loadRuns(current.name), children: 'Refresh' }),
          designOn ? jsx(Button, { small: true, action: 'wfd-settings', disabled: !current, onClick: () => setDialog('settings'), children: 'Settings' }) : null,
          designOn && review.design === 'b' ? jsx(Button, { small: true, action: 'wfd-ask-ai', variant: aiOpen ? 'primary' : '', data: { 'aria-pressed': aiOpen }, disabled: !current, onClick: () => setAiOpen((v) => !v), children: 'Ask AI' }) : null,
        ]}),
        designOn && draftError ? jsx('p', { className: 'dy-wfd-error', role: 'alert', 'data-wfd-draft-error': true, children: draftError }) : null,
        validation ? jsx('p', { className: 'dockyard-wf3-validation', role: 'status', 'data-wf-validate-result': validation.ok ? 'ok' : 'issues', children: validation.text }) : null,
        layoutPendingVersion !== null ? jsx('p', { role: 'status', 'data-wf-layout-saving': true, children: 'Saving layout version before the graph can be edited…' }) : null,
        // Run readout: the latest canonical run only. Nothing here is inferred.
        latest && !(designOn && draft) ? jsxs('div', { className: 'dockyard-wf3-run', 'data-workflow-live-run': latest.run_key, children: [
          jsx(StatusTag, { tone: latest.status === 'completed' ? 'success' : latest.status === 'failed' ? 'danger' : 'info', label: latest.status }),
          jsx('span', { className: 'dockyard-wf3-runkey', children: `${latest.run_key} · v${latest.version}` }),
          liveCounts ? jsx('span', { className: 'dockyard-wf3-counts', children: ['done', 'working', 'blocked', 'pending'].filter((k) => liveCounts[k]).map((k) => `${liveCounts[k]} ${k}`).join(' · ') }) : null,
          jsxs('details', { className: 'dockyard-wf3-steps', children: [
            jsx('summary', { children: attentionCount ? `Steps · ${attentionCount} need attention` : 'Steps' }),
            jsx('ul', { 'data-wf-live-map': latest.run_key, children: (latest.nodes ?? []).map((node) => jsx('li', { 'data-wf-live-node': node.node_id, 'data-wf-needs-attention': needsAttention(node) ? 'true' : undefined, children: `${node.title} — ${node.status ?? 'pending'}${node.assignee ? ` · ${node.assignee}` : ''}${needsAttention(node) ? ' · needs attention' : ''}` }, node.node_id)) }),
          ] }),
        ] }) : designOn ? null : jsx('p', { className: 'dockyard-wf3-run dockyard-meta', 'data-workflow-no-run': true, children: 'No canonical run recorded. Start a run to see truthful state.' }),
        !designOn ? (current ? jsx('div', { ref: canvasRef, className: 'dockyard-workflow-graph', 'data-workflow-canvas': current.name, role: 'img', 'aria-label': 'Workflow planning graph', 'aria-busy': layoutPendingVersion !== null || !canvasReady, style: layoutPendingVersion !== null ? { pointerEvents: 'none' } : undefined }) : jsx('p', { className: 'dockyard-meta', children: 'No workflow selected.' }))
          // Design round: the canvas, the start card over an empty draft, and
          // (option B) the AI builder beside it.
          : (current || draft) ? jsxs('div', { className: aiOpen ? 'dy-wfd-canvas-row with-ai' : 'dy-wfd-canvas-row', children: [
            jsxs('div', { className: 'dy-wfd-canvas-wrap', children: [
              jsx('div', { ref: canvasRef, className: 'dockyard-workflow-graph', 'data-workflow-canvas': draft ? (draft.base?.name ?? 'new') : current.name, 'data-wfd-draft': draft ? (draft.base ? 'edit' : 'new') : undefined, role: 'img', 'aria-label': 'Workflow planning graph', 'aria-busy': !draft && (layoutPendingVersion !== null || !canvasReady), style: !draft && layoutPendingVersion !== null ? { pointerEvents: 'none' } : undefined }),
              draft && !draft.base && !draft.nodes.length ? (aiOpen
                ? jsx('div', { className: 'dy-wfd-start hint', role: 'status', 'data-wfd-canvas-start': 'ai', children: 'Describe the workflow in the AI builder. The steps appear here as it works.' })
                : jsx(CanvasStartCard, { templates, onUse: useStart, onAi: () => setAiOpen(true), onCancel: closeDraft })) : null,
              draft?.base ? jsx('p', { className: 'dy-wfd-draft-banner', role: 'status', 'data-wfd-draft-banner': true, children: 'The AI’s changes are on the canvas but not saved. Save version keeps them; Discard drops them.' }) : null,
            ] }),
            aiOpen ? jsx(AiSidePanel, { members, nodes: draft ? draft.nodes : planRef.current.nodes, workflowTitle: draft?.base?.name ?? current?.name ?? 'this workflow', seed: aiSeed, onApply: aiApply, onClose: () => setAiOpen(false) }, draft && !draft.base ? draft.key : (current?.name ?? 'none')) : null,
          ] }) : jsx('p', { className: 'dockyard-meta', children: 'No workflow selected.' }),
      ]}),
    ]}),
    designOn && dialog === 'new' ? jsx(NewWorkflowDialog, { takenNames, templates, members, onCreate: createFromDialog, onClose: () => setDialog(null) }) : null,
    designOn && dialog === 'settings' ? jsx(WorkflowSettingsDialog, { project: project.id, workflow: standinWorkflow(), title: draft ? (draft.name || 'New workflow') : (current?.name ?? ''), members, onClose: () => setDialog(null) }) : null,
    designOn && repeatNode ? jsx(RepeatPopover, { node: repeatNode, anchor: repeatAt.rect, check: readStepSettings(project.id, standinWorkflow(), repeatAt.nodeId).check, draft: Boolean(draft), onSave: ({ rounds, check }) => saveRepeat(repeatAt.nodeId, { max_iterations: rounds, until: { status: 'done' } }, check), onStop: () => saveRepeat(repeatAt.nodeId, null, null), onClose: () => setRepeatAt(null) }, repeatAt.nodeId) : null,
    review.active ? jsx(WorkflowReviewBar, { review, onChange: changeReview, collapsed: reviewHidden, onCollapse: setReviewHidden }) : null,
  ]})
}
