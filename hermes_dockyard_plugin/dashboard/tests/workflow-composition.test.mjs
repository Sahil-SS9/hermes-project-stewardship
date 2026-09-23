// Composition regressions for the Workflows surface after the v6 recompose:
//   1. Lane bands are rendered from the SAME layout the nodes use — a run with
//      assignments bands by team; a run without renders the shape-derived
//      main/exception partition; a single band is never drawn.
//   2. The world box contains every rendered node, including a persisted
//      canvas_position that sits outside the computed layout (the measured
//      horizontal cut-off, 2026-09-22).
//   3. The equivalent list view is collapsed by default (canvas-first) and
//      still opens with one row per node.
// Runs the REAL src/workflow-canvas.ts compiled with esbuild inside jsdom.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';

const here = dirname(fileURLToPath(import.meta.url));
const dash = dirname(here);
const esbuildBin = join(dash, 'node_modules', '.bin', 'esbuild');
const outDir = mkdtempSync(join(tmpdir(), 'wf-compose-'));
const compiled = join(outDir, 'workflow-canvas.mjs');
execFileSync(esbuildBin, [
  join(dash, 'src', 'workflow-canvas.ts'),
  '--bundle', '--format=esm', `--outfile=${compiled}`,
]);
const { mountWorkflowCanvas, buildLayout, laneKeyOf, EXCEPTION_LANE_KEY } = await import(
  'file://' + compiled.replace(/\\/g, '/')
);

const NODE = (over) => ({
  node_id: 'a', title: 'Ingest', depends_on: [], human_gate: false,
  task_ref: null, kind: 'task', status: 'pending', assignee: null,
  evidence_refs: [], ...over,
});
const RUN = (nodes) => ({
  run_key: 'r1', version: 1, status: 'running',
  started_at: new Date(Date.now() - 30_000).toISOString(),
  updated_at: new Date().toISOString(), nodes,
});

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
const restore = (dom) => { delete globalThis.document; delete globalThis.matchMedia; dom.window.close(); };
const settle = (ms = 250) => new Promise((r) => setTimeout(r, ms));

function mount(dom, runs, handlers = {}, pollMs = 0) {
  return mountWorkflowCanvas(
    dom.window.document.getElementById('host'), 'p', 'w',
    async () => runs(), { onApprove: () => {}, onReject: () => {}, ...handlers }, pollMs,
  );
}

// ------------------------------------------------------------- 1. lanes ----

test('lanes: team assignments produce one band per real assignment', async () => {
  // Two real assignment values from the run projection — not a phase taxonomy.
  const run = RUN([
    NODE({ node_id: 'a', title: 'Plan', team: 'release-bots', status: 'done' }),
    NODE({ node_id: 'b', title: 'Build', team: 'release-bots', depends_on: ['a'] }),
    NODE({ node_id: 'c', title: 'Soak', team: 'verify-bots', depends_on: ['b'] }),
  ]);
  const dom = makeDom();
  const dispose = mount(dom, () => [run]);
  try {
    await settle();
    const host = dom.window.document.getElementById('host');
    const bands = [...host.querySelectorAll('.dy-wf-lane')];
    assert.equal(bands.length, 2, 'one band per team assignment');
    assert.deepEqual(bands.map((b) => b.dataset.lane).sort(), ['release-bots', 'verify-bots']);
    const labels = [...host.querySelectorAll('.dy-wf-lane-label')].map((l) => l.textContent);
    assert.deepEqual(labels.sort(), ['release-bots', 'verify-bots'],
      'the band label states the real assignment value');
    // The layout contract agrees with the DOM.
    const layout = buildLayout(run.nodes, { laneOf: laneKeyOf });
    assert.equal(layout.lanes.length, 2);
  } finally { dispose(); restore(dom); }
});

test('lanes: without assignments the bands are the real main/exception partition', async () => {
  const run = RUN([
    NODE({ node_id: 'a', title: 'Plan', status: 'done' }),
    NODE({ node_id: 'g', title: 'Approve', depends_on: ['a'], human_gate: true, kind: 'gate', status: 'pending' }),
    NODE({ node_id: 'b', title: 'Branch', depends_on: ['g'], status: 'blocked', when: { node: 'g', status: 'done' } }),
  ]);
  const dom = makeDom();
  const dispose = mount(dom, () => [run]);
  try {
    await settle();
    const host = dom.window.document.getElementById('host');
    const bands = [...host.querySelectorAll('.dy-wf-lane')];
    assert.equal(bands.length, 2, 'main path and exception path');
    const keys = bands.map((b) => b.dataset.lane).sort();
    assert.deepEqual(keys, [EXCEPTION_LANE_KEY, 'main-path'].sort());
    const exception = bands.find((b) => b.dataset.lane === EXCEPTION_LANE_KEY);
    assert.ok(exception.classList.contains('exception'),
      'the band carrying the branch/blocked node is marked as the exception path');
    const labels = [...host.querySelectorAll('.dy-wf-lane-label')].map((l) => l.textContent);
    assert.ok(labels.includes('Exception path') && labels.includes('Main path'));
  } finally { dispose(); restore(dom); }
});

