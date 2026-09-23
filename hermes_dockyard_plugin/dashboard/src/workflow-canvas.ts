// Read-only workflow node canvas: pure SVG, vanilla TS, zero deps.
// v3 mechanic set ported from the validated preview:
//   - event-driven frame updates (state changes only when events/polls arrive)
//   - LOD tiers via data-lod: map (<0.75) / read / full (>1.4)  [archify]
//   - dependency arrows with heads + dashed links edges        [agenttrail]
//   - hover intent preview (dashed) before click-focus         [archify]
//   - just-touched decay accents on activity                   [agenttrail]
//   - Semantic Passport with expandable live thread + sub-tasks [agenttrail expansion]
// Nodes are editable in-place; edits are persisted by the host through the canonical version API.
// Locked constraint: no innerHTML / eval / storage; createElement + textContent only.

export interface CanvasNode {
  node_id: string;
  title: string;
  depends_on: string[];
  human_gate: boolean;
  task_ref: string | null;
  kind: 'task' | 'gate';
  status: string | null;
  assignee: string | null;
  // `team` is the assignment the canonical run projection resolves (binding
  // override -> node.phase_team); `phase_team` is the node's own stored
  // override. Both are real fields — workflow_service.py returns them on
  // every run node. The canvas groups lanes on them rather than inventing a
  // lane/phase collection the model does not have.
  team?: string | null;
  phase_team?: string | null;
  evidence_refs: string[];
  canvas_position?: { x: number; y: number };
  // Graph-shape modifiers carried by the run projection. A node with an
  // upstream condition is a conditional branch; a loop bound makes it a
  // bounded loop. (workflow_service.py validates `kind` as task|gate only —
  // these are its documented `when`/`loop` node modifiers, not new kinds.)
  when?: { node: string; status: string } | null;
  loop?: { max_iterations: number; until: { status: string } } | null;
}

export interface CanvasRun {
  run_key: string;
  version: number;
  status: string;
  started_at: string | null;
  updated_at: string | null;
  nodes: CanvasNode[];
}

import {
  buildActivityThread,
  buildTaskListMini,
} from './components/live-detail';

export interface ExpansionData {
  children: Array<{ ref: string; title: string; status?: string | null; assignee?: string | null }>;
  history: Array<{ ts?: string | number | null; text: string }>;
}

export interface CanvasPosition { x: number; y: number; depth: number }

export function validateConnection(nodes: CanvasNode[], from: string, to: string): string | null {
  if (!from || !to) return 'Both source and target are required';
  if (from === to) return 'A node cannot depend on itself';
  const ids = new Set(nodes.map((n) => n.node_id));
  if (!ids.has(from) || !ids.has(to)) return 'Unknown node';
  const deps = new Map(nodes.map((n) => [n.node_id, [...n.depends_on]]));
  const seen = new Set<string>();
  const visit = (id: string): boolean => {
    if (id === to) return true;
    if (seen.has(id)) return false;
    seen.add(id);
    return (deps.get(id) ?? []).some(visit);
  };
  return visit(from) ? 'Connection would create a cycle' : null;
}

export interface CanvasHandlers {
  onApprove: (taskRef: string) => Promise<unknown> | void;
  onReject: (taskRef: string) => Promise<unknown> | void;
  // P8.4: supported recovery — re-queue a blocked task through the canonical
  // transition contract (same authority path as the work drawer).
  onRetry?: (taskRef: string) => Promise<unknown> | void;
  // Lazy-expansion hook: app.ts backs this with GET /work-items/{ref}
  // (children -> TaskListMini, history -> ActivityThread). May return null
  // for nodes without a task_ref; the passport degrades to factuals only.
  onExpand?: (taskRef: string) => Promise<ExpansionData | null>;
  // Persist the edited graph as a new workflow version through the host seam.
  onEdit?: (nodes: CanvasNode[]) => Promise<unknown> | void;
}

const NODE_W = 208;
const NODE_H = 72;
const COL_GAP = 116;
const ROW_GAP = 30;
const PAD = 64;
// Horizontal band the nodes of one lane sit in (v6 composition): the lanes are
// the canvas's reading order, so they carry real top/bottom padding rather
// than being a background stripe the nodes ignore.
const LANE_PAD = 30;
const ZOOM_MIN = 0.45;
const ZOOM_MAX = 1.8;
const LOD_FULL = 1.4;
const ZOOM_IN = 1.1;
const ZOOM_OUT = 0.9;

// ---- S1: node purpose / status visual tokens ------------------------------
// PURPOSE (what a node is) and STATUS (where a node is) are two independent
// visual dimensions, and they are kept apart on every node:
//   purpose -> silhouette + fill + symbol + purpose text colour
//   status  -> outline stroke + status mark + status word
// Purpose colours live on a violet/cyan/magenta/blue axis and status colours on
// a green/amber/red/grey axis, so they can never collide (no green-on-green,
// blue-on-blue). Every value is a CSS custom property declared in style.css, so
// the palette has exactly one home; the literals below are only the
// stylesheet-less fallback for the SVG presentation attributes.
export type CanvasNodePurpose = 'task' | 'gate' | 'branch' | 'loop';

export const STATUS_ORDER = ['done', 'working', 'blocked', 'pending'] as const;
export type CanvasNodeStatusToken = (typeof STATUS_ORDER)[number];

// Canonical statuses are the only ones the canvas colours; anything else is
// shown as pending (the raw word is still what the node prints).
export function statusToken(status: string | null | undefined): CanvasNodeStatusToken {
  return status === 'done' || status === 'working' || status === 'blocked' ? status : 'pending';
}

// Status is the second visual dimension: it is carried by the node OUTLINE, a
// tinted status chip and the status word — never by the node fill, which is
// purpose. Same custom-property discipline as purpose.
export const STATUS_TOKENS: Record<CanvasNodeStatusToken, string> = {
  done: '--dy-wf-status-done',
  working: '--dy-wf-status-working',
  blocked: '--dy-wf-status-blocked',
  pending: '--dy-wf-status-pending',
};

export interface PurposeVisuals {
  fill: string;
  line: string;
  text: string;
  glyph: string;
  label: string;
  glyphX: number;
  textX: number;
}

export const PURPOSE_VISUALS: Record<CanvasNodePurpose, PurposeVisuals> = {
  task: {
    fill: '--dy-wf-purpose-task-fill', line: '--dy-wf-purpose-task-line',
    text: '--dy-wf-purpose-task-text', glyph: '□', label: 'Task',
    glyphX: 20, textX: 36,
  },
  gate: {
    fill: '--dy-wf-purpose-gate-fill', line: '--dy-wf-purpose-gate-line',
    text: '--dy-wf-purpose-gate-text', glyph: '◆', label: 'Human gate',
    glyphX: 24, textX: 42,
  },
  branch: {
    fill: '--dy-wf-purpose-branch-fill', line: '--dy-wf-purpose-branch-line',
    text: '--dy-wf-purpose-branch-text', glyph: '⋔', label: 'Conditional branch',
    glyphX: 22, textX: 40,
  },
  loop: {
    fill: '--dy-wf-purpose-loop-fill', line: '--dy-wf-purpose-loop-line',
    text: '--dy-wf-purpose-loop-text', glyph: '↻', label: 'Bounded loop',
    glyphX: 20, textX: 36,
  },
};

// A node's purpose is read from the canonical graph shape it takes part in:
// a human gate is a decision; a node carrying a `when` condition is a
// conditional branch; a node carrying a `loop` bound is a bounded loop;
// everything else is an ordinary unit of work.
export function nodePurpose(n: CanvasNode): CanvasNodePurpose {
  if (n.human_gate || n.kind === 'gate') return 'gate';
  if (n.loop) return 'loop';
  if (n.when) return 'branch';
  return 'task';
}

// Purpose is shape-led. Silhouettes are drawn inside the fixed node box so the
// layout grid, ports and edges keep their geometry: an ordinary task is a
// rounded rect (null -> the caller emits a <rect>), a human gate is a hexagon
// with pointed sides, a conditional branch is a cut-corner octagon and a
// bounded loop is a rounded rect with a return notch on its upstream edge.
// No node carries a coloured side stripe.
export function nodeShapePath(
  purpose: CanvasNodePurpose,
  w: number = NODE_W,
  h: number = NODE_H,
): string | null {
  switch (purpose) {
    case 'gate': {
      const i = Math.round(h * 0.22); // 14 at h=64
      return `M ${i} 0 H ${w - i} L ${w} ${h / 2} L ${w - i} ${h} H ${i} L 0 ${h / 2} Z`;
    }
    case 'branch': {
      const i = Math.round(h * 0.19); // 12 at h=64
      return `M ${i} 0 H ${w - i} L ${w} ${i} V ${h - i} L ${w - i} ${h} H ${i} L 0 ${h - i} V ${i} Z`;
    }
    case 'loop': {
      const r = 9;
      const notch = 13;
      return `M ${r} 0 H ${w - r} A ${r} ${r} 0 0 1 ${w} ${r} V ${h - r}`
        + ` A ${r} ${r} 0 0 1 ${w - r} ${h} H ${r} A ${r} ${r} 0 0 1 0 ${h - r}`
        + ` V ${h / 2 + 10} L ${notch} ${h / 2} L 0 ${h / 2 - 10} V ${r}`
        + ` A ${r} ${r} 0 0 1 ${r} 0 Z`;
    }
    default:
      return null; // 'task' -> rounded rect
  }
}

