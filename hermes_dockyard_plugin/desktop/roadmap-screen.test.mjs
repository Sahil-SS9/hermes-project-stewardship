// R2 Phase C — Roadmap screen end-to-end through the REAL plugin bundle and
// REAL backend (disposable data): tab present, all projects by default, tree
// drill-down to work items, objective -> goal context with the read-only goal
// contract, Open jumps to the item's own screen, keyboard navigation, search
// reveals ancestors, attention filter + Reset, the two-step Link… flow with
// an explicit initiative choice, the right project in All-projects scope, and
// the narrow layout. No mocks.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const require = createRequire(fileURLToPath(new URL('../dashboard/package.json', import.meta.url)))
const { chromium } = require('playwright')
const BASE = process.env.STEWARD_DESKTOP_URL || 'http://127.0.0.1:19500/desktop'

const projectRow = (page, id) => page.locator(`[data-rm-node="project:${id}"]`)
const firstOf = (page, prefix) => page.locator(`[data-rm-node^="${prefix}:"]`).first()

async function openRoadmap(page) {
  await page.goto(BASE)
  await page.getByRole('tab', { name: 'Roadmap' }).click()
  await page.locator('[data-roadmap-screen]').waitFor()
  await page
    .waitForFunction(() => document.querySelectorAll('[data-rm-node^="project:"]').length >= 2)
    .catch(() => assert.fail('the Roadmap lists projects'))
}

test('Roadmap: all projects by default, drill-down, drawer, contract, Open, keyboard, search, reset', { timeout: 180000 }, async () => {
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
  const errors = []
  page.on('pageerror', (error) => errors.push(String(error)))
  try {
    await openRoadmap(page)

    // 1. Signed default: All projects, whatever the global picker holds; nothing expanded.
    assert.equal(await page.locator('[data-roadmap-screen] select[aria-label="Roadmap project picker"]').inputValue(), 'all')
    assert.equal(await page.locator('.dy-rm-tree-head strong').innerText(), 'All projects')
    assert.equal(await page.locator('[data-rm-node^="initiative:"]').count(), 0, 'nothing expanded on load')

    // 2. Open payments-relaunch: its initiative appears; the drawer shows the project.
    await projectRow(page, 'payments-relaunch').click()
    await firstOf(page, 'initiative').waitFor()
    const drawer = page.locator('[data-rm-drawer]')
    await page.locator('[data-rm-drawer="project"]').waitFor()

    // 3. Initiative, then its milestone: honest delivery facts, no percentage.
    await firstOf(page, 'initiative').click()
    await firstOf(page, 'milestone').click()
    await page.locator('[data-rm-drawer="milestone"]').waitFor()
    const drawerText = await drawer.innerText()
    assert.ok(!/(\d+\s*%|percent)/i.test(drawerText), 'no percentage in the drawer')
    assert.match(drawerText, /No linked work|Total linked/)

    // 4. Objective -> Goal: the goal drawer shows the read-only contract,
    //    loaded from the goal's own project (All-projects scope).
    await firstOf(page, 'objective').click()
    await firstOf(page, 'goal').click()
    await page.locator('[data-rm-drawer="goal"]').waitFor()
    await drawer.getByText('Verification').waitFor()
    await drawer.getByText('suite green').waitFor()
    await drawer.getByText('no downtime').waitFor()
    await drawer.getByText('Copied from the goal title').waitFor()
    assert.equal(await drawer.getByRole('textbox').count(), 0, 'the contract is read-only')

    // 5. Keyboard: one roving tab stop; arrows move it; Left goes to the parent.
    assert.equal(await page.locator('[data-rm-tree] [data-rm-row][tabindex="0"]').count(), 1, 'exactly one row is in the tab order')
    await projectRow(page, 'payments-relaunch').focus()
    await page.keyboard.press('ArrowDown')
    const focused = await page.evaluate(() => document.activeElement?.getAttribute('data-rm-node') ?? '')
    assert.match(focused, /^initiative:/, 'ArrowDown moves to the first child')
    await page.keyboard.press('ArrowLeft')
    await page.keyboard.press('ArrowLeft')
    assert.equal(await page.evaluate(() => document.activeElement?.getAttribute('data-rm-node')), 'project:payments-relaunch', 'Left closes, then moves to the parent')
    assert.equal(await page.locator('[data-rm-tree] [data-rm-row][tabindex="0"]').count(), 1, 'still one tab stop')

    // 6. Search reveals ancestors: a milestone name opens its project and initiative.
    await page.getByRole('button', { name: 'Reset' }).click()
    await page.getByRole('searchbox', { name: 'Search the roadmap' }).fill('pilot release')
    await page
      .waitForFunction(() => document.querySelectorAll('[data-rm-node^="milestone:"]').length > 0)
      .catch(() => assert.fail('search did not reveal the milestone ancestors'))

    // 7. Attention filter and Reset.
    await page.getByRole('searchbox', { name: 'Search the roadmap' }).fill('')
    await page.getByRole('checkbox', { name: /Needs attention only/i }).check()
    await page.getByRole('button', { name: 'Reset' }).click()
    assert.equal(await page.locator('[data-rm-node^="initiative:"]').count(), 0, 'reset collapses the tree')
    assert.equal(await page.getByRole('checkbox', { name: /Needs attention only/i }).isChecked(), false)

    // 8. Open jumps to the item's own screen: the initiative opens Project > Initiatives.
    await projectRow(page, 'payments-relaunch').click()
    await firstOf(page, 'initiative').click()
    await page.locator('[data-rm-drawer="initiative"]').waitFor()
    await page.locator('[data-action="roadmap-open"]').click()
    await page.locator('[data-project-view="initiative"][aria-pressed="true"]').waitFor()

    assert.deepEqual(errors, [])
  } finally {
    await browser.close()
  }
})

