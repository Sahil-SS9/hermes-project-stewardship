// Discord alerts (checks round 1; Sahil 08/10 pick 2 = A) on App settings, end
// to end through the REAL plugin bundle, proxy and backend (disposable data):
//   - Discord alerts start Off, and the level cannot be changed while off;
//   - switching them On and picking a level saves to the backend's app-wide
//     policy (channels.discord), the other channels unchanged;
//   - the note says nothing is sent until the scheduled job is set up.
// The test puts the policy back as it found it.
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
async function until(check, message) {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    if (await check()) return
    await new Promise((resolve) => setTimeout(resolve, 100))
  }
  assert.fail(message)
}
const discordOf = async () => (await api('/settings/notifications')).policy?.channels?.discord ?? {}

test('Discord alerts: off by default, switched on with a level from App settings, saved to the backend', { timeout: 120000 }, async () => {
  assert.ok(BASE && API, 'Run via run-browser-suite.mjs')
  const before = (await api('/settings/notifications')).policy
  const browser = await chromium.launch({ headless: true })
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
    page.setDefaultTimeout(10000)
    const errors = []
    page.on('pageerror', (error) => errors.push(String(error)))
    await page.goto(BASE, { waitUntil: 'networkidle' })
    await page.locator('[data-tab="settings"]').click()
    await page.locator('[data-app-settings] [data-notification-settings]').waitFor()

    assert.equal((await api('/settings/notifications/effective')).effective?.channels?.discord?.enabled, false,
      'off by default in the backend')
    assert.equal(await page.locator('#dy-notif-discord-enabled').inputValue(), 'off')
    assert.equal(await page.locator('#dy-notif-discord-severity').isDisabled(), true, 'no level while off')
    assert.equal(await page.locator('#dy-notif-discord-severity').evaluate((el) => getComputedStyle(el).opacity), '0.5',
      'and it looks switched off')
    assert.match(await page.locator('[data-discord-note]').innerText(), /Until then nothing is sent/)

    const effectiveDesktop = async () => (await api('/settings/notifications/effective')).effective?.channels?.desktop
    const desktopBefore = await effectiveDesktop()
    await page.locator('#dy-notif-discord-enabled').selectOption('on')
    await until(async () => (await discordOf()).enabled === true, 'switching Discord on did not reach the backend')
    await page.locator('#dy-notif-discord-severity:not([disabled])').waitFor()
    await page.locator('#dy-notif-discord-severity').selectOption('critical')
    await until(async () => (await discordOf()).min_severity === 'critical', 'the Discord level did not save')
    assert.deepEqual(await effectiveDesktop(), desktopBefore, 'pop-ups unchanged')
    assert.deepEqual(errors, [])
  } finally {
    await api('/settings/notifications', 'PUT', { policy: before }).catch(() => {})
    await browser.close()
  }
})
