// Issue #37: the onboarding wizard's early repository-path gate, as a unit.
// The shipped bundle is exercised through the real wizard in repro-live.test.mjs.
import assert from 'node:assert/strict'
import test from 'node:test'
import { isAbsoluteRepoPath } from './src/lib/repo-path.js'

test('absolute paths on any host platform pass the early gate', () => {
  for (const path of ['C:\\Projects\\xxx', 'C:/Projects/xxx', 'z:\\projects\\xxx', 'D:\\', '/srv/projects/xxx', '/', '  /srv/repo  ', '\tC:\\repo\n']) {
    assert.equal(isAbsoluteRepoPath(path), true, JSON.stringify(path))
  }
})

test('relative, drive-relative, driveless, UNC and empty paths stay rejected', () => {
  for (const path of [
    'C:Projects\\xxx', 'C:', '1:\\repo', 'CC:\\repo', // drive-relative or not a drive
    'Projects/xxx', './Projects/xxx', '../Projects/xxx', '.\\Projects', '~/projects/xxx', // relative
    '\\Projects\\xxx', // rooted without a drive
    '\\\\server\\share\\xxx', '//server/share/xxx', '\\\\?\\C:\\repo', // UNC spellings
    '', '   ', null, undefined,
  ]) {
    assert.equal(isAbsoluteRepoPath(path), false, JSON.stringify(path))
  }
})
