import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import test from 'node:test'
import { evaluateArtifact } from './test-support/load-plugin.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const DASHBOARD = join(HERE, '..', 'dashboard')
const PLUGIN = join(HERE, 'plugin.js')
const require = createRequire(join(DASHBOARD, 'package.json'))
const { build } = require('esbuild')
const ALLOWED = new Set(['@hermes/plugin-sdk', 'react', 'react/jsx-runtime', 'react/jsx-dev-runtime'])

async function inspect(source, resolveDir = HERE) {
  const result = await build({
    stdin: { contents: source, resolveDir, sourcefile: 'plugin.js', loader: 'js' },
    bundle: false,
    write: false,
    format: 'esm',
    metafile: true,
    platform: 'browser',
  })
  const output = Object.values(result.metafile.outputs)[0]
  return {
    imports: (output.imports ?? []).map((entry) => entry.path),
    bytes: Buffer.byteLength(result.outputFiles[0].text),
  }
}

test('committed plugin is a self-contained Desktop ESM bundle', async () => {
  const fs = await import('node:fs/promises')
  const source = await fs.readFile(PLUGIN, 'utf8')
  const result = await inspect(source)
  const used = new Set(result.imports)
  for (const specifier of used) assert.ok(ALLOWED.has(specifier), `unsupported import: ${specifier}`)
  for (const required of ['@hermes/plugin-sdk', 'react', 'react/jsx-runtime']) {
    assert.ok(used.has(required), `required import missing: ${required}`)
  }
  assert.ok(!result.imports.some((specifier) => specifier.startsWith('.')), 'relative imports are not loadable from the Desktop blob')
  assert.deepEqual([...new Set(result.imports)].sort(), ['@hermes/plugin-sdk', 'react', 'react/jsx-runtime'])
  assert.match(source, /^\/\/ GENERATED — edit desktop\/src\//)
  assert.match(source, /export\s*\{[\s\S]*as default[\s\S]*\}/)
  const loaded = evaluateArtifact(source, { navigate() {} }, { assertImports: false })
  assert.equal(loaded.plugin.id, 'hermes-dockyard')
})

test('the loader contract rejects the pre-split relative-import plugin', async () => {
  const { execFileSync: exec } = await import('node:child_process')
  const repo = join(HERE, '..', '..')
  const old = exec('git', ['show', '297fd759601167be8b164df18023f3f8f26b3627:hermes_dockyard_plugin/desktop/plugin.js'], { cwd: repo, encoding: 'utf8' })
  const result = await inspect(old, join(repo, 'hermes_dockyard_plugin', 'desktop'))
  const oldImports = new Set(result.imports)
  assert.deepEqual(
    [...oldImports].filter((specifier) => specifier.startsWith('.')).sort(),
    ['./download.js', './lucide-icons.js', './planning-canvas-geometry.js', './workflow-canvas-css.js', './workflow-canvas-mount.js'],
    'old plugin did not fail for the expected relative-import reason',
  )
})
