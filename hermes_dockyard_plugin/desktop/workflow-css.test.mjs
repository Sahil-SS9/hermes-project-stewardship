// Workflows stylesheet: colours come only from theme tokens (the same rule as
// the kanban, inbox, activity, memory, overview and reports stylesheets).
// 09/10: seven fallback colours and one literal white were left here. The
// fallbacks never applied, but they pointed at the real bug: the switch track
// and the search box used the faint divider colour (1.38:1 in the light theme),
// where a control boundary needs the contrast-gated --dy-control-border.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const read = (file) => readFileSync(fileURLToPath(new URL(file, import.meta.url)), 'utf8')
const shell = read('./src/styles/dockyard-css.js')
const themes = read('./src/styles/themes.js')
const workflow = read('./src/styles/workflow-css.js')

const block = (text, selector) => {
  const start = text.indexOf(`${selector} {`)
  assert.ok(start >= 0, `${selector} block exists`)
  const end = text.indexOf('\n}', start)
  assert.ok(end > start, `${selector} block closes`)
  return text.slice(start, end)
}
const tokens = (text) => new Set([...text.matchAll(/(--dy-[a-z0-9-]+)\s*:/g)].map((match) => match[1]))
const rule = (selector) => {
  const match = workflow.match(new RegExp(`${selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} \\{([^}]*)\\}`))
  assert.ok(match, `rule exists: ${selector}`)
  return match[1]
}

test('no fallback colours and no literal colours', () => {
  assert.doesNotMatch(workflow, /var\(--dy-[a-z0-9-]+\s*,/, 'a fallback hides a missing token in dark mode')
  assert.doesNotMatch(workflow, /#[0-9a-fA-F]{3,8}\b/, 'no hex colours: only --dy-* tokens')
  assert.doesNotMatch(workflow, /\b(rgb|rgba|hsl|hsla)\(/i, 'no rgb/hsl colours')
  assert.doesNotMatch(workflow, /:\s*(white|black)\b/i, 'no named colours')
})

test('every token the Workflows styles use is defined for both themes', () => {
  // Theme-wide aliases (accent, secondary text) live on .dockyard-root in THEME_CSS.
  const aliases = tokens(themes.slice(themes.indexOf('export const THEME_CSS')).split('\n').find((line) => line.startsWith('.dockyard-root {')) ?? '')
  const light = tokens(block(shell, '.dockyard-root'))
  const dark = tokens(block(shell, '.dockyard-root[data-theme="dark"]'))
  const used = [...new Set([...workflow.matchAll(/var\(\s*(--dy-[a-z0-9-]+)/g)].map((match) => match[1]))]
  assert.ok(used.length >= 5, 'the Workflows styles read the shell tokens')
  assert.deepEqual(used.filter((token) => !light.has(token) && !aliases.has(token)), [], 'every token exists in the light theme')
  assert.deepEqual(used.filter((token) => !dark.has(token) && !aliases.has(token)), [], 'every token exists in the dark theme')
})

test('the enablement switch and the search box use the contrast-gated control colours', () => {
  const sw = '.dockyard-wf-enablement .dockyard-switch'
  assert.match(rule(`${sw} .dockyard-switch-track`), /background: var\(--dy-control-border\)/, 'off track: control boundary (3:1 or more in every theme)')
  assert.match(rule(`${sw} .dockyard-switch-thumb`), /background: var\(--dy-surface\)/, 'off knob: surface, on the control-boundary track')
  assert.match(rule(`${sw} input:checked ~ .dockyard-switch-track`), /background: var\(--dy-accent\)/, 'on track: the theme accent')
  assert.match(rule(`${sw} input:checked ~ .dockyard-switch-thumb`), /background: var\(--dy-on-action\)/, 'on knob: the colour made for the accent')
  assert.match(rule('.dockyard-wf-library-toolbar input'), /border: 1px solid var\(--dy-control-border\)/, 'the search box edge is a control boundary')
})
