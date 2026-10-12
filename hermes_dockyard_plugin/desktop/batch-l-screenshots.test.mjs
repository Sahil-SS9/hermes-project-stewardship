// Batch L signoff screenshots: the delivery-ladder Roadmap and the kanban board
// with its Goal chip, in dark and light at 1440, 1024 and 390 wide. Runs inside
// the browser-suite harness so the disposable backend is up. Sahil signs off the
// visuals; this only captures them.
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'
import { mkdirSync } from 'node:fs'

const require = createRequire(fileURLToPath(new URL('../dashboard/package.json', import.meta.url)))
const { chromium } = require('playwright')
const BASE = process.env.STEWARD_DESKTOP_URL || 'http://127.0.0.1:19500/desktop'
const SHOTS = `${process.env.TMPDIR}/hps-batch-l-screens`
mkdirSync(SHOTS, { recursive: true })

const SIZES = [[1440, 900], [1024, 768], [390, 780]]

async function setTheme(page, theme) {
  await page.evaluate((t) => {
    try { localStorage.setItem('dockyard-appearance', t) } catch {}
    try { localStorage.setItem('dockyard-theme', t) } catch {}
  }, theme)
}

test('Batch L: capture ladder + board screenshots for signoff', { timeout: 180000 }, async () => {
  const browser = await chromium.launch({ headless: true })
  try {
    for (const theme of ['dark', 'light']) {
      for (const [width, height] of SIZES) {
        const page = await browser.newPage({ viewport: { width, height } })
        const errors = []
        page.on('pageerror', (error) => errors.push(String(error)))
        await page.goto(BASE)
        await setTheme(page, theme)
        await page.reload()
        await page.waitForTimeout(1500)

        // Roadmap: open a project so the ladder tree and its state chips show.
        await page.getByRole('tab', { name: 'Roadmap' }).click()
        await page.locator('[data-roadmap-screen]').waitFor()
        await page.locator('[data-rm-node^="project:"]').first().click()
        await page.locator('[data-rm-node^="initiative:"]').first().click()
        await page.waitForTimeout(1200)
        await page.screenshot({ path: `${SHOTS}/roadmap-${theme}-${width}.png` })

        // Board: a card's planning row names the goal it works towards.
        await page.getByRole('tab', { name: /Board|Work/i }).first().click()
        await page.waitForTimeout(1500)
        await page.screenshot({ path: `${SHOTS}/board-${theme}-${width}.png` })

        assert.deepEqual(errors, [], `no page errors (${theme} ${width})`)
        await page.close()
      }
    }
  } finally {
    await browser.close()
  }
})
