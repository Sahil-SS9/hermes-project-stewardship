// Project Stewardship desktop runtime harness.
// Exercises real React effects in jsdom, write interactions, every UI state,
// CSS parsing, contrast metadata and Chromium layout at 700px and 1600px.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { evaluatePlugin as evaluatePluginBundle, evaluateArtifact } from './test-support/load-plugin.mjs';

const HARNESS_PACKAGE = fileURLToPath(new URL('../dashboard/package.json', import.meta.url));
// Resolve the candidate plugin relative to this harness so a clean worktree
// tests its own file, never a live checkout. DOCKYARD_PLUGIN_PATH overrides.
const TMPDIR = (process.env.TMPDIR || '/tmp').replace(/\/$/, '')
const PLUGIN_PATH = process.env.DOCKYARD_PLUGIN_PATH
  || fileURLToPath(new URL('./plugin.js', import.meta.url));
const require = createRequire(HARNESS_PACKAGE);
const { JSDOM, VirtualConsole } = require('jsdom');
const React = require('react');
const { act } = React;
const { createRoot } = require('react-dom/client');
const rt = require('react/jsx-runtime');
rt.canvasMounts = [];
rt.mountDesktopWorkflowCanvas = function mountDesktopWorkflowCanvasStub(hostEl, projectId, workflowName) {
  rt.canvasMounts.push({ projectId, workflowName });
  return () => {};
};

