// GENERATED-STRUCTURE: hand-edited Desktop module. Edit this file, then run
// node hermes_dockyard_plugin/desktop/build.mjs to regenerate plugin.js.
import { gridSlot } from '../runtime/planning-canvas-geometry.js'
import { useState } from '../runtime/react.js'
import { useRef } from '../runtime/react.js'
import { useEffect } from '../runtime/react.js'
import { api } from '../runtime/context.js'
import { CANVAS_MIN_POS } from '../runtime/planning-canvas-geometry.js'
import { number } from '../lib/ui.js'
import { layoutConnectors } from '../runtime/planning-canvas-geometry.js'
import { jsx } from '../runtime/react.js'
import { layoutFrames } from '../runtime/planning-canvas-geometry.js'
import { jsxs } from '../runtime/react.js'
import { Button } from '../lib/ui.js'
export const CANVAS_OBJECT_KINDS = Object.freeze(['evidence', 'claim', 'question', 'decision', 'plan_block', 'note', 'link', 'media'])
export const CANVAS_CONNECTOR_MEANINGS = Object.freeze(['supports', 'contradicts', 'derived_from', 'clarifies', 'depends_on', 'implements', 'raises_question'])
export const CANVAS_KIND_LABELS = Object.freeze({ evidence: 'Evidence', claim: 'Claim', question: 'Question', decision: 'Decision', plan_block: 'Plan block', note: 'Note', link: 'Link', media: 'Media' })
export const CANVAS_MEANING_LABELS = Object.freeze({ supports: 'supports', contradicts: 'contradicts', derived_from: 'derived from', clarifies: 'clarifies', depends_on: 'depends on', implements: 'implements', raises_question: 'raises a question' })
export const CANVAS_WORLD = Object.freeze({ width: 2000, height: 1400 })
export const CANVAS_CARD = Object.freeze({ width: 240, height: 140 })
export const CANVAS_ZOOM = Object.freeze({ min: 0.5, max: 1.5, step: 0.1 })
export let canvasObjectSeq = 0
export let canvasEdgeSeq = 0

export const canvasText = (item) => String(item?.content?.text ?? item?.content?.title ?? item?.content?.url ?? '')
export const canvasNumber = (value) => (Number.isFinite(Number(value)) ? Number(value) : 0)
export const canvasClamp = (value, min, max) => Math.min(Math.max(value, min), max)
export const canvasRect = (item) => ({
  x: canvasNumber(item?.x), y: canvasNumber(item?.y),
  width: canvasNumber(item?.width) || CANVAS_CARD.width,
  height: canvasNumber(item?.height) || CANVAS_CARD.height,
})
// Deterministic free-slot placement: the first grid cell that does not overlap
// an existing card. No randomness, so the same canvas always places the same.
export const canvasPlaced = (objects) => {
  const cols = 4
  for (let slot = 0; slot < cols * 12; slot += 1) {
    const { x, y } = gridSlot(slot, cols)
    const overlaps = objects.some((item) => {
      const rect = canvasRect(item)
      return x < rect.x + rect.width && x + CANVAS_CARD.width > rect.x && y < rect.y + rect.height && y + CANVAS_CARD.height > rect.y
    })
    if (!overlaps) return { x, y }
  }
  return { x: 60, y: 60 }
}

