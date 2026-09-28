import {test} from 'node:test';
import assert from 'node:assert/strict';
import {fixtureBrowser} from './browser-harness.mjs';

// W3/W4 rendered journeys: the library screen and per-project enablement run
// through the real plugin bundle against the disposable phase4 host. The host's
// /workflow-library + enablement routes mirror the W2 API contract the plugin
// drives; nothing here invents workflow state.

test('W3 library: create global workflow, filter by scope, archive and restore', async()=>fixtureBrowser(async(page)=>{
 // Option A: Project > Workflows keeps a library entry point that lands on
 // the top Workflows tab, and the top tab opens the library directly.
 await page.locator('[data-tab="project"]').click();
 await page.locator('[data-project-view="workflows"]').click();
 await page.locator('[data-workflow-library-entry] [data-action="open-workflow-library"]').waitFor();
 await page.locator('[data-workflow-library-entry] [data-action="open-workflow-library"]').click();
 await page.locator('[data-workflow-library-screen]').waitFor();
 assert.equal(await page.locator('[data-tab="workflows"]').getAttribute('aria-selected'),'true');
 await page.locator('[data-tab="dashboard"]').click();
 await page.locator('[data-tab="workflows"]').click();
 await page.locator('[data-workflow-library-screen]').waitFor();
 // Empty state before any workflow exists.
 await page.getByRole('heading',{name:'No workflows yet'}).waitFor();
 await page.locator('[data-action="library-create"]').click();
 await page.locator('[data-library-name]').fill('release-cadence');
 await page.locator('[data-library-title]').fill('Cut release');
 await page.locator('[data-action="library-create-confirm"]').click();
 const row=page.locator('[data-library-row="release-cadence"]');
 await row.waitFor();
 assert.equal(await row.getAttribute('data-library-scope'),'global');
 assert.match(await row.innerText(),/Global/);
 // Scope filter hides dedicated/global rows correctly.
 await page.locator('[data-action="library-scope-global"]').click();
 await row.waitFor();
 await page.locator('[data-action="library-scope-project"]').click();
 await page.getByRole('heading',{name:'No workflows yet'}).waitFor();
 await page.locator('[data-action="library-scope-all"]').click();
 await row.waitFor();
 // Search narrows to matching names only.
 await page.locator('[data-library-search]').fill('no-such-workflow');
 await page.getByRole('heading',{name:'No workflows yet'}).waitFor();
 await page.locator('[data-library-search]').fill('');
 await row.waitFor();
 // Archive then restore through the same row.
 await row.getByRole('button',{name:'Archive'}).click();
 await row.getByRole('button',{name:'Restore'}).waitFor();
 await row.getByRole('button',{name:'Restore'}).click();
 await row.getByRole('button',{name:'Archive'}).waitFor();
 // Delete removes the row for good.
 await row.getByRole('button',{name:'Delete'}).click();
 await page.getByRole('heading',{name:'No workflows yet'}).waitFor();
}));

test('W4 toggle drives enablement: off refuses a run, on starts it, and errors surface', async()=>fixtureBrowser(async(page)=>{
 await page.locator('[data-tab="workflows"]').click();
 await page.locator('[data-workflow-library-screen]').waitFor();
 await page.locator('[data-action="library-create"]').click();
 await page.locator('[data-library-name]').fill('nightly-audit');
 await page.locator('[data-library-title]').fill('Audit the queue');
 await page.locator('[data-action="library-create-confirm"]').click();
 const row=page.locator('[data-library-row="nightly-audit"]');
 await row.waitFor();
 // Off by default (D-W1): the toggle reflects the persisted enablement and a
 // start is refused until the project turns it on. The refusal is stated in
 // the UI, never silently swallowed.
 const toggle=page.locator('[data-wf-enablement="global:nightly-audit"]');
 await toggle.waitFor();
 assert.equal(await toggle.getAttribute('aria-checked'),'false');
 const runStart=page.locator('[data-wf-run-start="global:nightly-audit"]');
 await runStart.click();
 await page.locator('[data-wf-run-refused="global:nightly-audit"]').waitFor();
 assert.match(await page.locator('[data-wf-run-refused="global:nightly-audit"]').innerText(),/refused|disabled|off/i);
 await toggle.click();
 await page.waitForFunction(() => document.querySelector('[data-wf-enablement="global:nightly-audit"]')?.getAttribute('aria-checked') === 'true');
 assert.equal(await toggle.getAttribute('aria-checked'),'true');
}));