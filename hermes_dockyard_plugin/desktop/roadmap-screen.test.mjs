// R2 Phase C — Roadmap screen end-to-end through the REAL plugin bundle and
// REAL backend (disposable data): tab present, all projects by default, tree
// drill-down to work items, objective -> goal context with the read-only goal
// contract, Open jumps to the item's own screen, keyboard navigation, search
// reveals ancestors, attention filter + Reset, the two-step Link… flow with
// an explicit initiative choice, the right project in All-projects scope, and
// the narrow layout. No mocks.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const require = createRequire(fileURLToPath(new URL('../dashboard/package.json', import.meta.url)))
const { chromium } = require('playwright')
const BASE = process.env.STEWARD_DESKTOP_URL || 'http://127.0.0.1:19500/desktop'

const projectRow = (page, id) => page.locator(`[data-rm-node="project:${id}"]`)
const firstOf = (page, prefix) => page.locator(`[data-rm-node^="${prefix}:"]`).first()

async function openRoadmap(page) {
  await page.goto(BASE)
  await page.getByRole('tab', { name: 'Roadmap' }).click()
  await page.locator('[data-roadmap-screen]').waitFor()
  await page
    .waitForFunction(() => document.querySelectorAll('[data-rm-node^="project:"]').length >= 2)
    .catch(() => assert.fail('the Roadmap lists projects'))
}

test('Roadmap: all projects by default, drill-down, drawer, contract, Open, keyboard, search, reset', { timeout: 180000 }, async () => {
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
  const errors = []
  page.on('pageerror', (error) => errors.push(String(error)))
  try {
    await openRoadmap(page)

    // 1. Signed default: All projects, whatever the global picker holds; nothing expanded.
    assert.equal(await page.locator('[data-roadmap-screen] select[aria-label="Roadmap project picker"]').inputValue(), 'all')
    assert.equal(await page.locator('.dy-rm-tree-head strong').innerText(), 'All projects')
    assert.equal(await page.locator('[data-rm-node^="initiative:"]').count(), 0, 'nothing expanded on load')

    // 2. Open payments-relaunch: its initiative appears; the drawer shows the project.
    await projectRow(page, 'payments-relaunch').click()
    await firstOf(page, 'initiative').waitFor()
    const drawer = page.locator('[data-rm-drawer]')
    await page.locator('[data-rm-drawer="project"]').waitFor()

    // 3. Initiative, then its milestone: honest delivery facts, no percentage.
    await firstOf(page, 'initiative').click()
    await firstOf(page, 'milestone').click()
    await page.locator('[data-rm-drawer="milestone"]').waitFor()
    const drawerText = await drawer.innerText()
    assert.ok(!/(\d+\s*%|percent)/i.test(drawerText), 'no percentage in the drawer')
    assert.match(drawerText, /No linked work|Total linked/)

    // 4. Objective -> Goal: the goal drawer shows the read-only contract,
    //    loaded from the goal's own project (All-projects scope).
    await firstOf(page, 'objective').click()
    await firstOf(page, 'goal').click()
    await page.locator('[data-rm-drawer="goal"]').waitFor()
    await drawer.getByText('Verification').waitFor()
    await drawer.getByText('suite green').waitFor()
    await drawer.getByText('no downtime').waitFor()
    await drawer.getByText('Copied from the goal title').waitFor()
    assert.equal(await drawer.getByRole('textbox').count(), 0, 'the contract is read-only')

    // 5. Keyboard: one roving tab stop; arrows move it; Left goes to the parent.
    assert.equal(await page.locator('[data-rm-tree] [data-rm-row][tabindex="0"]').count(), 1, 'exactly one row is in the tab order')
    await projectRow(page, 'payments-relaunch').focus()
    await page.keyboard.press('ArrowDown')
    const focused = await page.evaluate(() => document.activeElement?.getAttribute('data-rm-node') ?? '')
    assert.match(focused, /^initiative:/, 'ArrowDown moves to the first child')
    await page.keyboard.press('ArrowLeft')
    await page.keyboard.press('ArrowLeft')
    assert.equal(await page.evaluate(() => document.activeElement?.getAttribute('data-rm-node')), 'project:payments-relaunch', 'Left closes, then moves to the parent')
    assert.equal(await page.locator('[data-rm-tree] [data-rm-row][tabindex="0"]').count(), 1, 'still one tab stop')

    // 6. Search reveals ancestors: a milestone name opens its project and initiative.
    await page.getByRole('button', { name: 'Reset' }).click()
    await page.getByRole('searchbox', { name: 'Search the roadmap' }).fill('pilot release')
    await page
      .waitForFunction(() => document.querySelectorAll('[data-rm-node^="milestone:"]').length > 0)
      .catch(() => assert.fail('search did not reveal the milestone ancestors'))

    // 7. Attention filter and Reset.
    await page.getByRole('searchbox', { name: 'Search the roadmap' }).fill('')
    await page.getByRole('checkbox', { name: /Needs attention only/i }).check()
    await page.getByRole('button', { name: 'Reset' }).click()
    assert.equal(await page.locator('[data-rm-node^="initiative:"]').count(), 0, 'reset collapses the tree')
    assert.equal(await page.getByRole('checkbox', { name: /Needs attention only/i }).isChecked(), false)

    // 8. Open jumps to the item's own screen: the initiative opens Project > Initiatives.
    await projectRow(page, 'payments-relaunch').click()
    await firstOf(page, 'initiative').click()
    await page.locator('[data-rm-drawer="initiative"]').waitFor()
    await page.locator('[data-action="roadmap-open"]').click()
    await page.locator('[data-project-view="initiative"][aria-pressed="true"]').waitFor()

    assert.deepEqual(errors, [])
  } finally {
    await browser.close()
  }
})

