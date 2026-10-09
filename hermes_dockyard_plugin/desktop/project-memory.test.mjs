// Project memory (checks round 1; Sahil 08/10 pick 1b = A) end to end through
// the REAL plugin bundle and REAL backend (disposable data), no mocks:
//   - the Memory tab adds a rule and a fact; they show under Rules and Facts,
//     and "What bots see" shows exactly the backend's text for bots, rules
//     before facts, with a header naming the project;
//   - Edit keeps the old wording as history (History lists both);
//   - Archive hides an entry from the list and from what bots see; Show
//     archived lists it and Restore brings it back as it was;
//   - "From finished work" loads; at phone width nothing scrolls sideways and
//     dark mode recolours the entries.
// The suite shares one backend: entries are found by a marker made per run,
// and nothing here hard-codes a count.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { pickProject, rememberedProject, restoreRememberedProject } from './test-support/project-scope.mjs'

const require = createRequire(fileURLToPath(new URL('../dashboard/package.json', import.meta.url)))
const { chromium } = require('playwright')
const BASE = process.env.STEWARD_DESKTOP_URL || 'http://127.0.0.1:19500/desktop'
const API = process.env.STEWARD_API_URL || 'http://127.0.0.1:19500/api/plugins/hermes-project-stewardship'
const HEADERS = { 'x-hermes-session-token': 'demo-session-token' }
const MARKER = { timeout: 20000 }
const RUN = `m${Date.now().toString(36)}`

async function call(path, method = 'GET', body) {
  const response = await fetch(`${API}${path}`, {
    method, headers: { ...HEADERS, 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  if (!response.ok) throw new Error(`${method} ${path} -> ${response.status}: ${(await response.text()).slice(0, 300)}`)
  return response.json()
}

async function firstProject() {
  const dashboard = await call('/dashboard')
  const id = (dashboard.projects ?? []).filter((entry) => entry.enabled !== false).map((entry) => entry.id).sort()[0]
  assert.ok(id, 'an enabled project')
  return id
}

async function withPage(viewport, run) {
  const remembered = await rememberedProject(API, HEADERS)
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport })
  const errors = []
  page.on('pageerror', (error) => errors.push(String(error)))
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()) })
  try {
    await run(page)
    assert.deepEqual(errors, [], 'no page errors or console errors')
  } finally {
    await browser.close()
    await restoreRememberedProject(API, HEADERS, remembered)
  }
}

async function openMemory(page, projectId) {
  await page.goto(BASE)
  await pickProject(page, projectId)
  await page.locator('[data-tab="project"]').click()
  await page.locator(`[data-project-strip="${projectId}"]`).waitFor()
  await page.locator('[data-project-view="memory"]').click()
  await page.locator(`[data-project-memory="${projectId}"] [data-memory-add]`).waitFor(MARKER)
}

const entryWith = (page, text) => page.locator('[data-memory-entry]', { hasText: text })

async function addEntry(page, kind, text) {
  const form = page.locator('[data-memory-add]')
  await form.locator('[data-memory-kind]').selectOption(kind)
  await form.locator('[data-memory-text]').fill(text)
  await form.locator('[data-action="add-memory-entry"]').click()
  await entryWith(page, text).waitFor(MARKER)
}

const preview = (page) => page.locator('[data-memory-preview]').innerText()

