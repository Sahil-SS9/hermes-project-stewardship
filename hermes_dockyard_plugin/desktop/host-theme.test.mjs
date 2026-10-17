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

// Desktop's documented theme variables (Desktop plugin SDK: "Style with theme
// variables, never hardcoded colors"), painted on <html> as Desktop paints them.
// Mono dark: neutral greys and a near-white accent.
const MONO_DARK = {
  '--ui-text-primary': 'rgb(240, 240, 240)',
  '--ui-text-secondary': 'rgb(190, 190, 190)',
  '--ui-text-tertiary': 'rgb(150, 150, 150)',
  '--ui-stroke-primary': 'rgb(90, 90, 90)',
  '--ui-stroke-secondary': 'rgb(60, 60, 60)',
  '--ui-bg-editor': 'rgb(23, 23, 23)',
  '--ui-accent': 'rgb(250, 250, 250)',
}
// A light theme with an orange brand accent: white text on it reads at about
// 2:1, so the button text has to be computed (black), not assumed.
const ORANGE_LIGHT = {
  '--ui-text-primary': 'rgb(20, 20, 20)',
  '--ui-text-secondary': 'rgb(80, 80, 80)',
  '--ui-text-tertiary': 'rgb(110, 110, 110)',
  '--ui-stroke-primary': 'rgb(150, 150, 150)',
  '--ui-stroke-secondary': 'rgb(220, 220, 220)',
  '--ui-bg-editor': 'rgb(252, 252, 252)',
  '--ui-accent': 'rgb(255, 159, 10)',
}

const paintDesktop = (page, palette) => page.evaluate((vars) => {
  for (const [name, value] of Object.entries(vars)) document.documentElement.style.setProperty(name, value)
}, palette)

// The colour a token resolves to on a probe inside the root.
const resolved = (root, token, property = 'color') => root.evaluate((el, [name, prop]) => {
  const probe = el.appendChild(document.createElement('span'))
  probe.style[prop] = `var(${name})`
  const value = getComputedStyle(probe)[prop]
  probe.remove()
  return value
}, [token, property])

function contrast(first, second) {
  const lum = (value) => {
    const [r, g, b] = value.match(/[\d.]+/g).slice(0, 3).map(Number).map((c) => {
      const v = c / 255
      return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
    })
    return 0.2126 * r + 0.7152 * g + 0.0722 * b
  }
  const [hi, lo] = [lum(first), lum(second)].sort((a, b) => b - a)
  return (hi + 0.05) / (lo + 0.05)
}

async function eventually(read, expected, message) {
  let last
  for (let attempt = 0; attempt < 50; attempt += 1) {
    last = await read()
    if (JSON.stringify(last) === JSON.stringify(expected)) return
    await new Promise((resolve) => setTimeout(resolve, 100))
  }
  assert.fail(`${message}: got ${JSON.stringify(last)}, expected ${JSON.stringify(expected)}`)
}

async function openAuto(colorScheme) {
  const before = await api('/settings/appearance')
  await api('/settings/appearance', 'PUT', { ...before, theme: 'auto' })
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, colorScheme })
  page.setDefaultTimeout(10000)
  const errors = []
  page.on('pageerror', (error) => errors.push(String(error)))
  await page.goto(BASE, { waitUntil: 'networkidle' })
  const root = page.locator('.dockyard-root').first()
  await root.waitFor()
  const close = async () => {
    await browser.close()
    await api('/settings/appearance', 'PUT', before).catch(() => {})
  }
  return { before, page, root, errors, close }
}

