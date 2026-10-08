// The Workflows builder (Sahil's pick, 07/10/2026, HPS-Audit DESIGN-ROUND-WF-R1.md):
//   - New workflow opens one dialog. It asks first where the workflow lives (this project, or
//     global: every project can use it; Sahil 08/10/2026), then offers the four ways in (blank,
//     template, import, describe it to the AI); nothing is saved until Create workflow. The
//     Workflows tab's New workflow opens the same dialog.
//   - A step that repeats is drawn inside a dashed frame; the frame holds its repeat settings.
//   - The AI chat is a sidebar at the window's edge, outside the canvas: unpinned it floats over
//     the page and tucks away; pinned it stays and the page narrows, so it covers nothing. It
//     talks first (Sahil, 07/10/2026: suggest, then Apply): a question is answered and a change
//     comes as a suggestion card, refined by talking, that touches the canvas only on Apply, as
//     unsaved changes (Save version / Discard), each undoable. A workflow described to the AI
//     carries that conversation on into the sidebar.
//   - Use a template shows 30 built-in templates on five tabs, plus a Saved tab (tabs, not one
//     long list, Sahil 08/10/2026); a built-in asks who does the work and who checks it
//     (HPS-Audit WORKFLOW-TEMPLATES-RESEARCH.md).
//   - One click selects a step and a drag moves it; only a double-click (or Enter) opens its
//     details, and a note on hover says so.
// Real disposable backend (run-browser-suite.mjs): every save is read back from the API, and
// every editor save is a round trip (a workflow with every optional field set; untouched fields
// must come back unchanged). Preview settings and the practice AI are in-memory stand-ins.
import { after, before, test } from 'node:test'
import assert from 'node:assert/strict'
import { chromium } from './browser-harness.mjs'
import { ALL_PROJECTS, pickProject, rememberedProject, restoreRememberedProject } from './test-support/project-scope.mjs'
import { seedWorkflowDesign } from './test-support/workflow-design-seed.mjs'

const BASE = process.env.STEWARD_DESKTOP_URL
const API = process.env.STEWARD_API_URL
const TOKEN = { 'x-hermes-session-token': 'demo-session-token' }
const PROJECT = 'atlas-mobile'

