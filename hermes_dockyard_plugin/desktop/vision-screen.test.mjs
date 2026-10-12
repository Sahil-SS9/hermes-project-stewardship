// Design round f — the Vision screen end to end, through the REAL plugin
// bundle, the REAL proxy router and the REAL backend, on its own temporary
// database (so no other journey's fixtures move under it).
//
// Covers what Sahil approved on 05/10:
//   * the tab is "Vision", one layout (Outline), no design-review switcher;
//   * "+ New" can record checks (the validation contract's `tests`);
//   * Withdraw before approval: the slot frees, the item moves under
//     "Show finished and archived" and reads "Withdrawn";
//   * Mark complete for in-progress work;
//   * Delete for good, for an archived milestone and an archived goal only.
//
// Failure-detection property: remove a proxy route or a frontend call and
// the matching step fails on a missing row, a dialog that never closes or a
// backend state that never changes.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import { makeTestStateRoot, stateEnv } from './test-state-guard.mjs'
import { evaluatePlugin as evaluatePluginBundle } from './test-support/load-plugin.mjs'
import { freePort } from './test-support/free-port.mjs'

const require = createRequire(fileURLToPath(new URL('../dashboard/package.json', import.meta.url)))
const { JSDOM, VirtualConsole } = require('jsdom')
const React = require('react')
const { act } = React

const PLUGIN_PATH = fileURLToPath(new URL('./plugin.js', import.meta.url))
const PYTHON = process.env.STEWARD_TEST_PYTHON || fileURLToPath(new URL('../../.venv/bin/python', import.meta.url))
const TEST_ENV = stateEnv(makeTestStateRoot('hps-vision-screen-'))
const PROJECT = 'vision-project'

// One project with a cap of 3 open initiatives:
//   "Pending idea"   waiting for approval (to withdraw)
//   "Running change" approved and in progress, cards on the board (to complete)
//   milestone "Beta" holding one work item, linked to "Running change"
//   goal "Faster checkout" measured by the objective "Checkout time"
const SERVER_SCRIPT = `
import importlib, os, sys, tempfile, atexit, shutil
from pathlib import Path
sys.modules['httpx'] = importlib.import_module('httpx2')
root = tempfile.mkdtemp(prefix='vision-screen-')
atexit.register(shutil.rmtree, root, ignore_errors=True)
os.environ['DOCKYARD_PLUGIN_DB'] = str(Path(root) / 'dockyard.db')
os.environ['HERMES_HOME'] = root
os.environ['HERMES_KANBAN_HOME'] = root
sys.path.insert(0, os.environ['PLUGIN_DIR'])
import plugin_api
from fastapi import FastAPI
from hermes_project_stewardship.api.server import create_app
from hermes_project_stewardship.dockyard import Actor, ActorKind
from hermes_project_stewardship.kanban import ReferenceKanbanAdapter
from hermes_project_stewardship.kanban.bridge import KanbanBridge
from hermes_project_stewardship.persistence.canonical_work_service import CanonicalWorkService
from hermes_project_stewardship.persistence.dockyard_service import DockyardService
from hermes_project_stewardship.persistence.ladder_service import LadderService
from hermes_project_stewardship.persistence.roadmap_service import RoadmapService
from hermes_project_stewardship.persistence.service import StewardshipService
store = plugin_api._store
adapter = ReferenceKanbanAdapter(store)
svc = StewardshipService(store)
owner = Actor(id='owner', display_name='owner', kind=ActorKind.HUMAN)
pid = '${PROJECT}'
svc.enable(pid, mission='Make checkout fast', lead_profile='lead', member_profiles=['worker'],
           autonomy_level=2, verification_policy={'max_open_initiatives': 3})
svc.propose_initiative(pid, title='Pending idea', rationale='Users ask for it')
running = svc.propose_initiative(pid, title='Running change', rationale='Checkout is slow',
                                 requires_approval=False)['ref']
KanbanBridge(svc, adapter).bind(running, start_execution=True)
work = CanonicalWorkService(store, adapter)
dy = DockyardService(store, canonical_work=work)
mid = dy.milestone_create(pid, 'Beta', due='2026-12-01', actor=owner)
item = work.create_item(pid, 'task', 'Write the beta notes', actor=owner)['ref']
dy.milestone_attach(pid, 'Beta', item, actor=owner)
LadderService(store, svc, work, RoadmapService(store, svc, work)).set_milestone_initiative(
    pid, mid, running, actor='owner', interface='test')
oid = int(svc.add_objective(pid, name='Checkout time', evaluator_type='manual', target='>=1',
                            actor='owner', interface='test')['id'])
svc.create_goal(pid, title='Faster checkout', objective_ids=[oid], actor='owner', interface='test')
# Same trust set-up as the browser suite's practice server: the signed-in
# human may archive (and so delete); decisions are vouched for by the proxy.
plugin_api._app = create_app(store, kanban_adapter=adapter, auth_principal='desk-owner',
                             auth_principal_is_human=True, capabilities=frozenset({'project_archive'}))
plugin_api._client = plugin_api.httpx.AsyncClient(
    transport=plugin_api.httpx.ASGITransport(app=plugin_api._app), base_url='http://dockyard.test')
app = FastAPI()
app.include_router(plugin_api.plugin_api, prefix='/api/plugins/hermes-project-stewardship')
import uvicorn
uvicorn.run(app, host='127.0.0.1', port=int(os.environ['VISION_PORT']), log_level='error')
`