// ---- S2: edge meaning token system ---------------------------------------
// Every connector carries one MEANING. The workflow canvas draws `depends_on`
// (a plain workflow dependency); the planning-canvas meanings are defined here
// as colour/marker tokens only, so the later canvas slice renders from this
// vocabulary instead of inventing a second one. Only the meanings this canvas
// actually draws get marker elements — markers for unrendered meanings would be
// dead DOM.
export interface EdgeMeaning {
  meaning: string;
  color: string;
  activeColor: string;
  marker: string;
  activeMarker: string;
  label: string;
  rendered: boolean;
}

export const EDGE_MEANINGS: Record<string, EdgeMeaning> = {
  depends_on: {
    meaning: 'depends_on', color: '--dy-edge-dep', activeColor: '--dy-edge-dep-active',
    marker: 'dyArrowDep', activeMarker: 'dyArrowDepActive',
    label: 'depends on', rendered: true,
  },
  supports: {
    meaning: 'supports', color: '--dy-edge-plan-supports', activeColor: '--dy-edge-plan-supports-active',
    marker: 'dyArrowPlanSupports', activeMarker: 'dyArrowPlanSupportsActive',
    label: 'supports', rendered: false,
  },
  contradicts: {
    meaning: 'contradicts', color: '--dy-edge-plan-contradicts', activeColor: '--dy-edge-plan-contradicts-active',
    marker: 'dyArrowPlanContradicts', activeMarker: 'dyArrowPlanContradictsActive',
    label: 'contradicts', rendered: false,
  },
  derived_from: {
    meaning: 'derived_from', color: '--dy-edge-plan-derived_from', activeColor: '--dy-edge-plan-derived_from-active',
    marker: 'dyArrowPlanDerivedFrom', activeMarker: 'dyArrowPlanDerivedFromActive',
    label: 'derived from', rendered: false,
  },
  clarifies: {
    meaning: 'clarifies', color: '--dy-edge-plan-clarifies', activeColor: '--dy-edge-plan-clarifies-active',
    marker: 'dyArrowPlanClarifies', activeMarker: 'dyArrowPlanClarifiesActive',
    label: 'clarifies', rendered: false,
  },
  implements: {
    meaning: 'implements', color: '--dy-edge-plan-implements', activeColor: '--dy-edge-plan-implements-active',
    marker: 'dyArrowPlanImplements', activeMarker: 'dyArrowPlanImplementsActive',
    label: 'implements', rendered: false,
  },
  raises_question: {
    meaning: 'raises_question', color: '--dy-edge-plan-raises_question', activeColor: '--dy-edge-plan-raises_question-active',
    marker: 'dyArrowPlanRaisesQuestion', activeMarker: 'dyArrowPlanRaisesQuestionActive',
    label: 'raises question', rendered: false,
  },
};

// The meaning every workflow dependency edge is drawn with, and the planning
// meanings the later canvas slice draws from.
export const DEFAULT_EDGE_MEANING = 'depends_on';
export const PLANNING_EDGE_MEANINGS = [
  'supports', 'contradicts', 'derived_from', 'clarifies',
  'depends_on', 'implements', 'raises_question',
] as const;

// Truthful elapsed label from a canonical timestamp. Absent timestamp ->
// 'unavailable' (never a fabricated clock). Valid timestamps -> mm:ss elapsed.
function elapsedLabel(updatedAt: string | null): string {
  if (!updatedAt) return 'unavailable';
  const base = Date.parse(updatedAt);
  if (!isFinite(base)) return 'unavailable';
  const secs = Math.max(0, Math.floor((Date.now() - base) / 1000));
  return String(Math.floor(secs / 60)).padStart(2, '0') + ':' + String(secs % 60).padStart(2, '0');
}

// P8.5: decorative-update policy. Flow dots are pure decoration; they stop
// when the document is hidden or the user prefers reduced motion. The timer
// (truthful clock) is NOT decorative and keeps ticking while visible.
const prefersReducedMotion = (): boolean => {
  try {
    const m = (typeof matchMedia === 'function')
      ? matchMedia('(prefers-reduced-motion: reduce)')
      : null;
    return Boolean(m && m.matches);
  } catch {
    return false;
  }
};

// ---- shared inert DOM helper ----
function elu<K extends HTMLElement>(tag: string, cls: string, text?: string): K {
  const el = document.createElement(tag);
  if (cls) el.className = cls;
  if (text !== undefined) el.textContent = text;
  return el as K;
}

function sEl(tag: string, attrs: Record<string, string | number>): SVGElement {
  const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
  return el;
}

// ---- lanes ---------------------------------------------------------------
// The v6 composition reads top-to-bottom in horizontal bands. There is no
// phase/lane COLLECTION in the canonical model — the only real grouping is the
// assignment the run projection resolves (`team`) and the node's own stored
// override (`phase_team`), so bands are derived from those and labelled with
// the real value. Nothing here invents a phase taxonomy.
//
// When NO node carries an assignment, the bands fall back to the one other
// partition the graph itself states: the exception path (conditional branches,
// bounded loops, blocked nodes) versus the main path. Both facts come from the
// node's own shape/status — the same inputs the purpose and status cues use —
// so a lane band never claims something the definition does not say. A single
// resulting band is not a band: the grid layout is used instead.
export interface LaneMeta {
  key: string;
  label: string;
  y: number;
  height: number;
  // Exception emphasis is meaning-carrying: a band that contains a conditional
  // branch, a bounded loop or a blocked node is the exception path of this run.
  exception: boolean;
}

export function laneKeyOf(n: CanvasNode): string {
  return ((n.team ?? n.phase_team) ?? '').trim() || 'unassigned';
}

export function laneLabelOf(key: string): string {
  if (key === 'unassigned') return 'Unassigned';
  if (key === 'main-path') return 'Main path';
  if (key === EXCEPTION_LANE_KEY) return 'Exception path';
  return key;
}

// The shape-derived partition used when no node carries an assignment.
export const EXCEPTION_LANE_KEY = 'exception-path';

export function isExceptionNode(n: CanvasNode): boolean {
  const purpose = nodePurpose(n);
  return purpose === 'branch' || purpose === 'loop' || n.status === 'blocked';
}

// ---- buildLayout: pure, exported for tests ----
export function buildLayout(nodes: CanvasNode[], opts?: { laneOf?: (n: CanvasNode) => string }): {
  positions: Record<string, { x: number; y: number; depth: number }>;
  lanes: LaneMeta[];
  width: number;
  height: number;
} {
  const byId = new Map(nodes.map((n) => [n.node_id, n]));
  const depthCache = new Map<string, number>();
  const computeDepth = (id: string): number => {
    if (depthCache.has(id)) return depthCache.get(id)!;
    const n = byId.get(id);
    if (!n) return 0;
    let d = 0;
    for (const dep of n.depends_on) d = Math.max(d, computeDepth(dep) + 1);
    depthCache.set(id, d);
    return d;
  };
  nodes.forEach((n) => computeDepth(n.node_id));
  const perDepth: Record<number, number> = {};
  const positions: Record<string, { x: number; y: number; depth: number }> = {};
  nodes.forEach((n) => {
    const d = depthCache.get(n.node_id) ?? 0;
    const row = perDepth[d] ?? 0;
    perDepth[d] = row + 1;
    positions[n.node_id] = {
      x: PAD + d * (NODE_W + COL_GAP),
      y: PAD + row * (NODE_H + ROW_GAP),
      depth: d,
    };
  });
  const maxDepth = Math.max(0, ...nodes.map((n) => depthCache.get(n.node_id) ?? 0));
  const rows = Math.max(1, ...Object.values(perDepth));
  const grid = {
    positions,
    lanes: [] as LaneMeta[],
    width: PAD * 2 + (maxDepth + 1) * (NODE_W + COL_GAP) - COL_GAP,
    height: PAD * 2 + rows * (NODE_H + ROW_GAP) - ROW_GAP,
  };
  const laneOf = opts?.laneOf;
  if (!laneOf) return grid; // default (column) layout — unchanged for callers that pass no grouping

  // Lane layout: one horizontal band per real grouping key, nodes ordered
  // left-to-right by topology depth (then by their original order), so the
  // reading order inside a band is still the dependency order.
  const order: string[] = [];
  const members = new Map<string, CanvasNode[]>();
  for (const n of nodes) {
    const key = laneOf(n);
    if (!members.has(key)) { members.set(key, []); order.push(key); }
    members.get(key)!.push(n);
  }
  const laneH = LANE_PAD * 2 + NODE_H;
  const positionsLane: Record<string, { x: number; y: number; depth: number }> = {};
  const lanes: LaneMeta[] = [];
  let widest = 0;
  order.forEach((key, li) => {
    const band = members.get(key)!;
    const sorted = [...band].sort((a, b) => {
      const da = depthCache.get(a.node_id) ?? 0;
      const db = depthCache.get(b.node_id) ?? 0;
      return da - db || nodes.indexOf(a) - nodes.indexOf(b);
    });
    const y = PAD + li * laneH;
    sorted.forEach((n, i) => {
      positionsLane[n.node_id] = { x: PAD + i * (NODE_W + COL_GAP), y: y + LANE_PAD, depth: i };
    });
    widest = Math.max(widest, sorted.length);
    lanes.push({
      key,
      label: laneLabelOf(key),
      y,
      height: laneH,
      exception: band.some((n) => {
        const purpose = nodePurpose(n);
        return purpose === 'branch' || purpose === 'loop' || n.status === 'blocked';
      }),
    });
  });
  return {
    positions: positionsLane,
    lanes,
    width: PAD * 2 + Math.max(1, widest) * (NODE_W + COL_GAP) - COL_GAP,
    height: PAD * 2 + Math.max(1, lanes.length) * laneH - (LANE_PAD - PAD > 0 ? 0 : 0) - PAD + PAD,
  };
}