test('Memory: add, edit with history, archive and restore; bots see exactly the backend text', { timeout: 180000 }, async () => {
  const projectId = await firstProject()
  const pid = encodeURIComponent(projectId)
  const rule = `Never push straight to main (${RUN})`
  const fact = `CI takes nine minutes (${RUN})`
  const edited = `CI takes six minutes after caching (${RUN})`
  await withPage({ width: 1280, height: 900 }, async (page) => {
    await openMemory(page, projectId)
    await addEntry(page, 'rule', rule)
    // One toast per change, not the generic "Change saved" as well.
    await page.locator('.dockyard-toast', { hasText: 'Added to the project memory.' }).waitFor(MARKER)
    assert.equal(await page.locator('.dockyard-toast').count(), 1, 'exactly one toast for the first change')
    await addEntry(page, 'fact', fact)
    assert.equal(await page.locator('[data-memory-group="rule"]').locator('[data-memory-entry]', { hasText: rule }).count(), 1, 'the rule is under Rules')
    assert.equal(await page.locator('[data-memory-group="fact"]').locator('[data-memory-entry]', { hasText: fact }).count(), 1, 'the fact is under Facts')

    // "What bots see" is the backend's own text for bots, word for word.
    const backend = await call(`/projects/${pid}/memory`)
    assert.equal(await preview(page), backend.context)
    assert.ok(backend.context.startsWith(`Project Stewardship memory for project ${projectId}`))
    assert.ok(backend.context.indexOf(rule) < backend.context.indexOf(fact), 'rules before facts')

    // Edit keeps history.
    await entryWith(page, fact).locator('[data-action="edit-memory-entry"]').click()
    await page.locator('[data-memory-edit-text]').fill(edited)
    await page.locator('[data-action="save-memory-entry"]').click()
    await entryWith(page, edited).waitFor(MARKER)
    assert.equal(await entryWith(page, fact).count(), 0, 'the old wording left the list')
    assert.match(await entryWith(page, edited).locator('.dy-mem-meta').innerText(), /edited/)
    await entryWith(page, edited).locator('[data-action="memory-history"]').click()
    // The history loads after the click: wait for both versions before reading.
    await entryWith(page, edited).locator('[data-memory-history] li').nth(1).waitFor(MARKER)
    const versions = await entryWith(page, edited).locator('[data-memory-history] li').allInnerTexts()
    assert.equal(versions.length, 2, 'both versions are listed')
    assert.ok(versions[0].includes(fact) && versions[1].includes(edited), 'oldest first')

    // Archive hides it from the list and from bots; Restore brings it back.
    await entryWith(page, rule).locator('[data-action="archive-memory-entry"]').click()
    await page.locator('[data-memory-group="rule"] [data-memory-entry]', { hasText: rule }).waitFor({ state: 'detached', ...MARKER })
    assert.ok(!(await preview(page)).includes(rule), 'bots no longer see it')
    await page.locator('[data-action="toggle-archived-memory"]').click()
    const archived = page.locator('[data-memory-group="archived"] [data-memory-entry]', { hasText: rule })
    await archived.waitFor(MARKER)
    await archived.locator('[data-action="restore-memory-entry"]').click()
    await page.locator('[data-memory-group="rule"] [data-memory-entry]', { hasText: rule }).waitFor(MARKER)
    assert.ok((await preview(page)).includes(rule), 'bots see it again')

    // Starting points from finished work load (their rules are pinned in the API tests).
    await page.locator('[data-memory-suggestions="ready"]').waitFor(MARKER)
  })
})

test('Memory: at phone width nothing scrolls sideways; dark mode recolours the entries', { timeout: 120000 }, async () => {
  const projectId = await firstProject()
  const pid = encodeURIComponent(projectId)
  const text = `Releases happen on Thursdays (${RUN})`
  await call(`/projects/${pid}/memory`, 'POST', { kind: 'decision', text })
  await withPage({ width: 390, height: 844 }, async (page) => {
    await openMemory(page, projectId)
    await entryWith(page, text).waitFor(MARKER)
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth), false, 'no sideways scroll')
    const colours = () => entryWith(page, text).evaluate((el) => ({ bg: getComputedStyle(el).backgroundColor, color: getComputedStyle(el).color }))
    const light = await colours()
    await page.evaluate(() => document.querySelector('.dockyard-root').setAttribute('data-theme', 'dark'))
    const dark = await colours()
    assert.notEqual(dark.bg, light.bg, 'entry background')
    assert.notEqual(dark.color, light.color, 'entry text')
  })
})
