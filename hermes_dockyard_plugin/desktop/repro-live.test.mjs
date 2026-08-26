// Dockyard desktop runtime harness.
// Exercises real React effects in jsdom, write interactions, every UI state,
// CSS parsing, contrast metadata and Chromium layout at 700px and 1600px.
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const DESKTOP_PACKAGE = '/home/kensei/repos/hermes-agent-vanilla/apps/desktop/package.json';
// Resolve the candidate plugin relative to this harness so a clean worktree
// tests its own file, never a live checkout. DOCKYARD_PLUGIN_PATH overrides.
const PLUGIN_PATH = process.env.DOCKYARD_PLUGIN_PATH
  || fileURLToPath(new URL('./plugin.js', import.meta.url));
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
    'demo-project': {
      project_id: 'demo-project', enabled: true, mission: 'Seeded demo for desktop review', autonomy_level: 1, phase: 'active',
      owner: { lead_profile: 'octacon', member_profiles: ['quan'] },
      policies: { autonomy: {}, verification: { require_tests: true, max_open_initiatives: 3 }, release: { require_rollback: true, soak_hours: 24 }, notification: { severity_threshold: 'medium', digest: 'daily' } },
    },
    'payments-relaunch': {
      project_id: 'payments-relaunch', enabled: true, mission: 'Checkout reliability rebuild', autonomy_level: 1, phase: 'active',
      owner: { lead_profile: 'octacon', member_profiles: ['quan', 'wesker'] },
      policies: { autonomy: {}, verification: { require_tests: true, max_open_initiatives: 2 }, release: { require_rollback: true, soak_hours: 12 }, notification: { severity_threshold: 'high', digest: 'immediate' } },
    },
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
  objectives: {
    'demo-project': { objectives: [] },
    'payments-relaunch': { objectives: [
      { id: 11, project_id: 'payments-relaunch', name: 'Checkout reliability', description: 'Keep payment retries safe.', evaluator_type: 'manual', target: '>=1', severity: 'high', enabled: true, command: null, integration: null, window: '30d' },
      { id: 12, project_id: 'payments-relaunch', name: 'Legacy webhook parity', description: 'Archived after the replacement shipped.', evaluator_type: 'manual', target: '>=1', severity: 'low', enabled: false, command: null, integration: null, window: '30d' },
    ] },
  },
  missionArchive: {
    'demo-project': { missions: [] },
    'payments-relaunch': { missions: [{ archive_id: 'MISSION-DEMO1', project_id: 'payments-relaunch', mission: 'Stabilise the legacy checkout', archived_by: 'sahil', archived_at: '2026-08-20T12:00:00+00:00' }] },
  },
  content: {
    'demo-project': { content: [] },
    'payments-relaunch': { content: [{ content_id: 'CONTENT-DEMO1', project_id: 'payments-relaunch', filename: 'release-runbook.md', media_type: 'text/markdown', size_bytes: 48, sha256: 'a'.repeat(64), uploaded_by: 'sahil', uploaded_at: '2026-08-24T19:10:00+00:00' }] },
  },
  contentPreviews: {
    'CONTENT-DEMO1': { content_id: 'CONTENT-DEMO1', project_id: 'payments-relaunch', filename: 'release-runbook.md', media_type: 'text/markdown', size_bytes: 48, sha256: 'a'.repeat(64), uploaded_by: 'sahil', uploaded_at: '2026-08-24T19:10:00+00:00', preview_kind: 'text', text: '# Release runbook\n\nUse the rollback gate.\n', truncated: false },
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
  reports: {
    'demo-project': { reports: [] },
    'payments-relaunch': { reports: [{ report_id: 'RPT-DEMO1', project_id: 'payments-relaunch', report_type: 'executive', title: 'payments-relaunch executive report', generated_by: 'sahil', generated_at: '2026-08-24T19:00:00+00:00' }] },
  },
  reportDetails: {
    'RPT-DEMO1': { report_id: 'RPT-DEMO1', project_id: 'payments-relaunch', report_type: 'executive', title: 'payments-relaunch executive report', content: '# payments-relaunch executive report\n\n## Delivery\n\n- In progress: 2\n', generated_by: 'sahil', generated_at: '2026-08-24T19:00:00+00:00' },
  },
  bots: {
    bots: [
      { id: 'octacon-bot', name: 'Octacon', status: 'busy', current_item: 'HDY-12', capabilities: ['build'] },
      { id: 'quan-bot', name: 'Quan', status: 'idle', current_item: null, capabilities: ['verification'] },
      { id: 'wesker-bot', name: 'Wesker', status: 'idle', current_item: null, capabilities: ['operations'] },
    ],
  },
  botSessions: {
    'octacon-bot': { bot_id: 'octacon-bot', profile: 'octacon', available: true, scope_note: 'System prompts and private reasoning are excluded.', sessions: [{ session_id: 'sess-octacon-1', title: 'Fix release gate', source: 'discord', model: 'gpt-test', status: 'active', message_count: 3, tool_call_count: 1, last_activity_at: '2026-08-24T18:55:00+00:00' }] },
    'quan-bot': { bot_id: 'quan-bot', profile: 'quan', available: false, scope_note: 'System prompts and private reasoning are excluded.', sessions: [] },
    'wesker-bot': { bot_id: 'wesker-bot', profile: 'wesker', available: true, scope_note: 'System prompts and private reasoning are excluded.', sessions: [] },
  },
  transcripts: {
    'octacon-bot/sess-octacon-1': { bot_id: 'octacon-bot', profile: 'octacon', scope_note: 'System prompts and private reasoning are excluded.', session: { session_id: 'sess-octacon-1', title: 'Fix release gate', source: 'discord', model: 'gpt-test' }, messages: [
      { message_id: 1, role: 'user', content: 'Run the release checks', timestamp: '2026-08-24T18:50:00+00:00', truncated: false },
      { message_id: 2, role: 'assistant', content: 'Running the focused suite.', timestamp: '2026-08-24T18:51:00+00:00', truncated: false },
      { message_id: 3, role: 'tool', tool_name: 'terminal', content: '12 tests passed', timestamp: '2026-08-24T18:52:00+00:00', truncated: false },
    ] },
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
  objectives: {},
  missionArchive: {},
  content: {},
  contentPreviews: {},
  events: {},
  backlog: {},
  views: {},
  reports: {},
  reportDetails: {},
  bots: { bots: [] },
  botSessions: {},
  transcripts: {},
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
  global.FileReader = dom.window.FileReader;
  global.File = dom.window.File;
  global.Blob = dom.window.Blob;
  global.MutationObserver = dom.window.MutationObserver;
  global.getComputedStyle = dom.window.getComputedStyle.bind(dom.window);
  Object.defineProperty(global, 'navigator', { value: dom.window.navigator, configurable: true });
  global.IS_REACT_ACT_ENVIRONMENT = true;

  const calls = [];
  const navigations = [];
  const clipboardWrites = [];
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
      data.objectives[projectId] = { objectives: [] };
      data.missionArchive[projectId] = { missions: [] };
      data.content[projectId] = { content: [] };
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
    const createQueued = path.match(/^\/projects\/([^/]+)\/backlog\/items$/);
    if (method === 'POST' && createQueued) {
      const projectId = decodeURIComponent(createQueued[1]);
      const rank = Number(init.body?.rank ?? 1);
      data.workItems[projectId] ??= { work_items: [] };
      data.backlog[projectId] ??= { backlog: [] };
      const ref = `HDY-${16 + data.workItems[projectId].work_items.length}`;
      for (const entry of data.backlog[projectId].backlog) {
        if (Number(entry.rank) >= rank) entry.rank = Number(entry.rank) + 1;
      }
      const item = {
        ref,
        type: init.body?.type ?? 'task',
        title: init.body?.title,
        status: 'backlog',
        assignee: init.body?.assignee_id,
        created_by: 'sahil',
        initiative_ref: init.body?.initiative_ref || null,
        priority_rank: rank,
        evidence_refs: [],
      };
      data.workItems[projectId].work_items.push(item);
      data.backlog[projectId].backlog.push({
        item_ref: ref,
        rank,
        priority_reason: init.body?.reason,
        aged_since: '2026-08-25T12:00:00+00:00',
      });
      data.backlog[projectId].backlog.sort((left, right) => left.rank - right.rank);
      return { ...item, rank, priority_reason: init.body?.reason };
    }
    const lifecycle = path.match(/^\/projects\/([^/]+)\/(disable|re-enable|pause|resume|freeze)$/);
    if (method === 'POST' && lifecycle) {
      const projectId = decodeURIComponent(lifecycle[1]);
      const action = lifecycle[2];
      const settings = data.settings[projectId];
      const project = data.dashboard.projects.find((candidate) => candidate.id === projectId);
      if (action === 'disable') settings.enabled = false;
      if (action === 're-enable') { settings.enabled = true; settings.phase = 'active'; }
      if (action === 'pause') settings.phase = 'paused';
      if (action === 'resume') settings.phase = 'active';
      if (action === 'freeze') settings.phase = 'frozen';
      if (project) { project.enabled = settings.enabled; project.phase = settings.phase; }
      return clone(settings);
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
    const updateSettings = path.match(/^\/projects\/([^/]+)\/settings$/);
    if (method === 'PATCH' && updateSettings) {
      const projectId = decodeURIComponent(updateSettings[1]);
      const current = data.settings[projectId] ?? { project_id: projectId, owner: {}, policies: {} };
      const next = { ...current, ...init.body };
      next.owner = {
        ...(current.owner ?? {}),
        ...(init.body?.lead_profile !== undefined ? { lead_profile: init.body.lead_profile } : {}),
        ...(init.body?.member_profiles !== undefined ? { member_profiles: init.body.member_profiles } : {}),
      };
      next.policies = {
        ...(current.policies ?? {}),
        verification: { ...(current.policies?.verification ?? {}), ...(init.body?.verification_policy ?? {}) },
        release: { ...(current.policies?.release ?? {}), ...(init.body?.release_policy ?? {}) },
        notification: { ...(current.policies?.notification ?? {}), ...(init.body?.notification_policy ?? {}) },
      };
      data.settings[projectId] = next;
      return clone(next);
    }
    const objectiveCollection = path.match(/^\/projects\/([^/]+)\/objectives$/);
    if (method === 'POST' && objectiveCollection) {
      const projectId = decodeURIComponent(objectiveCollection[1]);
      data.objectives[projectId] ??= { objectives: [] };
      const id = Math.max(0, ...data.objectives[projectId].objectives.map((item) => Number(item.id))) + 1;
      const objective = {
        id,
        project_id: projectId,
        name: init.body?.name,
        description: init.body?.description ?? '',
        evaluator_type: init.body?.evaluator_type ?? 'manual',
        target: init.body?.target ?? '>=1',
        severity: init.body?.severity ?? 'medium',
        enabled: true,
        command: null,
        integration: null,
        window: init.body?.window ?? '30d',
      };
      data.objectives[projectId].objectives.push(objective);
      return clone(objective);
    }
    const objectiveMutation = path.match(/^\/projects\/([^/]+)\/objectives\/(\d+)(?:\/(archive))?$/);
    if (objectiveMutation) {
      const projectId = decodeURIComponent(objectiveMutation[1]);
      const objectiveId = Number(objectiveMutation[2]);
      const objectives = data.objectives[projectId]?.objectives ?? [];
      const objective = objectives.find((item) => Number(item.id) === objectiveId);
      if (method === 'PATCH' && objective) {
        Object.assign(objective, init.body);
        return clone(objective);
      }
      if (method === 'POST' && objectiveMutation[3] === 'archive' && objective) {
        objective.enabled = false;
        return clone(objective);
      }
      if (method === 'DELETE') {
        data.objectives[projectId].objectives = objectives.filter((item) => Number(item.id) !== objectiveId);
        return { id: objectiveId, removed: true };
      }
    }
    const missionMutation = path.match(/^\/projects\/([^/]+)\/mission(?:\/(archive))?$/);
    if (missionMutation) {
      const projectId = decodeURIComponent(missionMutation[1]);
      const settings = data.settings[projectId];
      if (method === 'POST' && missionMutation[2] === 'archive') {
        const archived = {
          archive_id: `MISSION-${projectId}-${Date.now()}`,
          project_id: projectId,
          mission: settings.mission,
          archived_by: 'sahil',
          archived_at: '2026-08-25T12:00:00+00:00',
        };
        data.missionArchive[projectId] ??= { missions: [] };
        data.missionArchive[projectId].missions.unshift(archived);
        settings.mission = '';
        return clone(archived);
      }
      if (method === 'DELETE') {
        settings.mission = '';
        return { project_id: projectId, removed: true };
      }
    }
    const uploadContent = path.match(/^\/projects\/([^/]+)\/content$/);
    if (method === 'POST' && uploadContent) {
      const projectId = decodeURIComponent(uploadContent[1]);
      const contentId = `CONTENT-${Date.now()}`;
      const bytes = Buffer.from(init.body?.content_base64 ?? '', 'base64');
      const item = {
        content_id: contentId,
        project_id: projectId,
        filename: init.body?.filename,
        media_type: init.body?.media_type,
        size_bytes: bytes.length,
        sha256: 'b'.repeat(64),
        uploaded_by: 'sahil',
        uploaded_at: '2026-08-25T12:00:00+00:00',
      };
      data.content[projectId] ??= { content: [] };
      data.content[projectId].content.unshift(item);
      data.contentPreviews[contentId] = {
        ...item,
        preview_kind: item.media_type.startsWith('text/') ? 'text' : 'metadata',
        text: item.media_type.startsWith('text/') ? bytes.toString('utf8') : null,
        truncated: false,
      };
      return clone(item);
    }
    const generateReport = path.match(/^\/projects\/([^/]+)\/reports$/);
    if (method === 'POST' && generateReport) {
      const projectId = decodeURIComponent(generateReport[1]);
      const reportId = `RPT-TEST${Object.keys(data.reportDetails).length + 1}`;
      const report = {
        report_id: reportId,
        project_id: projectId,
        report_type: init.body?.report_type ?? 'executive',
        title: `${projectId} ${init.body?.report_type ?? 'executive'} report`,
        content: `# ${projectId} ${init.body?.report_type ?? 'executive'} report\n\n## Delivery\n\n- In progress: 2\n`,
        generated_by: 'sahil',
        generated_at: '2026-08-24T20:00:00+00:00',
      };
      data.reportDetails[reportId] = report;
      data.reports[projectId] ??= { reports: [] };
      data.reports[projectId].reports.unshift({ ...report, content: undefined });
      return clone(report);
    }
    if (path === '/dashboard') return clone(data.dashboard);
    if (path === '/inbox') return clone(data.inbox);
    if (path === '/notifications') return clone(data.notifications);
    if (path === '/bots') return clone(data.bots);
    const transcriptRead = path.match(/^\/bots\/([^/]+)\/sessions\/([^/]+)$/);
    if (method === 'GET' && transcriptRead) {
      const key = `${decodeURIComponent(transcriptRead[1])}/${decodeURIComponent(transcriptRead[2])}`;
      return clone(data.transcripts[key] ?? { bot_id: decodeURIComponent(transcriptRead[1]), messages: [], scope_note: 'System prompts and private reasoning are excluded.' });
    }
    const sessionsRead = path.match(/^\/bots\/([^/]+)\/sessions$/);
    if (method === 'GET' && sessionsRead) {
      const botId = decodeURIComponent(sessionsRead[1]);
      return clone(data.botSessions[botId] ?? { bot_id: botId, available: false, sessions: [], scope_note: 'System prompts and private reasoning are excluded.' });
    }
    if (path === '/workload') return clone(data.workload);
    if (path === '/bot-groups') return clone(data.groups);
    const groupMessages = path.match(/^\/bot-groups\/([^/]+)\/messages$/);
    if (groupMessages) return clone(data.groupMessages[decodeURIComponent(groupMessages[1])] ?? { messages: [] });
    const reportRead = path.match(/^\/projects\/([^/]+)\/reports\/([^/]+)$/);
    if (method === 'GET' && reportRead) {
      return clone(data.reportDetails[decodeURIComponent(reportRead[2])] ?? {});
    }
    const contentPreviewRead = path.match(/^\/projects\/([^/]+)\/content\/([^/]+)\/preview$/);
    if (method === 'GET' && contentPreviewRead) {
      return clone(data.contentPreviews[decodeURIComponent(contentPreviewRead[2])] ?? {});
    }
    const missionArchiveRead = path.match(/^\/projects\/([^/]+)\/missions\/archive$/);
    if (method === 'GET' && missionArchiveRead) {
      const projectId = decodeURIComponent(missionArchiveRead[1]);
      return clone(data.missionArchive[projectId] ?? { missions: [] });
    }
    const projectRead = path.match(/^\/projects\/([^/]+)\/(settings|work-items|initiatives|objectives|events|backlog|views|reports|content)$/);
    if (projectRead) {
      const projectId = decodeURIComponent(projectRead[1]);
      const kind = projectRead[2];
      if (kind === 'settings') return clone(data.settings[projectId] ?? { project_id: projectId, mission: '', phase: 'active' });
      if (kind === 'work-items') return clone(data.workItems[projectId] ?? { work_items: [] });
      if (kind === 'initiatives') return clone(data.initiatives[projectId] ?? { initiatives: [] });
      if (kind === 'objectives') return clone(data.objectives[projectId] ?? { objectives: [] });
      if (kind === 'events') return clone(data.events[projectId] ?? { events: [] });
      if (kind === 'backlog') return clone(data.backlog[projectId] ?? { backlog: [] });
      if (kind === 'views') return clone(data.views[projectId] ?? { views: [] });
      if (kind === 'reports') return clone(data.reports[projectId] ?? { reports: [] });
      if (kind === 'content') return clone(data.content[projectId] ?? { content: [] });
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
    os: {
      writeClipboard: async (text) => { clipboardWrites.push(text); return true; },
    },
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
  const setFile = async (selector, file, ms = 30) => {
    const element = dom.window.document.querySelector(selector);
    assert(element, `missing file target: ${selector}`);
    Object.defineProperty(element, 'files', { value: [file], configurable: true });
    await act(async () => {
      element.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
      await wait(ms);
    });
  };
  const dispose = async () => {
    await act(async () => { root.unmount(); });
    dom.window.close();
  };

  return { dom, loaded, contributions, calls, navigations, clipboardWrites, data, deferred, jsdomMessages, mount, flush, click, setValue, setFile, dispose };
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
  const rejectionConfirm = doc.querySelector('[data-destructive-confirm="reject-INI-DEMO-2"]');
  assert(rejectionConfirm && !rejectionConfirm.hidden, 'Reject did not ask for confirmation');
  assert(!runtime.calls.some((call) => call.method === 'POST' && call.path === '/initiatives/INI-DEMO-2/reject'), 'Reject mutated state before confirmation');
  await runtime.click('[data-action="confirm-destructive-action"]', 40);
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
  assert.equal(doc.querySelectorAll('[data-project-view]').length, 7, 'project dashboard must expose seven supported views');
  assert(doc.querySelector('[data-project-visual]'), 'project overview is missing work visualisation');
  assert(doc.querySelector('[data-overview-work]'), 'project overview is missing current work context');
  assert(doc.querySelector('[data-overview-initiatives]'), 'project overview is missing initiative context');
  assert(doc.querySelector('[data-overview-activity]'), 'project overview is missing attributed activity context');
  assert.match(doc.querySelector('[data-overview-work]').textContent, /Fix double-charge on retry path/);
  await runtime.click('[data-project-view="board"]');
  assert.equal(doc.querySelectorAll('[data-board-column]').length, 4, 'project board must expose backlog, active, review and done columns');
  assert(doc.querySelectorAll('[data-work-card]').length >= 3, 'project board did not render backend work items');
  assert(doc.querySelector('[data-view-only="board"]'), 'project board is not visibly marked view-only');
  assert(!doc.querySelector('[data-action="transition-work-item"]'), 'project board exposes an unsupported edit control');
  await runtime.click('[data-work-card="HDY-12"]');
  const workDetail = doc.querySelector('[data-work-item-detail="HDY-12"]');
  assert(workDetail, 'board item did not open its read-only detail');
  assert.match(workDetail.textContent, /Fix double-charge on retry path/);
  assert.match(workDetail.textContent, /octacon-bot/);
  assert(!workDetail.querySelector('input, textarea, select'), 'read-only item detail exposes editable controls');
  await runtime.click('[data-action="close-work-item-detail"]');
  assert(doc.querySelector('[data-work-item-detail-layer]')?.hidden, 'work-item detail did not close');

  await runtime.click('[data-project-view="settings"]');
  assert(doc.querySelector('[data-project-settings-form]'), 'project configuration form is missing');
  assert(doc.querySelector('[data-setting-field="mission"]'), 'mission configuration is missing');
  assert(doc.querySelector('[data-setting-field="lead-profile"]'), 'lead configuration is missing');
  assert(doc.querySelector('[data-setting-field="members"]'), 'member configuration is missing');
  assert(doc.querySelector('[data-setting-field="autonomy"]'), 'autonomy configuration is missing');
  assert(doc.querySelector('[data-setting-field="require-tests"]'), 'verification configuration is missing');
  assert(doc.querySelector('[data-setting-field="soak-hours"]'), 'release configuration is missing');
  assert(doc.querySelector('[data-setting-field="digest"]'), 'notification configuration is missing');
  assert(doc.querySelector('[data-setting-field="mission"]')?.matches(':disabled'), 'configuration is editable before Edit is selected');
  assert(!doc.querySelector('[data-action="save-project-settings"]'), 'Save is available while configuration is locked');
  await runtime.click('[data-action="edit-project-settings"]');
  assert(!doc.querySelector('[data-setting-field="mission"]')?.matches(':disabled'), 'Edit did not unlock configuration');
  await runtime.setValue('[data-setting-field="mission"]', 'Ship payment recovery with auditable gates');
  await runtime.setValue('[data-setting-field="autonomy"]', '2');
  const settingsReadsBeforeSave = runtime.calls.filter((call) => call.method === 'GET' && call.path === '/projects/payments-relaunch/settings').length;
  await runtime.click('[data-action="save-project-settings"]', 80);
  await runtime.flush(300);
  const settingsPatch = runtime.calls.find((call) => call.method === 'PATCH' && call.path === '/projects/payments-relaunch/settings');
  assert(settingsPatch, 'project configuration PATCH was not sent');
  assert.equal(settingsPatch.body.mission, 'Ship payment recovery with auditable gates');
  assert.equal(settingsPatch.body.autonomy_level, 2);
  assert(doc.querySelector('[data-setting-field="mission"]')?.matches(':disabled'), 'configuration did not lock after save');
  assert(runtime.calls.filter((call) => call.method === 'GET' && call.path === '/projects/payments-relaunch/settings').length > settingsReadsBeforeSave, 'configuration save did not refresh canonical project data');

  await runtime.click('[data-project-view="reports"]', 40);
  assert(doc.querySelector('[data-project-reports]'), 'report generation surface is missing');
  assert.equal(doc.querySelectorAll('[data-report-history]').length, 1, 'report history did not render');
  await runtime.click('[data-action="generate-report"]', 80);
  const reportCall = runtime.calls.find((call) => call.method === 'POST' && call.path === '/projects/payments-relaunch/reports');
  assert(reportCall, 'report generation POST was not sent');
  assert(doc.querySelector('[data-report-preview]'), 'generated report preview is missing');
  assert.match(doc.querySelector('[data-report-preview]').textContent, /payments-relaunch executive report/);
  await runtime.click('[data-action="copy-report"]', 40);
  assert.equal(runtime.clipboardWrites.length, 1, 'generated report was not copied through the plugin OS door');
  assert.match(runtime.clipboardWrites[0], /## Delivery/);
  await runtime.click('[data-project-view="overview"]', 50);
  await runtime.click('[data-project-view="reports"]', 50);
  assert.equal(doc.querySelectorAll('[data-report-history]').length, 2, 'generated report disappeared after tab navigation');

  for (const path of [
    '/projects/payments-relaunch/settings',
    '/projects/payments-relaunch/work-items',
    '/projects/payments-relaunch/initiatives',
    '/projects/payments-relaunch/objectives',
    '/projects/payments-relaunch/missions/archive',
    '/projects/payments-relaunch/content',
    '/projects/payments-relaunch/events',
    '/projects/payments-relaunch/reports',
  ]) {
    assert(runtime.calls.some((call) => call.path === path), `project screen did not load supported context: ${path}`);
  }
  await runtime.dispose();
}

async function testMissionObjectiveManagementAndDestructiveGates() {
  const runtime = await createRuntime();
  await runtime.mount();
  await runtime.click('[data-tab="project"]', 80);
  await runtime.click('[data-project-view="objectives"]');
  const doc = runtime.dom.window.document;

  assert(doc.querySelector('[data-mission-manager]'), 'mission manager is missing');
  assert.equal(doc.querySelectorAll('[data-objective-row]').length, 2, 'active and archived objectives did not render');
  assert.match(doc.body.textContent, /Stabilise the legacy checkout/);

  await runtime.click('[data-action="edit-mission"]');
  await runtime.setValue('[data-mission-field]', 'Make checkout recovery measurable');
  await runtime.click('[data-action="save-mission"]', 50);
  const missionPatch = runtime.calls.find((call) => call.method === 'PATCH' && call.path === '/projects/payments-relaunch/settings' && call.body?.mission === 'Make checkout recovery measurable');
  assert(missionPatch, 'mission edit PATCH was not sent');
  await runtime.click('[data-project-view="overview"]', 50);
  await runtime.click('[data-project-view="objectives"]', 50);
  assert.match(doc.querySelector('[data-mission-manager]')?.textContent || '', /Make checkout recovery measurable/, 'saved mission disappeared after tab navigation');

  await runtime.click('[data-action="archive-mission"]');
  assert(doc.querySelector('[data-destructive-confirm="archive-mission"]'), 'mission archive did not ask for confirmation');
  assert(!runtime.calls.some((call) => call.method === 'POST' && call.path === '/projects/payments-relaunch/mission/archive'), 'mission archive mutated before confirmation');
  await runtime.click('[data-action="confirm-destructive-action"]', 60);
  assert(runtime.calls.some((call) => call.method === 'POST' && call.path === '/projects/payments-relaunch/mission/archive'), 'mission archive POST was not sent');

  await runtime.click('[data-action="edit-objective"][data-objective-id="11"]');
  await runtime.setValue('[data-objective-field="description"]', 'Keep every payment retry safe.');
  await runtime.click('[data-action="save-objective"]', 50);
  assert(runtime.calls.some((call) => call.method === 'PATCH' && call.path === '/projects/payments-relaunch/objectives/11'), 'objective edit PATCH was not sent');

  await runtime.click('[data-action="archive-objective"][data-objective-id="11"]');
  assert(doc.querySelector('[data-destructive-confirm="archive-objective-11"]'), 'objective archive did not ask for confirmation');
  await runtime.click('[data-action="confirm-destructive-action"]', 50);
  assert(runtime.calls.some((call) => call.method === 'POST' && call.path === '/projects/payments-relaunch/objectives/11/archive'), 'objective archive POST was not sent');

  await runtime.click('[data-action="remove-objective"][data-objective-id="12"]');
  assert(doc.querySelector('[data-destructive-confirm="remove-objective-12"]'), 'objective removal did not ask for confirmation');
  assert(!runtime.calls.some((call) => call.method === 'DELETE' && call.path === '/projects/payments-relaunch/objectives/12'), 'objective removal mutated before confirmation');
  await runtime.click('[data-action="confirm-destructive-action"]', 50);
  assert(runtime.calls.some((call) => call.method === 'DELETE' && call.path === '/projects/payments-relaunch/objectives/12'), 'objective removal DELETE was not sent');
  await runtime.dispose();
}

async function testProjectContentVisibilityPreviewAndUpload() {
  const runtime = await createRuntime();
  await runtime.mount();
  await runtime.click('[data-tab="project"]', 80);
  await runtime.click('[data-project-view="content"]');
  const doc = runtime.dom.window.document;

  assert(doc.querySelector('[data-project-content]'), 'project content surface is missing');
  assert.equal(doc.querySelectorAll('[data-project-content-item]').length, 1, 'existing project documentation did not render');
  await runtime.click('[data-project-content-item="CONTENT-DEMO1"]');
  assert.match(doc.querySelector('[data-content-preview]')?.textContent || '', /Use the rollback gate/);

  const file = new runtime.dom.window.File(
    ['# Release evidence\n\nVerified support.\n'],
    'release-evidence.md',
    { type: 'text/markdown' },
  );
  await runtime.setFile('[data-content-file]', file, 50);
  assert.match(doc.body.textContent, /release-evidence\.md/);
  await runtime.click('[data-action="upload-project-content"]', 80);
  const upload = runtime.calls.find((call) => call.method === 'POST' && call.path === '/projects/payments-relaunch/content');
  assert(upload, 'project content upload POST was not sent');
  assert.equal(upload.body.filename, 'release-evidence.md');
  assert.equal(upload.body.media_type, 'text/markdown');
  assert.match(upload.body.content_base64, /^[A-Za-z0-9+/]+=*$/);
  assert([...doc.querySelectorAll('[data-project-content-item]')].some((item) => item.textContent.includes('release-evidence.md')), 'uploaded content was not read back');
  await runtime.click('[data-project-view="overview"]', 50);
  await runtime.click('[data-project-view="content"]', 50);
  assert([...doc.querySelectorAll('[data-project-content-item]')].some((item) => item.textContent.includes('release-evidence.md')), 'uploaded content disappeared after tab navigation');
  await runtime.dispose();
}

async function testProjectLifecycleStateAndConfirmedActions() {
  const runtime = await createRuntime();
  await runtime.mount();
  await runtime.click('[data-tab="project"]', 80);
  await runtime.click('[data-project-view="settings"]');
  const doc = runtime.dom.window.document;
  const assertAction = (action, present = true) => {
    assert.equal(Boolean(doc.querySelector(`[data-lifecycle-action="${action}"]`)), present, `${action} action visibility is wrong`);
  };
  const runAction = async (action, path) => {
    await runtime.click(`[data-lifecycle-action="${action}"]`);
    const confirmation = doc.querySelector('[data-lifecycle-confirm]');
    assert(confirmation && !confirmation.hidden, `${action} did not ask for confirmation`);
    assert(!runtime.calls.some((call) => call.method === 'POST' && call.path === path), `${action} mutated state before confirmation`);
    await runtime.click('[data-action="confirm-lifecycle-action"]', 100);
    await runtime.flush(120);
    assert(runtime.calls.some((call) => call.method === 'POST' && call.path === path), `${action} POST was not sent`);
  };

  assert.equal(doc.querySelector('[data-project-enabled-state]')?.textContent.trim(), 'Enabled');
  assert.equal(doc.querySelector('[data-project-phase-state]')?.textContent.trim(), 'Active');
  assertAction('disable');
  assertAction('pause');
  assertAction('freeze');
  assertAction('enable', false);
  assertAction('resume', false);

  await runtime.click('[data-lifecycle-action="disable"]');
  await act(async () => {
    runtime.dom.window.dispatchEvent(new runtime.dom.window.KeyboardEvent('keydown', { key: 'Escape' }));
    await wait(30);
  });
  assert(doc.querySelector('[data-lifecycle-confirm]')?.hidden, 'Escape did not close lifecycle confirmation');
  assert(!runtime.calls.some((call) => call.method === 'POST' && call.path === '/projects/payments-relaunch/disable'), 'Escape triggered a lifecycle mutation');

  await runAction('disable', '/projects/payments-relaunch/disable');
  assert.equal(doc.querySelector('[data-project-enabled-state]')?.textContent.trim(), 'Disabled');
  assert(doc.querySelector('[data-setting-field="mission"]')?.matches(':disabled'), 'disabled project settings remain editable');
  assertAction('enable');
  assertAction('disable', false);
  assertAction('pause', false);
  await runAction('enable', '/projects/payments-relaunch/re-enable');

  await runAction('pause', '/projects/payments-relaunch/pause');
  assert.equal(doc.querySelector('[data-project-phase-state]')?.textContent.trim(), 'Paused');
  assertAction('resume');
  assertAction('freeze');
  assertAction('pause', false);

  await runtime.click('[data-tab="backlog"]', 80);
  assert(doc.querySelector('[data-action="open-create-backlog-item"]')?.disabled, 'paused project still allows the create-item modal to open');
  await runtime.click('[data-tab="project"]', 80);
  await runtime.click('[data-project-view="settings"]');
  await runAction('resume', '/projects/payments-relaunch/resume');

  await runAction('freeze', '/projects/payments-relaunch/freeze');
  assert.equal(doc.querySelector('[data-project-phase-state]')?.textContent.trim(), 'Frozen');
  assertAction('resume');
  assertAction('freeze', false);
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

async function testBacklogCreateFormValidationAndReadback() {
  const runtime = await createRuntime();
  await runtime.mount();
  await runtime.click('[data-tab="backlog"]', 80);
  const doc = runtime.dom.window.document;
  await runtime.click('[data-action="open-create-backlog-item"]');
  const form = doc.querySelector('[data-create-backlog-item]');
  assert(form, 'create backlog item form is missing');
  assert.match(form.textContent, /Sahil.*creator/i, 'creator attribution is not shown separately');
  assert(form.querySelector('[data-create-field="assignee"]'), 'assignee selector is missing');
  assert(form.querySelector('[data-create-field="initiative"]'), 'initiative selector is missing');
  assert(form.querySelector('[data-create-field="rank"]'), 'initial rank field is missing');
  assert(form.querySelector('[data-action="submit-create-backlog-item"]')?.disabled, 'invalid empty form can be submitted');
  await act(async () => {
    runtime.dom.window.dispatchEvent(new runtime.dom.window.KeyboardEvent('keydown', { key: 'Escape' }));
    await wait(30);
  });
  assert(form.parentElement?.hidden, 'Escape did not close the create-item modal');
  await runtime.click('[data-action="open-create-backlog-item"]');
  await runtime.click('[data-action="close-create-backlog-item"]');
  assert(doc.querySelector('[data-create-backlog-layer]')?.hidden, 'Close button did not close the create-item modal');
  await runtime.click('[data-action="open-create-backlog-item"]');
  await runtime.click('[data-create-backlog-layer]');
  assert(doc.querySelector('[data-create-backlog-layer]')?.hidden, 'clicking the overlay did not close the create-item modal');
  await runtime.click('[data-action="open-create-backlog-item"]');

  await runtime.setValue('[data-create-field="title"]', 'Verify retry idempotency');
  await runtime.setValue('[data-create-field="assignee"]', 'quan-bot');
  await runtime.setValue('[data-create-field="initiative"]', 'INI-DEMO-2');
  await runtime.setValue('[data-create-field="rank"]', '1');
  await runtime.setValue('[data-create-field="reason"]', 'x');
  assert(doc.querySelector('[data-action="submit-create-backlog-item"]')?.disabled, 'priority reason shorter than four characters is accepted');
  await runtime.setValue('[data-create-field="reason"]', 'Protects customers from duplicate charges');
  const currentSubmit = doc.querySelector('[data-action="submit-create-backlog-item"]');
  const currentValues = Object.fromEntries(['title', 'assignee', 'initiative', 'rank', 'reason'].map((field) => [field, doc.querySelector(`[data-create-field="${field}"]`)?.value]));
  assert(!currentSubmit?.disabled, `valid create form remains disabled: ${JSON.stringify(currentValues)}`);
  await runtime.click('[data-action="submit-create-backlog-item"]', 100);

  const create = runtime.calls.find((call) => call.method === 'POST' && call.path === '/projects/payments-relaunch/backlog/items');
  assert(create, 'atomic create-and-queue POST was not sent');
  assert.deepEqual(create.body, {
    type: 'task',
    title: 'Verify retry idempotency',
    assignee_id: 'quan-bot',
    assignee_kind: 'bot',
    initiative_ref: 'INI-DEMO-2',
    rank: 1,
    reason: 'Protects customers from duplicate charges',
  });
  const created = [...doc.querySelectorAll('[data-backlog-item]')]
    .find((entry) => entry.textContent.includes('Verify retry idempotency'));
  assert(created, 'created backlog item was not read back after refresh');
  assert.match(created.textContent, /quan-bot/);
  assert.match(created.textContent, /INI-DEMO-2/);
  await runtime.dispose();
}

async function testBotTeamsScreen() {
  const runtime = await createRuntime();
  await runtime.mount();
  await runtime.click('[data-tab="teams"]', 80);
  const doc = runtime.dom.window.document;
  assert(doc.querySelector('[data-bot-teams]'), 'bot teams screen is missing');
  assert(doc.querySelector('[data-view-only="bot-team"]'), 'bot team management is not visibly marked view-only');
  assert(!doc.querySelector('[data-action="add-project-bot"], [data-action="remove-project-bot"], [data-action="reassign-bot-work"]'), 'bot teams expose unsupported management controls');
  assert.equal(doc.querySelectorAll('[data-bot-card]').length, 3, 'bot registry did not render');
  assert(doc.querySelector('[data-workload-visual]'), 'workload visualisation is missing');
  assert(doc.querySelector('[data-bot-group="release-crew"]'), 'bot group card did not render');
  assert.match(doc.body.textContent, /Release evidence ready for verification/);
  await runtime.click('[data-action="open-bot-sessions"][data-bot-id="octacon-bot"]', 60);
  assert(doc.querySelector('[data-bot-session-panel="octacon-bot"]'), 'bot session panel did not open');
  assert.equal(doc.querySelectorAll('[data-bot-session]').length, 1, 'bot sessions did not render');
  assert.match(doc.body.textContent, /Fix release gate/);
  await runtime.click('[data-bot-session="sess-octacon-1"]', 60);
  assert(doc.querySelector('[data-session-transcript="sess-octacon-1"]'), 'session transcript did not open');
  assert.equal(doc.querySelectorAll('[data-transcript-message]').length, 3, 'session transcript messages did not render');
  assert.match(doc.body.textContent, /Run the release checks/);
  assert.match(doc.body.textContent, /12 tests passed/);
  assert.match(doc.body.textContent, /System prompts and private reasoning are excluded/);
  for (const path of [
    '/bots', '/workload', '/bot-groups', '/bot-groups/release-crew/messages',
    '/bots/octacon-bot/sessions', '/bots/octacon-bot/sessions/sess-octacon-1',
  ]) {
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
  await runtime.click('[data-action="freeze-project"]');
  assert(doc.querySelector('[data-destructive-confirm="freeze-project"]'), 'Freeze did not ask for confirmation');
  assert(!runtime.calls.some((call) => call.method === 'POST' && call.path === '/projects/payments-relaunch/freeze'), 'Freeze mutated state before confirmation');
  await runtime.click('[data-action="cancel-destructive-action"]');
  assert(!runtime.calls.some((call) => call.method === 'POST' && call.path === '/projects/payments-relaunch/freeze'), 'Cancelling Freeze still mutated state');
  assert.match(doc.body.textContent, /Support requests drop when refunds are self-service/);
  await runtime.dispose();
}

async function testSavedViewsScreenAndCreator() {
  const runtime = await createRuntime();
  await runtime.mount();
  await runtime.click('[data-tab="workflows"]', 80);
  const doc = runtime.dom.window.document;
  assert.equal(doc.querySelector('[data-tab="workflows"]')?.textContent.trim(), 'Saved views');
  assert(doc.querySelector('[data-saved-views-screen]'), 'saved views screen is missing');
  assert.match(doc.body.textContent, /renamed from Workflows/i);
  assert.match(doc.body.textContent, /do not run automations/i);
  assert.match(doc.body.textContent, /displayed/i);
  assert(!doc.querySelector('[data-workflow-visual]'), 'a fabricated executable workflow is still rendered');
  assert.equal(doc.querySelectorAll('[data-saved-view]').length, 1, 'saved view did not render');
  const savedViewRow = doc.querySelector('[data-saved-view="Release focus"]');
  assert.match(savedViewRow?.textContent || '', /Board\s*\/\s*In progress/, 'saved view exposes raw filter data instead of readable labels');
  assert(!savedViewRow?.textContent.includes('{'), 'saved view exposes raw JSON');
  await runtime.click('[data-saved-view="Release focus"]');
  assert.equal(doc.querySelector('#dockyard-view-name')?.value, 'Release focus', 'saved view did not populate the editor');
  assert(doc.querySelector('[data-saved-view-editor]'), 'saved view editor is missing');
  assert(!/Saved workflows|Create workflow|LIVE DELIVERY PATH/.test(doc.body.textContent), 'misleading workflow copy remains visible');
  assert(runtime.calls.some((call) => call.path === '/projects/payments-relaunch/views'), 'saved views screen did not load backend views');
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
  await failed.click('[data-approval-ref="INI-DEMO-1"] [data-action="reject"]', 40);
  await failed.click('[data-action="confirm-destructive-action"]', 80);
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

  await runtime.click('[data-approval-ref="INI-DEMO-2"] [data-action="reject"]', 20);
  assert(!runtime.calls.some((call) => call.method === 'POST' && call.path === '/initiatives/INI-DEMO-2/reject'), 'rejection bypassed confirmation');
  await runtime.click('[data-action="confirm-destructive-action"]', 40);
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

async function writeSnapshot(tab, target, { onboarding = false, prepare = null } = {}) {
  const runtime = await createRuntime();
  await runtime.mount();
  if (tab !== 'dashboard') await runtime.click(`[data-tab="${tab}"]`);
  if (onboarding) await runtime.click('[data-action="open-onboarding"]');
  if (prepare) await prepare(runtime);
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
    projectSettings: '/tmp/dockyard-project-settings.html',
    projectObjectives: '/tmp/dockyard-project-objectives.html',
    projectContent: '/tmp/dockyard-project-content.html',
    projectBoardDetail: '/tmp/dockyard-project-board-detail.html',
    projectReports: '/tmp/dockyard-project-reports.html',
    backlog: '/tmp/dockyard-backlog.html',
    backlogCreate: '/tmp/dockyard-backlog-create.html',
    teams: '/tmp/dockyard-teams.html',
    teamsTranscript: '/tmp/dockyard-teams-transcript.html',
    initiative: '/tmp/dockyard-initiative.html',
    initiativeFreeze: '/tmp/dockyard-initiative-freeze.html',
    workflows: '/tmp/dockyard-workflows.html',
    inbox: '/tmp/dockyard-inbox.html',
    inboxReject: '/tmp/dockyard-inbox-reject.html',
    notifications: '/tmp/dockyard-notifications.html',
    onboarding: '/tmp/dockyard-onboarding.html',
  };
  await writeSnapshot('dashboard', snapshots.dashboard);
  await writeSnapshot('project', snapshots.project);
  await writeSnapshot('project', snapshots.projectSettings, { prepare: (runtime) => runtime.click('[data-project-view="settings"]') });
  await writeSnapshot('project', snapshots.projectObjectives, { prepare: (runtime) => runtime.click('[data-project-view="objectives"]') });
  await writeSnapshot('project', snapshots.projectContent, { prepare: async (runtime) => {
    await runtime.click('[data-project-view="content"]');
    await runtime.click('[data-project-content-item="CONTENT-DEMO1"]', 50);
  } });
  await writeSnapshot('project', snapshots.projectBoardDetail, { prepare: async (runtime) => {
    await runtime.click('[data-project-view="board"]');
    await runtime.click('[data-work-card="HDY-12"]');
  } });
  await writeSnapshot('project', snapshots.projectReports, { prepare: async (runtime) => {
    await runtime.click('[data-project-view="reports"]');
    await runtime.click('[data-action="generate-report"]', 60);
  } });
  await writeSnapshot('backlog', snapshots.backlog);
  await writeSnapshot('backlog', snapshots.backlogCreate, { prepare: (runtime) => runtime.click('[data-action="open-create-backlog-item"]') });
  await writeSnapshot('teams', snapshots.teams);
  await writeSnapshot('teams', snapshots.teamsTranscript, { prepare: async (runtime) => {
    await runtime.click('[data-action="open-bot-sessions"][data-bot-id="octacon-bot"]', 50);
    await runtime.click('[data-bot-session="sess-octacon-1"]', 50);
  } });
  await writeSnapshot('initiative', snapshots.initiative);
  await writeSnapshot('initiative', snapshots.initiativeFreeze, { prepare: (runtime) => runtime.click('[data-action="freeze-project"]') });
  await writeSnapshot('workflows', snapshots.workflows);
  await writeSnapshot('inbox', snapshots.inbox);
  await writeSnapshot('inbox', snapshots.inboxReject, { prepare: (runtime) => runtime.click('[data-approval-ref="INI-DEMO-2"] [data-action="reject"]') });
  await writeSnapshot('notifications', snapshots.notifications);
  await writeSnapshot('dashboard', snapshots.onboarding, { onboarding: true });

  const specs = [
    { name: 'dashboard-700-light', file: snapshots.dashboard, width: 700, height: 1000, scheme: 'light' },
    { name: 'dashboard-host-pane-725-dark', file: snapshots.dashboard, width: 1455, height: 940, rootWidth: 725, scheme: 'dark' },
    { name: 'dashboard-1000-light', file: snapshots.dashboard, width: 1000, height: 1000, scheme: 'light' },
    { name: 'dashboard-1600-light', file: snapshots.dashboard, width: 1600, height: 1000, scheme: 'light' },
    { name: 'dashboard-1200-dark', file: snapshots.dashboard, width: 1200, height: 900, scheme: 'dark' },
    { name: 'project-1400-light', file: snapshots.project, width: 1400, height: 1000, scheme: 'light' },
    { name: 'project-settings-700-light', file: snapshots.projectSettings, width: 700, height: 1000, scheme: 'light' },
    { name: 'project-settings-1400-dark', file: snapshots.projectSettings, width: 1400, height: 1000, scheme: 'dark' },
    { name: 'project-objectives-700-dark', file: snapshots.projectObjectives, width: 700, height: 1000, scheme: 'dark' },
    { name: 'project-objectives-1400-light', file: snapshots.projectObjectives, width: 1400, height: 1000, scheme: 'light' },
    { name: 'project-content-700-light', file: snapshots.projectContent, width: 700, height: 1000, scheme: 'light' },
    { name: 'project-content-1400-dark', file: snapshots.projectContent, width: 1400, height: 1000, scheme: 'dark' },
    { name: 'project-board-detail-1200-light', file: snapshots.projectBoardDetail, width: 1200, height: 900, scheme: 'light' },
    { name: 'project-reports-700-dark', file: snapshots.projectReports, width: 700, height: 1000, scheme: 'dark' },
    { name: 'project-reports-1400-light', file: snapshots.projectReports, width: 1400, height: 1000, scheme: 'light' },
    { name: 'backlog-1400-dark', file: snapshots.backlog, width: 1400, height: 1000, scheme: 'dark' },
    { name: 'backlog-create-700-light', file: snapshots.backlogCreate, width: 700, height: 1000, scheme: 'light' },
    { name: 'teams-1400-light', file: snapshots.teams, width: 1400, height: 1000, scheme: 'light' },
    { name: 'teams-transcript-700-light', file: snapshots.teamsTranscript, width: 700, height: 1000, scheme: 'light' },
    { name: 'teams-transcript-1400-dark', file: snapshots.teamsTranscript, width: 1400, height: 1000, scheme: 'dark' },
    { name: 'initiative-1400-dark', file: snapshots.initiative, width: 1400, height: 1000, scheme: 'dark' },
    { name: 'initiative-freeze-1200-dark', file: snapshots.initiativeFreeze, width: 1200, height: 900, scheme: 'dark' },
    { name: 'workflows-1400-light', file: snapshots.workflows, width: 1400, height: 1000, scheme: 'light' },
    { name: 'inbox-1200-light', file: snapshots.inbox, width: 1200, height: 900, scheme: 'light' },
    { name: 'inbox-reject-1200-light', file: snapshots.inboxReject, width: 1200, height: 900, scheme: 'light' },
    { name: 'notifications-1200-dark', file: snapshots.notifications, width: 1200, height: 900, scheme: 'dark' },
    { name: 'onboarding-1200-light', file: snapshots.onboarding, width: 1200, height: 900, scheme: 'light' },
    { name: 'onboarding-480-dark', file: snapshots.onboarding, width: 480, height: 900, scheme: 'dark' },
  ];
  const browser = await chromium.launch({
    headless: true,
    args: ['--disable-gpu'],
  });
  const results = [];
  try {
    for (const spec of specs) {
      const page = await browser.newPage({ viewport: { width: spec.width, height: spec.height }, colorScheme: spec.scheme });
      const browserErrors = [];
      page.on('console', (message) => { if (message.type() === 'error' || message.type() === 'warning') browserErrors.push(`${message.type()}: ${message.text()}`); });
      page.on('pageerror', (error) => browserErrors.push(`pageerror: ${error.message}`));
      await page.goto(`file://${spec.file}`, { waitUntil: 'load' });
      if (spec.rootWidth) {
        await page.evaluate((width) => {
          const root = document.querySelector('.dockyard-root');
          root.style.width = `${width}px`;
          root.style.maxWidth = 'none';
        }, spec.rootWidth);
      }
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
          clippedLoopVisuals: [...document.querySelectorAll('.dockyard-loop-visual-wrap, .dockyard-workflow-graph')].filter((visual) => visual.scrollWidth > visual.clientWidth + 1).length,
          clippedFeatureCards: [...document.querySelectorAll('.dockyard-feature-card')].filter((card) => card.scrollWidth > card.clientWidth + 1).length,
          clippedControls: [...document.querySelectorAll('input, textarea, select, button')].filter((control) => control.scrollWidth > control.clientWidth + 2).length,
          tabOverflow: (() => {
            const tabs = document.querySelector('.dockyard-tabs');
            return tabs ? Math.max(0, tabs.scrollWidth - tabs.clientWidth) : 0;
          })(),
          projectToolbarOverflow: (() => {
            const toolbar = document.querySelector('.dockyard-project-toolbar');
            return toolbar ? Math.max(0, toolbar.scrollWidth - toolbar.clientWidth) : 0;
          })(),
          attentionColumnCount: (() => {
            const card = document.querySelector('.dockyard-attention-card');
            const columns = card ? getComputedStyle(card).gridTemplateColumns.trim() : '';
            return columns ? columns.split(/\s+/).length : 0;
          })(),
        };
      });
      assert(measure.documentWidth <= spec.width, `${spec.name} overflows horizontally: ${measure.documentWidth}px > ${spec.width}px`);
      assert.equal(measure.clippedProjectRows, 0, `${spec.name} clips project-row content`);
      assert.equal(measure.clippedProjectText, 0, `${spec.name} clips project names or mission text`);
      assert.equal(measure.misalignedProjectIcons, 0, `${spec.name} misaligns Project-column icons`);
      assert.equal(measure.clippedFeatureCards, 0, `${spec.name} clips content inside a feature card`);
      assert.equal(measure.clippedControls, 0, `${spec.name} clips an interactive control`);
      if (spec.rootWidth) {
        assert(Math.abs(measure.rootWidth - spec.rootWidth) <= 1, `${spec.name} did not preserve the simulated host pane width`);
        assert.equal(measure.attentionColumnCount, 1, `${spec.name} keeps the decision card in a squeezed two-column layout`);
      }
      if (spec.width >= 700) {
        assert.equal(measure.tabOverflow, 0, `${spec.name} hides primary navigation tabs`);
        assert.equal(measure.projectToolbarOverflow, 0, `${spec.name} hides project navigation tabs`);
      }
      if (measure.projectRows > 0) assert.deepEqual(measure.projectIconDisplays, ['grid'], `${spec.name} project icons lost their centring layout`);
      assert(!measure.rootFont.includes('Times New Roman'), `${spec.name} inherited Times New Roman`);
      const expectedTab = spec.name.startsWith('onboarding-') ? 'dashboard' : spec.name.split('-')[0];
      assert.equal(measure.activeScreen, `dockyard-tab-${expectedTab}`, `${spec.name} captured the wrong active screen`);
      const expectedDialogs = ['onboarding-', 'backlog-create-', 'project-board-detail-', 'initiative-freeze-', 'inbox-reject-'].some((prefix) => spec.name.startsWith(prefix)) ? 1 : 0;
      assert.equal(measure.dialogCount, expectedDialogs, `${spec.name} has the wrong modal-dialog state`);
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
  ['mission and objective management with destructive gates', testMissionObjectiveManagementAndDestructiveGates],
  ['project content visibility, preview and upload', testProjectContentVisibilityPreviewAndUpload],
  ['project lifecycle state and confirmed actions', testProjectLifecycleStateAndConfirmedActions],
  ['backlog board and reason gate', testBacklogBoardAndReasonGate],
  ['backlog create form validation and readback', testBacklogCreateFormValidationAndReadback],
  ['bot teams screen', testBotTeamsScreen],
  ['initiative loop screen', testInitiativeLoopScreen],
  ['saved views screen and creator', testSavedViewsScreenAndCreator],
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
