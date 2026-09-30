// Planning canvas — multi-board browser checks (D14-D20).
//
// The v6 composition file proves the single-board (legacy /canvas) surface.
// This file drives the multi-board surface against a disposable host that
// implements the REAL board routes (list/create/get/put/patch, board-scoped
// sessions and review, plan step edit) with the server's own lifecycle rules.
//
// What it proves, at desktop (1440) AND phone (390) widths:
//   1. Theme: the light/dark toggle recolours the canvas area only, is saved
//      per board, and each board reopens in its own theme.
//   2. Wrong board: chat and review always name the open board; a slow answer
//      from board A is dropped once board B is open, and after Stop.
//   3. Chat window: drags (pointer + keyboard) and stays inside the stage,
//      minimises to a pill, expands, and the model picker saves per board.
//   4. Toolbar: every tool has an icon, an accessible name and a tooltip, and
//      every enabled button works without a console error.
//   5. Border: the canvas area carries the 2px theme frame.
//   6. Stickers: a colour fills the whole card, in both themes.
//   7. Board list: create, rename, switch, archive, show archived, restore,
//      status moves; unsaved edits block a switch; completed = read-only.
//   8. Connectors: every drawn line starts and ends within 1px of its cards.
//   9. Layout: no control is cut off or overlapping at either width.
import assert from 'node:assert/strict';
import http from 'node:http';
import { rmSync } from 'node:fs';
import { test } from 'node:test';
import { buildDesktopBundle, chromium } from './planning-canvas-test-bundle.mjs';

const PROJECT = 'p1';
const MODELS = { available: true, default: { provider: 'main', model: 'main-model' }, providers: [{ slug: 'openai-codex', name: 'Codex', models: ['gpt-5.6-sol'] }, { slug: 'local', name: 'Local', models: ['qwen-3'] }] };
const MOVES = { draft: ['submitted'], submitted: ['draft', 'planned'], planned: ['submitted', 'completed'], completed: ['planned'] };
const card = (id, kind, text, x, y) => ({ id, kind, content: { text }, x, y, width: 240, height: 140, tags: [], evidence_ref: null, work_ref: null });

function seedBoards() {
  return [
    {
      canvas_id: 'board-a', project_id: PROJECT, name: 'Alpha', status: 'draft', archived_from: null, theme: null, model: null, revision: 3,
      objects: [card('a-ev', 'evidence', 'Alpha evidence', 80, 80), card('a-cl', 'claim', 'Alpha claim', 420, 80), card('a-qu', 'question', 'Alpha question', 420, 320)],
      connectors: [{ id: 'a-e1', source: 'a-ev', target: 'a-cl', meaning: 'supports' }, { id: 'a-e2', source: 'a-cl', target: 'a-ev', meaning: 'derived_from' }, { id: 'a-e3', source: 'a-qu', target: 'a-cl', meaning: 'clarifies' }],
      updated: 2,
    },
    {
      canvas_id: 'board-b', project_id: PROJECT, name: 'Beta', status: 'draft', archived_from: null, theme: 'light', model: null, revision: 1,
      objects: [card('b-nt', 'note', 'Beta note', 100, 100), card('b-dc', 'decision', 'Beta decision', 480, 260)],
      connectors: [{ id: 'b-e1', source: 'b-nt', target: 'b-dc', meaning: 'implements' }],
      updated: 1,
    },
  ];
}

