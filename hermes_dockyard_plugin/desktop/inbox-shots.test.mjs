// Batch D — Inbox screenshots for Sahil's visual sign-off: light + dark at
// 1440, 1024 and 390. Runs against the disposable real backend (fixed fixture rows).
import { test } from 'node:test'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import fs from 'node:fs'

const require = createRequire(path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'dashboard', 'package.json'))
const { chromium } = require('playwright')
const BASE = process.env.STEWARD_DESKTOP_URL || 'http://127.0.0.1:19500/desktop'
const OUT = process.env.D_SHOTS || '/home/kensei/HPS-Audit-2026-09-24/evidence/d'

test('Batch D Inbox screenshots: light + dark at 1440/1024/390', { timeout: 180000 }, async () => {
  fs.mkdirSync(OUT, { recursive: true })
  const browser = await chromium.launch({ headless: true })
  for (const theme of ['light', 'dark']) {
    for (const width of [1440, 1024, 390]) {
      const page = await browser.newPage({ viewport: { width, height: 900 } })
      try {
        await page.goto(BASE, { waitUntil: 'load' })
        await page.locator('[data-tab="inbox"]').waitFor({ timeout: 20000 })
        await page.locator('[data-tab="inbox"]').click()
        await page.locator('[data-inbox-screen="true"]').waitFor({ timeout: 20000 })
        // Open the first decidable row so the detail panel is visible.
        const row = page.locator('[data-inbox-row]').first()
        if (await row.count() > 0) {
          await row.click().catch(() => {})
          await page.locator('[data-inbox-panel="true"]').waitFor({ timeout: 8000 }).catch(() => {})
        }
        if (theme === 'dark') {
          await page.evaluate(() => {
            const root = document.querySelector('.dockyard-root')
            if (root) root.setAttribute('data-theme', 'dark')
          })
          await page.waitForTimeout(300)
        }
        await page.screenshot({ path: `${OUT}/D-inbox-${theme}-${width}.png`, fullPage: false })
        console.log(`shot ${OUT}/D-inbox-${theme}-${width}.png`)
      } finally {
        await page.close()
      }
    }
  }
  await browser.close()
})
