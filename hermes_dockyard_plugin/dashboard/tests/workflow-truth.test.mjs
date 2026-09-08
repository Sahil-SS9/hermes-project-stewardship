// P1.9 workflow-truth regressions: timer truth, stale/late-response guards,
// no premature action success. Runs the REAL src/workflow-canvas.ts, compiled
// with the repo's own esbuild, inside jsdom with a controllable clock.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { JSDOM } from 'jsdom';

const here = dirname(fileURLToPath(import.meta.url)); // dashboard/tests
const dash = dirname(here); // dashboard root
const require_ = createRequire(import.meta.url);
const esbuildBin = join(dash, 'node_modules', '.bin', 'esbuild');

// Compile the real source once per run into a temp ESM bundle.
const outDir = mkdtempSync(join(tmpdir(), 'wf-truth-'));
const compiled = join(outDir, 'workflow-canvas.mjs');
execFileSync(esbuildBin, [
  join(dash, 'src', 'workflow-canvas.ts'),
  '--bundle', '--format=esm', `--outfile=${compiled}`,
]);
const { mountWorkflowCanvas } = await import(
  'file://' + compiled.replace(/\\/g, '/')
);

const NODE = (over) => ({
  node_id: 'a', title: 'Ingest', depends_on: [], human_gate: false,
  task_ref: null, kind: 'task', status: 'working', assignee: null,
  evidence_refs: [], ...over,
});
const RUN = (nodes, over) => ({
  run_key: 'r1', version: 1, status: 'running',
  started_at: null, updated_at: null, nodes, ...over,
});
const gate = (over) => NODE({
  node_id: 'g', title: 'Approve gate', depends_on: ['a'], human_gate: true,
  task_ref: 'INIT-1', kind: 'gate', status: 'pending', ...over,
});

// Install a fake Date BEFORE mount so the module reads our clock.
function installFakeClock(dom, initialOffsetMs) {
  const Real = dom.window.Date;
  let offset = initialOffsetMs;
  class FakeDate extends Real {
    constructor(...args) {
      if (args.length === 0) super(Real.now() + offset);
      else super(...args);
    }
    static now() { return Real.now() + offset; }
  }
  dom.window.Date = FakeDate;
  return { advance: (ms) => { offset += ms; } };
}

function boot(dom) {
  // The compiled module resolves bare `document` at call time -> point the
  // node global at the jsdom document for the duration of the test.
  globalThis.document = dom.window.document;
  return () => { delete globalThis.document; };
}

function makeDom() {
  const dom = new JSDOM('<!doctype html><div id="host"></div>', {
    runScripts: 'outside-only', url: 'https://dashboard.local/',
    pretendToBeVisual: true,
  });
  return dom;
}

test('workflow timer uses start time, not refresh time or animation ticks', async () => {
  const dom = makeDom();
  const restoreDoc = boot(dom);
  // Base = real wall clock minus 90s; the bundle reads Node's Date.now().
  const updated = new Date(Date.now() - 90_000).toISOString();
  const runs = [RUN([NODE()], { started_at: updated, updated_at: new Date().toISOString() })];
  const dispose = mountWorkflowCanvas(
    dom.window.document.getElementById('host'), 'p', 'main',
    async () => runs, { onApprove: () => {}, onReject: () => {} }, 0,
  );
  try {
    await new Promise((r) => setTimeout(r, 300)); // ~1s-ish after mount, < clock tick drift
    const timer = dom.window.document.querySelector('text.dy-wf-timer');
    assert.ok(timer, 'working node renders an elapsed clock');
    const atStart = timer.textContent;
    assert.match(atStart, /^Workflow: 01:3[0-2]$/, `timer should show ~01:30 from started_at, got ${atStart}`);
    await new Promise((r) => setTimeout(r, 2300)); // 2-3 real clock ticks
    const later = dom.window.document.querySelector('.dy-wf-timer').textContent;
    assert.match(later, /^Workflow: 01:3[2-5]$/, `timer should advance by real seconds (~2), got ${later}`);
    assert.ok(!/^00:/.test(later), 'timer must not restart from zero / tick at 40ms rate');
  } finally {
    dispose();
    restoreDoc();
    dom.window.close();
  }
});

