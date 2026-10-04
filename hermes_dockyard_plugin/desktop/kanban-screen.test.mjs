// C2 Kanban: the screen, in a real browser, on the disposable REAL backend.
// Run: node hermes_dockyard_plugin/desktop/run-browser-suite.mjs $PWD/hermes_dockyard_plugin/desktop/kanban-screen.test.mjs
//
// Fixtures (see _kanban_fixtures.py, project atlas-mobile): blockers exist only
// as explicit blocking links; no item has a parent and no epic is linked to a
// task. Dates are far past / far future so no test depends on today.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { chromium } from './browser-harness.mjs'

const BASE = process.env.STEWARD_DESKTOP_URL
const API = process.env.STEWARD_API_URL
const PROJECT = 'atlas-mobile'
const TOKEN = { 'x-hermes-session-token': 'demo-session-token' }
const get = async (path) => { const r = await fetch(API + path, { headers: TOKEN }); assert.ok(r.ok, `${path} -> ${r.status}`); return r.json() }

async function goToBoard(page) {
  await page.getByRole('button', { name: 'Project context', exact: true }).click()
  await page.getByRole('combobox', { name: 'Find project' }).fill(PROJECT)
  await page.getByRole('listbox', { name: 'Projects' }).getByRole('option', { name: PROJECT, exact: true }).click()
  await page.locator('[data-tab="project"]').click()
  await page.locator('[data-project-view="board"]').click()
  await page.locator('[data-kanban-screen]').waitFor()
}

async function open(browser, { width = 1440, dark = false, tab = 'board' } = {}) {
  const page = await browser.newPage({ viewport: { width, height: 900 } })
  page.setDefaultTimeout(10000)
  const errors = []
  page.on('pageerror', (error) => errors.push(String(error)))
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()) })
  await page.goto(BASE, { waitUntil: 'networkidle' })
  await goToBoard(page)
  if (dark) {
    // Measure settled colours: the card fades its background over 0.16s, and a slow run would sample mid-fade.
    await page.addStyleTag({ content: '.dockyard-root *, .dockyard-root *::before, .dockyard-root *::after { transition: none !important; }' })
    await page.evaluate(() => document.querySelector('.dockyard-root').setAttribute('data-theme', 'dark'))
  }
  if (tab !== 'board') await page.locator(`[data-kanban-tab="${tab}"]`).click()
  return { page, errors }
}
const refs = async () => {
  const items = (await get(`/projects/${PROJECT}/work-items`)).work_items
  const by = (title) => items.find((item) => item.title === title).ref
  return { all: items, by }
}
const chipTexts = (page, ref) => page.locator(`[data-card-chips="${ref}"] .dy-kb-chip`).allInnerTexts()

test('sub-tabs, six stages in order, one screen, no page error', async () => {
  const browser = await chromium.launch({ headless: true })
  try {
    const { page, errors } = await open(browser)
    assert.deepEqual(await page.locator('[data-kanban-tab]').allInnerTexts(), ['Board', 'List', 'Milestones'])
    assert.equal(await page.locator('[data-kanban-tab="board"]').getAttribute('aria-pressed'), 'true')
    assert.deepEqual(await page.locator('[data-board-column] h3').allInnerTexts(), ['Backlog', 'In progress', 'Review', 'Blocked', 'Done', 'Other states'])
    assert.equal(await page.locator('[data-work-card]').count(), (await refs()).all.filter((item) => item.status !== 'archived').length)
    assert.equal(await page.locator('.dockyard-sidebar, [data-sidebar]').count(), 0, 'no sidebar, ever')
    assert.deepEqual(errors, [])
  } finally { await browser.close() }
})

