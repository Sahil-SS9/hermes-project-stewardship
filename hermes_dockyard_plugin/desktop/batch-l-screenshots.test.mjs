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

const proxyCall = async (path, init = {}) => {
  const r = await fetch(process.env.STEWARD_API_URL + path, {
    method: init.method || 'GET',
    headers: { 'x-hermes-session-token': 'demo-session-token', 'content-type': 'application/json' },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  })
  const text = await r.text()
  if (!r.ok) throw new Error(`${init.method || 'GET'} ${path} -> ${r.status} ${text.slice(0, 140)}`)
  return text ? JSON.parse(text) : {}
}

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
          // At 1440 also capture the 409 refusal in plain words: the ladder
          // becomes not-reached behind the open dialog, then Confirm is pressed.
          if (width === 1440) {
            try {
              const rm = await proxyCall('/roadmap?project_id=payments-relaunch')
              const proj = rm.projects[0]
              const ini = proj.initiatives.find((i) => i.title === 'Confirm me when ready')
              const ms = proj.milestones.find((m) => m.initiative_ref === ini.ref)
              const obj = proj.objectives.find((o) => o.milestone_id === ms.id)
              await proxyCall(`/projects/payments-relaunch/objectives/${obj.id}/assessment`, { method: 'POST', body: { passed: false, evidence: ['shot:stale'] } })
              await page.locator('[data-rm-confirm-dialog]').getByRole('button', { name: 'Confirm as delivered' }).click()
              await page.waitForFunction(() => /not ready to confirm|every milestone must be reached/i.test(document.querySelector('[data-rm-confirm-dialog]')?.textContent ?? ''), null, { timeout: 8000 })
              await setTheme(page, theme)
              await page.screenshot({ path: `${SHOTS}/roadmap-refusal-${theme}-${width}.png` })
              await proxyCall(`/projects/payments-relaunch/objectives/${obj.id}/assessment`, { method: 'POST', body: { passed: true, evidence: ['shot:restore'] } })
            } catch { /* the refusal shot is best-effort; the run continues */ }
          }
          await page.keyboard.press('Escape')
        }

        // Board: a card's planning row names the goal.
        await page.getByRole('tab', { name: /Board|Work/i }).first().click()
        await page.waitForTimeout(1500)
        await setTheme(page, theme)
        await page.screenshot({ path: `${SHOTS}/board-${theme}-${width}.png` })

        // Work-item detail with the Goal picker (R2 fix 3/7).
        const firstCard = page.locator('[data-work-card]').first()
        if (await firstCard.count()) {
          await firstCard.locator('[data-card-toggle]').click()
          await firstCard.getByRole('button', { name: 'Open full details' }).click().catch(() => {})
          await page.locator('[data-work-item-detail]').waitFor({ timeout: 5000 }).catch(() => {})
          await setTheme(page, theme)
          await page.screenshot({ path: `${SHOTS}/work-item-${theme}-${width}.png` })
          await page.keyboard.press('Escape')
          await page.waitForTimeout(400)
        }

        // Approval Inbox: the ready-to-confirm section.
        await page.getByRole('tab', { name: /Inbox|Approval/i }).first().click()
        await page.waitForTimeout(1500)
        await setTheme(page, theme)
        await page.screenshot({ path: `${SHOTS}/inbox-${theme}-${width}.png` })

        // Notifications: both new ladder kinds with their plain words.
        await page.getByRole('tab', { name: /Notif/i }).first().click().catch(() => {})
        await page.waitForTimeout(1500)
        await setTheme(page, theme)
        await page.screenshot({ path: `${SHOTS}/notifications-${theme}-${width}.png` })

        // Vision: the goal drawer with the check editor and its pickers.
        await page.getByRole('tab', { name: /Board|Work/i }).first().click()
        await page.waitForTimeout(800)
        const vCard = page.locator('[data-work-card]').filter({ hasText: 'Build setup screens' }).first()
        if (await vCard.count()) {
          await vCard.locator('[data-card-toggle]').click()
          await vCard.getByRole('button', { name: /^Milestone:/ }).first().click().catch(() => {})
          await page.locator('[data-plan-screen]').waitFor({ timeout: 6000 }).catch(() => {})
          const goalRow = page.locator('[data-plan-row="goal"]').first()
          if (await goalRow.count()) {
            await goalRow.locator('.dy-plan-row-open').click()
            await page.locator('[data-plan-drawer="goal"]').waitFor({ timeout: 5000 }).catch(() => {})
          }
          await setTheme(page, theme)
          await page.screenshot({ path: `${SHOTS}/vision-goal-${theme}-${width}.png` })
        }

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
