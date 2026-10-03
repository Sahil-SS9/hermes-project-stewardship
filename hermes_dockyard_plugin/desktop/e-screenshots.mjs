// Batch E acceptance screenshots for Sahil's visual sign-off: the
// Notifications screen with real (disposable) data, then with the detail
// panel open (the settings panel sits beside the list in both), at
// 1440 / 1024 / 390 x light / dark.
// Not a test of behaviour (e5-notifications.test.mjs covers that). Run only via
// run-browser-suite.mjs so it uses the disposable backend, never real data:
//   HPS_BROWSER_PORT=19697 node run-browser-suite.mjs $PWD/e-screenshots.mjs
// Kept out of the default suite by its name (not *.test.mjs).
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {chromium} from './browser-harness.mjs';

const BASE = process.env.STEWARD_DESKTOP_URL;
const API = process.env.STEWARD_API_URL;
// Output folder: E_SCREENS_OUT, else <os tmpdir>/hps-screens/notifications.
const OUT = process.env.E_SCREENS_OUT || join(tmpdir(), 'hps-screens', 'notifications');

async function api(path, method = 'GET', body) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {'content-type': 'application/json', 'x-hermes-session-token': 'demo-session-token'},
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${method} ${path} -> ${res.status}: ${await res.text()}`);
  return res.json();
}

test('Batch E notifications acceptance screenshots (3 widths x 2 themes)', {timeout: 300000}, async () => {
  assert.ok(BASE && API, 'Run via run-browser-suite.mjs');
  mkdirSync(OUT, {recursive: true});
  // Real notifications from real events: two proposals (approval rows).
  for (const title of ['Stage the payments rollout behind a flag', 'Add a rollback window to the release plan']) {
    await api('/projects/payments-relaunch/initiatives', 'POST', {title, rationale: 'Screenshot data'});
  }
  const browser = await chromium.launch({headless: true});
  const page = await browser.newPage({viewport: {width: 1440, height: 950}});
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  const setTheme = (theme) => page.evaluate((t) => {
    const root = document.querySelector('.dockyard-root') || document.documentElement;
    root.setAttribute('data-theme', t);
    document.documentElement.setAttribute('data-theme', t);
  }, theme);
  const shoot = async (name) => {
    for (const theme of ['light', 'dark']) {
      await setTheme(theme);
      for (const w of [1440, 1024, 390]) {
        await page.setViewportSize({width: w, height: 950});
        await page.waitForTimeout(350);
        await page.screenshot({path: `${OUT}/${name}-${w}-${theme}.png`, fullPage: true});
      }
    }
    await page.setViewportSize({width: 1440, height: 950});
  };
  try {
    await page.goto(BASE, {waitUntil: 'load'});
    await page.waitForSelector('[data-tab="dashboard"]', {timeout: 20000});
    await page.getByRole('tab', {name: 'Notifications'}).click();
    await page.locator('.dy-notif-filters').waitFor();
    const rows = page.locator('.dockyard-notification-row');
    await rows.first().waitFor();
    // The settings panel sits beside the list, so it is in every capture.
    await page.locator('[data-notification-settings]').waitFor();
    await shoot('notifications-list');

    await rows.first().locator('button').first().click();
    await page.locator('[data-notification-detail]').waitFor();
    await shoot('notifications-detail');
    assert.deepEqual(errors, [], `page errors: ${errors.join('; ')}`);
  } finally {
    await browser.close();
  }
});