async function waitReady(url, timeoutMs = 30000) {
  const start = Date.now()
  for (;;) {
    try { if ((await fetch(url)).ok) return } catch {}
    if (Date.now() - start > timeoutMs) throw new Error('server never became ready')
    await new Promise((r) => setTimeout(r, 250))
  }
}

test('Vision: propose with checks, withdraw, mark complete, delete archived milestone and goal', { timeout: 180000 }, async () => {
  const port = await freePort()
  const child = spawn(PYTHON, ['-c', SERVER_SCRIPT], {
    env: { ...TEST_ENV, STEWARD_TEST_PYTHON: PYTHON, VISION_PORT: String(port), PLUGIN_DIR: fileURLToPath(new URL('../dashboard', import.meta.url)) },
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  let serverOutput = ''
  child.stdout.on('data', (d) => { serverOutput += d })
  child.stderr.on('data', (d) => { serverOutput += d })
  const base = `http://127.0.0.1:${port}/api/plugins/hermes-project-stewardship`
  const originalError = console.error
  const originalWarn = console.warn
  const warnings = []
  try {
    await waitReady(`${base}/health`)
    const virtualConsole = new VirtualConsole()
    virtualConsole.on('jsdomError', (error) => warnings.push(error.message))
    console.error = (...args) => { warnings.push(args.join(' ')); originalError(...args) }
    console.warn = (...args) => { warnings.push(args.join(' ')); originalWarn(...args) }
    const dom = new JSDOM('<!doctype html><html><head><meta charset="utf-8"></head><body><div id="root"></div></body></html>',
      { url: 'http://localhost/dockyard', pretendToBeVisual: true, virtualConsole })
    for (const name of ['document', 'HTMLElement', 'SVGElement', 'Element', 'Node', 'FileReader', 'File', 'Blob', 'MutationObserver']) {
      global[name] = name === 'document' ? dom.window.document : dom.window[name]
    }
    global.window = dom.window
    global.getComputedStyle = dom.window.getComputedStyle.bind(dom.window)
    Object.defineProperty(global, 'navigator', { value: dom.window.navigator, configurable: true })
    global.IS_REACT_ACT_ENVIRONMENT = true
    // Load React DOM only now, with the document in place: it decides at load
    // time whether the page supports input events. Loaded earlier it falls back
    // to an old IE path that breaks when a dialog focuses its first field.
    const { createRoot } = require('react-dom/client')

    // The Hermes host's rest(): JSON-encodes an object body, like the app's real host.
    const rest = async (path, init = {}) => {
      const body = init.body === undefined || typeof init.body === 'string' ? init.body : JSON.stringify(init.body)
      const response = await fetch(`${base}${path}`, { method: init.method || 'GET', headers: { 'content-type': 'application/json' }, body })
      const text = await response.text()
      let payload = {}
      try { payload = text ? JSON.parse(text) : {} } catch { payload = { raw: text } }
      if (!response.ok) {
        const error = new Error(typeof payload?.detail === 'string' ? payload.detail : JSON.stringify(payload?.detail ?? payload))
        error.status = response.status
        throw error
      }
      return payload
    }
    const loaded = evaluatePluginBundle(readFileSync(PLUGIN_PATH, 'utf8'), { rest }, { assertImports: false })
    const contributions = []
    loaded.plugin.register({ register: (item) => contributions.push(item), registerMany: (items) => contributions.push(...items), onDispose: () => {}, rest, os: { writeClipboard: async () => true } })
    const route = contributions.find((item) => item.area === 'routes')
    const doc = dom.window.document
    const root = createRoot(doc.getElementById('root'))
    const wait = (ms) => new Promise((r) => setTimeout(r, ms))
    const $ = (selector) => doc.querySelector(selector)
    const waitFor = async (selector, timeoutMs = 8000) => {
      const start = Date.now()
      while (Date.now() - start < timeoutMs) {
        const element = $(selector)
        if (element) return element
        await act(async () => { await wait(50) })
      }
      assert.fail(`timed out waiting for: ${selector}`)
    }
    const waitGone = async (selector, timeoutMs = 8000) => {
      const start = Date.now()
      while (Date.now() - start < timeoutMs) {
        if (!$(selector)) return
        await act(async () => { await wait(50) })
      }
      // Say what is still on screen (a dialog's error, for example).
      assert.fail(`still present after ${timeoutMs}ms: ${selector} — ${($(selector)?.textContent ?? '').replace(/\s+/g, ' ').slice(0, 1200)}`)
    }
    const click = async (selector, ms = 60) => {
      const element = await waitFor(selector)
      await act(async () => { element.click(); await wait(ms) })
    }
    // The test's own backend reads and writes run inside act. After a click
    // the screen is still reloading (PlanScreen and DashboardPage), and on a
    // busy machine that reload finishes while the test waits on its own
    // fetch: outside act, React warns and the warnings check below fails.
    // Seen 06/10: the post-merge gate ran into the 02:00 cron burst, and 2 of
    // 10 runs under CPU load failed this way. The app's own calls keep the
    // plain `rest` (the plugin gets it above).
    const check = async (path, init) => {
      let result
      await act(async () => { result = await rest(path, init) })
      return result
    }
    // React 19 + jsdom: drive a controlled field the way repro-live.test.mjs does.
    const setValue = async (selector, value) => {
      const element = await waitFor(selector)
      const prototype = element instanceof dom.window.HTMLTextAreaElement ? dom.window.HTMLTextAreaElement.prototype
        : element instanceof dom.window.HTMLSelectElement ? dom.window.HTMLSelectElement.prototype : dom.window.HTMLInputElement.prototype
      const setter = Object.getOwnPropertyDescriptor(prototype, 'value').set
      await act(async () => {
        const previous = element.value
        setter.call(element, value)
        element._valueTracker?.setValue(previous)
        element.dispatchEvent(new dom.window.Event('input', { bubbles: true }))
        element.dispatchEvent(new dom.window.Event('change', { bubbles: true }))
        const propsKey = Object.keys(element).find((key) => key.startsWith('__reactProps'))
        element[propsKey]?.onChange?.({ target: element, currentTarget: element, bubbles: true })
        await wait(20)
      })
    }
    const initiatives = async () => (await check(`/projects/${PROJECT}/initiatives`)).initiatives
    const byTitle = async (title) => (await initiatives()).find((row) => row.title === title)
    // Refs, goal ids and milestone ids here carry no quote characters.
    const row = (kind, id) => `[data-plan-row="${kind}"][data-plan-id="${String(id)}"]`
    const text = (selector) => ($(selector)?.textContent ?? '').replace(/\s+/g, ' ')
    const inInbox = async (ref) => (await check('/inbox')).items.some((item) => item.ref === ref)

    await act(async () => { root.render(route.render()); await wait(80) })

    // 1. The project's Vision tab: one layout, no review switcher.
    await click('[data-tab="project"]')
    await click(`[data-choose-project="${PROJECT}"]`)
    const tab = await waitFor('[data-project-view="plan"]')
    assert.equal(tab.textContent.trim(), 'Vision', 'the tab is called Vision')
    await click('[data-project-view="plan"]')
    await waitFor(`[data-plan-screen="${PROJECT}"] .dy-plan-outline`)
    assert.equal(text('.dy-plan-head h2'), 'Vision')
    assert.equal(doc.querySelectorAll('[data-design-review], [data-plan-layout-choice]').length, 0, 'the layout switcher is gone')
    assert.match(text('[data-plan-section="initiative"] .dy-plan-section-note'), /2 of 3 open allowed/)

    // 2. Propose with checks: they land in the validation contract as `tests`.
    await click('[data-plan-menu="new"]')
    await click('[data-plan-menu-item="initiative"]')
    await setValue('[data-plan-dialog="create-initiative"] [data-plan-field="title"]', 'Cache the basket')
    await setValue('[data-plan-dialog="create-initiative"] [data-plan-field="rationale"]', 'Basket loads take 3 seconds')
    await setValue('[data-plan-dialog="create-initiative"] [data-plan-field="checks"]', 'Basket p95 under 300 ms in the load test')
    await click('[data-action="plan-create-initiative"]', 200)
    await waitGone('[data-plan-dialog]')
    const cached = await byTitle('Cache the basket')
    assert.equal(cached?.status, 'pending_approval')
    assert.deepEqual(cached.validation_contract, { tests: 'Basket p95 under 300 ms in the load test' })
    await waitFor(row('initiative', cached.ref))
    assert.match(text('[data-plan-section="initiative"] .dy-plan-section-note'), /3 of 3 open allowed/)
    await click(`${row('initiative', cached.ref)} .dy-plan-row-open`)
    await waitFor(`[data-plan-drawer="initiative"][data-plan-drawer-id="${cached.ref}"]`)
    assert.match(text('[data-plan-drawer="initiative"] .dy-plan-facts'), /Checks\s*Basket p95 under 300 ms in the load test/)
    assert.match(text('[data-plan-drawer="initiative"] .dy-plan-loop li.current'), /Human approval/)
    assert($('[data-plan-drawer="initiative"] [data-action="plan-withdraw"]'), 'a proposal can be withdrawn')
    assert.equal($('[data-plan-drawer="initiative"] [data-action="plan-complete"]'), null, 'a proposal cannot be marked complete')

    // 3. Withdraw "Pending idea" from its row menu, with a reason.
    const pending = await byTitle('Pending idea')
    assert.equal(await inInbox(pending.ref), true, 'it waits in the Approval Inbox first')
    await click(`${row('initiative', pending.ref)} [data-plan-menu="row-initiative"]`)
    await click('[data-plan-menu-item="withdraw"]')
    await waitFor('[data-plan-dialog="withdraw"]')
    assert.match(text('[data-plan-dialog="withdraw"]'), /frees its open slot/)
    await setValue('[data-plan-dialog="withdraw"] [data-plan-field="reason"]', 'Covered by the basket work')
    await click('[data-action="plan-withdraw-confirm"]', 200)
    await waitGone('[data-plan-dialog]')
    assert.equal((await byTitle('Pending idea')).status, 'cancelled')
    await waitGone(row('initiative', pending.ref))
    assert.match(text('[data-plan-section="initiative"] .dy-plan-section-note'), /2 of 3 open allowed/, 'the slot is free again')
    assert.equal(await inInbox(pending.ref), false, 'it left the Approval Inbox')

    // 4. Show finished and archived: it is there, as Withdrawn, stopped at approval.
    const tucked = await waitFor('[data-plan-show-archived]')
    assert.match(tucked.parentElement.textContent, /Show finished and archived \(1\)/)
    await click('[data-plan-show-archived]')
    await waitFor(row('initiative', pending.ref))
    assert.match(text(`${row('initiative', pending.ref)} .dy-plan-row-status`), /Withdrawn/)
    await click(`${row('initiative', pending.ref)} .dy-plan-row-open`)
    await waitFor(`[data-plan-drawer-id="${pending.ref}"]`)
    assert.match(text('[data-plan-drawer="initiative"] .dy-plan-loop li.stopped'), /Human approval\s*Withdrawn before approval\./)
    assert.equal(doc.querySelectorAll('[data-plan-drawer="initiative"] [data-action="plan-withdraw"], [data-plan-drawer="initiative"] [data-action="plan-complete"], [data-plan-drawer="initiative"] [data-action="plan-link-milestone"]').length, 0,
      'nothing more can be done to a withdrawn initiative')

    // 5. Mark "Running change" complete from its drawer.
    const running = await byTitle('Running change')
    assert.equal(running.status, 'executing')
    await click(`${row('initiative', running.ref)} .dy-plan-row-open`)
    await waitFor(`[data-plan-drawer-id="${running.ref}"]`)
    assert.equal($('[data-plan-drawer="initiative"] [data-action="plan-withdraw"]'), null, 'approved work cannot be withdrawn')
    await click('[data-plan-drawer="initiative"] [data-action="plan-complete"]')
    await waitFor('[data-plan-dialog="complete"]')
    assert.match(text('[data-plan-dialog="complete"]'), /Its own board tasks that are still open are marked done\./)
    await click('[data-action="plan-complete-confirm"]', 300)
    await waitGone('[data-plan-dialog]')
    assert.equal((await byTitle('Running change')).status, 'completed')
    await waitFor(`${row('initiative', running.ref)} .dy-plan-row-status`)
    // The screen reloads after the dialog closes. On a busy machine the row
    // can still show the old status for a moment, so wait for the new one; a
    // single read failed once at load average ~30 (07/10/2026).
    const runningStatus = `${row('initiative', running.ref)} .dy-plan-row-status`
    for (const start = Date.now(); !/Complete/.test(text(runningStatus)) && Date.now() - start < 8000;) {
      await act(async () => { await wait(50) })
    }
    assert.match(text(runningStatus), /Complete/)
    assert.match(text('[data-plan-section="initiative"] .dy-plan-section-note'), /1 of 3 open allowed/)

    // 6. Milestone "Beta": no Delete while active; archive, then delete for good.
    const beta = (await check(`/projects/${PROJECT}/milestones`)).milestones.find((m) => m.name === 'Beta')
    await click(`${row('milestone', beta.id)} [data-plan-menu="row-milestone"]`)
    assert.equal($('[data-plan-menu-item="delete"]'), null, 'an active milestone offers no delete')
    await click('[data-plan-menu-item="archive"]')
    await click('[data-destructive-confirm] [data-action="confirm-destructive-action"]', 200)
    await waitGone('[data-destructive-confirm]')
    await click(`${row('milestone', beta.id)} .dy-plan-row-open`)
    await click('[data-plan-drawer="milestone"] [data-action="plan-delete-milestone"]')
    assert.match(text('[data-destructive-confirm]'), /Its work items stay/)
    await click('[data-destructive-confirm] [data-action="confirm-destructive-action"]', 200)
    await waitGone('[data-destructive-confirm]')
    await waitGone(row('milestone', beta.id))
    const milestones = (await check(`/projects/${PROJECT}/milestones?include_archived=true`)).milestones
    assert.equal(milestones.some((m) => m.name === 'Beta'), false, 'the milestone is gone')
    const workRefs = (await check(`/projects/${PROJECT}/work-items`)).work_items.map((w) => w.title)
    assert.ok(workRefs.includes('Write the beta notes'), 'its work item stays')
    await check(`/projects/${PROJECT}/milestones`, { method: 'POST', body: JSON.stringify({ name: 'Beta' }) })

    // 7. Goal "Faster checkout": archive, then delete from the row menu; its objective stays free.
    const goal = (await check(`/projects/${PROJECT}/goals`)).goals.find((g) => g.title === 'Faster checkout')
    await click(`${row('goal', goal.goal_id)} [data-plan-menu="row-goal"]`)
    await click('[data-plan-menu-item="archive"]')
    await click('[data-destructive-confirm] [data-action="confirm-destructive-action"]', 200)
    await waitGone('[data-destructive-confirm]')
    await click(`${row('goal', goal.goal_id)} [data-plan-menu="row-goal"]`)
    await click('[data-plan-menu-item="delete"]')
    assert.match(text('[data-destructive-confirm]'), /Its objectives stay and can join another goal/)
    await click('[data-destructive-confirm] [data-action="confirm-destructive-action"]', 200)
    await waitGone('[data-destructive-confirm]')
    await waitGone(row('goal', goal.goal_id))
    const goals = (await check(`/projects/${PROJECT}/goals?include_archived=true`)).goals
    assert.equal(goals.length, 0, 'the goal is gone')
    const objective = (await check(`/projects/${PROJECT}/objectives`)).objectives.find((o) => o.name === 'Checkout time')
    assert.ok(objective, 'its objective stays')

    // 8. The backend still refuses to delete anything active.
    assert.ok((await check(`/projects/${PROJECT}/milestones`)).milestones.some((m) => m.name === 'Beta'))
    await assert.rejects(check(`/projects/${PROJECT}/milestones/Beta`, { method: 'DELETE' }), (error) => error.status === 409)

    await act(async () => { root.unmount(); await wait(0); dom.window.close() })
  } finally {
    child.kill('SIGTERM')
    console.error = originalError
    console.warn = originalWarn
    if (serverOutput.includes('Traceback')) originalError('server reported an error:\n', serverOutput.slice(-1500))
    if (warnings.length) assert.fail(`unexpected React/jsdom warnings:\n${warnings.join('\n')}`)
  }
})
