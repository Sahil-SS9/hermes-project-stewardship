// Dockyard desktop runtime harness.
// Exercises real React effects in jsdom, write interactions, every UI state,
// CSS parsing, contrast metadata and Chromium layout at 700px and 1600px.
import assert from 'node:assert/strict';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const DESKTOP_PACKAGE = '/home/kensei/repos/hermes-agent-vanilla/apps/desktop/package.json';
const REPO_PLUGIN = '/home/kensei/repos/hermes-project-stewardship/hermes_dockyard_plugin/desktop/plugin.js';
const LIVE_PLUGIN = '/home/kensei/.hermes/desktop-plugins/hermes-dockyard/plugin.js';
const PLUGIN_PATH = process.env.DOCKYARD_PLUGIN_PATH || (existsSync(REPO_PLUGIN) ? REPO_PLUGIN : LIVE_PLUGIN);
const require = createRequire(DESKTOP_PACKAGE);
const { JSDOM, VirtualConsole } = require('jsdom');
const React = require('react');
const { act } = React;
const { createRoot } = require('react-dom/client');
const rt = require('react/jsx-runtime');

const POPULATED = {
  dashboard: {
    projects: [
      { id: 'demo-project', enabled: true, phase: 'active', health: 'unknown', work: { backlog: 5, active: 3, done: 3, blocked: 0 }, unacked_notifications: 0 },
      { id: 'payments-relaunch', enabled: true, phase: 'active', health: 'unknown', work: { backlog: 1, active: 2, done: 1, blocked: 1 }, unacked_notifications: 1 },
    ],
    owed_decisions: 2,
    totals: { active_work: 5, blocked: 1, stuck_bots: 0, unacked_notifications: 1 },
  },
  inbox: {
    count: 2,
    items: [
      { kind: 'initiative_approval', project: 'demo-project', ref: 'INI-DEMO-1', title: 'Add weekly digest email', risk: 'low', deep_link: 's6:initiative/INI-DEMO-1' },
      { kind: 'initiative_approval', project: 'payments-relaunch', ref: 'INI-DEMO-2', title: 'Enable one-click refunds', risk: 'medium', deep_link: 's6:initiative/INI-DEMO-2' },
    ],
  },
  notifications: {
    notifications: [
      { id: 3, project: 'payments-relaunch', severity: 'medium', kind: 'bot_status', title: 'Load test flagged latency spike', body: 'p95 checkout latency exceeded 800ms under 3x load. Investigation assigned.', created_at: '2026-08-24T18:36:13.609423+00:00', acked: false, deep_link: 's2:project-board' },
      { id: 2, project: 'demo-project', severity: 'info', kind: 'bot_status', title: 'Nightly sweep finished', body: 'Bot fleet check complete: no issues found.', created_at: '2026-08-24T18:10:07.321115+00:00', acked: true, deep_link: 's2:project-board' },
    ],
  },
};

const EMPTY = {
  dashboard: { projects: [], owed_decisions: 0, totals: { active_work: 0, blocked: 0, stuck_bots: 0, unacked_notifications: 0 } },
  inbox: { count: 0, items: [] },
  notifications: { notifications: [] },
};

const wait = (ms = 0) => new Promise((resolve) => setTimeout(resolve, ms));
const clone = (value) => JSON.parse(JSON.stringify(value));

function sourceImports(source) {
  return [...source.matchAll(/^import\s+.+?from\s+['"]([^'"]+)['"];?$/gm)].map((match) => match[1]);
}

function evaluatePlugin(source, host) {
  const imports = sourceImports(source);
  assert.deepEqual(
    [...new Set(imports)].sort(),
    ['@hermes/plugin-sdk', 'react', 'react/jsx-runtime'].sort(),
    `unsupported or missing imports: ${imports.join(', ')}`,
  );
  let stripped = source.replace(/^import\s.*$/gm, '');
  stripped = stripped.replace(/^export default __plugin;?$/m, '');
  const stub = `
const jsx = __rt.jsx, jsxs = __rt.jsxs, Fragment = __rt.Fragment;
const { useEffect, useState } = React;
`;
  const factory = new Function(
    'React', '__rt', 'host',
    `${stub}${stripped}\nreturn { plugin: __plugin, test: typeof DOCKYARD_TEST === 'undefined' ? null : DOCKYARD_TEST };`,
  );
  return factory(React, rt, host);
}

function createDeferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

async function createRuntime({ mode = 'populated', failOnce = false } = {}) {
  const virtualConsole = new VirtualConsole();
  const jsdomMessages = [];
  virtualConsole.on('jsdomError', (error) => jsdomMessages.push(error.message));
  const dom = new JSDOM('<!doctype html><html><head><meta charset="utf-8"></head><body><div id="root"></div></body></html>', {
    url: 'http://localhost/dockyard',
    pretendToBeVisual: true,
    virtualConsole,
  });
  global.document = dom.window.document;
  global.window = dom.window;
  global.HTMLElement = dom.window.HTMLElement;
  global.SVGElement = dom.window.SVGElement;
  global.Element = dom.window.Element;
  global.Node = dom.window.Node;
  global.MutationObserver = dom.window.MutationObserver;
  global.getComputedStyle = dom.window.getComputedStyle.bind(dom.window);
  Object.defineProperty(global, 'navigator', { value: dom.window.navigator, configurable: true });
  global.IS_REACT_ACT_ENVIRONMENT = true;

  const calls = [];
  const navigations = [];
  const data = clone(mode === 'empty' ? EMPTY : POPULATED);
  const deferred = mode === 'loading' ? createDeferred() : null;
  let shouldFail = failOnce;

  const rest = async (path, init = {}) => {
    const method = init.method || 'GET';
    calls.push({ path, method, body: init.body });
    if (shouldFail && method === 'GET') {
      shouldFail = false;
      throw new Error('Synthetic service failure');
    }
    if (mode === 'loading' && method === 'GET' && path === '/dashboard') return deferred.promise;
    if (method === 'POST' && path.startsWith('/initiatives/') && path.endsWith('/approve')) {
      const ref = decodeURIComponent(path.split('/')[2]);
      data.inbox.items = data.inbox.items.filter((item) => item.ref !== ref);
      data.inbox.count = data.inbox.items.length;
      data.dashboard.owed_decisions = data.inbox.count;
      return { ok: true, ref, status: 'approved' };
    }
    if (method === 'POST' && path.startsWith('/notifications/') && path.endsWith('/ack')) {
      const id = Number(path.split('/')[2]);
      const item = data.notifications.notifications.find((note) => note.id === id);
      if (item) item.acked = true;
      data.dashboard.totals.unacked_notifications = data.notifications.notifications.filter((note) => !note.acked).length;
      return { ok: true, id, acked: true };
    }
    if (path === '/dashboard') return clone(data.dashboard);
    if (path === '/inbox') return clone(data.inbox);
    if (path === '/notifications') return clone(data.notifications);
    throw new Error(`Unhandled test request: ${method} ${path}`);
  };

  const loaded = evaluatePlugin(readFileSync(PLUGIN_PATH, 'utf8'), { navigate: (path) => navigations.push(path) });
  const contributions = [];
  loaded.plugin.register({
    register: (item) => contributions.push(item),
    registerMany: (items) => contributions.push(...items),
    onDispose: () => {},
    rest,
  });
  const route = contributions.find((item) => item.area === 'routes');
  assert(route, 'plugin did not register a route contribution');
  const root = createRoot(dom.window.document.getElementById('root'));

  const flush = async (ms = 20) => {
    await act(async () => { await wait(ms); });
  };
  const mount = async () => {
    await act(async () => {
      root.render(route.render());
      await wait(20);
    });
  };
  const click = async (selector, ms = 30) => {
    const element = dom.window.document.querySelector(selector);
    assert(element, `missing click target: ${selector}`);
    await act(async () => {
      element.click();
      await wait(ms);
    });
  };
  const dispose = async () => {
    await act(async () => { root.unmount(); });
    dom.window.close();
  };

  return { dom, loaded, contributions, calls, navigations, data, deferred, jsdomMessages, mount, flush, click, dispose };
}

