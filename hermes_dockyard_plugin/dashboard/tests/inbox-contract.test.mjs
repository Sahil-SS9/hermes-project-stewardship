import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';

// Generate the payload through the real backend, not a hand-authored UI fixture.
const python = process.env.STEWARD_TEST_PYTHON || fileURLToPath(new URL('../../../.venv/bin/python', import.meta.url));
const payload = JSON.parse(execFileSync(python, ['-c', `
import tempfile, json, sys, importlib, os
from pathlib import Path
sys.modules['httpx'] = importlib.import_module('httpx2')
from fastapi.testclient import TestClient
from hermes_project_stewardship.api.server import create_app
from hermes_project_stewardship.kanban import ReferenceKanbanAdapter
from hermes_project_stewardship.persistence.store import Store
from hermes_project_stewardship.persistence.service import StewardshipService
with tempfile.TemporaryDirectory(prefix='steward-inbox-contract-') as root:
 os.environ['HERMES_HOME'] = root
 os.environ['HERMES_KANBAN_HOME'] = root
 store = Store(Path(root) / 'inbox.db')
 try:
  service = StewardshipService(store)
  service.enable('contract-project', lead_profile='fixture', autonomy_level=2)
  service.propose_initiative('contract-project', title='Actual API approval', rationale='objective: contract')
  with TestClient(create_app(store, kanban_adapter=ReferenceKanbanAdapter(store))) as client:
   response = client.get('/stewardship/v1/inbox')
   assert response.status_code == 200, response.text
   inbox = response.json()
   approval = next(item for item in inbox['items'] if item['kind'] == 'initiative_approval')
   decision = client.get(f"/stewardship/v1/initiatives/{approval['ref']}/decision")
   assert decision.status_code == 200, decision.text
   print(json.dumps({'inbox': inbox, 'decision': decision.json()}))
 finally:
  store.close()
`], { encoding: 'utf8' }));
const bundle = process.env.STEWARD_TEST_BUNDLE || fileURLToPath(new URL('../dist/index.js', import.meta.url));

test('inbox renders project and approval action from actual API response', async () => {
  const dom = new JSDOM('<!doctype html><div id="root"></div>', {
    runScripts: 'outside-only', url: 'https://dashboard.local/',
  });
  const posts = [];
  dom.window.__HERMES_PLUGIN_SDK__ = {
    sdkVersion: '1.1.0',
    React: { createElement: () => ({}) },
    hooks: { useEffect: () => {}, useRef: () => ({ current: null }) },
    fetchJSON: async (url, options) => {
      if (url.endsWith('/inbox')) return payload.inbox;
      if (url.includes('/decision')) return payload.decision;
      if (url.endsWith('/dashboard')) return { projects: [] };
      if (url.endsWith('/approve')) { posts.push({ url, options }); return {}; }
      return {};
    },
  };
  try {
    dom.window.eval(readFileSync(bundle, 'utf8'));
    await new Promise(resolve => setTimeout(resolve, 50));
    const tab = dom.window.document.querySelector('button[data-tab="inbox"]');
    assert.ok(tab, 'inbox navigation exists');
    tab.click();
    await new Promise(resolve => setTimeout(resolve, 50));
    const rows = [...dom.window.document.querySelectorAll('.dy-inbox-item')];
    assert.equal(rows.length, payload.inbox.items.length);
    const approval = payload.inbox.items.find(item => item.kind === 'initiative_approval');
    assert.ok(approval, 'actual backend supplied an approval');
    const row = rows.find(item => item.textContent.includes(approval.title));
    assert.ok(row);
    assert.ok(row.textContent.includes(`${approval.project} · ${approval.ref}`), 'real project identity is displayed');
    assert.ok(
      row.textContent.includes(`fingerprint ${payload.decision.fingerprint}`),
      'decision evidence renders the REAL decision payload before approving');
    assert.ok(!row.textContent.includes('undefined'));
    const button = [...row.querySelectorAll('button')].find(item => item.textContent === 'Approve');
    assert.ok(button, 'actual discriminator renders the approval button');
    button.click();
    await new Promise(resolve => setTimeout(resolve, 50));
    assert.equal(posts.length, 1);
    assert.ok(posts[0].url.includes(approval.ref));
  } finally {
    dom.window.close();
  }
});