test('cards: reference chips from real links, type + id + name; Done said in words; epic with no links shows none', async () => {
  const browser = await chromium.launch({ headless: true })
  try {
    const { page, errors } = await open(browser)
    const r = await refs()
    const screens = r.by('Build setup screens'), guided = r.by('Guided setup'), crash = r.by('Crash on first launch')
    const analytics = r.by('Wire up analytics'), spike = r.by('Try offline sync'), epic = r.by('Mobile app revamp')

    // Three link chips + "+3": initiative, milestone, objective sit behind it.
    const first = await chipTexts(page, screens)
    assert.deepEqual(first.slice(0, 3), [
      `Blocked by · Task · ${guided} Guided setup`,
      `Blocked by · Bug · ${crash} Crash on first launch`,
      `Blocks · Task · ${analytics} Wire up analytics`,
    ])
    assert.ok(first.includes('+3'), `the rest sit behind +3, got ${JSON.stringify(first)}`)
    await page.locator(`[data-chips-toggle="${screens}"]`).click()
    const all = await chipTexts(page, screens)
    assert.ok(all.some((text) => /^Initiative · INIT-[A-Z0-9-]+ Make setup effortless$/.test(text)), JSON.stringify(all))
    assert.ok(all.includes('Milestone · Beta launch'))
    assert.ok(all.includes('Objective · Setup under two minutes · via Make setup effortless · supports'))
    assert.ok(all.includes('Show less'))

    // A done blocker is written as Done, not only coloured.
    assert.ok((await chipTexts(page, crash)).some((text) => text === `Blocked by · Spike · ${spike} Try offline sync · Done`))
    // The blocked item says what it blocks.
    assert.ok((await chipTexts(page, guided)).includes(`Blocks · Task · ${screens} Build setup screens`))
    // An epic with no links and no label other than "mobile" shows no link, planning or objective chip.
    assert.deepEqual(await chipTexts(page, epic), ['mobile'])
    assert.equal(await page.locator(`[data-work-card="${epic}"] [data-kind]`).count(), 0)

    // Avatar initials from the real name; due date and overdue in words.
    assert.equal(await page.locator(`[data-work-card="${screens}"] .dy-kb-avatar`).innerText(), 'AL')
    assert.ok((await chipTexts(page, screens)).includes('Due 2000-01-15 · Overdue'))
    assert.ok((await chipTexts(page, guided)).includes('Due 2099-06-30'), 'a future due date is not overdue')
    assert.equal(await page.locator(`[data-work-card="${analytics}"] .dy-kb-avatar`).innerText(), 'GH')
    assert.deepEqual(errors, [])
  } finally { await browser.close() }
})

test('a chip never hides the id and name: its text wraps instead of being cut with an ellipsis', async () => {
  const browser = await chromium.launch({ headless: true })
  try {
    for (const width of [1440, 390]) {
      const { page } = await open(browser, { width })
      const cut = await page.evaluate(() => [...document.querySelectorAll('[data-card-chips] .dy-kb-chip[data-kind] > span')]
        .filter((span) => span.scrollHeight > span.clientHeight + 1 || span.scrollWidth > span.clientWidth + 1).map((span) => span.textContent))
      assert.deepEqual(cut, [], `no cut chip text at ${width}px`)
      await page.close()
    }
  } finally { await browser.close() }
})

test('board controls never share an accessible name with the details drawer (Assignee, Type, Label, Status)', async () => {
  const browser = await chromium.launch({ headless: true })
  try {
    const { page } = await open(browser)
    const r = await refs()
    await page.locator(`[data-work-card="${r.by('Build setup screens')}"] button`).first().click()
    await page.locator('[data-work-item-detail]').waitFor()
    const clashes = await page.evaluate(() => {
      const names = (nodes) => nodes.map((el) => el.getAttribute('aria-label')).filter(Boolean)
      const drawer = names([...document.querySelectorAll('[data-work-item-detail] [aria-label]')])
      const board = names([...document.querySelectorAll('[data-kanban-toolbar] [aria-label]')])
      return board.filter((name) => drawer.includes(name))
    })
    assert.deepEqual(clashes, [])
    // The old drawer-level selector still finds exactly one Assignee picker, and it is the drawer's.
    assert.equal(await page.locator('select[aria-label="Assignee"]').count(), 1)
    assert.equal(await page.locator('[data-work-item-detail] select[aria-label="Assignee"]').count(), 1)
  } finally { await browser.close() }
})

