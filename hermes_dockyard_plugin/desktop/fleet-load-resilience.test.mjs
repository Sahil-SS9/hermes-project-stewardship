// Fleet pages must survive conditions Kensei found on the live app (10/10/2026):
//
// 1. An unlinked project: Hermes has no project for a stewardship project,
//    so reading its work items is a 404. /dashboard already marks it
//    linked: false (tests/test_unlinked_project_fleet.py proves the backend
//    half), but the Dashboard loader still asked for its work items. That one
//    404 failed Dashboard, Projects, Backlog and Workflows and left the
//    project switcher empty.
// 2. A quick tab switch: a newer load threw away the Dashboard load it
//    superseded, project list included, so the switcher stayed empty. The
//    Roadmap test lost this race about 1 run in 10. The fix keeps the list
//    from a superseded load, so (3) an older list that arrives last must not
//    replace a newer one.
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

test('a quick tab switch still fills the project switcher', async () => {
  assert.ok(BASE && API, 'Run via run-browser-suite.mjs');
  await forgetScope();
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    page.setDefaultTimeout(8000);
    // Hold the Dashboard read until the Roadmap is open, so the switch always
    // wins the race the Roadmap test only sometimes lost.
    let release;
    const held = new Promise((resolve) => { release = resolve; });
    await page.route(`${ROUTES}/dashboard`, async (route) => {
      const response = await route.fetch();
      await held;
      await route.fulfill({ response });
    });
    await page.goto(BASE);
    await page.getByRole('tab', { name: 'Roadmap' }).click();
    await page.locator('[data-roadmap-screen]').waitFor();
    release();
    const trigger = page.locator('.dy-sw-trigger');
    await trigger.waitFor();
    assert.equal(await trigger.getAttribute('data-scope'), ALL_PROJECTS);
    // The automatic first pick is not a person's choice, so nothing is saved.
    const remembered = await (await fetch(`${API}/settings/last-project`, {
      headers: { 'x-hermes-session-token': 'demo-session-token' },
    })).json();
    assert.equal(remembered.project_id, null);
  } finally { await browser.close(); }
});

test('an older project list that arrives last does not replace a newer one', async () => {
  assert.ok(BASE && API, 'Run via run-browser-suite.mjs');
  await forgetScope();
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    page.setDefaultTimeout(8000);
    // The first Dashboard read answers last, with an older list that lacks
    // GHOST; later reads answer at once with the current list.
    let release;
    const held = new Promise((resolve) => { release = resolve; });
    let reads = 0;
    let oldAnswered;
    await page.route(`${ROUTES}/dashboard`, (route) => {
      reads += 1;
      if (reads > 1) return route.continue();
      oldAnswered = (async () => {
        const response = await route.fetch();
        const body = await response.json();
        body.projects = body.projects.filter((project) => project.id !== GHOST);
        await held;
        await route.fulfill({ response, json: body });
      })();
      return oldAnswered;
    });
    await page.goto(BASE);
    await page.getByRole('tab', { name: 'Projects', exact: true }).click();
    await page.locator(`[data-project-chooser="Projects"] [data-choose-project="${GHOST}"]`).waitFor();
    release();
    await oldAnswered;
    // Let the older load finish its follow-up reads before looking.
    await page.waitForLoadState('networkidle');
    await page.getByRole('button', { name: 'Project context', exact: true }).click();
    await page.getByRole('combobox', { name: 'Find project' }).fill(GHOST);
    await page.getByRole('listbox', { name: 'Projects' }).getByRole('option', { name: GHOST, exact: true }).waitFor();
    assert.equal(reads >= 2, true, 'the newer load read the Dashboard too');
  } finally { await browser.close(); }
});
