// Desktop Planning canvas v6 composition regressions.
//
// The Planning tab used to be a form-first list. It is now the spatial canvas
// the approved v6 prototype specified: a toolbar over a pannable/zoomed world,
// one absolutely-positioned card per persisted canvas object, SVG connectors
// drawn through the cards' live rects, a collapsible curation panel and a
// selection drawer — wired to the REAL canvas backend only.
//
// What this file proves, in order:
//   1. Composition: the v6 zones render (toolbar | stage | assistant | drawer)
//      with the preserved hooks the journey tests depend on.
//   2. Interactivity is REAL: a drag moves a card, the position reaches the
//      wire as a PUT with expected_revision, the revision bumps, a stale save
//      is refused with a conflict notice (never a silent overwrite), a connect
//      gesture and the labelled editor both persist a real meaning, zoom/pan/fit
//      change the world transform, and remove goes through the real DELETE.
//   3. Vocabulary: every kind and meaning offered is one the real schema
//      accepts (OBJECT_KINDS / CONNECTOR_MEANINGS read from the persistence
//      module), so the surface cannot offer an object the backend would reject.
//   4. The approval contract: curation asks a question, answers produce
//      proposals as scratch + suggested only, a proposal decision is recorded
//      but the canvas objects/connectors are byte-identical, and a second
//      decision on the same proposal is refused.
//   5. Styling: computed styles resolve on the planning surface in light AND
//      dark, and each kind's stripe resolves to its own token (the "black box"
//      class of regression the workflow canvas shipped, guarded here too).
import assert from 'node:assert/strict';
import http from 'node:http';
import { readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { DASHBOARD, REPO, buildDesktopBundle, chromium } from './planning-canvas-test-bundle.mjs';

// The vocabulary is read from the REAL persistence module, not retyped: if the
// schema ever changes, this file follows it instead of drifting.
const CANVAS_SERVICE = readFileSync(
  join(REPO, 'src', 'hermes_project_stewardship', 'persistence', 'canvas_service.py'), 'utf8',
);
function schemaSet(name) {
  const m = CANVAS_SERVICE.match(new RegExp(`${name}\\s*=\\s*frozenset\\(\\{([^}]*)\\}`));
  assert.ok(m, `${name} must be declared in canvas_service.py`);
  return m[1].split(',').map((s) => s.trim().replace(/^["']|["']$/g, '')).filter(Boolean).sort();
}
const REAL_KINDS = schemaSet('OBJECT_KINDS');
const REAL_MEANINGS = schemaSet('CONNECTOR_MEANINGS');

// The palette has ONE home: expected stripe colours come from it, never from
// literals in this file.
const CANVAS_CSS_TS = readFileSync(join(DASHBOARD, 'src', 'workflow-canvas-css.ts'), 'utf8');
/** The planning palette declares its light values on the scope carrier and its
 *  dark overrides under the Desktop theme attribute, so the expected value
 *  depends on the theme being measured. Both blocks come from the single home. */
function expectedToken(name, theme = 'light') {
  // Anchor on the dark DECLARATION (selector followed by the scope carrier),
  // never on a prose mention of the attribute inside a comment.
  const darkAt = CANVAS_CSS_TS.search(/\.dockyard-root\[data-theme="dark"\]\s+\.dy-pc-scope/);
  assert.ok(darkAt > 0, 'the dark theme block must exist in workflow-canvas-css.ts');
  const block = theme === 'dark' ? CANVAS_CSS_TS.slice(darkAt) : CANVAS_CSS_TS.slice(0, darkAt);
  assert.ok(block, `the ${theme} block must exist in workflow-canvas-css.ts`);
  const m = block.match(new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{3,8})`));
  assert.ok(m, `token --${name} must be declared for ${theme} in workflow-canvas-css.ts`);
  return m[1];
}
const rgbOf = (hex) => {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  return `rgb(${[0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16)).join(', ')})`;
};

const PROJECT = 'p1';
const SEED_OBJECTS = [
  { id: 'obj-ev', kind: 'evidence', content: { text: 'Users stall before their first verified cycle' }, x: 80, y: 80, width: 240, height: 140, tags: ['activation'], evidence_ref: 'content-1', work_ref: null },
  { id: 'obj-cl', kind: 'claim', content: { text: 'The import step feels unsafe' }, x: 400, y: 80, width: 240, height: 140, tags: ['activation'], evidence_ref: null, work_ref: null },
  { id: 'obj-qu', kind: 'question', content: { text: 'Which setup step abandons most?' }, x: 400, y: 300, width: 240, height: 140, tags: [], evidence_ref: null, work_ref: null },
  { id: 'obj-dc', kind: 'decision', content: { text: 'Measure first verified cycle' }, x: 720, y: 80, width: 240, height: 140, tags: [], evidence_ref: null, work_ref: null },
  { id: 'obj-pl', kind: 'plan_block', content: { text: 'Instrument the funnel' }, x: 720, y: 300, width: 240, height: 140, tags: [], evidence_ref: null, work_ref: null },
  { id: 'obj-nt', kind: 'note', content: { text: 'Cohort window opens Monday' }, x: 1040, y: 80, width: 240, height: 140, tags: [], evidence_ref: null, work_ref: null },
];
const SEED_CONNECTORS = [
  { id: 'edge-1', source: 'obj-ev', target: 'obj-cl', meaning: 'supports' },
  { id: 'edge-2', source: 'obj-qu', target: 'obj-dc', meaning: 'raises_question' },
];

/** Disposable same-origin host implementing the REAL canvas contracts. */
function startHost(bundleCode) {
  const calls = [];
  const state = {
    canvas: { canvas_id: 'canvas-1', project_id: PROJECT, revision: 4, objects: SEED_OBJECTS, connectors: SEED_CONNECTORS },
    sessions: {},
    proposals: {},
    sequences: 0,
  };
  const clone = (value) => JSON.parse(JSON.stringify(value));
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://127.0.0.1');
    if (url.pathname === '/desktop') {
      res.setHeader('content-type', 'text/html; charset=utf-8');
      res.end('<!doctype html><html><head><meta charset="utf-8"></head><body><div id="root"></div></body></html>');
      return;
    }
    if (url.pathname === '/api/bundle.js') {
      res.setHeader('content-type', 'text/javascript; charset=utf-8');
      res.end(bundleCode);
      return;
    }
    let body = null;
    let raw = '';
    req.on('data', (chunk) => { raw += chunk; });
    req.on('end', () => {
      try { body = raw ? JSON.parse(raw) : null; } catch { body = null; }
      const path = url.pathname.replace(/^\/api/, '');
      calls.push({ method: req.method, path, body: clone(body ?? null), query: url.search });
      let payload;
      let status = 200;
      try {
        const canvasMatch = path.match(/^\/projects\/([^/]+)\/canvas$/);
        const objectMatch = path.match(/^\/projects\/([^/]+)\/canvas\/objects\/([^/]+)$/);
        const curateMatch = path.match(/^\/projects\/([^/]+)\/canvas\/curate$/);
        const startMatch = path.match(/^\/projects\/([^/]+)\/canvas\/sessions$/);
        const sessionMatch = path.match(/^\/canvas\/sessions\/([^/]+)$/);
        const answerMatch = path.match(/^\/canvas\/sessions\/([^/]+)\/answer$/);
        const decisionMatch = path.match(/^\/canvas\/proposals\/([^/]+)\/decision$/);
        if (canvasMatch && req.method === 'GET') payload = clone(state.canvas);
        else if (canvasMatch && req.method === 'PUT') {
          if (Number(body?.expected_revision) !== Number(state.canvas.revision)) {
            status = 409;
            payload = { detail: `canvas revision conflict: expected ${body?.expected_revision}, current ${state.canvas.revision}` };
          } else {
            state.canvas = { ...state.canvas, revision: state.canvas.revision + 1, objects: body?.objects ?? [], connectors: body?.connectors ?? [] };
            payload = clone(state.canvas);
          }
        } else if (objectMatch && req.method === 'DELETE') {
          const objectId = decodeURIComponent(objectMatch[2]);
          const expected = Number(url.searchParams.get('expected_revision'));
          if (!state.canvas.objects.some((row) => row.id === objectId)) { status = 404; payload = { detail: 'unknown canvas object' }; }
          else if (expected !== Number(state.canvas.revision)) { status = 409; payload = { detail: 'canvas revision conflict' }; }
          else {
            state.canvas = {
              ...state.canvas,
              revision: state.canvas.revision + 1,
              objects: state.canvas.objects.filter((row) => row.id !== objectId),
              connectors: state.canvas.connectors.filter((edge) => edge.source !== objectId && edge.target !== objectId),
            };
            payload = clone(state.canvas);
          }
        } else if (curateMatch && req.method === 'POST') {
          const kinds = state.canvas.objects.map((row) => row.kind);
          const count = (values) => kinds.filter((kind) => values.includes(kind)).length;
          payload = {
            canvas_revision: state.canvas.revision,
            status: count(['claim']) ? 'ready_for_review' : 'needs_clarification',
            summary: { evidence_count: count(['evidence', 'note', 'media', 'link']), claim_count: count(['claim']), question_count: count(['question']), plan_block_count: count(['plan_block']) },
            clarifying_questions: count(['claim']) ? [] : [{ id: 'missing-claim', question: 'What problem or user need are we solving?' }],
            proposals: [],
          };
        } else if (startMatch && req.method === 'POST') {
          state.sequences += 1;
          const id = `canvas-session-${state.sequences}`;
          const missing = state.canvas.objects.some((row) => row.kind === 'claim') ? [] : [{ id: 'missing-claim', question: 'What problem or user need are we solving?' }];
          const session = { session_id: id, project_id: PROJECT, canvas_revision: state.canvas.revision, status: missing.length ? 'active' : 'complete', current_question: missing[0] ?? null, answers: [], proposals: [] };
          if (!missing.length) session.proposals = [proposalFor(state)];
          state.sessions[id] = session;
          payload = clone(session);
        } else if (answerMatch && req.method === 'POST') {
          const session = state.sessions[decodeURIComponent(answerMatch[1])];
          if (!session) { status = 404; payload = { detail: 'unknown canvas session' }; }
          else if (session.status !== 'active') { status = 422; payload = { detail: 'canvas session is not active' }; }
          else {
            session.answers.push({ question: session.current_question, outcome: body?.outcome, answer: body?.answer ?? '' });
            session.current_question = null;
            session.status = body?.outcome === 'stop' ? 'stopped' : 'complete';
            session.proposals = session.status === 'complete' ? [proposalFor(state)] : [];
            payload = clone(session);
          }
        } else if (sessionMatch && req.method === 'GET') {
          const session = state.sessions[decodeURIComponent(sessionMatch[1])];
          if (!session) { status = 404; payload = { detail: 'unknown canvas session' }; } else payload = clone(session);
        } else if (decisionMatch && req.method === 'POST') {
          const proposal = state.proposals[decodeURIComponent(decisionMatch[1])];
          if (!proposal) { status = 404; payload = { detail: 'unknown canvas proposal' }; }
          else if (proposal.status !== 'pending') { status = 422; payload = { detail: 'canvas proposal is not pending' }; }
          else {
            proposal.status = body?.approve ? 'approved' : 'rejected';
            payload = { proposal_id: proposal.proposal_id, status: proposal.status };
          }
        } else if (path === '/dashboard') payload = { projects: [{ id: PROJECT, name: 'P1', health: 'healthy', work: {} }], owed_decisions: 0, totals: {} };
        else if (path === '/onboard/discover') payload = { profiles: [] };
        else if (path.endsWith('/content')) payload = { content: [{ content_id: 'content-1', title: 'Interview notes', media_type: 'text/plain' }] };
        else payload = {};
      } catch (error) {
        status = 500;
        payload = { detail: String(error?.message ?? error) };
      }
      res.writeHead(status, { 'content-type': 'application/json' });
      res.end(JSON.stringify(payload));
    });
  });
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve({
      base: `http://127.0.0.1:${server.address().port}`,
      calls,
      state,
      close: () => new Promise((r) => server.close(r)),
    }));
  });
}

