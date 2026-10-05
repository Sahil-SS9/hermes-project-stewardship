// C2 Kanban: the screen, in a real browser, on the disposable REAL backend.
// Run: node hermes_dockyard_plugin/desktop/run-browser-suite.mjs $PWD/hermes_dockyard_plugin/desktop/kanban-screen.test.mjs
//
// r6 design (Sahil's C2 review, 04/10/2026): summary cards that expand in place,
// a views bar with a Manage views side panel, five columns with stated statuses,
// and only the moves Hermes accepts. The guarantees C's first tests pinned are
// kept in their r6 form: links only from real data, type + id + name, Done in
// words, no name clash with the details drawer, nothing stored in the browser,
// a collapsed strip that still takes a drop, readable in both themes, 40px touch
// targets and no sideways scroll.
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
const COLUMN = { backlog: 'Backlog', in_progress: 'In progress', in_review: 'Review', blocked: 'Blocked', done: 'Done' }
const storage = (page) => page.evaluate(() => JSON.stringify([Object.entries(localStorage), Object.entries(sessionStorage)]))

async function goToBoard(page) {
  await page.getByRole('button', { name: 'Project context', exact: true }).click()
  await page.getByRole('combobox', { name: 'Find project' }).fill(PROJECT)
  await page.getByRole('listbox', { name: 'Projects' }).getByRole('option', { name: PROJECT, exact: true }).click()
  await page.locator('[data-tab="project"]').click()
  await page.locator('[data-project-view="board"]').click()
  await page.locator('[data-kanban-screen]').waitFor()
}
async function open(browser, { width = 1440, dark = false } = {}) {
  const page = await browser.newPage({ viewport: { width, height: 900 } })
  page.setDefaultTimeout(10000)
  const errors = []
  page.on('pageerror', (error) => errors.push(String(error)))
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()) })
  await page.goto(BASE, { waitUntil: 'networkidle' })
  await goToBoard(page)
  if (dark) {
    await page.addStyleTag({ content: '.dockyard-root *, .dockyard-root *::before, .dockyard-root *::after { transition: none !important; }' })
    await page.evaluate(() => document.querySelector('.dockyard-root').setAttribute('data-theme', 'dark'))
  }
  const card = (title) => page.locator('[data-work-card]').filter({ has: page.locator('.dy-kb-title').getByText(title, { exact: true }) })
  return { page, errors, card }
}
const data = async () => {
  const items = (await get(`/projects/${PROJECT}/work-items`)).work_items
  const deps = (await get(`/projects/${PROJECT}/work-dependencies`)).dependencies
  const by = (title) => items.find((item) => item.title === title)
  return { items, deps, by, live: items.filter((item) => item.status !== 'archived') }
}
const withBrowser = async (run) => { const browser = await chromium.launch({ headless: true }); try { await run(browser) } finally { await browser.close() } }

test('board: five columns, every live item placed, views bar, no sidebar, no page error', () => withBrowser(async (browser) => {
  const { page, errors } = await open(browser)
  const d = await data()
  assert.deepEqual(await page.locator('[data-board-column] h3').allInnerTexts(), Object.values(COLUMN))
  assert.equal(await page.locator('[data-work-card]').count(), d.live.length)
  assert.equal(await page.locator('[data-kanban-note="unplaced"]').count(), 0)
  assert.deepEqual(await page.locator('[data-view-tab]').evaluateAll((tabs) => tabs.map((tab) => tab.getAttribute('data-view-tab'))), ['All work', "Ada's work", "Grace's bugs", 'Mobile, all cards open'])
  assert.equal(await page.locator('[data-view-tab="All work"]').getAttribute('aria-pressed'), 'true')
  // C's sub-tabs became controls: Board or List, and one button that opens every card (Sahil 05/10:
  // "Expanded" did not say what it did). Milestones are not on the board any more.
  assert.deepEqual(await page.locator('[data-kanban-layout]').allInnerTexts(), ['Board', 'List'])
  assert.equal(await page.locator('[data-kanban-layout="board"]').getAttribute('aria-pressed'), 'true')
  assert.equal((await page.locator('[data-kanban-open-all]').innerText()).trim(), 'Open all cards')
  assert.equal(await page.locator('[data-kanban-open-all]').getAttribute('aria-pressed'), 'false')
  assert.equal(await page.locator('[data-kanban-page], [data-planning-panel]').count(), 0)
  assert.equal(await page.locator('.dockyard-sidebar, [data-sidebar]').count(), 0)
  // Drag is never the only way to move: the board says how (kept from C's board).
  assert.match(await page.locator('[data-kanban-help]').innerText(), /open the card and use Move to/)
  await page.locator('[data-kanban-layout="list"]').click()
  await page.locator('.dy-kb-list').waitFor()
  assert.equal(await page.locator('[data-kanban-help]').count(), 0, 'the List has its own Move column, so no drag help')
  assert.deepEqual(errors, [])
}))

