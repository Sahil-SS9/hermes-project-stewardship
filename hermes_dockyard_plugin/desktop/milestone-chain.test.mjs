// PM-0009 genuine frontend -> proxy -> backend chain test.
//
// Chain under test (no mocks at the HTTP layer):
//   plugin.js render + click navigation  ->  api()/act()  ->  real fetch()
//   ->  real HTTP server  ->  plugin_api router (proxy)  ->  backend ASGI app
//   ->  temp dockyard.db
//
// The ONLY stub is Hermes host plumbing: ctx.rest is bound to real fetch()
// against the spawned server, which is exactly what the Hermes host provides.
//
// Server process: a python child serves the FastAPI app that mounts the
// plugin router under /api/plugins/hermes-dockyard with the backend app
// installed as plugin_api._app (identical to the pytest client fixture in
// tests/test_dockyard_plugin_backend.py). Temp DB per run.
//
// Failure-detection property: if a milestone proxy route is removed, the
// rest()-based journey gets a 404 and fails. If the frontend loading path is
// removed (loadProjectData milestone fetch or the PlanningPanel render), the
// milestone row never renders or the false-empty message appears — both fail
// the UI assertions.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const DASH_PKG = fileURLToPath(new URL('../dashboard/package.json', import.meta.url));
const require = createRequire(DASH_PKG);
const { JSDOM, VirtualConsole } = require('jsdom');
const React = require('react');
const { act } = React;
const { createRoot } = require('react-dom/client');
const rt = require('react/jsx-runtime');

const PLUGIN_PATH = fileURLToPath(new URL('./plugin.js', import.meta.url));
const PYTHON = process.env.STEWARD_TEST_PYTHON
  || fileURLToPath(new URL('../../.venv/bin/python', import.meta.url));

const SERVER_SCRIPT = `
import importlib, os, sys, tempfile, atexit, shutil
from pathlib import Path
sys.modules['httpx'] = importlib.import_module('httpx2')
root = tempfile.mkdtemp(prefix='pm0009-chain-')
atexit.register(shutil.rmtree, root, ignore_errors=True)
os.environ['DOCKYARD_PLUGIN_DB'] = str(Path(root) / 'dockyard.db')
os.environ['HERMES_HOME'] = root
os.environ['HERMES_KANBAN_HOME'] = root
sys.path.insert(0, os.environ['PLUGIN_DIR'])
import plugin_api
from fastapi import FastAPI
from hermes_project_stewardship.api.server import create_app
from hermes_project_stewardship.kanban import ReferenceKanbanAdapter
from hermes_project_stewardship.persistence.service import StewardshipService
store = plugin_api._store
adapter = ReferenceKanbanAdapter(store)
plugin_api._app = create_app(store, kanban_adapter=adapter)
plugin_api._client = plugin_api.httpx.AsyncClient(
    transport=plugin_api.httpx.ASGITransport(app=plugin_api._app),
    base_url="http://dockyard.test",
)
StewardshipService(store).enable("chain-project", lead_profile="fixture", autonomy_level=2)
app = FastAPI()
app.include_router(plugin_api.plugin_api, prefix="/api/plugins/hermes-dockyard")
import uvicorn
uvicorn.run(app, host="127.0.0.1", port=int(os.environ["PM0009_PORT"]), log_level="error")
`;

function waitReady(url, timeoutMs = 30000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const probe = () => {
      fetch(url)
        .then((r) => (r.ok ? resolve(r) : retry()))
        .catch(retry);
    };
    const retry = () => {
      if (Date.now() - start > timeoutMs) reject(new Error('server never became ready'));
      else setTimeout(probe, 250);
    };
    probe();
  });
}

function evaluatePlugin(source, host) {
  let stripped = source.replace(/^import\s.*$/gm, '');
  stripped = stripped.replace(/^export default __plugin;?$/m, '');
  const stub = `\nconst jsx = __rt.jsx, jsxs = __rt.jsxs, Fragment = __rt.Fragment;\nconst { useEffect, useState } = React;\n`;
  const factory = new Function(
    'React', '__rt', 'host',
    `${stub}${stripped}\nreturn { plugin: __plugin };`,
  );
  return factory(React, rt, host);
}

