import {test} from 'node:test';
import assert from 'node:assert/strict';
import {chromium} from './browser-harness.mjs';

// Batch W review (Kensei): the top Workflows tab is the library (Option A), and
// per-project switches act on the project chosen in the global picker. Runs
// against the REAL disposable backend through the plugin proxy, so the routes
// the UI calls must exist on the proxy (they 404'd before the review fix).
const BASE = process.env.STEWARD_DESKTOP_URL;
const API = process.env.STEWARD_API_URL;
const hdr = {'content-type': 'application/json', 'x-hermes-session-token': 'demo-session-token'};
const call = async (method, p, body) => {
  const res = await fetch(`${API}${p}`, {method, headers: hdr, body: body ? JSON.stringify(body) : undefined});
  const json = await res.json().catch(() => ({}));
  return {status: res.status, json};
};
const enabledFor = async (project, name) =>
  ((await call('GET', `/projects/${project}/workflows/available`)).json.workflows ?? [])
    .find((w) => w.scope === 'global' && w.name === name)?.enabled;

test('library toggles and runs act on the selected project, not the first one', {timeout: 120000}, async () => {
  const name = `scope-probe-${Date.now()}`;
  const created = await call('POST', '/workflow-library', {scope: 'global', name,
    nodes: [{id: 'a', title: 'Only step', depends_on: []}]});
  assert.equal(created.status, 200, JSON.stringify(created.json));
  const projects = ((await call('GET', '/dashboard')).json.projects ?? []).map((p) => p.id);
  assert.ok(projects.length >= 2, 'fixture needs two projects');
  const first = projects[0];
  const target = projects.find((id) => id !== first);

  const browser = await chromium.launch({headless: true});
  const errors = [];
  try {
    const page = await browser.newPage({viewport: {width: 1280, height: 900}});
    page.on('pageerror', (e) => errors.push(String(e)));
    await page.goto(BASE, {waitUntil: 'load'});
    await page.getByRole('button', {name: 'Project context', exact: true}).click();
    await page.getByRole('combobox', {name: 'Find project'}).fill(target);
    await page.getByRole('listbox', {name: 'Projects'}).getByRole('option', {name: target, exact: true}).click();
    // Top tab opens the library directly (Option A).
    await page.locator('[data-tab="workflows"]').click();
    await page.locator('[data-workflow-library-screen]').waitFor();
    const row = page.locator(`[data-library-row="${name}"]`);
    await row.waitFor();
    assert.match(await row.innerText(), new RegExp(`On for ${target}`));
    const toggle = row.locator(`[data-wf-enablement="global:${name}"]`);
    assert.equal(await toggle.getAttribute('aria-checked'), 'false');
    await toggle.click();
    await page.waitForFunction((sel) => document.querySelector(sel)?.getAttribute('aria-checked') === 'true',
      `[data-wf-enablement="global:${name}"]`);
    // Persisted for the selected project only.
    assert.equal(await enabledFor(target, name), true);
    assert.equal(await enabledFor(first, name), false);
    // Start run goes to the selected project.
    await row.locator(`[data-wf-run-start="global:${name}"]`).click();
    await page.getByText(`Run of ${name} started for ${target}.`).waitFor();
    const runs = await call('GET', `/projects/${target}/workflows/global/${name}/runs`);
    assert.equal(runs.status, 200);
    assert.equal(runs.json.runs.length, 1);
    // Switching project re-reads that project's switches.
    await page.getByRole('button', {name: 'Project context', exact: true}).click();
    await page.getByRole('combobox', {name: 'Find project'}).fill(first);
    await page.getByRole('listbox', {name: 'Projects'}).getByRole('option', {name: first, exact: true}).click();
    await page.locator('[data-tab="workflows"]').click();
    await page.waitForFunction((sel) => document.querySelector(sel)?.getAttribute('aria-checked') === 'false',
      `[data-wf-enablement="global:${name}"]`);
    // 390px: the switch label wraps inside the card instead of clipping.
    await page.setViewportSize({width: 390, height: 900});
    const clip = await page.locator(`[data-library-row="${name}"] .dockyard-wf-enablement-label`).evaluate((el) => {
      const card = el.closest('[data-library-row]').getBoundingClientRect();
      const r = el.getBoundingClientRect();
      return {overflow: el.scrollWidth > el.clientWidth + 1, outside: r.right > card.right + 0.5,
        pageOverflow: document.documentElement.scrollWidth > window.innerWidth};
    });
    assert.deepEqual(clip, {overflow: false, outside: false, pageOverflow: false});
    assert.deepEqual(errors, []);
  } finally {
    await browser.close();
    await call('POST', `/workflow-library/global/${name}/archive`);
  }
});
