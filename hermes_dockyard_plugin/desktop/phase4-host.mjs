/**
 * Phase 4 disposable Desktop host.
 *
 * Serves the candidate plugin bundle at /desktop and a small stateful JSON
 * API under /api so rendered-browser journeys can exercise the real bundle
 * against deterministic, disposable state. Records every API call under
 * GET /api/__calls for assertions and exposes POST /api/__reset.
 *
 * Env: PHASE4_PORT (default 19501), PHASE4_BUNDLE (required).
 */
import http from 'node:http';
import fs from 'node:fs';

const PORT = Number(process.env.PHASE4_PORT || 19501);
const BUNDLE = process.env.PHASE4_BUNDLE;
if (!BUNDLE) throw new Error('PHASE4_BUNDLE is required');

const UNICODE_MD = [
  '# Executive report — payments-relaunch',
  '',
  'Mission: Ship retry-safe payments ✅ without weakening release gates.',
  'Généré par Quan · café review included.',
  '',
  '## Delivery',
  '',
  '- In progress: 2',
  '- Blocked: 1',
  '',
].join('\n');

const days = (n) => new Date(Date.now() + n * 86400000).toISOString();

function seed() {
  return {
    calls: [],
    library: [],
    enablement: {},
    dashboard: {
      projects: [
        { id: 'payments-relaunch', enabled: true, phase: 'active', health: 'watch', work: { backlog: 1, active: 2, done: 1, blocked: 1 }, unacked_notifications: 1 },
        { id: 'mobile-client', enabled: true, phase: 'active', health: 'healthy', work: { backlog: 1, active: 1, done: 1, blocked: 0 }, unacked_notifications: 0 },
      ],
      owed_decisions: 0,
      totals: { active_work: 5, blocked: 1, stuck_bots: 0, unacked_notifications: 1 },
    },
    workItems: {
      'payments-relaunch': { work_items: [
        { ref: 'HDY-12', title: 'Fix double-charge on retry path', status: 'in_progress', type: 'task', assignee: 'octacon-bot' },
        { ref: 'HDY-13', title: 'Add retry idempotency key', status: 'backlog', type: 'task', assignee: 'quan-bot' },
        { ref: 'HDY-14', title: 'Refund webhook audit', status: 'done', type: 'task', assignee: 'quan-bot' },
      ] },
      'mobile-client': { work_items: [] },
    },
    objectives: {
      'payments-relaunch': { objectives: [
        {
          id: 1, name: 'Retry failure rate below 2%', description: 'Command-evaluated', severity: 'high',
          evaluator_type: 'command', target: '<=2', window: '30d', enabled: true,
          command: ['echo', '1'],
          evidence: {
            state: 'unknown', passed: false, measured: null, target_met: false, sample_count: 0,
            pass_rate: null, latest_detail: 'no manual status recorded', history: [],
          },
        },
        {
          id: 2, name: 'Gate reviews recorded', description: 'Manual', severity: 'medium',
          evaluator_type: 'manual', target: '>=1', window: '30d', enabled: true,
          evidence: {
            state: 'passed', passed: true, measured: 1, target_met: true, sample_count: 1,
            pass_rate: 1, latest_detail: 'release review done', history: [
              { recorded_at: days(-2), state: 'passed', detail: 'release review done', verified_actor: 'sahil', source_evidence: [{ source: 'ticket:1' }] },
            ],
          },
        },
      ] },
      'mobile-client': { objectives: [] },
    },
    views: {
      'payments-relaunch': [ { name: 'Release focus', layout: 'board', filters: { status: 'in_progress' }, owner: 'dashboard-user', shared: false } ],
      'mobile-client': [],
    },
    canvas: {
      'payments-relaunch': { canvas_id: 'demo-canvas', project_id: 'payments-relaunch', revision: 1, objects: [], connectors: [] },
      'mobile-client': { canvas_id: 'mobile-canvas', project_id: 'mobile-client', revision: 1, objects: [], connectors: [] },
    },
    sessions: {},
    proposals: {},
    content: { 'payments-relaunch': [], 'mobile-client': [] },
    contentPayloads: {},
    reports: {
      'payments-relaunch': { reports: [
        { report_id: 'RPT-1', title: 'payments-relaunch executive report', report_type: 'executive', generated_by: 'sahil', generated_at: days(-1) },
      ] },
    },
    reportDetails: {
      'RPT-1': { report_id: 'RPT-1', project_id: 'payments-relaunch', report_type: 'executive', title: 'payments-relaunch executive report', content: UNICODE_MD, generated_by: 'sahil', generated_at: days(-1) },
    },
  };
}
let data = seed();

