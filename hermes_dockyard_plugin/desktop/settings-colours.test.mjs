// C8 — Settings colour test, copied from the proven pattern in roadmap-screen.test.mjs.
// Every --dy-… token in settings-css.js must exist in BOTH the light and the dark
// theme block of dockyard-css.js, and there must be no fallback colours
// (var(--dy-x, #abc) is forbidden — it hides a missing token in dark mode).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const read = (file) => readFileSync(fileURLToPath(new URL(file, import.meta.url)), 'utf8')

test('Settings styles use only colour tokens the shell defines for BOTH themes', () => {
  const shell = read('./src/styles/dockyard-css.js')
  const block = (selector) => {
    const start = shell.indexOf(`${selector} {`)
    assert.ok(start >= 0, `${selector} block exists`)
    const end = shell.indexOf('\n}', start)
    assert.ok(end > start, `${selector} block closes`)
    return shell.slice(start, end)
  }
  const tokens = (text) => new Set([...text.matchAll(/(--dy-[a-z0-9-]+)\s*:/g)].map((match) => match[1]))
  const light = tokens(block('.dockyard-root'))
  const dark = tokens(block('.dockyard-root[data-theme="dark"]'))
  const settings = read('./src/styles/settings-css.js')
  const used = [...new Set([...settings.matchAll(/var\(\s*(--dy-[a-z0-9-]+)/g)].map((match) => match[1]))]
  assert.ok(used.length >= 2, 'the Settings styles read the shell tokens')
  assert.deepEqual(used.filter((token) => !light.has(token)), [], 'every token exists in the light theme')
  assert.deepEqual(used.filter((token) => !dark.has(token)), [], 'every token exists in the dark theme')
  assert.doesNotMatch(settings, /var\(--dy-[a-z0-9-]+\s*,/, 'no fallback colours: they hide a missing token in dark mode')
})
