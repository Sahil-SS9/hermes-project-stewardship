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
      { id: 'demo-project', enabled: true, phase: 'active', health: 'healthy', work: { backlog: 5, active: 3, done: 3, blocked: 0 }, unacked_notifications: 0 },
      { id: 'payments-relaunch', enabled: true, phase: 'active', health: 'watch', work: { backlog: 1, active: 2, done: 1, blocked: 1 }, unacked_notifications: 1 },
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
  settings: {
    'demo-project': { project_id: 'demo-project', mission: 'Seeded demo for desktop review', autonomy_level: 1, phase: 'active' },
    'payments-relaunch': { project_id: 'payments-relaunch', mission: 'Checkout reliability rebuild', autonomy_level: 1, phase: 'active' },
  },
  workItems: {
    'demo-project': { work_items: [
      { ref: 'HDY-1', title: 'Design onboarding wizard', status: 'backlog', assignee: 'sahil', evidence_refs: [] },
      { ref: 'HDY-4', title: 'Wire bot registry to UI', status: 'in_progress', assignee: 'octacon-bot', evidence_refs: ['EV-1'] },
      { ref: 'HDY-5', title: 'Audit trail review', status: 'done', assignee: 'quan-bot', evidence_refs: ['EV-2'] },
    ] },
    'payments-relaunch': { work_items: [
      { ref: 'HDY-12', title: 'Fix double-charge on retry path', status: 'in_progress', assignee: 'octacon-bot', evidence_refs: ['EV-3'] },
      { ref: 'HDY-13', title: 'Add payment idempotency keys', status: 'backlog', assignee: 'octacon-bot', evidence_refs: [] },
      { ref: 'HDY-14', title: 'Load-test the new checkout flow', status: 'in_review', assignee: 'quan-bot', evidence_refs: ['EV-4'] },
      { ref: 'HDY-15', title: 'Retire legacy webhook listener', status: 'done', assignee: 'sahil', evidence_refs: [] },
    ] },
  },
  initiatives: {
    'demo-project': { initiatives: [
      { ref: 'INI-DEMO-1', project_id: 'demo-project', title: 'Add weekly digest email', rationale: 'Keeps stakeholders informed without opening another surface.', expected_outcome: 'A concise weekly project summary reaches the owner.', validation_contract: { tests: 'digest rendering and delivery check' }, risk: 'low', priority: 1, status: 'pending_approval', approval_state: 'pending', created_at: '2026-08-24T18:00:00+00:00' },
    ] },
    'payments-relaunch': { initiatives: [
      { ref: 'INI-DEMO-2', project_id: 'payments-relaunch', title: 'Enable one-click refunds', rationale: 'Support requests drop when refunds are self-service; rollback is a feature flag.', expected_outcome: 'Refund requests complete without support intervention.', validation_contract: { steps: ['verify feature flag rollback', 'run checkout suite'], tests: 'checkout and refund test suite' }, risk: 'medium', priority: 2, status: 'pending_approval', approval_state: 'pending', created_at: '2026-08-24T18:36:03+00:00' },
    ] },
  },
  events: {
    'demo-project': { events: [] },
    'payments-relaunch': { events: [] },
  },
  backlog: {
    'demo-project': { backlog: [] },
    'payments-relaunch': { backlog: [
      { item_ref: 'HDY-13', rank: 1, priority_reason: 'Prevents duplicate payment intent', aged_since: '2026-08-24T18:36:03+00:00' },
      { item_ref: 'HDY-12', rank: 2, priority_reason: 'Verified retry-path regression', aged_since: '2026-08-24T18:36:03+00:00' },
    ] },
  },
  views: {
    'demo-project': { views: [] },
    'payments-relaunch': { views: [{ name: 'Release focus', layout: 'board', filters: { status: 'in_progress' }, shared: false }] },
  },
  bots: {
    bots: [
      { id: 'octacon-bot', name: 'Octacon', status: 'busy', current_item: 'HDY-12', capabilities: ['build'] },
      { id: 'quan-bot', name: 'Quan', status: 'idle', current_item: null, capabilities: ['verification'] },
      { id: 'wesker-bot', name: 'Wesker', status: 'idle', current_item: null, capabilities: ['operations'] },
    ],
  },
  workload: {
    busy: [{ bot: 'octacon-bot', item: 'HDY-12' }],
    idle: [{ bot: 'quan-bot', item: null }, { bot: 'wesker-bot', item: null }],
    offline: [],
    stuck: [],
  },
  groups: {
    groups: [{ name: 'release-crew', purpose: 'Coordinate checkout release', channel_ref: null, lead: 'octacon-bot', members: ['octacon-bot', 'quan-bot'] }],
  },
  groupMessages: {
    'release-crew': { messages: [{ id: 1, from_actor: 'octacon-bot', msg_type: 'handoff', payload: { summary: 'Release evidence ready for verification' }, created_at: '2026-08-24T18:40:00+00:00' }] },
  },
};

