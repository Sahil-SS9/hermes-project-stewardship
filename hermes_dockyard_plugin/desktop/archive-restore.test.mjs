// Archive and Restore in the Desktop, end to end through the REAL plugin
// bundle, proxy and backend (disposable data). Owner decisions 10/10/2026 and
// 11/10/2026 (Sahil picked option A: archived projects live in the project
// switcher):
// - with nothing archived, the switcher offers no archived entry;
// - Archive asks first, says the project is hidden everywhere and where to
//   restore it, then leaves the project for All projects;
// - an archived project is in no project list: not the switcher, not the
//   Dashboard;
// - the design-review choice is gone: ?review=1&archived=settings changes
//   nothing, and App settings has no archived section;
// - the switcher's menu offers "Archived projects (1)", whose list says what
//   Restore brings back; Restore asks first, then opens the project;
// - the project comes back exactly as it was: still switched off (the old
//   Restore switched every project on), same phase, pause time and settings.
// legacy-integration is the fixtures' switched-off project. If any step fails
// the test restores it through the API, so later tests in the shared backend
// see it as before.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { chromium } from './browser-harness.mjs'
import { rememberedProject, restoreRememberedProject } from './test-support/project-scope.mjs'

const BASE = process.env.STEWARD_DESKTOP_URL
const API = process.env.STEWARD_API_URL
const HEADERS = { 'x-hermes-session-token': 'demo-session-token' }
const PROJECT = 'legacy-integration'
const WHERE = 'the project switcher > Archived projects'

async function api(path, method = 'GET') {
  const response = await fetch(`${API}${path}`, { method, headers: { ...HEADERS, 'content-type': 'application/json' }, body: method === 'GET' ? undefined : '{}' })
  if (!response.ok) throw new Error(`${method} ${path} -> ${response.status}: ${await response.text()}`)
  return response.json()
}

// Everything Restore must bring back; updated_at and the archive stamps are
// the only fields an archive and restore may change.
async function projectState() {
  const settings = await api(`/projects/${PROJECT}/settings`)
  const { updated_at: _updated, archived_at: archivedAt, archived_by: _by, ...kept } = settings
  return { archivedAt, kept }
}

const switcher = (page) => page.getByRole('button', { name: 'Project context', exact: true })
const toast = (page, pattern) => page.locator('[data-toast-region] [role="status"]').filter({ hasText: pattern })

async function openSwitcher(page) {
  await switcher(page).click()
  await page.getByRole('listbox', { name: 'Projects' }).waitFor()
}

async function closeSwitcher(page) {
  await page.keyboard.press('Escape')
  await page.getByRole('listbox', { name: 'Projects' }).waitFor({ state: 'detached' })
}

