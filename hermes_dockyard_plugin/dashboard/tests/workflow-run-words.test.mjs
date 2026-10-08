// A run's words on the canvas (08/10/2026, WORKFLOWS-R1.md engine round).
// Runs report Dockyard's words (backlog, in_progress, in_review, blocked,
// done); the canvas colours them as its four states and says round k of N,
// not needed, waiting, stuck after N rounds and needs your OK. Compiles the
// REAL src/workflow-canvas.ts with the repo's own esbuild, like
// workflow-node-visuals.test.mjs.
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
const outDir = mkdtempSync(join(tmpdir(), 'wf-run-words-'));
const compiled = join(outDir, 'workflow-canvas.mjs');
execFileSync(join(dash, 'node_modules', '.bin', 'esbuild'), [
  join(dash, 'src', 'workflow-canvas.ts'), '--bundle', '--format=esm', `--outfile=${compiled}`,
]);
const { mountWorkflowCanvas, statusToken, stepWord, needsPerson, turnHasCome } =
  await import('file://' + compiled.replace(/\\/g, '/'));

const NODE = (over) => ({
  node_id: 'x', title: 'Step', depends_on: [], human_gate: false, kind: 'task',
  task_ref: 't1', status: 'backlog', assignee: null, evidence_refs: [], ...over,
});
const RUN = (nodes) => ({
  run_key: 'r1', version: 1, status: 'pending', started_at: new Date().toISOString(),
  updated_at: new Date().toISOString(), nodes,
});
const LOOP = { max_iterations: 3, until: { status: 'done' } };

test('every word a run reports is coloured as one of the four states', () => {
  const cases = [
    ['backlog', 'pending'], ['in_progress', 'working'], ['in_review', 'working'],
    ['blocked', 'blocked'], ['done', 'done'],
    // history saved before 08/10/2026 may carry the board's own words
    ['triage', 'pending'], ['todo', 'pending'], ['ready', 'working'], ['running', 'working'],
    ['review', 'working'], ['archived', 'done'], [null, 'pending'], ['nonsense', 'pending'],
  ];
  for (const [word, token] of cases) assert.equal(statusToken(word), token, String(word));
});

test('a step its bot is working on says working, not pending (bug 11)', () => {
  assert.equal(stepWord(NODE({ status: 'in_progress' })), 'working');
  assert.equal(stepWord(NODE({ status: 'in_review' })), 'in review');
  assert.equal(stepWord(NODE({ status: 'backlog' })), 'pending');
});

test('a repeating step says which round it is on, and when it gave up', () => {
  assert.equal(stepWord(NODE({ loop: LOOP, iteration: 1, status: 'in_progress' })), 'working');
  assert.equal(stepWord(NODE({ loop: LOOP, iteration: 2, status: 'in_progress', state: 'repeating' })), 'round 2 of 3');
  assert.equal(stepWord(NODE({ loop: LOOP, iteration: 3, status: 'blocked', state: 'escalated' })), 'stuck after 3 rounds');
  assert.equal(needsPerson(NODE({ loop: LOOP, iteration: 3, status: 'blocked', state: 'escalated' })), true);
  assert.equal(stepWord(NODE({ loop: LOOP, iteration: 2, status: 'done', state: 'done' })), 'done');
});

test('a branch says waiting until it is decided, then not needed if skipped', () => {
  const waiting = NODE({ task_ref: null, status: null, state: 'waiting', when: { node: 'a', status: 'blocked' } });
  assert.equal(stepWord(waiting), 'waiting');
  const skipped = NODE({ task_ref: null, status: null, state: 'skipped', when: { node: 'a', status: 'blocked' } });
  assert.equal(stepWord(skipped), 'not needed');
  assert.equal(needsPerson(skipped), false);
});

test('an Ask me first step needs your OK only once its turn has come', () => {
  const before = NODE({ node_id: 'a', status: 'in_progress' });
  const asks = NODE({ node_id: 'b', depends_on: ['a'], ask_first: true });
  assert.equal(stepWord(asks, RUN([before, asks])), 'pending');
  assert.equal(needsPerson(asks, RUN([before, asks])), false);
  const done = { ...before, status: 'done' };
  assert.equal(turnHasCome(asks, RUN([done, asks])), true);
  assert.equal(stepWord(asks, RUN([done, asks])), 'needs your OK');
  assert.equal(needsPerson(asks, RUN([done, asks])), true);
});

test('an if-stuck step does not wait for the stuck step it is about', () => {
  const stuck = NODE({ node_id: 'a', status: 'blocked' });
  const alert = NODE({ node_id: 'b', depends_on: ['a'], when: { node: 'a', status: 'blocked' } });
  assert.equal(turnHasCome(alert, RUN([stuck, alert])), true);
  assert.equal(needsPerson(stuck, RUN([stuck, alert])), true);
});