// Inside Hermes Desktop, Match Hermes styles with Desktop's documented --ui-*
// variables and leaves the page background to Desktop; status colours stay the
// app's. Primary buttons take the accent with black or white text, whichever
// reads, because the accent is a stroke colour, not a text-safe fill.
test('Match Hermes inside Hermes Desktop styles with its documented theme variables', { timeout: 120000 }, async () => {
  assert.ok(BASE && API, 'Run via run-browser-suite.mjs')
  const { page, root, errors, close } = await openAuto('dark')
  try {
    await paintDesktop(page, MONO_DARK)
    const own = { action: await resolved(root, '--dy-action', 'backgroundColor'), danger: await resolved(root, '--dy-danger') }

    // No SDK theme: not Desktop, so the app's own tokens stand.
    assert.equal(await root.getAttribute('data-dy-host'), null)
    assert.notEqual(own.action, 'rgb(250, 250, 250)')

    await page.evaluate(() => window.__setHostTheme({ resolvedMode: 'dark', renderedMode: 'dark' }))
    await waitForMode(page, 'dark', 'a dark painted surface shows dark')
    assert.equal(await root.getAttribute('data-dy-host'), 'hermes-desktop')
    assert.equal(await root.evaluate((el) => getComputedStyle(el).backgroundColor), 'rgba(0, 0, 0, 0)',
      'the page background is left to Desktop')
    assert.equal(await resolved(root, '--dy-text'), 'rgb(240, 240, 240)')
    assert.equal(await resolved(root, '--dy-text-2'), 'rgb(190, 190, 190)')
    assert.equal(await resolved(root, '--dy-text-3'), 'rgb(150, 150, 150)')
    assert.equal(await resolved(root, '--dy-border', 'borderTopColor'), 'rgb(60, 60, 60)')
    assert.equal(await resolved(root, '--dy-surface', 'backgroundColor'), 'rgb(23, 23, 23)')
    const button = async () => [await resolved(root, '--dy-action', 'backgroundColor'), await resolved(root, '--dy-on-action')]
    await eventually(button, ['rgb(250, 250, 250)', 'rgb(0, 0, 0)'], 'buttons take the accent with readable text')
    assert.equal(await resolved(root, '--dy-danger'), own.danger, 'status colours stay the app\'s')

    // A light theme with an orange accent: the text flips to black.
    await paintDesktop(page, ORANGE_LIGHT)
    await page.evaluate(() => window.__setHostTheme({ resolvedMode: 'light', renderedMode: 'light' }))
    await waitForMode(page, 'light', 'a light painted surface shows light')
    await eventually(button, ['rgb(255, 159, 10)', 'rgb(0, 0, 0)'], 'an orange accent gets black text')
    const [fill, ink] = await button()
    assert.ok(contrast(fill, ink) >= 4.5, `button text contrast ${contrast(fill, ink).toFixed(2)} < 4.5`)
    assert.ok(contrast(await resolved(root, '--dy-text'), await resolved(root, '--dy-surface', 'backgroundColor')) >= 4.5)
    assert.deepEqual(errors, [])
  } finally {
    await close()
  }
})

// A Desktop without these variables (older, or one that renamed them) gets the
// app's own light/dark colours, never an unset token.
test('Without Desktop\'s variables, Match Hermes keeps the app\'s own colours', { timeout: 120000 }, async () => {
  assert.ok(BASE && API, 'Run via run-browser-suite.mjs')
  const { page, root, errors, close } = await openAuto('dark')
  try {
    await page.evaluate(() => window.__setHostTheme({ resolvedMode: 'dark', renderedMode: 'dark' }))
    await waitForMode(page, 'dark', 'a dark painted surface shows dark')
    assert.equal(await root.getAttribute('data-dy-host'), 'hermes-desktop')
    await new Promise((resolve) => setTimeout(resolve, 300))
    assert.equal(await resolved(root, '--dy-text'), 'rgb(243, 245, 247)')
    assert.equal(await resolved(root, '--dy-surface', 'backgroundColor'), 'rgb(23, 27, 34)')
    assert.equal(await resolved(root, '--dy-action', 'backgroundColor'), 'rgb(54, 84, 199)')
    assert.equal(await resolved(root, '--dy-on-action'), 'rgb(255, 255, 255)')
    assert.deepEqual(errors, [])
  } finally {
    await close()
  }
})

// A chosen theme other than Match Hermes keeps its own palette in Desktop.
test('A chosen theme keeps its own palette inside Hermes Desktop', { timeout: 120000 }, async () => {
  assert.ok(BASE && API, 'Run via run-browser-suite.mjs')
  const before = await api('/settings/appearance')
  await api('/settings/appearance', 'PUT', { ...before, theme: 'cobalt' })
  const browser = await chromium.launch({ headless: true })
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, colorScheme: 'dark' })
    page.setDefaultTimeout(10000)
    await page.goto(BASE, { waitUntil: 'networkidle' })
    await page.locator('.dockyard-root[data-dy-theme="cobalt"]').first().waitFor()
    await paintDesktop(page, MONO_DARK)
    await page.evaluate(() => window.__setHostTheme({ resolvedMode: 'dark', renderedMode: 'dark' }))
    const root = page.locator('.dockyard-root[data-dy-host="hermes-desktop"]').first()
    await root.waitFor()
    assert.equal(await resolved(root, '--dy-surface', 'backgroundColor'), 'rgb(14, 20, 34)', 'cobalt keeps its own surface')
    assert.equal(await root.evaluate((el) => getComputedStyle(el).getPropertyValue('--ui-bg-editor').trim()), 'rgb(23, 23, 23)',
      'the Desktop palette is still in scope')
  } finally {
    await browser.close()
    await api('/settings/appearance', 'PUT', before).catch(() => {})
  }
})
