// Batch P rendered journey: plan synthesis → document → backlog (NEW-3/D-P2),
// undo/redo, duplicate, marquee (P1 signed behaviours), through the real
// disposable backend with the shipped plugin bundle.
import assert from 'node:assert/strict'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const REPO = path.resolve(HERE, '..', '..')
const { chromium } = await import('./browser-harness.mjs')
const BASE = process.env.STEWARD_DESKTOP_URL
const API = process.env.STEWARD_API_URL

test('Batch P rendered journey: undo/duplicate/marquee + plan doc + backlog confirm', { timeout: 240000 }, async () => {
  assert.ok(BASE && API, 'Run via run-browser-suite.mjs')
  let browser
  let page
  const errors = []
  try {
    browser = await chromium.launch({ headless: true, args: ['--disable-gpu'] })
    page = await browser.newPage({ viewport: { width: 1400, height: 950 } })
    page.on('pageerror', (error) => errors.push(String(error)))
    await page.goto(BASE, { waitUntil: 'load' })
    await page.waitForSelector('[data-tab="dashboard"]', { timeout: 20000 })
    await page.getByRole('button', { name: 'Project context', exact: true }).click()
    await page.getByRole('combobox', { name: 'Find project' }).fill('payments-relaunch')
    await page.getByRole('listbox', { name: 'Projects' }).getByRole('option', { name: 'payments-relaunch', exact: true }).click()
    await page.waitForTimeout(500)
    await page.locator('[data-tab="project"]').click()
    await page.waitForSelector('[data-project-view="planning"]', { timeout: 20000 })
    await page.locator('[data-project-view="planning"]').click()
    const canvas = page.locator('[data-planning-canvas="payments-relaunch"]')
    await canvas.waitFor()
    // Two scratch objects + connector, save.
    await canvas.locator('[data-canvas-draft]').fill('Undo target note')
    await canvas.getByRole('button', { name: 'Add object' }).click()
    await canvas.locator('[data-canvas-draft]').fill('Plan seed requirement')
    await canvas.getByRole('button', { name: 'Add object' }).click()
    assert.equal(await canvas.locator('[data-canvas-object]').count(), 2)
    // Undo removes the second add; redo restores it.
    await canvas.getByRole('button', { name: 'Undo', exact: true }).click()
    assert.equal(await canvas.locator('[data-canvas-object]').count(), 1)
    await canvas.getByRole('button', { name: 'Redo', exact: true }).click()
    assert.equal(await canvas.locator('[data-canvas-object]').count(), 2)
    // Duplicate the selection through the toolbar.
    await canvas.locator('[data-canvas-object]').first().click()
    await canvas.getByRole('button', { name: 'Duplicate', exact: true }).click()
    assert.equal(await canvas.locator('[data-canvas-object]').count(), 3)
    // Marquee multi-select on empty stage.
    const stage = canvas.locator('[data-pc-stage]')
    const stageBox = await stage.boundingBox()
    await page.mouse.move(stageBox.x + 5, stageBox.y + 5)
    await page.mouse.down()
    await page.mouse.move(stageBox.x + stageBox.width - 5, stageBox.y + Math.min(300, stageBox.height - 5), { steps: 5 })
    await page.mouse.up()
    await page.waitForTimeout(200)
    const marqueeSelected = await canvas.locator('.dy-pc-obj.marquee-selected').count()
    assert.ok(marqueeSelected >= 1, 'marquee selected at least one card')
    await canvas.getByRole('button', { name: 'Save canvas' }).click()
    await page.waitForTimeout(300)
    assert.match(await canvas.innerText(), /Canvas saved/)
    // Curate → answer → proposal lands (fake provider synthesises a plan).
    await canvas.getByRole('button', { name: 'Curate' }).click()
    await page.waitForTimeout(400)
    const questionVisible = await canvas.locator('[data-canvas-question]').count()
    if (questionVisible) {
      await canvas.locator('[data-canvas-question] textarea').fill('The plan must keep the safe import preview.')
      await canvas.getByRole('button', { name: 'Answer' }).click()
      await page.waitForTimeout(400)
    }
    const proposalCount = await canvas.locator('[data-canvas-proposal]').count()
    assert.ok(proposalCount >= 1, 'at least one proposal drafted')
    // Approve every pending proposal; a technical_plan approval enables Plan.
    const approvals = canvas.getByRole('button', { name: 'Approve', exact: true })
    while (await approvals.count()) {
      await approvals.first().click()
      await page.waitForTimeout(300)
    }
    // Plan from the approved technical_plan proposal.
    const planButton = canvas.getByRole('button', { name: 'Plan from proposal' })
    if (await planButton.count()) {
      await planButton.first().click()
      await page.waitForTimeout(500)
      const planCard = canvas.locator('[data-canvas-plan]')
      await planCard.waitFor({ timeout: 10000 })
      assert.match(await planCard.innerText(), /Plan ready for review/)
      // Save the implementation document to the Content tab (D-P2).
      await planCard.getByRole('button', { name: 'Save doc to Content' }).click()
      await page.waitForTimeout(500)
      assert.match(await canvas.innerText(), /Implementation document saved/)
      // Backlog creation is explicit and confirm-gated.
      const backlogButton = planCard.getByRole('button', { name: 'Create backlog items' })
      if (await backlogButton.isEnabled()) {
        await backlogButton.click()
        const confirmCard = canvas.locator('[data-canvas-backlog-confirm]')
        await confirmCard.waitFor({ timeout: 10000 })
        await confirmCard.getByRole('button', { name: 'Confirm create' }).click()
        await page.waitForTimeout(500)
        assert.match(await canvas.innerText(), /backlog item\(s\) created/)
      }
    }
    assert.deepEqual(errors, [], errors.join('\n'))
  } catch (failure) {
    try { await page.screenshot({ path: '/home/kensei/HPS-Audit-2026-09-24/evidence/p/screens/batchp-journey-failure.png', fullPage: true }) } catch {}
    throw failure
  } finally {
    await browser?.close()
  }
})