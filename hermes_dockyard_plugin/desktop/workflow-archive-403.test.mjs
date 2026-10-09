// W0 product defects against the shipped Desktop bundle and disposable backend.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from './browser-harness.mjs';
import { createBlankWorkflow } from './test-support/workflow-create.mjs';

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

// New workflow -> Start blank (the old side form went with the builder, 07/10/2026).
const createWorkflow = (page, name) => createBlankWorkflow(page, name, 'Build release');

test('W0-P1: 403 on archive shows intelligible permission error and keeps action retryable', async () => {
  assert.ok(BASE, 'Run via run-browser-suite.mjs');
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    page.setDefaultTimeout(8000);
    await projectWorkflows(page);
    const name = 'w0-403-' + Date.now();
    await createWorkflow(page, name);
    // Reproduce the exact structured-detail 403 shape that W0 captured. The
    // browser bridge stringifies an object detail as "403: [object Object]".
    await page.route(`**/api/plugins/hermes-project-stewardship/projects/payments-relaunch/workflows/${name}/archive`, route =>
      route.fulfill({ status: 403, contentType: 'application/json', body: JSON.stringify({ detail: { required_capability: 'project_archive' } }) }));
    await page.locator('[data-action="archive-workflow"]').click();
    const alert = page.locator('[data-executable-workflows] [role="alert"]');
    await alert.waitFor();
    const text = await alert.innerText();
    assert.match(text, /403.*permission|permission.*403/i);
    assert.match(text, /project_archive/);
    assert.doesNotMatch(text, /\[object Object\]/);
    assert.equal(await page.locator('[data-action="archive-workflow"]').isEnabled(), true);
  } finally { await browser.close(); }
});
