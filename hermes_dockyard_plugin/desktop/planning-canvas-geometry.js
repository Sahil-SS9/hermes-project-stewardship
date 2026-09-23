// Planning canvas geometry — pure functions, no DOM, no React.
//
// Why this module exists (P1-1 / P1-2, HANDOFF-dockyard-hps-ui-2026-09-22):
//  - Connectors used to run centre-to-centre with the label pinned to the
//    midpoint. Reciprocal connectors (A->B and B->A) therefore shared one line
//    and one label slot, so their labels overprinted into gibberish; stacked
//    layouts put labels on top of cards.
//  - Frames were sized from member rects with a fixed pad and could extend
//    past the world origin, so a card near the edge sat against a frame edge
//    that was itself clipped.
// Everything here is deterministic: the same canvas always lays out the same.

export const CANVAS_FRAME_PAD = Object.freeze({ side: 18, top: 30 })
// Grid used by Tidy and free-slot placement. Gaps between cards (100 x 80)
// leave room for a connector label between neighbours.
export const CANVAS_GRID = Object.freeze({ originX: 60, originY: 60, stepX: 340, stepY: 220 })

const LABEL_CHAR_W = 6
const LABEL_PAD_X = 12
const LABEL_H = 18
const PARALLEL_GAP = 14
const CARD_CLEARANCE = 4

const rectOf = (item) => ({
  x: Number(item?.x) || 0,
  y: Number(item?.y) || 0,
  width: Number(item?.width) || 240,
  height: Number(item?.height) || 140,
})
const overlaps = (a, b) => a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height
const inflate = (r, by) => ({ x: r.x - by, y: r.y - by, width: r.width + by * 2, height: r.height + by * 2 })

export const labelSize = (text) => ({ width: String(text).length * LABEL_CHAR_W + LABEL_PAD_X, height: LABEL_H })

/** Border-to-border anchor points between two rects, before parallel offset. */
const anchors = (from, to) => {
  const fcx = from.x + from.width / 2
  const fcy = from.y + from.height / 2
  const tcx = to.x + to.width / 2
  const tcy = to.y + to.height / 2
  const hGap = Math.max(to.x - (from.x + from.width), from.x - (to.x + to.width))
  const vGap = Math.max(to.y - (from.y + from.height), from.y - (to.y + to.height))
  if (hGap >= vGap) {
    const rightward = tcx >= fcx
    return { axis: 'h', x1: rightward ? from.x + from.width : from.x, y1: fcy, x2: rightward ? to.x : to.x + to.width, y2: tcy }
  }
  const downward = tcy >= fcy
  return { axis: 'v', x1: fcx, y1: downward ? from.y + from.height : from.y, x2: tcx, y2: downward ? to.y : to.y + to.height }
}

/**
 * Lay out connectors: endpoints on card borders, parallel/reciprocal
 * connectors fanned apart, and each label placed in the cheapest free slot
 * (near the line's midpoint, never on a card, never on another label).
 * Returns [{ id, meaning, x1, y1, x2, y2, label, labelBox, anchor: {x,y}, leader }].
 */
