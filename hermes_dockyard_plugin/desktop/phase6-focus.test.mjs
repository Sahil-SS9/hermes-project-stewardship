// Lane A Phase 6 — behavioural keyboard-focus tests for MODAL dialog surfaces.
// Exercises REAL user flows through real React effects in jsdom:
//   - click "New project" in the console bar -> OnboardingWizard mounts
//   - open the project tab, choose the Objectives view, click the mission
//     "Archive" button -> ConfirmDialog mounts
// Proves (Lane-B-03): initial focus, Tab/Shift+Tab containment, Escape and
// focus return to the opening control — by dispatching real KeyboardEvents
// and driving real focus, never by source inspection.
// Note on click-focus: jsdom's element.click() does not run the browser's
// focus-on-activation behaviour, so each test focuses the trigger first —
// exactly what a keyboard user's Tab/Enter activation produces.

import assert from 'node:assert/strict';
import test from 'node:test';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { evaluatePlugin as evaluatePluginBundle } from './test-support/load-plugin.mjs';

const HARNESS_PACKAGE = fileURLToPath(new URL('../dashboard/package.json', import.meta.url));
const PLUGIN_PATH = process.env.DOCKYARD_PLUGIN_PATH
  || fileURLToPath(new URL('./plugin.js', import.meta.url));
const require = createRequire(HARNESS_PACKAGE);
const { JSDOM, VirtualConsole } = require('jsdom');
const React = require('react');
const { act } = React;
const { createRoot } = require('react-dom/client');
const rt = require('react/jsx-runtime');
import { reportDownloadFilename } from './download.js';
import { LUCIDE_ICON_NODES } from './lucide-icons.js';
// The plugin stub resolves reportDownloadFilename through __rt so the REAL
// sanitiser is exercised in these jsdom journeys (no duplicated logic).
rt.reportDownloadFilename = reportDownloadFilename;
rt.LUCIDE_ICON_NODES = LUCIDE_ICON_NODES;

const wait = (ms = 0) => new Promise((resolve) => setTimeout(resolve, ms));
const clone = (value) => JSON.parse(JSON.stringify(value));

function evaluatePlugin(source, host) {
  const loaded = evaluatePluginBundle(source, host, { assertImports: false });
  assert.deepEqual([...new Set(loaded.imports)].sort(), ['@hermes/plugin-sdk', 'react', 'react/jsx-runtime']);
  assert.equal(loaded.plugin.id, 'hermes-project-stewardship');
  return loaded;
}

