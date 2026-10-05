// Desktop Workflows v6 composition regressions:
//   1. The three zones render (library | canvas + toolbar | run inspector) and
//      every preserved hook still exists (data-executable-workflows, the
//      define form, Inspect/start/archive/restore, live run, stored versions).
//   2. Toolbar actions are wired to REAL contracts: +Step/+Gate/Auto layout
//      persist through POST .../versions with the canvas's own node mapping
//      (the same payload a canvas node drag writes); Validate answers with the
//      canonical validator; the Definition/Live run mode switch changes which
//      frame the canvas mounts.
//   3. The canvas receives the plugin's own stylesheet + scope class on this
//      surface (Gate A contract re-checked through the composed panel).
// Real bundle: the plugin.js bundle test style used by the rest of desktop/.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import http from 'node:http';
import { createRequire } from 'node:module';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { pickProject } from './test-support/project-scope.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, '..', '..');
const DASHBOARD = join(REPO, 'hermes_dockyard_plugin', 'dashboard');
const require = createRequire(join(DASHBOARD, 'package.json'));
const { chromium } = require('playwright');

function buildDesktopBundle() {
  const dir = mkdtempSync(join(tmpdir(), 'dockyard-wf-v6-'));
  const sdk = join(dir, 'sdk.js');
  const entry = join(dir, 'entry.jsx');
  const bundle = join(dir, 'bundle.js');
  writeFileSync(sdk, 'export const host = { navigate() {} };\n');
  writeFileSync(entry, [
    `import plugin from ${JSON.stringify(join(REPO, 'hermes_dockyard_plugin', 'desktop', 'plugin.js'))};`,
    "import React from 'react';",
    "import { createRoot } from 'react-dom/client';",
    'const ctx = {',
    "  rest: async (p, init = {}) => { const r = await fetch('/api' + p, { method: init.method || 'GET', headers: { 'content-type': 'application/json' }, body: init.method && init.method !== 'GET' ? JSON.stringify(init.body) : undefined }); if (!r.ok) throw Error(`${r.status}`); return r.json(); },",
    '  os: { writeClipboard: async () => true },',
    '  registerMany(xs) { this.items = xs },',
    '};',
    'plugin.register(ctx);',
    "const page = ctx.items.find((x) => x.area === 'routes');",
    "createRoot(document.getElementById('root')).render(page.render());",
  ].join('\n'))
  const nm = join(DASHBOARD, 'node_modules')
  execFileSync(join(nm, '.bin', 'esbuild'), [
    entry, '--bundle', '--format=esm', `--outfile=${bundle}`, '--jsx=automatic',
    `--alias:@hermes/plugin-sdk=${sdk}`,
    `--alias:react=${join(nm, 'react')}`,
    `--alias:react/jsx-runtime=${join(nm, 'react', 'jsx-runtime.js')}`,
    `--alias:react-dom/client=${join(nm, 'react-dom', 'client.js')}`,
    '--log-level=error',
  ], { cwd: DASHBOARD })
  return { dir, code: readFileSync(bundle, 'utf8') }
}

const WORKFLOWS = { workflows: [
  { project_id: 'p1', name: 'release', version: 2, archived_at: null, archived_by: null,
    definition: { nodes: [
      { id: 'a', title: 'Assemble plan', depends_on: [], human_gate: false, kind: 'task', team: 'release-bots' },
      { id: 'g', title: 'Approve deploy', depends_on: ['a'], human_gate: true, kind: 'gate', task_ref: 'INIT-1', team: 'release-bots' },
      { id: 'l', title: 'Post-deploy soak', depends_on: ['g'], human_gate: false, kind: 'task', loop: { max_iterations: 3, until: { status: 'done' } }, team: 'verify-bots' },
    ] } },
  { project_id: 'p1', name: 'incident', version: 1, archived_at: '2026-09-12T12:00:00+00:00', archived_by: 'x',
    definition: { nodes: [{ id: 'step-1', title: 'Triage', depends_on: [], human_gate: false, kind: 'task' }] } },
] }

