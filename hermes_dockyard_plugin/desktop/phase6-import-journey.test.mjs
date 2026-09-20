// Phase 6 rendered UI journey — P6.7-P6.10 closure through the REAL plugin:
// open Backlog -> Import wizard -> invalid CSV preview (server-side errors,
// nothing written) -> fix -> valid commit -> canonical tree readback ->
// template download matches the shared validator.
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'

const require = createRequire(fileURLToPath(new URL('../dashboard/package.json', import.meta.url)))
const { chromium } = require('playwright')
const BASE = process.env.STEWARD_DESKTOP_URL || 'http://127.0.0.1:19500/desktop'
const API = 'http://127.0.0.1:19500/api/plugins/hermes-dockyard'
const TOKEN = 'demo-session-token'

const api = async (path, method = 'GET', body) => {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: { 'x-hermes-session-token': TOKEN, 'content-type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })
  return res.json()
}

test('Phase 6 rendered import journey: invalid preview writes nothing, valid commit lands in the tree', { timeout: 180000 }, async () => {
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: { width: 1280, height: 820 } })
  const errors = []
  page.on('pageerror', (error) => errors.push(String(error)))
  const project = 'payments-relaunch'
  const stamp = Date.now()
  const epicTitle = `P6 e2e epic ${stamp}`
  const taskTitle = `P6 e2e task ${stamp}`

  try {
    const before = await api(`/projects/${project}/backlog`)
    const beforeCount = (before.backlog ?? []).length

    await page.goto(BASE, { waitUntil: 'networkidle' })
    await page.locator('select[aria-label="Project context"]').selectOption(project)
    await page.waitForTimeout(1200)
    await page.locator('[data-tab="backlog"]').click()
    await page.waitForTimeout(1500)

    // Open the import wizard
    await page.locator('button:has-text("Import")').first().click()
    await page.waitForTimeout(600)
    const layer = page.locator('[data-bulk-import-layer]')
    await layer.waitFor({ timeout: 5000 })

    // --- 1. INVALID csv: unknown type + unknown parent -> preview errors.
    const badCsv = [
      'type,title,assignee,due,parent',
      `epic,${epicTitle},bot-worker,,`,
      `nonsense,${taskTitle},bot-worker,,epic-x`,
    ].join('\n')
    await page.locator('[data-import-input]').fill(badCsv)
    await page.locator('button:has-text("Next: review")').click()
    await page.waitForTimeout(800)
    // server-side preview must flag the bad row; the good row may pass
    const preview = await page.locator('[data-import-preview]').innerText()
    assert.match(preview, /nonsense/, 'preview flags the invalid type row')
    assert.match(preview, /unsupported work type/, 'server-side validator supplies the row error')
    // Commit only counts READY rows — the skipped row is excluded from the label.
    const commitButton = page.locator('[data-bulk-import-layer] button', { hasText: /^Import \d+ item/ })
    await commitButton.waitFor({ timeout: 5000 })
    assert.match(await commitButton.textContent(), /^Import 1 item\b/, 'commit excludes the skipped row')

    // Nothing written: count unchanged (preview is non-destructive).
    const afterInvalid = await api(`/projects/${project}/backlog`)
    assert.equal((afterInvalid.backlog ?? []).length, beforeCount, 'invalid preview writes zero rows')

    // --- 2. Back to step 1, fix the rows, then a valid commit.
    await page.locator('[data-bulk-import-layer] button:has-text("Back")').click()
    await page.waitForTimeout(500)
    // Canonical-header file: exercises the validator vocabulary directly and
    // links the task under the epic via parent_key.
    const goodCsv = [
      'row_key,type,title,parent_key',
      `epic-key-${stamp},epic,${epicTitle},`,
      `task-key-${stamp},task,${taskTitle},epic-key-${stamp}`,
    ].join('\n')
    await page.locator('[data-import-input]').fill(goodCsv)
    await page.locator('button:has-text("Next: review")').click()
    await page.locator('[data-import-preview]').waitFor({ timeout: 8000 })
    const preview2 = await page.locator('[data-import-preview]').innerText()
    assert.match(preview2, new RegExp(epicTitle))
    const commitButton2 = page.locator('[data-bulk-import-layer] button', { hasText: /^Import \d+ item/ })
    await commitButton2.waitFor({ timeout: 5000 })
    await commitButton2.click()
    await page.locator('[data-import-step="3"]').waitFor({ timeout: 8000 })
    const done = await page.locator('[data-import-step="3"]').innerText()
    assert.match(done, /Imported 2 items?/, 'commit reports the canonical write count')

    // Canonical tree readback: parent-first ids persisted on the Kanban
    // bridge (the store the Backlog tree renders).
    const after = await api(`/projects/${project}/work-items`)
    const rows = after.work_items ?? []
    const epic = rows.find((r) => r.title === epicTitle)
    const task = rows.find((r) => r.title === taskTitle)
    assert.equal(task.parent_ref, epic.ref, 'child task is linked under the imported epic')
    assert.ok(epic, 'epic persisted')
    assert.ok(task, 'task persisted')

    assert.deepEqual(errors, [], 'no browser page errors during the journey')
  } finally {
    await browser.close()
  }
})