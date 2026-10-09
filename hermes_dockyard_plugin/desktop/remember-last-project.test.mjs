// Remember the last project (Sahil 02/10), end-to-end through the REAL plugin
// bundle, proxy and backend (disposable data):
// - choosing a project in the picker saves it in the backend;
// - a reload reopens on that project;
// - nothing is kept in browser storage (26/08 locked rule);
// - the automatic first pick on load is not saved as a choice.
// The test restores the backend's remembered project to what it found
// (usually nothing), so later tests in the shared backend open as before.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const require = createRequire(fileURLToPath(new URL('../dashboard/package.json', import.meta.url)))
const { chromium } = require('playwright')
const BASE = process.env.STEWARD_DESKTOP_URL || 'http://127.0.0.1:19500/desktop'
const API = process.env.STEWARD_API_URL || 'http://127.0.0.1:19500/api/plugins/hermes-project-stewardship'
const TOKEN = 'demo-session-token'

async function api(path, method = 'GET', body) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: { 'content-type': 'application/json', 'x-hermes-session-token': TOKEN },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`${method} ${path} -> ${res.status}: ${await res.text()}`)
  return res.json()
}

const remembered = async () => (await api('/settings/last-project')).project_id

async function waitForRemembered(expected) {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    if ((await remembered()) === expected) return
    await new Promise((resolve) => setTimeout(resolve, 100))
  }
  assert.fail(`backend remembered ${await remembered()}, expected ${expected}`)
}

const picker = (page) => page.getByRole('button', { name: 'Project context', exact: true })

async function currentProject(page) {
  await page.locator('[data-tab="dashboard"]').waitFor()
  // The first pick lands once the dashboard and the remembered project load.
  await page.waitForFunction(() => {
    const button = [...document.querySelectorAll('button')].find((el) => el.getAttribute('aria-label') === 'Project context')
    return button && !/Choose project/.test(button.innerText)
  })
  return (await picker(page).innerText()).trim()
}

async function choose(page, id) {
  await picker(page).click()
  await page.getByRole('combobox', { name: 'Find project' }).fill(id)
  await page.getByRole('listbox', { name: 'Projects' }).getByRole('option', { name: id, exact: true }).click()
  await page.waitForFunction((want) => {
    const button = [...document.querySelectorAll('button')].find((el) => el.getAttribute('aria-label') === 'Project context')
    return button?.innerText.includes(want)
  }, id)
}

test('the app reopens on the last project chosen, kept in the backend not the browser', { timeout: 90000 }, async () => {
  const before = await remembered()
  const browser = await chromium.launch()
  try {
    const page = await (await browser.newContext()).newPage()
    const errors = []
    page.on('pageerror', (error) => errors.push(String(error)))
    await page.goto(BASE)
    const first = await currentProject(page)
    assert.equal(await remembered(), before, 'opening the app does not save the automatic first pick')

    const target = ['payments-relaunch', 'mobile-client', 'atlas-mobile'].find((id) => !first.includes(id))
    await choose(page, target)
    await waitForRemembered(target)

    await page.reload()
    assert.match(await currentProject(page), new RegExp(target), 'reload reopens on the chosen project')
    assert.equal(await remembered(), target, 'reopening does not write again')

    const storage = await page.evaluate(() => ({
      local: window.localStorage.length,
      session: window.sessionStorage.length,
      cookies: document.cookie,
    }))
    assert.deepEqual(storage, { local: 0, session: 0, cookies: '' }, 'no browser storage (26/08 rule)')
    assert.deepEqual(errors, [], 'no page errors')
  } finally {
    await browser.close()
    // Leave the shared backend exactly as found (null = nothing remembered),
    // so later tests open on the default project as before.
    await api('/settings/last-project', 'PUT', { project_id: before ?? null })
  }
  assert.equal(await remembered(), before ?? null, 'the shared backend is left as found')
})

test('a remembered project that is no longer listed falls back to the default', { timeout: 60000 }, async () => {
  const response = await fetch(`${API}/settings/last-project`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json', 'x-hermes-session-token': TOKEN },
    body: JSON.stringify({ project_id: 'no-such-project' }),
  })
  assert.equal(response.status, 422, 'an unknown project is refused')
  const browser = await chromium.launch()
  try {
    const page = await (await browser.newContext()).newPage()
    await page.goto(BASE)
    assert.doesNotMatch(await currentProject(page), /no-such-project/)
  } finally {
    await browser.close()
  }
})
