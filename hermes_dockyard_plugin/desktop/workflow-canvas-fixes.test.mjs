// Workflow canvas fixes (07/10/2026, HPS-Audit WORKFLOWS-R1.md findings 3, 5, 6, 8, 9, 10, 13, 14).
//   13: the canvas was rebuilt after opening a workflow, on Refresh and after every save, which
//       dropped the open step panel and the zoom (and a drag started in that moment).
//   14: while a run was on screen, the canvas edited the run's copy of the steps, so a drag saved a
//       version without the steps added after that run started; + Step showed nothing.
//    3: no way to delete a step.     5: on a phone the workflow list was hidden.
//    6: Auto layout kept dragged positions.     8: new steps were added unconnected.
//    9: Fit left steps off-screen.     10: a failed save did not say why.
// Real disposable backend (run-browser-suite.mjs). Saved data is read back from the API; what the
// screen shows is measured in the browser.
import { after, before, test } from 'node:test'
import assert from 'node:assert/strict'
import { chromium } from './browser-harness.mjs'
import { pickProject, rememberedProject, restoreRememberedProject } from './test-support/project-scope.mjs'

const BASE = process.env.STEWARD_DESKTOP_URL
const API = process.env.STEWARD_API_URL
const TOKEN = { 'x-hermes-session-token': 'demo-session-token' }
const PROJECT = 'payments-relaunch'

