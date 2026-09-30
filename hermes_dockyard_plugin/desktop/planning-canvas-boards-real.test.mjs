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
// Poll the real server until a condition holds (no fixed sleeps, no text matching).
async function until(read, ok, label, ms = 10000) {
  const end = Date.now() + ms
  let last
  while (Date.now() < end) { last = await read(); if (ok(last)) return last; await new Promise((r) => setTimeout(r, 50)) }
  assert.fail(`${label}: last value ${JSON.stringify(last)?.slice(0, 300)}`)
}
// Click Save and wait for the real PUT to answer and the board to be clean.
async function saveBoard(page, canvas) {
  const put = page.waitForResponse((r) => r.request().method() === 'PUT' && /\/canvases\//.test(r.url()))
  await canvas.locator('[data-action="pc-save"]').click()
  assert.ok((await put).ok(), 'the save PUT succeeded')
  await page.waitForSelector('[data-planning-canvas][data-canvas-dirty="false"]')
}

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
    await saveBoard(page, canvas)
    const saved = await board(first)
    assert.equal(saved.objects.length, 2, 'save reached the real board')
    assert.equal(saved.objects.filter((o) => o.colour === 'pink').length, 1, 'sticker colour persisted')

    // Theme: saved on the board by the real PATCH route.
    await canvas.locator('[data-action="pc-theme-dark"]').click()
    await page.waitForFunction(() => document.querySelector('[data-planning-canvas]').getAttribute('data-canvas-theme') === 'dark')
    await until(() => board(first), (b) => b.theme === 'dark', 'theme persisted on the real board')

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
    const refused = page.waitForResponse((r) => r.request().method() === 'POST' && /\/canvases$/.test(new URL(r.url()).pathname))
    await canvas.locator('[data-action="pc-board-form-save"]').click()
    assert.equal((await refused).status(), 409, 'the real server refuses the duplicate')
    assert.equal(await canvas.getAttribute('data-canvas-board'), second, 'a refused create does not switch')
    assert.equal((await boards()).length, 2, 'the duplicate was not created')
    await canvas.locator('[data-action="pc-board-form-cancel"]').click()

    // Chat on Beta names Beta; the stand-in AI answers from Beta's (empty) canvas.
    await canvas.locator('[data-canvas-draft]').fill('Beta only sticker')
    await canvas.locator('[data-action="add-canvas-object"]').click()
    await page.keyboard.press('Escape')
    await saveBoard(page, canvas)
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
    await until(() => board(second), (b) => b.status === 'submitted', 'restore returns the real board to its previous status')
    assert.equal((await boards()).length, 2)

    // Rich text through the REAL save route (Quan H-B): every allowed
    // format, saved, read back, saved again unchanged.
    const alpha = canvas.locator('[data-canvas-object]').first()
    const alphaId = await alpha.getAttribute('data-canvas-object')
    await alpha.click()
    const drawer = canvas.locator('.dy-pc-drawer.open')
    await drawer.waitFor()
    await drawer.locator('[data-canvas-rich-text]').click()
    await page.keyboard.press('Control+a')
    await page.keyboard.press('Delete')
    await page.evaluate(() => {
      const el = document.querySelector('[data-canvas-rich-text]')
      const dt = new DataTransfer()
      dt.setData('text/html', [
        '<h1>One</h1><h2 style="text-align:center">Two</h2><h3 style="text-align:right">Three</h3>',
        '<p style="text-align:justify"><strong>b</strong><em>i</em><u>u</u><s>s</s>',
        '<span data-size="small">sm</span><span data-size="large">lg</span><span data-size="huge">hg</span>line<br>break</p>',
        '<ul><li>bullet<ol start="3" type="a"><li>nested</li></ol></li></ul><ol start="5"><li>five</li></ol>',
      ].join(''))
      el.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }))
    })
    await drawer.locator('[data-action="apply-canvas-object"]').click()
    await drawer.locator('[data-action="pc-close-drawer"]').click()
    await saveBoard(page, canvas)
    const stored = (await board(first)).objects.find((o) => o.id === alphaId)
    const doc = stored.content.description_doc
    const flat = JSON.stringify(doc)
    for (const piece of ['"level":1', '"level":2', '"level":3', '"textAlign":"center"', '"textAlign":"right"', '"textAlign":"justify"',
      '"type":"bold"', '"type":"italic"', '"type":"underline"', '"type":"strike"', '"size":"small"', '"size":"large"', '"size":"huge"',
      '"type":"hardBreak"', '"type":"bulletList"', '"start":3', '"type":"a"', '"start":5']) {
      assert.ok(flat.includes(piece), `real server kept ${piece}`)
    }
    assert.equal(stored.content.description, 'One\nTwo\nThree\nbiussmlghgline\nbreak\n- bullet\n  3. nested\n5. five', 'plain copy derived by the server')
    // Save the stored form again through the real PUT: nothing changes.
    const fresh = await board(first)
    const put = await fetch(`${API}/projects/${PROJECT}/canvases/${encodeURIComponent(first)}`, {
      method: 'PUT', headers: { ...TOKEN, 'content-type': 'application/json' },
      body: JSON.stringify({ expected_revision: fresh.revision, objects: fresh.objects, connectors: fresh.connectors }),
    })
    assert.ok(put.ok, `re-save PUT -> ${put.status} ${await put.text()}`)
    const again = (await board(first)).objects.find((o) => o.id === alphaId).content
    assert.deepEqual(again.description_doc, doc, 'doc identical after a second real save')
    assert.equal(again.description, stored.content.description)
    // Reload the page: the editor shows the saved formatting.
    await page.reload({ waitUntil: 'load' })
    await page.waitForSelector('[data-tab="dashboard"]', { timeout: 20000 })
    if (!(await canvas.count())) {
      await page.locator('[data-tab="project"]').click()
      await page.locator('[data-project-view="planning"]').click()
    }
    await canvas.waitFor()
    await canvas.locator(`[data-canvas-object="${alphaId}"]`).click()
    await drawer.waitFor()
    const body = drawer.locator('[data-canvas-rich-text]')
    assert.equal(await body.locator('h1, h2, h3').count(), 3)
    assert.equal(await body.locator('ol[start="3"][type="a"] li').innerText(), 'nested')
    await drawer.locator('[data-action="pc-close-drawer"]').click()

    // A completed board is read-only on the real backend: no formatting
    // bar, body not editable, typing changes nothing.
    for (const status of ['submitted', 'planned', 'completed']) {
      await canvas.locator('[data-canvas-board-status]').selectOption(status)
      await canvas.locator('[data-action="pc-status-confirm"]').click()
      await page.waitForSelector(`[data-canvas-status="${status}"]`)
    }
    assert.equal((await board(first)).status, 'completed')
    await canvas.locator(`[data-canvas-object="${alphaId}"]`).click()
    await drawer.waitFor()
    assert.equal(await drawer.locator('.dy-rt-bar').count(), 0, 'no formatting bar on a completed board')
    assert.equal(await drawer.locator('[data-canvas-rich-text]').getAttribute('contenteditable'), 'false')
    await drawer.locator('[data-canvas-rich-text]').click()
    await page.keyboard.type('should not appear')
    assert.doesNotMatch(await drawer.locator('[data-canvas-rich-text]').innerText(), /should not appear/)
    assert.equal(await page.locator('[data-planning-canvas][data-canvas-dirty="true"]').count(), 0)
    await drawer.locator('[data-action="pc-close-drawer"]').click()

    // An archived board is read-only too (Quan L3): archive the completed
    // board through the real route; the server then refuses edits.
    const archived = await fetch(`${API}/projects/${PROJECT}/canvases/${encodeURIComponent(first)}`, { method: 'PATCH', headers: { ...TOKEN, 'content-type': 'application/json' }, body: JSON.stringify({ status: 'archived' }) })
    assert.ok(archived.ok, `archive -> ${archived.status} ${await archived.text()}`)
    assert.equal((await board(first)).status, 'archived')
    const stale = await fetch(`${API}/projects/${PROJECT}/canvases/${encodeURIComponent(first)}`, {
      method: 'PUT', headers: { ...TOKEN, 'content-type': 'application/json' },
      body: JSON.stringify({ expected_revision: (await board(first)).revision, objects: fresh.objects, connectors: fresh.connectors }),
    })
    assert.equal(stale.status, 409, 'the real server refuses edits to an archived board')

    assert.deepEqual(errors, [], errors.join('\n'))
  } finally {
    await browser?.close()
  }
})
