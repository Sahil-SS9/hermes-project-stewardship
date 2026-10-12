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
import { ALL_PROJECTS, pickProject } from './test-support/project-scope.mjs'

const require = createRequire(fileURLToPath(new URL('../dashboard/package.json', import.meta.url)))
const { chromium } = require('playwright')
const BASE = process.env.STEWARD_DESKTOP_URL || 'http://127.0.0.1:19500/desktop'

const projectRow = (page, id) => page.locator(`[data-rm-node="project:${id}"]`)
const firstOf = (page, prefix) => page.locator(`[data-rm-node^="${prefix}:"]`).first()

// Sahil 04/10 + 05/10: the Roadmap follows the global switcher (its own
// project picker went). Journeys that need every project set the switcher to
// All projects first; the default test opens it as it comes.
async function openRoadmap(page, { pickAll = true } = {}) {
  await page.goto(BASE)
  if (pickAll) await pickProject(page, ALL_PROJECTS)
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
    await openRoadmap(page, { pickAll: false })

    // 1. Default with nothing remembered: the switcher is on All projects, so
    //    is the Roadmap; nothing expanded.
    assert.equal(await page.locator('.dy-sw-trigger').getAttribute('data-scope'), ALL_PROJECTS)
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

    // 8. Open jumps to the item's own screen: the initiative opens on the
    //    project's Vision screen with its details showing (design round f).
    await projectRow(page, 'payments-relaunch').click()
    await firstOf(page, 'initiative').click()
    await page.locator('[data-rm-drawer="initiative"]').waitFor()
    const opened = await page.locator('[data-rm-drawer="initiative"] h2, [data-rm-drawer="initiative"] h3').first().innerText()
    await page.locator('[data-action="roadmap-open"]').click()
    await page.locator('[data-project-view="plan"][aria-pressed="true"]').waitFor()
    await page.locator('[data-plan-drawer="initiative"]').waitFor()
    assert.equal(await page.locator('[data-plan-drawer="initiative"] h3').innerText(), opened)

    assert.deepEqual(errors, [])
  } finally {
    await browser.close()
  }
})

test('Roadmap: View in Roadmap opens that project; the global switcher re-scopes', { timeout: 120000 }, async () => {
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
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
    assert.equal(await page.locator('.dy-sw-trigger').getAttribute('data-scope'), id, 'the switcher holds the project')
  }
  try {
    // View in Roadmap: opens on the project it was clicked from.
    const current = 'payments-relaunch'
    await page.goto(BASE)
    await pickProject(page, current)
    await page.getByRole('tab', { name: /^Project/ }).click()
    await page.locator('[data-roadmap-link] a').click()
    await page.locator('[data-roadmap-screen]').waitFor()
    await scopedTo(current)
    // The switcher re-scopes an open Roadmap: another project, All projects,
    // then back (Sahil 04/10: one switcher; the Roadmap's own picker went).
    await pickProject(page, 'atlas-mobile')
    await scopedTo('atlas-mobile')
    await pickProject(page, ALL_PROJECTS)
    await showsAll()
    await pickProject(page, current)
    await scopedTo(current)
  } finally {
    await browser.close()
  }
})

test('Roadmap: Place… asks for the parent, confirms, then places in the row’s own project', { timeout: 180000 }, async () => {
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
  try {
    // All-projects scope on purpose: the dialog must act on the row's project,
    // never on whichever project happens to be listed first.
    await openRoadmap(page)
    await projectRow(page, 'payments-relaunch').click()
    // v42: each level has its own "Not placed yet" group whose item rows are
    // always listed, so the unplaced objective's Place… is reachable directly.
    const item = page.locator('[data-rm-node^="not-placed-objectives:payments-relaunch:"]').first()
    await item.waitFor()
    await item.getByRole('button', { name: 'Place…' }).click()
    const dialog = page.locator('[data-rm-place-dialog]')
    await dialog.locator('select#dy-rm-place-choice').waitFor()
    assert.match(await dialog.innerText(), /Project payments-relaunch/)
    const create = dialog.getByRole('button', { name: 'Continue' })
    assert.equal(await create.isDisabled(), true, 'nothing is chosen for the human')
    await dialog.locator('select#dy-rm-place-choice').selectOption({ index: 1 })
    await create.click()
    // The confirm step names the parent before anything is written.
    await dialog.locator('[data-rm-place-confirm]').waitFor()
    // Scope to the dialog's action row: the tree also has a "Place…" action, so
    // an unscoped match would resolve to two buttons.
    await dialog.locator('.dy-rm-modal-actions').getByRole('button', { name: 'Place' }).click()
    // Placed: the objective leaves the "Not placed yet" group.
    await page
      .waitForFunction(() => !document.querySelector('[data-rm-node^="not-placed-objectives:payments-relaunch:"]'))
      .catch(() => assert.fail('placing did not remove the objective from the not-placed group'))
  } finally {
    await browser.close()
  }
})

