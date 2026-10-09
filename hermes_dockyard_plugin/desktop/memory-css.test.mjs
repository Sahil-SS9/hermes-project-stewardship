// Project memory (checks round 1, 08/10): the Memory stylesheet proven as CSS
// rules, the same method as activity-css.test.mjs. The browser half (the tab
// in light and dark, at phone width) lives in project-memory.test.mjs.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const read = (file) => readFileSync(fileURLToPath(new URL(file, import.meta.url)), 'utf8')
const shell = read('./src/styles/dockyard-css.js')
const memory = read('./src/styles/memory-css.js')

const block = (selector) => {
  const start = shell.indexOf(`${selector} {`)
  assert.ok(start >= 0, `${selector} block exists`)
  const end = shell.indexOf('\n}', start)
  assert.ok(end > start, `${selector} block closes`)
  return shell.slice(start, end)
}
const tokens = (text) => new Set([...text.matchAll(/(--dy-[a-z0-9-]+)\s*:/g)].map((match) => match[1]))

test('Memory styles use only colour tokens the shell defines for BOTH themes', () => {
  const light = tokens(block('.dockyard-root'))
  const dark = tokens(block('.dockyard-root[data-theme="dark"]'))
  const used = [...new Set([...memory.matchAll(/var\(\s*(--dy-[a-z0-9-]+)/g)].map((match) => match[1]))]
  assert.ok(used.length >= 5, 'the Memory styles read the shell tokens')
  assert.deepEqual(used.filter((token) => !light.has(token)), [], 'every token exists in the light theme')
  assert.deepEqual(used.filter((token) => !dark.has(token)), [], 'every token exists in the dark theme')
})

test('no fallback colours and no literal colours', () => {
  assert.doesNotMatch(memory, /var\(--dy-[a-z0-9-]+\s*,/, 'a fallback hides a missing token in dark mode')
  assert.doesNotMatch(memory, /#[0-9a-fA-F]{3,8}\b/, 'no hex colours: only --dy-* tokens')
  assert.doesNotMatch(memory, /\b(rgb|rgba|hsl|hsla)\(/i, 'no rgb/hsl colours')
})

test('every rule is scoped to .dockyard-root, and breakpoints are container queries', () => {
  const css = memory.slice(memory.indexOf('`') + 1, memory.lastIndexOf('`'))
  const selectors = css.replace(/\/\*[\s\S]*?\*\//g, '').split('}').map((rule) => rule.split('{')[0].trim()).filter((selector) => selector && !selector.startsWith('@'))
  assert.ok(selectors.length >= 12, 'the rules were parsed')
  for (const selector of selectors) {
    for (const part of selector.split(',').map((piece) => piece.trim()).filter(Boolean)) {
      assert.match(part, /^\.dockyard-root\b/, `scoped: ${part}`)
    }
  }
  assert.doesNotMatch(memory, /@media/, 'the tab sits inside the app frame: use @container dockyard')
  assert.match(memory, /@container dockyard \(max-width: 640px\)/, 'narrow-container rules exist')
})