test('timer shows unavailable without a start even when refresh time exists', async () => {
  const dom = makeDom();
  const restoreDoc = boot(dom);
  const runs = [RUN([NODE()], { updated_at: new Date().toISOString() })];
  const dispose = mountWorkflowCanvas(
    dom.window.document.getElementById('host'), 'p', 'w',
    async () => runs, { onApprove: () => {}, onReject: () => {} }, 0,
  );
  try {
    await new Promise((r) => setTimeout(r, 1200)); // long enough for old 40ms bug to fabricate >00:25
    const timer = dom.window.document.querySelector('.dy-wf-timer');
    assert.ok(timer, 'working node still renders a clock slot');
    assert.equal(timer.textContent, 'Workflow: unavailable');
  } finally {
    dispose();
    restoreDoc();
    dom.window.close();
  }
});

test('frame re-renders when payload changes but node_id/status are unchanged', async () => {
  const dom = makeDom();
  const restoreDoc = boot(dom);
  const frames = [
    [RUN([NODE({ assignee: null, evidence_refs: [] })], { run_key: 'r1', version: 1, updated_at: '2026-09-08T10:00:00Z' })],
    [RUN([NODE({ assignee: 'human-2', evidence_refs: ['ev-9'] })], { run_key: 'r2', version: 2, updated_at: '2026-09-08T10:05:00Z' })],
  ];
  let call = 0;
  const dispose = mountWorkflowCanvas(
    dom.window.document.getElementById('host'), 'p', 'w',
    async () => frames[Math.min(call++, 1)], { onApprove: () => {}, onReject: () => {} }, 50,
  );
  try {
    await new Promise((r) => setTimeout(r, 250)); // first frame + 2-3 polls
    const node = dom.window.document.querySelector('.dy-wf-node');
    assert.ok(node, 'node renders');
    assert.match(node.textContent, /human-2/, 'changed assignee must reach the canvas');
    const passport = dom.window.document.querySelector('.dy-wf-passport');
    node.dispatchEvent(new dom.window.Event('click'));
    assert.ok(passport, 'passport opens');
    assert.match(dom.window.document.querySelector('.dy-wf-passport').textContent, /ev-9/, 'changed evidence must be visible');
  } finally {
    dispose();
    restoreDoc();
    dom.window.close();
  }
});

test('fetch failure shows a stale indicator; recovery hides it', async () => {
  const dom = makeDom();
  const restoreDoc = boot(dom);
  const good = [RUN([NODE()])];
  let fail = false;
  const dispose = mountWorkflowCanvas(
    dom.window.document.getElementById('host'), 'p', 'w',
    async () => { if (fail) throw new Error('down'); return good; },
    { onApprove: () => {}, onReject: () => {} }, 50,
  );
  try {
    await new Promise((r) => setTimeout(r, 150));
    assert.ok(!dom.window.document.querySelector('.dy-wf-stale'), 'no stale marker while healthy');
    fail = true;
    await new Promise((r) => setTimeout(r, 250));
    const stale = dom.window.document.querySelector('.dy-wf-stale');
    assert.ok(stale, 'stale indicator appears on refresh failure');
    assert.ok(dom.window.document.querySelector('.dy-wf-node'), 'last good frame is retained');
    fail = false;
    await new Promise((r) => setTimeout(r, 250));
    assert.ok(!dom.window.document.querySelector('.dy-wf-stale'), 'stale indicator clears on recovery');
  } finally {
    dispose();
    restoreDoc();
    dom.window.close();
  }
});

