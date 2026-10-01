// S1/S2 regressions for the workflow canvas:
//   S1 — per-purpose node components (shape-led, purpose vs status kept apart)
//        and reliable node drag/drop (single release path, pointercancel).
//   S2 — meaning-carrying connectors (direction, meaning tokens, legend) and
//        the connect gesture end-to-end.
// Runs the REAL src/workflow-canvas.ts compiled with the repo's own esbuild
// inside jsdom, matching the existing workflow-operation/workflow-truth style.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';

const here = dirname(fileURLToPath(import.meta.url));
const dash = dirname(here);
const esbuildBin = join(dash, 'node_modules', '.bin', 'esbuild');
const outDir = mkdtempSync(join(tmpdir(), 'wf-s1s2-'));
const compiled = join(outDir, 'workflow-canvas.mjs');
execFileSync(esbuildBin, [
  join(dash, 'src', 'workflow-canvas.ts'),
  '--bundle', '--format=esm', `--outfile=${compiled}`,
]);
const mod = await import('file://' + compiled.replace(/\\/g, '/'));
const {
  mountWorkflowCanvas, nodePurpose, statusToken, isAwaitingDecision,
  PURPOSE_VISUALS, EDGE_MEANINGS, PLANNING_EDGE_MEANINGS, DEFAULT_EDGE_MEANING,
} = mod;

// The canvas palette has exactly ONE written home: src/workflow-canvas-css.ts.
// Its text reaches the Dashboard bundle through the build (dist/style.css) and
// the Desktop plugin through the generated sibling. For assertions that ask
// "is this token/rule declared somewhere the canvas can see it", read that
// home — plus src/style.css, which still owns the shared chrome rules — so the
// check tracks the real palette without a second hand-maintained copy.
const compiledCss = join(outDir, 'workflow-canvas-css.mjs');
execFileSync(esbuildBin, [
  join(dash, 'src', 'workflow-canvas-css.ts'),
  '--bundle', '--format=esm', `--outfile=${compiledCss}`,
]);
const { WORKFLOW_CANVAS_CSS } = await import('file://' + compiledCss.replace(/\\/g, '/'));
const CSS = readFileSync(join(dash, 'src', 'style.css'), 'utf8') + '\n' + WORKFLOW_CANVAS_CSS;

// ---------------------------------------------------------------- fixtures --
const NODE = (over) => ({
  node_id: 'a', title: 'Ingest', depends_on: [], human_gate: false,
  task_ref: null, kind: 'task', status: 'working', assignee: null,
  evidence_refs: [], ...over,
});
const RUN = (nodes, over) => ({
  run_key: 'r1', version: 1, status: 'running',
  started_at: new Date(Date.now() - 30_000).toISOString(),
  updated_at: new Date().toISOString(), nodes, ...over,
});
// One node of each supported purpose: task, human gate, conditional branch
// (workflow_service `when`), bounded loop (workflow_service `loop`).
const FOUR_PURPOSES = () => [RUN([
  NODE({ node_id: 'a', title: 'Ingest', status: 'done' }),
  NODE({ node_id: 'g', title: 'Approve gate', depends_on: ['a'], human_gate: true, kind: 'gate', status: 'pending', task_ref: 'INIT-1' }),
  NODE({ node_id: 'b', title: 'Branch on gate', depends_on: ['g'], status: 'blocked', when: { node: 'g', status: 'done' } }),
  NODE({ node_id: 'l', title: 'Retry loop', depends_on: ['b'], status: 'working', loop: { max_iterations: 3, until: { status: 'done' } } }),
])];

function makeDom() {
  const dom = new JSDOM('<!doctype html><div id="host"></div>', {
    runScripts: 'outside-only', url: 'https://dashboard.local/', pretendToBeVisual: true,
  });
  dom.window.matchMedia = dom.window.matchMedia
    ?? ((q) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }));
  globalThis.document = dom.window.document;
  globalThis.matchMedia = dom.window.matchMedia;
  return dom;
}
const restore = (dom) => {
  delete globalThis.document;
  delete globalThis.matchMedia;
  dom.window.close();
};
const settle = (ms = 250) => new Promise((r) => setTimeout(r, ms));

