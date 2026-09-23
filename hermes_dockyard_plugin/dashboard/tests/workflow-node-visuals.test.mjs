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
  mountWorkflowCanvas, nodePurpose, nodeShapePath, statusToken,
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

test('S1: each purpose renders a distinct silhouette, fill, symbol and label', async () => {
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
    // Shape-led: gate/branch/loop are drawn as paths, a task as a rounded rect.
    const shape = (id) => nodeOf(host, id).querySelector('.dy-wf-shape');
    assert.equal(shape('a').tagName.toLowerCase(), 'rect', 'task is a rounded rect');
    assert.equal(shape('a').getAttribute('rx'), '9');
    assert.equal(shape('g').tagName.toLowerCase(), 'path', 'human gate is not a rectangle');
    assert.equal(shape('b').tagName.toLowerCase(), 'path', 'branch is not a rectangle');
    assert.equal(shape('l').tagName.toLowerCase(), 'path', 'loop is not a rectangle');
    // The three path silhouettes are genuinely different shapes.
    const d = (id) => shape(id).getAttribute('d');
    assert.notEqual(d('g'), d('b'), 'gate and branch must not share a silhouette');
    assert.notEqual(d('g'), d('l'), 'gate and loop must not share a silhouette');
    assert.notEqual(d('b'), d('l'), 'branch and loop must not share a silhouette');
    // Hexagon gate: 6 vertices. Cut-corner branch: 8 vertices.
    // Every path command here (M/H/V/L) introduces a vertex.
    const count = (s) => (s.match(/[MLHV]/g) ?? []).length;
    assert.equal(count(d('g')), 6, 'gate silhouette is a hexagon profile');
    assert.equal(count(d('b')), 8, 'branch silhouette is a cut-corner octagon profile');
    assert.ok(/A /.test(d('l')), 'loop silhouette carries rounded returns');
    // Purpose fill + symbol are per-purpose and never all the same.
    const fills = purposes.map((p) => host.querySelector(`.dy-wf-node[data-wf-purpose="${p}"] .dy-wf-shape`).getAttribute('fill'));
    assert.equal(new Set(fills).size, purposes.length, 'every purpose has its own fill token');
    const glyphs = purposes.map((p) => host.querySelector(`.dy-wf-node[data-wf-purpose="${p}"] .dy-wf-glyph`).textContent);
    assert.equal(new Set(glyphs).size, purposes.length, 'every purpose has its own symbol');
    // Per-purpose label treatment: the purpose is named on the node itself.
    assert.match(nodeOf(host, 'g').querySelector('.dy-wf-sub').textContent, /Human gate/);
    assert.match(nodeOf(host, 'b').querySelector('.dy-wf-sub').textContent, /Conditional branch/);
    assert.match(nodeOf(host, 'l').querySelector('.dy-wf-sub').textContent, /Bounded loop/);
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
    // The rejected pattern was a thin coloured rule down one side of a uniform
    // box. Nothing may draw one: one shape element per node, no stripe nodes.
    for (const g of host.querySelectorAll('.dy-wf-node')) {
      assert.equal(g.querySelectorAll('.dy-wf-shape').length, 1,
        'a node draws exactly one silhouette');
      for (const el of g.querySelectorAll('*')) {
        const cls = el.getAttribute('class') ?? '';
        assert.doesNotMatch(cls, /stripe|side-?line|bar/i,
          `no side-stripe element may exist (found ${cls})`);
      }
      // A uniform rect for every node is the pattern being replaced.
      assert.ok(g.querySelector('.dy-wf-shape'), 'silhouette present');
    }
    // The stylesheet must not style a stripe either.
    assert.doesNotMatch(CSS, /side-?stripe|wf-stripe/i,
      'stylesheet defines no side-stripe treatment');
  } finally {
    dispose();
    restore(dom);
  }
});

