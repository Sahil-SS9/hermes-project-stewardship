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
  // Optional read-only playback history attached by the host poller.
  timeline?: Array<{ seq?: number; node_id: string; from_status?: string | null; to_status: string; ts?: string }>;
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
  timeline?: Array<{ seq?: number; node_id: string; from_status?: string | null; to_status: string; ts?: string }>;
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

export const NOT_IN_LATEST_PLAN = 'This step is not in the latest version of the workflow, so it cannot be changed here.';

// Removing a step (07/10/2026, WORKFLOWS-R1.md finding 3). The steps after it
// are re-linked to the steps before it, so the chain stays connected. Refused,
// with the reason, when another step's condition checks it or a repeating step
// would be left with no step before it (the engine rejects both).
export function deletePlan(nodes: CanvasNode[], id: string): CanvasNode[] | string {
  const target = nodes.find((n) => n.node_id === id);
  if (!target) return NOT_IN_LATEST_PLAN;
  const names = (list: CanvasNode[]) => list.map((n) => `"${n.title}"`).join(', ');
  const checks = nodes.filter((n) => n.node_id !== id && n.when?.node === id);
  if (checks.length) {
    return checks.length === 1
      ? `Can't delete "${target.title}": ${names(checks)} has a condition that checks it. Change or remove that condition first.`
      : `Can't delete "${target.title}": ${names(checks)} have conditions that check it. Change or remove those conditions first.`;
  }
  const next = nodes.filter((n) => n.node_id !== id).map((n) => (n.depends_on.includes(id)
    ? { ...n, depends_on: [...new Set(n.depends_on.flatMap((dep) => (dep === id ? target.depends_on : [dep])))].filter((dep) => dep !== n.node_id) }
    : n));
  const stranded = next.filter((n) => n.loop && n.depends_on.length === 0
    && (nodes.find((m) => m.node_id === n.node_id)?.depends_on.length ?? 0) > 0);
  if (stranded.length) {
    return `Can't delete "${target.title}": ${names(stranded)} ${stranded.length === 1 ? 'repeats' : 'repeat'}, and a repeating step needs a step before it.`;
  }
  return next;
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
  // The latest saved plan, which every edit starts from. The canvas may be
  // showing a run (a frozen copy of the version it started with); building an
  // edit from that copy saved a version without the steps added since
  // (07/10/2026, WORKFLOWS-R1.md finding 14). Absent: edits start from what
  // is shown.
  editNodes?: () => CanvasNode[];
  // Told which step is selected (null when none), so the host's toolbar can
  // act on it (e.g. a new step follows the selected one).
  onSelect?: (nodeId: string | null) => void;
  // Read-only canonical event history. If absent (e.g. definition-only
  // frames), playback stays disabled rather than inventing events.
  fetchTimeline?: (projectId: string, workflowName: string, runKey: string) => Promise<{ events?: Array<Record<string, unknown>> }>;
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

// ---- node status / purpose vocabulary ------------------------------------
// Every node is drawn as the SAME glass card. What a node is (its purpose) is
// stated in words on the card; where a node is (its status) is carried by the
// card border, a status dot and the status word. Status colours are CSS custom
// properties declared once in workflow-canvas-css.ts; the literals in this file
// are only stylesheet-less fallbacks for SVG presentation attributes.
export type CanvasNodePurpose = 'task' | 'gate' | 'branch' | 'loop';

export const STATUS_ORDER = ['done', 'working', 'blocked', 'pending'] as const;
export type CanvasNodeStatusToken = (typeof STATUS_ORDER)[number];

// Canonical statuses are the only ones the canvas colours; anything else is
// shown as pending (the raw word is still what the node prints).
export function statusToken(status: string | null | undefined): CanvasNodeStatusToken {
  return status === 'done' || status === 'working' || status === 'blocked' ? status : 'pending';
}

export const STATUS_TOKENS: Record<CanvasNodeStatusToken, string> = {
  done: '--dy-wf-status-done',
  working: '--dy-wf-status-working',
  blocked: '--dy-wf-status-blocked',
  pending: '--dy-wf-status-pending',
};

export interface PurposeVisuals { label: string }

// Purpose names only: the card itself is identical for every purpose.
export const PURPOSE_VISUALS: Record<CanvasNodePurpose, PurposeVisuals> = {
  task: { label: 'Task' },
  gate: { label: 'Human gate' },
  branch: { label: 'Conditional branch' },
  loop: { label: 'Bounded loop' },
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

// A pending human gate is waiting on a person: the one status refinement the
// run projection states directly (human_gate + pending), never inferred.
export function isAwaitingDecision(n: CanvasNode): boolean {
  return nodePurpose(n) === 'gate' && statusToken(n.status) === 'pending';
}

export const CARD_RADIUS = 12;

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
export function buildLayout(nodes: CanvasNode[], opts?: { laneOf?: (n: CanvasNode) => string; mobile?: boolean }): {
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
  if (opts?.mobile) {
    nodes.forEach((n, index) => { positions[n.node_id] = { x: PAD, y: PAD + index * (NODE_H + ROW_GAP + 24), depth: index }; });
    return { positions, lanes: [], width: PAD * 2 + NODE_W, height: PAD * 2 + nodes.length * (NODE_H + ROW_GAP + 24) };
  }
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
// The mount's handle: call it to dispose; `refresh()` re-reads the frame from
// fetchRuns without rebuilding the canvas, so the open step panel, the camera
// and any selection survive new data (07/10/2026, finding 13: the Desktop
// screen re-mounted the canvas on every data change).
export type CanvasHandle = (() => void) & { refresh: () => void };

export function mountWorkflowCanvas(
  host: HTMLElement,
  projectId: string,
  runName: string,
  fetchRuns: () => Promise<CanvasRun[]>,
  handlers: CanvasHandlers,
  pollMs = 8000,
): CanvasHandle {
  host.replaceChildren();
  // The scope class is carried by the mount host ITSELF: the canvas stylesheet
  // is scoped to `.dy-wf-scope`, so the canvas owns its own styling carrier
  // instead of depending on a host-provided `.dy-root` ancestor that the
  // Desktop surface never provided (that missing ancestor is what made every
  // fill resolve to nothing and render black).
  host.className = 'dy-wf dy-wf-scope';
  // Resolve the window from the host's own document so embedded/test surfaces
  // that shim document but not globalThis.window still mount (jsdom lanes).
  const canvasWindow = (host.ownerDocument?.defaultView ?? globalThis.window) as Window & typeof globalThis;

  const wrap = elu<HTMLDivElement>('div', 'dy-wf-wrap');
  const svg = sEl('svg', { class: 'dy-wf-svg' }) as SVGSVGElement;
  svg.setAttribute('data-lod', 'read');
  const viewport = sEl('g', { class: 'dy-wf-viewport' }) as SVGGElement;
  svg.appendChild(viewport);

  // minimap: authored bounds + live camera (archify radar principle)
  const minimap = sEl('svg', { class: 'dy-wf-minimap dy-wf-glass', width: 170, height: 104 }) as SVGSVGElement;
  minimap.setAttribute('aria-label', 'Canvas overview: click to move the view');
  const miniViewport = sEl('rect', { class: 'dy-wf-mini-view' }) as SVGRectElement;
  minimap.appendChild(miniViewport);

  const passport = elu<HTMLDivElement>('div', 'dy-wf-passport dy-wf-glass');
  passport.setAttribute('aria-live', 'polite');

  // P8.2: explicit zoom controls (in / out / fit / reset) — no pointer-wheel
  // dependence. Keyboard operable (real buttons) with data-wf-action hooks.
  // Floating glass tool cluster (top-right of the canvas): camera controls
  // plus the list-view toggle. It floats over the canvas so every control is
  // on screen; it used to sit below the svg inside an overflow-hidden frame
  // and was clipped out of view entirely.
  const zoomBar = elu<HTMLDivElement>('div', 'dy-wf-zoombar dy-wf-glass');
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
  const feed = elu<HTMLDivElement>('div', 'dy-wf-feed dy-wf-glass');
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
  const listView = elu<HTMLDivElement>('div', 'dy-wf-list dy-wf-glass');
  listView.dataset.wfList = '';
  const listHead = elu<HTMLButtonElement>('button', 'dy-wf-zoombtn dy-wf-list-head', '▸ List view');
  listHead.type = 'button';
  listHead.setAttribute('aria-expanded', 'false');
  const listBody = elu<HTMLDivElement>('div', 'dy-wf-list-body');
  listBody.setAttribute('role', 'table');
  listBody.setAttribute('aria-label', 'Workflow run as list');
  listBody.style.display = 'none';
  listView.hidden = true;
  listHead.addEventListener('click', () => {
    const open = listHead.getAttribute('aria-expanded') === 'true';
    listHead.setAttribute('aria-expanded', String(!open));
    listHead.textContent = open ? '▸ List view' : '▾ List view';
    listBody.style.display = open ? 'none' : 'block';
    listView.hidden = open;
  });
  // The toggle lives in the floating tool cluster; the list opens as a
  // floating glass panel over the canvas.
  zoomBar.appendChild(listHead);
  listView.append(listBody);

  // Playback is a canvas control, not a side-panel feature. It is disabled
  // until the real timeline endpoint supplies at least two observed events.
  let playbackBar: HTMLDivElement | null = null;
  let playbackSlider: HTMLInputElement | null = null;
  let playbackLabel: HTMLSpanElement | null = null;
  let playbackButton: HTMLButtonElement | null = null;
  playbackBar = elu<HTMLDivElement>('div', 'dy-wf-playback dy-wf-glass');
  playbackBar.setAttribute('role', 'group');
  playbackBar.setAttribute('aria-label', 'Workflow playback');
  playbackButton = elu<HTMLButtonElement>('button', 'dy-wf-playback-btn', '▶ Play');
  playbackButton.type = 'button';
  playbackButton.disabled = true;
  playbackSlider = elu<HTMLInputElement>('input', 'dy-wf-playback-slider');
  playbackSlider.type = 'range'; playbackSlider.min = '0'; playbackSlider.value = '0'; playbackSlider.step = '1'; playbackSlider.disabled = true;
  playbackSlider.setAttribute('aria-label', 'Workflow playback');
  playbackLabel = elu<HTMLSpanElement>('span', 'dy-wf-playback-label', 'Live');
  const motionButton = elu<HTMLButtonElement>('button', 'dy-wf-motion-btn', 'Motion on');
  motionButton.type = 'button'; motionButton.setAttribute('aria-label', 'Toggle workflow canvas motion'); motionButton.setAttribute('aria-pressed', 'true');
  motionButton.addEventListener('click', () => {
    const on = motionButton.getAttribute('aria-pressed') === 'true';
    motionButton.setAttribute('aria-pressed', String(!on));
    motionButton.textContent = on ? 'Motion off' : 'Motion on';
    host.classList.toggle('dy-wf-still', on);
  });
  playbackBar.append(playbackButton, playbackSlider, playbackLabel, motionButton);
  wrap.append(svg, feed, minimap, passport, zoomBar, listView, playbackBar);
  // Keep the canvas frame itself scroll-free on mobile: the control row owns
  // its horizontal overflow and remains fully reachable by touch/keyboard.
  playbackBar.style.overflowX = 'auto';
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
  // Drops whose save has not come back yet: drawn where they were dropped
  // until the saved frame carries the same position (or the save fails).
  const pendingPositions = new Map<string, { x: number; y: number }>();
  // Size of the computed layout (the world also grows to fit saved positions).
  let layoutW = 0;
  let layoutH = 0;
  // False until the first fit on a laid-out canvas; after that only the user
  // moves the camera.
  let cameraSet = false;
  let renderedIds = new Set<string>();
  let selectedId: string | null = null;
  let previousMobileLayout: boolean | null = null;
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

  // Screen pixels per canvas unit. 1 unless an ancestor is scaled (e.g. a host
  // zoom factor); pointer deltas are divided by it so steps track the pointer.
  const screenScale = (): { sx: number; sy: number; ox: number; oy: number } => {
    try {
      const ctm = svg.getScreenCTM();
      if (ctm && isFinite(ctm.a) && ctm.a > 0 && isFinite(ctm.d) && ctm.d > 0 && isFinite(ctm.e) && isFinite(ctm.f)) {
        return { sx: ctm.a, sy: ctm.d, ox: ctm.e, oy: ctm.f };
      }
    } catch {
      /* no layout (jsdom) */
    }
    return { sx: 1, sy: 1, ox: 0, oy: 0 };
  };

  const worldPoint = (clientX: number, clientY: number): { x: number; y: number } => {
    const { sx, sy, ox, oy } = screenScale();
    return { x: ((clientX - ox) / sx - panX) / zoom, y: ((clientY - oy) / sy - panY) / zoom };
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
    // Ignore sub-threshold pointer jitter altogether. Moving the SVG node on
    // a plain click can change its hit target while the passport is opening,
    // detaching the Save control when the subsequent version refresh lands.
    if (!session.moved) return;
    const world = worldPoint(e.clientX, e.clientY);
    writeNodePosition(session.nodeId, g, world.x - session.offsetX, world.y - session.offsetY);
  };

  // ---- edits ----
  // Every edit starts from the latest plan (handlers.editNodes) and edits run
  // one at a time, so a quick second edit never builds on a plan that lacks
  // the first. Without editNodes, the last saved edit stands in until the next
  // frame arrives.
  let editQueue: Promise<unknown> = Promise.resolve();
  let optimisticBase: CanvasNode[] | null = null;
  const editBase = (): CanvasNode[] => handlers.editNodes?.() ?? optimisticBase ?? currentNodes;
  const NOT_IN_PLAN = NOT_IN_LATEST_PLAN;
  const runEdit = (build: (base: CanvasNode[]) => CanvasNode[] | string): Promise<void> => {
    const next = editQueue.then(async () => {
      const result = build(editBase());
      if (typeof result === 'string') throw new Error(result);
      await handlers.onEdit!(result);
      if (!handlers.editNodes) optimisticBase = result;
    });
    editQueue = next.catch(() => undefined);
    return next;
  };
  // Host errors arrive as "422: <reason>"; the reason is what a person needs.
  const errorText = (error: unknown): string =>
    String((error as Error)?.message ?? error ?? 'unknown error').replace(/^\d{3}:\s*/, '') || 'unknown error';

  const commitNodePosition = (nodeId: string) => {
    const committed = nodePositions[nodeId];
    if (!committed || !handlers.onEdit) return;
    const position = { x: committed.x, y: committed.y };
    pendingPositions.set(nodeId, position);
    void runEdit((base) => (base.some((item) => item.node_id === nodeId)
      ? base.map((item) => (item.node_id === nodeId ? { ...item, canvas_position: position } : item))
      : NOT_IN_PLAN))
      .catch((error) => {
        // Put the step back where the saved plan has it, and say why.
        pendingPositions.delete(nodeId);
        feedLog(`Couldn't save the move: ${errorText(error)}`);
        if (lastRun) render(lastRun);
      });
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
    const error = validateConnection(editBase(), from, to);
    if (error) {
      feedLog(error);
      return;
    }
    void runEdit((base) => {
      if (!base.some((item) => item.node_id === from) || !base.some((item) => item.node_id === to)) return NOT_IN_PLAN;
      return validateConnection(base, from, to) ?? base.map((item) => (item.node_id === to
        ? { ...item, depends_on: [...new Set([...item.depends_on, from])] }
        : item));
    }).catch((failure) => feedLog(`Couldn't save the connection: ${errorText(failure)}`));
  };

  // Camera. The SVG attribute is the source of truth; the same transform is
  // mirrored to the CSS property so a browser can ease button/minimap moves.
  // Direct manipulation (pan drag, wheel) sets dy-wf-panning, which turns the
  // easing off so the world tracks the pointer with no lag.
  const apply = () => {
    viewport.setAttribute('transform', `translate(${panX} ${panY}) scale(${zoom})`);
    viewport.style.transform = `translate(${panX}px, ${panY}px) scale(${zoom})`;
    svg.setAttribute('data-lod', zoom > LOD_FULL ? 'full' : zoom < 0.75 ? 'map' : 'read');
  };

  // P8.2: explicit zoom controls. Same clamps as the wheel path.
  //
  // Camera model (07/10/2026). The svg has no viewBox: one canvas unit is one
  // CSS pixel, and only pan and zoom move the view. The old viewBox was
  // re-fitted to the graph on every render, so each save re-centred and
  // re-scaled the whole drawing (a dropped step landed about half as far as it
  // was dragged), steps lagged the pointer whenever that scale was not 1, and
  // Fit applied the scale a second time and pushed steps off the edge
  // (WORKFLOWS-R1.md finding 9). The graph is fitted once when it first has a
  // size; after that the camera moves only when the person moves it.
  const ZOOM_STEP = 1.25;
  const ZOOM_MIN = 0.45;
  const ZOOM_MAX = 2.4;
  // Fit may go below ZOOM_MIN so that a large graph still fits.
  const FIT_MIN = 0.2;
  const viewSize = () => ({ w: svg.clientWidth || 1300, h: svg.clientHeight || 760 });
  // The world: the computed layout plus every drawn position (a saved or
  // dropped position can sit outside the layout), with padding.
  const measureWorld = () => {
    let maxX = layoutW;
    let maxY = layoutH;
    let minX = 0;
    let minY = 0;
    for (const p of Object.values(nodePositions)) {
      maxX = Math.max(maxX, p.x + NODE_W + PAD);
      maxY = Math.max(maxY, p.y + NODE_H + PAD);
      minX = Math.min(minX, p.x - PAD);
      minY = Math.min(minY, p.y - PAD);
    }
    originX = minX;
    originY = minY;
    fullW = maxX - minX;
    fullH = maxY - minY;
  };
  const centreAt = (z: number) => {
    const { w, h } = viewSize();
    zoom = z;
    panX = (w - fullW * z) / 2 - originX * z;
    panY = (h - fullH * z) / 2 - originY * z;
  };
  // Whole graph in view, never enlarged past 100%.
  const fitView = () => {
    measureWorld();
    if (!fullW || !fullH) return;
    const { w, h } = viewSize();
    centreAt(Math.max(FIT_MIN, Math.min(w / fullW, h / fullH, 1)));
    apply();
    updateMinimap();
  };
  // 100%: centred when the graph fits, else its top-left corner in view.
  const resetView = () => {
    measureWorld();
    const { w, h } = viewSize();
    centreAt(1);
    if (fullW > w) panX = -originX;
    if (fullH > h) panY = -originY;
    apply();
    updateMinimap();
  };
  // Zoom about the middle of the view. Zooming out never zooms in: below
  // ZOOM_MIN (reachable through Fit) the floor is the current zoom.
  const setZoom = (next: number) => {
    const target = Math.min(ZOOM_MAX, Math.max(Math.min(ZOOM_MIN, zoom), next));
    const { w, h } = viewSize();
    const k = target / zoom;
    panX = w / 2 - (w / 2 - panX) * k;
    panY = h / 2 - (h / 2 - panY) * k;
    zoom = target;
    cameraSet = true;
    apply();
    updateMinimap();
  };
  zoomInBtn.addEventListener('click', () => setZoom(zoom * ZOOM_STEP));
  zoomOutBtn.addEventListener('click', () => setZoom(zoom / ZOOM_STEP));
  zoomResetBtn.addEventListener('click', () => {
    cameraSet = true;
    resetView();
  });
  zoomFitBtn.addEventListener('click', () => {
    cameraSet = true;
    fitView();
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
  // Glass sheen: one light gradient laid over every card (identical cards).
  const sheenGrad = sEl('linearGradient', { id: 'dyWfCardSheen', x1: '0', y1: '0', x2: '0', y2: '1' });
  sheenGrad.append(
    sEl('stop', { offset: '0%', 'stop-color': '#ffffff', 'stop-opacity': '0.09' }),
    sEl('stop', { offset: '100%', 'stop-color': '#ffffff', 'stop-opacity': '0' }),
  );
  defs.appendChild(sheenGrad);
  svg.appendChild(defs);

  const timelineFor = (run: CanvasRun | null) => run?.timeline ?? [];
  const clearRoute = () => {
    viewport.querySelectorAll('.dy-wf-route-dim, .dy-wf-route-edge').forEach((el) => el.classList.remove('dy-wf-route-dim', 'dy-wf-route-edge'));
  };
  const renderPlaybackState = (run: CanvasRun | null, index: number | null) => {
    if (!run || index === null || !run.timeline?.length) return;
    const state = new Map<string, string>();
    for (const event of run.timeline.slice(0, index + 1)) state.set(event.node_id, event.to_status);
    viewport.querySelectorAll<SVGGElement>('[data-node-id]').forEach((g) => {
      const id = g.getAttribute('data-node-id') ?? '';
      const status = state.get(id);
      if (status) g.dataset.wfPlaybackStatus = status;
      g.classList.toggle('dy-wf-playback-active', state.has(id));
    });
    if (playbackLabel) playbackLabel.textContent = `Event ${index + 1}/${run.timeline.length}`;
  };
  const setPlayback = (run: CanvasRun | null, index: number | null) => {
    const timeline = timelineFor(run);
    playbackIndex = index;
    const enabled = timeline.length > 1;
    if (playbackSlider) { playbackSlider.disabled = !enabled; playbackSlider.max = String(Math.max(0, timeline.length - 1)); playbackSlider.value = String(Math.max(0, index ?? timeline.length - 1)); }
    if (playbackButton) playbackButton.disabled = !enabled;
    render(run);
    if (index !== null) renderPlaybackState(run, index);
  };
  playbackSlider?.addEventListener('input', () => { if (lastRun) setPlayback(lastRun, Number(playbackSlider?.value ?? 0)); });
  playbackButton?.addEventListener('click', () => {
    if (!lastRun?.timeline?.length) return;
    const next = playbackIndex === null ? 0 : playbackIndex + 1;
    if (next >= lastRun.timeline.length) { setPlayback(lastRun, null); if (playbackButton) playbackButton.textContent = '▶ Play'; return; }
    if (playbackButton) playbackButton.textContent = '⏸ Pause'; setPlayback(lastRun, next);
  });

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
  // ---- node card ---------------------------------------------------------
  // Every node is the same glass card (the approved prototype card). Purpose
  // is stated in words; status is carried by the card border, a status dot
  // and the status word. The card fills the fixed node box exactly, so ports,
  // edge endpoints and the layout grid share one geometry.
  const buildNode = (
    n: CanvasNode,
    p: CanvasPosition,
    run: CanvasRun,
    editable: boolean,
  ): SVGGElement => {
    const purpose = nodePurpose(n);
    const status = statusToken(n.status);
    const visuals = PURPOSE_VISUALS[purpose];
    const awaiting = isAwaitingDecision(n);
    const g = sEl('g', {
      class: `dy-wf-node ${purpose} ${status}${awaiting ? ' awaiting' : ''}`,
      transform: `translate(${p.x} ${p.y})`,
    }) as SVGGElement;
    g.dataset.wfPurpose = purpose;
    g.dataset.wfStatus = status;
    if (awaiting) g.dataset.wfAwaiting = 'true';
    if (playbackIndex !== null) g.dataset.wfPlaybackStatus = n.status ?? 'pending';
    g.setAttribute('tabindex', '0');
    g.setAttribute('role', 'button');
    g.setAttribute('data-node-id', n.node_id);
    g.setAttribute('aria-label', `${visuals.label}: ${n.title} (${n.status ?? 'pending'})`);
    // The editable flag states whether a persistence seam is actually wired.
    g.dataset.wfEditable = String(editable);
    g.setAttribute('aria-describedby', `wf-help-${n.node_id}`);

    // The card. One element, identical geometry for every node.
    const shape = sEl('rect', {
      width: NODE_W, height: NODE_H, rx: CARD_RADIUS, class: 'dy-wf-shape dy-wf-card',
    });
    // Stylesheet-less fallback only; the canvas stylesheet owns the token.
    shape.setAttribute('fill', '#101c30');
    // Soft top sheen: decoration inside the card box only.
    const sheen = sEl('rect', {
      x: 1, y: 1, width: NODE_W - 2, height: NODE_H / 2, rx: CARD_RADIUS - 1,
      class: 'dy-wf-card-sheen',
    });

    // Row 1: status dot + title. Row 2: purpose word + status word.
    const dot = sEl('circle', { cx: 18, cy: 22, r: 4.5, class: `dy-wf-statusdot ${status}` });
    const label = sEl('text', { x: 30, y: 26, class: 'dy-wf-label' }) as SVGTextElement;
    label.textContent = n.title.length > 22 ? n.title.slice(0, 21) + '…' : n.title;
    const sub = sEl('text', { x: 14, y: 46, class: 'dy-wf-sub' }) as SVGTextElement;
    sub.textContent = visuals.label;
    const statusText = sEl('text', {
      x: NODE_W - 14, y: 46, 'text-anchor': 'end',
      class: `dy-wf-statustext ${status}`,
    }) as SVGTextElement;
    statusText.textContent = awaiting ? 'awaiting decision' : (n.status ?? 'pending');
    g.append(shape, sheen, dot, label, sub, statusText);

    // Workflow elapsed time, not this node's execution duration.
    // A refresh timestamp must never reset the clock; missing start is unavailable.
    if (n.status === 'working') {
      const timer = sEl('text', {
        x: 14, y: 62, class: 'dy-wf-timer full',
      }) as SVGTextElement;
      timer.textContent = `Workflow: ${elapsedLabel(run.started_at)}`;
      timer.dataset.for = n.node_id;
      g.appendChild(timer);
    }
    // Assignee stays on the node face (row 3, opposite the clock) — who owns
    // the node is factual, not decorative, so it is never dropped for styling.
    if (n.assignee) {
      const who = sEl('text', {
        x: NODE_W - 14, y: 62, 'text-anchor': 'end', class: 'dy-wf-assignee',
      }) as SVGTextElement;
      who.textContent = n.assignee;
      g.appendChild(who);
    }

    // Connect port: single, right side, hit area larger than the visual mark.
    const port = sEl('circle', { cx: NODE_W, cy: NODE_H / 2, r: 7, class: 'dy-wf-port' });
    // Invisible larger hit ring so the port stays easy to grab.
    const portHit = sEl('circle', { cx: NODE_W, cy: NODE_H / 2, r: 12, class: 'dy-wf-port-hit' });
    // Only the visible port carries the connect marker; the hit ring is bound
    // directly below, so one element per node answers [data-connect-from].
    portHit.setAttribute('aria-hidden', 'true');
    port.setAttribute('data-connect-from', n.node_id);
    port.setAttribute('tabindex', '0');
    port.setAttribute('aria-label', `Connect from ${n.title}`);
    g.append(portHit, port);

    const dash = () => shape.setAttribute('stroke-dasharray', '4 3');
    const undash = () => shape.removeAttribute('stroke-dasharray');
    // Bind the port directly rather than relying on bubbling hit-testing from
    // the node group. Synthetic pointer events and SVG hit-testing can expose
    // the group as the target even when the pointer is on the port, which
    // incorrectly starts a node drag and loses the connection source.
    for (const target of [port, portHit]) {
      target.addEventListener('pointerdown', (ev) => {
        const e = ev as PointerEvent;
        if (e.button !== 0 || !editable) return;
        e.stopPropagation();
        startConnect(n.node_id, g);
      });
    }
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
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        // Same path as the panel's Delete button: it asks first, and the
        // confirm button takes focus so Enter confirms.
        e.preventDefault();
        openPassport(n, g);
        passport.querySelector<HTMLButtonElement>('[data-wf-delete-step]')?.click();
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
    const timeline = timelineFor(run);
    if (playbackSlider) { playbackSlider.disabled = timeline.length < 2; playbackSlider.max = String(Math.max(0, timeline.length - 1)); playbackSlider.value = String(Math.max(0, playbackIndex ?? timeline.length - 1)); }
    if (playbackButton) { playbackButton.disabled = timeline.length < 2; playbackButton.textContent = playbackIndex === null ? '▶ Play' : '⏸ Pause'; }
    if (playbackLabel) playbackLabel.textContent = playbackIndex === null
      ? (timeline.length ? `Live · ${timeline.length} events` : 'Live')
      : `Event ${playbackIndex + 1}/${timeline.length}`;
    renderList(run);
    // Remember which step had keyboard focus; the rebuilt step gets it back.
    const active = (host.ownerDocument?.activeElement ?? null) as Element | null;
    const focusedId = active && viewport.contains(active) ? (active.closest('.dy-wf-node')?.getAttribute('data-node-id') ?? null) : null;
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
    // Timeline playback uses a read-only derived frame; the live run remains
    // the source of truth and reappears when playback is cleared.
    if (timeline.length > 1 && playbackIndex !== null) {
      const states = new Map<string, string>();
      for (const event of timeline.slice(0, playbackIndex + 1)) states.set(event.node_id, event.to_status);
      currentNodes = currentNodes.map((node) => states.has(node.node_id)
        ? { ...node, status: states.get(node.node_id) ?? node.status }
        : { ...node, status: 'pending' });
    }
    // Lane grouping: the resolved assignment when the run states one, else the
    // shape-derived exception partition (both real — see laneKeyOf). A single
    // band is not a band: bands only render when there are two or more.
    const assignments = currentNodes.some((n) => ((n.team ?? n.phase_team) ?? '').trim());
    const laneOf = assignments
      ? laneKeyOf
      : (n: CanvasNode) => (isExceptionNode(n) ? EXCEPTION_LANE_KEY : 'main-path');
    const mobileLayout = canvasWindow.innerWidth <= 640;
    svg.dataset.mobileLayout = String(mobileLayout);
    previousMobileLayout = mobileLayout;
    let layout = buildLayout(run.nodes, { laneOf, mobile: mobileLayout });
    if (!mobileLayout && layout.lanes.length < 2) layout = buildLayout(run.nodes);
    // Positions come from the frame every time: the layout, then each step's
    // saved position, then any drop whose save has not come back yet. Keeping
    // the previous render's positions instead meant Auto layout (which clears
    // saved positions) left every dragged step where it was (finding 6).
    const positions: Record<string, CanvasPosition> = { ...layout.positions };
    for (const item of run.nodes) {
      if (item.canvas_position) positions[item.node_id] = { ...layout.positions[item.node_id], ...item.canvas_position };
      const pending = pendingPositions.get(item.node_id);
      if (!pending) continue;
      const saved = item.canvas_position;
      if (saved && Math.abs(saved.x - pending.x) < 0.5 && Math.abs(saved.y - pending.y) < 0.5) pendingPositions.delete(item.node_id);
      else positions[item.node_id] = { ...positions[item.node_id], ...pending };
    }
    nodePositions = positions;
    layoutW = layout.width;
    layoutH = layout.height;
    measureWorld();
    const minX = originX;
    const worldW = fullW;

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
    for (const n of currentNodes) {
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
            // Dependency points from upstream `dep` to dependent `n`.
            if (mobileLayout) {
              const x1 = to.x + NODE_W / 2, y1 = to.y + NODE_H;
              const x2 = from.x + NODE_W / 2, y2 = from.y;
              const dy = Math.max(ROW_GAP / 2, Math.abs(y2 - y1) * 0.45);
              return `M ${x1} ${y1} C ${x1} ${y1 + dy}, ${x2} ${y2 - dy}, ${x2} ${y2}`;
            }
            const x1 = to.x + NODE_W, y1 = to.y + NODE_H / 2;
            const x2 = from.x, y2 = from.y + NODE_H / 2;
            const sameBand = Math.abs(y1 - y2) < NODE_H / 2;
            const dx = Math.max(COL_GAP / 2, Math.abs(x2 - x1) * 0.55);
            if (sameBand) {
              const bow = Math.min(46, Math.max(18, dx * 0.35));
              return `M ${x1} ${y1} C ${x1 + dx} ${y1 - bow}, ${x2 - dx} ${y2 - bow}, ${x2} ${y2}`;
            }
            return `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;
          })(),
          // Terminate at the dependent node's left boundary. The arrowhead
          // is part of the connector, so the line remains visibly attached.
          'marker-end': `url(#${depMeaning.marker})`,
        });
        path.dataset.from = dep;
        path.dataset.to = n.node_id;
        path.dataset.sourcePort = mobileLayout ? 'bottom' : 'right';
        path.dataset.targetPort = mobileLayout ? 'top' : 'left';
        viewport.appendChild(path);
        const dot = sEl('circle', { class: 'dy-wf-flowdot', r: 3.2, opacity: 0 });
        viewport.appendChild(dot);
      }
    }
    for (const n of currentNodes) {
      const p = positions[n.node_id];
      viewport.appendChild(buildNode(n, p, run, Boolean(handlers.onEdit)));
    }
    // Keep the selection and keyboard focus on the same step across new data.
    if (selectedId) {
      const g = nodeEl(selectedId);
      if (g) {
        selectedEl = g;
        g.classList.add('dy-wf-selected');
        highlightRoute(selectedId);
      } else closePassport();
    }
    if (focusedId) nodeEl(focusedId)?.focus();
    // Camera: fit once, when the canvas first has a size; after that only the
    // person moves it, except to bring a newly added step into view.
    const ids = currentNodes.map((n) => n.node_id);
    const added = renderedIds.size ? ids.filter((id) => !renderedIds.has(id)) : [];
    renderedIds = new Set(ids);
    const { w, h } = viewSize();
    const outOfView = (p: CanvasPosition | undefined) => Boolean(p) && (
      panX + p!.x * zoom < 0 || panY + p!.y * zoom < 0
      || panX + (p!.x + NODE_W) * zoom > w || panY + (p!.y + NODE_H) * zoom > h);
    if (!cameraSet) {
      fitView();
      cameraSet = svg.clientWidth > 0;
    } else if (added.some((id) => outOfView(positions[id]))) {
      fitView();
    } else {
      apply();
      updateMinimap();
    }
  };

  // ---- minimap ----
  const updateMinimap = () => {
    minimap.replaceChildren(miniViewport);
    if (fullW <= 0) return;
    const s = Math.min(170 / fullW, 104 / fullH);
    const { w: viewW, h: viewH } = viewSize();
    const vx = (0 - panX) / zoom - originX;
    const vy = (0 - panY) / zoom - originY;
    const vw = viewW / zoom;
    const vh = viewH / zoom;
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
    if (fullW <= 0) return;
    const s = Math.min(170 / fullW, 104 / fullH);
    // Centre the view on the clicked point of the world (the minimap draws the
    // world from its top-left corner, originX/originY).
    const wx = originX + (ev.clientX - r.left) / s;
    const wy = originY + (ev.clientY - r.top) / s;
    const { w, h } = viewSize();
    panX = w / 2 - wx * zoom;
    panY = h / 2 - wy * zoom;
    cameraSet = true;
    apply();
    updateMinimap();
  });

  // ---- passport with lazy expansion ----
  let lastFrames: CanvasRun[] = [];
  let selectedEl: SVGGElement | null = null;
  let playbackIndex: number | null = null;
  const nodeEl = (id: string): SVGGElement | null =>
    [...viewport.querySelectorAll<SVGGElement>('.dy-wf-node')].find((g) => g.getAttribute('data-node-id') === id) ?? null;
  // Selection owns a route highlight: unrelated nodes/connectors dim, while
  // upstream and downstream dependency edges stay readable. This is derived
  // from the same canonical depends_on graph; no visual-only relationships.
  const highlightRoute = (id: string) => {
    const related = new Set<string>([id]);
    const byId = new Map(currentNodes.map((node) => [node.node_id, node]));
    const walkUp = (nid: string) => { for (const dep of byId.get(nid)?.depends_on ?? []) if (!related.has(dep)) { related.add(dep); walkUp(dep); } };
    const walkDown = (nid: string) => { for (const node of currentNodes) if (node.depends_on.includes(nid) && !related.has(node.node_id)) { related.add(node.node_id); walkDown(node.node_id); } };
    walkUp(id); walkDown(id);
    viewport.querySelectorAll<SVGGElement>('.dy-wf-node').forEach((node) => node.classList.toggle('dy-wf-route-dim', !related.has(node.getAttribute('data-node-id') ?? '')));
    viewport.querySelectorAll<SVGPathElement>('.dy-wf-edge').forEach((edge) => edge.classList.toggle('dy-wf-route-edge', related.has(edge.dataset.from ?? '') && related.has(edge.dataset.to ?? '')));
  };
  const openPassport = (n: CanvasNode, g?: SVGGElement | null) => {
    // unmistakable selection: clear previous, mark current
    if (selectedEl) selectedEl.classList.remove('dy-wf-selected');
    selectedEl = g ?? null;
    if (selectedEl) selectedEl.classList.add('dy-wf-selected');
    selectedId = n.node_id;
    handlers.onSelect?.(n.node_id);
    highlightRoute(n.node_id);
    passport.replaceChildren();
    const status = n.status ?? 'pending';
    // Header: kind + status on one line, title below, close top-right.
    const head = elu<HTMLDivElement>('div', 'dy-wf-pp-head');
    const meta = elu<HTMLDivElement>('div', 'dy-wf-pp-meta');
    meta.append(elu('span', 'dy-wf-passport-kind', PURPOSE_VISUALS[nodePurpose(n)].label), elu('span', `badge ${status}`, status));
    const close = elu<HTMLButtonElement>('button', 'dy-wf-passport-close', '×');
    close.type = 'button';
    close.setAttribute('aria-label', 'Close step details');
    close.addEventListener('click', () => closePassport());
    head.append(meta, elu('h3', '', n.title), close);
    passport.appendChild(head);
    // Facts: one key/value list instead of loose dim paragraphs.
    const facts = elu<HTMLDListElement>('dl', 'dy-wf-pp-facts');
    const fact = (k: string, v: string, cls = '') => {
      const row = elu<HTMLDivElement>('div', `dy-wf-pp-fact ${cls}`.trim());
      row.append(elu('dt', '', k), elu('dd', '', v));
      facts.appendChild(row);
      return row;
    };
    // P8.3: last-confirmed update for the run (not a node-level claim).
    const updated = lastRun?.updated_at ?? null;
    const lastConfirmed = fact('Last confirmed update', updated && isFinite(Date.parse(updated)) ? updated.replace('T', ' ').slice(0, 16) + ' UTC' : 'unknown', 'dy-wf-last-confirmed');
    lastConfirmed.setAttribute('data-last-confirmed', updated ?? 'unknown');
    if (n.depends_on.length) fact('Depends on', n.depends_on.join(', '));
    if (n.assignee) fact('Assignee', n.assignee);
    if (n.evidence_refs.length) fact('Evidence', n.evidence_refs.join(', '));
    if (n.task_ref) fact('Work item', n.task_ref);
    passport.appendChild(facts);
    const nodeEvents = (lastRun?.timeline ?? []).filter((event) => event.node_id === n.node_id);
    if (nodeEvents.length) {
      passport.appendChild(elu('h4', '', 'Status history'));
      const history = elu('ol', 'dy-wf-node-history');
      for (const event of nodeEvents.slice(-6)) history.appendChild(elu('li', '', `${event.from_status ?? '—'} → ${event.to_status}`));
      passport.appendChild(history);
    }
    // Editing sits last, in its own section, so reading never competes with it.
    const appendEditor = () => {
      if (!handlers.onEdit) return;
      const edit = elu<HTMLDivElement>('div', 'dy-wf-edit');
      edit.appendChild(elu('h4', '', 'Edit step'));
      // Edit the saved plan's copy of the step: a run on screen may show an
      // older title or links (finding 14).
      const planned = editBase().find((item) => item.node_id === n.node_id);
      if (!planned) {
        edit.appendChild(elu('p', 'dy-wf-pp-note', 'This step is not in the latest version of the workflow, so it cannot be edited here.'));
        passport.appendChild(edit);
        return;
      }
      // Why a save or delete failed, in the panel where it was asked for
      // (finding 10: a failed save only said "Save failed — retry").
      const problem = elu<HTMLParagraphElement>('p', 'dy-wf-pp-error');
      problem.setAttribute('role', 'alert');
      problem.hidden = true;
      const say = (text: string | null) => { problem.textContent = text ?? ''; problem.hidden = !text; };
      const field = (label: string, input: HTMLInputElement) => {
        const f = elu<HTMLLabelElement>('label', 'dy-wf-field');
        f.append(elu('span', '', label), input);
        edit.appendChild(f);
      };
      const title = elu<HTMLInputElement>('input', 'dy-wf-edit-title'); title.value = planned.title; title.setAttribute('aria-label', 'Node title');
      const deps = elu<HTMLInputElement>('input', 'dy-wf-edit-deps'); deps.value = planned.depends_on.join(', '); deps.placeholder = 'e.g. build, tests'; deps.setAttribute('aria-label', 'Dependencies');
      const team = elu<HTMLInputElement>('input', 'dy-wf-edit-team'); team.value = planned.phase_team ?? ''; team.placeholder = 'phase team override'; team.setAttribute('aria-label', 'Phase team override');
      field('Title', title); field('Depends on (step IDs)', deps); field('Phase team', team);
      const save = elu<HTMLButtonElement>('button', 'dy-btn primary', 'Save graph version'); save.type = 'button';
      save.addEventListener('click', async () => {
        const ids = new Set(deps.value.split(',').map((v) => v.trim()).filter(Boolean)); ids.delete(n.node_id);
        save.disabled = true; save.textContent = 'Saving…'; say(null);
        try {
          await runEdit((base) => (base.some((item) => item.node_id === n.node_id)
            ? base.map((item) => (item.node_id === n.node_id ? { ...item, title: title.value.trim() || item.title, depends_on: [...ids], phase_team: team.value.trim() || null } : item))
            : NOT_IN_PLAN));
          save.textContent = 'Saved ✓';
        } catch (error) {
          save.disabled = false; save.textContent = 'Save failed — retry';
          say(`Couldn't save: ${errorText(error)}`);
        }
      });
      // Delete (finding 3: there was no way to remove a step). Asks first; the
      // steps after it are re-linked to the steps before it.
      const remove = elu<HTMLButtonElement>('button', 'dy-btn danger', 'Delete step'); remove.type = 'button';
      remove.dataset.wfDeleteStep = n.node_id;
      const confirmRow = elu<HTMLDivElement>('div', 'dy-wf-delete-confirm');
      confirmRow.hidden = true;
      remove.addEventListener('click', () => {
        say(null);
        const verdict = deletePlan(editBase(), n.node_id);
        if (typeof verdict === 'string') { confirmRow.hidden = true; say(verdict); return; }
        const base = editBase();
        const titleOf = (id: string) => `"${base.find((item) => item.node_id === id)?.title ?? id}"`;
        const target = base.find((item) => item.node_id === n.node_id)!;
        const followers = base.some((item) => item.depends_on.includes(n.node_id));
        const effect = !followers ? ''
          : target.depends_on.length ? ` The steps after it will follow ${target.depends_on.map(titleOf).join(' and ')} instead.`
            : ' The steps after it will no longer wait for it.';
        const yes = elu<HTMLButtonElement>('button', 'dy-btn danger', 'Delete'); yes.type = 'button';
        yes.dataset.wfDeleteConfirm = n.node_id;
        const no = elu<HTMLButtonElement>('button', 'dy-btn', 'Cancel'); no.type = 'button';
        confirmRow.replaceChildren(elu('p', '', `Delete "${target.title}"?${effect}`), yes, no);
        confirmRow.hidden = false;
        no.addEventListener('click', () => { confirmRow.hidden = true; remove.focus(); });
        yes.addEventListener('click', async () => {
          yes.disabled = true; no.disabled = true;
          try {
            await runEdit((latest) => deletePlan(latest, n.node_id));
            closePassport();
          } catch (error) {
            yes.disabled = false; no.disabled = false;
            say(`Couldn't delete: ${errorText(error)}`);
          }
        });
        yes.focus();
      });
      const actions = elu<HTMLDivElement>('div', 'dy-wf-edit-actions');
      actions.append(save, remove);
      edit.append(actions, confirmRow, problem);
      passport.appendChild(edit);
    };
    if (n.task_ref) {
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
        const unsupported = elu('p', 'dy-wf-unsupported dy-wf-pp-note',
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
      passport.appendChild(elu('p', 'dy-wf-pp-note', 'No canonical work bound to this step yet.'));
    }
    appendEditor();
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
    host.classList.add('dy-wf-panning');
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
    const { sx, sy } = screenScale();
    panX += (ev.clientX - lastX) / sx;
    panY += (ev.clientY - lastY) / sy;
    lastX = ev.clientX;
    lastY = ev.clientY;
    cameraSet = true;
    apply();
    updateMinimap();
  });
  svg.addEventListener('pointerup', (e) => {
    // Drag release: one path, same function the node handler calls, so a
    // release can never be handled twice or leave the drag half-finished.
    if (dragSession) {
      endDragSession(e as PointerEvent, true);
      dragging = false;
      host.classList.remove('dy-wf-panning');
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
    host.classList.remove('dy-wf-panning');
    try {
      svg.releasePointerCapture((e as PointerEvent).pointerId);
    } catch {
      /* noop */
    }
  });
  let wheelSettle: ReturnType<typeof setTimeout> | null = null;
  svg.addEventListener('wheel', (e) => {
    e.preventDefault();
    const ev = e as WheelEvent;
    const rect = svg.getBoundingClientRect();
    const { sx, sy } = screenScale();
    const cx = (ev.clientX - rect.left) / sx;
    const cy = (ev.clientY - rect.top) / sy;
    cameraSet = true;
    host.classList.add('dy-wf-panning');
    if (wheelSettle) clearTimeout(wheelSettle);
    wheelSettle = setTimeout(() => host.classList.remove('dy-wf-panning'), 160);
    const factor = ev.deltaY < 0 ? ZOOM_IN : ZOOM_OUT;
    const next = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, zoom * factor));
    const k = next / zoom;
    panX = cx - (cx - panX) * k;
    panY = cy - (cy - panY) * k;
    zoom = next;
    apply();
    updateMinimap();
  }, { passive: false });

  const closePassport = () => {
    passport.replaceChildren();
    if (selectedEl) selectedEl.classList.remove('dy-wf-selected');
    selectedEl = null;
    if (selectedId !== null) {
      selectedId = null;
      handlers.onSelect?.(null);
    }
    clearRoute();
  };
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') closePassport();
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
  let lastTimelineCount = 0;
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
      .then(async (runs) => {
        if (disposed || ticket < appliedTicket) return;
        appliedTicket = ticket;
        const latest = runs && runs.length ? runs[0] : null;
        if (latest?.run_key && latest.status !== 'definition' && handlers.fetchTimeline) {
          try {
            const history = await handlers.fetchTimeline(projectId, runName, latest.run_key);
            latest.timeline = (history.events ?? []).map((event) => ({
              seq: Number(event.seq ?? 0), node_id: String(event.node_id),
              from_status: event.from_status == null ? null : String(event.from_status),
              to_status: String(event.to_status ?? 'pending'), ts: event.ts == null ? undefined : String(event.ts),
            }));
          } catch { /* keep the run frame; stale indicator covers poll failure */ }
        }
        const sig = JSON.stringify(latest?.nodes.map((n) => [n.node_id, n.status]) ?? []);
        if (latest?.timeline?.length && latest.timeline.length > lastTimelineCount) {
          feedLog(`Run timeline: ${latest.timeline.length} observed events`);
          lastTimelineCount = latest.timeline.length;
        }
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
          playbackIndex = null;
          // A new frame carries whatever was last saved.
          optimisticBase = null;
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
  // Resizing keeps the camera (the drawing stays where it is) unless the
  // layout flips between phone and desktop, which moves every step.
  const onResize = () => {
    if (disposed || !lastRun) return;
    if ((canvasWindow.innerWidth <= 640) !== previousMobileLayout) {
      cameraSet = false;
      render(lastRun);
    } else if (!cameraSet) {
      fitView();
      cameraSet = svg.clientWidth > 0;
    } else updateMinimap();
  };
  canvasWindow.addEventListener('resize', onResize);
  // The host can change width without a window resize (the library sidebar
  // collapsing). Re-render on real host width changes only.
  let lastHostWidth = host.clientWidth;
  let resizeFrame = 0;
  const RO = (canvasWindow as unknown as { ResizeObserver?: typeof ResizeObserver }).ResizeObserver;
  const hostObserver = RO ? new RO(() => {
    const w = host.clientWidth;
    if (w === lastHostWidth) return;
    lastHostWidth = w;
    if (resizeFrame) canvasWindow.cancelAnimationFrame(resizeFrame);
    resizeFrame = canvasWindow.requestAnimationFrame(() => { resizeFrame = 0; onResize(); });
  }) : null;
  hostObserver?.observe(host);

  disposers.push(() => {
    disposed = true;
    if (timer) clearInterval(timer);
    if (flowTimer) clearInterval(flowTimer);
    clearInterval(clockTimer);
    document.removeEventListener('keydown', onKeyDown);
    document.removeEventListener('visibilitychange', onVisibility);
    canvasWindow.removeEventListener('resize', onResize);
    hostObserver?.disconnect();
    if (resizeFrame) canvasWindow.cancelAnimationFrame(resizeFrame);
    host.replaceChildren();
  });
  const dispose = () => {
    disposers.forEach((d) => d());
    disposers = [];
  };
  return Object.assign(dispose, { refresh: () => { if (!disposed) pollOnce(); } });
}