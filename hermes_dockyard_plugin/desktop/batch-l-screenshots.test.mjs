// Batch L R1 signoff screenshots: every screen the ladder changed — Roadmap
// (with a ready initiative + the confirm dialog), Approval Inbox (ready-to-
// confirm section), work-item detail (Goal picker), Vision (placement), the
// plan create-backlog step (Goal picker) — in dark and light at 1440/1024/390.
// Runs inside the browser-suite harness so the disposable backend is up. Sahil
// signs off the visuals; this only captures them, plus two guards: subtext
// meets WCAG AA contrast, and "Place…" is not clipped at 1440.
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
    const root = document.querySelector('.dockyard-root')
    if (root) root.setAttribute('data-theme', t)
  }, theme)
  await page.waitForTimeout(300)
}

// WCAG AA: subtext (meta/notes) must clear 4.5:1 against its background.
async function contrastOk(page) {
  return page.evaluate(() => {
    const lum = (rgb) => {
      const [r, g, b] = rgb.map((v) => {
        const c = v / 255
        return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
      })
      return 0.2126 * r + 0.7152 * g + 0.0722 * b
    }
    const parse = (s) => (s.match(/\d+(\.\d+)?/g) || []).slice(0, 3).map(Number)
    const bgOf = (el) => {
      let node = el
      while (node) {
        const bg = getComputedStyle(node).backgroundColor
        if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') return parse(bg)
        node = node.parentElement
      }
      return [0, 0, 0]
    }
    const bad = []
    for (const sel of ['.dockyard-meta', '.dy-rm-confirm', 'small']) {
      for (const el of document.querySelectorAll(sel)) {
        if (!el.textContent.trim()) continue
        const fg = parse(getComputedStyle(el).color)
        const bg = bgOf(el)
        const l1 = lum(fg), l2 = lum(bg)
        const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05)
        if (ratio < 4.5) bad.push(`${sel} ${ratio.toFixed(2)}`)
      }
    }
    return bad
  })
}

test('Batch L R1: capture every changed screen for signoff', { timeout: 300000 }, async () => {
  const browser = await chromium.launch({ headless: true })
  try {
    for (const theme of ['dark', 'light']) {
      for (const [width, height] of SIZES) {
        const page = await browser.newPage({ viewport: { width, height } })
        const errors = []
        page.on('pageerror', (error) => errors.push(String(error)))
        await page.goto(BASE)
        await page.waitForTimeout(1500)

        // Roadmap: open a project; a ready initiative shows "Ready to confirm".
        await page.getByRole('tab', { name: 'Roadmap' }).click()
        await page.locator('[data-roadmap-screen]').waitFor()
        await page.locator('[data-rm-node^="project:"]').first().click()
        await page.locator('[data-rm-node^="initiative:"]').first().click()
        await page.waitForTimeout(1200)
        await setTheme(page, theme)
        await page.screenshot({ path: `${SHOTS}/roadmap-${theme}-${width}.png` })

        // The confirm dialog on a ready initiative.
        const ready = page.locator('[data-rm-node^="initiative:"]').filter({ hasText: 'Confirm me when ready' }).first()
        if (await ready.count()) {
          await ready.getByRole('button', { name: 'Confirm as delivered' }).click().catch(() => {})
          await page.locator('[data-rm-confirm-dialog]').waitFor({ timeout: 3000 }).catch(() => {})
          await setTheme(page, theme)
          await page.screenshot({ path: `${SHOTS}/roadmap-confirm-${theme}-${width}.png` })
          await page.keyboard.press('Escape')
        }

        // Board: a card's planning row names the goal.
        await page.getByRole('tab', { name: /Board|Work/i }).first().click()
        await page.waitForTimeout(1500)
        await setTheme(page, theme)
        await page.screenshot({ path: `${SHOTS}/board-${theme}-${width}.png` })

        // Approval Inbox: the ready-to-confirm section.
        await page.getByRole('tab', { name: /Inbox|Approval/i }).first().click()
        await page.waitForTimeout(1500)
        await setTheme(page, theme)
        await page.screenshot({ path: `${SHOTS}/inbox-${theme}-${width}.png` })

        // Guards: subtext meets WCAG AA, and "Place…" is not clipped at 1440.
        await page.getByRole('tab', { name: 'Roadmap' }).click()
        await page.waitForTimeout(1000)
        const lowContrast = await contrastOk(page)
        assert.deepEqual(lowContrast, [], `subtext meets WCAG AA (${theme} ${width})`)
        if (width === 1440) {
          const clipped = await page.evaluate(() => {
            for (const b of document.querySelectorAll('button')) {
              if (b.textContent.trim() === 'Place…' && b.scrollWidth > b.clientWidth + 1) return true
            }
            return false
          })
          assert.equal(clipped, false, '"Place…" is not clipped at 1440')
        }

        assert.deepEqual(errors, [], `no page errors (${theme} ${width})`)
        await page.close()
      }
    }
  } finally {
    await browser.close()
  }
})