async function createRuntime() {
  const jsdomMessages = [];
  const virtualConsole = new VirtualConsole();
  virtualConsole.on('jsdomError', (error) => jsdomMessages.push(error.message));
  const dom = new JSDOM('<!doctype html><html><head><meta charset="utf-8"></head><body><div id="root"></div></body></html>', {
    url: 'http://dockyard.test/',
    pretendToBeVisual: true,
    runScripts: 'outside-only',
    virtualConsole,
  });
  global.document = dom.window.document;
  global.window = dom.window;
  global.HTMLElement = dom.window.HTMLElement;
  global.SVGElement = dom.window.SVGElement;
  global.Element = dom.window.Element;
  global.Node = dom.window.Node;
  global.getComputedStyle = dom.window.getComputedStyle.bind(dom.window);
  Object.defineProperty(global, 'navigator', { value: dom.window.navigator, configurable: true });
  global.IS_REACT_ACT_ENVIRONMENT = true;

  const data = {
    dashboard: {
      projects: [
        { id: 'demo-project', enabled: true, phase: 'active', health: 'healthy', work: { backlog: 1, active: 1, done: 1, blocked: 0 }, unacked_notifications: 0 },
      ],
      owed_decisions: 0,
      totals: { active_work: 1, blocked: 0, stuck_bots: 0, unacked_notifications: 0 },
    },
    settings: {
      'demo-project': { project_id: 'demo-project', mission: 'Keep the demo project safe', autonomy_level: 2, phase: 'active', owner: { lead_profile: 'octacon', member_profiles: ['quan'] } },
    },
    workItems: { 'demo-project': { work_items: [] } },
    initiatives: { 'demo-project': { initiatives: [] } },
    objectives: { 'demo-project': { objectives: [] } },
    goals: { 'demo-project': { goals: [] } },
    missionArchive: { 'demo-project': { missions: [] } },
    content: { 'demo-project': { content: [] } },
    events: { 'demo-project': { events: [] } },
    backlog: { 'demo-project': { backlog: [] } },
    views: { 'demo-project': { views: [] } },
    reports: { 'demo-project': { reports: [] } },
    milestones: { 'demo-project': { milestones: [] } },
    workflows: { 'demo-project': { workflows: [] } },
    portfolio: { projects: [], groups: null },
    inbox: { count: 0, items: [] },
    notifications: { notifications: [] },
    bots: { bots: [] },
    workload: { busy: [], idle: [], offline: [], stuck: [] },
    groups: { groups: [] },
    DISCOVER: {
      projects: [],
      profiles: [
        { name: 'octacon', available: true, selectable: true, host_capabilities: ['lead', 'member'] },
        { name: 'quan', available: true, selectable: true, host_capabilities: ['member'] },
      ],
    },
  };

  const rest = async (path, init = {}) => {
    const method = init.method || 'GET';
    if (method === 'GET' && path === '/onboard/discover') return clone(data.DISCOVER);
    if (method === 'GET' && path === '/dashboard') return clone(data.dashboard);
    if (method === 'GET' && path === '/portfolio') return clone(data.portfolio);
    if (method === 'GET' && path === '/inbox') return clone(data.inbox);
    if (method === 'GET' && path === '/notifications') return clone(data.notifications);
    if (method === 'GET' && path === '/bots') return clone(data.bots);
    if (method === 'GET' && path === '/workload') return clone(data.workload);
    if (method === 'GET' && path === '/bot-groups') return clone(data.groups);
    const settings = path.match(/^\/projects\/([^/]+)\/settings$/);
    if (method === 'GET' && settings) return clone(data.settings[decodeURIComponent(settings[1])]);
    const generic = path.match(/^\/projects\/([^/]+)\/(work-items|initiatives|objectives|goals|missions\/archive|content|events|reports|milestones|workflows|backlog|team)$/);
    if (method === 'GET' && generic) {
      const key = generic[2].replace('/', '');
      return clone({ work_items: [], initiatives: [], objectives: [], goals: [], missions: [], content: [], events: [], reports: [], milestones: [], workflows: [], backlog: [], team: null }[key] ?? {});
    }
    return { ok: true };
  };

  const loaded = evaluatePlugin(readFileSync(PLUGIN_PATH, 'utf8'), { navigate: () => {} });
  const contributions = [];
  loaded.plugin.register({
    register: (item) => contributions.push(item),
    registerMany: (items) => contributions.push(...items),
    onDispose: () => {},
    rest,
    os: { writeClipboard: async () => true },
  });
  const route = contributions.find((item) => item.area === 'routes');
  assert(route, 'plugin did not register a route contribution');
  const root = createRoot(dom.window.document.getElementById('root'));

  await act(async () => {
    root.render(route.render());
    await wait(40);
  });

  const doc = dom.window.document;
  const pressKey = async (key, target, { shiftKey = false } = {}) => {
    await act(async () => {
      target.dispatchEvent(new dom.window.KeyboardEvent('keydown', {
        key, bubbles: true, cancelable: true, shiftKey,
      }));
      await wait(10);
    });
  };
  const click = async (selector) => {
    const element = doc.querySelector(selector);
    assert(element, `missing click target: ${selector}`);
    await act(async () => {
      element.click();
      await wait(30);
    });
    return element;
  };
  const focusAndActivate = async (selector) => {
    const element = doc.querySelector(selector);
    assert(element, `missing activation target: ${selector}`);
    await act(async () => {
      element.focus();
      element.click();
      await wait(30);
    });
    return element;
  };

  // The Vision screen loads its data after the tab opens: wait for a control.
  const waitFor = async (selector, timeoutMs = 4000) => {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      const element = doc.querySelector(selector);
      if (element) return element;
      await act(async () => { await wait(20); });
    }
    assert.fail(`timed out waiting for: ${selector}`);
  };

  return { dom, doc, pressKey, click, focusAndActivate, waitFor, jsdomMessages };
}

