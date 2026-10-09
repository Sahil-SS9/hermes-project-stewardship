// Text colours come from text tokens, never from the action FILL token.
// --dy-action is the colour of filled buttons; as text on the dark theme's
// surface it is 2.67:1. 09/10: the Overview's Activity "View all" used it (the
// release-3a contrast scan of every screen, light and dark, found it).
// Link-like text uses --dy-accent-text, which every theme sets for text
// (6.42:1 or more on its surface in all ten themes).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const dir = new URL('./src/styles/', import.meta.url)
const sheets = readdirSync(fileURLToPath(dir)).filter((file) => file.endsWith('.js'))

test('no stylesheet colours text with the action fill token', () => {
  const offenders = []
  for (const file of sheets) {
    const css = readFileSync(fileURLToPath(new URL(file, dir)), 'utf8')
    // One rule at a time ("selector { declarations"): linear, no backtracking.
    for (const rule of css.split('}')) {
      const open = rule.indexOf('{')
      if (open < 0) continue
      if (/(?<![-\w])color:\s*var\(--dy-action\)/.test(rule.slice(open + 1))) offenders.push(`${file}: ${rule.slice(0, open).trim().split('\n').pop().slice(0, 80)}`)
    }
  }
  assert.deepEqual(offenders, [], 'text on a surface uses --dy-accent-text (or another text token), not --dy-action')
})

test("the Activity card's View all uses the theme's link-text colour", () => {
  const css = readFileSync(fileURLToPath(new URL('activity-css.js', dir)), 'utf8')
  assert.match(css, /\.dy-act-viewall \{[^}]*color: var\(--dy-accent-text\)/)
})
