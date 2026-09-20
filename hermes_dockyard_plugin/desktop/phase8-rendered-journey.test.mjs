// Phase 8 rendered journey against a disposable, stateful local host.
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { execFileSync, spawn } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const REPO = path.resolve(HERE, '..', '..')
const DASHBOARD = path.join(REPO, 'hermes_dockyard_plugin', 'dashboard')
const require = createRequire(path.join(DASHBOARD, 'package.json'))
const { chromium } = require('playwright')
const PORT = Number(process.env.PHASE8_PORT || 19502)
const BASE = `http://127.0.0.1:${PORT}`

function buildBundle() {
  const outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hps-p8-'))
  const sdk = path.join(outDir, 'sdk.js')
  const entry = path.join(outDir, 'entry.jsx')
  const bundle = path.join(outDir, 'bundle.js')
  fs.writeFileSync(sdk, 'export const host = { navigate() {} };\n')
  fs.writeFileSync(entry, [
    `import plugin from ${JSON.stringify(path.join(REPO, 'hermes_dockyard_plugin', 'desktop', 'plugin.js'))};`,
    "import React from 'react';",
    "import { createRoot } from 'react-dom/client';",
    'const ctx = {',
    "  rest: async (p, init = {}) => { const r = await fetch('/api' + p, { method: init.method || 'GET', headers: { 'content-type': 'application/json' }, body: init.method && init.method !== 'GET' ? JSON.stringify(init.body) : undefined }); if (!r.ok) { let detail = ''; try { detail = (await r.json())?.detail ?? ''; } catch {} throw Error(`${r.status}: ${detail}`); } return r.json(); },",
    '  os: { writeClipboard: async () => true },',
    '  registerMany(xs) { this.items = xs },',
    '};',
    'plugin.register(ctx);',
    "const page = ctx.items.find((x) => x.area === 'routes');",
    "createRoot(document.getElementById('root')).render(page.render());",
  ].join('\n'))
  const nm = path.join(DASHBOARD, 'node_modules')
  execFileSync(path.join(nm, '.bin', 'esbuild'), [entry, '--bundle', '--format=esm', `--outfile=${bundle}`, '--jsx=automatic', `--alias:@hermes/plugin-sdk=${sdk}`, `--alias:react=${path.join(nm, 'react')}`, `--alias:react/jsx-runtime=${path.join(nm, 'react/jsx-runtime.js')}`, `--alias:react-dom/client=${path.join(nm, 'react-dom', 'client.js')}`, '--log-level=error'], { cwd: DASHBOARD })
  return bundle
}

async function waitForHost() {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try { if ((await fetch(`${BASE}/health`)).ok) return } catch {}
    await new Promise((resolve) => setTimeout(resolve, 250))
  }
  throw new Error('phase 8 disposable host did not become ready')
}

test('Phase 8A/8B rendered disposable journey', { timeout: 240000 }, async () => {
  const bundle = buildBundle()
  const host = spawn(process.execPath, [path.join(HERE, 'phase4-host.mjs')], { env: { ...process.env, PHASE4_PORT: String(PORT), PHASE4_BUNDLE: bundle }, stdio: ['ignore', 'pipe', 'pipe'] })
  let browser
  const errors = []
  try {
    await waitForHost()
    browser = await chromium.launch({ headless: true, args: ['--disable-gpu'] })
    const page = await browser.newPage({ viewport: { width: 1400, height: 950 } })
    page.on('pageerror', (error) => errors.push(String(error)))
    await page.goto(`${BASE}/desktop`, { waitUntil: 'load' })
    await page.waitForSelector('[data-tab="dashboard"]', { timeout: 20000 })
    await page.locator('select[aria-label="Project context"]').selectOption('payments-relaunch')
    await page.waitForTimeout(500)
    await page.locator('[data-tab="project"]').click()
    await page.waitForSelector('[data-project-view="content"]', { timeout: 20000 })
    await page.locator('[data-project-view="content"]').click()
    const contentPanel = page.locator('[data-project-content="payments-relaunch"]')
    await contentPanel.locator('[data-content-file]').setInputFiles({ name: 'canvas-evidence.txt', mimeType: 'text/plain', buffer: Buffer.from('Verified disposable browser evidence') })
    await contentPanel.getByRole('button', { name: 'Upload content' }).click()
    await contentPanel.locator('[data-project-content-item]').first().waitFor()
    await contentPanel.locator('[data-project-content-item]').first().click()
    await contentPanel.locator('[data-content-preview]').waitFor()
    assert.match(await contentPanel.locator('[data-content-preview]').innerText(), /Verified disposable browser evidence/)
    await page.locator('[data-project-view="planning"]').click()
    const canvas = page.locator('[data-planning-canvas="payments-relaunch"]')
    await canvas.waitFor()
    await canvas.locator('[data-canvas-draft]').fill('Users need a safe preview before import.')
    await canvas.getByRole('button', { name: 'Add object' }).click()
    await canvas.locator('[data-canvas-draft]').fill('The implementation must preserve uploaded evidence.')
    await canvas.getByRole('button', { name: 'Add object' }).click()
    assert.equal(await canvas.locator('[data-canvas-object]').count(), 2)
    const objectIds = await canvas.locator('[data-canvas-object]').evaluateAll((rows) => rows.map((row) => row.dataset.canvasObject))
    const connectorEditor = canvas.locator('[data-canvas-connector-editor]')
    await connectorEditor.locator('select').nth(0).selectOption(objectIds[0])
    await connectorEditor.locator('select').nth(1).selectOption('supports')
    await connectorEditor.locator('select').nth(2).selectOption(objectIds[1])
    await connectorEditor.getByRole('button', { name: 'Connect objects' }).click()
    assert.equal(await canvas.locator('[data-canvas-connector]').count(), 1)
    const first = canvas.locator(`[data-canvas-object="${objectIds[0]}"]`)
    const second = canvas.locator(`[data-canvas-object="${objectIds[1]}"]`)
    const beforeX = await first.getAttribute('data-canvas-x')
    await first.dragTo(second)
    await page.waitForTimeout(200)
    assert.notEqual(await first.getAttribute('data-canvas-x'), beforeX)
    await canvas.getByRole('button', { name: 'Save canvas' }).click()
    await page.waitForTimeout(300)
    assert.match(await canvas.innerText(), /Canvas saved/)
    await canvas.getByRole('button', { name: 'Curate' }).click()
    await page.waitForTimeout(300)
    assert.match(await canvas.innerText(), /Question:/)
    await canvas.locator('[data-canvas-question] textarea').fill('We need a safe import preview.')
    await canvas.getByRole('button', { name: 'Answer' }).click()
    await page.waitForTimeout(300)
    assert.match(await canvas.innerText(), /proposal|Technical implementation plan/i)
    const approve = canvas.getByRole('button', { name: 'Approve' }).first()
    if (await approve.count()) await approve.click()
    assert.deepEqual(errors, [], errors.join('\n'))
  } finally {
    await browser?.close()
    host.kill('SIGTERM')
  }
})