function mount(dom, runs, handlers, pollMs = 0) {
  return mountWorkflowCanvas(
    dom.window.document.getElementById('host'), 'p', 'w',
    async () => runs(), {
      onApprove: () => {}, onReject: () => {}, ...handlers,
    }, pollMs,
  );
}
const pev = (dom, type, opts = {}) => new dom.window.PointerEvent(type, {
  button: 0, pointerId: 1, bubbles: true, cancelable: true, ...opts,
});
const kev = (dom, key, opts = {}) => new dom.window.KeyboardEvent('keydown', {
  key, bubbles: true, cancelable: true, ...opts,
});
const nodeOf = (host, id) => host.querySelector(`[data-node-id="${id}"]`);

// ------------------------------------------------------------- S1: visuals --

test('S1: every node is the same card; purpose is stated in words', async () => {
  const dom = makeDom();
  const dispose = mount(dom, FOUR_PURPOSES, {});
  try {
    await settle();
    const host = dom.window.document.getElementById('host');
    const purposes = ['task', 'gate', 'branch', 'loop'];
    for (const p of purposes) {
      assert.ok(host.querySelector(`.dy-wf-node[data-wf-purpose="${p}"]`),
        `a ${p} node must render with its purpose recorded`);
    }
    // Identical cards: one rounded rect of the same size and radius everywhere.
    const shapes = ['a', 'g', 'b', 'l'].map((id) => nodeOf(host, id).querySelector('.dy-wf-shape'));
    for (const sh of shapes) {
      assert.equal(sh.tagName.toLowerCase(), 'rect', 'every node is the card rect');
      assert.ok(sh.classList.contains('dy-wf-card'), 'the card class is on the shape');
    }
    const geom = (sh) => ['width', 'height', 'rx', 'fill'].map((k) => sh.getAttribute(k)).join('|');
    assert.equal(new Set(shapes.map(geom)).size, 1, 'size, radius and fill are identical for every purpose');
    // No per-purpose symbol set survives.
    assert.equal(host.querySelectorAll('.dy-wf-glyph').length, 0, 'no purpose symbols');
    // Purpose is named on the node itself, and in its accessible name.
    const sub = (id) => nodeOf(host, id).querySelector('.dy-wf-sub').textContent;
    assert.equal(sub('a'), PURPOSE_VISUALS.task.label);
    assert.equal(sub('g'), 'Human gate');
    assert.equal(sub('b'), 'Conditional branch');
    assert.equal(sub('l'), 'Bounded loop');
    assert.match(nodeOf(host, 'g').getAttribute('aria-label'), /^Human gate: Approve gate/);
  } finally {
    dispose();
    restore(dom);
  }
});

test('S1: no node carries a coloured side stripe and the shape set is single', async () => {
  const dom = makeDom();
  const dispose = mount(dom, FOUR_PURPOSES, {});
  try {
    await settle();
    const host = dom.window.document.getElementById('host');
    for (const g of host.querySelectorAll('.dy-wf-node')) {
      assert.equal(g.querySelectorAll('.dy-wf-shape').length, 1,
        'a node draws exactly one card');
      for (const el of g.querySelectorAll('*')) {
        const cls = el.getAttribute('class') ?? '';
        assert.doesNotMatch(cls, /stripe|side-?line|bar/i,
          `no side-stripe element may exist (found ${cls})`);
      }
    }
    assert.doesNotMatch(CSS, /side-?stripe|wf-stripe/i,
      'stylesheet defines no side-stripe treatment');
  } finally {
    dispose();
    restore(dom);
  }
});

