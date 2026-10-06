// C5 Activity end to end through the REAL plugin bundle and REAL backend
// (disposable data), no mocks. Real events are made first with the app's own
// actions (test-support/activity-seed.mjs: propose, approve, reject, request
// changes, withdraw, assign and unassign work). Then:
//   - the Activity tab lists them as rows (time, event, details, impact, by),
//     never as JSON, in the order and words the pure model gives
//     (activity-vocab.test.mjs pins the model's rules);
//   - Open goes to the exact place: a waiting initiative to the Approval
//     inbox, a decided one to Vision, a work item to its drawer;
//   - filter chips and search narrow the list, an empty filter says so and
//     can be cleared, and the chips work from the keyboard;
//   - the Overview "Recent activity" card uses the same words and View all
//     opens the tab;
//   - the review link (?review=1) switches to the timeline and back to
//     today's card; dark mode changes the impact pill colours; at phone width
//     the rows stack and nothing scrolls sideways.
// The suite shares one backend, so nothing here hard-codes a count.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { pickProject, rememberedProject, restoreRememberedProject } from './test-support/project-scope.mjs'
import { seedActivity } from './test-support/activity-seed.mjs'
import { activityRows, matchesFilter } from './src/lib/event-vocab.js'

const require = createRequire(fileURLToPath(new URL('../dashboard/package.json', import.meta.url)))
const { chromium } = require('playwright')
const BASE = process.env.STEWARD_DESKTOP_URL || 'http://127.0.0.1:19500/desktop'
const API = process.env.STEWARD_API_URL || 'http://127.0.0.1:19500/api/plugins/hermes-dockyard'
const HEADERS = { 'x-hermes-session-token': 'demo-session-token' }
const TZ = 'Europe/London'
const OPEN_STATES = new Set(['pending_approval', 'changes_requested', 'approved', 'active', 'measuring'])

async function call(path, method = 'GET', body) {
  const response = await fetch(`${API}${path}`, {
    method, headers: { ...HEADERS, 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  if (!response.ok) throw new Error(`${method} ${path} -> ${response.status}: ${(await response.text()).slice(0, 300)}`)
  return response.json()
}

// The seeded project: enabled, with room for 3 more open initiatives and an
// assigned work item to take off its owner and give back.
let seeded = null
async function seedOnce() {
  if (seeded) return seeded
  const dashboard = await call('/dashboard')
  const candidates = []
  for (const project of (dashboard.projects ?? []).filter((entry) => entry.enabled !== false)) {
    const pid = encodeURIComponent(project.id)
    const rows = (await call(`/projects/${pid}/initiatives`)).initiatives ?? []
    const work = (await call(`/projects/${pid}/work-items`)).work_items ?? []
    const owned = work.some((item) => typeof item.assignee === 'string' && item.assignee && (item.type ?? 'task') !== 'epic' && !['done', 'cancelled', 'canceled', 'closed', 'archived', 'completed'].includes(String(item.status ?? '')))
    candidates.push({ id: project.id, open: rows.filter((row) => OPEN_STATES.has(row.status)).length, owned })
  }
  const usable = candidates.filter((entry) => entry.owned && entry.open <= 2).sort((left, right) => left.open - right.open || left.id.localeCompare(right.id))
  assert.ok(usable.length > 0, `an enabled project has room for 3 more open initiatives and an assigned work item (${JSON.stringify(candidates)})`)
  const refs = await seedActivity(call, usable[0].id, { stamp: Date.now() })
  assert.ok(refs.work, `${usable[0].id}: a work item was taken off its owner and given back`)
  seeded = { projectId: usable[0].id, refs }
  return seeded
}

// What the tab should list, from the live API, with the screen's own model.
async function expectedRows(projectId) {
  const pid = encodeURIComponent(projectId)
  const [events, initiatives, work] = await Promise.all([
    call(`/projects/${pid}/events`), call(`/projects/${pid}/initiatives`), call(`/projects/${pid}/work-items`),
  ])
  return activityRows(events.events ?? [], { initiatives: initiatives.initiatives ?? [], workItems: work.work_items ?? [] }, { timeZone: TZ })
}
const rowFor = (rows, type, ref) => rows.find((row) => row.type === type && row.ref === ref)

async function withPage(viewport, run) {
  const remembered = await rememberedProject(API, HEADERS)
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport, timezoneId: TZ })
  const errors = []
  page.on('pageerror', (error) => errors.push(String(error)))
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()) })
  try {
    await run(page)
    assert.deepEqual(errors, [], 'no page errors or console errors')
  } finally {
    await browser.close()
    await restoreRememberedProject(API, HEADERS, remembered)
  }
}

