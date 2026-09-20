import assert from 'node:assert/strict'
import { build } from '../dashboard/node_modules/esbuild/lib/main.js'
import { createRequire } from 'node:module'
const require = createRequire(new URL('../dashboard/package.json', import.meta.url))
const { chromium } = require('playwright')
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'

async function bundle() {
  const dir = await mkdtemp(join(tmpdir(), 'dockyard-canvas-browser-'))
  const out = join(dir, 'mount.js')
  await build({ entryPoints: [new URL('./workflow-canvas-mount.js', import.meta.url).pathname], bundle: true, format: 'iife', globalName: 'DockyardCanvas', platform: 'browser', outfile: out, loader: { '.ts': 'ts' } })
  return { dir, code: await readFile(out, 'utf8') }
}

const definition = { nodes: [
  { id: 'a', title: 'Plan', depends_on: [], human_gate: false },
  { id: 'b', title: 'Build', depends_on: [], human_gate: false },
  { id: 'c', title: 'Ship', depends_on: [], human_gate: false },
] }

async function mounted(page, onEdit) {
  await page.setContent('<main id="host"></main>')
  await page.addScriptTag({ content: this.code })
  await page.evaluate(({ definition, onEdit }) => {
    globalThis.__edits = []
    globalThis.__dispose = DockyardCanvas.mountDesktopWorkflowCanvas(document.querySelector('#host'), 'p1', 'release', definition, [], { pollMs: 0, onEdit: (nodes) => { globalThis.__edits.push(nodes); onEdit?.(nodes) } })
  }, { definition, onEdit })
  await page.locator('[data-node-id="a"]').waitFor()
}

test('browser canvas interactions persist positions, edges, validation feedback, keyboard mode, and save graph', async () => {
  const bundleResult = await bundle()
  const browser = await chromium.launch({ headless: true })
  try {
    const page = await browser.newPage({ viewport: { width: 1200, height: 800 } })
    // Keep the production bundle available to mounted-page tests without a preview server.
    await page.setContent('<main id="host"></main>')
    await page.addScriptTag({ content: bundleResult.code })
    await page.evaluate((definition) => {
      globalThis.__edits = []
      globalThis.__dispose = DockyardCanvas.mountDesktopWorkflowCanvas(document.querySelector('#host'), 'p1', 'release', definition, [], { pollMs: 0, onEdit: (nodes) => globalThis.__edits.push(nodes) })
    }, definition)
    await page.locator('[data-node-id="a"]').waitFor()

    const a = page.locator('[data-node-id="a"]')
    const box = await a.boundingBox(); assert.ok(box)
    await page.mouse.move(box.x + 50, box.y + 30)
    await page.mouse.down()
    await page.mouse.move(box.x + 110, box.y + 80)
    await page.mouse.up()
    const moved = await page.evaluate(() => globalThis.__edits.at(-1).find((n) => n.node_id === 'a'))
    assert.equal(moved.canvas_position.x, 120)
    assert.equal(moved.canvas_position.y, 110)

    const portA = page.locator('[data-connect-from="a"]')
    const b = page.locator('[data-node-id="b"]')
    const bb = await b.boundingBox(); assert.ok(bb)
    const pb = await portA.boundingBox(); assert.ok(pb)
    await portA.dispatchEvent('pointerdown', { button: 0, pointerId: 1, clientX: pb.x + 2, clientY: pb.y + 2 })
    await b.dispatchEvent('pointerup', { button: 0, clientX: bb.x + bb.width - 5, clientY: bb.y + bb.height / 2 })
    await new Promise((resolve) => setTimeout(resolve, 0))
    const connected = await page.evaluate(() => globalThis.__edits.at(-1).find((n) => n.node_id === 'b'))
    assert.deepEqual(connected.depends_on, ['a'])

    const portB = page.locator('[data-connect-from="b"]'); const pbb = await portB.boundingBox(); assert.ok(pbb)
    await portB.dispatchEvent('pointerdown', { button: 0 }); await b.dispatchEvent('pointerup', { button: 0 })
    await page.locator('.dy-wf-feed-body').getByText('A node cannot depend on itself').waitFor()
    await portB.dispatchEvent('pointerdown', { button: 0 }); await a.dispatchEvent('pointerup', { button: 0 })
    await page.locator('.dy-wf-feed-body').getByText('Connection would create a cycle').waitFor()

    await a.focus(); await page.keyboard.press('c'); await b.focus(); await page.keyboard.press('Enter')
    const keyboardEdge = await page.evaluate(() => globalThis.__edits.at(-1).find((n) => n.node_id === 'b'))
    assert.deepEqual(keyboardEdge.depends_on, ['a'])

    await b.click(); await page.getByLabel('Node title').fill('Build and ship'); await page.getByLabel('Dependencies').fill('a'); await page.getByLabel('Phase team override').fill('release-bots'); await page.getByRole('button', { name: 'Save graph version' }).click()
    await page.getByRole('button', { name: 'Saved ✓' }).waitFor()
    const saved = await page.evaluate(() => globalThis.__edits.at(-1))
    assert.equal(saved.find((n) => n.node_id === 'a').canvas_position.x, 120)
    assert.equal(saved.find((n) => n.node_id === 'b').title, 'Build and ship')
    assert.deepEqual(saved.find((n) => n.node_id === 'b').depends_on, ['a'])
    assert.equal(saved.find((n) => n.node_id === 'b').phase_team, 'release-bots')
    await page.evaluate(() => globalThis.__dispose())
  } finally { await browser.close(); await rm(bundleResult.dir, { recursive: true, force: true }) }
})