function proposalFor(state) {
  state.sequences += 1;
  const proposal = {
    proposal_id: `canvas-proposal-${state.sequences}`, status: 'pending', kind: 'technical_plan',
    title: 'Technical implementation plan', source_object_ids: state.canvas.objects.map((row) => row.id), requires_approval: true,
  };
  state.proposals[proposal.proposal_id] = proposal;
  return proposal;
}

async function openPlanning(page, host) {
  await page.goto(`${host.base}/desktop`, { waitUntil: 'load' });
  await page.addScriptTag({ url: `${host.base}/api/bundle.js` });
  await page.waitForSelector('[data-tab="project"]', { timeout: 20000 });
  await page.click('[data-tab="project"]');
  await page.waitForSelector('[data-project-view="planning"]', { timeout: 20000 });
  await page.click('[data-project-view="planning"]');
  await page.waitForSelector(`[data-planning-canvas="${PROJECT}"] [data-canvas-object="obj-ev"]`, { timeout: 20000 });
}

/** The planning root carries the revision hook itself (it is the panel's own
 *  attribute), so read it from the element rather than from a descendant. */
const revisionHooks = (page) => page.locator(`[data-planning-canvas="${PROJECT}"].dy-pc-scope`);

test('Planning canvas v6: the spatial composition renders with every preserved hook', { timeout: 180000 }, async () => {
  const built = buildDesktopBundle();
  const host = await startHost(built.code);
  let browser;
  try {
    browser = await chromium.launch({ headless: true, args: ['--disable-gpu'] });
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await openPlanning(page, host);
    const canvas = page.locator(`[data-planning-canvas="${PROJECT}"]`);

    // Zone 1 — toolbar: modes, the capture form, the kind buttons, tidy, zoom, Save.
    assert.ok(await canvas.locator('[data-action="pc-mode-select"]').count(), 'Select mode control');
    assert.ok(await canvas.locator('[data-action="pc-mode-connect"]').count(), 'Connect mode control');
    assert.ok(await canvas.locator('[data-canvas-kind-picker]').count(), 'kind picker');
    assert.ok(await canvas.locator('[data-canvas-draft]').count(), 'capture input (preserved hook)');
    assert.ok(await canvas.getByRole('button', { name: 'Add object' }).count(), 'Add object (preserved hook)');
    for (const kind of REAL_KINDS) {
      assert.ok(await canvas.locator(`[data-canvas-add-kind="${kind}"]`).count(), `toolbar offers the real kind ${kind}`);
    }
    for (const action of ['pc-tidy', 'pc-zoom-in', 'pc-zoom-out', 'pc-fit', 'pc-save', 'pc-curate', 'pc-reload', 'pc-review']) {
      assert.ok(await canvas.locator(`[data-action="${action}"]`).count(), `toolbar action ${action}`);
    }

    // Zone 2 — the stage: a real spatial world with the persisted objects in it.
    assert.ok(await canvas.locator('[data-pc-stage]').count(), 'the spatial stage renders');
    assert.ok(await canvas.locator('[data-pc-world]').count(), 'the world plane renders');
    const placed = await canvas.locator('[data-canvas-object]').evaluateAll((rows) => rows.map((row) => ({
      id: row.dataset.canvasObject, kind: row.dataset.canvasKind, x: Number(row.dataset.canvasX), y: Number(row.dataset.canvasY), left: row.style.left, top: row.style.top, position: getComputedStyle(row).position,
    })));
    assert.equal(placed.length, SEED_OBJECTS.length, 'every persisted object is on the canvas');
    assert.deepEqual([...new Set(placed.map((row) => row.kind))].sort(), [...new Set(SEED_OBJECTS.map((row) => row.kind))].sort(), 'the drawn kinds are the persisted kinds');
    for (const row of placed) {
      assert.equal(row.position, 'absolute', `${row.id} is positioned on the plane, not listed`);
      assert.match(row.left, /^\d+px$/, `${row.id} carries its persisted x as a position`);
      assert.match(row.top, /^\d+px$/, `${row.id} carries its persisted y as a position`);
    }

    // Connectors are drawn through the cards' live rects.
    const connectorCount = await canvas.locator('[data-canvas-connector]').count();
    assert.equal(connectorCount, SEED_CONNECTORS.length, 'each persisted connector is drawn');
    const meanings = await canvas.locator('[data-canvas-connector]').evaluateAll((rows) => rows.map((row) => row.dataset.canvasMeaning).sort());
    assert.deepEqual(meanings, SEED_CONNECTORS.map((edge) => edge.meaning).sort(), 'the drawn meanings are the persisted meanings');

    // The real vocabulary is the only vocabulary offered anywhere.
    const editorMeanings = await canvas.locator('[data-canvas-connector-editor] select').nth(1).evaluate((el) => [...el.options].map((o) => o.value));
    assert.deepEqual(editorMeanings.sort(), REAL_MEANINGS, 'the connector editor offers exactly the real meanings');
    const pickerKinds = await canvas.locator('[data-canvas-kind-picker]').evaluate((el) => [...el.options].map((o) => o.value));
    assert.deepEqual(pickerKinds.sort(), REAL_KINDS, 'the kind picker offers exactly the real kinds');

    // Zone 3 — the curation assistant panel (collapsible, scratch-only).
    assert.ok(await canvas.locator('[data-canvas-assistant]').count(), 'assistant panel renders');
    await canvas.locator('[data-action="pc-chat-toggle"]').click();
    await page.waitForTimeout(120);
    assert.ok(await canvas.locator('[data-canvas-assistant].open').count(), 'assistant panel expands');

    // Zone 4 — the selection drawer opens from a card and edits title + kind.
    await canvas.locator('[data-canvas-object="obj-nt"]').click();
    await page.waitForTimeout(120);
    assert.equal(await canvas.locator('[data-canvas-drawer]').getAttribute('data-canvas-drawer'), 'obj-nt', 'the drawer targets the selected object');
    assert.equal(await canvas.locator('[data-canvas-object-title]').inputValue(), 'Cohort window opens Monday', 'the drawer shows the real title');
    await canvas.locator('[data-canvas-object-title]').fill('Cohort window opens Tuesday');
    await canvas.locator('[data-canvas-object-kind]').selectOption('decision');
    await canvas.locator('[data-action="apply-canvas-object"]').click();
    await page.waitForTimeout(120);
    const edited = canvas.locator('[data-canvas-object="obj-nt"]');
    assert.match(await edited.innerText(), /Cohort window opens Tuesday/, 'the edited title is on the card');
    assert.equal(await edited.getAttribute('data-canvas-kind'), 'decision', 'the edited kind is on the card');

    assert.deepEqual(errors, [], errors.join('\n'));
    await page.close();
  } finally {
    await browser?.close();
    await host.close();
    rmSync(built.dir, { recursive: true, force: true });
  }
});

