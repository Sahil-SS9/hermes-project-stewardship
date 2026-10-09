// Batch E5 pop-ups must speak the REAL Desktop host contract and must not use
// browser storage.
//
// 1. host.notify contract. Hermes Desktop's `notify(input)` (apps/desktop/src/
//    store/notifications.ts, the same in upstream) reads only these fields:
//    id, kind, icon, accentColor, meta, title, message, detail, action
//    ({ label, onClick }), secondaryAction, onDismiss, durationMs, placement.
//    `message` is required. Any other field is silently dropped, so a pop-up
//    sent as { body, tag, data } shows its title with no text and no link.
//    The browser harness stub only records calls, so it can never catch a
//    wrong field name. This test pins the host's real field list.
// 2. The 26/08 locked rule (re-confirmed by Sahil 02/10): Project Stewardship never uses
//    localStorage, sessionStorage or cookies. The backend's popup_shown_at
//    mark is what stops a pop-up repeating, including across reloads.
//
// Runs the maintained desktop source in jsdom with a fake rest() and no
// network.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { evaluatePlugin } from './test-support/load-plugin.mjs'

const require = createRequire(fileURLToPath(new URL('../dashboard/package.json', import.meta.url)))
const { JSDOM } = require('jsdom')

// Every field Hermes Desktop's NotificationInput accepts (KenseiAgent and
// upstream hermes-agent agree). Anything else never reaches the screen.
const HOST_NOTIFY_FIELDS = new Set([
  'id', 'kind', 'icon', 'accentColor', 'meta', 'title', 'message', 'detail',
  'action', 'secondaryAction', 'onDismiss', 'durationMs', 'placement',
])
const HOST_KINDS = new Set(['error', 'warning', 'info', 'success'])

function popupRow(id, overrides = {}) {
  return {
    id,
    project: 'payments-relaunch',
    severity: 'high',
    kind: 'approval_required',
    title: `Approval needed: INIT-PAYMENTS-00${id}`,
    body: `ref=INIT-PAYMENTS-00${id}`,
    created_at: '2026-10-02T21:00:00+00:00',
    acked: false,
    deep_link: `s6:initiative/INIT-PAYMENTS-00${id}`,
    state: 'new',
    ref: `INIT-PAYMENTS-00${id}`,
    ...overrides,
  }
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

async function runPoller({ popups, more = 0, cycles = 2, failShownTimes = 0 }) {
  const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', {
    url: 'http://localhost/dockyard',
    pretendToBeVisual: true,
  })
  const storageCalls = []
  for (const name of ['localStorage', 'sessionStorage']) {
    const real = dom.window[name]
    Object.defineProperty(dom.window, name, {
      configurable: true,
      get() {
        storageCalls.push(name)
        return real
      },
    })
  }
  Object.defineProperty(dom.window.document, 'cookie', {
    configurable: true,
    get() { storageCalls.push('cookie(read)'); return '' },
    set() { storageCalls.push('cookie(write)') },
  })
  const previous = { window: global.window, document: global.document }
  global.window = dom.window
  global.document = dom.window.document
  dom.window.__dockyardPopupIntervalMs = 40

  const calls = []
  const navigations = []
  const shownBodies = []
  const host = {
    navigate(path) { navigations.push(path) },
    notify(input) { calls.push(input); return String(calls.length) },
  }
  // The backend contract: a popup is due until it is marked shown.
  const shown = new Set()
  let shownFailures = 0
  const rest = async (path, init = {}) => {
    if (path === '/notifications/popups') {
      return { popups: popups.filter((row) => !shown.has(row.id)), more }
    }
    if (path === '/notifications/popups/shown') {
      shownBodies.push(init.body)
      if (shownFailures < failShownTimes) {
        shownFailures += 1
        throw new Error('backend restarting')
      }
      for (const id of init.body?.ids ?? []) shown.add(id)
      return { marked: (init.body?.ids ?? []).length }
    }
    throw new Error(`unexpected request ${init.method ?? 'GET'} ${path}`)
  }

  try {
    const { plugin } = evaluatePlugin('', host, { assertImports: false })
    plugin.register({ rest, os: {}, registerMany() {}, register() {}, onDispose() {} })
    // The first tick runs 1.5s after load, then every 40ms.
    await wait(1500 + 40 * (cycles + 3))
  } finally {
    clearInterval(dom.window.__dockyardPopupPoller)
    delete dom.window.__dockyardPopupPoller
    global.window = previous.window
    global.document = previous.document
    dom.window.close()
  }
  return { calls, navigations, shownBodies, storageCalls }
}

