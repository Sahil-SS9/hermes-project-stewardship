// Workflows data-loss regressions (06/10/2026, HPS-Audit WORKFLOWS-R1.md).
//   Bug 1: every canvas save path (+ Step, + Gate, moving a step, linking two
//   steps, the step editor, Auto layout) rebuilt each step from a fixed list
//   of fields, so a single edit wiped a step's loop, its condition and its
//   instructions. Each path must keep every field it does not change.
//   Bug 2: the side form posted a one-step version whenever its name matched
//   an existing workflow, which replaced the whole workflow. It only creates.
// Real disposable backend (run-browser-suite.mjs). The proof is the stored
// version read back from the API, not what the screen shows.
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
async function until(check, message) {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    if (await check()) return
    await new Promise((resolve) => setTimeout(resolve, 100))
  }
  assert.fail(message)
}

// Instructions on three steps, a step that loops, a step that only runs on a
// condition, and a human gate. The canvas manages none of body, loop or when.
const RICH = [
  { id: 'build', title: 'Build it', depends_on: [], body: 'Write the feature from the brief' },
  { id: 'test', title: 'Test it', depends_on: ['build'], body: 'Run the suite and report failures', loop: { max_iterations: 5, until: { status: 'done' } } },
  { id: 'fix', title: 'Fix failures', depends_on: ['test'], body: 'Fix what the tests reported', when: { node: 'test', status: 'blocked' } },
  { id: 'ship', title: 'Approve release', depends_on: ['test'], human_gate: true },
]
const UNMANAGED = { build: ['body'], test: ['body', 'loop'], fix: ['body', 'when'] }
const byId = (version) => Object.fromEntries(version.definition.nodes.map((node) => [node.id, node]))
const nodeIn = (page, name, id) => page.locator(`[data-workflow-canvas="${name}"] g.dy-wf-node[data-node-id="${id}"]`)

async function openWorkflow(page, name) {
  await page.goto(BASE)
  await pickProject(page, PROJECT)
  await page.locator('[data-tab="project"]').click()
  await page.locator('[data-project-view="workflows"]').click()
  await page.locator(`[data-workflow-library-item="${name}"]`).click()
  await nodeIn(page, name, 'build').waitFor()
}

async function withRichWorkflow(slug, run) {
  assert.ok(BASE && API, 'Run via run-browser-suite.mjs')
  const name = `keep-${slug}-${Date.now()}`
  await api(`/projects/${PROJECT}/workflows`, 'POST', { name, nodes: RICH })
  const browser = await chromium.launch({ headless: true })
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
    page.setDefaultTimeout(8000)
    await openWorkflow(page, name)
    await run(page, name)
  } finally { await browser.close() }
}

let remembered = null
before(async () => { if (API) remembered = await rememberedProject(API, TOKEN) })
after(async () => { if (API) await restoreRememberedProject(API, TOKEN, remembered) })

const SAVE_PATHS = [
  { label: 'the + Step button', slug: 'step',
    act: (page) => page.locator('[data-action="wf-add-step"]').click(),
    applied: (nodes) => Boolean(nodes['step-5']) },
  { label: 'the + Gate button', slug: 'gate',
    act: (page) => page.locator('[data-action="wf-add-gate"]').click(),
    applied: (nodes) => nodes['gate-5']?.human_gate === true },
  { label: 'moving a step', slug: 'move',
    act: async (page, name) => {
      const box = await nodeIn(page, name, 'build').boundingBox()
      await page.mouse.move(box.x + 40, box.y + 20)
      await page.mouse.down()
      await page.mouse.move(box.x + 40, box.y + 140, { steps: 15 })
      await page.mouse.up()
    },
    applied: (nodes) => nodes.build.canvas_position != null },
  { label: 'linking two steps', slug: 'link',
    act: async (page, name) => {
      const from = await page.locator(`[data-workflow-canvas="${name}"] [data-connect-from="build"]`).boundingBox()
      const to = await nodeIn(page, name, 'ship').boundingBox()
      await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2)
      await page.mouse.down()
      await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 12 })
      await page.mouse.up()
    },
    applied: (nodes) => nodes.ship.depends_on.includes('build') },
  { label: 'the step editor', slug: 'edit',
    act: async (page, name) => {
      await nodeIn(page, name, 'fix').click()
      await page.getByLabel('Node title').fill('Fix what failed')
      await page.getByRole('button', { name: 'Save graph version' }).click()
    },
    applied: (nodes) => nodes.fix.title === 'Fix what failed' },
  { label: 'the Auto layout button', slug: 'layout',
    act: (page) => page.locator('[data-action="wf-auto-layout"]').click(),
    applied: () => true },
]

for (const path of SAVE_PATHS) {
  test(`Workflows: ${path.label} keeps each step's loop, condition and instructions`, { timeout: 90000 }, async () => {
    await withRichWorkflow(path.slug, async (page, name) => {
      const before = (await versionsOf(name)).length
      await path.act(page, name)
      await until(async () => (await versionsOf(name)).length > before, `${path.label} did not save a new version`)
      const nodes = byId((await versionsOf(name)).at(-1))
      assert.ok(path.applied(nodes), `${path.label} saved a version without its own change`)
      const lost = []
      for (const [id, fields] of Object.entries(UNMANAGED)) {
        const original = RICH.find((node) => node.id === id)
        for (const field of fields) {
          const stored = nodes[id]?.[field] ?? null
          if (JSON.stringify(stored) !== JSON.stringify(original[field])) lost.push(`${id}.${field} is now ${JSON.stringify(stored)}`)
        }
      }
      assert.deepEqual(lost, [], `${path.label} changed fields it does not manage`)
    })
  })
}

test('Workflows: the side form never overwrites an existing workflow, and a new name still creates one', { timeout: 90000 }, async () => {
  await withRichWorkflow('form', async (page, name) => {
    const versionPosts = []
    page.on('request', (request) => {
      if (request.method() === 'POST' && request.url().endsWith(`/workflows/${name}/versions`)) versionPosts.push(request.url())
    })
    const before = (await versionsOf(name)).length
    await page.locator('[data-workflow-name]').fill(name)
    await page.locator('[data-workflow-title]').fill('Another phase')
    const button = page.locator('[data-action="define-workflow"]')
    // Before the fix this button read "Save planning version" here and posted
    // a one-step version over the workflow: click it whenever it is enabled.
    if (await button.isEnabled()) await button.click()
    await page.waitForTimeout(1500)
    const after = await versionsOf(name)
    assert.equal(after.at(-1).definition.nodes.length, RICH.length, `the side form replaced the workflow's ${RICH.length} steps with ${after.at(-1).definition.nodes.length}`)
    assert.deepEqual(versionPosts, [], 'the side form posted a version over an existing workflow')
    assert.equal(after.length, before, 'the side form saved a version over an existing workflow')
    assert.equal(await button.isDisabled(), true, 'an existing name can still be submitted')
    assert.match(await page.locator('[data-workflow-name-taken]').innerText(), /already exists/)
    const fresh = `${name}-new`
    await page.locator('[data-workflow-name]').fill(fresh)
    assert.equal((await button.innerText()).trim(), 'Create workflow')
    await button.click()
    await until(async () => (await versionsOf(fresh)).length === 1, 'a new name did not create a workflow')
    assert.equal((await versionsOf(fresh))[0].definition.nodes[0].title, 'Another phase')
  })
})
