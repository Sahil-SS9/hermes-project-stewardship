import assert from 'node:assert/strict'
import { build } from '../dashboard/node_modules/esbuild/lib/main.js'
import { readFile, rm, mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { createRequire } from 'node:module'
const require = createRequire(new URL('../dashboard/package.json', import.meta.url))
const { chromium } = require('playwright')

test('canvas playback is a real timeline control and returns to live state', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'dockyard-canvas-playback-'))
  const out = join(dir, 'mount.js')
  await build({entryPoints: [new URL('./workflow-canvas-mount.js', import.meta.url).pathname], bundle: true, format: 'iife', globalName: 'DockyardCanvas', platform: 'browser', outfile: out, loader: {'.ts': 'ts'}})
  const code = await readFile(out, 'utf8')
  const browser = await chromium.launch({headless: true})
  try {
    const page = await browser.newPage({viewport: {width: 1200, height: 800}})
    await page.setContent('<main id="host"></main>')
    await page.addScriptTag({content: code})
    const runs = [{run_key: 'r1', version: 1, status: 'pending', started_at: '2026-09-28T12:00:00Z', updated_at: '2026-09-28T12:00:02Z', nodes: [
      {node_id: 'a', title: 'Plan', depends_on: [], human_gate: false, kind: 'task', status: 'done', task_ref: null, assignee: null, evidence_refs: []},
      {node_id: 'b', title: 'Build', depends_on: ['a'], human_gate: false, kind: 'task', status: 'working', task_ref: null, assignee: null, evidence_refs: []},
    ]}]
    await page.evaluate((runs) => DockyardCanvas.mountDesktopWorkflowCanvas(document.querySelector('#host'), 'p1', 'release', {nodes: runs[0].nodes}, runs, {pollMs: 0}), runs)
    await page.locator('[data-node-id="a"]').waitFor()
    const slider = page.getByRole('slider', {name: 'Workflow playback'})
    const play = page.getByRole('button', {name: '▶ Play'})
    assert.equal(await slider.isDisabled(), true, 'without timeline data playback is disabled')
    // Timeline arrives through the adapter callback, exactly as the real API path does.
    await page.evaluate(() => {
      document.querySelector('#host').replaceChildren()
      const runs = [{run_key: 'r1', version: 1, status: 'pending', started_at: '2026-09-28T12:00:00Z', updated_at: '2026-09-28T12:00:02Z', nodes: [
        {node_id: 'a', title: 'Plan', depends_on: [], human_gate: false, kind: 'task', status: 'done', task_ref: null, assignee: null, evidence_refs: []},
        {node_id: 'b', title: 'Build', depends_on: ['a'], human_gate: false, kind: 'task', status: 'working', task_ref: null, assignee: null, evidence_refs: []},
      ]}]
      globalThis.__dispose = DockyardCanvas.mountDesktopWorkflowCanvas(document.querySelector('#host'), 'p1', 'release', {nodes: runs[0].nodes}, runs, {pollMs: 0, fetchTimeline: async () => ({events: [
        {seq: 0, node_id: 'a', from_status: null, to_status: 'backlog', ts: '2026-09-28T12:00:00Z'},
        {seq: 1, node_id: 'a', from_status: 'backlog', to_status: 'done', ts: '2026-09-28T12:00:01Z'},
        {seq: 2, node_id: 'b', from_status: null, to_status: 'working', ts: '2026-09-28T12:00:02Z'},
      ]})})
    })
    await page.getByRole('button', {name: '▶ Play'}).waitFor()
    assert.equal(await page.getByRole('slider', {name: 'Workflow playback'}).isDisabled(), false)
    await page.getByRole('button', {name: '▶ Play'}).click()
    await page.getByText('Event 1/3').waitFor()
    assert.equal(await page.locator('[data-node-id="a"]').getAttribute('data-wf-playback-status'), 'backlog')
    await page.getByRole('slider', {name: 'Workflow playback'}).fill('2')
    await page.getByText('Event 3/3').waitFor()
    assert.equal(await page.locator('[data-node-id="b"]').getAttribute('data-wf-playback-status'), 'working')
    const motion = page.getByRole('button', {name: 'Toggle workflow canvas motion'})
    await motion.click()
    assert.equal(await motion.getAttribute('aria-pressed'), 'false')
    assert.ok(await page.locator('#host.dy-wf').evaluate((el) => el.classList.contains('dy-wf-still')))
  } finally { await browser.close(); await rm(dir, {recursive: true, force: true}) }
})