test('Planning canvas v6: drag, connect, zoom, remove and save all reach the real contracts', { timeout: 180000 }, async () => {
  const built = buildDesktopBundle();
  const host = await startHost(built.code);
  let browser;
  try {
    browser = await chromium.launch({ headless: true, args: ['--disable-gpu'] });
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await openPlanning(page, host);
    const canvas = page.locator(`[data-planning-canvas="${PROJECT}"]`);
    const card = canvas.locator('[data-canvas-object="obj-ev"]');
    const before = { x: Number(await card.getAttribute('data-canvas-x')), y: Number(await card.getAttribute('data-canvas-y')) };

    // --- drag: the position must change on the card AND on the wire ---------
    const box = await card.boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + 20);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 + 140, box.y + 20 + 90, { steps: 8 });
    await page.mouse.up();
    await page.waitForTimeout(120);
    const moved = { x: Number(await card.getAttribute('data-canvas-x')), y: Number(await card.getAttribute('data-canvas-y')) };
    assert.ok(moved.x > before.x + 100, `drag moved the card on the plane (${before.x} -> ${moved.x})`);
    assert.ok(moved.y > before.y + 60, `drag moved the card vertically (${before.y} -> ${moved.y})`);

    await canvas.locator('[data-action="pc-save"]').click();
    await page.waitForTimeout(300);
    const put = host.calls.filter((c) => c.method === 'PUT' && c.path === `/projects/${PROJECT}/canvas`).at(-1);
    assert.ok(put, 'Save canvas issued a PUT to the real canvas route');
    assert.equal(Number(put.body.expected_revision), 4, 'the PUT carried the revision the canvas was read at');
    const persisted = put.body.objects.find((row) => row.id === 'obj-ev');
    assert.equal(Number(persisted.x), moved.x, 'the drag position is what went on the wire');
    assert.equal(Number(persisted.y), moved.y, 'the drag position went on the wire for y too');
    assert.equal(Number(host.state.canvas.revision), 5, 'the real contract bumped the revision');
    assert.match(await canvas.locator('[data-canvas-notice]').innerText(), /revision 5/, 'the surface reports the new revision');

    // --- stale revision is refused, never silently overwritten -------------
    host.state.canvas = { ...host.state.canvas, revision: 41 };
    await canvas.locator('[data-action="pc-save"]').click();
    await page.waitForTimeout(300);
    const conflict = await canvas.locator('[data-canvas-notice]').innerText();
    assert.match(conflict, /conflict/i, 'a stale save states the conflict');
    assert.equal(Number(host.state.canvas.revision), 41, 'the stale save did NOT write (revision untouched)');
    assert.equal(await revisionHooks(page).getAttribute('data-canvas-revision'), '41', 'the surface reloaded the canonical revision');

    // --- connect: the Connect gesture adds a real meaning -------------------
    const edgesBefore = await canvas.locator('[data-canvas-connector]').count();
    await canvas.locator('[data-action="pc-mode-connect"]').click();
    await canvas.locator('[data-canvas-object="obj-dc"]').click();
    await page.waitForTimeout(120);
    assert.ok(await canvas.locator('[data-canvas-pending]').count(), 'the first pick is held as a pending connection');
    await canvas.locator('[data-canvas-object="obj-pl"]').click();
    await page.waitForTimeout(120);
    assert.equal(await canvas.locator('[data-canvas-connector]').count(), edgesBefore + 1, 'the connect gesture drew one more connector');
    const newEdge = await canvas.locator('[data-canvas-connector]').last().getAttribute('data-canvas-meaning');
    assert.ok(REAL_MEANINGS.includes(newEdge), `the gesture used a real meaning (${newEdge})`);
    await canvas.locator('[data-action="pc-mode-select"]').click();

    // --- the labelled editor: an explicit meaning, also on the wire ---------
    const editor = canvas.locator('[data-canvas-connector-editor]');
    await editor.locator('select').nth(0).selectOption('obj-qu');
    await editor.locator('select').nth(1).selectOption('contradicts');
    await editor.locator('select').nth(2).selectOption('obj-pl');
    await editor.getByRole('button', { name: 'Connect objects' }).click();
    await page.waitForTimeout(120);
    assert.equal(await canvas.locator('[data-canvas-connector]').count(), edgesBefore + 2, 'the editor added its connector');
    await canvas.locator('[data-action="pc-save"]').click();
    await page.waitForTimeout(300);
    const savedEdges = host.calls.filter((c) => c.method === 'PUT' && c.path === `/projects/${PROJECT}/canvas`).at(-1).body.connectors;
    assert.ok(savedEdges.some((edge) => edge.meaning === 'contradicts' && edge.source === 'obj-qu' && edge.target === 'obj-pl'), 'the edited meaning reached the wire');
    assert.ok(savedEdges.every((edge) => REAL_MEANINGS.includes(edge.meaning)), 'no invented meaning was ever sent');

    // --- zoom + pan + fit change the world transform ------------------------
    const transformOf = () => canvas.locator('[data-pc-world]').evaluate((el) => el.style.transform);
    const beforeZoom = await transformOf();
    await canvas.locator('[data-action="pc-zoom-in"]').click();
    await canvas.locator('[data-action="pc-zoom-in"]').click();
    await page.waitForTimeout(120);
    assert.notEqual(await transformOf(), beforeZoom, 'zoom changed the world transform');
    assert.equal(await canvas.locator('[data-pc-world]').getAttribute('data-canvas-zoom'), '120', 'the world states its zoom');
    await canvas.locator('[data-action="pc-fit"]').click();
    await page.waitForTimeout(120);
    const fitted = await canvas.locator('[data-pc-world]').evaluate((el) => el.style.transform);
    assert.match(fitted, /translate\(/, 'fit repositioned the world (pan) as well as scaling it');
    assert.notEqual(fitted, beforeZoom, 'fit produced its own transform');

    // --- remove goes through the real DELETE route --------------------------
    await canvas.locator('[data-canvas-object="obj-nt"]').click();
    await page.waitForTimeout(120);
    const revisionBeforeDelete = Number(await revisionHooks(page).getAttribute('data-canvas-revision'));
    await canvas.locator('[data-action="remove-canvas-object"]').click();
    await page.waitForTimeout(300);
    const deletes = host.calls.filter((c) => c.method === 'DELETE');
    assert.equal(deletes.length, 1, 'removal used the real DELETE contract');
    assert.match(deletes[0].path, /\/canvas\/objects\/obj-nt$/, 'the DELETE named the selected object');
    assert.match(deletes[0].query, new RegExp(`expected_revision=${revisionBeforeDelete}`), 'the DELETE carried the current revision');
    assert.equal(await canvas.locator('[data-canvas-object="obj-nt"]').count(), 0, 'the object is gone from the canvas');
    assert.equal(Number(host.state.canvas.revision), revisionBeforeDelete + 1, 'the deletion bumped the real revision');

    assert.deepEqual(errors, [], errors.join('\n'));
    await page.close();
  } finally {
    await browser?.close();
    await host.close();
    rmSync(built.dir, { recursive: true, force: true });
  }
});