function startHost(bundleCode) {
  const calls = [];
  const state = { boards: seedBoards(), clock: 10, sessions: {}, proposals: {}, plans: {}, seq: 0, slowSessionFor: null, releaseSlow: null, slowDone: null, unexpected: [] };
  const clone = (v) => JSON.parse(JSON.stringify(v));
  const view = (b) => { const { updated, ...rest } = b; return clone(rest); };
  const find = (id) => state.boards.find((b) => b.canvas_id === id);
  const touch = (b) => { state.clock += 1; b.updated = state.clock; };
  const live = () => state.boards.filter((b) => b.status !== 'archived').sort((x, y) => y.updated - x.updated);
  const sessionFor = (board, message) => {
    state.seq += 1;
    const id = `session-${state.seq}`;
    const proposal = { proposal_id: `proposal-${state.seq}`, status: 'pending', kind: 'technical_plan', title: `Plan for ${board.name}`, source_object_ids: board.objects.map((o) => o.id), requires_approval: true, canvas_id: board.canvas_id };
    state.proposals[proposal.proposal_id] = proposal;
    const session = { session_id: id, project_id: PROJECT, canvas_id: board.canvas_id, canvas_revision: board.revision, status: 'complete', current_question: null, answers: message ? [{ outcome: 'message', answer: message }] : [], proposals: [clone(proposal)] };
    state.sessions[id] = session;
    if (board.status === 'draft') board.status = 'submitted';
    return session;
  };
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://127.0.0.1');
    if (url.pathname === '/desktop') { res.setHeader('content-type', 'text/html; charset=utf-8'); res.end('<!doctype html><html><head><meta charset="utf-8"></head><body><div id="root"></div></body></html>'); return; }
    if (url.pathname === '/api/bundle.js') { res.setHeader('content-type', 'text/javascript; charset=utf-8'); res.end(bundleCode); return; }
    let raw = '';
    req.on('data', (c) => { raw += c; });
    req.on('end', async () => {
      let body = null;
      try { body = raw ? JSON.parse(raw) : null; } catch { body = null; }
      const path = url.pathname.replace(/^\/api/, '');
      calls.push({ method: req.method, path, body: clone(body), query: url.search });
      let status = 200;
      let payload = {};
      const reply = () => { res.writeHead(status, { 'content-type': 'application/json' }); res.end(JSON.stringify(payload)); };
      // Mirror the real server: errors use its envelope and codes.
      const fail = (code, errCode, message) => { status = code; payload = { error: { code: errCode, message } }; };
      const locked = (board) => ['completed', 'archived'].includes(board.status);
      const lockedFail = (board) => fail(409, 'board_locked', `board is ${board.status} and read-only; reopen it to edit`);
      const m = (re) => path.match(re);
      try {
        let hit;
        if (path === `/projects/${PROJECT}/canvases` && req.method === 'GET') {
          const all = url.searchParams.get('include_archived') === 'true' ? [...live(), ...state.boards.filter((b) => b.status === 'archived')] : live();
          payload = { canvases: all.map((b) => ({ ...view(b), object_count: b.objects.length, objects: undefined, connectors: undefined, plan_count: 0, changed_since_plan: false })) };
        } else if (path === `/projects/${PROJECT}/canvases` && req.method === 'POST') {
          const name = String(body?.name ?? '').trim();
          if (!name || name.length > 120) fail(422, 'validation_error', 'board name must be 1-120 characters');
          else if (live().some((b) => b.name.toLowerCase() === name.toLowerCase())) fail(409, 'conflict', `a board named ${name} already exists`);
          else {
            state.seq += 1;
            const board = { canvas_id: `board-new-${state.seq}`, project_id: PROJECT, name, status: 'draft', archived_from: null, theme: null, model: null, revision: 1, objects: [], connectors: [], updated: 0 };
            touch(board); state.boards.push(board); payload = view(board);
          }
        } else if (path === `/projects/${PROJECT}/canvas` && req.method === 'GET') {
          let board = live()[0];
          if (!board) { board = { canvas_id: 'board-main', project_id: PROJECT, name: 'Main board', status: 'draft', archived_from: null, theme: null, model: null, revision: 1, objects: [], connectors: [], updated: 0 }; touch(board); state.boards.push(board); }
          payload = view(board);
        } else if ((hit = m(/^\/projects\/p1\/canvases\/([^/]+)$/))) {
          const board = find(decodeURIComponent(hit[1]));
          if (!board) fail(404, 'not_found', 'unknown canvas board');
          else if (req.method === 'GET') payload = view(board);
          else if (req.method === 'PUT') {
            if (locked(board)) lockedFail(board);
            else if (Number(body?.expected_revision) !== board.revision) fail(409, 'conflict', `canvas revision conflict: expected ${body?.expected_revision}, current ${board.revision}`);
            else { board.revision += 1; board.objects = body.objects; board.connectors = body.connectors; touch(board); payload = view(board); }
          } else if (req.method === 'PATCH') {
            const b = body ?? {};
            // Validate everything first, then apply (the real route is atomic).
            if ('theme' in b && b.theme !== null && !['light', 'dark'].includes(b.theme)) throw Object.assign(new Error('theme must be light, dark or unset'), { code: 422 });
            if ('model' in b && b.model !== null) {
              const catalogue = MODELS.providers.find((pv) => pv.slug === b.model?.provider);
              if (typeof b.model !== 'object' || !catalogue || !catalogue.models.includes(b.model.model)) throw Object.assign(new Error('model is not configured in Hermes'), { code: 422 });
            }
            let name = board.name;
            if ('name' in b) {
              name = String(b.name ?? '').trim();
              if (!name || name.length > 120) throw Object.assign(new Error('board name must be 1-120 characters'), { code: 422 });
            }
            let next = board.status; let from = board.archived_from;
            if ('status' in b && b.status !== board.status) {
              if (b.status === 'archived') {
                from = board.status; next = 'archived';
              } else if (board.status === 'archived') { if (b.status !== board.archived_from) throw Object.assign(new Error('restore returns to archived_from'), { code: 422 }); next = b.status; from = null; }
              else if (!(MOVES[board.status] ?? []).includes(b.status)) throw Object.assign(new Error(`cannot move a board from ${board.status} to ${b.status}`), { code: 422 });
              else next = b.status;
            }
            if (next !== 'archived' && live().some((o) => o.canvas_id !== board.canvas_id && o.name.toLowerCase() === name.toLowerCase())) throw Object.assign(new Error(`a board named ${name} already exists`), { code: 409, errCode: 'conflict' });
            if ('theme' in b) board.theme = b.theme;
            if ('model' in b) board.model = b.model;
            board.name = name; board.status = next; board.archived_from = from;
            touch(board); payload = view(board);
          } else fail(405, 'method_not_allowed', 'method not allowed');
        } else if ((hit = m(/^\/projects\/p1\/canvases\/([^/]+)\/objects\/([^/]+)$/)) && req.method === 'DELETE') {
          const board = find(decodeURIComponent(hit[1]));
          const id = decodeURIComponent(hit[2]);
          if (!board) fail(404, 'not_found', 'unknown canvas board');
          else if (locked(board)) lockedFail(board);
          else if (Number(url.searchParams.get('expected_revision')) !== board.revision) fail(409, 'conflict', 'canvas revision conflict');
          else if (!board.objects.some((o) => o.id === id)) fail(422, 'validation_error', `unknown canvas object: ${id}`);
          else {
            board.objects = board.objects.filter((o) => o.id !== id);
            board.connectors = board.connectors.filter((e) => e.source !== id && e.target !== id);
            board.revision += 1; touch(board); payload = view(board);
          }
        } else if ((hit = m(/^\/projects\/p1\/canvases\/([^/]+)\/sessions$/)) && req.method === 'POST') {
          const board = find(decodeURIComponent(hit[1]));
          if (!board) fail(404, 'not_found', 'unknown canvas board');
          else if (locked(board)) lockedFail(board);
          else {
            if (state.slowSessionFor === board.canvas_id) await new Promise((resolve) => { state.releaseSlow = resolve; });
            payload = sessionFor(board, body?.message ?? null);
            state.slowDone?.();
          }
        } else if ((hit = m(/^\/projects\/p1\/canvases\/([^/]+)\/curate$/)) && req.method === 'POST') {
          const board = find(decodeURIComponent(hit[1]));
          if (!board) throw Object.assign(new Error('unknown canvas board'), { code: 404, errCode: 'not_found' });
          const count = (k) => board.objects.filter((o) => o.kind === k).length;
          payload = { canvas_id: board.canvas_id, canvas_revision: board.revision, summary: { evidence_count: count('evidence') + count('note'), claim_count: count('claim'), question_count: count('question'), plan_block_count: count('plan_block') }, proposals: [] };
        } else if ((hit = m(/^\/canvas\/sessions\/([^/]+)$/)) && req.method === 'GET') {
          payload = clone(state.sessions[decodeURIComponent(hit[1])]);
        } else if ((hit = m(/^\/canvas\/proposals\/([^/]+)\/decision$/)) && req.method === 'POST') {
          const proposal = state.proposals[decodeURIComponent(hit[1])];
          const owner = proposal && find(proposal.canvas_id);
          if (!proposal || (body?.project_id && body.project_id !== PROJECT)) throw Object.assign(new Error('unknown canvas proposal'), { code: 404, errCode: 'not_found' });
          if (owner && locked(owner)) throw Object.assign(new Error(`board is ${owner.status} and read-only`), { code: 409, errCode: 'board_locked' });
          if (proposal.status !== 'pending') throw Object.assign(new Error('canvas proposal is not pending'), { code: 422 });
          proposal.status = body?.approve ? 'approved' : 'rejected';
          for (const s of Object.values(state.sessions)) s.proposals = s.proposals.map((p) => (p.proposal_id === proposal.proposal_id ? clone(proposal) : p));
          payload = { proposal_id: proposal.proposal_id, status: proposal.status };
        } else if ((hit = m(/^\/canvas\/proposals\/([^/]+)\/plan$/)) && req.method === 'POST') {
          const proposal = state.proposals[decodeURIComponent(hit[1])];
          if (!proposal) throw Object.assign(new Error('unknown canvas proposal'), { code: 404, errCode: 'not_found' });
          const owner = find(proposal.canvas_id);
          if (owner && locked(owner)) throw Object.assign(new Error(`board is ${owner.status} and read-only`), { code: 409, errCode: 'board_locked' });
          const existing = state.plans[`plan-${proposal.proposal_id}`];
          if (existing) { payload = clone(existing); reply(); return; }
          const plan = { plan_id: `plan-${proposal.proposal_id}`, proposal_id: proposal.proposal_id, canvas_id: proposal.canvas_id, status: 'draft', steps: [{ order: 1, title: 'Measure the funnel', source_object_ids: ['a-ev'] }, { order: 2, title: 'Ship the preview', source_object_ids: [] }] };
          state.plans[plan.plan_id] = plan; payload = clone(plan);
        } else if ((hit = m(/^\/projects\/p1\/plans\/([^/]+)$/)) && req.method === 'PATCH') {
          const plan = state.plans[decodeURIComponent(hit[1])];
          if (!plan) throw Object.assign(new Error('unknown plan'), { code: 404, errCode: 'not_found' });
          const owner = find(plan.canvas_id);
          if (owner && locked(owner)) throw Object.assign(new Error(`board is ${owner.status} and read-only`), { code: 409, errCode: 'board_locked' });
          if (plan.status !== 'draft') throw Object.assign(new Error('only a draft plan can be edited'), { code: 409, errCode: 'conflict' });
          const old = new Map(plan.steps.map((s) => [s.order, s]));
          plan.edited_by = 'desktop';
          plan.steps = body.steps.map((s, i) => ({ order: i + 1, title: s.title, source_object_ids: s.order ? (old.get(s.order)?.source_object_ids ?? []) : [] }));
          payload = clone(plan);
        } else if (path === '/canvas/models') {
          payload = clone(MODELS);
        } else if (path === '/dashboard') payload = { projects: [{ id: PROJECT, name: 'P1', health: 'healthy', work: {} }], owed_decisions: 0, totals: {} };
        else if (path === '/onboard/discover') payload = { profiles: [] };
        else if (path.endsWith('/content')) payload = { content: [] };
        else if (req.method === 'GET' && !path.includes('/canvas') && !path.includes('/plans')) payload = {};
        else {
          // Any other canvas/plan route is unknown here: fail loudly (QA M-2),
          // never "200 {}", so a missing or misspelt route breaks the suite.
          state.unexpected.push(`${req.method} ${path}`);
          fail(404, 'not_found', `fake host has no route for ${req.method} ${path}`);
        }
      } catch (error) {
        const code = error.code ?? 500;
        fail(code, error.errCode ?? (code === 422 ? 'validation_error' : 'error'), String(error.message ?? error));
      }
      reply();
    });
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve({
    base: `http://127.0.0.1:${server.address().port}`, calls, state, find,
    close: () => new Promise((r) => { server.closeAllConnections?.(); server.close(r); }),
  })));
}

