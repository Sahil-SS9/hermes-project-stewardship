// Planning canvas — multi-board journey through the REAL disposable backend.
//
// planning-canvas-boards.test.mjs proves layout, geometry and race handling
// against a scripted host. This file proves the same UI against the real
// proxy + FastAPI + SQLite service (run-browser-suite.mjs starts it), so any
// drift between the scripted host and the real routes fails here. Every UI
// action is confirmed by reading the server state back over the real API.
// Project: atlas-mobile (no other browser journey touches its canvas).
import assert from 'node:assert/strict'
import { test } from 'node:test'

const { chromium } = await import('./browser-harness.mjs')
const BASE = process.env.STEWARD_DESKTOP_URL
const API = process.env.STEWARD_API_URL
const PROJECT = 'atlas-mobile'
const TOKEN = { 'x-hermes-session-token': 'demo-session-token' }

async function apiGet(path) {
  const res = await fetch(`${API}${path}`, { headers: TOKEN })
  assert.ok(res.ok, `GET ${path} -> ${res.status}`)
  return res.json()
}
const boards = async (archived = false) => (await apiGet(`/projects/${PROJECT}/canvases${archived ? '?include_archived=true' : ''}`)).canvases
const board = (id) => apiGet(`/projects/${PROJECT}/canvases/${encodeURIComponent(id)}`)

