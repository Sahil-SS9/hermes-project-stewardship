// Match Hermes follows the mode Hermes Desktop paints, read only through the
// plugin SDK's useTheme() (catalog review, PR #136752) — never from the app's
// <html> markup. Without the hook the system setting decides.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { chromium } from './browser-harness.mjs'

const BASE = process.env.STEWARD_DESKTOP_URL
const API = process.env.STEWARD_API_URL
const TOKEN = { 'x-hermes-session-token': 'demo-session-token', 'content-type': 'application/json' }

async function api(path, method = 'GET', body) {
  const res = await fetch(`${API}${path}`, { method, headers: TOKEN, body: body === undefined ? undefined : JSON.stringify(body) })
  if (!res.ok) throw new Error(`${method} ${path} -> ${res.status}: ${await res.text()}`)
  return res.json()
}

const rootMode = (page) => page.locator('.dockyard-root').first().getAttribute('data-theme')

async function waitForMode(page, expected, message) {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    if (await rootMode(page) === expected) return
    await new Promise((resolve) => setTimeout(resolve, 100))
  }
  assert.fail(`${message} (data-theme is ${await rootMode(page)})`)
}

test('Match Hermes follows useTheme(), ignores the app markup, and falls back to the system setting', { timeout: 120000 }, async () => {
  assert.ok(BASE && API, 'Run via run-browser-suite.mjs')
  const before = await api('/settings/appearance')
  await api('/settings/appearance', 'PUT', { ...before, theme: 'auto' })
  const browser = await chromium.launch({ headless: true })
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, colorScheme: 'light' })
    page.setDefaultTimeout(10000)
    const errors = []
    page.on('pageerror', (error) => errors.push(String(error)))
    await page.goto(BASE, { waitUntil: 'networkidle' })
    await page.locator('.dockyard-root').first().waitFor()

    // No SDK theme yet: the system setting decides.
    await waitForMode(page, 'light', 'with no host theme, a light system shows light')
    await page.emulateMedia({ colorScheme: 'dark' })
    await waitForMode(page, 'dark', 'with no host theme, a dark system shows dark')

    // The SDK reports Desktop's painted mode: it wins over the system.
    await page.evaluate(() => window.__setHostTheme({ resolvedMode: 'dark', renderedMode: 'light' }))
    await waitForMode(page, 'light', 'renderedMode (the painted surface) decides, not resolvedMode')
    await page.evaluate(() => window.__setHostTheme({ resolvedMode: 'dark', renderedMode: 'dark' }))
    await waitForMode(page, 'dark', 'a dark painted surface shows dark')

    // The app's own markup is not read any more.
    await page.evaluate(() => {
      document.documentElement.dataset.hermesMode = 'light'
      document.documentElement.classList.remove('dark')
    })
    await new Promise((resolve) => setTimeout(resolve, 400))
    assert.equal(await rootMode(page), 'dark', 'changing <html> markup must not change the plugin theme')

    // A host value naming neither mode falls back to the system setting.
    await page.evaluate(() => window.__setHostTheme({}))
    await page.emulateMedia({ colorScheme: 'light' })
    await waitForMode(page, 'light', 'an empty host value falls back to the system setting')
    assert.deepEqual(errors, [])
  } finally {
    await browser.close()
    await api('/settings/appearance', 'PUT', before).catch(() => {})
  }
})

// Desktop's "mono" dark palette: neutral greys and a near-white primary.
const paintDesktopMono = (page) => page.evaluate(() => {
  const html = document.documentElement.style
  html.setProperty('--dt-background', 'rgb(10, 10, 10)')
  html.setProperty('--dt-card', 'rgb(23, 23, 23)')
  html.setProperty('--dt-border', 'rgb(38, 38, 38)')
  html.setProperty('--dt-primary', 'rgb(250, 250, 250)')
  html.setProperty('--dt-primary-foreground', 'rgb(23, 23, 23)')
  html.setProperty('--dt-accent', 'rgb(38, 38, 38)')
  html.setProperty('--dt-ring', 'rgb(115, 115, 115)')
  html.setProperty('--theme-foreground', 'rgb(250, 250, 250)')
})

// Inside Hermes Desktop, Match Hermes takes Desktop's palette (its --dt-* and
// --theme-* properties), not only its mode; status colours stay the app's.
// Outside Desktop the app's own tokens stand.
test('Match Hermes inside Hermes Desktop takes the Desktop palette', { timeout: 120000 }, async () => {
  assert.ok(BASE && API, 'Run via run-browser-suite.mjs')
  const before = await api('/settings/appearance')
  await api('/settings/appearance', 'PUT', { ...before, theme: 'auto' })
  const browser = await chromium.launch({ headless: true })
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, colorScheme: 'dark' })
    page.setDefaultTimeout(10000)
    const errors = []
    page.on('pageerror', (error) => errors.push(String(error)))
    await page.goto(BASE, { waitUntil: 'networkidle' })
    const root = page.locator('.dockyard-root').first()
    await root.waitFor()
    await paintDesktopMono(page)
    const token = (name) => root.evaluate((el, n) => getComputedStyle(el).getPropertyValue(n).trim(), name)
    const own = { action: await token('--dy-action'), danger: await token('--dy-danger') }

    // No SDK theme: not Desktop, so the app's own tokens stand.
    assert.equal(await root.getAttribute('data-dy-host'), null)
    assert.notEqual(own.action, 'rgb(250, 250, 250)')

    await page.evaluate(() => window.__setHostTheme({ resolvedMode: 'dark', renderedMode: 'dark' }))
    await waitForMode(page, 'dark', 'a dark painted surface shows dark')
    assert.equal(await root.getAttribute('data-dy-host'), 'hermes-desktop')
    const bg = await root.evaluate((el) => getComputedStyle(el).backgroundColor)
    assert.equal(bg, 'rgb(10, 10, 10)', 'the page is Desktop\'s background')
    const button = await root.evaluate((el) => {
      const probe = el.appendChild(document.createElement('div'))
      probe.style.background = 'var(--dy-action)'
      probe.style.color = 'var(--dy-on-action)'
      const { backgroundColor, color } = getComputedStyle(probe)
      probe.remove()
      return { backgroundColor, color }
    })
    assert.deepEqual(button, { backgroundColor: 'rgb(250, 250, 250)', color: 'rgb(23, 23, 23)' }, 'primary actions are Desktop\'s primary')
    assert.equal(await token('--dy-danger'), own.danger, 'status colours stay the app\'s')

    // A chosen theme other than Match Hermes keeps its own palette in Desktop.
    await api('/settings/appearance', 'PUT', { ...before, theme: 'cobalt' })
    await page.reload({ waitUntil: 'networkidle' })
    await page.locator('.dockyard-root[data-dy-theme="cobalt"]').first().waitFor()
    await paintDesktopMono(page)
    await page.evaluate(() => window.__setHostTheme({ resolvedMode: 'dark', renderedMode: 'dark' }))
    await page.locator('.dockyard-root[data-dy-host="hermes-desktop"]').first().waitFor()
    assert.notEqual(await token('--dy-bg'), 'rgb(10, 10, 10)', 'a chosen theme keeps its own palette')
    assert.equal(await token('--dt-background'), 'rgb(10, 10, 10)', 'the Desktop palette is still in scope')
    assert.deepEqual(errors, [])
  } finally {
    await browser.close()
    await api('/settings/appearance', 'PUT', before).catch(() => {})
  }
})