export const layoutConnectors = (objects, connectors, labelFor = (m) => m, world = { width: 2000, height: 1400 }) => {
  const byId = new Map(objects.map((item) => [item.id, item]))
  const cards = objects.map((item) => inflate(rectOf(item), CARD_CLEARANCE))

  // Group by unordered pair so A->B and B->A fan apart around one axis.
  const pairs = new Map()
  const valid = connectors.filter((edge) => byId.has(edge.source) && byId.has(edge.target) && edge.source !== edge.target)
  valid.forEach((edge) => {
    const key = [edge.source, edge.target].sort().join('\u0000')
    pairs.set(key, [...(pairs.get(key) ?? []), edge])
  })

  const placed = []
  const out = []
  valid.forEach((edge) => {
    const key = [edge.source, edge.target].sort().join('\u0000')
    const siblings = pairs.get(key)
    const index = siblings.indexOf(edge)
    // Offset is applied in world coordinates (not along the edge direction),
    // so sibling index alone fans A->B and B->A to opposite sides.
    const offset = (index - (siblings.length - 1) / 2) * PARALLEL_GAP
    const a = anchors(rectOf(byId.get(edge.source)), rectOf(byId.get(edge.target)))
    const line = a.axis === 'h'
      ? { x1: a.x1, y1: a.y1 + offset, x2: a.x2, y2: a.y2 + offset }
      : { x1: a.x1 + offset, y1: a.y1, x2: a.x2 + offset, y2: a.y2 }

    const text = labelFor(edge.meaning)
    const size = labelSize(text)
    const dx = line.x2 - line.x1
    const dy = line.y2 - line.y1
    const length = Math.hypot(dx, dy) || 1
    const nx = -dy / length
    const ny = dx / length

    const candidates = []
    for (let t = 0.05; t <= 0.951; t += 0.05) {
      for (let p = 0; p <= 160; p += 8) {
        for (const sign of p === 0 ? [1] : [-1, 1]) {
          const ax = line.x1 + dx * t
          const ay = line.y1 + dy * t
          const cx = ax + nx * p * sign
          const cy = ay + ny * p * sign
          candidates.push({ cost: Math.abs(t - 0.5) * length + p * 1.6, ax, ay, box: { x: cx - size.width / 2, y: cy - size.height / 2, width: size.width, height: size.height }, perp: p })
        }
      }
    }
    candidates.sort((l, r) => l.cost - r.cost)
    const free = (box) => box.x >= 0 && box.y >= 0 && box.x + box.width <= world.width && box.y + box.height <= world.height
      && !cards.some((card) => overlaps(box, card))
      && !placed.some((other) => overlaps(box, inflate(other, 2)))
    const pick = candidates.find((c) => free(c.box)) ?? candidates[0]
    placed.push(pick.box)
    out.push({
      id: edge.id, meaning: edge.meaning, ...line, label: text,
      labelBox: pick.box,
      anchor: { x: pick.ax, y: pick.ay },
      // A label pushed away from its line gets a short leader so it is still
      // unmistakably attached to the right connector.
      leader: pick.perp > 14,
    })
  })
  return out
}

/**
 * Frames group objects sharing a tag (2+ members). Each frame contains every
 * member with the full pad (label room on top) and never leaves the world.
 */
export const layoutFrames = (objects, world = { width: 2000, height: 1400 }) => {
  const groups = new Map()
  objects.forEach((item) => {
    ;(Array.isArray(item.tags) ? item.tags : []).forEach((tag) => groups.set(tag, [...(groups.get(tag) ?? []), item]))
  })
  return [...groups.entries()].filter(([, list]) => list.length >= 2).map(([tag, list]) => {
    const rects = list.map(rectOf)
    const left = Math.max(0, Math.min(...rects.map((r) => r.x)) - CANVAS_FRAME_PAD.side)
    const top = Math.max(0, Math.min(...rects.map((r) => r.y)) - CANVAS_FRAME_PAD.top)
    const right = Math.min(world.width, Math.max(...rects.map((r) => r.x + r.width)) + CANVAS_FRAME_PAD.side)
    const bottom = Math.min(world.height, Math.max(...rects.map((r) => r.y + r.height)) + CANVAS_FRAME_PAD.side)
    return { tag, x: left, y: top, width: right - left, height: bottom - top }
  })
}

/** Smallest legal card position: keeps room for a frame's pad + label. */
export const CANVAS_MIN_POS = Object.freeze({ x: CANVAS_FRAME_PAD.side, y: CANVAS_FRAME_PAD.top })

/** Tidy/free-slot grid position for the n-th card. */
export const gridSlot = (index, cols) => ({
  x: CANVAS_GRID.originX + (index % cols) * CANVAS_GRID.stepX,
  y: CANVAS_GRID.originY + Math.floor(index / cols) * CANVAS_GRID.stepY,
})