test('Planning canvas v6: curation proposes as scratch only and nothing auto-applies', { timeout: 180000 }, async () => {
  const built = buildDesktopBundle();
  const host = await startHost(built.code);
  let browser;
  try {
    browser = await chromium.launch({ headless: true, args: ['--disable-gpu'] });
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await openPlanning(page, host);
    const canvas = page.locator(`[data-planning-canvas="${PROJECT}"]`);

    // The real contract only asks a clarification while the canvas has no
    // claim, so remove the seeded claim first (through the real DELETE route,
    // which is itself part of the coverage).
    await canvas.locator('[data-canvas-object="obj-cl"]').click();
    await page.waitForTimeout(120);
    await canvas.locator('[data-action="remove-canvas-object"]').click();
    await page.waitForTimeout(300);
    assert.equal(await canvas.locator('[data-canvas-object="obj-cl"]').count(), 0, 'the claim was removed through the real contract');
    assert.equal(host.state.canvas.connectors.some((edge) => edge.source === 'obj-cl' || edge.target === 'obj-cl'), false, 'its connector was dropped too');
    const canvasBefore = JSON.stringify(host.state.canvas);

    await canvas.locator('[data-action="pc-curate"]').click();
    await page.waitForTimeout(300);
    assert.ok(await canvas.locator('[data-canvas-question]').count(), 'curation asks its clarification first');
    assert.match(await canvas.locator('[data-canvas-question]').innerText(), /problem or user need/, 'the real clarification text is shown');

    // skip / defer / stop are real outcomes; defer keeps the question open.
    await canvas.locator('[data-action="defer-canvas-question"]').click();
    await page.waitForTimeout(250);
    assert.equal(host.state.sessions['canvas-session-1'].status, 'complete', 'defer closed the session on the real contract');

    // Answer -> proposals appear as scratch + suggested.
    await canvas.locator('[data-action="pc-curate"]').click();
    await page.waitForTimeout(300);
    await canvas.locator('[data-canvas-answer]').fill('Users need a safe preview before import.');
    await canvas.locator('[data-action="answer-canvas-question"]').click();
    await page.waitForTimeout(300);
    assert.ok(await canvas.locator('[data-canvas-proposal]').count(), 'answer produced proposal(s)');
    const proposalText = await canvas.locator('[data-canvas-proposals]').innerText();
    assert.match(proposalText, /scratch \+ suggested/, 'proposals are labelled scratch + suggested');
    assert.match(proposalText, /pending/, 'proposals start pending');
    assert.equal(JSON.stringify(host.state.canvas), canvasBefore, 'curation changed no object and no connector');

    // Approve through the real decision route, then read the state back.
    await canvas.locator('[data-action="approve-canvas-proposal"]').first().click();
    await page.waitForTimeout(300);
    const decision = host.calls.filter((c) => c.method === 'POST' && /\/canvas\/proposals\/.+\/decision$/.test(c.path)).at(-1);
    assert.ok(decision, 'the decision used the real proposal decision route');
    assert.equal(decision.body.approve, true, 'the decision carried the explicit approval');
    const decided = await canvas.locator('[data-canvas-proposal]').first().getAttribute('data-canvas-proposal-status');
    assert.equal(decided, 'approved', 'the recorded status is the one displayed');
    assert.equal(JSON.stringify(host.state.canvas), canvasBefore, 'approving applied nothing to the canvas');
    assert.match(await canvas.locator('[data-canvas-notice]').innerText(), /recorded only/, 'the surface states the decision was recorded, not applied');

    // A second decision on the same proposal is refused by the real route.
    const approvedId = await canvas.locator('[data-canvas-proposal]').first().getAttribute('data-canvas-proposal');
    const second = await page.evaluate(async (id) => {
      const response = await fetch(`/api/canvas/proposals/${id}/decision`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ approve: true }) });
      return response.status;
    }, approvedId);
    assert.equal(second, 422, 'the contract refuses a second decision on the same proposal');

    // Dismiss the remaining pending proposal.
    const dismiss = canvas.locator('[data-action="dismiss-canvas-proposal"]');
    if (await dismiss.count()) {
      await dismiss.first().click();
      await page.waitForTimeout(250);
      const statuses = await canvas.locator('[data-canvas-proposal]').evaluateAll((rows) => rows.map((row) => row.dataset.canvasProposalStatus));
      assert.ok(statuses.every((status) => status !== 'pending'), 'every proposal reached an explicit decision');
    }
    assert.equal(JSON.stringify(host.state.canvas), canvasBefore, 'no decision ever applied a canvas change');

    assert.deepEqual(errors, [], errors.join('\n'));
    await page.close();
  } finally {
    await browser?.close();
    await host.close();
    rmSync(built.dir, { recursive: true, force: true });
  }
});