test('cards: summary facts from real data; expanded card names links with ref, title and status', () => withBrowser(async (browser) => {
  const { page, card } = await open(browser)
  const d = await data()
  const screens = d.by('Build setup screens'), guided = d.by('Guided setup'), crash = d.by('Crash on first launch')
  const analytics = d.by('Wire up analytics'), spike = d.by('Try offline sync'), epic = d.by('Mobile app revamp')
  const signals = (title) => card(title).locator('[data-signal]').allInnerTexts()
  assert.deepEqual(await signals('Build setup screens'), ['Blocked by 2', 'Blocks 1', 'Overdue · 15 Jan 2000'])
  assert.deepEqual(await card('Build setup screens').locator('[data-card-label]').allInnerTexts(), ['mobile', 'ux'])
  assert.deepEqual(await signals('Guided setup'), ['Blocks 1', 'Due 30 Jun 2099'])
  assert.equal(await card('Build setup screens').locator('.dy-kb-avatar').innerText(), 'AL')
  assert.equal(await card('Wire up analytics').locator('.dy-kb-avatar').innerText(), 'GH')
  assert.deepEqual(await signals('Mobile app revamp'), [], 'an epic with no links shows no link signal')
  assert.equal(await page.locator('[data-card-body]').count(), 0, 'summary by default')

  await card('Build setup screens').locator('[data-card-toggle]').click()
  const links = (section) => card('Build setup screens').locator(`[data-card-section="${section}"] [data-link-ref]`).evaluateAll((rows) => rows.map((row) => row.innerText.replace(/\s+/g, ' ').trim()))
  assert.deepEqual(await links('blocked_by'), [`${guided.ref} Guided setup ${COLUMN[guided.status]}`, `${crash.ref} Crash on first launch ${COLUMN[crash.status]}`])
  assert.deepEqual(await links('blocks'), [`${analytics.ref} Wire up analytics ${COLUMN[analytics.status]}`])
  const planning = await card('Build setup screens').locator('[data-card-section="planning"] .dy-kb-row').allInnerTexts()
  assert.deepEqual(planning.map((row) => row.replace(/\s+/g, ' ').trim()), ['Initiative Make setup effortless', 'Milestone Beta launch · due 1 Mar 2099', 'Objective Setup under two minutes (through the initiative)'])
  await card('Crash on first launch').locator('[data-card-toggle]').click()
  const done = await card('Crash on first launch').locator(`[data-link-ref="${spike.ref}"]`).innerText()
  assert.match(done.replace(/\s+/g, ' '), /Try offline sync Done$/, 'a done blocker says Done in words')
  assert.equal(epic.type, 'epic')
}))

