// Workflows design round (07/10/2026), review build behind ?review=1 (HPS-Audit
// WORKFLOWS-SPEC-R1.md, order of work item 3). Two options differ only in the new parts:
//   A "Start dialog": one New workflow button, a dialog with the four ways in; the AI is a
//     step in that dialog.
//   B "Build on the canvas": New workflow opens an unsaved canvas offering the four ways in;
//     the AI is a side panel that explains while it draws, and also changes an open workflow.
//   Loops show in the step panel (A's default) or as a frame around the repeating step (B's).
// Real disposable backend (run-browser-suite.mjs): every save is read back from the API, and
// every editor save is a round trip (a workflow with every optional field set; untouched fields
// must come back unchanged). Preview settings and the practice AI are in-memory stand-ins.
import { after, before, test } from 'node:test'
import assert from 'node:assert/strict'
import { chromium } from './browser-harness.mjs'
import { pickProject, rememberedProject, restoreRememberedProject } from './test-support/project-scope.mjs'
import { seedWorkflowDesign } from './test-support/workflow-design-seed.mjs'

const BASE = process.env.STEWARD_DESKTOP_URL
const API = process.env.STEWARD_API_URL
const TOKEN = { 'x-hermes-session-token': 'demo-session-token' }
const PROJECT = 'atlas-mobile'
const T = { timeout: 8000 }

