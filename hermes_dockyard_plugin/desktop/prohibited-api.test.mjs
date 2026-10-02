// Product constraint (locked 26/08, re-confirmed by Sahil 02/10): Dockyard
// never uses string-to-DOM sinks (innerHTML / outerHTML / insertAdjacentHTML),
// eval, or browser storage (localStorage / sessionStorage / cookies).
//
// dashboard/tests/prohibited-api.test.mjs enforces this for the OLD dashboard
// files only, which is how E5's sessionStorage pop-up memory slipped into the
// Desktop app. This test applies the same rule to everything that ships in
// the Desktop plugin: every maintained source file under desktop/src and every
// generated .js file loaded from desktop/.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const desktop = dirname(fileURLToPath(import.meta.url))

const PROHIBITED = [
  { name: 'innerHTML', re: /\.innerHTML\b/ },
  { name: 'outerHTML', re: /\.outerHTML\b/ },
  { name: 'insertAdjacentHTML', re: /\.insertAdjacentHTML\b/ },
  { name: 'eval', re: /\beval\s*\(/ },
  { name: 'localStorage', re: /localStorage\b/ },
  { name: 'sessionStorage', re: /sessionStorage\b/ },
  { name: 'cookies', re: /(?:document\.cookie|\bcookieStore\b)/ },
]

function walk(dir) {
  const out = []
  for (const name of readdirSync(dir)) {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) out.push(...walk(path))
    else if (/\.(?:js|mjs|jsx|ts|tsx)$/.test(name)) out.push(path)
  }
  return out
}

function shippedFiles() {
  const source = walk(join(desktop, 'src'))
  // Generated files at the top of desktop/ (plugin.js and its lazy chunks);
  // test files are not shipped.
  const generated = readdirSync(desktop)
    .filter((name) => name.endsWith('.js'))
    .map((name) => join(desktop, name))
  return [...source, ...generated]
}

test('the scan covers the plugin entry and its sources', () => {
  const files = shippedFiles().map((path) => relative(desktop, path))
  assert.ok(files.includes('plugin.js'), 'generated plugin.js is scanned')
  assert.ok(files.includes(join('src', 'index.js')), 'src/index.js is scanned')
  assert.ok(files.filter((path) => path.startsWith('src')).length >= 20, 'every source file is scanned')
})

test('Desktop plugin source and build are free of prohibited DOM/script/storage sinks', () => {
  const hits = []
  for (const path of shippedFiles()) {
    const content = readFileSync(path, 'utf8')
    for (const { name, re } of PROHIBITED) {
      if (re.test(content)) hits.push(`${relative(desktop, path)}: ${name}`)
    }
  }
  assert.deepEqual(hits, [], `prohibited patterns found:\n${hits.join('\n')}`)
})
