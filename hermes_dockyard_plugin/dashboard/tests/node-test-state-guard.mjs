// Shared Node test setup. It is imported explicitly by isolated runners;
// it is intentionally not a module-level --import in npm's broad suite,
// because several tests require a clean jsdom process per invocation.
import { mkdtempSync, rmSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { isAbsolute, join, relative, resolve } from 'node:path';

const liveHome = resolve(homedir(), '.hermes');
const tempHome = resolve(tmpdir());
const inheritedRoot = process.env.HPS_NODE_TEST_STATE_ROOT;
if (inheritedRoot) {
  const candidate = resolve(inheritedRoot);
  const rel = relative(liveHome, candidate);
  const inLiveHome = rel === '' || (!rel.startsWith('..') && !isAbsolute(rel));
  const tempRel = relative(tempHome, candidate);
  const inTemp = tempRel === '' || (!tempRel.startsWith('..') && !isAbsolute(tempRel));
  if (inLiveHome && !inTemp) {
    throw new Error(`Node test isolation rejected live HPS_NODE_TEST_STATE_ROOT=${inheritedRoot}`);
  }
}

const root = resolve(mkdtempSync(join(tempHome, 'hps-node-test-')));
process.env.HPS_NODE_TEST_STATE_ROOT = root;
process.env.HPS_TEST_STATE_ROOT = root;
process.env.HERMES_HOME = join(root, 'hermes-home');
process.env.HERMES_KANBAN_HOME = join(root, 'hermes-home');
process.env.STEWARD_DB_PATH = join(root, 'dockyard.db');
process.env.DOCKYARD_PLUGIN_DB = join(root, 'dockyard.db');
delete process.env.HERMES_KANBAN_BOARD;
process.env.HPS_NODE_TEST_LIVE_HOME = liveHome;

process.on('exit', () => {
  rmSync(root, { recursive: true, force: true });
});