test('Roadmap: View in Roadmap opens that project; the global picker re-scopes', { timeout: 120000 }, async () => {
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
  try {
    await page.goto(BASE)
    await page.getByRole('tab', { name: /^Project/ }).click()
    await page.locator('[data-roadmap-link] a').click()
    await page.locator('[data-roadmap-screen]').waitFor()
    const picker = page.locator('[data-roadmap-screen] select[aria-label="Roadmap project picker"]')
    await page.waitForFunction(() => document.querySelector('[data-roadmap-screen] select[aria-label="Roadmap project picker"]')?.value !== 'all')
    const scoped = await picker.inputValue()
    assert.equal(await page.locator('[data-rm-node^="project:"]').count(), 1, 'one project in scope')
    assert.equal(await page.locator('[data-rm-node^="project:"]').getAttribute('data-rm-node'), `project:${scoped}`)
    // Reset returns to All projects.
    await page.getByRole('button', { name: 'Reset' }).click()
    await page.waitForFunction(() => document.querySelectorAll('[data-rm-node^="project:"]').length >= 2)
    assert.equal(await picker.inputValue(), 'all')
  } finally {
    await browser.close()
  }
})

test('Roadmap: Link… asks for the initiative, confirms, then links in the row’s own project', { timeout: 180000 }, async () => {
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
  try {
    // All-projects scope on purpose: the dialog must act on the row's project,
    // never on whichever project happens to be listed first.
    await openRoadmap(page)
    await projectRow(page, 'payments-relaunch').click()
    const group = page.locator('[data-rm-node="unlinked-objectives:payments-relaunch"]')
    await group.waitFor()
    await group.getByRole('button', { name: 'Link…' }).click()
    const dialog = page.locator('[data-rm-link-dialog]')
    await dialog.locator('select#dy-rm-link-choice').waitFor()
    assert.match(await dialog.innerText(), /Project payments-relaunch/)
    const create = dialog.getByRole('button', { name: 'Continue' })
    assert.equal(await create.isDisabled(), true, 'nothing is chosen for the human')
    await dialog.locator('select#dy-rm-link-choice').selectOption({ label: 'Unlinked objective for linking' })
    assert.equal(await create.isDisabled(), true, 'the initiative must be chosen too')
    await dialog.locator('select#dy-rm-link-initiative').selectOption({ index: 1 })
    await create.click()
    // Confirm step names both ends before anything is written.
    await dialog.locator('[data-rm-link-confirm]').getByText('Unlinked objective for linking', { exact: false }).waitFor()
    await dialog.getByRole('button', { name: 'Create link' }).click()
    await page
      .waitForFunction(() => !document.querySelector('[data-rm-node="unlinked-objectives:payments-relaunch"]')?.innerText.includes('Unlinked objective for linking'))
      .catch(() => assert.fail('linking did not remove the objective from the unlinked group'))
  } finally {
    await browser.close()
  }
})

test('Roadmap: narrow layout keeps one column and keeps Link… reachable', { timeout: 120000 }, async () => {
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: { width: 390, height: 780 } })
  try {
    await openRoadmap(page)
    await projectRow(page, 'payments-relaunch').click()
    await firstOf(page, 'initiative').click()
    await page.locator('[data-rm-drawer]').waitFor()
    const columns = await page.evaluate(() => getComputedStyle(document.querySelector('.dy-rm-shell')).gridTemplateColumns.split(' ').length)
    assert.equal(columns, 1, 'narrow window renders a single column')
    const link = page.locator('[data-rm-node="unlinked-milestones:payments-relaunch"]').getByRole('button', { name: 'Link…' })
    assert.equal(await link.isVisible(), true, 'the narrow layout hides chips, never the Link… action')
  } finally {
    await browser.close()
  }
})
