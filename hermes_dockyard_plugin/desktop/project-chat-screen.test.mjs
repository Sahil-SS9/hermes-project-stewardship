// Chat with a project's bots (checks round 1; Sahil 08/10 pick 1a = A) end to
// end through the REAL plugin bundle and REAL backend (disposable data). The
// Desktop host is the harness's fake (browser-harness.mjs): it records every
// newChat call and serves the bot routes a test gives it. Pinned:
//   - the header strip's Chat menu lists the project's team, lead first and
//     marked "(lead)";
//   - picking a bot records a chat link with the backend (POST chat-links,
//     200) and then opens a chat with that bot on its route; with no route the
//     chat opens by profile name;
//   - one toast says what happened; nothing scrolls sideways at phone width.
// The suite shares one backend: nothing here hard-codes a count.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { pickProject, rememberedProject, restoreRememberedProject } from './test-support/project-scope.mjs'
import { chatTargets } from './src/project/chat.js'

const require = createRequire(fileURLToPath(new URL('../dashboard/package.json', import.meta.url)))
const { chromium } = require('playwright')
const BASE = process.env.STEWARD_DESKTOP_URL || 'http://127.0.0.1:19500/desktop'
const API = process.env.STEWARD_API_URL || 'http://127.0.0.1:19500/api/plugins/hermes-dockyard'
const HEADERS = { 'x-hermes-session-token': 'demo-session-token' }
const MARKER = { timeout: 20000 }

async function get(path) {
  const response = await fetch(`${API}${path}`, { headers: HEADERS })
  if (!response.ok) throw new Error(`GET ${path} -> ${response.status}`)
  return response.json()
}

// An enabled project whose team has a lead and at least one other bot.
async function projectWithTeam() {
  const dashboard = await get('/dashboard')
  for (const id of (dashboard.projects ?? []).filter((entry) => entry.enabled !== false).map((entry) => entry.id).sort()) {
    const members = (await get(`/projects/${encodeURIComponent(id)}/members`)).members ?? []
    const settings = await get(`/projects/${encodeURIComponent(id)}/settings`)
    const targets = chatTargets(members, settings?.owner?.lead_profile)
    if (targets.length >= 2 && targets[0].role === 'lead') return { id, targets }
  }
  throw new Error('no enabled project with a lead and another bot in the seeded data')
}

async function withPage(viewport, init, run) {
  const remembered = await rememberedProject(API, HEADERS)
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport })
  if (init) await page.addInitScript(init.script, init.arg)
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

async function openProject(page, projectId) {
  await page.goto(BASE)
  await pickProject(page, projectId)
  await page.locator('[data-tab="project"]').click()
  await page.locator(`[data-project-strip="${projectId}"] [data-strip-chat]`).waitFor(MARKER)
}

const routesFor = (targets) => targets.map(({ profile }) => ({ connectionId: 'local', mode: 'local', profile, targetProfile: profile }))
const giveRoutes = (routes) => ({
  script: (list) => { window.__hostActiveConnectionId = 'local'; window.__hostProfileRoutes = list },
  arg: routes,
})

test('Chat: the team is listed lead first; picking a bot links the chat and opens it on its route', { timeout: 120000 }, async () => {
  const { id, targets } = await projectWithTeam()
  const routes = routesFor(targets)
  await withPage({ width: 1280, height: 900 }, giveRoutes(routes), async (page) => {
    await openProject(page, id)
    await page.locator('[data-plan-menu="project-chat"]').click()
    const items = page.locator('[data-plan-menu-item]')
    await items.first().waitFor(MARKER)
    assert.deepEqual(await items.evaluateAll((els) => els.map((el) => el.getAttribute('data-plan-menu-item'))),
      targets.map((target) => target.profile), 'the team, lead first')
    assert.equal(await items.first().innerText(), `${targets[0].profile} (lead)`)

    const other = targets[1].profile
    const linked = page.waitForResponse((response) => response.url().endsWith(`/projects/${encodeURIComponent(id)}/chat-links`)
      && response.request().method() === 'POST')
    await page.locator(`[data-plan-menu-item="${other}"]`).click()
    const response = await linked
    assert.equal(response.status(), 200, 'the backend recorded the link')
    assert.deepEqual(JSON.parse(response.request().postData()), { profile: other })
    await page.waitForFunction(() => (window.__hostNewChatCalls ?? []).length === 1)
    assert.deepEqual(await page.evaluate(() => window.__hostNewChatCalls),
      [{ target: routes.find((route) => route.profile === other), options: null }], 'one chat, on the bot\'s route')
    await page.locator('.dockyard-toast', { hasText: `Chat with ${other} opened.` }).waitFor(MARKER)
    assert.equal(await page.locator('.dockyard-toast').count(), 1, 'one toast says what happened')
  })
})

test('Chat: with no route the chat opens by profile name; at phone width nothing scrolls sideways', { timeout: 120000 }, async () => {
  const { id, targets } = await projectWithTeam()
  await withPage({ width: 390, height: 844 }, null, async (page) => {
    await openProject(page, id)
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth), false, 'no sideways scroll')
    await page.locator('[data-plan-menu="project-chat"]').click()
    await page.locator(`[data-plan-menu-item="${targets[0].profile}"]`).click()
    await page.waitForFunction(() => (window.__hostNewChatCalls ?? []).length === 1)
    assert.deepEqual(await page.evaluate(() => window.__hostNewChatCalls), [{ target: targets[0].profile, options: null }])
  })
})
