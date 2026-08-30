// Read-only workflow node canvas: pure SVG, vanilla TS, zero deps.
// agenttrail patterns: pan / cursor-centered zoom / minimap / node passports.
// No node editing, no palette, no drag-repositioning (matches roadmap rule:
// saved views are presentation-only; workflows are manually started).
//
// IMPORTANT (locked constraint): no innerHTML / eval / localStorage / sessionStorage.
// All DOM built with createElement + textContent + listeners only.

export interface CanvasNode {
  node_id: string;
  title: string;
  depends_on: string[];
  human_gate: boolean;
  task_ref: string | null;
  kind: 'task' | 'gate';
  status: string | null; // done | working | blocked | pending | null
  assignee: string | null;
  evidence_refs: string[];
}

export interface CanvasRun {
  run_key: string;
  version: number;
  status: string;
  started_at: string | null;
  updated_at: string | null;
  nodes: CanvasNode[];
}

const NODE_W = 180;
const NODE_H = 64;
const COL_GAP = 80;
const ROW_GAP = 28;
const PAD = 40;
const ZOOM_MIN = 0.45;
const ZOOM_MAX = 1.8;

// Pure deterministic layout: x by dependency depth (longest path), y by order.
// Exported for unit testing without a DOM.
export function buildLayout(nodes: CanvasNode[]): {
  positions: Record<string, { x: number; y: number; depth: number }>;
  width: number;
  height: number;
} {
  const byId = new Map(nodes.map((n) => [n.node_id, n]));
  const depth = new Map<string, number>();
  const visiting = new Set<string>();

  const computeDepth = (id: string): number => {
    if (depth.has(id)) return depth.get(id)!;
    if (visiting.has(id)) return 0; // break cycles deterministically
    visiting.add(id);
    const n = byId.get(id);
    let d = 0;
    for (const dep of n?.depends_on ?? []) {
      d = Math.max(d, computeDepth(dep) + 1);
    }
    visiting.delete(id);
    depth.set(id, d);
    return d;
  };
  for (const n of nodes) computeDepth(n.node_id);

  const maxDepth = Math.max(0, ...[...depth.values()]);
  const perDepth: Record<number, number> = {};
  const positions: Record<string, { x: number; y: number; depth: number }> = {};
  for (const n of nodes) {
    const d = depth.get(n.node_id) ?? 0;
    const row = perDepth[d] ?? 0;
    perDepth[d] = row + 1;
    positions[n.node_id] = {
      x: PAD + d * (NODE_W + COL_GAP),
      y: PAD + row * (NODE_H + ROW_GAP),
      depth: d,
    };
  }
  const width = PAD * 2 + (maxDepth + 1) * (NODE_W + COL_GAP) - COL_GAP;
  const rows = Math.max(1, ...Object.values(perDepth));
  const height = PAD * 2 + rows * (NODE_H + ROW_GAP) - ROW_GAP;
  return { positions, width, height };
}

const STATUS_CLASS: Record<string, string> = {
  done: 'dy-wf-done',
  working: 'dy-wf-working',
  blocked: 'dy-wf-blocked',
  pending: 'dy-wf-pending',
};

function statusClass(n: CanvasNode): string {
  return STATUS_CLASS[n.status ?? 'pending'] ?? 'dy-wf-pending';
}

function svgEl(tag: string, attrs: Record<string, string | number>): SVGElement {
  const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
  return el;
}

function textEl(tag: string, cls: string, text: string): HTMLElement {
  const el = document.createElement(tag);
  if (cls) el.className = cls;
  el.textContent = text;
  return el;
}

export interface CanvasHandlers {
  onApprove: (taskRef: string) => Promise<unknown> | void;
  onReject: (taskRef: string) => Promise<unknown> | void;
}