test('Roadmap: View in Roadmap opens that project; the global picker re-scopes', { timeout: 120000 }, async () => {
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
  const picker = page.getByRole('button', { name: 'Project context', exact: true })
  const pick = async (id) => {
    await picker.click()
    await page.getByRole('combobox', { name: 'Find project' }).fill(id)
    await page.getByRole('listbox', { name: 'Projects' }).getByRole('option', { name: id, exact: true }).click()
  }
  const showsAll = () => page
    .waitForFunction(() => document.querySelectorAll('[data-rm-node^="project:"]').length >= 2)
    .catch(() => assert.fail('the Roadmap did not show all projects'))
  const scopedTo = async (id) => {
    await page
      .waitForFunction((want) => {
        const rows = [...document.querySelectorAll('[data-rm-node^="project:"]')]
        return rows.length === 1 && rows[0].getAttribute('data-rm-node') === `project:${want}`
      }, id)
      .catch(() => assert.fail(`the Roadmap did not narrow to ${id}`))
    assert.equal(await page.locator('[data-roadmap-screen] select[aria-label="Roadmap project picker"]').inputValue(), id)
  }
  try {
    // View in Roadmap: opens on the project it was clicked from.
    await page.goto(BASE)
    await page.getByRole('tab', { name: /^Project/ }).click()
    const current = (await picker.innerText()).trim()
    await page.locator('[data-roadmap-link] a').click()
    await page.locator('[data-roadmap-screen]').waitFor()
    await scopedTo(current)
    // The global picker re-scopes an open Roadmap: another project, then the
    // one it already holds (the Roadmap reopens on All, so that narrows too).
    const other = current === 'atlas-mobile' ? 'mobile-client' : 'atlas-mobile'
    for (const id of [other, other]) {
      await page.getByRole('button', { name: 'Reset' }).click()
      await showsAll()
      await pick(id)
      await scopedTo(id)
    }
  } finally {
    await browser.close()
  }
})

