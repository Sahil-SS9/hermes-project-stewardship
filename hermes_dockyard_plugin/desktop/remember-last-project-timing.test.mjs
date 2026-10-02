// Remember the last project: timing rules for the first pick, in jsdom with a
// fake backend whose answers the test releases one by one.
//
// 1. The remembered project is requested ALONGSIDE the first load, not after
//    it. Requesting it only after the first load delayed the first pick by a
//    round trip, and under load the Roadmap browser test read the picker as
//    "Choose project" straight after clicking the Project tab.
// 2. The app's first request is still the dashboard load: repro-live's
//    error-and-retry check fails the first GET and expects the dashboard
//    error state.
// 3. It is read once per app load: a tab change before the first pick reuses
//    the same answer instead of asking again.
// 4. The automatic first pick is never saved as a choice.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { evaluatePlugin } from './test-support/load-plugin.mjs'

const require = createRequire(fileURLToPath(new URL('../dashboard/package.json', import.meta.url)))
const { JSDOM } = require('jsdom')
const React = require('react')
const { act } = React
const { createRoot } = require('react-dom/client')

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const PROJECTS = [
  { id: 'alpha', enabled: true, phase: 'active', health: 'healthy', work: { backlog: 1, active: 0, done: 0, blocked: 0 }, unacked_notifications: 0 },
  { id: 'beta', enabled: true, phase: 'active', health: 'watch', work: { backlog: 1, active: 1, done: 0, blocked: 1 }, unacked_notifications: 2 },
]

function deferred() {
  let resolve
  const promise = new Promise((res) => { resolve = res })
  return { promise, resolve }
}

async function mountApp({ holdDashboard = false } = {}) {
  const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', {
    url: 'http://localhost/dockyard', pretendToBeVisual: true,
  })
  const keys = ['window', 'document', 'HTMLElement', 'Element', 'Node', 'SVGElement', 'MutationObserver', 'getComputedStyle']
  const previous = Object.fromEntries(keys.map((key) => [key, global[key]]))
  global.window = dom.window
  global.document = dom.window.document
  global.HTMLElement = dom.window.HTMLElement
  global.Element = dom.window.Element
  global.Node = dom.window.Node
  global.SVGElement = dom.window.SVGElement
  global.MutationObserver = dom.window.MutationObserver
  global.getComputedStyle = dom.window.getComputedStyle.bind(dom.window)
  global.IS_REACT_ACT_ENVIRONMENT = true

  const calls = []
  const remembered = deferred()
  const firstDashboard = holdDashboard ? deferred() : null
  let dashboardReads = 0
  const dashboard = { projects: PROJECTS, owed_decisions: 0, totals: {} }
  const rest = async (path, init = {}) => {
    const method = init.method || 'GET'
    calls.push({ method, path, body: init.body })
    if (path === '/settings/last-project') {
      return method === 'GET' ? remembered.promise : { project_id: init.body?.project_id ?? null }
    }
    if (path === '/dashboard') {
      dashboardReads += 1
      return dashboardReads === 1 && firstDashboard ? firstDashboard.promise : dashboard
    }
    if (path === '/portfolio') return { projects: [], groups: { decisions: [], interventions: [], informational: [] }, mix: {}, attention: {} }
    if (path === '/inbox') return { count: 0, items: [] }
    if (path.startsWith('/notifications')) return { notifications: [] }
    if (path === '/bots') return { bots: [] }
    if (path === '/workload') return { lanes: [] }
    return {} // project screens: empty but valid answers
  }
  const { plugin } = evaluatePlugin('', { navigate() {} }, { assertImports: false })
  const contributions = []
  plugin.register({ rest, os: {}, register: (item) => contributions.push(item), registerMany: (items) => contributions.push(...items), onDispose() {} })
  const route = contributions.find((item) => item.area === 'routes')
  const root = createRoot(dom.window.document.getElementById('root'))
  await act(async () => { root.render(route.render()); await wait(30) })

  const doc = dom.window.document
  return {
    calls,
    remembered,
    firstDashboard,
    picker: () => [...doc.querySelectorAll('button')].find((el) => el.getAttribute('aria-label') === 'Project context')?.textContent,
    click: async (selector) => {
      const element = doc.querySelector(selector)
      assert.ok(element, `missing ${selector}`)
      await act(async () => { element.click(); await wait(30) })
    },
    settle: (ms = 40) => act(async () => { await wait(ms) }),
    dispose: async () => {
      await act(async () => { root.unmount() })
      for (const [key, value] of Object.entries(previous)) global[key] = value
      dom.window.close()
    },
  }
}

const reads = (app) => app.calls.filter((call) => call.method === 'GET' && call.path === '/settings/last-project').length
const saves = (app) => app.calls.filter((call) => call.method === 'PUT').length

test('the remembered project is requested alongside the first load; the dashboard is still the first request', { timeout: 20000 }, async () => {
  const app = await mountApp({ holdDashboard: true })
  try {
    await app.settle()
    assert.equal(app.calls[0]?.path, '/dashboard', 'the first request is the dashboard load')
    assert.equal(reads(app), 1, 'the remembered project is requested while the first load is still pending')
    app.remembered.resolve({ project_id: 'beta' })
    app.firstDashboard.resolve({ projects: PROJECTS, owed_decisions: 0, totals: {} })
    await app.settle(80)
    assert.equal(app.picker(), 'beta', 'the remembered project is the first pick')
    assert.equal(saves(app), 0, 'the automatic first pick is not saved')
  } finally {
    await app.dispose()
  }
})

test('a tab change before the first pick reuses the same answer and still ends with a pick', { timeout: 20000 }, async () => {
  const app = await mountApp()
  try {
    await app.settle()
    assert.equal(app.picker(), 'Choose project', 'no pick until the remembered project is known')
    await app.click('[data-tab="project"]')
    app.remembered.resolve({ project_id: 'alpha' })
    await app.settle(80)
    assert.equal(app.picker(), 'alpha', 'the remembered project is applied after a tab change')
    assert.equal(reads(app), 1, 'the remembered project is read once per app load')
    assert.equal(saves(app), 0, 'the automatic first pick is not saved')
  } finally {
    await app.dispose()
  }
})

test('with nothing remembered, the first pick is the default project and nothing is saved', { timeout: 20000 }, async () => {
  const app = await mountApp()
  try {
    app.remembered.resolve({ project_id: null })
    await app.settle(80)
    assert.notEqual(app.picker(), 'Choose project', 'a project is picked')
    assert.equal(saves(app), 0, 'the automatic first pick is not saved')
  } finally {
    await app.dispose()
  }
})
