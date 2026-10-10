// A project Hermes does not know ("unlinked", found on Sahil's live app
// 10/10/2026) in the browser dashboard. The Projects table showed its raw
// status ("unlinked"), Needs attention left it out, and Work and Delivery read
// the work items of the first project in one batch: with that project
// unlinked, both tabs said "Project Stewardship backend unreachable" and never
// drew the project picker, so nothing else could be chosen.
//
// /dashboard and /portfolio come from the real backend with one unlinked
// project (tests/unlinked_host.py), not a hand-written fixture; a read Hermes
// refuses throws what the Hermes web SDK throws (its ApiError: the backend's
// message, status 404).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';

const GHOST = 'payments-relaunch'; // sorts first, so it is the default project
const LINKED = 'zeta-app';
const repo = fileURLToPath(new URL('../../../', import.meta.url));
const python = process.env.STEWARD_TEST_PYTHON || fileURLToPath(new URL('../../../.venv/bin/python', import.meta.url));
const payload = JSON.parse(execFileSync(python, ['-c', `
import tempfile, json, sys, importlib, os
from pathlib import Path
sys.modules['httpx'] = importlib.import_module('httpx2')
sys.path.insert(0, os.getcwd())
with tempfile.TemporaryDirectory(prefix='steward-unlinked-web-') as root:
 os.environ['HERMES_HOME'] = root
 os.environ['HERMES_KANBAN_HOME'] = root
 from fastapi.testclient import TestClient
 from hermes_project_stewardship.api.server import create_app
 from hermes_project_stewardship.persistence.store import Store
 from hermes_project_stewardship.persistence.service import StewardshipService
 from tests.unlinked_host import NoHermesProjectAdapter
 store = Store(Path(root) / 'web.db')
 try:
  service = StewardshipService(store)
  adapter = NoHermesProjectAdapter(store)
  for pid in ('${GHOST}', '${LINKED}'):
   service.enable(pid, lead_profile='fixture', autonomy_level=2)
  adapter.create_work('${LINKED}', kind='task', title='Linked work', body='', assignee='worker', created_by='fixture')
  adapter.missing.add('${GHOST}')
  with TestClient(create_app(store, kanban_adapter=adapter)) as client:
   out = {}
   for name, path in (('dashboard', '/dashboard'), ('portfolio', '/portfolio'), ('work', '/projects/${LINKED}/work-items')):
    response = client.get('/stewardship/v1' + path)
    assert response.status_code == 200, response.text
    out[name] = response.json()
   missing = client.get('/stewardship/v1/projects/${GHOST}/work-items')
   assert missing.status_code == 404, missing.text
   out['missing'] = missing.json()['error']['message']
   print(json.dumps(out))
 finally:
  store.close()
`], { encoding: 'utf8', cwd: repo }));
const bundle = process.env.STEWARD_TEST_BUNDLE || fileURLToPath(new URL('../dist/index.js', import.meta.url));
const BASE = '/api/plugins/hermes-project-stewardship';
const NEEDS_HERMES = /\/(work-items|milestones|team|work-dependencies)$/;

async function boot() {
  const dom = new JSDOM('<!doctype html><div id="root"></div>', {
    runScripts: 'outside-only', url: 'https://dashboard.local/',
  });
  const asked = [];
  dom.window.__HERMES_PLUGIN_SDK__ = {
    sdkVersion: '1.1.0',
    React: { createElement: () => ({}) },
    hooks: { useEffect: () => {}, useRef: () => ({ current: null }) },
    fetchJSON: async (url) => {
      const path = url.slice(url.indexOf(BASE) + BASE.length).split('?')[0];
      asked.push(path);
      if (path === '/dashboard') return payload.dashboard;
      if (path === '/portfolio') return payload.portfolio;
      if (path.startsWith(`/projects/${GHOST}/`) && NEEDS_HERMES.test(path)) {
        const error = new Error(payload.missing);
        error.status = 404;
        throw error;
      }
      if (path === `/projects/${LINKED}/work-items`) return payload.work;
      if (path.endsWith('/features')) return { features: {} };
      for (const [suffix, key] of [['/backlog', 'backlog'], ['/views', 'views'], ['/initiatives', 'initiatives'],
        ['/observations', 'observations'], ['/milestones', 'milestones']]) {
        if (path.endsWith(suffix)) return { [key]: [] };
      }
      return {};
    },
  };
  dom.window.eval(readFileSync(bundle, 'utf8'));
  await settle();
  return { dom, document: dom.window.document, asked };
}

const settle = () => new Promise((resolve) => setTimeout(resolve, 80));

async function openTab(document, id) {
  document.querySelector(`button[data-tab="${id}"]`).click();
  await settle();
}

test('the real backend reports the project unlinked and refuses its work items', () => {
  const row = payload.dashboard.projects.find((project) => project.id === GHOST);
  assert.equal(row.linked, false);
  assert.equal(payload.portfolio.projects.find((project) => project.project_id === GHOST).status, 'unlinked');
  assert.equal(payload.missing, 'canonical project was not found');
  assert.equal(payload.dashboard.projects[0].id, GHOST, 'the unlinked project is the default one');
});

test('the Projects table and Needs attention name the missing link', async () => {
  const { dom, document } = await boot();
  try {
    await openTab(document, 'dashboard');
    const rows = [...document.querySelectorAll('.dy-table tbody tr')];
    const ghost = rows.find((tr) => tr.textContent.includes(GHOST));
    assert.ok(ghost, 'a row for the unlinked project');
    const status = ghost.querySelector('.dy-status');
    assert.equal(status.textContent, 'Not linked');
    assert.ok(status.classList.contains('dy-status-unlinked'));
    const attention = document.querySelector('.dy-attention');
    assert.ok(attention, 'Needs attention is shown');
    assert.ok(attention.textContent.includes(`Not linked to Hermes: ${GHOST}`), attention.textContent);
  } finally {
    dom.window.close();
  }
});

for (const [tab, label] of [['work', 'Project'], ['delivery', 'Delivery project']]) {
  test(`${tab}: an unlinked default project still opens, says why, and the picker can leave it`, async () => {
    const { dom, document, asked } = await boot();
    try {
      await openTab(document, tab);
      const main = document.querySelector('.dy-error')?.textContent ?? '';
      assert.ok(!/unreachable|canonical/i.test(main), `failure shown: ${main}`);
      const notice = document.querySelector(`[data-unlinked-notice="${GHOST}"]`);
      assert.ok(notice, 'the missing link is explained');
      assert.ok(notice.textContent.includes('Not linked to a Hermes project'), notice.textContent);
      assert.ok(notice.textContent.includes(`Create a Hermes project with the slug "${GHOST}" to link it.`), notice.textContent);
      assert.ok(!asked.includes(`/projects/${GHOST}/work-items`), 'asked Hermes for work it knows is unreadable');
      const picker = document.querySelector(`select[aria-label="${label}"]`);
      assert.ok(picker, 'the project picker is drawn');
      picker.value = LINKED;
      picker.dispatchEvent(new dom.window.Event('change'));
      await settle();
      assert.ok(!document.querySelector('[data-unlinked-notice]'), 'the linked project shows no notice');
      assert.ok(asked.includes(`/projects/${LINKED}/work-items`), 'the linked project reads its work');
    } finally {
      dom.window.close();
    }
  });
}