test('a link chip opens the linked item; the first button on a card is Open details', async () => {
  const browser = await chromium.launch({ headless: true })
  try {
    const { page } = await open(browser)
    const r = await refs()
    const screens = r.by('Build setup screens'), guided = r.by('Guided setup')
    assert.equal(await page.locator(`[data-work-card="${screens}"] button`).first().innerText(), 'Open details')
    await page.locator(`[data-card-chips="${screens}"] [data-chip="blocked_by:${guided}"]`).click()
    await page.locator(`[data-work-item-detail="${guided}"]`).waitFor()
    assert.ok(await page.locator(`[data-work-item-detail="${guided}"]`).isVisible())
    // The details view lists the same relation from the real host.
    const detail = await get(`/projects/${PROJECT}/work-items/${screens}`)
    assert.ok(detail.dependencies.some((link) => link.ref === guided), 'details and chip agree')
  } finally { await browser.close() }
})

test('Tags switch groups off, filters narrow the board, and NOTHING is stored in the browser', async () => {
  const browser = await chromium.launch({ headless: true })
  try {
    const { page } = await open(browser)
    const r = await refs()
    const screens = r.by('Build setup screens')
    const storageBefore = await page.evaluate(() => JSON.stringify([Object.entries(localStorage), Object.entries(sessionStorage)]))

    await page.locator('[data-kanban-tags]').click()
    await page.locator('[data-kanban-tag="links"]').uncheck()
    await page.keyboard.press('Escape')
    assert.equal(await page.locator('[data-chip^="blocked_by"], [data-chip^="blocks"]').count(), 0)
    assert.ok((await chipTexts(page, screens)).some((text) => text.startsWith('Initiative')), 'planning chips remain')
    await page.locator('[data-kanban-tags]').click()
    await page.locator('[data-kanban-tag="due"]').uncheck()
    await page.locator('[data-kanban-tag="labels"]').uncheck()
    assert.equal(await page.locator('[data-chip-due], [data-chip-label]').count(), 0)

    await page.locator('[data-kanban-filter="assignee"]').selectOption('grace-hopper')
    assert.equal(await page.locator('[data-work-card]').count(), 3)
    await page.locator('[data-kanban-filter="type"]').selectOption('bug')
    assert.equal(await page.locator('[data-work-card]').count(), 1)
    assert.equal(await page.locator('[data-kanban-count]').innerText(), '1 item')
    await page.locator('[data-kanban-clear]').click()
    assert.equal(await page.locator('[data-kanban-filter="type"]').inputValue(), '')
    await page.getByRole('searchbox', { name: 'Search work items' }).fill('guided')
    assert.equal(await page.locator('[data-work-card]').count(), 1)
    await page.getByRole('searchbox', { name: 'Search work items' }).fill('zzz-nothing')
    assert.ok(await page.locator('[data-kanban-empty="filters"]').isVisible())
    await page.locator('[data-kanban-empty="filters"] button').click()
    assert.equal(await page.locator('[data-work-card]').count(), r.all.filter((item) => item.status !== 'archived').length)

    assert.equal(await page.evaluate(() => JSON.stringify([Object.entries(localStorage), Object.entries(sessionStorage)])), storageBefore, 'no browser storage written')
    await page.reload({ waitUntil: 'networkidle' })
    await goToBoard(page)
    await page.locator('[data-kanban-tags]').click()
    for (const key of ['links', 'planning', 'due', 'labels']) assert.ok(await page.locator(`[data-kanban-tag="${key}"]`).isChecked(), `${key} resets on reload`)
  } finally { await browser.close() }
})

