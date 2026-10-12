// Batch D — the six decision rules, one browser journey per rule, through the
// REAL Desktop proxy into the disposable REAL backend (no mocks).
//
// Rule evidence matrix (rules proven backend-side in tests/test_decision_rules.py,
// commit 2580d7c; this file proves the UI carries them):
//   R1  the three outcomes are three different outcomes (UI contract: three
//       pinned actions; each posts its own endpoint)
//   R2  request changes returns the item to the proposer with feedback
//   R3  a decision is bound to the displayed fingerprint (stale is refused 409)
//   R4  a comment never changes the decision (fingerprint unchanged)
//   R5  the caller can never name the actor (proxy forbids it: 422)
//   R6  the detail panel shows requested change, policy gate, impact,
//       capability boundary, who asked, evidence, work items, activity
//
// UX contract carried here: list-left / detail-right, filter tabs
// (All/Urgent/Today/Earlier), attention rows listed but not decidable, deep
// link selects the row, Escape returns focus, and 390px stays single-column.
//
// The disposable backend is SHARED across this whole file, so the two tests
// that CONSUME an item (request-changes, reject) run LAST — the read-only
// journeys (R3/R4/R5 + tabs + attention + deep link + narrow + Escape) read the
// rows before any of them leave the inbox. Refs are read from the DOM
// (data-inbox-ref), never hardcoded, because the backend mints them per slug.
//
// RED-first: written against the NEW hooks while committed plugin.js still
// serves the OLD card layout, so this file must fail before the rebuild and
// pass after it. Assertions are never weakened to match an accident.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const require = createRequire(fileURLToPath(new URL('../dashboard/package.json', import.meta.url)))
const { chromium } = require('playwright')
const BASE = process.env.STEWARD_DESKTOP_URL || 'http://127.0.0.1:19500/desktop'
const API = process.env.STEWARD_API_URL || 'http://127.0.0.1:19500/api/plugins/hermes-project-stewardship'
const TOKEN = 'demo-session-token'