async function testStylesAndPopulatedDashboard() {
  const runtime = await createRuntime();
  await runtime.mount();
  const { document } = runtime.dom.window;
  const style = document.querySelector('style[data-dockyard-style]') || document.querySelector('style');
  assert(style, 'plugin did not install a stylesheet');
  const css = style.textContent;
  assert(!/(^|\})\s*(html|body|:root)\b/m.test(css), 'stylesheet targets html, body or :root');
  assert(!css.includes('.dockyard-root @keyframes'), 'keyframes were incorrectly scoped as a descendant');
  const rules = [...style.sheet.cssRules];
  assert(
    rules.some((rule) => rule.cssText.includes('.dockyard-root .dockyard-page-head')),
    `stylesheet truncated before page layout; only ${rules.length} rules parsed`,
  );
  assert.equal(runtime.jsdomMessages.filter((message) => message.includes('Could not parse CSS')).length, 0, `CSS parser errors: ${runtime.jsdomMessages.join(' | ')}`);
  const root = document.querySelector('.dockyard-root');
  assert(root, 'missing .dockyard-root container');
  const rootStyle = runtime.dom.window.getComputedStyle(root);
  assert(!rootStyle.fontFamily.includes('Times New Roman'), `host font leaked into Dockyard: ${rootStyle.fontFamily}`);
  assert.notEqual(rootStyle.backgroundColor, 'rgba(0, 0, 0, 0)', 'root background is not explicit');
  assert.notEqual(rootStyle.color, 'rgba(0, 0, 0, 0)', 'root text colour is not explicit');
  assert.equal(document.querySelectorAll('[data-project-row]').length, 2, 'dashboard should render both projects');
  assert(document.querySelector('[role="table"][aria-label="Project fleet"]'), 'project roster is not exposed as a semantic table');
  assert.equal(document.querySelectorAll('[role="columnheader"]').length, 4, 'project table should expose four column headers');
  assert.equal(document.querySelectorAll('[data-project-row][role="row"]').length, 2, 'project rows are missing semantic row roles');
  assert.match(root.textContent, /demo-project/);
  assert.match(root.textContent, /payments-relaunch/);
  assert.equal(document.querySelector('[role="tab"][aria-selected="true"]')?.getAttribute('data-tab'), 'dashboard');
  await runtime.dispose();
}

async function testLoadingAndEmptyStates() {
  const loading = await createRuntime({ mode: 'loading' });
  await loading.mount();
  assert(loading.dom.window.document.querySelectorAll('.dockyard-skeleton').length > 0, 'loading state must use matched skeletons');
  loading.deferred.resolve(clone(POPULATED.dashboard));
  await loading.flush();
  assert.equal(loading.dom.window.document.querySelectorAll('[data-project-row]').length, 2, 'loading state did not resolve to populated dashboard');
  await loading.dispose();

  const empty = await createRuntime({ mode: 'empty' });
  await empty.mount();
  assert.match(empty.dom.window.document.body.textContent, /No projects under watch/);
  assert(!empty.dom.window.document.body.textContent.includes('hermes dockyard onboard'), 'empty state must not send the owner to the CLI');
  await empty.click('[data-tab="inbox"]');
  assert.match(empty.dom.window.document.body.textContent, /No approvals waiting/);
  await empty.click('[data-tab="notifications"]');
  assert.match(empty.dom.window.document.body.textContent, /No notifications yet/);
  await empty.dispose();
}

async function testErrorRetry() {
  const runtime = await createRuntime({ failOnce: true });
  await runtime.mount();
  assert(runtime.dom.window.document.querySelector('[data-state="error"]'), 'error state is not reachable');
  assert.match(runtime.dom.window.document.body.textContent, /Synthetic service failure/);
  await runtime.click('[data-action="retry"]');
  assert.equal(runtime.dom.window.document.querySelectorAll('[data-project-row]').length, 2, 'retry did not recover');
  await runtime.dispose();
}