async function openActivity(page, projectId, query = '') {
  await page.goto(`${BASE}${query}`)
  await pickProject(page, projectId)
  await page.locator('[data-tab="project"]').click()
  await page.locator(`[data-project-strip="${projectId}"]`).waitFor()
  await page.locator('[data-project-view="activity"]').click()
  await page.locator(`[data-activity="${projectId}"]`).waitFor()
}
const shownKeys = (page) => page.locator('[data-activity-row]').evaluateAll((els) => els.map((el) => el.getAttribute('data-activity-row')))

test('Activity: real events as rows in the model\'s order and words, never JSON', { timeout: 180000 }, async () => {
  const { projectId, refs } = await seedOnce()
  const rows = await expectedRows(projectId)
  await withPage({ width: 1440, height: 900 }, async (page) => {
    await openActivity(page, projectId)
    const panel = page.locator(`[data-activity="${projectId}"]`)
    assert.equal(await panel.getAttribute('data-activity-layout'), 'table', 'the table is the default layout')
    const text = await panel.innerText()
    assert.doesNotMatch(text, /[{}]|"event_type"|\binitiative\.[a-z_]+\b|\bwork\.(un)?assigned\b/, 'no JSON and no code names on screen')
    assert.deepEqual(await panel.locator('thead th').evaluateAll((els) => els.map((el) => el.textContent.trim())), ['Time', 'Event', 'Details', 'Impact', 'By', 'Open'])
    assert.deepEqual(await shownKeys(page), rows.map((row) => row.key), 'every row, newest first, as the model orders them')

    const checks = [
      ['initiative.approved', refs.approved, 'Initiative approved', 'Work can start'],
      ['initiative.rejected', refs.rejected, 'Initiative rejected', 'Will not go ahead'],
      ['initiative.changes_requested', refs.changes, 'Changes requested', 'Back with the proposer'],
      ['initiative.withdrawn', refs.withdrawn, 'Initiative withdrawn', 'Closed by the proposer'],
      ['initiative.approval_required', refs.waiting, 'Approval requested', 'Waiting for a decision'],
      ['work.assigned', refs.work, 'Work assigned', 'Has an owner'],
      ['work.unassigned', refs.work, 'Work unassigned', 'No bot will pick it up'],
    ]
    for (const [type, ref, label, impact] of checks) {
      const want = rowFor(rows, type, ref)
      assert.ok(want, `the backend recorded ${type} for ${ref}`)
      const row = panel.locator(`tr[data-activity-row="${want.key}"]`)
      const cells = await row.locator('td').evaluateAll((els) => els.map((el) => el.innerText.replace(/\s+/g, ' ').trim()))
      assert.equal(cells[0], want.time, `${type}: time`)
      assert.equal(cells[1], label, `${type}: event`)
      assert.ok(cells[2].startsWith(want.title) && cells[2].includes(want.title), `${type}: details "${cells[2]}"`)
      if (want.note) assert.ok(cells[2].includes(want.note), `${type}: the note "${want.note}" is shown`)
      assert.equal(cells[3], impact, `${type}: impact`)
      assert.equal(cells[4], want.by, `${type}: by`)
      assert.equal(await row.getAttribute('data-tone'), want.tone, `${type}: tone`)
    }
    assert.match(await panel.locator(`tr[data-activity-row="${rowFor(rows, 'initiative.rejected', refs.rejected).key}"] td`).nth(2).innerText(), /Too costly this quarter/, 'the reject reason is shown')
    assert.match(await panel.locator(`tr[data-activity-row="${rowFor(rows, 'initiative.changes_requested', refs.changes).key}"] td`).nth(2).innerText(), /Show the cost first/, 'the reviewer feedback is shown')
  })
})

