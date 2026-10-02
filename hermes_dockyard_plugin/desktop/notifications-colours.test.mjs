// Notifications screen colours: every colour the styles use must exist in BOTH
// the light and the dark theme, and the rendered screen must follow them.
// A colour name the shell does not define falls back to a light colour (or to
// nothing), so parts of the screen stay light in dark mode.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const require = createRequire(fileURLToPath(new URL('../dashboard/package.json', import.meta.url)))
const { chromium } = require('playwright')
const BASE = process.env.STEWARD_DESKTOP_URL || 'http://127.0.0.1:19500/desktop'
const read = (file) => readFileSync(fileURLToPath(new URL(file, import.meta.url)), 'utf8')

test('Notifications styles use only colour tokens the shell defines for BOTH themes', () => {
  const shell = read('./src/styles/dockyard-css.js')
  const block = (selector) => {
    const start = shell.indexOf(`${selector} {`)
    assert.ok(start >= 0, `${selector} block exists`)
    // The block closes on a line of its own; values like ${LIGHT_TOKENS.bg} contain '}'.
    const end = shell.indexOf('\n}', start)
    assert.ok(end > start, `${selector} block closes`)
    return shell.slice(start, end)
  }
  const tokens = (text) => new Set([...text.matchAll(/(--dy-[a-z0-9-]+)\s*:/g)].map((match) => match[1]))
  const light = tokens(block('.dockyard-root'))
  const dark = tokens(block('.dockyard-root[data-theme="dark"]'))
  const css = read('./src/styles/notifications-css.js')
  const used = [...new Set([...css.matchAll(/var\(\s*(--dy-[a-z0-9-]+)/g)].map((match) => match[1]))]
  assert.ok(used.length > 5, 'the Notifications styles read the shell tokens')
  assert.deepEqual(used.filter((token) => !light.has(token)), [], 'every token exists in the light theme')
  assert.deepEqual(used.filter((token) => !dark.has(token)), [], 'every token exists in the dark theme')
  assert.doesNotMatch(css, /var\(--dy-[a-z0-9-]+\s*,/, 'no fallback colours: they hide a missing token in dark mode')
})

test('Notifications: dark theme recolours chips, labels, day headings, pop-ups and the focus ring', { timeout: 120000 }, async () => {
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
  try {
    await page.goto(BASE)
    await page.getByRole('tab', { name: 'Notifications' }).click()
    // The filter bar always renders; the settings panel needs at least one notification.
    await page.locator('.dy-notif-filters').waitFor()
    // A key press makes the next script focus count as keyboard focus (:focus-visible).
    await page.keyboard.press('Shift')
    const sample = () => page.evaluate(() => {
      const root = document.querySelector('.dockyard-root')
      const token = (name) => {
        const probe = document.createElement('span')
        probe.style.color = `var(${name})`
        root.append(probe)
        const value = getComputedStyle(probe).color
        probe.remove()
        return value
      }
      // The screen may hold no chip, day heading, settings panel or pop-up yet, so
      // mount one of each with the screen's own classes and read what the
      // stylesheet gives it.
      const made = []
      const make = (tag, className, parent = root) => {
        const el = document.createElement(tag)
        el.className = className
        el.textContent = 'x'
        parent.append(el)
        made.push(el)
        return el
      }
      const chip = make('button', 'dy-notif-chip')
      const pressed = make('button', 'dy-notif-chip')
      pressed.setAttribute('aria-pressed', 'true')
      const day = make('div', 'dy-notif-day')
      const popup = make('div', 'dy-notif-popup')
      const popupText = make('span', '', popup)
      const settings = make('aside', 'dy-notif-settings')
      const label = make('label', '', settings)
      const row = make('button', 'dy-notif-row-btn')
      row.focus()
      const values = {
        actual: {
          chipText: getComputedStyle(chip).color,
          pressedBackground: getComputedStyle(pressed).backgroundColor,
          pressedBorder: getComputedStyle(pressed).borderTopColor,
          dayHeading: getComputedStyle(day).color,
          settingsLabel: getComputedStyle(label).color,
          popupBackground: getComputedStyle(popup).backgroundColor,
          popupText: getComputedStyle(popupText).color,
          focusRing: getComputedStyle(row).outlineColor,
        },
        expected: {
          chipText: token('--dy-text-2'),
          pressedBackground: token('--dy-accent-soft'),
          pressedBorder: token('--dy-accent-border'),
          dayHeading: token('--dy-text-2'),
          settingsLabel: token('--dy-text-2'),
          popupBackground: token('--dy-surface-strong'),
          popupText: token('--dy-text-2'),
          focusRing: token('--dy-focus'),
        },
      }
      row.blur()
      for (const el of made.reverse()) el.remove()
      return values
    })
    const light = await sample()
    assert.deepEqual(light.actual, light.expected, 'light theme: Notifications colours follow the shell tokens')
    await page.evaluate(() => document.querySelector('.dockyard-root').setAttribute('data-theme', 'dark'))
    const dark = await sample()
    assert.deepEqual(dark.actual, dark.expected, 'dark theme: Notifications colours follow the shell tokens')
    for (const part of Object.keys(light.actual)) {
      assert.notEqual(dark.actual[part], light.actual[part], `${part} changes colour in dark mode`)
    }
  } finally {
    await browser.close()
  }
})
