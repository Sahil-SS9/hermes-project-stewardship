// Desktop surface: the workflow canvas must be STYLED, not black boxes.
//
// This is the regression the 2026-09-22 audit proved missing. The canvas markup
// comes from dashboard/src/workflow-canvas.ts and its rules live in the single
// home dashboard/src/workflow-canvas-css.ts; the Desktop plugin receives them
// through the generated sibling ./workflow-canvas-css.js. Before the fix every
// `var(--dy-wf-*)` fill resolved to nothing, so a task node computed
// fill: rgb(0, 0, 0) and its label computed fill: rgb(0, 0, 0) too — solid
// black boxes with unreadable text on light, black-on-black on dark.
//
// The assertions are COMPUTED-STYLE readings from a real headless Chromium
// running the DESKTOP bundle exactly as the plugin loads itself: plugin.js
// installs its own stylesheets and nothing is injected by the test. A test that
// read style.css as text could never have caught this — the file was correct
// all along; it just never reached the surface.
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import http from 'node:http'
import { createRequire } from 'node:module'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'
import { pickProject } from './test-support/project-scope.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const REPO = join(HERE, '..', '..')
const DASHBOARD = join(REPO, 'hermes_dockyard_plugin', 'dashboard')
const require = createRequire(join(DASHBOARD, 'package.json'))
const { chromium } = require('playwright')

// The palette has ONE home. Expected values are read out of that home rather
// than retyped, so this test cannot drift from the stylesheet either.
const CANVAS_CSS_TS = readFileSync(join(DASHBOARD, 'src', 'workflow-canvas-css.ts'), 'utf8')

function expectedToken(name) {
  const m = CANVAS_CSS_TS.match(new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{3,8})`))
  assert.ok(m, `token --${name} must be declared in workflow-canvas-css.ts`)
  return m[1]
}

/** '#482f5e' -> 'rgb(72, 47, 94)' — the form getComputedStyle reports. */
function rgbOf(hex) {
  const h = hex.replace('#', '')
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h
  return `rgb(${[0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16)).join(', ')})`
}

/** Bundle the REAL desktop plugin.js (and its siblings) with the repo's own
 *  esbuild — the same shape the rendered journey tests use. */
function buildDesktopBundle() {
  const dir = mkdtempSync(join(tmpdir(), 'dockyard-wf-styles-'))
  const sdk = join(dir, 'sdk.js')
  const entry = join(dir, 'entry.jsx')
  const bundle = join(dir, 'bundle.js')
  writeFileSync(sdk, 'export const host = { navigate() {} };\n')
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
    entry, '--bundle', '--format=iife', `--outfile=${bundle}`, '--jsx=automatic',
    `--alias:@hermes/plugin-sdk=${sdk}`,
    `--alias:react=${join(nm, 'react')}`,
    `--alias:react/jsx-runtime=${join(nm, 'react', 'jsx-runtime.js')}`,
    `--alias:react-dom/client=${join(nm, 'react-dom', 'client.js')}`,
    '--log-level=error',
  ], { cwd: DASHBOARD })
  return { dir, code: readFileSync(bundle, 'utf8') }
}

// One definition carrying all four purposes, so the identical-card assertion
// covers the whole vocabulary rather than a single node.
const WORKFLOWS = { workflows: [{
  project_id: 'p1', name: 'release', version: 1, archived_at: null, archived_by: null,
  definition: { nodes: [
    { id: 'a', title: 'Assemble plan', depends_on: [], human_gate: false, kind: 'task' },
    { id: 'g', title: 'Approve deploy', depends_on: ['a'], human_gate: true, kind: 'gate', task_ref: 'INIT-1' },
    { id: 'b', title: 'Branch on gate', depends_on: ['g'], human_gate: false, kind: 'task', when: { node: 'g', status: 'done' } },
    { id: 'l', title: 'Re-verify', depends_on: ['b'], human_gate: false, kind: 'task', loop: { max_iterations: 3, until: { status: 'done' } } },
  ] },
}] }

const RUNS = { runs: [{
  run_key: 'release-1', version: 1, status: 'running',
  started_at: new Date(Date.now() - 60_000).toISOString(), updated_at: new Date().toISOString(),
  nodes: [
    { node_id: 'a', title: 'Assemble plan', depends_on: [], human_gate: false, task_ref: null, kind: 'task', status: 'done', assignee: 'octacon-bot', evidence_refs: [] },
    { node_id: 'g', title: 'Approve deploy', depends_on: ['a'], human_gate: true, task_ref: 'INIT-1', kind: 'gate', status: 'pending', assignee: null, evidence_refs: [] },
    { node_id: 'b', title: 'Branch on gate', depends_on: ['g'], human_gate: false, task_ref: null, kind: 'task', status: 'blocked', assignee: null, evidence_refs: [], when: { node: 'g', status: 'done' } },
    { node_id: 'l', title: 'Re-verify', depends_on: ['b'], human_gate: false, task_ref: null, kind: 'task', status: 'working', assignee: null, evidence_refs: [], loop: { max_iterations: 3, until: { status: 'done' } } },
  ],
}] }

/** Disposable same-origin host: serves /desktop and the plugin's own API paths. */
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
    calls.push({ method: req.method, path })
    res.setHeader('content-type', 'application/json')
    const body =
      path === '/dashboard' ? { projects: [{ id: 'p1', name: 'P1', health: 'healthy', work: {} }] }
        : path === '/onboard/discover' ? { profiles: [] }
          : path === '/projects/p1/workflows' ? WORKFLOWS
            : path === '/projects/p1/workflows/release/runs' ? RUNS
              : path === '/projects/p1/workflows/release/versions' ? { version: 2 }
                : {}
    res.end(JSON.stringify(body))
  })
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve({
      base: `http://127.0.0.1:${server.address().port}`,
      calls,
      close: () => new Promise((r) => server.close(r)),
    }))
  })
}