test("an expanded card never cuts a linked item's id or name: the text wraps", () => withBrowser(async (browser) => {
  for (const width of [1440, 390]) {
    const { page, card } = await open(browser, { width })
    await card('Build setup screens').locator('[data-card-toggle]').click()
    const rows = card('Build setup screens').locator('[data-link-ref]')
    assert.ok(await rows.count() >= 3, 'the links are listed')
    const cut = await rows.evaluateAll((nodes) => nodes.flatMap((row) => [...row.querySelectorAll('.dy-kb-key, .dy-kb-link-title')])
      .filter((el) => el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1).map((el) => el.textContent))
    assert.deepEqual(cut, [], `no cut link text at ${width}px`)
    await page.close()
  }
}))

test('card fields switch whole groups off (C\'s Tags): links, due and labels leave the cards; Reset brings them back', () => withBrowser(async (browser) => {
  const { page } = await open(browser)
  const count = (selector) => page.locator(`[data-work-card] ${selector}`).count()
  assert.ok(await count('[data-signal="blocked_by"], [data-signal="blocks"]') > 0)
  assert.ok(await count('[data-signal="due"], [data-signal="overdue"]') > 0)
  assert.ok(await count('[data-card-label]') > 0)
  await page.locator('[data-views-manage]').click()
  await page.locator('[data-card-field="links"]').uncheck()
  assert.equal(await count('[data-signal="blocked_by"], [data-signal="blocks"]'), 0)
  assert.ok(await count('[data-signal="due"], [data-signal="overdue"]') > 0, 'the other groups stay')
  await page.locator('[data-card-field="due"]').uncheck()
  await page.locator('[data-card-field="labels"]').uncheck()
  assert.equal(await count('[data-signal="due"], [data-signal="overdue"], [data-card-label]'), 0)
  await page.keyboard.press('Escape')
  await page.locator('[data-view-edited] [data-view-reset]').click()
  assert.ok(await count('[data-signal="blocked_by"]') > 0 && await count('[data-card-label]') > 0, 'Reset restores the view')
}))

test('a card shows two labels, then "+n" naming the rest', () => withBrowser(async (browser) => {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  page.setDefaultTimeout(10000)
  // Only this page sees four labels on one item: the backend is not changed.
  await page.route((url) => url.pathname.endsWith(`/projects/${PROJECT}/work-items`), async (route) => {
    const response = await route.fetch()
    const json = await response.json()
    for (const item of json.work_items) if (item.title === 'Build setup screens') item.labels = ['mobile', 'ux', 'ios', 'beta']
    await route.fulfill({ response, json })
  })
  await page.goto(BASE, { waitUntil: 'networkidle' })
  await goToBoard(page)
  const labels = page.locator('[data-work-card]').filter({ has: page.locator('.dy-kb-title').getByText('Build setup screens', { exact: true }) }).locator('.dy-kb-label')
  assert.deepEqual(await labels.allInnerTexts(), ['mobile', 'ux', '+2'])
  assert.equal(await labels.last().getAttribute('title'), 'ios, beta')
}))

test('a linked item opens; Open full details opens the drawer; board names never clash with the drawer', () => withBrowser(async (browser) => {
  const d = await data()
  const screens = d.by('Build setup screens'), guided = d.by('Guided setup')
  const first = await open(browser)
  await first.card('Build setup screens').locator('[data-card-toggle]').click()
  await first.card('Build setup screens').locator(`[data-link-ref="${guided.ref}"]`).click()
  await first.page.locator(`[data-work-item-detail="${guided.ref}"]`).waitFor()
  assert.ok((await get(`/projects/${PROJECT}/work-items/${screens.ref}`)).dependencies.some((link) => link.ref === guided.ref), 'details and card agree')

  const { page, card } = await open(browser)
  await card('Build setup screens').locator('[data-card-toggle]').click()
  await page.locator(`[data-card-open="${screens.ref}"]`).click()
  await page.locator(`[data-work-item-detail="${screens.ref}"]`).waitFor()
  const clashes = await page.evaluate(() => {
    const names = (selector) => [...document.querySelectorAll(selector)].map((el) => el.getAttribute('aria-label')).filter(Boolean)
    const drawer = names('[data-work-item-detail] [aria-label]')
    return names('[data-kanban-toolbar] [aria-label], .dy-kb-viewsbar [aria-label]').filter((name) => drawer.includes(name))
  })
  assert.deepEqual(clashes, [])
  assert.equal(await page.locator('select[aria-label="Assignee"]').count(), 1)
  assert.equal(await page.locator('[data-work-item-detail] select[aria-label="Assignee"]').count(), 1)
}))