// Mounts the canvas into `host`. Polls `fetchRuns` every `pollMs` while mounted.
// Returns a dispose function (clears timers + listeners).
export function mountWorkflowCanvas(
  host: HTMLElement,
  projectId: string,
  runName: string,
  fetchRuns: () => Promise<CanvasRun[]>,
  handlers: CanvasHandlers,
  pollMs = 8000,
): () => void {
  host.replaceChildren();
  host.className = 'dy-wf';

  const wrap = document.createElement('div');
  wrap.className = 'dy-wf-wrap';
  const svg = svgEl('svg', { class: 'dy-wf-svg' }) as SVGSVGElement;
  const viewport = svgEl('g', { class: 'dy-wf-viewport' }) as SVGGElement;
  svg.appendChild(viewport);

  const minimap = svgEl('svg', {
    class: 'dy-wf-minimap',
    width: 160,
    height: 100,
  }) as SVGSVGElement;
  const miniViewport = svgEl('rect', {
    class: 'dy-wf-mini-view',
  }) as SVGRectElement;
  minimap.appendChild(miniViewport);

  const passport = document.createElement('aside');
  passport.className = 'dy-wf-passport';
  passport.setAttribute('aria-live', 'polite');

  wrap.append(svg, minimap, passport);
  host.appendChild(wrap);

  let panX = 0;
  let panY = 0;
  let zoom = 1;
  let fullW = 0;
  let fullH = 0;
  let currentNodes: CanvasNode[] = [];

  const applyTransform = () => {
    viewport.setAttribute(
      'transform',
      `translate(${panX} ${panY}) scale(${zoom})`,
    );
  };

  const render = (run: CanvasRun | null) => {
    viewport.replaceChildren();
    if (!run || run.nodes.length === 0) {
      viewport.appendChild(
        svgEl('text', { x: 20, y: 40, class: 'dy-wf-empty' }),
      );
      (viewport.lastChild as SVGTextElement).textContent = 'No workflow nodes.';
      return;
    }
    currentNodes = run.nodes;
    const { positions, width, height } = buildLayout(run.nodes);
    fullW = width;
    fullH = height;
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);

    // edges first (under nodes)
    for (const n of run.nodes) {
      const from = positions[n.node_id];
      for (const dep of n.depends_on) {
        const to = positions[dep];
        if (!from || !to) continue;
        const path = svgEl('path', {
          class: 'dy-wf-edge',
          d: `M ${to.x + NODE_W} ${to.y + NODE_H / 2} L ${from.x} ${from.y + NODE_H / 2}`,
        });
        viewport.appendChild(path);
      }
    }
    // nodes
    for (const n of run.nodes) {
      const p = positions[n.node_id];
      const g = svgEl('g', {
        class: `dy-wf-node ${statusClass(n)}`,
        transform: `translate(${p.x} ${p.y})`,
      }) as SVGGElement;
      g.setAttribute('tabindex', '0');
      g.setAttribute('role', 'button');
      g.setAttribute(
        'aria-label',
        `${n.kind === 'gate' ? 'Gate' : 'Task'}: ${n.title} (${n.status ?? 'pending'})`,
      );
      const rect = svgEl('rect', {
        width: NODE_W,
        height: NODE_H,
        rx: 8,
        class: 'dy-wf-rect',
      });
      const label = svgEl('text', {
        x: 12,
        y: 26,
        class: 'dy-wf-label',
      }) as SVGTextElement;
      label.textContent = n.title.slice(0, 22);
      const sub = svgEl('text', {
        x: 12,
        y: 46,
        class: 'dy-wf-sub',
      }) as SVGTextElement;
      sub.textContent =
        (n.kind === 'gate' ? 'GATE · ' : '') + String(n.status ?? 'pending');
      g.append(rect, label, sub);
      const open = () => openPassport(n);
      g.addEventListener('click', open);
      g.addEventListener('keydown', (e) => {
        if ((e as KeyboardEvent).key === 'Enter') open();
      });
      viewport.appendChild(g);
    }
    applyTransform();
  };

  const openPassport = (n: CanvasNode) => {
    passport.replaceChildren();
    passport.appendChild(textEl('h3', '', n.title));
    passport.appendChild(
      textEl('p', 'dy-dim', `${n.kind === 'gate' ? 'Gate' : 'Task'} · ${n.status ?? 'pending'}`),
    );
    if (n.assignee) passport.appendChild(textEl('p', '', `Assignee: ${n.assignee}`));
    if (n.evidence_refs.length) {
      passport.appendChild(textEl('p', 'dy-dim', 'Evidence:'));
      const ul = document.createElement('ul');
      for (const e of n.evidence_refs) ul.appendChild(textEl('li', '', e));
      passport.appendChild(ul);
    }
    if (n.task_ref) {
      passport.appendChild(
        textEl('p', 'dy-dim', `Deep link: ${n.task_ref}`),
      );
      if (n.kind === 'gate' && n.status !== 'done') {
        const row = document.createElement('div');
        row.className = 'dy-wf-actions';
        const approve = document.createElement('button');
        approve.className = 'dy-btn primary';
        approve.textContent = 'Approve';
        approve.addEventListener('click', async () => {
          approve.disabled = true;
          try {
            await handlers.onApprove(n.task_ref as string);
            approve.textContent = 'Approved';
          } catch (e) {
            approve.disabled = false;
            approve.textContent = `Failed: ${String(e).slice(0, 40)}`;
          }
        });
        const reject = document.createElement('button');
        reject.className = 'dy-btn';
        reject.textContent = 'Reject';
        reject.addEventListener('click', async () => {
          reject.disabled = true;
          try {
            await handlers.onReject(n.task_ref as string);
            reject.textContent = 'Rejected';
          } catch (e) {
            reject.disabled = false;
            reject.textContent = `Failed: ${String(e).slice(0, 40)}`;
          }
        });
        row.append(approve, reject);
        passport.appendChild(row);
      }
    }
  };

  // pan
  let dragging = false;
  let lastX = 0;
  let lastY = 0;
  svg.addEventListener('pointerdown', (e) => {
    dragging = true;
    lastX = (e as PointerEvent).clientX;
    lastY = (e as PointerEvent).clientY;
    svg.setPointerCapture((e as PointerEvent).pointerId);
  });
  svg.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const ev = e as PointerEvent;
    panX += ev.clientX - lastX;
    panY += ev.clientY - lastY;
    lastX = ev.clientX;
    lastY = ev.clientY;
    applyTransform();
    updateMinimap();
  });
  svg.addEventListener('pointerup', (e) => {
    dragging = false;
    try {
      svg.releasePointerCapture((e as PointerEvent).pointerId);
    } catch {
      /* noop */
    }
  });

  // cursor-centered zoom
  const zoomAt = (factor: number, cx: number, cy: number) => {
    const next = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, zoom * factor));
    const k = next / zoom;
    panX = cx - (cx - panX) * k;
    panY = cy - (cy - panY) * k;
    zoom = next;
    applyTransform();
    updateMinimap();
  };
  svg.addEventListener('wheel', (e) => {
    e.preventDefault();
    const ev = e as WheelEvent;
    const rect = svg.getBoundingClientRect();
    const cx = ev.clientX - rect.left;
    const cy = ev.clientY - rect.top;
    zoomAt(ev.deltaY < 0 ? 1.1 : 0.9, cx, cy);
  }, { passive: false });

  const updateMinimap = () => {
    minimap.replaceChildren(miniViewport);
    // scale full content into 160x100
    const sx = 160 / Math.max(1, fullW);
    const sy = 100 / Math.max(1, fullH);
    const s = Math.min(sx, sy);
    miniViewport.setAttribute('x', String(-panX * s));
    miniViewport.setAttribute('y', String(-panY * s));
    miniViewport.setAttribute('width', String(svg.clientWidth * s * zoom));
    miniViewport.setAttribute('height', String(svg.clientHeight * s * zoom));
    for (const n of currentNodes) {
      const { positions } = buildLayout(currentNodes);
      const p = positions[n.node_id];
      const dot = svgEl('rect', {
        x: p.x * s,
        y: p.y * s,
        width: NODE_W * s,
        height: NODE_H * s,
        class: `dy-wf-mini ${statusClass(n)}`,
      });
      minimap.appendChild(dot);
    }
  };
  minimap.addEventListener('click', (e) => {
    const ev = e as MouseEvent;
    const rect = minimap.getBoundingClientRect();
    const fx = (ev.clientX - rect.left) / 160;
    const fy = (ev.clientY - rect.top) / 100;
    const targetX = fx * fullW;
    const targetY = fy * fullH;
    panX = svg.clientWidth / 2 - targetX * zoom;
    panY = svg.clientHeight / 2 - targetY * zoom;
    applyTransform();
    updateMinimap();
  });

  let timer: ReturnType<typeof setInterval> | null = null;
  const poll = () => {
    fetchRuns()
      .then((runs) => {
        const latest = runs && runs.length ? runs[0] : null;
        render(latest);
        updateMinimap();
      })
      .catch(() => {
        /* keep last good frame; poll again later */
      });
  };
  poll();
  if (pollMs > 0) timer = setInterval(poll, pollMs);

  return () => {
    if (timer) clearInterval(timer);
    host.replaceChildren();
  };
}
