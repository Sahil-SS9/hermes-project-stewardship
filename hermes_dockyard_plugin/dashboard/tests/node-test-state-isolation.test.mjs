// Proves the shared Node guard redirects backend state. Spawns a child that
// imports the guard first, then dumps the redirected environment, so the
// assertion runs against exactly what npm test's backend children would see.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { spawnSync } from 'node:child_process';
import { homedir, tmpdir } from 'node:os';
import { isAbsolute, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const liveHome = resolve(homedir(), '.hermes');
const tempHome = resolve(tmpdir());
const within = (root, candidate) => {
  if (!candidate) return false;
  const rel = relative(root, resolve(candidate));
  return rel === '' || (!rel.startsWith('..') && !isAbsolute(rel));
};

test('Node guard redirects all backend state to disposable storage', () => {
  const guard = fileURLToPath(new URL('./node-test-state-guard.mjs', import.meta.url));
  const child = spawnSync(process.execPath, [
    '--import', guard,
    '--eval', 'console.log(JSON.stringify(process.env))',
  ], { encoding: 'utf8' });
  assert.equal(child.status, 0, child.stderr);
  const env = JSON.parse(child.stdout);
  const stateRoot = resolve(env.HPS_NODE_TEST_STATE_ROOT);
  const liveDatabase = resolve(liveHome, 'plugin-data', 'hermes-dockyard', 'dockyard.db');

  assert.notEqual(stateRoot, liveHome);
  assert.ok(within(tempHome, stateRoot), `state escaped tmpdir: ${stateRoot}`);
  assert.notEqual(resolve(env.DOCKYARD_PLUGIN_DB), liveDatabase);
  for (const name of ['HERMES_HOME', 'HERMES_KANBAN_HOME', 'STEWARD_DB_PATH', 'DOCKYARD_PLUGIN_DB']) {
    assert.ok(within(stateRoot, env[name]), `${name} escaped test root: ${env[name]}`);
  }
});

test('Node guard rejects a live root inherited through HPS_NODE_TEST_STATE_ROOT', () => {
  const guard = fileURLToPath(new URL('./node-test-state-guard.mjs', import.meta.url));
  const child = spawnSync(process.execPath, ['--import', guard, '--eval', 'process.exit(0)'], {
    encoding: 'utf8',
    env: { ...process.env, HPS_NODE_TEST_STATE_ROOT: liveHome },
  });
  assert.notEqual(child.status, 0, 'guard must fail closed for the live home');
  assert.match(child.stderr, /rejected live HPS_NODE_TEST_STATE_ROOT/);
});