test('filters narrow the board; search finds linked items; nothing is stored in the browser; reload resets', () => withBrowser(async (browser) => {
  const { page } = await open(browser)
  const d = await data()
  const before = await storage(page)
  const cards = () => page.locator('[data-work-card]').count()
  const grace = d.live.filter((item) => item.assignee === 'grace-hopper')
  await page.locator('[data-kanban-filter="assignee"]').selectOption('grace-hopper')
  assert.equal(await cards(), grace.length)
  await page.locator('[data-kanban-filter="type"]').selectOption('bug')
  const bugs = grace.filter((item) => item.type === 'bug').length
  assert.equal(await cards(), bugs)
  assert.equal(await page.locator('[data-kanban-count]').innerText(), `${bugs} ${bugs === 1 ? 'item' : 'items'}`)
  await page.locator('[data-kanban-clear]').click()
  assert.equal(await page.locator('[data-kanban-filter="type"]').inputValue(), '')

  const search = page.getByRole('searchbox', { name: 'Search work items' })
  await search.fill('guided')
  assert.equal(await cards(), 1)
  const screens = d.by('Build setup screens').ref
  const linked = (item) => [...(d.deps[item.ref]?.blocked_by ?? []), ...(d.deps[item.ref]?.blocks ?? [])].some((card) => card.ref.toLowerCase().includes(screens.toLowerCase()))
  const expected = d.live.filter((item) => item.ref.toLowerCase().includes(screens.toLowerCase()) || item.title.toLowerCase().includes(screens.toLowerCase()) || linked(item)).map((item) => item.ref).sort()
  await search.fill(screens)
  assert.deepEqual((await page.locator('[data-work-card]').evaluateAll((nodes) => nodes.map((node) => node.getAttribute('data-work-card')))).sort(), expected)
  assert.ok(expected.length >= 3, `the ref and what links to it: ${expected}`)
  await search.fill('zzz-nothing')
  await page.locator('[data-kanban-empty="filters"] button').click()
  assert.equal(await cards(), d.live.length)

  await page.locator('[data-kanban-open-all]').click()
  await page.locator('[data-views-manage]').click()
  assert.equal(await page.locator('[data-signal="planning"]').count(), 0)
  await page.locator('[data-card-field="planning"]').check()
  assert.ok(await page.locator('[data-signal="planning"]').count() > 0, 'a card field shows on the board straight away')
  await page.keyboard.press('Escape')
  await page.locator('[data-view-tab="Mobile, all cards open"]').click()
  assert.equal(await storage(page), before, 'no browser storage written')
  await page.reload({ waitUntil: 'networkidle' })
  await goToBoard(page)
  assert.equal(await page.locator('[data-view-tab="All work"]').getAttribute('aria-pressed'), 'true')
  assert.equal(await page.getByRole('searchbox', { name: 'Search work items' }).inputValue(), '')
  assert.equal(await page.locator('[data-card-body]').count(), 0)
  assert.equal(await page.locator('[data-view-edited]').count(), 0)
}))

