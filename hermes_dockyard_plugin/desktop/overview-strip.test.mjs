// C1 Overview — the project header strip (signed 16/09) end to end through
// the REAL plugin bundle and REAL backend (disposable data), no mocks:
// the banner says what the backend says, the "Needs attention" drawer opens
// and closes by mouse and keyboard with focus back on the banner, Open goes
// to the exact place to act (work item drawer, Approval inbox), the strip is
// on every project tab, dark mode changes its colours (part two of the
// colour test), and at phone width the drawer is a bottom sheet.
// Sahil 06/10 ("full strip + keep all"): the full strip on every tab, and
// below the tabs Overview keeps every card it had, including the two the
// strip repeats. No address flag can change either.
//
// The suite shares one backend, so other files' fixtures add up. Nothing here
// hard-codes a count: expectations are worked out from the live API with the
// same pure model the screen uses (its rules are pinned by
// project-attention.test.mjs), and the projects are found by their facts.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { pickProject, rememberedProject, restoreRememberedProject } from './test-support/project-scope.mjs'
import { projectAttention } from './src/project/attention.js'

const require = createRequire(fileURLToPath(new URL('../dashboard/package.json', import.meta.url)))
const { chromium } = require('playwright')
const BASE = process.env.STEWARD_DESKTOP_URL || 'http://127.0.0.1:19500/desktop'
const API = process.env.STEWARD_API_URL || 'http://127.0.0.1:19500/api/plugins/hermes-dockyard'
const HEADERS = { 'x-hermes-session-token': 'demo-session-token' }

const get = async (path) => {
  const response = await fetch(`${API}${path}`, { headers: HEADERS })
  if (!response.ok) throw new Error(`GET ${path} -> ${response.status}`)
  return response.json()
}

// What the strip should say for one project, from the live API.
async function expected(projectId) {
  const [dashboard, portfolio, milestones] = await Promise.all([
    get('/dashboard'), get('/portfolio'), get(`/projects/${encodeURIComponent(projectId)}/milestones`),
  ])
  const project = (dashboard.projects ?? []).find((entry) => entry.id === projectId)
  assert.ok(project, `${projectId} is on the dashboard`)
  return projectAttention({ project, portfolio, milestones: milestones.milestones ?? [] })
}

async function openProject(page, projectId, query = '') {
  await page.goto(`${BASE}${query}`)
  await pickProject(page, projectId)
  await page.locator('[data-tab="project"]').click()
  await page.locator(`[data-project-strip="${projectId}"]`).waitFor()
}

// The full strip: banner, eyebrow row, mission headline, delivery strip.
async function assertFullStrip(page, where) {
  assert.equal(await page.locator('.dy-ov-strip .dy-ov-banner').count(), 1, `the banner is on ${where}`)
  assert.equal(await page.locator('.dy-ov-strip .dy-ov-eyebrow-row').count(), 1, `the eyebrow row is on ${where}`)
  assert.equal(await page.locator('.dy-ov-strip [data-strip-headline]').count(), 1, `the mission headline is on ${where}`)
  assert.equal(await page.locator('.dy-ov-strip [data-strip-progress] .dy-ov-track').count(), 1, `the delivery strip is on ${where}`)
}

// Below the tabs, Overview keeps the two cards the strip repeats.
async function assertOverviewCardsKept(page, project) {
  const grid = page.locator('.dockyard-project-grid[data-project-visual]')
  assert.equal(await grid.count(), 1, 'Overview keeps its first row of cards (Sahil 06/10: keep all)')
  assert.equal(await grid.locator('.dockyard-project-hero .dockyard-work-visual[role="img"]').count(), 1, 'the mission card keeps its delivery bar')
  assert.equal(await grid.locator('.dockyard-feature-card:not(.dockyard-project-hero) h2').innerText(), `${Number(project.work?.blocked ?? 0)} blocked`, 'the Current signals card keeps the blocked count')
}

const bannerColours = (page) => page.locator('.dy-ov-banner').evaluate((el) => {
  const style = getComputedStyle(el)
  return { bg: style.backgroundColor, color: style.color, border: style.borderTopColor }
})

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