test('S1: purpose and status are independent dimensions on the same node', async () => {
  const dom = makeDom();
  const runs = () => [RUN([
    NODE({ node_id: 'a', title: 'One', status: 'done' }),
    NODE({ node_id: 'b', title: 'Two', status: 'blocked' }),
    NODE({ node_id: 'c', title: 'Three', status: 'pending' }),
  ])];
  const dispose = mount(dom, runs, {});
  try {
    await settle();
    const host = dom.window.document.getElementById('host');
    const fillOf = (id) => nodeOf(host, id).querySelector('.dy-wf-shape').getAttribute('fill');
    // Same purpose, three different statuses: the purpose fill is unchanged...
    assert.equal(new Set(['a', 'b', 'c'].map(fillOf)).size, 1,
      'status must not re-colour the purpose fill');
    // ...while the status is still stated, three different ways.
    const stated = ['a', 'b', 'c'].map((id) => nodeOf(host, id).querySelector('.dy-wf-statustext').textContent);
    assert.deepEqual(stated.sort(), ['blocked', 'done', 'pending']);
    const chips = ['a', 'b', 'c'].map((id) => nodeOf(host, id).querySelector('.dy-wf-statuschip').getAttribute('class'));
    assert.equal(new Set(chips).size, 3, 'each status has its own chip treatment');
    // The status is on the group too, for the outline rules.
    assert.ok(nodeOf(host, 'b').getAttribute('class').includes('blocked'));
    assert.equal(nodeOf(host, 'b').dataset.wfStatus, 'blocked');
    assert.equal(nodeOf(host, 'b').dataset.wfPurpose, 'task');
  } finally {
    dispose();
    restore(dom);
  }
});

