import {test} from 'node:test';
import assert from 'node:assert/strict';


import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));

test('W5 live map attributes come from the canonical run projection', async () => {
  // Direct source evaluation avoids the bundler: the panel is a pure function
  // of its props, so read its JSX output through a minimal React stub.
  const stub = `
    let __i = 0; const __slots = new Map()
    export function useState(init){ const k = __i++; const has = __slots.has(k);
      const value = has ? __slots.get(k) : (typeof init==='function'?init():init);
      const set = (v) => { __slots.set(k, typeof v === 'function' ? v(value) : v); k_flush && k_flush() }
      return [value, set] }
    export function __resetState(){ __slots.clear(); __i = 0 }
    export function __beginRender(){ __i = 0 }
    let k_flush = null
    export function __onRender(fn){ k_flush = fn }
    export function useEffect(fn){ try { const r = fn?.(); if (r && typeof r?.then === 'function') r.catch(() => {}) } catch {} }
    export function useRef(v){ return {current: v} }
    export function jsxs(t, props){ return { t, props } }
    export function jsx(t, props){ return { t, props } }
    export const Fragment = Symbol.for('fragment')
  `;
  const fs = await import('node:fs');
  const os = await import('node:os');
  const path = await import('node:path');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'live-map-'));
  fs.writeFileSync(path.join(dir, 'react-stub.js'), stub);
  const contextStub = `
    export let _rest = null; export let _os = null; export let _toastId = 0;
    export const TOAST_EVENT = 'dockyard:toast';
    export function bindContext(){} export function api(p){ if (p && p.endsWith('/runs')) return Promise.resolve({ runs: globalThis.__LIVE_RUNS__ ?? [] }); return Promise.resolve({}) }
    export function __setRuns__(rows){ globalThis.__LIVE_RUNS__ = rows }
    export function emitToast(){}
    export function useDockyardStyles(){}
    export function useStylesheet(){}
  `;
  fs.writeFileSync(path.join(dir, 'context-stub.js'), contextStub);
  const mountStub = `
    export function mountDesktopWorkflowCanvas(){ return () => {} }
    export function validateConnection(nodes, from, to){ return null }
  `;
  fs.writeFileSync(path.join(dir, 'mount-stub.js'), mountStub);
  const source = fs.readFileSync(path.join(HERE, 'src', 'project', 'workflows.js'), 'utf8')
    .replace(/from '\.\.\/runtime\/react\.js'/g, `from '${path.join(dir, 'react-stub.js').replace(/\\/g, '/').replace(/^/, 'file://')}'`)
    .replace(/from '\.\/runtime\/context\.js'|from '\.\.\/runtime\/context\.js'/g, `from 'file://${path.join(dir, 'context-stub.js').replace(/\\\\/g, '/')}'`)
    .replace(/from '\.\.\/lib\/ui\.js'/g, `from 'file://${path.join(dir, 'ui-stub.js').replace(/\\\\/g, '/')}'`)
    .replace(/from '\.\.\/\.\.\/workflow-canvas-mount\.js'/g, `from 'file://${path.join(dir, 'mount-stub.js').replace(/\\\\/g, '/')}'`)
    // The shared planning wording has no imports of its own, so the real file loads as is.
    .replace(/from '\.\.\/lib\/plan-vocab\.js'/g, `from 'file://${path.join(HERE, 'src', 'lib', 'plan-vocab.js').replace(/\\\\/g, '/')}'`);
  const { __setRuns__ } = await import('file://' + path.join(dir, 'context-stub.js').replace(/\\\\/g, '/'));
  const runs = [{ run_key: 'r1', version: 1, status: 'running', nodes: [
    { node_id: 'a', title: 'Assemble', depends_on: [], human_gate: false, kind: 'task', status: 'done', task_ref: null, evidence_refs: [] },
    { node_id: 'g', title: 'Approve', depends_on: ['a'], human_gate: true, kind: 'gate', status: 'pending', task_ref: null, evidence_refs: [] },
  ] }];
  __setRuns__(runs);
  fs.writeFileSync(path.join(dir, 'ui-stub.js'), [
    "export function StatusTag(){ return { t: 'span', props: { children: '' } } }",
    "export function number(v){ return String(v ?? 0) }",
    "export function Button(props){ return { t: 'button', props } }",
  ].join('\n'));
  const moduleUrl = 'data:text/javascript;base64,' + Buffer.from(source).toString('base64');
  const { ExecutableWorkflowsPanel } = await import(moduleUrl);
  const project = { id: 'p1' };
  const workflows = [{ project_id: 'p1', name: 'release', version: 1, archived_at: null, definition: { nodes: [{ id: 'a', title: 'Assemble', depends_on: [], human_gate: false }, { id: 'g', title: 'Approve', depends_on: ['a'], human_gate: true }] } }];
  const react = await import('file://' + path.join(dir, 'react-stub.js').replace(/\\/g, '/'));
  react.__beginRender()
  let tree = ExecutableWorkflowsPanel({ project, workflows, runs, onRefresh: null, onOpenLibrary: null });
  await new Promise((resolve) => setImmediate(resolve));
  // Second pass renders the state the async loadRuns stored between passes.
  react.__beginRender()
  tree = ExecutableWorkflowsPanel({ project, workflows, runs, onRefresh: null, onOpenLibrary: null });
  const flatten = (node) => {
    if (!node || typeof node !== 'object') return [];
    if (Array.isArray(node)) return node.flatMap(flatten);
    const props = node.props ?? {};
    const own = props['data-wf-live-node'] ? [props] : [];
    const kids = Array.isArray(props.children) ? props.children.flatMap(flatten) : (props.children && typeof props.children === 'object' ? flatten(props.children) : []);
    return [...own, ...kids];
  };
  const rows = flatten(tree).filter((r) => r['data-wf-live-node']);
  assert.equal(rows.length, 2, 'both run nodes appear in the live map');
  const assemble = rows.find((r) => r['data-wf-live-node'] === 'a');
  const approve = rows.find((r) => r['data-wf-live-node'] === 'g');
  assert.equal(assemble['data-wf-needs-attention'], undefined);
  assert.equal(approve['data-wf-needs-attention'], 'true');
  assert.match(String(approve.children), /needs attention/);
  await rm(dir, { recursive: true, force: true });
});