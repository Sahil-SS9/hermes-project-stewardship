// A project Hermes does not know ("unlinked") must never take a view down.
//
// Found on Sahil's live app (10/10/2026): two stewardship projects have no
// Hermes project behind them. f2a07d1/6b52f44 kept the fleet pages up, but
// picking one of them still showed "404 canonical project was not found" on
// Projects, Workflows and Backlog; the Dashboard tagged the missing link
// "Blocked" with an "Open work item" button and sorted it mid-table; and the
// project's own status strip said "On track".
//
// The practice backend makes projects genuinely unlinked (PUT
// /fixture/unlinked/<id>): every route then answers as it did live, the reads
// a test names and the ones it doesn't. Each test re-links what it unlinked,
// so the rest of the suite sees nothing.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { chromium } from './browser-harness.mjs'

const BASE = process.env.STEWARD_DESKTOP_URL
const API = process.env.STEWARD_API_URL
const GHOST = 'payments-relaunch'
const FIXTURE_PROJECTS = ['payments-relaunch', 'mobile-client', 'atlas-mobile', 'legacy-integration']
const ERROR_CARD = 'Project Stewardship could not load this view'
const NOTICE = 'Not linked to a Hermes project'
const NEXT_STEP = (id) => `Create a Hermes project with the slug "${id}" to link it.`
const PROJECT_VIEWS = ['Overview', 'Vision', 'Kanban', 'Planning', 'Workflows', 'Content', 'Memory', 'Activity', 'Reports', 'Settings']
// Words that only a failed load would put on screen.
const FAILURE = /canonical|could not|couldn't|unavailable|\b(404|500|503)\b|internal server error/i

async function setLinked(ids, linked) {
  const origin = new URL(BASE).origin
  for (const id of ids) {
    const response = await fetch(`${origin}/fixture/unlinked/${encodeURIComponent(id)}`, { method: linked ? 'DELETE' : 'PUT' })
    assert.ok(response.ok, `fixture ${linked ? 're-link' : 'unlink'} ${id} -> ${response.status}`)
  }
}

// The suite preload forgets the remembered project once per file; each test
// here needs that starting point, so it forgets it again.
async function forgetScope() {
  const response = await fetch(`${API}/settings/last-project`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json', 'x-hermes-session-token': 'demo-session-token' },
    body: JSON.stringify({ project_id: null }),
  })
  assert.ok(response.ok, `PUT /settings/last-project -> ${response.status}`)
}

async function withUnlinked(ids, body) {
  assert.ok(BASE && API, 'Run via run-browser-suite.mjs')
  await forgetScope()
  await setLinked(ids, false)
  const browser = await chromium.launch({ headless: true })
  try {
    const page = await browser.newPage()
    page.setDefaultTimeout(8000)
    trackRequests(page)
    await body(page)
  } finally {
    await browser.close()
    await setLinked(ids, true)
  }
}

// Wait until no request has been in flight for a moment. (waitForLoadState
// ('networkidle') returns at once after the first load, so it cannot tell
// that a tab's own reads have finished.)
function trackRequests(page) {
  let inflight = 0
  let last = Date.now()
  page.on('request', () => { inflight += 1; last = Date.now() })
  const done = () => { inflight = Math.max(0, inflight - 1); last = Date.now() }
  page.on('requestfinished', done)
  page.on('requestfailed', done)
  page.quiet = async (idleMs = 400, maxMs = 8000) => {
    const start = Date.now()
    while (Date.now() - start < maxMs) {
      if (inflight === 0 && Date.now() - last >= idleMs) return
      await new Promise((resolve) => setTimeout(resolve, 50))
    }
    throw new Error(`requests never settled (${inflight} still in flight)`)
  }
}

async function settle(page) {
  await page.quiet()
}

// Nothing on screen may read as a failed load: no error card, no alert that
// names a failure. (The unlinked notice is role="status", not an alert.)
async function assertNoFailure(page, where) {
  assert.equal(await page.getByRole('heading', { name: ERROR_CARD }).count(), 0, `${where}: error card`)
  const alerts = await page.locator('[role="alert"]').allInnerTexts()
  const failed = alerts.filter((text) => FAILURE.test(text))
  assert.deepEqual(failed, [], `${where}: failure shown`)
}