const FALSE_EMPTY_MESSAGE = 'No milestones yet. Create one in the Dockyard dashboard; it appears here for review.';

test('milestone journey: real UI drives real HTTP through proxy to backend', async () => {
  // 1. spawn the real server (real backend + real proxy router + temp DB)
  const port = 18900 + Math.floor(Math.random() * 500);
  const child = spawn(PYTHON, ['-c', SERVER_SCRIPT], {
    env: {
      ...process.env,
      PM0009_PORT: String(port),
      PLUGIN_DIR: fileURLToPath(new URL('../../dashboard', import.meta.url)),
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let serverOutput = '';
  child.stdout.on('data', (d) => { serverOutput += d; });
  child.stderr.on('data', (d) => { serverOutput += d; });
  const base = `http://127.0.0.1:${port}/api/plugins/hermes-dockyard`;
  const originalConsoleError = console.error;
  const originalConsoleWarn = console.warn;
  const reactWarnings = [];
  const jsdomWarnings = [];

  try {
    await waitReady(`${base}/health`);

    // 2. run the real frontend plugin in jsdom with ctx.rest = real fetch
    const virtualConsole = new VirtualConsole();
    virtualConsole.on('jsdomError', (error) => jsdomWarnings.push(error.message));
    console.error = (...args) => { reactWarnings.push(args.join(' ')); originalConsoleError(...args); };
    console.warn = (...args) => { reactWarnings.push(args.join(' ')); originalConsoleWarn(...args); };
    const dom = new JSDOM('<!doctype html><html><head><meta charset="utf-8"></head><body><div id="root"></div></body></html>', {
      url: 'http://localhost/dockyard',
      pretendToBeVisual: true,
      virtualConsole,
    });
    global.document = dom.window.document;
    global.window = dom.window;
    global.HTMLElement = dom.window.HTMLElement;
    global.SVGElement = dom.window.SVGElement;
    global.Element = dom.window.Element;
    global.Node = dom.window.Node;
    global.FileReader = dom.window.FileReader;
    global.File = dom.window.File;
    global.Blob = dom.window.Blob;
    global.MutationObserver = dom.window.MutationObserver;
    global.getComputedStyle = dom.window.getComputedStyle.bind(dom.window);
    Object.defineProperty(global, 'navigator', { value: dom.window.navigator, configurable: true });
    global.IS_REACT_ACT_ENVIRONMENT = true;

    const rest = async (path, init = {}) => {
      const method = init.method || 'GET';
      const response = await fetch(`${base}${path}`, {
        method,
        headers: { 'content-type': 'application/json' },
        body: init.body,
      });
      const text = await response.text();
      let payload = {};
      try { payload = text ? JSON.parse(text) : {}; } catch { payload = { raw: text }; }
      if (!response.ok) {
        throw new Error(typeof payload?.detail === 'string'
          ? payload.detail
          : JSON.stringify(payload?.detail ?? payload));
      }
      return payload;
    };

    const loaded = evaluatePlugin(readFileSync(PLUGIN_PATH, 'utf8'), { rest });
    const contributions = [];
    loaded.plugin.register({
      register: (item) => contributions.push(item),
      registerMany: (items) => contributions.push(...items),
      onDispose: () => {},
      rest,
      os: { writeClipboard: async () => true },
    });
    const route = contributions.find((item) => item.area === 'routes');
    assert(route, 'plugin did not register a route contribution');
    const doc = dom.window.document;
    const root = createRoot(doc.getElementById('root'));
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    const flush = async (ms = 60) => { await act(async () => { await wait(ms); }); };
    const click = async (selector, ms = 80) => {
      const element = doc.querySelector(selector);
      assert(element, `missing click target: ${selector}`);
      await act(async () => { element.click(); await wait(ms); });
    };
    // real-chain loads are slower than the fake harness: poll instead of a
    // fixed sleep so the test is deterministic against live HTTP latency.
    const waitFor = async (selector, timeoutMs = 8000) => {
      const start = Date.now();
      while (Date.now() - start < timeoutMs) {
        const element = doc.querySelector(selector);
        if (element) return element;
        await act(async () => { await wait(60); });
      }
      assert.fail(`timed out waiting for: ${selector}`);
    };

    await act(async () => {
      root.render(route.render());
      await wait(80);
    });

    // 3. drive the REAL UI into the project Planning view.
    //    'chain-project' is the only enabled project, so the project tab's
    //    first-project default selects it and loadProjectData runs the full
    //    nine-fetch fan-out (including GET /projects/:id/milestones) through
    //    the real proxy -> backend chain.
    await click('[data-tab="project"]');
    await waitFor('[data-project-dashboard]');
    await click('[data-project-view="planning"]');
    await waitFor('[data-planning-panel]');

    // Before any milestone exists the panel must show the honest empty state.
    assert(
      doc.body.textContent.includes(FALSE_EMPTY_MESSAGE),
      'planning panel did not render the documented empty state before any milestone exists',
    );

    // 4. create a milestone through the real chain (the panel intentionally
    //    has no create form; creation lives in the Dockyard dashboard).
    await rest('/projects/chain-project/milestones', {
      method: 'POST',
      body: JSON.stringify({ name: 'Chain Release', due: '2026-12-01', actor_id: 'sahil', actor_kind: 'human' }),
    });

    // 5. drive a REAL UI reload: switch tab away and back. loadScope changes
    //    force loadProjectData to re-run its milestone fetch through the
    //    proxy. This is the frontend loading path under test.
    await click('[data-tab="dashboard"]');
    await click('[data-tab="project"]');
    await click('[data-project-view="planning"]');
    const milestoneRow = await waitFor('[data-milestone-row="Chain Release"]', 12000);
    assert(
      milestoneRow,
      'milestone created over the real chain is not rendered in the Planning view — frontend loading path or proxy route is broken',
    );
    assert(
      !doc.body.textContent.includes(FALSE_EMPTY_MESSAGE),
      'false-empty milestone state shown while the backend holds a milestone',
    );

    // 6. UI-driven detail load: the row toggle issues GET milestone detail
    //    through the real proxy and renders the scope breakdown.
    await click('[data-milestone-row="Chain Release"] .dockyard-planning-toggle', 120);
    assert(
      /Scope:/.test(doc.querySelector('[data-milestone-row="Chain Release"]')?.textContent ?? ''),
      'milestone detail did not load through the real chain when the row was expanded',
    );

    // 7. failure propagation over the real chain: an unknown milestone must
    //    surface an error, never a false-empty success.
    await assert.rejects(
      () => rest('/projects/chain-project/milestones/Does-Not-Exist'),
      /404|missing|not/i,
      'missing milestone did not surface an error over the real chain',
    );

    // rename over the real chain persists (proxy POST -> backend mutation).
    await rest(`/projects/chain-project/milestones/${encodeURIComponent('Chain Release')}/rename`, {
      method: 'POST',
      body: JSON.stringify({ new_name: 'Chain Shipped', actor_id: 'sahil', actor_kind: 'human' }),
    });
    await click('[data-tab="dashboard"]');
    await click('[data-tab="project"]');
    await click('[data-project-view="planning"]');
    const renamedRow = await waitFor('[data-milestone-row="Chain Shipped"]', 12000);
    assert(
      renamedRow,
      'renamed milestone did not render after a real UI reload — rename did not persist through the chain',
    );

    await act(async () => {
      root.unmount();
      await wait(0);
      dom.window.close();
    });
  } finally {
    child.kill('SIGTERM');
    console.error = originalConsoleError;
    console.warn = originalConsoleWarn;
    if (reactWarnings.length > 0 || jsdomWarnings.length > 0) {
      assert.fail(`unexpected React/jsdom warnings:\n${[...reactWarnings, ...jsdomWarnings].join('\\n')}`);
    }
    if (serverOutput.includes('Traceback')) {
      console.error('server reported an error:\n', serverOutput.slice(-800));
    }
  }
}, { timeout: 120000 });
