// Read-only workflow node canvas: pure SVG, vanilla TS, zero deps.
// v3 mechanic set ported from the validated preview:
//   - event-driven frame updates (state changes only when events/polls arrive)
//   - LOD tiers via data-lod: map (<0.75) / read / full (>1.4)  [archify]
//   - dependency arrows with heads + dashed links edges        [agenttrail]
//   - hover intent preview (dashed) before click-focus         [archify]
//   - just-touched decay accents on activity                   [agenttrail]
//   - Semantic Passport with expandable live thread + sub-tasks [agenttrail expansion]
// No node editing, no palette, no drag-repositioning (roadmap: presentation-only).
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

import {
  buildActivityThread,
  buildTaskListMini,
} from './components/live-detail';

export interface ExpansionData {
  children: Array<{ ref: string; title: string; status?: string | null }>;
  history: Array<{ ts?: string | number | null; text: string }>;
}

export interface CanvasHandlers {
  onApprove: (taskRef: string) => Promise<unknown> | void;
  onReject: (taskRef: string) => Promise<unknown> | void;
  // Lazy-expansion hook: app.ts backs this with GET /work-items/{ref}
  // (children -> TaskListMini, history -> ActivityThread). May return null
  // for nodes without a task_ref; the passport degrades to factuals only.
  onExpand?: (taskRef: string) => Promise<ExpansionData | null>;
}

const NODE_W = 190;
const NODE_H = 64;
const COL_GAP = 95;
const ROW_GAP = 26;
const PAD = 60;
const ZOOM_MIN = 0.45;
const ZOOM_MAX = 1.8;
const LOD_FULL = 1.4;
const ZOOM_IN = 1.1;
const ZOOM_OUT = 0.9;

const statusColor = (s: string | null): string =>
  s === 'done' ? '#3fb950' : s === 'working' ? '#d29922' : s === 'blocked' ? '#f85149' : '#6e7681';

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