// ---- mount ----
export function mountWorkflowCanvas(
  host: HTMLElement,
  projectId: string,
  runName: string,
  fetchRuns: () => Promise<CanvasRun[]>,
  handlers: CanvasHandlers,
  pollMs = 8000,
): () => void {
  host.replaceChildren();
  // The scope class is carried by the mount host ITSELF: the canvas stylesheet
  // is scoped to `.dy-wf-scope`, so the canvas owns its own styling carrier
  // instead of depending on a host-provided `.dy-root` ancestor that the
  // Desktop surface never provided (that missing ancestor is what made every
  // fill resolve to nothing and render black).
  host.className = 'dy-wf dy-wf-scope';

  const wrap = elu<HTMLDivElement>('div', 'dy-wf-wrap');
  const svg = sEl('svg', { class: 'dy-wf-svg' }) as SVGSVGElement;
  svg.setAttribute('data-lod', 'read');
  const viewport = sEl('g', { class: 'dy-wf-viewport' }) as SVGGElement;
  svg.appendChild(viewport);

  // Purpose legend: the visual set is only useful if it is readable without
  // opening a node, so the canvas states its own vocabulary. Built from the
  // same token tables the nodes and edges are drawn from (no second copy).
  const SVG_INDEX = sEl('svg', { class: 'dy-wf-index' }) as SVGSVGElement;

  // minimap: authored bounds + live camera (archify radar principle)
  const minimap = sEl('svg', { class: 'dy-wf-minimap', width: 170, height: 104 }) as SVGSVGElement;
  const miniViewport = sEl('rect', { class: 'dy-wf-mini-view' }) as SVGRectElement;
  minimap.appendChild(miniViewport);

  const passport = elu<HTMLDivElement>('div', 'dy-wf-passport');
  passport.setAttribute('aria-live', 'polite');

  // P8.2: explicit zoom controls (in / out / fit / reset) — no pointer-wheel
  // dependence. Keyboard operable (real buttons) with data-wf-action hooks.
  const zoomBar = elu<HTMLDivElement>('div', 'dy-wf-zoombar');
  zoomBar.setAttribute('role', 'group');
  zoomBar.setAttribute('aria-label', 'Zoom controls');
  const zoomButton = (action: string, label: string, title: string) => {
    const b = elu<HTMLButtonElement>('button', 'dy-wf-zoombtn', label);
    b.dataset.wfAction = action;
    b.type = 'button';
    b.setAttribute('aria-label', title);
    return b;
  };
  const zoomInBtn = zoomButton('zoom-in', '+', 'Zoom in');
  const zoomOutBtn = zoomButton('zoom-out', '−', 'Zoom out');
  const zoomFitBtn = zoomButton('zoom-fit', 'Fit', 'Fit graph to view');
  const zoomResetBtn = zoomButton('zoom-reset', 'Reset', 'Reset zoom to 100%');
  zoomBar.append(zoomInBtn, zoomOutBtn, zoomFitBtn, zoomResetBtn);

  // Live activity strip (agenttrail streaming feed) — top-left, collapsible.
  // Deliberate addition to the real canvas (previously demo-only), so the
  // canvas itself reports what's moving without opening a node.
  const feed = elu<HTMLDivElement>('div', 'dy-wf-feed');
  feed.setAttribute('aria-live', 'polite');
  const feedHead = elu<HTMLButtonElement>('button', 'dy-wf-feed-head', '▾ Activity');
  const feedBody = elu<HTMLDivElement>('div', 'dy-wf-feed-body');
  feedHead.addEventListener('click', () => {
    const open = feedHead.getAttribute('aria-expanded') === 'true';
    feedHead.setAttribute('aria-expanded', String(!open));
    feedHead.textContent = open ? '▸ Activity' : '▾ Activity';
    feedBody.style.display = open ? 'none' : 'block';
  });
  feedHead.setAttribute('aria-expanded', 'true');
  feed.append(feedHead, feedBody);
  const feedMsgs: Array<{ ts: number; text: string; el: HTMLDivElement }> = [];
  const feedLog = (text: string) => {
    const item = elu<HTMLDivElement>('div', 'dy-wf-feed-item');
    const t = elu('span', 'dy-wf-feed-time');
    t.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const b = elu('span', '', ' ' + text);
    item.append(t, b);
    feedBody.prepend(item);
    feedMsgs.unshift({ ts: Date.now(), text, el: item });
    while (feedMsgs.length > 6) {
      const old = feedMsgs.pop();
      if (old) old.el.remove();
    }
    // wall-clock decay: older items dim progressively (agenttrail model)
    feedMsgs.forEach((m, i) => {
      m.el.style.opacity = String(Math.max(0.25, 1 - i * 0.15));
    });
  };

  // P8.2: equivalent list/table view — same nodes, dependencies, gates and
  // statuses as the graph, derived from the SAME frame (no extra fetch).
  // Stays usable if the canvas fails; rows are keyboard-activatable.
  // Collapsed by default (v6 composition is canvas-first): the list is the
  // on-demand equivalent view, not a second copy of the workflow on screen.
  const listView = elu<HTMLDivElement>('div', 'dy-wf-list');
  listView.dataset.wfList = '';
  const listHead = elu<HTMLButtonElement>('button', 'dy-wf-list-head', '▸ List view');
  listHead.type = 'button';
  listHead.setAttribute('aria-expanded', 'false');
  const listBody = elu<HTMLDivElement>('div', 'dy-wf-list-body');
  listBody.setAttribute('role', 'table');
  listBody.setAttribute('aria-label', 'Workflow run as list');
  listBody.style.display = 'none';
  listHead.addEventListener('click', () => {
    const open = listHead.getAttribute('aria-expanded') === 'true';
    listHead.setAttribute('aria-expanded', String(!open));
    listHead.textContent = open ? '▸ List view' : '▾ List view';
    listBody.style.display = open ? 'none' : 'block';
  });
  listView.append(listHead, listBody);

  wrap.append(svg, SVG_INDEX, feed, minimap, passport, zoomBar, listView);
  host.appendChild(wrap);

  // camera state
  let panX = 0;
  let panY = 0;
  let zoom = 1;
  let fullW = 0;
  let fullH = 0;
  // The world origin can be negative once a persisted position sits above or
  // left of the computed layout; the minimap needs the same origin the main
  // svg viewBox uses, or its dots would be offset.
  let originX = 0;
  let originY = 0;
  let currentNodes: CanvasNode[] = [];
  let nodePositions: Record<string, CanvasPosition> = {};
  let dragNode: string | null = null;
  let dragStart = { x: 0, y: 0, ox: 0, oy: 0 };
  let connectFrom: string | null = null;
  let disposers: Array<() => void> = [];

  // ---- drag / connect gesture core (single source of truth) ---------------
  // Before S1 this file had two independent node-drag write paths and two
  // independent connection-completion paths: the node handler and the
  // canvas-level handler each committed the graph, and neither reset the other's
  // state. A single release could therefore commit twice, and a release that the
  // canvas path consumed left the node-level drag marker set with the node left
  // visually mid-drag. Every pointer gesture now runs through the functions
  // below, so there is exactly one writer per outcome and one reset per release.
  //
  // Coordinates: pointer deltas are in SCREEN pixels, the graph is in WORLD
  // units. The viewport applies translate(pan) scale(zoom), so a world delta is
  // a screen delta divided by zoom. The element-local pointer position is read
  // through the viewport matrix as well, so a drag is anchored to where the
  // pointer actually grabbed the node instead of snapping it to the pointer.
  let dragSession: { nodeId: string; pointerId: number; offsetX: number; offsetY: number; moved: boolean } | null = null;

  const matrixNumbers = (transform: string | null): number[] =>
    (transform ?? '').match(/-?\d+(?:\.\d+)?(?:e[-+]?\d+)?/g)?.map(Number) ?? [];

  // A node's own transform is always translate(x y) — set by this module — so
  // this is a local read and not a general DOMMatrix substitute.
  const readNodeTransform = (g: SVGGElement): { x: number; y: number } | null => {
    const nums = matrixNumbers(g.getAttribute('transform'));
    if (nums.length < 2 || !isFinite(nums[0]) || !isFinite(nums[1])) return null;
    return { x: nums[0], y: nums[1] };
  };

  const worldPoint = (clientX: number, clientY: number): { x: number; y: number } => {
    let ox = 0;
    let oy = 0;
    try {
      const ctm = svg.getScreenCTM();
      if (ctm && isFinite(ctm.a) && isFinite(ctm.e) && isFinite(ctm.f)) {
        ox = ctm.e;
        oy = ctm.f;
      }
    } catch {
      ox = 0;
      oy = 0;
    }
    return { x: (clientX - ox - panX) / zoom, y: (clientY - oy - panY) / zoom };
  };

  const writeNodePosition = (nodeId: string, g: SVGGElement, x: number, y: number) => {
    nodePositions[nodeId] = { x, y, depth: nodePositions[nodeId]?.depth ?? 0 };
    g.setAttribute('transform', `translate(${x} ${y})`);
  };

  const startDrag = (nodeId: string, g: SVGGElement, e: PointerEvent, depth: number) => {
    // A shift-click or port press is a connect gesture, never a drag.
    if (connectFrom) return;
    const current = nodePositions[nodeId] ?? { x: 0, y: 0, depth };
    const world = worldPoint(e.clientX, e.clientY);
    dragNode = nodeId;
    dragSession = {
      nodeId,
      pointerId: e.pointerId,
      offsetX: world.x - current.x,
      offsetY: world.y - current.y,
      moved: false,
    };
    dragStart = { x: e.clientX, y: e.clientY, ox: current.x, oy: current.y };
    // Capture the pointer on the node so the drag survives the pointer leaving
    // the node's own hit area.
    try { g.setPointerCapture(e.pointerId); } catch { /* older engines */ }
  };

  const dragMove = (e: PointerEvent) => {
    const session = dragSession;
    if (!session || e.pointerId !== session.pointerId) return;
    const g = viewport.querySelector<SVGGElement>(`[data-node-id="${session.nodeId}"]`);
    if (!g) return;
    // Track real movement: a click (press and release without motion) must not
    // be treated as a drag commit, or the resulting version-save + refresh
    // re-mounts the canvas and discards the passport the click just opened.
    const movedBy = Math.hypot(e.clientX - dragStart.x, e.clientY - dragStart.y);
    if (movedBy > 3) session.moved = true;
    const world = worldPoint(e.clientX, e.clientY);
    writeNodePosition(session.nodeId, g, world.x - session.offsetX, world.y - session.offsetY);
  };

  const commitNodePosition = async (nodeId: string) => {
    const committed = nodePositions[nodeId];
    if (!committed) return;
    const nextNodes = currentNodes.map((item) => item.node_id === nodeId
      ? { ...item, canvas_position: { x: committed.x, y: committed.y } } as CanvasNode
      : item);
    currentNodes = nextNodes;
    await handlers.onEdit?.(nextNodes);
  };

  // One release path for a node drag. commit=false (pointercancel) leaves the
  // last rendered position in place and writes nothing, so an interrupted
  // gesture can never persist a half-state.
  const endDragSession = (e: PointerEvent, commit: boolean) => {
    const session = dragSession;
    if (!session) return;
    const g = viewport.querySelector<SVGGElement>(`[data-node-id="${session.nodeId}"]`);
    if (g) {
      try { g.releasePointerCapture(session.pointerId); } catch { /* not captured */ }
    }
    dragSession = null;
    dragNode = null;
    dragStart = { x: 0, y: 0, ox: 0, oy: 0 };
    // A click with no measurable movement is a selection, not an edit: opening
    // the passport must not trigger a version save.
    if (commit && session.moved) void commitNodePosition(session.nodeId);
  };

  const startConnect = (nodeId: string, g: SVGGElement) => {
    if (connectFrom && connectFrom !== nodeId) {
      const previous = viewport.querySelector<SVGGElement>(`[data-node-id="${connectFrom}"]`);
      previous?.classList.remove('dy-wf-connecting');
    }
    if (dragNode) endDragSession({ pointerId: -1 } as PointerEvent, false);
    connectFrom = nodeId;
    g.classList.add('dy-wf-connecting');
  };

  const cancelConnect = () => {
    if (connectFrom) {
      const g = viewport.querySelector<SVGGElement>(`[data-node-id="${connectFrom}"]`);
      g?.classList.remove('dy-wf-connecting');
    }
    connectFrom = null;
  };

  // One completion path for a connection gesture, reached from the node
  // release, the canvas release and the keyboard paths alike.
  const endConnectGesture = (to: string | null) => {
    const from = connectFrom;
    if (!from) return;
    connectFrom = null;
    for (const g of viewport.querySelectorAll<SVGGElement>('.dy-wf-node.dy-wf-connecting')) {
      g.classList.remove('dy-wf-connecting');
    }
    if (!to) return; // released on empty canvas: nothing to complete, nothing to report
    // Cycle rules are unchanged: client-side validateConnection, and the server
    // rejects what it rejects. This only decides what to even ask for.
    // A release on the source node itself is a real (rejected) request and must
    // keep reporting its reason — validateConnection answers that first.
    const error = validateConnection(currentNodes, from, to);
    if (error) {
      feedLog(error);
      return;
    }
    const nextNodes = currentNodes.map((item) => item.node_id === to
      ? { ...item, depends_on: [...new Set([...item.depends_on, from])] }
      : item);
    currentNodes = nextNodes;
    void handlers.onEdit?.(nextNodes);
  };

  const apply = () => {
    viewport.setAttribute('transform', `translate(${panX} ${panY}) scale(${zoom})`);
    svg.setAttribute('data-lod', zoom > LOD_FULL ? 'full' : zoom < 0.75 ? 'map' : 'read');
  };

  // P8.2: explicit zoom controls. Same clamps as the wheel path; fit reuses
  // the fit-to-view computation; reset returns to identity.
  const ZOOM_STEP = 1.25;
  const ZOOM_MIN = 0.45;
  const ZOOM_MAX = 2.4;
  const setZoom = (next: number) => {
    zoom = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, next));
    apply();
  };
  zoomInBtn.addEventListener('click', () => setZoom(zoom * ZOOM_STEP));
  zoomOutBtn.addEventListener('click', () => setZoom(zoom / ZOOM_STEP));
  zoomResetBtn.addEventListener('click', () => {
    zoom = 1;
    panX = 0;
    panY = 0;
    apply();
  });
  zoomFitBtn.addEventListener('click', () => {
    if (!fullW || !fullH) return;
    const sw = svg.clientWidth || 1300;
    const sh = svg.clientHeight || 760;
    const s = Math.min(sw / fullW, sh / fullH, 2.4);
    zoom = Math.max(ZOOM_MIN, s);
    panX = (sw - fullW * zoom) / 2;
    panY = (sh - fullH * zoom) / 2;
    apply();
  });

  // ---- defs: arrow markers (inert) ----
  // Marker ids and colours come from the edge meaning token table, so a
  // connector's meaning is expressed once and reused by both the edge and its
  // arrowhead. Only meanings this canvas draws get marker elements.
  const defs = sEl('defs', {});
  const mkMarker = (id: string, fillToken: string, fallback: string) => {
    const m = sEl('marker', {
      id,
      viewBox: '0 0 10 10',
      refX: '9',
      refY: '5',
      // Larger than the 1.5px stroke and in userSpaceOnUse so the head keeps a
      // constant, legible size instead of thinning with the stroke width.
      markerWidth: '6',
      markerHeight: '6',
      markerUnits: 'userSpaceOnUse',
      orient: 'auto-start-reverse',
    });
    const head = sEl('path', {
      d: 'M 0 0 L 10 5 L 0 10 z',
      class: 'dy-wf-arrow',
      fill: `var(${fillToken}, ${fallback})`,
    });
    m.appendChild(head);
    return m;
  };
  for (const meaning of Object.values(EDGE_MEANINGS)) {
    if (!meaning.rendered) continue;
    defs.appendChild(mkMarker(meaning.marker, meaning.color, '#8fa3c8'));
    defs.appendChild(mkMarker(meaning.activeMarker, meaning.activeColor, '#9cc4ff'));
  }
  svg.appendChild(defs);

  // ---- render frame (event-driven: called on poll arrival / state delta) ----
  let lastRun: CanvasRun | null = null;
  const renderList = (run: CanvasRun | null) => {
    listBody.replaceChildren();
    if (!run || run.nodes.length === 0) {
      listBody.appendChild(elu('p', 'dy-dim', 'No workflow runs yet.'));
      return;
    }
    const titleOf = new Map(run.nodes.map((n) => [n.node_id, n.title] as const));
    for (const n of run.nodes) {
      const row = elu<HTMLDivElement>('div', 'dy-wf-list-row');
      row.dataset.wfListRow = n.node_id;
      row.setAttribute('role', 'row');
      const name = elu<HTMLSpanElement>('span', 'dy-wf-list-title', n.title);
      const kindText = nodePurpose(n);
      const kind = elu<HTMLSpanElement>('span', `dy-wf-list-kind ${kindText}`,
        PURPOSE_VISUALS[kindText].label);
      const deps = elu<HTMLSpanElement>('span', 'dy-wf-list-deps',
        n.depends_on.length
          ? `depends on: ${n.depends_on.map((d) => titleOf.get(d) ?? d).join(', ')}`
          : 'no dependencies');
      const status = elu<HTMLSpanElement>(`span`, `dy-wf-list-status ${n.status ?? 'pending'}`,
        n.status ?? 'pending');
      const open = () => openPassport(n, null);
      const activate = elu<HTMLButtonElement>('button', 'dy-wf-list-open', 'Open');
      activate.type = 'button';
      activate.setAttribute('aria-label', `Open ${n.title} details`);
      activate.addEventListener('click', open);
      row.append(name, kind, deps, status, activate);
      listBody.appendChild(row);
    }
  };
  // ---- S1: per-purpose node component -------------------------------------
  // One component per node, differentiated on three independent cues so that
  // purpose is immediately readable without relying on colour alone:
  //   silhouette (hexagon gate / cut-corner branch / notched loop / round rect task)
  //   purpose tint + symbol + purpose name
  //   the purpose fill, with status carried by the OUTLINE + status chip
  // No node carries a coloured side stripe.
  const buildNode = (
    n: CanvasNode,
    p: CanvasPosition,
    run: CanvasRun,
    editable: boolean,
  ): SVGGElement => {
    const purpose = nodePurpose(n);
    const status = statusToken(n.status);
    const visuals = PURPOSE_VISUALS[purpose];
    const g = sEl('g', {
      class: `dy-wf-node ${purpose} ${status}`,
      transform: `translate(${p.x} ${p.y})`,
    }) as SVGGElement;
    g.dataset.wfPurpose = purpose;
    g.dataset.wfStatus = status;
    g.setAttribute('tabindex', '0');
    g.setAttribute('role', 'button');
    g.setAttribute('data-node-id', n.node_id);
    g.setAttribute('aria-label', `${visuals.label}: ${n.title} (${n.status ?? 'pending'})`);
    // The editable flag states whether a persistence seam is actually wired.
    g.dataset.wfEditable = String(editable);
    g.setAttribute('aria-describedby', `wf-help-${n.node_id}`);

    // Purpose silhouette, drawn inside the fixed node box so ports, edges and
    // the layout grid keep their geometry.
    const outline = nodeShapePath(purpose);
    const shape = outline === null
      ? sEl('rect', { width: NODE_W, height: NODE_H, rx: 9, class: 'dy-wf-shape dy-wf-rect' })
      : sEl('path', { d: outline, class: 'dy-wf-shape dy-wf-rect' });
    shape.setAttribute('fill', `var(${visuals.fill})`);

    // Purpose cues: symbol + name in the purpose text colour (row 1 / row 2 left).
    const glyph = sEl('text', { x: visuals.glyphX, y: 26, class: 'dy-wf-glyph' }) as SVGTextElement;
    glyph.textContent = visuals.glyph;
    const label = sEl('text', { x: visuals.textX, y: 25, class: 'dy-wf-label' }) as SVGTextElement;
    label.textContent = n.title.slice(0, 18);
    const sub = sEl('text', { x: 12, y: 45, class: 'dy-wf-sub' }) as SVGTextElement;
    sub.textContent = visuals.label;

    // Status cues: outline stroke + tinted chip + the status word itself.
    // Status never re-colours the fill, so purpose and status cannot collide.
    const chip = sEl('rect', {
      x: NODE_W - 66, y: 34, width: 54, height: 16, rx: 8,
      class: `dy-wf-statuschip ${status}`,
    });
    const statusText = sEl('text', {
      x: NODE_W - 39, y: 45.5, 'text-anchor': 'middle',
      class: `dy-wf-statustext ${status}`,
    }) as SVGTextElement;
    statusText.textContent = n.status ?? 'pending';
    g.append(shape, glyph, label, sub, chip, statusText);

    // Workflow elapsed time, not this node's execution duration.
    // A refresh timestamp must never reset the clock; missing start is unavailable.
    if (n.status === 'working') {
      const timer = sEl('text', {
        x: 12, y: 60, class: 'dy-wf-timer full',
      }) as SVGTextElement;
      timer.textContent = `Workflow: ${elapsedLabel(run.started_at)}`;
      timer.dataset.for = n.node_id;
      g.appendChild(timer);
    }
    // Assignee stays on the node face (row 3, opposite the clock) — who owns
    // the node is factual, not decorative, so it is never dropped for styling.
    if (n.assignee) {
      g.appendChild((() => {
        const who = sEl('text', {
          x: NODE_W - 12, y: 60, 'text-anchor': 'end', class: 'dy-wf-assignee',
        }) as SVGTextElement;
        who.textContent = n.assignee;
        return who;
      })());
    }

    // Connect port: single, right side, hit area larger than the visual mark.
    const port = sEl('circle', { cx: NODE_W, cy: NODE_H / 2, r: 11, class: 'dy-wf-port' });
    port.setAttribute('data-connect-from', n.node_id);
    port.setAttribute('tabindex', '0');
    port.setAttribute('aria-label', `Connect from ${n.title}`);
    g.appendChild(port);

    const dash = () => shape.setAttribute('stroke-dasharray', '4 3');
    const undash = () => shape.removeAttribute('stroke-dasharray');
    // Bind the port directly rather than relying on bubbling hit-testing from
    // the node group. Synthetic pointer events and SVG hit-testing can expose
    // the group as the target even when the pointer is on the port, which
    // incorrectly starts a node drag and loses the connection source.
    port.addEventListener('pointerdown', (ev) => {
      const e = ev as PointerEvent;
      if (e.button !== 0 || !editable) return;
      e.stopPropagation();
      startConnect(n.node_id, g);
    });
    g.addEventListener('pointerdown', (ev) => {
      const e = ev as PointerEvent;
      if (e.button !== 0 || !editable) return;
      e.stopPropagation();
      if (e.shiftKey) {
        // Shift-click is the pointer-only connect gesture.
        startConnect(n.node_id, g);
        return;
      }
      startDrag(n.node_id, g, e, p.depth ?? 0);
    });
    g.addEventListener('pointermove', (ev) => dragMove(ev as PointerEvent));
    g.addEventListener('pointerup', (ev) => {
      const e = ev as PointerEvent;
      if (dragSession && dragSession.nodeId === n.node_id) {
        e.stopPropagation();
        endDragSession(e, true);
        return;
      }
      if (connectFrom) {
        // The node claims the release so the canvas-level completion path
        // cannot commit the same connection a second time.
        e.stopPropagation();
        endConnectGesture(n.node_id);
      }
    });
    // pointercancel: an interrupted pointer (system gesture, lost capture)
    // must drop the drag without writing a half-state or an edit.
    g.addEventListener('pointercancel', (ev) => {
      const e = ev as PointerEvent;
      if (dragSession && dragSession.nodeId === n.node_id) {
        e.stopPropagation();
        endDragSession(e, false);
      }
    });
    g.addEventListener('keydown', (ev) => {
      const e = ev as KeyboardEvent;
      if (!editable) return;
      if (e.key === ' ' || e.key === 'c') {
        e.preventDefault();
        if (connectFrom === n.node_id) cancelConnect();
        else startConnect(n.node_id, g);
      } else if (e.key === 'Enter' && connectFrom && connectFrom !== n.node_id) {
        e.preventDefault();
        endConnectGesture(n.node_id);
      }
    });
    g.addEventListener('pointerenter', dash); // intent preview [archify]
    g.addEventListener('pointerleave', () => {
      if (!g.classList.contains('dy-wf-selected')) undash();
    });
    const open = () => openPassport(n, g);
    g.addEventListener('click', open);
    g.addEventListener('keydown', (e) => {
      const ev = e as KeyboardEvent;
      if (ev.key === 'Enter') {
        open();
        return;
      }
      // P8.2: arrow-key focus movement between nodes (graph roving focus).
      if (ev.key === 'ArrowRight' || ev.key === 'ArrowDown'
        || ev.key === 'ArrowLeft' || ev.key === 'ArrowUp') {
        ev.preventDefault();
        const all = [...viewport.querySelectorAll<SVGGElement>('.dy-wf-node')];
        const idx = all.indexOf(g);
        if (idx === -1) return;
        const step = (ev.key === 'ArrowRight' || ev.key === 'ArrowDown') ? 1 : -1;
        const next = all[(idx + step + all.length) % all.length];
        if (next) next.focus();
      }
    });
    return g;
  };

  const render = (run: CanvasRun | null) => {
    lastRun = run;
    renderList(run);
    viewport.replaceChildren();
    viewport.appendChild(defs);
    if (!run || run.nodes.length === 0) {
      const t = sEl('text', { x: 20, y: 40, class: 'dy-wf-empty' }) as SVGTextElement;
      t.textContent = 'No workflow runs yet.';
      viewport.appendChild(t);
      updateMinimap();
      return;
    }
    currentNodes = run.nodes;
    // Lane grouping: the resolved assignment when the run states one, else the
    // shape-derived exception partition (both real — see laneKeyOf). A single
    // band is not a band: bands only render when there are two or more.
    const assignments = run.nodes.some((n) => ((n.team ?? n.phase_team) ?? '').trim());
    const laneOf = assignments
      ? laneKeyOf
      : (n: CanvasNode) => (isExceptionNode(n) ? EXCEPTION_LANE_KEY : 'main-path');
    let layout = buildLayout(run.nodes, { laneOf });
    if (layout.lanes.length < 2) layout = buildLayout(run.nodes);
    const positions = nodePositions = Object.keys(nodePositions).length ? { ...layout.positions, ...nodePositions } : run.nodes.reduce((acc, item) => { if (item.canvas_position) acc[item.node_id] = { ...layout.positions[item.node_id], ...item.canvas_position }; return acc; }, { ...layout.positions } as Record<string, CanvasPosition>);
    // The world must contain every node it renders. Persisted canvas_position
    // values survive layout changes, so a stale drag can sit outside the
    // computed layout box — the old code sized the viewBox from the layout
    // alone and such a node was clipped by the frame (measured 2026-09-22).
    let worldW = layout.width;
    let worldH = layout.height;
    let minX = 0;
    let minY = 0;
    for (const p of Object.values(positions)) {
      worldW = Math.max(worldW, p.x + NODE_W + PAD);
      worldH = Math.max(worldH, p.y + NODE_H + PAD);
      minX = Math.min(minX, p.x - PAD);
      minY = Math.min(minY, p.y - PAD);
    }
    worldW -= minX;
    worldH -= minY;
    fullW = worldW;
    fullH = worldH;
    originX = minX;
    originY = minY;
    svg.setAttribute('viewBox', `${minX} ${minY} ${worldW} ${worldH}`);

    // Lane bands first (background of the whole world), so nodes and edges sit
    // on top. Every band is derived from the same layout the nodes use.
    for (const lane of layout.lanes) {
      const band = sEl('rect', {
        x: minX, y: lane.y, width: worldW, height: lane.height,
        class: lane.exception ? 'dy-wf-lane exception' : 'dy-wf-lane',
      });
      band.setAttribute('data-lane', lane.key);
      const lbl = sEl('text', { x: minX + 14, y: lane.y + 16, class: 'dy-wf-lane-label' }) as SVGTextElement;
      lbl.textContent = lane.label;
      viewport.append(band, lbl);
    }

    // edges first (under nodes). Every dependency edge carries the default
    // workflow meaning; its colour and arrowhead come from the meaning table.
    const depMeaning = EDGE_MEANINGS[DEFAULT_EDGE_MEANING];
    for (const n of run.nodes) {
      const from = positions[n.node_id];
      for (const dep of n.depends_on) {
        const to = positions[dep];
        if (!from || !to) continue;
        const path = sEl('path', {
          class: 'dy-wf-edge',
          'data-meaning': depMeaning.meaning,
          // Curved connector. Same-band edges bow gently so the curve is
          // visible; cross-band edges take a wider S-curve between the two
          // lane anchors, so a dependency that crosses lanes reads as one
          // flow instead of a ruler line.
          d: (() => {
            const x1 = to.x + NODE_W, y1 = to.y + NODE_H / 2;
            const x2 = from.x - 6, y2 = from.y + NODE_H / 2;
            const sameBand = Math.abs(y1 - y2) < NODE_H / 2;
            const dx = Math.max(COL_GAP / 2, Math.abs(x2 - x1) * 0.55);
            if (sameBand) {
              // Bow: lift the two control points symmetrically off the line.
              const bow = Math.min(46, Math.max(18, dx * 0.35));
              return `M ${x1} ${y1} C ${x1 + dx} ${y1 - bow}, ${x2 - dx} ${y2 - bow}, ${x2} ${y2}`;
            }
            return `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;
          })(),
          // Leaves the marker 6px of room before the shape, so the head is
          // never tucked under the node it points at.
          'marker-end': `url(#${depMeaning.marker})`,
        });
        path.dataset.from = dep;
        path.dataset.to = n.node_id;
        viewport.appendChild(path);
        const dot = sEl('circle', { class: 'dy-wf-flowdot', r: 3.2, opacity: 0 });
        viewport.appendChild(dot);
      }
    }
    for (const n of run.nodes) {
      const p = positions[n.node_id];
      viewport.appendChild(buildNode(n, p, run, Boolean(handlers.onEdit)));
    }
    renderLegend(run);
    apply();
    updateMinimap();
  };

  // ---- purpose legend (rendered from the token tables) ----
  const renderLegend = (run: CanvasRun | null) => {
    SVG_INDEX.replaceChildren();
    SVG_INDEX.setAttribute('aria-label', 'Node purposes on this canvas');
    if (!run || run.nodes.length === 0) return;
    // Only purposes this run actually contains are listed, so the legend
    // describes the picture instead of a hypothetical vocabulary.
    const present = new Set(run.nodes.map((n) => nodePurpose(n)));
    const purposes = (Object.keys(PURPOSE_VISUALS) as CanvasNodePurpose[])
      .filter((p) => present.has(p));
    const rowH = 26;
    const padX = 12;
    const width = 214;
    const height = 22 + purposes.length * rowH;
    SVG_INDEX.setAttribute('viewBox', `0 0 ${width} ${height}`);
    SVG_INDEX.setAttribute('width', String(width));
    SVG_INDEX.setAttribute('height', String(height));
    const frame = sEl('rect', {
      x: 0.5, y: 0.5, width: width - 1, height: height - 1, rx: 7, class: 'dy-wf-index-bg',
    });
    const heading = sEl('text', { x: padX, y: 15, class: 'dy-wf-index-title' }) as SVGTextElement;
    heading.textContent = 'NODE PURPOSE';
    SVG_INDEX.append(frame, heading);
    purposes.forEach((p, i) => {
      const v = PURPOSE_VISUALS[p];
      const cy = 22 + i * rowH + 8;
      const outline = nodeShapePath(p, 20, 16);
      const swatch = outline === null
        ? sEl('rect', { x: 0, y: 0, width: 20, height: 16, rx: 3, class: 'dy-wf-index-shape' })
        : sEl('path', { d: outline, class: 'dy-wf-index-shape' });
      swatch.setAttribute('fill', `var(${v.fill})`);
      swatch.setAttribute('stroke', `var(${v.line})`);
      // The swatch states the purpose, so it carries the purpose identity.
      swatch.setAttribute('data-wf-purpose', p);
      // One transform per swatch: the group moves it into the legend row.
      const row = sEl('g', { transform: `translate(${padX} ${cy - 8})` });
      row.appendChild(swatch);
      const glyph = sEl('text', { x: 30, y: 13, class: 'dy-wf-index-glyph' }) as SVGTextElement;
      glyph.textContent = v.glyph;
      row.appendChild(glyph);
      const name = sEl('text', { x: 48, y: 13, class: 'dy-wf-index-label' }) as SVGTextElement;
      name.textContent = v.label;
      row.appendChild(name);
      SVG_INDEX.appendChild(row);
    });
    const dep = EDGE_MEANINGS[DEFAULT_EDGE_MEANING];
    const edgeRow = sEl('g', { transform: `translate(${padX} ${height - 4})` });
    const line = sEl('path', { d: 'M 0 -5 L 20 -5', class: 'dy-wf-index-edge' });
    edgeRow.appendChild(line);
    const edgeLabel = sEl('text', { x: 30, y: -1, class: 'dy-wf-index-edge-label' }) as SVGTextElement;
    edgeLabel.textContent = `${dep.label} → (workflow edges)`;
    edgeRow.appendChild(edgeLabel);
    SVG_INDEX.appendChild(edgeRow);
  };

  // ---- minimap ----
  const updateMinimap = () => {
    minimap.replaceChildren(miniViewport);
    if (fullW <= 0) return;
    const s = Math.min(170 / fullW, 104 / fullH);
    const vx = (0 - panX) / zoom;
    const vy = (0 - panY) / zoom;
    const vw = (svg.clientWidth || 1300) / zoom;
    const vh = (svg.clientHeight || 760) / zoom;
    miniViewport.setAttribute('x', String(vx * s));
    miniViewport.setAttribute('y', String(vy * s));
    miniViewport.setAttribute('width', String(Math.max(10, vw * s)));
    miniViewport.setAttribute('height', String(Math.max(7, vh * s)));
    for (const n of currentNodes) {
      // The minimap shows what is RENDERED: read the persisted/live positions
      // the nodes actually carry, not a fresh grid, or a dragged node would
      // sit somewhere the map does not show. Coordinates are shifted into the
      // same (originX, originY) frame the main viewBox uses.
      const p = nodePositions[n.node_id];
      if (!p) continue;
      const dot = sEl('rect', {
        x: (p.x - originX) * s,
        y: (p.y - originY) * s,
        width: Math.max(3, NODE_W * s),
        height: Math.max(2, NODE_H * s),
        fill: `var(${STATUS_TOKENS[statusToken(n.status)]}, #6e7681)`,
        opacity: 0.8,
      });
      minimap.appendChild(dot);
    }
  };
  minimap.addEventListener('click', (e) => {
    const ev = e as MouseEvent;
    const r = minimap.getBoundingClientRect();
    const fx = (ev.clientX - r.left) / 170;
    const fy = (ev.clientY - r.top) / 104;
    if (fullW <= 0) return;
    const s = Math.min(170 / fullW, 104 / fullH);
    panX = 650 - (fx * 170) / s * zoom;
    panY = 380 - (fy * 104) / s * zoom;
    apply();
    updateMinimap();
  });

  // ---- passport with lazy expansion ----
  let lastFrames: CanvasRun[] = [];
  let selectedEl: SVGGElement | null = null;
  const openPassport = (n: CanvasNode, g?: SVGGElement | null) => {
    // unmistakable selection: clear previous, mark current
    if (selectedEl) selectedEl.classList.remove('dy-wf-selected');
    selectedEl = g ?? null;
    if (selectedEl) selectedEl.classList.add('dy-wf-selected');
    passport.replaceChildren();
    passport.appendChild(elu('h3', '', n.title));
    if (handlers.onEdit) {
      const edit = elu<HTMLDivElement>('div', 'dy-wf-edit');
      const title = elu<HTMLInputElement>('input', 'dy-wf-edit-title'); title.value = n.title; title.setAttribute('aria-label', 'Node title');
      const deps = elu<HTMLInputElement>('input', 'dy-wf-edit-deps'); deps.value = n.depends_on.join(', '); deps.setAttribute('aria-label', 'Dependencies');
      const team = elu<HTMLInputElement>('input', 'dy-wf-edit-team'); team.value = n.phase_team ?? ''; team.placeholder = 'phase team override'; team.setAttribute('aria-label', 'Phase team override');
      const save = elu<HTMLButtonElement>('button', 'dy-btn primary', 'Save graph version'); save.type = 'button';
      save.addEventListener('click', async () => {
        const ids = new Set(deps.value.split(',').map((v) => v.trim()).filter(Boolean)); ids.delete(n.node_id);
        const edited = currentNodes.map((item) => item.node_id === n.node_id ? { ...item, title: title.value.trim() || item.title, depends_on: [...ids], phase_team: team.value.trim() || null } : item);
        save.disabled = true; save.textContent = 'Saving…';
        try { await handlers.onEdit!(edited); save.textContent = 'Saved ✓'; } catch { save.disabled = false; save.textContent = 'Save failed — retry'; }
      });
      edit.append(elu('label', '', 'Title'), title, elu('label', '', 'Dependencies (node IDs)'), deps, elu('label', '', 'Phase team'), team, save);
      passport.appendChild(edit);
    }
    passport.appendChild(elu('span', `badge ${n.status ?? 'pending'}`, n.status ?? 'pending'));
    // P8.3: last-confirmed update for the run (not a node-level claim).
    const lastConfirmed = elu<HTMLParagraphElement>('p', 'dy-wf-last-confirmed');
    const updated = lastRun?.updated_at ?? null;
    lastConfirmed.textContent = `Last confirmed update: ${
      updated && isFinite(Date.parse(updated)) ? updated.replace('T', ' ').slice(0, 16) + ' UTC' : 'unknown'
    }`;
    lastConfirmed.setAttribute('data-last-confirmed', updated ?? 'unknown');
    passport.appendChild(lastConfirmed);
    if (n.assignee) passport.appendChild(elu('p', 'dy-dim', `assignee: ${n.assignee}`));
    if (n.evidence_refs.length) {
      const p = elu('p', 'dy-dim', 'evidence: ' + n.evidence_refs.join(', '));
      passport.appendChild(p);
    }
    if (n.task_ref) {
      passport.appendChild(elu('p', 'dy-dim', `deep link: ${n.task_ref}`));
      // P8.3: explicit decision state. awaiting_decision -> approved/rejected
      // after server confirmation -> failed (retryable). Phase 4 controls
      // carry the authority; this label never overrides them.
      const decisionState = n.kind === 'gate' && n.status !== 'done' && n.status !== 'blocked'
        ? elu<HTMLSpanElement>('span', 'dy-wf-decision-state', 'Awaiting decision')
        : null;
      if (decisionState) {
        decisionState.setAttribute('data-decision-state', 'awaiting_decision');
        passport.appendChild(decisionState);
      }
      if (n.kind === 'gate' && n.status !== 'done' && n.status !== 'blocked') {
        const row = elu('div', 'dy-wf-actions');
        const approve = elu<HTMLButtonElement>('button', 'dy-btn primary', 'Approve');
        const reject = elu<HTMLButtonElement>('button', 'dy-btn', 'Reject');
        // Truthful gate action: pending state while awaiting the server;
        // success only AFTER server confirmation; failure is shown and
        // retryable; a second click never duplicates an in-flight action.
        let inFlight = false;
        const setDecisionState = (state: string, text: string) => {
          if (!decisionState) return;
          decisionState.setAttribute('data-decision-state', state);
          decisionState.textContent = text;
        };
        const runAction = async (
          act: (ref: string) => Promise<unknown> | void,
          okLabel: string,
          pendingLabel: string,
          failPrefix: string,
          okState: string,
          pendingState: string,
        ) => {
          if (inFlight) return; // duplicate-click guard
          inFlight = true;
          approve.disabled = true;
          reject.disabled = true;
          approve.textContent = pendingLabel;
          reject.textContent = pendingLabel;
          setDecisionState(pendingState, pendingLabel.replace(/…$/, '') + ' in progress');
          try {
            await act(n.task_ref as string);
            approve.textContent = okLabel;
            reject.textContent = 'Reject';
            approve.disabled = true; // decision made; buttons stay disabled
            reject.disabled = true;
            setDecisionState(okState, okLabel);
          } catch {
            reject.textContent = 'Reject';
            approve.textContent = failPrefix + ' failed — retry';
            approve.disabled = false; // retryable
            reject.disabled = false;
            setDecisionState('failed', failPrefix + ' failed — retry');
          } finally {
            inFlight = false;
          }
        };
        approve.addEventListener('click', () => {
          void runAction(handlers.onApprove, 'Approved ✓', 'Approving…', 'Approve', 'approved', 'approved_pending');
        });
        reject.addEventListener('click', () => {
          void runAction(handlers.onReject, 'Rejected ✕', 'Rejecting…', 'Reject', 'rejected', 'rejected_pending');
        });
        row.append(approve, reject);
        passport.appendChild(row);
      }
      // P8.4: supported retry/recovery reuses the canonical transition
      // contract (onRetry -> POST transition backlogged). Pause/cancel of a
      // running worker is NOT supported by the native execution contract —
      // displayed as a fact, never offered as a control.
      if (n.kind !== 'gate' && (n.status === 'blocked' || n.status === 'working') && handlers.onRetry) {
        const recovery = elu('div', 'dy-wf-recovery');
        if (n.status === 'blocked') {
          const retry = elu<HTMLButtonElement>('button', 'dy-btn', 'Re-queue (retry)');
          retry.type = 'button';
          retry.setAttribute('aria-label', `Re-queue ${n.title} through the canonical transition`);
          retry.addEventListener('click', () => {
            retry.disabled = true;
            try {
              handlers.onRetry!(n.task_ref as string);
              retry.textContent = 'Re-queued ✓';
            } catch {
              retry.textContent = 'Re-queue failed — retry';
              retry.disabled = false;
            }
          });
          recovery.appendChild(retry);
        }
        const unsupported = elu('p', 'dy-wf-unsupported',
          'Pause and cancel are not supported by the native execution contract — a running worker cannot be stopped from here.');
        unsupported.setAttribute('data-unsupported-controls', 'pause,cancel');
        recovery.appendChild(unsupported);
        passport.appendChild(recovery);
      }
      // ---- expandable live detail (agenttrail expansion pattern) ----
      if (handlers.onExpand) {
        const sec = elu('div', 'dy-wf-expand');
        const head = elu('button', 'dy-wf-expand-head', '▸ Live detail');
        head.setAttribute('aria-expanded', 'false');
        const body = elu('div', 'dy-wf-expand-body');
        body.style.display = 'none';
        body.appendChild(elu('p', 'dy-dim', 'Loading live detail…'));
        head.addEventListener('click', () => {
          const isOpen = head.getAttribute('aria-expanded') === 'true';
          head.setAttribute('aria-expanded', String(!isOpen));
          head.textContent = isOpen ? '▸ Live detail' : '▾ Live detail';
          body.style.display = isOpen ? 'none' : 'block';
          if (!isOpen && !body.dataset.loaded) {
            body.dataset.loaded = '1';
            handlers
              .onExpand!(n.task_ref as string)
              .then((data) => {
                body.replaceChildren();
                if (!data) {
                  body.appendChild(elu('p', 'dy-dim', 'Detail unavailable.'));
                  return;
                }
                // --- progress bar (agenttrail node expansion): done/total ---
                const kids = data.children;
                const doneCount = kids.filter((c) => (c.status ?? '') === 'done').length;
                const total = kids.length;
                body.appendChild(elu('h4', '', 'Progress'));
                const barWrap = elu('div', 'dy-wf-progress');
                const barFill = elu('div', 'dy-wf-progress-fill');
                const pct = total > 0 ? Math.round((doneCount / total) * 100) : 0;
                barFill.style.width = pct + '%';
                barWrap.appendChild(barFill);
                body.appendChild(barWrap);
                body.appendChild(
                  elu('p', 'dy-wf-progress-label', `${doneCount} of ${total} sub-tasks done (${pct}%)`),
                );
                // --- per-task checklist with assignees (agenttrail pattern) ---
                body.appendChild(elu('h4', '', 'Sub-tasks'));
                body.appendChild(
                  buildTasks(
                    kids.map((c) => ({
                      ref: c.ref,
                      title: c.title,
                      status: c.status,
                      assignee: c.assignee ?? null,
                    })),
                    (ref) => passport.dispatchEvent(new CustomEvent('openwork', { detail: ref })),
                  ),
                );
                // --- activity thread last (keeps the reading order: status → who → when) ---
                body.appendChild(elu('h4', '', 'Activity'));
                body.appendChild(
                  buildThread(data.history.map((h) => ({ ts: h.ts, text: h.text }))),
                );
              })
              .catch(() => {
                body.replaceChildren(elu('p', 'dy-dim', 'Detail unavailable.'));
              });
          }
        });
        sec.append(head, body);
        passport.appendChild(sec);
      }
    } else {
      passport.appendChild(elu('p', 'dy-dim', 'No canonical work bound to this node yet.'));
    }
  };

  // shared components (static import): decay thread + task list
  const buildThread = (items: Array<{ ts?: string | number | null; text: string }>) =>
    buildActivityThread(items, { decay: true });
  const buildTasks = (
    tasks: Array<{ ref: string; title: string; status?: string | null }>,
    onOpen?: (ref: string) => void,
  ) => buildTaskListMini(tasks, onOpen);

  // ---- interactions: pan / zoom / minimap ----
  let dragging = false;
  let lastX = 0;
  let lastY = 0;
  svg.addEventListener('pointerdown', (e) => {
    // Canvas-background pan. Node presses return before this: the node handler
    // stops propagation and owns the pointer for its gesture. Click-vs-drag
    // disambiguation keeps the capture on the pressed element itself, so the
    // click event still retargets to the node on release (capturing on the svg
    // swallowed node clicks entirely — real-browser verified).
    if ((e.target as Element)?.closest?.('.dy-wf-node')) return;
    dragging = true;
    lastX = (e as PointerEvent).clientX;
    lastY = (e as PointerEvent).clientY;
    const target = e.target as Element;
    const captureEl = (target && target.closest && target.closest('g.dy-wf-node')) as Element | SVGSVGElement | null;
    const cap = (captureEl ?? svg) as Element;
    try {
      cap.setPointerCapture((e as PointerEvent).pointerId);
    } catch {
      /* older engines */
    }
  });
  svg.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    // While a node drag owns the pointer, panning must not also consume it.
    if (dragSession) return;
    const ev = e as PointerEvent;
    panX += ev.clientX - lastX;
    panY += ev.clientY - lastY;
    lastX = ev.clientX;
    lastY = ev.clientY;
    apply();
    updateMinimap();
  });
  svg.addEventListener('pointerup', (e) => {
    // Drag release: one path, same function the node handler calls, so a
    // release can never be handled twice or leave the drag half-finished.
    if (dragSession) {
      endDragSession(e as PointerEvent, true);
      dragging = false;
      return;
    }
    if (connectFrom) {
      // Connection completion lives in the same single path the node-level
      // handlers use (endConnectGesture); this branch only supplies the target
      // for a release that lands on the canvas background.
      const target = (e.target as Element)?.closest?.('[data-node-id]') as Element | null;
      endConnectGesture(target?.getAttribute('data-node-id') ?? null);
    }
    dragging = false;
    try {
      svg.releasePointerCapture((e as PointerEvent).pointerId);
    } catch {
      /* noop */
    }
  });
  // pointercancel at the canvas level: an interrupted pan or connection gesture
  // must also leave no half-state (a pan that never released kept panning).
  svg.addEventListener('pointercancel', (e) => {
    if (dragSession) endDragSession(e as PointerEvent, false);
    cancelConnect();
    dragging = false;
    try {
      svg.releasePointerCapture((e as PointerEvent).pointerId);
    } catch {
      /* noop */
    }
  });
  svg.addEventListener('wheel', (e) => {
    e.preventDefault();
    const ev = e as WheelEvent;
    const rect = svg.getBoundingClientRect();
    const cx = ev.clientX - rect.left;
    const cy = ev.clientY - rect.top;
    const factor = ev.deltaY < 0 ? ZOOM_IN : ZOOM_OUT;
    const next = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, zoom * factor));
    const k = next / zoom;
    panX = cx - (cx - panX) * k;
    panY = cy - (cy - panY) * k;
    zoom = next;
    apply();
    updateMinimap();
  }, { passive: false });

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      passport.replaceChildren();
      if (selectedEl) selectedEl.classList.remove('dy-wf-selected');
      selectedEl = null;
    }
  };
  document.addEventListener('keydown', onKeyDown);

  // ---- flow dots (40ms animation only; timer truth lives on a 1s clock) ----
  // P8.5: the dot animation is DECORATIVE. It stops entirely when the
  // document is hidden or the user prefers reduced motion; when stopped,
  // dots are forced invisible so no frozen decoration lingers. Resumes
  // automatically on visibility regain with motion allowed.
  let flowT = 0;
  let flowStopped = false;
  const flowTimer = setInterval(() => {
    if (flowStopped) return;
    if (document.hidden || prefersReducedMotion()) {
      flowStopped = true;
      viewport.querySelectorAll<SVGCircleElement>('.dy-wf-flowdot').forEach((d) => {
        d.setAttribute('opacity', '0');
      });
      return;
    }
    flowT = (flowT + 0.03) % 1;
    const edgeMap = new Map<string, { path: SVGPathElement; dot: SVGCircleElement }>();
    viewport.querySelectorAll<SVGPathElement>('path.dy-wf-edge').forEach((p) => {
      const key = (p.dataset.from ?? '') + '>' + (p.dataset.to ?? '');
      const dot = p.nextElementSibling as SVGCircleElement | null;
      if (dot && dot.classList.contains('dy-wf-flowdot')) edgeMap.set(key, { path: p, dot });
    });
    const doneIds = new Set(
      currentNodes.filter((n) => n.status === 'done').map((n) => n.node_id),
    );
    // active iff target is live and source is done
    viewport.querySelectorAll<SVGPathElement>('path.dy-wf-edge').forEach((p) => {
      const to = currentNodes.find((n) => n.node_id === p.dataset.to);
      const fromDone = doneIds.has(p.dataset.from ?? '');
      const meaning = EDGE_MEANINGS[p.dataset.meaning ?? DEFAULT_EDGE_MEANING];
      const active = !!to && to.status !== 'pending' && fromDone;
      p.classList.toggle('active', active);
      // A live connector switches to its meaning's active colour, so the
      // arrowhead keeps stating the same meaning while it animates.
      if (meaning) {
        p.setAttribute('marker-end', `url(#${active ? meaning.activeMarker : meaning.marker})`);
      }
    });
    edgeMap.forEach(({ path, dot }) => {
      if (!path.classList.contains('active')) {
        dot.setAttribute('opacity', '0');
        return;
      }
      let pt: { x: number; y: number } | null = null;
      try {
        const L = path.getTotalLength();
        if (L > 0) pt = path.getPointAtLength(L * flowT);
      } catch {
        pt = null;
      }
      if (!pt || !isFinite(pt.x) || !isFinite(pt.y)) {
        const nums = (path.getAttribute('d') || '').match(/-?\d+(\.\d+)?/g) ?? [];
        if (nums.length >= 4 && nums[0] !== undefined && nums[1] !== undefined) {
          const ax = +(nums[0] ?? 0), ay = +(nums[1] ?? 0);
          const mx = +(nums[2] ?? ax), my = +(nums[3] ?? ay);
          const bx = +(nums[nums.length - 2] ?? ax), by = +(nums[nums.length - 1] ?? ay);
          pt = flowT < 0.5
            ? { x: ax + (mx - ax) * flowT * 2, y: ay + (my - ay) * flowT * 2 }
            : { x: mx + (bx - mx) * (flowT - 0.5) * 2, y: my + (by - my) * (flowT - 0.5) * 2 };
        }
      }
      if (pt && isFinite(pt.x) && isFinite(pt.y)) {
        dot.setAttribute('cx', String(pt.x));
        dot.setAttribute('cy', String(pt.y));
        dot.setAttribute('opacity', '0.9');
      } else dot.setAttribute('opacity', '0');
    });
  }, 40);

  // ---- polling (the event source; keep last frame, apply on arrival) ----
  let timer: ReturnType<typeof setInterval> | null = null;
  let lastSig = '';
  // Ignore responses older than the last applied response, not merely the
  // last issued request: slow successful requests must still render.
  let pollTicket = 0;
  let appliedTicket = 0;
  let disposed = false;
  // Truthful elapsed clocks: refresh working-node timers from updated_at once
  // per second (never per animation tick). Idle-tolerant: interval only when
  // working nodes exist; skipped when none render.
  const tickTimers = () => {
    viewport.querySelectorAll<SVGTextElement>('text.dy-wf-timer').forEach((t) => {
      const node = currentNodes.find((n) => n.node_id === t.dataset.for);
      if (!node || node.status !== 'working') return;
      t.textContent = `Workflow: ${elapsedLabel(currentStartedAt)}`;
    });
  };
  let currentStartedAt: string | null = null;
  const clockTimer = setInterval(tickTimers, 1000);
  // P8.5: when the document becomes visible again, re-arm the decorative
  // flow animation (it self-stops again on the next tick if it must).
  const onVisibility = () => {
    if (!document.hidden) flowStopped = false;
  };
  document.addEventListener('visibilitychange', onVisibility);

  // feed-aware poll: repaints on delta AND logs status transitions to the strip
  const pollOnce = () => {
    const ticket = ++pollTicket;
    fetchRuns()
      .then((runs) => {
        if (disposed || ticket < appliedTicket) return;
        appliedTicket = ticket;
        const latest = runs && runs.length ? runs[0] : null;
        const sig = JSON.stringify(latest?.nodes.map((n) => [n.node_id, n.status]) ?? []);
        if (sig !== lastSig) {
          if (lastSig !== '') {
            const prev = new Map<string, string | null>();
            try {
              (JSON.parse(lastSig) as Array<[string, string | null]>).forEach(([id, st]) => prev.set(id, st));
            } catch { /* ignore */ }
            (latest?.nodes ?? []).forEach((n) => {
              const old = prev.get(n.node_id);
              if (old !== undefined && old !== n.status) {
                feedLog(`${n.title}: ${old ?? 'pending'} → ${n.status ?? 'pending'}`);
              }
            });
          }
          lastSig = sig;
        }
        // Re-render on ANY payload change (identity, title, evidence,
        // assignee, timestamps), not just node_id/status — the delta path
        // compares the full frame so changed run data reaches the canvas.
        const frameSig = JSON.stringify(latest ?? null);
        if (frameSig !== lastFrameSig) {
          render(latest);
          lastFrameSig = frameSig;
        }
        currentStartedAt = latest?.started_at ?? null;
        tickTimers();
        setStale(false);
      })
      .catch(() => {
        if (disposed || ticket < appliedTicket) return;
        appliedTicket = ticket;
        // Keep the last good frame, but say so truthfully.
        setStale(true);
      });
  };
  let lastFrameSig = '';
  const setStale = (on: boolean) => {
    const existing = wrap.querySelector('.dy-wf-stale');
    if (on && !existing) {
      const badge = elu('div', 'dy-wf-stale', 'stale — last refresh failed, showing last known state');
      wrap.insertBefore(badge, wrap.firstChild);
    } else if (!on && existing) existing.remove();
  };
  pollOnce();
  if (pollMs > 0) timer = setInterval(pollOnce, pollMs);

  disposers.push(() => {
    disposed = true;
    if (timer) clearInterval(timer);
    if (flowTimer) clearInterval(flowTimer);
    clearInterval(clockTimer);
    document.removeEventListener('keydown', onKeyDown);
    document.removeEventListener('visibilitychange', onVisibility);
    host.replaceChildren();
  });
  return () => {
    disposers.forEach((d) => d());
    disposers = [];
  };
}