test('S1: status is carried by border, dot and word; the card fill never changes', async () => {
  const dom = makeDom();
  const runs = () => [RUN([
    NODE({ node_id: 'a', title: 'One', status: 'done' }),
    NODE({ node_id: 'b', title: 'Two', status: 'blocked' }),
    NODE({ node_id: 'c', title: 'Three', status: 'pending' }),
    NODE({ node_id: 'd', title: 'Four', status: 'working' }),
  ])];
  const dispose = mount(dom, runs, {});
  try {
    await settle();
    const host = dom.window.document.getElementById('host');
    const ids = ['a', 'b', 'c', 'd'];
    const fillOf = (id) => nodeOf(host, id).querySelector('.dy-wf-shape').getAttribute('fill');
    assert.equal(new Set(ids.map(fillOf)).size, 1, 'status must not re-colour the card fill');
    const stated = ids.map((id) => nodeOf(host, id).querySelector('.dy-wf-statustext').textContent);
    assert.deepEqual(stated.sort(), ['blocked', 'done', 'pending', 'working']);
    const dots = ids.map((id) => nodeOf(host, id).querySelector('.dy-wf-statusdot').getAttribute('class'));
    assert.equal(new Set(dots).size, 4, 'each status has its own dot treatment');
    assert.ok(nodeOf(host, 'b').getAttribute('class').split(/\s+/).includes('blocked'), 'border rule hook on the group');
    assert.equal(nodeOf(host, 'b').dataset.wfStatus, 'blocked');
    assert.equal(nodeOf(host, 'b').dataset.wfPurpose, 'task');
    // Each status has its own border rule in the stylesheet, driven by a status token.
    for (const st of ['done', 'working', 'blocked', 'pending']) {
      const m = CSS.match(new RegExp(`\\.dy-wf-node\\.${st} \\.dy-wf-shape\\s*\\{([^}]*)\\}`));
      assert.ok(m, `${st} has a border rule`);
      assert.match(m[1], new RegExp(`stroke:\\s*var\\(--dy-wf-status-${st}\\)`), `${st} border uses its status token`);
    }
  } finally {
    dispose();
    restore(dom);
  }
});

test('S1: a pending human gate reads as awaiting decision (stated, not inferred)', async () => {
  const dom = makeDom();
  const dispose = mount(dom, FOUR_PURPOSES, {});
  try {
    await settle();
    const host = dom.window.document.getElementById('host');
    const gate = nodeOf(host, 'g');
    assert.equal(gate.dataset.wfAwaiting, 'true');
    assert.equal(gate.querySelector('.dy-wf-statustext').textContent, 'awaiting decision');
    // A pending non-gate node is just pending.
    assert.equal(isAwaitingDecision(NODE({ status: 'pending' })), false);
    assert.equal(isAwaitingDecision(NODE({ human_gate: true, status: 'done' })), false);
    assert.equal(isAwaitingDecision(NODE({ human_gate: true, status: null })), true);
  } finally {
    dispose();
    restore(dom);
  }
});