async function assertNotice(page, id, where) {
  const notice = page.locator(`[data-unlinked-notice="${id}"]`).first()
  await notice.waitFor()
  const text = await notice.innerText()
  assert.match(text, new RegExp(NOTICE), `${where}: notice title`)
  assert.ok(text.includes(NEXT_STEP(id)), `${where}: notice says how to link it (got: ${text})`)
}

async function openTab(page, name) {
  await page.getByRole('tab', { name, exact: true }).click()
}

async function chooseProject(page, screen, id) {
  await page.locator(`[data-project-chooser="${screen}"] [data-choose-project="${id}"]`).click()
}

test('every view of an unlinked project explains the missing link instead of failing', async () => {
  await withUnlinked([GHOST], async (page) => {
    await page.goto(BASE)
    await page.locator('section[aria-label="Fleet summary"]').waitFor()
    await openTab(page, 'Projects')
    await chooseProject(page, 'Projects', GHOST)
    await page.locator(`[data-project-dashboard="${GHOST}"]`).waitFor()
    await settle(page)
    await assertNoFailure(page, 'Projects')
    await assertNotice(page, GHOST, 'Projects')
    // The project's own status strip: the missing link, never "On track".
    const strip = page.locator('[data-attention-state]').first()
    assert.equal(await strip.getAttribute('data-attention-state'), 'unlinked')
    assert.equal(await strip.locator('strong').first().innerText(), 'Not linked')
    const views = page.getByRole('navigation', { name: 'Project views' })
    for (const view of PROJECT_VIEWS) {
      const button = views.getByRole('button', { name: view, exact: true })
      await button.click()
      await settle(page)
      assert.match(await button.getAttribute('class') ?? '', /\bactive\b/, `Projects > ${view} did not open`)
      await assertNoFailure(page, `Projects > ${view}`)
    }
    await openTab(page, 'Backlog')
    await settle(page)
    await assertNoFailure(page, 'Backlog')
    await assertNotice(page, GHOST, 'Backlog')
    // Work cannot be created in a project Hermes does not know.
    assert.equal(await page.locator('[data-action="open-create-backlog-item"]').isDisabled(), true)
    assert.equal(await page.locator('[data-action="open-bulk-import"]').isDisabled(), true)
    await openTab(page, 'Workflows')
    await page.locator('[data-workflow-library-screen]').waitFor()
    await settle(page)
    await assertNoFailure(page, 'Workflows')
    await openTab(page, 'Roadmap')
    await page.locator('[data-roadmap-screen]').waitFor()
    await settle(page)
    await assertNoFailure(page, 'Roadmap')
  })
})

test('the Dashboard calls a missing link "Not linked", lists it near the top and can filter to it', async () => {
  await withUnlinked([GHOST], async (page) => {
    await page.goto(BASE)
    await page.locator('section[aria-label="Fleet summary"]').waitFor()
    await settle(page)
    // Needs you now: the right tag and impact, and an Open that goes to the project.
    const row = page.getByRole('button', { name: `Inspect ${NOTICE}`, exact: true })
    await row.waitFor()
    assert.equal(await row.locator('.dockyard-command-type').innerText(), 'Not linked')
    assert.ok(!(await row.innerText()).includes('Work blocked'), 'a missing link is not blocked work')
    // Every other row is tagged by its own cause: nothing but blocked work says "Blocked".
    const rows = page.locator('#dy-needs-you-now .dockyard-command-attention-row')
    for (let index = 0; index < await rows.count(); index += 1) {
      const tag = await rows.nth(index).locator('.dockyard-command-type').innerText()
      const label = await rows.nth(index).getAttribute('aria-label')
      if (tag === 'Blocked') assert.ok(!/Not linked|overdue|evidence/i.test(label), `${label} tagged Blocked`)
    }
    await row.click()
    const open = page.locator('aside[aria-label="Selected item details"] .dockyard-button.primary')
    assert.equal(await open.innerText(), 'Open project')
    // Fleet health: its own state, near the top of the table, in the bar and legend.
    const healthRows = page.locator('[data-project-row]')
    const order = await healthRows.evaluateAll((nodes) => nodes.map((node) => [node.getAttribute('data-project-row'), node.querySelector('.dockyard-command-health')?.className ?? '']))
    const ghostAt = order.findIndex(([id]) => id === GHOST)
    assert.ok(ghostAt >= 0, `no health row for ${GHOST}: ${JSON.stringify(order)}`)
    assert.match(order[ghostAt][1], /\bunlinked\b/)
    const healthyFirst = order.findIndex(([, cls]) => /\b(on_track|idle)\b/.test(cls))
    assert.ok(healthyFirst === -1 || ghostAt < healthyFirst, `unlinked sorted below healthy rows: ${JSON.stringify(order)}`)
    const ghostRow = page.locator(`[data-project-row="${GHOST}"]`)
    assert.equal(await ghostRow.locator('.dockyard-command-health').innerText(), 'Not linked')
    // Hermes never said there was no work or no blocker: do not claim it.
    assert.doesNotMatch(await ghostRow.innerText(), /No work items|No open blockers/)
    assert.match(await page.locator('.dockyard-command-health-track').getAttribute('aria-label'), /1 not linked/)
    await page.locator('.dockyard-command-health-legend').getByText('Not linked', { exact: true }).waitFor()
    assert.equal(await page.locator('.dockyard-health-segment.unlinked').count(), 1)
    // All issues: a filter of its own.
    await page.getByRole('button', { name: 'View all issues' }).click()
    const filter = page.getByRole('group', { name: 'Filter issues' }).getByRole('button', { name: 'Not linked (1)' })
    await filter.click()
    const listed = page.locator('.dockyard-command-directory-list .dockyard-command-attention-row')
    assert.equal(await listed.count(), 1)
    assert.equal(await listed.first().locator('.dockyard-command-type').innerText(), 'Not linked')
    // Open goes to the project, which explains the link.
    await listed.first().click()
    await page.locator(`[data-project-dashboard="${GHOST}"]`).waitFor()
    await assertNotice(page, GHOST, 'Dashboard > Open')
  })
})