async function openPlanning(page, host) {
  await page.goto(`${host.base}/desktop`, { waitUntil: 'load' });
  await page.addScriptTag({ url: `${host.base}/api/bundle.js` });
  await page.waitForSelector('[data-tab="project"]', { timeout: 20000 });
  await page.click('[data-tab="project"]');
  await page.waitForSelector('[data-project-view="planning"]', { timeout: 20000 });
  await page.click('[data-project-view="planning"]');
  // The legacy route opens the most recently updated live board (Alpha).
  await page.waitForSelector(`[data-planning-canvas="${PROJECT}"][data-canvas-board="board-a"] [data-canvas-object="a-ev"]`, { timeout: 20000 });
  // Board mode is on once the list has answered.
  await page.waitForSelector('[data-canvas-board-status]', { timeout: 20000 });
}

const root = (page) => page.locator(`[data-planning-canvas="${PROJECT}"]`);
const settle = (page) => page.waitForTimeout(150);
// Release a held AI answer and wait until the browser has received it and
// rendered two frames, so an "it must not appear" check is not a timing guess.
async function answerDelivered(page, release) {
  const reply = page.waitForResponse((r) => r.request().method() === 'POST' && r.url().endsWith('/sessions'));
  release();
  await (await reply).finished();
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
}

/** Every drawn connector must start and end within 1px of its own cards'
 *  rendered borders (screen space, so zoom and CSS box sizing both count). */
async function connectorGaps(page) {
  return page.evaluate(() => {
    const out = [];
    for (const line of document.querySelectorAll('[data-canvas-connector]')) {
      const ctm = line.getScreenCTM();
      const at = (x, y) => { const p = new DOMPoint(x, y).matrixTransform(ctm); return { x: p.x, y: p.y }; };
      const ends = [
        [at(line.x1.baseVal.value, line.y1.baseVal.value), line.dataset.canvasSource],
        [at(line.x2.baseVal.value, line.y2.baseVal.value), line.dataset.canvasTarget],
      ];
      for (const [pt, id] of ends) {
        const r = document.querySelector(`[data-canvas-object="${CSS.escape(id)}"]`).getBoundingClientRect();
        const inside = pt.x >= r.left - 1 && pt.x <= r.right + 1 && pt.y >= r.top - 1 && pt.y <= r.bottom + 1;
        const edge = Math.min(Math.abs(pt.x - r.left), Math.abs(pt.x - r.right), Math.abs(pt.y - r.top), Math.abs(pt.y - r.bottom));
        out.push({ connector: line.dataset.canvasConnector, card: id, inside, edge: Number(edge.toFixed(2)) });
      }
    }
    return out;
  });
}

/** Controls must sit inside the viewport and not overlap one another. */
async function layoutProblems(page) {
  return page.evaluate(() => {
    const scope = document.querySelector('.dy-pc-scope');
    const visible = (el) => { const s = getComputedStyle(el); const r = el.getBoundingClientRect(); return s.visibility !== 'hidden' && s.display !== 'none' && r.width > 0 && r.height > 0; };
    const controls = [...scope.querySelectorAll('.dy-pc-board-bar button, .dy-pc-board-bar select, .dy-pc-board-list button, .dy-pc-toolbar button, .dy-pc-toolbar select, .dy-pc-toolbar input, .dy-pc-chat button, .dy-pc-chat select, .dy-pc-chat input')].filter(visible);
    const boxes = controls.map((el) => ({ label: el.getAttribute('aria-label') || el.dataset.action || el.textContent.trim().slice(0, 30), r: el.getBoundingClientRect(), el }));
    const problems = [];
    for (const b of boxes) if (b.r.left < -1 || b.r.right > innerWidth + 1) problems.push(`cut off: ${b.label} (${Math.round(b.r.left)}..${Math.round(b.r.right)} of ${innerWidth})`);
    for (let i = 0; i < boxes.length; i += 1) for (let j = i + 1; j < boxes.length; j += 1) {
      const a = boxes[i]; const c = boxes[j];
      if (a.el.contains(c.el) || c.el.contains(a.el)) continue;
      const w = Math.min(a.r.right, c.r.right) - Math.max(a.r.left, c.r.left);
      const h = Math.min(a.r.bottom, c.r.bottom) - Math.max(a.r.top, c.r.top);
      if (w > 1 && h > 1) problems.push(`overlap: ${a.label} / ${c.label}`);
    }
    if (scope.scrollWidth > scope.clientWidth + 1) problems.push(`horizontal overflow ${scope.scrollWidth} > ${scope.clientWidth}`);
    return problems;
  });
}

async function withPage(width, height, fn) {
  const built = buildDesktopBundle();
  const host = await startHost(built.code);
  let browser;
  try {
    browser = await chromium.launch({ headless: true, args: ['--disable-gpu'] });
    const page = await browser.newPage({ viewport: { width, height } });
    const errors = [];
    page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
    page.on('console', async (msg) => {
      if (msg.type() !== 'error' || /Failed to load resource/.test(msg.text())) return;
      // Keep React's component stack (the last argument) so a warning names its source.
      const args = await Promise.all(msg.args().map((a) => a.jsonValue().catch(() => '')));
      errors.push(`console: ${args.map(String).join(' | ').slice(0, 1200)}`);
    });
    await openPlanning(page, host);
    await fn(page, host, errors);
    assert.deepEqual(errors, [], errors.join('\n'));
    assert.deepEqual(host.state.unexpected, [], 'the UI only calls routes the real server has');
  } finally {
    await browser?.close();
    await host.close();
    rmSync(built.dir, { recursive: true, force: true });
  }
}