test('Activity: Open goes to the Approval inbox, Vision or the work item', { timeout: 180000 }, async () => {
  const { projectId, refs } = await seedOnce()
  const rows = await expectedRows(projectId)
  await withPage({ width: 1440, height: 900 }, async (page) => {
    await openActivity(page, projectId)
    const waiting = rowFor(rows, 'initiative.approval_required', refs.waiting)
    await page.locator(`[data-activity-open="${waiting.key}"]`).click()
    await page.locator('[data-tab="inbox"][aria-selected="true"]').waitFor()
    await page.locator(`[data-inbox-ref="${refs.waiting}"][aria-selected="true"]`).first().waitFor()

    await openActivity(page, projectId)
    const approved = rowFor(rows, 'initiative.approved', refs.approved)
    assert.equal(await page.locator(`[data-activity-open="${approved.key}"]`).innerText(), 'Open in Vision')
    await page.locator(`[data-activity-open="${approved.key}"]`).click()
    await page.locator('[data-project-view="plan"][aria-pressed="true"]').waitFor()
    await page.locator('[data-plan-drawer="initiative"]').waitFor()
    assert.match(await page.locator('[data-plan-drawer="initiative"] h3').innerText(), /Cache the price list/)

    await page.locator('[data-project-view="activity"]').click()
    const work = rowFor(rows, 'work.unassigned', refs.work)
    await page.locator(`[data-activity-open="${work.key}"]`).click()
    await page.locator(`[data-work-item-detail="${refs.work}"]`).waitFor()
  })
})

test('Activity: chips and search narrow the list; an empty filter says so; keyboard works', { timeout: 180000 }, async () => {
  const { projectId } = await seedOnce()
  const rows = await expectedRows(projectId)
  await withPage({ width: 1280, height: 900 }, async (page) => {
    await openActivity(page, projectId)
    for (const kind of ['initiatives', 'work', 'health', 'all']) {
      await page.locator(`[data-activity-filter="${kind}"]`).click()
      assert.equal(await page.locator(`[data-activity-filter="${kind}"]`).getAttribute('aria-pressed'), 'true')
      const want = rows.filter((row) => matchesFilter(row, { kind })).map((row) => row.key)
      if (want.length === 0) {
        await page.locator('[data-activity-empty="filtered"]').waitFor()
        assert.equal(await page.locator('[data-activity-row]').count(), 0, `${kind}: no rows`)
        await page.locator('[data-activity-clear]').click()
        assert.equal(await page.locator('[data-activity-filter="all"]').getAttribute('aria-pressed'), 'true', 'Clear filters goes back to all events')
        continue
      }
      assert.deepEqual(await shownKeys(page), want, `${kind}: exactly the model's rows`)
    }
    await page.locator('[data-activity-search]').fill('too costly')
    assert.deepEqual(await shownKeys(page), rows.filter((row) => matchesFilter(row, { kind: 'all', query: 'too costly' })).map((row) => row.key), 'search finds the reject reason')
    assert.match(await page.locator('[data-activity-count]').innerText(), /^\d+ of \d+ events?$/)
    await page.locator('[data-activity-search]').fill('')

    // Keyboard: Tab from the search box's predecessor lands on a chip; Space presses it.
    await page.locator('[data-activity-filter="work"]').focus()
    await page.keyboard.press('Space')
    assert.equal(await page.locator('[data-activity-filter="work"]').getAttribute('aria-pressed'), 'true', 'Space presses a chip')
    await page.keyboard.press('Shift+Tab')
    await page.keyboard.press('Enter')
    assert.equal(await page.locator('[data-activity-filter="initiatives"]').getAttribute('aria-pressed'), 'true', 'Shift+Tab then Enter presses the chip before it')
  })
})