const projectId = (path) => {
  const parts = path.split('/');
  return parts[2] ? decodeURIComponent(parts[2]) : 'payments-relaunch';
};

function evaluate(objectiveId) {
  const pid = 'payments-relaunch';
  const objective = data.objectives[pid].objectives.find((o) => o.id === objectiveId);
  if (!objective) return null;
  const result = {
    objective_id: objectiveId,
    name: objective.name,
    passed: true,
    measured: 1,
    target_met: true,
    state: 'passed',
    detail: 'command evaluator run: retry failure rate 1%',
  };
  // Persist a sample so the read-back evidence reflects the evaluation.
  objective.evidence = {
    ...objective.evidence,
    state: 'passed',
    passed: true,
    measured: 1,
    target_met: true,
    sample_count: (objective.evidence.sample_count || 0) + 1,
    pass_rate: 1,
    latest_detail: result.detail,
    history: [
      { recorded_at: new Date().toISOString(), state: 'passed', detail: result.detail, actor: 'sahil', source: 'evaluate-now' },
      ...(objective.evidence.history || []),
    ],
  };
  return {
    objective_id: objectiveId,
    evaluated_at: new Date().toISOString(),
    actor: 'sahil',
    recorded: true,
    result,
    evidence: objective.evidence,
  };
}

