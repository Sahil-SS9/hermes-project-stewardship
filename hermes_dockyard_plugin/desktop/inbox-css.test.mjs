// Batch D — Inbox stylesheet proven as CSS rules, not as a string blob.
// RED first: importing ./src/styles/inbox-css.js fails until the module lands.
import { test } from 'node:test'
import assert from 'node:assert/strict'

const { INBOX_CSS } = await import('./src/styles/inbox-css.js')
const { DOCKYARD_CSS } = await import('./src/styles/dockyard-css.js')

const tokensOf = (css, scope = null) => new Set(css.slice(scope ?? 0).match(/--dy-[a-z0-9-]+/g) ?? [])

test('inbox stylesheet exists and is scoped to .dockyard-root', () => {
  assert.ok(INBOX_CSS && INBOX_CSS.length > 400, 'inbox stylesheet must not be empty')
  assert.match(INBOX_CSS, /\.dockyard-root \.dockyard-inbox/, 'every rule is scoped to the root container')
  assert.doesNotMatch(INBOX_CSS, /(^|\})\s*(html|body|:root)\b/, 'stylesheet never targets html, body or :root')
})

test('every --dy-* token used by inbox-css exists in BOTH themes of dockyard-css', () => {
  const light = DOCKYARD_CSS.slice(0, DOCKYARD_CSS.indexOf('[data-theme="dark"]'))
  const dark = DOCKYARD_CSS.slice(DOCKYARD_CSS.indexOf('[data-theme="dark"]'))
  for (const token of [...tokensOf(INBOX_CSS)]) {
    assert.ok(light.includes(token), `token ${token} is missing from the light theme`)
    assert.ok(dark.includes(token), `token ${token} is missing from the dark theme`)
  }
})

test('no fallback colours: a var() miss must fail this test, not paint light colours in dark mode', () => {
  assert.doesNotMatch(INBOX_CSS, /var\(--dy-[a-z0-9-]+,\s*(#[0-9a-f]{3,8}|rgb|hsl|white|black)/i,
    'fallback colours are banned in the inbox stylesheet')
  assert.doesNotMatch(INBOX_CSS, /#[0-9a-fA-F]{3,8}\b/, 'inbox stylesheet carries no literal colours — only --dy-* tokens')
})

test('the approval block left dockyard-css.js with it (move, not copy)', () => {
  assert.doesNotMatch(DOCKYARD_CSS, /\.dockyard-root \.dockyard-approval-list\b/,
    '.dockyard-approval-list must live in inbox-css.js now')
  assert.doesNotMatch(DOCKYARD_CSS, /\.dockyard-root \.dockyard-approval-row\b/,
    '.dockyard-approval-row must live in inbox-css.js now')
  // Shared classes stay behind (initiative.js + dashboard.js still use them).
  assert.match(DOCKYARD_CSS, /\.dockyard-root \.dockyard-evidence-details\b/, 'shared evidence-details stays in dockyard-css')
  assert.match(DOCKYARD_CSS, /\.dockyard-root \.dockyard-comment-thread\b/, 'shared comment-thread stays in dockyard-css')
})

test('no stray paste artifacts (+ prefixes) survive in either stylesheet', () => {
  for (const [name, css] of [['dockyard-css', DOCKYARD_CSS], ['inbox-css', INBOX_CSS]]) {
    for (const [index, line] of css.split('\n').entries()) {
      assert.ok(!/^\s*\+/.test(line), `${name} line ${index + 1} starts with a stray '+': ${line}`)
    }
  }
})

test('narrow container keeps the inbox single-column', () => {
  assert.match(INBOX_CSS, /@container dockyard \(max-width: 820px\)[\s\S]*\.dockyard-inbox-layout \{ grid-template-columns: 1fr/,
    'the inbox layout collapses to one column at narrow container width')
})