test('Roadmap: narrow layout keeps one column and keeps Place… reachable', { timeout: 120000 }, async () => {
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: { width: 390, height: 780 } })
  try {
    await openRoadmap(page)
    await projectRow(page, 'payments-relaunch').click()
    await page.locator('[data-rm-drawer]').waitFor()
    const columns = await page.evaluate(() => getComputedStyle(document.querySelector('.dy-rm-shell')).gridTemplateColumns.split(' ').length)
    assert.equal(columns, 1, 'narrow window renders a single column')
    // "Not placed yet" item rows are always listed with their Place… action, so
    // the action is reachable at phone width (the narrow layout hides chips,
    // never actions). The milestones group is the first one, nearest the top.
    const place = page.locator('[data-rm-node^="not-placed-milestones:payments-relaunch:"]').first().getByRole('button', { name: 'Place…' })
    await place.scrollIntoViewIfNeeded()
    assert.equal(await place.isVisible(), true, 'the narrow layout hides chips, never the Place… action')
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
      // The project picker moved to the global switcher (Sahil 04/10).
      const [search, attention, reset] = toolbar.controls
      assert.equal(toolbar.controls.length, 3, `${width}: search, attention, Reset`)
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
      if (width < 800) assert.equal(Math.round(reset.right), Math.round(search.right), `${width}: both rows end on the same edge`)
      assert.ok(toolbar.pageWidth <= width, `${width}: no sideways scroll`)
      if (width === 1280) {
        assert.equal(new Set(toolbar.controls.map((control) => control.top)).size, 1, 'wide: one row')
        // Inner fields drop their own outline, so each box must show the focus ring.
        const ring = (selector) => page.evaluate((target) => {
          const { outlineStyle, outlineWidth } = getComputedStyle(document.querySelector(`.dy-rm-toolbar ${target}`))
          return `${outlineStyle} ${outlineWidth}`
        }, selector)
        await page.getByRole('searchbox', { name: 'Search the roadmap' }).focus()
        assert.equal(await ring('.dy-rm-search'), 'solid 3px', 'focus ring on the search box')
        await page.keyboard.press('Tab')
        assert.equal(await ring('.dy-rm-attention'), 'solid 3px', 'focus ring on Needs attention only')
        await page.keyboard.press('Tab')
        assert.equal(await ring('.dy-rm-reset'), 'solid 3px', 'focus ring on Reset')
      }
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

// ---- Batch L required journeys (fix 7) ------------------------------------- //
// The confirm-as-delivered flow, driven through the real control in the Roadmap.

// Shared helpers for the R2 journeys: the suite hands the proxy base in
// STEWARD_API_URL, and the demo session token is the suite's own.
const proxyCall = async (path, init = {}) => {
  const r = await fetch(process.env.STEWARD_API_URL + path, {
    method: init.method || 'GET',
    headers: { 'x-hermes-session-token': 'demo-session-token', 'content-type': 'application/json' },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  })
  const text = await r.text()
  if (!r.ok) throw new Error(`${init.method || 'GET'} ${path} -> ${r.status} ${text.slice(0, 160)}`)
  return text ? JSON.parse(text) : {}
}
async function goToBoard(page, project) {
  await page.getByRole('button', { name: 'Project context', exact: true }).click()
  await page.getByRole('combobox', { name: 'Find project' }).fill(project)
  await page.getByRole('listbox', { name: 'Projects' }).getByRole('option', { name: project, exact: true }).click()
  await page.locator('[data-tab="project"]').click()
  await page.locator('[data-project-view="board"]').click()
  await page.locator('[data-kanban-screen]').waitFor()
}

test('Roadmap journey (a): from NOT ready, the UI drives task done + check → ready → confirm → Completed', { timeout: 240000 }, async () => {
  // R2 fix 5a. The fixture (atlas-mobile) has an executing initiative whose goal
  // holds 'Build setup screens' still in progress, so it is NOT ready when the
  // screen loads. A person: marks the task done on the board, sets the goal's
  // check in the Roadmap; the assessment is recorded through the API (there is
  // no UI control for a goal assessment) — then goal met -> objective met ->
  // milestone reached -> Ready to confirm -> confirm -> Completed after a reload.
  const roadmap = await proxyCall('/roadmap?project_id=atlas-mobile')
  const project = roadmap.projects[0]
  const initiative = project.initiatives.find((i) => i.title === 'Make setup effortless')
  const milestone = project.milestones.find((m) => m.initiative_ref === initiative.ref)
  const objective = project.objectives.find((o) => o.milestone_id === milestone.id)
  const goal = project.goals.find((g) => g.objective_id === objective.id)
  const task = (goal.tasks ?? []).find((t) => t.title === 'Build setup screens')
  assert.ok(task, 'the fixture task is under the goal')

  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  page.setDefaultTimeout(12000)
  try {
    // 1. Mark the last task done through the board's Move control.
    await page.goto(BASE, { waitUntil: 'networkidle' })
    await goToBoard(page, 'atlas-mobile')
    // The Move control lives on the expanded card.
    const card = page.locator('[data-work-card]').filter({ has: page.locator('.dy-kb-title').getByText('Build setup screens', { exact: true }) })
    await card.locator('[data-card-toggle]').click()
    await page.locator(`[data-card-move="${task.ref}"]`).waitFor()
    await page.locator(`[data-card-move="${task.ref}"]`).selectOption('done')
    await page.waitForTimeout(600)
    // 2. Set the goal's check through the rendered control in the Roadmap.
    await openRoadmap(page)
    await projectRow(page, 'atlas-mobile').click()
    await page.locator('[data-rm-node^="initiative:"]').filter({ hasText: 'Make setup effortless' }).first().click()
    await page.locator('[data-rm-node^="milestone:"]').first().click()
    await page.locator('[data-rm-node^="objective:"]').first().click()
    await page.locator('[data-rm-node^="goal:"]').first().click()
    const editor = page.locator('[data-rm-goal-check]')
    await editor.waitFor()
    await editor.getByRole('button', { name: 'Set check' }).click()
    await editor.locator('[data-rm-check-target]').fill('>=1')
    await editor.getByRole('button', { name: 'Save check' }).click()
    await page.waitForTimeout(600)
    // 3. Record the passing assessments. A goal check has no UI control (the
    // API carries it); the OBJECTIVE's manual assessment DOES have one (the
    // Vision objective drawer's evidence panel) but this journey drives the
    // goal level, so both are recorded through the API and said so here.
    await proxyCall(`/projects/atlas-mobile/goals/${goal.id}/assessment`, {
      method: 'POST', body: { passed: true, evidence: ['journey:1'] } })
    await proxyCall(`/projects/atlas-mobile/objectives/${objective.id}/assessment`, {
      method: 'POST', body: { passed: true, evidence: ['journey:1'] } })
    // 4. The chain rolls up: goal met -> objective met -> milestone reached.
    await openRoadmap(page)
    await projectRow(page, 'atlas-mobile').click()
    const ready = page.locator('[data-rm-node^="initiative:"]').filter({ hasText: 'Make setup effortless' }).first()
    await ready.waitFor()
    assert.match(await ready.innerText(), /Ready to confirm/)
    await ready.getByRole('button', { name: 'Confirm as delivered' }).click()
    const dialog = page.locator('[data-rm-confirm-dialog]')
    await dialog.waitFor()
    await dialog.getByRole('button', { name: 'Confirm as delivered' }).click()
    // 5. Completed after a reload, with the ready state gone.
    await page.reload({ waitUntil: 'networkidle' })
    await openRoadmap(page)
    await projectRow(page, 'atlas-mobile').click()
    const done = page.locator('[data-rm-node^="initiative:"]').filter({ hasText: 'Make setup effortless' }).first()
    await done.waitFor()
    assert.equal(await done.getByRole('button', { name: 'Confirm as delivered' }).count(), 0, 'no confirm action after delivery')
    assert.equal(await done.getByText('Ready to confirm').count(), 0, 'the ready chip clears')
    const after = await proxyCall('/roadmap?project_id=atlas-mobile')
    assert.equal(after.projects[0].initiatives.find((i) => i.title === 'Make setup effortless').governance, 'completed')
  } finally {
    await browser.close()
  }
})

test('Roadmap journey (b): a stale state shows the 409 refusal in plain words and stays executing', { timeout: 240000 }, async () => {
  // R2 fix 5b. The initiative is READY when the screen loads; a milestone
  // becomes not-reached through the BACKEND; Confirm is pressed and the 409
  // message appears in plain words while the initiative stays executing.
  const roadmap = await proxyCall('/roadmap?project_id=payments-relaunch')
  const project = roadmap.projects[0]
  const initiative = project.initiatives.find((i) => i.title === 'Confirm me when ready')
  const milestone = project.milestones.find((m) => m.initiative_ref === initiative.ref)
  const objective = project.objectives.find((o) => o.milestone_id === milestone.id)

  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
  page.setDefaultTimeout(12000)
  try {
    await openRoadmap(page)
    await projectRow(page, 'payments-relaunch').click()
    const row = page.locator('[data-rm-node^="initiative:"]').filter({ hasText: 'Confirm me when ready' }).first()
    await row.waitFor()
    assert.match(await row.innerText(), /Ready to confirm/, 'ready when the screen loads')
    await row.getByRole('button', { name: 'Confirm as delivered' }).click()
    const dialog = page.locator('[data-rm-confirm-dialog]')
    await dialog.waitFor()
    // The state changes behind the screen: the objective fails its assessment.
    await proxyCall(`/projects/payments-relaunch/objectives/${objective.id}/assessment`, {
      method: 'POST', body: { passed: false, evidence: ['journey:stale'] } })
    // Press Confirm: the refusal is shown in plain words.
    await dialog.getByRole('button', { name: 'Confirm as delivered' }).click()
    await page.waitForFunction(() => /not ready to confirm|every milestone must be reached/i.test(document.querySelector('[data-rm-confirm-dialog]')?.textContent ?? ''))
    const shown = await dialog.innerText()
    assert.match(shown, /not ready to confirm|every milestone must be reached/i, 'the refusal is shown in plain words')
    const after = await proxyCall('/roadmap?project_id=payments-relaunch')
    assert.equal(after.projects[0].initiatives.find((i) => i.title === 'Confirm me when ready').governance, 'executing', 'still executing after the refusal')
    // Restore the fixture: the assessment passes again.
    await proxyCall(`/projects/payments-relaunch/objectives/${objective.id}/assessment`, {
      method: 'POST', body: { passed: true, evidence: ['journey:restore'] } })
  } finally {
    await browser.close()
  }
})

test('Roadmap journey (c): a Needs-placing item is placed by hand and gone', { timeout: 180000 }, async () => {
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
  try {
    // Needs-placing: placing the unlinked MILESTONE under an initiative removes
    // it from the "Not placed yet" group. (The unplaced objective is used by the
    // Place… test above; this drives the milestone group so the two do not race
    // for the same row on the shared disposable backend.)
    await openRoadmap(page)
    await projectRow(page, 'payments-relaunch').click()
    const item = page.locator('[data-rm-node^="not-placed-milestones:payments-relaunch:"]').first()
    await item.waitFor()
    await item.getByRole('button', { name: 'Place…' }).click()
    const dialog = page.locator('[data-rm-place-dialog]')
    await dialog.locator('select#dy-rm-place-choice').waitFor()
    await dialog.locator('select#dy-rm-place-choice').selectOption({ index: 1 })
    await dialog.getByRole('button', { name: 'Continue' }).click()
    await dialog.locator('[data-rm-place-confirm]').waitFor()
    await dialog.locator('.dy-rm-modal-actions').getByRole('button', { name: 'Place' }).click()
    // Placed: the milestone is gone from the "Not placed yet" group.
    await page
      .waitForFunction(() => !document.querySelector('[data-rm-node^="not-placed-milestones:payments-relaunch:"]'))
  } finally {
    await browser.close()
  }
})

// Batch L R2 fix 2: the goal-check editor, driven through the real control.
test('Roadmap: a person sets a goal check through the rendered control, and clears it', { timeout: 180000 }, async () => {
  // A goal of its own, so the test never depends on which tree row comes first.
  const API = process.env.STEWARD_API_URL
  const TOKEN = { 'x-hermes-session-token': 'demo-session-token' }
  const call = async (path, init = {}) => {
    const r = await fetch(API + path, { method: init.method || 'GET', headers: { ...TOKEN, 'content-type': 'application/json' }, body: init.body === undefined ? undefined : JSON.stringify(init.body) })
    const text = await r.text()
    if (!r.ok) throw new Error(`${init.method || 'GET'} ${path} -> ${r.status} ${text.slice(0, 160)}`)
    return text ? JSON.parse(text) : {}
  }
  const goal = await call('/projects/payments-relaunch/goals', { method: 'POST', body: { title: 'Editor goal', objective_ids: [] } })
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
  page.setDefaultTimeout(12000)
  try {
    const node = `not-placed-goals:payments-relaunch:${goal.goal_id}`
    const openGoal = async () => {
      await openRoadmap(page)
      await projectRow(page, 'payments-relaunch').click()
      const row = page.locator(`[data-rm-node="${node}"]`)
      await row.waitFor()
      await row.click()
      await page.locator('[data-rm-goal-check]').waitFor()
    }
    // The editor reads the check's own endpoint: wait for the detail to land.
    const settled = (pattern) => page.waitForFunction((p) => new RegExp(p).test(document.querySelector('[data-rm-check-state]')?.textContent ?? ''), pattern)
    await openGoal()
    const editor = page.locator('[data-rm-goal-check]')
    await settled('none')
    assert.match(await editor.locator('[data-rm-check-state]').innerText(), /none/)
    await editor.getByRole('button', { name: 'Set check' }).click()
    await editor.locator('[data-rm-check-target]').fill('>=1')
    await editor.getByRole('button', { name: 'Save check' }).click()
    // After a reload the check is there, with the goal's state derived from it
    // (an unassessed manual check is honestly unknown, never met).
    await page.waitForTimeout(600)
    await openGoal()
    await settled('>=1')
    assert.match(await editor.locator('[data-rm-check-state]').innerText(), />=1/)
    assert.match(await editor.locator('[data-rm-check-state]').innerText(), /unknown/i)
    const stored = await call(`/projects/payments-relaunch/goals/${goal.goal_id}/check`)
    assert.equal(stored.check.target, '>=1')
    // Clearing it through the same control removes the check (state restored).
    await editor.getByRole('button', { name: 'Edit check' }).click()
    await editor.getByRole('button', { name: 'Clear check' }).click()
    await page.waitForTimeout(600)
    await openGoal()
    await settled('none')
    assert.match(await editor.locator('[data-rm-check-state]').innerText(), /none/)
    assert.equal((await call(`/projects/payments-relaunch/goals/${goal.goal_id}/check`)).check, null)
  } finally {
    await browser.close()
  }
})

test('Roadmap: mark a step no longer required through the row, then restore it', { timeout: 180000 }, async () => {
  // v43: the deadlock this closes — a blocked chain becomes deliverable
  // without faking a completion, and the decision is reversible.
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
  const errors = []
  page.on('pageerror', (error) => errors.push(String(error)))
  try {
    await openRoadmap(page, { pickAll: false })
    await projectRow(page, 'waivers-demo').click()
    const initiative = page.locator('[data-rm-node^="initiative:"]', { hasText: 'Waive me to deliver' })
    await initiative.waitFor()
    // Not ready to start with: nothing on the row offers a confirmation.
    assert.equal(await initiative.locator('[data-action="roadmap-confirm-delivered"]').count(), 0)
    await initiative.click()
    const milestone = page.locator('[data-rm-node^="milestone:"]', { hasText: 'Waivable milestone' })
    await milestone.click()
    const objective = page.locator('[data-rm-node^="objective:"]', { hasText: 'Waivable objective' })
    await objective.locator('[data-action="roadmap-waive"]').click()

    // The dialog asks WHY, and refuses to submit without a reason.
    const dialog = page.locator('[data-rm-waive-dialog]')
    await dialog.waitFor()
    const submit = dialog.getByRole('button', { name: 'Mark as no longer required' })
    assert.equal(await submit.isDisabled(), true, 'no reason, no waiver')
    await dialog.locator('[data-rm-waive-reason]').fill('delivered under the old plan; out of scope now')
    await submit.click()
    await dialog.waitFor({ state: 'detached' })

    // The item stays, marked with the reason, and the chain is now deliverable.
    const marked = page.locator('[data-rm-node^="objective:"]')
      .filter({ hasText: 'No longer required — delivered under the old plan; out of scope now' })
    await marked.waitFor()
    await page.locator('[data-rm-node^="initiative:"]', { hasText: 'Waive me to deliver' })
      .getByText('Ready to confirm').waitFor()

    // Restore puts it back in the chain: the mark goes and the block returns.
    await objective.locator('[data-action="roadmap-restore-requirement"]').click()
    await marked.waitFor({ state: 'detached' })
    await page.locator('[data-rm-node^="initiative:"]', { hasText: 'Waive me to deliver' })
      .getByText('Ready to confirm').waitFor({ state: 'detached' })
    assert.deepEqual(errors, [])
  } finally {
    await browser.close()
  }
})