test('Desktop canvas: computed styles resolve in light and dark (no black boxes)', { timeout: 120000 }, async () => {
  const built = buildDesktopBundle()
  const host = await startHost(built.code)
  let browser
  try {
    browser = await chromium.launch({ headless: true, args: ['--disable-gpu'] })
    const errors = []
    const readings = {}
    for (const theme of ['light', 'dark']) {
      const page = await browser.newPage({ viewport: { width: 1400, height: 950 } })
      page.on('pageerror', (e) => errors.push(`${theme}: ${e.message}`))
      await page.goto(`${host.base}/desktop`, { waitUntil: 'load' })
      await page.addScriptTag({ url: `${host.base}/api/bundle.js` })
      await page.waitForSelector('[data-tab="project"]')
      // Sahil 05/10: the app opens on All projects; pick the project first.
      await pickProject(page, 'p1')
      // The theme switch the Desktop host itself uses is the root's own
      // attribute. Nothing about the CSS is injected by this test.
      if (theme === 'dark') {
        await page.evaluate(() => document.querySelector('.dockyard-root')?.setAttribute('data-theme', 'dark'))
      }
      // Option A: project workflows live under Project > Workflows.
      await page.click('[data-tab="project"]')
      await page.click('[data-project-view="workflows"]')
      await page.waitForSelector('[data-workflow-canvas="release"] [data-node-id="a"]', { timeout: 20000 })
      // Freeze decorative animation so the reading is stable.
      await page.addStyleTag({ content: '*{animation:none !important;transition:none !important}' })

      readings[theme] = await page.evaluate(() => {
        const hostEl = document.querySelector('[data-workflow-canvas]')
        const nodeOf = (id) => document.querySelector(`[data-workflow-canvas] [data-node-id="${id}"]`)
        const styleOf = (el) => getComputedStyle(el)
        const first = nodeOf('a')
        const canvas = document.querySelector('.dy-wf')
        const canvasStyle = styleOf(canvas)
        return {
          hostClasses: hostEl.className,
          hasScopeClass: hostEl.classList.contains('dy-wf-scope'),
          nodeCount: document.querySelectorAll('[data-workflow-canvas] .dy-wf-node').length,
          taskFill: styleOf(first.querySelector('.dy-wf-shape')).fill,
          taskStroke: styleOf(first.querySelector('.dy-wf-shape')).stroke,
          taskLabelFill: styleOf(first.querySelector('.dy-wf-label')).fill,
          // The custom properties must actually resolve on the scope carrier —
          // that is the level the breakage happened at.
          cardFillVar: canvasStyle.getPropertyValue('--dy-wf-card-fill').trim(),
          doneVar: canvasStyle.getPropertyValue('--dy-wf-status-done').trim(),
          // Per-purpose fills, so no purpose can silently fall back to black.
          purposeFills: ['a', 'g', 'b', 'l'].map((id) => {
            const g = nodeOf(id)
            const s = g.querySelector('.dy-wf-shape')
            return { purpose: g.dataset.wfPurpose, fill: styleOf(s).fill }
          }),
          canvasBackground: canvasStyle.backgroundColor,
          stylesheetPresent: [...document.querySelectorAll('style')].some((s) => s.dataset.dyWfStylesheet === 'true'),
        }
      })
      await page.close()

      const read = readings[theme]
      // The scope carrier and the stylesheet both have to be live.
      assert.ok(read.stylesheetPresent, `${theme}: the canvas stylesheet was never installed by the plugin`)
      assert.equal(read.hasScopeClass, true,
        `${theme}: the canvas mount host must carry .dy-wf-scope (got "${read.hostClasses}")`)

      // The exact regression: black boxes with unreadable text.
      assert.notEqual(read.taskFill, 'rgb(0, 0, 0)',
        `${theme}: task node fill is black (canvas CSS did not reach this surface)`)
      assert.notEqual(read.taskLabelFill, 'rgb(0, 0, 0)',
        `${theme}: node label fill is black (unreadable text)`)
      assert.notEqual(read.taskFill, 'none', `${theme}: task node has no fill at all`)

      // ...and the values are the designed TOKENS, not merely "not black".
      assert.equal(read.taskFill, rgbOf(expectedToken('dy-wf-card-fill')),
        `${theme}: the card fill must resolve to the --dy-wf-card-fill token`)
      assert.equal(read.taskStroke, rgbOf(expectedToken('dy-wf-status-done')),
        `${theme}: the done node's outline must carry the status-done token (status stays on the outline)`)
      assert.match(read.taskLabelFill, /^rgb\(/, `${theme}: the label fill must be a resolved colour`)

      for (const row of read.purposeFills) {
        assert.notEqual(row.fill, 'rgb(0, 0, 0)', `${theme}: ${row.purpose} fill is black`)
        assert.equal(row.fill, rgbOf(expectedToken('dy-wf-card-fill')),
          `${theme}: ${row.purpose} uses the same card fill as every node`)
      }
      assert.equal(read.cardFillVar, expectedToken('dy-wf-card-fill'),
        `${theme}: --dy-wf-card-fill must resolve on the scope carrier`)
      assert.equal(read.doneVar, expectedToken('dy-wf-status-done'),
        `${theme}: --dy-wf-status-done must resolve on the scope carrier`)
      assert.notEqual(read.canvasBackground, 'rgba(0, 0, 0, 0)', `${theme}: the canvas frame has no background`)
      assert.equal(read.nodeCount, 4, `${theme}: all four purpose nodes should render`)
    }

    // Identical cards: every purpose shares one fill, and the canvas stage is
    // the same dark surface whichever theme the plugin chrome is in.
    for (const theme of ['light', 'dark']) {
      const fills = readings[theme].purposeFills.map((r) => r.fill)
      assert.equal(new Set(fills).size, 1, `${theme}: every node is the same card`)
    }
    assert.equal(readings.light.canvasBackground, readings.dark.canvasBackground,
      'the canvas stage is dark in both plugin themes (canvas-only dark look)')
    assert.equal(readings.light.canvasBackground, rgbOf(expectedToken('dy-wf-canvas-bg')),
      'the canvas stage resolves to its own token')
    assert.deepEqual(errors, [], errors.join('\n'))
  } finally {
    await browser?.close()
    await host.close()
    rmSync(built.dir, { recursive: true, force: true })
  }
})
