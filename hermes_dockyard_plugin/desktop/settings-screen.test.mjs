// C8 — Settings option A (signed 16/09) rendered check: the existing Project
// configuration panel keeps every field, and three uppercase category labels
// (General / Autonomy & verification / Release & notifications) group the grid.
// Runs against the disposable real backend the suite provides (STEWARD_DESKTOP_URL).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const require = createRequire(path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'dashboard', 'package.json'))
const { chromium } = require('playwright')
const BASE = process.env.STEWARD_DESKTOP_URL || 'http://127.0.0.1:19500/desktop'

test('C8 Settings: three uppercase category labels over the unchanged configuration fields', { timeout: 180000 }, async () => {
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: { width: 1280, height: 820 } })
  const errors = []
  page.on('pageerror', (error) => errors.push(String(error)))
  const project = 'payments-relaunch'
  try {
    await page.goto(BASE, { waitUntil: 'networkidle' })
    await page.getByRole('button', { name: 'Project context', exact: true }).click()
    await page.getByRole('combobox', { name: 'Find project' }).fill(project)
    await page.getByRole('listbox', { name: 'Projects' }).getByRole('option', { name: project, exact: true }).click()
    await page.waitForTimeout(1200)
    await page.locator('[data-tab="settings"]').click()
    await page.locator('[data-project-settings-form]').waitFor({ timeout: 8000 })

    // The three signed category labels render (CSS uppercases them).
    const labels = await page.locator('[data-project-settings-form] .dockyard-settings-category-label').allInnerTexts()
    assert.deepEqual(labels, ['GENERAL', 'AUTONOMY & VERIFICATION', 'RELEASE & NOTIFICATIONS'])

    // The fields themselves are unchanged — every data-setting-field hook survives.
    for (const hook of ['mission', 'lead-profile', 'members', 'autonomy', 'require-tests', 'soak-hours', 'digest']) {
      assert.ok(await page.locator(`[data-project-settings-form] [data-setting-field="${hook}"]`).count() >= 1, `field ${hook} still present`)
    }

    // The panel is one form (the categories are groupings inside it, not separate forms).
    assert.equal(await page.locator('[data-project-settings-form]').count(), 1, 'single settings form')

    assert.deepEqual(errors, [], 'no page errors')
  } finally {
    await browser.close()
  }
})
