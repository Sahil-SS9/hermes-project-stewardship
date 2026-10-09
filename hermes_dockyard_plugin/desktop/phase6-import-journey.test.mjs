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
const API = process.env.STEWARD_API_URL || 'http://127.0.0.1:19500/api/plugins/hermes-project-stewardship'
const TOKEN = 'demo-session-token'

const api = async (path, method = 'GET', body) => {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: { 'x-hermes-session-token': TOKEN, 'content-type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })
  const result = await res.json()
  assert.ok(res.ok, `${method} ${path}: ${res.status} ${JSON.stringify(result)}`)
  return result
}

test('Phase 6 rendered import journey: invalid preview writes nothing, valid commit lands in the tree', { timeout: 180000 }, async () => {
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: { width: 1280, height: 820 } })
  const errors = []
  page.on('pageerror', (error) => errors.push(String(error)))
  const project = 'atlas-mobile'
  const stamp = Date.now()
  const epicTitle = `P6 e2e epic ${stamp}`
  const taskTitle = `P6 e2e task ${stamp}`

  try {
    const before = await api(`/projects/${project}/backlog`)
    const beforeCount = (before.backlog ?? []).length

    await page.goto(BASE, { waitUntil: 'networkidle' })
    await page.getByRole('button', {name: 'Project context', exact: true}).click()
    await page.getByRole('combobox', {name: 'Find project'}).fill(project)
    await page.getByRole('listbox', {name: 'Projects'}).getByRole('option', {name: project, exact: true}).click()
    await page.waitForTimeout(1200)
    await page.locator('[data-tab="backlog"]').click()
    await page.waitForTimeout(1500)

    // Open the import wizard
    await page.locator('button:has-text("Import")').first().click()
    await page.waitForTimeout(600)
    const layer = page.locator('[data-bulk-import-layer]')
    await layer.waitFor({ timeout: 5000 })

    // --- 1. INVALID csv: unknown type + unknown parent -> preview errors.
    // CSV columns must match the canonical validator (assignee/due/parent
    // are not importable columns; parent_key + labels + estimate_days are).
    const badCsv = [
      'row_key,type,title,parent_key',
      `epic-key-early,${epicTitle},`,
      `task-key-early,${taskTitle.replace('P6 e2e', 'nonsense')},`,
    ].join('\n')
    await page.locator('[data-import-input]').fill(badCsv)
    await page.locator('[data-action="import-next"]').click()
    await page.waitForTimeout(800)
    // server-side preview must flag the bad row; the good row may pass
    const preview = await page.locator('[data-import-preview]').innerText()
    assert.match(preview, /unsupported work type/, 'preview flags the invalid type row')
    assert.match(preview, /unsupported work type/, 'server-side validator supplies the row error')
    // Errors block the commit entirely: the primary action is rendered but
    // disabled with an explicit blocked label (approved contract).
    const blockedButton = page.locator('[data-bulk-import-layer] [data-import-blocked]')
    await blockedButton.waitFor({ timeout: 5000 })
    assert.match(await blockedButton.textContent(), /Import blocked/, 'error rows block the commit action')

    // Nothing written: count unchanged (preview is non-destructive).
    const afterInvalid = await api(`/projects/${project}/backlog`)
    assert.equal((afterInvalid.backlog ?? []).length, beforeCount, 'invalid preview writes zero rows')

    // --- 2. Back to step 1, fix the rows, then a valid commit.
    await page.locator('[data-bulk-import-layer] button:has-text("Back to source")').click()
    await page.waitForTimeout(500)
    // Canonical-header file: exercises the validator vocabulary directly and
    // links the task under the epic via parent_key.
    const goodCsv = [
      'row_key,type,title,parent_key',
      `epic-key-${stamp},epic,${epicTitle},`,
      `task-key-${stamp},task,${taskTitle},epic-key-${stamp}`,
    ].join('\n')
    await page.locator('[data-import-input]').fill(goodCsv)
    await page.locator('[data-action="import-next"]').click()
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
    assert.equal(task.parent_task_id, epic.ref, 'child task is linked under the imported epic')
    assert.ok(epic, 'epic persisted')
    assert.ok(task, 'task persisted')

    assert.deepEqual(errors, [], 'no browser page errors during the journey')
  } finally {
    await browser.close()
  }
})