// ---- buildLayout: pure, exported for tests ----
export function buildLayout(nodes: CanvasNode[]): {
  positions: Record<string, { x: number; y: number; depth: number }>;
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
  return {
    positions,
    width: PAD * 2 + (maxDepth + 1) * (NODE_W + COL_GAP) - COL_GAP,
    height: PAD * 2 + rows * (NODE_H + ROW_GAP) - ROW_GAP,
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
  host.className = 'dy-wf';

  const wrap = elu<HTMLDivElement>('div', 'dy-wf-wrap');
  const svg = sEl('svg', { class: 'dy-wf-svg' }) as SVGSVGElement;
  svg.setAttribute('data-lod', 'read');
  const viewport = sEl('g', { class: 'dy-wf-viewport' }) as SVGGElement;
  svg.appendChild(viewport);

  // minimap: authored bounds + live camera (archify radar principle)
  const minimap = sEl('svg', { class: 'dy-wf-minimap', width: 170, height: 104 }) as SVGSVGElement;
  const miniViewport = sEl('rect', { class: 'dy-wf-mini-view' }) as SVGRectElement;
  minimap.appendChild(miniViewport);

  const passport = elu<HTMLDivElement>('div', 'dy-wf-passport');
  passport.setAttribute('aria-live', 'polite');

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

  wrap.append(svg, feed, minimap, passport);
  host.appendChild(wrap);

  // camera state
  let panX = 0;
  let panY = 0;
  let zoom = 1;
  let fullW = 0;
  let fullH = 0;
  let currentNodes: CanvasNode[] = [];
  let disposers: Array<() => void> = [];

  const apply = () => {
    viewport.setAttribute('transform', `translate(${panX} ${panY}) scale(${zoom})`);
    svg.setAttribute('data-lod', zoom > LOD_FULL ? 'full' : zoom < 0.75 ? 'map' : 'read');
  };

  // ---- defs: arrow markers (inert) ----
  const defs = sEl('defs', {});
  const mkMarker = (id: string, fill: string) => {
    const m = sEl('marker', {
      id,
      viewBox: '0 0 10 10',
      refX: '9',
      refY: '5',
      markerWidth: '7',
      markerHeight: '7',
      orient: 'auto-start-reverse',
    });
    m.appendChild(sEl('path', { d: 'M 0 0 L 10 5 L 0 10 z', fill }));
    return m;
  };
  defs.appendChild(mkMarker('dyArrowActive', '#58a6ff'));
  defs.appendChild(mkMarker('dyArrowDim', '#3d4657'));
  svg.appendChild(defs);

  // ---- render frame (event-driven: called on poll arrival / state delta) ----
  const render = (run: CanvasRun | null) => {
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
        const path = sEl('path', {
          class: `dy-wf-edge`,
          d: `M ${to.x + NODE_W} ${to.y + NODE_H / 2} C ${to.x + NODE_W + COL_GAP / 2} ${to.y + NODE_H / 2}, ${from.x - COL_GAP / 2} ${from.y + NODE_H / 2}, ${from.x - 6} ${from.y + NODE_H / 2}`,
          'marker-end': 'url(#dyArrowDim)',
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
      const g = sEl('g', {
        class: `dy-wf-node ${n.status ?? 'pending'}`,
        transform: `translate(${p.x} ${p.y})`,
      }) as SVGGElement;
      g.setAttribute('tabindex', '0');
      g.setAttribute('role', 'button');
      g.setAttribute(
        'aria-label',
        `${n.kind === 'gate' ? 'Gate' : 'Task'}: ${n.title} (${n.status ?? 'pending'})`,
      );
      const rect = sEl('rect', { width: NODE_W, height: NODE_H, rx: 9, class: 'dy-wf-rect' });
      const label = sEl('text', { x: 12, y: 25, class: 'dy-wf-label' }) as SVGTextElement;
      label.textContent = n.title.slice(0, 24);
      const sub = sEl('text', { x: 12, y: 44, class: 'dy-wf-sub' }) as SVGTextElement;
      sub.textContent = (n.kind === 'gate' ? 'GATE · ' : '') + (n.status ?? 'pending') + (n.assignee ? ' · ' + n.assignee : '');
      // Per-node elapsed clock — ONLY on working nodes (was: empty timer on all).
      // Base = run.updated_at (or poll time for new frames); ticks in the flow loop.
      let timer: SVGTextElement | null = null;
      if (n.status === 'working') {
        timer = sEl('text', {
          x: NODE_W - 12,
          y: 25,
          'text-anchor': 'end',
          class: 'dy-wf-timer full',
        }) as SVGTextElement;
        timer.textContent = '00:00';
        timer.dataset.for = n.node_id;
      }
      if (timer) g.append(rect, label, sub, timer);
      else g.append(rect, label, sub);
      const dash = () => rect.setAttribute('stroke-dasharray', '4 3');
      const undash = () => rect.removeAttribute('stroke-dasharray');
      g.addEventListener('pointerenter', dash); // intent preview [archify]
      g.addEventListener('pointerleave', () => {
        if (!g.classList.contains('dy-wf-selected')) undash();
      });
      const open = () => openPassport(n, g);
      g.addEventListener('click', open);
      g.addEventListener('keydown', (e) => {
        if ((e as KeyboardEvent).key === 'Enter') open();
      });
      viewport.appendChild(g);
    }
    apply();
    updateMinimap();
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
      const { positions } = buildLayout(currentNodes);
      const p = positions[n.node_id];
      const dot = sEl('rect', {
        x: p.x * s,
        y: p.y * s,
        width: Math.max(3, NODE_W * s),
        height: Math.max(2, NODE_H * s),
        fill: statusColor(n.status),
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
  const openPassport = (n: CanvasNode, g?: SVGGElement) => {
    // unmistakable selection: clear previous, mark current
    if (selectedEl) selectedEl.classList.remove('dy-wf-selected');
    selectedEl = g ?? null;
    if (selectedEl) selectedEl.classList.add('dy-wf-selected');
    passport.replaceChildren();
    passport.appendChild(elu('h3', '', n.title));
    passport.appendChild(elu('span', `badge ${n.status ?? 'pending'}`, n.status ?? 'pending'));
    if (n.assignee) passport.appendChild(elu('p', 'dy-dim', `assignee: ${n.assignee}`));
    if (n.evidence_refs.length) {
      const p = elu('p', 'dy-dim', 'evidence: ' + n.evidence_refs.join(', '));
      passport.appendChild(p);
    }
    if (n.task_ref) {
      passport.appendChild(elu('p', 'dy-dim', `deep link: ${n.task_ref}`));
      if (n.kind === 'gate' && n.status !== 'done' && n.status !== 'blocked') {
        const row = elu('div', 'dy-wf-actions');
        const approve = elu<HTMLButtonElement>('button', 'dy-btn primary', 'Approve');
        const reject = elu<HTMLButtonElement>('button', 'dy-btn', 'Reject');
        approve.addEventListener('click', async () => {
          approve.disabled = true;
          reject.disabled = true;
          approve.textContent = 'Approved ✓';
          await handlers.onApprove(n.task_ref as string);
        });
        reject.addEventListener('click', async () => {
          reject.disabled = true;
          approve.disabled = true;
          reject.textContent = 'Rejected ✕';
          await handlers.onReject(n.task_ref as string);
        });
        row.append(approve, reject);
        passport.appendChild(row);
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
                body.appendChild(elu('h4', '', 'Activity'));
                body.appendChild(
                  buildThread(data.history.map((h) => ({ ts: h.ts, text: h.text }))),
                );
                body.appendChild(elu('h4', '', 'Sub-tasks'));
                body.appendChild(
                  buildTasks(
                    data.children.map((c) => ({ ref: c.ref, title: c.title, status: c.status })),
                    (ref) => passport.dispatchEvent(new CustomEvent('openwork', { detail: ref })),
                  ),
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
    // Click-vs-drag disambiguation: capture on the pressed element itself, so
    // the click event still retargets to the node on release. Capturing on
    // the svg swallowed node clicks entirely (real-browser verified: pointer
    // capture on the svg retargets pointerup away from the node, so the
    // browser never synthesises a click on the node).
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
    const ev = e as PointerEvent;
    panX += ev.clientX - lastX;
    panY += ev.clientY - lastY;
    lastX = ev.clientX;
    lastY = ev.clientY;
    apply();
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

  // ---- flow dots ----
  let flowT = 0;
  const flowTimer = setInterval(() => {
    flowT = (flowT + 0.03) % 1;
    // tick working-node elapsed clocks: 1s wall-clock per ~1.33s of flowT
    // (40ms interval, 1/0.03 ticks per cycle) — driven off render time
    viewport.querySelectorAll<SVGTextElement>('text.dy-wf-timer').forEach((t) => {
      const cur = t.textContent ?? '00:00';
      const [m, s] = cur.split(':').map((v) => parseInt(v, 10) || 0);
      const total = m * 60 + s + 1;
      t.textContent =
        String(Math.floor(total / 60)).padStart(2, '0') + ':' + String(total % 60).padStart(2, '0');
    });
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
      p.classList.toggle('active', !!to && to.status !== 'pending' && fromDone);
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

  // feed-aware poll: repaints on delta AND logs status transitions to the strip
  const pollOnce = () => {
    fetchRuns()
      .then((runs) => {
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
          render(latest);
        }
      })
      .catch(() => { /* keep last good frame */ });
  };
  pollOnce();
  if (pollMs > 0) timer = setInterval(pollOnce, pollMs);

  disposers.push(() => {
    if (timer) clearInterval(timer);
    if (flowTimer) clearInterval(flowTimer);
    document.removeEventListener('keydown', onKeyDown);
    host.replaceChildren();
  });
  return () => {
    disposers.forEach((d) => d());
    disposers = [];
  };
}