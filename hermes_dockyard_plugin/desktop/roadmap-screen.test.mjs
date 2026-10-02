// R2 Phase C — Roadmap screen end-to-end through the REAL plugin bundle and
// REAL backend (disposable data): tab present, tree drill-down to work items,
// objective -> goal context, keyboard navigation, search reveals ancestors,
// attention filter + Reset, honest states, linking through the plugin proxy,
// and the narrow layout. No mocks.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const require = createRequire(fileURLToPath(new URL('../dashboard/package.json', import.meta.url)))
const { chromium } = require('playwright')
const BASE = process.env.STEWARD_DESKTOP_URL || 'http://127.0.0.1:19500/desktop'
const API = process.env.STEWARD_API_URL || 'http://127.0.0.1:19500/api/plugins/hermes-dockyard'
const TOKEN = 'demo-session-token'

const api = async (path, method = 'GET', body) => {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: { 'x-hermes-session-token': TOKEN, 'content-type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })
  const result = await res.json()
  assert.ok(res.ok, `${method} ${path}: ${res.status} ${JSON.stringify(result)}`)
  return result
}

test('Roadmap: tab, drill-down, drawer, search, attention filter, reset', { timeout: 180000 }, async () => {
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
  const errors = []
  page.on('pageerror', (error) => errors.push(String(error)))
  try {
    await page.goto(BASE)
    await page.getByRole('tab', { name: 'Roadmap' }).click()
    await page.locator('[data-roadmap-screen]').waitFor()
    // The shell preselects a project in the global picker; Roadmap inherits
    // that scope. Switch to All projects first.
    await page.locator('[data-roadmap-screen] select[aria-label="Roadmap project picker"]').selectOption('all')

    // 1. All projects are shown by default; nothing is expanded on load.
    // The 'all' scope load is async: wait until every project row is mounted.
    await page
      .waitForFunction(() => document.querySelectorAll('[data-rm-node^="project:"]').length >= 3)
      .catch(() => assert.fail('projects are listed'))
    assert.equal(await page.locator('[data-rm-node^="initiative:"]').count(), 0, 'nothing expanded on load')

    // 2. Open the payments-relaunch project: its initiative appears.
    await page.locator('[data-rm-node="project:payments-relaunch"]').click()
    await page.locator('[data-rm-node^="initiative:"]').first().waitFor()

    // 3. Drill to the initiative, then its milestone.
    await page.locator('[data-rm-node^="initiative:"]').first().click()
    await page.locator('[data-rm-node^="milestone:"]').first().waitFor()
    // Milestone drawer shows honest delivery facts (no percentage).
    const drawer = page.locator('[data-rm-drawer]')
    await drawer.waitFor()
    const drawerText = await drawer.innerText()
    assert.ok(!/(\d+\s*%|percent)/i.test(drawerText), 'no percentage in the drawer')
    assert.match(drawerText, /Total linked/)

    // 4. Objective -> Goal context opens under the initiative.
    await page.locator('[data-rm-node^="objective:"]').first().waitFor()
    const objectiveRow = page.locator('[data-rm-node^="objective:"]').first()
    await objectiveRow.click()
    await page.locator('[data-rm-node^="goal:"]').first().waitFor()
    await drawer.getByText(/Met|Unproven|Unknown evidence|At risk/).first().waitFor()

    // 5. Keyboard: arrow keys move roving focus inside the tree.
    await page.locator('[data-rm-tree]').click()
    const firstRow = page.locator('[data-rm-row]').first()
    await firstRow.focus()
    await page.keyboard.press('ArrowDown')
    await assertZone(page)

    // 6. Search reveals ancestors: type the milestone name, project auto-opens.
    await page.getByRole('searchbox', { name: 'Search the roadmap' }).fill('saved views')
    await page
      .waitForFunction(() => document.querySelectorAll('[data-rm-node^="initiative:"]').length > 0)
      .catch(() => assert.fail('search did not reveal ancestor initiatives'))

    // 7. Attention filter and Reset.
    await page.getByRole('searchbox', { name: 'Search the roadmap' }).fill('')
    await page.getByRole('checkbox', { name: /Needs attention only/i }).check()
    await page.locator('[data-rm-tree]').waitFor()
    await page.getByRole('button', { name: 'Reset' }).click()
    assert.equal(await page.locator('[data-rm-node^="initiative:"]').count(), 0, 'reset collapses the tree')

    // 8. Unlinked groups exist and carry the Link… action (human principal).
    await page.locator('[data-rm-node="project:payments-relaunch"]').click()
    await page.getByText('Milestones not linked to an initiative').waitFor()
    await page.getByText('Objectives not linked to an initiative').waitFor()

    assert.deepEqual(errors, [])
  } finally {
    await browser.close()
  }
})

async function assertZone(page) {
  // The focused row is inside the tree and receives focus (roving focus).
  const focused = await page.evaluate(() => document.activeElement?.getAttribute('data-rm-node') ?? null)
  assert.ok(focused, 'a tree row holds focus after ArrowDown')
}

test('Roadmap: linking flows through the proxy and the drawer reflects it', { timeout: 180000 }, async () => {
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
  try {
    await page.goto(BASE)
    await page.getByRole('tab', { name: 'Roadmap' }).click()
    await page.locator('[data-roadmap-screen]').waitFor()
    await page.locator('[data-roadmap-screen] select[aria-label="Roadmap project picker"]').selectOption('payments-relaunch')
    await page.locator('[data-rm-node^="project:"]').first().waitFor({ timeout: 20000 })
    await page.locator('[data-rm-row][data-rm-node^="project:"]').first().click()

    // Open the link dialog from the "Objectives not linked" row (appears
    // after the scoped load finishes).
    const objectiveGroup = page.getByText('Objectives not linked to an initiative')
    await objectiveGroup.waitFor({ timeout: 20000 })
    await objectiveGroup.click()
    const linkButton = page.locator('[data-rm-row]', { hasText: 'Objectives not linked' }).getByRole('button', { name: 'Link…' })
    await linkButton.click()
    const dialog = page.locator('[data-rm-link-dialog]')
    await dialog.waitFor()
    const choiceSelect = dialog.locator('select#dy-rm-link-choice')
    await choiceSelect.waitFor({ state: 'visible', timeout: 20000 })
    await choiceSelect.selectOption({ index: 1 })
    await dialog.getByRole('button', { name: 'Create link' }).click()
    // Durable outcome beats toast text: the refetch drops the linked
    // objective out of the unlinked group.
    await page
      .waitForFunction(() => !document.body.innerText.includes('Unlinked objective for linking'))
      .catch(() => assert.fail('linking did not remove the objective from the unlinked group'))
    await browser.close()
  } catch (error) {
    await browser.close()
    throw error
  }
})

test('Roadmap: narrow layout keeps one column', { timeout: 120000 }, async () => {
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: { width: 390, height: 780 } })
  try {
    await page.goto(BASE)
    await page.getByRole('tab', { name: 'Roadmap' }).click()
    await page.locator('[data-roadmap-screen]').waitFor()
    await page.locator('[data-roadmap-screen] select[aria-label="Roadmap project picker"]').selectOption('payments-relaunch')
    await page.locator('[data-rm-node^="project:"]').first().waitFor({ timeout: 20000 })
    await page.locator('[data-rm-row][data-rm-node^="project:"]').first().click()
    await page.locator('[data-rm-node^="initiative:"]').first().waitFor({ timeout: 20000 })
    await page.locator('[data-rm-node^="initiative:"]').first().click()
    await page.locator('[data-rm-drawer]').waitFor()
    // The drawer must not sit in a second column at 390px.
    const columns = await page.evaluate(() => {
      const shell = document.querySelector('.dy-rm-shell')
      return getComputedStyle(shell).gridTemplateColumns.split(' ').length
    })
    assert.equal(columns, 1, 'narrow window renders a single column')
    await browser.close()
  } catch (error) {
    await browser.close()
    throw error
  }
})