test('columns collapse to a strip that takes a drop; focus follows; refused moves are never offered', () => withBrowser(async (browser) => {
  const { page, card } = await open(browser)
  const d = await data()
  const guided = d.by('Guided setup')
  let restore = null
  try {
    assert.equal(await card('Wire up analytics').getAttribute('draggable'), 'false', 'a task waiting on an open blocker cannot be dragged')
    await page.locator('[data-board-collapse="active"]').focus()
    await page.keyboard.press('Enter')
    const strip = page.locator('[data-board-strip="active"]')
    await strip.waitFor()
    assert.equal(await page.evaluate(() => document.activeElement?.getAttribute('data-board-strip')), 'active')
    assert.match(await strip.getAttribute('aria-label'), /^Expand In progress, \d+ items?$/)
    assert.ok((await page.locator('[data-board-column="active"]').boundingBox()).width <= 56)
    restore = { ref: guided.ref, status: guided.status }
    await card('Guided setup').dragTo(page.locator('[data-board-column="active"]'))
    await page.getByText('Work item moved to in progress.', { exact: true }).waitFor()
    assert.equal((await data()).by('Guided setup').status, 'in_progress')
    // C's backend-browser guarantees: the signed-in principal is recorded, and another project's route refuses the item.
    const history = (await get(`/projects/${PROJECT}/work-items/${guided.ref}`)).history ?? []
    assert.ok(history.some((event) => event.action === 'workitem.transition' && event.actor === 'demo-owner'), 'the backend principal is recorded')
    const cross = await fetch(`${API}/projects/mobile-client/work-items/${guided.ref}/transition`, { method: 'POST', headers: { ...TOKEN, 'content-type': 'application/json' }, body: JSON.stringify({ status: 'done' }) })
    assert.equal(cross.ok, false, 'a move through another project is refused')
    assert.equal((await data()).by('Guided setup').status, 'in_progress')
    await strip.press('Enter')
    await page.locator('[data-board-collapse="active"]').waitFor()
    assert.equal(await page.evaluate(() => document.activeElement?.getAttribute('data-board-collapse')), 'active')
    await page.locator(`[data-board-column="active"] [data-work-card="${guided.ref}"]`).waitFor()
  } finally {
    if (restore) {
      const back = await fetch(`${API}/projects/${PROJECT}/work-items/${restore.ref}/transition`, { method: 'POST', headers: { ...TOKEN, 'content-type': 'application/json' }, body: JSON.stringify({ status: restore.status }) })
      console.log(`# restore ${restore.ref} to ${restore.status}: HTTP ${back.status}`)
    }
  }
}))

test('if dependencies or objectives fail to load, the board still works and says so', () => withBrowser(async (browser) => {
  for (const [route, note, text] of [['**/work-dependencies', 'dependencies', /Dependencies unavailable/], ['**/roadmap?*', 'objectives', /Objectives unavailable/]]) {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
    await page.route(route, (request) => request.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: { code: 'unavailable', message: 'x' } }) }))
    await page.goto(BASE, { waitUntil: 'networkidle' })
    await goToBoard(page)
    await page.locator(`[data-kanban-note="${note}"]`).waitFor()
    assert.match(await page.locator(`[data-kanban-note="${note}"]`).innerText(), text)
    assert.equal(await page.locator('[data-work-card]').count(), (await data()).live.length, 'every card still shows')
    if (note === 'dependencies') assert.equal(await page.locator('[data-signal="blocked_by"], [data-signal="blocks"]').count(), 0, 'no invented links')
    await page.close()
  }
}))

test("List: C's columns, grouped by stage, linked items named, no sideways scroll", () => withBrowser(async (browser) => {
  const { page } = await open(browser)
  const d = await data()
  await page.locator('[data-kanban-layout="list"]').click()
  assert.equal(await page.locator('[data-work-table]').count(), 1)
  assert.equal(await page.locator('[data-work-card]').count(), 0)
  assert.deepEqual(await page.locator('[data-work-table] thead th').allInnerTexts(), ['Ref', 'Title', 'Type', 'State', 'Assignee', 'Blocked by', 'Blocks', 'Initiative', 'Milestone', 'Objective', 'Due', 'Move'])
  const row = await page.locator(`[data-work-row="${d.by('Build setup screens').ref}"]`).innerText()
  for (const text of [`${d.by('Guided setup').ref} Guided setup`, 'Make setup effortless', 'Beta launch', 'Setup under two minutes']) assert.ok(row.includes(text), `${text} in ${row}`)
  assert.ok((await page.locator('[data-work-group]').allInnerTexts()).some((text) => /^Backlog \(\d+\)$/.test(text)))
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), true)
}))

