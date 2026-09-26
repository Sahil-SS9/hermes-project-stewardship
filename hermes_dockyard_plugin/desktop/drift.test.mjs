// Rebuild the committed Desktop plugin and fail if the working tree drifts.
// This is a test-support gate, not a shipped runtime module.
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import test from 'node:test'

const DESKTOP = fileURLToPath(new URL('.', import.meta.url))
const PLUGIN = `${DESKTOP}/plugin.js`

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
