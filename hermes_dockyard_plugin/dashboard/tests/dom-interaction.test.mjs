// DOM interaction tests: plugin registers with the host registry and
// renders the app shell. jsdom + the built bundle.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';

const bundle = readFileSync(new URL('../dist/index.js', import.meta.url), 'utf8');

function boot() {
  const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', {
    runScripts: 'outside-only',
    url: 'https://dashboard.local/',
  });
  const calls = [];
  dom.window.__HERMES_PLUGIN_SDK__ = {
    sdkVersion: '1.1.0',
    React: { createElement: (t, p, c) => ({ t, p, c }) },
    hooks: {
      useEffect: () => {},
      useRef: () => ({ current: null }),
    },
    fetchJSON: async () => ({}),
  };
  dom.window.__HERMES_PLUGINS__ = {
    register: (name, comp) => calls.push({ name, comp }),
  };
  dom.window.eval(bundle);
  return { dom, calls };
}

test('registers hermes-dockyard tab with the host registry', async () => {
  const { dom, calls } = boot();
  try {
    await new Promise((r) => setTimeout(r, 50)); // registration is async (whenReady)
    assert.equal(calls.length, 1);
    assert.equal(calls[0].name, 'hermes-dockyard');
    assert.equal(typeof calls[0].comp, 'function');
  } finally {
    dom.window.close();
  }
});

test('bundle is non-empty iife without external react import', () => {
  assert.ok(bundle.length > 1000);
  assert.ok(!/from\s+['"]react['"]/.test(bundle));
});

// --- Workflow canvas interaction tests ---
const FIXTURE_RUNS = {
  runs: [
    {
      run_key: 'r1', version: 1, status: 'running', started_at: null, updated_at: null,
      nodes: [
        { node_id: 'a', title: 'Ingest', depends_on: [], human_gate: false, task_ref: 'W-1', kind: 'task', status: 'done', assignee: 'bot-a', evidence_refs: ['ev1'] },
        { node_id: 'b', title: 'Approve gate', depends_on: ['a'], human_gate: true, task_ref: 'INIT-1', kind: 'gate', status: 'pending', assignee: null, evidence_refs: [] },
        { node_id: 'c', title: 'Ship', depends_on: ['b'], human_gate: false, task_ref: 'W-2', kind: 'task', status: 'pending', assignee: null, evidence_refs: [] },
      ],
    },
  ],
};

function bootWorkflow() {
  const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', {
    runScripts: 'outside-only', url: 'https://dashboard.local/',
  });
  const calls = [];
  let lastApprove = null; let lastReject = null;
  // No registry/React -> index.ts dev fallback mounts initApp directly into #root.
  dom.window.__HERMES_PLUGIN_SDK__ = {
    sdkVersion: '1.1.0',
    React: { createElement: (t, p, c) => ({ t, p, c }) },
    hooks: { useEffect: () => {}, useRef: () => ({ current: null }) },
    fetchJSON: async (url) => {
      if (url.endsWith('/dashboard')) {
        return { projects: [{ id: 'proj-x', health: 'healthy' }] };
      }
      if (url.includes('/workflows/') && url.endsWith('/runs')) {
        return FIXTURE_RUNS;
      }
      if (url.includes('/work-items/W-1')) {
        return {
          work_item: { ref: 'W-1', title: 'Ingest', status: 'done' },
          parent: null,
          children: [
            { ref: 'W-1a', title: 'Parse payload', status: 'done' },
            { ref: 'W-1b', title: 'Normalise', status: 'working' },
          ],
          history: [
            { at: '2026-08-30T12:00:00Z', summary: 'created from initiative' },
            { at: '2026-08-30T12:05:00Z', summary: 'status -> in_progress' },
          ],
        };
      }
      if (url.endsWith('/initiatives/INIT-1/approve')) { lastApprove = true; return {}; }
      if (url.endsWith('/initiatives/INIT-1/reject')) { lastReject = true; return {}; }
      return {};
    },
  };
  dom.window.eval(bundle);
  return { dom, calls, getApprove: () => lastApprove, getReject: () => lastReject };
}

test('workflow tab renders canvas with nodes and edges, then opens gate passport', async () => {
  const { dom } = bootWorkflow();
  await new Promise((r) => setTimeout(r, 80)); // initApp mounts synchronously via dev fallback
  // Switch to Workflow tab.
  const tabs = [...dom.window.document.querySelectorAll('button[data-tab]')];
  const wfTab = tabs.find((t) => t.dataset.tab === 'workflow');
  assert.ok(wfTab, 'Workflow tab should exist');
  wfTab.click();
  await new Promise((r) => setTimeout(r, 200)); // allow async load + mount + poll
  const svg = dom.window.document.querySelector('svg.dy-wf-svg');
  assert.ok(svg, 'canvas svg should render');
  const nodes = dom.window.document.querySelectorAll('.dy-wf-node');
  assert.ok(nodes.length >= 3, `expected >=3 nodes, got ${nodes.length}`);
  const edges = dom.window.document.querySelectorAll('.dy-wf-edge');
  assert.ok(edges.length >= 2, `expected >=2 edges, got ${edges.length}`);
  // Click the gate node -> passport with Approve/Reject.
  const gate = [...nodes].find((n) => (n.getAttribute('class') || '').split(/\s+/).includes('pending'));
  assert.ok(gate, 'gate node should be present');
  gate.dispatchEvent(new dom.window.Event('click'));
  const passport = dom.window.document.querySelector('.dy-wf-passport');
  assert.ok(passport, 'passport should open on gate click');
  assert.ok(passport.querySelector('button'), 'passport should have action buttons');
  // LOD attribute present (v3 mechanic)
  const lod = dom.window.document.querySelector('svg.dy-wf-svg');
  assert.ok(['map', 'read', 'full'].includes(lod.getAttribute('data-lod')), 'data-lod should be set');
  // arrow markers exist (agenttrail edge vocabulary)
  assert.ok(lod.querySelector('marker'), 'arrow markers should exist');
  // Expand live detail on the done TASK node (W-1 has task_ref + fixture detail)
  const taskNode = [...dom.window.document.querySelectorAll('.dy-wf-node')].find((n) =>
    (n.getAttribute('class') || '').split(/\s+/).includes('done'));
  assert.ok(taskNode, 'done task node should be present');
  taskNode.dispatchEvent(new dom.window.Event('click'));
  await new Promise((r) => setTimeout(r, 80));
  const taskPassport = dom.window.document.querySelector('.dy-wf-passport');
  const expandHead = taskPassport.querySelector('.dy-wf-expand-head');
  assert.ok(expandHead, 'expansion toggle should exist');
  expandHead.click();
  await new Promise((r) => setTimeout(r, 150)); // lazy fetch
  const body = taskPassport.querySelector('.dy-wf-expand-body');
  assert.ok(body.querySelector('.dy-activity-item'), 'activity thread should render');
  assert.ok(body.querySelectorAll('.dy-taskitem').length >= 2, 'sub-task list should render');
  // Clean up the canvas poll timer so the test process can exit.
  const host = dom.window.document.querySelector('.dy-wf-host');
  if (host && typeof host.dyDispose === 'function') host.dyDispose();
  // jsdom keeps the event loop alive while windows are open; closing them
  // lets node:test exit promptly instead of idling to the file timeout.
  await new Promise((r) => setTimeout(r, 50));
  dom.window.close();
});

