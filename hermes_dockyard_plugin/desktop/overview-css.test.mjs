// C1 Overview: the header strip's stylesheet proven as CSS rules (part one of
// the two-part colour test). Part two, a real browser flipping to dark and
// the banner colours changing, lives in overview-strip.test.mjs.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const read = (file) => readFileSync(fileURLToPath(new URL(file, import.meta.url)), 'utf8')
const shell = read('./src/styles/dockyard-css.js')
const overview = read('./src/styles/overview-css.js')

const block = (selector) => {
  const start = shell.indexOf(`${selector} {`)
  assert.ok(start >= 0, `${selector} block exists`)
  const end = shell.indexOf('\n}', start)
  assert.ok(end > start, `${selector} block closes`)
  return shell.slice(start, end)
}
const tokens = (text) => new Set([...text.matchAll(/(--dy-[a-z0-9-]+)\s*:/g)].map((match) => match[1]))

test('Overview styles use only colour tokens the shell defines for BOTH themes', () => {
  const light = tokens(block('.dockyard-root'))
  const dark = tokens(block('.dockyard-root[data-theme="dark"]'))
  const used = [...new Set([...overview.matchAll(/var\(\s*(--dy-[a-z0-9-]+)/g)].map((match) => match[1]))]
  assert.ok(used.length >= 15, 'the Overview styles read the shell tokens')
  assert.deepEqual(used.filter((token) => !light.has(token)), [], 'every token exists in the light theme')
  assert.deepEqual(used.filter((token) => !dark.has(token)), [], 'every token exists in the dark theme')
})

test('no fallback colours and no literal colours', () => {
  assert.doesNotMatch(overview, /var\(--dy-[a-z0-9-]+\s*,/, 'a fallback hides a missing token in dark mode')
  assert.doesNotMatch(overview, /#[0-9a-fA-F]{3,8}\b/, 'no hex colours: only --dy-* tokens')
  assert.doesNotMatch(overview, /\b(rgb|rgba|hsl|hsla)\(/i, 'no rgb/hsl colours')
})

test('every rule is scoped to .dockyard-root, and breakpoints are container queries', () => {
  const css = overview.slice(overview.indexOf('`') + 1, overview.lastIndexOf('`'))
  const selectors = css.replace(/\/\*[\s\S]*?\*\//g, '').split('}').map((rule) => rule.split('{')[0].trim()).filter((selector) => selector && !selector.startsWith('@'))
  assert.ok(selectors.length >= 40, 'the rules were parsed')
  for (const selector of selectors) {
    for (const part of selector.split(',').map((piece) => piece.trim()).filter(Boolean)) {
      assert.match(part, /^\.dockyard-root\b/, `scoped: ${part}`)
    }
  }
  assert.doesNotMatch(overview, /@media/, 'the strip sits inside the app frame: use @container dockyard')
  assert.match(overview, /@container dockyard \(max-width: 640px\)/, 'narrow-container rules exist')
})

test('each banner state keys background, text and border to its own state token (signed 16/09)', () => {
  for (const tone of ['danger', 'warning', 'info', 'success']) {
    const rule = overview.match(new RegExp(`\\.dy-ov-banner\\[data-tone="${tone}"\\] \\{([^}]*)\\}`))
    assert.ok(rule, `${tone} banner rule exists`)
    assert.match(rule[1], new RegExp(`background: var\\(--dy-${tone}-bg\\)`), `${tone}: background`)
    assert.match(rule[1], new RegExp(`color: var\\(--dy-${tone}\\)`), `${tone}: text`)
    assert.match(rule[1], new RegExp(`border-color: color-mix\\(in srgb, var\\(--dy-${tone}\\)`), `${tone}: border`)
  }
  for (const tone of ['danger', 'warning', 'info']) {
    assert.match(overview, new RegExp(`\\.dy-ov-attn-item\\[data-tone="${tone}"\\] \\{ border-left-color: var\\(--dy-${tone}\\); \\}`), `drawer item ${tone} left border`)
  }
})