test('Open all cards opens every card and says so; a card can still be closed on its own', () => withBrowser(async (browser) => {
  const { page, card } = await open(browser)
  const d = await data()
  const openAll = page.locator('[data-kanban-open-all]')
  assert.equal(await page.locator('[data-card-body]').count(), 0, 'cards start closed')
  await openAll.click()
  assert.equal(await openAll.getAttribute('aria-pressed'), 'true')
  assert.equal(await page.locator('[data-card-body]').count(), d.live.length, 'every card is open')
  await card('Build setup screens').locator('[data-card-toggle]').click()
  assert.equal(await page.locator('[data-card-body]').count(), d.live.length - 1, 'one card closes on its own')
  await openAll.click()
  assert.equal(await page.locator('[data-card-body]').count(), 0, 'pressing again closes every card')
}))

test('milestones are managed with the Objectives, not on the board; a card\'s milestone link goes there', () => withBrowser(async (browser) => {
  const { page, card } = await open(browser)
  assert.equal(await page.locator('[data-kanban-page], [data-planning-panel]').count(), 0)
  await card('Build setup screens').locator('[data-card-toggle]').click()
  await card('Build setup screens').getByRole('button', { name: /^Milestone: Beta launch/ }).click()
  await page.locator('[data-project-view="objectives"].active').waitFor()
  await page.locator('[data-planning-panel]').waitFor()
  assert.ok(await page.locator('[data-milestone-row="Beta launch"]').isVisible())
  assert.equal(await page.locator('[data-board-column]').count(), 0)
}))

// Contrast of text on the background it really sits on (walks up through transparent parents).
const contrastFailures = (page) => page.evaluate(() => {
  const rgba = (css) => { const v = (css.match(/[\d.]+/g) ?? []).map(Number); return v.length >= 3 ? [v[0], v[1], v[2], v[3] ?? 1] : [0, 0, 0, 0] }
  const over = (top, bottom) => top.slice(0, 3).map((c, i) => c * top[3] + bottom[i] * (1 - top[3]))
  const backdrop = (el) => {
    const layers = []
    for (let node = el; node; node = node.parentElement) { const bg = rgba(getComputedStyle(node).backgroundColor); if (bg[3] > 0) layers.push(bg); if (bg[3] >= 1) break }
    return layers.reverse().reduce((under, layer) => over(layer, under), [255, 255, 255])
  }
  const lum = (rgb) => { const f = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4 }; return 0.2126 * f(rgb[0]) + 0.7152 * f(rgb[1]) + 0.0722 * f(rgb[2]) }
  const ratio = (a, b) => { const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x); return (hi + 0.05) / (lo + 0.05) }
  const out = []
  for (const el of document.querySelectorAll('[data-kanban-screen] *')) {
    if (![...el.childNodes].some((node) => node.nodeType === 3 && node.textContent.trim())) continue
    const style = getComputedStyle(el)
    if (style.visibility === 'hidden' || style.display === 'none' || el.closest(':disabled') || el.getClientRects().length === 0) continue
    const bg = backdrop(el)
    const fg = over(rgba(style.color), bg)
    const value = ratio(fg, bg)
    const large = parseFloat(style.fontSize) >= 24 || (parseFloat(style.fontSize) >= 18.66 && Number(style.fontWeight) >= 700)
    if (value < (large ? 3 : 4.5)) out.push(`${el.tagName.toLowerCase()}.${String(el.className).split(' ')[0]} "${el.textContent.trim().slice(0, 30)}" ${value.toFixed(2)}`)
  }
  return [...new Set(out)]
})

