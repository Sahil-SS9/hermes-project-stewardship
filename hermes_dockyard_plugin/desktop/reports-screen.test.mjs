// C7 Reports end to end through the REAL plugin bundle and REAL backend
// (disposable data), no mocks. Reports are made with the app's own actions:
// the backend's POST for setup and the Generate button on screen. Then:
//   - on arrival the newest report opens as a formatted page: its title, a
//     "type · Generated ..." line, section headings, labelled facts and a
//     real work table, never raw Markdown (#, |, ---); its sections are the
//     ones the type's hint names (report-vocab.js reportSections);
//   - Generate makes a report of the chosen type and opens it at the top of
//     the list; Risk turns the activity box off and says why, and the box
//     comes back as it was; a past report opens from the keyboard; Copy and
//     Download sit on the page;
//   - design review (?review=1&reports=table): the reports sit in a table and
//     a row opens the report in a side panel that Escape closes, with focus
//     back on the row; the bar switches back to side by side;
//   - dark mode recolours the page; at phone width the open report comes
//     before the list and nothing scrolls sideways.
// The suite shares one backend, so nothing here hard-codes a count.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { pickProject, rememberedProject, restoreRememberedProject } from './test-support/project-scope.mjs'
import { reportSections, reportTypeLabel, reportWhen } from './src/lib/report-vocab.js'

const require = createRequire(fileURLToPath(new URL('../dashboard/package.json', import.meta.url)))
const { chromium } = require('playwright')
const BASE = process.env.STEWARD_DESKTOP_URL || 'http://127.0.0.1:19500/desktop'
const API = process.env.STEWARD_API_URL || 'http://127.0.0.1:19500/api/plugins/hermes-dockyard'
const HEADERS = { 'x-hermes-session-token': 'demo-session-token' }
const TZ = 'Europe/London'
const MARKER = { timeout: 20000 }