test('lanes: a single resulting band is not drawn as a band', async () => {
  // Every node is a plain task with no assignment: one partition -> no bands.
  const run = RUN([
    NODE({ node_id: 'a', title: 'One', status: 'done' }),
    NODE({ node_id: 'b', title: 'Two', depends_on: ['a'], status: 'pending' }),
  ]);
  const dom = makeDom();
  const dispose = mount(dom, () => [run]);
  try {
    await settle();
    const host = dom.window.document.getElementById('host');
    assert.equal(host.querySelectorAll('.dy-wf-lane').length, 0,
      'no band is drawn when the graph states only one grouping');
    // The same run through the pure layout: lane grouping collapses to one.
    const layout = buildLayout(run.nodes, { laneOf: () => 'main-path' });
    assert.equal(layout.lanes.length, 1);
  } finally { dispose(); restore(dom); }
});

// -------------------------------------------------- 2. world containment ----

test('world box contains a persisted position that sits outside the layout', async () => {
  // A stale drag far right/below its computed cell: the frame must still show
  // it (the measured cut-off rendered such a node outside the clip).
  const run = RUN([
    NODE({ node_id: 'a', title: 'Plan', status: 'done', canvas_position: { x: 1450, y: 12 } }),
    NODE({ node_id: 'b', title: 'Build', depends_on: ['a'], status: 'working' }),
  ]);
  const dom = makeDom();
  const dispose = mount(dom, () => [run]);
  try {
    await settle();
    const host = dom.window.document.getElementById('host');
    const svg = host.querySelector('.dy-wf-svg');
    const vb = (svg.getAttribute('viewBox') || '').split(/\s+/).map(Number);
    assert.equal(vb.length, 4, 'viewBox is a four-number window');
    const [minX, minY, w, h] = vb;
    const nodeA = host.querySelector('[data-node-id="a"]');
    const t = (nodeA.getAttribute('transform') || '').match(/-?\d+(?:\.\d+)?/g).map(Number);
    const nx = t[0], ny = t[1];
    // The node box (NODE_W x NODE_H) must sit inside the world window.
    assert.ok(nx >= minX && nx + 208 <= minX + w,
      `node a x-range [${nx}, ${nx + 208}] must be inside [${minX}, ${minX + w}]`);
    assert.ok(ny >= minY && ny + 72 <= minY + h,
      `node a y-range [${ny}, ${ny + 72}] must be inside [${minY}, ${minY + h}]`);
    // And the persisted position is what rendered (no snap back to the grid).
    assert.equal(nx, 1450);
  } finally { dispose(); restore(dom); }
});

test('world box also contains positions above/left of the layout origin', async () => {
  const run = RUN([
    NODE({ node_id: 'a', title: 'Plan', status: 'done', canvas_position: { x: -120, y: -40 } }),
    NODE({ node_id: 'b', title: 'Build', depends_on: ['a'], status: 'working' }),
  ]);
  const dom = makeDom();
  const dispose = mount(dom, () => [run]);
  try {
    await settle();
    const host = dom.window.document.getElementById('host');
    const svg = host.querySelector('.dy-wf-svg');
    const [minX, minY, w, h] = (svg.getAttribute('viewBox') || '').split(/\s+/).map(Number);
    assert.ok(minX <= -120 && minY <= -40, 'the window origin follows the node');
    assert.ok(-120 + 208 <= minX + w && -40 + 72 <= minY + h, 'and the node is inside it');
    // The minimap dot is expressed in the same frame: not off-canvas.
    const dots = [...host.querySelectorAll('.dy-wf-minimap rect')].filter((r) => r.getAttribute('x') !== null);
    for (const dot of dots) {
      const x = Number(dot.getAttribute('x'));
      const y = Number(dot.getAttribute('y'));
      assert.ok(x >= -0.5 && y >= -0.5, `minimap dot at ${x},${y} must not be negative`);
    }
  } finally { dispose(); restore(dom); }
});

// ------------------------------------------------------- 3. list view ------

test('list view starts collapsed and opens with one row per node', async () => {
  const run = RUN([
    NODE({ node_id: 'a', title: 'Plan', status: 'done' }),
    NODE({ node_id: 'b', title: 'Build', depends_on: ['a'], status: 'working' }),
  ]);
  const dom = makeDom();
  const dispose = mount(dom, () => [run]);
  try {
    await settle();
    const host = dom.window.document.getElementById('host');
    const head = host.querySelector('.dy-wf-list-head');
    assert.equal(head.getAttribute('aria-expanded'), 'false', 'collapsed by default (canvas-first)');
    assert.equal(host.querySelector('.dy-wf-list-body').style.display, 'none');
    head.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
    assert.equal(head.getAttribute('aria-expanded'), 'true');
    assert.equal(host.querySelector('.dy-wf-list-body').style.display, 'block');
    const rows = [...host.querySelectorAll('[data-wf-list-row]')];
    assert.equal(rows.length, 2, 'one row per node once opened');
    assert.match(rows.find((r) => r.dataset.wfListRow === 'b').textContent, /Build/);
  } finally { dispose(); restore(dom); }
});
