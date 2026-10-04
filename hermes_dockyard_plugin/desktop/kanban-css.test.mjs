// C2 Kanban: stylesheet proven as CSS rules (part one of the two-part colour test).
// Part two, a real browser flipping to dark, lives in kanban-screen.test.mjs.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const read = (file) => readFileSync(fileURLToPath(new URL(file, import.meta.url)), 'utf8')
const shell = read('./src/styles/dockyard-css.js')
const kanban = read('./src/styles/kanban-css.js')

const block = (selector) => {
  const start = shell.indexOf(`${selector} {`)
  assert.ok(start >= 0, `${selector} block exists`)
  const end = shell.indexOf('\n}', start)
  assert.ok(end > start, `${selector} block closes`)
  return shell.slice(start, end)
}
const tokens = (text) => new Set([...text.matchAll(/(--dy-[a-z0-9-]+)\s*:/g)].map((match) => match[1]))

test('Kanban styles use only colour tokens the shell defines for BOTH themes', () => {
  const light = tokens(block('.dockyard-root'))
  const dark = tokens(block('.dockyard-root[data-theme="dark"]'))
  const used = [...new Set([...kanban.matchAll(/var\(\s*(--dy-[a-z0-9-]+)/g)].map((match) => match[1]))]
  assert.ok(used.length >= 12, 'the Kanban styles read the shell tokens')
  assert.deepEqual(used.filter((token) => !light.has(token)), [], 'every token exists in the light theme')
  assert.deepEqual(used.filter((token) => !dark.has(token)), [], 'every token exists in the dark theme')
})

test('no fallback colours and no literal colours', () => {
  assert.doesNotMatch(kanban, /var\(--dy-[a-z0-9-]+\s*,/, 'a fallback hides a missing token in dark mode')
  assert.doesNotMatch(kanban, /#[0-9a-fA-F]{3,8}\b/, 'no hex colours: only --dy-* tokens')
  assert.doesNotMatch(kanban, /\b(rgb|rgba|hsl|hsla)\(/i, 'no rgb/hsl colours')
})

test('every rule is scoped to .dockyard-root, and breakpoints are container queries', () => {
  const css = kanban.slice(kanban.indexOf('`') + 1, kanban.lastIndexOf('`'))
  const selectors = css.replace(/\/\*[\s\S]*?\*\//g, '').split('}').map((rule) => rule.split('{')[0].trim()).filter((selector) => selector && !selector.startsWith('@'))
  for (const selector of selectors) {
    for (const part of selector.split(',').map((piece) => piece.trim()).filter(Boolean)) {
      assert.match(part, /^\.dockyard-root\b/, `scoped: ${part}`)
    }
  }
  assert.doesNotMatch(kanban, /@media/, 'the board sits inside the app frame: use @container dockyard')
  assert.match(kanban, /@container dockyard \(max-width: 640px\)/, 'narrow-container rules exist')
})

test('the board rules moved out of dockyard-css.js (move, not copy)', () => {
  for (const selector of ['.dockyard-board-wrap', '.dockyard-board {', '.dockyard-board-column', '.dockyard-board-cards', '.dockyard-work-card', '.dockyard-work-type']) {
    assert.ok(!shell.includes(`.dockyard-root ${selector}`), `${selector} must live in kanban-css.js now`)
  }
  for (const selector of ['.dockyard-board-wrap', '.dockyard-board {', '.dockyard-board-column', '.dockyard-work-card', '.dockyard-work-type']) {
    assert.ok(kanban.includes(`.dockyard-root ${selector}`), `${selector} is in kanban-css.js`)
  }
})

test('rules other screens use stay where they are', () => {
  for (const selector of ['.dockyard-work-visual', '.dockyard-work-legend', '.dockyard-work-stats', '.dockyard-work-editor']) {
    assert.ok(shell.includes(selector), `${selector} stays in dockyard-css.js (used outside the board)`)
    assert.ok(!kanban.includes(`${selector} {`) && !kanban.includes(`${selector},`), `${selector} is not copied into kanban-css.js`)
  }
})

test('the saved-view table keeps looking exactly as today: .dockyard-backlog-table stays unstyled', () => {
  // It has no rule anywhere today (measured). Styling it would change the saved-view
  // table, so only the List tab's extra class (.dy-kb-table) is styled.
  assert.ok(!shell.includes('dockyard-backlog-table'), 'still no rule in dockyard-css.js')
  assert.ok(!kanban.includes('dockyard-backlog-table'), 'kanban-css.js does not start styling it')
  assert.ok(kanban.includes('.dy-kb-table'), 'the List tab has its own class')
})

test('controls share the Roadmap box: 38px tall, control border, 6px radius, 13px text', () => {
  const control = kanban.match(/\.dy-kb-control \{([^}]*)\}/)[1]
  assert.match(control, /height: 38px/)
  assert.match(control, /border: 1px solid var\(--dy-control-border\)/)
  assert.match(control, /border-radius: 6px/)
  assert.match(control, /font-size: 13px/)
})

test('the stylesheet is registered once, next to the other screen styles', () => {
  const context = read('./src/runtime/context.js')
  assert.match(context, /import \{ KANBAN_CSS \} from '\.\.\/styles\/kanban-css\.js'/)
  assert.match(context, /useStylesheet\('dy-kanban-stylesheet', 'dyKanbanStylesheet', KANBAN_CSS\)/)
})