test('with every project unlinked, as on the live app, every tab still loads', async () => {
  await withUnlinked(FIXTURE_PROJECTS, async (page) => {
    await page.goto(BASE)
    await page.locator('section[aria-label="Fleet summary"]').waitFor()
    await settle(page)
    await assertNoFailure(page, 'Dashboard')
    // Bot teams reads the first project's team, which Hermes does not know.
    await page.getByRole('button', { name: 'Bot teams' }).click()
    await page.locator('[data-bot-teams]').waitFor()
    await settle(page)
    await assertNoFailure(page, 'Bot teams')
    await assertNotice(page, await page.locator('[data-unlinked-notice]').first().getAttribute('data-unlinked-notice'), 'Bot teams')
    for (const [tab, ready] of [['Projects', '[data-project-chooser="Projects"]'], ['Backlog', '[data-project-chooser="Backlog"]'],
      ['Workflows', '[data-workflow-library-screen]'], ['Roadmap', '[data-roadmap-screen]']]) {
      await openTab(page, tab)
      await page.locator(ready).waitFor()
      await settle(page)
      await assertNoFailure(page, tab)
    }
    await openTab(page, 'Projects')
    await chooseProject(page, 'Projects', 'atlas-mobile')
    await page.locator('[data-project-dashboard="atlas-mobile"]').waitFor()
    await settle(page)
    await assertNoFailure(page, 'Projects > atlas-mobile')
    await assertNotice(page, 'atlas-mobile', 'Projects > atlas-mobile')
    // Approval Inbox and Notifications carry a count in their names.
    for (const tab of ['Backlog', 'Workflows', /^Approval Inbox/, /^Notifications/]) {
      await (typeof tab === 'string' ? openTab(page, tab) : page.getByRole('tab', { name: tab }).click())
      await settle(page)
      await assertNoFailure(page, tab)
    }
  })
})

test('an action that needs Hermes says the project is not linked, in words', async () => {
  await withUnlinked([GHOST], async (page) => {
    await page.goto(BASE)
    await openTab(page, 'Projects')
    await chooseProject(page, 'Projects', GHOST)
    await page.locator(`[data-project-dashboard="${GHOST}"]`).waitFor()
    await page.getByRole('navigation', { name: 'Project views' }).getByRole('button', { name: 'Reports', exact: true }).click()
    await page.locator('[data-action="generate-report"]').click()
    const toast = page.locator('[data-toast-region]')
    await page.waitForFunction(() => (document.querySelector('[data-toast-region]')?.textContent ?? '').trim().length > 0)
    const said = await toast.innerText()
    assert.match(said, new RegExp(NOTICE), `the toast said: ${said}`)
    assert.ok(said.includes(NEXT_STEP(GHOST)) || said.includes('to link it'), `the toast says how to link it: ${said}`)
    assert.doesNotMatch(said, /canonical|\b(404|500)\b|could not confirm/i)
  })
})
