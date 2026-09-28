// Shared state guard for desktop test runners and disposable backend children.
import {mkdirSync, mkdtempSync, rmSync} from 'node:fs';
import {homedir, tmpdir} from 'node:os';
import {isAbsolute, join, relative, resolve} from 'node:path';

const liveHome = resolve(homedir(), '.hermes');
const tempHome = resolve(tmpdir());
const inherited = process.env.HPS_NODE_TEST_STATE_ROOT;
if (inherited) {
  const candidate = resolve(inherited);
  const rel = relative(liveHome, candidate);
  const underLive = rel === '' || (!rel.startsWith('..') && !isAbsolute(rel));
  const tempRel = relative(tempHome, candidate);
  const underTemp = tempRel === '' || (!tempRel.startsWith('..') && !isAbsolute(tempRel));
  if (underLive && !underTemp) {
    throw new Error(`Node test isolation rejected live HPS_NODE_TEST_STATE_ROOT=${inherited}`);
  }
}

export function makeTestStateRoot(prefix = 'hps-node-test-') {
  const root = resolve(mkdtempSync(join(tempHome, prefix)));
  mkdirSync(root, {recursive: true});
  return root;
}

export function stateEnv(root, extra = {}) {
  return {
    ...process.env,
    HPS_NODE_TEST_STATE_ROOT: root,
    HPS_TEST_STATE_ROOT: root,
    HERMES_HOME: join(root, 'hermes-home'),
    HERMES_KANBAN_HOME: join(root, 'hermes-home'),
    STEWARD_DB_PATH: join(root, 'dockyard.db'),
    DOCKYARD_PLUGIN_DB: join(root, 'dockyard.db'),
    ...extra,
  };
}

export function disposeTestState(root) {
  rmSync(root, {recursive: true, force: true});
}