test('Overview strip: banner from the backend, drawer by mouse and keyboard, Open goes to the work item', { timeout: 180000 }, async () => {
  const portfolio = await get('/portfolio')
  const blocked = (portfolio.groups?.interventions ?? []).find((entry) => entry.cause === 'blocked_item')
  assert.ok(blocked, 'the seeded data has a blocked work item (the fixture changed if not)')
  const projectId = blocked.project
  const want = await expected(projectId)
  assert.equal(want.state, 'blocked', 'a project with a blocked item reads Blocked')

  await withPage({ width: 1280, height: 900 }, async (page) => {
    await openProject(page, projectId)
    const banner = page.locator('.dy-ov-banner')
    assert.equal(await banner.getAttribute('data-attention-state'), want.state)
    assert.equal(await banner.getAttribute('data-tone'), 'danger')
    const text = (await banner.innerText()).replace(/\s+/g, ' ')
    assert.ok(text.includes(want.label) && text.includes(want.summary), `banner says "${want.label} — ${want.summary}" (got "${text}")`)
    await assertFullStrip(page, 'Overview')
    assert.equal(await page.locator('.dockyard-project-toolbar select').count(), 0, 'no project picker beside the tabs: the global switcher is the only one')
    const dashboardProject = ((await get('/dashboard')).projects ?? []).find((entry) => entry.id === projectId)
    await assertOverviewCardsKept(page, dashboardProject)

    // Click opens the drawer; it lists exactly the backend's items, in order.
    await banner.click()
    const drawer = page.locator(`[data-attention-drawer="${projectId}"]`)
    await drawer.waitFor()
    const keys = await drawer.locator('[data-attention-item]').evaluateAll((els) => els.map((el) => el.getAttribute('data-attention-item')))
    assert.deepEqual(keys, want.items.map((item) => item.key), 'the drawer lists the backend items, most urgent first')
    assert.equal(await drawer.locator('[data-attention-item]').first().getAttribute('data-tone'), 'danger')
    assert.ok(await page.evaluate(() => !!document.activeElement?.closest('.dy-ov-attn-panel')), 'focus moves into the drawer')

    // Escape closes and returns focus to the banner; Enter, Space, X, backdrop.
    await page.keyboard.press('Escape')
    await drawer.waitFor({ state: 'detached' })
    assert.ok(await banner.evaluate((el) => el === document.activeElement), 'focus is back on the banner')
    await page.keyboard.press('Enter')
    await drawer.waitFor()
    await page.locator('[data-attention-close]').click()
    await drawer.waitFor({ state: 'detached' })
    await banner.focus()
    await page.keyboard.press(' ')
    await drawer.waitFor()
    await page.mouse.click(40, 450)
    await drawer.waitFor({ state: 'detached' })

    // An item expands to its routing detail; Open goes to the work item.
    await banner.click()
    await drawer.locator(`[data-attention-item="blocked:${blocked.ref}"] .dy-ov-attn-row`).click()
    const detail = drawer.locator('.dy-ov-attn-detail')
    await detail.waitFor()
    assert.match(await detail.innerText(), /Next step/)
    await detail.getByRole('button', { name: 'Open work item' }).click()
    await page.locator(`[data-work-item-detail="${blocked.ref}"]`).waitFor()
    assert.equal(await drawer.count(), 0, 'the drawer closed when Open was used')
  })
})

test('Overview strip: on every project tab; approvals open in the Approval inbox', { timeout: 180000 }, async () => {
  const portfolio = await get('/portfolio')
  const decision = (portfolio.groups?.decisions ?? [])[0]
  assert.ok(decision, 'the seeded data has an initiative waiting for approval')
  const want = await expected(decision.project)

  await withPage({ width: 1280, height: 900 }, async (page) => {
    await openProject(page, decision.project)
    for (const key of ['plan', 'board', 'planning', 'workflows', 'content', 'memory', 'activity', 'reports', 'settings', 'overview']) {
      await page.locator(`[data-project-view="${key}"]`).click()
      await page.locator(`[data-project-view="${key}"].active`).waitFor()
      assert.equal(await page.locator(`[data-project-strip="${decision.project}"] .dy-ov-banner`).count(), 1, `the banner is on the ${key} tab`)
      assert.equal(await page.locator('.dy-ov-banner').getAttribute('data-attention-state'), want.state, `same state on the ${key} tab`)
      // Sahil 06/10: the full strip on every tab, not a slim one.
      await assertFullStrip(page, `the ${key} tab`)
    }
    await page.locator('.dy-ov-banner').click()
    const row = page.locator(`[data-attention-item="approval:${decision.ref}"]`)
    await row.waitFor()
    assert.equal(await row.getAttribute('data-tone'), 'warning', 'an approval is amber in the drawer (signed 16/09)')
    await row.locator('.dy-ov-attn-row').click()
    await row.getByRole('button', { name: 'Open in Approval inbox' }).click()
    await page.locator('[data-tab="inbox"][aria-selected="true"]').waitFor()
    await page.locator(`[data-inbox-ref="${decision.ref}"][aria-selected="true"]`).first().waitFor()
  })
})