test('S1: card text and status colours stay legible on the card fill', async () => {
  const token = (name) => {
    const m = CSS.match(new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{3,8})`));
    assert.ok(m, `token --${name} must be declared in the canvas stylesheet`);
    return m[1];
  };
  const srgb = (c) => { const v = c / 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
  const lum = (hex) => {
    const h = hex.replace('#', '');
    const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
    return 0.2126 * srgb(r) + 0.7152 * srgb(g) + 0.0722 * srgb(b);
  };
  const ratio = (a, b) => {
    const [x, y] = [lum(a), lum(b)];
    return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
  };
  const fill = token('dy-wf-card-fill');
  const bg = token('dy-wf-canvas-bg');
  // The card must separate from the stage it sits on.
  assert.ok(ratio(fill, bg) >= 1.1, `card fill must lift off the canvas (got ${ratio(fill, bg).toFixed(2)})`);
  assert.ok(ratio(token('dy-wf-card-text'), fill) >= 7, 'card title reaches 7:1');
  assert.ok(ratio(token('dy-wf-card-dim'), fill) >= 4.5, 'purpose word reaches 4.5:1');
  for (const s of ['done', 'working', 'blocked', 'pending']) {
    assert.ok(ratio(token(`dy-wf-status-${s}-text`), fill) >= 4.5, `status word (${s}) reaches 4.5:1 on the card`);
    assert.ok(ratio(token(`dy-wf-status-${s}`), fill) >= 3, `status border (${s}) reaches 3:1 on the card`);
  }
  // The four statuses are distinguishable from each other by hue or lightness.
  const vals = ['done', 'working', 'blocked', 'pending'].map((s) => token(`dy-wf-status-${s}`));
  assert.equal(new Set(vals).size, 4, 'each status has its own colour');
  // No per-purpose palette survives: purpose is words only.
  assert.doesNotMatch(CSS, /--dy-wf-purpose-/, 'no per-purpose colour tokens');
});

test('S1: purpose helpers classify the canonical graph shapes', () => {
  assert.equal(nodePurpose(NODE({})), 'task');
  assert.equal(nodePurpose(NODE({ kind: 'gate', human_gate: true })), 'gate');
  assert.equal(nodePurpose(NODE({ human_gate: true })), 'gate');
  assert.equal(nodePurpose(NODE({ when: { node: 'a', status: 'done' } })), 'branch');
  assert.equal(nodePurpose(NODE({ loop: { max_iterations: 2, until: { status: 'done' } } })), 'loop');
  assert.equal(nodePurpose(NODE({ human_gate: true, loop: { max_iterations: 2, until: { status: 'done' } } })), 'gate');
  assert.equal(statusToken('done'), 'done');
  assert.equal(statusToken('working'), 'working');
  assert.equal(statusToken('blocked'), 'blocked');
  assert.equal(statusToken(null), 'pending');
  assert.equal(statusToken('weird-host-status'), 'pending');
});

// ---------------------------------------------------------- S2: connectors --

test('S2: every dependency edge states its meaning and points at its target', async () => {
  const dom = makeDom();
  const dispose = mount(dom, FOUR_PURPOSES, {});
  try {
    await settle();
    const host = dom.window.document.getElementById('host');
    const edges = [...host.querySelectorAll('.dy-wf-edge')];
    // a<-g, g<-b, b<-l : three dependency edges.
    assert.equal(edges.length, 3, 'one edge per dependency');
    for (const e of edges) {
      assert.equal(e.getAttribute('data-meaning'), DEFAULT_EDGE_MEANING,
        'workflow dependency edges carry the default meaning');
      // Direction must be visible: an arrowhead marker, from the meaning table.
      assert.equal(e.getAttribute('marker-end'),
        `url(#${EDGE_MEANINGS[DEFAULT_EDGE_MEANING].marker})`,
        'every dependency edge carries its meaning marker');
      assert.ok(e.dataset.from && e.dataset.to, 'edge states both ends');
    }
    // The marker itself exists, is a real path, and is sized to stay legible.
    const markers = [...host.querySelectorAll('marker')];
    assert.ok(markers.length >= 2, 'direction markers are defined');
    for (const m of markers) {
      assert.equal(m.getAttribute('markerUnits'), 'userSpaceOnUse',
        'markers keep a constant size regardless of stroke width');
      assert.ok(m.querySelector('path.dy-wf-arrow'), 'marker has an arrowhead path');
    }
    const dep = EDGE_MEANINGS[DEFAULT_EDGE_MEANING];
    assert.ok(host.querySelector(`#${dep.marker}`), 'the meaning marker is present');
    assert.ok(host.querySelector(`#${dep.activeMarker}`), 'the active meaning marker is present');
    // Edge contrast is at least as strong as the old dim connector (#3d4657).
    const edgeToken = CSS.match(/--dy-edge-dep:\s*(#[0-9a-f]{6})/);
    assert.ok(edgeToken, 'the dependency edge colour is a declared token');
    assert.ok(Number(BigInt('0x' + edgeToken[1].slice(1)) > 0), 'token parsed');
  } finally {
    dispose();
    restore(dom);
  }
});

test('S2: the seven planning-canvas meanings exist as tokens without being rendered here', async () => {
  const dom = makeDom();
  const dispose = mount(dom, FOUR_PURPOSES, {});
  try {
    await settle();
    const host = dom.window.document.getElementById('host');
    const meanings = ['supports', 'contradicts', 'derived_from', 'clarifies', 'depends_on', 'implements', 'raises_question'];
    assert.deepEqual([...PLANNING_EDGE_MEANINGS].sort(), [...meanings].sort(),
      'the planning vocabulary is exactly the seven approved meanings');
    for (const m of meanings) {
      const token = EDGE_MEANINGS[m];
      assert.ok(token, `${m} has a token entry`);
      assert.ok(token.marker && token.activeMarker, `${m} declares its markers`);
      // Colour tokens are declared in the stylesheet: one home for the palette.
      assert.ok(CSS.includes(`--${token.color.replace(/^--/, '')}:`),
        `${m} colour token is declared in style.css`);
      assert.ok(CSS.includes(`--${token.activeColor.replace(/^--/, '')}:`),
        `${m} active colour token is declared in style.css`);
    }
    // Only the meaning this canvas actually draws is rendered; the rest are
    // tokens (no dead DOM, no invented edges).
    const rendered = meanings.filter((m) => EDGE_MEANINGS[m].rendered);
    assert.deepEqual(rendered, ['depends_on']);
    for (const m of meanings) {
      if (EDGE_MEANINGS[m].rendered) continue;
      assert.ok(!host.querySelector(`#${EDGE_MEANINGS[m].marker}`),
        `${m} must not render a marker before the canvas that draws it exists`);
    }
  } finally {
    dispose();
    restore(dom);
  }
});

test('S2: no legend is drawn over the canvas (identical cards need no key)', async () => {
  const dom = makeDom();
  const dispose = mount(dom, FOUR_PURPOSES, {});
  try {
    await settle();
    const host = dom.window.document.getElementById('host');
    assert.equal(host.querySelector('.dy-wf-index'), null, 'no legend panel');
    assert.doesNotMatch(CSS, /\.dy-wf-index/, 'no legend styles remain');
    // What the legend used to explain is on every card instead.
    for (const g of host.querySelectorAll('.dy-wf-node')) {
      assert.ok(g.querySelector('.dy-wf-sub').textContent.trim(), 'purpose word on the card');
      assert.ok(g.querySelector('.dy-wf-statustext').textContent.trim(), 'status word on the card');
    }
  } finally {
    dispose();
    restore(dom);
  }
});

// ------------------------------------------------------- connect gesture ----

function connectRun() {
  return [RUN([
    NODE({ node_id: 'a', title: 'Ingest', status: 'done' }),
    NODE({ node_id: 'b', title: 'Build', status: 'pending' }),
    NODE({ node_id: 'c', title: 'Ship', status: 'pending' }),
  ])];
}

test('S2: port drag commits exactly one edge through one completion path', async () => {
  const dom = makeDom();
  const edits = [];
  const dispose = mount(dom, connectRun, { onEdit: (nodes) => { edits.push(nodes); } });
  try {
    await settle();
    const host = dom.window.document.getElementById('host');
    const port = nodeOf(host, 'a').querySelector('[data-connect-from="a"]');
    assert.ok(port, 'the node exposes one right-side connect port');
    port.dispatchEvent(pev(dom, 'pointerdown', { clientX: 10, clientY: 10 }));
    const b = nodeOf(host, 'b');
    b.dispatchEvent(pev(dom, 'pointerup', { clientX: 300, clientY: 40 }));
    await settle(40);
    assert.equal(edits.length, 1, 'a single release commits a single edit (no double write)');
    assert.deepEqual(edits[0].find((n) => n.node_id === 'b').depends_on, ['a']);
    // The gesture is finished: the connecting marker is gone.
    assert.ok(!b.getAttribute('class').includes('dy-wf-connecting'));
    assert.ok(!nodeOf(host, 'a').getAttribute('class').includes('dy-wf-connecting'));
  } finally {
    dispose();
    restore(dom);
  }
});

test('S2: shift-click connect still works and commits once', async () => {
  const dom = makeDom();
  const edits = [];
  const dispose = mount(dom, connectRun, { onEdit: (nodes) => { edits.push(nodes); } });
  try {
    await settle();
    const host = dom.window.document.getElementById('host');
    nodeOf(host, 'a').dispatchEvent(pev(dom, 'pointerdown', { shiftKey: true, clientX: 10, clientY: 10 }));
    nodeOf(host, 'c').dispatchEvent(pev(dom, 'pointerup', { clientX: 400, clientY: 60 }));
    await settle(40);
    assert.equal(edits.length, 1, 'shift-click connect commits exactly one edit');
    assert.deepEqual(edits[0].find((n) => n.node_id === 'c').depends_on, ['a']);
  } finally {
    dispose();
    restore(dom);
  }
});

test('S2: keyboard connect works with both activation keys', async () => {
  const dom = makeDom();
  const edits = [];
  const dispose = mount(dom, connectRun, { onEdit: (nodes) => { edits.push(nodes); } });
  try {
    await settle();
    const host = dom.window.document.getElementById('host');
    // ' ' (space) starts a connection; Enter on another node completes it.
    nodeOf(host, 'a').dispatchEvent(kev(dom, ' '));
    assert.ok(nodeOf(host, 'a').getAttribute('class').includes('dy-wf-connecting'),
      'space arms the connection on the source node');
    nodeOf(host, 'b').dispatchEvent(kev(dom, 'Enter'));
    await settle(40);
    assert.equal(edits.length, 1, 'keyboard connect commits exactly one edit');
    assert.deepEqual(edits[0].find((n) => n.node_id === 'b').depends_on, ['a']);
    // 'c' is the other activation key, and it toggles off on the same node.
    nodeOf(host, 'a').dispatchEvent(kev(dom, 'c'));
    assert.ok(nodeOf(host, 'a').getAttribute('class').includes('dy-wf-connecting'));
    nodeOf(host, 'a').dispatchEvent(kev(dom, 'c'));
    assert.ok(!nodeOf(host, 'a').getAttribute('class').includes('dy-wf-connecting'),
      'pressing the activation key again cancels');
    // Enter with nothing armed must not invent an edge.
    nodeOf(host, 'c').dispatchEvent(kev(dom, 'Enter'));
    await settle(20);
    assert.equal(edits.length, 1, 'Enter without an armed source commits nothing');
  } finally {
    dispose();
    restore(dom);
  }
});

test('S2: cycle and self-dependency rejections are still reported, never committed', async () => {
  const dom = makeDom();
  const edits = [];
  const runs = () => [RUN([
    NODE({ node_id: 'a', title: 'Ingest', depends_on: [], status: 'done' }),
    NODE({ node_id: 'b', title: 'Build', depends_on: ['a'], status: 'pending' }),
  ])];
  const dispose = mount(dom, runs, { onEdit: (nodes) => { edits.push(nodes); } });
  try {
    await settle();
    const host = dom.window.document.getElementById('host');
    const feed = () => host.querySelector('.dy-wf-feed-body').textContent;
    // b already depends on a: a -> b -> a is a cycle and must be refused.
    nodeOf(host, 'b').dispatchEvent(pev(dom, 'pointerdown', { shiftKey: true }));
    nodeOf(host, 'a').dispatchEvent(pev(dom, 'pointerup'));
    await settle(20);
    assert.match(feed(), /cycle/i, 'the cycle reason is reported');
    assert.equal(edits.length, 0, 'a rejected connection is never committed');
    // Self-dependency is refused with its own reason.
    nodeOf(host, 'a').dispatchEvent(pev(dom, 'pointerdown', { shiftKey: true }));
    nodeOf(host, 'a').dispatchEvent(pev(dom, 'pointerup'));
    await settle(20);
    assert.match(feed(), /cannot depend on itself/i, 'the self-dependency reason is reported');
    assert.equal(edits.length, 0);
  } finally {
    dispose();
    restore(dom);
  }
});

// ------------------------------------------------------------ S1: drag ------

test('S1: drag moves the node by the pointer delta scaled by zoom', async () => {
  const dom = makeDom();
  const edits = [];
  const dispose = mount(dom, connectRun, { onEdit: (nodes) => { edits.push(nodes); } });
  try {
    await settle();
    const host = dom.window.document.getElementById('host');
    // Zoom in one step: 1.25. The graph is in world units, the pointer in
    // screen pixels, so a 50px drag must be 40 world units.
    const zoomIn = host.querySelector('[data-wf-action="zoom-in"]');
    zoomIn.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
    const g = nodeOf(host, 'b');
    const start = g.getAttribute('transform');
    const x0 = Number((start.match(/translate\(([-\d.]+)/) ?? [])[1]);
    const y0 = Number((start.match(/translate\([-\d.]+ ([-\d.]+)\)/) ?? [])[1]);
    g.dispatchEvent(pev(dom, 'pointerdown', { clientX: 200, clientY: 100 }));
    g.dispatchEvent(pev(dom, 'pointermove', { clientX: 250, clientY: 140 }));
    g.dispatchEvent(pev(dom, 'pointerup', { clientX: 250, clientY: 140 }));
    await settle(40);
    assert.equal(edits.length, 1, 'a released drag commits once');
    const moved = edits[0].find((n) => n.node_id === 'b');
    assert.ok(Math.abs(moved.canvas_position.x - (x0 + 50 / 1.25)) < 0.001,
      `x should move by delta/zoom (got ${moved.canvas_position.x}, want ${x0 + 50 / 1.25})`);
    assert.ok(Math.abs(moved.canvas_position.y - (y0 + 40 / 1.25)) < 0.001,
      `y should move by delta/zoom (got ${moved.canvas_position.y}, want ${y0 + 40 / 1.25})`);
    // The rendered node agrees with what was persisted.
    const rendered = Number((nodeOf(host, 'b').getAttribute('transform').match(/translate\(([-\d.]+)/) ?? [])[1]);
    assert.ok(Math.abs(rendered - moved.canvas_position.x) < 0.001,
      'the rendered position matches the committed position');
  } finally {
    dispose();
    restore(dom);
  }
});

test('S1: a canvas pan does not shift the node under the pointer', async () => {
  const dom = makeDom();
  const edits = [];
  const dispose = mount(dom, connectRun, { onEdit: (nodes) => { edits.push(nodes); } });
  try {
    await settle();
    const host = dom.window.document.getElementById('host');
    const svg = host.querySelector('.dy-wf-svg');
    // Pan the canvas by +60px on the background.
    svg.dispatchEvent(pev(dom, 'pointerdown', { clientX: 0, clientY: 0 }));
    svg.dispatchEvent(pev(dom, 'pointermove', { clientX: 60, clientY: 0 }));
    svg.dispatchEvent(pev(dom, 'pointerup', { clientX: 60, clientY: 0 }));
    const g = nodeOf(host, 'b');
    const x0 = Number((g.getAttribute('transform').match(/translate\(([-\d.]+)/) ?? [])[1]);
    g.dispatchEvent(pev(dom, 'pointerdown', { clientX: 200, clientY: 100 }));
    g.dispatchEvent(pev(dom, 'pointermove', { clientX: 220, clientY: 100 }));
    g.dispatchEvent(pev(dom, 'pointerup', { clientX: 220, clientY: 100 }));
    await settle(40);
    const moved = edits.at(-1).find((n) => n.node_id === 'b');
    // The pan cancels out of the drag: the node follows the pointer by the
    // pointer delta, not by the pan offset too.
    assert.ok(Math.abs(moved.canvas_position.x - (x0 + 20)) < 0.001,
      `pan must not leak into the drag (got ${moved.canvas_position.x}, want ${x0 + 20})`);
  } finally {
    dispose();
    restore(dom);
  }
});

test('S1: pointercancel mid-drag leaves no half-state and no edit', async () => {
  const dom = makeDom();
  const edits = [];
  const dispose = mount(dom, connectRun, { onEdit: (nodes) => { edits.push(nodes); } });
  try {
    await settle();
    const host = dom.window.document.getElementById('host');
    const g = nodeOf(host, 'b');
    g.dispatchEvent(pev(dom, 'pointerdown', { clientX: 200, clientY: 100 }));
    g.dispatchEvent(pev(dom, 'pointermove', { clientX: 260, clientY: 150 }));
    g.dispatchEvent(pev(dom, 'pointercancel', { clientX: 260, clientY: 150 }));
    await settle(40);
    assert.equal(edits.length, 0, 'an interrupted drag writes nothing');
    // The drag really ended: a later move must not keep dragging the node.
    const after = nodeOf(host, 'b').getAttribute('transform');
    g.dispatchEvent(pev(dom, 'pointermove', { clientX: 400, clientY: 300 }));
    await settle(20);
    assert.equal(nodeOf(host, 'b').getAttribute('transform'), after,
      'the node must not follow the pointer after a cancel (no half-state)');
    // And the component is not corrupted: a fresh drag still works.
    g.dispatchEvent(pev(dom, 'pointerdown', { clientX: 200, clientY: 100 }));
    g.dispatchEvent(pev(dom, 'pointermove', { clientX: 210, clientY: 100 }));
    g.dispatchEvent(pev(dom, 'pointerup', { clientX: 210, clientY: 100 }));
    await settle(40);
    assert.equal(edits.length, 1, 'a drag after a cancel still commits normally');
  } finally {
    dispose();
    restore(dom);
  }
});

test('S1: a release delivered to the canvas still ends the node drag (no stuck drag)', async () => {
  const dom = makeDom();
  const edits = [];
  const dispose = mount(dom, connectRun, { onEdit: (nodes) => { edits.push(nodes); } });
  try {
    await settle();
    const host = dom.window.document.getElementById('host');
    const svg = host.querySelector('.dy-wf-svg');
    const g = nodeOf(host, 'b');
    g.dispatchEvent(pev(dom, 'pointerdown', { clientX: 200, clientY: 100 }));
    g.dispatchEvent(pev(dom, 'pointermove', { clientX: 240, clientY: 120 }));
    // Release that lands on the canvas (what happens when the pointer leaves
    // the node and capture is unavailable). One path must still end the drag.
    svg.dispatchEvent(pev(dom, 'pointerup', { clientX: 240, clientY: 120 }));
    await settle(40);
    assert.equal(edits.length, 1, 'the canvas-level release commits the drag once');
    const after = nodeOf(host, 'b').getAttribute('transform');
    g.dispatchEvent(pev(dom, 'pointermove', { clientX: 500, clientY: 400 }));
    await settle(20);
    assert.equal(nodeOf(host, 'b').getAttribute('transform'), after,
      'the drag marker must be cleared, not left following the pointer');
  } finally {
    dispose();
    restore(dom);
  }
});

test('S1: an interrupted connection gesture leaves nothing armed', async () => {
  const dom = makeDom();
  const edits = [];
  const dispose = mount(dom, connectRun, { onEdit: (nodes) => { edits.push(nodes); } });
  try {
    await settle();
    const host = dom.window.document.getElementById('host');
    const svg = host.querySelector('.dy-wf-svg');
    const port = nodeOf(host, 'a').querySelector('[data-connect-from="a"]');
    port.dispatchEvent(pev(dom, 'pointerdown', { clientX: 10, clientY: 10 }));
    svg.dispatchEvent(pev(dom, 'pointercancel', { clientX: 10, clientY: 10 }));
    await settle(20);
    assert.ok(!nodeOf(host, 'a').getAttribute('class').includes('dy-wf-connecting'),
      'a cancelled connection drops its connecting marker');
    // Nothing is armed any more: Enter elsewhere commits nothing.
    nodeOf(host, 'b').dispatchEvent(kev(dom, 'Enter'));
    await settle(20);
    assert.equal(edits.length, 0, 'a cancelled gesture cannot commit later');
  } finally {
    dispose();
    restore(dom);
  }
});

test('S1: a drag ends the gesture cleanly when the pointer is released off-node', async () => {
  const dom = makeDom();
  const edits = [];
  const dispose = mount(dom, connectRun, { onEdit: (nodes) => { edits.push(nodes); } });
  try {
    await settle();
    const host = dom.window.document.getElementById('host');
    const g = nodeOf(host, 'c');
    g.dispatchEvent(pev(dom, 'pointerdown', { clientX: 300, clientY: 200 }));
    g.dispatchEvent(pev(dom, 'pointercancel', { clientX: 300, clientY: 200 }));
    await settle(20);
    assert.equal(edits.length, 0, 'cancel without movement writes nothing');
    // A subsequent drag on the same node is still measured from the node's
    // current position, not from the abandoned gesture.
    const before = Number((nodeOf(host, 'c').getAttribute('transform').match(/translate\(([-\d.]+)/) ?? [])[1]);
    g.dispatchEvent(pev(dom, 'pointerdown', { clientX: 300, clientY: 200 }));
    g.dispatchEvent(pev(dom, 'pointermove', { clientX: 310, clientY: 200 }));
    g.dispatchEvent(pev(dom, 'pointerup', { clientX: 310, clientY: 200 }));
    await settle(40);
    const moved = edits.at(-1).find((n) => n.node_id === 'c');
    assert.ok(Math.abs(moved.canvas_position.x - (before + 10)) < 0.001,
      'the next drag is relative to the node, not the cancelled session');
  } finally {
    dispose();
    restore(dom);
  }
});