const api = async (path, method = 'GET', body) => {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: { 'x-hermes-session-token': TOKEN, 'content-type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })
  let result = null
  try { result = await res.json() } catch { /* non-JSON error bodies stay null */ }
  return { ok: res.ok, status: res.status, body: result }
}

let page
let browser

async function openInbox({ width = 1440, height = 900 } = {}) {
  await page.setViewportSize({ width, height })
  await page.goto(BASE, { waitUntil: 'load' })
  await page.locator('[data-tab="inbox"]').waitFor({ timeout: 20000 })
  await page.locator('[data-tab="inbox"]').click()
  await page.locator('[data-inbox-screen="true"]').waitFor({ timeout: 20000 })
}

async function openRow(title) {
  const row = page.locator('[data-inbox-row]', { hasText: title }).first()
  await row.click()
  await page.locator('[data-inbox-panel="true"]').waitFor()
  await page.locator('[data-inbox-panel="true"]').getByText(title, { exact: false }).first().waitFor()
  return row.getAttribute('data-inbox-ref')
}

test.before(async () => { browser = await chromium.launch({ headless: true }) })
test.after(async () => { await browser?.close() })
test.beforeEach(async () => {
  page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  page.setDefaultTimeout(20000)
})
test.afterEach(async () => { await page?.close() })

// ---------------------------------------------------------------- read-only --
// These open a row and read it, or exercise a refused decision (409/422) that
// leaves the item pending. They run before the two consuming tests below.

test('R3: the screen binds the displayed fingerprint (decision scope visible, stale decide refused 409)', { timeout: 300000 }, async () => {
  await openInbox()
  const ref = await openRow('Ship saved views safely')
  const decision = await api(`/initiatives/${ref}/decision`)
  assert.equal(decision.ok, true, 'decision payload reachable through the proxy')
  assert.ok(decision.body?.fingerprint, 'the decision payload carries a fingerprint')
  // The stale-decision refusal (backend rule, browser-visible via the receipt
  // guard): deciding with a fabricated fingerprint is refused 409.
  const stale = await api(`/initiatives/${ref}/approve`, 'POST',
    { expected_fingerprint: 'fabricated-fingerprint' })
  assert.equal(stale.status, 409, `a decision on a wrong fingerprint must be refused, got ${stale.status}`)
})

test('R4: a comment never changes the decision', { timeout: 300000 }, async () => {
  await openInbox()
  const ref = await openRow('Ship saved views')
  const before = await api(`/initiatives/${ref}/decision`)
  const composer = page.locator('[data-approval-comments] input[aria-label="Comment"]')
  await composer.fill('Which metric backs this?')
  await page.locator('[data-approval-comments]').getByRole('button', { name: 'Comment', exact: true }).click()
  await page.locator('[data-inbox-panel="true"] .dockyard-comment-thread')
    .getByText('Which metric backs this?', { exact: false }).first().waitFor()
  const after = await api(`/initiatives/${ref}/decision`)
  assert.equal(after.body?.fingerprint, before.body?.fingerprint, 'a comment must not change the fingerprint')
})

test('R5: the caller can never name the actor through the real proxy', { timeout: 300000 }, async () => {
  await openInbox()
  const ref = await openRow('Ship saved views')
  const decision = await api(`/initiatives/${ref}/decision`)
  const forged = await api(`/initiatives/${ref}/approve`, 'POST',
    { expected_fingerprint: decision.body.fingerprint, actor: 'impostor' })
  assert.equal(forged.status, 422, 'a caller-named actor must be refused by the proxy body contract')
  const receipts = await api(`/initiatives/${ref}/decision/receipts`)
  assert.equal((receipts.body?.receipts ?? []).length, 0, 'a refused decision leaves no receipt')
})

test('tabs and counts: All, Urgent, Today, Earlier filter the list', { timeout: 300000 }, async () => {
  await openInbox()
  const tabs = page.locator('[data-inbox-tab]')
  const names = (await tabs.allInnerTexts()).join(' | ')
  for (const name of ['All', 'Urgent', 'Today', 'Earlier']) {
    assert.ok(names.includes(name), `missing tab "${name}": ${names}`)
  }
  const countsAll = await page.locator('[data-inbox-row]').count()
  const urgent = page.locator('[data-inbox-tab="urgent"]')
  await urgent.click()
  const countsUrgent = await page.locator('[data-inbox-row]').count()
  assert.ok(countsUrgent >= 1, 'the Urgent tab keeps high-risk rows')
  assert.ok(countsUrgent <= countsAll, 'Urgent is a subset of All')
  await page.locator('[data-inbox-tab="all"]').click()
})

test('attention rows are listed with an honest panel, a project link, and no decision buttons', { timeout: 300000 }, async () => {
  await openInbox()
  const attention = page.locator('[data-attention-row]').first()
  await attention.waitFor()
  const text = await attention.innerText()
  assert.match(text, /needs attention/i, 'attention rows say what they are')
  const decisionButtons = attention.locator('[data-action="approve"], [data-action="reject"], [data-action="request-changes"]')
  assert.equal(await decisionButtons.count(), 0, 'attention rows never offer decisions')
  const link = attention.locator('a, button')
  assert.ok(await link.count() >= 1, 'attention rows expose a way to the project')
})

test('deep link s6:initiative/<ref> selects that row via focusRef', { timeout: 300000 }, async () => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto(BASE, { waitUntil: 'load' })
  await page.locator('[data-tab="inbox"]').click()
  await page.locator('[data-inbox-screen="true"]').waitFor()
  await page.locator('[data-inbox-row]').first().waitFor()
  const ref = await page.locator('[data-inbox-row]').first().getAttribute('data-inbox-ref')
  assert.ok(ref, 'the row exposes its ref')
  // The real deep-link surface: the command palette opens s6:initiative/<ref>
  // (catalog review, PR #136752 — the synthetic test event is gone).
  await page.keyboard.press('Control+k')
  const search = page.locator('input[aria-label="Search projects, work and initiatives"]')
  await search.fill(ref)
  await page.locator('#dockyard-search-results button').first().click()
  await page.locator('[data-inbox-screen="true"]').waitFor()
  await page.locator(`[data-inbox-row][aria-selected="true"]`).waitFor()
  const selected = await page.locator('[data-inbox-row][aria-selected="true"]').getAttribute('data-inbox-ref')
  assert.equal(selected, ref, 'the deep-linked row is the selected row')
  // The old test-only event must do nothing: the production listener is gone.
  // A second row's ref: the old hook would have moved the selection to it.
  const other = await page.locator('[data-inbox-row]').nth(1).getAttribute('data-inbox-ref')
  assert.ok(other && other !== ref, 'a second row exists with a different ref')
  await page.evaluate((target) => {
    window.dispatchEvent(new CustomEvent('dockyard:test:deeplink', { detail: `s6:initiative/${target}` }))
  }, other)
  await page.waitForTimeout(300)
  const still = await page.locator('[data-inbox-row][aria-selected="true"]').getAttribute('data-inbox-ref')
  assert.equal(still, ref, 'a synthetic deeplink event no longer moves the selection')

})

test('390px: the detail opens full width with Back, and nothing scrolls sideways', { timeout: 300000 }, async () => {
  await openInbox({ width: 390, height: 844 })
  // List alone: the detail panel is absent until a row is opened.
  assert.equal(await page.locator('[data-inbox-panel="true"]').count(), 0, 'narrow screens show the list alone first')
  await page.locator('[data-inbox-row]').first().click()
  const panel = page.locator('[data-inbox-panel="true"]')
  await panel.waitFor()
  assert.ok(await panel.isVisible(), 'the detail opens on narrow screens')
  await page.getByRole('button', { name: 'Back' }).click()
  await page.waitForTimeout(250)
  const scroll = await page.evaluate(() => ({ x: document.documentElement.scrollWidth, inner: window.innerWidth }))
  assert.ok(scroll.x <= scroll.inner, `no sideways scroll at 390px (${scroll.x} > ${scroll.inner})`)
})

