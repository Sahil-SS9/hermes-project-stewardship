// C7 Reports: the Reports stylesheet proven as CSS rules (part one of the
// two-part colour test, same method as activity-css.test.mjs). Part two, a
// real browser flipping to dark and the page's colours changing, lives in
// reports-screen.test.mjs.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const read = (file) => readFileSync(fileURLToPath(new URL(file, import.meta.url)), 'utf8')
const shell = read('./src/styles/dockyard-css.js')
const reports = read('./src/styles/reports-css.js')
const context = read('./src/runtime/context.js')

const block = (selector) => {
  const start = shell.indexOf(`${selector} {`)
  assert.ok(start >= 0, `${selector} block exists`)
  const end = shell.indexOf('\n}', start)
  assert.ok(end > start, `${selector} block closes`)
  return shell.slice(start, end)
}
const tokens = (text) => new Set([...text.matchAll(/(--dy-[a-z0-9-]+)\s*:/g)].map((match) => match[1]))
const css = reports.slice(reports.indexOf('`') + 1, reports.lastIndexOf('`'))

test('Reports styles use only colour tokens the shell defines for BOTH themes', () => {
  const light = tokens(block('.dockyard-root'))
  const dark = tokens(block('.dockyard-root[data-theme="dark"]'))
  const used = [...new Set([...css.matchAll(/var\(\s*(--dy-[a-z0-9-]+)/g)].map((match) => match[1]))]
  assert.ok(used.length >= 12, 'the Reports styles read the shell tokens')
  assert.deepEqual(used.filter((token) => !light.has(token)), [], 'every token exists in the light theme')
  assert.deepEqual(used.filter((token) => !dark.has(token)), [], 'every token exists in the dark theme')
})

test('no fallback colours and no literal colours', () => {
  assert.doesNotMatch(css, /var\(--dy-[a-z0-9-]+\s*,/, 'a fallback hides a missing token in dark mode')
  assert.doesNotMatch(css, /#[0-9a-fA-F]{3,8}\b/, 'no hex colours: only --dy-* tokens')
  assert.doesNotMatch(css, /\b(rgb|rgba|hsl|hsla)\(/i, 'no rgb/hsl colours')
})

test('every rule is scoped to .dockyard-root, and breakpoints are container queries', () => {
  const selectors = css.replace(/\/\*[\s\S]*?\*\//g, '').split('}').map((rule) => rule.split('{')[0].trim()).filter((selector) => selector && !selector.startsWith('@'))
  assert.ok(selectors.length >= 30, 'the rules were parsed')
  for (const selector of selectors) {
    for (const part of selector.split(',').map((piece) => piece.trim()).filter(Boolean)) {
      assert.match(part, /^\.dockyard-root\b/, `scoped: ${part}`)
    }
  }
  assert.doesNotMatch(css, /@media/, 'the screen sits inside the app frame: use @container dockyard')
  assert.match(css, /@container dockyard \(max-width: 640px\)/, 'narrow-container rules exist')
})

test('narrow: the open report comes before the list; wide tables scroll inside themselves', () => {
  assert.match(css, /@container dockyard \(max-width: 640px\) \{[\s\S]*?\.dockyard-root \.dy-rep-side \{ grid-template-columns: minmax\(0, 1fr\); \}/, 'one column')
  assert.match(css, /@container dockyard \(max-width: 640px\) \{[\s\S]*?\.dockyard-root \.dy-rep-pane \{ order: -1; \}/, 'the report first')
  assert.match(css, /\.dockyard-root \.dy-rep-table-wrap \{[^}]*overflow-x: auto;/, 'the work table scrolls inside its box, never the page')
  assert.match(css, /\.dockyard-root \.dy-rep-doc \{[^}]*max-width: 860px;/, 'a readable line length')
})

test('Sahil 06/10 picked side by side: no reports table, no side panel and no design-review bar', () => {
  assert.doesNotMatch(css, /\.dy-rep-reports\b/, 'the table of past reports is gone')
  assert.doesNotMatch(css, /\.dy-rep-drawer/, 'the side panel the table opened reports in is gone')
  assert.doesNotMatch(css, /\.dy-rep-close\b|\.dy-rep-none-table\b/, 'and its close button and empty table')
  assert.doesNotMatch(css, /\.dy-rep-review\b/, 'the design-review bar is gone')
  assert.match(css, /\.dockyard-root \.dy-rep-side \{ display: grid; grid-template-columns: minmax\(220px, 280px\) minmax\(0, 1fr\);/, 'the list and the open report side by side, as reviewed')
})

test('the stylesheet is loaded, before the theme sheet so a chosen theme still wins', () => {
  const ours = context.indexOf("useStylesheet('dy-reports-stylesheet', 'dyReportsStylesheet', REPORTS_CSS)")
  assert.ok(ours > 0, 'the Reports stylesheet is mounted')
  assert.ok(ours < context.indexOf("useStylesheet('dy-theme-stylesheet'"), 'before the theme stylesheet')
})
