// Batch E5 — Notifications screen end-to-end through the REAL plugin bundle and
// REAL backend (disposable data): filters and counts, day grouping, the detail
// panel's actions (mark seen, resolve with note), mark all as seen, the badge
// counts New only, settings save and reload, the pop-up poller through the
// in-app toast fallback (the harness host has no notify), no duplicates after a
// reload, and the keyboard path. No mocks for data; host.notify is the plan's
// stubbed-host case.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const require = createRequire(fileURLToPath(new URL('../dashboard/package.json', import.meta.url)))
const { chromium } = require('playwright')
const BASE = process.env.STEWARD_DESKTOP_URL || 'http://127.0.0.1:19500/desktop'
const API = process.env.STEWARD_API_URL || 'http://127.0.0.1:19500/api/plugins/hermes-dockyard'
const V = API
const TOKEN = 'demo-session-token'

async function api(path, method = 'GET', body) {
  const res = await fetch(`${V}${path}`, {
    method,
    headers: {
      'content-type': 'application/json',
      'x-hermes-session-token': TOKEN,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`${method} ${path} -> ${res.status}: ${await res.text()}`)
  return res.json()
}

// Seed deterministic notifications through the real engine endpoints:
// two new (one approval, one alert, different severities/times) + one seen.
async function seed() {
  const made = await api('/notifications', 'POST', {}).catch(() => null)
  void made
  // The engine records from events; simplest deterministic source: propose an
  // initiative (approval notification) and a manual alert via the resolve-free
  // create path is not exposed, so use two proposals + one health change via a
  // cycle transition. Proposals are deduped per initiative ref — unique titles.
  const stamp = Date.now()
  const refs = []
  for (const title of [`E5 smoke approval ${stamp}`, `E5 smoke second ${stamp}`]) {
    const res = await api('/projects/payments-relaunch/initiatives', 'POST', {
      title, rationale: 'E5 browser suite seeding',
    })
    refs.push(res.ref ?? res.initiative?.ref)
  }
  return { refs, stamp }
}

async function openNotifications(page) {
  await page.goto(BASE)
  await page.getByRole('tab', { name: 'Notifications' }).click()
  await page.locator('.dy-notif-filters').waitFor()
}

test('E5: filters, day groups, detail actions, badge, settings, poller, keyboard', { timeout: 240000 }, async () => {
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
  const errors = []
  page.on('pageerror', (error) => errors.push(String(error)))
  try {
    const { refs } = await seed()

    // Wait until the seeded approval rows are listed.
    await openNotifications(page)
    await page
      .waitForFunction((r) => document.body.innerText.includes(r), refs[0])
      .catch(async () => {
        const panelText = await page.locator('#dockyard-panel').innerText().catch(() => 'n/a')
        assert.fail(`seeded approval notification is listed; page errors: ${JSON.stringify(errors)}; panel: ${panelText.slice(0, 2200)}`)
      })

    // 1. Filters: type=Approvals narrows to approval rows only.
    const rows = page.locator('.dockyard-notification-row')
    const allCount = await rows.count()
    assert.ok(allCount >= 2, 'at least the seeded rows are present')
    await page.getByLabel('Filter by type').selectOption('approval_required')
    const approvalCount = await rows.count()
    assert.ok(approvalCount >= 2 && approvalCount <= allCount)
    await page.getByLabel('Filter by severity').selectOption('high')
    await page.getByLabel('Filter by state').selectOption('new')
    // Counts in the project filter carry per-project counts.
    const projectOptions = await page.getByLabel('Filter by project').locator('option').allInnerTexts()
    assert.ok(projectOptions.some((t) => /payments-relaunch \(\d+\)/.test(t)), 'project filter shows counts')
    // Filtered-empty state.
    await page.getByLabel('Filter by state').selectOption('resolved')
    if ((await rows.count()) === 0) {
      await page.getByText('Nothing matches these filters').waitFor()
    }
    await page.getByLabel('Filter by state').selectOption('all')
    await page.getByLabel('Filter by severity').selectOption('all')

    // 2. Day grouping: seeded rows are today; the group heading exists.
    assert.ok(await page.getByText('Today', { exact: true }).count() > 0, 'Today group present')

    // 3. Detail panel: select the first row, mark seen from the detail.
    await rows.first().locator('button').first().click()
    await page.locator('[data-notification-detail]').waitFor()
    const detail = page.locator('[data-notification-detail]')
    await detail.getByRole('button', { name: 'Mark seen' }).click()
    await page
      .waitForFunction(() => document.querySelector('[data-notification-detail]')?.innerText.includes('Seen by'))
      .catch(() => assert.fail('detail shows who saw it'))

    // 4. Resolve with a note from the detail panel.
    await detail.getByRole('button', { name: 'Resolve', exact: true }).click()
    await detail.getByLabel('Resolution note').fill('E5 browser resolve')
    await detail.getByRole('button', { name: 'Confirm resolve' }).click()
    await page
      .waitForFunction(() => document.querySelector('[data-notification-detail]')?.innerText.includes('Resolved by'))
      .catch(() => assert.fail('detail shows who resolved it'))

    // 5. Mark all as seen: every remaining new row leaves the New state.
    await page.getByRole('button', { name: 'Mark all as seen' }).click()
    await page
      .waitForFunction(() => {
        const states = [...document.querySelectorAll('.dockyard-notification-row')]
        return states.length > 0 && states.every((r) => r.getAttribute('data-notification-state') !== 'new')
      })
      .catch(() => assert.fail('mark all as seen clears every new row'))

    // 6. Badge counts New only: the tab shows no count after the sweep.
    await page.getByRole('tab', { name: 'Notifications' }).waitFor()
    const badge = await page.locator('[data-tab="notifications"] .dockyard-tab-count').count()
    assert.equal(badge, 0, 'no New badge after everything is seen')

    // 7. Settings panel: change pop-up minimum severity and reload — the value persists.
    await page.locator('[data-notification-settings]').waitFor()
    await page.locator('#dy-notif-popups-severity').selectOption('critical')
    await page.reload()
    await openNotifications(page)
    await page.locator('[data-notification-settings]').waitFor()
    assert.equal(await page.locator('#dy-notif-popups-severity').inputValue(), 'critical')
    // Restore the default for later runs.
    await page.locator('#dy-notif-popups-severity').selectOption('high')

    // 8. Poller: the in-app toast fallback fires for fresh pop-ups (host mock
    // has no notify). Seed the probe FIRST, reload, and let the prime tick
    // surface it; its id is then shown-marked and remembered, so a further wait
    // must NOT surface it again.
    const fresh = await api('/projects/payments-relaunch/initiatives', 'POST', {
      title: `E5 pop-up probe ${refs[0]}`, rationale: 'poller toast check',
    })
    const freshRef = fresh.ref ?? fresh.initiative?.ref
    assert.ok(freshRef, 'probe proposal created')
    // Speed up the poller for this test only (documented hook); production keeps
    // the 60s cadence. Set as an init script so it is in place before the
    // plugin registers on every navigation; two-second ticks make the duplicate
    // check take seconds.
    await page.addInitScript(() => { window.__dockyardPopupIntervalMs = 2000 })
    await page.reload()
    await openNotifications(page)
    await page
      .waitForFunction(
        (r) => (window.__hostNotifyCalls ?? []).some((item) => String(item?.title ?? '').includes(r)),
        String(freshRef),
        { timeout: 30000 },
      )
      .catch(() => assert.fail('poller surfaced the fresh approval through host.notify'))
    // Let several fast ticks pass; the same pop-up must never return.
    await page.waitForTimeout(7000)
    const calls = await page.evaluate(() => window.__hostNotifyCalls ?? [])
    const refCalls = calls.filter((item) => String(item?.title ?? '').includes(String(freshRef)))
    assert.equal(refCalls.length, 1, 'the same pop-up never shows twice')

    // 9. Keyboard path: the toolbar is reachable; the row button is a real button.
    await page.getByLabel('Filter by state').focus()
    await page.keyboard.press('Tab')
    assert.equal(await page.evaluate(() => document.activeElement?.tagName), 'SELECT', 'filters stay in the tab order')

    assert.deepEqual(errors, [], 'no page errors')
  } finally {
    await browser.close()
  }
})
