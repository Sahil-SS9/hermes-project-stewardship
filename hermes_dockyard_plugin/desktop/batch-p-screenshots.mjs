// Batch P acceptance screenshots: the planning canvas, populated end-to-end
// (board -> clarify -> plan -> doc), captured at 1440 / 1024 / 390 x light / dark.
// Mirrors the proven journey UI path (batch-p-plan-journey.test.mjs) so the canvas
// is in the same plan-ready state the owner will sign off on.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {chromium} from './browser-harness.mjs';

const BASE = process.env.STEWARD_DESKTOP_URL;
const API = process.env.STEWARD_API_URL;
const OUT = '/home/kensei/HPS-Audit-2026-09-24/evidence/p/screens';

test('Batch P planning acceptance screenshots (3 widths x 2 themes)', {timeout: 300000}, async () => {
  assert.ok(BASE && API, 'Run via run-browser-suite.mjs');
  const browser = await chromium.launch({headless: true});
  const page = await browser.newPage({viewport: {width: 1440, height: 950}});
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  try {
    await page.goto(BASE, {waitUntil: 'load'});
    await page.waitForSelector('[data-tab="dashboard"]', {timeout: 20000});
    await page.getByRole('button', {name: 'Project context', exact: true}).click();
    await page.getByRole('combobox', {name: 'Find project'}).fill('payments-relaunch');
    await page.getByRole('listbox', {name: 'Projects'}).getByRole('option', {name: 'payments-relaunch', exact: true}).click();
    await page.waitForTimeout(500);
    await page.locator('[data-tab="project"]').click();
    await page.waitForSelector('[data-project-view="planning"]', {timeout: 20000});
    await page.locator('[data-project-view="planning"]').click();
    const canvas = page.locator('[data-planning-canvas="payments-relaunch"]');
    await canvas.waitFor();

    // seed objects + save so the board is not empty
    for (const text of ['Payments API spec signed off', 'Staged rollout with feature flag', 'Rollback window question', 'Decision: use a canary lane']) {
      await canvas.locator('[data-canvas-draft]').fill(text);
      await canvas.getByRole('button', {name: 'Add object'}).click();
    }
    await canvas.getByRole('button', {name: 'Save canvas'}).click();
    await page.waitForTimeout(300);

    // curate -> answer -> proposals -> approve -> plan -> doc (the journey path)
    await canvas.getByRole('button', {name: 'Curate'}).click();
    await page.waitForTimeout(400);
    if (await canvas.locator('[data-canvas-question]').count()) {
      await canvas.locator('[data-canvas-question] textarea').fill('safe preview evidence');
      await canvas.getByRole('button', {name: 'Answer'}).click();
      await page.waitForTimeout(400);
    }
    const approvals = canvas.getByRole('button', {name: 'Approve', exact: true});
    while (await approvals.count()) {
      await approvals.first().click();
      await page.waitForTimeout(300);
    }
    const planButton = canvas.getByRole('button', {name: 'Plan from proposal'});
    if (await planButton.count()) {
      await planButton.first().click();
      await canvas.locator('[data-canvas-plan]').waitFor({timeout: 10000});
      await canvas.locator('[data-canvas-plan]').getByRole('button', {name: 'Save doc to Content'}).click();
      await page.waitForTimeout(500);
    }

    // capture every required width x theme
    for (const theme of ['light', 'dark']) {
      await page.evaluate((t) => {
        const root = document.querySelector('.dockyard-root') || document.documentElement;
        root.setAttribute('data-theme', t);
        document.documentElement.setAttribute('data-theme', t);
      }, theme);
      for (const w of [1440, 1024, 390]) {
        await page.setViewportSize({width: w, height: 950});
        await page.waitForTimeout(350);
        await page.screenshot({path: `${OUT}/planning-${w}-${theme}.png`});
      }
    }
    assert.ok(errors.length === 0, `page errors: ${errors.join('; ')}`);
  } finally {
    await browser.close();
  }
});