test('Planning canvas v6: computed styles resolve per kind in light and dark', { timeout: 180000 }, async () => {
  const built = buildDesktopBundle();
  const host = await startHost(built.code);
  let browser;
  try {
    browser = await chromium.launch({ headless: true, args: ['--disable-gpu'] });
    const errors = [];
    const readings = {};
    for (const theme of ['light', 'dark']) {
      const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
      page.on('pageerror', (e) => errors.push(`${theme}: ${e.message}`));
      await page.goto(`${host.base}/desktop`, { waitUntil: 'load' });
      await page.addScriptTag({ url: `${host.base}/api/bundle.js` });
      await page.waitForSelector('[data-tab="project"]', { timeout: 20000 });
      // The Desktop host's own theme switch: the root attribute, nothing injected.
      if (theme === 'dark') {
        await page.evaluate(() => document.querySelector('.dockyard-root')?.setAttribute('data-theme', 'dark'));
      }
      await page.click('[data-tab="project"]');
      await page.waitForSelector('[data-project-view="planning"]', { timeout: 20000 });
      await page.click('[data-project-view="planning"]');
      await page.waitForSelector(`[data-planning-canvas="${PROJECT}"] [data-canvas-object="obj-ev"]`, { timeout: 20000 });
      await page.addStyleTag({ content: '*{animation:none !important;transition:none !important}' });

      readings[theme] = await page.evaluate(() => {
        const root = document.querySelector('[data-planning-canvas]');
        const cardOf = (id) => root.querySelector(`[data-canvas-object="${id}"]`);
        const styleOf = (el) => getComputedStyle(el);
        const kindIds = { evidence: 'obj-ev', claim: 'obj-cl', question: 'obj-qu', decision: 'obj-dc', plan_block: 'obj-pl', note: 'obj-nt' };
        return {
          scope: root.className,
          scopeCarrier: root.classList.contains('dy-pc-scope'),
          stylesheet: [...document.querySelectorAll('style')].some((s) => s.dataset.dyWfStylesheet === 'true'),
          stageBackground: styleOf(root.querySelector('.dy-pc-stage')).backgroundColor,
          stageGrid: styleOf(root.querySelector('.dy-pc-stage')).backgroundImage,
          cardBackground: styleOf(cardOf('obj-ev')).backgroundColor,
          cardTitleFill: styleOf(cardOf('obj-ev').querySelector('strong')).color,
          cardFillVar: styleOf(root).getPropertyValue('--dy-pc-kind-evidence').trim(),
          stripes: Object.entries(kindIds).map(([kind, id]) => ({ kind, stripe: styleOf(cardOf(id)).borderLeftColor })),
          edgeStroke: styleOf(root.querySelector('[data-canvas-connector]')).stroke,
          edgeCount: root.querySelectorAll('[data-canvas-connector]').length,
        };
      });
      await page.close();

      const read = readings[theme];
      assert.ok(read.stylesheet, `${theme}: the canvas stylesheet was never installed`);
      assert.equal(read.scopeCarrier, true, `${theme}: the planning root must carry the scope class it is styled by`);
      assert.notEqual(read.cardBackground, 'rgba(0, 0, 0, 0)', `${theme}: cards have no background (styling never reached this surface)`);
      assert.notEqual(read.cardTitleFill, 'rgb(0, 0, 0)', `${theme}: card titles render black on light (unreadable)`);
      assert.notEqual(read.stageBackground, 'rgba(0, 0, 0, 0)', `${theme}: the stage has no background`);
      assert.match(read.stageGrid, /linear-gradient/, `${theme}: the stage grid is drawn`);
      assert.equal(read.edgeCount, SEED_CONNECTORS.length, `${theme}: connectors are drawn`);
      assert.notEqual(read.edgeStroke, 'none', `${theme}: connector strokes resolve`);

      // Each real kind resolves to its OWN token — no kind can silently fall
      // back to a shared default or to black.
      for (const row of read.stripes) {
        assert.equal(row.stripe, rgbOf(expectedToken(`dy-pc-kind-${row.kind}`, theme)),
          `${theme}: ${row.kind} stripe must resolve to --dy-pc-kind-${row.kind}`);
      }
      assert.equal(new Set(read.stripes.map((row) => row.stripe)).size, read.stripes.length,
        `${theme}: every kind must have its own stripe colour`);
      assert.equal(read.cardFillVar, expectedToken('dy-pc-kind-evidence', theme),
        `${theme}: --dy-pc-kind-evidence must resolve on the scope carrier`);
    }

    assert.deepEqual(errors, [], errors.join('\n'));
  } finally {
    await browser?.close();
    await host.close();
    rmSync(built.dir, { recursive: true, force: true });
  }
});

