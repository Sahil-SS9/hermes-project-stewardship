// GENERATED-STRUCTURE: hand-edited Desktop module. Edit this file, then run
// node hermes_dockyard_plugin/desktop/build.mjs to regenerate plugin.js.
import { gridSlot } from '../../planning-canvas-geometry.js'
import { useState } from '../runtime/react.js'
import { useRef } from '../runtime/react.js'
import { useEffect } from '../runtime/react.js'
import { api } from '../runtime/context.js'
import { CANVAS_MIN_POS } from '../../planning-canvas-geometry.js'
import { number } from '../lib/ui.js'
import { layoutConnectors } from '../../planning-canvas-geometry.js'
import { jsx } from '../runtime/react.js'
import { layoutFrames } from '../../planning-canvas-geometry.js'
import { jsxs } from '../runtime/react.js'
import { Button, Icon } from '../lib/ui.js'
export const CANVAS_OBJECT_KINDS = Object.freeze(['evidence', 'claim', 'question', 'decision', 'plan_block', 'note', 'link', 'media'])
export const CANVAS_CONNECTOR_MEANINGS = Object.freeze(['supports', 'contradicts', 'derived_from', 'clarifies', 'depends_on', 'implements', 'raises_question'])
export const CANVAS_KIND_LABELS = Object.freeze({ evidence: 'Evidence', claim: 'Claim', question: 'Question', decision: 'Decision', plan_block: 'Plan block', note: 'Note', link: 'Link', media: 'Media' })
export const CANVAS_STICKER_COLOURS = Object.freeze(['yellow', 'green', 'blue', 'pink', 'purple', 'orange'])
export const CANVAS_STICKER_LABELS = Object.freeze({ yellow: 'Sun', green: 'Mint', blue: 'Sky', pink: 'Rose', purple: 'Violet', orange: 'Amber' })
// D-P1 a11y: each kind carries its own Lucide icon so it is never identified
// by colour alone. Names must exist in the generated lucide-icons.js subset.
export const CANVAS_KIND_ICONS = Object.freeze({
  evidence: 'file-text', claim: 'message-square', question: 'lightbulb',
  decision: 'flag', plan_block: 'list-checks', note: 'sticky-note',
  link: 'link', media: 'image',
})
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
// Signed-v1 de-overlap on drop: push a dropped card out of every card it
// overlaps, deterministically (rightward only, resolved against each hit).
export const canvasDeOverlap = (objects, movedId) => {
  const moved = objects.find((item) => item.id === movedId)
  if (!moved) return objects
  const rect = canvasRect(moved)
  let x = rect.x
  const y = rect.y
  const others = objects.filter((item) => item.id !== movedId).map(canvasRect)
  for (let guard = 0; guard < 64; guard += 1) {
    const hit = others.find((other) => x < other.x + other.width && x + rect.width > other.x && y < other.y + other.height && y + rect.height > other.y)
    if (!hit) break
    x = hit.x + hit.width + 20
  }
  if (x === rect.x) return objects
  return objects.map((item) => item.id === movedId ? { ...item, x } : item)
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
  const [selectedIds, setSelectedIds] = useState([])
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
  // Signed-v1 undo/redo: a bounded scratch history of object/connector
  // snapshots taken before each board edit. Client-side edit aid only; the
  // server revision only moves through Save.
  const [history, setHistory] = useState([])
  const [future, setFuture] = useState([])
  const [marquee, setMarquee] = useState(null)
  const [chatDraft, setChatDraft] = useState('')
  const [chatLog, setChatLog] = useState([])
  const [chatBusy, setChatBusy] = useState(false)
  const [planPanel, setPlanPanel] = useState(null)
  const [planBusy, setPlanBusy] = useState(false)
  const [backlogConfirm, setBacklogConfirm] = useState(null)
  const [boards, setBoards] = useState([])
  const [boardListOpen, setBoardListOpen] = useState(true)
  const [boardBusy, setBoardBusy] = useState(false)
  const [theme, setTheme] = useState(initialCanvas?.theme ?? 'dark')
  const [modelOptions, setModelOptions] = useState(null)
  const [boardScoped, setBoardScoped] = useState(false)
  const stageRef = useRef(null)
  const encoded = encodeURIComponent(project.id)
  const revision = Number(canvas?.revision ?? 0)
  const selected = objects.find((item) => item.id === selectedId) ?? null
  const canvasRoute = boardScoped && canvas?.canvas_id && canvas?.name
    ? `/projects/${encoded}/canvases/${encodeURIComponent(canvas.canvas_id)}`
    : `/projects/${encoded}/canvas`
  useEffect(() => {
    const next = initialCanvas ?? { revision: 0, objects: [], connectors: [] }
    setCanvas(next); setObjects(next.objects ?? []); setConnectors(next.connectors ?? []); setDirty(false)
    setHistory([]); setFuture([]); setSelectedIds([]); setSelectedId(null)
  }, [initialCanvas])
  useEffect(() => {
    let live = true
    api(`/projects/${encoded}/canvases`).then((result) => {
      if (live) setBoards(result.canvases ?? [])
    }).catch(() => {})
    api('/canvas/models').then((result) => { if (live) setModelOptions(result) }).catch(() => {})
    return () => { live = false }
  }, [encoded])
  const selectBoard = async (board) => {
    if (!board?.canvas_id || board.canvas_id === canvas?.canvas_id) return
    setBoardBusy(true)
    try {
      const fresh = await api(`/projects/${encoded}/canvases/${encodeURIComponent(board.canvas_id)}`)
      setCanvas(fresh); setObjects(fresh.objects ?? []); setConnectors(fresh.connectors ?? [])
      setBoardScoped(true)
      setTheme(fresh.theme ?? 'dark'); setDirty(false); setSelectedId(null); setSelectedIds([])
      setNotice({ tone: 'ok', text: `Opened ${fresh.name} at revision ${fresh.revision}.` })
    } catch (failure) { setNotice({ tone: 'danger', text: `Board could not be opened: ${String(failure?.message ?? failure)}` }) }
    setBoardBusy(false)
  }
  const setBoardTheme = async (nextTheme) => {
    setTheme(nextTheme)
    if (!canvas?.canvas_id) return
    try {
      const fresh = await api(`/projects/${encoded}/canvases/${encodeURIComponent(canvas.canvas_id)}`, { method: 'PATCH', body: { theme: nextTheme } })
      setCanvas((current) => ({ ...(current ?? {}), ...fresh, theme: nextTheme }))
    } catch (failure) { setNotice({ tone: 'danger', text: `Theme could not be saved: ${String(failure?.message ?? failure)}` }) }
  }
  const selectedColour = selected?.colour ?? null
  const setSelectedColour = (colour) => {
    if (!selected) return
    const before = snapshot(objects, connectors)
    setObjects((current) => current.map((item) => item.id === selected.id ? { ...item, colour: colour || null } : item))
    setHistory((current) => [...current.slice(-49), before]); setFuture([]); setDirty(true)
  }

  const snapshot = (currentObjects, currentConnectors) => ({ objects: currentObjects.map((row) => ({ ...row })), connectors: currentConnectors.map((row) => ({ ...row })) })
  const undo = () => {
    setHistory((current) => {
      if (!current.length) return current
      const before = current[current.length - 1]
      setFuture((next) => [...next, snapshot(objects, connectors)])
      setObjects(before.objects); setConnectors(before.connectors); setDirty(true)
      return current.slice(0, -1)
    })
  }
  const redo = () => {
    setFuture((current) => {
      if (!current.length) return current
      const after = current[current.length - 1]
      setHistory((next) => [...next, snapshot(objects, connectors)])
      setObjects(after.objects); setConnectors(after.connectors); setDirty(true)
      return current.slice(0, -1)
    })
  }
  const duplicateSelection = () => {
    const ids = selectedIds.length ? selectedIds : (selectedId ? [selectedId] : [])
    if (!ids.length) return
    const before = snapshot(objects, connectors)
    const stamp = Date.now()
    setObjects((current) => {
      const next = [...current]
      ids.forEach((id) => {
        const origin = current.find((row) => row.id === id)
        if (!origin) return
        canvasObjectSeq += 1
        const rect = canvasRect(origin)
        next.push({
          ...origin,
          id: `canvas-obj-${stamp}-${canvasObjectSeq}`,
          content: { ...(origin.content ?? {}) },
          tags: [...(origin.tags ?? [])],
          x: canvasClamp(rect.x + 24, CANVAS_MIN_POS.x, CANVAS_WORLD.width - CANVAS_CARD.width - CANVAS_MIN_POS.x),
          y: canvasClamp(rect.y + 24, CANVAS_MIN_POS.y, CANVAS_WORLD.height - CANVAS_CARD.height - CANVAS_MIN_POS.y),
        })
      })
      return next
    })
    setHistory((current) => [...current.slice(-49), before]); setFuture([])
    setDirty(true)
    setNotice({ tone: 'ok', text: `Duplicated ${ids.length} object(s) — Save canvas to persist the copies.` })
  }
  const persistableObjects = () => objects.map((item) => ({
    id: item.id, kind: item.kind, content: item.content ?? { text: canvasText(item) },
    x: canvasNumber(item.x), y: canvasNumber(item.y),
    width: canvasNumber(item.width) || CANVAS_CARD.width, height: canvasNumber(item.height) || CANVAS_CARD.height,
    tags: Array.isArray(item.tags) ? item.tags : [],
    evidence_ref: item.evidence_ref ?? null, work_ref: item.work_ref ?? null,
    colour: CANVAS_STICKER_COLOURS.includes(item.colour) ? item.colour : null,
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
      const fresh = await api(canvasRoute)
      const discarded = dirty
      setCanvas(fresh); setObjects(fresh.objects ?? []); setConnectors(fresh.connectors ?? [])
      setDirty(false); setSelectedId(null); setHistory([]); setFuture([]); setSelectedIds([])
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
      const saved = await api(canvasRoute, { method: 'PUT', body: { expected_revision: revision, objects: rows, connectors: edges } })
      setCanvas(saved); setObjects(saved.objects ?? []); setConnectors(saved.connectors ?? []); setDirty(false)
      setNotice({ tone: 'ok', text: `Canvas saved — revision ${saved.revision} with ${(saved.objects ?? []).length} object(s) and ${(saved.connectors ?? []).length} connector(s).` })
      onRefresh?.()
    } catch (failure) {
      const message = String(failure?.message ?? failure)
      if (/\b409\b|conflict/i.test(message)) {
        // Stale revision: never overwrite silently. Re-read the canonical
        // canvas, state the conflict, and keep the unsaved edit out of it.
        try {
          const fresh = await api(canvasRoute)
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
    const before = snapshot(objects, connectors)
    const position = canvasPlaced(objects)
    canvasObjectSeq += 1
    const item = {
      id: `canvas-obj-${Date.now()}-${canvasObjectSeq}`, kind: objectKind, content: { text: body },
      x: position.x, y: position.y, width: CANVAS_CARD.width, height: CANVAS_CARD.height,
      tags: [], evidence_ref: null, work_ref: null,
    }
    setObjects((current) => [...current, item])
    setHistory((current) => [...current.slice(-49), before]); setFuture([])
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
    const before = snapshot(objects, connectors)
    setObjects((current) => current.map((item) => item.id === selected.id ? { ...item, kind: drawerKind, content: { ...(item.content ?? {}), text } } : item))
    setHistory((current) => [...current.slice(-49), before]); setFuture([])
    setDirty(true)
    setNotice({ tone: 'ok', text: 'Object updated — Save canvas to persist the change.' })
  }
  const removeSelected = async () => {
    if (!selected) return
    const before = snapshot(objects, connectors)
    const persistable = new Set((canvas?.objects ?? []).map((row) => row.id))
    // A persisted object with no other unsaved work goes through the real
    // DELETE route (revision bumped server-side). Anything else is removed
    // locally and persisted by the next save — never two half-writes.
    if (!persistable.has(selected.id) || dirty) {
      const wasPersisted = persistable.has(selected.id)
      const removedId = selected.id
      setObjects((current) => current.filter((row) => row.id !== removedId))
      setConnectors((current) => current.filter((edge) => edge.source !== removedId && edge.target !== removedId))
      setHistory((current) => [...current.slice(-49), before]); setFuture([])
      setDirty(true); setSelectedId(null)
      setNotice({ tone: 'ok', text: wasPersisted ? 'Removed locally — Save canvas to persist the removal.' : 'Scratch object removed — it was never saved.' })
      return
    }
    setBusy(true)
    try {
      const saved = await api(`${canvasRoute}/objects/${encodeURIComponent(selected.id)}?expected_revision=${revision}`, { method: 'DELETE' })
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
    const before = snapshot(objects, connectors)
    canvasEdgeSeq += 1
    setConnectors((current) => [...current, { id: `canvas-edge-${Date.now()}-${canvasEdgeSeq}`, source, target, meaning }])
    setHistory((current) => [...current.slice(-49), before]); setFuture([])
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
        y: canvasClamp(origin.y + dy / zoom, CANVAS_MIN_POS.y, CANVAS_WORLD.height - CANVAS_CARD.height - CANVAS_MIN_POS.y),
      } : row))
      setDirty(true)
    }
    const finish = () => {
      document.removeEventListener('pointermove', move)
      document.removeEventListener('pointerup', finish)
      // Drag moves the card; a click (no travel) opens the drawer instead, so
      // the drawer can never cover the drop target mid-gesture.
      if (moved) {
        // Signed v1: de-overlap on drop, then state the save intent.
        setObjects((current) => canvasDeOverlap(current, item.id))
        setNotice({ tone: 'ok', text: 'Moved — Save canvas to persist the new position.' })
      }
      else openDrawer(item)
    }
    document.addEventListener('pointermove', move)
    document.addEventListener('pointerup', finish)
  }
  // Drag on empty stage = marquee multi-select (signed v1). A click (no
  // travel) clears the selection as before. Panning keeps its drag gesture in
  // connect mode; in select mode pan happens through zoom/fit controls.
  const beginPan = (event) => {
    if (event.button !== 0) return
    const target = event.target
    if (target?.closest?.('.dy-pc-obj') || target?.closest?.('.dy-pc-drawer') || target?.closest?.('.dy-pc-chat')) return
    const stageBox = stageRef.current?.getBoundingClientRect()
    if (!stageBox) return
    const startX = event.clientX
    const startY = event.clientY
    const originPan = { x: pan.x, y: pan.y }
    let moved = false
    if (mode === 'select') {
      const band = { x: startX - stageBox.x, y: startY - stageBox.y, width: 0, height: 0 }
      const marqueeMove = (moveEvent) => {
        const dx = moveEvent.clientX - startX
        const dy = moveEvent.clientY - startY
        if (!moved && Math.abs(dx) <= 3 && Math.abs(dy) <= 3) return
        moved = true
        band.x = dx < 0 ? startX - stageBox.x + dx : startX - stageBox.x
        band.y = dy < 0 ? startY - stageBox.y + dy : startY - stageBox.y
        band.width = Math.abs(dx)
        band.height = Math.abs(dy)
        setMarquee({ ...band })
      }
      const marqueeFinish = (moveEvent) => {
        document.removeEventListener('pointermove', marqueeMove)
        document.removeEventListener('pointerup', marqueeFinish)
        setMarquee(null)
        if (!moved) { setSelectedId(null); setPendingConnect(null); setSelectedIds([]); return }
        const scale = zoom
        const x1 = (Math.min(startX, moveEvent.clientX) - stageBox.x - pan.x) / scale
        const y1 = (Math.min(startY, moveEvent.clientY) - stageBox.y - pan.y) / scale
        const x2 = (Math.max(startX, moveEvent.clientX) - stageBox.x - pan.x) / scale
        const y2 = (Math.max(startY, moveEvent.clientY) - stageBox.y - pan.y) / scale
        const hits = []
        objects.forEach((row) => {
          const rect = canvasRect(row)
          if (rect.x < x2 && rect.x + rect.width > x1 && rect.y < y2 && rect.y + rect.height > y1) hits.push(row.id)
        })
        setSelectedIds(hits)
        if (hits.length) setNotice({ tone: 'ok', text: `Marquee selected ${hits.length} object(s).` })
      }
      document.addEventListener('pointermove', marqueeMove)
      document.addEventListener('pointerup', marqueeFinish)
      return
    }
    const move = (moveEvent) => {
      const dx = moveEvent.clientX - startX
      const dy = moveEvent.clientY - startY
      if (!moved && Math.abs(dx) <= 3 && Math.abs(dy) <= 3) return
      moved = true
      setPan({ x: originPan.x + dx, y: originPan.y + dy })
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
    const before = snapshot(objects, connectors)
    setObjects((current) => current.map((item, index) => ({ ...item, ...gridSlot(index, 3) })))
    setHistory((current) => [...current.slice(-49), before]); setFuture([])
    setDirty(true)
    setNotice({ tone: 'ok', text: 'Tidied into a grid — Save canvas to persist the new positions.' })
  }
  // Full keyboard support (signed v1): Del removes, Ctrl/Cmd+Z undo,
  // Ctrl/Cmd+Shift+Z or Ctrl+Y redo, Ctrl/Cmd+D duplicate, Escape clears.
  const onStageKeyDown = (event) => {
    const key = event.key
    const meta = event.ctrlKey || event.metaKey
    if (key === 'Escape') { setSelectedId(null); setSelectedIds([]); setPendingConnect(null); return }
    if (meta && key.toLowerCase() === 'z') {
      event.preventDefault()
      if (event.shiftKey) redo(); else undo()
      return
    }
    if (meta && key.toLowerCase() === 'y') { event.preventDefault(); redo(); return }
    if (meta && key.toLowerCase() === 'd') { event.preventDefault(); duplicateSelection(); return }
    if (key === 'Delete' || key === 'Backspace') {
      const ids = selectedIds.length ? selectedIds : (selectedId ? [selectedId] : [])
      if (!ids.length) return
      event.preventDefault()
      const before = snapshot(objects, connectors)
      setObjects((current) => current.filter((row) => !ids.includes(row.id)))
      setConnectors((current) => current.filter((edge) => !ids.includes(edge.source) && !ids.includes(edge.target)))
      setHistory((current) => [...current.slice(-49), before]); setFuture([])
      setDirty(true); setSelectedId(null); setSelectedIds([])
      setNotice({ tone: 'ok', text: `Removed ${ids.length} object(s) locally — Save canvas to persist.` })
    }
  }
  const curate = async (message = null) => {
    setBusy(true); setChatOpen(true); setChatBusy(true)
    try {
      const result = await api(`/projects/${encoded}/canvas/sessions`, { method: 'POST', body: message ? { message } : {} })
      setSession(result)
      const proposals = (result.proposals ?? []).length
      setNotice(result.status === 'active' && result.current_question
        ? { tone: 'ok', text: `Question: ${result.current_question.question}` }
        : { tone: 'ok', text: `${number(proposals)} proposal(s) ready for review — nothing is applied automatically.` })
    } catch (failure) { setNotice({ tone: 'danger', text: `Curation failed: ${String(failure?.message ?? failure)}` }) }
    setBusy(false); setChatBusy(false)
  }
  const reviewCanvas = async () => {
    setBusy(true); setChatOpen(true)
    try {
      const result = await api(`${canvasRoute}/curate`, { method: 'POST', body: {} })
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
  // The docked assistant chat: Enter sends, Shift+Enter newline, Stop
  // interrupts a pending ask. The log is real state, never simulated replies.
  const sendChat = async () => {
    const text = chatDraft.trim()
    if (!text || chatBusy) return
    setChatLog((current) => [...current, { role: 'me', text }])
    setChatDraft('')
    await curate(text)
  }
  const stopChat = () => {
    setChatBusy(false)
    setBusy(false)
    setNotice({ tone: 'ok', text: 'Assistant stopped — nothing runs after Stop.' })
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
  // Plan synthesis (NEW-3): from an APPROVED technical_plan proposal only.
  const synthesizePlan = async (proposal) => {
    setPlanBusy(true)
    try {
      const plan = await api(`/canvas/proposals/${encodeURIComponent(proposal.proposal_id)}/plan`, { method: 'POST', body: { project_id: project.id }, suppressErrorToast: true })
      setPlanPanel(plan)
      setNotice({ tone: 'ok', text: `Plan drafted from the approved proposal — ${number((plan.steps ?? []).length)} step(s), nothing applied to the board.` })
    } catch (failure) {
      setPlanPanel(null)
      setNotice({ tone: 'danger', text: `Plan synthesis failed: ${String(failure?.message ?? failure)}` })
    }
    setPlanBusy(false)
  }
  const savePlanDocument = async () => {
    if (!planPanel?.plan_id) return
    setPlanBusy(true)
    try {
      const saved = await api(`/projects/${encoded}/plans/${encodeURIComponent(planPanel.plan_id)}/document/save`, { method: 'POST', body: {} })
      setPlanPanel((current) => ({ ...(current ?? {}), ...saved }))
      setNotice({ tone: 'ok', text: 'Implementation document saved to the Content tab as Markdown.' })
      onRefresh?.()
    } catch (failure) { setNotice({ tone: 'danger', text: `Document save failed: ${String(failure?.message ?? failure)}` }) }
    setPlanBusy(false)
  }
  const planDocSaved = planPanel?.status === 'documented'
  const createdOrders = new Set((planPanel?.backlog_created ?? []).map((row) => row.order))
  const pendingSteps = (planPanel?.steps ?? []).map((step) => step.order).filter((order) => !createdOrders.has(order))
  const createBacklogItems = async () => {
    if (!planPanel?.plan_id || !backlogConfirm?.length) return
    setPlanBusy(true)
    try {
      const result = await api(`/projects/${encoded}/plans/${encodeURIComponent(planPanel.plan_id)}/backlog`, { method: 'POST', body: { step_orders: backlogConfirm } })
      setPlanPanel((current) => ({ ...(current ?? {}), backlog_created: result.backlog_created ?? [] }))
      setNotice({ tone: 'ok', text: `${number((result.created ?? []).length)} backlog item(s) created: ${(result.created ?? []).map((row) => row.ref).join(', ')}.` })
      setBacklogConfirm(null)
      onRefresh?.()
    } catch (failure) { setNotice({ tone: 'danger', text: `Backlog creation failed: ${String(failure?.message ?? failure)}` }) }
    setPlanBusy(false)
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
    const multiSelected = selectedIds.includes(item.id)
    return jsxs('button', {
      type: 'button',
      className: `dy-pc-obj${selectedId === item.id ? ' selected' : ''}${pendingConnect === item.id ? ' pending' : ''}${multiSelected ? ' marquee-selected' : ''}`,
      'data-canvas-object': item.id,
      'data-canvas-kind': item.kind,
      'data-canvas-colour': item.colour ?? '',
      'data-canvas-x': String(Math.round(rect.x)),
      'data-canvas-y': String(Math.round(rect.y)),
      style: { left: `${rect.x}px`, top: `${rect.y}px`, width: `${rect.width}px`, height: `${rect.height}px` },
      'data-canvas-height': String(Math.round(rect.height)),
      'aria-label': `${label}: ${canvasText(item) || 'untitled'}`,
      onPointerDown: (event) => beginObjectDrag(event, item),
      children: [
        jsx('small', { children: `${label}${tag ? ` · ${tag}` : ''}` }),
        jsx('span', { className: 'dy-pc-obj-kind-icon', 'aria-hidden': true, children: jsx(Icon, { name: CANVAS_KIND_ICONS[item.kind] ?? 'sticky-note' }) }),
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
        : status === 'approved' && proposal.kind === 'technical_plan'
          ? jsx(Button, { small: true, action: 'plan-from-proposal', disabled: planBusy, onClick: () => synthesizePlan(proposal), children: 'Plan from proposal' })
          : jsx('small', { children: 'Decision recorded — this proposal can no longer be decided again.' }),
    ]}, proposal.proposal_id)
  })
  return jsxs('section', {
    className: 'dockyard-feature-card dy-pc-scope',
    'data-planning-canvas': project.id,
    'data-canvas-revision': String(revision),
    'data-canvas-dirty': dirty ? 'true' : 'false',
    'data-canvas-theme': theme,
    children: [
      jsxs('div', { className: `dy-pc-board-bar${boardListOpen ? ' open' : ' collapsed'}`, children: [
        jsxs('div', { className: 'dy-pc-board-title', children: [
          jsx('span', { className: 'dockyard-card-label', children: 'BOARDS' }),
          jsx('strong', { children: canvas?.name ?? 'Planning board' }),
          jsx('span', { className: 'dy-pc-board-count', children: `${boards.length || 1} board${(boards.length || 1) === 1 ? '' : 's'}` }),
        ]}),
        jsx(Button, { small: true, action: 'pc-board-toggle', ariaLabel: boardListOpen ? 'Collapse board list' : 'Expand board list', onClick: () => setBoardListOpen((value) => !value), children: jsx(Icon, { name: boardListOpen ? 'chevrons-left' : 'chevrons-right' }) }),
        jsxs('div', { className: 'dy-pc-theme-toggle', role: 'group', 'aria-label': 'Canvas theme', children: [
          jsx(Button, { small: true, variant: theme === 'light' ? 'primary' : '', action: 'pc-theme-light', ariaLabel: 'Light canvas theme', onClick: () => setBoardTheme('light'), children: jsx(Icon, { name: 'sun' }) }),
          jsx(Button, { small: true, variant: theme === 'dark' ? 'primary' : '', action: 'pc-theme-dark', ariaLabel: 'Dark canvas theme', onClick: () => setBoardTheme('dark'), children: jsx(Icon, { name: 'moon' }) }),
        ]}),
      ]}),
      boardListOpen ? jsxs('nav', { className: 'dy-pc-board-list', 'aria-label': 'Planning boards', children: (boards.length ? boards : [canvas]).filter(Boolean).map((board) =>
        jsx('button', { type: 'button', className: `dy-pc-board-row${board.canvas_id === canvas?.canvas_id ? ' active' : ''}`, disabled: boardBusy, onClick: () => selectBoard(board), children: [
          jsx('span', { className: 'dy-pc-board-dot', 'data-status': board.status ?? 'draft' }),
          jsxs('span', { className: 'dy-pc-board-row-copy', children: [jsx('strong', { children: board.name ?? 'Main board' }), jsx('small', { children: `${board.status ?? 'draft'} · ${number(board.object_count ?? board.objects?.length ?? 0)} objects` })] }),
          board.changed_since_plan ? jsx('span', { className: 'dy-pc-board-warning', title: 'Board changed since plan', children: '!' }) : null,
        ]}, board.canvas_id ?? board.name)) }) : null,
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
          jsx(Button, { small: true, action: 'pc-undo', disabled: !history.length, onClick: undo, children: 'Undo' }),
          jsx(Button, { small: true, action: 'pc-redo', disabled: !future.length, onClick: redo, children: 'Redo' }),
          jsx(Button, { small: true, action: 'pc-duplicate', disabled: !(selectedIds.length || selectedId), onClick: duplicateSelection, children: 'Duplicate' }),
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
          jsx(Button, { small: true, action: 'pc-curate', disabled: busy, onClick: () => curate(), children: 'Curate' }),
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
          tabIndex: 0,
          onPointerDown: beginPan,
          onKeyDown: onStageKeyDown,
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
                marquee ? jsx('div', { className: 'dy-pc-marquee', 'data-pc-marquee': true, style: { left: `${marquee.x}px`, top: `${marquee.y}px`, width: `${marquee.width}px`, height: `${marquee.height}px` } }) : null,
                objects.length === 0 ? jsx('p', { className: 'dy-pc-empty', children: 'No canvas objects yet. Capture a note or evidence above, then drag it into place.' }) : null,
              ],
            }),
            jsx('div', { className: `dy-pc-backdrop${selected ? ' open' : ''}`, 'data-pc-backdrop': true, onClick: () => setSelectedId(null) }),
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
                jsx('div', { 'data-canvas-chat-log': true, children: (chatLog ?? []).map((message, index) => jsx('div', { className: `dy-pc-msg ${message.role}`, children: message.text }, `chat-${index}`)) }),
                questionBlock,
                review ? jsx('p', { className: 'dy-pc-drawer-meta', 'data-canvas-review': true, children: `Review: ${number(review.summary?.evidence_count)} evidence, ${number(review.summary?.claim_count)} claim, ${number(review.summary?.question_count)} question, ${number(review.summary?.plan_block_count)} plan block(s).` }) : null,
                proposalCards.length ? jsx('div', { 'data-canvas-proposals': true, children: proposalCards }) : null,
                session?.answers?.length ? jsx('div', { className: 'dy-pc-msg me', children: `${number(session.answers.length)} clarification answer(s) recorded.` }) : null,
                planPanel ? jsxs('div', { className: 'dy-pc-proposal', 'data-canvas-plan': planPanel.plan_id, children: [
                  jsx('strong', { children: 'Plan ready for review' }),
                  jsx('small', { children: `${number((planPanel.steps ?? []).length)} step(s) · from proposal ${planPanel.proposal_id} · nothing applied to the board.` }),
                  jsx('pre', { className: 'dy-pc-plan-steps', children: (planPanel.steps ?? []).map((step) => `${step.order}. ${step.title}`).join('\n') }),
                  jsxs('div', { className: 'dockyard-form-actions', children: [
                    jsx(Button, { small: true, variant: planDocSaved ? '' : 'primary', action: 'save-plan-document', disabled: planBusy || planDocSaved, onClick: savePlanDocument, children: planDocSaved ? 'Doc saved to Content' : 'Save doc to Content' }),
                    jsx(Button, { small: true, variant: planDocSaved && pendingSteps.length ? 'primary' : '', action: 'backlog-from-plan', disabled: planBusy || !planDocSaved || !pendingSteps.length || Boolean(backlogConfirm?.length), onClick: () => setBacklogConfirm(pendingSteps), children: planDocSaved && !pendingSteps.length ? 'Backlog items created' : 'Create backlog items' }),
                  ]}),
                  backlogConfirm?.length ? jsxs('div', { className: 'dy-pc-proposal', 'data-canvas-backlog-confirm': true, children: [
                    jsx('small', { children: `Create ${number(backlogConfirm.length)} backlog item(s)? One confirm per batch, nothing auto-runs.` }),
                    jsx(Button, { small: true, variant: 'primary', action: 'confirm-backlog-from-plan', disabled: planBusy, onClick: createBacklogItems, children: 'Confirm create' }),
                    jsx(Button, { small: true, action: 'cancel-backlog-from-plan', disabled: planBusy, onClick: () => setBacklogConfirm(null), children: 'Cancel' }),
                  ]}) : null,
                ]}) : null,
              ]}),
              jsxs('div', { className: 'dy-pc-chat-f', children: [
                jsx('span', { className: 'dy-pc-readout', children: 'Approval contract: scratch + suggested only.' }),
                jsx('input', { 'data-canvas-chat-input': true, 'aria-label': 'Message the steward', value: chatDraft, placeholder: 'Ask the steward about this board...', onChange: (event) => setChatDraft(event.target.value), onKeyDown: (event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); sendChat() } } }),
                jsx(Button, { small: true, action: 'pc-chat-send', disabled: chatBusy || !chatDraft.trim(), onClick: sendChat, children: 'Send' }),
                jsx(Button, { small: true, action: 'pc-chat-stop', disabled: !chatBusy, onClick: stopChat, children: 'Stop' }),
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
                jsxs('label', { children: [jsx('span', { children: 'Sticker colour' }), jsx('select', { 'data-canvas-object-colour': true, value: selectedColour ?? '', onChange: (event) => setSelectedColour(event.target.value || null), children: [jsx('option', { value: '', children: 'Default kind colour' }), ...CANVAS_STICKER_COLOURS.map((value) => jsx('option', { value, children: CANVAS_STICKER_LABELS[value] }, value))] })] }),
                jsx('p', { className: 'dy-pc-drawer-meta', children: selected.evidence_ref ? `Evidence reference: ${selected.evidence_ref}` : 'No evidence reference on this object.' }),
                jsxs('div', { className: 'dockyard-form-actions', children: [
                  jsx(Button, { small: true, variant: 'danger', action: 'remove-canvas-object', disabled: busy, onClick: removeSelected, children: 'Remove object' }),
                  jsx(Button, { small: true, variant: 'primary', action: 'apply-canvas-object', disabled: busy || !drawerText.trim(), onClick: applyDrawer, children: 'Apply' }),
                ]}),
              ]}) : jsx('p', { className: 'dy-pc-drawer-meta', children: 'Select an object on the canvas to edit its title, kind or removal.' }),
            ]}),
          ],
        }),
        notice ? jsx('p', { className: 'dy-pc-notice', role: 'status', 'data-pc-tone': notice.tone, 'data-canvas-notice': true, children: notice.text }) : null,
      ]}),
    ],
  })
}