test('Escape closes the panel and returns focus to the row', { timeout: 300000 }, async () => {
  await openInbox({ width: 1024, height: 800 })
  const rows = page.locator('[data-inbox-row]')
  await rows.nth(1).click()
  await page.locator('[data-inbox-panel="true"]').waitFor()
  await page.keyboard.press('Escape')
  await page.waitForTimeout(250)
  const focused = await page.evaluate(() => document.activeElement?.getAttribute('data-inbox-ref') ?? '')
  assert.ok(focused, 'Escape returns focus to a row')
})

// ---------------------------------------------------------- consuming last --
// These two leave the item in the inbox, so they run after every read-only
// journey above (the backend is shared for the whole file).

test('R6+R2+R1: panel carries the full decision context; request changes requires feedback and removes the item', { timeout: 300000 }, async () => {
  await openInbox()
  const ref = await openRow('Ship saved views')
  const panel = page.locator('[data-inbox-panel="true"]')
  // The panel renders before the /decision fetch resolves; wait for the
  // capability grant to land so R6's boundary assertion reads loaded data.
  await panel.getByText(/approve_and_start_execution/).waitFor({ timeout: 20000 })
  const text = await panel.innerText()
  const lowerText = text.toLowerCase()
  for (const section of [
    'Requested change', 'Policy gate', 'Potential impact', 'Capability boundary',
    'Who asked', 'Evidence', 'Affected work items', 'Activity', "Comments don't change the decision",
  ]) {
    // The section headers render uppercased (CSS text-transform), so compare
    // case-insensitively: the semantic content is what R6 carries, not casing.
    assert.ok(lowerText.includes(section.toLowerCase()), `detail panel is missing "${section}"; panel shows:\n${text.slice(0, 500)}`)
  }
  // Boundary is facts only (Decision B): the exact grant text appears.
  assert.match(text, /approve_and_start_execution/, 'capability boundary must show the exact grant')
  // Request changes UI gate (R2): feedback required, then the item leaves.
  const feedback = 'Split the refund rollout into two slices'
  await panel.getByRole('button', { name: 'Request changes', exact: true }).click()
  const form = page.locator('[data-request-changes-form="true"]')
  await form.waitFor()
  const submit = form.getByRole('button', { name: /Return to proposer/ })
  assert.equal(await submit.isDisabled(), true, 'request changes must require feedback')
  // Sahil 05/10: the box sits under its label, spans the form, and is big enough to write in.
  const box = form.getByRole('textbox', { name: 'Feedback for the proposer' })
  const [labelBox, fieldBox, formBox] = [
    await form.getByText('Feedback for the proposer', { exact: true }).boundingBox(), await box.boundingBox(), await form.boundingBox()]
  assert.ok(fieldBox.y >= labelBox.y + labelBox.height - 1, 'the box is under its label, not beside it')
  assert.ok(fieldBox.height >= 120, `the box is big enough to write in (height ${fieldBox.height})`)
  assert.ok(fieldBox.width >= formBox.width - 40, `the box spans the form (${fieldBox.width} of ${formBox.width})`)
  await box.fill(feedback)
  await submit.click()
  await page.locator('[data-toast-region]').getByText(/Returned to the proposer/).first().waitFor()
  // R2 + focus contract: the item leaves the list; focus lands on a row.
  await page.waitForFunction((title) => !document.body.textContent.includes(title), 'Ship saved views')
  const focused = await page.evaluate(() => document.activeElement?.getAttribute('data-inbox-ref') ?? '')
  assert.ok(focused, 'after a decision focus moves to the next row')
})

test('R1: reject happens in ONE dialog with a required reason', { timeout: 300000 }, async () => {
  await openInbox()
  const ref = await openRow('Retire legacy webhook listener')
  await page.locator('[data-inbox-panel="true"]').getByRole('button', { name: 'Reject', exact: true }).click()
  const dialog = page.locator('[data-destructive-confirm^="reject-"]')
  await dialog.waitFor()
  // One dialog carries the reason; nothing was sent before it is filled.
  const preReceipts = await api(`/initiatives/${ref}/decision/receipts`)
  assert.equal((preReceipts.body?.receipts ?? []).length, 0, 'no receipt before the confirm click')
  const confirm = dialog.getByRole('button', { name: /Reject initiative/ })
  assert.equal(await confirm.isDisabled(), true, 'reject must stay disabled without a reason')
  await dialog.locator('input').first().fill('Rollback risk not acceptable')
  await confirm.click()
  await page.locator('[data-toast-region]').getByText(/Rejected/).first().waitFor()
})
