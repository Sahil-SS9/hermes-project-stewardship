// Sahil 05/10 (design round d + h): the global "Onboard" tab becomes a
// secondary button, "Onboard existing project", beside New project, and the
// project switcher's menu offers it too, after New project. Both open the
// same onboarding wizard. Sahil also chose switcher direction A (breadcrumb),
// so the prototype's B/C directions and Design review bar are gone.
// End-to-end through the REAL plugin bundle and backend. Nothing is created:
// every wizard is closed before its first step is filled in.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { chromium } from './browser-harness.mjs'

const BASE = process.env.STEWARD_DESKTOP_URL

const wizard = (page) => page.locator('[data-onboarding-wizard]')
const focusedName = (page) => page.evaluate(() => document.activeElement?.getAttribute('aria-label') ?? document.activeElement?.textContent?.trim())
const fieldLabels = (page) => wizard(page).locator('label').evaluateAll((nodes) => nodes.map((node) => node.textContent.trim()))

async function expectWizard(page, intent) {
  await wizard(page).waitFor()
  assert.equal(await wizard(page).getAttribute('data-onboarding-intent'), intent)
  assert.equal(await wizard(page).locator('.dockyard-onboarding-head .dockyard-card-label').innerText(), intent === 'existing' ? 'EXISTING PROJECT' : 'NEW PROJECT')
  assert.equal(await page.getByRole('heading', { name: 'Bring a project into Dockyard' }).count(), 1)
  return fieldLabels(page)
}

test('Onboard existing project: a secondary button beside New project, and in the switcher after New project; both open the wizard', async () => {
  assert.ok(BASE, 'Run via run-browser-suite.mjs')
  const browser = await chromium.launch({ headless: true })
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
    page.setDefaultTimeout(10000)
    const errors = []
    page.on('pageerror', (error) => errors.push(String(error)))
    page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()) })
    await page.goto(BASE, { waitUntil: 'networkidle' })

    // The top bar: no Onboard tab; New project (primary) then Onboard existing project (secondary).
    assert.deepEqual(await page.locator('[role="tablist"] [role="tab"]').evaluateAll((nodes) => nodes.map((node) => node.getAttribute('data-tab'))),
      ['dashboard', 'project', 'roadmap', 'backlog', 'workflows', 'inbox', 'notifications', 'settings'])
    assert.equal(await page.getByRole('tab', { name: /^Onboard/ }).count(), 0, 'the Onboard tab is gone')
    const actions = page.locator('.dockyard-console-actions > button')
    assert.deepEqual(await actions.evaluateAll((nodes) => nodes.map((node) => [node.getAttribute('aria-label'), node.innerText.trim(), node.classList.contains('primary')])),
      [['New project', 'New project', true], ['Onboard existing project', 'Onboard existing project', false]])

    // Onboard existing project opens the wizard; Escape closes it and focus goes back to the button.
    await page.getByRole('button', { name: 'Onboard existing project', exact: true }).click()
    const existingFields = await expectWizard(page, 'existing')
    await page.keyboard.press('Escape')
    await wizard(page).waitFor({ state: 'detached' })
    assert.equal(await focusedName(page), 'Onboard existing project')

    // New project opens the same wizard: the same steps and fields, only the label differs.
    await page.getByRole('button', { name: 'New project', exact: true }).click()
    assert.deepEqual(await expectWizard(page, 'new'), existingFields)
    assert.ok(existingFields.length > 0, 'the wizard shows its first step')
    await page.getByRole('button', { name: 'Close onboarding' }).click()
    await wizard(page).waitFor({ state: 'detached' })

    // The switcher's menu: the projects, then New project, then Onboard existing project.
    const trigger = page.getByRole('button', { name: 'Project context', exact: true })
    await trigger.click()
    const popover = page.getByRole('dialog', { name: 'Switch project' })
    await popover.waitFor()
    assert.deepEqual(await popover.locator('.dy-sw-foot button').evaluateAll((nodes) => nodes.map((node) => node.innerText.trim())),
      ['New project', 'Onboard existing project'])
    assert.ok(await popover.evaluate((root) => {
      const list = root.querySelector('[role="listbox"]')
      const foot = root.querySelector('.dy-sw-foot')
      return Boolean(list && foot && (list.compareDocumentPosition(foot) & Node.DOCUMENT_POSITION_FOLLOWING))
    }), 'the two actions come after the project list')

    await popover.getByRole('button', { name: 'Onboard existing project', exact: true }).click()
    await popover.waitFor({ state: 'detached' })
    await expectWizard(page, 'existing')
    await page.keyboard.press('Escape')
    await wizard(page).waitFor({ state: 'detached' })
    assert.equal(await focusedName(page), 'Project context', 'focus returns to the switcher')

    await trigger.click()
    await popover.getByRole('button', { name: 'New project', exact: true }).click()
    await expectWizard(page, 'new')
    await page.keyboard.press('Escape')
    await wizard(page).waitFor({ state: 'detached' })

    // Narrow: both buttons stay, icon-only, with their names as labels and tooltips.
    await page.setViewportSize({ width: 700, height: 900 })
    for (const name of ['New project', 'Onboard existing project']) {
      const button = page.getByRole('button', { name, exact: true }).first()
      assert.ok(await button.isVisible(), `${name} is visible when narrow`)
      assert.equal(await button.getAttribute('title'), name)
      assert.equal(await button.locator('.dockyard-console-action-label').isVisible(), false, `${name} shows its icon only`)
    }
    assert.deepEqual(errors, [])
  } finally {
    await browser.close()
  }
})

test('Switcher A only: the prototype directions and Design review bar are gone', async () => {
  assert.ok(BASE, 'Run via run-browser-suite.mjs')
  const browser = await chromium.launch({ headless: true })
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
    page.setDefaultTimeout(10000)
    // The review links the prototype answered to now change nothing.
    await page.goto(`${BASE}?switcher=c&review=1`, { waitUntil: 'networkidle' })
    await page.getByRole('button', { name: 'Project context', exact: true }).waitFor()
    assert.equal(await page.locator('.dy-sw-slash').count(), 1, 'the breadcrumb')
    for (const gone of ['.dy-review-bar', '[data-switcher-variant]', '.dy-sw-strip', '.dy-sw-chip', '.dy-sw-kbd']) {
      assert.equal(await page.locator(gone).count(), 0, `${gone} is gone`)
    }
    // Direction B's Ctrl+J palette is gone too.
    await page.keyboard.press('Control+j')
    assert.equal(await page.locator('.dy-sw-palette-layer, .dy-sw-palette').count(), 0)
  } finally {
    await browser.close()
  }
})