test('E5 pop-ups use only fields the Desktop host renders, with text and an action', { timeout: 15000 }, async () => {
  const { calls, navigations } = await runPoller({ popups: [popupRow(1)] })
  assert.ok(calls.length >= 1, 'the poller surfaced the due pop-up')
  const item = calls[0]
  const unknown = Object.keys(item).filter((key) => !HOST_NOTIFY_FIELDS.has(key))
  assert.deepEqual(unknown, [], `fields the Desktop host silently drops: ${unknown.join(', ')}`)
  assert.equal(item.title, 'Approval needed: INIT-PAYMENTS-001')
  assert.equal(typeof item.message, 'string', 'message is required by the host')
  assert.ok(item.message.trim().length > 0, 'the pop-up shows text, not just a title')
  assert.equal(item.id, 'dockyard-notification-1', 'a stable id stops the host stacking duplicates')
  assert.ok(HOST_KINDS.has(item.kind), `kind must be one of the host's kinds, got ${item.kind}`)
  assert.equal(typeof item.action?.label, 'string', 'an Open action is offered')
  assert.equal(typeof item.action?.onClick, 'function')
  item.action.onClick()
  assert.deepEqual(navigations, ['/dockyard'], 'Open goes to Project Stewardship')
})

test('E5 "and N more" pop-up is a valid host notification too', { timeout: 15000 }, async () => {
  const rows = [popupRow(1), popupRow(2), popupRow(3)]
  const { calls } = await runPoller({ popups: rows, more: 2 })
  const moreItem = calls.find((item) => /more notification/.test(String(item.title)))
  assert.ok(moreItem, 'the "and N more" pop-up was shown')
  const unknown = Object.keys(moreItem).filter((key) => !HOST_NOTIFY_FIELDS.has(key))
  assert.deepEqual(unknown, [], `fields the Desktop host silently drops: ${unknown.join(', ')}`)
  assert.equal(typeof moreItem.message, 'string', 'message is required by the host')
  assert.ok(moreItem.message.trim().length > 0)
  assert.equal(moreItem.title, 'and 2 more notifications', 'the count comes from the backend')
})

test('E5 pop-ups never use browser storage; the backend shown-mark stops repeats', { timeout: 15000 }, async () => {
  const { calls, shownBodies, storageCalls } = await runPoller({ popups: [popupRow(7)], cycles: 4 })
  assert.deepEqual(storageCalls, [], `browser storage touched (26/08 rule): ${storageCalls.join(', ')}`)
  assert.equal(calls.filter((item) => String(item.title).includes('INIT-PAYMENTS-007')).length, 1,
    'the same pop-up shows once across several polls')
  assert.deepEqual(shownBodies, [{ ids: [7] }], 'the shown mark is sent to the backend once')
})

test('E5 a failed shown-mark is retried without showing the pop-up again', { timeout: 15000 }, async () => {
  const { calls, shownBodies, storageCalls } = await runPoller({ popups: [popupRow(9)], cycles: 4, failShownTimes: 1 })
  assert.deepEqual(storageCalls, [], 'no browser storage on the retry path either')
  assert.equal(calls.filter((item) => String(item.title).includes('INIT-PAYMENTS-009')).length, 1,
    'the pop-up shows once even though its first shown-mark failed')
  assert.deepEqual(shownBodies, [{ ids: [9] }, { ids: [9] }], 'the shown mark is retried until the backend accepts it')
})