async function testApprovalFlow() {
  const runtime = await createRuntime();
  await runtime.mount();
  await runtime.click('[data-tab="inbox"]');
  const doc = runtime.dom.window.document;
  assert.equal(doc.querySelectorAll('[data-approval-ref]').length, 2, 'inbox should show two approvals');
  await runtime.click('[data-approval-ref="INI-DEMO-1"] [data-action="approve"]', 40);
  assert.equal(doc.querySelector('[data-approval-ref="INI-DEMO-1"]')?.getAttribute('data-state'), 'approved', 'approval row did not show its approved state');
  assert(runtime.calls.some((call) => call.method === 'POST' && call.path === '/initiatives/INI-DEMO-1/approve'), 'approval POST was not sent');
  await runtime.flush(1000);
  assert.equal(doc.querySelectorAll('[data-approval-ref]').length, 1, 'approved item did not leave the queue after refresh');
  assert(!doc.body.textContent.includes('Add weekly digest email'), 'approved item remains visible after refresh');
  await runtime.dispose();
}

async function testNotificationFlow() {
  const runtime = await createRuntime();
  await runtime.mount();
  await runtime.click('[data-tab="notifications"]');
  const doc = runtime.dom.window.document;
  assert.equal(doc.querySelectorAll('[data-notification-state="unread"]').length, 1, 'expected one unread notification');
  assert.equal(doc.querySelectorAll('[data-notification-state="cleared"]').length, 1, 'expected one cleared notification');
  await runtime.click('[data-notification-id="3"] [data-action="acknowledge"]', 50);
  assert(runtime.calls.some((call) => call.method === 'POST' && call.path === '/notifications/3/ack'), 'acknowledge POST was not sent');
  assert.equal(doc.querySelectorAll('[data-notification-state="unread"]').length, 0, 'acknowledged notification remains unread');
  assert.equal(doc.querySelectorAll('[data-notification-state="cleared"]').length, 2, 'acknowledged notification did not move to Cleared');
  assert.match(doc.querySelector('[data-notification-id="3"]')?.textContent || '', /Cleared/);
  await runtime.dispose();
}