test('Activity: the Overview card uses the same words and View all opens the tab', { timeout: 180000 }, async () => {
  const { projectId } = await seedOnce()
  const rows = await expectedRows(projectId)
  await withPage({ width: 1280, height: 900 }, async (page) => {
    await page.goto(BASE)
    await pickProject(page, projectId)
    await page.locator('[data-tab="project"]').click()
    const card = page.locator('[data-overview-activity="words"]')
    await card.waitFor()
    assert.deepEqual(await card.locator('[data-activity-row]').evaluateAll((els) => els.map((el) => el.getAttribute('data-activity-row'))), rows.slice(0, 4).map((row) => row.key), 'the latest four rows')
    const first = (await card.locator('[data-activity-row] strong').first().innerText()).trim()
    assert.equal(first, rows[0].title ? `${rows[0].label} · ${rows[0].title}` : rows[0].label, 'the same words as the tab')
    assert.doesNotMatch(await card.innerText(), /Attributed event|\binitiative\.[a-z_]+/, 'no code names and no "Attributed event"')
    await card.locator('[data-activity-view-all]').click()
    await page.locator('[data-project-view="activity"].active').waitFor()
    await page.locator(`[data-activity="${projectId}"]`).waitFor()
  })
})

test('Activity: review link switches layout and card; dark mode recolours the pills; phone width stacks', { timeout: 180000 }, async () => {
  const { projectId, refs } = await seedOnce()
  const rows = await expectedRows(projectId)
  await withPage({ width: 1280, height: 900 }, async (page) => {
    await openActivity(page, projectId, '?review=1&layout=timeline&card=today')
    await page.locator('[data-activity-review]').waitFor()
    assert.equal(await page.locator(`[data-activity="${projectId}"]`).getAttribute('data-activity-layout'), 'timeline')
    await page.locator('[data-activity-timeline]').waitFor()
    assert.deepEqual(await shownKeys(page), rows.map((row) => row.key), 'the timeline lists the same rows')
    await page.locator('[data-review-choice="layout:table"]').click()
    await page.locator('[data-activity-table]').waitFor()
    await page.locator('[data-project-view="overview"]').click()
    await page.locator('[data-overview-activity="true"]').waitFor()
    await page.locator('[data-review-choice="card:words"]').click()
    await page.locator('[data-overview-activity="words"]').waitFor()

    await page.locator('[data-project-view="activity"]').click()
    const pill = page.locator(`tr[data-activity-row="${rowFor(rows, 'initiative.approved', refs.approved).key}"] .dockyard-status-tag`)
    const colours = () => pill.evaluate((el) => { const style = getComputedStyle(el); return { bg: style.backgroundColor, color: style.color } })
    const light = await colours()
    await page.evaluate(() => document.querySelector('.dockyard-root').setAttribute('data-theme', 'dark'))
    await page.waitForFunction((before) => getComputedStyle(document.querySelector('tr[data-tone="success"] .dockyard-status-tag')).backgroundColor !== before, light.bg)
    const dark = await colours()
    assert.notEqual(dark.bg, light.bg, 'dark mode changes the pill background')
    assert.notEqual(dark.color, light.color, 'dark mode changes the pill text')
  })
  await withPage({ width: 390, height: 844 }, async (page) => {
    await openActivity(page, projectId)
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth), false, 'no sideways scroll')
    assert.equal(await page.locator('tr[data-activity-row]').first().evaluate((el) => getComputedStyle(el).display), 'grid', 'rows stack at phone width')
  })
})