test('S1: purpose and status colours never collide and stay legible on every fill', async () => {
  const token = (name) => {
    const m = CSS.match(new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{3,8})`));
    assert.ok(m, `token --${name} must be declared in style.css`);
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
  const PURPOSE_KEYS = ['task', 'gate', 'branch', 'loop'];
  // (1) The two dimensions are different colours everywhere: a purpose token
  // value must never equal a status token value.
  const purposeVals = PURPOSE_KEYS.flatMap((p) => ['fill', 'line', 'text'].map((k) => token(`dy-wf-purpose-${p}-${k}`)));
  const statusVals = ['done', 'working', 'blocked', 'pending'].flatMap((s) => [token(`dy-wf-status-${s}`), token(`dy-wf-status-${s}-text`)]);
  for (const pv of purposeVals) {
    assert.ok(!statusVals.includes(pv),
      `purpose colour ${pv} must never be reused as a status colour`);
  }
  // (2) Structural separation: purpose-ruled properties are never driven by a
  // status token, and status-ruled properties are never driven by a purpose
  // token. This is what makes the two dimensions independent by construction.
  for (const p of PURPOSE_KEYS) {
    const purposeRules = [...CSS.matchAll(new RegExp(`\\.dy-wf-node\\.${p}[^{]*\\{([^}]*)\\}`, 'g'))]
      .map((m) => m[1]).join(' ');
    assert.ok(purposeRules.length > 0, `the ${p} purpose has its own rules`);
    assert.doesNotMatch(purposeRules, /--dy-wf-status/,
      `the ${p} purpose rules must not be coloured by a status token`);
  }
  for (const s of ['done', 'working', 'blocked', 'pending']) {
    const statusRules = [...CSS.matchAll(new RegExp(`\\.(dy-wf-statuschip|dy-wf-statustext)\\.${s}[^{]*\\{([^}]*)\\}`, 'g'))]
      .map((m) => m[1]).join(' ');
    assert.ok(statusRules.length > 0, `the ${s} status has its own rules`);
    assert.doesNotMatch(statusRules, /--dy-wf-purpose/,
      `the ${s} status rules must not be coloured by a purpose token`);
  }
  // (3) The standing quality bar, measured on the real palette: status text
  // legible on every purpose fill, and the status outline visible too.
  // The canvas background is what a fill must separate from. It is declared as
  // the fallback of the canvas rule, so read it from there rather than
  // hard-coding a second copy of the value into the test.
  const bgMatch = CSS.match(/\.dy-wf\s*\{[^}]*background:\s*var\(--dy-bg-deep,\s*(#[0-9a-fA-F]{6})\)/);
  assert.ok(bgMatch, 'the canvas background colour must be declared');
  const bg = bgMatch[1];
  for (const p of PURPOSE_KEYS) {
    const fill = token(`dy-wf-purpose-${p}-fill`);
    // A purpose colour is only a purpose colour if it is perceptible: a fill
    // indistinguishable from the canvas background reads as black and makes the
    // dimensions invisible (measured regression: 1.19:1 was not enough).
    assert.ok(ratio(fill, bg) >= 1.6,
      `the ${p} fill must read as a tint against the canvas background`);
    for (const s of ['done', 'working', 'blocked', 'pending']) {
      assert.ok(ratio(token(`dy-wf-status-${s}-text`), fill) >= 4.5,
        `status text (${s}) must reach 4.5:1 on the ${p} fill`);
      assert.ok(ratio(token(`dy-wf-status-${s}`), fill) >= 3,
        `status outline (${s}) must reach 3:1 on the ${p} fill`);
    }
    assert.ok(ratio(token(`dy-wf-purpose-${p}-text`), fill) >= 4.5,
      `purpose text must be legible on the ${p} fill`);
    assert.ok(ratio(token(`dy-wf-purpose-${p}-line`), fill) >= 3,
      `the ${p} silhouette must separate from its own fill`);
  }
  // The purposes must be distinguishable from EACH OTHER, not just from the
  // background: hue separation is what makes "different colours" true.
  const hue = (hex) => {
    const h = hex.replace('#', '');
    const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    if (max === min) return 0;
    const d = max - min;
    let deg;
    if (max === r) deg = ((g - b) / d) % 6;
    else if (max === g) deg = (b - r) / d + 2;
    else deg = (r - g) / d + 4;
    return ((deg * 60) + 360) % 360;
  };
  const sep = (a, b) => {
    const d = Math.abs(hue(a) - hue(b));
    return Math.min(d, 360 - d);
  };
  for (let i = 0; i < PURPOSE_KEYS.length; i += 1) {
    for (let j = i + 1; j < PURPOSE_KEYS.length; j += 1) {
      const a = token(`dy-wf-purpose-${PURPOSE_KEYS[i]}-fill`);
      const b = token(`dy-wf-purpose-${PURPOSE_KEYS[j]}-fill`);
      assert.ok(sep(a, b) >= 30,
        `${PURPOSE_KEYS[i]} and ${PURPOSE_KEYS[j]} fills must be ${'>= 30'} degrees apart in hue (got ${Math.round(sep(a, b))})`);
    }
  }
});

test('S1: purpose helpers classify the canonical graph shapes', () => {
  assert.equal(nodePurpose(NODE({})), 'task');
  assert.equal(nodePurpose(NODE({ kind: 'gate', human_gate: true })), 'gate');
  assert.equal(nodePurpose(NODE({ human_gate: true })), 'gate');
  assert.equal(nodePurpose(NODE({ when: { node: 'a', status: 'done' } })), 'branch');
  assert.equal(nodePurpose(NODE({ loop: { max_iterations: 2, until: { status: 'done' } } })), 'loop');
  // A gate outranks a loop marker: the gate is the decision.
  assert.equal(nodePurpose(NODE({ human_gate: true, loop: { max_iterations: 2, until: { status: 'done' } } })), 'gate');
  // Only the canonical statuses are coloured; anything else reads as pending
  // (the raw word is still what the node prints).
  assert.equal(statusToken('done'), 'done');
  assert.equal(statusToken('working'), 'working');
  assert.equal(statusToken('blocked'), 'blocked');
  assert.equal(statusToken(null), 'pending');
  assert.equal(statusToken('weird-host-status'), 'pending');
  // Silhouettes stay inside the fixed node box so ports and edges keep geometry.
  assert.equal(nodeShapePath('task'), null, 'task uses the rounded rect');
  for (const p of ['gate', 'branch', 'loop']) {
    assert.ok(nodeShapePath(p), `${p} has an explicit silhouette path`);
  }
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

test('S2: the canvas renders a legend built from the same purpose tokens', async () => {
  const dom = makeDom();
  const dispose = mount(dom, FOUR_PURPOSES, {});
  try {
    await settle();
    const host = dom.window.document.getElementById('host');
    const legend = host.querySelector('.dy-wf-index');
    assert.ok(legend, 'the canvas states its visual vocabulary');
    assert.match(legend.getAttribute('aria-label'), /purpose/i);
    const text = legend.textContent;
    for (const p of ['task', 'gate', 'branch', 'loop']) {
      assert.match(text, new RegExp(PURPOSE_VISUALS[p].label, 'i'),
        `legend names the ${p} purpose`);
    }
    assert.match(text, /depends on/i, 'legend states the edge meaning');
    // The legend swatches are the purpose silhouettes and fills, not a second
    // hand-drawn vocabulary.
    const swatches = [...legend.querySelectorAll('.dy-wf-index-shape')];
    assert.equal(swatches.length, 4, 'one swatch per purpose present');
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