test('a sign-off needs a person once its turn has come', () => {
  const work = NODE({ node_id: 'a', status: 'done' });
  const gate = NODE({ node_id: 'g', depends_on: ['a'], human_gate: true, kind: 'gate' });
  assert.equal(stepWord(gate, RUN([work, gate])), 'awaiting decision');
  assert.equal(needsPerson(gate, RUN([work, gate])), true);
  assert.equal(needsPerson(gate, RUN([{ ...work, status: 'in_progress' }, gate])), false);
});

test('the cards on the canvas say the same words, and a step not needed is dimmed', async () => {
  const dom = new JSDOM('<!doctype html><div id="host"></div>', {
    runScripts: 'outside-only', url: 'https://dashboard.local/', pretendToBeVisual: true,
  });
  dom.window.matchMedia = dom.window.matchMedia
    ?? ((q) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }));
  globalThis.document = dom.window.document;
  globalThis.matchMedia = dom.window.matchMedia;
  const run = RUN([
    NODE({ node_id: 'a', title: 'Reproduce', status: 'done' }),
    NODE({ node_id: 'b', title: 'Fix', depends_on: ['a'], status: 'in_progress', loop: LOOP, iteration: 2, state: 'repeating' }),
    NODE({ node_id: 'c', title: 'Tell me', depends_on: ['b'], task_ref: null, status: null, state: 'skipped', when: { node: 'b', status: 'blocked' } }),
  ]);
  const host = dom.window.document.getElementById('host');
  const dispose = mountWorkflowCanvas(host, 'p', 'w', async () => [run], { onApprove() {}, onReject() {} }, 0);
  try {
    await new Promise((r) => setTimeout(r, 250));
    const card = (id) => host.querySelector(`[data-node-id="${id}"]`);
    assert.equal(card('b').querySelector('.dy-wf-statustext').textContent, 'round 2 of 3');
    assert.equal(card('b').dataset.wfStatus, 'working');
    assert.equal(card('c').querySelector('.dy-wf-statustext').textContent, 'not needed');
    assert.ok(card('c').getAttribute('class').split(/\s+/).includes('skipped'));
    assert.match(card('b').getAttribute('aria-label'), /round 2 of 3/);
  } finally {
    dispose();
    delete globalThis.document;
    delete globalThis.matchMedia;
    dom.window.close();
  }
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
const closeDom = (dom) => { delete globalThis.document; delete globalThis.matchMedia; dom.window.close(); };
const settle = (ms = 250) => new Promise((r) => setTimeout(r, ms));

test('Retry says it failed when the board refuses, and Re-queued only once it agreed (bug 12)', async () => {
  for (const [answer, expected] of [[() => Promise.reject(new Error('409: transition refused')), 'Re-queue failed — retry'], [() => Promise.resolve({}), 'Re-queued ✓']]) {
    const dom = makeDom();
    const run = RUN([NODE({ node_id: 'a', title: 'Build', status: 'blocked', task_ref: 'W-1' })]);
    const host = dom.window.document.getElementById('host');
    const dispose = mountWorkflowCanvas(host, 'p', 'w', async () => [run], { onApprove() {}, onReject() {}, onRetry: answer }, 0);
    try {
      await settle();
      host.querySelector('[data-node-id="a"]').dispatchEvent(new dom.window.MouseEvent('dblclick', { bubbles: true }));
      const retry = [...host.querySelector('.dy-wf-passport').querySelectorAll('button')].find((b) => /re-?queue/i.test(b.textContent));
      retry.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
      await settle(60);
      assert.equal(retry.textContent, expected);
    } finally {
      dispose();
      closeDom(dom);
    }
  }
});

test('an arrow is live only into a step that has started, after the step before it is done', async () => {
  const dom = makeDom();
  const run = RUN([
    NODE({ node_id: 'a', title: 'Plan', status: 'done' }),
    NODE({ node_id: 'b', title: 'Build', depends_on: ['a'], status: 'backlog' }),
    NODE({ node_id: 'c', title: 'Test', depends_on: ['a'], status: 'in_progress' }),
  ]);
  const host = dom.window.document.getElementById('host');
  const dispose = mountWorkflowCanvas(host, 'p', 'w', async () => [run], { onApprove() {}, onReject() {} }, 0);
  try {
    await settle();
    const edge = (to) => host.querySelector(`path.dy-wf-edge[data-from="a"][data-to="${to}"]`);
    assert.ok(edge('b') && edge('c'), 'both arrows are drawn');
    assert.equal(edge('b').classList.contains('active'), false, 'Build has not started');
    assert.equal(edge('c').classList.contains('active'), true, 'Test has started');
  } finally {
    dispose();
    closeDom(dom);
  }
});