async function testKeyboardTabsAndNames() {
  const runtime = await createRuntime();
  await runtime.mount();
  const doc = runtime.dom.window.document;
  const fleetTab = doc.querySelector('[data-tab="dashboard"]');
  fleetTab.focus();
  await act(async () => {
    fleetTab.dispatchEvent(new runtime.dom.window.KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    await wait(30);
  });
  assert.equal(doc.querySelector('[role="tab"][aria-selected="true"]')?.getAttribute('data-tab'), 'inbox', 'ArrowRight did not select the next tab');
  assert.equal(doc.activeElement?.getAttribute('data-tab'), 'inbox', 'keyboard tab navigation did not move focus');
  for (const button of doc.querySelectorAll('button')) {
    assert(button.textContent.trim().length > 0 || button.getAttribute('aria-label'), 'button has no accessible name');
  }
  await runtime.dispose();
}

function relativeLuminance(hex) {
  const rgb = hex.replace('#', '').match(/.{2}/g).map((part) => parseInt(part, 16) / 255);
  const linear = rgb.map((value) => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}

function contrastRatio(foreground, background) {
  const values = [relativeLuminance(foreground), relativeLuminance(background)].sort((a, b) => b - a);
  return (values[0] + 0.05) / (values[1] + 0.05);
}

async function testContrastMetadata() {
  const runtime = await createRuntime();
  assert(runtime.loaded.test, 'plugin must expose internal contrast metadata to the harness');
  const pairs = runtime.loaded.test.contrastPairs;
  assert(Array.isArray(pairs) && pairs.length >= 20, 'contrast manifest does not cover the semantic palette');
  for (const theme of ['light', 'dark']) {
    for (const label of ['tertiary metadata on subtle surface', 'control boundary on page', 'control boundary on surface']) {
      assert(pairs.some((pair) => pair.theme === theme && pair.label === label), `contrast manifest is missing ${theme}: ${label}`);
    }
  }
  const rows = pairs.map((pair) => {
    const ratio = contrastRatio(pair.foreground, pair.background);
    assert(ratio >= pair.minimum, `${pair.theme} ${pair.label} is ${ratio.toFixed(2)}:1, below ${pair.minimum}:1`);
    return { ...pair, ratio: Number(ratio.toFixed(2)) };
  });
  console.log('CONTRAST_TABLE=' + JSON.stringify(rows));
  await runtime.dispose();
}

async function writeSnapshot(tab, target) {
  const runtime = await createRuntime();
  await runtime.mount();
  if (tab !== 'dashboard') await runtime.click(`[data-tab="${tab}"]`);
  const doc = runtime.dom.window.document;
  const harnessStyle = doc.createElement('style');
  harnessStyle.textContent = 'body{margin:0;background:#fff}';
  doc.head.prepend(harnessStyle);
  writeFileSync(target, '<!doctype html>' + doc.documentElement.outerHTML);
  await runtime.dispose();
}

async function testChromiumLayouts() {
  const { chromium } = require('playwright');
  const snapshots = {
    dashboard: '/tmp/dockyard-dashboard.html',
    inbox: '/tmp/dockyard-inbox.html',
    notifications: '/tmp/dockyard-notifications.html',
  };
  await writeSnapshot('dashboard', snapshots.dashboard);
  await writeSnapshot('inbox', snapshots.inbox);
  await writeSnapshot('notifications', snapshots.notifications);

  const specs = [
    { name: 'dashboard-700-light', file: snapshots.dashboard, width: 700, height: 1000, scheme: 'light' },
    { name: 'dashboard-1600-light', file: snapshots.dashboard, width: 1600, height: 1000, scheme: 'light' },
    { name: 'dashboard-1200-dark', file: snapshots.dashboard, width: 1200, height: 900, scheme: 'dark' },
    { name: 'inbox-1200-light', file: snapshots.inbox, width: 1200, height: 900, scheme: 'light' },
    { name: 'notifications-1200-dark', file: snapshots.notifications, width: 1200, height: 900, scheme: 'dark' },
  ];
  const browser = await chromium.launch({ headless: true });
  const results = [];
  try {
    for (const spec of specs) {
      const page = await browser.newPage({ viewport: { width: spec.width, height: spec.height }, colorScheme: spec.scheme });
      const browserErrors = [];
      page.on('console', (message) => { if (message.type() === 'error' || message.type() === 'warning') browserErrors.push(`${message.type()}: ${message.text()}`); });
      page.on('pageerror', (error) => browserErrors.push(`pageerror: ${error.message}`));
      await page.goto(`file://${spec.file}`, { waitUntil: 'load' });
      const measure = await page.evaluate(() => {
        const root = document.querySelector('.dockyard-root');
        return {
          viewport: window.innerWidth,
          documentWidth: document.documentElement.scrollWidth,
          rootWidth: root.getBoundingClientRect().width,
          rootFont: getComputedStyle(root).fontFamily,
          projectRows: document.querySelectorAll('[data-project-row]').length,
        };
      });
      assert(measure.documentWidth <= spec.width, `${spec.name} overflows horizontally: ${measure.documentWidth}px > ${spec.width}px`);
      assert(!measure.rootFont.includes('Times New Roman'), `${spec.name} inherited Times New Roman`);
      const screenshot = `/tmp/dockyard-${spec.name}.png`;
      await page.screenshot({ path: screenshot, fullPage: true });
      assert.equal(browserErrors.length, 0, `${spec.name} browser warnings/errors: ${browserErrors.join(' | ')}`);
      results.push({ ...spec, screenshot, ...measure });
      await page.close();
    }
  } finally {
    await browser.close();
  }
  console.log('LAYOUT_RESULTS=' + JSON.stringify(results));
}

const tests = [
  ['styles and populated dashboard', testStylesAndPopulatedDashboard],
  ['loading and empty states', testLoadingAndEmptyStates],
  ['error retry', testErrorRetry],
  ['approval flow', testApprovalFlow],
  ['notification flow', testNotificationFlow],
  ['keyboard tabs and accessible names', testKeyboardTabsAndNames],
  ['contrast metadata', testContrastMetadata],
  ['Chromium layouts', testChromiumLayouts],
];

console.log(`PLUGIN_UNDER_TEST=${PLUGIN_PATH}`);
let passed = 0;
try {
  for (const [name, test] of tests) {
    await test();
    passed += 1;
    console.log(`PASS ${name}`);
  }
  console.log(`PASS_SUMMARY=${passed}/${tests.length}`);
} catch (error) {
  console.error(`FAIL after ${passed}/${tests.length}: ${error.stack || error}`);
  process.exitCode = 1;
}