test('Planning canvas v6: phone width keeps controls inside the viewport and remains operable', { timeout: 180000 }, async () => {
  const built = buildDesktopBundle();
  const host = await startHost(built.code);
  let browser;
  try {
    browser = await chromium.launch({ headless: true, args: ['--disable-gpu'] });
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await openPlanning(page, host);
    const canvas = page.locator(`[data-planning-canvas="${PROJECT}"]`);
    const fit = await canvas.evaluate((root) => {
      const controls = [...root.querySelectorAll('button:not([data-canvas-object]), input, select')].map((el) => { const box = el.getBoundingClientRect(); return { label: el.getAttribute('aria-label') || el.textContent.trim(), right: box.right, left: box.left }; }).filter((control) => control.right > 0 && control.left < innerWidth);
      return { overflow: root.scrollWidth > root.clientWidth + 1, controls };
    });
    assert.equal(fit.overflow, false, 'canvas must not create horizontal overflow on a 390px viewport');
    assert.ok(fit.controls.every((control) => control.left >= -1 && control.right <= 391), JSON.stringify(fit.controls.filter((control) => control.right > 391)));
    await canvas.locator('[data-action="pc-theme-light"]').click();
    await canvas.locator('[data-action="pc-theme-dark"]').click();
    await canvas.locator('[data-action="pc-board-toggle"]').click();
    assert.equal(await canvas.locator('[data-canvas-object]').count(), SEED_OBJECTS.length);
    await canvas.locator('[data-action="pc-chat-toggle"]').click();
    assert.ok(await canvas.locator('[data-canvas-assistant].open').count());
    await canvas.locator('[data-canvas-object="obj-nt"]').click();
    await canvas.locator('[data-canvas-colour-option="pink"]').click();
    assert.equal(await canvas.locator('[data-canvas-object="obj-nt"]').getAttribute('data-canvas-colour'), 'pink');
    assert.deepEqual(errors, [], errors.join('\n'));
  } finally {
    await browser?.close();
    await host.close();
    rmSync(built.dir, { recursive: true, force: true });
  }
});
