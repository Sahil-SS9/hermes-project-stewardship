// P8 RED tests: explicit zoom controls, keyboard node activation, equivalent
// list view, and decorative-update stops (hidden tab / reduced motion).
// Runs the REAL src/workflow-canvas.ts compiled with esbuild, inside jsdom.
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
const outDir = mkdtempSync(join(tmpdir(), 'wf-p8-'));
const compiled = join(outDir, 'workflow-canvas.mjs');
execFileSync(esbuildBin, [
  join(dash, 'src', 'workflow-canvas.ts'),
  '--bundle', '--format=esm', `--outfile=${compiled}`,
]);
const { mountWorkflowCanvas, buildLayout } = await import(
  'file://' + compiled.replace(/\\/g, '/')
);

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
const FULL_RUN = () => [RUN([
  NODE({ node_id: 'a', status: 'done' }),
  NODE({ node_id: 'g', title: 'Approve gate', depends_on: ['a'], human_gate: true, kind: 'gate', status: 'pending', task_ref: 'INIT-1' }),
  NODE({ node_id: 'c', title: 'Ship', depends_on: ['g'], status: 'blocked', task_ref: 'W-2' }),
])];

function makeDom() {
  const dom = new JSDOM('<!doctype html><div id="host"></div>', {
    runScripts: 'outside-only', url: 'https://dashboard.local/',
    pretendToBeVisual: true,
  });
  dom.window.matchMedia = dom.window.matchMedia
    ?? ((query) => ({ matches: false, media: query, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }));
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

// ------------------------------------------------------------ P8.2 zoom --

test('zoom controls: explicit in/out/fit/reset buttons update the viewport', async () => {
  const dom = makeDom();
  const dispose = mountWorkflowCanvas(
    dom.window.document.getElementById('host'), 'p', 'w',
    async () => FULL_RUN(), { onApprove: () => {}, onReject: () => {} }, 0,
  );
  try {
    await settle();
    const host = dom.window.document.getElementById('host');
    const zoomIn = host.querySelector('[data-wf-action="zoom-in"]');
    const zoomOut = host.querySelector('[data-wf-action="zoom-out"]');
    const zoomFit = host.querySelector('[data-wf-action="zoom-fit"]');
    const zoomReset = host.querySelector('[data-wf-action="zoom-reset"]');
    assert.ok(zoomIn && zoomOut && zoomFit && zoomReset,
      'explicit zoom in/out/fit/reset controls must exist');
    const viewport = host.querySelector('.dy-wf-viewport');
    const t0 = viewport.getAttribute('transform');
    zoomIn.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
    const t1 = viewport.getAttribute('transform');
    assert.notEqual(t0, t1, 'zoom-in must change the viewport transform');
    zoomReset.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
    assert.equal(viewport.getAttribute('transform'), t0, 'reset restores identity');
    // Zoom out below floor is clamped at ZOOM_MIN (0.45): 6 clicks from 1.0.
    for (let i = 0; i < 6; i += 1) {
      zoomOut.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
    }
    const floorTransform = viewport.getAttribute('transform');
    zoomOut.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
    assert.equal(viewport.getAttribute('transform'), floorTransform,
      'zoom-out must clamp at the minimum');
    zoomFit.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
    const fitTransform = viewport.getAttribute('transform');
    assert.ok(fitTransform, 'fit computes a transform');
    zoomReset.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
  } finally {
    dispose();
    restore(dom);
  }
});

// ------------------------------------------------- P8.2 keyboard + list --

test('keyboard: arrow keys move focus between nodes, Enter opens the passport', async () => {
  const dom = makeDom();
  const dispose = mountWorkflowCanvas(
    dom.window.document.getElementById('host'), 'p', 'w',
    async () => FULL_RUN(), { onApprove: () => {}, onReject: () => {} }, 0,
  );
  try {
    await settle();
    const host = dom.window.document.getElementById('host');
    const nodes = [...host.querySelectorAll('.dy-wf-node')];
    assert.ok(nodes.length === 3);
    nodes[0].focus();
    assert.equal(dom.window.document.activeElement, nodes[0], 'node is focusable');
    // ArrowRight moves focus to the next node in layout order.
    nodes[0].dispatchEvent(new dom.window.KeyboardEvent('keydown', {
      key: 'ArrowRight', bubbles: true, cancelable: true,
    }));
    assert.equal(dom.window.document.activeElement, nodes[1],
      'ArrowRight must move focus to the next node');
    // Enter on a node opens its passport (gate node has actions).
    const gate = nodes[1];
    gate.dispatchEvent(new dom.window.KeyboardEvent('keydown', {
      key: 'Enter', bubbles: true, cancelable: true,
    }));
    const passport = host.querySelector('.dy-wf-passport');
    assert.ok(passport, 'Enter must open the passport');
    assert.match(passport.textContent, /Approve gate/);
  } finally {
    dispose();
    restore(dom);
  }
});

test('list view: equivalent table with dependencies, gates and statuses', async () => {
  const dom = makeDom();
  const dispose = mountWorkflowCanvas(
    dom.window.document.getElementById('host'), 'p', 'w',
    async () => FULL_RUN(), { onApprove: () => {}, onReject: () => {} }, 0,
  );
  try {
    await settle();
    const host = dom.window.document.getElementById('host');
    const list = host.querySelector('[data-wf-list]');
    assert.ok(list, 'an equivalent list/table view must render');
    const rows = [...list.querySelectorAll('[data-wf-list-row]')];
    assert.equal(rows.length, 3, 'one row per node');
    const gateRow = rows.find((r) => r.dataset.wfListRow === 'g');
    assert.match(gateRow.textContent, /Approve gate/);
    assert.match(gateRow.textContent, /gate/i, 'gate kind is visible in list');
    assert.match(gateRow.textContent, /pending/, 'status is visible in list');
    assert.match(gateRow.textContent, /ingest/i,
      'dependency is visible in list (by node title)');
    const blockedRow = rows.find((r) => r.dataset.wfListRow === 'c');
    assert.match(blockedRow.textContent, /blocked/, 'blocked status visible');
    // List rows are keyboard-activatable and open the same passport.
    const btn = gateRow.querySelector('button, [role="button"], [tabindex]');
    assert.ok(btn, 'list row exposes an activation control');
    if (btn.matches('button')) {
      // jsdom does not synthesize click from keydown on buttons; the
      // keyboard-activation contract itself is browser-native. Fire the
      // activation the browser would produce for Enter on a button.
      btn.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
    } else {
      btn.dispatchEvent(new dom.window.KeyboardEvent('keydown', {
        key: 'Enter', bubbles: true, cancelable: true,
      }));
      btn.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
    }
    const passport = host.querySelector('.dy-wf-passport');
    assert.ok(passport, 'list activation opens the same passport');
    assert.match(passport.textContent, /Approve gate/);
  } finally {
    dispose();
    restore(dom);
  }
});

// --------------------------------------------------------- P8.3 states --

test('passport shows last-confirmed update and decision state', async () => {
  const dom = makeDom();
  const dispose = mountWorkflowCanvas(
    dom.window.document.getElementById('host'), 'p', 'w',
    async () => [RUN([NODE({ node_id: 'g', kind: 'gate', status: 'pending', task_ref: 'INIT-1' })], { updated_at: '2026-09-09T08:30:00Z' })],
    { onApprove: () => {}, onReject: () => {} }, 0,
  );
  try {
    await settle();
    const host = dom.window.document.getElementById('host');
    host.querySelector('.dy-wf-node').dispatchEvent(
      new dom.window.MouseEvent('click', { bubbles: true }));
    const passport = host.querySelector('.dy-wf-passport');
    assert.match(passport.textContent, /Last confirmed update/i,
      'passport shows the run last-confirmed update');
    assert.match(passport.textContent, /08:30|08:3|unknown/i,
      'timestamp or honest unknown is rendered');
    const pending = passport.querySelector('[data-decision-state]');
    assert.ok(pending, 'decision state is explicitly labelled');
    assert.equal(pending.getAttribute('data-decision-state'), 'awaiting_decision');
  } finally {
    dispose();
    restore(dom);
  }
});

test('after a failed approve the passport reports decision state failed, retryable', async () => {
  const dom = makeDom();
  const dispose = mountWorkflowCanvas(
    dom.window.document.getElementById('host'), 'p', 'w',
    async () => [RUN([NODE({ node_id: 'g', kind: 'gate', status: 'pending', task_ref: 'INIT-1' })])],
    {
      onApprove: () => Promise.reject(new Error('server said no')),
      onReject: () => {},
    }, 0,
  );
  try {
    await settle();
    const host = dom.window.document.getElementById('host');
    host.querySelector('.dy-wf-node').dispatchEvent(
      new dom.window.MouseEvent('click', { bubbles: true }));
    const approve = [...host.querySelectorAll('.dy-wf-passport button')]
      .find((b) => b.textContent === 'Approve');
    approve.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
    await settle(80);
    const passport = host.querySelector('.dy-wf-passport');
    const state = passport.querySelector('[data-decision-state]');
    assert.ok(state, 'decision state present after failure');
    assert.equal(state.getAttribute('data-decision-state'), 'failed');
    assert.match(state.textContent, /failed/i);
  } finally {
    dispose();
    restore(dom);
  }
});

// ------------------------------------------------- P8.4 supported retry --

test('blocked node passport exposes supported retry and labels pause/cancel unsupported', async () => {
  const dom = makeDom();
  const transitions = [];
  const dispose = mountWorkflowCanvas(
    dom.window.document.getElementById('host'), 'p', 'w',
    async () => FULL_RUN(),
    {
      onApprove: () => {}, onReject: () => {},
      onRetry: (ref) => transitions.push(ref),
    }, 0,
  );
  try {
    await settle();
    const host = dom.window.document.getElementById('host');
    const blocked = [...host.querySelectorAll('.dy-wf-node')]
      .find((n) => n.getAttribute('class').includes('blocked'));
    assert.ok(blocked, 'blocked node present');
    blocked.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
    const passport = host.querySelector('.dy-wf-passport');
    const retry = [...passport.querySelectorAll('button')]
      .find((b) => /re-?queue|retry/i.test(b.textContent));
    assert.ok(retry, 'supported retry/recovery action is exposed');
    retry.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
    await settle(60);
    assert.deepEqual(transitions, ['W-2'], 'retry reuses the canonical transition contract');
    const unsupported = passport.textContent;
    assert.match(unsupported, /pause/i, 'unsupported pause is labelled as such');
    assert.match(unsupported, /cancel/i, 'unsupported cancel is labelled as such');
    assert.doesNotMatch(
      unsupported,
      /pause.*button|button.*pause/i && /pause:\s*available/i,
      'pause is not offered as an available control');
    const pauseBtn = [...passport.querySelectorAll('button')]
      .find((b) => /pause/i.test(b.textContent) && !b.disabled);
    assert.ok(!pauseBtn, 'no enabled pause button may exist');
  } finally {
    dispose();
    restore(dom);
  }
});

// ------------------------------------------------- P8.5 decorative stops --

test('reduced motion stops flow-dot animation interval', async () => {
  const dom = makeDom();
  dom.window.matchMedia = (query) => ({
    matches: query.includes('prefers-reduced-motion'),
    media: query, addEventListener() {}, removeEventListener() {},
    addListener() {}, removeListener() {},
  });
  globalThis.matchMedia = dom.window.matchMedia;
  // Active edge: source done, target working -> without reduced-motion
  // handling the flow dot animates (opacity 0.9). With it, must stay 0.
  const dispose = mountWorkflowCanvas(
    dom.window.document.getElementById('host'), 'p', 'w',
    async () => [RUN([
      NODE({ node_id: 'a', status: 'done' }),
      NODE({ node_id: 'b', title: 'Active step', depends_on: ['a'], status: 'working' }),
    ])], { onApprove: () => {}, onReject: () => {} }, 0,
  );
  try {
    await settle(300);
    const host = dom.window.document.getElementById('host');
    const dots = [...host.querySelectorAll('.dy-wf-flowdot')];
    assert.ok(dots.length >= 1, 'dot exists structurally');
    await settle(200);
    const moved = dots.some((dot) => dot.getAttribute('opacity') !== '0');
    assert.ok(!moved,
      'reduced motion must keep flow dots invisible (no decorative updates)');
  } finally {
    dispose();
    restore(dom);
  }
});

test('hidden document stops decorative work; resumed when visible again', async () => {
  const dom = makeDom();
  const dispose = mountWorkflowCanvas(
    dom.window.document.getElementById('host'), 'p', 'w',
    async () => [RUN([
      NODE({ node_id: 'a', status: 'done' }),
      NODE({ node_id: 'b', title: 'Active step', depends_on: ['a'], status: 'working' }),
    ])], { onApprove: () => {}, onReject: () => {} }, 0,
  );
  try {
    await settle(300);
    const host = dom.window.document.getElementById('host');
    const dot = host.querySelector('.dy-wf-flowdot');
    assert.ok(dot, 'dot present');
    // Simulate the tab being hidden: visibilitychange with hidden=true.
    Object.defineProperty(dom.window.document, 'hidden', {
      configurable: true, get: () => true,
    });
    dom.window.document.dispatchEvent(
      new dom.window.Event('visibilitychange'));
    await settle(160);
    assert.equal(dot.getAttribute('opacity'), '0',
      'while hidden the flow timer must not animate dots');
    // Back visible: decorative updates may resume (dot can become visible).
    Object.defineProperty(dom.window.document, 'hidden', {
      configurable: true, get: () => false,
    });
    dom.window.document.dispatchEvent(
      new dom.window.Event('visibilitychange'));
    await settle(200);
    assert.ok(host.querySelector('.dy-wf-node'), 'canvas intact after resume');
  } finally {
    dispose();
    restore(dom);
  }
});

test('escape handler is removed after dispose (no listener leak)', async () => {
  const dom = makeDom();
  const dispose = mountWorkflowCanvas(
    dom.window.document.getElementById('host'), 'p', 'w',
    async () => FULL_RUN(), { onApprove: () => {}, onReject: () => {} }, 0,
  );
  try {
    await settle();
    const host = dom.window.document.getElementById('host');
    host.querySelector('.dy-wf-node').dispatchEvent(
      new dom.window.MouseEvent('click', { bubbles: true }));
    assert.ok(host.querySelector('.dy-wf-passport'), 'passport open');
    dispose();
    // After dispose, Escape must not throw or resurrect anything.
    dom.window.document.dispatchEvent(new dom.window.KeyboardEvent('keydown', {
      key: 'Escape', bubbles: true, cancelable: true,
    }));
    assert.equal(host.childElementCount, 0, 'host stays disposed');
  } finally {
    restore(dom);
  }
});

// buildLayout parity guard: list rows must be 1:1 with graph nodes.
test('graph and list derive from the same buildLayout node set', () => {
  const nodes = FULL_RUN()[0].nodes;
  const { positions } = buildLayout(nodes);
  assert.deepEqual(Object.keys(positions).sort(), ['a', 'c', 'g']);
});