test('columns collapse to a thin strip that still takes a drop; keyboard focus follows', async () => {
  const browser = await chromium.launch({ headless: true })
  let restore = null
  try {
    const { page } = await open(browser)
    const r = await refs()
    const analytics = r.by('Wire up analytics')
    const before = (r.all.find((item) => item.ref === analytics)).status

    await page.locator('[data-board-collapse="active"]').focus()
    await page.keyboard.press('Enter')
    const strip = page.locator('[data-board-strip="active"]')
    await strip.waitFor()
    assert.equal(await page.evaluate(() => document.activeElement?.getAttribute('data-board-strip')), 'active', 'focus moves to the strip')
    assert.match(await strip.getAttribute('aria-label'), /^Expand In progress, \d+ items?$/)
    assert.ok((await page.locator('[data-board-column="active"]').boundingBox()).width <= 56, 'a thin strip')
    assert.equal(await page.locator('[data-board-column="active"] [data-work-card]').count(), 0)

    // A card dropped on the collapsed strip is moved, exactly like an open column.
    restore = { ref: analytics, status: before }
    await page.locator(`[data-work-card="${analytics}"]`).dragTo(page.locator('[data-board-column="active"]'))
    await page.getByText('Work item moved to in progress.', { exact: true }).waitFor()
    assert.equal((await get(`/projects/${PROJECT}/work-items`)).work_items.find((item) => item.ref === analytics).status, 'in_progress')

    await strip.press('Enter')
    await page.locator('[data-board-collapse="active"]').waitFor()
    assert.equal(await page.evaluate(() => document.activeElement?.getAttribute('data-board-collapse')), 'active', 'focus returns to the column button')
    await page.locator(`[data-board-column="active"] [data-work-card="${analytics}"]`).waitFor()
  } finally {
    if (restore) await fetch(`${API}/projects/${PROJECT}/work-items/${restore.ref}/transition`, { method: 'POST', headers: { ...TOKEN, 'content-type': 'application/json' }, body: JSON.stringify({ status: restore.status }) })
    await browser.close()
  }
})

test('List tab: the shared table, grouped by stage, with the link columns', async () => {
  const browser = await chromium.launch({ headless: true })
  try {
    const { page } = await open(browser, { tab: 'list' })
    const r = await refs()
    const screens = r.by('Build setup screens'), guided = r.by('Guided setup')
    assert.equal(await page.locator('[data-work-table]').count(), 1)
    assert.equal(await page.locator('[data-work-card]').count(), 0, 'List shows no cards')
    assert.deepEqual(await page.locator('[data-work-table] thead th').allInnerTexts(),
      ['Ref', 'Title', 'Type', 'State', 'Assignee', 'Blocked by', 'Blocks', 'Initiative', 'Milestone', 'Objective', 'Due', 'Move'])
    const row = page.locator(`[data-work-row="${screens}"]`)
    assert.ok((await row.innerText()).includes(`${guided} Guided setup`), 'Blocked by cell')
    assert.ok((await page.locator('[data-work-group]').allInnerTexts()).some((text) => /^Backlog \(\d+\)$/.test(text)))
    // The table scrolls inside itself; the page does not scroll sideways.
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), true)
  } finally { await browser.close() }
})

test('Milestones tab holds the existing milestone panel; the board no longer carries it', async () => {
  const browser = await chromium.launch({ headless: true })
  try {
    const { page } = await open(browser)
    assert.equal(await page.locator('[data-planning-panel]').count(), 0, 'not under the board any more')
    await page.locator('[data-kanban-tab="milestones"]').click()
    await page.locator('[data-planning-panel]').waitFor()
    assert.ok(await page.locator('[data-milestone-row="Beta launch"]').isVisible())
    assert.equal(await page.locator('[data-board-column]').count(), 0)
  } finally { await browser.close() }
})