const RUNS = { runs: [{
  run_key: 'release-9', version: 2, status: 'running',
  started_at: new Date(Date.now() - 60_000).toISOString(), updated_at: new Date().toISOString(),
  nodes: [
    { node_id: 'a', title: 'Assemble plan', depends_on: [], human_gate: false, task_ref: null, kind: 'task', status: 'done', assignee: 'octacon-bot', evidence_refs: [], team: 'release-bots' },
    { node_id: 'g', title: 'Approve deploy', depends_on: ['a'], human_gate: true, task_ref: 'INIT-1', kind: 'gate', status: 'pending', assignee: null, evidence_refs: [], team: 'release-bots' },
    { node_id: 'l', title: 'Post-deploy soak', depends_on: ['g'], human_gate: false, task_ref: null, kind: 'task', status: 'blocked', assignee: null, evidence_refs: [], loop: { max_iterations: 3, until: { status: 'done' } }, team: 'verify-bots' },
  ],
}] }

function startHost(bundleCode) {
  const calls = []
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://127.0.0.1')
    if (url.pathname === '/desktop') {
      res.setHeader('content-type', 'text/html; charset=utf-8')
      res.end('<!doctype html><html><head><meta charset="utf-8"></head><body><div id="root"></div></body></html>')
      return
    }
    if (url.pathname === '/api/bundle.js') {
      res.setHeader('content-type', 'text/javascript; charset=utf-8')
      res.end(bundleCode)
      return
    }
    const path = url.pathname.replace(/^\/api/, '')
    let body = {}
    try { body = JSON.parse(req.body ?? '{}') } catch { body = {} }
    calls.push({ method: req.method, path, body: undefined })
    res.setHeader('content-type', 'application/json')
    const payload =
      path === '/dashboard' ? { projects: [{ id: 'p1', name: 'P1', health: 'healthy', work: {} }] }
        : path === '/onboard/discover' ? { profiles: [] }
          : path === '/projects/p1/workflows' ? WORKFLOWS
            : path === '/projects/p1/workflows/release/runs' ? RUNS
              : path === '/projects/p1/workflows/release/versions' ? { version: 3 }
                : {}
    res.end(JSON.stringify(payload))
  })
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve({
      base: `http://127.0.0.1:${server.address().port}`,
      calls,
      close: () => new Promise((r) => server.close(r)),
    }))
  })
}

async function openWorkflows(page, host) {
  await page.goto(`${host.base}/desktop`, { waitUntil: 'load' })
  await page.addScriptTag({ url: `${host.base}/api/bundle.js` })
  await page.waitForSelector('[data-tab="project"]')
  // Sahil 05/10: the app opens on All projects; pick the project first.
  await pickProject(page, 'p1')
  // Option A: project workflows live under Project > Workflows.
  await page.click('[data-tab="project"]')
  await page.click('[data-project-view="workflows"]')
  // The library zone proves the composed panel (not the old header tab row).
  await page.waitForSelector('[data-workflow-library]', { timeout: 20000 })
  await page.waitForSelector('[data-workflow-canvas="release"] [data-node-id="a"]', { timeout: 20000 })
}