async function api(path, method = 'GET', body) {
  const res = await fetch(`${API}${path}`, { method, headers: { ...TOKEN, 'content-type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) })
  if (!res.ok) throw new Error(`${method} ${path} -> ${res.status}: ${await res.text()}`)
  return res.json()
}
const versionsOf = async (name) => (await api(`/projects/${PROJECT}/workflows`)).workflows.filter((row) => row.name === name)
const latest = async (name) => (await versionsOf(name)).at(-1)
const byId = (version) => Object.fromEntries(version.definition.nodes.map((node) => [node.id, node]))
const unique = (slug) => `wfb-${slug}-${Date.now().toString(36)}`
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
const panelTitle = (page, name) => page.locator(`${canvas(name)} .dy-wf-passport .dy-wf-pp-head h3`)
const noteOf = (page, name, id) => nodeIn(page, name, id).locator('.dy-wf-sub').textContent()
const storage = (page) => page.evaluate(() => [...Object.keys(localStorage), ...Object.keys(sessionStorage)].filter((k) => /wf|review|workflow|ai/i.test(k)))
const sidebar = (page) => page.locator('[data-wfd-ai-sidebar]')
// New workflow asks where the workflow lives first, then offers the four ways in.
async function newWorkflow(page, scope = 'project') {
  await page.locator('[data-action="wfd-new-workflow"]').click()
  await page.locator('[data-wfd-new-dialog="scope"]').waitFor()
  await page.locator(`[data-wfd-scope="${scope}"]`).click()
  await page.locator('[data-wfd-new-dialog="choose"]').waitFor()
}
const tabsOf = (page) => page.locator('[role="tablist"] [data-wfd-template-tab]').evaluateAll((els) => els.map((el) => [el.getAttribute('data-wfd-template-tab'), el.getAttribute('aria-selected')]))
const builtinsShown = (page) => page.locator('[data-wfd-template-panel] [data-wfd-builtin]').evaluateAll((els) => els.map((e) => e.getAttribute('data-wfd-builtin')))

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

test('Builder: the Workflows screen is the picked design, with no review bar and no old side form; ?review=1 changes nothing', { timeout: 90000 }, async () => {
  const name = await full('pick')
  for (const query of ['', 'review=1&wf=b&wfloops=panel']) {
    await withPage(query, async (page) => {
      assert.equal(await page.locator('[data-wf-review], [data-review-choice]').count(), 0, `${query || 'plain'}: no review bar`)
      assert.equal(await page.locator('[data-workflow-name], [data-workflow-library-entry], [data-action="define-workflow"], [data-workflow-run-key]').count(), 0, 'no old side form')
      assert.ok(await page.locator('[data-wfd-head]').isVisible(), 'the one-row header')
      assert.ok(await page.locator(`${canvas(name)} [data-wf-frame="fix"]`).isVisible(), 'loops shown as a frame')
      await page.locator('[data-action="wfd-new-workflow"]').click()
      await page.locator('[data-wfd-new-dialog="scope"]').waitFor()
      await page.locator('[data-action="wfd-new-cancel"]').click()
    }, { open: name })
  }
})

test('Builder: at 1440x900 every step is on the first screen; cards say what they do; a repeating step sits in a dashed frame', { timeout: 90000 }, async () => {
  const name = await full('fold')
  // The camera eases into place (0.45s transition): measure once it has stopped.
  const measureOnce = (page) => page.evaluate((sel) => {
    const nodes = [...document.querySelectorAll(`${sel} g.dy-wf-node`)].map((g) => g.getBoundingClientRect())
    return { bottoms: nodes.map((b) => Math.round(b.bottom)), onScreen: nodes.filter((b) => b.top >= 0 && b.bottom <= innerHeight).length, total: nodes.length, toolbar: document.querySelector('.dockyard-wf3-toolbar').getBoundingClientRect().height }
  }, canvas(name))
  await withPage('', async (page) => {
    let last = null
    for (let i = 0; i < 20; i += 1) {
      const now = await measureOnce(page)
      if (last && JSON.stringify(now.bottoms) === JSON.stringify(last.bottoms)) break
      last = now
      await page.waitForTimeout(250)
    }
    assert.equal(last.onScreen, last.total, `every step on the first screen (${last.onScreen}/${last.total}): ${JSON.stringify(last)}`)
    assert.ok(last.toolbar < 60, `toolbar is one row (${last.toolbar}px)`)
    assert.equal(await noteOf(page, name, 'fix'), '↻ Repeats')
    assert.equal(await noteOf(page, name, 'review'), 'Sign-off')
    assert.equal(await noteOf(page, name, 'stuck'), 'If fix gets stuck')
    // Notes are plain words in sentence case (the canvas stylesheet is generated: a stale copy
    // left them upper-case and dim).
    assert.equal(await nodeIn(page, name, 'fix').locator('.dy-wf-sub').evaluate((t) => getComputedStyle(t).textTransform), 'none')
    assert.notEqual(await page.locator(`${canvas(name)} .dy-wf-frame-box`).evaluate((r) => getComputedStyle(r).strokeDasharray), 'none', 'the frame is drawn dashed')
    assert.match(await page.locator(`${canvas(name)} [data-wf-frame-open="fix"]`).getAttribute('aria-label'), /Up to 5 rounds, then asks you/)
  }, { open: name })
})

test('Builder: one click selects a step, a drag moves it, and only a double-click opens it; a note on hover says so', { timeout: 90000 }, async () => {
  const name = await full('dbl')
  await withPage('', async (page) => {
    const opened = () => page.locator(`${canvas(name)} .dy-wf-passport .dy-wf-pp-head`).count()
    const hint = page.locator(`${canvas(name)} [data-wf-open-hint]`)
    const fix = nodeIn(page, name, 'fix')
    await fix.hover({ position: { x: 60, y: 20 } })
    await fix.hover({ position: { x: 70, y: 24 } })
    await hint.waitFor({ state: 'visible' })
    assert.equal(await hint.textContent(), 'Double-click to open details')
    const [noteBox, stepBox] = [await hint.boundingBox(), await fix.boundingBox()]
    assert.ok(noteBox.y + noteBox.height <= stepBox.y + 1, `the note sits above the step (${JSON.stringify({ noteBox, stepBox })})`)
    await fix.click()
    assert.match(await fix.getAttribute('class'), /dy-wf-selected/, 'one click selects the step')
    assert.equal(await hint.isVisible(), false, 'pressing the step hides the note')
    await page.waitForTimeout(400)
    assert.equal(await opened(), 0, 'one click does not open its details')
    // A drag moves a step and saves its place; it opens nothing.
    const box = await nodeIn(page, name, 'merge').boundingBox()
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
    await page.mouse.down()
    await page.mouse.move(box.x + box.width / 2 + 70, box.y + box.height / 2 + 40, { steps: 8 })
    await page.mouse.up()
    await until(async () => (await versionsOf(name)).length === 2, 'the move saves a version')
    assert.ok(byId(await latest(name)).merge.canvas_position, 'the new place is saved')
    await page.waitForTimeout(300)
    assert.equal(await opened(), 0, 'a drag does not open the details')
    await nodeIn(page, name, 'fix').dblclick()
    await until(async () => (await panelTitle(page, name).count()) === 1, 'a double-click opens the details')
    assert.equal(await panelTitle(page, name).textContent(), 'Fix the code')
    await nodeIn(page, name, 'fix').hover()
    await page.waitForTimeout(700)
    assert.equal(await hint.isVisible(), false, 'no note over the step that is open')
    // One click on another step closes the panel that belonged to the first.
    await nodeIn(page, name, 'reproduce').click()
    await until(async () => (await opened()) === 0, 'selecting another step closes the panel')
    // Enter opens the selected step from the keyboard.
    await nodeIn(page, name, 'reproduce').focus()
    await page.keyboard.press('Enter')
    await until(async () => (await panelTitle(page, name).textContent().catch(() => '')) === 'Reproduce the bug', 'Enter opens it')
  }, { open: name })
})

test('Builder: New workflow first asks where it lives (this project or global), then offers four ways in; Start blank says what is missing and creates one step', { timeout: 90000 }, async () => {
  const taken = await full('taken')
  const name = unique('blank')
  await withPage('', async (page) => {
    const before = (await api(`/projects/${PROJECT}/workflows`)).workflows.length
    await page.locator('[data-action="wfd-new-workflow"]').click()
    // Step one is where it lives; the four ways in wait until that is picked.
    await page.locator('[data-wfd-new-dialog="scope"]').waitFor()
    assert.deepEqual(await page.locator('[data-wfd-scope]').evaluateAll((els) => els.map((e) => e.dataset.wfdScope)), ['project', 'global'])
    assert.equal(await page.locator('[data-wfd-way]').count(), 0, 'no ways in before the scope is picked')
    assert.match(await page.locator('[data-wfd-scope="project"]').textContent(), /Only this project/)
    assert.match(await page.locator('[data-wfd-scope="global"]').textContent(), /Every project/)
    await page.locator('[data-wfd-scope="project"]').click()
    assert.deepEqual(await page.locator('[data-wfd-new-dialog="choose"] [data-wfd-way]').evaluateAll((els) => els.map((e) => e.dataset.wfdWay)), ['blank', 'template', 'import', 'ai'])
    assert.match(await page.locator('[data-wfd-scope-chosen="project"]').textContent(), /This project/, 'the dialog says where it will be saved')
    // Change goes back to step one.
    await page.locator('[data-action="wfd-scope-change"]').click()
    await page.locator('[data-wfd-new-dialog="scope"]').waitFor()
    await page.locator('[data-wfd-scope="project"]').click()
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
    assert.equal(await sidebar(page).count(), 0, 'a workflow made without the AI opens without the AI sidebar')
  })
})

test('Builder: a template, a Dockyard import and an n8n import each create the workflow they showed', { timeout: 120000 }, async () => {
  const fromTemplate = unique('tpl')
  const fromDockyard = unique('dock')
  const fromN8n = unique('n8n')
  const exported = { schema: 'stewardship.workflow/v2', name: 'exported', definition: { nodes: FULL() } }
  const n8n = { name: 'Inbox flow', nodes: [{ name: 'Webhook', type: 'n8n-nodes-base.webhook', parameters: {} }, { name: 'Send Email', type: 'n8n-nodes-base.emailSend', parameters: {} }], connections: { Webhook: { main: [[{ node: 'Send Email', type: 'main', index: 0 }]] } } }
  await withPage('', async (page) => {
    const create = async (way, name, prepare) => {
      await newWorkflow(page)
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
      await page.locator('[data-wfd-template-tab="library"]').click()
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

test('Builder: the AI way explains, asks and saves only on Create; the AI sidebar then carries the conversation on', { timeout: 90000 }, async () => {
  const name = unique('ai')
  await withPage('', async (page) => {
    const before = (await api(`/projects/${PROJECT}/workflows`)).workflows.length
    await newWorkflow(page)
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
    // The AI's check is a preview kept in memory: the frame shows it.
    await until(async () => /AI judge/.test(await page.locator(`${canvas(name)} [data-wf-frame-open="fix"]`).getAttribute('aria-label')), 'the frame shows the preview check')
    // The conversation carries on beside the canvas.
    await sidebar(page).waitFor()
    assert.equal(await page.locator('[data-wfd-ai-user]').first().textContent(), 'Fix a bug until the tests pass')
    assert.match(await sidebar(page).textContent(), new RegExp(`Created "${name}"`))
    // The plan it was created from is settled: its answers can no longer change anything.
    assert.ok(await sidebar(page).locator('[data-wfd-ai-plan] [data-wfd-answer]').first().isDisabled(), 'the plan it was made from is settled')
    await page.locator('[data-wfd-ai-input]').fill('add a step to tell the team')
    await page.locator('[data-action="wfd-ai-send"]').click()
    await page.locator('[data-wfd-ai-suggestion="pending"]').waitFor()
    assert.equal(await nodesIn(page, name).count(), 3, 'a suggestion changes nothing until Apply')
    await page.locator('[data-wfd-ai-suggestion="pending"] [data-action="wfd-ai-apply"]').click()
    await page.locator('[data-wfd-draft-banner]').waitFor()
    await until(async () => (await nodesIn(page, name).count()) === 4, 'Apply draws the follow-up')
    assert.equal((await versionsOf(name)).length, 1, 'the follow-up is not saved by itself')
    await page.locator('[data-action="wfd-ai-save"]').click()
    await until(async () => (await versionsOf(name)).length === 2, 'Save version keeps it')
    assert.equal(Object.values(byId(await latest(name))).at(-1).title, 'Tell the team')
  })
})

test('Builder: the step panel saves who, what and repeat as a version; untouched fields stay; preview fields stay in memory', { timeout: 90000 }, async () => {
  const name = await full('panel')
  await withPage('', async (page) => {
    const first = byId(await latest(name))
    await nodeIn(page, name, 'fix').dblclick()
    await panelTitle(page, name).waitFor()
    const heads = await page.locator('.dy-wfx-section h5').evaluateAll((els) => els.map((e) => e.textContent))
    assert.deepEqual(heads, ['Who does it', 'What to do', 'Repeat', 'Ask me firstPreview', 'LimitsPreview'])
    assert.equal(await page.locator('[data-wfx-who]').inputValue(), 'worker')
    assert.equal(await page.locator('[data-wfx-body]').inputValue(), 'Make the new test pass.')
    assert.match(await page.locator('.dy-wfx-section').nth(2).textContent(), /Up to 5 rounds, then asks you\. The repeat settings are on this step's frame/)
    await page.locator('[data-wfx-edit-frame="fix"]').click()
    await page.locator('[data-wfd-repeat="fix"]').waitFor()
    await page.locator('[data-action="wfd-repeat-cancel"]').click()
    await page.locator('[data-wfx-who]').selectOption('reviewer')
    await page.locator('[data-wfx-body]').fill('Make every test pass.')
    await page.locator('[data-wfx-ask-first]').check()
    await page.locator('[data-wfx-turns]').fill('30')
    await panelSave(page, name).click()
    await until(async () => (await versionsOf(name)).length === 2, 'a second version is saved')
    const saved = byId(await latest(name))
    assert.deepEqual(saved.fix.loop, first.fix.loop, 'the repeat is untouched')
    assert.equal(saved.fix.phase_team, 'reviewer')
    assert.equal(saved.fix.body, 'Make every test pass.')
    for (const key of ['title', 'depends_on', 'when', 'human_gate', 'kind']) assert.deepEqual(saved.fix[key], first.fix[key], `fix.${key} untouched`)
    for (const id of ['reproduce', 'review', 'stuck', 'merge']) assert.deepEqual(saved[id], first[id], `${id} untouched`)
    // The first step cannot repeat (the engine gates each round on a step before it), and
    // says so instead of offering a repeat that would not save.
    await page.locator(`${canvas(name)} .dy-wf-passport-close`).click()
    await nodeIn(page, name, 'reproduce').dblclick()
    await until(async () => (await panelTitle(page, name).textContent()) === 'Reproduce the bug', 'the first step is open')
    assert.equal(await page.locator('[data-wfx-repeat]').count(), 0)
    assert.match(await page.locator('[data-wfx-no-repeat]').textContent(), /comes first, so it can't repeat/)
    // A later step that does not repeat is made to repeat from its panel (3 rounds, then its frame).
    await page.locator(`${canvas(name)} .dy-wf-passport-close`).click()
    await nodeIn(page, name, 'merge').dblclick()
    await page.locator('[data-wfx-repeat]').check()
    await panelSave(page, name).click()
    await until(async () => (await versionsOf(name)).length === 3, 'the repeat saves a version')
    assert.deepEqual(byId(await latest(name)).merge.loop, { max_iterations: 3, until: { status: 'done' } })
    await page.locator(`${canvas(name)} [data-wf-frame="merge"]`).waitFor()
    await page.locator(`${canvas(name)} .dy-wf-passport-close`).click()
    await nodeIn(page, name, 'fix').dblclick()
    assert.ok(await page.locator('[data-wfx-ask-first]').isChecked(), 'preview field kept in memory')
    assert.equal(await page.locator('[data-wfx-turns]').inputValue(), '30')
    assert.deepEqual(await storage(page), [], 'no browser storage')
  }, { open: name })
})

test('Builder: a step panel save error is red and readable on the dark panel (it was grey, 2.67:1)', { timeout: 90000 }, async () => {
  const name = await full('error')
  await withPage('', async (page) => {
    await nodeIn(page, name, 'merge').dblclick()
    await page.locator(`${canvas(name)} .dy-wf-edit-deps`).fill('nowhere')
    await panelSave(page, name).click()
    const error = page.locator(`${canvas(name)} .dy-wf-pp-error`)
    await until(async () => (await error.isVisible()) && (await error.textContent()).trim().length > 0, 'the save error is shown')
    const seen = await error.evaluate((el) => {
      const parse = (c) => (c.match(/[\d.]+/g) || []).map(Number)
      const lum = ([r, g, b]) => [r, g, b].map((v) => { const s = v / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4 }).reduce((sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i], 0)
      const chain = []
      for (let n = el; n; n = n.parentElement) chain.unshift(getComputedStyle(n).backgroundColor)
      let bg = [255, 255, 255]
      for (const c of chain) {
        const [r, g, b, a = 1] = parse(c)
        if (r === undefined || a === 0) continue
        bg = [r * a + bg[0] * (1 - a), g * a + bg[1] * (1 - a), b * a + bg[2] * (1 - a)]
      }
      const fg = parse(getComputedStyle(el).color)
      const [hi, lo] = [lum(fg), lum(bg)].sort((x, y) => y - x)
      return { color: getComputedStyle(el).color, size: getComputedStyle(el).fontSize, ratio: (hi + 0.05) / (lo + 0.05) }
    })
    assert.equal(seen.color, 'rgb(255, 157, 151)', `the panel's own error colour, not the page's grey: ${JSON.stringify(seen)}`)
    assert.equal(seen.size, '12.5px')
    assert.ok(seen.ratio >= 4.5, `readable on the panel: ${seen.ratio.toFixed(2)}:1`)
    assert.equal((await versionsOf(name)).length, 1, 'nothing saved')
  }, { open: name })
})

test('Builder: a frame opens its repeat settings; rounds save as a version and Stop repeating removes the frame', { timeout: 90000 }, async () => {
  const name = await full('frame')
  await withPage('', async (page) => {
    const first = byId(await latest(name))
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

const say = async (page, text) => {
  await page.locator('[data-wfd-ai-input]').fill(text)
  await page.locator('[data-action="wfd-ai-send"]').click()
}
const card = (page, status) => page.locator(`[data-wfd-ai-suggestion="${status}"]`)

test('Builder: Ask AI talks first: a question gets an answer and changes nothing; a change comes as a suggestion you can refine, and only Apply puts it on the canvas', { timeout: 90000 }, async () => {
  const name = await full('talk')
  await withPage('', async (page) => {
    await page.locator('[data-action="wfd-ask-ai"]').click()
    await sidebar(page).waitFor()
    await say(page, 'what does this workflow do?')
    const answer = page.locator('[data-wfd-ai-reply]').first()
    await answer.waitFor()
    assert.match(await answer.textContent(), /has 5 steps/)
    assert.equal(await answer.locator('[data-wfd-steps]').getAttribute('data-wfd-steps'), '5')
    assert.match(await answer.textContent(), /repeats, up to 5 rounds/)
    assert.equal(await page.locator('[data-wfd-ai-suggestion]').count(), 0, 'a question gets an answer, not a change')
    // A change is suggested, not made.
    await say(page, 'add a sign-off at the end')
    await card(page, 'pending').waitFor()
    assert.deepEqual(await card(page, 'pending').locator('[data-wfd-ai-changes] li').allTextContents(), ['Added a sign-off at the end'])
    assert.equal(await nodesIn(page, name).count(), 5, 'the canvas is unchanged')
    assert.equal(await page.locator('[data-wfd-draft-banner]').count(), 0, 'nothing is unsaved yet')
    // Talking refines it: the newest suggestion carries both changes, the older one says it was replaced.
    await say(page, 'repeat up to 3 times')
    await until(async () => (await card(page, 'replaced').count()) === 1, 'the earlier suggestion is replaced')
    assert.equal(await card(page, 'pending').count(), 1, 'one live suggestion at a time')
    assert.deepEqual(await card(page, 'pending').locator('[data-wfd-ai-changes] li').allTextContents(), ['Added a sign-off at the end', 'Set "Fix the code" to at most 3 rounds'])
    assert.equal(await card(page, 'replaced').locator('[data-action="wfd-ai-apply"]').count(), 0, 'a replaced suggestion cannot be applied')
    assert.equal(await nodesIn(page, name).count(), 5, 'still unchanged')
    // A request it does not understand changes nothing and leaves the suggestion as it is.
    await say(page, 'hello')
    await until(async () => (await page.locator('[data-wfd-ai-reply]').count()) === 4, 'it answers')
    assert.equal(await card(page, 'pending').count(), 1)
    assert.equal((await versionsOf(name)).length, 1)
    // Apply puts it on the canvas as an unsaved change.
    await card(page, 'pending').locator('[data-action="wfd-ai-apply"]').click()
    await page.locator('[data-wfd-draft-banner]').waitFor()
    await until(async () => (await nodesIn(page, name).count()) === 6, 'Apply draws the change')
    assert.equal(await card(page, 'applied').count(), 1)
    assert.equal((await versionsOf(name)).length, 1, 'not saved yet')
    await page.locator('[data-action="wfd-ai-save"]').click()
    await until(async () => (await versionsOf(name)).length === 2, 'Save version keeps it')
    const saved = byId(await latest(name))
    assert.equal(saved.fix.loop.max_iterations, 3)
    assert.ok(Object.values(saved).some((n) => n.human_gate && n.title === 'Your sign-off' && n.depends_on.includes('merge')), 'the sign-off is at the end')
    // The server has the version before the page has handled the reply (it marks the chat after the
    // POST returns), so wait for the note rather than look once.
    await until(async () => (await page.locator('[data-wfd-ai-settled="saved"]').count()) === 1, 'the chat says it was saved')
  }, { open: name })
})

test('Builder: a suggestion can wait (Not yet) and goes stale when the canvas changes; once applied, Undo, Discard and Save version each do what they say', { timeout: 90000 }, async () => {
  const name = await full('wait')
  await withPage('', async (page) => {
    const first = byId(await latest(name))
    await page.locator('[data-action="wfd-ask-ai"]').click()
    await sidebar(page).waitFor()
    // Pinned, so the toolbar stays in reach beside the chat.
    await page.locator('[data-action="wfd-ai-pin"]').click()
    await say(page, 'add a step to tell the team')
    await card(page, 'pending').locator('[data-action="wfd-ai-not-yet"]').click()
    await card(page, 'parked').waitFor()
    assert.equal(await nodesIn(page, name).count(), 5, 'Not yet changes nothing')
    await card(page, 'parked').locator('[data-action="wfd-ai-apply"]').click()
    await until(async () => (await nodesIn(page, name).count()) === 6, 'it can still be applied later')
    assert.ok(await page.locator('[data-workflow-library-item="' + name + '"]').isDisabled(), 'the library waits while the change is unsaved')
    await page.locator('[data-action="wfd-ai-undo"]').click()
    await until(async () => (await nodesIn(page, name).count()) === 5, 'Undo takes it back off the canvas')
    await page.locator('[data-action="wfd-ai-discard"]').click()
    await until(async () => (await page.locator('[data-wfd-draft-banner]').count()) === 0, 'Discard ends the unsaved changes')
    assert.equal(await page.locator('[data-wfd-ai-unsaved]').count(), 0)
    // A suggestion made before the canvas changed is stale: it says so and cannot be applied.
    await say(page, 'add a sign-off at the end')
    await card(page, 'pending').waitFor()
    await page.locator('[data-action="wf-add-step"]').click()
    await until(async () => (await versionsOf(name)).length === 2, 'the toolbar edit saves a version')
    await card(page, 'stale').waitFor()
    assert.equal(await card(page, 'stale').locator('[data-action="wfd-ai-apply"]').count(), 0, 'a stale suggestion cannot be applied')
    assert.match(await card(page, 'stale').textContent(), /canvas has changed/)
    // A fresh one applies and saves from the toolbar.
    await say(page, 'add a step to tell the team')
    await card(page, 'pending').locator('[data-action="wfd-ai-apply"]').click()
    await page.locator('[data-wfd-draft-banner]').waitFor()
    await page.locator('[data-action="wfd-draft-save"]').click()
    await until(async () => (await versionsOf(name)).length === 3, 'Save version saves it')
    const saved = byId(await latest(name))
    assert.ok(Object.values(saved).some((n) => n.title === 'Tell the team'), 'the applied step is saved')
    for (const id of Object.keys(first)) assert.deepEqual(saved[id], first[id], `${id} untouched`)
    // The server has the version before the page has handled the reply (it marks the chat after the
    // POST returns), so wait for the note rather than look once.
    await until(async () => (await page.locator('[data-wfd-ai-settled="saved"]').count()) === 1, 'the chat says it was saved')
    await page.locator('[data-action="wfd-ai-pin"]').click()
  }, { open: name })
})

test('Builder: Use a template shows 30 built-in templates on five tabs plus a Saved tab; a built-in asks who works and who checks, warns when one bot does both, and creates exactly its steps', { timeout: 120000 }, async () => {
  const name = unique('builtin')
  await withPage('', async (page) => {
    await newWorkflow(page)
    await page.locator('[data-wfd-way="template"]').click()
    // Tabs, not one long list (Sahil 08/10/2026): one group at a time, no group heading
    // scrolling past, and the dialog keeps its size from tab to tab.
    assert.deepEqual(await tabsOf(page), [['loops', 'true'], ['build-and-fix', 'false'], ['check-quality', 'false'], ['look-after', 'false'], ['research-writing', 'false'], ['library', 'false']])
    assert.equal(await page.locator('.dy-wfd-tpl h4').count(), 0, 'no group headings in the list')
    const dialogHeight = async () => Math.round((await page.locator('.dy-wfd-new').boundingBox()).height)
    const height = await dialogHeight()
    const seen = new Set()
    for (const [id, count] of [['loops', 7], ['build-and-fix', 6], ['check-quality', 6], ['look-after', 5], ['research-writing', 6]]) {
      const tab = page.locator(`[data-wfd-template-tab="${id}"]`)
      await tab.click()
      assert.equal(await tab.getAttribute('aria-selected'), 'true', `${id} is the open tab`)
      const shown = await builtinsShown(page)
      assert.equal(shown.length, count, `${id} shows its ${count} templates: ${shown}`)
      assert.match(await tab.textContent(), new RegExp(`${count}$`), `${id} shows its count`)
      for (const item of shown) seen.add(item)
      assert.equal(await dialogHeight(), height, `the dialog keeps its size on ${id}`)
      assert.ok(await page.locator('[data-wfd-template-panel]').evaluate((el) => el.scrollHeight <= el.clientHeight + 1), `${id} fits without scrolling at 1440x900`)
    }
    assert.equal(seen.size, 30, 'the five tabs hold the 30 built-ins between them')
    // Arrow keys move between tabs.
    await page.locator('[data-wfd-template-tab="loops"]').click()
    await page.keyboard.press('ArrowRight')
    assert.equal(await page.locator('[data-wfd-template-tab="build-and-fix"]').getAttribute('aria-selected'), 'true', 'ArrowRight opens the next tab')
    assert.equal(await page.evaluate(() => document.activeElement?.getAttribute('data-wfd-template-tab')), 'build-and-fix', 'and moves focus to it')
    await page.locator('[data-wfd-template-tab="library"]').click()
    const saved = await page.locator('[data-wfd-template-panel="library"] [data-wfd-template]').evaluateAll((els) => els.map((e) => e.getAttribute('data-wfd-template')))
    for (const seeded of ['fix-until-green', 'release-check', 'weekly-tidy']) assert.ok(saved.includes(seeded), `saved template ${seeded} is on the Saved tab`)
    assert.equal(await dialogHeight(), height, 'the dialog keeps its size on the Saved tab')
    // Typing searches every tab at once (title, summary and source); the tabs count the matches.
    await page.locator('[data-wfd-template-filter]').fill('bisect')
    assert.deepEqual(await builtinsShown(page), ['find-the-breaking-change'])
    assert.equal(await page.locator('[data-wfd-template-tab][aria-selected="true"]').count(), 0, 'no tab is open while searching')
    assert.match(await page.locator('[data-wfd-template-tab="loops"]').textContent(), /1$/, 'the Loops tab counts its match')
    assert.match(await page.locator('[data-wfd-template-tab="build-and-fix"]').textContent(), /0$/)
    // A tab ends the search and opens that tab.
    await page.locator('[data-wfd-template-tab="build-and-fix"]').click()
    assert.equal(await page.locator('[data-wfd-template-filter]').inputValue(), '')
    assert.equal((await builtinsShown(page)).length, 6)
    await page.locator('[data-wfd-builtin="fix-a-reported-bug"]').click()
    // Picking folds the tabs away, so the steps, the questions and Create fit the window.
    assert.equal(await page.locator('[data-wfd-builtin]').count(), 0, 'the list folds away after a pick')
    assert.equal(await page.locator('[data-wfd-template-tab]').count(), 0, 'and so do the tabs')
    const create = await page.locator('[data-action="wfd-create"]').boundingBox()
    assert.ok(create && create.y + create.height <= 900, `Create is in view after a pick: ${JSON.stringify(create)}`)
    await page.locator('[data-action="wfd-template-change"]').click()
    assert.equal(await page.locator('[data-wfd-template-tab="build-and-fix"]').getAttribute('aria-selected'), 'true', 'All templates opens the tab of the pick')
    assert.equal(await page.locator('[data-wfd-builtin="fix-a-reported-bug"]').getAttribute('aria-checked'), 'true', 'with the pick marked')
    await page.locator('[data-wfd-builtin="fix-a-reported-bug"]').click()
    const detail = page.locator('[data-wfd-template-detail]')
    assert.equal(await detail.locator('[data-wfd-steps]').getAttribute('data-wfd-steps'), '6')
    assert.match(await detail.locator('[data-wfd-based-on]').textContent(), /Agentless/)
    assert.match(await page.locator('[data-wfd-name]').inputValue(), /^fix-a-reported-bug/)
    // Two questions; the same bot for both gets a warning, and it goes when they differ.
    await page.locator('[data-wfd-who-works]').selectOption('worker')
    await page.locator('[data-wfd-who-checks]').selectOption('worker')
    assert.match(await page.locator('[data-wfd-same-bot]').textContent(), /checks its own work/)
    await page.locator('[data-wfd-who-checks]').selectOption('reviewer')
    assert.equal(await page.locator('[data-wfd-same-bot]').count(), 0)
    await page.locator('[data-wfd-name]').fill(name)
    await page.locator('[data-action="wfd-create"]').click()
    await page.locator('[data-wfd-new-dialog]').waitFor({ state: 'detached' })
    await nodesIn(page, name).first().waitFor()
    const made = byId(await latest(name))
    assert.deepEqual(Object.keys(made), ['reproduce', 'locate', 'fix', 'stuck', 'review', 'approve'])
    assert.deepEqual(Object.fromEntries(Object.values(made).map((n) => [n.id, n.phase_team ?? null])), { reproduce: 'worker', locate: 'worker', fix: 'worker', stuck: 'worker', review: 'reviewer', approve: null })
    assert.deepEqual(made.fix.loop, { max_iterations: 5, until: { status: 'done' } })
    assert.deepEqual(made.stuck.when, { node: 'fix', status: 'blocked' })
    assert.ok(made.approve.human_gate)
    assert.match(made.fix.body, /Never edit the new test/)
    // A template with no check step asks only who does the work.
    await newWorkflow(page)
    await page.locator('[data-wfd-way="template"]').click()
    await page.locator('[data-wfd-template-tab="look-after"]').click()
    await page.locator('[data-wfd-builtin="triage-the-backlog"]').click()
    assert.equal(await page.locator('[data-wfd-who-works]').count(), 1)
    assert.equal(await page.locator('[data-wfd-who-checks]').count(), 0)
    await page.locator('[data-action="wfd-new-close"]').click()
  })
})

test('Builder: a global workflow is saved to the library, not to this project, and the Workflows tab shows it; its name is checked against the global ones', { timeout: 90000 }, async () => {
  const name = unique('global')
  await withPage('', async (page) => {
    const projectBefore = (await api(`/projects/${PROJECT}/workflows`)).workflows.length
    await newWorkflow(page, 'global')
    assert.match(await page.locator('[data-wfd-scope-chosen="global"]').textContent(), /Global/)
    await page.locator('[data-wfd-way="blank"]').click()
    // The library adds a version to a global name that exists, so the dialog refuses it.
    await page.locator('[data-wfd-name]').fill('fix-until-green')
    await page.locator('[data-action="wfd-create"]').click()
    assert.match(await page.locator('[data-wfd-name-error]').textContent(), /already exists/)
    await page.locator('[data-wfd-name]').fill(name)
    await page.locator('[data-wfd-first-step]').fill('Plan the launch')
    await page.locator('[data-action="wfd-create"]').click()
    await page.locator('[data-wfd-new-dialog]').waitFor({ state: 'detached' })
    // It lands on the Workflows tab (the library), marked as just made.
    const row = page.locator(`[data-library-row="${name}"][data-library-scope="global"]`)
    await row.waitFor()
    assert.equal(await page.locator('[data-tab="workflows"]').getAttribute('aria-selected'), 'true')
    assert.equal(await row.getAttribute('data-library-just-created'), 'true')
    const globals = (await api('/workflow-library?scope=global')).workflows.filter((w) => w.name === name)
    assert.deepEqual(globals.map((w) => [w.version, w.definition.nodes.map((n) => n.title)]), [[1, ['Plan the launch']]])
    assert.equal((await api(`/projects/${PROJECT}/workflows`)).workflows.length, projectBefore, 'nothing was added to the project')
  })
})

test('Workflows tab: New workflow opens the same dialog (no name-and-first-step form); a project workflow opens on the canvas, a global one stays in the library, and Open builder opens the workflow clicked', { timeout: 150000 }, async () => {
  const other = await full('libopen')
  const fromTemplate = unique('libtpl')
  const blank = unique('libblank')
  const described = unique('libai')
  await withPage('', async (page) => {
    const toLibrary = async () => {
      await page.locator('[data-tab="workflows"]').click()
      await page.locator('[data-workflow-library-screen]').waitFor()
    }
    const openNew = async (scope) => {
      await page.locator('[data-action="library-create"]').click()
      await page.locator('[data-wfd-new-dialog="scope"]').waitFor()
      assert.equal(await page.locator('[data-library-name], [data-library-title], [data-library-create-form]').count(), 0, 'the old form is gone')
      await page.locator(`[data-wfd-scope="${scope}"]`).click()
    }
    await toLibrary()
    // Global, from a template: it stays in the library, marked as just made.
    await openNew('global')
    await page.locator('[data-wfd-way="template"]').click()
    await page.locator('[data-wfd-builtin="reach-a-goal"]').click()
    await page.locator('[data-wfd-name]').fill(fromTemplate)
    await page.locator('[data-action="wfd-create"]').click()
    await page.locator('[data-wfd-new-dialog]').waitFor({ state: 'detached' })
    const row = page.locator(`[data-library-row="${fromTemplate}"][data-library-scope="global"]`)
    await row.waitFor()
    assert.equal(await row.getAttribute('data-library-just-created'), 'true')
    assert.equal(await page.locator('[data-tab="workflows"]').getAttribute('aria-selected'), 'true', 'a global workflow stays in the library')
    const tpl = (await api('/workflow-library?scope=global')).workflows.find((w) => w.name === fromTemplate)
    assert.ok(tpl && tpl.definition.nodes.length > 1, 'saved with the template steps')
    // Project, blank: it opens on the canvas.
    await openNew('project')
    await page.locator('[data-wfd-way="blank"]').click()
    await page.locator('[data-wfd-name]').fill(blank)
    await page.locator('[data-wfd-first-step]').fill('Draft the plan')
    await page.locator('[data-action="wfd-create"]').click()
    await page.locator('[data-wfd-new-dialog]').waitFor({ state: 'detached' })
    await nodesIn(page, blank).first().waitFor()
    assert.equal(await page.locator('[data-workflow-library-item].active').getAttribute('data-workflow-library-item'), blank)
    assert.deepEqual((await latest(blank)).definition.nodes.map((n) => n.title), ['Draft the plan'])
    // Project, described to the AI: the sidebar carries the conversation on.
    await toLibrary()
    await openNew('project')
    await page.locator('[data-wfd-way="ai"]').click()
    await page.locator('[data-wfd-ai-example="Fix a bug until the tests pass"]').click()
    await page.locator('[data-action="wfd-ai-draft"]').click()
    await page.locator('[data-wfd-ai-plan]').waitFor()
    await page.locator('[data-wfd-name]').fill(described)
    await page.locator('[data-action="wfd-create"]').click()
    await nodesIn(page, described).first().waitFor()
    await sidebar(page).waitFor()
    assert.match(await sidebar(page).textContent(), /Fix a bug until the tests pass/, 'the conversation carried on')
    // Open builder opens the workflow clicked, not the first one.
    await toLibrary()
    await page.locator(`[data-library-row="${other}"] [data-action="library-open"]`).click()
    await nodesIn(page, other).first().waitFor()
    assert.equal(await page.locator('[data-workflow-library-item].active').getAttribute('data-workflow-library-item'), other)
    assert.notEqual(await page.locator('[data-workflow-library-item]').first().getAttribute('data-workflow-library-item'), other, 'not the first in the list, so the click decided it')
    // With no project picked there is no "this project": only Global is open.
    await toLibrary()
    await pickProject(page, ALL_PROJECTS)
    await page.locator('[data-action="library-create"]').click()
    await page.locator('[data-wfd-new-dialog="scope"]').waitFor()
    assert.ok(await page.locator('[data-wfd-scope="project"]').isDisabled(), 'This project is off with no project picked')
    assert.match(await page.locator('[data-wfd-scope="project"]').textContent(), /Pick a project in the switcher first/)
    assert.ok(await page.locator('[data-wfd-scope="global"]').isEnabled())
    await page.locator('[data-action="wfd-new-cancel"]').click()
    await pickProject(page, PROJECT)
  })
})

test('Builder: the AI chat is a sidebar outside the canvas; unpinned it floats and tucks away, pinned it stays and the page makes room', { timeout: 90000 }, async () => {
  const name = await full('side')
  await withPage('', async (page) => {
    const askAi = page.locator('[data-action="wfd-ask-ai"]')
    const canvasBox = async () => { const b = await page.locator(canvas(name)).boundingBox(); return { x: b.x, width: b.width, height: b.height } }
    const before = await canvasBox()
    await askAi.click()
    await sidebar(page).waitFor()
    assert.equal(await page.locator(`${canvas(name)} [data-wfd-ai-sidebar], .dockyard-wf3 [data-wfd-ai-sidebar]`).count(), 0, 'not inside the canvas or its row')
    assert.equal(await sidebar(page).getAttribute('data-pinned'), 'false')
    assert.equal(await askAi.getAttribute('aria-expanded'), 'true')
    const viewport = page.viewportSize()
    const side = await sidebar(page).boundingBox()
    assert.ok(Math.abs(side.x + side.width - viewport.width) <= 1 && side.y <= 1 && Math.abs(side.height - viewport.height) <= 1, `full height at the window's right edge: ${JSON.stringify(side)}`)
    assert.ok(side.width <= 361, `slim (${side.width}px)`)
    assert.deepEqual(await canvasBox(), before, 'unpinned, the canvas keeps its size')
    assert.ok(await page.locator('[data-wfd-ai-input]').evaluate((el) => el === document.activeElement), 'the cursor is in the message box')
    await page.locator('[data-wfd-ai-input]').fill('hello')
    await page.locator('[data-action="wfd-ai-send"]').click()
    await page.locator('[data-wfd-ai-reply]').first().waitFor()
    // Unpinned: a press elsewhere tucks it away, and the conversation is kept.
    await page.locator('.dy-wfd-head h2').click()
    await sidebar(page).waitFor({ state: 'detached' })
    await askAi.click()
    assert.equal(await page.locator('[data-wfd-ai-user]').count(), 1, 'the conversation is kept')
    // Escape inside closes it and gives the focus back to Ask AI.
    await page.locator('[data-wfd-ai-input]').press('Escape')
    await sidebar(page).waitFor({ state: 'detached' })
    await until(() => askAi.evaluate((el) => el === document.activeElement), 'the focus is back on Ask AI')
    // Pinned: a press elsewhere keeps it, and the page narrows so nothing is covered.
    await askAi.click()
    await page.locator('[data-action="wfd-ai-pin"]').click()
    assert.equal(await sidebar(page).getAttribute('data-pinned'), 'true')
    assert.equal(await page.locator('[data-action="wfd-ai-pin"]').getAttribute('aria-pressed'), 'true')
    await until(async () => { const c = await canvasBox(); return c.x + c.width <= (await sidebar(page).boundingBox()).x + 1 }, 'the canvas ends where the sidebar starts')
    assert.ok((await canvasBox()).width < before.width - 200, 'pinned, the canvas narrows instead of being covered')
    const covered = await page.evaluate(() => {
      const edge = document.querySelector('[data-wfd-ai-sidebar]').getBoundingClientRect().left
      return [...document.querySelectorAll('.dockyard-wf3-toolbar button, [data-wfd-head] button')].filter((b) => b.checkVisibility() && b.getBoundingClientRect().right > edge + 1).map((b) => b.textContent)
    })
    assert.deepEqual(covered, [], 'no header or toolbar button sits under the sidebar')
    await page.locator('.dy-wfd-head h2').click()
    assert.ok(await sidebar(page).isVisible(), 'pinned: a press elsewhere keeps it open')
    // A step can be dragged with the pinned chat open.
    const box = await nodeIn(page, name, 'merge').boundingBox()
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
    await page.mouse.down()
    await page.mouse.move(box.x + box.width / 2 + 40, box.y + box.height / 2 + 30, { steps: 6 })
    await page.mouse.up()
    await until(async () => (await versionsOf(name)).length === 2, 'the move saves')
    assert.ok(await sidebar(page).isVisible(), 'and the pinned chat stays')
    // Pinned is remembered while Dockyard is open; closing gives the page its width back.
    await page.locator('[data-action="wfd-ai-close"]').click()
    await sidebar(page).waitFor({ state: 'detached' })
    await until(async () => Math.abs((await canvasBox()).width - before.width) <= 1, 'closing gives the page its width back')
    await askAi.click()
    assert.equal(await sidebar(page).getAttribute('data-pinned'), 'true', 'pinned is remembered')
    await page.locator('[data-action="wfd-ai-pin"]').click()
    assert.equal(await sidebar(page).getAttribute('data-pinned'), 'false')
    await until(async () => Math.abs((await canvasBox()).width - before.width) <= 1, 'unpinned, the page has its width back')
    assert.deepEqual(await storage(page), [], 'no browser storage')
  }, { open: name })
})

test('Builder: workflow settings (preview) check their fields and are kept for the session', { timeout: 90000 }, async () => {
  const name = await full('settings')
  await withPage('', async (page) => {
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