function route(method, path, query, body) {
  data.calls.push({ method, path, body: body ?? null });
  const pid = projectId(path);

  if (path === '/__calls') return { calls: data.calls };
  if (path === '/dashboard' || path === '/portfolio') return data.dashboard;
  if (path === '/inbox') return { count: 0, items: [] };
  if (path === '/notifications') return { notifications: [] };
  if (path === '/bots') return { bots: [] };
  if (path === '/workload') return { busy: [], idle: [], offline: [], stuck: [] };
  if (path === '/bot-groups') return { groups: [] };
  if (path === '/onboard/discover') return { profiles: [
    { name: 'octacon', available: true, selectable: true, host_capabilities: ['lead'] },
    { name: 'quan-bot', available: true, selectable: true, host_capabilities: ['member'] },
  ] };

  if (path === '/__reset') { data = seed(); return { ok: true }; }

  if (path.endsWith('/settings')) return {
    project_id: pid, enabled: true, mission: 'Checkout reliability rebuild', autonomy_level: 1, phase: 'active',
    owner: { lead_profile: 'octacon', member_profiles: ['quan'] },
    policies: { autonomy: {}, verification: {}, release: {}, notification: {} },
  };
  if (path.endsWith('/work-items')) return data.workItems[pid] ?? { work_items: [] };
  if (path.endsWith('/initiatives')) return { initiatives: [] };
  if (path.endsWith('/goals')) return { goals: [] };
  if (path.endsWith('/mission/archive')) return { entries: [] };
  const contentMatch = path.match(/^\/projects\/([^/]+)\/content$/);
  if (contentMatch && method === 'GET') return { content: data.content[pid] ?? [] };
  if (contentMatch && method === 'POST') {
    const id = `CONTENT-DEMO-${(data.content[pid]?.length ?? 0) + 1}`;
    const bytes = Buffer.from(body?.content_base64 ?? '', 'base64');
    const item = { content_id: id, project_id: pid, filename: body?.filename, media_type: body?.media_type, size_bytes: bytes.length, uploaded_at: new Date().toISOString(), removal_state: 'present' };
    (data.content[pid] ??= []).unshift(item); data.contentPayloads[id] = bytes.toString('utf8'); return item;
  }
  const previewMatch = path.match(/^\/projects\/([^/]+)\/content\/([^/]+)\/preview$/);
  if (previewMatch && method === 'GET') {
    const id = decodeURIComponent(previewMatch[2]); const item = (data.content[pid] ?? []).find((row) => row.content_id === id);
    if (!item) throw Object.assign(new Error('unknown content'), { status: 404 });
    return { ...item, preview_kind: item.media_type?.startsWith('text/') ? 'text' : 'metadata', text: data.contentPayloads[id] ?? '' };
  }
  const canvasMatch = path.match(/^\/projects\/([^/]+)\/canvas$/);
  if (canvasMatch && method === 'GET') return data.canvas[pid] ?? { revision: 1, objects: [], connectors: [] };
  if (canvasMatch && method === 'PUT') {
    const current = data.canvas[pid] ?? { revision: 1, objects: [], connectors: [] };
    if (Number(body?.expected_revision) !== Number(current.revision)) throw Object.assign(new Error('canvas revision conflict'), { status: 409 });
    data.canvas[pid] = { ...current, revision: current.revision + 1, objects: body?.objects ?? [], connectors: body?.connectors ?? [], updated_by: 'sahil' };
    return data.canvas[pid];
  }
  const canvasObjectMatch = path.match(/^\/projects\/([^/]+)\/canvas\/objects\/([^/]+)$/);
  if (canvasObjectMatch && method === 'DELETE') {
    const current = data.canvas[pid] ?? { revision: 1, objects: [], connectors: [] };
    const objectId = decodeURIComponent(canvasObjectMatch[2]);
    if (!(current.objects ?? []).some((item) => item.id === objectId)) throw Object.assign(new Error('unknown canvas object'), { status: 404 });
    const expected = Number(url.searchParams.get('expected_revision'));
    if (expected !== Number(current.revision)) throw Object.assign(new Error('canvas revision conflict'), { status: 409 });
    data.canvas[pid] = {
      ...current,
      revision: current.revision + 1,
      objects: (current.objects ?? []).filter((item) => item.id !== objectId),
      connectors: (current.connectors ?? []).filter((edge) => edge.source !== objectId && edge.target !== objectId),
    };
    return data.canvas[pid];
  }
  const canvasCurateMatch = path.match(/^\/projects\/([^/]+)\/canvas\/curate$/);
  if (canvasCurateMatch && method === 'POST') {
    const current = data.canvas[pid] ?? { revision: 1, objects: [], connectors: [] };
    const kinds = (current.objects ?? []).map((item) => item.kind);
    const count = (values) => kinds.filter((kind) => values.includes(kind)).length;
    return {
      canvas_revision: current.revision,
      status: count(['claim']) ? 'ready_for_review' : 'needs_clarification',
      summary: {
        evidence_count: count(['evidence', 'note', 'media', 'link']),
        claim_count: count(['claim']),
        question_count: count(['question']),
        plan_block_count: count(['plan_block']),
      },
      clarifying_questions: count(['claim']) ? [] : [{ id: 'missing-claim', question: 'What problem or user need are we solving?' }],
      proposals: [],
    };
  }
  const sessionMatch = path.match(/^\/projects\/([^/]+)\/canvas\/sessions$/);
  if (sessionMatch && method === 'POST') {
    const current = data.canvas[pid] ?? { revision: 1, objects: [], connectors: [] };
    const id = `demo-session-${Object.keys(data.sessions).length + 1}`;
    const missing = current.objects.some((item) => item.kind === 'claim') ? [] : [{ id: 'missing-claim', question: 'What problem or user need are we solving?' }];
    const session = { session_id: id, project_id: pid, canvas_revision: current.revision, status: missing.length ? 'active' : 'complete', current_question: missing[0] ?? null, answers: [], proposals: [] };
    data.sessions[id] = session; return session;
  }
  const sessionReadMatch = path.match(/^\/canvas\/sessions\/([^/]+)$/);
  if (sessionReadMatch && method === 'GET') {
    const sid = decodeURIComponent(sessionReadMatch[1]);
    const session = data.sessions[sid];
    if (!session) throw Object.assign(new Error('unknown canvas session'), { status: 404 });
    return session;
  }
  const answerMatch = path.match(/^\/canvas\/sessions\/([^/]+)\/answer$/);
  if (answerMatch && method === 'POST') {
    const session = data.sessions[decodeURIComponent(answerMatch[1])];
    if (!session) throw Object.assign(new Error('unknown session'), { status: 404 });
    session.answers.push({ question: session.current_question, outcome: body?.outcome, answer: body?.answer ?? '' }); session.current_question = null; session.status = body?.outcome === 'stop' ? 'stopped' : 'complete';
    session.proposals = session.status === 'complete' ? [{ proposal_id: `demo-proposal-${Object.keys(data.proposals).length + 1}`, kind: 'technical_plan', title: 'Technical implementation plan', source_object_ids: (data.canvas[session.project_id]?.objects ?? []).map((item) => item.id), requires_approval: true }] : [];
    for (const proposal of session.proposals) data.proposals[proposal.proposal_id] = proposal;
    return session;
  }
  const decisionMatch = path.match(/^\/canvas\/proposals\/([^/]+)\/decision$/);
  if (decisionMatch && method === 'POST') {
    const proposal = data.proposals[decodeURIComponent(decisionMatch[1])];
    if (!proposal) throw Object.assign(new Error('unknown proposal'), { status: 404 });
    if (proposal.status) throw Object.assign(new Error('proposal is not pending'), { status: 409 });
    proposal.status = body?.approve ? 'approved' : 'rejected'; return { proposal_id: proposal.proposal_id, status: proposal.status };
  }
  if (path.endsWith('/events')) return { events: [] };
  if (path.endsWith('/milestones')) return { milestones: [] };
  if (path.endsWith('/workflows')) return { workflows: [] };
  if (path === '/workflow-library' && method === 'GET') {
    const scope = query.get('scope');
    return { workflows: (data.library ?? []).filter((row) => !scope || row.scope === scope) };
  }
  if (path === '/workflow-library' && method === 'POST') {
    const row = { scope: body?.scope ?? 'global', name: body?.name ?? 'workflow', version: 1,
      definition: { nodes: body?.nodes ?? [] }, owner_project_id: null, archived_at: null };
    (data.library ??= []).unshift(row); return row;
  }
  const libraryArchive = path.match(/^\/workflow-library\/([^/]+)\/([^/]+)\/archive$/);
  if (method === 'POST' && libraryArchive) {
    const row = (data.library ?? []).find((item) => item.scope === decodeURIComponent(libraryArchive[1])
      && item.name === decodeURIComponent(libraryArchive[2]));
    if (!row) throw Object.assign(new Error('workflow was not found'), { status: 404 });
    row.archived_at = new Date().toISOString(); return row;
  }
  const libraryRestore = path.match(/^\/workflow-library\/([^/]+)\/([^/]+)\/restore$/);
  if (method === 'POST' && libraryRestore) {
    const row = (data.library ?? []).find((item) => item.scope === decodeURIComponent(libraryRestore[1])
      && item.name === decodeURIComponent(libraryRestore[2]));
    if (!row) throw Object.assign(new Error('workflow was not found'), { status: 404 });
    row.archived_at = null; return row;
  }
  const libraryDelete = path.match(/^\/workflow-library\/([^/]+)\/([^/]+)$/);
  if (method === 'DELETE' && libraryDelete) {
    const scope = decodeURIComponent(libraryDelete[1]); const name = decodeURIComponent(libraryDelete[2]);
    const before = (data.library ?? []).length;
    data.library = (data.library ?? []).filter((item) => !(item.scope === scope && item.name === name));
    if (data.library.length === before) throw Object.assign(new Error('workflow was not found'), { status: 404 });
    return { scope, name, deleted: true };
  }
  const enableMatch = path.match(/^\/projects\/([^/]+)\/workflows\/(global|project)\/([^/]+)\/enablement$/);
  if (method === 'PUT' && enableMatch) {
    const pid = decodeURIComponent(enableMatch[1]); const scope = enableMatch[2];
    const name = decodeURIComponent(enableMatch[3]);
    const key = `${pid}:${scope}:${name}`;
    const row = { project_id: pid, scope, name, enabled: Boolean(body?.enabled), updated_at: new Date().toISOString() };
    data.enablement[key] = row; return row;
  }
  const scopedStartMatch = path.match(/^\/projects\/([^/]+)\/workflows\/(global|project)\/([^/]+)\/start$/);
  if (method === 'POST' && scopedStartMatch) {
    const pid = decodeURIComponent(scopedStartMatch[1]); const scope = scopedStartMatch[2];
    const name = decodeURIComponent(scopedStartMatch[3]);
    if (!(data.enablement[`${pid}:${scope}:${name}`]?.enabled)) {
      throw Object.assign(new Error(`workflow is disabled for this project (run refused)`), { status: 409 });
    }
    return { project_id: pid, name, scope, run_key: body?.run_key, status: 'pending', tasks: {} };
  }
  const availableMatch = path.match(/^\/projects\/([^/]+)\/workflows\/available$/);
  if (method === 'GET' && availableMatch) {
    const pid = decodeURIComponent(availableMatch[1]);
    const state = (row) => data.enablement[`${pid}:${row.scope}:${row.name}`]?.enabled ?? row.scope === 'project';
    const rows = (data.library ?? []).filter((row) => row.scope === 'global' || row.owner_project_id === pid)
      .map((row) => ({ ...row, enabled: state(row) }));
    return { workflows: rows };
  }

  const evaluateMatch = path.match(/^\/projects\/([^/]+)\/objectives\/(\d+)\/evaluate$/);
  if (method === 'POST' && evaluateMatch) {
    const result = evaluate(Number(evaluateMatch[2]));
    if (!result) throw Object.assign(new Error('unknown objective'), { status: 409 });
    return result;
  }
  const archiveObjective = path.match(/^\/projects\/([^/]+)\/objectives\/(\d+)\/archive$/);
  if (method === 'POST' && archiveObjective) {
    const objective = data.objectives[pid].objectives.find((o) => o.id === Number(archiveObjective[2]));
    if (!objective) throw Object.assign(new Error('unknown objective'), { status: 409 });
    objective.enabled = false;
    // The real endpoint returns the refreshed objective (enabled=false) so
    // the UI can swap it into the list without losing evidence history.
    return objective;
  }
  if (path.endsWith('/objectives') && method === 'GET') return data.objectives[pid] ?? { objectives: [] };
  if (path.endsWith('/objectives') && method === 'POST') {
    const list = (data.objectives[pid] ??= { objectives: [] });
    const nextId = 100 + list.objectives.filter((existing) => existing.id >= 100).length;
    const objective = {
      id: nextId, name: body?.name ?? 'New objective', description: body?.description ?? '',
      severity: body?.severity ?? 'medium', evaluator_type: body?.evaluator_type ?? 'manual',
      target: body?.target ?? '>=1', window: body?.window ?? '30d', enabled: true,
      evidence: { state: 'unknown', passed: false, measured: null, target_met: false, sample_count: 0, pass_rate: null, latest_detail: 'no manual status recorded', history: [] },
    };
    list.objectives.push(objective);
    return objective;
  }
  const objectivePatch = path.match(/^\/projects\/([^/]+)\/objectives\/(\d+)$/);
  if (method === 'PATCH' && objectivePatch) {
    const objective = data.objectives[pid].objectives.find((o) => o.id === Number(objectivePatch[2]));
    if (!objective) throw Object.assign(new Error('unknown objective'), { status: 409 });
    for (const key of ['name', 'description', 'target', 'severity', 'window']) {
      if (body?.[key] != null) objective[key] = body[key];
    }
    return objective;
  }

  const reportMatch = path.match(/^\/projects\/([^/]+)\/reports$/);
  if (method === 'GET' && reportMatch) return data.reports[pid] ?? { reports: [] };
  if (method === 'POST' && reportMatch) {
    const rid = `RPT-${Object.keys(data.reportDetails).length + 1}`;
    const report = {
      report_id: rid, project_id: pid, report_type: body?.report_type ?? 'executive',
      title: `${pid} ${body?.report_type ?? 'executive'} report`, content: UNICODE_MD,
      generated_by: 'sahil', generated_at: new Date().toISOString(),
    };
    data.reportDetails[rid] = report;
    (data.reports[pid] ??= { reports: [] }).reports.unshift({ ...report, content: undefined });
    return report;
  }
  const reportGet = path.match(/^\/projects\/([^/]+)\/reports\/([^/]+)$/);
  if (method === 'GET' && reportGet) {
    const report = data.reportDetails[decodeURIComponent(reportGet[2])];
    if (!report) throw Object.assign(new Error('unknown report'), { status: 404 });
    return report;
  }

  const viewsMatch = path.match(/^\/projects\/([^/]+)\/views$/);
  if (viewsMatch && method === 'GET') return { views: data.views[pid] ?? [] };
  if (viewsMatch && method === 'PUT') {
    const list = (data.views[pid] ??= []);
    const next = { name: body?.name, layout: body?.layout ?? 'board', filters: body?.filters ?? {}, owner: 'dashboard-user', shared: false };
    const index = list.findIndex((view) => view.name === next.name);
    if (index >= 0) list[index] = next; else list.push(next);
    return { view: next };
  }
  const transition = path.match(/^\/projects\/([^/]+)\/work-items\/([^/]+)\/transition$/);
  if (transition && method === 'POST') {
    const item = data.workItems[pid]?.work_items.find(item => item.ref === decodeURIComponent(transition[2]));
    if (!item) throw Object.assign(new Error('missing scoped item'), {status: 404});
    item.status = body.status;
    return {ref: item.ref, status: item.status};
  }
  const viewItemsMatch = path.match(/^\/projects\/([^/]+)\/views\/([^/]+)\/items$/);
  if (method === 'GET' && viewItemsMatch) {
    const name = decodeURIComponent(viewItemsMatch[2]);
    const view = (data.views[pid] ?? []).find((candidate) => candidate.name === name);
    if (!view) throw Object.assign(new Error('no such view'), { status: 404 });
    const status = view.filters?.status;
    const items = (data.workItems[pid]?.work_items ?? []).filter((item) => !status || item.status === status);
    return { items };
  }
  const viewDeleteMatch = path.match(/^\/projects\/([^/]+)\/views\/([^/]+)$/);
  if (method === 'DELETE' && viewDeleteMatch) {
    const name = decodeURIComponent(viewDeleteMatch[2]);
    const list = (data.views[pid] ??= []);
    const index = list.findIndex((view) => view.name === name);
    if (index < 0) throw Object.assign(new Error('no such view'), { status: 404 });
    list.splice(index, 1);
    return { name, deleted: true };
  }

  return {};
}