test('Overview strip: a switched-off project reads Disabled; dark mode changes the colours', { timeout: 120000 }, async () => {
  const dashboard = await get('/dashboard')
  const off = (dashboard.projects ?? []).find((entry) => entry.enabled === false)
  const blockedProject = (dashboard.projects ?? []).find((entry) => entry.enabled !== false && Number(entry.work?.blocked ?? 0) > 0)
  assert.ok(off && blockedProject, 'the seeded data has a switched-off project and a blocked one')

  await withPage({ width: 1280, height: 900 }, async (page) => {
    await openProject(page, off.id)
    assert.equal(await page.locator('.dy-ov-banner').getAttribute('data-attention-state'), 'disabled')
    assert.equal(await page.locator('.dy-ov-banner').getAttribute('data-tone'), 'neutral')
    const grey = await bannerColours(page)
    const offHeadline = await page.locator('[data-strip-headline]').innerText()

    // The global switcher replaces everything in the strip (signed 16/09:
    // name, goal, bar, recency, banner).
    await pickProject(page, blockedProject.id)
    await page.locator(`[data-project-strip="${blockedProject.id}"]`).waitFor()
    assert.equal(await page.locator('[data-strip-project]').innerText(), blockedProject.id, 'the eyebrow names the new project')
    assert.notEqual(await page.locator('[data-strip-headline]').innerText(), offHeadline, 'the headline changed with the project')
    assert.equal(await page.locator('.dy-ov-banner').getAttribute('data-attention-state'), (await expected(blockedProject.id)).state, 'the banner is the new project\'s')
    const light = await bannerColours(page)
    assert.notEqual(light.bg, grey.bg, 'blocked and disabled banners differ in colour')
    await page.evaluate(() => document.querySelector('.dockyard-root').setAttribute('data-theme', 'dark'))
    await page.waitForFunction((before) => getComputedStyle(document.querySelector('.dy-ov-banner')).backgroundColor !== before, light.bg)
    const dark = await bannerColours(page)
    assert.notEqual(dark.bg, light.bg, 'dark mode changes the banner background')
    assert.notEqual(dark.color, light.color, 'dark mode changes the banner text')
    assert.notEqual(dark.border, light.border, 'dark mode changes the banner border')
  })
})

test('Overview strip: at phone width nothing overflows and the drawer is a bottom sheet', { timeout: 120000 }, async () => {
  const dashboard = await get('/dashboard')
  const project = (dashboard.projects ?? []).find((entry) => entry.enabled !== false && Number(entry.work?.blocked ?? 0) > 0)
  assert.ok(project, 'the seeded data has a blocked project')
  await withPage({ width: 390, height: 844 }, async (page) => {
    await openProject(page, project.id)
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth), false, 'no sideways scroll')
    await page.locator('.dy-ov-banner').click()
    await page.locator('[data-attention-drawer]').waitFor()
    const sheet = await page.locator('.dy-ov-attn-panel').evaluate((el) => { const box = el.getBoundingClientRect(); return { left: Math.round(box.left), width: Math.round(box.width), bottom: Math.round(box.bottom), vw: innerWidth, vh: innerHeight } })
    assert.deepEqual([sheet.left, sheet.width, sheet.bottom], [0, sheet.vw, sheet.vh], 'full-width sheet at the bottom of the screen')
  })
})

test('Overview strip: no design-review bar, and the page address cannot slim the strip or drop cards', { timeout: 120000 }, async () => {
  const dashboard = await get('/dashboard')
  const project = (dashboard.projects ?? []).find((entry) => entry.enabled !== false && Number(entry.work?.blocked ?? 0) > 0)
  assert.ok(project, 'the seeded data has a blocked project')
  await withPage({ width: 1280, height: 900 }, async (page) => {
    // The flags the 05/10 review prototype read. Sahil 06/10 picked; they are gone.
    await openProject(page, project.id, '?review=1&strip=slim&cards=trim')
    assert.equal(await page.locator('[data-strip-review]').count(), 0, 'no design-review bar')
    await assertFullStrip(page, 'Overview')
    await assertOverviewCardsKept(page, project)
    await page.locator('[data-project-view="board"]').click()
    await page.locator('[data-project-view="board"].active').waitFor()
    await assertFullStrip(page, 'the Kanban tab')
  })
})