async function api(path, method = 'GET', body) {
  const res = await fetch(`${API}${path}`, { method, headers: { ...TOKEN, 'content-type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) })
  if (!res.ok) throw new Error(`${method} ${path} -> ${res.status}: ${await res.text()}`)
  return res.json()
}
const versionsOf = async (name) => (await api(`/projects/${PROJECT}/workflows`)).workflows.filter((row) => row.name === name)
const latest = async (name) => (await versionsOf(name)).at(-1)
const byId = (version) => Object.fromEntries(version.definition.nodes.map((node) => [node.id, node]))
const unique = (slug) => `wfd-${slug}-${Date.now().toString(36)}`
async function until(check, message) {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    if (await check()) return
    await new Promise((resolve) => setTimeout(resolve, 100))
  }
  assert.fail(message)
}

// Every optional field set, so a save that drops one is caught.
const FULL = () => [
  { id: 'reproduce', title: 'Reproduce the bug', depends_on: [], phase_team: 'worker', body: 'Write a failing test.' },
  { id: 'fix', title: 'Fix the code', depends_on: ['reproduce'], phase_team: 'worker', body: 'Make the new test pass.', loop: { max_iterations: 5, until: { status: 'done' } } },
  { id: 'review', title: 'Review the change', depends_on: ['fix'], human_gate: true, kind: 'gate' },
  { id: 'stuck', title: 'Tell me it is stuck', depends_on: ['fix'], body: 'Say what was tried.', when: { node: 'fix', status: 'blocked' } },
  { id: 'merge', title: 'Merge', depends_on: ['review'], phase_team: 'fixture-lead' },
]
const canvas = (name) => `[data-workflow-canvas="${name}"]`
const nodesIn = (page, name) => page.locator(`${canvas(name)} g.dy-wf-node`)
const nodeIn = (page, name, id) => page.locator(`${canvas(name)} g.dy-wf-node[data-node-id="${id}"]`)
const panelSave = (page, name) => page.locator(`${canvas(name)} .dy-wf-edit-actions button.primary`)
const noteOf = (page, name, id) => nodeIn(page, name, id).locator('.dy-wf-sub').textContent()
const storage = (page) => page.evaluate(() => [...Object.keys(localStorage), ...Object.keys(sessionStorage)].filter((k) => /wf|review|workflow/i.test(k)))

async function withPage(query, body, { viewport = { width: 1440, height: 900 }, open = null } = {}) {
  assert.ok(BASE && API, 'Run via run-browser-suite.mjs')
  const browser = await chromium.launch({ headless: true })
  try {
    const page = await browser.newPage({ viewport })
    page.setDefaultTimeout(8000)
    const errors = []
    page.on('pageerror', (error) => errors.push(String(error)))
    await page.goto(query ? `${BASE}?${query}` : BASE)
    await pickProject(page, PROJECT)
    await page.locator('[data-tab="project"]').click()
    await page.locator('[data-project-view="workflows"]').click()
    await page.locator('[data-executable-workflows]').waitFor()
    if (open) {
      await page.locator(`[data-workflow-library-item="${open}"]`).click()
      await nodesIn(page, open).first().waitFor()
    }
    await body(page)
    assert.deepEqual(errors, [], 'no page errors')
  } finally { await browser.close() }
}
async function full(slug) {
  const name = unique(slug)
  await api(`/projects/${PROJECT}/workflows`, 'POST', { name, nodes: FULL() })
  return name
}

let remembered = null
before(async () => {
  if (!API) return
  remembered = await rememberedProject(API, TOKEN)
  await seedWorkflowDesign(API, TOKEN)
})
after(async () => { if (API) await restoreRememberedProject(API, TOKEN, remembered) })

test('Design review: without ?review=1 the Workflows screen is today\'s, with no review bar', { timeout: 90000 }, async () => {
  const name = await full('today')
  await withPage('', async (page) => {
    assert.equal(await page.locator('[data-wf-review]').count(), 0)
    assert.equal(await page.locator('[data-executable-workflows]').getAttribute('data-wf-design'), null)
    assert.ok(await page.locator('[data-workflow-library-entry]').isVisible(), 'today\'s library entry row')
    assert.ok(await page.locator('[data-workflow-name]').isVisible(), 'today\'s create form')
    assert.equal(await page.locator('.dy-wfd-head, [data-wf-card-note], [data-wf-frame]').count(), 0)
    assert.match(await noteOf(page, name, 'fix'), /bounded loop/i)
  }, { open: name })
  await withPage('review=1&wf=today', async (page) => {
    assert.ok(await page.locator('[data-wf-review]').isVisible(), 'review bar')
    assert.ok(await page.locator('[data-workflow-name]').isVisible(), 'today\'s create form under the review bar')
  }, { open: name })
})

test('Design review A: at 1440x900 the canvas and every step are on the first screen, and cards say what they do', { timeout: 90000 }, async () => {
  const name = await full('fold')
  // The camera eases into place (0.45s transition): measure once it has stopped.
  const measure = async (page) => {
    let last = null
    for (let i = 0; i < 20; i += 1) {
      const now = await measureOnce(page)
      if (last && JSON.stringify(now.bottoms) === JSON.stringify(last.bottoms)) return now
      last = now
      await page.waitForTimeout(250)
    }
    return last
  }
  const measureOnce = (page) => page.evaluate((sel) => {
    const nodes = [...document.querySelectorAll(`${sel} g.dy-wf-node`)].map((g) => g.getBoundingClientRect())
    return { canvasTop: document.querySelector(sel).getBoundingClientRect().top, canvasH: document.querySelector(sel).getBoundingClientRect().height, bottoms: nodes.map((b) => Math.round(b.bottom)), scrollY: Math.round(scrollY), onScreen: nodes.filter((b) => b.top >= 0 && b.bottom <= innerHeight).length, total: nodes.length, toolbar: document.querySelector('.dockyard-wf3-toolbar').getBoundingClientRect().height }
  }, canvas(name))
  let today = null
  await withPage('review=1&wf=today', async (page) => { today = await measure(page) }, { open: name })
  await withPage('review=1&wf=a', async (page) => {
    const a = await measure(page)
    assert.ok(today.onScreen < today.total, `today hides steps below the window (${today.onScreen}/${today.total})`)
    assert.equal(a.onScreen, a.total, `every step on the first screen (${a.onScreen}/${a.total}): ${JSON.stringify(a)}`)
    assert.ok(a.canvasTop < today.canvasTop - 100, `canvas moved up (${today.canvasTop} -> ${a.canvasTop})`)
    assert.ok(a.toolbar < 60, `toolbar is one row (${a.toolbar}px)`)
    assert.equal(await noteOf(page, name, 'fix'), '↻ Repeats · up to 5')
    assert.equal(await noteOf(page, name, 'review'), 'Sign-off')
    assert.equal(await noteOf(page, name, 'stuck'), 'If fix gets stuck')
    // Notes are plain words in sentence case (the canvas stylesheet is generated: a stale copy
    // left them upper-case and dim).
    assert.equal(await nodeIn(page, name, 'fix').locator('.dy-wf-sub').evaluate((t) => getComputedStyle(t).textTransform), 'none')
    assert.equal(await page.locator(`${canvas(name)} [data-wf-frame]`).count(), 0, 'no frames when loops are in the panel')
  }, { open: name })
})

test('Design review A: the start dialog offers four ways in; Start blank says what is missing and creates one step', { timeout: 90000 }, async () => {
  const taken = await full('taken')
  const name = unique('blank')
  await withPage('review=1&wf=a', async (page) => {
    const before = (await api(`/projects/${PROJECT}/workflows`)).workflows.length
    await page.locator('[data-action="wfd-new-workflow"]').click()
    assert.deepEqual(await page.locator('[data-wfd-new-dialog="choose"] [data-wfd-way]').evaluateAll((els) => els.map((e) => e.dataset.wfdWay)), ['blank', 'template', 'import', 'ai'])
    await page.locator('[data-wfd-way="blank"]').click()
    await page.locator('[data-action="wfd-create"]').click()
    assert.equal(await page.locator('[data-wfd-name-error]').textContent(), 'Give the workflow a name.')
    assert.equal(await page.locator('[data-wfd-name]').getAttribute('aria-invalid'), 'true')
    await page.locator('[data-wfd-name]').fill(taken)
    await page.locator('[data-action="wfd-create"]').click()
    assert.match(await page.locator('[data-wfd-name-error]').textContent(), /already exists/)
    await page.locator('[data-wfd-first-step]').fill('')
    await page.locator('[data-wfd-name]').fill(name)
    await page.locator('[data-action="wfd-create"]').click()
    assert.equal(await page.locator('[data-wfd-step-error]').textContent(), 'Name the first step.')
    assert.equal((await api(`/projects/${PROJECT}/workflows`)).workflows.length, before, 'nothing saved while the dialog shows errors')
    await page.locator('[data-wfd-first-step]').fill('Plan the launch')
    await page.locator('[data-action="wfd-create"]').click()
    await page.locator('[data-wfd-new-dialog]').waitFor({ state: 'detached' })
    await nodesIn(page, name).first().waitFor()
    const saved = await latest(name)
    assert.deepEqual(saved.definition.nodes.map((n) => [n.id, n.title, n.depends_on]), [['step-1', 'Plan the launch', []]])
  })
})

test('Design review A: a template, a Dockyard import and an n8n import each create the workflow they showed', { timeout: 120000 }, async () => {
  const fromTemplate = unique('tpl')
  const fromDockyard = unique('dock')
  const fromN8n = unique('n8n')
  const exported = { schema: 'stewardship.workflow/v2', name: 'exported', definition: { nodes: FULL() } }
  const n8n = { name: 'Inbox flow', nodes: [{ name: 'Webhook', type: 'n8n-nodes-base.webhook', parameters: {} }, { name: 'Send Email', type: 'n8n-nodes-base.emailSend', parameters: {} }], connections: { Webhook: { main: [[{ node: 'Send Email', type: 'main', index: 0 }]] } } }
  await withPage('review=1&wf=a', async (page) => {
    const create = async (way, name, prepare) => {
      await page.locator('[data-action="wfd-new-workflow"]').click()
      await page.locator(`[data-wfd-way="${way}"]`).click()
      await prepare()
      await page.locator('[data-wfd-name]').fill(name)
      await page.locator('[data-action="wfd-create"]').click()
      await page.locator('[data-wfd-new-dialog]').waitFor({ state: 'detached' })
      await nodesIn(page, name).first().waitFor()
      return byId(await latest(name))
    }
    const tpl = await create('template', fromTemplate, async () => {
      await page.locator('[data-action="wfd-create"]').click()
      assert.equal(await page.locator('[data-wfd-way-error]').textContent(), 'Pick a template first.')
      await page.locator('[data-wfd-template="fix-until-green"]').click()
      assert.match(await page.locator('[data-wfd-name]').inputValue(), /^fix-until-green/)
    })
    assert.deepEqual(Object.keys(tpl), ['reproduce', 'fix', 'review', 'merge'])
    assert.equal(tpl.fix.loop.max_iterations, 5)
    const dock = await create('import', fromDockyard, async () => {
      await page.locator('[data-wfd-import-text]').fill('hello')
      await page.locator('[data-action="wfd-import-check"]').click()
      assert.match(await page.locator('[data-wfd-import-error]').textContent(), /isn't a workflow Dockyard can read/)
      await page.locator('[data-wfd-import-text]').fill(JSON.stringify(exported))
      await page.locator('[data-action="wfd-import-check"]').click()
      assert.match(await page.locator('[data-wfd-import="dockyard"]').textContent(), /5 steps\. It imports exactly/)
    })
    for (const node of FULL()) {
      for (const key of ['title', 'depends_on', 'body', 'phase_team']) assert.deepEqual(dock[node.id][key] ?? null, node[key] ?? null, `${node.id}.${key} imported exactly`)
      assert.deepEqual(dock[node.id].loop ?? null, node.loop ?? null)
      assert.deepEqual(dock[node.id].when ?? null, node.when ?? null)
      assert.equal(Boolean(dock[node.id].human_gate), Boolean(node.human_gate))
    }
    const other = await create('import', fromN8n, async () => {
      await page.locator('[data-wfd-import-text]').fill(JSON.stringify(n8n))
      await page.locator('[data-action="wfd-import-check"]').click()
      const shown = await page.locator('[data-wfd-import="other"]').textContent()
      assert.match(shown, /an n8n workflow/)
      assert.match(shown, /could not carry over/)
      assert.ok(await page.locator('[data-wfd-import="other"] [data-wfd-practice-ai]').isVisible(), 'marked as the practice AI')
    })
    assert.deepEqual(Object.values(other).map((n) => [n.title, n.depends_on]), [['Webhook', []], ['Send Email', ['webhook']]])
  })
})

test('Design review A: the AI way explains its plan, asks questions and saves only on Create workflow', { timeout: 90000 }, async () => {
  const name = unique('ai')
  await withPage('review=1&wf=a', async (page) => {
    const before = (await api(`/projects/${PROJECT}/workflows`)).workflows.length
    await page.locator('[data-action="wfd-new-workflow"]').click()
    await page.locator('[data-wfd-way="ai"]').click()
    assert.ok(await page.locator('[data-wfd-practice-ai]').isVisible(), 'the practice AI is labelled')
    await page.locator('[data-action="wfd-ai-draft"]').click()
    assert.equal(await page.locator('[data-wfd-ai-error]').textContent(), 'Say what the workflow should do first.')
    await page.locator('[data-wfd-ai-example="Fix a bug until the tests pass"]').click()
    await page.locator('[data-action="wfd-ai-draft"]').click()
    await page.locator('[data-wfd-ai-plan]').waitFor()
    assert.equal(await page.locator('[data-wfd-ai-plan] .dy-wfd-ai-explain li').count(), 4)
    assert.equal(await page.locator('[data-wfd-ai-plan] [data-wfd-steps]').getAttribute('data-wfd-steps'), '4')
    await page.locator('[data-wfd-answer="rounds:3"]').click()
    await page.locator('[data-wfd-answer="signoff:false"]').click()
    assert.equal(await page.locator('[data-wfd-ai-plan] [data-wfd-steps]').getAttribute('data-wfd-steps'), '3')
    assert.match(await page.locator('[data-wfd-ai-plan] [data-wfd-steps]').textContent(), /repeats, up to 3 rounds/)
    assert.equal((await api(`/projects/${PROJECT}/workflows`)).workflows.length, before, 'a draft is never saved by itself')
    await page.locator('[data-wfd-name]').fill(name)
    await page.locator('[data-action="wfd-create"]').click()
    await nodesIn(page, name).first().waitFor()
    const saved = byId(await latest(name))
    assert.deepEqual(Object.keys(saved), ['reproduce', 'fix', 'merge'])
    assert.equal(saved.fix.loop.max_iterations, 3)
    assert.deepEqual(saved.merge.depends_on, ['fix'])
    // The AI's check is a preview kept in memory: the step panel shows it.
    await nodeIn(page, name, 'fix').click()
    assert.equal(await page.locator('[data-wfx-check]').inputValue(), 'judge')
  })
})

test('Design review A: the step panel saves who, what and repeat as a version; untouched fields stay; preview fields stay in memory', { timeout: 90000 }, async () => {
  const name = await full('panel')
  await withPage('review=1&wf=a', async (page) => {
    const first = byId(await latest(name))
    await nodeIn(page, name, 'fix').click()
    const heads = await page.locator('.dy-wfx-section h5').evaluateAll((els) => els.map((e) => e.textContent))
    assert.deepEqual(heads, ['Who does it', 'What to do', "How it's checkedPreview", 'Repeat', 'Ask me firstPreview', 'LimitsPreview'])
    assert.equal(await page.locator('[data-wfx-who]').inputValue(), 'worker')
    assert.equal(await page.locator('[data-wfx-body]').inputValue(), 'Make the new test pass.')
    await page.locator('[data-wfx-rounds]').fill('11')
    await panelSave(page, name).click()
    await until(async () => /from 1 to 10/.test(await page.locator('.dy-wf-pp-error').textContent()), 'the rounds error is shown')
    assert.equal((await versionsOf(name)).length, 1, 'nothing saved with bad rounds')
    await page.locator('[data-wfx-rounds]').fill('7')
    await page.locator('[data-wfx-who]').selectOption('reviewer')
    await page.locator('[data-wfx-body]').fill('Make every test pass.')
    await page.locator('[data-wfx-check]').selectOption('judge')
    await page.locator('[data-wfx-done-when]').fill('all tests pass')
    await page.locator('[data-wfx-ask-first]').check()
    await page.locator('[data-wfx-turns]').fill('30')
    await panelSave(page, name).click()
    await until(async () => (await versionsOf(name)).length === 2, 'a second version is saved')
    const saved = byId(await latest(name))
    assert.deepEqual(saved.fix.loop, { max_iterations: 7, until: { status: 'done' } })
    assert.equal(saved.fix.phase_team, 'reviewer')
    assert.equal(saved.fix.body, 'Make every test pass.')
    for (const key of ['title', 'depends_on', 'when', 'human_gate', 'kind']) assert.deepEqual(saved.fix[key], first.fix[key], `fix.${key} untouched`)
    for (const id of ['reproduce', 'review', 'stuck', 'merge']) assert.deepEqual(saved[id], first[id], `${id} untouched`)
    await page.locator(`${canvas(name)} .dy-wf-passport-close`).click()
    await nodeIn(page, name, 'fix').click()
    assert.equal(await page.locator('[data-wfx-check]').inputValue(), 'judge', 'preview check kept in memory')
    assert.equal(await page.locator('[data-wfx-done-when]').inputValue(), 'all tests pass')
    assert.ok(await page.locator('[data-wfx-ask-first]').isChecked())
    assert.equal(await page.locator('[data-wfx-turns]').inputValue(), '30')
    assert.equal(await noteOf(page, name, 'fix'), '↻ Repeats · up to 7')
    assert.deepEqual(await storage(page), [], 'no browser storage')
  }, { open: name })
})

test('Design review B: New workflow opens an unsaved canvas with the four ways; nothing is saved until Save workflow', { timeout: 90000 }, async () => {
  const taken = await full('btaken')
  const name = unique('bblank')
  await withPage('review=1&wf=b', async (page) => {
    const before = (await api(`/projects/${PROJECT}/workflows`)).workflows.length
    await page.locator('[data-action="wfd-new-workflow"]').click()
    assert.deepEqual(await page.locator('[data-wfd-canvas-start="ways"] [data-wfd-way]').evaluateAll((els) => els.map((e) => e.dataset.wfdWay)), ['blank', 'template', 'import', 'ai'])
    assert.ok(await page.locator(`[data-workflow-library-item="${taken}"]`).isDisabled(), 'the library waits while a draft is open')
    await page.locator('[data-wfd-way="blank"]').click()
    await nodesIn(page, 'new').first().waitFor()
    assert.equal(await nodesIn(page, 'new').count(), 1)
    assert.match(await page.locator('[data-wfd-draft-item]').textContent(), /not saved/)
    await page.locator('[data-action="wfd-draft-save"]').click()
    assert.equal(await page.locator('[data-wfd-draft-error]').textContent(), 'Give the workflow a name.')
    await page.locator('[data-wfd-draft-name]').fill(taken)
    await page.locator('[data-action="wfd-draft-save"]').click()
    assert.match(await page.locator('[data-wfd-draft-error]').textContent(), /already exists/)
    assert.equal((await api(`/projects/${PROJECT}/workflows`)).workflows.length, before, 'nothing saved yet')
    await page.locator('[data-wfd-draft-name]').fill(name)
    await page.locator('[data-action="wfd-draft-save"]').click()
    await nodesIn(page, name).first().waitFor()
    assert.deepEqual((await latest(name)).definition.nodes.map((n) => n.title), ['Step 1'])
    assert.equal(await page.locator('[data-wfd-draft-item]').count(), 0)
  })
})

test('Design review B: the AI builder draws on the canvas as it explains, takes follow-ups, undoes, and saves only on Save', { timeout: 90000 }, async () => {
  const name = unique('bai')
  await withPage('review=1&wf=b', async (page) => {
    const before = (await api(`/projects/${PROJECT}/workflows`)).workflows.length
    await page.locator('[data-action="wfd-new-workflow"]').click()
    await page.locator('[data-wfd-way="ai"]').click()
    await page.locator('[data-wfd-ai-panel="new"]').waitFor()
    await page.locator('[data-wfd-ai-example="Fix a bug until the tests pass"]').click()
    await until(async () => (await nodesIn(page, 'new').count()) === 4, 'the AI draws 4 steps on the canvas')
    assert.ok(await page.locator('[data-wfd-ai-plan]').isVisible(), 'the plan is explained beside the canvas')
    const frameLabel = () => page.locator(`${canvas('new')} [data-wf-frame-open="fix"]`).getAttribute('aria-label')
    assert.match(await frameLabel(), /Up to 5 rounds/)
    await page.locator('[data-wfd-ai-input]').fill('repeat up to 3 times')
    await page.locator('[data-action="wfd-ai-send"]').click()
    await until(async () => /Up to 3 rounds/.test(await frameLabel()), 'the follow-up changes the frame')
    await page.locator('[data-action="wfd-ai-undo"]').last().click()
    await until(async () => /Up to 5 rounds/.test(await frameLabel()), 'Undo restores the frame')
    await page.locator('[data-wfd-ai-input]').fill('make it purple')
    await page.locator('[data-wfd-ai-input]').press('Enter')
    await until(async () => /only knows a few requests/.test(await page.locator('[data-wfd-ai-reply]').last().textContent()), 'an unknown request is answered plainly')
    assert.equal(await nodesIn(page, 'new').count(), 4)
    assert.equal((await api(`/projects/${PROJECT}/workflows`)).workflows.length, before, 'nothing saved while drafting')
    assert.match(await page.locator('[data-wfd-draft-name]').inputValue(), /^fix-a-bug/)
    await page.locator('[data-wfd-draft-name]').fill(name)
    await page.locator('[data-action="wfd-draft-save"]').click()
    await nodesIn(page, name).first().waitFor()
    const saved = byId(await latest(name))
    assert.deepEqual(Object.keys(saved), ['reproduce', 'fix', 'check-fix', 'merge'])
    assert.equal(saved.fix.loop.max_iterations, 5)
  })
})

test('Design review B: a frame opens its repeat settings; rounds save as a version and Stop repeating removes the frame', { timeout: 90000 }, async () => {
  const name = await full('frame')
  await withPage('review=1&wf=b', async (page) => {
    const first = byId(await latest(name))
    assert.equal(await noteOf(page, name, 'fix'), '↻ Repeats')
    assert.notEqual(await page.locator(`${canvas(name)} .dy-wf-frame-box`).evaluate((r) => getComputedStyle(r).strokeDasharray), 'none', 'the frame is drawn dashed')
    await page.locator(`${canvas(name)} [data-wf-frame-open="fix"]`).click()
    await page.locator('[data-wfd-repeat="fix"]').waitFor()
    await page.locator('[data-wfd-repeat-rounds]').fill('0')
    await page.locator('[data-action="wfd-repeat-save"]').click()
    assert.match(await page.locator('[data-wfd-repeat] .dy-wfd-error').textContent(), /from 1 to 10/)
    await page.locator('[data-wfd-repeat-rounds]').fill('4')
    await page.locator('[data-wfd-repeat-check]').selectOption('judge')
    await page.locator('[data-action="wfd-repeat-save"]').click()
    await until(async () => (await versionsOf(name)).length === 2, 'the rounds save as a version')
    const saved = byId(await latest(name))
    assert.deepEqual(saved.fix.loop, { max_iterations: 4, until: { status: 'done' } })
    for (const id of ['reproduce', 'review', 'stuck', 'merge']) assert.deepEqual(saved[id], first[id], `${id} untouched`)
    assert.equal(saved.fix.body, first.fix.body)
    await until(async () => /Up to 4 rounds.*AI judge/.test(await page.locator(`${canvas(name)} [data-wf-frame-open="fix"]`).getAttribute('aria-label')), 'the frame shows the new rounds and the preview check')
    await page.locator(`${canvas(name)} [data-wf-frame-open="fix"]`).click()
    await page.locator('[data-action="wfd-repeat-stop"]').click()
    await until(async () => (await versionsOf(name)).length === 3, 'Stop repeating saves a version')
    assert.equal(byId(await latest(name)).fix.loop ?? null, null)
    await until(async () => (await page.locator(`${canvas(name)} [data-wf-frame]`).count()) === 0, 'the frame is gone')
  }, { open: name })
})

test('Design review B: Ask AI changes an open workflow on the canvas; Discard drops it and Save version keeps it', { timeout: 90000 }, async () => {
  const name = await full('ask')
  await withPage('review=1&wf=b', async (page) => {
    const first = byId(await latest(name))
    await page.locator('[data-action="wfd-ask-ai"]').click()
    await page.locator('[data-wfd-ai-panel="edit"]').waitFor()
    await page.locator('[data-wfd-ai-input]').fill('add a sign-off at the end')
    await page.locator('[data-action="wfd-ai-send"]').click()
    await page.locator('[data-wfd-draft-banner]').waitFor()
    await until(async () => (await nodesIn(page, name).count()) === 6, 'the change is drawn')
    assert.equal((await versionsOf(name)).length, 1, 'not saved yet')
    await page.locator('[data-action="wfd-draft-discard"]').click()
    await until(async () => (await nodesIn(page, name).count()) === 5, 'Discard drops it')
    assert.equal(await page.locator('[data-wfd-draft-banner]').count(), 0)
    await page.locator('[data-action="wfd-ask-ai"]').click()
    await page.locator('[data-wfd-ai-input]').fill('add a step to tell the team')
    await page.locator('[data-action="wfd-ai-send"]').click()
    await until(async () => (await nodesIn(page, name).count()) === 6, 'the change is drawn again')
    await page.locator('[data-action="wfd-draft-save"]').click()
    await until(async () => (await versionsOf(name)).length === 2, 'Save version saves it')
    const saved = byId(await latest(name))
    assert.equal(Object.values(saved).find((n) => !first[n.id])?.title, 'Tell the team')
    for (const id of Object.keys(first)) assert.deepEqual(saved[id], first[id], `${id} untouched`)
  }, { open: name })
})

test('Design review: workflow settings (preview) check their fields and are kept for the session', { timeout: 90000 }, async () => {
  const name = await full('settings')
  await withPage('review=1&wf=a', async (page) => {
    await page.locator('[data-action="wfd-settings"]').click()
    await page.locator(`[data-wfd-settings="${name}"]`).waitFor()
    assert.equal(await page.locator('[data-wfd-settings] legend .dy-wfd-preview-tag').count(), 2, 'both settings are marked Preview')
    await page.locator('[data-wfd-trigger="schedule"]').check()
    await page.locator('[data-wfd-time]').fill('25:00')
    await page.locator('[data-action="wfd-settings-save"]').click()
    assert.match(await page.locator('[data-wfd-settings] .dy-wfd-error').textContent(), /24-hour time/)
    await page.locator('[data-wfd-time]').fill('09:30')
    await page.locator('[data-wfd-improve]').check()
    await page.locator('[data-wfd-improve-runs]').fill('0')
    await page.locator('[data-action="wfd-settings-save"]').click()
    assert.match(await page.locator('[data-wfd-settings] .dy-wfd-error').textContent(), /1 to 50/)
    await page.locator('[data-wfd-improve-runs]').fill('3')
    await page.locator('[data-action="wfd-settings-save"]').click()
    await page.locator('[data-wfd-settings]').waitFor({ state: 'detached' })
    await page.locator('[data-action="wfd-settings"]').click()
    assert.ok(await page.locator('[data-wfd-trigger="schedule"]').isChecked())
    assert.equal(await page.locator('[data-wfd-time]').inputValue(), '09:30')
    assert.equal(await page.locator('[data-wfd-improve-runs]').inputValue(), '3')
    assert.equal((await versionsOf(name)).length, 1, 'settings are previews: no version saved')
  }, { open: name })
})

test('Design review bar: switching options and loops changes the URL only, never browser storage', { timeout: 90000 }, async () => {
  const name = await full('switch')
  await withPage('review=1&wf=a', async (page) => {
    await page.locator('[data-review-choice="wf:b"]').click()
    await until(async () => new URL(page.url()).searchParams.get('wf') === 'b', 'URL says option B')
    assert.equal(new URL(page.url()).searchParams.get('wfloops'), 'frame')
    await page.locator(`[data-workflow-library-item="${name}"]`).click()
    await page.locator(`${canvas(name)} [data-wf-frame="fix"]`).waitFor()
    await page.locator('[data-review-choice="wfloops:panel"]').click()
    await until(async () => (await page.locator(`${canvas(name)} [data-wf-frame]`).count()) === 0, 'no frame with loops in the panel')
    assert.equal(new URL(page.url()).searchParams.get('wfloops'), 'panel')
    await until(async () => (await noteOf(page, name, 'fix')) === '↻ Repeats · up to 5', 'the card says the rounds')
    await page.locator('[data-review-choice="wf:today"]').click()
    await until(async () => (await page.locator('[data-executable-workflows]').getAttribute('data-wf-design')) === null, 'back to today')
    assert.ok(await page.locator('[data-workflow-name]').isVisible())
    assert.deepEqual(await storage(page), [], 'no browser storage')
  })
})