test('Archive hides a project everywhere; the switcher lists it; Restore brings it back exactly and opens it', { timeout: 120000 }, async () => {
  assert.ok(BASE && API, 'Run via run-browser-suite.mjs')
  assert.deepEqual((await api('/projects/archived')).projects, [], 'the test starts with nothing archived')
  const before = await projectState()
  assert.equal(before.kept.enabled, false, 'legacy-integration is the fixtures\' switched-off project')
  const remembered = await rememberedProject(API, HEADERS)
  const browser = await chromium.launch({ headless: true })
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 820 } })
    page.setDefaultTimeout(10000)
    const errors = []
    page.on('pageerror', (error) => errors.push(String(error)))
    // The old design-review link: it changes nothing now.
    await page.goto(`${BASE}?review=1&archived=settings`, { waitUntil: 'networkidle' })
    await page.locator('section[aria-label="Fleet summary"]').waitFor()
    assert.equal(await page.locator('[data-archive-review], [data-review-choice]').count(), 0, 'no design-review bar')

    // Nothing archived: no archived entry in the switcher.
    await openSwitcher(page)
    assert.equal(await page.locator('[data-switcher-archived]').count(), 0, 'no archived entry while nothing is archived')
    await closeSwitcher(page)

    // Archive from Project > Settings: it asks first and says where to restore.
    await openSwitcher(page)
    await page.getByRole('combobox', { name: 'Find project' }).fill(PROJECT)
    await page.locator(`[role="listbox"] [data-project-option="${PROJECT}"]`).click()
    await page.locator(`.dy-sw-trigger[data-scope="${PROJECT}"]`).waitFor()
    await page.locator('[data-tab="project"]').click()
    await page.locator('[data-project-view="settings"]').click()
    await page.locator('[data-lifecycle-action="archive"]').click()
    const confirmText = await page.locator('[data-lifecycle-confirm-text="archive"]').innerText()
    assert.match(confirmText, /will be hidden everywhere/)
    assert.match(confirmText, /Nothing is deleted: its Hermes project, board, tasks and repository stay exactly as they are/)
    assert.ok(confirmText.includes(`Restore it any time from ${WHERE}, and it comes back exactly as it is now (switched off, ${before.kept.phase})`), confirmText)
    assert.equal((await projectState()).archivedAt, null, 'nothing changes before the confirmation')
    await page.locator('[data-action="confirm-lifecycle-action"]').click()

    // It leaves the project for All projects and says where to restore it.
    await page.locator('.dy-sw-trigger[data-scope="*"]').waitFor()
    await toast(page, `${PROJECT} is archived: hidden everywhere, nothing deleted. Restore it any time from ${WHERE}.`).waitFor()
    await page.locator('section[aria-label="Fleet summary"]').waitFor()
    assert.ok((await projectState()).archivedAt, 'the backend archived it')
    await page.waitForLoadState('networkidle')
    assert.doesNotMatch(await page.locator('#dockyard-panel').innerText(), new RegExp(PROJECT), 'the Dashboard does not show the archived project')

    // App settings has no archived section, whatever the address says.
    await page.locator('[data-tab="settings"]').click()
    await page.locator('[data-app-setting="appearance"]').waitFor()
    assert.equal(await page.locator('[data-app-setting="archived"]').count(), 0, 'App settings has no archived section')
    assert.equal(await page.locator('[data-archive-review], [data-review-choice]').count(), 0, 'no design-review bar in App settings')
    await page.locator('[data-tab="dashboard"]').click()
    await page.locator('section[aria-label="Fleet summary"]').waitFor()

    // The switcher offers the archived list (so its lists have refreshed), and
    // no longer offers the project.
    await openSwitcher(page)
    assert.equal((await page.locator('[data-switcher-archived]').innerText()).trim(), 'Archived projects (1)')
    assert.equal(await page.locator(`[role="listbox"] [data-project-option="${PROJECT}"]`).count(), 0, 'the switcher does not offer the archived project')
    await page.locator('[data-switcher-archived]').click()
    const row = page.locator(`[data-archived-dialog] [data-archived-project="${PROJECT}"]`)
    await row.waitFor()
    assert.match(await row.innerText(), new RegExp(`comes back switched off, ${before.kept.phase}`))

    // Restore asks first, then opens the project, exactly as it was.
    await row.locator(`[data-restore-project="${PROJECT}"]`).click()
    const ask = await row.getByRole('group', { name: `Restore ${PROJECT}` }).innerText()
    assert.match(ask, new RegExp(`It comes back exactly as it was archived \\(switched off, ${before.kept.phase}\\)`))
    assert.ok((await projectState()).archivedAt, 'nothing changes before the confirmation')
    await row.locator('[data-action="confirm-restore"]').click()
    await page.locator('[data-archived-dialog]').waitFor({ state: 'detached' })
    await page.locator(`.dy-sw-trigger[data-scope="${PROJECT}"]`).waitFor()
    await page.locator('[data-tab="project"][aria-selected="true"]').waitFor()
    await toast(page, `${PROJECT} is back, exactly as it was archived: switched off, ${before.kept.phase}.`).waitFor()
    assert.deepEqual(await projectState(), before, 'Restore brought back exactly what was archived')

    // Listed again once the lists refresh (Restore opens the project at once,
    // and the refresh lands a moment later); the archived entry goes with the
    // last archived project.
    await openSwitcher(page)
    await page.locator(`[role="listbox"] [data-project-option="${PROJECT}"]`).waitFor()
    await page.locator('[data-switcher-archived]').waitFor({ state: 'detached' })
    await closeSwitcher(page)
    assert.deepEqual(errors, [], 'no page errors')
  } finally {
    await browser.close()
    if ((await projectState()).archivedAt) await api(`/projects/${PROJECT}/restore`, 'POST')
    await restoreRememberedProject(API, HEADERS, remembered)
  }
})
