// W0 product defects against the shipped Desktop bundle and disposable backend.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from './browser-harness.mjs';

const BASE = process.env.STEWARD_DESKTOP_URL;

async function projectWorkflows(page) {
  await page.goto(BASE);
  await page.getByRole('button', { name: 'Project context', exact: true }).click();
  await page.getByRole('combobox', { name: 'Find project' }).fill('payments-relaunch');
  await page.getByRole('listbox', { name: 'Projects' }).getByRole('option', { name: 'payments-relaunch', exact: true }).click();
  // Option A: project workflows live under Project > Workflows.
  await page.locator('[data-tab="project"]').click();
  await page.locator('[data-project-view="workflows"]').click();
  await page.locator('[data-executable-workflows="payments-relaunch"]').waitFor();
}

async function createWorkflow(page, name) {
  await page.locator('[data-workflow-name]').fill(name);
  await page.locator('[data-workflow-title]').fill('Build release');
  await page.locator('[data-action="define-workflow"]').click();
  await page.locator(`[data-workflow-library-item="${name}"]`).waitFor();
}

test('W0-P2: after auto-layout node editor saves a new version without detaching', async () => {
  assert.ok(BASE, 'Run via run-browser-suite.mjs');
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    page.setDefaultTimeout(8000);
    await projectWorkflows(page);
    const name = 'w0-edit-' + Date.now();
    await createWorkflow(page, name);
    await page.locator('[data-action="wf-add-gate"]').click();
    await page.locator(`[data-workflow-canvas="${name}"] [data-node-id="gate-2"]`).waitFor();
    await page.locator('[data-action="wf-validate"]').click();
    await page.locator('[data-workflow-run-key]').fill(name + '-run');
    await page.locator('[data-action="start-workflow"]').last().click();
    await page.locator(`[data-workflow-live-run="${name}-run"]`).waitFor();
    await page.locator('[data-action="archive-workflow"]').click();
    await page.locator('[data-action="restore-workflow"]').waitFor();
    await page.locator('[data-action="restore-workflow"]').click();
    await page.locator('[data-action="archive-workflow"]').waitFor();
    await page.locator('[data-action="wf-auto-layout"]').click();
    await page.locator(`[data-workflow-canvas="${name}"] [data-node-id="step-1"]`).click();
    await page.getByLabel('Node title').fill('Edited via canvas');
    await page.getByRole('button', { name: 'Save graph version' }).click();
    // Definition versions live in a collapsed <details>; attached is the
    // correct DOM state, then expand before asserting the persisted title.
    await page.locator(`[data-workflow-definition-version]`).last().waitFor({ state: 'attached' });
    const definitions = page.locator(`[data-workflow-definitions="${name}"]`);
    await definitions.locator('summary').click();
    // Wait inside the versions panel: since 07/10/2026 an edit made on a run's
    // view switches the canvas to the plan, whose (hidden) list view also holds
    // the new title, so a page-wide last() match is no longer the panel.
    await definitions.getByText('Edited via canvas', { exact: false }).last().waitFor();
    assert.match(await definitions.innerText(), /Edited via canvas/);
    await page.locator('[data-action="wf-validate"]').click();
    assert.ok(await page.locator('[data-wf-validate-result]').isVisible());
  } finally { await browser.close(); }
});