async function api(path, method = 'GET', body) {
  const res = await fetch(`${API}${path}`, { method, headers: { ...TOKEN, 'content-type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) })
  if (!res.ok) throw new Error(`${method} ${path} -> ${res.status}: ${await res.text()}`)
  return res.json()
}
const versionsOf = async (name) => (await api(`/projects/${PROJECT}/workflows`)).workflows.filter((row) => row.name === name)
const latest = async (name) => (await versionsOf(name)).at(-1)
const byId = (version) => Object.fromEntries(version.definition.nodes.map((node) => [node.id, node]))
async function until(check, message) {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    if (await check()) return
    await new Promise((resolve) => setTimeout(resolve, 100))
  }
  assert.fail(message)
}

const canvas = (name) => `[data-workflow-canvas="${name}"]`
const nodeSel = (name, id) => `${canvas(name)} g.dy-wf-node[data-node-id="${id}"]`
const nodeIn = (page, name, id) => page.locator(nodeSel(name, id))
const panel = (page, name) => page.locator(`${canvas(name)} .dy-wf-passport`)
const panelOpen = async (page, name) => (await page.locator(`${canvas(name)} .dy-wf-passport h3`).count()) > 0
const zoomOf = (page, name) => page.evaluate((selector) => {
  const match = (document.querySelector(selector)?.getAttribute('transform') ?? '').match(/scale\(([-\d.e]+)\)/)
  return match ? Number(match[1]) : null
}, `${canvas(name)} g.dy-wf-viewport`)
const zoomIn = async (page, name, times) => {
  for (let i = 0; i < times; i += 1) await page.locator(`${canvas(name)} [data-wf-action="zoom-in"]`).click()
}
// Raw mouse moves do not scroll, and at 1440x900 the canvas starts below the fold: centre the
// step first, or the press lands outside the window and nothing is dragged.
async function drag(page, name, id, dy) {
  await nodeIn(page, name, id).evaluate((element) => element.scrollIntoView({ block: 'center' }))
  const box = await nodeIn(page, name, id).boundingBox()
  await page.mouse.move(box.x + 40, box.y + 20)
  await page.mouse.down()
  await page.mouse.move(box.x + 40, box.y + 20 + dy, { steps: 15 })
  await page.mouse.up()
}

const LINEAR = [
  { id: 'build', title: 'Build it', depends_on: [] },
  { id: 'test', title: 'Test it', depends_on: ['build'] },
  { id: 'ship', title: 'Approve release', depends_on: ['test'], human_gate: true },
]

async function openWorkspace(page) {
  await page.goto(BASE)
  await pickProject(page, PROJECT)
  await page.locator('[data-tab="project"]').click()
  await page.locator('[data-project-view="workflows"]').click()
}

// Waits until no runs request is pending and the first step has stayed the same element for
// 300 ms. Tests of other findings use it so that, on the old code, they measured their own
// finding rather than the rebuild (finding 13), which has tests of its own below.
async function settle(page, ctx) {
  const selector = nodeSel(ctx.name, ctx.first)
  await until(async () => ctx.inFlight.size === 0 && page.evaluate((sel) => {
    const element = document.querySelector(sel)
    const watch = window.__settle ?? (window.__settle = {})
    if (!element || watch.element !== element) { watch.element = element; watch.since = performance.now(); return false }
    return performance.now() - watch.since >= 300
  }, selector), 'the canvas never settled after opening the workflow')
}

async function withWorkflow(slug, nodes, options, body) {
  assert.ok(BASE && API, 'Run via run-browser-suite.mjs')
  const { run = false, nextVersion = null, viewport = { width: 1440, height: 900 }, open = true, wait = true } = options
  const name = `canvas-${slug}-${Date.now()}`
  await api(`/projects/${PROJECT}/workflows`, 'POST', { name, nodes })
  if (run) await api(`/projects/${PROJECT}/workflows/${name}/start`, 'POST', { version: 1, run_key: `${name}-run` })
  if (nextVersion) await api(`/projects/${PROJECT}/workflows/${name}/versions`, 'POST', { nodes: nextVersion })
  const browser = await chromium.launch({ headless: true })
  try {
    const page = await browser.newPage({ viewport })
    page.setDefaultTimeout(8000)
    const ctx = { name, first: nodes[0].id, runsRequests: [], inFlight: new Set() }
    const isRuns = (request) => new URL(request.url()).pathname.endsWith(`/workflows/${name}/runs`)
    page.on('request', (request) => { if (isRuns(request)) { ctx.runsRequests.push(request.url()); ctx.inFlight.add(request) } })
    page.on('requestfinished', (request) => ctx.inFlight.delete(request))
    page.on('requestfailed', (request) => ctx.inFlight.delete(request))
    if (open) {
      await openWorkspace(page)
      await page.locator(`[data-workflow-library-item="${name}"]`).click()
      await nodeIn(page, name, ctx.first).waitFor()
      if (wait) await settle(page, ctx)
    }
    await body(page, name, ctx)
  } finally { await browser.close() }
}

let remembered = null
before(async () => { if (API) remembered = await rememberedProject(API, TOKEN) })
after(async () => { if (API) await restoreRememberedProject(API, TOKEN, remembered) })

// ---- 13: one canvas per open workflow --------------------------------------------------------

test('Workflows: opening a workflow asks for its runs once and draws the canvas once', { timeout: 90000 }, async () => {
  await withWorkflow('open', LINEAR, { run: true, wait: false }, async (page, name, ctx) => {
    // Mark the drawn step: a rebuilt canvas replaces the element and loses the mark.
    await page.evaluate((selector) => { document.querySelector(selector).dataset.probe = 'first' }, nodeSel(name, 'build'))
    await until(async () => ctx.inFlight.size === 0, 'the runs requests never finished')
    await page.waitForTimeout(1200)
    const problems = []
    if (ctx.runsRequests.length !== 1) problems.push(`opening the workflow asked for its runs ${ctx.runsRequests.length} times`)
    const mark = await page.evaluate((selector) => document.querySelector(selector)?.dataset.probe ?? null, nodeSel(name, 'build'))
    if (mark !== 'first') problems.push('the canvas was rebuilt after it was first drawn')
    assert.deepEqual(problems, [])
  })
})

test('Workflows: Refresh and saving keep the open step panel and the zoom', { timeout: 90000 }, async () => {
  await withWorkflow('keep', LINEAR, {}, async (page, name, ctx) => {
    const problems = []
    await nodeIn(page, name, 'test').click()
    await until(() => panelOpen(page, name), 'clicking a step did not open its panel')
    await zoomIn(page, name, 2)
    const zoomed = await zoomOf(page, name)
    assert.ok(zoomed > 1.2, `zoom-in did not zoom (scale ${zoomed})`)
    const requests = ctx.runsRequests.length
    await page.locator('[data-action="inspect-workflow"]').click()
    await until(async () => ctx.runsRequests.length > requests && ctx.inFlight.size === 0, 'Refresh did not ask for the runs')
    await page.waitForTimeout(700)
    if (!await panelOpen(page, name)) problems.push('Refresh closed the step panel')
    if (await zoomOf(page, name) !== zoomed) problems.push(`Refresh reset the zoom from ${zoomed} to ${await zoomOf(page, name)}`)
    // Saving from the panel: re-open the panel and zoom in again if Refresh lost them, so the save
    // is measured on its own.
    if (!await panelOpen(page, name)) await nodeIn(page, name, 'test').click()
    if ((await zoomOf(page, name)) < 1.2) await zoomIn(page, name, 2)
    const zoomBeforeSave = await zoomOf(page, name)
    const before = (await versionsOf(name)).length
    await page.getByLabel('Node title').fill('Test it well')
    await page.getByRole('button', { name: 'Save graph version' }).click()
    await until(async () => (await versionsOf(name)).length > before, 'the step editor did not save')
    await page.waitForTimeout(1000)
    if (!await panelOpen(page, name)) problems.push('saving closed the step panel')
    if (await zoomOf(page, name) !== zoomBeforeSave) problems.push(`saving reset the zoom from ${zoomBeforeSave} to ${await zoomOf(page, name)}`)
    assert.deepEqual(problems, [])
  })
})

// ---- 14: edits always apply to the latest version ---------------------------------------------

test('Workflows: a drag while a run is on screen never drops steps added after that run started', { timeout: 90000 }, async () => {
  const withDocs = [...LINEAR, { id: 'docs', title: 'Write the docs', depends_on: ['test'] }]
  await withWorkflow('runview', LINEAR, { run: true, nextVersion: withDocs }, async (page, name) => {
    const before = (await versionsOf(name)).length
    await drag(page, name, 'build', 140)
    await until(async () => (await versionsOf(name)).length > before, 'the drag on the run view saved nothing')
    const now = await latest(name)
    assert.ok(byId(now).docs, `a drag on the run view saved version ${now.version} without the step added in version 2`)
  })
})

test('Workflows: + Step while a run is on screen shows the new step', { timeout: 90000 }, async () => {
  await withWorkflow('runadd', LINEAR, { run: true }, async (page, name) => {
    const before = (await versionsOf(name)).length
    await page.locator('[data-action="wf-add-step"]').click()
    await until(async () => (await versionsOf(name)).length > before, '+ Step did not save')
    const added = (await latest(name)).definition.nodes.at(-1).id
    await until(async () => (await nodeIn(page, name, added).count()) === 1, `the new step "${added}" was saved but never appeared on the canvas`)
  })
})

// ---- 3: deleting a step ------------------------------------------------------------------------

test('Workflows: a step can be deleted from its panel or with the Delete key, and the steps around it stay linked', { timeout: 90000 }, async () => {
  const nodes = [...LINEAR, { id: 'docs', title: 'Write the docs', depends_on: ['test'] }]
  await withWorkflow('delete', nodes, {}, async (page, name) => {
    await nodeIn(page, name, 'test').click()
    const remove = page.locator(`${canvas(name)} [data-wf-delete-step]`)
    assert.equal(await remove.count(), 1, 'the step panel has no way to delete a step')
    let before = (await versionsOf(name)).length
    await remove.click()
    await page.waitForTimeout(500)
    assert.equal((await versionsOf(name)).length, before, 'one click deleted the step without asking first')
    await page.locator(`${canvas(name)} [data-wf-delete-confirm]`).click()
    await until(async () => (await versionsOf(name)).length > before, 'confirming the delete did not save')
    let saved = byId(await latest(name))
    assert.deepEqual(Object.keys(saved).sort(), ['build', 'docs', 'ship'])
    // The steps that came after "Test it" now come after what came before it.
    assert.deepEqual(saved.ship.depends_on, ['build'])
    assert.deepEqual(saved.docs.depends_on, ['build'])
    await until(async () => (await nodeIn(page, name, 'test').count()) === 0, 'the deleted step is still on the canvas')
    // Keyboard: Delete on a focused step asks first, Enter confirms.
    before = (await versionsOf(name)).length
    await nodeIn(page, name, 'docs').focus()
    await page.keyboard.press('Delete')
    await until(async () => page.evaluate(() => document.activeElement?.hasAttribute('data-wf-delete-confirm') ?? false), 'Delete did not ask to confirm')
    await page.keyboard.press('Enter')
    await until(async () => (await versionsOf(name)).length > before, 'Delete then Enter did not save')
    saved = byId(await latest(name))
    assert.deepEqual(Object.keys(saved).sort(), ['build', 'ship'])
  })
})

test('Workflows: a step that another step\'s condition points to is not deleted, and the panel says why', { timeout: 90000 }, async () => {
  const nodes = [
    { id: 'test', title: 'Test it', depends_on: [] },
    { id: 'fix', title: 'Fix failures', depends_on: ['test'], when: { node: 'test', status: 'blocked' } },
  ]
  await withWorkflow('delete-guard', nodes, {}, async (page, name) => {
    await nodeIn(page, name, 'test').click()
    const remove = page.locator(`${canvas(name)} [data-wf-delete-step]`)
    assert.equal(await remove.count(), 1, 'the step panel has no way to delete a step')
    const before = (await versionsOf(name)).length
    await remove.click()
    await until(async () => /Fix failures/.test(await panel(page, name).innerText()), 'the panel does not say which step depends on it')
    await page.waitForTimeout(800)
    assert.equal((await versionsOf(name)).length, before, 'the step was deleted although a condition points to it')
  })
})

// ---- 5: phones -------------------------------------------------------------------------------

test('Workflows: on a phone the workflow list can still be used to open a workflow', { timeout: 90000 }, async () => {
  await withWorkflow('phone', LINEAR, { open: false, viewport: { width: 390, height: 844 } }, async (page, name) => {
    await openWorkspace(page)
    const item = page.locator(`[data-workflow-library-item="${name}"]`)
    await item.waitFor({ state: 'attached' })
    assert.equal(await item.isVisible(), true, 'at phone width the workflow list is hidden, so no other workflow can be opened')
    await item.click()
    await nodeIn(page, name, 'build').waitFor()
  })
})

// ---- 6: Auto layout ----------------------------------------------------------------------------

test('Workflows: Auto layout clears saved positions and places every step again', { timeout: 90000 }, async () => {
  const pinned = LINEAR.map((node) => node.id === 'build' ? { ...node, canvas_position: { x: 900, y: 520 } } : node)
  await withWorkflow('layout', pinned, {}, async (page, name) => {
    const at = () => page.evaluate((selector) => document.querySelector(selector)?.getAttribute('transform'), nodeSel(name, 'build'))
    assert.equal(await at(), 'translate(900 520)')
    const before = (await versionsOf(name)).length
    await page.locator('[data-action="wf-auto-layout"]').click()
    await until(async () => (await versionsOf(name)).length > before, 'Auto layout did not save')
    const kept = (await latest(name)).definition.nodes.filter((node) => node.canvas_position != null).map((node) => node.id)
    assert.deepEqual(kept, [], `Auto layout kept the saved position of: ${kept.join(', ')}`)
    await until(async () => (await at()) !== 'translate(900 520)', 'the step stayed where it had been dragged')
  })
})

// ---- 8: new steps join the graph ---------------------------------------------------------------

test('Workflows: + Step follows the selected step, or the last step when none is selected', { timeout: 90000 }, async () => {
  await withWorkflow('follow', LINEAR, {}, async (page, name) => {
    await nodeIn(page, name, 'build').click()
    await until(() => panelOpen(page, name), 'clicking a step did not open its panel')
    let before = (await versionsOf(name)).length
    await page.locator('[data-action="wf-add-step"]').click()
    await until(async () => (await versionsOf(name)).length > before, '+ Step did not save')
    const first = (await latest(name)).definition.nodes.at(-1)
    assert.deepEqual(first.depends_on, ['build'], `with "Build it" selected, the new step depends on ${JSON.stringify(first.depends_on)}`)
    await page.keyboard.press('Escape')
    await until(async () => !await panelOpen(page, name), 'Escape did not close the step panel')
    before = (await versionsOf(name)).length
    await page.locator('[data-action="wf-add-step"]').click()
    await until(async () => (await versionsOf(name)).length > before, 'the second + Step did not save')
    const second = (await latest(name)).definition.nodes.at(-1)
    assert.deepEqual(second.depends_on, [first.id], `with nothing selected, the new step depends on ${JSON.stringify(second.depends_on)}, not on the last step "${first.id}"`)
  })
})

// ---- 9: Fit ------------------------------------------------------------------------------------

// A short workflow is smaller than the canvas, so the canvas already scales it up; the old Fit
// scaled it up a second time and pushed the last step off the edge (QA B6).
test('Workflows: Fit brings every step into view after zooming in', { timeout: 90000 }, async () => {
  const two = [{ id: 's1', title: 'Step 1', depends_on: [] }, { id: 's2', title: 'Step 2', depends_on: ['s1'] }]
  await withWorkflow('fit', two, {}, async (page, name) => {
    await zoomIn(page, name, 3)
    await page.locator(`${canvas(name)} [data-wf-action="zoom-fit"]`).click()
    await page.waitForTimeout(700)
    const outside = await page.evaluate(({ host, nodes }) => {
      const a = document.querySelector(host).getBoundingClientRect()
      const b = document.querySelector(`${host} svg.dy-wf-svg`).getBoundingClientRect()
      const frame = { left: Math.max(a.left, b.left), top: Math.max(a.top, b.top), right: Math.min(a.right, b.right), bottom: Math.min(a.bottom, b.bottom) }
      return [...document.querySelectorAll(nodes)].filter((g) => {
        const r = g.querySelector('rect.dy-wf-card').getBoundingClientRect()
        return r.left < frame.left - 2 || r.top < frame.top - 2 || r.right > frame.right + 2 || r.bottom > frame.bottom + 2
      }).map((g) => g.dataset.nodeId)
    }, { host: canvas(name), nodes: `${canvas(name)} g.dy-wf-node` })
    assert.deepEqual(outside, [], `after Fit, steps outside the canvas: ${outside.join(', ')}`)
  })
})

// ---- 10: failed saves say why --------------------------------------------------------------------

test('Workflows: a failed save says why in the step panel', { timeout: 90000 }, async () => {
  await withWorkflow('error', LINEAR, {}, async (page, name) => {
    await nodeIn(page, name, 'test').click()
    await page.getByLabel('Dependencies').fill('build, no-such-step')
    const before = (await versionsOf(name)).length
    await page.getByRole('button', { name: 'Save graph version' }).click()
    await until(async () => /fail|couldn/i.test(await panel(page, name).innerText()), 'the save never reported a result')
    const text = (await panel(page, name).innerText()).replace(/\s+/g, ' ')
    const elsewhere = /reference existing nodes/i.test(await page.locator('body').innerText())
    assert.match(text, /reference existing nodes/i, `the step panel does not say why the save failed: "...${text.slice(-140)}" (reason shown elsewhere on the page: ${elsewhere})`)
    assert.equal((await versionsOf(name)).length, before)
  })
})
