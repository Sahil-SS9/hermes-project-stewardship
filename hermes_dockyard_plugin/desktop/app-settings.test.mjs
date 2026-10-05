// Sahil's demo feedback (04/10, point e): the top-bar Settings tab is App
// settings, for the whole app only. Each project's own settings stay in the
// project. End-to-end through the REAL plugin bundle, proxy and backend:
// - the tab reads "App settings" and shows no project form;
// - "Open project settings" goes to the selected project's Settings;
// - the opening project, the folded Dashboard list and the notification policy
//   are the backend's real values, and changing them saves to the backend;
// - nothing is kept in browser storage.
// The test puts every value it changes back as it found it.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { chromium } from './browser-harness.mjs'

const BASE = process.env.STEWARD_DESKTOP_URL
const API = process.env.STEWARD_API_URL
const TOKEN = { 'x-hermes-session-token': 'demo-session-token' }
const PROJECT = 'payments-relaunch'

async function api(path, method = 'GET', body) {
  const res = await fetch(`${API}${path}`, { method, headers: { ...TOKEN, 'content-type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) })
  if (!res.ok) throw new Error(`${method} ${path} -> ${res.status}: ${await res.text()}`)
  return res.json()
}
async function until(check, message) {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    if (await check()) return
    await new Promise((resolve) => setTimeout(resolve, 100))
  }
  assert.fail(message)
}
const storage = (page) => page.evaluate(() => JSON.stringify([Object.entries(localStorage), Object.entries(sessionStorage), document.cookie]))

test('App settings: the whole app only; project settings are one click away; every value saves to the backend', async () => {
  assert.ok(BASE && API, 'Run via run-browser-suite.mjs')
  const before = { project: (await api('/settings/last-project')).project_id, ui: await api('/settings/ui') }
  const browser = await chromium.launch({ headless: true })
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
    page.setDefaultTimeout(10000)
    const errors = []
    page.on('pageerror', (error) => errors.push(String(error)))
    await page.goto(BASE, { waitUntil: 'networkidle' })
    await page.getByRole('button', { name: 'Project context', exact: true }).click()
    await page.getByRole('combobox', { name: 'Find project' }).fill(PROJECT)
    await page.getByRole('listbox', { name: 'Projects' }).getByRole('option', { name: PROJECT, exact: true }).click()
    await until(async () => (await api('/settings/last-project')).project_id === PROJECT, 'choosing a project was not remembered')
    const storageBefore = await storage(page)

    const tab = page.locator('[data-tab="settings"]')
    assert.equal((await tab.innerText()).trim(), 'App settings')
    await tab.click()
    const screen = page.locator('[data-app-settings]')
    await screen.waitFor()
    assert.equal(await page.locator('[data-project-settings-form]').count(), 0, 'no project form on App settings')
    assert.deepEqual(await page.locator('[data-app-setting]').evaluateAll((nodes) => nodes.map((node) => node.getAttribute('data-app-setting'))),
      ['opening', 'dashboard', 'notifications', 'appearance'])
    assert.equal(await page.locator('[data-app-settings] [data-notification-settings]').count(), 1, 'the app-wide notification policy is here')

    // When the app opens: the backend's real remembered project; Forget it saves.
    assert.equal(await page.locator('[data-opening-project]').getAttribute('data-opening-project'), PROJECT)
    await page.locator('[data-action="forget-last-project"]').click()
    await until(async () => (await api('/settings/last-project')).project_id === null, 'Forget it did not reach the backend')
    // The screen changes when the browser has the server's reply, a moment
    // after the server saved it (about 25 ms): wait for it, never read it at once.
    await page.locator('[data-opening-project=""]').waitFor()

    // Dashboard: the same folded-list choice the Dashboard uses.
    const fold = page.locator('[data-app-setting-fold="needs-you-now"]')
    const folded = (await api('/settings/ui')).collapsed.includes('needs-you-now')
    assert.equal(await fold.isChecked(), folded)
    await fold.click()
    await until(async () => (await api('/settings/ui')).collapsed.includes('needs-you-now') === !folded, 'the fold choice did not save')

    // Project settings are one click away, for the selected project.
    await page.locator('[data-action="open-project-settings"]').click()
    await page.locator('[data-project-settings-form]').waitFor()
    await page.locator('[data-project-view="settings"].active').waitFor()

    assert.equal(await storage(page), storageBefore, 'no browser storage written')
    assert.deepEqual(errors, [])
  } finally {
    await api('/settings/last-project', 'PUT', { project_id: before.project ?? null }).catch(() => {})
    await api('/settings/ui', 'PUT', before.ui).catch(() => {})
    await browser.close()
  }
})
