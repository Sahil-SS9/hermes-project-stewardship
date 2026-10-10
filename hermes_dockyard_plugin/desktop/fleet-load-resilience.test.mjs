// Fleet pages must survive conditions Kensei found on the live app (10/10/2026):
//
// 1. An unlinked project: Hermes has no project for a stewardship project,
//    so reading its work items is a 404. /dashboard already marks it
//    linked: false (tests/test_unlinked_project_fleet.py proves the backend
//    half), but the Dashboard loader still asked for its work items. That one
//    404 failed Dashboard, Projects, Backlog and Workflows and left the
//    project switcher empty.
//
// The disposable backend's reference host knows every project, so the live
// unlinked contract (linked: false, then the 404 body the live backend sent)
// is reproduced at the HTTP boundary for one fixture project.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from './browser-harness.mjs';

const BASE = process.env.STEWARD_DESKTOP_URL;
const API = process.env.STEWARD_API_URL;
const ROUTES = '**/api/plugins/hermes-project-stewardship';
const GHOST = 'legacy-integration';
const ALL_PROJECTS = '*';
const ERROR_CARD = 'Project Stewardship could not load this view';

// The suite preload forgets the remembered project once per file; each test
// here needs that starting point, so it forgets it again.
async function forgetScope() {
  const response = await fetch(`${API}/settings/last-project`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json', 'x-hermes-session-token': 'demo-session-token' },
    body: JSON.stringify({ project_id: null }),
  });
  assert.ok(response.ok, `PUT /settings/last-project -> ${response.status}`);
}

// Wait until the tab shows its own content or the error card, then report
// whether it was the error card.
async function shows(page, ready) {
  const errorCard = page.getByRole('heading', { name: ERROR_CARD });
  await page.locator(ready).or(errorCard).first().waitFor();
  return (await errorCard.count()) === 0 ? 'content' : await page.locator('[role="alert"], .dy-error, main').first().innerText();
}

test('an unlinked project leaves every fleet tab working', async () => {
  assert.ok(BASE && API, 'Run via run-browser-suite.mjs');
  await forgetScope();
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    page.setDefaultTimeout(8000);
    await page.route(`${ROUTES}/dashboard`, async (route) => {
      const response = await route.fetch();
      const body = await response.json();
      body.projects = body.projects.map((project) => (project.id === GHOST ? { ...project, linked: false } : project));
      await route.fulfill({ response, json: body });
    });
    const asked = [];
    await page.route(`${ROUTES}/projects/${GHOST}/work-items`, (route) => {
      asked.push(route.request().url());
      return route.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify({ detail: 'canonical project was not found' }) });
    });
    await page.goto(BASE);
    // The Command Center's fleet summary: present whenever there are projects.
    assert.equal(await shows(page, 'section[aria-label="Fleet summary"]'), 'content', 'Dashboard');
    const trigger = page.locator('.dy-sw-trigger');
    await trigger.waitFor();
    assert.equal(await trigger.getAttribute('data-scope'), ALL_PROJECTS);
    await page.getByRole('tab', { name: 'Projects', exact: true }).click();
    assert.equal(await shows(page, '[data-project-chooser="Projects"]'), 'content', 'Projects');
    // Still listed: unlinked is a state to fix, not a reason to hide it.
    await page.locator(`[data-project-chooser="Projects"] [data-choose-project="${GHOST}"]`).waitFor();
    await page.getByRole('tab', { name: 'Backlog', exact: true }).click();
    assert.equal(await shows(page, '[data-project-chooser="Backlog"]'), 'content', 'Backlog');
    await page.getByRole('tab', { name: 'Workflows', exact: true }).click();
    assert.equal(await shows(page, '[data-workflow-library-screen]'), 'content', 'Workflows');
    assert.deepEqual(asked, [], 'asked for work items of a project /dashboard marked unlinked');
  } finally { await browser.close(); }
});