test('if the dependencies read fails the board still works and says so (never silently empty)', async () => {
  const browser = await chromium.launch({ headless: true })
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
    await page.route('**/work-dependencies', (route) => route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: { code: 'host_link_shape_invalid', message: 'x' } }) }))
    await page.goto(BASE, { waitUntil: 'networkidle' })
    await page.getByRole('button', { name: 'Project context', exact: true }).click()
    await page.getByRole('combobox', { name: 'Find project' }).fill(PROJECT)
    await page.getByRole('listbox', { name: 'Projects' }).getByRole('option', { name: PROJECT, exact: true }).click()
    await page.locator('[data-tab="project"]').click()
    await page.locator('[data-project-view="board"]').click()
    await page.locator('[data-kanban-note="dependencies"]').waitFor()
    assert.match(await page.locator('[data-kanban-note="dependencies"]').innerText(), /Dependencies unavailable/)
    assert.equal(await page.locator('[data-chip^="blocked_by"], [data-chip^="blocks"]').count(), 0)
    assert.ok((await page.locator('[data-work-card]').count()) > 0, 'cards still render')
  } finally { await browser.close() }
})

test('layout: nothing scrolls the page sideways at 1440, 1024 and 390; narrow touch targets are at least 40px', async () => {
  const browser = await chromium.launch({ headless: true })
  try {
    for (const width of [1440, 1024, 390]) {
      const { page } = await open(browser, { width })
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), true, `no page overflow at ${width}`)
      if (width === 390) {
        const small = await page.evaluate(() => [...document.querySelectorAll('[data-work-card] button, [data-work-card] select, [data-board-collapse], [data-kanban-tab], .dy-kb-control')]
          .map((el) => [el, el.getBoundingClientRect()]).filter(([, box]) => box.height > 0 && box.height < 40 && !(el => el.classList?.contains('dy-kb-chip'))).map(([el]) => el.outerHTML.slice(0, 90)))
        assert.deepEqual(small, [], 'every control is at least 40px tall on a narrow screen')
      }
      await page.close()
    }
  } finally { await browser.close() }
})

// Part two of the colour test: a real browser, both themes. Text must be readable on its own background.
const luminance = ([r, g, b]) => { const f = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4 }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b) }
const ratio = (a, b) => { const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x); return (hi + 0.05) / (lo + 0.05) }
const parse = (css) => (css.match(/[\d.]+/g) ?? []).slice(0, 3).map(Number)

test('colours: chips and cards are readable in light AND dark, and the two themes really differ', async () => {
  const browser = await chromium.launch({ headless: true })
  try {
    const seen = {}
    for (const dark of [false, true]) {
      const { page } = await open(browser, { dark })
      const r = await refs()
      await page.locator(`[data-chips-toggle="${r.by('Build setup screens')}"]`).click()
      const samples = await page.evaluate(() => [...new Set([...document.querySelectorAll('.dy-kb-chip[data-kind], .dy-kb-chip[data-overdue], .dy-kb-chip[data-done], .dockyard-work-card, .dockyard-board-column')].map((el) => el.dataset.kind || el.className))]
        .map((key) => { const el = document.querySelector(`[data-kind="${key}"]`) || [...document.querySelectorAll('.dy-kb-chip,.dockyard-work-card,.dockyard-board-column')].find((n) => n.className === key); const s = getComputedStyle(el); return [key, s.color, s.backgroundColor] }))
      assert.ok(samples.length >= 6, `chip kinds present: ${JSON.stringify(samples.map((s) => s[0]))}`)
      for (const [key, color, background] of samples) {
        if (/rgba\(.*,\s*0\)/.test(background) || background === 'transparent') continue
        assert.ok(ratio(parse(color), parse(background)) >= 4.5, `${dark ? 'dark' : 'light'} ${key}: ${color} on ${background}`)
      }
      seen[dark ? 'dark' : 'light'] = await page.evaluate(() => getComputedStyle(document.querySelector('.dockyard-work-card')).backgroundColor)
      await page.close()
    }
    assert.notEqual(seen.light, seen.dark, 'dark mode really changes the card colour')
  } finally { await browser.close() }
})