for (const [label, width, height] of [['desktop', 1440, 900], ['phone', 390, 844]]) {
  test(`Planning boards (${label}): theme, border, stickers, connectors and layout`, { timeout: 180000 }, async () => {
    await withPage(width, height, async (page, host) => {
      const canvas = root(page);
      const area = canvas.locator('.dy-pc');
      const stageBg = () => canvas.locator('[data-pc-stage]').evaluate((el) => getComputedStyle(el).backgroundColor);
      const barBg = () => canvas.locator('.dy-pc-board-bar').evaluate((el) => getComputedStyle(el).backgroundColor);

      // (1) Alpha has no saved theme: it follows the app (light here).
      assert.equal(await canvas.getAttribute('data-canvas-theme-source'), 'app');
      const lightStage = await stageBg();
      const bar = await barBg();
      await canvas.locator('[data-action="pc-theme-dark"]').click();
      await settle(page);
      assert.equal(await canvas.getAttribute('data-canvas-theme'), 'dark');
      assert.notEqual(await stageBg(), lightStage, 'dark toggle must recolour the canvas stage');
      assert.equal(await barBg(), bar, 'the board bar keeps the app theme (canvas area only)');
      const themePatch = host.calls.filter((c) => c.method === 'PATCH' && c.path.endsWith('/canvases/board-a')).at(-1);
      assert.deepEqual(themePatch.body, { theme: 'dark' }, 'theme is saved on Alpha');
      assert.equal(host.find('board-a').theme, 'dark');
      assert.equal(await area.evaluate((el) => getComputedStyle(el).colorScheme), 'dark');

      // (5) Border: 2px frame in the theme's frame colour.
      const frame = await area.evaluate((el) => { const s = getComputedStyle(el); return { w: s.borderTopWidth, c: s.borderTopColor }; });
      assert.equal(frame.w, '2px');
      assert.equal(frame.c, 'rgb(124, 140, 255)', 'dark frame colour');

      // (6) Stickers: a colour fills the whole card, in dark...
      await canvas.locator('[data-action="pc-fit"]').click();
      await settle(page);
      await canvas.locator('[data-canvas-object="a-qu"]').click();
      await settle(page);
      await canvas.locator('[data-canvas-object-colour]').selectOption('pink');
      const qu = canvas.locator('[data-canvas-object="a-qu"]');
      assert.equal(await qu.getAttribute('data-canvas-colour'), 'pink');
      assert.equal(await qu.evaluate((el) => getComputedStyle(el).backgroundColor), 'rgb(77, 28, 51)', 'dark pink sticker fill');
      // ...and in light.
      await canvas.locator('[data-action="pc-theme-light"]').click();
      await settle(page);
      assert.equal(await qu.evaluate((el) => getComputedStyle(el).backgroundColor), 'rgb(252, 217, 231)', 'light pink sticker fill');
      assert.equal(await area.evaluate((el) => getComputedStyle(el).borderTopColor), 'rgb(54, 84, 199)', 'light frame colour');
      // Esc inside the details panel closes it.
      await page.keyboard.press('Escape');
      await settle(page);
      assert.equal(await canvas.locator('[data-canvas-drawer]').getAttribute('data-canvas-drawer'), 'none', 'Esc closes the details panel');

      // (8) Connectors within 1px of both cards, at this width, both zooms.
      const check = async (when) => {
        const gaps = await connectorGaps(page);
        assert.equal(gaps.length, 6, `${when}: every connector end measured`);
        const bad = gaps.filter((g) => !g.inside || g.edge > 1);
        assert.deepEqual(bad, [], `${when}: connector ends off their cards ${JSON.stringify(bad)}`);
      };
      await check('initial');
      await canvas.locator('[data-action="pc-zoom-in"]').click();
      await settle(page);
      await check('zoomed in');
      await canvas.locator('[data-action="pc-fit"]').click();
      await settle(page);
      await check('fit');

      // (9) No cut-off or overlapping control, with the chat open too.
      assert.deepEqual(await layoutProblems(page), [], 'closed chat layout');
      await canvas.locator('[data-action="pc-chat-toggle"]').click();
      await settle(page);
      assert.deepEqual(await layoutProblems(page), [], 'open chat layout');

      // Switching to Beta applies Beta's own saved theme (light); back to
      // Alpha restores light (last saved there).
      await canvas.locator('[data-action="pc-save"]').click();
      await settle(page);
      await canvas.locator('[data-canvas-board-row="board-b"] button.dy-pc-board-row').click();
      await page.waitForSelector('[data-canvas-board="board-b"]');
      assert.equal(await canvas.getAttribute('data-canvas-theme'), 'light');
      assert.equal(await canvas.getAttribute('data-canvas-theme-source'), 'board');
      const gapsB = await connectorGaps(page);
      assert.ok(gapsB.length === 2 && gapsB.every((g) => g.inside && g.edge <= 1), `Beta connectors ${JSON.stringify(gapsB)}`);
    });
  });
}

test('Planning boards: chat always talks to the open board and drops stale answers', { timeout: 180000 }, async () => {
  await withPage(1440, 900, async (page, host) => {
    const canvas = root(page);
    // A slow ask on Alpha...
    host.state.slowSessionFor = 'board-a';
    await canvas.locator('[data-action="pc-chat-toggle"]').click();
    await canvas.locator('[data-canvas-chat-input]').fill('Focus on activation');
    await canvas.locator('[data-action="pc-chat-send"]').click();
    await settle(page);
    const ask = host.calls.filter((c) => c.method === 'POST' && c.path.endsWith('/sessions')).at(-1);
    assert.equal(ask.path, `/projects/${PROJECT}/canvases/board-a/sessions`, 'chat names the open board');
    assert.deepEqual(ask.body, { message: 'Focus on activation' });
    // ...switch to Beta while it is in flight, then let Alpha answer.
    await canvas.locator('[data-canvas-board-row="board-b"] button.dy-pc-board-row').click();
    await page.waitForSelector('[data-canvas-board="board-b"]');
    host.state.slowSessionFor = null;
    await answerDelivered(page, () => host.state.releaseSlow?.());
    assert.equal(await canvas.locator('[data-canvas-proposals]').count(), 0, 'Alpha\'s late answer must not appear on Beta');
    assert.equal(await canvas.locator('[data-canvas-chat-log] .dy-pc-msg').count(), 0, 'Beta starts with an empty chat');

    // Review and chat on Beta name Beta.
    await canvas.locator('[data-action="pc-review"]').click();
    await settle(page);
    assert.equal(host.calls.filter((c) => c.path.endsWith('/curate')).at(-1).path, `/projects/${PROJECT}/canvases/board-b/curate`);
    assert.match(await canvas.locator('[data-canvas-review]').innerText(), /1 claim|0 claim/);
    await canvas.locator('[data-canvas-chat-input]').fill('What next?');
    await canvas.locator('[data-canvas-chat-input]').press('Enter');
    await page.waitForSelector('[data-canvas-proposals]');
    assert.equal(host.calls.filter((c) => c.path.endsWith('/sessions')).at(-1).path, `/projects/${PROJECT}/canvases/board-b/sessions`);
    assert.match(await canvas.locator('[data-canvas-proposals]').innerText(), /Plan for Beta/);

    // Stop drops a pending answer too.
    host.state.slowSessionFor = 'board-b';
    await canvas.locator('[data-canvas-chat-input]').fill('Another question');
    await canvas.locator('[data-action="pc-chat-send"]').click();
    await settle(page);
    await canvas.locator('[data-action="pc-chat-stop"]').click();
    const before = await canvas.locator('[data-canvas-proposals]').innerText();
    host.state.slowSessionFor = null;
    await answerDelivered(page, () => host.state.releaseSlow?.());
    assert.equal(await canvas.locator('[data-canvas-proposals]').innerText(), before, 'an answer after Stop is dropped');
  });
});