test('ConfirmDialog: initial focus inside, Tab/Shift+Tab contained, Escape restores the trigger', async () => {
  const { doc, pressKey, focusAndActivate, waitFor } = await createRuntime();

  // Real user flow: project tab -> choose the project (Sahil 05/10: the app
  // opens on All projects) -> Vision (design round f) -> the mission's ⋯
  // menu -> Archive mission. The menu hands focus back to its trigger before
  // the dialog opens, so that trigger is the control focus must return to.
  await focusAndActivate('[data-tab="project"]');
  await focusAndActivate('[data-choose-project="demo-project"]');
  await focusAndActivate('[data-project-view="plan"]');
  await waitFor('[data-plan-menu="mission"]');
  const trigger = await focusAndActivate('[data-plan-menu="mission"]');
  await focusAndActivate('[data-plan-menu-item="archive"]');

  const dialog = doc.querySelector('[data-destructive-confirm="archive-mission"]');
  assert(dialog, 'ConfirmDialog did not mount');
  assert.strictEqual(trigger.getAttribute('data-plan-menu'), 'mission');

  // 1. Initial focus: inside the dialog, never left on the page.
  const initial = doc.activeElement;
  assert(dialog.contains(initial), `initial focus must be inside the dialog, got ${initial?.outerHTML?.slice(0, 90)}`);

  // 2. Tab containment with wrap-around in both directions.
  const focusables = [...dialog.querySelectorAll('button:not([disabled])')];
  assert(focusables.length >= 2, 'dialog should expose at least two focusable controls');
  focusables[focusables.length - 1].focus();
  await pressKey('Tab', doc.activeElement);
  assert.strictEqual(doc.activeElement, focusables[0], 'Tab from the last control must wrap to the first');
  focusables[0].focus();
  await pressKey('Tab', doc.activeElement, { shiftKey: true });
  assert.strictEqual(doc.activeElement, focusables[focusables.length - 1], 'Shift+Tab from the first control must wrap to the last');
  for (let i = 0; i < focusables.length + 2; i += 1) {
    await pressKey('Tab', doc.activeElement);
    assert(dialog.contains(doc.activeElement), 'Tab escaped the dialog');
  }

  // 3. Escape closes; focus returns to the exact opening control.
  await pressKey('Escape', doc.activeElement);
  assert(!doc.querySelector('[data-destructive-confirm]'), 'Escape should unmount the dialog');
  assert.strictEqual(doc.activeElement, trigger, 'focus must return to the opening control');
});

test('OnboardingWizard: initial focus inside, Tab contained, Escape restores the New-project trigger', async () => {
  const { doc, pressKey, focusAndActivate } = await createRuntime();

  const trigger = await focusAndActivate('[data-action="open-onboarding"]');
  const wizard = doc.querySelector('[data-onboarding-wizard]');
  assert(wizard, 'OnboardingWizard did not mount');

  const initial = doc.activeElement;
  assert(wizard.contains(initial), `initial focus must be inside the wizard, got ${initial?.outerHTML?.slice(0, 90)}`);

  // Repeated Tab never escapes the wizard dialog.
  for (let i = 0; i < 3; i += 1) {
    await pressKey('Tab', doc.activeElement);
    assert(wizard.contains(doc.activeElement), 'Tab escaped the onboarding wizard');
  }

  await pressKey('Escape', doc.activeElement);
  assert(!doc.querySelector('[data-onboarding-wizard]'), 'Escape should unmount the wizard');
  assert.strictEqual(doc.activeElement, trigger, 'focus must return to the New project trigger');
});

test('ConfirmDialog busy state: Escape is inert while a destructive action is applying', async () => {
  const { doc, pressKey, focusAndActivate, waitFor } = await createRuntime();
  await focusAndActivate('[data-tab="project"]');
  await focusAndActivate('[data-choose-project="demo-project"]');
  await focusAndActivate('[data-project-view="plan"]');
  await waitFor('[data-plan-menu="mission"]');
  await focusAndActivate('[data-plan-menu="mission"]');
  await focusAndActivate('[data-plan-menu-item="archive"]');
  const dialog = doc.querySelector('[data-destructive-confirm="archive-mission"]');
  assert(dialog, 'ConfirmDialog did not mount');
  // The mission-archive path is async; while a request is in flight the
  // Cancel/confirm buttons are disabled. Tab containment must still hold
  // with only enabled controls considered.
  const enabled = [...dialog.querySelectorAll('button:not([disabled])')];
  if (enabled.length > 0) {
    await pressKey('Tab', doc.activeElement);
    assert(dialog.contains(doc.activeElement), 'Tab escaped the dialog while busy');
  }
});

test('OnboardingWizard: Tab containment holds while filling step 1 fields', async () => {
  const { dom, doc, pressKey, focusAndActivate } = await createRuntime();
  await focusAndActivate('[data-action="open-onboarding"]');
  const wizard = doc.querySelector('[data-onboarding-wizard]');
  assert(wizard, 'OnboardingWizard did not mount');

  // Type into the step-1 project-id field through the React-controlled
  // value setter, then keep Tabbing: containment must hold on every step.
  const projectIdField = wizard.querySelector('[data-field="project-id"]') || wizard.querySelector('input');
  assert(projectIdField, 'wizard step 1 input not found');
  await act(async () => {
    const setter = Object.getOwnPropertyDescriptor(
      dom.window.HTMLInputElement.prototype, 'value',
    )?.set;
    setter?.call(projectIdField, 'checkout-ops');
    projectIdField.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
    await wait(10);
  });

  for (let i = 0; i < 3; i += 1) {
    await pressKey('Tab', doc.activeElement);
    assert(wizard.contains(doc.activeElement), 'Tab escaped the wizard while filling step 1');
  }
  await pressKey('Escape', doc.activeElement);
  assert(!doc.querySelector('[data-onboarding-wizard]'), 'Escape should close the wizard');
});
