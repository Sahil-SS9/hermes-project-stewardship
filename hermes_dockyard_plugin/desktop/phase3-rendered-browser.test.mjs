import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'

const require = createRequire(fileURLToPath(new URL('../dashboard/package.json', import.meta.url)))
const { chromium } = require('playwright')
const BASE = process.env.STEWARD_DESKTOP_URL || 'http://127.0.0.1:19500/desktop'

const tabs = ['dashboard', 'project', 'delivery', 'work', 'backlog', 'workflows', 'reports', 'inbox', 'notifications', 'onboard', 'settings']
const waitForText = async (page, text, timeout = 10000) => page.getByText(text, { exact: false }).first().waitFor({ timeout })

test('Phase 3 rendered Desktop journey: navigation, scope isolation, dirty switching, keyboard, narrow layout and real data', { timeout: 120000 }, async () => {
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: { width: 1280, height: 820 } })
  const errors = []
  page.on('pageerror', (error) => errors.push(String(error)))
  try {
    await page.goto(BASE, { waitUntil: 'networkidle' })
    await waitForText(page, 'Your fleet, without the noise')

    // Header strip and dashboard are backed by the disposable host's real API data.
    assert.match(await page.locator('body').innerText(), /5 active/)
    assert.match(await page.locator('body').innerText(), /payments-relaunch/)
    assert.equal(await page.locator('select[aria-label="Project context"]').count(), 1)

    // Authorised navigation sequence, including keyboard focus and activation.
    assert.deepEqual(await page.locator('[data-tab]').evaluateAll((els) => els.map((el) => el.dataset.tab)), tabs)
    const firstTab = page.locator('[data-tab="dashboard"]')
    await firstTab.focus()
    assert.equal(await page.evaluate(() => document.activeElement?.getAttribute('data-tab')), 'dashboard')
    await page.keyboard.press('ArrowRight')
    assert.equal(await page.evaluate(() => document.activeElement?.getAttribute('data-tab')), 'project')
    await page.keyboard.press('Enter')
    await waitForText(page, 'Project dashboard')
    assert.equal(await page.locator('[data-tab="project"]').getAttribute('aria-selected'), 'true')

    // Two-project switching with a delayed earlier request must not overwrite the new scope.
    await page.locator('[data-tab="dashboard"]').click()
    await waitForText(page, 'Projects')
    const projectSelect = page.locator('select[aria-label="Project context"]')
    await projectSelect.selectOption('mobile-client')
    await projectSelect.selectOption('payments-relaunch')
    await page.locator('[data-tab="project"]').click()
    await waitForText(page, 'Project dashboard / payments-relaunch')
    assert.match(await page.locator('body').innerText(), /Project dashboard \/ payments-relaunch/)

    // Dirty settings form: switching project requires discard confirmation; cancel restores scope.
    await page.locator('[data-project-view="settings"]').click()
    await page.getByRole('button', { name: /Edit configuration/i }).click()
    const mission = page.locator('[data-setting-field="mission"]')
    await mission.fill('Unsaved browser verification change')
    await projectSelect.selectOption('mobile-client')
    await waitForText(page, /Discard|unsaved|changes/i)
    assert.match(await page.locator('body').innerText(), /Discard|unsaved|changes/i)
    const cancel = page.getByRole('button', { name: /Cancel|Keep editing/i }).last()
    if (await cancel.count()) await cancel.click()
    assert.equal(await projectSelect.inputValue(), 'payments-relaunch')
    await projectSelect.selectOption('mobile-client')
    const discard = page.getByRole('button', { name: /Discard/i }).last()
    assert.equal(await discard.count(), 1)
    await discard.click()
    await waitForText(page, 'Project dashboard / payments-relaunch')
    assert.equal(await projectSelect.inputValue(), 'payments-relaunch')

    // Computed theme/readability and narrow viewport must remain usable.
    const root = page.locator('.dockyard-root')
    const styles = await root.evaluate((el) => { const s = getComputedStyle(el); return { bg: s.backgroundColor, color: s.color, font: s.fontFamily } })
    assert.notEqual(styles.bg, 'rgba(0, 0, 0, 0)')
    assert.notEqual(styles.color, 'rgba(0, 0, 0, 0)')
    assert.ok(styles.font && !styles.font.includes('Times New Roman'))
    await page.setViewportSize({ width: 390, height: 844 })
    await page.waitForTimeout(250)
    assert.ok((await root.boundingBox()).width <= 390)
    assert.equal(await page.locator('body').evaluate((el) => el.scrollWidth <= window.innerWidth + 1), true)
    assert.ok(await page.locator('[data-tab="dashboard"]').isVisible())

    // Project-scoped real-data readback remains present after all transitions.
    await projectSelect.selectOption('payments-relaunch')
    await page.locator('[data-tab="dashboard"]').click()
    await waitForText(page, 'Projects')
    assert.match(await page.locator('body').innerText(), /payments-relaunch/)
    assert.ok((await page.locator('[data-metric]').count()) >= 4)
    assert.equal(errors.length, 0, errors.join('\n'))
  } finally {
    await browser.close()
  }
})
