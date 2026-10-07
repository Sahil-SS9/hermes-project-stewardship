// Steps open on double-click (Sahil, 07/10/2026): one click selects a step,
// a drag moves it, and only a double-click (or Enter) opens its details
// panel. A small note on hover says so, and screen readers get the same
// instruction. jsdom + the built bundle, same harness as dom-interaction.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';

const bundle = readFileSync(new URL('../dist/index.js', import.meta.url), 'utf8');

const RUNS = {
  runs: [{
    run_key: 'r1', version: 1, status: 'running', started_at: null, updated_at: null,
    nodes: [
      { node_id: 'a', title: 'Ingest', depends_on: [], human_gate: false, task_ref: 'W-1', kind: 'task', status: 'done', assignee: 'bot-a', evidence_refs: [] },
      { node_id: 'b', title: 'Approve gate', depends_on: ['a'], human_gate: true, task_ref: 'INIT-1', kind: 'gate', status: 'pending', assignee: null, evidence_refs: [] },
      { node_id: 'c', title: 'Ship', depends_on: ['b'], human_gate: false, task_ref: 'W-2', kind: 'task', status: 'pending', assignee: null, evidence_refs: [] },
    ],
  }],
};

async function openCanvas() {
  const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', {
    runScripts: 'outside-only', url: 'https://dashboard.local/',
  });
  dom.window.__HERMES_PLUGIN_SDK__ = {
    sdkVersion: '1.1.0',
    React: { createElement: (t, p, c) => ({ t, p, c }) },
    hooks: { useEffect: () => {}, useRef: () => ({ current: null }) },
    fetchJSON: async (url) => {
      if (url.endsWith('/dashboard')) return { projects: [{ id: 'proj-x', health: 'healthy' }] };
      if (url.includes('/workflows/') && url.endsWith('/runs')) return RUNS;
      return {};
    },
  };
  dom.window.eval(bundle);
  await new Promise((r) => setTimeout(r, 80));
  [...dom.window.document.querySelectorAll('button[data-tab]')].find((t) => t.dataset.tab === 'workflow').click();
  await new Promise((r) => setTimeout(r, 200));
  const doc = dom.window.document;
  const node = (id) => doc.querySelector(`.dy-wf-node[data-node-id="${id}"]`);
  const panelTitle = () => doc.querySelector('.dy-wf-passport .dy-wf-pp-head h3')?.textContent ?? null;
  const selected = () => [...doc.querySelectorAll('.dy-wf-node.dy-wf-selected')].map((g) => g.getAttribute('data-node-id'));
  const fire = (target, type, Ctor = dom.window.MouseEvent) => target.dispatchEvent(new Ctor(type, { bubbles: true, cancelable: true }));
  const close = async () => {
    doc.querySelector('.dy-wf-host')?.dyDispose?.();
    await new Promise((r) => setTimeout(r, 50));
    dom.window.close();
  };
  assert.ok(node('a') && node('b') && node('c'), 'the three steps render');
  return { dom, doc, node, panelTitle, selected, fire, close };
}

test('one click selects a step without opening its details; a double-click opens them', async () => {
  const c = await openCanvas();
  try {
    c.fire(c.node('c'), 'click');
    assert.deepEqual(c.selected(), ['c'], 'a click selects the step');
    assert.equal(c.panelTitle(), null, 'a click must not open the details panel');
    c.fire(c.node('c'), 'dblclick');
    assert.equal(c.panelTitle(), 'Ship', 'a double-click opens the step details');
    assert.deepEqual(c.selected(), ['c']);
    // Clicking the open step again (or dragging it) keeps its panel.
    c.fire(c.node('c'), 'click');
    assert.equal(c.panelTitle(), 'Ship');
    // Selecting another step closes the panel that belonged to the old one.
    c.fire(c.node('a'), 'click');
    assert.deepEqual(c.selected(), ['a']);
    assert.equal(c.panelTitle(), null, 'selecting another step closes the open panel');
  } finally {
    await c.close();
  }
});

test('Enter opens a step from the keyboard', async () => {
  const c = await openCanvas();
  try {
    c.node('a').dispatchEvent(new c.dom.window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    assert.equal(c.panelTitle(), 'Ingest');
  } finally {
    await c.close();
  }
});

test('hovering a step shows a small note: double-click to open details', async () => {
  const c = await openCanvas();
  try {
    const hint = c.doc.querySelector('[data-wf-open-hint]');
    assert.ok(hint, 'the canvas has the hover note');
    assert.equal(hint.hidden, true, 'hidden until a step is hovered');
    c.fire(c.node('b'), 'pointerenter');
    await new Promise((r) => setTimeout(r, 650));
    assert.equal(hint.hidden, false, 'shown while a step is hovered');
    assert.equal(hint.textContent, 'Double-click to open details');
    assert.equal(hint.getAttribute('role'), 'tooltip');
    c.fire(c.node('b'), 'pointerleave');
    assert.equal(hint.hidden, true, 'gone when the pointer leaves');
    // Pressing a step (a click or the start of a drag) hides it at once.
    c.fire(c.node('c'), 'pointerenter');
    c.fire(c.node('c'), 'pointerdown');
    await new Promise((r) => setTimeout(r, 650));
    assert.equal(hint.hidden, true, 'not shown once the step is pressed');
    // No note over a step whose details are already open.
    c.fire(c.node('a'), 'dblclick');
    c.fire(c.node('a'), 'pointerenter');
    await new Promise((r) => setTimeout(r, 650));
    assert.equal(hint.hidden, true, 'not shown over the open step');
  } finally {
    await c.close();
  }
});

test('screen readers hear how to open a step', async () => {
  const c = await openCanvas();
  try {
    for (const id of ['a', 'b', 'c']) {
      const ref = c.node(id).getAttribute('aria-describedby');
      const help = ref ? c.doc.getElementById(ref) : null;
      assert.ok(help, `step ${id}: aria-describedby points at a real element (was a dangling id)`);
      assert.match(help.textContent, /Double-click a step, or press Enter, to open its details/);
    }
  } finally {
    await c.close();
  }
});
