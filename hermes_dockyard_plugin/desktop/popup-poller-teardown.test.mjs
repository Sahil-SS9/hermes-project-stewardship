// The popup poller's interval is cleared when the plugin surface unloads and
// re-armed when it returns (catalog review, PR #136752: index.js:172 leaks a
// running timer). Driven by real pagehide/pageshow events.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { chromium } from './browser-harness.mjs'

const BASE = process.env.STEWARD_DESKTOP_URL
const id = (page) => page.evaluate(() => window.__dockyardPopupPoller ?? null)

test('the popup poller clears on pagehide and re-arms on pageshow', { timeout: 120000 }, async () => {
  assert.ok(BASE && process.env.STEWARD_API_URL, 'run via run-browser-suite.mjs')

  const browser = await chromium.launch({ headless: true })
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
    page.setDefaultTimeout(10000)
    const errors = []
    page.on('pageerror', (error) => errors.push(String(error)))
    await page.goto(BASE, { waitUntil: 'load' })
    const first = await id(page)
    assert.equal(typeof first, 'number', 'the poller interval is armed after load')

    await page.evaluate(() => window.dispatchEvent(new Event('pagehide')))
    assert.equal(await id(page), null, 'pagehide clears the interval')

    await page.evaluate(() => window.dispatchEvent(new Event('pageshow', { persisted: true })))
    const reArmed = await id(page)
    assert.equal(typeof reArmed, 'number', 'pageshow re-arms the poller')
    assert.notEqual(reArmed, first, 'a fresh interval, not the leaked one')

    await page.evaluate(() => window.dispatchEvent(new Event('pagehide')))
    await page.evaluate(() => window.dispatchEvent(new Event('pageshow')))
    const again = await id(page)
    assert.equal(typeof again, 'number', 'a fresh showing re-arms again after pagehide')
    assert.notEqual(again, reArmed, 'never the stale handle')
    assert.deepEqual(errors, [])
  } finally {
    await browser.close()
  }
})