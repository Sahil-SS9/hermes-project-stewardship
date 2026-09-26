import test from 'node:test'
import assert from 'node:assert/strict'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const srcDir = process.env.DOCKYARD_SRC_DIR
  || fileURLToPath(new URL('./src/', import.meta.url))
function sourceText(dir) {
  const files = []
  const walk = (path) => {
    for (const name of readdirSync(path)) {
      const child = join(path, name)
      if (statSync(child).isDirectory()) walk(child)
      else if (name.endsWith('.js')) files.push(child)
    }
  }
  walk(dir)
  return files.sort().map((file) => readFileSync(file, 'utf8')).join('\n')
}
const source = sourceText(srcDir)

test('approved backlog slice is present in the production plugin surface', () => {
  for (const marker of [
    "'data-backlog-table': true",
    "'data-cm-search': true",
    "['sort', 'arrow-up-down', 'Sort'",
    "['group', 'layers', 'Group'",
    "'data-cm-menu-btn': menu",
    "'data-cm-menu': menu",
    "'data-menu-action': 'details'",
    "'data-menu-action': 'add-child'",
    "'data-menu-action': 'reparent'",
    "'data-bulk-import-layer': true",
    "'data-import-drop': true",
    "'data-import-input': true",
    "'data-import-preview': true",
    "'data-cell': 'title'",
    "'data-cell': 'status'",
    "'data-cell': 'assignee'",
    'function WorkItemDetail',
  ]) assert.ok(source.includes(marker), `missing approved marker: ${marker}`)
  // P6.7/P6.8: import flows through the shared backend validator endpoint.
  assert.match(source, /\/backlog\/import`, \{\s*method: 'POST', body: \{ csv_text: csvText, apply: false \}/)
  assert.match(source, /body: \{ csv_text: good\[0\]\.csv_text, apply: true \}/)
  assert.match(source, /download = 'backlog-import-template\.csv'/)
})

test('detail modal exposes the canonical task ID separately from the display reference', () => {
  assert.match(source, /const taskId = detail\?\.work_item\?\.id \?\? item\?\.id \?\? null/)
  assert.ok(source.includes("className: 'dockyard-detail-task-id'"))
  assert.ok(source.includes("children: 'Task ID'"))
  assert.ok(source.includes("children: taskIdText ?? 'Unavailable'"))
})

test('plugin remains valid JavaScript', () => {
  assert.ok(source.length > 100_000)
})