test('Roadmap: Link… asks for the initiative, confirms, then links in the row’s own project', { timeout: 180000 }, async () => {
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
  try {
    // All-projects scope on purpose: the dialog must act on the row's project,
    // never on whichever project happens to be listed first.
    await openRoadmap(page)
    await projectRow(page, 'payments-relaunch').click()
    const group = page.locator('[data-rm-node="unlinked-objectives:payments-relaunch"]')
    await group.waitFor()
    await group.getByRole('button', { name: 'Link…' }).click()
    const dialog = page.locator('[data-rm-link-dialog]')
    await dialog.locator('select#dy-rm-link-choice').waitFor()
    assert.match(await dialog.innerText(), /Project payments-relaunch/)
    const create = dialog.getByRole('button', { name: 'Continue' })
    assert.equal(await create.isDisabled(), true, 'nothing is chosen for the human')
    await dialog.locator('select#dy-rm-link-choice').selectOption({ label: 'Unlinked objective for linking' })
    assert.equal(await create.isDisabled(), true, 'the initiative must be chosen too')
    await dialog.locator('select#dy-rm-link-initiative').selectOption({ index: 1 })
    await create.click()
    // Confirm step names both ends before anything is written.
    await dialog.locator('[data-rm-link-confirm]').getByText('Unlinked objective for linking', { exact: false }).waitFor()
    await dialog.getByRole('button', { name: 'Create link' }).click()
    await page
      .waitForFunction(() => !document.querySelector('[data-rm-node="unlinked-objectives:payments-relaunch"]')?.innerText.includes('Unlinked objective for linking'))
      .catch(() => assert.fail('linking did not remove the objective from the unlinked group'))
  } finally {
    await browser.close()
  }
})

test('Roadmap: narrow layout keeps one column and keeps Link… reachable', { timeout: 120000 }, async () => {
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: { width: 390, height: 780 } })
  try {
    await openRoadmap(page)
    await projectRow(page, 'payments-relaunch').click()
    await firstOf(page, 'initiative').click()
    await page.locator('[data-rm-drawer]').waitFor()
    const columns = await page.evaluate(() => getComputedStyle(document.querySelector('.dy-rm-shell')).gridTemplateColumns.split(' ').length)
    assert.equal(columns, 1, 'narrow window renders a single column')
    const link = page.locator('[data-rm-node="unlinked-milestones:payments-relaunch"]').getByRole('button', { name: 'Link…' })
    assert.equal(await link.isVisible(), true, 'the narrow layout hides chips, never the Link… action')
  } finally {
    await browser.close()
  }
})