test('Planning boards: chat window drags, minimises, expands, picks a model and edits plan steps', { timeout: 180000 }, async () => {
  await withPage(1440, 900, async (page, host) => {
    const canvas = root(page);
    const chat = canvas.locator('[data-canvas-assistant]');
    const stage = canvas.locator('[data-pc-stage]');
    // Closed = header bar only (no composer taking space over the cards).
    assert.equal(await chat.getAttribute('data-canvas-chat-state'), 'closed');
    assert.equal(await canvas.locator('[data-canvas-chat-input]').isVisible(), false, 'closed chat hides the composer');
    const closedH = (await chat.boundingBox()).height;
    // Header bar = title + one status line (~73px); the open body is ~300px+.
    assert.ok(closedH < 90, `closed chat is just its header bar (${closedH}px)`);
    await canvas.locator('[data-action="pc-chat-toggle"]').click();
    await settle(page);
    assert.equal(await chat.getAttribute('data-canvas-chat-state'), 'open');

    // Drag with the pointer: it moves, and a wild drag stays inside the stage.
    const grip = canvas.locator('[data-canvas-chat-grip]');
    const g = await grip.boundingBox();
    const start = await chat.boundingBox();
    await page.mouse.move(g.x + g.width / 2, g.y + g.height / 2);
    await page.mouse.down();
    await page.mouse.move(g.x - 300, g.y - 120, { steps: 6 });
    await page.mouse.up();
    const moved = await chat.boundingBox();
    assert.ok(moved.x < start.x - 250 && moved.y < start.y - 80, `chat moved (${start.x},${start.y}) -> (${moved.x},${moved.y})`);
    const g2 = await grip.boundingBox();
    await page.mouse.move(g2.x + 4, g2.y + 4);
    await page.mouse.down();
    await page.mouse.move(-2000, -2000, { steps: 4 });
    await page.mouse.up();
    const s = await stage.boundingBox();
    const clamped = await chat.boundingBox();
    assert.ok(clamped.x >= s.x - 1 && clamped.y >= s.y - 1 && clamped.x + clamped.width <= s.x + s.width + 1 && clamped.y + clamped.height <= s.y + s.height + 1, 'chat stays inside the stage');
    // Keyboard: arrows move it, Home resets it.
    await grip.focus();
    const k0 = await chat.boundingBox();
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowDown');
    const k1 = await chat.boundingBox();
    assert.ok(k1.x > k0.x && k1.y > k0.y, 'arrow keys move the chat');
    await page.keyboard.press('Home');
    await settle(page);
    const home = await chat.boundingBox();
    assert.ok(Math.abs(home.x + home.width - (start.x + start.width)) <= 1, 'Home returns the chat to its dock');

    // Minimise to a pill and back.
    await canvas.locator('[data-action="pc-chat-minimise"]').click();
    assert.equal(await chat.getAttribute('data-canvas-chat-state'), 'pill');
    assert.equal(await canvas.locator('[data-canvas-chat-input]').isVisible(), false, 'the pill hides the composer');
    await canvas.locator('[data-action="pc-chat-toggle"]').click();
    assert.equal(await chat.getAttribute('data-canvas-chat-state'), 'open');

    // Model picker saves the choice on this board only.
    const picker = canvas.locator('[data-canvas-model]');
    assert.match(await picker.locator('option').first().innerText(), /main-model/);
    await picker.selectOption('local::qwen-3');
    await settle(page);
    assert.deepEqual(host.find('board-a').model, { provider: 'local', model: 'qwen-3' });
    assert.equal(host.find('board-b').model, null, 'Beta keeps its own model');
    await picker.selectOption('');
    await settle(page);
    assert.equal(host.find('board-a').model, null, 'back to the Hermes main model');

    // Expand = a large, readable chat (not a bare icon), with its own composer.
    await canvas.locator('[data-action="pc-chat-expand"]').click();
    const big = canvas.locator('[data-canvas-expanded="chat"] .dy-pc-overlay-card');
    await big.waitFor();
    const bigBox = await big.boundingBox();
    assert.ok(bigBox.width >= 700 && bigBox.height >= 400, `large chat is large (${Math.round(bigBox.width)}x${Math.round(bigBox.height)})`);
    for (const svg of await big.locator('svg').all()) {
      const r = await svg.boundingBox();
      if (r) assert.ok(r.width <= 24 && r.height <= 24, `icons stay icon-sized in the large view (${Math.round(r.width)}px)`);
    }
    assert.equal(await canvas.locator('[data-canvas-chat-input-large]').isVisible(), true, 'large view has a message box');
    assert.equal(await page.evaluate(() => document.activeElement?.closest('[data-canvas-expanded]') !== null), true, 'focus moves into the large view');
    await page.keyboard.press('Escape');
    assert.equal(await canvas.locator('[data-canvas-expanded]').count(), 0, 'Escape closes the large view');

    // Then edit plan steps from an approved proposal.
    await canvas.locator('[data-action="pc-curate"]').click();
    await page.waitForSelector('[data-canvas-proposals]');
    await canvas.locator('[data-action="approve-canvas-proposal"]').click();
    await page.waitForSelector('[data-action="plan-from-proposal"]');
    await canvas.locator('[data-action="plan-from-proposal"]').click();
    await page.waitForSelector('[data-canvas-plan]');
    await canvas.locator('[data-action="pc-steps-edit"]').click();
    await page.waitForSelector('[data-canvas-expanded] [data-canvas-steps-editor]');
    const titles = canvas.locator('[data-canvas-step-title]');
    assert.equal(await titles.count(), 2);
    await titles.nth(1).fill('Ship the safe preview');
    await canvas.locator('[data-action="pc-step-up"]').nth(1).click();
    await canvas.locator('[data-action="pc-step-add"]').click();
    await canvas.locator('[data-canvas-step-title]').nth(2).fill('Tell the users');
    await canvas.locator('[data-action="pc-steps-save"]').click();
    await settle(page);
    const saved = host.calls.filter((c) => c.method === 'PATCH' && /\/plans\//.test(c.path)).at(-1);
    assert.deepEqual(saved.body.steps, [{ order: 2, title: 'Ship the safe preview' }, { order: 1, title: 'Measure the funnel' }, { title: 'Tell the users' }], 'reorder + edit + add reach the wire, kept steps keep their order id');
    assert.equal(await canvas.locator('[data-canvas-steps-editor]').count(), 0, 'editor closes after save');
    await canvas.locator('[data-action="pc-expanded-close"]').click();
    assert.equal(await canvas.locator('[data-canvas-expanded]').count(), 0);
    assert.match(await canvas.locator('[data-canvas-plan] .dy-pc-plan-steps').innerText(), /1\. Ship the safe preview\n2\. Measure the funnel\n3\. Tell the users/);
  });
});

test('Planning boards: leaving Planning or the project tab with unsaved edits offers Save, Discard and Cancel', { timeout: 180000 }, async () => {
  await withPage(1440, 900, async (page, host) => {
    const canvas = root(page);
    const addSticker = async (text) => {
      await canvas.locator('[data-canvas-draft]').fill(text);
      await canvas.locator('[data-action="add-canvas-object"]').click();
      await page.keyboard.press('Escape');
      await page.waitForSelector('[data-planning-canvas][data-canvas-dirty="true"]');
    };
    const puts = () => host.calls.filter((c) => c.method === 'PUT').length;
    const before = host.find('board-a').objects.length;

    // 1. Project view switch (Planning -> Overview): Cancel keeps you and the edit.
    await addSticker('View switch idea');
    await page.click('[data-project-view="overview"]');
    const viewPrompt = page.locator('[data-view-switch-confirm]');
    await viewPrompt.waitFor();
    assert.equal(await page.evaluate(() => Boolean(document.activeElement?.closest('[data-view-switch-confirm]'))), true, 'focus moves into the prompt');
    await page.keyboard.press('Escape');
    assert.equal(await viewPrompt.count(), 0, 'Escape = Cancel');
    assert.equal(await canvas.getAttribute('data-canvas-dirty'), 'true', 'Cancel keeps the edit');
    // Discard leaves without saving.
    const putsBefore = puts();
    await page.click('[data-project-view="overview"]');
    await page.click('[data-action="view-switch-discard"]');
    await page.waitForSelector('[data-project-view="overview"].active');
    assert.equal(puts(), putsBefore, 'Discard sends no save');
    assert.equal(host.find('board-a').objects.length, before, 'Discard did not save');
    // Save and continue saves first, then leaves.
    await page.click('[data-project-view="planning"]');
    await page.waitForSelector('[data-planning-canvas][data-canvas-board="board-a"]');
    await addSticker('Saved on the way out');
    await page.click('[data-project-view="overview"]');
    await page.click('[data-action="view-switch-save"]');
    await page.waitForSelector('[data-project-view="overview"].active');
    assert.equal(host.find('board-a').objects.length, before + 1, 'Save and continue saved the edit');
    assert.ok(host.find('board-a').objects.some((o) => o.title === 'Saved on the way out' || o.body === 'Saved on the way out' || JSON.stringify(o).includes('Saved on the way out')));

    // 2. Top console tab (Planning -> Dashboard): guarded too (QA F-1).
    await page.click('[data-project-view="planning"]');
    await page.waitForSelector('[data-planning-canvas][data-canvas-board="board-a"]');
    await addSticker('Top tab idea');
    await page.click('[data-tab="dashboard"]');
    const navPrompt = page.locator('[data-project-switch-confirm]');
    await navPrompt.waitFor();
    assert.equal(await navPrompt.getAttribute('data-nav-target'), 'tab:dashboard');
    assert.equal(await canvas.count(), 1, 'the board is still mounted while the prompt is open');
    await page.click('[data-action="nav-cancel"]');
    assert.equal(await navPrompt.count(), 0);
    assert.equal(await canvas.getAttribute('data-canvas-dirty'), 'true', 'Cancel keeps the edit');
    const savedCount = host.find('board-a').objects.length;
    await page.click('[data-tab="dashboard"]');
    await page.click('[data-action="nav-save"]');
    await page.waitForSelector('[data-tab="dashboard"][aria-selected="true"], [data-tab="dashboard"].active', { timeout: 20000 }).catch(() => {});
    await page.waitForFunction(() => !document.querySelector('[data-planning-canvas]'));
    assert.equal(host.find('board-a').objects.length, savedCount + 1, 'Save and continue saved before leaving');
    // Back to Planning, edit, then Discard via the top tab.
    await page.click('[data-tab="project"]');
    await page.click('[data-project-view="planning"]');
    await page.waitForSelector('[data-planning-canvas][data-canvas-board="board-a"]');
    await addSticker('Thrown away');
    const putsBeforeDiscard = puts();
    await page.click('[data-tab="dashboard"]');
    await page.click('[data-action="nav-discard"]');
    await page.waitForFunction(() => !document.querySelector('[data-planning-canvas]'));
    assert.equal(puts(), putsBeforeDiscard, 'Discard sends no save');
    // A clean board leaves with no prompt at all.
    await page.click('[data-tab="project"]');
    await page.click('[data-project-view="planning"]');
    await page.waitForSelector('[data-planning-canvas][data-canvas-dirty="false"]');
    await page.click('[data-tab="dashboard"]');
    await page.waitForFunction(() => !document.querySelector('[data-planning-canvas]'));
    assert.equal(await page.locator('[data-project-switch-confirm]').count(), 0, 'no prompt when nothing is unsaved');
  });
});

test('Planning boards: drag, scroll and arrow keys move around the board; Shift+drag selects', { timeout: 180000 }, async () => {
  await withPage(1440, 900, async (page) => {
    const canvas = root(page);
    const world = canvas.locator('[data-pc-world]');
    const stage = canvas.locator('[data-pc-stage]');
    const pan = async () => (await world.getAttribute('data-canvas-pan')).split(',').map(Number);
    await stage.scrollIntoViewIfNeeded();
    const box = await stage.boundingBox();
    const vh = page.viewportSize().height;
    // Grab an empty, on-screen spot (bottom-left, away from the cards and the chat).
    const sx = box.x + 40; const sy = Math.min(box.y + box.height, vh) - 40;
    assert.match(await page.evaluate(([x, y]) => document.elementFromPoint(x, y)?.className ?? '', [sx, sy]), /dy-pc-(stage|world|svg)/, 'the grab point is empty board');
    assert.equal(await stage.evaluate((el) => getComputedStyle(el).cursor), 'grab', 'the board shows a hand cursor');
    const [x0, y0] = await pan();
    await page.mouse.move(sx, sy); await page.mouse.down();
    await page.mouse.move(sx + 150, sy - 120, { steps: 6 });
    assert.equal(await stage.getAttribute('data-pc-panning'), 'true', 'dragging shows the grabbing state');
    await page.mouse.up();
    const [x1, y1] = await pan();
    assert.ok(Math.abs(x1 - x0 - 150) <= 2 && Math.abs(y1 - y0 + 120) <= 2, `drag moves the board (${x0},${y0}) -> (${x1},${y1})`);
    assert.equal(await canvas.locator('.dy-pc-obj.marquee-selected').count(), 0, 'a plain drag selects nothing');
    assert.equal(await canvas.getAttribute('data-canvas-dirty'), 'false', 'moving around is not an edit');
    // Scroll wheel / trackpad moves the board; the page does not scroll.
    const pageY = await page.evaluate(() => scrollY);
    await page.mouse.move(sx, sy);
    await page.mouse.wheel(0, 200);
    await settle(page);
    const [, y2] = await pan();
    assert.ok(y2 < y1, 'scrolling moves the board');
    assert.equal(await page.evaluate(() => scrollY), pageY, 'the page itself does not scroll');
    // Ctrl+scroll zooms.
    const z0 = Number(await world.getAttribute('data-canvas-zoom'));
    await page.keyboard.down('Control'); await page.mouse.wheel(0, -200); await page.keyboard.up('Control');
    await settle(page);
    assert.ok(Number(await world.getAttribute('data-canvas-zoom')) > z0, 'Ctrl+scroll zooms in');
    // Arrow keys move the board when nothing is selected.
    await stage.focus();
    const [x3] = await pan();
    await page.keyboard.press('ArrowRight');
    const [x4] = await pan();
    assert.ok(x4 < x3, 'ArrowRight moves the view right');
    // Shift+drag draws a selection box instead of moving.
    await canvas.locator('[data-action="pc-fit"]').click();
    await settle(page);
    const [px, py] = await pan();
    await stage.scrollIntoViewIfNeeded();
    const b2 = await stage.boundingBox();
    const bottom = Math.min(b2.y + b2.height, page.viewportSize().height);
    await page.keyboard.down('Shift');
    await page.mouse.move(b2.x + 5, b2.y + 5); await page.mouse.down();
    await page.mouse.move(b2.x + b2.width * 0.6, bottom - 10, { steps: 6 });
    await page.mouse.up();
    await page.keyboard.up('Shift');
    assert.ok(await canvas.locator('.dy-pc-obj.marquee-selected').count() >= 1, 'Shift+drag selects cards');
    assert.deepEqual(await pan(), [px, py], 'Shift+drag does not move the board');
  });
});

test('Planning boards: board list create, rename, archive, restore, status and read-only', { timeout: 180000 }, async () => {
  await withPage(1440, 900, async (page, host) => {
    const canvas = root(page);
    // Create (duplicate names are refused by the server and shown).
    await canvas.locator('[data-action="pc-board-new"]').click();
    await canvas.locator('[data-canvas-board-form="create"]').fill('Beta');
    await canvas.locator('[data-action="pc-board-form-save"]').click();
    await settle(page);
    assert.equal(await canvas.getAttribute('data-canvas-board'), 'board-a', 'a refused create does not switch boards');
    await canvas.locator('[data-canvas-board-form="create"]').fill('Gamma');
    await canvas.locator('[data-canvas-board-form="create"]').press('Enter');
    await page.waitForSelector('[data-canvas-board-name]:has-text("Gamma")');
    assert.equal(await canvas.locator('[data-canvas-object]').count(), 0, 'a new board opens empty');
    assert.equal(await canvas.locator('[data-canvas-board-row]').count(), 3);

    // Rename.
    await canvas.locator('[data-action="pc-board-rename"]').click();
    await canvas.locator('[data-canvas-board-form="rename"]').fill('Gamma two');
    await canvas.locator('[data-action="pc-board-form-save"]').click();
    await page.waitForSelector('[data-canvas-board-name]:has-text("Gamma two")');

    // Unsaved edits block a switch.
    await canvas.locator('[data-canvas-draft]').fill('Unsaved sticker');
    await canvas.locator('[data-action="add-canvas-object"]').click();
    // Unsaved edits: switching asks Save / Discard / Cancel.
    const newId = await canvas.getAttribute('data-canvas-board');
    await canvas.locator('[data-canvas-board-row="board-a"] button.dy-pc-board-row').click();
    await page.waitForSelector('[data-canvas-unsaved-prompt]');
    assert.equal(await canvas.getAttribute('data-canvas-board'), newId, 'nothing switches before a choice');
    await canvas.locator('[data-action="pc-leave-cancel"]').click();
    assert.equal(await canvas.locator('[data-canvas-unsaved-prompt]').count(), 0);
    assert.equal(await canvas.getAttribute('data-canvas-dirty'), 'true', 'Cancel keeps the edit');
    await canvas.locator('[data-canvas-board-row="board-a"] button.dy-pc-board-row').click();
    await canvas.locator('[data-action="pc-leave-save"]').click();
    await page.waitForSelector('[data-planning-canvas][data-canvas-board="board-a"]');
    assert.equal(host.find(newId).objects.length, 1, 'Save and continue saved the edit first');
    // Discard path: edit Alpha, switch back, discard.
    await canvas.locator('[data-canvas-draft]').fill('Throwaway');
    await canvas.locator('[data-action="add-canvas-object"]').click();
    await canvas.locator(`[data-canvas-board-row="${newId}"] button.dy-pc-board-row`).click();
    await canvas.locator('[data-action="pc-leave-discard"]').click();
    await page.waitForSelector(`[data-planning-canvas][data-canvas-board="${newId}"]`);
    assert.equal(host.find('board-a').objects.length, 3, 'Discard did not save');
    assert.equal(await canvas.getAttribute('data-canvas-dirty'), 'false');

    // Status moves: draft -> submitted -> planned -> completed (read-only).
    const statusSel = canvas.locator('[data-canvas-board-status]');
    // A dropdown pick only opens the confirmation; Cancel changes nothing.
    await statusSel.selectOption('submitted');
    await page.waitForSelector('[data-canvas-status-confirm="submitted"]');
    await canvas.locator('[data-action="pc-status-cancel"]').click();
    assert.equal(await canvas.getAttribute('data-canvas-status'), 'draft', 'cancel keeps the status');
    assert.equal(host.calls.filter((c) => c.method === 'PATCH' && c.body && 'status' in c.body).length, 0, 'nothing sent before confirm');
    for (const next of ['submitted', 'planned', 'completed']) {
      await statusSel.selectOption(next);
      await canvas.locator('[data-action="pc-status-confirm"]').click();
      await page.waitForSelector(`[data-canvas-status="${next}"]`);
    }
    // Read-only board: the card details are view-only (QA H-5).
    await canvas.locator('[data-canvas-object]').first().click();
    assert.equal(await canvas.locator('[data-canvas-object-title]').isDisabled(), true, 'details are view-only');
    assert.equal(await canvas.locator('[data-action="apply-canvas-object"]').count(), 0, 'no Apply on a read-only board');
    await page.keyboard.press('Escape');
    assert.equal(await canvas.getAttribute('data-canvas-dirty'), 'false');
    assert.equal(await canvas.locator('[data-action="pc-save"]').isDisabled(), true, 'completed board cannot be saved');
    assert.equal(await canvas.locator('[data-action="pc-curate"]').isDisabled(), true, 'completed board cannot be curated');
    assert.equal(await canvas.locator('[data-canvas-draft]').isDisabled(), true, 'completed board cannot take new stickers');
    const cardBefore = await canvas.locator('[data-canvas-object]').first().getAttribute('data-canvas-x');
    const box = await canvas.locator('[data-canvas-object]').first().boundingBox();
    await page.mouse.move(box.x + 30, box.y + 20); await page.mouse.down(); await page.mouse.move(box.x + 200, box.y + 120, { steps: 5 }); await page.mouse.up();
    assert.equal(await canvas.locator('[data-canvas-object]').first().getAttribute('data-canvas-x'), cardBefore, 'completed board cards do not move');
    await statusSel.selectOption('planned');
    await canvas.locator('[data-action="pc-status-confirm"]').click();
    await page.waitForSelector('[data-canvas-status="planned"]');
    assert.equal(await canvas.locator('[data-action="pc-curate"]').isDisabled(), false, 'reopened board is editable');

    // Archive the open board: it moves to the next live board.
    const openId = await canvas.getAttribute('data-canvas-board');
    await canvas.locator(`[data-canvas-board-row="${openId}"] [data-action="pc-board-archive"]`).click();
    await page.waitForFunction((id) => document.querySelector('[data-planning-canvas]').getAttribute('data-canvas-board') !== id, openId);
    assert.equal(host.find(openId).status, 'archived');
    assert.equal(host.find(openId).archived_from, 'planned');
    assert.equal(await canvas.locator(`[data-canvas-board-row="${openId}"]`).count(), 0, 'archived board leaves the live list');

    // Show archived, restore to its previous status.
    await canvas.locator('[data-action="pc-board-show-archived"]').click();
    await page.waitForSelector(`[data-canvas-board-row="${openId}"][data-canvas-board-archived]`);
    await canvas.locator(`[data-canvas-board-row="${openId}"] [data-action="pc-board-restore"]`).click();
    await settle(page);
    assert.equal(host.find(openId).status, 'planned', 'restore returns the board to where it was');
    await canvas.locator('[data-action="pc-board-show-archived"]').click();
    assert.equal(await canvas.locator('[data-canvas-board-archived]').count(), 0);

    // Collapse and re-open the list.
    const toggle = canvas.locator('[data-action="pc-board-toggle"]');
    assert.equal(await toggle.getAttribute('aria-expanded'), 'true');
    assert.equal(await toggle.getAttribute('data-canvas-board-toggle'), 'open', 'open list shows the up chevron');
    await toggle.click();
    assert.equal(await canvas.locator('[data-canvas-board-row]').count(), 0);
    assert.equal(await toggle.getAttribute('aria-expanded'), 'false');
    assert.equal(await toggle.getAttribute('data-canvas-board-toggle'), 'closed', 'closed list shows the down chevron');
    await toggle.click();
    assert.ok(await canvas.locator('[data-canvas-board-row]').count() >= 3);
    // Actions sit above the board list, and the open board is marked.
    const actionsY = (await canvas.locator('[data-action="pc-board-new"]').boundingBox()).y;
    const listY = (await canvas.locator('.dy-pc-board-list').boundingBox()).y;
    assert.ok(actionsY < listY, 'board actions are above the list');
    const openRow = canvas.locator('[data-canvas-board-active="true"]');
    assert.equal(await openRow.count(), 1, 'exactly one board is marked open');
    assert.equal(await openRow.getAttribute('data-canvas-board-row'), await canvas.getAttribute('data-canvas-board'));
    assert.equal(await openRow.locator('[data-canvas-board-open]').count(), 1, 'the open board has an Open tag');
  });
});

for (const [label, width, height] of [['desktop', 1440, 900], ['phone', 390, 844]]) {
  test(`Planning boards (${label}): every toolbar tool is labelled, explained and works`, { timeout: 180000 }, async () => {
    await withPage(width, height, async (page, host) => {
      const canvas = root(page);
      const tools = await canvas.locator('.dy-pc-toolbar .dy-pc-tool').evaluateAll((rows) => rows.map((row) => {
        const button = row.querySelector('button');
        const tip = row.querySelector('.dy-pc-tip');
        return { action: button.dataset.action, name: button.getAttribute('aria-label'), icon: Boolean(button.querySelector('svg')), tip: tip ? tip.textContent.trim() : '' };
      }));
      assert.ok(tools.length >= 16, `toolbar tools found: ${tools.length}`);
      for (const t of tools) {
        assert.ok(t.name, `${t.action} needs an accessible name`);
        assert.ok(t.icon, `${t.action} needs an icon`);
        if (t.action !== 'pc-add-menu') assert.ok(t.tip.startsWith(t.name) && t.tip.length > t.name.length + 5, `${t.action} needs a name + one-line tooltip (got "${t.tip}")`);
      }
      // Tooltip shows on keyboard focus (desktop only; phone hides tooltips).
      if (width > 700) {
        await canvas.locator('[data-action="pc-tidy"]').focus();
        await page.waitForTimeout(250);
        assert.equal(await canvas.locator('[data-action="pc-tidy"] + .dy-pc-tip').evaluate((el) => getComputedStyle(el).opacity), '1', 'tooltip shows on focus');
      }
      // Every enabled button is clickable and does its job without errors.
      const zoom = () => canvas.locator('[data-canvas-zoom-readout]').getAttribute('data-canvas-zoom-readout');
      const z0 = Number(await zoom());
      await canvas.locator('[data-action="pc-zoom-in"]').click();
      assert.ok(Number(await zoom()) > z0, 'zoom in');
      await canvas.locator('[data-action="pc-zoom-out"]').click();
      await canvas.locator('[data-action="pc-zoom-out"]').click();
      assert.ok(Number(await zoom()) < z0, 'zoom out');
      await canvas.locator('[data-action="pc-fit"]').click();
      await canvas.locator('[data-action="pc-mode-connect"]').click();
      assert.match(await canvas.locator('[data-action="pc-mode-connect"]').getAttribute('class'), /primary/);
      await canvas.locator('[data-action="pc-mode-select"]').click();
      await canvas.locator('[data-action="pc-add-menu"]').click();
      assert.equal(await canvas.locator('.dy-pc-addmenu').isVisible(), true, 'add menu opens');
      await canvas.locator('[data-canvas-add-kind="question"]').click();
      assert.equal(await canvas.locator('.dy-pc-addmenu').isVisible(), false, 'add menu closes after a pick');
      assert.equal(await canvas.locator('[data-canvas-object]').count(), 4, 'a question sticker was added');
      await canvas.locator('[data-action="pc-undo"]').click();
      assert.equal(await canvas.locator('[data-canvas-object]').count(), 3, 'undo');
      await canvas.locator('[data-action="pc-redo"]').click();
      assert.equal(await canvas.locator('[data-canvas-object]').count(), 4, 'redo');
      // Adding a sticker opens its details; Esc closes them before the next pick.
      await page.keyboard.press('Escape');
      await settle(page);
      assert.equal(await canvas.locator('[data-canvas-drawer]').getAttribute('data-canvas-drawer'), 'none', 'Esc closes the details panel');
      await canvas.locator('[data-canvas-object="a-ev"]').click();
      await canvas.locator('[data-action="pc-duplicate"]').click();
      assert.equal(await canvas.locator('[data-canvas-object]').count(), 5, 'duplicate');
      await page.keyboard.press('Escape');
      await canvas.locator('[data-action="pc-tidy"]').click();
      await canvas.locator('[data-action="pc-save"]').click();
      await settle(page);
      assert.equal(host.find('board-a').objects.length, 5, 'save reached the open board');
      await canvas.locator('[data-action="pc-review"]').click();
      await settle(page);
      await canvas.locator('[data-action="pc-reload"]').click();
      await settle(page);
      await canvas.locator('[data-action="pc-curate"]').click();
      await page.waitForSelector('[data-canvas-proposals]');
      assert.deepEqual(await layoutProblems(page), [], 'no overlap/cut-off after using every tool');
    });
  });
}
