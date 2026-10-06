// C5 Activity: the Activity stylesheet proven as CSS rules (part one of the
// two-part colour test, same method as overview-css.test.mjs). Part two, a
// real browser flipping to dark and the impact pill colours changing, lives
// in activity-screen.test.mjs.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const read = (file) => readFileSync(fileURLToPath(new URL(file, import.meta.url)), 'utf8')
const shell = read('./src/styles/dockyard-css.js')
const activity = read('./src/styles/activity-css.js')

const block = (selector) => {
  const start = shell.indexOf(`${selector} {`)
  assert.ok(start >= 0, `${selector} block exists`)
  const end = shell.indexOf('\n}', start)
  assert.ok(end > start, `${selector} block closes`)
  return shell.slice(start, end)
}
const tokens = (text) => new Set([...text.matchAll(/(--dy-[a-z0-9-]+)\s*:/g)].map((match) => match[1]))

test('Activity styles use only colour tokens the shell defines for BOTH themes', () => {
  const light = tokens(block('.dockyard-root'))
  const dark = tokens(block('.dockyard-root[data-theme="dark"]'))
  const used = [...new Set([...activity.matchAll(/var\(\s*(--dy-[a-z0-9-]+)/g)].map((match) => match[1]))]
  assert.ok(used.length >= 15, 'the Activity styles read the shell tokens')
  assert.deepEqual(used.filter((token) => !light.has(token)), [], 'every token exists in the light theme')
  assert.deepEqual(used.filter((token) => !dark.has(token)), [], 'every token exists in the dark theme')
})

test('no fallback colours and no literal colours', () => {
  assert.doesNotMatch(activity, /var\(--dy-[a-z0-9-]+\s*,/, 'a fallback hides a missing token in dark mode')
  assert.doesNotMatch(activity, /#[0-9a-fA-F]{3,8}\b/, 'no hex colours: only --dy-* tokens')
  assert.doesNotMatch(activity, /\b(rgb|rgba|hsl|hsla)\(/i, 'no rgb/hsl colours')
})

test('every rule is scoped to .dockyard-root, and breakpoints are container queries', () => {
  const css = activity.slice(activity.indexOf('`') + 1, activity.lastIndexOf('`'))
  const selectors = css.replace(/\/\*[\s\S]*?\*\//g, '').split('}').map((rule) => rule.split('{')[0].trim()).filter((selector) => selector && !selector.startsWith('@'))
  assert.ok(selectors.length >= 40, 'the rules were parsed')
  for (const selector of selectors) {
    for (const part of selector.split(',').map((piece) => piece.trim()).filter(Boolean)) {
      assert.match(part, /^\.dockyard-root\b/, `scoped: ${part}`)
    }
  }
  assert.doesNotMatch(activity, /@media/, 'the list sits inside the app frame: use @container dockyard')
  assert.match(activity, /@container dockyard \(max-width: 640px\)/, 'narrow-container rules exist')
})

test('Sahil 06/10 picked the timeline: no table and no design-review bar', () => {
  assert.doesNotMatch(activity, /\.dy-act-table\b/, 'the table layout is gone')
  assert.doesNotMatch(activity, /\.dy-act-review\b/, 'the design-review bar is gone')
  assert.match(activity, /@container dockyard \(max-width: 640px\) \{[\s\S]*?\.dockyard-root \.dy-act-entry \{ grid-template-columns: 28px minmax\(0, 1fr\); \}/, 'narrow: the entry drops to two columns')
  assert.match(activity, /@container dockyard \(max-width: 640px\) \{[\s\S]*?\.dockyard-root \.dy-act-side \{ grid-column: 2;/, 'narrow: impact and Open move under the text')
})

test('the timeline dot keys background and icon colour to each tone token; pills reuse the app tag', () => {
  for (const tone of ['success', 'warning', 'danger', 'info']) {
    assert.match(activity, new RegExp(`\\.dy-act-dot\\[data-tone="${tone}"\\] \\{ background: var\\(--dy-${tone}-bg\\); color: var\\(--dy-${tone}\\); \\}`), `${tone} dot`)
  }
  assert.doesNotMatch(activity, /\.dy-act-pill/, 'impact pills are the app StatusTag (dockyard-status-tag), not a second pill style')
})