export function PlanningCanvasPanel({ project, canvas: initialCanvas, content = [], onRefresh }) {
  const [canvas, setCanvas] = useState(initialCanvas ?? null)
  const [objects, setObjects] = useState(initialCanvas?.objects ?? [])
  const [connectors, setConnectors] = useState(initialCanvas?.connectors ?? [])
  const [dirty, setDirty] = useState(false)
  const [kind, setKind] = useState('note')
  const [draft, setDraft] = useState('')
  const [mode, setMode] = useState('select')
  const [pendingConnect, setPendingConnect] = useState(null)
  const [selectedId, setSelectedId] = useState(null)
  const [drawerText, setDrawerText] = useState('')
  const [drawerKind, setDrawerKind] = useState('note')
  const [linkSource, setLinkSource] = useState('')
  const [linkTarget, setLinkTarget] = useState('')
  const [linkMeaning, setLinkMeaning] = useState('supports')
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [chatOpen, setChatOpen] = useState(false)
  const [session, setSession] = useState(null)
  const [answer, setAnswer] = useState('')
  const [review, setReview] = useState(null)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState(null)
  const stageRef = useRef(null)
  const encoded = encodeURIComponent(project.id)
  const revision = Number(canvas?.revision ?? 0)
  useEffect(() => {
    const next = initialCanvas ?? { revision: 0, objects: [], connectors: [] }
    setCanvas(next); setObjects(next.objects ?? []); setConnectors(next.connectors ?? []); setDirty(false)
  }, [initialCanvas])
  const selected = objects.find((item) => item.id === selectedId) ?? null
  const persistableObjects = () => objects.map((item) => ({
    id: item.id, kind: item.kind, content: item.content ?? { text: canvasText(item) },
    x: canvasNumber(item.x), y: canvasNumber(item.y),
    width: canvasNumber(item.width) || CANVAS_CARD.width, height: canvasNumber(item.height) || CANVAS_CARD.height,
    tags: Array.isArray(item.tags) ? item.tags : [],
    evidence_ref: item.evidence_ref ?? null, work_ref: item.work_ref ?? null,
  }))
  const persistableConnectors = (rows) => {
    const ids = new Set(rows.map((item) => item.id))
    return connectors
      .filter((edge) => ids.has(edge.source) && ids.has(edge.target))
      .map((edge) => ({ id: edge.id, source: edge.source, target: edge.target, meaning: edge.meaning }))
  }
  const reload = async () => {
    setBusy(true)
    try {
      const fresh = await api(`/projects/${encoded}/canvas`)
      const discarded = dirty
      setCanvas(fresh); setObjects(fresh.objects ?? []); setConnectors(fresh.connectors ?? [])
      setDirty(false); setSelectedId(null)
      setNotice(discarded
        ? { tone: 'danger', text: `Canvas reloaded at revision ${fresh.revision} — unsaved edits were discarded, not applied.` }
        : { tone: 'ok', text: `Canvas reloaded at revision ${fresh.revision}.` })
    } catch (failure) { setNotice({ tone: 'danger', text: `Reload failed: ${String(failure?.message ?? failure)}` }) }
    setBusy(false)
  }
  const save = async () => {
    setBusy(true)
    try {
      const rows = persistableObjects()
      const edges = persistableConnectors(rows)
      const saved = await api(`/projects/${encoded}/canvas`, { method: 'PUT', body: { expected_revision: revision, objects: rows, connectors: edges } })
      setCanvas(saved); setObjects(saved.objects ?? []); setConnectors(saved.connectors ?? []); setDirty(false)
      setNotice({ tone: 'ok', text: `Canvas saved — revision ${saved.revision} with ${(saved.objects ?? []).length} object(s) and ${(saved.connectors ?? []).length} connector(s).` })
      onRefresh?.()
    } catch (failure) {
      const message = String(failure?.message ?? failure)
      if (/\b409\b|conflict/i.test(message)) {
        // Stale revision: never overwrite silently. Re-read the canonical
        // canvas, state the conflict, and keep the unsaved edit out of it.
        try {
          const fresh = await api(`/projects/${encoded}/canvas`)
          setCanvas(fresh); setObjects(fresh.objects ?? []); setConnectors(fresh.connectors ?? []); setDirty(false)
          setNotice({ tone: 'danger', text: `Revision conflict — this canvas changed elsewhere and was reloaded at revision ${fresh.revision}. Your unsaved edit was not applied.` })
        } catch (reloadFailure) { setNotice({ tone: 'danger', text: `Canvas save failed: ${message}` }) }
      } else {
        setNotice({ tone: 'danger', text: `Canvas save failed: ${message}` })
      }
    }
    setBusy(false)
  }
  const addObject = (objectKind, text) => {
    const body = String(text ?? '').trim()
    if (!body) return null
    const position = canvasPlaced(objects)
    canvasObjectSeq += 1
    const item = {
      id: `canvas-obj-${Date.now()}-${canvasObjectSeq}`, kind: objectKind, content: { text: body },
      x: position.x, y: position.y, width: CANVAS_CARD.width, height: CANVAS_CARD.height,
      tags: [], evidence_ref: null, work_ref: null,
    }
    setObjects((current) => [...current, item])
    setDirty(true)
    setNotice({ tone: 'ok', text: `${CANVAS_KIND_LABELS[objectKind] ?? objectKind} added as scratch — Save canvas to persist it.` })
    return item
  }
  const addFromDraft = () => {
    if (!addObject(kind, draft)) return
    setDraft('')
  }
  const openDrawer = (item) => {
    setSelectedId(item.id)
    setDrawerText(canvasText(item))
    setDrawerKind(item.kind)
  }
  const applyDrawer = () => {
    if (!selected) return
    const text = drawerText.trim()
    if (!text) return
    setObjects((current) => current.map((item) => item.id === selected.id ? { ...item, kind: drawerKind, content: { ...(item.content ?? {}), text } } : item))
    setDirty(true)
    setNotice({ tone: 'ok', text: 'Object updated — Save canvas to persist the change.' })
  }
  const removeSelected = async () => {
    if (!selected) return
    const persistable = new Set((canvas?.objects ?? []).map((row) => row.id))
    // A persisted object with no other unsaved work goes through the real
    // DELETE route (revision bumped server-side). Anything else is removed
    // locally and persisted by the next save — never two half-writes.
    if (!persistable.has(selected.id) || dirty) {
      const wasPersisted = persistable.has(selected.id)
      const removedId = selected.id
      setObjects((current) => current.filter((row) => row.id !== removedId))
      setConnectors((current) => current.filter((edge) => edge.source !== removedId && edge.target !== removedId))
      setDirty(true); setSelectedId(null)
      setNotice({ tone: 'ok', text: wasPersisted ? 'Removed locally — Save canvas to persist the removal.' : 'Scratch object removed — it was never saved.' })
      return
    }
    setBusy(true)
    try {
      const saved = await api(`/projects/${encoded}/canvas/objects/${encodeURIComponent(selected.id)}?expected_revision=${revision}`, { method: 'DELETE' })
      setCanvas(saved); setObjects(saved.objects ?? []); setConnectors(saved.connectors ?? []); setDirty(false); setSelectedId(null)
      setNotice({ tone: 'ok', text: `Object removed — revision ${saved.revision} with ${(saved.objects ?? []).length} object(s).` })
      onRefresh?.()
    } catch (failure) { setNotice({ tone: 'danger', text: `Remove failed: ${String(failure?.message ?? failure)}` }) }
    setBusy(false)
  }
  const addConnector = (source, target, meaning) => {
    if (!source || !target || source === target) {
      setNotice({ tone: 'danger', text: 'A connector needs two different objects.' })
      return
    }
    if (connectors.some((edge) => edge.source === source && edge.target === target && edge.meaning === meaning)) {
      setNotice({ tone: 'danger', text: `Already linked: these two objects already carry a "${meaning}" connector.` })
      return
    }
    canvasEdgeSeq += 1
    setConnectors((current) => [...current, { id: `canvas-edge-${Date.now()}-${canvasEdgeSeq}`, source, target, meaning }])
    setDirty(true)
    setNotice({ tone: 'ok', text: `Connector added (${CANVAS_MEANING_LABELS[meaning] ?? meaning}) — Save canvas to persist it.` })
  }
  const connectFromEditor = () => addConnector(linkSource, linkTarget, linkMeaning)
  const beginObjectDrag = (event, item) => {
    if (event.button !== 0) return
    event.preventDefault()
    if (mode === 'connect') {
      if (!pendingConnect) { setPendingConnect(item.id); setNotice({ tone: 'ok', text: 'Connect mode: pick the second object to link.' }); return }
      if (pendingConnect === item.id) { setPendingConnect(null); setNotice({ tone: 'ok', text: 'Connect cancelled — the same object was picked twice (no self-connector).' }); return }
      addConnector(pendingConnect, item.id, linkMeaning)
      setPendingConnect(null)
      return
    }
    const startX = event.clientX
    const startY = event.clientY
    const origin = canvasRect(item)
    let moved = false
    const move = (moveEvent) => {
      const dx = moveEvent.clientX - startX
      const dy = moveEvent.clientY - startY
      if (!moved && Math.abs(dx) <= 3 && Math.abs(dy) <= 3) return
      moved = true
      setObjects((current) => current.map((row) => row.id === item.id ? {
        ...row,
        x: canvasClamp(origin.x + dx / zoom, CANVAS_MIN_POS.x, CANVAS_WORLD.width - CANVAS_CARD.width - CANVAS_MIN_POS.x),
        y: canvasClamp(origin.y + dy / zoom, CANVAS_MIN_POS.y, CANVAS_WORLD.height - CANVAS_CARD.height - CANVAS_MIN_POS.x),
      } : row))
      setDirty(true)
    }
    const finish = () => {
      document.removeEventListener('pointermove', move)
      document.removeEventListener('pointerup', finish)
      // Drag moves the card; a click (no travel) opens the drawer instead, so
      // the drawer can never cover the drop target mid-gesture.
      if (moved) setNotice({ tone: 'ok', text: 'Moved — Save canvas to persist the new position.' })
      else openDrawer(item)
    }
    document.addEventListener('pointermove', move)
    document.addEventListener('pointerup', finish)
  }
  const beginPan = (event) => {
    if (event.button !== 0) return
    const target = event.target
    if (target?.closest?.('.dy-pc-obj') || target?.closest?.('.dy-pc-drawer') || target?.closest?.('.dy-pc-chat')) return
    const startX = event.clientX
    const startY = event.clientY
    const origin = { x: pan.x, y: pan.y }
    let moved = false
    const move = (moveEvent) => {
      const dx = moveEvent.clientX - startX
      const dy = moveEvent.clientY - startY
      if (!moved && Math.abs(dx) <= 3 && Math.abs(dy) <= 3) return
      moved = true
      setPan({ x: origin.x + dx, y: origin.y + dy })
    }
    const finish = () => {
      document.removeEventListener('pointermove', move)
      document.removeEventListener('pointerup', finish)
      if (!moved) { setSelectedId(null); setPendingConnect(null) }
    }
    document.addEventListener('pointermove', move)
    document.addEventListener('pointerup', finish)
  }
  const zoomBy = (delta) => setZoom((current) => canvasClamp(Number((current + delta).toFixed(2)), CANVAS_ZOOM.min, CANVAS_ZOOM.max))
  const fit = () => {
    const stage = stageRef.current
    if (!stage || objects.length === 0) { setZoom(1); setPan({ x: 0, y: 0 }); return }
    const box = stage.getBoundingClientRect()
    const rects = objects.map(canvasRect)
    const minX = Math.min(...rects.map((rect) => rect.x))
    const minY = Math.min(...rects.map((rect) => rect.y))
    const maxX = Math.max(...rects.map((rect) => rect.x + rect.width))
    const maxY = Math.max(...rects.map((rect) => rect.y + rect.height))
    const next = Number(canvasClamp(Math.min((box.width - 80) / Math.max(1, maxX - minX), (box.height - 80) / Math.max(1, maxY - minY)), CANVAS_ZOOM.min, CANVAS_ZOOM.max).toFixed(2))
    setZoom(next)
    setPan({ x: 40 - minX * next, y: 40 - minY * next })
  }
  // Tidy is a deterministic grid, not a layout engine: it only rewrites
  // positions and still needs the save that follows any other edit.
  const tidy = () => {
    setObjects((current) => current.map((item, index) => ({ ...item, ...gridSlot(index, 3) })))
    setDirty(true)
    setNotice({ tone: 'ok', text: 'Tidied into a grid — Save canvas to persist the new positions.' })
  }
  const curate = async () => {
    setBusy(true); setChatOpen(true)
    try {
      const result = await api(`/projects/${encoded}/canvas/sessions`, { method: 'POST', body: {} })
      setSession(result)
      const proposals = (result.proposals ?? []).length
      setNotice(result.status === 'active' && result.current_question
        ? { tone: 'ok', text: `Question: ${result.current_question.question}` }
        : { tone: 'ok', text: `${number(proposals)} proposal(s) ready for review — nothing is applied automatically.` })
    } catch (failure) { setNotice({ tone: 'danger', text: `Curation failed: ${String(failure?.message ?? failure)}` }) }
    setBusy(false)
  }
  const reviewCanvas = async () => {
    setBusy(true); setChatOpen(true)
    try {
      const result = await api(`/projects/${encoded}/canvas/curate`, { method: 'POST', body: {} })
      setReview(result)
      const summary = result.summary ?? {}
      const questions = (result.clarifying_questions ?? []).length
      setNotice({ tone: 'ok', text: `Review: ${number(summary.evidence_count)} evidence, ${number(summary.claim_count)} claim, ${number(summary.question_count)} question, ${number(summary.plan_block_count)} plan block — ${questions ? `${number(questions)} question(s) outstanding` : 'no questions outstanding'}.` })
    } catch (failure) { setNotice({ tone: 'danger', text: `Review failed: ${String(failure?.message ?? failure)}` }) }
    setBusy(false)
  }
  const answerQuestion = async (outcome) => {
    if (!session?.session_id) return
    setBusy(true)
    try {
      const result = await api(`/canvas/sessions/${encodeURIComponent(session.session_id)}/answer`, { method: 'POST', body: { outcome, answer } })
      setSession(result); setAnswer('')
      const proposals = (result.proposals ?? []).length
      if (result.status === 'active' && result.current_question) setNotice({ tone: 'ok', text: `Question: ${result.current_question.question}` })
      else if (outcome === 'stop') setNotice({ tone: 'ok', text: `Session stopped — ${number(proposals)} proposal(s) kept as scratch.` })
      else setNotice({ tone: 'ok', text: `${number(proposals)} proposal(s) ready for review — approve or reject each one.` })
    } catch (failure) { setNotice({ tone: 'danger', text: `Answer failed: ${String(failure?.message ?? failure)}` }) }
    setBusy(false)
  }
  const decideProposal = async (proposal, approve) => {
    setBusy(true)
    try {
      const result = await api(`/canvas/proposals/${encodeURIComponent(proposal.proposal_id)}/decision`, { method: 'POST', body: { approve } })
      // Read the decision back from the session rather than trusting the local
      // optimistic flip; the recorded status is the one that counts.
      if (session?.session_id) {
        try {
          const fresh = await api(`/canvas/sessions/${encodeURIComponent(session.session_id)}`)
          setSession(fresh)
        } catch (readFailure) {
          setSession((current) => current ? { ...current, proposals: (current.proposals ?? []).map((row) => row.proposal_id === result.proposal_id ? { ...row, status: result.status } : row) } : current)
        }
      }
      setNotice({ tone: 'ok', text: `Proposal ${result.status} — recorded only; the canvas is unchanged until you save an edit.` })
    } catch (failure) { setNotice({ tone: 'danger', text: `Decision failed: ${String(failure?.message ?? failure)}` }) }
    setBusy(false)
  }
  const renderConnectors = () => {
    const byId = new Map(objects.map((item) => [item.id, item]))
    const laid = layoutConnectors(objects.map((item) => ({ ...item, ...canvasRect(item) })), connectors, (meaning) => CANVAS_MEANING_LABELS[meaning] ?? meaning, CANVAS_WORLD)
    const lines = [
      jsx('defs', { children: jsx('marker', { id: 'dy-pc-arrow', viewBox: '0 0 10 10', refX: 9, refY: 5, markerWidth: 7, markerHeight: 7, orient: 'auto-start-reverse', children: jsx('path', { className: 'dy-pc-arrowhead', d: 'M0,0 L10,5 L0,10 z' }) }) }, 'defs'),
    ]
    laid.forEach((edge) => {
      const box = edge.labelBox
      lines.push(jsx('line', { 'data-canvas-connector': edge.id, 'data-canvas-meaning': edge.meaning, x1: edge.x1, y1: edge.y1, x2: edge.x2, y2: edge.y2, markerEnd: 'url(#dy-pc-arrow)' }, edge.id))
      if (edge.leader) lines.push(jsx('line', { className: 'dy-pc-leader', x1: edge.anchor.x, y1: edge.anchor.y, x2: box.x + box.width / 2, y2: box.y + box.height / 2 }, `${edge.id}:leader`))
      lines.push(jsx('rect', { className: 'dy-pc-edge-chip', 'data-canvas-meaning': edge.meaning, x: box.x, y: box.y, width: box.width, height: box.height, rx: box.height / 2 }, `${edge.id}:chip`))
      lines.push(jsx('text', { className: 'dy-pc-edge-label', 'data-canvas-edge-label': edge.id, x: box.x + box.width / 2, y: box.y + box.height / 2, textAnchor: 'middle', dominantBaseline: 'central', children: edge.label }, `${edge.id}:label`))
    })
    if (pendingConnect) {
      const pending = byId.get(pendingConnect)
      if (pending) {
        const rect = canvasRect(pending)
        lines.push(jsx('circle', { 'data-canvas-pending': pendingConnect, cx: rect.x + rect.width / 2, cy: rect.y + rect.height / 2, r: 7 }, 'pending'))
      }
    }
    return lines
  }
  const renderFrames = () => layoutFrames(objects.map((item) => ({ ...item, ...canvasRect(item) })), CANVAS_WORLD).map((frame) =>
    jsx('div', { className: 'dy-pc-frame', 'data-canvas-frame': frame.tag, style: { left: `${frame.x}px`, top: `${frame.y}px`, width: `${frame.width}px`, height: `${frame.height}px` }, children: frame.tag }, frame.tag))
  const renderObject = (item) => {
    const rect = canvasRect(item)
    const tag = (Array.isArray(item.tags) ? item.tags : [])[0]
    const label = CANVAS_KIND_LABELS[item.kind] ?? item.kind
    return jsxs('button', {
      type: 'button',
      className: `dy-pc-obj${selectedId === item.id ? ' selected' : ''}${pendingConnect === item.id ? ' pending' : ''}`,
      'data-canvas-object': item.id,
      'data-canvas-kind': item.kind,
      'data-canvas-x': String(Math.round(rect.x)),
      'data-canvas-y': String(Math.round(rect.y)),
      style: { left: `${rect.x}px`, top: `${rect.y}px`, width: `${rect.width}px` },
      'aria-label': `${label}: ${canvasText(item) || 'untitled'}`,
      onPointerDown: (event) => beginObjectDrag(event, item),
      children: [
        jsx('small', { children: tag ? `${label} · ${tag}` : label }),
        jsx('strong', { children: canvasText(item) || 'Untitled object' }),
        jsx('span', { className: 'dy-pc-obj-meta', children: `${item.evidence_ref ? `evidence ${item.evidence_ref}` : 'no evidence reference'}${item.work_ref ? ` · work ${item.work_ref}` : ''}` }),
      ],
    }, item.id)
  }
  const pendingProposals = (session?.proposals ?? []).filter((proposal) => (proposal.status ?? 'pending') === 'pending').length
  const assistantSummary = session?.current_question
    ? 'Before I can propose anything I need one clarification. Nothing is applied automatically.'
    : (session?.proposals ?? []).length
      ? `${number((session.proposals ?? []).length)} proposal(s) drafted as scratch — approve or dismiss each one. Nothing is applied to the canvas.`
      : 'No curation session yet. Run Curate to review this canvas; every proposal lands as scratch and needs your decision.'
  const questionBlock = session?.current_question ? jsxs('div', { className: 'dy-pc-proposal', 'data-canvas-question': session.current_question.id ?? 'question', children: [
    jsx('strong', { children: `Question: ${session.current_question.question}` }),
    jsx('textarea', { 'data-canvas-answer': true, rows: 2, value: answer, placeholder: 'Answer, or skip, defer or stop this clarification...', onChange: (event) => setAnswer(event.target.value) }),
    jsxs('div', { className: 'dockyard-form-actions', children: [
      jsx(Button, { small: true, action: 'skip-canvas-question', disabled: busy, onClick: () => answerQuestion('skip'), children: 'Skip' }),
      jsx(Button, { small: true, action: 'defer-canvas-question', disabled: busy, onClick: () => answerQuestion('defer'), children: 'Defer' }),
      jsx(Button, { small: true, action: 'stop-canvas-session', disabled: busy, onClick: () => answerQuestion('stop'), children: 'Stop' }),
      jsx(Button, { small: true, variant: 'primary', action: 'answer-canvas-question', disabled: busy || !answer.trim(), onClick: () => answerQuestion('answer'), children: 'Answer' }),
    ]}),
  ]}) : null
  const proposalCards = (session?.proposals ?? []).map((proposal) => {
    const status = proposal.status ?? 'pending'
    return jsxs('article', { className: 'dy-pc-proposal', 'data-canvas-proposal': proposal.proposal_id, 'data-canvas-proposal-status': status, children: [
      jsx('strong', { children: proposal.title ?? CANVAS_KIND_LABELS[proposal.kind] ?? proposal.kind ?? 'Proposal' }),
      jsx('small', { children: `${proposal.kind ?? 'proposal'} · ${status} · scratch + suggested · ${number((proposal.source_object_ids ?? []).length)} source object(s)` }),
      status === 'pending'
        ? jsxs('div', { className: 'dockyard-form-actions', children: [
            jsx(Button, { small: true, action: 'dismiss-canvas-proposal', disabled: busy, onClick: () => decideProposal(proposal, false), children: 'Dismiss' }),
            jsx(Button, { small: true, variant: 'primary', action: 'approve-canvas-proposal', disabled: busy, onClick: () => decideProposal(proposal, true), children: 'Approve' }),
          ]})
        : jsx('small', { children: 'Decision recorded — this proposal can no longer be decided again.' }),
    ]}, proposal.proposal_id)
  })
  return jsxs('section', {
    className: 'dockyard-feature-card dy-pc-scope',
    'data-planning-canvas': project.id,
    'data-canvas-revision': String(revision),
    'data-canvas-dirty': dirty ? 'true' : 'false',
    children: [
      jsxs('div', { className: 'dockyard-section-head', children: [
        jsxs('div', { children: [
          jsx('span', { className: 'dockyard-card-label', children: 'PLANNING CANVAS' }),
          jsx('h2', { children: 'Evidence to plan' }),
          jsx('p', { children: `One canvas per project: ${number(objects.length)} object(s), ${number(connectors.length)} connector(s), revision ${number(revision)}${dirty ? ' · unsaved edits' : ' · saved'}. Curation only proposes — every proposal lands as scratch and nothing is applied automatically.` }),
          content.length ? jsx('p', { className: 'dockyard-meta', children: `${number(content.length)} project content item(s) available to reference.` }) : null,
        ]}),
      ]}),
      jsxs('div', { className: 'dy-pc', children: [
        jsxs('div', { className: 'dy-pc-toolbar', role: 'toolbar', 'aria-label': 'Planning canvas tools', children: [
          jsxs('div', { className: 'dy-pc-seg', role: 'group', 'aria-label': 'Canvas mode', children: [
            jsx(Button, { small: true, variant: mode === 'select' ? 'primary' : '', action: 'pc-mode-select', onClick: () => { setMode('select'); setPendingConnect(null) }, children: 'Select' }),
            jsx(Button, { small: true, variant: mode === 'connect' ? 'primary' : '', action: 'pc-mode-connect', onClick: () => { setMode('connect'); setPendingConnect(null) }, children: 'Connect' }),
          ]}),
          jsx('span', { className: 'dy-pc-sep', 'aria-hidden': true }),
          jsxs('div', { className: 'dy-pc-add', children: [
            jsx('select', { 'data-canvas-kind-picker': true, 'aria-label': 'Object kind', value: kind, onChange: (event) => setKind(event.target.value), children: CANVAS_OBJECT_KINDS.map((value) => jsx('option', { value, children: CANVAS_KIND_LABELS[value] }, value)) }),
            jsx('input', { 'data-canvas-draft': true, 'aria-label': 'New object text', value: draft, placeholder: 'Capture a note, observation, question or link...', onChange: (event) => setDraft(event.target.value) }),
            jsx(Button, { small: true, variant: 'primary', action: 'add-canvas-object', disabled: !draft.trim(), onClick: addFromDraft, children: 'Add object' }),
          ]}),
          jsx('span', { className: 'dy-pc-sep', 'aria-hidden': true }),
          ...CANVAS_OBJECT_KINDS.map((value) => jsx(Button, {
            small: true,
            action: `add-canvas-${value}`,
            data: { 'data-canvas-add-kind': value },
            onClick: () => addObject(value, `New ${CANVAS_KIND_LABELS[value]}`),
            children: `＋ ${CANVAS_KIND_LABELS[value]}`,
          }, `add-${value}`)),
          jsx('span', { className: 'dy-pc-spacer' }),
          jsx(Button, { small: true, action: 'pc-tidy', disabled: !objects.length, onClick: tidy, children: 'Tidy' }),
          jsx(Button, { small: true, action: 'pc-review', disabled: busy, onClick: reviewCanvas, children: 'Review' }),
          jsx('span', { className: 'dy-pc-sep', 'aria-hidden': true }),
          jsxs('div', { className: 'dy-pc-seg', role: 'group', 'aria-label': 'Zoom', children: [
            jsx(Button, { small: true, action: 'pc-zoom-out', ariaLabel: 'Zoom out', onClick: () => zoomBy(-CANVAS_ZOOM.step), children: '−' }),
            jsx('span', { className: 'dy-pc-readout', 'data-canvas-zoom-readout': String(Math.round(zoom * 100)), children: `${Math.round(zoom * 100)}%` }),
            jsx(Button, { small: true, action: 'pc-zoom-in', ariaLabel: 'Zoom in', onClick: () => zoomBy(CANVAS_ZOOM.step), children: '＋' }),
            jsx(Button, { small: true, action: 'pc-fit', onClick: fit, children: 'Fit' }),
          ]}),
          jsx('span', { className: 'dy-pc-sep', 'aria-hidden': true }),
          jsx(Button, { small: true, action: 'pc-reload', disabled: busy, onClick: reload, children: 'Reload' }),
          jsx(Button, { small: true, action: 'pc-curate', disabled: busy, onClick: curate, children: 'Curate' }),
          jsx(Button, { small: true, variant: 'primary', action: 'pc-save', disabled: busy, onClick: save, children: busy ? 'Working...' : 'Save canvas' }),
        ]}),
        objects.length >= 2 ? jsxs('div', { className: 'dy-pc-linkbar', 'data-canvas-connector-editor': true, children: [
          jsxs('label', { children: [jsx('span', { children: 'From' }), jsx('select', { value: linkSource, onChange: (event) => setLinkSource(event.target.value), children: [jsx('option', { value: '', children: 'Choose source' }, 'none'), ...objects.map((item) => jsx('option', { value: item.id, children: canvasText(item) || item.id }, item.id))] })] }),
          jsxs('label', { children: [jsx('span', { children: 'Relationship' }), jsx('select', { value: linkMeaning, onChange: (event) => setLinkMeaning(event.target.value), children: CANVAS_CONNECTOR_MEANINGS.map((value) => jsx('option', { value, children: value }, value)) })] }),
          jsxs('label', { children: [jsx('span', { children: 'To' }), jsx('select', { value: linkTarget, onChange: (event) => setLinkTarget(event.target.value), children: [jsx('option', { value: '', children: 'Choose target' }, 'none'), ...objects.map((item) => jsx('option', { value: item.id, children: canvasText(item) || item.id }, item.id))] })] }),
          jsx(Button, { small: true, action: 'connect-canvas-objects', disabled: !linkSource || !linkTarget || linkSource === linkTarget, onClick: connectFromEditor, children: 'Connect objects' }),
        ]}) : null,
        jsxs('div', {
          ref: stageRef,
          className: 'dy-pc-stage',
          'data-pc-stage': true,
          'data-pc-mode': mode,
          role: 'group',
          'aria-label': 'Planning canvas stage',
          onPointerDown: beginPan,
          children: [
            jsxs('div', {
              className: 'dy-pc-world',
              'data-pc-world': true,
              'data-canvas-pan': `${Math.round(pan.x)},${Math.round(pan.y)}`,
              'data-canvas-zoom': String(Math.round(zoom * 100)),
              style: { transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` },
              children: [
                jsx('svg', { className: 'dy-pc-svg', viewBox: `0 0 ${CANVAS_WORLD.width} ${CANVAS_WORLD.height}`, width: CANVAS_WORLD.width, height: CANVAS_WORLD.height, 'aria-hidden': true, children: renderConnectors() }),
                ...renderFrames(),
                ...objects.map(renderObject),
                objects.length === 0 ? jsx('p', { className: 'dy-pc-empty', children: 'No canvas objects yet. Capture a note or evidence above, then drag it into place.' }) : null,
              ],
            }),
            jsxs('aside', { className: `dy-pc-chat ${chatOpen ? 'open' : 'closed'}`, 'data-canvas-assistant': true, children: [
              jsxs('button', { type: 'button', className: 'dy-pc-chat-h', 'data-action': 'pc-chat-toggle', onClick: () => setChatOpen((current) => !current), children: [
                jsx('span', { className: 'av', 'aria-hidden': true, children: 'AI' }),
                jsxs('span', { style: { flex: '1 1 auto' }, children: [
                  jsx('strong', { children: 'Steward' }),
                  jsx('span', { className: 'sub', children: session?.current_question ? 'clarification in progress · nothing applied' : `${number(pendingProposals)} proposal(s) waiting · nothing applied` }),
                ]}),
                jsx('span', { className: 'tog', 'aria-hidden': true, children: chatOpen ? '▼' : '▲' }),
              ]}),
              jsxs('div', { className: 'dy-pc-chat-b', children: [
                jsx('div', { className: 'dy-pc-msg bot', children: assistantSummary }),
                questionBlock,
                review ? jsx('p', { className: 'dy-pc-drawer-meta', 'data-canvas-review': true, children: `Review: ${number(review.summary?.evidence_count)} evidence, ${number(review.summary?.claim_count)} claim, ${number(review.summary?.question_count)} question, ${number(review.summary?.plan_block_count)} plan block block(s).` }) : null,
                proposalCards.length ? jsx('div', { 'data-canvas-proposals': true, children: proposalCards }) : null,
                session?.answers?.length ? jsx('div', { className: 'dy-pc-msg me', children: `${number(session.answers.length)} clarification answer(s) recorded.` }) : null,
              ]}),
              jsxs('div', { className: 'dy-pc-chat-f', children: [
                jsx('span', { className: 'dy-pc-readout', children: 'Approval contract: scratch + suggested only.' }),
                jsx(Button, { small: true, action: 'pc-start-curation', disabled: busy, onClick: curate, children: 'Start curation' }),
              ]}),
            ]}),
            jsxs('aside', { className: `dy-pc-drawer${selected ? ' open' : ''}`, 'data-canvas-drawer': selected?.id ?? 'none', children: [
              jsxs('div', { className: 'dy-pc-drawer-h', children: [
                jsxs('div', { children: [
                  jsx('strong', { children: selected ? `${CANVAS_KIND_LABELS[selected.kind] ?? selected.kind} · selected` : 'Selected object' }),
                  jsx('span', { className: 'dy-pc-drawer-meta', children: selected ? `x ${Math.round(canvasNumber(selected.x))} · y ${Math.round(canvasNumber(selected.y))}` : 'Nothing selected' }),
                ]}),
                jsx(Button, { small: true, action: 'pc-close-drawer', ariaLabel: 'Close selection drawer', onClick: () => setSelectedId(null), children: '✕' }),
              ]}),
              selected ? jsxs('div', { className: 'dy-pc-drawer-b', children: [
                jsxs('label', { children: [jsx('span', { children: 'Title' }), jsx('input', { 'data-canvas-object-title': true, value: drawerText, onChange: (event) => setDrawerText(event.target.value) })] }),
                jsxs('label', { children: [jsx('span', { children: 'Kind' }), jsx('select', { 'data-canvas-object-kind': true, value: drawerKind, onChange: (event) => setDrawerKind(event.target.value), children: CANVAS_OBJECT_KINDS.map((value) => jsx('option', { value, children: CANVAS_KIND_LABELS[value] }, value)) })] }),
                jsx('p', { className: 'dy-pc-drawer-meta', children: selected.evidence_ref ? `Evidence reference: ${selected.evidence_ref}` : 'No evidence reference on this object.' }),
                jsxs('div', { className: 'dockyard-form-actions', children: [
                  jsx(Button, { small: true, variant: 'danger', action: 'remove-canvas-object', disabled: busy, onClick: removeSelected, children: 'Remove object' }),
                  jsx(Button, { small: true, variant: 'primary', action: 'apply-canvas-object', disabled: busy || !drawerText.trim(), onClick: applyDrawer, children: 'Apply' }),
                ]}),
              ]}) : jsx('p', { className: 'dy-pc-drawer-meta', children: 'Select an object on the canvas to edit its title, kind or removal.' }),
            ]}),
            jsx('div', { className: `dy-pc-backdrop${selected ? ' open' : ''}`, 'data-pc-backdrop': true, onClick: () => setSelectedId(null) }),
          ],
        }),
        notice ? jsx('p', { className: 'dy-pc-notice', role: 'status', 'data-pc-tone': notice.tone, 'data-canvas-notice': true, children: notice.text }) : null,
      ]}),
    ],
  })
}