const server = http.createServer((request, response) => {
  const url = new URL(request.url, 'http://127.0.0.1');
  if (url.pathname === '/health') {
    response.writeHead(200, { 'content-type': 'application/json' });
    return response.end(JSON.stringify({ status: 'ok', bundle: 'phase4' }));
  }
  if (url.pathname === '/desktop' || url.pathname === '/desktop/') {
    response.writeHead(200, { 'content-type': 'text/html' });
    return response.end('<!doctype html><html><body><div id="root"></div><script type="module" src="/bundle.js"></script></body></html>');
  }
  if (url.pathname === '/bundle.js') {
    response.writeHead(200, { 'content-type': 'text/javascript' });
    return response.end(fs.readFileSync(BUNDLE));
  }
  if (url.pathname.startsWith('/api/')) {
    let raw = '';
    request.on('data', (chunk) => { raw += chunk; });
    request.on('end', () => {
      let body = null;
      try { body = raw ? JSON.parse(raw) : null; } catch { body = null; }
      try {
        const result = route(request.method, '/' + url.pathname.slice(5), url.searchParams, body);
        response.writeHead(200, { 'content-type': 'application/json' });
        response.end(JSON.stringify(result));
      } catch (error) {
        response.writeHead(error?.status ?? 500, { 'content-type': 'application/json' });
        response.end(JSON.stringify({ detail: String(error?.message ?? error) }));
      }
    });
    return;
  }
  response.writeHead(404);
  response.end();
});

server.listen(PORT, '127.0.0.1', () => console.log(`PHASE4_HOST_READY port=${PORT} bundle=${fs.statSync(BUNDLE).size}`));
