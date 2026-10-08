// GENERATED-STRUCTURE: hand-edited Desktop module. Edit this file, then run
// node hermes_dockyard_plugin/desktop/build.mjs to regenerate plugin.js.
import { useState } from '../runtime/react.js'
import { useRef } from '../runtime/react.js'
import { api } from '../runtime/context.js'
import { useEffect } from '../runtime/react.js'
import { mountDesktopWorkflowCanvas } from '../../workflow-canvas-mount.js'
import { validateConnection } from '../../workflow-canvas-mount.js'
import { toCanvasRun } from '../../workflow-canvas-mount.js'
import { stepWord } from '../../workflow-canvas-mount.js'
import { needsPerson } from '../../workflow-canvas-mount.js'
import { statusToken } from '../../workflow-canvas-mount.js'
import { jsxs } from '../runtime/react.js'
import { jsx } from '../runtime/react.js'
import { StatusTag } from '../lib/ui.js'
import { number } from '../lib/ui.js'
import { Button } from '../lib/ui.js'
import { plural } from '../lib/ui.js'
// The builder (Sahil's pick, 07/10/2026): the New workflow dialog, loops shown
// as a frame, and the AI chat in a sidebar beside the page.
import { canvasDesignHooks } from './workflow-design/step-settings.js'
import { NewWorkflowDialog } from './workflow-design/start-dialog.js'
import { AiSidebar } from './workflow-design/ai-panel.js'
import { createdConversation } from './workflow-design/ai-panel.js'
import { settleConversation } from './workflow-design/ai-panel.js'
import { readAiPinned } from './workflow-design/ai-panel.js'
import { writeAiPinned } from './workflow-design/ai-panel.js'
import { WorkflowSettingsDialog } from './workflow-design/shared.js'
import { RepeatPopover } from './workflow-design/shared.js'
import { readStepSettings } from './workflow-design/standins.js'
import { writeStepSettings } from './workflow-design/standins.js'
import { EMPTY_STEP } from './workflow-design/standins.js'
const NO_RUNS = []
const NO_THREAD = []
const failureText = (failure) => String(failure?.message ?? failure ?? 'unknown error').replace(/^\d{3}:\s*/, '')
// A run's status in plain words (the engine says pending, escalated or
// complete; the readout used to look for "completed" and "failed").
const RUN_WORDS = { pending: ['Running', 'info'], escalated: ['Needs a person', 'danger'], complete: ['Finished', 'success'] }
const runWord = (status) => RUN_WORDS[status] ?? [String(status ?? 'unknown'), 'neutral']
// Step counts in the canvas's own words.
const COUNT_WORDS = [['done', 'done'], ['working', 'working'], ['blocked', 'blocked'], ['pending', 'pending'], ['skipped', 'not needed']]
// Whether runs move on by themselves: the timer's last pass (08/10/2026).
const timerWords = (timer) => {
  if (!timer) return null
  if (!timer.moving) return 'Runs move on when you press Move on now (the timer is off).'
  const at = new Date(timer.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  const failed = timer.failed?.length ?? 0
  return `Runs move on by themselves (checked ${at})${failed ? ` · ${failed} run${failed === 1 ? '' : 's'} could not move on` : ''}`
}
// openWorkflow: { project, name, conversation?, checks? } from the Workflows
// tab (Open builder, or a project workflow just made there). It opens that
// workflow; a conversation with the AI carries on in the sidebar.
export function ExecutableWorkflowsPanel({ project, workflows, onRefresh, onOpenLibrary, openWorkflow = null, onOpenWorkflowDone }) {
  const canvasRef = useRef(null)
  const opening = openWorkflow?.project === project.id && openWorkflow.name ? openWorkflow : null
  const [selected, setSelected] = useState(opening?.name ?? workflows?.[0]?.name ?? '')
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
  // ---- the builder: dialog, AI sidebar, AI drafts --------------------------
  const [members, setMembers] = useState([])
  const membersRef = useRef([])
  membersRef.current = members
  const [templates, setTemplates] = useState(null)
  // Every global name, archived ones too: a global workflow made here must
  // not reuse one (the library would add a version to it). null = loading.
  const [globalNames, setGlobalNames] = useState(null)
  const [dialog, setDialog] = useState(null)
  // The AI's unsaved changes to the open workflow: { key, base: { name,
  // version }, nodes }. Every change goes through updateDraft so the canvas
  // reads the same value React has.
  const [draft, setDraft] = useState(null)
  const draftRef = useRef(null)
  const updateDraft = (change) => {
    const next = typeof change === 'function' ? change(draftRef.current) : change
    draftRef.current = next
    setDraft(next)
    return next
  }
  // The AI sidebar: open or not, pinned or floating (remembered), and one
  // conversation per workflow, kept here so closing the sidebar keeps it.
  const [aiOpen, setAiOpen] = useState(Boolean(opening?.conversation))
  const [aiPinned, setAiPinned] = useState(() => readAiPinned())
  const [aiThreads, setAiThreads] = useState(() => (opening?.conversation ? { [opening.name]: createdConversation(opening.name, opening.conversation) } : {}))
  const [repeatAt, setRepeatAt] = useState(null)
  const [draftError, setDraftError] = useState(null)
  // The timer's last pass, and what Move on now just did.
  const [timer, setTimer] = useState(null)
  const [moveNote, setMoveNote] = useState(null)
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
  // The step panel may also send `design_patch` (its instructions and loop);
  // only the fields it names change.
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
  const loadTimer = async () => {
    try { setTimer(await api('/workflows/timer', { suppressErrorToast: true })) } catch { setTimer(null) }
  }
  const loadRuns = async (workflow = current?.name) => {
    if (!workflow) return
    loadTimer()
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
  useEffect(() => { setMoveNote(null); loadRuns() }, [current?.name, workflows?.length])
  // The canvas mounts once per open workflow, after that workflow's runs have
  // loaded (the live view needs them), and is never rebuilt for new data.
  const actionsRef = useRef(null)
  actionsRef.current = { savePlan, loadRuns, planNodes: currentCanvasNodes }
  const canvasReady = Boolean(current) && (mode === 'definition' || runsReady)
  // ---- the builder: canvas hooks, size and AI drafts -----------------------
  // The preview settings of a step live under its workflow's name.
  const standinWorkflow = () => draftRef.current?.base.name ?? planRef.current.name
  const storedNodeOf = (id) => (draftRef.current ? draftRef.current.nodes : planRef.current.nodes).find((n) => (n.id ?? n.node_id) === id) ?? null
  const hooksFor = (isDraft) => canvasDesignHooks({
    draft: isDraft,
    members: () => membersRef.current,
    storedNode: storedNodeOf,
    settingsKey: (id) => [project.id, standinWorkflow(), id],
    onEditFrame: (nodeId, rect) => setRepeatAt({ nodeId, rect }),
  })
  // The canvas fills the rest of the first screen, so opening Workflows shows
  // the steps without scrolling (WORKFLOWS-R1.md: at 1440x900 the old canvas
  // started below the window). Phones keep the stacked layout.
  const fitCanvasHeight = () => {
    const host = canvasRef.current
    if (!host) return
    if (window.innerWidth <= 640) { host.style.height = ''; return }
    const top = host.getBoundingClientRect().top + window.scrollY
    host.style.height = `${Math.max(360, Math.round(window.innerHeight - top - 12))}px`
  }
  useEffect(() => {
    const onResize = () => fitCanvasHeight()
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])
  // Opening a step gives its panel room: the canvas grows to the window and
  // the page scrolls so the toolbar sits at the top. The canvas keeps its zoom
  // and position (the engine only adds room on a resize). At 1440x900 the
  // first-screen canvas left the panel ~330px, hiding the new sections.
  const growForPanel = () => {
    const host = canvasRef.current
    if (!host || window.innerWidth <= 640) return
    const stage = host.closest('.dockyard-wf3-stage')
    const toolbar = stage?.querySelector('.dockyard-wf3-toolbar')
    const want = Math.min(820, Math.round(window.innerHeight - (toolbar?.getBoundingClientRect().height ?? 0) - 24))
    if (host.getBoundingClientRect().height >= want - 4) return
    host.style.height = `${want}px`
    stage?.scrollIntoView({ block: 'start' })
  }
  // One click selects a step (a new step follows it); a double-click or
  // Enter opens its panel, which gets room.
  const onSelectStep = (nodeId) => { selectedNodeRef.current = nodeId }
  const onOpenStep = (nodeId) => { if (nodeId) growForPanel() }
  useEffect(() => {
    let live = true
    api(`/projects/${encoded}/team`).then((result) => { if (live) setMembers((result?.members ?? []).filter((m) => m.state === 'active').map((m) => m.profile_slug)) }).catch(() => undefined)
    api('/workflow-library?scope=global&include_archived=true').then((result) => {
      if (!live) return
      const rows = result?.workflows ?? []
      setTemplates(rows.filter((row) => !row.archived_at)); setGlobalNames(rows.map((row) => row.name))
    }).catch(() => { if (live) { setTemplates([]); setGlobalNames(null) } })
    return () => { live = false }
  }, [encoded, workflows?.length])
  const draftKey = draft?.key ?? null
  useEffect(() => {
    if (!canvasRef.current || !draftKey) return undefined
    fitCanvasHeight()
    const handle = mountDesktopWorkflowCanvas(canvasRef.current, project.id, draftRef.current.base.name, () => ({ nodes: draftRef.current?.nodes ?? [] }), () => NO_RUNS, {
      // A draft changes in memory only; Save version in the toolbar saves it.
      onEdit: (editedNodes) => { updateDraft((d) => (d ? { ...d, nodes: mergeEdits(editedNodes, d.nodes) } : d)); canvasHandle.current?.refresh() },
      editNodes: () => canvasNodesOf(draftRef.current?.nodes ?? []),
      onSelect: onSelectStep,
      onOpen: onOpenStep,
      design: hooksFor(true),
    })
    canvasHandle.current = handle
    return () => {
      if (canvasHandle.current === handle) canvasHandle.current = null
      selectedNodeRef.current = null
      handle()
    }
  }, [project.id, draftKey])
  useEffect(() => {
    if (!canvasRef.current || !current || !canvasReady || draftKey) return undefined
    fitCanvasHeight()
    const workflowName = current.name
    const handle = mountDesktopWorkflowCanvas(canvasRef.current, project.id, workflowName, () => viewRef.current.definition, () => viewRef.current.runs, {
      onEdit: (editedNodes) => actionsRef.current.savePlan(editedNodes),
      editNodes: () => actionsRef.current.planNodes(),
      onSelect: onSelectStep,
      onOpen: onOpenStep,
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
      // Retry gives a stuck step back to its bot: Doing unblocks it. To do
      // was refused by the board for a stuck card (08/10/2026, bug 12).
      onRetry: async (ref) => {
        await api(`/projects/${encoded}/work-items/${encodeURIComponent(ref)}/transition`, { method: 'POST', body: { status: 'in_progress' } })
        await actionsRef.current.loadRuns(workflowName)
      },
      fetchTimeline: async (pid, wname, runKey) => api(`/projects/${encodeURIComponent(pid)}/workflows/${encodeURIComponent(wname)}/runs/${encodeURIComponent(runKey)}/timeline`),
      design: hooksFor(false),
    })
    canvasHandle.current = handle
    return () => {
      if (canvasHandle.current === handle) canvasHandle.current = null
      selectedNodeRef.current = null
      handle()
    }
  }, [project.id, current?.name, canvasReady, draftKey])
  // New data reaches the mounted canvas without rebuilding it, so the open
  // step panel, the selection and the zoom survive Refresh and saves
  // (finding 13).
  useEffect(() => { canvasHandle.current?.refresh() }, [runs, mode, latestVersion?.version])
  const mutate = async (path, body = {}) => {
    setError(null)
    try { await api(path, { method: 'POST', body }); onRefresh?.(); return true }
    catch (failure) { setError(String(failure?.message ?? failure)); return false }
  }
  // Toolbar actions persist through the SAME save path the canvas uses. With
  // the AI's changes unsaved, they change that draft in memory instead.
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
  // The latest run in the canvas's vocabulary, so the readout, the counts and
  // the canvas use one set of words. A step needs attention when it waits on
  // a person: stuck, given up, or a sign-off or "Ask me first" step whose
  // turn has come.
  const latestView = latest ? toCanvasRun(latest) : null
  const needsAttention = (node) => needsPerson(node, latestView)
  const attentionCount = latestView ? latestView.nodes.filter(needsAttention).length : 0
  // Move on now: decide what the run can decide and hand over the steps whose
  // turn has come, without waiting for the timer (works while paused too).
  const moveOn = async () => {
    if (!current || !latest) return
    setError(null)
    setMoveNote(null)
    try {
      const moved = await api(`/projects/${encoded}/workflows/${encodeURIComponent(current.name)}/runs/${encodeURIComponent(latest.run_key)}/advance`, { method: 'POST', body: {}, suppressErrorToast: true })
      const changes = moved?.changes ?? []
      setMoveNote(changes.length ? `Moved on: ${changes.join('; ')}.` : 'Nothing to move on: each step is waiting for its turn, its bot or you.')
    } catch (failure) {
      setMoveNote(null)
      setError(failureText(failure))
    }
    await loadRuns(current.name)
  }
  // Each run gets its own key (the old side form's "Run key" box was jargon,
  // WORKFLOWS-R1.md item 12, and went with the form).
  const startVersion = async (version) => {
    if (!current || !version) return
    await mutate(`/projects/${encoded}/workflows/${encodeURIComponent(current.name)}/start`, { version: version.version, run_key: `${current.name}-${Date.now()}` })
    await loadRuns(current.name)
  }
  // ---- the builder's actions ---------------------------------------------
  const takenNames = grouped.map((item) => item.name)
  const keepChecks = (workflowName, checks) => {
    for (const [id, check] of Object.entries(checks ?? {})) writeStepSettings(project.id, workflowName, id, { ...EMPTY_STEP, check })
  }
  const threadOf = (workflowName) => aiThreads[workflowName] ?? NO_THREAD
  const changeThread = (workflowName, change) => setAiThreads((all) => ({ ...all, [workflowName]: change(all[workflowName] ?? NO_THREAD) }))
  // Save version or Discard ends the AI's draft; the sidebar stays open and
  // its conversation says which happened.
  const closeDraft = (how) => {
    const d = draftRef.current
    updateDraft(null); setDraftError(null); setRepeatAt(null)
    if (d && how) changeThread(d.base.name, (thread) => settleConversation(thread, how))
  }
  const startNew = () => { setValidation(null); setDialog('new') }
  // A workflow opened from the Workflows tab: its AI checks (a preview kept
  // in memory) come along once, then the request is done.
  useEffect(() => {
    if (!openWorkflow) return
    if (opening?.checks) keepChecks(opening.name, opening.checks)
    onOpenWorkflowDone?.()
  }, [])
  // The dialog's Create workflow. A workflow described to the AI opens with
  // the sidebar carrying that conversation, so the iterating goes on.
  const createFromDialog = async ({ scope, name: newName, nodes: newNodes, checks, conversation }) => {
    if (scope === 'global') {
      // A global workflow lives in the library, not in this project: the
      // Workflows tab shows it, marked as just made.
      await api('/workflow-library', { method: 'POST', body: { scope: 'global', name: newName, nodes: newNodes }, quiet: true })
      setDialog(null)
      onOpenLibrary?.({ highlight: newName })
      return
    }
    await api(`/projects/${encoded}/workflows`, { method: 'POST', body: { name: newName, nodes: newNodes }, quiet: true })
    keepChecks(newName, checks)
    if (conversation) {
      setAiThreads((all) => ({ ...all, [newName]: createdConversation(newName, conversation) }))
      setAiOpen(true)
    }
    setDialog(null); setSelected(newName); onRefresh?.()
  }
  // The AI's changes. The first one makes a draft of the open workflow;
  // nothing is saved until Save version.
  const aiApply = (nextNodes, meta = {}) => {
    if (!draftRef.current) {
      if (!current) return
      updateDraft({ key: `edit-${Date.now()}`, base: { name: current.name, version: latestVersion?.version ?? 0 }, nodes: nextNodes })
    } else {
      updateDraft((d) => ({ ...d, nodes: nextNodes }))
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
      await api(`/projects/${encoded}/workflows/${encodeURIComponent(d.base.name)}/versions`, { method: 'POST', body: { nodes: d.nodes }, quiet: true })
      closeDraft('saved'); onRefresh?.()
    } catch (failure) {
      setDraftError(`Couldn't save: ${failureText(failure)}`)
    }
  }
  const pinAi = (pinned) => { writeAiPinned(pinned); setAiPinned(pinned) }
  // The repeat popover (a frame's settings). Rounds are real; the check is a
  // preview kept in memory.
  const saveRepeat = async (nodeId, loop, check) => {
    const key = [project.id, standinWorkflow(), nodeId]
    if (check) writeStepSettings(...key, { ...readStepSettings(...key), check })
    const edited = planNodesNow().map((n) => (n.node_id === nodeId ? { ...n, design_patch: { loop } } : n))
    if (draftRef.current) { persistNodes(edited); return }
    await savePlan(edited)
  }
  const repeatNode = repeatAt ? storedNodeOf(repeatAt.nodeId) : null
  const liveCounts = latestView ? latestView.nodes.reduce((acc, node) => { const key = node.state === 'skipped' ? 'skipped' : statusToken(node.status); acc[key] = (acc[key] ?? 0) + 1; return acc }, {}) : null
  // Ask AI opens or closes the AI sidebar; the chat is never inside the canvas.
  const askAi = (key) => jsx(Button, { small: true, action: 'wfd-ask-ai', variant: aiOpen ? 'primary' : '', data: { 'aria-expanded': aiOpen ? 'true' : 'false', 'aria-controls': 'wfd-ai-sidebar' }, disabled: !current, onClick: () => setAiOpen((v) => !v), children: 'Ask AI' }, key)
  // W5 live map: read only from the canonical run projection. A node needs
  // attention when it is blocked or waiting on a human decision — the two
  // states the run projection actually reports; nothing is inferred beyond it.
  return jsxs('section', { className: 'dockyard-feature-card dockyard-workflows-v6 dy-wfd-on', 'data-workflows-prototype': project.id, 'data-executable-workflows': project.id, children: [
    // One compact row (the old two header blocks took ~150px and pushed the
    // canvas below the window).
    jsxs('header', { className: 'dy-wfd-head', 'data-wfd-head': true, children: [
      jsx('h2', { children: 'Workflows' }),
      jsx(StatusTag, { tone: latest ? runWord(latest.status)[1] : 'neutral', label: latest ? `Live: ${runWord(latest.status)[0]}` : `${number(grouped.length)} ${plural(grouped.length, 'workflow')}` }),
      !latest && current && !draft ? jsx('span', { className: 'dy-wfd-chip', 'data-workflow-no-run': true, children: `${current.name}: no runs yet` }) : null,
      jsx('span', { className: 'dy-wfd-grow' }),
      jsx(Button, { small: true, action: 'open-workflow-library', onClick: () => onOpenLibrary?.(), children: 'Open library' }),
      jsx(Button, { small: true, variant: 'primary', action: 'wfd-new-workflow', disabled: Boolean(draft), onClick: startNew, children: 'New workflow' }),
    ] }),
    error ? jsx('p', { className: 'dockyard-inline-error', role: 'alert', children: error }) : null,
    jsxs('div', { className: libCollapsed ? 'dockyard-wf3 lib-collapsed' : 'dockyard-wf3', 'data-wf-library-collapsed': libCollapsed ? 'true' : 'false', children: [
      // ---- Zone 1: the workflow library ------------------------------------
      jsxs('aside', { className: 'dockyard-wf3-lib', 'data-workflow-library': project.id, 'aria-hidden': libCollapsed ? 'true' : undefined, inert: libCollapsed ? true : undefined, children: [
        jsxs('div', { className: 'dockyard-wf3-lib-head', children: [jsx('strong', { children: 'Library' }), jsx('span', { children: number(grouped.length) })] }),
        grouped.length ? jsx('div', { className: 'dockyard-wf3-lib-list', children: grouped.map((item) => jsxs('button', {
          type: 'button',
          className: item.name === current?.name ? 'active' : '',
          'data-workflow-library-item': item.name,
          'data-action': 'select-workflow',
          // The AI's unsaved changes are never thrown away by a click.
          disabled: Boolean(draft),
          title: draft ? 'Save or discard the AI’s changes first.' : undefined,
          onClick: () => setSelected(item.name),
          children: [
            jsx('strong', { children: item.name }),
            jsx('small', { children: `v${item.versions[item.versions.length - 1].version}${item.archived_at ? ' · archived' : ''}` }),
          ],
        }, item.name)) }) : jsx('p', { className: 'dockyard-meta', children: 'No workflows yet. Press New workflow.' }),
      ]}),
      // ---- Zone 2: toolbar + run readout + canvas (the surface) ----------
      // There is no third column: run lifecycle lives in the toolbar, the
      // canonical run state is a one-line readout above the canvas, step
      // details open in the canvas's own floating panel, and the AI chat is
      // a sidebar beside the page.
      jsxs('div', { className: 'dockyard-wf3-stage', children: [
        jsxs('div', { className: 'dockyard-wf3-toolbar', role: 'toolbar', 'aria-label': 'Workflow canvas tools', children: draft ? [
          // The AI's unsaved changes have their own controls; the run
          // controls come back once they are saved or discarded.
          jsx('button', { type: 'button', className: 'dockyard-wf3-libtoggle', 'data-action': 'wf-toggle-library', 'aria-expanded': libCollapsed ? 'false' : 'true', 'aria-label': libCollapsed ? 'Show workflow library' : 'Hide workflow library', title: libCollapsed ? 'Show library' : 'Hide library', onClick: () => setLibCollapsed((v) => !v), children: libCollapsed ? '»' : '«' }, 'lib'),
          jsx('span', { className: 'dy-wfd-draft-label', 'data-wfd-draft-label': true, children: `Unsaved changes to ${draft.base.name}` }, 'label'),
          jsx('span', { className: 'dockyard-wf3-sep', 'aria-hidden': true }, 'sep1'),
          jsx(Button, { small: true, action: 'wf-add-step', onClick: () => addNode(false), children: '＋ Step' }, 'step'),
          jsx(Button, { small: true, action: 'wf-add-gate', onClick: () => addNode(true), children: '＋ Gate' }, 'gate'),
          jsx(Button, { small: true, action: 'wf-auto-layout', disabled: !draft.nodes.length, onClick: autoLayout, children: 'Auto layout' }, 'layout'),
          jsx(Button, { small: true, action: 'wf-validate', disabled: !draft.nodes.length, onClick: validateGraph, children: 'Validate' }, 'validate'),
          jsx(Button, { small: true, action: 'wfd-settings', onClick: () => setDialog('settings'), children: 'Settings' }, 'settings'),
          askAi('ai'),
          jsx('span', { className: 'dockyard-wf3-sep', 'aria-hidden': true }, 'sep2'),
          jsx(Button, { small: true, variant: 'primary', action: 'wfd-draft-save', onClick: saveDraft, children: 'Save version' }, 'save'),
          jsx(Button, { small: true, action: 'wfd-draft-discard', onClick: () => closeDraft('discarded'), children: 'Discard' }, 'discard'),
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
          jsx(Button, { small: true, action: 'wfd-settings', disabled: !current, onClick: () => setDialog('settings'), children: 'Settings' }),
          askAi(),
        ]}),
        draftError ? jsx('p', { className: 'dy-wfd-error', role: 'alert', 'data-wfd-draft-error': true, children: draftError }) : null,
        validation ? jsx('p', { className: 'dockyard-wf3-validation', role: 'status', 'data-wf-validate-result': validation.ok ? 'ok' : 'issues', children: validation.text }) : null,
        layoutPendingVersion !== null ? jsx('p', { role: 'status', 'data-wf-layout-saving': true, children: 'Saving layout version before the graph can be edited…' }) : null,
        // Run readout: the latest canonical run only. Nothing here is inferred.
        latest && !draft ? jsxs('div', { className: 'dockyard-wf3-run', 'data-workflow-live-run': latest.run_key, children: [
          jsx(StatusTag, { tone: runWord(latest.status)[1], label: runWord(latest.status)[0] }),
          jsx('span', { className: 'dockyard-wf3-runkey', children: `${latest.run_key} · v${latest.version}` }),
          liveCounts ? jsx('span', { className: 'dockyard-wf3-counts', children: COUNT_WORDS.filter(([k]) => liveCounts[k]).map(([k, word]) => `${liveCounts[k]} ${word}`).join(' · ') }) : null,
          jsxs('details', { className: 'dockyard-wf3-steps', children: [
            jsx('summary', { children: attentionCount ? `Steps · ${attentionCount} need attention` : 'Steps' }),
            jsx('ul', { 'data-wf-live-map': latest.run_key, children: latestView.nodes.map((node) => jsx('li', { 'data-wf-live-node': node.node_id, 'data-wf-needs-attention': needsAttention(node) ? 'true' : undefined, children: `${node.title} — ${stepWord(node, latestView)}${node.assignee ? ` · ${node.assignee}` : ''}${needsAttention(node) ? ' · needs attention' : ''}` }, node.node_id)) }),
          ] }),
          latest.status !== 'complete' ? jsx(Button, { small: true, action: 'wf-move-on', onClick: moveOn, children: 'Move on now' }) : null,
          timer ? jsx('span', { className: 'dockyard-wf3-timer', 'data-wf-timer': timer.moving ? 'on' : 'off', children: timerWords(timer) }) : null,
          moveNote ? jsx('p', { className: 'dockyard-wf3-movenote', role: 'status', 'data-wf-move-note': true, children: moveNote }) : null,
        ] }) : null,
        // The canvas, with the AI's draft banner over it. Nothing shares its
        // row: the AI chat is a sidebar beside the page, not a column here.
        (current || draft) ? jsxs('div', { className: 'dy-wfd-canvas-wrap', children: [
          jsx('div', { ref: canvasRef, className: 'dockyard-workflow-graph', 'data-workflow-canvas': draft ? draft.base.name : current.name, 'data-wfd-draft': draft ? 'edit' : undefined, role: 'img', 'aria-label': 'Workflow planning graph', 'aria-busy': !draft && (layoutPendingVersion !== null || !canvasReady), style: !draft && layoutPendingVersion !== null ? { pointerEvents: 'none' } : undefined }),
          draft ? jsx('p', { className: 'dy-wfd-draft-banner', role: 'status', 'data-wfd-draft-banner': true, children: 'The AI’s changes are on the canvas but not saved. Save version keeps them; Discard drops them.' }) : null,
        ] }, 'canvas') : jsx('p', { className: 'dockyard-meta', children: 'No workflow selected.' }),
      ]}),
    ]}),
    dialog === 'new' ? jsx(NewWorkflowDialog, { project: { id: project.id, name: project.name || project.id }, taken: { project: takenNames, global: globalNames }, templates, members, onCreate: createFromDialog, onClose: () => setDialog(null) }) : null,
    dialog === 'settings' ? jsx(WorkflowSettingsDialog, { project: project.id, workflow: standinWorkflow(), title: current?.name ?? '', members, onClose: () => setDialog(null) }) : null,
    repeatNode ? jsx(RepeatPopover, { node: repeatNode, anchor: repeatAt.rect, check: readStepSettings(project.id, standinWorkflow(), repeatAt.nodeId).check, draft: Boolean(draft), onSave: ({ rounds, check }) => saveRepeat(repeatAt.nodeId, { max_iterations: rounds, until: { status: 'done' } }, check), onStop: () => saveRepeat(repeatAt.nodeId, null, null), onClose: () => setRepeatAt(null) }, repeatAt.nodeId) : null,
    // The AI chat: a sidebar at the window's edge, outside the canvas.
    aiOpen && current ? jsx(AiSidebar, {
      members,
      nodes: draft ? draft.nodes : planRef.current.nodes,
      workflowTitle: current.name,
      thread: threadOf(current.name),
      onThread: (change) => changeThread(current.name, change),
      pinned: aiPinned,
      onPin: pinAi,
      onApply: aiApply,
      onClose: () => setAiOpen(false),
      unsaved: Boolean(draft),
      saveError: draftError,
      onSave: saveDraft,
      onDiscard: () => closeDraft('discarded'),
    }, current.name) : null,
  ]})
}