test('colours: every text is readable on its real background in light AND dark; the themes differ', () => withBrowser(async (browser) => {
  const seen = {}
  for (const dark of [false, true]) {
    const { page, card } = await open(browser, { dark })
    for (const title of ['Build setup screens', 'Crash on first launch']) await card(title).locator('[data-card-toggle]').click()
    await page.locator('[data-kanban-filter="label"]').selectOption('mobile')
    await page.locator('[data-views-manage]').click()
    assert.deepEqual(await contrastFailures(page), [], `${dark ? 'dark' : 'light'} text below WCAG AA`)
    seen[dark ? 'dark' : 'light'] = await page.evaluate(() => getComputedStyle(document.querySelector('.dockyard-work-card')).backgroundColor)
    await page.close()
  }
  assert.notEqual(seen.light, seen.dark)
}))

test('narrow 390: nothing scrolls sideways; every board, card and panel control is at least 40px tall', () => withBrowser(async (browser) => {
  for (const width of [1440, 1024, 390]) {
    const { page, card } = await open(browser, { width })
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), true, `no page overflow at ${width}`)
    if (width !== 390) { await page.close(); continue }
    await card('Build setup screens').locator('[data-card-toggle]').click()
    await page.locator('[data-kanban-filter="label"]').selectOption('mobile')
    await page.locator('[data-views-manage]').click()
    const small = await page.evaluate(() => [...document.querySelectorAll('[data-kanban-screen] :is(button, select, input)')]
      .map((el) => (['checkbox', 'radio'].includes(el.type) ? el.closest('label') ?? el : el))
      .filter((el) => !el.classList.contains('dy-kb-goto') && el.getClientRects().length && el.getBoundingClientRect().height < 40)
      .map((el) => `${el.tagName.toLowerCase()}.${String(el.className).split(' ')[0]} "${(el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 24)}" ${Math.round(el.getBoundingClientRect().height)}px`))
    assert.deepEqual([...new Set(small)], [], 'touch targets at 390')
    await page.close()
  }
}))

