// Rebuild the committed Desktop plugin and fail if the working tree drifts.
// This is a test-support gate, not a shipped runtime module.
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { lstatSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import test from 'node:test'

const DESKTOP = fileURLToPath(new URL('.', import.meta.url))
const PLUGIN = `${DESKTOP}/plugin.js`
const PUBLISHED = fileURLToPath(new URL('../../desktop/plugin.js', import.meta.url))

function sha256(path) {
  return execFileSync('sha256sum', [path], { encoding: 'utf8' }).trim().split(/\s+/)[0]
}

test('committed plugin.js is reproducible from desktop/src', () => {
  const before = readFileSync(PLUGIN)
  const beforeHash = sha256(PLUGIN)
  execFileSync(process.execPath, [`${DESKTOP}/build.mjs`], { stdio: 'pipe' })
  const after = readFileSync(PLUGIN)
  assert.equal(sha256(PLUGIN), beforeHash, 'plugin.js changed after a clean rebuild (run the build and commit the result)')
  assert.deepEqual(after, before, 'plugin.js bytes changed after a clean rebuild')
})

// Hermes Desktop's Install from Git copies the top-level desktop/ out of a
// temporary clone; a symlink there dangles once the clone is deleted, and
// Desktop then removes the plugin it just installed.
test('the published desktop/plugin.js is a real file matching the build', () => {
  assert.ok(lstatSync(PUBLISHED).isFile(), 'desktop/plugin.js must be a regular file, not a symlink')
  assert.deepEqual(readFileSync(PUBLISHED), readFileSync(PLUGIN), 'desktop/plugin.js is STALE (run the build and commit the result)')
})
