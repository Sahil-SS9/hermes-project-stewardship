// Sahil's demo feedback (04/10, point a): "Needs you now" on the Dashboard folds
// open and closed, and stays the way he left it. End-to-end through the REAL
// plugin bundle, proxy and backend (disposable data):
// - the whole title is one button, with aria-expanded and the item count;
// - folding hides the list and is saved in the backend (/settings/ui);
// - a reload keeps it folded; opening it again is saved too;
// - nothing is kept in browser storage (26/08 locked rule).
// The test puts the backend's choice back as it found it.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { chromium } from './browser-harness.mjs'

const BASE = process.env.STEWARD_DESKTOP_URL
const API = process.env.STEWARD_API_URL
const TOKEN = { 'x-hermes-session-token': 'demo-session-token' }

async function api(path, method = 'GET', body) {
  const res = await fetch(`${API}${path}`, { method, headers: { ...TOKEN, 'content-type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) })
  if (!res.ok) throw new Error(`${method} ${path} -> ${res.status}: ${await res.text()}`)
  return res.json()
}
async function waitForSaved(expected) {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    if (JSON.stringify(await api('/settings/ui')) === JSON.stringify(expected)) return
    await new Promise((resolve) => setTimeout(resolve, 100))
  }
  assert.fail(`backend has ${JSON.stringify(await api('/settings/ui'))}, expected ${JSON.stringify(expected)}`)
}
const storage = (page) => page.evaluate(() => JSON.stringify([Object.entries(localStorage), Object.entries(sessionStorage), document.cookie]))

test('Needs you now folds, stays folded after a reload, and opens again; the choice lives in the backend', async () => {
  assert.ok(BASE && API, 'Run via run-browser-suite.mjs')
  const before = await api('/settings/ui')
  const browser = await chromium.launch({ headless: true })
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
    page.setDefaultTimeout(10000)
    const errors = []
    page.on('pageerror', (error) => errors.push(String(error)))
    await api('/settings/ui', 'PUT', { collapsed: [] })
    await page.goto(BASE, { waitUntil: 'networkidle' })
    const fold = page.locator('[data-section-fold="needs-you-now"]')
    const list = page.locator('#dy-needs-you-now')
    await fold.waitFor()
    const storageBefore = await storage(page)
    assert.equal(await fold.getAttribute('aria-expanded'), 'true')
    assert.ok(await list.isVisible(), 'open by default')
    const rows = await page.locator('#dy-needs-you-now .dockyard-command-attention-row').count()
    assert.equal(await page.locator('[data-section-count="needs-you-now"]').innerText(), String(rows), 'the count matches the list')
    assert.match(await fold.evaluate((button) => button.textContent), /Needs you now/)

    await fold.click()
    assert.equal(await fold.getAttribute('aria-expanded'), 'false')
    assert.equal(await list.isVisible(), false, 'folding hides the list')
    assert.ok(await page.locator('[data-section-count="needs-you-now"]').isVisible(), 'the count still shows when folded')
    await waitForSaved({ collapsed: ['needs-you-now'] })

    await page.reload({ waitUntil: 'networkidle' })
    await fold.waitFor()
    assert.equal(await fold.getAttribute('aria-expanded'), 'false', 'still folded after a reload')
    assert.equal(await list.isVisible(), false)

    await fold.click()
    assert.equal(await fold.getAttribute('aria-expanded'), 'true')
    assert.ok(await list.isVisible())
    await waitForSaved({ collapsed: [] })
    assert.equal(await storage(page), storageBefore, 'no browser storage written')
    assert.deepEqual(errors, [])
  } finally {
    await api('/settings/ui', 'PUT', before).catch(() => {})
    await browser.close()
  }
})