test('approve failure shows failure, never a success claim; duplicate click fires once; success only after server confirms', async () => {
  const dom = makeDom();
  const restoreDoc = boot(dom);
  const calls = [];
  let rejectMode = true;
  let resolveAction;
  const runs = [RUN([NODE({ node_id: 'g', kind: 'gate', status: 'pending', task_ref: 'INIT-1' })])];
  const dispose = mountWorkflowCanvas(
    dom.window.document.getElementById('host'), 'p', 'w',
    async () => runs,
    {
      onApprove: () => {
        calls.push('approve');
        return new Promise((res, rej) => {
          if (rejectMode) rej(new Error('server said no'));
          else resolveAction = res;
        });
      },
      onReject: () => Promise.reject(new Error('unused')),
    }, 0,
  );
  try {
    await new Promise((r) => setTimeout(r, 100));
    const node = dom.window.document.querySelector('.dy-wf-node');
    node.dispatchEvent(new dom.window.Event('click'));
    const passport = dom.window.document.querySelector('.dy-wf-passport');
    const approve = [...passport.querySelectorAll('button')].find((b) => b.textContent === 'Approve');
    assert.ok(approve, 'gate passport has Approve');

    // Failure path: no optimistic success text.
    approve.click();
    await new Promise((r) => setTimeout(r, 60));
    assert.equal(calls.length, 1, 'one action issued');
    const afterFail = [...passport.querySelectorAll('button')].find((b) => /approve/i.test(b.textContent));
    assert.ok(!/approved\s*✓/.test(afterFail.textContent), `must not claim success on server failure, got "${afterFail.textContent}"`);
    assert.match(afterFail.textContent, /fail/i, 'failure is surfaced to the user');
    assert.equal(afterFail.disabled, false, 'user can retry after failure');

    // Duplicate-guard while an action is in flight.
    rejectMode = false;
    approve.click(); // now pending (promise unresolved)
    assert.equal(calls.length, 2);
    const during = [...passport.querySelectorAll('button')].find((b) => /approving/i.test(b.textContent));
    assert.match(during.textContent, /approving/i, 'pending state is shown while awaiting the server');
    during.click();
    await new Promise((r) => setTimeout(r, 60));
    assert.equal(calls.length, 2, 'duplicate click while pending does not fire a second action');

    // Success only after the server resolves.
    resolveAction();
    await new Promise((r) => setTimeout(r, 60));
    const done = [...passport.querySelectorAll('button')].find((b) => /approve/i.test(b.textContent));
    assert.match(done.textContent, /approved\s*✓/i, 'success is claimed only after server confirmation');
  } finally {
    dispose();
    restoreDoc();
    dom.window.close();
  }
});

test('slow successful polling still renders when responses take longer than the poll interval', async () => {
  const dom = makeDom();
  const restoreDoc = boot(dom);
  const dispose = mountWorkflowCanvas(
    dom.window.document.getElementById('host'), 'p', 'w',
    async () => {
      await new Promise(resolve => setTimeout(resolve, 80));
      return [RUN([NODE({ assignee: 'slow-but-valid' })])];
    }, { onApprove: () => {}, onReject: () => {} }, 30,
  );
  try {
    await new Promise(resolve => setTimeout(resolve, 250));
    assert.match(dom.window.document.getElementById('host').textContent, /slow-but-valid/);
  } finally {
    dispose();
    restoreDoc();
    dom.window.close();
  }
});

test('late out-of-order poll responses never overwrite a newer frame; disposed canvas ignores late data', async () => {
  const dom = makeDom();
  const restoreDoc = boot(dom);
  const oldFrame = [RUN([NODE({ status: 'working' })], { run_key: 'old', version: 1 })];
  const newFrame = [RUN([NODE({ status: 'done', assignee: 'finished-bot' })], { run_key: 'new', version: 2 })];
  let release;
  const barrier = new Promise((r) => { release = r; });
  let n = 0;
  const dispose = mountWorkflowCanvas(
    dom.window.document.getElementById('host'), 'p', 'w',
    async () => {
      if (n++ === 0) { await barrier; return oldFrame; } // slow first response
      return newFrame; // fast, newer
    }, { onApprove: () => {}, onReject: () => {} }, 30,
  );
  try {
    await new Promise((r) => setTimeout(r, 150)); // second poll lands the new frame
    assert.match(dom.window.document.querySelector('.dy-wf-node').textContent, /finished-bot/, 'newer frame rendered');
    release(); // late old response resolves now
    await new Promise((r) => setTimeout(r, 120));
    assert.match(dom.window.document.querySelector('.dy-wf-node').textContent, /finished-bot/, 'late old response must not regress the frame');

    // Dispose: a further in-flight response must not repaint the host.
    dispose();
    const empty = dom.window.document.getElementById('host').childElementCount;
    await new Promise((r) => setTimeout(r, 120));
    assert.equal(dom.window.document.getElementById('host').childElementCount, empty, 'no repaint after dispose');
  } finally {
    restoreDoc();
    dom.window.close();
  }
});