test('views: save, save as new, rename, share, duplicate and delete, all through the real backend', () => withBrowser(async (browser) => {
  const { page, errors } = await open(browser)
  const before = await storage(page)
  const views = async () => Object.fromEntries((await get(`/projects/${PROJECT}/views`)).views.map((view) => [view.name, view]))
  const row = (name) => page.locator(`[data-view-row="${name}"]`)

  await page.locator(`[data-view-tab="Ada's work"]`).click()
  assert.equal(await page.locator('[data-kanban-filter="assignee"]').inputValue(), 'ada-lovelace')
  await page.locator('[data-kanban-open-all]').click()
  assert.match(await page.locator('[data-view-edited]').innerText(), /Unsaved changes to "Ada's work"/)
  await page.locator('[data-view-edited] [data-view-save]').click()
  await page.locator('[data-view-edited]').waitFor({ state: 'detached' })
  assert.equal((await views())["Ada's work"].filters.display.density, 'detailed')

  await page.locator('[data-kanban-filter="label"]').selectOption('mobile')
  await page.locator('[data-view-save-as]').click()
  await page.locator('[data-view-new-name]').fill("Ada's work")
  assert.ok(await page.locator('[data-view-create]').isDisabled(), 'a taken name is refused')
  await page.locator('[data-view-new-name]').fill('Ada mobile')
  await page.locator('[data-view-create]').click()
  await page.locator('[data-view-tab="Ada mobile"][aria-pressed="true"]').waitFor()
  let saved = await views()
  assert.deepEqual([saved['Ada mobile'].filters.assignee, saved['Ada mobile'].filters.labels, saved['Ada mobile'].shared], ['ada-lovelace', ['mobile'], false])
  assert.equal(saved["Ada's work"].filters.labels, undefined, 'the original view is unchanged')

  await row('Ada mobile').locator('[data-view-rename]').click()
  await page.locator('[data-view-rename-input="Ada mobile"]').fill('Ada, mobile only')
  await page.locator('[data-view-row="Ada mobile"] button[type="submit"]').click()
  await page.locator('[data-view-tab="Ada, mobile only"][aria-pressed="true"]').waitFor()
  saved = await views()
  assert.ok(saved['Ada, mobile only'] && !saved['Ada mobile'], 'renamed, old name gone')

  await row('Ada, mobile only').locator('[data-view-share]').click()
  await row('Ada, mobile only').getByText('Shared', { exact: true }).waitFor()
  assert.equal((await views())['Ada, mobile only'].shared, true)

  assert.equal(await row("Grace's bugs").locator('[data-view-rename], [data-view-share], [data-view-delete]').count(), 0, "someone else's view cannot be changed")
  await row("Grace's bugs").locator('[data-view-duplicate]').click()
  await row("Grace's bugs copy").waitFor()
  const copy = (await views())["Grace's bugs copy"]
  assert.deepEqual([copy.layout, copy.filters.types, copy.shared, copy.mine], ['table', ['bug'], false, true])

  await row('Ada, mobile only').locator('[data-view-delete]').click()
  await page.locator('[data-view-delete-confirm="Ada, mobile only"]').click()
  await row('Ada, mobile only').waitFor({ state: 'detached' })
  assert.equal((await views())['Ada, mobile only'], undefined)
  assert.equal(await page.locator('[data-view-tab="All work"]').getAttribute('aria-pressed'), 'true', 'deleting the current view falls back to All work')
  assert.equal(await storage(page), before, 'no browser storage written')
  assert.deepEqual(errors, [])
}))

test('views live in the backend: a saved view survives a reload and never shows in another project', () => withBrowser(async (browser) => {
  const { page } = await open(browser)
  const name = 'Kept after reload'
  try {
    await page.locator('[data-kanban-filter="label"]').selectOption('mobile')
    await page.locator('[data-view-save-as]').click()
    await page.locator('[data-view-new-name]').fill(name)
    await page.locator('[data-view-create]').click()
    await page.locator(`[data-view-tab="${name}"][aria-pressed="true"]`).waitFor()
    await page.reload({ waitUntil: 'networkidle' })
    await goToBoard(page)
    await page.locator(`[data-view-tab="${name}"]`).waitFor()
    assert.equal(await page.locator('[data-view-tab="All work"]').getAttribute('aria-pressed'), 'true', 'a reload starts on All work')
    await page.locator(`[data-view-tab="${name}"]`).click()
    assert.equal(await page.locator('[data-kanban-filter="label"]').inputValue(), 'mobile', 'the saved filter comes back from the backend')
    // Another project never sees it, on screen or through the API.
    await page.getByRole('button', { name: 'Project context', exact: true }).click()
    await page.getByRole('combobox', { name: 'Find project' }).fill('payments-relaunch')
    await page.getByRole('listbox', { name: 'Projects' }).getByRole('option', { name: 'payments-relaunch', exact: true }).click()
    await page.locator('[data-project-dashboard="payments-relaunch"]').waitFor()
    await page.locator('[data-project-view="board"]').click()
    await page.locator('[data-project-dashboard="payments-relaunch"] [data-kanban-screen]').waitFor()
    assert.equal(await page.locator(`[data-view-tab="${name}"]`).count(), 0, 'a view never leaks into another project')
    assert.equal((await get('/projects/payments-relaunch/views')).views.some((view) => view.name === name), false)
  } finally {
    const gone = await fetch(`${API}/projects/${PROJECT}/views/${encodeURIComponent(name)}`, { method: 'DELETE', headers: TOKEN })
    console.log(`# cleanup view "${name}": HTTP ${gone.status}`)
  }
}))