async function call(path, method = 'GET', body) {
  const response = await fetch(`${API}${path}`, {
    method, headers: { ...HEADERS, 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  if (!response.ok) throw new Error(`${method} ${path} -> ${response.status}: ${(await response.text()).slice(0, 300)}`)
  return response.json()
}

// The first enabled project with work items, and one report of each type
// made through the backend (the full one, with activity, last).
let seeded = null
async function seedOnce() {
  if (seeded) return seeded
  const dashboard = await call('/dashboard')
  let projectId = null
  for (const id of (dashboard.projects ?? []).filter((entry) => entry.enabled !== false).map((entry) => entry.id).sort()) {
    if (((await call(`/projects/${encodeURIComponent(id)}/work-items`)).work_items ?? []).length > 0) { projectId = id; break }
  }
  assert.ok(projectId, 'an enabled project with work items')
  const pid = encodeURIComponent(projectId)
  let newest = null
  for (const [type, activity] of [['risk', true], ['delivery', false], ['executive', true], ['full', true]]) {
    newest = await call(`/projects/${pid}/reports`, 'POST', { report_type: type, include_activity: activity })
  }
  seeded = { projectId, pid, newest }
  return seeded
}
const listed = async (pid) => (await call(`/projects/${pid}/reports`)).reports ?? []
const tableRowsIn = (content) => Math.max(0, content.split('\n').filter((line) => line.startsWith('| ') && !/^\|( --- \|)+$/.test(line)).length - 1)

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

async function openReports(page, projectId, query = '') {
  await page.goto(`${BASE}${query}`)
  await pickProject(page, projectId)
  await page.locator('[data-tab="project"]').click()
  await page.locator(`[data-project-strip="${projectId}"]`).waitFor()
  await page.locator('[data-project-view="reports"]').click()
  await page.locator('[data-project-reports]').waitFor()
}
const historyIds = (page) => page.locator('[data-report-history]').evaluateAll((els) => els.map((el) => el.getAttribute('data-report-history')))
// The open report as the page shows it.
const shownReport = (scope) => scope.locator('[data-report-preview]').evaluate((root) => ({
  title: root.querySelector('h2')?.textContent.trim(),
  meta: root.querySelector('[data-report-meta]')?.textContent.trim(),
  headings: [...root.querySelectorAll('h3')].map((el) => el.textContent.trim()),
  tableHead: [...root.querySelectorAll('table thead th')].map((el) => el.textContent.trim()),
  tableRows: root.querySelectorAll('table tbody tr').length,
  facts: [...root.querySelectorAll('dt')].map((el) => el.textContent.trim()),
  text: root.innerText,
}))

test('Reports: the newest report opens as a formatted page, never raw Markdown', { timeout: 180000 }, async () => {
  const { projectId, pid, newest } = await seedOnce()
  const saved = await call(`/projects/${pid}/reports/${newest.report_id}`)
  await withPage({ width: 1440, height: 900 }, async (page) => {
    await openReports(page, projectId)
    await page.locator('[data-report-layout="side"]').waitFor(MARKER)
    assert.deepEqual(await historyIds(page), (await listed(pid)).map((report) => report.report_id), 'the list is the saved reports, newest first')
    assert.equal((await historyIds(page))[0], newest.report_id)
    await page.locator(`[data-report-history="${newest.report_id}"][aria-current="true"]`).waitFor(MARKER)
    const shown = await shownReport(page.locator('[data-report-pane]'))
    assert.equal(shown.title, saved.title)
    assert.equal(shown.meta, `${reportTypeLabel('full')} · Generated ${reportWhen(saved.generated_at, TZ)} by ${saved.generated_by}`)
    assert.deepEqual(shown.headings, reportSections('full', true), 'exactly the sections the hint names')
    assert.deepEqual(shown.tableHead, ['Ref', 'Work item', 'Status', 'Assignee'])
    assert.equal(shown.tableRows, tableRowsIn(saved.content), 'every work row of the saved report')
    assert.ok(shown.tableRows > 0, 'the project has work, so the table has rows')
    for (const fact of ['Mission', 'Lead', 'Backlog', 'Pending initiatives']) assert.ok(shown.facts.includes(fact), `labelled fact: ${fact}`)
    for (const line of shown.text.split('\n')) assert.doesNotMatch(line.trim(), /^(#{1,6} |\| |- |\|?\s*-{3,})/, `no raw Markdown: ${line}`)
    assert.equal(await page.locator('[data-report-pane] [data-action="download-report"]').isVisible(), true, 'Download on the page')
    assert.equal(await page.locator('[data-report-pane] [data-action="copy-report"]').isVisible(), true, 'Copy on the page')
  })
})

test('Reports: Generate opens the new report first; Risk turns activity off and says why; the keyboard opens a report', { timeout: 180000 }, async () => {
  const { projectId, pid } = await seedOnce()
  await withPage({ width: 1280, height: 900 }, async (page) => {
    await openReports(page, projectId)
    await page.locator('[data-report-layout="side"]').waitFor(MARKER)
    const before = await historyIds(page)
    const box = page.locator('[data-report-activity] input')
    assert.equal(await box.isChecked(), true, 'recent activity is on by default, as before')
    await page.locator('[data-report-type]').selectOption('risk')
    assert.equal(await box.isDisabled(), true, 'Risk reports never include activity')
    assert.equal(await box.isChecked(), false)
    assert.equal((await page.locator('[data-report-hint]').innerText()).trim(), 'Sections: Configuration · Risks and decisions. Risk reports never include recent activity.')
    await page.locator('[data-action="generate-report"]').click()
    await page.waitForFunction((count) => document.querySelectorAll('[data-report-history]').length === count + 1, before.length, MARKER)
    const after = await historyIds(page)
    assert.ok(!before.includes(after[0]), 'the new report is first in the list')
    assert.equal((await listed(pid))[0].report_id, after[0], 'and it is the newest saved report')
    await page.locator(`[data-report-history="${after[0]}"][aria-current="true"]`).waitFor(MARKER)
    const risk = await shownReport(page.locator('[data-report-pane]'))
    assert.deepEqual(risk.headings, reportSections('risk', true))
    assert.deepEqual(risk.tableHead, [], 'a risk report has no work table')
    assert.match(risk.meta, /^Risk and decisions · Generated /)

    await page.locator('[data-report-type]').selectOption('delivery')
    assert.equal(await box.isDisabled(), false)
    assert.equal(await box.isChecked(), true, 'the box comes back as it was')
    assert.equal((await page.locator('[data-report-hint]').innerText()).trim(), 'Sections: Configuration · Delivery, with the work list · Recent activity')

    await page.locator(`[data-report-history="${after[1]}"]`).focus()
    await page.keyboard.press('Enter')
    await page.locator(`[data-report-history="${after[1]}"][aria-current="true"]`).waitFor(MARKER)
  })
})

test('Reports design review: the table layout opens a report in a side panel that Escape closes', { timeout: 180000 }, async () => {
  const { projectId, pid } = await seedOnce()
  const first = (await listed(pid))[0]
  await withPage({ width: 1440, height: 900 }, async (page) => {
    await openReports(page, projectId, '?review=1&reports=table')
    await page.locator('[data-reports-review]').waitFor(MARKER)
    await page.locator('[data-report-layout="table"]').waitFor(MARKER)
    assert.equal(await page.locator('[data-review-choice="reports:table"]').getAttribute('aria-pressed'), 'true')
    assert.equal(await page.locator('[data-report-drawer]').count(), 0, 'nothing opens on arrival')
    assert.deepEqual(await page.locator('[data-report-layout="table"] thead th').evaluateAll((els) => els.map((el) => el.textContent.trim())), ['Report', 'Generated', 'By'])
    const row = page.locator(`[data-report-row="${first.report_id}"]`)
    assert.equal((await row.locator('[data-report-history]').innerText()).trim(), reportTypeLabel(first.report_type))
    await row.locator('[data-report-history]').click()
    const drawer = page.locator('[data-report-drawer]')
    await drawer.waitFor(MARKER)
    assert.equal(await drawer.locator('[role="dialog"]').getAttribute('aria-modal'), 'true')
    await drawer.locator('[data-report-preview] h3').first().waitFor(MARKER)
    const shown = await shownReport(drawer)
    assert.deepEqual(shown.headings, reportSections(first.report_type, first.options?.activity_included !== false))
    await page.keyboard.press('Escape')
    await drawer.waitFor({ state: 'detached' })
    assert.equal(await page.evaluate(() => document.activeElement?.getAttribute('data-report-history')), first.report_id, 'focus is back on the row')
    await page.locator('[data-review-choice="reports:side"]').click()
    await page.locator('[data-report-layout="side"]').waitFor(MARKER)
  })
})

test('Reports: dark mode recolours the page; at phone width the report comes first and nothing scrolls sideways', { timeout: 180000 }, async () => {
  const { projectId, pid } = await seedOnce()
  const withTable = (await listed(pid)).find((report) => report.report_type === 'full')
  await withPage({ width: 1280, height: 900 }, async (page) => {
    await openReports(page, projectId)
    await page.locator('[data-report-layout="side"]').waitFor(MARKER)
    await page.locator(`[data-report-history="${withTable.report_id}"]`).click()
    await page.locator('[data-report-preview] thead th').first().waitFor(MARKER)
    const colours = () => page.evaluate(() => {
      const read = (el) => { const style = getComputedStyle(el); return { bg: style.backgroundColor, color: style.color } }
      return {
        pane: read(document.querySelector('[data-report-pane]')),
        active: read(document.querySelector('[data-report-history][aria-current="true"]')),
        head: read(document.querySelector('[data-report-preview] thead th')),
      }
    })
    const light = await colours()
    await page.evaluate(() => document.querySelector('.dockyard-root').setAttribute('data-theme', 'dark'))
    await page.waitForFunction((before) => getComputedStyle(document.querySelector('[data-report-pane]')).backgroundColor !== before, light.pane.bg)
    const dark = await colours()
    assert.notEqual(dark.pane.bg, light.pane.bg, 'the report page background')
    assert.notEqual(dark.pane.color, light.pane.color, 'the report text')
    assert.notEqual(dark.active.bg, light.active.bg, 'the open report in the list')
    assert.notEqual(dark.head.bg, light.head.bg, 'the work table header')
  })
  await withPage({ width: 390, height: 844 }, async (page) => {
    await openReports(page, projectId)
    await page.locator('[data-report-history][aria-current="true"]').waitFor(MARKER)
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth), false, 'no sideways scroll')
    const tops = await page.evaluate(() => ({
      pane: document.querySelector('[data-report-pane]').getBoundingClientRect().top,
      list: document.querySelector('[data-report-list]').getBoundingClientRect().top,
    }))
    assert.ok(tops.pane < tops.list, `the open report comes before the list (${JSON.stringify(tops)})`)
  })
})