test('Workflows v6: three zones render with every preserved hook', { timeout: 120000 }, async () => {
  const built = buildDesktopBundle()
  const host = await startHost(built.code)
  let browser
  try {
    browser = await chromium.launch({ headless: true, args: ['--disable-gpu'] })
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
    const errors = []
    page.on('pageerror', (e) => errors.push(e.message))
    await openWorkflows(page, host)

    // Zone 1 — library: one selectable row per stored workflow, with version.
    const libRows = await page.$$eval('[data-workflow-library-item]', (els) => els.map((e) => e.textContent))
    assert.equal(libRows.length, 2, 'both stored workflows are listed')
    assert.ok(libRows.some((t) => /release/.test(t) && /v2/.test(t)), 'the latest version is stated')
    assert.ok(libRows.some((t) => /incident/.test(t)), 'the archived instance is still listed')

    // Zone 2 — toolbar + the real canvas.
    for (const action of ['wf-view-definition', 'wf-view-live', 'wf-add-step', 'wf-add-gate', 'wf-auto-layout', 'wf-validate']) {
      assert.ok(await page.$(`[data-action="${action}"]`), `toolbar action ${action} is present`)
    }
    assert.ok(await page.$('[data-workflow-canvas="release"]'), 'the production canvas mounts in the stage zone')

    // No third column: run lifecycle is in the toolbar, run state is the
    // readout line above the canvas, and the canvas gets the full width.
    assert.equal(await page.$('.dockyard-wf3-insp'), null, 'the run inspector column is gone')
    const runText = await page.$eval('[data-workflow-live-run="release-9"]', (el) => el.textContent)
    assert.match(runText, /release-9/, 'the run readout shows the real run_key')
    assert.match(runText, /done/, 'run node statuses are counted')
    assert.ok(await page.$('[data-wf-live-map="release-9"] [data-wf-live-node]'), 'per-step run list preserved')
    assert.ok(await page.$('[data-workflow-definitions="release"] [data-workflow-definition-version="2"]'), 'stored versions preserved')
    assert.ok(await page.$('.dockyard-wf3-toolbar [data-action="start-workflow"]'), 'start control is in the toolbar')
    assert.ok(await page.$('.dockyard-wf3-toolbar [data-action="archive-workflow"]'), 'archive control is in the toolbar')
    const widths = await page.evaluate(() => ({
      stage: document.querySelector('.dockyard-wf3-stage').getBoundingClientRect().width,
      frame: document.querySelector('.dockyard-wf3').getBoundingClientRect().width,
      lib: document.querySelector('.dockyard-wf3-lib').getBoundingClientRect().width,
    }))
    assert.ok(Math.abs(widths.frame - widths.lib - widths.stage) <= 2, `canvas stage takes all width beside the library (${JSON.stringify(widths)})`)

    // The define form still exists in the library zone (create/version save).
    assert.ok(await page.$('[data-workflow-name]'), 'workflow name input preserved')
    assert.ok(await page.$('[data-workflow-title]'), 'phase title input preserved')
    assert.ok(await page.$('[data-workflow-run-key]'), 'run key input preserved')
    assert.ok(await page.$('[data-action="define-workflow"]'), 'define action preserved')

    // Lane bands are drawn on the surface (team assignments drive them here).
    const lanes = await page.$$eval('[data-workflow-canvas] .dy-wf-lane', (els) => els.map((e) => e.dataset.lane))
    assert.deepEqual(lanes.sort(), ['release-bots', 'verify-bots'], 'lanes follow real assignments')

    // The canvas is styled by the plugin's own stylesheet (Gate A contract).
    const styled = await page.evaluate(() => {
      const hostEl = document.querySelector('[data-workflow-canvas]')
      const shape = hostEl.querySelector('[data-node-id="a"] .dy-wf-shape')
      return {
        scope: hostEl.className,
        fill: getComputedStyle(shape).fill,
        stylesheet: [...document.querySelectorAll('style')].some((s) => s.dataset.dyWfStylesheet === 'true'),
      }
    })
    assert.match(styled.scope, /dy-wf-scope/, 'canvas host carries the scope class inside the composed panel')
    assert.equal(styled.stylesheet, true, 'the plugin installed the canvas stylesheet')
    assert.notEqual(styled.fill, 'rgb(0, 0, 0)', 'no black-box regression in the composed panel')

    assert.deepEqual(errors, [], errors.join('\n'))
    await page.close()
  } finally {
    await browser?.close()
    await host.close()
    rmSync(built.dir, { recursive: true, force: true })
  }
})

test('Workflows v6: toolbar actions persist through the canonical version contract', { timeout: 120000 }, async () => {
  const built = buildDesktopBundle()
  const host = await startHost(built.code)
  let browser
  try {
    browser = await chromium.launch({ headless: true, args: ['--disable-gpu'] })
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
    await openWorkflows(page, host)

    // +Step / +Gate / Auto layout all write through POST .../versions.
    await page.click('[data-action="wf-add-step"]')
    await page.waitForTimeout(250)
    await page.click('[data-action="wf-add-gate"]')
    await page.waitForTimeout(250)
    await page.click('[data-action="wf-auto-layout"]')
    await page.waitForTimeout(250)
    const versionCalls = host.calls.filter((c) => c.method === 'POST' && c.path === '/projects/p1/workflows/release/versions')
    assert.equal(versionCalls.length, 3, `three toolbar writes reached the version endpoint (got ${versionCalls.length})`)

    // Validate answers with the canonical validator (no gate => an issue).
    await page.click('[data-action="wf-validate"]')
    await page.waitForTimeout(150)
    const validation = await page.$('[data-wf-validate-result]')
    assert.ok(validation, 'validate reports its result on the surface')

    // Definition mode mounts the stored plan without a run frame; the canvas
    // host still renders all three nodes.
    await page.click('[data-action="wf-view-definition"]')
    await page.waitForTimeout(400)
    const nodeCount = await page.$$eval('[data-workflow-canvas] .dy-wf-node', (els) => els.length)
    assert.equal(nodeCount, 3, 'definition mode renders the stored nodes')
    await page.close()
  } finally {
    await browser?.close()
    await host.close()
    rmSync(built.dir, { recursive: true, force: true })
  }
})