const EMPTY = {
  dashboard: { projects: [], owed_decisions: 0, totals: { active_work: 0, blocked: 0, stuck_bots: 0, unacked_notifications: 0 } },
  inbox: { count: 0, items: [] },
  notifications: { notifications: [] },
  settings: {},
  workItems: {},
  initiatives: {},
  events: {},
  backlog: {},
  views: {},
  bots: { bots: [] },
  workload: { busy: [], idle: [], offline: [], stuck: [] },
  groups: { groups: [] },
  groupMessages: {},
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

async function createRuntime({ mode = 'populated', failOnce = false, failMutationPath = null } = {}) {
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
    if (method !== 'GET' && failMutationPath === path) {
      throw new Error('Synthetic mutation failure');
    }
    if (shouldFail && method === 'GET') {
      shouldFail = false;
      throw new Error('Synthetic service failure');
    }
    if (mode === 'loading' && method === 'GET' && path === '/dashboard') return deferred.promise;
    if (method === 'POST' && path === '/onboard') {
      const projectId = init.body?.project_id || 'new-project';
      data.dashboard.projects.push({ id: projectId, enabled: true, phase: 'active', health: 'unknown', work: { backlog: 0, active: 0, done: 0, blocked: 0 }, unacked_notifications: 0 });
      data.settings[projectId] = { project_id: projectId, mission: init.body?.mission || '', autonomy_level: 2, phase: 'active' };
      data.workItems[projectId] = { work_items: [] };
      data.initiatives[projectId] = { initiatives: [] };
      data.events[projectId] = { events: [] };
      data.backlog[projectId] = { backlog: [] };
      data.views[projectId] = { views: [] };
      return { project_id: projectId, screen: 's2', group: `${projectId}-ops` };
    }
    if (method === 'POST' && path.startsWith('/initiatives/') && path.endsWith('/approve')) {
      const ref = decodeURIComponent(path.split('/')[2]);
      data.inbox.items = data.inbox.items.filter((item) => item.ref !== ref);
      data.inbox.count = data.inbox.items.length;
      data.dashboard.owed_decisions = data.inbox.count;
      return { ok: true, ref, status: 'approved' };
    }
    if (method === 'POST' && path.startsWith('/initiatives/') && path.endsWith('/reject')) {
      const ref = decodeURIComponent(path.split('/')[2]);
      data.inbox.items = data.inbox.items.filter((item) => item.ref !== ref);
      data.inbox.count = data.inbox.items.length;
      data.dashboard.owed_decisions = data.inbox.count;
      return { ok: true, ref, status: 'rejected' };
    }
    if (method === 'POST' && path.startsWith('/notifications/') && path.endsWith('/ack')) {
      const id = Number(path.split('/')[2]);
      const item = data.notifications.notifications.find((note) => note.id === id);
      if (item) item.acked = true;
      data.dashboard.totals.unacked_notifications = data.notifications.notifications.filter((note) => !note.acked).length;
      return { ok: true, id, acked: true };
    }
    const rerank = path.match(/^\/projects\/([^/]+)\/backlog\/([^/]+)\/rerank$/);
    if (method === 'POST' && rerank) {
      const projectId = decodeURIComponent(rerank[1]);
      const ref = decodeURIComponent(rerank[2]);
      const entry = data.backlog[projectId]?.backlog.find((item) => item.item_ref === ref);
      if (entry) {
        entry.rank = Number(init.body?.new_rank ?? entry.rank);
        entry.priority_reason = init.body?.reason ?? entry.priority_reason;
        data.backlog[projectId].backlog.sort((left, right) => left.rank - right.rank);
      }
      return { ref, rank: entry?.rank ?? null };
    }
    const saveView = path.match(/^\/projects\/([^/]+)\/views$/);
    if (method === 'PUT' && saveView) {
      const projectId = decodeURIComponent(saveView[1]);
      data.views[projectId] ??= { views: [] };
      data.views[projectId].views = data.views[projectId].views.filter((view) => view.name !== init.body?.name);
      data.views[projectId].views.push({ ...init.body });
      return { name: init.body?.name, layout: init.body?.layout };
    }
    if (path === '/dashboard') return clone(data.dashboard);
    if (path === '/inbox') return clone(data.inbox);
    if (path === '/notifications') return clone(data.notifications);
    if (path === '/bots') return clone(data.bots);
    if (path === '/workload') return clone(data.workload);
    if (path === '/bot-groups') return clone(data.groups);
    const groupMessages = path.match(/^\/bot-groups\/([^/]+)\/messages$/);
    if (groupMessages) return clone(data.groupMessages[decodeURIComponent(groupMessages[1])] ?? { messages: [] });
    const projectRead = path.match(/^\/projects\/([^/]+)\/(settings|work-items|initiatives|events|backlog|views)$/);
    if (projectRead) {
      const projectId = decodeURIComponent(projectRead[1]);
      const kind = projectRead[2];
      if (kind === 'settings') return clone(data.settings[projectId] ?? { project_id: projectId, mission: '', phase: 'active' });
      if (kind === 'work-items') return clone(data.workItems[projectId] ?? { work_items: [] });
      if (kind === 'initiatives') return clone(data.initiatives[projectId] ?? { initiatives: [] });
      if (kind === 'events') return clone(data.events[projectId] ?? { events: [] });
      if (kind === 'backlog') return clone(data.backlog[projectId] ?? { backlog: [] });
      if (kind === 'views') return clone(data.views[projectId] ?? { views: [] });
    }
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
  const setValue = async (selector, value, ms = 10) => {
    const element = dom.window.document.querySelector(selector);
    assert(element, `missing value target: ${selector}`);
    const prototype = element instanceof dom.window.HTMLTextAreaElement
      ? dom.window.HTMLTextAreaElement.prototype
      : element instanceof dom.window.HTMLSelectElement
        ? dom.window.HTMLSelectElement.prototype
        : dom.window.HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set;
    assert(setter, `value setter unavailable for: ${selector}`);
    await act(async () => {
      const previous = element.value;
      setter.call(element, value);
      element._valueTracker?.setValue(previous);
      element.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
      element.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
      await wait(ms);
    });
  };
  const dispose = async () => {
    await act(async () => { root.unmount(); });
    dom.window.close();
  };

  return { dom, loaded, contributions, calls, navigations, data, deferred, jsdomMessages, mount, flush, click, setValue, dispose };
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

async function testReferenceBenchmarkDashboardComposition() {
  const runtime = await createRuntime();
  await runtime.mount();
  await runtime.flush(60);
  const doc = runtime.dom.window.document;

  assert.equal(doc.querySelectorAll('[data-attention-decision]').length, 2, 'attention card must show the actual owner decisions, not only a count');
  assert.equal(doc.querySelectorAll('[data-metric]').length, 4, 'dashboard must expose a four-part metric strip');
  assert(doc.querySelector('[data-portfolio-visual]'), 'dashboard is missing a project-style work distribution visualisation');
  assert.equal(doc.querySelectorAll('[data-work-visual]').length, 2, 'each project must expose a compact delivery mix visual');
  assert(doc.querySelector('[data-fleet-activity]'), 'dashboard is missing the separated fleet activity card');
  assert.match(doc.querySelector('[data-fleet-activity]').textContent, /Load test flagged latency spike/);
  assert.match(doc.body.textContent, /bot workload/i);
  assert.match(doc.body.textContent, /Checkout reliability rebuild/);

  const projectRows = [...doc.querySelectorAll('[data-project-row]')];
  assert.equal(projectRows[0]?.getAttribute('data-project-row'), 'payments-relaunch', 'projects must be ordered by attention severity, not alphabetically');

  for (const path of [
    '/inbox', '/notifications', '/bots', '/workload',
    '/projects/demo-project/settings', '/projects/demo-project/work-items',
    '/projects/payments-relaunch/settings', '/projects/payments-relaunch/work-items',
  ]) {
    assert(runtime.calls.some((call) => call.method === 'GET' && call.path === path), `dashboard did not load supported context: ${path}`);
  }
  await runtime.dispose();
}

async function testReferenceBenchmarkApprovalCardsAndReject() {
  const runtime = await createRuntime();
  await runtime.mount();
  await runtime.click('[data-tab="inbox"]', 60);
  const doc = runtime.dom.window.document;

  const cards = [...doc.querySelectorAll('[data-approval-card]')];
  assert.equal(cards.length, 2, 'each approval must be a separated decision card');
  assert.equal(cards[0]?.getAttribute('data-approval-ref'), 'INI-DEMO-2', 'approval cards must be risk ordered');
  for (const card of cards) {
    assert.equal(card.querySelectorAll('[data-evidence-cell]').length, 3, 'approval card must expose three evidence/context cells');
    assert(card.querySelector('[data-action="reject"]'), 'approval card is missing the supported Reject action');
    assert(card.querySelector('[data-action="toggle-evidence"]'), 'approval card is missing evidence disclosure');
  }
  assert.match(cards[0].textContent, /Support requests drop when refunds are self-service/);
  assert(runtime.calls.some((call) => call.path === '/projects/payments-relaunch/initiatives'), 'approval view did not load initiative detail supported by the backend');

  await runtime.click('[data-approval-ref="INI-DEMO-2"] [data-action="toggle-evidence"]');
  assert.equal(doc.querySelector('[data-approval-ref="INI-DEMO-2"] [data-evidence-details]')?.hidden, false, 'evidence disclosure did not open');

  await runtime.click('[data-approval-ref="INI-DEMO-2"] [data-action="reject"]', 40);
  assert.equal(doc.querySelector('[data-approval-ref="INI-DEMO-2"]')?.getAttribute('data-state'), 'rejected', 'rejection state was not shown');
  assert(runtime.calls.some((call) => call.method === 'POST' && call.path === '/initiatives/INI-DEMO-2/reject'), 'rejection POST was not sent');
  await runtime.flush(1000);
  assert(!doc.body.textContent.includes('Enable one-click refunds'), 'rejected item remains visible after refresh');
  await runtime.dispose();
}

async function testProjectDashboardScreen() {
  const runtime = await createRuntime();
  await runtime.mount();
  await runtime.click('[data-tab="project"]', 80);
  const doc = runtime.dom.window.document;
  assert(doc.querySelector('[data-project-dashboard]'), 'project dashboard screen is missing');
  assert.match(doc.body.textContent, /Checkout reliability rebuild/);
  assert.equal(doc.querySelectorAll('[data-project-view]').length, 5, 'project dashboard must expose five supported views');
  assert(doc.querySelector('[data-project-visual]'), 'project overview is missing work visualisation');
  assert(doc.querySelector('[data-overview-work]'), 'project overview is missing current work context');
  assert(doc.querySelector('[data-overview-initiatives]'), 'project overview is missing initiative context');
  assert(doc.querySelector('[data-overview-activity]'), 'project overview is missing attributed activity context');
  assert.match(doc.querySelector('[data-overview-work]').textContent, /Fix double-charge on retry path/);
  await runtime.click('[data-project-view="board"]');
  assert.equal(doc.querySelectorAll('[data-board-column]').length, 4, 'project board must expose backlog, active, review and done columns');
  assert(doc.querySelectorAll('[data-work-card]').length >= 3, 'project board did not render backend work items');
  for (const path of [
    '/projects/payments-relaunch/settings',
    '/projects/payments-relaunch/work-items',
    '/projects/payments-relaunch/initiatives',
    '/projects/payments-relaunch/events',
  ]) {
    assert(runtime.calls.some((call) => call.path === path), `project screen did not load supported context: ${path}`);
  }
  await runtime.dispose();
}

async function testBacklogBoardAndReasonGate() {
  const runtime = await createRuntime();
  await runtime.mount();
  await runtime.click('[data-tab="backlog"]', 80);
  const doc = runtime.dom.window.document;
  assert(doc.querySelector('[data-backlog-board]'), 'prioritised backlog screen is missing');
  assert.equal(doc.querySelectorAll('[data-backlog-item]').length, 2, 'backlog items did not render');
  assert([...doc.querySelectorAll('[data-backlog-item]')].every((item) => item.draggable), 'backlog rows must be draggable');
  await runtime.click('[data-rerank-ref="HDY-13"][data-direction="down"]');
  const modal = doc.querySelector('[data-reason-modal]');
  assert(modal && !modal.hidden, 'rank change did not open the mandatory reason-capture modal');
  assert(modal.querySelector('textarea'), 'reason modal is missing its reason field');
  assert(runtime.calls.some((call) => call.path === '/projects/payments-relaunch/backlog'), 'backlog screen did not use the backend route');
  await runtime.dispose();
}

async function testBotTeamsScreen() {
  const runtime = await createRuntime();
  await runtime.mount();
  await runtime.click('[data-tab="teams"]', 80);
  const doc = runtime.dom.window.document;
  assert(doc.querySelector('[data-bot-teams]'), 'bot teams screen is missing');
  assert.equal(doc.querySelectorAll('[data-bot-card]').length, 3, 'bot registry did not render');
  assert(doc.querySelector('[data-workload-visual]'), 'workload visualisation is missing');
  assert(doc.querySelector('[data-bot-group="release-crew"]'), 'bot group card did not render');
  assert.match(doc.body.textContent, /Release evidence ready for verification/);
  for (const path of ['/bots', '/workload', '/bot-groups', '/bot-groups/release-crew/messages']) {
    assert(runtime.calls.some((call) => call.path === path), `bot teams did not load supported context: ${path}`);
  }
  await runtime.dispose();
}

async function testInitiativeLoopScreen() {
  const runtime = await createRuntime();
  await runtime.mount();
  await runtime.click('[data-tab="initiative"]', 80);
  const doc = runtime.dom.window.document;
  assert(doc.querySelector('[data-initiative-loop]'), 'initiative loop screen is missing');
  assert(doc.querySelector('svg[data-loop-visual]'), 'initiative loop visualisation is missing');
  assert(doc.querySelectorAll('[data-initiative-stage]').length >= 7, 'canonical loop stages are incomplete');
  assert(doc.querySelector('[data-action="freeze-project"]'), 'safe freeze control is missing');
  assert.match(doc.body.textContent, /Support requests drop when refunds are self-service/);
  await runtime.dispose();
}

async function testWorkflowsScreenAndCreator() {
  const runtime = await createRuntime();
  await runtime.mount();
  await runtime.click('[data-tab="workflows"]', 80);
  const doc = runtime.dom.window.document;
  assert(doc.querySelector('[data-workflows-screen]'), 'workflows screen is missing');
  assert(doc.querySelector('[data-workflow-visual]'), 'workflow visualisation is missing');
  assert.equal(doc.querySelectorAll('[data-saved-workflow]').length, 1, 'saved workflow/view did not render');
  assert(doc.querySelector('[data-workflow-creator]'), 'workflow creator is missing');
  assert(runtime.calls.some((call) => call.path === '/projects/payments-relaunch/views'), 'workflows screen did not load saved backend views');
  await runtime.dispose();
}

async function testOnboardingWizardAndToastSurface() {
  const runtime = await createRuntime();
  await runtime.mount();
  const doc = runtime.dom.window.document;
  assert(doc.querySelector('[data-toast-region]'), 'toast feedback region is missing');
  await runtime.click('[data-action="open-onboarding"]');
  const wizard = doc.querySelector('[data-onboarding-wizard]');
  assert(wizard && !wizard.hidden, 'onboarding wizard did not open');
  assert.equal(wizard.querySelectorAll('[data-wizard-step]').length, 4, 'onboarding wizard must expose four steps');
  assert(wizard.querySelector('[role="progressbar"]'), 'wizard progress semantics are missing');
  await runtime.setValue('[data-field="project-id"]', 'checkout-ops');
  await runtime.setValue('[data-field="repo-path"]', '/home/sahil/repos/checkout');
  await runtime.click('[data-action="wizard-next"]');
  assert.equal(wizard.querySelector('[data-wizard-step].active')?.getAttribute('data-wizard-step'), '2', 'wizard did not advance');
  await runtime.setValue('[data-field="mission"]', 'Reduce payment failures without weakening release gates.');
  await runtime.click('[data-action="wizard-next"]');
  await runtime.setValue('[data-field="lead-profile"]', 'octacon');
  await runtime.click('[data-action="wizard-next"]');
  assert.equal(wizard.querySelector('[data-wizard-step].active')?.getAttribute('data-wizard-step'), '4', 'wizard did not reach review');
  assert.match(wizard.textContent, /checkout-ops/);
  await runtime.click('[data-action="submit-onboarding"]', 80);
  const onboard = runtime.calls.find((call) => call.method === 'POST' && call.path === '/onboard');
  assert.deepEqual(onboard?.body, {
    project_id: 'checkout-ops',
    repo_path: '/home/sahil/repos/checkout',
    mission: 'Reduce payment failures without weakening release gates.',
    lead_profile: 'octacon',
  }, 'wizard did not submit the supported onboarding contract');
  assert(!doc.querySelector('[data-onboarding-wizard]'), 'wizard remained open after successful onboarding');
  assert.match(doc.querySelector('[data-toast-region]')?.textContent || '', /Project checkout-ops onboarded/);
  assert.equal(doc.querySelector('[role="tab"][aria-selected="true"]')?.getAttribute('data-tab'), 'project', 'successful onboarding did not open the new project');
  await runtime.dispose();

  const failed = await createRuntime({ failMutationPath: '/initiatives/INI-DEMO-1/reject' });
  await failed.mount();
  await failed.click('[data-tab="inbox"]');
  await failed.click('[data-approval-ref="INI-DEMO-1"] [data-action="reject"]', 80);
  const failedDoc = failed.dom.window.document;
  const failedRow = failedDoc.querySelector('[data-approval-ref="INI-DEMO-1"]');
  const alert = failedDoc.querySelector('[data-toast-region] [role="alert"]');
  assert(alert, 'failed mutation did not create an alert toast');
  assert.equal(failedRow?.getAttribute('data-state'), 'failed', 'failed rejection did not show an unconfirmed state');
  assert.match(failedRow?.textContent || '', /Decision unconfirmed/);
  assert.match(alert.textContent, /Reject was not recorded.*still pending/);
  assert(!alert.textContent.includes('Error invoking remote method'), 'raw host error leaked into the user status');
  await failed.dispose();
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

  await runtime.click('[data-approval-ref="INI-DEMO-2"] [data-action="reject"]', 40);
  assert.equal(doc.querySelector('[data-approval-ref="INI-DEMO-2"]')?.getAttribute('data-state'), 'rejected', 'rejection row did not show its rejected state');
  assert(runtime.calls.some((call) => call.method === 'POST' && call.path === '/initiatives/INI-DEMO-2/reject'), 'rejection POST was not sent');
  assert.match(doc.querySelector('[data-approval-ref="INI-DEMO-2"]')?.textContent || '', /Rejected/);
  await runtime.flush(1000);
  assert.equal(doc.querySelectorAll('[data-approval-ref]').length, 0, 'rejected item did not leave the queue after refresh');
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
  assert.equal(doc.querySelector('[role="tab"][aria-selected="true"]')?.getAttribute('data-tab'), 'project', 'ArrowRight did not select the next tab');
  assert.equal(doc.activeElement?.getAttribute('data-tab'), 'project', 'keyboard tab navigation did not move focus');
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

async function writeSnapshot(tab, target, { onboarding = false } = {}) {
  const runtime = await createRuntime();
  await runtime.mount();
  if (tab !== 'dashboard') await runtime.click(`[data-tab="${tab}"]`);
  if (onboarding) await runtime.click('[data-action="open-onboarding"]');
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
    project: '/tmp/dockyard-project.html',
    backlog: '/tmp/dockyard-backlog.html',
    teams: '/tmp/dockyard-teams.html',
    initiative: '/tmp/dockyard-initiative.html',
    workflows: '/tmp/dockyard-workflows.html',
    inbox: '/tmp/dockyard-inbox.html',
    notifications: '/tmp/dockyard-notifications.html',
    onboarding: '/tmp/dockyard-onboarding.html',
  };
  await writeSnapshot('dashboard', snapshots.dashboard);
  await writeSnapshot('project', snapshots.project);
  await writeSnapshot('backlog', snapshots.backlog);
  await writeSnapshot('teams', snapshots.teams);
  await writeSnapshot('initiative', snapshots.initiative);
  await writeSnapshot('workflows', snapshots.workflows);
  await writeSnapshot('inbox', snapshots.inbox);
  await writeSnapshot('notifications', snapshots.notifications);
  await writeSnapshot('dashboard', snapshots.onboarding, { onboarding: true });

  const specs = [
    { name: 'dashboard-700-light', file: snapshots.dashboard, width: 700, height: 1000, scheme: 'light' },
    { name: 'dashboard-1000-light', file: snapshots.dashboard, width: 1000, height: 1000, scheme: 'light' },
    { name: 'dashboard-1600-light', file: snapshots.dashboard, width: 1600, height: 1000, scheme: 'light' },
    { name: 'dashboard-1200-dark', file: snapshots.dashboard, width: 1200, height: 900, scheme: 'dark' },
    { name: 'project-1400-light', file: snapshots.project, width: 1400, height: 1000, scheme: 'light' },
    { name: 'backlog-1400-dark', file: snapshots.backlog, width: 1400, height: 1000, scheme: 'dark' },
    { name: 'teams-1400-light', file: snapshots.teams, width: 1400, height: 1000, scheme: 'light' },
    { name: 'initiative-1400-dark', file: snapshots.initiative, width: 1400, height: 1000, scheme: 'dark' },
    { name: 'workflows-1400-light', file: snapshots.workflows, width: 1400, height: 1000, scheme: 'light' },
    { name: 'inbox-1200-light', file: snapshots.inbox, width: 1200, height: 900, scheme: 'light' },
    { name: 'notifications-1200-dark', file: snapshots.notifications, width: 1200, height: 900, scheme: 'dark' },
    { name: 'onboarding-1200-light', file: snapshots.onboarding, width: 1200, height: 900, scheme: 'light' },
    { name: 'onboarding-480-dark', file: snapshots.onboarding, width: 480, height: 900, scheme: 'dark' },
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
          clippedProjectRows: [...document.querySelectorAll('[data-project-row]')].filter((row) => row.scrollWidth > row.clientWidth + 1).length,
          clippedProjectText: [...document.querySelectorAll('.dockyard-project-name strong, .dockyard-project-mission')].filter((node) => node.scrollWidth > node.clientWidth + 1 || node.scrollHeight > node.clientHeight + 1).length,
          misalignedProjectIcons: [...document.querySelectorAll('.dockyard-project-name')].filter((name) => {
            const icon = name.querySelector('.dockyard-project-icon');
            if (!icon) return true;
            const parentBox = name.getBoundingClientRect();
            const iconBox = icon.getBoundingClientRect();
            return Math.abs((parentBox.top + parentBox.height / 2) - (iconBox.top + iconBox.height / 2)) > 1;
          }).length,
          projectIconDisplays: [...new Set([...document.querySelectorAll('.dockyard-project-icon')].map((icon) => getComputedStyle(icon).display))],
          activeScreen: document.querySelector('[role="tabpanel"]')?.getAttribute('aria-labelledby') || null,
          dialogCount: [...document.querySelectorAll('[role="dialog"][aria-modal="true"]')].filter((dialog) => dialog.getClientRects().length > 0).length,
          clippedLoopVisuals: [...document.querySelectorAll('.dockyard-loop-visual-wrap, .dockyard-workflow-visual')].filter((visual) => visual.scrollWidth > visual.clientWidth + 1).length,
        };
      });
      assert(measure.documentWidth <= spec.width, `${spec.name} overflows horizontally: ${measure.documentWidth}px > ${spec.width}px`);
      assert.equal(measure.clippedProjectRows, 0, `${spec.name} clips project-row content`);
      assert.equal(measure.clippedProjectText, 0, `${spec.name} clips project names or mission text`);
      assert.equal(measure.misalignedProjectIcons, 0, `${spec.name} misaligns Project-column icons`);
      if (measure.projectRows > 0) assert.deepEqual(measure.projectIconDisplays, ['grid'], `${spec.name} project icons lost their centring layout`);
      assert(!measure.rootFont.includes('Times New Roman'), `${spec.name} inherited Times New Roman`);
      const expectedTab = spec.name.startsWith('onboarding-') ? 'dashboard' : spec.name.split('-')[0];
      assert.equal(measure.activeScreen, `dockyard-tab-${expectedTab}`, `${spec.name} captured the wrong active screen`);
      assert.equal(measure.dialogCount, spec.name.startsWith('onboarding-') ? 1 : 0, `${spec.name} has the wrong modal-dialog state`);
      if (spec.width >= 1200) assert.equal(measure.clippedLoopVisuals, 0, `${spec.name} requires horizontal scrolling for a primary workflow visual`);
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
  ['reference benchmark dashboard composition', testReferenceBenchmarkDashboardComposition],
  ['reference benchmark approval cards and reject', testReferenceBenchmarkApprovalCardsAndReject],
  ['project dashboard screen', testProjectDashboardScreen],
  ['backlog board and reason gate', testBacklogBoardAndReasonGate],
  ['bot teams screen', testBotTeamsScreen],
  ['initiative loop screen', testInitiativeLoopScreen],
  ['workflows screen and creator', testWorkflowsScreenAndCreator],
  ['onboarding wizard and toast surface', testOnboardingWizardAndToastSurface],
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