const POPULATED = {
  // Phase 4 receipts backing store: ambiguous desktop outcomes read these.
  DECISION_RECEIPTS: {},
  // P7.GATE: host-driven onboarding surface.
  DISCOVER: {
    projects: [{ id: 'p_demo', slug: 'demo-project', name: 'Demo Project', board_slug: 'demo-project', repo_path: '/srv/demo' }],
    profiles: [
      { name: 'default', is_default: true, available: true, selectable: true, host_capabilities: ['lead', 'member'] },
      { name: 'octacon', is_default: false, available: true, selectable: true, host_capabilities: ['lead', 'member'] },
      { name: 'quan', is_default: false, available: true, selectable: true, host_capabilities: ['member'] },
      { name: 'octacon-bot', is_default: false, available: true, selectable: true, host_capabilities: ['lead', 'member'] },
      { name: 'quan-bot', is_default: false, available: true, selectable: true, host_capabilities: ['member'] },
      { name: 'retired', is_default: false, available: false, selectable: false, historical_reference: true, project_ids: ['demo-project'], host_capabilities: [] },
    ],
  },
  PREFLIGHT: {
    validated: { slug: 'checkout-ops', repo_path: '/srv/checkout-ops', lead_profile: 'octacon' },
    existing: { projects: [{ id: 'p_demo', slug: 'demo-project' }], profiles: [{ name: 'default' }, { name: 'octacon' }] },
    mode: 'create_new',
    preflight: { team_revision: 0, membership_revision: 0, lead_profile: 'octacon', member_profiles: ['quan'], historical_unavailable_profiles: [], token: 'review-token-0' },
    // P7.3: inert suggestions (supported + unsupported shown for review).
    suggestions: [
      { name: 'Node tooling present', evaluator_type: 'manual', target: '>=1', severity: 'low', description: 'Declares Node/package tooling.', suggested_file: 'package.json' },
      { name: 'Mystery build system', evaluator_type: 'manual', target: '>=1', severity: 'info', description: 'Unrecognised build file.', suggested_file: 'build.unknown', supported: false },
    ],
    // P7.4: exact proposed governance/board/automation preview.
    preview: {
      governance_project_id: 'checkout-ops',
      canonical_board: 'checkout-ops',
      canonical_project_slug: 'checkout-ops',
      lead_profile: 'octacon',
      repo_path: '/srv/checkout-ops',
      objectives_store: 'project:checkout-ops',
      schedules_enabled: false,
      future_execution_enabled: false,
      first_action: 'Run first read-only assessment after onboarding',
    },
  },
  FIRST_ASSESSMENT: {
    project: 'payments-relaunch',
    assessment: {
      cycle_id: 7,
      verification_ok: true,
      health_state: 'healthy',
      objective_results: [{ name: 'demo objective', passed: true, state: 'passed' }],
      initiatives_created: 0,
    },
    health_snapshot: { status: 'healthy' },
    schedules_enabled: false,
    next: 'Review the objective results; onboarding enables no automation.',
  },
  dashboard: {
    projects: [
      { id: 'demo-project', enabled: true, phase: 'active', health: 'healthy', work: { backlog: 5, active: 3, done: 3, blocked: 0 }, unacked_notifications: 0 },
      { id: 'payments-relaunch', enabled: true, phase: 'active', health: 'watch', work: { backlog: 1, active: 2, done: 1, blocked: 1 }, unacked_notifications: 1 },
    ],
    owed_decisions: 2,
    totals: { active_work: 5, blocked: 1, stuck_bots: 0, unacked_notifications: 1 },
  },
  // Shape mirrors DockyardService.portfolio(); the v6 Dashboard reads this, not /dashboard.
  portfolio: {
    projects: [
      { project_id: 'demo-project', owner: 'octacon', enabled: true, phase: 'active', status: 'on_track',
        items: { done: 3, total: 11, blocked: 0, overdue: 0 },
        next_milestone: { name: 'Beta', due: '2026-10-08', overdue: false },
        last_activity: '2026-08-24T18:10:07+00:00', evidence_freshness_days: 1 },
      { project_id: 'payments-relaunch', owner: 'octacon', enabled: true, phase: 'active', status: 'at_risk',
        items: { done: 1, total: 5, blocked: 1, overdue: 0 },
        next_milestone: null, last_activity: '2026-08-24T18:10:07+00:00', evidence_freshness_days: null },
    ],
    mix: { todo: 6, in_progress: 5, blocked: 1, done: 4 },
    attention: { overdue_items: 0, blocked_items: 1, overdue_milestones: 0 },
    evidence_files: 0,
    groups: {
      decisions: [
        { kind: 'initiative_approval', ref: 'INI-DEMO-1', title: 'Add weekly digest email', project: 'demo-project', risk: 'low', age_days: 2 },
        { kind: 'initiative_approval', ref: 'INI-DEMO-2', title: 'Enable one-click refunds', project: 'payments-relaunch', risk: 'medium', age_days: 5 },
      ],
      interventions: [
        { kind: 'blocked_work', ref: 'HDY-14', title: 'Refund webhook retries', project: 'payments-relaunch', risk: 'high', age_days: 1, detail: 'Blocked on provider credentials' },
      ],
      informational: [],
    },
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
      { id: 3, project: 'payments-relaunch', severity: 'medium', kind: 'bot_status', title: 'Load test flagged latency spike', body: 'p95 checkout latency exceeded 800ms under 3x load. Investigation assigned.', created_at: '2026-08-24T18:36:13.609423+00:00', acked: false, state: 'new', deep_link: 's2:project/payments-relaunch' },
      { id: 2, project: 'demo-project', severity: 'info', kind: 'bot_status', title: 'Nightly sweep finished', body: 'Bot fleet check complete: no issues found.', created_at: '2026-08-24T18:10:07.321115+00:00', acked: true, state: 'seen', deep_link: 's2:project/demo-project' },
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
  goals: {
    'demo-project': { goals: [] },
    'payments-relaunch': { goals: [
      { goal_id: 'GOAL-DEMO1', project_id: 'payments-relaunch', title: 'Reliable checkout', description: 'Keep retries safe.', position: 0, archived_at: null, objective_ids: [11] },
      { goal_id: 'GOAL-DEMO2', project_id: 'payments-relaunch', title: 'Operational clarity', description: 'Keep runbooks current.', position: 1, archived_at: null, objective_ids: [] },
    ] },
  },
  workflows: {
    'demo-project': { workflows: [] },
    'payments-relaunch': { workflows: [{ project_id: 'payments-relaunch', name: 'release', version: 1, definition: { nodes: [{ id: 'build', title: 'Build release', depends_on: [], human_gate: false }] }, archived_at: null, archived_by: null }] },
  },
  milestones: {
    'demo-project': { milestones: [] },
    'payments-relaunch': { milestones: [{ id: 1, name: 'Launch', due: '2026-10-01', closed: false, archived_at: null, archived_by: null, item_refs: [], total: 0, done: 0 }] },
  },
  missionArchive: {
    'demo-project': { missions: [] },
    'payments-relaunch': { missions: [{ archive_id: 'MISSION-DEMO1', project_id: 'payments-relaunch', mission: 'Stabilise the legacy checkout', archived_by: 'sahil', archived_at: '2026-08-20T12:00:00+00:00' }] },
  },
  content: {
    'demo-project': { content: [] },
    'payments-relaunch': { content: [
      { content_id: 'CONTENT-DEMO1', project_id: 'payments-relaunch', filename: 'release-runbook.md', media_type: 'text/markdown', size_bytes: 48, sha256: 'a'.repeat(64), uploaded_by: 'sahil', uploaded_at: '2026-08-24T19:10:00+00:00' },
      { content_id: 'CONTENT-BLOCKED', project_id: 'payments-relaunch', filename: 'required-evidence.md', media_type: 'text/markdown', size_bytes: 20, sha256: 'b'.repeat(64), uploaded_by: 'sahil', uploaded_at: '2026-08-24T19:11:00+00:00' },
    ] },
  },
  contentPreviews: {
    'CONTENT-DEMO1': { content_id: 'CONTENT-DEMO1', project_id: 'payments-relaunch', filename: 'release-runbook.md', media_type: 'text/markdown', size_bytes: 48, sha256: 'a'.repeat(64), uploaded_by: 'sahil', uploaded_at: '2026-08-24T19:10:00+00:00', preview_kind: 'text', text: '# Release runbook\n\nUse the rollback gate.\n', truncated: false },
    'CONTENT-BLOCKED': { content_id: 'CONTENT-BLOCKED', project_id: 'payments-relaunch', filename: 'required-evidence.md', media_type: 'text/markdown', size_bytes: 20, sha256: 'b'.repeat(64), uploaded_by: 'sahil', uploaded_at: '2026-08-24T19:11:00+00:00', preview_kind: 'text', text: '# Required evidence', truncated: false },
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
  goals: {},
  workflows: {},
  milestones: {},
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

function evaluatePlugin(source, host) {
  // The generated bundle is self-contained; keep the legacy canvas seam
  // observable for the existing journeys by injecting the same test double
  // through the loader's runtime options.
  const loaded = evaluatePluginBundle(source, host, { runtime: rt, assertImports: false });
  assert.deepEqual([...new Set(loaded.imports)].sort(), ['@hermes/plugin-sdk', 'react', 'react/jsx-runtime']);
  assert.equal(loaded.plugin.id, 'hermes-project-stewardship');
  return loaded;
}

function createDeferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

async function createRuntime({ mode = 'populated', failOnce = false, failMutationPath = null, objectivePayload = null } = {}) {
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
  if (objectivePayload) data.objectives['payments-relaunch'] = objectivePayload;
  const deferred = mode === 'loading' ? createDeferred() : null;
  let shouldFail = failOnce;

  const rest = async (path, init = {}) => {
    const method = init.method || 'GET';
    const body = init.body || {};
    calls.push({ path, method, body: init.body });
    // Route on the path alone; the Vision screen (design round f) reads its
    // lists with ?include_archived=true and the Roadmap with ?project_id=.
    const query = new URLSearchParams(path.includes('?') ? path.slice(path.indexOf('?') + 1) : '');
    path = path.split('?')[0];
    if (method !== 'GET' && failMutationPath === path) {
      throw new Error('Synthetic mutation failure');
    }
    if (failMutationPath === path && failMutationPath === '/onboard/discover') {
      // Discovery is a GET; the fail-closed P7.GATE case needs GET failures.
      throw new Error('Synthetic discovery failure');
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
      data.goals[projectId] = { goals: [] };
      data.missionArchive[projectId] = { missions: [] };
      data.content[projectId] = { content: [] };
      data.events[projectId] = { events: [] };
      data.backlog[projectId] = { backlog: [] };
      data.views[projectId] = { views: [] };
      return { project_id: projectId, screen: 's2', group: `${projectId}-ops` };
    }
    if (method === 'POST' && path.startsWith('/initiatives/') && path.endsWith('/approve')) {
      const ref = decodeURIComponent(path.split('/')[2]);
      if (!body?.expected_fingerprint) throw new Error('approve requires expected_fingerprint');
      data.inbox.items = data.inbox.items.filter((item) => item.ref !== ref);
      data.inbox.count = data.inbox.items.length;
      data.dashboard.owed_decisions = data.inbox.count;
      data.DECISION_RECEIPTS ??= {};
      data.DECISION_RECEIPTS[ref] = { decision: 'approved', ref, fingerprint: body.expected_fingerprint };
      return { ok: true, ref, status: 'approved', receipt: { decision: 'approved', ref } };
    }
    if (method === 'POST' && path.startsWith('/initiatives/') && path.endsWith('/reject')) {
      const ref = decodeURIComponent(path.split('/')[2]);
      if (!body?.expected_fingerprint) throw new Error('reject requires expected_fingerprint');
      if (!body?.reason) throw new Error('reject requires a reason');
      data.inbox.items = data.inbox.items.filter((item) => item.ref !== ref);
      data.inbox.count = data.inbox.items.length;
      data.dashboard.owed_decisions = data.inbox.count;
      data.DECISION_RECEIPTS ??= {};
      data.DECISION_RECEIPTS[ref] = { decision: 'rejected', ref, fingerprint: body.expected_fingerprint };
      return { ok: true, ref, status: 'rejected', receipt: { decision: 'rejected', ref } };
    }
    // Phase 4 contract: desktop fetches and displays the decision scope before
    // deciding (round-3 R1); ambiguous outcomes read receipts (round-3 R2).
    const decisionRead = path.match(/^\/initiatives\/([^/]+)\/decision$/);
    if (method === 'GET' && decisionRead) {
      const ref = decodeURIComponent(decisionRead[1]);
      return {
        ref,
        title: 'Mock decision scope',
        reason: 'Rationale shown on the desktop card.',
        validation: { contract: { steps: ['Checkout suite', 'Refund suite'], tests: 'checkout and refund test suite' }, links: [], age: 'fresh' },
        expected_outcome: 'Refunds complete without support intervention',
        fingerprint: `fp-${ref}`,
        revision: 1,
      };
    }
    const receiptsRead = path.match(/^\/initiatives\/([^/]+)\/decision\/receipts$/);
    if (method === 'GET' && receiptsRead) {
      const ref = decodeURIComponent(receiptsRead[1]);
      const receipt = (data.DECISION_RECEIPTS ?? {})[ref];
      return { receipts: receipt ? [receipt] : [] };
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
    const lifecycle = path.match(/^\/projects\/([^/]+)\/(disable|re-enable|pause|resume|freeze|archive|restore)$/);
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
      if (action === 'archive') { settings.enabled = false; settings.archived_at = '2026-09-12T12:00:00+00:00'; }
      if (action === 'restore') { settings.enabled = true; settings.phase = 'active'; settings.paused_at = null; settings.archived_at = null; }
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
    const POPULATED_PORTFOLIO = { projects: [], groups: { decisions: [
      { kind: 'initiative_approval', ref: 'INI-DEMO-1', title: 'Add weekly digest email', project: 'demo-project', risk: 'low', age_days: 2 },
      { kind: 'initiative_approval', ref: 'INI-DEMO-2', title: 'Enable one-click refunds', project: 'payments-relaunch', risk: 'medium', age_days: 5 },
    ], interventions: [
      { kind: 'blocked_work', ref: 'HDY-14', title: 'Refund webhook retries', project: 'payments-relaunch', risk: 'high', age_days: 1, detail: 'Blocked on provider credentials' },
    ], informational: [] } };
  const assignWork = path.match(/^\/projects\/([^/]+)\/work-items\/([^/]+)\/assign$/);
    if (method === 'POST' && assignWork) {
      const projectId = decodeURIComponent(assignWork[1]);
      const ref = decodeURIComponent(assignWork[2]);
      const item = data.workItems[projectId]?.work_items.find((candidate) => candidate.ref === ref);
      if (item) item.assignee = init.body?.assignee_id ?? null;
      return clone(item ?? { ref, assignee: init.body?.assignee_id ?? null });
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
    const goalCollection = path.match(/^\/projects\/([^/]+)\/goals$/);
    if (method === 'POST' && goalCollection) {
      const projectId = decodeURIComponent(goalCollection[1]);
      data.goals[projectId] ??= { goals: [] };
      const goal = {
        goal_id: `GOAL-${Date.now()}`, project_id: projectId,
        title: init.body?.title, description: init.body?.description ?? '',
        position: data.goals[projectId].goals.filter((item) => !item.archived_at).length,
        archived_at: null, objective_ids: init.body?.objective_ids ?? [],
      };
      data.goals[projectId].goals.push(goal);
      return clone(goal);
    }
    const goalOrder = path.match(/^\/projects\/([^/]+)\/goals\/order$/);
    if (method === 'PUT' && goalOrder) {
      const projectId = decodeURIComponent(goalOrder[1]);
      const goals = data.goals[projectId]?.goals ?? [];
      (init.body?.goal_ids ?? []).forEach((goalId, position) => {
        const goal = goals.find((item) => item.goal_id === goalId);
        if (goal) goal.position = position;
      });
      return { goals: clone(goals.filter((goal) => !goal.archived_at).sort((a, b) => a.position - b.position)) };
    }
    const goalMutation = path.match(/^\/projects\/([^/]+)\/goals\/([^/]+)(?:\/(archive|restore))?$/);
    if (goalMutation) {
      const projectId = decodeURIComponent(goalMutation[1]);
      const goalId = decodeURIComponent(goalMutation[2]);
      const goal = data.goals[projectId]?.goals.find((item) => item.goal_id === goalId);
      if (method === 'PATCH' && goal) {
        Object.assign(goal, init.body);
        return clone(goal);
      }
      if (method === 'POST' && goal && goalMutation[3]) {
        goal.archived_at = goalMutation[3] === 'archive' ? '2026-08-25T12:00:00+00:00' : null;
        return clone(goal);
      }
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
    const teamRead = path.match(/^\/projects\/([^/]+)\/team$/);
    if (method === 'GET' && teamRead) return {
      project_id: decodeURIComponent(teamRead[1]), membership_revision: 3, complete: true,
      work_item_count: 2,
      members: [
        { profile_slug: 'octacon', role: 'lead', state: 'active', hermes_available: true, workload: { total: 1 } },
        { profile_slug: 'quan', role: 'member', state: 'active', hermes_available: true, workload: { total: 1 } },
      ],
    };
    if (method === 'GET' && /^\/projects\/[^/]+\/transfers\/pending$/.test(path)) return { operations: [] };
    if (method === 'POST' && /^\/projects\/[^/]+\/transfers\/preview$/.test(path)) return {
      complete: true, enumerated_count: 2, membership_revision: 3, fingerprint: 'phase4-fingerprint',
      eligible_items: [
        { id: 'HDY-12', title: 'Fix double-charge on retry path', status: 'backlog', revision: 7 },
        { id: 'HDY-13', title: 'Add payment idempotency keys', status: 'backlog', revision: 8 },
      ], excluded_items: [],
    };
    if (method === 'POST' && /^\/projects\/[^/]+\/transfers\/execute$/.test(path)) return { op_id: 'OP-PHASE4', state: 'completed', project_id: 'payments-relaunch' };
    if (method === 'POST' && /^\/projects\/[^/]+\/reassignments$/.test(path)) return { op_id: 'OP-BULK', state: 'completed', project_id: 'payments-relaunch', actor: 'sahil' };
    if (method === 'GET' && path === '/operations/OP-PHASE4') return { op_id: 'OP-PHASE4', state: 'completed', project_id: 'payments-relaunch', actor: 'sahil', items: [{ item_id: 'HDY-12', outcome: 'completed', actor: 'sahil' }, { item_id: 'HDY-13', outcome: 'completed', actor: 'sahil' }] };
    if (method === 'GET' && path === '/operations/OP-BULK') return { op_id: 'OP-BULK', state: 'completed', project_id: 'payments-relaunch', actor: 'sahil', operation_audit: { operation: 'OP-BULK', actor: 'sahil' }, items: [{ item_id: 'HDY-13', outcome: 'completed', audit: { actor: 'sahil', action: 'workitem.reassigned' } }] };
    if (path === '/dashboard') return clone(data.dashboard);
    if (path === '/portfolio') return clone(data.portfolio ?? POPULATED_PORTFOLIO);
    if (path === '/onboard/discover') return clone(data.DISCOVER);
    if (method === 'POST' && path === '/onboard/preflight') return clone(data.PREFLIGHT);
    if (method === 'POST' && /^\/projects\/[^/]+\/first-assessment$/.test(path)) {
      data.FIRST_ASSESSMENT_CALLS = (data.FIRST_ASSESSMENT_CALLS ?? 0) + 1;
      return clone(data.FIRST_ASSESSMENT);
    }
    if (path === '/inbox') return clone(data.inbox);
    if (/^\/notifications(\?|$)/.test(path)) return clone(data.notifications);
    if (path === '/settings/notifications/effective') {
      return { effective: { dedupe_window_minutes: 60, quiet_hours: null, bypass_quiet_hours: ['approval_required'], channels: { in_app: { min_severity: 'low' }, desktop: { enabled: true, min_severity: 'high', quiet_hours_apply: true } }, ignored: [], timezone: 'Europe/London' } };
    }
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
    const contentDependencies = path.match(/^\/projects\/([^/]+)\/content\/([^/]+)\/dependencies$/);
    if (method === 'GET' && contentDependencies) {
      const contentId = decodeURIComponent(contentDependencies[2]);
      return { dependencies: contentId === 'CONTENT-BLOCKED' ? [{ kind: 'assessment', ref: 'OBJ-1:1' }] : [] };
    }
    const contentLifecycle = path.match(/^\/projects\/([^/]+)\/content\/([^/]+)(?:\/(archive|restore))?$/);
    if (contentLifecycle && (method === 'POST' || method === 'DELETE')) {
      const projectId = decodeURIComponent(contentLifecycle[1]);
      const contentId = decodeURIComponent(contentLifecycle[2]);
      const action = contentLifecycle[3] ?? 'remove';
      const rows = data.content[projectId]?.content ?? [];
      const item = rows.find((row) => row.content_id === contentId);
      if (!item) throw new Error('unknown content');
      if (action === 'archive') item.archived_at = '2026-09-12T12:00:00+00:00';
      if (action === 'restore') item.archived_at = null;
      if (action === 'remove') item.removal_state = 'file_removed';
      return clone(item);
    }
    const workflowCollection = path.match(/^\/projects\/([^/]+)\/workflows$/);
    if (method === 'POST' && workflowCollection) {
      const projectId = decodeURIComponent(workflowCollection[1]);
      const row = { project_id: projectId, name: init.body.name, version: 1, definition: { nodes: init.body.nodes }, archived_at: null, archived_by: null };
      data.workflows[projectId] ??= { workflows: [] };
      data.workflows[projectId].workflows.push(row);
      return clone(row);
    }
    const workflowAction = path.match(/^\/projects\/([^/]+)\/workflows\/([^/]+)\/(versions|start|archive|restore)$/);
    if (method === 'POST' && workflowAction) {
      const projectId = decodeURIComponent(workflowAction[1]);
      const name = decodeURIComponent(workflowAction[2]);
      const action = workflowAction[3];
      const rows = data.workflows[projectId].workflows.filter((row) => row.name === name);
      if (action === 'versions') {
        const row = { project_id: projectId, name, version: Math.max(...rows.map((item) => item.version)) + 1, definition: { nodes: init.body.nodes }, archived_at: null, archived_by: null };
        data.workflows[projectId].workflows.push(row);
        return clone(row);
      }
      if (action === 'start') {
        data.workflowRuns ??= {};
        const key = `${projectId}:${name}`;
        data.workflowRuns[key] ??= [];
        const run = { project_id: projectId, name, version: init.body.version, run_key: init.body.run_key, status: 'complete', replayed: false, tasks: { 'step-1': 'HDY-NEW' } };
        data.workflowRuns[key].push(run);
        return clone(run);
      }
      rows.forEach((row) => { row.archived_at = action === 'archive' ? '2026-09-12T12:00:00+00:00' : null; });
      return { project_id: projectId, name, versions: clone(rows) };
    }
    const workflowRuns = path.match(/^\/projects\/([^/]+)\/workflows\/([^/]+)\/runs$/);
    if (method === 'GET' && workflowRuns) {
      const key = `${decodeURIComponent(workflowRuns[1])}:${decodeURIComponent(workflowRuns[2])}`;
      return { runs: clone(data.workflowRuns?.[key] ?? []) };
    }
    const milestoneDetail = path.match(/^\/projects\/([^/]+)\/milestones\/([^/]+)$/);
    if (method === 'GET' && milestoneDetail) {
      const projectId = decodeURIComponent(milestoneDetail[1]);
      const name = decodeURIComponent(milestoneDetail[2]);
      return clone(data.milestones[projectId].milestones.find((item) => item.name === name));
    }
    const workDetailRead = path.match(/^\/projects\/([^/]+)\/work-items\/([^/]+)$/);
    if (method === 'GET' && workDetailRead) {
      const pid = decodeURIComponent(workDetailRead[1]);
      const item = data.workItems[pid]?.work_items.find(item => item.ref === decodeURIComponent(workDetailRead[2]));
      if (!item) throw new Error('missing canonical work');
      return {work_item: {...clone(item), id:item.ref}, history:[], dependencies:[], dependents:[], parent_choices:[], children:[]};
    }
    const milestoneCollectionMutation = path.match(/^\/projects\/([^/]+)\/milestones$/);
    if (method === 'POST' && milestoneCollectionMutation) {
      const projectId = decodeURIComponent(milestoneCollectionMutation[1]);
      data.milestones[projectId] ??= { milestones: [] };
      const id = Math.max(0, ...data.milestones[projectId].milestones.map((item) => Number(item.id) || 0)) + 1;
      const row = { id, name: init.body.name, due: init.body.due, closed: false, archived_at: null, archived_by: null, item_refs: [], total: 0, done: 0 };
      data.milestones[projectId].milestones.push(row);
      return clone(row);
    }
    const milestoneMutation = path.match(/^\/projects\/([^/]+)\/milestones\/([^/]+)(?:\/(rename|attach|detach|archive|restore))?$/);
    if (milestoneMutation && ['POST', 'PATCH'].includes(method)) {
      const projectId = decodeURIComponent(milestoneMutation[1]);
      const name = decodeURIComponent(milestoneMutation[2]);
      const action = milestoneMutation[3] ?? 'update';
      const row = data.milestones[projectId].milestones.find((item) => item.name === name);
      if (action === 'update') {
        if (Object.prototype.hasOwnProperty.call(init.body, 'closed')) row.closed = Boolean(init.body.closed);
        if (Object.prototype.hasOwnProperty.call(init.body, 'due')) row.due = init.body.due;
      }
      if (action === 'rename') row.name = init.body.new_name;
      if (action === 'attach' && !row.item_refs.includes(init.body.ref)) row.item_refs.push(init.body.ref);
      if (action === 'detach') row.item_refs = row.item_refs.filter((ref) => ref !== init.body.ref);
      if (action === 'archive') row.archived_at = '2026-09-12T12:00:00+00:00';
      if (action === 'restore') row.archived_at = null;
      row.total = row.item_refs.length;
      return clone(row);
    }
    const contentPreviewRead = path.match(/^\/projects\/([^/]+)\/content\/([^/]+)\/preview$/);
    if (method === 'GET' && contentPreviewRead) {
      const projectId = decodeURIComponent(contentPreviewRead[1]);
      const contentId = decodeURIComponent(contentPreviewRead[2]);
      const row = data.content[projectId]?.content?.find((item) => item.content_id === contentId) ?? {};
      return { ...clone(data.contentPreviews[contentId] ?? {}), ...clone(row) };
    }
    const missionArchiveRead = path.match(/^\/projects\/([^/]+)\/missions\/archive$/);
    if (method === 'GET' && missionArchiveRead) {
      const projectId = decodeURIComponent(missionArchiveRead[1]);
      return clone(data.missionArchive[projectId] ?? { missions: [] });
    }
    const milestonesRead = path.match(/^\/projects\/([^/]+)\/milestones$/);
    if (milestonesRead) {
      const projectId = decodeURIComponent(milestonesRead[1]);
      return clone(data.milestones?.[projectId] ?? { milestones: [] });
    }
    // The Roadmap read model for one project, as the Vision screen reads it:
    // the initiatives with no links yet and no linked work.
    if (method === 'GET' && path === '/roadmap') {
      const projectId = query.get('project_id');
      return {
        projects: [{
          id: projectId, label: projectId,
          initiatives: (data.initiatives[projectId]?.initiatives ?? []).map((row) => ({
            ref: row.ref, title: row.title, governance: row.status, milestones: [], objectives: [], delivery: { state: 'no_linked_work' },
          })),
          goals: [],
        }],
        can_write: true,
      };
    }
    const canvasRead = path.match(/^\/projects\/([^/]+)\/canvas$/);
    if (canvasRead) {
      const projectId = decodeURIComponent(canvasRead[1]);
      if (method === 'PUT') {
        data.canvas ??= {};
        const rev = (data.canvas[projectId]?.revision ?? 0) + 1;
        data.canvas[projectId] = { project_id: projectId, revision: rev, objects: init.body?.objects ?? [], connectors: init.body?.connectors ?? [] };
        return clone(data.canvas[projectId]);
      }
      return clone(data.canvas?.[projectId] ?? { project_id: projectId, revision: 0, objects: [], connectors: [] });
    }
    const canvasSession = path.match(/^\/projects\/([^/]+)\/canvas\/sessions$/);
    if (method === 'POST' && canvasSession) {
      data.canvasSessions ??= [];
      // Real shape: a session carries either a clarification question (status
      // active) or the proposals it drafted (status complete).
      const session = { session_id: `cs-${data.canvasSessions.length + 1}`, status: 'active', current_question: { id: 'missing-claim', question: 'What problem or user need are we solving?' }, answers: [], proposals: [] };
      data.canvasSessions.push(session);
      return clone(session);
    }
    const sessionAnswer = path.match(/^\/canvas\/sessions\/([^/]+)\/answer$/);
    if (method === 'POST' && sessionAnswer) {
      const sessionId = decodeURIComponent(sessionAnswer[1]);
      const session = (data.canvasSessions ?? []).find((row) => row.session_id === sessionId) ?? { session_id: sessionId, answers: [] };
      session.answers = [...(session.answers ?? []), { outcome: init.body?.outcome, answer: init.body?.answer ?? '' }];
      session.current_question = null;
      session.status = init.body?.outcome === 'stop' ? 'stopped' : 'complete';
      session.proposals = session.status === 'complete'
        ? [{ proposal_id: `canvas-proposal-${sessionId}`, status: 'pending', kind: 'technical_plan', title: 'Technical implementation plan', source_object_ids: ((data.canvas?.[session.project_id] ?? data.canvas?.['payments-relaunch'])?.objects ?? []).map((item) => item.id), requires_approval: true }]
        : [];
      return clone(session);
    }
    const sessionRead = path.match(/^\/canvas\/sessions\/([^/]+)$/);
    if (method === 'GET' && sessionRead) {
      const sessionId = decodeURIComponent(sessionRead[1]);
      return clone((data.canvasSessions ?? []).find((row) => row.session_id === sessionId) ?? { session_id: sessionId, status: 'unknown', proposals: [] });
    }
    const proposalDecision = path.match(/^\/canvas\/proposals\/([^/]+)\/decision$/);
    if (method === 'POST' && proposalDecision) {
      const proposalId = decodeURIComponent(proposalDecision[1]);
      for (const session of data.canvasSessions ?? []) {
        const proposal = (session.proposals ?? []).find((row) => row.proposal_id === proposalId);
        if (proposal) proposal.status = init.body?.approve ? 'approved' : 'rejected';
      }
      return { proposal_id: proposalId, status: init.body?.approve ? 'approved' : 'rejected' };
    }
    const projectRead = path.match(/^\/projects\/([^/]+)\/(settings|work-items|initiatives|objectives|goals|workflows|events|backlog|views|reports|content)$/);
    if (projectRead) {
      const projectId = decodeURIComponent(projectRead[1]);
      const kind = projectRead[2];
      if (kind === 'settings') return clone(data.settings[projectId] ?? { project_id: projectId, mission: '', phase: 'active' });
      if (kind === 'work-items') return clone(data.workItems[projectId] ?? { work_items: [] });
      if (kind === 'initiatives') return clone(data.initiatives[projectId] ?? { initiatives: [] });
      if (kind === 'objectives') return clone(data.objectives[projectId] ?? { objectives: [] });
      if (kind === 'goals') return clone(data.goals[projectId] ?? { goals: [] });
      if (kind === 'workflows') return clone(data.workflows[projectId] ?? { workflows: [] });
      if (kind === 'events') return clone(data.events[projectId] ?? { events: [] });
      if (kind === 'backlog') return clone(data.backlog[projectId] ?? { backlog: [] });
      if (kind === 'views') return clone(data.views[projectId] ?? { views: [] });
      if (kind === 'reports') return clone(data.reports[projectId] ?? { reports: [] });
      if (kind === 'content') return clone(data.content[projectId] ?? { content: [] });
    }
    throw new Error(`Unhandled test request: ${method} ${path}`);
  };

  const pluginSource = readFileSync(PLUGIN_PATH, 'utf8');
  // Default: render the SHIPPED artifact (plugin.js), i.e. exactly what Hermes
  // Desktop loads. DOCKYARD_EVALUATE_SOURCE=1 renders the maintained src/ tree
  // instead (debugging only). DOCKYARD_EVALUATE_ARTIFACT=1 is kept for the
  // old-vs-new equivalence run and relaxes the import check for pre-split files.
  const loaded = process.env.DOCKYARD_EVALUATE_SOURCE === '1'
    ? evaluatePlugin(pluginSource, { navigate: (path) => navigations.push(path) })
    : evaluateArtifact(pluginSource, { navigate: (path) => navigations.push(path) },
      { assertImports: process.env.DOCKYARD_EVALUATE_ARTIFACT !== '1' });
  // shared loader owns the source bundle; the canvas seam is injected above
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
      // React 19 + jsdom: synthetic input events do not drive controlled
      // React state (props.value stays stale). Mirror the browser by also
      // invoking the React onChange prop directly when present.
      const propsKey = Object.keys(element).find((k) => k.startsWith('__reactProps'));
      const props = propsKey ? element[propsKey] : null;
      if (props && typeof props.onChange === 'function') {
        props.onChange({ target: element, currentTarget: element, bubbles: true });
      }
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

  // Sahil 05/10: the app opens on All projects. Journeys that need a project
  // pick it through the switcher, as a person does (payments-relaunch is the
  // project the old startup rule opened: it needs the most attention here).
  const pickProject = async (id, ms = 80) => {
    await click('.dy-sw-trigger');
    await click(`[data-project-option="${id}"]`, ms);
  };

  return { dom, loaded, contributions, calls, navigations, clipboardWrites, data, deferred, jsdomMessages, mount, flush, click, pickProject, setValue, setFile, dispose };
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
  assert(!rootStyle.fontFamily.includes('Times New Roman'), `host font leaked into Project Stewardship: ${rootStyle.fontFamily}`);
  assert.notEqual(rootStyle.backgroundColor, 'rgba(0, 0, 0, 0)', 'root background is not explicit');
  assert.notEqual(rootStyle.color, 'rgba(0, 0, 0, 0)', 'root text colour is not explicit');
  assert.equal(document.querySelectorAll('[data-project-row]').length, 2, 'dashboard should render both projects');
  assert(document.querySelector('[role="table"][aria-label="Project fleet"]'), 'project roster is not exposed as a semantic table');
  assert.equal(document.querySelectorAll('[role="columnheader"]').length, 6, 'project table should expose six column headers');
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

  const decisionRows = [...doc.querySelectorAll('.dockyard-command-attention-row')].filter((row) => row.textContent.includes('Approval'));
  assert.equal(decisionRows.length, 2, 'command table must show the actual owner decisions, not only a count (count=' + decisionRows.length + ')');
  assert(decisionRows.every((row) => row.textContent.includes('Add weekly digest email') || row.textContent.includes('Enable one-click refunds')), 'command table rows carry the pending initiative decisions');
  assert(doc.querySelector('.dockyard-command-attention-row'), 'blocked interventions stay visible next to decisions');
  assert.equal(doc.querySelectorAll('.dockyard-command-metric').length, 4, 'dashboard must expose a four-part metric strip (count=' + doc.querySelectorAll('.dockyard-command-metric').length + ')');
  const fleetTable = doc.querySelector('[role="table"][aria-label="Project fleet"]');
  assert(fleetTable, 'dashboard is missing the Project fleet table');
  const fleetText = fleetTable.textContent;
  assert(fleetText.includes('demo-project') && fleetText.includes('payments-relaunch'), 'fleet table must expose both projects');
  assert(fleetText.includes('On track') && fleetText.includes('At risk'), 'fleet table must expose health states');
  assert(fleetText.includes('3/11') || fleetText.includes('Beta'), 'fleet table must expose delivery mix and milestone context');
  assert(doc.querySelector('.dockyard-command-detail-activity'), 'dashboard is missing the attributed activity surface');
  assert.match(doc.body.textContent, /Bot teams/, 'dashboard must expose the bot teams surface');
  assert.match(doc.body.textContent, /Review 2 decisions/, 'dashboard must surface the pending decision count');

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

  const rows = [...doc.querySelectorAll('[data-inbox-row]')];
  assert.equal(rows.length, 2, 'each approval must have a separated inbox row');
  assert.equal(rows[0]?.getAttribute('data-inbox-ref'), 'INI-DEMO-2', 'approval rows must be risk ordered');
  assert(doc.querySelector('[data-inbox-tab="all"]'), 'approval inbox is missing the All filter');
  assert(doc.querySelector('[data-inbox-tab="urgent"]'), 'approval inbox is missing the Urgent filter');

  // Batch D contract: opening a list row reveals the complete decision scope.
  await runtime.click('[data-inbox-ref="INI-DEMO-2"]', 60);
  const panel = doc.querySelector('[data-inbox-panel="true"]');
  assert(panel, 'opening an approval row did not reveal the detail panel');
  for (const section of ['Requested change', 'Policy gate', 'Potential impact', 'Capability boundary', 'Who asked', 'Evidence', 'Affected work items', 'Activity', "Comments don't change the decision"]) {
    assert.match(panel.textContent, new RegExp(section.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), `detail panel is missing ${section}`);
  }
  assert.equal(panel.querySelectorAll('[data-evidence-cell]').length, 3, 'detail panel must expose the fetched validation evidence');
  assert(panel.querySelector('[data-action="approve"]'), 'detail panel is missing the supported Approve action');
  assert(panel.querySelector('[data-action="reject"]'), 'detail panel is missing the supported Reject action');
  assert(panel.querySelector('[data-action="request-changes"]'), 'detail panel is missing the supported Request changes action');
  assert.match(panel.textContent, /Rationale shown on the desktop card/);
  assert(runtime.calls.some((call) => call.path === '/projects/payments-relaunch/initiatives'), 'approval view did not load initiative detail supported by the backend');

  // Batch D replaces the former confirm-then-second-form flow with ONE dialog
  // that captures the required reason before any POST is permitted.
  await runtime.click('[data-inbox-panel="true"] [data-action="reject"]', 40);
  const rejectionConfirm = doc.querySelector('[data-destructive-confirm="reject-INI-DEMO-2"]');
  assert(rejectionConfirm && !rejectionConfirm.hidden, 'Reject did not open the reason confirmation dialog');
  assert(!runtime.calls.some((call) => call.method === 'POST' && call.path === '/initiatives/INI-DEMO-2/reject'), 'Reject mutated state before confirmation');
  const confirm = rejectionConfirm.querySelector('[data-action="confirm-destructive-action"]');
  assert(confirm?.disabled, 'reject confirmation must stay disabled without a reason');
  await runtime.setValue('[data-destructive-confirm="reject-INI-DEMO-2"] input', 'Rollback risk not acceptable', 60);
  await runtime.click('[data-destructive-confirm="reject-INI-DEMO-2"] [data-action="confirm-destructive-action"]', 80);
  const rejectionPost = runtime.calls.find((call) => call.method === 'POST' && call.path === '/initiatives/INI-DEMO-2/reject');
  assert(rejectionPost, 'rejection POST was not sent');
  assert.equal(rejectionPost.body?.reason, 'Rollback risk not acceptable', 'rejection POST did not carry the owner reason');
  assert.equal(rejectionPost.body?.expected_fingerprint, `fp-INI-DEMO-2`, 'rejection POST did not bind the displayed fingerprint');
  await runtime.flush(1000);
  assert(!doc.body.textContent.includes('Enable one-click refunds'), 'rejected item remains visible after refresh');
  await runtime.dispose();
}

async function testProjectDashboardScreen() {
  const runtime = await createRuntime();
  await runtime.mount();
  await runtime.pickProject('payments-relaunch');
  await runtime.click('[data-tab="project"]', 80);
  const doc = runtime.dom.window.document;
  assert(doc.querySelector('[data-project-dashboard]'), 'project dashboard screen is missing');
  assert.match(doc.body.textContent, /Checkout reliability rebuild/);
  assert.equal(doc.querySelectorAll('[data-project-view]').length, 10, 'project dashboard must expose ten supported views (design round f: one Vision tab replaced Objectives and Initiatives; checks round 1: Memory)');
  assert(doc.querySelector('[data-project-view="memory"]'), 'the Memory tab (checks round 1, pick 1b) is on the project view bar');
  // Projects land on Overview (owner decision); the Vision screen is
  // reachable from the project view bar.
  assert(doc.querySelector('[data-project-view].active')?.getAttribute('data-project-view'), 'overview', 'Projects must land on Overview');
  await runtime.click('[data-project-view="plan"]', 60);
  assert(doc.querySelector('[data-project-view="plan"].active') && doc.querySelector('[data-plan-screen="payments-relaunch"]'), 'Vision did not open from the project view bar');
  await runtime.click('[data-project-view="overview"]', 60);
  await runtime.click('[data-project-view="overview"]', 60);
  assert(doc.querySelector('[data-project-visual]'), 'project overview is missing work visualisation');
  assert(doc.querySelector('[data-overview-work]'), 'project overview is missing current work context');
  assert(doc.querySelector('[data-overview-initiatives]'), 'project overview is missing initiative context');
  assert(doc.querySelector('[data-overview-activity]'), 'project overview is missing attributed activity context');
  assert.match(doc.querySelector('[data-overview-work]').textContent, /Fix double-charge on retry path/);
  await runtime.click('[data-project-view="board"]');
  // r6 (Sahil's C2 review): five columns with stated statuses, no catch-all column.
  assert.equal(doc.querySelectorAll('[data-board-column]').length, 5, 'project board must expose backlog, active, review, blocked and done columns');
  assert(doc.querySelectorAll('[data-work-card]').length >= 3, 'project board did not render backend work items');
  assert(doc.querySelector('[data-kanban-help]'), 'project board must explain drag and keyboard moves');
  // r6: a card expands in place; Open full details opens the editable drawer.
  await runtime.click('[data-card-toggle="HDY-12"]');
  await runtime.click('[data-card-open="HDY-12"]');
  const workDetail = doc.querySelector('[data-work-item-detail="HDY-12"]');
  assert(workDetail, 'board item did not open its editable detail');
  assert.match(workDetail.textContent, /Edit backlog item|Task ID/, 'editable drawer rendered with its editing contract');
  // The assignee rides an input; textContent excludes input values, so the
  // contract is asserted on the control's value (review round-6: legacy
  // harness assertion was checking the wrong surface, not missing data).
  const assigneeControl = workDetail.querySelector('select[aria-label="Assignee"]');
  assert.equal(assigneeControl?.value, 'octacon-bot', 'shared assignee picker must carry the canonical value unchanged');
  assert(!workDetail.querySelector('[data-work-field="assignee"] input'), 'legacy free-text assignee editor remains present');
  await runtime.setValue('select[aria-label="Assignee"]', 'quan-bot');
  await runtime.click('[data-action="save-work-item"]', 40);
  const assignment = runtime.calls.find((call) => call.method === 'POST' && call.path.endsWith('/work-items/HDY-12/assign'));
  assert.equal(assignment?.body?.assignee_id, 'quan-bot', 'selected discovered profile changed on the Desktop-to-proxy assignment payload');
  assert(workDetail.querySelector('input, textarea, select'), 'editable item detail exposes no editing controls');
  assert(workDetail.querySelector('[data-action="save-work-item"]'), 'editable item detail is missing Save');
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
    '/projects/payments-relaunch/goals',
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
  await runtime.pickProject('payments-relaunch');
  await runtime.click('[data-tab="project"]', 80);
  // Design round f: the mission, goals and objectives are managed on the
  // project's Vision screen (one tab for what the Objectives tab held).
  await runtime.click('[data-project-view="plan"]', 80);
  const doc = runtime.dom.window.document;
  const row = (kind, id) => `[data-plan-row="${kind}"][data-plan-id="${id}"]`;
  const posted = (method, path) => runtime.calls.some((call) => call.method === method && call.path === path);

  await runtime.click(`${row('objective', 11)} .dy-plan-row-open`, 40);
  assert(doc.querySelector('[data-objective-evidence="11"]'), 'objective evidence/history is missing');
  assert.match(doc.querySelector('[data-objective-evidence="11"]').textContent, /Unknown|unknown/);
  assert.equal(doc.querySelectorAll('[data-plan-row="goal"]').length, 2, 'active goals did not render');
  await runtime.click(`${row('goal', 'GOAL-DEMO1')} .dy-plan-row-open`, 40);
  assert.match(doc.querySelector('[data-plan-drawer="goal"]').textContent, /Checkout reliability/, 'linked objective was not rendered on its goal');
  await runtime.click(`${row('goal', 'GOAL-DEMO2')} .dy-plan-row-open`, 40);
  assert.match(doc.querySelector('[data-plan-drawer="goal"]').textContent, /No objectives yet/, 'nullable objective relationship was not visible');
  assert(doc.querySelector('[data-plan-mission]'), 'mission strip is missing');
  assert.equal(doc.querySelectorAll('[data-plan-row="objective"]').length, 1, 'only the active objective shows by default');
  await runtime.click('[data-plan-show-archived]', 40);
  assert.equal(doc.querySelectorAll('[data-plan-row="objective"]').length, 2, 'active and archived objectives did not render');
  await runtime.click('[data-plan-show-archived]', 40);
  await runtime.click('[data-plan-menu="mission"]', 20);
  await runtime.click('[data-plan-menu-item="history"]', 40);
  assert.match(doc.querySelector('[data-plan-mission-history]')?.textContent ?? '', /Stabilise the legacy checkout/);

  // A new objective, then a goal it measures. The goal form offers active
  // objectives that are not already in a goal (one goal per objective).
  await runtime.click('[data-plan-menu="new"]', 20);
  await runtime.click('[data-plan-menu-item="objective"]', 40);
  await runtime.setValue('[data-plan-dialog="create-objective"] [data-plan-field="title"]', 'Refund latency');
  await runtime.click('[data-action="plan-create-objective"]', 80);
  const objectiveCreate = runtime.calls.find((call) => call.method === 'POST' && call.path === '/projects/payments-relaunch/objectives');
  assert.equal(objectiveCreate?.body?.name, 'Refund latency', 'objective create payload was not sent');
  await runtime.click('[data-plan-menu="new"]', 20);
  await runtime.click('[data-plan-menu-item="goal"]', 40);
  await runtime.setValue('[data-plan-dialog="create-goal"] [data-plan-field="title"]', 'Preserve objective history');
  assert(doc.querySelector('[data-plan-goal-objective="11"]')?.disabled, 'an objective that already measures a goal must not be offered');
  const objectiveChoice = doc.querySelector('[data-plan-goal-objective="13"]');
  assert(objectiveChoice && !objectiveChoice.disabled, 'goal editor did not expose optional objective linking');
  objectiveChoice.click();
  await runtime.flush(20);
  await runtime.click('[data-action="plan-create-goal"]', 80);
  const goalCreate = runtime.calls.find((call) => call.method === 'POST' && call.path === '/projects/payments-relaunch/goals');
  assert.deepEqual(goalCreate?.body?.objective_ids, [13], 'goal create did not preserve the selected objective ids');
  assert.equal(doc.querySelectorAll('[data-plan-row="objective"]').length, 2, 'linking a goal removed or hid an objective');

  // Order, archive and restore a goal; archive and restore ask first.
  await runtime.click(`${row('goal', 'GOAL-DEMO1')} .dy-plan-row-open`, 40);
  await runtime.click('[data-plan-drawer="goal"] [data-action="plan-goal-down"]', 60);
  const order = runtime.calls.find((call) => call.method === 'PUT' && call.path === '/projects/payments-relaunch/goals/order');
  assert.deepEqual(order?.body?.goal_ids?.slice(0, 2), ['GOAL-DEMO2', 'GOAL-DEMO1'], 'goal order was not sent explicitly');
  await runtime.click('[data-plan-drawer="goal"] [data-action="plan-archive-goal"]', 40);
  assert(doc.querySelector('[data-destructive-confirm="plan-archive"]'), 'goal archive did not ask for confirmation');
  assert(!posted('POST', '/projects/payments-relaunch/goals/GOAL-DEMO1/archive'), 'goal archive mutated before confirmation');
  await runtime.click('[data-action="confirm-destructive-action"]', 60);
  assert(posted('POST', '/projects/payments-relaunch/goals/GOAL-DEMO1/archive'), 'goal archive was not sent');
  await runtime.click('[data-plan-show-archived]', 40);
  await runtime.click(`${row('goal', 'GOAL-DEMO1')} [data-plan-menu="row-goal"]`, 20);
  await runtime.click('[data-plan-menu-item="restore"]', 40);
  await runtime.click('[data-action="confirm-destructive-action"]', 60);
  assert(posted('POST', '/projects/payments-relaunch/goals/GOAL-DEMO1/restore'), 'goal restore was not sent');

  // Mission: edited in place, kept across tab navigation, archived only after confirmation.
  await runtime.click('[data-action="plan-mission-edit"]', 20);
  await runtime.setValue('[data-plan-mission-input]', 'Make checkout recovery measurable');
  await runtime.click('[data-action="plan-mission-save"]', 60);
  const missionPatch = runtime.calls.find((call) => call.method === 'PATCH' && call.path === '/projects/payments-relaunch/settings' && call.body?.mission === 'Make checkout recovery measurable');
  assert(missionPatch, 'mission edit PATCH was not sent');
  await runtime.click('[data-project-view="overview"]', 50);
  await runtime.click('[data-project-view="plan"]', 80);
  assert.match(doc.querySelector('[data-plan-mission]')?.textContent || '', /Make checkout recovery measurable/, 'saved mission disappeared after tab navigation');
  await runtime.click('[data-plan-menu="mission"]', 20);
  await runtime.click('[data-plan-menu-item="archive"]', 40);
  assert(doc.querySelector('[data-destructive-confirm="archive-mission"]'), 'mission archive did not ask for confirmation');
  assert(!posted('POST', '/projects/payments-relaunch/mission/archive'), 'mission archive mutated before confirmation');
  await runtime.click('[data-action="confirm-destructive-action"]', 60);
  assert(posted('POST', '/projects/payments-relaunch/mission/archive'), 'mission archive POST was not sent');

  // Objective: edit; archive and delete each ask first.
  await runtime.click(`${row('objective', 11)} .dy-plan-row-open`, 40);
  await runtime.click('[data-plan-drawer="objective"] [data-action="plan-edit"]', 40);
  await runtime.setValue('[data-plan-dialog="edit-objective"] [data-plan-field="description"]', 'Keep every payment retry safe.');
  await runtime.click('[data-action="plan-edit-objective"]', 60);
  assert(runtime.calls.some((call) => call.method === 'PATCH' && call.path === '/projects/payments-relaunch/objectives/11'), 'objective edit PATCH was not sent');
  await runtime.click(`${row('objective', 11)} [data-plan-menu="row-objective"]`, 20);
  await runtime.click('[data-plan-menu-item="archive"]', 40);
  assert(doc.querySelector('[data-destructive-confirm="plan-archive"]'), 'objective archive did not ask for confirmation');
  assert(!posted('POST', '/projects/payments-relaunch/objectives/11/archive'), 'objective archive mutated before confirmation');
  await runtime.click('[data-action="confirm-destructive-action"]', 50);
  assert(posted('POST', '/projects/payments-relaunch/objectives/11/archive'), 'objective archive POST was not sent');
  // Only an archived objective can be deleted; it shows with the archived items.
  if (!doc.querySelector('[data-plan-show-archived]').checked) await runtime.click('[data-plan-show-archived]', 40);
  await runtime.click(`${row('objective', 12)} [data-plan-menu="row-objective"]`, 20);
  await runtime.click('[data-plan-menu-item="delete"]', 40);
  assert(doc.querySelector('[data-destructive-confirm="plan-delete"]'), 'objective removal did not ask for confirmation');
  assert(!posted('DELETE', '/projects/payments-relaunch/objectives/12'), 'objective removal mutated before confirmation');
  await runtime.click('[data-action="confirm-destructive-action"]', 50);
  assert(posted('DELETE', '/projects/payments-relaunch/objectives/12'), 'objective removal DELETE was not sent');
  await runtime.dispose();
}

async function testProjectContentVisibilityPreviewAndUpload() {
  const runtime = await createRuntime();
  await runtime.mount();
  await runtime.pickProject('payments-relaunch');
  await runtime.click('[data-tab="project"]', 80);
  await runtime.click('[data-project-view="content"]');
  const doc = runtime.dom.window.document;

  assert(doc.querySelector('[data-project-content]'), 'project content surface is missing');
  assert.equal(doc.querySelectorAll('[data-project-content-item]').length, 2, 'existing project documentation did not render');
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
  await runtime.pickProject('payments-relaunch');
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

async function testPhase5ManagementJourneys() {
  const runtime = await createRuntime();
  await runtime.mount();
  // Milestones are managed on the project's Vision screen (design round f),
  // not on the Kanban and not in a separate panel.
  await runtime.pickProject('payments-relaunch');
  await runtime.click('[data-tab="project"]', 80);
  await runtime.click('[data-project-view="board"]', 60);
  await runtime.click('[data-project-view="plan"]', 80);
  const doc = runtime.dom.window.document;
  const drawer = '[data-plan-drawer="milestone"]';

  await runtime.click('[data-plan-menu="new"]', 20);
  await runtime.click('[data-plan-menu-item="milestone"]', 40);
  await runtime.setValue('[data-plan-dialog="create-milestone"] [data-plan-field="title"]', 'Verification');
  await runtime.click('[data-action="plan-create-milestone"]', 80);
  assert(runtime.calls.some((call) => call.method === 'POST' && call.path === '/projects/payments-relaunch/milestones' && call.body.name === 'Verification'), 'milestone create did not reach proxy');
  await runtime.click('[data-plan-row="milestone"][data-plan-id="1"] .dy-plan-row-open', 60);
  for (const [action, what] of [['plan-edit', 'rename and due date'], ['plan-close-milestone', 'close'], ['plan-archive-milestone', 'archive'], ['plan-attach-work', 'scope']]) {
    assert(doc.querySelector(`${drawer} [data-action="${action}"]`), `milestone ${what} control is missing`);
  }
  await runtime.click(`${drawer} [data-action="plan-edit"]`, 40);
  await runtime.setValue('[data-plan-dialog="edit-milestone"] [data-plan-field="due"]', '2026-11-15');
  await runtime.click('[data-action="plan-edit-milestone"]', 80);
  assert(runtime.calls.some((call) => call.method === 'PATCH' && call.path === '/projects/payments-relaunch/milestones/Launch' && call.body.due === '2026-11-15'), 'existing milestone due-date edit did not reach proxy');
  await runtime.click(`${drawer} [data-action="plan-edit"]`, 40);
  await runtime.setValue('[data-plan-dialog="edit-milestone"] [data-plan-field="title"]', 'Launch verified');
  await runtime.click('[data-action="plan-edit-milestone"]', 80);
  assert(runtime.calls.some((call) => call.path === '/projects/payments-relaunch/milestones/Launch/rename' && call.body.new_name === 'Launch verified'), 'milestone rename did not execute');
  await runtime.click(`${drawer} [data-action="plan-close-milestone"]`, 80);
  await runtime.click(`${drawer} [data-action="plan-reopen-milestone"]`, 80);
  await runtime.setValue(`${drawer} [data-plan-attach-choice]`, 'HDY-12');
  await runtime.click(`${drawer} [data-action="plan-attach-work"]`, 80);
  await runtime.click(`${drawer} [data-plan-detach="HDY-12"]`, 80);
  await runtime.click(`${drawer} [data-action="plan-archive-milestone"]`, 40);
  await runtime.click('[data-action="confirm-destructive-action"]', 80);
  await runtime.click(`${drawer} [data-action="plan-restore-milestone"]`, 40);
  await runtime.click('[data-action="confirm-destructive-action"]', 80);
  const milestoneCalls = runtime.calls.filter((call) => call.path.includes('/milestones/Launch%20verified'));
  assert(milestoneCalls.some((call) => call.method === 'PATCH' && call.body.closed === true), 'milestone close did not execute');
  assert(milestoneCalls.some((call) => call.method === 'PATCH' && call.body.closed === false), 'milestone reopen did not execute');
  for (const suffix of ['/attach', '/detach', '/archive', '/restore']) {
    assert(milestoneCalls.some((call) => call.path.endsWith(suffix)), `milestone ${suffix.slice(1)} did not execute`);
  }

  await runtime.click('[data-tab="project"]', 80);
  await runtime.click('[data-project-view="workflows"]');
  assert(doc.querySelector('[data-executable-workflows]'), 'executable workflow surface is missing');
  // Creating is the New workflow dialog since the builder (07/10/2026). It only
  // creates (WORKFLOWS-R1.md bug 2): a taken name used to post a one-step
  // version that replaced the workflow; the dialog refuses it instead.
  await runtime.click('[data-action="wfd-new-workflow"]', 80);
  await runtime.click('[data-wfd-scope="project"]', 40);
  await runtime.click('[data-wfd-way="blank"]', 40);
  await runtime.setValue('[data-wfd-name]', 'release');
  await runtime.click('[data-action="wfd-create"]', 80);
  assert(/already exists/.test(doc.querySelector('[data-wfd-name-error]')?.textContent ?? ''), 'a taken name is refused in the dialog');
  await runtime.setValue('[data-wfd-name]', 'verify-release');
  await runtime.setValue('[data-wfd-first-step]', 'Verify release');
  await runtime.click('[data-action="wfd-create"]', 80);
  assert(runtime.calls.some((call) => call.method === 'POST' && call.path === '/projects/payments-relaunch/workflows' && call.body?.name === 'verify-release' && call.body?.nodes?.[0]?.title === 'Verify release'), 'workflow definition did not reach proxy');
  assert(!runtime.calls.some((call) => call.path === '/projects/payments-relaunch/workflows/release/versions'), 'New workflow posted a version over an existing workflow');
  await runtime.click('[data-project-view="workflows"]');
  await runtime.click('[data-workflow-library-item="release"]', 80);
  // Explicit version start lives in the toolbar Versions menu; the primary
  // toolbar button starts the latest version only. Each run names itself
  // (<workflow>-<time>); the old Run key box went with the side form.
  await runtime.click('[data-workflow-definition-version="1"] [data-action="start-workflow-version"]', 80);
  const started = runtime.calls.find((call) => call.path === '/projects/payments-relaunch/workflows/release/start' && call.body.version === 1);
  assert(started && /^release-\d+$/.test(started.body.run_key), 'explicit workflow version start did not reach proxy with its own run key');
  await runtime.click('[data-project-view="workflows"]');
  await runtime.click('[data-action="inspect-workflow"]', 80);
  // Phase 5 canvas port: the stored definition is inspectable through the
  // production canvas mount plus the raw stored-version details.
  assert(doc.querySelector('[data-workflow-canvas="release"]'), 'workflow planning canvas host is missing');
  // Source-tree runs inject a canvas stub (rt.canvasMounts). The shipped
  // artifact inlines the real canvas, so there the proof is the real mount's DOM.
  const canvasHost = doc.querySelector('[data-workflow-canvas="release"]');
  const realCanvasMounted = Boolean(canvasHost && (canvasHost.matches('.dy-wf-scope') || canvasHost.querySelector('.dy-wf-scope, svg[data-lod]')));
  assert(rt.canvasMounts.some((mount) => mount.projectId === 'payments-relaunch' && mount.workflowName === 'release') || realCanvasMounted, 'stored workflow definition did not reach the canvas mount');
  assert(doc.querySelector('[data-workflow-definition-version="1"]'), 'stored workflow definition is not inspectable');
  const liveRun = doc.querySelector(`[data-workflow-live-run="${started.body.run_key}"]`);
  assert(liveRun && liveRun.textContent.includes(started.body.run_key), 'workflow run history did not render the real run_key contract');
  assert(/v1/.test(liveRun.textContent), 'workflow run history did not render the executed version');
  await runtime.click('[data-action="archive-workflow"]', 80);
  assert(runtime.calls.some((call) => call.path === '/projects/payments-relaunch/workflows/release/archive'), 'workflow archive did not reach proxy');
  await runtime.click('[data-project-view="workflows"]');
  await runtime.click('[data-action="restore-workflow"]', 80);
  assert(runtime.calls.some((call) => call.path === '/projects/payments-relaunch/workflows/release/restore'), 'workflow restore did not reach proxy');

  await runtime.click('[data-project-view="content"]');
  await runtime.click('[data-project-content-item="CONTENT-DEMO1"]');
  await runtime.click('[data-action="archive-project-content"]');
  assert(doc.querySelector('[data-destructive-confirm="content-archive"]'), 'content archive did not ask for confirmation');
  await runtime.click('[data-action="confirm-destructive-action"]', 80);
  assert(runtime.calls.some((call) => call.path === '/projects/payments-relaunch/content/CONTENT-DEMO1/archive'), 'content archive did not reach proxy');
  await runtime.click('[data-project-view="content"]');
  await runtime.click('[data-project-content-item="CONTENT-DEMO1"]');
  await runtime.click('[data-action="restore-project-content"]');
  await runtime.click('[data-action="confirm-destructive-action"]', 80);
  assert(runtime.calls.some((call) => call.path === '/projects/payments-relaunch/content/CONTENT-DEMO1/restore'), 'content restore did not reach proxy');
  await runtime.click('[data-project-view="content"]');
  await runtime.click('[data-project-content-item="CONTENT-DEMO1"]');
  await runtime.click('[data-action="remove-project-content"]');
  await runtime.click('[data-action="confirm-destructive-action"]', 80);
  assert(runtime.calls.some((call) => call.method === 'DELETE' && call.path === '/projects/payments-relaunch/content/CONTENT-DEMO1'), 'content removal did not reach proxy');
  await runtime.click('[data-project-view="content"]');
  await runtime.click('[data-project-content-item="CONTENT-BLOCKED"]');
  await runtime.click('[data-action="remove-project-content"]');
  await runtime.click('[data-action="confirm-destructive-action"]', 80);
  assert([...doc.querySelectorAll('[role="alert"]')].some((node) => /Removal blocked/i.test(node.textContent ?? '')), 'content dependency refusal was not surfaced');
  assert(!runtime.calls.some((call) => call.method === 'DELETE' && call.path === '/projects/payments-relaunch/content/CONTENT-BLOCKED'), 'dependency-blocked content reached DELETE');

  await runtime.click('[data-project-view="settings"]');
  await runtime.click('[data-lifecycle-action="archive"]');
  assert(doc.querySelector('[data-lifecycle-confirm]') && !doc.querySelector('[data-lifecycle-confirm]').hidden, 'project archive did not ask for confirmation');
  assert.match(doc.querySelector('[data-lifecycle-confirm]')?.textContent ?? '', /canonical project, board, tasks and repository remain untouched/i, 'project archive confirmation omits canonical retention assurance');
  await runtime.click('[data-action="confirm-lifecycle-action"]', 100);
  assert(runtime.calls.some((call) => call.path === '/projects/payments-relaunch/archive'), 'project archive did not reach proxy');
  assert(doc.querySelector('[data-lifecycle-action="restore"]'), 'project restore control is missing after archive');
  await runtime.click('[data-lifecycle-action="restore"]');
  await runtime.click('[data-action="confirm-lifecycle-action"]', 100);
  assert(runtime.calls.some((call) => call.path === '/projects/payments-relaunch/restore'), 'project restore did not reach proxy');
  await runtime.dispose();
}

async function testBacklogBoardAndReasonGate() {
  const runtime = await createRuntime();
  await runtime.mount();
  await runtime.pickProject('payments-relaunch');
  await runtime.click('[data-tab="backlog"]', 80);
  const doc = runtime.dom.window.document;
  assert(doc.querySelector('[data-backlog-board]'), 'prioritised backlog screen is missing');
  assert.equal(doc.querySelectorAll('[data-backlog-item]').length, 2, 'backlog items did not render');
  // Signed-off backlog tree: drag reordering rides the per-row grip on
  // depth-0 rows (whole-row drag targets would fight the row links).
  const grips = [...doc.querySelectorAll('[data-backlog-item][data-tree-depth="0"] .drag-grip')];
  assert(grips.length >= 1 && grips.every((grip) => grip.draggable), 'depth-0 backlog rows must expose a draggable grip');
  // Signed-off backlog tree: reordering moves through the row menu, which
  // still funnels into the mandatory reason dialog before any rerank call.
  await runtime.click('[data-menu-ref="HDY-13"]');
  await runtime.click('[data-menu-action="down"]');
  const modal = doc.querySelector('[data-reason-modal]');
  assert(modal && !modal.hidden, 'rank change did not open the mandatory reason-capture modal');
  assert(modal.querySelector('textarea'), 'reason modal is missing its reason field');
  assert(runtime.calls.some((call) => call.path === '/projects/payments-relaunch/backlog'), 'backlog screen did not use the backend route');
  await runtime.dispose();
}

async function testBacklogCreateFormValidationAndReadback() {
  const runtime = await createRuntime();
  await runtime.mount();
  await runtime.pickProject('payments-relaunch');
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
    body: null,
    due: null,
    estimate_days: null,
    evidence_refs: [],
    initiative_ref: 'INI-DEMO-2',
    labels: [],
    parent_ref: null,
    rank: 1,
    reason: 'Protects customers from duplicate charges',
  });
  const created = [...doc.querySelectorAll('[data-backlog-item]')]
    .find((entry) => entry.textContent.includes('Verify retry idempotency'));
  assert(created, 'created backlog item was not read back after refresh');
  assert.match(created.textContent, /Quan/, 'created item read back with its discovered profile');
  // The signed-off tree row shows title/assignee/status only; the initiative
  // linkage is inspected through the item's details drawer.
  const createdRef = created.getAttribute('data-backlog-item');
  await runtime.click(`[data-backlog-item="${createdRef}"]`, 40);
  const drawer = doc.querySelector(`[data-work-item-detail="${createdRef}"]`);
  assert(drawer, 'created backlog item did not open its details drawer');
  assert.match(drawer.textContent, /INI-DEMO-2/, 'initiative linkage was not readable in the details drawer');
  await runtime.dispose();
}

async function testBacklogBulkReassignment() {
  const runtime = await createRuntime();
  await runtime.mount();
  await runtime.pickProject('payments-relaunch');
  await runtime.click('[data-tab="backlog"]', 80);
  const doc = runtime.dom.window.document;
  const first = doc.querySelector('[data-bulk-select="HDY-13"]');
  assert(first, 'canonical backlog item has no bulk-selection control');
  first.click();
  await runtime.flush(20);
  // Signed-off v4 flow: selecting rows raises the selection popover, whose
  // reassignment target drives the same exact preview → execute pipeline
  // (and the same durable-operation readback) as before.
  const popover = doc.querySelector('[data-selection-popover]');
  assert(popover, 'bulk selection did not surface the selection popover');
  await runtime.setValue('[data-selection-popover] [data-pop-target]', 'assign:quan-bot', 80);
  await runtime.flush(120);
  assert(doc.querySelector('[data-bulk-preview="phase4-fingerprint"]'), 'exact bulk preview/fingerprint did not render');
  assert.match(doc.body.textContent, /HDY-13.*eligible/s);
  await runtime.click('[data-pop-action="execute"]', 60);
  const post = runtime.calls.find((call) => call.method === 'POST' && /\/reassignments$/.test(call.path));
  assert.deepEqual(post?.body?.selected_ids, ['HDY-13'], 'selected canonical item ids were not preserved');
  assert.equal(post?.body?.to_profile, 'quan-bot', 'selected profile id was not preserved');
  assert(doc.querySelector('[data-bulk-operation="OP-BULK"]'), 'durable bulk operation readback did not render');
  assert.match(doc.body.textContent, /sahil.*workitem\.reassigned/s, 'verified actor/per-item audit outcome was not rendered');
  assert(!runtime.calls.some((call) => /\/transfers\/execute$/.test(call.path)), 'bulk subset incorrectly used departure execution');
  await runtime.dispose();
}

async function testBotTeamsScreen() {
  const runtime = await createRuntime();
  await runtime.mount();
  // Fleet-level Bot teams is reached from the Dashboard (P7.1 refines the
  // bot-member cards on this surface).
  await runtime.click('[data-tab="dashboard"]', 60);
  await runtime.click('[data-action="open-bot-teams"]', 80);
  const doc = runtime.dom.window.document;
  assert(doc.querySelector('[data-bot-teams]'), 'bot teams screen is missing');
  assert(doc.querySelector('[data-team-management]'), 'project team management surface is missing');
  assert(doc.querySelector('[data-action="add-project-member"]'), 'add-member action is missing');
  assert(doc.querySelector('[data-action="transfer-project-lead"]'), 'lead-transfer action is missing');
  assert(doc.querySelector('[data-action="preview-work-transfer"]'), 'work-transfer preview action is missing');
  await runtime.flush(40);
  await runtime.click('[data-action="preview-work-transfer"]', 40);
  assert(doc.querySelector('[data-transfer-preview="phase4-fingerprint"]'), 'exact transfer preview did not render');
  assert.match(doc.body.textContent, /HDY-12.*Fix double-charge on retry path/s);
  await runtime.click('[data-action="execute-work-transfer"]', 60);
  assert(doc.querySelector('[data-transfer-operation="OP-PHASE4"]'), 'durable operation readback did not render');
  assert.match(doc.body.textContent, /2 of 2 transferred/);
  assert(runtime.calls.some((call) => call.method === 'POST' && /\/transfers\/preview$/.test(call.path)), 'Desktop did not invoke preview through the plugin proxy');
  assert(runtime.calls.some((call) => call.method === 'POST' && /\/transfers\/execute$/.test(call.path)), 'Desktop did not invoke execute through the plugin proxy');
  assert(runtime.calls.some((call) => call.method === 'GET' && call.path === '/operations/OP-PHASE4'), 'Desktop did not perform durable operation readback');
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
  // Design round f (Sahil 05/10): the Initiatives tab's loop diagram became a
  // short stage list in each initiative's details on the Vision screen; the
  // safe Freeze control moved to Vision's "More" menu.
  await runtime.pickProject('payments-relaunch');
  await runtime.click('[data-tab="project"]', 120);
  await runtime.click('[data-project-view="plan"]', 80);
  const doc = runtime.dom.window.document;
  await runtime.click('[data-plan-row="initiative"][data-plan-id="INI-DEMO-2"] .dy-plan-row-open', 60);
  const stages = doc.querySelectorAll('[data-plan-drawer="initiative"] [data-plan-loop="INI-DEMO-2"] li');
  assert(stages.length >= 7, 'canonical loop stages are incomplete');
  assert.equal(doc.querySelectorAll('[data-plan-loop="INI-DEMO-2"] li[aria-current="step"]').length, 1, 'exactly one stage is current');
  assert.match(doc.querySelector('[data-plan-drawer="initiative"]').textContent, /Support requests drop when refunds are self-service/);
  await runtime.click('[data-plan-menu="plan-more"]', 20);
  assert(doc.querySelector('[data-plan-menu-item="freeze"]'), 'safe freeze control is missing');
  await runtime.click('[data-plan-menu-item="freeze"]', 40);
  assert(doc.querySelector('[data-destructive-confirm="freeze-project"]'), 'Freeze did not ask for confirmation');
  assert(!runtime.calls.some((call) => call.method === 'POST' && call.path === '/projects/payments-relaunch/freeze'), 'Freeze mutated state before confirmation');
  await runtime.click('[data-action="cancel-destructive-action"]');
  assert(!runtime.calls.some((call) => call.method === 'POST' && call.path === '/projects/payments-relaunch/freeze'), 'Cancelling Freeze still mutated state');
  await runtime.dispose();
}

async function testSavedViewsScreenAndCreator() {
  const runtime = await createRuntime();
  await runtime.mount();
  // r6 (Sahil's C2 review): saved views are a views bar above the Kanban board,
  // with a Manage views side panel. They are display preferences only.
  await runtime.pickProject('payments-relaunch');
  await runtime.click('[data-tab="project"]', 120);
  await runtime.click('[data-project-view="board"]', 60);
  const doc = runtime.dom.window.document;
  assert(doc.querySelector('[data-kanban-screen]'), 'the Kanban screen is missing');
  assert(runtime.calls.some((call) => call.path === '/projects/payments-relaunch/views'), 'the views bar did not load backend views');
  const tabs = [...doc.querySelectorAll('[data-view-tab]')].map((tab) => tab.getAttribute('data-view-tab'));
  assert.deepEqual(tabs, ['All work', 'Release focus'], 'saved view did not render in the views bar');
  const savedTab = doc.querySelector('[data-view-tab="Release focus"]');
  assert.match(savedTab.getAttribute('title') || '', /^Board · Status in progress/, 'saved view exposes raw filter data instead of readable labels');
  assert(!(savedTab.getAttribute('title') || '').includes('{'), 'saved view exposes raw JSON');
  assert(!doc.querySelector('[data-workflow-visual]'), 'a fabricated executable workflow is still rendered');
  assert(!/Saved workflows|Create workflow|LIVE DELIVERY PATH/.test(doc.body.textContent), 'misleading workflow copy remains visible');

  // Recall applies the stored filter to the board.
  await runtime.click('[data-view-tab="Release focus"]', 60);
  assert.equal(doc.querySelector('[data-kanban-screen]')?.getAttribute('data-view'), 'Release focus', 'the board does not name the recalled view');
  assert.match(doc.querySelector('[data-kanban-status-filter]')?.textContent || '', /In progress/, 'the stored status filter is not shown');
  const cards = [...doc.querySelectorAll('[data-work-card]')].map((card) => card.getAttribute('data-work-card'));
  assert.deepEqual(cards, ['HDY-12'], 'recall did not apply the stored view filter');

  // The Manage views panel says what a view is, and what it never does.
  await runtime.click('[data-views-manage]', 60);
  const note = doc.querySelector('[data-views-panel] [data-views-note]')?.textContent || '';
  assert.match(note, /only changes what this board shows/i);
  assert.match(note, /never runs automations, assigns work or changes permissions/i);
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
  await runtime.click('[data-member-option="quan"] input');
  await runtime.click('[data-action="wizard-next"]');
  assert.equal(wizard.querySelector('[data-wizard-step].active')?.getAttribute('data-wizard-step'), '4', 'wizard did not reach review');
  assert.match(wizard.textContent, /checkout-ops/);
  // R4: the commit gate starts locked — preflight must run first.
  assert.equal(doc.querySelector('[data-action="submit-onboarding"]').disabled, true, 'commit gate did not start locked');
  await runtime.click('[data-action="run-onboarding-preflight"]', 80);
  assert.equal(doc.querySelector('[data-action="submit-onboarding"]').disabled, false, 'preflight did not open the commit gate');
  await runtime.click('[data-action="submit-onboarding"]', 80);
  const onboard = runtime.calls.find((call) => call.method === 'POST' && call.path === '/onboard');
  assert.deepEqual(onboard?.body, {
    project_id: 'checkout-ops',
    repo_path: '/home/sahil/repos/checkout',
    mission: 'Reduce payment failures without weakening release gates.',
    lead_profile: 'octacon',
    member_profiles: ['quan'],
    idempotency_key: 'dockyard-onboard:checkout-ops',
    expected_membership_revision: 0,
    preflight_token: 'review-token-0',
  }, 'wizard did not submit the complete reviewed onboarding contract');
  assert(!doc.querySelector('[data-onboarding-wizard]'), 'wizard remained open after successful onboarding');
  assert.match(doc.querySelector('[data-toast-region]')?.textContent || '', /Project checkout-ops onboarded/);
  assert.equal(doc.querySelector('[role="tab"][aria-selected="true"]')?.getAttribute('data-tab'), 'project', 'successful onboarding did not open the new project');
  await runtime.dispose();

  const failed = await createRuntime({ failMutationPath: '/initiatives/INI-DEMO-1/reject' });
  await failed.mount();
  await failed.click('[data-tab="inbox"]');
  await failed.click('[data-inbox-ref="INI-DEMO-1"]', 40);
  await failed.click('[data-inbox-panel="true"] [data-action="reject"]', 40);
  const failedDialog = '[data-destructive-confirm="reject-INI-DEMO-1"]';
  await failed.setValue(`${failedDialog} input`, 'Not acceptable', 40);
  await failed.click(`${failedDialog} [data-action="confirm-destructive-action"]`, 80);
  const failedDoc = failed.dom.window.document;
  const failedPanel = failedDoc.querySelector('[data-inbox-panel="true"]');
  const alert = failedDoc.querySelector('[data-toast-region] [role="alert"]');
  assert(alert, 'failed mutation did not create an alert toast');
  assert.equal(failedPanel?.getAttribute('data-state'), 'failed', 'failed rejection did not show an unconfirmed state');
  assert.match(failedPanel?.textContent || '', /could not be confirmed/i);
  assert.match(alert.textContent, /Reject could not be confirmed/);
  assert(!alert.textContent.includes('Error invoking remote method'), 'raw host error leaked into the user status');
  await failed.dispose();
}

async function testApprovalFlow() {
  const runtime = await createRuntime();
  await runtime.mount();
  await runtime.click('[data-tab="inbox"]');
  const doc = runtime.dom.window.document;
  assert.equal(doc.querySelectorAll('[data-inbox-row]').length, 2, 'inbox should show two approvals');

  await runtime.click('[data-inbox-ref="INI-DEMO-1"]', 40);
  await runtime.click('[data-inbox-panel="true"] [data-action="approve"]', 80);
  assert(runtime.calls.some((call) => call.method === 'POST' && call.path === '/initiatives/INI-DEMO-1/approve'), 'approval POST was not sent');
  assert(runtime.calls.some((call) => call.method === 'GET' && call.path === '/initiatives/INI-DEMO-1/decision/receipts'), 'approval outcome was not checked against the receipt ledger');
  await runtime.flush(1000);
  assert.equal(doc.querySelectorAll('[data-inbox-row]').length, 1, 'approved item did not leave the queue after receipt confirmation');
  assert(!doc.body.textContent.includes('Add weekly digest email'), 'approved item remains visible after refresh');

  await runtime.click('[data-inbox-ref="INI-DEMO-2"]', 40);
  await runtime.click('[data-inbox-panel="true"] [data-action="reject"]', 20);
  assert(!runtime.calls.some((call) => call.method === 'POST' && call.path === '/initiatives/INI-DEMO-2/reject'), 'rejection bypassed confirmation');
  const dialog = '[data-destructive-confirm="reject-INI-DEMO-2"]';
  assert(doc.querySelector(`${dialog} [data-action="confirm-destructive-action"]`)?.disabled, 'rejection reason must be required in the confirmation dialog');
  await runtime.setValue(`${dialog} input`, 'Rollback risk not acceptable', 40);
  await runtime.click(`${dialog} [data-action="confirm-destructive-action"]`, 80);
  assert(runtime.calls.some((call) => call.method === 'POST' && call.path === '/initiatives/INI-DEMO-2/reject'), 'rejection POST was not sent');
  assert(runtime.calls.some((call) => call.method === 'GET' && call.path === '/initiatives/INI-DEMO-2/decision/receipts'), 'rejection outcome was not checked against the receipt ledger');
  await runtime.flush(1000);
  assert.equal(doc.querySelectorAll('[data-inbox-row]').length, 0, 'rejected item did not leave the queue after receipt confirmation');
  await runtime.dispose();
}

async function testNotificationFlow() {
  const runtime = await createRuntime();
  await runtime.mount();
  await runtime.click('[data-tab="notifications"]');
  const doc = runtime.dom.window.document;
  assert.equal(doc.querySelectorAll('[data-notification-state="new"]').length, 1, 'expected one unread notification');
  assert.equal(doc.querySelectorAll('[data-notification-state="seen"]').length, 1, 'expected one cleared notification');
  // Phase 6: notifications expose an exact-context deep link; Open navigates
  // only (P6.5): no ack POST fires and the row state does not change. The
  // link must land on the notification's own project (exact object, not a
  // generic board).
  const openButtons = doc.querySelectorAll('[data-notification-id="3"] [data-action="open"]');
  assert.equal(openButtons.length, 1, 'unread notification lacks an Open deep-link control');
  await runtime.click('[data-notification-id="3"] [data-action="open"]', 50);
  assert(!runtime.calls.some((call) => call.method === 'POST' && call.path === '/notifications/3/ack'), 'Open must not acknowledge');
  assert.equal(runtime.dom.window.document.querySelectorAll('[data-notification-state="new"]').length, 0, 'Open did not navigate away');
  const landed = runtime.dom.window.document.querySelector('[data-project-dashboard]');
  assert.equal(landed?.getAttribute('data-project-dashboard'), 'payments-relaunch', 'Open did not open the notification project');
  await runtime.dispose();

  const second = await createRuntime();
  await second.mount();
  await second.click('[data-tab="notifications"]');
  const secondDoc = second.dom.window.document;
  await second.click('[data-notification-id="3"] [data-action="mark-seen"]', 50);
  assert(second.calls.some((call) => call.method === 'POST' && call.path === '/notifications/3/ack'), 'acknowledge POST was not sent');
  assert.equal(secondDoc.querySelectorAll('[data-notification-state="new"]').length, 0, 'acknowledged notification remains unread');
  assert.equal(secondDoc.querySelectorAll('[data-notification-state="seen"]').length, 2, 'acknowledged notification did not move to Seen');
  assert.match(secondDoc.querySelector('[data-notification-id="3"]')?.textContent || '', /Seen/);
  await second.dispose();
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

async function testOnboardingPreflightAndDiscovery() {
  // P7.1/P7.2 (P7.GATE journey part 1): the wizard opens with host-driven
  // discovery (existing projects + valid profiles), and the review step
  // validates through the host BEFORE commitment.
  const runtime = await createRuntime();
  await runtime.mount();
  await runtime.flush(60);
  await runtime.click('[data-action="open-onboarding"]', 120);
  const doc = runtime.dom.window.document;
  assert(runtime.calls.some((call) => call.path === '/onboard/discover'), 'onboarding wizard did not load host discovery');
  const wizard = doc.querySelector('[data-onboarding-wizard]');
  assert(wizard, 'onboarding wizard did not open');
  // Step 1: discovery row reflects the host projects (no hard-coded list).
  const discovered = wizard.querySelector('[data-discovered-projects]');
  assert(discovered, 'wizard step 1 lacks the host-driven discovery line');
  assert.match(discovered.textContent, /demo-project/);
  // Type through step 1-3 (keyboard + typed input, no pointer-only journey).
  await runtime.setValue('[data-field="project-id"]', 'checkout-ops', 30);
  await runtime.setValue('[data-field="repo-path"]', '/srv/checkout-ops', 30);
  await runtime.click('[data-action="wizard-next"]', 40);
  await runtime.setValue('[data-field="mission"]', 'Ship payment recovery with auditable gates', 30);
  await runtime.click('[data-action="wizard-next"]', 40);
  await runtime.setValue('[data-field="lead-profile"]', 'octacon', 30);
  await runtime.click('[data-action="wizard-next"]', 40);
  // Step 4: preflight validates through the host before the commit button.
  await runtime.click('[data-action="run-onboarding-preflight"]', 80);
  const preflightResult = doc.querySelector('[data-preflight-result]');
  assert(preflightResult, 'preflight result did not render');
  assert.equal(preflightResult.getAttribute('data-preflight-result'), 'create_new', 'preflight did not report the host mode');
  assert.match(preflightResult.textContent, /Host validated the details/);
  // R4: a successful preflight OPENS the commit gate for these exact fields.
  const submitBtn = doc.querySelector('[data-action="submit-onboarding"]');
  assert(submitBtn, 'submit button did not render on the review step');
  assert.equal(submitBtn.disabled, false, 'successful preflight did not open the commit gate');
  assert.equal(submitBtn.getAttribute('data-preflight-gate'), 'open', 'gate state did not report open');
  // P7.4: the review renders the exact proposed governance/board/automation preview.
  const preview = doc.querySelector('[data-onboarding-preview]');
  assert(preview, 'review step lacks the proposed-governance preview');
  const previewBody = JSON.parse(preview.textContent);
  assert.equal(previewBody.governance_project_id, 'checkout-ops');
  assert.equal(previewBody.canonical_board, 'checkout-ops');
  assert.equal(previewBody.schedules_enabled, false, 'preview did not state automation stays off');
  assert.equal(previewBody.future_execution_enabled, false, 'preview did not state future execution stays off');
  // P7.3: reviewable inert suggestions, including the unsupported one.
  const suggestions = doc.querySelectorAll('[data-onboarding-suggestions] [data-suggestion]');
  assert.equal(suggestions.length, 2, 'review step did not render both suggestions');
  assert.match(suggestions[1].textContent, /unsupported/);
  // R4: editing a field after preflight RE-LOCKS the gate.
  await runtime.setValue('[data-field="mission"]', 'Ship payment recovery with auditable gates v2', 40);
  const wizardStep4 = doc.querySelector('[data-wizard-step="4"]');
  assert(wizardStep4, 'review step vanished');
  assert.match(doc.querySelector('[data-action="submit-onboarding"]').textContent, /Validate before onboarding/, 'edited fields did not re-lock the commit gate');
  assert.equal(doc.querySelector('[data-action="submit-onboarding"]').disabled, true, 'edited fields left the commit gate open');
  await runtime.dispose();
}

async function testOnboardingPreflightConflictSurfacesBeforeCommit() {
  // P7.GATE: a preflight failure must show the host conflict and NOT commit.
  const runtime = await createRuntime({ failMutationPath: '/onboard/preflight' });
  await runtime.mount();
  await runtime.flush(60);
  const doc = runtime.dom.window.document;
  await runtime.click('[data-action="open-onboarding"]', 80);
  await runtime.setValue('[data-field="project-id"]', 'checkout-ops', 30);
  await runtime.setValue('[data-field="repo-path"]', '/srv/checkout-ops', 30);
  await runtime.click('[data-action="wizard-next"]', 40);
  await runtime.setValue('[data-field="mission"]', 'Ship payment recovery with auditable gates', 30);
  await runtime.click('[data-action="wizard-next"]', 40);
  await runtime.setValue('[data-field="lead-profile"]', 'octacon', 30);
  await runtime.click('[data-action="wizard-next"]', 40);
  await runtime.click('[data-action="run-onboarding-preflight"]', 80);
  const result = doc.querySelector('[data-preflight-result="error"]');
  assert(result, 'preflight failure did not surface a conflict');
  assert.match(result.textContent, /Synthetic mutation failure/);
  assert(!runtime.calls.some((call) => call.path === '/onboard' && call.method === 'POST'), 'a failed preflight must not commit');
  await runtime.dispose();
}

async function testOnboardingDiscoverySuccessRefreshPreservesWizardInput() {
  const runtime = await createRuntime();
  await runtime.mount();
  await runtime.flush(60);
  const doc = runtime.dom.window.document;
  await runtime.click('[data-action="open-onboarding"]', 120);
  await runtime.setValue('[data-field="project-id"]', 'preserve-success', 30);
  await runtime.setValue('[data-field="repo-path"]', '/srv/preserve-success', 30);
  assert(doc.querySelector('[data-profile-guidance]'), 'successful discovery hides external profile guidance');
  assert(doc.querySelector('[data-action="refresh-onboarding-discovery"]'), 'successful discovery hides refresh');
  await runtime.click('[data-action="refresh-onboarding-discovery"]', 120);
  assert.equal(doc.querySelector('[data-field="project-id"]').value, 'preserve-success');
  assert.equal(doc.querySelector('[data-field="repo-path"]').value, '/srv/preserve-success');
  await runtime.click('[data-action="wizard-next"]', 40);
  await runtime.setValue('[data-field="mission"]', 'Preserve every entered field', 30);
  await runtime.click('[data-action="wizard-next"]', 40);
  const retiredLead = doc.querySelector('[data-field="lead-profile"] option[value="retired"]');
  const retiredMember = doc.querySelector('[data-member-option="retired"] input');
  assert(retiredLead?.disabled, 'historical unavailable lead remains selectable');
  assert(retiredMember?.disabled, 'historical unavailable member remains selectable');
  assert.match(doc.querySelector('[data-member-option="retired"]')?.textContent || '', /unavailable/);
  await runtime.dispose();
}

async function testOnboardingDiscoveryRefreshPreservesWizardInput() {
  const runtime = await createRuntime({ failMutationPath: '/onboard/discover' });
  await runtime.mount();
  await runtime.flush(60);
  const doc = runtime.dom.window.document;
  await runtime.click('[data-action="open-onboarding"]', 120);
  await runtime.setValue('[data-field="project-id"]', 'preserve-me', 30);
  await runtime.setValue('[data-field="repo-path"]', '/srv/preserve-me', 30);
  const refresh = doc.querySelector('[data-action="refresh-onboarding-discovery"]');
  assert(refresh, 'onboarding discovery needs an explicit refresh action');
  await runtime.click('[data-action="refresh-onboarding-discovery"]', 120);
  assert.equal(doc.querySelector('[data-field="project-id"]').value, 'preserve-me', 'refresh discarded project input');
  assert.equal(doc.querySelector('[data-field="repo-path"]').value, '/srv/preserve-me', 'refresh discarded repository input');
  assert.match(doc.querySelector('[data-discovery-failed]')?.textContent || '', /profile manager/i, 'failure lacks external profile-manager guidance');
  await runtime.dispose();
}

async function testOnboardingDiscoveryFailureFailsClosed() {
  // P7.GATE (R4): discovery failure closes onboarding — the wizard surfaces
  // the failure, offers no invented profiles, and the lead step cannot be
  // satisfied from a hard-coded list.
  const runtime = await createRuntime({ failMutationPath: '/onboard/discover' });
  await runtime.mount();
  await runtime.flush(60);
  const doc = runtime.dom.window.document;
  await runtime.click('[data-action="open-onboarding"]', 120);
  await runtime.flush(120);
  const wizard = doc.querySelector('[data-onboarding-wizard]');
  assert(wizard, 'wizard opened');
  const failed = wizard.querySelector('[data-discovery-failed]');
  assert(failed, 'discovery failure did not surface a fail-closed message');
  assert.match(failed.textContent, /Host discovery failed/);
  // Lead step: no host profiles means no valid lead choice — Continue must
  // stay locked there (no invented 'octacon' fallback).
  await runtime.setValue('[data-field="project-id"]', 'checkout-ops', 30);
  await runtime.setValue('[data-field="repo-path"]', '/srv/checkout-ops', 30);
  await runtime.click('[data-action="wizard-next"]', 40);
  await runtime.setValue('[data-field="mission"]', 'Ship payment recovery with auditable gates', 30);
  await runtime.click('[data-action="wizard-next"]', 40);
  await runtime.setValue('[data-field="lead-profile"]', 'octacon', 30);
  assert.equal(doc.querySelector('[data-action="wizard-next"]').disabled, true, 'discovery failure allowed an unverified lead profile');
  await runtime.dispose();
}

async function testOnboardingJourneyToFirstAssessment() {
  // P7.GATE: the COMPLETE successful journey on the Desktop — discover →
  // type → preflight (gate opens) → onboard → first assessment rendered
  // with automation-off truth.
  const runtime = await createRuntime();
  await runtime.mount();
  await runtime.flush(60);
  const doc = runtime.dom.window.document;
  await runtime.click('[data-action="open-onboarding"]', 120);
  await runtime.setValue('[data-field="project-id"]', 'checkout-ops', 30);
  await runtime.setValue('[data-field="repo-path"]', '/srv/checkout-ops', 30);
  // R4: connect-existing is a real path — bind the discovered host project.
  const connectBtn = doc.querySelector('[data-connect-existing] [data-action^="connect-existing-"]');
  assert(connectBtn, 'connect-existing path did not render for discovered host projects');
  await runtime.click('[data-connect-existing] [data-action^="connect-existing-"]', 40);
  assert.equal(doc.querySelector('[data-field="project-id"]').value, 'demo-project', 'connect-existing did not fill the project id');
  assert.equal(doc.querySelector('[data-field="repo-path"]').value, '/srv/demo', 'connect-existing did not fill the repo path');
  await runtime.click('[data-action="wizard-next"]', 40);
  await runtime.setValue('[data-field="mission"]', 'Keep the demo project honest', 30);
  await runtime.click('[data-action="wizard-next"]', 40);
  await runtime.setValue('[data-field="lead-profile"]', 'octacon', 30);
  await runtime.click('[data-action="wizard-next"]', 40);
  await runtime.click('[data-action="run-onboarding-preflight"]', 80);
  assert.equal(doc.querySelector('[data-action="submit-onboarding"]').disabled, false, 'gate did not open after preflight');
  await runtime.click('[data-action="submit-onboarding"]', 120);
  assert(runtime.calls.some((call) => call.method === 'POST' && call.path === '/onboard'), 'onboard POST was not sent through the gate');
  await runtime.dispose();
}

async function testFirstAssessmentCompletionAction() {
  // P7.6 (P7.GATE journey part 2): the project overview exposes the
  // completion action; running it shows the read-only result and no
  // schedules were enabled.
  const runtime = await createRuntime();
  await runtime.mount();
  await runtime.flush(60);
  await runtime.pickProject('payments-relaunch');
  await runtime.click('[data-tab="project"]', 100);
  const doc = runtime.dom.window.document;
  // The first-assessment card lives on the project overview.
  await runtime.click('[data-project-view="overview"]', 60);
  const card = doc.querySelector('[data-first-assessment]');
  assert(card, 'project dashboard lacks the first read-only assessment card');
  await runtime.click('[data-action="run-first-assessment"]', 80);
  const result = doc.querySelector('[data-assessment-result]');
  assert(result, 'assessment result did not render');
  assert.match(result.textContent, /Passed/);
  assert.match(result.textContent, /disabled/);
  assert(runtime.calls.some((call) => call.method === 'POST' && /\/first-assessment$/.test(call.path)), 'assessment POST was not sent');
  assert(runtime.calls.filter((call) => call.method === 'POST' && /\/first-assessment$/.test(call.path)).length === 1, 'assessment ran more than once');
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
  // Project screens need a project (Sahil 05/10: the app opens on All projects).
  if (['project', 'backlog', 'initiative'].includes(tab)) await runtime.pickProject('payments-relaunch');
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
    dashboard: TMPDIR + '/dockyard-dashboard.html',
    project: TMPDIR + '/dockyard-project.html',
    projectSettings: TMPDIR + '/dockyard-project-settings.html',
    projectVision: TMPDIR + '/dockyard-project-vision.html',
    projectContent: TMPDIR + '/dockyard-project-content.html',
    projectBoardDetail: TMPDIR + '/dockyard-project-board-detail.html',
    projectReports: TMPDIR + '/dockyard-project-reports.html',
    backlog: TMPDIR + '/dockyard-backlog.html',
    backlogCreate: TMPDIR + '/dockyard-backlog-create.html',
    teams: TMPDIR + '/dockyard-teams.html',
    teamsTranscript: TMPDIR + '/dockyard-teams-transcript.html',
    initiative: TMPDIR + '/dockyard-initiative.html',
    initiativeFreeze: TMPDIR + '/dockyard-initiative-freeze.html',
    workflows: TMPDIR + '/dockyard-workflows.html',
    inbox: TMPDIR + '/dockyard-inbox.html',
    inboxReject: TMPDIR + '/dockyard-inbox-reject.html',
    notifications: TMPDIR + '/dockyard-notifications.html',
    onboarding: TMPDIR + '/dockyard-onboarding.html',
  };
  await writeSnapshot('dashboard', snapshots.dashboard);
  await writeSnapshot('project', snapshots.project, { prepare: (runtime) => runtime.click('[data-project-view="overview"]') });
  await writeSnapshot('project', snapshots.projectSettings, { prepare: (runtime) => runtime.click('[data-project-view="settings"]') });
  // Design round f: the Vision tab replaced Objectives and Initiatives.
  await writeSnapshot('project', snapshots.projectVision, { prepare: (runtime) => runtime.click('[data-project-view="plan"]', 80) });
  await writeSnapshot('project', snapshots.projectContent, { prepare: async (runtime) => {
    await runtime.click('[data-project-view="content"]');
    await runtime.click('[data-project-content-item="CONTENT-DEMO1"]', 50);
  } });
  await writeSnapshot('project', snapshots.projectBoardDetail, { prepare: async (runtime) => {
    await runtime.click('[data-project-view="board"]');
    // r6: the card expands in place; Open full details opens the drawer.
    await runtime.click('[data-card-toggle="HDY-12"]');
    await runtime.click('[data-card-open="HDY-12"]');
  } });
  await writeSnapshot('project', snapshots.projectReports, { prepare: async (runtime) => {
    await runtime.click('[data-project-view="reports"]');
    await runtime.click('[data-action="generate-report"]', 60);
  } });
  await writeSnapshot('backlog', snapshots.backlog);
  await writeSnapshot('backlog', snapshots.backlogCreate, { prepare: (runtime) => runtime.click('[data-action="open-create-backlog-item"]') });
  await writeSnapshot('dashboard', snapshots.teams, { prepare: (runtime) => runtime.click('[data-action="open-bot-teams"]', 80) });
  await writeSnapshot('dashboard', snapshots.teamsTranscript, { prepare: async (runtime) => {
    await runtime.click('[data-action="open-bot-teams"]', 80);
    await runtime.click('[data-action="open-bot-sessions"][data-bot-id="octacon-bot"]', 50);
    await runtime.click('[data-bot-session="sess-octacon-1"]', 50);
  } });
  await writeSnapshot('project', snapshots.initiative, { prepare: async (runtime) => {
    await runtime.click('[data-project-view="plan"]', 80);
    await runtime.click('[data-plan-row="initiative"][data-plan-id="INI-DEMO-2"] .dy-plan-row-open', 60);
  } });
  await writeSnapshot('project', snapshots.initiativeFreeze, { prepare: async (runtime) => {
    await runtime.click('[data-project-view="plan"]', 80);
    await runtime.click('[data-plan-menu="plan-more"]', 20);
    await runtime.click('[data-plan-menu-item="freeze"]', 40);
  } });
  await writeSnapshot('workflows', snapshots.workflows);
  await writeSnapshot('inbox', snapshots.inbox, { prepare: (runtime) => runtime.click('[data-inbox-ref="INI-DEMO-2"]') });
  await writeSnapshot('inbox', snapshots.inboxReject, { prepare: async (runtime) => { await runtime.click('[data-inbox-ref="INI-DEMO-2"]'); await runtime.click('[data-inbox-panel="true"] [data-action="reject"]'); } });
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
    { name: 'project-vision-700-dark', file: snapshots.projectVision, width: 700, height: 1000, scheme: 'dark' },
    { name: 'project-vision-1400-light', file: snapshots.projectVision, width: 1400, height: 1000, scheme: 'light' },
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
            const card = document.querySelector('.dockyard-command-layout') || document.querySelector('.dockyard-attention-card');
            const columns = card ? getComputedStyle(card).gridTemplateColumns.trim() : '';
            return columns && columns !== 'none' ? columns.split(/\s+/).length : (card ? 1 : 0);
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
      if (measure.projectRows > 0 && measure.projectIconDisplays.length) assert.deepEqual(measure.projectIconDisplays, ['grid'], `${spec.name} project icons lost their centring layout`);
      assert(!measure.rootFont.includes('Times New Roman'), `${spec.name} inherited Times New Roman`);
      // Phase 4 nav reconciliation: Bot teams is a Dashboard surface and the
      // initiative snapshot lives on the Delivery tab.
      const surfaceTab = { initiative: 'project', initiativeFreeze: 'project' };
      const expectedTab = spec.name.startsWith('onboarding-') ? 'dashboard' : (surfaceTab[spec.name.split('-')[0]] ?? spec.name.split('-')[0]);
      assert.equal(measure.activeScreen, `dockyard-tab-${expectedTab}`, `${spec.name} captured the wrong active screen`);
      const expectedDialogs = ['onboarding-', 'backlog-create-', 'project-board-detail-', 'initiative-freeze-', 'inbox-reject-'].some((prefix) => spec.name.startsWith(prefix)) ? 1 : 0;
      assert.equal(measure.dialogCount, expectedDialogs, `${spec.name} has the wrong modal-dialog state`);
      if (spec.width >= 1200) assert.equal(measure.clippedLoopVisuals, 0, `${spec.name} requires horizontal scrolling for a primary workflow visual`);
      const screenshot = process.env.DOCKYARD_CAPTURE_SCREENSHOTS === '0'
        ? null
        : `${TMPDIR}/dockyard-${spec.name}.png`;
      if (screenshot) {
        // Wait for two drawn frames first: a freshly launched headless Chromium
        // can refuse a full-page screenshot ("Unable to capture screenshot")
        // that is asked for before the page's first frame. It hit the first page
        // here in 2 of 5 gate runs (06/10); a probe of this exact sequence failed
        // 23 of 120 launches without the wait and 0 of 120 with it.
        await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
        await page.screenshot({ path: screenshot, fullPage: true });
      }
      assert.equal(browserErrors.length, 0, `${spec.name} browser warnings/errors: ${browserErrors.join(' | ')}`);
      results.push({ ...spec, screenshot, ...measure });
      await page.close();
    }
  } finally {
    await browser.close();
  }
  console.log('LAYOUT_RESULTS=' + JSON.stringify(results));
}

async function testActualObjectiveEvidence() {
  const payload = JSON.parse(execFileSync(fileURLToPath(new URL('../../.venv/bin/python', import.meta.url)), [fileURLToPath(new URL('../../tests/phase2_payload.py', import.meta.url))], { encoding: 'utf8' }));
  const runtime = await createRuntime({ objectivePayload: payload });
  try {
    await runtime.mount();
    await runtime.pickProject('payments-relaunch');
    await runtime.click('[data-tab="project"]', 80);
    // Design round f: objectives live on the Vision screen; each one's
    // evidence history opens with its details.
    await runtime.click('[data-project-view="plan"]', 80);
    const doc = runtime.dom.window.document;
    const ids = [...doc.querySelectorAll('[data-plan-row="objective"]')].map((row) => row.getAttribute('data-plan-id'));
    assert.equal(ids.length, 4, 'every objective from the actual API payload is listed');
    const rows = [];
    for (const id of ids) {
      await runtime.click(`[data-plan-row="objective"][data-plan-id="${id}"] .dy-plan-row-open`, 40);
      const evidence = doc.querySelector(`[data-plan-drawer="objective"] [data-objective-evidence="${id}"]`);
      assert(evidence, `objective ${id} evidence/history is missing from its details`);
      rows.push({ text: evidence.textContent, scripts: evidence.querySelectorAll('script').length,
        buttons: [...evidence.querySelectorAll('button')].map((button) => button.disabled) });
      if (process.env.PHASE2_RENDER_HTML) evidence.open = true;
    }
    for (const state of ['passed', 'failed', 'stale', 'unknown']) assert(rows.some(row => row.text.toLowerCase().includes(state)));
    assert(rows.some(row => row.text.includes('ticket:1')));
    assert.equal(rows.reduce((sum, row) => sum + row.scripts, 0), 0);
    assert(rows.flatMap((row) => row.buttons).every(Boolean), 'unauthenticated assessment controls must fail closed');
    if (process.env.PHASE2_RENDER_HTML) {
      writeFileSync(process.env.PHASE2_RENDER_HTML, runtime.dom.serialize());
    }
  } finally { await runtime.dispose(); }
}

const tests = [
  ['actual API objective evidence and authority', testActualObjectiveEvidence],
  ['styles and populated dashboard', testStylesAndPopulatedDashboard],
  ['loading and empty states', testLoadingAndEmptyStates],
  ['error retry', testErrorRetry],
  ['reference benchmark dashboard composition', testReferenceBenchmarkDashboardComposition],
  ['reference benchmark approval cards and reject', testReferenceBenchmarkApprovalCardsAndReject],
  ['project dashboard screen', testProjectDashboardScreen],
  ['mission and objective management with destructive gates', testMissionObjectiveManagementAndDestructiveGates],
  ['project content visibility, preview and upload', testProjectContentVisibilityPreviewAndUpload],
  ['project lifecycle state and confirmed actions', testProjectLifecycleStateAndConfirmedActions],
  ['Phase 5 management journeys', testPhase5ManagementJourneys],
  ['backlog board and reason gate', testBacklogBoardAndReasonGate],
  ['backlog create form validation and readback', testBacklogCreateFormValidationAndReadback],
  ['backlog bulk reassignment and durable audit', testBacklogBulkReassignment],
  ['bot teams screen', testBotTeamsScreen],
  ['initiative loop screen', testInitiativeLoopScreen],
  ['saved views screen and creator', testSavedViewsScreenAndCreator],
  ['onboarding wizard and toast surface', testOnboardingWizardAndToastSurface],
  ['approval flow', testApprovalFlow],
  ['notification flow', testNotificationFlow],
  ['keyboard tabs and accessible names', testKeyboardTabsAndNames],
  ['onboarding preflight and host discovery', testOnboardingPreflightAndDiscovery],
  ['onboarding preflight conflict surfaces before commit', testOnboardingPreflightConflictSurfacesBeforeCommit],
  ['onboarding discovery failure fails closed', testOnboardingDiscoveryFailureFailsClosed],
  ['onboarding discovery success refresh preserves input', testOnboardingDiscoverySuccessRefreshPreservesWizardInput],
  ['onboarding discovery failure refresh preserves input', testOnboardingDiscoveryRefreshPreservesWizardInput],
  ['onboarding journey to first assessment', testOnboardingJourneyToFirstAssessment],
  ['first assessment completion action', testFirstAssessmentCompletionAction],
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
  // Fail fast: open jsdom timers would otherwise keep the process (and the
  // serial browser runner) alive indefinitely after a failure.
  process.exit(1);
}