test('Roadmap styles use only colour tokens the shell defines for BOTH themes', () => {
  const read = (file) => readFileSync(fileURLToPath(new URL(file, import.meta.url)), 'utf8')
  const shell = read('./src/styles/dockyard-css.js')
  const block = (selector) => {
    const start = shell.indexOf(`${selector} {`)
    assert.ok(start >= 0, `${selector} block exists`)
    // The block closes on a line of its own; values like ${LIGHT_TOKENS.bg} contain '}'.
    const end = shell.indexOf('\n}', start)
    assert.ok(end > start, `${selector} block closes`)
    return shell.slice(start, end)
  }
  const tokens = (text) => new Set([...text.matchAll(/(--dy-[a-z0-9-]+)\s*:/g)].map((match) => match[1]))
  const light = tokens(block('.dockyard-root'))
  const dark = tokens(block('.dockyard-root[data-theme="dark"]'))
  const roadmap = read('./src/styles/roadmap-css.js')
  const used = [...new Set([...roadmap.matchAll(/var\(\s*(--dy-[a-z0-9-]+)/g)].map((match) => match[1]))]
  assert.ok(used.length > 5, 'the Roadmap styles read the shell tokens')
  assert.deepEqual(used.filter((token) => !light.has(token)), [], 'every token exists in the light theme')
  assert.deepEqual(used.filter((token) => !dark.has(token)), [], 'every token exists in the dark theme')
  assert.doesNotMatch(roadmap, /var\(--dy-[a-z0-9-]+\s*,/, 'no fallback colours: they hide a missing token in dark mode')
})

test('Roadmap: filter controls are one consistent size, wide and on a phone', { timeout: 120000 }, async () => {
  const browser = await chromium.launch({ headless: true })
  try {
    for (const width of [1280, 768, 390]) {
      const page = await browser.newPage({ viewport: { width, height: 900 } })
      await openRoadmap(page)
      const toolbar = await page.evaluate(() => ({
        controls: [...document.querySelectorAll('.dy-rm-toolbar > *')].map((el) => {
          const box = el.getBoundingClientRect(); const style = getComputedStyle(el)
          return { name: el.className, top: Math.round(box.top), right: box.right, height: Math.round(box.height), radius: style.borderTopLeftRadius, font: style.fontSize, border: style.borderTopWidth }
        }),
        pageWidth: document.documentElement.scrollWidth,
      }))
      const [scope, search, attention, reset] = toolbar.controls
      assert.equal(toolbar.controls.length, 4, `${width}: project, search, attention, Reset`)
      assert.match(scope.name, /dy-rm-scope/, `${width}: signed order starts with the project picker`)
      assert.match(search.name, /dy-rm-search/)
      assert.match(attention.name, /dy-rm-attention/)
      assert.match(reset.name, /dy-rm-reset/)
      for (const control of toolbar.controls) {
        assert.equal(control.height, 38, `${width}: ${control.name} is 38px tall`)
        assert.equal(control.radius, '6px', `${width}: ${control.name} has the shared radius`)
        assert.equal(control.font, '13px', `${width}: ${control.name} has the shared text size`)
        assert.equal(control.border, '1px', `${width}: ${control.name} is a bordered control`)
        assert.ok(control.right <= width, `${width}: ${control.name} stays on screen`)
      }
      assert.equal(attention.top, reset.top, `${width}: attention and Reset share a row`)
      if (width === 1280) assert.equal(new Set(toolbar.controls.map((control) => control.top)).size, 1, 'wide: one row')
      assert.ok(toolbar.pageWidth <= width, `${width}: no sideways scroll`)
      await page.close()
    }
  } finally {
    await browser.close()
  }
})

test('Roadmap: dark theme recolours the toolbar, tree, chips and drawer', { timeout: 120000 }, async () => {
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
  try {
    await openRoadmap(page)
    await projectRow(page, 'payments-relaunch').click()
    await firstOf(page, 'initiative').click()
    await page.locator('[data-rm-drawer="initiative"]').waitFor()
    const plainChip = '.dy-rm-chip:not(.attention):not(.blocked):not(.passed):not(.failed):not(.overdue)'
    const read = () => page.evaluate((plain) => {
      const root = document.querySelector('.dockyard-root')
      const token = (name, property) => {
        const probe = document.createElement('div')
        probe.style[property] = `var(${name})`
        root.append(probe)
        const value = getComputedStyle(probe)[property]
        probe.remove()
        return value
      }
      const style = (selector) => getComputedStyle(document.querySelector(selector))
      return {
        actual: {
          control: style('.dy-rm-toolbar .dy-rm-control').backgroundColor,
          treeHead: style('.dy-rm-tree-head').backgroundColor,
          chip: style(plain).backgroundColor,
          attentionChip: style('.dy-rm-chip.attention').backgroundColor,
          detail: style('.dy-rm-copy small').color,
          drawerHead: style('.dy-rm-drawer-head').backgroundColor,
        },
        expected: {
          control: token('--dy-surface', 'backgroundColor'),
          treeHead: token('--dy-surface-subtle', 'backgroundColor'),
          chip: token('--dy-surface-subtle', 'backgroundColor'),
          attentionChip: token('--dy-warning-bg', 'backgroundColor'),
          detail: token('--dy-text-2', 'color'),
          drawerHead: token('--dy-surface-subtle', 'backgroundColor'),
        },
      }
    }, plainChip)
    const light = await read()
    assert.deepEqual(light.actual, light.expected, 'light theme: Roadmap surfaces follow the shell tokens')
    await page.evaluate(() => document.querySelector('.dockyard-root').setAttribute('data-theme', 'dark'))
    const dark = await read()
    assert.deepEqual(dark.actual, dark.expected, 'dark theme: Roadmap surfaces follow the shell tokens')
    for (const part of Object.keys(light.actual)) {
      assert.notEqual(dark.actual[part], light.actual[part], `${part} changes colour in dark mode`)
    }
  } finally {
    await browser.close()
  }
})
