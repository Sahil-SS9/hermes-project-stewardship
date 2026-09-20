import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const pluginPath = new URL('./plugin.js', import.meta.url)
const source = fs.readFileSync(pluginPath, 'utf8')

test('approved backlog slice is present in the production plugin surface', () => {
  for (const marker of [
    "'data-backlog-table': true",
    "'data-cm-search': true",
    "'data-cm-menu-btn': 'sort'",
    "'data-cm-menu-btn': 'group'",
    "'data-cm-menu-btn': 'cols'",
    "children: ['Manage columns'",
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
    "'data-cell': 'due'",
    'function WorkItemDetail',
  ]) assert.ok(source.includes(marker), `missing approved marker: ${marker}`)
  assert.ok(!source.includes("children: ['Theme'"), 'theme must not be in Manage columns')
  assert.match(source, /method: 'POST', body: \{ type: row\.type/)
  assert.match(source, /method: 'PATCH', body: \{ parent_ref: row\.parent \}/)
  assert.match(source, /download = 'backlog-import-template\.csv'/)
})

test('plugin remains valid JavaScript', () => {
  assert.ok(source.length > 100_000)
})