test('Planning boards (real backend): theme, save, chat, plan steps and board list persist', { timeout: 240000 }, async () => {
  assert.ok(BASE && API, 'Run via run-browser-suite.mjs')
  let browser
  const errors = []
  try {
    browser = await chromium.launch({ headless: true, args: ['--disable-gpu'] })
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
    page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`))
    page.on('console', (msg) => { if (msg.type() === 'error' && !/Failed to load resource/.test(msg.text())) errors.push(`console: ${msg.text()}`) })
    await page.goto(BASE, { waitUntil: 'load' })
    await page.waitForSelector('[data-tab="dashboard"]', { timeout: 20000 })
    await page.getByRole('button', { name: 'Project context', exact: true }).click()
    await page.getByRole('combobox', { name: 'Find project' }).fill(PROJECT)
    await page.getByRole('listbox', { name: 'Projects' }).getByRole('option', { name: PROJECT, exact: true }).click()
    await page.locator('[data-tab="project"]').click()
    await page.waitForSelector('[data-project-view="planning"]', { timeout: 20000 })
    await page.locator('[data-project-view="planning"]').click()
    const canvas = page.locator(`[data-planning-canvas="${PROJECT}"]`)
    await canvas.waitFor()
    // Board mode is on once the real list route answered.
    await page.waitForSelector('[data-canvas-board-status]', { timeout: 20000 })
    const first = await canvas.getAttribute('data-canvas-board')
    assert.ok(first, 'the legacy route opened a real board with an id')
    assert.deepEqual((await boards()).map((b) => b.canvas_id), [first])

    // Save two stickers + a pink colour on the first board.
    await canvas.locator('[data-canvas-draft]').fill('Real sticker one')
    await canvas.locator('[data-action="add-canvas-object"]').click()
    await page.keyboard.press('Escape')
    await canvas.locator('[data-canvas-draft]').fill('Real sticker two')
    await canvas.locator('[data-action="add-canvas-object"]').click()
    await page.keyboard.press('Escape')
    await canvas.locator('[data-canvas-object]').last().click()
    await canvas.locator('[data-canvas-object-colour]').selectOption('pink')
    await page.keyboard.press('Escape')
    await canvas.locator('[data-action="pc-save"]').click()
    await page.waitForFunction(() => /saved/i.test(document.querySelector('[data-planning-canvas]').innerText))
    const saved = await board(first)
    assert.equal(saved.objects.length, 2, 'save reached the real board')
    assert.equal(saved.objects.filter((o) => o.colour === 'pink').length, 1, 'sticker colour persisted')

    // Theme: saved on the board by the real PATCH route.
    await canvas.locator('[data-action="pc-theme-dark"]').click()
    await page.waitForFunction(() => document.querySelector('[data-planning-canvas]').getAttribute('data-canvas-theme') === 'dark')
    await page.waitForTimeout(300)
    assert.equal((await board(first)).theme, 'dark', 'theme persisted on the real board')

    // Rename.
    await canvas.locator('[data-action="pc-board-rename"]').click()
    await canvas.locator('[data-canvas-board-form="rename"]').fill('Real Alpha')
    await canvas.locator('[data-action="pc-board-form-save"]').click()
    await page.waitForSelector('[data-canvas-board-name]:has-text("Real Alpha")')
    assert.equal((await board(first)).name, 'Real Alpha')

    // Create a second board: opens empty, follows the app theme, list has two.
    await canvas.locator('[data-action="pc-board-new"]').click()
    await canvas.locator('[data-canvas-board-form="create"]').fill('Real Beta')
    await canvas.locator('[data-action="pc-board-form-save"]').click()
    await page.waitForFunction((id) => { const b = document.querySelector('[data-planning-canvas]').getAttribute('data-canvas-board'); return b && b !== id }, first)
    const second = await canvas.getAttribute('data-canvas-board')
    assert.equal(await canvas.locator('[data-canvas-object]').count(), 0, 'a new real board opens empty')
    assert.equal(await canvas.getAttribute('data-canvas-theme-source'), 'app', 'a new board follows the app theme')
    assert.equal((await boards()).length, 2)
    // A duplicate name is refused by the real server and the board does not switch.
    await canvas.locator('[data-action="pc-board-new"]').click()
    await canvas.locator('[data-canvas-board-form="create"]').fill('Real Alpha')
    await canvas.locator('[data-action="pc-board-form-save"]').click()
    await page.waitForTimeout(400)
    assert.equal(await canvas.getAttribute('data-canvas-board'), second, 'a refused create does not switch')
    assert.equal((await boards()).length, 2, 'the duplicate was not created')
    await canvas.locator('[data-action="pc-board-form-cancel"]').click()

    // Chat on Beta names Beta; the stand-in AI answers from Beta's (empty) canvas.
    await canvas.locator('[data-canvas-draft]').fill('Beta only sticker')
    await canvas.locator('[data-action="add-canvas-object"]').click()
    await page.keyboard.press('Escape')
    await canvas.locator('[data-action="pc-save"]').click()
    await page.waitForFunction(() => /saved/i.test(document.querySelector('[data-planning-canvas]').innerText))
    await canvas.locator('[data-action="pc-chat-toggle"]').click()
    await canvas.locator('[data-canvas-chat-input]').fill('Plan the beta work')
    await canvas.locator('[data-action="pc-chat-send"]').click()
    await page.waitForSelector('[data-canvas-proposals]', { timeout: 20000 })
    const proposals = await canvas.locator('[data-canvas-proposals]').innerText()
    assert.match(proposals, /Technical implementation plan/)

    // Plan from the approved proposal, then edit its steps on the real plan.
    await canvas.locator('[data-action="approve-canvas-proposal"]').first().click()
    await page.waitForSelector('[data-action="plan-from-proposal"]', { timeout: 20000 })
    await canvas.locator('[data-action="plan-from-proposal"]').first().click()
    await page.waitForSelector('[data-canvas-plan]', { timeout: 20000 })
    assert.match(await canvas.locator('[data-canvas-plan]').innerText(), /Beta only sticker/, 'the plan was built from Beta, not Alpha')
    assert.doesNotMatch(await canvas.locator('[data-canvas-plan]').innerText(), /Real sticker/, 'Alpha content never reaches Beta\'s plan')
    const plans = (await apiGet(`/projects/${PROJECT}/canvases/${encodeURIComponent(second)}/plans`)).plans
    assert.equal(plans.length, 1, 'the plan belongs to Beta')
    await canvas.locator('[data-action="pc-steps-edit"]').click()
    await page.waitForSelector('[data-canvas-expanded] [data-canvas-steps-editor]')
    await canvas.locator('[data-canvas-step-title]').first().fill('Ship the beta safely')
    await canvas.locator('[data-action="pc-step-add"]').click()
    await canvas.locator('[data-canvas-step-title]').last().fill('Tell beta users')
    await canvas.locator('[data-action="pc-steps-save"]').click()
    await page.waitForFunction(() => !document.querySelector('[data-canvas-steps-editor]'))
    const plan = await apiGet(`/projects/${PROJECT}/plans/${encodeURIComponent(plans[0].plan_id)}`)
    assert.deepEqual(plan.steps.map((s) => s.title), ['Ship the beta safely', 'Tell beta users'], 'step edits persisted on the real plan')
    await canvas.locator('[data-action="pc-expanded-close"]').click()

    // Status move + archive + restore on the real board.
    await canvas.locator('[data-canvas-board-status]').selectOption('submitted')
    await canvas.locator('[data-action="pc-status-confirm"]').click()
    await page.waitForSelector('[data-canvas-status="submitted"]')
    assert.equal((await board(second)).status, 'submitted')
    await canvas.locator(`[data-canvas-board-row="${second}"] [data-action="pc-board-archive"]`).click()
    await page.waitForFunction((id) => document.querySelector('[data-planning-canvas]').getAttribute('data-canvas-board') !== id, second)
    assert.equal(await canvas.getAttribute('data-canvas-board'), first, 'archiving moves to the remaining live board')
    assert.equal(await canvas.getAttribute('data-canvas-theme'), 'dark', 'Alpha keeps its own saved theme')
    assert.equal(await canvas.locator('[data-canvas-object]').count(), 2, 'Alpha content is intact')
    assert.deepEqual((await boards()).map((b) => b.canvas_id), [first])
    await canvas.locator('[data-action="pc-board-show-archived"]').click()
    await canvas.locator(`[data-canvas-board-row="${second}"] [data-action="pc-board-restore"]`).click()
    await page.waitForTimeout(400)
    assert.equal((await board(second)).status, 'submitted', 'restore returns the real board to its previous status')
    assert.equal((await boards()).length, 2)

    assert.deepEqual(errors, [], errors.join('\n'))
  } finally {
    await browser?.close()
  }
})
